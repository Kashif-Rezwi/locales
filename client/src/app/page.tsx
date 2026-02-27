import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Root page — server-side auth check and redirect gate.
 *
 * - Authenticated users  → /dashboard
 * - Unauthenticated users → /login
 *
 * No UI is rendered here. This is a pure routing gate that avoids a
 * client-side flash by resolving the destination on the server.
 */
export default async function RootPage() {
  const session = await auth();

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
