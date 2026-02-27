import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

/**
 * GithubModule — GitHub API integration: repos, branches, permissions, forks.
 * All endpoints are protected by AuthGuard from AuthModule.
 * UserModule is imported so AuthGuard can resolve UserService.
 */
@Module({
  imports: [UserModule, AuthModule],
  providers: [GithubService],
  controllers: [GithubController],
  exports: [GithubService],
})
export class GithubModule { }
