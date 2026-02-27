import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * DashboardPage — protected landing page after sign-in.
 *
 * Placeholder for Chunk 3 (Project & Repo Setup).
 * Server-side auth guard: unauthenticated requests redirect to /login.
 */
export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Welcome, {session.user?.name ?? 'there'} — full UI ships in Chunk 3.
      </p>
    </main>
  );
}
