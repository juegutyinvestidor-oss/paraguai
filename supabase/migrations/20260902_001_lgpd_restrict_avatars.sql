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
