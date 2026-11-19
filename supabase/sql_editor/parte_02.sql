-- ==== 20260902_007_lgpd_fix_get_cpf.sql ====
-- =============================================================================
-- MIGRACAO: LGPD - Correcao do get_cpf_decrypted (decrypt inline)
-- Data: 2026-09-02
-- Descricao: O get_cpf_decrypted original chamava decrypt_cpf() de dentro de
--            outra funcao SECURITY DEFINER, o que retornava NULL silenciosamente.
--            Esta versao faz o pgp_sym_decrypt INLINE, sem indirecao, para que
--            o CPF descriptografado seja retornado corretamente ao frontend.
-- LGPD: Art. 46 - Seguranca de dados sensiveis.
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

CREATE OR REPLACE FUNCTION get_cpf_decrypted(
  target_table text,
  target_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text := 'edukyne_lgpd_2026_secure_key_32b';
  result_cpf bytea;
  decrypted text;
BEGIN
  IF target_table = 'students' THEN
    SELECT cpf_encrypted INTO result_cpf
    FROM students WHERE id = target_id;
  ELSIF target_table = 'professionals' THEN
    SELECT cpf_encrypted INTO result_cpf
    FROM professionals WHERE id = target_id;
  ELSE
    RETURN NULL;
  END IF;

  IF result_cpf IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    decrypted := pgp_sym_decrypt(result_cpf, encryption_key);
    RETURN decrypted;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- =============================================================================
-- VERIFICACAO (rode no SQL Editor, depois de executar o CREATE acima):
-- SELECT id, name, get_cpf_decrypted('students', id)
--   FROM students WHERE cpf_encrypted IS NOT NULL LIMIT 5;
--
-- SELECT id, name, get_cpf_decrypted('professionals', id)
--   FROM professionals WHERE cpf_encrypted IS NOT NULL LIMIT 5;
-- =============================================================================


-- ==== 20260902_008_lgpd_fix_get_cpf_v3.sql ====
-- =============================================================================
-- MIGRACAO: LGPD - CORRECAO DEFINITIVA do get_cpf_decrypted (v3)
-- Data: 2026-09-02
-- Descricao: decrypt_cpf retorna corretamente, mas get_cpf_decrypted retornava
--            NULL. A causa mais provavel e a comparacao de id e/ou o
--            SET search_path. Esta versao:
--              1. Remove SET search_path
--              2. Usa cast ::text na comparacao do id
--              3. Eleva erro se nao encontrar a linha (para revelar o motivo)
-- LGPD: Art. 46 - Seguranca de dados sensiveis.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

DROP FUNCTION IF EXISTS get_cpf_decrypted(text, text);

CREATE OR REPLACE FUNCTION get_cpf_decrypted(
  target_table text,
  target_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key text := 'edukyne_lgpd_2026_secure_key_32b';
  result_cpf bytea;
BEGIN
  IF target_table = 'students' THEN
    SELECT s.cpf_encrypted INTO result_cpf
    FROM students s
    WHERE s.id::text = target_id;
  ELSIF target_table = 'professionals' THEN
    SELECT p.cpf_encrypted INTO result_cpf
    FROM professionals p
    WHERE p.id::text = target_id;
  ELSE
    RAISE EXCEPTION 'tabela invalida: %', target_table;
  END IF;

  IF result_cpf IS NULL THEN
    RAISE EXCEPTION 'cpf_encrypted NAO encontrado para % no %', target_id, target_table;
  END IF;

  BEGIN
    RETURN pgp_sym_decrypt(result_cpf, encryption_key);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'falha ao descriptografar: %', SQLERRM;
  END;
END;
$$;

-- Habilitar execucao para anon/authenticated (se aplicavel)
GRANT EXECUTE ON FUNCTION get_cpf_decrypted(text, text) TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO (rode apos executar o CREATE):
-- SELECT 'getcpf: ' || COALESCE(get_cpf_decrypted('students','A2'),'NULL') AS t;
-- =============================================================================


-- ==== 20260902_009_lgpd_vault_key.sql ====
-- =============================================================================
-- MIGRACAO: LGPD - Armazenar chave de criptografia no Supabase Vault
-- Data: 2026-09-02
-- Descricao: Move a chave fixa de criptografia do CPF (como texto no corpo das
--            funcoes) para o Supabase Vault (criptografado no banco), seguindo
--            a recomendacao LGPD Art. 46 (seguranca) e boas praticas.
--
--            Apos executar, as funcoes encrypt_cpf / decrypt_cpf /
--            trg_encrypt_cpf / get_cpf_decrypted passam a LER a chave do Vault
--            em vez de usar a constante no codigo.
--
-- ATENCAO: Rode este SQL no Supabase SQL Editor (Dashboard > SQL Editor).
--          Execute APOS a extensao supabase_vault estiver habilitada
--          (normalmente ja vem habilitada em projetos novos).
-- =============================================================================

-- 1. Habilitar o schema Vault (se ainda nao existir)
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- 2. Guardar a chave no Vault (idempotente: nao duplica se ja existir)
--    A chave atual das migracoes 005-008:
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'edukyne_lgpd_cpf_key') THEN
    PERFORM vault.create_secret(
      'edukyne_lgpd_2026_secure_key_32b',
      'edukyne_lgpd_cpf_key',
      'Chave LGPD para criptografia de CPF (Art. 46)'
    );
  END IF;
END $$;

-- =============================================================================
-- 3. Re-escrever as funcoes para LER a chave do Vault
-- =============================================================================

-- decrypt_cpf
CREATE OR REPLACE FUNCTION decrypt_cpf(encrypted_cpf bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  encryption_key text;
BEGIN
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'edukyne_lgpd_cpf_key'
  LIMIT 1;

  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Chave edukyne_lgpd_cpf_key nao encontrada no Vault';
  END IF;

  IF encrypted_cpf IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN pgp_sym_decrypt(encrypted_cpf, encryption_key);
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- encrypt_cpf
CREATE OR REPLACE FUNCTION encrypt_cpf(input_cpf text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  encryption_key text;
BEGIN
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'edukyne_lgpd_cpf_key'
  LIMIT 1;

  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Chave edukyne_lgpd_cpf_key nao encontrada no Vault';
  END IF;

  IF input_cpf IS NULL OR input_cpf = '' THEN
    RETURN NULL;
  END IF;

  RETURN pgp_sym_encrypt(input_cpf, encryption_key);
END;
$$;

-- get_cpf_decrypted (le a chave do Vault)
CREATE OR REPLACE FUNCTION get_cpf_decrypted(
  target_table text,
  target_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  encryption_key text;
  result_cpf bytea;
BEGIN
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'edukyne_lgpd_cpf_key'
  LIMIT 1;

  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Chave edukyne_lgpd_cpf_key nao encontrada no Vault';
  END IF;

  IF target_table = 'students' THEN
    SELECT cpf_encrypted INTO result_cpf FROM students WHERE id::text = target_id;
  ELSIF target_table = 'professionals' THEN
    SELECT cpf_encrypted INTO result_cpf FROM professionals WHERE id::text = target_id;
  ELSE
    RETURN NULL;
  END IF;

  IF result_cpf IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN pgp_sym_decrypt(result_cpf, encryption_key);
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- trigger (le a chave do Vault)
CREATE OR REPLACE FUNCTION trg_encrypt_cpf()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  encryption_key text;
BEGIN
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'edukyne_lgpd_cpf_key'
  LIMIT 1;

  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Chave edukyne_lgpd_cpf_key nao encontrada no Vault';
  END IF;

  IF NEW.cpf IS NOT NULL AND NEW.cpf <> '' THEN
    NEW.cpf_encrypted := pgp_sym_encrypt(NEW.cpf, encryption_key);
  ELSIF NEW.cpf IS NULL OR NEW.cpf = '' THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.cpf_encrypted := OLD.cpf_encrypted;
    END IF;
  END IF;

  NEW.cpf := NULL;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- VERIFICACAO (rode apos executar):
-- SELECT 'chave_ok=' || (SELECT COUNT(*) FROM vault.decrypted_secrets WHERE name='edukyne_lgpd_cpf_key') AS v;
-- SELECT 'getcpf: ' || COALESCE(get_cpf_decrypted('students','A2'),'NULL') AS t;
-- SELECT 'decrypt: ' || COALESCE(decrypt_cpf(cpf_encrypted),'NULL') AS t FROM students WHERE id='A2';
-- =============================================================================

-- Garantir que as funcoes SECURITY DEFINER possam ser executadas
GRANT EXECUTE ON FUNCTION decrypt_cpf(bytea) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION encrypt_cpf(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_cpf_decrypted(text, text) TO anon, authenticated, service_role;



-- ==== 20260902_010_lgpd_fix_get_cpf_v4.sql ====
-- =============================================================================
-- MIGRACAO: LGPD - RECRIAR get_cpf_decrypted (v4) - leitura da chave robusta
-- Data: 2026-09-02
-- Descricao: Testes confirmaram que o vault decrypted_secrets e a chave estao
--            corretos e que pgp_sym_decrypt funciona FORA da funcao. Dentro da
--            funcao get_cpf_decrypted (009) retornava NULL. Esta versao usa a
--            chave diretamente via subquery no pgp_sym_decrypt (mesmo padrao
--            do teste que funcionou), eliminando a variavel intermediaria.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

DROP FUNCTION IF EXISTS get_cpf_decrypted(text, text);

CREATE OR REPLACE FUNCTION get_cpf_decrypted(
  target_table text,
  target_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  result_cpf bytea;
  decrypted text;
BEGIN
  IF target_table = 'students' THEN
    SELECT cpf_encrypted INTO result_cpf
    FROM students WHERE id::text = target_id;
  ELSIF target_table = 'professionals' THEN
    SELECT cpf_encrypted INTO result_cpf
    FROM professionals WHERE id::text = target_id;
  ELSE
    RETURN NULL;
  END IF;

  IF result_cpf IS NULL THEN
    RETURN NULL;
  END IF;

  -- Chave lida direto do Vault (mesmo padrao do teste que funcionou)
  BEGIN
    SELECT pgp_sym_decrypt(
             result_cpf,
             (SELECT decrypted_secret::text
              FROM vault.decrypted_secrets
              WHERE name = 'edukyne_lgpd_cpf_key' LIMIT 1)
           ) INTO decrypted;
    RETURN decrypted;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'get_cpf_decrypted erro ao descriptografar: %', SQLERRM;
    RETURN NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION get_cpf_decrypted(text, text) TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO:
-- SELECT 'getcpf: ' || COALESCE(get_cpf_decrypted('students','A2'),'NULL') AS t;
-- =============================================================================


-- ==== 20260902_011_lgpd_fix_search_path.sql ====
-- =============================================================================
-- MIGRACAO: LGPD - CORRECAO FINAL search_path para pgcrypto (v5)
-- Data: 2026-09-02
-- Descricao: O pgp_sym_decrypt/encrypt vivem no schema "extensions" (nao em
--            "public"). As funcoes usavam search_path = public, vault e por
--            isso nao encontravam a funcao pgp_sym_decrypt -> "does not exist".
--            Esta versao adiciona "extensions" ao search_path de todas as
--            funcoes que usam pgcrypto.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- decrypt_cpf
CREATE OR REPLACE FUNCTION decrypt_cpf(encrypted_cpf bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, vault
AS $$
DECLARE
  encryption_key text;
BEGIN
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'edukyne_lgpd_cpf_key'
  LIMIT 1;

  IF encryption_key IS NULL THEN
    RETURN NULL;
  END IF;

  IF encrypted_cpf IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN pgp_sym_decrypt(encrypted_cpf, encryption_key);
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- encrypt_cpf
CREATE OR REPLACE FUNCTION encrypt_cpf(input_cpf text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, vault
AS $$
DECLARE
  encryption_key text;
BEGIN
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'edukyne_lgpd_cpf_key'
  LIMIT 1;

  IF encryption_key IS NULL THEN
    RETURN NULL;
  END IF;

  IF input_cpf IS NULL OR input_cpf = '' THEN
    RETURN NULL;
  END IF;

  RETURN pgp_sym_encrypt(input_cpf, encryption_key);
END;
$$;

-- get_cpf_decrypted
CREATE OR REPLACE FUNCTION get_cpf_decrypted(
  target_table text,
  target_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, vault
AS $$
DECLARE
  encryption_key text;
  result_cpf bytea;
BEGIN
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'edukyne_lgpd_cpf_key'
  LIMIT 1;

  IF encryption_key IS NULL THEN
    RETURN NULL;
  END IF;

  IF target_table = 'students' THEN
    SELECT cpf_encrypted INTO result_cpf
    FROM students WHERE id::text = target_id;
  ELSIF target_table = 'professionals' THEN
    SELECT cpf_encrypted INTO result_cpf
    FROM professionals WHERE id::text = target_id;
  ELSE
    RETURN NULL;
  END IF;

  IF result_cpf IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN pgp_sym_decrypt(result_cpf, encryption_key);
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- trg_encrypt_cpf (trigger)
CREATE OR REPLACE FUNCTION trg_encrypt_cpf()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, vault
AS $$
DECLARE
  encryption_key text;
BEGIN
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'edukyne_lgpd_cpf_key'
  LIMIT 1;

  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Chave edukyne_lgpd_cpf_key nao encontrada no Vault';
  END IF;

  IF NEW.cpf IS NOT NULL AND NEW.cpf <> '' THEN
    NEW.cpf_encrypted := pgp_sym_encrypt(NEW.cpf, encryption_key);
  ELSIF NEW.cpf IS NULL OR NEW.cpf = '' THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.cpf_encrypted := OLD.cpf_encrypted;
    END IF;
  END IF;

  NEW.cpf := NULL;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION decrypt_cpf(bytea) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION encrypt_cpf(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_cpf_decrypted(text, text) TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO:
-- SELECT 'getcpf: ' || COALESCE(get_cpf_decrypted('students','A2'),'NULL') AS t;
-- =============================================================================


-- ==== 20260904_001_lgpd_align_rls_anon.sql ====
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


-- ==== 20260904_002_questionario_id_sequences.sql ====
-- =============================================================================
-- MIGRACAO: IDs sequenciais via banco para as tabelas do Questionario
-- Data: 2026-09-04
-- Descricao: Cria sequences + RPCs next_*_id para as tabelas de configuracao e
--            respostas do Questionario, que hoje geram ID no front (uuid /
--            nextSeqId = Math.max+1), violando a regra de IDs do AGENTS.md.
--            Cada sequence e inicializada a partir do MAIOR sufixo numerico ja
--            existente na tabela (regex ancorada), entao:
--              - continua a sequencia de quem ja vem em formato prefixo+numero
--                (ex.: m3_cenarios c1,c2,c3 -> proximo c4);
--              - NAO colide com linhas antigas em formato uuid (prefixo novo);
--              - NENHUM dado cadastrado e perdido ou renumerado.
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

CREATE TABLE IF NOT EXISTS public.m5_capacidades_config (
  id text primary key,
  category text,
  level text,
  health_status text,
  to_improve text,
  recommendation text,
  alert_color text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.m6_modalidades_direcionamento (
  id text primary key,
  name text,
  valencias text,
  condition text,
  report text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.m6_diretrizes_intervencao (
  id text primary key,
  diretriz text,
  criterio text,
  conduta text,
  objetivo text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.m7_perfis_pareceres (
  id text primary key,
  profile text,
  component text,
  basic_data text,
  reflection text,
  interest_area text,
  careers text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.questionarios_respostas (
  id text primary key,
  template_id text not null default '',
  template_title text not null default '',
  answered_at text not null default '',
  answered_by text not null default '',
  questionnaire_type text,
  date text,
  grade text,
  created_at timestamptz default now()
);

ALTER TABLE public.m4_imc_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m5_capacidades_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m6_modalidades_direcionamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m6_diretrizes_intervencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m7_perfis_pareceres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionarios_respostas ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- m3_cenarios  (prefixo 'c')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m3_cenarios_id_seq;
SELECT setval(
  'public.m3_cenarios_id_seq',
  (SELECT coalesce(max((substring(id from '^c([0-9]+)$')::int)), 0) + 1
     FROM public.m3_cenarios),
  false
);
CREATE OR REPLACE FUNCTION public.next_m3_cenario_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'c' || nextval('public.m3_cenarios_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m3_cenario_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- m3_impactos  (prefixo 'i')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m3_impactos_id_seq;
SELECT setval(
  'public.m3_impactos_id_seq',
  (SELECT coalesce(max((substring(id from '^i([0-9]+)$')::int)), 0) + 1
     FROM public.m3_impactos),
  false
);
CREATE OR REPLACE FUNCTION public.next_m3_impacto_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'i' || nextval('public.m3_impactos_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m3_impacto_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- m4_imc_config  (prefixo 'm4_')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m4_imc_config_id_seq;
SELECT setval(
  'public.m4_imc_config_id_seq',
  (SELECT coalesce(max((substring(id from '^m4_([0-9]+)$')::int)), 0) + 1
     FROM public.m4_imc_config),
  false
);
CREATE OR REPLACE FUNCTION public.next_m4_imc_config_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm4_' || nextval('public.m4_imc_config_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m4_imc_config_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- m5_capacidades_config  (prefixo 'm5_')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m5_capacidades_config_id_seq;
SELECT setval(
  'public.m5_capacidades_config_id_seq',
  (SELECT coalesce(max((substring(id from '^m5_([0-9]+)$')::int)), 0) + 1
     FROM public.m5_capacidades_config),
  false
);
CREATE OR REPLACE FUNCTION public.next_m5_capacidade_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm5_' || nextval('public.m5_capacidades_config_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m5_capacidade_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- m6_modalidades_direcionamento  (prefixo 'm6_m_')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m6_modalidades_direcionamento_id_seq;
SELECT setval(
  'public.m6_modalidades_direcionamento_id_seq',
  (SELECT coalesce(max((substring(id from '^m6_m_([0-9]+)$')::int)), 0) + 1
     FROM public.m6_modalidades_direcionamento),
  false
);
CREATE OR REPLACE FUNCTION public.next_m6_direcionamento_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm6_m_' || nextval('public.m6_modalidades_direcionamento_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m6_direcionamento_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- m6_diretrizes_intervencao  (prefixo 'm6_d_')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m6_diretrizes_intervencao_id_seq;
SELECT setval(
  'public.m6_diretrizes_intervencao_id_seq',
  (SELECT coalesce(max((substring(id from '^m6_d_([0-9]+)$')::int)), 0) + 1
     FROM public.m6_diretrizes_intervencao),
  false
);
CREATE OR REPLACE FUNCTION public.next_m6_diretriz_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm6_d_' || nextval('public.m6_diretrizes_intervencao_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m6_diretriz_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- m7_perfis_pareceres  (prefixo 'm7_r_')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m7_perfis_pareceres_id_seq;
SELECT setval(
  'public.m7_perfis_pareceres_id_seq',
  (SELECT coalesce(max((substring(id from '^m7_r_([0-9]+)$')::int)), 0) + 1
     FROM public.m7_perfis_pareceres),
  false
);
CREATE OR REPLACE FUNCTION public.next_m7_parecer_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm7_r_' || nextval('public.m7_perfis_pareceres_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m7_parecer_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- m2_modalidades_config  (prefixo 'm2-custom-')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m2_modalidades_config_id_seq;
SELECT setval(
  'public.m2_modalidades_config_id_seq',
  (SELECT coalesce(max((substring(id from '^m2-custom-([0-9]+)$')::int)), 0) + 1
     FROM public.m2_modalidades_config),
  false
);
CREATE OR REPLACE FUNCTION public.next_m2_modalidade_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm2-custom-' || nextval('public.m2_modalidades_config_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m2_modalidade_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- questionarios_respostas  (prefixo 'resp-')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.questionarios_respostas_id_seq;
SELECT setval(
  'public.questionarios_respostas_id_seq',
  (SELECT coalesce(max((substring(id from '^resp-([0-9]+)$')::int)), 0) + 1
     FROM public.questionarios_respostas),
  false
);
CREATE OR REPLACE FUNCTION public.next_questionario_resposta_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'resp-' || nextval('public.questionarios_respostas_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_questionario_resposta_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- aptidao_referenciais  (M1 - prefixo 'ref-'; seeds usam 'f-1'..'v-9', sem colisao)
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.aptidao_referenciais_id_seq;
SELECT setval(
  'public.aptidao_referenciais_id_seq',
  (SELECT coalesce(max((substring(id from '^ref-([0-9]+)$')::int)), 0) + 1
     FROM public.aptidao_referenciais),
  false
);
CREATE OR REPLACE FUNCTION public.next_aptidao_ref_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'ref-' || nextval('public.aptidao_referenciais_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_aptidao_ref_id() TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO:
--   SELECT next_m3_cenario_id(), next_m4_imc_config_id(), next_questionario_resposta_id();
--   (chamar uma vez a mais nao renumera nada; sequences so avancam)
-- =============================================================================


-- ==== 20260904_003_questionario_respostas_reconcile.sql ====
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


-- ==== 20260904_004_aptidao_ref_per_category_seq.sql ====
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


-- ==== 20260904_005_m4_imc_ranges.sql ====
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
