INSERT INTO consent_terms (versao, texto, ativo, criado_em)
VALUES (
  '2026-05-15-v1',
  'Eu, titular dos dados pessoais, autorizo a igreja a tratar meus dados (nome, telefone, endereço e informações de visita social) para a finalidade de organização de assistência social, controle de presença em cultos e entrega de cestas básicas. Os dados serão mantidos enquanto necessário para esta finalidade ou até minha solicitação de exclusão. Tenho direito de acesso, correção, anonimização ou eliminação conforme LGPD (Lei 13.709/2018). Em caso de dúvidas, contatar o DPO da igreja.',
  TRUE,
  NOW()
)
ON CONFLICT (versao) DO NOTHING;
