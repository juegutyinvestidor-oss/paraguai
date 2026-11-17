// SNAP-IV "Rastreamento do TDAH" scoring engine (Modulo 13).
// 18 itens, escala ordinal 0-3 (Nem um pouco / Só um pouco / Bastante / Demais).
// Bloco I (itens 1-9) = Desatenção; Bloco II (itens 10-18) = Hiperatividade/Impulsividade.
// Um item é "clínico" quando marcado Bastante (2) ou Demais (3).
// Se existirem >= 6 itens clínicos em um bloco (5 para 17 anos), há indicativo
// de sintomas naquele domínio.

export type SnapClassification =
  | 'Sinais de Desatenção'
  | 'Sinais de Hiperatividade/Impulsividade'
  | 'Sinais Combinados'
  | 'Sem Indícios Significativos';

export const SNAP_CLASSIFICATIONS: SnapClassification[] = [
  'Sinais de Desatenção',
  'Sinais de Hiperatividade/Impulsividade',
  'Sinais Combinados',
  'Sem Indícios Significativos',
];

// rótulos da escala 0-3 (índice 0 => valor 0).
export const SNAP_LIKERT_LABELS = [
  'Nem um pouco',
  'Só um pouco',
  'Bastante',
  'Demais',
];

export const SNAP_ITEM_COUNT = 18;
export const SNAP_INATTENTION_COUNT = 9;
export const SNAP_HYPERACTIVITY_COUNT = 9;

// valor mínimo (Bastante) que conta como sintoma clinicamente significativo.
export const SNAP_CLINICAL_VALUE = 2;
// quantidade de itens clínicos no bloco para acionar o indicativo.
export const SNAP_CLINICAL_THRESHOLD = 6;
// critério do DSM-5-TR para adolescentes de 17 anos.
export const SNAP_CLINICAL_THRESHOLD_17 = 5;

export function snapThresholdForAge(age?: number | null): number {
  return age != null && age >= 17 ? SNAP_CLINICAL_THRESHOLD_17 : SNAP_CLINICAL_THRESHOLD;
}

// quem preenche o instrumento (relato por terceiros).
export const SNAP_RESPONDENT_LABELS = ['Pai', 'Mãe', 'Responsável', 'Professor(a)'];

export type SnapSubscale = 'inattention' | 'hyperactivity';

export function snapSubscaleForOrd(ord: number): SnapSubscale {
  return ord <= SNAP_INATTENTION_COUNT ? 'inattention' : 'hyperactivity';
}

export interface SnapScores {
  inattention: number;
  hyperactivity: number;
}

// answers[i] corresponde ao item de ordinal i+1 (valores 0-3).
export function computeSnapScores(answers: number[]): SnapScores {
  let inattention = 0;
  let hyperactivity = 0;
  answers.forEach((value, idx) => {
    const v = Number(value);
    if (Number.isFinite(v) && v >= SNAP_CLINICAL_VALUE) {
      if (snapSubscaleForOrd(idx + 1) === 'inattention') inattention += 1;
      else hyperactivity += 1;
    }
  });
  return { inattention, hyperactivity };
}

export function classifySnapScores(
  scores: SnapScores,
  threshold: number = SNAP_CLINICAL_THRESHOLD,
): SnapClassification {
  const inat = scores.inattention >= threshold;
  const hip = scores.hyperactivity >= threshold;
  if (inat && hip) return 'Sinais Combinados';
  if (inat) return 'Sinais de Desatenção';
  if (hip) return 'Sinais de Hiperatividade/Impulsividade';
  return 'Sem Indícios Significativos';
}

export interface SnapScore {
  inattention: number;
  hyperactivity: number;
  classification: SnapClassification;
}

export function scoreSnap(
  answers: number[],
  threshold: number = SNAP_CLINICAL_THRESHOLD,
): SnapScore {
  const scores = computeSnapScores(answers);
  return { ...scores, classification: classifySnapScores(scores, threshold) };
}

export function isCompleteSnapAnswers(answers: number[]): boolean {
  return (
    Array.isArray(answers) &&
    answers.length === SNAP_ITEM_COUNT &&
    answers.every(a => Number.isInteger(a) && a >= 0 && a <= 3)
  );
}
