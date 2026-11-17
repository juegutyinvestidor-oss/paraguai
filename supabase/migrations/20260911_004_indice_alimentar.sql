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
