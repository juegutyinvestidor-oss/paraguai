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

export type AnalysisTranslator = (key: string, values?: Record<string, string | number>) => string;

export const ANALYSIS_CONFIG = {
  minDeltaPp: 5,
  minSample: 30,
};

const normTxt = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const rnd = (v: number) => Math.round(v);

function suggestFor(dimKey: string, catLabel: string, tr: AnalysisTranslator): string {
  const n = normTxt(catLabel);
  switch (dimKey) {
    case 'imc':
      if (/peso normal|peso ideal|eutrof/.test(n)) return tr('imcNormal');
      if (/sobrepeso/.test(n)) return tr('imcSobrepeso');
      if (/obes/.test(n)) return tr('imcObesidade');
      if (/abaixo|baixo peso|magreza/.test(n)) return tr('imcAbaixo');
      return tr('imcPadrao');
    case 'motor':
      if (/excelente|bom/.test(n)) return tr('motorExcelente');
      if (/regular/.test(n)) return tr('motorRegular');
      if (/insuficiente|precisa|treino/.test(n)) return tr('motorInsuficiente');
      return tr('motorPadrao');
    case 'sport':
      return tr('sport');
    case 'voc':
      return tr('voc');
    case 'health':
      if (/risco|baixo/.test(n)) return tr('healthRisco');
      return tr('healthPadrao');
    case 'oral':
      return tr('oral');
    case 'auto':
      return tr('auto');
    case 'ias':
      return tr('ias');
    case 'snap':
      return tr('snap');
    case 'aq10':
      return tr('aq10');
    default:
      return tr('suggestDefault');
  }
}

const pctFor = (dim: DimInput | undefined, cat: string): number | null => {
  if (!dim || !dim.coverage) return null;
  const found = dim.dist.find(x => x.label === cat);
  return found ? rnd((found.count / dim.coverage) * 100) : 0;
};

function categorySentence(
  dimLabel: string,
  cat: string,
  pcts: (number | null)[],
  recortes: RecorteInput[],
  polarity: number,
  tr: AnalysisTranslator,
  localizeLabel: (label: string) => string,
): string {
  if (recortes.length === 2) {
    const [gA, gB] = recortes;
    const a = pcts[0];
    const b = pcts[1];
    if (a == null || b == null) {
      if (a == null && b == null) return tr('catsSemAvaliacaoAmbos', { cat: localizeLabel(cat), gA: gA.id, gB: gB.id });
      if (a == null) return tr('catsSemAvaliacaoA', { cat: localizeLabel(cat), gA: gA.id, b: b as number, gB: gB.id });
      return tr('catsSemAvaliacaoB', { cat: localizeLabel(cat), gA: gA.id, a, gB: gB.id });
    }
    const d = b - a;
    const small = Math.abs(d) < ANALYSIS_CONFIG.minDeltaPp;
    if (polarity > 0) {
      if (small) return tr('positivoParecido', { cat: localizeLabel(cat), a, gA: gA.id, b, gB: gB.id });
      return a > b
        ? tr('positivoMelhorA', { gA: gA.id, a, cat: localizeLabel(cat), gB: gB.id, b })
        : tr('positivoMelhorB', { gB: gB.id, b, cat: localizeLabel(cat), gA: gA.id, a });
    }
    if (polarity < 0) {
      if (small) return tr('negativoParecido', { cat: localizeLabel(cat), a, gA: gA.id, b, gB: gB.id });
      return d > 0
        ? tr('negativoMaisB', { cat: localizeLabel(cat), gB: gB.id, b, gA: gA.id, a })
        : tr('negativoMaisA', { cat: localizeLabel(cat), gA: gA.id, a, gB: gB.id, b });
    }
    if (small) return tr('neutroParecido', { cat: localizeLabel(cat), a, gA: gA.id, b, gB: gB.id });
    return tr('neutroDiferente', { cat: localizeLabel(cat), a, gA: gA.id, b, gB: gB.id, diff: Math.abs(Math.round(d)) });
  }

  const values = pcts
    .map((p, i) => (p == null
      ? tr('multiSemAvaliacao', { id: recortes[i].id })
      : tr('multiComAvaliacao', { p, id: recortes[i].id })))
    .join(', ');
  return tr('multiFrase', { cat: localizeLabel(cat), values });
}

export function buildComparativeAnalysis(
  recortes: RecorteInput[],
  stats: StatsInput[],
  tr: AnalysisTranslator,
  localizeLabel: (label: string) => string = (label) => label,
): AnalysisBlock[] {
  const blocks: AnalysisBlock[] = [];

  if (!recortes.length || !stats.length) return blocks;

  const pan: string[] = [];
  if (recortes.length === 1) {
    pan.push(tr('panoramaUnico'));
  } else {
    pan.push(tr('panoramaMultiplo', { quantidade: recortes.length }));
  }
  recortes.forEach((r, i) => {
    const s = stats[i];
    pan.push(tr('panoramaGrupo', { id: r.id, label: r.label, n: s.n }));
  });
  if (recortes.length >= 2) {
    const covs = stats.map(s => s.coverageAvg);
    const covLine = covs.map((c, i) => tr('multiComAvaliacao', { p: c, id: recortes[i].id })).join(', ');
    pan.push(tr('panoramaCobertura', { linha: covLine }));
  }
  stats.forEach((s, i) => {
    if (s.freq && s.freq.critical > 0) {
      pan.push(tr('panoramaPresencaCritica', { quantidade: s.freq.critical, grupo: recortes[i].id }));
    }
  });
  blocks.push({ title: tr('tituloPanorama'), accent: 'info', paragraphs: pan });

  if (!stats[0] || !stats[0].dims.length) {
    blocks.push({
      title: tr('tituloDimensao'),
      accent: 'info',
      paragraphs: [tr('semDimensoes')],
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

      analysisParas.push(tr('dimensaoLinha', {
        label: dim.label,
        cobertura: dimsIn[0]?.coverage ?? 0,
        total: stats[0].n,
        grupo: recortes[0].id,
      }));
      cats.forEach((c, ci) => {
        analysisParas.push(categorySentence(dim.label, c, pcts[ci], recortes, polarityOfLocal(c), tr, localizeLabel));
        analysisParas.push(tr('sugestao', { texto: suggestFor(dim.key, c, tr) }));
      });

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
        parecer = tr('parecerMelhor', { grupo: better, dim: dimLower });
      } else if (scores[0] === scores[1] && scores[0] !== 0) {
        parecer = tr('parecerEquivalente', { dim: dimLower });
      } else if (scores[0] === 0 && scores[1] === 0) {
        parecer = tr('parecerIndefinido');
      }
      if (concerns.length) {
        parecer += ` ${tr('atencaoPrioritaria', { categorias: concerns.map(localizeLabel).join('; ') })}`;
      }
      if (parecer) analysisParas.push(tr('parecerDimensao', { texto: parecer }));
    });
    blocks.push({ title: tr('tituloDimensao'), accent: 'info', paragraphs: analysisParas });
  }

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
          txt: tr('destaqueLinha', {
            categoria: localizeLabel(cat.label),
            dim: localizeLabel(dim.label),
            a,
            grupoA: recortes[0].id,
            b,
            grupoB: recortes[i].id,
          }),
        });
      }
    });
  });
  destaques.sort((x, y) => y.score - x.score);
  const parasD: string[] = [];
  if (!destaques.length) {
    parasD.push(tr('destaqueSemDiferenca'));
  } else {
    const pontosFortes = destaques.filter(x => x.score > 0).slice(0, 3);
    const atencao = destaques.filter(x => x.score < 0).slice(-2).reverse();
    const pick = new Set<string>();
    pontosFortes.forEach(x => { pick.add(x.txt); parasD.push(tr('pontoForte', { texto: x.txt })); });
    atencao.forEach(x => {
      if (pick.has(x.txt)) return;
      pick.add(x.txt);
      parasD.push(tr('pontoAtencao', { texto: x.txt }));
    });
  }
  blocks.push({ title: tr('tituloDestaques'), accent: 'info', paragraphs: parasD });

  const recSet = new Set<string>();
  const recs: string[] = [];
  stats[0]?.dims.forEach((dim, dIdx) => {
    const dimsIn = stats.map(s => s.dims[dIdx]);
    if (!(dimsIn[0]?.coverage || 0)) return;
    if (dimsIn[0].coveragePct < 50) {
      const txt = tr('reavaliarCobertura', {
        dim: localizeLabel(dim.label).toLowerCase(),
        cobertura: dimsIn[0].coveragePct,
        grupo: recortes[0].id,
      });
      if (!recSet.has(txt)) { recSet.add(txt); recs.push(txt); }
      return;
    }
    (dimsIn[0].dist || []).forEach(cat => {
      const share = pctFor(dimsIn[0], cat.label) ?? 0;
      const pol = polarityOfLocal(cat.label);
      if (pol < 0 || (pol === 0 && share > 0)) {
        const txt = tr('recomendacaoDimensao', {
          dim: localizeLabel(dim.label),
          categoria: localizeLabel(cat.label),
          sugestao: suggestFor(dim.key, cat.label, tr),
        });
        if (!recSet.has(txt)) { recSet.add(txt); recs.push(txt); }
      }
    });
  });
  const full = [...recs];
  if (!full.length) full.push(tr('recomendacaoVazia'));
  blocks.push({ title: tr('tituloRecomendacoes'), accent: 'positive', paragraphs: full });

  const lim: string[] = [];
  stats.forEach((s, i) => {
    if (s.n < ANALYSIS_CONFIG.minSample) {
      lim.push(tr('limiteAmostra', { grupo: recortes[i].id, n: s.n }));
    }
  });
  stats[0]?.dims.forEach((dim, dIdx) => {
    stats.forEach((s, i) => {
      const d = s.dims[dIdx];
      if (!d || d.coverage === 0) {
        lim.push(tr('limiteSemAvaliacao', { dim: localizeLabel(dim.label), grupo: recortes[i].id }));
      }
    });
  });
  if (!lim.length) lim.push(tr('limiteVazio'));
  lim.push(tr('disclaimer'));
  blocks.push({ title: tr('tituloLimites'), accent: 'negative', paragraphs: lim });

  return blocks;
}

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
