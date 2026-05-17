CREATE OR REPLACE FUNCTION find_inactive_pessoas(cutoff_date TIMESTAMPTZ)
RETURNS TABLE (id UUID)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT p.id FROM pessoas p
  WHERE p.atualizado_em < cutoff_date
    AND p.anonimizado_em IS NULL
    AND NOT EXISTS (SELECT 1 FROM presencas WHERE pessoa_id = p.id AND atualizado_em >= cutoff_date)
    AND NOT EXISTS (SELECT 1 FROM cestas WHERE pessoa_id = p.id AND atualizado_em >= cutoff_date)
    AND NOT EXISTS (SELECT 1 FROM pedidos WHERE pessoa_id = p.id AND atualizado_em >= cutoff_date);
$$;

REVOKE EXECUTE ON FUNCTION find_inactive_pessoas(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_inactive_pessoas(TIMESTAMPTZ) TO service_role;
