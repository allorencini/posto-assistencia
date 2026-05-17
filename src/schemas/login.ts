import { z } from 'zod';

export const LoginSchema = z.object({
  login: z.string().min(2, 'Informe email ou usuário').max(200),
  senha: z.string().min(1, 'Senha obrigatória'),
});

export type LoginInput = z.infer<typeof LoginSchema>;
