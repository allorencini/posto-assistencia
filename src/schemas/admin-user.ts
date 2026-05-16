import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  nome: z.string().min(2).max(200),
  papel: z.enum(['admin', 'operador']),
  senha_temporaria: z.string().min(8, 'Mínimo 8 caracteres').max(72),
});

export const ResetPasswordSchema = z.object({
  target_user_id: z.string().uuid(),
  nova_senha: z.string().min(8).max(72),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
