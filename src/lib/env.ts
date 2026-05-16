import { z } from 'zod';

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  DPO_NOME: z.string().min(1),
  DPO_EMAIL: z.string().email(),
  APP_VERSION: z.string().default('dev'),
});

const raw = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  DPO_NOME: import.meta.env.VITE_DPO_NOME,
  DPO_EMAIL: import.meta.env.VITE_DPO_EMAIL,
  APP_VERSION: import.meta.env.VITE_APP_VERSION,
};

const parsed = EnvSchema.safeParse(raw);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
