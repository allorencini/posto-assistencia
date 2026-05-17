import { z } from 'zod';

export const PedidoInputSchema = z.object({
  pessoa_id: z.string().uuid({ message: 'Selecione pessoa' }),
  item: z
    .string()
    .min(2, 'Item obrigatório')
    .max(200)
    .transform((s) => s.trim().toUpperCase()),
  quantidade: z.coerce.number().int().min(1).default(1),
  observacao: z.string().max(500).nullable().optional(),
});

export type PedidoInput = z.infer<typeof PedidoInputSchema>;
