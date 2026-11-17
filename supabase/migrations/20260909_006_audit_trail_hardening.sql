-- =============================================================================
-- MIGRACAO: LGPD - Trilha de auditoria confiavel
-- Data: 2026-09-09
-- Descricao: 1) data_access_logs perde TODAS as policies anon: leitura e
--            escrita passam a existir apenas via service_role (rota /api/audit
--            e rotas internas). Antes qualquer portador da anon key podia
--            FORJAR entradas na auditoria - agora a identidade vem da sessao
--            validada e IP/user-agent do request real.
--            -> Para visualizar a trilha, use o SQL Editor:
--               SELECT * FROM data_access_logs ORDER BY accessed_at DESC;
--            2) register_consent vira SECURITY DEFINER: ela insere em
--               consent_records e data_access_logs e era SECURITY INVOKER
--               (executava como anon) - sem isso quebraria com o lock acima.
--            consent_records mantem as policies atuais (nao alterado).
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- 1. Fechar data_access_logs para anon/authenticated
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'data_access_logs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.data_access_logs', r.policyname);
  END LOOP;
END $$;

-- 2. register_consent: SECURITY DEFINER (mesmo comportamento de antes,
--    agora capaz de gravar nas tabelas fechadas para anon)
CREATE OR REPLACE FUNCTION register_consent(
  subject_role       text,
  subject_identifier text,
  consent_purposes   text[],
  registered_by      text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_temp
AS $$
DECLARE
  p text;
BEGIN
  FOREACH p IN ARRAY coalesce(consent_purposes, '{}'::text[]) LOOP
    UPDATE public.consent_records
      SET revoked_at = now()
      WHERE user_id = subject_identifier
        AND user_type = subject_role
        AND consent_type = p
        AND revoked_at IS NULL;

    INSERT INTO public.consent_records
      (user_type, user_id, consent_type, granted, details)
    VALUES
      (subject_role, subject_identifier, p, true,
       jsonb_build_object('registered_by', registered_by));
  END LOOP;

  INSERT INTO public.data_access_logs
    (user_id, user_role, action, target_table, target_id, details)
  VALUES
    (registered_by, subject_role, 'consent', 'consent_records', subject_identifier,
     jsonb_build_object('purposes', consent_purposes));

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION register_consent(text, text, text[], text) TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO:
--   SELECT policyname FROM pg_policies WHERE tablename='data_access_logs';
--   -- vazio (service_role bypassa RLS)
--
--   SELECT provolatile, prosecdef FROM pg_proc WHERE proname='register_consent';
--   -- prosecdef = true
-- =============================================================================
