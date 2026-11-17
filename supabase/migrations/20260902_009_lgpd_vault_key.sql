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

