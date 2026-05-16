ALTER TABLE pessoas
  ADD COLUMN IF NOT EXISTS anonimizado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anonimizado_por UUID REFERENCES app_users(id);

CREATE INDEX IF NOT EXISTS idx_pessoas_anonimizado ON pessoas(anonimizado_em) WHERE anonimizado_em IS NOT NULL;
