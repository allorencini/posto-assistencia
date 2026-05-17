-- Plan 4 step 5 — Cutover: remove RLS bypass para role `anon`.
--
-- Estas 7 policies foram criadas durante a migração React/LGPD pra manter
-- a versão vanilla (anon key + sem login) operando enquanto o frontend novo
-- era desenvolvido. Após o cutover, todo acesso deve passar por
-- `authenticated` + função `current_app_user_papel()` (admin|operador).
--
-- Anti-regressão: cada tabela já tem policies authenticated cobrindo as
-- mesmas operações pra admin/operador (verificado em pg_policies antes do drop).
-- Tabelas com apenas 1 policy (_all_authenticated) cobrem ALL cmds.
-- Tabelas com várias policies (chamadas/pessoas/presencas) cobrem SELECT/INSERT/UPDATE/DELETE separadamente.

DROP POLICY IF EXISTS cestas_anon_legacy_temp     ON public.cestas;
DROP POLICY IF EXISTS chamadas_anon_legacy_temp   ON public.chamadas;
DROP POLICY IF EXISTS familias_anon_legacy_temp   ON public.familias;
DROP POLICY IF EXISTS itens_anon_legacy_temp      ON public.itens;
DROP POLICY IF EXISTS pedidos_anon_legacy_temp    ON public.pedidos;
DROP POLICY IF EXISTS pessoas_anon_legacy_temp    ON public.pessoas;
DROP POLICY IF EXISTS presencas_anon_legacy_temp  ON public.presencas;

-- ROLLBACK (cole tudo dentro de um BEGIN/COMMIT se precisar reverter):
-- CREATE POLICY cestas_anon_legacy_temp     ON public.cestas    FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY chamadas_anon_legacy_temp   ON public.chamadas  FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY familias_anon_legacy_temp   ON public.familias  FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY itens_anon_legacy_temp      ON public.itens     FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY pedidos_anon_legacy_temp    ON public.pedidos   FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY pessoas_anon_legacy_temp    ON public.pessoas   FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY presencas_anon_legacy_temp  ON public.presencas FOR ALL TO anon USING (true) WITH CHECK (true);
