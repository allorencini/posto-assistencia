import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      networkMode: 'offlineFirst',
      retry: (count, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return count < 3;
      },
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: false,
    },
  },
});
