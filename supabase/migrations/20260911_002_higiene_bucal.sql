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
