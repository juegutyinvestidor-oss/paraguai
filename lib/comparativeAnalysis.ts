// Analise automatica (baseada em regras, sem IA) da Matriz Comparativa do
// Estudo Comparativo. Recebe as estatisticas por grupo (recorte), por dimensao,
// e gera uma narrativa deterministica em blocos (titulo + paragrafos) escrita
// em tom profissional/acessivel, usada tanto na tela quanto no PDF.
//
// Regras:
//  - todas as categorias de cada dimensao sao citadas, mesmo com valores baixos;
//  - a diferenca entre grupos so e comentada quando >= minDeltaPp pontos percentuais;
//  - grupos com menos de minSample alunos sao sinalizados como amostra pequena;
//  - dimensoes sem cobertura em algum grupo aparecem em Pontos de Atencao.

interface DimInput {
  key: string;
  label: string;
  coverage: number;
  total: number;
  coveragePct: number;
  dist: { label: string; count: number }[];
}

interface StatsInput {
  n: number;
  coverageAvg: number;
  freq: { avg: number; critical: number };
  dims: DimInput[];
}

interface RecorteInput {
  id: string;
  label: string;
}

export interface AnalysisBlock {
  title: string;
  accent?: 'info' | 'positive' | 'negative';
  paragraphs: string[];
}

export const ANALYSIS_CONFIG = {
  minDeltaPp: 5,
  minSample: 30,
};

const normTxt = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const rnd = (v: number) => Math.round(v);

const DISCLAIMER =
  'Texto gerado automaticamente a partir de dados agregados, como apoio à leitura dos responsáveis; não substitui a avaliação pedagógica ou clínica de um profissional.';

function suggestFor(dimKey: string, catLabel: string): string {
  const n = normTxt(catLabel);
  switch (dimKey) {
    case 'imc':
      if (/peso normal|peso ideal|eutrof/.test(n)) return 'manter ações de educação alimentar e incentivo à atividade física regular.';
      if (/sobrepeso/.test(n)) return 'incluir os alunos em programas de atividade física e acompanhamento nutricional.';
      if (/obes/.test(n)) return 'encaminhar para avaliação nutricional e revisar o cardápio escolar.';
      if (/abaixo|baixo peso|magreza/.test(n)) return 'realizar avaliação nutricional individualizada e reforçar o suporte alimentar.';
      return 'reforçar o acompanhamento nutricional e a educação alimentar.';
    case 'motor':
      if (/excelente|bom/.test(n)) return 'manter a rotina de treinamento físico variado.';
      if (/regular/.test(n)) return 'incentivar a evolução das capacidades motoras com treinos direcionados.';
      if (/insuficiente|precisa|treino/.test(n)) return 'iniciar programa de treino físico progressivo com acompanhamento da Educação Física.';
      return 'incentivar a prática regular de atividades físicas.';
    case 'sport':
      return 'monitorar a adesão dos alunos à modalidade indicada e ampliar as opções de esporte.';
    case 'voc':
      return 'manter o acompanhamento do perfil vocacional e a orientação profissional individualizada.';
    case 'health':
      if (/risco|baixo/.test(n)) return 'implementar ações de promoção da saúde e qualidade de vida para o grupo sinalizado.';
      return 'manter as condições de saúde e bem-estar identificadas.';
    case 'oral':
      return 'intensificar ações de higiene bucal e o acesso ao atendimento odontológico.';
    case 'auto':
      return 'implementar ações de fortalecimento da autoestima e apoio socioemocional.';
    case 'ias':
      return 'aprimorar a qualidade da alimentação escolar e a educação nutricional.';
    case 'snap':
      return 'manter o acompanhamento dos sinais indicativos de TDAH e encaminhar para avaliação especializada conforme critério clínico.';
    case 'aq10':
      return 'manter a vigilância do rastreamento de TEA e encaminhar para avaliação multidisciplinar quando houver pontuação de alerta.';
    default:
      return 'manter o acompanhamento pedagógico e reavaliar periodicamente a dimensão.';
  }
}

// % de uma categoria em um grupo (null quando o grupo nao tem cobertura).
const pctFor = (dim: DimInput | undefined, cat: string): number | null => {
  if (!dim || !dim.coverage) return null;
  const found = dim.dist.find(x => x.label === cat);
  return found ? rnd((found.count / dim.coverage) * 100) : 0;
};

// Frase de uma categoria considerando todos os grupos (tom natural para 2
// grupos, generico para 3-4).
function categorySentence(
  dimLabel: string,
  cat: string,
  pcts: (number | null)[],
  recortes: RecorteInput[],
  polarity: number,
): string {
  if (recortes.length === 2) {
    const [gA, gB] = recortes;
    const a = pcts[0];
    const b = pcts[1];
    if (a == null || b == null) {
      return `${cat}: ${a == null ? `sem avaliações no Grupo ${gA.id}` : `${a}% no Grupo ${gA.id}`} e ${b == null ? `sem avaliações no Grupo ${gB.id}` : `${b}% no Grupo ${gB.id}`} dos avaliados.`;
    }
    const d = b - a;
    const small = Math.abs(d) < ANALYSIS_CONFIG.minDeltaPp;
    if (polarity > 0) {
      if (small) return `${cat}: ${a}% dos avaliados do Grupo ${gA.id} e ${b}% do Grupo ${gB.id} — situação parecida entre os grupos.`;
      return a > b
        ? `No Grupo ${gA.id}, ${a}% dos avaliados estão com ${cat}, enquanto no Grupo ${gB.id} são ${b}% — o Grupo ${gA.id} se destaca neste aspecto.`
        : `No Grupo ${gB.id}, ${b}% dos avaliados estão com ${cat}, enquanto no Grupo ${gA.id} são ${a}% — o Grupo ${gB.id} se destaca neste aspecto.`;
    }
    if (polarity < 0) {
      if (small) return `${cat}: ${a}% no Grupo ${gA.id} e ${b}% no Grupo ${gB.id} — situação parecida entre os grupos.`;
      return d > 0
        ? `${cat} é mais presente no Grupo ${gB.id} (${b}%) do que no Grupo ${gA.id} (${a}%) — ponto de atenção para o Grupo ${gB.id}.`
        : `${cat} é mais presente no Grupo ${gA.id} (${a}%) do que no Grupo ${gB.id} (${b}%) — ponto de atenção para o Grupo ${gA.id}.`;
    }
    if (small) return `${cat}: ${a}% no Grupo ${gA.id} e ${b}% no Grupo ${gB.id}.`;
    return `${cat}: ${a}% no Grupo ${gA.id} e ${b}% no Grupo ${gB.id}, com diferença de ${Math.abs(Math.round(d))} pontos percentuais.`;
  }

  const values = pcts
    .map((p, i) => (p == null ? `${recortes[i].id} (sem avaliações)` : `${p}% (Grupo ${recortes[i].id})`))
    .join(', ');
  return `${cat}: ${values} dos avaliados.`;
}

export function buildComparativeAnalysis(
  recortes: RecorteInput[],
  stats: StatsInput[],
): AnalysisBlock[] {
  const blocks: AnalysisBlock[] = [];

  if (!recortes.length || !stats.length) return blocks;

  // ---- 1. Panorama geral ----
  const pan: string[] = [];
  if (recortes.length === 1) {
    pan.push(`Esta análise descreve um único grupo de alunos.`);
  } else {
    pan.push(`Esta análise compara ${recortes.length} grupos de alunos definidos no estudo.`);
  }
  recortes.forEach((r, i) => {
    const s = stats[i];
    pan.push(`Grupo ${r.id} (${r.label}): ${s.n} aluno(s) ativo(s).`);
  });
  if (recortes.length >= 2) {
    const covs = stats.map(s => s.coverageAvg);
    const covLine = covs.map((c, i) => `${c}% (Grupo ${recortes[i].id})`).join(', ');
    pan.push(`Cobertura média das avaliações: ${covLine}.`);
  }
  stats.forEach((s, i) => {
    if (s.freq && s.freq.critical > 0) {
      pan.push(`${s.freq.critical} aluno(s) do Grupo ${recortes[i].id} com presença crítica (menos de 50% das aulas).`);
    }
  });
  blocks.push({ title: '1. PANORAMA GERAL', accent: 'info', paragraphs: pan });

  // ---- 2. Análise por dimensão ----
  if (!stats[0] || !stats[0].dims.length) {
    blocks.push({
      title: '2. ANÁLISE POR DIMENSÃO',
      accent: 'info',
      paragraphs: ['Não há dimensões com dados registrados para gerar a análise.'],
    });
  } else {
    const analysisParas: string[] = [];
    stats[0].dims.forEach((dim, dIdx) => {
      const dimsIn = stats.map(s => s.dims[dIdx]);
      if (!dimsIn.some(d => (d?.coverage || 0) > 0)) return;
      const union = new Map<string, number>();
      dimsIn.forEach(d => (d?.dist || []).forEach(x => union.set(x.label, (union.get(x.label) || 0) + x.count)));
      const cats = Array.from(union.entries()).sort((x, y) => y[1] - x[1]).map(([c]) => c);
      const pcts = cats.map(c => dimsIn.map(d => pctFor(d, c)));

      analysisParas.push(`**${dim.label}** — ${dimsIn[0]?.coverage ?? 0} de ${stats[0].n} alunos avaliados no Grupo ${recortes[0].id}.`);
      cats.forEach((c, ci) => {
        analysisParas.push(categorySentence(dim.label, c, pcts[ci], recortes, polarityOfLocal(c)));
        analysisParas.push(`  › Sugestão de melhoria: ${suggestFor(dim.key, c)}`);
      });

      // parecer geral da dimensão
      const scores = stats.map((_, i) =>
        cats.reduce((acc, c, ci) => {
          const p = pcts[ci][i];
          if (p == null) return acc;
          return acc + (polarityOfLocal(c) === 0 ? 0 : polarityOfLocal(c) * p);
        }, 0),
      );
      const better =
        scores[0] > scores[1] ? recortes[0].id : scores[1] > scores[0] ? recortes[1].id : null;
      const concerns = cats.filter(c => polarityOfLocal(c) < 0 && pcts.some(p => (p[0] ?? 0) >= ANALYSIS_CONFIG.minDeltaPp));
      const dimLower = dim.label.toLowerCase();
      let parecer = '';
      if (better && scores[0] !== scores[1]) {
        parecer = `No conjunto, o Grupo ${better} apresenta resultados mais favoráveis em ${dimLower}.`;
      } else if (scores[0] === scores[1] && scores[0] !== 0) {
        parecer = `No conjunto, os grupos mostram resultados equivalentes em ${dimLower}.`;
      } else if (scores[0] === 0 && scores[1] === 0) {
        parecer = 'Não há como afirmar qual grupo se destaca nesta dimensão.';
      }
      if (concerns.length) {
        parecer += ` Atenção prioritária: ${concerns.join('; ')}.`;
      }
      if (parecer) analysisParas.push(`Parecer da dimensão: ${parecer}`);
    });
    blocks.push({ title: '2. ANÁLISE POR DIMENSÃO', accent: 'info', paragraphs: analysisParas });
  }

  // ---- 3. Destaques ----
  const destaques: { txt: string; score: number }[] = [];
  stats[0]?.dims.forEach((dim, dIdx) => {
    const dimsIn = stats.map(s => s.dims[dIdx]);
    if (!(dimsIn[0]?.coverage || 0)) return;
    (dimsIn[0].dist || []).forEach(cat => {
      const a = pctFor(dimsIn[0], cat.label);
      for (let i = 1; i < recortes.length; i++) {
        const b = pctFor(dimsIn[i], cat.label);
        if (a == null || b == null) continue;
        const d = b - a;
        if (Math.abs(d) < ANALYSIS_CONFIG.minDeltaPp) continue;
        const pol = polarityOfLocal(cat.label);
        destaques.push({
          score: (pol > 0 ? 1 : pol < 0 ? -1 : 0) * d,
          txt: `${cat.label} (${dim.label}): ${a}% no Grupo ${recortes[0].id} → ${b}% no Grupo ${recortes[i].id}.`,
        });
      }
    });
  });
  destaques.sort((x, y) => y.score - x.score);
  const parasD: string[] = [];
  if (!destaques.length) {
    parasD.push('Nas dimensões avaliadas, não houve diferença relevante (5 pontos percentuais ou mais) entre os grupos.');
  } else {
    const pontosFortes = destaques.filter(x => x.score > 0).slice(0, 3);
    const atencao = destaques.filter(x => x.score < 0).slice(-2).reverse();
    const pick = new Set<string>();
    pontosFortes.forEach(x => { pick.add(x.txt); parasD.push(`Ponto forte: ${x.txt}`); });
    atencao.forEach(x => {
      if (pick.has(x.txt)) return;
      pick.add(x.txt);
      parasD.push(`Ponto de atenção: ${x.txt}`);
    });
  }
  blocks.push({ title: '3. DESTAQUES', accent: 'info', paragraphs: parasD });

  // ---- 4. Recomendações ----
  const recSet = new Set<string>();
  const recs: string[] = [];
  stats[0]?.dims.forEach((dim, dIdx) => {
    const dimsIn = stats.map(s => s.dims[dIdx]);
    if (!(dimsIn[0]?.coverage || 0)) return;
    if (dimsIn[0].coveragePct < 50) {
      const t = `Reavaliar ${dim.label.toLowerCase()}: somente ${dimsIn[0].coveragePct}% dos alunos do Grupo ${recortes[0].id} têm avaliação registrada — poucos dados para conclusões.`;
      if (!recSet.has(t)) { recSet.add(t); recs.push(t); }
      return;
    }
    (dimsIn[0].dist || []).forEach(cat => {
      const share = pctFor(dimsIn[0], cat.label) ?? 0;
      const pol = polarityOfLocal(cat.label);
      if (pol < 0 || (pol === 0 && share > 0)) {
        const t = `${dim.label} · ${cat.label}: ${suggestFor(dim.key, cat.label)}`;
        if (!recSet.has(t)) { recSet.add(t); recs.push(t); }
      }
    });
  });
  const full = [...recs];
  if (!full.length) full.push('Não há recomendações a destacar — os indicadores observados estão dentro do esperado.');
  blocks.push({ title: '4. RECOMENDAÇÕES', accent: 'positive', paragraphs: full });

  // ---- 5. Pontos de atenção e limitações ----
  const lim: string[] = [];
  stats.forEach((s, i) => {
    if (s.n < ANALYSIS_CONFIG.minSample) {
      lim.push(`O Grupo ${recortes[i].id} reúne apenas ${s.n} aluno(s) — um conjunto pequeno; resultados devem ser vistos com cuidado.`);
    }
  });
  stats[0]?.dims.forEach((dim, dIdx) => {
    stats.forEach((s, i) => {
      const d = s.dims[dIdx];
      if (!d || d.coverage === 0) {
        lim.push(`Não há avaliações de "${dim.label}" no Grupo ${recortes[i].id} — esta dimensão não contempla esse grupo na análise.`);
      }
    });
  });
  if (!lim.length) lim.push('Nenhuma limitação relevante identificada nos dados atuais.');
  lim.push(DISCLAIMER);
  blocks.push({ title: '5. PONTOS DE ATENÇÃO E LIMITAÇÕES', accent: 'negative', paragraphs: lim });

  return blocks;
}

// polaridade local (mesma semantica da matriz comparativa).
const GOOD_LABELS = new Set([
  'excelente', 'bom', 'peso normal', 'peso ideal', 'qualidade de vida alta',
  'boa qualidade (saudavel)', 'boa qualidade', 'alto desempenho', 'autoestima alta',
]);
const BAD_LABELS = new Set([
  'insuficiente', 'desempenho insuficiente', 'precisa de treino', 'qualidade de vida baixa',
  'baixo desempenho', 'autoestima baixa', 'dieta de ma qualidade', 'obesidade', 'sobrepeso',
  'abaixo do peso', 'abaixo peso', 'critico', 'sem dados de presenca',
]);
function polarityOfLocal(label: string): number {
  const n = normTxt(label);
  if (GOOD_LABELS.has(n)) return 1;
  if (BAD_LABELS.has(n)) return -1;
  return 0;
}