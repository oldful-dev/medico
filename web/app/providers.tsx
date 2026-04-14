'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { AuthInitializer } from '@/components/auth/AuthInitializer';
import { Toaster } from 'sonner';

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      <Toaster position="top-right" richColors closeButton />
      {children}
    </QueryClientProvider>
  );
}

