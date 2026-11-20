'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import DashboardView from '../../components/DashboardView';
import AlunosView from '../../components/AlunosView';
import PresencaView from '../../components/PresencaView';
import ProfissionaisView from '../../components/ProfissionaisView';
import ModalidadesView from '../../components/ModalidadesView';
import PerformanceView from '../../components/PerformanceView';
import ComparativeStudyView from '../../components/ComparativeStudyView';
import QuestionarioView from '../../components/QuestionarioView';
import AvaliacoesView from '../../components/AvaliacoesView';
import PlanoAcaoView from '../../components/PlanoAcaoView';
import PerfilView from '../../components/PerfilView';
import ConfiguracoesView from '../../components/ConfiguracoesView';
import LoginView from '../../components/LoginView';
import ContratosView from '../../components/ContratosView';

import { type Student, type Modality, type Professional, type UserProfile, type ImcRecord, type MotorRecord, type SportRecord, type VocationalRecord, type HealthRecord, type OralRecord, type AutoconceptRecord, type IasRecord, type SnapRecord, type Aq10Record, type PcdRecord, type ContratoItem, type AttendanceEntry } from '../../types/edukyne';
import { isSupabaseConfigured, setPasswordSecure, getDecryptedCpf } from '../../lib/supabase';
import { getDb } from '../../lib/dbFacade';
import { apiWrite, profilePayloadFromUser, setSessionToken, getSessionToken } from '../../lib/sessionClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Check, Database, WifiOff, ShieldAlert } from 'lucide-react';
import { normalizeRole, TAB_PERMISSION_MAP, PERMISSION_LABEL_KEYS, type Permission, ROLE_PERMISSIONS, type UserRole, hasPermissionDynamic, canAccessTabDynamic } from '../../lib/rbac';

const INITIAL_STUDENTS: Student[] = [];

const INITIAL_MODALITIES: Modality[] = [];

const INITIAL_PROFESSIONALS: Professional[] = [];

const INITIAL_IMC: ImcRecord[] = [];

const INITIAL_MOTOR: MotorRecord[] = [];

const INITIAL_SPORT: SportRecord[] = [];

const INITIAL_VOCATIONAL: VocationalRecord[] = [];

const INITIAL_HEALTH: HealthRecord[] = [];

const INITIAL_ORAL: OralRecord[] = [];

const INITIAL_AUTOCONCEPT: AutoconceptRecord[] = [];

const INITIAL_IAS: IasRecord[] = [];

const INITIAL_SNAP: SnapRecord[] = [];

const INITIAL_AQ10: Aq10Record[] = [];

const INITIAL_PCD: PcdRecord[] = [];

const INITIAL_CONTRATOS: ContratoItem[] = [];

type UserState = UserProfile & {
  id?: string;
  contrato?: string;
  estado?: string;
  regiao?: string;
  locality?: string;
  grade?: string;
};

type StatusError = { key: string; values?: Record<string, string | number> };

function isInvalidApiKeyError(err: unknown): boolean {
  return String(err).includes('Invalid API key');
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;
    const msg = e.message ?? e.details ?? e.hint;
    if (typeof msg === 'string' && msg) return msg;
    return JSON.stringify(err);
  }
  return String(err);
}

interface StudentRow {
  id: string;
  name: string;
  email: string;
  enrollment_id: string;
  grade: string;
  status: string;
  cpf: string;
  gender: string;
  birth_date: string;
  phone: string;
  parent_name: string;
  locality: string;
  contrato: string;
  estado: string;
  regiao: string;
  avatar_url: string;
  created_at?: string | null;
}

interface ModalityRow {
  id: string;
  name: string;
  coach: string;
  enrolled: number;
  capacity: number;
  status: string;
  category: string;
  contrato: string;
  estado: string;
  regiao: string;
  locality: string;
  professor_id: string;
  enrolled_student_ids: string[];
}

interface ProfessionalRow {
  id: string;
  name: string;
  role: string;
  email: string;
  specialty: string;
  avatar_url: string;
  status: string;
  cpf: string;
  gender: string;
  birth_date: string;
  phone: string;
  locality: string;
  contrato: string;
  estado: string;
  regiao: string;
  grade: string;
}

interface ImcRow {
  id: string;
  student_id: string;
  student_name: string;
  weight: number;
  height: number;
  imc: number;
  classification: string;
  class_group: string;
  date: string;
}

interface MotorRow {
  id: string;
  student_id: string;
  student_name: string;
  impulsao: string;
  flexibility?: string;
  coordination?: string;
  abdomen?: string;
  agility: string;
  strength: string;
  speed: string;
  general_class: string;
  date: string;
}

interface SportRow {
  id: string;
  student_id: string;
  student_name: string;
  biotype: string;
  main_skill: string;
  suggested_sport: string;
  recommended_practice: string;
  date: string;
}

interface VocationalRow {
  id: string;
  student_id: string;
  student_name: string;
  profile: string;
  interest_area: string;
  suggested_career: string;
  technical_opinion: string;
  date: string;
}

interface HealthRow {
  id: string;
  student_id: string;
  student_name: string;
  raw_score: number;
  t_score: number;
  classification: string;
  technical_opinion: string;
  date: string;
  answers: number[] | null;
}

interface OralRow {
  id: string;
  student_id: string;
  student_name: string;
  score: number;
  classification: string;
  technical_opinion: string;
  date: string;
  answers: boolean[] | null;
}

interface AutoconceptRow {
  id: string;
  student_id: string;
  student_name: string;
  score: number;
  classification: string;
  technical_opinion: string;
  date: string;
  answers: string[] | null;
}

  interface IasRow {
  id: string;
  student_id: string;
  student_name: string;
  total_score: number;
  classification: string;
  technical_opinion: string;
  date: string;
  answers: number[] | null;
}

interface SnapRow {
  id: string;
  student_id: string;
  student_name: string;
  inattention_score: number;
  hyperactivity_score: number;
  classification: string;
  technical_opinion: string;
  respondent: string | null;
  date: string;
  answers: number[] | null;
}

interface Aq10Row {
  id: string;
  student_id: string;
  student_name: string;
  version: string;
  total_score: number;
  classification: string;
  technical_opinion: string;
  respondent: string | null;
  date: string;
  answers: number[] | null;
}

interface PcdRow {
  id: string;
  student_id: string;
  student_name: string;
  grupo: number;
  grupo_nome: string | null;
  detalhe_classificacao: string | null;
  abdominal_s: number | null;
  velocidade_s: number | null;
  agilidade_s: number | null;
  salto_cm: number | null;
  flexao_rep: number | null;
  nota_abdominal: number;
  nota_velocidade: number;
  nota_agilidade: number;
  nota_salto: number;
  nota_flexao: number;
  nota_vel_agil: number;
  nota_forca_explosiva: number;
  nota_membros_sup: number;
  nota_core: number;
  compatibilidade: { modalidade: string; iar: number; iarNormalizado?: number; maxIar?: number }[] | null;
  direcionamento: string | null;
  classificacao_perfil: string | null;
  funil: { momento: number; titulo: string; regra: string }[] | null;
  adaptacoes_aplicadas: { teste: string; status: string; instrucao: string }[] | null;
  technical_opinion: string | null;
  date: string;
}

export default function Page() {
  const t = useTranslations('appShell');
  const trbac = useTranslations('rbac');
  const strongRose = { strong: (chunks: React.ReactNode) => <strong className="text-rose-400">{chunks}</strong> };

  // Dynamic Role Permissions Configurable State
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, Permission[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('educore_rbac_permissions');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (_e) {
          // Ignore parse errors
        }
      }
    }
    return ROLE_PERMISSIONS;
  });

  // Navigation Tab Control
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Mobile drawer responsiveness state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Hydration safety mount check
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Authentication Session checks
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  // Bumped on login to re-run the Supabase data bootstrap (state is wiped on logout)
  const [dataBootstrapKey, setDataBootstrapKey] = useState(0);

  // Universal User State (Defaulting to restricted state until hydration)
  const [user, setUser] = useState<UserProfile & { id?: string }>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('educore_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return { ...parsed, id: 'loading' }; // keep loading status for safe initial hydration
        } catch (_e) {
          // ignore
        }
      }
    }
    return {
      id: 'loading',
      name: t('carregando'),
      role: 'Professor', // More restricted default
      email: '',
      avatarUrl: ''
    };
  });

  // Database States
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [modalities, setModalities] = useState<Modality[]>(INITIAL_MODALITIES);
  const [professionals, setProfessionals] = useState<Professional[]>(INITIAL_PROFESSIONALS);
  const [contratos, setContratos] = useState<ContratoItem[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('educore_contratos');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return INITIAL_CONTRATOS;
  });

  const updateContratosState = async (newContratosOrFn: ContratoItem[] | ((prev: ContratoItem[]) => ContratoItem[])) => {
    setContratos(prevContratos => {
      const nextContratos = typeof newContratosOrFn === 'function' ? newContratosOrFn(prevContratos) : newContratosOrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_contratos', JSON.stringify(nextContratos));
      }

      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => {
            syncContratosToSupabase(prevContratos, nextContratos, supabase);
          }, 0);
        }
      }

      return nextContratos;
    });
  };

  // Assessment Database States
  const [imcRecords, setImcRecords] = useState<ImcRecord[]>(INITIAL_IMC);
  const [motorRecords, setMotorRecords] = useState<MotorRecord[]>(INITIAL_MOTOR);
  const [sportRecords, setSportRecords] = useState<SportRecord[]>(INITIAL_SPORT);
  const [vocationalRecords, setVocationalRecords] = useState<VocationalRecord[]>(INITIAL_VOCATIONAL);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>(INITIAL_HEALTH);
  const [oralRecords, setOralRecords] = useState<OralRecord[]>(INITIAL_ORAL);
  const [autoconceptRecords, setAutoconceptRecords] = useState<AutoconceptRecord[]>(INITIAL_AUTOCONCEPT);
  const [iasRecords, setIasRecords] = useState<IasRecord[]>(INITIAL_IAS);
  const [snapRecords, setSnapRecords] = useState<SnapRecord[]>(INITIAL_SNAP);
  const [aq10Records, setAq10Records] = useState<Aq10Record[]>(INITIAL_AQ10);
  const [pcdRecords, setPcdRecords] = useState<PcdRecord[]>(INITIAL_PCD);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceEntry[]>([]);

  // RBAC Action Interception State
  const [actionDenied, setActionDenied] = useState<{ permission: string; role: string; msg: string } | null>(null);

  // Unified Central Permission Action Middleware checker
  const runWithPermission = async (permission: Permission, onApproved: () => void | Promise<void>) => {
    const normRole = normalizeRole(user.role ?? '');
    // Ensure all non-students can manage assessments (create, edit, delete)
    const isAssessmentsAction = ['create:avaliacoes', 'edit:avaliacoes', 'delete:avaliacoes'].includes(permission);
    const isAllowedCustom = isAssessmentsAction && normRole !== 'Aluno';

    if (isAllowedCustom || hasPermissionDynamic(rolePermissions, normRole, permission)) {
      await onApproved();
    } else {
      setActionDenied({
        permission,
        role: normRole,
        msg: trbac(PERMISSION_LABEL_KEYS[permission])
      });
    }
  };

  // Connection & Synchronization State
  const [dbStatus, setDbStatus] = useState({
    configured: isSupabaseConfigured,
    loading: isSupabaseConfigured,
    error: null as StatusError | null
  });

  // Load initial data from Supabase or LocalStorage fallback
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const hasSession = !!getSessionToken();
      const loggedIn = hasSession && localStorage.getItem('educore_logged_in') === 'true';
      setIsAuthenticated(loggedIn);
      if (!hasSession) {
        // Janela/aba fechada desde o ultimo login (sessionStorage limpo pelo navegador):
        // descarta o estado "logado" para forcar novo login nesta aba.
        localStorage.removeItem('educore_logged_in');
      }

      // Clean up/remove mock records from localStorage so they never load
      try {
        const studentIdsToDelete = ['s1', 's2', 's3', 's4', 's5', 's6'];
        const modIdsToDelete = ['m1', 'm2', 'm3', 'm4'];
        const profIdsToDelete = ['1', '2', '3'];
        const contratoIdsToDelete = ['Contrato 1', 'Contrato 2', 'Contrato 3'];
        const assessmentIdsToDelete = ['IMC-1', 'IMC-2', 'IMC-3', 'Motor-1', 'Motor-2', 'Motor-3', 'Esporte-1', 'Esporte-2', 'Vocal-1', 'Vocal-2'];

        const cleanAndSave = (key: string, filterFn: (item: { id?: string; studentId?: string }) => boolean) => {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                const filtered = parsed.filter(filterFn);
                localStorage.setItem(key, JSON.stringify(filtered));
              }
            } catch (e) {
              console.error(`Error cleaning ${key}:`, e);
            }
          }
        };

        cleanAndSave('educore_students', (s) => !!s && !!s.id && !studentIdsToDelete.includes(s.id));
        cleanAndSave('educore_modalities', (m) => !!m && !!m.id && !modIdsToDelete.includes(m.id));
        cleanAndSave('educore_professionals', (p) => !!p && !!p.id && !profIdsToDelete.includes(p.id));
        cleanAndSave('educore_contratos', (c) => !!c && !!c.id && !contratoIdsToDelete.includes(c.id));
        cleanAndSave('educore_avaliacoes_imc', (r) => !!r && !!r.id && !assessmentIdsToDelete.includes(r.id) && !!r.studentId && !studentIdsToDelete.includes(r.studentId));
        cleanAndSave('educore_avaliacoes_motor', (r) => !!r && !!r.id && !assessmentIdsToDelete.includes(r.id) && !!r.studentId && !studentIdsToDelete.includes(r.studentId));
        cleanAndSave('educore_avaliacoes_sport', (r) => !!r && !!r.id && !assessmentIdsToDelete.includes(r.id) && !!r.studentId && !studentIdsToDelete.includes(r.studentId));
        cleanAndSave('educore_avaliacoes_vocation', (r) => !!r && !!r.id && !assessmentIdsToDelete.includes(r.id) && !!r.studentId && !studentIdsToDelete.includes(r.studentId));
        cleanAndSave('educore_avaliacoes_health', (r) => !!r && !!r.id && !assessmentIdsToDelete.includes(r.id) && !!r.studentId && !studentIdsToDelete.includes(r.studentId));
        cleanAndSave('educore_avaliacoes_oral', (r) => !!r && !!r.id && !assessmentIdsToDelete.includes(r.id) && !!r.studentId && !studentIdsToDelete.includes(r.studentId));
        cleanAndSave('educore_avaliacoes_autoconcept', (r) => !!r && !!r.id && !assessmentIdsToDelete.includes(r.id) && !!r.studentId && !studentIdsToDelete.includes(r.studentId));
        cleanAndSave('educore_avaliacoes_ias', (r) => !!r && !!r.id && !assessmentIdsToDelete.includes(r.id) && !!r.studentId && !studentIdsToDelete.includes(r.studentId));
        cleanAndSave('educore_avaliacoes_snap', (r) => !!r && !!r.id && !assessmentIdsToDelete.includes(r.id) && !!r.studentId && !studentIdsToDelete.includes(r.studentId));
        cleanAndSave('educore_avaliacoes_aq10', (r) => !!r && !!r.id && !assessmentIdsToDelete.includes(r.id) && !!r.studentId && !studentIdsToDelete.includes(r.studentId));
        cleanAndSave('educore_avaliacoes_pcd', (r) => !!r && !!r.id && !assessmentIdsToDelete.includes(r.id) && !!r.studentId && !studentIdsToDelete.includes(r.studentId));
        cleanAndSave('educore_analise_frequencia', (r) => !!r && !!r.studentId && !studentIdsToDelete.includes(r.studentId));
      } catch (err) {
        console.error('Error in localStorage cleanup:', err);
      }
    }

    async function loadData() {
      // 0. Always restore user structure immediately on mount (Offline & Online)
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('educore_user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            // Search in local professionals storage
            const localProfsRaw = localStorage.getItem('educore_professionals');
            let localProfs: Professional[] = [];
            if (localProfsRaw) {
              try { localProfs = JSON.parse(localProfsRaw); } catch (_e) {}
            }
            const matchProf = localProfs.find(ip => ip.email?.toLowerCase() === parsedUser.email?.toLowerCase());

            // Fallback search in local students storage
            const localStdsRaw = localStorage.getItem('educore_students');
            let localStds: Student[] = [];
            if (localStdsRaw) {
              try { localStds = JSON.parse(localStdsRaw); } catch (_e) {}
            }
            const matchStudent = localStds.find(is => is.email?.toLowerCase() === parsedUser.email?.toLowerCase());

            if (matchProf) {
              parsedUser.grade = matchProf.grade || '';
              parsedUser.contrato = matchProf.contrato || '';
              parsedUser.estado = matchProf.estado || '';
              parsedUser.regiao = matchProf.regiao || '';
              parsedUser.locality = matchProf.locality || '';
              localStorage.setItem('educore_user', JSON.stringify(parsedUser));
            } else if (matchStudent) {
              parsedUser.grade = matchStudent.grade || '';
              parsedUser.contrato = matchStudent.contrato || '';
              parsedUser.estado = matchStudent.estado || '';
              parsedUser.regiao = matchStudent.regiao || '';
              parsedUser.locality = matchStudent.locality || '';
              localStorage.setItem('educore_user', JSON.stringify(parsedUser));
            }
            // Keep id: 'loading' for hydration signaling while setting other fields
            const tempUser = { ...parsedUser, id: 'loading' };
            setUser(tempUser);
          } catch (e) {
            console.error('Failed to parse educore_user from localStorage:', e);
          }
        }
      }

      // 1. Fallback Offline Load (if Supabase credentials are not configured yet)
      if (!isSupabaseConfigured) {
        if (typeof window !== 'undefined') {
          const storedStudents = localStorage.getItem('educore_students');
          if (storedStudents) {
            try { setStudents(JSON.parse(storedStudents)); } catch (e) { console.error(e); }
          } else {
            localStorage.setItem('educore_students', JSON.stringify(INITIAL_STUDENTS));
          }

          const storedModalities = localStorage.getItem('educore_modalities');
          if (storedModalities) {
            try { setModalities(JSON.parse(storedModalities)); } catch (e) { console.error(e); }
          } else {
            localStorage.setItem('educore_modalities', JSON.stringify(INITIAL_MODALITIES));
          }

          const storedProfessionals = localStorage.getItem('educore_professionals');
          if (storedProfessionals) {
            try { 
              const parsed = JSON.parse(storedProfessionals);
              const updated = parsed.map((p: Professional) => {
                const isInitial = INITIAL_PROFESSIONALS.find(ip => ip.id === p.id);
                if (isInitial) {
                  return {
                    ...p,
                    grade: isInitial.grade,
                    contrato: isInitial.contrato,
                    estado: isInitial.estado,
                    regiao: isInitial.regiao,
                    locality: isInitial.locality
                  };
                }
                return p;
              });
              setProfessionals(updated);
              localStorage.setItem('educore_professionals', JSON.stringify(updated));
            } catch (e) {
              console.error(e);
            }
          } else {
            localStorage.setItem('educore_professionals', JSON.stringify(INITIAL_PROFESSIONALS));
          }

          // Restore assessment states from localStorage
          const storedImc = localStorage.getItem('educore_avaliacoes_imc');
          if (storedImc) {
            try { setImcRecords(JSON.parse(storedImc)); } catch (e) { console.error(e); }
          } else {
            localStorage.setItem('educore_avaliacoes_imc', JSON.stringify(INITIAL_IMC));
          }
          const storedMotor = localStorage.getItem('educore_avaliacoes_motor');
          if (storedMotor) {
            try { setMotorRecords(JSON.parse(storedMotor)); } catch (e) { console.error(e); }
          } else {
            localStorage.setItem('educore_avaliacoes_motor', JSON.stringify(INITIAL_MOTOR));
          }
          const storedSport = localStorage.getItem('educore_avaliacoes_sport');
          if (storedSport) {
            try { setSportRecords(JSON.parse(storedSport)); } catch (e) { console.error(e); }
          } else {
            localStorage.setItem('educore_avaliacoes_sport', JSON.stringify(INITIAL_SPORT));
          }
          const storedVocational = localStorage.getItem('educore_avaliacoes_vocation');
          if (storedVocational) {
            try { setVocationalRecords(JSON.parse(storedVocational)); } catch (e) { console.error(e); }
          } else {
            localStorage.setItem('educore_avaliacoes_vocation', JSON.stringify(INITIAL_VOCATIONAL));
          }
          const storedHealth = localStorage.getItem('educore_avaliacoes_health');
          if (storedHealth) {
            try { setHealthRecords(JSON.parse(storedHealth)); } catch (e) { console.error(e); }
          } else {
            localStorage.setItem('educore_avaliacoes_health', JSON.stringify(INITIAL_HEALTH));
          }
          const storedOral = localStorage.getItem('educore_avaliacoes_oral');
          if (storedOral) {
            try { setOralRecords(JSON.parse(storedOral)); } catch (e) { console.error(e); }
          } else {
            localStorage.setItem('educore_avaliacoes_oral', JSON.stringify(INITIAL_ORAL));
          }
          const storedAuto = localStorage.getItem('educore_avaliacoes_autoconcept');
          if (storedAuto) {
            try { setAutoconceptRecords(JSON.parse(storedAuto)); } catch (e) { console.error(e); }
          } else {
            localStorage.setItem('educore_avaliacoes_autoconcept', JSON.stringify(INITIAL_AUTOCONCEPT));
          }
          const storedIas = localStorage.getItem('educore_avaliacoes_ias');
          if (storedIas) {
            try { setIasRecords(JSON.parse(storedIas)); } catch (e) { console.error(e); }
          } else {
            localStorage.setItem('educore_avaliacoes_ias', JSON.stringify(INITIAL_IAS));
          }
          const storedSnap = localStorage.getItem('educore_avaliacoes_snap');
          if (storedSnap) {
            try { setSnapRecords(JSON.parse(storedSnap)); } catch (e) { console.error(e); }
          } else {
            localStorage.setItem('educore_avaliacoes_snap', JSON.stringify(INITIAL_SNAP));
          }
          const storedAq10 = localStorage.getItem('educore_avaliacoes_aq10');
          if (storedAq10) {
            try { setAq10Records(JSON.parse(storedAq10)); } catch (e) { console.error(e); }
          } else {
            localStorage.setItem('educore_avaliacoes_aq10', JSON.stringify(INITIAL_AQ10));
          }
          const storedPcd = localStorage.getItem('educore_avaliacoes_pcd');
          if (storedPcd) {
            try { setPcdRecords(JSON.parse(storedPcd)); } catch (e) { console.error(e); }
          } else {
            localStorage.setItem('educore_avaliacoes_pcd', JSON.stringify(INITIAL_PCD));
          }
        }
        setDbStatus({ configured: false, loading: false, error: null });
        // Finalize hydration by restoring real user ID
        if (typeof window !== 'undefined') {
          const storedUser = localStorage.getItem('educore_user');
          if (storedUser) {
            try { setUser(JSON.parse(storedUser)); } catch (e) { console.error(e); }
          }
        }
        return;
      }

      // 2. Online live Supabase Load
      try {
        const supabase = getDb();
        if (!supabase) {
          setDbStatus({ configured: false, loading: false, error: { key: 'erroClienteSupabase' } });
          return;
        }

        // Load Custom User Profile safely if table is created
        try {
          const storedUserStr = typeof window !== 'undefined' ? localStorage.getItem('educore_user') : null;
          const currentUserId = storedUserStr ? JSON.parse(storedUserStr)?.id || '1' : '1';
          
          const { data: profDb, error: profDbErr } = await supabase
            .from('profiles')
            .select('id, name, role, email, avatar_url')
            .eq('id', currentUserId)
            .single();

          if (!profDbErr && profDb) {
            // Retrieve any connection restrictions from local state before we overwrite
            let resolvedContrato = '';
            let resolvedEstado = '';
            let resolvedRegiao = '';
            let resolvedLocality = '';
            let resolvedGrade = '';

            if (storedUserStr) {
              try {
                const parsedLocalUser = JSON.parse(storedUserStr);
                resolvedContrato = parsedLocalUser.contrato || '';
                resolvedEstado = parsedLocalUser.estado || '';
                resolvedRegiao = parsedLocalUser.regiao || '';
                resolvedLocality = parsedLocalUser.locality || '';
                resolvedGrade = parsedLocalUser.grade || '';
              } catch (e) {
                console.error(e);
              }
            }

            const mappedUserObj = {
              id: profDb.id,
              name: profDb.name,
              role: profDb.role,
              email: profDb.email,
              avatarUrl: profDb.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
              contrato: resolvedContrato,
              estado: resolvedEstado,
              regiao: resolvedRegiao,
              locality: resolvedLocality,
              grade: resolvedGrade
            };
            setUser(mappedUserObj);
            if (typeof window !== 'undefined') {
              localStorage.setItem('educore_user', JSON.stringify(mappedUserObj));
            }
          } else {
            // Self-healing: if the profile record is lost, missing or deleted in the table on database reset,
            // we immediately insert it back via the server route (anon key no longer writes profiles).
            const localUser = storedUserStr ? JSON.parse(storedUserStr) : user;
            if (localUser && localUser.id && localUser.id !== 'loading' && localUser.email) {
              const res = await apiWrite('/api/profile', profilePayloadFromUser(localUser));
              if (!res.ok) console.warn('Safe profile self-healing skipped:', res.error);
            }
          }
        } catch (pe) {
          console.error('Safe profile retrieval failed:', pe);
        }

        // Sync and Load RBAC permissions from Supabase
        try {
          const { data: rbacDb, error: rbacDbErr } = await supabase
            .from('rbac_permissions')
            .select('role, permissions');

          if (!rbacDbErr && rbacDb && rbacDb.length > 0) {
            const rbacMap = { ...ROLE_PERMISSIONS } as Record<UserRole, Permission[]>;
            rbacDb.forEach((row: { role: string; permissions: unknown }) => {
              if (row.role && Array.isArray(row.permissions)) {
                rbacMap[row.role as UserRole] = row.permissions as Permission[];
              }
            });
            setRolePermissions(rbacMap);
            if (typeof window !== 'undefined') {
              localStorage.setItem('educore_rbac_permissions', JSON.stringify(rbacMap));
            }
          } else {
            // Seeding / Self-healing via server route (anon key no longer writes rbac_permissions;
            // the server only applies it for valid Administrator sessions)
            const currentRbac = { ...ROLE_PERMISSIONS } as Record<UserRole, Permission[]>;
            const res = await apiWrite('/api/rbac', { action: 'seed', map: currentRbac });
            if (!res.ok) console.warn('RBAC seeding skipped:', res.error);
          }
        } catch (rbacErr) {
          console.error('Safe RBAC permissions sync failed:', rbacErr);
        }

        // Load Students (fall back if table doesn't exist yet but let user know)
        const { data: stdData, error: stdErr } = await supabase
          .from('students')
          .select('id, name, email, enrollment_id, grade, status, cpf, gender, birth_date, phone, parent_name, locality, contrato, estado, regiao, avatar_url, created_at');

        if (stdErr) throw stdErr;

        // Load Modalities
        const { data: modData, error: modErr } = await supabase
          .from('modalities')
          .select('id, name, coach, enrolled, capacity, status, category, contrato, estado, regiao, locality, professor_id, enrolled_student_ids');

        if (modErr) throw modErr;

        // Load Professionals
        const { data: profData, error: profErr } = await supabase
          .from('professionals')
          .select('id, name, role, email, specialty, avatar_url, status, cpf, gender, birth_date, phone, locality, contrato, estado, regiao, grade');

        if (profErr) throw profErr;

        // Load Contratos
        try {
          const { data: cData, error: cErr } = await supabase
            .from('contratos')
            .select('id, name, estado, regiao, localidade, grade, structure');
          if (!cErr && cData) {
            if (cData.length > 0) {
              const mappedContratos: ContratoItem[] = cData.map((c: ContratoItem) => ({
                id: c.id,
                name: c.name,
                estado: c.estado,
                regiao: c.regiao,
                localidade: c.localidade,
                grade: c.grade,
                structure: c.structure
              }));
              setContratos(mappedContratos);
              if (typeof window !== 'undefined') {
                localStorage.setItem('educore_contratos', JSON.stringify(mappedContratos));
              }
            } else {
              // Self-healing: if empty, seed with INITIAL_CONTRATOS
              const storedStr = typeof window !== 'undefined' ? localStorage.getItem('educore_contratos') : null;
              const currentContratos = storedStr ? JSON.parse(storedStr) : contratos;
              for (const c of currentContratos) {
                try {
                  const { error } = await supabase.from('contratos').upsert({
                    id: c.id,
                    name: c.name,
                    estado: c.estado,
                    regiao: c.regiao,
                    localidade: c.localidade,
                    grade: c.grade || '',
                    structure: c.structure || null
                  });
                  if (error && (
                    error.message?.includes('structure') || 
                    error.details?.includes('structure') || 
                    error.message?.includes('schema cache') ||
                    JSON.stringify(error).includes('structure')
                  )) {
                    console.warn('Supabase does not have structure column yet, seeding without it...');
                    await supabase.from('contratos').upsert({
                      id: c.id,
                      name: c.name,
                      estado: c.estado,
                      regiao: c.regiao,
                      localidade: c.localidade,
                      grade: c.grade || ''
                    });
                  } else if (error) {
                    throw error;
                  }
                } catch (e) {
                  console.warn('Seeding contrato failed:', e);
                }
              }
            }
          } else {
            console.warn('Contratos table empty or error loading:', cErr);
          }
        } catch (e) {
          console.warn('Contratos table load failed:', e);
        }

        // Load Assessments (safe individual tries in case migration is not applied yet)
        let loadedImc = false;
        try {
          const { data: imcData, error: imcErr } = await supabase.from('imc_assessments').select('id, student_id, student_name, weight, height, imc, classification, class_group, date');
          if (!imcErr && imcData) {
            const mappedImc: ImcRecord[] = imcData.map((x: ImcRow) => ({
              id: x.id,
              studentId: x.student_id,
              studentName: x.student_name,
              weight: Number(x.weight),
              height: Number(x.height),
              imc: Number(x.imc),
              classification: x.classification || '',
              classGroup: x.class_group,
              date: x.date
            }));
            setImcRecords(mappedImc);
            if (typeof window !== 'undefined') {
              localStorage.setItem('educore_avaliacoes_imc', JSON.stringify(mappedImc));
            }
            loadedImc = true;
          }
        } catch (e) {
          console.warn('IMC table load failed:', e);
        }

        if (!loadedImc && typeof window !== 'undefined') {
          const storedImc = localStorage.getItem('educore_avaliacoes_imc');
          if (storedImc) {
            try { setImcRecords(JSON.parse(storedImc)); } catch (e) { console.error(e); }
          }
        }

        let loadedMotor = false;
        try {
          const { data: motorData, error: motorErr } = await supabase.from('motor_assessments').select('id, student_id, student_name, impulsao, abdomen, agility, strength, speed, general_class, date');
          if (!motorErr && motorData) {
            const mappedMotor: MotorRecord[] = motorData.map((x: MotorRow) => ({
              id: x.id,
              studentId: x.student_id,
              studentName: x.student_name,
              impulsao: x.impulsao || x.flexibility || '',
              abdomen: x.abdomen || x.coordination || '',
              agility: x.agility,
              strength: x.strength,
              speed: x.speed || 'Excelente',
              generalClass: x.general_class,
              date: x.date
            }));
            setMotorRecords(mappedMotor);
            if (typeof window !== 'undefined') {
              localStorage.setItem('educore_avaliacoes_motor', JSON.stringify(mappedMotor));
            }
            loadedMotor = true;
          }
        } catch (e) {
          console.warn('Motor table load failed:', e);
        }

        if (!loadedMotor && typeof window !== 'undefined') {
          const storedMotor = localStorage.getItem('educore_avaliacoes_motor');
          if (storedMotor) {
            try { setMotorRecords(JSON.parse(storedMotor)); } catch (e) { console.error(e); }
          }
        }

        let loadedSport = false;
        try {
          const { data: sportData, error: sportErr } = await supabase.from('sport_assessments').select('id, student_id, student_name, biotype, main_skill, suggested_sport, recommended_practice, date');
          if (!sportErr && sportData) {
            const mappedSport: SportRecord[] = sportData.map((x: SportRow) => ({
              id: x.id,
              studentId: x.student_id,
              studentName: x.student_name,
              biotype: x.biotype,
              mainSkill: x.main_skill,
              suggestedSport: x.suggested_sport,
              recommendedPractice: x.recommended_practice,
              date: x.date
            }));
            setSportRecords(mappedSport);
            if (typeof window !== 'undefined') {
              localStorage.setItem('educore_avaliacoes_sport', JSON.stringify(mappedSport));
            }
            loadedSport = true;
          }
        } catch (e) {
          console.warn('Sport table load failed:', e);
        }

        if (!loadedSport && typeof window !== 'undefined') {
          const storedSport = localStorage.getItem('educore_avaliacoes_sport');
          if (storedSport) {
            try { setSportRecords(JSON.parse(storedSport)); } catch (e) { console.error(e); }
          }
        }

        let loadedVocational = false;
        try {
          const { data: vocationalData, error: vocationalErr } = await supabase.from('vocational_assessments').select('id, student_id, student_name, profile, interest_area, suggested_career, technical_opinion, date');
          if (!vocationalErr && vocationalData) {
            const mappedVocational: VocationalRecord[] = vocationalData.map((x: VocationalRow) => ({
              id: x.id,
              studentId: x.student_id,
              studentName: x.student_name,
              profile: x.profile,
              interestArea: x.interest_area,
              suggestedCareer: x.suggested_career,
              technicalOpinion: x.technical_opinion,
              date: x.date
            }));
            setVocationalRecords(mappedVocational);
            if (typeof window !== 'undefined') {
              localStorage.setItem('educore_avaliacoes_vocation', JSON.stringify(mappedVocational));
            }
            loadedVocational = true;
          }
        } catch (e) {
          console.warn('Vocational table load failed:', e);
        }

        if (!loadedVocational && typeof window !== 'undefined') {
          const storedVocational = localStorage.getItem('educore_avaliacoes_vocation');
          if (storedVocational) {
            try { setVocationalRecords(JSON.parse(storedVocational)); } catch (e) { console.error(e); }
          }
        }

        let loadedHealth = false;
        try {
          const { data: healthData, error: healthErr } = await supabase.from('health_assessments').select('id, student_id, student_name, raw_score, t_score, classification, technical_opinion, date, answers');
          if (!healthErr && healthData) {
            const mappedHealth: HealthRecord[] = healthData.map((x: HealthRow) => ({
              id: x.id,
              studentId: x.student_id,
              studentName: x.student_name,
              rawScore: x.raw_score,
              tScore: Number(x.t_score),
              classification: x.classification,
              technicalOpinion: x.technical_opinion,
              date: x.date,
              answers: Array.isArray(x.answers) ? x.answers : undefined
            }));
            setHealthRecords(mappedHealth);
            if (typeof window !== 'undefined') {
              localStorage.setItem('educore_avaliacoes_health', JSON.stringify(mappedHealth));
            }
            loadedHealth = true;
          }
        } catch (e) {
          console.warn('Health table load failed:', e);
        }

        if (!loadedHealth && typeof window !== 'undefined') {
          const storedHealth = localStorage.getItem('educore_avaliacoes_health');
          if (storedHealth) {
            try { setHealthRecords(JSON.parse(storedHealth)); } catch (e) { console.error(e); }
          }
        }

        let loadedOral = false;
        try {
          const { data: oralData, error: oralErr } = await supabase.from('oral_assessments').select('id, student_id, student_name, score, classification, technical_opinion, date, answers');
          if (!oralErr && oralData) {
            const mappedOral: OralRecord[] = oralData.map((x: OralRow) => ({
              id: x.id,
              studentId: x.student_id,
              studentName: x.student_name,
              score: x.score,
              classification: x.classification,
              technicalOpinion: x.technical_opinion,
              date: x.date,
              answers: Array.isArray(x.answers) ? x.answers : undefined
            }));
            setOralRecords(mappedOral);
            if (typeof window !== 'undefined') {
              localStorage.setItem('educore_avaliacoes_oral', JSON.stringify(mappedOral));
            }
            loadedOral = true;
          }
        } catch (e) {
          console.warn('Oral table load failed:', e);
        }

        if (!loadedOral && typeof window !== 'undefined') {
          const storedOral = localStorage.getItem('educore_avaliacoes_oral');
          if (storedOral) {
            try { setOralRecords(JSON.parse(storedOral)); } catch (e) { console.error(e); }
          }
        }

        let loadedAuto = false;
        try {
          const { data: autoData, error: autoErr } = await supabase.from('autoconcept_assessments').select('id, student_id, student_name, score, classification, technical_opinion, date, answers');
          if (!autoErr && autoData) {
            const mappedAuto: AutoconceptRecord[] = autoData.map((x: AutoconceptRow) => ({
              id: x.id,
              studentId: x.student_id,
              studentName: x.student_name,
              score: x.score,
              classification: x.classification,
              technicalOpinion: x.technical_opinion,
              date: x.date,
              answers: Array.isArray(x.answers) ? x.answers : undefined
            }));
            setAutoconceptRecords(mappedAuto);
            if (typeof window !== 'undefined') {
              localStorage.setItem('educore_avaliacoes_autoconcept', JSON.stringify(mappedAuto));
            }
            loadedAuto = true;
          }
        } catch (e) {
          console.warn('Autoconcept table load failed:', e);
        }

        if (!loadedAuto && typeof window !== 'undefined') {
          const storedAuto = localStorage.getItem('educore_avaliacoes_autoconcept');
          if (storedAuto) {
            try { setAutoconceptRecords(JSON.parse(storedAuto)); } catch (e) { console.error(e); }
          }
        }

        let loadedIas = false;
        try {
          const { data: iasData, error: iasErr } = await supabase.from('ias_assessments').select('id, student_id, student_name, total_score, classification, technical_opinion, date, answers');
          if (!iasErr && iasData) {
            const mappedIas: IasRecord[] = iasData.map((x: IasRow) => ({
              id: x.id,
              studentId: x.student_id,
              studentName: x.student_name,
              totalScore: x.total_score,
              classification: x.classification,
              technicalOpinion: x.technical_opinion,
              date: x.date,
              answers: Array.isArray(x.answers) ? x.answers : undefined
            }));
            setIasRecords(mappedIas);
            if (typeof window !== 'undefined') {
              localStorage.setItem('educore_avaliacoes_ias', JSON.stringify(mappedIas));
            }
            loadedIas = true;
          }
        } catch (e) {
          console.warn('IAS table load failed:', e);
        }

        if (!loadedIas && typeof window !== 'undefined') {
          const storedIas = localStorage.getItem('educore_avaliacoes_ias');
          if (storedIas) {
            try { setIasRecords(JSON.parse(storedIas)); } catch (e) { console.error(e); }
          }
        }

        let loadedSnap = false;
        try {
          const { data: snapData, error: snapErr } = await supabase.from('snap_assessments').select('id, student_id, student_name, inattention_score, hyperactivity_score, classification, technical_opinion, respondent, date, answers');
          if (!snapErr && snapData) {
            const mappedSnap: SnapRecord[] = snapData.map((x: SnapRow) => ({
              id: x.id,
              studentId: x.student_id,
              studentName: x.student_name,
              inattentionScore: x.inattention_score,
              hyperactivityScore: x.hyperactivity_score,
              classification: x.classification,
              technicalOpinion: x.technical_opinion,
              respondent: x.respondent ?? undefined,
              date: x.date,
              answers: Array.isArray(x.answers) ? x.answers : undefined
            }));
            setSnapRecords(mappedSnap);
            if (typeof window !== 'undefined') {
              localStorage.setItem('educore_avaliacoes_snap', JSON.stringify(mappedSnap));
            }
            loadedSnap = true;
          }
        } catch (e) {
          console.warn('SNAP table load failed:', e);
        }

        if (!loadedSnap && typeof window !== 'undefined') {
          const storedSnap = localStorage.getItem('educore_avaliacoes_snap');
          if (storedSnap) {
            try { setSnapRecords(JSON.parse(storedSnap)); } catch (e) { console.error(e); }
          }
        }

        let loadedAq10 = false;
        try {
          const { data: aq10Data, error: aq10Err } = await supabase.from('aq10_assessments').select('id, student_id, student_name, version, total_score, classification, technical_opinion, respondent, date, answers');
          if (!aq10Err && aq10Data) {
            const mappedAq10: Aq10Record[] = aq10Data.map((x: Aq10Row) => ({
              id: x.id,
              studentId: x.student_id,
              studentName: x.student_name,
              version: (x.version === 'adolescente' ? 'adolescente' : 'crianca') as 'crianca' | 'adolescente',
              totalScore: x.total_score,
              classification: x.classification,
              technicalOpinion: x.technical_opinion,
              respondent: x.respondent ?? undefined,
              date: x.date,
              answers: Array.isArray(x.answers) ? x.answers : undefined
            }));
            setAq10Records(mappedAq10);
            if (typeof window !== 'undefined') {
              localStorage.setItem('educore_avaliacoes_aq10', JSON.stringify(mappedAq10));
            }
            loadedAq10 = true;
          }
        } catch (e) {
          console.warn('AQ10 table load failed:', e);
        }

        if (!loadedAq10 && typeof window !== 'undefined') {
          const storedAq10 = localStorage.getItem('educore_avaliacoes_aq10');
          if (storedAq10) {
            try { setAq10Records(JSON.parse(storedAq10)); } catch (e) { console.error(e); }
          }
        }

        let loadedPcd = false;
        try {
          const { data: pcdData, error: pcdErr } = await supabase.from('pcd_assessments').select('id, student_id, student_name, grupo, grupo_nome, detalhe_classificacao, abdominal_s, velocidade_s, agilidade_s, salto_cm, flexao_rep, nota_abdominal, nota_velocidade, nota_agilidade, nota_salto, nota_flexao, nota_vel_agil, nota_forca_explosiva, nota_membros_sup, nota_core, compatibilidade, direcionamento, classificacao_perfil, funil, adaptacoes_aplicadas, technical_opinion, date');
          if (!pcdErr && pcdData) {
            const mappedPcd: PcdRecord[] = pcdData.map((x: PcdRow) => ({
              id: x.id,
              studentId: x.student_id,
              studentName: x.student_name,
              grupo: x.grupo,
              grupoNome: x.grupo_nome ?? '',
              detalheClassificacao: x.detalhe_classificacao ?? '',
              abdominalS: x.abdominal_s,
              velocidadeS: x.velocidade_s,
              agilidadeS: x.agilidade_s,
              saltoCm: x.salto_cm,
              flexaoRep: x.flexao_rep,
              notaAbdominal: x.nota_abdominal,
              notaVelocidade: x.nota_velocidade,
              notaAgilidade: x.nota_agilidade,
              notaSalto: x.nota_salto,
              notaFlexao: x.nota_flexao,
              notaVelAgil: x.nota_vel_agil,
              notaForcaExplosiva: x.nota_forca_explosiva,
              notaMembrosSup: x.nota_membros_sup,
              notaCore: x.nota_core,
              compatibilidade: Array.isArray(x.compatibilidade) ? x.compatibilidade : [],
              direcionamento: x.direcionamento ?? '',
              classificacaoPerfil: x.classificacao_perfil ?? '',
              funil: Array.isArray(x.funil) ? x.funil : [],
              adaptacoesAplicadas: Array.isArray(x.adaptacoes_aplicadas) ? x.adaptacoes_aplicadas : [],
              technicalOpinion: x.technical_opinion ?? '',
              date: x.date
            }));
            setPcdRecords(mappedPcd);
            if (typeof window !== 'undefined') {
              localStorage.setItem('educore_avaliacoes_pcd', JSON.stringify(mappedPcd));
            }
            loadedPcd = true;
          }
        } catch (e) {
          console.warn('PCD table load failed:', e);
        }

        if (!loadedPcd && typeof window !== 'undefined') {
          const storedPcd = localStorage.getItem('educore_avaliacoes_pcd');
          if (storedPcd) {
            try { setPcdRecords(JSON.parse(storedPcd)); } catch (e) { console.error(e); }
          }
        }

        // Load Attendance Records (fonte do grafico de Frequencia do Dashboard)
        try {
          const { data: attData, error: attErr } = await supabase.from('attendance_records').select('id, grade, locality, date, student_id, present');
          if (!attErr && attData) {
            setAttendanceRecords((attData as { id: string; grade: string; locality: string; date: string; student_id: string; present: boolean }[]).map(a => ({
              id: a.id,
              grade: a.grade,
              locality: a.locality,
              date: a.date,
              studentId: a.student_id,
              present: !!a.present
            })));
          }
        } catch (e) {
          console.warn('Attendance load failed:', e);
        }

        if (stdData && stdData.length > 0) {
          const mappedStudents: Student[] = stdData.map((s: StudentRow) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            enrollmentId: s.enrollment_id,
            grade: s.grade,
            status: s.status as 'Ativo' | 'Inativo',
            cpf: s.cpf || undefined,
            gender: s.gender || undefined,
            birthDate: s.birth_date || undefined,
            phone: s.phone || undefined,
            parentName: s.parent_name || undefined,
            locality: s.locality || undefined,
            contrato: s.contrato || undefined,
            estado: s.estado || undefined,
            regiao: s.regiao || undefined,
            avatarUrl: s.avatar_url || undefined,
            createdAt: s.created_at || undefined
          }));

          // LGPD: Recuperar CPF descriptografado via RPC (coluna texto esta vazia apos criptografia)
          await Promise.all(mappedStudents.map(async (st) => {
            const decrypted = await getDecryptedCpf('students', st.id);
            if (decrypted) st.cpf = decrypted;
          }));

          setStudents(mappedStudents);
          if (typeof window !== 'undefined') {
            localStorage.setItem('educore_students', JSON.stringify(mappedStudents));
          }
        }

        if (modData && modData.length > 0) {
          const mappedModalities: Modality[] = modData.map((m: ModalityRow) => ({
            id: m.id,
            name: m.name,
            coach: m.coach,
            enrolled: m.enrolled,
            capacity: m.capacity,
            status: m.status as 'Matrículas Abertas' | 'Turma Cheia' | 'Encerrado',
            category: m.category as 'Esporte' | 'Cultura' | 'Tecnologia',
            contrato: m.contrato || undefined,
            estado: m.estado || undefined,
            regiao: m.regiao || undefined,
            locality: m.locality || undefined,
            professorId: m.professor_id || undefined,
            enrolledStudentIds: Array.isArray(m.enrolled_student_ids) ? m.enrolled_student_ids : []
          }));
          setModalities(mappedModalities);
          if (typeof window !== 'undefined') {
            localStorage.setItem('educore_modalities', JSON.stringify(mappedModalities));
          }
        }

        if (profData && profData.length > 0) {
          const mappedProfessionals: Professional[] = profData.map((p: ProfessionalRow) => ({
            id: p.id,
            name: p.name,
            role: p.role,
            email: p.email,
            specialty: p.specialty,
            avatarUrl: p.avatar_url,
            status: p.status as 'Ativo' | 'Afastado',
            cpf: p.cpf || undefined,
            gender: p.gender || undefined,
            birthDate: p.birth_date || undefined,
            phone: p.phone || undefined,
            locality: p.locality || undefined,
            contrato: p.contrato || undefined,
            estado: p.estado || undefined,
            regiao: p.regiao || undefined,
            grade: p.grade || undefined
          }));

          // LGPD: Recuperar CPF descriptografado via RPC (coluna texto esta vazia apos criptografia)
          await Promise.all(mappedProfessionals.map(async (pf) => {
            const decrypted = await getDecryptedCpf('professionals', pf.id);
            if (decrypted) pf.cpf = decrypted;
          }));

          setProfessionals(mappedProfessionals);
          if (typeof window !== 'undefined') {
            localStorage.setItem('educore_professionals', JSON.stringify(mappedProfessionals));
          }
        }

        setDbStatus({ configured: true, loading: false, error: null });
        // Finalize hydration by restoring real user ID and syncing latest database connections
        if (typeof window !== 'undefined') {
          const storedUser = localStorage.getItem('educore_user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              const cleanEmail = parsedUser.email?.trim().toLowerCase();
              if (cleanEmail) {
                // Retrieve the latest connection values directly from mappedProfessionals/mappedStudents
                const matchProf = profData ? profData.find((p: ProfessionalRow) => p.email?.trim().toLowerCase() === cleanEmail) : null;
                const matchStudent = stdData ? stdData.find((s: StudentRow) => s.email?.trim().toLowerCase() === cleanEmail) : null;

                if (matchProf) {
                  parsedUser.grade = matchProf.grade || '';
                  parsedUser.contrato = matchProf.contrato || '';
                  parsedUser.estado = matchProf.estado || '';
                  parsedUser.regiao = matchProf.regiao || '';
                  parsedUser.locality = matchProf.locality || '';
                } else if (matchStudent) {
                  parsedUser.grade = matchStudent.grade || '';
                  parsedUser.contrato = matchStudent.contrato || '';
                  parsedUser.estado = matchStudent.estado || '';
                  parsedUser.regiao = matchStudent.regiao || '';
                  parsedUser.locality = matchStudent.locality || '';
                }
              }
              localStorage.setItem('educore_user', JSON.stringify(parsedUser));
              setUser(parsedUser);
            } catch (e) {
              console.error('Failed to sync connections for active session:', e);
            }
          }
        }
      } catch (err) {
        console.warn('Supabase offline ou tabelas não migradas. Operando em modo contingência local:', err);
        
        // Restore local state on error
        if (typeof window !== 'undefined') {
          const storedStudents = localStorage.getItem('educore_students');
          if (storedStudents) {
            try { setStudents(JSON.parse(storedStudents)); } catch (e) { console.error(e); }
          }
          const storedModalities = localStorage.getItem('educore_modalities');
          if (storedModalities) {
            try { setModalities(JSON.parse(storedModalities)); } catch (e) { console.error(e); }
          }
          const storedProfessionals = localStorage.getItem('educore_professionals');
          if (storedProfessionals) {
            try { setProfessionals(JSON.parse(storedProfessionals)); } catch (e) { console.error(e); }
          }
          const storedContratos = localStorage.getItem('educore_contratos');
          if (storedContratos) {
            try { setContratos(JSON.parse(storedContratos)); } catch (e) { console.error(e); }
          }

          // Restore assessment states on error
          const storedImc = localStorage.getItem('educore_avaliacoes_imc');
          if (storedImc) {
            try { setImcRecords(JSON.parse(storedImc)); } catch (e) { console.error(e); }
          }
          const storedMotor = localStorage.getItem('educore_avaliacoes_motor');
          if (storedMotor) {
            try { setMotorRecords(JSON.parse(storedMotor)); } catch (e) { console.error(e); }
          }
          const storedSport = localStorage.getItem('educore_avaliacoes_sport');
          if (storedSport) {
            try { setSportRecords(JSON.parse(storedSport)); } catch (e) { console.error(e); }
          }
          const storedVocational = localStorage.getItem('educore_avaliacoes_vocation');
          if (storedVocational) {
            try { setVocationalRecords(JSON.parse(storedVocational)); } catch (e) { console.error(e); }
          }
          const storedHealth = localStorage.getItem('educore_avaliacoes_health');
          if (storedHealth) {
            try { setHealthRecords(JSON.parse(storedHealth)); } catch (e) { console.error(e); }
          }
          const storedOral = localStorage.getItem('educore_avaliacoes_oral');
          if (storedOral) {
            try { setOralRecords(JSON.parse(storedOral)); } catch (e) { console.error(e); }
          }
          const storedAuto = localStorage.getItem('educore_avaliacoes_autoconcept');
          if (storedAuto) {
            try { setAutoconceptRecords(JSON.parse(storedAuto)); } catch (e) { console.error(e); }
          }
          const storedIas = localStorage.getItem('educore_avaliacoes_ias');
          if (storedIas) {
            try { setIasRecords(JSON.parse(storedIas)); } catch (e) { console.error(e); }
          }
          const storedSnap = localStorage.getItem('educore_avaliacoes_snap');
          if (storedSnap) {
            try { setSnapRecords(JSON.parse(storedSnap)); } catch (e) { console.error(e); }
          }
          const storedAq10 = localStorage.getItem('educore_avaliacoes_aq10');
          if (storedAq10) {
            try { setAq10Records(JSON.parse(storedAq10)); } catch (e) { console.error(e); }
          }

          // Finalize hydration by restoring real user ID and syncing latest database connections (fallback)
          const storedUser = localStorage.getItem('educore_user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              const cleanEmail = parsedUser.email?.trim().toLowerCase();
              if (cleanEmail) {
                const storedProfs = localStorage.getItem('educore_professionals');
                const storedStds = localStorage.getItem('educore_students');
                let localProfs: Professional[] = [];
                let localStds: Student[] = [];
                try { if (storedProfs) localProfs = JSON.parse(storedProfs); } catch (_e) {}
                try { if (storedStds) localStds = JSON.parse(storedStds); } catch (_e) {}

                const matchProf = localProfs.find((p) => p.email?.trim().toLowerCase() === cleanEmail);
                const matchStudent = localStds.find((s) => s.email?.trim().toLowerCase() === cleanEmail);

                if (matchProf) {
                  parsedUser.grade = matchProf.grade || '';
                  parsedUser.contrato = matchProf.contrato || '';
                  parsedUser.estado = matchProf.estado || '';
                  parsedUser.regiao = matchProf.regiao || '';
                  parsedUser.locality = matchProf.locality || '';
                } else if (matchStudent) {
                  parsedUser.grade = matchStudent.grade || '';
                  parsedUser.contrato = matchStudent.contrato || '';
                  parsedUser.estado = matchStudent.estado || '';
                  parsedUser.regiao = matchStudent.regiao || '';
                  parsedUser.locality = matchStudent.locality || '';
                }
              }
              localStorage.setItem('educore_user', JSON.stringify(parsedUser));
              setUser(parsedUser);
            } catch (e) {
              console.error('Failed to sync fallback connections:', e);
            }
          }
        }

        const errMsg = getErrorMessage(err);
        setDbStatus({ 
          configured: false, 
          loading: false, 
          error: { key: 'contingenciaAtiva', values: { erro: errMsg } } 
        });
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataBootstrapKey]);

  // Background sync helper for Contratos
  const syncContratosToSupabase = async (prevContratos: ContratoItem[], nextContratos: ContratoItem[], supabase: SupabaseClient) => {
    try {
      const idsBefore = prevContratos.map(c => c.id);
      const idsAfter = nextContratos.map(c => c.id);

      // 1. Handle Deletions: present in prev but absent in next
      const deletedIds = idsBefore.filter(id => !idsAfter.includes(id));
      for (const id of deletedIds) {
        const { error } = await supabase.from('contratos').delete().eq('id', id);
        if (error) throw error;
      }

      // 2. Handle Upserts: new additions or modified entries
      const toUpsert = nextContratos.filter(c => {
        const original = prevContratos.find(orig => orig.id === c.id);
        if (!original) return true;
        return (
          original.name !== c.name ||
          original.estado !== c.estado ||
          original.regiao !== c.regiao ||
          original.localidade !== c.localidade ||
          original.grade !== c.grade ||
          JSON.stringify(original.structure) !== JSON.stringify(c.structure)
        );
      });

      for (const c of toUpsert) {
        let { error } = await supabase.from('contratos').upsert({
          id: c.id,
          name: c.name,
          estado: c.estado,
          regiao: c.regiao,
          localidade: c.localidade,
          grade: c.grade || '',
          structure: c.structure || null
        });

        if (error && (
          error.message?.includes('structure') || 
          error.details?.includes('structure') || 
          error.message?.includes('schema cache') ||
          JSON.stringify(error).includes('structure')
        )) {
          console.warn('Supabase does not have structure column yet, retrying sync without it...');
          const { error: retryError } = await supabase.from('contratos').upsert({
            id: c.id,
            name: c.name,
            estado: c.estado,
            regiao: c.regiao,
            localidade: c.localidade,
            grade: c.grade || ''
          });
          error = retryError;
          if (!error) {
            setDbStatus(prev => ({
              ...prev,
              error: { key: 'tabelasDesatualizadasStructure' }
            }));
          }
        }

        if (error) throw error;
      }
    } catch (err) {
      const errMsg = getErrorMessage(err);
      console.error('Failed to sync contratos with Supabase:', errMsg);
      setDbStatus(prev => ({
        ...prev,
        error: { key: 'erroSyncContratos', values: { erro: errMsg } }
      }));
    }
  };

  // Remove os "espelhos" de profiles de alunos/profissionais excluidos
  // (a rota so apaga linhas SEM password_hash; contas nativas tipo Admin nunca sao tocadas)
  const purgeProfileMirrors = async (entries: { id: string; email: string }[]) => {
    if (entries.length === 0) return;
    try {
      const res = await apiWrite('/api/profile', { action: 'delete_mirrors', ids: entries.map(e => e.id), entries });
      if (!res.ok) console.warn('Falha ao limpar espelhos em profiles:', res.error);
    } catch (e) {
      console.warn('Falha ao limpar espelhos em profiles:', e);
    }
  };

  // Background sync helper for Students
  const syncStudentsToSupabase = async (prevStudents: Student[], nextStudents: Student[], supabase: SupabaseClient) => {
    try {
      const studentIdsBefore = prevStudents.map(s => s.id);
      const studentIdsAfter = nextStudents.map(s => s.id);

      // 1. Handle Deletions: present in prev but absent in next
      const deletedIds = studentIdsBefore.filter(id => !studentIdsAfter.includes(id));
      for (const id of deletedIds) {
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) throw error;
      }

      // 1b. Cascade: apaga avaliacoes, respostas, presenca e relatorios do aluno
      // excluido (o facade so aceita delete por 'id', entao buscamos os ids antes).
      if (deletedIds.length > 0) {
        const relatedTables = [
          'imc_assessments', 'motor_assessments', 'sport_assessments', 'vocational_assessments',
          'health_assessments', 'oral_assessments', 'autoconcept_assessments', 'ias_assessments', 'snap_assessments', 'aq10_assessments', 'pcd_assessments',
          'attendance_records', 'performance_reports'
        ];
        for (const table of relatedTables) {
          try {
            const { data: rows } = await supabase.from(table).select('id').in('student_id', deletedIds);
            const rowIds = (rows || []).map((r: { id: string }) => r.id).filter(Boolean);
            if (rowIds.length > 0) {
              const { error: delErr } = await supabase.from(table).delete().in('id', rowIds);
              if (delErr) console.error(`Falha ao limpar ${table} do aluno excluido:`, delErr.message);
            }
          } catch (err) {
            console.error(`Erro na cascata de ${table}:`, err);
          }
        }
        await purgeProfileMirrors(
          prevStudents.filter(s => deletedIds.includes(s.id)).map(s => ({ id: s.id, email: s.email || '' }))
        );
      }

      // 2. Handle Upserts: new additions or modified entries
      const toUpsert = nextStudents.filter(s => {
        const original = prevStudents.find(orig => orig.id === s.id);
        if (!original) return true;
        return (
          original.status !== s.status ||
          original.name !== s.name ||
          original.email !== s.email ||
          original.grade !== s.grade ||
          original.enrollmentId !== s.enrollmentId ||
          original.cpf !== s.cpf ||
          original.gender !== s.gender ||
          original.birthDate !== s.birthDate ||
          original.phone !== s.phone ||
          original.parentName !== s.parentName ||
          original.locality !== s.locality ||
          original.contrato !== s.contrato ||
          original.estado !== s.estado ||
          original.regiao !== s.regiao ||
          original.password !== s.password ||
          original.avatarUrl !== s.avatarUrl
        );
      });

      for (const s of toUpsert) {
        const { error } = await supabase.from('students').upsert({
          id: s.id,
          name: s.name,
          email: s.email,
          enrollment_id: s.enrollmentId,
          grade: s.grade,
          status: s.status,
          cpf: s.cpf || null,
          gender: s.gender || null,
          birth_date: s.birthDate || null,
          phone: s.phone || null,
          parent_name: s.parentName || null,
          locality: s.locality || null,
          contrato: s.contrato || null,
          estado: s.estado || null,
          regiao: s.regiao || null,
          avatar_url: s.avatarUrl || null
        });
        if (error) throw error;
        // LGPD: Persistir senha via RPC isolado (nunca armazenar no objeto)
        if (s.password) {
          await setPasswordSecure((s.email || '').toLowerCase(), s.password);
        }
      }
      
      // Clear sync error if successful
      setDbStatus(prev => ({ ...prev, error: null }));
    } catch (e) {
      if (isInvalidApiKeyError(e)) return;
      console.error('Supabase Sync Student Error:', e);
      const errMsg = getErrorMessage(e);
      setDbStatus(prev => ({
        ...prev,
        error: { key: 'erroSyncAlunos', values: { erro: errMsg } }
      }));
    }
  };

  // Dual-Persisted Student State Update Handler
  const updateStudentsState = async (newStudentsOrFn: Student[] | ((prev: Student[]) => Student[])) => {
    setStudents(prevStudents => {
      const nextStudents = typeof newStudentsOrFn === 'function' ? newStudentsOrFn(prevStudents) : newStudentsOrFn;

      // Hard save to browser localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_students', JSON.stringify(nextStudents));

        // Cascade: limpa do localStorage os dados dos alunos removidos
        const nextIdSet = new Set(nextStudents.map(s => s.id));
        const removedIds = prevStudents.map(s => s.id).filter(id => !nextIdSet.has(id));
        if (removedIds.length > 0) {
          const removed = new Set(removedIds);
          const dropByStudent = (key: string) => {
            try {
              const raw = localStorage.getItem(key);
              if (!raw) return;
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                localStorage.setItem(key, JSON.stringify(list.filter((r: { studentId?: string }) => !r?.studentId || !removed.has(r.studentId))));
              }
            } catch { /* ignore */ }
          };
          ['educore_avaliacoes_imc', 'educore_avaliacoes_motor', 'educore_avaliacoes_sport', 'educore_avaliacoes_vocation',
            'educore_avaliacoes_health', 'educore_avaliacoes_oral', 'educore_avaliacoes_autoconcept', 'educore_avaliacoes_ias', 'educore_avaliacoes_snap',
            'educore_analise_frequencia'].forEach(dropByStudent);
          removedIds.forEach(id => localStorage.removeItem(`educore_perf_reports_${id}`));
        }
      }

      // Sync to Supabase asynchronously outside the React render path
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => {
            syncStudentsToSupabase(prevStudents, nextStudents, supabase);
          }, 0);
        }
      }

      return nextStudents;
    });
  };

  // Background sync helper for Modalities
  const syncModalitiesToSupabase = async (prevModalities: Modality[], nextModalities: Modality[], supabase: SupabaseClient) => {
    try {
      const modIdsBefore = prevModalities.map(m => m.id);
      const modIdsAfter = nextModalities.map(m => m.id);

      // 1. Handle Deletions
      const deletedIds = modIdsBefore.filter(id => !modIdsAfter.includes(id));
      for (const id of deletedIds) {
        const { error } = await supabase.from('modalities').delete().eq('id', id);
        if (error) throw error;
      }

      // 2. Handle Upserts
      const toUpsert = nextModalities.filter(m => {
        const original = prevModalities.find(orig => orig.id === m.id);
        if (!original) return true;
        return (
          original.capacity !== m.capacity ||
          original.enrolled !== m.enrolled ||
          original.status !== m.status ||
          original.name !== m.name ||
          original.coach !== m.coach ||
          original.category !== m.category ||
          original.contrato !== m.contrato ||
          original.estado !== m.estado ||
          original.regiao !== m.regiao ||
          original.locality !== m.locality ||
          original.professorId !== m.professorId ||
          JSON.stringify(original.enrolledStudentIds || []) !== JSON.stringify(m.enrolledStudentIds || [])
        );
      });

      for (const m of toUpsert) {
        const { error } = await supabase.from('modalities').upsert({
          id: m.id,
          name: m.name,
          coach: m.coach,
          enrolled: m.enrolled,
          capacity: m.capacity,
          status: m.status,
          category: m.category,
          contrato: m.contrato || null,
          estado: m.estado || null,
          regiao: m.regiao || null,
          locality: m.locality || null,
          professor_id: m.professorId || null,
          enrolled_student_ids: m.enrolledStudentIds || []
        });
        if (error) throw error;
      }

      // Clear sync error if successful
      setDbStatus(prev => ({ ...prev, error: null }));
    } catch (e) {
      if (isInvalidApiKeyError(e)) return;
      console.error('Supabase Sync Modalities Error:', e);
      const errMsg = getErrorMessage(e);
      setDbStatus(prev => ({
        ...prev,
        error: { key: 'erroSyncModalidades', values: { erro: errMsg } }
      }));
    }
  };

  // Dual-Persisted Modalities State Update Handler
  const updateModalitiesState = async (newModalitiesOrFn: Modality[] | ((prev: Modality[]) => Modality[])) => {
    setModalities(prevModalities => {
      const nextModalities = typeof newModalitiesOrFn === 'function' ? newModalitiesOrFn(prevModalities) : newModalitiesOrFn;

      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_modalities', JSON.stringify(nextModalities));
      }

      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => {
            syncModalitiesToSupabase(prevModalities, nextModalities, supabase);
          }, 0);
        }
      }

      return nextModalities;
    });
  };

  // Background sync helper for User Profiles (server-route guarded by session token)
  const syncProfileToSupabase = async (nextUser: UserProfile & { id?: string }) => {
    try {
      if (!nextUser.id || nextUser.id === 'loading' || !nextUser.email) return;
      const res = await apiWrite('/api/profile', profilePayloadFromUser(nextUser));
      if (!res.ok) console.error('Profile Sync Error:', res.error);
    } catch (e) {
      if (!isInvalidApiKeyError(e)) {
        console.error('Profile Sync Error:', e instanceof Error ? e.message : e);
      }
    }
  };

  // Dual-Persisted User State Update Handler
  const updateUserState = (newUserOrFn: UserState | ((prev: UserState) => UserState)) => {
    setUser(prevUser => {
      const nextUser = typeof newUserOrFn === 'function' ? newUserOrFn(prevUser) : newUserOrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_user', JSON.stringify(nextUser));
      }

      if (isSupabaseConfigured) {
        setTimeout(() => {
          syncProfileToSupabase(nextUser);
        }, 0);
      }

      return nextUser;
    });
  };

  // Background sync helper for Professionals
  const syncProfessionalsToSupabase = async (prevProfessionals: Professional[], nextProfessionals: Professional[], supabase: SupabaseClient) => {
    try {
      const profIdsBefore = prevProfessionals.map(p => p.id);
      const profIdsAfter = nextProfessionals.map(p => p.id);

      // 1. Handle Deletions
      const deletedIds = profIdsBefore.filter(id => !profIdsAfter.includes(id));
      for (const id of deletedIds) {
        const { error } = await supabase.from('professionals').delete().eq('id', id);
        if (error) throw error;
      }
      await purgeProfileMirrors(
        prevProfessionals.filter(p => deletedIds.includes(p.id)).map(p => ({ id: p.id, email: p.email || '' }))
      );

      // 2. Handle Upserts
      const toUpsert = nextProfessionals.filter(p => {
        const original = prevProfessionals.find(orig => orig.id === p.id);
        if (!original) return true;
        return (
          original.status !== p.status ||
          original.name !== p.name ||
          original.role !== p.role ||
          original.email !== p.email ||
          original.specialty !== p.specialty ||
          original.avatarUrl !== p.avatarUrl ||
          original.cpf !== p.cpf ||
          original.gender !== p.gender ||
          original.birthDate !== p.birthDate ||
          original.phone !== p.phone ||
          original.locality !== p.locality ||
          original.contrato !== p.contrato ||
          original.estado !== p.estado ||
          original.regiao !== p.regiao ||
          original.grade !== p.grade ||
          original.password !== p.password
        );
      });

      for (const p of toUpsert) {
        let { error } = await supabase.from('professionals').upsert({
          id: p.id,
          name: p.name,
          role: p.role,
          email: p.email,
          specialty: p.specialty,
          avatar_url: p.avatarUrl,
          status: p.status,
          cpf: p.cpf || null,
          gender: p.gender || null,
          birth_date: p.birthDate || null,
          phone: p.phone || null,
          locality: p.locality || null,
          contrato: p.contrato || null,
          estado: p.estado || null,
          regiao: p.regiao || null,
          grade: p.grade || null
        });

        if (error && (
          error.message?.includes('grade') || 
          error.details?.includes('grade') || 
          error.message?.includes('schema cache') ||
          JSON.stringify(error).includes('grade')
        )) {
          console.warn('Supabase does not have grade column on professionals yet, retrying sync without it...');
          const { error: retryError } = await supabase.from('professionals').upsert({
            id: p.id,
            name: p.name,
            role: p.role,
            email: p.email,
            specialty: p.specialty,
            avatar_url: p.avatarUrl,
            status: p.status,
            cpf: p.cpf || null,
            gender: p.gender || null,
            birth_date: p.birthDate || null,
            phone: p.phone || null,
            locality: p.locality || null,
            contrato: p.contrato || null,
            estado: p.estado || null,
            regiao: p.regiao || null
          });
          error = retryError;
          if (!error) {
            setDbStatus(prev => ({
              ...prev,
              error: { key: 'tabelasDesatualizadasGrade' }
            }));
          }
        }

        if (error) throw error;

        // LGPD: Persistir senha via RPC isolado (nunca armazenar no objeto)
        if (p.password) {
          await setPasswordSecure((p.email || '').toLowerCase(), p.password);
        }
      }

      // Clear sync error if successful
      setDbStatus(prev => ({ ...prev, error: null }));
    } catch (e) {
      if (isInvalidApiKeyError(e)) return;
      console.error('Supabase Sync Professionals Error:', e);
      const errMsg = getErrorMessage(e);
      setDbStatus(prev => ({
        ...prev,
        error: { key: 'erroSyncProfissionais', values: { erro: errMsg } }
      }));
    }
  };

  // Dual-Persisted Professionals State Update Handler
  const updateProfessionalsState = async (newProfessionalsOrFn: Professional[] | ((prev: Professional[]) => Professional[])) => {
    setProfessionals(prevProfessionals => {
      const nextProfessionals = typeof newProfessionalsOrFn === 'function' ? newProfessionalsOrFn(prevProfessionals) : newProfessionalsOrFn;

      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_professionals', JSON.stringify(nextProfessionals));
      }

      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => {
            syncProfessionalsToSupabase(prevProfessionals, nextProfessionals, supabase);
          }, 0);
        }
      }

      return nextProfessionals;
    });
  };

  // Background Sync for IMC
  const syncImcToSupabase = async (prev: ImcRecord[], next: ImcRecord[], supabase: SupabaseClient) => {
    try {
      const idsBefore = prev.map(x => x.id);
      const idsAfter = next.map(x => x.id);

      // Handle deletions
      const deletedIds = idsBefore.filter(id => !idsAfter.includes(id));
      for (const id of deletedIds) {
        await supabase.from('imc_assessments').delete().eq('id', id);
      }

      // Handle upserts
      const toUpsert = next.filter(s => {
        const original = prev.find(orig => orig.id === s.id);
        if (!original) return true;
        return (
          original.studentId !== s.studentId ||
          original.studentName !== s.studentName ||
          original.weight !== s.weight ||
          original.height !== s.height ||
          original.imc !== s.imc ||
          original.classification !== s.classification ||
          original.classGroup !== s.classGroup ||
          original.date !== s.date
        );
      });

      for (const s of toUpsert) {
        await supabase.from('imc_assessments').upsert({
          id: s.id,
          student_id: s.studentId,
          student_name: s.studentName,
          weight: s.weight,
          height: s.height,
          imc: s.imc,
          classification: s.classification || '',
          class_group: s.classGroup,
          date: s.date
        });
      }
      setDbStatus(prevDb => ({ ...prevDb, error: null }));
    } catch (e) {
      if (isInvalidApiKeyError(e)) return;
      console.error('Erro de sincronização IMC:', e);
    }
  };

  const updateImcState = async (newImcOrFn: ImcRecord[] | ((prev: ImcRecord[]) => ImcRecord[])) => {
    setImcRecords(prev => {
      const next = typeof newImcOrFn === 'function' ? newImcOrFn(prev) : newImcOrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_avaliacoes_imc', JSON.stringify(next));
      }
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => syncImcToSupabase(prev, next, supabase), 0);
        }
      }
      return next;
    });
  };

  // Background Sync for Motor Quality
  const syncMotorToSupabase = async (prev: MotorRecord[], next: MotorRecord[], supabase: SupabaseClient) => {
    try {
      const idsBefore = prev.map(x => x.id);
      const idsAfter = next.map(x => x.id);

      const deletedIds = idsBefore.filter(id => !idsAfter.includes(id));
      for (const id of deletedIds) {
        await supabase.from('motor_assessments').delete().eq('id', id);
      }

      const toUpsert = next.filter(s => {
        const original = prev.find(orig => orig.id === s.id);
        if (!original) return true;
        return (
          original.studentId !== s.studentId ||
          original.studentName !== s.studentName ||
          original.impulsao !== s.impulsao ||
          original.abdomen !== s.abdomen ||
          original.agility !== s.agility ||
          original.strength !== s.strength ||
          original.speed !== s.speed ||
          original.generalClass !== s.generalClass ||
          original.date !== s.date
        );
      });

      for (const s of toUpsert) {
        await supabase.from('motor_assessments').upsert({
          id: s.id,
          student_id: s.studentId,
          student_name: s.studentName,
          impulsao: s.impulsao,
          abdomen: s.abdomen,
          agility: s.agility,
          strength: s.strength,
          speed: s.speed || 'Excelente',
          general_class: s.generalClass,
          date: s.date
        });
      }
      setDbStatus(prevDb => ({ ...prevDb, error: null }));
    } catch (e) {
      if (isInvalidApiKeyError(e)) return;
      console.error('Erro de sincronização Motor:', e);
    }
  };

  const updateMotorState = async (newMotorOrFn: MotorRecord[] | ((prev: MotorRecord[]) => MotorRecord[])) => {
    setMotorRecords(prev => {
      const next = typeof newMotorOrFn === 'function' ? newMotorOrFn(prev) : newMotorOrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_avaliacoes_motor', JSON.stringify(next));
      }
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => syncMotorToSupabase(prev, next, supabase), 0);
        }
      }
      return next;
    });
  };

  // Background Sync for Sport Indicated
  const syncSportToSupabase = async (prev: SportRecord[], next: SportRecord[], supabase: SupabaseClient) => {
    try {
      const idsBefore = prev.map(x => x.id);
      const idsAfter = next.map(x => x.id);

      const deletedIds = idsBefore.filter(id => !idsAfter.includes(id));
      for (const id of deletedIds) {
        await supabase.from('sport_assessments').delete().eq('id', id);
      }

      const toUpsert = next.filter(s => {
        const original = prev.find(orig => orig.id === s.id);
        if (!original) return true;
        return (
          original.studentId !== s.studentId ||
          original.studentName !== s.studentName ||
          original.biotype !== s.biotype ||
          original.mainSkill !== s.mainSkill ||
          original.suggestedSport !== s.suggestedSport ||
          original.recommendedPractice !== s.recommendedPractice ||
          original.date !== s.date
        );
      });

      for (const s of toUpsert) {
        await supabase.from('sport_assessments').upsert({
          id: s.id,
          student_id: s.studentId,
          student_name: s.studentName,
          biotype: s.biotype,
          main_skill: s.mainSkill,
          suggested_sport: s.suggestedSport,
          recommended_practice: s.recommendedPractice,
          date: s.date
        });
      }
      setDbStatus(prevDb => ({ ...prevDb, error: null }));
    } catch (e) {
      if (isInvalidApiKeyError(e)) return;
      console.error('Erro de sincronização Esporte:', e);
    }
  };

  const updateSportState = async (newSportOrFn: SportRecord[] | ((prev: SportRecord[]) => SportRecord[])) => {
    setSportRecords(prev => {
      const next = typeof newSportOrFn === 'function' ? newSportOrFn(prev) : newSportOrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_avaliacoes_sport', JSON.stringify(next));
      }
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => syncSportToSupabase(prev, next, supabase), 0);
        }
      }
      return next;
    });
  };

  // Background Sync for Vocational Assessments
  const syncVocationalToSupabase = async (prev: VocationalRecord[], next: VocationalRecord[], supabase: SupabaseClient) => {
    try {
      const idsBefore = prev.map(x => x.id);
      const idsAfter = next.map(x => x.id);

      const deletedIds = idsBefore.filter(id => !idsAfter.includes(id));
      for (const id of deletedIds) {
        await supabase.from('vocational_assessments').delete().eq('id', id);
      }

      const toUpsert = next.filter(s => {
        const original = prev.find(orig => orig.id === s.id);
        if (!original) return true;
        return (
          original.studentId !== s.studentId ||
          original.studentName !== s.studentName ||
          original.profile !== s.profile ||
          original.interestArea !== s.interestArea ||
          original.suggestedCareer !== s.suggestedCareer ||
          original.technicalOpinion !== s.technicalOpinion ||
          original.date !== s.date
        );
      });

      for (const s of toUpsert) {
        await supabase.from('vocational_assessments').upsert({
          id: s.id,
          student_id: s.studentId,
          student_name: s.studentName,
          profile: s.profile,
          interest_area: s.interestArea,
          suggested_career: s.suggestedCareer,
          technical_opinion: s.technicalOpinion,
          date: s.date
        });
      }
      setDbStatus(prevDb => ({ ...prevDb, error: null }));
    } catch (e) {
      if (isInvalidApiKeyError(e)) return;
      console.error('Erro de sincronização Vocacional:', e);
    }
  };

  const updateVocationalState = async (newVocationalOrFn: VocationalRecord[] | ((prev: VocationalRecord[]) => VocationalRecord[])) => {
    setVocationalRecords(prev => {
      const next = typeof newVocationalOrFn === 'function' ? newVocationalOrFn(prev) : newVocationalOrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_avaliacoes_vocation', JSON.stringify(next));
      }
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => syncVocationalToSupabase(prev, next, supabase), 0);
        }
      }
      return next;
    });
  };


  // Background Sync for Saude Global Assessments (KIDSCREEN-10)
  const syncHealthToSupabase = async (prev: HealthRecord[], next: HealthRecord[], supabase: SupabaseClient) => {
    try {
      const idsBefore = prev.map(x => x.id);
      const idsAfter = next.map(x => x.id);

      const deletedIds = idsBefore.filter(id => !idsAfter.includes(id));
      for (const id of deletedIds) {
        await supabase.from('health_assessments').delete().eq('id', id);
      }

      const toUpsert = next.filter(s => {
        const original = prev.find(orig => orig.id === s.id);
        if (!original) return true;
        return (
          original.studentId !== s.studentId ||
          original.studentName !== s.studentName ||
          original.rawScore !== s.rawScore ||
          original.tScore !== s.tScore ||
          original.classification !== s.classification ||
          original.technicalOpinion !== s.technicalOpinion ||
          original.date !== s.date
        );
      });

      for (const s of toUpsert) {
        await supabase.from('health_assessments').upsert({
          id: s.id,
          student_id: s.studentId,
          student_name: s.studentName,
          raw_score: s.rawScore,
          t_score: s.tScore,
          classification: s.classification,
          technical_opinion: s.technicalOpinion,
          date: s.date,
          answers: s.answers ?? null
        });
      }
      setDbStatus(prevDb => ({ ...prevDb, error: null }));
    } catch (e) {
      if (isInvalidApiKeyError(e)) return;
      console.error('Erro de sincronização Saúde Global:', e);
    }
  };

  const updateHealthState = async (newHealthOrFn: HealthRecord[] | ((prev: HealthRecord[]) => HealthRecord[])) => {
    setHealthRecords(prev => {
      const next = typeof newHealthOrFn === 'function' ? newHealthOrFn(prev) : newHealthOrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_avaliacoes_health', JSON.stringify(next));
      }
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => syncHealthToSupabase(prev, next, supabase), 0);
        }
      }
      return next;
    });
  };


  // Background Sync for Higiene Bucal Assessments (HU-DBI)
  const syncOralToSupabase = async (prev: OralRecord[], next: OralRecord[], supabase: SupabaseClient) => {
    try {
      const idsBefore = prev.map(x => x.id);
      const idsAfter = next.map(x => x.id);

      const deletedIds = idsBefore.filter(id => !idsAfter.includes(id));
      for (const id of deletedIds) {
        await supabase.from('oral_assessments').delete().eq('id', id);
      }

      const toUpsert = next.filter(s => {
        const original = prev.find(orig => orig.id === s.id);
        if (!original) return true;
        return (
          original.studentId !== s.studentId ||
          original.studentName !== s.studentName ||
          original.score !== s.score ||
          original.classification !== s.classification ||
          original.technicalOpinion !== s.technicalOpinion ||
          original.date !== s.date
        );
      });

      for (const s of toUpsert) {
        await supabase.from('oral_assessments').upsert({
          id: s.id,
          student_id: s.studentId,
          student_name: s.studentName,
          score: s.score,
          classification: s.classification,
          technical_opinion: s.technicalOpinion,
          date: s.date,
          answers: s.answers ?? null
        });
      }
      setDbStatus(prevDb => ({ ...prevDb, error: null }));
    } catch (e) {
      if (isInvalidApiKeyError(e)) return;
      console.error('Erro de sincronização Higiene Bucal:', e);
    }
  };

  const updateOralState = async (newOralOrFn: OralRecord[] | ((prev: OralRecord[]) => OralRecord[])) => {
    setOralRecords(prev => {
      const next = typeof newOralOrFn === 'function' ? newOralOrFn(prev) : newOralOrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_avaliacoes_oral', JSON.stringify(next));
      }
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => syncOralToSupabase(prev, next, supabase), 0);
        }
      }
      return next;
    });
  };


  // Background Sync for Autoconceito Assessments (Rosenberg)
  const syncAutoconceptToSupabase = async (prev: AutoconceptRecord[], next: AutoconceptRecord[], supabase: SupabaseClient) => {
    try {
      const idsBefore = prev.map(x => x.id);
      const idsAfter = next.map(x => x.id);

      const deletedIds = idsBefore.filter(id => !idsAfter.includes(id));
      for (const id of deletedIds) {
        await supabase.from('autoconcept_assessments').delete().eq('id', id);
      }

      const toUpsert = next.filter(s => {
        const original = prev.find(orig => orig.id === s.id);
        if (!original) return true;
        return (
          original.studentId !== s.studentId ||
          original.studentName !== s.studentName ||
          original.score !== s.score ||
          original.classification !== s.classification ||
          original.technicalOpinion !== s.technicalOpinion ||
          original.date !== s.date
        );
      });

      for (const s of toUpsert) {
        await supabase.from('autoconcept_assessments').upsert({
          id: s.id,
          student_id: s.studentId,
          student_name: s.studentName,
          score: s.score,
          classification: s.classification,
          technical_opinion: s.technicalOpinion,
          date: s.date,
          answers: s.answers ?? null
        });
      }
      setDbStatus(prevDb => ({ ...prevDb, error: null }));
    } catch (e) {
      if (isInvalidApiKeyError(e)) return;
      console.error('Erro de sincronização Autoconceito:', e);
    }
  };

  const updateAutoconceptState = async (newAutoOrFn: AutoconceptRecord[] | ((prev: AutoconceptRecord[]) => AutoconceptRecord[])) => {
    setAutoconceptRecords(prev => {
      const next = typeof newAutoOrFn === 'function' ? newAutoOrFn(prev) : newAutoOrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_avaliacoes_autoconcept', JSON.stringify(next));
      }
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => syncAutoconceptToSupabase(prev, next, supabase), 0);
        }
      }
      return next;
    });
  };


  // Background Sync for Indice Alimentar Assessments (IAS)
  const syncIasToSupabase = async (prev: IasRecord[], next: IasRecord[], supabase: SupabaseClient) => {
    try {
      const idsBefore = prev.map(x => x.id);
      const idsAfter = next.map(x => x.id);

      const deletedIds = idsBefore.filter(id => !idsAfter.includes(id));
      for (const id of deletedIds) {
        await supabase.from('ias_assessments').delete().eq('id', id);
      }

      const toUpsert = next.filter(s => {
        const original = prev.find(orig => orig.id === s.id);
        if (!original) return true;
        return (
          original.studentId !== s.studentId ||
          original.studentName !== s.studentName ||
          original.totalScore !== s.totalScore ||
          original.classification !== s.classification ||
          original.technicalOpinion !== s.technicalOpinion ||
          original.date !== s.date
        );
      });

      for (const s of toUpsert) {
        await supabase.from('ias_assessments').upsert({
          id: s.id,
          student_id: s.studentId,
          student_name: s.studentName,
          total_score: s.totalScore,
          classification: s.classification,
          technical_opinion: s.technicalOpinion,
          date: s.date,
          answers: s.answers ?? null
        });
      }
      setDbStatus(prevDb => ({ ...prevDb, error: null }));
    } catch (e) {
      if (isInvalidApiKeyError(e)) return;
      console.error('Erro de sincronização Índice Alimentar:', e);
    }
  };

  const updateIasState = async (newIasOrFn: IasRecord[] | ((prev: IasRecord[]) => IasRecord[])) => {
    setIasRecords(prev => {
      const next = typeof newIasOrFn === 'function' ? newIasOrFn(prev) : newIasOrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_avaliacoes_ias', JSON.stringify(next));
      }
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => syncIasToSupabase(prev, next, supabase), 0);
        }
      }
      return next;
    });
  };

  // Background Sync for Rastreamento do TDAH (SNAP-IV)
  const syncSnapToSupabase = async (prev: SnapRecord[], next: SnapRecord[], supabase: SupabaseClient) => {
    try {
      const idsBefore = prev.map(x => x.id);
      const idsAfter = next.map(x => x.id);

      const deletedIds = idsBefore.filter(id => !idsAfter.includes(id));
      for (const id of deletedIds) {
        await supabase.from('snap_assessments').delete().eq('id', id);
      }

      const toUpsert = next.filter(s => {
        const original = prev.find(orig => orig.id === s.id);
        if (!original) return true;
        return (
          original.studentId !== s.studentId ||
          original.studentName !== s.studentName ||
          original.inattentionScore !== s.inattentionScore ||
          original.hyperactivityScore !== s.hyperactivityScore ||
          original.classification !== s.classification ||
          original.technicalOpinion !== s.technicalOpinion ||
          original.respondent !== s.respondent ||
          original.date !== s.date
        );
      });

      for (const s of toUpsert) {
        await supabase.from('snap_assessments').upsert({
          id: s.id,
          student_id: s.studentId,
          student_name: s.studentName,
          inattention_score: s.inattentionScore,
          hyperactivity_score: s.hyperactivityScore,
          classification: s.classification,
          technical_opinion: s.technicalOpinion,
          respondent: s.respondent ?? null,
          date: s.date,
          answers: s.answers ?? null
        });
      }
      setDbStatus(prevDb => ({ ...prevDb, error: null }));
    } catch (e) {
      if (isInvalidApiKeyError(e)) return;
      console.error('Erro de sincronização SNAP-IV:', e);
    }
  };

  const updateSnapState = async (newSnapOrFn: SnapRecord[] | ((prev: SnapRecord[]) => SnapRecord[])) => {
    setSnapRecords(prev => {
      const next = typeof newSnapOrFn === 'function' ? newSnapOrFn(prev) : newSnapOrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_avaliacoes_snap', JSON.stringify(next));
      }
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => syncSnapToSupabase(prev, next, supabase), 0);
        }
      }
      return next;
    });
  };

  // Background Sync for Rastreamento Precoce do TEA (AQ-10)
  const syncAq10ToSupabase = async (prev: Aq10Record[], next: Aq10Record[], supabase: SupabaseClient) => {
    try {
      const idsBefore = prev.map(x => x.id);
      const idsAfter = next.map(x => x.id);

      const deletedIds = idsBefore.filter(id => !idsAfter.includes(id));
      for (const id of deletedIds) {
        await supabase.from('aq10_assessments').delete().eq('id', id);
      }

      const toUpsert = next.filter(s => {
        const original = prev.find(orig => orig.id === s.id);
        if (!original) return true;
        return (
          original.studentId !== s.studentId ||
          original.studentName !== s.studentName ||
          original.version !== s.version ||
          original.totalScore !== s.totalScore ||
          original.classification !== s.classification ||
          original.technicalOpinion !== s.technicalOpinion ||
          original.respondent !== s.respondent ||
          original.date !== s.date
        );
      });

      for (const s of toUpsert) {
        await supabase.from('aq10_assessments').upsert({
          id: s.id,
          student_id: s.studentId,
          student_name: s.studentName,
          version: s.version,
          total_score: s.totalScore,
          classification: s.classification,
          technical_opinion: s.technicalOpinion,
          respondent: s.respondent ?? null,
          date: s.date,
          answers: s.answers ?? null
        });
      }
      setDbStatus(prevDb => ({ ...prevDb, error: null }));
    } catch (e) {
      if (isInvalidApiKeyError(e)) return;
      console.error('Erro de sincronização AQ-10:', e);
    }
  };

  const updateAq10State = async (newAq10OrFn: Aq10Record[] | ((prev: Aq10Record[]) => Aq10Record[])) => {
    setAq10Records(prev => {
      const next = typeof newAq10OrFn === 'function' ? newAq10OrFn(prev) : newAq10OrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_avaliacoes_aq10', JSON.stringify(next));
      }
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => syncAq10ToSupabase(prev, next, supabase), 0);
        }
      }
      return next;
    });
  };

  // Background Sync for Qualidade Motora PCD
  const syncPcdToSupabase = async (prev: PcdRecord[], next: PcdRecord[], supabase: SupabaseClient) => {
    try {
      const idsBefore = prev.map(x => x.id);
      const idsAfter = next.map(x => x.id);

      const deletedIds = idsBefore.filter(id => !idsAfter.includes(id));
      for (const id of deletedIds) {
        await supabase.from('pcd_assessments').delete().eq('id', id);
      }

      const toUpsert = next.filter(s => {
        const original = prev.find(orig => orig.id === s.id);
        if (!original) return true;
        return (
          original.studentId !== s.studentId ||
          original.studentName !== s.studentName ||
          original.grupo !== s.grupo ||
          original.grupoNome !== s.grupoNome ||
          original.detalheClassificacao !== s.detalheClassificacao ||
          original.abdominalS !== s.abdominalS ||
          original.velocidadeS !== s.velocidadeS ||
          original.agilidadeS !== s.agilidadeS ||
          original.saltoCm !== s.saltoCm ||
          original.flexaoRep !== s.flexaoRep ||
          original.notaAbdominal !== s.notaAbdominal ||
          original.notaVelocidade !== s.notaVelocidade ||
          original.notaAgilidade !== s.notaAgilidade ||
          original.notaSalto !== s.notaSalto ||
          original.notaFlexao !== s.notaFlexao ||
          original.notaVelAgil !== s.notaVelAgil ||
          original.notaForcaExplosiva !== s.notaForcaExplosiva ||
          original.notaMembrosSup !== s.notaMembrosSup ||
          original.notaCore !== s.notaCore ||
          JSON.stringify(original.compatibilidade) !== JSON.stringify(s.compatibilidade) ||
          original.direcionamento !== s.direcionamento ||
          original.classificacaoPerfil !== s.classificacaoPerfil ||
          JSON.stringify(original.funil) !== JSON.stringify(s.funil) ||
          JSON.stringify(original.adaptacoesAplicadas) !== JSON.stringify(s.adaptacoesAplicadas) ||
          original.technicalOpinion !== s.technicalOpinion ||
          original.date !== s.date
        );
      });

      for (const s of toUpsert) {
        await supabase.from('pcd_assessments').upsert({
          id: s.id,
          student_id: s.studentId,
          student_name: s.studentName,
          grupo: s.grupo,
          grupo_nome: s.grupoNome,
          detalhe_classificacao: s.detalheClassificacao,
          abdominal_s: s.abdominalS,
          velocidade_s: s.velocidadeS,
          agilidade_s: s.agilidadeS,
          salto_cm: s.saltoCm,
          flexao_rep: s.flexaoRep,
          nota_abdominal: s.notaAbdominal,
          nota_velocidade: s.notaVelocidade,
          nota_agilidade: s.notaAgilidade,
          nota_salto: s.notaSalto,
          nota_flexao: s.notaFlexao,
          nota_vel_agil: s.notaVelAgil,
          nota_forca_explosiva: s.notaForcaExplosiva,
          nota_membros_sup: s.notaMembrosSup,
          nota_core: s.notaCore,
          compatibilidade: s.compatibilidade,
          direcionamento: s.direcionamento,
          classificacao_perfil: s.classificacaoPerfil,
          funil: s.funil,
          adaptacoes_aplicadas: s.adaptacoesAplicadas,
          technical_opinion: s.technicalOpinion,
          date: s.date
        });
      }
      setDbStatus(prevDb => ({ ...prevDb, error: null }));
    } catch (e) {
      if (isInvalidApiKeyError(e)) return;
      console.error('Erro de sincronização PCD:', e);
    }
  };

  const updatePcdState = async (newPcdOrFn: PcdRecord[] | ((prev: PcdRecord[]) => PcdRecord[])) => {
    setPcdRecords(prev => {
      const next = typeof newPcdOrFn === 'function' ? newPcdOrFn(prev) : newPcdOrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_avaliacoes_pcd', JSON.stringify(next));
      }
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          setTimeout(() => syncPcdToSupabase(prev, next, supabase), 0);
        }
      }
      return next;
    });
  };


  // Alunos View Add modal trigger state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Authentication callbacks
  const handleLoginSuccess = (name: string, email: string, role?: string, id?: string) => {
    updateUserState((prev) => {
      const cleanEmail = email.trim().toLowerCase();
      const matchedProf = professionals.find(p => (p.email ?? '').toLowerCase() === cleanEmail);
      const matchedStudent = students.find(s => (s.email ?? '').toLowerCase() === cleanEmail);

      const resolvedContrato = matchedProf?.contrato || matchedStudent?.contrato || prev.contrato || '';
      const resolvedEstado = matchedProf?.estado || matchedStudent?.estado || prev.estado || '';
      const resolvedRegiao = matchedProf?.regiao || matchedStudent?.regiao || prev.regiao || '';
      const resolvedLocality = matchedProf?.locality || matchedStudent?.locality || prev.locality || '';
      const resolvedGrade = matchedProf?.grade || matchedStudent?.grade || prev.grade || '';

      return {
        ...prev,
        id: id || prev.id || '1',
        name,
        email,
        role: role || prev.role || 'Administrador',
        contrato: resolvedContrato,
        estado: resolvedEstado,
        regiao: resolvedRegiao,
        locality: resolvedLocality,
        grade: resolvedGrade
      };
    });
    setActiveTab('dashboard');
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('educore_logged_in', 'true');
    }
    // Re-fetch all data from Supabase (logout had wiped local state)
    setDataBootstrapKey(k => k + 1);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab('dashboard');
    if (typeof window !== 'undefined') {
      // LGPD: Limpar TODOS os dados sensíveis do localStorage
      const sensitiveKeys = [
        'educore_logged_in',
        'educore_user',
        'educore_students',
        'educore_professionals',
        'educore_contratos',
        'educore_avaliacoes_imc',
        'educore_avaliacoes_motor',
        'educore_avaliacoes_sport',
        'educore_avaliacoes_vocation',
        'educore_avaliacoes_health',
        'educore_avaliacoes_oral',
        'educore_avaliacoes_autoconcept',
        'educore_avaliacoes_ias',
        'educore_avaliacoes_snap',
        'educore_avaliacoes_aq10',
        'educore_avaliacoes_pcd',
        'educore_analise_frequencia',
        'educore_rbac_permissions'
      ];
      sensitiveKeys.forEach(key => localStorage.removeItem(key));
      setSessionToken(null);
      // Resetar estados sensíveis
      setStudents([]);
      setProfessionals([]);
      setModalities([]);
      setContratos([]);
      setImcRecords([]);
      setMotorRecords([]);
      setSportRecords([]);
      setVocationalRecords([]);
      setHealthRecords([]);
      setOralRecords([]);
      setAutoconceptRecords([]);
      setIasRecords([]);
      setSnapRecords([]);
      setAq10Records([]);
      setPcdRecords([]);
      setAttendanceRecords([]);
      setUser({
        name: '',
        role: 'Professor',
        email: '',
        avatarUrl: ''
      });
    }
  };

  // Sessao expirada/invalida (401 vindo do /api/data): encerra a sessao e volta ao login
  const logoutRef = useRef<() => void>(() => {});
  logoutRef.current = handleLogout;
  const authRef = useRef<boolean>(false);
  authRef.current = isAuthenticated;
  useEffect(() => {
    const onSessionExpired = () => {
      if (authRef.current) {
        logoutRef.current();
      }
    };
    window.addEventListener('educore:session-expired', onSessionExpired);
    return () => window.removeEventListener('educore:session-expired', onSessionExpired);
  }, []);

  // Quick header modal link trigger
  const triggerQuickEnroll = () => {
    setActiveTab('alunos');
    setIsSidebarOpen(false);
    setIsAddModalOpen(true);
  };

  const setTabAndCloseMenu = (tab: string) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  // View router selection block
  const renderViewContent = () => {
    const normRole = normalizeRole(user.role ?? '');
    if (!canAccessTabDynamic(rolePermissions, normRole, activeTab)) {
      const requiredPermission = TAB_PERMISSION_MAP[activeTab] || `view:${activeTab}`;
      return (
        <div className="bg-[#171f33] border border-rose-500/30 rounded-2xl p-4 sm:p-8 max-w-xl mx-auto shadow-2xl text-center space-y-6 mt-10">
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto text-rose-400 animate-pulse border border-rose-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-rose-400">{t('acessoNegadoTitulo')}</h3>
            <p className="text-xs text-[#bdc8d1]/90">
              {t.rich('acessoNegadoDescricao', { perfil: normRole, ...strongRose })}
            </p>
          </div>

          <div className="bg-[#0b1326] border border-[#3e484f]/20 rounded-lg p-4 space-y-2 text-left text-xs font-mono">
            <div>
              <span className="text-rose-400 font-semibold">{t('identificacao')}</span> {user.id || '1'}
            </div>
            <div>
              <span className="text-rose-400 font-semibold">{t('permissaoRequerida')}</span> {requiredPermission}
            </div>
            <div>
              <span className="text-rose-400 font-semibold">{t('acaoInterceptada')}</span> {t('transicaoRota')} {activeTab}
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-4 py-2 bg-[#1a2b4b] hover:bg-[#1a2b4b]/80 border border-[#3e484f]/40 text-xs font-bold text-[#8ed5ff] rounded-lg transition-transform active:scale-95"
            >
              {t('voltarDashboard')}
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            students={students} 
            modalities={modalities} 
            imcRecords={imcRecords}
            motorRecords={motorRecords}
            sportRecords={sportRecords}
            vocationalRecords={vocationalRecords}
            healthRecords={healthRecords}
            oralRecords={oralRecords}
            autoconceptRecords={autoconceptRecords}
            iasRecords={iasRecords}
            snapRecords={snapRecords}
            aq10Records={aq10Records}
            pcdRecords={pcdRecords}
            attendanceRecords={attendanceRecords}
            setActiveTab={setTabAndCloseMenu} 
            contratos={contratos}
            user={{ ...user, name: user.name ?? '', role: user.role ?? '', email: user.email ?? '' }}
          />
        );
      case 'contrato':
        return (
          <ContratosView 
            contratos={contratos}
            setContratos={updateContratosState}
            runWithPermission={runWithPermission}
            user={user}
            students={students}
          />
        );
      case 'alunos':
        return (
          <AlunosView 
            students={students} 
            setStudents={updateStudentsState} 
            isAddModalOpen={isAddModalOpen}
            setIsAddModalOpen={setIsAddModalOpen}
            runWithPermission={runWithPermission}
            contratos={contratos}
            user={user}
          />
        );
      case 'presenca':
        return (
          <PresencaView 
            students={students} 
            runWithPermission={runWithPermission}
            contratos={contratos}
            user={{ ...user, name: user.name ?? '', role: user.role ?? '', email: user.email ?? '' }}
          />
        );
      case 'profissionais':
        return (
          <ProfissionaisView 
            professionals={professionals}
            setProfessionals={updateProfessionalsState}
            runWithPermission={runWithPermission}
            contratos={contratos}
            user={user}
          />
        );
      case 'modalidades':
        return (
          <ModalidadesView 
            modalities={modalities} 
            setModalities={updateModalitiesState} 
            runWithPermission={runWithPermission}
            contratos={contratos}
            students={students}
            professionals={professionals}
            user={user}
          />
        );
      case 'performance':
      case 'analise-geral':
      case 'painel-estatistico':
        return (
          <PerformanceView 
            students={students} 
            contratos={contratos}
            user={user}
            imcRecords={imcRecords}
            motorRecords={motorRecords}
            sportRecords={sportRecords}
            vocationalRecords={vocationalRecords}
            healthRecords={healthRecords}
            oralRecords={oralRecords}
            autoconceptRecords={autoconceptRecords}
            iasRecords={iasRecords}
            snapRecords={snapRecords}
            aq10Records={aq10Records}
            pcdRecords={pcdRecords}
            runWithPermission={runWithPermission}
            isAnaliseGeral={activeTab === 'analise-geral' || activeTab === 'painel-estatistico'}
            isPainelEstatistico={activeTab === 'painel-estatistico'}
          />
        );
      case 'estudo-comparativo':
        return (
          <ComparativeStudyView 
            students={students} 
            contratos={contratos}
            user={user}
            attendanceRecords={attendanceRecords}
            imcRecords={imcRecords}
            motorRecords={motorRecords}
            sportRecords={sportRecords}
            vocationalRecords={vocationalRecords}
            healthRecords={healthRecords}
            oralRecords={oralRecords}
            autoconceptRecords={autoconceptRecords}
            iasRecords={iasRecords}
            snapRecords={snapRecords}
            aq10Records={aq10Records}
            pcdRecords={pcdRecords}
          />
        );
      case 'questionario-m1':
      case 'questionario-m2':
      case 'questionario-m3':
      case 'questionario-m4':
      case 'questionario-m5':
      case 'questionario-m6':
      case 'questionario-m7':
      case 'questionario-m8':
      case 'questionario-m9':
      case 'questionario-m10':
      case 'questionario-m11':
      case 'questionario-m12':
      case 'questionario-m13':
      case 'questionario-m14':
      case 'questionario-m15':
        return (
          <QuestionarioView 
            students={students} 
            user={user}
            activeTab={activeTab}
          />
        );
      case 'avaliacoes':
        return (
          <AvaliacoesView 
            students={students} 
            imcRecords={imcRecords}
            motorRecords={motorRecords}
            sportRecords={sportRecords}
            vocationalRecords={vocationalRecords}
            healthRecords={healthRecords}
            oralRecords={oralRecords}
            autoconceptRecords={autoconceptRecords}
            iasRecords={iasRecords}
            snapRecords={snapRecords}
            aq10Records={aq10Records}
            pcdRecords={pcdRecords}
            updateImcState={updateImcState}
            updateMotorState={updateMotorState}
            updateSportState={updateSportState}
            updateVocationalState={updateVocationalState}
            updateHealthState={updateHealthState}
            updateOralState={updateOralState}
            updateAutoconceptState={updateAutoconceptState}
            updateIasState={updateIasState}
            updateSnapState={updateSnapState}
            updateAq10State={updateAq10State}
            updatePcdState={updatePcdState}
            runWithPermission={runWithPermission}
            contratos={contratos}
            user={user}
          />
        );
      case 'plano-acao':
        return (
          <PlanoAcaoView
            user={user}
            runWithPermission={runWithPermission}
          />
        );
      case 'perfil':
        return (
          <PerfilView 
            user={user} 
            setUser={updateUserState} 
            rolePermissions={rolePermissions}
            setRolePermissions={setRolePermissions}
          />
        );
      case 'settings':
        return (
          <ConfiguracoesView />
        );
      default:
        return (
          <div className="py-12 text-center text-xs">
            {t('secaoIndisponivel')}
          </div>
        );
    }
  };

  // Render matching loading state or fallback to avoid SSR mismatch
  if (!isMounted) {
    return (
      <div className="w-full min-h-screen bg-[#070b19] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-[#bdc8d1]/60 font-mono tracking-widest uppercase">{t('carregandoApp')}</p>
        </div>
      </div>
    );
  }

  // Redirect to login if user isn't authenticated
  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] flex">
      {/* Lateral Menu - Slide-in and mobile hidden by default */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setTabAndCloseMenu} 
        user={user} 
        onQuickCreate={triggerQuickEnroll}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
        rolePermissions={rolePermissions}
      />

      {/* Backdrop overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Main Workspace Frame container responsive padding */}
      <div className="flex-1 md:pl-72 flex flex-col min-h-screen w-full transition-all duration-300">
        {/* Superior App Header */}
        <Header 
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        {/* Database Connection Info Status Drawer Line */}
        <div className="bg-[#0f172a]/90 border-b border-[#3e484f]/20 px-4 md:px-8 py-2 text-left flex items-center justify-between gap-2 text-[11px] text-[#bdc8d1]/80 select-none">
          <div className="flex items-center gap-2 min-w-0">
            {dbStatus.configured ? (
              <span className="flex items-center gap-1 text-[#38bdf8] font-semibold shrink-0">
                <Database className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('supabaseConectado')}</span>
                <span className="sm:hidden">{t('supabase')}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#87929a] shrink-0">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('modoOffline')}</span>
                <span className="sm:hidden">{t('offline')}</span>
              </span>
            )}
            <span className="text-[#87929a]/60 shrink-0">|</span>
            <span className="min-w-0 truncate">
              {dbStatus.error
                ? t(dbStatus.error.key, dbStatus.error.values as never)
                : (dbStatus.configured ? t('persistenciaNuvem') : t('dadosLocais'))}
            </span>
          </div>
          {dbStatus.configured && !dbStatus.error && (
            <span className="hidden sm:inline-flex items-center gap-1 text-emerald-400 font-bold uppercase tracking-wider text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Check className="w-3 h-3" /> {t('liveSync')}
            </span>
          )}
        </div>

        {/* Content Wrapper */}
        <main className="flex-grow p-4 md:p-8 max-w-6xl mx-auto w-full transition-all duration-200">
          {renderViewContent()}
        </main>
      </div>

      {actionDenied && (
        <div className="fixed inset-0 bg-[#060e20]/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-rose-500/40 w-full max-w-md rounded-2xl shadow-2xl p-4 sm:p-6 relative text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wider">{t('acaoNegadaTitulo')}</h4>
              <p className="text-xs text-[#bdc8d1]">
                {t.rich('acaoNegadaDescricao', { perfil: actionDenied.role, ...strongRose })}
              </p>
            </div>

            <div className="bg-[#0b1326] rounded-xl border border-[#3e484f]/25 p-3.5 text-left text-[11px] font-mono space-y-1">
              <p><span className="text-[#8ed5ff]">{t('acaoRequerida')}</span> {actionDenied.msg}</p>
              <p><span className="text-[#8ed5ff]">{t('codigoRecurso')}</span> {actionDenied.permission}</p>
            </div>

            <p className="text-[10px] text-[#bdc8d1]/50 italic">
              {t('verificacaoRbac')}
            </p>

            <div className="pt-2">
              <button
                onClick={() => setActionDenied(null)}
                className="w-full px-4 py-2 bg-[#1a2b4b] text-[#bdc8d1] hover:text-[#dae2fd] text-xs font-semibold rounded-lg transition-transform active:scale-95"
              >
                {t('fecharAviso')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
