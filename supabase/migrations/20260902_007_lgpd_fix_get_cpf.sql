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
