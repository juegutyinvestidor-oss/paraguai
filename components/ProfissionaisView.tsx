'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Plus, Award, Mail, Trash2, Edit3, X, Lock, Camera, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { nextProfessionalId, uuid } from '../lib/idGenerator';
import { uploadAvatar, deleteAvatarByUrl, getAvatarPath } from '../lib/storage';
import { type Professional, type ContratoItem, type EstHierarchical, type RegHierarchical, type LocHierarchical } from '../types/edukyne';
import { type Permission } from '../lib/rbac';

interface EdukyneUser {
  id?: string;
  role?: string;
  contrato?: string;
  estado?: string;
  regiao?: string;
  locality?: string;
}

interface ProfissionaisViewProps {
  professionals: Professional[];
  setProfessionals: (newProfessionalsOrFn: Professional[] | ((prev: Professional[]) => Professional[])) => void;
  runWithPermission: (permission: Permission, onApproved: () => void) => void;
  contratos?: ContratoItem[];
  user?: EdukyneUser;
}

export default function ProfissionaisView({ professionals, setProfessionals, runWithPermission, contratos, user }: ProfissionaisViewProps) {
  const [search, setSearch] = useState('');

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

  // Initialize states dynamically with lock awareness from availableContracts to avoid compilation TDZ
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

  // Safely define cascading option arrays
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

  const ROLES_LIST = [
    'Administrador',
    'Gestor',
    'Professor',
    'Estagiário',
    'Assistente'
  ];

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
  
  // Custom rapid additions (Modal states)
  const [progName, setProgName] = useState('');
  const [progRole, setProgRole] = useState('Professor');
  const [progSpec, setProgSpec] = useState('');
  const [progCpf, setProgCpf] = useState('');
  const [progGender, setProgGender] = useState<'Masculino' | 'Feminino'>('Masculino');
  const [progBirthDate, setProgBirthDate] = useState('');
  const [progEmail, setProgEmail] = useState('');
  const [progPhone, setProgPhone] = useState('');
  const [progLocality, setProgLocality] = useState('Centro');
  const [progContrato, setProgContrato] = useState('');
  const [progEstado, setProgEstado] = useState('');
  const [progRegiao, setProgRegiao] = useState('');
  const [progGrade, setProgGrade] = useState('');
  const [progPassword, setProgPassword] = useState('');
  const [progAvatarUrl, setProgAvatarUrl] = useState('');
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [pendingNewId, setPendingNewId] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleProgAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAvatarUploading(true);
    try {
      let id = pendingNewId;
      if (!id) {
        id = (await nextProfessionalId(progRole)) || '';
        if (!id) id = 'P_' + uuid().slice(0, 8);
        setPendingNewId(id);
      }
      const url = await uploadAvatar(file, 'prof', id);
      if (url) {
        setProgAvatarUrl(url);
      } else {
        alert('Falha ao enviar a foto. Verifique a configuração do Storage no Supabase.');
      }
    } catch (err) {
      console.error('Erro no upload do avatar do profissional:', err);
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleEditAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsEditAvatarUploading(true);
    try {
      const url = await uploadAvatar(file, 'prof', profToEdit?.id || '');
      if (url) {
        setEditProfAvatarUrl(url);
      } else {
        alert('Falha ao enviar a foto. Verifique a configuração do Storage no Supabase.');
      }
    } catch (err) {
      console.error('Erro no upload do avatar do profissional:', err);
    } finally {
      setIsEditAvatarUploading(false);
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
      alert('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
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
        alert('Falha ao capturar a foto.');
        setIsCapturingPhoto(false);
        return;
      }
      const file = new File([blob], `camera-${uuid()}.jpg`, { type: 'image/jpeg' });
      let id = '';
      if (cameraTarget === 'edit') {
        id = profToEdit?.id || '';
      } else {
        id = pendingNewId;
        if (!id) {
          id = (await nextProfessionalId(progRole)) || '';
          if (!id) id = 'P_' + uuid().slice(0, 8);
          setPendingNewId(id);
        }
      }
      const url = await uploadAvatar(file, 'prof', id);
      if (url) {
        if (cameraTarget === 'edit') {
          setEditProfAvatarUrl(url);
        } else {
          setProgAvatarUrl(url);
        }
        stopCameraStream();
        setCameraModalOpen(false);
      } else {
        alert('Falha ao enviar a foto. Verifique a configuração do Storage no Supabase.');
      }
    } catch (err) {
      console.error('Erro ao capturar foto:', err);
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  const handleOpenAddForm = () => {
    setProgName('');
    setProgRole('Professor');
    setProgSpec('');
    setProgCpf('');
    setProgBirthDate('');
    setProgEmail('');
    setProgPhone('');
    setProgContrato('');
    setProgEstado('');
    setProgRegiao('');
    setProgGrade('');
    setProgPassword('');
    setProgAvatarUrl('');
    setPendingNewId('');
    setShowAddForm(true);
  };

  // Edit professional states
  const [profToEdit, setProfToEdit] = useState<Professional | null>(null);
  const [editProfName, setEditProfName] = useState('');
  const [editProfRole, setEditProfRole] = useState('');
  const [editProfSpecialty, setEditProfSpecialty] = useState('');
  const [editProfEmail, setEditProfEmail] = useState('');
  const [editProfStatus, setEditProfStatus] = useState<'Ativo' | 'Afastado'>('Ativo');
  const [editProfCpf, setEditProfCpf] = useState('');
  const [editProfGender, setEditProfGender] = useState<'Masculino' | 'Feminino'>('Masculino');
  const [editProfBirthDate, setEditProfBirthDate] = useState('');
  const [editProfPhone, setEditProfPhone] = useState('');
  const [editProfLocality, setEditProfLocality] = useState('Centro');
  const [editProfContrato, setEditProfContrato] = useState('');
  const [editProfEstado, setEditProfEstado] = useState('');
  const [editProfRegiao, setEditProfRegiao] = useState('');
  const [editProfGrade, setEditProfGrade] = useState('');
  const [editProfPassword, setEditProfPassword] = useState('');
  const [editProfAvatarUrl, setEditProfAvatarUrl] = useState('');
  const [isEditAvatarUploading, setIsEditAvatarUploading] = useState(false);

  // Delete professional state
  const [profToDelete, setProfToDelete] = useState<Professional | null>(null);

  const getGradesForSelectedContract = (contractName: string, stateName: string, regionName: string, localityName: string) => {
    const cObj = availableContracts.find(c => c.name === contractName || c.id === contractName);
    if (!cObj) return CLASSES_LIST;
    if (cObj.structure && Array.isArray(cObj.structure.estados)) {
      const selectedStatesList = stateName ? stateName.split(',').map(s => s.trim()).filter(Boolean) : [];
      const selectedRegionsList = regionName ? regionName.split(',').map(r => r.trim()).filter(Boolean) : [];
      const selectedLocalitiesList = localityName ? localityName.split(',').map(l => l.trim()).filter(Boolean) : [];

      const matchStates = cObj.structure.estados.filter((st: EstHierarchical) => 
        selectedStatesList.length === 0 || selectedStatesList.includes(st.name)
      );
      const matchRegs = matchStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => 
        selectedRegionsList.length === 0 || selectedRegionsList.includes(r.name)
      ));
      const matchLocs = matchRegs.flatMap((r: RegHierarchical) => r.localidades.filter((l: LocHierarchical) => 
        selectedLocalitiesList.length === 0 || selectedLocalitiesList.includes(l.name)
      ));
      
      const allGrades: string[] = [];
      matchLocs.forEach((l: LocHierarchical) => {
        if (l.grades && Array.isArray(l.grades)) {
          l.grades.forEach((g: string) => {
            if (!allGrades.includes(g)) allGrades.push(g);
          });
        }
      });
      if (allGrades.length > 0) return allGrades;
    }
    if (cObj.grade) {
      const parsedGrades = cObj.grade.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (parsedGrades.length > 0) return parsedGrades;
    }
    return CLASSES_LIST;
  };

  // Derived helpers for multi-select (Gestor role) in the Register (Add) form
  const selectedStates = useMemo(() => {
    return progEstado ? progEstado.split(',').map(s => s.trim()).filter(Boolean) : [];
  }, [progEstado]);

  const selectedRegions = useMemo(() => {
    return progRegiao ? progRegiao.split(',').map(r => r.trim()).filter(Boolean) : [];
  }, [progRegiao]);

  const selectedLocalities = useMemo(() => {
    return progLocality ? progLocality.split(',').map(l => l.trim()).filter(Boolean) : [];
  }, [progLocality]);

  const selectedContractObj = progContrato ? availableContracts.find(c => c.name === progContrato) : null;

  const contractStates = useMemo<string[]>(() => {
    if (!selectedContractObj) return [];
    if (selectedContractObj.structure && Array.isArray(selectedContractObj.structure.estados)) {
      return selectedContractObj.structure.estados.map((st: EstHierarchical) => st.name as string);
    }
    return selectedContractObj.estado.split(',').map((s: string) => s.trim()).filter(Boolean);
  }, [selectedContractObj]);

  const contractRegions = useMemo<string[]>(() => {
    if (!selectedContractObj) return [];
    if (selectedContractObj.structure && Array.isArray(selectedContractObj.structure.estados)) {
      const matchingStates = selectedContractObj.structure.estados.filter((st: EstHierarchical) => {
        return selectedStates.length === 0 || selectedStates.includes(st.name);
      });
      return Array.from(new Set(matchingStates.flatMap((st: EstHierarchical) => st.regioes.map((r: RegHierarchical) => r.name)))) as string[];
    }
    return selectedContractObj.regiao.split(',').map((r: string) => r.trim()).filter(Boolean);
  }, [selectedContractObj, selectedStates]);

  const contractLocalities = useMemo<string[]>(() => {
    if (!selectedContractObj) return [];
    if (selectedContractObj.structure && Array.isArray(selectedContractObj.structure.estados)) {
      const matchingStates = selectedContractObj.structure.estados.filter((st: EstHierarchical) => {
        return selectedStates.length === 0 || selectedStates.includes(st.name);
      });
      const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => {
        return selectedRegions.length === 0 || selectedRegions.includes(r.name);
      }));
      return Array.from(new Set(matchingRegs.flatMap((r: RegHierarchical) => r.localidades.map((l: LocHierarchical) => l.name)))) as string[];
    }
    return selectedContractObj.localidade.split(',').map((l: string) => l.trim()).filter(Boolean);
  }, [selectedContractObj, selectedStates, selectedRegions]);

  // Derived helpers for multi-select (Gestor role) in the Edit form
  const editSelectedStates = useMemo(() => {
    return editProfEstado ? editProfEstado.split(',').map(s => s.trim()).filter(Boolean) : [];
  }, [editProfEstado]);

  const editSelectedRegions = useMemo(() => {
    return editProfRegiao ? editProfRegiao.split(',').map(r => r.trim()).filter(Boolean) : [];
  }, [editProfRegiao]);

  const editSelectedLocalities = useMemo(() => {
    return editProfLocality ? editProfLocality.split(',').map(l => l.trim()).filter(Boolean) : [];
  }, [editProfLocality]);

  const selectedEditContractObj = editProfContrato ? availableContracts.find(c => c.name === editProfContrato) : null;

  const editContractStates = useMemo<string[]>(() => {
    if (!selectedEditContractObj) return [];
    if (selectedEditContractObj.structure && Array.isArray(selectedEditContractObj.structure.estados)) {
      return selectedEditContractObj.structure.estados.map((st: EstHierarchical) => st.name as string);
    }
    return selectedEditContractObj.estado.split(',').map((s: string) => s.trim()).filter(Boolean);
  }, [selectedEditContractObj]);

  const editContractRegions = useMemo<string[]>(() => {
    if (!selectedEditContractObj) return [];
    if (selectedEditContractObj.structure && Array.isArray(selectedEditContractObj.structure.estados)) {
      const matchingStates = selectedEditContractObj.structure.estados.filter((st: EstHierarchical) => {
        return editSelectedStates.length === 0 || editSelectedStates.includes(st.name);
      });
      return Array.from(new Set(matchingStates.flatMap((st: EstHierarchical) => st.regioes.map((r: RegHierarchical) => r.name)))) as string[];
    }
    return selectedEditContractObj.regiao.split(',').map((r: string) => r.trim()).filter(Boolean);
  }, [selectedEditContractObj, editSelectedStates]);

  const editContractLocalities = useMemo<string[]>(() => {
    if (!selectedEditContractObj) return [];
    if (selectedEditContractObj.structure && Array.isArray(selectedEditContractObj.structure.estados)) {
      const matchingStates = selectedEditContractObj.structure.estados.filter((st: EstHierarchical) => {
        return editSelectedStates.length === 0 || editSelectedStates.includes(st.name);
      });
      const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => {
        return editSelectedRegions.length === 0 || editSelectedRegions.includes(r.name);
      }));
      return Array.from(new Set(matchingRegs.flatMap((r: RegHierarchical) => r.localidades.map((l: LocHierarchical) => l.name)))) as string[];
    }
    return selectedEditContractObj.localidade.split(',').map((l: string) => l.trim()).filter(Boolean);
  }, [selectedEditContractObj, editSelectedStates, editSelectedRegions]);

  // Helper event-handlers for Register (Add) form for cascaded pruning of selections
  const handleStateChange = (state: string, isChecked: boolean) => {
    let nextStates: string[];
    if (isChecked) {
      nextStates = selectedStates.filter(s => s !== state);
    } else {
      if (selectedStates.length >= 2) return;
      nextStates = [...selectedStates, state];
    }
    setProgEstado(nextStates.join(', '));

    // Prune invalid regions/localities right away!
    if (selectedContractObj && selectedContractObj.structure && Array.isArray(selectedContractObj.structure.estados)) {
      const matchingStates = selectedContractObj.structure.estados.filter((st: EstHierarchical) => {
        return nextStates.length === 0 || nextStates.includes(st.name);
      });
      const allowedRegions = matchingStates.flatMap((st: EstHierarchical) => st.regioes.map((r: RegHierarchical) => r.name));
      const nextRegions = selectedRegions.filter(r => allowedRegions.includes(r));
      setProgRegiao(nextRegions.join(', '));

      const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => {
        return nextRegions.length === 0 || nextRegions.includes(r.name);
      }));
      const allowedLocalities = matchingRegs.flatMap((r: RegHierarchical) => r.localidades.map((l: LocHierarchical) => l.name));
      const nextLocalities = selectedLocalities.filter(l => allowedLocalities.includes(l));
      setProgLocality(nextLocalities.join(', '));
    }
  };

  const handleRegionChange = (reg: string, isChecked: boolean) => {
    let nextRegions: string[];
    if (isChecked) {
      nextRegions = selectedRegions.filter(r => r !== reg);
    } else {
      if (selectedRegions.length >= 10) return;
      nextRegions = [...selectedRegions, reg];
    }
    setProgRegiao(nextRegions.join(', '));

    // Prune invalid localities right away!
    if (selectedContractObj && selectedContractObj.structure && Array.isArray(selectedContractObj.structure.estados)) {
      const matchingStates = selectedContractObj.structure.estados.filter((st: EstHierarchical) => {
        return selectedStates.length === 0 || selectedStates.includes(st.name);
      });
      const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => {
        return nextRegions.length === 0 || nextRegions.includes(r.name);
      }));
      const allowedLocalities = matchingRegs.flatMap((r: RegHierarchical) => r.localidades.map((l: LocHierarchical) => l.name));
      const nextLocalities = selectedLocalities.filter(l => allowedLocalities.includes(l));
      setProgLocality(nextLocalities.join(', '));
    }
  };

  // Helper event-handlers for Edit form for cascaded pruning of selections
  const handleEditStateChange = (state: string, isChecked: boolean) => {
    let nextStates: string[];
    if (isChecked) {
      nextStates = editSelectedStates.filter(s => s !== state);
    } else {
      if (editSelectedStates.length >= 2) return;
      nextStates = [...editSelectedStates, state];
    }
    setEditProfEstado(nextStates.join(', '));

    // Prune invalid regions/localities right away!
    if (selectedEditContractObj && selectedEditContractObj.structure && Array.isArray(selectedEditContractObj.structure.estados)) {
      const matchingStates = selectedEditContractObj.structure.estados.filter((st: EstHierarchical) => {
        return nextStates.length === 0 || nextStates.includes(st.name);
      });
      const allowedRegions = matchingStates.flatMap((st: EstHierarchical) => st.regioes.map((r: RegHierarchical) => r.name));
      const nextRegions = editSelectedRegions.filter(r => allowedRegions.includes(r));
      setEditProfRegiao(nextRegions.join(', '));

      const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => {
        return nextRegions.length === 0 || nextRegions.includes(r.name);
      }));
      const allowedLocalities = matchingRegs.flatMap((r: RegHierarchical) => r.localidades.map((l: LocHierarchical) => l.name));
      const nextLocalities = editSelectedLocalities.filter(l => allowedLocalities.includes(l));
      setEditProfLocality(nextLocalities.join(', '));
    }
  };

  const handleEditRegionChange = (reg: string, isChecked: boolean) => {
    let nextRegions: string[];
    if (isChecked) {
      nextRegions = editSelectedRegions.filter(r => r !== reg);
    } else {
      if (editSelectedRegions.length >= 10) return;
      nextRegions = [...editSelectedRegions, reg];
    }
    setEditProfRegiao(nextRegions.join(', '));

    // Prune invalid localities right away!
    if (selectedEditContractObj && selectedEditContractObj.structure && Array.isArray(selectedEditContractObj.structure.estados)) {
      const matchingStates = selectedEditContractObj.structure.estados.filter((st: EstHierarchical) => {
        return editSelectedStates.length === 0 || editSelectedStates.includes(st.name);
      });
      const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => {
        return nextRegions.length === 0 || nextRegions.includes(r.name);
      }));
      const allowedLocalities = matchingRegs.flatMap((r: RegHierarchical) => r.localidades.map((l: LocHierarchical) => l.name));
      const nextLocalities = editSelectedLocalities.filter(l => allowedLocalities.includes(l));
      setEditProfLocality(nextLocalities.join(', '));
    }
  };

  const handleOpenEditProf = (prog: Professional) => {
    runWithPermission('edit:profissionais', () => {
      setProfToEdit(prog);
      setEditProfName(prog.name);
      setEditProfRole(prog.role ?? '');
      setEditProfSpecialty(prog.specialty ?? '');
      setEditProfEmail(prog.email ?? '');
      setEditProfStatus((prog.status ?? 'Ativo') as 'Ativo' | 'Afastado');
      setEditProfCpf(prog.cpf || '');
      setEditProfGender((prog.gender || 'Masculino') as 'Masculino' | 'Feminino');
      setEditProfBirthDate(prog.birthDate || '');
      setEditProfPhone(prog.phone || '');
      setEditProfLocality(prog.locality || 'Centro');
      setEditProfContrato(prog.contrato || '');
      setEditProfEstado(prog.estado || '');
      setEditProfRegiao(prog.regiao || '');
      setEditProfGrade(prog.grade || '');
      
      setEditProfPassword(prog.password || '');
      setEditProfAvatarUrl(prog.avatarUrl || '');
    });
  };

  const handleSaveEditProf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfName || !editProfEmail || !editProfCpf || !editProfBirthDate || !editProfPhone || !editProfSpecialty || !editProfContrato || !editProfEstado || !editProfRegiao || !editProfLocality || !editProfPassword) {
      alert('Por favor, preencha todos os campos obrigatórios (incluindo Contrato, Estado, Região, Localidade e Senha).');
      return;
    }
    if (editProfCpf.length !== 14) {
      alert('Por favor, digite o CPF completo no formato 000.000.000-00.');
      return;
    }
    if (editProfPhone.length !== 15) {
      alert('Por favor, digite o Telefone de Contato completo no formato (00) 00000-0000.');
      return;
    }

    runWithPermission('edit:profissionais', async () => {
      const previousAvatar = profToEdit?.avatarUrl || '';
      if (editProfAvatarUrl && previousAvatar && getAvatarPath(editProfAvatarUrl) !== getAvatarPath(previousAvatar)) {
        deleteAvatarByUrl(previousAvatar);
      }

      setProfessionals(prev => {
        const list = typeof prev === 'function' ? (prev as () => Professional[])() : prev;
        return list.map((p: Professional) => {
          if (p.id === profToEdit?.id) {
            return {
              ...p,
              name: editProfName,
              role: editProfRole,
              specialty: editProfSpecialty,
              email: editProfEmail,
              status: editProfStatus,
              cpf: editProfCpf,
              gender: editProfGender,
              birthDate: editProfBirthDate,
              phone: editProfPhone,
              locality: editProfLocality,
              contrato: editProfContrato,
              estado: editProfEstado,
              regiao: editProfRegiao,
              grade: editProfGrade,
              password: editProfPassword,
              avatarUrl: editProfAvatarUrl
            };
          }
          return p;
        });
      });

      setProfToEdit(null);
    });
  };

  const handleConfirmDeleteProf = () => {
    if (profToDelete) {
      runWithPermission('delete:profissionais', () => {
        deleteAvatarByUrl(profToDelete.avatarUrl);
        setProfessionals(prev => {
          const list = typeof prev === 'function' ? (prev as () => Professional[])() : prev;
          return list.filter((p: Professional) => p.id !== profToDelete.id);
        });
        setProfToDelete(null);
      });
    }
  };

  const handleCloseAddProf = () => {
    if (progAvatarUrl) {
      deleteAvatarByUrl(progAvatarUrl);
    }
    setProgAvatarUrl('');
    setPendingNewId('');
    setShowAddForm(false);
  };

  const handleCloseEditProf = () => {
    if (editProfAvatarUrl && getAvatarPath(editProfAvatarUrl) !== getAvatarPath(profToEdit?.avatarUrl)) {
      deleteAvatarByUrl(editProfAvatarUrl);
    }
    setProfToEdit(null);
  };

  const handleAddCreator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progName || !progEmail || !progCpf || !progBirthDate || !progPhone || !progSpec || !progContrato || !progEstado || !progRegiao || !progLocality || !progPassword) {
      alert('Por favor, preencha todos os campos obrigatórios (incluindo Contrato, Estado, Região, Localidade e Senha).');
      return;
    }
    if (progCpf.length !== 14) {
      alert('Por favor, digite o CPF completo no formato 000.000.000-00.');
      return;
    }
    if (progPhone.length !== 15) {
      alert('Por favor, digite o Telefone de Contato completo no formato (00) 00000-0000.');
      return;
    }

    runWithPermission('create:profissionais', async () => {
      const generatedId = pendingNewId || (await nextProfessionalId(progRole)) || (progRole.toUpperCase().substring(0, 2) + '_' + uuid().slice(0, 8));

      const newProg: Professional = {
        id: generatedId,
        name: progName,
        role: progRole,
        email: progEmail,
        specialty: progSpec,
        avatarUrl: progAvatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNcBozGMkV4oR9gYxr59y9wuSaCQ-CbzmkbUKkr5yFarRetJETssQsWpjIOe3B6IXFhMP2OaTolRUVhqeep94FOEN_F7X7bLlX-C4cs-rMFH_vyGF2jcHK_UBHBTTaBsmzvjb4BigYuMeqxuqDK9vQxT4Bh6kK5KtmhRZknT2Og0brl08TnmmQoU1nqYXBoIQuL0mhedcRjW3R_q69nG_ktuTkXlQZpkneUIifGYpUROGAePhHSvRtdOq8n9EorlzJOoFxm6ZKzRw',
        status: 'Ativo',
        cpf: progCpf,
        gender: progGender,
        birthDate: progBirthDate,
        phone: progPhone,
        locality: progLocality,
        contrato: progContrato,
        estado: progEstado,
        regiao: progRegiao,
        grade: progGrade,
        password: progPassword
      };

      setProfessionals(prev => {
        const list = typeof prev === 'function' ? (prev as () => Professional[])() : prev;
        return [...list, newProg];
      });

      // Reset
      setProgName('');
      setProgCpf('');
      setProgGender('Masculino');
      setProgBirthDate('');
      setProgEmail('');
      setProgPhone('');
      setProgRole('Professor');
      setProgSpec('');
      setProgLocality('Centro');
      setProgContrato('');
      setProgEstado('');
      setProgRegiao('');
      setProgGrade('');
      setProgPassword('');
      setProgAvatarUrl('');
      setPendingNewId('');
      setShowAddForm(false);
    });
  };

  const filteredProgs = professionals.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          (p.specialty ?? '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.role ?? '').toLowerCase().includes(search.toLowerCase());

    let matchesLocality = true;
    if (contract && contract !== 'Todos') {
      const targetContractObj = availableContracts.find(c => c.id === contract);
      if (targetContractObj && p.contrato && p.contrato !== targetContractObj.name) {
        matchesLocality = false;
      }
    }
    if (stateFilter && stateFilter !== 'Todos') {
      if (p.estado) {
        const pStates = p.estado.split(',').map(s => s.trim().toLowerCase());
        if (!pStates.includes(stateFilter.toLowerCase())) {
          matchesLocality = false;
        }
      } else {
        matchesLocality = false;
      }
    }
    if (cityFilter && cityFilter !== 'Todos' && cityFilter !== 'Todas') {
      if (p.regiao) {
        const pRegions = p.regiao.split(',').map(r => r.trim().toLowerCase());
        if (!pRegions.includes(cityFilter.toLowerCase())) {
          matchesLocality = false;
        }
      } else {
        matchesLocality = false;
      }
    }
    if (localityFilter && localityFilter !== 'Todos') {
      if (p.locality) {
        const pLocs = p.locality.split(',').map(l => l.trim().toLowerCase());
        if (!pLocs.includes(localityFilter.toLowerCase())) {
          matchesLocality = false;
        }
      } else {
        matchesLocality = false;
      }
    }

    return matchesSearch && matchesLocality;
  });

  return (
    <div className="space-y-6 text-[#dae2fd]">
      {/* Table Title Block & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3e484f]/25 pb-4">
        <div>
          <h3 className="text-xl font-bold text-[#8ed5ff]">Docentes e Colaboradores</h3>
        </div>
      </div>

      {/* FILTER PANEL - MATCHING DASHBOARD EXACTLY */}
      <section className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-5 shadow-lg space-y-4">
        <h4 className="text-xs font-bold text-[#bdc8d1] uppercase tracking-wider border-b border-[#3e484f]/25 pb-2">
          Filtro Unificado - Profissionais por Localidade
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          {/* Contrato */}
          <div className="flex flex-col gap-1.5 font-sans">
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold text-[#bdc8d1]/90">Contrato:</label>
              {!isUserAdmin && assignedContracts.length === 1 && (
                <span title="Vínculo permanente do registro do usuário">
                  <Lock className="w-3 h-3 text-amber-400" />
                </span>
              )}
            </div>
            <select 
              value={contract}
              onChange={(e) => {
                setContract(e.target.value || 'Todos');
                setStateFilter('Todos');
                setCityFilter('Todos');
                setLocalityFilter('Todos');
              }}
              disabled={isHydrating || isContractLocked}
              className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="Todos">Todos os Contratos</option>
              {availableContracts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className="flex flex-col gap-1.5 font-sans font-sans">
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold text-[#bdc8d1]/90">Estado:</label>
              {!isUserAdmin && assignedStates.length === 1 && (
                <span title="Vínculo permanente do registro do usuário">
                  <Lock className="w-3 h-3 text-amber-400" />
                </span>
              )}
            </div>
            <select 
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value || 'Todos');
                setCityFilter('Todos');
                setLocalityFilter('Todos');
              }}
              disabled={isHydrating || isStateLocked}
              className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed font-sans"
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
              {!isUserAdmin && assignedRegions.length === 1 && (
                <span title="Vínculo permanente do registro do usuário">
                  <Lock className="w-3 h-3 text-amber-400" />
                </span>
              )}
            </div>
            <select 
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value || 'Todos');
                setLocalityFilter('Todos');
              }}
              disabled={isHydrating || isRegionLocked}
              className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed font-sans"
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
              {!isUserAdmin && assignedLocalities.length === 1 && (
                <span title="Vínculo permanente do registro do usuário">
                  <Lock className="w-3 h-3 text-amber-400" />
                </span>
              )}
            </div>
            <select 
              value={localityFilter}
              onChange={(e) => setLocalityFilter(e.target.value || 'Todos')}
              disabled={isHydrating || isLocalityLocked}
              className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed font-sans"
            >
              <option value="Todos">Todas as Localidades</option>
              {availableLocalities.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Search and control headers */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#3e484f]/25 pb-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#87929a]" />
          <input 
            type="text"
            placeholder="Pesquisar profissionais..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#131b2e] border border-[#3e484f]/60 rounded-lg pl-9 pr-4 py-2 text-xs text-[#dae2fd]"
          />
        </div>

        <button 
          onClick={handleOpenAddForm}
          className="px-4 py-2 bg-[#1e293b] hover:bg-[#334155] border border-[#3e484f] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md"
        >
          <Plus className="w-4 h-4 text-[#38bdf8]" />
          <span>Registrar Profissional</span>
        </button>
      </div>

      {/* Overlay Register Form Modal Container */}
      {showAddForm && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-md rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150">
            <button 
              onClick={handleCloseAddProf}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#8ed5ff] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              Registrar Profissional
            </h4>

            <form onSubmit={handleAddCreator} className="space-y-3 max-h-[80dvh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Nome Completo: *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Carlos Oliveira"
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Foto de Perfil (opcional):</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#38bdf8]/40 bg-[#0b1326] flex items-center justify-center shrink-0">
                    {progAvatarUrl ? (
                      <Image src={progAvatarUrl} alt="Foto de perfil" width={56} height={56} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Award className="w-6 h-6 text-[#87929a]" />
                    )}
                  </div>
                  <div className="flex flex-1 gap-2">
                    <label className="flex-1 text-[11px] bg-[#0b1326] border border-dashed border-[#3e484f]/60 hover:border-[#38bdf8]/60 text-[#8ed5ff] px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 font-semibold cursor-pointer">
                      {isAvatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      <span>{isAvatarUploading ? 'Enviando...' : (progAvatarUrl ? 'Trocar Foto' : 'Anexar Foto')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProgAvatarUpload}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => openCameraModal('add')}
                      className="text-[11px] bg-[#0b1326] border border-dashed border-[#3e484f]/60 hover:border-[#38bdf8]/60 text-[#8ed5ff] px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 font-semibold"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Tirar Foto</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">CPF: *</label>
                  <input 
                    type="text" 
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={progCpf}
                    onChange={(e) => setProgCpf(formatCPF(e.target.value))}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Sexo: *</label>
                  <select 
                    value={progGender}
                    onChange={(e) => setProgGender(e.target.value as 'Masculino' | 'Feminino')}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Data de Nascimento: *</label>
                  <input 
                    type="date" 
                    required
                    value={progBirthDate}
                    onChange={(e) => setProgBirthDate(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Telefone: *</label>
                  <input 
                    type="text" 
                    required
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    value={progPhone}
                    onChange={(e) => setProgPhone(formatPhone(e.target.value))}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-mono"
                  />
                </div>
              </div>

               <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">E-mail de Contato: *</label>
                <input 
                  type="email" 
                  required
                  placeholder="Ex: carlos@edukyne.edu.br"
                  value={progEmail}
                  onChange={(e) => setProgEmail(e.target.value)}
                  autoComplete="new-email"
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Senha de Acesso: *</label>
                <input 
                  type="password"
                  required
                  placeholder="Mínimo 4 caracteres"
                  value={progPassword}
                  onChange={(e) => setProgPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Especialidade / Matérias: *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Futebol, Atletismo e Futsal"
                  value={progSpec}
                  onChange={(e) => setProgSpec(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Cargo: *</label>
                <select 
                  value={progRole}
                  onChange={(e) => {
                    const normRole = e.target.value;
                    setProgRole(normRole);
                    if (normRole !== 'Gestor' && progEstado.includes(',')) {
                      const cleanState = progEstado.split(',')[0]?.trim() || '';
                      const cleanReg = progRegiao.split(',')[0]?.trim() || '';
                      const cleanLoc = progLocality.split(',')[0]?.trim() || '';
                      setProgEstado(cleanState);
                      setProgRegiao(cleanReg);
                      setProgLocality(cleanLoc);
                    }
                  }}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                >
                  {ROLES_LIST.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Contrato, Estado, Regiao, Localidade selectors */}
              <div className="space-y-3 p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg">
                <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">Vínculo Escolar</p>
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Contrato: *</label>
                  <select 
                    required
                    value={progContrato}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProgContrato(val);
                      const selected = availableContracts.find(c => c.name === val);
                      if (selected) {
                        const states = selected.estado.split(',').map(s => s.trim());
                        const regions = selected.regiao.split(',').map(r => r.trim());
                        const localities = selected.localidade.split(',').map(l => l.trim());
                        if (progRole === 'Gestor') {
                          setProgEstado('');
                          setProgRegiao('');
                          setProgLocality('');
                        } else {
                          setProgEstado(states[0] || '');
                          setProgRegiao(regions[0] || '');
                          setProgLocality(localities[0] || '');
                        }
                      } else {
                        setProgEstado('');
                        setProgRegiao('');
                        setProgLocality('');
                      }
                    }}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  >
                    <option value="">Selecione...</option>
                    {availableContracts.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {progRole === 'Gestor' ? (
                  <>
                    {/* Estados Selector Panel (Max 2) */}
                    <div className="flex flex-col gap-1.5 font-sans">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#bdc8d1]">Estados (Máx 2): *</label>
                        <span className="text-[10px] text-[#38bdf8] font-mono font-bold">
                          {selectedStates.length}/2
                        </span>
                      </div>
                      <div className="bg-[#0b1326] border border-[#3e484f]/50 rounded-lg p-2.5 space-y-1.5 max-h-32 overflow-y-auto w-full">
                        {contractStates.length === 0 ? (
                          <div className="text-[10px] text-[#bdc8d1]/50 italic">Selecione um contrato...</div>
                        ) : (
                          contractStates.map((state: string) => {
                            const isChecked = selectedStates.includes(state);
                            const isMaxReached = selectedStates.length >= 2;
                            return (
                              <label
                                key={state}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? 'bg-[#38bdf8]/10 border-[#38bdf8] text-[#38bdf8] font-bold'
                                    : isMaxReached
                                    ? 'border-[#3e484f]/20 opacity-40 cursor-not-allowed text-[#bdc8d1]/40'
                                    : 'border-[#3e484f]/50 hover:bg-[#131b2e] text-[#dae2fd]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!isChecked && isMaxReached}
                                  onChange={() => handleStateChange(state, isChecked)}
                                  className="rounded border-[#3e484f] text-[#38bdf8] focus:ring-0 bg-[#0b1326] w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className="truncate">{state}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Regiões Selector Panel (Max 10) */}
                    <div className="flex flex-col gap-1.5 font-sans mt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#bdc8d1]">Regiões (Máx 10): *</label>
                        <span className="text-[10px] text-[#38bdf8] font-mono font-bold">
                          {selectedRegions.length}/10
                        </span>
                      </div>
                      <div className="bg-[#0b1326] border border-[#3e484f]/50 rounded-lg p-2.5 space-y-1.5 max-h-36 overflow-y-auto w-full">
                        {contractRegions.length === 0 ? (
                          <div className="text-[10px] text-[#bdc8d1]/50 italic">Selecione um contrato...</div>
                        ) : (
                          contractRegions.map((reg: string) => {
                            const isChecked = selectedRegions.includes(reg);
                            const isMaxReached = selectedRegions.length >= 10;
                            return (
                              <label
                                key={reg}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? 'bg-[#38bdf8]/10 border-[#38bdf8] text-[#38bdf8] font-bold'
                                    : isMaxReached
                                    ? 'border-[#3e484f]/20 opacity-40 cursor-not-allowed text-[#bdc8d1]/40'
                                    : 'border-[#3e484f]/50 hover:bg-[#131b2e] text-[#dae2fd]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!isChecked && isMaxReached}
                                  onChange={() => handleRegionChange(reg, isChecked)}
                                  className="rounded border-[#3e484f] text-[#38bdf8] focus:ring-0 bg-[#0b1326] w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className="truncate">{reg}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Localidades Selector Panel (Max 20) */}
                    <div className="flex flex-col gap-1.5 font-sans mt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#bdc8d1]">Localidades (Máx 20): *</label>
                        <span className="text-[10px] text-[#38bdf8] font-mono font-bold">
                          {selectedLocalities.length}/20
                        </span>
                      </div>
                      <div className="bg-[#0b1326] border border-[#3e484f]/50 rounded-lg p-2.5 space-y-1.5 max-h-44 overflow-y-auto w-full">
                        {contractLocalities.length === 0 ? (
                          <div className="text-[10px] text-[#bdc8d1]/50 italic">Selecione um contrato...</div>
                        ) : (
                          contractLocalities.map((loc: string) => {
                            const isChecked = selectedLocalities.includes(loc);
                            const isMaxReached = selectedLocalities.length >= 20;
                            return (
                              <label
                                key={loc}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? 'bg-[#38bdf8]/10 border-[#38bdf8] text-[#38bdf8] font-bold'
                                    : isMaxReached
                                    ? 'border-[#3e484f]/20 opacity-40 cursor-not-allowed text-[#bdc8d1]/40'
                                    : 'border-[#3e484f]/50 hover:bg-[#131b2e] text-[#dae2fd]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!isChecked && isMaxReached}
                                  onChange={() => {
                                    if (isChecked) {
                                      const next = selectedLocalities.filter(l => l !== loc);
                                      setProgLocality(next.join(', '));
                                    } else {
                                      if (selectedLocalities.length < 20) {
                                        const next = [...selectedLocalities, loc];
                                        setProgLocality(next.join(', '));
                                      }
                                    }
                                  }}
                                  className="rounded border-[#3e484f] text-[#38bdf8] focus:ring-0 bg-[#0b1326] w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className="truncate">{loc}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Estado: *</label>
                        <select 
                          required
                          value={progEstado}
                          onChange={(e) => {
                            setProgEstado(e.target.value);
                            setProgRegiao('');
                            setProgLocality('');
                            setProgGrade('');
                          }}
                          className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                        >
                          <option value="">Selecione...</option>
                          {(() : string[] => {
                            if (!progContrato) return [];
                            const cObj = availableContracts.find(c => c.name === progContrato || c.id === progContrato);
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
                        <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Região: *</label>
                        <select 
                          required
                          value={progRegiao}
                          onChange={(e) => {
                            setProgRegiao(e.target.value);
                            setProgLocality('');
                            setProgGrade('');
                          }}
                          className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                        >
                          <option value="">Selecione...</option>
                          {(() : string[] => {
                            if (!progContrato) return [];
                            const cObj = availableContracts.find(c => c.name === progContrato || c.id === progContrato);
                            if (!cObj) return [];
                            if (cObj.structure && Array.isArray(cObj.structure.estados)) {
                              const matchingStates = cObj.structure.estados.filter((st: EstHierarchical) => !progEstado || st.name === progEstado);
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
                      <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Localidade: *</label>
                      <select 
                        required
                        value={progLocality}
                        onChange={(e) => {
                          setProgLocality(e.target.value);
                          setProgGrade('');
                        }}
                        className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                      >
                        <option value="">Selecione...</option>
                        {(() : string[] => {
                          if (!progContrato) return [];
                          const cObj = availableContracts.find(c => c.name === progContrato || c.id === progContrato);
                          if (!cObj) return [];
                          if (cObj.structure && Array.isArray(cObj.structure.estados)) {
                            const matchingStates = cObj.structure.estados.filter((st: EstHierarchical) => !progEstado || st.name === progEstado);
                            const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => !progRegiao || r.name === progRegiao));
                            return Array.from(new Set(matchingRegs.flatMap((r: RegHierarchical) => r.localidades.map((l: LocHierarchical) => l.name))));
                          }
                          return cObj.localidade.split(',').map((l: string) => l.trim());
                        })().map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Série/Turma */}
                <div className="flex flex-col gap-1.5 font-sans pt-2 border-t border-[#3e484f]/20 mt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#bdc8d1]">Série/Turma (Selecione uma ou mais):</label>
                    <span className="text-[10px] text-[#38bdf8] font-mono font-bold">
                      {progGrade ? progGrade.split(',').map(s => s.trim()).filter(Boolean).length : 0} selecionada(s)
                    </span>
                  </div>
                  <div className="bg-[#0b1326] border border-[#3e484f]/50 rounded-lg p-2.5 space-y-1.5 max-h-36 overflow-y-auto w-full">
                    {(() => {
                      const options = getGradesForSelectedContract(progContrato, progEstado, progRegiao, progLocality);
                      if (options.length === 0) {
                        return <div className="text-[10px] text-[#bdc8d1]/50 italic">Selecione uma localidade válida para carregar turmas...</div>;
                      }
                      return options.map((opt: string) => {
                        const selectedGrades = progGrade ? progGrade.split(',').map(s => s.trim()).filter(Boolean) : [];
                        const isChecked = selectedGrades.includes(opt);
                        return (
                          <label
                            key={opt}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer select-none transition-all ${
                              isChecked
                                ? 'bg-[#38bdf8]/10 border-[#38bdf8] text-[#38bdf8] font-bold'
                                : 'border-[#3e484f]/50 hover:bg-[#131b2e] text-[#dae2fd]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                let next: string[];
                                if (isChecked) {
                                  next = selectedGrades.filter(g => g !== opt);
                                } else {
                                  next = [...selectedGrades, opt];
                                }
                                setProgGrade(next.join(', '));
                              }}
                              className="rounded border-[#3e484f] text-[#38bdf8] focus:ring-0 bg-[#0b1326] w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="truncate">{opt}</span>
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#3e484f]/25 text-xs">
                <button 
                  type="button" 
                  onClick={handleCloseAddProf} 
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-[#38bdf8] text-[#001e2c] font-bold rounded-lg text-xs shadow-md shadow-[#38bdf8]/10"
                >
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional List Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredProgs.length === 0 ? (
          <p className="col-span-full py-12 text-center text-xs text-[#bdc8d1]/60">Nenhum profissional listado.</p>
        ) : (
          filteredProgs.map((prog) => (
            <div key={prog.id} className="bg-[#171f33] border border-[#3e484f]/40 p-4 rounded-xl shadow-lg relative group overflow-hidden">
              <div className="absolute top-2 right-2 bg-[#38bdf8]/10 text-[#38bdf8] text-[9px] font-bold px-2 py-0.5 rounded border border-[#38bdf8]/20">
                {prog.status}
              </div>

              <div className="flex flex-col items-center text-center space-y-3 pt-3">
                <div className="relative w-20 h-20 overflow-hidden border-2 border-[#38bdf8] bg-[#0b1326]">
                  <Image 
                    src={prog.avatarUrl ?? ''} 
                    alt={prog.name} 
                    fill 
                    sizes="80px" 
                    className="object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#dae2fd]">{prog.name}</h4>
                  <p className="text-[10px] text-[#38bdf8] font-semibold">{prog.role}</p>
                </div>

                <div className="w-full bg-[#0a1120] rounded-lg p-2.5 text-left text-[11px] space-y-1 border border-[#3e484f]/25">
                  <p className="flex items-center gap-2 text-[#dae2fd]">
                    <Award className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                    <span className="truncate">{prog.specialty}</span>
                  </p>
                  <p className="flex items-center gap-2 text-[#bdc8d1]/90">
                    <Mail className="w-3.5 h-3.5 text-[#87929a] shrink-0" />
                    <span className="truncate">{prog.email}</span>
                  </p>
                  {(prog.cpf || prog.phone || prog.locality || prog.gender || prog.birthDate || prog.contrato || prog.estado || prog.regiao || prog.grade) && (
                    <div className="pt-2 border-t border-[#3e484f]/15 mt-2 text-[9px] text-[#87929a] space-y-0.5 font-sans">
                      {prog.cpf && <p>CPF: <strong className="text-[#9fcfff] font-mono">{maskCPF(prog.cpf)}</strong></p>}
                      {prog.phone && <p>Tel: <strong className="text-[#9fcfff] font-mono">{prog.phone}</strong></p>}
                      {prog.birthDate && <p>Nasc: <strong className="text-[#9fcfff]">{formatDateBR(prog.birthDate)}</strong> ({prog.gender})</p>}
                      {prog.locality && <p>Localidade: <strong className="text-[#9fcfff]">{prog.locality}</strong></p>}
                      {prog.contrato && <p>Contrato: <strong className="text-[#38bdf8]">{prog.contrato}</strong></p>}
                      {prog.estado && <p>Estado: <strong className="text-[#38bdf8]">{prog.estado}</strong></p>}
                      {prog.regiao && <p>Região: <strong className="text-[#38bdf8]">{prog.regiao}</strong></p>}
                      {prog.grade && <p>Série/Turma: <strong className="text-[#38bdf8]">{prog.grade}</strong></p>}
                    </div>
                  )}
                </div>

                <div className="w-full flex items-center justify-end gap-2 pt-2 border-t border-[#3e484f]/15">
                  <button
                    type="button"
                    onClick={() => handleOpenEditProf(prog)}
                    className="p-2 hover:bg-[#0b1326] text-[#bdc8d1] hover:text-[#38bdf8] rounded transition-colors"
                    title="Editar Profissional"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfToDelete(prog)}
                    className="p-2 hover:bg-[#93000a]/25 text-[#bdc8d1] hover:text-[#ffb4ab] rounded transition-colors"
                    title="Excluir Profissional"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* EDIT PROFESSIONAL OVERLAY DIALOG MODAL */}
      {profToEdit && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-md rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150">
            <button 
              onClick={handleCloseEditProf}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              Editar Cadastro de Profissional
            </h4>

            <form onSubmit={handleSaveEditProf} className="space-y-3 max-h-[80dvh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Foto de Perfil (opcional):</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#38bdf8]/40 bg-[#0b1326] flex items-center justify-center shrink-0">
                    {editProfAvatarUrl ? (
                      <Image src={editProfAvatarUrl} alt="Foto de perfil" width={56} height={56} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Award className="w-6 h-6 text-[#87929a]" />
                    )}
                  </div>
                  <div className="flex flex-1 gap-2">
                    <label className="flex-1 text-[11px] bg-[#0b1326] border border-dashed border-[#3e484f]/60 hover:border-[#38bdf8]/60 text-[#8ed5ff] px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 font-semibold cursor-pointer">
                      {isEditAvatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      <span>{isEditAvatarUploading ? 'Enviando...' : (editProfAvatarUrl ? 'Trocar Foto' : 'Anexar Foto')}</span>
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
                      <span>Tirar Foto</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Nome Completo: *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Carlos Oliveira"
                  value={editProfName}
                  onChange={(e) => setEditProfName(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">CPF: *</label>
                  <input 
                    type="text"
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={editProfCpf}
                    onChange={(e) => setEditProfCpf(formatCPF(e.target.value))}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Sexo: *</label>
                  <select 
                    value={editProfGender}
                    onChange={(e) => setEditProfGender(e.target.value as 'Masculino' | 'Feminino')}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Data de Nascimento: *</label>
                  <input 
                    type="date"
                    required
                    value={editProfBirthDate}
                    onChange={(e) => setEditProfBirthDate(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Telefone: *</label>
                  <input 
                    type="text"
                    required
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    value={editProfPhone}
                    onChange={(e) => setEditProfPhone(formatPhone(e.target.value))}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">E-mail de Contato: *</label>
                <input 
                  type="email"
                  required
                  placeholder="Ex: carlos@edukyne.edu.br"
                  value={editProfEmail}
                  onChange={(e) => setEditProfEmail(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Senha de Acesso: *</label>
                <input 
                  type="password"
                  required
                  placeholder="Mínimo 4 caracteres"
                  value={editProfPassword}
                  onChange={(e) => setEditProfPassword(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Especialidade / Matérias: *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Futebol e Atletismo"
                  value={editProfSpecialty}
                  onChange={(e) => setEditProfSpecialty(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Cargo: *</label>
                <select 
                  value={editProfRole}
                  onChange={(e) => {
                    const normRole = e.target.value;
                    setEditProfRole(normRole);
                    if (normRole !== 'Gestor' && editProfEstado.includes(',')) {
                      const cleanState = editProfEstado.split(',')[0]?.trim() || '';
                      const cleanReg = editProfRegiao.split(',')[0]?.trim() || '';
                      const cleanLoc = editProfLocality.split(',')[0]?.trim() || '';
                      setEditProfEstado(cleanState);
                      setEditProfRegiao(cleanReg);
                      setEditProfLocality(cleanLoc);
                    }
                  }}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                >
                  {ROLES_LIST.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Contrato, Estado, Regiao, Localidade selectors for EDIT */}
              <div className="space-y-3 p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg">
                <p className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-wider">Vínculo Escolar</p>
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Contrato: *</label>
                  <select 
                    required
                    value={editProfContrato}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditProfContrato(val);
                      const selected = availableContracts.find(c => c.name === val);
                      if (selected) {
                        const states = selected.estado.split(',').map(s => s.trim());
                        const regions = selected.regiao.split(',').map(r => r.trim());
                        const localities = selected.localidade.split(',').map(l => l.trim());
                        if (editProfRole === 'Gestor') {
                          setEditProfEstado('');
                          setEditProfRegiao('');
                          setEditProfLocality('');
                        } else {
                          setEditProfEstado(states[0] || '');
                          setEditProfRegiao(regions[0] || '');
                          setEditProfLocality(localities[0] || '');
                        }
                      } else {
                        setEditProfEstado('');
                        setEditProfRegiao('');
                        setEditProfLocality('');
                      }
                    }}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  >
                    <option value="">Selecione...</option>
                    {availableContracts.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {editProfRole === 'Gestor' ? (
                  <>
                    {/* Estados Selector Panel (Max 2) */}
                    <div className="flex flex-col gap-1.5 font-sans">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#bdc8d1]">Estados (Máx 2): *</label>
                        <span className="text-[10px] text-[#38bdf8] font-mono font-bold">
                          {editSelectedStates.length}/2
                        </span>
                      </div>
                      <div className="bg-[#0b1326] border border-[#3e484f]/50 rounded-lg p-2.5 space-y-1.5 max-h-32 overflow-y-auto w-full">
                        {editContractStates.length === 0 ? (
                          <div className="text-[10px] text-[#bdc8d1]/50 italic">Selecione um contrato...</div>
                        ) : (
                          editContractStates.map((state: string) => {
                            const isChecked = editSelectedStates.includes(state);
                            const isMaxReached = editSelectedStates.length >= 2;
                            return (
                              <label
                                key={state}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? 'bg-[#38bdf8]/10 border-[#38bdf8] text-[#38bdf8] font-bold'
                                    : isMaxReached
                                    ? 'border-[#3e484f]/20 opacity-40 cursor-not-allowed text-[#bdc8d1]/40'
                                    : 'border-[#3e484f]/50 hover:bg-[#131b2e] text-[#dae2fd]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!isChecked && isMaxReached}
                                  onChange={() => handleEditStateChange(state, isChecked)}
                                  className="rounded border-[#3e484f] text-[#38bdf8] focus:ring-0 bg-[#0b1326] w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className="truncate">{state}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Regiões Selector Panel (Max 10) */}
                    <div className="flex flex-col gap-1.5 font-sans mt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#bdc8d1]">Regiões (Máx 10): *</label>
                        <span className="text-[10px] text-[#38bdf8] font-mono font-bold">
                          {editSelectedRegions.length}/10
                        </span>
                      </div>
                      <div className="bg-[#0b1326] border border-[#3e484f]/50 rounded-lg p-2.5 space-y-1.5 max-h-36 overflow-y-auto w-full">
                        {editContractRegions.length === 0 ? (
                          <div className="text-[10px] text-[#bdc8d1]/50 italic">Selecione um contrato...</div>
                        ) : (
                          editContractRegions.map((reg: string) => {
                            const isChecked = editSelectedRegions.includes(reg);
                            const isMaxReached = editSelectedRegions.length >= 10;
                            return (
                              <label
                                key={reg}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? 'bg-[#38bdf8]/10 border-[#38bdf8] text-[#38bdf8] font-bold'
                                    : isMaxReached
                                    ? 'border-[#3e484f]/20 opacity-40 cursor-not-allowed text-[#bdc8d1]/40'
                                    : 'border-[#3e484f]/50 hover:bg-[#131b2e] text-[#dae2fd]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!isChecked && isMaxReached}
                                  onChange={() => handleEditRegionChange(reg, isChecked)}
                                  className="rounded border-[#3e484f] text-[#38bdf8] focus:ring-0 bg-[#0b1326] w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className="truncate">{reg}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Localidades Selector Panel (Max 20) */}
                    <div className="flex flex-col gap-1.5 font-sans mt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#bdc8d1]">Localidades (Máx 20): *</label>
                        <span className="text-[10px] text-[#38bdf8] font-mono font-bold">
                          {editSelectedLocalities.length}/20
                        </span>
                      </div>
                      <div className="bg-[#0b1326] border border-[#3e484f]/50 rounded-lg p-2.5 space-y-1.5 max-h-44 overflow-y-auto w-full">
                        {editContractLocalities.length === 0 ? (
                          <div className="text-[10px] text-[#bdc8d1]/50 italic">Selecione um contrato...</div>
                        ) : (
                          editContractLocalities.map((loc: string) => {
                            const isChecked = editSelectedLocalities.includes(loc);
                            const isMaxReached = editSelectedLocalities.length >= 20;
                            return (
                              <label
                                key={loc}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? 'bg-[#38bdf8]/10 border-[#38bdf8] text-[#38bdf8] font-bold'
                                    : isMaxReached
                                    ? 'border-[#3e484f]/20 opacity-40 cursor-not-allowed text-[#bdc8d1]/40'
                                    : 'border-[#3e484f]/50 hover:bg-[#131b2e] text-[#dae2fd]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!isChecked && isMaxReached}
                                  onChange={() => {
                                    if (isChecked) {
                                      const next = editSelectedLocalities.filter(l => l !== loc);
                                      setEditProfLocality(next.join(', '));
                                    } else {
                                      if (editSelectedLocalities.length < 20) {
                                        const next = [...editSelectedLocalities, loc];
                                        setEditProfLocality(next.join(', '));
                                      }
                                    }
                                  }}
                                  className="rounded border-[#3e484f] text-[#38bdf8] focus:ring-0 bg-[#0b1326] w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className="truncate">{loc}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Estado: *</label>
                        <select 
                          required
                          value={editProfEstado}
                          onChange={(e) => {
                            setEditProfEstado(e.target.value);
                            setEditProfRegiao('');
                            setEditProfLocality('');
                            setEditProfGrade('');
                          }}
                          className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                        >
                          <option value="">Selecione...</option>
                          {(() : string[] => {
                            if (!editProfContrato) return [];
                            const cObj = availableContracts.find(c => c.name === editProfContrato || c.id === editProfContrato);
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
                        <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Região: *</label>
                        <select 
                          required
                          value={editProfRegiao}
                          onChange={(e) => {
                            setEditProfRegiao(e.target.value);
                            setEditProfLocality('');
                            setEditProfGrade('');
                          }}
                          className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                        >
                          <option value="">Selecione...</option>
                          {(() : string[] => {
                            if (!editProfContrato) return [];
                            const cObj = availableContracts.find(c => c.name === editProfContrato || c.id === editProfContrato);
                            if (!cObj) return [];
                            if (cObj.structure && Array.isArray(cObj.structure.estados)) {
                              const matchingStates = cObj.structure.estados.filter((st: EstHierarchical) => !editProfEstado || st.name === editProfEstado);
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
                      <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">Localidade: *</label>
                      <select 
                        required
                        value={editProfLocality}
                        onChange={(e) => {
                          setEditProfLocality(e.target.value);
                          setEditProfGrade('');
                        }}
                        className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                      >
                        <option value="">Selecione...</option>
                        {(() : string[] => {
                          if (!editProfContrato) return [];
                          const cObj = availableContracts.find(c => c.name === editProfContrato || c.id === editProfContrato);
                          if (!cObj) return [];
                          if (cObj.structure && Array.isArray(cObj.structure.estados)) {
                            const matchingStates = cObj.structure.estados.filter((st: EstHierarchical) => !editProfEstado || st.name === editProfEstado);
                            const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => !editProfRegiao || r.name === editProfRegiao));
                            return Array.from(new Set(matchingRegs.flatMap((r: RegHierarchical) => r.localidades.map((l: LocHierarchical) => l.name))));
                          }
                          return cObj.localidade.split(',').map((l: string) => l.trim());
                        })().map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Série/Turma */}
                <div className="flex flex-col gap-1.5 font-sans pt-2 border-t border-[#3e484f]/20 mt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#bdc8d1]">Série/Turma (Selecione uma ou mais):</label>
                    <span className="text-[10px] text-[#38bdf8] font-mono font-bold">
                      {editProfGrade ? editProfGrade.split(',').map(s => s.trim()).filter(Boolean).length : 0} selecionada(s)
                    </span>
                  </div>
                  <div className="bg-[#0b1326] border border-[#3e484f]/50 rounded-lg p-2.5 space-y-1.5 max-h-36 overflow-y-auto w-full">
                    {(() => {
                      const options = getGradesForSelectedContract(editProfContrato, editProfEstado, editProfRegiao, editProfLocality);
                      if (options.length === 0) {
                        return <div className="text-[10px] text-[#bdc8d1]/50 italic">Selecione uma localidade válida para carregar turmas...</div>;
                      }
                      return options.map((opt: string) => {
                        const selectedGrades = editProfGrade ? editProfGrade.split(',').map(s => s.trim()).filter(Boolean) : [];
                        const isChecked = selectedGrades.includes(opt);
                        return (
                          <label
                            key={opt}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer select-none transition-all ${
                              isChecked
                                ? 'bg-[#38bdf8]/10 border-[#38bdf8] text-[#38bdf8] font-bold'
                                : 'border-[#3e484f]/50 hover:bg-[#131b2e] text-[#dae2fd]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                let next: string[];
                                if (isChecked) {
                                  next = selectedGrades.filter(g => g !== opt);
                                } else {
                                  next = [...selectedGrades, opt];
                                }
                                setEditProfGrade(next.join(', '));
                              }}
                              className="rounded border-[#3e484f] text-[#38bdf8] focus:ring-0 bg-[#0b1326] w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="truncate">{opt}</span>
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#3e484f]/25 text-xs">
                <button 
                  type="button"
                  onClick={handleCloseEditProf}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg text-xs shadow-md"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM DELETE DIALOG OVERLAY FOR PROFESSIONAL */}
      {profToDelete && (
        <div className="fixed inset-0 bg-[#060e20]/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#ffb4ab]/40 w-full max-w-sm rounded-xl shadow-2xl p-5 relative animate-in fade-in zoom-in duration-150">
            <h4 className="text-sm font-bold text-[#ffb4ab] uppercase tracking-wider mb-2">
              Confirmar Exclusão
            </h4>
            <p className="text-xs text-[#bdc8d1] mb-5 leading-relaxed">
              Tem certeza de que deseja remover permanentemente o registro de <span className="text-[#dae2fd] font-bold">{profToDelete.name}</span> ({profToDelete.role})? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-end">
              <button 
                type="button"
                onClick={() => setProfToDelete(null)}
                className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmDeleteProf}
                className="px-5 py-2 bg-[#93000a] hover:bg-[#b31412] text-[#ffb4ab] font-bold rounded-lg text-xs shadow-md"
              >
                Confirmar Excluir
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
              Tirar Foto
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
              {isCapturingPhoto ? 'Capturando...' : 'Capturar Foto'}
            </button>
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
