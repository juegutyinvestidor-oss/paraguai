-- =============================================================================
-- MIGRACAO: Corrigir mojibake no Modulo 5 (m5_capacidades_config)
-- Data: 2026-09-04
-- Descricao: Mesma correcao da 20260904_008, agora para o M5. Reverte UTF-8
--            lido como Latin-1 celula a celula, sem tocar em texto limpo.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fix_mojibake(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF t IS NULL OR t = '' THEN RETURN t; END IF;
  IF t !~ '[ÂÃâ]' THEN RETURN t; END IF;
  RETURN convert_from(convert_to(t, 'LATIN1'), 'UTF8');
EXCEPTION WHEN OTHERS THEN
  RETURN t;
END;
$$;

UPDATE public.m5_capacidades_config
   SET level          = fix_mojibake(level),
       health_status  = fix_mojibake(health_status),
       to_improve     = fix_mojibake(to_improve),
       recommendation = fix_mojibake(recommendation);

DROP FUNCTION IF EXISTS public.fix_mojibake(text);

-- VERIFICACAO:
--   SELECT level, health_status, recommendation FROM public.m5_capacidades_config LIMIT 5;
