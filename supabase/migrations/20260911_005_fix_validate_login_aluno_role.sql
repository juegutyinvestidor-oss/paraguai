-- =============================================================================
-- MIGRACAO: Corrigir validate_login_secure (erro "record result has no field role")
-- Data: 2026-09-11
-- Descricao: Na versao da 20260909_005, o ramo dos ALUNOS faz
--   SELECT s.id, s.name, s.email, 'Aluno' INTO result
-- e o literal 'Aluno' sem alias nao gera campo "role" no record, causando
--   record "result" has no field "role"
-- em todo login de aluno (500 no /api/auth/login). Agora a funcao usa variaveis
-- escalares tipadas (v_id..v_role) com casts explicitos, eliminando o record.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_login_secure(
  email_input text,
  password_input text,
  ip_input text DEFAULT NULL
)
RETURNS TABLE (id text, name text, email text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_temp
AS $$
DECLARE
  v_id text;
  v_name text;
  v_email text;
  v_role text;
  attempt_count integer;
  v_ip text := left(coalesce(ip_input, ''), 64);
BEGIN
  SELECT count(*) INTO attempt_count
  FROM public.login_attempts la
  WHERE lower(la.email) = lower(validate_login_secure.email_input)
    AND la.success = false
    AND la.attempted_at > now() - interval '15 minutes';

  IF attempt_count >= 5 THEN
    INSERT INTO public.login_attempts (email, success, ip_address)
    VALUES (lower(validate_login_secure.email_input), false, v_ip);
    RAISE EXCEPTION 'Conta temporariamente bloqueada devido a múltiplas tentativas. Tente novamente em 15 minutos.';
  END IF;

  v_id := NULL; v_name := NULL; v_email := NULL; v_role := NULL;

  -- 1) Profissionais
  SELECT p.id::text, p.name::text, p.email::text, p.role::text
    INTO v_id, v_name, v_email, v_role
  FROM public.professionals p
  WHERE lower(p.email) = lower(validate_login_secure.email_input)
    AND p.password_hash IS NOT NULL
    AND p.password_hash = crypt(validate_login_secure.password_input, p.password_hash)
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), true, v_ip);
    RETURN QUERY SELECT v_id, v_name, v_email, v_role;
    RETURN;
  END IF;

  -- 2) Alunos (role fixo 'Aluno', agora como valor escalar tipado)
  SELECT s.id::text, s.name::text, s.email::text, 'Aluno'::text
    INTO v_id, v_name, v_email, v_role
  FROM public.students s
  WHERE lower(s.email) = lower(validate_login_secure.email_input)
    AND s.password_hash IS NOT NULL
    AND s.password_hash = crypt(validate_login_secure.password_input, s.password_hash)
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), true, v_ip);
    RETURN QUERY SELECT v_id, v_name, v_email, v_role;
    RETURN;
  END IF;

  -- 3) Perfis
  SELECT pr.id::text, pr.name::text, pr.email::text, pr.role::text
    INTO v_id, v_name, v_email, v_role
  FROM public.profiles pr
  WHERE lower(pr.email) = lower(validate_login_secure.email_input)
    AND pr.password_hash IS NOT NULL
    AND pr.password_hash = crypt(validate_login_secure.password_input, pr.password_hash)
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), true, v_ip);
    RETURN QUERY SELECT v_id, v_name, v_email, v_role;
  ELSE
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), false, v_ip);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_login_secure(text, text, text) TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO:
--   SELECT * FROM validate_login_secure('email-do-aluno@x.com', 'senha', '127.0.0.1');
--   -- deve retornar a linha com role = 'Aluno' sem erro
-- =============================================================================
