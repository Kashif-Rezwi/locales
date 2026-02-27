import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export class AuthenticatedUser {
  userId!: string;
  githubToken!: string;
}

/**
 * @CurrentUser() — extracts the authenticated user from the request.
 * Only available on routes protected by AuthGuard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    return request.user;
  },
);
