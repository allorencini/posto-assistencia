-- Drop policies antigas (USING true)
DROP POLICY IF EXISTS "Allow all access to pessoas" ON pessoas;
DROP POLICY IF EXISTS "Allow all access to chamadas" ON chamadas;
DROP POLICY IF EXISTS "Allow all access to presencas" ON presencas;
DROP POLICY IF EXISTS "Allow all access to cestas" ON cestas;
DROP POLICY IF EXISTS "Allow all access to itens" ON itens;
DROP POLICY IF EXISTS "Allow all access to pedidos" ON pedidos;
DROP POLICY IF EXISTS "Allow all access to familias" ON familias;

-- Habilitar RLS em todas
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE presencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE pessoa_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE lgpd_requests ENABLE ROW LEVEL SECURITY;

-- app_users
CREATE POLICY app_users_admin_all ON app_users FOR ALL TO authenticated
  USING (current_app_user_papel() = 'admin')
  WITH CHECK (current_app_user_papel() = 'admin');

CREATE POLICY app_users_self_read ON app_users FOR SELECT TO authenticated
  USING (id = auth.uid());

-- pessoas
CREATE POLICY pessoas_admin_all ON pessoas FOR ALL TO authenticated
  USING (current_app_user_papel() = 'admin')
  WITH CHECK (current_app_user_papel() = 'admin');

CREATE POLICY pessoas_operador_select ON pessoas FOR SELECT TO authenticated
  USING (current_app_user_papel() = 'operador');

CREATE POLICY pessoas_operador_insert ON pessoas FOR INSERT TO authenticated
  WITH CHECK (
    current_app_user_papel() = 'operador'
    AND visita_obs IS NULL AND apta_cesta IS NULL
    AND visitada = FALSE
    AND rua IS NULL AND numero IS NULL AND complemento IS NULL
    AND bairro IS NULL AND cep IS NULL
  );

CREATE POLICY pessoas_operador_update ON pessoas FOR UPDATE TO authenticated
  USING (current_app_user_papel() = 'operador')
  WITH CHECK (current_app_user_papel() = 'operador');

CREATE POLICY pessoas_operador_delete ON pessoas FOR DELETE TO authenticated
  USING (current_app_user_papel() = 'operador');

CREATE OR REPLACE FUNCTION enforce_operador_fields() RETURNS TRIGGER AS $$
DECLARE
  papel_user TEXT;
BEGIN
  SELECT papel INTO papel_user FROM app_users WHERE id = auth.uid();
  IF papel_user = 'operador' THEN
    NEW.visita_obs := OLD.visita_obs;
    NEW.apta_cesta := OLD.apta_cesta;
    NEW.visitada := OLD.visitada;
    NEW.rua := OLD.rua;
    NEW.numero := OLD.numero;
    NEW.complemento := OLD.complemento;
    NEW.bairro := OLD.bairro;
    NEW.cep := OLD.cep;
    NEW.anonimizado_em := OLD.anonimizado_em;
    NEW.anonimizado_por := OLD.anonimizado_por;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER pessoas_enforce_fields BEFORE UPDATE ON pessoas FOR EACH ROW EXECUTE FUNCTION enforce_operador_fields();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE VIEW pessoas_operador AS
  SELECT id, nome, grupo, familia_id, telefone, ativo, excluir_ranking,
         anonimizado_em, criado_em, atualizado_em
  FROM pessoas
  WHERE anonimizado_em IS NULL;

GRANT SELECT ON pessoas_operador TO authenticated;

-- familias
CREATE POLICY familias_all_authenticated ON familias FOR ALL TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'))
  WITH CHECK (current_app_user_papel() IN ('admin','operador'));

-- chamadas
CREATE POLICY chamadas_select ON chamadas FOR SELECT TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'));

CREATE POLICY chamadas_admin_write ON chamadas FOR INSERT TO authenticated
  WITH CHECK (current_app_user_papel() IN ('admin','operador'));

CREATE POLICY chamadas_admin_delete ON chamadas FOR DELETE TO authenticated
  USING (current_app_user_papel() = 'admin');

-- presencas
CREATE POLICY presencas_select ON presencas FOR SELECT TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'));

CREATE POLICY presencas_insert ON presencas FOR INSERT TO authenticated
  WITH CHECK (
    current_app_user_papel() = 'admin'
    OR (
      current_app_user_papel() = 'operador'
      AND (SELECT data FROM chamadas WHERE id = chamada_id) = CURRENT_DATE
    )
  );

CREATE POLICY presencas_update ON presencas FOR UPDATE TO authenticated
  USING (
    current_app_user_papel() = 'admin'
    OR (
      current_app_user_papel() = 'operador'
      AND (SELECT data FROM chamadas WHERE id = chamada_id) = CURRENT_DATE
    )
  );

CREATE POLICY presencas_delete ON presencas FOR DELETE TO authenticated
  USING (current_app_user_papel() = 'admin');

-- cestas
CREATE POLICY cestas_all_authenticated ON cestas FOR ALL TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'))
  WITH CHECK (current_app_user_papel() IN ('admin','operador'));

-- itens
CREATE POLICY itens_all_authenticated ON itens FOR ALL TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'))
  WITH CHECK (current_app_user_papel() IN ('admin','operador'));

-- pedidos
CREATE POLICY pedidos_all_authenticated ON pedidos FOR ALL TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'))
  WITH CHECK (current_app_user_papel() IN ('admin','operador'));

-- consent_terms
CREATE POLICY consent_terms_select ON consent_terms FOR SELECT TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'));

CREATE POLICY consent_terms_admin_write ON consent_terms FOR INSERT TO authenticated
  WITH CHECK (current_app_user_papel() = 'admin');

CREATE POLICY consent_terms_admin_update ON consent_terms FOR UPDATE TO authenticated
  USING (current_app_user_papel() = 'admin');

-- pessoa_consents
CREATE POLICY pessoa_consents_select ON pessoa_consents FOR SELECT TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'));

CREATE POLICY pessoa_consents_insert ON pessoa_consents FOR INSERT TO authenticated
  WITH CHECK (current_app_user_papel() IN ('admin','operador'));

CREATE POLICY pessoa_consents_update ON pessoa_consents FOR UPDATE TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'));

-- audit_log
CREATE POLICY audit_select_admin ON audit_log FOR SELECT TO authenticated
  USING (current_app_user_papel() = 'admin');

-- lgpd_requests
CREATE POLICY lgpd_requests_admin_all ON lgpd_requests FOR ALL TO authenticated
  USING (current_app_user_papel() = 'admin')
  WITH CHECK (current_app_user_papel() = 'admin');

-- ===== TEMP: policies pra anon role manter vanilla legacy funcionando até cutover =====
-- REMOVER no Plan 4 (cutover) — TICKET: cutover-remove-anon-legacy-policies
CREATE POLICY pessoas_anon_legacy_temp ON pessoas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY familias_anon_legacy_temp ON familias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY chamadas_anon_legacy_temp ON chamadas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY presencas_anon_legacy_temp ON presencas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY cestas_anon_legacy_temp ON cestas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY itens_anon_legacy_temp ON itens FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY pedidos_anon_legacy_temp ON pedidos FOR ALL TO anon USING (true) WITH CHECK (true);
