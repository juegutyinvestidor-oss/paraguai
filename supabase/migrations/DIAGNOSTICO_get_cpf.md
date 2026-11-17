-- =============================================================================
-- DIAGNOSTICO LGPD - get_cpf_decrypted retornando NULL
-- Rode este script inteiro no Supabase SQL Editor e cole o RESULTADO aqui.
-- Isso revela exatamente em qual passo o CPF se perde.
-- =============================================================================

-- 1) Definicao atual de decrypt_cpf
SELECT '=== decrypt_cpf ===' AS secao;
SELECT pg_get_functiondef(oid) AS def
FROM pg_proc WHERE proname = 'decrypt_cpf';

-- 2) Definicao atual de get_cpf_decrypted
SELECT '=== get_cpf_decrypted ===' AS secao;
SELECT pg_get_functiondef(oid) AS def
FROM pg_proc WHERE proname = 'get_cpf_decrypted';

-- 3) Teste passo a passo dentro do banco
DO $$
DECLARE
  key text := 'edukyne_lgpd_2026_secure_key_32b';
  enc bytea;
  dec1 text;
  dec2 text;
  dec3 text;
BEGIN
  SELECT cpf_encrypted INTO enc FROM students WHERE id = 'A2';
  RAISE NOTICE '1) cpfs_encrypted de A2 esta nulo? %', (enc IS NULL);

  -- a) decrypt via funcao decrypt_cpf
  dec1 := decrypt_cpf(enc);
  RAISE NOTICE '2) decrypt_cpf(A2) = [%]', dec1;

  -- b) decrypt direto com pgp_sym_decrypt
  BEGIN
    dec2 := pgp_sym_decrypt(enc, key);
    RAISE NOTICE '3) pgp_sym_decrypt direto = [%]', dec2;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '3) pgp_sym_decrypt direto ERRO: %', SQLERRM;
  END;

  -- c) get_cpf_decrypted
  dec3 := get_cpf_decrypted('students', 'A2');
  RAISE NOTICE '4) get_cpf_decrypted(A2) = [%]', dec3;
END $$;

-- 4) Verificar se ha REGISTROS com cpf_encrypted valido
SELECT '=== amostra students ===' AS secao;
SELECT id, name, (cpf_encrypted IS NOT NULL) AS tem_cpf,
       length(encode(cpf_encrypted,'hex')) AS tam_hex
FROM students
WHERE cpf_encrypted IS NOT NULL
LIMIT 5;

SELECT '=== amostra professionals ===' AS secao;
SELECT id, name, (cpf_encrypted IS NOT NULL) AS tem_cpf,
       length(encode(cpf_encrypted,'hex')) AS tam_hex
FROM professionals
WHERE cpf_encrypted IS NOT NULL
LIMIT 5;
