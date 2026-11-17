-- =============================================================================
-- MIGRACAO: Adicionar autenticacao por senha (hash) + RPC validate_login
-- Data: 2026-08-31
-- Descricao: Adiciona coluna password_hash (bcrypt via pgcrypto) as tabelas
--            professionals, students e profiles, e cria a funcao RPC
--            validate_login que valida credenciais no servidor sem expor
--            o hash nem comparar senhas em texto plano.
-- Seguranca: A senha NUNCA e armazenada em texto; apenas o hash bcrypt.
--            O cliente nunca recebe o hash.
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- ==== 1. Habilitar extensao pgcrypto (fornece crypt() e gen_salt('bf')) ====
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==== 2. Adicionar coluna password_hash (se ainda nao existir) ====
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE students       ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE profiles       ADD COLUMN IF NOT EXISTS password_hash text;

-- ==== 3. Definir senha inicial do Administrador (id='1' / email admin) ====
-- Substitua o valor entre aspas simples pela senha desejada.
-- Aqui definimos um hash da senha fornecida pelo usuario.
UPDATE profiles
SET password_hash = crypt('010305Juliana@', gen_salt('bf', 10))
WHERE id = '1' OR email = 'projetobrasil11@gmail.com';

-- ==== 4. Funcao RPC: validate_login(email, password) ====
-- Retorna { id, name, email, role } do usuario se as credenciais forem validas,
-- ou um conjunto vazio. Nunca retorna o hash.
CREATE OR REPLACE FUNCTION validate_login(email_input text, password_input text)
RETURNS TABLE (id text, name text, email text, role text)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  result record;
BEGIN
  -- 1) Professores / gestores
  SELECT p.id, p.name, p.email, p.role
    INTO result
    FROM professionals p
   WHERE lower(p.email) = lower(email_input)
     AND p.password_hash IS NOT NULL
     AND p.password_hash = crypt(password_input, p.password_hash)
   LIMIT 1;

  IF result.id IS NOT NULL THEN
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
    RETURN;
  END IF;

  -- 2) Alunos
  SELECT s.id, s.name, s.email, 'Aluno'::text
    INTO result
    FROM students s
   WHERE lower(s.email) = lower(email_input)
     AND s.password_hash IS NOT NULL
     AND s.password_hash = crypt(password_input, s.password_hash)
   LIMIT 1;

  IF result.id IS NOT NULL THEN
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
    RETURN;
  END IF;

  -- 3) Perfis (Administrador / usuarios do painel)
  SELECT pr.id, pr.name, pr.email, pr.role
    INTO result
    FROM profiles pr
   WHERE lower(pr.email) = lower(email_input)
     AND pr.password_hash IS NOT NULL
     AND pr.password_hash = crypt(password_input, pr.password_hash)
   LIMIT 1;

  IF result.id IS NOT NULL THEN
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
  END IF;
END;
$$;

-- ==== 5. Funcao RPC: set_password(email, new_password) ====
-- Permite definir/alterar a senha de um usuario (profissional, aluno ou perfil).
-- Retorna true em caso de sucesso.
CREATE OR REPLACE FUNCTION set_password(target_email text, new_password text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF new_password IS NULL OR length(new_password) < 4 THEN
    RAISE EXCEPTION 'A senha deve possuir no minimo 4 caracteres.';
  END IF;

  UPDATE professionals SET password_hash = crypt(new_password, gen_salt('bf', 10))
   WHERE lower(email) = lower(target_email);
  IF FOUND THEN RETURN true; END IF;

  UPDATE students SET password_hash = crypt(new_password, gen_salt('bf', 10))
   WHERE lower(email) = lower(target_email);
  IF FOUND THEN RETURN true; END IF;

  UPDATE profiles SET password_hash = crypt(new_password, gen_salt('bf', 10))
   WHERE lower(email) = lower(target_email);
  IF FOUND THEN RETURN true; END IF;

  RETURN false;
END;
$$;

-- =============================================================================
-- VERIFICACAO (descomente para testar):
-- =============================================================================
-- SELECT * FROM validate_login('projetobrasil11@gmail.com', '010305Juliana@');
-- SELECT * FROM validate_login('projetobrasil11@gmail.com', 'senha_errada');
-- SELECT set_password('algum@email.com', 'novaSenha1');
