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
