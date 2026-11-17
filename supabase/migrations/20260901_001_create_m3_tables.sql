-- =============================================================================
-- MIGRACAO: Tabelas do Módulo 3 - Análise de Frequência Escolar
-- Data: 2026-09-01
-- Descricao: Remove a tabela m3_analises (criada anteriormente vazia) e cria as
--            tabelas reais do Módulo 3: m3_cenarios (Referência de Cenários) e
--            m3_impactos (Matriz de Impactos Pedagógicos), com os dados padrão.
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- 0. Remove tabela antiga/desnecessária (vazia)
drop table if exists public.m3_analises cascade;

-- 1. Tabela de Referência de Cenários de Frequência
create table if not exists public.m3_cenarios (
  id text primary key,
  cenario text not null,
  condicao text not null,
  frequencia text not null,
  mensagem text not null,
  created_at timestamptz default now()
);

-- 2. Matriz de Impactos Pedagógicos
create table if not exists public.m3_impactos (
  id text primary key,
  tipo text not null,
  indicador text not null,
  descricao text not null,
  created_at timestamptz default now()
);

-- 3. Row Level Security
alter table public.m3_cenarios enable row level security;
alter table public.m3_impactos enable row level security;

-- 4. Policies (acesso público para simplificar o sync em dev/demo)
create policy "Allow public select m3_cenarios" on public.m3_cenarios for select using (true);
create policy "Allow public insert m3_cenarios" on public.m3_cenarios for insert with check (true);
create policy "Allow public update m3_cenarios" on public.m3_cenarios for update using (true) with check (true);
create policy "Allow public delete m3_cenarios" on public.m3_cenarios for delete using (true);

create policy "Allow public select m3_impactos" on public.m3_impactos for select using (true);
create policy "Allow public insert m3_impactos" on public.m3_impactos for insert with check (true);
create policy "Allow public update m3_impactos" on public.m3_impactos for update using (true) with check (true);
create policy "Allow public delete m3_impactos" on public.m3_impactos for delete using (true);

-- 5. Dados padrão de Cenários
insert into public.m3_cenarios (id, cenario, condicao, frequencia, mensagem)
values
  ('c1', 'CENÁRIO A', 'Mais presenças do que faltas',
   'O estudante demonstrou excelente regularidade e compromisso com a rotina escolar ao longo deste mês. A baixa taxa de absenteísmo reflete uma postura participativa e engajada com o ambiente de aprendizagem.',
   'Parabéns pelo incentivo e parceria. A presença constante tem sido o pilar para os bons resultados mantidos até aqui.'),
  ('c2', 'CENÁRIO B', 'Mais faltas do que presenças',
   'Identificamos um número crítico de ausências neste período, superando os dias de comparecimento em sala de aula. Esse padrão de faltas excessivas acende um alerta pedagógico, pois interrompe a sequência didática e prejudica a absorção dos conteúdos ministrados.',
   'Solicitamos uma atenção especial e um diálogo familiar para identificarmos o motivo das ausências. É fundamental restabelecer a rotina de idas à escola para evitar prejuízos severos na avaliação final deste ciclo.'),
  ('c3', 'CENÁRIO C', 'Não houver presença ou falta registrada',
   'Até o momento, não foram identificados registros de presença ou ausência para o estudante no sistema neste período. A ausência de dados impede uma avaliação precisa do acompanhamento escolar, tornando indispensável a verificação imediata junto à secretaria ou equipe pedagógica para a regularização dos lançamentos.',
   'Solicitamos que entrem em contato com a secretaria escolar para a regularização dos registros. Constatamos que não há lançamentos de presença ou falta até o momento, o que impossibilita o acompanhamento correto da rotina do estudante.')
on conflict (id) do update set cenario = excluded.cenario, condicao = excluded.condicao, frequencia = excluded.frequencia, mensagem = excluded.mensagem;

-- 6. Dados padrão de Impactos
insert into public.m3_impactos (id, tipo, indicador, descricao)
values
  ('i1', 'Vantagem (Ponto Forte)', 'Continuidade Pedagógica, Socialização e Ritmo de Avaliação',
   'Quando presente, o aluno acompanha as explicações passo a passo, facilitando a execução de tarefas complexas. A convivência diária fortalece os vínculos com professores e colegas, desenvolvendo inteligência emocional e trabalho em equipe. Menor necessidade de aplicação de provas substitutivas ou trabalhos de recuperação de nota por perda de prazos.'),
  ('i2', 'Desvantagem (Ponto de Atenção)', 'Lacunas de Conteúdo, Desengajamento Escolar e Sobrecarga de Tarefas',
   'Cada ausência gera a perda de conceitos-chave, acumulando dúvidas para as unidades seguintes. O excesso de faltas quebra a rotina do estudante, gerando desmotivação e sensação de isolamento em relação à turma. Acúmulo de atividades pendentes que precisam ser realizadas em casa para cumprir as exigências do ano letivo.')
on conflict (id) do update set tipo = excluded.tipo, indicador = excluded.indicador, descricao = excluded.descricao;