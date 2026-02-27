import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { UserService } from './user.service';

@ApiTags('users')
@ApiBearerAuth('github-token')
@UseGuards(AuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  async getMe(@CurrentUser() currentUser: AuthenticatedUser) {
    const user = await this.userService.findById(currentUser.userId);
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      githubId: user.githubId,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }
}
