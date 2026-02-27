/**
 * Shared GitHub API types used across auth and github modules.
 */

export interface GithubUserProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  updated_at: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export interface GithubBranch {
  name: string;
  protected: boolean;
}

export interface GithubPermissions {
  admin: boolean;
  push: boolean;
  pull: boolean;
}

export interface GithubFork {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  owner: { login: string };
}
