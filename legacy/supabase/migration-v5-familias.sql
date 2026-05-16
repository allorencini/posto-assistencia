-- Migration v5: Famílias
-- Rodar no Supabase SQL Editor

CREATE TABLE familias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pessoas ADD COLUMN familia_id UUID REFERENCES familias(id) ON DELETE SET NULL;

CREATE INDEX idx_pessoas_familia ON pessoas(familia_id);
CREATE INDEX idx_familias_ativo ON familias(ativo);

CREATE TRIGGER familias_atualizado
  BEFORE UPDATE ON familias
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

ALTER TABLE familias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to familias" ON familias FOR ALL USING (true) WITH CHECK (true);
