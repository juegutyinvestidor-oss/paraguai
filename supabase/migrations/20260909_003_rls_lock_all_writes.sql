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
