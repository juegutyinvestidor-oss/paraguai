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
