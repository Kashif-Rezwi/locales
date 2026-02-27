import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GithubUserProfile } from '../github/github.types';
import { User } from '@prisma/client';

/**
 * UserService — persists GitHub user identity in the database.
 * Called by AuthGuard on every authenticated request.
 */
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /** Upserts a user record keyed on githubId — safe to call on every login. */
  async upsertFromGitHub(profile: GithubUserProfile): Promise<User> {
    return this.prisma.user.upsert({
      where: { githubId: String(profile.id) },
      update: {
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatar_url,
      },
      create: {
        githubId: String(profile.id),
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatar_url,
      },
    });
  }

  /** Finds a user by their internal DB id. */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
