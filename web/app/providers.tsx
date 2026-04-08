'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';

export default function Providers({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState for the query client to prevent re-initialization 
  // issues during hydration. getQueryClient handles the singleton logic.
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

