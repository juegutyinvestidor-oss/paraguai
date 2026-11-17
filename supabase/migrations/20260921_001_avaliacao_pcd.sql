-- =============================================================================
-- MIGRACAO: Avaliacao PCD - Modulo 15 (Qualidade Motora PCD)
-- Data: 2026-09-21
-- Descricao: Protocolo de Avaliacao Fisica e Direcionamento Esportivo para
--            criancas e adolescentes com deficiencia (4 a 18 anos).
--            Cria as tabelas de configuracao (triagem, adaptacao por grupo,
--            faixas de nota, matriz de pesos, funil qualitativo) + a tabela
--            de avaliacoes por aluno (pcd_assessments).
-- RLS: apenas SELECT publico (escritas passam por /api/data com service_role),
--      no mesmo modelo das tabelas travadas pela 20260909_003.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Grupos de triagem (Passo 1 do protocolo)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m15_pcd_grupos (
  id text primary key,
  grupo integer not null unique,
  nome text not null,
  descricao text,
  laudo text,
  created_at timestamptz default now()
);

ALTER TABLE public.m15_pcd_grupos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m15_pcd_grupos" ON public.m15_pcd_grupos;
CREATE POLICY "read m15_pcd_grupos" ON public.m15_pcd_grupos FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m15_pcd_grupos_id_seq;
CREATE OR REPLACE FUNCTION public.next_m15_grupo_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'pg' || nextval('public.m15_pcd_grupos_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m15_grupo_id() TO anon, authenticated, service_role;

INSERT INTO public.m15_pcd_grupos (id, grupo, nome, descricao, laudo) VALUES
  ('pg1', 1, 'Deficiência Física (Locomoção Independente)',
   'Criança anda/caminha de forma autônoma ou com auxílio leve (bengala, órtese), com acometimento estrutural sem alteração neurológica central centralizada.',
   'Diagnóstico clínico formal + classificação de gravidade. Detalhar nível de amputação se houver.'),
  ('pg2', 2, 'Deficiência Física (Cadeira de Rodas)',
   'Cadeira de rodas como mecanismo principal ou exclusivo de locomoção. Testes adaptados ou substituídos para membros superiores.',
   'Diagnóstico clínico formal + laudo médico. Confirmar uso de cadeira como meio principal de locomoção.'),
  ('pg3', 3, 'Paralisia Cerebral (GMFCS)',
   'Classificação obrigatória prévia pela Escala GMFCS (níveis I a V) antes de delimitar qualquer teste.',
   'Aplicação obrigatória e prévia da Escala GMFCS (I a V) + laudo médico.'),
  ('pg4', 4, 'Deficiência Visual (B1-B3)',
   'Estrutura motora global preservada. Ajustes na instrução verbal, cinestésica e orientação espacial. Classificação B1 (cegueira total) a B3 (baixa visão).',
   'Mapeamento do nível de acuidade visual (B1, B2 ou B3) + laudo oftalmológico.'),
  ('pg5', 5, 'Deficiência Auditiva',
   'Funções motoras e de orientação espacial preservadas. Adaptações exclusivas nos canais de comunicação (estímulos visuais, Libras).',
   'Identificação precisa do grau de perda auditiva (leve, moderada, severa ou profunda) + laudo audiológico.'),
  ('pg6', 6, 'Deficiência Intelectual',
   'Capacidades sensoriais e motoras estruturalmente íntegras. Barreira primária na cognição e compreensão tática das tarefas.',
   'Nível de funcionamento adaptativo (leve, moderado ou severo) respaldado exclusivamente por laudo psicológico ou pedagógico oficial.')
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  'public.m15_pcd_grupos_id_seq',
  (SELECT coalesce(max((substring(id from '^pg([0-9]+)$')::int)), 0) + 1
     FROM public.m15_pcd_grupos),
  false
);

-- -----------------------------------------------------------------------------
-- 2) Adaptacao por grupo (Passo 3 - quadro-resumo do protocolo)
--    teste: 'abdominal' | 'velocidade' | 'agilidade' | 'salto' | 'flexao'
--    status: 'Padrão' | 'Adaptado' | 'Substituído' | 'Não aplicável'
--    detalhe: detalhamento dentro do grupo (ex.: 'GMFCS I-II', '' = default)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m15_pcd_adaptacoes (
  id text primary key,
  grupo integer not null,
  detalhe text not null default '',
  teste text not null,
  status text not null,
  instrucao text,
  created_at timestamptz default now()
);

ALTER TABLE public.m15_pcd_adaptacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m15_pcd_adaptacoes" ON public.m15_pcd_adaptacoes;
CREATE POLICY "read m15_pcd_adaptacoes" ON public.m15_pcd_adaptacoes FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m15_pcd_adaptacoes_id_seq;
CREATE OR REPLACE FUNCTION public.next_m15_adaptacao_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'pa' || nextval('public.m15_pcd_adaptacoes_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m15_adaptacao_id() TO anon, authenticated, service_role;

INSERT INTO public.m15_pcd_adaptacoes (id, grupo, detalhe, teste, status, instrucao) VALUES
  -- Grupo 1 - Fisica independente: tudo Padrao
  ('pa_g1_abd',  1, '', 'abdominal',   'Padrão', 'Prancha ventral isométrica, teto de 30s.'),
  ('pa_g1_vel',  1, '', 'velocidade',  'Padrão', 'Corrida 20m com aceleração máxima.'),
  ('pa_g1_agi',  1, '', 'agilidade',   'Padrão', 'Shuttle run 9,14m com dois blocos.'),
  ('pa_g1_sal',  1, '', 'salto',       'Padrão', 'Salto horizontal em base bilateral. Avaliar criteriosamente a viabilidade articular caso haja severo acometimento de membros inferiores.'),
  ('pa_g1_fle',  1, '', 'flexao',      'Padrão', 'Flexão de braço; versão joelhos apoiados se necessário.'),
  -- Grupo 2 - Cadeira de rodas
  ('pa_g2_abd',  2, '', 'abdominal',   'Adaptado', 'Mediante suporte, encosto ou estabilização mecânica de tronco.'),
  ('pa_g2_vel',  2, '', 'velocidade',  'Substituído', 'Substituir por propulsão rápida em cadeira de rodas ao longo dos 20 metros cronometrados.'),
  ('pa_g2_agi',  2, '', 'agilidade',   'Adaptado', 'Percurso sinuoso com propulsão manual ou substituição completa por teste de agilidade em cadeira.'),
  ('pa_g2_sal',  2, '', 'salto',       'Adaptado', 'Realizar padrão quando houver capacidade funcional e segurança. Não realizar quando o comprometimento dos membros inferiores tornar o salto inseguro ou inviável; nesse caso, considerar teste alternativo de potência dos membros inferiores, quando aplicável.'),
  ('pa_g2_fle',  2, '', 'flexao',      'Padrão', 'Aplicável na íntegra (membros superiores tendem a estar preservados e funcionais).'),
  -- Grupo 3 - Paralisia cerebral (GMFCS I e II)
  ('pa_g3_abd_a', 3, 'GMFCS I-II', 'abdominal',  'Padrão', 'Aplicável com ajustes mínimos baseados no hemicorpo de maior dominância/espasticidade.'),
  ('pa_g3_vel_a', 3, 'GMFCS I-II', 'velocidade', 'Padrão', 'Aplicável com ajustes mínimos baseados no hemicorpo de maior dominância/espasticidade.'),
  ('pa_g3_agi_a', 3, 'GMFCS I-II', 'agilidade',  'Padrão', 'Aplicável com ajustes mínimos baseados no hemicorpo de maior dominância/espasticidade.'),
  ('pa_g3_sal_a', 3, 'GMFCS I-II', 'salto',      'Padrão', 'Aplicável com ajustes mínimos baseados no hemicorpo de maior dominância/espasticidade.'),
  ('pa_g3_fle_a', 3, 'GMFCS I-II', 'flexao',     'Padrão', 'Aplicável com ajustes mínimos baseados no hemicorpo de maior dominância/espasticidade.'),
  -- Grupo 3 - Paralisia cerebral (GMFCS III)
  ('pa_g3_abd_b', 3, 'GMFCS III', 'abdominal',  'Padrão', 'Aplicável; exige avaliação individual prévia.'),
  ('pa_g3_vel_b', 3, 'GMFCS III', 'velocidade', 'Adaptado', 'Exige avaliação individual prévia (deambulação com apoio instrumental).'),
  ('pa_g3_agi_b', 3, 'GMFCS III', 'agilidade',  'Adaptado', 'Exige avaliação individual prévia (deambulação com apoio instrumental).'),
  ('pa_g3_sal_b', 3, 'GMFCS III', 'salto',      'Adaptado', 'Realizar somente quando houver capacidade funcional e segurança. Quando não for viável, considerar teste alternativo de potência dos membros inferiores.'),
  ('pa_g3_fle_b', 3, 'GMFCS III', 'flexao',     'Padrão', 'Aplicável.'),
  -- Grupo 3 - Paralisia cerebral (GMFCS IV e V)
  ('pa_g3_abd_c', 3, 'GMFCS IV-V', 'abdominal',  'Adaptado', 'Realizável apenas sob suporte e alta tolerância postural.'),
  ('pa_g3_vel_c', 3, 'GMFCS IV-V', 'velocidade', 'Não aplicável', 'Priorizar avaliação funcional clínica conjunta com fisioterapia.'),
  ('pa_g3_agi_c', 3, 'GMFCS IV-V', 'agilidade',  'Não aplicável', 'Priorizar avaliação funcional clínica conjunta com fisioterapia.'),
  ('pa_g3_sal_c', 3, 'GMFCS IV-V', 'salto',      'Não aplicável', 'Priorizar avaliação funcional clínica conjunta com fisioterapia.'),
  ('pa_g3_fle_c', 3, 'GMFCS IV-V', 'flexao',     'Adaptado', 'Padrão ou adaptado quando houver capacidade funcional dos membros superiores; caso contrário, priorizar avaliação funcional clínica com fisioterapia.'),
  -- Grupo 4 - Visual: movimentos identicos, ajustes de instrucao/orientacao
  ('pa_g4_abd', 4, '', 'abdominal',   'Adaptado', 'Movimento idêntico ao padrão; demarcação tátil e comando verbal claro.'),
  ('pa_g4_vel', 4, '', 'velocidade',  'Adaptado', 'Guia humano ou sistema de corda-guia; comando sonoro claro; demarcação tátil na linha de partida.'),
  ('pa_g4_agi', 4, '', 'agilidade',   'Adaptado', 'Guia humano ou corda-guia; demarcação tátil e comandos sonoros claros.'),
  ('pa_g4_sal', 4, '', 'salto',       'Adaptado', 'Linha de partida com demarcação tátil por fita em relevo; comando sonoro claro.'),
  ('pa_g4_fle', 4, '', 'flexao',      'Padrão', 'Instrução verbal e cinestésica; demonstração física.'),
  -- Grupo 5 - Auditiva: execucao padrao, sinais visuais
  ('pa_g5_abd', 5, '', 'abdominal',   'Padrão', 'Execução padrão; largada com estímulo visual nítido (bandeira, luz, gesto).'),
  ('pa_g5_vel', 5, '', 'velocidade',  'Padrão', 'Execução padrão; substituir sinal sonoro por estímulo visual nítido.'),
  ('pa_g5_agi', 5, '', 'agilidade',   'Padrão', 'Execução padrão; estímulos visuais nítidos.'),
  ('pa_g5_sal', 5, '', 'salto',       'Padrão', 'Execução padrão; comando visual.'),
  ('pa_g5_fle', 5, '', 'flexao',      'Padrão', 'Execução padrão; ampla demonstração visual e suporte via Libras quando disponível.'),
  -- Grupo 6 - Intelectual: padrao de movimento, apoio cognitivo
  ('pa_g6_abd', 6, '', 'abdominal',   'Padrão', 'Demonstração física repetida e fragmentação das instruções em passos simples.'),
  ('pa_g6_vel', 6, '', 'velocidade',  'Padrão', 'Demonstração física repetida; tentativa prática extra não pontuada.'),
  ('pa_g6_agi', 6, '', 'agilidade',   'Padrão', 'Demonstração física repetida; retirada gradual de apoio verbal.'),
  ('pa_g6_sal', 6, '', 'salto',       'Padrão', 'Demonstração física repetida; tentativa prática extra não pontuada.'),
  ('pa_g6_fle', 6, '', 'flexao',      'Padrão', 'Demonstração física repetida; fragmentação das instruções em passos simples.')
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  'public.m15_pcd_adaptacoes_id_seq',
  GREATEST((SELECT count(*) FROM public.m15_pcd_adaptacoes) + 1, 1),
  false
);

-- -----------------------------------------------------------------------------
-- 3) Faixas de nota relativa 1..3 por teste x grupo (Etapa B do protocolo)
--    menor-melhor (velocidade, agilidade): nota3 = [0, max3), nota2 = [max3, max2), nota1 = [max2, inf)
--    maior-melhor (abdominal, salto, flexao): nota1 = [0, max1), nota2 = [max1, max2), nota3 = [max2, inf)
--    min_val/max_val guardam os limites do intervalo de cada nota.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m15_pcd_faixas (
  id text primary key,
  grupo integer not null,
  detalhe text not null default '',
  teste text not null,
  nota integer not null,
  min_val numeric,
  max_val numeric,
  created_at timestamptz default now()
);

ALTER TABLE public.m15_pcd_faixas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m15_pcd_faixas" ON public.m15_pcd_faixas;
CREATE POLICY "read m15_pcd_faixas" ON public.m15_pcd_faixas FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m15_pcd_faixas_id_seq;
CREATE OR REPLACE FUNCTION public.next_m15_faixa_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'pf' || nextval('public.m15_pcd_faixas_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m15_faixa_id() TO anon, authenticated, service_role;

-- abdominal: maior-melhor (segundos, teto 30)
INSERT INTO public.m15_pcd_faixas (id, grupo, detalhe, teste, nota, min_val, max_val) VALUES
  ('pf_g1_abd_1', 1, '', 'abdominal', 1, 0, 15), ('pf_g1_abd_2', 1, '', 'abdominal', 2, 15, 25), ('pf_g1_abd_3', 1, '', 'abdominal', 3, 25, NULL),
  ('pf_g2_abd_1', 2, '', 'abdominal', 1, 0, 10), ('pf_g2_abd_2', 2, '', 'abdominal', 2, 10, 20), ('pf_g2_abd_3', 2, '', 'abdominal', 3, 20, NULL),
  ('pf_g3_abd_1', 3, 'GMFCS I-II', 'abdominal', 1, 0, 12), ('pf_g3_abd_2', 3, 'GMFCS I-II', 'abdominal', 2, 12, 22), ('pf_g3_abd_3', 3, 'GMFCS I-II', 'abdominal', 3, 22, NULL),
  ('pf_g3_abd_4', 3, 'GMFCS III', 'abdominal', 1, 0, 8),  ('pf_g3_abd_5', 3, 'GMFCS III', 'abdominal', 2, 8, 16),  ('pf_g3_abd_6', 3, 'GMFCS III', 'abdominal', 3, 16, NULL),
  ('pf_g3_abd_7', 3, 'GMFCS IV-V', 'abdominal', 1, 0, 5), ('pf_g3_abd_8', 3, 'GMFCS IV-V', 'abdominal', 2, 5, 12),  ('pf_g3_abd_9', 3, 'GMFCS IV-V', 'abdominal', 3, 12, NULL),
  ('pf_g4_abd_1', 4, '', 'abdominal', 1, 0, 15), ('pf_g4_abd_2', 4, '', 'abdominal', 2, 15, 25), ('pf_g4_abd_3', 4, '', 'abdominal', 3, 25, NULL),
  ('pf_g5_abd_1', 5, '', 'abdominal', 1, 0, 15), ('pf_g5_abd_2', 5, '', 'abdominal', 2, 15, 25), ('pf_g5_abd_3', 5, '', 'abdominal', 3, 25, NULL),
  ('pf_g6_abd_1', 6, '', 'abdominal', 1, 0, 10), ('pf_g6_abd_2', 6, '', 'abdominal', 2, 10, 20), ('pf_g6_abd_3', 6, '', 'abdominal', 3, 20, NULL)
ON CONFLICT (id) DO NOTHING;

-- velocidade: menor-melhor (segundos, 1 casa decimal)
INSERT INTO public.m15_pcd_faixas (id, grupo, detalhe, teste, nota, min_val, max_val) VALUES
  ('pf_g1_vel_1', 1, '', 'velocidade', 1, 5.2, NULL), ('pf_g1_vel_2', 1, '', 'velocidade', 2, 4.5, 5.2), ('pf_g1_vel_3', 1, '', 'velocidade', 3, 0, 4.5),
  ('pf_g2_vel_1', 2, '', 'velocidade', 1, 7.5, NULL), ('pf_g2_vel_2', 2, '', 'velocidade', 2, 6.5, 7.5), ('pf_g2_vel_3', 2, '', 'velocidade', 3, 0, 6.5),
  ('pf_g3_vel_1', 3, 'GMFCS I-II', 'velocidade', 1, 6.5, NULL), ('pf_g3_vel_2', 3, 'GMFCS I-II', 'velocidade', 2, 5.5, 6.5), ('pf_g3_vel_3', 3, 'GMFCS I-II', 'velocidade', 3, 0, 5.5),
  ('pf_g3_vel_4', 3, 'GMFCS III', 'velocidade', 1, 8.5, NULL),  ('pf_g3_vel_5', 3, 'GMFCS III', 'velocidade', 2, 7.0, 8.5),  ('pf_g3_vel_6', 3, 'GMFCS III', 'velocidade', 3, 0, 7.0),
  ('pf_g4_vel_1', 4, '', 'velocidade', 1, 5.8, NULL), ('pf_g4_vel_2', 4, '', 'velocidade', 2, 4.8, 5.8), ('pf_g4_vel_3', 4, '', 'velocidade', 3, 0, 4.8),
  ('pf_g5_vel_1', 5, '', 'velocidade', 1, 5.2, NULL), ('pf_g5_vel_2', 5, '', 'velocidade', 2, 4.5, 5.2), ('pf_g5_vel_3', 5, '', 'velocidade', 3, 0, 4.5),
  ('pf_g6_vel_1', 6, '', 'velocidade', 1, 6.0, NULL), ('pf_g6_vel_2', 6, '', 'velocidade', 2, 5.0, 6.0), ('pf_g6_vel_3', 6, '', 'velocidade', 3, 0, 5.0)
ON CONFLICT (id) DO NOTHING;

-- agilidade: menor-melhor (segundos, 1 casa decimal)
INSERT INTO public.m15_pcd_faixas (id, grupo, detalhe, teste, nota, min_val, max_val) VALUES
  ('pf_g1_agi_1', 1, '', 'agilidade', 1, 9.0, NULL), ('pf_g1_agi_2', 1, '', 'agilidade', 2, 8.0, 9.0), ('pf_g1_agi_3', 1, '', 'agilidade', 3, 0, 8.0),
  ('pf_g2_agi_1', 2, '', 'agilidade', 1, 13.0, NULL), ('pf_g2_agi_2', 2, '', 'agilidade', 2, 11.0, 13.0), ('pf_g2_agi_3', 2, '', 'agilidade', 3, 0, 11.0),
  ('pf_g3_agi_1', 3, 'GMFCS I-II', 'agilidade', 1, 11.0, NULL), ('pf_g3_agi_2', 3, 'GMFCS I-II', 'agilidade', 2, 9.5, 11.0), ('pf_g3_agi_3', 3, 'GMFCS I-II', 'agilidade', 3, 0, 9.5),
  ('pf_g3_agi_4', 3, 'GMFCS III', 'agilidade', 1, 14.5, NULL),  ('pf_g3_agi_5', 3, 'GMFCS III', 'agilidade', 2, 12.0, 14.5),  ('pf_g3_agi_6', 3, 'GMFCS III', 'agilidade', 3, 0, 12.0),
  ('pf_g4_agi_1', 4, '', 'agilidade', 1, 10.2, NULL), ('pf_g4_agi_2', 4, '', 'agilidade', 2, 8.8, 10.2), ('pf_g4_agi_3', 4, '', 'agilidade', 3, 0, 8.8),
  ('pf_g5_agi_1', 5, '', 'agilidade', 1, 9.0, NULL), ('pf_g5_agi_2', 5, '', 'agilidade', 2, 8.0, 9.0), ('pf_g5_agi_3', 5, '', 'agilidade', 3, 0, 8.0),
  ('pf_g6_agi_1', 6, '', 'agilidade', 1, 10.5, NULL), ('pf_g6_agi_2', 6, '', 'agilidade', 2, 9.0, 10.5), ('pf_g6_agi_3', 6, '', 'agilidade', 3, 0, 9.0)
ON CONFLICT (id) DO NOTHING;

-- salto: maior-melhor (centimetros, 1 casa decimal)
INSERT INTO public.m15_pcd_faixas (id, grupo, detalhe, teste, nota, min_val, max_val) VALUES
  ('pf_g1_sal_1', 1, '', 'salto', 1, 0, 100), ('pf_g1_sal_2', 1, '', 'salto', 2, 100, 130), ('pf_g1_sal_3', 1, '', 'salto', 3, 130, NULL),
  ('pf_g3_sal_1', 3, 'GMFCS I-II', 'salto', 1, 0, 80),  ('pf_g3_sal_2', 3, 'GMFCS I-II', 'salto', 2, 80, 110),  ('pf_g3_sal_3', 3, 'GMFCS I-II', 'salto', 3, 110, NULL),
  ('pf_g4_sal_1', 4, '', 'salto', 1, 0, 100), ('pf_g4_sal_2', 4, '', 'salto', 2, 100, 130), ('pf_g4_sal_3', 4, '', 'salto', 3, 130, NULL),
  ('pf_g5_sal_1', 5, '', 'salto', 1, 0, 100), ('pf_g5_sal_2', 5, '', 'salto', 2, 100, 130), ('pf_g5_sal_3', 5, '', 'salto', 3, 130, NULL),
  ('pf_g6_sal_1', 6, '', 'salto', 1, 0, 90),  ('pf_g6_sal_2', 6, '', 'salto', 2, 90, 120),  ('pf_g6_sal_3', 6, '', 'salto', 3, 120, NULL)
ON CONFLICT (id) DO NOTHING;

-- flexao: maior-melhor (repeticoes)
INSERT INTO public.m15_pcd_faixas (id, grupo, detalhe, teste, nota, min_val, max_val) VALUES
  ('pf_g1_fle_1', 1, '', 'flexao', 1, 0, 8),  ('pf_g1_fle_2', 1, '', 'flexao', 2, 8, 15),  ('pf_g1_fle_3', 1, '', 'flexao', 3, 15, NULL),
  ('pf_g2_fle_1', 2, '', 'flexao', 1, 0, 8),  ('pf_g2_fle_2', 2, '', 'flexao', 2, 8, 15),  ('pf_g2_fle_3', 2, '', 'flexao', 3, 15, NULL),
  ('pf_g3_fle_1', 3, 'GMFCS I-II', 'flexao', 1, 0, 6),  ('pf_g3_fle_2', 3, 'GMFCS I-II', 'flexao', 2, 6, 12),  ('pf_g3_fle_3', 3, 'GMFCS I-II', 'flexao', 3, 12, NULL),
  ('pf_g3_fle_4', 3, 'GMFCS III', 'flexao', 1, 0, 5),   ('pf_g3_fle_5', 3, 'GMFCS III', 'flexao', 2, 5, 10),   ('pf_g3_fle_6', 3, 'GMFCS III', 'flexao', 3, 10, NULL),
  ('pf_g4_fle_1', 4, '', 'flexao', 1, 0, 8),  ('pf_g4_fle_2', 4, '', 'flexao', 2, 8, 15),  ('pf_g4_fle_3', 4, '', 'flexao', 3, 15, NULL),
  ('pf_g5_fle_1', 5, '', 'flexao', 1, 0, 8),  ('pf_g5_fle_2', 5, '', 'flexao', 2, 8, 15),  ('pf_g5_fle_3', 5, '', 'flexao', 3, 15, NULL),
  ('pf_g6_fle_1', 6, '', 'flexao', 1, 0, 7),  ('pf_g6_fle_2', 6, '', 'flexao', 2, 7, 13),  ('pf_g6_fle_3', 6, '', 'flexao', 3, 13, NULL)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  'public.m15_pcd_faixas_id_seq',
  GREATEST((SELECT count(*) FROM public.m15_pcd_faixas) + 1, 1),
  false
);

-- -----------------------------------------------------------------------------
-- 4) Matriz de Pesos de Exigencia Neuromotora (Etapa A do protocolo)
--    peso 1..3 por valencia: vel_agil / forca_exp / membros_sup / core
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m15_pcd_modalidades (
  id text primary key,
  nome text not null,
  peso_vel_agil integer not null default 1,
  peso_forca_exp integer not null default 1,
  peso_membros_sup integer not null default 1,
  peso_core integer not null default 1,
  descricao text,
  created_at timestamptz default now()
);

ALTER TABLE public.m15_pcd_modalidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m15_pcd_modalidades" ON public.m15_pcd_modalidades;
CREATE POLICY "read m15_pcd_modalidades" ON public.m15_pcd_modalidades FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m15_pcd_modalidades_id_seq;
CREATE OR REPLACE FUNCTION public.next_m15_modalidade_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'pm' || nextval('public.m15_pcd_modalidades_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m15_modalidade_id() TO anon, authenticated, service_role;

INSERT INTO public.m15_pcd_modalidades (id, nome, peso_vel_agil, peso_forca_exp, peso_membros_sup, peso_core, descricao) VALUES
  ('pm1', 'Atletismo (Velocidade)', 3, 3, 1, 2, 'Velocidade e potência de membros inferiores são cruciais.'),
  ('pm2', 'Basquete / Rugby em Cadeira', 3, 2, 3, 2, 'Deslocamento, potência e uso intenso de membros superiores sobre a cadeira.'),
  ('pm3', 'Natação Adaptada', 2, 2, 3, 3, 'Força de membros superiores e estabilidade central do tronco determinam o êxito.'),
  ('pm4', 'Boccia (Bocha Adaptada)', 1, 1, 1, 3, 'Precisão com estabilidade de tronco; baixa exigência de deslocamento.'),
  ('pm5', 'Goalball / Futebol de 5', 3, 2, 2, 2, 'Deslocamento orientado, agilidade e velocidade de reação.'),
  ('pm6', 'Halterofilismo Adaptado', 1, 3, 3, 2, 'Potência de membros superiores e inferiores com estabilidade de tronco.')
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  'public.m15_pcd_modalidades_id_seq',
  GREATEST((SELECT count(*) FROM public.m15_pcd_modalidades) + 1, 1),
  false
);

-- -----------------------------------------------------------------------------
-- 5) Funil Qualitativo de Decisao (Etapa D do protocolo)
--    momentos: 1 = Filtro Clinico/Grupo, 2 = Filtro Cognitivo/Sensorial,
--              3 = Filtro de Preferencia e Desejo Pessoal
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.m15_pcd_funil (
  id text primary key,
  grupo integer not null,
  momento integer not null,
  titulo text not null,
  regra text,
  created_at timestamptz default now()
);

ALTER TABLE public.m15_pcd_funil ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read m15_pcd_funil" ON public.m15_pcd_funil;
CREATE POLICY "read m15_pcd_funil" ON public.m15_pcd_funil FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.m15_pcd_funil_id_seq;
CREATE OR REPLACE FUNCTION public.next_m15_funil_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'pu' || nextval('public.m15_pcd_funil_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m15_funil_id() TO anon, authenticated, service_role;

INSERT INTO public.m15_pcd_funil (id, grupo, momento, titulo, regra) VALUES
  ('pu1_1', 1, 1, 'Filtro Clínico/Grupo', 'Adequação postural intrínseca: avaliar articulações de membros inferiores antes do salto; liberar testes conforme limitação estrutural.'),
  ('pu1_2', 1, 2, 'Filtro Cognitivo/Sensorial', 'Complexidade inerente às regras: instruções simples e demonstração prévia para compreensão das tarefas.'),
  ('pu1_3', 1, 3, 'Filtro de Preferência e Desejo Pessoal', 'Considerar soberanamente a preferência e o desejo pessoal da criança/adolescente na escolha final da modalidade.'),
  ('pu2_1', 2, 1, 'Filtro Clínico/Grupo', 'Priorizar provas de membros superiores e estabilização de tronco; evitar tarefas de impacto vertical.'),
  ('pu2_2', 2, 2, 'Filtro Cognitivo/Sensorial', 'Orientar percurso de agilidade em cadeira e adaptar comandos ao nível de compreensão.'),
  ('pu2_3', 2, 3, 'Filtro de Preferência e Desejo Pessoal', 'Considerar soberanamente a preferência e o desejo pessoal da criança/adolescente na escolha final da modalidade.'),
  ('pu3_1', 3, 1, 'Filtro Clínico/Grupo', 'Cruzar o nível GMFCS com cada modalidade sugerida; respeitar contra-indicações por padrão motor (ex.: salto no GMFCS III+).'),
  ('pu3_2', 3, 2, 'Filtro Cognitivo/Sensorial', 'Considerar espasticidade, coordenação e compreensão de regras; ajustar intensidade e complexidade.'),
  ('pu3_3', 3, 3, 'Filtro de Preferência e Desejo Pessoal', 'Considerar soberanamente a preferência e o desejo pessoal da criança/adolescente na escolha final da modalidade.'),
  ('pu4_1', 4, 1, 'Filtro Clínico/Grupo', 'Estrutura motora preservada: liberar modalidades conforme o perfil neuromotor, sem barreiras posturais.'),
  ('pu4_2', 4, 2, 'Filtro Cognitivo/Sensorial', 'Verificar necessidade de guia/comandos sonoros e demarcação tátil; preferir modalidades como Goalball ou Futebol de 5.'),
  ('pu4_3', 4, 3, 'Filtro de Preferência e Desejo Pessoal', 'Considerar soberanamente a preferência e o desejo pessoal da criança/adolescente na escolha final da modalidade.'),
  ('pu5_1', 5, 1, 'Filtro Clínico/Grupo', 'Funções motoras preservadas: liberar conforme perfil neuromotor; concentrar ajustes no canal de comunicação.'),
  ('pu5_2', 5, 2, 'Filtro Cognitivo/Sensorial', 'Assegurar estímulos visuais nítidos e suporte via Libras; verificar compreensão das regras.'),
  ('pu5_3', 5, 3, 'Filtro de Preferência e Desejo Pessoal', 'Considerar soberanamente a preferência e o desejo pessoal da criança/adolescente na escolha final da modalidade.'),
  ('pu6_1', 6, 1, 'Filtro Clínico/Grupo', 'Capacidades motoras íntegras: liberar modalidades conforme perfil; atentar à fadiga e ao ritmo de aprendizado.'),
  ('pu6_2', 6, 2, 'Filtro Cognitivo/Sensorial', 'Fragmentar instruções, demonstrar repetidamente e permitir tentativa prática extra; reduzir a complexidade das regras.'),
  ('pu6_3', 6, 3, 'Filtro de Preferência e Desejo Pessoal', 'Considerar soberanamente a preferência e o desejo pessoal da criança/adolescente na escolha final da modalidade.')
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  'public.m15_pcd_funil_id_seq',
  GREATEST((SELECT count(*) FROM public.m15_pcd_funil) + 1, 1),
  false
);

-- -----------------------------------------------------------------------------
-- 6) Avaliacao PCD por aluno
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pcd_assessments (
  id text primary key,
  student_id text not null,
  student_name text,
  grupo integer not null,
  grupo_nome text,
  detalhe_classificacao text,
  abdominal_s numeric,
  velocidade_s numeric,
  agilidade_s numeric,
  salto_cm numeric,
  flexao_rep numeric,
  nota_abdominal integer,
  nota_velocidade integer,
  nota_agilidade integer,
  nota_salto integer,
  nota_flexao integer,
  nota_vel_agil integer,
  nota_forca_explosiva integer,
  nota_membros_sup integer,
  nota_core integer,
  compatibilidade jsonb,
  direcionamento text,
  classificacao_perfil text,
  technical_opinion text,
  date text,
  created_at timestamptz default now()
);

ALTER TABLE public.pcd_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read pcd_assessments" ON public.pcd_assessments;
CREATE POLICY "read pcd_assessments" ON public.pcd_assessments FOR SELECT USING (true);

CREATE SEQUENCE IF NOT EXISTS public.pcd_assessments_id_seq;
SELECT setval(
  'public.pcd_assessments_id_seq',
  GREATEST(
    COALESCE((SELECT MAX(replace(id, 'PCD-', '')::bigint)
                FROM public.pcd_assessments WHERE id ~ '^PCD-[0-9]+$'), 0),
    1)
);
CREATE OR REPLACE FUNCTION public.next_pcd_assessment_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'PCD-' || nextval('public.pcd_assessments_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_pcd_assessment_id() TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO:
--   SELECT grupo, nome FROM public.m15_pcd_grupos ORDER BY grupo;
--   SELECT grupo, detalhe, teste, status FROM public.m15_pcd_adaptacoes WHERE grupo = 3 ORDER BY detalhe, teste;
--   SELECT nome, peso_vel_agil, peso_forca_exp, peso_membros_sup, peso_core FROM public.m15_pcd_modalidades;
-- =============================================================================