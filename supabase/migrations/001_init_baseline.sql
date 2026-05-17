-- Idempotent baseline of current schema. Safe to run on existing DB.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS familias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pessoas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  grupo TEXT NOT NULL CHECK (grupo IN ('evangelizacao','mocidade','adulto','gestante')),
  familia_id UUID REFERENCES familias(id) ON DELETE SET NULL,
  telefone TEXT,
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cep TEXT,
  visitada BOOLEAN NOT NULL DEFAULT FALSE,
  apta_cesta BOOLEAN,
  visita_obs TEXT,
  excluir_ranking BOOLEAN DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chamadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL UNIQUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamada_id UUID NOT NULL REFERENCES chamadas(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  presente BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chamada_id, pessoa_id)
);

CREATE TABLE IF NOT EXISTS cestas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('alimento-doacao','alimento-interno','limpeza')),
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID REFERENCES pessoas(id) ON DELETE SET NULL,
  familia_id UUID REFERENCES familias(id) ON DELETE SET NULL,
  item TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','atendido')),
  solicitado_em DATE NOT NULL DEFAULT CURRENT_DATE,
  atendido_em DATE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (pessoa_id IS NOT NULL OR familia_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_presencas_chamada ON presencas(chamada_id);
CREATE INDEX IF NOT EXISTS idx_presencas_pessoa ON presencas(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_chamadas_data ON chamadas(data);
CREATE INDEX IF NOT EXISTS idx_pessoas_grupo ON pessoas(grupo);
CREATE INDEX IF NOT EXISTS idx_cestas_pessoa ON cestas(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_cestas_data ON cestas(data);
CREATE INDEX IF NOT EXISTS idx_itens_categoria ON itens(categoria);
CREATE INDEX IF NOT EXISTS idx_pedidos_pessoa ON pedidos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_familia ON pedidos(familia_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);

CREATE OR REPLACE FUNCTION update_atualizado_em() RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER pessoas_atualizado BEFORE UPDATE ON pessoas FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER familias_atualizado BEFORE UPDATE ON familias FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER presencas_atualizado BEFORE UPDATE ON presencas FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER cestas_atualizado BEFORE UPDATE ON cestas FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER itens_atualizado BEFORE UPDATE ON itens FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER pedidos_atualizado BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
