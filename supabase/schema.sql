-- Controle de Presenca — Database Schema
-- Run this in Supabase SQL Editor after creating a new project

-- Table: pessoas
CREATE TABLE pessoas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  grupo TEXT NOT NULL CHECK (grupo IN ('evangelizacao', 'mocidade', 'adulto', 'gestante')),
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: chamadas
CREATE TABLE chamadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL UNIQUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: presencas
CREATE TABLE presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamada_id UUID NOT NULL REFERENCES chamadas(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  presente BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chamada_id, pessoa_id)
);

-- Table: cestas (entregas de cestas basicas)
CREATE TABLE cestas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: itens (estoque de alimentos e produtos de limpeza)
CREATE TABLE itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('alimento', 'limpeza')),
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_presencas_chamada ON presencas(chamada_id);
CREATE INDEX idx_presencas_pessoa ON presencas(pessoa_id);
CREATE INDEX idx_chamadas_data ON chamadas(data);
CREATE INDEX idx_pessoas_grupo ON pessoas(grupo);
CREATE INDEX idx_cestas_pessoa ON cestas(pessoa_id);
CREATE INDEX idx_cestas_data ON cestas(data);
CREATE INDEX idx_itens_categoria ON itens(categoria);

-- Auto-update atualizado_em
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pessoas_atualizado
  BEFORE UPDATE ON pessoas
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

CREATE TRIGGER presencas_atualizado
  BEFORE UPDATE ON presencas
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

CREATE TRIGGER cestas_atualizado
  BEFORE UPDATE ON cestas
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

CREATE TRIGGER itens_atualizado
  BEFORE UPDATE ON itens
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

-- RLS: Allow anonymous access (no login requirement)
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE presencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to pessoas" ON pessoas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to chamadas" ON chamadas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to presencas" ON presencas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to cestas" ON cestas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to itens" ON itens FOR ALL USING (true) WITH CHECK (true);

-- === Migration: apenas a tabela itens (para quem ja tem o schema antigo) ===
-- CREATE TABLE itens (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   nome TEXT NOT NULL,
--   categoria TEXT NOT NULL CHECK (categoria IN ('alimento', 'limpeza')),
--   quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
--   ativo BOOLEAN NOT NULL DEFAULT TRUE,
--   criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );
-- CREATE INDEX idx_itens_categoria ON itens(categoria);
-- CREATE TRIGGER itens_atualizado BEFORE UPDATE ON itens FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
-- ALTER TABLE itens ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all access to itens" ON itens FOR ALL USING (true) WITH CHECK (true);

-- === Migration: apenas a tabela cestas (para quem ja tem o schema antigo) ===
-- CREATE TABLE cestas (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
--   data DATE NOT NULL,
--   ativo BOOLEAN NOT NULL DEFAULT TRUE,
--   criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );
-- CREATE INDEX idx_cestas_pessoa ON cestas(pessoa_id);
-- CREATE INDEX idx_cestas_data ON cestas(data);
-- CREATE TRIGGER cestas_atualizado BEFORE UPDATE ON cestas FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
-- ALTER TABLE cestas ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all access to cestas" ON cestas FOR ALL USING (true) WITH CHECK (true);
