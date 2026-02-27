import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception class for all domain-specific exceptions in the engine.
 * Every custom exception (WorkspaceError, GitDeliveryError, etc.) extends this.
 * The global HttpExceptionFilter catches all AppException instances and shapes
 * them into a consistent JSON error response.
 */
export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message, statusCode);
  }
}
