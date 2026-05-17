CREATE TABLE IF NOT EXISTS lgpd_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID REFERENCES pessoas(id) ON DELETE SET NULL,
  pessoa_nome_snapshot TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('confirmacao','acesso','correcao','anonimizacao','eliminacao','portabilidade','revogacao')),
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','concluido','rejeitado')),
  solicitado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  solicitado_por UUID REFERENCES app_users(id),
  concluido_em TIMESTAMPTZ,
  concluido_por UUID REFERENCES app_users(id),
  observacao TEXT,
  resultado_arquivo TEXT
);

CREATE INDEX IF NOT EXISTS idx_lgpd_requests_pessoa ON lgpd_requests(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_lgpd_requests_status ON lgpd_requests(status);
