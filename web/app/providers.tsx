'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { AuthInitializer } from '@/components/auth/AuthInitializer';
import { Toaster } from 'react-hot-toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState for the query client to prevent re-initialization 
  // issues during hydration. getQueryClient handles the singleton logic.
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Mirrors mobile AuthContext: reads refresh cookie → hydrates token + user on mount */}
      <AuthInitializer />
      <Toaster position="top-center" reverseOrder={false} />
      {children}
    </QueryClientProvider>
  );
}

