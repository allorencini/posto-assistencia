import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'eyJtest_anon_key_value');
vi.stubEnv('VITE_DPO_NOME', 'T');
vi.stubEnv('VITE_DPO_EMAIL', 't@t.com');
vi.stubEnv('VITE_APP_VERSION', 't');

describe('supabase client', () => {
  it('exports a typed client singleton', async () => {
    const { supabase } = await import('./supabase');
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });
});
