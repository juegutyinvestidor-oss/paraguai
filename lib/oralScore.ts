// HU-DBI "Higiene Bucal" scoring engine (Modulo 10).
// 20 itens, resposta dicotomica (Concordo/Discordo).
// Pontua apenas 12 itens "saudaveis"; score final 0-12.
// Faixas: 9-12 Alto, 5-8 Moderado, 0-4 Baixo.

export type OralClassification =
  | 'Alto Desempenho'
  | 'Desempenho Moderado'
  | 'Baixo Desempenho';

export const ORAL_CLASSIFICATIONS: OralClassification[] = [
  'Alto Desempenho',
  'Desempenho Moderado',
  'Baixo Desempenho',
];

// Rotulos das duas opcoes de resposta.
export const ORAL_ANSWER_LABELS = ['Concordo', 'Discordo'];

export const ORAL_ITEM_COUNT = 20;
export const ORAL_MAX_SCORE = 12;

// Regra de pontuacao por ordinal do item.
// 'agree' = pontua se Concordo; 'disagree' = pontua se Discordo; 'none' = nao pontua.
export type OralScoringRule = 'agree' | 'disagree' | 'none';

export const ORAL_SCORING_RULES: Record<number, OralScoringRule> = {
  2: 'disagree',
  4: 'agree',
  6: 'disagree',
  7: 'agree',
  8: 'disagree',
  9: 'agree',
  10: 'disagree',
  11: 'agree',
  12: 'agree',
  14: 'disagree',
  15: 'disagree',
  19: 'agree',
};

export function ruleForOrd(ord: number): OralScoringRule {
  return ORAL_SCORING_RULES[ord] ?? 'none';
}

export interface OralScore {
  score: number;
  classification: OralClassification;
}

// answers[i] corresponde ao item de ordinal i+1. true = Concordo, false = Discordo.
export function computeOralScore(answers: boolean[]): number {
  return answers.reduce((sum, agree, idx) => {
    const rule = ruleForOrd(idx + 1);
    if (rule === 'agree' && agree) return sum + 1;
    if (rule === 'disagree' && !agree) return sum + 1;
    return sum;
  }, 0);
}

export function classifyOralScore(score: number): OralClassification {
  if (score >= 9) return 'Alto Desempenho';
  if (score >= 5) return 'Desempenho Moderado';
  return 'Baixo Desempenho';
}

export function scoreOral(answers: boolean[]): OralScore {
  const score = computeOralScore(answers);
  return { score, classification: classifyOralScore(score) };
}

export function isCompleteOralAnswers(answers: (boolean | null)[]): boolean {
  return (
    Array.isArray(answers) &&
    answers.length === ORAL_ITEM_COUNT &&
    answers.every(a => a === true || a === false)
  );
}
