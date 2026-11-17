'use client';

import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  Calendar, 
  Users, 
  AlertCircle, 
  Save, 
  MapPin, 
  Building, 
  CalendarDays, 
  ClipboardCheck, 
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Lock,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { type Student, type ContratoItem, type EstHierarchical, type RegHierarchical, type LocHierarchical } from '../types/edukyne';
import { normalizeRole, type Permission } from '../lib/rbac';
import { isSupabaseConfigured } from '../lib/supabase';
import { getDb } from '../lib/dbFacade';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addReportBackground } from '../lib/pdfUtils';
import * as XLSX from 'xlsx';

interface PresencaViewProps {
  students: Student[];
  runWithPermission: (permission: Permission, onApproved: () => void) => void;
  contratos?: ContratoItem[];
  user?: {
    id?: string;
    name?: string;
    role?: string;
    email?: string;
    contrato?: string;
    estado?: string;
    regiao?: string;
    locality?: string;
    grade?: string;
  };
}

export default function PresencaView({ students, runWithPermission, contratos, user }: PresencaViewProps) {
  // Security Context checks: Lock filters if they have single value, restrict if multiple values
  const isHydrating = user?.id === 'loading';
  const isUserAdmin = user?.role === 'Administrador' || !user;

  // Parsed list of restriction rules from registration data
  const assignedContracts = React.useMemo(() => {
    if (!user?.contrato) return [];
    return user.contrato.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const assignedStates = React.useMemo(() => {
    if (!user?.estado) return [];
    return user.estado.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const assignedRegions = React.useMemo(() => {
    if (!user?.regiao) return [];
    return user.regiao.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const assignedLocalities = React.useMemo(() => {
    if (!user?.locality) return [];
    return user.locality.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const assignedGrades = React.useMemo(() => {
    if (!user?.grade) return [];
    return user.grade.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const availableContracts = React.useMemo(() => {
    const list = contratos || [];
    if (isUserAdmin) return list;
    if (assignedContracts.length > 0) {
      return list.filter(c => assignedContracts.includes(c.name.toLowerCase()) || assignedContracts.includes(c.id.toLowerCase()));
    }
    return list;
  }, [contratos, isUserAdmin, assignedContracts]);

  // Special check for unrestricted roles regarding Grade/Class selection
  // Lock status
  const isContractLocked = !isUserAdmin && assignedContracts.length === 1;
  const isStateLocked = !isUserAdmin && assignedStates.length === 1;
  const isRegionLocked = !isUserAdmin && assignedRegions.length === 1;
  const isLocalityLocked = !isUserAdmin && assignedLocalities.length === 1;
  const isGradeLocked = !isUserAdmin && assignedGrades.length === 1;

  // Initialize state trackers with lock awareness dynamically from availableContracts to avoid compilation TDZ
  const [contract, setContract] = useState(() => {
    const matchedStudent = (user && normalizeRole(user.role ?? '') === 'Aluno') ? students.find(s => 
      s.email?.toLowerCase().trim() === user.email?.toLowerCase().trim() ||
      s.name?.toLowerCase().trim() === user.name?.toLowerCase().trim() ||
      s.id === user.id
    ) : null;
    if (matchedStudent) {
      const userContractObj = (contratos || []).find(c => 
        c.name.toLowerCase() === matchedStudent.contrato?.toLowerCase()
      );
      if (userContractObj) return userContractObj.id;
    }

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
    const matchedStudent = (user && normalizeRole(user.role ?? '') === 'Aluno') ? students.find(s => 
      s.email?.toLowerCase().trim() === user.email?.toLowerCase().trim() ||
      s.name?.toLowerCase().trim() === user.name?.toLowerCase().trim() ||
      s.id === user.id
    ) : null;
    if (matchedStudent) return matchedStudent.locality || 'Todos';

    if (isLocalityLocked) {
      const match = availableContracts
        .flatMap(c => c.localidade.split(',').map((s: string) => s.trim()))
        .find(loc => assignedLocalities.includes(loc.toLowerCase()));
      if (match) return match;
    }
    return 'Todos';
  });

  const [selectedGrade, setSelectedGrade] = useState(() => {
    const matchedStudent = (user && normalizeRole(user.role ?? '') === 'Aluno') ? students.find(s => 
      s.email?.toLowerCase().trim() === user.email?.toLowerCase().trim() ||
      s.name?.toLowerCase().trim() === user.name?.toLowerCase().trim() ||
      s.id === user.id
    ) : null;
    if (matchedStudent && matchedStudent.grade) return matchedStudent.grade;

    if (isGradeLocked) {
      const match = availableContracts
        .flatMap(c => c.grade ? c.grade.split(',').map((s: string) => s.trim()) : [])
        .find(g => assignedGrades.includes(g.toLowerCase()));
      if (match) return match;
    }
    return 'Todos';
  });

  // Now safely define cascading option arrays
  const availableStates = React.useMemo(() => {
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

  const availableRegions = React.useMemo(() => {
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

  const availableLocalities = React.useMemo(() => {
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

  const availableGrades = React.useMemo(() => {
    const filteredContratos = contract && contract !== 'Todos'
      ? availableContracts.filter(c => c.id === contract)
      : availableContracts;

    const fromContracts = Array.from(new Set(
      filteredContratos.flatMap(c => {
        if (c.structure && Array.isArray(c.structure.estados)) {
          const matchingStates = c.structure.estados.filter((st: EstHierarchical) => !stateFilter || stateFilter === 'Todos' || st.name.toLowerCase().trim() === stateFilter.toLowerCase().trim());
          const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => !cityFilter || cityFilter === 'Todos' || cityFilter === 'Todas' || r.name.toLowerCase().trim() === cityFilter.toLowerCase().trim()));
          const matchingLocs = matchingRegs.flatMap((r: RegHierarchical) => r.localidades.filter((l: LocHierarchical) => !localityFilter || localityFilter === 'Todos' || l.name.toLowerCase().trim() === localityFilter.toLowerCase().trim()));
          return matchingLocs.flatMap((l: LocHierarchical) => l.grades || []);
        }
        const matchE = !stateFilter || stateFilter === 'Todos' || c.estado.split(',').map((s: string) => s.trim().toLowerCase()).includes(stateFilter.toLowerCase().trim());
        const matchR = !cityFilter || cityFilter === 'Todos' || cityFilter === 'Todas' || c.regiao.split(',').map((s: string) => s.trim().toLowerCase()).includes(cityFilter.toLowerCase().trim());
        const matchL = !localityFilter || localityFilter === 'Todos' || c.localidade.split(',').map((s: string) => s.trim().toLowerCase()).includes(localityFilter.toLowerCase().trim());
        return (matchE && matchR && matchL) ? (c.grade ? c.grade.split(',').map((s: string) => s.trim()) : []) : [];
      })
    )).filter(Boolean);

    const fromStudents = students 
      ? Array.from(new Set(
          students
            .filter(s => {
              if (contract && contract !== 'Todos') {
                const cObj = availableContracts.find(c => c.id === contract);
                if (cObj && s.contrato && s.contrato.toLowerCase().trim() !== cObj.name.toLowerCase().trim()) return false;
              }
              if (stateFilter && stateFilter !== 'Todos' && (s.estado || '').toLowerCase().trim() !== stateFilter.toLowerCase().trim()) return false;
              if (cityFilter && cityFilter !== 'Todos' && cityFilter !== 'Todas' && (s.regiao || '').toLowerCase().trim() !== cityFilter.toLowerCase().trim()) return false;
              if (localityFilter && localityFilter !== 'Todos' && (s.locality || '').toLowerCase().trim() !== localityFilter.toLowerCase().trim()) return false;
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

  const [date, setDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [studentSearch, setStudentSearch] = useState('');

  // Save states
  const [attendance, setAttendance] = useState<{ [key: string]: boolean }>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Historical statistical presence state for each student in the selected month
  const [monthlyStats, setMonthlyStats] = useState<{ 
    [studentId: string]: { present: number; absent: number; rate: number } 
  }>({});

  const [recordedDates, setRecordedDates] = useState<string[]>([]);
  const [studentMonthDetails, setStudentMonthDetails] = useState<{ [studentId: string]: { [date: string]: boolean } }>({});

  // Match logged in Student object
  const loggedInStudentObj = React.useMemo(() => {
    if (!user || normalizeRole(user.role ?? '') !== 'Aluno') return null;
    return students.find(s => 
      s.email?.toLowerCase().trim() === user.email?.toLowerCase().trim() ||
      s.name?.toLowerCase().trim() === user.name?.toLowerCase().trim() ||
      s.id === user.id
    );
  }, [user, students]);

  const MONTH_NAMES = [
    { value: 'Todos', label: 'Todos os Meses' },
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];

  const handleContractChange = (val: string) => {
    setContract(val || 'Todos');
    setStateFilter('Todos');
    setCityFilter('Todos');
    setLocalityFilter('Todos');
    setSelectedGrade('Todos');
  };

  const handleStateChange = (val: string) => {
    setStateFilter(val || 'Todos');
    setCityFilter('Todos');
    setLocalityFilter('Todos');
    setSelectedGrade('Todos');
  };

  const handleRegionChange = (val: string) => {
    setCityFilter(val || 'Todos');
    setLocalityFilter('Todos');
    setSelectedGrade('Todos');
  };

  const handleLocalityChange = (val: string) => {
    setLocalityFilter(val || 'Todos');
    setSelectedGrade('Todos');
  };

  // Two-way synchronization between selected Month and Date input
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    if (newMonth === 'Todos') return;
    
    const parts = date.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const day = parts[2];
      const newDate = `${year}-${newMonth}-${day}`;
      setDate(newDate);
    }
  };

  const handleDateChange = (newDateVal: string) => {
    setDate(newDateVal);
    const parts = newDateVal.split('-');
    if (parts.length === 3 && parts[1] !== selectedMonth) {
      setSelectedMonth(parts[1]);
    }
  };

  // Available Grades filtered by active cascading constraints
  const availableGradesFiltered = availableGrades;

  // Sync selectedGrade automatically with available options
  useEffect(() => {
    if (selectedGrade !== 'Todos' && availableGradesFiltered.length > 0 && (!selectedGrade || !availableGradesFiltered.includes(selectedGrade))) {
      const timer = setTimeout(() => {
        setSelectedGrade(availableGradesFiltered[0]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [availableGradesFiltered, selectedGrade]);

  // Load attendance sheet from Supabase SQL & local storage
  useEffect(() => {
    const loadCurrentAttendance = async () => {
      if (!date) {
        setAttendance({});
        return;
      }
      
      const isAluno = user && normalizeRole(user.role ?? '') === 'Aluno';
      
      if (isAluno) {
        const studentAttendanceMap: { [key: string]: boolean } = {};
        
        try {
          Object.entries(localStorage).forEach(([k, val]) => {
            if (k.startsWith('educore_attendance_') && k.endsWith(`_${date}`)) {
              try {
                const parsed = JSON.parse(val || '{}');
                if (loggedInStudentObj && parsed[loggedInStudentObj.id] !== undefined) {
                  studentAttendanceMap[loggedInStudentObj.id] = parsed[loggedInStudentObj.id];
                }
              } catch (_e) {
                // ignore syntax error
              }
            }
          });
          setAttendance(studentAttendanceMap);
        } catch (e) {
          console.error('Error load from localStorage for Aluno:', e);
        }

        if (isSupabaseConfigured && loggedInStudentObj) {
          const supabase = getDb();
          if (supabase) {
            try {
              const { data, error } = await supabase
                .from('attendance_records')
                .select('student_id, present')
                .eq('student_id', loggedInStudentObj.id)
                .eq('date', date);

              if (!error && data && data.length > 0) {
                const cloudAttendance: { [key: string]: boolean } = { ...studentAttendanceMap };
                data.forEach((row: Record<string, unknown>) => {
                  cloudAttendance[row.student_id as string] = row.present as boolean;
                });
                setAttendance(cloudAttendance);
              }
            } catch (err) {
              console.error('Error reading attendance sheet from SQL for Aluno:', err);
            }
          }
        }
      } else {
        const key = `educore_attendance_${selectedGrade}_${localityFilter}_${date}`;
        
        // First restore from localStorage
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            setAttendance(JSON.parse(stored));
          } else {
            setAttendance({});
          }
        } catch (e) {
          console.error('Error load from localStorage:', e);
        }

        // Overwrite with Cloud SQL / Supabase data if live
        if (isSupabaseConfigured && selectedGrade && localityFilter) {
          const supabase = getDb();
          if (supabase) {
            try {
              const { data, error } = await supabase
                .from('attendance_records')
                .select('student_id, present')
                .eq('grade', selectedGrade)
                .eq('locality', localityFilter)
                .eq('date', date);

              if (!error && data && data.length > 0) {
                const cloudAttendance: { [key: string]: boolean } = {};
                data.forEach((row: Record<string, unknown>) => {
                  cloudAttendance[row.student_id as string] = row.present as boolean;
                });
                setAttendance(cloudAttendance);
                localStorage.setItem(key, JSON.stringify(cloudAttendance));
              }
            } catch (err) {
              console.error('Error reading attendance sheet from SQL:', err);
            }
          }
        }
      }
    };

    loadCurrentAttendance();
  }, [selectedGrade, localityFilter, date, user, loggedInStudentObj]);
  // Aggregate monthly attendance metrics for all students in the class
  useEffect(() => {
    const calculateMonthlyStats = async () => {
      const statsMap: { [studentId: string]: { present: number; absent: number; rate: number } } = {};
      const currentYear = (date && date.split('-')[0]) || new Date().getFullYear().toString();
      const monthPrefix = selectedMonth === 'Todos' ? `${currentYear}-` : `${currentYear}-${selectedMonth}-`;

      const datesSet = new Set<string>();
      const detailsMap: { [studentId: string]: { [date: string]: boolean } } = {};

      // Pre-initialize stats for active grade students based on Cascading filters
      const activeGradeStudents = students.filter(s => {
        if (user && normalizeRole(user.role ?? '') === 'Aluno') {
          return s.id === loggedInStudentObj?.id;
        }
        const matchesGrade = selectedGrade === 'Todos' || s.grade === selectedGrade;
        const matchesStatus = s.status === 'Ativo';
        
        let matchesCascades = true;
        if (!isUserAdmin) {
          if (assignedContracts.length > 0 && (!s.contrato || !assignedContracts.includes(s.contrato.toLowerCase()))) {
            matchesCascades = false;
          }
          if (assignedStates.length > 0 && (!s.estado || !assignedStates.includes(s.estado.toLowerCase()))) {
            matchesCascades = false;
          }
          if (assignedRegions.length > 0 && (!s.regiao || !assignedRegions.includes(s.regiao.toLowerCase()))) {
            matchesCascades = false;
          }
          if (assignedLocalities.length > 0 && (!s.locality || !assignedLocalities.includes(s.locality.toLowerCase()))) {
            matchesCascades = false;
          }
          if (assignedGrades.length > 0 && (!s.grade || !assignedGrades.includes(s.grade.toLowerCase()))) {
            matchesCascades = false;
          }
        }
        if (contract) {
          if (contract !== 'Todos') {
            const targetContractObj = availableContracts.find(c => c.id === contract);
            if (targetContractObj && s.contrato && s.contrato !== targetContractObj.name) {
              matchesCascades = false;
            }
          }
          if (stateFilter && stateFilter !== 'Todos') {
            if (s.estado && s.estado !== stateFilter) {
              matchesCascades = false;
            }
          }
          if (cityFilter && cityFilter !== 'Todos' && cityFilter !== 'Todas') {
            if (s.regiao && s.regiao !== cityFilter) {
              matchesCascades = false;
            }
          }
          if (localityFilter && localityFilter !== 'Todos') {
            const sLoc = (s.locality || 'Centro').toLowerCase().trim();
            const mLoc = localityFilter.toLowerCase().trim();
            if (sLoc !== mLoc) {
              matchesCascades = false;
            }
          }
        }
        return matchesGrade && matchesStatus && matchesCascades;
      });

      activeGradeStudents.forEach(s => {
        statsMap[s.id] = { present: 0, absent: 0, rate: 100 };
        detailsMap[s.id] = {};
      });

      // 1. Gather historical data from localStorage
      try {
        Object.entries(localStorage).forEach(([key, val]) => {
          const isMatch = key.startsWith('educore_attendance_');
          
          if (isMatch) {
            const parts = key.split('_');
            const dateStr = parts[parts.length - 1]; // format YYYY-MM-DD
            if (dateStr && dateStr.startsWith(monthPrefix)) {
            const isAluno = user && normalizeRole(user.role ?? '') === 'Aluno';
            let fitsFilters = true;
            if (!isAluno) {
              if (selectedGrade !== 'Todos' && !key.startsWith(`educore_attendance_${selectedGrade}_`)) {
                fitsFilters = false;
              }
              if (localityFilter !== 'Todos' && !key.includes(`_${localityFilter}_`)) {
                fitsFilters = false;
              }
            }

            if (fitsFilters) {
                datesSet.add(dateStr);
                const studentsAttendanceObj = JSON.parse(val || '{}');
                Object.entries(studentsAttendanceObj).forEach(([id, present]) => {
                  if (statsMap[id]) {
                    if (present) {
                      statsMap[id].present += 1;
                    } else {
                      statsMap[id].absent += 1;
                    }
                  }
                  if (detailsMap[id]) {
                    detailsMap[id][dateStr] = !!present;
                  }
                });
              }
            }
          }
        });
      } catch (err) {
        console.error('Error calculating local monthlyStats:', err);
      }

      // 2. Fetch and merge live SQL metrics from Supabase
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          try {
            const sqlLikePattern = `${monthPrefix}%`;
            const isAluno = user && normalizeRole(user.role ?? '') === 'Aluno';
            let query = supabase.from('attendance_records').select('date, student_id, present').like('date', sqlLikePattern);
            if (isAluno && loggedInStudentObj) {
              query = query.eq('student_id', loggedInStudentObj.id);
            } else {
              if (selectedGrade !== 'Todos') {
                query = query.eq('grade', selectedGrade);
              }
              if (localityFilter !== 'Todos') {
                query = query.eq('locality', localityFilter);
              }
            }
            const { data, error } = await query;

            if (!error && data) {
              const dbTracker: { [composedKey: string]: boolean } = {};
              data.forEach((row: Record<string, unknown>) => {
                const uniqueRecordComposite = `${row.date}_${row.student_id}`;
                dbTracker[uniqueRecordComposite] = row.present as boolean;
                datesSet.add(row.date as string);
                if (detailsMap[row.student_id as string]) {
                  detailsMap[row.student_id as string][row.date as string] = !!row.present;
                }
              });

              // Apply calculations
              const updatedStats: { [studentId: string]: { present: number; absent: number; rate: number } } = {};
              activeGradeStudents.forEach(s => {
                updatedStats[s.id] = { present: 0, absent: 0, rate: 100 };
              });

              Object.entries(dbTracker).forEach(([composite, isPresent]) => {
                const parts = composite.split('_');
                const studentId = parts[parts.length - 1];
                if (updatedStats[studentId]) {
                  if (isPresent) {
                    updatedStats[studentId].present += 1;
                  } else {
                    updatedStats[studentId].absent += 1;
                  }
                }
              });

              // Calculate final rates for each student
              Object.keys(updatedStats).forEach(sId => {
                const total = updatedStats[sId].present + updatedStats[sId].absent;
                updatedStats[sId].rate = total > 0 
                  ? Math.round((updatedStats[sId].present / total) * 100)
                  : 100;
              });

              setMonthlyStats(updatedStats);
              const sortedDates = Array.from(datesSet).sort();
              setRecordedDates(sortedDates);
              setStudentMonthDetails(detailsMap);
              return; // Return early since we successfully used SQL database
            }
          } catch (dbErr) {
            console.error('Failed to aggregate SQL monthly stats:', dbErr);
          }
        }
      }

      // For fallback/offline local stats calcs: calculate final presence percentage rate
      Object.keys(statsMap).forEach(sId => {
        const total = statsMap[sId].present + statsMap[sId].absent;
        statsMap[sId].rate = total > 0 
          ? Math.round((statsMap[sId].present / total) * 100) 
          : 100;
      });

      setMonthlyStats(statsMap);
      const sortedDates = Array.from(datesSet).sort();
      setRecordedDates(sortedDates);
      setStudentMonthDetails(detailsMap);
    };

    calculateMonthlyStats();
  }, [selectedGrade, localityFilter, selectedMonth, date, attendance, saveSuccess, students, contract, stateFilter, cityFilter, availableContracts, user, loggedInStudentObj, assignedContracts, assignedGrades, assignedLocalities, assignedRegions, assignedStates, isUserAdmin]);;

  // Filter students matching grade, cascading configs, and optional text search
  const gradeStudents = students.filter(s => {
    if (user && normalizeRole(user.role ?? '') === 'Aluno') {
      return s.id === loggedInStudentObj?.id;
    }
    const matchesGrade = selectedGrade === 'Todos' || s.grade === selectedGrade;
    const matchesStatus = s.status === 'Ativo';
    
    let matchesCascades = true;
    if (!isUserAdmin) {
      if (assignedContracts.length > 0 && (!s.contrato || !assignedContracts.includes(s.contrato.toLowerCase()))) {
        matchesCascades = false;
      }
      if (assignedStates.length > 0 && (!s.estado || !assignedStates.includes(s.estado.toLowerCase()))) {
        matchesCascades = false;
      }
      if (assignedRegions.length > 0 && (!s.regiao || !assignedRegions.includes(s.regiao.toLowerCase()))) {
        matchesCascades = false;
      }
      if (assignedLocalities.length > 0 && (!s.locality || !assignedLocalities.includes(s.locality.toLowerCase()))) {
        matchesCascades = false;
      }
      if (assignedGrades.length > 0 && (!s.grade || !assignedGrades.includes(s.grade.toLowerCase()))) {
        matchesCascades = false;
      }
    }
    if (contract) {
      if (contract !== 'Todos') {
        const targetContractObj = availableContracts.find(c => c.id === contract);
        if (targetContractObj && s.contrato && s.contrato !== targetContractObj.name) {
          matchesCascades = false;
        }
      }
      if (stateFilter && stateFilter !== 'Todos') {
        if (s.estado && s.estado !== stateFilter) {
          matchesCascades = false;
        }
      }
      if (cityFilter && cityFilter !== 'Todos' && cityFilter !== 'Todas') {
        if (s.regiao && s.regiao !== cityFilter) {
          matchesCascades = false;
        }
      }
      if (localityFilter && localityFilter !== 'Todos') {
        const sLoc = (s.locality || 'Centro').toLowerCase().trim();
        const mLoc = localityFilter.toLowerCase().trim();
        if (sLoc !== mLoc) {
          matchesCascades = false;
        }
      }
    }

    const matchesSearch = !studentSearch || 
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
      (s.email && s.email.toLowerCase().includes(studentSearch.toLowerCase())) ||
      (s.enrollmentId && s.enrollmentId.toLowerCase().includes(studentSearch.toLowerCase()));
    
    return matchesGrade && matchesStatus && matchesCascades && matchesSearch;
  });

  const toggleAttendance = (id: string, isPresent: boolean) => {
    runWithPermission('edit:presenca', () => {
      setAttendance(prev => ({
        ...prev,
        [id]: isPresent
      }));
    });
  };

  const selectAllPresent = () => {
    runWithPermission('edit:presenca', () => {
      const updated: { [key: string]: boolean } = {};
      gradeStudents.forEach(s => {
        updated[s.id] = true;
      });
      setAttendance(updated);
    });
  };

  const selectAllAbsent = () => {
    runWithPermission('edit:presenca', () => {
      const updated: { [key: string]: boolean } = {};
      gradeStudents.forEach(s => {
        updated[s.id] = false;
      });
      setAttendance(updated);
    });
  };

  const totalInClass = gradeStudents.length;
  const presentCount = gradeStudents.filter(s => attendance[s.id] !== false).length; // Default present is true
  const presenceRate = totalInClass > 0 ? Math.round((presentCount / totalInClass) * 100) : 100;

  // Average monthly attendance rate of all matching students
  const avgMonthlyRate = React.useMemo(() => {
    if (totalInClass === 0) return 100;
    const totalRate = gradeStudents.reduce((acc, s) => {
      const stats = monthlyStats[s.id] || { rate: 100 };
      return acc + stats.rate;
    }, 0);
    return Math.round(totalRate / totalInClass);
  }, [gradeStudents, monthlyStats, totalInClass]);

  // Dual save: save to local files and commit directly to Postgres table `attendance_records`
  const handleSaveAttendance = async () => {
    runWithPermission('edit:presenca', async () => {
      setIsSaving(true);
      const key = `educore_attendance_${selectedGrade}_${localityFilter}_${date}`;
      
      try {
        // 1. Commit to localStorage
        localStorage.setItem(key, JSON.stringify(attendance));

        // Track pattern metadata helper index
        const trackingPatternKey = `educore_pattern_track_${contract}_${stateFilter}_${cityFilter}_${localityFilter}_${selectedGrade}_${date}`;
        localStorage.setItem(trackingPatternKey, 'true');

        // 2. Synchronize directly into Relational database tables
        if (isSupabaseConfigured && selectedGrade && localityFilter && date) {
          const supabase = getDb();
          if (supabase) {
            const serializedRecords = gradeStudents.map(student => {
              const isPresentVal = attendance[student.id] !== false;
              const compositeId = `${selectedGrade}_${localityFilter}_${date}_${student.id}`
                .replace(/\s+/g, '_')
                .replace(/\//g, '-');
              
              return {
                id: compositeId,
                grade: selectedGrade,
                locality: localityFilter,
                date: date,
                student_id: student.id,
                present: isPresentVal
              };
            });

            if (serializedRecords.length > 0) {
              const { error } = await supabase
                .from('attendance_records')
                .upsert(serializedRecords);

              if (error) {
                console.error('PostgreSQL Sync Fail:', error);
                throw error;
              }
            }
          }
        }

        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
        }, 4000);
      } catch (err) {
        console.error('Critical save pipeline fault:', err);
      } finally {
        setIsSaving(false);
      }
    });
  };

  // Get active name of contract for pattern tracker
  const buildDateLists = (student: Student) => {
    const details = studentMonthDetails[student.id] || {};
    const presentDates: string[] = [];
    const absentDates: string[] = [];
    recordedDates.forEach((dStr) => {
      if (!(dStr in details)) return;
      const parts = dStr.split('-');
      const short = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dStr;
      if (details[dStr]) {
        presentDates.push(short);
      } else {
        absentDates.push(short);
      }
    });
    return {
      presents: presentDates.join(', '),
      absents: absentDates.join(', '),
    };
  };

  const exportToExcel = () => {
    const activeMonthName = MONTH_NAMES.find(m => m.value === selectedMonth)?.label || '';
    const data = gradeStudents.map(student => {
      const stats = monthlyStats[student.id] || { present: 0, absent: 0, rate: 100 };
      const { presents, absents } = buildDateLists(student);
      return {
        'Nome': student.name,
        'ID Matrícula': student.enrollmentId,
        'Turma': student.grade,
        'Localidade': student.locality || 'Centro',
        [`Presenças (${activeMonthName})`]: stats.present,
        [`Faltas (${activeMonthName})`]: stats.absent,
        [`Frequência (%) (${activeMonthName})`]: `${stats.rate}%`,
        [`Datas de Presença (${activeMonthName})`]: presents,
        [`Datas de Falta (${activeMonthName})`]: absents
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Presença");
    XLSX.writeFile(workbook, `Frequencia_${selectedGrade}_${date}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    addReportBackground(doc);
    const activeMonthName = MONTH_NAMES.find(m => m.value === selectedMonth)?.label || '';
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(11, 19, 38);
    doc.text("EDUKYNE - Relatório de Frequência", 14, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 21);
    doc.text(`Filtros Ativos - Data: ${date.split('-').reverse().join('/')} | Turma: ${selectedGrade} | Unidade: ${localityFilter}`, 14, 26);
    
    const tableColumn = ["Nome", "Turma", `Presenças (${activeMonthName})`, `Faltas (${activeMonthName})`, `Frequência (%)`, `Datas de Presença (${activeMonthName})`, `Datas de Falta (${activeMonthName})`];
    const tableRows = gradeStudents.map(student => {
      const stats = monthlyStats[student.id] || { present: 0, absent: 0, rate: 100 };
      const { presents, absents } = buildDateLists(student);
      return [
        student.name,
        student.grade,
        stats.present.toString(),
        stats.absent.toString(),
        `${stats.rate}%`,
        presents,
        absents
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: [56, 189, 248], textColor: [0, 30, 44], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addReportBackground(doc);
        }
      }
    });
    
    doc.save(`Relatorio_Frequencia_${selectedGrade}_${date}.pdf`);
  };

  return (
    <div className="space-y-6 text-[#dae2fd]" id="presenca-view-root">
      
      {(user && normalizeRole(user.role ?? '') === 'Aluno') ? (
        <section className="bg-[#171f33] border border-[#3e484f]/40 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 rounded-full">
              Seu Diário de Presença
            </span>
            <h3 className="text-sm md:text-base font-black text-white tracking-tight flex items-center gap-2 mt-1">
              <ClipboardCheck className="w-4 h-4 text-[#38bdf8]" />
              Suas Presenças e Faltas
            </h3>
            <p className="text-xs text-[#bdc8d1]/70 mt-1">
              Turma: <span className="font-bold text-[#8ed5ff]">{selectedGrade}</span> • Unidade: <span className="font-bold text-[#8ed5ff]">{localityFilter}</span>
            </p>
          </div>
          
          <div className="flex flex-col gap-1.5 min-w-[150px]">
            <label className="text-[10px] uppercase font-bold text-[#38bdf8] tracking-wider flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mês de Referência:</span>
            </label>
            <select 
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="bg-[#0b1326] border border-[#38bdf8]/50 rounded-lg px-2.5 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none hover:border-[#38bdf8]/80 transition-all font-bold text-[#38bdf8]"
            >
              {MONTH_NAMES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </section>
      ) : (
        /* 1. UNIFIED CASCADING FILTER PANEL */
        <section 
          id="panel-filtro-presenca"
          className="bg-[#171f33] border border-[#3e484f]/40 rounded-2xl p-6 shadow-xl space-y-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <LayersIcon className="w-48 h-48 text-[#38bdf8]" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3e484f]/25 pb-4">
            <div>
              <h3 className="text-sm md:text-base font-black text-white tracking-tight flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#38bdf8]" />
                Filtro Unificado - Presença por Localidade
              </h3>
            </div>
          </div>

          {/* 7 Cascading Filter Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 text-[#dae2fd]">
            
            {/* 1. Contrato */}
            <div className="flex flex-col gap-1.5" id="filtro-contrato">
              <label className="text-[10px] uppercase font-bold text-[#bdc8d1]/90 tracking-wider flex items-center gap-1">
                <span>1. Contrato:</span>
                {!isUserAdmin && assignedContracts.length === 1 && (
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                )}
              </label>
              <select 
                value={contract}
                disabled={isHydrating || isContractLocked}
                onChange={(e) => handleContractChange(e.target.value)}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Todos">Todos os Contratos</option>
                {availableContracts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* 2. Estado */}
            <div className="flex flex-col gap-1.5" id="filtro-estado">
              <label className="text-[10px] uppercase font-bold text-[#bdc8d1]/90 tracking-wider flex items-center gap-1">
                <span>2. Estado:</span>
                {!isUserAdmin && assignedStates.length === 1 && (
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                )}
              </label>
              <select 
                value={stateFilter}
                disabled={isHydrating || isStateLocked}
                onChange={(e) => handleStateChange(e.target.value)}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Todos">Todos os Estados</option>
                {availableStates.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* 3. Região */}
            <div className="flex flex-col gap-1.5" id="filtro-regiao">
              <label className="text-[10px] uppercase font-bold text-[#bdc8d1]/90 tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#38bdf8]" />
                <span>3. Região:</span>
                {!isUserAdmin && assignedRegions.length === 1 && (
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                )}
              </label>
              <select 
                value={cityFilter}
                disabled={isHydrating || isRegionLocked}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Todos">Todas as Regiões</option>
                {availableRegions.map(reg => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
            </div>

            {/* 4. Localidade */}
            <div className="flex flex-col gap-1.5" id="filtro-localidade">
              <label className="text-[10px] uppercase font-bold text-[#bdc8d1]/90 tracking-wider flex items-center gap-1">
                <Building className="w-3 h-3 text-[#38bdf8]" />
                <span>4. Localidade:</span>
                {!isUserAdmin && assignedLocalities.length === 1 && (
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                )}
              </label>
              <select 
                value={localityFilter}
                disabled={isHydrating || isLocalityLocked}
                onChange={(e) => handleLocalityChange(e.target.value)}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Todos">Todas as Localidades</option>
                {availableLocalities.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* 5. Mês */}
            <div className="flex flex-col gap-1.5" id="filtro-mes">
              <label className="text-[10px] uppercase font-bold text-[#38bdf8] tracking-wider flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-[#38bdf8] animate-pulse" />
                <span>5. Mês de Ref:</span>
              </label>
              <select 
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="bg-[#0b1326] border border-[#38bdf8]/50 rounded-lg px-2.5 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none hover:border-[#38bdf8]/80 transition-all font-bold text-[#38bdf8]"
              >
                {MONTH_NAMES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* 6. Série ou Turma */}
            <div className="flex flex-col gap-1.5" id="filtro-turma">
              <label className="text-[10px] uppercase font-bold text-[#bdc8d1]/95 tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3 text-[#38bdf8]" />
                <span>6. Turma:</span>
                {!isUserAdmin && assignedGrades.length === 1 && (
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                )}
              </label>
              <select
                value={selectedGrade}
                disabled={isHydrating || isGradeLocked}
                onChange={(e) => {
                  setSelectedGrade(e.target.value || 'Todos');
                  setAttendance({});
                }}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Todos">Todas as Turmas</option>
                {availableGradesFiltered.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* 7. Data da Aula */}
            <div className="flex flex-col gap-1.5" id="filtro-data">
              <label className="text-[10px] uppercase font-bold text-[#bdc8d1]/90 tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#38bdf8]" />
                <span>7. Data Aula:</span>
              </label>
              <input 
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2 py-1.5 text-xs text-[#dae2fd] outline-none focus:border-[#38bdf8] font-semibold w-full [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Dynamic statistics and visual indicators */}
          <div className="flex flex-col lg:flex-row items-center justify-between pt-4 border-t border-[#3e484f]/25 gap-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#bdc8d1]/80 italic">
              <Sparkles className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
              <span>Filtros encadeados em sequência. Selecione cada campo para refinar os alunos.</span>
            </div>
            
            <div className="flex items-center gap-4 bg-[#0b1326] border border-[#3e484f]/35 p-3 rounded-xl w-full lg:w-auto justify-between lg:justify-start">
              <div className="text-left">
                <p className="text-[9px] text-[#bdc8d1]/70 font-black tracking-widest uppercase">
                  {date ? "Estatística desta Aula" : `Freq. Média Mensal - ${MONTH_NAMES.find(m => m.value === selectedMonth)?.label}`}
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-lg font-black text-white">{date ? presenceRate : avgMonthlyRate}%</span>
                  <span className="text-[10px] text-[#38bdf8] font-semibold">
                    {date 
                      ? `(${presentCount} de ${totalInClass} presentes)` 
                      : `(${totalInClass} aluno${totalInClass !== 1 ? 's' : ''} monitorado${totalInClass !== 1 ? 's' : ''})`
                    }
                  </span>
                </div>
              </div>
              <div className="h-8 w-[1px] bg-[#3e484f]/30 mx-1"></div>
              
              <div className="flex gap-2">
                <button 
                  onClick={selectAllPresent}
                  disabled={!date || totalInClass === 0}
                  className="px-2.5 py-1.5 hover:bg-[#38bdf8]/10 border border-[#38bdf8]/35 hover:border-[#38bdf8] disabled:opacity-30 disabled:pointer-events-none text-[#38bdf8] text-[10px] font-bold rounded-lg transition-all"
                  title={!date ? "Selecione uma data para realizar chamada" : "Marcar todos como Presente"}
                >
                  Sim (Todos)
                </button>
                <button 
                  onClick={selectAllAbsent}
                  disabled={!date || totalInClass === 0}
                  className="px-2.5 py-1.5 hover:bg-[#ffb4ab]/10 border border-[#ffb4ab]/35 hover:border-[#ffb4ab] disabled:opacity-30 disabled:pointer-events-none text-[#ffb4ab] text-[10px] font-bold rounded-lg transition-all"
                  title={!date ? "Selecione uma data para realizar chamada" : "Marcar todos como Ausente"}
                >
                  Não (Todos)
                </button>
              </div>
            </div>
          </div>
        </section>
      )}



      {/* 3. STUDENT REGISTRATION SHEET LIST */}
      <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Table/List Subheader with search and filter logs info */}
        <div className="p-5 bg-[#0b1326] border-b border-[#3e484f]/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-extrabold text-white">Alunos Ativos Disponíveis ({totalInClass})</span>
            <p className="text-[10px] text-[#bdc8d1]/70 mt-0.5">Indicador mensal avalia faltas e presenças de {MONTH_NAMES.find(m => m.value === selectedMonth)?.label}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
            <button 
              onClick={exportToExcel}
              disabled={totalInClass === 0}
              className="w-full sm:w-auto px-3 py-1.5 bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-xs text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 border border-[#10b981]/20 cursor-pointer text-center"
              title="Exportar para Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            <button 
              onClick={exportToPDF}
              disabled={totalInClass === 0}
              className="w-full sm:w-auto px-3 py-1.5 bg-[#f43f5e] hover:bg-[#e11d48] disabled:opacity-50 disabled:cursor-not-allowed text-xs text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 border border-[#f43f5e]/20 cursor-pointer text-center"
              title="Exportar para PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            {(!user || normalizeRole(user.role ?? '') !== 'Aluno') && (
              <div className="relative w-full sm:w-64">
                <input 
                  type="text"
                  placeholder="Pesquisar por aluno ou CPF..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full bg-[#171f33] border border-[#3e484f]/50 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8] transition-all"
                />
                <Search className="w-3.5 h-3.5 text-[#bdc8d1]/60 absolute left-3 top-2.5" />
              </div>
            )}
          </div>
        </div>

        {(!user || normalizeRole(user.role ?? '') !== 'Aluno') && !date && totalInClass > 0 && (
          <div className="mx-5 mt-4 p-3.5 bg-[#d9af3f]/10 border border-[#d9af3f]/25 rounded-xl flex items-center gap-3 text-xs text-[#ebd074]">
            <Calendar className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              <strong>Visão Geral do Mês de Referência:</strong> Exibindo a frequência mensal consolidada. Caso queira realizar a chamada de um dia específico, selecione a data no campo <strong>7. Data Aula</strong> acima.
            </span>
          </div>
        )}

        {totalInClass === 0 ? (
          <div className="p-16 text-center text-[#bdc8d1]/60 text-xs flex flex-col items-center justify-center gap-3">
            <div className="p-4 bg-[#ffb4ab]/10 rounded-full border border-[#ffb4ab]/20 text-[#ffb4ab]">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="font-extrabold text-[#dae2fd] text-sm block">Nenhum Aluno Encontrado</span>
              <p className="text-xs max-w-sm mx-auto text-[#bdc8d1]/75">
                Nenhum aluno ativo encontrado para os filtros selecionados. Altere os filtros acima para refinar sua busca.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#3e484f]/25">
            {gradeStudents.map((student) => {
              const isPresentStatus = attendance[student.id] !== false; // Preset behavior
              const stats = monthlyStats[student.id] || { present: 0, absent: 0, rate: 100 };
              
              // Attendance color coding for month rate
              let progressColorClass = 'bg-[#38bdf8]';
              let badgeColorClass = 'text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/20';
              if (stats.rate < 75) {
                progressColorClass = 'bg-[#ffb4ab]';
                badgeColorClass = 'text-[#ffb4ab] bg-[#ffb4ab]/10 border-[#ffb4ab]/20';
              } else if (stats.rate < 90) {
                progressColorClass = 'bg-amber-400';
                badgeColorClass = 'text-amber-400 bg-amber-400/10 border-amber-400/20';
              } else {
                progressColorClass = 'bg-emerald-400';
                badgeColorClass = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
              }

              return (
                <div key={student.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-[#131b2e]/40 transition-all gap-4">
                  
                  {/* Left Side: Student avatar & metadata */}
                  <div className="flex items-center gap-3">
                    {(!user || normalizeRole(user.role ?? '') !== 'Aluno') && (
                      <div className="w-10 h-10 rounded-xl bg-[#1e293b] border border-[#3e484f]/30 flex items-center justify-center text-[#38bdf8] text-[13px] font-black font-mono">
                        {student.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-black text-white hover:text-[#38bdf8] transition-colors">{student.name}</p>
                        <span className="text-[8px] tracking-widest font-mono text-[#bdc8d1]/50 px-1 py-0.5 border border-[#3e484f]/20 rounded bg-[#0b1326]">
                          {student.enrollmentId || student.id}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#bdc8d1]/80 font-mono flex items-center gap-1.5">
                        <span>{student.email}</span>
                        {student.cpf && (
                          <>
                            <span className="text-[#3e484f]/50">•</span>
                            <span>CPF: {student.cpf}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Middle Section: MONTHLY ATTENDANCE stats (visual tracker required by user) */}
                  <div className="flex flex-col gap-1.5 md:w-64" id={`month-stats-${student.id}`}>
                    <div className="flex justify-between items-center text-[10px] font-bold text-[#bdc8d1]">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>Frequência no Mês ({MONTH_NAMES.find(m => m.value === selectedMonth)?.label})</span>
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-mono border rounded ${badgeColorClass}`}>
                        {stats.rate}%
                      </span>
                    </div>
                    
                    {/* Progress indicator bar */}
                    <div className="w-full bg-[#0b1326] h-1.5 rounded-full overflow-hidden border border-[#3e484f]/35">
                      <div 
                        className={`h-full ${progressColorClass} transition-all duration-500`}
                        style={{ width: `${stats.rate}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[9px] text-[#bdc8d1]/70 font-mono">
                      <span className="text-emerald-400 font-bold">{stats.present} presenças</span>
                      <span className="text-[#ffb4ab] font-bold">{stats.absent} faltas</span>
                    </div>

                    {/* Granular Monthly Grid of specific dates with presences and absences */}
                    {recordedDates.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-[#3e484f]/15">
                        {recordedDates.map(dStr => {
                          const isPr = studentMonthDetails[student.id]?.[dStr];
                          const parts = dStr.split('-');
                          const shortDStr = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dStr;
                          return (
                            <span 
                              key={dStr} 
                              className={`px-1.5 py-0.5 rounded text-[8px] font-black font-mono flex items-center gap-0.5 border ${
                                isPr 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}
                              title={`${shortDStr}: ${isPr ? 'Presente' : 'Falta'}`}
                            >
                              <span>{parts[2]}</span>
                              <span>{isPr ? '✓' : '✗'}</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[8px] text-[#bdc8d1]/40 italic mt-1 bg-[#0b1326]/50 px-1.5 py-0.5 rounded border border-[#3e484f]/10">
                        Nenhuma chamada realizada no mês
                      </div>
                    )}
                  </div>

                  {/* Right Side: Large registration icons or status display for student */}
                  {(!user || normalizeRole(user.role ?? '') !== 'Aluno') ? (
                    !date ? (
                      <div className="flex items-center gap-2 bg-[#d9af3f]/10 border border-[#d9af3f]/25 px-3 py-2 rounded-xl text-xs text-[#ebd074] font-bold">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Sem data definida para chamada</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        
                        {/* Register Present Button with state feedback */}
                        <button
                          onClick={() => toggleAttendance(student.id, true)}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                            isPresentStatus 
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/45 shadow-[0_0_12px_rgba(52,211,153,0.15)]' 
                              : 'bg-transparent text-[#bdc8d1]/65 hover:text-white hover:bg-[#11192d] border border-transparent'
                          }`}
                          title="Registrar Presença do Aluno"
                        >
                          <div className={`p-1 rounded-full ${isPresentStatus ? 'bg-emerald-400 text-[#001e2c]' : 'bg-[#1e293b]'}`}>
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span>Presente</span>
                        </button>

                        {/* Register Absent Button with state feedback */}
                        <button
                          onClick={() => toggleAttendance(student.id, false)}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                            !isPresentStatus 
                              ? 'bg-[#ffb4ab]/15 text-[#ffb4ab] border border-[#ffb4ab]/40 shadow-[0_0_12px_rgba(255,180,171,0.15)]' 
                              : 'bg-transparent text-[#bdc8d1]/65 hover:text-[#ffb4ab] hover:bg-[#11192d] border border-transparent'
                          }`}
                          title="Registrar Falta do Aluno"
                        >
                          <div className={`p-1 rounded-full ${!isPresentStatus ? 'bg-[#ffb4ab] text-[#001e2c]' : 'bg-[#1e293b]'}`}>
                            <X className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span>Ausente</span>
                        </button>

                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-xl text-xs text-emerald-400 font-bold font-mono">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Frequência Individual</span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

        {/* 4. ACTIONS FOOTER PANEL */}
        {(!user || normalizeRole(user.role ?? '') !== 'Aluno') && (
          <div className="p-5 bg-[#0b1326] border-t border-[#3e484f]/40 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              {saveSuccess ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-xl flex items-center gap-2 animate-fade-in">
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span className="text-xs text-emerald-400 font-bold">
                    Chamada gravada e sincronizada no banco SQL e localStorage!
                  </span>
                </div>
              ) : isSaving ? (
                <div className="flex items-center gap-2 text-xs text-[#bdc8d1]/80 bg-[#171f33] px-3 py-1.5 rounded-lg border border-[#3e484f]/20">
                  <RefreshCw className="w-3.5 h-3.5 text-[#38bdf8] animate-spin" />
                  <span className="font-bold">Sincronizando com Banco de Dados...</span>
                </div>
              ) : (
                <div className="text-[10px] text-[#bdc8d1]/80 font-mono">
                  Padrão de envio: Postgres Table public.attendance_records
                </div>
              )}
            </div>

            <button 
              onClick={handleSaveAttendance}
              disabled={totalInClass === 0 || isSaving}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-white hover:text-black font-extrabold text-xs tracking-wider uppercase rounded-xl flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-95 disabled:opacity-30 disabled:pointer-events-none disabled:transform-none cursor-pointer"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Gravar & Sincronizar Frequência</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple Layout icons
function LayersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12 3-10 5 10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  );
}
