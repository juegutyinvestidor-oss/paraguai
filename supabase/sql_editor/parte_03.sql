-- ==== 20260904_006_voc_questions.sql ====
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


-- ==== 20260904_007_aptidao_rls_crud.sql ====
-- =============================================================================
-- MIGRACAO: Garantir RLS CRUD (anon) em aptidao_referenciais (Modulo 1)
-- Data: 2026-09-04
-- Descricao: A tabela aptidao_referenciais nunca foi coberta pela migracao
--            20260904_001. Se no banco ela ficou apenas com politicas de
--            SELECT/INSERT, o app CONSEGUE inserir uma linha nova (upsert faz
--            INSERT), mas a EDICAO de uma linha existente (upsert faz UPDATE)
--            e a EXCLUSAO (DELETE) falham em silencio por falta de politica.
--            Este script garante SELECT/INSERT/UPDATE/DELETE publicos (modelo
--            anon do app), de forma idempotente.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

ALTER TABLE public.aptidao_referenciais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon+auth select aptidao_referenciais" ON public.aptidao_referenciais;
DROP POLICY IF EXISTS "Allow anon+auth insert aptidao_referenciais" ON public.aptidao_referenciais;
DROP POLICY IF EXISTS "Allow anon+auth update aptidao_referenciais" ON public.aptidao_referenciais;
DROP POLICY IF EXISTS "Allow anon+auth delete aptidao_referenciais" ON public.aptidao_referenciais;
-- remove nomes antigos possiveis (schema canonical)
DROP POLICY IF EXISTS "Allow public select aptidao_referenciais" ON public.aptidao_referenciais;
DROP POLICY IF EXISTS "Allow public insert aptidao_referenciais" ON public.aptidao_referenciais;
DROP POLICY IF EXISTS "Allow public update aptidao_referenciais" ON public.aptidao_referenciais;
DROP POLICY IF EXISTS "Allow public delete aptidao_referenciais" ON public.aptidao_referenciais;

CREATE POLICY "Allow anon+auth select aptidao_referenciais" ON public.aptidao_referenciais
  FOR SELECT USING (true);
CREATE POLICY "Allow anon+auth insert aptidao_referenciais" ON public.aptidao_referenciais
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon+auth update aptidao_referenciais" ON public.aptidao_referenciais
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon+auth delete aptidao_referenciais" ON public.aptidao_referenciais
  FOR DELETE USING (true);

-- =============================================================================
-- VERIFICACAO:
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname='public' AND tablename='aptidao_referenciais' ORDER BY cmd;
-- =============================================================================


-- ==== 20260904_008_fix_mojibake_config.sql ====
-- =============================================================================
-- MIGRACAO: Corrigir mojibake (UTF-8 lido como Latin-1) nos textos de config
-- Data: 2026-09-04
-- Descricao: As tabelas de configuracao dos Modulos 4/6/7 (e afins) gravaram
--            texto com acentos duplos ("GINASTICA", "Negocios" => na real
--            "GINASTICA" com acentos quebrados). Esta migracao reverte a
--            dupla-codificacao celula a celula, SEM tocar em texto ja limpo.
--            fix_mojibake(): so tenta reverter quando ha marcador de mojibake
--            (Ã/Â/á/etc. vindos de UTF-8-as-Latin1) e, se a conversao falhar
--            (ex.: emoji), devolve o original intacto.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fix_mojibake(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF t IS NULL OR t = '' THEN RETURN t; END IF;
  -- So processa quando aparenta estar duplo-codificado
  IF t !~ '[ÂÃâ]' THEN RETURN t; END IF;
  RETURN convert_from(convert_to(t, 'LATIN1'), 'UTF8');
EXCEPTION WHEN OTHERS THEN
  RETURN t; -- emoji / nao-codificavel: mantem original
END;
$$;

-- Modulo 4 - IMC
UPDATE public.m4_imc_config
   SET classification = fix_mojibake(classification),
       status         = fix_mojibake(status),
       description    = fix_mojibake(description);

-- Modulo 6 - Direcionamento por modalidade
UPDATE public.m6_modalidades_direcionamento
   SET name      = fix_mojibake(name),
       valencias = fix_mojibake(valencias),
       condition = fix_mojibake(condition),
       report    = fix_mojibake(report);

-- Modulo 6 - Diretrizes de intervencao
UPDATE public.m6_diretrizes_intervencao
   SET diretriz = fix_mojibake(diretriz),
       criterio = fix_mojibake(criterio),
       conduta  = fix_mojibake(conduta),
       objetivo = fix_mojibake(objetivo);

-- Modulo 7 - Perfis e pareceres
UPDATE public.m7_perfis_pareceres
   SET profile    = fix_mojibake(profile),
       component  = fix_mojibake(component),
       basic_data = fix_mojibake(basic_data),
       reflection = fix_mojibake(reflection);

-- (bônus) Modulo 1 e 3 e 2 e Voc - mesmas tabelas podem ter o mesmo problema
UPDATE public.aptidao_referenciais
   SET insuficiente = fix_mojibake(insuficiente),
       regular      = fix_mojibake(regular),
       bom          = fix_mojibake(bom),
       excelente    = fix_mojibake(excelente);

UPDATE public.m3_cenarios
   SET cenario   = fix_mojibake(cenario),
       condicao  = fix_mojibake(condicao),
       frequencia= fix_mojibake(frequencia),
       mensagem  = fix_mojibake(mensagem);

UPDATE public.m3_impactos
   SET tipo      = fix_mojibake(tipo),
       indicador = fix_mojibake(indicador),
       descricao = fix_mojibake(descricao);

-- Limpa a funcao auxiliar
DROP FUNCTION IF EXISTS public.fix_mojibake(text);

-- =============================================================================
-- VERIFICACAO:
--   SELECT name, valencias FROM public.m6_modalidades_direcionamento LIMIT 3;
--   SELECT profile, component FROM public.m7_perfis_pareceres LIMIT 3;
-- =============================================================================


-- ==== 20260904_009_fix_mojibake_m5.sql ====
-- =============================================================================
-- MIGRACAO: Corrigir mojibake no Modulo 5 (m5_capacidades_config)
-- Data: 2026-09-04
-- Descricao: Mesma correcao da 20260904_008, agora para o M5. Reverte UTF-8
--            lido como Latin-1 celula a celula, sem tocar em texto limpo.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fix_mojibake(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF t IS NULL OR t = '' THEN RETURN t; END IF;
  IF t !~ '[ÂÃâ]' THEN RETURN t; END IF;
  RETURN convert_from(convert_to(t, 'LATIN1'), 'UTF8');
EXCEPTION WHEN OTHERS THEN
  RETURN t;
END;
$$;

UPDATE public.m5_capacidades_config
   SET level          = fix_mojibake(level),
       health_status  = fix_mojibake(health_status),
       to_improve     = fix_mojibake(to_improve),
       recommendation = fix_mojibake(recommendation);

DROP FUNCTION IF EXISTS public.fix_mojibake(text);

-- VERIFICACAO:
--   SELECT level, health_status, recommendation FROM public.m5_capacidades_config LIMIT 5;


-- ==== 20260904_010_m5m6m7_rls.sql ====
-- =============================================================================
-- MIGRACAO: Garantir RLS CRUD (anon) em m5/m6/m7 do Questionario
-- Data: 2026-09-04
-- Descricao: Estas tabelas de configuracao nao tem CREATE canônico no codigo
--            (foram criadas a mao). Se ficaram com RLS ativo e sem politica de
--            SELECT para 'anon', o app nao enxerga as linhas no banco e recai
--            no localStorage (podendo mostrar texto antigo/corrompido mesmo
--            apos a 20260904_009). Este script habilita RLS e garante
--            SELECT/INSERT/UPDATE/DELETE publicos (modelo anon), idempotente.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- m5_capacidades_config
ALTER TABLE public.m5_capacidades_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon+auth select m5_capacidades_config" ON public.m5_capacidades_config;
DROP POLICY IF EXISTS "Allow anon+auth insert m5_capacidades_config" ON public.m5_capacidades_config;
DROP POLICY IF EXISTS "Allow anon+auth update m5_capacidades_config" ON public.m5_capacidades_config;
DROP POLICY IF EXISTS "Allow anon+auth delete m5_capacidades_config" ON public.m5_capacidades_config;
DROP POLICY IF EXISTS "Allow public select m5_capacidades_config" ON public.m5_capacidades_config;
DROP POLICY IF EXISTS "Allow public insert m5_capacidades_config" ON public.m5_capacidades_config;
DROP POLICY IF EXISTS "Allow public update m5_capacidades_config" ON public.m5_capacidades_config;
DROP POLICY IF EXISTS "Allow public delete m5_capacidades_config" ON public.m5_capacidades_config;
CREATE POLICY "Allow anon+auth select m5_capacidades_config" ON public.m5_capacidades_config FOR SELECT USING (true);
CREATE POLICY "Allow anon+auth insert m5_capacidades_config" ON public.m5_capacidades_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon+auth update m5_capacidades_config" ON public.m5_capacidades_config FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon+auth delete m5_capacidades_config" ON public.m5_capacidades_config FOR DELETE USING (true);

-- m6_modalidades_direcionamento
ALTER TABLE public.m6_modalidades_direcionamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon+auth select m6_mod_dir" ON public.m6_modalidades_direcionamento;
DROP POLICY IF EXISTS "Allow anon+auth insert m6_mod_dir" ON public.m6_modalidades_direcionamento;
DROP POLICY IF EXISTS "Allow anon+auth update m6_mod_dir" ON public.m6_modalidades_direcionamento;
DROP POLICY IF EXISTS "Allow anon+auth delete m6_mod_dir" ON public.m6_modalidades_direcionamento;
DROP POLICY IF EXISTS "Allow public select m6_modalidades_direcionamento" ON public.m6_modalidades_direcionamento;
DROP POLICY IF EXISTS "Allow public insert m6_modalidades_direcionamento" ON public.m6_modalidades_direcionamento;
DROP POLICY IF EXISTS "Allow public update m6_modalidades_direcionamento" ON public.m6_modalidades_direcionamento;
DROP POLICY IF EXISTS "Allow public delete m6_modalidades_direcionamento" ON public.m6_modalidades_direcionamento;
CREATE POLICY "Allow anon+auth select m6_mod_dir" ON public.m6_modalidades_direcionamento FOR SELECT USING (true);
CREATE POLICY "Allow anon+auth insert m6_mod_dir" ON public.m6_modalidades_direcionamento FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon+auth update m6_mod_dir" ON public.m6_modalidades_direcionamento FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon+auth delete m6_mod_dir" ON public.m6_modalidades_direcionamento FOR DELETE USING (true);

-- m6_diretrizes_intervencao
ALTER TABLE public.m6_diretrizes_intervencao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon+auth select m6_dir_int" ON public.m6_diretrizes_intervencao;
DROP POLICY IF EXISTS "Allow anon+auth insert m6_dir_int" ON public.m6_diretrizes_intervencao;
DROP POLICY IF EXISTS "Allow anon+auth update m6_dir_int" ON public.m6_diretrizes_intervencao;
DROP POLICY IF EXISTS "Allow anon+auth delete m6_dir_int" ON public.m6_diretrizes_intervencao;
DROP POLICY IF EXISTS "Allow public select m6_diretrizes_intervencao" ON public.m6_diretrizes_intervencao;
DROP POLICY IF EXISTS "Allow public insert m6_diretrizes_intervencao" ON public.m6_diretrizes_intervencao;
DROP POLICY IF EXISTS "Allow public update m6_diretrizes_intervencao" ON public.m6_diretrizes_intervencao;
DROP POLICY IF EXISTS "Allow public delete m6_diretrizes_intervencao" ON public.m6_diretrizes_intervencao;
CREATE POLICY "Allow anon+auth select m6_dir_int" ON public.m6_diretrizes_intervencao FOR SELECT USING (true);
CREATE POLICY "Allow anon+auth insert m6_dir_int" ON public.m6_diretrizes_intervencao FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon+auth update m6_dir_int" ON public.m6_diretrizes_intervencao FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon+auth delete m6_dir_int" ON public.m6_diretrizes_intervencao FOR DELETE USING (true);

-- m7_perfis_pareceres
ALTER TABLE public.m7_perfis_pareceres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon+auth select m7_perfis_pareceres" ON public.m7_perfis_pareceres;
DROP POLICY IF EXISTS "Allow anon+auth insert m7_perfis_pareceres" ON public.m7_perfis_pareceres;
DROP POLICY IF EXISTS "Allow anon+auth update m7_perfis_pareceres" ON public.m7_perfis_pareceres;
DROP POLICY IF EXISTS "Allow anon+auth delete m7_perfis_pareceres" ON public.m7_perfis_pareceres;
DROP POLICY IF EXISTS "Allow public select m7_perfis_pareceres" ON public.m7_perfis_pareceres;
DROP POLICY IF EXISTS "Allow public insert m7_perfis_pareceres" ON public.m7_perfis_pareceres;
DROP POLICY IF EXISTS "Allow public update m7_perfis_pareceres" ON public.m7_perfis_pareceres;
DROP POLICY IF EXISTS "Allow public delete m7_perfis_pareceres" ON public.m7_perfis_pareceres;
CREATE POLICY "Allow anon+auth select m7_perfis_pareceres" ON public.m7_perfis_pareceres FOR SELECT USING (true);
CREATE POLICY "Allow anon+auth insert m7_perfis_pareceres" ON public.m7_perfis_pareceres FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon+auth update m7_perfis_pareceres" ON public.m7_perfis_pareceres FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon+auth delete m7_perfis_pareceres" ON public.m7_perfis_pareceres FOR DELETE USING (true);

-- =============================================================================
-- VERIFICACAO:
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE tablename IN ('m5_capacidades_config','m6_modalidades_direcionamento',
--                       'm6_diretrizes_intervencao','m7_perfis_pareceres')
--   ORDER BY tablename, cmd;
-- =============================================================================


-- ==== 20260904_011_m7_area_careers.sql ====
-- =============================================================================
-- MIGRACAO: M7 - colunas configuraveis de Area de Interesse e Carreiras
-- Data: 2026-09-04
-- Descricao: Adiciona interest_area e careers ao m7_perfis_pareceres para que
--            Perfil/Area/Carreira da avaliacao Vocacional sejam editaveis no
--            Modulo 7 (nao mais hardcoded no codigo). Sementeia as linhas do
--            componente "Mapa de Perfis e Carreiras" com os textos atuais.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

ALTER TABLE public.m7_perfis_pareceres
  ADD COLUMN IF NOT EXISTS interest_area text,
  ADD COLUMN IF NOT EXISTS careers text;

-- Preenche as linhas "Mapa" por perfil (somente onde ainda vazias)
UPDATE public.m7_perfis_pareceres SET
  interest_area = 'Você gosta de se comunicar, ajudar as pessoas e entender a sociedade.',
  careers = 'Direito, Letras, Pedagogia, Psicologia, História, Jornalismo e Relações Internacionais.'
WHERE component = 'Mapa de Perfis e Carreiras' AND lower(btrim(profile)) = 'humanas e sociais'
  AND (interest_area IS NULL OR btrim(interest_area) = '');

UPDATE public.m7_perfis_pareceres SET
  interest_area = 'Você gosta de resolver problemas lógicos, lidar com números e entender como as tecnologias funcionam.',
  careers = 'Engenharias, Ciência da Computação, Matemática, Física, Arquitetura e Tecnologia da Informação.'
WHERE component = 'Mapa de Perfis e Carreiras' AND lower(btrim(profile)) = 'exatas e tecnológicas'
  AND (interest_area IS NULL OR btrim(interest_area) = '');

UPDATE public.m7_perfis_pareceres SET
  interest_area = 'Você é movido pela criatividade, gosta de inventar, inovar ou tem forte interesse pela vida e saúde.',
  careers = 'Medicina, Biologia, Design, Publicidade, Artes Visuais, Educação Física e Veterinária.'
WHERE component = 'Mapa de Perfis e Carreiras' AND lower(btrim(profile)) = 'biológicas e criativas'
  AND (interest_area IS NULL OR btrim(interest_area) = '');

UPDATE public.m7_perfis_pareceres SET
  interest_area = 'Você tem espírito de liderança, gosta de organizar, gerenciar recursos e traçar estratégias.',
  careers = 'Administração, Economia, Ciências Contábeis, Marketing, Logística e Gestão de Recursos Humanos.'
WHERE component = 'Mapa de Perfis e Carreiras' AND lower(btrim(profile)) = 'negócios e gestão'
  AND (interest_area IS NULL OR btrim(interest_area) = '');

UPDATE public.m7_perfis_pareceres SET
  interest_area = 'Ótimo para design de jogos ou desenvolvimento web.',
  careers = 'Híbrido'
WHERE component = 'Mapa de Perfis e Carreiras' AND profile LIKE 'Criativo e Tecnológico%'
  AND (interest_area IS NULL OR btrim(interest_area) = '');

-- =============================================================================
-- VERIFICACAO:
--   SELECT profile, component, interest_area, careers FROM public.m7_perfis_pareceres
--   WHERE component = 'Mapa de Perfis e Carreiras';
-- =============================================================================


-- ==== 20260904_012_resync_voc_seq.sql ====
-- =============================================================================
-- MIGRACAO: Re-sincronizar voc_questions_id_seq (fix do colidido 'q1')
-- Data: 2026-09-04
-- Descricao: A 20260904_006 rodava o setval ANTES do seed (tabela vazia -> seq
--            ficou em 1). Assim next_voc_question_id() devolvia 'q1' e colidia
--            com o seed 'q1' (upsert sobrescrevia; client ficava com chave
--            duplicada). A 006 ja foi corrigida; esta 012 ressincroniza a
--            sequence nos bancos onde a 006 antiga foi aplicada.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

SELECT setval(
  'public.voc_questions_id_seq',
  (SELECT coalesce(max((substring(id from '^q([0-9]+)$')::int)), 0) + 1
     FROM public.voc_questions),
  false
);

-- VERIFICACAO:
--   SELECT next_voc_question_id();  -- deve ser 'q13' (com q1..q12 no banco), NAO 'q1'
-- =============================================================================


-- ==== 20260909_001_rls_lock_sensitive_writes.sql ====
-- =============================================================================
-- MIGRACAO: Seguranca - Travar escrita anon nas tabelas sensiveis
-- Data: 2026-09-09
-- Descricao: profiles e rbac_permissions deixam de aceitar INSERT/UPDATE/DELETE
--            pela anon key. A escrita passa a ser feita exclusivamente pelas
--            rotas de API do Next.js (app/api/profile, app/api/rbac), que usam a
--            service_role e validam um token de sessao assinado (emitido em
--            /api/auth/login apos validate_login_secure).
--            Leitura (SELECT) continua liberada via anon key - o app client-side
--            depende dela no bootstrap.
--            login_attempts: leitura anon removida (validate_login_secure e
--            SECURITY DEFINER e nao depende de policy).
--            set_password: promovida a SECURITY DEFINER, pois passava a falhar
--            ao gravar password_hash em profiles sob RLS restritivo.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles: manter somente SELECT publico
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public select profiles" ON public.profiles;
CREATE POLICY "Allow public select profiles" ON public.profiles
  FOR SELECT USING (true);

-- -----------------------------------------------------------------------------
-- 2. rbac_permissions: manter somente SELECT publico
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public insert rbac_permissions" ON public.rbac_permissions;
DROP POLICY IF EXISTS "Allow public update rbac_permissions" ON public.rbac_permissions;
DROP POLICY IF EXISTS "Allow public delete rbac_permissions" ON public.rbac_permissions;
DROP POLICY IF EXISTS "Allow public select rbac_permissions" ON public.rbac_permissions;
CREATE POLICY "Allow public select rbac_permissions" ON public.rbac_permissions
  FOR SELECT USING (true);

-- -----------------------------------------------------------------------------
-- 3. login_attempts: retirar leitura anon (expoe quais contas estao sendo
--    chutadas no brute-force). A funcao de login nao precisa desta policy.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anon select login_attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Authenticated insert login_attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Service role login_attempts" ON public.login_attempts;
CREATE POLICY "Service role login_attempts" ON public.login_attempts
  FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 4. set_password: SECURITY DEFINER para gravar password_hash em
--    professionals/students/profiles mesmo com RLS restritivo.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_password(target_email text, new_password text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_temp
AS $$
BEGIN
  IF new_password IS NULL OR length(new_password) < 4 THEN
    RAISE EXCEPTION 'A senha deve possuir no minimo 4 caracteres.';
  END IF;

  UPDATE professionals SET password_hash = crypt(new_password, gen_salt('bf', 10))
   WHERE lower(email) = lower(target_email);
  IF FOUND THEN RETURN true; END IF;

  UPDATE students SET password_hash = crypt(new_password, gen_salt('bf', 10))
   WHERE lower(email) = lower(target_email);
  IF FOUND THEN RETURN true; END IF;

  UPDATE profiles SET password_hash = crypt(new_password, gen_salt('bf', 10))
   WHERE lower(email) = lower(target_email);
  IF FOUND THEN RETURN true; END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION set_password(text, text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. Seed de seguranca: garante que uma base nova comece com RBAC e perfil
--    admin padrao (o SQL Editor roda como superuser e ignora o novo lock).
--    Idempotente - nao sobrescreve dados existentes.
-- -----------------------------------------------------------------------------
insert into public.rbac_permissions (role, permissions) values
  ('Administrador', '["view:dashboard","view:contrato","view:alunos","view:presenca","view:profissionais","view:modalidades","view:avaliacoes","view:performance","view:analise-geral","view:questionario","view:perfil","view:settings","create:contrato","edit:contrato","delete:contrato","create:alunos","edit:alunos","delete:alunos","edit:presenca","create:profissionais","edit:profissionais","delete:profissionais","create:modalidades","edit:modalidades","delete:modalidades","create:avaliacoes","edit:avaliacoes","delete:avaliacoes"]'::jsonb),
  ('Gestor', '["view:dashboard","view:contrato","view:alunos","view:presenca","view:profissionais","view:modalidades","view:avaliacoes","view:performance","view:analise-geral","view:questionario","view:perfil","create:contrato","edit:contrato","create:alunos","edit:alunos","edit:presenca","create:profissionais","edit:profissionais","create:modalidades","edit:modalidades","create:avaliacoes","edit:avaliacoes","delete:avaliacoes"]'::jsonb),
  ('Professor', '["view:dashboard","view:contrato","view:alunos","view:presenca","view:modalidades","view:avaliacoes","view:performance","view:analise-geral","view:questionario","view:perfil","edit:presenca","create:avaliacoes","edit:avaliacoes","delete:avaliacoes"]'::jsonb),
  ('Estagiário', '["view:dashboard","view:contrato","view:alunos","view:presenca","view:modalidades","view:avaliacoes","view:performance","view:analise-geral","view:questionario","view:perfil","edit:presenca","create:avaliacoes","edit:avaliacoes","delete:avaliacoes"]'::jsonb),
  ('Assistente', '["view:dashboard","view:contrato","view:alunos","view:presenca","view:modalidades","view:avaliacoes","view:performance","view:analise-geral","view:questionario","view:perfil","edit:presenca","create:avaliacoes","edit:avaliacoes","delete:avaliacoes"]'::jsonb),
  ('Aluno', '["view:dashboard","view:presenca","view:modalidades","view:avaliacoes","view:performance","view:analise-geral","view:questionario","view:perfil"]'::jsonb)
on conflict (role) do nothing;

insert into public.profiles (id, name, role, email, revenue_goal)
values ('1', 'Admin Paraguai', 'Administrador', 'juegutyinvestidor@gmail.com', 50000)
on conflict (id) do nothing;

-- =============================================================================
-- VERIFICACAO:
--   SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE tablename IN ('profiles','rbac_permissions','login_attempts')
--   ORDER BY tablename, cmd;
--   -- deve mostrar apenas 1 policy de SELECT por tabela + service_role em login_attempts
--
-- Teste com anon key (deve FALAR - 42501/permission denied):
--   curl -X POST "$SUPABASE_URL/rest/v1/rbac_permissions" \
--     -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
--     -H "Content-Type: application/json" \
--     -d '{"role":"Aluno","permissions":["view:dashboard"]}'
-- =============================================================================


-- ==== 20260909_002_fix_validate_login_ambiguous_email.sql ====
-- =============================================================================
-- MIGRACAO: Corrigir validate_login_secure (erro 42702 "email is ambiguous")
-- Data: 2026-09-09
-- Descricao: A funcao tem OUT parameter chamado "email" (RETURNS TABLE) e a
--            contagem de tentativas usava "lower(email)" sem prefixo de tabela.
--            O PL/pgSQL nao consegue decidir entre o OUT param e a coluna de
--            login_attempts e aborta com 42702 -> login 100% quebrado para
--            qualquer chamador (anon ou service_role). Correcao: qualificar a
--            coluna com alias da tabela (la.email).
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_login_secure(
  email_input text,
  password_input text
)
RETURNS TABLE (id text, name text, email text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_temp
AS $$
DECLARE
  result record;
  attempt_count integer;
BEGIN
  SELECT count(*) INTO attempt_count
  FROM public.login_attempts la
  WHERE lower(la.email) = lower(validate_login_secure.email_input)
    AND la.success = false
    AND la.attempted_at > now() - interval '15 minutes';

  IF attempt_count >= 5 THEN
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(validate_login_secure.email_input), false);
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
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(validate_login_secure.email_input), true);
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
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(validate_login_secure.email_input), true);
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
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(validate_login_secure.email_input), true);
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
  ELSE
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(validate_login_secure.email_input), false);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_login_secure(text, text) TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO (no SQL Editor, troque pela sua senha real):
--   SELECT * FROM validate_login_secure('seu@email.com', 'suaSenha');
--   -- deve retornar 1 linha (id, name, email, role) sem erro 42702
-- =============================================================================


-- ==== 20260909_003_rls_lock_all_writes.sql ====
-- =============================================================================
-- MIGRACAO: Seguranca (ambiente real) - Escrita apenas via rotas server-side
-- Data: 2026-09-09
-- Descricao: Remove TODAS as policies das tabelas de negocio e recria apenas
--            SELECT publico. INSERT/UPDATE/DELETE passam a existir somente
--            pelas rotas /api/data (e /api/profile, /api/rbac, /api/avatar),
--            que exigem token de sessao e conferem o RBAC no servidor.
--            Storage: bucket avatars perde escrita anon (upload/delete passam
--            por /api/avatar com service_role; leitura via URL publica segue
--            funcionando pois o bucket e public).
-- NAO tocado: data_access_logs e consent_records (auditoria/consent LGPD
--            gravam antes/dependem do fluxo publico), login_attempts (001).
-- ATENCAO: Execute no Supabase SQL Editor DEPOIS de publicar o codigo novo
--            (rotas /api/* + facade) e REINICIE o servidor. Faca logout/login.
-- =============================================================================

DO $$
DECLARE
  r record;
  locked_tables text[] := ARRAY[
    'students','professionals','modalities','imc_assessments','motor_assessments',
    'sport_assessments','vocational_assessments','contratos','attendance_records',
    'aptidao_referenciais','m2_modalidades_config','questionarios_respostas',
    'm3_cenarios','m3_impactos','performance_reports','m4_imc_config',
    'm5_capacidades_config','m6_modalidades_direcionamento','m6_diretrizes_intervencao',
    'm7_perfis_pareceres','voc_questions'
  ];
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY (locked_tables)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Recriar somente leitura publica para o app (leitura e feita direto pela anon key)
CREATE POLICY "read students"               ON public.students                        FOR SELECT USING (true);
CREATE POLICY "read professionals"          ON public.professionals                  FOR SELECT USING (true);
CREATE POLICY "read modalities"             ON public.modalities                     FOR SELECT USING (true);
CREATE POLICY "read imc"                    ON public.imc_assessments                FOR SELECT USING (true);
CREATE POLICY "read motor"                  ON public.motor_assessments              FOR SELECT USING (true);
CREATE POLICY "read sport"                  ON public.sport_assessments              FOR SELECT USING (true);
CREATE POLICY "read vocational"             ON public.vocational_assessments         FOR SELECT USING (true);
CREATE POLICY "read contratos"              ON public.contratos                      FOR SELECT USING (true);
CREATE POLICY "read attendance"             ON public.attendance_records             FOR SELECT USING (true);
CREATE POLICY "read aptidao_referenciais"   ON public.aptidao_referenciais           FOR SELECT USING (true);
CREATE POLICY "read m2_modalidades_config"  ON public.m2_modalidades_config          FOR SELECT USING (true);
CREATE POLICY "read questionarios_respostas" ON public.questionarios_respostas       FOR SELECT USING (true);
CREATE POLICY "read m3_cenarios"            ON public.m3_cenarios                    FOR SELECT USING (true);
CREATE POLICY "read m3_impactos"            ON public.m3_impactos                    FOR SELECT USING (true);
CREATE POLICY "read performance"            ON public.performance_reports            FOR SELECT USING (true);
CREATE POLICY "read m4_imc_config"          ON public.m4_imc_config                  FOR SELECT USING (true);
CREATE POLICY "read m5_capacidades_config"  ON public.m5_capacidades_config          FOR SELECT USING (true);
CREATE POLICY "read m6_mod_dir"             ON public.m6_modalidades_direcionamento  FOR SELECT USING (true);
CREATE POLICY "read m6_dir_int"             ON public.m6_diretrizes_intervencao      FOR SELECT USING (true);
CREATE POLICY "read m7_perfis_pareceres"    ON public.m7_perfis_pareceres            FOR SELECT USING (true);
CREATE POLICY "read voc_questions"          ON public.voc_questions                  FOR SELECT USING (true);

-- -----------------------------------------------------------------------------
-- Storage avatars: escrita somente via service_role (/api/avatar).
-- Remove toda policy "Avatares:" que nao seja SELECT e recria a leitura.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'Avatares:%'
      AND cmd <> 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Avatares: leitura anon" ON storage.objects;
CREATE POLICY "Avatares: leitura anon" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- =============================================================================
-- VERIFICACAO:
--   SELECT tablename, cmd, count(*) FROM pg_policies
--   WHERE schemaname='public' AND tablename IN
--     ('students','professionals','contratos','vocational_assessments')
--   GROUP BY tablename, cmd;   -- apenas cmd = SELECT
--
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname='storage' AND policyname LIKE 'Avatares:%';  -- apenas SELECT
--
-- Teste com anon key (deve falhar com 42501):
--   curl -X POST "$SUPABASE_URL/rest/v1/students" -H "apikey: $ANON_KEY" \
--     -H "Authorization: Bearer $ANON_KEY" -H "Content-Type: application/json" \
--     -d '{"id":"ZZ_TESTE_RLS","name":"teste"}'
-- =============================================================================
