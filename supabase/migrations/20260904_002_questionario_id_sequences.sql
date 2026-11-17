-- =============================================================================
-- MIGRACAO: IDs sequenciais via banco para as tabelas do Questionario
-- Data: 2026-09-04
-- Descricao: Cria sequences + RPCs next_*_id para as tabelas de configuracao e
--            respostas do Questionario, que hoje geram ID no front (uuid /
--            nextSeqId = Math.max+1), violando a regra de IDs do AGENTS.md.
--            Cada sequence e inicializada a partir do MAIOR sufixo numerico ja
--            existente na tabela (regex ancorada), entao:
--              - continua a sequencia de quem ja vem em formato prefixo+numero
--                (ex.: m3_cenarios c1,c2,c3 -> proximo c4);
--              - NAO colide com linhas antigas em formato uuid (prefixo novo);
--              - NENHUM dado cadastrado e perdido ou renumerado.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- m3_cenarios  (prefixo 'c')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m3_cenarios_id_seq;
SELECT setval(
  'public.m3_cenarios_id_seq',
  (SELECT coalesce(max((substring(id from '^c([0-9]+)$')::int)), 0) + 1
     FROM public.m3_cenarios),
  false
);
CREATE OR REPLACE FUNCTION public.next_m3_cenario_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'c' || nextval('public.m3_cenarios_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m3_cenario_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- m3_impactos  (prefixo 'i')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m3_impactos_id_seq;
SELECT setval(
  'public.m3_impactos_id_seq',
  (SELECT coalesce(max((substring(id from '^i([0-9]+)$')::int)), 0) + 1
     FROM public.m3_impactos),
  false
);
CREATE OR REPLACE FUNCTION public.next_m3_impacto_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'i' || nextval('public.m3_impactos_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m3_impacto_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- m4_imc_config  (prefixo 'm4_')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m4_imc_config_id_seq;
SELECT setval(
  'public.m4_imc_config_id_seq',
  (SELECT coalesce(max((substring(id from '^m4_([0-9]+)$')::int)), 0) + 1
     FROM public.m4_imc_config),
  false
);
CREATE OR REPLACE FUNCTION public.next_m4_imc_config_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm4_' || nextval('public.m4_imc_config_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m4_imc_config_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- m5_capacidades_config  (prefixo 'm5_')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m5_capacidades_config_id_seq;
SELECT setval(
  'public.m5_capacidades_config_id_seq',
  (SELECT coalesce(max((substring(id from '^m5_([0-9]+)$')::int)), 0) + 1
     FROM public.m5_capacidades_config),
  false
);
CREATE OR REPLACE FUNCTION public.next_m5_capacidade_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm5_' || nextval('public.m5_capacidades_config_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m5_capacidade_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- m6_modalidades_direcionamento  (prefixo 'm6_m_')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m6_modalidades_direcionamento_id_seq;
SELECT setval(
  'public.m6_modalidades_direcionamento_id_seq',
  (SELECT coalesce(max((substring(id from '^m6_m_([0-9]+)$')::int)), 0) + 1
     FROM public.m6_modalidades_direcionamento),
  false
);
CREATE OR REPLACE FUNCTION public.next_m6_direcionamento_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm6_m_' || nextval('public.m6_modalidades_direcionamento_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m6_direcionamento_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- m6_diretrizes_intervencao  (prefixo 'm6_d_')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m6_diretrizes_intervencao_id_seq;
SELECT setval(
  'public.m6_diretrizes_intervencao_id_seq',
  (SELECT coalesce(max((substring(id from '^m6_d_([0-9]+)$')::int)), 0) + 1
     FROM public.m6_diretrizes_intervencao),
  false
);
CREATE OR REPLACE FUNCTION public.next_m6_diretriz_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm6_d_' || nextval('public.m6_diretrizes_intervencao_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m6_diretriz_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- m7_perfis_pareceres  (prefixo 'm7_r_')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m7_perfis_pareceres_id_seq;
SELECT setval(
  'public.m7_perfis_pareceres_id_seq',
  (SELECT coalesce(max((substring(id from '^m7_r_([0-9]+)$')::int)), 0) + 1
     FROM public.m7_perfis_pareceres),
  false
);
CREATE OR REPLACE FUNCTION public.next_m7_parecer_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm7_r_' || nextval('public.m7_perfis_pareceres_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m7_parecer_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- m2_modalidades_config  (prefixo 'm2-custom-')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.m2_modalidades_config_id_seq;
SELECT setval(
  'public.m2_modalidades_config_id_seq',
  (SELECT coalesce(max((substring(id from '^m2-custom-([0-9]+)$')::int)), 0) + 1
     FROM public.m2_modalidades_config),
  false
);
CREATE OR REPLACE FUNCTION public.next_m2_modalidade_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'm2-custom-' || nextval('public.m2_modalidades_config_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_m2_modalidade_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- questionarios_respostas  (prefixo 'resp-')
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.questionarios_respostas_id_seq;
SELECT setval(
  'public.questionarios_respostas_id_seq',
  (SELECT coalesce(max((substring(id from '^resp-([0-9]+)$')::int)), 0) + 1
     FROM public.questionarios_respostas),
  false
);
CREATE OR REPLACE FUNCTION public.next_questionario_resposta_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'resp-' || nextval('public.questionarios_respostas_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_questionario_resposta_id() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- aptidao_referenciais  (M1 - prefixo 'ref-'; seeds usam 'f-1'..'v-9', sem colisao)
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.aptidao_referenciais_id_seq;
SELECT setval(
  'public.aptidao_referenciais_id_seq',
  (SELECT coalesce(max((substring(id from '^ref-([0-9]+)$')::int)), 0) + 1
     FROM public.aptidao_referenciais),
  false
);
CREATE OR REPLACE FUNCTION public.next_aptidao_ref_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT 'ref-' || nextval('public.aptidao_referenciais_id_seq')::text $$;
GRANT EXECUTE ON FUNCTION public.next_aptidao_ref_id() TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICACAO:
--   SELECT next_m3_cenario_id(), next_m4_imc_config_id(), next_questionario_resposta_id();
--   (chamar uma vez a mais nao renumera nada; sequences so avancam)
-- =============================================================================
