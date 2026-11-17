-- =============================================================================
-- MIGRACAO: Re-sincronizar voc_questions_id_seq (fix do colidido 'q1')
-- Data: 2026-09-04
-- Descricao: A 20260904_006 rodava o setval ANTES do seed (tabela vazia -> seq
--            ficou em 1). Assim next_voc_question_id() devolvia 'q1' e colidia
--            com o seed 'q1' (upsert sobrescrevia; client ficava com chave
--            duplicada). A 006 ja foi corrigida; esta 012 ressincroniza a
--            sequence nos bancos onde a 006 antiga foi aplicada.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

SELECT setval(
  'public.voc_questions_id_seq',
  (SELECT coalesce(max((substring(id from '^q([0-9]+)$')::int)), 0) + 1
     FROM public.voc_questions),
  false
);

-- VERIFICACAO:
--   SELECT next_voc_question_id();  -- deve ser 'q13' (com q1..q12 no banco), NAO 'q1'
-- =============================================================================
