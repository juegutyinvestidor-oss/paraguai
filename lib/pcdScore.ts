// Engine de pontuacao da Avaliacao PCD (Modulo 15 - Qualidade Motora PCD).
// Implementa o "Protocolo de Avaliacao Fisica e Direcionamento Esportivo" para
// criancas e adolescentes com deficiencia (4 a 18 anos):
//   - Etapa B: escores brutos -> Notas Relativas de Aptidao (1 a 3) por teste,
//     calculadas a partir das faixas configuradas por grupo (m15_pcd_faixas).
//   - Etapa A/C: Matriz de Pesos por modalidade (m15_pcd_modalidades) e a soma
//     ponderada PC = Somatorio(Nota x Peso) nas 4 valencias.
//   - Etapa D: Funil qualitativo aplicado na interface (parecer tecnico).
// Para testes marcados como "Nao aplicavel" a valencia correspondente e
// ignorada; a compatibilidade e normalizada pela soma dos pesos aplicados,
// garantindo comparacao justa entre modalidades em qualquer grupo.

import type {
  PcdAdaptacaoConfig, PcdFaixaConfig, PcdModalidadeConfig, PcdCompatibilidade, PcdFunilConfig,
} from '../types/edukyne';

export type PcdTesteKey = 'abdominal' | 'velocidade' | 'agilidade' | 'salto' | 'flexao';

export interface PcdTesteConfig {
  key: PcdTesteKey;
  label: string;
  unidade: string;
  invertido: boolean; // true = menor valor, melhor desempenho
  objetivo: string;
  material: string;
  execucao: string;
  tentativas: string;
}

export const PCD_TESTES: PcdTesteConfig[] = [
  {
    key: 'abdominal',
    label: 'Abdominal (Prancha)',
    unidade: 'segundos',
    invertido: false,
    objetivo: 'Resistência estática (isometria) da musculatura de sustentação do tronco (core).',
    material: 'Colchonete e cronômetro de precisão.',
    execucao: 'Prancha ventral com apoio estável de antebraços e pontas dos pés, cotovelos alinhados sob os ombros, corpo em linha reta da cabeça aos calcanhares. Sustentar pelo maior tempo possível (teto de 30s).',
    tentativas: '01 tentativa oficial, precedida de demonstração técnica e 01 tentativa prática não cronometrada.',
  },
  {
    key: 'velocidade',
    label: 'Velocidade (Corrida 20m)',
    unidade: 'segundos',
    invertido: true,
    objetivo: 'Velocidade máxima de deslocamento em linha reta.',
    material: 'Espaço plano linear superior a 20m, cronômetro, trena e cones.',
    execucao: 'Partida em pé na linha de saída (um pé à frente). Aceleração máxima até cruzar a linha de chegada.',
    tentativas: '02 tentativas regulamentares; computa-se o menor tempo (1 casa decimal).',
  },
  {
    key: 'agilidade',
    label: 'Agilidade (Shuttle Run)',
    unidade: 'segundos',
    invertido: true,
    objetivo: 'Capacidade integrada de acelerar, desacelerar e mudar de direção.',
    material: 'Duas linhas paralelas a 9,14m, dois blocos (5x5x10cm), trena e cronômetro.',
    execucao: 'Corre até a linha oposta, recolhe um bloco, retorna e o deposita atrás da linha; repete com o segundo bloco. O cronômetro para quando o segundo bloco toca o chão.',
    tentativas: '1 a 2 tentativas conforme estabilização do padrão, com demonstração física prévia.',
  },
  {
    key: 'salto',
    label: 'Salto Horizontal',
    unidade: 'cm',
    invertido: false,
    objetivo: 'Potência muscular máxima dinâmica dos membros inferiores.',
    material: 'Trena fixada perpendicular à linha de partida.',
    execucao: 'Posicionamento estático atrás da linha, pés paralelos, joelhos semiflexionados. Salto impulsionado com ambos os pés, aterrissagem bilateral e equilibrada.',
    tentativas: '02 tentativas regulamentares; registra-se o melhor resultado (1 casa decimal).',
  },
  {
    key: 'flexao',
    label: 'Flexão de Braço',
    unidade: 'repetições',
    invertido: false,
    objetivo: 'Resistência de força muscular localizada da cintura escapular e membros superiores.',
    material: 'Colchonete de densidade média ou superfície emborrachada.',
    execucao: 'Apoio das mãos e pontas dos pés (ou joelhos apoiados na versão adaptada), tronco reto. Flexiona os cotovelos até ~90° e retorna em extensão completa. Repetir até fadiga.',
    tentativas: '01 tentativa oficial, precedida de demonstração visual e 01 repetição de ambientação.',
  },
];

export const PCD_TESTES_MAP = Object.fromEntries(PCD_TESTES.map(t => [t.key, t])) as Record<PcdTesteKey, PcdTesteConfig>;

export const PCD_GRUPO_NOMES: Record<number, string> = {
  1: 'Deficiência Física (Locomoção Independente)',
  2: 'Deficiência Física (Cadeira de Rodas)',
  3: 'Paralisia Cerebral (GMFCS)',
  4: 'Deficiência Visual (B1-B3)',
  5: 'Deficiência Auditiva',
  6: 'Deficiência Intelectual',
};

export const PCD_DETALHES_POR_GRUPO: Record<number, string[]> = {
  1: ['Locomoção autônoma', 'Locomoção com apoio (bengala/órtese)', 'Amputação'],
  2: ['Cadeira de rodas manual', 'Cadeira de rodas motorizada', 'Amputação'],
  3: ['GMFCS I', 'GMFCS II', 'GMFCS III', 'GMFCS IV', 'GMFCS V'],
  4: ['B1 (cegueira total)', 'B2 (deficiência grave)', 'B3 (baixa visão)'],
  5: ['Perda auditiva leve', 'Perda auditiva moderada', 'Perda auditiva severa', 'Perda auditiva profunda'],
  6: ['Funcionamento adaptativo leve', 'Funcionamento adaptativo moderado', 'Funcionamento adaptativo severo'],
};

export const PCD_NOTAS_LABELS: Record<number, string> = {
  1: 'Limitações Agudas',
  2: 'Desempenho Mediano',
  3: 'Desempenho Elevado',
};

export const PCD_STATUS_ADAPTACAO: string[] = ['Padrão', 'Adaptado', 'Substituído', 'Não aplicável'];

// --- Configuracoes padrao (fallback quando o banco nao esta configurado) ---
// Espelham as seeds da migration 20260921_001_avaliacao_pcd.sql.

export const DEFAULT_M15_ADAPTACOES: PcdAdaptacaoConfig[] = [
  { id: 'pa_g1_abd', grupo: 1, detalhe: '', teste: 'abdominal', status: 'Padrão', instrucao: 'Prancha ventral isométrica, teto de 30s.' },
  { id: 'pa_g1_vel', grupo: 1, detalhe: '', teste: 'velocidade', status: 'Padrão', instrucao: 'Corrida 20m com aceleração máxima.' },
  { id: 'pa_g1_agi', grupo: 1, detalhe: '', teste: 'agilidade', status: 'Padrão', instrucao: 'Shuttle run 9,14m com dois blocos.' },
  { id: 'pa_g1_sal', grupo: 1, detalhe: '', teste: 'salto', status: 'Padrão', instrucao: 'Salto horizontal em base bilateral. Avaliar criteriosamente a viabilidade articular em acometimentos severos de membros inferiores.' },
  { id: 'pa_g1_fle', grupo: 1, detalhe: '', teste: 'flexao', status: 'Padrão', instrucao: 'Flexão de braço; versão joelhos apoiados se necessário.' },
  { id: 'pa_g2_abd', grupo: 2, detalhe: '', teste: 'abdominal', status: 'Adaptado', instrucao: 'Mediante suporte, encosto ou estabilização mecânica de tronco.' },
  { id: 'pa_g2_vel', grupo: 2, detalhe: '', teste: 'velocidade', status: 'Substituído', instrucao: 'Propulsão rápida em cadeira de rodas ao longo dos 20m cronometrados.' },
  { id: 'pa_g2_agi', grupo: 2, detalhe: '', teste: 'agilidade', status: 'Adaptado', instrucao: 'Percurso sinuoso com propulsão manual ou teste de agilidade em cadeira.' },
  { id: 'pa_g2_sal', grupo: 2, detalhe: '', teste: 'salto', status: 'Adaptado', instrucao: 'Realizar padrão quando houver capacidade funcional e segurança. Não realizar quando o comprometimento dos membros inferiores tornar o salto inseguro ou inviável; nesse caso, considerar teste alternativo de potência dos membros inferiores, quando aplicável.' },
  { id: 'pa_g2_fle', grupo: 2, detalhe: '', teste: 'flexao', status: 'Padrão', instrucao: 'Aplicável na íntegra.' },
  { id: 'pa_g3_abd_a', grupo: 3, detalhe: 'GMFCS I-II', teste: 'abdominal', status: 'Padrão', instrucao: 'Ajustes mínimos pelo hemicorpo de maior dominância/espasticidade.' },
  { id: 'pa_g3_vel_a', grupo: 3, detalhe: 'GMFCS I-II', teste: 'velocidade', status: 'Padrão', instrucao: 'Ajustes mínimos pelo hemicorpo de maior dominância/espasticidade.' },
  { id: 'pa_g3_agi_a', grupo: 3, detalhe: 'GMFCS I-II', teste: 'agilidade', status: 'Padrão', instrucao: 'Ajustes mínimos pelo hemicorpo de maior dominância/espasticidade.' },
  { id: 'pa_g3_sal_a', grupo: 3, detalhe: 'GMFCS I-II', teste: 'salto', status: 'Padrão', instrucao: 'Ajustes mínimos pelo hemicorpo de maior dominância/espasticidade.' },
  { id: 'pa_g3_fle_a', grupo: 3, detalhe: 'GMFCS I-II', teste: 'flexao', status: 'Padrão', instrucao: 'Ajustes mínimos pelo hemicorpo de maior dominância/espasticidade.' },
  { id: 'pa_g3_abd_b', grupo: 3, detalhe: 'GMFCS III', teste: 'abdominal', status: 'Padrão', instrucao: 'Aplicável; requer avaliação individual prévia.' },
  { id: 'pa_g3_vel_b', grupo: 3, detalhe: 'GMFCS III', teste: 'velocidade', status: 'Adaptado', instrucao: 'Exige avaliação individual prévia (deambulação com apoio instrumental).' },
  { id: 'pa_g3_agi_b', grupo: 3, detalhe: 'GMFCS III', teste: 'agilidade', status: 'Adaptado', instrucao: 'Exige avaliação individual prévia (deambulação com apoio instrumental).' },
  { id: 'pa_g3_sal_b', grupo: 3, detalhe: 'GMFCS III', teste: 'salto', status: 'Adaptado', instrucao: 'Realizar somente quando houver capacidade funcional e segurança. Quando não for viável, considerar teste alternativo de potência dos membros inferiores.' },
  { id: 'pa_g3_fle_b', grupo: 3, detalhe: 'GMFCS III', teste: 'flexao', status: 'Padrão', instrucao: 'Aplicável.' },
  { id: 'pa_g3_abd_c', grupo: 3, detalhe: 'GMFCS IV-V', teste: 'abdominal', status: 'Adaptado', instrucao: 'Realizável apenas sob suporte e alta tolerância postural.' },
  { id: 'pa_g3_vel_c', grupo: 3, detalhe: 'GMFCS IV-V', teste: 'velocidade', status: 'Não aplicável', instrucao: 'Priorizar avaliação funcional clínica com fisioterapia.' },
  { id: 'pa_g3_agi_c', grupo: 3, detalhe: 'GMFCS IV-V', teste: 'agilidade', status: 'Não aplicável', instrucao: 'Priorizar avaliação funcional clínica com fisioterapia.' },
  { id: 'pa_g3_sal_c', grupo: 3, detalhe: 'GMFCS IV-V', teste: 'salto', status: 'Não aplicável', instrucao: 'Priorizar avaliação funcional clínica com fisioterapia.' },
  { id: 'pa_g3_fle_c', grupo: 3, detalhe: 'GMFCS IV-V', teste: 'flexao', status: 'Adaptado', instrucao: 'Padrão ou adaptado quando houver capacidade funcional dos membros superiores; caso contrário, priorizar avaliação funcional clínica com fisioterapia.' },
  { id: 'pa_g4_abd', grupo: 4, detalhe: '', teste: 'abdominal', status: 'Adaptado', instrucao: 'Movimento idêntico; demarcação tátil e comando verbal claro.' },
  { id: 'pa_g4_vel', grupo: 4, detalhe: '', teste: 'velocidade', status: 'Adaptado', instrucao: 'Guia humano ou corda-guia; comando sonoro; demarcação tátil na saída.' },
  { id: 'pa_g4_agi', grupo: 4, detalhe: '', teste: 'agilidade', status: 'Adaptado', instrucao: 'Guia humano ou corda-guia; demarcação tátil e comandos sonoros.' },
  { id: 'pa_g4_sal', grupo: 4, detalhe: '', teste: 'salto', status: 'Adaptado', instrucao: 'Linha de partida tátil (fita em relevo); comando sonoro claro.' },
  { id: 'pa_g4_fle', grupo: 4, detalhe: '', teste: 'flexao', status: 'Padrão', instrucao: 'Instrução verbal e cinestésica; demonstração física.' },
  { id: 'pa_g5_abd', grupo: 5, detalhe: '', teste: 'abdominal', status: 'Padrão', instrucao: 'Execução padrão; largada com estímulo visual nítido.' },
  { id: 'pa_g5_vel', grupo: 5, detalhe: '', teste: 'velocidade', status: 'Padrão', instrucao: 'Execução padrão; substituir sinal sonoro por estímulo visual nítido.' },
  { id: 'pa_g5_agi', grupo: 5, detalhe: '', teste: 'agilidade', status: 'Padrão', instrucao: 'Execução padrão; estímulos visuais nítidos.' },
  { id: 'pa_g5_sal', grupo: 5, detalhe: '', teste: 'salto', status: 'Padrão', instrucao: 'Execução padrão; comando visual.' },
  { id: 'pa_g5_fle', grupo: 5, detalhe: '', teste: 'flexao', status: 'Padrão', instrucao: 'Execução padrão; demonstração visual e suporte via Libras quando disponível.' },
  { id: 'pa_g6_abd', grupo: 6, detalhe: '', teste: 'abdominal', status: 'Padrão', instrucao: 'Demonstração física repetida e instruções em passos simples.' },
  { id: 'pa_g6_vel', grupo: 6, detalhe: '', teste: 'velocidade', status: 'Padrão', instrucao: 'Demonstração física repetida; tentativa prática extra não pontuada.' },
  { id: 'pa_g6_agi', grupo: 6, detalhe: '', teste: 'agilidade', status: 'Padrão', instrucao: 'Demonstração física repetida; retirada gradual de apoio verbal.' },
  { id: 'pa_g6_sal', grupo: 6, detalhe: '', teste: 'salto', status: 'Padrão', instrucao: 'Demonstração física repetida; tentativa prática extra não pontuada.' },
  { id: 'pa_g6_fle', grupo: 6, detalhe: '', teste: 'flexao', status: 'Padrão', instrucao: 'Demonstração física repetida; instruções em passos simples.' },
];

export const DEFAULT_M15_FAIXAS: PcdFaixaConfig[] = [
  { id: 'pf_g1_abd_1', grupo: 1, detalhe: '', teste: 'abdominal', nota: 1, minVal: 0, maxVal: 15 },
  { id: 'pf_g1_abd_2', grupo: 1, detalhe: '', teste: 'abdominal', nota: 2, minVal: 15, maxVal: 25 },
  { id: 'pf_g1_abd_3', grupo: 1, detalhe: '', teste: 'abdominal', nota: 3, minVal: 25, maxVal: null },
  { id: 'pf_g2_abd_1', grupo: 2, detalhe: '', teste: 'abdominal', nota: 1, minVal: 0, maxVal: 10 },
  { id: 'pf_g2_abd_2', grupo: 2, detalhe: '', teste: 'abdominal', nota: 2, minVal: 10, maxVal: 20 },
  { id: 'pf_g2_abd_3', grupo: 2, detalhe: '', teste: 'abdominal', nota: 3, minVal: 20, maxVal: null },
  { id: 'pf_g3_abd_1', grupo: 3, detalhe: 'GMFCS I-II', teste: 'abdominal', nota: 1, minVal: 0, maxVal: 12 },
  { id: 'pf_g3_abd_2', grupo: 3, detalhe: 'GMFCS I-II', teste: 'abdominal', nota: 2, minVal: 12, maxVal: 22 },
  { id: 'pf_g3_abd_3', grupo: 3, detalhe: 'GMFCS I-II', teste: 'abdominal', nota: 3, minVal: 22, maxVal: null },
  { id: 'pf_g3_abd_4', grupo: 3, detalhe: 'GMFCS III', teste: 'abdominal', nota: 1, minVal: 0, maxVal: 8 },
  { id: 'pf_g3_abd_5', grupo: 3, detalhe: 'GMFCS III', teste: 'abdominal', nota: 2, minVal: 8, maxVal: 16 },
  { id: 'pf_g3_abd_6', grupo: 3, detalhe: 'GMFCS III', teste: 'abdominal', nota: 3, minVal: 16, maxVal: null },
  { id: 'pf_g3_abd_7', grupo: 3, detalhe: 'GMFCS IV-V', teste: 'abdominal', nota: 1, minVal: 0, maxVal: 5 },
  { id: 'pf_g3_abd_8', grupo: 3, detalhe: 'GMFCS IV-V', teste: 'abdominal', nota: 2, minVal: 5, maxVal: 12 },
  { id: 'pf_g3_abd_9', grupo: 3, detalhe: 'GMFCS IV-V', teste: 'abdominal', nota: 3, minVal: 12, maxVal: null },
  { id: 'pf_g4_abd_1', grupo: 4, detalhe: '', teste: 'abdominal', nota: 1, minVal: 0, maxVal: 15 },
  { id: 'pf_g4_abd_2', grupo: 4, detalhe: '', teste: 'abdominal', nota: 2, minVal: 15, maxVal: 25 },
  { id: 'pf_g4_abd_3', grupo: 4, detalhe: '', teste: 'abdominal', nota: 3, minVal: 25, maxVal: null },
  { id: 'pf_g5_abd_1', grupo: 5, detalhe: '', teste: 'abdominal', nota: 1, minVal: 0, maxVal: 15 },
  { id: 'pf_g5_abd_2', grupo: 5, detalhe: '', teste: 'abdominal', nota: 2, minVal: 15, maxVal: 25 },
  { id: 'pf_g5_abd_3', grupo: 5, detalhe: '', teste: 'abdominal', nota: 3, minVal: 25, maxVal: null },
  { id: 'pf_g6_abd_1', grupo: 6, detalhe: '', teste: 'abdominal', nota: 1, minVal: 0, maxVal: 10 },
  { id: 'pf_g6_abd_2', grupo: 6, detalhe: '', teste: 'abdominal', nota: 2, minVal: 10, maxVal: 20 },
  { id: 'pf_g6_abd_3', grupo: 6, detalhe: '', teste: 'abdominal', nota: 3, minVal: 20, maxVal: null },

  { id: 'pf_g1_vel_1', grupo: 1, detalhe: '', teste: 'velocidade', nota: 1, minVal: 5.2, maxVal: null },
  { id: 'pf_g1_vel_2', grupo: 1, detalhe: '', teste: 'velocidade', nota: 2, minVal: 4.5, maxVal: 5.2 },
  { id: 'pf_g1_vel_3', grupo: 1, detalhe: '', teste: 'velocidade', nota: 3, minVal: 0, maxVal: 4.5 },
  { id: 'pf_g2_vel_1', grupo: 2, detalhe: '', teste: 'velocidade', nota: 1, minVal: 7.5, maxVal: null },
  { id: 'pf_g2_vel_2', grupo: 2, detalhe: '', teste: 'velocidade', nota: 2, minVal: 6.5, maxVal: 7.5 },
  { id: 'pf_g2_vel_3', grupo: 2, detalhe: '', teste: 'velocidade', nota: 3, minVal: 0, maxVal: 6.5 },
  { id: 'pf_g3_vel_1', grupo: 3, detalhe: 'GMFCS I-II', teste: 'velocidade', nota: 1, minVal: 6.5, maxVal: null },
  { id: 'pf_g3_vel_2', grupo: 3, detalhe: 'GMFCS I-II', teste: 'velocidade', nota: 2, minVal: 5.5, maxVal: 6.5 },
  { id: 'pf_g3_vel_3', grupo: 3, detalhe: 'GMFCS I-II', teste: 'velocidade', nota: 3, minVal: 0, maxVal: 5.5 },
  { id: 'pf_g3_vel_4', grupo: 3, detalhe: 'GMFCS III', teste: 'velocidade', nota: 1, minVal: 8.5, maxVal: null },
  { id: 'pf_g3_vel_5', grupo: 3, detalhe: 'GMFCS III', teste: 'velocidade', nota: 2, minVal: 7.0, maxVal: 8.5 },
  { id: 'pf_g3_vel_6', grupo: 3, detalhe: 'GMFCS III', teste: 'velocidade', nota: 3, minVal: 0, maxVal: 7.0 },
  { id: 'pf_g4_vel_1', grupo: 4, detalhe: '', teste: 'velocidade', nota: 1, minVal: 5.8, maxVal: null },
  { id: 'pf_g4_vel_2', grupo: 4, detalhe: '', teste: 'velocidade', nota: 2, minVal: 4.8, maxVal: 5.8 },
  { id: 'pf_g4_vel_3', grupo: 4, detalhe: '', teste: 'velocidade', nota: 3, minVal: 0, maxVal: 4.8 },
  { id: 'pf_g5_vel_1', grupo: 5, detalhe: '', teste: 'velocidade', nota: 1, minVal: 5.2, maxVal: null },
  { id: 'pf_g5_vel_2', grupo: 5, detalhe: '', teste: 'velocidade', nota: 2, minVal: 4.5, maxVal: 5.2 },
  { id: 'pf_g5_vel_3', grupo: 5, detalhe: '', teste: 'velocidade', nota: 3, minVal: 0, maxVal: 4.5 },
  { id: 'pf_g6_vel_1', grupo: 6, detalhe: '', teste: 'velocidade', nota: 1, minVal: 6.0, maxVal: null },
  { id: 'pf_g6_vel_2', grupo: 6, detalhe: '', teste: 'velocidade', nota: 2, minVal: 5.0, maxVal: 6.0 },
  { id: 'pf_g6_vel_3', grupo: 6, detalhe: '', teste: 'velocidade', nota: 3, minVal: 0, maxVal: 5.0 },

  { id: 'pf_g1_agi_1', grupo: 1, detalhe: '', teste: 'agilidade', nota: 1, minVal: 9.0, maxVal: null },
  { id: 'pf_g1_agi_2', grupo: 1, detalhe: '', teste: 'agilidade', nota: 2, minVal: 8.0, maxVal: 9.0 },
  { id: 'pf_g1_agi_3', grupo: 1, detalhe: '', teste: 'agilidade', nota: 3, minVal: 0, maxVal: 8.0 },
  { id: 'pf_g2_agi_1', grupo: 2, detalhe: '', teste: 'agilidade', nota: 1, minVal: 13.0, maxVal: null },
  { id: 'pf_g2_agi_2', grupo: 2, detalhe: '', teste: 'agilidade', nota: 2, minVal: 11.0, maxVal: 13.0 },
  { id: 'pf_g2_agi_3', grupo: 2, detalhe: '', teste: 'agilidade', nota: 3, minVal: 0, maxVal: 11.0 },
  { id: 'pf_g3_agi_1', grupo: 3, detalhe: 'GMFCS I-II', teste: 'agilidade', nota: 1, minVal: 11.0, maxVal: null },
  { id: 'pf_g3_agi_2', grupo: 3, detalhe: 'GMFCS I-II', teste: 'agilidade', nota: 2, minVal: 9.5, maxVal: 11.0 },
  { id: 'pf_g3_agi_3', grupo: 3, detalhe: 'GMFCS I-II', teste: 'agilidade', nota: 3, minVal: 0, maxVal: 9.5 },
  { id: 'pf_g3_agi_4', grupo: 3, detalhe: 'GMFCS III', teste: 'agilidade', nota: 1, minVal: 14.5, maxVal: null },
  { id: 'pf_g3_agi_5', grupo: 3, detalhe: 'GMFCS III', teste: 'agilidade', nota: 2, minVal: 12.0, maxVal: 14.5 },
  { id: 'pf_g3_agi_6', grupo: 3, detalhe: 'GMFCS III', teste: 'agilidade', nota: 3, minVal: 0, maxVal: 12.0 },
  { id: 'pf_g4_agi_1', grupo: 4, detalhe: '', teste: 'agilidade', nota: 1, minVal: 10.2, maxVal: null },
  { id: 'pf_g4_agi_2', grupo: 4, detalhe: '', teste: 'agilidade', nota: 2, minVal: 8.8, maxVal: 10.2 },
  { id: 'pf_g4_agi_3', grupo: 4, detalhe: '', teste: 'agilidade', nota: 3, minVal: 0, maxVal: 8.8 },
  { id: 'pf_g5_agi_1', grupo: 5, detalhe: '', teste: 'agilidade', nota: 1, minVal: 9.0, maxVal: null },
  { id: 'pf_g5_agi_2', grupo: 5, detalhe: '', teste: 'agilidade', nota: 2, minVal: 8.0, maxVal: 9.0 },
  { id: 'pf_g5_agi_3', grupo: 5, detalhe: '', teste: 'agilidade', nota: 3, minVal: 0, maxVal: 8.0 },
  { id: 'pf_g6_agi_1', grupo: 6, detalhe: '', teste: 'agilidade', nota: 1, minVal: 10.5, maxVal: null },
  { id: 'pf_g6_agi_2', grupo: 6, detalhe: '', teste: 'agilidade', nota: 2, minVal: 9.0, maxVal: 10.5 },
  { id: 'pf_g6_agi_3', grupo: 6, detalhe: '', teste: 'agilidade', nota: 3, minVal: 0, maxVal: 9.0 },

  { id: 'pf_g1_sal_1', grupo: 1, detalhe: '', teste: 'salto', nota: 1, minVal: 0, maxVal: 100 },
  { id: 'pf_g1_sal_2', grupo: 1, detalhe: '', teste: 'salto', nota: 2, minVal: 100, maxVal: 130 },
  { id: 'pf_g1_sal_3', grupo: 1, detalhe: '', teste: 'salto', nota: 3, minVal: 130, maxVal: null },
  { id: 'pf_g3_sal_1', grupo: 3, detalhe: 'GMFCS I-II', teste: 'salto', nota: 1, minVal: 0, maxVal: 80 },
  { id: 'pf_g3_sal_2', grupo: 3, detalhe: 'GMFCS I-II', teste: 'salto', nota: 2, minVal: 80, maxVal: 110 },
  { id: 'pf_g3_sal_3', grupo: 3, detalhe: 'GMFCS I-II', teste: 'salto', nota: 3, minVal: 110, maxVal: null },
  { id: 'pf_g4_sal_1', grupo: 4, detalhe: '', teste: 'salto', nota: 1, minVal: 0, maxVal: 100 },
  { id: 'pf_g4_sal_2', grupo: 4, detalhe: '', teste: 'salto', nota: 2, minVal: 100, maxVal: 130 },
  { id: 'pf_g4_sal_3', grupo: 4, detalhe: '', teste: 'salto', nota: 3, minVal: 130, maxVal: null },
  { id: 'pf_g5_sal_1', grupo: 5, detalhe: '', teste: 'salto', nota: 1, minVal: 0, maxVal: 100 },
  { id: 'pf_g5_sal_2', grupo: 5, detalhe: '', teste: 'salto', nota: 2, minVal: 100, maxVal: 130 },
  { id: 'pf_g5_sal_3', grupo: 5, detalhe: '', teste: 'salto', nota: 3, minVal: 130, maxVal: null },
  { id: 'pf_g6_sal_1', grupo: 6, detalhe: '', teste: 'salto', nota: 1, minVal: 0, maxVal: 90 },
  { id: 'pf_g6_sal_2', grupo: 6, detalhe: '', teste: 'salto', nota: 2, minVal: 90, maxVal: 120 },
  { id: 'pf_g6_sal_3', grupo: 6, detalhe: '', teste: 'salto', nota: 3, minVal: 120, maxVal: null },

  { id: 'pf_g1_fle_1', grupo: 1, detalhe: '', teste: 'flexao', nota: 1, minVal: 0, maxVal: 8 },
  { id: 'pf_g1_fle_2', grupo: 1, detalhe: '', teste: 'flexao', nota: 2, minVal: 8, maxVal: 15 },
  { id: 'pf_g1_fle_3', grupo: 1, detalhe: '', teste: 'flexao', nota: 3, minVal: 15, maxVal: null },
  { id: 'pf_g2_fle_1', grupo: 2, detalhe: '', teste: 'flexao', nota: 1, minVal: 0, maxVal: 8 },
  { id: 'pf_g2_fle_2', grupo: 2, detalhe: '', teste: 'flexao', nota: 2, minVal: 8, maxVal: 15 },
  { id: 'pf_g2_fle_3', grupo: 2, detalhe: '', teste: 'flexao', nota: 3, minVal: 15, maxVal: null },
  { id: 'pf_g3_fle_1', grupo: 3, detalhe: 'GMFCS I-II', teste: 'flexao', nota: 1, minVal: 0, maxVal: 6 },
  { id: 'pf_g3_fle_2', grupo: 3, detalhe: 'GMFCS I-II', teste: 'flexao', nota: 2, minVal: 6, maxVal: 12 },
  { id: 'pf_g3_fle_3', grupo: 3, detalhe: 'GMFCS I-II', teste: 'flexao', nota: 3, minVal: 12, maxVal: null },
  { id: 'pf_g3_fle_4', grupo: 3, detalhe: 'GMFCS III', teste: 'flexao', nota: 1, minVal: 0, maxVal: 5 },
  { id: 'pf_g3_fle_5', grupo: 3, detalhe: 'GMFCS III', teste: 'flexao', nota: 2, minVal: 5, maxVal: 10 },
  { id: 'pf_g3_fle_6', grupo: 3, detalhe: 'GMFCS III', teste: 'flexao', nota: 3, minVal: 10, maxVal: null },
  { id: 'pf_g4_fle_1', grupo: 4, detalhe: '', teste: 'flexao', nota: 1, minVal: 0, maxVal: 8 },
  { id: 'pf_g4_fle_2', grupo: 4, detalhe: '', teste: 'flexao', nota: 2, minVal: 8, maxVal: 15 },
  { id: 'pf_g4_fle_3', grupo: 4, detalhe: '', teste: 'flexao', nota: 3, minVal: 15, maxVal: null },
  { id: 'pf_g5_fle_1', grupo: 5, detalhe: '', teste: 'flexao', nota: 1, minVal: 0, maxVal: 8 },
  { id: 'pf_g5_fle_2', grupo: 5, detalhe: '', teste: 'flexao', nota: 2, minVal: 8, maxVal: 15 },
  { id: 'pf_g5_fle_3', grupo: 5, detalhe: '', teste: 'flexao', nota: 3, minVal: 15, maxVal: null },
  { id: 'pf_g6_fle_1', grupo: 6, detalhe: '', teste: 'flexao', nota: 1, minVal: 0, maxVal: 7 },
  { id: 'pf_g6_fle_2', grupo: 6, detalhe: '', teste: 'flexao', nota: 2, minVal: 7, maxVal: 13 },
  { id: 'pf_g6_fle_3', grupo: 6, detalhe: '', teste: 'flexao', nota: 3, minVal: 13, maxVal: null },
];

export const DEFAULT_M15_MODALIDADES: PcdModalidadeConfig[] = [
  { id: 'pm1', nome: 'Atletismo (Velocidade)', pesoVelAgil: 3, pesoForcaExp: 3, pesoMembrosSup: 1, pesoCore: 2, descricao: 'Velocidade e potência de membros inferiores são cruciais.' },
  { id: 'pm2', nome: 'Basquete / Rugby em Cadeira', pesoVelAgil: 3, pesoForcaExp: 2, pesoMembrosSup: 3, pesoCore: 2, descricao: 'Deslocamento, potência e uso intenso de membros superiores sobre a cadeira.' },
  { id: 'pm3', nome: 'Natação Adaptada', pesoVelAgil: 2, pesoForcaExp: 2, pesoMembrosSup: 3, pesoCore: 3, descricao: 'Força de membros superiores e estabilidade central do tronco determinam o êxito.' },
  { id: 'pm4', nome: 'Boccia (Bocha Adaptada)', pesoVelAgil: 1, pesoForcaExp: 1, pesoMembrosSup: 1, pesoCore: 3, descricao: 'Precisão com estabilidade de tronco; baixa exigência de deslocamento.' },
  { id: 'pm5', nome: 'Goalball / Futebol de 5', pesoVelAgil: 3, pesoForcaExp: 2, pesoMembrosSup: 2, pesoCore: 2, descricao: 'Deslocamento orientado, agilidade e velocidade de reação.' },
  { id: 'pm6', nome: 'Halterofilismo Adaptado', pesoVelAgil: 1, pesoForcaExp: 3, pesoMembrosSup: 3, pesoCore: 2, descricao: 'Potência de membros superiores e inferiores com estabilidade de tronco.' },
];

export const DEFAULT_M15_FUNIL: { id: string; grupo: number; momento: number; titulo: string; regra: string }[] = [
  { id: 'pu1_1', grupo: 1, momento: 1, titulo: 'Filtro Clínico/Grupo', regra: 'Adequação postural intrínseca: avaliar articulações de membros inferiores antes do salto.' },
  { id: 'pu2_1', grupo: 2, momento: 1, titulo: 'Filtro Clínico/Grupo', regra: 'Priorizar provas de membros superiores e estabilização de tronco; evitar impacto vertical.' },
  { id: 'pu2_2', grupo: 2, momento: 2, titulo: 'Filtro Cognitivo/Sensorial', regra: 'Orientar percurso de agilidade em cadeira e adaptar comandos ao nível de compreensão.' },
  { id: 'pu3_1', grupo: 3, momento: 1, titulo: 'Filtro Clínico/Grupo', regra: 'Cruzar o nível GMFCS com cada modalidade; respeitar contra-indicações por padrão motor.' },
  { id: 'pu4_2', grupo: 4, momento: 2, titulo: 'Filtro Cognitivo/Sensorial', regra: 'Preferir modalidades como Goalball ou Futebol de 5; prever guia/comandos sonoros e demarcação tátil.' },
  { id: 'pu5_2', grupo: 5, momento: 2, titulo: 'Filtro Cognitivo/Sensorial', regra: 'Assegurar estímulos visuais nítidos e suporte via Libras.' },
  { id: 'pu6_2', grupo: 6, momento: 2, titulo: 'Filtro Cognitivo/Sensorial', regra: 'Fragmentar instruções, demonstrar repetidamente e permitir tentativa prática extra.' },
  { id: 'pu_all_3', grupo: 0, momento: 3, titulo: 'Filtro de Preferência e Desejo Pessoal', regra: 'Considerar soberanamente a preferência e o desejo pessoal da criança/adolescente na escolha final da modalidade.' },
];

export const M15_GRUPOS_PADRAO = [
  { grupo: 1, nome: 'Deficiência Física (Locomoção Independente)', descricao: 'Criança anda/caminha de forma autônoma ou com auxílio leve (bengala, órtese), com acometimento estrutural sem alteração neurológica central.', laudo: 'Diagnóstico clínico formal + classificação de gravidade. Detalhar nível de amputação se houver.' },
  { grupo: 2, nome: 'Deficiência Física (Cadeira de Rodas)', descricao: 'Cadeira de rodas como mecanismo principal ou exclusivo de locomoção. Testes adaptados ou substituídos.', laudo: 'Diagnóstico clínico formal + laudo médico. Confirmar uso de cadeira como meio principal.' },
  { grupo: 3, nome: 'Paralisia Cerebral (GMFCS)', descricao: 'Classificação obrigatória prévia pela Escala GMFCS (níveis I a V) antes de delimitar qualquer teste.', laudo: 'Aplicação obrigatória da Escala GMFCS + laudo médico.' },
  { grupo: 4, nome: 'Deficiência Visual (B1-B3)', descricao: 'Estrutura motora global preservada. Ajustes na instrução verbal, cinestésica e orientação espacial.', laudo: 'Mapeamento do nível de acuidade visual (B1, B2 ou B3) + laudo oftalmológico.' },
  { grupo: 5, nome: 'Deficiência Auditiva', descricao: 'Funções motoras e de orientação espacial preservadas. Adaptações nos canais de comunicação.', laudo: 'Identificação do grau de perda auditiva (leve, moderada, severa ou profunda) + laudo audiológico.' },
  { grupo: 6, nome: 'Deficiência Intelectual', descricao: 'Capacidades sensoriais e motoras íntegras. Barreira primária na cognição e compreensão das tarefas.', laudo: 'Nível de funcionamento adaptativo (leve, moderado ou severo) respaldado por laudo psicológico/pedagógico.' },
];

// --- Funcoes de calculo ---

// Normaliza niveis individuais de GMFCS para as faixas cadastradas (GMFCS I-II / III / IV-V),
// mantendo o calculo valido quando o detalhe selecionado e um nivel isolado (I a V).
function normDetalhe(d: string): string {
  const t = (d || '').trim();
  if (t === 'GMFCS I' || t === 'GMFCS II') return 'GMFCS I-II';
  if (t === 'GMFCS IV' || t === 'GMFCS V') return 'GMFCS IV-V';
  return t;
}

export function findAdaptacao(
  adaptacoes: PcdAdaptacaoConfig[],
  grupo: number,
  detalhe: string,
  teste: PcdTesteKey
): PcdAdaptacaoConfig | undefined {
  const key = normDetalhe(detalhe);
  const exact = adaptacoes.find(a => a.grupo === grupo && a.teste === teste && normDetalhe(a.detalhe || '') === key);
  if (exact) return exact;
  return adaptacoes.find(a => a.grupo === grupo && a.teste === teste && normDetalhe(a.detalhe || '') === '');
}

export function findFaixas(
  faixas: PcdFaixaConfig[],
  grupo: number,
  detalhe: string,
  teste: PcdTesteKey
): PcdFaixaConfig[] {
  const key = normDetalhe(detalhe);
  const exact = faixas.filter(f => f.grupo === grupo && f.teste === teste && normDetalhe(f.detalhe || '') === key);
  if (exact.length > 0) return exact;
  return faixas.filter(f => f.grupo === grupo && f.teste === teste && normDetalhe(f.detalhe || '') === '');
}

export function notaForValue(
  teste: PcdTesteKey,
  value: number | null | undefined,
  faixas: PcdFaixaConfig[]
): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  const v = Number(value);
  const bands = faixas.filter(f => f.teste === teste);
  for (const f of bands) {
    const min = f.minVal ?? -Infinity;
    const max = f.maxVal ?? Infinity;
    if (v >= min && v < max) return f.nota;
  }
  return 0;
}

export interface PcdScoreInputValues {
  abdominalS: number | null;
  velocidadeS: number | null;
  agilidadeS: number | null;
  saltoCm: number | null;
  flexaoRep: number | null;
}

export interface PcdValenciaNotas {
  velAgil: number;
  forcaExplosiva: number;
  membrosSup: number;
  core: number;
}

export interface PcdAdaptacaoAplicada {
  teste: PcdTesteKey;
  status: string;
  instrucao: string;
}

export interface PcdFunilItem {
  momento: number;
  titulo: string;
  regra: string;
}

export interface PcdScoreResult {
  notasPorTeste: Record<PcdTesteKey, number>;
  notasValencias: PcdValenciaNotas;
  notasBrutas: PcdValenciaNotas;
  compatibilidade: PcdCompatibilidade[];
  direcionamento: string;
  classificacaoPerfil: string;
  aplicaveis: Record<PcdTesteKey, boolean>;
  adaptacoesAplicadas: PcdAdaptacaoAplicada[];
  funil: PcdFunilItem[];
}

export function computePcdScore(
  grupo: number,
  detalhe: string,
  values: PcdScoreInputValues,
  adaptacoes: PcdAdaptacaoConfig[],
  faixas: PcdFaixaConfig[],
  modalidades: PcdModalidadeConfig[],
  funil: PcdFunilConfig[] = []
): PcdScoreResult {
  const raw: Record<PcdTesteKey, number | null> = {
    abdominal: values.abdominalS,
    velocidade: values.velocidadeS,
    agilidade: values.agilidadeS,
    salto: values.saltoCm,
    flexao: values.flexaoRep,
  };

  // Testes menor-melhor (velocidade, agilidade): 0 ou negativo e fisicamente
  // impossivel e indica "nao avaliado". Tratado como vazio para nao gerar nota 3.
  (Object.keys(raw) as PcdTesteKey[]).forEach(k => {
    const val = raw[k];
    if (PCD_TESTES_MAP[k].invertido && val !== null && Number(val) <= 0) raw[k] = null;
  });

  const notasPorTeste = {} as Record<PcdTesteKey, number>;
  const aplicaveis = {} as Record<PcdTesteKey, boolean>;
  const adaptacoesAplicadas: PcdAdaptacaoAplicada[] = [];

  (Object.keys(PCD_TESTES_MAP) as PcdTesteKey[]).forEach(teste => {
    const adapt = findAdaptacao(adaptacoes, grupo, detalhe, teste);
    const status = adapt?.status ?? 'Padrão';
    if (adapt) adaptacoesAplicadas.push({ teste, status, instrucao: adapt.instrucao || '' });
    if (status === 'Não aplicável') {
      notasPorTeste[teste] = 0;
      aplicaveis[teste] = false;
    } else {
      aplicaveis[teste] = true;
      const bandas = findFaixas(faixas, grupo, detalhe, teste);
      notasPorTeste[teste] = notaForValue(teste, raw[teste], bandas);
    }
  });

  // Notas brutas por valencia (Etapa C): Velocidade e Agilidade guardadas separadamente.
  const notasBrutas: PcdValenciaNotas = {
    velAgil: 0,
    forcaExplosiva: notasPorTeste.salto,
    membrosSup: notasPorTeste.flexao,
    core: notasPorTeste.abdominal,
  };

  // Nota combinada de Velocidade+Agilidade (media das notas disponiveis).
  const velAgilBase = [notasPorTeste.velocidade, notasPorTeste.agilidade].filter(n => n > 0);
  const notaVelAgil = velAgilBase.length > 0 ? Math.round(velAgilBase.reduce((a, b) => a + b, 0) / velAgilBase.length) : 0;
  const notasValencias: PcdValenciaNotas = {
    velAgil: notaVelAgil,
    forcaExplosiva: notasPorTeste.salto,
    membrosSup: notasPorTeste.flexao,
    core: notasPorTeste.abdominal,
  };
  notasBrutas.velAgil = notaVelAgil;

  const valencias: { label: string; nota: number }[] = [
    { label: 'Velocidade e Agilidade', nota: notasValencias.velAgil },
    { label: 'Força Explosiva (Membros Inf.)', nota: notasValencias.forcaExplosiva },
    { label: 'Força/Resistência (Membros Sup.)', nota: notasValencias.membrosSup },
    { label: 'Estabilidade de Tronco / Core', nota: notasValencias.core },
  ];

  const compatibilidade: PcdCompatibilidade[] = modalidades.map(m => {
    const pesos = [m.pesoVelAgil, m.pesoForcaExp, m.pesoMembrosSup, m.pesoCore];
    let soma = 0;
    let somaPesos = 0;
    valencias.forEach((v, i) => {
      if (v.nota > 0 && pesos[i] > 0) {
        soma += v.nota * pesos[i];
        somaPesos += pesos[i];
      }
    });
    // IAR = soma ponderada bruta do protocolo (Etapa D): Somatorio(Nota x Peso).
    // iarNormalizado = media ponderada (1..3), apenas para comparacao entre modalidades
    // quando ha testes nao aplicaveis no mesmo grupo. O ranking usa o IAR bruto.
    const iar = somaPesos > 0 ? Math.round(soma * 100) / 100 : 0;
    const iarNormalizado = somaPesos > 0 ? Math.round((soma / somaPesos) * 100) / 100 : 0;
    return { modalidade: m.nome, iar, iarNormalizado, maxIar: 36 };
  }) as PcdCompatibilidade[];

  compatibilidade.sort((a, b) => (b.iar ?? 0) - (a.iar ?? 0));

  const melhores = compatibilidade.filter(c => (c.iar ?? 0) > 0).slice(0, 3).map(c => c.modalidade);
  const direcionamento =
    melhores.length > 0
      ? `Pré-seleção (matriz física): ${melhores.join('; ')}. Indicação preliminar, sujeita ao funil qualitativo (filtros clínico-funcional, cognitivo-sensorial e de preferência do participante).`
      : 'Aguardando avaliação completa';

  const aplicadas = Object.values(notasValencias).filter(n => n > 0);
  const media = aplicadas.length > 0 ? aplicadas.reduce((a, b) => a + b, 0) / aplicadas.length : 0;
  const classificacaoPerfil =
    media >= 2.5 ? 'Perfil Motor Elevado' : media >= 1.5 ? 'Perfil Motor Mediano' : 'Perfil Motor com Limitações';

  const funilResult: PcdFunilItem[] = (() => {
    const aplicaveis = funil.filter(f => f.grupo === grupo || f.grupo === 0);
    const porMomento = new Map<number, PcdFunilItem>();
    // Especifico do grupo tem prioridade sobre o generico (grupo 0).
    for (const f of aplicaveis.sort((a, b) => (a.grupo === 0 ? 1 : 0) - (b.grupo === 0 ? 1 : 0))) {
      if (!porMomento.has(f.momento)) {
        porMomento.set(f.momento, { momento: f.momento, titulo: f.titulo, regra: f.regra });
      }
    }
    return [...porMomento.values()].sort((a, b) => a.momento - b.momento);
  })();

  return {
    notasPorTeste,
    notasValencias,
    notasBrutas,
    compatibilidade,
    direcionamento,
    classificacaoPerfil,
    aplicaveis,
    adaptacoesAplicadas,
    funil: funilResult,
  };
}