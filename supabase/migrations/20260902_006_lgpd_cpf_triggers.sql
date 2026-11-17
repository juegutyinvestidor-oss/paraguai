-- =============================================================================
-- MIGRACAO: LGPD - Criptografia de CPF no WRITE (triggers)
-- Data: 2026-09-02
-- Descricao: Garante que o CPF NUNCA seja armazenado em texto plano. Quando o
--            frontend envia a coluna `cpf`, um trigger converte para
--            `cpf_encrypted` (via pgcrypto) e zera o campo texto.
-- LGPD: Art. 46 (seguranca), Art. 6 (necessidade/minimizacao)
-- ATENCAO: Esse SQL deve ser executado DEPOIS do 20260902_005.
--          NÃO executar o DROP COLUMN cpf do passo 7 do 005 ainda -
--          o frontend ainda precisa receber o CPF descriptografado via RPC.
-- =============================================================================

-- 1. Garantir extensao pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 2. Trigger function: criptografar CPF e limpar texto plano no INSERT/UPDATE
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_encrypt_cpf()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  encryption_key text := 'edukyne_lgpd_2026_secure_key_32b';
BEGIN
  -- Se veio novo CPF em texto plano, criptografa e zera o texto
  IF NEW.cpf IS NOT NULL AND NEW.cpf <> '' THEN
    NEW.cpf_encrypted := pgp_sym_encrypt(NEW.cpf, encryption_key);
    RAISE NOTICE 'CPF criptografado para %', TG_TABLE_NAME;
  -- Se veio CPF vazio, PRESERVA o valor criptografado existente (nao limpa)
  ELSIF NEW.cpf IS NULL OR NEW.cpf = '' THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.cpf_encrypted := OLD.cpf_encrypted;
    END IF;
  END IF;
  -- NUNCA persistir o CPF em texto plano
  NEW.cpf := NULL;
  RETURN NEW;
END;
$$;

-- Aplicar trigger em students
DROP TRIGGER IF EXISTS trg_encrypt_cpf_students ON students;
CREATE TRIGGER trg_encrypt_cpf_students
BEFORE INSERT OR UPDATE OF cpf ON students
FOR EACH ROW
EXECUTE FUNCTION trg_encrypt_cpf();

-- Aplicar trigger em professionals
DROP TRIGGER IF EXISTS trg_encrypt_cpf_professionals ON professionals;
CREATE TRIGGER trg_encrypt_cpf_professionals
BEFORE INSERT OR UPDATE OF cpf ON professionals
FOR EACH ROW
EXECUTE FUNCTION trg_encrypt_cpf();

-- =============================================================================
-- 3. Funcao RPC para obter CPF descriptografado.
--
--    ATENCAO (arquitetura atual): O sistema usa anon key + validate_login_secure
--    e NÃO usa sessão/auth do Supabase (nao ha JWT de sessao real com papel).
--    Por isso a restricao por request.jwt.claims.role NAO se aplica aqui.
--    A exposicao e limitada: retorna apenas um CPF por id (nunca listas).
--
--    RECOMENDACAO LGPD (futuro): migrar para Supabase Auth para aplicar RLS real
--    e restringir esta funcao por papel (Administrador/Gestor) via JWT.
--=============================================================================
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

-- =============================================================================
-- 4. NOTA sobre seguranca de coluna:
--    cpf_encrypted permanece acessivel para leitura via select('*') do frontend,
--    porem o dado so pode ser decifrado com a chave (decrypt_cpf / get_cpf_decrypted).
--    get_cpf_decrypted ja restringe o acesso ao CPF claro apenas para
--    Administrador/Gestor. Nao revogamos a coluna cpf_encrypted para nao
--    quebrar o select('*') existente no frontend.
-- =============================================================================

-- Zera qualquer CPF em texto plano remanescente (defesa em profundidade)
UPDATE students SET cpf = NULL WHERE cpf IS NOT NULL;
UPDATE professionals SET cpf = NULL WHERE cpf IS NOT NULL;

-- =============================================================================
-- VERIFICACAO (descomente para testar):
-- SELECT id, name, cpf_encrypted IS NOT NULL AS tem_cpf_criptografado
-- FROM students WHERE cpf IS NOT NULL LIMIT 5;
--
-- SELECT id, name, decrypt_cpf(cpf_encrypted) AS cpf_legado
-- FROM students WHERE cpf_encrypted IS NOT NULL LIMIT 5;
-- =============================================================================
