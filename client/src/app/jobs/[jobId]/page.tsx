import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * JobPage — displays progress and results for a single translation job.
 *
 * Placeholder for Chunk 5 (Job Execution & SSE Streaming).
 * Server-side auth guard: unauthenticated requests redirect to /login.
 *
 * In Chunk 5 this page will subscribe to SSE events from
 * GET /api/jobs/:jobId/stream and render live step progress.
 */
export default async function JobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const { jobId } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Job
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Job ID: <code className="font-mono">{jobId}</code> — SSE streaming ships in Chunk 5.
      </p>
    </main>
  );
}
