-- =============================================================================
-- MIGRACAO: M1 aptidao_referenciais - IDs sequenciais POR CATEGORIA
-- Data: 2026-09-04
-- Descricao: Substitui a sequence global (ref-N) do 20260904_002 por sequences
--            por categoria, continuando o padrao dos seeds:
--              forca->f-, impulsao->i-, abdomen->a-, agilidade->ag-, velocidade->v-
--            Ex.: seeds f-1..f-10 -> proximo forca = f-11.
--            Idempotente. A RPC passa a receber p_category.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- 1. Remove a abordagem global anterior
DROP FUNCTION IF EXISTS public.next_aptidao_ref_id();
DROP SEQUENCE IF EXISTS public.aptidao_referenciais_id_seq;

-- 2. Sequences por categoria, inicializadas do maior numero existente do prefixo
CREATE SEQUENCE IF NOT EXISTS public.aptidao_ref_forca_seq;
SELECT setval('public.aptidao_ref_forca_seq',
  (SELECT coalesce(max((substring(id from '^f-([0-9]+)$')::int)), 0) + 1
     FROM public.aptidao_referenciais), false);

CREATE SEQUENCE IF NOT EXISTS public.aptidao_ref_impulsao_seq;
SELECT setval('public.aptidao_ref_impulsao_seq',
  (SELECT coalesce(max((substring(id from '^i-([0-9]+)$')::int)), 0) + 1
     FROM public.aptidao_referenciais), false);

CREATE SEQUENCE IF NOT EXISTS public.aptidao_ref_abdomen_seq;
SELECT setval('public.aptidao_ref_abdomen_seq',
  (SELECT coalesce(max((substring(id from '^a-([0-9]+)$')::int)), 0) + 1
     FROM public.aptidao_referenciais), false);

CREATE SEQUENCE IF NOT EXISTS public.aptidao_ref_agilidade_seq;
SELECT setval('public.aptidao_ref_agilidade_seq',
  (SELECT coalesce(max((substring(id from '^ag-([0-9]+)$')::int)), 0) + 1
     FROM public.aptidao_referenciais), false);

CREATE SEQUENCE IF NOT EXISTS public.aptidao_ref_velocidade_seq;
SELECT setval('public.aptidao_ref_velocidade_seq',
  (SELECT coalesce(max((substring(id from '^v-([0-9]+)$')::int)), 0) + 1
     FROM public.aptidao_referenciais), false);

-- 3. RPC por categoria
CREATE OR REPLACE FUNCTION public.next_aptidao_ref_id(p_category text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prefix text;
  v_seq    text;
BEGIN
  CASE p_category
    WHEN 'forca'      THEN v_prefix := 'f';  v_seq := 'public.aptidao_ref_forca_seq';
    WHEN 'impulsao'   THEN v_prefix := 'i';  v_seq := 'public.aptidao_ref_impulsao_seq';
    WHEN 'abdomen'    THEN v_prefix := 'a';  v_seq := 'public.aptidao_ref_abdomen_seq';
    WHEN 'agilidade'  THEN v_prefix := 'ag'; v_seq := 'public.aptidao_ref_agilidade_seq';
    WHEN 'velocidade' THEN v_prefix := 'v';  v_seq := 'public.aptidao_ref_velocidade_seq';
    ELSE RAISE EXCEPTION 'Categoria de aptidao invalida: %', p_category;
  END CASE;

  RETURN v_prefix || '-' || nextval(v_seq::regclass)::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_aptidao_ref_id(text) TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO:
--   SELECT next_aptidao_ref_id('forca');      -- esperado f-11 (se f-1..f-10 existem)
--   SELECT next_aptidao_ref_id('velocidade'); -- v-<max+1>
-- =============================================================================
