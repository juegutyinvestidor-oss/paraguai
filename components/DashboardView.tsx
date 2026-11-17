'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { 
  Activity, 
  Users, 
  TrendingUp, 
  Award
} from 'lucide-react';
import { type Student, type Modality, type ImcRecord, type MotorRecord, type SportRecord, type VocationalRecord, type HealthRecord, type OralRecord, type AutoconceptRecord, type IasRecord, type SnapRecord, type Aq10Record, type PcdRecord, type ContratoItem, type EstHierarchical, type RegHierarchical, type LocHierarchical, type AttendanceEntry } from '../types/edukyne';
import { normalizeRole } from '../lib/rbac';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_M15_MODALIDADES, PCD_GRUPO_NOMES } from '../lib/pcdScore';

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

interface TooltipEntry {
  name: string;
  value: number;
}

type MotorLevel = 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente';

// Dias letivos do mes: seg-sex, descontando feriados nacionais (fixos e moveis)
function easterSunday(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}

let holidayCache: { year: number; set: Set<string> } | null = null;
function holidaysForYear(year: number): Set<string> {
  if (holidayCache && holidayCache.year === year) return holidayCache.set;
  const set = new Set<string>(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].map(f => `${year}-${f}`));
  const e = easterSunday(year);
  const addOffset = (offset: number) => {
    const dt = new Date(e);
    dt.setDate(dt.getDate() + offset);
    set.add(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
  };
  addOffset(-47); // Carnaval (terca)
  addOffset(-2);  // Sexta-feira Santa
  addOffset(60);  // Corpus Christi
  holidayCache = { year, set };
  return set;
}

function schoolDaysInMonth(year: number, monthIdx: number): number {
  const holidays = holidaysForYear(year);
  const days = new Date(year, monthIdx + 1, 0).getDate();
  let n = 0;
  for (let d = 1; d <= days; d++) {
    const wd = new Date(year, monthIdx, d).getDay();
    if (wd === 0 || wd === 6) continue;
    if (holidays.has(`${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)) continue;
    n++;
  }
  return n;
}

interface DashboardViewProps {
  students: Student[];
  modalities: Modality[];
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
  attendanceRecords?: AttendanceEntry[];
  setActiveTab: (tab: string) => void;
  contratos?: ContratoItem[];
  user?: {
    id?: string;
    name: string;
    role: string;
    email: string;
    contrato?: string;
    estado?: string;
    regiao?: string;
    locality?: string;
    grade?: string;
  };
}

export default function DashboardView({ 
  students, 
  modalities, 
  imcRecords = [], 
  motorRecords = [], 
  sportRecords = [], 
  vocationalRecords = [], 
  healthRecords = [], 
  oralRecords = [], 
  autoconceptRecords = [], 
  iasRecords = [], 
  snapRecords = [], 
  aq10Records = [], 
  pcdRecords = [], 
  attendanceRecords = [],
  setActiveTab: _setActiveTab,
  contratos,
  user
}: DashboardViewProps) {
  // Security Context checks: Lock filters if they have single value, restrict if multiple values
  const isHydrating = user?.id === 'loading';
  const isUserAdmin = user?.role === 'Administrador' || !user;

  // Parsed list of restriction rules from registration data
  const assignedContracts = useMemo(() => {
    if (!user?.contrato) return [];
    return user.contrato.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const assignedStates = useMemo(() => {
    if (!user?.estado) return [];
    return user.estado.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const assignedRegions = useMemo(() => {
    if (!user?.regiao) return [];
    return user.regiao.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const assignedLocalities = useMemo(() => {
    if (!user?.locality) return [];
    return user.locality.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const assignedGrades = useMemo(() => {
    if (!user?.grade) return [];
    return user.grade.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const availableContracts = useMemo(() => {
    const list = contratos || [];
    if (isUserAdmin) return list;
    if (assignedContracts.length > 0) {
      return list.filter(c => assignedContracts.includes(c.name.toLowerCase()) || assignedContracts.includes(c.id.toLowerCase()));
    }
    return list;
  }, [contratos, isUserAdmin, assignedContracts]);

  // Lock status
  const isContractLocked = !isUserAdmin && assignedContracts.length === 1;
  const isStateLocked = !isUserAdmin && assignedStates.length === 1;
  const isRegionLocked = !isUserAdmin && assignedRegions.length === 1;
  const isLocalityLocked = !isUserAdmin && assignedLocalities.length === 1;
  const isGradeLocked = !isUserAdmin && assignedGrades.length === 1;

  // Initialize states with lock awareness dynamically from availableContracts to avoid compilation TDZ
  const [contract, setContract] = useState(() => {
    const match = availableContracts.find(c => 
      assignedContracts.includes(c.name.toLowerCase()) || assignedContracts.includes(c.id.toLowerCase())
    );
    if (isContractLocked && match) {
      return match.id;
    }
    return 'Todos';
  });

  const [stateFilter, setStateFilter] = useState(() => {
    if (isStateLocked) {
      const match = availableContracts
        .flatMap(c => c.estado.split(',').map((s: string) => s.trim()))
        .find(st => assignedStates.includes(st.toLowerCase()));
      if (match) return match;
    }
    return 'Todos';
  });

  const [cityFilter, setCityFilter] = useState(() => {
    if (isRegionLocked) {
      const match = availableContracts
        .flatMap(c => c.regiao.split(',').map((s: string) => s.trim()))
        .find(reg => assignedRegions.includes(reg.toLowerCase()));
      if (match) return match;
    }
    return 'Todos';
  });

  const [localityFilter, setLocalityFilter] = useState(() => {
    if (isLocalityLocked) {
      const match = availableContracts
        .flatMap(c => c.localidade.split(',').map((s: string) => s.trim()))
        .find(loc => assignedLocalities.includes(loc.toLowerCase()));
      if (match) return match;
    }
    return 'Todos';
  });

  const [selectedGrade, setSelectedGrade] = useState(() => {
    if (isGradeLocked) {
      const match = availableContracts
        .flatMap(c => c.grade ? c.grade.split(',').map((s: string) => s.trim()) : [])
        .find(g => assignedGrades.includes(g.toLowerCase()));
      if (match) return match;
    }
    return 'Todos';
  });

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      { id: 'm2-8', name: 'Lutas' }
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
                requirements: typeof row.requirements === 'string' ? JSON.parse(row.requirements) : row.requirements
              }));
              setM2Modalidades(mapped);
              if (typeof window !== 'undefined') {
                localStorage.setItem('educore_m2_modalidades_config', JSON.stringify(mapped));
              }
            }
          } catch (err) {
            console.error('Error fetching m2_modalidades_config in Dashboard:', err);
          }
        }
      }
    };
    fetchM2Modalidades();
  }, []);

  // Now safely define cascading option arrays
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

  const [toastMessage, _setToastMessage] = useState<string | null>(null);
  const [motorHover, setMotorHover] = useState<{ cap: string; lvl: MotorLevel; x: number; y: number } | null>(null);

  // Helpers to resolve locality for student records and modalities
  const getRecordStudent = (studentId: string, studentName: string) => {
    return students.find(s => s.id === studentId || s.name.toLowerCase() === studentName.toLowerCase());
  };

  const getModalityLocality = (modId: string) => {
    return modId === 'm1' ? 'Centro' :
           modId === 'm2' ? 'Zona Sul' :
           modId === 'm3' ? 'Zona Norte' :
           modId === 'm4' ? 'Zona Leste' : 'Centro';
  };

  const isItemAllowed = (itemContrato: string, itemEstado: string, itemRegiao: string, itemLocality: string) => {
    if (!contract) return true;
    
    if (contract !== 'Todos') {
      const targetContractObj = availableContracts.find(c => c.id === contract);
      if (targetContractObj && itemContrato && itemContrato !== targetContractObj.name) {
        return false;
      }
    }
    if (stateFilter && stateFilter !== 'Todos') {
      if (itemEstado && itemEstado !== stateFilter) {
        return false;
      }
    }
    if (cityFilter && cityFilter !== 'Todos' && cityFilter !== 'Todas') {
      if (itemRegiao && itemRegiao !== cityFilter) {
        return false;
      }
    }
    if (localityFilter && localityFilter !== 'Todos') {
      const sLoc = (itemLocality || 'Centro').toLowerCase().trim();
      const mLoc = localityFilter.toLowerCase().trim();
      if (sLoc !== mLoc) {
        return false;
      }
    }
    return true;
  };

  const loggedInStudentObj = useMemo(() => {
    if (!user || normalizeRole(user.role) !== 'Aluno') return null;
    return students.find(s => 
      s.email?.toLowerCase().trim() === user.email?.toLowerCase().trim() ||
      s.name?.toLowerCase().trim() === user.name?.toLowerCase().trim() ||
      s.id === user.id
    );
  }, [user, students]);

  const isAluno = user && normalizeRole(user.role) === 'Aluno';

  const isMatchForUser = (student: Student | undefined) => {
    if (!student) return false;
    if (isUserAdmin) return true;
    if (user && normalizeRole(user.role) === 'Aluno') {
      return student.id === loggedInStudentObj?.id;
    }
    if (assignedContracts.length > 0 && (!student.contrato || !assignedContracts.includes(student.contrato.toLowerCase()))) {
      return false;
    }
    if (assignedStates.length > 0 && (!student.estado || !assignedStates.includes(student.estado.toLowerCase()))) {
      return false;
    }
    if (assignedRegions.length > 0 && (!student.regiao || !assignedRegions.includes(student.regiao.toLowerCase()))) {
      return false;
    }
    if (assignedLocalities.length > 0 && (!student.locality || !assignedLocalities.includes(student.locality.toLowerCase()))) {
      return false;
    }
    if (assignedGrades.length > 0 && (!student.grade || !assignedGrades.includes(student.grade.toLowerCase()))) {
      return false;
    }
    return true;
  };

  // Filtered Lists dynamically synced with search filters
  const filteredStudentsList = students.filter(s => 
    isItemAllowed(s.contrato || '', s.estado || '', s.regiao || '', s.locality || 'Centro') &&
    isMatchForUser(s) &&
    (!selectedGrade || selectedGrade === 'Todos' || s.grade === selectedGrade)
  );
  
  const filteredModalities = modalities.filter(m => {
    const mLoc = m.locality || getModalityLocality(m.id);
    const mContrato = m.contrato || ((m.id === 'm1' || m.id === 'm4') ? 'Contrato Esportivo Municipal' :
                      m.id === 'm2' ? 'Contrato Fomento Educação Integrada' : 'Contrato Atendimento Especializado');
    const mEstado = m.estado || ((m.id === 'm1' || m.id === 'm4') ? 'São Paulo' :
                    m.id === 'm2' ? 'Rio de Janeiro' : 'Minas Gerais');
    const mRegiao = m.regiao || ((m.id === 'm1' || m.id === 'm4') ? 'Zona Leste' :
                    m.id === 'm2' ? 'Região Metropolitana' : 'Sul de Minas');
    
    // Alunos only see modalities they are linked to (enrolled in)
    if (user && normalizeRole(user.role) === 'Aluno') {
      const isEnrolled = loggedInStudentObj && (m.enrolledStudentIds || []).includes(loggedInStudentObj.id);
      return isEnrolled && isItemAllowed(mContrato, mEstado, mRegiao, mLoc);
    }
    
    // Nas modalidade esportivas, aparecer apenas as modalidade onde o professor esta vinculado.
    if (user && normalizeRole(user.role) === 'Professor') {
      const pName = user.name || '';
      const isProfessorLinked = m.professorId === user.id || 
        (m.coach && m.coach.toLowerCase().includes(pName.toLowerCase()));
      if (!isProfessorLinked) return false;
    }
    
    const isAllowed = isItemAllowed(mContrato, mEstado, mRegiao, mLoc);
    return isAllowed;
  });
  
  const filteredImcRecords = (imcRecords || []).filter(r => {
    const student = getRecordStudent(r.studentId, r.studentName);
    return isItemAllowed(
      student?.contrato || '', 
      student?.estado || '', 
      student?.regiao || '', 
      student?.locality || (r.studentName.toLowerCase().includes('arthur') ? 'Centro' : r.studentName.toLowerCase().includes('beatriz') ? 'Zona Sul' : 'Centro')
    ) && isMatchForUser(student) &&
    (!selectedGrade || selectedGrade === 'Todos' || student?.grade === selectedGrade || r.classGroup === selectedGrade);
  });
  
  const filteredMotorRecords = (motorRecords || []).filter(r => {
    const student = getRecordStudent(r.studentId, r.studentName);
    return isItemAllowed(
      student?.contrato || '', 
      student?.estado || '', 
      student?.regiao || '', 
      student?.locality || (r.studentName.toLowerCase().includes('arthur') ? 'Centro' : r.studentName.toLowerCase().includes('beatriz') ? 'Zona Sul' : 'Centro')
    ) && isMatchForUser(student) &&
    (!selectedGrade || selectedGrade === 'Todos' || student?.grade === selectedGrade);
  });

  const filteredSportRecords = (sportRecords || []).filter(r => {
    const student = getRecordStudent(r.studentId, r.studentName);
    return isItemAllowed(
      student?.contrato || '', 
      student?.estado || '', 
      student?.regiao || '', 
      student?.locality || (r.studentName.toLowerCase().includes('arthur') ? 'Centro' : r.studentName.toLowerCase().includes('beatriz') ? 'Zona Sul' : 'Centro')
    ) && isMatchForUser(student) &&
    (!selectedGrade || selectedGrade === 'Todos' || student?.grade === selectedGrade);
  });

  const filteredVocationalRecords = (vocationalRecords || []).filter(r => {
    const student = getRecordStudent(r.studentId, r.studentName);
    return isItemAllowed(
      student?.contrato || '', 
      student?.estado || '', 
      student?.regiao || '', 
      student?.locality || (r.studentName.toLowerCase().includes('arthur') ? 'Centro' : r.studentName.toLowerCase().includes('beatriz') ? 'Zona Sul' : 'Centro')
    ) && isMatchForUser(student) &&
    (!selectedGrade || selectedGrade === 'Todos' || student?.grade === selectedGrade);
  });

  const filteredHealthRecords = (healthRecords || []).filter(r => {
    const student = getRecordStudent(r.studentId, r.studentName);
    return isItemAllowed(
      student?.contrato || '', 
      student?.estado || '', 
      student?.regiao || '', 
      student?.locality || (r.studentName.toLowerCase().includes('arthur') ? 'Centro' : r.studentName.toLowerCase().includes('beatriz') ? 'Zona Sul' : 'Centro')
    ) && isMatchForUser(student) &&
    (!selectedGrade || selectedGrade === 'Todos' || student?.grade === selectedGrade);
  });

  const filteredOralRecords = (oralRecords || []).filter(r => {
    const student = getRecordStudent(r.studentId, r.studentName);
    return isItemAllowed(
      student?.contrato || '', 
      student?.estado || '', 
      student?.regiao || '', 
      student?.locality || (r.studentName.toLowerCase().includes('arthur') ? 'Centro' : r.studentName.toLowerCase().includes('beatriz') ? 'Zona Sul' : 'Centro')
    ) && isMatchForUser(student) &&
    (!selectedGrade || selectedGrade === 'Todos' || student?.grade === selectedGrade);
  });

  const filteredAutoconceptRecords = (autoconceptRecords || []).filter(r => {
    const student = getRecordStudent(r.studentId, r.studentName);
    return isItemAllowed(
      student?.contrato || '', 
      student?.estado || '', 
      student?.regiao || '', 
      student?.locality || (r.studentName.toLowerCase().includes('arthur') ? 'Centro' : r.studentName.toLowerCase().includes('beatriz') ? 'Zona Sul' : 'Centro')
    ) && isMatchForUser(student) &&
    (!selectedGrade || selectedGrade === 'Todos' || student?.grade === selectedGrade);
  });

  const filteredIasRecords = (iasRecords || []).filter(r => {
    const student = getRecordStudent(r.studentId, r.studentName);
    return isItemAllowed(
      student?.contrato || '', 
      student?.estado || '', 
      student?.regiao || '', 
      student?.locality || (r.studentName.toLowerCase().includes('arthur') ? 'Centro' : r.studentName.toLowerCase().includes('beatriz') ? 'Zona Sul' : 'Centro')
    ) && isMatchForUser(student) &&
    (!selectedGrade || selectedGrade === 'Todos' || student?.grade === selectedGrade);
  });  // Stats calculation based on filtered lists

  const filteredSnapRecords = (snapRecords || []).filter(r => {
    const student = getRecordStudent(r.studentId, r.studentName);
    return isItemAllowed(
      student?.contrato || '', 
      student?.estado || '', 
      student?.regiao || '', 
      student?.locality || (r.studentName.toLowerCase().includes('arthur') ? 'Centro' : r.studentName.toLowerCase().includes('beatriz') ? 'Zona Sul' : 'Centro')
    ) && isMatchForUser(student) &&
    (!selectedGrade || selectedGrade === 'Todos' || student?.grade === selectedGrade);
  });
  const filteredAq10Records = (aq10Records || []).filter(r => {
    const student = getRecordStudent(r.studentId, r.studentName);
    return isItemAllowed(
      student?.contrato || '', 
      student?.estado || '', 
      student?.regiao || '', 
      student?.locality || (r.studentName.toLowerCase().includes('arthur') ? 'Centro' : r.studentName.toLowerCase().includes('beatriz') ? 'Zona Sul' : 'Centro')
    ) && isMatchForUser(student) &&
    (!selectedGrade || selectedGrade === 'Todos' || student?.grade === selectedGrade);
  });
  const filteredPcdRecords = (pcdRecords || []).filter(r => {
    const student = getRecordStudent(r.studentId, r.studentName);
    return isItemAllowed(
      student?.contrato || '', 
      student?.estado || '', 
      student?.regiao || '', 
      student?.locality || (r.studentName.toLowerCase().includes('arthur') ? 'Centro' : r.studentName.toLowerCase().includes('beatriz') ? 'Zona Sul' : 'Centro')
    ) && isMatchForUser(student) &&
    (!selectedGrade || selectedGrade === 'Todos' || student?.grade === selectedGrade);
  });
  const totalStudents = filteredStudentsList.length;
  const activeStudents = filteredStudentsList.filter(s => s.status === 'Ativo').length;
  const inactiveStudents = filteredStudentsList.filter(s => s.status === 'Inativo').length;

  // 4f. Cobertura de avaliacoes: % dos alunos (no escopo filtrado) que possuem cada dimensao
  const coverageDims: { label: string; recs: { studentId: string }[]; c: [string, string] }[] = [
    { label: 'IMC', recs: filteredImcRecords, c: ['#38bdf8', '#0369a1'] },
    { label: 'Capacidades', recs: filteredMotorRecords, c: ['#a78bfa', '#6d28d9'] },
    { label: 'Esportivo', recs: filteredSportRecords, c: ['#f59e0b', '#b45309'] },
    { label: 'Vocacional', recs: filteredVocationalRecords, c: ['#34d399', '#059669'] },
    { label: 'Saúde Global', recs: filteredHealthRecords, c: ['#fb7185', '#be123c'] },
    { label: 'Higiene Bucal', recs: filteredOralRecords, c: ['#fbbf24', '#d97706'] },
    { label: 'Autoconceito', recs: filteredAutoconceptRecords, c: ['#60a5fa', '#2563eb'] },
    { label: 'Índice Alimentar', recs: filteredIasRecords, c: ['#2dd4bf', '#0f766e'] },
    { label: 'Rastreamento TDAH', recs: filteredSnapRecords, c: ['#c084fc', '#7e22ce'] },
    { label: 'Rastreamento Precoce do TEA', recs: filteredAq10Records, c: ['#e879f9', '#a21caf'] },
    { label: 'Qualidade Motora PCD', recs: filteredPcdRecords, c: ['#22d3ee', '#0e7490'] },
  ];
  const coverageChartData = coverageDims.map(d => {
    const seen = new Set<string>();
    let male = 0, female = 0;
    d.recs.forEach(r => {
      if (!r.studentId || seen.has(r.studentId)) return;
      seen.add(r.studentId);
      const st = getRecordStudent(r.studentId, '');
      if (st?.gender === 'Masculino') male++; else female++;
    });
    const count = seen.size;
    const pct = totalStudents ? Math.round((count / totalStudents) * 100) : 0;
    return { label: `${d.label} ${pct}%`, value: count, maleCount: male, femaleCount: female, startColor: d.c[0], endColor: d.c[1] };
  });

  // 1. IMC (Índice de Massa Corporal) Calculations using filtered lists
  const imcGroups = {
    abaixo: { total: 0, male: 0, female: 0 },
    ideal: { total: 0, male: 0, female: 0 },
    sobrepeso: { total: 0, male: 0, female: 0 },
    obesidade: { total: 0, male: 0, female: 0 }
  };

  filteredImcRecords.forEach(r => {
    const imcVal = Number(r.imc);
    if (!isNaN(imcVal)) {
      const student = getRecordStudent(r.studentId, r.studentName);
      const isMale = student?.gender === 'Masculino';
      let group: keyof typeof imcGroups;
      if (imcVal < 18.5) group = 'abaixo';
      else if (imcVal < 25.0) group = 'ideal';
      else if (imcVal < 30.0) group = 'sobrepeso';
      else group = 'obesidade';
      imcGroups[group].total++;
      if (isMale) imcGroups[group].male++;
      else imcGroups[group].female++;
    }
  });

  let imcChartData = [
    { label: 'Abaixo Peso', value: imcGroups.abaixo.total, maleCount: imcGroups.abaixo.male, femaleCount: imcGroups.abaixo.female, startColor: '#fb7185', endColor: '#e11d48' },
    { label: 'Peso Ideal', value: imcGroups.ideal.total, maleCount: imcGroups.ideal.male, femaleCount: imcGroups.ideal.female, startColor: '#34d399', endColor: '#059669' },
    { label: 'Sobrepeso', value: imcGroups.sobrepeso.total, maleCount: imcGroups.sobrepeso.male, femaleCount: imcGroups.sobrepeso.female, startColor: '#fbbf24', endColor: '#d97706' },
    { label: 'Obesidade', value: imcGroups.obesidade.total, maleCount: imcGroups.obesidade.male, femaleCount: imcGroups.obesidade.female, startColor: '#f87171', endColor: '#dc2626' }
  ];

  if (isAluno) {
    const hasValues = imcChartData.some(d => d.value > 0);
    if (hasValues) {
      imcChartData = imcChartData.filter(d => d.value > 0);
    }
  }

  // 2. Qualidade Motora Detailed Matrix Calculations using filtered lists
  const motorMatrix = {
    impulsao: {
      label: 'Impulso',
      counts: { Excelente: 0, Bom: 0, Regular: 0, Insuficiente: 0 },
      colors: {
        Excelente: { bg: 'bg-[#032f30]', text: 'text-[#14b8a6]', border: 'border-[#115e59]/30' },
        Bom: { bg: 'bg-[#115e59]/80', text: 'text-[#2dd4bf]', border: 'border-[#0f766e]/30' },
        Regular: { bg: 'bg-[#0d9488]/80', text: 'text-[#5eead4]', border: 'border-[#0d9488]/30' },
        Insuficiente: { bg: 'bg-[#2dd4bf]/80', text: 'text-[#ccfbf1]', border: 'border-[#2dd4bf]/30' }
      }
    },
    abdomen: {
      label: 'Abdômen',
      counts: { Excelente: 0, Bom: 0, Regular: 0, Insuficiente: 0 },
      colors: {
        Excelente: { bg: 'bg-[#172554]', text: 'text-[#60a5fa]', border: 'border-[#1e3a8a]/30' },
        Bom: { bg: 'bg-[#1e3a8a]/80', text: 'text-[#3b82f6]', border: 'border-[#1d4ed8]/30' },
        Regular: { bg: 'bg-[#1d4ed8]/80', text: 'text-[#93c5fd]', border: 'border-[#2563eb]/30' },
        Insuficiente: { bg: 'bg-[#3b82f6]/80', text: 'text-[#dbeafe]', border: 'border-[#3b82f6]/30' }
      }
    },
    agilidade: {
      label: 'Agilidade',
      counts: { Excelente: 0, Bom: 0, Regular: 0, Insuficiente: 0 },
      colors: {
        Excelente: { bg: 'bg-[#451a03]', text: 'text-[#fbbf24]', border: 'border-[#78350f]/30' },
        Bom: { bg: 'bg-[#78350f]/80', text: 'text-[#facc15]', border: 'border-[#b45309]/30' },
        Regular: { bg: 'bg-[#b45309]/80', text: 'text-[#fef08a]', border: 'border-[#d97706]/30' },
        Insuficiente: { bg: 'bg-[#d97706]/80', text: 'text-[#fef9c3]', border: 'border-[#f59e0b]/30' }
      }
    },
    forca: {
      label: 'Força',
      counts: { Excelente: 0, Bom: 0, Regular: 0, Insuficiente: 0 },
      colors: {
        Excelente: { bg: 'bg-[#431407]', text: 'text-[#fb923c]', border: 'border-[#7c2d12]/30' },
        Bom: { bg: 'bg-[#7c2d12]/80', text: 'text-[#f97316]', border: 'border-[#9a3412]/30' },
        Regular: { bg: 'bg-[#9a3412]/80', text: 'text-[#ffedd5]', border: 'border-[#c2410c]/30' },
        Insuficiente: { bg: 'bg-[#ea580c]/80', text: 'text-[#fff7ed]', border: 'border-[#ea580c]/30' }
      }
    },
    velocidade: {
      label: 'Velocidade',
      counts: { Excelente: 0, Bom: 0, Regular: 0, Insuficiente: 0 },
      colors: {
        Excelente: { bg: 'bg-[#4c0519]', text: 'text-[#f472b6]', border: 'border-[#881337]/30' },
        Bom: { bg: 'bg-[#881337]/80', text: 'text-[#ec4899]', border: 'border-[#9d174d]/30' },
        Regular: { bg: 'bg-[#9d174d]/80', text: 'text-[#fbcfe8]', border: 'border-[#db2777]/30' },
        Insuficiente: { bg: 'bg-[#db2777]/80', text: 'text-[#fdf2f8]', border: 'border-[#f472b6]/30' }
      }
    }
  };

  const motorGenderCounts: Record<string, Record<MotorLevel, { male: number; female: number }>> = {};
  Object.keys(motorMatrix).forEach(k => {
    motorGenderCounts[k] = {
      Excelente: { male: 0, female: 0 },
      Bom: { male: 0, female: 0 },
      Regular: { male: 0, female: 0 },
      Insuficiente: { male: 0, female: 0 }
    };
  });

  filteredMotorRecords.forEach(r => {
    const student = getRecordStudent(r.studentId, r.studentName);
    const isMale = student?.gender === 'Masculino';
    const bump = (capKey: keyof typeof motorMatrix, lvl?: string) => {
      if (lvl !== 'Excelente' && lvl !== 'Bom' && lvl !== 'Regular' && lvl !== 'Insuficiente') return;
      motorMatrix[capKey].counts[lvl]++;
      if (isMale) motorGenderCounts[capKey][lvl].male++;
      else motorGenderCounts[capKey][lvl].female++;
    };
    bump('impulsao', r.impulsao || r.flexibility);
    bump('abdomen', r.abdomen || r.coordination);
    bump('agilidade', r.agility);
    bump('forca', r.strength);
    bump('velocidade', r.speed);
  });

  // 3. Esporte Indicado Calculations using filtered lists dynamically from Módulo 2 modalities
  const sportGroups: { [key: string]: { total: number; male: number; female: number } } = {};
  m2Modalidades.forEach((mod: M2Modality) => {
    if (mod.name) {
      sportGroups[mod.name] = { total: 0, male: 0, female: 0 };
    }
  });
  sportGroups['Aprimorar Habilidades Motoras'] = { total: 0, male: 0, female: 0 };

  filteredSportRecords.forEach(r => {
    const sport = (r.suggestedSport || '').trim().toLowerCase();
    const student = getRecordStudent(r.studentId, r.studentName);
    const isMale = student?.gender === 'Masculino';
    
    const incrementGroup = (key: string) => {
      if (sportGroups[key]) {
        sportGroups[key].total++;
        if (isMale) sportGroups[key].male++;
        else sportGroups[key].female++;
      }
    };

    if (!sport) {
      incrementGroup('Aprimorar Habilidades Motoras');
      return;
    }

    let matched = false;
    for (const mod of m2Modalidades) {
      const modNameLower = (mod.name || '').trim().toLowerCase();
      if (!modNameLower) continue;

      if (sport.includes(modNameLower) || modNameLower.includes(sport)) {
        incrementGroup(mod.name);
        matched = true;
        break;
      }
    }

    if (!matched) {
      if (sport.includes('corrida') && sportGroups.hasOwnProperty('Atletismo')) {
        incrementGroup('Atletismo');
      } else if (sport.includes('basketball') && sportGroups.hasOwnProperty('Basquete')) {
        incrementGroup('Basquete');
      } else if (sport.includes('natacao') && sportGroups.hasOwnProperty('Natação')) {
        incrementGroup('Natação');
      } else if ((sport.includes('volei') || sport.includes('volleyball')) && sportGroups.hasOwnProperty('Vôlei')) {
        incrementGroup('Vôlei');
      } else if (sport.includes('ginastica') && sportGroups.hasOwnProperty('Ginástica')) {
        incrementGroup('Ginástica');
      } else {
        incrementGroup('Aprimorar Habilidades Motoras');
      }
    }
  });

  const PRESET_COLORS = [
    { startColor: '#a78bfa', endColor: '#7c3aed' }, // Purple/Violet
    { startColor: '#38bdf8', endColor: '#0284c7' }, // Sky Blue
    { startColor: '#fb923c', endColor: '#ea580c' }, // Orange
    { startColor: '#f472b6', endColor: '#db2777' }, // Pink
    { startColor: '#4ade80', endColor: '#16a34a' }, // Green
    { startColor: '#60a5fa', endColor: '#2563eb' }, // Blue
    { startColor: '#e879f9', endColor: '#d946ef' }, // Magenta
    { startColor: '#fb7185', endColor: '#e11d48' }, // Rose/Red
    { startColor: '#2dd4bf', endColor: '#0d9488' }, // Teal
    { startColor: '#facc15', endColor: '#ca8a04' }, // Yellow
    { startColor: '#fb5779', endColor: '#ea1040' }  // Darker Rose
  ];

  let sportChartData = m2Modalidades.map((mod, index) => {
    const color = PRESET_COLORS[index % PRESET_COLORS.length];
    const group = sportGroups[mod.name] || { total: 0, male: 0, female: 0 };
    return {
      label: mod.name,
      value: group.total,
      maleCount: group.male,
      femaleCount: group.female,
      startColor: color.startColor,
      endColor: color.endColor
    };
  });

  sportChartData.push({
    label: 'Aprimorar Habilidades Motoras',
    value: sportGroups['Aprimorar Habilidades Motoras']?.total || 0,
    maleCount: sportGroups['Aprimorar Habilidades Motoras']?.male || 0,
    femaleCount: sportGroups['Aprimorar Habilidades Motoras']?.female || 0,
    startColor: '#94a3b8',
    endColor: '#475569'
  });

  if (isAluno) {
    const hasValues = sportChartData.some(d => d.value > 0);
    if (hasValues) {
      sportChartData = sportChartData.filter(d => d.value > 0);
    }
  }

  // 4. Vocacionamento Calculations using filtered lists
  const vocationalGroups: { [key: string]: { total: number; male: number; female: number } } = {
    'Humanas e Sociais': { total: 0, male: 0, female: 0 },
    'Exatas e Tecnológicas': { total: 0, male: 0, female: 0 },
    'Biológicas e Criativas': { total: 0, male: 0, female: 0 },
    'Negócios e Gestão': { total: 0, male: 0, female: 0 },
    'Criativo e Tecnológico': { total: 0, male: 0, female: 0 }
  };

  filteredVocationalRecords.forEach(r => {
    const prof = r.profile as string;
    const student = getRecordStudent(r.studentId, r.studentName);
    const isMale = student?.gender === 'Masculino';
    
    const incrementGroup = (key: string) => {
      if (vocationalGroups[key]) {
        vocationalGroups[key].total++;
        if (isMale) vocationalGroups[key].male++;
        else vocationalGroups[key].female++;
      }
    };

    if (vocationalGroups.hasOwnProperty(prof)) {
      incrementGroup(prof);
    } else if (prof) {
      if (prof.toLowerCase().includes('lider') || prof.toLowerCase().includes('negócio') || prof.toLowerCase().includes('negocio')) {
        incrementGroup('Negócios e Gestão');
      } else if (prof.toLowerCase().includes('criar') || prof.toLowerCase().includes('criat') || prof.toLowerCase().includes('bio')) {
        incrementGroup('Biológicas e Criativas');
      } else if (prof.toLowerCase().includes('comun') || prof.toLowerCase().includes('human')) {
        incrementGroup('Humanas e Sociais');
      } else if (prof.toLowerCase().includes('tec') || prof.toLowerCase().includes('analí') || prof.toLowerCase().includes('anali')) {
        if (prof.toLowerCase().includes('cria')) {
          incrementGroup('Criativo e Tecnológico');
        } else {
          incrementGroup('Exatas e Tecnológicas');
        }
      } else {
        incrementGroup('Criativo e Tecnológico');
      }
    }
  });

  let vocationalChartData = [
    { label: 'Humanas e Sociais', value: vocationalGroups['Humanas e Sociais'].total, maleCount: vocationalGroups['Humanas e Sociais'].male, femaleCount: vocationalGroups['Humanas e Sociais'].female, startColor: '#f472b6', endColor: '#db2777' },
    { label: 'Exatas e Tecnológicas', value: vocationalGroups['Exatas e Tecnológicas'].total, maleCount: vocationalGroups['Exatas e Tecnológicas'].male, femaleCount: vocationalGroups['Exatas e Tecnológicas'].female, startColor: '#38bdf8', endColor: '#0369a1' },
    { label: 'Biológicas e Criativas', value: vocationalGroups['Biológicas e Criativas'].total, maleCount: vocationalGroups['Biológicas e Criativas'].male, femaleCount: vocationalGroups['Biológicas e Criativas'].female, startColor: '#fb7185', endColor: '#be123c' },
    { label: 'Negócios e Gestão', value: vocationalGroups['Negócios e Gestão'].total, maleCount: vocationalGroups['Negócios e Gestão'].male, femaleCount: vocationalGroups['Negócios e Gestão'].female, startColor: '#f59e0b', endColor: '#b45309' },
    { label: 'Criativo e Tecnológico', value: vocationalGroups['Criativo e Tecnológico'].total, maleCount: vocationalGroups['Criativo e Tecnológico'].male, femaleCount: vocationalGroups['Criativo e Tecnológico'].female, startColor: '#a78bfa', endColor: '#6d28d9' }
  ];

  if (isAluno) {
    const hasValues = vocationalChartData.some(d => d.value > 0);
    if (hasValues) {
      vocationalChartData = vocationalChartData.filter(d => d.value > 0);
    }
  }

  // 4b. Saude Global (KIDSCREEN-10) Calculations
  const healthGroups: { [key: string]: { total: number; male: number; female: number } } = {
    'Qualidade de Vida Baixa': { total: 0, male: 0, female: 0 },
    'Qualidade de Vida Normal': { total: 0, male: 0, female: 0 },
    'Qualidade de Vida Alta': { total: 0, male: 0, female: 0 }
  };

  filteredHealthRecords.forEach(r => {
    const cls = r.classification as string;
    const student = getRecordStudent(r.studentId, r.studentName);
    const isMale = student?.gender === 'Masculino';
    if (healthGroups.hasOwnProperty(cls)) {
      healthGroups[cls].total++;
      if (isMale) healthGroups[cls].male++;
      else healthGroups[cls].female++;
    }
  });

  let healthChartData = [
    { label: 'Qualidade de Vida Baixa', value: healthGroups['Qualidade de Vida Baixa'].total, maleCount: healthGroups['Qualidade de Vida Baixa'].male, femaleCount: healthGroups['Qualidade de Vida Baixa'].female, startColor: '#f87171', endColor: '#dc2626' },
    { label: 'Qualidade de Vida Normal', value: healthGroups['Qualidade de Vida Normal'].total, maleCount: healthGroups['Qualidade de Vida Normal'].male, femaleCount: healthGroups['Qualidade de Vida Normal'].female, startColor: '#fbbf24', endColor: '#d97706' },
    { label: 'Qualidade de Vida Alta', value: healthGroups['Qualidade de Vida Alta'].total, maleCount: healthGroups['Qualidade de Vida Alta'].male, femaleCount: healthGroups['Qualidade de Vida Alta'].female, startColor: '#34d399', endColor: '#059669' }
  ];

  if (isAluno) {
    const hasValues = healthChartData.some(d => d.value > 0);
    if (hasValues) {
      healthChartData = healthChartData.filter(d => d.value > 0);
    }
  }

  // 4c. Higiene Bucal (HU-DBI) Calculations
  const oralGroups: { [key: string]: { total: number; male: number; female: number } } = {
    'Alto Desempenho': { total: 0, male: 0, female: 0 },
    'Desempenho Moderado': { total: 0, male: 0, female: 0 },
    'Baixo Desempenho': { total: 0, male: 0, female: 0 }
  };

  filteredOralRecords.forEach(r => {
    const cls = r.classification as string;
    const student = getRecordStudent(r.studentId, r.studentName);
    const isMale = student?.gender === 'Masculino';
    if (oralGroups.hasOwnProperty(cls)) {
      oralGroups[cls].total++;
      if (isMale) oralGroups[cls].male++;
      else oralGroups[cls].female++;
    }
  });

  let oralChartData = [
    { label: 'Alto Desempenho', value: oralGroups['Alto Desempenho'].total, maleCount: oralGroups['Alto Desempenho'].male, femaleCount: oralGroups['Alto Desempenho'].female, startColor: '#34d399', endColor: '#059669' },
    { label: 'Desempenho Moderado', value: oralGroups['Desempenho Moderado'].total, maleCount: oralGroups['Desempenho Moderado'].male, femaleCount: oralGroups['Desempenho Moderado'].female, startColor: '#fbbf24', endColor: '#d97706' },
    { label: 'Baixo Desempenho', value: oralGroups['Baixo Desempenho'].total, maleCount: oralGroups['Baixo Desempenho'].male, femaleCount: oralGroups['Baixo Desempenho'].female, startColor: '#f87171', endColor: '#dc2626' }
  ];

  if (isAluno) {
    const hasValues = oralChartData.some(d => d.value > 0);
    if (hasValues) {
      oralChartData = oralChartData.filter(d => d.value > 0);
    }
  }

  // 4d. Autoconceito (Rosenberg) Calculations
  const autoGroups: { [key: string]: { total: number; male: number; female: number } } = {
    'Autoestima Baixa': { total: 0, male: 0, female: 0 },
    'Autoestima Equilibrada': { total: 0, male: 0, female: 0 },
    'Autoestima Alta': { total: 0, male: 0, female: 0 }
  };

  filteredAutoconceptRecords.forEach(r => {
    const cls = r.classification as string;
    const student = getRecordStudent(r.studentId, r.studentName);
    const isMale = student?.gender === 'Masculino';
    if (autoGroups.hasOwnProperty(cls)) {
      autoGroups[cls].total++;
      if (isMale) autoGroups[cls].male++;
      else autoGroups[cls].female++;
    }
  });

  let autoChartData = [
    { label: 'Autoestima Baixa', value: autoGroups['Autoestima Baixa'].total, maleCount: autoGroups['Autoestima Baixa'].male, femaleCount: autoGroups['Autoestima Baixa'].female, startColor: '#f87171', endColor: '#dc2626' },
    { label: 'Autoestima Equilibrada', value: autoGroups['Autoestima Equilibrada'].total, maleCount: autoGroups['Autoestima Equilibrada'].male, femaleCount: autoGroups['Autoestima Equilibrada'].female, startColor: '#fbbf24', endColor: '#d97706' },
    { label: 'Autoestima Alta', value: autoGroups['Autoestima Alta'].total, maleCount: autoGroups['Autoestima Alta'].male, femaleCount: autoGroups['Autoestima Alta'].female, startColor: '#a78bfa', endColor: '#6d28d9' }
  ];

  if (isAluno) {
    const hasValues = autoChartData.some(d => d.value > 0);
    if (hasValues) {
      autoChartData = autoChartData.filter(d => d.value > 0);
    }
  }

  // 4e. Indice Alimentar (IAS) Calculations
  const iasGroups: { [key: string]: { total: number; male: number; female: number } } = {
    'Dieta de Má Qualidade': { total: 0, male: 0, female: 0 },
    'Necessita de Modificações': { total: 0, male: 0, female: 0 },
    'Boa Qualidade (Saudável)': { total: 0, male: 0, female: 0 }
  };

  filteredIasRecords.forEach(r => {
    const cls = r.classification as string;
    const student = getRecordStudent(r.studentId, r.studentName);
    const isMale = student?.gender === 'Masculino';
    if (iasGroups.hasOwnProperty(cls)) {
      iasGroups[cls].total++;
      if (isMale) iasGroups[cls].male++;
      else iasGroups[cls].female++;
    }
  });

  let iasChartData = [
    { label: 'Dieta de Má Qualidade', value: iasGroups['Dieta de Má Qualidade'].total, maleCount: iasGroups['Dieta de Má Qualidade'].male, femaleCount: iasGroups['Dieta de Má Qualidade'].female, startColor: '#f87171', endColor: '#dc2626' },
    { label: 'Necessita de Modificações', value: iasGroups['Necessita de Modificações'].total, maleCount: iasGroups['Necessita de Modificações'].male, femaleCount: iasGroups['Necessita de Modificações'].female, startColor: '#fbbf24', endColor: '#d97706' },
    { label: 'Boa Qualidade (Saudável)', value: iasGroups['Boa Qualidade (Saudável)'].total, maleCount: iasGroups['Boa Qualidade (Saudável)'].male, femaleCount: iasGroups['Boa Qualidade (Saudável)'].female, startColor: '#34d399', endColor: '#059669' }
  ];

  if (isAluno) {
    const hasValues = iasChartData.some(d => d.value > 0);
    if (hasValues) {
      iasChartData = iasChartData.filter(d => d.value > 0);
    }
  }

  // 4f. Rastreamento do TDAH (SNAP-IV) Calculations
  const snapGroups: { [key: string]: { total: number; male: number; female: number } } = {
    'Sinais de Desatenção': { total: 0, male: 0, female: 0 },
    'Sinais de Hiperatividade/Impulsividade': { total: 0, male: 0, female: 0 },
    'Sinais Combinados': { total: 0, male: 0, female: 0 },
    'Sem Indícios Significativos': { total: 0, male: 0, female: 0 }
  };

  filteredSnapRecords.forEach(r => {
    const cls = r.classification as string;
    const student = getRecordStudent(r.studentId, r.studentName);
    const isMale = student?.gender === 'Masculino';
    if (snapGroups.hasOwnProperty(cls)) {
      snapGroups[cls].total++;
      if (isMale) snapGroups[cls].male++;
      else snapGroups[cls].female++;
    }
  });

  let snapChartData = [
    { label: 'Sinais de Desatenção', value: snapGroups['Sinais de Desatenção'].total, maleCount: snapGroups['Sinais de Desatenção'].male, femaleCount: snapGroups['Sinais de Desatenção'].female, startColor: '#f87171', endColor: '#dc2626' },
    { label: 'Sinais de Hiperatividade/Impulsividade', value: snapGroups['Sinais de Hiperatividade/Impulsividade'].total, maleCount: snapGroups['Sinais de Hiperatividade/Impulsividade'].male, femaleCount: snapGroups['Sinais de Hiperatividade/Impulsividade'].female, startColor: '#fbbf24', endColor: '#d97706' },
    { label: 'Sinais Combinados', value: snapGroups['Sinais Combinados'].total, maleCount: snapGroups['Sinais Combinados'].male, femaleCount: snapGroups['Sinais Combinados'].female, startColor: '#f472b6', endColor: '#db2777' },
    { label: 'Sem Indícios Significativos', value: snapGroups['Sem Indícios Significativos'].total, maleCount: snapGroups['Sem Indícios Significativos'].male, femaleCount: snapGroups['Sem Indícios Significativos'].female, startColor: '#34d399', endColor: '#059669' }
  ];

  if (isAluno) {
    const hasValues = snapChartData.some(d => d.value > 0);
    if (hasValues) {
      snapChartData = snapChartData.filter(d => d.value > 0);
    }
  }

  // 4g. Rastreamento Precoce do TEA (AQ-10) Calculations
  const aq10Groups: { [key: string]: { total: number; male: number; female: number } } = {
    'Traços comportamentais dentro da média da população geral': { total: 0, male: 0, female: 0 },
    'Pontuação Indicativa (Alerta de Traços Elevados de TEA)': { total: 0, male: 0, female: 0 }
  };

  filteredAq10Records.forEach(r => {
    const cls = r.classification as string;
    const student = getRecordStudent(r.studentId, r.studentName);
    const isMale = student?.gender === 'Masculino';
    if (aq10Groups.hasOwnProperty(cls)) {
      aq10Groups[cls].total++;
      if (isMale) aq10Groups[cls].male++;
      else aq10Groups[cls].female++;
    }
  });

  let aq10ChartData = [
    { label: 'Dentro da média populacional', value: aq10Groups['Traços comportamentais dentro da média da população geral'].total, maleCount: aq10Groups['Traços comportamentais dentro da média da população geral'].male, femaleCount: aq10Groups['Traços comportamentais dentro da média da população geral'].female, startColor: '#34d399', endColor: '#059669' },
    { label: 'Alerta de Traços Elevados de TEA', value: aq10Groups['Pontuação Indicativa (Alerta de Traços Elevados de TEA)'].total, maleCount: aq10Groups['Pontuação Indicativa (Alerta de Traços Elevados de TEA)'].male, femaleCount: aq10Groups['Pontuação Indicativa (Alerta de Traços Elevados de TEA)'].female, startColor: '#f87171', endColor: '#dc2626' }
  ];

  if (isAluno) {
    const hasValues = aq10ChartData.some(d => d.value > 0);
    if (hasValues) {
      aq10ChartData = aq10ChartData.filter(d => d.value > 0);
    }
  }

  // 4h. Qualidade Motora PCD Calculations
  const PCD_PERFIS = ['Perfil Motor Elevado', 'Perfil Motor Mediano', 'Perfil Motor com Limitações'] as const;
  const pcdGroups: { [key: string]: { total: number; male: number; female: number } } = Object.fromEntries(
    PCD_PERFIS.map(p => [p, { total: 0, male: 0, female: 0 }])
  );

  filteredPcdRecords.forEach(r => {
    const cls: string = (PCD_PERFIS as readonly string[]).includes(r.classificacaoPerfil) ? r.classificacaoPerfil : 'Não classificada';
    if (!pcdGroups[cls]) pcdGroups[cls] = { total: 0, male: 0, female: 0 };
    pcdGroups[cls].total++;
    const student = getRecordStudent(r.studentId, r.studentName);
    if (student?.gender === 'Masculino') pcdGroups[cls].male++;
    else pcdGroups[cls].female++;
  });

  const pcdPalette: [string, string][] = [
    ['#22d3ee', '#0e7490'],
    ['#60a5fa', '#1d4ed8'],
    ['#34d399', '#059669'],
    ['#fbbf24', '#b45309']
  ];

  let pcdChartData = PCD_PERFIS.map((label, i) => ({
    label,
    value: pcdGroups[label].total,
    maleCount: pcdGroups[label].male,
    femaleCount: pcdGroups[label].female,
    startColor: pcdPalette[i % pcdPalette.length][0],
    endColor: pcdPalette[i % pcdPalette.length][1]
  }));

  if (isAluno) {
    const hasValues = pcdChartData.some(d => d.value > 0);
    if (hasValues) {
      pcdChartData = pcdChartData.filter(d => d.value > 0);
    }
  }

  // 4i. Modalidades Sugeridas PCD (modalidade de maior IAR por avaliacao)
  const pcdSugeridasMap: { [key: string]: { total: number; male: number; female: number } } = {};
  filteredPcdRecords.forEach(r => {
    const comp = Array.isArray(r.compatibilidade) ? r.compatibilidade : [];
    const top = comp.length > 0
      ? [...comp].sort((a, b) => (b.iar ?? 0) - (a.iar ?? 0))[0]?.modalidade
      : null;
    const key = top || 'Não definida';
    if (!pcdSugeridasMap[key]) pcdSugeridasMap[key] = { total: 0, male: 0, female: 0 };
    pcdSugeridasMap[key].total++;
    const student = getRecordStudent(r.studentId, r.studentName);
    if (student?.gender === 'Masculino') pcdSugeridasMap[key].male++;
    else pcdSugeridasMap[key].female++;
  });

  const pcdModPalette: [string, string][] = [
    ['#38bdf8', '#0284c7'],
    ['#a78bfa', '#7c3aed'],
    ['#34d399', '#059669'],
    ['#fbbf24', '#b45309'],
    ['#f472b6', '#db2777'],
    ['#fb7185', '#e11d48'],
    ['#2dd4bf', '#0f766e'],
    ['#c084fc', '#7e22ce'],
  ];

  const pcdModalidadesBase = DEFAULT_M15_MODALIDADES.map(m => m.nome);
  const pcdModChartFull = pcdModalidadesBase
    .map((nome, i) => {
      const v = pcdSugeridasMap[nome];
      return {
        label: nome,
        value: v?.total ?? 0,
        maleCount: v?.male ?? 0,
        femaleCount: v?.female ?? 0,
        startColor: pcdModPalette[i % pcdModPalette.length][0],
        endColor: pcdModPalette[i % pcdModPalette.length][1]
      };
    })
    .concat(
      Object.entries(pcdSugeridasMap)
        .filter(([label]) => label === 'Não definida')
        .map(([label, v], i) => ({
          label,
          value: v.total,
          maleCount: v.male,
          femaleCount: v.female,
          startColor: pcdModPalette[(pcdModalidadesBase.length + i) % pcdModPalette.length][0],
          endColor: pcdModPalette[(pcdModalidadesBase.length + i) % pcdModPalette.length][1]
        }))
    );

  // 4j. Grupos PCD (contagem por grupo de deficiencia)
  const pcdGruposMap: { [key: string]: { total: number; male: number; female: number } } = {};
  filteredPcdRecords.forEach(r => {
    const key = String(r.grupo ?? '');
    if (!pcdGruposMap[key]) pcdGruposMap[key] = { total: 0, male: 0, female: 0 };
    pcdGruposMap[key].total++;
    const student = getRecordStudent(r.studentId, r.studentName);
    if (student?.gender === 'Masculino') pcdGruposMap[key].male++;
    else pcdGruposMap[key].female++;
  });

  const pcdGrupoPalette: [string, string][] = [
    ['#22d3ee', '#0e7490'],
    ['#60a5fa', '#1d4ed8'],
    ['#a78bfa', '#7c3aed'],
    ['#34d399', '#059669'],
    ['#fbbf24', '#b45309'],
    ['#f472b6', '#db2777'],
  ];

  const pcdGrupoChartData = [1, 2, 3, 4, 5, 6].map((g, i) => {
    const v = pcdGruposMap[String(g)];
    return {
      label: PCD_GRUPO_NOMES[g] || `Grupo ${g}`,
      value: v?.total ?? 0,
      maleCount: v?.male ?? 0,
      femaleCount: v?.female ?? 0,
      startColor: pcdGrupoPalette[i % pcdGrupoPalette.length][0],
      endColor: pcdGrupoPalette[i % pcdGrupoPalette.length][1]
    };
  });

  // 5. Modalidades Esportivas Cadastradas
  const modalitiesChartData = filteredModalities.map((m, idx) => {
    const colors = [
      { startColor: '#34d399', endColor: '#059669' }, // Emerald
      { startColor: '#38bdf8', endColor: '#0284c7' }, // Light Blue
      { startColor: '#fb923c', endColor: '#ea580c' }, // Orange
      { startColor: '#a78bfa', endColor: '#7c3aed' }, // Purple
      { startColor: '#f472b6', endColor: '#db2777' }, // Pink
      { startColor: '#fb7185', endColor: '#e11d48' }, // Rose
    ];
    const color = colors[idx % colors.length];
    
    const isAluno = user && normalizeRole(user.role) === 'Aluno';
    // Dynamically calculate enrolled student count based on students who match all active filters (Contract, State, Region, Locality, Grade/Series)
    const enrolledStudents = isAluno 
      ? [loggedInStudentObj].filter(Boolean)
      : filteredStudentsList.filter(s => (m.enrolledStudentIds || []).includes(s.id));
    
    return {
      label: m.name,
      value: enrolledStudents.length,
      maleCount: enrolledStudents.filter(s => s!.gender === 'Masculino').length,
      femaleCount: enrolledStudents.filter(s => s!.gender !== 'Masculino').length,
      startColor: color.startColor,
      endColor: color.endColor
    };
  });

  // 6. Evolucao temporal real: matriculas acumuladas x frequencia mensal (%)
  //    Mes de entrada efetivo = menor entre data de cadastro e presenca mais antiga do aluno
  //    (importacoes em massa gravam created_at identico; a presenca prova que o aluno ja existia)
  const { data: engagementChartData, enrollmentNoDate } = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    const enrolByMonth = new Array(12).fill(0);
    const attTotals = new Array(12).fill(0);
    const attPresent = new Array(12).fill(0);
    let semData = 0;

    const firstAttMonth = new Map<string, number>();
    attendanceRecords.forEach(a => {
      const match = /^(\d{4})-(\d{2})/.exec(a.date || '');
      if (!match) return;
      const mi = Number(match[1]) < currentYear ? 0 : Number(match[2]) - 1;
      const cur = firstAttMonth.get(a.studentId);
      if (cur === undefined || mi < cur) firstAttMonth.set(a.studentId, mi);
    });

    filteredStudentsList.forEach(s => {
      if (s.status !== 'Ativo') return;
      const d = s.createdAt ? new Date(s.createdAt) : null;
      const createdIdx = d && !isNaN(d.getTime())
        ? (d.getFullYear() < currentYear ? 0 : d.getMonth())
        : null;
      const attIdx = firstAttMonth.get(s.id);
      const idx = createdIdx !== null && attIdx !== undefined
        ? Math.min(createdIdx, attIdx)
        : (createdIdx ?? attIdx ?? null);
      if (idx === null) { semData++; return; }
      enrolByMonth[Math.min(Math.max(idx, 0), 11)]++;
    });

    const validStudentIds = new Set(filteredStudentsList.map(s => s.id));
    attendanceRecords.forEach(a => {
      if (!validStudentIds.has(a.studentId)) return;
      const match = /^(\d{4})-(\d{2})/.exec(a.date || '');
      if (!match || Number(match[1]) !== currentYear) return;
      const mi = Number(match[2]) - 1;
      if (mi < 0 || mi > 11) return;
      attTotals[mi]++;
      if (a.present) attPresent[mi]++;
    });

    let cumulative = 0;
    const rows = monthNames.map((name, idx) => {
      cumulative += enrolByMonth[idx];
      const expected = cumulative * schoolDaysInMonth(currentYear, idx);
      let freq: number | null = null;
      if (attTotals[idx] > 0 && expected > 0) {
        freq = Math.min(100, Math.round((attPresent[idx] / expected) * 100));
      }
      return {
        name,
        'Matrículas acumuladas': cumulative,
        'Frequência (%)': freq,
        'Ausência (%)': freq === null ? null : 100 - freq
      };
    });
    return { data: rows, enrollmentNoDate: semData };
  }, [filteredStudentsList, attendanceRecords]);

  return (
    <div className="space-y-6 text-[#dae2fd]">
      {/* Dynamic Feedback Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-8 bg-[#171f33] border-l-4 border-[#38bdf8] text-[#dae2fd] text-xs px-4 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 animate-bounce">
          <TrendingUp className="w-4 h-4 text-[#38bdf8]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* FILTROS DE PESQUISA (Centered and styled exactly as requested with cascade) */}
      {(!user || normalizeRole(user.role) !== 'Aluno') && (
        <section className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#3e484f]/25 pb-2">
            <h4 className="text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">
              Filtro Unificado - Territórios & Contratos administrados
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
            {/* Contrato */}
            <div className="flex flex-col gap-1.5 font-sans">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-[#bdc8d1]/90">Contrato:</label>
              </div>
              <select 
                value={contract}
                disabled={isHydrating || isContractLocked}
                onChange={(e) => {
                  setContract(e.target.value || 'Todos');
                  setStateFilter('Todos');
                  setCityFilter('Todos');
                  setLocalityFilter('Todos');
                  setSelectedGrade('Todos');
                }}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Todos">Todos os Contratos</option>
                {availableContracts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div className="flex flex-col gap-1.5 font-sans">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-[#bdc8d1]/90">Estado:</label>
              </div>
              <select 
                value={stateFilter}
                disabled={isHydrating || isStateLocked}
                onChange={(e) => {
                  setStateFilter(e.target.value || 'Todos');
                  setCityFilter('Todos');
                  setLocalityFilter('Todos');
                  setSelectedGrade('Todos');
                }}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Todos">Todos os Estados</option>
                {availableStates.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Região */}
            <div className="flex flex-col gap-1.5 font-sans">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-[#bdc8d1]/90">Região:</label>
              </div>
              <select 
                value={cityFilter}
                disabled={isHydrating || isRegionLocked}
                onChange={(e) => {
                  setCityFilter(e.target.value || 'Todos');
                  setLocalityFilter('Todos');
                  setSelectedGrade('Todos');
                }}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Todos">Todas as Regiões</option>
                {availableRegions.map(reg => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
            </div>

            {/* Localidade */}
            <div className="flex flex-col gap-1.5 font-sans">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-[#bdc8d1]/90">Localidade:</label>
              </div>
              <select 
                value={localityFilter}
                disabled={isHydrating || isLocalityLocked}
                onChange={(e) => {
                  setLocalityFilter(e.target.value || 'Todos');
                  setSelectedGrade('Todos');
                }}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] outline-none transition-all font-sans disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Todos">Todas as Localidades</option>
                {availableLocalities.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Série/Turma */}
            <div className="flex flex-col gap-1.5 font-sans animate-fade-in text-[#dae2fd]">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-[#bdc8d1]/90">Série/Turma:</label>
              </div>
              <select 
                value={selectedGrade}
                disabled={isHydrating || isGradeLocked}
                onChange={(e) => setSelectedGrade(e.target.value || 'Todos')}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] outline-none transition-all font-sans disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Todos">Todas as Turmas</option>
                {availableGrades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* Executive Indicators Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
        {isAluno ? (
          <>
            {/* KPI 1 - Seu Cadastro */}
            <div className="bg-[#171f33] border border-[#3e484f]/40 p-4 rounded-xl shadow-md hover:border-[#38bdf8]/50 transition-all group lg:col-span-3">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-[#bdc8d1] tracking-wider uppercase">Seu Cadastro</span>
                <Users className="w-4 h-4 text-[#38bdf8] group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-2">
                <h4 className="text-xl font-bold tracking-tight text-[#dae2fd] truncate">{loggedInStudentObj?.name || user?.name || 'Aluno'}</h4>
                <p className="text-[10px] text-[#bdc8d1]/70 mt-1">
                  Status: <span className="text-[#38bdf8] font-semibold">{loggedInStudentObj?.status || 'Ativo'}</span>
                </p>
              </div>
            </div>

            {/* KPI 2 - Sua Turma */}
            <div className="bg-[#171f33] border border-[#3e484f]/40 p-4 rounded-xl shadow-md hover:border-[#38bdf8]/50 transition-all group lg:col-span-3">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-[#bdc8d1] tracking-wider uppercase font-medium">Sua Turma</span>
                <Award className="w-4 h-4 text-[#38bdf8] group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-2">
                <h4 className="text-2xl font-bold tracking-tight text-[#dae2fd]">{loggedInStudentObj?.grade || 'Sem Turma'}</h4>
                <p className="text-[10px] text-[#bdc8d1]/70 mt-1 truncate animate-fade-in" title={loggedInStudentObj?.contrato}>
                  Contrato: {loggedInStudentObj?.contrato || '-'}
                </p>
              </div>
            </div>

            {/* KPI 3 - Suas Oficinas */}
            <div className="bg-[#171f33] border border-[#3e484f]/40 p-4 rounded-xl shadow-md hover:border-[#38bdf8]/50 transition-all group lg:col-span-3">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-[#bdc8d1] tracking-wider uppercase">Suas Oficinas</span>
                <Activity className="w-4 h-4 text-[#38bdf8] group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-2">
                <h4 className="text-2xl font-bold tracking-tight text-[#dae2fd]">
                  {filteredModalities.length}
                </h4>
                <p className="text-[10px] text-[#bdc8d1]/70 mt-1">Modalidades vinculadas</p>
              </div>
            </div>

            {/* KPI 4 - Sua Unidade */}
            <div className="bg-[#171f33] border border-[#3e484f]/40 p-4 rounded-xl shadow-md hover:border-[#38bdf8]/50 transition-all group lg:col-span-3">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-[#bdc8d1] tracking-wider uppercase font-medium">Sua Unidade</span>
                <TrendingUp className="w-4 h-4 text-[#38bdf8] group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-2">
                <h4 className="text-2xl font-bold tracking-tight text-[#dae2fd]">
                  {loggedInStudentObj?.locality || 'Centro'}
                </h4>
                <p className="text-[10px] text-[#bdc8d1]/70 mt-1">
                  {loggedInStudentObj?.regiao || ''} - {loggedInStudentObj?.estado || ''}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* KPI 1 */}
            <div className="bg-[#171f33] border border-[#3e484f]/40 p-4 rounded-xl shadow-md hover:border-[#38bdf8]/50 transition-all group lg:col-span-4">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-[#bdc8d1] tracking-wider uppercase">Matrículas Totais</span>
                <Users className="w-4 h-4 text-[#38bdf8] group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-2">
                <h4 className="text-2xl font-bold tracking-tight text-[#dae2fd]">{totalStudents}</h4>
                <p className="text-[10px] text-[#bdc8d1]/70 mt-1">
                  <span className="text-[#38bdf8] font-semibold">+{activeStudents} ativos</span> este ciclo
                </p>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-[#171f33] border border-[#3e484f]/40 p-4 rounded-xl shadow-md hover:border-[#38bdf8]/50 transition-all group lg:col-span-4">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-[#bdc8d1] tracking-wider uppercase">Extracurriculares</span>
                <Activity className="w-4 h-4 text-[#38bdf8] group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-2">
                <h4 className="text-2xl font-bold tracking-tight text-[#dae2fd]">
                  {modalitiesChartData.reduce((acc, curr) => acc + curr.value, 0)}
                </h4>
                <p className="text-[10px] text-[#bdc8d1]/70 mt-1">Matrículas por Modalidade Esportiva</p>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-[#171f33] border border-[#3e484f]/40 p-4 rounded-xl shadow-md hover:border-[#38bdf8]/50 transition-all group lg:col-span-4">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-[#bdc8d1] tracking-wider uppercase font-medium">Turmas Operantes</span>
                <Award className="w-4 h-4 text-[#38bdf8] group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-2">
                <h4 className="text-2xl font-bold tracking-tight text-[#dae2fd]">
                  {new Set(filteredStudentsList.filter(s => s.status === 'Ativo').map(s => s.grade)).size}
                </h4>
                <p className="text-[10px] text-[#ffb4ab] mt-1 font-semibold">{inactiveStudents} alunos inativos</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 gap-6">
        <ColumnChartCard 
          title="Índice Geral" 
          data={coverageChartData}
        />
        {/* Recharts modern area chart - stretched to full width */}
        <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-5 shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
            <div>
              <h4 className="text-sm font-bold text-[#dae2fd] tracking-tight">Matrículas &amp; Frequência Mensal</h4>
              <p className="text-xs text-[#bdc8d1]/75 mt-0.5">Alunos Matriculados</p>
            </div>
            {enrollmentNoDate > 0 && (
              <span
                className="text-[10px] font-bold text-amber-400 tracking-wider uppercase bg-amber-500/10 px-2.5 py-1 rounded-md self-start sm:self-auto border border-amber-500/25"
                title={`${enrollmentNoDate} aluno(s) ativo(s) sem data de matrícula não entram na curva`}
              >
                {enrollmentNoDate} sem data de matrícula
              </span>
            )}
          </div>

          <div className="w-full h-64 pt-2">
            {!isMounted ? (
              <div className="w-full h-full bg-[#0b1326]/30 animate-pulse rounded-lg flex items-center justify-center border border-[#3e484f]/25">
                <span className="text-xs text-[#bdc8d1]/50 font-sans">Carregando gráfico de matrículas e frequência...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={engagementChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorMatriculas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFrequencia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3e484f" opacity={0.25} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#bdc8d1" 
                    opacity={0.7} 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    className="font-sans font-semibold"
                  />
                  <YAxis 
                    yAxisId="count"
                    stroke="#bdc8d1" 
                    opacity={0.7} 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dx={-5}
                    allowDecimals={false}
                    className="font-sans font-semibold"
                  />
                  <YAxis
                    yAxisId="pct"
                    orientation="right"
                    domain={[0, 100]}
                    stroke="#34d399"
                    opacity={0.7}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                    width={38}
                    className="font-sans font-semibold"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#0b1326]/95 border border-[#3e484f] px-3.5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
                            <p className="text-xs font-bold text-[#dae2fd] border-b border-[#3e484f]/40 pb-1.5 mb-1.5 font-sans">{label}</p>
                            {payload.map((entry: TooltipEntry, index: number) => {
                              const isPct = entry.name !== 'Matrículas acumuladas';
                              const dotColor = entry.name === 'Frequência (%)' ? '#34d399' : entry.name === 'Ausência (%)' ? '#f87171' : '#38bdf8';
                              return (
                                <div key={index} className="flex items-center justify-between gap-6 text-xs mt-1 font-sans">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                                    <span className="text-[#bdc8d1] font-medium">{entry.name}:</span>
                                  </div>
                                  <span className="font-bold text-white text-right">{isPct ? `${entry.value}%` : entry.value}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    content={({ payload: _payload }) => (
                      <div className="flex justify-center gap-6 mt-4 text-xs font-sans font-semibold">
                        <div className="flex items-center gap-2 text-[#bdc8d1] hover:text-white transition-colors cursor-pointer">
                          <span className="w-3 h-3 rounded-full bg-[#38bdf8] shadow-md shadow-[#38bdf8]/20" />
                          <span>Matriculas</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#bdc8d1] hover:text-white transition-colors cursor-pointer">
                          <span className="w-3 h-3 rounded-full bg-[#34d399] shadow-md shadow-[#34d399]/20" />
                          <span>Frequência (%)</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#bdc8d1] hover:text-white transition-colors cursor-pointer">
                          <span className="w-3 h-3 rounded-full bg-[#f87171] shadow-md shadow-[#f87171]/20" />
                          <span>Ausência (%)</span>
                        </div>
                      </div>
                    )}
                  />
                  <Area 
                    yAxisId="count"
                    type="monotone" 
                    dataKey="Matrículas acumuladas" 
                    stroke="#38bdf8" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorMatriculas)" 
                    activeDot={{ r: 6, strokeWidth: 1.5, stroke: '#0f172a' }}
                  />
                  <Area
                    yAxisId="pct"
                    type="monotone"
                    dataKey="Frequência (%)"
                    stroke="#34d399"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFrequencia)"
                    connectNulls={false}
                    activeDot={{ r: 5, strokeWidth: 1, stroke: '#0f172a' }}
                  />
                  <Area
                    yAxisId="pct"
                    type="monotone"
                    dataKey="Ausência (%)"
                    stroke="#f87171"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    fill="none"
                    connectNulls={false}
                    activeDot={{ r: 5, strokeWidth: 1, stroke: '#0f172a' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Lista Vertical de Gráficos de Coluna das Avaliações (Escala Maior) */}
      <section className="space-y-6 pt-5 border-t border-[#3e484f]/20">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-[#8ed5ff] uppercase tracking-wider">
            Desempenho Físico-Vocacional
          </h3>
        </div>
 
        <div className="flex flex-col gap-8">
          <ColumnChartCard 
            title="Matrículas por Modalidade Esportiva" 
            data={modalitiesChartData}
          />
          <ColumnChartCard 
            title="Índice de Massa Corporal (IMC)" 
            subtitle="Distribuição por status nutricional" 
            data={imcChartData}
          />
          {/* Custom Pillar Stack Chart for "Qualidade Motora" */}
          <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[460px] hover:border-[#38bdf8]/50 hover:shadow-2xl transition-all group duration-300 w-full overflow-hidden" id="custom-motor-qualities-card">
            <div className="mb-6">
              <h4 className="text-sm sm:text-base font-bold text-[#dae2fd] group-hover:text-[#38bdf8] transition-colors">Qualidade Motora</h4>
              <p className="text-[11px] sm:text-xs text-[#bdc8d1]/75 mt-0.5">Distribuição das classificações por capacidade motora avaliada</p>
              {Object.values(motorMatrix).every(item => item.counts.Excelente + item.counts.Bom + item.counts.Regular + item.counts.Insuficiente === 0) && (
                <p className="text-[11px] text-[#bdc8d1]/50 mt-3 font-sans">Nenhuma avaliação motora registrada no filtro atual.</p>
              )}
            </div>

            {/* Fluid container ensuring no scrollbars appear on desktop, scrollable on mobile */}
            <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#3e484f]/40">
              <div className="flex items-start justify-between sm:justify-around gap-4 min-w-[500px] sm:w-full select-none">
                {Object.entries(motorMatrix).map(([key, item]) => {
                  const totalCategory = item.counts.Excelente + item.counts.Bom + item.counts.Regular + item.counts.Insuficiente;

                  // Order of levels in the vertical bar is: Excelente (top), Bom, Regular, Insuficiente (bottom)
                  const levels: ('Excelente' | 'Bom' | 'Regular' | 'Insuficiente')[] = ['Excelente', 'Bom', 'Regular', 'Insuficiente'];

                  return (
                    <div key={key} className="flex flex-col items-center flex-1" id={`pillar-container-${key}`}>
                      {/* Vertical stacked package: centered pillar with inside labels */}
                      <div className="flex items-center justify-center w-full">
                        {/* Stiff pillar shape containing the 4 segments */}
                        <div className="w-full max-w-[56px] sm:max-w-[72px] md:max-w-[96px] h-[280px] flex flex-col rounded-2xl overflow-hidden border border-[#3e484f]/25 shadow-xl bg-[#080e1b] shrink-0">
                          {levels.map((lvl) => {
                            const count = item.counts[lvl];
                            const cfg = item.colors[lvl];
                            const isPopulated = count > 0;
                            const genders = motorGenderCounts[key][lvl];
                            const isHov = motorHover?.cap === key && motorHover?.lvl === lvl;

                            // Truncate to compact abbreviation inside the pillar segments
                            const shortLabel = lvl === 'Excelente' ? 'Exc.' : lvl === 'Regular' ? 'Reg.' : lvl === 'Insuficiente' ? 'Insuf.' : 'Bom';

                            return (
                              <div 
                                key={lvl} 
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const x = Math.min(Math.max(rect.left + rect.width / 2, 130), window.innerWidth - 130);
                                  setMotorHover({ cap: key, lvl, x, y: Math.max(rect.top - 6, 130) });
                                }}
                                onMouseLeave={() => setMotorHover(null)}
                                className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 relative border-b border-[#3e484f]/25 last:border-b-0 ${cfg.bg} ${isPopulated ? 'opacity-100 scale-[1.01] z-10 shadow-inner' : 'opacity-25 hover:opacity-40'} ${isHov ? 'brightness-125 z-20' : ''}`}
                              >
                                {/* Tooltip on Hover - portal to body to avoid overflow clipping */}
                                {isHov && motorHover && createPortal(
                                  <div
                                    className="fixed z-50 bg-[#080f1d] border border-[#38bdf8]/40 px-3 py-2 rounded-lg text-xs text-[#dae2fd] shadow-2xl pointer-events-none font-sans min-w-[150px]"
                                    style={{ left: motorHover.x, top: motorHover.y, transform: 'translate(-50%, -100%)' }}
                                  >
                                    <div className="font-semibold text-[#8ed5ff] border-b border-[#3e484f]/40 pb-1.5 mb-1.5">{item.label} — {lvl}</div>
                                    <div className="flex items-center justify-between gap-4 mt-1">
                                      <span className="text-[#bdc8d1]">Total:</span>
                                      <span className="font-bold text-white">{count}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 mt-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                                        <span className="text-[#bdc8d1]">Masculino:</span>
                                      </div>
                                      <span className="font-bold text-[#38bdf8]">{genders.male}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 mt-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#f472b6]" />
                                        <span className="text-[#bdc8d1]">Feminino:</span>
                                      </div>
                                      <span className="font-bold text-[#f472b6]">{genders.female}</span>
                                    </div>
                                  </div>,
                                  document.body
                                )}

                                {/* Highlight state text inside each quadrant */}
                                <span className={`text-[8px] sm:text-[9px] md:text-[10px] font-extrabold ${cfg.text} leading-none block uppercase mb-1 truncate px-1 max-w-full text-center`}>
                                  {shortLabel}
                                </span>
                                
                                {/* Dynamic Count */}
                                <span className="text-xs sm:text-sm md:text-base font-black text-white font-mono leading-none text-center">
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Summary details below each pillar */}
                      <div className="mt-4 flex flex-col items-center text-center w-full">
                        <span className="text-xs sm:text-sm md:text-base font-black text-white leading-none font-mono block text-center" id={`total-count-${key}`}>
                          {totalCategory}
                        </span>
                        <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-[#bdc8d1]/90 tracking-wide mt-1.5 break-words max-w-full text-center block" id={`title-label-${key}`}>
                          {item.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <ColumnChartCard 
            title="Esportes Indicados" 
            data={sportChartData}
          />
          <ColumnChartCard 
            title="Vocacionamento" 
            data={vocationalChartData}
          />
          <ColumnChartCard 
            title="Saúde Global" 
            data={healthChartData}
          />
          <ColumnChartCard 
            title="Higiene Bucal" 
            data={oralChartData}
          />
          <ColumnChartCard 
            title="Autoconceito" 
            data={autoChartData}
          />
          <ColumnChartCard 
            title="Índice Alimentar" 
            data={iasChartData}
          />
          <ColumnChartCard 
            title="Rastreamento TDAH (SNAP-IV)" 
            data={snapChartData}
          />
          <ColumnChartCard 
            title="Rastreamento Precoce do TEA (AQ-10)" 
            data={aq10ChartData}
          />
          <ColumnChartCard 
            title="Qualidade Motora PCD" 
            subtitle="Distribuição das classificações do perfil motor" 
            data={pcdChartData}
          />
          <ColumnChartCard 
            title="Modalidades Sugeridas PCD" 
            subtitle="Distribuição da modalidade de maior IAR por avaliação" 
            data={pcdModChartFull}
            hideEmptyOverlay
          />
          <ColumnChartCard 
            title="Grupos PCD" 
            subtitle="Distribuição das avaliações por grupo de deficiência" 
            data={pcdGrupoChartData}
            hideEmptyOverlay
          />
        </div>
      </section>
    </div>
  );
}
 
// Custom interactive beautifully styled column chart component - Larger Scale
function ColumnChartCard({ title, subtitle, data, hideEmptyOverlay }: {
  title: string;
  subtitle?: string;
  data: { label: string; value: number; maleCount?: number; femaleCount?: number; startColor: string; endColor: string }[];
  hideEmptyOverlay?: boolean;
}) {
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const hasData = data.some(d => d.value > 0);
  return (
    <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[420px] hover:border-[#38bdf8]/50 hover:shadow-2xl transition-all group duration-300 w-full">
      <div className="mb-4">
        <h4 className="text-sm sm:text-base font-bold text-[#dae2fd] group-hover:text-[#38bdf8] transition-colors">{title}</h4>
        {subtitle && <p className="text-[11px] sm:text-xs text-[#bdc8d1]/75 mt-0.5">{subtitle}</p>}
      </div>
      
      {/* Scrollable on mobile if many items */}
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#3e484f]/40">
        <div className={`relative h-64 flex items-end justify-around border-b border-[#3e484f]/30 pb-2 select-none ${data.length > 5 ? 'min-w-[600px]' : 'w-full'} px-4`}>
          {!hasData && !hideEmptyOverlay && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <span className="text-[11px] text-[#bdc8d1]/50 bg-[#0b1326]/85 border border-[#3e484f]/30 rounded-lg px-3 py-2 font-sans">Nenhum dado no filtro atual</span>
            </div>
          )}
          {/* Background Grid Accent Lines */}
          <div className="absolute inset-x-0 top-0 bottom-4 flex flex-col justify-between pointer-events-none opacity-10">
            <div className="border-b border-[#3e484f] w-full" />
            <div className="border-b border-[#3e484f] w-full" />
            <div className="border-b border-[#3e484f] w-full" />
            <div className="border-b border-[#3e484f] w-full" />
          </div>

          {data.map((item, index) => {
            const percentage = maxVal > 0 ? (item.value / maxVal) * 82 + 8 : 8;
            const male = item.maleCount ?? 0;
            const female = item.femaleCount ?? 0;
            const isHovered = hover?.index === index;
            return (
              <div 
                key={index} 
                className="flex flex-col items-center flex-1 min-w-0 h-full relative px-0.5 sm:px-1"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const barAreaH = rect.height - 76;
                  const barTopY = rect.bottom - 76 - barAreaH * (percentage / 100);
                  const x = Math.min(Math.max(rect.left + rect.width / 2, 130), window.innerWidth - 130);
                  setHover({ index, x, y: Math.max(barTopY - 8, 130) });
                }}
                onMouseLeave={() => setHover(null)}
              >
                {/* Tooltip on Hover - portal to body so overflow/scroll containers don't clip it */}
                {isHovered && hover && createPortal(
                  <div
                    className="fixed z-50 bg-[#080f1d] border border-[#38bdf8]/40 px-3 py-2 rounded-lg text-xs text-[#dae2fd] shadow-2xl pointer-events-none font-sans min-w-[150px]"
                    style={{ left: hover.x, top: hover.y, transform: 'translate(-50%, -100%)' }}
                  >
                    <div className="font-semibold text-[#8ed5ff] border-b border-[#3e484f]/40 pb-1.5 mb-1.5">{item.label}</div>
                    <div className="flex items-center justify-between gap-4 mt-1">
                      <span className="text-[#bdc8d1]">Total:</span>
                      <span className="font-bold text-white">{item.value} {item.value === 1 ? 'aluno' : 'alunos'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 mt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                        <span className="text-[#bdc8d1]">Masculino:</span>
                      </div>
                      <span className="font-bold text-[#38bdf8]">{male}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 mt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#f472b6]" />
                        <span className="text-[#bdc8d1]">Feminino:</span>
                      </div>
                      <span className="font-bold text-[#f472b6]">{female}</span>
                    </div>
                  </div>,
                  document.body
                )}
                
                {/* Bar Area */}
                <div className="flex-1 w-full flex items-end justify-center">
                  <div 
                    className={`w-full max-w-[12px] sm:max-w-[20px] md:max-w-[26px] lg:max-w-[34px] mx-auto rounded-t-lg transition-all duration-300 ease-out relative overflow-hidden shadow-md ${isHovered ? 'scale-x-110 scale-y-105 brightness-125 shadow-[#38bdf8]/25' : ''}`}
                    style={{ 
                      height: `${percentage}%`,
                      background: `linear-gradient(180deg, ${item.startColor} 0%, ${item.endColor} 100%)`
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-white/10 opacity-30 rounded-t-sm" />
                  </div>
                </div>

                {/* Fixed-height Label Area */}
                <div className="w-full flex flex-col items-center justify-start pt-1 shrink-0" style={{ minHeight: '72px' }}>
                  <span className={`text-[9px] sm:text-xs font-bold transition-colors select-none leading-none ${isHovered ? 'text-[#38bdf8]' : 'text-[#dae2fd]'}`}>{item.value}</span>
                  <span className="text-[7px] sm:text-[9px] md:text-xs text-[#bdc8d1]/80 text-center font-bold tracking-tight mt-1 max-w-full break-words whitespace-normal leading-tight px-0.5 select-none" title={item.label}>
                    {item.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
