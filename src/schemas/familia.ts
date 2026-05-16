import { z } from 'zod';

export const FamiliaInputSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome obrigatório')
    .max(200)
    .transform((s) => s.trim().toUpperCase()),
  membros: z.array(z.object({ id: z.string().uuid(), nome: z.string() })).default([]),
});

export type FamiliaInput = z.infer<typeof FamiliaInputSchema>;
