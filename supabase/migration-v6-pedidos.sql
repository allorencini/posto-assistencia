-- Migration v6: Pedidos de doação
-- Rodar no Supabase SQL Editor

CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID REFERENCES pessoas(id) ON DELETE SET NULL,
  familia_id UUID REFERENCES familias(id) ON DELETE SET NULL,
  item TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'atendido')),
  solicitado_em DATE NOT NULL DEFAULT CURRENT_DATE,
  atendido_em DATE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (pessoa_id IS NOT NULL OR familia_id IS NOT NULL)
);

CREATE INDEX idx_pedidos_pessoa ON pedidos(pessoa_id);
CREATE INDEX idx_pedidos_familia ON pedidos(familia_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);

CREATE TRIGGER pedidos_atualizado
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to pedidos" ON pedidos FOR ALL USING (true) WITH CHECK (true);
