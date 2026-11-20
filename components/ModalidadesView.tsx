'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Award, AlertTriangle, Plus, Trash2, Edit, UserPlus, X, Save, Lock, FileSpreadsheet, FileText } from 'lucide-react';
import { nextModalityId, uuid } from '../lib/idGenerator';
import { type Modality, type ContratoItem, type Student, type Professional, type EstHierarchical, type RegHierarchical, type LocHierarchical } from '../types/edukyne';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addReportBackground } from '../lib/pdfUtils';
import * as XLSX from 'xlsx';
import { normalizeRole } from '../lib/rbac';
import type { Permission } from '../lib/rbac';
import { logExport } from '../lib/auditLog';

interface UserData {
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

interface ModalidadesViewProps {
  modalities: Modality[];
  setModalities: React.Dispatch<React.SetStateAction<Modality[]>>;
  runWithPermission: (permission: Permission, onApproved: () => void) => void;
  contratos?: ContratoItem[];
  students?: Student[];
  professionals?: Professional[];
  user?: UserData;
}

export default function ModalidadesView({ 
  modalities, 
  setModalities, 
  runWithPermission, 
  contratos,
  students = [],
  professionals = [],
  user
}: ModalidadesViewProps) {
  const t = useTranslations('modalidades');
  const ta = useTranslations('alunos');
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [coach, setCoach] = useState('');
  const [capacity, setCapacity] = useState(30);
  const [category, setCategory] = useState<'Esporte' | 'Cultura' | 'Tecnologia'>('Esporte');

  // Form Cascades for creation
  const [addContrato, setAddContrato] = useState('');
  const [addEstado, setAddEstado] = useState('');
  const [addRegiao, setAddRegiao] = useState('');
  const [addLocality, setAddLocality] = useState('');
  const [addProfessorId, setAddProfessorId] = useState('');

  // CRUD Editing State
  const [editingModality, setEditingModality] = useState<Modality | null>(null);
  const [editName, setEditName] = useState('');
  const [editCoach, setEditCoach] = useState('');
  const [editCapacity, setEditCapacity] = useState(30);
  const [editCategory, setEditCategory] = useState<'Esporte' | 'Cultura' | 'Tecnologia'>('Esporte');
  const [editContrato, setEditContrato] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [editRegiao, setEditRegiao] = useState('');
  const [editLocality, setEditLocality] = useState('');
  const [editProfessorId, setEditProfessorId] = useState('');

  // Student Enrollment State (inserting students)
  const [manageEnrollmentModalityId, setManageEnrollmentModalityId] = useState<string | null>(null);
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState('');

  // Security Context checks: Lock filters if they have single value, restrict if multiple values
  const isHydrating = user?.id === 'loading';
  const isUserAdmin = (normalizeRole(user?.role ?? '') === 'Administrador' || !user);

  const loggedInStudentObj = useMemo(() => {
    if (normalizeRole(user?.role ?? '') !== 'Aluno') return null;
    return students.find(s => 
      s.email?.toLowerCase().trim() === user?.email?.toLowerCase().trim() ||
      s.name?.toLowerCase().trim() === user?.name?.toLowerCase().trim() ||
      s.id === user?.id
    );
  }, [user, students]);

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

  // Initialize states dynamically with lock awareness
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
  
  // Cascades for ADD list
  const addAvailableStates = useMemo(() => {
    const raw = Array.from(new Set(
      availableContracts
        .filter(c => !addContrato || c.id === addContrato)
        .flatMap(c => {
          if (c.structure && Array.isArray(c.structure.estados)) {
            return c.structure.estados.map((st: EstHierarchical) => st.name);
          }
          return c.estado.split(',').map(s => s.trim());
        })
    )).filter(Boolean);

    if (!isUserAdmin && assignedStates.length > 0) {
      return raw.filter(st => assignedStates.includes(st.toLowerCase()));
    }
    return raw;
  }, [availableContracts, addContrato, isUserAdmin, assignedStates]);

  const addAvailableRegions = useMemo(() => {
    const raw = Array.from(new Set(
      availableContracts
        .filter(c => !addContrato || c.id === addContrato)
        .flatMap(c => {
          if (c.structure && Array.isArray(c.structure.estados)) {
            const matchingStates = c.structure.estados.filter((st: EstHierarchical) => !addEstado || st.name.toLowerCase().trim() === addEstado.toLowerCase().trim());
            return matchingStates.flatMap((st: EstHierarchical) => st.regioes.map((r: RegHierarchical) => r.name));
          }
          const matchE = !addEstado || c.estado.split(',').map(s => s.trim().toLowerCase()).includes(addEstado.toLowerCase().trim());
          return matchE ? c.regiao.split(',').map(s => s.trim()) : [];
        })
    )).filter(Boolean);

    if (!isUserAdmin && assignedRegions.length > 0) {
      return raw.filter(reg => assignedRegions.includes(reg.toLowerCase()));
    }
    return raw;
  }, [availableContracts, addContrato, addEstado, isUserAdmin, assignedRegions]);

  const addAvailableLocalities = useMemo(() => {
    const raw = Array.from(new Set(
      availableContracts
        .filter(c => !addContrato || c.id === addContrato)
        .flatMap(c => {
          if (c.structure && Array.isArray(c.structure.estados)) {
            const matchingStates = c.structure.estados.filter((st: EstHierarchical) => !addEstado || st.name.toLowerCase().trim() === addEstado.toLowerCase().trim());
            const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => !addRegiao || r.name.toLowerCase().trim() === addRegiao.toLowerCase().trim()));
            return matchingRegs.flatMap((r: RegHierarchical) => r.localidades.map((l: LocHierarchical) => l.name));
          }
          const matchE = !addEstado || c.estado.split(',').map(s => s.trim().toLowerCase()).includes(addEstado.toLowerCase().trim());
          const matchR = !addRegiao || c.regiao.split(',').map(s => s.trim().toLowerCase()).includes(addRegiao.toLowerCase().trim());
          return (matchE && matchR) ? c.localidade.split(',').map(s => s.trim()) : [];
        })
    )).filter(Boolean);

    if (!isUserAdmin && assignedLocalities.length > 0) {
      return raw.filter(loc => assignedLocalities.includes(loc.toLowerCase()));
    }
    return raw;
  }, [availableContracts, addContrato, addEstado, addRegiao, isUserAdmin, assignedLocalities]);

  // Filter professionals for selected Add locality, region, state, and contract
  const addFilteredProfessionals = professionals.filter(p => {
    if (addContrato) {
      const contractObj = availableContracts.find(c => c.id === addContrato || c.name === addContrato);
      if (contractObj && p.contrato) {
        const profContracts = p.contrato.split(',').map((s: string) => s.trim().toLowerCase());
        if (!profContracts.includes(contractObj.name.toLowerCase())) return false;
      }
    }
    if (addEstado && p.estado) {
      const profStates = p.estado.split(',').map((s: string) => s.trim().toLowerCase());
      if (!profStates.includes(addEstado.toLowerCase())) return false;
    }
    if (addRegiao && p.regiao) {
      const profRegions = p.regiao.split(',').map((s: string) => s.trim().toLowerCase());
      if (!profRegions.includes(addRegiao.toLowerCase())) return false;
    }
    if (addLocality && p.locality) {
      const profLocalities = p.locality.split(',').map((s: string) => s.trim().toLowerCase());
      if (!profLocalities.includes(addLocality.toLowerCase())) return false;
    }
    return true;
  });

  // Prefill Nova Modalidade form when opened or when dependencies resolve
  useEffect(() => {
    if (showAddForm && !addContrato && availableContracts.length > 0) {
      let targetContract = availableContracts[0];
      if (isContractLocked) {
        const match = availableContracts.find(c => 
          assignedContracts.includes(c.name.toLowerCase()) || assignedContracts.includes(c.id.toLowerCase())
        );
        if (match) targetContract = match;
      }
      setAddContrato(targetContract.id);
    }
  }, [showAddForm, addContrato, availableContracts, isContractLocked, assignedContracts]);

  useEffect(() => {
    if (showAddForm && addContrato) {
      if (isStateLocked && !addEstado) {
        const matchSt = addAvailableStates.find(st => assignedStates.includes(st.toLowerCase()));
        if (matchSt) setAddEstado(matchSt);
        else if (addAvailableStates.length > 0) setAddEstado(addAvailableStates[0]);
      } else if (!addEstado && addAvailableStates.length > 0) {
        setAddEstado(addAvailableStates[0]);
      }
    }
  }, [showAddForm, addContrato, isStateLocked, addEstado, addAvailableStates, assignedStates]);

  useEffect(() => {
    if (showAddForm && addEstado) {
      if (isRegionLocked && !addRegiao) {
        const matchReg = addAvailableRegions.find(reg => assignedRegions.includes(reg.toLowerCase()));
        if (matchReg) setAddRegiao(matchReg);
        else if (addAvailableRegions.length > 0) setAddRegiao(addAvailableRegions[0]);
      } else if (!addRegiao && addAvailableRegions.length > 0) {
        setAddRegiao(addAvailableRegions[0]);
      }
    }
  }, [showAddForm, addEstado, isRegionLocked, addRegiao, addAvailableRegions, assignedRegions]);

  useEffect(() => {
    if (showAddForm && addRegiao) {
      if (isLocalityLocked && !addLocality) {
        const matchLoc = addAvailableLocalities.find(loc => assignedLocalities.includes(loc.toLowerCase()));
        if (matchLoc) setAddLocality(matchLoc);
        else if (addAvailableLocalities.length > 0) setAddLocality(addAvailableLocalities[0]);
      } else if (!addLocality && addAvailableLocalities.length > 0) {
        setAddLocality(addAvailableLocalities[0]);
      }
    }
  }, [showAddForm, addRegiao, isLocalityLocked, addLocality, addAvailableLocalities, assignedLocalities]);

  // Cascades for EDIT list
  const editAvailableStates = useMemo(() => {
    const raw = Array.from(new Set(
      availableContracts
        .filter(c => !editContrato || c.id === editContrato)
        .flatMap(c => {
          if (c.structure && Array.isArray(c.structure.estados)) {
            return c.structure.estados.map((st: EstHierarchical) => st.name);
          }
          return c.estado.split(',').map(s => s.trim());
        })
    )).filter(Boolean);

    if (!isUserAdmin && assignedStates.length > 0) {
      return raw.filter(st => assignedStates.includes(st.toLowerCase()));
    }
    return raw;
  }, [availableContracts, editContrato, isUserAdmin, assignedStates]);

  const editAvailableRegions = useMemo(() => {
    const raw = Array.from(new Set(
      availableContracts
        .filter(c => !editContrato || c.id === editContrato)
        .flatMap(c => {
          if (c.structure && Array.isArray(c.structure.estados)) {
            const matchingStates = c.structure.estados.filter((st: EstHierarchical) => !editEstado || st.name.toLowerCase().trim() === editEstado.toLowerCase().trim());
            return matchingStates.flatMap((st: EstHierarchical) => st.regioes.map((r: RegHierarchical) => r.name));
          }
          const matchE = !editEstado || c.estado.split(',').map(s => s.trim().toLowerCase()).includes(editEstado.toLowerCase().trim());
          return matchE ? c.regiao.split(',').map(s => s.trim()) : [];
        })
    )).filter(Boolean);

    if (!isUserAdmin && assignedRegions.length > 0) {
      return raw.filter(reg => assignedRegions.includes(reg.toLowerCase()));
    }
    return raw;
  }, [availableContracts, editContrato, editEstado, isUserAdmin, assignedRegions]);

  const editAvailableLocalities = useMemo(() => {
    const raw = Array.from(new Set(
      availableContracts
        .filter(c => !editContrato || c.id === editContrato)
        .flatMap(c => {
          if (c.structure && Array.isArray(c.structure.estados)) {
            const matchingStates = c.structure.estados.filter((st: EstHierarchical) => !editEstado || st.name.toLowerCase().trim() === editEstado.toLowerCase().trim());
            const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => !editRegiao || r.name.toLowerCase().trim() === editRegiao.toLowerCase().trim()));
            return matchingRegs.flatMap((r: RegHierarchical) => r.localidades.map((l: LocHierarchical) => l.name));
          }
          const matchE = !editEstado || c.estado.split(',').map(s => s.trim().toLowerCase()).includes(editEstado.toLowerCase().trim());
          const matchR = !editRegiao || c.regiao.split(',').map(s => s.trim().toLowerCase()).includes(editRegiao.toLowerCase().trim());
          return (matchE && matchR) ? c.localidade.split(',').map(s => s.trim()) : [];
        })
    )).filter(Boolean);

    if (!isUserAdmin && assignedLocalities.length > 0) {
      return raw.filter(loc => assignedLocalities.includes(loc.toLowerCase()));
    }
    return raw;
  }, [availableContracts, editContrato, editEstado, editRegiao, isUserAdmin, assignedLocalities]);

  // Filter professionals for selected Edit locality, region, state, and contract
  const editFilteredProfessionals = professionals.filter(p => {
    if (editContrato) {
      const contractObj = availableContracts.find(c => c.id === editContrato || c.name === editContrato);
      if (contractObj && p.contrato) {
        const profContracts = p.contrato.split(',').map((s: string) => s.trim().toLowerCase());
        if (!profContracts.includes(contractObj.name.toLowerCase())) return false;
      }
    }
    if (editEstado && p.estado) {
      const profStates = p.estado.split(',').map((s: string) => s.trim().toLowerCase());
      if (!profStates.includes(editEstado.toLowerCase())) return false;
    }
    if (editRegiao && p.regiao) {
      const profRegions = p.regiao.split(',').map((s: string) => s.trim().toLowerCase());
      if (!profRegions.includes(editRegiao.toLowerCase())) return false;
    }
    if (editLocality && p.locality) {
      const profLocalities = p.locality.split(',').map((s: string) => s.trim().toLowerCase());
      if (!profLocalities.includes(editLocality.toLowerCase())) return false;
    }
    return true;
  });

  const handleAddModality = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if required fields are missing and alert the user
    const missingFields: string[] = [];
    if (!name || !name.trim()) {
      missingFields.push('Nome da Modalidade');
    }
    if (!addProfessorId) {
      missingFields.push('Profissional');
    }

    if (missingFields.length > 0) {
      alert(`Aviso: Para criar uma nova modalidade, é obrigatório preencher os seguintes campos:\n- ${missingFields.join('\n- ')}`);
      return;
    }

    runWithPermission('create:modalidades', async () => {
      // Find professional name
      const prof = professionals.find(p => p.id === addProfessorId);
      const coachName = prof ? `Prof. ${prof.name}` : coach || 'Prof. Sem Nome';

      // Find contract name
      const contractObj = availableContracts.find(c => c.id === addContrato);
      const contractName = contractObj ? contractObj.name : '';

      const generatedId = await nextModalityId();
      const nextId = generatedId || ('Modalidade_' + uuid().slice(0, 8));

      const newMod: Modality = {
        id: nextId,
        name: name.trim(),
        coach: coachName,
        enrolled: 0,
        capacity: Number(capacity),
        status: 'Matrículas Abertas',
        category,
        contrato: contractName,
        estado: addEstado,
        regiao: addRegiao,
        locality: addLocality,
        professorId: addProfessorId,
        enrolledStudentIds: []
      };

      setModalities(prev => [...prev, newMod]);
      setName('');
      setCoach('');
      setAddContrato('');
      setAddEstado('');
      setAddRegiao('');
      setAddLocality('');
      setAddProfessorId('');
      setShowAddForm(false);
    });
  };

  const [modalityToDelete, setModalityToDelete] = useState<Modality | null>(null);

  const handleDeleteModality = (id: string) => {
    const mod = modalities.find(m => m.id === id);
    if (mod) {
      setModalityToDelete(mod);
    }
  };

  const confirmDeleteModality = () => {
    if (!modalityToDelete) return;
    runWithPermission('delete:modalidades', () => {
      setModalities(prev => prev.filter(m => m.id !== modalityToDelete.id));
      setModalityToDelete(null);
    });
  };

  const startEditModality = (mod: Modality) => {
    setEditingModality(mod);
    setEditName(mod.name);
    setEditCoach(mod.coach ?? '');
    setEditCapacity(mod.capacity ?? 0);
    setEditCategory((mod.category ?? '') as 'Esporte' | 'Cultura' | 'Tecnologia');
    
    // Find contract id from name to pre-populate
    const foundContract = availableContracts.find(c => c.name === mod.contrato);
    setEditContrato(foundContract?.id || '');
    setEditEstado(mod.estado || '');
    setEditRegiao(mod.regiao || '');
    setEditLocality(mod.locality || '');
    setEditProfessorId(mod.professorId || '');
  };

  const handleUpdateModality = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModality) return;

    runWithPermission('edit:modalidades', () => {
      const prof = professionals.find(p => p.id === editProfessorId);
      const coachName = prof ? `Prof. ${prof.name}` : editCoach || 'Prof. Sem Nome';

      const contractObj = availableContracts.find(c => c.id === editContrato);
      const contractName = contractObj ? contractObj.name : '';

      setModalities(prev => prev.map(m => {
        if (m.id === editingModality.id) {
          const limit = Number(editCapacity);
          const currentEnrolled = m.enrolledStudentIds?.length || m.enrolled || 0;
          return {
            ...m,
            name: editName,
            coach: coachName,
            capacity: limit,
            category: editCategory,
            contrato: contractName,
            estado: editEstado,
            regiao: editRegiao,
            locality: editLocality,
            professorId: editProfessorId,
            status: (currentEnrolled ?? 0) >= limit ? 'Turma Cheia' : 'Matrículas Abertas'
          };
        }
        return m;
      }));
      setEditingModality(null);
    });
  };

  const handleEnrollStudent = () => {
    if (!manageEnrollmentModalityId || !selectedStudentToEnroll) return;
    
    setModalities(prev => prev.map(m => {
      if (m.id === manageEnrollmentModalityId) {
        const currentIds = m.enrolledStudentIds || [];
        if (currentIds.includes(selectedStudentToEnroll)) return m;
        
        const updatedIds = [...currentIds, selectedStudentToEnroll];
        return {
          ...m,
          enrolledStudentIds: updatedIds,
          enrolled: updatedIds.length,
          status: updatedIds.length >= (m.capacity ?? 0) ? 'Turma Cheia' : 'Matrículas Abertas'
        };
      }
      return m;
    }));
    
    setSelectedStudentToEnroll('');
  };

  const handleRemoveStudentFromModality = (modId: string, studentId: string) => {
    setModalities(prev => prev.map(m => {
      if (m.id === modId) {
        const currentIds = m.enrolledStudentIds || [];
        const updatedIds = currentIds.filter(id => id !== studentId);
        return {
          ...m,
          enrolledStudentIds: updatedIds,
          enrolled: updatedIds.length,
          status: updatedIds.length >= (m.capacity ?? 0) ? 'Turma Cheia' : 'Matrículas Abertas'
        };
      }
      return m;
    }));
  };

  const increaseCapacity = (id: string) => {
    runWithPermission('edit:modalidades', () => {
      setModalities(prev => prev.map(m => {
        if (m.id === id) {
          const nextCapacity = (m.capacity ?? 0) + 5;
          const currentEnrolled = m.enrolledStudentIds?.length || m.enrolled || 0;
          return {
            ...m,
            capacity: nextCapacity,
            status: currentEnrolled >= nextCapacity ? 'Turma Cheia' : 'Matrículas Abertas'
          };
        }
        return m;
      }));
    });
  };

  const exportModalityToExcel = (mod: Modality, enrolledStudentsList: Student[]) => {
    const data = enrolledStudentsList.map(student => ({
      'Nome': student.name,
      'Matrícula': student.enrollmentId,
      'Turma': student.grade,
      'Status': student.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos Matriculados");
    XLSX.writeFile(workbook, `Matriculados_${mod.name.replace(/\s+/g, '_')}.xlsx`);
    logExport(user?.id || 'unknown', user?.role || 'unknown', 'modalities', 'excel', enrolledStudentsList.length);
  };

  const exportModalityToPDF = (mod: Modality, enrolledStudentsList: Student[]) => {
    const doc = new jsPDF();
    addReportBackground(doc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(11, 19, 38);
    doc.text(`EDUKYNE - Matriculados em ${mod.name}`, 14, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Professor/Treinador: ${mod.coach} | Categoria: ${mod.category}`, 14, 21);
    doc.text(`Unidade: ${mod.locality || 'Centro'} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 26);
    
    const tableColumn = ["Nome", "Matrícula", "Turma", "Status"];
    const tableRows = enrolledStudentsList.map(student => [
      student.name,
      student.enrollmentId ?? '',
      student.grade,
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
    
    doc.save(`Alunos_Matriculados_${mod.name.replace(/\s+/g, '_')}.pdf`);
    logExport(user?.id || 'unknown', user?.role || 'unknown', 'modalities', 'pdf', enrolledStudentsList.length);
  };

  return (
    <div className="space-y-6 text-[#dae2fd]">
      {/* Header and Add Action Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#3e484f]/25 pb-4">
        <div>
          <h3 className="text-xl font-bold text-[#8ed5ff]">{t('titulo')}</h3>
        </div>
        {normalizeRole(user?.role ?? '') !== 'Aluno' && (
          <button 
            onClick={() => setShowAddForm(prev => !prev)}
            className="px-4 py-2 bg-[#1e293b] hover:bg-[#334155] border border-[#3e484f] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4 text-[#38bdf8]" />
            <span>{t('criar')}</span>
          </button>
        )}
      </div>

      {/* FILTER PANEL - MATCHING DASHBOARD EXACTLY */}
      {normalizeRole(user?.role ?? '') !== 'Aluno' && (
        <section className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-5 shadow-lg space-y-4">
          <h4 className="text-xs font-bold text-[#bdc8d1] uppercase tracking-wider border-b border-[#3e484f]/25 pb-2">
            {t('filtroTitulo')}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            {/* Contrato */}
            <div className="flex flex-col gap-1.5 font-sans">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-[#bdc8d1]/90">{ta('contrato')}</label>
                {!isUserAdmin && assignedContracts.length === 1 && (
                  <span title={t('vinculoPermanenteUsuario')}>
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
                <option value="Todos">{ta('todosContratos')}</option>
                {availableContracts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div className="flex flex-col gap-1.5 font-sans">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-[#bdc8d1]/90">{ta('estado')}</label>
                {!isUserAdmin && assignedStates.length === 1 && (
                  <span title={t('vinculoPermanenteUsuario')}>
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
                <option value="Todos">{ta('todosEstados')}</option>
                {availableStates.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Região */}
            <div className="flex flex-col gap-1.5 font-sans">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-[#bdc8d1]/90">{ta('regiao')}</label>
                {!isUserAdmin && assignedRegions.length === 1 && (
                  <span title={t('vinculoPermanenteUsuario')}>
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
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Todos">{ta('todasRegioes')}</option>
                {availableRegions.map(reg => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
            </div>

            {/* Localidade */}
            <div className="flex flex-col gap-1.5 font-sans">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-[#bdc8d1]/90">{ta('localidade')}</label>
                {!isUserAdmin && assignedLocalities.length === 1 && (
                  <span title={t('vinculoPermanenteUsuario')}>
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
                <option value="Todos">{ta('todasLocalidades')}</option>
                {availableLocalities.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* Quick Creator Modal block inline */}
      {showAddForm && (
        <form onSubmit={handleAddModality} className="bg-[#171f33] border border-[#38bdf8]/40 rounded-xl p-5 max-w-lg space-y-4 shadow-xl">
          <h4 className="text-xs font-bold text-[#8ed5ff] uppercase tracking-wider border-b border-[#3e484f]/25 pb-2">
            {t('novaModalidade')}
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">
                {t('nomeModalidade')} <span className="text-red-400 font-bold">*</span>:
              </label>
              <input 
                type="text" 
                required
                placeholder={t('nomeExemplo')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('categoria')}</label>
                <select 
                  value={category}
                    onChange={(e) => setCategory(e.target.value as 'Esporte' | 'Cultura' | 'Tecnologia')}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                >
                  <option value="Esporte">{t('categoriaEsporte')}</option>
                  <option value="Cultura">{t('categoriaCultura')}</option>
                  <option value="Tecnologia">{t('categoriaTecnologia')}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('limiteVagas')}</label>
                <input 
                  type="number" 
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="text-xs font-semibold text-[#bdc8d1] block">{ta('contrato')}</label>
                  {isContractLocked && (
                    <span title={t('vinculoPermanenteProfissional')}>
                      <Lock className="w-3 h-3 text-amber-400" />
                    </span>
                  )}
                </div>
                <select 
                  value={addContrato}
                  disabled={isContractLocked}
                  onChange={(e) => {
                    setAddContrato(e.target.value);
                    setAddEstado('');
                    setAddRegiao('');
                    setAddLocality('');
                    setAddProfessorId('');
                  }}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">{ta('selecione')}</option>
                  {availableContracts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="text-xs font-semibold text-[#bdc8d1] block">{ta('estado')}</label>
                  {isStateLocked && (
                    <span title={t('vinculoPermanenteProfissional')}>
                      <Lock className="w-3 h-3 text-amber-400" />
                    </span>
                  )}
                </div>
                <select 
                  value={addEstado}
                  disabled={isStateLocked || !addContrato}
                  onChange={(e) => {
                    setAddEstado(e.target.value);
                    setAddRegiao('');
                    setAddLocality('');
                    setAddProfessorId('');
                  }}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">{ta('selecione')}</option>
                  {addAvailableStates.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="text-xs font-semibold text-[#bdc8d1] block">{ta('regiao')}</label>
                  {isRegionLocked && (
                    <span title={t('vinculoPermanenteProfissional')}>
                      <Lock className="w-3 h-3 text-amber-400" />
                    </span>
                  )}
                </div>
                <select 
                  value={addRegiao}
                  disabled={isRegionLocked || !addEstado}
                  onChange={(e) => {
                    setAddRegiao(e.target.value);
                    setAddLocality('');
                    setAddProfessorId('');
                  }}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">{ta('selecione')}</option>
                  {addAvailableRegions.map(reg => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="text-xs font-semibold text-[#bdc8d1] block">{ta('localidade')}</label>
                  {isLocalityLocked && (
                    <span title={t('vinculoPermanenteProfissional')}>
                      <Lock className="w-3 h-3 text-amber-400" />
                    </span>
                  )}
                </div>
                <select 
                  value={addLocality}
                  disabled={isLocalityLocked || !addRegiao}
                  onChange={(e) => {
                    setAddLocality(e.target.value);
                    setAddProfessorId('');
                  }}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">{ta('selecione')}</option>
                  {addAvailableLocalities.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">
                {t('profissionalLocalidade')} <span className="text-red-400 font-bold">*</span>:
              </label>
              <select 
                value={addProfessorId}
                disabled={!addLocality}
                onChange={(e) => setAddProfessorId(e.target.value)}
                className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none disabled:opacity-40"
              >
                <option value="">{ta('selecione')}</option>
                {addFilteredProfessionals.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - {p.specialty}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 text-xs pt-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-[#bdc8d1]">{ta('cancelar')}</button>
            <button type="submit" className="px-4 py-1.5 bg-[#38bdf8] text-[#001e2c] font-bold rounded-lg hover:bg-[#38bdf8]/90">{t('criar')}</button>
          </div>
        </form>
      )}

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modalities.filter(mod => {
          const normalizedUserRole = normalizeRole(user?.role ?? '');
          if (normalizedUserRole === 'Aluno') {
            return loggedInStudentObj && (mod.enrolledStudentIds || []).includes(loggedInStudentObj.id);
          }

          // Se for professor logado, mostrar apenas suas próprias modalidades
          if (normalizedUserRole === 'Professor') {
            const pName = user?.name || '';
            const isProfessorLinked = mod.professorId === user?.id || 
              (mod.coach && mod.coach.toLowerCase().includes(pName.toLowerCase()));
            if (!isProfessorLinked) return false;
          } else {
            // Se não for professor nem aluno (Ex: GESTOR/ADMINISTRADOR), verificar se o profissional existe se estiver atribuído
            if (mod.professorId) {
              const hasProfessor = professionals.some(p => p.id === mod.professorId);
              if (!hasProfessor) return false;
            }
          }

          let matchesLocality = true;
          if (contract) {
            const modLocality = mod.locality || (mod.id === 'm1' ? 'Centro' :
                                 mod.id === 'm2' ? 'Zona Sul' :
                                 mod.id === 'm3' ? 'Zona Norte' :
                                 mod.id === 'm4' ? 'Zona Leste' : 'Centro');
            
            const modContrato = mod.contrato || ((mod.id === 'm1' || mod.id === 'm4') ? 'Contrato Esportivo Municipal' :
                                mod.id === 'm2' ? 'Contrato Fomento Educação Integrada' : 'Contrato Atendimento Especializado');
            const modEstado = mod.estado || ((mod.id === 'm1' || mod.id === 'm4') ? 'São Paulo' :
                              mod.id === 'm2' ? 'Rio de Janeiro' : 'Minas Gerais');
            const modRegiao = mod.regiao || ((mod.id === 'm1' || mod.id === 'm4') ? 'Zona Leste' :
                              mod.id === 'm2' ? 'Região Metropolitana' : 'Sul de Minas');

            if (contract !== 'Todos') {
              const targetContractObj = availableContracts.find(c => c.id === contract);
              if (targetContractObj && modContrato !== targetContractObj.name) {
                matchesLocality = false;
              }
            }
            if (stateFilter && stateFilter !== 'Todos') {
              if (modEstado !== stateFilter) {
                matchesLocality = false;
              }
            }
            if (cityFilter && cityFilter !== 'Todos' && cityFilter !== 'Todas') {
              if (modRegiao !== cityFilter) {
                matchesLocality = false;
              }
            }
            if (localityFilter && localityFilter !== 'Todos') {
              if (modLocality.toLowerCase().trim() !== localityFilter.toLowerCase().trim()) {
                matchesLocality = false;
              }
            }
          }

          return matchesLocality;
        }).map((mod) => {
          if (user?.role === 'Aluno') {
            return (
              <div key={mod.id} className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-5 shadow-lg flex flex-col justify-center items-center hover:border-[#38bdf8]/40 transition-all text-center min-h-[140px]">
                <div className="p-3 bg-[#38bdf8]/10 rounded-full border border-[#38bdf8]/20 mb-3 text-[#38bdf8]">
                  <Award className="w-5 h-5 animate-pulse" />
                </div>
                <h4 className="text-lg font-black text-[#dae2fd]">{mod.name}</h4>
                <p className="text-[10px] text-[#bdc8d1]/60 uppercase tracking-wider mt-1 font-mono">{t('modalidadeVinculada')}</p>
              </div>
            );
          }

          const actualEnrolled = mod.enrolledStudentIds?.length || mod.enrolled || 0;
          const percentage = ((actualEnrolled / (mod.capacity ?? 0)) * 100);
          const isFull = actualEnrolled >= (mod.capacity ?? 0);
          const modLocality = mod.locality || (mod.id === 'm1' ? 'Centro' :
                              mod.id === 'm2' ? 'Zona Sul' :
                              mod.id === 'm3' ? 'Zona Norte' : 'Centro');

          return (
            <div key={mod.id} className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-5 shadow-lg flex flex-col justify-between hover:border-[#38bdf8]/40 transition-all">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39485a] text-[#8ed5ff] px-2.5 py-0.5 rounded">
                    {mod.category}
                  </span>
                  <span className={`text-[10px] font-bold ${isFull ? 'text-[#ffb4ab]' : 'text-[#38bdf8]'}`}>
                    {mod.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-[#dae2fd]">{mod.name}</h4>
                  <p className="text-[11px] text-[#bdc8d1]/80 mt-1">{t('treinador')} <span className="text-[#dae2fd] font-medium">{mod.coach}</span></p>
                  
                  {/* Geo-location tags on card */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="text-[9px] font-semibold bg-[#1a2b4b] text-[#38bdf8] px-2 py-0.5 rounded-md border border-[#38bdf8]/20" title={t('localidadeTag')}>
                      📍 {modLocality}
                    </span>
                    {mod.contrato && (
                      <span className="text-[9px] font-semibold bg-indigo-950/30 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-400/20" title={t('contratoTag')}>
                        📄 {mod.contrato.length > 25 ? mod.contrato.substring(0, 25) + '...' : mod.contrato}
                      </span>
                    )}
                  </div>
                </div>

                {/* Capacity slider bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#bdc8d1]">{t('vagasPreenchidas')}</span>
                    <span className="text-[#dae2fd] font-semibold">{actualEnrolled} / {mod.capacity}</span>
                  </div>
                  <div className="w-full bg-[#0b1326] h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${isFull ? 'bg-[#ffb4ab]' : 'bg-[#38bdf8]'}`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* CRUD + Student Enrollment Actions Row */}
              <div className="flex flex-col gap-2 mt-6 pt-3 border-t border-[#3e484f]/25">
                <div className="flex gap-2">
                  <button 
                    onClick={() => increaseCapacity(mod.id)}
                    className="w-1/2 py-1.5 bg-[#131b2e] hover:bg-[#1a2b4b] border border-[#3e484f]/60 text-[10px] text-[#bdc8d1] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <span>{t('expandirVagas')}</span>
                  </button>
                  <button 
                    onClick={() => setManageEnrollmentModalityId(mod.id)}
                    className="w-1/2 py-1.5 bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[10px] text-[#8ed5ff] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>{t('matricularAlunos')}</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => startEditModality(mod)}
                    className="w-1/2 py-1 bg-[#1e293b] hover:bg-[#334155] border border-[#3e484f]/60 text-[10px] text-[#bdc8d1] font-medium rounded-md transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3 h-3 text-[#38bdf8]" />
                    <span>{t('editar')}</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteModality(mod.id)}
                    className="w-1/2 py-1 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 hover:border-red-500/40 text-[10px] text-red-400 font-medium rounded-md transition-colors flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                    <span>{t('excluir')}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CRUD Edit Modality Overlay */}
      {editingModality && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleUpdateModality} className="bg-[#171f33] border border-[#38bdf8]/40 rounded-xl p-4 sm:p-6 w-full max-w-lg space-y-4 shadow-2xl animate-fade-in relative text-left">
            <button 
              type="button" 
              onClick={() => setEditingModality(null)}
              className="absolute top-4 right-4 text-[#bdc8d1] hover:text-[#dae2fd]"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-[#8ed5ff] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#3e484f]/25 pb-3">
              <Edit className="w-4 h-4 text-[#38bdf8]" />
              <span>{t('editarModalidade')}</span>
            </h4>
            
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('nomeModalidade')}:</label>
                <input 
                  type="text" 
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f]/80 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('categoria')}</label>
                  <select 
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as 'Esporte' | 'Cultura' | 'Tecnologia')}
                    className="w-full bg-[#0b1326] border border-[#3e484f]/80 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  >
                    <option value="Esporte">{t('categoriaEsporte')}</option>
                    <option value="Cultura">{t('categoriaCultura')}</option>
                    <option value="Tecnologia">{t('categoriaTecnologia')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('limiteVagas')}</label>
                  <input 
                    type="number" 
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(Number(e.target.value))}
                    className="w-full bg-[#0b1326] border border-[#3e484f]/80 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs font-semibold text-[#bdc8d1] block">{ta('contrato')}</label>
                    <span title={t('bloqueadoEdicao')}>
                      <Lock className="w-3 h-3 text-amber-400" />
                    </span>
                  </div>
                  <select 
                    value={editContrato}
                    disabled={true}
                    className="w-full bg-[#0b1326] border border-[#3e484f]/80 rounded-lg px-3 py-2 text-xs text-[#dae2fd]/60 outline-none cursor-not-allowed opacity-70"
                  >
                    <option value="">{ta('selecione')}</option>
                    {availableContracts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs font-semibold text-[#bdc8d1] block">{ta('estado')}</label>
                    <span title={t('bloqueadoEdicao')}>
                      <Lock className="w-3 h-3 text-amber-400" />
                    </span>
                  </div>
                  <select 
                    value={editEstado}
                    disabled={true}
                    className="w-full bg-[#0b1326] border border-[#3e484f]/80 rounded-lg px-3 py-2 text-xs text-[#dae2fd]/60 outline-none cursor-not-allowed opacity-70"
                  >
                    <option value="">{ta('selecione')}</option>
                    {editAvailableStates.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs font-semibold text-[#bdc8d1] block">{ta('regiao')}</label>
                    <span title={t('bloqueadoEdicao')}>
                      <Lock className="w-3 h-3 text-amber-400" />
                    </span>
                  </div>
                  <select 
                    value={editRegiao}
                    disabled={true}
                    className="w-full bg-[#0b1326] border border-[#3e484f]/80 rounded-lg px-3 py-2 text-xs text-[#dae2fd]/60 outline-none cursor-not-allowed opacity-70"
                  >
                    <option value="">{ta('selecione')}</option>
                    {editAvailableRegions.map(reg => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs font-semibold text-[#bdc8d1] block">{ta('localidade')}</label>
                    <span title={t('bloqueadoEdicao')}>
                      <Lock className="w-3 h-3 text-amber-400" />
                    </span>
                  </div>
                  <select 
                    value={editLocality}
                    disabled={true}
                    className="w-full bg-[#0b1326] border border-[#3e484f]/80 rounded-lg px-3 py-2 text-xs text-[#dae2fd]/60 outline-none cursor-not-allowed opacity-70"
                  >
                    <option value="">{ta('selecione')}</option>
                    {editAvailableLocalities.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('profissionalLocalidade')}:</label>
                <select 
                  value={editProfessorId}
                  onChange={(e) => setEditProfessorId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f]/80 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                >
                  <option value="">{ta('selecione')}</option>
                  {editFilteredProfessionals.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {p.specialty}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2">
              <button 
                type="button" 
                onClick={() => setEditingModality(null)} 
                className="px-4 py-2 border border-[#3e484f]/60 hover:bg-[#131b2e] rounded-lg text-[#bdc8d1]"
              >
                {ta('cancelar')}
              </button>
              <button 
                type="submit" 
                className="px-5 py-2 bg-[#38bdf8] text-[#001e2c] font-bold rounded-lg flex items-center gap-1.5 hover:bg-[#38bdf8]/90"
              >
                <Save className="w-4 h-4" />
                <span>{ta('salvarAlteracoes')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Enroll Students Overlay */}
      {manageEnrollmentModalityId && (() => {
        const targetMod = modalities.find(m => m.id === manageEnrollmentModalityId);
        if (!targetMod) return null;
        
        const modLocality = targetMod.locality || (targetMod.id === 'm1' ? 'Centro' :
                            targetMod.id === 'm2' ? 'Zona Sul' :
                            targetMod.id === 'm3' ? 'Zona Norte' :
                            targetMod.id === 'm4' ? 'Zona Leste' : 'Centro');

        const modContrato = targetMod.contrato || ((targetMod.id === 'm1' || targetMod.id === 'm4') ? 'Contrato Esportivo Municipal' :
                            targetMod.id === 'm2' ? 'Contrato Fomento Educação Integrada' : 'Contrato Atendimento Especializado');

        const modEstado = targetMod.estado || ((targetMod.id === 'm1' || targetMod.id === 'm4') ? 'São Paulo' :
                          targetMod.id === 'm2' ? 'Rio de Janeiro' : 'Minas Gerais');

        const modRegiao = targetMod.regiao || ((targetMod.id === 'm1' || targetMod.id === 'm4') ? 'Zona Leste' :
                          targetMod.id === 'm2' ? 'Região Metropolitana' : 'Sul de Minas');
        
        // Allowed active students in the modality's Localidade, which are NOT already enrolled
        const currentEnrolledStudentIds = targetMod.enrolledStudentIds || [];
        const allowedStudentsInLocality = students.filter(s => {
          const sLoc = (s.locality || '').toLowerCase().trim();
          const mLoc = modLocality.toLowerCase().trim();

          const sReg = (s.regiao || '').toLowerCase().trim();
          const mReg = modRegiao.toLowerCase().trim();

          const sEst = (s.estado || '').toLowerCase().trim();
          const mEst = modEstado.toLowerCase().trim();

          const sCont = (s.contrato || '').toLowerCase().trim();
          const mCont = modContrato.toLowerCase().trim();

          // Strict checking: matches contract, state, region, and locality
          const belongsToAllLevels = sLoc && sLoc === mLoc &&
                                     sReg && sReg === mReg &&
                                     sEst && sEst === mEst &&
                                     sCont && sCont === mCont;

          const notYetEnrolled = !currentEnrolledStudentIds.includes(s.id);
          const isActive = s.status === 'Ativo';
          
          return belongsToAllLevels && notYetEnrolled && isActive;
        });

        // Resolve students that are enrolled
        const enrolledStudentsList = students.filter(s => currentEnrolledStudentIds.includes(s.id));

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#171f33] border border-[#38bdf8]/40 rounded-xl p-4 sm:p-6 w-full max-w-lg space-y-4 shadow-2xl animate-fade-in relative text-left">
              <button 
                type="button" 
                onClick={() => {
                  setManageEnrollmentModalityId(null);
                  setSelectedStudentToEnroll('');
                }}
                className="absolute top-4 right-4 text-[#bdc8d1] hover:text-[#dae2fd]"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div>
                <h4 className="text-sm font-bold text-[#8ed5ff] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#3e484f]/25 pb-3">
                  <UserPlus className="w-4.5 h-4.5 text-[#38bdf8]" />
                  <span>{t('matricularAlunosModulo', { modulo: targetMod.name })}</span>
                </h4>
                <p className="text-[11px] text-[#bdc8d1]/70 mt-2 line-clamp-2">
                  {t('localidadeModalidade')} <span className="font-semibold text-[#8ed5ff]">{modLocality}</span>{t('apenasAlunosLocalidade')}
                </p>
              </div>

              {/* Add form */}
              <div className="bg-[#0b1326] p-3 rounded-lg border border-[#3e484f]/40 space-y-2">
                <label className="text-xs font-semibold text-[#bdc8d1] block">{t('selecioneAlunoMatricula')}</label>
                <div className="flex gap-2">
                  <select
                    value={selectedStudentToEnroll}
                    onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                    className="w-full bg-[#131b2e] border border-[#3e484f]/60 rounded-lg px-3 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  >
                    <option value="">{t('selecioneAluno')}</option>
                    {allowedStudentsInLocality.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                    ))}
                  </select>
                  <button
                    onClick={handleEnrollStudent}
                    disabled={!selectedStudentToEnroll || (targetMod.enrolled ?? 0) >= (targetMod.capacity ?? 0)}
                    className="px-4 py-1.5 bg-[#38bdf8] text-[#001e2c] font-bold text-xs rounded-lg hover:bg-[#38bdf8]/90 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
                  >
                    {t('matricular')}
                  </button>
                </div>
                {(targetMod.enrolled ?? 0) >= (targetMod.capacity ?? 0) && (
                  <p className="text-[10px] text-[#ffb4ab] font-mono mt-1">{t('statusLimite')}</p>
                )}
              </div>

              {/* Enrolled list */}
              <div className="space-y-2 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#3e484f]/25 pb-2">
                  <h5 className="text-xs font-bold text-[#dae2fd] flex items-center gap-2">
                    <span>{t('estudantesMatriculados')}</span>
                    <span className="text-[#38bdf8] font-mono text-[10px] bg-[#38bdf8]/15 px-2 py-0.5 rounded-full">{t('alunosContador', { total: enrolledStudentsList.length })}</span>
                  </h5>
                  
                  {enrolledStudentsList.length > 0 && (
                    <div className="flex gap-1.5 justify-end">
                      <button 
                        type="button"
                        onClick={() => exportModalityToExcel(targetMod, enrolledStudentsList)}
                        className="px-2 py-1 bg-[#10b981] hover:bg-[#059669] text-[10px] text-white font-bold rounded flex items-center gap-1 transition-all cursor-pointer"
                        title={t('exportarAlunosExcel')}
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        <span>{ta('excel')}</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => exportModalityToPDF(targetMod, enrolledStudentsList)}
                        className="px-2 py-1 bg-[#f43f5e] hover:bg-[#e11d48] text-[10px] text-white font-bold rounded flex items-center gap-1 transition-all cursor-pointer"
                        title={t('exportarAlunosPdf')}
                      >
                        <FileText className="w-3 h-3" />
                        <span>{ta('pdf')}</span>
                      </button>
                    </div>
                  )}
                </div>
                {enrolledStudentsList.length === 0 ? (
                  <p className="text-xs text-[#bdc8d1]/50 italic p-3 text-center bg-[#0b1326] rounded-lg border border-[#3e484f]/20">{t('nenhumAlunoMatriculado')}</p>
                ) : (
                  <div className="max-h-52 overflow-y-auto border border-[#3e484f]/25 rounded-lg divide-y divide-[#3e484f]/25 bg-[#0b1326]">
                    {enrolledStudentsList.map(s => (
                      <div key={s.id} className="p-3 flex justify-between items-center hover:bg-[#131b2e]/40">
                        <div>
                          <p className="text-xs font-medium text-[#dae2fd]">{s.name}</p>
                          <p className="text-[10px] text-[#bdc8d1]/60">{s.grade} • {s.email}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveStudentFromModality(targetMod.id, s.id)}
                          className="p-2 hover:bg-red-500/15 text-red-400 rounded transition-colors"
                          title={t('desvincularAluno')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setManageEnrollmentModalityId(null);
                    setSelectedStudentToEnroll('');
                  }}
                  className="px-5 py-2 bg-[#1e293b] text-[#bdc8d1] border border-[#3e484f]/60 hover:bg-[#334155] text-xs font-bold rounded-lg cursor-pointer"
                >
                  {t('fechar')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Custom Confirmation Dialog for Deleting Modality */}
      {modalityToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171f33] border border-red-500/40 rounded-xl p-4 sm:p-6 w-full max-w-sm space-y-4 shadow-2xl animate-fade-in relative text-left">
            <button 
              type="button" 
              onClick={() => setModalityToDelete(null)}
              className="absolute top-4 right-4 text-[#bdc8d1] hover:text-[#dae2fd]"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-red-100 uppercase tracking-wider flex items-center gap-1.5 border-b border-red-500/10 pb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>{ta('confirmarExclusao')}</span>
            </h4>
            <div className="space-y-3">
              <p className="text-xs text-[#bdc8d1]">
                {t('confirmarExclusaoTexto', { nome: modalityToDelete.name })}
              </p>
              <p className="text-[10px] text-red-400/80 bg-red-950/10 border border-red-500/10 p-2.5 rounded-lg flex gap-1.5 items-start">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{t('avisoIrreversivel')}</span>
              </p>
            </div>
            <div className="flex justify-end gap-2 text-xs pt-2">
              <button 
                type="button" 
                onClick={() => setModalityToDelete(null)} 
                className="px-3.5 py-2 bg-[#131b2e] hover:bg-[#1a2b4b] border border-[#3e484f]/60 text-[#bdc8d1] font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {ta('cancelar')}
              </button>
              <button 
                type="button" 
                onClick={confirmDeleteModality} 
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                {ta('confirmarExclusao')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
