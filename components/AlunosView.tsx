'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '../i18n/navigation';
import { nextStudentId, uuid } from '../lib/idGenerator';
import { 
  UserPlus, 
  Search, 
  Trash2, 
  Edit3, 
  X,
  Lock,
  FileSpreadsheet,
  FileText,
  Camera,
  Loader2,
  User,
  Shield
} from 'lucide-react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { type Student, type ContratoItem, type EstHierarchical, type RegHierarchical, type LocHierarchical } from '../types/edukyne';
import { type Permission } from '../lib/rbac';
import { uploadAvatar, deleteAvatarByUrl, getAvatarPath } from '../lib/storage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addReportBackground } from '../lib/pdfUtils';
import * as XLSX from 'xlsx';
import { logExport, registerConsent } from '../lib/auditLog';

interface AlunosViewUser {
  id?: string;
  role?: string;
  contrato?: string;
  estado?: string;
  regiao?: string;
  locality?: string;
  grade?: string;
}

interface AlunosViewProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  runWithPermission: (permission: Permission, onApproved: () => void | Promise<void>) => Promise<void>;
  contratos?: ContratoItem[];
  user?: AlunosViewUser;
}

export default function AlunosView({ students, setStudents, isAddModalOpen, setIsAddModalOpen, runWithPermission, contratos, user }: AlunosViewProps) {
  const t = useTranslations('alunos');
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativos' | 'Inativos'>('Todos');
  const [localSearch, setLocalSearch] = useState('');

  // Security Context checks: Lock filters if they have single value, restrict if multiple values
  const isHydrating = user?.id === 'loading';
  const isUserAdmin = user?.role === 'Administrador' || !user;

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

  // Format helpers
  const formatCPF = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
    if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  };

  // LGPD: Mascarar CPF para exibição (proteção de dados sensíveis)
  const maskCPF = (cpf?: string) => {
    if (!cpf) return '';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length < 11) return cpf;
    return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`;
  };

  const formatPhone = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 2) return clean.length > 0 ? `(${clean}` : '';
    if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '—';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Predefined classes options for ages 4 to 17 plus EJA
  const CLASSES_LIST = [
    'Pré-Escola / Jardim I: 4 anos',
    'Pré-Escola / Jardim II: 5 anos',
    '1º ano Ensino Fundamental - Anos Iniciais',
    '2º ano Ensino Fundamental - Anos Iniciais',
    '3º ano Ensino Fundamental - Anos Iniciais',
    '4º ano Ensino Fundamental - Anos Iniciais',
    '5º ano Ensino Fundamental - Anos Iniciais',
    '6º ano Ensino Fundamental - Anos Finais',
    '7º ano Ensino Fundamental - Anos Finais',
    '8º ano Ensino Fundamental - Anos Finais',
    '9º ano Ensino Fundamental - Anos Finais',
    '1º ano do Ensino Médio',
    '2º ano do Ensino Médio',
    '3º ano do Ensino Médio',
    'EJA (Educação de Jovens e Adultos)'
  ];

  // Predefined localidade list

  const getGradesForSelectedContract = (contractName: string, stateName: string, regionName: string, localityName: string) => {
    let list = CLASSES_LIST;
    const cObj = availableContracts.find(c => c.name === contractName || c.id === contractName);
    if (cObj) {
      if (cObj.structure && Array.isArray(cObj.structure.estados)) {
        const matchStates = cObj.structure.estados.filter((st: EstHierarchical) => !stateName || st.name === stateName);
        const matchRegs = matchStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => !regionName || r.name === regionName));
        const matchLocs = matchRegs.flatMap((r: RegHierarchical) => r.localidades.filter((l: LocHierarchical) => !localityName || l.name === localityName));
        
        const allGrades: string[] = [];
        matchLocs.forEach((l: LocHierarchical) => {
          if (l.grades && Array.isArray(l.grades)) {
            l.grades.forEach((g: string) => {
              if (!allGrades.includes(g)) allGrades.push(g);
            });
          }
        });
        if (allGrades.length > 0) list = allGrades;
      } else if (cObj.grade) {
        const parsedGrades = cObj.grade.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (parsedGrades.length > 0) list = parsedGrades;
      }
    }

    // Limit to professional's registered grades if not administrator
    if (!isUserAdmin && assignedGrades.length > 0) {
      list = list.filter(g => assignedGrades.includes(g.toLowerCase().trim()));
    }
    return list;
  };

  // New student form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGrade, setNewGrade] = useState('1º ano Ensino Fundamental - Anos Iniciais');
  const [newStatus, setNewStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [newCpf, setNewCpf] = useState('');
  const [newGender, setNewGender] = useState<'Masculino' | 'Feminino'>('Masculino');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newParentName, setNewParentName] = useState('');
  const [newLocality, setNewLocality] = useState('');
  const [newContrato, setNewContrato] = useState('');
  const [newEstado, setNewEstado] = useState('');
  const [newRegiao, setNewRegiao] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [pendingNewId, setPendingNewId] = useState('');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAvatarUploading(true);
    try {
      let id = pendingNewId;
      if (!id) {
        id = (await nextStudentId()) || '';
        if (!id) id = 'A_' + uuid().slice(0, 8);
        setPendingNewId(id);
      }
      const url = await uploadAvatar(file, 'aluno', id);
      if (url) {
        setNewAvatarUrl(url);
      } else {
        alert(t('erroUploadFoto'));
      }
    } catch (err) {
      console.error('Erro no upload do avatar do aluno:', err);
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'add' | 'edit'>('add');
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const openCameraModal = (target: 'add' | 'edit') => {
    setCameraTarget(target);
    setCameraModalOpen(true);
  };

  const startCameraPreview = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    } catch (err) {
      console.error('Erro ao abrir a câmera:', err);
      alert(t('erroCamera'));
      setCameraModalOpen(false);
    }
  };

  useEffect(() => {
    if (cameraModalOpen) {
      const startDelay = setTimeout(() => {
        startCameraPreview();
      }, 50);
      return () => {
        clearTimeout(startDelay);
        stopCameraStream();
      };
    }
  }, [cameraModalOpen]);

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setIsCapturingPhoto(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsCapturingPhoto(false);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
      );
      if (!blob) {
        alert(t('erroCaptura'));
        setIsCapturingPhoto(false);
        return;
      }
      const file = new File([blob], `camera-${uuid()}.jpg`, { type: 'image/jpeg' });
      let id = '';
      if (cameraTarget === 'edit') {
        id = studentToEdit?.id || '';
      } else {
        id = pendingNewId;
        if (!id) {
          id = (await nextStudentId()) || '';
          if (!id) id = 'A_' + uuid().slice(0, 8);
          setPendingNewId(id);
        }
      }
      const url = await uploadAvatar(file, 'aluno', id);
      if (url) {
        if (cameraTarget === 'edit') {
          setEditAvatarUrl(url);
        } else {
          setNewAvatarUrl(url);
        }
        stopCameraStream();
        setCameraModalOpen(false);
      } else {
        alert(t('erroUploadFoto'));
      }
    } catch (err) {
      console.error('Erro ao capturar foto:', err);
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  // Explicitly reset registration textual fields to empty string whenever the add modal opens
  useEffect(() => {
    if (isAddModalOpen) {
      setNewName('');
      setNewEmail('');
      setNewCpf('');
      setNewBirthDate('');
      setNewPhone('');
      setNewParentName('');
      setNewPassword('');
      setNewAvatarUrl('');
      setPendingNewId('');
      setIsAvatarUploading(false);
    }
  }, [isAddModalOpen]);

  // Prefill Nova Matrícula form when opened or when dependencies resolve
  useEffect(() => {
    if (isAddModalOpen && !newContrato && availableContracts.length > 0) {
      let targetContract = availableContracts[0];
      if (isContractLocked) {
        const match = availableContracts.find(c => 
          assignedContracts.includes(c.name.toLowerCase()) || assignedContracts.includes(c.id.toLowerCase())
        );
        if (match) targetContract = match;
      }
      
      setNewContrato(targetContract.name);
      
      const states = targetContract.estado.split(',').map(s => s.trim());
      const regions = targetContract.regiao.split(',').map(r => r.trim());
      const localities = targetContract.localidade.split(',').map(l => l.trim());
      
      let finalState = states[0] || '';
      if (isStateLocked) {
        const matchState = states.find(st => assignedStates.includes(st.toLowerCase()));
        if (matchState) finalState = matchState;
      }
      
      let finalRegion = regions[0] || '';
      if (isRegionLocked) {
        const matchRegion = regions.find(reg => assignedRegions.includes(reg.toLowerCase()));
        if (matchRegion) finalRegion = matchRegion;
      }
      
      let finalLocality = localities[0] || '';
      if (isLocalityLocked) {
        const matchLocality = localities.find(loc => assignedLocalities.includes(loc.toLowerCase()));
        if (matchLocality) finalLocality = matchLocality;
      }
      
      setNewEstado(finalState);
      setNewRegiao(finalRegion);
      setNewLocality(finalLocality);
    }
  }, [isAddModalOpen, newContrato, availableContracts, isContractLocked, assignedContracts, isStateLocked, assignedStates, isRegionLocked, assignedRegions, isLocalityLocked, assignedLocalities]);

  // Edit student states
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editEnrollmentId, setEditEnrollmentId] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editStatus, setEditStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [editCpf, setEditCpf] = useState('');
  const [editGender, setEditGender] = useState<'Masculino' | 'Feminino'>('Masculino');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editParentName, setEditParentName] = useState('');
  const [editLocality, setEditLocality] = useState('');
  const [editContrato, setEditContrato] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [editRegiao, setEditRegiao] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [isEditAvatarUploading, setIsEditAvatarUploading] = useState(false);

  const handleEditAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsEditAvatarUploading(true);
    try {
      const url = await uploadAvatar(file, 'aluno', studentToEdit?.id || '');
      if (url) {
        setEditAvatarUrl(url);
      } else {
        alert(t('erroUploadFoto'));
      }
    } catch (err) {
      console.error('Erro no upload do avatar do aluno:', err);
    } finally {
      setIsEditAvatarUploading(false);
    }
  };

  const handleOpenEdit = (student: Student) => {
    runWithPermission('edit:alunos', () => {
      setStudentToEdit(student);
      setEditName(student.name);
      setEditEmail(student.email ?? '');
      setEditEnrollmentId(student.enrollmentId ?? '');
      setEditGrade(student.grade);
      setEditStatus((student.status ?? 'Ativo') as 'Ativo' | 'Inativo');
      setEditCpf(student.cpf || '');
      setEditGender((student.gender || 'Masculino') as 'Masculino' | 'Feminino');
      setEditBirthDate(student.birthDate || '');
      setEditPhone(student.phone || '');
      setEditParentName(student.parentName || '');
      setEditLocality(student.locality || '');
      setEditContrato(student.contrato || '');
      setEditEstado(student.estado || '');
      setEditRegiao(student.regiao || '');
      setEditPassword(student.password || '');
      setEditAvatarUrl(student.avatarUrl || '');
    });
  };

  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editEmail || !editEnrollmentId || !editCpf || !editBirthDate || !editPhone || !editParentName || !editContrato || !editEstado || !editRegiao || !editLocality || !editPassword) {
      alert(t('erroCamposObrigatorios'));
      return;
    }
    if (editCpf.length !== 14) {
      alert(t('erroCpf'));
      return;
    }
    if (editPhone.length !== 15) {
      alert(t('erroTelefone'));
      return;
    }

    runWithPermission('edit:alunos', async () => {
      const previousAvatar = studentToEdit?.avatarUrl || '';
      if (editAvatarUrl && previousAvatar && getAvatarPath(editAvatarUrl) !== getAvatarPath(previousAvatar)) {
        deleteAvatarByUrl(previousAvatar);
      }

      setStudents(prev => prev.map(s => {
        if (s.id === studentToEdit?.id) {
          return {
            ...s,
            name: editName,
            email: editEmail,
            enrollmentId: editEnrollmentId,
            grade: editGrade,
            status: editStatus,
            cpf: editCpf,
            gender: editGender,
            birthDate: editBirthDate,
            phone: editPhone,
            parentName: editParentName,
            locality: editLocality,
            contrato: editContrato,
            estado: editEstado,
            regiao: editRegiao,
            password: editPassword,
            avatarUrl: editAvatarUrl
          };
        }
        return s;
      }));

      setStudentToEdit(null);
    });
  };

  // Handle student generation
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newCpf || !newBirthDate || !newPhone || !newParentName || !newContrato || !newEstado || !newRegiao || !newLocality || !newPassword) {
      alert(t('erroCamposObrigatorios'));
      return;
    }
    if (newCpf.length !== 14) {
      alert(t('erroCpf'));
      return;
    }
    if (newPhone.length !== 15) {
      alert(t('erroTelefone'));
      return;
    }

    runWithPermission('create:alunos', async () => {
      const generatedId = pendingNewId || (await nextStudentId()) || ('A_' + uuid().slice(0, 8));

      const currentYear = new Date().getFullYear();
      const generatedEnrollmentId = `#${currentYear}-${generatedId}`;

      const newStudent: Student = {
        id: generatedId,
        name: newName,
        email: newEmail,
        enrollmentId: generatedEnrollmentId,
        grade: newGrade,
        status: newStatus,
        cpf: newCpf,
        gender: newGender,
        birthDate: newBirthDate,
        phone: newPhone,
        parentName: newParentName,
        locality: newLocality,
        contrato: newContrato,
        estado: newEstado,
        regiao: newRegiao,
        password: newPassword,
        avatarUrl: newAvatarUrl
      };

      setStudents(prev => [newStudent, ...prev]);
      setIsAddModalOpen(false);

      // LGPD: Registrar consentimento do responsável legal (register_consent não bloqueia o fluxo)
      if (newStudent.cpf || newStudent.email) {
        registerConsent(
          user?.id || 'unknown',
          'responsavel_legal',
          newStudent.cpf ? `${newStudent.cpf}` : (newStudent.email || 'unknown'),
          [
            'treatment:dados_pessoais',
            'treatment:dados_saude',
            'treatment:questionarios_relatorios',
          ]
        );
      }

      // Reset fields
      setNewName('');
      setNewEmail('');
      setNewGrade('1º ano Ensino Fundamental - Anos Iniciais');
      setNewStatus('Ativo');
      setNewCpf('');
      setNewGender('Masculino');
      setNewBirthDate('');
      setNewPhone('');
      setNewParentName('');
      setNewLocality('');
      setNewContrato('');
      setNewEstado('');
      setNewRegiao('');
      setNewPassword('');
      setNewAvatarUrl('');
      setPendingNewId('');
      setIsAvatarUploading(false);
    });
  };

  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Handle delete student after verification
  const handleConfirmDelete = () => {
    if (studentToDelete) {
      runWithPermission('delete:alunos', () => {
        deleteAvatarByUrl(studentToDelete.avatarUrl);
        setStudents(prev => prev.filter(s => s.id !== studentToDelete.id));
        setStudentToDelete(null);
      });
    }
  };

  const handleCloseAddModal = () => {
    if (newAvatarUrl) {
      deleteAvatarByUrl(newAvatarUrl);
    }
    setNewAvatarUrl('');
    setPendingNewId('');
    setIsAddModalOpen(false);
  };

  const handleCloseEditModal = () => {
    if (editAvatarUrl && getAvatarPath(editAvatarUrl) !== getAvatarPath(studentToEdit?.avatarUrl)) {
      deleteAvatarByUrl(editAvatarUrl);
    }
    setStudentToEdit(null);
  };

  // Handle status toggle easily
  const toggleStudentStatus = (id: string) => {
    runWithPermission('edit:alunos', () => {
      setStudents(prev => prev.map(s => {
        if (s.id === id) {
          return {
            ...s,
            status: s.status === 'Ativo' ? 'Inativo' : 'Ativo'
          };
        }
        return s;
      }));
    });
  };

  // Filter students based on status & local search query on Name/Email
  const filteredStudents = students.filter(student => {
    const matchesStatus = filterStatus === 'Todos' 
      ? true 
      : filterStatus === 'Ativos' 
        ? student.status === 'Ativo' 
          : student.status === 'Inativo';
        
    const matchesSearch = student.name.toLowerCase().includes(localSearch.toLowerCase()) || 
                          (student.email ?? '').toLowerCase().includes(localSearch.toLowerCase()) ||
                          (student.enrollmentId ?? '').toLowerCase().includes(localSearch.toLowerCase()) ||
                          student.grade.toLowerCase().includes(localSearch.toLowerCase());
                          
    let matchesLocality = true;
    if (contract && contract !== 'Todos') {
      const targetContractObj = availableContracts.find(c => c.id === contract);
      if (targetContractObj && student.contrato && student.contrato !== targetContractObj.name) {
        matchesLocality = false;
      }
    }
    if (stateFilter && stateFilter !== 'Todos') {
      if (student.estado && student.estado !== stateFilter) {
        matchesLocality = false;
      }
    }
    if (cityFilter && cityFilter !== 'Todos' && cityFilter !== 'Todas') {
      if (student.regiao && student.regiao !== cityFilter) {
        matchesLocality = false;
      }
    }
    if (localityFilter && localityFilter !== 'Todos') {
      const sLoc = (student.locality || '').toLowerCase().trim();
      const mLoc = localityFilter.toLowerCase().trim();
      if (sLoc !== mLoc) {
        matchesLocality = false;
      }
    }

    if (!isUserAdmin) {
      if (assignedContracts.length > 0 && (!student.contrato || !assignedContracts.includes(student.contrato.toLowerCase()))) {
        matchesLocality = false;
      }
      if (assignedStates.length > 0 && (!student.estado || !assignedStates.includes(student.estado.toLowerCase()))) {
        matchesLocality = false;
      }
      if (assignedRegions.length > 0 && (!student.regiao || !assignedRegions.includes(student.regiao.toLowerCase()))) {
        matchesLocality = false;
      }
      if (assignedLocalities.length > 0 && (!student.locality || !assignedLocalities.includes(student.locality.toLowerCase()))) {
        matchesLocality = false;
      }
      if (assignedGrades.length > 0 && (!student.grade || !assignedGrades.includes(student.grade.toLowerCase()))) {
        matchesLocality = false;
      }
    }

    let matchesGrade = true;
    if (selectedGrade && selectedGrade !== 'Todos') {
      if (student.grade !== selectedGrade) {
        matchesGrade = false;
      }
    }

    return matchesStatus && matchesSearch && matchesLocality && matchesGrade;
  });

  const exportToExcel = () => {
    const data = filteredStudents.map(student => ({
      'Nome': student.name,
      'E-mail': student.email,
      'Matrícula': student.enrollmentId,
      'Turma': student.grade,
      'Localidade': student.locality || '',
      'Contrato': student.contrato || '',
      'Estado': student.estado || '',
      'Região': student.regiao || '',
      'CPF': maskCPF(student.cpf),
      'Telefone': student.phone || '',
      'Responsável': student.parentName || '',
      'Nascimento': student.birthDate || '',
      'Status': student.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos");
    XLSX.writeFile(workbook, "Alunos_Filtrados.xlsx");
    logExport(user?.id || 'unknown', user?.role || 'unknown', 'students', 'excel', filteredStudents.length);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    addReportBackground(doc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(11, 19, 38);
    doc.text("EDUKYNE - Relatório de Alunos", 14, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 21);
    doc.text(`Filtros Ativos - Status: ${filterStatus} | Contrato: ${contract} | Série: ${selectedGrade}`, 14, 26);
    
    const tableColumn = ["Nome", "Matrícula", "Turma", "Localidade", "Status"];
    const tableRows = filteredStudents.map(student => [
      student.name,
      student.enrollmentId ?? '',
      student.grade,
      student.locality || "",
      student.status ?? ''
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [56, 189, 248], textColor: [0, 30, 44], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addReportBackground(doc);
        }
      }
    });
    doc.save("Alunos_Filtrados.pdf");
    logExport(user?.id || 'unknown', user?.role || 'unknown', 'students', 'pdf', filteredStudents.length);
  };

  return (
    <div className="space-y-6 text-[#dae2fd]">
      {/* Table Title Block & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3e484f]/25 pb-4">
        <div>
          <h3 className="text-xl font-bold text-[#8ed5ff]">{t('baseDados')}</h3>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-[#38bdf8] text-[#001e2c] hover:bg-[#38bdf8]/90 font-bold text-xs rounded-lg flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-[#38bdf8]/10"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('matricularAluno')}</span>
        </button>
      </div>

      {/* FILTER PANEL - MATCHING DASHBOARD EXACTLY */}
      <section className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#3e484f]/25 pb-2">
          <h4 className="text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">
            {t('filtroTitulo')}
          </h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
          {/* Contrato */}
          <div className="flex flex-col gap-1.5 font-sans">
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold text-[#bdc8d1]/90">{t('contrato')}</label>
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
              className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="Todos">{t('todosContratos')}</option>
              {availableContracts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className="flex flex-col gap-1.5 font-sans">
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold text-[#bdc8d1]/90">{t('estado')}</label>
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
              className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="Todos">{t('todosEstados')}</option>
              {availableStates.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Região */}
          <div className="flex flex-col gap-1.5 font-sans">
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold text-[#bdc8d1]/90">{t('regiao')}</label>
            </div>
            <select 
              value={cityFilter}
              disabled={isHydrating || isRegionLocked}
              onChange={(e) => {
                setCityFilter(e.target.value || 'Todos');
                setLocalityFilter('Todos');
                setSelectedGrade('Todos');
              }}
              className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="Todos">{t('todasRegioes')}</option>
              {availableRegions.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>

          {/* Localidade */}
          <div className="flex flex-col gap-1.5 font-sans">
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold text-[#bdc8d1]/90">{t('localidade')}</label>
            </div>
            <select 
              value={localityFilter}
              disabled={isHydrating || isLocalityLocked}
              onChange={(e) => {
                setLocalityFilter(e.target.value || 'Todos');
                setSelectedGrade('Todos');
              }}
              className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all font-sans disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="Todos">{t('todasLocalidades')}</option>
              {availableLocalities.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Série/Turma */}
          <div className="flex flex-col gap-1.5 font-sans">
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold text-[#bdc8d1]/90">{t('serieTurma')}</label>
            </div>
            <select 
              value={selectedGrade}
              disabled={isHydrating || isGradeLocked}
              onChange={(e) => setSelectedGrade(e.target.value || 'Todos')}
              className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all font-sans disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="Todos">{t('todasTurmas')}</option>
              {availableGrades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Main Table Container Box */}
      <section className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl overflow-hidden shadow-2xl">
        {/* Controls Ribbon */}
        <div className="p-4 border-b border-[#3e484f]/40 flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Status Tabs Selector */}
          <div className="flex bg-[#0b1326] p-2 rounded-lg border border-[#3e484f]/40">
            {(['Todos', 'Ativos', 'Inativos'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filterStatus === tab 
                    ? 'bg-[#39485a] text-[#8ed5ff] shadow-sm' 
                    : 'text-[#bdc8d1] hover:text-[#dae2fd]'
                }`}
              >
                {tab === 'Todos' ? t('todos') : tab === 'Ativos' ? t('ativos') : t('inativos')}
              </button>
            ))}
          </div>

          {/* Quick Search and Table Actions */}
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#87929a]" />
              <input 
                type="text"
                placeholder={t('filtrarAluno')}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-lg pl-9 pr-4 py-1.5 text-xs text-[#dae2fd] placeholder-[#87929a] focus:ring-1 focus:ring-[#38bdf8] outline-none"
              />
            </div>
            
            <button 
              onClick={exportToExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95 border border-emerald-500/20 cursor-pointer"
              title={t('exportarExcel')}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{t('excel')}</span>
            </button>

            <button 
              onClick={exportToPDF}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95 border border-rose-500/20 cursor-pointer"
              title={t('exportarPdf')}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('pdf')}</span>
            </button>
          </div>
        </div>

        {/* Database Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                <th className="px-3 md:px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaAluno')}</th>
                <th className="px-3 md:px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('idMatricula')}</th>
                <th className="px-3 md:px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('turma')}</th>
                <th className="px-3 md:px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('status')}</th>
                <th className="px-3 md:px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-right">{t('acoes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3e484f]/30">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 md:px-6 py-12 text-center text-[#bdc8d1]/60 text-xs">
                    {t('nenhumAluno')}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-[#131b2e]/60 transition-colors group">
                    <td className="px-3 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        {student.avatarUrl ? (
                          <Image src={student.avatarUrl} alt={student.name} width={64} height={64} className="w-16 h-16 object-cover border border-[#3e484f]/60" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-16 h-16 bg-[#1e293b] border border-[#3e484f]/60 flex items-center justify-center text-[#8ed5ff] text-xs font-bold">
                            {student.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-xs text-[#dae2fd] group-hover:text-[#38bdf8] transition-colors">{student.name}</p>
                          <p className="text-[10px] text-[#bdc8d1]/70">{student.email}</p>
                          {(student.cpf || student.phone || student.parentName || student.locality || student.gender || student.birthDate || student.contrato || student.estado || student.regiao) && (
                            <p className="text-[9px] text-[#87929a] mt-1 space-x-1.5 font-sans leading-tight">
                              {student.cpf && <span>{t('cpf')} <strong className="text-[#9fcfff]">{maskCPF(student.cpf)}</strong></span>}
                              {student.gender && <span>{t('sexo')} <strong className="text-[#9fcfff]">{student.gender}</strong></span>}
                              {student.birthDate && <span>{t('nasc')} <strong className="text-[#9fcfff]">{formatDateBR(student.birthDate)}</strong></span>}
                              {student.phone && <span>{t('tel')} <strong className="text-[#9fcfff]">{student.phone}</strong></span>}
                              {student.parentName && <span>{t('responsavel')} <strong className="text-[#9fcfff]">{student.parentName}</strong></span>}
                              {student.locality && <span>{t('localidadeCurta')} <strong className="text-[#9fcfff]">{student.locality}</strong></span>}
                              {student.contrato && <span>{t('contratoCurta')} <strong className="text-[#38bdf8]">{student.contrato}</strong></span>}
                              {student.estado && <span>{t('estadoCurta')} <strong className="text-[#38bdf8]">{student.estado}</strong></span>}
                              {student.regiao && <span>{t('regiaoCurta')} <strong className="text-[#38bdf8]">{student.regiao}</strong></span>}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-xs font-mono text-[#bdc8d1]">{student.enrollmentId}</td>
                    <td className="px-3 md:px-6 py-4 text-xs font-medium text-[#dae2fd]">{student.grade}</td>
                    <td className="px-3 md:px-6 py-4 text-xs">
                      <button 
                        onClick={() => toggleStudentStatus(student.id)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-all ${
                          student.status === 'Ativo'
                            ? 'bg-[#8ed5ff]/10 text-[#38bdf8] border-[#38bdf8]/30 hover:bg-[#8ed5ff]/20'
                            : 'bg-[#93000a]/15 text-[#ffb4ab] border-[#93000a]/30 hover:bg-[#93000a]/30'
                        }`}
                        title={t('clicarAlternarStatus')}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'Ativo' ? 'bg-[#38bdf8]' : 'bg-[#ffb4ab]'}`}></span>
                        <span>{student.status === 'Ativo' ? t('ativo') : t('inativo')}</span>
                      </button>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-xs text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEdit(student)}
                          className="p-2 hover:bg-[#0b1326] text-[#bdc8d1] hover:text-[#8ed5ff] rounded transition-colors"
                          title={t('editarCadastro')}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setStudentToDelete(student)}
                          className="p-2 hover:bg-[#93000a]/25 text-[#bdc8d1] hover:text-[#ffb4ab] rounded transition-colors"
                          title={t('excluirMatricula')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginated Footer Row */}
        <div className="p-4 bg-[#0b1326] border-t border-[#3e484f]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-[#bdc8d1]/80">
            {t('mostrando', { inicio: filteredStudents.length, total: filteredStudents.length })}
          </p>
          <div className="flex bg-[#131b2e] border border-[#3e484f]/40 rounded-lg p-0.5">
            <button className="px-2 py-1 hover:bg-[#39485a] rounded text-xs text-[#bdc8d1] hover:text-[#dae2fd] transition-colors">{t('anterior')}</button>
            <span className="px-3 py-1 bg-[#39485a] text-[#8ed5ff] rounded text-xs font-bold font-mono">1</span>
            <button className="px-2 py-1 hover:bg-[#39485a] rounded text-xs text-[#bdc8d1] hover:text-[#dae2fd] transition-colors">{t('avancar')}</button>
          </div>
        </div>
      </section>

      {/* OVERLAY DIALOG MODAL (Clean, elegant, non-intrusive modal structure) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-md rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150">
            <button 
              onClick={handleCloseAddModal}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#8ed5ff] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              {t('novaMatricula')}
            </h4>

            <form onSubmit={handleAddStudent} className="space-y-3 max-h-[80dvh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('fotoPerfil')}</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#38bdf8]/40 bg-[#0b1326] flex items-center justify-center shrink-0">
                    {newAvatarUrl ? (
                      <Image src={newAvatarUrl} alt={t('fotoPerfilAlt')} width={56} height={56} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-6 h-6 text-[#87929a]" />
                    )}
                  </div>
                  <div className="flex flex-1 gap-2">
                    <label className="flex-1 text-[11px] bg-[#0b1326] border border-dashed border-[#3e484f]/60 hover:border-[#38bdf8]/60 text-[#8ed5ff] px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 font-semibold cursor-pointer">
                      {isAvatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      <span>{isAvatarUploading ? t('enviando') : (newAvatarUrl ? t('trocarFoto') : t('anexarFoto'))}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => openCameraModal('add')}
                      className="text-[11px] bg-[#0b1326] border border-dashed border-[#3e484f]/60 hover:border-[#38bdf8]/60 text-[#8ed5ff] px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 font-semibold"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{t('tirarFoto')}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('nomeCompleto')}</label>
                <input 
                  type="text"
                  required
                  placeholder={t('nomeExemplo')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('cpfObrigatorio')}</label>
                  <input 
                    type="text"
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={newCpf}
                    onChange={(e) => setNewCpf(formatCPF(e.target.value))}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('sexoObrigatorio')}</label>
                  <select 
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as 'Masculino' | 'Feminino')}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  >
                    <option value="Masculino">{t('masculino')}</option>
                    <option value="Feminino">{t('feminino')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('dataNascimento')}</label>
                  <input 
                    type="date"
                    required
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('telefone')}</label>
                  <input 
                    type="text"
                    required
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(formatPhone(e.target.value))}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('emailContato')}</label>
                <input 
                  type="email"
                  required
                  placeholder={t('emailExemplo')}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  autoComplete="new-email"
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('senhaAcesso')}</label>
                <input 
                  type="password"
                  required
                  placeholder={t('senhaMin')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('nomeResponsavel')}</label>
                <input 
                  type="text"
                  required
                  placeholder={t('responsavelExemplo')}
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all"
                />
              </div>

              {/* Contrato, Estado, Regiao, Localidade selectors */}
              <div className="space-y-3 p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg">
                <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">{t('vinculoEscolar')}</p>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs font-semibold text-[#bdc8d1] block">{t('contratoObrigatorio')}</label>
                    {isContractLocked && (
                      <span title={t('vinculoPermanente')}>
                        <Lock className="w-3 h-3 text-amber-400" />
                      </span>
                    )}
                  </div>
                  <select 
                    required
                    value={newContrato}
                    disabled={isContractLocked}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewContrato(val);
                      const selected = availableContracts.find(c => c.name === val || c.id === val);
                      if (selected) {
                        const states = selected.estado.split(',').map(s => s.trim());
                        const regions = selected.regiao.split(',').map(r => r.trim());
                        const localities = selected.localidade.split(',').map(l => l.trim());
                        setNewEstado(states[0] || '');
                        setNewRegiao(regions[0] || '');
                        setNewLocality(localities[0] || '');
                      } else {
                        setNewEstado('');
                        setNewRegiao('');
                        setNewLocality('');
                      }
                    }}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">{t('selecione')}</option>
                    {availableContracts.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-xs font-semibold text-[#bdc8d1] block">{t('estadoObrigatorio')}</label>
                      {isStateLocked && (
                        <span title={t('vinculoPermanente')}>
                          <Lock className="w-3 h-3 text-amber-400" />
                        </span>
                      )}
                    </div>
                    <select 
                      required
                      value={newEstado}
                      disabled={isStateLocked || !newContrato}
                      onChange={(e) => {
                        setNewEstado(e.target.value);
                        setNewRegiao('');
                        setNewLocality('');
                        setNewGrade('');
                      }}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecione')}</option>
                      {(() : string[] => {
                        if (!newContrato) return [];
                        const cObj = availableContracts.find(c => c.name === newContrato || c.id === newContrato);
                        if (!cObj) return [];
                        if (cObj.structure && Array.isArray(cObj.structure.estados)) {
                          return cObj.structure.estados.map((st: EstHierarchical) => st.name);
                        }
                        return cObj.estado.split(',').map((s: string) => s.trim());
                      })().map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-xs font-semibold text-[#bdc8d1] block">{t('regiaoObrigatorio')}</label>
                      {isRegionLocked && (
                        <span title={t('vinculoPermanente')}>
                          <Lock className="w-3 h-3 text-amber-400" />
                        </span>
                      )}
                    </div>
                    <select 
                      required
                      value={newRegiao}
                      disabled={isRegionLocked || !newContrato}
                      onChange={(e) => {
                        setNewRegiao(e.target.value);
                        setNewLocality('');
                        setNewGrade('');
                      }}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecione')}</option>
                      {(() : string[] => {
                        if (!newContrato) return [];
                        const cObj = availableContracts.find(c => c.name === newContrato || c.id === newContrato);
                        if (!cObj) return [];
                        if (cObj.structure && Array.isArray(cObj.structure.estados)) {
                          const matchingStates = cObj.structure.estados.filter((st: EstHierarchical) => !newEstado || st.name === newEstado);
                          return Array.from(new Set(matchingStates.flatMap((st: EstHierarchical) => st.regioes.map((r: RegHierarchical) => r.name))));
                        }
                        return cObj.regiao.split(',').map((r: string) => r.trim());
                      })().map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs font-semibold text-[#bdc8d1] block">{t('localidadeObrigatorio')}</label>
                    {isLocalityLocked && (
                      <span title={t('vinculoPermanente')}>
                        <Lock className="w-3 h-3 text-amber-400" />
                      </span>
                    )}
                  </div>
                  <select 
                    required
                    value={newLocality}
                    disabled={isLocalityLocked || !newContrato}
                    onChange={(e) => {
                      setNewLocality(e.target.value);
                      setNewGrade('');
                    }}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">{t('selecione')}</option>
                    {(() : string[] => {
                      if (!newContrato) return [];
                      const cObj = availableContracts.find(c => c.name === newContrato || c.id === newContrato);
                      if (!cObj) return [];
                      if (cObj.structure && Array.isArray(cObj.structure.estados)) {
                        const matchingStates = cObj.structure.estados.filter((st: EstHierarchical) => !newEstado || st.name === newEstado);
                        const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => !newRegiao || r.name === newRegiao));
                        return Array.from(new Set(matchingRegs.flatMap((r: RegHierarchical) => r.localidades.map((l: LocHierarchical) => l.name))));
                      }
                      return cObj.localidade.split(',').map((l: string) => l.trim());
                    })().map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('serieTurmaObrigatorio')}</label>
                  <select 
                    required
                    value={newGrade}
                    disabled={!newLocality}
                    onChange={(e) => setNewGrade(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">{t('selecioneTurma')}</option>
                    {getGradesForSelectedContract(newContrato, newEstado, newRegiao, newLocality).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('statusInicial')}</label>
                <select 
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'Ativo' | 'Inativo')}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                >
                  <option value="Ativo">{t('ativoNormal')}</option>
                  <option value="Inativo">{t('inativoAfastado')}</option>
                </select>
              </div>

              {/* LGPD: Consentimento obrigatório para tratamento de dados */}
              <div className="bg-[#131b2e] border border-[#8ed5ff]/20 rounded-lg p-4 space-y-3">
                <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    {t('consentimentoLgpd')}
                  </span>
                  <Link
                    href="/politica-privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#38bdf8] hover:text-[#8ed5ff] underline underline-offset-2 transition-colors normal-case tracking-normal"
                  >
                    {t('lerPolitica')}
                  </Link>
                </p>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    required
                    className="mt-0.5 accent-[#38bdf8] shrink-0"
                  />
                  <span className="text-[11px] text-[#bdc8d1] leading-relaxed">
                    <strong className="text-[#dae2fd]">{t('cadastralTitle')}</strong> {t('cadastralText')}
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    required
                    className="mt-0.5 accent-[#38bdf8] shrink-0"
                  />
                  <span className="text-[11px] text-[#bdc8d1] leading-relaxed">
                    <strong className="text-[#dae2fd]">{t('saudeTitle')}</strong> {t('saudeText')}
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    required
                    className="mt-0.5 accent-[#38bdf8] shrink-0"
                  />
                  <span className="text-[11px] text-[#bdc8d1] leading-relaxed">
                    <strong className="text-[#dae2fd]">{t('questionariosTitle')}</strong> {t('questionariosText')}
                  </span>
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#3e484f]/25">
                <button 
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  {t('cancelar')}
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg text-xs shadow-md shadow-[#38bdf8]/10"
                >
                  {t('confirmarCadastro')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT OVERLAY DIALOG MODAL */}
      {studentToEdit && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-md rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150">
            <button 
              onClick={handleCloseEditModal}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              {t('editarCadastroAluno')}
            </h4>

            <form onSubmit={handleSaveEditStudent} className="space-y-3 max-h-[80dvh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('fotoPerfil')}</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#38bdf8]/40 bg-[#0b1326] flex items-center justify-center shrink-0">
                    {editAvatarUrl ? (
                      <Image src={editAvatarUrl} alt={t('fotoPerfilAlt')} width={56} height={56} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-6 h-6 text-[#87929a]" />
                    )}
                  </div>
                  <div className="flex flex-1 gap-2">
                    <label className="flex-1 text-[11px] bg-[#0b1326] border border-dashed border-[#3e484f]/60 hover:border-[#38bdf8]/60 text-[#8ed5ff] px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 font-semibold cursor-pointer">
                      {isEditAvatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      <span>{isEditAvatarUploading ? t('enviando') : (editAvatarUrl ? t('trocarFoto') : t('anexarFoto'))}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleEditAvatarUpload}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => openCameraModal('edit')}
                      className="text-[11px] bg-[#0b1326] border border-dashed border-[#3e484f]/60 hover:border-[#38bdf8]/60 text-[#8ed5ff] px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 font-semibold"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{t('tirarFoto')}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('nomeCompleto')}</label>
                <input 
                  type="text"
                  required
                  placeholder={t('nomeExemplo')}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('cpfObrigatorio')}</label>
                  <input 
                    type="text"
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={editCpf}
                    onChange={(e) => setEditCpf(formatCPF(e.target.value))}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('sexoObrigatorio')}</label>
                  <select 
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as 'Masculino' | 'Feminino')}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  >
                    <option value="Masculino">{t('masculino')}</option>
                    <option value="Feminino">{t('feminino')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('dataNascimento')}</label>
                  <input 
                    type="date"
                    required
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('telefone')}</label>
                  <input 
                    type="text"
                    required
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    value={editPhone}
                    onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('emailContato')}</label>
                <input 
                  type="email"
                  required
                  placeholder={t('emailExemplo')}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('senhaAcesso')}</label>
                <input 
                  type="password"
                  required
                  placeholder={t('senhaMin')}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('nomeResponsavel')}</label>
                <input 
                  type="text"
                  required
                  placeholder={t('responsavelExemplo')}
                  value={editParentName}
                  onChange={(e) => setEditParentName(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('idMatriculaObrigatorio')}</label>
                <input 
                  type="text"
                  required
                  placeholder={t('idMatriculaExemplo')}
                  value={editEnrollmentId}
                  onChange={(e) => setEditEnrollmentId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all font-mono"
                />
              </div>

              {/* Contrato, Estado, Regiao, Localidade selectors for EDIT */}
              <div className="space-y-3 p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg">
                <p className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-wider">{t('vinculoEscolar')}</p>
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('contratoObrigatorio')}</label>
                  <select 
                    required
                    value={editContrato}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditContrato(val);
                      const selected = availableContracts.find(c => c.name === val || c.id === val);
                      if (selected) {
                        const states = selected.estado.split(',').map(s => s.trim());
                        const regions = selected.regiao.split(',').map(r => r.trim());
                        const localities = selected.localidade.split(',').map(l => l.trim());
                        setEditEstado(states[0] || '');
                        setEditRegiao(regions[0] || '');
                        setEditLocality(localities[0] || '');
                      } else {
                        setEditEstado('');
                        setEditRegiao('');
                        setEditLocality('');
                      }
                    }}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  >
                    <option value="">{t('selecione')}</option>
                    {availableContracts.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('estadoObrigatorio')}</label>
                    <select 
                      required
                      value={editEstado}
                      onChange={(e) => {
                        setEditEstado(e.target.value);
                        setEditRegiao('');
                        setEditLocality('');
                        setEditGrade('');
                      }}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                    >
                      <option value="">{t('selecione')}</option>
                      {(() : string[] => {
                        if (!editContrato) return [];
                        const cObj = availableContracts.find(c => c.name === editContrato || c.id === editContrato);
                        if (!cObj) return [];
                        if (cObj.structure && Array.isArray(cObj.structure.estados)) {
                          return cObj.structure.estados.map((st: EstHierarchical) => st.name);
                        }
                        return cObj.estado.split(',').map((s: string) => s.trim());
                      })().map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('regiaoObrigatorio')}</label>
                    <select 
                      required
                      value={editRegiao}
                      onChange={(e) => {
                        setEditRegiao(e.target.value);
                        setEditLocality('');
                        setEditGrade('');
                      }}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                    >
                      <option value="">{t('selecione')}</option>
                      {(() : string[] => {
                        if (!editContrato) return [];
                        const cObj = availableContracts.find(c => c.name === editContrato || c.id === editContrato);
                        if (!cObj) return [];
                        if (cObj.structure && Array.isArray(cObj.structure.estados)) {
                          const matchingStates = cObj.structure.estados.filter((st: EstHierarchical) => !editEstado || st.name === editEstado);
                          return Array.from(new Set(matchingStates.flatMap((st: EstHierarchical) => st.regioes.map((r: RegHierarchical) => r.name))));
                        }
                        return cObj.regiao.split(',').map((r: string) => r.trim());
                      })().map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('localidadeObrigatorio')}</label>
                  <select 
                    required
                    value={editLocality}
                    onChange={(e) => {
                      setEditLocality(e.target.value);
                      setEditGrade('');
                    }}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  >
                    <option value="">{t('selecione')}</option>
                    {(() : string[] => {
                      if (!editContrato) return [];
                      const cObj = availableContracts.find(c => c.name === editContrato || c.id === editContrato);
                      if (!cObj) return [];
                      if (cObj.structure && Array.isArray(cObj.structure.estados)) {
                        const matchingStates = cObj.structure.estados.filter((st: EstHierarchical) => !editEstado || st.name === editEstado);
                        const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => !editRegiao || r.name === editRegiao));
                        return Array.from(new Set(matchingRegs.flatMap((r: RegHierarchical) => r.localidades.map((l: LocHierarchical) => l.name))));
                      }
                      return cObj.localidade.split(',').map((l: string) => l.trim());
                    })().map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('serieTurmaObrigatorio')}</label>
                  <select 
                    required
                    value={editGrade}
                    disabled={!editLocality}
                    onChange={(e) => setEditGrade(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">{t('selecioneTurma')}</option>
                    {getGradesForSelectedContract(editContrato, editEstado, editRegiao, editLocality).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('status')}</label>
                <select 
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'Ativo' | 'Inativo')}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                >
                  <option value="Ativo">{t('ativo')}</option>
                  <option value="Inativo">{t('inativo')}</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#3e484f]/25">
                <button 
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  {t('cancelar')}
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg text-xs shadow-md"
                >
                  {t('salvarAlteracoes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM DELETE DIALOG OVERLAY */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-[#060e20]/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#ffb4ab]/40 w-full max-w-sm rounded-xl shadow-2xl p-5 relative animate-in fade-in zoom-in duration-150">
            <h4 className="text-sm font-bold text-[#ffb4ab] uppercase tracking-wider mb-2">
              {t('confirmarExclusao')}
            </h4>
            <p className="text-xs text-[#bdc8d1] mb-5 leading-relaxed">
              {t('confirmarRemocao', { nome: studentToDelete.name, id: studentToDelete.enrollmentId ?? '' })}
            </p>
            <div className="flex gap-2 justify-end">
              <button 
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
              >
                {t('cancelar')}
              </button>
              <button 
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-[#93000a] hover:bg-[#b31412] text-[#ffb4ab] font-bold rounded-lg text-xs shadow-md"
              >
                {t('confirmarExcluir')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA CAPTURE MODAL */}
      {cameraModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-[#060e20]/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-sm rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150">
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                setCameraModalOpen(false);
              }}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="text-sm font-bold text-[#8ed5ff] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              {t('tirarFoto')}
            </h4>
            <div className="relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden border border-[#3e484f]/60">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isCapturingPhoto && (
                <div className="absolute inset-0 border-[3px] border-dashed border-[#38bdf8]/40 rounded-lg pointer-events-none" />
              )}
            </div>
            <button
              type="button"
              onClick={capturePhoto}
              disabled={isCapturingPhoto}
              className="mt-4 w-full px-4 py-3 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#060e20] font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isCapturingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {isCapturingPhoto ? t('capturando') : t('capturarFoto')}
            </button>
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
