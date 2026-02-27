import { Injectable, Logger } from '@nestjs/common';
import { GithubService } from '../github/github.service';
import { OpenAIProvider } from '../providers/openai.provider';
import type { ModifiedFile, GeneratedFile } from '../adapters/adapter.types';

export interface GitDeliveryOptions {
  owner: string;
  repo: string;
  accessMode: 'direct' | 'fork';
  defaultBranch: string;
  files: (ModifiedFile | GeneratedFile)[];
  locales: string[];
  stats: {
    stringCount: number;
    hitRate: number;
    estimatedCostUsd: number;
  };
}

export interface GitDeliveryResult {
  prUrl: string;
  branchName: string;
}

@Injectable()
export class GitDeliveryService {
  private readonly logger = new Logger(GitDeliveryService.name);

  constructor(
    private readonly github: GithubService,
    private readonly openAi: OpenAIProvider,
  ) { }

  /**
   * Orchestrates the delivery of translated files to GitHub via a Pull Request.
   * Uses the Git Data API for an atomic commit of all files.
   */
  async deliver(userId: string, opts: GitDeliveryOptions): Promise<GitDeliveryResult> {
    const { owner, repo, accessMode, defaultBranch, files, locales } = opts;
    this.logger.log(`Starting git delivery for ${owner}/${repo} (${accessMode} mode)`);

    // 1. Determine target repo for the branch
    const userProfile = await this.github.getProfile(userId);
    const branchOwner = accessMode === 'fork' ? userProfile.login : owner;

    // 2. Generate branch name with collision handling
    const branchName = await this.generateUniqueBranch(userId, branchOwner, repo, locales);

    // 3. Get latest commit SHA on the default branch of the original repo
    const baseCommitSha = await this.github.getLatestCommitSha(userId, owner, repo, defaultBranch);

    // 4. Create a new branch pointing to baseCommitSha
    await this.github.createBranch(userId, branchOwner, repo, branchName, baseCommitSha);

    // 5. Create Blobs for all files
    this.logger.debug(`Creating ${files.length} blobs...`);
    const treeEntries: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }> = [];

    // Process blobs in parallel chunks to respect rate limits while maintaining speed
    const chunkSize = 20;
    for (let i = 0; i < files.length; i += chunkSize) {
      const chunk = files.slice(i, i + chunkSize);
      const blobPromises = chunk.map(async (f) => {
        const filePath = 'filePath' in f ? f.filePath : (f as any).path; // handle adapter types safely
        const sha = await this.github.createBlob(userId, branchOwner, repo, f.content);
        return { path: filePath, mode: '100644' as const, type: 'blob' as const, sha };
      });
      const results = await Promise.all(blobPromises);
      treeEntries.push(...results);
    }

    // 6. Create Tree
    this.logger.debug('Creating git tree...');
    const baseTreeSha = await this.github.getCommitTreeSha(userId, branchOwner, repo, baseCommitSha);
    const newTreeSha = await this.github.createTree(userId, branchOwner, repo, baseTreeSha, treeEntries);

    // 7. Create Commit
    this.logger.debug('Creating commit...');
    const commitMessage = `i18n: Add support for ${locales.join(', ')}`;
    const newCommitSha = await this.github.createCommit(
      userId, branchOwner, repo, commitMessage, newTreeSha, [baseCommitSha]
    );

    // 8. Update Ref (Atomic branch update)
    this.logger.debug('Updating branch ref...');
    await this.github.updateRef(userId, branchOwner, repo, branchName, newCommitSha);

    // 9. Generate PR Copy
    const { title, body } = await this.generatePrContent(opts);

    // 10. Open Pull Request on original repo
    this.logger.debug('Opening pull request...');
    const head = accessMode === 'fork' ? `${branchOwner}:${branchName}` : branchName;
    const prUrl = await this.github.createPullRequest(userId, owner, repo, {
      title,
      body,
      head,
      base: defaultBranch,
    });

    this.logger.log(`Delivery complete. PR created: ${prUrl}`);
    return { prUrl, branchName };
  }

  /** Generates a unique branch name. Appends -2, -3 if it already exists. */
  private async generateUniqueBranch(
    userId: string, owner: string, repo: string, locales: string[]
  ): Promise<string> {
    const timestamp = Date.now().toString().slice(-6); // short timestamp suffix
    const baseName = `i18n/add-${locales.join('-')}-${timestamp}`;

    const exists = await this.github.branchExists(userId, owner, repo, baseName);
    if (!exists) return baseName;

    let suffix = 2;
    while (await this.github.branchExists(userId, owner, repo, `${baseName}-${suffix}`)) {
      suffix++;
    }
    return `${baseName}-${suffix}`;
  }

  /** Uses OpenAI to generate PR copy, falling back to a static template. */
  private async generatePrContent(opts: GitDeliveryOptions): Promise<{ title: string; body: string }> {
    const { locales, stats, files } = opts;
    const title = `🌍 Add i18n support: ${locales.join(', ').toUpperCase()}`;

    const templateParams = {
      locales,
      stringCount: stats.stringCount,
      hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
      fileCount: files.length,
      cost: `$${stats.estimatedCostUsd.toFixed(4)}`
    };

    let body = this.getStaticPrBody(templateParams);

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You write concise, professional GitHub PR descriptions. Do not use markdown headers (like #).' },
              {
                role: 'user', content: `Write a PR description for an automated i18n pipeline that just ran. 
Languages added: ${templateParams.locales.join(', ')}
Total Strings: ${templateParams.stringCount}
Translation Memory Hit Rate: ${templateParams.hitRate}
Files changed/created: ${templateParams.fileCount}
Estimated API Cost: ${templateParams.cost}

Keep it to 2 brief paragraphs. Explain that hardcoded strings were replaced with \`t(hash)\` calls via a Babel code mod, and the runtime loader/translation JSONs are included. Mention it is ready for review. End with a bulleted list of the stats.`}
            ],
            temperature: 0.7
          })
        });
        if (res.ok) {
          const data = await res.json();
          body = data.choices[0].message.content.trim();
        }
      } catch (e) {
        this.logger.warn('Failed to call OpenAI for PR body, using static fallback.');
      }
    }

    body += `\n\n---\n*🤖 Auto-generated by **locales** — the deterministic i18n pipeline.*`;

    return { title, body };
  }

  private getStaticPrBody(params: any): string {
    return `This pull request introduces internationalization (i18n) support for ${params.locales.join(', ')}.

The codebase was automatically transformed via a Babel AST code mod. All hardcoded user-facing strings were replaced with \`t(hash)\` calls. The required runtime loader, \`t()\` helper, and translation JSON dictionaries are also included in this commit. Note that no external runtime dependencies were added to the target repo.

**Transformation Stats:**
- **Languages:** ${params.locales.join(', ')}
- **Extracted Strings:** ${params.stringCount}
- **TM Hit Rate:** ${params.hitRate}
- **Files Touched:** ${params.fileCount}
- **Estimated API Cost:** ${params.cost}`;
  }
}
