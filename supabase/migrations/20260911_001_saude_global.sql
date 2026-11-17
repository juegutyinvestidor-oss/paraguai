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
