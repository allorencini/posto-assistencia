-- Migration v3: Separar categorias de estoque
-- alimento → alimento-doacao / alimento-interno
-- Rodar no Supabase SQL Editor

-- 1. Alterar constraint
ALTER TABLE itens DROP CONSTRAINT itens_categoria_check;
ALTER TABLE itens ADD CONSTRAINT itens_categoria_check
  CHECK (categoria IN ('alimento-doacao', 'alimento-interno', 'limpeza'));

-- 2. Migrar itens existentes (se houver) para doacao por padrao
UPDATE itens SET categoria = 'alimento-doacao' WHERE categoria = 'alimento';

-- 3. Inserir itens iniciais — Doação
INSERT INTO itens (nome, categoria, quantidade) VALUES
  ('Arroz', 'alimento-doacao', 10),
  ('Macarrão', 'alimento-doacao', 10),
  ('Fubá', 'alimento-doacao', 3),
  ('Farofa', 'alimento-doacao', 1),
  ('Farinha de Trigo', 'alimento-doacao', 1);

-- 4. Inserir itens iniciais — Uso Interno
INSERT INTO itens (nome, categoria, quantidade) VALUES
  ('Feijão', 'alimento-interno', 4),
  ('Macarrão', 'alimento-interno', 7);
