import { z } from 'zod';

export const PedidoInputSchema = z
  .object({
    pessoa_id: z.string().uuid().nullable().optional(),
    familia_id: z.string().uuid().nullable().optional(),
    item: z
      .string()
      .min(2, 'Item obrigatório')
      .max(200)
      .transform((s) => s.trim().toUpperCase()),
    quantidade: z.coerce.number().int().min(1).default(1),
    observacao: z.string().max(500).nullable().optional(),
  })
  .refine((v) => !!v.pessoa_id || !!v.familia_id, {
    message: 'Selecione destinatário (pessoa ou família)',
    path: ['pessoa_id'],
  });

export type PedidoInput = z.infer<typeof PedidoInputSchema>;
