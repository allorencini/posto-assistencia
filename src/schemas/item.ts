import { z } from 'zod';

export const CATEGORIAS = ['alimento-doacao', 'alimento-interno', 'limpeza'] as const;

export const ItemInputSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome obrigatório')
    .max(200)
    .transform((s) => s.trim().toUpperCase()),
  categoria: z.enum(CATEGORIAS),
  quantidade: z.coerce.number().int().min(0).default(0),
});

export type ItemInput = z.infer<typeof ItemInputSchema>;
