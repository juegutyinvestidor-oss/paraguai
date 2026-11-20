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
import { localizeAssessmentReport, type ReportTranslator } from '../lib/reportI18n';
import { backfillReportsForStudentIds } from '../lib/autoReport';
import { isSupabaseConfigured } from '../lib/supabase';
import { getDb } from '../lib/dbFacade';
import type { Permission } from '../lib/rbac';
import { logExport, logDataAccess } from '../lib/auditLog';
import { useLocale, useTranslations } from 'next-intl';

const DISPLAY_KEYS: Record<string, string> = {
  "GINÁSTICA (Artística / Rítmica)": "valorGinasticaArtisticaRitmica",
  "FUTEBOL / FUTSAL": "valorFutebolFutsal",
  "VÔLEI": "valorVolei",
  "LUTAS / ARTES MARCIAIS": "valorLutasArtesMarciais",
  "NATAÇÃO": "valorNatacao",
  "APRIMORAR HABILIDADES MOTORAS": "valorAprimorarHabilidadesMotoras",
  "Desempenho Escolar": "valorDesempenhoEscolar",
  "Desempenho Corporal": "valorDesempenhoCorporal",
  "Desempenho de Capacidades Físicas": "valorDesempenhoDeCapacidadesFisicas",
  "Desempenho em Atividades Esportivas": "valorDesempenhoEmAtividadesEsportivas",
  "Desempenho Vocacional": "valorDesempenhoVocacional",
  "Desempenho Saúde Global": "valorDesempenhoSaudeGlobal",
  "Desempenho Higiene Bucal": "valorDesempenhoHigieneBucal",
  "Desempenho Autoconceito": "valorDesempenhoAutoconceito",
  "Desempenho Índice Alimentar": "valorDesempenhoIndiceAlimentar",
  "Desempenho Rastreamento TDAH": "valorDesempenhoRastreamentoTdah",
  "Desempenho Rastreamento Precoce do TEA": "valorDesempenhoRastreamentoPrecoceDoTea",
  "Desempenho Qualidade Motora PCD": "valorDesempenhoQualidadeMotoraPcd",
  "Desempenho Completo": "valorDesempenhoCompleto",
  "Avaliação de IMC": "valorAvaliacaoDeImc",
  "Desempenho de capacidades físicas": "valorDesempenhoDeCapacidadesFisicas2",
  "Qualidade Motora": "valorQualidadeMotora",
  "Avaliação Esportiva": "valorAvaliacaoEsportiva",
  "Desempenho vocacional": "valorDesempenhoVocacional2",
  "Perfil Vocacional": "valorPerfilVocacional",
  "Não informado": "valorNaoInformado",
  "CENÁRIO A – MAIS PRESENÇAS DO QUE FALTAS": "valorCenarioAMaisPresencasDoQueFaltas",
  "O estudante demonstrou excelente regularidade e compromisso com a rotina escolar ao longo deste período. A baixa taxa de absenteísmo reflete uma postura participativa e engajada com o ambiente de aprendizagem.": "valorOEstudanteDemonstrouExcelenteRegularidadeECompromisso",
  "Parabéns pelo incentivo e parceria. A presença constante tem sido o pilar para os bons resultados mantidos até aqui.": "valorParabensPeloIncentivoEParceriaAPresenca",
  "### Matriz de Impactos Pedagógicos\n- **Continuidade Pedagógica**: Quando presente, o aluno acompanha as explicações passo a passo, facilitando a execução de tarefas complexas.\n- **Socialização Ativa**: A convivência diária fortalece os vínculos com professores e colegas, desenvolvendo inteligência emocional e trabalho em equipe.\n- **Ritmo de Avaliação**: Menor necessidade de aplicação de provas substitutivas ou trabalhos de recuperação de nota por perda de prazos.": "valorMatrizDeImpactosPedagogicosContinuidadePedagogicaQuando",
  "CENÁRIO B – MAIS FALTAS DO QUE PRESENÇAS": "valorCenarioBMaisFaltasDoQuePresencas",
  "Identificamos um número crítico de ausências neste período, superando os dias de comparecimento em sala de aula. Esse padrão de faltas excessivas acende um alerta pedagógico, pois interrompe a sequência didática e prejudica a absorção dos conteúdos ministrados.": "valorIdentificamosUmNumeroCriticoDeAusenciasNeste",
  "Solicitamos uma atenção especial e um diálogo familiar para identificarmos o motivo das ausências. É fundamental restabelecer a rotina de idas à escola para evitar prejuízos severos na avaliação final deste ciclo.": "valorSolicitamosUmaAtencaoEspecialEUmDialogo",
  "### Matriz de Impactos Pedagógicos\n- **Lacunas de Conteúdo**: Cada ausência gera a perda de conceitos-chave, acumulando dúvidas para as unidades seguintes.\n- **Desengajamento Escolar**: O excesso de faltas quebra a rotina do estudante, gerando desmotivação e sensação de isolamento em relação à turma.\n- **Sobrecarga de Tarefas**: Acúmulo de atividades pendentes que precisam ser realizadas em casa para cumprir as exigências do ano letivo.": "valorMatrizDeImpactosPedagogicosLacunasDeConteudo",
  "CENÁRIO C – SEM REGISTROS SUFICIENTES": "valorCenarioCSemRegistrosSuficientes",
  "Até o momento, não foram identificados registros de presença ou ausência suficientes para o estudante no sistema neste período. A ausência de dados impede uma avaliação precisa do acompanhamento escolar.": "valorAteOMomentoNaoForamIdentificadosRegistros",
  "Solicitamos que entrem em contato com a secretaria escolar para a regularização dos registros de frequência.": "valorSolicitamosQueEntremEmContatoComA",
  "### Matriz de Impactos Pedagógicos\n- **Inconsistência de Dados**: A falta de registros impede a análise de evolução pedagógica.\n- **Alerta de Monitoramento**: Recomenda-se a verificação imediata da rotina de frequência.": "valorMatrizDeImpactosPedagogicosInconsistenciaDeDados",
  "Nenhuma observação adicional registrada.": "valorNenhumaObservacaoAdicionalRegistrada",
  "### RELATÓRIO DE DESEMPENHO CORPORAL\n\nNenhum registro de IMC selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.": "valorRelatorioDeDesempenhoCorporalNenhumRegistroDe",
  "Não classificado": "valorNaoClassificado",
  "Aguardando Análise": "valorAguardandoAnalise",
  "Não há um parecer específico cadastrado para esta classificação.": "valorNaoHaUmParecerEspecificoCadastradoPara",
  "### RELATÓRIO DE DESEMPENHO DE CAPACIDADES FÍSICAS\n\nNenhum registro de Qualidade Motora selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.": "valorRelatorioDeDesempenhoDeCapacidadesFisicasNenhum",
  "Nenhuma observação específica registrada pelo educador para este período.": "valorNenhumaObservacaoEspecificaRegistradaPeloEducadorPara",
  "### RELATÓRIO DE DESEMPENHO EM ATIVIDADES ESPORTIVAS\n\nNenhum registro de Esporte Indicado selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.": "valorRelatorioDeDesempenhoEmAtividadesEsportivasNenhum",
  "Não avaliado": "valorNaoAvaliado",
  "Nenhuma observação complementar registrada.": "valorNenhumaObservacaoComplementarRegistrada",
  "### RELATÓRIO DE DESEMPENHO VOCACIONAL\n\nNenhum registro de Vocacionamento selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.": "valorRelatorioDeDesempenhoVocacionalNenhumRegistroDe",
  "Não especificado": "valorNaoEspecificado",
  "Nenhum parecer técnico inserido no registro de vocacionamento original.": "valorNenhumParecerTecnicoInseridoNoRegistroDe",
  "Nenhuma observação complementar registrada para este período.": "valorNenhumaObservacaoComplementarRegistradaParaEstePeriodo",
  "### RELATÓRIO DE DESEMPENHO - SAÚDE GLOBAL\n\nNenhum registro de Saúde Global selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.": "valorRelatorioDeDesempenhoSaudeGlobalNenhumRegistro",
  "Nenhum parecer técnico inserido no registro de Saúde Global original.": "valorNenhumParecerTecnicoInseridoNoRegistroDe2",
  "### RELATÓRIO DE DESEMPENHO - HIGIENE BUCAL\n\nNenhum registro de Higiene Bucal selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.": "valorRelatorioDeDesempenhoHigieneBucalNenhumRegistro",
  "Nenhum parecer técnico inserido no registro de Higiene Bucal original.": "valorNenhumParecerTecnicoInseridoNoRegistroDe3",
  "### RELATÓRIO DE DESEMPENHO - AUTOCONCEITO\n\nNenhum registro de Autoconceito selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.": "valorRelatorioDeDesempenhoAutoconceitoNenhumRegistroDe",
  "Nenhum parecer técnico inserido no registro de Autoconceito original.": "valorNenhumParecerTecnicoInseridoNoRegistroDe4",
  "### RELATÓRIO DE DESEMPENHO - ÍNDICE ALIMENTAR\n\nNenhum registro de Índice Alimentar selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.": "valorRelatorioDeDesempenhoIndiceAlimentarNenhumRegistro",
  "Nenhum parecer técnico inserido no registro de Índice Alimentar original.": "valorNenhumParecerTecnicoInseridoNoRegistroDe5",
  "### RELATÓRIO DE DESEMPENHO - RASTREAMENTO DO TDAH\n\nNenhum registro de Rastreamento do TDAH selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.": "valorRelatorioDeDesempenhoRastreamentoDoTdahNenhum",
  "Nenhum parecer técnico inserido no registro de Rastreamento do TDAH original.": "valorNenhumParecerTecnicoInseridoNoRegistroDe6",
  "### RELATÓRIO DE DESEMPENHO - RASTREAMENTO PRECOCE DO TEA\n\nNenhum registro de Rastreamento Precoce do TEA selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.": "valorRelatorioDeDesempenhoRastreamentoPrecoceDoTea",
  "Não classificada": "valorNaoClassificada",
  "Nenhum parecer técnico inserido no registro de Rastreamento Precoce do TEA original.": "valorNenhumParecerTecnicoInseridoNoRegistroDe7",
  "### RELATÓRIO DE DESEMPENHO - QUALIDADE MOTORA PCD\n\nNenhuma avaliação de Qualidade Motora PCD selecionada ou encontrada para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.": "valorRelatorioDeDesempenhoQualidadeMotoraPcdNenhuma",
  "Substituído": "valorSubstituido",
  "- Nenhum teste adaptado ou substituído neste grupo.": "valorNenhumTesteAdaptadoOuSubstituidoNesteGrupo",
  "Nenhum parecer técnico inserido no registro de Avaliação PCD original.": "valorNenhumParecerTecnicoInseridoNoRegistroDe8",
  "Não informada": "valorNaoInformada",
  "Nenhum parecer integrador ou observação complementar geral registrada pelo educador para esta consolidação.": "valorNenhumParecerIntegradorOuObservacaoComplementarGeral",
  "Força Muscular": "valorForcaMuscular",
  "Impulsão": "valorImpulsao",
  "Velocidade": "valorVelocidade",
  "Abdomen": "valorAbdomen",
  "Agilidade": "valorAgilidade",
  "Excelente": "valorExcelente",
  "Geral": "valorGeral",
  "Adolescente (12 a 15 anos)": "valorAdolescente12A15Anos",
  "Criança (4 a 11 anos)": "valorCrianca4A11Anos",
  "Pontuação de 0 a 6: traços comportamentais dentro da média da população geral; acompanhamento rotineiro do desenvolvimento.": "valorPontuacao0a6",
  "Pontuação de 7 a 10: alerta de traços elevados de TEA; recomendação de encaminhamento prioritário para avaliação multidisciplinar especializada (neuropediatra ou psiquiatra infantil e neuropsicólogo).": "valorPontuacao7a10",
  "*Nenhum relatório de Desempenho Escolar foi encontrado no histórico.*": "valorSemRelatorioEscolar",
  "*Nenhum relatório de Desempenho Corporal foi encontrado no histórico.*": "valorSemRelatorioCorporal",
  "*Nenhum relatório de Capacidades Físicas foi encontrado no histórico.*": "valorSemRelatorioCapacidades",
  "*Nenhum relatório de Desempenho Esportivo foi encontrado no histórico.*": "valorSemRelatorioEsportivo",
  "*Nenhum relatório de Desempenho Vocacional foi encontrado no histórico.*": "valorSemRelatorioVocacional",
  "*Nenhum relatório de Saúde Global foi encontrado no histórico.*": "valorSemRelatorioSaude",
  "*Nenhum relatório de Higiene Bucal foi encontrado no histórico.*": "valorSemRelatorioHigiene",
  "*Nenhum relatório de Autoconceito foi encontrado no histórico.*": "valorSemRelatorioAutoconceito",
  "*Nenhum relatório de Índice Alimentar foi encontrado no histórico.*": "valorSemRelatorioIas",
  "Centro": "valorCentro",
  "Regular": "valorRegular",
  "BASQUETE": "valorBasquete",
  "HANDEBOL": "valorHandebol",
  "ATLETISMO": "valorAtletismo",
};

function displayValue(value: unknown, t: (key: string) => string): string {
  const text = String(value ?? '');
  return DISPLAY_KEYS[text] ? t(DISPLAY_KEYS[text]) : text;
}

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
  const tArea = useTranslations('desempenho');
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {FOCUS_AREAS.map((area) => (
        <option key={area} value={area}>{displayValue(area, tArea)}</option>
      ))}
    </select>
  );
}

export default function PerformanceView({ students, contratos, user, isAnaliseGeral, isPainelEstatistico, imcRecords: imcRecordsProp, motorRecords: motorRecordsProp, sportRecords: sportRecordsProp, vocationalRecords: vocationalRecordsProp, healthRecords: healthRecordsProp, oralRecords: oralRecordsProp, autoconceptRecords: autoconceptRecordsProp, iasRecords: iasRecordsProp, snapRecords: snapRecordsProp, aq10Records: aq10RecordsProp, pcdRecords: pcdRecordsProp, runWithPermission }: PerformanceViewProps) {
  const t = useTranslations('desempenho');
  const locale = useLocale();

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
        { id: "v1", level: "INSUFICIENTE", alertColor: "rose", healthStatus: t('textoACapacidadeDeDeslocamentoRapidoEO'), toImprove: t('textoOAlunoPrecisaDesenvolverAEficienciaDa'), recommendation: t('textoIncentivamosOEstimuloEmCasaAtravesDe') },
        { id: "v2", level: "REGULAR", alertColor: "yellow", healthStatus: t('textoOAlunoConsegueCorrerEmUmRitmo'), toImprove: t('textoOFocoDeveSerOGanhoDe'), recommendation: t('textoIncentivamosOEstimuloEmCasaAtravesDe') },
        { id: "v3", level: "BOM", alertColor: "emerald", healthStatus: t('textoNivelSaudavelETotalmenteAdequadoParaA'), toImprove: t('textoEmboraEstejaEmUmaFaixaSeguraE'), recommendation: t('textoParabenizamosPeloExcelenteVigorFisicoSeguiremosOferecendo') },
        { id: "v4", level: "EXCELENTE", alertColor: "blue", healthStatus: t('textoDesempenhoFisicoExcepcionalOAlunoPossuiUm'), toImprove: t('textoOObjetivoAgoraEPreservarEssaAlta'), recommendation: t('textoParabenizamosPeloExcelenteVigorFisicoSeguiremosOferecendo') }
      ],
      forca_muscular: [
        { id: "f1", level: "INSUFICIENTE", alertColor: "rose", healthStatus: t('textoACapacidadeDeVencerResistenciasESustentar'), toImprove: t('textoOAlunoPrecisaDesenvolverUrgentementeAForca'), recommendation: t('textoIncentivamosAtividadesLudicasDeForcaEmCasa') },
        { id: "f2", level: "REGULAR", alertColor: "yellow", healthStatus: t('textoOAlunoPossuiUmaForcaMuscularEstavel'), toImprove: t('textoOFocoDeveSerOAumentoDe'), recommendation: t('uiIncentivamosAtividadesDeForcaLudicasEDesafiadoras') },
        { id: "f3", level: "BOM", alertColor: "emerald", healthStatus: t('textoNivelSaudavelETotalmenteAdequadoParaA2'), toImprove: t('textoEmboraONivelSejaSeguroOAluno'), recommendation: t('textoParabenizamosPeloExcelenteSuporteFisicoSeguiremosCom') },
        { id: "f4", level: "EXCELENTE", alertColor: "blue", healthStatus: t('textoDesempenhoFisicoExcepcionalOAlunoDemonstraAltissima'), toImprove: t('textoOObjetivoAgoraEZelarPelaLongevidade'), recommendation: t('textoParabenizamosPeloExcelenteSuporteFisicoSeguiremosCom') }
      ],
      agilidade: [
        { id: "a1", level: "INSUFICIENTE", alertColor: "rose", healthStatus: t('textoACapacidadeDeMudarDeDirecaoRapidamente'), toImprove: t('textoOAlunoPrecisaDesenvolverUrgentementeOTempo'), recommendation: t('textoIncentivamosAPraticaDeBrincadeirasDeRua') },
        { id: "a2", level: "REGULAR", alertColor: "yellow", healthStatus: t('textoOAlunoConsegueMudarDeDirecaoMas'), toImprove: t('textoOFocoDeveSerORefinamentoTecnico'), recommendation: t('textoIncentivamosAPraticaDeBrincadeirasDeRua') },
        { id: "a3", level: "BOM", alertColor: "emerald", healthStatus: t('textoNivelSaudavelETotalmenteAdequadoParaA3'), toImprove: t('textoEmboraONivelSejaSeguroEProtetor'), recommendation: t('textoParabenizamosPelaExcelenteAgilidadeEProntidaoMotora') },
        { id: "a4", level: "EXCELENTE", alertColor: "blue", healthStatus: t('textoDesempenhoFisicoExcepcionalOAlunoApresentaUma'), toImprove: t('textoOObjetivoAtualEManterEssaAlta'), recommendation: t('textoParabenizamosPelaExcelenteAgilidadeEProntidaoMotora') }
      ],
      abdomen: [
        { id: "ab1", level: "INSUFICIENTE", alertColor: "rose", healthStatus: t('textoAResistenciaDaRegiaoAbdominalEstaAbaixo'), toImprove: t('textoOAlunoPrecisaIniciarUrgentementeOFortalecimento'), recommendation: t('textoIncentivamosOEstimuloDiarioAtravesDeDesafios') },
        { id: "ab2", level: "REGULAR", alertColor: "yellow", healthStatus: t('textoOAlunoPossuiUmaForcaAbdominalBasica'), toImprove: t('textoOFocoDeveSerOAumentoGradual'), recommendation: t('textoIncentivamosOPrecoOuEstimuloDiarioAtraves') },
        { id: "ab3", level: "BOM", alertColor: "emerald", healthStatus: t('textoNivelSaudavelEDentroDoPadraoRecomendado'), toImprove: t('textoEmboraONivelSejaSeguroOAluno'), recommendation: t('textoParabenizamosPelaExcelenteCondicaoDeSaudeFisica') },
        { id: "ab4", level: "EXCELENTE", alertColor: "blue", healthStatus: t('textoDesempenhoFisicoExcepcionalOAlunoPossuiExcelente'), toImprove: t('textoOObjetivoAgoraEManterOPadrao'), recommendation: t('textoParabenizamosPelaExcelenteCondicaoDeSaudeFisica') }
      ],
      impulsao: [
        { id: "i1", level: "INSUFICIENTE", alertColor: "rose", healthStatus: t('textoOIndiceDeImpulsaoEstaAbaixoDo'), toImprove: t('textoOAlunoPrecisaDesenvolverUrgentementeAForca2'), recommendation: t('textoIncentivamosOApoioEmAtividadesDinamicasEm') },
        { id: "i2", level: "REGULAR", alertColor: "yellow", healthStatus: t('textoOAlunoPossuiUmaBaseDeForca'), toImprove: t('textoOFocoDeveSerACoordenacaoEntre'), recommendation: t('textoIncentivamosOApoioEmAtividadesDinamicasEm') },
        { id: "i3", level: "BOM", alertColor: "emerald", healthStatus: t('textoONivelESaudavelEAdequadoO'), toImprove: t('textoEmboraEstejaEmUmNivelSeguroO'), recommendation: t('textoParabenizamosPeloOtimoHistoricoFisicoContinuaremosDesafiando') },
        { id: "i4", level: "EXCELENTE", alertColor: "blue", healthStatus: t('textoDesempenhoFisicoExcepcionalOAlunoPossuiExcelente2'), toImprove: t('textoOFocoAgoraEAManutencaoDessa'), recommendation: t('textoParabenizamosPeloOtimoHistoricoFisicoContinuaremosDesafiando') }
      ]
    };
  }, [m5FromDb, t]);
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
            { id: '1', classification: t('uiPesoNormal'), status: t('uiImcIdeal'), alertColor: 'emerald', description: t('textoOAlunoApresentaUmaComposicaoCorporalExcelente') },
            { id: '2', classification: t('uiAbaixoDoPeso'), status: t('uiAtencaoNutricional'), alertColor: 'yellow', description: t('textoOIndiceSinalizaANecessidadeDeAtencao') },
            { id: '3', classification: 'Sobrepeso', status: t('uiExcessoLeve'), alertColor: 'orange', description: t('textoOIndicadorApontaUmLeveExcessoDe') },
            { id: '4', classification: 'Obesidade', status: t('uiFatorDeRisco'), alertColor: 'rose', description: t('textoOIndiceIndicaUmFatorDeRisco') },
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
            { id: "m6_b1", name: "BASQUETE", valencias: t('uiImpulsaoAgilidadeEVelocidade'), condition: t('uiNiveisBomExcelenteEmImpulsaoEVelocidade'), report: t('textoIdentificoUmaAltaAptidaoBiomecanicaParaA') },
            { id: "m6_b2", name: "BASQUETE", valencias: t('uiImpulsaoAgilidadeEVelocidade'), condition: t('uiNiveisInsuficienteRegularEmAgilidadeOuImpulsao'), report: t('textoObservoRestricoesFuncionaisEmQuadraAFalta') },
            { id: "m6_b3", name: "BASQUETE", valencias: t('uiImpulsaoAgilidadeEVelocidade'), condition: t('uiQualquerNivelAlertaDeCore'), report: t('textoOBasqueteExigeDesaceleracoesBruscasESaltos') },
            { id: "m6_g1", name: "GINÁSTICA (Artística / Rítmica)", valencias: t('uiAbdomenForcaMuscularEAgilidade'), condition: t('uiNiveisBomExcelenteEmAbdomenEForca'), report: t('textoOAEstudantePossuiOTonusMuscular') },
            { id: "m6_g2", name: "GINÁSTICA (Artística / Rítmica)", valencias: t('uiAbdomenForcaMuscularEAgilidade'), condition: t('uiNiveisInsuficienteRegularEmAbdomenOuForca'), report: t('textoConstatoDeficitDeSustentacaoBasicaAFraqueza') },
            { id: "m6_g3", name: "GINÁSTICA (Artística / Rítmica)", valencias: t('uiAbdomenForcaMuscularEAgilidade'), condition: t('uiQualquerNivelAlertaDeCore'), report: t('textoNaGinasticaOAbdomenFuncionaComoO') },
            { id: "m6_h1", name: "HANDEBOL", valencias: t('uiVelocidadeAgilidadeEForcaMuscular'), condition: t('uiNiveisBomExcelenteEmVelocidadeEForca'), report: t('textoRegistroUmPerfilAltamenteCompetitivoParaO') },
            { id: "m6_h2", name: "HANDEBOL", valencias: t('uiVelocidadeAgilidadeEForcaMuscular'), condition: t('uiNiveisInsuficienteRegularEmAgilidadeOuVelocidade'), report: t('textoNotoPrejuizoNasTransicoesTaticasOA') },
            { id: "m6_h3", name: "HANDEBOL", valencias: t('uiVelocidadeAgilidadeEForcaMuscular'), condition: t('uiQualquerNivelAlertaCardiovascular'), report: t('textoEstaModalidadeImpoeUmRegimeAnaerobicoEstrito') },
            { id: "m6_f1", name: "FUTEBOL / FUTSAL", valencias: t('uiVelocidadeAgilidadeEImpulsao'), condition: t('uiNiveisBomExcelenteEmVelocidadeEAgilidade'), report: t('textoEvidencioExcelenteCapacidadeDeDribleEConducao') },
            { id: "m6_f2", name: "FUTEBOL / FUTSAL", valencias: t('uiVelocidadeAgilidadeEImpulsao'), condition: t('uiNiveisInsuficienteRegularEmAgilidadeOuVelocidade'), report: t('textoHaLimitacaoNaProtecaoDeBolaE') },
            { id: "m6_f3", name: "FUTEBOL / FUTSAL", valencias: t('uiVelocidadeAgilidadeEImpulsao'), condition: t('uiQualquerNivelAlertaLigamentar'), report: t('textoOFutebolApresentaAltoIndiceDeLesoes') },
            { id: "m6_v1", name: "VÔLEI", valencias: t('uiImpulsaoAgilidadeEAbdomen'), condition: t('uiNiveisBomExcelenteEmImpulsaoEAgilidade'), report: t('textoAvalioOtimaAptidaoParaAcoesNaRede') },
            { id: "m6_v2", name: "VÔLEI", valencias: t('uiImpulsaoAgilidadeEAbdomen'), condition: t('uiNiveisInsuficienteRegularEmImpulsao'), report: t('textoOAlcanceVerticalDoAEstudanteFica') },
            { id: "m6_v3", name: "VÔLEI", valencias: t('uiImpulsaoAgilidadeEAbdomen'), condition: t('uiQualquerNivelAlertaArticular'), report: t('textoAMecanicaDoVoleiGeraAltoEstresse') },
            { id: "m6_l1", name: "LUTAS / ARTES MARCIAIS", valencias: t('uiForcaMuscularAbdomenEAgilidade'), condition: t('uiNiveisBomExcelenteEmForcaMuscularE'), report: t('textoOAJovemDemonstraExcelenteBaseDe') },
            { id: "m6_l2", name: "LUTAS / ARTES MARCIAIS", valencias: t('uiForcaMuscularAbdomenEAgilidade'), condition: t('uiNiveisInsuficienteRegularEmForcaMuscular'), report: t('textoPerceboFadigaMuscularPrecoceDosMembrosSuperiores') },
            { id: "m6_l3", name: "LUTAS / ARTES MARCIAIS", valencias: t('uiForcaMuscularAbdomenEAgilidade'), condition: t('uiQualquerNivelAlertaDeCore'), report: t('textoOComplexoAbdominalELombarFracoExpoe') },
            { id: "m6_a1", name: t('uiAtletismoCorridasESaltos'), valencias: t('uiVelocidadeImpulsaoEForcaMuscular'), condition: t('uiNiveisBomExcelenteEmVelocidadeEImpulsao'), report: t('textoDiagnosticoUmPadraoDeCorridaEficienteCom') },
            { id: "m6_a2", name: t('uiAtletismoCorridasESaltos'), valencias: t('uiVelocidadeImpulsaoEForcaMuscular'), condition: t('uiNiveisInsuficienteRegularEmVelocidadeOuImpulsao'), report: t('textoOAEstudanteApresentaUmaMecanicaDe') },
            { id: "m6_a3", name: t('uiAtletismoCorridasESaltos'), valencias: t('uiVelocidadeImpulsaoEForcaMuscular'), condition: t('uiQualquerNivelAlertaTibial'), report: t('textoOGestoRepetitivoDoAtletismoExigeDissipacao') },
            { id: "m6_n1", name: "NATAÇÃO", valencias: t('uiForcaMuscularAbdomenEVelocidade'), condition: t('uiNiveisBomExcelenteEmForcaMuscularE'), report: t('textoOAEstudanteMantemUmaPosicaoHidrodinamica') },
            { id: "m6_n2", name: "NATAÇÃO", valencias: t('uiForcaMuscularAbdomenEVelocidade'), condition: t('uiNiveisInsuficienteRegularEmAbdomen'), report: t('textoObservoUmaQuebraNaLinhaDeFlutuacao') },
            { id: "m6_n3", name: "NATAÇÃO", valencias: t('uiForcaMuscularAbdomenEVelocidade'), condition: t('uiQualquerNivelAlertaDeRecondicionamento'), report: t('textoSendoUmEsporteDeBaixoImpactoArticular') }
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
            { id: "m6_d1", diretriz: "APRIMORAR HABILIDADES MOTORAS", criterio: t('textoEstaViaDeveSerAdotadaSeTres'), conduta: t('textoDesaconselhoTotalmenteAEspecializacaoPrecoceEmEsportes'), objetivo: t('textoOFocoExclusivoDesteDirecionamentoERestaurar') }
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
              profile: t('uiCriativoETecnologicoPerfilHibrido'),
              component: t('uiMapaDePerfisECarreiras'),
              basicData: t('textoVocacaoParaAmbientesInovadoresPotencialParaAtuar'),
              reflection: t('textoIdentificoNoAEstudanteUmaMenteQue')
            },
            {
              id: "m7_2",
              profile: t('uiCriativoETecnologicoPerfilHibrido'),
              component: t('uiRecomendacoesPedagogicas'),
              basicData: t('textoProjetosIntegradoresIncentivarAParticipacaoEmFeiras'),
              reflection: t('textoImersaoDeMercadoPromoverVisitasTecnicasA')
            },
            {
              id: "m7_3",
              profile: t('uiNegociosEGestao'),
              component: t('uiMapaDePerfisECarreiras'),
              basicData: t('textoM7NegociosGestaoBasicData'),
              reflection: t('textoObservoNoAEstudanteUmaEstruturaCognitiva')
            },
            {
              id: "m7_4",
              profile: t('uiNegociosEGestao'),
              component: t('uiRecomendacoesPedagogicas'),
              basicData: t('textoProjetosIntegradoresIncentivarACoordenacaoDeEquipes'),
              reflection: t('textoImersaoDeMercadoPromoverVisitasTecnicasA2')
            },
            {
              id: "m7_5",
              profile: t('uiBiologicasECriativas'),
              component: t('uiMapaDePerfisECarreiras'),
              basicData: t('textoM7BiologicasCriativasBasicData'),
              reflection: t('textoM7BiologicasCriativasReflection'),
            },
            {
              id: "m7_6",
              profile: t('uiBiologicasECriativas'),
              component: t('uiRecomendacoesPedagogicas'),
              basicData: t('textoProjetosIntegradoresIncentivarOEnvolvimentoEmFeiras'),
              reflection: t('textoImersaoDeMercadoPromoverVisitasGuiadasA')
            },
            {
              id: "m7_7",
              profile: t('uiExatasETecnologicas'),
              component: t('uiMapaDePerfisECarreiras'),
              basicData: t('textoM7ExatasTecnologicasBasicData'),
              reflection: t('textoM7ExatasTecnologicasReflection'),
            },
            {
              id: "m7_8",
              profile: t('uiExatasETecnologicas'),
              component: t('uiRecomendacoesPedagogicas'),
              basicData: t('textoProjetosIntegradoresIncentivarALiderancaEmOlimpiadas'),
              reflection: t('textoImersaoDeMercadoPromoverVisitasMonitoradasA')
            },
            {
              id: "m7_9",
              profile: t('uiHumanasESociais'),
              component: t('uiMapaDePerfisECarreiras'),
              basicData: t('textoM7HumanasSociaisBasicData'),
              reflection: t('textoOEixoCentralDeDesenvolvimentoDestePerfil')
            },
            {
              id: "m7_10",
              profile: t('uiHumanasESociais'),
              component: t('uiRecomendacoesPedagogicas'),
              basicData: t('textoProjetosIntegradoresIncentivarOProtagonismoEmDebates'),
              reflection: t('textoImersaoDeMercadoFomentarOContatoCom')
            }
          ]);
        }
      } catch (e) {
        console.error('Erro ao buscar m7Rows:', e);
        }
      }
    };

    calculateFrequencies();
  }, [selectedStudentId, students, refreshToggle, imcRecordsProp, motorRecordsProp, sportRecordsProp, vocationalRecordsProp, healthRecordsProp, oralRecordsProp, autoconceptRecordsProp, iasRecordsProp, snapRecordsProp, aq10RecordsProp, pcdRecordsProp, t]);

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

        alert(t('msgRelatorioExcluidoComSucesso'));
      } catch (e) {
        console.error('Erro ao excluir:', e);
        alert(t('msgNaoFoiPossivelExcluirORelatorio'));
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
    doc.text(t('pdfRelatorioDeDesempenhoEdukyne'), margin, y);
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
    doc.text(t('msgPdfAluno', { p0: displayValue(studentObj.name, t) }), infoX, iy);
    iy += 7;
    doc.text(t('msgPdfTurma', { p0: displayValue(studentObj.grade, t) }), infoX, iy);
    iy += 7;
    doc.text(t('msgPdfLocalidade', { p0: displayValue(studentObj.locality || 'N/A', t) }), infoX, iy);
    iy += 7;
    doc.text(t('tplEstadoStudentobjEstadoNARegiaoStudentobj', { p0: displayValue(studentObj.estado || 'N/A', t), p1: displayValue(studentObj.regiao || 'N/A', t) }), infoX, iy);
    iy += 7;
    doc.text(t('tplDimensaoDeFocoArea', { p0: displayValue(area, t) }), infoX, iy);
    iy += 7;
    doc.text(t('tplDataDeEmissaoNewDateTolocaledatestringPt', { p0: displayValue(new Date().toLocaleDateString(locale), t) }), infoX, iy);
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
      alert(t('msgSelecionePeloMenosUmAlunoParaBaixar'));
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
        alert(t('msgNenhumRelatorioEncontradoParaOsAlunosSelecionados'));
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

      alert(t('tplDownloadConcluidoAddedcountRelatoriosForamExportados', { p0: displayValue(addedCount, t) }));
      logExport(user?.id || 'unknown', user?.role || 'unknown', 'performance_reports', 'pdf', addedCount);
    } catch (err) {
      console.error('Erro ao gerar ZIP:', err);
      alert(t('msgOcorreuUmErroAoGerarOArquivo'));
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
    if (gradeFilter) return t('tplTurmaGradeFilter', { p0: displayValue(gradeFilter, t) });
    if (localityFilter && localityFilter !== 'Todos') return t('tplLocalidadeLocalityFilter', { p0: displayValue(localityFilter, t) });
    if (cityFilter && cityFilter !== 'Todos' && cityFilter !== 'Todas') return t('tplRegiaoCityfilter', { p0: displayValue(cityFilter, t) });
    if (stateFilter && stateFilter !== 'Todos') return t('tplEstadoStateFilter', { p0: displayValue(stateFilter, t) });
    if (contract && contract !== 'Todos') { const c = availableContracts.find(x => x.id === contract); return t('tplContratoContractName', { p0: displayValue(c ? c.name : '', t) }); }
    return t('uiTodosOsAlunos');
  }, [gradeFilter, localityFilter, cityFilter, stateFilter, contract, availableContracts, t]);

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
      { label: t('uiImcDesempenhoCorporal'), d: tally(imcRecordsProp, r => r.classification || '') },
      { label: t('uiCapacidadesFisicas'), d: tally(motorRecordsProp, r => r.generalClass || '') },
      { label: t('uiAtividadesEsportivas'), d: tally(sportRecordsProp, r => r.mainSkill || '') },
      { label: t('valorPerfilVocacional'), d: tally(vocationalRecordsProp, r => r.profile || '') },
      { label: t('uiSaudeGlobal'), d: tally(healthRecordsProp, r => r.classification || '') },
      { label: t('uiHigieneBucal'), d: tally(oralRecordsProp, r => r.classification || '') },
      { label: t('valorAutoconceito'), d: tally(autoconceptRecordsProp, r => r.classification || '') },
      { label: t('uiIndiceAlimentar'), d: tally(iasRecordsProp, r => r.classification || '') },
      { label: t('uiRastreamentoTdah'), d: tally(snapRecordsProp, r => r.classification || '') },
      { label: t('uiRastreamentoTea'), d: tally(aq10RecordsProp, r => r.classification || '') },
      { label: t('uiQualidadeMotoraPcd'), d: tally(pcdRecordsProp, r => r.classificacaoPerfil || '') },
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
  }, [statsStudentsList, imcRecordsProp, motorRecordsProp, sportRecordsProp, vocationalRecordsProp, healthRecordsProp, oralRecordsProp, autoconceptRecordsProp, iasRecordsProp, snapRecordsProp, aq10RecordsProp, pcdRecordsProp, attendanceByStudent, t]);

  const handleDownloadStats = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(15); doc.setTextColor(11, 19, 38);
    doc.text(t('tplPainelEstatisticoStatsscopelabel', { p0: displayValue(statsScopeLabel, t) }), 40, 46);
    doc.setFontSize(9); doc.setTextColor(90);
    doc.text(t('tplTotalAlunosEmitidoEm', { p0: displayValue(turmaStats.total, t), p1: displayValue(new Date().toLocaleDateString(locale), t) }), 40, 62);
    const f = turmaStats.frequency;
    doc.setFontSize(10); doc.setTextColor(11, 19, 38);
    doc.text(t('tplFrequenciaMediaFAvgExcelenteFExcellent', { p0: displayValue(f.avg, t), p1: displayValue(f.excellent, t), p2: displayValue(f.regular, t), p3: displayValue(f.critical, t), p4: displayValue(f.noData, t) }), 40, 84);
    let y = 100;
    turmaStats.dims.forEach(dim => {
      if (y > 760) { doc.addPage(); y = 50; }
      doc.setFontSize(11); doc.setTextColor(11, 19, 38);
      doc.text(t('tplDimensaoCobertura', { p0: displayValue(dim.label, t), p1: displayValue(dim.d.coverage, t), p2: displayValue(turmaStats.total, t), p3: displayValue(dim.d.coveragePct, t) }), 40, y);
      autoTable(doc, {
        startY: y + 6,
        head: [[t('tableCategoria'), t('tableAlunos'), t('tablePercentual')]],
        body: dim.d.distribution.map(x => [displayValue(x.label, t), String(x.count), turmaStats.total ? `${Math.round((x.count / turmaStats.total) * 100)}%` : '0%']),
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
    t('uiConsultandoFrequenciaDoEstudanteNoSistemaEletronico'),
    t('uiAvaliandoAnotacoesERegistrosDosProfissionaisOrientadores'),
    t('uiEstruturandoDadosComportamentaisEMatrizesPedagogicas'),
    t('uiFormatandoOParecerExecutivoFinalParaEntrega')
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
        setAiReport(t('tplNenhumRegistroEncontradoNenhumRelatorioDeDesempenho', { p0: displayValue(focusArea, t) }));
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
      alert(t('msgSelecioneUmAlunoDaListaAntesDe'));
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
      const dateStr = new Date().toLocaleDateString(locale);
      const rate = attendanceRate !== null ? attendanceRate.toFixed(1) : 'N/A';
      const absenceRate = attendanceRate !== null ? (100 - attendanceRate).toFixed(1) : 'N/A';
      const status = attendanceRate !== null ? (attendanceRate >= 75 ? t('valorExcelente') : attendanceRate >= 50 ? t('valorRegular') : t('uiCritico')) : 'N/A';

      // Fonte unica: usa o construtor compartilhado para todas as dimensoes.
      const reportCtx = makeReportCtx(focusArea, studentObj.name, studentObj.grade, observations, dateStr, savedReports.filter(r => r.studentId === studentObj.id).map(r => ({ focusArea: r.focusArea, report: r.report })));
      const builtReport = locale === 'pt-BR'
        ? buildAssessmentReport(reportCtx)
        : localizeAssessmentReport(reportCtx, t as ReportTranslator);
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

        generatedReport = t('tplFrequenciaEscolarAcumuladaRateStatusResumoDo', { p0: displayValue(rate, t), p1: displayValue(status, t), p2: displayValue(totalCount, t), p3: displayValue(presenceCount, t), p4: displayValue(rate, t), p5: displayValue(absenceCount, t), p6: displayValue(absenceRate, t), p7: displayValue(scenarioText, t), p8: displayValue(m3Analysis?.parecerFrequencia || frequencyText, t), p9: displayValue(m3Analysis?.parecerPais || parentsText, t), p10: displayValue(impactosText, t), p11: displayValue(observations || 'Nenhuma observação adicional registrada.', t), p12: displayValue(dateStr, t) });
      } else if (focusArea === 'Desempenho Corporal') {
        const selectedImc = imcRecords.find(r => r.id === selectedImcId);
        
        if (!selectedImc) {
          generatedReport = t('valorRelatorioDeDesempenhoCorporalNenhumRegistroDe');
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

          generatedReport = t('tplRelatorioDeDesempenhoCorporalDadosDaAvaliacao', { p0: displayValue(selectedImc.date, t), p1: displayValue(weight, t), p2: displayValue(height, t), p3: displayValue(imcValue, t), p4: displayValue(classification, t), p5: displayValue(statusM4, t), p6: displayValue(descriptionM4, t), p7: displayValue(observations || 'Nenhuma observação adicional registrada.', t), p8: displayValue(dateStr, t) });
        }
      } else if (focusArea === 'Desempenho de Capacidades Físicas') {
        const selectedMotor = motorRecords.find(r => r.id === selectedMotorId);
        
        if (!selectedMotor) {
          generatedReport = t('valorRelatorioDeDesempenhoDeCapacidadesFisicasNenhum');
        } else {
          // Normalize string helper for matching level in m5Data
          const norm = (s: string) => (s || '').toLowerCase().trim();
          
          // Get specific details for each of the 5 capabilities
          const getCapDetail = (capKey: string, levelName: string) => {
            const rows = m5Data[capKey] || [];
            // Match row where level matches levelName
            const match = rows.find(r => norm(r.level) === norm(levelName));
            const capName = capKey === 'forca_muscular' ? 'Força Muscular' : capKey === 'impulsao' ? 'Impulsão' : capKey.charAt(0).toUpperCase() + capKey.slice(1);
            return match || {
              healthStatus: t('tplACapacidadeDeCapkeyForcaMuscularForca', { p0: displayValue(capName, t), p1: displayValue(levelName, t) }),
              toImprove: t('tplFocarEmAtividadesProgressivasEAdaptadasPara', { p0: displayValue(capName, t) }),
              recommendation: t('textoEstimularAtividadesMotoras')
            };
          };

          const velDetail = getCapDetail('velocidade', selectedMotor.speed || 'Excelente');
          const forcaDetail = getCapDetail('forca_muscular', selectedMotor.strength || 'Excelente');
          const agilDetail = getCapDetail('agilidade', selectedMotor.agility || 'Excelente');
          const abdDetail = getCapDetail('abdomen', selectedMotor.abdomen || selectedMotor.coordination || 'Excelente');
          const impDetail = getCapDetail('impulsao', selectedMotor.impulsao || selectedMotor.flexibility || 'Excelente');

          generatedReport = t('tplRelatorioDeDesempenhoDeCapacidadesFisicasDados', { p0: displayValue(selectedMotor.date ? selectedMotor.date.split('-').reverse().join('/') : 'N/A', t), p1: displayValue(selectedMotor.speed || 'Excelente', t), p2: displayValue(selectedMotor.strength || 'Excelente', t), p3: displayValue(selectedMotor.agility || 'Excelente', t), p4: displayValue(selectedMotor.abdomen || selectedMotor.coordination || 'Excelente', t), p5: displayValue(selectedMotor.impulsao || selectedMotor.flexibility || 'Excelente', t), p6: displayValue(selectedMotor.generalClass || 'Excelente', t), p7: displayValue(selectedMotor.speed || 'Excelente', t), p8: displayValue(velDetail.healthStatus, t), p9: displayValue(velDetail.toImprove, t), p10: displayValue(velDetail.recommendation, t), p11: displayValue(selectedMotor.strength || 'Excelente', t), p12: displayValue(forcaDetail.healthStatus, t), p13: displayValue(forcaDetail.toImprove, t), p14: displayValue(forcaDetail.recommendation, t), p15: displayValue(selectedMotor.agility || 'Excelente', t), p16: displayValue(agilDetail.healthStatus, t), p17: displayValue(agilDetail.toImprove, t), p18: displayValue(agilDetail.recommendation, t), p19: displayValue(selectedMotor.abdomen || selectedMotor.coordination || 'Excelente', t), p20: displayValue(abdDetail.healthStatus, t), p21: displayValue(abdDetail.toImprove, t), p22: displayValue(abdDetail.recommendation, t), p23: displayValue(selectedMotor.impulsao || selectedMotor.flexibility || 'Excelente', t), p24: displayValue(impDetail.healthStatus, t), p25: displayValue(impDetail.toImprove, t), p26: displayValue(impDetail.recommendation, t), p27: displayValue(observations || 'Nenhuma observação específica registrada pelo educador para este período.', t), p28: displayValue(dateStr, t) });
        }
      } else if (focusArea === 'Desempenho em Atividades Esportivas') {
        const selectedSport = sportRecords.find(r => r.id === selectedSportId);

        if (!selectedSport) {
          generatedReport = t('valorRelatorioDeDesempenhoEmAtividadesEsportivasNenhum');
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
              criterio: t('textoEstaViaDeveSerAdotadaSeTres'),
              conduta: t('textoDesaconselhoTotalmenteAEspecializacaoPrecoceEmEsportes'),
              objetivo: t('textoOFocoExclusivoDesteDirecionamentoERestaurar')
            };

            generatedReport = t('tplRelatorioDeDiretrizesDeIntervencaoMotorasDados', { p0: displayValue(selectedSport.date ? selectedSport.date.split('-').reverse().join('/') : 'N/A', t), p1: displayValue(selectedSport.biotype || 'Não avaliado', t), p2: displayValue(selectedSport.mainSkill || 'Não avaliado', t), p3: displayValue(activeSportName, t), p4: displayValue(selectedSport.recommendedPractice || 'Não avaliado', t), p5: displayValue(matchedDiretriz.diretriz, t), p6: displayValue(matchedDiretriz.criterio, t), p7: displayValue(matchedDiretriz.conduta, t), p8: displayValue(matchedDiretriz.objetivo, t), p9: displayValue(observations || 'Nenhuma observação complementar registrada.', t), p10: displayValue(dateStr, t) });
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
              matchedModalitiesText = activeMods.map(mod => t('tplModNameReplaceU200dUfe0fGTrim', { p0: displayValue((mod.name || '').replace(/[🥋🏐🏃🏊⚽🤾🤸🏀♂♀\u200d\ufe0f]/g, '').trim(), t), p1: displayValue(mod.valencias, t), p2: displayValue(mod.condition, t), p3: displayValue(mod.report, t) })).join('\n\n');
            } else if (matchedMods.length > 0) {
              matchedModalitiesText = matchedMods.map(mod => t('tplModNameReplaceU200dUfe0fGTrim', { p0: displayValue((mod.name || '').replace(/[🥋🏐🏃🏊⚽🤾🤸🏀♂♀\u200d\ufe0f]/g, '').trim(), t), p1: displayValue(mod.valencias, t), p2: displayValue(mod.condition, t), p3: displayValue(mod.report, t) })).join('\n\n');
            } else {
              matchedModalitiesText = t('tplNaoFoiEncontradoUmEnquadramentoExatoPara', { p0: displayValue(activeSportName, t) });
            }

            generatedReport = t('tplRelatorioDeDesempenhoEmAtividadesEsportivasDados', { p0: displayValue(selectedSport.date ? selectedSport.date.split('-').reverse().join('/') : 'N/A', t), p1: displayValue(selectedSport.biotype || 'Não avaliado', t), p2: displayValue(selectedSport.mainSkill || 'Não avaliado', t), p3: displayValue(activeSportName, t), p4: displayValue(selectedSport.recommendedPractice || 'Não avaliado', t), p5: displayValue(matchedModalitiesText, t), p6: displayValue(observations || 'Nenhuma observação complementar registrada.', t), p7: displayValue(dateStr, t) });
          }
        }
      } else if (focusArea === 'Desempenho Vocacional') {
        const selectedVocation = vocationRecords.find(r => r.id === selectedVocationId);
        if (!selectedVocation) {
          generatedReport = t('valorRelatorioDeDesempenhoVocacionalNenhumRegistroDe');
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
            row.component === t('uiMapaDePerfisECarreiras')
          );
          
          // Match in m7Rows for Recomendações Pedagógicas
          const recRow = m7Rows.find(row => 
            normalizeProfileName(row.profile) === targetNorm && 
            row.component === t('uiRecomendacoesPedagogicas')
          );

          const basicDataMapa = mapaRow?.basicData || t('tplDadosBasicosNaoCadastradosParaOPerfil', { p0: displayValue(profile, t) });
          const reflectionMapa = mapaRow?.reflection || t('tplReflexaoNaoCadastradaParaOPerfilProfile', { p0: displayValue(profile, t) });
          
          const basicDataRec = recRow?.basicData || t('tplDiretrizesPedagogicasNaoCadastradasParaOPerfil', { p0: displayValue(profile, t) });
          const reflectionRec = recRow?.reflection || t('tplImersaoDeMercadoNaoCadastradaParaO', { p0: displayValue(profile, t) });

          generatedReport = t('tplRelatorioDeDesempenhoVocacionalEstudanteStudentobjName', { p0: displayValue(studentObj.name, t), p1: displayValue(selectedVocation.date ? selectedVocation.date.split('-').reverse().join('/') : 'N/A', t), p2: displayValue(profile, t), p3: displayValue(basicDataMapa, t), p4: displayValue(reflectionMapa !== (selectedVocation.technicalOpinion || '') ? t('tplAnaliseCognitivaPsicologica', { p0: displayValue(reflectionMapa, t) }) : '', t), p5: displayValue(basicDataRec, t), p6: displayValue(reflectionRec, t), p7: displayValue(selectedVocation.technicalOpinion || 'Nenhum parecer técnico inserido no registro de vocacionamento original.', t), p8: displayValue(observations || 'Nenhuma observação complementar registrada para este período.', t), p9: displayValue(dateStr, t) });
        }
      } else if (focusArea === 'Desempenho Saúde Global') {
        const selectedHealth = healthRecords.find(r => r.id === selectedHealthId);
        if (!selectedHealth) {
          generatedReport = t('valorRelatorioDeDesempenhoSaudeGlobalNenhumRegistro');
        } else {
          const classification = selectedHealth.classification || 'Não classificado';
          const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const m9match = m9Rows.find(row => normCls(row.classification) === normCls(classification));
          const basicData = m9match?.basicData || t('tplDadosDaClassificacaoClassificationNaoCadastradosNo', { p0: displayValue(classification, t) });
          const reflection = m9match?.reflection || '';

          generatedReport = t('tplRelatorioDeDesempenhoSaudeGlobalKidscreen10', { p0: displayValue(studentObj.name, t), p1: displayValue(selectedHealth.date ? selectedHealth.date.split('-').reverse().join('/') : 'N/A', t), p2: displayValue(selectedHealth.rawScore, t), p3: displayValue(Number(selectedHealth.tScore).toFixed(2), t), p4: displayValue(classification, t), p5: displayValue(basicData, t), p6: displayValue(selectedHealth.technicalOpinion || reflection || 'Nenhum parecer técnico inserido no registro de Saúde Global original.', t), p7: displayValue(observations || 'Nenhuma observação complementar registrada para este período.', t), p8: displayValue(dateStr, t) });
        }
      } else if (focusArea === 'Desempenho Higiene Bucal') {
        const selectedOral = oralRecords.find(r => r.id === selectedOralId);
        if (!selectedOral) {
          generatedReport = t('valorRelatorioDeDesempenhoHigieneBucalNenhumRegistro');
        } else {
          const classification = selectedOral.classification || 'Não classificado';
          const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const m10match = m10Rows.find(row => normCls(row.classification) === normCls(classification));
          const basicData = m10match?.basicData || t('tplFaixaDaClassificacaoClassificationNaoCadastradaNo', { p0: displayValue(classification, t) });
          const reflection = m10match?.reflection || '';

          generatedReport = t('tplRelatorioDeDesempenhoHigieneBucalHuDbi', { p0: displayValue(studentObj.name, t), p1: displayValue(selectedOral.date ? selectedOral.date.split('-').reverse().join('/') : 'N/A', t), p2: displayValue(selectedOral.score, t), p3: displayValue(classification, t), p4: displayValue(basicData, t), p5: displayValue(selectedOral.technicalOpinion || reflection || 'Nenhum parecer técnico inserido no registro de Higiene Bucal original.', t), p6: displayValue(observations || 'Nenhuma observação complementar registrada para este período.', t), p7: displayValue(dateStr, t) });
        }
      } else if (focusArea === 'Desempenho Autoconceito') {
        const selectedAuto = autoconceptRecords.find(r => r.id === selectedAutoId);
        if (!selectedAuto) {
          generatedReport = t('valorRelatorioDeDesempenhoAutoconceitoNenhumRegistroDe');
        } else {
          const classification = selectedAuto.classification || 'Não classificado';
          const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const m11match = m11Rows.find(row => normCls(row.classification) === normCls(classification));
          const basicData = m11match?.basicData || t('tplFaixaDaClassificacaoClassificationNaoCadastradaNo2', { p0: displayValue(classification, t) });
          const reflection = m11match?.reflection || '';

          generatedReport = t('tplRelatorioDeDesempenhoAutoconceitoEscalaDeRosenberg', { p0: displayValue(studentObj.name, t), p1: displayValue(selectedAuto.date ? selectedAuto.date.split('-').reverse().join('/') : 'N/A', t), p2: displayValue(selectedAuto.score, t), p3: displayValue(classification, t), p4: displayValue(basicData, t), p5: displayValue(selectedAuto.technicalOpinion || reflection || 'Nenhum parecer técnico inserido no registro de Autoconceito original.', t), p6: displayValue(observations || 'Nenhuma observação complementar registrada para este período.', t), p7: displayValue(dateStr, t) });
        }
      } else if (focusArea === 'Desempenho Índice Alimentar') {
        const selectedIas = iasRecords.find(r => r.id === selectedIasId);
        if (!selectedIas) {
          generatedReport = t('valorRelatorioDeDesempenhoIndiceAlimentarNenhumRegistro');
        } else {
          const classification = selectedIas.classification || 'Não classificado';
          const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const m12match = m12Rows.find(row => normCls(row.classification) === normCls(classification));
          const basicData = m12match?.basicData || t('tplFaixaDaClassificacaoClassificationNaoCadastradaNo3', { p0: displayValue(classification, t) });
          const reflection = m12match?.reflection || '';

          generatedReport = t('tplRelatorioDeDesempenhoIndiceAlimentarIasEstudante', { p0: displayValue(studentObj.name, t), p1: displayValue(selectedIas.date ? selectedIas.date.split('-').reverse().join('/') : 'N/A', t), p2: displayValue(selectedIas.totalScore, t), p3: displayValue(classification, t), p4: displayValue(basicData, t), p5: displayValue(selectedIas.technicalOpinion || reflection || 'Nenhum parecer técnico inserido no registro de Índice Alimentar original.', t), p6: displayValue(observations || 'Nenhuma observação complementar registrada para este período.', t), p7: displayValue(dateStr, t) });
        }
      } else if (focusArea === 'Desempenho Rastreamento TDAH') {
        const selectedSnap = snapRecords.find(r => r.id === selectedSnapId);
        if (!selectedSnap) {
          generatedReport = t('valorRelatorioDeDesempenhoRastreamentoDoTdahNenhum');
        } else {
          const classification = selectedSnap.classification || 'Não classificado';
          const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const m13match = m13Rows.find(row => normCls(row.classification) === normCls(classification));
          const basicData = m13match?.basicData || t('tplClassificacaoClassificationNaoCadastradaNoModulo13', { p0: displayValue(classification, t) });
          const reflection = m13match?.reflection || '';

          generatedReport = t('tplRelatorioDeDesempenhoRastreamentoDoTdahSnap', { p0: displayValue(studentObj.name, t), p1: displayValue(selectedSnap.date ? selectedSnap.date.split('-').reverse().join('/') : 'N/A', t), p2: displayValue(selectedSnap.respondent || 'Não informado', t), p3: displayValue(selectedSnap.inattentionScore, t), p4: displayValue(selectedSnap.hyperactivityScore, t), p5: displayValue(classification, t), p6: displayValue(basicData, t), p7: displayValue(selectedSnap.technicalOpinion || reflection || 'Nenhum parecer técnico inserido no registro de Rastreamento do TDAH original.', t), p8: displayValue(observations || 'Nenhuma observação complementar registrada para este período.', t), p9: displayValue(dateStr, t) });
        }
      } else if (focusArea === 'Desempenho Rastreamento Precoce do TEA') {
        const selectedAq10 = aq10Records.find(r => r.id === selectedAq10Id);
        if (!selectedAq10) {
          generatedReport = t('valorRelatorioDeDesempenhoRastreamentoPrecoceDoTea');
        } else {
          const classification = selectedAq10.classification || 'Não classificada';
          const normClsLocal = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const m14match = m14Rows.find(row => normClsLocal(row.classification) === normClsLocal(classification));
          const basicData = m14match?.basicData || t('tplClassificacaoClassificationNaoCadastradaNoModulo14', { p0: displayValue(classification, t) });
          const reflection = m14match?.reflection || '';

          generatedReport = t('tplRelatorioDeDesempenhoRastreamentoPrecoceDoTea', { p0: displayValue(studentObj.name, t), p1: displayValue(selectedAq10.date ? selectedAq10.date.split('-').reverse().join('/') : 'N/A', t), p2: displayValue(selectedAq10.respondent || 'Não informado', t), p3: displayValue(selectedAq10.version === 'adolescente' ? 'Adolescente (12 a 15 anos)' : 'Criança (4 a 11 anos)', t), p4: displayValue(selectedAq10.totalScore, t), p5: displayValue(classification, t), p6: displayValue(basicData, t), p7: displayValue(selectedAq10.technicalOpinion || reflection || 'Nenhum parecer técnico inserido no registro de Rastreamento Precoce do TEA original.', t), p8: displayValue(observations || 'Nenhuma observação complementar registrada para este período.', t), p9: displayValue((selectedAq10.totalScore ?? 0) <= 6
    ? 'Pontuação de 0 a 6: traços comportamentais dentro da média da população geral; acompanhamento rotineiro do desenvolvimento.'
    : 'Pontuação de 7 a 10: alerta de traços elevados de TEA; recomendação de encaminhamento prioritário para avaliação multidisciplinar especializada (neuropediatra ou psiquiatra infantil e neuropsicólogo).', t), p10: displayValue(dateStr, t) });
        }
      } else if (focusArea === 'Desempenho Qualidade Motora PCD') {
        const selectedPcd = pcdRecords.find(r => r.id === selectedPcdId);
        if (!selectedPcd) {
          generatedReport = t('valorRelatorioDeDesempenhoQualidadeMotoraPcdNenhuma');
        } else {
          const grupoNome = selectedPcd.grupoNome || t('tplGrupoP0', { p0: displayValue(selectedPcd.grupo, t) });
          const valenciaLabels: { label: string; nota: number }[] = [
            { label: t('uiVelocidadeEAgilidade'), nota: selectedPcd.notaVelAgil },
            { label: t('uiForcaExplosivaMembrosInf'), nota: selectedPcd.notaForcaExplosiva },
            { label: t('uiForcaMembrosSuperiores'), nota: selectedPcd.notaMembrosSup },
            { label: t('uiEstabilidadeDeTroncoCore'), nota: selectedPcd.notaCore },
          ];
          const valenciaStr = valenciaLabels.map(v => t('tplValenciaNota', { p0: displayValue(v.label, t), p1: displayValue(v.nota, t) })).join('\n');
          const compat = selectedPcd.compatibilidade.length
            ? selectedPcd.compatibilidade.map((c, i) => t('tplCompatibilidadeItem', { p0: displayValue(i + 1, t), p1: displayValue(c.modalidade, t), p2: displayValue(c.iar.toFixed(2), t), p3: c.iarNormalizado != null ? t('tplCompatibilidadeNormalizado', { p0: displayValue(c.iarNormalizado.toFixed(2), t) }) : '' })).join('\n')
            : t('uiSemDadosDeCompatibilidadeRegistrados');
          const funilPcd = selectedPcd.funil ?? [];
          const funilStr = funilPcd.length
            ? funilPcd.map(f => `${f.momento}. **${f.titulo}:** ${f.regra}`).join('\n')
            : t('uiFunilQualitativoNaoRegistradoNestaAvaliacao');
          const adaptStr = (selectedPcd.adaptacoesAplicadas ?? [])
            .filter(a => a.status === 'Adaptado' || a.status === 'Substituído')
            .map(a => `- **${a.teste}** (${a.status}): ${a.instrucao}`).join('\n');
          const topPcd = selectedPcd.compatibilidade.length > 0 ? selectedPcd.compatibilidade[0].modalidade : t('uiAComplementar');

          generatedReport = t('tplRelatorioDeDesempenhoQualidadeMotoraPcdEstudante', { p0: displayValue(studentObj.name, t), p1: displayValue(selectedPcd.date ? selectedPcd.date.split('-').reverse().join('/') : 'N/A', t), p2: displayValue(grupoNome, t), p3: displayValue(selectedPcd.detalheClassificacao || 'Geral', t), p4: displayValue(selectedPcd.classificacaoPerfil, t), p5: displayValue(valenciaStr, t), p6: displayValue(compat, t), p7: displayValue(topPcd, t), p8: displayValue(adaptStr || '- Nenhum teste adaptado ou substituído neste grupo.', t), p9: displayValue(funilStr, t), p10: displayValue(selectedPcd.technicalOpinion || 'Nenhum parecer técnico inserido no registro de Avaliação PCD original.', t), p11: displayValue(observations || 'Nenhuma observação complementar registrada para este período.', t), p12: displayValue(dateStr, t) });
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
          generatedReport = t('tplParecerIntegradoDeDesempenhoCompletoEstudanteStudentobj', { p0: displayValue(studentObj.name, t), p1: displayValue(studentObj.grade || 'Não informada', t), p2: displayValue(dateStr, t) });
        } else {
          generatedReport = t('tplParecerIntegradoDeDesempenhoCompletoEstudanteStudentobj2', { p0: displayValue(studentObj.name, t), p1: displayValue(studentObj.grade || 'Não informada', t), p2: displayValue(dateStr, t), p3: displayValue(studentObj.name, t), p4: displayValue(reportEscolar ? reportEscolar.report : '*Nenhum relatório de Desempenho Escolar foi encontrado no histórico.*', t), p5: displayValue(reportCorporal ? reportCorporal.report : '*Nenhum relatório de Desempenho Corporal foi encontrado no histórico.*', t), p6: displayValue(reportMotor ? reportMotor.report : '*Nenhum relatório de Capacidades Físicas foi encontrado no histórico.*', t), p7: displayValue(reportEsportivo ? reportEsportivo.report : '*Nenhum relatório de Desempenho Esportivo foi encontrado no histórico.*', t), p8: displayValue(reportVocacional ? reportVocacional.report : '*Nenhum relatório de Desempenho Vocacional foi encontrado no histórico.*', t), p9: displayValue(reportSaudeGlobal ? reportSaudeGlobal.report : '*Nenhum relatório de Saúde Global foi encontrado no histórico.*', t), p10: displayValue(reportHigieneBucal ? reportHigieneBucal.report : '*Nenhum relatório de Higiene Bucal foi encontrado no histórico.*', t), p11: displayValue(reportAutoconcept ? reportAutoconcept.report : '*Nenhum relatório de Autoconceito foi encontrado no histórico.*', t), p12: displayValue(reportIas ? reportIas.report : '*Nenhum relatório de Índice Alimentar foi encontrado no histórico.*', t), p13: displayValue(observations || 'Nenhum parecer integrador ou observação complementar geral registrada pelo educador para esta consolidação.', t), p14: displayValue(dateStr, t) });
        }
      } else {
        // Simple template for other areas if AI is removed
        const absenceCount = totalCount - presenceCount;

        generatedReport = t('tplFrequenciaEscolarAcumuladaRateStatusResumoDo2', { p0: displayValue(rate, t), p1: displayValue(status, t), p2: displayValue(totalCount, t), p3: displayValue(presenceCount, t), p4: displayValue(rate, t), p5: displayValue(absenceCount, t), p6: displayValue(absenceRate, t), p7: displayValue(focusArea, t), p8: displayValue(observations || 'Nenhuma observação específica registrada pelo educador para este período.', t), p9: displayValue(dateStr, t) });
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
      const currentDateString = new Date().toLocaleDateString(locale);
      
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
      setErrorMessage(err instanceof Error ? err.message : t('uiVerifiqueSeSuaChaveDeApiDo'));
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  // "Adicionar Informacoes": grava/atualiza a anotacao do educador no relatorio ja
  // existente daquela avaliacao. Se ainda nao existir, cria gerando normalmente.
  const handleAddInfo = async () => {
    if (!selectedStudentId) {
      alert(t('msgSelecioneUmAlunoDaListaAntesDe2'));
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
      const dateStr = new Date().toLocaleDateString(locale);
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
      setBackfillMsg(t('tplProntoWroteRelatorioSGeradoSAtualizado', { p0: displayValue(wrote, t) }));
    } catch (e) {
      console.error('Backfill da turma falhou:', e);
      setBackfillMsg(t('msgFalhaAoGerarRelatoriosDaTurma'));
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
        <h5 className="text-[16px] font-black text-[#8ed5ff] uppercase tracking-wider">📊 {statsScopeLabel} · {turmaStats.total}  {t('uiAlunoS')}</h5>
        <button
          type="button"
          onClick={handleDownloadStats}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#38bdf8]/15 hover:bg-[#38bdf8]/25 border border-[#38bdf8]/40 rounded-lg text-[#38bdf8] text-[13px] font-bold transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />  {t('uiBaixarPdf')}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-[13px] font-mono text-[#bdc8d1]/85">
        <span>{t('uiFreqMedia')} <strong className="text-[15px] text-white">{turmaStats.frequency.avg}%</strong></span>
        <span className="text-emerald-400">{t('uiExcelente')} <strong className="text-white">{turmaStats.frequency.excellent}</strong></span>
        <span className="text-amber-400">{t('uiRegular')} <strong className="text-white">{turmaStats.frequency.regular}</strong></span>
        <span className="text-rose-400">{t('uiCritico2')} <strong className="text-white">{turmaStats.frequency.critical}</strong></span>
        <span className="text-[#bdc8d1]/50">{t('uiSemDados')} <strong className="text-white">{turmaStats.frequency.noData}</strong></span>
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
                <span className="text-[13px] text-[#bdc8d1]/50 italic">{t('uiNenhumaAvaliacaoRegistrada')}</span>
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
            <h4 className="text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{isPainelEstatistico ? t('uiPainelDeControle') : t('uiPainelDeControleDeDesempenho')}</h4>
          </div>
          {isSupabaseConfigured && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono font-bold" title={t('uiSincronizacaoEmTempoRealAtivadaComSupabase')}>
              <Database className="w-3 h-3 animate-pulse" />
              <span>{t('uiSincronizado')}</span>
            </span>
          )}
        </div>

        {user?.role === 'Aluno' && loggedInStudentObj ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="bg-[#0b1326] rounded-xl p-3 border border-[#3e484f]/25 font-mono text-xs flex flex-wrap gap-x-4 gap-y-1.5 flex-1 w-full">
              <div className="flex items-center gap-2">
                <StudentAvatar student={loggedInStudentObj} size="h-7 w-7" text="text-[9px]" />
                <div>
                  <span className="text-[#bdc8d1]/60">{t('uiEstudante')}</span>{' '}
                  <strong className="text-white">{loggedInStudentObj.name}</strong>
                </div>
              </div>
              <div>
                <span className="text-[#bdc8d1]/60">{t('uiMatricula')}</span>{' '}
                <strong className="text-[#8ed5ff]">{loggedInStudentObj.enrollmentId || loggedInStudentObj.id}</strong>
              </div>
              <div>
                <span className="text-[#bdc8d1]/60">{t('uiSerieTurma')}</span>{' '}
                <strong className="text-[#8ed5ff]">{loggedInStudentObj.grade}</strong>
              </div>
              <div>
                <span className="text-[#bdc8d1]/60">{t('uiUnidade')}</span>{' '}
                <strong className="text-[#8ed5ff]">{displayValue(loggedInStudentObj.locality || 'Centro', t)}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {isAnaliseGeral ? (
                <div className="space-y-1 min-w-[200px] w-full md:w-auto">
                  <label className="text-[10px] font-semibold text-[#bdc8d1]/90 flex items-center gap-1">
                    <Flag className="w-3 h-3 text-[#38bdf8]" />
                    
                    {t('uiDimensaoDeFoco')}
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
                    
                    {t('uiHistoricoDeRelatorios')}
                  </label>
                  <select
                    value={selectedReportId}
                    onChange={(e) => handleSelectGlobalReport(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                  >
                    {orderedHistoryReports.map(r => (
                      <option key={r.id} value={r.id}>
                        [{toBrDate(r.date)}] {displayValue(r.focusArea, t)}
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
                  title={t('uiBaixarRelatorioComoPdf')}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('uiBaixarPdf')}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">
            {/* 1. Contrato */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <label className="text-[10px] font-bold text-[#bdc8d1]/85 block uppercase tracking-tight">{t('uiContrato')}</label>
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
                <option value="">{isHydrating ? t('uiCarregando') : t('uiSelecione')}</option>
                {!isHydrating && isUserAdmin && <option value={t('uiTodos')}>{t('uiTodos')}</option>}
                {!isHydrating && availableContracts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* 2. Estado */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <label className="text-[10px] font-bold text-[#bdc8d1]/85 block uppercase tracking-tight">{t('uiEstado')}</label>
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
                <option value="">{isHydrating ? t('uiCarregando') : t('uiSelecione')}</option>
                {!isHydrating && isUserAdmin && contract === t('uiTodos') && <option value={t('uiTodos')}>{t('uiTodos')}</option>}
                {!isHydrating && availableStates.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* 3. Região */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <label className="text-[10px] font-bold text-[#bdc8d1]/85 block uppercase tracking-tight">{t('uiRegiao')}</label>
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
                <option value="">{isHydrating ? t('uiCarregando') : t('uiSelecione')}</option>
                {!isHydrating && isUserAdmin && (contract === 'Todos' || stateFilter === 'Todos') && <option value="Todos">{t('uiTodas')}</option>}
                {!isHydrating && availableRegions.map(reg => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
            </div>

            {/* 4. Localidade */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <label className="text-[10px] font-bold text-[#bdc8d1]/85 block uppercase tracking-tight">{t('uiLocalidade')}</label>
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
                <option value="">{isHydrating ? t('uiCarregando') : t('uiSelecione')}</option>
                {!isHydrating && isUserAdmin && (contract === 'Todos' || stateFilter === 'Todos' || cityFilter === 'Todos' || cityFilter === t('uiTodas')) && <option value="Todos">{t('uiTodas')}</option>}
                {!isHydrating && availableLocalities.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* 5. Série ou Turma */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#bdc8d1]/85 block uppercase tracking-tight">{t('uiSerieTurma2')}</label>
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
                <option value="">{t('uiSelecione')}</option>
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
                    
                    {t('uiDimensaoDeFoco')}
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
                  
                  {t('uiHistorico')}
                </label>
                <select
                  value={selectedReportId}
                  onChange={(e) => handleSelectGlobalReport(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                >
                  {orderedHistoryReports.map(r => (
                    <option key={r.id} value={r.id}>
                      [{toBrDate(r.date)}] {r.studentName} - {displayValue(r.focusArea, t)}
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
                  title={t('uiBaixarRelatorioComoPdf')}
                >
                  <Download className="w-4 h-4" />
                  <span>{t('uiPdf')}</span>
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
                  <h4 className="text-[#38bdf8] font-bold mb-1 uppercase tracking-wider">{t('uiOla')} {loggedInStudentObj?.name}!</h4>
                  <p>{t('uiEsteEOSeuPainelDeAnalise')}</p>
                </div>
                
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#bdc8d1] uppercase tracking-widest block">{t('uiDimensaoDeFoco2')}</label>
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
                      
                      {t('uiHistoricoDisponivel')}{studentFocusReports.length})
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
                      <option value="">{t('uiSelecioneUmaVersao')}</option>
                      {studentFocusReports.map((r, index) => (
                        <option key={r.id} value={r.id}>
                          
                          {t('uiRelatorio')} {index === 0 ? t('uiMaisRecente') : ''}- {r.date}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[#bdc8d1]/60 leading-tight">
                      
                      {t('uiHa')} {studentFocusReports.length}  {t('uiRelatoriosNesteFocoSelecioneAVersaoDesejada')}
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
                  <span>{t('uiVerMeuDesempenho')}</span>
                </button>
              </section>

              <section className="lg:col-span-3 bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-6 shadow-lg min-h-[400px] flex flex-col">
                <div className="flex justify-between items-center border-b border-[#3e484f]/25 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-[#38bdf8]" />
                    <h3 className="text-sm font-bold text-white">{t('uiRelatorioConsolidado')}</h3>
                  </div>
                  {aiReport && (
                    <button
                      onClick={handleGeneratePDF}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-1 rounded hover:bg-[#38bdf8]/20 transition-all cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      
                      {t('uiPdf')}
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12">
                    <div className="w-10 h-10 rounded-full border-2 border-[#3e484f] border-t-[#38bdf8] animate-spin"></div>
                    <p className="text-[10px] text-[#bdc8d1] animate-pulse">{t('uiCarregandoSuaAnalise')}</p>
                  </div>
                ) : aiReport ? (
                  <div className="prose prose-invert max-w-none text-[#dae2fd] text-xs leading-relaxed overflow-y-auto max-h-[500px] pr-2 scrollbar-thin scrollbar-thumb-surface-container">
                    {renderMarkdown(aiReport)}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-[#bdc8d1]/60 space-y-3">
                    <Sparkles className="w-8 h-8 text-[#3e484f]" />
                    <p className="text-[11px] max-w-xs">{t('uiCliqueNoBotaoParaGerarSuaAnalise')}</p>
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
                    <h3 className="text-lg font-bold text-white tracking-tight">{t('uiPainelEstatistico')}</h3>
                    <p className="text-xs text-[#bdc8d1]/70">{t('uiVisaoConsolidadaPorContratoEstadoRegiaoLocalidade')}</p>
                  </div>
                </div>
              </div>
              {statsStudentsList.length > 0 ? (statsPanelInner) : (
                <div className="bg-[#0b1326]/50 rounded-xl p-12 border border-dashed border-[#3e484f]/40 text-center">
                  <div className="max-w-sm mx-auto space-y-4">
                    <div className="w-16 h-16 bg-[#1a2b4b] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-[#38bdf8]/40" />
                    </div>
                    <h4 className="text-sm font-bold text-[#dae2fd]">{t('uiSelecioneUmFiltro')}</h4>
                    <p className="text-xs text-[#bdc8d1]/80 leading-relaxed">
                      
                      {t('uiUseOsFiltrosAcimaContratoEstadoRegiao')}
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
                    <h3 className="text-lg font-bold text-white tracking-tight">{t('uiAnaliseGeralExportacaoEmLote')}</h3>
                    <p className="text-xs text-[#bdc8d1]/70">{t('uiDownloadEmPdfDeRelatoriosPorTurmas')}</p>
                  </div>
                </div>
                
                {gradeFilter && activeStudentsList.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleToggleSelectAll}
                      className="px-3 py-1.5 bg-[#0b1326] border border-[#3e484f]/40 hover:border-[#38bdf8]/50 rounded-lg text-[10px] font-bold text-[#bdc8d1] transition-all cursor-pointer"
                    >
                      {selectedStudentIdsForBatch.length === activeStudentsList.length ? t('uiDesmarcarTodos') : t('uiMarcarTodos')}
                    </button>
                    <button
                      onClick={handleBatchDownloadZip}
                      className="flex items-center gap-2 px-4 py-1.5 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#0b1326] rounded-lg text-xs font-black transition-all shadow-lg shadow-[#38bdf8]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      <Download className="w-4 h-4" />
                      <span>{loading ? t('msgProcessando') : t('tplBaixarSelecionados', { p0: displayValue(selectedStudentIdsForBatch.length, t) })}</span>
                    </button>
                    <button
                      onClick={handleFillReportsTurma}
                      disabled={backfilling || loading}
                      className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-[#0b1326] rounded-lg text-xs font-black transition-all shadow-lg cursor-pointer"
                      title={t('uiGeraAtualizaOsRelatoriosDeTodosOs')}
                    >
                      <Download className={`w-4 h-4 ${backfilling ? 'animate-bounce' : ''}`} />
                      <span>{backfilling ? t('msgGerando') : t('uiPreencherRelatorios')}</span>
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
                        <p className="text-[10px] text-[#bdc8d1]/70 font-mono">{backfillProgress.done}/{backfillProgress.total}  {t('uiRelatoriosProcessados')}</p>
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
                    <h4 className="text-sm font-bold text-[#dae2fd]">{t('uiSelecioneUmaSerieTurma')}</h4>
                    <p className="text-xs text-[#bdc8d1]/80 leading-relaxed">
                      
                      {t('uiParaVisualizarAListaDeAlunosE')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#bdc8d1] uppercase tracking-widest">{t('uiAlunosDaTurma')} {gradeFilter}</span>
                    <span className="text-[10px] text-[#38bdf8] font-mono">{activeStudentsList.length}  {t('uiRegistrosEncontrados')}</span>
                  </div>
                  
                  {activeStudentsList.length === 0 ? (
                    <div className="bg-[#0b1326]/50 rounded-xl p-4 sm:p-8 border border-[#3e484f]/25 text-center text-xs text-[#bdc8d1]/50 italic">
                      
                      {t('uiNenhumAlunoEncontradoParaEstaSelecao')}
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
                              <p className="text-[9px] text-[#bdc8d1]/60 font-mono">{t('uiId')} {s.enrollmentId || s.id.substring(0, 8)}</p>
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
            
            {t('uiAmbienteExclusivoParaConsultaIndividualDoAluno')}
          </div>
        ) : !gradeFilter ? (
          <div className="bg-[#0b1326]/50 rounded-xl p-6 border border-[#3e484f]/25 text-center space-y-3 py-10">
            <Users className="w-10 h-10 text-[#bdc8d1]/30 mx-auto" />
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">{t('uiAguardandoTurma')}</h5>
            <p className="text-[11px] text-[#bdc8d1]/65 leading-relaxed">
              {t.rich('uiSelecioneUmaSerieOuTurmaNoSubmenuAcimaParaVisualizarAListaDeAlunosDaClasse', { strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#3e484f]/25 pb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#38bdf8]" />
                <h4 className="text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('uiAlunos')}{activeStudentsList.length})</h4>
              </div>
              <span className="text-[10px] bg-[#38bdf8]/10 text-[#38bdf8] px-2 py-0.5 rounded-full font-bold">
                
                {t('uiTurma')} {gradeFilter}
              </span>
            </div>

            {activeStudentsList.length === 0 ? (
              <p className="text-xs text-[#bdc8d1]/50 italic text-center py-6">{t('uiNenhumAlunoAtivoEncontradoNestaTurma')}</p>
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
                          
                          {t('uiMatricula')} {s.enrollmentId || s.id.substring(0, 8)}
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
                <h5 className="text-[11px] font-bold text-[#bdc8d1] uppercase tracking-wider">{t('uiConfiguracaoDoRelatorio')}</h5>
              </div>
              {selectedReportId && (
                <button
                  type="button"
                  onClick={() => handleDeleteReport(selectedReportId)}
                  className="p-2 px-2 bg-red-900/40 hover:bg-red-950 border border-red-500/30 rounded text-red-400 text-[10px] font-bold transition-colors cursor-pointer"
                  title={t('uiExcluirEsteRelatorioSalvo')}
                >
                  
                  {t('uiExcluirSalvo')}
                </button>
              )}
            </div>

            {/* Attendance display if available */}
            {attendanceRate !== null && (
              <div className="p-3 bg-[#0b1326] rounded-xl border border-[#3e484f]/40 flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-[#bdc8d1]/60 uppercase font-bold tracking-tight">{t('uiFrequenciaEscolarAcumulada')}</p>
                  <p className="text-xs font-black text-white">{attendanceRate.toFixed(1)}%</p>
                </div>
                <div className={`px-2 py-0.5 rounded text-[9px] font-bold ${attendanceRate >= 75 ? 'bg-emerald-500/20 text-emerald-400' : attendanceRate >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {attendanceRate >= 75 ? t('valorExcelente') : attendanceRate >= 50 ? t('valorRegular') : t('uiCritico')}
                </div>
              </div>
            )}

            {/* Focus Area Selection */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#bdc8d1]/90 block">{t('uiDimensaoDeFoco3')}</label>
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
                  
                  {t('uiAvaliacaoDeImc')}
                </label>
                <select
                  value={selectedImcId}
                  onChange={(e) => setSelectedImcId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-colors"
                >
                  {imcRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date}  {t('uiImc')} {rec.imc} ({displayValue(rec.classification, t)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Corporal' && imcRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">{t('uiEsteAlunoNaoPossuiAvaliacoesDeImc')}</p>
              </div>
            )}

            {/* Motor Record Selection for Desempenho de Capacidades Físicas */}
            {focusArea === 'Desempenho de Capacidades Físicas' && motorRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  
                  {t('uiQualidadeMotora')}
                </label>
                <select
                  value={selectedMotorId}
                  onChange={(e) => setSelectedMotorId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-colors"
                >
                  {motorRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : t('uiSemData')}  {t('uiGeral')} {displayValue(rec.generalClass || 'Não classificado', t)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho de Capacidades Físicas' && motorRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">{t('uiEsteAlunoNaoPossuiAvaliacoesDeQualidade')}</p>
              </div>
            )}

            {/* Sport Record Selection */}
            {focusArea === 'Desempenho em Atividades Esportivas' && sportRecords.length > 0 && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    
                    {t('uiAvaliacaoEsportiva')}
                  </label>
                  <select
                    value={selectedSportId}
                    onChange={(e) => setSelectedSportId(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-colors font-bold"
                  >
                    {sportRecords.map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.date ? rec.date.split('-').reverse().join('/') : t('uiSemData')}  {t('uiEsporte')} {displayValue(rec.suggestedSport || 'Não especificado', t)}
                      </option>
                    ))}
                  </select>
                </div>

                {availableSubSports.length > 0 && (
                  <div className="space-y-1 animate-in fade-in duration-200">
                    <label className="text-xs font-semibold text-[#a855f7] block flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#a855f7] animate-pulse" />
                      
                      {t('uiEsporteDoRelatorio')}
                    </label>
                    <select
                      value={selectedSportName}
                      onChange={(e) => setSelectedSportName(e.target.value)}
                      className="w-full bg-[#0b1326] border border-[#a855f7]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#a855f7] outline-none font-bold"
                    >
                      {availableSubSports.map((sport) => (
                        <option key={sport} value={sport}>
                          {displayValue(sport, t)}
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
                <p className="text-[10px]">{t('uiEsteAlunoNaoPossuiAvaliacoesDeEsporte')}</p>
              </div>
            )}

            {/* Vocational Record Selection */}
            {focusArea === 'Desempenho Vocacional' && vocationRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  
                  {t('uiPerfilVocacional')}
                </label>
                <select
                  value={selectedVocationId}
                  onChange={(e) => setSelectedVocationId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {vocationRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : t('uiSemData')}  {t('uiPerfil')} {displayValue(rec.profile || 'Não especificado', t)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Vocacional' && vocationRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">{t('uiEsteAlunoNaoPossuiAvaliacoesDeVocacionamento')}</p>
              </div>
            )}

            {/* Saude Global Record Selection */}
            {focusArea === 'Desempenho Saúde Global' && healthRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  
                  {t('uiAvaliacaoDeSaudeGlobal')}
                </label>
                <select
                  value={selectedHealthId}
                  onChange={(e) => setSelectedHealthId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {healthRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : t('uiSemData')} - {displayValue(rec.classification || 'Não classificado', t)}  {t('uiT')} {Number(rec.tScore).toFixed(1)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Saúde Global' && healthRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">{t('uiEsteAlunoNaoPossuiAvaliacoesDeSaude')}</p>
              </div>
            )}

            {/* Higiene Bucal Record Selection */}
            {focusArea === 'Desempenho Higiene Bucal' && oralRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  
                  {t('uiAvaliacaoDeHigieneBucal')}
                </label>
                <select
                  value={selectedOralId}
                  onChange={(e) => setSelectedOralId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {oralRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : t('uiSemData')} - {displayValue(rec.classification || 'Não classificado', t)}  {t('uiScore')} {rec.score}/12)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Higiene Bucal' && oralRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">{t('uiEsteAlunoNaoPossuiAvaliacoesDeHigiene')}</p>
              </div>
            )}

            {/* Autoconceito Record Selection */}
            {focusArea === 'Desempenho Autoconceito' && autoconceptRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  
                  {t('uiAvaliacaoDeAutoconceito')}
                </label>
                <select
                  value={selectedAutoId}
                  onChange={(e) => setSelectedAutoId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {autoconceptRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : t('uiSemData')} - {displayValue(rec.classification || 'Não classificado', t)}  {t('uiScore')} {rec.score}/30)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Autoconceito' && autoconceptRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">{t('uiEsteAlunoNaoPossuiAvaliacoesDeAutoconceito')}</p>
              </div>
            )}

            {/* Indice Alimentar Record Selection */}
            {focusArea === 'Desempenho Índice Alimentar' && iasRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  
                  {t('uiAvaliacaoDeIndiceAlimentar')}
                </label>
                <select
                  value={selectedIasId}
                  onChange={(e) => setSelectedIasId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {iasRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : t('uiSemData')} - {displayValue(rec.classification || 'Não classificado', t)}  {t('uiScore')} {rec.totalScore}/100)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Índice Alimentar' && iasRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">{t('uiEsteAlunoNaoPossuiAvaliacoesDeIndice')}</p>
              </div>
            )}

            {/* Rastreamento do TDAH (SNAP-IV) Record Selection */}
            {focusArea === 'Desempenho Rastreamento TDAH' && snapRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  
                  {t('uiAvaliacaoDeRastreamentoDoTdah')}
                </label>
                <select
                  value={selectedSnapId}
                  onChange={(e) => setSelectedSnapId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {snapRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : t('uiSemData')} - {displayValue(rec.classification || 'Não classificado', t)}  {t('uiDesat')} {rec.inattentionScore}{t('ui9Hiper')} {rec.hyperactivityScore}/9)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Rastreamento TDAH' && snapRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">{t('uiEsteAlunoNaoPossuiAvaliacoesDeRastreamento')}</p>
              </div>
            )}

            {/* Rastreamento Precoce do TEA (AQ-10) Record Selection */}
            {focusArea === 'Desempenho Rastreamento Precoce do TEA' && aq10Records.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  
                  {t('uiAvaliacaoDeRastreamentoPrecoceDoTea')}
                </label>
                <select
                  value={selectedAq10Id}
                  onChange={(e) => setSelectedAq10Id(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {aq10Records.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : t('uiSemData')} - {displayValue(rec.classification || 'Não classificada', t)}  {t('uiScore')} {rec.totalScore}/10)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Rastreamento Precoce do TEA' && aq10Records.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">{t('uiEsteAlunoNaoPossuiAvaliacoesDeRastreamento2')}</p>
              </div>
            )}

            {/* Qualidade Motora PCD Record Selection */}
            {focusArea === 'Desempenho Qualidade Motora PCD' && pcdRecords.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-[#38bdf8] block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  
                  {t('uiAvaliacaoDeQualidadeMotoraPcd')}
                </label>
                <select
                  value={selectedPcdId}
                  onChange={(e) => setSelectedPcdId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#38bdf8]/30 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none font-bold"
                >
                  {pcdRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.date ? rec.date.split('-').reverse().join('/') : t('uiSemData')} - {rec.grupoNome || t('tplGrupoP0', { p0: displayValue(rec.grupo, t) })} ({displayValue(rec.classificacaoPerfil || 'Não classificado', t)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {focusArea === 'Desempenho Qualidade Motora PCD' && pcdRecords.length === 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200/70">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[10px]">{t('uiEsteAlunoNaoPossuiAvaliacoesDeQualidade2')}</p>
              </div>
            )}

            {focusArea !== 'Desempenho Completo' && (
            <>
            {/* Educador Annotations */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#bdc8d1]/90 block">{t('uiAnotacoesDoEducadorOpcional')}</label>
              <textarea
                placeholder={t('uiInsiraAnotacoesBrevesDeComportamentoConquistasRecentes')}
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
              <span>{observationsSaved ? t('uiInformacoesSalvas') : t('uiAdicionarInformacoes')}</span>
            </button>
            {annotatable
              ? currentReportExists && (
                  <p className="text-emerald-400/80 text-[10px] font-bold text-center mt-2">{t('uiRelatorioGeradoAutomaticamenteUseOBotaoAdicionar')}</p>
                )
              : (
                  <p className="text-amber-400/80 text-[10px] font-bold text-center mt-2">{t('uiSelecioneUmaAvaliacaoFeitaParaAdicionarInformacoes')}</p>
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
              <p className="text-xs font-bold text-[#8ed5ff] uppercase tracking-wider">{t('uiProcessandoDadosDoSistema')}</p>
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
                  <p className="text-[10px] text-[#87929a] font-semibold tracking-wider uppercase">{t('uiDocumentoGeradoPara')}</p>
                  <h5 className="text-sm font-bold text-[#dae2fd] truncate max-w-[200px]">{selectedStudentObj.name}</h5>
                  <p className="text-[9px] text-[#87929a] mt-0.5 truncate uppercase font-bold tracking-tight">
                    {selectedStudentObj.estado || 'N/A'} • {selectedStudentObj.regiao || 'N/A'} • {selectedStudentObj.locality || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#87929a] font-semibold tracking-wider uppercase">{t('uiUnidadeDeClasse')}</p>
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
            <p className="text-xs font-bold text-[#ffb4ab]">{t('uiFalhaNaChamadaDeGeracao')}</p>
            <p className="text-xs text-[#bdc8d1]/80 max-w-md">{errorMessage}</p>
          </div>
        )}

        {/* Empty placeholder state */}
        {!loading && !aiReport && !errorMessage && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-[#bdc8d1]/65 space-y-2">
            <FileText className="w-10 h-10 text-[#3e484f]" />
            {selectedStudentId && focusAreaRecordCount === 0 ? (
              <p className="text-xs font-semibold text-[#dae2fd]/80 max-w-sm">
                
                {t('uiEsteAlunoAindaNaoPossuiAvaliacaoDe')} {displayValue(focusArea, t)}{t('uiRealizeAAvaliacaoNaAreaDeAvaliacoes')}
              </p>
            ) : (
              <p className="text-[10px] max-w-sm">
                
                {t('uiOSistemaIraExtrairEstatisticasDePresencas')}
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
