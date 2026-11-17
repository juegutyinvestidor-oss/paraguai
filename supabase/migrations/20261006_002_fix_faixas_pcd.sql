-- =============================================================================
-- MIGRACAO: Corrige as faixas de nota PCD (Modulo 15)
-- Data: 2026-10-06
-- Motivo: a engine le as faixas com a regra [min, max) -> max_val EXCLUSIVO
--         (lib/pcdScore.ts: v >= min && v < max). Edicoes que separaram os
--         limites (ex.: nota1 max=14 e nota2 min=15) criaram BURACOS, e todo
--         valor no buraco retorna nota 0. Os limites devem ser COMPARTILHADOS:
--         max_val da nota N = min_val da nota N+1.
--   1) Restaura as fronteiras compartilhadas em todos os grupos/testes.
--   2) Repoe as notas 2 e 3 de velocidade do Grupo 6 (estavam faltando).
-- Idempotente. Rode no Supabase SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- GRUPO 1
-- -----------------------------------------------------------------------------
UPDATE public.m15_pcd_faixas SET max_val = 15           WHERE id = 'pf_g1_abd_1';
UPDATE public.m15_pcd_faixas SET min_val = 15, max_val = 25 WHERE id = 'pf_g1_abd_2';
-- pf_g1_abd_3 [25, null] ja correto

UPDATE public.m15_pcd_faixas SET min_val = 9            WHERE id = 'pf_g1_agi_1';
UPDATE public.m15_pcd_faixas SET min_val = 8, max_val = 9 WHERE id = 'pf_g1_agi_2';
UPDATE public.m15_pcd_faixas SET max_val = 8            WHERE id = 'pf_g1_agi_3';

-- pf_g1_fle_1 [0,8] ja correto
UPDATE public.m15_pcd_faixas SET min_val = 8            WHERE id = 'pf_g1_fle_2';
UPDATE public.m15_pcd_faixas SET min_val = 15           WHERE id = 'pf_g1_fle_3';

-- pf_g1_sal_1 [0,100] ja correto
UPDATE public.m15_pcd_faixas SET min_val = 100          WHERE id = 'pf_g1_sal_2';
UPDATE public.m15_pcd_faixas SET min_val = 130          WHERE id = 'pf_g1_sal_3';

UPDATE public.m15_pcd_faixas SET min_val = 5.2          WHERE id = 'pf_g1_vel_1';
UPDATE public.m15_pcd_faixas SET min_val = 4.5          WHERE id = 'pf_g1_vel_2';
-- pf_g1_vel_3 [0,4.5] ja correto

-- -----------------------------------------------------------------------------
-- GRUPO 2
-- -----------------------------------------------------------------------------
-- pf_g2_abd_1 [0,10] ja correto
UPDATE public.m15_pcd_faixas SET min_val = 10           WHERE id = 'pf_g2_abd_2';
UPDATE public.m15_pcd_faixas SET min_val = 20           WHERE id = 'pf_g2_abd_3';

UPDATE public.m15_pcd_faixas SET min_val = 13           WHERE id = 'pf_g2_agi_1';
UPDATE public.m15_pcd_faixas SET min_val = 11, max_val = 13 WHERE id = 'pf_g2_agi_2';
UPDATE public.m15_pcd_faixas SET max_val = 11           WHERE id = 'pf_g2_agi_3';

-- pf_g2_fle_1 [0,8] ja correto
UPDATE public.m15_pcd_faixas SET min_val = 8            WHERE id = 'pf_g2_fle_2';
UPDATE public.m15_pcd_faixas SET min_val = 15           WHERE id = 'pf_g2_fle_3';

UPDATE public.m15_pcd_faixas SET min_val = 7.5          WHERE id = 'pf_g2_vel_1';
UPDATE public.m15_pcd_faixas SET min_val = 6.5          WHERE id = 'pf_g2_vel_2';
-- pf_g2_vel_3 [0,6.5] ja correto

-- -----------------------------------------------------------------------------
-- GRUPO 4
-- -----------------------------------------------------------------------------
-- pf_g4_abd_1 [0,15] ja correto
UPDATE public.m15_pcd_faixas SET min_val = 15           WHERE id = 'pf_g4_abd_2';
UPDATE public.m15_pcd_faixas SET min_val = 25           WHERE id = 'pf_g4_abd_3';

UPDATE public.m15_pcd_faixas SET min_val = 10.2         WHERE id = 'pf_g4_agi_1';
UPDATE public.m15_pcd_faixas SET min_val = 8.8, max_val = 10.2 WHERE id = 'pf_g4_agi_2';
UPDATE public.m15_pcd_faixas SET max_val = 8.8          WHERE id = 'pf_g4_agi_3';

-- pf_g4_fle_1 [0,8] ja correto
UPDATE public.m15_pcd_faixas SET min_val = 8            WHERE id = 'pf_g4_fle_2';
UPDATE public.m15_pcd_faixas SET min_val = 15           WHERE id = 'pf_g4_fle_3';

-- pf_g4_sal_1 [0,100] ja correto
UPDATE public.m15_pcd_faixas SET min_val = 100          WHERE id = 'pf_g4_sal_2';
UPDATE public.m15_pcd_faixas SET min_val = 130          WHERE id = 'pf_g4_sal_3';

UPDATE public.m15_pcd_faixas SET min_val = 5.8          WHERE id = 'pf_g4_vel_1';
UPDATE public.m15_pcd_faixas SET min_val = 4.8          WHERE id = 'pf_g4_vel_2';
-- pf_g4_vel_3 [0,4.8] ja correto

-- -----------------------------------------------------------------------------
-- GRUPO 5
-- -----------------------------------------------------------------------------
-- pf_g5_abd_1 [0,15] ja correto
UPDATE public.m15_pcd_faixas SET min_val = 15           WHERE id = 'pf_g5_abd_2';
UPDATE public.m15_pcd_faixas SET min_val = 25           WHERE id = 'pf_g5_abd_3';

UPDATE public.m15_pcd_faixas SET min_val = 9            WHERE id = 'pf_g5_agi_1';
UPDATE public.m15_pcd_faixas SET max_val = 9            WHERE id = 'pf_g5_agi_2';
UPDATE public.m15_pcd_faixas SET max_val = 8            WHERE id = 'pf_g5_agi_3';

-- pf_g5_fle_1 [0,8] ja correto
UPDATE public.m15_pcd_faixas SET min_val = 8            WHERE id = 'pf_g5_fle_2';
UPDATE public.m15_pcd_faixas SET min_val = 15           WHERE id = 'pf_g5_fle_3';

-- pf_g5_sal_1 [0,100] ja correto
UPDATE public.m15_pcd_faixas SET min_val = 100          WHERE id = 'pf_g5_sal_2';
UPDATE public.m15_pcd_faixas SET min_val = 130          WHERE id = 'pf_g5_sal_3';

UPDATE public.m15_pcd_faixas SET min_val = 5.2          WHERE id = 'pf_g5_vel_1';
UPDATE public.m15_pcd_faixas SET min_val = 4.5          WHERE id = 'pf_g5_vel_2';
-- pf_g5_vel_3 [0,4.5] ja correto

-- -----------------------------------------------------------------------------
-- GRUPO 6
-- -----------------------------------------------------------------------------
-- pf_g6_abd_1 [0,10] ja correto
UPDATE public.m15_pcd_faixas SET min_val = 10           WHERE id = 'pf_g6_abd_2';
UPDATE public.m15_pcd_faixas SET min_val = 20           WHERE id = 'pf_g6_abd_3';

UPDATE public.m15_pcd_faixas SET min_val = 10.5         WHERE id = 'pf_g6_agi_1';
UPDATE public.m15_pcd_faixas SET min_val = 9            WHERE id = 'pf_g6_agi_2';
UPDATE public.m15_pcd_faixas SET max_val = 9            WHERE id = 'pf_g6_agi_3';

-- pf_g6_fle_1 [0,7] ja correto
UPDATE public.m15_pcd_faixas SET min_val = 7            WHERE id = 'pf_g6_fle_2';
UPDATE public.m15_pcd_faixas SET min_val = 13           WHERE id = 'pf_g6_fle_3';

-- pf_g6_sal_1 [0,90] ja correto
UPDATE public.m15_pcd_faixas SET min_val = 90           WHERE id = 'pf_g6_sal_2';
UPDATE public.m15_pcd_faixas SET min_val = 120          WHERE id = 'pf_g6_sal_3';

-- Velocidade do Grupo 6: repoe nota 2 e 3 (estavam faltando) e restaura as
-- fronteiras originais (nota1 [6,inf), nota2 [5,6), nota3 [0,5)).
UPDATE public.m15_pcd_faixas SET min_val = 6            WHERE id = 'pf_g6_vel_1';
INSERT INTO public.m15_pcd_faixas (id, grupo, detalhe, teste, nota, min_val, max_val)
VALUES ('pf_g6_vel_2', 6, '', 'velocidade', 2, 5, 6),
       ('pf_g6_vel_3', 6, '', 'velocidade', 3, 0, 5)
ON CONFLICT (id) DO UPDATE SET min_val = EXCLUDED.min_val, max_val = EXCLUDED.max_val;

-- =============================================================================
-- VERIFICACAO (nenhum buraco; max_val da nota N = min_val da nota N+1):
--   SELECT grupo, teste, nota, min_val, max_val FROM public.m15_pcd_faixas
--    ORDER BY grupo, detalhe, teste, nota;
-- =============================================================================