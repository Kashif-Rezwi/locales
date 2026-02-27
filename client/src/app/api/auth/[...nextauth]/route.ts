import { handlers } from '@/lib/auth';

/**
 * Auth.js v5 catch-all route handler.
 *
 * Exposes GET and POST for all NextAuth endpoints:
 *   GET  /api/auth/signin
 *   GET  /api/auth/callback/github
 *   GET  /api/auth/signout
 *   GET  /api/auth/session     ← used by SessionProvider client-side
 *   GET  /api/auth/csrf
 *   POST /api/auth/signin
 *   POST /api/auth/signout
 */
export const { GET, POST } = handlers;
