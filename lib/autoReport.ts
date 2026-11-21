// Geracao automatica de relatorio de performance ao finalizar uma avaliacao.
// Busca as configs necessarias, monta o texto via buildAssessmentReport (fonte
// unica) e da upsert no registro REP-<idDaAvaliacao> preservando a anotacao do
// educador caso ja exista. Escrita via facade getDb() (passa por /api/data).

import { getDb } from './dbFacade';
import {
  buildAssessmentReport, FOCUS_BY_ASSESSMENT,
  type ReportBuildCtx, type M4Item, type M5Item, type M6Modalidade, type M6Diretriz, type M7Row, type ParecerRow,
} from './reportBuilder';
import {createReportTranslator, localizeAssessmentReport} from './reportI18n';

export type AssessmentKind = 'imc' | 'motor' | 'sport' | 'vocational' | 'health' | 'oral' | 'autoconcept' | 'ias' | 'snap' | 'aq10' | 'pcd';

const cleanText = (s: string) => s.replace(/#+/g, '').replace(/\*\*/g, '');

const INTL_LOCALE: Record<string, string> = { 'gn-PY': 'es-PY' };

const currentUiLocale = () => {
  if (typeof document === 'undefined') return 'pt-BR';
  return document.documentElement.lang || 'pt-BR';
};

const currentReportLocale = () => {
  const locale = currentUiLocale();
  return INTL_LOCALE[locale] ?? locale;
};

const buildLocalized = (ctx: ReportBuildCtx, locale = currentUiLocale()) =>
  locale === 'pt-BR'
    ? buildAssessmentReport(ctx)
    : localizeAssessmentReport(ctx, createReportTranslator(locale), locale);

const BASE_CTX = (focusArea: string, studentName: string, observations: string, dateStr: string): ReportBuildCtx => ({
  focusArea, studentName, observations, dateStr,
  imcRecords: [], selectedImcId: '', m4ImcData: [],
  motorRecords: [], selectedMotorId: '', m5Data: {},
  sportRecords: [], selectedSportId: '', selectedSportName: '', m6Modalidades: [], m6Diretrizes: [],
  vocationRecords: [], selectedVocationId: '', m7Rows: [],
  healthRecords: [], selectedHealthId: '', m9Rows: [],
  oralRecords: [], selectedOralId: '', m10Rows: [],
  autoconceptRecords: [], selectedAutoId: '', m11Rows: [],
  iasRecords: [], selectedIasId: '', m12Rows: [],
  snapRecords: [], selectedSnapId: '', m13Rows: [],
  aq10Records: [], selectedAq10Id: '', m14Rows: [],
  pcdRecords: [], selectedPcdId: '',
  attendanceRate: null, presenceCount: 0, totalCount: 0, m3Analysis: null, existingReports: [],
});

async function fetchParecer(table: string): Promise<ParecerRow[]> {
  const supabase = getDb();
  if (!supabase) return [];
  const { data } = await supabase.from(table).select('classification, basic_data, reflection');
  return (data || []).map((r: { classification: string; basic_data: string | null; reflection: string | null }) => ({
    classification: r.classification, basicData: r.basic_data ?? '', reflection: r.reflection ?? '',
  }));
}

export async function ensurePerformanceReport(
  kind: AssessmentKind,
  params: { studentId: string; studentName: string; studentGrade?: string; record: Record<string, unknown>; existingObservations?: string }
): Promise<boolean> {
  const supabase = getDb();
  if (!supabase) return false;
  const recordId = String(params.record?.id ?? '');
  if (!recordId) return false;
  const reportId = `REP-${recordId}`;
  const focusArea = FOCUS_BY_ASSESSMENT[kind];

  // Preserva a anotacao ja salva do educador (nao sobrescrever no re-salvar).
  let observations = params.existingObservations ?? '';
  if (params.existingObservations === undefined) {
    try {
      const { data } = await supabase.from('performance_reports').select('observations').eq('id', reportId).limit(1);
      observations = (data && data.length > 0 ? (data[0] as { observations?: string }).observations : '') ?? '';
    } catch { /* tabela pode nao existir ainda */ }
  }

  const uiLocale = currentUiLocale();
  const dateStr = new Date().toLocaleDateString(currentReportLocale());
  const ctx = BASE_CTX(focusArea, params.studentName, observations, dateStr);
  let evaluationResult = '';

  try {
    if (kind === 'imc') {
      ctx.imcRecords = [params.record as unknown as ReportBuildCtx['imcRecords'][number]];
      ctx.selectedImcId = recordId;
      const { data } = await supabase.from('m4_imc_config').select('classification, status, alert_color, description');
      ctx.m4ImcData = (data || []) as unknown as M4Item[];
    } else if (kind === 'motor') {
      ctx.motorRecords = [params.record as unknown as ReportBuildCtx['motorRecords'][number]];
      ctx.selectedMotorId = recordId;
      const { data } = await supabase.from('m5_capacidades_config').select('category, level, health_status, to_improve, recommendation');
      const m5Data: Record<string, M5Item[]> = {};
      (data || []).forEach((r: { category: string; level: string; health_status: string | null; to_improve: string | null; recommendation: string | null }) => {
        (m5Data[r.category] ||= []).push({ level: r.level, healthStatus: r.health_status ?? '', toImprove: r.to_improve ?? '', recommendation: r.recommendation ?? '' });
      });
      ctx.m5Data = m5Data;
    } else if (kind === 'sport') {
      ctx.sportRecords = [params.record as unknown as ReportBuildCtx['sportRecords'][number]];
      ctx.selectedSportId = recordId;
      const [mods, dirs] = await Promise.all([
        supabase.from('m6_modalidades_direcionamento').select('name, valencias, condition, report'),
        supabase.from('m6_diretrizes_intervencao').select('diretriz, criterio, conduta, objetivo'),
      ]);
      ctx.m6Modalidades = (mods.data || []) as unknown as M6Modalidade[];
      ctx.m6Diretrizes = (dirs.data || []) as unknown as M6Diretriz[];
    } else if (kind === 'vocational') {
      ctx.vocationRecords = [params.record as unknown as ReportBuildCtx['vocationRecords'][number]];
      ctx.selectedVocationId = recordId;
      const { data } = await supabase.from('m7_perfis_pareceres').select('profile, component, basic_data, reflection');
      ctx.m7Rows = (data || []).map((r: { profile: string; component: string; basic_data: string | null; reflection: string | null }) => ({
        profile: r.profile, component: r.component, basicData: r.basic_data ?? '', reflection: r.reflection ?? '',
      })) as M7Row[];
    } else if (kind === 'health') {
      ctx.healthRecords = [params.record as unknown as ReportBuildCtx['healthRecords'][number]];
      ctx.selectedHealthId = recordId;
      ctx.m9Rows = await fetchParecer('m9_perfis_pareceres');
    } else if (kind === 'oral') {
      ctx.oralRecords = [params.record as unknown as ReportBuildCtx['oralRecords'][number]];
      ctx.selectedOralId = recordId;
      ctx.m10Rows = await fetchParecer('m10_perfis_pareceres');
    } else if (kind === 'autoconcept') {
      ctx.autoconceptRecords = [params.record as unknown as ReportBuildCtx['autoconceptRecords'][number]];
      ctx.selectedAutoId = recordId;
      ctx.m11Rows = await fetchParecer('m11_perfis_pareceres');
    } else if (kind === 'ias') {
      ctx.iasRecords = [params.record as unknown as ReportBuildCtx['iasRecords'][number]];
      ctx.selectedIasId = recordId;
      ctx.m12Rows = await fetchParecer('m12_perfis_pareceres');
    } else if (kind === 'snap') {
      ctx.snapRecords = [params.record as unknown as ReportBuildCtx['snapRecords'][number]];
      ctx.selectedSnapId = recordId;
      ctx.m13Rows = await fetchParecer('m13_perfis_pareceres');
    } else if (kind === 'aq10') {
      ctx.aq10Records = [params.record as unknown as ReportBuildCtx['aq10Records'][number]];
      ctx.selectedAq10Id = recordId;
      ctx.m14Rows = await fetchParecer('m14_perfis_pareceres');
    } else if (kind === 'pcd') {
      ctx.pcdRecords = [params.record as unknown as ReportBuildCtx['pcdRecords'][number]];
      ctx.selectedPcdId = recordId;
    } else {
      return false;
    }

    const built = buildLocalized(ctx, uiLocale);
    if (!built) return false;
    evaluationResult = built.evaluationResult;
    const report = cleanText(built.report);
    const dateVal = String(params.record?.date ?? '') || new Date().toISOString().split('T')[0];

    const { error } = await supabase.from('performance_reports').upsert({
      id: reportId,
      student_id: params.studentId,
      student_name: params.studentName,
      grade: params.studentGrade ?? '',
      focus_area: focusArea,
      observations,
      report,
      date: dateVal,
      evaluation_id: recordId,
      evaluation_result: evaluationResult,
    });
    return !error;
  } catch (e) {
    console.error('[Edukyne] Falha ao gerar relatorio automatico:', e);
    return false;
  }
}

const CHUNK = 200;

// Backfill: gera/atualiza relatorios de performance (8 dimensoes + Escolar + Completo)
// para uma lista de alunos. Le configs/presenca uma vez, monta tudo em memoria e
// escreve em blocos com progresso. Preserva a anotacao dos relatorios ja salvos.
export async function backfillReportsForStudentIds(
  studentIds: string[],
  opts?: { onProgress?: (done: number, total: number) => void; locale?: string }
): Promise<number> {
  const supabase = getDb();
  if (!supabase) return 0;
  const idSet = new Set(studentIds);

  const [studentsQ, m4Q, m5Q, m6modQ, m6dirQ, m7Q, m9Q, m10Q, m11Q, m12Q, m13Q, m14Q,
    imcQ, motorQ, sportQ, vocQ, healthQ, oralQ, autoQ, iasQ, snapQ, aq10Q, pcdQ, existingQ, attQ] = await Promise.all([
    supabase.from('students').select('id, name, grade'),
    supabase.from('m4_imc_config').select('classification, status, alert_color, description'),
    supabase.from('m5_capacidades_config').select('category, level, health_status, to_improve, recommendation'),
    supabase.from('m6_modalidades_direcionamento').select('name, valencias, condition, report'),
    supabase.from('m6_diretrizes_intervencao').select('diretriz, criterio, conduta, objetivo'),
    supabase.from('m7_perfis_pareceres').select('profile, component, basic_data, reflection'),
    supabase.from('m9_perfis_pareceres').select('classification, basic_data, reflection'),
    supabase.from('m10_perfis_pareceres').select('classification, basic_data, reflection'),
    supabase.from('m11_perfis_pareceres').select('classification, basic_data, reflection'),
    supabase.from('m12_perfis_pareceres').select('classification, basic_data, reflection'),
    supabase.from('m13_perfis_pareceres').select('classification, basic_data, reflection'),
    supabase.from('m14_perfis_pareceres').select('classification, basic_data, reflection'),
    supabase.from('imc_assessments').select('id, student_id, student_name, weight, height, imc, classification, class_group, date'),
    supabase.from('motor_assessments').select('id, student_id, student_name, impulsao, abdomen, agility, strength, speed, general_class, date'),
    supabase.from('sport_assessments').select('id, student_id, student_name, biotype, main_skill, suggested_sport, recommended_practice, date'),
    supabase.from('vocational_assessments').select('id, student_id, student_name, profile, interest_area, suggested_career, technical_opinion, date'),
    supabase.from('health_assessments').select('id, student_id, student_name, raw_score, t_score, classification, technical_opinion, date, answers'),
    supabase.from('oral_assessments').select('id, student_id, student_name, score, classification, technical_opinion, date, answers'),
    supabase.from('autoconcept_assessments').select('id, student_id, student_name, score, classification, technical_opinion, date, answers'),
    supabase.from('ias_assessments').select('id, student_id, student_name, total_score, classification, technical_opinion, date, answers'),
    supabase.from('snap_assessments').select('id, student_id, student_name, inattention_score, hyperactivity_score, classification, technical_opinion, respondent, date, answers'),
    supabase.from('aq10_assessments').select('id, student_id, student_name, version, total_score, classification, technical_opinion, respondent, date, answers'),
    supabase.from('pcd_assessments').select('id, student_id, student_name, grupo, grupo_nome, detalhe_classificacao, abdominal_s, velocidade_s, agilidade_s, salto_cm, flexao_rep, nota_abdominal, nota_velocidade, nota_agilidade, nota_salto, nota_flexao, nota_vel_agil, nota_forca_explosiva, nota_membros_sup, nota_core, compatibilidade, direcionamento, classificacao_perfil, funil, adaptacoes_aplicadas, technical_opinion, date'),
    supabase.from('performance_reports').select('id, student_id, focus_area, report, observations'),
    supabase.from('attendance_records').select('student_id, present'),
  ]);

  const students = studentsQ.data || [];
  const gradeMap = new Map<string, string>(students.map((s: { id: string; grade: string | null }) => [s.id, s.grade ?? '']));
  const nameMap = new Map<string, string>(students.map((s: { id: string; name: string | null }) => [s.id, s.name ?? 'Aluno']));
  const m4ImcData: M4Item[] = (m4Q.data || []).map((r: { classification: string; status: string | null; alert_color: string | null; description: string | null }) => ({ classification: r.classification, status: r.status ?? '', alertColor: r.alert_color ?? '', description: r.description ?? '' }));
  const m5Data: Record<string, M5Item[]> = {};
  (m5Q.data || []).forEach((r: { category: string; level: string; health_status: string | null; to_improve: string | null; recommendation: string | null }) => {
    (m5Data[r.category] ||= []).push({ level: r.level, healthStatus: r.health_status ?? '', toImprove: r.to_improve ?? '', recommendation: r.recommendation ?? '' });
  });
  const m6Modalidades: M6Modalidade[] = (m6modQ.data || []).map((r: { name: string; valencias: string | null; condition: string | null; report: string | null }) => ({ name: r.name, valencias: r.valencias ?? '', condition: r.condition ?? '', report: r.report ?? '' }));
  const m6Diretrizes: M6Diretriz[] = (m6dirQ.data || []).map((r: { diretriz: string; criterio: string | null; conduta: string | null; objetivo: string | null }) => ({ diretriz: r.diretriz, criterio: r.criterio ?? '', conduta: r.conduta ?? '', objetivo: r.objetivo ?? '' }));
  const m7Rows: M7Row[] = (m7Q.data || []).map((r: { profile: string; component: string; basic_data: string | null; reflection: string | null }) => ({ profile: r.profile, component: r.component, basicData: r.basic_data ?? '', reflection: r.reflection ?? '' }));
  const mapP = (arr: { classification: string; basic_data: string | null; reflection: string | null }[] | null): ParecerRow[] => (arr || []).map(r => ({ classification: r.classification, basicData: r.basic_data ?? '', reflection: r.reflection ?? '' }));
  const m9Rows = mapP(m9Q.data), m10Rows = mapP(m10Q.data), m11Rows = mapP(m11Q.data), m12Rows = mapP(m12Q.data), m13Rows = mapP(m13Q.data), m14Rows = mapP(m14Q.data);

  const obsMap = new Map<string, string>();
  const studentReports = new Map<string, Map<string, string>>(); // studentId -> focusArea -> report text
  (existingQ.data || []).forEach((r: { id: string; student_id: string | null; focus_area: string | null; report: string | null; observations: string | null }) => {
    if (!r.student_id || !idSet.has(r.student_id)) return;
    obsMap.set(r.id, r.observations ?? '');
    if (!r.focus_area) return;
    let m = studentReports.get(r.student_id);
    if (!m) { m = new Map(); studentReports.set(r.student_id, m); }
    if (!m.has(r.focus_area)) m.set(r.focus_area, r.report ?? '');
  });
  const attStats = new Map<string, { present: number; total: number }>();
  (attQ.data || []).forEach((a: { student_id: string | null; present: boolean | null }) => {
    if (!a.student_id) return;
    const e = attStats.get(a.student_id) || { present: 0, total: 0 };
    e.total++; if (a.present) e.present++;
    attStats.set(a.student_id, e);
  });

  const locale = opts?.locale ?? currentUiLocale();
  const dateStr = new Date().toLocaleDateString(currentReportLocale());
  const today = new Date().toISOString().split('T')[0];
  const ensureMap = (sid: string) => { let m = studentReports.get(sid); if (!m) { m = new Map(); studentReports.set(sid, m); } return m; };

  const jobs: { kind: AssessmentKind; studentId: string; studentName: string; rid: string; rec: Record<string, unknown> }[] = [];
  const pushAll = (rows: Record<string, unknown>[] | null, kind: AssessmentKind) => {
    (rows || []).forEach(r => { if (r.student_id && idSet.has(String(r.student_id))) jobs.push({ kind, studentId: String(r.student_id), studentName: String(r.student_name ?? ''), rid: String(r.id), rec: r }); });
  };
  pushAll(imcQ.data, 'imc'); pushAll(motorQ.data, 'motor'); pushAll(sportQ.data, 'sport'); pushAll(vocQ.data, 'vocational');
  pushAll(healthQ.data, 'health'); pushAll(oralQ.data, 'oral'); pushAll(autoQ.data, 'autoconcept'); pushAll(iasQ.data, 'ias'); pushAll(snapQ.data, 'snap'); pushAll(aq10Q.data, 'aq10'); pushAll(pcdQ.data, 'pcd');

  const rows: Record<string, unknown>[] = [];

  // 1) 8 dimensoes de avaliacao (um relatorio por avaliacao do aluno).
  for (const j of jobs) {
    const focusArea = FOCUS_BY_ASSESSMENT[j.kind];
    const rid = j.rid;
    const observations = obsMap.get(`REP-${rid}`) ?? '';
    const ctx = BASE_CTX(focusArea, j.studentName, observations, dateStr);
    if (j.kind === 'imc') { ctx.imcRecords = [{ id: j.rec.id, studentId: j.rec.student_id, studentName: j.rec.student_name, weight: Number(j.rec.weight), height: Number(j.rec.height), imc: Number(j.rec.imc), classification: j.rec.classification, classGroup: j.rec.class_group, date: j.rec.date }] as unknown as ReportBuildCtx['imcRecords']; ctx.selectedImcId = rid; ctx.m4ImcData = m4ImcData; }
    else if (j.kind === 'motor') { ctx.motorRecords = [{ id: j.rec.id, studentId: j.rec.student_id, studentName: j.rec.student_name, impulsao: j.rec.impulsao, abdomen: j.rec.abdomen, agility: j.rec.agility, strength: j.rec.strength, speed: j.rec.speed, generalClass: j.rec.general_class, date: j.rec.date }] as unknown as ReportBuildCtx['motorRecords']; ctx.selectedMotorId = rid; ctx.m5Data = m5Data; }
    else if (j.kind === 'sport') { ctx.sportRecords = [{ id: j.rec.id, studentId: j.rec.student_id, studentName: j.rec.student_name, biotype: j.rec.biotype, mainSkill: j.rec.main_skill, suggestedSport: j.rec.suggested_sport, recommendedPractice: j.rec.recommended_practice, date: j.rec.date }] as unknown as ReportBuildCtx['sportRecords']; ctx.selectedSportId = rid; ctx.m6Modalidades = m6Modalidades; ctx.m6Diretrizes = m6Diretrizes; }
    else if (j.kind === 'vocational') { ctx.vocationRecords = [{ id: j.rec.id, studentId: j.rec.student_id, studentName: j.rec.student_name, profile: j.rec.profile, interestArea: j.rec.interest_area, suggestedCareer: j.rec.suggested_career, technicalOpinion: j.rec.technical_opinion, date: j.rec.date }] as unknown as ReportBuildCtx['vocationRecords']; ctx.selectedVocationId = rid; ctx.m7Rows = m7Rows; }
    else if (j.kind === 'health') { ctx.healthRecords = [{ id: j.rec.id, studentId: j.rec.student_id, studentName: j.rec.student_name, rawScore: Number(j.rec.raw_score), tScore: Number(j.rec.t_score), classification: j.rec.classification, technicalOpinion: j.rec.technical_opinion, date: j.rec.date }] as unknown as ReportBuildCtx['healthRecords']; ctx.selectedHealthId = rid; ctx.m9Rows = m9Rows; }
    else if (j.kind === 'oral') { ctx.oralRecords = [{ id: j.rec.id, studentId: j.rec.student_id, studentName: j.rec.student_name, score: Number(j.rec.score), classification: j.rec.classification, technicalOpinion: j.rec.technical_opinion, date: j.rec.date }] as unknown as ReportBuildCtx['oralRecords']; ctx.selectedOralId = rid; ctx.m10Rows = m10Rows; }
    else if (j.kind === 'autoconcept') { ctx.autoconceptRecords = [{ id: j.rec.id, studentId: j.rec.student_id, studentName: j.rec.student_name, score: Number(j.rec.score), classification: j.rec.classification, technicalOpinion: j.rec.technical_opinion, date: j.rec.date }] as unknown as ReportBuildCtx['autoconceptRecords']; ctx.selectedAutoId = rid; ctx.m11Rows = m11Rows; }
    else if (j.kind === 'ias') { ctx.iasRecords = [{ id: j.rec.id, studentId: j.rec.student_id, studentName: j.rec.student_name, totalScore: Number(j.rec.total_score), classification: j.rec.classification, technicalOpinion: j.rec.technical_opinion, date: j.rec.date }] as unknown as ReportBuildCtx['iasRecords']; ctx.selectedIasId = rid; ctx.m12Rows = m12Rows; }
    else if (j.kind === 'snap') { ctx.snapRecords = [{ id: j.rec.id, studentId: j.rec.student_id, studentName: j.rec.student_name, inattentionScore: Number(j.rec.inattention_score), hyperactivityScore: Number(j.rec.hyperactivity_score), classification: j.rec.classification, technicalOpinion: j.rec.technical_opinion, respondent: j.rec.respondent ?? undefined, date: j.rec.date }] as unknown as ReportBuildCtx['snapRecords']; ctx.selectedSnapId = rid; ctx.m13Rows = m13Rows; }
    else if (j.kind === 'aq10') { ctx.aq10Records = [{ id: j.rec.id, studentId: j.rec.student_id, studentName: j.rec.student_name, version: (j.rec.version === 'adolescente' ? 'adolescente' : 'crianca'), totalScore: Number(j.rec.total_score), classification: j.rec.classification, technicalOpinion: j.rec.technical_opinion, respondent: j.rec.respondent ?? undefined, date: j.rec.date }] as unknown as ReportBuildCtx['aq10Records']; ctx.selectedAq10Id = rid; ctx.m14Rows = m14Rows; }
    else if (j.kind === 'pcd') { ctx.pcdRecords = [{ id: j.rec.id, studentId: j.rec.student_id, studentName: j.rec.student_name, grupo: Number(j.rec.grupo), grupoNome: j.rec.grupo_nome ?? '', detalheClassificacao: j.rec.detalhe_classificacao ?? '', abdominalS: j.rec.abdominal_s ?? null, velocidadeS: j.rec.velocidade_s ?? null, agilidadeS: j.rec.agilidade_s ?? null, saltoCm: j.rec.salto_cm ?? null, flexaoRep: j.rec.flexao_rep ?? null, notaAbdominal: Number(j.rec.nota_abdominal ?? 0), notaVelocidade: Number(j.rec.nota_velocidade ?? 0), notaAgilidade: Number(j.rec.nota_agilidade ?? 0), notaSalto: Number(j.rec.nota_salto ?? 0), notaFlexao: Number(j.rec.nota_flexao ?? 0), notaVelAgil: Number(j.rec.nota_vel_agil ?? 0), notaForcaExplosiva: Number(j.rec.nota_forca_explosiva ?? 0), notaMembrosSup: Number(j.rec.nota_membros_sup ?? 0), notaCore: Number(j.rec.nota_core ?? 0), compatibilidade: Array.isArray(j.rec.compatibilidade) ? j.rec.compatibilidade : [], direcionamento: j.rec.direcionamento ?? '', classificacaoPerfil: j.rec.classificacao_perfil ?? '', funil: Array.isArray(j.rec.funil) ? j.rec.funil : [], adaptacoesAplicadas: Array.isArray(j.rec.adaptacoes_aplicadas) ? j.rec.adaptacoes_aplicadas : [], technicalOpinion: j.rec.technical_opinion ?? '', date: j.rec.date ?? '' }] as unknown as ReportBuildCtx['pcdRecords']; ctx.selectedPcdId = rid; }
    const built = buildLocalized(ctx, locale);
    if (!built) continue;
    const report = cleanText(built.report);
    rows.push({ id: `REP-${rid}`, student_id: j.studentId, student_name: j.studentName, grade: gradeMap.get(j.studentId) ?? '', focus_area: focusArea, observations, report, date: today, evaluation_id: rid, evaluation_result: built.evaluationResult || null });
    ensureMap(j.studentId).set(focusArea, report);
  }

  // 2) Escolar (por presenca) e Completo (juntando o que existe) por aluno.
  for (const sid of studentIds) {
    const name = nameMap.get(sid) ?? 'Aluno';
    const grade = gradeMap.get(sid) ?? '';
    const m = ensureMap(sid);
    const a = attStats.get(sid);
    const rate = a && a.total > 0 ? (a.present / a.total) * 100 : null;
    const escolarId = `REP-${sid}-escolar`;
    if (rate !== null) {
      const ctx = BASE_CTX('Desempenho Escolar', name, obsMap.get(escolarId) ?? '', dateStr);
      ctx.attendanceRate = rate; ctx.presenceCount = a!.present; ctx.totalCount = a!.total; ctx.m3Analysis = null;
      const built = buildLocalized(ctx, locale);
      if (built) {
        const report = cleanText(built.report);
        rows.push({ id: escolarId, student_id: sid, student_name: name, grade, focus_area: 'Desempenho Escolar', observations: obsMap.get(escolarId) ?? '', report, date: today, evaluation_id: null, evaluation_result: null });
        m?.set('Desempenho Escolar', report);
      }
    }
    if (m && m.size > 0) {
      const compId = `REP-${sid}-completo`;
      const ctx = BASE_CTX('Desempenho Completo', name, obsMap.get(compId) ?? '', dateStr);
      ctx.studentGrade = grade;
      ctx.existingReports = Array.from(m.entries()).map(([focusArea, report]) => ({ focusArea, report }));
      const built = buildLocalized(ctx, locale);
      if (built) {
        rows.push({ id: compId, student_id: sid, student_name: name, grade, focus_area: 'Desempenho Completo', observations: obsMap.get(compId) ?? '', report: cleanText(built.report), date: today, evaluation_id: null, evaluation_result: null });
      }
    }
  }

  // 3) Escrita em blocos com progresso.
  const total = rows.length;
  let wrote = 0;
  opts?.onProgress?.(0, total);
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from('performance_reports').upsert(chunk);
    if (!error) wrote += chunk.length;
    opts?.onProgress?.(Math.min(i + CHUNK, rows.length), total);
  }
  return wrote;
}
