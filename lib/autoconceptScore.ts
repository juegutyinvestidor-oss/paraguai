// Rosenberg Self-Esteem Scale "Autoconceito" scoring engine (Modulo 11).
// 10 itens, escala de 4 niveis: CT/C/D/DT (0-3).
// Itens negativos pontuam invertido. Score final 0-30.
// Faixas: <15 Baixa, 15-25 Equilibrada, >25 Alta.

export type AutoconceptClassification =
  | 'Autoestima Baixa'
  | 'Autoestima Equilibrada'
  | 'Autoestima Alta';

export const AUTOCONCEPT_CLASSIFICATIONS: AutoconceptClassification[] = [
  'Autoestima Baixa',
  'Autoestima Equilibrada',
  'Autoestima Alta',
];

export type AutoconceptItemType = 'positive' | 'negative';

// Codigo -> valor em pontos (para itens POSITIVOS; negativos usam 3 - valor).
export const AUTOCONCEPT_ANSWER_CODES = ['CT', 'C', 'D', 'DT'] as const;
export type AutoconceptAnswerCode = (typeof AUTOCONCEPT_ANSWER_CODES)[number];

export const AUTOCONCEPT_ANSWER_LABELS: Record<AutoconceptAnswerCode, string> = {
  CT: 'Concordo Totalmente',
  C: 'Concordo',
  D: 'Discordo',
  DT: 'Discordo Totalmente',
};

// Valor base (0-3) de cada opcao de resposta.
export const AUTOCONCEPT_ANSWER_VALUE: Record<AutoconceptAnswerCode, number> = {
  CT: 3,
  C: 2,
  D: 1,
  DT: 0,
};

export const AUTOCONCEPT_ITEM_COUNT = 10;
export const AUTOCONCEPT_MAX_SCORE = 30;

export interface AutoconceptScore {
  score: number;
  classification: AutoconceptClassification;
}

// Um item positivo pontua seu valor; um item negativo pontua (3 - valor).
export function itemScore(type: AutoconceptItemType, code: AutoconceptAnswerCode): number {
  const base = AUTOCONCEPT_ANSWER_VALUE[code] ?? 0;
  return type === 'negative' ? 3 - base : base;
}

// answers[i] corresponde ao item i (mesmo indice de items[i]); code '' = nao respondido.
export function computeAutoconceptScore(answers: AutoconceptAnswerCode[], types: AutoconceptItemType[]): number {
  return answers.reduce((sum, code, idx) => {
    if (!code) return sum;
    const type = types[idx] ?? 'positive';
    return sum + itemScore(type, code);
  }, 0);
}

export function classifyAutoconceptScore(score: number): AutoconceptClassification {
  if (score < 15) return 'Autoestima Baixa';
  if (score <= 25) return 'Autoestima Equilibrada';
  return 'Autoestima Alta';
}

export function scoreAutoconcept(answers: AutoconceptAnswerCode[], types: AutoconceptItemType[]): AutoconceptScore {
  const score = computeAutoconceptScore(answers, types);
  return { score, classification: classifyAutoconceptScore(score) };
}

export function isCompleteAutoconceptAnswers(answers: AutoconceptAnswerCode[]): boolean {
  return (
    Array.isArray(answers) &&
    answers.length === AUTOCONCEPT_ITEM_COUNT &&
    answers.every(a => a === 'CT' || a === 'C' || a === 'D' || a === 'DT')
  );
}
