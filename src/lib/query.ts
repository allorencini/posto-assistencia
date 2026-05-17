import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      networkMode: 'offlineFirst',
      retry: (count, error) => {
        const status = (error as { status?: number } | null | undefined)?.status;
        if (status === 401 || status === 403) return false;
        return count < 3;
      },
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: false,
    },
  },
});
