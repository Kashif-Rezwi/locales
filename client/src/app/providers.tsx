'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { useState } from 'react';

/**
 * Providers — wraps the entire app in all client-side context providers.
 *
 * - SessionProvider: makes the Auth.js session available via useSession()
 * - QueryClientProvider: enables React Query hooks across the app
 *
 * QueryClient is instantiated inside the component (not module scope) so that
 * each server-render gets a fresh instance, preventing cross-request state
 * pollution in streaming SSR environments.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 1 minute before a background refetch
            staleTime: 60 * 1_000,
            // Only retry once on failure — fail fast in dev, resilient in prod
            retry: 1,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
