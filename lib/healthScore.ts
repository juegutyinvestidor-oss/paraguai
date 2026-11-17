// KIDSCREEN-10 "Saude Global" scoring engine.
// 10 itens, escala 1-5. Itens invertidos usam (6 - resposta).
// Escore Bruto (10-50) -> Escore T via tabela Rasch oficial (media 50, DP 10).
// Classificacao pelo T: <40 Baixa, 40-60 Normal, >60 Alta.

export type HealthClassification =
  | 'Qualidade de Vida Baixa'
  | 'Qualidade de Vida Normal'
  | 'Qualidade de Vida Alta';

export const HEALTH_CLASSIFICATIONS: HealthClassification[] = [
  'Qualidade de Vida Baixa',
  'Qualidade de Vida Normal',
  'Qualidade de Vida Alta',
];

// Rotulos da escala 1-5 (indice 0 => valor 1).
export const HEALTH_LIKERT_LABELS = [
  'Nunca',
  'Raramente',
  'Às vezes',
  'Frequentemente',
  'Sempre',
];

// Ordinals dos itens invertidos (regra do instrumento: perguntas 2, 3 e 10).
export const REVERSED_ITEM_ORDS = [2, 3, 10];

export const HEALTH_ITEM_COUNT = 10;

// Tabela Rasch oficial KIDSCREEN-10 (auto-relato): Escore Bruto -> Escore T.
// Fonte: kidscreen.org (Normdata_Raw-score_Rasch_T-Value_ENGLISH.xlsx).
export const KIDSCREEN10_T: Record<number, number> = {
  10: 0.0, 11: 7.3, 12: 12.44, 13: 15.88, 14: 18.5, 15: 20.6, 16: 22.4,
  17: 23.97, 18: 25.36, 19: 26.64, 20: 27.82, 21: 28.92, 22: 29.97, 23: 30.96,
  24: 31.93, 25: 32.87, 26: 33.79, 27: 34.7, 28: 35.6, 29: 36.51, 30: 37.42,
  31: 38.34, 32: 39.28, 33: 40.24, 34: 41.24, 35: 42.27, 36: 43.35, 37: 44.48,
  38: 45.67, 39: 46.94, 40: 48.29, 41: 49.76, 42: 51.36, 43: 53.11, 44: 55.07,
  45: 57.29, 46: 59.85, 47: 62.94, 48: 66.86, 49: 72.49, 50: 83.81,
};

export interface HealthScore {
  raw: number;
  t: number;
  classification: HealthClassification;
}

// answers[i] corresponde ao item de ordinal i+1 (valores 1-5).
export function computeRawScore(answers: number[]): number {
  return answers.reduce((sum, value, idx) => {
    const ord = idx + 1;
    const v = Number(value) || 0;
    const computed = REVERSED_ITEM_ORDS.includes(ord) ? 6 - v : v;
    return sum + computed;
  }, 0);
}

export function rawToT(raw: number): number {
  const clamped = Math.min(50, Math.max(10, Math.round(raw)));
  return KIDSCREEN10_T[clamped] ?? 0;
}

export function classifyT(t: number): HealthClassification {
  if (t < 40) return 'Qualidade de Vida Baixa';
  if (t <= 60) return 'Qualidade de Vida Normal';
  return 'Qualidade de Vida Alta';
}

export function scoreHealth(answers: number[]): HealthScore {
  const raw = computeRawScore(answers);
  const t = rawToT(raw);
  return { raw, t, classification: classifyT(t) };
}

export function isCompleteHealthAnswers(answers: number[]): boolean {
  return (
    Array.isArray(answers) &&
    answers.length === HEALTH_ITEM_COUNT &&
    answers.every(a => Number.isInteger(a) && a >= 1 && a <= 5)
  );
}
