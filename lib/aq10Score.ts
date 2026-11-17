// AQ-10 "Rastreamento Precoce do TEA" scoring engine (Modulo 14).
// 10 itens, escala ordinal 0-3 (Concordo Totalmente / Concordo em Parte /
// Discordo em Parte / Discordo Totalmente), respondido por pais/tutores (proxy).
// Regra oficial (SUBPAV/SMS-RJ): 1 ponto para Concordo (Totalmente ou em Parte)
// nos itens 1, 5, 7 e 10; 1 ponto para Discordo (em Parte ou Totalmente) nos
// itens 2, 3, 4, 6, 8 e 9. A mesma numeração vale para as duas versões.
// Total 0-10. Alertas nas classificações não substituem o diagnóstico formal.

export type Aq10Version = 'crianca' | 'adolescente';

export const AQ10_VERSION_LABELS: Record<Aq10Version, string> = {
  crianca: 'Criança (4 a 11 anos)',
  adolescente: 'Adolescente (12 a 15 anos)',
};

export type Aq10Classification =
  | 'Traços comportamentais dentro da média da população geral'
  | 'Pontuação Indicativa (Alerta de Traços Elevados de TEA)';

export const AQ10_CLASSIFICATIONS: Aq10Classification[] = [
  'Traços comportamentais dentro da média da população geral',
  'Pontuação Indicativa (Alerta de Traços Elevados de TEA)',
];

// rótulos da escala 0-3 (índice 0 => valor 0).
export const AQ10_LIKERT_LABELS = [
  'Concordo Totalmente',
  'Concordo em Parte',
  'Discordo em Parte',
  'Discordo Totalmente',
];

export const AQ10_ITEM_COUNT = 10;

// quem preenche o instrumento (relato por terceiros - pais ou responsáveis).
export const AQ10_RESPONDENT_LABELS = ['Pai', 'Mãe', 'Responsável'];

// itens onde CONCORDAR (Totalmente=0 ou em Parte=1) soma 1 ponto.
export const AQ10_AGREE_ITEMS = [1, 5, 7, 10];
// itens onde DISCORDAR (em Parte=2 ou Totalmente=3) soma 1 ponto.
export const AQ10_DISAGREE_ITEMS = [2, 3, 4, 6, 8, 9];

// pontuação a partir da qual o rastreamento indica alerta (7-10).
export const AQ10_ALERT_FROM = 7;

export function aq10VersionForAge(age: number): Aq10Version {
  return age <= 11 ? 'crianca' : 'adolescente';
}

// item indexado por ordinal (1-10) soma ponto conforme a chave de correção.
export function aq10ItemCountsPoint(ord: number, value: number): boolean {
  const v = Number(value);
  if (!Number.isFinite(v)) return false;
  if (AQ10_AGREE_ITEMS.includes(ord)) return v === 0 || v === 1;
  if (AQ10_DISAGREE_ITEMS.includes(ord)) return v === 2 || v === 3;
  return false;
}

// answers[i] corresponde ao item de ordinal i+1 (valores 0-3).
export function computeAq10Score(answers: number[]): number {
  let total = 0;
  answers.forEach((value, idx) => {
    if (aq10ItemCountsPoint(idx + 1, value)) total += 1;
  });
  return total;
}

export function aq10ClassificationForScore(total: number): Aq10Classification {
  return total >= AQ10_ALERT_FROM
    ? 'Pontuação Indicativa (Alerta de Traços Elevados de TEA)'
    : 'Traços comportamentais dentro da média da população geral';
}

export interface Aq10Score {
  totalScore: number;
  classification: Aq10Classification;
}

export function scoreAq10(answers: number[]): Aq10Score {
  const totalScore = computeAq10Score(answers);
  return { totalScore, classification: aq10ClassificationForScore(totalScore) };
}

export function isCompleteAq10Answers(answers: number[]): boolean {
  return (
    Array.isArray(answers) &&
    answers.length === AQ10_ITEM_COUNT &&
    answers.every(a => Number.isInteger(a) && a >= 0 && a <= 3)
  );
}