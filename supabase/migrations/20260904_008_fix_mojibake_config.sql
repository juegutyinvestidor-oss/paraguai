-- =============================================================================
-- MIGRACAO: Corrigir mojibake (UTF-8 lido como Latin-1) nos textos de config
-- Data: 2026-09-04
-- Descricao: As tabelas de configuracao dos Modulos 4/6/7 (e afins) gravaram
--            texto com acentos duplos ("GINASTICA", "Negocios" => na real
--            "GINASTICA" com acentos quebrados). Esta migracao reverte a
--            dupla-codificacao celula a celula, SEM tocar em texto ja limpo.
--            fix_mojibake(): so tenta reverter quando ha marcador de mojibake
--            (Ã/Â/á/etc. vindos de UTF-8-as-Latin1) e, se a conversao falhar
--            (ex.: emoji), devolve o original intacto.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fix_mojibake(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF t IS NULL OR t = '' THEN RETURN t; END IF;
  -- So processa quando aparenta estar duplo-codificado
  IF t !~ '[ÂÃâ]' THEN RETURN t; END IF;
  RETURN convert_from(convert_to(t, 'LATIN1'), 'UTF8');
EXCEPTION WHEN OTHERS THEN
  RETURN t; -- emoji / nao-codificavel: mantem original
END;
$$;

-- Modulo 4 - IMC
UPDATE public.m4_imc_config
   SET classification = fix_mojibake(classification),
       status         = fix_mojibake(status),
       description    = fix_mojibake(description);

-- Modulo 6 - Direcionamento por modalidade
UPDATE public.m6_modalidades_direcionamento
   SET name      = fix_mojibake(name),
       valencias = fix_mojibake(valencias),
       condition = fix_mojibake(condition),
       report    = fix_mojibake(report);

-- Modulo 6 - Diretrizes de intervencao
UPDATE public.m6_diretrizes_intervencao
   SET diretriz = fix_mojibake(diretriz),
       criterio = fix_mojibake(criterio),
       conduta  = fix_mojibake(conduta),
       objetivo = fix_mojibake(objetivo);

-- Modulo 7 - Perfis e pareceres
UPDATE public.m7_perfis_pareceres
   SET profile    = fix_mojibake(profile),
       component  = fix_mojibake(component),
       basic_data = fix_mojibake(basic_data),
       reflection = fix_mojibake(reflection);

-- (bônus) Modulo 1 e 3 e 2 e Voc - mesmas tabelas podem ter o mesmo problema
UPDATE public.aptidao_referenciais
   SET insuficiente = fix_mojibake(insuficiente),
       regular      = fix_mojibake(regular),
       bom          = fix_mojibake(bom),
       excelente    = fix_mojibake(excelente);

UPDATE public.m3_cenarios
   SET cenario   = fix_mojibake(cenario),
       condicao  = fix_mojibake(condicao),
       frequencia= fix_mojibake(frequencia),
       mensagem  = fix_mojibake(mensagem);

UPDATE public.m3_impactos
   SET tipo      = fix_mojibake(tipo),
       indicador = fix_mojibake(indicador),
       descricao = fix_mojibake(descricao);

-- Limpa a funcao auxiliar
DROP FUNCTION IF EXISTS public.fix_mojibake(text);

-- =============================================================================
-- VERIFICACAO:
--   SELECT name, valencias FROM public.m6_modalidades_direcionamento LIMIT 3;
--   SELECT profile, component FROM public.m7_perfis_pareceres LIMIT 3;
-- =============================================================================
