import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('env', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('throws if VITE_SUPABASE_URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.stubEnv('VITE_DPO_NOME', '');
    vi.stubEnv('VITE_DPO_EMAIL', '');
    vi.stubEnv('VITE_APP_VERSION', '');
    await expect(import('./env')).rejects.toThrow(/SUPABASE_URL/);
  });

  it('parses valid env', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'eyJtest_anon_key_value');
    vi.stubEnv('VITE_DPO_NOME', 'Test DPO');
    vi.stubEnv('VITE_DPO_EMAIL', 'dpo@test.com');
    vi.stubEnv('VITE_APP_VERSION', 'dev');
    const { env } = await import('./env');
    expect(env.SUPABASE_URL).toBe('https://test.supabase.co');
    expect(env.DPO_EMAIL).toBe('dpo@test.com');
  });
});
