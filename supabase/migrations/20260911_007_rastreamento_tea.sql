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