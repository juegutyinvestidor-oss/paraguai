export interface Student {
  id: string;
  name: string;
  avatarUrl?: string;
  birthDate?: string;
  gender?: string;
  rg?: string;
  cpf?: string;
  motherName?: string;
  fatherName?: string;
  phone?: string;
  email?: string;
  enrollmentId?: string;
  grade: string;
  locality?: string;
  contrato?: string;
  status?: string; // 'Ativo' | 'Inativo'
  estado?: string;
  regiao?: string;
  responsibleName?: string;
  responsibleCpf?: string;
  parentName?: string;
  password?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocHierarchical {
  name: string;
  grades: string[];
}

export interface RegHierarchical {
  name: string;
  localidades: LocHierarchical[];
}

export interface EstHierarchical {
  name: string;
  regioes: RegHierarchical[];
}

export interface ContratoItem {
  id: string;
  name: string;
  estado: string;
  regiao: string;
  localidade: string;
  grade?: string;
  status?: string;
  structure?: {
    estados: EstHierarchical[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PerformanceReport {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  focusArea: string;
  observations?: string;
  report: string;
  date: string;
  createdAt?: string;
  evaluationId?: string;
  evaluationResult?: string;
}

export interface ImcRecord {
  id: string;
  studentId: string;
  studentName: string;
  weight: number;
  height: number;
  imc: number;
  classification: string;
  classGroup: string;
  date: string;
}

export interface MotorRecord {
  id: string;
  studentId: string;
  studentName: string;
  impulsao: string; // was flexibility
  abdomen: string; // was coordination
  agility: string;
  strength: string;
  speed: string;
  generalClass: string;
  flexibility?: string;
  coordination?: string;
  date: string;
}

export interface SportRecord {
  id: string;
  studentId: string;
  studentName: string;
  biotype: string;
  mainSkill: string;
  suggestedSport: string;
  recommendedPractice: string;
  date: string;
}

export interface VocationalRecord {
  id: string;
  studentId: string;
  studentName: string;
  profile: string;
  interestArea: string;
  suggestedCareer: string;
  technicalOpinion: string;
  date: string;
  answers?: string[];
}

export interface HealthRecord {
  id: string;
  studentId: string;
  studentName: string;
  rawScore: number;
  tScore: number;
  classification: string;
  technicalOpinion: string;
  date: string;
  answers?: number[];
}

export interface OralRecord {
  id: string;
  studentId: string;
  studentName: string;
  score: number;
  classification: string;
  technicalOpinion: string;
  date: string;
  answers?: boolean[];
}

export interface AutoconceptRecord {
  id: string;
  studentId: string;
  studentName: string;
  score: number;
  classification: string;
  technicalOpinion: string;
  date: string;
  answers?: string[];
}

export interface IasRecord {
  id: string;
  studentId: string;
  studentName: string;
  totalScore: number;
  classification: string;
  technicalOpinion: string;
  date: string;
  answers?: number[];
}

export interface SnapRecord {
  id: string;
  studentId: string;
  studentName: string;
  inattentionScore: number;
  hyperactivityScore: number;
  classification: string;
  technicalOpinion: string;
  respondent?: string;
  date: string;
  answers?: number[];
}

export interface Aq10Record {
  id: string;
  studentId: string;
  studentName: string;
  version: 'crianca' | 'adolescente';
  totalScore: number;
  classification: string;
  technicalOpinion: string;
  respondent?: string;
  date: string;
  answers?: number[];
}

export interface PcdGroupConfig {
  id: string;
  grupo: number;
  nome: string;
  descricao: string;
  laudo: string;
}

export interface PcdAdaptacaoConfig {
  id: string;
  grupo: number;
  detalhe: string;
  teste: string;
  status: string;
  instrucao: string;
}

export interface PcdFaixaConfig {
  id: string;
  grupo: number;
  detalhe: string;
  teste: string;
  nota: number;
  minVal: number | null;
  maxVal: number | null;
}

export interface PcdModalidadeConfig {
  id: string;
  nome: string;
  pesoVelAgil: number;
  pesoForcaExp: number;
  pesoMembrosSup: number;
  pesoCore: number;
  descricao: string;
}

export interface PcdFunilConfig {
  id: string;
  grupo: number;
  momento: number;
  titulo: string;
  regra: string;
}

export interface PcdCompatibilidade {
  modalidade: string;
  iar: number;
  iarNormalizado?: number;
  maxIar?: number;
}

export interface PcdAdaptacaoAplicada {
  teste: string;
  status: string;
  instrucao: string;
}

export interface PcdFunilItem {
  momento: number;
  titulo: string;
  regra: string;
}

export interface PcdRecord {
  id: string;
  studentId: string;
  studentName: string;
  grupo: number;
  grupoNome: string;
  detalheClassificacao: string;
  abdominalS: number | null;
  velocidadeS: number | null;
  agilidadeS: number | null;
  saltoCm: number | null;
  flexaoRep: number | null;
  notaAbdominal: number;
  notaVelocidade: number;
  notaAgilidade: number;
  notaSalto: number;
  notaFlexao: number;
  notaVelAgil: number;
  notaForcaExplosiva: number;
  notaMembrosSup: number;
  notaCore: number;
  compatibilidade: PcdCompatibilidade[];
  direcionamento: string;
  classificacaoPerfil: string;
  funil?: PcdFunilItem[];
  adaptacoesAplicadas?: PcdAdaptacaoAplicada[];
  technicalOpinion: string;
  date: string;
}

export interface Modality {
  id: string;
  name: string;
  grade?: string;
  status?: string;
  category?: string;
  coach?: string;
  capacity?: number;
  enrolled?: number;
  enrolledStudentIds?: string[];
  professorId?: string;
  contrato?: string;
  estado?: string;
  regiao?: string;
  locality?: string;
  createdAt?: string;
}

export interface Professional {
  id: string;
  name: string;
  email?: string;
  role?: string;
  specialty?: string;
  avatarUrl?: string;
  status?: string;
  contrato?: string;
  cpf?: string;
  gender?: string;
  birthDate?: string;
  phone?: string;
  locality?: string;
  estado?: string;
  regiao?: string;
  grade?: string;
  password?: string;
  createdAt?: string;
}

export interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AttendanceEntry {
  id: string;
  grade: string;
  locality: string;
  date: string;
  studentId: string;
  present: boolean;
}

export interface LgpdRequest {
  id: string;
  requester_id: string;
  requester_email: string;
  requester_role: string;
  request_type: 'copia' | 'correcao' | 'exclusao' | 'portabilidade' | 'revogacao';
  notes: string | null;
  status: 'pendente' | 'resolvida' | 'recusada';
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string | null;
}

export interface PlanoAcaoFolder {
  id: string;
  name: string;
  created_by?: string | null;
  created_at?: string | null;
}

export interface PlanoAcaoFile {
  id: string;
  folder_id: string;
  name: string;
  path: string;
  size?: number | null;
  created_by?: string | null;
  created_at?: string | null;
  url?: string | null;
}
