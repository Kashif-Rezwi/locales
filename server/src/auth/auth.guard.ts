import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserService } from '../user/user.service';
import { GithubUserProfile } from '../github/github.types';

/**
 * AuthGuard — validates GitHub Bearer token on every protected request.
 *
 * Flow: extract token → call GitHub /user API → upsert User in DB → attach to req.user
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    // Validate with GitHub — if token is invalid/revoked, GitHub returns 401
    const profile = await this.fetchGitHubProfile(token);

    // Upsert user in DB and attach to request for downstream use
    const user = await this.userService.upsertFromGitHub(profile);
    (
      request as Request & { user: { userId: string; githubToken: string } }
    ).user = {
      userId: user.id,
      githubToken: token,
    };

    return true;
  }

  private extractToken(request: Request): string | null {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }

  private async fetchGitHubProfile(token: string): Promise<GithubUserProfile> {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!res.ok) {
      throw new UnauthorizedException('Invalid or revoked GitHub token');
    }

    return res.json() as Promise<GithubUserProfile>;
  }
}
