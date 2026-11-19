-- ==== 20260909_004_lgpd_requests.sql ====
-- =============================================================================
-- MIGRACAO: LGPD - Tabela de solicitacoes dos titulares (Art. 18)
-- Data: 2026-09-09
-- Descricao: Cria lgpd_requests para registrar exercicios de direitos do
--            titular (copia, correcao, exclusao, portabilidade, revogacao).
--            Criacao e resolucao passam pelas rotas /api/lgpd (service_role +
--            sessao). Leitura publica via anon key para o titular acompanhar
--            suas proprias solicitacoes e o painel do DPO listar todas.
--            Exclusao de conta NUNCA e automatica: gera apenas a solicitacao,
--            que um Administrador precisa resolver no console.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lgpd_requests (
  id text primary key,
  requester_id text NOT NULL,
  requester_email text NOT NULL,
  requester_role text NOT NULL DEFAULT '',
  request_type text NOT NULL CHECK (request_type IN ('copia','correcao','exclusao','portabilidade','revogacao')),
  notes text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','resolvida','recusada')),
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lgpd_requests_requester ON public.lgpd_requests (requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lgpd_requests_status    ON public.lgpd_requests (status, created_at DESC);

ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read lgpd_requests" ON public.lgpd_requests;
CREATE POLICY "read lgpd_requests" ON public.lgpd_requests
  FOR SELECT USING (true);

-- =============================================================================
-- VERIFICACAO:
--   SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'lgpd_requests';
--   -- apenas SELECT publico; escrita somente via service_role
-- =============================================================================


-- ==== 20260909_005_login_ip_address.sql ====
-- =============================================================================
-- MIGRACAO: LGPD - Gravar IP do cliente em login_attempts
-- Data: 2026-09-09
-- ⚠️ ATENCAO: o corpo da funcao abaixo tem BUG no ramo dos ALUNOS ('Aluno' sem
--    alias -> record "result" has no field "role" -> login de aluno 500).
--    Foi corrigido por 20260911_005_fix_validate_login_aluno_role.sql.
--    NAO re-execute esta migragao depois da corregao, ou o bug volta.
-- =============================================================================
-- Descricao: A coluna login_attempts.ip_address sempre foi NULL porque o RPC
--            validate_login_secure nao recebia o IP. Agora a rota
--            /api/auth/login captura x-forwarded-for (ou 127.0.0.1 em dev) e
--            passa como ip_input. A funcao passa a ter 3 argumentos e registra
--            o IP em cada tentativa (sucesso, falha e bloqueio).
--            A versao de 2 argumentos e removida para evitar ambiguidade de
--            overload no PostgREST.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

DROP FUNCTION IF EXISTS validate_login_secure(text, text);

CREATE OR REPLACE FUNCTION validate_login_secure(
  email_input text,
  password_input text,
  ip_input text DEFAULT NULL
)
RETURNS TABLE (id text, name text, email text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_temp
AS $$
DECLARE
  result record;
  attempt_count integer;
  v_ip text := left(coalesce(ip_input, ''), 64);
BEGIN
  SELECT count(*) INTO attempt_count
  FROM public.login_attempts la
  WHERE lower(la.email) = lower(validate_login_secure.email_input)
    AND la.success = false
    AND la.attempted_at > now() - interval '15 minutes';

  IF attempt_count >= 5 THEN
    INSERT INTO public.login_attempts (email, success, ip_address)
    VALUES (lower(validate_login_secure.email_input), false, v_ip);
    RAISE EXCEPTION 'Conta temporariamente bloqueada devido a múltiplas tentativas. Tente novamente em 15 minutos.';
  END IF;

  -- 1) Profissionais
  SELECT p.id, p.name, p.email, p.role INTO result
  FROM public.professionals p
  WHERE lower(p.email) = lower(validate_login_secure.email_input)
    AND p.password_hash IS NOT NULL
    AND p.password_hash = crypt(validate_login_secure.password_input, p.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), true, v_ip);
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
    RETURN;
  END IF;

  -- 2) Alunos
  SELECT s.id, s.name, s.email, 'Aluno'::text INTO result
  FROM public.students s
  WHERE lower(s.email) = lower(validate_login_secure.email_input)
    AND s.password_hash IS NOT NULL
    AND s.password_hash = crypt(validate_login_secure.password_input, s.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), true, v_ip);
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
    RETURN;
  END IF;

  -- 3) Perfis
  SELECT pr.id, pr.name, pr.email, pr.role INTO result
  FROM public.profiles pr
  WHERE lower(pr.email) = lower(validate_login_secure.email_input)
    AND pr.password_hash IS NOT NULL
    AND pr.password_hash = crypt(validate_login_secure.password_input, pr.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), true, v_ip);
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
  ELSE
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), false, v_ip);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_login_secure(text, text, text) TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO (troque pela sua senha real):
--   SELECT * FROM validate_login_secure('seu@email.com', 'suaSenha', '203.0.113.9');
--   SELECT email, success, ip_address, attempted_at
--   FROM public.login_attempts ORDER BY attempted_at DESC LIMIT 5;
--   -- ip_address deve mostrar o IP passado (ou o IP real no login via app)
-- =============================================================================


-- ==== 20260909_006_audit_trail_hardening.sql ====
-- =============================================================================
-- MIGRACAO: LGPD - Trilha de auditoria confiavel
-- Data: 2026-09-09
-- Descricao: 1) data_access_logs perde TODAS as policies anon: leitura e
--            escrita passam a existir apenas via service_role (rota /api/audit
--            e rotas internas). Antes qualquer portador da anon key podia
--            FORJAR entradas na auditoria - agora a identidade vem da sessao
--            validada e IP/user-agent do request real.
--            -> Para visualizar a trilha, use o SQL Editor:
--               SELECT * FROM data_access_logs ORDER BY accessed_at DESC;
--            2) register_consent vira SECURITY DEFINER: ela insere em
--               consent_records e data_access_logs e era SECURITY INVOKER
--               (executava como anon) - sem isso quebraria com o lock acima.
--            consent_records mantem as policies atuais (nao alterado).
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- 1. Fechar data_access_logs para anon/authenticated
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'data_access_logs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.data_access_logs', r.policyname);
  END LOOP;
END $$;

-- 2. register_consent: SECURITY DEFINER (mesmo comportamento de antes,
--    agora capaz de gravar nas tabelas fechadas para anon)
CREATE OR REPLACE FUNCTION register_consent(
  subject_role       text,
  subject_identifier text,
  consent_purposes   text[],
  registered_by      text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_temp
AS $$
DECLARE
  p text;
BEGIN
  FOREACH p IN ARRAY coalesce(consent_purposes, '{}'::text[]) LOOP
    UPDATE public.consent_records
      SET revoked_at = now()
      WHERE user_id = subject_identifier
        AND user_type = subject_role
        AND consent_type = p
        AND revoked_at IS NULL;

    INSERT INTO public.consent_records
      (user_type, user_id, consent_type, granted, details)
    VALUES
      (subject_role, subject_identifier, p, true,
       jsonb_build_object('registered_by', registered_by));
  END LOOP;

  INSERT INTO public.data_access_logs
    (user_id, user_role, action, target_table, target_id, details)
  VALUES
    (registered_by, subject_role, 'consent', 'consent_records', subject_identifier,
     jsonb_build_object('purposes', consent_purposes));

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION register_consent(text, text, text[], text) TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO:
--   SELECT policyname FROM pg_policies WHERE tablename='data_access_logs';
--   -- vazio (service_role bypassa RLS)
--
--   SELECT provolatile, prosecdef FROM pg_proc WHERE proname='register_consent';
--   -- prosecdef = true
-- =============================================================================


-- ==== 20260911_001_saude_global.sql ====
-- =============================================================================
-- MIGRACAO: Saude Global (KIDSCREEN-10) - Modulo 9
-- Data: 2026-09-11
-- Descricao: Cria as tres tabelas do novo campo "Saude Global":
--   - m9_health_questions  : banco de 10 perguntas (escala 1-5, flag 'reversed')
--   - health_assessments   : resultado por aluno (bruto, Escore T, classificacao)
--   - m9_perfis_pareceres  : parecer editavel pelo admin, por classificacao
-- RLS: apenas SELECT publico (escritas passam por /api/data com service_role),
--      no mesmo modelo das tabelas travadas pela 20260909_003.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Banco de perguntas do M9
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m9_health_questions (
  id text primary key,
  ord integer not null default 1,
  statement text not null,
  reversed boolean not null default false,
  created_at timestamptz default now()
);

ALTER TABLE public.m9_health_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m9_health_questions" ON public.m9_health_questions;
CREATE POLICY "read m9_health_questions" ON public.m9_health_questions FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m9_health_questions_id_seq;
CREATE OR REPLACE FUNCTION public.next_m9_health_question_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'hq' || nextval('public.m9_health_questions_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m9_health_question_id() TO anon, authenticated, service_role;

-- Seed das 10 perguntas (itens 2, 3 e 10 invertidos). Idempotente.
INSERT INTO public.m9_health_questions (id, ord, statement, reversed) VALUES
  ('hq1', 1,  'Você tem se sentido bem e com energia?', false),
  ('hq2', 2,  'Você tem se sentido triste?', true),
  ('hq3', 3,  'Você tem se sentido sozinho(a)?', true),
  ('hq4', 4,  'Você tem tido tempo suficiente para si mesmo(a)?', false),
  ('hq5', 5,  'Você tem podido fazer as coisas que quer no seu tempo livre?', false),
  ('hq6', 6,  'Os seus pais têm tratado você com justiça?', false),
  ('hq7', 7,  'Você tem se divertido com os seus amigos?', false),
  ('hq8', 8,  'Você tem se saído bem na escola/estudos?', false),
  ('hq9', 9,  'Você tem sido capaz de prestar atenção/se concentrar?', false),
  ('hq10', 10, 'Você tem se sentido deprimido(a) ou sem esperança?', true)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  'public.m9_health_questions_id_seq',
  (SELECT coalesce(max((substring(id from '^hq([0-9]+)$')::int)), 0) + 1
     FROM public.m9_health_questions),
  false
);

-- -----------------------------------------------------------------------------
-- 2) Resultados por aluno (Saude Global)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.health_assessments (
  id text primary key,
  student_id text not null,
  student_name text,
  raw_score integer not null default 0,
  t_score numeric not null default 0,
  classification text not null,
  technical_opinion text,
  date text,
  answers jsonb,
  created_at timestamptz default now()
);

ALTER TABLE public.health_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read health_assessments" ON public.health_assessments;
CREATE POLICY "read health_assessments" ON public.health_assessments FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.health_assessments_id_seq;
SELECT setval(
  'public.health_assessments_id_seq',
  GREATEST(
    COALESCE((SELECT MAX(replace(id, 'Health-', '')::bigint)
                FROM public.health_assessments WHERE id ~ '^Health-[0-9]+$'), 0),
    1)
);
CREATE OR REPLACE FUNCTION public.next_health_assessment_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'Health-' || nextval('public.health_assessments_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_health_assessment_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3) Parecer editavel por classificacao
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m9_perfis_pareceres (
  id text primary key,
  classification text not null,
  basic_data text,
  reflection text,
  created_at timestamptz default now()
);

ALTER TABLE public.m9_perfis_pareceres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m9_perfis_pareceres" ON public.m9_perfis_pareceres;
CREATE POLICY "read m9_perfis_pareceres" ON public.m9_perfis_pareceres FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m9_perfis_pareceres_id_seq;
CREATE OR REPLACE FUNCTION public.next_m9_parecer_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm9p_' || nextval('public.m9_perfis_pareceres_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m9_parecer_id() TO anon, authenticated, service_role;

-- Seed dos 3 pareceres (idempotente por classificacao).
INSERT INTO public.m9_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm9p_1', 'Qualidade de Vida Baixa',
  'Escore T abaixo de 40. Sinal de alerta na percepção de bem-estar.',
  'Indica necessidade de atenção ou intervenção psicológica/social. Recomenda-se acompanhamento próximo e escuta ativa do estudante.'
WHERE NOT EXISTS (SELECT 1 FROM public.m9_perfis_pareceres WHERE classification = 'Qualidade de Vida Baixa');

INSERT INTO public.m9_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm9p_2', 'Qualidade de Vida Normal',
  'Escore T entre 40 e 60. Percepção de saúde esperada para a média.',
  'Percepção de saúde dentro do esperado para a população saudável. Manter hábitos de cuidado e monitoramento de rotina.'
WHERE NOT EXISTS (SELECT 1 FROM public.m9_perfis_pareceres WHERE classification = 'Qualidade de Vida Normal');

INSERT INTO public.m9_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm9p_3', 'Qualidade de Vida Alta',
  'Escore T acima de 60. Excelente percepção de bem-estar.',
  'Excelente percepção de saúde física, social e suporte familiar. Preservar a rede de apoio e os hábitos que sustentam o bem-estar.'
WHERE NOT EXISTS (SELECT 1 FROM public.m9_perfis_pareceres WHERE classification = 'Qualidade de Vida Alta');

SELECT setval(
  'public.m9_perfis_pareceres_id_seq',
  (SELECT coalesce(max((substring(id from '^m9p_([0-9]+)$')::int)), 0) + 1
     FROM public.m9_perfis_pareceres),
  false
);

-- =============================================================================
-- VERIFICACAO:
--   SELECT ord, statement, reversed FROM public.m9_health_questions ORDER BY ord;
--   SELECT classification, basic_data FROM public.m9_perfis_pareceres;
-- =============================================================================


-- ==== 20260911_002_higiene_bucal.sql ====
-- =============================================================================
-- MIGRACAO: Higiene Bucal (HU-DBI) - Modulo 10
-- Data: 2026-09-11
-- Descricao: Cria as tres tabelas do novo campo "Higiene Bucal":
--   - m10_oral_questions   : banco de 20 perguntas (Concordo/Discordo) com a
--                            regra de pontuacao por item ('agree'/'disagree'/'none')
--   - oral_assessments     : resultado por aluno (score 0-12 + classificacao)
--   - m10_perfis_pareceres : parecer editavel pelo admin, por faixa de desempenho
-- RLS: apenas SELECT publico (escritas passam por /api/data com service_role).
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Banco de perguntas do M10
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m10_oral_questions (
  id text primary key,
  ord integer not null default 1,
  statement text not null,
  scoring_rule text not null default 'none',
  created_at timestamptz default now()
);

ALTER TABLE public.m10_oral_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m10_oral_questions" ON public.m10_oral_questions;
CREATE POLICY "read m10_oral_questions" ON public.m10_oral_questions FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m10_oral_questions_id_seq;
CREATE OR REPLACE FUNCTION public.next_m10_oral_question_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'oq' || nextval('public.m10_oral_questions_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m10_oral_question_id() TO anon, authenticated, service_role;

-- Seed das 20 perguntas. Regra: 'agree' pontua se Concordo, 'disagree' se Discordo,
-- 'none' nao pontua (perfis comportamental/estetico). Idempotente.
INSERT INTO public.m10_oral_questions (id, ord, statement, scoring_rule) VALUES
  ('oq1',  1,  'Não me preocupo muito em ir ao dentista.', 'none'),
  ('oq2',  2,  'Minha gengiva sangra quando escovo os dentes.', 'disagree'),
  ('oq3',  3,  'Eu me preocupo muito com a cor dos meus dentes.', 'none'),
  ('oq4',  4,  'Eu percebo uma gosma/sujeira (placa) nos meus dentes.', 'agree'),
  ('oq5',  5,  'Eu uso uma escova de dentes com cerdas duras.', 'none'),
  ('oq6',  6,  'Eu acho que é impossível evitar problemas na gengiva apenas escovando os dentes.', 'disagree'),
  ('oq7',  7,  'Eu costumo escovar meus dentes logo após cada refeição.', 'agree'),
  ('oq8',  8,  'Eu sinto que já limpo bem os meus dentes sem precisar usar o fio dental.', 'disagree'),
  ('oq9',  9,  'Eu uso uma técnica de escovação recomendada pelo meu dentista.', 'agree'),
  ('oq10', 10, 'Eu sinto que meus dentes estão piorando, mesmo escovando todos os dias.', 'disagree'),
  ('oq11', 11, 'Já me disseram que tenho bom hálito.', 'agree'),
  ('oq12', 12, 'Eu examino meus dentes detalhadamente no espelho após a escovação.', 'agree'),
  ('oq13', 13, 'Eu me preocupo com o alinhamento ou formato dos meus dentes.', 'none'),
  ('oq14', 14, 'Eu tenho medo de sentir dor no dentista.', 'disagree'),
  ('oq15', 15, 'Eu sinto que meus dentes nunca ficam totalmente limpos.', 'disagree'),
  ('oq16', 16, 'Eu escovo a minha língua com frequência.', 'none'),
  ('oq17', 17, 'Eu uso enxaguante bucal quase todos os dias.', 'none'),
  ('oq18', 18, 'Eu sinto que escovo meus dentes com muita força.', 'none'),
  ('oq19', 19, 'Eu uso o fio dental pelo menos uma vez por dia.', 'agree'),
  ('oq20', 20, 'Eu só vou ao dentista quando estou sentindo alguma dor.', 'none')
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  'public.m10_oral_questions_id_seq',
  (SELECT coalesce(max((substring(id from '^oq([0-9]+)$')::int)), 0) + 1
     FROM public.m10_oral_questions),
  false
);

-- -----------------------------------------------------------------------------
-- 2) Resultados por aluno (Higiene Bucal)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.oral_assessments (
  id text primary key,
  student_id text not null,
  student_name text,
  score integer not null default 0,
  classification text not null,
  technical_opinion text,
  date text,
  answers jsonb,
  created_at timestamptz default now()
);

ALTER TABLE public.oral_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read oral_assessments" ON public.oral_assessments;
CREATE POLICY "read oral_assessments" ON public.oral_assessments FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.oral_assessments_id_seq;
SELECT setval(
  'public.oral_assessments_id_seq',
  GREATEST(
    COALESCE((SELECT MAX(replace(id, 'Oral-', '')::bigint)
                FROM public.oral_assessments WHERE id ~ '^Oral-[0-9]+$'), 0),
    1)
);
CREATE OR REPLACE FUNCTION public.next_oral_assessment_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'Oral-' || nextval('public.oral_assessments_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_oral_assessment_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3) Parecer editavel por faixa de desempenho
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m10_perfis_pareceres (
  id text primary key,
  classification text not null,
  basic_data text,
  reflection text,
  created_at timestamptz default now()
);

ALTER TABLE public.m10_perfis_pareceres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m10_perfis_pareceres" ON public.m10_perfis_pareceres;
CREATE POLICY "read m10_perfis_pareceres" ON public.m10_perfis_pareceres FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m10_perfis_pareceres_id_seq;
CREATE OR REPLACE FUNCTION public.next_m10_parecer_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm10p_' || nextval('public.m10_perfis_pareceres_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m10_parecer_id() TO anon, authenticated, service_role;

-- Seed dos 3 pareceres (idempotente por classificacao).
INSERT INTO public.m10_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm10p_1', 'Alto Desempenho',
  'De 9 a 12 pontos no HU-DBI.',
  'Excelente comportamento em saúde bucal. O paciente adota práticas preventivas sólidas e possui ótima alfabetização em saúde.'
WHERE NOT EXISTS (SELECT 1 FROM public.m10_perfis_pareceres WHERE classification = 'Alto Desempenho');

INSERT INTO public.m10_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm10p_2', 'Desempenho Moderado',
  'De 5 a 8 pontos no HU-DBI.',
  'Conhecimento intermediário. Existem contradições ou mitos na rotina de higiene que aumentam o risco de desenvolvimento de patologias bucais.'
WHERE NOT EXISTS (SELECT 1 FROM public.m10_perfis_pareceres WHERE classification = 'Desempenho Moderado');

INSERT INTO public.m10_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm10p_3', 'Baixo Desempenho',
  'De 0 a 4 pontos no HU-DBI.',
  'Comportamento de risco. Alta probabilidade clínica de acúmulo de biofilme ativo, necessidade urgente de intervenção educativa e tratamento preventivo.'
WHERE NOT EXISTS (SELECT 1 FROM public.m10_perfis_pareceres WHERE classification = 'Baixo Desempenho');

SELECT setval(
  'public.m10_perfis_pareceres_id_seq',
  (SELECT coalesce(max((substring(id from '^m10p_([0-9]+)$')::int)), 0) + 1
     FROM public.m10_perfis_pareceres),
  false
);

-- =============================================================================
-- VERIFICACAO:
--   SELECT ord, statement, scoring_rule FROM public.m10_oral_questions ORDER BY ord;
--   SELECT classification, basic_data FROM public.m10_perfis_pareceres;
-- =============================================================================


-- ==== 20260911_003_autoconceito.sql ====
-- =============================================================================
-- MIGRACAO: Autoconceito (Escala de Rosenberg) - Modulo 11
-- Data: 2026-09-11
-- Descricao: Cria as tres tabelas do novo campo "Autoconceito":
--   - m11_autoconcept_questions    : banco de 10 afirmacoes (CT/C/D/DT) com o
--                                    tipo do item ('positive'/'negative')
--   - autoconcept_assessments      : resultado por aluno (score 0-30 + classificacao)
--   - m11_perfis_pareceres         : parecer editavel pelo admin, por faixa
-- RLS: apenas SELECT publico (escritas passam por /api/data com service_role).
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
--
-- NOTA: os itens seguem a ORDEM CLASSICA de Rosenberg - positivos 1,2,4,6,7 e
-- negativos 3,5,8,9,10 - casando com o gabarito do Slide 3. A pontuacao e feita
-- pelo TIPO do item (editavel no M11), entao a ordem so afeta a numeracao.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Banco de afirmacoes do M11
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m11_autoconcept_questions (
  id text primary key,
  ord integer not null default 1,
  statement text not null,
  item_type text not null default 'positive',
  created_at timestamptz default now()
);

ALTER TABLE public.m11_autoconcept_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m11_autoconcept_questions" ON public.m11_autoconcept_questions;
CREATE POLICY "read m11_autoconcept_questions" ON public.m11_autoconcept_questions FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m11_autoconcept_questions_id_seq;
CREATE OR REPLACE FUNCTION public.next_m11_auto_question_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'aq' || nextval('public.m11_autoconcept_questions_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m11_auto_question_id() TO anon, authenticated, service_role;

-- Seed das 10 afirmacoes na ORDEM CLASSICA de Rosenberg (positivos 1,2,4,6,7;
-- negativos 3,5,8,9,10). Pontuacao e por tipo, entao a ordem so afeta a numeracao.
INSERT INTO public.m11_autoconcept_questions (id, ord, statement, item_type) VALUES
  ('aq1', 1,  'Sinto que sou uma pessoa de valor, pelo menos tanto quanto as outras.', 'positive'),
  ('aq2', 2,  'Tenho uma atitude positiva em relação a mim mesmo(a).', 'positive'),
  ('aq3', 3,  'No geral, estou inclinado(a) a pensar que sou um(a) fracassado(a).', 'negative'),
  ('aq4', 4,  'Sou capaz de fazer as coisas tão bem quanto a maioria das outras pessoas.', 'positive'),
  ('aq5', 5,  'Sinto que não tenho muito do que me orgulhar.', 'negative'),
  ('aq6', 6,  'Sinto que tenho qualidades positivas.', 'positive'),
  ('aq7', 7,  'No geral, estou satisfeito(a) comigo mesmo(a).', 'positive'),
  ('aq8', 8,  'Às vezes, penso que não sirvo para nada.', 'negative'),
  ('aq9', 9,  'Às vezes, me sinto inútil.', 'negative'),
  ('aq10', 10, 'Gostaria de ter mais respeito por mim mesmo(a).', 'negative')
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  'public.m11_autoconcept_questions_id_seq',
  (SELECT coalesce(max((substring(id from '^aq([0-9]+)$')::int)), 0) + 1
     FROM public.m11_autoconcept_questions),
  false
);

-- -----------------------------------------------------------------------------
-- 2) Resultados por aluno (Autoconceito)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.autoconcept_assessments (
  id text primary key,
  student_id text not null,
  student_name text,
  score integer not null default 0,
  classification text not null,
  technical_opinion text,
  date text,
  answers jsonb,
  created_at timestamptz default now()
);

ALTER TABLE public.autoconcept_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read autoconcept_assessments" ON public.autoconcept_assessments;
CREATE POLICY "read autoconcept_assessments" ON public.autoconcept_assessments FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.autoconcept_assessments_id_seq;
SELECT setval(
  'public.autoconcept_assessments_id_seq',
  GREATEST(
    COALESCE((SELECT MAX(replace(id, 'Auto-', '')::bigint)
                FROM public.autoconcept_assessments WHERE id ~ '^Auto-[0-9]+$'), 0),
    1)
);
CREATE OR REPLACE FUNCTION public.next_autoconcept_assessment_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'Auto-' || nextval('public.autoconcept_assessments_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_autoconcept_assessment_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3) Parecer editavel por faixa
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m11_perfis_pareceres (
  id text primary key,
  classification text not null,
  basic_data text,
  reflection text,
  created_at timestamptz default now()
);

ALTER TABLE public.m11_perfis_pareceres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m11_perfis_pareceres" ON public.m11_perfis_pareceres;
CREATE POLICY "read m11_perfis_pareceres" ON public.m11_perfis_pareceres FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m11_perfis_pareceres_id_seq;
CREATE OR REPLACE FUNCTION public.next_m11_parecer_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm11p_' || nextval('public.m11_perfis_pareceres_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m11_parecer_id() TO anon, authenticated, service_role;

-- Seed dos 3 pareceres (idempotente por classificacao).
INSERT INTO public.m11_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm11p_1', 'Autoestima Baixa',
  'Menos de 15 pontos na escala de Rosenberg.',
  'Indica foco excessivo em defeitos, sentimentos frequentes de insatisfação pessoal e menor confiança na própria capacidade.'
WHERE NOT EXISTS (SELECT 1 FROM public.m11_perfis_pareceres WHERE classification = 'Autoestima Baixa');

INSERT INTO public.m11_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm11p_2', 'Autoestima Equilibrada',
  'De 15 a 25 pontos na escala de Rosenberg.',
  'Representa o padrão da maior parte da população. O indivíduo mantém uma boa relação consigo mesmo e reconhece suas qualidades e fraquezas de forma realista.'
WHERE NOT EXISTS (SELECT 1 FROM public.m11_perfis_pareceres WHERE classification = 'Autoestima Equilibrada');

INSERT INTO public.m11_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm11p_3', 'Autoestima Alta',
  'Mais de 25 pontos na escala de Rosenberg.',
  'Forte autoconfiança e segurança. Pontuações muito próximas de 30 podem indicar forte estabilidade emocional, mas também podem refletir uma postura defensiva ou dificuldade em encarar pontos vulneráveis.'
WHERE NOT EXISTS (SELECT 1 FROM public.m11_perfis_pareceres WHERE classification = 'Autoestima Alta');

SELECT setval(
  'public.m11_perfis_pareceres_id_seq',
  (SELECT coalesce(max((substring(id from '^m11p_([0-9]+)$')::int)), 0) + 1
     FROM public.m11_perfis_pareceres),
  false
);

-- =============================================================================
-- VERIFICACAO:
--   SELECT ord, statement, item_type FROM public.m11_autoconcept_questions ORDER BY ord;
--   SELECT classification, basic_data FROM public.m11_perfis_pareceres;
-- =============================================================================


-- ==== 20260911_004_indice_alimentar.sql ====
-- =============================================================================
-- MIGRACAO: Indice de Alimentacao Saudavel (IAS) - Modulo 12
-- Data: 2026-09-11
-- Descricao: Cria as tres tabelas do novo campo "Indice Alimentar":
--   - ias_questions        : 11 perguntas, cada uma com 3 opcoes pontuadas
--   - ias_assessments      : resultado por aluno (total + classificacao)
--   - m12_perfis_pareceres : parecer editavel pelo admin, por faixa
-- RLS: apenas SELECT publico (escritas passam por /api/data com service_role).
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Banco de perguntas do M12
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ias_questions (
  id text primary key,
  ord integer not null default 1,
  statement text not null,
  option_1_text text not null default '',
  option_1_points integer not null default 0,
  option_2_text text not null default '',
  option_2_points integer not null default 0,
  option_3_text text not null default '',
  option_3_points integer not null default 0,
  created_at timestamptz default now()
);

ALTER TABLE public.ias_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read ias_questions" ON public.ias_questions;
CREATE POLICY "read ias_questions" ON public.ias_questions FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.ias_questions_id_seq;
CREATE OR REPLACE FUNCTION public.next_ias_question_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'iq' || nextval('public.ias_questions_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_ias_question_id() TO anon, authenticated, service_role;

-- Seed das 11 perguntas (3 opcoes pontuadas cada). Idempotente.
INSERT INTO public.ias_questions (id, ord, statement, option_1_text, option_1_points, option_2_text, option_2_points, option_3_text, option_3_points) VALUES
  ('iq1', 1, 'Frutas Totais (incluindo sucos naturais)',
   'Raramente ou nunca consumo frutas.', 0,
   'Consumo 1 porção por dia (ex: 1 fatia de melancia ou 1 maçã).', 3,
   'Consumo 2 ou mais porções de frutas todos os dias.', 5),
  ('iq2', 2, 'Frutas Integrais (apenas fruta inteira/pedaços, sem sucos)',
   'Só tomo suco ou não como frutas.', 0,
   'Consumo pelo menos 1 fruta inteira na maioria dos dias.', 3,
   'Consumo 2 ou mais frutas inteiras todos os dias (garante fibras).', 5),
  ('iq3', 3, 'Vegetais Totais (verduras e legumes crus ou cozidos)',
   'Raramente ou nunca como vegetais.', 0,
   'Consumo vegetais apenas em 1 refeição (só almoço ou só jantar).', 3,
   'Consumo vegetais no almoço e no jantar todos os dias.', 5),
  ('iq4', 4, 'Vegetais Escuros e Leguminosas (brócolis, couve, espinafre, feijão, lentilha...)',
   'Raramente ou nunca consumo esses alimentos.', 0,
   'Como feijão ou vegetais escuros de 3 a 4 vezes por semana.', 3,
   'Como feijão e/ou vegetais verde-escuros praticamente todos os dias.', 5),
  ('iq5', 5, 'Cereais Integrais (arroz integral, aveia, pão integral, linhaça, chia)',
   'Só consumo cereais refinados (arroz branco, pão francês, macarrão normal).', 0,
   'Consumo pelo menos 1 porção de cereal integral ou sementes por dia.', 5,
   'A maior parte dos meus cereais diários são integrais (2 ou mais porções/dia).', 10),
  ('iq6', 6, 'Laticínios (leite, queijo, iogurte - preferencialmente menos gordura)',
   'Não consumo laticínios (ou equivalentes vegetais fortificados com cálcio).', 0,
   'Consumo de 1 a 2 porções por dia.', 5,
   'Consumo 3 porções por dia (recomendação padrão de cálcio).', 10),
  ('iq7', 7, 'Carnes, Ovos e Leguminosas (fontes de proteína em geral)',
   'Baixíssimo consumo de proteínas ao longo do dia.', 0,
   'Consumo proteínas em apenas uma das grandes refeições.', 5,
   'Consumo fontes saudáveis distribuídas no almoço, jantar e lanches.', 10),
  ('iq8', 8, 'Peixes e Fontes de Gorduras Boas (sardinha/atum, azeite, castanhas, abacate)',
   'Não consumo esses alimentos ou uso apenas óleos vegetais comuns.', 0,
   'Uso azeite de oliva regularmente, ou como castanhas/abacate algumas vezes na semana.', 5,
   'Como peixe pelo menos 2 vezes por semana E uso gorduras boas diariamente.', 10),
  ('iq9', 9, 'Sódio (Sal de cozinha e alimentos salgados)',
   'Uso muito sal, uso temperos prontos (cubos) e como muitos embutidos/salgadinhos.', 0,
   'Uso sal moderadamente, mas ainda consumo alguns industrializados salgados.', 5,
   'Comida baixa em sal, priorizo temperos naturais e evito ultraprocessados.', 10),
  ('iq10', 10, 'Gordura Saturada (carnes gordas, pele de frango, manteiga, óleo de coco, queijos amarelos)',
   'Consumo carnes muito gordas, frituras e queijos gordos quase diariamente.', 0,
   'Consumo moderado; alterno carnes magras/gordas, controlo o uso de manteiga.', 5,
   'Alimentação muito baixa em gordura saturada (priorizo carnes magras e grelhados).', 10),
  ('iq11', 11, 'Calorias de Fontes Vazias (açúcar de adição, doces, refrigerantes, álcool e gorduras sólidas)',
   'Consumo doces, refrigerantes ou bebidas açucaradas/alcoólicas todos os dias.', 0,
   'Consumo esses itens de forma moderada (2 a 3 vezes por semana).', 10,
   'Raramente consumo (menos de 1 vez por semana) açúcar refinado, refrigerantes ou álcool.', 20)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  'public.ias_questions_id_seq',
  (SELECT coalesce(max((substring(id from '^iq([0-9]+)$')::int)), 0) + 1
     FROM public.ias_questions),
  false
);

-- -----------------------------------------------------------------------------
-- 2) Resultados por aluno (Indice Alimentar)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ias_assessments (
  id text primary key,
  student_id text not null,
  student_name text,
  total_score integer not null default 0,
  classification text not null,
  technical_opinion text,
  date text,
  answers jsonb,
  created_at timestamptz default now()
);

ALTER TABLE public.ias_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read ias_assessments" ON public.ias_assessments;
CREATE POLICY "read ias_assessments" ON public.ias_assessments FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.ias_assessments_id_seq;
SELECT setval(
  'public.ias_assessments_id_seq',
  GREATEST(
    COALESCE((SELECT MAX(replace(id, 'IAS-', '')::bigint)
                FROM public.ias_assessments WHERE id ~ '^IAS-[0-9]+$'), 0),
    1)
);
CREATE OR REPLACE FUNCTION public.next_ias_assessment_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'IAS-' || nextval('public.ias_assessments_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_ias_assessment_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3) Parecer editavel por faixa
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m12_perfis_pareceres (
  id text primary key,
  classification text not null,
  basic_data text,
  reflection text,
  created_at timestamptz default now()
);

ALTER TABLE public.m12_perfis_pareceres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m12_perfis_pareceres" ON public.m12_perfis_pareceres;
CREATE POLICY "read m12_perfis_pareceres" ON public.m12_perfis_pareceres FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m12_perfis_pareceres_id_seq;
CREATE OR REPLACE FUNCTION public.next_m12_parecer_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm12p_' || nextval('public.m12_perfis_pareceres_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m12_parecer_id() TO anon, authenticated, service_role;

-- Seed dos 3 pareceres (idempotente por classificacao).
INSERT INTO public.m12_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm12p_1', 'Dieta de Má Qualidade',
  'Menos de 51 pontos no IAS.',
  'Alto risco para o desenvolvimento de carências nutricionais e doenças crônicas (diabetes, hipertensão, problemas cardíacos). Exige intervenção rápida.'
WHERE NOT EXISTS (SELECT 1 FROM public.m12_perfis_pareceres WHERE classification = 'Dieta de Má Qualidade');

INSERT INTO public.m12_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm12p_2', 'Necessita de Modificações',
  'De 51 a 80 pontos no IAS.',
  'Já possui alguns hábitos saudáveis, mas comete excessos ou tem faltas graves (excesso de açúcar/sódio ou falta de integrais e frutas).'
WHERE NOT EXISTS (SELECT 1 FROM public.m12_perfis_pareceres WHERE classification = 'Necessita de Modificações');

INSERT INTO public.m12_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm12p_3', 'Boa Qualidade (Saudável)',
  'Mais de 80 pontos no IAS.',
  'Padrão alimentar atende muito bem às diretrizes. Atua como um fator protetor para a sua saúde e longevidade.'
WHERE NOT EXISTS (SELECT 1 FROM public.m12_perfis_pareceres WHERE classification = 'Boa Qualidade (Saudável)');

SELECT setval(
  'public.m12_perfis_pareceres_id_seq',
  (SELECT coalesce(max((substring(id from '^m12p_([0-9]+)$')::int)), 0) + 1
     FROM public.m12_perfis_pareceres),
  false
);

-- =============================================================================
-- VERIFICACAO:
--   SELECT ord, statement, option_1_points, option_2_points, option_3_points FROM public.ias_questions ORDER BY ord;
--   SELECT classification FROM public.m12_perfis_pareceres;
-- =============================================================================


-- ==== 20260911_005_fix_validate_login_aluno_role.sql ====
-- =============================================================================
-- MIGRACAO: Corrigir validate_login_secure (erro "record result has no field role")
-- Data: 2026-09-11
-- Descricao: Na versao da 20260909_005, o ramo dos ALUNOS faz
--   SELECT s.id, s.name, s.email, 'Aluno' INTO result
-- e o literal 'Aluno' sem alias nao gera campo "role" no record, causando
--   record "result" has no field "role"
-- em todo login de aluno (500 no /api/auth/login). Agora a funcao usa variaveis
-- escalares tipadas (v_id..v_role) com casts explicitos, eliminando o record.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_login_secure(
  email_input text,
  password_input text,
  ip_input text DEFAULT NULL
)
RETURNS TABLE (id text, name text, email text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_temp
AS $$
DECLARE
  v_id text;
  v_name text;
  v_email text;
  v_role text;
  attempt_count integer;
  v_ip text := left(coalesce(ip_input, ''), 64);
BEGIN
  SELECT count(*) INTO attempt_count
  FROM public.login_attempts la
  WHERE lower(la.email) = lower(validate_login_secure.email_input)
    AND la.success = false
    AND la.attempted_at > now() - interval '15 minutes';

  IF attempt_count >= 5 THEN
    INSERT INTO public.login_attempts (email, success, ip_address)
    VALUES (lower(validate_login_secure.email_input), false, v_ip);
    RAISE EXCEPTION 'Conta temporariamente bloqueada devido a múltiplas tentativas. Tente novamente em 15 minutos.';
  END IF;

  v_id := NULL; v_name := NULL; v_email := NULL; v_role := NULL;

  -- 1) Profissionais
  SELECT p.id::text, p.name::text, p.email::text, p.role::text
    INTO v_id, v_name, v_email, v_role
  FROM public.professionals p
  WHERE lower(p.email) = lower(validate_login_secure.email_input)
    AND p.password_hash IS NOT NULL
    AND p.password_hash = crypt(validate_login_secure.password_input, p.password_hash)
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), true, v_ip);
    RETURN QUERY SELECT v_id, v_name, v_email, v_role;
    RETURN;
  END IF;

  -- 2) Alunos (role fixo 'Aluno', agora como valor escalar tipado)
  SELECT s.id::text, s.name::text, s.email::text, 'Aluno'::text
    INTO v_id, v_name, v_email, v_role
  FROM public.students s
  WHERE lower(s.email) = lower(validate_login_secure.email_input)
    AND s.password_hash IS NOT NULL
    AND s.password_hash = crypt(validate_login_secure.password_input, s.password_hash)
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), true, v_ip);
    RETURN QUERY SELECT v_id, v_name, v_email, v_role;
    RETURN;
  END IF;

  -- 3) Perfis
  SELECT pr.id::text, pr.name::text, pr.email::text, pr.role::text
    INTO v_id, v_name, v_email, v_role
  FROM public.profiles pr
  WHERE lower(pr.email) = lower(validate_login_secure.email_input)
    AND pr.password_hash IS NOT NULL
    AND pr.password_hash = crypt(validate_login_secure.password_input, pr.password_hash)
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), true, v_ip);
    RETURN QUERY SELECT v_id, v_name, v_email, v_role;
  ELSE
    INSERT INTO public.login_attempts (email, success, ip_address) VALUES (lower(validate_login_secure.email_input), false, v_ip);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_login_secure(text, text, text) TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO:
--   SELECT * FROM validate_login_secure('email-do-aluno@x.com', 'senha', '127.0.0.1');
--   -- deve retornar a linha com role = 'Aluno' sem erro
-- =============================================================================


-- ==== 20260911_006_rastreamento_tdah.sql ====
-- =============================================================================
-- MIGRACAO: Rastreamento do TDAH (SNAP-IV) - Modulo 13
-- Data: 2026-09-11
-- Descricao: Cria as tres tabelas do novo campo "Rastreamento TDAH":
--   - m13_snap_questions     : banco de 18 itens (escala ordinal 0-3), com bloco
--                              ('inattention' itens 1-9 / 'hyperactivity' 10-18)
--   - snap_assessments       : resultado por aluno (escores por bloco + classificacao
--                              + respondente do relato por terceiros)
--   - m13_perfis_pareceres   : parecer editavel pelo admin, por classificacao
-- RLS: apenas SELECT publico (escritas passam por /api/data com service_role).
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
--
-- NOTA: o SNAP-IV e um instrumento de RASTREAMENTO (Critério A do DSM-5-TR). Nao
-- substitui diagnostico. Critérios B-E e o alerta de uso aparecem como texto fixo
-- na interface e nos relatorios, nao sao pontuados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Banco de itens do M13
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m13_snap_questions (
  id text primary key,
  ord integer not null default 1,
  statement text not null,
  subscale text not null default 'inattention',
  created_at timestamptz default now()
);

ALTER TABLE public.m13_snap_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m13_snap_questions" ON public.m13_snap_questions;
CREATE POLICY "read m13_snap_questions" ON public.m13_snap_questions FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m13_snap_questions_id_seq;
CREATE OR REPLACE FUNCTION public.next_m13_snap_question_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'sq' || nextval('public.m13_snap_questions_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m13_snap_question_id() TO anon, authenticated, service_role;

-- Seed dos 18 itens literais do SNAP-IV (Bloco I: 1-9 Desatencao; Bloco II: 10-18 Hiperatividade/Impulsividade).
INSERT INTO public.m13_snap_questions (id, ord, statement, subscale) VALUES
  ('sq1', 1,  'Não consegue prestar muita atenção a detalhes ou comete erros por descuido nos trabalhos da escola ou tarefas.', 'inattention'),
  ('sq2', 2,  'Tem dificuldade de manter a atenção em tarefas ou atividades de lazer.', 'inattention'),
  ('sq3', 3,  'Parece não estar ouvindo quando se fala diretamente com ele.', 'inattention'),
  ('sq4', 4,  'Não segue instruções até o fim e não termina deveres de escola, tarefas ou obrigações.', 'inattention'),
  ('sq5', 5,  'Tem dificuldade para organizar tarefas e atividades.', 'inattention'),
  ('sq6', 6,  'Evita, não gosta ou se envolve contra a vontade em tarefas que exigem esforço mental prolongado.', 'inattention'),
  ('sq7', 7,  'Perde coisas necessárias para atividades (p. ex: brinquedos, deveres da escola, lápis ou livros).', 'inattention'),
  ('sq8', 8,  'Distrai-se com estímulos externos.', 'inattention'),
  ('sq9', 9,  'É esquecido em atividades do dia-a-dia.', 'inattention'),
  ('sq10', 10, 'Mexe com as mãos ou pés ou se remexe na cadeira.', 'hyperactivity'),
  ('sq11', 11, 'Sai do lugar na sala de aula ou em outras situações em que se espera que fique sentado.', 'hyperactivity'),
  ('sq12', 12, 'Corre de um lado para outro ou sobe demais nas coisas em situações em que isto é inapropriado.', 'hyperactivity'),
  ('sq13', 13, 'Tem dificuldade em brincar ou envolver-se em atividades de lazer de forma calma.', 'hyperactivity'),
  ('sq14', 14, 'Não pára ou freqüentemente está a “mil por hora”.', 'hyperactivity'),
  ('sq15', 15, 'Fala em excesso.', 'hyperactivity'),
  ('sq16', 16, 'Responde as perguntas de forma precipitada antes delas terem sido terminadas.', 'hyperactivity'),
  ('sq17', 17, 'Tem dificuldade de esperar sua vez.', 'hyperactivity'),
  ('sq18', 18, 'Interrompe os outros ou se intromete (por exemplo: intromete-se nas conversas, jogos, etc.).', 'hyperactivity')
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  'public.m13_snap_questions_id_seq',
  (SELECT coalesce(max((substring(id from '^sq([0-9]+)$')::int)), 0) + 1
     FROM public.m13_snap_questions),
  false
);

-- -----------------------------------------------------------------------------
-- 2) Resultados por aluno (Rastreamento TDAH)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.snap_assessments (
  id text primary key,
  student_id text not null,
  student_name text,
  inattention_score integer not null default 0,
  hyperactivity_score integer not null default 0,
  classification text not null,
  technical_opinion text,
  respondent text,
  date text,
  answers jsonb,
  created_at timestamptz default now()
);

ALTER TABLE public.snap_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read snap_assessments" ON public.snap_assessments;
CREATE POLICY "read snap_assessments" ON public.snap_assessments FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.snap_assessments_id_seq;
SELECT setval(
  'public.snap_assessments_id_seq',
  GREATEST(
    COALESCE((SELECT MAX(replace(id, 'Snap-', '')::bigint)
                FROM public.snap_assessments WHERE id ~ '^Snap-[0-9]+$'), 0),
    1)
);
CREATE OR REPLACE FUNCTION public.next_snap_assessment_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'Snap-' || nextval('public.snap_assessments_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_snap_assessment_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3) Parecer editavel por classificacao
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m13_perfis_pareceres (
  id text primary key,
  classification text not null,
  basic_data text,
  reflection text,
  created_at timestamptz default now()
);

ALTER TABLE public.m13_perfis_pareceres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m13_perfis_pareceres" ON public.m13_perfis_pareceres;
CREATE POLICY "read m13_perfis_pareceres" ON public.m13_perfis_pareceres FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m13_perfis_pareceres_id_seq;
CREATE OR REPLACE FUNCTION public.next_m13_parecer_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm13p_' || nextval('public.m13_perfis_pareceres_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m13_parecer_id() TO anon, authenticated, service_role;

-- Seed dos 4 pareceres (idempotente por classificacao).
INSERT INTO public.m13_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm13p_1', 'Sinais de Desatenção',
  'Pelo menos 6 dos 9 itens do Bloco I (1-9) marcados como “Bastante” ou “Demais”.',
  'Há indicativo de mais sintomas de desatenção do que o esperado para a idade. Recomenda-se observação do comportamento em casa e na escola e avaliação por profissional especializado.'
WHERE NOT EXISTS (SELECT 1 FROM public.m13_perfis_pareceres WHERE classification = 'Sinais de Desatenção');

INSERT INTO public.m13_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm13p_2', 'Sinais de Hiperatividade/Impulsividade',
  'Pelo menos 6 dos 9 itens do Bloco II (10-18) marcados como “Bastante” ou “Demais”.',
  'Há indicativo de mais sintomas de hiperatividade e impulsividade do que o esperado para a idade. Recomenda-se observação do comportamento em múltiplos contextos e avaliação por profissional especializado.'
WHERE NOT EXISTS (SELECT 1 FROM public.m13_perfis_pareceres WHERE classification = 'Sinais de Hiperatividade/Impulsividade');

INSERT INTO public.m13_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm13p_3', 'Sinais Combinados',
  'Pelo menos 6 itens clínicos em ambos os blocos (Desatenção e Hiperatividade/Impulsividade).',
  'Há indicativo de sintomas significativos nas duas dimensões, sugerindo um possível padrão combinado. Este é o quadro que mais reforça a necessidade de investigação diagnóstica completa por profissional especializado.'
WHERE NOT EXISTS (SELECT 1 FROM public.m13_perfis_pareceres WHERE classification = 'Sinais Combinados');

INSERT INTO public.m13_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm13p_4', 'Sem Indícios Significativos',
  'Menos de 6 itens clínicos em cada bloco.',
  'Os comportamentos relatados estão dentro do esperado para a idade, sem indicativos significativos de sintomas de TDAH neste rastreamento. Manter acompanhamento rotineiro do desenvolvimento.'
WHERE NOT EXISTS (SELECT 1 FROM public.m13_perfis_pareceres WHERE classification = 'Sem Indícios Significativos');

SELECT setval(
  'public.m13_perfis_pareceres_id_seq',
  (SELECT coalesce(max((substring(id from '^m13p_([0-9]+)$')::int)), 0) + 1
     FROM public.m13_perfis_pareceres),
  false
);

-- =============================================================================
-- VERIFICACAO:
--   SELECT ord, statement, subscale FROM public.m13_snap_questions ORDER BY ord;
--   SELECT classification, basic_data FROM public.m13_perfis_pareceres;
-- =============================================================================


-- ==== 20260911_007_rastreamento_tea.sql ====
-- =============================================================================
-- MIGRACAO: Rastreamento Precoce do TEA (AQ-10) - Modulo 14
-- Data: 2026-09-18
-- Descricao: Cria as tres tabelas do novo campo "Rastreamento Precoce do TEA":
--   - m14_aq10_questions  : banco de 20 itens (10 versao Crianca 4-11 / 10 versao
--                           Adolescente 12-15), escala ordinal 0-3
--   - aq10_assessments    : resultado por aluno (pontuacao 0-10 + classificacao
--                           + respondente do relato por terceiros)
--   - m14_perfis_pareceres: parecer editavel pelo admin, por classificacao
-- RLS: apenas SELECT publico (escritas passam por /api/data com service_role).
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
--
-- NOTA: o AQ-10 e um instrumento de RASTREAMENTO (triagem) e NAO substitui o
-- diagnostico formal de TEA. O alerta de uso aparece como texto fixo na
-- interface e nos relatorios. Chave oficial (SUBPAV/SMS-RJ): 1 ponto para
-- Concordo (Totalmente ou em Parte) nos itens 1, 5, 7, 10 e 1 ponto para
-- Discordo (em Parte ou Totalmente) nos itens 2, 3, 4, 6, 8, 9. Total 0-10.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Banco de itens do M14
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m14_aq10_questions (
  id text primary key,
  ord integer not null default 1,
  statement text not null,
  version text not null default 'crianca',
  created_at timestamptz default now()
);

ALTER TABLE public.m14_aq10_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m14_aq10_questions" ON public.m14_aq10_questions;
CREATE POLICY "read m14_aq10_questions" ON public.m14_aq10_questions FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m14_aq10_questions_id_seq;
CREATE OR REPLACE FUNCTION public.next_m14_aq10_question_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'aq10q' || nextval('public.m14_aq10_questions_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m14_aq10_question_id() TO anon, authenticated, service_role;

-- Seed dos 20 itens literais do AQ-10 (versao Crianca 4-11: itens 1-10; versao Adolescente 12-15: itens 11-20).
INSERT INTO public.m14_aq10_questions (id, ord, statement, version) VALUES
  ('aq10q1',  1,  'Ele/a nota muitas vezes pequenos ruídos que passam despercebidos às outras pessoas.', 'crianca'),
  ('aq10q2',  2,  'Habitualmente, ele/a concentra-se mais na imagem ou situação no seu todo, do que nos seus pequenos detalhes.', 'crianca'),
  ('aq10q3',  3,  'Quando está num grupo social, ele/a consegue facilmente seguir conversas de várias pessoas.', 'crianca'),
  ('aq10q4',  4,  'Ele/a consegue facilmente fazer mais do que uma coisa ao mesmo tempo.', 'crianca'),
  ('aq10q5',  5,  'Ele/a não sabe como manter uma conversa com os seus pares.', 'crianca'),
  ('aq10q6',  6,  'Socialmente, ele/a é bom/boa conversador/a.', 'crianca'),
  ('aq10q7',  7,  'Durante a leitura de uma história, ele/a tem dificuldades em perceber as intenções e as emoções das personagens.', 'crianca'),
  ('aq10q8',  8,  'No pré-escolar, ele/a gostava de brincar a jogos de faz-de-conta com as outras crianças.', 'crianca'),
  ('aq10q9',  9,  'Ele/a percebe facilmente o que alguém está a pensar ou a sentir, apenas olhando para a sua cara.', 'crianca'),
  ('aq10q10', 10, 'Ele/a tem dificuldades em fazer novos amigos.', 'crianca'),
  ('aq10q11', 1,  'Ele(a) sempre percebe padrões/categorias nas coisas.', 'adolescente'),
  ('aq10q12', 2,  'Ele(a) geralmente foca mais na imagem ou situação como um todo, do que nos pequenos detalhes.', 'adolescente'),
  ('aq10q13', 3,  'Quando está em um grupo social, ele(a) consegue facilmente acompanhar conversas de várias pessoas.', 'adolescente'),
  ('aq10q14', 4,  'Em caso de interrupção, ele(a) consegue voltar rapidamente ao que estava fazendo.', 'adolescente'),
  ('aq10q15', 5,  'Frequentemente, ele(a) percebe que não sabe como manter uma conversa.', 'adolescente'),
  ('aq10q16', 6,  'Socialmente, ele(a) é um(a) bom(boa) conversador(a).', 'adolescente'),
  ('aq10q17', 7,  'Quando era mais novo(a), ele(a) gostava de brincar de faz-de-conta com outras crianças.', 'adolescente'),
  ('aq10q18', 8,  'Ele(a) tem dificuldades em imaginar como seria ser outra pessoa.', 'adolescente'),
  ('aq10q19', 9,  'Ele(a) acha situações sociais fáceis.', 'adolescente'),
  ('aq10q20', 10, 'Ele(a) tem dificuldades em fazer novos amigos.', 'adolescente')
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  'public.m14_aq10_questions_id_seq',
  (SELECT coalesce(max((substring(id from '^aq10q([0-9]+)$')::int)), 0) + 1
     FROM public.m14_aq10_questions),
  false
);

-- -----------------------------------------------------------------------------
-- 2) Resultados por aluno (Rastreamento Precoce do TEA)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aq10_assessments (
  id text primary key,
  student_id text not null,
  student_name text,
  version text not null default 'crianca',
  total_score integer not null default 0,
  classification text not null,
  technical_opinion text,
  respondent text,
  date text,
  answers jsonb,
  created_at timestamptz default now()
);

ALTER TABLE public.aq10_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read aq10_assessments" ON public.aq10_assessments;
CREATE POLICY "read aq10_assessments" ON public.aq10_assessments FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.aq10_assessments_id_seq;
SELECT setval(
  'public.aq10_assessments_id_seq',
  GREATEST(
    COALESCE((SELECT MAX(replace(id, 'Aq10-', '')::bigint)
                FROM public.aq10_assessments WHERE id ~ '^Aq10-[0-9]+$'), 0),
    1)
);
CREATE OR REPLACE FUNCTION public.next_aq10_assessment_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'Aq10-' || nextval('public.aq10_assessments_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_aq10_assessment_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3) Parecer editavel por classificacao
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m14_perfis_pareceres (
  id text primary key,
  classification text not null,
  basic_data text,
  reflection text,
  created_at timestamptz default now()
);

ALTER TABLE public.m14_perfis_pareceres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m14_perfis_pareceres" ON public.m14_perfis_pareceres;
CREATE POLICY "read m14_perfis_pareceres" ON public.m14_perfis_pareceres FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m14_perfis_pareceres_id_seq;
CREATE OR REPLACE FUNCTION public.next_m14_parecer_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm14p_' || nextval('public.m14_perfis_pareceres_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m14_parecer_id() TO anon, authenticated, service_role;

-- Seed dos 2 pareceres (idempotente por classificacao).
INSERT INTO public.m14_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm14p_1', 'Traços comportamentais dentro da média da população geral',
  'Pontuação total de 0 a 6 pontos no AQ-10.',
  'A pontuação obtida situa-se dentro da média da população geral, indicando baixa probabilidade de transtorno do espectro autista neste rastreamento. Contudo, o AQ-10 é apenas um instrumento de triagem: caso persistam preocupações clínicas por parte dos pais ou responsáveis, recomenda-se prosseguir com a avaliação por profissional de saúde habilitado.'
WHERE NOT EXISTS (SELECT 1 FROM public.m14_perfis_pareceres WHERE classification = 'Traços comportamentais dentro da média da população geral');

INSERT INTO public.m14_perfis_pareceres (id, classification, basic_data, reflection)
SELECT 'm14p_2', 'Pontuação Indicativa (Alerta de Traços Elevados de TEA)',
  'Pontuação total de 7 a 10 pontos no AQ-10.',
  'A pontuação atingiu o nível de alerta para traços elevados de TEA. Recomenda-se o encaminhamento prioritário para avaliação multidisciplinar especializada (neuropediatra ou psiquiatra infantil e neuropsicólogo) para investigação diagnóstica formal. Reforça-se que o AQ-10 não substitui o diagnóstico clínico.'
WHERE NOT EXISTS (SELECT 1 FROM public.m14_perfis_pareceres WHERE classification = 'Pontuação Indicativa (Alerta de Traços Elevados de TEA)');

SELECT setval(
  'public.m14_perfis_pareceres_id_seq',
  (SELECT coalesce(max((substring(id from '^m14p_([0-9]+)$')::int)), 0) + 1
     FROM public.m14_perfis_pareceres),
  false
);

-- =============================================================================
-- VERIFICACAO:
--   SELECT ord, statement, version FROM public.m14_aq10_questions ORDER BY version, ord;
--   SELECT classification, basic_data FROM public.m14_perfis_pareceres;
-- =============================================================================