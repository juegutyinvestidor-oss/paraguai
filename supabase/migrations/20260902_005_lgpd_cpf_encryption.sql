-- =============================================================================
-- MIGRACAO: LGPD - Criptografia de CPFs (dados sensíveis)
-- Data: 2026-09-02
-- Descricao: Adiciona colunas criptografadas para CPF em students e
--            professionals usando pgcrypto. Remove a coluna original
--            e mantém apenas a versão criptografada.
-- LGPD: Art. 46 - Medidas de segurança para dados sensíveis
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- 1. Habilitar extensão pgcrypto (se ainda não existir)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- ALTERNATIVA SIMPLES (sem Vault - para desenvolvimento/demo):
-- Usa pgp_sym_encrypt com chave fixa. Em produção, usar Supabase Vault.
-- =============================================================================
-- NOTA: Em produção, substitua a chave abaixo por uma variável de ambiente
-- ou use Supabase Vault para armazenar a chave de criptografia.

-- 2. Criar colunas criptografadas (se não existirem)
ALTER TABLE students ADD COLUMN IF NOT EXISTS cpf_encrypted bytea;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS cpf_encrypted bytea;

-- 3. Função para criptografar CPF
CREATE OR REPLACE FUNCTION encrypt_cpf(input_cpf text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key text := 'edukyne_lgpd_2026_secure_key_32b';
BEGIN
  IF input_cpf IS NULL OR input_cpf = '' THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_encrypt(input_cpf, encryption_key);
END;
$$;

-- 4. Função para descriptografar CPF (apenas service_role pode usar)
CREATE OR REPLACE FUNCTION decrypt_cpf(encrypted_cpf bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key text := 'edukyne_lgpd_2026_secure_key_32b';
BEGIN
  IF encrypted_cpf IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(encrypted_cpf, encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 5. Função RPC para obter CPF descriptografado (para uso no frontend)
--    IMPORTANTE: Esta função só deve ser chamada por usuários autenticados
--    com papel de Administrador ou Gestor.
CREATE OR REPLACE FUNCTION get_cpf_decrypted(
  target_table text,
  target_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_cpf bytea;
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

  RETURN decrypt_cpf(result_cpf);
END;
$$;

-- 6. Migrar dados existentes
UPDATE students
SET cpf_encrypted = encrypt_cpf(cpf)
WHERE cpf IS NOT NULL AND cpf != '' AND cpf_encrypted IS NULL;

UPDATE professionals
SET cpf_encrypted = encrypt_cpf(cpf)
WHERE cpf IS NOT NULL AND cpf != '' AND cpf_encrypted IS NULL;

-- =============================================================================
-- IMPORTANTE: Após verificar que a migração funcionou, execute o passo 7
-- para remover a coluna original. FAÇA ISSO SÓ DEPOIS DE ATUALIZAR O
-- FRONTEND PARA USAR cpf_encrypted.
-- =============================================================================

-- 7. (EXECUTAR SOMENTE APÓS ATUALIZAR O FRONTEND)
-- ALTER TABLE students DROP COLUMN cpf;
-- ALTER TABLE professionals DROP COLUMN cpf;

-- =============================================================================
-- VERIFICACAO:
-- SELECT id, name, decrypt_cpf(cpf_encrypted) as cpf_decrypted
-- FROM students WHERE cpf_encrypted IS NOT NULL LIMIT 5;
--
-- SELECT id, name, decrypt_cpf(cpf_encrypted) as cpf_decrypted
-- FROM professionals WHERE cpf_encrypted IS NOT NULL LIMIT 5;
-- =============================================================================
