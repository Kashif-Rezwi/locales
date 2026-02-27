import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GithubService } from '../github/github.service';
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

/** Parameters for the static PR body template. */
interface PrBodyParams {
  locales: string[];
  stringCount: number;
  hitRate: string;
  fileCount: number;
  cost: string;
}

/** Blob chunk size for parallel GitHub API calls. */
const BLOB_CHUNK_SIZE = 20;

@Injectable()
export class GitDeliveryService {
  private readonly logger = new Logger(GitDeliveryService.name);
  private readonly openAiApiKey: string | undefined;

  constructor(
    private readonly github: GithubService,
    private readonly config: ConfigService,
  ) {
    this.openAiApiKey = this.config.get<string>('OPENAI_API_KEY');
  }

  /**
   * Orchestrates the delivery of translated files to GitHub via a Pull Request.
   * Uses the Git Data API for an atomic commit of all files.
   */
  async deliver(
    token: string,
    opts: GitDeliveryOptions,
  ): Promise<GitDeliveryResult> {
    const { owner, repo, accessMode, defaultBranch, files, locales } = opts;
    this.logger.log(
      `Starting git delivery for ${owner}/${repo} (${accessMode} mode)`,
    );

    // 1. Determine target repo for the branch
    const userProfile = await this.github.getProfile(token);
    const branchOwner = accessMode === 'fork' ? userProfile.login : owner;

    // 2. Generate branch name with collision handling
    const branchName = await this.generateUniqueBranch(
      token,
      branchOwner,
      repo,
      locales,
    );

    // 3. Get latest commit SHA on the default branch of the original repo
    const baseCommitSha = await this.github.getLatestCommitSha(
      token,
      owner,
      repo,
      defaultBranch,
    );

    // 4. Create a new branch pointing to baseCommitSha
    await this.github.createBranch(
      token,
      branchOwner,
      repo,
      branchName,
      baseCommitSha,
    );

    // 5. Create Blobs for all files (parallel in chunks to respect rate limits)
    this.logger.debug(`Creating ${files.length} blobs...`);
    const treeEntries: Array<{
      path: string;
      mode: '100644';
      type: 'blob';
      sha: string;
    }> = [];

    for (let i = 0; i < files.length; i += BLOB_CHUNK_SIZE) {
      const chunk = files.slice(i, i + BLOB_CHUNK_SIZE);
      const blobPromises = chunk.map(async (f) => {
        const sha = await this.github.createBlob(
          token,
          branchOwner,
          repo,
          f.content,
        );
        return {
          path: f.filePath,
          mode: '100644' as const,
          type: 'blob' as const,
          sha,
        };
      });
      const results = await Promise.all(blobPromises);
      treeEntries.push(...results);
    }

    // 6. Create Tree
    this.logger.debug('Creating git tree...');
    const baseTreeSha = await this.github.getCommitTreeSha(
      token,
      branchOwner,
      repo,
      baseCommitSha,
    );
    const newTreeSha = await this.github.createTree(
      token,
      branchOwner,
      repo,
      baseTreeSha,
      treeEntries,
    );

    // 7. Create Commit
    this.logger.debug('Creating commit...');
    const commitMessage = `i18n: Add support for ${locales.join(', ')}`;
    const newCommitSha = await this.github.createCommit(
      token,
      branchOwner,
      repo,
      commitMessage,
      newTreeSha,
      [baseCommitSha],
    );

    // 8. Update Ref (Atomic branch update)
    this.logger.debug('Updating branch ref...');
    await this.github.updateRef(
      token,
      branchOwner,
      repo,
      branchName,
      newCommitSha,
    );

    // 9. Generate PR Copy
    const { title, body } = await this.generatePrContent(opts);

    // 10. Open Pull Request on original repo
    this.logger.debug('Opening pull request...');
    const head =
      accessMode === 'fork' ? `${branchOwner}:${branchName}` : branchName;
    const prUrl = await this.github.createPullRequest(token, owner, repo, {
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
    token: string,
    owner: string,
    repo: string,
    locales: string[],
  ): Promise<string> {
    const timestamp = Date.now().toString().slice(-6);
    const baseName = `i18n/add-${locales.join('-')}-${timestamp}`;

    const exists = await this.github.branchExists(token, owner, repo, baseName);
    if (!exists) return baseName;

    let suffix = 2;
    while (
      await this.github.branchExists(
        token,
        owner,
        repo,
        `${baseName}-${suffix}`,
      )
    ) {
      suffix++;
    }
    return `${baseName}-${suffix}`;
  }

  /** Uses OpenAI to generate PR copy, falling back to a static template. */
  private async generatePrContent(
    opts: GitDeliveryOptions,
  ): Promise<{ title: string; body: string }> {
    const { locales, stats, files } = opts;
    const title = `🌍 Add i18n support: ${locales.join(', ').toUpperCase()}`;

    const templateParams: PrBodyParams = {
      locales,
      stringCount: stats.stringCount,
      hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
      fileCount: files.length,
      cost: `$${stats.estimatedCostUsd.toFixed(4)}`,
    };

    let body = this.getStaticPrBody(templateParams);

    if (this.openAiApiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.openAiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You write concise, professional GitHub PR descriptions. Do not use markdown headers (like #).',
              },
              {
                role: 'user',
                content: `Write a PR description for an automated i18n pipeline that just ran.
Languages added: ${templateParams.locales.join(', ')}
Total Strings: ${templateParams.stringCount}
Translation Memory Hit Rate: ${templateParams.hitRate}
Files changed/created: ${templateParams.fileCount}
Estimated API Cost: ${templateParams.cost}

Keep it to 2 brief paragraphs. Explain that hardcoded strings were replaced with \`t(hash)\` calls via a Babel code mod, and the runtime loader/translation JSONs are included. Mention it is ready for review. End with a bulleted list of the stats.`,
              },
            ],
            temperature: 0.7,
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            choices: Array<{ message: { content: string } }>;
          };
          body = data.choices[0].message.content.trim();
        }
      } catch {
        this.logger.warn(
          'Failed to call OpenAI for PR body, using static fallback.',
        );
      }
    }

    body += `\n\n---\n*🤖 Auto-generated by **locales** — the deterministic i18n pipeline.*`;

    return { title, body };
  }

  private getStaticPrBody(params: PrBodyParams): string {
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
