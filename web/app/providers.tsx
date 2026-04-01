'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Creating a new client for each request/session on the client side
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Highly aggressive caching to prevent unnecessary fetches
            staleTime: 5 * 60 * 1000, // 5 minutes fresh
            gcTime: 10 * 60 * 1000,   // 10 minutes cache lifespan
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
            retry: 1,
            // Next 14+ specific: ensure structural sharing is on
            structuralSharing: true,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
