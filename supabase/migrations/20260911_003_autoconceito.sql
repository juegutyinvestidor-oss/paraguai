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
