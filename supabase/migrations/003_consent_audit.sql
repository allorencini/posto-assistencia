CREATE TABLE IF NOT EXISTS consent_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  versao TEXT NOT NULL UNIQUE,
  texto TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por UUID REFERENCES app_users(id)
);

CREATE TABLE IF NOT EXISTS pessoa_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  consent_term_id UUID NOT NULL REFERENCES consent_terms(id),
  declarado_por UUID NOT NULL REFERENCES app_users(id),
  metodo TEXT NOT NULL DEFAULT 'verbal' CHECK (metodo IN ('verbal','escrito')),
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revogado_em TIMESTAMPTZ,
  revogado_por UUID REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_pessoa_consents_pessoa ON pessoa_consents(pessoa_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  tabela TEXT NOT NULL,
  registro_id UUID NOT NULL,
  operacao TEXT NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE','ANONIMIZAR','EXPORT')),
  usuario_id UUID REFERENCES app_users(id),
  diff JSONB,
  ip TEXT,
  user_agent TEXT,
  ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_registro ON audit_log(tabela, registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_log(usuario_id, ocorrido_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ocorrido ON audit_log(ocorrido_em DESC);

CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
DECLARE
  diff_jsonb JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    diff_jsonb := jsonb_build_object('depois', row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    diff_jsonb := jsonb_build_object('antes', row_to_json(OLD), 'depois', row_to_json(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    diff_jsonb := jsonb_build_object('antes', row_to_json(OLD));
  END IF;

  INSERT INTO audit_log(tabela, registro_id, operacao, usuario_id, diff)
  VALUES (
    TG_TABLE_NAME,
    COALESCE((NEW).id, (OLD).id),
    TG_OP,
    auth.uid(),
    diff_jsonb
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER pessoas_audit AFTER INSERT OR UPDATE OR DELETE ON pessoas FOR EACH ROW EXECUTE FUNCTION audit_trigger();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER familias_audit AFTER INSERT OR UPDATE OR DELETE ON familias FOR EACH ROW EXECUTE FUNCTION audit_trigger();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER presencas_audit AFTER INSERT OR UPDATE OR DELETE ON presencas FOR EACH ROW EXECUTE FUNCTION audit_trigger();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER cestas_audit AFTER INSERT OR UPDATE OR DELETE ON cestas FOR EACH ROW EXECUTE FUNCTION audit_trigger();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER pedidos_audit AFTER INSERT OR UPDATE OR DELETE ON pedidos FOR EACH ROW EXECUTE FUNCTION audit_trigger();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER app_users_audit AFTER INSERT OR UPDATE OR DELETE ON app_users FOR EACH ROW EXECUTE FUNCTION audit_trigger();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
