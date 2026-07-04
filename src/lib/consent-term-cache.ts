import type { ConsentTerm } from '@/types/domain';
import { db } from './db';
import { supabase } from './supabase';

/**
 * Cacheia o termo de consentimento ativo no Dexie pra que o cadastro de
 * pessoa funcione offline. Best-effort: qualquer falha é silenciosa —
 * a próxima janela online tenta de novo (boot, evento 'online', publicação
 * de termo novo pelo admin).
 */
export async function refreshConsentTermCache(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    const { data, error } = await supabase
      .from('consent_terms')
      .select('id, versao, texto, ativo, criado_em')
      .eq('ativo', true)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return;
    await db.transaction('rw', db.consent_terms, async () => {
      await db.consent_terms.clear();
      await db.consent_terms.put(data as ConsentTerm);
    });
  } catch {
    // silencioso: cache é best-effort
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void refreshConsentTermCache());
}
