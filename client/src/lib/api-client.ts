/**
 * Typed API client — thin wrapper around fetch that:
 *   - Prepends the API base URL
 *   - Attaches the GitHub OAuth token as a Bearer header
 *   - Throws typed errors on non-OK responses
 *
 * Usage:
 *   const data = await apiClient.get<HealthResponse>('/health', token);
 *   const job  = await apiClient.post<JobResponse>('/pipeline/run', body, token);
 *
 * The token comes from the Auth.js session (session.githubToken) and is the
 * same GitHub OAuth token used to authenticate with the NestJS server.
 * The NestJS AuthGuard (Chunk 3) validates this token on every protected route.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: `HTTP ${response.status}` }));
    throw new Error(
      (error as { message?: string }).message ?? `HTTP ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'GET', token }),

  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      token,
    }),
};
