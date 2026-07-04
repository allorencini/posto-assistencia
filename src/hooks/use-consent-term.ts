import { refreshConsentTermCache } from '@/lib/consent-term-cache';
import { db } from '@/lib/db';
import { useQuery } from '@tanstack/react-query';

export function useActiveConsentTerm() {
  return useQuery({
    queryKey: ['consent_term', 'active'],
    queryFn: async () => {
      const cached = await db.consent_terms.toArray();
      if (cached.length > 0) {
        // Stale-while-revalidate: devolve o cache já e atualiza por trás.
        void refreshConsentTermCache();
        return cached[0];
      }
      // Primeiro uso neste device: tenta baixar agora (se online).
      await refreshConsentTermCache();
      const after = await db.consent_terms.toArray();
      return after[0] ?? null;
    },
    staleTime: 5 * 60_000,
  });
}
