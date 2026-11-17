-- =============================================================================
-- MIGRACAO: LGPD - Alinhar RLS ao modelo real de autenticacao do Edukyne
-- Data: 2026-09-04
-- Descricao: As migracoes 20260902_001..004 assumiram Supabase Auth
--            (auth.role() = 'authenticated'), mas o app usa anon key + login
--            custom (validate_login_secure) e NUNCA chama supabase.auth.*.
--            Logo auth.role() e sempre 'anon', o que quebrava silenciosamente:
--              - m3_cenarios / m3_impactos  -> SELECT vazio + backfill negado
--              - data_access_logs           -> trilha de auditoria nao gravava
--              - consent_records            -> consentimento nao gravava
--              - login_attempts             -> rate limiting nunca bloqueava
--              - bucket avatars             -> upload de foto falhava
--            Esta migracao libera 'anon' nessas tabelas (modelo de seguranca
--            passa a ser anon key + RBAC client-side, coerente com o resto do
--            schema publico em app/api/migration-schema/route.ts).
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. M3 - dados de configuracao (nao sao dados pessoais): liberar anon
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated select m3_cenarios" ON public.m3_cenarios;
DROP POLICY IF EXISTS "Authenticated insert m3_cenarios" ON public.m3_cenarios;
DROP POLICY IF EXISTS "Authenticated update m3_cenarios" ON public.m3_cenarios;
DROP POLICY IF EXISTS "Authenticated delete m3_cenarios" ON public.m3_cenarios;

DROP POLICY IF EXISTS "Allow anon+auth select m3_cenarios" ON public.m3_cenarios;
CREATE POLICY "Allow anon+auth select m3_cenarios" ON public.m3_cenarios
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anon+auth insert m3_cenarios" ON public.m3_cenarios;
CREATE POLICY "Allow anon+auth insert m3_cenarios" ON public.m3_cenarios
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon+auth update m3_cenarios" ON public.m3_cenarios;
CREATE POLICY "Allow anon+auth update m3_cenarios" ON public.m3_cenarios
  FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon+auth delete m3_cenarios" ON public.m3_cenarios;
CREATE POLICY "Allow anon+auth delete m3_cenarios" ON public.m3_cenarios
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Authenticated select m3_impactos" ON public.m3_impactos;
DROP POLICY IF EXISTS "Authenticated insert m3_impactos" ON public.m3_impactos;
DROP POLICY IF EXISTS "Authenticated update m3_impactos" ON public.m3_impactos;
DROP POLICY IF EXISTS "Authenticated delete m3_impactos" ON public.m3_impactos;

DROP POLICY IF EXISTS "Allow anon+auth select m3_impactos" ON public.m3_impactos;
CREATE POLICY "Allow anon+auth select m3_impactos" ON public.m3_impactos
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anon+auth insert m3_impactos" ON public.m3_impactos;
CREATE POLICY "Allow anon+auth insert m3_impactos" ON public.m3_impactos
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon+auth update m3_impactos" ON public.m3_impactos;
CREATE POLICY "Allow anon+auth update m3_impactos" ON public.m3_impactos
  FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon+auth delete m3_impactos" ON public.m3_impactos;
CREATE POLICY "Allow anon+auth delete m3_impactos" ON public.m3_impactos
  FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- 2. consent_records - app grava via RPC SECURITY INVOKER como anon
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated manage own consent" ON public.consent_records;
DROP POLICY IF EXISTS "Allow anon+auth manage consent" ON public.consent_records;
CREATE POLICY "Allow anon+auth manage consent" ON public.consent_records
  FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3. data_access_logs - trilha de auditoria precisa gravar/ler como anon
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated insert logs" ON public.data_access_logs;
DROP POLICY IF EXISTS "Admin read logs" ON public.data_access_logs;
DROP POLICY IF EXISTS "Allow anon+auth insert logs" ON public.data_access_logs;
DROP POLICY IF EXISTS "Allow anon+auth read logs" ON public.data_access_logs;
CREATE POLICY "Allow anon+auth insert logs" ON public.data_access_logs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon+auth read logs" ON public.data_access_logs
  FOR SELECT USING (true);

-- -----------------------------------------------------------------------------
-- 4. login_attempts - validate_login_secure roda SECURITY DEFINER (item 6),
--    mas mantemos leitura liberada para o contador de rate limiting funcionar
--    mesmo em chamadas diretas.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anon select login_attempts" ON public.login_attempts;
CREATE POLICY "Anon select login_attempts" ON public.login_attempts
  FOR SELECT USING (true);

-- -----------------------------------------------------------------------------
-- 5. bucket avatars - upload/leitura/exclusao via anon key
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Avatares: leitura restrita por tipo" ON storage.objects;
DROP POLICY IF EXISTS "Avatares: leitura anon" ON storage.objects;
CREATE POLICY "Avatares: leitura anon" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatares: upload autenticado" ON storage.objects;
DROP POLICY IF EXISTS "Avatares: upload anon" ON storage.objects;
CREATE POLICY "Avatares: upload anon" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatares: update autenticado" ON storage.objects;
DROP POLICY IF EXISTS "Avatares: update anon" ON storage.objects;
CREATE POLICY "Avatares: update anon" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatares: delete autenticado" ON storage.objects;
DROP POLICY IF EXISTS "Avatares: delete anon" ON storage.objects;
CREATE POLICY "Avatares: delete anon" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars');

-- -----------------------------------------------------------------------------
-- 6. register_consent - redefinir para casar com o contrato do app
--    (subject_role, subject_identifier, consent_purposes[], registered_by).
--    A assinatura antiga (p_user_type, p_user_id, p_consent_type, p_granted)
--    nao batia com a chamada em lib/auditLog.ts. Tambem remove os CHECK que
--    barravam os valores semanticos usados pelo sistema.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS register_consent(text, text, text, boolean, text, text, jsonb);

ALTER TABLE public.consent_records
  DROP CONSTRAINT IF EXISTS consent_records_user_type_check;
ALTER TABLE public.consent_records
  DROP CONSTRAINT IF EXISTS consent_records_consent_type_check;

CREATE OR REPLACE FUNCTION register_consent(
  subject_role       text,
  subject_identifier text,
  consent_purposes   text[],
  registered_by      text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
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

-- -----------------------------------------------------------------------------
-- 7. validate_login_secure - SECURITY DEFINER para o contador de tentativas
--    enxergar login_attempts alem do RLS (rate limiting passa a funcionar).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_login_secure(
  email_input text,
  password_input text
)
RETURNS TABLE (id text, name text, email text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_temp
AS $$
DECLARE
  result record;
  attempt_count integer;
BEGIN
  SELECT count(*) INTO attempt_count
  FROM public.login_attempts
  WHERE lower(email) = lower(email_input)
    AND success = false
    AND attempted_at > now() - interval '15 minutes';

  IF attempt_count >= 5 THEN
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(email_input), false);
    RAISE EXCEPTION 'Conta temporariamente bloqueada devido a múltiplas tentativas. Tente novamente em 15 minutos.';
  END IF;

  SELECT p.id, p.name, p.email, p.role INTO result
  FROM professionals p
  WHERE lower(p.email) = lower(email_input)
    AND p.password_hash IS NOT NULL
    AND p.password_hash = crypt(password_input, p.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success) VALUES (lower(email_input), true);
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
    RETURN;
  END IF;

  SELECT s.id, s.name, s.email, 'Aluno'::text INTO result
  FROM students s
  WHERE lower(s.email) = lower(email_input)
    AND s.password_hash IS NOT NULL
    AND s.password_hash = crypt(password_input, s.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success) VALUES (lower(email_input), true);
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
    RETURN;
  END IF;

  SELECT pr.id, pr.name, pr.email, pr.role INTO result
  FROM profiles pr
  WHERE lower(pr.email) = lower(email_input)
    AND pr.password_hash IS NOT NULL
    AND pr.password_hash = crypt(password_input, pr.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success) VALUES (lower(email_input), true);
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
  ELSE
    INSERT INTO public.login_attempts (email, success) VALUES (lower(email_input), false);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_login_secure(text, text) TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO:
--   SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE tablename IN ('m3_cenarios','m3_impactos','consent_records',
--                       'data_access_logs','login_attempts')
--   ORDER BY tablename, cmd;
--
--   SELECT register_consent('responsavel_legal','12345678900',
--          ARRAY['treatment:dados_pessoais','treatment:dados_saude'],'admin1');
--   SELECT count(*) FROM data_access_logs;  -- deve aumentar
-- =============================================================================
