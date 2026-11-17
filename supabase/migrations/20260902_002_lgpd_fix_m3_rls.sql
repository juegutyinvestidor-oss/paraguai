-- =============================================================================
-- MIGRACAO: LGPD - Corrigir RLS policies do Modulo 3
-- Data: 2026-09-02
-- Descricao: Substitui políticas RLS com "using (true)" (acesso público total)
--            por políticas que exigem autenticacao via auth.role()
-- LGPD: Art. 46 - Medidas de segurança para proteção dos dados pessoais
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- 1. Remover políticas permissivas antigas de m3_cenarios
DROP POLICY IF EXISTS "Allow public select m3_cenarios" ON public.m3_cenarios;
DROP POLICY IF EXISTS "Allow public insert m3_cenarios" ON public.m3_cenarios;
DROP POLICY IF EXISTS "Allow public update m3_cenarios" ON public.m3_cenarios;
DROP POLICY IF EXISTS "Allow public delete m3_cenarios" ON public.m3_cenarios;

-- 2. Novas políticas para m3_cenarios (exigem autenticação)
CREATE POLICY "Authenticated select m3_cenarios"
ON public.m3_cenarios FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert m3_cenarios"
ON public.m3_cenarios FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update m3_cenarios"
ON public.m3_cenarios FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete m3_cenarios"
ON public.m3_cenarios FOR DELETE
USING (auth.role() = 'authenticated');

-- 3. Remover políticas permissivas antigas de m3_impactos
DROP POLICY IF EXISTS "Allow public select m3_impactos" ON public.m3_impactos;
DROP POLICY IF EXISTS "Allow public insert m3_impactos" ON public.m3_impactos;
DROP POLICY IF EXISTS "Allow public update m3_impactos" ON public.m3_impactos;
DROP POLICY IF EXISTS "Allow public delete m3_impactos" ON public.m3_impactos;

-- 4. Novas políticas para m3_impactos (exigem autenticação)
CREATE POLICY "Authenticated select m3_impactos"
ON public.m3_impactos FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert m3_impactos"
ON public.m3_impactos FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update m3_impactos"
ON public.m3_impactos FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete m3_impactos"
ON public.m3_impactos FOR DELETE
USING (auth.role() = 'authenticated');

-- =============================================================================
-- VERIFICACAO: Listar todas as políticas das tabelas M3
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('m3_cenarios', 'm3_impactos')
-- ORDER BY tablename, cmd;
-- =============================================================================
