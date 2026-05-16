CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('admin','operador')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por UUID REFERENCES app_users(id),
  ultimo_login_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_app_users_papel ON app_users(papel);
CREATE INDEX IF NOT EXISTS idx_app_users_ativo ON app_users(ativo);

CREATE OR REPLACE FUNCTION current_app_user_papel() RETURNS TEXT AS $$
  SELECT papel FROM app_users WHERE id = auth.uid() AND ativo = TRUE LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION current_app_user_papel() TO authenticated;
