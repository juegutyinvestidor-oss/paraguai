-- =============================================================================
-- MIGRACAO: Garantir RLS CRUD (anon) em aptidao_referenciais (Modulo 1)
-- Data: 2026-09-04
-- Descricao: A tabela aptidao_referenciais nunca foi coberta pela migracao
--            20260904_001. Se no banco ela ficou apenas com politicas de
--            SELECT/INSERT, o app CONSEGUE inserir uma linha nova (upsert faz
--            INSERT), mas a EDICAO de uma linha existente (upsert faz UPDATE)
--            e a EXCLUSAO (DELETE) falham em silencio por falta de politica.
--            Este script garante SELECT/INSERT/UPDATE/DELETE publicos (modelo
--            anon do app), de forma idempotente.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

ALTER TABLE public.aptidao_referenciais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon+auth select aptidao_referenciais" ON public.aptidao_referenciais;
DROP POLICY IF EXISTS "Allow anon+auth insert aptidao_referenciais" ON public.aptidao_referenciais;
DROP POLICY IF EXISTS "Allow anon+auth update aptidao_referenciais" ON public.aptidao_referenciais;
DROP POLICY IF EXISTS "Allow anon+auth delete aptidao_referenciais" ON public.aptidao_referenciais;
-- remove nomes antigos possiveis (schema canonical)
DROP POLICY IF EXISTS "Allow public select aptidao_referenciais" ON public.aptidao_referenciais;
DROP POLICY IF EXISTS "Allow public insert aptidao_referenciais" ON public.aptidao_referenciais;
DROP POLICY IF EXISTS "Allow public update aptidao_referenciais" ON public.aptidao_referenciais;
DROP POLICY IF EXISTS "Allow public delete aptidao_referenciais" ON public.aptidao_referenciais;

CREATE POLICY "Allow anon+auth select aptidao_referenciais" ON public.aptidao_referenciais
  FOR SELECT USING (true);
CREATE POLICY "Allow anon+auth insert aptidao_referenciais" ON public.aptidao_referenciais
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon+auth update aptidao_referenciais" ON public.aptidao_referenciais
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon+auth delete aptidao_referenciais" ON public.aptidao_referenciais
  FOR DELETE USING (true);

-- =============================================================================
-- VERIFICACAO:
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname='public' AND tablename='aptidao_referenciais' ORDER BY cmd;
-- =============================================================================
