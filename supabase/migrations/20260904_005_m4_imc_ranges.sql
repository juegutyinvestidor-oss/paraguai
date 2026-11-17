-- =============================================================================
-- MIGRACAO: M4 - faixas numericas de IMC (imc_min / imc_max)
-- Data: 2026-09-04
-- Descricao: Adiciona as colunas de faixa ao m4_imc_config para que a
--            classificacao do IMC na aba Avaliacoes passe a ser definida pelo
--            Modulo 4 (Questionario), e nao por limiares fixos no codigo.
--            - cria a tabela se nao existir (nao havia CREATE canônico);
--            - adiciona imc_min/imc_max se faltarem;
--            - garante RLS + politicas publicas (modelo anon do app);
--            - preenche as faixas padrao das 4 classificacoes existentes
--              (apenas onde ainda nao foram definidas, sem sobrescrever).
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.m4_imc_config (
  id text primary key,
  classification text not null,
  status text,
  alert_color text,
  description text,
  imc_min numeric,
  imc_max numeric,
  created_at timestamptz default now()
);

ALTER TABLE public.m4_imc_config ADD COLUMN IF NOT EXISTS imc_min numeric;
ALTER TABLE public.m4_imc_config ADD COLUMN IF NOT EXISTS imc_max numeric;

ALTER TABLE public.m4_imc_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select m4_imc_config" ON public.m4_imc_config;
DROP POLICY IF EXISTS "Allow public insert m4_imc_config" ON public.m4_imc_config;
DROP POLICY IF EXISTS "Allow public update m4_imc_config" ON public.m4_imc_config;
DROP POLICY IF EXISTS "Allow public delete m4_imc_config" ON public.m4_imc_config;
CREATE POLICY "Allow public select m4_imc_config" ON public.m4_imc_config FOR SELECT USING (true);
CREATE POLICY "Allow public insert m4_imc_config" ON public.m4_imc_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update m4_imc_config" ON public.m4_imc_config FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete m4_imc_config" ON public.m4_imc_config FOR DELETE USING (true);

-- Faixas padrao (compativeis com a classificacao anterior do app), so onde nao definidas
UPDATE public.m4_imc_config SET imc_min = 0,    imc_max = 18.4 WHERE lower(classification) = 'abaixo do peso' AND imc_min IS NULL AND imc_max IS NULL;
UPDATE public.m4_imc_config SET imc_min = 18.5, imc_max = 24.9 WHERE lower(classification) = 'peso normal'    AND imc_min IS NULL AND imc_max IS NULL;
UPDATE public.m4_imc_config SET imc_min = 25,   imc_max = 29.9 WHERE lower(classification) = 'sobrepeso'      AND imc_min IS NULL AND imc_max IS NULL;
UPDATE public.m4_imc_config SET imc_min = 30,   imc_max = NULL WHERE lower(classification) = 'obesidade'      AND imc_min IS NULL;

-- =============================================================================
-- VERIFICACAO:
--   SELECT id, classification, imc_min, imc_max FROM public.m4_imc_config ORDER BY imc_min;
-- =============================================================================
