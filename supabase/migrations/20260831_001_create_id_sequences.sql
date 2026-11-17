-- =============================================================================
-- MIGRACAO: Criar sequences + funcoes RPC para geracao atomica de IDs
-- Data: 2026-08-31
-- Descricao: Cria sequences PostgreSQL e funcoes RPC para cada tabela que
--            utiliza IDs sequenciais textuais (ex: A1, G1, IMC-3, etc.)
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- =============================================================================
-- 1. STUDENTS: Sequencia para IDs no formato "A{N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS students_id_seq;

-- Inicializar com o MAXimo valor numerico existente
SELECT setval('students_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'A', '')::bigint) FROM students WHERE id ~ '^A[0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_student_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'A' || nextval('students_id_seq')::text;
$$;

-- =============================================================================
-- 2. PROFESSIONALS: Sequencia unica para IDs no formato "{prefixo}{N}"
--    Prefixos: G (Gestor), P (Professor), AS (Assistente), E (Estagiario),
--              ADM (Administrador)
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS professionals_id_seq;

-- Inicializar com o MAXimo valor numerico existente (extrair de qualquer prefixo)
SELECT setval('professionals_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(
      replace(id, regexp_replace(id, '[0-9]+$', ''), '')::bigint
    ) FROM professionals WHERE id ~ '^[A-Z]+[0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_professional_id(prefix text)
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT prefix || nextval('professionals_id_seq')::text;
$$;

-- =============================================================================
-- 3. CONTRATOS: Sequencia para IDs no formato "Contrato {N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS contratos_id_seq;

SELECT setval('contratos_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'Contrato ', '')::bigint) FROM contratos WHERE id ~ '^Contrato [0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_contract_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'Contrato ' || nextval('contratos_id_seq')::text;
$$;

-- =============================================================================
-- 4. MODALITIES: Sequencia para IDs no formato "Modalidade {N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS modalities_id_seq;

SELECT setval('modalities_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'Modalidade ', '')::bigint) FROM modalities WHERE id ~ '^Modalidade [0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_modality_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'Modalidade ' || nextval('modalities_id_seq')::text;
$$;

-- =============================================================================
-- 5. IMC_ASSESSMENTS: Sequencia para IDs no formato "IMC-{N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS imc_assessments_id_seq;

SELECT setval('imc_assessments_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'IMC-', '')::bigint) FROM imc_assessments WHERE id ~ '^IMC-[0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_imc_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'IMC-' || nextval('imc_assessments_id_seq')::text;
$$;

-- =============================================================================
-- 6. MOTOR_ASSESSMENTS: Sequencia para IDs no formato "Motor-{N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS motor_assessments_id_seq;

SELECT setval('motor_assessments_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'Motor-', '')::bigint) FROM motor_assessments WHERE id ~ '^Motor-[0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_motor_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'Motor-' || nextval('motor_assessments_id_seq')::text;
$$;

-- =============================================================================
-- 7. SPORT_ASSESSMENTS: Sequencia para IDs no formato "Esporte-{N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS sport_assessments_id_seq;

SELECT setval('sport_assessments_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'Esporte-', '')::bigint) FROM sport_assessments WHERE id ~ '^Esporte-[0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_sport_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'Esporte-' || nextval('sport_assessments_id_seq')::text;
$$;

-- =============================================================================
-- 8. VOCATIONAL_ASSESSMENTS: Sequencia para IDs no formato "Vocal-{N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS vocational_assessments_id_seq;

SELECT setval('vocational_assessments_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'Vocal-', '')::bigint) FROM vocational_assessments WHERE id ~ '^Vocal-[0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_vocational_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'Vocal-' || nextval('vocational_assessments_id_seq')::text;
$$;

-- =============================================================================
-- 9. PERFORMANCE_REPORTS: Sequencia para IDs no formato "REP-{N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS performance_reports_id_seq;

SELECT setval('performance_reports_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'REP-', '')::bigint) FROM performance_reports WHERE id ~ '^REP-[0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_report_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'REP-' || nextval('performance_reports_id_seq')::text;
$$;

-- =============================================================================
-- VERIFICACAO: Testar todas as funcoes (descomente para testar)
-- =============================================================================
-- SELECT next_student_id();      -- Deve retornar: A{proximo}
-- SELECT next_professional_id('G'); -- Deve retornar: G{proximo}
-- SELECT next_contract_id();     -- Deve retornar: Contrato {proximo}
-- SELECT next_modality_id();     -- Deve retornar: Modalidade {proximo}
-- SELECT next_imc_id();          -- Deve retornar: IMC-{proximo}
-- SELECT next_motor_id();        -- Deve retornar: Motor-{proximo}
-- SELECT next_sport_id();        -- Deve retornar: Esporte-{proximo}
-- SELECT next_vocational_id();   -- Deve retornar: Vocal-{proximo}
-- SELECT next_report_id();       -- Deve retornar: REP-{proximo}
