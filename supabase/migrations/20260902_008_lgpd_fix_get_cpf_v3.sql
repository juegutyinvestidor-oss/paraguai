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
