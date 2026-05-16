-- Migration v4: Adicionar endereco + visita assistente social
-- Rodar no Supabase SQL Editor

ALTER TABLE pessoas
  ADD COLUMN rua TEXT,
  ADD COLUMN numero TEXT,
  ADD COLUMN complemento TEXT,
  ADD COLUMN bairro TEXT,
  ADD COLUMN cep TEXT,
  ADD COLUMN visitada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN apta_cesta BOOLEAN,
  ADD COLUMN visita_obs TEXT;
