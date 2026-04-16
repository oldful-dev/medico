import { QueryClient } from '@tanstack/react-query';

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Highly aggressive caching as per performance requirements
        staleTime: 5 * 1000, // 5 seconds (standard for dynamic apps)
        gcTime: 15 * 60 * 1000,    // 15 minutes
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        retry: 1,
        // Ensure data stability
        structuralSharing: true,
      },
      mutations: {
        // Best practice for performance: avoid refetching after mutations
        // Use setQueryData in individual components instead.
        retry: 1,
      },
    },
  });

// Global singleton instance for use cases where state isn't managed by Provider (rare in App Router)
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important so we don't re-make a new client if React
    // suspends during the initial render.
    if (!browserQueryClient) browserQueryClient = createQueryClient();
    return browserQueryClient;
  }
}
