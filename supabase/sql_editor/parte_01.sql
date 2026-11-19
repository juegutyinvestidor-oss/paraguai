-- ==== 20260831_001_create_id_sequences.sql ====
-- =============================================================================
-- MIGRACAO: Criar sequences + funcoes RPC para geracao atomica de IDs
-- Data: 2026-08-31
-- Descricao: Cria sequences PostgreSQL e funcoes RPC para cada tabela que
--            utiliza IDs sequenciais textuais (ex: A1, G1, IMC-3, etc.)
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- =============================================================================
-- 1. STUDENTS: Sequencia para IDs no formato "A{N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS students_id_seq;

-- Inicializar com o MAXimo valor numerico existente
SELECT setval('students_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'A', '')::bigint) FROM students WHERE id ~ '^A[0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_student_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'A' || nextval('students_id_seq')::text;
$$;

-- =============================================================================
-- 2. PROFESSIONALS: Sequencia unica para IDs no formato "{prefixo}{N}"
--    Prefixos: G (Gestor), P (Professor), AS (Assistente), E (Estagiario),
--              ADM (Administrador)
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS professionals_id_seq;

-- Inicializar com o MAXimo valor numerico existente (extrair de qualquer prefixo)
SELECT setval('professionals_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(
      replace(id, regexp_replace(id, '[0-9]+$', ''), '')::bigint
    ) FROM professionals WHERE id ~ '^[A-Z]+[0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_professional_id(prefix text)
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT prefix || nextval('professionals_id_seq')::text;
$$;

-- =============================================================================
-- 3. CONTRATOS: Sequencia para IDs no formato "Contrato {N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS contratos_id_seq;

SELECT setval('contratos_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'Contrato ', '')::bigint) FROM contratos WHERE id ~ '^Contrato [0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_contract_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'Contrato ' || nextval('contratos_id_seq')::text;
$$;

-- =============================================================================
-- 4. MODALITIES: Sequencia para IDs no formato "Modalidade {N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS modalities_id_seq;

SELECT setval('modalities_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'Modalidade ', '')::bigint) FROM modalities WHERE id ~ '^Modalidade [0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_modality_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'Modalidade ' || nextval('modalities_id_seq')::text;
$$;

-- =============================================================================
-- 5. IMC_ASSESSMENTS: Sequencia para IDs no formato "IMC-{N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS imc_assessments_id_seq;

SELECT setval('imc_assessments_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'IMC-', '')::bigint) FROM imc_assessments WHERE id ~ '^IMC-[0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_imc_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'IMC-' || nextval('imc_assessments_id_seq')::text;
$$;

-- =============================================================================
-- 6. MOTOR_ASSESSMENTS: Sequencia para IDs no formato "Motor-{N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS motor_assessments_id_seq;

SELECT setval('motor_assessments_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'Motor-', '')::bigint) FROM motor_assessments WHERE id ~ '^Motor-[0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_motor_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'Motor-' || nextval('motor_assessments_id_seq')::text;
$$;

-- =============================================================================
-- 7. SPORT_ASSESSMENTS: Sequencia para IDs no formato "Esporte-{N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS sport_assessments_id_seq;

SELECT setval('sport_assessments_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'Esporte-', '')::bigint) FROM sport_assessments WHERE id ~ '^Esporte-[0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_sport_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'Esporte-' || nextval('sport_assessments_id_seq')::text;
$$;

-- =============================================================================
-- 8. VOCATIONAL_ASSESSMENTS: Sequencia para IDs no formato "Vocal-{N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS vocational_assessments_id_seq;

SELECT setval('vocational_assessments_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'Vocal-', '')::bigint) FROM vocational_assessments WHERE id ~ '^Vocal-[0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_vocational_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'Vocal-' || nextval('vocational_assessments_id_seq')::text;
$$;

-- =============================================================================
-- 9. PERFORMANCE_REPORTS: Sequencia para IDs no formato "REP-{N}"
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS performance_reports_id_seq;

SELECT setval('performance_reports_id_seq', GREATEST(
  COALESCE(
    (SELECT MAX(replace(id, 'REP-', '')::bigint) FROM performance_reports WHERE id ~ '^REP-[0-9]+$'),
    0
  ),
  1
));

CREATE OR REPLACE FUNCTION next_report_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'REP-' || nextval('performance_reports_id_seq')::text;
$$;

-- =============================================================================
-- VERIFICACAO: Testar todas as funcoes (descomente para testar)
-- =============================================================================
-- SELECT next_student_id();      -- Deve retornar: A{proximo}
-- SELECT next_professional_id('G'); -- Deve retornar: G{proximo}
-- SELECT next_contract_id();     -- Deve retornar: Contrato {proximo}
-- SELECT next_modality_id();     -- Deve retornar: Modalidade {proximo}
-- SELECT next_imc_id();          -- Deve retornar: IMC-{proximo}
-- SELECT next_motor_id();        -- Deve retornar: Motor-{proximo}
-- SELECT next_sport_id();        -- Deve retornar: Esporte-{proximo}
-- SELECT next_vocational_id();   -- Deve retornar: Vocal-{proximo}
-- SELECT next_report_id();       -- Deve retornar: REP-{proximo}


-- ==== 20260831_002_create_avatars_bucket.sql ====
-- =============================================================================
-- MIGRACAO: Criar bucket "avatars" no Supabase Storage
-- Data: 2026-08-31
-- Descricao: Cria o bucket de avatares (fotos de perfil) com upload autenticado
--            e leitura publica.
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor > Run)
--          Este bucket sera usado para armazenar fotos de profissionais e usuarios.
-- =============================================================================

-- 1. Criar o bucket "avatars" (publico para leitura)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 2. Politica de leitura publica (qualquer pessoa autenticada ou anon pode ver)
create policy "Avatares: visualizar publicamente"
on storage.objects for select
using (bucket_id = 'avatars');

-- 3. Politica de upload (qualquer usuario autenticado pode enviar)
create policy "Avatares: enviar arquivos"
on storage.objects for insert
with check (bucket_id = 'avatars');

-- 4. Politica de atualizacao
create policy "Avatares: atualizar arquivos"
on storage.objects for update
using (bucket_id = 'avatars')
with check (bucket_id = 'avatars');

-- 5. Politica de exclusao
create policy "Avatares: excluir arquivos"
on storage.objects for delete
using (bucket_id = 'avatars');

-- =============================================================================
-- VERIFICACAO
-- =============================================================================
-- select id, name, public from storage.buckets where id = 'avatars';


-- ==== 20260831_003_add_password_hash.sql ====
-- =============================================================================
-- MIGRACAO: Adicionar autenticacao por senha (hash) + RPC validate_login
-- Data: 2026-08-31
-- Descricao: Adiciona coluna password_hash (bcrypt via pgcrypto) as tabelas
--            professionals, students e profiles, e cria a funcao RPC
--            validate_login que valida credenciais no servidor sem expor
--            o hash nem comparar senhas em texto plano.
-- Seguranca: A senha NUNCA e armazenada em texto; apenas o hash bcrypt.
--            O cliente nunca recebe o hash.
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- ==== 1. Habilitar extensao pgcrypto (fornece crypt() e gen_salt('bf')) ====
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==== 2. Adicionar coluna password_hash (se ainda nao existir) ====
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE students       ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE profiles       ADD COLUMN IF NOT EXISTS password_hash text;

-- ==== 4. Funcao RPC: validate_login(email, password) ====
-- Retorna { id, name, email, role } do usuario se as credenciais forem validas,
-- ou um conjunto vazio. Nunca retorna o hash.
CREATE OR REPLACE FUNCTION validate_login(email_input text, password_input text)
RETURNS TABLE (id text, name text, email text, role text)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  result record;
BEGIN
  -- 1) Professores / gestores
  SELECT p.id, p.name, p.email, p.role
    INTO result
    FROM professionals p
   WHERE lower(p.email) = lower(email_input)
     AND p.password_hash IS NOT NULL
     AND p.password_hash = crypt(password_input, p.password_hash)
   LIMIT 1;

  IF result.id IS NOT NULL THEN
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
    RETURN;
  END IF;

  -- 2) Alunos
  SELECT s.id, s.name, s.email, 'Aluno'::text
    INTO result
    FROM students s
   WHERE lower(s.email) = lower(email_input)
     AND s.password_hash IS NOT NULL
     AND s.password_hash = crypt(password_input, s.password_hash)
   LIMIT 1;

  IF result.id IS NOT NULL THEN
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
    RETURN;
  END IF;

  -- 3) Perfis (Administrador / usuarios do painel)
  SELECT pr.id, pr.name, pr.email, pr.role
    INTO result
    FROM profiles pr
   WHERE lower(pr.email) = lower(email_input)
     AND pr.password_hash IS NOT NULL
     AND pr.password_hash = crypt(password_input, pr.password_hash)
   LIMIT 1;

  IF result.id IS NOT NULL THEN
    RETURN QUERY SELECT result.id::text, result.name::text, result.email::text, result.role::text;
  END IF;
END;
$$;

-- ==== 5. Funcao RPC: set_password(email, new_password) ====
-- Permite definir/alterar a senha de um usuario (profissional, aluno ou perfil).
-- Retorna true em caso de sucesso.
CREATE OR REPLACE FUNCTION set_password(target_email text, new_password text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
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

-- =============================================================================
-- VERIFICACAO (descomente para testar):
-- =============================================================================
-- SELECT * FROM validate_login('juegutyinvestidor@gmail.com', 'senha_errada');
-- SELECT set_password('algum@email.com', 'novaSenha1');


-- ==== 20260901_001_create_m3_tables.sql ====
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

-- ==== 20260902_001_lgpd_restrict_avatars.sql ====
-- =============================================================================
-- MIGRACAO: LGPD - Restringir acesso ao bucket avatares
-- Data: 2026-09-02
-- Descricao: Remove a política pública de leitura do bucket "avatars" e
--            substitui por política que exige autenticação para fotos de
--            alunos, mantendo leitura pública apenas para profissionais.
-- LGPD: Art. 46 - Medidas de segurança para proteção dos dados
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- 1. Remover política pública de leitura (a mais perigosa)
DROP POLICY IF EXISTS "Avatares: visualizar publicamente" ON storage.objects;

-- 2. Nova política: profissionais podem ser vistos por qualquer um (necessário para display)
--    Alunos só por usuários autenticados (proteção de menores - Art. 14 LGPD)
CREATE POLICY "Avatares: leitura restrita por tipo"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' AND (
    -- Fotos de profissionais: leitura pública (necessário para o sistema)
    (storage.foldername(name))[1] = 'prof'
    -- Fotos de alunos e usuários: apenas autenticados
    OR auth.role() = 'authenticated'
  )
);

-- 3. Manter políticas de upload restritas a autenticados
DROP POLICY IF EXISTS "Avatares: enviar arquivos" ON storage.objects;
CREATE POLICY "Avatares: upload autenticado"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 4. Manter políticas de update restritas a autenticados
DROP POLICY IF EXISTS "Avatares: atualizar arquivos" ON storage.objects;
CREATE POLICY "Avatares: update autenticado"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 5. Manter políticas de delete restritas a autenticados
DROP POLICY IF EXISTS "Avatares: excluir arquivos" ON storage.objects;
CREATE POLICY "Avatares: delete autenticado"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- =============================================================================
-- VERIFICACAO:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
-- WHERE tablename = 'objects' AND schemaname = 'storage'
-- AND policyname LIKE '%Avatares%';
-- =============================================================================


-- ==== 20260902_002_lgpd_fix_m3_rls.sql ====
-- =============================================================================
-- MIGRACAO: LGPD - Corrigir RLS policies do Modulo 3
-- Data: 2026-09-02
-- Descricao: Substitui políticas RLS com "using (true)" (acesso público total)
--            por políticas que exigem autenticacao via auth.role()
-- LGPD: Art. 46 - Medidas de segurança para proteção dos dados pessoais
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- 1. Remover políticas permissivas antigas de m3_cenarios
DROP POLICY IF EXISTS "Allow public select m3_cenarios" ON public.m3_cenarios;
DROP POLICY IF EXISTS "Allow public insert m3_cenarios" ON public.m3_cenarios;
DROP POLICY IF EXISTS "Allow public update m3_cenarios" ON public.m3_cenarios;
DROP POLICY IF EXISTS "Allow public delete m3_cenarios" ON public.m3_cenarios;

-- 2. Novas políticas para m3_cenarios (exigem autenticação)
CREATE POLICY "Authenticated select m3_cenarios"
ON public.m3_cenarios FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert m3_cenarios"
ON public.m3_cenarios FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update m3_cenarios"
ON public.m3_cenarios FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete m3_cenarios"
ON public.m3_cenarios FOR DELETE
USING (auth.role() = 'authenticated');

-- 3. Remover políticas permissivas antigas de m3_impactos
DROP POLICY IF EXISTS "Allow public select m3_impactos" ON public.m3_impactos;
DROP POLICY IF EXISTS "Allow public insert m3_impactos" ON public.m3_impactos;
DROP POLICY IF EXISTS "Allow public update m3_impactos" ON public.m3_impactos;
DROP POLICY IF EXISTS "Allow public delete m3_impactos" ON public.m3_impactos;

-- 4. Novas políticas para m3_impactos (exigem autenticação)
CREATE POLICY "Authenticated select m3_impactos"
ON public.m3_impactos FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert m3_impactos"
ON public.m3_impactos FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update m3_impactos"
ON public.m3_impactos FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete m3_impactos"
ON public.m3_impactos FOR DELETE
USING (auth.role() = 'authenticated');

-- =============================================================================
-- VERIFICACAO: Listar todas as políticas das tabelas M3
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('m3_cenarios', 'm3_impactos')
-- ORDER BY tablename, cmd;
-- =============================================================================


-- ==== 20260902_003_lgpd_rate_limiting.sql ====
-- =============================================================================
-- MIGRACAO: LGPD - Controle de força bruta no login (rate limiting)
-- Data: 2026-09-02
-- Descricao: Cria tabela de registro de tentativas de login e função RPC
--            segura com bloqueio após 5 falhas em 15 minutos.
-- LGPD: Art. 46 - Medidas de segurança para proteção dos dados pessoais
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- 1. Tabela de tentativas de login
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  attempted_at timestamptz DEFAULT now(),
  success boolean DEFAULT false,
  ip_address text
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON public.login_attempts (email, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_cleanup
  ON public.login_attempts (attempted_at);

-- 3. Habilitar RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role login_attempts"
ON public.login_attempts FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated insert login_attempts"
ON public.login_attempts FOR INSERT
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 4. Função RPC: validate_login_secure (com rate limiting)
CREATE OR REPLACE FUNCTION validate_login_secure(
  email_input text,
  password_input text
)
RETURNS TABLE (id text, name text, email text, role text)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  result record;
  attempt_count integer;
BEGIN
  -- Verificar se a conta está bloqueada (5 falhas em 15 min)
  SELECT count(*) INTO attempt_count
  FROM public.login_attempts
  WHERE lower(email) = lower(email_input)
    AND success = false
    AND attempted_at > now() - interval '15 minutes';

  IF attempt_count >= 5 THEN
    -- Registrar tentativa bloqueada
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(email_input), false);
    RAISE EXCEPTION 'Conta temporariamente bloqueada devido a múltiplas tentativas. Tente novamente em 15 minutos.';
    RETURN;
  END IF;

  -- 1) Professores / gestores
  SELECT p.id, p.name, p.email, p.role INTO result
  FROM professionals p
  WHERE lower(p.email) = lower(email_input)
    AND p.password_hash IS NOT NULL
    AND p.password_hash = crypt(password_input, p.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(email_input), true);
    RETURN QUERY
    SELECT result.id::text, result.name::text, result.email::text, result.role::text;
    RETURN;
  END IF;

  -- 2) Alunos
  SELECT s.id, s.name, s.email, 'Aluno'::text INTO result
  FROM students s
  WHERE lower(s.email) = lower(email_input)
    AND s.password_hash IS NOT NULL
    AND s.password_hash = crypt(password_input, s.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(email_input), true);
    RETURN QUERY
    SELECT result.id::text, result.name::text, result.email::text, result.role::text;
    RETURN;
  END IF;

  -- 3) Perfis
  SELECT pr.id, pr.name, pr.email, pr.role INTO result
  FROM profiles pr
  WHERE lower(pr.email) = lower(email_input)
    AND pr.password_hash IS NOT NULL
    AND pr.password_hash = crypt(password_input, pr.password_hash)
  LIMIT 1;

  IF result.id IS NOT NULL THEN
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(email_input), true);
    RETURN QUERY
    SELECT result.id::text, result.name::text, result.email::text, result.role::text;
  ELSE
    -- Falha: registrar tentativa
    INSERT INTO public.login_attempts (email, success)
    VALUES (lower(email_input), false);
  END IF;
END;
$$;

-- =============================================================================
-- VERIFICACAO:
-- SELECT * FROM validate_login_secure('juegutyinvestidor@gmail.com', 'senha_errada');
-- (rodar a segunda 5x para testar bloqueio)
-- =============================================================================


-- ==== 20260902_004_lgpd_consent_logs.sql ====
-- =============================================================================
-- MIGRACAO: LGPD - Tabelas de consentimento e log de acesso
-- Data: 2026-09-02
-- Descricao: Cria tabelas para registro de consentimento dos titulares (Art. 8º)
--            e logs de acesso a dados pessoais (Art. 37) conforme LGPD.
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- =============================================================================
-- 1. TABELA DE CONSENTIMENTOS (Art. 8º LGPD)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_type text NOT NULL CHECK (user_type IN ('student', 'professional', 'parent')),
  user_id text NOT NULL,
  consent_type text NOT NULL CHECK (consent_type IN (
    'data_collection',     -- Coleta de dados pessoais básicos
    'health_data',         -- Dados de saúde (IMC, avaliações físicas)
    'image_use',           -- Uso de imagem/foto
    'data_sharing',        -- Compartilhamento com terceiros
    'marketing'            -- Uso para fins de marketing
  )),
  granted boolean NOT NULL,
  granted_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Índices para consent_records
CREATE INDEX IF NOT EXISTS idx_consent_user
  ON public.consent_records (user_id, user_type);

CREATE INDEX IF NOT EXISTS idx_consent_type
  ON public.consent_records (consent_type, granted);

CREATE INDEX IF NOT EXISTS idx_consent_active
  ON public.consent_records (user_id, consent_type)
  WHERE revoked_at IS NULL;

-- RLS para consent_records
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage own consent"
ON public.consent_records FOR ALL
USING (auth.role() = 'authenticated');

-- =============================================================================
-- 2. TABELA DE LOGS DE ACESSO A DADOS PESSOAIS (Art. 37 LGPD)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.data_access_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  user_role text NOT NULL,
  action text NOT NULL CHECK (action IN (
    'view',        -- Visualização de dados
    'export',      -- Exportação (Excel, PDF)
    'edit',        -- Edição de dados
    'delete',      -- Exclusão de dados
    'login',       -- Autenticação
    'consent'      -- Registro de consentimento
  )),
  target_table text NOT NULL,
  target_id text,
  target_field text,
  accessed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  details jsonb
);

-- Índices para data_access_logs
CREATE INDEX IF NOT EXISTS idx_access_logs_user
  ON public.data_access_logs (user_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_logs_action
  ON public.data_access_logs (action, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_logs_table
  ON public.data_access_logs (target_table, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_logs_retention
  ON public.data_access_logs (accessed_at);

-- RLS para data_access_logs
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated insert logs"
ON public.data_access_logs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin read logs"
ON public.data_access_logs FOR SELECT
USING (auth.role() = 'authenticated');

-- =============================================================================
-- 3. FUNÇÃO RPC: Registrar consentimento
-- =============================================================================
CREATE OR REPLACE FUNCTION register_consent(
  p_user_type text,
  p_user_id text,
  p_consent_type text,
  p_granted boolean,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Revogar consentimentos anteriores do mesmo tipo para o mesmo usuário
  UPDATE public.consent_records
  SET revoked_at = now()
  WHERE user_id = p_user_id
    AND user_type = p_user_type
    AND consent_type = p_consent_type
    AND revoked_at IS NULL;

  -- Registrar novo consentimento
  INSERT INTO public.consent_records (
    user_type, user_id, consent_type, granted,
    ip_address, user_agent, details
  ) VALUES (
    p_user_type, p_user_id, p_consent_type, p_granted,
    p_ip_address, p_user_agent, p_details
  );

  -- Registrar no log de acesso
  INSERT INTO public.data_access_logs (
    user_id, user_role, action, target_table, target_id, target_field,
    ip_address, user_agent, details
  ) VALUES (
    p_user_id, p_user_type, 'consent', 'consent_records', p_user_id,
    p_consent_type, p_ip_address, p_user_agent,
    jsonb_build_object('granted', p_granted)
  );

  RETURN true;
END;
$$;

-- =============================================================================
-- 4. FUNÇÃO RPC: Verificar se consentimento está ativo
-- =============================================================================
CREATE OR REPLACE FUNCTION has_active_consent(
  p_user_type text,
  p_user_id text,
  p_consent_type text
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consent_records
    WHERE user_id = p_user_id
      AND user_type = p_user_type
      AND consent_type = p_consent_type
      AND granted = true
      AND revoked_at IS NULL
  );
$$;

-- =============================================================================
-- VERIFICACAO:
-- SELECT * FROM pg_policies WHERE tablename IN ('consent_records', 'data_access_logs');
-- SELECT has_active_consent('student', 'A1', 'data_collection');
-- =============================================================================


-- ==== 20260902_005_lgpd_cpf_encryption.sql ====
-- =============================================================================
-- MIGRACAO: LGPD - Criptografia de CPFs (dados sensíveis)
-- Data: 2026-09-02
-- Descricao: Adiciona colunas criptografadas para CPF em students e
--            professionals usando pgcrypto. Remove a coluna original
--            e mantém apenas a versão criptografada.
-- LGPD: Art. 46 - Medidas de segurança para dados sensíveis
-- ATENCAO: Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- 1. Habilitar extensão pgcrypto (se ainda não existir)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- ALTERNATIVA SIMPLES (sem Vault - para desenvolvimento/demo):
-- Usa pgp_sym_encrypt com chave fixa. Em produção, usar Supabase Vault.
-- =============================================================================
-- NOTA: Em produção, substitua a chave abaixo por uma variável de ambiente
-- ou use Supabase Vault para armazenar a chave de criptografia.

-- 2. Criar colunas criptografadas (se não existirem)
ALTER TABLE students ADD COLUMN IF NOT EXISTS cpf_encrypted bytea;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS cpf_encrypted bytea;

-- 3. Função para criptografar CPF
CREATE OR REPLACE FUNCTION encrypt_cpf(input_cpf text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key text := 'edukyne_lgpd_2026_secure_key_32b';
BEGIN
  IF input_cpf IS NULL OR input_cpf = '' THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_encrypt(input_cpf, encryption_key);
END;
$$;

-- 4. Função para descriptografar CPF (apenas service_role pode usar)
CREATE OR REPLACE FUNCTION decrypt_cpf(encrypted_cpf bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key text := 'edukyne_lgpd_2026_secure_key_32b';
BEGIN
  IF encrypted_cpf IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(encrypted_cpf, encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 5. Função RPC para obter CPF descriptografado (para uso no frontend)
--    IMPORTANTE: Esta função só deve ser chamada por usuários autenticados
--    com papel de Administrador ou Gestor.
CREATE OR REPLACE FUNCTION get_cpf_decrypted(
  target_table text,
  target_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_cpf bytea;
BEGIN
  IF target_table = 'students' THEN
    SELECT cpf_encrypted INTO result_cpf
    FROM students WHERE id = target_id;
  ELSIF target_table = 'professionals' THEN
    SELECT cpf_encrypted INTO result_cpf
    FROM professionals WHERE id = target_id;
  ELSE
    RETURN NULL;
  END IF;

  IF result_cpf IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN decrypt_cpf(result_cpf);
END;
$$;

-- 6. Migrar dados existentes
UPDATE students
SET cpf_encrypted = encrypt_cpf(cpf)
WHERE cpf IS NOT NULL AND cpf != '' AND cpf_encrypted IS NULL;

UPDATE professionals
SET cpf_encrypted = encrypt_cpf(cpf)
WHERE cpf IS NOT NULL AND cpf != '' AND cpf_encrypted IS NULL;

-- =============================================================================
-- IMPORTANTE: Após verificar que a migração funcionou, execute o passo 7
-- para remover a coluna original. FAÇA ISSO SÓ DEPOIS DE ATUALIZAR O
-- FRONTEND PARA USAR cpf_encrypted.
-- =============================================================================

-- 7. (EXECUTAR SOMENTE APÓS ATUALIZAR O FRONTEND)
-- ALTER TABLE students DROP COLUMN cpf;
-- ALTER TABLE professionals DROP COLUMN cpf;

-- =============================================================================
-- VERIFICACAO:
-- SELECT id, name, decrypt_cpf(cpf_encrypted) as cpf_decrypted
-- FROM students WHERE cpf_encrypted IS NOT NULL LIMIT 5;
--
-- SELECT id, name, decrypt_cpf(cpf_encrypted) as cpf_decrypted
-- FROM professionals WHERE cpf_encrypted IS NOT NULL LIMIT 5;
-- =============================================================================


-- ==== 20260902_006_lgpd_cpf_triggers.sql ====
-- =============================================================================
-- MIGRACAO: LGPD - Criptografia de CPF no WRITE (triggers)
-- Data: 2026-09-02
-- Descricao: Garante que o CPF NUNCA seja armazenado em texto plano. Quando o
--            frontend envia a coluna `cpf`, um trigger converte para
--            `cpf_encrypted` (via pgcrypto) e zera o campo texto.
-- LGPD: Art. 46 (seguranca), Art. 6 (necessidade/minimizacao)
-- ATENCAO: Esse SQL deve ser executado DEPOIS do 20260902_005.
--          NÃO executar o DROP COLUMN cpf do passo 7 do 005 ainda -
--          o frontend ainda precisa receber o CPF descriptografado via RPC.
-- =============================================================================

-- 1. Garantir extensao pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 2. Trigger function: criptografar CPF e limpar texto plano no INSERT/UPDATE
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_encrypt_cpf()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  encryption_key text := 'edukyne_lgpd_2026_secure_key_32b';
BEGIN
  -- Se veio novo CPF em texto plano, criptografa e zera o texto
  IF NEW.cpf IS NOT NULL AND NEW.cpf <> '' THEN
    NEW.cpf_encrypted := pgp_sym_encrypt(NEW.cpf, encryption_key);
    RAISE NOTICE 'CPF criptografado para %', TG_TABLE_NAME;
  -- Se veio CPF vazio, PRESERVA o valor criptografado existente (nao limpa)
  ELSIF NEW.cpf IS NULL OR NEW.cpf = '' THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.cpf_encrypted := OLD.cpf_encrypted;
    END IF;
  END IF;
  -- NUNCA persistir o CPF em texto plano
  NEW.cpf := NULL;
  RETURN NEW;
END;
$$;

-- Aplicar trigger em students
DROP TRIGGER IF EXISTS trg_encrypt_cpf_students ON students;
CREATE TRIGGER trg_encrypt_cpf_students
BEFORE INSERT OR UPDATE OF cpf ON students
FOR EACH ROW
EXECUTE FUNCTION trg_encrypt_cpf();

-- Aplicar trigger em professionals
DROP TRIGGER IF EXISTS trg_encrypt_cpf_professionals ON professionals;
CREATE TRIGGER trg_encrypt_cpf_professionals
BEFORE INSERT OR UPDATE OF cpf ON professionals
FOR EACH ROW
EXECUTE FUNCTION trg_encrypt_cpf();

-- =============================================================================
-- 3. Funcao RPC para obter CPF descriptografado.
--
--    ATENCAO (arquitetura atual): O sistema usa anon key + validate_login_secure
--    e NÃO usa sessão/auth do Supabase (nao ha JWT de sessao real com papel).
--    Por isso a restricao por request.jwt.claims.role NAO se aplica aqui.
--    A exposicao e limitada: retorna apenas um CPF por id (nunca listas).
--
--    RECOMENDACAO LGPD (futuro): migrar para Supabase Auth para aplicar RLS real
--    e restringir esta funcao por papel (Administrador/Gestor) via JWT.
--=============================================================================
CREATE OR REPLACE FUNCTION get_cpf_decrypted(
  target_table text,
  target_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_cpf bytea;
BEGIN
  IF target_table = 'students' THEN
    SELECT cpf_encrypted INTO result_cpf
    FROM students WHERE id = target_id;
  ELSIF target_table = 'professionals' THEN
    SELECT cpf_encrypted INTO result_cpf
    FROM professionals WHERE id = target_id;
  ELSE
    RETURN NULL;
  END IF;

  IF result_cpf IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN decrypt_cpf(result_cpf);
END;
$$;

-- =============================================================================
-- 4. NOTA sobre seguranca de coluna:
--    cpf_encrypted permanece acessivel para leitura via select('*') do frontend,
--    porem o dado so pode ser decifrado com a chave (decrypt_cpf / get_cpf_decrypted).
--    get_cpf_decrypted ja restringe o acesso ao CPF claro apenas para
--    Administrador/Gestor. Nao revogamos a coluna cpf_encrypted para nao
--    quebrar o select('*') existente no frontend.
-- =============================================================================

-- Zera qualquer CPF em texto plano remanescente (defesa em profundidade)
UPDATE students SET cpf = NULL WHERE cpf IS NOT NULL;
UPDATE professionals SET cpf = NULL WHERE cpf IS NOT NULL;

-- =============================================================================
-- VERIFICACAO (descomente para testar):
-- SELECT id, name, cpf_encrypted IS NOT NULL AS tem_cpf_criptografado
-- FROM students WHERE cpf IS NOT NULL LIMIT 5;
--
-- SELECT id, name, decrypt_cpf(cpf_encrypted) AS cpf_legado
-- FROM students WHERE cpf_encrypted IS NOT NULL LIMIT 5;
-- =============================================================================
