-- =============================================================================
-- MIGRACAO: Corrigir validate_login_secure (erro 42702 "email is ambiguous")
-- Data: 2026-09-09
-- Descricao: A funcao tem OUT parameter chamado "email" (RETURNS TABLE) e a
--            contagem de tentativas usava "lower(email)" sem prefixo de tabela.
--            O PL/pgSQL nao consegue decidir entre o OUT param e a coluna de
--            login_attempts e aborta com 42702 -> login 100% quebrado para
--            qualquer chamador (anon ou service_role). Correcao: qualificar a
--            coluna com alias da tabela (la.email).
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

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
  FROM public.login_attempts la
  WHERE lower(la.email) = lower(validate_login_secure.email_input)
    AND la.success = false
    AND la.attempted_at > now() - interval '15 minutes';

  IF attempt_count >= 5 THEN
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(validate_login_secure.email_input), false);
    RAISE EXCEPTION 'Conta temporariamente bloqueada devido a múltiplas tentativas. Tente novamente em 15 minutos.';
  END IF;

  -- 1) Profissionais
  SELECT p.id, p.name, p.email, p.role INTO result
  FROM public.professionals p
  WHERE lower(p.email) = lower(validate_login_secure.email_input)
    AND p.password_hash IS NOT NULL
    AND p.password_hash = crypt(validate_login_secure.password_input, p.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(validate_login_secure.email_input), true);
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
    RETURN;
  END IF;

  -- 2) Alunos
  SELECT s.id, s.name, s.email, 'Aluno'::text INTO result
  FROM public.students s
  WHERE lower(s.email) = lower(validate_login_secure.email_input)
    AND s.password_hash IS NOT NULL
    AND s.password_hash = crypt(validate_login_secure.password_input, s.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(validate_login_secure.email_input), true);
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
    RETURN;
  END IF;

  -- 3) Perfis
  SELECT pr.id, pr.name, pr.email, pr.role INTO result
  FROM public.profiles pr
  WHERE lower(pr.email) = lower(validate_login_secure.email_input)
    AND pr.password_hash IS NOT NULL
    AND pr.password_hash = crypt(validate_login_secure.password_input, pr.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(validate_login_secure.email_input), true);
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
  ELSE
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(validate_login_secure.email_input), false);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_login_secure(text, text) TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO (no SQL Editor, troque pela sua senha real):
--   SELECT * FROM validate_login_secure('seu@email.com', 'suaSenha');
--   -- deve retornar 1 linha (id, name, email, role) sem erro 42702
-- =============================================================================
