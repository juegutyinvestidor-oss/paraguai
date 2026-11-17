-- =============================================================================
-- MIGRACAO: Garantir RLS CRUD (anon) em m5/m6/m7 do Questionario
-- Data: 2026-09-04
-- Descricao: Estas tabelas de configuracao nao tem CREATE canônico no codigo
--            (foram criadas a mao). Se ficaram com RLS ativo e sem politica de
--            SELECT para 'anon', o app nao enxerga as linhas no banco e recai
--            no localStorage (podendo mostrar texto antigo/corrompido mesmo
--            apos a 20260904_009). Este script habilita RLS e garante
--            SELECT/INSERT/UPDATE/DELETE publicos (modelo anon), idempotente.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- m5_capacidades_config
ALTER TABLE public.m5_capacidades_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon+auth select m5_capacidades_config" ON public.m5_capacidades_config;
DROP POLICY IF EXISTS "Allow anon+auth insert m5_capacidades_config" ON public.m5_capacidades_config;
DROP POLICY IF EXISTS "Allow anon+auth update m5_capacidades_config" ON public.m5_capacidades_config;
DROP POLICY IF EXISTS "Allow anon+auth delete m5_capacidades_config" ON public.m5_capacidades_config;
DROP POLICY IF EXISTS "Allow public select m5_capacidades_config" ON public.m5_capacidades_config;
DROP POLICY IF EXISTS "Allow public insert m5_capacidades_config" ON public.m5_capacidades_config;
DROP POLICY IF EXISTS "Allow public update m5_capacidades_config" ON public.m5_capacidades_config;
DROP POLICY IF EXISTS "Allow public delete m5_capacidades_config" ON public.m5_capacidades_config;
CREATE POLICY "Allow anon+auth select m5_capacidades_config" ON public.m5_capacidades_config FOR SELECT USING (true);
CREATE POLICY "Allow anon+auth insert m5_capacidades_config" ON public.m5_capacidades_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon+auth update m5_capacidades_config" ON public.m5_capacidades_config FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon+auth delete m5_capacidades_config" ON public.m5_capacidades_config FOR DELETE USING (true);

-- m6_modalidades_direcionamento
ALTER TABLE public.m6_modalidades_direcionamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon+auth select m6_mod_dir" ON public.m6_modalidades_direcionamento;
DROP POLICY IF EXISTS "Allow anon+auth insert m6_mod_dir" ON public.m6_modalidades_direcionamento;
DROP POLICY IF EXISTS "Allow anon+auth update m6_mod_dir" ON public.m6_modalidades_direcionamento;
DROP POLICY IF EXISTS "Allow anon+auth delete m6_mod_dir" ON public.m6_modalidades_direcionamento;
DROP POLICY IF EXISTS "Allow public select m6_modalidades_direcionamento" ON public.m6_modalidades_direcionamento;
DROP POLICY IF EXISTS "Allow public insert m6_modalidades_direcionamento" ON public.m6_modalidades_direcionamento;
DROP POLICY IF EXISTS "Allow public update m6_modalidades_direcionamento" ON public.m6_modalidades_direcionamento;
DROP POLICY IF EXISTS "Allow public delete m6_modalidades_direcionamento" ON public.m6_modalidades_direcionamento;
CREATE POLICY "Allow anon+auth select m6_mod_dir" ON public.m6_modalidades_direcionamento FOR SELECT USING (true);
CREATE POLICY "Allow anon+auth insert m6_mod_dir" ON public.m6_modalidades_direcionamento FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon+auth update m6_mod_dir" ON public.m6_modalidades_direcionamento FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon+auth delete m6_mod_dir" ON public.m6_modalidades_direcionamento FOR DELETE USING (true);

-- m6_diretrizes_intervencao
ALTER TABLE public.m6_diretrizes_intervencao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon+auth select m6_dir_int" ON public.m6_diretrizes_intervencao;
DROP POLICY IF EXISTS "Allow anon+auth insert m6_dir_int" ON public.m6_diretrizes_intervencao;
DROP POLICY IF EXISTS "Allow anon+auth update m6_dir_int" ON public.m6_diretrizes_intervencao;
DROP POLICY IF EXISTS "Allow anon+auth delete m6_dir_int" ON public.m6_diretrizes_intervencao;
DROP POLICY IF EXISTS "Allow public select m6_diretrizes_intervencao" ON public.m6_diretrizes_intervencao;
DROP POLICY IF EXISTS "Allow public insert m6_diretrizes_intervencao" ON public.m6_diretrizes_intervencao;
DROP POLICY IF EXISTS "Allow public update m6_diretrizes_intervencao" ON public.m6_diretrizes_intervencao;
DROP POLICY IF EXISTS "Allow public delete m6_diretrizes_intervencao" ON public.m6_diretrizes_intervencao;
CREATE POLICY "Allow anon+auth select m6_dir_int" ON public.m6_diretrizes_intervencao FOR SELECT USING (true);
CREATE POLICY "Allow anon+auth insert m6_dir_int" ON public.m6_diretrizes_intervencao FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon+auth update m6_dir_int" ON public.m6_diretrizes_intervencao FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon+auth delete m6_dir_int" ON public.m6_diretrizes_intervencao FOR DELETE USING (true);

-- m7_perfis_pareceres
ALTER TABLE public.m7_perfis_pareceres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon+auth select m7_perfis_pareceres" ON public.m7_perfis_pareceres;
DROP POLICY IF EXISTS "Allow anon+auth insert m7_perfis_pareceres" ON public.m7_perfis_pareceres;
DROP POLICY IF EXISTS "Allow anon+auth update m7_perfis_pareceres" ON public.m7_perfis_pareceres;
DROP POLICY IF EXISTS "Allow anon+auth delete m7_perfis_pareceres" ON public.m7_perfis_pareceres;
DROP POLICY IF EXISTS "Allow public select m7_perfis_pareceres" ON public.m7_perfis_pareceres;
DROP POLICY IF EXISTS "Allow public insert m7_perfis_pareceres" ON public.m7_perfis_pareceres;
DROP POLICY IF EXISTS "Allow public update m7_perfis_pareceres" ON public.m7_perfis_pareceres;
DROP POLICY IF EXISTS "Allow public delete m7_perfis_pareceres" ON public.m7_perfis_pareceres;
CREATE POLICY "Allow anon+auth select m7_perfis_pareceres" ON public.m7_perfis_pareceres FOR SELECT USING (true);
CREATE POLICY "Allow anon+auth insert m7_perfis_pareceres" ON public.m7_perfis_pareceres FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon+auth update m7_perfis_pareceres" ON public.m7_perfis_pareceres FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon+auth delete m7_perfis_pareceres" ON public.m7_perfis_pareceres FOR DELETE USING (true);

-- =============================================================================
-- VERIFICACAO:
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE tablename IN ('m5_capacidades_config','m6_modalidades_direcionamento',
--                       'm6_diretrizes_intervencao','m7_perfis_pareceres')
--   ORDER BY tablename, cmd;
-- =============================================================================
