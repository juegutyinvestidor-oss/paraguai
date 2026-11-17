-- =============================================================================
-- MIGRACAO: Modulo 8 - Perguntas do Questionario Vocacional
-- Data: 2026-09-04
-- Descricao: Cria a tabela voc_questions (pergunta + 4 alternativas A/B/C/D),
--            com RLS publica (modelo anon do app), sequence de ID e o seed das
--            12 perguntas que hoje estao hardcoded na aba Avaliacoes.
--            A letra da alternativa (A/B/C/D) continua mapeando para o perfil
--            (A=Humanas, B=Exatas, C=Biologicas, D=Negocios) na avaliacao.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.voc_questions (
  id text primary key,
  ord integer not null default 1,
  statement text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  created_at timestamptz default now()
);

ALTER TABLE public.voc_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select voc_questions" ON public.voc_questions;
DROP POLICY IF EXISTS "Allow public insert voc_questions" ON public.voc_questions;
DROP POLICY IF EXISTS "Allow public update voc_questions" ON public.voc_questions;
DROP POLICY IF EXISTS "Allow public delete voc_questions" ON public.voc_questions;
CREATE POLICY "Allow public select voc_questions" ON public.voc_questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert voc_questions" ON public.voc_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update voc_questions" ON public.voc_questions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete voc_questions" ON public.voc_questions FOR DELETE USING (true);

-- Sequence de ID (prefixo 'q'). O setval e feito no FIM, apos o seed,
-- pois inserts com id explicito NAO avancam a sequence.
CREATE SEQUENCE IF NOT EXISTS public.voc_questions_id_seq;
CREATE OR REPLACE FUNCTION public.next_voc_question_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'q' || nextval('public.voc_questions_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_voc_question_id() TO anon, authenticated, service_role;

-- Seed das 12 perguntas (idempotente: on conflict do nothing)
INSERT INTO public.voc_questions (id, ord, statement, option_a, option_b, option_c, option_d) VALUES
  ('q1', 1, 'Em um trabalho de grupo na escola, você prefere:',
   'Escrever o texto e pesquisar os temas.',
   'Fazer os cálculos ou criar gráficos para os dados.',
   'Desenhar, pintar ou cuidar da apresentação visual.',
   'Organizar o grupo, os prazos e quem vai falar.'),
  ('q2', 2, 'No seu tempo livre, o que você mais gosta de fazer?',
   'Ler livros, ver filmes ou discutir ideias com amigos.',
   'Montar ou consertar coisas, ou jogar jogos de lógica.',
   'Praticar esportes, cuidar de plantas ou animais.',
   'Planejar eventos, liderar times ou negociar acordos.'),
  ('q3', 3, 'Qual destas matérias escolares você acha mais interessante?',
   'História, Literatura ou Filosofia.',
   'Matemática, Física ou Química.',
   'Biologia, Educação Física ou Artes.',
   'Geografia, Redação ou Sociologia.'),
  ('q4', 4, 'Como você costuma resolver um problema difícil?',
   'Conversando e tentando entender o lado das pessoas.',
   'Usando números, dados e fatos exatos.',
   'Criando uma solução prática e inovadora.',
   'Montando um plano de ação passo a passo.'),
  ('q5', 5, 'Você se considera uma pessoa que:',
   'Gosta de ajudar os outros e se expressar bem.',
   'É curiosa sobre como as coisas funcionam e operam.',
   'Tem muita energia e gosta de criar coisas novas.',
   'É organizada, prática e gosta de dar ordens.'),
  ('q6', 6, 'Se pudesse viajar para um desses lugares, qual escolheria?',
   'Uma cidade histórica cheia de museus e cultura.',
   'Um centro de alta tecnologia ou uma feira de ciências.',
   'Uma reserva ecológica ou um centro de artes.',
   'Uma grande metrópole de negócios e comércio.'),
  ('q7', 7, 'O que mais chama sua atenção em um projeto?',
   'O impacto que ele terá na vida das pessoas.',
   'Como ele foi construído e sua estrutura lógica.',
   'A estética e a criatividade do resultado final.',
   'Os resultados financeiros e o sucesso do projeto.'),
  ('q8', 8, 'Você prefere um ambiente de trabalho onde:',
   'Possa debater ideias e escrever.',
   'Haja rotinas claras, pesquisa e muita tecnologia.',
   'Possa expressar sua criatividade e agir livremente.',
   'Exista liderança, metas claras e decisões rápidas.'),
  ('q9', 9, 'Quando o assunto é ajudar os outros, você prefere:',
   'Ouvir, aconselhar e cuidar da saúde ou direitos.',
   'Ensinar exatas ou criar novas tecnologias para a vida.',
   'Usar a arte ou o esporte para alegrar o dia.',
   'Administrar recursos e organizar doações.'),
  ('q10', 10, 'Entre estas opções de leitura, qual você prefere?',
   'Biografias, romances ou artigos de comportamento.',
   'Revistas científicas ou livros de tecnologia e inovação.',
   'Revistas de decoração, design ou histórias em quadrinhos.',
   'Livros sobre economia, finanças ou administração.'),
  ('q11', 11, 'Como você descreveria suas habilidades?',
   'Facilidade para falar, escrever e argumentar.',
   'Boa memória para dados e facilidade com números.',
   'Muita imaginação, criatividade e intuição.',
   'Talento para convencer, liderar e planejar.'),
  ('q12', 12, 'O que é mais importante em uma futura profissão para você?',
   'Fazer a diferença na sociedade e no mundo.',
   'Descobrir como as coisas funcionam e resolver desafios.',
   'Ter liberdade para criar e inovar sempre.',
   'Alcançar sucesso financeiro e cargo de chefia.')
ON CONFLICT (id) DO NOTHING;

-- Alinha a sequência após o seed (ids explícitos não avançam a sequence)
SELECT setval(
  'public.voc_questions_id_seq',
  (SELECT coalesce(max((substring(id from '^q([0-9]+)$')::int)), 0) + 1
     FROM public.voc_questions),
  false
);

-- =============================================================================
-- VERIFICACAO:
--   SELECT ord, statement FROM public.voc_questions ORDER BY ord;
-- =============================================================================
