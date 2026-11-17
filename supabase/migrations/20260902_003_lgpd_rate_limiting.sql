-- =============================================================================
-- MIGRACAO: LGPD - Controle de força bruta no login (rate limiting)
-- Data: 2026-09-02
-- Descricao: Cria tabela de registro de tentativas de login e função RPC
--            segura com bloqueio após 5 falhas em 15 minutos.
-- LGPD: Art. 46 - Medidas de segurança para proteção dos dados pessoais
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- 1. Tabela de tentativas de login
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  attempted_at timestamptz DEFAULT now(),
  success boolean DEFAULT false,
  ip_address text
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON public.login_attempts (email, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_cleanup
  ON public.login_attempts (attempted_at);

-- 3. Habilitar RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role login_attempts"
ON public.login_attempts FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated insert login_attempts"
ON public.login_attempts FOR INSERT
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 4. Função RPC: validate_login_secure (com rate limiting)
CREATE OR REPLACE FUNCTION validate_login_secure(
  email_input text,
  password_input text
)
RETURNS TABLE (id text, name text, email text, role text)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  result record;
  attempt_count integer;
BEGIN
  -- Verificar se a conta está bloqueada (5 falhas em 15 min)
  SELECT count(*) INTO attempt_count
  FROM public.login_attempts
  WHERE lower(email) = lower(email_input)
    AND success = false
    AND attempted_at > now() - interval '15 minutes';

  IF attempt_count >= 5 THEN
    -- Registrar tentativa bloqueada
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(email_input), false);
    RAISE EXCEPTION 'Conta temporariamente bloqueada devido a múltiplas tentativas. Tente novamente em 15 minutos.';
    RETURN;
  END IF;

  -- 1) Professores / gestores
  SELECT p.id, p.name, p.email, p.role INTO result
  FROM professionals p
  WHERE lower(p.email) = lower(email_input)
    AND p.password_hash IS NOT NULL
    AND p.password_hash = crypt(password_input, p.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(email_input), true);
    RETURN QUERY
    SELECT result.id::text, result.name::text, result.email::text, result.role::text;
    RETURN;
  END IF;

  -- 2) Alunos
  SELECT s.id, s.name, s.email, 'Aluno'::text INTO result
  FROM students s
  WHERE lower(s.email) = lower(email_input)
    AND s.password_hash IS NOT NULL
    AND s.password_hash = crypt(password_input, s.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(email_input), true);
    RETURN QUERY
    SELECT result.id::text, result.name::text, result.email::text, result.role::text;
    RETURN;
  END IF;

  -- 3) Perfis
  SELECT pr.id, pr.name, pr.email, pr.role INTO result
  FROM profiles pr
  WHERE lower(pr.email) = lower(email_input)
    AND pr.password_hash IS NOT NULL
    AND pr.password_hash = crypt(password_input, pr.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(email_input), true);
    RETURN QUERY
    SELECT result.id::text, result.name::text, result.email::text, result.role::text;
  ELSE
    -- Falha: registrar tentativa
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(email_input), false);
  END IF;
END;
$$;

-- =============================================================================
-- VERIFICACAO:
-- SELECT * FROM validate_login_secure('projetobrasil11@gmail.com', '010305Juliana@');
-- SELECT * FROM validate_login_secure('projetobrasil11@gmail.com', 'senha_errada');
-- (rodar a segunda 5x para testar bloqueio)
-- =============================================================================
