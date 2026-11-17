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
