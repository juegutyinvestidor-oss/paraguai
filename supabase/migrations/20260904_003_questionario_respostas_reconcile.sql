-- =============================================================================
-- MIGRACAO: Reconciliar schema de questionarios_respostas (sem perder dados)
-- Data: 2026-09-04
-- Descricao: O schema canônico divergia: o app/ConfiguracoesView usam
--            (template_id, template_title, answered_at, answered_by) enquanto
--            o route.ts antigo usava (grade, questionnaire_type, date).
--            Este script torna qualquer banco (schema antigo, novo ou parcial)
--            compativel com o app SEM descartar dados:
--              1. adiciona as colunas novas que faltarem (nullable);
--              2. faz backfill das colunas antigas -> novas;
--              3. garante NOT NULL nas colunas novas;
--              4. remove o NOT NULL das colunas antigas (para o app inserir
--                 sem preenche-las), mas NAO as dropa (historico preservado).
--            Idempotente: se o banco ja esta no schema novo, e praticamente
--            no-op. Se a tabela ainda nao existe, pula (sera criada no schema
--            novo pelo reset).
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

DO $$
DECLARE
  v_table      boolean;
  v_qtype      boolean;   -- questionnaire_type (antiga)
  v_date       boolean;   -- date (antiga)
  v_grade      boolean;   -- grade (antiga)
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'questionarios_respostas'
  ) INTO v_table;

  IF NOT v_table THEN
    RAISE NOTICE 'questionarios_respostas nao existe ainda; nada a reconciliar.';
    RETURN;
  END IF;

  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='questionarios_respostas' AND column_name='questionnaire_type') INTO v_qtype;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='questionarios_respostas' AND column_name='date') INTO v_date;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='questionarios_respostas' AND column_name='grade') INTO v_grade;

  -- 1. Colunas novas (nullable por enquanto)
  ALTER TABLE public.questionarios_respostas
    ADD COLUMN IF NOT EXISTS template_id    text,
    ADD COLUMN IF NOT EXISTS template_title text,
    ADD COLUMN IF NOT EXISTS answered_at    text,
    ADD COLUMN IF NOT EXISTS answered_by    text;

  -- 2. Backfill das antigas -> novas (so onde a nova estiver vazia)
  IF v_qtype THEN
    UPDATE public.questionarios_respostas
       SET template_id    = questionnaire_type WHERE template_id    IS NULL;
    UPDATE public.questionarios_respostas
       SET template_title = questionnaire_type WHERE template_title IS NULL;
  END IF;
  IF v_date THEN
    UPDATE public.questionarios_respostas
       SET answered_at = date WHERE answered_at IS NULL;
  END IF;

  -- 3. Preenche o que restou nulo e aplica NOT NULL nas colunas novas
  UPDATE public.questionarios_respostas SET template_id    = ''          WHERE template_id    IS NULL;
  UPDATE public.questionarios_respostas SET template_title = ''          WHERE template_title IS NULL;
  UPDATE public.questionarios_respostas SET answered_at    = ''          WHERE answered_at    IS NULL;
  UPDATE public.questionarios_respostas SET answered_by    = 'migrado'   WHERE answered_by    IS NULL;

  ALTER TABLE public.questionarios_respostas ALTER COLUMN template_id    SET NOT NULL;
  ALTER TABLE public.questionarios_respostas ALTER COLUMN template_title SET NOT NULL;
  ALTER TABLE public.questionarios_respostas ALTER COLUMN answered_at    SET NOT NULL;
  ALTER TABLE public.questionarios_respostas ALTER COLUMN answered_by    SET NOT NULL;

  -- 4. Colunas antigas: deixa nullable (app nao as preenche), mas mantem dados
  IF v_qtype THEN
    ALTER TABLE public.questionarios_respostas ALTER COLUMN questionnaire_type DROP NOT NULL;
  END IF;
  IF v_date THEN
    ALTER TABLE public.questionarios_respostas ALTER COLUMN "date" DROP NOT NULL;
  END IF;
  IF v_grade THEN
    ALTER TABLE public.questionarios_respostas ALTER COLUMN grade DROP NOT NULL;
  END IF;

  RAISE NOTICE 'Reconciliacao de questionarios_respostas concluida (colunas antigas preservadas como nullable).';
END $$;

-- =============================================================================
-- OPCIONAL (depois de confirmar que nada depende das colunas antigas):
--   ALTER TABLE public.questionarios_respostas
--     DROP COLUMN IF EXISTS grade,
--     DROP COLUMN IF EXISTS questionnaire_type,
--     DROP COLUMN IF EXISTS date;
-- =============================================================================

-- VERIFICACAO:
--   SELECT column_name, is_nullable FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='questionarios_respostas'
--   ORDER BY ordinal_position;
