'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { Sparkles, Bot, Users, ClipboardCopy, CheckCircle2, AlertCircle, FileText, Lock, History, Database, Download, Flag } from 'lucide-react';
import { nextReportId, uuid } from '../lib/idGenerator';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { addReportBackground } from '../lib/pdfUtils';
import { type Student, type ContratoItem, type PerformanceReport, type ImcRecord, type MotorRecord, type SportRecord, type VocationalRecord, type HealthRecord, type OralRecord, type AutoconceptRecord, type IasRecord, type SnapRecord, type Aq10Record, type PcdRecord, type EstHierarchical, type RegHierarchical, type LocHierarchical } from '../types/edukyne';
import { buildAssessmentReport, type ReportBuildCtx } from '../lib/reportBuilder';
import { backfillReportsForStudentIds } from '../lib/autoReport';
import { isSupabaseConfigured } from '../lib/supabase';
import { getDb } from '../lib/dbFacade';
import type { Permission } from '../lib/rbac';
import { logExport, logDataAccess } from '../lib/auditLog';

interface PerformanceViewUser {
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

interface M3Analysis {
  studentId: string;
  updatedAt: string;
  cenario?: string;
  parecerFrequencia?: string;
  parecerPais?: string;
}

interface M4ImcDataItem {
  id: string;
  classification: string;
  status: string;
  alertColor: string;
  description: string;
}

interface M7Row {
  id: string;
  profile: string;
  component: string;
  basicData: string;
  reflection: string;
}

interface M6Modalidade {
  id: string;
  name: string;
  valencias: string;
  condition: string;
  report: string;
}

interface M6Diretriz {
  id: string;
  diretriz: string;
  criterio: string;
  conduta: string;
  objetivo: string;
}

interface M5CapabilityItem {
  id: string;
  level: string;
  alertColor: string;
  healthStatus: string;
  toImprove: string;
  recommendation: string;
}

interface SupabasePerformanceRow {
  id: string;
  student_id: string;
  student_name: string;
  grade: string;
  focus_area: string;
  observations?: string;
  report: string;
  date: string;
  evaluation_id?: string;
  evaluation_result?: string;
  created_at: string;
}

interface SupabaseAttendanceRow {
  date: string;
  present: boolean;
}

function getMatchingSportCategories(suggestedSportStr: string): string[] {
  if (!suggestedSportStr) return [];
  const normalized = suggestedSportStr
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^\w\s]/g, ""); // remove non-alphanumeric

  const matches: string[] = [];
  
  if (normalized.includes("basquete") || normalized.includes("basketball") || normalized.includes("basquetebol")) {
    matches.push("BASQUETE");
  }
  if (normalized.includes("ginastica") || normalized.includes("ritmica") || normalized.includes("artistica")) {
    matches.push("GINÁSTICA (Artística / Rítmica)");
  }
  if (normalized.includes("handebol") || normalized.includes("handball")) {
    matches.push("HANDEBOL");
  }
  if (normalized.includes("futebol") || normalized.includes("futsal") || normalized.includes("soccer")) {
    matches.push("FUTEBOL / FUTSAL");
  }
  if (normalized.includes("volei") || normalized.includes("volleyball") || normalized.includes("voleibol")) {
    matches.push("VÔLEI");
  }
  if (normalized.includes("luta") || normalized.includes("artes marciais") || normalized.includes("marcial") || normalized.includes("karate") || normalized.includes("judo")) {
    matches.push("LUTAS / ARTES MARCIAIS");
  }
  if (normalized.includes("atletismo") || normalized.includes("corrida") || normalized.includes("salto")) {
    matches.push("ATLETISMO");
  }
  if (normalized.includes("natacao") || normalized.includes("swimming") || normalized.includes("nado")) {
    matches.push("NATAÇÃO");
  }
  if (
    normalized.includes("aprimorar") || 
    normalized.includes("habilidades motoras") || 
    normalized.includes("deficit motor") || 
    normalized.includes("motoras") ||
    normalized.includes("motor") ||
    normalized.includes("habilidade") ||
    normalized.includes("deficit") ||
    normalized.includes("qualidade") ||
    normalized.includes("capacidade") ||
    normalized.includes("interven")
  ) {
    matches.push("APRIMORAR HABILIDADES MOTORAS");
  }

  // Fallback to APRIMORAR HABILIDADES MOTORAS if no matches found
  if (matches.length === 0) {
    matches.push("APRIMORAR HABILIDADES MOTORAS");
  }

  return matches;
}

const safeGetTimestamp = (dateStr?: string): number => {
  if (!dateStr) return 0;
  if (/^\d+$/.test(dateStr)) {
    return parseInt(dateStr, 10);
  }
  if (dateStr.includes('/')) {
    const parts = dateStr.split(' ')[0].split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.getTime();
    }
  }
  const t = new Date(dateStr).getTime();
  return isNaN(t) ? 0 : t;
};

interface PerformanceViewProps {
  students: Student[];
  contratos?: ContratoItem[];
  user?: PerformanceViewUser;
  isAnaliseGeral?: boolean;
  isPainelEstatistico?: boolean;
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
  runWithPermission?: (permission: Permission, onApproved: () => void | Promise<void>) => void;
}

// Avatar do aluno (foto ou iniciais) reutilizavel na tela
function StudentAvatar({ student, size = 'h-9 w-9', text = 'text-[10px]' }: { student: Student; size?: string; text?: string }) {
  if (student.avatarUrl) {
    return (
      <Image
        src={student.avatarUrl}
        alt={student.name}
        width={64}
        height={64}
        unoptimized
        referrerPolicy="no-referrer"
        className={`${size} shrink-0 rounded-full object-cover border border-[#3e484f]/60`}
      />
    );
  }
  return (
    <div className={`${size} shrink-0 rounded-full bg-[#1e293b] flex items-center justify-center ${text} font-bold text-[#8ed5ff] border border-[#3e484f]/60`}>
      {(student.name || '?').substring(0, 2).toUpperCase()}
    </div>
  );
}

// Converte a URL da foto em dataURL p/ embutir no PDF (retorna null se falhar/CORS)
const loadAvatarForPdf = (url?: string): Promise<{ data: string; format: 'JPEG' | 'PNG' } | null> =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const S = 160;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, S, S);
        ctx.drawImage(img, 0, 0, S, S);
        const isPng = url.includes('.png');
        resolve({ data: canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg'), format: isPng ? 'PNG' : 'JPEG' });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

// Dimensoes de foco disponiveis no relatorio (fonte unica; value === label).
const FOCUS_AREAS: string[] = [
  'Desempenho Escolar',
  'Desempenho Corporal',
  'Desempenho de Capacidades Físicas',
  'Desempenho em Atividades Esportivas',
  'Desempenho Vocacional',
  'Desempenho Saúde Global',
  'Desempenho Higiene Bucal',
  'Desempenho Autoconceito',
  'Desempenho Índice Alimentar',
  'Desempenho Rastreamento TDAH',
  'Desempenho Rastreamento Precoce do TEA',
  'Desempenho Qualidade Motora PCD',
  'Desempenho Completo',
];

function FocusAreaSelect({ value, onChange, className }: { value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {FOCUS_AREAS.map((area) => (
        <option key={area} value={area}>{area}</option>
      ))}
    </select>
  );
}

export default function PerformanceView({ students, contratos, user, isAnaliseGeral, isPainelEstatistico, imcRecords: imcRecordsProp, motorRecords: motorRecordsProp, sportRecords: sportRecordsProp, vocationalRecords: vocationalRecordsProp, healthRecords: healthRecordsProp, oralRecords: oralRecordsProp, autoconceptRecords: autoconceptRecordsProp, iasRecords: iasRecordsProp, snapRecords: snapRecordsProp, aq10Records: aq10RecordsProp, pcdRecords: pcdRecordsProp, runWithPermission }: PerformanceViewProps) {
  // Match logged in Student object for Aluno role
  const loggedInStudentObj = useMemo(() => {
    if (user?.role !== 'Aluno') return null;
    return students.find(s => 
      s.email?.toLowerCase().trim() === user.email?.toLowerCase().trim() ||
      s.name?.toLowerCase().trim() === user.name?.toLowerCase().trim() ||
      s.id === user.id
    );
  }, [user, students]);

  // Security Context checks: Lock filters if they have single value, restrict if multiple values
  const isHydrating = user?.id === 'loading';
  const isUserAdmin = (user?.role === 'Administrador');

  // Parsed list of restriction rules from registration data
  const assignedContracts = useMemo(() => {
    if (!user?.contrato) return [];
    return (user.contrato as string).split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const assignedStates = useMemo(() => {
    if (!user?.estado) return [];
    return (user.estado as string).split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const assignedRegions = useMemo(() => {
    if (!user?.regiao) return [];
    return (user.regiao as string).split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const assignedLocalities = useMemo(() => {
    if (!user?.locality) return [];
    return (user.locality as string).split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const assignedGrades = useMemo(() => {
    if (!user?.grade) return [];
    return (user.grade as string).split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  // Initialize states dynamically based on user context to avoid synchronous effect renders
  const [contract, setContract] = useState(() => {
    if (user?.role === 'Aluno' && loggedInStudentObj) {
      const userContractObj = (contratos || []).find(c => 
        c.name.toLowerCase() === loggedInStudentObj.contrato?.toLowerCase()
      );
      if (userContractObj) return userContractObj.id;
    }
    if (user && user.role !== 'Administrador' && user.contrato) {
      const assigned = (user.contrato as string).split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      const matched = (contratos || []).find(c => 
        assigned.includes(c.name.toLowerCase()) || assigned.includes(c.id.toLowerCase())
      );
      if (matched) return matched.id;
    }
    return '';
  });

  const [stateFilter, setStateFilter] = useState(() => {
    if (user && user.role !== 'Administrador' && user.estado) {
      const assigned = (user.estado as string).split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      const foundState = assigned.find(st => st !== '');
      if (foundState) {
        const actualState = (contratos || []).flatMap(c => c.estado.split(',').map((s: string) => s.trim()))
          .find(st => st.toLowerCase() === foundState.toLowerCase());
        if (actualState) return actualState;
      }
    }
    return '';
  });

  const [cityFilter, setCityFilter] = useState(() => {
    if (user && user.role !== 'Administrador' && user.regiao) {
      const assigned = (user.regiao as string).split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      const foundReg = assigned.find(r => r !== '');
      if (foundReg) {
        const actualReg = (contratos || []).flatMap(c => c.regiao.split(',').map((s: string) => s.trim()))
          .find(r => r.toLowerCase() === foundReg.toLowerCase());
        if (actualReg) return actualReg;
      }
    }
    return '';
  });

  const [localityFilter, setLocalityFilter] = useState(() => {
    if (user?.role === 'Aluno' && loggedInStudentObj) {
      return loggedInStudentObj.locality || 'Centro';
    }
    if (user && user.role !== 'Administrador' && user.locality) {
      const assigned = (user.locality as string).split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      const foundLoc = assigned.find(l => l !== '');
      if (foundLoc) {
        const actualLoc = (contratos || []).flatMap(c => c.localidade.split(',').map((s: string) => s.trim()))
          .find(l => l.toLowerCase() === foundLoc.toLowerCase());
        if (actualLoc) return actualLoc;
      }
    }
    return '';
  });

  const [gradeFilter, setGradeFilter] = useState(() => {
    if (user?.role === 'Aluno' && loggedInStudentObj) {
      return loggedInStudentObj.grade || '';
    }
    return '';
  });

  // Dynamic cascading option selection logic
  const availableContracts = useMemo(() => {
    const list = contratos || [];
    if (isUserAdmin) return list;
    if (assignedContracts.length > 0) {
      return list.filter(c => assignedContracts.includes(c.name.toLowerCase()) || assignedContracts.includes(c.id.toLowerCase()));
    }
    return list;
  }, [contratos, isUserAdmin, assignedContracts]);

  const [selectedStudentId, setSelectedStudentId] = useState(() => {
    if (user?.role === 'Aluno' && loggedInStudentObj) {
      return loggedInStudentObj.id;
    }
    return '';
  });
  const [focusArea, setFocusArea] = useState('Desempenho Escolar');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [presenceCount, setPresenceCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [m3Analysis, setM3Analysis] = useState<M3Analysis | null>(null);
  const [imcRecords, setImcRecords] = useState<ImcRecord[]>([]);
  const [selectedImcId, setSelectedImcId] = useState<string>('');
  const [m4ImcData, setM4ImcData] = useState<M4ImcDataItem[]>([]);
  
  // Physical capabilities assessments and Módulo 5 data states
  const [motorRecords, setMotorRecords] = useState<MotorRecord[]>([]);
  const [selectedMotorId, setSelectedMotorId] = useState<string>('');
  
  // Sports performance assessment and Módulo 6 states
  const [sportRecords, setSportRecords] = useState<SportRecord[]>([]);
  const [selectedSportId, setSelectedSportId] = useState<string>('');
  const [selectedSportName, setSelectedSportName] = useState<string>('');

  // Vocational performance states
  const [vocationRecords, setVocationRecords] = useState<VocationalRecord[]>([]);
  const [selectedVocationId, setSelectedVocationId] = useState<string>('');
  const [m7Rows, setM7Rows] = useState<M7Row[]>([]);

  // Saude Global (KIDSCREEN-10) performance states
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [selectedHealthId, setSelectedHealthId] = useState<string>('');
  const [m9Rows, setM9Rows] = useState<{ id: string; classification: string; basicData: string; reflection: string }[]>([]);

  // Higiene Bucal (HU-DBI) performance states
  const [oralRecords, setOralRecords] = useState<OralRecord[]>([]);
  const [selectedOralId, setSelectedOralId] = useState<string>('');
  const [m10Rows, setM10Rows] = useState<{ id: string; classification: string; basicData: string; reflection: string }[]>([]);

  // Autoconceito (Rosenberg) performance states
  const [autoconceptRecords, setAutoconceptRecords] = useState<AutoconceptRecord[]>([]);
  const [selectedAutoId, setSelectedAutoId] = useState<string>('');
  const [m11Rows, setM11Rows] = useState<{ id: string; classification: string; basicData: string; reflection: string }[]>([]);

  // Indice Alimentar (IAS) performance states
  const [iasRecords, setIasRecords] = useState<IasRecord[]>([]);
  const [selectedIasId, setSelectedIasId] = useState<string>('');
  const [m12Rows, setM12Rows] = useState<{ id: string; classification: string; basicData: string; reflection: string }[]>([]);

  // Rastreamento do TDAH (SNAP-IV) performance states
  const [snapRecords, setSnapRecords] = useState<SnapRecord[]>([]);
  const [selectedSnapId, setSelectedSnapId] = useState<string>('');
  const [m13Rows, setM13Rows] = useState<{ id: string; classification: string; basicData: string; reflection: string }[]>([]);

  // Rastreamento Precoce do TEA (AQ-10) performance states
  const [aq10Records, setAq10Records] = useState<Aq10Record[]>([]);
  const [selectedAq10Id, setSelectedAq10Id] = useState<string>('');
  const [m14Rows, setM14Rows] = useState<{ id: string; classification: string; basicData: string; reflection: string }[]>([]);

  // Qualidade Motora PCD performance states
  const [pcdRecords, setPcdRecords] = useState<PcdRecord[]>([]);
  const [selectedPcdId, setSelectedPcdId] = useState<string>('');

  useEffect(() => {
    // Other cleanups if needed
  }, [focusArea, selectedStudentId, selectedImcId, selectedMotorId, selectedSportId, selectedVocationId, selectedHealthId, selectedOralId, selectedAutoId, selectedIasId, selectedSnapId, selectedAq10Id, selectedPcdId]);

  // Sync selected Vocation record ID
  useEffect(() => {
    if (vocationRecords.length > 0) {
      if (!selectedVocationId || !vocationRecords.some(r => r.id === selectedVocationId)) {
        setSelectedVocationId(vocationRecords[0].id);
      }
    } else {
      setSelectedVocationId('');
    }
  }, [vocationRecords, selectedVocationId]);

  // Sync selected Health (Saude Global) record ID
  useEffect(() => {
    if (healthRecords.length > 0) {
      if (!selectedHealthId || !healthRecords.some(r => r.id === selectedHealthId)) {
        setSelectedHealthId(healthRecords[0].id);
      }
    } else {
      setSelectedHealthId('');
    }
  }, [healthRecords, selectedHealthId]);

  // Sync selected Oral (Higiene Bucal) record ID
  useEffect(() => {
    if (oralRecords.length > 0) {
      if (!selectedOralId || !oralRecords.some(r => r.id === selectedOralId)) {
        setSelectedOralId(oralRecords[0].id);
      }
    } else {
      setSelectedOralId('');
    }
  }, [oralRecords, selectedOralId]);

  // Sync selected Autoconcept (Autoconceito) record ID
  useEffect(() => {
    if (autoconceptRecords.length > 0) {
      if (!selectedAutoId || !autoconceptRecords.some(r => r.id === selectedAutoId)) {
        setSelectedAutoId(autoconceptRecords[0].id);
      }
    } else {
      setSelectedAutoId('');
    }
  }, [autoconceptRecords, selectedAutoId]);

  // Sync selected IAS (Indice Alimentar) record ID
  useEffect(() => {
    if (iasRecords.length > 0) {
      if (!selectedIasId || !iasRecords.some(r => r.id === selectedIasId)) {
        setSelectedIasId(iasRecords[0].id);
      }
    } else {
      setSelectedIasId('');
    }
  }, [iasRecords, selectedIasId]);

  // Sync selected SNAP (Rastreamento do TDAH) record ID
  useEffect(() => {
    if (snapRecords.length > 0) {
      if (!selectedSnapId || !snapRecords.some(r => r.id === selectedSnapId)) {
        setSelectedSnapId(snapRecords[0].id);
      }
    } else {
      setSelectedSnapId('');
    }
  }, [snapRecords, selectedSnapId]);

  // Sync selected AQ-10 (Rastreamento Precoce do TEA) record ID
  useEffect(() => {
    if (aq10Records.length > 0) {
      if (!selectedAq10Id || !aq10Records.some(r => r.id === selectedAq10Id)) {
        setSelectedAq10Id(aq10Records[0].id);
      }
    } else {
      setSelectedAq10Id('');
    }
  }, [aq10Records, selectedAq10Id]);

  // Sync selected PCD (Qualidade Motora PCD) record ID
  useEffect(() => {
    if (pcdRecords.length > 0) {
      if (!selectedPcdId || !pcdRecords.some(r => r.id === selectedPcdId)) {
        setSelectedPcdId(pcdRecords[0].id);
      }
    } else {
      setSelectedPcdId('');
    }
  }, [pcdRecords, selectedPcdId]);

  // Sync selected IMC record ID
  useEffect(() => {
    if (imcRecords.length > 0) {
      if (!selectedImcId || !imcRecords.some(r => r.id === selectedImcId)) {
        setSelectedImcId(imcRecords[0].id);
      }
    } else {
      setSelectedImcId('');
    }
  }, [imcRecords, selectedImcId]);

  // Sync selected Motor record ID
  useEffect(() => {
    if (motorRecords.length > 0) {
      if (!selectedMotorId || !motorRecords.some(r => r.id === selectedMotorId)) {
        setSelectedMotorId(motorRecords[0].id);
      }
    } else {
      setSelectedMotorId('');
    }
  }, [motorRecords, selectedMotorId]);

  // Sync selected Sport record ID
  useEffect(() => {
    if (sportRecords.length > 0) {
      if (!selectedSportId || !sportRecords.some(r => r.id === selectedSportId)) {
        setSelectedSportId(sportRecords[0].id);
      }
    } else {
      setSelectedSportId('');
    }
  }, [sportRecords, selectedSportId]);

  const availableSubSports = useMemo(() => {
    const selectedSport = sportRecords.find(r => r.id === selectedSportId);
    if (!selectedSport || !selectedSport.suggestedSport) return [];
    return getMatchingSportCategories(selectedSport.suggestedSport);
  }, [selectedSportId, sportRecords]);

  // Sync selectedSportName when availableSubSports changes
  useEffect(() => {
    if (availableSubSports.length > 0) {
      if (!selectedSportName || !availableSubSports.includes(selectedSportName)) {
        setSelectedSportName(availableSubSports[0]);
      }
    } else {
      setSelectedSportName('');
    }
  }, [availableSubSports, selectedSportName]);

  const [m6Modalidades, setM6Modalidades] = useState<M6Modalidade[]>([]);
  const [m6Diretrizes, setM6Diretrizes] = useState<M6Diretriz[]>([]);
  const [m5FromDb, setM5FromDb] = useState<Record<string, M5CapabilityItem[]> | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getDb();
    if (!sb) return;
    (async () => {
      try {
        const { data, error } = await sb.from('m5_capacidades_config').select('id, category, level, health_status, to_improve, recommendation, alert_color');
        if (!error && data && data.length > 0) {
          const grouped: Record<string, M5CapabilityItem[]> = { velocidade: [], forca_muscular: [], agilidade: [], abdomen: [], impulsao: [] };
          data.forEach((r: { id: string; category: string; level: string | null; health_status: string | null; to_improve: string | null; recommendation: string | null; alert_color: string | null }) => {
            const item: M5CapabilityItem = { id: r.id, level: r.level ?? '', alertColor: r.alert_color ?? 'yellow', healthStatus: r.health_status ?? '', toImprove: r.to_improve ?? '', recommendation: r.recommendation ?? '' };
            if (grouped[r.category]) grouped[r.category].push(item);
          });
          setM5FromDb(grouped);
        }
      } catch (e) {
        console.error('Erro ao buscar m5_capacidades_config:', e);
      }
    })();
  }, []);
  const m5Data = useMemo<Record<string, M5CapabilityItem[]>>(() => {
    if (m5FromDb) return m5FromDb;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m5_capacidades_data");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return {
      velocidade: [
        { id: "v1", level: "INSUFICIENTE", alertColor: "rose", healthStatus: "A capacidade de deslocamento rápido e o tempo de reação estão abaixo do esperado para a idade. Na saúde, isso indica um sistema neuromuscular com respostas lentas aos estímulos externos e baixa eficiência cardiovascular em esforços explosivos, gerando cansaço precoce e falta de fôlego em corridas curtas.", toImprove: "O aluno precisa desenvolver a eficiência da passada e o ganho de ritmo. O foco inicial deve ser em educativos de corrida (como elevar os joelhos e calcanhares), coordenando a respiração e o movimento dos braços para destravar a agilidade dos pés e melhorar o condicionamento aeróbico de base.", recommendation: "Incentivamos o estímulo em casa através de jogos que exijam arrancadas rápidas, como pique-bandeira, corrida de obstáculos no quintal ou circuitos de tempo." },
        { id: "v2", level: "REGULAR", alertColor: "yellow", healthStatus: "O aluno consegue correr em um ritmo estável, mas apresenta dificuldades para acelerar rapidamente na largada ou mudar o ritmo de forma brusca. A saúde cardiovascular suporta o esforço, mas a musculatura das pernas gasta energia em excesso por falta de coordenação fina e potência na passada.", toImprove: "O foco deve ser o ganho de acréscimo e a técnica de explosão. Recomenda-se treinar tiros curtos de corrida com descanso completo entre eles, além de brincadeiras de reação rápida, ensinando o corpo a recrutar fibras musculares velozes de forma mais eficiente.", recommendation: "Incentivamos o estímulo em casa através de jogos que exijam arrancadas rápidas, como pique-bandeira, corrida de obstáculos no quintal ou circuitos de tempo." },
        { id: "v3", level: "BOM", alertColor: "emerald", healthStatus: "Nível saudável e totalmente adequado para a faixa etária. O aluno reage rápido aos estímulos e mantém uma excelente velocidade de deslocamento. Esse padrão reflete um coração forte, ótima capacidade respiratória e músculos condicionados, promovendo excelente queima energética e vitalidade no dia a dia.", toImprove: "Embora esteja em uma faixa segura e saudável, o aluno pode trabalhar a manutenção dessa velocidade por distâncias um pouco maiores. O foco deve ser treinar a resistência de velocidade para evitar quedas abruptas de rendimento no final das atividades.", recommendation: "Parabenizamos pelo excelente vigor físico. Seguiremos oferecendo desafios de alta intensidade em aula para manter o aluno motivado e saudável." },
        { id: "v4", level: "EXCELENTE", alertColor: "blue", healthStatus: "Desempenho físico excepcional. O aluno possui um tempo de reação curtíssimo e uma aceleração impressionante, atingindo a velocidade máxima com facilidade. O sistema cardiorrespiratório e a musculatura esquelética demonstram altíssima eficiência metabólica e perfeita coordenação neuromuscular.", toImprove: "O objetivo agora é preservar essa alta performance e evitar lesões. Por gerar muita força e velocidade, o aluno deve focar no aquecimento rigoroso antes dos treinos e em exercícios de flexibilidade para manter os músculos longos, elásticos e protegidos contra estiramentos.", recommendation: "Parabenizamos pelo excelente vigor físico. Seguiremos oferecendo desafios de alta intensidade em aula para manter o aluno motivado e saudável." }
      ],
      forca_muscular: [
        { id: "f1", level: "INSUFICIENTE", alertColor: "rose", healthStatus: "A capacidade de vencer resistências e sustentar o próprio corpo está abaixo do esperado. Na saúde, a falta de tônus muscular gera sobrecarga direta sobre os ossos e ligamentos, além de causar cansaço extremo em tarefas simples, como carregar a mochila ou manter a postura na carteira escolar.", toImprove: "O aluno precisa desenvolver urgentemente a força de base. O foco inicial deve ser em exercícios calistênicos simples (que usam o peso do próprio corpo), como apoios de joelhos no chão e agachamentos livres adaptados, focando estritamente na execução correta para ganho de massa magra protetora.", recommendation: "Incentivamos atividades lúdicas de força em casa, como brincadeiras de cabo de guerra, escalar brinquedos de parquinho (gaiolas) ou jogos de carregar objetos leves." },
        { id: "f2", level: "REGULAR", alertColor: "yellow", healthStatus: "O aluno possui uma força muscular estável para as demandas diárias, mas que cansa com facilidade. Falta maior tônus na musculatura profunda, limitando a execução de esforços mais intensos e contínuos.", toImprove: "O foco deve ser o aumento de força por meio de exercícios de fortalecimento, controle corporal e sustentação.", recommendation: "Incentivamos atividades de força lúdicas e desafiadoras em ambiente domiciliar." },
        { id: "f3", level: "BOM", alertColor: "emerald", healthStatus: "Nível saudável e totalmente adequado para a idade. O aluno apresenta ótima densidade e tônus muscular, sustentando movimentos de impacto com segurança. Essa força atua como um escudo protetor para as articulações, acelerando o metabolismo e garantindo excelente postura corporal.", toImprove: "Embora o nível seja seguro, o aluno pode melhorar a simetria da força (equilíbrio entre o lado direito e esquerdo do corpo). Exercícios unilaterais ajudarão a refinar o movimento e preparar o corpo para a transição rumo ao nível excelente.", recommendation: "Parabenizamos pelo excelente suporte físico. Seguiremos com estímulos desafiadores em aula para manter a integridade da saúde muscular do estudante." },
        { id: "f4", level: "EXCELENTE", alertColor: "blue", healthStatus: "Desempenho físico excepcional. O aluno demonstra altíssima capacidade de gerar tensão muscular e potência. Seu sistema esquelético está totalmente protegido contra lesões por impacto, e a musculatura apresenta excelente eficiência metabólica e capacidade de recuperação.", toImprove: "O objetivo agora é zelar pela longevidade dessa performance. Recomenda-se associar o treino de força máxima a sessões rigorosas de alongamento e flexibilidade, evitando o encurtamento muscular e a perda de amplitude de movimento nas articulações.", recommendation: "Parabenizamos pelo excelente suporte físico. Seguiremos com estímulos desafiadores em aula para manter a integridade da saúde muscular do estudante." }
      ],
      agilidade: [
        { id: "a1", level: "INSUFICIENTE", alertColor: "rose", healthStatus: "A capacidade de mudar de direção rapidamente está abaixo do esperado. O aluno apresenta dificuldades para frear e reajustar o corpo com controle. Na saúde, a falta de agilidade e coordenação aumenta significativamente o risco de quedas, entorses de tornozelo e lesões nos ligamentos do joelho em movimentos bruscos.", toImprove: "O aluno precisa desenvolver urgentemente o tempo de reação e a consciência corporal. O foco inicial deve ser em exercícios de desaceleração controlada e educativos de passadas laterais, aprendendo a abaixar o centro de gravidade para ganhar estabilidade.", recommendation: "Incentivamos a prática de brincadeiras de rua tradicionais em casa, como pega-pega, queimada ou circuitos de zigue-zague desenhados no chão." },
        { id: "a2", level: "REGULAR", alertColor: "yellow", healthStatus: "O aluno consegue mudar de direção, mas perde o equilíbrio ou a velocidade durante o movimento. Há uma base motora funcional, mas falta eficiência nas articulações para transferir o peso corporal de um lado para o outro de forma fluida, gastando mais energia do que o necessário.", toImprove: "O foco deve ser o refinamento técnico. Recomenda-se treinar com circuitos de cones e escadas de agilidade para melhorar o trabalho de pés (footwork) e a transição rápida de movimentos, aumentando a segurança articular.", recommendation: "Incentivamos a prática de brincadeiras de rua tradicionais em casa, como pega-pega, queimada ou circuitos de zigue-zague desenhados no chão." },
        { id: "a3", level: "BOM", alertColor: "emerald", healthStatus: "Nível saudável e totalmente adequado para a faixa etária. O aluno demonstra ótimo controle corporal, consegue frear e mudar de rumo com segurança e estabilidade. Essa agilidade protege as articulações contra sobrecargas e reflete um sistema neuromuscular bem desenvolvido.", toImprove: "Embora o nível seja seguro e protetor, o aluno pode aprimorar a eficiência do movimento diminuindo o tempo de hesitação antes de mudar de direção. Introduzir estímulos visuais ou sonoros surpresa ajudará a refinar ainda mais o tempo de reação.", recommendation: "Parabenizamos pela excelente agilidade e prontidão motora. Continuaremos desafiando o estudante com dinâmicas complexas nas aulas." },
        { id: "a4", level: "EXCELENTE", alertColor: "blue", healthStatus: "Desempenho físico excepcional. O aluno apresenta uma velocidade de reação impressionante e um controle de centro de gravidade perfeito ao mudar de direção. Seu sistema proprioceptivo (capacidade do corpo de reconhecer a própria posição) é altamente eficaz, garantindo proteção máxima contra lesões.", toImprove: "O objetivo atual é manter essa alta performance. Recomenda-se integrar movimentos de agilidade com tomadas de decisão complexas e uso de implementos (como bolas), preparando o aluno para alto rendimento em cenários de jogo reais.", recommendation: "Parabenizamos pela excelente agilidade e prontidão motora. Continuaremos desafiando o estudante com dinâmicas complexas nas aulas." }
      ],
      abdomen: [
        { id: "ab1", level: "INSUFICIENTE", alertColor: "rose", healthStatus: "A resistência da região abdominal está abaixo do esperado. O core (centro de gravidade do corpo) fraco prejudica diretamente a postura, sobrecarrega a coluna lombar e aumenta o risco de dores nas costas e desvios posturais a médio prazo.", toImprove: "O aluno precisa iniciar urgentemente o fortalecimento da musculatura central. É necessário focar na ativação do abdômen através de exercícios estáticos simples, corrigindo a respiração e evitando puxar o pescoço durante a execução.", recommendation: "Incentivamos o estímulo diário através de desafios rápidos em casa, como brincadeiras que envolvam a posição de prancha ou elevação de pernas." },
        { id: "ab2", level: "REGULAR", alertColor: "yellow", healthStatus: "O aluno possui uma força abdominal básica, mas cansa muito rápido ao tentar manter o esforço. Essa fadiga precoce faz com que ele comece a compensar o movimento com outras partes do corpo, desestabilizando o tronco durante corridas e jogos.", toImprove: "O foco deve ser o aumento gradual do tempo de execução dos exercícios. Treinar a constância e o ritmo das repetições vai ajudar a estabilizar o tronco e proteger a coluna por períodos mais longos.", recommendation: "Incentivamos o preço ou estímulo diário através de desafios rápidos em casa, como brincadeiras que envolvam a posição de prancha ou elevação de pernas." },
        { id: "ab3", level: "BOM", alertColor: "emerald", healthStatus: "Nível saudável e dentro do padrão recomendado. O aluno apresenta boa sustentação do tronco, o que garante estabilidade corporal, melhora o equilíbrio e protege a região lombar contra os impactos gerados por saltos e corridas.", toImprove: "Embora o nível seja seguro, o aluno pode melhorar a simetria da força (equilíbrio entre o lado direito e esquerdo do corpo). Exercícios unilaterais ajudarão a refinar o movimento e preparar o corpo para a transição rumo ao nível excelente.", recommendation: "Parabenizamos pela excelente condição de saúde física. Manteremos os estímulos nas aulas para preservar esse ótimo suporte postural." },
        { id: "ab4", level: "EXCELENTE", alertColor: "blue", healthStatus: "Desempenho físico excepcional. O aluno possui excelente resistência muscular na região central do corpo. Isso resulta em uma postura impecável, altíssima eficiência de movimentos e proteção máxima da coluna vertebral sob qualquer tipo de carga ou esforço.", toImprove: "O objetivo agora é manter o padrão. Recomenda-se integrar la força desse abdômen com exercícios de flexibilidade e alongamento da cadeia posterior para evitar qualquer tipo de rigidez muscular.", recommendation: "Parabenizamos pela excelente condição de saúde física. Manteremos os estímulos nas aulas para preservar esse ótimo suporte postural." }
      ],
      impulsao: [
        { id: "i1", level: "INSUFICIENTE", alertColor: "rose", healthStatus: "O índice de impulsão está abaixo do esperado para a faixa etária. Isso indica baixa potência e falta de ativação dos músculos das pernas. Na saúde, isso compromete o amortecimento de impactos e enfraquece a estrutura das articulações do joelho e tornozelo.", toImprove: "O aluno precisa desenvolver urgentemente a força de arranque. É necessário corrigir a postura do agachamento e a mecânica do salto para evitar lesões em atividades simples do dia a dia.", recommendation: "Incentivamos o apoio em atividades dinâmicas em casa, como pular corda e brincadeiras de salto." },
        { id: "i2", level: "REGULAR", alertColor: "yellow", healthStatus: "O aluno possui uma base de força, mas falta explosão muscular. O rendimento físico oscila e gasta mais energia do que o necessário para executar saltos. A estrutura de saúde é estável, mas apresenta fadiga rápida em circuitos.", toImprove: "O foco deve ser a coordenação entre o movimento dos braços e pernas durante o salto. Exercícios repetitivos de saltos baixos vão ajudar a transformar a força atual em potência real.", recommendation: "Incentivamos o apoio em atividades dinâmicas em casa, como pular corda e brincadeiras de salto." },
        { id: "i3", level: "BOM", alertColor: "emerald", healthStatus: "O nível é saudável e adequado. O aluno apresenta boa resposta neuromuscular e consegue vencer a gravidade com facilidade. Essa condição protege a coluna e absorve impactos de forma segura durante jogos e corridas.", toImprove: "Embora esteja em um nível seguro, o aluno pode melhorar a estabilidade no momento da aterrissagem. O treinamento deve focar no equilíbrio para evoluir do nível bom para o excelente.", recommendation: "Parabenizamos pelo ótimo histórico físico. Continuaremos desafiando o estudante nas aulas para manter este padrão de excelência." },
        { id: "i4", level: "EXCELENTE", alertColor: "blue", healthStatus: "Desempenho físico excepcional. O aluno possui excelente potência de membros inferiores e coordenação motora impecável. O sistema musculoesquelético está altamente protegido e preparado para desafios físicos de alta intensidade.", toImprove: "O foco agora é a manutenção dessa valência. Recomenda-se o ganho de flexibilidade para que a alta potência não gere rigidez muscular.", recommendation: "Parabenizamos pelo ótimo histórico físico. Continuaremos desafiando o estudante nas aulas para manter este padrão de excelência." }
      ]
    };
  }, [m5FromDb]);
  const [refreshToggle, setRefreshToggle] = useState(false);

  const [backfilling, setBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{ done: number; total: number } | null>(null);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const [attendanceByStudent, setAttendanceByStudent] = useState<Record<string, { present: number; total: number }>>({});

  // Poll for changes in localStorage to keep data synced in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('educore_attendance_') || e.key?.startsWith('educore_perf_reports_')) {
        setRefreshToggle(prev => !prev);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const [savedReports, setSavedReports] = useState<PerformanceReport[]>([]);
  const [allSavedReports, setAllSavedReports] = useState<PerformanceReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [observationsSaved, setObservationsSaved] = useState(false);
  const [selectedStudentIdsForBatch, setSelectedStudentIdsForBatch] = useState<string[]>([]);
  
  // Clear batch selection when any filter changes
  useEffect(() => {
    setSelectedStudentIdsForBatch([]);
  }, [gradeFilter, contract, stateFilter, cityFilter, localityFilter]);

  const [, setReportToDelete] = useState<string | null>(null);

  // Load all saved reports across all students (for the submenu global dropdown)
  useEffect(() => {
    const loadAllReports = async () => {
      const localReports: PerformanceReport[] = [];
      if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('educore_perf_reports_')) {
            try {
              const stored = localStorage.getItem(key);
              if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                  localReports.push(...parsed);
                }
              }
            } catch (err) {
              console.error('Error scanning local reports:', err);
            }
          }
        }
      }

      // Sort desc by date
      localReports.sort((a, b) => safeGetTimestamp(b.createdAt || b.date) - safeGetTimestamp(a.createdAt || a.date));
      setAllSavedReports(localReports);

      if (isSupabaseConfigured) {
        try {
          const supabase = getDb();
          if (supabase) {
            const { data, error } = await supabase
              .from('performance_reports')
              .select('id, student_id, student_name, grade, focus_area, observations, report, date, evaluation_id, evaluation_result, created_at')
              .order('created_at', { ascending: false });

            if (!error && data) {
              const cloudReports: PerformanceReport[] = data.map((r: SupabasePerformanceRow) => ({
                id: r.id,
                studentId: r.student_id,
                studentName: r.student_name,
                grade: r.grade,
                focusArea: r.focus_area,
                observations: r.observations || '',
                report: r.report,
                date: r.date,
                evaluationId: r.evaluation_id || undefined,
                evaluationResult: r.evaluation_result || undefined,
                createdAt: r.created_at
              }));
              
              // Sync UP: envia ao banco qualquer relatório que exista só no local
              // (criado offline) antes de reconciliar o cache, para não perdê-lo.
              const cloudIds = new Set(cloudReports.map(r => r.id));
              const pendingUpload = localReports.filter(r => r.id && !cloudIds.has(r.id));
              if (pendingUpload.length > 0) {
                try {
                  await supabase.from('performance_reports').upsert(pendingUpload.map((r) => ({
                    id: r.id,
                    student_id: r.studentId,
                    student_name: r.studentName,
                    grade: r.grade,
                    focus_area: r.focusArea,
                    observations: r.observations || '',
                    report: r.report,
                    date: r.date,
                    evaluation_id: r.evaluationId || null,
                    evaluation_result: r.evaluationResult || null,
                    created_at: r.createdAt || new Date().toISOString(),
                  })));
                  cloudReports.push(...pendingUpload);
                } catch (e) {
                  console.error('Erro ao sincronizar relatórios locais pendentes:', e);
                }
              }

              // Clean up localStorage keys for student performance reports to match cloud exactly
              if (typeof window !== 'undefined') {
                const cloudReportsByStudent: Record<string, PerformanceReport[]> = {};
                cloudReports.forEach(r => {
                  if (r.studentId) {
                    if (!cloudReportsByStudent[r.studentId]) {
                      cloudReportsByStudent[r.studentId] = [];
                    }
                    cloudReportsByStudent[r.studentId].push(r);
                  }
                });

                // Iterate through localStorage keys and update or remove stale records
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.startsWith('educore_perf_reports_')) {
                    const studentId = key.replace('educore_perf_reports_', '');
                    const studentCloudReports = cloudReportsByStudent[studentId] || [];
                    localStorage.setItem(key, JSON.stringify(studentCloudReports));
                  }
                }
              }

              setAllSavedReports(cloudReports);
            }
          }
        } catch (err) {
          console.error('Error loading cloud reports:', err);
        }
      }
    };

    loadAllReports();
  }, [selectedStudentId, refreshToggle]);

  // Report history is scoped to the selected student only (kept lean; no filter-wide dump)
  const filteredAllSavedReports = useMemo(() => {
    if (!selectedStudentId) return [];
    return allSavedReports.filter(report => {
      // ONLY show reports for the currently selected student
      const studentObj = students.find(st => st.id === selectedStudentId);
      const matchesId = report.studentId === selectedStudentId;
      const matchesName = studentObj && report.studentName === studentObj.name;
      if (!matchesId && !matchesName) return false;

      const s = students.find(student => student.id === report.studentId || student.name === report.studentName);
      if (!s) {
        if (gradeFilter && report.grade !== gradeFilter) return false;
        return true;
      }
      
      if (contract && contract !== 'Todos') {
        const targetContractObj = availableContracts.find(c => c.id === contract);
        if (targetContractObj && s.contrato && s.contrato !== targetContractObj.name) return false;
      }
      if (stateFilter && stateFilter !== 'Todos' && s.estado !== stateFilter) return false;
      if (cityFilter && cityFilter !== 'Todos' && cityFilter !== 'Todas' && s.regiao !== cityFilter) return false;
      if (localityFilter && localityFilter !== 'Todos' && s.locality !== localityFilter) return false;
      if (gradeFilter && s.grade !== gradeFilter) return false;
      
      return true;
    });
  }, [allSavedReports, students, contract, stateFilter, cityFilter, localityFilter, gradeFilter, availableContracts, selectedStudentId]);

  // Data para exibicao em padrao brasileiro (dd/mm/aaaa), tolerante a ambos formatos.
  const toBrDate = (d: string): string => {
    if (!d) return '';
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
    const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(d);
    if (br) return `${br[1]}-${br[2]}-${br[3]}`;
    return d;
  };

  // Historico ordenado por dimensao (ordem do seletor) e depois pela data (mais antiga -> mais recente).
  const orderedHistoryReports = useMemo(() => {
    const order = (fa: string) => { const i = FOCUS_AREAS.indexOf(fa); return i === -1 ? 999 : i; };
    return [...filteredAllSavedReports].sort((a, b) => {
      const oa = order(a.focusArea), ob = order(b.focusArea);
      if (oa !== ob) return oa - ob;
      return safeGetTimestamp(a.date) - safeGetTimestamp(b.date);
    });
  }, [filteredAllSavedReports]);

  // Select a report globally from the submenu dropdown
  const handleSelectGlobalReport = (reportId: string) => {
    if (!reportId) {
      setSelectedReportId('');
      setAiReport(null);
      setFocusArea('Desempenho Escolar');
      setObservations('');
      return;
    }

    const reportObj = allSavedReports.find(r => r.id === reportId);
    if (reportObj) {
      setSelectedStudentId(reportObj.studentId);
      setSelectedReportId(reportId);
      setAiReport(reportObj.report);
      setFocusArea(reportObj.focusArea);
      setObservations(reportObj.observations || '');
      setReportToDelete(null);
    }
  };

  // Load saved performance reports for the selected student
  useEffect(() => {
    const loadReports = async () => {
      setSelectedReportId('');
      setReportToDelete(null);

      if (!selectedStudentId) {
        setSavedReports([]);
        return;
      }

      // Load from localStorage first
      let localReports: PerformanceReport[] = [];
      try {
        const stored = localStorage.getItem(`educore_perf_reports_${selectedStudentId}`);
        if (stored) {
          localReports = JSON.parse(stored);
        }
      } catch (err) {
        console.error('Erro ao ler relatórios locais:', err);
      }

      setSavedReports(localReports);

      // Fetch from Supabase if configured
      if (isSupabaseConfigured) {
        try {
          const supabase = getDb();
          if (supabase) {
            const { data, error } = await supabase
              .from('performance_reports')
              .select('id, student_id, student_name, grade, focus_area, observations, report, date, evaluation_id, evaluation_result, created_at')
              .eq('student_id', selectedStudentId)
              .order('created_at', { ascending: false });

            if (!error && data) {
              const cloudReports: PerformanceReport[] = data.map((r: SupabasePerformanceRow) => ({
                id: r.id,
                studentId: r.student_id,
                studentName: r.student_name,
                grade: r.grade,
                focusArea: r.focus_area,
                observations: r.observations || '',
                report: r.report,
                date: r.date,
                evaluationId: r.evaluation_id || undefined,
                evaluationResult: r.evaluation_result || undefined,
                createdAt: r.created_at
              }));

              setSavedReports(cloudReports);
              try {
                localStorage.setItem(`educore_perf_reports_${selectedStudentId}`, JSON.stringify(cloudReports));
              } catch (_) {}
            }
          }
        } catch (err) {
          console.error('Erro ao buscar relatórios do Supabase:', err);
        }
      }
    };

    loadReports();
  }, [selectedStudentId]);

  // Auto-load latest report for selected student + focusArea when reports load (Admin/Professor)
  useEffect(() => {
    if (user?.role === 'Aluno') return; // Student uses "Ver Meu Desempenho" button
    if (!selectedStudentId || !focusArea) return;

    // Fonte robusta: junta a lista global (carregada ao montar) com a do aluno.
    const pool = new Map<string, PerformanceReport>();
    allSavedReports.forEach(r => { if (r.studentId === selectedStudentId) pool.set(r.id, r); });
    savedReports.forEach(r => { if (r.studentId === selectedStudentId) pool.set(r.id, r); });
    const studentReports = Array.from(pool.values());

    // Seleciona o relatório da AVALIAÇÃO atualmente escolhida (não o 1º da dimensão)
    let evalId = '';
    const fa = focusArea || '';
    if (fa === 'Desempenho Corporal' || fa === 'Avaliação de IMC') evalId = selectedImcId;
    else if (fa === 'Desempenho de Capacidades Físicas' || fa === 'Desempenho de capacidades físicas' || fa === 'Qualidade Motora') evalId = selectedMotorId;
    else if (fa === 'Desempenho em Atividades Esportivas' || fa === 'Avaliação Esportiva') evalId = selectedSportId;
    else if (fa === 'Desempenho Vocacional' || fa === 'Desempenho vocacional' || fa === 'Perfil Vocacional') evalId = selectedVocationId;
    else if (fa === 'Desempenho Saúde Global') evalId = selectedHealthId;
    else if (fa === 'Desempenho Higiene Bucal') evalId = selectedOralId;
    else if (fa === 'Desempenho Autoconceito') evalId = selectedAutoId;
    else if (fa === 'Desempenho Índice Alimentar') evalId = selectedIasId;
    else if (fa === 'Desempenho Rastreamento TDAH') evalId = selectedSnapId;
    else if (fa === 'Desempenho Rastreamento Precoce do TEA') evalId = selectedAq10Id;

    const matched = evalId
      ? studentReports.find(r => r.id === `REP-${evalId}` || r.evaluationId === evalId)
      : studentReports.find(r => r.focusArea === focusArea);
    if (matched) {
      setAiReport(matched.report);
      setSelectedReportId(matched.id);
    } else {
      setAiReport(null);
      setSelectedReportId('');
    }
  }, [savedReports, allSavedReports, focusArea, selectedStudentId, user, selectedImcId, selectedMotorId, selectedSportId, selectedVocationId, selectedHealthId, selectedOralId, selectedAutoId, selectedIasId, selectedSnapId, selectedAq10Id]);

  // Calculate attendance frequency and load Módulo 3 Analysis when student is selected or data changes
  useEffect(() => {
    const calculateFrequencies = async () => {
      if (!selectedStudentId) {
        setAttendanceRate(null);
        setPresenceCount(0);
        setTotalCount(0);
        setM3Analysis(null);
        return;
      }

      const studentObj = students.find(s => s.id === selectedStudentId);
      if (!studentObj) return;

      // 1. Calculate Attendance Rate
      let totalDays = 0;
      let presenceDays = 0;

      // Track dates to avoid duplicates if syncing between local and cloud
      const processedDates = new Set<string>();

      // Fetch from Supabase if configured
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('attendance_records')
              .select('date, present')
              .eq('student_id', selectedStudentId);

            if (!error && data) {
              data.forEach((row: SupabaseAttendanceRow) => {
                totalDays++;
                if (row.present) {
                  presenceDays++;
                }
                processedDates.add(row.date);
              });
            }
          } catch (err) {
            console.error('Erro ao buscar frequência do Supabase:', err);
          }
        }
      }

      // Fallback/Merge with localStorage
      try {
        Object.entries(localStorage).forEach(([key, val]) => {
          if (key.startsWith('educore_attendance_')) {
            try {
              const parts = key.split('_');
              const dateStr = parts[parts.length - 1]; // format YYYY-MM-DD
              
              // Skip if already processed from Supabase
              if (processedDates.has(dateStr)) return;

              const attendanceData = JSON.parse(val || '{}');
              if (attendanceData[selectedStudentId] !== undefined) {
                totalDays++;
                if (attendanceData[selectedStudentId]) {
                  presenceDays++;
                }
                processedDates.add(dateStr);
              }
            } catch (_e) {
              // ignore
            }
          }
        });
      } catch (e) {
        console.error('Erro ao calcular frequência local:', e);
      }

      setPresenceCount(presenceDays);
      setTotalCount(totalDays);
      setAttendanceRate(totalDays > 0 ? (presenceDays / totalDays) * 100 : null);

      // 2. Load Módulo 3 Analysis
      try {
        const stored = localStorage.getItem('educore_analise_frequencia');
        if (stored) {
          const analyses = JSON.parse(stored);
          const studentAnalysis = analyses
            .filter((a: M3Analysis) => a.studentId === selectedStudentId)
            .sort((a: M3Analysis, b: M3Analysis) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
          setM3Analysis(studentAnalysis || null);
        }
      } catch (e) {
        console.error('Erro ao buscar análise do Módulo 3:', e);
      }

      // 3. Load IMC Records (banco via props -> fallback localStorage)
      if (imcRecordsProp && imcRecordsProp.length > 0) {
        setImcRecords(imcRecordsProp.filter(r => r.studentId === selectedStudentId));
      } else {
        try {
          const storedImc = localStorage.getItem('educore_avaliacoes_imc');
          if (storedImc) {
            const allImc = JSON.parse(storedImc);
            const studentImcs = allImc.filter((r: ImcRecord) => r.studentId === selectedStudentId);
            setImcRecords(studentImcs);
          } else {
            setImcRecords([]);
          }
        } catch (e) {
          console.error('Erro ao buscar registros de IMC:', e);
        }
      }

      // Load Motor Records (Qualidade Motora) (banco via props -> fallback localStorage)
      if (motorRecordsProp && motorRecordsProp.length > 0) {
        setMotorRecords(motorRecordsProp.filter(r => r.studentId === selectedStudentId));
      } else {
        try {
          const storedMotor = localStorage.getItem('educore_avaliacoes_motor');
          if (storedMotor) {
            const allMotor = JSON.parse(storedMotor);
            const studentMotors = allMotor.filter((r: MotorRecord) => r.studentId === selectedStudentId);
            setMotorRecords(studentMotors);
          } else {
            setMotorRecords([]);
          }
        } catch (e) {
          console.error('Erro ao buscar registros de Qualidade Motora:', e);
        }
      }

      // 4. Load Módulo 4 IMC data (banco -> localStorage -> default)
      let m4Loaded = false;
      if (isSupabaseConfigured) {
        const sb = getDb();
        if (sb) {
          try {
            const { data, error } = await sb.from('m4_imc_config').select('id, classification, status, alert_color, description');
            if (!error && data && data.length > 0) {
              setM4ImcData(data.map((r: { id: string; classification: string; status: string | null; alert_color: string | null; description: string | null }) => ({
                id: r.id, classification: r.classification, status: r.status ?? '', alertColor: r.alert_color ?? 'emerald', description: r.description ?? '',
              })));
              m4Loaded = true;
            }
          } catch (e) {
            console.error('Erro ao buscar m4_imc_config:', e);
          }
        }
      }
      if (!m4Loaded) {
        try {
          const storedM4 = localStorage.getItem('educore_m4_imc_data');
          if (storedM4) {
            setM4ImcData(JSON.parse(storedM4));
          } else {
          // Defaults if not found
          setM4ImcData([
            { id: '1', classification: 'Peso normal', status: 'IMC Ideal', alertColor: 'emerald', description: 'O aluno apresenta uma composição corporal excelente e adequada para a sua faixa etária. Esta condição favorece diretamente o rendimento cardiovascular, permitindo treinos de maior intensidade com excelente recuperação física e menor risco de lesões.' },
            { id: '2', classification: 'Abaixo do Peso', status: 'Atenção Nutricional', alertColor: 'yellow', description: 'O índice sinaliza a necessidade de atenção nutricional. A falta de massa magra ou reserva energética pode limitar a força muscular e a resistência do aluno em atividades de longa duração, gerando fadiga precoce.' },
            { id: '3', classification: 'Sobrepeso', status: 'Excesso Leve', alertColor: 'orange', description: 'O indicador aponta um leve excesso de peso para a estrutura corporal. Esse quadro exige maior esforço das articulações em treinos de impacto, mas pode ser equalizado rapidamente com o aumento da frequência e intensidade dos treinos esportivos.' },
            { id: '4', classification: 'Obesidade', status: 'Fator de Risco', alertColor: 'rose', description: 'O índice indica um fator de risco para a saúde cardiovascular e articular. Recomenda-se um plano de atividades físicas de baixo impacto (como natação ou caminhadas aceleradas) associado a um acompanhamento nutricional para garantir a segurança e o bem-estar do aluno.' },
          ]);
        }
      } catch (e) {
        console.error('Erro ao buscar dados do Módulo 4:', e);
        }
      }

      // 5. Load Sport Records (Esporte Indicado) (banco via props -> fallback localStorage)
      if (sportRecordsProp && sportRecordsProp.length > 0) {
        setSportRecords(sportRecordsProp.filter(r => r.studentId === selectedStudentId));
      } else {
        try {
          const storedSport = localStorage.getItem('educore_avaliacoes_sport');
          if (storedSport) {
            const allSport = JSON.parse(storedSport);
            const studentSports = allSport.filter((r: SportRecord) => r.studentId === selectedStudentId);
            setSportRecords(studentSports);
          } else {
            setSportRecords([]);
          }
        } catch (e) {
          console.error('Erro ao buscar registros de Esporte Indicado:', e);
        }
      }

      // 6. Load Módulo 6 Modalidades (banco -> localStorage -> default)
      let m6mLoaded = false;
      if (isSupabaseConfigured) {
        const sb = getDb();
        if (sb) {
          try {
            const { data, error } = await sb.from('m6_modalidades_direcionamento').select('id, name, valencias, condition, report');
            if (!error && data && data.length > 0) {
              setM6Modalidades(data.map((r: { id: string; name: string; valencias: string | null; condition: string | null; report: string | null }) => ({
                id: r.id, name: r.name, valencias: r.valencias ?? '', condition: r.condition ?? '', report: r.report ?? '',
              })));
              m6mLoaded = true;
            }
          } catch (e) {
            console.error('Erro ao buscar m6_modalidades_direcionamento:', e);
          }
        }
      }
      if (!m6mLoaded) {
        try {
        const storedM6M = localStorage.getItem('educore_m6_modalidades');
        if (storedM6M) {
          setM6Modalidades(JSON.parse(storedM6M));
        } else {
          setM6Modalidades([
            { id: "m6_b1", name: "BASQUETE", valencias: "Impulsão, Agilidade e Velocidade.", condition: "Níveis Bom / Excelente em Impulsão e Velocidade", report: "Identifico uma alta aptidão biomecânica para a modalidade. O(A) estudante demonstra facilidade natural para ações de transição rápida, verticalidade em rebotes e infiltrações explosivas." },
            { id: "m6_b2", name: "BASQUETE", valencias: "Impulsão, Agilidade e Velocidade.", condition: "Níveis Insuficiente / Regular em Agilidade ou Impulsão", report: "Observo restrições funcionais em quadra. A falta de agilidade compromete a marcação defensiva e a baixa impulsão limita o raio de ação em jogadas aéreas." },
            { id: "m6_b3", name: "BASQUETE", valencias: "Impulsão, Agilidade e Velocidade.", condition: "Qualquer Nível (Alerta de Core)", report: "O basquete exige desacelerações bruscas e saltos contínuos. Caso a musculatura do abdômen esteja fraca, as forças de impacto serão transferidas para a coluna lombar, aumentando o risco de microlesões discais." },
            { id: "m6_g1", name: "GINÁSTICA (Artística / Rítmica)", valencias: "Abdômen, Força Muscular e Agilidade.", condition: "Níveis Bom / Excelente em Abdômen e Força Muscular", report: "O(A) estudante possui o tônus muscular necessário para sustentar o próprio peso corporal e executar giros, equilíbrios e acrobacias com o alinhamento postural exigido." },
            { id: "m6_g2", name: "GINÁSTICA (Artística / Rítmica)", valencias: "Abdômen, Força Muscular e Agilidade.", condition: "Níveis Insuficiente / Regular em Abdômen ou Força Muscular", report: "Constato déficit de sustentação básica. A fraqueza do core impede o controle corporal no espaço, gerando movimentos compensatórios e desalinhados." },
            { id: "m6_g3", name: "GINÁSTICA (Artística / Rítmica)", valencias: "Abdômen, Força Muscular e Agilidade.", condition: "Qualquer Nível (Alerta de Core)", report: "Na ginástica, o abdômen funciona como o centro de estabilização. Níveis baixos nesta área expõem as articulações dos ombros e joelhos a sobrecargas severas no momento das aterrissagens." },
            { id: "m6_h1", name: "HANDEBOL", valencias: "Velocidade, Agilidade e Força Muscular.", condition: "Níveis Bom / Excelente em Velocidade e Força Muscular", report: "Registro um perfil altamente competitivo para o handebol. Há potência mecânica para arremessos de longa distância e velocidade de arranque para quebrar as linhas de defesa." },
            { id: "m6_h2", name: "HANDEBOL", valencias: "Velocidade, Agilidade e Força Muscular.", condition: "Níveis Insuficiente / Regular em Agilidade ou Velocidade", report: "Noto prejuízo nas transições táticas. O(A) jovem apresenta lentidão para recompor a defesa ou realizar fintas rápidas em pequenos espaços." },
            { id: "m6_h3", name: "HANDEBOL", valencias: "Velocidade, Agilidade e Força Muscular.", condition: "Qualquer Nível (Alerta Cardiovascular)", report: "Esta modalidade impõe um regime anaeróbico estrito. Índices baixos de velocidade e força muscular indicam fadiga cardiovascular precoce e lentidão na recuperação pós-esforço." },
            { id: "m6_f1", name: "FUTEBOL / FUTSAL", valencias: "Velocidade, Agilidade e Impulsão.", condition: "Níveis Bom / Excelente em Velocidade e Agilidade", report: "Evidencio excelente capacidade de drible e condução. O(A) estudante consegue alterar o centro de gravidade bruscamente sem perder a estabilidade dinâmica." },
            { id: "m6_f2", name: "FUTEBOL / FUTSAL", valencias: "Velocidade, Agilidade e Impulsão.", condition: "Níveis Insuficiente / Regular em Agilidade ou Velocidade", report: "Há limitação na proteção de bola e no acompanhamento de atacantes adversários, resultando em reações motoras atrasadas." },
            { id: "m6_f3", name: "FUTEBOL / FUTSAL", valencias: "Velocidade, Agilidade e Impulsão.", condition: "Qualquer Nível (Alerta Ligamentar)", report: "O futebol apresenta alto índice de lesões ligamentares. Níveis baixos de agilidade associados a articulações desprotegidas elevam o risco de entorses de joelho e tornozelo durante mudanças de direção." },
            { id: "m6_v1", name: "VÔLEI", valencias: "Impulsão, Agilidade e Abdômen.", condition: "Níveis Bom / Excelente em Impulsão e Agilidade", report: "Avalio ótima aptidão para ações na rede (ataque/bloqueio) e excelente tempo de reação para coberturas defensivas no solo." },
            { id: "m6_v2", name: "VÔLEI", valencias: "Impulsão, Agilidade e Abdômen.", condition: "Níveis Insuficiente / Regular em Impulsão", report: "O alcance vertical do(a) estudante fica comprometido, limitando sua eficiência tática e participação ativa nas fases aéreas do jogo." },
            { id: "m6_v3", name: "VÔLEI", valencias: "Impulsão, Agilidade e Abdômen.", condition: "Qualquer Nível (Alerta Articular)", report: "A mecânica do vôlei gera alto estresse nas estruturas inferiores. Se a força de aterrissagem for ruim devido a índices baixos de impulsão e força, há predisposição ao desenvolvimento de tendinite patelar." },
            { id: "m6_l1", name: "LUTAS / ARTES MARCIAIS", valencias: "Força Muscular, Abdômen e Agilidade.", condition: "Níveis Bom / Excelente em Força Muscular e Abdômen", report: "O(A) jovem demonstra excelente base de sustentação corporal, capacidade de gerar tração mecânica e manter o equilíbrio sob pressão de forças externas." },
            { id: "m6_l2", name: "LUTAS / ARTES MARCIAIS", valencias: "Força Muscular, Abdômen e Agilidade.", condition: "Níveis Insuficiente / Regular em Força Muscular", report: "Percebo fadiga muscular precoce dos membros superiores e tronco, reduzindo a eficiência em golpes que exigem potência ou manutenção de pegada." },
            { id: "m6_l3", name: "LUTAS / ARTES MARCIAIS", valencias: "Força Muscular, Abdômen e Agilidade.", condition: "Qualquer Nível (Alerta de Core)", report: "O complexo abdominal e lombar fraco expõe a coluna a vetores de rotação perigosos. O fortalecimento desta zona é crucial para blindar as vértebras contra os impactos e quedas inerentes à modalidade." },
            { id: "m6_a1", name: "ATLETISMO (Corridas e Saltos)", valencias: "Velocidade, Impulsão e Força Muscular.", condition: "Níveis Bom / Excelente em Velocidade e Impulsão", report: "Diagnostico um padrão de corrida eficiente com excelente aproveitamento elétrico dos músculos (ciclo alongamento-encurtamento), ideal para provas explosivas e saltos." },
            { id: "m6_a2", name: "ATLETISMO (Corridas e Saltos)", valencias: "Velocidade, Impulsão e Força Muscular.", condition: "Níveis Insuficiente / Regular em Velocidade ou Impulsão", report: "O(A) estudante apresenta uma mecânica de passada pesada, baixo tempo de voo e lentidão no bloco de partida." },
            { id: "m6_a3", name: "ATLETISMO (Corridas e Saltos)", valencias: "Velocidade, Impulsão e Força Muscular.", condition: "Qualquer Nível (Alerta Tibial)", report: "O gesto repetitivo do atletismo exige dissipação de impacto eficiente. Níveis insuficientes de força muscular transferem o estresse mecânico para a tíbia, podendo desencadear quadros de periostite (canelite)." },
            { id: "m6_n1", name: "NATAÇÃO", valencias: "Força Muscular, Abdômen e Velocidade.", condition: "Níveis Bom / Excelente em Força Muscular e Abdômen", report: "O(A) estudante mantém uma posição hidrodinâmica impecável na água, gerando braçadas potentes e reduzindo o arrasto frontal do corpo." },
            { id: "m6_n2", name: "NATAÇÃO", valencias: "Força Muscular, Abdômen e Velocidade.", condition: "Níveis Insuficiente / Regular em Abdômen", report: "Observo uma quebra na linha de flutuação; o quadril afunda durante o nado, o que aumenta a resistência da água e sobrecarrega a articulação dos ombros." },
            { id: "m6_n3", name: "NATAÇÃO", valencias: "Força Muscular, Abdômen e Velocidade.", condition: "Qualquer Nível (Alerta de Recondicionamento)", report: "Sendo um esporte de baixo impacto articular, é o ambiente ideal para recondicionamento. Níveis fracos nesta área encontram na natação uma via segura para expandir a capacidade pulmonar e corrigir assimetrias posturais." }
          ]);
        }
      } catch (e) {
        console.error('Erro ao buscar m6Modalidades:', e);
        }
      }

      // 7. Load Módulo 6 Diretrizes (banco -> localStorage -> default)
      let m6dLoaded = false;
      if (isSupabaseConfigured) {
        const sb = getDb();
        if (sb) {
          try {
            const { data, error } = await sb.from('m6_diretrizes_intervencao').select('id, diretriz, criterio, conduta, objetivo');
            if (!error && data && data.length > 0) {
              setM6Diretrizes(data.map((r: { id: string; diretriz: string | null; criterio: string | null; conduta: string | null; objetivo: string | null }) => ({
                id: r.id, diretriz: r.diretriz ?? '', criterio: r.criterio ?? '', conduta: r.conduta ?? '', objetivo: r.objetivo ?? '',
              })));
              m6dLoaded = true;
            }
          } catch (e) {
            console.error('Erro ao buscar m6_diretrizes_intervencao:', e);
          }
        }
      }
      if (!m6dLoaded) {
        try {
        const storedM6D = localStorage.getItem('educore_m6_diretrizes');
        if (storedM6D) {
          setM6Diretrizes(JSON.parse(storedM6D));
        } else {
          setM6Diretrizes([
            { id: "m6_d1", diretriz: "APRIMORAR HABILIDADES MOTORAS", criterio: "Esta via deve ser adotada se três ou mais valências físicas estiverem em níveis Insuficiente ou Regular.", conduta: "Desaconselho totalmente a especialização precoce em esportes com regras rígidas ou alta demanda competitiva neste momento. O foco pedagógico deve migrar para circuitos funcionais multiesportivos, jogos cooperativos e estimulação motora de base.", objetivo: "O foco exclusivo deste direcionamento é restaurar a integridade física do(a) jovem. Buscaremos o ganho de massa magra, ativação do tônus postural e melhora da coordenação global para que seu corpo esteja preparado e protegido antes de ser exposto a cargas esportivas avançadas." }
          ]);
        }
      } catch (e) {
        console.error('Erro ao buscar m6Diretrizes:', e);
        }
      }

      // 8. Load Vocational Records (Vocacionamento) (banco via props -> fallback localStorage)
      if (vocationalRecordsProp && vocationalRecordsProp.length > 0) {
        setVocationRecords(vocationalRecordsProp.filter(r => r.studentId === selectedStudentId));
      } else {
        try {
          const storedVoc = localStorage.getItem('educore_avaliacoes_vocation');
          if (storedVoc) {
            const allVoc = JSON.parse(storedVoc);
            const studentVocs = allVoc.filter((r: VocationalRecord) => r.studentId === selectedStudentId);
            setVocationRecords(studentVocs);
          } else {
            setVocationRecords([]);
          }
        } catch (e) {
          console.error('Erro ao buscar registros de Vocacionamento:', e);
        }
      }

      // 8b. Load Saude Global Records (props -> fallback localStorage)
      if (healthRecordsProp && healthRecordsProp.length > 0) {
        setHealthRecords(healthRecordsProp.filter(r => r.studentId === selectedStudentId));
      } else {
        try {
          const storedHealth = localStorage.getItem('educore_avaliacoes_health');
          if (storedHealth) {
            const allHealth = JSON.parse(storedHealth);
            setHealthRecords(allHealth.filter((r: HealthRecord) => r.studentId === selectedStudentId));
          } else {
            setHealthRecords([]);
          }
        } catch (e) {
          console.error('Erro ao buscar registros de Saúde Global:', e);
        }
      }

      // 8c. Load Modulo 9 pareceres (banco -> localStorage -> default)
      let m9Loaded = false;
      if (isSupabaseConfigured) {
        const sb = getDb();
        if (sb) {
          try {
            const { data, error } = await sb.from('m9_perfis_pareceres').select('id, classification, basic_data, reflection');
            if (!error && data && data.length > 0) {
              setM9Rows(data.map((r: { id: string; classification: string; basic_data: string | null; reflection: string | null }) => ({
                id: r.id, classification: r.classification, basicData: r.basic_data ?? '', reflection: r.reflection ?? '',
              })));
              m9Loaded = true;
            }
          } catch (e) {
            console.error('Erro ao buscar m9_perfis_pareceres:', e);
          }
        }
      }
      if (!m9Loaded) {
        try {
          const storedM9 = localStorage.getItem('educore_m9_perfis_pareceres');
          if (storedM9) {
            setM9Rows(JSON.parse(storedM9));
          }
        } catch (e) {
          console.error('Erro ao buscar m9Rows do localStorage:', e);
        }
      }

      // 8d. Load Higiene Bucal Records (props -> fallback localStorage)
      if (oralRecordsProp && oralRecordsProp.length > 0) {
        setOralRecords(oralRecordsProp.filter(r => r.studentId === selectedStudentId));
      } else {
        try {
          const storedOral = localStorage.getItem('educore_avaliacoes_oral');
          if (storedOral) {
            const allOral = JSON.parse(storedOral);
            setOralRecords(allOral.filter((r: OralRecord) => r.studentId === selectedStudentId));
          } else {
            setOralRecords([]);
          }
        } catch (e) {
          console.error('Erro ao buscar registros de Higiene Bucal:', e);
        }
      }

      // 8e. Load Modulo 10 pareceres (banco -> localStorage)
      let m10Loaded = false;
      if (isSupabaseConfigured) {
        const sb = getDb();
        if (sb) {
          try {
            const { data, error } = await sb.from('m10_perfis_pareceres').select('id, classification, basic_data, reflection');
            if (!error && data && data.length > 0) {
              setM10Rows(data.map((r: { id: string; classification: string; basic_data: string | null; reflection: string | null }) => ({
                id: r.id, classification: r.classification, basicData: r.basic_data ?? '', reflection: r.reflection ?? '',
              })));
              m10Loaded = true;
            }
          } catch (e) {
            console.error('Erro ao buscar m10_perfis_pareceres:', e);
          }
        }
      }
      if (!m10Loaded) {
        try {
          const storedM10 = localStorage.getItem('educore_m10_perfis_pareceres');
          if (storedM10) {
            setM10Rows(JSON.parse(storedM10));
          }
        } catch (e) {
          console.error('Erro ao buscar m10Rows do localStorage:', e);
        }
      }

      // 8f. Load Autoconceito Records (props -> fallback localStorage)
      if (autoconceptRecordsProp && autoconceptRecordsProp.length > 0) {
        setAutoconceptRecords(autoconceptRecordsProp.filter(r => r.studentId === selectedStudentId));
      } else {
        try {
          const storedAuto = localStorage.getItem('educore_avaliacoes_autoconcept');
          if (storedAuto) {
            const allAuto = JSON.parse(storedAuto);
            setAutoconceptRecords(allAuto.filter((r: AutoconceptRecord) => r.studentId === selectedStudentId));
          } else {
            setAutoconceptRecords([]);
          }
        } catch (e) {
          console.error('Erro ao buscar registros de Autoconceito:', e);
        }
      }

      // 8g. Load Modulo 11 pareceres (banco -> localStorage)
      let m11Loaded = false;
      if (isSupabaseConfigured) {
        const sb = getDb();
        if (sb) {
          try {
            const { data, error } = await sb.from('m11_perfis_pareceres').select('id, classification, basic_data, reflection');
            if (!error && data && data.length > 0) {
              setM11Rows(data.map((r: { id: string; classification: string; basic_data: string | null; reflection: string | null }) => ({
                id: r.id, classification: r.classification, basicData: r.basic_data ?? '', reflection: r.reflection ?? '',
              })));
              m11Loaded = true;
            }
          } catch (e) {
            console.error('Erro ao buscar m11_perfis_pareceres:', e);
          }
        }
      }
      if (!m11Loaded) {
        try {
          const storedM11 = localStorage.getItem('educore_m11_perfis_pareceres');
          if (storedM11) {
            setM11Rows(JSON.parse(storedM11));
          }
        } catch (e) {
          console.error('Erro ao buscar m11Rows do localStorage:', e);
        }
      }

      // 8h. Load Indice Alimentar Records (props -> fallback localStorage)
      if (iasRecordsProp && iasRecordsProp.length > 0) {
        setIasRecords(iasRecordsProp.filter(r => r.studentId === selectedStudentId));
      } else {
        try {
          const storedIas = localStorage.getItem('educore_avaliacoes_ias');
          if (storedIas) {
            const allIas = JSON.parse(storedIas);
            setIasRecords(allIas.filter((r: IasRecord) => r.studentId === selectedStudentId));
          } else {
            setIasRecords([]);
          }
        } catch (e) {
          console.error('Erro ao buscar registros de Índice Alimentar:', e);
        }
      }

      // 8h2. Load SNAP-IV (Rastreamento TDAH) Records (props -> fallback localStorage)
      if (snapRecordsProp && snapRecordsProp.length > 0) {
        setSnapRecords(snapRecordsProp.filter(r => r.studentId === selectedStudentId));
      } else {
        try {
          const storedSnap = localStorage.getItem('educore_avaliacoes_snap');
          if (storedSnap) {
            const allSnap = JSON.parse(storedSnap);
            setSnapRecords(allSnap.filter((r: SnapRecord) => r.studentId === selectedStudentId));
          } else {
            setSnapRecords([]);
          }
        } catch (e) {
          console.error('Erro ao buscar registros de Rastreamento do TDAH:', e);
        }
      }

      // 8h3. Load AQ-10 (Rastreamento Precoce do TEA) Records (props -> fallback localStorage)
      if (aq10RecordsProp && aq10RecordsProp.length > 0) {
        setAq10Records(aq10RecordsProp.filter(r => r.studentId === selectedStudentId));
      } else {
        try {
          const storedAq10 = localStorage.getItem('educore_avaliacoes_aq10');
          if (storedAq10) {
            const allAq10 = JSON.parse(storedAq10);
            setAq10Records(allAq10.filter((r: Aq10Record) => r.studentId === selectedStudentId));
          } else {
            setAq10Records([]);
          }
        } catch (e) {
          console.error('Erro ao buscar registros de Rastreamento Precoce do TEA:', e);
        }
      }

      // 8h4. Load Qualidade Motora PCD Records (props -> fallback localStorage)
      if (pcdRecordsProp && pcdRecordsProp.length > 0) {
        setPcdRecords(pcdRecordsProp.filter(r => r.studentId === selectedStudentId));
      } else {
        try {
          const storedPcd = localStorage.getItem('educore_avaliacoes_pcd');
          if (storedPcd) {
            const allPcd = JSON.parse(storedPcd);
            setPcdRecords(allPcd.filter((r: PcdRecord) => r.studentId === selectedStudentId));
          } else {
            setPcdRecords([]);
          }
        } catch (e) {
          console.error('Erro ao buscar registros de Qualidade Motora PCD:', e);
        }
      }

      // 8i. Load Modulo 12 pareceres (banco -> localStorage)
      let m12Loaded = false;
      if (isSupabaseConfigured) {
        const sb = getDb();
        if (sb) {
          try {
            const { data, error } = await sb.from('m12_perfis_pareceres').select('id, classification, basic_data, reflection');
            if (!error && data && data.length > 0) {
              setM12Rows(data.map((r: { id: string; classification: string; basic_data: string | null; reflection: string | null }) => ({
                id: r.id, classification: r.classification, basicData: r.basic_data ?? '', reflection: r.reflection ?? '',
              })));
              m12Loaded = true;
            }
          } catch (e) {
            console.error('Erro ao buscar m12_perfis_pareceres:', e);
          }
        }
      }
      if (!m12Loaded) {
        try {
          const storedM12 = localStorage.getItem('educore_m12_perfis_pareceres');
          if (storedM12) {
            setM12Rows(JSON.parse(storedM12));
          }
        } catch (e) {
          console.error('Erro ao buscar m12Rows do localStorage:', e);
        }
      }

      // 8i2. Load Modulo 13 pareceres (banco -> localStorage)
      let m13Loaded = false;
      if (isSupabaseConfigured) {
        const sb = getDb();
        if (sb) {
          try {
            const { data, error } = await sb.from('m13_perfis_pareceres').select('id, classification, basic_data, reflection');
            if (!error && data && data.length > 0) {
              setM13Rows(data.map((r: { id: string; classification: string; basic_data: string | null; reflection: string | null }) => ({
                id: r.id, classification: r.classification, basicData: r.basic_data ?? '', reflection: r.reflection ?? '',
              })));
              m13Loaded = true;
            }
          } catch (e) {
            console.error('Erro ao buscar m13_perfis_pareceres:', e);
          }
        }
      }
      if (!m13Loaded) {
        try {
          const storedM13 = localStorage.getItem('educore_m13_perfis_pareceres');
          if (storedM13) {
            setM13Rows(JSON.parse(storedM13));
          }
        } catch (e) {
          console.error('Erro ao buscar m13Rows do localStorage:', e);
        }
      }

      // 8i3. Load Modulo 14 pareceres (banco -> localStorage)
      let m14Loaded = false;
      if (isSupabaseConfigured) {
        const sb = getDb();
        if (sb) {
          try {
            const { data, error } = await sb.from('m14_perfis_pareceres').select('id, classification, basic_data, reflection');
            if (!error && data && data.length > 0) {
              setM14Rows(data.map((r: { id: string; classification: string; basic_data: string | null; reflection: string | null }) => ({
                id: r.id, classification: r.classification, basicData: r.basic_data ?? '', reflection: r.reflection ?? '',
              })));
              m14Loaded = true;
            }
          } catch (e) {
            console.error('Erro ao buscar m14_perfis_pareceres:', e);
          }
        }
      }
      if (!m14Loaded) {
        try {
          const storedM14 = localStorage.getItem('educore_m14_perfis_pareceres');
          if (storedM14) {
            setM14Rows(JSON.parse(storedM14));
          }
        } catch (e) {
          console.error('Erro ao buscar m14Rows do localStorage:', e);
        }
      }

      // 9. Load Módulo 7 Rows (banco -> localStorage -> default)
      let m7Loaded = false;
      if (isSupabaseConfigured) {
        const sb = getDb();
        if (sb) {
          try {
            const { data, error } = await sb.from('m7_perfis_pareceres').select('id, profile, component, basic_data, reflection');
            if (!error && data && data.length > 0) {
              setM7Rows(data.map((r: { id: string; profile: string; component: string; basic_data: string | null; reflection: string | null }) => ({
                id: r.id, profile: r.profile, component: r.component, basicData: r.basic_data ?? '', reflection: r.reflection ?? '',
              })));
              m7Loaded = true;
            }
          } catch (e) {
            console.error('Erro ao buscar m7_perfis_pareceres:', e);
          }
        }
      }
      if (!m7Loaded) {
        try {
        const storedM7 = localStorage.getItem('educore_m7_rows');
        if (storedM7) {
          setM7Rows(JSON.parse(storedM7));
        } else {
          setM7Rows([
            {
              id: "m7_1",
              profile: "Criativo e Tecnológico (Perfil Híbrido)",
              component: "Mapa de Perfis e Carreiras",
              basicData: "Vocação para ambientes inovadores. Potencial para atuar com design de jogos ou desenvolvimento web.",
              reflection: "Identifico no(a) estudante uma mente que opera na intersecção entre a lógica estruturada e a sensibilidade estética. Sua grande vantagem competitiva é a capacidade de humanizar a tecnologia. Áreas como o design de jogos e o desenvolvimento web exigem exatamente essa flexibilidade, pois demandam alguém capaz de compreender códigos complexos sem perder de vista a experiência, a beleza e a interatividade necessárias para o usuário final."
            },
            {
              id: "m7_2",
              profile: "Criativo e Tecnológico (Perfil Híbrido)",
              component: "Recomendações Pedagógicas",
              basicData: "Projetos Integradores: Incentivar a participação em feiras de ciências, grêmios ou mostras culturais onde ele(a) precise aplicar planejamento, criatividade e comunicação simultaneamente.",
              reflection: "Imersão de Mercado: Promover visitas técnicas a universidades ou conversas com profissionais atuantes nas áreas de maior destaque para alinhar as expectativas da carreira à realidade do mercado."
            },
            {
              id: "m7_3",
              profile: "Negócios e Gestão",
              component: "Mapa de Perfis e Carreiras",
              basicData: "Dados Básicos: Espírito de liderança ativo, interesse em organizar processos, gerenciar recursos e traçar estratégias.\n\nCarreiras Associadas: Administração, Economia, Ciências Contábeis, Marketing, Logística e Gestão de Recursos Humanos.",
              reflection: "Observo no(a) estudante uma estrutura cognitiva essencialmente voltada para a eficiência, o pragmatismo e o pensamento sistêmico. Sua mente demonstra facilidade para enxergar o panorama geral de cenários complexos, ordenando prioridades e distribuindo recursos com precisão. A liderança, neste perfil, não é apenas uma posição de comando, mas uma habilidade natural de articular pessoas em prol de um objetivo comum. Sua inclinação para traçar estratégias e gerenciar processos indica um potencial robusto para assumir tomadas de decisão assertivas e mitigar riscos em ambientes corporativos e econômicos dinâmicos."
            },
            {
              id: "m7_4",
              profile: "Negócios e Gestão",
              component: "Recomendações Pedagógicas",
              basicData: "Projetos Integradores: Incentivar a coordenação de equipes em feiras de ciências, gincanas escolares ou no grêmio estudantil, onde ele(a) precise aplicar conceitos de planejamento, delegação de tarefas e cumprimento de metas.",
              reflection: "Imersão de Mercado: Promover visitas técnicas a empresas locais ou conversas com profissionais das áreas de finanças, marketing e gestão para alinhar as expectativas da carreira à realidade prática do mercado."
            },
            {
              id: "m7_5",
              profile: "Biológicas e Criativas",
              component: "Mapa de Perfis e Carreiras",
              basicData: "Dados Básicos: Perfil movido pela criatividade. Demonstra forte desejo de inventar, inovar ou possui um profundo interesse pelo estudo da vida, bem-estar e saúde.\n\nCarreiras Associadas: Medicina, Biologia, Design, Publicidade, Artes Visuais, Educação Física e Veterinária.",
              reflection: "Observo no(a) estudante uma combinação singular entre a sensibilidade inventiva e a empatia orgânica. Este perfil se afasta do cientificismo estrito e tradicional; em vez disso, ele encontra motivação na aplicação de soluções criativas para os desafios que envolvem os seres vivos e a expressão humana. Sua mente é guiada pela necessidade de descobrir novas alternativas, curar, projetar ou transformar o meio ambiente. A presença marcante da criatividade nesta macroárea indica que o(a) jovem possui facilidade para pensar \"fora da caixa\" diante de problemas complexos de saúde ou comunicação visual, sendo ideal para carreiras que exigem inovação no cuidado à vida ou no desenvolvimento de novos conceitos estéticos."
            },
            {
              id: "m7_6",
              profile: "Biológicas e Criativas",
              component: "Recomendações Pedagógicas",
              basicData: "Projetos Integradores: Incentivar o envolvimento em feiras de ciências com foco ecológico/sustentável ou mostras culturais e artísticas, permitindo que ele(a) une a pesquisa biológica com a expressão criativa.",
              reflection: "Imersão de Mercado: Promover visitas guiadas a laboratórios de pesquisa, clínicas ou agências de comunicação e estúdios de design para que o(a) jovem compreenda a atuação prática e diária dessas áreas no mercado atual."
            },
            {
              id: "m7_7",
              profile: "Exatas e Tecnológicas",
              component: "Mapa de Perfis e Carreiras",
              basicData: "Dados Básicos: Perfil estimulado pela resolução de problemas lógicos, facilidade em lidar com dados numéricos e profundo interesse em decifrar o funcionamento das novas tecnologias.\n\nCarreiras Associadas: Engenharias, Ciência da Computação, Matemática, Física, Arquitetura e Tecnologia da Informação.",
              reflection: "Diagnosticamos no(a) estudante uma estrutura cognitiva predominantemente abstrata, analítica and dedutiva. Sua mente opera de forma sistêmica e encontra motivação na descoberta de padrões, equações e arquitetura de dados. O(A) jovem não se contenta em ser apenas um usuário passivo das ferramentas digitais e das construções do mundo moderno; há uma curiosidade intelectual intrínseca para compreender o \"como\" e o \"porquê\" por trás das engrenagens tecnológicas e estruturais. Essa inclinação para a precisão metodológica fornece uma base sólida para carreiras em desenvolvimento de softwares ou engenharia, ambientes onde o rigor lógico serve como matéria-prima para projetar e construir as soluções do amanhã."
            },
            {
              id: "m7_8",
              profile: "Exatas e Tecnológicas",
              component: "Recomendações Pedagógicas",
              basicData: "Projetos Integradores: Incentivar a liderança em olimpíadas de matemática, competições de robótica, desenvolvimento de pequenos aplicativos ou oficinas de maquetes e modelagem 3D, estimulando o pensamento algorítmico e espacial.",
              reflection: "Imersão de Mercado: Promover visitas monitoradas a polos tecnológicos, laboratórios acadêmicos e escritórios de engenharia ou arquitetura, aproximando o(a) jovem dos desafios reais de infraestrutura, código e inovação."
            },
            {
              id: "m7_9",
              profile: "Humanas e Sociais",
              component: "Mapa de Perfis e Carreiras",
              basicData: "Dados Básicos: Perfil pautado na habilidade de se comunicar com clareza, forte empatia para o acolhimento e ajuda ao próximo, além de interesse crítico em compreender as estruturas da sociedade.\n\nCarreiras Associadas: Direito, Letras, Pedagogia, Psicologia, História, Jornalismo e Relações Internacionais.",
              reflection: "O eixo central de desenvolvimento deste perfil está inteiramente alinhado ao fator humano e às suas complexas interações coletivas. O(A) estudante demonstra uma aptidão notável para a escuta ativa, o exercício da empatia e a articulação verbal de ideias abstratas. Sua mente encontra estímulo ao analisar os fenômenos sociais, os direitos humanos e as narrativas que moldam a nossa cultura. Longe de ser apenas uma inclinação teórica, esse perfil reflete uma inteligência voltada para a transformação prática e para a mediação de conflitos. O(A) jovem apresenta um potencial latente para exercer liderança em ambientes que exijam responsabilidade ética, seja defendendo causas jurídicas, educando, promovendo a saúde mental ou comunicando informações essenciais para a coletividade."
            },
            {
              id: "m7_10",
              profile: "Humanas e Sociais",
              component: "Recomendações Pedagógicas",
              basicData: "Projetos Integradores: Incentivar o protagonismo em debates escolares, simulações de comitês internacionais (como os modelos da ONU), redação de jornais internos da escola ou coordenação de campanhas e projetos sociais de cunho comunitário.",
              reflection: "Imersão de Mercado: Fomentar o contato com a realidade profissional por meio de visitas monitoradas a tribunais, institutos de psicologia, agências de comunicação ou espaços de inovação pedagógica, auxiliando o(a) jovem a compreender o impacto real dessas carreiras."
            }
          ]);
        }
      } catch (e) {
        console.error('Erro ao buscar m7Rows:', e);
        }
      }
    };

    calculateFrequencies();
  }, [selectedStudentId, students, refreshToggle, imcRecordsProp, motorRecordsProp, sportRecordsProp, vocationalRecordsProp, healthRecordsProp, oralRecordsProp, autoconceptRecordsProp, iasRecordsProp, snapRecordsProp, aq10RecordsProp, pcdRecordsProp]);

  const handleDeleteReport = async (reportId: string) => {
    if (!reportId) return;

    const studentId = selectedStudentId;

    const doDelete = async () => {
      try {
        // 1. Update React state immediately using functional update
        setSavedReports(prev => {
          const filtered = prev.filter(r => r.id !== reportId);
          // 2. Sync to Local Storage
          if (studentId) {
            localStorage.setItem(`educore_perf_reports_${studentId}`, JSON.stringify(filtered));
          }
          return filtered;
        });

        // Also immediately update the global allSavedReports list
        setAllSavedReports(prev => prev.filter(r => r.id !== reportId));

        // 3. Reset UI state if deleted report was active
        if (selectedReportId === reportId) {
          setSelectedReportId('');
          setAiReport(null);
          setReportToDelete(null);
        }

        alert('Relatório excluído com sucesso!');
      } catch (e) {
        console.error('Erro ao excluir:', e);
        alert('Não foi possível excluir o relatório.');
      }

      // 4. Cloud delete
      if (isSupabaseConfigured) {
        try {
          const supabase = getDb();
          if (supabase) {
            await supabase.from('performance_reports').delete().eq('id', reportId);
          }
        } catch (err) {
          console.error('Erro cloud sync:', err);
        }
      }

      logDataAccess(user?.id || 'unknown', user?.role || 'unknown', 'delete', 'performance_reports', reportId);
    };

    if (runWithPermission) await runWithPermission('view:performance', doDelete);
    else await doDelete();
  };

  const createStudentPDF = async (studentObj: Student, reportText: string, area: string) => {
    const doc = new jsPDF();
    addReportBackground(doc);
    const margin = 20;
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(33, 150, 243);
    doc.text('Relatório de Desempenho - EDUKYNE', margin, y);
    y += 10;

    // Foto do aluno (antes do nome)
    const avatar = await loadAvatarForPdf(studentObj.avatarUrl);
    const infoX = avatar ? margin + 26 : margin;
    if (avatar) {
      try { doc.addImage(avatar.data, avatar.format, margin, y, 22, 22); } catch (e) { console.error('Falha ao inserir foto no PDF:', e); }
    }
    const photoBottom = avatar ? y + 24 : y;

    // Student Info
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    let iy = y + 5;
    doc.text(`Aluno: ${studentObj.name}`, infoX, iy);
    iy += 7;
    doc.text(`Turma: ${studentObj.grade}`, infoX, iy);
    iy += 7;
    doc.text(`Localidade: ${studentObj.locality || 'N/A'}`, infoX, iy);
    iy += 7;
    doc.text(`Estado: ${studentObj.estado || 'N/A'} | Região: ${studentObj.regiao || 'N/A'}`, infoX, iy);
    iy += 7;
    doc.text(`Dimensão de Foco: ${area}`, infoX, iy);
    iy += 7;
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, infoX, iy);
    y = Math.max(iy + 8, photoBottom);

    // Content
    doc.setFontSize(10);
    const pageHeight = doc.internal.pageSize.height;
    const reportLines = reportText.split('\n');

    reportLines.forEach((line) => {
      const trimmed = line.trim();
      
      if (trimmed === '') {
        y += 2;
        return;
      }

      if (trimmed.includes('| :---') || trimmed.includes('|:---')) return;

      let isHeading = false;
      let cleanLine = line
        .replace(/\|/g, '  ')
        .replace(/[📊📏🥋🏐🏃🏊⚽🤾🤸🏀♂♀\u200d\ufe0f]/g, '')
        .replace(/\(Módulo 4\)/g, '')
        .replace(/\(Módulo 6\)/g, '')
        .replace(/Módulo 6/g, '')
        .replace(/--+/g, '');

      if (trimmed.startsWith('#')) {
        isHeading = true;
        cleanLine = cleanLine.replace(/#+/g, '').trim();
      }
      
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        isHeading = true;
      }

      if (/^\d+\./.test(trimmed) || /^CENÁRIO\s+[A-Z]/.test(trimmed) || /^ANÁLISE\s+DE/i.test(trimmed)) {
        isHeading = true;
      }

      cleanLine = cleanLine.replace(/\*\*/g, '').trim();

      if (isHeading) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
      }

      const splitLines = doc.splitTextToSize(cleanLine, 170);
      
      splitLines.forEach((l: string) => {
        if (y + 10 > pageHeight) {
          doc.addPage();
          addReportBackground(doc);
          y = 20;
          if (isHeading) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9.5);
          }
        }
        doc.text(l, margin, y);
        y += 4.5;
      });
    });

    return doc;
  };

  const handleGeneratePDF = () => {
    if (!aiReport || !selectedStudentId) return;

    const studentObj = students.find(s => s.id === selectedStudentId);
    if (!studentObj) return;

    const doDownload = async () => {
      const doc = await createStudentPDF(studentObj, aiReport, focusArea);
      doc.save(`Relatorio_${studentObj.name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
      logExport(user?.id || 'unknown', user?.role || 'unknown', 'performance_reports', 'pdf', 1);
    };
    if (runWithPermission) runWithPermission('view:performance', doDownload);
    else doDownload();
  };

  const handleBatchDownloadZip = async () => {
    if (selectedStudentIdsForBatch.length === 0) {
      alert('Selecione pelo menos um aluno para baixar.');
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    setErrorMessage(null);

    try {
      // Garante relatorios atualizados dos selecionados antes de baixar (sem avisar).
      try { await backfillReportsForStudentIds(selectedStudentIdsForBatch); }
      catch (e) { console.error('Backfill pre-download falhou:', e); }

      // Busca os relatorios da dimensao escolhida direto do banco (sempre atual).
      let reportsToUse: PerformanceReport[] = [];
      const supabase = getDb();
      if (supabase) {
        const { data } = await supabase
          .from('performance_reports')
          .select('id, student_id, student_name, grade, focus_area, observations, report, date, evaluation_id, evaluation_result, created_at')
          .in('student_id', selectedStudentIdsForBatch)
          .eq('focus_area', focusArea);
        reportsToUse = (data || []).map((r: SupabasePerformanceRow) => ({
          id: r.id, studentId: r.student_id, studentName: r.student_name, grade: r.grade,
          focusArea: r.focus_area, observations: r.observations || '', report: r.report, date: r.date,
          evaluationId: r.evaluation_id || undefined, evaluationResult: r.evaluation_result || undefined, createdAt: r.created_at,
        }));
      } else {
        reportsToUse = allSavedReports;
      }

      const zip = new JSZip();
      let addedCount = 0;

      for (const studentId of selectedStudentIdsForBatch) {
        const studentObj = students.find(s => s.id === studentId);
        if (!studentObj) continue;
        const latest = reportsToUse
          .filter(r => r.studentId === studentId)
          .sort((a, b) => safeGetTimestamp(b.date) - safeGetTimestamp(a.date))[0];
        if (latest) {
          const doc = await createStudentPDF(studentObj, latest.report, focusArea);
          const pdfBlob = doc.output('blob');
          const fileName = `Relatorio_${studentObj.name.replace(/\s+/g, '_')}_${focusArea.replace(/\s+/g, '_')}.pdf`;
          zip.file(fileName, pdfBlob);
          addedCount++;
        }
      }

      if (addedCount === 0) {
        alert('Nenhum relatorio encontrado para os alunos selecionados nesta Dimensao de Foco.');
        setLoading(false);
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipName = `Relatorios_${gradeFilter.replace(/\s+/g, '_')}_${focusArea.replace(/\s+/g, '_')}_${new Date().getTime()}.zip`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = zipName;
      link.click();
      URL.revokeObjectURL(link.href);

      alert(`Download concluído! ${addedCount} relatórios foram exportados.`);
      logExport(user?.id || 'unknown', user?.role || 'unknown', 'performance_reports', 'pdf', addedCount);
    } catch (err) {
      console.error('Erro ao gerar ZIP:', err);
      alert('Ocorreu um erro ao gerar o arquivo ZIP. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Sync / Lock Effect: automatically selects first matching value if non-admin and restricted
  useEffect(() => {
    if (!isUserAdmin) {
      const timer = setTimeout(() => {
        const userContractsList = (contratos || []).filter(c => 
          assignedContracts.includes(c.name.toLowerCase()) || assignedContracts.includes(c.id.toLowerCase())
        );
        
        if (userContractsList.length > 0) {
          const contractIds = userContractsList.map(c => c.id);
          if (!contract || !contractIds.includes(contract)) {
            setContract(userContractsList[0].id);
          }
        }

        if (assignedStates.length > 0) {
          const foundState = assignedStates.find(st => st !== '');
          if (foundState && (!stateFilter || !assignedStates.includes(stateFilter.toLowerCase()))) {
            const actualState = (contratos || []).flatMap(c => c.estado.split(',').map((s: string) => s.trim()))
              .find(st => st.toLowerCase() === foundState.toLowerCase());
            if (actualState) setStateFilter(actualState);
          }
        }

        if (assignedRegions.length > 0) {
          const foundReg = assignedRegions.find(r => r !== '');
          if (foundReg && (!cityFilter || !assignedRegions.includes(cityFilter.toLowerCase()))) {
            const actualReg = (contratos || []).flatMap(c => c.regiao.split(',').map((s: string) => s.trim()))
              .find(r => r.toLowerCase() === foundReg.toLowerCase());
            if (actualReg) setCityFilter(actualReg);
          }
        }

        if (assignedLocalities.length > 0) {
          const foundLoc = assignedLocalities.find(l => l !== '');
          if (foundLoc && (!localityFilter || !assignedLocalities.includes(localityFilter.toLowerCase()))) {
            const actualLoc = (contratos || []).flatMap(c => c.localidade.split(',').map((s: string) => s.trim()))
              .find(l => l.toLowerCase() === foundLoc.toLowerCase());
            if (actualLoc) setLocalityFilter(actualLoc);
          }
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, contratos, isUserAdmin, assignedContracts, assignedStates, assignedRegions, assignedLocalities, contract, stateFilter, cityFilter, localityFilter, loggedInStudentObj, selectedStudentId, gradeFilter]);

  // Dynamic cascading option selection logic
  // States: Only unique states of contracts that match the selected contract
  const availableStates = useMemo(() => {
    const filteredContratos = contract && contract !== 'Todos'
      ? availableContracts.filter(c => c.id === contract)
      : availableContracts;

    const raw = Array.from(new Set(
      filteredContratos.flatMap(c => {
        if (c.structure && Array.isArray(c.structure.estados)) {
          return c.structure.estados.map((st: EstHierarchical) => st.name);
        }
        return c.estado.split(',').map((s: string) => s.trim());
      })
    )).filter(Boolean);

    if (!isUserAdmin && assignedStates.length > 0) {
      return raw.filter(st => assignedStates.includes(st.toLowerCase()));
    }
    return raw;
  }, [availableContracts, contract, isUserAdmin, assignedStates]);

  // Regiões: Only unique regions of contracts that match selected contract AND selected state
  const availableRegions = useMemo(() => {
    const filteredContratos = contract && contract !== 'Todos'
      ? availableContracts.filter(c => c.id === contract)
      : availableContracts;

    const raw = Array.from(new Set(
      filteredContratos.flatMap(c => {
        if (c.structure && Array.isArray(c.structure.estados)) {
          const matchingStates = c.structure.estados.filter((st: EstHierarchical) => !stateFilter || stateFilter === 'Todos' || st.name === stateFilter);
          return matchingStates.flatMap((st: EstHierarchical) => st.regioes.map((r: RegHierarchical) => r.name));
        }
        const matchE = !stateFilter || stateFilter === 'Todos' || c.estado.split(',').map((s: string) => s.trim()).includes(stateFilter);
        return matchE ? c.regiao.split(',').map((s: string) => s.trim()) : [];
      })
    )).filter(Boolean);

    if (!isUserAdmin && assignedRegions.length > 0) {
      return raw.filter(reg => assignedRegions.includes(reg.toLowerCase()));
    }
    return raw;
  }, [availableContracts, contract, stateFilter, isUserAdmin, assignedRegions]);

  // Localidades: Only unique localities of contracts that match selected contract, state, AND region
  const availableLocalities = useMemo(() => {
    const filteredContratos = contract && contract !== 'Todos'
      ? availableContracts.filter(c => c.id === contract)
      : availableContracts;

    const raw = Array.from(new Set(
      filteredContratos.flatMap(c => {
        if (c.structure && Array.isArray(c.structure.estados)) {
          const matchingStates = c.structure.estados.filter((st: EstHierarchical) => !stateFilter || stateFilter === 'Todos' || st.name === stateFilter);
          const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => !cityFilter || cityFilter === 'Todos' || cityFilter === 'Todas' || r.name === cityFilter));
          return matchingRegs.flatMap((r: RegHierarchical) => r.localidades.map((l: LocHierarchical) => l.name));
        }
        const matchE = !stateFilter || stateFilter === 'Todos' || c.estado.split(',').map((s: string) => s.trim()).includes(stateFilter);
        const matchR = !cityFilter || cityFilter === 'Todos' || cityFilter === 'Todas' || c.regiao.split(',').map((s: string) => s.trim()).includes(cityFilter);
        return (matchE && matchR) ? c.localidade.split(',').map((s: string) => s.trim()) : [];
      })
    )).filter(Boolean);

    if (!isUserAdmin && assignedLocalities.length > 0) {
      return raw.filter(loc => assignedLocalities.includes(loc.toLowerCase()));
    }
    return raw;
  }, [availableContracts, contract, stateFilter, cityFilter, isUserAdmin, assignedLocalities]);

  // Series/Turmas available for the selected localization settings
  const availableGrades = useMemo(() => {
    const filteredContratos = contract && contract !== 'Todos'
      ? availableContracts.filter(c => c.id === contract)
      : availableContracts;

    const fromContracts = Array.from(new Set(
      filteredContratos.flatMap(c => {
        if (c.structure && Array.isArray(c.structure.estados)) {
          const matchingStates = c.structure.estados.filter((st: EstHierarchical) => !stateFilter || stateFilter === 'Todos' || st.name === stateFilter);
          const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => !cityFilter || cityFilter === 'Todos' || cityFilter === 'Todas' || r.name === cityFilter));
          const matchingLocs = matchingRegs.flatMap((r: RegHierarchical) => r.localidades.filter((l: LocHierarchical) => !localityFilter || localityFilter === 'Todos' || l.name === localityFilter));
          return matchingLocs.flatMap((l: LocHierarchical) => l.grades || []);
        }
        const matchE = !stateFilter || stateFilter === 'Todos' || c.estado.split(',').map((s: string) => s.trim()).includes(stateFilter);
        const matchR = !cityFilter || cityFilter === 'Todos' || cityFilter === 'Todas' || c.regiao.split(',').map((s: string) => s.trim()).includes(cityFilter);
        const matchL = !localityFilter || localityFilter === 'Todos' || c.localidade.split(',').map((s: string) => s.trim()).includes(localityFilter);
        return (matchE && matchR && matchL) ? (c.grade ? c.grade.split(',').map((s: string) => s.trim()) : []) : [];
      })
    )).filter(Boolean);

    const fromStudents = students 
      ? Array.from(new Set(
          students
            .filter(s => {
              if (contract && contract !== 'Todos') {
                const cObj = availableContracts.find(c => c.id === contract);
                if (cObj && s.contrato && s.contrato !== cObj.name) return false;
              }
              if (stateFilter && stateFilter !== 'Todos' && s.estado !== stateFilter) return false;
              if (cityFilter && cityFilter !== 'Todos' && cityFilter !== 'Todas' && s.regiao !== cityFilter) return false;
              if (localityFilter && localityFilter !== 'Todos' && s.locality !== localityFilter) return false;
              return true;
            })
            .map(s => s.grade)
        )).filter(Boolean)
      : [];

    const combined = Array.from(new Set([...fromContracts, ...fromStudents])).sort();
    if (!isUserAdmin && assignedGrades.length > 0) {
      return combined.filter(g => assignedGrades.includes(g.toLowerCase()));
    }
    return combined;
  }, [students, availableContracts, contract, stateFilter, cityFilter, localityFilter, isUserAdmin, assignedGrades]);

  // IDs of students who have saved reports for the selected focus area in the history
  const studentsWithPerformanceIds = useMemo(() => {
    if (!isAnaliseGeral || !focusArea) return null;

    const ids = new Set<string>();
    
    allSavedReports.forEach(report => {
      // Check if the report matches the selected focus area exactly
      if (report.focusArea === focusArea) {
        if (report.studentId) {
          ids.add(report.studentId);
        }
      }
    });

    return ids;
  }, [isAnaliseGeral, focusArea, allSavedReports]);

  const activeStudentsList = useMemo(() => {
    return students.filter(s => {
      if (user?.role === 'Aluno') {
        return s.id === loggedInStudentObj?.id;
      }
      const matchesStatus = s.status === 'Ativo';
      
      let matchesLocality = true;
      if (contract) {
        if (contract !== 'Todos') {
          const targetContractObj = availableContracts.find(c => c.id === contract);
          if (targetContractObj && s.contrato && s.contrato !== targetContractObj.name) {
            matchesLocality = false;
          }
        }
        if (stateFilter && stateFilter !== 'Todos') {
          if (s.estado && s.estado !== stateFilter) {
            matchesLocality = false;
          }
        }
        if (cityFilter && cityFilter !== 'Todos' && cityFilter !== 'Todas') {
          if (s.regiao && s.regiao !== cityFilter) {
            matchesLocality = false;
          }
        }
        if (localityFilter && localityFilter !== 'Todos') {
          const sLoc = (s.locality || 'Centro').toLowerCase().trim();
          const mLoc = localityFilter.toLowerCase().trim();
          if (sLoc !== mLoc) {
            matchesLocality = false;
          }
        }
      }

      let matchesGrade = true;
      if (gradeFilter) {
        if (s.grade !== gradeFilter) {
          matchesGrade = false;
        }
      }

      let matchesPerformance = true;
      if (isAnaliseGeral && studentsWithPerformanceIds) {
        matchesPerformance = studentsWithPerformanceIds.has(s.id);
      }
      
      return matchesStatus && matchesLocality && matchesGrade && matchesPerformance;
    });
  }, [students, user, loggedInStudentObj, contract, stateFilter, cityFilter, localityFilter, gradeFilter, isAnaliseGeral, studentsWithPerformanceIds, availableContracts]);

  // Todos os alunos ATIVOS da turma/filtros atuais, sem o filtro "tem relatorio da dimensao"
  // (usado so no painel estatistico, para cobrir a turma inteira).
  const statsStudentsList = useMemo(() => {
    return students.filter(s => {
      if (user?.role === 'Aluno') return s.id === loggedInStudentObj?.id;
      if (s.status !== 'Ativo') return false;
      let matchesLocality = true;
      if (contract && contract !== 'Todos') {
        const targetContractObj = availableContracts.find(c => c.id === contract);
        if (targetContractObj && s.contrato && s.contrato !== targetContractObj.name) matchesLocality = false;
      }
      if (stateFilter && stateFilter !== 'Todos' && s.estado !== stateFilter) matchesLocality = false;
      if (cityFilter && cityFilter !== 'Todos' && cityFilter !== 'Todas' && s.regiao !== cityFilter) matchesLocality = false;
      if (localityFilter && localityFilter !== 'Todos') {
        const sLoc = (s.locality || 'Centro').toLowerCase().trim();
        if (sLoc !== localityFilter.toLowerCase().trim()) matchesLocality = false;
      }
      if (gradeFilter && s.grade !== gradeFilter) return false;
      return matchesLocality;
    });
  }, [students, user, loggedInStudentObj, contract, stateFilter, cityFilter, localityFilter, gradeFilter, availableContracts]);

  // Rotulo do escopo atual do painel (do nivel mais especifico pro mais amplo).
  const statsScopeLabel = useMemo(() => {
    if (gradeFilter) return `Turma ${gradeFilter}`;
    if (localityFilter && localityFilter !== 'Todos') return `Localidade ${localityFilter}`;
    if (cityFilter && cityFilter !== 'Todos' && cityFilter !== 'Todas') return `Região ${cityFilter}`;
    if (stateFilter && stateFilter !== 'Todos') return `Estado ${stateFilter}`;
    if (contract && contract !== 'Todos') { const c = availableContracts.find(x => x.id === contract); return `Contrato ${c ? c.name : ''}`.trim(); }
    return 'Todos os alunos';
  }, [gradeFilter, localityFilter, cityFilter, stateFilter, contract, availableContracts]);

  // Carrega a presenca dos alunos da turma (para a estatistica de frequencia).
  useEffect(() => {
    if (!isAnaliseGeral || user?.role === 'Aluno') return;
    const ids = statsStudentsList.map(s => s.id);
    if (ids.length === 0) { setAttendanceByStudent({}); return; }
    let cancelled = false;
    (async () => {
      const supabase = getDb();
      if (!supabase) return;
      try {
        const { data } = await supabase.from('attendance_records').select('student_id, present').in('student_id', ids);
        if (cancelled) return;
        const map: Record<string, { present: number; total: number }> = {};
        (data || []).forEach((a: { student_id: string; present: boolean }) => {
          if (!a?.student_id) return;
          const e = map[a.student_id] || { present: 0, total: 0 };
          e.total++; if (a.present) e.present++;
          map[a.student_id] = e;
        });
        setAttendanceByStudent(map);
      } catch (e) { console.error('Erro ao carregar presenca da turma:', e); }
    })();
    return () => { cancelled = true; };
  }, [isAnaliseGeral, user, statsStudentsList]);

  // Estatisticas consolidadas da turma a partir dos REGISTROS de todas as dimensoes + frequencia.
  const turmaStats = useMemo(() => {
    const ids = new Set(statsStudentsList.map(s => s.id));
    const total = statsStudentsList.length;
    const tally = <T extends { studentId: string; date?: string }>(recs: T[] | undefined, valueOf: (r: T) => string) => {
      const by = new Map<string, T>();
      (recs || []).forEach(r => { if (!r.studentId || !ids.has(r.studentId)) return; const cur = by.get(r.studentId); if (!cur || safeGetTimestamp(r.date) >= safeGetTimestamp(cur.date)) by.set(r.studentId, r); });
      const dist = new Map<string, number>();
      by.forEach(r => { const k = (valueOf(r) || '').toString().trim() || 'Não informado'; dist.set(k, (dist.get(k) || 0) + 1); });
      return {
        coverage: by.size,
        coveragePct: total ? Math.round((by.size / total) * 100) : 0,
        distribution: Array.from(dist.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      };
    };
    const dims = [
      { label: 'IMC / Desempenho Corporal', d: tally(imcRecordsProp, r => r.classification || '') },
      { label: 'Capacidades Físicas', d: tally(motorRecordsProp, r => r.generalClass || '') },
      { label: 'Atividades Esportivas', d: tally(sportRecordsProp, r => r.mainSkill || '') },
      { label: 'Perfil Vocacional', d: tally(vocationalRecordsProp, r => r.profile || '') },
      { label: 'Saúde Global', d: tally(healthRecordsProp, r => r.classification || '') },
      { label: 'Higiene Bucal', d: tally(oralRecordsProp, r => r.classification || '') },
      { label: 'Autoconceito', d: tally(autoconceptRecordsProp, r => r.classification || '') },
      { label: 'Índice Alimentar', d: tally(iasRecordsProp, r => r.classification || '') },
      { label: 'Rastreamento TDAH', d: tally(snapRecordsProp, r => r.classification || '') },
      { label: 'Rastreamento TEA', d: tally(aq10RecordsProp, r => r.classification || '') },
      { label: 'Qualidade Motora PCD', d: tally(pcdRecordsProp, r => r.classificacaoPerfil || '') },
    ];
    let fSum = 0, fN = 0, exc = 0, reg = 0, cri = 0, nod = 0;
    ids.forEach(sid => {
      const a = attendanceByStudent[sid];
      if (!a || a.total === 0) { nod++; return; }
      const rate = (a.present / a.total) * 100; fSum += rate; fN++;
      if (rate >= 75) exc++; else if (rate >= 50) reg++; else cri++;
    });
    const frequency = { avg: fN ? +(fSum / fN).toFixed(1) : 0, excellent: exc, regular: reg, critical: cri, noData: nod };
    return { total, dims, frequency };
  }, [statsStudentsList, imcRecordsProp, motorRecordsProp, sportRecordsProp, vocationalRecordsProp, healthRecordsProp, oralRecordsProp, autoconceptRecordsProp, iasRecordsProp, snapRecordsProp, aq10RecordsProp, pcdRecordsProp, attendanceByStudent]);

  const handleDownloadStats = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(15); doc.setTextColor(11, 19, 38);
    doc.text(`Painel Estatístico — ${statsScopeLabel}`, 40, 46);
    doc.setFontSize(9); doc.setTextColor(90);
    doc.text(`${turmaStats.total} alunos · Emitido em ${new Date().toLocaleDateString('pt-BR')}`, 40, 62);
    const f = turmaStats.frequency;
    doc.setFontSize(10); doc.setTextColor(11, 19, 38);
    doc.text(`Frequência — média ${f.avg}% · Excelente ${f.excellent} · Regular ${f.regular} · Crítico ${f.critical} · Sem dados ${f.noData}`, 40, 84);
    let y = 100;
    turmaStats.dims.forEach(dim => {
      if (y > 760) { doc.addPage(); y = 50; }
      doc.setFontSize(11); doc.setTextColor(11, 19, 38);
      doc.text(`${dim.label} — cobertura ${dim.d.coverage}/${turmaStats.total} (${dim.d.coveragePct}%)`, 40, y);
      autoTable(doc, {
        startY: y + 6,
        head: [['Categoria', 'Alunos', '%']],
        body: dim.d.distribution.map(x => [x.label, String(x.count), turmaStats.total ? `${Math.round((x.count / turmaStats.total) * 100)}%` : '0%']),
        theme: 'striped',
        styles: { fontSize: 8.5, cellPadding: 3 },
        headStyles: { fillColor: [56, 189, 248] },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
    });
    doc.save(`Painel_Estatistico_${statsScopeLabel.replace(/[^a-zA-Z0-9]+/g, '_')}.pdf`);
    logExport(user?.id || 'unknown', user?.role || 'unknown', 'performance_reports', 'pdf', 1);
  };

  // Sequential loading text generator
  const loadingMessages = [
    'Consultando frequência do estudante no sistema eletrônico de presenças...',
    'Avaliando anotações e registros dos profissionais orientadores...',
    'Estruturando dados comportamentais e matrizes pedagógicas...',
    'Formatando o Parecer Executivo Final para entrega institucional...'
  ];

  // Memoized list of reports for the logged in student in the selected focus area
  const studentFocusReports = useMemo(() => {
    if (user?.role !== 'Aluno' || !loggedInStudentObj) return [];
    return allSavedReports.filter(r => 
      r.studentId === loggedInStudentObj.id && 
      r.focusArea === focusArea
    );
  }, [allSavedReports, loggedInStudentObj, focusArea, user]);

  const handleViewStudentPerformance = () => {
    if (user?.role !== 'Aluno' || !loggedInStudentObj) return;

    setLoading(true);
    setAiReport(null);
    setErrorMessage(null);

    // Smooth transition simulation for "fetching"
    setTimeout(() => {
      setLoading(false);
      const matched = allSavedReports.filter(r => 
        r.studentId === loggedInStudentObj.id && 
        r.focusArea === focusArea
      );

      if (matched.length === 0) {
        setAiReport(`### NENHUM REGISTRO ENCONTRADO

Nenhum relatório de desempenho foi registrado no histórico para você na área de foco ${focusArea} até o momento.

Por favor, entre em contato com seus professores ou orientadores pedagógicos para que eles publiquem as avaliações no sistema.`);
        setSelectedReportId('');
      } else {
        // Automatically load and visualize the first (most recent) one
        setAiReport(matched[0].report);
        setSelectedReportId(matched[0].id);
      }
    }, 600);
  };

  const isImcSelected = focusArea === 'Desempenho Corporal' || focusArea === 'Avaliação de IMC';
  const isMotorSelected = focusArea === 'Desempenho de Capacidades Físicas' || focusArea === 'Desempenho de capacidades físicas' || focusArea === 'Qualidade Motora';
  const isSportSelected = focusArea === 'Desempenho em Atividades Esportivas' || focusArea === 'Avaliação Esportiva';
  const isVocationSelected = focusArea === 'Desempenho Vocacional' || focusArea === 'Desempenho vocacional' || focusArea === 'Perfil Vocacional';
  const isHealthSelected = focusArea === 'Desempenho Saúde Global';
  const isOralSelected = focusArea === 'Desempenho Higiene Bucal';
  const isAutoSelected = focusArea === 'Desempenho Autoconceito';
  const isIasSelected = focusArea === 'Desempenho Índice Alimentar';
  const isSnapSelected = focusArea === 'Desempenho Rastreamento TDAH';
  const isAq10Selected = focusArea === 'Desempenho Rastreamento Precoce do TEA';
  const isPcdSelected = focusArea === 'Desempenho Qualidade Motora PCD';

  let currentEvalId = '';
  if (isImcSelected) currentEvalId = selectedImcId;
  else if (isMotorSelected) currentEvalId = selectedMotorId;
  else if (isSportSelected) currentEvalId = selectedSportId;
  else if (isVocationSelected) currentEvalId = selectedVocationId;
  else if (isHealthSelected) currentEvalId = selectedHealthId;
  else if (isOralSelected) currentEvalId = selectedOralId;
  else if (isAutoSelected) currentEvalId = selectedAutoId;
  else if (isIasSelected) currentEvalId = selectedIasId;
  else if (isSnapSelected) currentEvalId = selectedSnapId;
  else if (isAq10Selected) currentEvalId = selectedAq10Id;
  else if (isPcdSelected) currentEvalId = selectedPcdId;

  // Botao "Adicionar Informacoes" vale para avaliacoes (com registro) e para o
  // Escolar (derivado da presenca). Nunca para o Completo (ocultado na UI).
  const isEscolarSelected = focusArea === 'Desempenho Escolar';
  const annotatable = isEscolarSelected ? !!selectedStudentId : !!currentEvalId;

  // Quantidade de avaliacoes do aluno na dimensao atual (-1 = dimensao nao-avaliacao).
  const focusAreaRecordCount = (() => {
    switch (focusArea) {
      case 'Desempenho Corporal': return imcRecords.length;
      case 'Desempenho de Capacidades Físicas': return motorRecords.length;
      case 'Desempenho em Atividades Esportivas': return sportRecords.length;
      case 'Desempenho Vocacional': return vocationRecords.length;
      case 'Desempenho Saúde Global': return healthRecords.length;
      case 'Desempenho Higiene Bucal': return oralRecords.length;
      case 'Desempenho Autoconceito': return autoconceptRecords.length;
      case 'Desempenho Índice Alimentar': return iasRecords.length;
      case 'Desempenho Rastreamento TDAH': return snapRecords.length;
      case 'Desempenho Rastreamento Precoce do TEA': return aq10Records.length;
      case 'Desempenho Qualidade Motora PCD': return pcdRecords.length;
      default: return -1;
    }
  })();

  const currentReportExists = savedReports.some(r => {
    if (currentEvalId) {
      return r.id === `REP-${currentEvalId}` || r.evaluationId === currentEvalId;
    }
    return r.focusArea === focusArea;
  });

  const handleGenerateReport = async () => {
    if (!selectedStudentId) {
      alert('Selecione um aluno da lista antes de gerar o relatório.');
      return;
    }

    const studentObj = students.find(s => s.id === selectedStudentId);
    if (!studentObj) return;

    if (currentReportExists) {
      return;
    }

    const evaluationId = currentEvalId;
    let evaluationResult = '';

    if (isImcSelected) {
      const record = imcRecords.find(r => r.id === evaluationId);
      evaluationResult = record?.classification || '';
    } else if (isMotorSelected) {
      const record = motorRecords.find(r => r.id === evaluationId);
      evaluationResult = record?.generalClass || '';
    } else if (isSportSelected) {
      const record = sportRecords.find(r => r.id === evaluationId);
      evaluationResult = record?.mainSkill || '';
    } else if (isVocationSelected) {
      const record = vocationRecords.find(r => r.id === evaluationId);
      evaluationResult = record?.profile || '';
    } else if (isHealthSelected) {
      const record = healthRecords.find(r => r.id === evaluationId);
      evaluationResult = record?.classification || '';
    } else if (isOralSelected) {
      const record = oralRecords.find(r => r.id === evaluationId);
      evaluationResult = record?.classification || '';
    } else if (isAutoSelected) {
      const record = autoconceptRecords.find(r => r.id === evaluationId);
      evaluationResult = record?.classification || '';
    } else if (isIasSelected) {
      const record = iasRecords.find(r => r.id === evaluationId);
      evaluationResult = record?.classification || '';
    } else if (isSnapSelected) {
      const record = snapRecords.find(r => r.id === evaluationId);
      evaluationResult = record?.classification || '';
    } else if (isAq10Selected) {
      const record = aq10Records.find(r => r.id === evaluationId);
      evaluationResult = record?.classification || '';
    } else if (isPcdSelected) {
      const record = pcdRecords.find(r => r.id === evaluationId);
      evaluationResult = record?.classificacaoPerfil || '';
    }

    setLoading(true);
    setAiReport(null);
    setErrorMessage(null);
    setLoadingStep(0);

    // Dynamic loader simulation step trigger
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev < loadingMessages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1500);

    try {
      // Rule-based generation (Replacing AI)
      let generatedReport = '';
      const dateStr = new Date().toLocaleDateString('pt-BR');
      const rate = attendanceRate !== null ? attendanceRate.toFixed(1) : 'N/A';
      const absenceRate = attendanceRate !== null ? (100 - attendanceRate).toFixed(1) : 'N/A';
      const status = attendanceRate !== null ? (attendanceRate >= 75 ? 'Excelente' : attendanceRate >= 50 ? 'Regular' : 'Crítico') : 'N/A';

      // Fonte unica: usa o construtor compartilhado para todas as dimensoes.
      const builtReport = buildAssessmentReport(makeReportCtx(focusArea, studentObj.name, studentObj.grade, observations, dateStr, savedReports.filter(r => r.studentId === studentObj.id).map(r => ({ focusArea: r.focusArea, report: r.report }))));
      if (builtReport) {
        generatedReport = builtReport.report;
      } else
      if (focusArea === 'Desempenho Escolar') {
        const scenario = m3Analysis?.cenario || (attendanceRate !== null ? (attendanceRate >= 50 ? 'A' : 'B') : 'C');
        
        let scenarioText = '';
        let frequencyText = '';
        let parentsText = '';
        let impactosText = '';

        if (scenario === 'A') {
          scenarioText = "CENÁRIO A – MAIS PRESENÇAS DO QUE FALTAS";
          frequencyText = "O estudante demonstrou excelente regularidade e compromisso com a rotina escolar ao longo deste período. A baixa taxa de absenteísmo reflete uma postura participativa e engajada com o ambiente de aprendizagem.";
          parentsText = "Parabéns pelo incentivo e parceria. A presença constante tem sido o pilar para os bons resultados mantidos até aqui.";
          impactosText = "### Matriz de Impactos Pedagógicos\n- **Continuidade Pedagógica**: Quando presente, o aluno acompanha as explicações passo a passo, facilitando a execução de tarefas complexas.\n- **Socialização Ativa**: A convivência diária fortalece os vínculos com professores e colegas, desenvolvendo inteligência emocional e trabalho em equipe.\n- **Ritmo de Avaliação**: Menor necessidade de aplicação de provas substitutivas ou trabalhos de recuperação de nota por perda de prazos.";
        } else if (scenario === 'B') {
          scenarioText = "CENÁRIO B – MAIS FALTAS DO QUE PRESENÇAS";
          frequencyText = "Identificamos um número crítico de ausências neste período, superando os dias de comparecimento em sala de aula. Esse padrão de faltas excessivas acende um alerta pedagógico, pois interrompe a sequência didática e prejudica a absorção dos conteúdos ministrados.";
          parentsText = "Solicitamos uma atenção especial e um diálogo familiar para identificarmos o motivo das ausências. É fundamental restabelecer a rotina de idas à escola para evitar prejuízos severos na avaliação final deste ciclo.";
          impactosText = "### Matriz de Impactos Pedagógicos\n- **Lacunas de Conteúdo**: Cada ausência gera a perda de conceitos-chave, acumulando dúvidas para as unidades seguintes.\n- **Desengajamento Escolar**: O excesso de faltas quebra a rotina do estudante, gerando desmotivação e sensação de isolamento em relação à turma.\n- **Sobrecarga de Tarefas**: Acúmulo de atividades pendentes que precisam ser realizadas em casa para cumprir as exigências do ano letivo.";
        } else {
          scenarioText = "CENÁRIO C – SEM REGISTROS SUFICIENTES";
          frequencyText = "Até o momento, não foram identificados registros de presença ou ausência suficientes para o estudante no sistema neste período. A ausência de dados impede uma avaliação precisa do acompanhamento escolar.";
          parentsText = "Solicitamos que entrem em contato com a secretaria escolar para a regularização dos registros de frequência.";
          impactosText = "### Matriz de Impactos Pedagógicos\n- **Inconsistência de Dados**: A falta de registros impede a análise de evolução pedagógica.\n- **Alerta de Monitoramento**: Recomenda-se a verificação imediata da rotina de frequência.";
        }

        const absenceCount = totalCount - presenceCount;

        generatedReport = `### FREQUÊNCIA ESCOLAR ACUMULADA: ${rate}% (${status})

#### RESUMO DO CÁLCULO
| Categoria | Quantidade | Porcentagem |
| **Total** | ${totalCount} | 100% |
| **Presenças** | ${presenceCount} | ${rate}% (Frequência) |
| **Faltas** | ${absenceCount} | ${absenceRate}% |

#### 1. Análise de Cenário
**${scenarioText}**

#### 2. Parecer de Frequência
${m3Analysis?.parecerFrequencia || frequencyText}

#### 3. Orientações aos Pais e Responsáveis
${m3Analysis?.parecerPais || parentsText}

${impactosText}

#### 4. Observações Complementares
${observations || 'Nenhuma observação adicional registrada.'}

---
*Relatório de desempenho escolar acumulado - ${dateStr}*`;
      } else if (focusArea === 'Desempenho Corporal') {
        const selectedImc = imcRecords.find(r => r.id === selectedImcId);
        
        if (!selectedImc) {
          generatedReport = `### RELATÓRIO DE DESEMPENHO CORPORAL\n\nNenhum registro de IMC selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.`;
        } else {
          // Find matching M4 classification
          // Normalizing strings for better matching
          const normalize = (s: string) => s.toLowerCase().trim();
          const match = m4ImcData.find(row => normalize(row.classification) === normalize(selectedImc.classification || ''));
          
          const classification = selectedImc.classification || 'Não classificado';
          const imcValue = selectedImc.imc || 'N/A';
          const weight = selectedImc.weight || 'N/A';
          const height = selectedImc.height || 'N/A';
          const statusM4 = match?.status || 'Aguardando Análise';
          const descriptionM4 = match?.description || 'Não há um parecer específico cadastrado para esta classificação.';

          generatedReport = `### RELATÓRIO DE DESEMPENHO CORPORAL

#### DADOS DA AVALIAÇÃO (${selectedImc.date})
- **Peso:** ${weight} kg
- **Altura:** ${height} m
- **IMC:** ${imcValue}
- **Classificação:** ${classification}

#### 1. Tabela de Classificação e Parecer
**Status:** ${statusM4}

**Parecer Técnico:**
${descriptionM4}

#### 2. Orientações Gerais
O Índice de Massa Corporal (IMC) é um indicador internacional usado para diagnosticar o peso ideal. A manutenção de uma composição corporal adequada é fundamental para a saúde musculoesquelética e o rendimento em atividades físicas.

#### 3. Observações do Educador
${observations || 'Nenhuma observação adicional registrada.'}

---
*Relatório de desempenho corporal - ${dateStr}*`;
        }
      } else if (focusArea === 'Desempenho de Capacidades Físicas') {
        const selectedMotor = motorRecords.find(r => r.id === selectedMotorId);
        
        if (!selectedMotor) {
          generatedReport = `### RELATÓRIO DE DESEMPENHO DE CAPACIDADES FÍSICAS\n\nNenhum registro de Qualidade Motora selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.`;
        } else {
          // Normalize string helper for matching level in m5Data
          const norm = (s: string) => (s || '').toLowerCase().trim();
          
          // Get specific details for each of the 5 capabilities
          const getCapDetail = (capKey: string, levelName: string) => {
            const rows = m5Data[capKey] || [];
            // Match row where level matches levelName
            const match = rows.find(r => norm(r.level) === norm(levelName));
            return match || {
              healthStatus: `A capacidade de ${capKey === 'forca_muscular' ? 'Força Muscular' : capKey === 'impulsao' ? 'Impulsão' : capKey.charAt(0).toUpperCase() + capKey.slice(1)} foi classificada como ${levelName}.`,
              toImprove: `Focar em atividades progressivas e adaptadas para o desenvolvimento de ${capKey === 'forca_muscular' ? 'Força Muscular' : capKey === 'impulsao' ? 'Impulsão' : capKey.charAt(0).toUpperCase() + capKey.slice(1)}.`,
              recommendation: `Estimular atividades motoras e brincadeiras lúdicas direcionadas em casa.`
            };
          };

          const velDetail = getCapDetail('velocidade', selectedMotor.speed || 'Excelente');
          const forcaDetail = getCapDetail('forca_muscular', selectedMotor.strength || 'Excelente');
          const agilDetail = getCapDetail('agilidade', selectedMotor.agility || 'Excelente');
          const abdDetail = getCapDetail('abdomen', selectedMotor.abdomen || selectedMotor.coordination || 'Excelente');
          const impDetail = getCapDetail('impulsao', selectedMotor.impulsao || selectedMotor.flexibility || 'Excelente');

          generatedReport = `### RELATÓRIO DE DESEMPENHO DE CAPACIDADES FÍSICAS

#### DADOS DA AVALIAÇÃO MOTORA (${selectedMotor.date ? selectedMotor.date.split('-').reverse().join('/') : 'N/A'})
- **Velocidade:** ${selectedMotor.speed || 'Excelente'}
- **Força Muscular:** ${selectedMotor.strength || 'Excelente'}
- **Agilidade:** ${selectedMotor.agility || 'Excelente'}
- **Abdômen:** ${selectedMotor.abdomen || selectedMotor.coordination || 'Excelente'}
- **Impulsão:** ${selectedMotor.impulsao || selectedMotor.flexibility || 'Excelente'}
- **Classificação Geral:** ${selectedMotor.generalClass || 'Excelente'}

#### 1. Diagnóstico e Recomendações Pedagógicas

##### **Velocidade**
- **Classificação:** ${selectedMotor.speed || 'Excelente'}
- **Parecer de Saúde:** ${velDetail.healthStatus}
- **Diretrizes de Intervenção / Melhoria:** ${velDetail.toImprove}
- **Recomendação para a Família (Casa):** ${velDetail.recommendation}

##### **Força Muscular**
- **Classificação:** ${selectedMotor.strength || 'Excelente'}
- **Parecer de Saúde:** ${forcaDetail.healthStatus}
- **Diretrizes de Intervenção / Melhoria:** ${forcaDetail.toImprove}
- **Recomendação para a Família (Casa):** ${forcaDetail.recommendation}

##### **Agilidade**
- **Classificação:** ${selectedMotor.agility || 'Excelente'}
- **Parecer de Saúde:** ${agilDetail.healthStatus}
- **Diretrizes de Intervenção / Melhoria:** ${agilDetail.toImprove}
- **Recomendação para a Família (Casa):** ${agilDetail.recommendation}

##### **Abdômen**
- **Classificação:** ${selectedMotor.abdomen || selectedMotor.coordination || 'Excelente'}
- **Parecer de Saúde:** ${abdDetail.healthStatus}
- **Diretrizes de Intervenção / Melhoria:** ${abdDetail.toImprove}
- **Recomendação para a Família (Casa):** ${abdDetail.recommendation}

##### **Impulsão**
- **Classificação:** ${selectedMotor.impulsao || selectedMotor.flexibility || 'Excelente'}
- **Parecer de Saúde:** ${impDetail.healthStatus}
- **Diretrizes de Intervenção / Melhoria:** ${impDetail.toImprove}
- **Recomendação para a Família (Casa):** ${impDetail.recommendation}

#### 2. Observações do Educador
${observations || 'Nenhuma observação específica registrada pelo educador para este período.'}

---
*Relatório de Capacidades Físicas - ${dateStr}*`;
        }
      } else if (focusArea === 'Desempenho em Atividades Esportivas') {
        const selectedSport = sportRecords.find(r => r.id === selectedSportId);

        if (!selectedSport) {
          generatedReport = `### RELATÓRIO DE DESEMPENHO EM ATIVIDADES ESPORTIVAS\n\nNenhum registro de Esporte Indicado selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.`;
        } else {
          const rawActiveSportName = selectedSportName || selectedSport.suggestedSport || '';
          const activeSportName = rawActiveSportName.replace(/[🥋🏐🏃🏊⚽🤾🤸🏀♂♀\u200d\ufe0f]/g, '').trim();
          const activeUpper = activeSportName.toUpperCase().trim();
          const isAprimorar = 
            activeUpper === 'APRIMORAR HABILIDADES MOTORAS' ||
            activeUpper.includes('APRIMORAR') ||
            activeUpper.includes('MOTOR') ||
            activeUpper.includes('HABILIDADE') ||
            activeUpper.includes('DEFICIT') ||
            activeUpper.includes('DÉFICIT') ||
            activeUpper.includes('INTERVEN');
          
          if (isAprimorar) {
            const matchedDiretriz = m6Diretrizes.find(d => {
              const dirNorm = (d.diretriz || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
              return dirNorm.includes('aprimorar habilidades motoras') || dirNorm.includes('habilidades motoras');
            }) || {
              diretriz: "APRIMORAR HABILIDADES MOTORAS",
              criterio: "Esta via deve ser adotada se três ou mais valências físicas estiverem em níveis Insuficiente ou Regular.",
              conduta: "Desaconselho totalmente a especialização precoce em esportes com regras rígidas ou alta demanda competitiva neste momento. O foco pedagógico deve migrar para circuitos funcionais multiesportivos, jogos cooperativos e estimulação motora de base.",
              objetivo: "O foco exclusivo deste direcionamento é restaurar a integridade física do(a) jovem. Buscaremos o ganho de massa magra, ativação do tônus postural e melhora da coordenação global para que seu corpo esteja preparado e protegido antes de ser exposto a cargas esportivas avançadas."
            };

            generatedReport = `### RELATÓRIO DE DIRETRIZES DE INTERVENÇÃO MOTORAS

#### DADOS DO ALUNO E AVALIAÇÃO (${selectedSport.date ? selectedSport.date.split('-').reverse().join('/') : 'N/A'})
- **Biotipo Corporal:** ${selectedSport.biotype || 'Não avaliado'}
- **Aptidão Predominante:** ${selectedSport.mainSkill || 'Não avaliado'}
- **Foco de Direcionamento:** ${activeSportName}
- **Prática Recomendada:** ${selectedSport.recommendedPractice || 'Não avaliado'}

#### 1. Diretriz de Intervenção Aplicada
- **Diretriz:** ${matchedDiretriz.diretriz}
- **Critério de Enquadramento:** ${matchedDiretriz.criterio}
- **Conduta Pedagógica:** ${matchedDiretriz.conduta}
- **Objetivo da Intervenção:** ${matchedDiretriz.objetivo}

#### 2. Observações Complementares do Educador
${observations || 'Nenhuma observação complementar registrada.'}

---
*Relatório de Intervenção de Habilidades Motoras - ${dateStr}*`;
          } else {
            // Find matching modalities in m6Modalidades
            const matchedMods = m6Modalidades.filter(modalidade => {
              const modNameNorm = (modalidade.name || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
              const selSportNorm = activeSportName.toLowerCase().trim().replace(/[^\w\s]/g, '');
              return modNameNorm.includes(selSportNorm) || selSportNorm.includes(modNameNorm);
            });

            const checkStudentEnquadramento = (mod: M6Modalidade) => {
              const modName = (mod.name || '').toUpperCase().replace(/[🥋🏐🏃swick⚽🤾🤸🏀♂♀\u200d\ufe0f]/g, '').trim();
              const sportUpper = activeSportName.toUpperCase().trim();
              return modName.includes(sportUpper) || sportUpper.includes(modName);
            };

            const activeMods = matchedMods.filter(mod => checkStudentEnquadramento(mod));

            let matchedModalitiesText = '';
            if (activeMods.length > 0) {
              matchedModalitiesText = activeMods.map(mod => `##### **${(mod.name || '').replace(/[🥋🏐🏃🏊⚽🤾🤸🏀♂♀\u200d\ufe0f]/g, '').trim()}**
- **Valências Importantes:** ${mod.valencias}
- **Condição de Enquadramento:** ${mod.condition}
- **Parecer / Diretriz:** ${mod.report}`).join('\n\n');
            } else if (matchedMods.length > 0) {
              matchedModalitiesText = matchedMods.map(mod => `##### **${(mod.name || '').replace(/[🥋🏐🏃🏊⚽🤾🤸🏀♂♀\u200d\ufe0f]/g, '').trim()}**
- **Valências Importantes:** ${mod.valencias}
- **Condição de Enquadramento:** ${mod.condition}
- **Parecer / Diretriz:** ${mod.report}`).join('\n\n');
            } else {
              matchedModalitiesText = `Não foi encontrado um enquadramento exato para a modalidade "${activeSportName}" nas tabelas de referência. 

No entanto, recomenda-se focar nas valências de força muscular, velocidade e agilidade exigidas por esportes de dinâmica similar.`;
            }

            generatedReport = `### RELATÓRIO DE DESEMPENHO EM ATIVIDADES ESPORTIVAS

#### DADOS DO DIRECIONAMENTO ESPORTIVO (${selectedSport.date ? selectedSport.date.split('-').reverse().join('/') : 'N/A'})
- **Biotipo Corporal:** ${selectedSport.biotype || 'Não avaliado'}
- **Aptidão Predominante:** ${selectedSport.mainSkill || 'Não avaliado'}
- **Modalidade Selecionada:** ${activeSportName}
- **Prática Recomendada:** ${selectedSport.recommendedPractice || 'Não avaliado'}

#### 1. Parecer de Direcionamento por Modalidade
${matchedModalitiesText}

#### 2. Observações Complementares do Educador
${observations || 'Nenhuma observação complementar registrada.'}

---
*Relatório de Direcionamento Esportivo - ${dateStr}*`;
          }
        }
      } else if (focusArea === 'Desempenho Vocacional') {
        const selectedVocation = vocationRecords.find(r => r.id === selectedVocationId);
        if (!selectedVocation) {
          generatedReport = `### RELATÓRIO DE DESEMPENHO VOCACIONAL\n\nNenhum registro de Vocacionamento selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.`;
        } else {
          const profile = selectedVocation.profile || 'Não especificado';
          
          const normalizeProfileName = (name: string) => {
            return (name || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, "") // remove accents
              .replace(/\(perfil hibrido\)/gi, '')
              .replace(/hibrido/gi, '')
              .replace(/[^\w\s]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          };

          const targetNorm = normalizeProfileName(profile);

          // Match in m7Rows for Mapa de Perfis e Carreiras
          const mapaRow = m7Rows.find(row => 
            normalizeProfileName(row.profile) === targetNorm && 
            row.component === 'Mapa de Perfis e Carreiras'
          );
          
          // Match in m7Rows for Recomendações Pedagógicas
          const recRow = m7Rows.find(row => 
            normalizeProfileName(row.profile) === targetNorm && 
            row.component === 'Recomendações Pedagógicas'
          );

          const basicDataMapa = mapaRow?.basicData || `Dados Básicos: Não cadastrados para o perfil ${profile} no Módulo 7.`;
          const reflectionMapa = mapaRow?.reflection || `Reflexão: Não cadastrada para o perfil ${profile} no Módulo 7.`;
          
          const basicDataRec = recRow?.basicData || `Diretrizes Pedagógicas: Não cadastradas para o perfil ${profile} no Módulo 7.`;
          const reflectionRec = recRow?.reflection || `Imersão de Mercado: Não cadastrada para o perfil ${profile} no Módulo 7.`;

          generatedReport = `### RELATÓRIO DE DESEMPENHO VOCACIONAL

**ESTUDANTE:** ${studentObj.name}
**DATA DA AVALIAÇÃO VOCACIONAL:** ${selectedVocation.date ? selectedVocation.date.split('-').reverse().join('/') : 'N/A'}
**PERFIL DOMINANTE (AFERIDO):** ${profile}

---

#### 1. MAPA DE PERFIS E CARREIRAS
- **Diretrizes e Áreas:** ${basicDataMapa}
${reflectionMapa !== (selectedVocation.technicalOpinion || '') ? `- **Análise Cognitiva e Psicológica:** ${reflectionMapa}` : ''}

---

#### 2. RECOMENDAÇÕES PEDAGÓGICAS E IMERSÃO NO MERCADO
- **Projetos Integradores e Ações Pedagógicas:** ${basicDataRec}
- **Estratégias de Imersão e Prática:** ${reflectionRec}

---

#### 3. PARECER DO ORIENTADOR VOCACIONAL
${selectedVocation.technicalOpinion || 'Nenhum parecer técnico inserido no registro de vocacionamento original.'}

#### 4. OBSERVAÇÕES COMPLEMENTARES DO EDUCADOR
${observations || 'Nenhuma observação complementar registrada para este período.'}

---
*Relatório de Desempenho e Direcionamento Vocacional - ${dateStr}*`;
        }
      } else if (focusArea === 'Desempenho Saúde Global') {
        const selectedHealth = healthRecords.find(r => r.id === selectedHealthId);
        if (!selectedHealth) {
          generatedReport = `### RELATÓRIO DE DESEMPENHO - SAÚDE GLOBAL\n\nNenhum registro de Saúde Global selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.`;
        } else {
          const classification = selectedHealth.classification || 'Não classificado';
          const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const m9match = m9Rows.find(row => normCls(row.classification) === normCls(classification));
          const basicData = m9match?.basicData || `Dados da classificação "${classification}" não cadastrados no Módulo 9.`;
          const reflection = m9match?.reflection || '';

          generatedReport = `### RELATÓRIO DE DESEMPENHO - SAÚDE GLOBAL (KIDSCREEN-10)

**ESTUDANTE:** ${studentObj.name}
**DATA DA AVALIAÇÃO:** ${selectedHealth.date ? selectedHealth.date.split('-').reverse().join('/') : 'N/A'}
**ESCORE BRUTO:** ${selectedHealth.rawScore} (faixa 10-50)
**ESCORE T (PADRONIZADO):** ${Number(selectedHealth.tScore).toFixed(2)}
**CLASSIFICAÇÃO:** ${classification}

---

#### 1. INTERPRETAÇÃO DO RESULTADO
- **Leitura:** ${basicData}

---

#### 2. PARECER DO EDUCADOR
${selectedHealth.technicalOpinion || reflection || 'Nenhum parecer técnico inserido no registro de Saúde Global original.'}

#### 3. OBSERVAÇÕES COMPLEMENTARES DO EDUCADOR
${observations || 'Nenhuma observação complementar registrada para este período.'}

---
*Relatório de Saúde Global (KIDSCREEN-10) - ${dateStr}*`;
        }
      } else if (focusArea === 'Desempenho Higiene Bucal') {
        const selectedOral = oralRecords.find(r => r.id === selectedOralId);
        if (!selectedOral) {
          generatedReport = `### RELATÓRIO DE DESEMPENHO - HIGIENE BUCAL\n\nNenhum registro de Higiene Bucal selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.`;
        } else {
          const classification = selectedOral.classification || 'Não classificado';
          const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const m10match = m10Rows.find(row => normCls(row.classification) === normCls(classification));
          const basicData = m10match?.basicData || `Faixa da classificação "${classification}" não cadastrada no Módulo 10.`;
          const reflection = m10match?.reflection || '';

          generatedReport = `### RELATÓRIO DE DESEMPENHO - HIGIENE BUCAL (HU-DBI)

**ESTUDANTE:** ${studentObj.name}
**DATA DA AVALIAÇÃO:** ${selectedOral.date ? selectedOral.date.split('-').reverse().join('/') : 'N/A'}
**PONTUAÇÃO:** ${selectedOral.score} (faixa 0-12)
**CLASSIFICAÇÃO:** ${classification}

---

#### 1. INTERPRETAÇÃO DO RESULTADO
- **Leitura:** ${basicData}

---

#### 2. PARECER DO EDUCADOR
${selectedOral.technicalOpinion || reflection || 'Nenhum parecer técnico inserido no registro de Higiene Bucal original.'}

#### 3. OBSERVAÇÕES COMPLEMENTARES DO EDUCADOR
${observations || 'Nenhuma observação complementar registrada para este período.'}

---
*Relatório de Higiene Bucal (HU-DBI) - ${dateStr}*`;
        }
      } else if (focusArea === 'Desempenho Autoconceito') {
        const selectedAuto = autoconceptRecords.find(r => r.id === selectedAutoId);
        if (!selectedAuto) {
          generatedReport = `### RELATÓRIO DE DESEMPENHO - AUTOCONCEITO\n\nNenhum registro de Autoconceito selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.`;
        } else {
          const classification = selectedAuto.classification || 'Não classificado';
          const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const m11match = m11Rows.find(row => normCls(row.classification) === normCls(classification));
          const basicData = m11match?.basicData || `Faixa da classificação "${classification}" não cadastrada no Módulo 11.`;
          const reflection = m11match?.reflection || '';

          generatedReport = `### RELATÓRIO DE DESEMPENHO - AUTOCONCEITO (Escala de Rosenberg)

**ESTUDANTE:** ${studentObj.name}
**DATA DA AVALIAÇÃO:** ${selectedAuto.date ? selectedAuto.date.split('-').reverse().join('/') : 'N/A'}
**PONTUAÇÃO:** ${selectedAuto.score} (faixa 0-30)
**CLASSIFICAÇÃO:** ${classification}

---

#### 1. INTERPRETAÇÃO DO RESULTADO
- **Leitura:** ${basicData}

---

#### 2. PARECER DO EDUCADOR
${selectedAuto.technicalOpinion || reflection || 'Nenhum parecer técnico inserido no registro de Autoconceito original.'}

#### 3. OBSERVAÇÕES COMPLEMENTARES DO EDUCADOR
${observations || 'Nenhuma observação complementar registrada para este período.'}

---
*Relatório de Autoconceito (Rosenberg) - ${dateStr}*`;
        }
      } else if (focusArea === 'Desempenho Índice Alimentar') {
        const selectedIas = iasRecords.find(r => r.id === selectedIasId);
        if (!selectedIas) {
          generatedReport = `### RELATÓRIO DE DESEMPENHO - ÍNDICE ALIMENTAR\n\nNenhum registro de Índice Alimentar selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.`;
        } else {
          const classification = selectedIas.classification || 'Não classificado';
          const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const m12match = m12Rows.find(row => normCls(row.classification) === normCls(classification));
          const basicData = m12match?.basicData || `Faixa da classificação "${classification}" não cadastrada no Módulo 12.`;
          const reflection = m12match?.reflection || '';

          generatedReport = `### RELATÓRIO DE DESEMPENHO - ÍNDICE ALIMENTAR (IAS)

**ESTUDANTE:** ${studentObj.name}
**DATA DA AVALIAÇÃO:** ${selectedIas.date ? selectedIas.date.split('-').reverse().join('/') : 'N/A'}
**PONTUAÇÃO:** ${selectedIas.totalScore} (faixa 0-100)
**CLASSIFICAÇÃO:** ${classification}

---

#### 1. INTERPRETAÇÃO DO RESULTADO
- **Leitura:** ${basicData}

---

#### 2. PARECER DO EDUCADOR
${selectedIas.technicalOpinion || reflection || 'Nenhum parecer técnico inserido no registro de Índice Alimentar original.'}

#### 3. OBSERVAÇÕES COMPLEMENTARES DO EDUCADOR
${observations || 'Nenhuma observação complementar registrada para este período.'}

---
*Relatório de Índice Alimentar (IAS) - ${dateStr}*`;
        }
      } else if (focusArea === 'Desempenho Rastreamento TDAH') {
        const selectedSnap = snapRecords.find(r => r.id === selectedSnapId);
        if (!selectedSnap) {
          generatedReport = `### RELATÓRIO DE DESEMPENHO - RASTREAMENTO DO TDAH\n\nNenhum registro de Rastreamento do TDAH selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.`;
        } else {
          const classification = selectedSnap.classification || 'Não classificado';
          const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const m13match = m13Rows.find(row => normCls(row.classification) === normCls(classification));
          const basicData = m13match?.basicData || `Classificação "${classification}" não cadastrada no Módulo 13.`;
          const reflection = m13match?.reflection || '';

          generatedReport = `### RELATÓRIO DE DESEMPENHO - RASTREAMENTO DO TDAH (SNAP-IV)

**ESTUDANTE:** ${studentObj.name}
**DATA DA AVALIAÇÃO:** ${selectedSnap.date ? selectedSnap.date.split('-').reverse().join('/') : 'N/A'}
**RESPONDENTE:** ${selectedSnap.respondent || 'Não informado'}
**ITENS CLÍNICOS - DESATENÇÃO (0-9):** ${selectedSnap.inattentionScore}
**ITENS CLÍNICOS - HIPERATIVIDADE/IMPULSIVIDADE (0-9):** ${selectedSnap.hyperactivityScore}
**CLASSIFICAÇÃO:** ${classification}

---

#### 1. INTERPRETAÇÃO DO RESULTADO
- **Leitura:** ${basicData}

---

#### 2. PARECER DO EDUCADOR
${selectedSnap.technicalOpinion || reflection || 'Nenhum parecer técnico inserido no registro de Rastreamento do TDAH original.'}

#### 3. OBSERVAÇÕES COMPLEMENTARES DO EDUCADOR
${observations || 'Nenhuma observação complementar registrada para este período.'}

> **Alerta Fundamental:** O SNAP-IV é um instrumento de rastreamento inicial e NÃO substitui o diagnóstico médico de TDAH. A classificação considera apenas o critério A do DSM-5-TR (sintomas). Para o diagnóstico formal, é obrigatória a avaliação dos critérios B–E (início antes dos 12 anos, sintomas em mais de um contexto, prejuízo clinicamente significativo e exclusão de outras causas) por profissional de saúde habilitado. O DSM-5-TR permite o diagnóstico conjunto com TEA.

---
*Relatório de Rastreamento do TDAH (SNAP-IV) - ${dateStr}*`;
        }
      } else if (focusArea === 'Desempenho Rastreamento Precoce do TEA') {
        const selectedAq10 = aq10Records.find(r => r.id === selectedAq10Id);
        if (!selectedAq10) {
          generatedReport = `### RELATÓRIO DE DESEMPENHO - RASTREAMENTO PRECOCE DO TEA\n\nNenhum registro de Rastreamento Precoce do TEA selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.`;
        } else {
          const classification = selectedAq10.classification || 'Não classificada';
          const normClsLocal = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const m14match = m14Rows.find(row => normClsLocal(row.classification) === normClsLocal(classification));
          const basicData = m14match?.basicData || `Classificação "${classification}" não cadastrada no Módulo 14.`;
          const reflection = m14match?.reflection || '';

          generatedReport = `### RELATÓRIO DE DESEMPENHO - RASTREAMENTO PRECOCE DO TEA (AQ-10)

**ESTUDANTE:** ${studentObj.name}
**DATA DA AVALIAÇÃO:** ${selectedAq10.date ? selectedAq10.date.split('-').reverse().join('/') : 'N/A'}
**RESPONDENTE:** ${selectedAq10.respondent || 'Não informado'}
**VERSÃO DO INSTRUMENTO:** ${selectedAq10.version === 'adolescente' ? 'Adolescente (12 a 15 anos)' : 'Criança (4 a 11 anos)'}
**PONTUAÇÃO TOTAL:** ${selectedAq10.totalScore} (0-10)
**CLASSIFICAÇÃO:** ${classification}

---

#### 1. INTERPRETAÇÃO DO RESULTADO
- **Leitura:** ${basicData}

---

#### 2. PARECER DO EDUCADOR
${selectedAq10.technicalOpinion || reflection || 'Nenhum parecer técnico inserido no registro de Rastreamento Precoce do TEA original.'}

#### 3. OBSERVAÇÕES COMPLEMENTARES DO EDUCADOR
${observations || 'Nenhuma observação complementar registrada para este período.'}

#### 4. ENCAMINHAMENTO SUGERIDO
- ${(selectedAq10.totalScore ?? 0) <= 6
    ? 'Pontuação de 0 a 6: traços comportamentais dentro da média da população geral; acompanhamento rotineiro do desenvolvimento.'
    : 'Pontuação de 7 a 10: alerta de traços elevados de TEA; recomendação de encaminhamento prioritário para avaliação multidisciplinar especializada (neuropediatra ou psiquiatra infantil e neuropsicólogo).'}

> **Alerta Fundamental:** O AQ-10 é um instrumento de rastreamento (triagem) e NÃO substitui o diagnóstico formal de TEA. Em caso de pontuação indicativa (7-10), recomenda-se o encaminhamento prioritário para avaliação multidisciplinar especializada (neuropediatra ou psiquiatra infantil e neuropsicólogo) para investigação diagnóstica.

---
*Relatório de Rastreamento Precoce do TEA (AQ-10) - ${dateStr}*`;
        }
      } else if (focusArea === 'Desempenho Qualidade Motora PCD') {
        const selectedPcd = pcdRecords.find(r => r.id === selectedPcdId);
        if (!selectedPcd) {
          generatedReport = `### RELATÓRIO DE DESEMPENHO - QUALIDADE MOTORA PCD\n\nNenhuma avaliação de Qualidade Motora PCD selecionada ou encontrada para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.`;
        } else {
          const grupoNome = selectedPcd.grupoNome || `Grupo ${selectedPcd.grupo}`;
          const valenciaLabels: { label: string; nota: number }[] = [
            { label: 'Velocidade e Agilidade', nota: selectedPcd.notaVelAgil },
            { label: 'Força Explosiva (Membros Inf.)', nota: selectedPcd.notaForcaExplosiva },
            { label: 'Força Membros Superiores', nota: selectedPcd.notaMembrosSup },
            { label: 'Estabilidade de Tronco / Core', nota: selectedPcd.notaCore },
          ];
          const valenciaStr = valenciaLabels.map(v => `- **${v.label}:** nota ${v.nota} (de 1 a 3)`).join('\n');
          const compat = selectedPcd.compatibilidade.length
            ? selectedPcd.compatibilidade.map((c, i) => `${i + 1}. ${c.modalidade} — IAR ${c.iar.toFixed(2)} (bruto)${c.iarNormalizado != null ? ` · normalizado ${c.iarNormalizado.toFixed(2)}/3` : ''}`).join('\n')
            : '- Sem dados de compatibilidade registrados.';
          const funilPcd = selectedPcd.funil ?? [];
          const funilStr = funilPcd.length
            ? funilPcd.map(f => `${f.momento}. **${f.titulo}:** ${f.regra}`).join('\n')
            : '- Funil qualitativo não registrado nesta avaliação.';
          const adaptStr = (selectedPcd.adaptacoesAplicadas ?? [])
            .filter(a => a.status === 'Adaptado' || a.status === 'Substituído')
            .map(a => `- **${a.teste}** (${a.status}): ${a.instrucao}`).join('\n');
          const topPcd = selectedPcd.compatibilidade.length > 0 ? selectedPcd.compatibilidade[0].modalidade : 'A complementar';

          generatedReport = `### RELATÓRIO DE DESEMPENHO - QUALIDADE MOTORA PCD

**ESTUDANTE:** ${studentObj.name}
**DATA DA AVALIAÇÃO:** ${selectedPcd.date ? selectedPcd.date.split('-').reverse().join('/') : 'N/A'}
**GRUPO DE TRIAGEM:** ${grupoNome}
**CLASSIFICAÇÃO / DETALHE:** ${selectedPcd.detalheClassificacao || 'Geral'}
**PERFIL MOTOR:** ${selectedPcd.classificacaoPerfil}

---

#### 1. VALÊNCIAS DOMINANTES (NOTAS 1 A 3)
${valenciaStr}

---

#### 2. MATRIZ DE COMPATIBILIDADE ESPORTIVA
${compat}

> **Nota metodológica:** o IAR é uma soma ponderada e, portanto, sensível a quanto cada modalidade valoriza cada capacidade e a quais capacidades foram efetivamente avaliadas. Avaliações incompletas produzem rankings parciais. O índice é orientativo e não substitui o funil qualitativo.

---

#### 3. MODALIDADE SUGERIDA (INDICAÇÃO PRELIMINAR)
- **${topPcd}**
- O IAR tem caráter operacional e orientativo; a definição final depende do funil qualitativo e da preferência do participante.

---

#### 4. ADAPTAÇÕES/SUBSTITUIÇÕES APLICADAS
${adaptStr || '- Nenhum teste adaptado ou substituído neste grupo.'}

---

#### 5. FUNIL QUALITATIVO DE DECISÃO
${funilStr}

---

#### 6. PARECER
${selectedPcd.technicalOpinion || 'Nenhum parecer técnico inserido no registro de Avaliação PCD original.'}

#### 7. OBSERVAÇÕES COMPLEMENTARES DO EDUCADOR
${observations || 'Nenhuma observação complementar registrada para este período.'}

---
*Relatório de Avaliação PCD (Qualidade Motora) - ${dateStr}*`;
        }
      } else if (focusArea === 'Desempenho Completo') {
        const reportEscolar = savedReports.find(r => r.focusArea === 'Desempenho Escolar');
        const reportCorporal = savedReports.find(r => r.focusArea === 'Desempenho Corporal');
        const reportMotor = savedReports.find(r => r.focusArea === 'Desempenho de Capacidades Físicas');
        const reportEsportivo = savedReports.find(r => r.focusArea === 'Desempenho em Atividades Esportivas');
        const reportVocacional = savedReports.find(r => r.focusArea === 'Desempenho Vocacional');
        const reportSaudeGlobal = savedReports.find(r => r.focusArea === 'Desempenho Saúde Global');
        const reportHigieneBucal = savedReports.find(r => r.focusArea === 'Desempenho Higiene Bucal');
        const reportAutoconcept = savedReports.find(r => r.focusArea === 'Desempenho Autoconceito');
        const reportIas = savedReports.find(r => r.focusArea === 'Desempenho Índice Alimentar');

        const hasAnyReport = reportEscolar || reportCorporal || reportMotor || reportEsportivo || reportVocacional || reportSaudeGlobal || reportHigieneBucal || reportAutoconcept || reportIas;

        if (!hasAnyReport) {
          generatedReport = `### PARECER INTEGRADO DE DESEMPENHO COMPLETO

**ESTUDANTE:** ${studentObj.name}
**TURMA:** ${studentObj.grade || 'Não informada'}
**DATA DE CONSOLIDAÇÃO:** ${dateStr}

---

**AVISO:** Nenhum relatório de foco individual (Escolar, Corporal, Capacidades Físicas, Esportivo ou Vocacional) foi encontrado no histórico deste estudante.

Para que a consolidação de desempenho completo seja realizada com sucesso, é necessário que pelo menos um relatório de dimensão individual tenha sido gerado e salvo anteriormente no "Histórico de Relatórios". Por favor, selecione outras Dimensões de Foco na lista acima, gere e salve os relatórios individuais correspondentes e, em seguida, retorne a esta opção para consolidá-los de forma automatizada.`;
        } else {
          generatedReport = `### PARECER INTEGRADO DE DESEMPENHO COMPLETO

**ESTUDANTE:** ${studentObj.name}
**TURMA:** ${studentObj.grade || 'Não informada'}
**DATA DE CONSOLIDAÇÃO:** ${dateStr}

---

#### APRESENTAÇÃO
Este documento consolida e integra de forma sistêmica as dimensões multidisciplinares de acompanhamento do estudante **${studentObj.name}**. A análise unifica os registros históricos de frequência, avaliação física corporal, mapeamento motor, direcionamento esportivo e perfil de vocacionamento pedagógico/profissional para compor um parecer de desenvolvimento global de excelência.

---

### 1. DIMENSÃO ESCOLAR (FREQUÊNCIA E ENGAJAMENTO)
${reportEscolar ? reportEscolar.report : '*Nenhum relatório de Desempenho Escolar foi encontrado no histórico.*'}

---

### 2. DIMENSÃO CORPORAL (COMPOSIÇÃO E IMC)
${reportCorporal ? reportCorporal.report : '*Nenhum relatório de Desempenho Corporal foi encontrado no histórico.*'}

---

### 3. DIMENSÃO DE CAPACIDADES FÍSICAS (QUALIDADE MOTORA)
${reportMotor ? reportMotor.report : '*Nenhum relatório de Capacidades Físicas foi encontrado no histórico.*'}

---

### 4. DIMENSÃO ESPORTIVA (DIRECIONAMENTO POR MODALIDADE)
${reportEsportivo ? reportEsportivo.report : '*Nenhum relatório de Desempenho Esportivo foi encontrado no histórico.*'}

---

### 5. DIMENSÃO VOCACIONAL (PERFIS E CARREIRAS DE MODALIDADE)
${reportVocacional ? reportVocacional.report : '*Nenhum relatório de Desempenho Vocacional foi encontrado no histórico.*'}

---

### 6. DIMENSÃO SAÚDE GLOBAL (KIDSCREEN-10)
${reportSaudeGlobal ? reportSaudeGlobal.report : '*Nenhum relatório de Saúde Global foi encontrado no histórico.*'}

---

### 7. DIMENSÃO HIGIENE BUCAL (HU-DBI)
${reportHigieneBucal ? reportHigieneBucal.report : '*Nenhum relatório de Higiene Bucal foi encontrado no histórico.*'}

---

### 8. DIMENSÃO AUTOCONCEITO (ESCALA DE ROSENBERG)
${reportAutoconcept ? reportAutoconcept.report : '*Nenhum relatório de Autoconceito foi encontrado no histórico.*'}

---

### 9. DIMENSÃO ÍNDICE ALIMENTAR (IAS)
${reportIas ? reportIas.report : '*Nenhum relatório de Índice Alimentar foi encontrado no histórico.*'}

---

#### 10. PARECER GERAL INTEGRADO E DIRETRIZES DO EDUCADOR
${observations || 'Nenhum parecer integrador ou observação complementar geral registrada pelo educador para esta consolidação.'}

---
*Relatório Consolidado de Desempenho Completo Integrado - ${dateStr}*`;
        }
      } else {
        // Simple template for other areas if AI is removed
        const absenceCount = totalCount - presenceCount;

        generatedReport = `### FREQUÊNCIA ESCOLAR ACUMULADA: ${rate}% (${status})

#### RESUMO DO CÁLCULO
| Categoria | Quantidade | Porcentagem |
| **Total** | ${totalCount} | 100% |
| **Presenças** | ${presenceCount} | ${rate}% (Frequência) |
| **Faltas** | ${absenceCount} | ${absenceRate}% |

#### 1. Contextualização
Este relatório apresenta uma análise do desempenho do estudante na dimensão de **${focusArea}**.

#### 2. Observações do Educador
${observations || 'Nenhuma observação específica registrada pelo educador para este período.'}

#### 3. Conclusão e Próximos Passos
O acompanhamento contínuo nas atividades propostas é fundamental para a evolução do estudante. Recomenda-se a manutenção do engajamento e a participação ativa em todas as sessões.

---
*Parecer de acompanhamento institucional - ${dateStr}*`;
      }

      // Simulate a bit of delay for "processing" feel
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Remove ### and ** from the report as requested
      const cleanedReport = generatedReport
        .replace(/#+/g, '')
        .replace(/\*\*/g, '');

      setAiReport(cleanedReport);

      // Auto-save & sync generated report
      const generatedReportId = await nextReportId();
      const newReportId = evaluationId
        ? `REP-${evaluationId}`
        : (generatedReportId || ('REP_' + uuid().slice(0, 8)));
      const currentDateString = new Date().toLocaleDateString('pt-BR');
      
      const newReport: PerformanceReport = {
        id: newReportId,
        studentId: studentObj.id,
        studentName: studentObj.name,
        grade: studentObj.grade,
        focusArea,
        observations,
        report: cleanedReport,
        date: currentDateString,
        createdAt: new Date().toISOString(),
        evaluationId: evaluationId,
        evaluationResult: evaluationResult
      };

      setSavedReports(prev => [newReport, ...prev]);
      setAllSavedReports(prev => [newReport, ...prev]);
      setSelectedReportId(newReportId);
      logDataAccess(user?.id || 'unknown', user?.role || 'unknown', 'edit', 'performance_reports', newReportId, undefined, { studentId: studentObj.id, focusArea });

      try {
        const stored = localStorage.getItem(`educore_perf_reports_${studentObj.id}`);
        const currentLocal = stored ? JSON.parse(stored) : [];
        localStorage.setItem(`educore_perf_reports_${studentObj.id}`, JSON.stringify([newReport, ...currentLocal]));
      } catch (err) {
        console.error('Erro ao salvar relatório localmente:', err);
      }

      if (isSupabaseConfigured) {
        try {
          const supabase = getDb();
          if (supabase) {
            await supabase
              .from('performance_reports')
              .upsert({
                id: newReport.id,
                student_id: newReport.studentId,
                student_name: newReport.studentName,
                grade: newReport.grade,
                focus_area: newReport.focusArea,
                observations: newReport.observations,
                report: newReport.report,
                date: newReport.date,
                evaluation_id: newReport.evaluationId || null,
                evaluation_result: newReport.evaluationResult || null,
                created_at: newReport.createdAt
              });
          }
        } catch (err) {
          console.error('Erro ao sincronizar relatório com o Supabase:', err);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Verifique se sua chave de API do Gemini foi inserida na seção Secrets do painel superior.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  // "Adicionar Informacoes": grava/atualiza a anotacao do educador no relatorio ja
  // existente daquela avaliacao. Se ainda nao existir, cria gerando normalmente.
  const handleAddInfo = async () => {
    if (!selectedStudentId) {
      alert('Selecione um aluno da lista antes de adicionar informações.');
      return;
    }
    const studentObj = students.find(s => s.id === selectedStudentId);
    if (!studentObj) return;

    // Escolar e Completo sao relatorios derivados (sem evaluation_id).
    // Escolar: mira o RELATORIO derivado REP-<aluno>-escolar. Demais: REP-<avaliacao>.
    const isEscolar = focusArea === 'Desempenho Escolar';
    const evaluationId = currentEvalId;
    const reportId = isEscolar ? `REP-${selectedStudentId}-escolar` : (evaluationId ? `REP-${evaluationId}` : '');
    const existing = savedReports.find(r =>
      (!!reportId && r.id === reportId) || (!!evaluationId && r.evaluationId === evaluationId)
    );

    if (!existing) {
      await handleGenerateReport();
      return;
    }

    const updatedReport: PerformanceReport = { ...existing, observations };
    setSavedReports(prev => prev.map(r => r.id === existing.id ? updatedReport : r));
    setAllSavedReports(prev => prev.map(r => r.id === existing.id ? updatedReport : r));
    logDataAccess(user?.id || 'unknown', user?.role || 'unknown', 'edit', 'performance_reports', existing.id, undefined, { studentId: studentObj.id, focusArea: existing.focusArea });

    try {
      const stored = localStorage.getItem(`educore_perf_reports_${studentObj.id}`);
      const currentLocal: PerformanceReport[] = stored ? JSON.parse(stored) : [];
      const had = currentLocal.some(r => r.id === existing.id);
      localStorage.setItem(
        `educore_perf_reports_${studentObj.id}`,
        JSON.stringify(had ? currentLocal.map(r => r.id === existing.id ? updatedReport : r) : [updatedReport, ...currentLocal])
      );
    } catch (err) {
      console.error('Erro ao salvar anotações localmente:', err);
    }

    if (isSupabaseConfigured) {
      try {
        const supabase = getDb();
        if (supabase) {
          await supabase.from('performance_reports').upsert({
            id: existing.id,
            student_id: existing.studentId,
            student_name: existing.studentName,
            grade: existing.grade,
            focus_area: existing.focusArea,
            observations,
            report: existing.report,
            date: existing.date,
            evaluation_id: existing.evaluationId || null,
            evaluation_result: existing.evaluationResult || null
          });
        }
      } catch (err) {
        console.error('Erro ao salvar anotações no Supabase:', err);
      }
    }

    setObservationsSaved(true);
    setTimeout(() => setObservationsSaved(false), 3000);
  };

  const makeReportCtx = (focusArea: string, studentName: string, studentGrade: string | undefined, obs: string, dateStr: string, existing: { focusArea: string; report: string }[]): ReportBuildCtx => ({
    focusArea, studentName, studentGrade, observations: obs, dateStr,
    imcRecords, selectedImcId, m4ImcData,
    motorRecords, selectedMotorId, m5Data,
    sportRecords, selectedSportId, selectedSportName, m6Modalidades, m6Diretrizes,
    vocationRecords, selectedVocationId, m7Rows,
    healthRecords, selectedHealthId, m9Rows,
    oralRecords, selectedOralId, m10Rows,
    autoconceptRecords, selectedAutoId, m11Rows,
    iasRecords, selectedIasId, m12Rows,
    snapRecords, selectedSnapId, m13Rows,
    aq10Records, selectedAq10Id, m14Rows,
    pcdRecords, selectedPcdId,
    attendanceRate, presenceCount, totalCount, m3Analysis, existingReports: existing,
  });

  // Auto-gera os relatorios DERIVADOS (Desempenho Escolar e Completo) ao abrir um aluno.
  const derivedSigRef = useRef('');
  useEffect(() => {
    if (isAnaliseGeral) return;
    if (!selectedStudentId || user?.role === 'Aluno') return;
    if (!isSupabaseConfigured) return;
    const studentObj = students.find(s => s.id === selectedStudentId);
    if (!studentObj) return;

    const isDerivedFa = (fa: string) => fa === 'Desempenho Escolar' || fa === 'Desempenho Completo';
    // Fontes confiaveis dos relatorios INDIVIDUAIS deste aluno (nao depende do
    // timing do salvReports, que fica vazio durante o carregamento).
    const pool = new Map<string, PerformanceReport>();
    allSavedReports.forEach(r => { if (r.studentId === selectedStudentId) pool.set(r.id, r); });
    savedReports.forEach(r => { if (r.studentId === selectedStudentId) pool.set(r.id, r); });
    const studentReports = Array.from(pool.values());
    const assessmentReports = studentReports.filter(r => !isDerivedFa(r.focusArea));

    const assessmentKey = assessmentReports.map(r => `${r.id}:${r.focusArea}`).sort().join('|');
    const selKey = [selectedImcId, selectedMotorId, selectedSportId, selectedVocationId, selectedHealthId, selectedOralId, selectedAutoId, selectedIasId, selectedSnapId, selectedAq10Id, selectedPcdId].join(',');
    // Assinatura dos dados de apoio (configs/pareceres) para que o relatorio seja
    // REGERADO assim que as linhas terminarem de carregar (evita gravar o texto
    // "nao cadastrada no Modulo X" quando o backend ainda esta carregando).
    const configSig = JSON.stringify([m4ImcData, m5Data, m6Modalidades, m6Diretrizes, m7Rows, m9Rows, m10Rows, m11Rows, m12Rows, m13Rows, m14Rows]);
    const sig = `${selectedStudentId}|${attendanceRate ?? 'x'}|${assessmentKey}|${selKey}|${configSig}`;
    if (derivedSigRef.current === sig) return;
    derivedSigRef.current = sig;

    const run = async () => {
      const supabase = getDb();
      if (!supabase) return;
      const dateStr = new Date().toLocaleDateString('pt-BR');
      const today = new Date().toISOString().split('T')[0];
      const cleanText = (s: string) => s.replace(/#+/g, '').replace(/\*\*/g, '');
      const existing = studentReports.map(r => ({ focusArea: r.focusArea, report: r.report }));

      const upsertOne = async (t: { fa: string; id: string; rid: string | null }) => {
        // Sempre regenera o corpo (texto atual das configs/registros) preservando a anotacao existente.
        const existingObs = studentReports.find(r => r.id === t.id)?.observations ?? '';
        const built = buildAssessmentReport(makeReportCtx(t.fa, studentObj.name, studentObj.grade, existingObs, dateStr, existing));
        if (!built) return;
        const report = cleanText(built.report);
        // Rede de seguranca: nunca rebaixa um relatorio ja bom para o texto de
        // config ausente (ex.: parecer ainda nao carregado ao abrir o aluno).
        const isFallbackText = /não cadastrad[oa]s?/i.test(report);
        const current = studentReports.find(r => r.id === t.id);
        if (isFallbackText && current && !/não cadastrad[oa]s?/i.test(current.report)) {
          return;
        }
        try {
          const { error } = await supabase.from('performance_reports').upsert({
            id: t.id, student_id: studentObj.id, student_name: studentObj.name, grade: studentObj.grade,
            focus_area: t.fa, observations: existingObs, report, date: today, evaluation_id: t.rid, evaluation_result: built.evaluationResult || null
          });
          if (error) { console.error('Falha no auto-relatorio:', error.message); return; }
          const rec: PerformanceReport = { id: t.id, studentId: studentObj.id, studentName: studentObj.name, grade: studentObj.grade, focusArea: t.fa, observations: existingObs, report, date: today, evaluationId: t.rid || undefined, evaluationResult: built.evaluationResult || undefined, createdAt: new Date().toISOString() };
          setSavedReports(prev => prev.some(r => r.id === t.id) ? prev.map(r => r.id === t.id ? { ...r, report, observations: existingObs } : r) : [rec, ...prev]);
          setAllSavedReports(prev => prev.some(r => r.id === t.id) ? prev.map(r => r.id === t.id ? { ...r, report, observations: existingObs } : r) : [rec, ...prev]);
        } catch (e) {
          console.error('Erro ao gerar relatorio:', e);
        }
      };

      // 1) Dimensoes de avaliacao: (re)gera sempre ao abrir, preservando a anotacao.
      const assessTargets: { fa: string; id: string; rid: string | null }[] = [];
      const pushAssess = (fa: string, rid: string) => { if (rid) assessTargets.push({ fa, id: `REP-${rid}`, rid }); };
      pushAssess('Desempenho Corporal', selectedImcId);
      pushAssess('Desempenho de Capacidades Físicas', selectedMotorId);
      pushAssess('Desempenho em Atividades Esportivas', selectedSportId);
      pushAssess('Desempenho Vocacional', selectedVocationId);
      pushAssess('Desempenho Saúde Global', selectedHealthId);
      pushAssess('Desempenho Higiene Bucal', selectedOralId);
      pushAssess('Desempenho Autoconceito', selectedAutoId);
      pushAssess('Desempenho Índice Alimentar', selectedIasId);
      pushAssess('Desempenho Rastreamento TDAH', selectedSnapId);
      pushAssess('Desempenho Rastreamento Precoce do TEA', selectedAq10Id);
      for (const t of assessTargets) { await upsertOne(t); }

      // 2) Derivados (Escolar/Completo): sempre atualiza o corpo, preservando a anotacao.
      const derivedTargets: { fa: string; id: string; rid: string | null }[] = [
        { fa: 'Desempenho Escolar', id: `REP-${selectedStudentId}-escolar`, rid: null },
        { fa: 'Desempenho Completo', id: `REP-${selectedStudentId}-completo`, rid: null },
      ];
      for (const t of derivedTargets) { await upsertOne(t); }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, students, savedReports, allSavedReports, attendanceRate, isAnaliseGeral, user, selectedImcId, selectedMotorId, selectedSportId, selectedVocationId, selectedHealthId, selectedOralId, selectedAutoId, selectedIasId, selectedSnapId, selectedAq10Id, m4ImcData, m5Data, m6Modalidades, m6Diretrizes, m7Rows, m9Rows, m10Rows, m11Rows, m12Rows, m13Rows, m14Rows]);

  // (B) Ao escolher uma Turma, preenche em segundo plano os relatorios dos alunos dela.
  const turmaBackfillRef = useRef('');
  useEffect(() => {
    if (isAnaliseGeral) return;
    if (!gradeFilter || user?.role === 'Aluno' || !isSupabaseConfigured) return;
    if (turmaBackfillRef.current === gradeFilter) return;
    const ids = students.filter(s => s.grade === gradeFilter).map(s => s.id);
    if (ids.length === 0) return;
    turmaBackfillRef.current = gradeFilter;
    backfillReportsForStudentIds(ids)
      .then(() => setRefreshToggle(prev => !prev)) // recarrega a lista global p/ refletir os novos relatorios
      .catch(e => console.error('Backfill de turma falhou:', e));
  }, [gradeFilter, students, isAnaliseGeral, user]);

  // (C) Acao manual: preencher relatorios de todos os alunos da turma atual (Análise Geral).
  const handleFillReportsTurma = async () => {
    const ids = activeStudentsList.map(s => s.id);
    if (ids.length === 0) return;
    setBackfilling(true);
    setBackfillMsg(null);
    setBackfillProgress({ done: 0, total: 0 });
    try {
      const wrote = await backfillReportsForStudentIds(ids, {
        onProgress: (done, total) => setBackfillProgress({ done, total }),
      });
      setRefreshToggle(prev => !prev);
      setBackfillMsg(`Pronto: ${wrote} relatório(s) gerado(s)/atualizado(s).`);
    } catch (e) {
      console.error('Backfill da turma falhou:', e);
      setBackfillMsg('Falha ao gerar relatórios da turma.');
    } finally {
      setBackfilling(false);
    }
  };

  // Quick markdown parser to raw custom component list (to avoid unsafe imports)
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmedLine = line.trim();
      
      // Filter out markdown table separators and decorative separators
      if (trimmedLine.includes('| :---') || trimmedLine.match(/^[-=]{3,}$/)) {
        return null;
      }

      // Pre-clean line for text content
      const cleanText = line
        .replace(/#+/g, '')
        .replace(/\*\*/g, '')
        .replace(/[📊📏🥋🏐🏃🏊⚽🤾🤸🏀♂♀\u200d\ufe0f]/g, '')
        .replace(/\(Módulo 4\)/g, '')
        .replace(/\(Módulo 6\)/g, '')
        .replace(/Módulo 6/g, '')
        .trim();

      if (trimmedLine === '') {
        return <div key={idx} className="h-2"></div>;
      }

      if (trimmedLine.startsWith('##')) {
        return (
          <h4 key={idx} className="text-sm font-black text-[#38bdf8] uppercase tracking-wider mt-6 mb-2 border-b border-[#3e484f]/30 pb-1">
            {cleanText}
          </h4>
        );
      }

      if (trimmedLine.startsWith('###') || trimmedLine.startsWith('#')) {
        return (
          <h4 key={idx} className="text-xs font-bold text-[#8ed5ff] uppercase tracking-wider mt-5 mb-2 border-b border-[#3e484f]/25 pb-1">
            {cleanText}
          </h4>
        );
      }
      
      if (trimmedLine.startsWith('-')) {
        return (
          <li key={idx} className="text-xs text-[#dae2fd]/90 ml-4 list-disc space-y-1 py-0.5">
            {cleanText.replace(/^-/g, '').trim()}
          </li>
        );
      }

      return (
        <p key={idx} className="text-xs leading-relaxed text-[#dae2fd]/85 mb-1.5 font-sans">
          {cleanText.replace(/\|/g, '  ')}
        </p>
      );
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedStudentIdsForBatch.length === activeStudentsList.length && activeStudentsList.length > 0) {
      setSelectedStudentIdsForBatch([]);
    } else {
      setSelectedStudentIdsForBatch(activeStudentsList.map(s => s.id));
    }
  };

  const handleToggleStudentSelection = (id: string) => {
    setSelectedStudentIdsForBatch(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const selectedStudentObj = students.find(s => s.id === selectedStudentId);

  const statsPanelInner = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h5 className="text-[16px] font-black text-[#8ed5ff] uppercase tracking-wider">📊 {statsScopeLabel} · {turmaStats.total} aluno(s)</h5>
        <button
          type="button"
          onClick={handleDownloadStats}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#38bdf8]/15 hover:bg-[#38bdf8]/25 border border-[#38bdf8]/40 rounded-lg text-[#38bdf8] text-[13px] font-bold transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" /> Baixar PDF
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-[13px] font-mono text-[#bdc8d1]/85">
        <span>Freq. média: <strong className="text-[15px] text-white">{turmaStats.frequency.avg}%</strong></span>
        <span className="text-emerald-400">Excelente: <strong className="text-white">{turmaStats.frequency.excellent}</strong></span>
        <span className="text-amber-400">Regular: <strong className="text-white">{turmaStats.frequency.regular}</strong></span>
        <span className="text-rose-400">Crítico: <strong className="text-white">{turmaStats.frequency.critical}</strong></span>
        <span className="text-[#bdc8d1]/50">Sem dados: <strong className="text-white">{turmaStats.frequency.noData}</strong></span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {turmaStats.dims.map(dim => (
          <div key={dim.label} className="p-4 bg-[#0b1326]/60 border border-[#3e484f]/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px] font-bold text-[#dae2fd]">{dim.label}</span>
              <span className="text-[16px] font-mono font-black text-[#38bdf8]">{dim.d.coverage}/{turmaStats.total} ({dim.d.coveragePct}%)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dim.d.distribution.length === 0 ? (
                <span className="text-[13px] text-[#bdc8d1]/50 italic">Nenhuma avaliação registrada</span>
              ) : dim.d.distribution.map(x => (
                <span key={x.label} className="px-2 py-1 rounded bg-[#131b2e] border border-[#3e484f]/40 text-[13px] text-[#bdc8d1]">{x.label}: <strong className="text-[15px] text-white">{x.count}</strong></span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 text-[#dae2fd]">
      <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-4 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-[#3e484f]/25 pb-2">
          <div className="flex items-center gap-2">
            <ClipboardCopy className="w-4 h-4 text-[#38bdf8]" />
            <h4 className="text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{isPainelEstatistico ? 'Painel de Controle' : 'Painel de Controle de Desempenho'}</h4>
          </div>
          {isSupabaseConfigured && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono font-bold" title="Sincronização em tempo real ativada com Supabase">
              <Database className="w-3 h-3 animate-pulse" />
              <span>Sincronizado</span>
            </span>
          )}
        </div>

        {user?.role === 'Aluno' && loggedInStudentObj ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="bg-[#0b1326] rounded-xl p-3 border border-[#3e484f]/25 font-mono text-xs flex flex-wrap gap-x-4 gap-y-1.5 flex-1 w-full">
              <div className="flex items-center gap-2">
                <StudentAvatar student={loggedInStudentObj} size="h-7 w-7" text="text-[9px]" />
                <div>
                  <span className="text-[#bdc8d1]/60">Estudante:</span>{' '}
                  <strong className="text-white">{loggedInStudentObj.name}</strong>
                </div>
              </div>
              <div>
                <span className="text-[#bdc8d1]/60">Matrícula:</span>{' '}
                <strong className="text-[#8ed5ff]">{loggedInStudentObj.enrollmentId || loggedInStudentObj.id}</strong>
              </div>
              <div>
                <span className="text-[#bdc8d1]/60">Série/Turma:</span>{' '}
                <strong className="text-[#8ed5ff]">{loggedInStudentObj.grade}</strong>
              </div>
              <div>
                <span className="text-[#bdc8d1]/60">Unidade:</span>{' '}
                <strong className="text-[#8ed5ff]">{loggedInStudentObj.locality || 'Centro'}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {isAnaliseGeral ? (
                <div className="space-y-1 min-w-[200px] w-full md:w-auto">
                  <label className="text-[10px] font-semibold text-[#bdc8d1]/90 flex items-center gap-1">
                    <Flag className="w-3 h-3 text-[#38bdf8]" />
                    Dimensão de Foco
                  </label>
                  <FocusAreaSelect
                    value={focusArea}
                    onChange={(v) => setFocusArea(v)}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-1 min-w-[200px] w-full md:w-auto">
                  <label className="text-[10px] font-semibold text-[#bdc8d1]/90 flex items-center gap-1">
                    <History className="w-3 h-3 text-[#38bdf8]" />
                    Histórico de Relatórios
                  </label>
                  <select
                    value={selectedReportId}
                    onChange={(e) => handleSelectGlobalReport(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  >
                    {orderedHistoryReports.map(r => (
                      <option key={r.id} value={r.id}>
                        [{toBrDate(r.date)}] {r.focusArea}
                      </option>
                  ))}
                </select>
              </div>
            )}

              {!isAnaliseGeral && (
                <button
                  type="button"
                  onClick={handleGeneratePDF}
                  disabled={!aiReport || !selectedStudentId}
                  className="flex items-center justify-center gap-1.5 py-2 px-4 bg-[#38bdf8]/15 hover:bg-[#38bdf8]/25 disabled:opacity-40 border border-[#38bdf8]/35 rounded-lg text-[#38bdf8] text-xs font-bold transition-all h-[34px] self-end cursor-pointer"
                  title="Baixar Relatório como PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PDF</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">
            {/* 1. Contrato */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <label className="text-[10px] font-bold text-[#bdc8d1]/85 block uppercase tracking-tight">Contrato</label>
                {!isUserAdmin && assignedContracts.length === 1 && (
                  <Lock className="w-3 h-3 text-amber-400" />
                )}
              </div>
              <select 
                value={contract}
                onChange={(e) => {
                  setContract(e.target.value);
                  setStateFilter('');
                  setCityFilter('');
                  setLocalityFilter('');
                  setGradeFilter('');
                  setSelectedStudentId('');
                  setAiReport(null);
                }}
                disabled={isHydrating || (!isUserAdmin && assignedContracts.length === 1)}
                className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">{isHydrating ? 'Carregando...' : 'Selecione...'}</option>
                {!isHydrating && isUserAdmin && <option value="Todos">Todos</option>}
                {!isHydrating && availableContracts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* 2. Estado */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <label className="text-[10px] font-bold text-[#bdc8d1]/85 block uppercase tracking-tight">Estado</label>
                {!isUserAdmin && assignedStates.length === 1 && (
                  <Lock className="w-3 h-3 text-amber-400" />
                )}
              </div>
              <select 
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value);
                  setCityFilter('');
                  setLocalityFilter('');
                  setGradeFilter('');
                  setSelectedStudentId('');
                  setAiReport(null);
                }}
                disabled={isHydrating || !contract || (!isUserAdmin && assignedStates.length === 1)}
                className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] disabled:opacity-60 disabled:cursor-not-allowed focus:border-[#38bdf8] outline-none transition-all"
              >
                <option value="">{isHydrating ? 'Carregando...' : 'Selecione...'}</option>
                {!isHydrating && isUserAdmin && contract === 'Todos' && <option value="Todos">Todos</option>}
                {!isHydrating && availableStates.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* 3. Região */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <label className="text-[10px] font-bold text-[#bdc8d1]/85 block uppercase tracking-tight">Região</label>
                {!isUserAdmin && assignedRegions.length === 1 && (
                  <Lock className="w-3 h-3 text-amber-400" />
                )}
              </div>
              <select 
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value);
                  setLocalityFilter('');
                  setGradeFilter('');
                  setSelectedStudentId('');
                  setAiReport(null);
                }}
                disabled={isHydrating || !stateFilter || (!isUserAdmin && assignedRegions.length === 1)}
                className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] disabled:opacity-60 disabled:cursor-not-allowed focus:border-[#38bdf8] outline-none transition-all"
              >
                <option value="">{isHydrating ? 'Carregando...' : 'Selecione...'}</option>
                {!isHydrating && isUserAdmin && (contract === 'Todos' || stateFilter === 'Todos') && <option value="Todos">Todas</option>}
                {!isHydrating && availableRegions.map(reg => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
            </div>

            {/* 4. Localidade */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <label className="text-[10px] font-bold text-[#bdc8d1]/85 block uppercase tracking-tight">Localidade</label>
                {!isUserAdmin && assignedLocalities.length === 1 && (
                  <Lock className="w-3 h-3 text-amber-400" />
                )}
              </div>
              <select 
                value={localityFilter}
                onChange={(e) => {
                  setLocalityFilter(e.target.value);
                  setGradeFilter('');
                  setSelectedStudentId('');
                  setAiReport(null);
                }}
                disabled={isHydrating || !cityFilter || (!isUserAdmin && assignedLocalities.length === 1)}
                className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] disabled:opacity-60 disabled:cursor-not-allowed focus:border-[#38bdf8] outline-none transition-all"
              >
                <option value="">{isHydrating ? 'Carregando...' : 'Selecione...'}</option>
                {!isHydrating && isUserAdmin && (contract === 'Todos' || stateFilter === 'Todos' || cityFilter === 'Todos' || cityFilter === 'Todas') && <option value="Todos">Todas</option>}
                {!isHydrating && availableLocalities.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* 5. Série ou Turma */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#bdc8d1]/85 block uppercase tracking-tight">Série/Turma</label>
              <select 
                value={gradeFilter}
                onChange={(e) => {
                  setGradeFilter(e.target.value);
                  setSelectedStudentId('');
                  setAiReport(null);
                }}
                disabled={isHydrating || !localityFilter}
                className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] disabled:opacity-50 focus:border-[#38bdf8] outline-none transition-all"
              >
                <option value="">Selecione...</option>
                {availableGrades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* 6. Histórico ou Dimensão de Foco (oculta no Painel Estatístico) */}
            {!isPainelEstatistico && (isAnaliseGeral ? (
              user?.role !== 'Aluno' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#bdc8d1]/85 block uppercase tracking-tight flex items-center gap-1">
                    <Flag className="w-3 h-3 text-[#38bdf8]" />
                    Dimensão de Foco
                  </label>
                  <FocusAreaSelect
                    value={focusArea}
                    onChange={(v) => setFocusArea(v)}
                    className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  />
                </div>
              )
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#bdc8d1]/85 block uppercase tracking-tight flex items-center gap-1">
                  <History className="w-3 h-3 text-[#38bdf8]" />
                  Histórico
                </label>
                <select
                  value={selectedReportId}
                  onChange={(e) => handleSelectGlobalReport(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                >
                  {orderedHistoryReports.map(r => (
                    <option key={r.id} value={r.id}>
                      [{toBrDate(r.date)}] {r.studentName} - {r.focusArea}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {/* 7. PDF Download Button (Hidden in Analise Geral) */}
            {!isAnaliseGeral && (
              <div className="w-full">
                <button
                  type="button"
                  onClick={handleGeneratePDF}
                  disabled={!aiReport || !selectedStudentId}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#38bdf8]/15 hover:bg-[#38bdf8]/25 disabled:opacity-40 disabled:hover:bg-[#38bdf8]/15 border border-[#38bdf8]/35 rounded-lg text-[#38bdf8] text-xs font-bold transition-all h-[34px] cursor-pointer"
                  title="Baixar Relatório como PDF"
                >
                  <Download className="w-4 h-4" />
                  <span>PDF</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isAnaliseGeral && (
        <div className="space-y-6">
          {user?.role === 'Aluno' ? (
            /* Student sees their own report dashboard directly in "Analise Geral" */
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <section className="lg:col-span-2 bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-5 shadow-lg h-fit space-y-5">
                <div className="bg-[#0b1326]/50 rounded-xl p-4 border border-[#3e484f]/25 text-center text-xs text-[#bdc8d1]/80">
                  <h4 className="text-[#38bdf8] font-bold mb-1 uppercase tracking-wider">OLÁ, {loggedInStudentObj?.name}!</h4>
                  <p>Este é o seu painel de Análise de Desempenho Institucional.</p>
                </div>
                
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#bdc8d1] uppercase tracking-widest block">DIMENSÃO DE FOCO</label>
                  <FocusAreaSelect
                    value={focusArea}
                    onChange={(v) => {
                      setFocusArea(v);
                      // Clear current report until user clicks the button
                      setAiReport(null);
                      setSelectedReportId('');
                    }}
                    className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all cursor-pointer"
                  />
                </div>

                {studentFocusReports.length > 1 && (
                  <div className="space-y-2 mt-3 p-3 bg-[#0b1326]/40 border border-[#3e484f]/20 rounded-lg animate-in fade-in duration-300">
                    <label className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest block flex items-center gap-1">
                      <History className="w-3 h-3 text-[#38bdf8]" />
                      Histórico Disponível ({studentFocusReports.length})
                    </label>
                    <select
                      value={selectedReportId}
                      onChange={(e) => {
                        const rId = e.target.value;
                        setSelectedReportId(rId);
                        const found = studentFocusReports.find(r => r.id === rId);
                        if (found) {
                          setAiReport(found.report);
                        } else {
                          setAiReport(null);
                        }
                      }}
                      className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all cursor-pointer font-sans"
                    >
                      <option value="">-- Selecione uma versão --</option>
                      {studentFocusReports.map((r, index) => (
                        <option key={r.id} value={r.id}>
                          Relatório {index === 0 ? '(Mais Recente) ' : ''}- {r.date}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[#bdc8d1]/60 leading-tight">
                      Há {studentFocusReports.length} relatórios neste foco. Selecione a versão desejada acima para visualizar.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleViewStudentPerformance}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold text-xs rounded-lg transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-[#38bdf8]/10 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 animate-spin-slow" />
                  <span>Ver Meu Desempenho</span>
                </button>
              </section>

              <section className="lg:col-span-3 bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-6 shadow-lg min-h-[400px] flex flex-col">
                <div className="flex justify-between items-center border-b border-[#3e484f]/25 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-[#38bdf8]" />
                    <h3 className="text-sm font-bold text-white">Relatório Consolidado</h3>
                  </div>
                  {aiReport && (
                    <button
                      onClick={handleGeneratePDF}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-1 rounded hover:bg-[#38bdf8]/20 transition-all cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      PDF
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12">
                    <div className="w-10 h-10 rounded-full border-2 border-[#3e484f] border-t-[#38bdf8] animate-spin"></div>
                    <p className="text-[10px] text-[#bdc8d1] animate-pulse">Carregando sua análise...</p>
                  </div>
                ) : aiReport ? (
                  <div className="prose prose-invert max-w-none text-[#dae2fd] text-xs leading-relaxed overflow-y-auto max-h-[500px] pr-2 scrollbar-thin scrollbar-thumb-surface-container">
                    {renderMarkdown(aiReport)}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-[#bdc8d1]/60 space-y-3">
                    <Sparkles className="w-8 h-8 text-[#3e484f]" />
                    <p className="text-[11px] max-w-xs">Clique no botão para gerar sua análise de desempenho atualizada.</p>
                  </div>
                )}
              </section>
            </div>
          ) : isPainelEstatistico ? (
            /* Modo Painel Estatístico: filtros + painel (sem lote/checkboxes) */
            <div className="bg-[#171f33] border border-[#38bdf8]/30 rounded-xl p-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between gap-3 mb-6 border-b border-[#3e484f]/30 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#38bdf8]/10 rounded-lg">
                    <Flag className="w-5 h-5 text-[#38bdf8]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Painel Estatístico</h3>
                    <p className="text-xs text-[#bdc8d1]/70">Visão consolidada por Contrato, Estado, Região, Localidade e Turma</p>
                  </div>
                </div>
              </div>
              {statsStudentsList.length > 0 ? (statsPanelInner) : (
                <div className="bg-[#0b1326]/50 rounded-xl p-12 border border-dashed border-[#3e484f]/40 text-center">
                  <div className="max-w-sm mx-auto space-y-4">
                    <div className="w-16 h-16 bg-[#1a2b4b] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-[#38bdf8]/40" />
                    </div>
                    <h4 className="text-sm font-bold text-[#dae2fd]">Selecione um filtro</h4>
                    <p className="text-xs text-[#bdc8d1]/80 leading-relaxed">
                      Use os filtros acima (Contrato, Estado, Região, Localidade e/ou Turma) para gerar a estatística consolidada do grupo desejado.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Admin/Professor sees Batch Export */
            <div className="bg-[#171f33] border border-[#38bdf8]/30 rounded-xl p-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between mb-6 border-b border-[#3e484f]/30 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#38bdf8]/10 rounded-lg">
                    <Flag className="w-5 h-5 text-[#38bdf8]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Análise Geral: Exportação em Lote</h3>
                    <p className="text-xs text-[#bdc8d1]/70">Download em PDF de relatórios por turmas e alunos</p>
                  </div>
                </div>
                
                {gradeFilter && activeStudentsList.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleToggleSelectAll}
                      className="px-3 py-1.5 bg-[#0b1326] border border-[#3e484f]/40 hover:border-[#38bdf8]/50 rounded-lg text-[10px] font-bold text-[#bdc8d1] transition-all cursor-pointer"
                    >
                      {selectedStudentIdsForBatch.length === activeStudentsList.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                    <button
                      onClick={handleBatchDownloadZip}
                      className="flex items-center gap-2 px-4 py-1.5 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#0b1326] rounded-lg text-xs font-black transition-all shadow-lg shadow-[#38bdf8]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      <Download className="w-4 h-4" />
                      <span>{loading ? 'PROCESSANDO...' : `BAIXAR SELECIONADOS (${selectedStudentIdsForBatch.length})`}</span>
                    </button>
                    <button
                      onClick={handleFillReportsTurma}
                      disabled={backfilling || loading}
                      className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-[#0b1326] rounded-lg text-xs font-black transition-all shadow-lg cursor-pointer"
                      title="Gera/atualiza os relatórios de todos os alunos desta turma antes de baixar"
                    >
                      <Download className={`w-4 h-4 ${backfilling ? 'animate-bounce' : ''}`} />
                      <span>{backfilling ? 'GERANDO...' : 'PREENCHER RELATÓRIOS'}</span>
                    </button>
                  </div>
                )}

                {gradeFilter && (backfilling || backfillMsg) && (
                  <div className="space-y-1">
                    {backfilling && backfillProgress && backfillProgress.total > 0 && (
                      <>
                        <div className="h-2 w-full bg-[#0b1326] rounded-full overflow-hidden border border-[#3e484f]/40">
                          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round((backfillProgress.done / backfillProgress.total) * 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-[#bdc8d1]/70 font-mono">{backfillProgress.done}/{backfillProgress.total} relatórios processados</p>
                      </>
                    )}
                    {backfillMsg && <p className="text-[11px] font-semibold text-emerald-400">{backfillMsg}</p>}
                  </div>
                )}
              </div>

              {!gradeFilter ? (
                <div className="bg-[#0b1326]/50 rounded-xl p-12 border border-dashed border-[#3e484f]/40 text-center">
                  <div className="max-w-sm mx-auto space-y-4">
                    <div className="w-16 h-16 bg-[#1a2b4b] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-[#38bdf8]/40" />
                    </div>
                    <h4 className="text-sm font-bold text-[#dae2fd]">Selecione uma Série/Turma</h4>
                    <p className="text-xs text-[#bdc8d1]/80 leading-relaxed">
                      Para visualizar a lista de alunos e realizar o download dos relatórios, utilize os filtros de localidade e turma no painel abaixo.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#bdc8d1] uppercase tracking-widest">Alunos da Turma: {gradeFilter}</span>
                    <span className="text-[10px] text-[#38bdf8] font-mono">{activeStudentsList.length} registros encontrados</span>
                  </div>
                  
                  {activeStudentsList.length === 0 ? (
                    <div className="bg-[#0b1326]/50 rounded-xl p-4 sm:p-8 border border-[#3e484f]/25 text-center text-xs text-[#bdc8d1]/50 italic">
                      Nenhum aluno encontrado para esta seleção.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activeStudentsList.map(s => {
                        const isSelected = selectedStudentIdsForBatch.includes(s.id);
                        return (
                          <div 
                            key={s.id}
                            onClick={() => handleToggleStudentSelection(s.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                              isSelected 
                                ? 'bg-[#38bdf8]/10 border-[#38bdf8] shadow-md shadow-[#38bdf8]/5' 
                                : 'bg-[#0b1326] border-[#3e484f]/40 hover:border-[#38bdf8]/30'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              isSelected ? 'bg-[#38bdf8] border-[#38bdf8]' : 'bg-transparent border-[#3e484f]/60'
                            }`}>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#0b1326]" />}
                            </div>
                            <StudentAvatar student={s} size="h-8 w-8" text="text-[9px]" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{s.name}</p>
                              <p className="text-[9px] text-[#bdc8d1]/60 font-mono">ID: {s.enrollmentId || s.id.substring(0, 8)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {!isAnaliseGeral && user?.role !== 'Aluno' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Parameter selection left-box panel / Student Board */}
      <section className="lg:col-span-2 bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-5 shadow-lg h-fit space-y-5">
        {user?.role === 'Aluno' ? (
          <div className="bg-[#0b1326]/50 rounded-xl p-4 border border-[#3e484f]/25 text-center text-xs text-[#bdc8d1]/80">
            Ambiente exclusivo para consulta individual do aluno.
          </div>
        ) : !gradeFilter ? (
          <div className="bg-[#0b1326]/50 rounded-xl p-6 border border-[#3e484f]/25 text-center space-y-3 py-10">
            <Users className="w-10 h-10 text-[#bdc8d1]/30 mx-auto" />
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Aguardando Turma</h5>
            <p className="text-[11px] text-[#bdc8d1]/65 leading-relaxed">
              Selecione uma <strong>Série ou Turma</strong> no submenu acima para visualizar a lista de alunos da classe.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#3e484f]/25 pb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#38bdf8]" />
                <h4 className="text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">Alunos ({activeStudentsList.length})</h4>
              </div>
              <span className="text-[10px] bg-[#38bdf8]/10 text-[#38bdf8] px-2 py-0.5 rounded-full font-bold">
                Turma {gradeFilter}
              </span>
            </div>

            {activeStudentsList.length === 0 ? (
              <p className="text-xs text-[#bdc8d1]/50 italic text-center py-6">Nenhum aluno ativo encontrado nesta turma.</p>
            ) : (
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-surface-container">
                {activeStudentsList.map((s) => {
                  const isSelected = selectedStudentId === s.id;
                  return (
                    <div
                      key={s.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#38bdf8]/10 border-[#38bdf8] shadow-md shadow-[#38bdf8]/5'
                          : 'bg-[#0b1326] border-[#3e484f]/40 hover:border-[#3e484f] hover:bg-[#0b1326]/80'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <StudentAvatar student={s} size="h-6 w-6" text="text-[8px]" />
                          {s.name}
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </h5>
                        <p className="text-[9px] text-[#bdc8d1]/65 mt-0.5 font-mono">
                          Matrícula: {s.enrollmentId || s.id.substring(0, 8)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setAiReport(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                            : 'bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/20'
                        }`}
                      >
                        {isSelected ? 'Selecionado' : 'Selecionar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Selected Student Configuration Parameters */}
        {selectedStudentId && (
          <div className="space-y-4 pt-4 border-t border-[#3e484f]/20 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                <h5 className="text-[11px] font-bold text-[#bdc8d1] uppercase tracking-wider">Configuração do Relatório</h5>
              </div>
              {selectedReportId && (
                <button
                  type="button"
                  onClick={() => handleDeleteReport(selectedReportId)}
                  className="p-2 px-2 bg-red-900/40 hover:bg-red-950 border border-red-500/30 rounded text-red-400 text-[10px] font-bold transition-colors cursor-pointer"
                  title="Excluir este relatório salvo"
                >
                  Excluir Salvo
                </button>
              )}
            </div>

            {/* Attendance display if available */}
            {attendanceRate !== null && (
              <div className="p-3 bg-[#0b1326] rounded-xl border border-[#3e484f]/40 flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-[#bdc8d1]/60 uppercase font-bold tracking-tight">Frequência Escolar Acumulada</p>
                  <p className="text-xs font-black text-white">{attendanceRate.toFixed(1)}%</p>
                </div>
                <div className={`px-2 py-0.5 rounded text-[9px] font-bold ${attendanceRate >= 75 ? 'bg-emerald-500/20 text-emerald-400' : attendanceRate >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {attendanceRate >= 75 ? 'Excelente' : attendanceRate >= 50 ? 'Regular' : 'Crítico'}
                </div>
              </div>
            )}

            {/* Focus Area Selection */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#bdc8d1]/90 block">Dimensão de Foco:</label>
              <FocusAreaSelect
                value={focusArea}
                onChange={(v) => setFocusArea(v)}
                className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
              />
            </div>

            {/* Assessment records list based on Focus Area */}
            {/* IMC Selection for Desempenho Corporal */}
            {focusArea === 'Desempenho Corporal' && imcRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Avaliação de IMC:
                </label>
                <select
                  value={selectedImcId}
                  onChange={(e) => setSelectedImcId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-colors"
                >
                  {imcRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date} - IMC: {rec.imc} ({rec.classification})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Corporal' && imcRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">Este aluno não possui avaliações de IMC registradas.</p>
              </div>
            )}

            {/* Motor Record Selection for Desempenho de Capacidades Físicas */}
            {focusArea === 'Desempenho de Capacidades Físicas' && motorRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Qualidade Motora:
                </label>
                <select
                  value={selectedMotorId}
                  onChange={(e) => setSelectedMotorId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-colors"
                >
                  {motorRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : 'Sem data'} - Geral: {rec.generalClass || 'Não classificado'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho de Capacidades Físicas' && motorRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">Este aluno não possui avaliações de Qualidade Motora registradas.</p>
              </div>
            )}

            {/* Sport Record Selection */}
            {focusArea === 'Desempenho em Atividades Esportivas' && sportRecords.length > 0 && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    Avaliação Esportiva:
                  </label>
                  <select
                    value={selectedSportId}
                    onChange={(e) => setSelectedSportId(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-colors font-bold"
                  >
                    {sportRecords.map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.date ? rec.date.split('-').reverse().join('/') : 'Sem data'} - Esporte: {rec.suggestedSport || 'Não especificado'}
                      </option>
                    ))}
                  </select>
                </div>

                {availableSubSports.length > 0 && (
                  <div className="space-y-1 animate-in fade-in duration-200">
                    <label className="text-xs font-semibold text-[#a855f7] block flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#a855f7] animate-pulse" />
                      Esporte do Relatório:
                    </label>
                    <select
                      value={selectedSportName}
                      onChange={(e) => setSelectedSportName(e.target.value)}
                      className="w-full bg-[#0b1326] border border-[#a855f7]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#a855f7] outline-none font-bold"
                    >
                      {availableSubSports.map((sport) => (
                        <option key={sport} value={sport}>
                          {sport}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {focusArea === 'Desempenho em Atividades Esportivas' && sportRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">Este aluno não possui avaliações de Esporte Indicado registradas.</p>
              </div>
            )}

            {/* Vocational Record Selection */}
            {focusArea === 'Desempenho Vocacional' && vocationRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Perfil Vocacional:
                </label>
                <select
                  value={selectedVocationId}
                  onChange={(e) => setSelectedVocationId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {vocationRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : 'Sem data'} - Perfil: {rec.profile || 'Não especificado'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Vocacional' && vocationRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">Este aluno não possui avaliações de Vocacionamento registradas.</p>
              </div>
            )}

            {/* Saude Global Record Selection */}
            {focusArea === 'Desempenho Saúde Global' && healthRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Avaliação de Saúde Global:
                </label>
                <select
                  value={selectedHealthId}
                  onChange={(e) => setSelectedHealthId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {healthRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : 'Sem data'} - {rec.classification || 'Não classificado'} (T {Number(rec.tScore).toFixed(1)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Saúde Global' && healthRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">Este aluno não possui avaliações de Saúde Global registradas.</p>
              </div>
            )}

            {/* Higiene Bucal Record Selection */}
            {focusArea === 'Desempenho Higiene Bucal' && oralRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Avaliação de Higiene Bucal:
                </label>
                <select
                  value={selectedOralId}
                  onChange={(e) => setSelectedOralId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {oralRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : 'Sem data'} - {rec.classification || 'Não classificado'} (Score {rec.score}/12)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Higiene Bucal' && oralRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">Este aluno não possui avaliações de Higiene Bucal registradas.</p>
              </div>
            )}

            {/* Autoconceito Record Selection */}
            {focusArea === 'Desempenho Autoconceito' && autoconceptRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Avaliação de Autoconceito:
                </label>
                <select
                  value={selectedAutoId}
                  onChange={(e) => setSelectedAutoId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {autoconceptRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : 'Sem data'} - {rec.classification || 'Não classificado'} (Score {rec.score}/30)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Autoconceito' && autoconceptRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">Este aluno não possui avaliações de Autoconceito registradas.</p>
              </div>
            )}

            {/* Indice Alimentar Record Selection */}
            {focusArea === 'Desempenho Índice Alimentar' && iasRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Avaliação de Índice Alimentar:
                </label>
                <select
                  value={selectedIasId}
                  onChange={(e) => setSelectedIasId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {iasRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : 'Sem data'} - {rec.classification || 'Não classificado'} (Score {rec.totalScore}/100)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Índice Alimentar' && iasRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">Este aluno não possui avaliações de Índice Alimentar registradas.</p>
              </div>
            )}

            {/* Rastreamento do TDAH (SNAP-IV) Record Selection */}
            {focusArea === 'Desempenho Rastreamento TDAH' && snapRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Avaliação de Rastreamento do TDAH:
                </label>
                <select
                  value={selectedSnapId}
                  onChange={(e) => setSelectedSnapId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {snapRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : 'Sem data'} - {rec.classification || 'Não classificado'} (Desat. {rec.inattentionScore}/9 · Hiper. {rec.hyperactivityScore}/9)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Rastreamento TDAH' && snapRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">Este aluno não possui avaliações de Rastreamento do TDAH registradas.</p>
              </div>
            )}

            {/* Rastreamento Precoce do TEA (AQ-10) Record Selection */}
            {focusArea === 'Desempenho Rastreamento Precoce do TEA' && aq10Records.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Avaliação de Rastreamento Precoce do TEA:
                </label>
                <select
                  value={selectedAq10Id}
                  onChange={(e) => setSelectedAq10Id(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {aq10Records.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : 'Sem data'} - {rec.classification || 'Não classificada'} (Score {rec.totalScore}/10)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Rastreamento Precoce do TEA' && aq10Records.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">Este aluno não possui avaliações de Rastreamento Precoce do TEA registradas.</p>
              </div>
            )}

            {/* Qualidade Motora PCD Record Selection */}
            {focusArea === 'Desempenho Qualidade Motora PCD' && pcdRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Avaliação de Qualidade Motora PCD:
                </label>
                <select
                  value={selectedPcdId}
                  onChange={(e) => setSelectedPcdId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {pcdRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : 'Sem data'} - {rec.grupoNome || `Grupo ${rec.grupo}`} ({rec.classificacaoPerfil || 'Não classificado'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Qualidade Motora PCD' && pcdRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">Este aluno não possui avaliações de Qualidade Motora PCD registradas.</p>
              </div>
            )}

            {focusArea !== 'Desempenho Completo' && (
            <>
            {/* Educador Annotations */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#bdc8d1]/90 block">Anotações do Educador (Opcional):</label>
              <textarea
                placeholder="Insira anotações breves de comportamento, conquistas recentes ou desafios do aluno..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
                className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] outline-none placeholder-[#87929a] focus:border-[#38bdf8]"
              />
            </div>

            {/* Action Trigger Button */}
            <button
              type="button"
              onClick={handleAddInfo}
              disabled={loading || !selectedStudentId || !annotatable}
              className={`w-full flex items-center justify-center gap-2 py-2.5 font-bold text-xs rounded-lg transition-transform font-sans shadow-lg ${
                observationsSaved
                  ? 'bg-emerald-500/90 text-[#001e2c] cursor-pointer'
                  : 'bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] active:scale-95 shadow-[#38bdf8]/10 cursor-pointer disabled:bg-[#3e484f] disabled:text-[#87929a] disabled:opacity-70 disabled:cursor-not-allowed'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${!observationsSaved && annotatable ? 'animate-spin-slow' : ''}`} />
              <span>{observationsSaved ? 'Informações salvas!' : 'Adicionar Informações'}</span>
            </button>
            {annotatable
              ? currentReportExists && (
                  <p className="text-emerald-400/80 text-[10px] font-bold text-center mt-2">Relatório gerado automaticamente. Use o botão Adicionar Informações para anotar.</p>
                )
              : (
                  <p className="text-amber-400/80 text-[10px] font-bold text-center mt-2">Selecione uma avaliação feita para adicionar informações.</p>
                )}
            </>
            )}
          </div>
        )}
      </section>

      {/* AI output display panel */}
      <section className="lg:col-span-3 bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-6 shadow-lg min-h-[400px] flex flex-col">
        {/* Output Header */}
        <div className="flex justify-between items-center border-b border-[#3e484f]/25 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#38bdf8]" />
          </div>
        </div>

        {/* Loading overlay panel */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-[#3e484f] border-t-[#38bdf8] animate-spin"></div>
              <Sparkles className="w-5 h-5 text-[#38bdf8] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-center space-y-2 max-w-sm px-4">
              <p className="text-xs font-bold text-[#8ed5ff] uppercase tracking-wider">Processando dados do sistema...</p>
              <p className="text-xs text-[#bdc8d1]/90 leading-relaxed font-mono transition-all animate-pulse">
                {loadingMessages[loadingStep]}
              </p>
            </div>
          </div>
        )}

        {/* Success Report presentation screen */}
        {!loading && aiReport && selectedStudentObj && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-surface-container">
            {/* Student metadata header */}
            <div className="p-3 bg-[#0b1326] rounded-xl border border-[#3e484f]/20 flex justify-between items-center">
              <div className="flex-1 flex items-center gap-2.5">
                <StudentAvatar student={selectedStudentObj} size="h-11 w-11" text="text-xs" />
                <div className="min-w-0">
                  <p className="text-[10px] text-[#87929a] font-semibold tracking-wider uppercase">Documento Gerado Para</p>
                  <h5 className="text-sm font-bold text-[#dae2fd] truncate max-w-[200px]">{selectedStudentObj.name}</h5>
                  <p className="text-[9px] text-[#87929a] mt-0.5 truncate uppercase font-bold tracking-tight">
                    {selectedStudentObj.estado || 'N/A'} • {selectedStudentObj.regiao || 'N/A'} • {selectedStudentObj.locality || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#87929a] font-semibold tracking-wider uppercase">Unidade de Classe</p>
                <span className="text-xs text-[#38bdf8] font-bold">{selectedStudentObj.grade}</span>
              </div>
            </div>

            {/* Markdown Display render area */}
            <div className="prose prose-invert max-w-none text-[#dae2fd] select-text">
              {renderMarkdown(aiReport)}
            </div>
          </div>
        )}

        {/* Error panel screen */}
        {!loading && errorMessage && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2">
            <AlertCircle className="w-10 h-10 text-[#ffb4ab] animate-bounce" />
            <p className="text-xs font-bold text-[#ffb4ab]">Falha na Chamada de Geração</p>
            <p className="text-xs text-[#bdc8d1]/80 max-w-md">{errorMessage}</p>
          </div>
        )}

        {/* Empty placeholder state */}
        {!loading && !aiReport && !errorMessage && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-[#bdc8d1]/65 space-y-2">
            <FileText className="w-10 h-10 text-[#3e484f]" />
            {selectedStudentId && focusAreaRecordCount === 0 ? (
              <p className="text-xs font-semibold text-[#dae2fd]/80 max-w-sm">
                Este aluno ainda não possui avaliação de {focusArea.replace(/^Desempenho\s+/, '')}. Realize a avaliação na área de Avaliações para gerar o relatório.
              </p>
            ) : (
              <p className="text-[10px] max-w-sm">
                O sistema irá extrair estatísticas de presenças, referências de matrizes pedagógicas e consolidar um parecer institucional formal em instantes.
              </p>
            )}
          </div>
        )}
      </section>
      </div>
      )}
    </div>
  );
}
