-- =============================================================================
-- MIGRACAO: Aba "Plano de Acao" - pastas + arquivos PDF
-- Data: 2026-09-23
-- Descricao: Cria a estrutura da aba "Plano de Ação" (abaixo de Avaliações),
--            onde a equipe armazena pastas com arquivos PDF de plano de ação
--            referentes ao sistema.
--            - Bucket Storage "plano-de-acao" (leitura publica)
--            - Tabela plano_acao_folders (metadados das pastas)
--            - Tabela plano_acao_files (metadados dos PDFs)
-- RLS: apenas SELECT publico para pastas e arquivos (escritas passam pela
--      rota /api/plano-acao com service_role, no mesmo modelo das demais).
-- ATENCAO: Execute este SQL no Supabase SQL Editor.
-- =============================================================================

-- 1. Criar o bucket "plano-de-acao" (publico para leitura)
insert into storage.buckets (id, name, public)
values ('plano-de-acao', 'plano-de-acao', true)
on conflict (id) do update set public = true;

-- 2. Politicas de leitura publica (todos podem baixar/visualizar os PDFs)
drop policy if exists "Plano de Acao: visualizar publicamente" on storage.objects;
create policy "Plano de Acao: visualizar publicamente"
on storage.objects for select
using (bucket_id = 'plano-de-acao');

-- 3. Tabela de pastas do Plano de Acao
CREATE TABLE IF NOT EXISTS public.plano_acao_folders (
  id text primary key,
  name text not null,
  created_by text,
  created_at timestamptz default now()
);

ALTER TABLE public.plano_acao_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read plano_acao_folders" ON public.plano_acao_folders;
CREATE POLICY "read plano_acao_folders" ON public.plano_acao_folders FOR SELECT USING (true);

-- 4. Tabela de arquivos PDF do Plano de Acao
CREATE TABLE IF NOT EXISTS public.plano_acao_files (
  id text primary key,
  folder_id text not null references public.plano_acao_folders(id) on delete cascade,
  name text not null,
  path text not null,
  size bigint default 0,
  created_by text,
  created_at timestamptz default now()
);

ALTER TABLE public.plano_acao_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read plano_acao_files" ON public.plano_acao_files;
CREATE POLICY "read plano_acao_files" ON public.plano_acao_files FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_plano_acao_files_folder ON public.plano_acao_files (folder_id);

-- -----------------------------------------------------------------------------
-- 5. Merge das permissoes RBAC (idempotente):
--    - Todos os papeis ganham 'view:plano_acao'
--    - Administrador e Gestor ganham create/edit/delete:plano_acao
-- -----------------------------------------------------------------------------
update public.rbac_permissions
set permissions = (
  select coalesce(jsonb_agg(distinct perm), '[]'::jsonb)
  from jsonb_array_elements(permissions || '["view:plano_acao"]'::jsonb) perm
)
where role in ('Administrador', 'Gestor', 'Professor', 'Estagiário', 'Assistente', 'Aluno');

update public.rbac_permissions
set permissions = (
  select coalesce(jsonb_agg(distinct perm), '[]'::jsonb)
  from jsonb_array_elements(permissions || '["create:plano_acao","edit:plano_acao","delete:plano_acao"]'::jsonb) perm
)
where role in ('Administrador', 'Gestor');

-- Garante que bases novas com a tabela vazia tambem sejem semeadas corretamente
insert into public.rbac_permissions (role, permissions) values
  ('Administrador', '["view:dashboard","view:contrato","view:alunos","view:presenca","view:profissionais","view:modalidades","view:avaliacoes","view:performance","view:analise-geral","view:painel-estatistico","view:estudo-comparativo","view:questionario","view:perfil","view:settings","view:plano_acao","create:contrato","edit:contrato","delete:contrato","create:alunos","edit:alunos","delete:alunos","edit:presenca","create:profissionais","edit:profissionais","delete:profissionais","create:modalidades","edit:modalidades","delete:modalidades","create:avaliacoes","edit:avaliacoes","delete:avaliacoes","create:plano_acao","edit:plano_acao","delete:plano_acao"]'::jsonb),
  ('Gestor', '["view:dashboard","view:contrato","view:alunos","view:presenca","view:profissionais","view:modalidades","view:avaliacoes","view:performance","view:analise-geral","view:painel-estatistico","view:estudo-comparativo","view:questionario","view:perfil","view:plano_acao","create:contrato","edit:contrato","create:alunos","edit:alunos","edit:presenca","create:profissionais","edit:profissionais","create:modalidades","edit:modalidades","create:avaliacoes","edit:avaliacoes","delete:avaliacoes","create:plano_acao","edit:plano_acao","delete:plano_acao"]'::jsonb),
  ('Professor', '["view:dashboard","view:contrato","view:alunos","view:presenca","view:modalidades","view:avaliacoes","view:performance","view:analise-geral","view:painel-estatistico","view:estudo-comparativo","view:questionario","view:perfil","view:plano_acao","edit:presenca","create:avaliacoes","edit:avaliacoes","delete:avaliacoes"]'::jsonb),
  ('Estagiário', '["view:dashboard","view:contrato","view:alunos","view:presenca","view:modalidades","view:avaliacoes","view:performance","view:analise-geral","view:painel-estatistico","view:estudo-comparativo","view:questionario","view:perfil","view:plano_acao","edit:presenca","create:avaliacoes","edit:avaliacoes","delete:avaliacoes"]'::jsonb),
  ('Assistente', '["view:dashboard","view:contrato","view:alunos","view:presenca","view:modalidades","view:avaliacoes","view:performance","view:analise-geral","view:painel-estatistico","view:estudo-comparativo","view:questionario","view:perfil","view:plano_acao","edit:presenca","create:avaliacoes","edit:avaliacoes","delete:avaliacoes"]'::jsonb),
  ('Aluno', '["view:dashboard","view:presenca","view:modalidades","view:avaliacoes","view:performance","view:analise-geral","view:questionario","view:perfil","view:plano_acao"]'::jsonb)
on conflict (role) do nothing;

-- =============================================================================
-- VERIFICACAO:
--   select id, name, public from storage.buckets where id = 'plano-de-acao';
--   select role, permissions from public.rbac_permissions order by role;
-- =============================================================================