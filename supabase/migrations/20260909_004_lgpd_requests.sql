-- =============================================================================
-- MIGRACAO: LGPD - Tabela de solicitacoes dos titulares (Art. 18)
-- Data: 2026-09-09
-- Descricao: Cria lgpd_requests para registrar exercicios de direitos do
--            titular (copia, correcao, exclusao, portabilidade, revogacao).
--            Criacao e resolucao passam pelas rotas /api/lgpd (service_role +
--            sessao). Leitura publica via anon key para o titular acompanhar
--            suas proprias solicitacoes e o painel do DPO listar todas.
--            Exclusao de conta NUNCA e automatica: gera apenas a solicitacao,
--            que um Administrador precisa resolver no console.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lgpd_requests (
  id text primary key,
  requester_id text NOT NULL,
  requester_email text NOT NULL,
  requester_role text NOT NULL DEFAULT '',
  request_type text NOT NULL CHECK (request_type IN ('copia','correcao','exclusao','portabilidade','revogacao')),
  notes text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','resolvida','recusada')),
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lgpd_requests_requester ON public.lgpd_requests (requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lgpd_requests_status    ON public.lgpd_requests (status, created_at DESC);

ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read lgpd_requests" ON public.lgpd_requests;
CREATE POLICY "read lgpd_requests" ON public.lgpd_requests
  FOR SELECT USING (true);

-- =============================================================================
-- VERIFICACAO:
--   SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'lgpd_requests';
--   -- apenas SELECT publico; escrita somente via service_role
-- =============================================================================
