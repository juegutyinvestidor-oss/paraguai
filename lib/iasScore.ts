// Indices de Alimentacao Saudavel (IAS / Healthy Eating Index adaptado) - Modulo 12.
// 11 perguntas, cada uma com 3 opcoes pontuadas individualmente (0-20 por opcao).
// Total = soma dos pontos das opcoes escolhidas; maximo dinamico = soma dos maximos.
// Faixas: <51 Dieta de Má Qualidade, 51-80 Necessita de Modificações, >80 Boa Qualidade.

export type IasClassification =
  | 'Dieta de Má Qualidade'
  | 'Necessita de Modificações'
  | 'Boa Qualidade (Saudável)';

export const IAS_CLASSIFICATIONS: IasClassification[] = [
  'Dieta de Má Qualidade',
  'Necessita de Modificações',
  'Boa Qualidade (Saudável)',
];

export interface IasOption {
  text: string;
  points: number;
}

export interface IasQuestion {
  id: string;
  ord: number;
  statement: string;
  option1Text: string;
  option1Points: number;
  option2Text: string;
  option2Points: number;
  option3Text: string;
  option3Points: number;
}

// answers[i] = indice da opcao escolhida (0/1/2) ou -1 se nao respondida.
export function iasMaxScore(questions: IasQuestion[]): number {
  return questions.reduce((sum, q) => {
    return sum + Math.max(q.option1Points, q.option2Points, q.option3Points);
  }, 0);
}

export function computeIasScore(answers: number[], questions: IasQuestion[]): number {
  return answers.reduce((sum, choice, idx) => {
    const q = questions[idx];
    if (!q || choice < 0 || choice > 2) return sum;
    const points = [q.option1Points, q.option2Points, q.option3Points][choice] ?? 0;
    return sum + points;
  }, 0);
}

export function classifyIasScore(score: number): IasClassification {
  if (score < 51) return 'Dieta de Má Qualidade';
  if (score <= 80) return 'Necessita de Modificações';
  return 'Boa Qualidade (Saudável)';
}

export interface IasScore {
  score: number;
  max: number;
  classification: IasClassification;
}

export function scoreIas(answers: number[], questions: IasQuestion[]): IasScore {
  const score = computeIasScore(answers, questions);
  return { score, max: iasMaxScore(questions), classification: classifyIasScore(score) };
}

export function isCompleteIasAnswers(answers: number[], questions: IasQuestion[]): boolean {
  return (
    Array.isArray(answers) &&
    answers.length === questions.length &&
    questions.length > 0 &&
    answers.every(a => a === 0 || a === 1 || a === 2)
  );
}
