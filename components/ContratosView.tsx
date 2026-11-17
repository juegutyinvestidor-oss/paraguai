'use client';

import React, { useState } from 'react';
import { nextContractId, uuid } from '../lib/idGenerator';
import { 
  Plus, 
  Search, 
  MapPin, 
  FileText, 
  Edit, 
  Trash2, 
  X, 
  Map,
  Layers,
  ClipboardList
} from 'lucide-react';
import { type ContratoItem, type Student, type EstHierarchical, type RegHierarchical, type LocHierarchical } from '../types/edukyne';
import { type Permission } from '../lib/rbac';

interface ContratosViewProps {
  contratos: ContratoItem[];
  setContratos: React.Dispatch<React.SetStateAction<ContratoItem[]>>;
  runWithPermission: (permission: Permission, onApproved: () => void) => void;
  user?: {
    id?: string;
    role?: string;
    contrato?: string;
    name?: string;
    email?: string;
    estado?: string;
    regiao?: string;
    locality?: string;
    grade?: string;
  };
  students?: Student[];
}

export default function ContratosView({ contratos, setContratos, runWithPermission, user, students }: ContratosViewProps) {
  const [search, setSearch] = useState('');

  const assignedContracts = React.useMemo(() => {
    if (!user?.contrato) return [];
    return user.contrato.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const allGrades = React.useMemo(() => {
    const predefined = [
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
    const fromStudents = students ? Array.from(new Set(students.map(s => s.grade))).filter(Boolean) : [];
    // Combine predefined and any additional from students, keeping predefined ordering
    const combined = [...predefined];
    fromStudents.forEach(g => {
      if (!combined.includes(g)) {
        combined.push(g);
      }
    });
    return combined;
  }, [students]);
  
  // Custom states for Hierarchical Add Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEstadosHierarchical, setNewEstadosHierarchical] = useState<EstHierarchical[]>([
    {
      name: 'São Paulo',
      regioes: [
        {
          name: '',
          localidades: [
            { name: '', grades: [] }
          ]
        }
      ]
    }
  ]);

  // States to Edit contracts with hierarchical tracking
  const [contratoToEdit, setContratoToEdit] = useState<ContratoItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editEstadosHierarchical, setEditEstadosHierarchical] = useState<EstHierarchical[]>([]);

  // Delete contracts
  const [contratoToDelete, setContratoToDelete] = useState<ContratoItem | null>(null);

  const ESTADOS_LIST = [
    'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 
    'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 
    'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 
    'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 
    'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
  ];

  // Helper functions for mutability of nested arrays - NEW CONTRACTS
  const handleAddNewState = () => {
    if (newEstadosHierarchical.length < 2) {
      setNewEstadosHierarchical(prev => [
        ...prev,
        {
          name: 'São Paulo',
          regioes: [{ name: '', localidades: [{ name: '', grades: [] }] }]
        }
      ]);
    }
  };

  const handleRemoveNewState = (sIdx: number) => {
    if (newEstadosHierarchical.length > 1) {
      setNewEstadosHierarchical(prev => prev.filter((_, idx) => idx !== sIdx));
    }
  };

  const handleUpdateNewStateName = (sIdx: number, val: string) => {
    setNewEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      copy[sIdx].name = val;
      return copy;
    });
  };

  const handleAddNewRegion = (sIdx: number) => {
    setNewEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      if (copy[sIdx].regioes.length < 5) {
        copy[sIdx].regioes.push({
          name: '',
          localidades: [{ name: '', grades: [] }]
        });
      }
      return copy;
    });
  };

  const handleRemoveNewRegion = (sIdx: number, rIdx: number) => {
    setNewEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      if (copy[sIdx].regioes.length > 1) {
        copy[sIdx].regioes = copy[sIdx].regioes.filter((_, idx) => idx !== rIdx);
      }
      return copy;
    });
  };

  const handleUpdateNewRegionName = (sIdx: number, rIdx: number, val: string) => {
    setNewEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      copy[sIdx].regioes[rIdx].name = val;
      return copy;
    });
  };

  const handleAddNewLocality = (sIdx: number, rIdx: number) => {
    setNewEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      if (copy[sIdx].regioes[rIdx].localidades.length < 10) {
        copy[sIdx].regioes[rIdx].localidades.push({
          name: '',
          grades: []
        });
      }
      return copy;
    });
  };

  const handleRemoveNewLocality = (sIdx: number, rIdx: number, lIdx: number) => {
    setNewEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      if (copy[sIdx].regioes[rIdx].localidades.length > 1) {
        copy[sIdx].regioes[rIdx].localidades = copy[sIdx].regioes[rIdx].localidades.filter((_, idx) => idx !== lIdx);
      }
      return copy;
    });
  };

  const handleUpdateNewLocalityName = (sIdx: number, rIdx: number, lIdx: number, val: string) => {
    setNewEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      copy[sIdx].regioes[rIdx].localidades[lIdx].name = val;
      return copy;
    });
  };

  const handleToggleNewLocalityGrade = (sIdx: number, rIdx: number, lIdx: number, grade: string) => {
    setNewEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      const activeGrades = copy[sIdx].regioes[rIdx].localidades[lIdx].grades || [];
      if (activeGrades.includes(grade)) {
        copy[sIdx].regioes[rIdx].localidades[lIdx].grades = activeGrades.filter(g => g !== grade);
      } else {
        copy[sIdx].regioes[rIdx].localidades[lIdx].grades = [...activeGrades, grade];
      }
      return copy;
    });
  };


  // Helper functions for mutability of nested arrays - EDIT CONTRACTS
  const handleAddEditState = () => {
    if (editEstadosHierarchical.length < 2) {
      setEditEstadosHierarchical(prev => [
        ...prev,
        {
          name: 'São Paulo',
          regioes: [{ name: '', localidades: [{ name: '', grades: [] }] }]
        }
      ]);
    }
  };

  const handleRemoveEditState = (sIdx: number) => {
    if (editEstadosHierarchical.length > 1) {
      setEditEstadosHierarchical(prev => prev.filter((_, idx) => idx !== sIdx));
    }
  };

  const handleUpdateEditStateName = (sIdx: number, val: string) => {
    setEditEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      copy[sIdx].name = val;
      return copy;
    });
  };

  const handleAddEditRegion = (sIdx: number) => {
    setEditEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      if (copy[sIdx].regioes.length < 5) {
        copy[sIdx].regioes.push({
          name: '',
          localidades: [{ name: '', grades: [] }]
        });
      }
      return copy;
    });
  };

  const handleRemoveEditRegion = (sIdx: number, rIdx: number) => {
    setEditEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      if (copy[sIdx].regioes.length > 1) {
        copy[sIdx].regioes = copy[sIdx].regioes.filter((_, idx) => idx !== rIdx);
      }
      return copy;
    });
  };

  const handleUpdateEditRegionName = (sIdx: number, rIdx: number, val: string) => {
    setEditEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      copy[sIdx].regioes[rIdx].name = val;
      return copy;
    });
  };

  const handleAddEditLocality = (sIdx: number, rIdx: number) => {
    setEditEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      if (copy[sIdx].regioes[rIdx].localidades.length < 10) {
        copy[sIdx].regioes[rIdx].localidades.push({
          name: '',
          grades: []
        });
      }
      return copy;
    });
  };

  const handleRemoveEditLocality = (sIdx: number, rIdx: number, lIdx: number) => {
    setEditEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      if (copy[sIdx].regioes[rIdx].localidades.length > 1) {
        copy[sIdx].regioes[rIdx].localidades = copy[sIdx].regioes[rIdx].localidades.filter((_, idx) => idx !== lIdx);
      }
      return copy;
    });
  };

  const handleUpdateEditLocalityName = (sIdx: number, rIdx: number, lIdx: number, val: string) => {
    setEditEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      copy[sIdx].regioes[rIdx].localidades[lIdx].name = val;
      return copy;
    });
  };

  const handleToggleEditLocalityGrade = (sIdx: number, rIdx: number, lIdx: number, grade: string) => {
    setEditEstadosHierarchical(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as EstHierarchical[];
      const activeGrades = copy[sIdx].regioes[rIdx].localidades[lIdx].grades || [];
      if (activeGrades.includes(grade)) {
        copy[sIdx].regioes[rIdx].localidades[lIdx].grades = activeGrades.filter(g => g !== grade);
      } else {
        copy[sIdx].regioes[rIdx].localidades[lIdx].grades = [...activeGrades, grade];
      }
      return copy;
    });
  };

  // Open Edit Dialog
  const handleOpenEdit = (item: ContratoItem) => {
    runWithPermission('edit:contrato', () => {
      setContratoToEdit(item);
      setEditName(item.name);

      let parsedEsts: EstHierarchical[] = [];

      // If already has hierarchical structure, deep clone it
      if (item.structure && Array.isArray(item.structure.estados)) {
        parsedEsts = JSON.parse(JSON.stringify(item.structure.estados));
      } else {
        // Build rich fallback structures from flat strings
        const pEst = item.estado ? item.estado.split(',').map(s => s.trim()).filter(Boolean) : ['São Paulo'];
        const pReg = item.regiao ? item.regiao.split(',').map(s => s.trim()).filter(Boolean) : [''];
        const pLoc = item.localidade ? item.localidade.split(',').map(s => s.trim()).filter(Boolean) : [''];
        const pGrade = item.grade ? item.grade.split(',').map(s => s.trim()).filter(Boolean) : [];

        parsedEsts = pEst.map(est => ({
          name: est,
          regioes: pReg.map(reg => ({
            name: reg,
            localidades: pLoc.map(loc => ({
              name: loc,
              grades: [...pGrade]
            }))
          }))
        }));
      }

      setEditEstadosHierarchical(parsedEsts);
    });
  };

  // Save Contract changes
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanStates = editEstadosHierarchical.map(es => {
      const cleanRegs = es.regioes.map(r => {
        const cleanLocs = r.localidades.map(l => ({
          name: l.name.trim(),
          grades: l.grades || []
        })).filter(l => l.name !== '');

        return {
          name: r.name.trim(),
          localidades: cleanLocs
        };
      }).filter(r => r.name !== '');

      return {
        name: es.name.trim(),
        regioes: cleanRegs
      };
    }).filter(es => es.name !== '');

    if (!editName || cleanStates.length === 0) {
      alert('Por favor, preencha todos os campos obrigatórios e adicione ao menos um Estado.');
      return;
    }

    // Flat compatibility strings
    const estadoStr = cleanStates.map(s => s.name).join(', ');
    const regiaoStr = Array.from(new Set(cleanStates.flatMap(s => s.regioes.map(r => r.name)))).join(', ');
    const localidadeStr = Array.from(new Set(cleanStates.flatMap(s => s.regioes.flatMap(r => r.localidades.map(l => l.name))))).join(', ');
    const gradeStr = Array.from(new Set(cleanStates.flatMap(s => s.regioes.flatMap(r => r.localidades.flatMap(l => l.grades))))).join(', ');

    setContratos(prev => prev.map(c => {
      if (c.id === contratoToEdit?.id) {
        return {
          ...c,
          name: editName,
          estado: estadoStr,
          regiao: regiaoStr,
          localidade: localidadeStr,
          grade: gradeStr,
          structure: { estados: cleanStates }
        };
      }
      return c;
    }));

    setContratoToEdit(null);
  };

  // Add brand new contract record
  const handleAddContrato = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanStates = newEstadosHierarchical.map(es => {
      const cleanRegs = es.regioes.map(r => {
        const cleanLocs = r.localidades.map(l => ({
          name: l.name.trim(),
          grades: l.grades || []
        })).filter(l => l.name !== '');

        return {
          name: r.name.trim(),
          localidades: cleanLocs
        };
      }).filter(r => r.name !== '');

      return {
        name: es.name.trim(),
        regioes: cleanRegs
      };
    }).filter(es => es.name !== '');

    if (!newName || cleanStates.length === 0) {
      alert('Por favor, preencha o nome do Contrato e configure a estrutura geográfica.');
      return;
    }

    const generatedId = await nextContractId();
    const nextId = generatedId || ('Contrato_' + uuid().slice(0, 8));

    // Flat compatibility fields
    const estadoStr = cleanStates.map(s => s.name).join(', ');
    const regiaoStr = Array.from(new Set(cleanStates.flatMap(s => s.regioes.map(r => r.name)))).join(', ');
    const localidadeStr = Array.from(new Set(cleanStates.flatMap(s => s.regioes.flatMap(r => r.localidades.map(l => l.name))))).join(', ');
    const gradeStr = Array.from(new Set(cleanStates.flatMap(s => s.regioes.flatMap(r => r.localidades.flatMap(l => l.grades))))).join(', ');

    const newContrato: ContratoItem = {
      id: nextId,
      name: newName,
      estado: estadoStr,
      regiao: regiaoStr,
      localidade: localidadeStr,
      grade: gradeStr,
      structure: { estados: cleanStates }
    };

    setContratos(prev => [newContrato, ...prev]);

    // Reset fields
    setNewName('');
    setNewEstadosHierarchical([
      {
        name: 'São Paulo',
        regioes: [{ name: '', localidades: [{ name: '', grades: [] }] }]
      }
    ]);
    setShowAddForm(false);
  };

  const handleDeleteContrato = (id: string) => {
    setContratos(prev => prev.filter(c => c.id !== id));
    setContratoToDelete(null);
  };

  const filteredContratos = contratos.filter(c => {
    const isUserAdmin = user?.role === 'Administrador' || !user;
    if (!isUserAdmin && assignedContracts.length > 0) {
      const match = assignedContracts.includes(c.name.toLowerCase()) || assignedContracts.includes(c.id.toLowerCase());
      if (!match) return false;
    }
    const searchLower = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(searchLower) ||
      c.estado.toLowerCase().includes(searchLower) ||
      c.regiao.toLowerCase().includes(searchLower) ||
      c.localidade.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 text-[#dae2fd] font-sans">
      {/* Header view */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-[#8ed5ff]">Gestão de Contratos</h3>
        </div>

        <button
          onClick={() => runWithPermission('create:contrato', () => setShowAddForm(true))}
          className="flex items-center gap-2 px-4 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#001e2c] font-bold text-xs rounded-lg transition-all shadow-md shadow-[#38bdf8]/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Contrato</span>
        </button>
      </div>

      {/* Search and Filters panel */}
      <div className="relative">
        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-[#87929a]" />
        <input 
          type="text"
          placeholder="Pesquisar por contrato, estado, região ou localidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#171f33] border border-[#3e484f]/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#dae2fd] placeholder-[#bdc8d1]/50 outline-none focus:border-[#38bdf8] transition-all"
        />
      </div>

      {/* Contracts Grid/List */}
      {filteredContratos.length === 0 ? (
        <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-[#3e484f] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#bdc8d1]">Nenhum contrato cadastrado ou correspondente.</p>
          <p className="text-xs text-[#bdc8d1]/60 mt-1">Clique em &quot;Novo Contrato&quot; para registrar a primeira estrutura.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContratos.map((item) => (
            <div 
              key={item.id} 
              className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-5 hover:border-[#38bdf8]/40 transition-all flex flex-col justify-between group shadow-md"
            >
              <div className="space-y-4">
                {/* Header with Title and icons */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#38bdf8]/10 flex items-center justify-center border border-[#38bdf8]/20 text-[#38bdf8]">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#dae2fd] group-hover:text-[#38bdf8] transition-colors">{item.name}</h4>
                      <p className="text-[10px] text-[#bdc8d1]/50">ID: {item.id}</p>
                    </div>
                  </div>
                </div>

                {/* Pipeline visual hierarchy representation */}
                <div className="space-y-3 pt-2 border-t border-[#3e484f]/15">
                  <span className="text-[10px] font-bold text-[#bdc8d1]/60 uppercase tracking-widest block mb-1 font-mono tracking-wider text-sky-400">Estrutura de Vínculos</span>
                  
                  {item.structure && Array.isArray(item.structure.estados) ? (
                    <div className="space-y-3.5">
                      {item.structure.estados.map((est: EstHierarchical, sIdx: number) => (
                        <div key={sIdx} className="bg-[#1a233a] rounded-lg p-3 space-y-2.5 border border-[#3e484f]/25">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-pink-400">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>{est.name}</span>
                          </div>

                          <div className="space-y-2 pl-3 border-l border-[#3a445c]">
                            {est.regioes.map((reg: RegHierarchical, rIdx: number) => (
                              <div key={rIdx} className="space-y-1.5">
                                <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                                  <Map className="w-3 h-3 shrink-0" />
                                  <span>{reg.name}</span>
                                </div>

                                <div className="space-y-1.5 pl-3 border-l border-[#3a445c]/55">
                                  {reg.localidades.map((loc: LocHierarchical, lIdx: number) => (
                                    <div key={lIdx} className="space-y-1">
                                      <div className="text-[10px] font-medium text-teal-400 flex items-center gap-1">
                                        <Layers className="w-2.5 h-2.5 shrink-0" />
                                        <span>{loc.name}</span>
                                      </div>

                                      {loc.grades && loc.grades.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 pl-3.5">
                                          {loc.grades.map((grd: string, gIdx: number) => (
                                            <span key={gIdx} className="bg-indigo-400/10 text-indigo-400 border border-indigo-400/20 px-1.5 py-0.2 rounded text-[9px] font-sans font-semibold">
                                              {grd}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-[9px] text-[#bdc8d1]/40 italic pl-3.5">Nenhuma série vinculada</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Flat fallback visualizer is fully backward-compatible
                    <div className="space-y-2">
                      {/* Estado */}
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-pink-400"></div>
                          <span className="text-[#bdc8d1] font-medium text-[11px] shrink-0">Estados:</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pl-3.5">
                          {item.estado.split(',').map((est, idx) => (
                            <span key={idx} className="bg-pink-400/10 text-pink-400 border border-pink-400/20 px-2 py-0.5 rounded text-[10px] font-sans font-semibold">
                              {est.trim()}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Região */}
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                          <span className="text-[#bdc8d1] font-medium text-[11px] shrink-0">Regiões:</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pl-3.5">
                          {item.regiao.split(',').map((reg, idx) => (
                            <span key={idx} className="bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded text-[10px] font-sans font-semibold">
                              {reg.trim()}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Localidade */}
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-teal-400"></div>
                          <span className="text-[#bdc8d1] font-medium text-[11px] shrink-0">Localidades:</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pl-3.5">
                          {item.localidade.split(',').map((loc, idx) => (
                            <span key={idx} className="bg-teal-400/10 text-teal-400 border border-teal-400/20 px-2 py-0.5 rounded text-[10px] font-sans font-semibold">
                              {loc.trim()}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Série/Turma */}
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                          <span className="text-[#bdc8d1] font-medium text-[11px] shrink-0">Séries/Turmas:</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pl-3.5">
                          {item.grade ? (
                            item.grade.split(',').map((grd, idx) => (
                              <span key={idx} className="bg-indigo-400/10 text-indigo-400 border border-indigo-400/20 px-2 py-0.5 rounded text-[10px] font-sans font-semibold">
                                {grd.trim()}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-[#bdc8d1]/40 italic">Nenhuma vinculada</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Operations footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#3e484f]/15 mt-5">
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="p-2 hover:bg-[#131b2e] rounded border border-[#3e484f]/20 hover:border-[#38bdf8]/40 text-xs text-[#bdc8d1] hover:text-[#dae2fd] transition-all flex items-center gap-1.5 font-semibold cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => runWithPermission('delete:contrato', () => setContratoToDelete(item))}
                  className="p-2 hover:bg-rose-500/15 rounded border border-[#3e484f]/20 hover:border-rose-500/40 text-xs text-rose-400 hover:text-rose-300 transition-all flex items-center gap-1.5 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-[#060e20]/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-2xl rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150 max-h-[90dvh] overflow-y-auto scrollbar-thin scrollbar-thumb-sky-500/20">
            <button 
              onClick={() => setShowAddForm(false)}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#8ed5ff] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-sky-400" />
              <span>Cadastrar Novo Contrato</span>
            </h4>

            <form onSubmit={handleAddContrato} className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1.5">Nome / Descrição do Contrato: *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Contrato Integral Escola Central"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                />
              </div>

              {/* STATES NESTED BUILDER */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#8ed5ff] uppercase tracking-wider">Estrutura Geográfica Dinâmica</label>
                  {newEstadosHierarchical.length < 2 && (
                    <button
                      type="button"
                      onClick={handleAddNewState}
                      className="text-xs text-[#38bdf8] hover:text-[#0ea5e9] bg-[#38bdf8]/10 hover:bg-[#38bdf8]/15 border border-[#38bdf8]/20 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Estado
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {newEstadosHierarchical.map((stateNode, sIdx) => (
                    <div key={sIdx} className="bg-[#0b1326] border border-[#3e484f]/70 rounded-xl p-4 space-y-4 상대">
                      {/* State Header Section */}
                      <div className="flex justify-between items-center border-b border-[#3e484f]/30 pb-3">
                        <div className="flex items-center gap-2.5 flex-1 max-w-sm">
                          <span className="w-6 h-6 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[11px] font-bold flex items-center justify-center">
                            {sIdx + 1}
                          </span>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-pink-400 block uppercase tracking-wider mb-1">Estado</label>
                            <select 
                              value={stateNode.name}
                              onChange={(e) => handleUpdateNewStateName(sIdx, e.target.value)}
                              className="w-full bg-[#171f33] border border-[#3e484f]/85 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                            >
                              {ESTADOS_LIST.map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {newEstadosHierarchical.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveNewState(sIdx)}
                            className="p-2 border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 rounded-lg text-xs cursor-pointer flex items-center gap-1 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remover Estado</span>
                          </button>
                        )}
                      </div>

                      {/* REGIONS LIST */}
                      <div className="pl-4 border-l-2 border-pink-500/20 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Regiões (Máximo 5)</span>
                          {stateNode.regioes.length < 5 && (
                            <button
                              type="button"
                              onClick={() => handleAddNewRegion(sIdx)}
                              className="text-[11px] text-[#38bdf8] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Adicionar Região
                            </button>
                          )}
                        </div>

                        <div className="space-y-4">
                          {stateNode.regioes.map((regionNode, rIdx) => (
                            <div key={rIdx} className="bg-[#171f33]/40 border border-[#3e484f]/40 rounded-lg p-3 space-y-3">
                              <div className="flex justify-between items-center gap-3">
                                <div className="flex-1">
                                  <input 
                                    type="text"
                                    required
                                    placeholder="Nome da Região (Ex: Região Leste, Metropolitana)"
                                    value={regionNode.name}
                                    onChange={(e) => handleUpdateNewRegionName(sIdx, rIdx, e.target.value)}
                                    className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-md px-2.5 py-1 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                                  />
                                </div>
                                {stateNode.regioes.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveNewRegion(sIdx, rIdx)}
                                    className="p-2 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded cursor-pointer"
                                    title="Remover Região"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* LOCALITIES LIST */}
                              <div className="pl-3 border-l-2 border-amber-500/20 space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-bold text-teal-400 uppercase tracking-widest">Localidades (Máximo 10)</span>
                                  {regionNode.localidades.length < 10 && (
                                    <button
                                      type="button"
                                      onClick={() => handleAddNewLocality(sIdx, rIdx)}
                                      className="text-[10px] text-teal-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Plus className="w-2.5 h-2.5" /> Adicionar Localidade
                                    </button>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  {regionNode.localidades.map((localityNode, lIdx) => (
                                    <div key={lIdx} className="bg-[#0b1326]/60 border border-[#3e484f]/30 rounded p-2.5 space-y-2.5">
                                      <div className="flex justify-between items-center gap-2">
                                        <input 
                                          type="text"
                                          required
                                          placeholder="Nome da Localidade (Ex: Unidade Centro, Penha)"
                                          value={localityNode.name}
                                          onChange={(e) => handleUpdateNewLocalityName(sIdx, rIdx, lIdx, e.target.value)}
                                          className="flex-1 bg-[#171f33] border border-[#3e484f]/40 rounded px-2 py-0.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                                        />
                                        {regionNode.localidades.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveNewLocality(sIdx, rIdx, lIdx)}
                                            className="p-2 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded cursor-pointer"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>

                                      {/* GRADES ATTACHED TO THIS LOCALITY */}
                                      <div className="space-y-1 pt-1.5 border-t border-[#3e484f]/15">
                                        <span className="text-[9px] font-bold text-indigo-400 block uppercase tracking-wider">Séries vinculadas nesta Localidade:</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-[#171f33]/40 p-2 rounded border border-[#3e484f]/20 max-h-24 overflow-y-auto scrollbar-thin">
                                          {allGrades.map(grade => {
                                            const checked = (localityNode.grades || []).includes(grade);
                                            return (
                                              <label key={grade} className="flex items-center gap-1.5 text-[10px] text-[#bdc8d1] hover:text-[#dae2fd] cursor-pointer">
                                                <input 
                                                  type="checkbox"
                                                  checked={checked}
                                                  onChange={() => handleToggleNewLocalityGrade(sIdx, rIdx, lIdx, grade)}
                                                  className="rounded border-[#3e484f] text-[#38bdf8] focus:ring-[#38bdf8] bg-[#171f33] w-3 h-3"
                                                />
                                                <span>{grade}</span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#3e484f]/25 text-xs">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)} 
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1] cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-[#38bdf8] text-[#001e2c] font-bold rounded-lg text-xs shadow-md shadow-[#38bdf8]/10 cursor-pointer"
                >
                  Salvar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal Form */}
      {contratoToEdit && (
        <div className="fixed inset-0 bg-[#060e20]/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-2xl rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150 max-h-[90dvh] overflow-y-auto scrollbar-thin scrollbar-thumb-sky-500/20">
            <button 
              onClick={() => setContratoToEdit(null)}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#8ed5ff] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2 flex items-center gap-2">
              <Edit className="w-4 h-4 text-[#38bdf8]" />
              <span>Editar Cadastro de Contrato</span>
            </h4>

            <form onSubmit={handleSaveEdit} className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1.5">Nome / Descrição do Contrato: *</label>
                <input 
                  type="text" 
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                />
              </div>

              {/* STATES NESTED BUILDER EDIT */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#8ed5ff] uppercase tracking-wider">Estrutura Geográfica Dinâmica</label>
                  {editEstadosHierarchical.length < 2 && (
                    <button
                      type="button"
                      onClick={handleAddEditState}
                      className="text-xs text-[#38bdf8] hover:text-[#0ea5e9] bg-[#38bdf8]/10 hover:bg-[#38bdf8]/15 border border-[#38bdf8]/20 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Estado
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {editEstadosHierarchical.map((stateNode, sIdx) => (
                    <div key={sIdx} className="bg-[#0b1326] border border-[#3e484f]/70 rounded-xl p-4 space-y-4">
                      {/* State Header Section */}
                      <div className="flex justify-between items-center border-b border-[#3e484f]/30 pb-3">
                        <div className="flex items-center gap-2.5 flex-1 max-w-sm">
                          <span className="w-6 h-6 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[11px] font-bold flex items-center justify-center">
                            {sIdx + 1}
                          </span>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-pink-400 block uppercase tracking-wider mb-1">Estado</label>
                            <select 
                              value={stateNode.name}
                              onChange={(e) => handleUpdateEditStateName(sIdx, e.target.value)}
                              className="w-full bg-[#171f33] border border-[#3e484f]/85 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                            >
                              {ESTADOS_LIST.map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {editEstadosHierarchical.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEditState(sIdx)}
                            className="p-2 border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 rounded-lg text-xs cursor-pointer flex items-center gap-1 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remover Estado</span>
                          </button>
                        )}
                      </div>

                      {/* REGIONS LIST */}
                      <div className="pl-4 border-l-2 border-pink-500/20 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Regiões (Máximo 5)</span>
                          {stateNode.regioes.length < 5 && (
                            <button
                              type="button"
                              onClick={() => handleAddEditRegion(sIdx)}
                              className="text-[11px] text-[#38bdf8] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Adicionar Região
                            </button>
                          )}
                        </div>

                        <div className="space-y-4">
                          {stateNode.regioes.map((regionNode, rIdx) => (
                            <div key={rIdx} className="bg-[#171f33]/40 border border-[#3e484f]/40 rounded-lg p-3 space-y-3">
                              <div className="flex justify-between items-center gap-3">
                                <div className="flex-1">
                                  <input 
                                    type="text"
                                    required
                                    placeholder="Nome da Região (Ex: Região Leste, Metropolitana)"
                                    value={regionNode.name}
                                    onChange={(e) => handleUpdateEditRegionName(sIdx, rIdx, e.target.value)}
                                    className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-md px-2.5 py-1 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                                  />
                                </div>
                                {stateNode.regioes.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEditRegion(sIdx, rIdx)}
                                    className="p-2 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded cursor-pointer"
                                    title="Remover Região"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* LOCALITIES LIST */}
                              <div className="pl-3 border-l-2 border-amber-500/20 space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-bold text-teal-400 uppercase tracking-widest">Localidades (Máximo 10)</span>
                                  {regionNode.localidades.length < 10 && (
                                    <button
                                      type="button"
                                      onClick={() => handleAddEditLocality(sIdx, rIdx)}
                                      className="text-[10px] text-teal-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Plus className="w-2.5 h-2.5" /> Adicionar Localidade
                                    </button>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  {regionNode.localidades.map((localityNode, lIdx) => (
                                    <div key={lIdx} className="bg-[#0b1326]/60 border border-[#3e484f]/30 rounded p-2.5 space-y-2.5">
                                      <div className="flex justify-between items-center gap-2">
                                        <input 
                                          type="text"
                                          required
                                          placeholder="Nome da Localidade (Ex: Unidade Centro, Penha)"
                                          value={localityNode.name}
                                          onChange={(e) => handleUpdateEditLocalityName(sIdx, rIdx, lIdx, e.target.value)}
                                          className="flex-1 bg-[#171f33] border border-[#3e484f]/40 rounded px-2 py-0.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                                        />
                                        {regionNode.localidades.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveEditLocality(sIdx, rIdx, lIdx)}
                                            className="p-2 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded cursor-pointer"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>

                                      {/* GRADES ATTACHED TO THIS LOCALITY */}
                                      <div className="space-y-1 pt-1.5 border-t border-[#3e484f]/15">
                                        <span className="text-[9px] font-bold text-indigo-400 block uppercase tracking-wider">Séries vinculadas nesta Localidade:</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-[#171f33]/40 p-2 rounded border border-[#3e484f]/20 max-h-24 overflow-y-auto scrollbar-thin">
                                          {allGrades.map(grade => {
                                            const checked = (localityNode.grades || []).includes(grade);
                                            return (
                                              <label key={grade} className="flex items-center gap-1.5 text-[10px] text-[#bdc8d1] hover:text-[#dae2fd] cursor-pointer">
                                                <input 
                                                  type="checkbox"
                                                  checked={checked}
                                                  onChange={() => handleToggleEditLocalityGrade(sIdx, rIdx, lIdx, grade)}
                                                  className="rounded border-[#3e484f] text-[#38bdf8] focus:ring-[#38bdf8] bg-[#171f33] w-3 h-3"
                                                />
                                                <span>{grade}</span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#3e484f]/25 text-xs">
                <button 
                  type="button" 
                  onClick={() => setContratoToEdit(null)} 
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1] cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-[#38bdf8] text-[#001e2c] font-bold rounded-lg text-xs shadow-md shadow-[#38bdf8]/10 cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {contratoToDelete && (
        <div className="fixed inset-0 bg-[#060e20]/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-rose-500/20 w-full max-w-sm rounded-xl shadow-2xl p-4 sm:p-6 relative text-center space-y-4">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-[#dae2fd] uppercase tracking-wider">Confirmar Exclusão</h4>
              <p className="text-xs text-[#bdc8d1]/80 mt-1">
                Você tem certeza que deseja remover o contrato <strong>{contratoToDelete.name}</strong> contendo os vínculos de localidade e região?
              </p>
            </div>

            <div className="flex gap-2 justify-center text-xs pt-2">
              <button
                onClick={() => setContratoToDelete(null)}
                className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-[#bdc8d1] font-semibold cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={() => handleDeleteContrato(contratoToDelete.id)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-lg shadow-rose-600/10 cursor-pointer"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
