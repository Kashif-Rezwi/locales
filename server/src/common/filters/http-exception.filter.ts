import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../types/index';

/**
 * Global exception filter — catches every thrown exception and shapes it into
 * a consistent JSON response: { statusCode, error, message, timestamp, path }
 *
 * Registered globally in main.ts via app.useGlobalFilters().
 * Every chunk that throws custom exceptions benefits automatically.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : typeof exceptionResponse === 'object' &&
            exceptionResponse !== null &&
            'message' in exceptionResponse
          ? (exceptionResponse as { message: string | string[] }).message
          : exception instanceof Error
            ? exception.message
            : 'Internal server error';

    const normalizedMessage = Array.isArray(message)
      ? message.join(', ')
      : message;

    const errorBody: ApiErrorResponse = {
      statusCode: status,
      error: HttpStatus[status] ?? 'UNKNOWN',
      message: normalizedMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorBody);
  }
}
