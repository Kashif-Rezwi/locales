import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { GithubService } from './github.service';

@ApiTags('github')
@ApiBearerAuth('github-token')
@UseGuards(AuthGuard)
@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Get('repos')
  @ApiOperation({
    summary: 'List all repos accessible to the authenticated user',
  })
  async listRepos(@CurrentUser() user: AuthenticatedUser) {
    return this.githubService.listUserRepos(user.githubToken);
  }

  @Get('repos/:owner/:repo/branches')
  @ApiOperation({ summary: 'List branches for a repository' })
  @ApiParam({ name: 'owner', example: 'vercel' })
  @ApiParam({ name: 'repo', example: 'next.js' })
  async listBranches(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.githubService.listBranches(owner, repo, user.githubToken);
  }

  @Get('repos/:owner/:repo/permissions')
  @ApiOperation({
    summary: 'Check push/admin/pull permissions on a repository',
  })
  @ApiParam({ name: 'owner', example: 'vercel' })
  @ApiParam({ name: 'repo', example: 'next.js' })
  async checkPermissions(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.githubService.checkPermissions(owner, repo, user.githubToken);
  }
}
