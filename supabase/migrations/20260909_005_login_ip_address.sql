-- =============================================================================
-- MIGRACAO: LGPD - Gravar IP do cliente em login_attempts
-- Data: 2026-09-09
-- ⚠️ ATENCAO: o corpo da funcao abaixo tem BUG no ramo dos ALUNOS ('Aluno' sem
--    alias -> record "result" has no field "role" -> login de aluno 500).
--    Foi corrigido por 20260911_005_fix_validate_login_aluno_role.sql.
--    NAO re-execute esta migragao depois da corregao, ou o bug volta.
-- =============================================================================
-- Descricao: A coluna login_attempts.ip_address sempre foi NULL porque o RPC
--            validate_login_secure nao recebia o IP. Agora a rota
--            /api/auth/login captura x-forwarded-for (ou 127.0.0.1 em dev) e
--            passa como ip_input. A funcao passa a ter 3 argumentos e registra
--            o IP em cada tentativa (sucesso, falha e bloqueio).
--            A versao de 2 argumentos e removida para evitar ambiguidade de
--            overload no PostgREST.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

DROP FUNCTION IF EXISTS validate_login_secure(text, text);

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
  result record;
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

  -- 1) Profissionais
  SELECT p.id, p.name, p.email, p.role INTO result
  FROM public.professionals p
  WHERE lower(p.email) = lower(validate_login_secure.email_input)
    AND p.password_hash IS NOT NULL
    AND p.password_hash = crypt(validate_login_secure.password_input, p.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), true, v_ip);
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
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), true, v_ip);
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
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), true, v_ip);
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
  ELSE
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), false, v_ip);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_login_secure(text, text, text) TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO (troque pela sua senha real):
--   SELECT * FROM validate_login_secure('seu@email.com', 'suaSenha', '203.0.113.9');
--   SELECT email, success, ip_address, attempted_at
--   FROM public.login_attempts ORDER BY attempted_at DESC LIMIT 5;
--   -- ip_address deve mostrar o IP passado (ou o IP real no login via app)
-- =============================================================================
