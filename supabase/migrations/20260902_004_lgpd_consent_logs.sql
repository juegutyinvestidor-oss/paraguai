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
