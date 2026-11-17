'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Plus, Trash2 } from 'lucide-react';
import type {
  AttendanceEntry, ContratoItem, HealthRecord, ImcRecord, IasRecord, SnapRecord, Aq10Record, PcdRecord, MotorRecord,
  OralRecord, SportRecord, Student, VocationalRecord, AutoconceptRecord,
} from '../types/edukyne';
import { normalizeRole } from '../lib/rbac';
import { logExport } from '../lib/auditLog';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { buildComparativeAnalysis, ANALYSIS_CONFIG } from '../lib/comparativeAnalysis';

interface M2Modality {
  id: string;
  name: string;
  requirements?: unknown;
}

interface SupabaseM2Row {
  id: string;
  name: string;
  requirements: unknown;
}

interface StudyUser {
  id?: string;
  role?: string;
  name?: string;
  email?: string;
  contrato?: string;
  estado?: string;
  regiao?: string;
  locality?: string;
  grade?: string;
}

interface ComparativeStudyViewProps {
  students: Student[];
  contratos?: ContratoItem[];
  user?: StudyUser;
  attendanceRecords?: AttendanceEntry[];
  imcRecords?: ImcRecord[];
  motorRecords?: MotorRecord[];
  sportRecords?: SportRecord[];
  vocationalRecords?: VocationalRecord[];
  healthRecords?: HealthRecord[];
  oralRecords?: OralRecord[];
  autoconceptRecords?: AutoconceptRecord[];
  iasRecords?: IasRecord[];
  snapRecords?: SnapRecord[];
  aq10Records?: Aq10Record[];
  pcdRecords?: PcdRecord[];
}

type LevelKey = 'contract' | 'state' | 'region' | 'locality' | 'grade';

interface Recorte {
  id: string;
  color: string;
  contract: string;
  state: string;
  region: string;
  locality: string;
  grade: string;
}

interface DimStat {
  key: string;
  label: string;
  coverage: number;
  total: number;
  coveragePct: number;
  dist: { label: string; count: number }[];
}

interface FreqStat { avg: number; excellent: number; regular: number; critical: number; noData: number }

interface RecorteStats {
  n: number;
  freq: FreqStat;
  dims: DimStat[];
  coverageAvg: number;
}

interface MatrixRow {
  group: string;
  cat: string;
  kind: 'pct' | 'num';
  values: (number | null)[];
  counts?: (number | null)[];
  polarity: number;
}

const LEVEL_ORDER: LevelKey[] = ['contract', 'state', 'region', 'locality', 'grade'];
const LEVEL_LABELS: Record<LevelKey, string> = {
  contract: 'Contrato', state: 'Estado', region: 'Região', locality: 'Localidade', grade: 'Turma',
};
const RECORTE_PALETTE = ['A', 'B', 'C', 'D'];
const RECORTE_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24'];

const splitCsv = (v?: string) => (v || '').split(',').map(s => s.trim()).filter(Boolean);
const uniqueSorted = (vals: string[]) => Array.from(new Set(vals.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
const includesSel = (sel: string, values: string[]) => sel === 'Todos' || sel === 'Todas' || values.includes(sel);
const safeTs = (d?: string) => { const t = d ? new Date(d).getTime() : 0; return Number.isNaN(t) ? 0 : t; };
const normTxt = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const fmtPct = (v: number) => `${Math.round(v)}%`;
const fmtNum = (v: number, dec = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const GOOD_LABELS = new Set([
  'excelente', 'bom', 'peso normal', 'peso ideal', 'qualidade de vida alta',
  'boa qualidade (saudavel)', 'boa qualidade', 'alto desempenho', 'autoestima alta',
]);
const BAD_LABELS = new Set([
  'insuficiente', 'desempenho insuficiente', 'precisa de treino', 'qualidade de vida baixa',
  'baixo desempenho', 'autoestima baixa', 'dieta de ma qualidade', 'obesidade', 'sobrepeso',
  'abaixo do peso', 'abaixo peso', 'critico', 'sem dados de presenca',
]);
const polarityOf = (label: string) => {
  const n = normTxt(label);
  if (GOOD_LABELS.has(n)) return 1;
  if (BAD_LABELS.has(n)) return -1;
  return 0;
};

const statesOf = (c: ContratoItem): string[] =>
  c.structure?.estados?.length ? c.structure.estados.map(st => st.name) : splitCsv(c.estado);
const regionsOf = (c: ContratoItem): string[] =>
  c.structure?.estados?.length
    ? uniqueSorted(c.structure.estados.flatMap(st => st.regioes.map(r => r.name)))
    : splitCsv(c.regiao);
const localitiesOf = (c: ContratoItem): string[] =>
  c.structure?.estados?.length
    ? uniqueSorted(c.structure.estados.flatMap(st => st.regioes.flatMap(r => r.localidades.map(l => l.name))))
    : splitCsv(c.localidade);
const gradesOf = (c: ContratoItem): string[] =>
  c.structure?.estados?.length
    ? uniqueSorted(c.structure.estados.flatMap(st => st.regioes.flatMap(r => r.localidades.flatMap(l => l.grades || []))))
    : splitCsv(c.grade || '');

export default function ComparativeStudyView({
  students, contratos, user, attendanceRecords,
  imcRecords, motorRecords, sportRecords, vocationalRecords,
healthRecords, oralRecords, autoconceptRecords, iasRecords, snapRecords, aq10Records, pcdRecords,
}: ComparativeStudyViewProps) {
  const [recortes, setRecortes] = useState<Recorte[]>(() => [
    { id: 'A', color: RECORTE_COLORS[0], contract: 'Todos', state: 'Todos', region: 'Todos', locality: 'Todos', grade: 'Todos' },
    { id: 'B', color: RECORTE_COLORS[1], contract: 'Todos', state: 'Todos', region: 'Todos', locality: 'Todos', grade: 'Todos' },
  ]);

  // Modalidades do Modulo 2 (origem das sugestoes de esporte dos registros).
  const [m2Modalidades, setM2Modalidades] = useState<M2Modality[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('educore_m2_modalidades_config');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading educore_m2_modalidades_config:', e);
      }
    }
    return [
      { id: 'm2-1', name: 'Atletismo' },
      { id: 'm2-2', name: 'Natação' },
      { id: 'm2-3', name: 'Basquete' },
      { id: 'm2-4', name: 'Handebol' },
      { id: 'm2-5', name: 'Futebol' },
      { id: 'm2-6', name: 'Vôlei' },
      { id: 'm2-7', name: 'Ginástica' },
      { id: 'm2-8', name: 'Lutas' },
    ];
  });

  useEffect(() => {
    const fetchM2Modalidades = async () => {
      if (isSupabaseConfigured) {
        const supabase = getSupabase();
        if (supabase) {
          try {
            const { data, error } = await supabase.from('m2_modalidades_config').select('id, name, requirements');
            if (!error && data && data.length > 0) {
              const mapped = data.map((row: SupabaseM2Row) => ({
                id: row.id,
                name: row.name,
                requirements: typeof row.requirements === 'string' ? JSON.parse(row.requirements) : row.requirements,
              }));
              setM2Modalidades(mapped);
              if (typeof window !== 'undefined') {
                localStorage.setItem('educore_m2_modalidades_config', JSON.stringify(mapped));
              }
            }
          } catch (err) {
            console.error('Error fetching m2_modalidades_config in ComparativeStudyView:', err);
          }
        }
      }
    };
    fetchM2Modalidades();
  }, []);

  const isUserAdmin = normalizeRole(user?.role ?? '') === 'Administrador' || !user;
  const isAlunoRole = normalizeRole(user?.role ?? '') === 'Aluno';
  const assigned = useMemo(() => ({
    contract: splitCsv(user?.contrato).map(s => s.toLowerCase()),
    state: splitCsv(user?.estado).map(s => s.toLowerCase()),
    region: splitCsv(user?.regiao).map(s => s.toLowerCase()),
    locality: splitCsv(user?.locality).map(s => s.toLowerCase()),
    grade: splitCsv(user?.grade).map(s => s.toLowerCase()),
  }), [user]);

  const availableContracts = useMemo(() => {
    const list = contratos || [];
    if (isUserAdmin || assigned.contract.length === 0) return list;
    return list.filter(c => assigned.contract.includes(c.name.toLowerCase()) || assigned.contract.includes(c.id.toLowerCase()));
  }, [contratos, isUserAdmin, assigned.contract]);

  const restrict = useCallback((opts: string[], level: LevelKey) => {
    if (isUserAdmin || assigned[level].length === 0) return opts;
    return opts.filter(o => assigned[level].includes(o.toLowerCase()));
  }, [isUserAdmin, assigned]);

  const matchesRecorte = useCallback((s: Student, r: Recorte) => {
    if (s.status !== 'Ativo') return false;
    if (r.contract && r.contract !== 'Todos') {
      const cObj = availableContracts.find(c => c.id === r.contract);
      if (cObj && s.contrato && s.contrato !== cObj.name) return false;
    }
    if (r.state !== 'Todos' && s.estado && s.estado !== r.state) return false;
    if (r.region !== 'Todos' && r.region !== 'Todas' && s.regiao && s.regiao !== r.region) return false;
    if (r.locality !== 'Todos' && r.locality !== 'Todas') {
      const sLoc = (s.locality || 'Centro').toLowerCase().trim();
      if (sLoc !== r.locality.toLowerCase().trim()) return false;
    }
    if (r.grade !== 'Todos' && s.grade !== r.grade) return false;
    return true;
  }, [availableContracts]);

  const buildOptions = useCallback((r: Recorte, level: Exclude<LevelKey, 'contract'>) => {
    const list = r.contract && r.contract !== 'Todos'
      ? availableContracts.filter(c => c.id === r.contract)
      : availableContracts;
    const acc: string[] = [];
    list.forEach(c => {
      if (!includesSel(r.state, statesOf(c))) return;
      if (level === 'state') { acc.push(...statesOf(c)); return; }
      if (!includesSel(r.region, regionsOf(c))) return;
      if (level === 'region') { acc.push(...regionsOf(c)); return; }
      if (!includesSel(r.locality, localitiesOf(c))) return;
      if (level === 'locality') { acc.push(...localitiesOf(c)); return; }
      acc.push(...gradesOf(c));
    });
    if (level === 'grade') {
      (students || []).forEach(s => {
        if (matchesRecorte(s, { ...r, grade: 'Todos' }) && s.grade) acc.push(s.grade);
      });
    }
    return restrict(uniqueSorted(acc), level);
  }, [availableContracts, students, matchesRecorte, restrict]);

  const updateRecorte = (rid: string, level: LevelKey, value: string) => {
    setRecortes(prev => prev.map(r => {
      if (r.id !== rid) return r;
      const next: Recorte = { ...r, [level]: value };
      const idx = LEVEL_ORDER.indexOf(level);
      LEVEL_ORDER.slice(idx + 1).forEach(lv => { next[lv] = 'Todos'; });
      return next;
    }));
  };

  const addRecorte = () => {
    setRecortes(prev => {
      if (prev.length >= 4) return prev;
      const id = RECORTE_PALETTE[prev.length];
      return [...prev, { id, color: RECORTE_COLORS[prev.length], contract: 'Todos', state: 'Todos', region: 'Todos', locality: 'Todos', grade: 'Todos' }];
    });
  };

  const removeRecorte = (rid: string) => {
    setRecortes(prev => prev.filter(r => r.id !== rid));
  };

  // Presença consolidada por aluno (fonte: attendance_records já carregadas no estado global)
  const attendanceByStudent = useMemo(() => {
    const seen = new Set<string>();
    const map: Record<string, { present: number; total: number }> = {};
    (attendanceRecords || []).forEach(a => {
      if (!a?.studentId || !a?.date) return;
      const k = `${a.studentId}|${a.date}`;
      if (seen.has(k)) return;
      seen.add(k);
      const e = map[a.studentId] || { present: 0, total: 0 };
      e.total++; if (a.present) e.present++;
      map[a.studentId] = e;
    });
    return map;
  }, [attendanceRecords]);

  const computeStats = useCallback((list: Student[]): RecorteStats => {
    const ids = new Set(list.map(s => s.id));
    const total = list.length;
    const tally = <T extends { studentId: string; date?: string }>(recs: T[] | undefined, valueOf: (r: T) => string) => {
      const by = new Map<string, T>();
      (recs || []).forEach(rr => {
        if (!rr.studentId || !ids.has(rr.studentId)) return;
        const cur = by.get(rr.studentId);
        if (!cur || safeTs(rr.date) >= safeTs(cur.date)) by.set(rr.studentId, rr);
      });
      const dist = new Map<string, number>();
      by.forEach(rr => {
        const k = (valueOf(rr) || '').toString().trim() || 'Não informado';
        dist.set(k, (dist.get(k) || 0) + 1);
      });
      return {
        coverage: by.size,
        coveragePct: total ? Math.round((by.size / total) * 100) : 0,
        dist: Array.from(dist.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      };
    };
    // Mapeia o esporte sugerido (suggestedSport) para as modalidades do Modulo 2,
    // igual ao grafico "Esporte Indicado" do Dashboard.
    const sportValueOf = (r: SportRecord): string => {
      const sport = (r.suggestedSport || '').trim().toLowerCase();
      if (!sport) return 'Aprimorar Habilidades Motoras';
      const mods = m2Modalidades.map(m => (m.name || '').trim()).filter(Boolean);
      let matched = mods.find(m => {
        const mLower = m.toLowerCase();
        return sport.includes(mLower) || mLower.includes(sport);
      });
      if (!matched) {
        [['corrida', 'Atletismo'], ['basketball', 'Basquete'], ['natacao', 'Natação'], ['volei', 'Vôlei'], ['ginastica', 'Ginástica']]
          .forEach(([alias, name]) => {
            if (!matched && sport.includes(alias) && mods.includes(name)) matched = name;
          });
      }
      return matched || 'Aprimorar Habilidades Motoras';
    };
    const dims: DimStat[] = [
      { key: 'imc', label: 'IMC / Desempenho Corporal', total, ...tally(imcRecords, r => r.classification || '') },
      { key: 'motor', label: 'Capacidades Físicas', total, ...tally(motorRecords, r => r.generalClass || '') },
      { key: 'sport', label: 'Esporte Indicado', total, ...tally(sportRecords, sportValueOf) },
      { key: 'voc', label: 'Perfil Vocacional', total, ...tally(vocationalRecords, r => r.profile || '') },
      { key: 'health', label: 'Saúde Global', total, ...tally(healthRecords, r => r.classification || '') },
      { key: 'oral', label: 'Higiene Bucal', total, ...tally(oralRecords, r => r.classification || '') },
      { key: 'auto', label: 'Autoconceito', total, ...tally(autoconceptRecords, r => r.classification || '') },
      { key: 'ias', label: 'Índice Alimentar', total, ...tally(iasRecords, r => r.classification || '') },
      { key: 'snap', label: 'Rastreamento TDAH', total, ...tally(snapRecords, r => r.classification || '') },
      { key: 'aq10', label: 'Rastreamento TEA', total, ...tally(aq10Records, r => r.classification || '') },
      { key: 'pcd', label: 'Qualidade Motora PCD', total, ...tally(pcdRecords, r => r.classificacaoPerfil || '') },
      { key: 'pcdGrupo', label: 'Grupos PCD', total, ...tally(pcdRecords, r => {
        const nome = (r.grupoNome || '').trim();
        return nome || `Grupo ${r.grupo ?? ''}`.trim();
      }) },
      { key: 'pcdMod', label: 'Modalidades Sugeridas PCD', total, ...tally(pcdRecords, r => {
        const comp = Array.isArray(r.compatibilidade) ? r.compatibilidade : [];
        if (comp.length === 0) return 'Não definida';
        return [...comp].sort((a, b) => (b.iar ?? 0) - (a.iar ?? 0))[0]?.modalidade || 'Não definida';
      }) },
    ];
    let fSum = 0, fN = 0, exc = 0, reg = 0, cri = 0, nod = 0;
    ids.forEach(sid => {
      const a = attendanceByStudent[sid];
      if (!a || a.total === 0) { nod++; return; }
      const rate = (a.present / a.total) * 100;
      fSum += rate; fN++;
      if (rate >= 75) exc++; else if (rate >= 50) reg++; else cri++;
    });
    const freq = { avg: fN ? +(fSum / fN).toFixed(1) : 0, excellent: exc, regular: reg, critical: cri, noData: nod };
    const covered = dims.filter(d => d.coverage > 0);
    const coverageAvg = covered.length ? Math.round(covered.reduce((s, d) => s + d.coveragePct, 0) / covered.length) : 0;
    return { n: total, freq, dims, coverageAvg };
  }, [attendanceByStudent, imcRecords, motorRecords, sportRecords, vocationalRecords, healthRecords, oralRecords, autoconceptRecords, iasRecords, snapRecords, aq10Records, pcdRecords, m2Modalidades]);

  const statsList = useMemo<RecorteStats[]>(
    () => recortes.map(r => computeStats((students || []).filter(s => matchesRecorte(s, r)))),
    [recortes, students, computeStats, matchesRecorte],
  );

  const matrixRows = useMemo<MatrixRow[]>(() => {
    const rows: MatrixRow[] = [];
    rows.push({ group: 'Amostra', cat: 'Alunos ativos no recorte (N)', kind: 'num', values: statsList.map(s => s.n), polarity: 0 });
    rows.push({ group: 'Amostra', cat: 'Cobertura média das avaliações', kind: 'pct', values: statsList.map(s => s.coverageAvg), polarity: 1 });
    rows.push({ group: 'Presença', cat: 'Frequência média (%)', kind: 'num', values: statsList.map(s => s.freq.avg), polarity: 1 });
    (
      [
        ['Excelente (≥75%)', (f: FreqStat) => f.excellent, 1],
        ['Regular (50–74%)', (f: FreqStat) => f.regular, 0],
        ['Crítico (<50%)', (f: FreqStat) => f.critical, -1],
        ['Sem dados de presença', (f: FreqStat) => f.noData, 0],
      ] as [string, (f: FreqStat) => number, number][]
    ).forEach(([cat, pick, pol]) => {
      rows.push({
        group: 'Presença', cat, kind: 'pct', polarity: pol,
        values: statsList.map(s => (s.n ? Math.round((pick(s.freq) / s.n) * 100) : null)),
        counts: statsList.map(s => (s.n ? pick(s.freq) : null)),
      });
    });
    const dimCount = statsList[0]?.dims.length || 0;
    for (let d = 0; d < dimCount; d++) {
      const label = statsList[0].dims[d].label;
      rows.push({
        group: label, cat: 'Cobertura (avaliados / N)', kind: 'pct', polarity: 1,
        values: statsList.map(s => s.dims[d].coveragePct),
        counts: statsList.map(s => s.dims[d].coverage),
      });
      const unionCounts = new Map<string, number>();
      statsList.forEach(s => s.dims[d].dist.forEach(x => unionCounts.set(x.label, (unionCounts.get(x.label) || 0) + x.count)));
      Array.from(unionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat]) => {
          rows.push({
            group: label, cat, kind: 'pct', polarity: polarityOf(cat),
            values: statsList.map(s => {
              const dim = s.dims[d];
              if (!dim.coverage) return null;
              const found = dim.dist.find(x => x.label === cat);
              return found ? Math.round((found.count / dim.coverage) * 100) : 0;
            }),
            counts: statsList.map(s => {
              const dim = s.dims[d];
              if (!dim.coverage) return null;
              return dim.dist.find(x => x.label === cat)?.count ?? 0;
            }),
          });
        });
    }
    return rows;
  }, [statsList]);

  const deltaColor = (delta: number, polarity: number) => {
    if (!delta || polarity === 0) return '#87929a';
    return (delta > 0 && polarity > 0) || (delta < 0 && polarity < 0) ? '#34d399' : '#fb7185';
  };

  const describeRecorte = useCallback((r: Recorte) => {
    const cName = r.contract && r.contract !== 'Todos'
      ? (availableContracts.find(c => c.id === r.contract)?.name || r.contract)
      : 'Todos';
    return [
      `${LEVEL_LABELS.contract}: ${cName}`,
      `${LEVEL_LABELS.state}: ${r.state}`,
      `${LEVEL_LABELS.region}: ${r.region}`,
      `${LEVEL_LABELS.locality}: ${r.locality}`,
      `${LEVEL_LABELS.grade}: ${r.grade}`,
    ].join(' · ');
  }, [availableContracts]);

  // Análise automática por regras — mesma saída na tela e no PDF.
  const analysisBlocks = useMemo(() => {
    return buildComparativeAnalysis(
      recortes.map(r => ({ id: r.id, label: describeRecorte(r) })),
      statsList,
    );
  }, [recortes, statsList, describeRecorte]);

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(15); doc.setTextColor(11, 19, 38);
    doc.text('Estudo Comparativo — Edukyne', 40, 42);
    doc.setFontSize(9); doc.setTextColor(90);
    doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')} por ${user?.name || 'Sistema'}`, 40, 56);
    let y = 72;
    recortes.forEach((r, idx) => {
      const st = statsList[idx];
      doc.setFontSize(9); doc.setTextColor(11, 19, 38);
      doc.text(`Recorte ${r.id} (N=${st?.n ?? 0}) — ${describeRecorte(r)}`, 40, y);
      y += 12;
    });
    y += 6;
    const head = [['Indicador', 'Categoria', ...recortes.map(r => r.id), ...recortes.slice(1).map(r => `Δ ${r.id}`)]];
    const body = matrixRows.map(row => {
      const cells = row.values.map((v, j) => {
        if (v === null) return '—';
        if (row.kind === 'pct') return row.counts?.[j] != null ? `${fmtPct(v)} (${row.counts![j]})` : fmtPct(v);
        return row.cat.includes('(%)') ? `${fmtNum(v)}%` : String(Math.round(v));
      });
      const deltas = row.values.slice(1).map(v => {
        const base = row.values[0];
        if (v === null || base === null) return '—';
        const d = v - base;
        const txt = row.kind === 'pct' ? `${d > 0 ? '+' : ''}${Math.round(d)} p.p.` : `${d > 0 ? '+' : ''}${fmtNum(d)}`;
        return txt;
      });
      return [row.group, row.cat, ...cells, ...deltas];
    });
    autoTable(doc, {
      startY: y,
      head, body,
      theme: 'striped',
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: [56, 189, 248] },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 95 } },
    });

    // Análise automática em páginas adicionais do PDF.
    if (analysisBlocks.length) {
      const tableEnd = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;
      if (tableEnd > 560) doc.addPage();
      let py = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
        ? 40
        : tableEnd + 24;
      if (py > 560) { doc.addPage(); py = 40; }
      doc.setFontSize(12); doc.setTextColor(11, 19, 38);
      doc.text('Análise Automática do Estudo Comparativo', 40, py);
      py += 16;
      analysisBlocks.forEach(block => {
        doc.setFontSize(10); doc.setTextColor(11, 19, 38);
        doc.text(block.title, 40, py); py += 12;
        doc.setFontSize(8.5); doc.setTextColor(60);
        block.paragraphs.forEach(p => {
          const lines = doc.splitTextToSize(p, 520);
          lines.forEach((line: string) => {
            if (py > 760) { doc.addPage(); py = 40; }
            doc.text(line, 44, py); py += 10.5;
          });
          py += 3;
        });
        py += 6;
      });
      doc.setFontSize(7.5); doc.setTextColor(120);
      doc.text('Nota: análise gerada por regras automáticas sobre dados agregados. Categoria com valores baixos citada mesmo assim para ancorar a decisão do profissional.', 44, py);
    }

    doc.save(`Estudo_Comparativo_${new Date().toISOString().slice(0, 10)}.pdf`);
    logExport(user?.id || 'unknown', user?.role || 'unknown', 'performance_reports', 'pdf', 1);
  };

  if (isAlunoRole) {
    return (
      <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-6 text-center">
        <p className="text-sm text-[#bdc8d1] font-semibold">⚠ Estudo Comparativo indisponível para o perfil Aluno.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-[#dae2fd] text-xl font-extrabold flex items-center gap-2">
            <span className="text-[#8ed5ff]">📊</span> Estudo Comparativo de Recortes
          </h2>
          <p className="text-sm text-[#87929a] mt-1">
            Compare coortes lado a lado (alunos ativos, frequência, cobertura e distribuição por dimensão) com deltas coloridos.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={addRecorte}
            disabled={recortes.length >= 4}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 border border-[#38bdf8]/30 rounded-lg text-[#8ed5ff] text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> Adicionar Recorte
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#38bdf8]/15 hover:bg-[#38bdf8]/25 border border-[#38bdf8]/40 rounded-lg text-[#38bdf8] text-sm font-bold transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" /> Baixar PDF
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${recortes.length > 2 ? 'xl:grid-cols-2' : 'xl:grid-cols-2'} gap-4`}>
        {recortes.map((r, idx) => {
          const st = statsList[idx];
          return (
            <div key={r.id} className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-5 space-y-4" style={{ borderTopColor: r.color, borderTopWidth: 4 }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-extrabold uppercase tracking-wider" style={{ color: r.color }}>
                  {r.id === 'A' ? '◀' : r.id === 'B' ? '▶' : '◆'} Recorte {r.id}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#87929a] font-semibold">{st?.n ?? 0} alunos</span>
                  {idx >= 2 && (
                    <button
                      type="button"
                      onClick={() => removeRecorte(r.id)}
                      className="p-2 rounded hover:bg-[#93000a]/20 text-[#87929a] hover:text-[#ffb4ab] transition-colors"
                      title="Remover recorte"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {LEVEL_ORDER.map(lv => (
                  <label key={lv} className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-[#87929a] uppercase tracking-wider">{LEVEL_LABELS[lv]}</span>
                    {lv === 'contract' ? (
                      <select
                        value={r.contract}
                        onChange={e => updateRecorte(r.id, lv, e.target.value)}
                        className="bg-[#0b1326] border border-[#3e484f]/50 rounded-md px-3 py-2 text-sm text-[#dae2fd] focus:outline-none focus:border-[#38bdf8]/60"
                      >
                        <option value="Todos">Todos</option>
                        {availableContracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : (
                      <select
                        value={r[lv]}
                        onChange={e => updateRecorte(r.id, lv, e.target.value)}
                        className="bg-[#0b1326] border border-[#3e484f]/50 rounded-md px-3 py-2 text-sm text-[#dae2fd] focus:outline-none focus:border-[#38bdf8]/60"
                      >
                        <option value="Todos">Todos</option>
                        {buildOptions(r, lv).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                  </label>
                ))}
              </div>
              {st && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#0b1326]/60 border border-[#3e484f]/30 rounded-lg text-center">
                    <p className="text-[11px] text-[#87929a] font-bold uppercase">Frequência média</p>
                    <p className="text-2xl font-extrabold" style={{ color: r.color }}>{fmtNum(st.freq.avg)}%</p>
                  </div>
                  <div className="p-3 bg-[#0b1326]/60 border border-[#3e484f]/30 rounded-lg text-center">
                    <p className="text-[11px] text-[#87929a] font-bold uppercase">Cobertura média</p>
                    <p className="text-2xl font-extrabold" style={{ color: r.color }}>{st.coverageAvg}%</p>
                  </div>
                  <div className="p-3 bg-[#0b1326]/60 border border-[#3e484f]/30 rounded-lg text-center">
                    <p className="text-[11px] text-[#87929a] font-bold uppercase">Presença crítica</p>
                    <p className="text-2xl font-extrabold text-[#fb7185]">{st.freq.critical}</p>
                  </div>
                </div>
              )}
              {(st?.n ?? 0) === 0 && (
                <p className="text-xs text-[#ffb4ab] font-semibold">⚠ Nenhum aluno ativo neste recorte — os indicadores ficarão vazios.</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {statsList[0]?.dims.map((_, dimIdx) => (
          <ComparisonChart
            key={statsList[0].dims[dimIdx].key}
            title={statsList[0].dims[dimIdx].label}
            recortes={recortes}
            statsList={statsList}
            dimIdx={dimIdx}
          />
        ))}
      </div>

      <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-5 space-y-4">
        <p className="text-xs font-bold text-[#8ed5ff] uppercase tracking-wider">
          Matriz comparativa — valores entre parênteses são o total de alunos; Δ compara cada recorte com o A
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[640px]">
            <thead>
              <tr className="text-left text-[#87929a] uppercase tracking-wider text-[11px] border-b border-[#3e484f]/40">
                <th className="py-2.5 pr-3 font-bold">Dimensão</th>
                <th className="py-2.5 pr-3 font-bold">Categoria</th>
                {recortes.map(r => (
                  <th key={r.id} className="py-2.5 px-3 font-bold text-center" style={{ color: r.color }}>{r.id}</th>
                ))}
                {recortes.slice(1).map(r => (
                  <th key={`d-${r.id}`} className="py-2.5 px-3 font-bold text-center text-[#87929a]">Δ {r.id}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row, i) => {
                const prev = matrixRows[i - 1];
                const showGroup = !prev || prev.group !== row.group;
                return (
                  <tr key={`${row.group}-${row.cat}-${i}`} className="border-b border-[#3e484f]/15 hover:bg-[#0b1326]/40">
                    <td className="py-2 pr-3 text-[#8ed5ff] font-bold whitespace-nowrap">{showGroup ? row.group : ''}</td>
                    <td className="py-2 pr-3 text-[#bdc8d1] whitespace-nowrap">{row.cat}</td>
                    {row.values.map((v, j) => (
                      <td key={j} className="py-2 px-3 text-center text-[#dae2fd] font-semibold whitespace-nowrap">
                        {v === null ? '—' : row.kind === 'pct'
                          ? (row.counts?.[j] != null ? `${fmtPct(v)} (${row.counts[j]})` : fmtPct(v))
                          : (row.cat.includes('(%)') ? `${fmtNum(v)}%` : String(Math.round(v)))}
                      </td>
                    ))}
                    {row.values.slice(1).map((v, j) => {
                      const base = row.values[0];
                      if (v === null || base === null) return <td key={`d${j}`} className="py-2 px-3 text-center text-[#87929a]">—</td>;
                      const d = v - base;
                      return (
                        <td key={`d${j}`} className="py-2 px-3 text-center font-bold whitespace-nowrap" style={{ color: deltaColor(d, row.polarity) }}>
                          {row.kind === 'pct' ? `${d > 0 ? '+' : ''}${Math.round(d)} p.p.` : `${d > 0 ? '+' : ''}${fmtNum(d)}`}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <details className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-5 space-y-4" open>
        <summary className="text-xs font-bold text-[#8ed5ff] uppercase tracking-wider cursor-pointer select-none">
          Análise Automática — diagnóstico gerado sobre os dados da matriz
        </summary>
        <div className="mt-3 space-y-5">
          {analysisBlocks.map(block => (
            <div key={block.title} className="space-y-2">
              <h3
                className="text-sm font-extrabold uppercase tracking-wider"
                style={{
                  color: block.accent === 'negative' ? '#fb7185' : block.accent === 'positive' ? '#34d399' : '#8ed5ff',
                }}
              >
                {block.title}
              </h3>
              <ul className="space-y-1.5">
                {block.paragraphs.map((p, i) => (
                  <li key={i} className="text-xs text-[#bdc8d1] leading-relaxed whitespace-pre-line">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#87929a]/70 italic">
          Δ mínimo citado: {ANALYSIS_CONFIG.minDeltaPp} p.p. · todas as categorias são citadas mesmo com valores baixos.
        </p>
      </details>
    </div>
  );
}

function ComparisonChart({ title, recortes, statsList, dimIdx }: {
  title: string;
  recortes: Recorte[];
  statsList: RecorteStats[];
  dimIdx: number;
}) {
  const cats = useMemo(() => {
    const unionCounts = new Map<string, number>();
    statsList.forEach(s => {
      const dim = s.dims[dimIdx];
      dim?.dist.forEach(x => unionCounts.set(x.label, (unionCounts.get(x.label) || 0) + x.count));
    });
    return Array.from(unionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => label);
  }, [statsList, dimIdx]);

  const data = useMemo(() => cats.map(cat => {
    const row: Record<string, string | number> = { name: cat };
    statsList.forEach((s, i) => {
      const dim = s.dims[dimIdx];
      const found = dim?.dist.find(x => x.label === cat);
      row[recortes[i].id] = dim && dim.coverage && found ? Math.round((found.count / dim.coverage) * 100) : 0;
    });
    return row;
  }), [cats, statsList, dimIdx, recortes]);

  const hasData = data.length > 0 && statsList.some(s => (s.dims[dimIdx]?.coverage || 0) > 0);

  const maxLabelLen = useMemo(() => Math.max(...cats.map(c => c.length)), [cats]);
  const needsWrap = maxLabelLen > 24;
  const lineH = 14;
  const maxLines = useMemo(() => {
    if (!needsWrap) return 1;
    let worst = 1;
    cats.forEach(text => {
      const words = text.split(' ');
      let lines = 1;
      let cur = '';
      words.forEach(w => {
        const candidate = cur ? `${cur} ${w}` : w;
        if (candidate.length > 24 && cur) { lines++; cur = w; }
        else cur = candidate;
      });
      if (lines > worst) worst = lines;
    });
    return worst;
  }, [cats, needsWrap]);
  const rowH = needsWrap ? Math.max(38, maxLines * lineH + 14) : 44;
  const height = Math.max(190, cats.length * rowH + 42);

  return (
    <div className="p-5 bg-[#171f33] border border-[#3e484f]/40 rounded-xl space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-bold text-[#8ed5ff] uppercase tracking-wider">{title}</p>
        <div className="flex items-center gap-3 flex-wrap">
          {recortes.map((r, i) => (
            <span key={r.id} className="flex items-center gap-1.5 text-xs font-bold text-[#bdc8d1]">
              <span className="w-3 h-3 rounded-full" style={{ background: r.color }} />
              {r.id}: {statsList[i]?.dims[dimIdx]?.coverage ?? 0}/{statsList[i]?.n ?? 0} avaliados
            </span>
          ))}
        </div>
      </div>
      {hasData ? (
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke="#3e484f" strokeOpacity={0.25} />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: '#87929a', fontSize: 12 }} stroke="#3e484f" />
              <YAxis
                type="category"
                dataKey="name"
                width={needsWrap ? 200 : 190}
                interval={0}
                tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
                  const text = payload.value || '';
                  const words = text.split(' ');
                  const lines: string[] = [''];
                  words.forEach(w => {
                    const last = lines.length - 1;
                    const candidate = lines[last] ? `${lines[last]} ${w}` : w;
                    if (candidate.length > 24 && lines[last]) {
                      lines.push(w);
                    } else {
                      lines[last] = candidate;
                    }
                  });
                  const totalH = (lines.length - 1) * lineH;
                  return (
                    <text x={x - 8} y={y + 4} textAnchor="end" fill="#bdc8d1" fontSize={12}>
                      {lines.map((line, i) => (
                        <tspan key={i} x={x - 8} dy={i === 0 ? `${-totalH / 2}px` : `${lineH}px`}>{line}</tspan>
                      ))}
                    </text>
                  );
                }}
                stroke="#3e484f"
              />
              <Tooltip
                cursor={{ fill: 'rgba(142, 213, 255, 0.06)' }}
                contentStyle={{ background: '#0b1326', border: '1px solid rgba(62,72,79,0.6)', borderRadius: 8, fontSize: 12, color: '#dae2fd' }}
                formatter={((value: number | string) => [`${value}%`, '']) as never}
              />
              {recortes.map(r => (
                <Bar key={r.id} dataKey={r.id} name={`Recorte ${r.id}`} fill={r.color} radius={[0, 3, 3, 0]} maxBarSize={22} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-xs text-[#87929a] italic py-6 text-center">Nenhuma avaliação registrada nos recortes atuais.</p>
      )}
    </div>
  );
}
