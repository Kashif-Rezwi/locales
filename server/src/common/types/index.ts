/**
 * Shared TypeScript types used across the server.
 * Domain-specific types live in their own modules.
 */

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
}
