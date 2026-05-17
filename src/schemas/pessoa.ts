import { z } from 'zod';

export const GRUPOS = ['evangelizacao', 'mocidade', 'adulto', 'gestante'] as const;

export const PessoaInputSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome obrigatório (mínimo 2 caracteres)')
    .max(200)
    .transform((s) => s.trim().toUpperCase()),
  grupo: z.enum(GRUPOS),
  telefone: z
    .string()
    .regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, 'Telefone inválido')
    .optional()
    .or(z.literal('')),
  familia_id: z.string().uuid().nullable().optional().or(z.literal('')),
  rua: z.string().max(200).optional().or(z.literal('')),
  numero: z.string().max(20).optional().or(z.literal('')),
  complemento: z.string().max(100).optional().or(z.literal('')),
  bairro: z.string().max(100).optional().or(z.literal('')),
  cep: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP inválido')
    .optional()
    .or(z.literal('')),
  visitada: z.boolean().default(false),
  apta_cesta: z.boolean().nullable().optional(),
  visita_obs: z.string().max(500).nullable().optional(),
  excluir_ranking: z.boolean().default(false),
  consent_declarado: z
    .boolean()
    .refine((v) => v === true, { message: 'Captura de consentimento obrigatória' }),
});

export type PessoaInput = z.infer<typeof PessoaInputSchema>;
