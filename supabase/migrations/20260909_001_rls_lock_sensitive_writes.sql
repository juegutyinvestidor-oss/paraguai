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
values ('1', 'Admin EDUKYNE', 'Administrador', 'projetobrasil11@gmail.com', 50000)
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
