-- =============================================================================
-- MIGRACAO: Alinhamento da Avaliacao PCD (Modulo 15) ao protocolo
-- Data: 2026-10-06
-- Descricao:
--   1) Atualiza as adaptacoes condicionais conforme o documento do protocolo
--      (Passo 3 - Quadro-Resumo):
--        - Grupo 2 (cadeira de rodas) / salto: "Nao aplicavel" -> condicional
--          (padrao quando seguro; alternativa quando inviavel).
--        - Grupo 3 (PC) GMFCS III / salto: "Nao aplicavel" -> condicional.
--        - Grupo 3 (PC) GMFCS IV-V / flexao: "Nao aplicavel" -> padrao/adaptado
--          quando houver capacidade funcional dos membros superiores.
--   2) Adiciona as colunas 'funil' e 'adaptacoes_aplicadas' (jsonb) em
--      pcd_assessments, para registrar o funil qualitativo aplicado e as
--      adaptacoes/substituicoes usadas na avaliacao (Etapas C e E).
-- Idempotente: pode ser reexecutada com seguranca.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Adaptacoes condicionais (sobrescreve as seeds fixas anteriores)
-- -----------------------------------------------------------------------------
UPDATE public.m15_pcd_adaptacoes
   SET status = 'Adaptado',
       instrucao = 'Realizar padrão quando houver capacidade funcional e segurança. Não realizar quando o comprometimento dos membros inferiores tornar o salto inseguro ou inviável; nesse caso, considerar teste alternativo de potência dos membros inferiores, quando aplicável.'
 WHERE id = 'pa_g2_sal';

UPDATE public.m15_pcd_adaptacoes
   SET status = 'Adaptado',
       instrucao = 'Realizar somente quando houver capacidade funcional e segurança. Quando não for viável, considerar teste alternativo de potência dos membros inferiores.'
 WHERE id = 'pa_g3_sal_b';

UPDATE public.m15_pcd_adaptacoes
   SET status = 'Adaptado',
       instrucao = 'Padrão ou adaptado quando houver capacidade funcional dos membros superiores; caso contrário, priorizar avaliação funcional clínica com fisioterapia.'
 WHERE id = 'pa_g3_fle_c';

-- -----------------------------------------------------------------------------
-- 2) Registro do funil qualitativo e das adaptacoes aplicadas por avaliacao
-- -----------------------------------------------------------------------------
ALTER TABLE public.pcd_assessments
  ADD COLUMN IF NOT EXISTS funil jsonb;

ALTER TABLE public.pcd_assessments
  ADD COLUMN IF NOT EXISTS adaptacoes_aplicadas jsonb;

-- =============================================================================
-- VERIFICACAO:
--   SELECT id, status, instrucao FROM public.m15_pcd_adaptacoes
--    WHERE id IN ('pa_g2_sal','pa_g3_sal_b','pa_g3_fle_c');
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'pcd_assessments' AND column_name IN ('funil','adaptacoes_aplicadas');
-- =============================================================================