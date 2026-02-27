/**
 * Shared API response types — mirrors the NestJS server's type contract.
 *
 * The server-side canonical definition lives at:
 *   server/src/common/types/index.ts  (ApiErrorResponse)
 *
 * Any structural changes on the server MUST be reflected here to keep
 * the client type-safe end-to-end.
 */

/** Standard error envelope emitted by NestJS HttpExceptionFilter */
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
}

/** Generic paginated list wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** Standard success response for write operations (create / update / delete) */
export interface MutationResponse {
  success: boolean;
  message?: string;
}

/** Health check response shape (GET /api/health) */
export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  version: string;
  uptime: number;
}
