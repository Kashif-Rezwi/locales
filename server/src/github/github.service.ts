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
}
