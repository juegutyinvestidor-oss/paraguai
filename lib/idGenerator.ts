import { getSupabase } from './supabase';

export function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const ROLE_PREFIX_MAP: Record<string, string> = {
  'gestor': 'G',
  'professor': 'P',
  'assistente': 'AS',
  'estagiario': 'E',
  'estagiário': 'E',
  'administrador': 'ADM',
};

export function getRolePrefix(role: string): string {
  const normalized = (role || '').trim().toLowerCase();
  if (ROLE_PREFIX_MAP[normalized]) return ROLE_PREFIX_MAP[normalized];
  const uppercase = role.replace(/[^A-Z]/g, '');
  if (uppercase.length > 0) return uppercase;
  return role.substring(0, Math.min(2, role.length)).toUpperCase();
}

async function callRpc<T = string>(functionName: string, params?: Record<string, unknown>): Promise<T | null> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error(`[Edukyne] Supabase nao configurado. Nao foi possivel gerar ID via RPC.`);
    return null;
  }
  const { data, error } = await supabase.rpc(functionName, params);
  if (error) {
    console.error(`[Edukyne] Erro ao chamar RPC ${functionName}:`, error.message);
    return null;
  }
  return data as T;
}

export async function nextStudentId(): Promise<string | null> {
  return callRpc('next_student_id');
}

export async function nextProfessionalId(role: string): Promise<string | null> {
  const prefix = getRolePrefix(role);
  return callRpc('next_professional_id', { prefix });
}

export async function nextContractId(): Promise<string | null> {
  return callRpc('next_contract_id');
}

export async function nextModalityId(): Promise<string | null> {
  return callRpc('next_modality_id');
}

export async function nextImcId(): Promise<string | null> {
  return callRpc('next_imc_id');
}

export async function nextMotorId(): Promise<string | null> {
  return callRpc('next_motor_id');
}

export async function nextSportId(): Promise<string | null> {
  return callRpc('next_sport_id');
}

export async function nextVocationalId(): Promise<string | null> {
  return callRpc('next_vocational_id');
}

export async function nextReportId(): Promise<string | null> {
  return callRpc('next_report_id');
}

// Questionario (tabelas de configuracao e respostas)
export async function nextM3CenarioId(): Promise<string | null> {
  return callRpc('next_m3_cenario_id');
}

export async function nextM3ImpactoId(): Promise<string | null> {
  return callRpc('next_m3_impacto_id');
}

export async function nextM4ImcConfigId(): Promise<string | null> {
  return callRpc('next_m4_imc_config_id');
}

export async function nextM5CapacidadeId(): Promise<string | null> {
  return callRpc('next_m5_capacidade_id');
}

export async function nextM6DirecionamentoId(): Promise<string | null> {
  return callRpc('next_m6_direcionamento_id');
}

export async function nextM6DiretrizId(): Promise<string | null> {
  return callRpc('next_m6_diretriz_id');
}

export async function nextM7ParecerId(): Promise<string | null> {
  return callRpc('next_m7_parecer_id');
}

export async function nextM2ModalidadeId(): Promise<string | null> {
  return callRpc('next_m2_modalidade_id');
}

export async function nextAptidaoRefId(category: string): Promise<string | null> {
  return callRpc('next_aptidao_ref_id', { p_category: category });
}

export async function nextVocQuestionId(): Promise<string | null> {
  return callRpc('next_voc_question_id');
}

// Saude Global (KIDSCREEN-10) - Modulo 9
export async function nextM9HealthQuestionId(): Promise<string | null> {
  return callRpc('next_m9_health_question_id');
}

export async function nextHealthAssessmentId(): Promise<string | null> {
  return callRpc('next_health_assessment_id');
}

export async function nextM9ParecerId(): Promise<string | null> {
  return callRpc('next_m9_parecer_id');
}

// Higiene Bucal (HU-DBI) - Modulo 10
export async function nextM10OralQuestionId(): Promise<string | null> {
  return callRpc('next_m10_oral_question_id');
}

export async function nextOralAssessmentId(): Promise<string | null> {
  return callRpc('next_oral_assessment_id');
}

export async function nextM10ParecerId(): Promise<string | null> {
  return callRpc('next_m10_parecer_id');
}

// Autoconceito (Escala de Rosenberg) - Modulo 11
export async function nextM11AutoQuestionId(): Promise<string | null> {
  return callRpc('next_m11_auto_question_id');
}

export async function nextAutoconceptAssessmentId(): Promise<string | null> {
  return callRpc('next_autoconcept_assessment_id');
}

export async function nextM11ParecerId(): Promise<string | null> {
  return callRpc('next_m11_parecer_id');
}

// Indice Alimentar (IAS) - Modulo 12
export async function nextIasQuestionId(): Promise<string | null> {
  return callRpc('next_ias_question_id');
}

export async function nextIasAssessmentId(): Promise<string | null> {
  return callRpc('next_ias_assessment_id');
}

export async function nextM12ParecerId(): Promise<string | null> {
  return callRpc('next_m12_parecer_id');
}

// Rastreamento do TDAH (SNAP-IV) - Modulo 13
export async function nextM13SnapQuestionId(): Promise<string | null> {
  return callRpc('next_m13_snap_question_id');
}

export async function nextSnapAssessmentId(): Promise<string | null> {
  return callRpc('next_snap_assessment_id');
}

export async function nextM13ParecerId(): Promise<string | null> {
  return callRpc('next_m13_parecer_id');
}

// Rastreamento Precoce do TEA (AQ-10) - Modulo 14
export async function nextM14Aq10QuestionId(): Promise<string | null> {
  return callRpc('next_m14_aq10_question_id');
}

export async function nextAq10AssessmentId(): Promise<string | null> {
  return callRpc('next_aq10_assessment_id');
}

export async function nextM14ParecerId(): Promise<string | null> {
  return callRpc('next_m14_parecer_id');
}

// Avaliacao PCD (Qualidade Motora PCD) - Modulo 15
export async function nextM15GrupoId(): Promise<string | null> {
  return callRpc('next_m15_grupo_id');
}

export async function nextM15AdaptacaoId(): Promise<string | null> {
  return callRpc('next_m15_adaptacao_id');
}

export async function nextM15FaixaId(): Promise<string | null> {
  return callRpc('next_m15_faixa_id');
}

export async function nextM15ModalidadeId(): Promise<string | null> {
  return callRpc('next_m15_modalidade_id');
}

export async function nextM15FunilId(): Promise<string | null> {
  return callRpc('next_m15_funil_id');
}

export async function nextPcdAssessmentId(): Promise<string | null> {
  return callRpc('next_pcd_assessment_id');
}
