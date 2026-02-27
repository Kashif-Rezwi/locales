import { Injectable, BadRequestException } from '@nestjs/common';
import {
  GithubBranch,
  GithubFork,
  GithubPermissions,
  GithubRepo,
  GithubUserProfile,
} from './github.types';

/** Headers sent on every GitHub API request. */
const GH_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
});

/**
 * GithubService — typed wrapper around the GitHub REST API.
 * Each method receives the caller's OAuth token so requests act on their behalf.
 */
@Injectable()
export class GithubService {
  /** Returns the authenticated user's GitHub profile. */
  async getAuthenticatedUser(token: string): Promise<GithubUserProfile> {
    return this.get<GithubUserProfile>('https://api.github.com/user', token);
  }

  /**
   * Returns all repos the user can access — own, org, and collaborator repos.
   * Paginates automatically until all pages are fetched.
   */
  async listUserRepos(token: string): Promise<GithubRepo[]> {
    const all: GithubRepo[] = [];
    let page = 1;

    while (true) {
      const url = `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`;
      const batch = await this.get<GithubRepo[]>(url, token);
      if (batch.length === 0) break;
      all.push(...batch);
      if (batch.length < 100) break;
      page++;
    }

    return all;
  }

  /** Returns all branches for a repository. */
  async listBranches(
    owner: string,
    repo: string,
    token: string,
  ): Promise<GithubBranch[]> {
    const all: GithubBranch[] = [];
    let page = 1;

    while (true) {
      const url = `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100&page=${page}`;
      const batch = await this.get<GithubBranch[]>(url, token);
      if (batch.length === 0) break;
      all.push(...batch);
      if (batch.length < 100) break;
      page++;
    }

    return all;
  }

  /** Returns the user's push/admin/pull permissions on a repository. */
  async checkPermissions(
    owner: string,
    repo: string,
    token: string,
  ): Promise<GithubPermissions> {
    const data = await this.get<{ permissions: GithubPermissions }>(
      `https://api.github.com/repos/${owner}/${repo}`,
      token,
    );
    return data.permissions ?? { admin: false, push: false, pull: false };
  }

  /** Returns the default branch name for a repository. */
  async getDefaultBranch(
    owner: string,
    repo: string,
    token: string,
  ): Promise<string> {
    const data = await this.get<{ default_branch: string }>(
      `https://api.github.com/repos/${owner}/${repo}`,
      token,
    );
    return data.default_branch;
  }

  /**
   * Forks a repository to the authenticated user's account.
   * If the repo is already forked, returns the existing fork.
   */
  async forkRepo(
    owner: string,
    repo: string,
    token: string,
  ): Promise<GithubFork> {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/forks`,
      {
        method: 'POST',
        headers: { ...GH_HEADERS(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    );

    // 202 Accepted (new fork) or 200 OK (existing fork)
    if (res.status !== 202 && res.status !== 200) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new BadRequestException(
        body.message ?? 'Failed to fork repository',
      );
    }

    return res.json() as Promise<GithubFork>;
  }

  /** Validates a URL is a GitHub repo URL and extracts owner/repo. */
  parseRepoUrl(url: string): { owner: string; repo: string } {
    try {
      const parsed = new URL(url);
      if (parsed.hostname !== 'github.com') {
        throw new BadRequestException('URL must be a github.com repository');
      }
      const parts = parsed.pathname.replace(/^\/|\/$/g, '').split('/');
      if (parts.length < 2) {
        throw new BadRequestException('Invalid GitHub repository URL');
      }
      return { owner: parts[0], repo: parts[1] };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Invalid URL format');
    }
  }

  // --- Git Data API Methods (for GitDeliveryService) ---

  async getProfile(token: string): Promise<{ login: string }> {
    return this.get<{ login: string }>('https://api.github.com/user', token);
  }

  async branchExists(token: string, owner: string, repo: string, branch: string): Promise<boolean> {
    try {
      await this.get(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
      return true;
    } catch (e) {
      return false;
    }
  }

  async getLatestCommitSha(token: string, owner: string, repo: string, branch: string): Promise<string> {
    const data = await this.get<{ object: { sha: string } }>(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      token
    );
    return data.object.sha;
  }

  async getCommitTreeSha(token: string, owner: string, repo: string, commitSha: string): Promise<string> {
    const data = await this.get<{ tree: { sha: string } }>(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${commitSha}`,
      token
    );
    return data.tree.sha;
  }

  async createBranch(token: string, owner: string, repo: string, branch: string, sha: string): Promise<void> {
    await this.post(`https://api.github.com/repos/${owner}/${repo}/git/refs`, token, {
      ref: `refs/heads/${branch}`,
      sha,
    });
  }

  async createBlob(token: string, owner: string, repo: string, content: string): Promise<string> {
    const data = await this.post<{ sha: string }>(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, token, {
      content,
      encoding: 'utf-8',
    });
    return data.sha;
  }

  async createTree(
    token: string,
    owner: string,
    repo: string,
    baseTreeSha: string,
    tree: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }>
  ): Promise<string> {
    const data = await this.post<{ sha: string }>(`https://api.github.com/repos/${owner}/${repo}/git/trees`, token, {
      base_tree: baseTreeSha,
      tree,
    });
    return data.sha;
  }

  async createCommit(
    token: string,
    owner: string,
    repo: string,
    message: string,
    treeSha: string,
    parents: string[]
  ): Promise<string> {
    const data = await this.post<{ sha: string }>(`https://api.github.com/repos/${owner}/${repo}/git/commits`, token, {
      message,
      tree: treeSha,
      parents,
    });
    return data.sha;
  }

  async updateRef(token: string, owner: string, repo: string, branch: string, sha: string): Promise<void> {
    await this.post(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
      sha,
      force: true,
    }, 'PATCH');
  }

  async createPullRequest(
    token: string,
    owner: string,
    repo: string,
    params: { title: string; body: string; head: string; base: string }
  ): Promise<string> {
    const data = await this.post<{ html_url: string }>(`https://api.github.com/repos/${owner}/${repo}/pulls`, token, params);
    return data.html_url;
  }

  private async get<T>(url: string, token: string): Promise<T> {
    const res = await fetch(url, { headers: GH_HEADERS(token) });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new BadRequestException(
        body.message ?? `GitHub API error: ${res.status}`,
      );
    }
    return res.json() as Promise<T>;
  }

  private async post<T>(url: string, token: string, bodyObj: any, method: string = 'POST'): Promise<T> {
    const res = await fetch(url, {
      method,
      headers: { ...GH_HEADERS(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj),
    });
    if (!res.ok) {
      const bodyText = (await res.json().catch(() => ({}))) as { message?: string };
      throw new BadRequestException(bodyText.message ?? `GitHub API error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }
}
