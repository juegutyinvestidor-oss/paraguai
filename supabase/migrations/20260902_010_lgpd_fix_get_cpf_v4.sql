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
