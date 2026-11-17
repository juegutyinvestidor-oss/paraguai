-- =============================================================================
-- MIGRACAO: M7 - colunas configuraveis de Area de Interesse e Carreiras
-- Data: 2026-09-04
-- Descricao: Adiciona interest_area e careers ao m7_perfis_pareceres para que
--            Perfil/Area/Carreira da avaliacao Vocacional sejam editaveis no
--            Modulo 7 (nao mais hardcoded no codigo). Sementeia as linhas do
--            componente "Mapa de Perfis e Carreiras" com os textos atuais.
-- ATENCAO: Execute no Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

ALTER TABLE public.m7_perfis_pareceres
  ADD COLUMN IF NOT EXISTS interest_area text,
  ADD COLUMN IF NOT EXISTS careers text;

-- Preenche as linhas "Mapa" por perfil (somente onde ainda vazias)
UPDATE public.m7_perfis_pareceres SET
  interest_area = 'Você gosta de se comunicar, ajudar as pessoas e entender a sociedade.',
  careers = 'Direito, Letras, Pedagogia, Psicologia, História, Jornalismo e Relações Internacionais.'
WHERE component = 'Mapa de Perfis e Carreiras' AND lower(btrim(profile)) = 'humanas e sociais'
  AND (interest_area IS NULL OR btrim(interest_area) = '');

UPDATE public.m7_perfis_pareceres SET
  interest_area = 'Você gosta de resolver problemas lógicos, lidar com números e entender como as tecnologias funcionam.',
  careers = 'Engenharias, Ciência da Computação, Matemática, Física, Arquitetura e Tecnologia da Informação.'
WHERE component = 'Mapa de Perfis e Carreiras' AND lower(btrim(profile)) = 'exatas e tecnológicas'
  AND (interest_area IS NULL OR btrim(interest_area) = '');

UPDATE public.m7_perfis_pareceres SET
  interest_area = 'Você é movido pela criatividade, gosta de inventar, inovar ou tem forte interesse pela vida e saúde.',
  careers = 'Medicina, Biologia, Design, Publicidade, Artes Visuais, Educação Física e Veterinária.'
WHERE component = 'Mapa de Perfis e Carreiras' AND lower(btrim(profile)) = 'biológicas e criativas'
  AND (interest_area IS NULL OR btrim(interest_area) = '');

UPDATE public.m7_perfis_pareceres SET
  interest_area = 'Você tem espírito de liderança, gosta de organizar, gerenciar recursos e traçar estratégias.',
  careers = 'Administração, Economia, Ciências Contábeis, Marketing, Logística e Gestão de Recursos Humanos.'
WHERE component = 'Mapa de Perfis e Carreiras' AND lower(btrim(profile)) = 'negócios e gestão'
  AND (interest_area IS NULL OR btrim(interest_area) = '');

UPDATE public.m7_perfis_pareceres SET
  interest_area = 'Ótimo para design de jogos ou desenvolvimento web.',
  careers = 'Híbrido'
WHERE component = 'Mapa de Perfis e Carreiras' AND profile LIKE 'Criativo e Tecnológico%'
  AND (interest_area IS NULL OR btrim(interest_area) = '');

-- =============================================================================
-- VERIFICACAO:
--   SELECT profile, component, interest_area, careers FROM public.m7_perfis_pareceres
--   WHERE component = 'Mapa de Perfis e Carreiras';
-- =============================================================================
