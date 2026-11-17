"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ClipboardList,
  Search,
  Trash2,
  User,
  Heart,
  Award,
  CheckCircle2,
  Printer,
  ListCollapse,
  PlusCircle,
  Info,
  Edit,
  Plus,
  X,
  AlertTriangle,
  Dumbbell,
  Zap,
  Activity,
} from "lucide-react";
import { type Student, type ImcRecord, type MotorRecord, type PcdGroupConfig, type PcdAdaptacaoConfig, type PcdFaixaConfig, type PcdModalidadeConfig, type PcdFunilConfig } from "../types/edukyne";
import { isSupabaseConfigured } from "../lib/supabase";
import { getDb } from "../lib/dbFacade";
import { uuid, nextM2ModalidadeId, nextM3CenarioId, nextM3ImpactoId, nextM4ImcConfigId, nextM5CapacidadeId, nextM6DirecionamentoId, nextM6DiretrizId, nextM7ParecerId, nextAptidaoRefId, nextVocQuestionId, nextM9HealthQuestionId, nextM9ParecerId, nextM10OralQuestionId, nextM10ParecerId, nextM11AutoQuestionId, nextM11ParecerId, nextIasQuestionId, nextM12ParecerId, nextM13SnapQuestionId, nextM13ParecerId, nextM14Aq10QuestionId, nextM14ParecerId, nextM15GrupoId, nextM15AdaptacaoId, nextM15FaixaId, nextM15ModalidadeId, nextM15FunilId } from "../lib/idGenerator";
import { HEALTH_CLASSIFICATIONS } from "../lib/healthScore";
import { ORAL_CLASSIFICATIONS, type OralScoringRule } from "../lib/oralScore";
import { AUTOCONCEPT_CLASSIFICATIONS, type AutoconceptItemType } from "../lib/autoconceptScore";
import { IAS_CLASSIFICATIONS, type IasQuestion } from "../lib/iasScore";
import { SNAP_CLASSIFICATIONS, SNAP_LIKERT_LABELS, SNAP_CLINICAL_THRESHOLD, SNAP_CLINICAL_THRESHOLD_17, type SnapSubscale } from "../lib/snapScore";
import { AQ10_CLASSIFICATIONS, AQ10_LIKERT_LABELS, AQ10_ALERT_FROM, type Aq10Version } from "../lib/aq10Score";
import { PCD_TESTES, PCD_TESTES_MAP, PCD_DETALHES_POR_GRUPO, PCD_NOTAS_LABELS, PCD_STATUS_ADAPTACAO, DEFAULT_M15_ADAPTACOES, DEFAULT_M15_FAIXAS, DEFAULT_M15_MODALIDADES, DEFAULT_M15_FUNIL, M15_GRUPOS_PADRAO, type PcdTesteKey } from "../lib/pcdScore";

interface LocalUser {
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

interface QuestionarioViewProps {
  students: Student[];
  user: LocalUser;
  activeTab?: string;
}

const getImcDisplayLabel = (level: string): string => {
  switch (level) {
    case "Insuficiente":
      return "Obesidade";
    case "Regular":
      return "Sobrepeso";
    case "Bom":
      return "Abaixo do peso";
    case "Excelente":
      return "Peso normal";
    default:
      return level;
  }
};

const DEFAULT_M2_MODALIDADES = [
  {
    id: "m2-1",
    name: "Atletismo",
    requirements: {
      imc: ["Regular", "Bom", "Excelente"],
      v20m: ["Bom", "Excelente"],
      impulsao: ["Bom", "Excelente"],
      flexao: ["Regular", "Bom", "Excelente"],
      agilidade: ["Bom", "Excelente"],
      abdominal: ["Regular", "Bom", "Excelente"],
    },
  },
  {
    id: "m2-2",
    name: "Natação",
    requirements: {
      imc: ["Regular", "Bom", "Excelente"],
      v20m: ["Regular", "Bom", "Excelente"],
      impulsao: ["Regular", "Bom", "Excelente"],
      flexao: ["Bom", "Excelente"],
      agilidade: ["Regular", "Bom", "Excelente"],
      abdominal: ["Bom", "Excelente"],
    },
  },
  {
    id: "m2-3",
    name: "Basquete",
    requirements: {
      imc: ["Regular", "Bom", "Excelente"],
      v20m: ["Bom", "Excelente"],
      impulsao: ["Excelente"],
      flexao: ["Bom", "Excelente"],
      agilidade: ["Bom", "Excelente"],
      abdominal: ["Bom", "Excelente"],
    },
  },
  {
    id: "m2-4",
    name: "Handebol",
    requirements: {
      imc: ["Regular", "Bom", "Excelente"],
      v20m: ["Bom", "Excelente"],
      impulsao: ["Bom", "Excelente"],
      flexao: ["Excelente"],
      agilidade: ["Bom", "Excelente"],
      abdominal: ["Bom", "Excelente"],
    },
  },
  {
    id: "m2-5",
    name: "Futebol",
    requirements: {
      imc: ["Regular", "Bom", "Excelente"],
      v20m: ["Excelente"],
      impulsao: ["Bom", "Excelente"],
      flexao: ["Regular", "Bom", "Excelente"],
      agilidade: ["Excelente"],
      abdominal: ["Bom", "Excelente"],
    },
  },
  {
    id: "m2-6",
    name: "Vôlei",
    requirements: {
      imc: ["Regular", "Bom", "Excelente"],
      v20m: ["Regular", "Bom", "Excelente"],
      impulsao: ["Excelente"],
      flexao: ["Bom", "Excelente"],
      agilidade: ["Bom", "Excelente"],
      abdominal: ["Bom", "Excelente"],
    },
  },
  {
    id: "m2-7",
    name: "Ginástica",
    requirements: {
      imc: ["Bom", "Excelente"],
      v20m: ["Regular", "Bom", "Excelente"],
      impulsao: ["Excelente"],
      flexao: ["Excelente"],
      agilidade: ["Excelente"],
      abdominal: ["Excelente"],
    },
  },
  {
    id: "m2-8",
    name: "Lutas",
    requirements: {
      imc: ["Regular", "Bom", "Excelente"],
      v20m: ["Regular", "Bom", "Excelente"],
      impulsao: ["Regular", "Bom", "Excelente"],
      flexao: ["Excelente"],
      agilidade: ["Bom", "Excelente"],
      abdominal: ["Excelente"],
    },
  },
];

export const M3_SCENARIOS = {
  A: {
    cenarioText: "CENÁRIO A – MAIS PRESENÇAS DO QUE FALTAS",
    parecerFrequencia:
      "O estudante demonstrou excelente regularidade e compromisso com a rotina escolar ao longo deste mês. A baixa taxa de absenteísmo reflete uma postura participativa e engajada com o ambiente de aprendizagem.",
    parecerPais:
      "Parabéns pelo incentivo e parceria. A presença constante tem sido o pilar para os bons resultados mantidos até aqui.",
  },
  B: {
    cenarioText: "CENÁRIO B – MAIS FALTAS DO QUE PRESENÇAS",
    parecerFrequencia:
      "Identificamos um número crítico de ausências neste período, superando os dias de comparecimento em sala de aula. Esse padrão de faltas excessivas acende um alerta pedagógico, pois interrompe a sequência didática e prejudica a absorção dos conteúdos ministrados.",
    parecerPais:
      "Solicitamos uma atenção especial e um diálogo familiar para identificarmos o motivo das ausências. É fundamental restabelecer a rotina de idas à escola para evitar prejuízos severos na avaliação final deste ciclo.",
  },
  C: {
    cenarioText: "CENÁRIO C – NÃO HOUVER PRESENÇA OU FALTA REGISTRADA",
    parecerFrequencia:
      "Até o momento, não foram identificados registros de presença ou ausência para o estudante no sistema neste período. A ausência de dados impede uma avaliação precisa do acompanhamento escolar, tornando indispensável a verificação imediata junto à secretaria ou equipe pedagógica para a regularização dos lançamentos.",
    parecerPais:
      "Solicitamos que entrem em contato com a secretaria escolar para a regularização dos registros. Constatamos que não há lançamentos de presença ou falta até o momento, o que impossibilita o acompanhamento correto della rotina do estudante.",
  },
};

export const M3_ADVANTAGES = [
  "Continuidade Pedagógica: Quando presente, o aluno acompanha as explicações passo a passo, facilitando a execução de tarefas complexas.",
  "Socialização Ativa: A convivência diária fortalece os vínculos com professores e colegas, desenvolvendo inteligência emocional e trabalho em equipe.",
  "Ritmo de Avaliação: Menor necessidade de aplicação de provas substitutivas ou trabalhos de recuperação de nota por perda de prazos.",
];

export const M3_DISADVANTAGES = [
  "Lacunas de Conteúdo: Cada ausência gera a perda de conceitos-chave, acumulando dúvidas para as unidades seguintes.",
  "Desengajamento Escolar: O excesso de faltas quebra a rotina do estudante, gerando desmotivação e sensação de isolamento em relação à turma.",
  "Sobrecarga de Tarefas: Acúmulo de atividades pendentes que precisam ser realizadas em casa para cumprir as exigências do ano letivo.",
];

const generateUniqueId = (prefix: string) => {
  return `${prefix}-${uuid().slice(0, 8)}`;
};

type IMCRow = {
  id: string;
  classification: string;
  status: string;
  alertColor: 'emerald' | 'yellow' | 'orange' | 'rose';
  description: string;
  imcMin: number | null;
  imcMax: number | null;
};

type M5Row = {
  id: string;
  level: string;
  healthStatus: string;
  toImprove: string;
  recommendation: string;
  alertColor: 'rose' | 'yellow' | 'emerald' | 'blue';
};

type M6ModalityRow = {
  id: string;
  name: string;
  valencias: string;
  condition: string;
  report: string;
};

type M6DiretrizRow = {
  id: string;
  diretriz: string;
  criterio: string;
  conduta: string;
  objetivo: string;
};

type M7ProfileRow = {
  id: string;
  profile: string;
  component: string;
  basicData: string;
  reflection: string;
  interestArea?: string;
  careers?: string;
};

type VocQuestion = {
  id: string;
  ord: number;
  statement: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

type HealthQuestion = {
  id: string;
  ord: number;
  statement: string;
  reversed: boolean;
};

type M9Parecer = {
  id: string;
  classification: string;
  basicData: string;
  reflection: string;
};

type OralQuestion = {
  id: string;
  ord: number;
  statement: string;
  scoringRule: OralScoringRule;
};

type M10Parecer = {
  id: string;
  classification: string;
  basicData: string;
  reflection: string;
};

type AutoconceptQuestion = {
  id: string;
  ord: number;
  statement: string;
  itemType: AutoconceptItemType;
};

type M11Parecer = {
  id: string;
  classification: string;
  basicData: string;
  reflection: string;
};

type M12Parecer = {
  id: string;
  classification: string;
  basicData: string;
  reflection: string;
};

type SnapQuestion = {
  id: string;
  ord: number;
  statement: string;
  subscale: SnapSubscale;
};

type M13Parecer = {
  id: string;
  classification: string;
  basicData: string;
  reflection: string;
};

type Aq10Question = {
  id: string;
  ord: number;
  statement: string;
  version: Aq10Version;
};

type M14Parecer = {
  id: string;
  classification: string;
  basicData: string;
  reflection: string;
};

type M2Requirements = Record<string, string[]>;

type M2Modality = {
  id: string;
  name: string;
  requirements: M2Requirements;
};

type AptidaoRef = {
  id: string;
  category: string;
  idade: string;
  sexo: string;
  insuficiente: string;
  regular: string;
  bom: string;
  excelente: string;
};

const APTIDAO_PREFIX: Record<string, string> = {
  forca: "f",
  impulsao: "i",
  abdomen: "a",
  agilidade: "ag",
  velocidade: "v",
};

type M3Cenario = {
  id: string;
  cenario: string;
  condicao: string;
  frequencia: string;
  mensagem: string;
};

type M3Impacto = {
  id: string;
  tipo: string;
  indicador: string;
  descricao: string;
};

type M3Analise = {
  id: string;
  studentId: string;
  studentName: string;
  periodo: string;
  cenario: "A" | "B" | "C";
  parecerFrequencia: string;
  impactosVantagens: string[];
  impactosDesvantagens: string[];
  parecerPais: string;
  updatedAt: string;
};

export default function QuestionarioView({
  students,
  user,
  activeTab,
}: QuestionarioViewProps) {

  // IMC state for M4
  const [imcRows, setImcRows] = useState<IMCRow[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m4_imc_data");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [
      { id: '1', imcMin: 18.5, imcMax: 24.9, classification: 'Peso normal', status: 'IMC Ideal', alertColor: 'emerald', description: 'O aluno apresenta uma composição corporal excelente e adequada para a sua faixa etária. Esta condição favorece diretamente o rendimento cardiovascular, permitindo treinos de maior intensidade com excelente recuperação física e menor risco de lesões.' },
      { id: '2', imcMin: 0, imcMax: 18.4, classification: 'Abaixo do Peso', status: 'Atenção Nutricional', alertColor: 'yellow', description: 'O índice sinaliza a necessidade de atenção nutricional. A falta de massa magra ou reserva energética pode limitar a força muscular e a resistência do aluno em atividades de longa duração, gerando fadiga precoce.' },
      { id: '3', imcMin: 25, imcMax: 29.9, classification: 'Sobrepeso', status: 'Excesso Leve', alertColor: 'orange', description: 'O indicador aponta um leve excesso de peso para a estrutura corporal. Esse quadro exige maior esforço das articulações em treinos de impacto, mas pode ser equalizado rapidamente com o aumento da frequência e intensidade dos treinos esportivos.' },
      { id: '4', imcMin: 30, imcMax: null, classification: 'Obesidade', status: 'Fator de Risco', alertColor: 'rose', description: 'O índice indica um fator de risco para a saúde cardiovascular e articular. Recomenda-se um plano de atividades físicas de baixo impacto (como natação ou caminhadas aceleradas) associado a um acompanhamento nutricional para garantir a segurança e o bem-estar do aluno.' },
    ];
  });
  const [newRow, setNewRow] = useState<Omit<IMCRow, 'id'>>({ classification: '', status: '', alertColor: 'emerald', description: '', imcMin: null, imcMax: null });
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowData, setEditingRowData] = useState<IMCRow | null>(null);
  const [m4RowToDelete, setM4RowToDelete] = useState<IMCRow | null>(null);
  const [m5RowToDelete, setM5RowToDelete] = useState<M5Row | null>(null);

  // Módulo 6 (Direcionamento por Modalidade e Diretrizes Intervenção) State
  const [m6ActiveSubTab, setM6ActiveSubTab] = useState<"modalidades" | "diretrizes">("modalidades");
  const [m6Modalidades, setM6Modalidades] = useState<M6ModalityRow[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m6_modalidades");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [
      {
        id: "m6_b1",
        name: "BASQUETE",
        valencias: "Impulsão, Agilidade e Velocidade.",
        condition: "Níveis Bom / Excelente em Impulsão e Velocidade",
        report: "Identifico uma alta aptidão biomecânica para a modalidade. O(A) estudante demonstra facilidade natural para ações de transição rápida, verticalidade em rebotes e infiltrações explosivas."
      },
      {
        id: "m6_b2",
        name: "BASQUETE",
        valencias: "Impulsão, Agilidade e Velocidade.",
        condition: "Níveis Insuficiente / Regular em Agilidade ou Impulsão",
        report: "Observo restrições funcionais em quadra. A falta de agilidade compromete a marcação defensiva e a baixa impulsão limita o raio de ação em jogadas aéreas."
      },
      {
        id: "m6_b3",
        name: "BASQUETE",
        valencias: "Impulsão, Agilidade e Velocidade.",
        condition: "Qualquer Nível (Alerta de Core)",
        report: "O basquete exige desacelerações bruscas e saltos contínuos. Caso a musculatura do abdômen esteja fraca, as forças de impacto serão transferidas para a coluna lombar, aumentando o risco de microlesões discais."
      },
      {
        id: "m6_g1",
        name: "GINÁSTICA (Artística / Rítmica)",
        valencias: "Abdômen, Força Muscular e Agilidade.",
        condition: "Níveis Bom / Excelente em Abdômen e Força Muscular",
        report: "O(A) estudante possui o tônus muscular necessário para sustentar o próprio peso corporal e executar giros, equilíbrios e acrobacias com o alinhamento postural exigido."
      },
      {
        id: "m6_g2",
        name: "GINÁSTICA (Artística / Rítmica)",
        valencias: "Abdômen, Força Muscular e Agilidade.",
        condition: "Níveis Insuficiente / Regular em Abdômen ou Força Muscular",
        report: "Constato déficit de sustentação básica. A fraqueza do core impede o controle corporal no espaço, gerando movimentos compensatórios e desalinhados."
      },
      {
        id: "m6_g3",
        name: "GINÁSTICA (Artística / Rítmica)",
        valencias: "Abdômen, Força Muscular e Agilidade.",
        condition: "Qualquer Nível (Alerta de Core)",
        report: "Na ginástica, o abdômen funciona como o centro de estabilização. Níveis baixos nesta área expõem as articulações dos ombros e joelhos a sobrecargas severas no momento das aterrissagens."
      },
      {
        id: "m6_h1",
        name: "HANDEBOL",
        valencias: "Velocidade, Agilidade e Força Muscular.",
        condition: "Níveis Bom / Excelente em Velocidade e Força Muscular",
        report: "Registro um perfil altamente competitivo para o handebol. Há potência mecânica para arremessos de longa distância e velocidade de arranque para quebrar as linhas de defesa."
      },
      {
        id: "m6_h2",
        name: "HANDEBOL",
        valencias: "Velocidade, Agilidade e Força Muscular.",
        condition: "Níveis Insuficiente / Regular em Agilidade ou Velocidade",
        report: "Noto prejuízo nas transições táticas. O(A) jovem apresenta lentidão para recompor a defesa ou realizar fintas rápidas em pequenos espaços."
      },
      {
        id: "m6_h3",
        name: "HANDEBOL",
        valencias: "Velocidade, Agilidade e Força Muscular.",
        condition: "Qualquer Nível (Alerta Cardiovascular)",
        report: "Esta modalidade impõe um regime anaeróbico estrito. Índices baixos de velocidade e força muscular indicam fadiga cardiovascular precoce e lentidão na recuperação pós-esforço."
      },
      {
        id: "m6_f1",
        name: "FUTEBOL / FUTSAL",
        valencias: "Velocidade, Agilidade e Impulsão.",
        condition: "Níveis Bom / Excelente em Velocidade e Agilidade",
        report: "Evidencio excelente capacidade de drible e condução. O(A) estudante consegue alterar o centro de gravidade bruscamente sem perder a estabilidade dinâmica."
      },
      {
        id: "m6_f2",
        name: "FUTEBOL / FUTSAL",
        valencias: "Velocidade, Agilidade e Impulsão.",
        condition: "Níveis Insuficiente / Regular em Agilidade ou Velocidade",
        report: "Há limitação na proteção de bola e no acompanhamento de atacantes adversários, resultando em reações motoras atrasadas."
      },
      {
        id: "m6_f3",
        name: "FUTEBOL / FUTSAL",
        valencias: "Velocidade, Agilidade e Impulsão.",
        condition: "Qualquer Nível (Alerta Ligamentar)",
        report: "O futebol apresenta alto índice de lesões ligamentares. Níveis baixos de agilidade associados a articulações desprotegidas elevam o risco de entorses de joelho e tornozelo durante mudanças de direção."
      },
      {
        id: "m6_v1",
        name: "VÔLEI",
        valencias: "Impulsão, Agilidade e Abdômen.",
        condition: "Níveis Bom / Excelente em Impulsão e Agilidade",
        report: "Avalio ótima aptidão para ações na rede (ataque/bloqueio) e excelente tempo de reação para coberturas defensivas no solo."
      },
      {
        id: "m6_v2",
        name: "VÔLEI",
        valencias: "Impulsão, Agilidade e Abdômen.",
        condition: "Níveis Insuficiente / Regular em Impulsão",
        report: "O alcance vertical do(a) estudante fica comprometido, limitando sua eficiência tática e participação ativa nas fases aéreas do jogo."
      },
      {
        id: "m6_v3",
        name: "VÔLEI",
        valencias: "Impulsão, Agilidade e Abdômen.",
        condition: "Qualquer Nível (Alerta Articular)",
        report: "A mecânica do vôlei gera alto estresse nas estruturas inferiores. Se a força de aterrissagem for ruim devido a índices baixos de impulsão e força, há predisposição ao desenvolvimento de tendinite patelar."
      },
      {
        id: "m6_l1",
        name: "LUTAS / ARTES MARCIAIS",
        valencias: "Força Muscular, Abdômen e Agilidade.",
        condition: "Níveis Bom / Excelente em Força Muscular e Abdômen",
        report: "O(A) jovem demonstra excelente base de sustentação corporal, capacidade de gerar tração mecânica e manter o equilíbrio sob pressão de forças externas."
      },
      {
        id: "m6_l2",
        name: "LUTAS / ARTES MARCIAIS",
        valencias: "Força Muscular, Abdômen e Agilidade.",
        condition: "Níveis Insuficiente / Regular em Força Muscular",
        report: "Percebo fadiga muscular precoce dos membros superiores e tronco, reduzindo a eficiência em golpes que exigem potência ou manutenção de pegada."
      },
      {
        id: "m6_l3",
        name: "LUTAS / ARTES MARCIAIS",
        valencias: "Força Muscular, Abdômen e Agilidade.",
        condition: "Qualquer Nível (Alerta de Core)",
        report: "O complexo abdominal e lombar fraco expõe a coluna a vetores de rotação perigosos. O fortalecimento desta zona é crucial para blindar as vértebras contra os impactos e quedas inerentes à modalidade."
      },
      {
        id: "m6_a1",
        name: "ATLETISMO (Corridas e Saltos)",
        valencias: "Velocidade, Impulsão e Força Muscular.",
        condition: "Níveis Bom / Excelente em Velocidade e Impulsão",
        report: "Diagnostico um padrão de corrida eficiente com excelente aproveitamento elétrico dos músculos (ciclo alongamento-encurtamento), ideal para provas explosivas e saltos."
      },
      {
        id: "m6_a2",
        name: "ATLETISMO (Corridas e Saltos)",
        valencias: "Velocidade, Impulsão e Força Muscular.",
        condition: "Níveis Insuficiente / Regular em Velocidade ou Impulsão",
        report: "O(A) estudante apresenta uma mecânica de passada pesada, baixo tempo de voo e lentidão no bloco de partida."
      },
      {
        id: "m6_a3",
        name: "ATLETISMO (Corridas e Saltos)",
        valencias: "Velocidade, Impulsão e Força Muscular.",
        condition: "Qualquer Nível (Alerta Tibial)",
        report: "O gesto repetitivo do atletismo exige dissipação de impacto eficiente. Níveis insuficientes de força muscular transferem o estresse mecânico para a tíbia, podendo desencadear quadros de periostite (canelite)."
      },
      {
        id: "m6_n1",
        name: "NATAÇÃO",
        valencias: "Força Muscular, Abdômen e Velocidade.",
        condition: "Níveis Bom / Excelente em Força Muscular e Abdômen",
        report: "O(A) estudante mantém uma posição hidrodinâmica impecável na água, gerando braçadas potentes e reduzindo o arrasto frontal do corpo."
      },
      {
        id: "m6_n2",
        name: "NATAÇÃO",
        valencias: "Força Muscular, Abdômen e Velocidade.",
        condition: "Níveis Insuficiente / Regular em Abdômen",
        report: "Observo uma quebra na linha de flutuação; o quadril afunda durante o nado, o que aumenta a resistência da água e sobrecarrega a articulação dos ombros."
      },
      {
        id: "m6_n3",
        name: "NATAÇÃO",
        valencias: "Força Muscular, Abdômen e Velocidade.",
        condition: "Qualquer Nível (Alerta de Recondicionamento)",
        report: "Sendo um esporte de baixo impacto articular, é o ambiente ideal para recondicionamento. Níveis fracos nesta área encontram na natação uma via segura para expandir a capacidade pulmonar e corrigir assimetrias posturais."
      }
    ];
  });

  const [m6Diretrizes, setM6Diretrizes] = useState<M6DiretrizRow[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m6_diretrizes");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [
      {
        id: "m6_d1",
        diretriz: "APRIMORAR HABILIDADES MOTORAS",
        criterio: "Esta via deve ser adotada se três ou mais valências físicas estiverem em níveis Insuficiente ou Regular.",
        conduta: "Desaconselho totalmente a especialização precoce em esportes com regras rígidas ou alta demanda competitiva neste momento. O foco pedagógico deve migrar para circuitos funcionais multiesportivos, jogos cooperativos e estimulação motora de base.",
        objetivo: "O foco exclusivo deste direcionamento é restaurar a integridade física do(a) jovem. Buscaremos o ganho de massa magra, ativação do tônus postural e melhora da coordenação global para que seu corpo esteja preparado e protegido antes de ser exposto a cargas esportivas avançadas."
      }
    ];
  });

  const [m6ModalityToDelete, setM6ModalityToDelete] = useState<M6ModalityRow | null>(null);
  const [m6DiretrizToDelete, setM6DiretrizToDelete] = useState<M6DiretrizRow | null>(null);

  const [m6EditingModalityId, setM6EditingModalityId] = useState<string | null>(null);
  const [m6EditingModalityData, setM6EditingModalityData] = useState<M6ModalityRow | null>(null);

  const [m6EditingDiretrizId, setM6EditingDiretrizId] = useState<string | null>(null);
  const [m6EditingDiretrizData, setM6EditingDiretrizData] = useState<M6DiretrizRow | null>(null);

  const [m6NewModality, setM6NewModality] = useState<Omit<M6ModalityRow, "id">>({
    name: "",
    valencias: "",
    condition: "",
    report: "",
  });

  const [m6NewDiretriz, setM6NewDiretriz] = useState<Omit<M6DiretrizRow, "id">>({
    diretriz: "",
    criterio: "",
    conduta: "",
    objetivo: "",
  });

  const skipSyncM6Mod = useRef(true);
  useEffect(() => {
    if (skipSyncM6Mod.current) { skipSyncM6Mod.current = false; return; }
    localStorage.setItem("educore_m6_modalidades", JSON.stringify(m6Modalidades));
    // Sync to Supabase
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        m6Modalidades.forEach(item => {
          supabase.from("m6_modalidades_direcionamento").upsert({
            id: item.id,
            name: item.name,
            valencias: item.valencias,
            condition: item.condition,
            report: item.report,
          }).then(({ error }) => {
            if (error) console.error("Error saving m6_modalidades_direcionamento to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [m6Modalidades]);

  const skipSyncM6Dir = useRef(true);
  useEffect(() => {
    if (skipSyncM6Dir.current) { skipSyncM6Dir.current = false; return; }
    localStorage.setItem("educore_m6_diretrizes", JSON.stringify(m6Diretrizes));
    // Sync to Supabase
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        m6Diretrizes.forEach(item => {
          supabase.from("m6_diretrizes_intervencao").upsert({
            id: item.id,
            diretriz: item.diretriz,
            criterio: item.criterio,
            conduta: item.conduta,
            objetivo: item.objetivo,
          }).then(({ error }) => {
            if (error) console.error("Error saving m6_diretrizes_intervencao to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [m6Diretrizes]);

  useEffect(() => {
    localStorage.setItem("educore_m4_imc_data", JSON.stringify(imcRows));
  }, [imcRows]);

  // Módulo 7 (Tabela de Perfis e Recomendações) State
  const [m7Rows, setM7Rows] = useState<M7ProfileRow[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m7_rows");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [
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
        reflection: "Diagnosticamos no(a) estudante uma estrutura cognitiva predominantemente abstrata, analítica e dedutiva. Sua mente opera de forma sistêmica e encontra motivação na descoberta de padrões, equações e arquitetura de dados. O(A) jovem não se contenta em ser apenas um usuário passivo das ferramentas digitais e das construções do mundo moderno; há uma curiosidade intelectual intrínseca para compreender o \"como\" e o \"porquê\" por trás das engrenagens tecnológicas e estruturais. Essa inclinação para a precisão metodológica fornece uma base sólida para carreiras em desenvolvimento de softwares ou engenharia, ambientes onde o rigor lógico serve como matéria-prima para projetar e construir as soluções do amanhã."
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
    ];
  });

  const [m7EditingId, setM7EditingId] = useState<string | null>(null);
  const [m7EditingData, setM7EditingData] = useState<M7ProfileRow | null>(null);
  const [m7RowToDelete, setM7RowToDelete] = useState<M7ProfileRow | null>(null);
  const [m7NewRow, setM7NewRow] = useState<Omit<M7ProfileRow, "id">>({
    profile: "Criativo e Tecnológico (Perfil Híbrido)",
    component: "Mapa de Perfis e Carreiras",
    basicData: "",
    reflection: "",
    interestArea: "",
    careers: ""
  });

  useEffect(() => {
    localStorage.setItem("educore_m7_rows", JSON.stringify(m7Rows));
  }, [m7Rows]);

  // Módulo 8 - Perguntas do Questionário Vocacional
  const [vocQuestions, setVocQuestions] = useState<VocQuestion[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_voc_questions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed)) return [];
          const seen = new Set<string>();
          return parsed.filter((q: VocQuestion) => {
            if (!q || seen.has(q.id)) return false;
            seen.add(q.id);
            return true;
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [vocNew, setVocNew] = useState<Omit<VocQuestion, "id" | "ord">>({ statement: "", optionA: "", optionB: "", optionC: "", optionD: "" });
  const [vocEditingId, setVocEditingId] = useState<string | null>(null);
  const [vocEditData, setVocEditData] = useState<VocQuestion | null>(null);
  const [vocToDelete, setVocToDelete] = useState<VocQuestion | null>(null);

  useEffect(() => {
    localStorage.setItem("educore_voc_questions", JSON.stringify(vocQuestions));
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        vocQuestions.forEach(item => {
          supabase.from("voc_questions").upsert({
            id: item.id,
            ord: item.ord,
            statement: item.statement,
            option_a: item.optionA,
            option_b: item.optionB,
            option_c: item.optionC,
            option_d: item.optionD,
          }).then(({ error }) => {
            if (error) console.error("Error saving voc_questions to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [vocQuestions]);

  // Módulo 9 - Saúde Global (KIDSCREEN-10): banco de perguntas + pareceres
  const [healthQuestions, setHealthQuestions] = useState<HealthQuestion[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m9_health_questions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed)) return [];
          const seen = new Set<string>();
          return parsed.filter((q: HealthQuestion) => {
            if (!q || seen.has(q.id)) return false;
            seen.add(q.id);
            return true;
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [healthNew, setHealthNew] = useState<Omit<HealthQuestion, "id" | "ord">>({ statement: "", reversed: false });
  const [healthEditingId, setHealthEditingId] = useState<string | null>(null);
  const [healthEditData, setHealthEditData] = useState<HealthQuestion | null>(null);
  const [healthToDelete, setHealthToDelete] = useState<HealthQuestion | null>(null);

  const [m9Pareceres, setM9Pareceres] = useState<M9Parecer[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m9_perfis_pareceres");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [m9ParecerEditingId, setM9ParecerEditingId] = useState<string | null>(null);
  const [m9ParecerEditData, setM9ParecerEditData] = useState<M9Parecer | null>(null);

  useEffect(() => {
    localStorage.setItem("educore_m9_health_questions", JSON.stringify(healthQuestions));
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        healthQuestions.forEach(item => {
          supabase.from("m9_health_questions").upsert({
            id: item.id,
            ord: item.ord,
            statement: item.statement,
            reversed: item.reversed,
          }).then(({ error }) => {
            if (error) console.error("Error saving m9_health_questions to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [healthQuestions]);

  useEffect(() => {
    localStorage.setItem("educore_m9_perfis_pareceres", JSON.stringify(m9Pareceres));
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        m9Pareceres.forEach(item => {
          supabase.from("m9_perfis_pareceres").upsert({
            id: item.id,
            classification: item.classification,
            basic_data: item.basicData,
            reflection: item.reflection,
          }).then(({ error }) => {
            if (error) console.error("Error saving m9_perfis_pareceres to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [m9Pareceres]);

  // Módulo 10 - Higiene Bucal (HU-DBI): banco de perguntas + pareceres
  const [oralQuestions, setOralQuestions] = useState<OralQuestion[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m10_oral_questions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed)) return [];
          const seen = new Set<string>();
          return parsed.filter((q: OralQuestion) => {
            if (!q || seen.has(q.id)) return false;
            seen.add(q.id);
            return true;
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [oralNew, setOralNew] = useState<Omit<OralQuestion, "id" | "ord">>({ statement: "", scoringRule: "none" });
  const [oralEditingId, setOralEditingId] = useState<string | null>(null);
  const [oralEditData, setOralEditData] = useState<OralQuestion | null>(null);
  const [oralToDelete, setOralToDelete] = useState<OralQuestion | null>(null);

  const [m10Pareceres, setM10Pareceres] = useState<M10Parecer[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m10_perfis_pareceres");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [m10ParecerEditingId, setM10ParecerEditingId] = useState<string | null>(null);
  const [m10ParecerEditData, setM10ParecerEditData] = useState<M10Parecer | null>(null);

  useEffect(() => {
    localStorage.setItem("educore_m10_oral_questions", JSON.stringify(oralQuestions));
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        oralQuestions.forEach(item => {
          supabase.from("m10_oral_questions").upsert({
            id: item.id,
            ord: item.ord,
            statement: item.statement,
            scoring_rule: item.scoringRule,
          }).then(({ error }) => {
            if (error) console.error("Error saving m10_oral_questions to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [oralQuestions]);

  useEffect(() => {
    localStorage.setItem("educore_m10_perfis_pareceres", JSON.stringify(m10Pareceres));
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        m10Pareceres.forEach(item => {
          supabase.from("m10_perfis_pareceres").upsert({
            id: item.id,
            classification: item.classification,
            basic_data: item.basicData,
            reflection: item.reflection,
          }).then(({ error }) => {
            if (error) console.error("Error saving m10_perfis_pareceres to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [m10Pareceres]);

  // Módulo 11 - Autoconceito (Rosenberg): banco de afirmacoes + pareceres
  const [autoQuestions, setAutoQuestions] = useState<AutoconceptQuestion[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m11_autoconcept_questions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed)) return [];
          const seen = new Set<string>();
          return parsed.filter((q: AutoconceptQuestion) => {
            if (!q || seen.has(q.id)) return false;
            seen.add(q.id);
            return true;
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [autoNew, setAutoNew] = useState<Omit<AutoconceptQuestion, "id" | "ord">>({ statement: "", itemType: "positive" });
  const [autoEditingId, setAutoEditingId] = useState<string | null>(null);
  const [autoEditData, setAutoEditData] = useState<AutoconceptQuestion | null>(null);
  const [autoToDelete, setAutoToDelete] = useState<AutoconceptQuestion | null>(null);

  const [m11Pareceres, setM11Pareceres] = useState<M11Parecer[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m11_perfis_pareceres");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [m11ParecerEditingId, setM11ParecerEditingId] = useState<string | null>(null);
  const [m11ParecerEditData, setM11ParecerEditData] = useState<M11Parecer | null>(null);

  useEffect(() => {
    localStorage.setItem("educore_m11_autoconcept_questions", JSON.stringify(autoQuestions));
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        autoQuestions.forEach(item => {
          supabase.from("m11_autoconcept_questions").upsert({
            id: item.id,
            ord: item.ord,
            statement: item.statement,
            item_type: item.itemType,
          }).then(({ error }) => {
            if (error) console.error("Error saving m11_autoconcept_questions to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [autoQuestions]);

  useEffect(() => {
    localStorage.setItem("educore_m11_perfis_pareceres", JSON.stringify(m11Pareceres));
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        m11Pareceres.forEach(item => {
          supabase.from("m11_perfis_pareceres").upsert({
            id: item.id,
            classification: item.classification,
            basic_data: item.basicData,
            reflection: item.reflection,
          }).then(({ error }) => {
            if (error) console.error("Error saving m11_perfis_pareceres to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [m11Pareceres]);

  // Módulo 12 - Indice Alimentar (IAS): banco de perguntas + pareceres
  const [iasQuestions, setIasQuestions] = useState<IasQuestion[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_ias_questions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed)) return [];
          const seen = new Set<string>();
          return parsed.filter((q: IasQuestion) => {
            if (!q || seen.has(q.id)) return false;
            seen.add(q.id);
            return true;
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [iasNew, setIasNew] = useState<Omit<IasQuestion, "id" | "ord">>({
    statement: "",
    option1Text: "", option1Points: 0,
    option2Text: "", option2Points: 0,
    option3Text: "", option3Points: 0,
  });
  const [iasEditingId, setIasEditingId] = useState<string | null>(null);
  const [iasEditData, setIasEditData] = useState<IasQuestion | null>(null);
  const [iasToDelete, setIasToDelete] = useState<IasQuestion | null>(null);

  const [m12Pareceres, setM12Pareceres] = useState<M12Parecer[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m12_perfis_pareceres");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [m12ParecerEditingId, setM12ParecerEditingId] = useState<string | null>(null);
  const [m12ParecerEditData, setM12ParecerEditData] = useState<M12Parecer | null>(null);

  useEffect(() => {
    localStorage.setItem("educore_ias_questions", JSON.stringify(iasQuestions));
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        iasQuestions.forEach(item => {
          supabase.from("ias_questions").upsert({
            id: item.id,
            ord: item.ord,
            statement: item.statement,
            option_1_text: item.option1Text,
            option_1_points: item.option1Points,
            option_2_text: item.option2Text,
            option_2_points: item.option2Points,
            option_3_text: item.option3Text,
            option_3_points: item.option3Points,
          }).then(({ error }) => {
            if (error) console.error("Error saving ias_questions to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [iasQuestions]);

  useEffect(() => {
    localStorage.setItem("educore_m12_perfis_pareceres", JSON.stringify(m12Pareceres));
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        m12Pareceres.forEach(item => {
          supabase.from("m12_perfis_pareceres").upsert({
            id: item.id,
            classification: item.classification,
            basic_data: item.basicData,
            reflection: item.reflection,
          }).then(({ error }) => {
            if (error) console.error("Error saving m12_perfis_pareceres to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [m12Pareceres]);

  // Módulo 13 - Rastreamento do TDAH (SNAP-IV): banco de 18 itens + pareceres
  const [snapQuestions, setSnapQuestions] = useState<SnapQuestion[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m13_snap_questions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed)) return [];
          const seen = new Set<string>();
          return parsed.filter((q: SnapQuestion) => {
            if (!q || seen.has(q.id)) return false;
            seen.add(q.id);
            return true;
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [snapNew, setSnapNew] = useState<Omit<SnapQuestion, "id" | "ord">>({ statement: "", subscale: "inattention" });
  const [snapEditingId, setSnapEditingId] = useState<string | null>(null);
  const [snapEditData, setSnapEditData] = useState<SnapQuestion | null>(null);
  const [snapToDelete, setSnapToDelete] = useState<SnapQuestion | null>(null);

  const [m13Pareceres, setM13Pareceres] = useState<M13Parecer[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m13_perfis_pareceres");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [m13ParecerEditingId, setM13ParecerEditingId] = useState<string | null>(null);
  const [m13ParecerEditData, setM13ParecerEditData] = useState<M13Parecer | null>(null);

  useEffect(() => {
    localStorage.setItem("educore_m13_snap_questions", JSON.stringify(snapQuestions));
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        snapQuestions.forEach(item => {
          supabase.from("m13_snap_questions").upsert({
            id: item.id,
            ord: item.ord,
            statement: item.statement,
            subscale: item.subscale,
          }).then(({ error }) => {
            if (error) console.error("Error saving m13_snap_questions to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [snapQuestions]);

  useEffect(() => {
    localStorage.setItem("educore_m13_perfis_pareceres", JSON.stringify(m13Pareceres));
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        m13Pareceres.forEach(item => {
          supabase.from("m13_perfis_pareceres").upsert({
            id: item.id,
            classification: item.classification,
            basic_data: item.basicData,
            reflection: item.reflection,
          }).then(({ error }) => {
            if (error) console.error("Error saving m13_perfis_pareceres to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [m13Pareceres]);

  // Módulo 14 - Rastreamento Precoce do TEA (AQ-10): banco de 20 itens + pareceres
  const [aq10Questions, setAq10Questions] = useState<Aq10Question[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m14_aq10_questions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed)) return [];
          const seen = new Set<string>();
          return parsed.filter((q: Aq10Question) => {
            if (!q || seen.has(q.id)) return false;
            seen.add(q.id);
            return true;
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [aq10New, setAq10New] = useState<Omit<Aq10Question, "id" | "ord">>({ statement: "", version: "crianca" });
  const [aq10EditingId, setAq10EditingId] = useState<string | null>(null);
  const [aq10EditData, setAq10EditData] = useState<Aq10Question | null>(null);
  const [aq10ToDelete, setAq10ToDelete] = useState<Aq10Question | null>(null);

  const [m14Pareceres, setM14Pareceres] = useState<M14Parecer[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m14_perfis_pareceres");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [m14ParecerEditingId, setM14ParecerEditingId] = useState<string | null>(null);
  const [m14ParecerEditData, setM14ParecerEditData] = useState<M14Parecer | null>(null);

  useEffect(() => {
    localStorage.setItem("educore_m14_aq10_questions", JSON.stringify(aq10Questions));
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        aq10Questions.forEach(item => {
          supabase.from("m14_aq10_questions").upsert({
            id: item.id,
            ord: item.ord,
            statement: item.statement,
            version: item.version,
          }).then(({ error }) => {
            if (error) console.error("Error saving m14_aq10_questions to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [aq10Questions]);

  useEffect(() => {
    localStorage.setItem("educore_m14_perfis_pareceres", JSON.stringify(m14Pareceres));
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        m14Pareceres.forEach(item => {
          supabase.from("m14_perfis_pareceres").upsert({
            id: item.id,
            classification: item.classification,
            basic_data: item.basicData,
            reflection: item.reflection,
          }).then(({ error }) => {
            if (error) console.error("Error saving m14_perfis_pareceres to Supabase:", error?.message ?? error);
          });
        });
      }
    }
  }, [m14Pareceres]);

  // Módulo 15 - Qualidade Motora PCD: grupos, adaptacoes, faixas, matriz e funil
  const [m15Grupos, setM15Grupos] = useState<PcdGroupConfig[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("educore_m15_pcd_grupos");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) { console.error(e); }
    }
    return M15_GRUPOS_PADRAO.map(g => ({ id: `pg${g.grupo}`, ...g }));
  });
  const [m15Adaptacoes, setM15Adaptacoes] = useState<PcdAdaptacaoConfig[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("educore_m15_pcd_adaptacoes");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) { console.error(e); }
    }
    return DEFAULT_M15_ADAPTACOES;
  });
  const [m15Faixas, setM15Faixas] = useState<PcdFaixaConfig[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("educore_m15_pcd_faixas");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) { console.error(e); }
    }
    return DEFAULT_M15_FAIXAS;
  });
  const [m15Modalidades, setM15Modalidades] = useState<PcdModalidadeConfig[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("educore_m15_pcd_modalidades");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) { console.error(e); }
    }
    return DEFAULT_M15_MODALIDADES;
  });
  const [m15Funil, setM15Funil] = useState<PcdFunilConfig[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("educore_m15_pcd_funil");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) { console.error(e); }
    }
    return DEFAULT_M15_FUNIL;
  });
  const [m15Tab, setM15Tab] = useState<'grupos' | 'adaptacoes' | 'faixas' | 'matriz' | 'funil'>('grupos');
  const [m15GrupoEditing, setM15GrupoEditing] = useState<PcdGroupConfig | null>(null);
  const [m15AdaptGrupoSel, setM15AdaptGrupoSel] = useState(1);
  const [m15AdaptDetalheSel, setM15AdaptDetalheSel] = useState('');
  const [m15FaixasGrupoSel, setM15FaixasGrupoSel] = useState(1);
  const [m15FaixasDetalheSel, setM15FaixasDetalheSel] = useState('');
  const [m15FaixasTesteSel, setM15FaixasTesteSel] = useState<PcdTesteKey>('abdominal');
  const [m15MatrizEditing, setM15MatrizEditing] = useState<PcdModalidadeConfig | null>(null);
  const [m15FunilGrupoSel, setM15FunilGrupoSel] = useState(1);

  const upsertM15Row = (table: string, row: Record<string, unknown>) => {
    if (!isSupabaseConfigured) return;
    const supabase = getDb();
    if (supabase) {
      supabase.from(table).upsert(row).then(({ error }) => {
        if (error) console.error(`Error saving ${table} to Supabase:`, error?.message ?? error);
      });
    }
  };
  const deleteM15Row = (table: string, id: string) => {
    if (!isSupabaseConfigured) return;
    const supabase = getDb();
    if (supabase) {
      supabase.from(table).delete().eq("id", id).then(({ error }) => {
        if (error) console.error(`Error deleting ${table} row:`, error?.message ?? error);
      });
    }
  };

  useEffect(() => {
    localStorage.setItem("educore_m15_pcd_grupos", JSON.stringify(m15Grupos));
    m15Grupos.forEach(g => upsertM15Row("m15_pcd_grupos", { id: g.id, grupo: g.grupo, nome: g.nome, descricao: g.descricao, laudo: g.laudo }));
  }, [m15Grupos]);

  useEffect(() => {
    localStorage.setItem("educore_m15_pcd_adaptacoes", JSON.stringify(m15Adaptacoes));
    m15Adaptacoes.forEach(a => upsertM15Row("m15_pcd_adaptacoes", { id: a.id, grupo: a.grupo, detalhe: a.detalhe, teste: a.teste, status: a.status, instrucao: a.instrucao }));
  }, [m15Adaptacoes]);

  useEffect(() => {
    localStorage.setItem("educore_m15_pcd_faixas", JSON.stringify(m15Faixas));
    m15Faixas.forEach(f => upsertM15Row("m15_pcd_faixas", { id: f.id, grupo: f.grupo, detalhe: f.detalhe, teste: f.teste, nota: f.nota, min_val: f.minVal, max_val: f.maxVal }));
  }, [m15Faixas]);

  useEffect(() => {
    localStorage.setItem("educore_m15_pcd_modalidades", JSON.stringify(m15Modalidades));
    m15Modalidades.forEach(m => upsertM15Row("m15_pcd_modalidades", { id: m.id, nome: m.nome, peso_vel_agil: m.pesoVelAgil, peso_forca_exp: m.pesoForcaExp, peso_membros_sup: m.pesoMembrosSup, peso_core: m.pesoCore, descricao: m.descricao }));
  }, [m15Modalidades]);

  useEffect(() => {
    localStorage.setItem("educore_m15_pcd_funil", JSON.stringify(m15Funil));
    m15Funil.forEach(f => upsertM15Row("m15_pcd_funil", { id: f.id, grupo: f.grupo, momento: f.momento, titulo: f.titulo, regra: f.regra }));
  }, [m15Funil]);

  const saveM15Grupo = async (g: PcdGroupConfig) => {
    if (!g.nome.trim()) { alert("Preencha o nome do grupo."); return; }
    if (g.id && m15Grupos.some(row => row.id === g.id)) {
      setM15Grupos(m15Grupos.map(row => row.id === g.id ? g : row));
    } else {
      const newG: PcdGroupConfig = { ...g, id: (await nextM15GrupoId()) || ("pg" + uuid().slice(0, 8)) };
      setM15Grupos([...m15Grupos, newG]);
    }
    setM15GrupoEditing(null);
    setSuccessMessage("Grupo salvo com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const addM15Adaptacao = async (grupo: number, detalhe: string, teste: PcdTesteKey) => {
    const existing = m15Adaptacoes.find(a => a.grupo === grupo && (a.detalhe || "").trim() === (detalhe || "").trim() && a.teste === teste);
    if (existing) return;
    const defaultRow = DEFAULT_M15_ADAPTACOES.find(a => a.grupo === grupo && (a.detalhe || "").trim() === (detalhe || "").trim() && a.teste === teste);
    const newA: PcdAdaptacaoConfig = {
      id: (await nextM15AdaptacaoId()) || ("pa_" + uuid().slice(0, 8)),
      grupo, detalhe, teste,
      status: defaultRow?.status ?? 'Padrão',
      instrucao: defaultRow?.instrucao ?? '',
    };
    setM15Adaptacoes([...m15Adaptacoes, newA]);
  };

  const saveM15Adaptacao = (a: PcdAdaptacaoConfig) => {
    setM15Adaptacoes(m15Adaptacoes.map(row => row.id === a.id ? a : row));
  };

  const ensureM15Adaptacoes = (grupo: number, detalhe: string) => {
    (Object.keys(PCD_TESTES_MAP) as PcdTesteKey[]).forEach(t => { void addM15Adaptacao(grupo, detalhe, t); });
    setSuccessMessage("Adaptações de referência aplicadas ao grupo selecionado.");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const saveM15Faixa = (f: PcdFaixaConfig) => {
    setM15Faixas(m15Faixas.map(row => row.id === f.id ? f : row));
  };

  const addM15Faixa = async (grupo: number, detalhe: string, teste: PcdTesteKey, nota: number) => {
    if (m15Faixas.some(f => f.grupo === grupo && (f.detalhe || "").trim() === (detalhe || "").trim() && f.teste === teste && f.nota === nota)) return;
    const defaultRow = DEFAULT_M15_FAIXAS.find(f => f.grupo === grupo && (f.detalhe || "").trim() === (detalhe || "").trim() && f.teste === teste && f.nota === nota);
    const newF: PcdFaixaConfig = {
      id: (await nextM15FaixaId()) || ("pf_" + uuid().slice(0, 8)),
      grupo, detalhe, teste, nota,
      minVal: defaultRow?.minVal ?? null,
      maxVal: defaultRow?.maxVal ?? null,
    };
    setM15Faixas([...m15Faixas, newF]);
  };

  const ensureM15Faixas = (grupo: number, detalhe: string, teste: PcdTesteKey) => {
    [1, 2, 3].forEach(n => { void addM15Faixa(grupo, detalhe, teste, n); });
    setSuccessMessage("Faixas de referência aplicadas ao teste selecionado.");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const saveM15Matriz = async (m: PcdModalidadeConfig) => {
    if (!m.nome.trim()) { alert("Preencha o nome da modalidade."); return; }
    if (m.id && m15Modalidades.some(row => row.id === m.id)) {
      setM15Modalidades(m15Modalidades.map(row => row.id === m.id ? m : row));
    } else {
      const newM: PcdModalidadeConfig = { ...m, id: (await nextM15ModalidadeId()) || ("pm" + uuid().slice(0, 8)) };
      setM15Modalidades([...m15Modalidades, newM]);
    }
    setM15MatrizEditing(null);
    setSuccessMessage("Modalidade salva com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const saveM15Funil = (f: PcdFunilConfig) => {
    setM15Funil(m15Funil.map(row => row.id === f.id ? f : row));
  };

  const addM15Funil = async (grupo: number, momento: number) => {
    if (m15Funil.some(f => f.grupo === grupo && f.momento === momento)) return;
    const defaultRow = DEFAULT_M15_FUNIL.find(f => f.grupo === grupo && f.momento === momento);
    const newF: PcdFunilConfig = {
      id: (await nextM15FunilId()) || ("pu_" + uuid().slice(0, 8)),
      grupo,
      momento,
      titulo: momento === 1 ? 'Filtro Clínico/Grupo' : momento === 2 ? 'Filtro Cognitivo/Sensorial' : 'Filtro de Preferência e Desejo Pessoal',
      regra: defaultRow?.regra ?? '',
    };
    setM15Funil([...m15Funil, newF]);
  };

  const ensureM15Funil = (grupo: number) => {
    [1, 2, 3].forEach(m => { void addM15Funil(grupo, m); });
    setSuccessMessage("Regras do funil aplicadas ao grupo selecionado.");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const addRow = async () => {
    if (!newRow.classification.trim() || !newRow.status.trim() || !newRow.description.trim()) {
      return;
    }
    const newRowWithId = { ...newRow, id: (await nextM4ImcConfigId()) || ('m4_' + uuid().slice(0, 8)) };
    setImcRows([...imcRows, newRowWithId]);
    setNewRow({ classification: '', status: '', alertColor: 'emerald', description: '', imcMin: null, imcMax: null });

    // Sync to Supabase
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        supabase.from("m4_imc_config").upsert({
          id: newRowWithId.id,
          classification: newRowWithId.classification,
          status: newRowWithId.status,
          alert_color: newRowWithId.alertColor,
          description: newRowWithId.description,
          imc_min: newRowWithId.imcMin,
          imc_max: newRowWithId.imcMax,
        }).then(({ error }) => {
          if (error) console.error("Error saving m4_imc_config to Supabase:", error?.message ?? error);
        });
      }
    }
  };

  const deleteRow = (id: string) => {
    const row = imcRows.find(r => r.id === id);
    if (row) {
      setM4RowToDelete(row);
    }
  };

  const handleConfirmDeleteM4 = () => {
    if (m4RowToDelete) {
      const deletedId = m4RowToDelete.id;
      setImcRows(imcRows.filter(r => r.id !== deletedId));
      setM4RowToDelete(null);

      // Sync to Supabase
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          supabase.from("m4_imc_config").delete().eq("id", deletedId).then(({ error }) => {
            if (error) console.error("Error deleting m4_imc_config from Supabase:", error);
          });
        }
      }
    }
  };

  const startEditing = (row: IMCRow) => {
    setEditingRowId(row.id);
    setEditingRowData({ ...row });
  };

  const cancelEditing = () => {
    setEditingRowId(null);
    setEditingRowData(null);
  };

  const saveEditing = () => {
    if (editingRowData) {
      setImcRows(imcRows.map(r => r.id === editingRowId ? editingRowData : r));
      setEditingRowId(null);
      setEditingRowData(null);

      // Sync to Supabase
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          supabase.from("m4_imc_config").upsert({
            id: editingRowData.id,
            classification: editingRowData.classification,
            status: editingRowData.status,
            alert_color: editingRowData.alertColor,
            description: editingRowData.description,
            imc_min: editingRowData.imcMin,
            imc_max: editingRowData.imcMax,
          }).then(({ error }) => {
            if (error) console.error("Error saving m4_imc_config to Supabase:", error?.message ?? error);
          });
        }
      }
    }
  };

  // Módulo 5 (Capacidades Físicas) State
  const [activeM5Tab, setActiveM5Tab] = useState<"velocidade" | "forca_muscular" | "agilidade" | "abdomen" | "impulsao">("velocidade");
  const [m5Data, setM5Data] = useState<Record<string, M5Row[]>>(() => {
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
        {
          id: "v1",
          level: "INSUFICIENTE",
          healthStatus: "A capacidade de deslocamento rápido e o tempo de reação estão abaixo do esperado para a idade. Na saúde, isso indica um sistema neuromuscular com respostas lentas aos estímulos externos e baixa eficiência cardiovascular em esforços explosivos, gerando cansaço precoce e falta de fôlego em corridas curtas.",
          toImprove: "O aluno precisa desenvolver a eficiência da passada e o ganho de ritmo. O foco inicial deve ser em educativos de corrida (como elevar os joelhos e calcanhares), coordenando a respiração e o movimento dos braços para destravar a agilidade dos pés e melhorar o condicionamento aeróbico de base.",
          recommendation: "Incentivamos o estímulo em casa através de jogos que exijam arrancadas rápidas, como pique-bandeira, corrida de obstáculos no quintal ou circuitos de tempo.",
          alertColor: "rose"
        },
        {
          id: "v2",
          level: "REGULAR",
          healthStatus: "O aluno consegue correr em um ritmo estável, mas apresenta dificuldades para acelerar rapidamente na largada ou mudar o ritmo de forma brusca. A saúde cardiovascular suporta o esforço, mas a musculatura das pernas gasta energia em excesso por falta de coordenação fina e potência na passada.",
          toImprove: "O foco deve ser o ganho de aceleração e a técnica de explosão. Recomenda-se treinar tiros curtos de corrida com descanso completo entre eles, além de brincadeiras de reação rápida, ensinando o corpo a recrutar fibras musculares velozes de forma mais eficiente.",
          recommendation: "Incentivamos o estímulo em casa através de jogos que exijam arrancadas rápidas, como pique-bandeira, corrida de obstáculos no quintal ou circuitos de tempo.",
          alertColor: "yellow"
        },
        {
          id: "v3",
          level: "BOM",
          healthStatus: "Nível saudável e totalmente adequado para a faixa etária. O aluno reage rápido aos estímulos e mantém uma excelente velocidade de deslocamento. Esse padrão reflete um coração forte, ótima capacidade respiratória e músculos condicionados, promovendo excelente queima energética e vitalidade no dia a dia.",
          toImprove: "Embora esteja em uma faixa segura e saudável, o aluno pode trabalhar a manutenção dessa velocidade por distâncias um pouco maiores. O foco deve ser treinar a resistência de velocidade para evitar quedas abruptas de rendimento no final das atividades.",
          recommendation: "Parabenizamos pelo excelente vigor físico. Seguiremos oferecendo desafios de alta intensidade em aula para manter o aluno motivado e saudável.",
          alertColor: "emerald"
        },
        {
          id: "v4",
          level: "EXCELENTE",
          healthStatus: "Desempenho físico excepcional. O aluno possui um tempo de reação curtíssimo e uma aceleração impressionante, atingindo a velocidade máxima com facilidade. O sistema cardiorrespiratório e a musculatura esquelética demonstram altíssima eficiência metabólica e perfeita coordenação neuromuscular.",
          toImprove: "O objetivo agora é preservar essa alta performance e evitar lesões. Por gerar muita força e velocidade, o aluno deve focar no aquecimento rigoroso antes dos treinos e em exercícios de flexibilidade para manter os músculos longos, elásticos e protegidos contra estiramentos.",
          recommendation: "Parabenizamos pelo excelente vigor físico. Seguiremos oferecendo desafios de alta intensidade em aula para manter o aluno motivado e saudável.",
          alertColor: "blue"
        }
      ],
      forca_muscular: [
        {
          id: "f1",
          level: "INSUFICIENTE",
          healthStatus: "A capacidade de vencer resistências e sustentar o próprio corpo está abaixo do esperado. Na saúde, a falta de tônus muscular gera sobrecarga direta sobre os ossos e ligamentos, além de causar cansaço extremo em tarefas simples, como carregar a mochila ou manter a postura na carteira escolar.",
          toImprove: "O aluno precisa desenvolver urgentemente a força de base. O foco inicial deve ser em exercícios calistênicos simples (que usam o peso do próprio corpo), como apoios de joelhos no chão e agachamentos livres adaptados, focando estritamente na execução correta para ganho de massa magra protetora.",
          recommendation: "Incentivamos atividades lúdicas de força em casa, como brincadeiras de cabo de guerra, escalar brinquedos de parquinho (gaiolas) ou jogos de carregar objetos leves.",
          alertColor: "rose"
        },
        {
          id: "f2",
          level: "REGULAR",
          healthStatus: "O aluno possui uma força funcional para atividades rotineiras, mas falha ou perde o alinhamento corporal quando exposto a esforços um pouco mais prolongados. A estrutura de saúde é estável, porém a musculatura estabilizadora cansa rápido, gerando descompensações posturais durante os jogos.",
          toImprove: "O foco deve ser o aumento gradual da resistência de força. Recomenda-se a inserção de circuitos funcionais com pequenos implementos (como faixas elásticas ou bolas medicinais leves) para consolidar a estrutura muscular e proteger o sistema esquelético.",
          recommendation: "Incentivamos atividades lúdicas de força em casa, como brincadeiras de cabo de guerra, escalar brinquedos de parquinho (gaiolas) ou jogos de carregar objetos leves.",
          alertColor: "yellow"
        },
        {
          id: "f3",
          level: "BOM",
          healthStatus: "Nível saudável e totalmente adequado para a idade. O aluno apresenta ótima densidade e tônus muscular, sustentando movimentos de impacto com segurança. Essa força atua como um escudo protetor para as articulações, acelerando o metabolismo e garantindo excelente postura corporal.",
          toImprove: "Embora o nível seja seguro, o aluno pode melhorar a simetria da força (equilíbrio entre o lado direito e esquerdo do corpo). Exercícios unilaterais ajudarão a refinar o movimento e preparar o corpo para a transição rumo ao nível excelente.",
          recommendation: "Parabenizamos pelo excelente suporte físico. Seguiremos com estímulos desafiadores em aula para manter a integridade da saúde muscular do estudante.",
          alertColor: "emerald"
        },
        {
          id: "f4",
          level: "EXCELENTE",
          healthStatus: "Desempenho físico excepcional. O aluno demonstra altíssima capacidade de gerar tensão muscular e potência. Seu sistema esquelético está totalmente protegido contra lesões por impacto, e a musculatura apresenta excelente eficiência metabólica e capacidade de recuperação.",
          toImprove: "O objetivo agora é zelar pela longevidade dessa performance. Recomenda-se associar o treino de força máxima a sessões rigorosas de alongamento e flexibilidade, evitando o encurtamento muscular e a perda de amplitude de movimento nas articulações.",
          recommendation: "Parabenizamos pelo excelente suporte físico. Seguiremos com estímulos desafiadores em aula para manter a integridade da saúde muscular do estudante.",
          alertColor: "blue"
        }
      ],
      agilidade: [
        {
          id: "a1",
          level: "INSUFICIENTE",
          healthStatus: "A capacidade de mudar de direção rapidamente está abaixo do esperado. O aluno apresenta dificuldades para frear e reajustar o corpo com controle. Na saúde, a falta de agilidade e coordenação aumenta significativamente o risco de quedas, entorses de tornozelo e lesões nos ligamentos do joelho em movimentos bruscos.",
          toImprove: "O aluno precisa desenvolver urgentemente o tempo de reação e a consciência corporal. O foco inicial deve ser em exercícios de desaceleração controlada e educativos de passadas laterais, aprendendo a abaixar o centro de gravidade para ganhar estabilidade.",
          recommendation: "Incentivamos a prática de brincadeiras de rua tradicionais em casa, como pega-pega, queimada ou circuitos de zigue-zague desenhados no chão.",
          alertColor: "rose"
        },
        {
          id: "a2",
          level: "REGULAR",
          healthStatus: "O aluno consegue mudar de direção, mas perde o equilíbrio ou a velocidade durante o movimento. Há uma base motora funcional, mas falta eficiência nas articulações para transferir o peso corporal de um lado para o outro de forma fluida, gastando mais energia do que o necessário.",
          toImprove: "O foco deve ser o refinamento técnico. Recomenda-se treinar com circuitos de cones e escadas de agilidade para melhorar o trabalho de pés (footwork) e a transição rápida de movimentos, aumentando a segurança articular.",
          recommendation: "Incentivamos a prática de brincadeiras de rua tradicionais em casa, como pega-pega, queimada ou circuitos de zigue-zague desenhados no chão.",
          alertColor: "yellow"
        },
        {
          id: "a3",
          level: "BOM",
          healthStatus: "Nível saudável e totalmente adequado para a faixa etária. O aluno demonstra ótimo controle corporal, consegue frear e mudar de rumo com segurança e estabilidade. Essa agilidade protege as articulações contra sobrecargas e reflete um sistema neuromuscular bem desenvolvido.",
          toImprove: "Embora o nível seja seguro e protetor, o aluno pode aprimorar a eficiência do movimento diminuindo o tempo de hesitação antes de mudar de direção. Introduzir estímulos visuais ou sonoros surpresa ajudará a refinar ainda mais o tempo de reação.",
          recommendation: "Parabenizamos pela excelente agilidade e prontidão motora. Continuaremos desafiando o estudante com dinâmicas complexas nas aulas.",
          alertColor: "emerald"
        },
        {
          id: "a4",
          level: "EXCELENTE",
          healthStatus: "Desempenho físico excepcional. O aluno apresenta uma velocidade de reação impressionante e um controle de centro de gravidade perfeito ao mudar de direção. Seu sistema proprioceptivo (capacidade do corpo de reconhecer a própria posição) é altamente eficaz, garantindo proteção máxima contra lesões.",
          toImprove: "O objetivo atual é manter essa alta performance. Recomenda-se integrar movimentos de agilidade com tomadas de decisão complexas e uso de implementos (como bolas), preparando o aluno para alto rendimento em cenários de jogo reais.",
          recommendation: "Parabenizamos pela excelente agilidade e prontidão motora. Continuaremos desafiando o estudante com dinâmicas complexas nas aulas.",
          alertColor: "blue"
        }
      ],
      abdomen: [
        {
          id: "ab1",
          level: "INSUFICIENTE",
          healthStatus: "A resistência da região abdominal está abaixo do esperado. O core (centro de gravidade do corpo) fraco prejudica diretamente a postura, sobrecarrega a coluna lombar e aumenta o risco de dores nas costas e desvios posturais a médio prazo.",
          toImprove: "O aluno precisa iniciar urgentemente o fortalecimento da musculatura central. É necessário focar na ativação do abdômen através de exercícios estáticos simples, corrigindo a respiração e evitando puxar o pescoço durante a execução.",
          recommendation: "Incentivamos o estímulo diário através de desafios rápidos em casa, como brincadeiras que envolvam a posição de prancha ou elevação de pernas.",
          alertColor: "rose"
        },
        {
          id: "ab2",
          level: "REGULAR",
          healthStatus: "O aluno possui uma força abdominal básica, mas cansa muito rápido ao tentar manter o esforço. Essa fadiga precoce faz com que ele comece a compensar o movimento com outras partes do corpo, desestabilizando o tronco durante corridas e jogos.",
          toImprove: "O foco deve ser o aumento gradual do tempo de execução dos exercícios. Treinar a constância e o ritmo das repetições vai ajudar a estabilizar o tronco e proteger a coluna por períodos mais longos.",
          recommendation: "Incentivamos o preço ou estímulo diário através de desafios rápidos em casa, como brincadeiras que envolvam a posição de prancha ou elevação de pernas.",
          alertColor: "yellow"
        },
        {
          id: "ab3",
          level: "BOM",
          healthStatus: "Nível saudável e dentro do padrão recomendado. O aluno apresenta boa sustentação do tronco, o que garante estabilidade corporal, melhora o equilíbrio e protege a região lombar contra os impactos gerados por saltos e corridas.",
          toImprove: "Embora o nível seja seguro, o aluno pode equilibrar o treino trabalhando as variações do abdômen (como a região lateral/oblíqua). Isso vai aprimorar a rotação do tronco nos esportes e consolidar a evolução para o nível excelente.",
          recommendation: "Parabenizamos pela excelente condição de saúde física. Manteremos os estímulos nas aulas para preservar esse ótimo suporte postural.",
          alertColor: "emerald"
        },
        {
          id: "ab4",
          level: "EXCELENTE",
          healthStatus: "Desempenho físico excepcional. O aluno possui excelente resistência muscular na região central do corpo. Isso resulta em uma postura impecável, altíssima eficiência de movimentos e proteção máxima da coluna vertebral sob qualquer tipo de carga ou esforço.",
          toImprove: "O objetivo agora é manter o padrão. Recomenda-se integrar a força desse abdômen com exercícios de flexibilidade e alongamento da cadeia posterior para evitar qualquer tipo de rigidez muscular.",
          recommendation: "Parabenizamos pela excelente condição de saúde física. Manteremos os estímulos nas aulas para preservar esse ótimo suporte postural.",
          alertColor: "blue"
        }
      ],
      impulsao: [
        {
          id: "i1",
          level: "INSUFICIENTE",
          healthStatus: "O índice de impulsão está abaixo do esperado para a faixa etária. Isso indica baixa potência e falta de ativação dos músculos das pernas. Na saúde, isso compromete o amortecimento de impactos e enfraquece a estrutura das articulações do joelho e tornozelo.",
          toImprove: "O aluno precisa desenvolver urgentemente a força de arranque. É necessário corrigir a postura do agachamento e a mecânica do salto para evitar lesões em atividades simples do dia a dia.",
          recommendation: "Incentivamos o apoio em atividades dinâmicas em casa, como pular corda e brincadeiras de salto.",
          alertColor: "rose"
        },
        {
          id: "i2",
          level: "REGULAR",
          healthStatus: "O aluno possui uma base de força, mas falta explosão muscular. O rendimento físico oscila e gasta mais energia do que o necessário para executar saltos. A estrutura de saúde é estável, mas apresenta fadiga rápida em circuitos.",
          toImprove: "O foco deve ser a coordenação entre o movimento dos braços e pernas durante o salto. Exercícios repetitivos de saltos baixos vão ajudar a transformar a força atual em potência real.",
          recommendation: "Incentivamos o apoio em atividades dinâmicas em casa, como pular corda e brincadeiras de salto.",
          alertColor: "yellow"
        },
        {
          id: "i3",
          level: "BOM",
          healthStatus: "O nível é saudável e adequado. O aluno apresenta boa resposta neuromuscular e consegue vencer a gravidade com facilidade. Essa condição protege a coluna e absorve impactos de forma segura durante jogos e corridas.",
          toImprove: "Embora esteja em um nível seguro, o aluno pode melhorar a estabilidade no momento da aterrissagem. O treinamento deve focar no equilíbrio para evoluir do nível bom para o excelente.",
          recommendation: "Parabenizamos pelo ótimo histórico físico. Continuaremos desafiando o estudante nas aulas para manter este padrão de excelência.",
          alertColor: "emerald"
        },
        {
          id: "i4",
          level: "EXCELENTE",
          healthStatus: "Desempenho físico excepcional. O aluno possui excelente potência de membros inferiores e coordenação motora impecável. O sistema musculoesquelético está altamente protegido e preparado para desafios físicos de alta intensidade.",
          toImprove: "O foco agora é a manutenção dessa valência. Recomenda-se o ganho de flexibilidade para que a alta potência não gere rigidez muscular.",
          recommendation: "Parabenizamos pelo ótimo histórico físico. Continuaremos desafiando o estudante nas aulas para manter este padrão de excelência.",
          alertColor: "blue"
        }
      ]
    };
  });

  // Save Módulo 5 to local storage whenever it changes
  const skipSyncM5 = useRef(true);
  useEffect(() => {
    if (skipSyncM5.current) { skipSyncM5.current = false; return; }
    localStorage.setItem("educore_m5_capacidades_data", JSON.stringify(m5Data));
    // Sync to Supabase
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        Object.entries(m5Data).forEach(([capacidade, rows]) => {
          rows.forEach(item => {
            supabase.from("m5_capacidades_config").upsert({
              id: item.id,
              category: capacidade,
              level: item.level,
              health_status: item.healthStatus,
              to_improve: item.toImprove,
              recommendation: item.recommendation,
              alert_color: item.alertColor,
            }).then(({ error }) => {
              if (error) console.error("Error saving m5_capacidades_config to Supabase:", error?.message ?? error);
            });
          });
        });
      }
    }
  }, [m5Data]);

  const [m5NewRow, setM5NewRow] = useState<Omit<M5Row, "id">>({
    level: "",
    healthStatus: "",
    toImprove: "",
    recommendation: "",
    alertColor: "emerald"
  });

  const [m5EditingRowId, setM5EditingRowId] = useState<string | null>(null);
  const [m5EditingRowData, setM5EditingRowData] = useState<M5Row | null>(null);

  const m5AddRow = async () => {
    if (!m5NewRow.level.trim() || !m5NewRow.healthStatus.trim() || !m5NewRow.toImprove.trim() || !m5NewRow.recommendation.trim()) {
      return;
    }
    const newId = (await nextM5CapacidadeId()) || ('m5_' + uuid().slice(0, 8));
    const newRow = { ...m5NewRow, id: newId };
    setM5Data((prev) => ({
      ...prev,
      [activeM5Tab]: [...prev[activeM5Tab], newRow]
    }));
    setM5NewRow({
      level: "",
      healthStatus: "",
      toImprove: "",
      recommendation: "",
      alertColor: "emerald"
    });

    // Sync to Supabase
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        supabase.from("m5_capacidades_config").upsert({
          id: newRow.id,
          category: activeM5Tab,
          level: newRow.level,
          health_status: newRow.healthStatus,
          to_improve: newRow.toImprove,
          recommendation: newRow.recommendation,
          alert_color: newRow.alertColor,
        }).then(({ error }) => {
          if (error) console.error("Error saving m5_capacidades_config to Supabase:", error?.message ?? error);
        });
      }
    }
  };

  const m5DeleteRow = (id: string) => {
    const row = m5Data[activeM5Tab]?.find((r) => r.id === id);
    if (row) {
      setM5RowToDelete(row);
    }
  };

  const handleConfirmDeleteM5 = () => {
    if (m5RowToDelete) {
      const deletedId = m5RowToDelete.id;
      setM5Data((prev) => ({
        ...prev,
        [activeM5Tab]: prev[activeM5Tab].filter((row) => row.id !== deletedId)
      }));
      setM5RowToDelete(null);

      // Sync to Supabase
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          supabase.from("m5_capacidades_config").delete().eq("id", deletedId).then(({ error }) => {
            if (error) console.error("Error deleting m5_capacidades_config from Supabase:", error);
          });
        }
      }
    }
  };

  const m5StartEditing = (row: M5Row) => {
    setM5EditingRowId(row.id);
    setM5EditingRowData({ ...row });
  };

  const m5CancelEditing = () => {
    setM5EditingRowId(null);
    setM5EditingRowData(null);
  };

  const m5SaveEditing = () => {
    if (m5EditingRowData) {
      setM5Data((prev) => ({
        ...prev,
        [activeM5Tab]: prev[activeM5Tab].map((row) => row.id === m5EditingRowId ? m5EditingRowData : row)
      }));
      setM5EditingRowId(null);
      setM5EditingRowData(null);

      // Sync to Supabase
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          supabase.from("m5_capacidades_config").upsert({
            id: m5EditingRowData.id,
            category: activeM5Tab,
            level: m5EditingRowData.level,
            health_status: m5EditingRowData.healthStatus,
            to_improve: m5EditingRowData.toImprove,
            recommendation: m5EditingRowData.recommendation,
            alert_color: m5EditingRowData.alertColor,
          }).then(({ error }) => {
            if (error) console.error("Error saving m5_capacidades_config to Supabase:", error?.message ?? error);
          });
        }
      }
    }
  };

  // Módulo 2 Specific States
  const [m2Modalidades, setM2Modalidades] = useState<M2Modality[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m2_modalidades_config");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return DEFAULT_M2_MODALIDADES;
  });

  const [showM2Modal, setShowM2Modal] = useState(false);
  const [m2ModalMode, setM2ModalMode] = useState<"create" | "edit">("create");
  const [editingM2Id, setEditingM2Id] = useState<string | null>(null);
  const [m2NewName, setM2NewName] = useState("");
  const [m2NewReqs, setM2NewReqs] = useState<M2Requirements>({
    imc: ["Bom", "Excelente"],
    v20m: ["Bom", "Excelente"],
    impulsao: ["Bom", "Excelente"],
    flexao: ["Bom", "Excelente"],
    agilidade: ["Bom", "Excelente"],
    abdominal: ["Bom", "Excelente"],
  });

  const [simulatedStudentId, setSimulatedStudentId] = useState<string>(() => {
    if (user?.role === "Aluno" && students.length > 0) {
      const found = students.find(
        (s) =>
          s.email?.toLowerCase().trim() === user.email?.toLowerCase().trim() ||
          s.name?.toLowerCase().trim() === user.name?.toLowerCase().trim() ||
          s.id === user.id,
      );
      if (found) {
        return found.id;
      }
    }
    return "";
  });

  const [localImcRecords, setLocalImcRecords] = useState<ImcRecord[]>(() => {
    if (typeof window !== "undefined") {
      const imc = localStorage.getItem("educore_avaliacoes_imc");
      if (imc) {
        try {
          return JSON.parse(imc);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });

  const [localMotorRecords, setLocalMotorRecords] = useState<MotorRecord[]>(() => {
    if (typeof window !== "undefined") {
      const motor = localStorage.getItem("educore_avaliacoes_motor");
      if (motor) {
        try {
          return JSON.parse(motor);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });

  // Load evaluations for matching whenever activeTab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const imc = localStorage.getItem("educore_avaliacoes_imc");
        if (imc) {
          try {
            setLocalImcRecords(JSON.parse(imc));
          } catch (e) {
            console.error(e);
          }
        }
        const motor = localStorage.getItem("educore_avaliacoes_motor");
        if (motor) {
          try {
            setLocalMotorRecords(JSON.parse(motor));
          } catch (e) {
            console.error(e);
          }
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const saveM2Modalidades = async (newData: M2Modality[]) => {
    setM2Modalidades(newData);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "educore_m2_modalidades_config",
        JSON.stringify(newData),
      );
    }

    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        try {
          // Deletions on Supabase (remove items not in newData)
          const { data: currentDb } = await supabase
            .from("m2_modalidades_config")
            .select("id");
          if (currentDb && currentDb.length > 0) {
            const newDataIds = newData.map((m) => m.id);
            const toDelete = currentDb
              .map((row: { id: string }) => row.id)
              .filter((id: string) => !newDataIds.includes(id));
            if (toDelete.length > 0) {
              const { error: delError } = await supabase
                .from("m2_modalidades_config")
                .delete()
                .in("id", toDelete);
              if (delError)
                console.error(
                  "Error deleting from m2_modalidades_config:",
                  delError,
                );
            }
          }

          // Upsert all newData to keep the live configs fully matching
          for (const item of newData) {
            const { error: upsertError } = await supabase
              .from("m2_modalidades_config")
              .upsert({
                id: item.id,
                name: item.name,
                requirements: item.requirements,
              });
            if (upsertError)
              console.error(
                "Error upserting to m2_modalidades_config:",
                upsertError?.message ?? upsertError,
              );
          }
        } catch (e) {
          console.error("Error saving modalities configs to Supabase:", e instanceof Error ? e.message : e);
        }
      }
    }
  };

  const handleConfirmDeleteM2Modality = () => {
    if (!m2ModalityToDelete) return;
    const next = m2Modalidades.filter((m) => m.id !== m2ModalityToDelete.id);
    saveM2Modalidades(next);
    setM2ModalityToDelete(null);
    setSuccessMessage("Modalidade removida com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };


  const [searchQuery, setSearchQuery] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refToDelete, setRefToDelete] = useState<AptidaoRef | null>(null);
  const [m2ModalityToDelete, setM2ModalityToDelete] = useState<M2Modality | null>(
    null,
  );
  const [activeTableTab, setActiveTableTab] = useState<
    "forca" | "impulsao" | "abdomen" | "agilidade" | "velocidade"
  >("forca");

  // CRUD states and handlers for Módulo 1 reference tables
  const [aptidaoRefs, setAptidaoRefs] = useState<AptidaoRef[]>(() => {
    const INITIAL_REFS = [
      // Força Muscular
      {
        id: "f-1",
        category: "forca",
        idade: "0 a 8",
        sexo: "Masculino",
        insuficiente: "0 a 1",
        regular: "2",
        bom: "3",
        excelente: "4 ou mais",
      },
      {
        id: "f-2",
        category: "forca",
        idade: "0 a 8",
        sexo: "Feminino",
        insuficiente: "0 a 1",
        regular: "2",
        bom: "3",
        excelente: "4 ou mais",
      },
      {
        id: "f-3",
        category: "forca",
        idade: "9 a 12",
        sexo: "Masculino",
        insuficiente: "0 a 2",
        regular: "3 a 4",
        bom: "5 a 6",
        excelente: "7 ou mais",
      },
      {
        id: "f-4",
        category: "forca",
        idade: "9 a 12",
        sexo: "Feminino",
        insuficiente: "0 a 1",
        regular: "2 a 3",
        bom: "4 a 5",
        excelente: "6 ou mais",
      },
      {
        id: "f-5",
        category: "forca",
        idade: "13 a 14",
        sexo: "Masculino",
        insuficiente: "0 a 3",
        regular: "4 a 5",
        bom: "6 a 7",
        excelente: "8 ou mais",
      },
      {
        id: "f-6",
        category: "forca",
        idade: "13 a 14",
        sexo: "Feminino",
        insuficiente: "0 a 2",
        regular: "3 a 4",
        bom: "5 a 6",
        excelente: "7 ou mais",
      },
      {
        id: "f-7",
        category: "forca",
        idade: "15 a 17",
        sexo: "Masculino",
        insuficiente: "0 a 4",
        regular: "5 a 6",
        bom: "7 a 8",
        excelente: "9 ou mais",
      },
      {
        id: "f-8",
        category: "forca",
        idade: "15 a 17",
        sexo: "Feminino",
        insuficiente: "0 a 4",
        regular: "5 a 6",
        bom: "7 a 8",
        excelente: "9 ou mais",
      },
      {
        id: "f-9",
        category: "forca",
        idade: "18 ou mais",
        sexo: "Masculino",
        insuficiente: "0 a 6",
        regular: "7 a 9",
        bom: "10 a 11",
        excelente: "12 ou mais",
      },
      {
        id: "f-10",
        category: "forca",
        idade: "18 ou mais",
        sexo: "Feminino",
        insuficiente: "0 a 6",
        regular: "7 a 9",
        bom: "10 a 11",
        excelente: "12 ou mais",
      },

      // Impulsão
      {
        id: "i-1",
        category: "impulsao",
        idade: "0 a 8",
        sexo: "Masculino",
        insuficiente: "0 a 30",
        regular: "31 a 40",
        bom: "41 a 80",
        excelente: "81 ou mais",
      },
      {
        id: "i-2",
        category: "impulsao",
        idade: "0 a 8",
        sexo: "Feminino",
        insuficiente: "0 a 30",
        regular: "31 a 40",
        bom: "41 a 80",
        excelente: "81 ou mais",
      },
      {
        id: "i-3",
        category: "impulsao",
        idade: "9 a 12",
        sexo: "Masculino",
        insuficiente: "0 a 60",
        regular: "61 a 90",
        bom: "91 a 140",
        excelente: "141 ou mais",
      },
      {
        id: "i-4",
        category: "impulsao",
        idade: "9 a 12",
        sexo: "Feminino",
        insuficiente: "0 a 60",
        regular: "61 a 90",
        bom: "91 a 140",
        excelente: "141 ou mais",
      },
      {
        id: "i-5",
        category: "impulsao",
        idade: "13 a 14",
        sexo: "Masculino",
        insuficiente: "0 a 80",
        regular: "81 a 100",
        bom: "101 a 150",
        excelente: "151 ou mais",
      },
      {
        id: "i-6",
        category: "impulsao",
        idade: "13 a 14",
        sexo: "Feminino",
        insuficiente: "0 a 80",
        regular: "81 a 100",
        bom: "101 a 150",
        excelente: "151 ou mais",
      },
      {
        id: "i-7",
        category: "impulsao",
        idade: "15 a 17",
        sexo: "Masculino",
        insuficiente: "81 a 100",
        regular: "101 a 120",
        bom: "121 a 180",
        excelente: "181 ou mais",
      },
      {
        id: "i-8",
        category: "impulsao",
        idade: "15 a 17",
        sexo: "Feminino",
        insuficiente: "81 a 100",
        regular: "101 a 120",
        bom: "121 a 180",
        excelente: "181 ou mais",
      },
      {
        id: "i-9",
        category: "impulsao",
        idade: "18 ou mais",
        sexo: "Masculino",
        insuficiente: "101 a 120",
        regular: "121 a 180",
        bom: "181 a 200",
        excelente: "201 ou mais",
      },
      {
        id: "i-10",
        category: "impulsao",
        idade: "18 ou mais",
        sexo: "Feminino",
        insuficiente: "101 a 120",
        regular: "121 a 180",
        bom: "181 a 200",
        excelente: "201 ou mais",
      },

      // Abdômen
      {
        id: "a-1",
        category: "abdomen",
        idade: "Todas as idades",
        sexo: "Todos os sexos",
        insuficiente: "Não se aplica",
        regular: "0 a 29",
        bom: "Não se aplica",
        excelente: "30 ou mais",
      },

      // Agilidade
      {
        id: "ag-1",
        category: "agilidade",
        idade: "0 a 8",
        sexo: "Masculino",
        insuficiente: "17 ou mais",
        regular: "15 a 16",
        bom: "12 a 14",
        excelente: "11 ou menos",
      },
      {
        id: "ag-2",
        category: "agilidade",
        idade: "0 a 8",
        sexo: "Feminino",
        insuficiente: "17 ou mais",
        regular: "15 a 16",
        bom: "12 a 14",
        excelente: "11 ou menos",
      },
      {
        id: "ag-3",
        category: "agilidade",
        idade: "9 a 12",
        sexo: "Masculino",
        insuficiente: "16 ou mais",
        regular: "14 a 15",
        bom: "11 a 13",
        excelente: "10 ou menos",
      },
      {
        id: "ag-4",
        category: "agilidade",
        idade: "9 a 12",
        sexo: "Feminino",
        insuficiente: "16 ou mais",
        regular: "14 a 15",
        bom: "11 a 13",
        excelente: "10 ou menos",
      },
      {
        id: "ag-5",
        category: "agilidade",
        idade: "13 a 14",
        sexo: "Masculino",
        insuficiente: "15 ou mais",
        regular: "13 a 14",
        bom: "12 a 10",
        excelente: "9 ou menos",
      },
      {
        id: "ag-6",
        category: "agilidade",
        idade: "13 a 14",
        sexo: "Feminino",
        insuficiente: "15 ou mais",
        regular: "13 a 14",
        bom: "12 a 10",
        excelente: "9 ou menos",
      },
      {
        id: "ag-7",
        category: "agilidade",
        idade: "15 a 17",
        sexo: "Masculino",
        insuficiente: "14 ou mais",
        regular: "11 a 13",
        bom: "9 a 10",
        excelente: "8 ou menos",
      },
      {
        id: "ag-8",
        category: "agilidade",
        idade: "15 a 17",
        sexo: "Feminino",
        insuficiente: "14 ou mais",
        regular: "11 a 13",
        bom: "9 a 10",
        excelente: "8 ou menos",
      },
      {
        id: "ag-9",
        category: "agilidade",
        idade: "18 ou mais",
        sexo: "Masculino",
        insuficiente: "14 ou mais",
        regular: "11 a 13",
        bom: "9 a 10",
        excelente: "8 ou menos",
      },

      // Velocidade
      {
        id: "v-1",
        category: "velocidade",
        idade: "0 a 8",
        sexo: "Masculino",
        insuficiente: "7,00 ou mais",
        regular: "6,12 a 6,99",
        bom: "4,11 a 6,11",
        excelente: "4,10 ou menos",
      },
      {
        id: "v-2",
        category: "velocidade",
        idade: "0 a 8",
        sexo: "Feminino",
        insuficiente: "7,00 ou mais",
        regular: "6,12 a 6,99",
        bom: "4,11 a 6,11",
        excelente: "4,10 ou menos",
      },
      {
        id: "v-3",
        category: "velocidade",
        idade: "9 a 12",
        sexo: "Masculino",
        insuficiente: "7,00 ou mais",
        regular: "5,61 a 6,99",
        bom: "3,61 a 5,60",
        excelente: "3,60 ou menos",
      },
      {
        id: "v-4",
        category: "velocidade",
        idade: "9 a 12",
        sexo: "Feminino",
        insuficiente: "7,00 ou mais",
        regular: "5,81 a 6,99",
        bom: "3,81 a 5,80",
        excelente: "3,80 ou menos",
      },
      {
        id: "v-5",
        category: "velocidade",
        idade: "13 a 14",
        sexo: "Masculino",
        insuficiente: "7,00 ou mais",
        regular: "5,47 a 6,99",
        bom: "3,46 a 5,46",
        excelente: "3,45 ou menos",
      },
      {
        id: "v-6",
        category: "velocidade",
        idade: "13 a 14",
        sexo: "Feminino",
        insuficiente: "7,00 ou mais",
        regular: "5,69 a 6,99",
        bom: "3,68 a 5,68",
        excelente: "3,68 ou menos",
      },
      {
        id: "v-7",
        category: "velocidade",
        idade: "15 a 17",
        sexo: "Masculino",
        insuficiente: "7,00 ou mais",
        regular: "5,81 a 6,99",
        bom: "3,81 a 5,80",
        excelente: "3,80 ou menos",
      },
      {
        id: "v-8",
        category: "velocidade",
        idade: "15 a 17",
        sexo: "Feminino",
        insuficiente: "7,00 ou mais",
        regular: "5,17 a 6,99",
        bom: "3,16 a 5,16",
        excelente: "3,15 ou menos",
      },
      {
        id: "v-9",
        category: "velocidade",
        idade: "18 ou mais",
        sexo: "Masculino",
        insuficiente: "7,00 ou mais",
        regular: "5,81 a 6,99",
        bom: "3,81 a 5,80",
        excelente: "3,80 ou menos",
      },
    ];

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("educore_aptidao_referenciais");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error("Erro ao deparar referenciais do localStorage:", e);
        }
      }
    }
    return INITIAL_REFS;
  });

  const [isEditingRef, setIsEditingRef] = useState(false);
  const [editingRefItem, setEditingRefItem] = useState<AptidaoRef | null>(null);
  const [formIdade, setFormIdade] = useState("");
  const [formSexo, setFormSexo] = useState("");
  const [formInsuficiente, setFormInsuficiente] = useState("");
  const [formRegular, setFormRegular] = useState("");
  const [formBom, setFormBom] = useState("");
  const [formExcelente, setFormExcelente] = useState("");

  // Módulo 3 - Análise de Frequência States
  const [m3Analises, setM3Analises] = useState<M3Analise[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_analise_frequencia");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });

  const [m3FormStudentId, setM3FormStudentId] = useState("");
  const [m3FormPeriodo, setM3FormPeriodo] = useState("Junho/2026");
  const [m3FormCenario, setM3FormCenario] = useState<"A" | "B" | "C">("A");
  const [m3FormParecerFrequencia, setM3FormParecerFrequencia] = useState("");
  const [m3FormVantagens, setM3FormVantagens] = useState<string[]>([]);
  const [m3FormDesvantagens, setM3FormDesvantagens] = useState<string[]>([]);
  const [m3FormParecerPais, setM3FormParecerPais] = useState("");
  const [m3ShowModal, setM3ShowModal] = useState(false);
  const [m3EditingItem, setM3EditingItem] = useState<M3Analise | null>(null);
  const [m3SearchQuery, setM3SearchQuery] = useState("");
  const [m3SelectedId, setM3SelectedId] = useState<string | null>(null);

  // States and CRUD for M3 custom tables
  const [m3Cenarios, setM3Cenarios] = useState<M3Cenario[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m3_cenarios");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [
      {
        id: "c1",
        cenario: "CENÁRIO A",
        condicao: "Mais presenças do que faltas",
        frequencia:
          "O estudante demonstrou excelente regularidade e compromisso com a rotina escolar ao longo deste mês. A baixa taxa de absenteísmo reflete uma postura participativa e engajada com o ambiente de aprendizagem.",
        mensagem:
          "Parabéns pelo incentivo e parceria. A presença constante tem sido o pilar para os bons resultados mantidos até aqui.",
      },
      {
        id: "c2",
        cenario: "CENÁRIO B",
        condicao: "Mais faltas do que presenças",
        frequencia:
          "Identificamos um número crítico de ausências neste período, superando os dias de comparecimento em sala de aula. Esse padrão de faltas excessivas acende um alerta pedagógico, pois interrompe a sequência didática e prejudica a absorção dos conteúdos ministrados.",
        mensagem:
          "Solicitamos uma atenção especial e um diálogo familiar para identificarmos o motivo das ausências. É fundamental restabelecer a rotina de idas à escola para evitar prejuízos severos na avaliação final deste ciclo.",
      },
      {
        id: "c3",
        cenario: "CENÁRIO C",
        condicao: "Não houver presença ou falta registrada",
        frequencia:
          "Até o momento, não foram identificados registros de presença ou ausência para o estudante no sistema neste período. A ausência de dados impede uma avaliação precisa do acompanhamento escolar, tornando indispensável a verificação imediata junto à secretaria ou equipe pedagógica para a regularização dos lançamentos.",
        mensagem:
          "Solicitamos que entrem em contato com a secretaria escolar para a regularização dos registros. Constatamos que não há lançamentos de presença ou falta até o momento, o que impossibilita o acompanhamento correto da rotina do estudante.",
      },
    ];
  });

  const [m3Impactos, setM3Impactos] = useState<M3Impacto[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("educore_m3_impactos");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [
      {
        id: "i1",
        tipo: "Vantagem (Ponto Forte)",
        indicador: "Continuidade Pedagógica, Socialização e Ritmo de Avaliação",
        descricao:
          "Quando presente, o aluno acompanha as explicações passo a passo, facilitando a execução de tarefas complexas. A convivência diária fortalece os vínculos com professores e colegas, desenvolvendo inteligência emocional e trabalho em equipe. Menor necessidade de aplicação de provas substitutivas ou trabalhos de recuperação de nota por perda de prazos.",
      },
      {
        id: "i2",
        tipo: "Desvantagem (Ponto de Atenção)",
        indicador:
          "Lacunas de Conteúdo, Desengajamento Escolar e Sobrecarga de Tarefas",
        descricao:
          "Cada ausência gera a perda de conceitos-chave, acumulando dúvidas para as unidades seguintes. O excesso de faltas quebra a rotina do estudante, gerando desmotivação e sensação de isolamento em relação à turma. Acúmulo de atividades pendentes que precisam ser realizadas em casa para cumprir as exigências do ano letivo.",
      },
    ];
  });

  const saveCenarios = (newList: M3Cenario[]) => {
    setM3Cenarios(newList);
    localStorage.setItem("educore_m3_cenarios", JSON.stringify(newList));

    // Sync to Supabase
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        const rows = newList.map((r) => ({
          id: r.id,
          cenario: r.cenario,
          condicao: r.condicao,
          frequencia: r.frequencia,
          mensagem: r.mensagem,
        }));
        supabase.from("m3_cenarios").upsert(rows).then(({ error }) => {
          if (error) console.error("Error saving m3_cenarios to Supabase:", error?.message ?? error);
        });
      }
    }
  };

  const saveImpactos = (newList: M3Impacto[]) => {
    setM3Impactos(newList);
    localStorage.setItem("educore_m3_impactos", JSON.stringify(newList));

    // Sync to Supabase
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        const rows = newList.map((r) => ({
          id: r.id,
          tipo: r.tipo,
          indicador: r.indicador,
          descricao: r.descricao,
        }));
        supabase.from("m3_impactos").upsert(rows).then(({ error }) => {
          if (error) console.error("Error saving m3_impactos to Supabase:", error?.message ?? error);
        });
      }
    }
  };

  // Confirmation state for deleting
  const [m3DeleteConfirmType, setM3DeleteConfirmType] = useState<"cenario" | "impacto" | "analise" | null>(null);
  const [m3DeleteConfirmId, setM3DeleteConfirmId] = useState<string | null>(null);
  const [showM3DeleteModal, setShowM3DeleteModal] = useState(false);

  // States for Scenario CRUD modals/forms
  const [m3EditCenarioModal, setM3EditCenarioModal] = useState(false);
  const [m3CenarioEditingItem, setM3CenarioEditingItem] = useState<M3Cenario | null>(
    null,
  );
  const [m3CenarioFormCenario, setM3CenarioFormCenario] = useState("");
  const [m3CenarioFormCondicao, setM3CenarioFormCondicao] = useState("");
  const [m3CenarioFormFrequencia, setM3CenarioFormFrequencia] = useState("");
  const [m3CenarioFormMensagem, setM3CenarioFormMensagem] = useState("");

  // States for Impact CRUD modals/forms
  const [m3EditImpactoModal, setM3EditImpactoModal] = useState(false);
  const [m3ImpactoEditingItem, setM3ImpactoEditingItem] = useState<M3Impacto | null>(
    null,
  );
  const [m3ImpactoFormTipo, setM3ImpactoFormTipo] = useState(
    "Vantagem (Ponto Forte)",
  );
  const [m3ImpactoFormIndicador, setM3ImpactoFormIndicador] = useState("");
  const [m3ImpactoFormDescricao, setM3ImpactoFormDescricao] = useState("");

  const handleOpenAddCenario = () => {
    setM3CenarioEditingItem(null);
    setM3CenarioFormCenario("");
    setM3CenarioFormCondicao("");
    setM3CenarioFormFrequencia("");
    setM3CenarioFormMensagem("");
    setM3EditCenarioModal(true);
  };

  const handleOpenEditCenario = (item: M3Cenario) => {
    setM3CenarioEditingItem(item);
    setM3CenarioFormCenario(item.cenario);
    setM3CenarioFormCondicao(item.condicao);
    setM3CenarioFormFrequencia(item.frequencia);
    setM3CenarioFormMensagem(item.mensagem);
    setM3EditCenarioModal(true);
  };

  const handleSaveCenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (m3CenarioEditingItem) {
      const updated = m3Cenarios.map((item) =>
        item.id === m3CenarioEditingItem.id
          ? {
              ...item,
              cenario: m3CenarioFormCenario,
              condicao: m3CenarioFormCondicao,
              frequencia: m3CenarioFormFrequencia,
              mensagem: m3CenarioFormMensagem,
            }
          : item,
      );
      saveCenarios(updated);
    } else {
      const newItem = {
        id: (await nextM3CenarioId()) || ('c' + uuid().slice(0, 8)),
        cenario: m3CenarioFormCenario,
        condicao: m3CenarioFormCondicao,
        frequencia: m3CenarioFormFrequencia,
        mensagem: m3CenarioFormMensagem,
      };
      saveCenarios([...m3Cenarios, newItem]);
    }
    setM3EditCenarioModal(false);
    setM3CenarioEditingItem(null);
  };

  const handleDeleteCenario = (id: string) => {
    setM3DeleteConfirmType("cenario");
    setM3DeleteConfirmId(id);
    setShowM3DeleteModal(true);
  };

  const handleOpenAddImpacto = () => {
    setM3ImpactoEditingItem(null);
    setM3ImpactoFormTipo("Vantagem (Ponto Forte)");
    setM3ImpactoFormIndicador("");
    setM3ImpactoFormDescricao("");
    setM3EditImpactoModal(true);
  };

  const handleOpenEditImpacto = (item: M3Impacto) => {
    setM3ImpactoEditingItem(item);
    setM3ImpactoFormTipo(item.tipo);
    setM3ImpactoFormIndicador(item.indicador);
    setM3ImpactoFormDescricao(item.descricao);
    setM3EditImpactoModal(true);
  };

  const handleSaveImpacto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (m3ImpactoEditingItem) {
      const updated = m3Impactos.map((item) =>
        item.id === m3ImpactoEditingItem.id
          ? {
              ...item,
              tipo: m3ImpactoFormTipo,
              indicador: m3ImpactoFormIndicador,
              descricao: m3ImpactoFormDescricao,
            }
          : item,
      );
      saveImpactos(updated);
    } else {
      const newItem = {
        id: (await nextM3ImpactoId()) || ('i' + uuid().slice(0, 8)),
        tipo: m3ImpactoFormTipo,
        indicador: m3ImpactoFormIndicador,
        descricao: m3ImpactoFormDescricao,
      };
      saveImpactos([...m3Impactos, newItem]);
    }
    setM3EditImpactoModal(false);
    setM3ImpactoEditingItem(null);
  };

  const handleDeleteImpacto = (id: string) => {
    setM3DeleteConfirmType("impacto");
    setM3DeleteConfirmId(id);
    setShowM3DeleteModal(true);
  };

  const executeM3Delete = () => {
    if (!m3DeleteConfirmId || !m3DeleteConfirmType) return;

    if (m3DeleteConfirmType === "cenario") {
      const updated = m3Cenarios.filter((item) => item.id !== m3DeleteConfirmId);
      saveCenarios(updated);
      setSuccessMessage("Cenário de frequência excluído com sucesso!");
    } else if (m3DeleteConfirmType === "impacto") {
      const updated = m3Impactos.filter((item) => item.id !== m3DeleteConfirmId);
      saveImpactos(updated);
      setSuccessMessage("Ponto de impacto excluído com sucesso!");
    }

    // Remove do Supabase explicitamente
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        const table = m3DeleteConfirmType === "cenario" ? "m3_cenarios" : "m3_impactos";
        supabase.from(table).delete().eq("id", m3DeleteConfirmId).then(({ error }) => {
          if (error) console.error(`Error deleting ${table} from Supabase:`, error);
        });
      }
    }

    setShowM3DeleteModal(false);
    setM3DeleteConfirmType(null);
    setM3DeleteConfirmId(null);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // Sync state with Supabase tables if configured
  useEffect(() => {
    const syncDbData = async () => {
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          try {
            // Load and parse m2_modalidades_config
            const { data: m2Data, error: m2Error } = await supabase
              .from("m2_modalidades_config")
              .select("id, name, requirements");
            if (!m2Error && m2Data && m2Data.length > 0) {
              const mappedM2 = m2Data.map(
                (row: {
                  id: string;
                  name: string;
                  requirements: string | Record<string, string[]>;
                }) => ({
                  id: row.id,
                  name: row.name,
                  requirements:
                    typeof row.requirements === "string"
                      ? JSON.parse(row.requirements)
                      : row.requirements,
                }),
              );
              setM2Modalidades(mappedM2);
              localStorage.setItem(
                "educore_m2_modalidades_config",
                JSON.stringify(mappedM2),
              );
            }
          } catch (e) {
            console.error(
              "Failed to sync m2_modalidades_config from Supabase:",
              e,
            );
          }

          // ======== MÓDULOS 3-7 ========
          try {
            // M3: Cenários de Frequência
            const { data: m3cData, error: m3cError } = await supabase
              .from("m3_cenarios")
              .select("id, cenario, condicao, frequencia, mensagem");
            if (!m3cError && m3cData && m3cData.length > 0) {
              const mappedM3C = m3cData.map(
                (row: {
                  id: string;
                  cenario: string;
                  condicao: string;
                  frequencia: string;
                  mensagem: string;
                }) => ({
                  id: row.id,
                  cenario: row.cenario,
                  condicao: row.condicao,
                  frequencia: row.frequencia,
                  mensagem: row.mensagem,
                }),
              );
              setM3Cenarios(mappedM3C);
              localStorage.setItem(
                "educore_m3_cenarios",
                JSON.stringify(mappedM3C),
              );
            } else {
              // Banco sem dados: enviar os cenários locais para o Supabase
              const localM3C = localStorage.getItem("educore_m3_cenarios");
              if (localM3C) {
                try {
                  const localListC = JSON.parse(localM3C) || [];
                  if (Array.isArray(localListC) && localListC.length > 0) {
                    const rowsC = localListC.map((r: M3Cenario) => ({
                      id: r.id,
                      cenario: r.cenario,
                      condicao: r.condicao,
                      frequencia: r.frequencia,
                      mensagem: r.mensagem,
                    }));
                    await supabase.from("m3_cenarios").upsert(rowsC).then(({ error }) => {
                      if (error) console.error("Error backfilling m3_cenarios to Supabase:", error?.message ?? error);
                      else console.warn("M3 cenarios: " + rowsC.length + " registros enviados ao Supabase.");
                    });
                  }
                } catch (e) {
                  console.error("Failed to backfill m3_cenarios from local data:", e);
                }
              }
            }
          } catch (e) {
            console.error("Failed to sync m3_cenarios from Supabase:", e);
          }

          try {
            // M3: Impactos Pedagógicos
            const { data: m3iData, error: m3iError } = await supabase
              .from("m3_impactos")
              .select("id, tipo, indicador, descricao");
            if (!m3iError && m3iData && m3iData.length > 0) {
              const mappedM3I = m3iData.map(
                (row: {
                  id: string;
                  tipo: string;
                  indicador: string;
                  descricao: string;
                }) => ({
                  id: row.id,
                  tipo: row.tipo,
                  indicador: row.indicador,
                  descricao: row.descricao,
                }),
              );
              setM3Impactos(mappedM3I);
              localStorage.setItem(
                "educore_m3_impactos",
                JSON.stringify(mappedM3I),
              );
            } else {
              // Banco sem dados: enviar os impactos locais para o Supabase
              const localM3I = localStorage.getItem("educore_m3_impactos");
              if (localM3I) {
                try {
                  const localListI = JSON.parse(localM3I) || [];
                  if (Array.isArray(localListI) && localListI.length > 0) {
                    const rowsI = localListI.map((r: M3Impacto) => ({
                      id: r.id,
                      tipo: r.tipo,
                      indicador: r.indicador,
                      descricao: r.descricao,
                    }));
                    await supabase.from("m3_impactos").upsert(rowsI).then(({ error }) => {
                      if (error) console.error("Error backfilling m3_impactos to Supabase:", error?.message ?? error);
                      else console.warn("M3 impactos: " + rowsI.length + " registros enviados ao Supabase.");
                    });
                  }
                } catch (e) {
                  console.error("Failed to backfill m3_impactos from local data:", e);
                }
              }
            }
          } catch (e) {
            console.error("Failed to sync m3_impactos from Supabase:", e);
          }

          try {
            // M4: IMC Data
            const { data: m4Data, error: m4Error } = await supabase
              .from("m4_imc_config")
              .select("id, classification, status, alert_color, description, imc_min, imc_max");
            if (!m4Error && m4Data && m4Data.length > 0) {
              const toIMCAlert = (c: string): 'emerald' | 'yellow' | 'orange' | 'rose' => {
                if (c === 'emerald' || c === 'yellow' || c === 'orange' || c === 'rose') return c;
                return 'yellow';
              };
              const mappedM4 = m4Data.map(
                (row: {
                  id: string;
                  classification: string;
                  status: string;
                  alert_color: string;
                  description: string;
                  imc_min: number | string | null;
                  imc_max: number | string | null;
                }) => ({
                  id: row.id,
                  classification: row.classification,
                  status: row.status,
                  alertColor: toIMCAlert(row.alert_color),
                  description: row.description,
                  imcMin: row.imc_min == null ? null : Number(row.imc_min),
                  imcMax: row.imc_max == null ? null : Number(row.imc_max),
                }),
              );
              setImcRows(mappedM4);
              localStorage.setItem(
                "educore_m4_imc_data",
                JSON.stringify(mappedM4),
              );
            }
          } catch (e) {
            console.error("Failed to sync m4_imc_config from Supabase:", e);
          }

          try {
            // M5: Capacidades Físicas
            const { data: m5Data, error: m5Error } = await supabase
              .from("m5_capacidades_config")
              .select("id, category, level, health_status, to_improve, recommendation, alert_color");
            if (!m5Error && m5Data && m5Data.length > 0) {
              const grouped: Record<string, M5Row[]> = {
                velocidade: [],
                forca_muscular: [],
                agilidade: [],
                abdomen: [],
                impulsao: [],
              };
              const toM5Alert = (c: string): 'rose' | 'yellow' | 'emerald' | 'blue' => {
                if (c === 'rose' || c === 'yellow' || c === 'emerald' || c === 'blue') return c;
                return 'yellow';
              };
              m5Data.forEach(
                (row: {
                  id: string;
                  category: string;
                  level: string;
                  health_status: string;
                  to_improve: string;
                  recommendation: string;
                  alert_color: string;
                }) => {
                  const mapped = {
                    id: row.id,
                    level: row.level,
                    healthStatus: row.health_status,
                    toImprove: row.to_improve,
                    recommendation: row.recommendation,
                    alertColor: toM5Alert(row.alert_color),
                  };
                  const cap = row.category;
                  if (grouped[cap]) {
                    grouped[cap].push(mapped);
                  }
                },
              );
              setM5Data(grouped);
              localStorage.setItem(
                "educore_m5_capacidades_data",
                JSON.stringify(grouped),
              );
            }
          } catch (e) {
            console.error("Failed to sync m5_capacidades_config from Supabase:", e);
          }

          try {
            // M6: Modalidades
            const { data: m6mData, error: m6mError } = await supabase
              .from("m6_modalidades_direcionamento")
              .select("id, name, valencias, condition, report");
            if (!m6mError && m6mData && m6mData.length > 0) {
              const mappedM6M = m6mData.map(
                (row: {
                  id: string;
                  name: string;
                  valencias: string;
                  condition: string;
                  report: string;
                }) => ({
                  id: row.id,
                  name: row.name,
                  valencias: row.valencias,
                  condition: row.condition,
                  report: row.report,
                }),
              );
              setM6Modalidades(mappedM6M);
              localStorage.setItem(
                "educore_m6_modalidades",
                JSON.stringify(mappedM6M),
              );
            }
          } catch (e) {
            console.error("Failed to sync m6_modalidades_direcionamento from Supabase:", e);
          }

          try {
            // M6: Diretrizes
            const { data: m6dData, error: m6dError } = await supabase
              .from("m6_diretrizes_intervencao")
              .select("id, diretriz, criterio, conduta, objetivo");
            if (!m6dError && m6dData && m6dData.length > 0) {
              const mappedM6D = m6dData.map(
                (row: {
                  id: string;
                  diretriz: string;
                  criterio: string;
                  conduta: string;
                  objetivo: string;
                }) => ({
                  id: row.id,
                  diretriz: row.diretriz,
                  criterio: row.criterio,
                  conduta: row.conduta,
                  objetivo: row.objetivo,
                }),
              );
              setM6Diretrizes(mappedM6D);
              localStorage.setItem(
                "educore_m6_diretrizes",
                JSON.stringify(mappedM6D),
              );
            }
          } catch (e) {
            console.error("Failed to sync m6_diretrizes_intervencao from Supabase:", e);
          }

          try {
            // M7: Profiles
            const { data: m7Data, error: m7Error } = await supabase
              .from("m7_perfis_pareceres")
              .select("id, profile, component, basic_data, reflection, interest_area, careers");
            if (!m7Error && m7Data && m7Data.length > 0) {
              const mappedM7 = m7Data.map(
                (row: {
                  id: string;
                  profile: string;
                  component: string;
                  basic_data: string;
                  reflection: string;
                  interest_area: string | null;
                  careers: string | null;
                }) => ({
                  id: row.id,
                  profile: row.profile,
                  component: row.component,
                  basicData: row.basic_data,
                  reflection: row.reflection,
                  interestArea: row.interest_area ?? "",
                  careers: row.careers ?? "",
                }),
              );
              setM7Rows(mappedM7);
              localStorage.setItem(
                "educore_m7_rows",
                JSON.stringify(mappedM7),
              );
            }
          } catch (e) {
            console.error("Failed to sync m7_perfis_pareceres from Supabase:", e);
          }

          try {
            // M1: Aptidao Referenciais
            const { data: aptData, error: aptError } = await supabase
              .from("aptidao_referenciais")
              .select("id, category, idade, sexo, insuficiente, regular, bom, excelente");
            if (!aptError && aptData && aptData.length > 0) {
              const mappedApt: AptidaoRef[] = aptData.map(
                (row: {
                  id: string;
                  category: string;
                  idade: string;
                  sexo: string;
                  insuficiente: string | null;
                  regular: string;
                  bom: string | null;
                  excelente: string;
                }) => ({
                  id: row.id,
                  category: row.category,
                  idade: row.idade,
                  sexo: row.sexo,
                  insuficiente: row.insuficiente ?? "",
                  regular: row.regular,
                  bom: row.bom ?? "",
                  excelente: row.excelente,
                }),
              );
              setAptidaoRefs(mappedApt);
              localStorage.setItem(
                "educore_aptidao_referenciais",
                JSON.stringify(mappedApt),
              );
            }
          } catch (e) {
            console.error("Failed to sync aptidao_referenciais from Supabase:", e);
          }

          try {
            // M8: Perguntas do Questionario Vocacional
            const { data: vocData, error: vocError } = await supabase
              .from("voc_questions")
              .select("id, ord, statement, option_a, option_b, option_c, option_d");
            if (!vocError && vocData && vocData.length > 0) {
              const mappedVoc: VocQuestion[] = vocData
                .map((row: { id: string; ord: number | null; statement: string; option_a: string; option_b: string; option_c: string; option_d: string }) => ({
                  id: row.id,
                  ord: row.ord ?? 0,
                  statement: row.statement,
                  optionA: row.option_a,
                  optionB: row.option_b,
                  optionC: row.option_c,
                  optionD: row.option_d,
                }))
                .sort((a, b) => a.ord - b.ord);
              setVocQuestions(mappedVoc);
              localStorage.setItem("educore_voc_questions", JSON.stringify(mappedVoc));
            }
          } catch (e) {
            console.error("Failed to sync voc_questions from Supabase:", e);
          }

          try {
            // M9: Saude Global - banco de perguntas
            const { data: hqData, error: hqError } = await supabase
              .from("m9_health_questions")
              .select("id, ord, statement, reversed");
            if (!hqError && hqData && hqData.length > 0) {
              const mappedHq: HealthQuestion[] = hqData
                .map((row: { id: string; ord: number | null; statement: string; reversed: boolean | null }) => ({
                  id: row.id,
                  ord: row.ord ?? 0,
                  statement: row.statement,
                  reversed: !!row.reversed,
                }))
                .sort((a, b) => a.ord - b.ord);
              setHealthQuestions(mappedHq);
              localStorage.setItem("educore_m9_health_questions", JSON.stringify(mappedHq));
            }
          } catch (e) {
            console.error("Failed to sync m9_health_questions from Supabase:", e);
          }

          try {
            // M9: Saude Global - pareceres por classificacao
            const { data: mpData, error: mpError } = await supabase
              .from("m9_perfis_pareceres")
              .select("id, classification, basic_data, reflection");
            if (!mpError && mpData && mpData.length > 0) {
              const mappedMp: M9Parecer[] = mpData.map((row: { id: string; classification: string; basic_data: string | null; reflection: string | null }) => ({
                id: row.id,
                classification: row.classification,
                basicData: row.basic_data ?? "",
                reflection: row.reflection ?? "",
              }));
              setM9Pareceres(mappedMp);
              localStorage.setItem("educore_m9_perfis_pareceres", JSON.stringify(mappedMp));
            }
          } catch (e) {
            console.error("Failed to sync m9_perfis_pareceres from Supabase:", e);
          }

          try {
            // M10: Higiene Bucal - banco de perguntas
            const { data: oqData, error: oqError } = await supabase
              .from("m10_oral_questions")
              .select("id, ord, statement, scoring_rule");
            if (!oqError && oqData && oqData.length > 0) {
              const mappedOq: OralQuestion[] = oqData
                .map((row: { id: string; ord: number | null; statement: string; scoring_rule: string | null }) => ({
                  id: row.id,
                  ord: row.ord ?? 0,
                  statement: row.statement,
                  scoringRule: ((row.scoring_rule === 'agree' || row.scoring_rule === 'disagree') ? row.scoring_rule : 'none') as OralScoringRule,
                }))
                .sort((a, b) => a.ord - b.ord);
              setOralQuestions(mappedOq);
              localStorage.setItem("educore_m10_oral_questions", JSON.stringify(mappedOq));
            }
          } catch (e) {
            console.error("Failed to sync m10_oral_questions from Supabase:", e);
          }

          try {
            // M10: Higiene Bucal - pareceres por faixa
            const { data: opData, error: opError } = await supabase
              .from("m10_perfis_pareceres")
              .select("id, classification, basic_data, reflection");
            if (!opError && opData && opData.length > 0) {
              const mappedOp: M10Parecer[] = opData.map((row: { id: string; classification: string; basic_data: string | null; reflection: string | null }) => ({
                id: row.id,
                classification: row.classification,
                basicData: row.basic_data ?? "",
                reflection: row.reflection ?? "",
              }));
              setM10Pareceres(mappedOp);
              localStorage.setItem("educore_m10_perfis_pareceres", JSON.stringify(mappedOp));
            }
          } catch (e) {
            console.error("Failed to sync m10_perfis_pareceres from Supabase:", e);
          }

          try {
            // M11: Autoconceito - banco de afirmacoes
            const { data: aqData, error: aqError } = await supabase
              .from("m11_autoconcept_questions")
              .select("id, ord, statement, item_type");
            if (!aqError && aqData && aqData.length > 0) {
              const mappedAq: AutoconceptQuestion[] = aqData
                .map((row: { id: string; ord: number | null; statement: string; item_type: string | null }) => ({
                  id: row.id,
                  ord: row.ord ?? 0,
                  statement: row.statement,
                  itemType: (row.item_type === 'negative' ? 'negative' : 'positive') as AutoconceptItemType,
                }))
                .sort((a, b) => a.ord - b.ord);
              setAutoQuestions(mappedAq);
              localStorage.setItem("educore_m11_autoconcept_questions", JSON.stringify(mappedAq));
            }
          } catch (e) {
            console.error("Failed to sync m11_autoconcept_questions from Supabase:", e);
          }

          try {
            // M11: Autoconceito - pareceres por faixa
            const { data: apData, error: apError } = await supabase
              .from("m11_perfis_pareceres")
              .select("id, classification, basic_data, reflection");
            if (!apError && apData && apData.length > 0) {
              const mappedAp: M11Parecer[] = apData.map((row: { id: string; classification: string; basic_data: string | null; reflection: string | null }) => ({
                id: row.id,
                classification: row.classification,
                basicData: row.basic_data ?? "",
                reflection: row.reflection ?? "",
              }));
              setM11Pareceres(mappedAp);
              localStorage.setItem("educore_m11_perfis_pareceres", JSON.stringify(mappedAp));
            }
          } catch (e) {
            console.error("Failed to sync m11_perfis_pareceres from Supabase:", e);
          }

          try {
            // M12: Indice Alimentar - banco de perguntas
            const { data: iqData, error: iqError } = await supabase
              .from("ias_questions")
              .select("id, ord, statement, option_1_text, option_1_points, option_2_text, option_2_points, option_3_text, option_3_points");
            if (!iqError && iqData && iqData.length > 0) {
              const mappedIq: IasQuestion[] = iqData
                .map((row: { id: string; ord: number | null; statement: string; option_1_text: string | null; option_1_points: number | null; option_2_text: string | null; option_2_points: number | null; option_3_text: string | null; option_3_points: number | null }) => ({
                  id: row.id,
                  ord: row.ord ?? 0,
                  statement: row.statement,
                  option1Text: row.option_1_text ?? "",
                  option1Points: row.option_1_points ?? 0,
                  option2Text: row.option_2_text ?? "",
                  option2Points: row.option_2_points ?? 0,
                  option3Text: row.option_3_text ?? "",
                  option3Points: row.option_3_points ?? 0,
                }))
                .sort((a, b) => a.ord - b.ord);
              setIasQuestions(mappedIq);
              localStorage.setItem("educore_ias_questions", JSON.stringify(mappedIq));
            }
          } catch (e) {
            console.error("Failed to sync ias_questions from Supabase:", e);
          }

          try {
            // M12: Indice Alimentar - pareceres por faixa
            const { data: ipData, error: ipError } = await supabase
              .from("m12_perfis_pareceres")
              .select("id, classification, basic_data, reflection");
            if (!ipError && ipData && ipData.length > 0) {
              const mappedIp: M12Parecer[] = ipData.map((row: { id: string; classification: string; basic_data: string | null; reflection: string | null }) => ({
                id: row.id,
                classification: row.classification,
                basicData: row.basic_data ?? "",
                reflection: row.reflection ?? "",
              }));
              setM12Pareceres(mappedIp);
              localStorage.setItem("educore_m12_perfis_pareceres", JSON.stringify(mappedIp));
            }
          } catch (e) {
            console.error("Failed to sync m12_perfis_pareceres from Supabase:", e);
          }

          try {
            // M13: Rastreamento do TDAH (SNAP-IV) - banco de itens
            const { data: sqData, error: sqError } = await supabase
              .from("m13_snap_questions")
              .select("id, ord, statement, subscale");
            if (!sqError && sqData && sqData.length > 0) {
              const mappedSq: SnapQuestion[] = sqData
                .map((row: { id: string; ord: number | null; statement: string; subscale: string | null }) => ({
                  id: row.id,
                  ord: row.ord ?? 0,
                  statement: row.statement,
                  subscale: (row.subscale === 'hyperactivity' ? 'hyperactivity' : 'inattention') as SnapSubscale,
                }))
                .sort((a, b) => a.ord - b.ord);
              setSnapQuestions(mappedSq);
              localStorage.setItem("educore_m13_snap_questions", JSON.stringify(mappedSq));
            }
          } catch (e) {
            console.error("Failed to sync m13_snap_questions from Supabase:", e);
          }

          try {
            // M13: Rastreamento do TDAH (SNAP-IV) - pareceres por classificacao
            const { data: spData, error: spError } = await supabase
              .from("m13_perfis_pareceres")
              .select("id, classification, basic_data, reflection");
            if (!spError && spData && spData.length > 0) {
              const mappedSp: M13Parecer[] = spData.map((row: { id: string; classification: string; basic_data: string | null; reflection: string | null }) => ({
                id: row.id,
                classification: row.classification,
                basicData: row.basic_data ?? "",
                reflection: row.reflection ?? "",
              }));
              setM13Pareceres(mappedSp);
              localStorage.setItem("educore_m13_perfis_pareceres", JSON.stringify(mappedSp));
            }
          } catch (e) {
            console.error("Failed to sync m13_perfis_pareceres from Supabase:", e);
          }

          try {
            // M14: Rastreamento Precoce do TEA (AQ-10) - banco de itens
            const { data: aqData, error: aqError } = await supabase
              .from("m14_aq10_questions")
              .select("id, ord, statement, version");
            if (!aqError && aqData && aqData.length > 0) {
              const mappedAq: Aq10Question[] = aqData
                .map((row: { id: string; ord: number | null; statement: string; version: string | null }) => ({
                  id: row.id,
                  ord: row.ord ?? 0,
                  statement: row.statement,
                  version: (row.version === 'adolescente' ? 'adolescente' : 'crianca') as Aq10Version,
                }))
                .sort((a, b) => a.ord - b.ord);
              setAq10Questions(mappedAq);
              localStorage.setItem("educore_m14_aq10_questions", JSON.stringify(mappedAq));
            }
          } catch (e) {
            console.error("Failed to sync m14_aq10_questions from Supabase:", e);
          }

          try {
            // M14: Rastreamento Precoce do TEA (AQ-10) - pareceres por classificacao
            const { data: apData, error: apError } = await supabase
              .from("m14_perfis_pareceres")
              .select("id, classification, basic_data, reflection");
            if (!apError && apData && apData.length > 0) {
              const mappedAp: M14Parecer[] = apData.map((row: { id: string; classification: string; basic_data: string | null; reflection: string | null }) => ({
                id: row.id,
                classification: row.classification,
                basicData: row.basic_data ?? "",
                reflection: row.reflection ?? "",
              }));
              setM14Pareceres(mappedAp);
              localStorage.setItem("educore_m14_perfis_pareceres", JSON.stringify(mappedAp));
            }
          } catch (e) {
            console.error("Failed to sync m14_perfis_pareceres from Supabase:", e);
          }

          try {
            // M15: Qualidade Motora PCD - grupos de triagem
            const { data: g15Data, error: g15Error } = await supabase.from("m15_pcd_grupos").select("id, grupo, nome, descricao, laudo");
            if (!g15Error && g15Data && g15Data.length > 0) {
              const mappedG: PcdGroupConfig[] = g15Data.map((row: { id: string; grupo: number; nome: string; descricao: string | null; laudo: string | null }) => ({
                id: row.id, grupo: row.grupo, nome: row.nome, descricao: row.descricao ?? '', laudo: row.laudo ?? '',
              })).sort((a, b) => a.grupo - b.grupo);
              setM15Grupos(mappedG);
              localStorage.setItem("educore_m15_pcd_grupos", JSON.stringify(mappedG));
            }
          } catch (e) {
            console.error("Failed to sync m15_pcd_grupos from Supabase:", e);
          }

          try {
            // M15: Qualidade Motora PCD - adaptacao por grupo
            const { data: a15Data, error: a15Error } = await supabase.from("m15_pcd_adaptacoes").select("id, grupo, detalhe, teste, status, instrucao");
            if (!a15Error && a15Data && a15Data.length > 0) {
              const mappedA: PcdAdaptacaoConfig[] = a15Data.map((row: { id: string; grupo: number; detalhe: string; teste: string; status: string; instrucao: string | null }) => ({
                id: row.id, grupo: row.grupo, detalhe: row.detalhe ?? '', teste: row.teste, status: row.status, instrucao: row.instrucao ?? '',
              }));
              setM15Adaptacoes(mappedA);
              localStorage.setItem("educore_m15_pcd_adaptacoes", JSON.stringify(mappedA));
            }
          } catch (e) {
            console.error("Failed to sync m15_pcd_adaptacoes from Supabase:", e);
          }

          try {
            // M15: Qualidade Motora PCD - faixas de nota por teste
            const { data: f15Data, error: f15Error } = await supabase.from("m15_pcd_faixas").select("id, grupo, detalhe, teste, nota, min_val, max_val");
            if (!f15Error && f15Data && f15Data.length > 0) {
              const mappedF: PcdFaixaConfig[] = f15Data.map((row: { id: string; grupo: number; detalhe: string; teste: string; nota: number; min_val: number | null; max_val: number | null }) => ({
                id: row.id, grupo: row.grupo, detalhe: row.detalhe ?? '', teste: row.teste, nota: row.nota, minVal: row.min_val, maxVal: row.max_val,
              }));
              setM15Faixas(mappedF);
              localStorage.setItem("educore_m15_pcd_faixas", JSON.stringify(mappedF));
            }
          } catch (e) {
            console.error("Failed to sync m15_pcd_faixas from Supabase:", e);
          }

          try {
            // M15: Qualidade Motora PCD - matriz de pesos por modalidade
            const { data: m15Data, error: m15Error } = await supabase.from("m15_pcd_modalidades").select("id, nome, peso_vel_agil, peso_forca_exp, peso_membros_sup, peso_core, descricao");
            if (!m15Error && m15Data && m15Data.length > 0) {
              const mappedM: PcdModalidadeConfig[] = m15Data.map((row: { id: string; nome: string; peso_vel_agil: number; peso_forca_exp: number; peso_membros_sup: number; peso_core: number; descricao: string | null }) => ({
                id: row.id, nome: row.nome, pesoVelAgil: row.peso_vel_agil, pesoForcaExp: row.peso_forca_exp, pesoMembrosSup: row.peso_membros_sup, pesoCore: row.peso_core, descricao: row.descricao ?? '',
              }));
              setM15Modalidades(mappedM);
              localStorage.setItem("educore_m15_pcd_modalidades", JSON.stringify(mappedM));
            }
          } catch (e) {
            console.error("Failed to sync m15_pcd_modalidades from Supabase:", e);
          }

          try {
            // M15: Qualidade Motora PCD - funil qualitativo de decisao
            const { data: u15Data, error: u15Error } = await supabase.from("m15_pcd_funil").select("id, grupo, momento, titulo, regra");
            if (!u15Error && u15Data && u15Data.length > 0) {
              const mappedU: PcdFunilConfig[] = u15Data.map((row: { id: string; grupo: number; momento: number; titulo: string; regra: string | null }) => ({
                id: row.id, grupo: row.grupo, momento: row.momento, titulo: row.titulo, regra: row.regra ?? '',
              }));
              setM15Funil(mappedU);
              localStorage.setItem("educore_m15_pcd_funil", JSON.stringify(mappedU));
            }
          } catch (e) {
            console.error("Failed to sync m15_pcd_funil from Supabase:", e);
          }
        }
      }
    };
    syncDbData();
  }, []);

  // Módulo 3 - Análise de Frequência Handlers
  const handleSaveM3 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!m3FormStudentId) {
      alert("Favor selecionar o estudante.");
      return;
    }
    const selectedStudent = students.find((s) => s.id === m3FormStudentId);
    if (!selectedStudent) return;

    const record = {
      id: m3EditingItem ? m3EditingItem.id : generateUniqueId("m3"),
      studentId: m3FormStudentId,
      studentName: selectedStudent.name,
      periodo: m3FormPeriodo,
      cenario: m3FormCenario,
      parecerFrequencia: m3FormParecerFrequencia,
      impactosVantagens: m3FormVantagens,
      impactosDesvantagens: m3FormDesvantagens,
      parecerPais: m3FormParecerPais,
      updatedAt: new Date().toISOString(),
    };

    let updatedList;
    if (m3EditingItem) {
      updatedList = m3Analises.map((item) =>
        item.id === m3EditingItem.id ? record : item,
      );
      setSuccessMessage("Análise de frequência atualizada com sucesso!");
    } else {
      updatedList = [record, ...m3Analises];
      setSuccessMessage("Análise de frequência adicionada com sucesso!");
    }

    setM3Analises(updatedList);
    setM3SelectedId(record.id);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "educore_analise_frequencia",
        JSON.stringify(updatedList),
      );
    }

    setM3ShowModal(false);
    setM3EditingItem(null);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleM3ScenarioChange = (cen: "A" | "B" | "C") => {
    setM3FormCenario(cen);
    // Auto populate default texts
    setM3FormParecerFrequencia(M3_SCENARIOS[cen].parecerFrequencia);
    setM3FormParecerPais(M3_SCENARIOS[cen].parecerPais);

    // Auto check/uncheck advantages & disadvantages based on scenario
    if (cen === "A") {
      setM3FormVantagens(M3_ADVANTAGES);
      setM3FormDesvantagens([]);
    } else if (cen === "B") {
      setM3FormVantagens([]);
      setM3FormDesvantagens(M3_DISADVANTAGES);
    } else {
      setM3FormVantagens([]);
      setM3FormDesvantagens([]);
    }
  };

  const _handleOpenM3Add = () => {
    setM3EditingItem(null);
    setM3FormStudentId(students[0]?.id || "");
    setM3FormPeriodo("Junho/2026");
    setM3FormCenario("A");
    setM3FormParecerFrequencia(M3_SCENARIOS.A.parecerFrequencia);
    setM3FormVantagens(M3_ADVANTAGES);
    setM3FormDesvantagens([]);
    setM3FormParecerPais(M3_SCENARIOS.A.parecerPais);
    setM3ShowModal(true);
  };

  const handleOpenM3Edit = (item: M3Analise) => {
    setM3EditingItem(item);
    setM3FormStudentId(item.studentId);
    setM3FormPeriodo(item.periodo);
    setM3FormCenario(item.cenario);
    setM3FormParecerFrequencia(item.parecerFrequencia);
    setM3FormVantagens(item.impactosVantagens || []);
    setM3FormDesvantagens(item.impactosDesvantagens || []);
    setM3FormParecerPais(item.parecerPais);
    setM3ShowModal(true);
  };

  const handleDeleteM3 = (id: string) => {
    setM3DeleteConfirmType("analise");
    setM3DeleteConfirmId(id);
    setShowM3DeleteModal(true);
  };

  const handleSaveRef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formIdade.trim() ||
      !formSexo.trim() ||
      !formRegular.trim() ||
      !formExcelente.trim()
    ) {
      return;
    }

    let nextRefs: AptidaoRef[];
    let upsertRow: AptidaoRef;
    if (editingRefItem) {
      // Edit
      nextRefs = aptidaoRefs.map((item) =>
        item.id === editingRefItem.id
          ? {
              ...item,
              idade: formIdade.trim(),
              sexo: formSexo,
              insuficiente: formInsuficiente.trim() || "Não se aplica",
              regular: formRegular.trim(),
              bom: formBom.trim() || "Não se aplica",
              excelente: formExcelente.trim(),
            }
          : item,
      );
      upsertRow = nextRefs.find((i) => i.id === editingRefItem.id) as AptidaoRef;
    } else {
      // Create
      const newRef: AptidaoRef = {
        id: (await nextAptidaoRefId(activeTableTab)) || ((APTIDAO_PREFIX[activeTableTab] || "ref") + "-" + uuid().slice(0, 8)),
        category: activeTableTab,
        idade: formIdade.trim(),
        sexo: formSexo,
        insuficiente: formInsuficiente.trim() || "Não se aplica",
        regular: formRegular.trim(),
        bom: formBom.trim() || "Não se aplica",
        excelente: formExcelente.trim(),
      };
      nextRefs = [...aptidaoRefs, newRef];
      upsertRow = newRef;
    }

    setAptidaoRefs(nextRefs);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "educore_aptidao_referenciais",
        JSON.stringify(nextRefs),
      );
    }

    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        supabase.from("aptidao_referenciais").upsert({
          id: upsertRow.id,
          category: upsertRow.category,
          idade: upsertRow.idade,
          sexo: upsertRow.sexo,
          insuficiente: upsertRow.insuficiente,
          regular: upsertRow.regular,
          bom: upsertRow.bom,
          excelente: upsertRow.excelente,
        }).then(({ error }) => {
          if (error) console.error("Error saving aptidao_referenciais to Supabase:", error?.message ?? error);
        });
      }
    }

    // Reset form states
    setIsEditingRef(false);
    setEditingRefItem(null);
    setFormIdade("");
    setFormSexo("");
    setFormInsuficiente("");
    setFormRegular("");
    setFormBom("");
    setFormExcelente("");

    setSuccessMessage(
      editingRefItem
        ? "Referencial atualizado com sucesso!"
        : "Novo referencial cadastrado com sucesso!",
    );
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDeleteRef = (item: AptidaoRef) => {
    setRefToDelete(item);
  };

  const handleConfirmDeleteRef = () => {
    if (!refToDelete) return;
    const deletedId = refToDelete.id;
    const nextRefs = aptidaoRefs.filter((i) => i.id !== deletedId);
    setAptidaoRefs(nextRefs);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "educore_aptidao_referenciais",
        JSON.stringify(nextRefs),
      );
    }
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        supabase.from("aptidao_referenciais").delete().eq("id", deletedId).then(({ error }) => {
          if (error) console.error("Error deleting aptidao_referenciais from Supabase:", error);
        });
      }
    }
    setRefToDelete(null);
    setSuccessMessage("Referencial removido com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleStartEditRef = (item: AptidaoRef) => {
    setEditingRefItem(item);
    setFormIdade(item.idade);
    setFormSexo(item.sexo);
    setFormInsuficiente(
      item.insuficiente === "Não se aplica" ? "" : item.insuficiente,
    );
    setFormRegular(item.regular);
    setFormBom(item.bom === "Não se aplica" ? "" : item.bom);
    setFormExcelente(item.excelente);
    setIsEditingRef(true);
  };

  const currentFilteredRefs = useMemo(() => {
    return aptidaoRefs.filter((item) => item.category === activeTableTab);
  }, [aptidaoRefs, activeTableTab]);

  // Sync current logged in student object

  if (activeTab === "questionario-m4") {
    const alertColors = {
      emerald: { bg: "bg-emerald-500", label: "Verde" },
      yellow: { bg: "bg-yellow-500", label: "Amarelo" },
      orange: { bg: "bg-orange-500", label: "Laranja" },
      rose: { bg: "bg-rose-500", label: "Vermelho" }
    };

    return (
      <div className="p-6 bg-white rounded-xl shadow-md border border-slate-300">
        <h1 className="text-2xl font-black mb-6 text-black tracking-tight border-b pb-3">Tabela de Classificação e Parecer do IMC</h1>
        
        {/* Simple Add Form */}
        <div className="mb-8 p-6 bg-white border-4 border-black rounded-xl space-y-5 shadow-md">
          <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2">Adicionar nova classificação</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-black uppercase tracking-wider">Classificação (IMC)</label>
              <input 
                type="text" 
                placeholder="Ex: Peso normal, Sobrepeso..." 
                className="p-3 border-2 border-black bg-white text-black placeholder:text-slate-700 rounded-lg text-sm w-full font-black focus:ring-2 focus:ring-black outline-none shadow-sm" 
                value={newRow.classification} 
                onChange={e => setNewRow({...newRow, classification: e.target.value})} 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-black uppercase tracking-wider">Status</label>
              <input 
                type="text" 
                placeholder="Ex: IMC Ideal, Excesso Leve..." 
                className="p-3 border-2 border-black bg-white text-black placeholder:text-slate-700 rounded-lg text-sm w-full font-black focus:ring-2 focus:ring-black outline-none shadow-sm" 
                value={newRow.status} 
                onChange={e => setNewRow({...newRow, status: e.target.value})} 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-black uppercase tracking-wider">Alerta visual</label>
              <select 
                className="p-3 border-2 border-black bg-white text-black rounded-lg text-sm font-black focus:ring-2 focus:ring-black outline-none shadow-sm" 
                value={newRow.alertColor} 
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'emerald' || v === 'yellow' || v === 'orange' || v === 'rose') {
                    setNewRow({ ...newRow, alertColor: v });
                  }
                }} 
              >
                <option value="emerald">Verde</option>
                <option value="yellow">Amarelo</option>
                <option value="orange">Laranja</option>
                <option value="rose">Vermelho</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-black uppercase tracking-wider">IMC mínimo</label>
              <input
                type="number"
                step="0.1"
                placeholder="Ex: 18.5"
                className="p-3 border-2 border-black bg-white text-black placeholder:text-slate-700 rounded-lg text-sm w-full font-black focus:ring-2 focus:ring-black outline-none shadow-sm"
                value={newRow.imcMin ?? ''}
                onChange={e => setNewRow({ ...newRow, imcMin: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-black uppercase tracking-wider">IMC máximo</label>
              <input
                type="number"
                step="0.1"
                placeholder="Ex: 24.9 (vazio = sem limite)"
                className="p-3 border-2 border-black bg-white text-black placeholder:text-slate-700 rounded-lg text-sm w-full font-black focus:ring-2 focus:ring-black outline-none shadow-sm"
                value={newRow.imcMax ?? ''}
                onChange={e => setNewRow({ ...newRow, imcMax: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-black uppercase tracking-wider">Parecer Técnico / Recomendação Pedagógica</label>
            <textarea 
              placeholder="Digite a recomendação detalhada do IMC..." 
              className="p-3 border-2 border-black bg-white text-black placeholder:text-slate-700 rounded-lg text-sm w-full min-h-[120px] font-black focus:ring-2 focus:ring-black outline-none shadow-sm" 
              value={newRow.description} 
              onChange={e => setNewRow({...newRow, description: e.target.value})} 
            />
          </div>
          <div className="flex justify-end pt-2">
            <button 
              onClick={addRow} 
              className="bg-black hover:bg-slate-900 text-white px-8 py-3.5 rounded-lg text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer border border-black uppercase tracking-wide"
            >
              Adicionar Classificação
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-300 min-w-[820px]">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-400 text-sm font-black text-black">
                <th className="py-3 px-3 w-[10%] border-r border-slate-300">Classificação (IMC)</th>
                <th className="py-3 px-3 w-[12%] border-r border-slate-300">Status</th>
                <th className="py-3 px-3 w-[12%] border-r border-slate-300">Alerta visual</th>
                <th className="py-3 px-3 w-[15%] border-r border-slate-300">Faixa (IMC)</th>
                <th className="py-3 px-3 w-[43%] border-r border-slate-300">Parecer Técnico / Recomendação Pedagógica</th>
                <th className="py-3 px-3 w-[8%] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-sm text-black">
              {imcRows.map(row => {
                const colorInfo = alertColors[row.alertColor as keyof typeof alertColors] || alertColors.emerald;
                const isEditing = editingRowId === row.id;

                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    {isEditing && editingRowData ? (
                      <>
                        <td className="py-4 px-3 align-top border-r border-slate-300">
                          <input 
                            type="text" 
                            className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" 
                            value={editingRowData.classification} 
                            onChange={e => setEditingRowData({...editingRowData, classification: e.target.value})} 
                          />
                        </td>
                        <td className="py-4 px-3 align-top border-r border-slate-300">
                          <input 
                            type="text" 
                            className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" 
                            value={editingRowData.status} 
                            onChange={e => setEditingRowData({...editingRowData, status: e.target.value})} 
                          />
                        </td>
                        <td className="py-4 px-3 align-top border-r border-slate-300">
                          <select 
                            className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" 
                            value={editingRowData.alertColor} 
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === 'emerald' || v === 'yellow' || v === 'orange' || v === 'rose') {
                                setEditingRowData({ ...editingRowData, alertColor: v });
                              }
                            }} 
                          >
                            <option value="emerald">Verde</option>
                            <option value="yellow">Amarelo</option>
                            <option value="orange">Laranja</option>
                            <option value="rose">Vermelho</option>
                          </select>
                        </td>
                        <td className="py-4 px-3 align-top border-r border-slate-300">
                          <div className="flex flex-col gap-2">
                            <input type="number" step="0.1" placeholder="Mínimo" className="p-2 border-2 border-slate-500 bg-white text-black rounded text-base w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" value={editingRowData.imcMin ?? ''} onChange={e => setEditingRowData({ ...editingRowData, imcMin: e.target.value === '' ? null : Number(e.target.value) })} />
                            <input type="number" step="0.1" placeholder="Máximo" className="p-2 border-2 border-slate-500 bg-white text-black rounded text-base w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" value={editingRowData.imcMax ?? ''} onChange={e => setEditingRowData({ ...editingRowData, imcMax: e.target.value === '' ? null : Number(e.target.value) })} />
                          </div>
                        </td>
                        <td className="py-4 px-3 align-top border-r border-slate-300">
                          <textarea 
                            className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold min-h-[80px] focus:ring-2 focus:ring-blue-600 outline-none" 
                            value={editingRowData.description} 
                            onChange={e => setEditingRowData({...editingRowData, description: e.target.value})} 
                          />
                        </td>
                        <td className="py-4 px-3 align-top text-right">
                          <div className="flex flex-col sm:flex-row gap-2 justify-end">
                            <button 
                              onClick={saveEditing} 
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold transition-all shadow-md active:scale-95 border border-green-700"
                            >
                              Salvar
                            </button>
                            <button 
                              onClick={cancelEditing} 
                              className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold transition-all shadow-md active:scale-95 border border-slate-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-3 font-bold text-black align-top border-r border-slate-300">{row.classification}</td>
                        <td className="py-4 px-3 font-bold text-slate-900 align-top border-r border-slate-300">{row.status}</td>
                        <td className="py-4 px-3 align-top border-r border-slate-300">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${colorInfo.bg} shadow-md border border-black/20`}></div> 
                            <span className="font-bold text-black">{colorInfo.label}</span>
                          </div>
                        </td>
                        <td className="py-4 px-3 font-bold text-black align-top border-r border-slate-300 whitespace-nowrap">
                          {row.imcMin == null && row.imcMax == null ? '—' : `${row.imcMin ?? '…'} a ${row.imcMax ?? '…'}`}
                        </td>
                        <td className="py-4 px-3 text-slate-900 font-medium leading-relaxed text-justify align-top border-r border-slate-300">{row.description}</td>
                        <td className="py-4 px-3 align-top text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => startEditing(row)} 
                              className="text-blue-700 hover:text-white flex items-center gap-1 font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md transition-all cursor-pointer border border-blue-400"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Editar</span>
                            </button>
                            <button 
                              onClick={() => deleteRow(row.id)} 
                              className="text-red-700 hover:text-white flex items-center gap-1 font-bold text-xs bg-red-100 hover:bg-red-700 px-3 py-2 rounded-md transition-all cursor-pointer border border-red-400"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal de Confirmação de Exclusão de Classificação IMC (Módulo 4) */}
        {m4RowToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-300 w-full max-w-md rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150">
              <h4 className="text-lg font-black text-black uppercase tracking-tight mb-2 flex items-center gap-2 border-b pb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Confirmar Exclusão
              </h4>
              <p className="text-sm text-slate-700 mb-6 leading-relaxed">
                Tem certeza de que deseja excluir permanentemente a classificação{" "}
                <span className="text-black font-extrabold font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {m4RowToDelete.classification}
                </span>{" "}
                ({m4RowToDelete.status})? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setM4RowToDelete(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-black text-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteM4}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg text-xs shadow-md transition-colors cursor-pointer border border-red-700"
                >
                  Confirmar Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "questionario-m5") {
    const alertColors = {
      emerald: { bg: "bg-emerald-500", label: "Verde" },
      yellow: { bg: "bg-yellow-500", label: "Amarelo" },
      orange: { bg: "bg-orange-500", label: "Laranja" },
      rose: { bg: "bg-rose-500", label: "Vermelho" },
      blue: { bg: "bg-blue-500", label: "Azul" }
    };

    const m5Tabs = [
      { id: "velocidade", label: "Velocidade", icon: Zap },
      { id: "forca_muscular", label: "Força Muscular", icon: Dumbbell },
      { id: "agilidade", label: "Agilidade", icon: Activity },
      { id: "abdomen", label: "Abdômen", icon: Heart },
      { id: "impulsao", label: "Impulsão", icon: Award }
    ] as const;

    const currentRows = m5Data[activeM5Tab] || [];

    return (
      <div className="p-6 bg-white rounded-xl shadow-md border border-slate-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black text-black tracking-tight">Tabelas de Diagnóstico e Recomendações (Capacidades Físicas)</h1>
            <p className="text-sm text-slate-600 font-bold mt-1">Configure o Parecer de Saúde e as Diretrizes Pedagógicas para as Capacidades Físicas</p>
          </div>
        </div>

        {/* M5 Capability Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-slate-100 p-2 rounded-xl border border-slate-300">
          {m5Tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeM5Tab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveM5Tab(tab.id);
                  setM5EditingRowId(null);
                  setM5EditingRowData(null);
                }}
                className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-black transition-all cursor-pointer ${
                  isActive
                    ? "bg-black text-white shadow-md border border-black"
                    : "bg-white text-slate-800 hover:bg-slate-200 border border-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Add Row Form */}
        <div className="mb-8 p-6 bg-slate-100 border-2 border-slate-400 rounded-xl space-y-4 shadow-sm">
          <h3 className="font-extrabold text-lg text-black uppercase tracking-wide flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-black" />
            Adicionar nova classificação — {m5Tabs.find(t => t.id === activeM5Tab)?.label}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-black uppercase tracking-wider">Status / Nível</label>
              <input 
                type="text" 
                placeholder="Ex: INSUFICIENTE, REGULAR, BOM, EXCELENTE..." 
                className="p-3 border-2 border-slate-500 bg-white text-black placeholder:text-slate-600 rounded-lg text-sm w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" 
                value={m5NewRow.level} 
                onChange={e => setM5NewRow({...m5NewRow, level: e.target.value})} 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-black uppercase tracking-wider">Alerta visual</label>
              <select 
                className="p-3 border-2 border-slate-500 bg-white text-black rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-600 outline-none" 
                value={m5NewRow.alertColor} 
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'rose' || v === 'yellow' || v === 'emerald' || v === 'blue') {
                    setM5NewRow({ ...m5NewRow, alertColor: v });
                  }
                }} 
              >
                <option value="rose">Vermelho (Crítico)</option>
                <option value="yellow">Amarelo (Atenção)</option>
                <option value="emerald">Verde (Bom)</option>
                <option value="blue">Azul (Excelente)</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-black uppercase tracking-wider">Parecer de Saúde</label>
              <textarea 
                placeholder="Ex: A capacidade de deslocamento rápido e o tempo de reação estão..." 
                className="p-3 border-2 border-slate-500 bg-white text-black placeholder:text-slate-600 rounded-lg text-sm w-full min-h-[80px] font-bold focus:ring-2 focus:ring-blue-600 outline-none" 
                value={m5NewRow.healthStatus} 
                onChange={e => setM5NewRow({...m5NewRow, healthStatus: e.target.value})} 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-black uppercase tracking-wider">O que deve melhorar</label>
              <textarea 
                placeholder="Ex: O aluno precisa desenvolver a eficiência da passada..." 
                className="p-3 border-2 border-slate-500 bg-white text-black placeholder:text-slate-600 rounded-lg text-sm w-full min-h-[80px] font-bold focus:ring-2 focus:ring-blue-600 outline-none" 
                value={m5NewRow.toImprove} 
                onChange={e => setM5NewRow({...m5NewRow, toImprove: e.target.value})} 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-black uppercase tracking-wider">Recomendação Pedagógica</label>
              <textarea 
                placeholder="Ex: Incentivamos o estímulo em casa através de..." 
                className="p-3 border-2 border-slate-500 bg-white text-black placeholder:text-slate-600 rounded-lg text-sm w-full min-h-[80px] font-bold focus:ring-2 focus:ring-blue-600 outline-none" 
                value={m5NewRow.recommendation} 
                onChange={e => setM5NewRow({...m5NewRow, recommendation: e.target.value})} 
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              onClick={m5AddRow} 
              className="bg-black hover:bg-slate-800 text-white px-8 py-3 rounded-lg text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer border border-slate-700"
            >
              Adicionar Classificação
            </button>
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-300 min-w-[640px]">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-400 text-sm font-black text-black">
                <th className="py-3 px-3 w-[15%] border-r border-slate-300">Nível / Status Atual</th>
                <th className="py-3 px-3 w-[27%] border-r border-slate-300">Parecer de Saúde</th>
                <th className="py-3 px-3 w-[24%] border-r border-slate-300">O que deve melhorar</th>
                <th className="py-3 px-3 w-[24%] border-r border-slate-300">Recomendação Pedagógica</th>
                <th className="py-3 px-3 w-[10%] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-sm text-black">
              {currentRows.map((row) => {
                const colorInfo = alertColors[row.alertColor as keyof typeof alertColors] || alertColors.emerald;
                const isEditing = m5EditingRowId === row.id;

                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    {isEditing && m5EditingRowData ? (
                      <>
                        <td className="py-4 px-3 align-top border-r border-slate-300">
                          <input 
                            type="text" 
                            className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none mb-2" 
                            value={m5EditingRowData.level} 
                            onChange={e => setM5EditingRowData({...m5EditingRowData, level: e.target.value})} 
                          />
                          <select 
                            className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" 
                            value={m5EditingRowData.alertColor} 
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === 'rose' || v === 'yellow' || v === 'emerald' || v === 'blue') {
                                setM5EditingRowData({ ...m5EditingRowData, alertColor: v });
                              }
                            }} 
                          >
                            <option value="rose">Vermelho</option>
                            <option value="yellow">Amarelo</option>
                            <option value="emerald">Verde</option>
                            <option value="blue">Azul</option>
                          </select>
                        </td>
                        <td className="py-4 px-3 align-top border-r border-slate-300">
                          <textarea 
                            className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold min-h-[100px] focus:ring-2 focus:ring-blue-600 outline-none" 
                            value={m5EditingRowData.healthStatus} 
                            onChange={e => setM5EditingRowData({...m5EditingRowData, healthStatus: e.target.value})} 
                          />
                        </td>
                        <td className="py-4 px-3 align-top border-r border-slate-300">
                          <textarea 
                            className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold min-h-[100px] focus:ring-2 focus:ring-blue-600 outline-none" 
                            value={m5EditingRowData.toImprove} 
                            onChange={e => setM5EditingRowData({...m5EditingRowData, toImprove: e.target.value})} 
                          />
                        </td>
                        <td className="py-4 px-3 align-top border-r border-slate-300">
                          <textarea 
                            className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold min-h-[100px] focus:ring-2 focus:ring-blue-600 outline-none" 
                            value={m5EditingRowData.recommendation} 
                            onChange={e => setM5EditingRowData({...m5EditingRowData, recommendation: e.target.value})} 
                          />
                        </td>
                        <td className="py-4 px-3 align-top text-right">
                          <div className="flex flex-col gap-2 justify-end">
                            <button 
                              onClick={m5SaveEditing} 
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold transition-all shadow-md active:scale-95 border border-green-700"
                            >
                              Salvar
                            </button>
                            <button 
                              onClick={m5CancelEditing} 
                              className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold transition-all shadow-md active:scale-95 border border-slate-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-3 font-bold text-black align-top border-r border-slate-300">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-4 h-4 rounded-full ${colorInfo.bg} shadow-md border border-black/20`}></div> 
                            <span className="font-extrabold text-black tracking-tight">{row.level}</span>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-slate-900 font-medium leading-relaxed text-justify align-top border-r border-slate-300">{row.healthStatus}</td>
                        <td className="py-4 px-3 text-slate-900 font-medium leading-relaxed text-justify align-top border-r border-slate-300">{row.toImprove}</td>
                        <td className="py-4 px-3 text-slate-900 font-medium leading-relaxed text-justify align-top border-r border-slate-300">{row.recommendation}</td>
                        <td className="py-4 px-3 align-top text-right">
                          <div className="flex flex-col gap-2 justify-end">
                            <button 
                              onClick={() => m5StartEditing(row)} 
                              className="text-blue-700 hover:text-white flex items-center justify-center gap-1 font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md transition-all cursor-pointer border border-blue-400 w-full"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Editar</span>
                            </button>
                            <button 
                              onClick={() => m5DeleteRow(row.id)} 
                              className="text-red-700 hover:text-white flex items-center justify-center gap-1 font-bold text-xs bg-red-100 hover:bg-red-700 px-3 py-2 rounded-md transition-all cursor-pointer border border-red-400 w-full"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal de Confirmação de Exclusão de Classificação das Capacidades Físicas (Módulo 5) */}
        {m5RowToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-300 w-full max-w-md rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150">
              <h4 className="text-lg font-black text-black uppercase tracking-tight mb-2 flex items-center gap-2 border-b pb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Confirmar Exclusão
              </h4>
              <p className="text-sm text-slate-700 mb-6 leading-relaxed">
                Tem certeza de que deseja excluir permanentemente a classificação{" "}
                <span className="text-black font-extrabold font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {m5RowToDelete.level}
                </span>{" "}
                desta capacidade física? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setM5RowToDelete(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-black text-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteM5}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg text-xs shadow-md transition-colors cursor-pointer border border-red-700"
                >
                  Confirmar Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Filter history based on search query
  if (activeTab === "questionario-m3") {
    return (
      <div
        className="flex-1 min-h-screen bg-[#0b1326] p-4 sm:p-6 lg:p-8 text-[#dae2fd] overflow-y-auto"
        id="modulo3-frequencia-container"
      >
        {/* Dynamic Stylesheet injection for clean print flow */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
           @media print {
             body {
               background: white !important;
               color: black !important;
             }
             #printable-m3-sheet {
               position: static;
               width: 100%;
               max-width: 100% !important;
               background: white !important;
               color: black !important;
               padding: 0 !important;
               box-shadow: none !important;
               border: none !important;
             }
             /* Hide dashboard elements during printing */
             header, nav, aside, button, .no-print, #view-header-div {
               display: none !important;
             }
           }
         `,
          }}
        />

        {/* View Header */}
        <div
          className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print"
          id="view-header-div"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="w-5 h-5 text-[#8ed5ff]" />
              <span className="text-xs font-mono text-[#8ed5ff] uppercase tracking-wider">
                Acompanhamento e Parâmetros
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#dae2fd]">
              Módulo 3: Análise de Frequência Escolar
            </h2>
            <p className="text-sm text-[#bdc8d1]/80 mt-1 max-w-3xl">
              Consulte e imprima a matriz de parâmetros de frequência pedagógica
              e impactos no aprendizado.
            </p>
          </div>


        </div>

        {/* Printable high-fidelity Sheet */}
        <div
          id="printable-m3-sheet"
          className="bg-white text-[#111111] p-4 sm:p-8 lg:p-10 rounded-2xl shadow-2xl border border-slate-200 max-w-5xl mx-auto space-y-8 font-sans"
        >
          {/* Main Title Header mimicking the image layout */}
          <div className="text-center border-b-2 border-slate-900 pb-5">
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Análise de Frequência Escolar
            </h1>
          </div>

          {/* TABLE 1: ANÁLISE DE FREQUÊNCIA ESCOLAR */}
          <div className="space-y-4">
            <div className="flex items-center justify-between no-print">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Tabela de Referência de Cenários</h3>
              <button
                onClick={handleOpenAddCenario}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Cenário</span>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 text-[11.5px] font-bold text-slate-900 border-b border-slate-300">
                    <th className="py-3 px-4 border border-slate-300 w-[12%] text-center">Cenário</th>
                    <th className="py-3 px-4 border border-slate-300 w-[18%]">Condição</th>
                    <th className="py-3 px-4 border border-slate-300 w-[35%]">Frequência</th>
                    <th className="py-3 px-4 border border-slate-300 w-[25%]">Mensagem Direcionada aos Pais e Responsáveis</th>
                    <th className="py-3 px-4 border border-slate-300 w-[10%] text-center no-print border-l">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-[11.5px] leading-relaxed text-[#111111]">
                  {m3Cenarios.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 font-medium">
                        Nenhum cenário cadastrado. Clique em &quot;Novo Cenário&quot; para começar.
                      </td>
                    </tr>
                  ) : (
                    m3Cenarios.map((item) => (
                      <tr key={item.id} className="border-b border-slate-300 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 border border-slate-300 font-bold text-[#111111] text-center align-middle">
                          {item.cenario}
                        </td>
                        <td className="py-4 px-4 border border-slate-300 font-bold text-[#111111] align-middle">
                          {item.condicao}
                        </td>
                        <td className="py-4 px-4 border border-slate-300 align-top text-slate-700 text-justify">
                          {item.frequencia}
                        </td>
                        <td className="py-4 px-4 border border-slate-300 align-top text-[#1e293b] font-medium text-justify">
                          {item.mensagem}
                        </td>
                        <td className="py-4 px-4 border border-slate-300 align-middle text-center no-print whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditCenario(item)}
                              className="p-2 px-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Editar Cenário"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => handleDeleteCenario(item.id)}
                              className="p-2 px-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-md transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Excluir Cenário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Deletar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLE 2: MATRIZ DE IMPACTOS */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between no-print">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Matriz de Impactos Pedagógicos</h3>
              <button
                onClick={handleOpenAddImpacto}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Impacto</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 text-[11.5px] font-bold text-slate-900 border-b border-slate-300">
                    <th className="py-3 px-4 border border-slate-300 w-[22%]">Tipo de Impacto</th>
                    <th className="py-3 px-4 border border-slate-300 w-[25%]">Indicador</th>
                    <th className="py-3 px-4 border border-slate-300 w-[43%]">Descrição Detalhada</th>
                    <th className="py-3 px-4 border border-slate-300 w-[10%] text-center no-print border-l">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-[11.5px] leading-relaxed text-[#111111]">
                  {m3Impactos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 font-medium">
                        Nenhum impacto cadastrado. Clique em &quot;Novo Impacto&quot; para começar.
                      </td>
                    </tr>
                  ) : (
                    m3Impactos.map((item) => (
                      <tr key={item.id} className="border-b border-slate-300 hover:bg-slate-50/50 transition-colors last:border-0 font-sans">
                        <td className="py-4 px-4 border border-slate-300 font-bold text-[#111111] align-middle">
                          {item.tipo}
                        </td>
                        <td className="py-4 px-4 border border-slate-300 font-bold text-[#111111] align-middle">
                          {item.indicador}
                        </td>
                        <td className="py-4 px-4 border border-slate-300 align-top text-slate-700 text-justify">
                          {item.descricao}
                        </td>
                        <td className="py-4 px-4 border border-slate-300 align-middle text-center no-print whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditImpacto(item)}
                              className="p-2 px-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Editar Impacto"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => handleDeleteImpacto(item.id)}
                              className="p-2 px-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-md transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Excluir Impacto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Deletar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Document Footer */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 font-mono gap-2 no-print">
            <span>
              &copy; {new Date().getFullYear()} - Diretrizes de Atendimento
              Escolar
            </span>
            <span>Matriz Curricular de Referência</span>
          </div>
        </div>

        {/* Modal for Scenario Add/Edit */}
        {m3EditCenarioModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in no-print bg-opacity-80">
            <div className="bg-[#121c33] border border-[#232e48] rounded-2xl w-full max-w-lg shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] overflow-y-auto flex flex-col space-y-4 text-left font-sans">
              <div className="flex items-center justify-between border-b border-[#232e48] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#8ed5ff]" />
                  <span>{m3CenarioEditingItem ? "Editar Cenário de Frequência" : "Adicionar Novo Cenário"}</span>
                </h3>
                <button
                  onClick={() => setM3EditCenarioModal(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCenario} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">Identificador do Cenário *</label>
                  <input
                    type="text"
                    required
                    value={m3CenarioFormCenario}
                    onChange={(e) => setM3CenarioFormCenario(e.target.value)}
                    className="w-full bg-[#16223d] border border-[#232e48] rounded-xl p-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-blue-500 font-sans"
                    placeholder="Ex: CENÁRIO A, CENÁRIO D..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">Condição *</label>
                  <input
                    type="text"
                    required
                    value={m3CenarioFormCondicao}
                    onChange={(e) => setM3CenarioFormCondicao(e.target.value)}
                    className="w-full bg-[#16223d] border border-[#232e48] rounded-xl p-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-blue-500 font-sans"
                    placeholder="Ex: Mais presenças do que faltas..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">Frequência Pedagógica / Parecer *</label>
                  <textarea
                    required
                    rows={4}
                    value={m3CenarioFormFrequencia}
                    onChange={(e) => setM3CenarioFormFrequencia(e.target.value)}
                    className="w-full bg-[#16223d] border border-[#232e48] rounded-xl p-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-blue-500 font-sans"
                    placeholder="Descrição detalhada do comportamento e ritmo esperado..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">Mensagem para Pais / Responsáveis *</label>
                  <textarea
                    required
                    rows={3}
                    value={m3CenarioFormMensagem}
                    onChange={(e) => setM3CenarioFormMensagem(e.target.value)}
                    className="w-full bg-[#16223d] border border-[#232e48] rounded-xl p-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-blue-500 font-sans"
                    placeholder="Mensagem recomendada direcionada aos pais..."
                  />
                </div>

                <div className="pt-3 border-t border-[#232e48] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setM3EditCenarioModal(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
                  >
                    {m3CenarioEditingItem ? "Salvar Alterações" : "Criar Cenário"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal for Impact Add/Edit */}
        {m3EditImpactoModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in no-print bg-opacity-80">
            <div className="bg-[#121c33] border border-[#232e48] rounded-2xl w-full max-w-lg shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] overflow-y-auto flex flex-col space-y-4 text-left font-sans">
              <div className="flex items-center justify-between border-b border-[#232e48] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#8ed5ff]" />
                  <span>{m3ImpactoEditingItem ? "Editar Ponto de Impacto" : "Adicionar Novo Ponto de Impacto"}</span>
                </h3>
                <button
                  onClick={() => setM3EditImpactoModal(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveImpacto} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">Tipo de Impacto *</label>
                  <select
                    required
                    value={m3ImpactoFormTipo}
                    onChange={(e) => setM3ImpactoFormTipo(e.target.value)}
                    className="w-full bg-[#16223d] border border-[#232e48] rounded-xl p-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-blue-500 font-sans"
                  >
                    <option value="Vantagem (Ponto Forte)">Vantagem (Ponto Forte)</option>
                    <option value="Desvantagem (Ponto de Atenção)">Desvantagem (Ponto de Atenção)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">Indicador *</label>
                  <input
                    type="text"
                    required
                    value={m3ImpactoFormIndicador}
                    onChange={(e) => setM3ImpactoFormIndicador(e.target.value)}
                    className="w-full bg-[#16223d] border border-[#232e48] rounded-xl p-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-blue-500 font-sans"
                    placeholder="Ex: Continuidade Pedagógica..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">Descrição Detalhada *</label>
                  <textarea
                    required
                    rows={4}
                    value={m3ImpactoFormDescricao}
                    onChange={(e) => setM3ImpactoFormDescricao(e.target.value)}
                    className="w-full bg-[#16223d] border border-[#232e48] rounded-xl p-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-blue-500 font-sans"
                    placeholder="Digite a descrição dos impactos..."
                  />
                </div>

                <div className="pt-3 border-t border-[#232e48] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setM3EditImpactoModal(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
                  >
                    {m3ImpactoEditingItem ? "Salvar Alterações" : "Criar Impacto"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal for M3 Delete Confirmation */}
        {showM3DeleteModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in no-print bg-opacity-80">
            <div className="bg-[#121c33] border border-[#232e48] rounded-2xl w-full max-w-sm shadow-2xl p-4 sm:p-6 relative flex flex-col space-y-4 text-left font-sans">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-red-500/10 rounded-xl text-red-500 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Confirmar Exclusão
                  </h3>
                  <p className="text-xs text-[#bdc8d1]/90 mt-2 leading-relaxed">
                    Você tem certeza de que deseja realizar a exclusão permanentemente? Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#232e48] flex justify-end gap-3 no-print">
                <button
                  type="button"
                  onClick={() => {
                    setShowM3DeleteModal(false);
                    setM3DeleteConfirmType(null);
                    setM3DeleteConfirmId(null);
                  }}
                  className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={executeM3Delete}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmar</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
    
    if (false) {
      // Dummy block to safely contain remaining old markup without syntax issues
  }

    if (false) {
      // Dummy block to safely contain remaining old markup without syntax issues
      const filteredM3 = m3Analises.filter((item) =>
        item.studentName.toLowerCase().includes(m3SearchQuery.toLowerCase()),
      );
      const activeSelectedId = m3SelectedId;
      const selectedRecord = m3Analises.find(
        (item) => item.id === activeSelectedId,
      );
      return (
        <div id="dummy-placeholder">
          {/* Splitscreen Grid Layout: Sidebar and Ficha */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* LEFT SIDEBAR: Records List (CRUD panel) */}
            <div
              className="xl:col-span-4 space-y-4 no-print"
              id="m3-crud-sidebar"
            >
              <div className="bg-[#121c33] border border-[#232e48] p-4 rounded-xl space-y-3.5 shadow-lg">
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                  <ListCollapse className="w-4 h-4 text-blue-400" />
                  <span>Base de Lançamentos ({filteredM3.length})</span>
                </h3>

                {/* Sidebar Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#bdc8d1]" />
                  <input
                    type="text"
                    placeholder="Filtrar estudante, período ou cenário..."
                    value={m3SearchQuery}
                    onChange={(e) => setM3SearchQuery(e.target.value)}
                    className="w-full bg-[#16223d] border border-[#232e48] rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500 text-[#dae2fd]"
                  />
                </div>

                {/* Sidebar List items */}
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredM3.length === 0 ? (
                    <div className="py-8 text-center text-[#bdc8d1]/50 text-xs">
                      Nenhuma análise de frequência cadastrada neste filtro.
                    </div>
                  ) : (
                    filteredM3.map((item) => {
                      const isSelected = item.id === activeSelectedId;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setM3SelectedId(item.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            isSelected
                              ? "bg-blue-600/10 border-blue-500 shadow-md"
                              : "bg-[#16223d]/60 border-[#232e48] hover:border-[#384a6b] hover:bg-[#16223d]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-[#dae2fd] block">
                                {item.studentName}
                              </span>
                              <span className="text-[10px] text-[#bdc8d1] font-mono block">
                                Período: {item.periodo}
                              </span>
                            </div>

                            {item.cenario === "A" && (
                              <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                                CENÁRIO A
                              </span>
                            )}
                            {item.cenario === "B" && (
                              <span className="px-2 py-0.5 rounded text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase">
                                CENÁRIO B
                              </span>
                            )}
                            {item.cenario === "C" && (
                              <span className="px-2 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                                CENÁRIO C
                              </span>
                            )}
                          </div>

                          {/* Card CRUD Actions */}
                          <div className="flex items-center justify-between border-t border-[#232e48]/60 pt-2 text-[10px]">
                            <span className="text-[9px] text-[#bdc8d1]/60 font-mono">
                              {new Date(item.updatedAt).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                            <div
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => handleOpenM3Edit(item)}
                                className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5"
                                title="Editar"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => handleDeleteM3(item.id)}
                                className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-0.5"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Dynamic High-Fidelity Printable Sheet Card */}
            <div className="xl:col-span-8 space-y-4">
              {/* Quick Actions Panel above the sheet */}
              {selectedRecord && (
                <div className="no-print bg-[#121c33] border border-[#232e48] p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs text-[#dae2fd]/90">
                      Visualizando Ficha Oficial de{" "}
                      <strong>{selectedRecord!.studentName}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleOpenM3Edit(selectedRecord as M3Analise)}
                      className="p-2 px-3 rounded bg-blue-600/15 hover:bg-blue-600/25 text-[#8ed5ff] border border-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar Ficha</span>
                    </button>
                    <button
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.print();
                        }
                      }}
                      className="p-2 px-3 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir Ficha</span>
                    </button>
                  </div>
                </div>
              )}

              {/* THE REPLICATED PRINT SHEET (CRISP WHITE DESIGN) */}
              <div
                id="printable-m3-sheet"
                className="bg-white text-slate-800 p-4 sm:p-8 rounded-xl shadow-2xl border border-slate-300 max-w-4xl mx-auto space-y-6 font-sans relative overflow-hidden"
              >
                {/* Report Header Block */}
                <div className="border-b-2 border-slate-900 pb-4 text-center">
                  <span className="font-mono text-[10px] tracking-widest text-[#5d6874] uppercase block mb-1">
                    Diretoria de Ensino Pedro II &bull; Relatório Individual
                  </span>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                    Análise de Frequência Escolar
                  </h1>

                  {selectedRecord ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 text-[11px] text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded-lg text-left font-mono">
                      <div>
                        <span className="font-sans text-[10px] uppercase font-bold text-slate-500 block">
                          Estudante
                        </span>
                        <strong className="text-slate-900 text-xs font-sans font-bold">
                          {selectedRecord!.studentName}
                        </strong>
                      </div>
                      <div>
                        <span className="font-sans text-[10px] uppercase font-bold text-slate-500 block">
                          Período de Referência
                        </span>
                        <strong className="text-slate-900 text-xs font-sans font-bold">
                          {selectedRecord!.periodo}
                        </strong>
                      </div>
                      <div>
                        <span className="font-sans text-[10px] uppercase font-bold text-slate-500 block">
                          Avaliação Diagnóstica
                        </span>
                        <strong className="text-slate-900 text-xs font-sans font-bold">
                          {selectedRecord!.cenario === "A"
                            ? "Cenário A - Assíduo"
                            : selectedRecord!.cenario === "B"
                              ? "Cenário B - Alerta"
                              : "Cenário C - Sem dados"}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1 italic">
                      Nenhum aluno ativo. Exibindo Matriz de Referência Padrão
                      de Análise de Frequência.
                    </p>
                  )}
                </div>

                {/* TABLE 1: ANÁLISE DE FREQUÊNCIA ESCOLARES (MATCHING SCREENSHOT) */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    &bull; Matriz de Diagnósticos por Cenário
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-slate-300 min-w-[640px]">
                      <thead>
                        <tr className="bg-slate-50 text-[11.5px] text-slate-900 font-bold border-b border-slate-300">
                          <th className="py-2.5 px-3 border border-slate-300 w-[12%]">
                            Cenário
                          </th>
                          <th className="py-2.5 px-3 border border-slate-300 w-[18%]">
                            Condição
                          </th>
                          <th className="py-2.5 px-3 border border-slate-300 w-[40%]">
                            Frequência
                          </th>
                          <th className="py-2.5 px-3 border border-slate-300 w-[30%]">
                            Mensagem Direcionada aos Pais e Responsáveis
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-[11px] leading-relaxed text-slate-800">
                        {/* CENÁRIO A ROW */}
                        <tr
                          className={`transition-all border-b border-slate-300 ${
                            selectedRecord?.cenario === "A"
                              ? "bg-emerald-50/70 border-l-4 border-l-emerald-500 font-medium"
                              : "opacity-70 odd:bg-slate-50/40 hover:opacity-100"
                          }`}
                        >
                          <td className="py-3 px-3 border border-slate-300 font-bold text-slate-950 align-top">
                            CENÁRIO A
                            {selectedRecord?.cenario === "A" && (
                              <span className="block text-[8px] tracking-tighter text-emerald-600 block uppercase font-bold mt-1 bg-emerald-100 px-1 py-0.5 rounded text-center">
                                Ativo
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 border border-slate-300 font-bold text-slate-800 align-top">
                            Mais presenças do que faltas
                          </td>
                          <td className="py-3 px-3 border border-slate-300 align-top">
                            {selectedRecord!.cenario === "A"
                              ? selectedRecord!.parecerFrequencia
                              : M3_SCENARIOS.A.parecerFrequencia}
                          </td>
                          <td className="py-3 px-3 border border-slate-300 align-top text-slate-700">
                            {selectedRecord!.cenario === "A"
                              ? selectedRecord!.parecerPais
                              : M3_SCENARIOS.A.parecerPais}
                          </td>
                        </tr>

                        {/* CENÁRIO B ROW */}
                        <tr
                          className={`transition-all border-b border-slate-300 ${
                            selectedRecord?.cenario === "B"
                              ? "bg-red-50/70 border-l-4 border-l-rose-500 font-medium"
                              : "opacity-70 odd:bg-slate-50/40 hover:opacity-100"
                          }`}
                        >
                          <td className="py-3 px-3 border border-slate-300 font-bold text-slate-950 align-top">
                            CENÁRIO B
                            {selectedRecord?.cenario === "B" && (
                              <span className="block text-[8px] tracking-tighter text-rose-600 block uppercase font-bold mt-1 bg-rose-100 px-1 py-0.5 rounded text-center">
                                Ativo
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 border border-slate-300 font-bold text-slate-800 align-top">
                            Mais faltas do que presenças
                          </td>
                          <td className="py-3 px-3 border border-slate-300 align-top">
                            {selectedRecord!.cenario === "B"
                              ? selectedRecord!.parecerFrequencia
                              : M3_SCENARIOS.B.parecerFrequencia}
                          </td>
                          <td className="py-3 px-3 border border-slate-300 align-top text-slate-700">
                            {selectedRecord!.cenario === "B"
                              ? selectedRecord!.parecerPais
                              : M3_SCENARIOS.B.parecerPais}
                          </td>
                        </tr>

                        {/* CENÁRIO C ROW */}
                        <tr
                          className={`transition-all ${
                            selectedRecord?.cenario === "C"
                              ? "bg-amber-50/70 border-l-4 border-l-amber-500 font-medium"
                              : "opacity-70 odd:bg-slate-50/40 hover:opacity-100"
                          }`}
                        >
                          <td className="py-3 px-3 border border-slate-300 font-bold text-slate-950 align-top">
                            CENÁRIO C
                            {selectedRecord?.cenario === "C" && (
                              <span className="block text-[8px] tracking-tighter text-amber-600 block uppercase font-bold mt-1 bg-amber-100 px-1 py-0.5 rounded text-center">
                                Ativo
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 border border-slate-300 font-bold text-slate-800 align-top">
                            Não houver presença ou falta registrada
                          </td>
                          <td className="py-3 px-3 border border-slate-300 align-top font-sans">
                            {selectedRecord!.cenario === "C"
                              ? selectedRecord!.parecerFrequencia
                              : M3_SCENARIOS.C.parecerFrequencia}
                          </td>
                          <td className="py-3 px-3 border border-slate-300 align-top text-slate-700 font-sans">
                            {selectedRecord!.cenario === "C"
                              ? selectedRecord!.parecerPais
                              : M3_SCENARIOS.C.parecerPais}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TABLE 2: MATRIZ DE IMPACTOS (MATCHING SCREENSHOT) */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    &bull; Impactos no Aprendizado
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-slate-300 min-w-[480px]">
                      <thead>
                        <tr className="bg-slate-50 text-[11.5px] text-slate-900 font-bold border-b border-slate-300">
                          <th className="py-2.5 px-3 border border-slate-300 w-[22%]">
                            Tipo de Impacto
                          </th>
                          <th className="py-2.5 px-3 border border-slate-300 w-[30%]">
                            Indicador
                          </th>
                          <th className="py-2.5 px-3 border border-slate-300 w-[48%]">
                            Descrição Detalhada
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-[11px] leading-relaxed text-slate-800">
                        {/* VANTAGENS ROW */}
                        <tr
                          className={`transition-all border-b border-slate-300 ${
                            selectedRecord?.cenario === "A"
                              ? "bg-emerald-50/50 border-l-4 border-l-emerald-500 font-medium"
                              : "opacity-75 even:bg-slate-50/40 hover:opacity-100"
                          }`}
                        >
                          <td className="py-4 px-3 border border-slate-300 font-bold text-slate-950 align-top">
                            Vantagem (Ponto Forte)
                          </td>
                          <td className="py-4 px-3 border border-slate-300 font-bold text-slate-800 align-top">
                            Continuidade Pedagógica, Socialização e Ritmo de
                            Avaliação
                          </td>
                          <td className="py-4 px-3 border border-slate-300 align-top text-slate-700">
                            {selectedRecord &&
                            selectedRecord!.impactosVantagens &&
                            selectedRecord!.impactosVantagens!.length > 0 ? (
                              <ul className="list-disc pl-3.5 space-y-1">
                                {selectedRecord!.impactosVantagens!.map(
                                  (v: string) => (
                                    <li key={v}>{v}</li>
                                  ),
                                )}
                              </ul>
                            ) : (
                              "Quando presente, o aluno acompanha as explicações passo a passo, facilitando a execução de tarefas complexas. A convivência diária fortalece os vínculos com professores e colegas, desenvolvendo inteligência emocional e trabalho em equipe. Menor necessidade de aplicação de provas substitutivas ou trabalhos de recuperação de nota por perda de prazos."
                            )}
                          </td>
                        </tr>

                        {/* DESVANTAGENS ROW */}
                        <tr
                          className={`transition-all ${
                            selectedRecord?.cenario === "B"
                              ? "bg-red-50/50 border-l-4 border-l-rose-500 font-medium"
                              : "opacity-75 even:bg-slate-50/40 hover:opacity-100"
                          }`}
                        >
                          <td className="py-4 px-3 border border-slate-300 font-bold text-slate-950 align-top">
                            Desvantagem (Ponto de Atenção)
                          </td>
                          <td className="py-4 px-3 border border-slate-300 font-bold text-slate-800 align-top">
                            Lacunas de Conteúdo, Desengajamento Escolar e
                            Sobrecarga de Tarefas
                          </td>
                          <td className="py-4 px-3 border border-slate-300 align-top text-slate-700">
                            {selectedRecord &&
                            selectedRecord!.impactosDesvantagens &&
                            selectedRecord!.impactosDesvantagens!.length > 0 ? (
                              <ul className="list-disc pl-3.5 space-y-1">
                                {selectedRecord!.impactosDesvantagens!.map(
                                  (d: string) => (
                                    <li key={d}>{d}</li>
                                  ),
                                )}
                              </ul>
                            ) : (
                              "Cada ausência gera a perda de conceitos-chave, acumulando dúvidas para as unidades seguintes. O excesso de faltas quebra a rotina do estudante, gerando desmotivação e sensação de isolamento em relação à turma. Acúmulo de atividades pendentes que precisam ser realizadas em casa para cumprir as exigências do ano letivo."
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Printable Document Footer (Signatures block) */}
                <div className="pt-12 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 text-[10px] text-slate-600 text-center font-mono">
                  <div className="space-y-1">
                    <div className="w-48 mx-auto border-b border-slate-400 h-6" />
                    <span>Coordenação Pedagógica</span>
                  </div>
                  <div className="space-y-1">
                    <div className="w-48 mx-auto border-b border-slate-400 h-6" />
                    <span>Pais ou Responsável Legal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal form of Add / Edit */}
          {m3ShowModal && (
            <div
              id="m3-modal-overlay"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050b14]/80 backdrop-blur-sm no-print"
            >
              <div className="bg-[#121c33] border border-[#232e48] rounded-2xl w-full max-w-2xl max-h-[90dvh] overflow-hidden flex flex-col shadow-2xl">
                {/* Modal Header */}
                <div className="p-5 border-b border-[#232e48] flex items-center justify-between bg-[#16223d]">
                  <h3 className="text-base font-bold text-[#dae2fd]">
                    {m3EditingItem
                      ? "Editar Análise de Frequência"
                      : "Nova Análise de Frequência"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setM3ShowModal(false)}
                    className="p-2 text-[#bdc8d1] hover:text-[#dae2fd] hover:bg-[#232e48] rounded-lg transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body / Scrollable Form */}
                <form
                  onSubmit={handleSaveM3}
                  className="p-6 overflow-y-auto space-y-5 flex-1"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student input field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#bdc8d1]">
                        Estudante *
                      </label>
                      <select
                        value={m3FormStudentId}
                        onChange={(e) => setM3FormStudentId(e.target.value)}
                        required
                        className="w-full bg-[#16223d] border border-[#232e48] rounded-xl p-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-blue-500 h-[38px]"
                      >
                        <option value="" disabled>
                          Selecione um estudante
                        </option>
                        {students.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Period input field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#bdc8d1]">
                        Período (Mês e Ano) *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Junho/2026"
                        value={m3FormPeriodo}
                        onChange={(e) => setM3FormPeriodo(e.target.value)}
                        required
                        className="w-full bg-[#16223d] border border-[#232e48] rounded-xl p-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-blue-500 h-[38px]"
                      />
                    </div>
                  </div>

                  {/* Scenario Selection Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#bdc8d1] block">
                      Cenário de Análise *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Scenario A Card */}
                      <button
                        type="button"
                        onClick={() => handleM3ScenarioChange("A")}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer focus:outline-none ${
                          m3FormCenario === "A"
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-[#232e48] bg-[#16223d] hover:border-[#384a6b]"
                        }`}
                      >
                        <span className="text-xs font-bold text-emerald-400">
                          Cenário A
                        </span>
                        <span className="text-[10px] text-[#bdc8d1] mt-1">
                          Mais presenças do que faltas
                        </span>
                      </button>

                      {/* Scenario B Card */}
                      <button
                        type="button"
                        onClick={() => handleM3ScenarioChange("B")}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer focus:outline-none ${
                          m3FormCenario === "B"
                            ? "border-rose-500 bg-rose-500/10"
                            : "border-[#232e48] bg-[#16223d] hover:border-[#384a6b]"
                        }`}
                      >
                        <span className="text-xs font-bold text-rose-400">
                          Cenário B
                        </span>
                        <span className="text-[10px] text-[#bdc8d1] mt-1">
                          Mais faltas do que presenças
                        </span>
                      </button>

                      {/* Scenario C Card */}
                      <button
                        type="button"
                        onClick={() => handleM3ScenarioChange("C")}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer focus:outline-none ${
                          m3FormCenario === "C"
                            ? "border-amber-500 bg-amber-500/10"
                            : "border-[#232e48] bg-[#16223d] hover:border-[#384a6b]"
                        }`}
                      >
                        <span className="text-xs font-bold text-amber-400">
                          Cenário C
                        </span>
                        <span className="text-[10px] text-[#bdc8d1] mt-1">
                          Nenhum registro de falta/presença
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Impactos no Aprendizado / Diferenciais Checklist Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Advantages Checkboxes */}
                    <div className="space-y-2 bg-[#16223d]/50 p-3.5 border border-[#232e48] rounded-xl">
                      <span className="text-[11px] uppercase tracking-wider font-mono text-emerald-400 font-bold block">
                        Vantagens (Pontos Fortes)
                      </span>
                      <div className="space-y-2.5">
                        {M3_ADVANTAGES.map((adv) => {
                          const title = adv.split(":")[0];
                          const desc = adv.split(":")[1];
                          const checked = m3FormVantagens.includes(adv);
                          return (
                            <label
                              key={title}
                              className="flex gap-2 text-[11px] text-[#bdc8d1] select-none cursor-pointer hover:text-[#dae2fd]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setM3FormVantagens([
                                      ...m3FormVantagens,
                                      adv,
                                    ]);
                                  } else {
                                    setM3FormVantagens(
                                      m3FormVantagens.filter((v) => v !== adv),
                                    );
                                  }
                                }}
                                className="mt-0.5"
                              />
                              <div>
                                <strong className="text-emerald-300">
                                  {title}:
                                </strong>
                                {desc}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Disadvantages Checkboxes */}
                    <div className="space-y-2 bg-[#16223d]/50 p-3.5 border border-[#232e48] rounded-xl">
                      <span className="text-[11px] uppercase tracking-wider font-mono text-rose-400 font-bold block">
                        Desvantagens (Pontos de Atenção)
                      </span>
                      <div className="space-y-2.5">
                        {M3_DISADVANTAGES.map((dis) => {
                          const title = dis.split(":")[0];
                          const desc = dis.split(":")[1];
                          const checked = m3FormDesvantagens.includes(dis);
                          return (
                            <label
                              key={title}
                              className="flex gap-2 text-[11px] text-[#bdc8d1] select-none cursor-pointer hover:text-[#dae2fd]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setM3FormDesvantagens([
                                      ...m3FormDesvantagens,
                                      dis,
                                    ]);
                                  } else {
                                    setM3FormDesvantagens(
                                      m3FormDesvantagens.filter(
                                        (d) => d !== dis,
                                      ),
                                    );
                                  }
                                }}
                                className="mt-0.5"
                              />
                              <div>
                                <strong className="text-rose-300">
                                  {title}:
                                </strong>
                                {desc}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Parecer de Frequência Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#bdc8d1]">
                      Parecer de Frequência *
                    </label>
                    <textarea
                      rows={4}
                      value={m3FormParecerFrequencia}
                      onChange={(e) =>
                        setM3FormParecerFrequencia(e.target.value)
                      }
                      required
                      className="w-full bg-[#16223d] border border-[#232e48] rounded-xl p-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-blue-500 font-sans"
                      placeholder="Selecione um cenário para carregar o parecer padrão, ou digite aqui para personalizar o texto..."
                    />
                  </div>

                  {/* Parecer Direcionado aos Pais e Responsáveis Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#bdc8d1]">
                      Parecer Direcionado aos Pais e Responsáveis *
                    </label>
                    <textarea
                      rows={3}
                      value={m3FormParecerPais}
                      onChange={(e) => setM3FormParecerPais(e.target.value)}
                      required
                      className="w-full bg-[#16223d] border border-[#232e48] rounded-xl p-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-blue-500 font-sans"
                      placeholder="Selecione um cenário para carregar o parecer dos pais padrão, ou digite aqui para personalizar..."
                    />
                  </div>

                  {/* Modal Footer actions */}
                  <div className="pt-4 border-t border-[#232e48] flex justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setM3ShowModal(false);
                        setM3EditingItem(null);
                      }}
                      className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs transition-all cursor-pointer font-sans"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer font-sans shadow-md"
                    >
                      {m3EditingItem ? "Atualizar Análise" : "Salvar Análise"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      );
    }
  }

  if (activeTab === "questionario-m1") {
    const unitLabel =
      activeTableTab === "impulsao"
        ? "Distância (centímetros)"
        : activeTableTab === "agilidade" || activeTableTab === "velocidade"
          ? "Tempo (segundos)"
          : "Quantidade de Repetições";

    const tableTitle =
      activeTableTab === "forca"
        ? "Tabela de Aptidão: Força Muscular"
        : activeTableTab === "impulsao"
          ? "Tabela de Aptidão: Impulsão"
          : activeTableTab === "abdomen"
            ? "Tabela de Aptidão: Abdômen"
            : activeTableTab === "agilidade"
              ? "Tabela de Aptidão: Agilidade"
              : "Tabela de Aptidão: Velocidade";

    const showBomAndInsuficiente = activeTableTab !== "abdomen";

    return (
      <div
        className="flex-1 min-h-screen bg-[#0b1326] p-4 sm:p-6 lg:p-8 text-[#dae2fd] overflow-y-auto"
        id="modulo1-tables-container"
      >
        {/* View Header */}
        <div
          className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
          id="view-header-div"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="w-5 h-5 text-[#8ed5ff]" />
              <span className="text-xs font-mono text-[#8ed5ff] uppercase tracking-wider">
                Mapeamento &amp; Classificação
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#dae2fd]">
              Módulo 1: Referenciais e Tabelas de Aptidão Motora
            </h2>
            <p className="text-sm text-[#bdc8d1]/80 mt-1 max-w-3xl">
              Consulte e configure os limites e critérios oficiais de pontuação
              por faixa etária e sexo para as capacidades motoras da plataforma.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setEditingRefItem(null);
                setFormIdade("");
                setFormSexo("Masculino");
                setFormInsuficiente("");
                setFormRegular("");
                setFormBom("");
                setFormExcelente("");
                setIsEditingRef(true);
              }}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Faixa</span>
            </button>
          </div>
        </div>

        {/* Global Alert / Success Indicator */}
        {successMessage && (
          <div className="mb-6 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div
          className="flex flex-wrap border-b border-[#3e484f]/40 mb-6 gap-1"
          id="tables-subtabs-div"
        >
          <button
            onClick={() => setActiveTableTab("forca")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 border-b-2 -mb-[1px] flex items-center gap-2 cursor-pointer ${
              activeTableTab === "forca"
                ? "border-[#8ed5ff] text-[#8ed5ff]"
                : "border-transparent text-[#bdc8d1] hover:text-[#dae2fd]"
            }`}
            id="btn-tab-forca"
          >
            <span>Força Muscular</span>
          </button>
          <button
            onClick={() => setActiveTableTab("impulsao")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 border-b-2 -mb-[1px] flex items-center gap-2 cursor-pointer ${
              activeTableTab === "impulsao"
                ? "border-[#8ed5ff] text-[#8ed5ff]"
                : "border-transparent text-[#bdc8d1] hover:text-[#dae2fd]"
            }`}
            id="btn-tab-impulsao"
          >
            <span>Impulsão</span>
          </button>
          <button
            onClick={() => setActiveTableTab("abdomen")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 border-b-2 -mb-[1px] flex items-center gap-2 cursor-pointer ${
              activeTableTab === "abdomen"
                ? "border-[#8ed5ff] text-[#8ed5ff]"
                : "border-transparent text-[#bdc8d1] hover:text-[#dae2fd]"
            }`}
            id="btn-tab-abdomen"
          >
            <span>Abdômen</span>
          </button>
          <button
            onClick={() => setActiveTableTab("agilidade")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 border-b-2 -mb-[1px] flex items-center gap-2 cursor-pointer ${
              activeTableTab === "agilidade"
                ? "border-[#8ed5ff] text-[#8ed5ff]"
                : "border-transparent text-[#bdc8d1] hover:text-[#dae2fd]"
            }`}
            id="btn-tab-agilidade"
          >
            <span>Agilidade</span>
          </button>
          <button
            onClick={() => setActiveTableTab("velocidade")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 border-b-2 -mb-[1px] flex items-center gap-2 cursor-pointer ${
              activeTableTab === "velocidade"
                ? "border-[#8ed5ff] text-[#8ed5ff]"
                : "border-transparent text-[#bdc8d1] hover:text-[#dae2fd]"
            }`}
            id="btn-tab-velocidade"
          >
            <span>Velocidade</span>
          </button>
        </div>

        {/* Selected Table Grid Container */}
        <div
          className="bg-[#121c33] border border-[#232e48] rounded-xl overflow-hidden shadow-lg"
          id="table-display-card"
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#dae2fd]">
                {tableTitle}
              </h3>
              <span className="text-[10px] uppercase font-mono bg-blue-500/10 text-blue-400 px-2 py-1 rounded">
                {unitLabel}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[820px]">
                <thead>
                  <tr className="bg-[#16223d] border-b border-[#232e48] text-xs font-mono uppercase text-[#dae2fd]/75">
                    <th className="py-3 px-4">Idade</th>
                    <th className="py-3 px-4">Sexo</th>
                    {showBomAndInsuficiente && (
                      <th className="py-3 px-4 text-center text-red-400">
                        Insuficiente
                      </th>
                    )}
                    <th className="py-3 px-4 text-center text-amber-400">
                      Regular
                    </th>
                    {showBomAndInsuficiente && (
                      <th className="py-3 px-4 text-center text-emerald-400">
                        Bom
                      </th>
                    )}
                    <th className="py-3 px-4 text-center text-blue-400 font-bold">
                      Excelente
                    </th>
                    <th className="py-3 px-4 text-right col-actions">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232e48]/50 text-xs">
                  {currentFilteredRefs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={showBomAndInsuficiente ? 7 : 5}
                        className="py-8 text-center text-[#bdc8d1]/55 italic"
                      >
                        Nenhum referencial cadastrado nesta faixa de aptidão.
                        Clique em &quot;Adicionar Faixa&quot; para criar o
                        primeiro.
                      </td>
                    </tr>
                  ) : (
                    currentFilteredRefs.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-[#1a2642]/45 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-white">
                          {item.idade}
                        </td>
                        <td className="py-3 px-4">{item.sexo}</td>
                        {showBomAndInsuficiente && (
                          <td className="py-3 px-4 text-center font-mono">
                            {item.insuficiente || "-"}
                          </td>
                        )}
                        <td className="py-3 px-4 text-center font-mono">
                          {item.regular}
                        </td>
                        {showBomAndInsuficiente && (
                          <td className="py-3 px-4 text-center font-mono">
                            {item.bom || "-"}
                          </td>
                        )}
                        <td className="py-3 px-4 text-center font-bold text-[#8ed5ff] font-mono">
                          {item.excelente}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStartEditRef(item)}
                              className="p-2 hover:bg-[#232e48]/60 hover:text-white rounded text-[#8ed5ff] transition-all cursor-pointer"
                              title="Editar"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRef(item)}
                              className="p-2 hover:bg-[#232e48]/60 text-rose-400 hover:text-rose-300 rounded transition-all cursor-pointer"
                              title="Excluir"
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
          </div>
        </div>

        {/* Form Modal for Add/Edit Ref */}
        {isEditingRef && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#121c33] border border-[#232e48] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-[#16223d] px-6 py-4 border-b border-[#232e48] flex items-center justify-between">
                <h3 className="text-base font-bold text-[#dae2fd]">
                  {editingRefItem
                    ? "Editar Faixa de Referência"
                    : "Cadastrar Faixa de Referência"}
                </h3>
                <button
                  onClick={() => setIsEditingRef(false)}
                  className="text-[#bdc8d1] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRef} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-[#8ed5ff] uppercase tracking-wider mb-2">
                      Faixa de Idade *
                    </label>
                    <input
                      type="text"
                      value={formIdade}
                      onChange={(e) => setFormIdade(e.target.value)}
                      placeholder="Ex: 9 a 12 ou 18 ou mais"
                      className="w-full bg-[#1e2944] border border-[#232e48] rounded-lg px-3 py-2 text-sm text-[#dae2fd] focus:outline-none focus:border-[#8ed5ff]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#8ed5ff] uppercase tracking-wider mb-2">
                      Sexo *
                    </label>
                    <select
                      value={formSexo}
                      onChange={(e) => setFormSexo(e.target.value)}
                      className="w-full bg-[#1e2944] border border-[#232e48] rounded-lg px-3 py-2 text-sm text-[#dae2fd] focus:outline-none focus:border-[#8ed5ff]"
                      required
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Todos os sexos">Todos os sexos</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {showBomAndInsuficiente ? (
                    <div>
                      <label className="block text-xs font-mono text-[#8ed5ff] uppercase tracking-wider mb-2">
                        Insuficiente
                      </label>
                      <input
                        type="text"
                        value={formInsuficiente}
                        onChange={(e) => setFormInsuficiente(e.target.value)}
                        placeholder="Ex: 0 a 2 ou 7,00 ou mais"
                        className="w-full bg-[#1e2944] border border-[#232e48] rounded-lg px-3 py-2 text-sm text-[#dae2fd] focus:outline-none focus:border-[#8ed5ff]"
                      />
                    </div>
                  ) : null}
                  <div>
                    <label className="block text-xs font-mono text-[#8ed5ff] uppercase tracking-wider mb-2">
                      Regular *
                    </label>
                    <input
                      type="text"
                      value={formRegular}
                      onChange={(e) => setFormRegular(e.target.value)}
                      placeholder="Ex: 3 a 4"
                      className="w-full bg-[#1e2944] border border-[#232e48] rounded-lg px-3 py-2 text-sm text-[#dae2fd] focus:outline-none focus:border-[#8ed5ff]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {showBomAndInsuficiente ? (
                    <div>
                      <label className="block text-xs font-mono text-[#8ed5ff] uppercase tracking-wider mb-2">
                        Bom
                      </label>
                      <input
                        type="text"
                        value={formBom}
                        onChange={(e) => setFormBom(e.target.value)}
                        placeholder="Ex: 5 a 6"
                        className="w-full bg-[#1e2944] border border-[#232e48] rounded-lg px-3 py-2 text-sm text-[#dae2fd] focus:outline-none focus:border-[#8ed5ff]"
                      />
                    </div>
                  ) : null}
                  <div>
                    <label className="block text-xs font-mono text-[#8ed5ff] uppercase tracking-wider mb-2">
                      Excelente *
                    </label>
                    <input
                      type="text"
                      value={formExcelente}
                      onChange={(e) => setFormExcelente(e.target.value)}
                      placeholder="Ex: 7 ou mais"
                      className="w-full bg-[#1e2944] border border-[#232e48] rounded-lg px-3 py-2 text-sm text-[#dae2fd] focus:outline-none focus:border-[#8ed5ff]"
                      required
                    />
                  </div>
                </div>

                <div className="text-xs text-[#bdc8d1]/60 font-mono mt-1">
                  * Campos obrigatórios. A faixa será criada na aba ativa:{" "}
                  <span className="text-[#8ed5ff] font-bold">
                    {activeTableTab.toUpperCase()}
                  </span>
                </div>

                <div className="pt-4 border-t border-[#232e48] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingRef(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium border border-[#232e48] hover:bg-[#1e2944] text-[#bdc8d1] hover:text-white transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
                  >
                    {editingRefItem ? "Salvar Alterações" : "Cadastrar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão de Referencial (Módulo 1) */}
        {refToDelete && (
          <div className="fixed inset-0 bg-[#060e20]/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#171f33] border border-[#ffb4ab]/40 w-full max-w-sm rounded-xl shadow-2xl p-5 relative animate-in fade-in zoom-in duration-150">
              <h4 className="text-sm font-bold text-[#ffb4ab] uppercase tracking-wider mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Confirmar Exclusão
              </h4>
              <p className="text-xs text-[#bdc8d1] mb-5 leading-relaxed">
                Tem certeza de que deseja remover permanentemente o limite de
                aptidão para{" "}
                <span className="text-[#dae2fd] font-bold">
                  {refToDelete.idade}
                </span>{" "}
                ({refToDelete.sexo}) da tabela de{" "}
                {refToDelete.category === "forca"
                  ? "Força Muscular"
                  : refToDelete.category === "impulsao"
                    ? "Impulsão"
                    : refToDelete.category === "abdomen"
                      ? "Abdômen"
                      : refToDelete.category === "agilidade"
                        ? "Agilidade"
                        : "Velocidade"}
                ? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRefToDelete(null)}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteRef}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow-md cursor-pointer"
                >
                  Confirmar Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "questionario-m2") {
    const simulatedStudent = students.find((s) => s.id === simulatedStudentId);
    const simulatedStudentImcs = localImcRecords.filter(
      (r) => r.studentId === simulatedStudentId,
    );
    const latestSimulatedImc = simulatedStudentImcs.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];
    const simulatedStudentMotors = localMotorRecords.filter(
      (r) => r.studentId === simulatedStudentId,
    );
    const latestSimulatedMotor = simulatedStudentMotors.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];

    const getSimulatedStudentLevels = () => {
      if (!simulatedStudentId) return null;

      let imcLevel: "Excelente" | "Bom" | "Regular" | "Insuficiente" =
        "Regular";
      if (latestSimulatedImc) {
        const cls = (latestSimulatedImc.classification || "").toLowerCase();
        if (cls.includes("normal") || cls.includes("peso ideal") || cls.includes("eutrofia")) {
          imcLevel = "Excelente";
        } else if (cls.includes("baixo") || cls.includes("magreza")) {
          imcLevel = "Bom";
        } else if (cls.includes("sobrepeso")) {
          imcLevel = "Regular";
        } else if (cls.includes("obesidade") || cls.includes("obeso")) {
          imcLevel = "Insuficiente";
        } else {
          imcLevel = "Regular";
        }
      }

      const motorLevels = {
        imc: imcLevel,
        v20m: latestSimulatedMotor
          ? latestSimulatedMotor.speed || "Excelente"
          : ("Regular" as const),
        impulsao: latestSimulatedMotor
          ? latestSimulatedMotor.impulsao || latestSimulatedMotor.flexibility || "Excelente"
          : ("Regular" as const),
        flexao: latestSimulatedMotor
          ? latestSimulatedMotor.strength || "Excelente"
          : ("Regular" as const),
        agilidade: latestSimulatedMotor
          ? latestSimulatedMotor.agility || "Excelente"
          : ("Regular" as const),
        abdominal: latestSimulatedMotor
          ? latestSimulatedMotor.abdomen || latestSimulatedMotor.coordination || "Excelente"
          : ("Regular" as const),
      };

      return motorLevels;
    };

    const simLevels = getSimulatedStudentLevels();

    const getModalityMatch = (mod: M2Modality) => {
      if (!simLevels) return null;
      let matchCount = 0;
      const testKeys = [
        "imc",
        "v20m",
        "impulsao",
        "flexao",
        "agilidade",
        "abdominal",
      ] as const;
      const details: Record<string, boolean> = {};
      testKeys.forEach((k) => {
        const allowed = mod.requirements[k] || [];
        const studVal = simLevels[k];
        if (allowed.includes(studVal)) {
          details[k] = true;
          matchCount++;
        } else {
          details[k] = false;
        }
      });
      const percent = Math.round((matchCount / 6) * 100);
      return {
        matchCount,
        percent,
        details,
        isCompatible: matchCount === 6,
      };
    };

    const toggleCellSelection = (
      modId: string,
      testKey: string,
      level: string,
    ) => {
      if (user?.role === "Aluno") {
        alert(
          "Apenas professores e administradores podem editar a matriz de requisitos esportivos.",
        );
        return;
      }
      const updated = m2Modalidades.map((m) => {
        if (m.id === modId) {
          const current = m.requirements[testKey] || [];
          const next = current.includes(level)
            ? current.filter((l: string) => l !== level)
            : [...current, level];
          return {
            ...m,
            requirements: {
              ...m.requirements,
              [testKey]: next,
            },
          };
        }
        return m;
      });
      saveM2Modalidades(updated);
    };

    return (
      <div
        className="flex-1 min-h-screen bg-[#0b1326] p-4 sm:p-6 lg:p-8 text-[#dae2fd] overflow-y-auto"
        id="modulo2-tables-container"
      >
        {/* View Header */}
        <div
          className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
          id="view-header-div"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-[#8ed5ff]" />
              <span className="text-xs font-mono text-[#8ed5ff] uppercase tracking-wider">
                Mapeamento Vocacional Esportivo
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#dae2fd]">
              Módulo 2: Direcionamento Vocacional e Tabela de Aptidão por
              Modalidade
            </h2>
            <p className="text-sm text-[#bdc8d1]/80 mt-1 max-w-3xl">
              Consulte e edite os perfis físicos ideais necessários para cada
              modalidade. Selecione um aluno para analisar sua compatibilidade
              física instantaneamente com cada esporte.
            </p>
          </div>
          {successMessage && (
            <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 animate-pulse shrink-0">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Action Controls & Simulator */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-5 rounded-xl bg-[#121c33] border border-[#232e48] shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-xs font-bold text-[#bdc8d1] whitespace-nowrap">
                Simular Resultados do Aluno:
              </span>
              <select
                value={simulatedStudentId}
                onChange={(e) => setSimulatedStudentId(e.target.value)}
                disabled={user?.role === "Aluno"}
                className="bg-[#0b1326] border border-[#2a3652] text-xs text-[#dae2fd] rounded-lg p-2.5 focus:border-[#8ed5ff] focus:outline-none focus:ring-1 focus:ring-[#8ed5ff] cursor-pointer"
              >
                <option value="">Nenhum - Mostrar Apenas Matriz</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.grade || "S/T"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2.5 justify-end">
              {user?.role !== "Aluno" && (
                <>
                  <button
                    onClick={() => {
                      setM2ModalMode("create");
                      setM2NewName("");
                      setM2NewReqs({
                        imc: ["Bom", "Excelente"],
                        v20m: ["Bom", "Excelente"],
                        impulsao: ["Bom", "Excelente"],
                        flexao: ["Bom", "Excelente"],
                        agilidade: ["Bom", "Excelente"],
                        abdominal: ["Bom", "Excelente"],
                      });
                      setShowM2Modal(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all duration-200 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Indicar Novo Esporte</span>
                  </button>

                </>
              )}
            </div>
          </div>

          {/* Student Profile Overview Panel */}
          {simulatedStudentId && (
            <div className="p-5 rounded-xl bg-blue-950/20 border border-blue-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-5 animate-in slide-in-from-top duration-200 shadow-inner">
              <div className="shrink-0">
                <span className="text-[10px] font-mono text-[#8ed5ff] uppercase tracking-widest block mb-0.5">
                  Perfil Selecionado
                </span>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-[#8ed5ff]" />
                  {simulatedStudent?.name}
                </h4>
                <p className="text-xs text-[#bdc8d1]/75 mt-0.5">
                  Ano/Série: {simulatedStudent?.grade || "Não informada"}
                </p>
              </div>
              {simLevels ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 flex-1 max-w-4xl justify-end">
                  {[
                    {
                      label: "Índice Corporal",
                      val: latestSimulatedImc
                        ? latestSimulatedImc.classification
                        : "S/D",
                      matchVal: simLevels.imc,
                    },
                    { label: "20 metros", matchVal: simLevels.v20m },
                    { label: "Impulsão", matchVal: simLevels.impulsao },
                    { label: "Flexão de Braços", matchVal: simLevels.flexao },
                    { label: "Agilidade", matchVal: simLevels.agilidade },
                    { label: "Abdominal", matchVal: simLevels.abdominal },
                  ].map((f, i) => (
                    <div
                      key={i}
                      className="bg-[#0b1326]/90 border border-[#232e48] px-4 py-2.5 rounded-xl text-center shadow-sm"
                    >
                      <span className="text-[10px] text-[#bdc8d1] block font-semibold uppercase tracking-wider">
                        {f.label}
                      </span>
                      <span
                        className={`text-xs font-extrabold block mt-1 ${
                          f.matchVal === "Excelente"
                            ? "text-emerald-400"
                            : f.matchVal === "Bom"
                              ? "text-blue-400"
                              : f.matchVal === "Regular"
                                ? "text-amber-400"
                                : "text-red-400"
                        }`}
                      >
                        {f.label === "Índice Corporal" && f.matchVal
                          ? getImcDisplayLabel(f.matchVal)
                          : f.val || f.matchVal}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-amber-300 font-semibold flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>
                    Nenhum boletim ou avaliação motora cadastrada para este
                    aluno.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Informative text about editability */}
        {user?.role !== "Aluno" && (
          <p className="text-[11px] text-[#bdc8d1]/65 mb-4 italic">
            * Dica: Você pode reconfigurar os requisitos ideais clicando
            diretamente nas classificações de qualquer coluna na tabela abaixo.
          </p>
        )}

        {/* Matrix Table */}
        <div className="overflow-x-auto rounded-xl border border-[#232e48] shadow-2xl bg-[#121c33]">
          <table className="w-full text-left border-collapse min-w-[855px]">
            <thead>
              <tr className="bg-[#0b1326] border-b border-[#232e48]/90">
                <th className="p-3 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider min-w-[170px]">
                  Modalidade
                </th>
                <th className="p-3 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center w-[13%]">
                  Índice Corporal
                </th>
                <th className="p-3 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center w-[13%]">
                  20 metros
                </th>
                <th className="p-3 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center w-[13%]">
                  Impulsão
                </th>
                <th className="p-3 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center w-[13%]">
                  Flexão de Braços
                </th>
                <th className="p-3 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center w-[13%]">
                  Agilidade
                </th>
                <th className="p-3 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center w-[13%]">
                  Abdominal
                </th>
                {user?.role !== "Aluno" && (
                  <th className="p-3 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-right w-[10%]">
                    AÇÕES
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232e48]/60">
              {m2Modalidades.map((mod) => {
                const match = getModalityMatch(mod);
                return (
                  <tr
                    key={mod.id}
                    className={`hover:bg-[#16223e]/40 transition-colors ${
                      match && match.isCompatible
                        ? "bg-[#10b981]/5 hover:bg-[#10b981]/10"
                        : ""
                    }`}
                  >
                    {/* Modality Name and Matching Badge */}
                    <td className="p-3 py-3.5 align-middle">
                      <div className="font-semibold text-white text-sm">
                        {mod.name}
                      </div>
                      {match && (
                        <div className="mt-1 flex flex-col gap-0.5 items-start">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm ${
                              match.isCompatible
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : match.percent >= 66
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                  : "bg-[#1a233a] text-[#bdc8d1]/60"
                            }`}
                          >
                            {match.isCompatible && (
                              <Award className="w-3 h-3 text-emerald-400 shrink-0" />
                            )}
                            {match.percent}% Apto
                          </span>
                          <span className="text-[9px] text-[#bdc8d1]/65 font-mono">
                            ({match.matchCount} de 6 testes)
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Column Cells with vertical selections */}
                    {[
                      "imc",
                      "v20m",
                      "impulsao",
                      "flexao",
                      "agilidade",
                      "abdominal",
                    ].map((testKey) => {
                      const requiredLevels = mod.requirements[testKey] || [];
                      const studVal = simLevels
                        ? (simLevels as Record<string, string>)[testKey]
                        : null;

                      return (
                        <td
                          key={testKey}
                          className="p-2 py-2 align-middle text-center"
                        >
                          <div className="flex flex-col gap-1 items-center justify-center">
                            {[
                              "Insuficiente",
                              "Regular",
                              "Bom",
                              "Excelente",
                            ].map((lvl) => {
                              const isReq = requiredLevels.includes(lvl);
                              const isStudLvl = studVal === lvl;

                              // Style calculation
                              let btnClass =
                                "w-[94px] py-0.5 rounded text-[10px] font-medium transition-all border text-center relative cursor-pointer select-none ";
                              if (isReq) {
                                if (lvl === "Excelente")
                                  btnClass +=
                                    "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25";
                                else if (lvl === "Bom")
                                  btnClass +=
                                    "bg-blue-500/15 border-blue-500/40 text-blue-300 hover:bg-blue-500/25";
                                else if (lvl === "Regular")
                                  btnClass +=
                                    "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25";
                                else
                                  btnClass +=
                                    "bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25";
                              } else {
                                btnClass +=
                                  "bg-transparent border-transparent text-[#bdc8d1]/30 hover:text-[#bdc8d1]/75 hover:bg-[#1a233a]/65";
                              }

                              if (isStudLvl) {
                                btnClass +=
                                  " ring-2 ring-indigo-400 ring-offset-1 ring-offset-[#121c33] font-bold";
                              }

                              return (
                                <div
                                  key={lvl}
                                  onClick={() =>
                                    toggleCellSelection(mod.id, testKey, lvl)
                                  }
                                  className={btnClass}
                                  title={
                                    user?.role === "Aluno"
                                      ? "Requisito"
                                      : "Clique para alternar este requisito"
                                  }
                                >
                                  <div className="flex items-center justify-center gap-0.5">
                                    <span>
                                      {testKey === "imc"
                                        ? getImcDisplayLabel(lvl)
                                        : lvl}
                                    </span>
                                    {isStudLvl && (
                                      <span className="text-[8px] text-[#8ed5ff] font-mono shrink-0 ml-0.5 bg-indigo-500/25 px-0.5 py-0.2 rounded font-bold">
                                        A
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}

                    {/* Actions Column */}
                    {user?.role !== "Aluno" && (
                      <td className="p-2 align-middle text-right">
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setM2ModalMode("edit");
                              setEditingM2Id(mod.id);
                              setM2NewName(mod.name);
                              setShowM2Modal(true);
                            }}
                            className="p-2 px-2 py-0.5 text-[11px] font-semibold border border-[#232e48] hover:bg-[#1e2944] text-[#bdc8d1] hover:text-white rounded transition-all"
                            title="Renomear Modalidade"
                          >
                            <Edit className="w-3 h-3 inline mr-1" />
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              setM2ModalityToDelete(mod);
                            }}
                            className="p-2 px-2 py-0.5 text-[11px] font-semibold border border-red-950 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-all"
                            title="Remover Modalidade"
                          >
                            <Trash2 className="w-3 h-3 inline mr-1" />
                            Excluir
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal for Create/Edit */}
        {showM2Modal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#121c33] border border-[#232e48] rounded-xl max-w-lg w-full p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#232e48]">
                <h3 className="text-lg font-bold text-[#dae2fd]">
                  {m2ModalMode === "create"
                    ? "Indicar Nova Modalidade"
                    : "Editar Nome da Modalidade"}
                </h3>
                <button
                  onClick={() => setShowM2Modal(false)}
                  className="text-[#bdc8d1] hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!m2NewName.trim()) return;
                  if (m2ModalMode === "create") {
                    const newMod = {
                      id: (await nextM2ModalidadeId()) || ('m2-custom-' + uuid().slice(0, 8)),
                      name: m2NewName.trim(),
                      requirements: { ...m2NewReqs },
                    };
                    saveM2Modalidades([...m2Modalidades, newMod]);
                  } else {
                    const updated = m2Modalidades.map((m) => {
                      if (m.id === editingM2Id) {
                        return {
                          ...m,
                          name: m2NewName.trim(),
                        };
                      }
                      return m;
                    });
                    saveM2Modalidades(updated);
                  }
                  setShowM2Modal(false);
                  setSuccessMessage(
                    m2ModalMode === "create"
                      ? "Modalidade adicionada com sucesso!"
                      : "Modalidade renomeada com sucesso!",
                  );
                  setTimeout(() => setSuccessMessage(null), 4000);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">
                    Nome da Modalidade/Esporte:
                  </label>
                  <input
                    type="text"
                    required
                    value={m2NewName}
                    onChange={(e) => setM2NewName(e.target.value)}
                    placeholder="Ex: Tênis de Mesa, Judô, Atletismo"
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg p-3.5 text-xs text-[#dae2fd] focus:border-[#8ed5ff] focus:outline-none transition-all"
                  />
                </div>
                <div className="pt-4 border-t border-[#232e48] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowM2Modal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium border border-[#232e48] hover:bg-[#1e2944] text-[#bdc8d1] hover:text-white transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
                  >
                    {m2ModalMode === "create"
                      ? "Indicar Esporte"
                      : "Salvar Alterações"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão de Modalidade (Módulo 2) */}
        {m2ModalityToDelete && (
          <div className="fixed inset-0 bg-[#060e20]/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#171f33] border border-[#ffb4ab]/40 w-full max-w-sm rounded-xl shadow-2xl p-5 relative animate-in fade-in zoom-in duration-150">
              <h4 className="text-sm font-bold text-[#ffb4ab] uppercase tracking-wider mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Confirmar Exclusão
              </h4>
              <p className="text-xs text-[#bdc8d1] mb-5 leading-relaxed">
                Tem certeza de que deseja remover permanentemente a modalidade{" "}
                <span className="text-white font-bold">
                  {m2ModalityToDelete.name}
                </span>{" "}
                e todas as suas configurações de aptidão? Esta ação não pode ser
                desfeita.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setM2ModalityToDelete(null)}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteM2Modality}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow-md cursor-pointer"
                >
                  Confirmar Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "questionario-m6") {
    const filteredM6Modalidades = m6Modalidades.filter((row) => {
      const q = searchQuery.toLowerCase();
      return (
        row.name.toLowerCase().includes(q) ||
        row.valencias.toLowerCase().includes(q) ||
        row.condition.toLowerCase().includes(q) ||
        row.report.toLowerCase().includes(q)
      );
    }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    const filteredM6Diretrizes = m6Diretrizes.filter((row) => {
      const q = searchQuery.toLowerCase();
      return (
        row.diretriz.toLowerCase().includes(q) ||
        row.criterio.toLowerCase().includes(q) ||
        row.conduta.toLowerCase().includes(q) ||
        row.objetivo.toLowerCase().includes(q)
      );
    });

    const m6AddModality = async () => {
      if (!m6NewModality.name.trim() || !m6NewModality.valencias.trim() || !m6NewModality.condition.trim() || !m6NewModality.report.trim()) {
        return;
      }
      const newId = (await nextM6DirecionamentoId()) || ('m6_m_' + uuid().slice(0, 8));
      const newRow = { ...m6NewModality, id: newId };
      setM6Modalidades([...m6Modalidades, newRow]);
      setM6NewModality({ name: "", valencias: "", condition: "", report: "" });

      // Sync to Supabase
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          supabase.from("m6_modalidades_direcionamento").upsert({
            id: newRow.id,
            name: newRow.name,
            valencias: newRow.valencias,
            condition: newRow.condition,
            report: newRow.report,
          }).then(({ error }) => {
            if (error) console.error("Error saving m6_modalidades_direcionamento to Supabase:", error?.message ?? error);
          });
        }
      }
    };

    const m6StartEditingModality = (row: M6ModalityRow) => {
      setM6EditingModalityId(row.id);
      setM6EditingModalityData({ ...row });
    };

    const m6CancelEditingModality = () => {
      setM6EditingModalityId(null);
      setM6EditingModalityData(null);
    };

    const m6SaveEditingModality = () => {
      if (m6EditingModalityData) {
        setM6Modalidades(m6Modalidades.map(row => row.id === m6EditingModalityId ? m6EditingModalityData : row));
        setM6EditingModalityId(null);
        setM6EditingModalityData(null);

        // Sync to Supabase
        if (isSupabaseConfigured) {
          const supabase = getDb();
          if (supabase) {
            supabase.from("m6_modalidades_direcionamento").upsert({
              id: m6EditingModalityData.id,
              name: m6EditingModalityData.name,
              valencias: m6EditingModalityData.valencias,
              condition: m6EditingModalityData.condition,
              report: m6EditingModalityData.report,
            }).then(({ error }) => {
              if (error) console.error("Error saving m6_modalidades_direcionamento to Supabase:", error?.message ?? error);
            });
          }
        }
      }
    };

    const m6DeleteModality = (id: string) => {
      const row = m6Modalidades.find(r => r.id === id);
      if (row) {
        setM6ModalityToDelete(row);
      }
    };

    const handleConfirmDeleteM6Modality = () => {
      if (m6ModalityToDelete) {
        const deletedId = m6ModalityToDelete.id;
        setM6Modalidades(m6Modalidades.filter(row => row.id !== deletedId));
        setM6ModalityToDelete(null);

        // Sync to Supabase
        if (isSupabaseConfigured) {
          const supabase = getDb();
          if (supabase) {
            supabase.from("m6_modalidades_direcionamento").delete().eq("id", deletedId).then(({ error }) => {
              if (error) console.error("Error deleting m6_modalidades_direcionamento from Supabase:", error);
            });
          }
        }
      }
    };

    const m6AddDiretriz = async () => {
      if (!m6NewDiretriz.diretriz.trim() || !m6NewDiretriz.criterio.trim() || !m6NewDiretriz.conduta.trim() || !m6NewDiretriz.objetivo.trim()) {
        return;
      }
      const newId = (await nextM6DiretrizId()) || ('m6_d_' + uuid().slice(0, 8));
      const newRow = { ...m6NewDiretriz, id: newId };
      setM6Diretrizes([...m6Diretrizes, newRow]);
      setM6NewDiretriz({ diretriz: "", criterio: "", conduta: "", objetivo: "" });

      // Sync to Supabase
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          supabase.from("m6_diretrizes_intervencao").upsert({
            id: newRow.id,
            diretriz: newRow.diretriz,
            criterio: newRow.criterio,
            conduta: newRow.conduta,
            objetivo: newRow.objetivo,
          }).then(({ error }) => {
            if (error) console.error("Error saving m6_diretrizes_intervencao to Supabase:", error?.message ?? error);
          });
        }
      }
    };

    const m6StartEditingDiretriz = (row: M6DiretrizRow) => {
      setM6EditingDiretrizId(row.id);
      setM6EditingDiretrizData({ ...row });
    };

    const m6CancelEditingDiretriz = () => {
      setM6EditingDiretrizId(null);
      setM6EditingDiretrizData(null);
    };

    const m6SaveEditingDiretriz = () => {
      if (m6EditingDiretrizData) {
        setM6Diretrizes(m6Diretrizes.map(row => row.id === m6EditingDiretrizId ? m6EditingDiretrizData : row));
        setM6EditingDiretrizId(null);
        setM6EditingDiretrizData(null);

        // Sync to Supabase
        if (isSupabaseConfigured) {
          const supabase = getDb();
          if (supabase) {
            supabase.from("m6_diretrizes_intervencao").upsert({
              id: m6EditingDiretrizData.id,
              diretriz: m6EditingDiretrizData.diretriz,
              criterio: m6EditingDiretrizData.criterio,
              conduta: m6EditingDiretrizData.conduta,
              objetivo: m6EditingDiretrizData.objetivo,
            }).then(({ error }) => {
              if (error) console.error("Error saving m6_diretrizes_intervencao to Supabase:", error?.message ?? error);
            });
          }
        }
      }
    };

    const m6DeleteDiretriz = (id: string) => {
      const row = m6Diretrizes.find(r => r.id === id);
      if (row) {
        setM6DiretrizToDelete(row);
      }
    };

    const handleConfirmDeleteM6Diretriz = () => {
      if (m6DiretrizToDelete) {
        const deletedId = m6DiretrizToDelete.id;
        setM6Diretrizes(m6Diretrizes.filter(row => row.id !== deletedId));
        setM6DiretrizToDelete(null);

        // Sync to Supabase
        if (isSupabaseConfigured) {
          const supabase = getDb();
          if (supabase) {
            supabase.from("m6_diretrizes_intervencao").delete().eq("id", deletedId).then(({ error }) => {
              if (error) console.error("Error deleting m6_diretrizes_intervencao from Supabase:", error);
            });
          }
        }
      }
    };

    return (
      <div className="p-6 bg-white rounded-xl shadow-md border border-slate-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
              <ClipboardList className="w-7 h-7 text-blue-600" />
              Módulo 6: Direcionamento por Modalidade e Diretrizes
            </h1>
            <p className="text-sm text-slate-600 font-bold mt-1">
              Configure as Tabelas de Direcionamento por Esporte e Diretrizes de Intervenção
            </p>
          </div>
          
          {/* Global Search inside this tab */}
          <div className="relative w-full sm:w-80">
            <Search className="w-5 h-5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Pesquisar registros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-300 rounded-lg py-2 pl-10 pr-4 text-sm text-black placeholder-slate-500 focus:outline-none focus:border-black font-semibold"
            />
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-slate-100 p-2 rounded-xl border border-slate-300">
          <button
            onClick={() => {
              setM6ActiveSubTab("modalidades");
              setM6EditingModalityId(null);
              setM6EditingModalityData(null);
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-black transition-all cursor-pointer ${
              m6ActiveSubTab === "modalidades"
                ? "bg-black text-white shadow-md border border-black"
                : "bg-white text-slate-800 hover:bg-slate-200 border border-slate-300"
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>Direcionamento por Modalidade ({m6Modalidades.length})</span>
          </button>
          <button
            onClick={() => {
              setM6ActiveSubTab("diretrizes");
              setM6EditingDiretrizId(null);
              setM6EditingDiretrizData(null);
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-black transition-all cursor-pointer ${
              m6ActiveSubTab === "diretrizes"
                ? "bg-black text-white shadow-md border border-black"
                : "bg-white text-slate-800 hover:bg-slate-200 border border-slate-300"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Diretrizes de Intervenção ({m6Diretrizes.length})</span>
          </button>
        </div>

        {/* Tab 1: Direcionamento por Modalidade */}
        {m6ActiveSubTab === "modalidades" && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Adding Form Card */}
            <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-5">
              <h3 className="text-base font-black text-black uppercase tracking-tight mb-4 flex items-center gap-2 border-b pb-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Novo Direcionamento de Modalidade
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">Modalidade / Esporte:</label>
                  <input
                    type="text"
                    placeholder="Ex: BASQUETE 🏀"
                    value={m6NewModality.name}
                    onChange={(e) => setM6NewModality({ ...m6NewModality, name: e.target.value })}
                    className="w-full bg-white border-2 border-slate-300 rounded-lg p-2.5 text-sm text-black focus:border-black focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">Valências Importantes:</label>
                  <input
                    type="text"
                    placeholder="Ex: Impulsão, Agilidade..."
                    value={m6NewModality.valencias}
                    onChange={(e) => setM6NewModality({ ...m6NewModality, valencias: e.target.value })}
                    className="w-full bg-white border-2 border-slate-300 rounded-lg p-2.5 text-sm text-black focus:border-black focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">Condição Pedagógica (Nível):</label>
                  <input
                    type="text"
                    placeholder="Ex: Níveis Bom / Excelente em..."
                    value={m6NewModality.condition}
                    onChange={(e) => setM6NewModality({ ...m6NewModality, condition: e.target.value })}
                    className="w-full bg-white border-2 border-slate-300 rounded-lg p-2.5 text-sm text-black focus:border-black focus:outline-none font-bold"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs font-extrabold text-slate-800 block mb-1">Parecer Técnico / Impacto na Saúde:</label>
                <textarea
                  placeholder="Descreva o parecer técnico detalhadamente ou o impacto na saúde..."
                  value={m6NewModality.report}
                  onChange={(e) => setM6NewModality({ ...m6NewModality, report: e.target.value })}
                  rows={3}
                  className="w-full bg-white border-2 border-slate-300 rounded-lg p-2.5 text-sm text-black focus:border-black focus:outline-none font-bold resize-y"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={m6AddModality}
                  className="px-6 py-3 bg-black hover:bg-slate-800 text-white font-black rounded-lg text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer border border-black flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Registro</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border-2 border-slate-300 rounded-xl bg-white shadow-sm">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 uppercase text-xs font-black border-b-2 border-slate-300">
                    <th className="py-4 px-4 text-left border-r border-slate-300 w-1/6">Modalidade</th>
                    <th className="py-4 px-4 text-left border-r border-slate-300 w-1/6">Valências Importantes</th>
                    <th className="py-4 px-4 text-left border-r border-slate-300 w-1/4">Condição Pedagógica (Nível)</th>
                    <th className="py-4 px-4 text-left border-r border-slate-300">Parecer Técnico / Impacto na Saúde</th>
                    <th className="py-4 px-4 text-center w-28">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredM6Modalidades.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 font-bold italic bg-slate-50">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredM6Modalidades.map((row) => {
                      const isEditing = m6EditingModalityId === row.id;
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-slate-300 hover:bg-slate-50/50 transition-colors"
                        >
                          {isEditing && m6EditingModalityData ? (
                            <>
                              <td className="py-4 px-3 align-top border-r border-slate-300">
                                <input
                                  type="text"
                                  className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                                  value={m6EditingModalityData.name}
                                  onChange={(e) => setM6EditingModalityData({ ...m6EditingModalityData, name: e.target.value })}
                                />
                              </td>
                              <td className="py-4 px-3 align-top border-r border-slate-300">
                                <input
                                  type="text"
                                  className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                                  value={m6EditingModalityData.valencias}
                                  onChange={(e) => setM6EditingModalityData({ ...m6EditingModalityData, valencias: e.target.value })}
                                />
                              </td>
                              <td className="py-4 px-3 align-top border-r border-slate-300">
                                <input
                                  type="text"
                                  className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                                  value={m6EditingModalityData.condition}
                                  onChange={(e) => setM6EditingModalityData({ ...m6EditingModalityData, condition: e.target.value })}
                                />
                              </td>
                              <td className="py-4 px-3 align-top border-r border-slate-300">
                                <textarea
                                  className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold min-h-[100px] focus:ring-2 focus:ring-blue-600 outline-none resize-y"
                                  value={m6EditingModalityData.report}
                                  onChange={(e) => setM6EditingModalityData({ ...m6EditingModalityData, report: e.target.value })}
                                />
                              </td>
                              <td className="py-4 px-3 align-top text-center">
                                <div className="flex flex-col gap-2 justify-center">
                                  <button
                                    onClick={m6SaveEditingModality}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold transition-all shadow-md active:scale-95 border border-green-700"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={m6CancelEditingModality}
                                    className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold transition-all shadow-md active:scale-95 border border-slate-600"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-5 px-4 font-black text-black align-top border-r border-slate-300">
                                <div className="text-sm tracking-tight">{row.name}</div>
                              </td>
                              <td className="py-5 px-4 text-slate-800 font-extrabold text-xs align-top border-r border-slate-300">
                                {row.valencias}
                              </td>
                              <td className="py-5 px-4 text-slate-900 font-extrabold text-xs align-top border-r border-slate-300">
                                {row.condition}
                              </td>
                              <td className="py-5 px-4 text-slate-800 font-medium text-xs leading-relaxed text-justify align-top border-r border-slate-300">
                                {row.report}
                              </td>
                              <td className="py-5 px-3 align-top text-center">
                                <div className="flex flex-col gap-2 justify-center">
                                  <button
                                    onClick={() => m6StartEditingModality(row)}
                                    className="text-blue-700 hover:text-white flex items-center justify-center gap-1 font-bold text-[10px] bg-blue-100 hover:bg-blue-700 px-2 py-1.5 rounded-md transition-all cursor-pointer border border-blue-400"
                                    title="Editar"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    onClick={() => m6DeleteModality(row.id)}
                                    className="text-red-700 hover:text-white flex items-center justify-center gap-1 font-bold text-[10px] bg-red-100 hover:bg-red-700 px-2 py-1.5 rounded-md transition-all cursor-pointer border border-red-400"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Excluir</span>
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Diretrizes de Intervenção */}
        {m6ActiveSubTab === "diretrizes" && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Adding Form Card */}
            <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-5">
              <h3 className="text-base font-black text-black uppercase tracking-tight mb-4 flex items-center gap-2 border-b pb-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Nova Diretriz de Intervenção
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">Diretriz / Intervenção:</label>
                  <input
                    type="text"
                    placeholder="Ex: APRIMORAR HABILIDADES MOTORAS 🏃‍♂️"
                    value={m6NewDiretriz.diretriz}
                    onChange={(e) => setM6NewDiretriz({ ...m6NewDiretriz, diretriz: e.target.value })}
                    className="w-full bg-white border-2 border-slate-300 rounded-lg p-2.5 text-sm text-black focus:border-black focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">Critério Técnico de Ativação:</label>
                  <input
                    type="text"
                    placeholder="Ex: Se três ou mais valências..."
                    value={m6NewDiretriz.criterio}
                    onChange={(e) => setM6NewDiretriz({ ...m6NewDiretriz, criterio: e.target.value })}
                    className="w-full bg-white border-2 border-slate-300 rounded-lg p-2.5 text-sm text-black focus:border-black focus:outline-none font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">Parecer Técnico / Conduta Pedagógica:</label>
                  <textarea
                    placeholder="Descreva a conduta pedagógica detalhadamente..."
                    value={m6NewDiretriz.conduta}
                    onChange={(e) => setM6NewDiretriz({ ...m6NewDiretriz, conduta: e.target.value })}
                    rows={3}
                    className="w-full bg-white border-2 border-slate-300 rounded-lg p-2.5 text-sm text-black focus:border-black focus:outline-none font-bold resize-y"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">Impacto na Saúde / Objetivo:</label>
                  <textarea
                    placeholder="Descreva o impacto na saúde ou o objetivo principal..."
                    value={m6NewDiretriz.objetivo}
                    onChange={(e) => setM6NewDiretriz({ ...m6NewDiretriz, objetivo: e.target.value })}
                    rows={3}
                    className="w-full bg-white border-2 border-slate-300 rounded-lg p-2.5 text-sm text-black focus:border-black focus:outline-none font-bold resize-y"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={m6AddDiretriz}
                  className="px-6 py-3 bg-black hover:bg-slate-800 text-white font-black rounded-lg text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer border border-black flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Diretriz</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border-2 border-slate-300 rounded-xl bg-white shadow-sm">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 uppercase text-xs font-black border-b-2 border-slate-300">
                    <th className="py-4 px-4 text-left border-r border-slate-300 w-1/5">Diretriz / Intervenção</th>
                    <th className="py-4 px-4 text-left border-r border-slate-300 w-1/5">Critério de Ativação</th>
                    <th className="py-4 px-4 text-left border-r border-slate-300 w-1/4">Conduta Pedagógica</th>
                    <th className="py-4 px-4 text-left border-r border-slate-300">Impacto na Saúde / Objetivo</th>
                    <th className="py-4 px-4 text-center w-28">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredM6Diretrizes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 font-bold italic bg-slate-50">
                        Nenhuma diretriz de intervenção encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredM6Diretrizes.map((row) => {
                      const isEditing = m6EditingDiretrizId === row.id;
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-slate-300 hover:bg-slate-50/50 transition-colors"
                        >
                          {isEditing && m6EditingDiretrizData ? (
                            <>
                              <td className="py-4 px-3 align-top border-r border-slate-300">
                                <input
                                  type="text"
                                  className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                                  value={m6EditingDiretrizData.diretriz}
                                  onChange={(e) => setM6EditingDiretrizData({ ...m6EditingDiretrizData, diretriz: e.target.value })}
                                />
                              </td>
                              <td className="py-4 px-3 align-top border-r border-slate-300">
                                <input
                                  type="text"
                                  className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                                  value={m6EditingDiretrizData.criterio}
                                  onChange={(e) => setM6EditingDiretrizData({ ...m6EditingDiretrizData, criterio: e.target.value })}
                                />
                              </td>
                              <td className="py-4 px-3 align-top border-r border-slate-300">
                                <textarea
                                  className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold min-h-[100px] focus:ring-2 focus:ring-blue-600 outline-none resize-y"
                                  value={m6EditingDiretrizData.conduta}
                                  onChange={(e) => setM6EditingDiretrizData({ ...m6EditingDiretrizData, conduta: e.target.value })}
                                />
                              </td>
                              <td className="py-4 px-3 align-top border-r border-slate-300">
                                <textarea
                                  className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold min-h-[100px] focus:ring-2 focus:ring-blue-600 outline-none resize-y"
                                  value={m6EditingDiretrizData.objetivo}
                                  onChange={(e) => setM6EditingDiretrizData({ ...m6EditingDiretrizData, objetivo: e.target.value })}
                                />
                              </td>
                              <td className="py-4 px-3 align-top text-center">
                                <div className="flex flex-col gap-2 justify-center">
                                  <button
                                    onClick={m6SaveEditingDiretriz}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold transition-all shadow-md active:scale-95 border border-green-700"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={m6CancelEditingDiretriz}
                                    className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold transition-all shadow-md active:scale-95 border border-slate-600"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-4 px-4 font-black text-black align-top border-r border-slate-300">
                                <div className="text-sm tracking-tight">{row.diretriz}</div>
                              </td>
                              <td className="py-4 px-4 text-slate-800 font-extrabold text-xs align-top border-r border-slate-300 leading-relaxed">
                                {row.criterio}
                              </td>
                              <td className="py-4 px-4 text-slate-800 font-medium text-xs leading-relaxed text-justify align-top border-r border-slate-300">
                                {row.conduta}
                              </td>
                              <td className="py-4 px-4 text-slate-800 font-medium text-xs leading-relaxed text-justify align-top border-r border-slate-300">
                                {row.objetivo}
                              </td>
                              <td className="py-4 px-3 align-top text-center">
                                <div className="flex flex-col gap-2 justify-center">
                                  <button
                                    onClick={() => m6StartEditingDiretriz(row)}
                                    className="text-blue-700 hover:text-white flex items-center justify-center gap-1 font-bold text-[10px] bg-blue-100 hover:bg-blue-700 px-2 py-1.5 rounded-md transition-all cursor-pointer border border-blue-400"
                                    title="Editar"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    onClick={() => m6DeleteDiretriz(row.id)}
                                    className="text-red-700 hover:text-white flex items-center justify-center gap-1 font-bold text-[10px] bg-red-100 hover:bg-red-700 px-2 py-1.5 rounded-md transition-all cursor-pointer border border-red-400"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Excluir</span>
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão de Modalidade Módulo 6 */}
        {m6ModalityToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-300 w-full max-w-md rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150">
              <h4 className="text-lg font-black text-black uppercase tracking-tight mb-2 flex items-center gap-2 border-b pb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Confirmar Exclusão
              </h4>
              <p className="text-sm text-slate-700 mb-6 leading-relaxed">
                Tem certeza de que deseja excluir permanentemente o direcionamento da modalidade{" "}
                <span className="text-black font-extrabold font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {m6ModalityToDelete.name}
                </span>{" "}
                ({m6ModalityToDelete.condition})? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setM6ModalityToDelete(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-black text-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteM6Modality}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg text-xs shadow-md transition-colors cursor-pointer border border-red-700"
                >
                  Confirmar Excluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão de Diretriz Módulo 6 */}
        {m6DiretrizToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-300 w-full max-w-md rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150">
              <h4 className="text-lg font-black text-black uppercase tracking-tight mb-2 flex items-center gap-2 border-b pb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Confirmar Exclusão
              </h4>
              <p className="text-sm text-slate-700 mb-6 leading-relaxed">
                Tem certeza de que deseja excluir permanentemente a diretriz{" "}
                <span className="text-black font-extrabold font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {m6DiretrizToDelete.diretriz}
                </span>{" "}
                ? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setM6DiretrizToDelete(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-black text-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteM6Diretriz}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg text-xs shadow-md transition-colors cursor-pointer border border-red-700"
                >
                  Confirmar Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const addVocQuestion = async () => {
    if (!vocNew.statement.trim() || !vocNew.optionA.trim() || !vocNew.optionB.trim() || !vocNew.optionC.trim() || !vocNew.optionD.trim()) {
      alert("Preencha a pergunta e as 4 alternativas.");
      return;
    }
    const nextOrd = vocQuestions.reduce((m, q) => Math.max(m, q.ord || 0), 0) + 1;
    const newQ: VocQuestion = {
      id: (await nextVocQuestionId()) || ("q" + uuid().slice(0, 8)),
      ord: nextOrd,
      statement: vocNew.statement.trim(),
      optionA: vocNew.optionA.trim(),
      optionB: vocNew.optionB.trim(),
      optionC: vocNew.optionC.trim(),
      optionD: vocNew.optionD.trim(),
    };
    setVocQuestions([...vocQuestions, newQ]);
    setVocNew({ statement: "", optionA: "", optionB: "", optionC: "", optionD: "" });
    setSuccessMessage("Pergunta adicionada com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const startVocEdit = (row: VocQuestion) => { setVocEditingId(row.id); setVocEditData({ ...row }); };
  const cancelVocEdit = () => { setVocEditingId(null); setVocEditData(null); };
  const saveVocEdit = () => {
    if (!vocEditData) return;
    if (!vocEditData.statement.trim() || !vocEditData.optionA.trim() || !vocEditData.optionB.trim() || !vocEditData.optionC.trim() || !vocEditData.optionD.trim()) {
      alert("Preencha a pergunta e as 4 alternativas.");
      return;
    }
    setVocQuestions(vocQuestions.map(q => q.id === vocEditData.id ? vocEditData : q));
    setVocEditingId(null);
    setVocEditData(null);
    setSuccessMessage("Pergunta atualizada com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };
  const confirmDeleteVoc = () => {
    if (!vocToDelete) return;
    const deletedId = vocToDelete.id;
    setVocQuestions(vocQuestions.filter(q => q.id !== deletedId));
    setVocToDelete(null);
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        supabase.from("voc_questions").delete().eq("id", deletedId).then(({ error }) => {
          if (error) console.error("Error deleting voc_questions row:", error);
        });
      }
    }
    setSuccessMessage("Pergunta removida com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  if (activeTab === "questionario-m8") {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md border border-slate-300">
        <h1 className="text-2xl font-black mb-6 text-black tracking-tight border-b pb-3">Módulo 8: Perguntas do Questionário Vocacional</h1>

        <div className="mb-8 p-6 bg-white border-4 border-black rounded-xl space-y-4 shadow-md">
          <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2">Adicionar nova pergunta</h3>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-black uppercase tracking-wider">Pergunta</label>
            <input type="text" placeholder="Ex: Em um trabalho de grupo, você prefere:" className="p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-black focus:ring-2 focus:ring-black outline-none" value={vocNew.statement} onChange={e => setVocNew({ ...vocNew, statement: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5"><label className="text-xs font-black text-black uppercase tracking-wider">Alternativa A (Humanas)</label><input type="text" className="p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-bold focus:ring-2 focus:ring-black outline-none" value={vocNew.optionA} onChange={e => setVocNew({ ...vocNew, optionA: e.target.value })} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-xs font-black text-black uppercase tracking-wider">Alternativa B (Exatas)</label><input type="text" className="p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-bold focus:ring-2 focus:ring-black outline-none" value={vocNew.optionB} onChange={e => setVocNew({ ...vocNew, optionB: e.target.value })} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-xs font-black text-black uppercase tracking-wider">Alternativa C (Biológicas)</label><input type="text" className="p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-bold focus:ring-2 focus:ring-black outline-none" value={vocNew.optionC} onChange={e => setVocNew({ ...vocNew, optionC: e.target.value })} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-xs font-black text-black uppercase tracking-wider">Alternativa D (Negócios)</label><input type="text" className="p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-bold focus:ring-2 focus:ring-black outline-none" value={vocNew.optionD} onChange={e => setVocNew({ ...vocNew, optionD: e.target.value })} /></div>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={addVocQuestion} className="bg-black hover:bg-slate-900 text-white px-8 py-3.5 rounded-lg text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer border border-black uppercase tracking-wide">Adicionar Pergunta</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-300 min-w-[640px]">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-400 text-sm font-black text-black">
                <th className="py-3 px-3 w-[5%] border-r border-slate-300">#</th>
                <th className="py-3 px-3 w-[35%] border-r border-slate-300">Pergunta</th>
                <th className="py-3 px-3 border-r border-slate-300">Alternativas (A/B/C/D)</th>
                <th className="py-3 px-3 w-[15%] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-sm text-black">
              {vocQuestions.map(q => {
                const isEditing = vocEditingId === q.id;
                return (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors align-top">
                    {isEditing && vocEditData ? (
                      <>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold align-top">{q.ord}</td>
                        <td className="py-4 px-3 border-r border-slate-300" colSpan={2}>
                          <input type="text" className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" value={vocEditData.statement} onChange={e => setVocEditData({ ...vocEditData, statement: e.target.value })} />
                          <div className="grid grid-cols-1 gap-1 mt-2">
                            <input type="text" placeholder="A" className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" value={vocEditData.optionA} onChange={e => setVocEditData({ ...vocEditData, optionA: e.target.value })} />
                            <input type="text" placeholder="B" className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" value={vocEditData.optionB} onChange={e => setVocEditData({ ...vocEditData, optionB: e.target.value })} />
                            <input type="text" placeholder="C" className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" value={vocEditData.optionC} onChange={e => setVocEditData({ ...vocEditData, optionC: e.target.value })} />
                            <input type="text" placeholder="D" className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" value={vocEditData.optionD} onChange={e => setVocEditData({ ...vocEditData, optionD: e.target.value })} />
                          </div>
                        </td>
                        <td className="py-4 px-3 text-right align-top">
                          <div className="flex flex-col sm:flex-row gap-2 justify-end">
                            <button onClick={saveVocEdit} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold border border-green-700">Salvar</button>
                            <button onClick={cancelVocEdit} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold border border-slate-600">Cancelar</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold align-top">{q.ord}</td>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold text-black align-top">{q.statement}</td>
                        <td className="py-4 px-3 border-r border-slate-300 text-xs text-slate-800 align-top space-y-0.5">
                          <div><span className="font-black">A)</span> {q.optionA}</div>
                          <div><span className="font-black">B)</span> {q.optionB}</div>
                          <div><span className="font-black">C)</span> {q.optionC}</div>
                          <div><span className="font-black">D)</span> {q.optionD}</div>
                        </td>
                        <td className="py-4 px-3 text-right align-top">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => startVocEdit(q)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400">Editar</button>
                            <button onClick={() => setVocToDelete(q)} className="text-rose-700 hover:text-white font-bold text-xs bg-rose-100 hover:bg-rose-700 px-3 py-2 rounded-md border border-rose-400">Excluir</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {vocToDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 space-y-4">
              <h4 className="text-lg font-black text-black">Excluir pergunta?</h4>
              <p className="text-sm text-slate-700">Tem certeza que deseja excluir a pergunta <strong>&quot;{vocToDelete.statement}&quot;</strong>? Esta ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setVocToDelete(null)} className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-200 text-slate-800">Cancelar</button>
                <button onClick={confirmDeleteVoc} className="px-4 py-2 rounded-lg text-sm font-bold bg-rose-600 text-white">Excluir</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const addHealthQuestion = async () => {
    if (!healthNew.statement.trim()) {
      alert("Preencha o enunciado da pergunta.");
      return;
    }
    const nextOrd = healthQuestions.reduce((m, q) => Math.max(m, q.ord || 0), 0) + 1;
    const newQ: HealthQuestion = {
      id: (await nextM9HealthQuestionId()) || ("hq" + uuid().slice(0, 8)),
      ord: nextOrd,
      statement: healthNew.statement.trim(),
      reversed: healthNew.reversed,
    };
    setHealthQuestions([...healthQuestions, newQ]);
    setHealthNew({ statement: "", reversed: false });
    setSuccessMessage("Pergunta adicionada com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const startHealthEdit = (row: HealthQuestion) => { setHealthEditingId(row.id); setHealthEditData({ ...row }); };
  const cancelHealthEdit = () => { setHealthEditingId(null); setHealthEditData(null); };
  const saveHealthEdit = () => {
    if (!healthEditData) return;
    if (!healthEditData.statement.trim()) {
      alert("Preencha o enunciado da pergunta.");
      return;
    }
    setHealthQuestions(healthQuestions.map(q => q.id === healthEditData.id ? healthEditData : q));
    setHealthEditingId(null);
    setHealthEditData(null);
    setSuccessMessage("Pergunta atualizada com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };
  const confirmDeleteHealth = () => {
    if (!healthToDelete) return;
    const deletedId = healthToDelete.id;
    setHealthQuestions(healthQuestions.filter(q => q.id !== deletedId));
    setHealthToDelete(null);
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        supabase.from("m9_health_questions").delete().eq("id", deletedId).then(({ error }) => {
          if (error) console.error("Error deleting m9_health_questions row:", error?.message ?? error);
        });
      }
    }
    setSuccessMessage("Pergunta removida com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const startM9ParecerEdit = (classification: string) => {
    const existing = m9Pareceres.find(p => p.classification === classification);
    setM9ParecerEditingId(classification);
    setM9ParecerEditData({
      id: existing?.id ?? "",
      classification,
      basicData: existing?.basicData ?? "",
      reflection: existing?.reflection ?? "",
    });
  };
  const cancelM9ParecerEdit = () => { setM9ParecerEditingId(null); setM9ParecerEditData(null); };
  const saveM9ParecerEdit = async () => {
    if (!m9ParecerEditData) return;
    const row: M9Parecer = {
      id: m9ParecerEditData.id || (await nextM9ParecerId()) || ("m9p_" + uuid().slice(0, 8)),
      classification: m9ParecerEditData.classification,
      basicData: m9ParecerEditData.basicData,
      reflection: m9ParecerEditData.reflection,
    };
    setM9Pareceres(
      m9Pareceres.some(p => p.classification === row.classification)
        ? m9Pareceres.map(p => p.classification === row.classification ? row : p)
        : [...m9Pareceres, row]
    );
    setM9ParecerEditingId(null);
    setM9ParecerEditData(null);
    setSuccessMessage("Parecer atualizado com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const oralRuleLabel = (r: OralScoringRule) =>
    r === 'agree' ? 'Pontua se Concordo' : r === 'disagree' ? 'Pontua se Discordo' : 'Não pontua';

  const addOralQuestion = async () => {
    if (!oralNew.statement.trim()) {
      alert("Preencha o enunciado da afirmação.");
      return;
    }
    const nextOrd = oralQuestions.reduce((m, q) => Math.max(m, q.ord || 0), 0) + 1;
    const newQ: OralQuestion = {
      id: (await nextM10OralQuestionId()) || ("oq" + uuid().slice(0, 8)),
      ord: nextOrd,
      statement: oralNew.statement.trim(),
      scoringRule: oralNew.scoringRule,
    };
    setOralQuestions([...oralQuestions, newQ]);
    setOralNew({ statement: "", scoringRule: "none" });
    setSuccessMessage("Afirmação adicionada com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const startOralEdit = (row: OralQuestion) => { setOralEditingId(row.id); setOralEditData({ ...row }); };
  const cancelOralEdit = () => { setOralEditingId(null); setOralEditData(null); };
  const saveOralEdit = () => {
    if (!oralEditData) return;
    if (!oralEditData.statement.trim()) {
      alert("Preencha o enunciado da afirmação.");
      return;
    }
    setOralQuestions(oralQuestions.map(q => q.id === oralEditData.id ? oralEditData : q));
    setOralEditingId(null);
    setOralEditData(null);
    setSuccessMessage("Afirmação atualizada com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };
  const confirmDeleteOral = () => {
    if (!oralToDelete) return;
    const deletedId = oralToDelete.id;
    setOralQuestions(oralQuestions.filter(q => q.id !== deletedId));
    setOralToDelete(null);
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        supabase.from("m10_oral_questions").delete().eq("id", deletedId).then(({ error }) => {
          if (error) console.error("Error deleting m10_oral_questions row:", error?.message ?? error);
        });
      }
    }
    setSuccessMessage("Afirmação removida com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const startM10ParecerEdit = (classification: string) => {
    const existing = m10Pareceres.find(p => p.classification === classification);
    setM10ParecerEditingId(classification);
    setM10ParecerEditData({
      id: existing?.id ?? "",
      classification,
      basicData: existing?.basicData ?? "",
      reflection: existing?.reflection ?? "",
    });
  };
  const cancelM10ParecerEdit = () => { setM10ParecerEditingId(null); setM10ParecerEditData(null); };
  const saveM10ParecerEdit = async () => {
    if (!m10ParecerEditData) return;
    const row: M10Parecer = {
      id: m10ParecerEditData.id || (await nextM10ParecerId()) || ("m10p_" + uuid().slice(0, 8)),
      classification: m10ParecerEditData.classification,
      basicData: m10ParecerEditData.basicData,
      reflection: m10ParecerEditData.reflection,
    };
    setM10Pareceres(
      m10Pareceres.some(p => p.classification === row.classification)
        ? m10Pareceres.map(p => p.classification === row.classification ? row : p)
        : [...m10Pareceres, row]
    );
    setM10ParecerEditingId(null);
    setM10ParecerEditData(null);
    setSuccessMessage("Parecer atualizado com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const addAutoQuestion = async () => {
    if (!autoNew.statement.trim()) {
      alert("Preencha a afirmação.");
      return;
    }
    const nextOrd = autoQuestions.reduce((m, q) => Math.max(m, q.ord || 0), 0) + 1;
    const newQ: AutoconceptQuestion = {
      id: (await nextM11AutoQuestionId()) || ("aq" + uuid().slice(0, 8)),
      ord: nextOrd,
      statement: autoNew.statement.trim(),
      itemType: autoNew.itemType,
    };
    setAutoQuestions([...autoQuestions, newQ]);
    setAutoNew({ statement: "", itemType: "positive" });
    setSuccessMessage("Afirmação adicionada com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const startAutoEdit = (row: AutoconceptQuestion) => { setAutoEditingId(row.id); setAutoEditData({ ...row }); };
  const cancelAutoEdit = () => { setAutoEditingId(null); setAutoEditData(null); };
  const saveAutoEdit = () => {
    if (!autoEditData) return;
    if (!autoEditData.statement.trim()) {
      alert("Preencha a afirmação.");
      return;
    }
    setAutoQuestions(autoQuestions.map(q => q.id === autoEditData.id ? autoEditData : q));
    setAutoEditingId(null);
    setAutoEditData(null);
    setSuccessMessage("Afirmação atualizada com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };
  const confirmDeleteAuto = () => {
    if (!autoToDelete) return;
    const deletedId = autoToDelete.id;
    setAutoQuestions(autoQuestions.filter(q => q.id !== deletedId));
    setAutoToDelete(null);
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        supabase.from("m11_autoconcept_questions").delete().eq("id", deletedId).then(({ error }) => {
          if (error) console.error("Error deleting m11_autoconcept_questions row:", error?.message ?? error);
        });
      }
    }
    setSuccessMessage("Afirmação removida com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const startM11ParecerEdit = (classification: string) => {
    const existing = m11Pareceres.find(p => p.classification === classification);
    setM11ParecerEditingId(classification);
    setM11ParecerEditData({
      id: existing?.id ?? "",
      classification,
      basicData: existing?.basicData ?? "",
      reflection: existing?.reflection ?? "",
    });
  };
  const cancelM11ParecerEdit = () => { setM11ParecerEditingId(null); setM11ParecerEditData(null); };
  const saveM11ParecerEdit = async () => {
    if (!m11ParecerEditData) return;
    const row: M11Parecer = {
      id: m11ParecerEditData.id || (await nextM11ParecerId()) || ("m11p_" + uuid().slice(0, 8)),
      classification: m11ParecerEditData.classification,
      basicData: m11ParecerEditData.basicData,
      reflection: m11ParecerEditData.reflection,
    };
    setM11Pareceres(
      m11Pareceres.some(p => p.classification === row.classification)
        ? m11Pareceres.map(p => p.classification === row.classification ? row : p)
        : [...m11Pareceres, row]
    );
    setM11ParecerEditingId(null);
    setM11ParecerEditData(null);
    setSuccessMessage("Parecer atualizado com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const addIasQuestion = async () => {
    if (!iasNew.statement.trim() || !iasNew.option1Text.trim() || !iasNew.option2Text.trim() || !iasNew.option3Text.trim()) {
      alert("Preencha o componente e as 3 opções.");
      return;
    }
    const nextOrd = iasQuestions.reduce((m, q) => Math.max(m, q.ord || 0), 0) + 1;
    const newQ: IasQuestion = {
      id: (await nextIasQuestionId()) || ("iq" + uuid().slice(0, 8)),
      ord: nextOrd,
      statement: iasNew.statement.trim(),
      option1Text: iasNew.option1Text.trim(), option1Points: iasNew.option1Points,
      option2Text: iasNew.option2Text.trim(), option2Points: iasNew.option2Points,
      option3Text: iasNew.option3Text.trim(), option3Points: iasNew.option3Points,
    };
    setIasQuestions([...iasQuestions, newQ]);
    setIasNew({ statement: "", option1Text: "", option1Points: 0, option2Text: "", option2Points: 0, option3Text: "", option3Points: 0 });
    setSuccessMessage("Componente adicionado com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const startIasEdit = (row: IasQuestion) => { setIasEditingId(row.id); setIasEditData({ ...row }); };
  const cancelIasEdit = () => { setIasEditingId(null); setIasEditData(null); };
  const saveIasEdit = () => {
    if (!iasEditData) return;
    if (!iasEditData.statement.trim() || !iasEditData.option1Text.trim() || !iasEditData.option2Text.trim() || !iasEditData.option3Text.trim()) {
      alert("Preencha o componente e as 3 opções.");
      return;
    }
    setIasQuestions(iasQuestions.map(q => q.id === iasEditData.id ? iasEditData : q));
    setIasEditingId(null);
    setIasEditData(null);
    setSuccessMessage("Componente atualizado com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };
  const confirmDeleteIas = () => {
    if (!iasToDelete) return;
    const deletedId = iasToDelete.id;
    setIasQuestions(iasQuestions.filter(q => q.id !== deletedId));
    setIasToDelete(null);
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        supabase.from("ias_questions").delete().eq("id", deletedId).then(({ error }) => {
          if (error) console.error("Error deleting ias_questions row:", error?.message ?? error);
        });
      }
    }
    setSuccessMessage("Componente removido com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const startM12ParecerEdit = (classification: string) => {
    const existing = m12Pareceres.find(p => p.classification === classification);
    setM12ParecerEditingId(classification);
    setM12ParecerEditData({
      id: existing?.id ?? "",
      classification,
      basicData: existing?.basicData ?? "",
      reflection: existing?.reflection ?? "",
    });
  };
  const cancelM12ParecerEdit = () => { setM12ParecerEditingId(null); setM12ParecerEditData(null); };
  const saveM12ParecerEdit = async () => {
    if (!m12ParecerEditData) return;
    const row: M12Parecer = {
      id: m12ParecerEditData.id || (await nextM12ParecerId()) || ("m12p_" + uuid().slice(0, 8)),
      classification: m12ParecerEditData.classification,
      basicData: m12ParecerEditData.basicData,
      reflection: m12ParecerEditData.reflection,
    };
    setM12Pareceres(
      m12Pareceres.some(p => p.classification === row.classification)
        ? m12Pareceres.map(p => p.classification === row.classification ? row : p)
        : [...m12Pareceres, row]
    );
    setM12ParecerEditingId(null);
    setM12ParecerEditData(null);
    setSuccessMessage("Parecer atualizado com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const addSnapQuestion = async () => {
    if (!snapNew.statement.trim()) {
      alert("Preencha o item de comportamento.");
      return;
    }
    const nextOrd = snapQuestions.reduce((m, q) => Math.max(m, q.ord || 0), 0) + 1;
    const newQ: SnapQuestion = {
      id: (await nextM13SnapQuestionId()) || ("sq" + uuid().slice(0, 8)),
      ord: nextOrd,
      statement: snapNew.statement.trim(),
      subscale: snapNew.subscale,
    };
    setSnapQuestions([...snapQuestions, newQ]);
    setSnapNew({ statement: "", subscale: "inattention" });
    setSuccessMessage("Item adicionado com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const startSnapEdit = (row: SnapQuestion) => { setSnapEditingId(row.id); setSnapEditData({ ...row }); };
  const cancelSnapEdit = () => { setSnapEditingId(null); setSnapEditData(null); };
  const saveSnapEdit = () => {
    if (!snapEditData) return;
    if (!snapEditData.statement.trim()) {
      alert("Preencha o item de comportamento.");
      return;
    }
    setSnapQuestions(snapQuestions.map(q => q.id === snapEditData.id ? snapEditData : q));
    setSnapEditingId(null);
    setSnapEditData(null);
    setSuccessMessage("Item atualizado com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };
  const confirmDeleteSnap = () => {
    if (!snapToDelete) return;
    const deletedId = snapToDelete.id;
    setSnapQuestions(snapQuestions.filter(q => q.id !== deletedId));
    setSnapToDelete(null);
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        supabase.from("m13_snap_questions").delete().eq("id", deletedId).then(({ error }) => {
          if (error) console.error("Error deleting m13_snap_questions row:", error?.message ?? error);
        });
      }
    }
    setSuccessMessage("Item removido com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const startM13ParecerEdit = (classification: string) => {
    const existing = m13Pareceres.find(p => p.classification === classification);
    setM13ParecerEditingId(classification);
    setM13ParecerEditData({
      id: existing?.id ?? "",
      classification,
      basicData: existing?.basicData ?? "",
      reflection: existing?.reflection ?? "",
    });
  };
  const cancelM13ParecerEdit = () => { setM13ParecerEditingId(null); setM13ParecerEditData(null); };
  const saveM13ParecerEdit = async () => {
    if (!m13ParecerEditData) return;
    const row: M13Parecer = {
      id: m13ParecerEditData.id || (await nextM13ParecerId()) || ("m13p_" + uuid().slice(0, 8)),
      classification: m13ParecerEditData.classification,
      basicData: m13ParecerEditData.basicData,
      reflection: m13ParecerEditData.reflection,
    };
    setM13Pareceres(
      m13Pareceres.some(p => p.classification === row.classification)
        ? m13Pareceres.map(p => p.classification === row.classification ? row : p)
        : [...m13Pareceres, row]
    );
    setM13ParecerEditingId(null);
    setM13ParecerEditData(null);
    setSuccessMessage("Parecer atualizado com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const addAq10Question = async () => {
    if (!aq10New.statement.trim()) {
      alert("Preencha o item do questionário.");
      return;
    }
    const nextOrd = aq10Questions.filter(q => q.version === aq10New.version).reduce((m, q) => Math.max(m, q.ord || 0), 0) + 1;
    const newQ: Aq10Question = {
      id: (await nextM14Aq10QuestionId()) || ("aq10q" + uuid().slice(0, 8)),
      ord: nextOrd,
      statement: aq10New.statement.trim(),
      version: aq10New.version,
    };
    setAq10Questions([...aq10Questions, newQ]);
    setAq10New({ statement: "", version: aq10New.version });
    setSuccessMessage("Item adicionado com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const startAq10Edit = (row: Aq10Question) => { setAq10EditingId(row.id); setAq10EditData({ ...row }); };
  const cancelAq10Edit = () => { setAq10EditingId(null); setAq10EditData(null); };
  const saveAq10Edit = () => {
    if (!aq10EditData) return;
    if (!aq10EditData.statement.trim()) {
      alert("Preencha o item do questionário.");
      return;
    }
    setAq10Questions(aq10Questions.map(q => q.id === aq10EditData.id ? aq10EditData : q));
    setAq10EditingId(null);
    setAq10EditData(null);
    setSuccessMessage("Item atualizado com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };
  const confirmDeleteAq10 = () => {
    if (!aq10ToDelete) return;
    const deletedId = aq10ToDelete.id;
    setAq10Questions(aq10Questions.filter(q => q.id !== deletedId));
    setAq10ToDelete(null);
    if (isSupabaseConfigured) {
      const supabase = getDb();
      if (supabase) {
        supabase.from("m14_aq10_questions").delete().eq("id", deletedId).then(({ error }) => {
          if (error) console.error("Error deleting m14_aq10_questions row:", error?.message ?? error);
        });
      }
    }
    setSuccessMessage("Item removido com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const startM14ParecerEdit = (classification: string) => {
    const existing = m14Pareceres.find(p => p.classification === classification);
    setM14ParecerEditingId(classification);
    setM14ParecerEditData({
      id: existing?.id ?? "",
      classification,
      basicData: existing?.basicData ?? "",
      reflection: existing?.reflection ?? "",
    });
  };
  const cancelM14ParecerEdit = () => { setM14ParecerEditingId(null); setM14ParecerEditData(null); };
  const saveM14ParecerEdit = async () => {
    if (!m14ParecerEditData) return;
    const row: M14Parecer = {
      id: m14ParecerEditData.id || (await nextM14ParecerId()) || ("m14p_" + uuid().slice(0, 8)),
      classification: m14ParecerEditData.classification,
      basicData: m14ParecerEditData.basicData,
      reflection: m14ParecerEditData.reflection,
    };
    setM14Pareceres(
      m14Pareceres.some(p => p.classification === row.classification)
        ? m14Pareceres.map(p => p.classification === row.classification ? row : p)
        : [...m14Pareceres, row]
    );
    setM14ParecerEditingId(null);
    setM14ParecerEditData(null);
    setSuccessMessage("Parecer atualizado com sucesso!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  if (activeTab === "questionario-m12") {
    const pointInputCls = "w-16 p-2 border-2 border-slate-500 bg-white text-black rounded text-sm font-bold focus:ring-2 focus:ring-blue-600 outline-none";
    const textInputCls = "p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-bold focus:ring-2 focus:ring-black outline-none";
    const renderIasForm = (
      data: { statement: string; option1Text: string; option1Points: number; option2Text: string; option2Points: number; option3Text: string; option3Points: number },
      patch: (p: Partial<typeof data>) => void
    ) => (
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-black uppercase tracking-wider">Componente / Afirmação</label>
          <input type="text" className={textInputCls} placeholder="Ex: Frutas Totais (incluindo sucos naturais)" value={data.statement} onChange={e => patch({ statement: e.target.value })} />
        </div>
        {[
          { n: 1, text: `option${1}Text` as const, pts: `option${1}Points` as const },
          { n: 2, text: `option${2}Text` as const, pts: `option${2}Points` as const },
          { n: 3, text: `option${3}Text` as const, pts: `option${3}Points` as const },
        ].map(o => (
          <div key={o.n} className="flex gap-2 items-center">
            <input type="text" className={textInputCls} placeholder={`Opção ${o.n}: texto da resposta`} value={data[o.text]} onChange={e => patch({ [o.text]: e.target.value } as Partial<typeof data>)} />
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-black text-black uppercase">Pts</label>
              <input type="number" className={pointInputCls} value={data[o.pts]} onChange={e => patch({ [o.pts]: Number(e.target.value) || 0 } as Partial<typeof data>)} />
            </div>
          </div>
        ))}
      </div>
    );

    return (
      <div className="p-6 bg-white rounded-xl shadow-md border border-slate-300">
        <h1 className="text-2xl font-black mb-6 text-black tracking-tight border-b pb-3">Módulo 12: Índice de Alimentação Saudável (IAS)</h1>

        <div className="mb-8 p-6 bg-white border-4 border-black rounded-xl space-y-4 shadow-md">
          <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2">Adicionar novo componente</h3>
          {renderIasForm(iasNew, (p) => setIasNew(prev => ({ ...prev, ...p })))}
          <div className="flex justify-end pt-2">
            <button onClick={addIasQuestion} className="bg-black hover:bg-slate-900 text-white px-8 py-3.5 rounded-lg text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer border border-black uppercase tracking-wide">Adicionar Componente</button>
          </div>
        </div>

        <div className="overflow-x-auto mb-10">
          <table className="w-full text-left border-collapse border border-slate-300 min-w-[640px]">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-400 text-sm font-black text-black">
                <th className="py-3 px-3 w-[5%] border-r border-slate-300">#</th>
                <th className="py-3 px-3 w-[30%] border-r border-slate-300">Componente</th>
                <th className="py-3 px-3 border-r border-slate-300">Opções (pontuação)</th>
                <th className="py-3 px-3 w-[15%] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-sm text-black">
              {iasQuestions.map(q => {
                const isEditing = iasEditingId === q.id;
                return (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors align-top">
                    {isEditing && iasEditData ? (
                      <>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold align-top">{q.ord}</td>
                        <td className="py-4 px-3 border-r border-slate-300" colSpan={2}>
                          {renderIasForm(iasEditData, (p) => setIasEditData(prev => prev ? { ...prev, ...p } : prev))}
                        </td>
                        <td className="py-4 px-3 text-right align-top">
                          <div className="flex flex-col sm:flex-row gap-2 justify-end">
                            <button onClick={saveIasEdit} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold border border-green-700">Salvar</button>
                            <button onClick={cancelIasEdit} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold border border-slate-600">Cancelar</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold align-top">{q.ord}</td>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold text-black align-top">{q.statement}</td>
                        <td className="py-4 px-3 border-r border-slate-300 text-xs text-slate-800 align-top space-y-0.5">
                          <div>• {q.option1Text} <span className="font-black text-emerald-700">({q.option1Points} pts)</span></div>
                          <div>• {q.option2Text} <span className="font-black text-emerald-700">({q.option2Points} pts)</span></div>
                          <div>• {q.option3Text} <span className="font-black text-emerald-700">({q.option3Points} pts)</span></div>
                        </td>
                        <td className="py-4 px-3 text-right align-top">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => startIasEdit(q)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400">Editar</button>
                            <button onClick={() => setIasToDelete(q)} className="text-rose-700 hover:text-white font-bold text-xs bg-rose-100 hover:bg-rose-700 px-3 py-2 rounded-md border border-rose-400">Excluir</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mb-4">
          <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2 mb-4">Parecer por faixa de qualidade (editável)</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {IAS_CLASSIFICATIONS.map(cls => {
              const existing = m12Pareceres.find(p => p.classification === cls);
              const isEditing = m12ParecerEditingId === cls;
              return (
                <div key={cls} className="border-2 border-slate-300 rounded-xl p-4 bg-slate-50">
                  <h4 className="font-black text-sm text-black mb-2">{cls}</h4>
                  {isEditing && m12ParecerEditData ? (
                    <div className="space-y-2">
                      <textarea className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" rows={2} placeholder="Dados básicos (faixa de pontos)" value={m12ParecerEditData.basicData} onChange={e => setM12ParecerEditData({ ...m12ParecerEditData, basicData: e.target.value })} />
                      <textarea className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" rows={5} placeholder="Reflexão / recomendação" value={m12ParecerEditData.reflection} onChange={e => setM12ParecerEditData({ ...m12ParecerEditData, reflection: e.target.value })} />
                      <div className="flex gap-2 justify-end">
                        <button onClick={saveM12ParecerEdit} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold border border-green-700">Salvar</button>
                        <button onClick={cancelM12ParecerEdit} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold border border-slate-600">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-800"><span className="font-black">Faixa:</span> {existing?.basicData || "—"}</p>
                      <p className="text-xs text-slate-800"><span className="font-black">Parecer:</span> {existing?.reflection || "—"}</p>
                      <div className="flex justify-end">
                        <button onClick={() => startM12ParecerEdit(cls)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400">Editar</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {iasToDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 space-y-4">
              <h4 className="text-lg font-black text-black">Excluir componente?</h4>
              <p className="text-sm text-slate-700">Tem certeza que deseja excluir o componente <strong>&quot;{iasToDelete.statement}&quot;</strong>? Esta ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIasToDelete(null)} className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-200 text-slate-800">Cancelar</button>
                <button onClick={confirmDeleteIas} className="px-4 py-2 rounded-lg text-sm font-bold bg-rose-600 text-white">Excluir</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "questionario-m14") {
    const textInputCls = "p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-bold focus:ring-2 focus:ring-black outline-none";
    const selectInputCls = "p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-bold focus:ring-2 focus:ring-black outline-none";
    const versionLabel = (v: Aq10Version) => (v === "crianca" ? "Criança (4-11)" : "Adolescente (12-15)");
    const renderAq10Form = (
      data: { statement: string; version: Aq10Version },
      patch: (p: Partial<typeof data>) => void
    ) => (
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-xs font-black text-black uppercase tracking-wider">Item do questionário</label>
          <input type="text" className={textInputCls} placeholder="Ex: Ele(a) sempre percebe padrões/categorias nas coisas." value={data.statement} onChange={e => patch({ statement: e.target.value })} />
        </div>
        <div className="sm:w-80 flex flex-col gap-1.5">
          <label className="text-xs font-black text-black uppercase tracking-wider">Versão</label>
          <select className={selectInputCls} value={data.version} onChange={e => patch({ version: e.target.value as Aq10Version })}>
            <option value="crianca">Criança (4-11)</option>
            <option value="adolescente">Adolescente (12-15)</option>
          </select>
        </div>
      </div>
    );

    return (
      <div className="p-6 bg-white rounded-xl shadow-md border border-slate-300">
        <h1 className="text-2xl font-black mb-6 text-black tracking-tight border-b pb-3">Módulo 14: AQ-10 — Rastreamento Precoce do Transtorno do Espectro Autista (TEA)</h1>

        <div className="mb-8 p-6 bg-sky-50 border-2 border-sky-300 rounded-xl space-y-2 text-sm text-slate-800">
          <p><span className="font-black">O que é:</span> o Quociente do Espectro Autista (AQ-10) é um questionário de triagem desenvolvido pelo Autism Research Centre (Universidade de Cambridge — Simon Baron-Cohen e colaboradores) para identificação precoce de traços de TEA em crianças e adolescentes, respondido por pais ou responsáveis (relato por terceiros).</p>
          <p><span className="font-black">Formato:</span> duas versões — Criança (4 a 11 anos) e Adolescente (12 a 15 anos) — cada uma com 10 itens em escala de 4 pontos.</p>
          <p><span className="font-black">Escala de resposta:</span> {AQ10_LIKERT_LABELS.join(" · ")}.</p>
          <p><span className="font-black">Pontuação (chave SUBPAV/SMS-RJ):</span> soma 1 ponto para “Concordo Totalmente” ou “Concordo em Parte” nos itens 1, 5, 7 e 10; soma 1 ponto para “Discordo em Parte” ou “Discordo Totalmente” nos itens 2, 3, 4, 6, 8 e 9. Total de 0 a 10.</p>
          <p><span className="font-black">Interpretação:</span> de 0 a {AQ10_ALERT_FROM - 1} pontos indicam traços comportamentais dentro da média da população geral; de {AQ10_ALERT_FROM} a 10 pontos indicam alerta de traços elevados de TEA, com encaminhamento prioritário para avaliação multidisciplinar especializada.</p>
          <p className="text-xs font-bold text-rose-700">⚠️ ALERTA: o AQ-10 é exclusivamente uma ferramenta de RASTREAMENTO (triagem) e NÃO constitui diagnóstico. O diagnóstico formal de TEA exige avaliação clínica multidisciplinar por profissionais de saúde habilitados.</p>
        </div>

        <div className="mb-8 p-6 bg-white border-4 border-black rounded-xl space-y-4 shadow-md">
          <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2">Adicionar novo item</h3>
          {renderAq10Form(aq10New, (p) => setAq10New(prev => ({ ...prev, ...p })))}
          <div className="flex justify-end pt-2">
            <button onClick={addAq10Question} className="bg-black hover:bg-slate-900 text-white px-8 py-3.5 rounded-lg text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer border border-black uppercase tracking-wide">Adicionar Item</button>
          </div>
        </div>

        <div className="overflow-x-auto mb-10">
          <table className="w-full text-left border-collapse border border-slate-300 min-w-[640px]">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-400 text-sm font-black text-black">
                <th className="py-3 px-3 w-[6%] border-r border-slate-300">#</th>
                <th className="py-3 px-3 border-r border-slate-300">Item de avaliação comportamental</th>
                <th className="py-3 px-3 w-[28%] border-r border-slate-300">Versão</th>
                <th className="py-3 px-3 w-[15%] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-sm text-black">
              {aq10Questions.map(q => {
                const isEditing = aq10EditingId === q.id;
                return (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors align-top">
                    {isEditing && aq10EditData ? (
                      <>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold align-top">{q.ord}</td>
                        <td className="py-4 px-3 border-r border-slate-300" colSpan={2}>
                          {renderAq10Form(aq10EditData, (p) => setAq10EditData(prev => prev ? { ...prev, ...p } : prev))}
                        </td>
                        <td className="py-4 px-3 text-right align-top">
                          <div className="flex flex-col sm:flex-row gap-2 justify-end">
                            <button onClick={saveAq10Edit} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold border border-green-700">Salvar</button>
                            <button onClick={cancelAq10Edit} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold border border-slate-600">Cancelar</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold align-top">{q.ord}</td>
                        <td className="py-4 px-3 border-r border-slate-300 text-black align-top">{q.statement}</td>
                        <td className="py-4 px-3 border-r border-slate-300 text-xs align-top">
                          <span className={`inline-block px-2 py-1 rounded font-black ${q.version === "crianca" ? "bg-sky-100 text-sky-800" : "bg-fuchsia-100 text-fuchsia-800"}`}>{versionLabel(q.version)}</span>
                        </td>
                        <td className="py-4 px-3 text-right align-top">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => startAq10Edit(q)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400">Editar</button>
                            <button onClick={() => setAq10ToDelete(q)} className="text-rose-700 hover:text-white font-bold text-xs bg-rose-100 hover:bg-rose-700 px-3 py-2 rounded-md border border-rose-400">Excluir</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mb-4">
          <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2 mb-4">Parecer por resultado do rastreamento (editável)</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {AQ10_CLASSIFICATIONS.map(cls => {
              const existing = m14Pareceres.find(p => p.classification === cls);
              const isEditing = m14ParecerEditingId === cls;
              return (
                <div key={cls} className="border-2 border-slate-300 rounded-xl p-4 bg-slate-50">
                  <h4 className="font-black text-sm text-black mb-2">{cls}</h4>
                  {isEditing && m14ParecerEditData ? (
                    <div className="space-y-2">
                      <textarea className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" rows={2} placeholder="Critério da pontuação" value={m14ParecerEditData.basicData} onChange={e => setM14ParecerEditData({ ...m14ParecerEditData, basicData: e.target.value })} />
                      <textarea className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" rows={5} placeholder="Reflexão / recomendação" value={m14ParecerEditData.reflection} onChange={e => setM14ParecerEditData({ ...m14ParecerEditData, reflection: e.target.value })} />
                      <div className="flex gap-2 justify-end">
                        <button onClick={saveM14ParecerEdit} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold border border-green-700">Salvar</button>
                        <button onClick={cancelM14ParecerEdit} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold border border-slate-600">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-800"><span className="font-black">Critério:</span> {existing?.basicData || "—"}</p>
                      <p className="text-xs text-slate-800"><span className="font-black">Parecer:</span> {existing?.reflection || "—"}</p>
                      <div className="flex justify-end">
                        <button onClick={() => startM14ParecerEdit(cls)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400">Editar</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {aq10ToDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 space-y-4">
              <h4 className="text-lg font-black text-black">Excluir item?</h4>
              <p className="text-sm text-slate-700">Tem certeza que deseja excluir o item <strong>&quot;{aq10ToDelete.statement}&quot;</strong>? Esta ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setAq10ToDelete(null)} className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-200 text-slate-800">Cancelar</button>
                <button onClick={confirmDeleteAq10} className="px-4 py-2 rounded-lg text-sm font-bold bg-rose-600 text-white">Excluir</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "questionario-m13") {
    const textInputCls = "p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-bold focus:ring-2 focus:ring-black outline-none";
    const selectInputCls = "p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-bold focus:ring-2 focus:ring-black outline-none";
    const subscaleLabel = (s: SnapSubscale) => (s === "inattention" ? "Bloco I · Desatenção" : "Bloco II · Hiperatividade/Impulsividade");
    const renderSnapForm = (
      data: { statement: string; subscale: SnapSubscale },
      patch: (p: Partial<typeof data>) => void
    ) => (
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-xs font-black text-black uppercase tracking-wider">Item de comportamento</label>
          <input type="text" className={textInputCls} placeholder="Ex: Não consegue prestar muita atenção a detalhes..." value={data.statement} onChange={e => patch({ statement: e.target.value })} />
        </div>
        <div className="sm:w-80 flex flex-col gap-1.5">
          <label className="text-xs font-black text-black uppercase tracking-wider">Bloco</label>
          <select className={selectInputCls} value={data.subscale} onChange={e => patch({ subscale: e.target.value as SnapSubscale })}>
            <option value="inattention">Bloco I — Desatenção (itens 1-9)</option>
            <option value="hyperactivity">Bloco II — Hiperatividade/Impulsividade (itens 10-18)</option>
          </select>
        </div>
      </div>
    );

    return (
      <div className="p-6 bg-white rounded-xl shadow-md border border-slate-300">
        <h1 className="text-2xl font-black mb-6 text-black tracking-tight border-b pb-3">Módulo 13: SNAP-IV — Rastreamento de Sintomas de TDAH</h1>

        <div className="mb-8 p-6 bg-sky-50 border-2 border-sky-300 rounded-xl space-y-2 text-sm text-slate-800">
          <p><span className="font-black">O que é:</span> instrumento de triagem construído a partir dos critérios do DSM-5-TR (Associação Americana de Psiquiatria), com validação no Brasil pelo GEDA/UFRJ e Serviço de Psiquiatria da Infância e Adolescência da UFRGS.</p>
          <p><span className="font-black">Formato:</span> 18 itens em escala ordinal de 4 pontos, divididos em dois blocos (Desatenção e Hiperatividade/Impulsividade). Relato por terceiros (pais, responsáveis ou professores).</p>
          <p><span className="font-black">Público-alvo:</span> crianças e adolescentes de 5 a 17 anos.</p>
          <p><span className="font-black">Escala de resposta:</span> {SNAP_LIKERT_LABELS.join(" · ")}.</p>
          <p><span className="font-black">Pontuação:</span> um bloco fica indicativo quando ≥ {SNAP_CLINICAL_THRESHOLD} dos seus 9 itens são marcados como “Bastante” ou “Demais” (até 16 anos) ou ≥ {SNAP_CLINICAL_THRESHOLD_17} itens aos 17 anos.</p>
          <p className="text-xs"><span className="font-black">Critérios complementares (DSM-5-TR):</span> além dos sintomas (Critério A) avaliados aqui, o diagnóstico exige B (sintomas antes dos 12 anos), C (prejuízo em ≥ 2 contextos), D (prejuízo evidente) e E (exclusão de outras causas). O DSM-5-TR permite o diagnóstico conjunto com TEA.</p>
          <p className="text-xs font-bold text-rose-700">⚠️ ALERTA: o SNAP-IV é exclusivamente uma ferramenta de rastreamento inicial e NÃO constitui diagnóstico. O laudo de TDAH exige anamnese conduzida por médico especialista (psiquiatra, neurologista ou neuropediatra).</p>
        </div>

        <div className="mb-8 p-6 bg-white border-4 border-black rounded-xl space-y-4 shadow-md">
          <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2">Adicionar novo item</h3>
          {renderSnapForm(snapNew, (p) => setSnapNew(prev => ({ ...prev, ...p })))}
          <div className="flex justify-end pt-2">
            <button onClick={addSnapQuestion} className="bg-black hover:bg-slate-900 text-white px-8 py-3.5 rounded-lg text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer border border-black uppercase tracking-wide">Adicionar Item</button>
          </div>
        </div>

        <div className="overflow-x-auto mb-10">
          <table className="w-full text-left border-collapse border border-slate-300 min-w-[640px]">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-400 text-sm font-black text-black">
                <th className="py-3 px-3 w-[6%] border-r border-slate-300">#</th>
                <th className="py-3 px-3 border-r border-slate-300">Item de avaliação comportamental</th>
                <th className="py-3 px-3 w-[28%] border-r border-slate-300">Bloco</th>
                <th className="py-3 px-3 w-[15%] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-sm text-black">
              {snapQuestions.map(q => {
                const isEditing = snapEditingId === q.id;
                return (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors align-top">
                    {isEditing && snapEditData ? (
                      <>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold align-top">{q.ord}</td>
                        <td className="py-4 px-3 border-r border-slate-300" colSpan={2}>
                          {renderSnapForm(snapEditData, (p) => setSnapEditData(prev => prev ? { ...prev, ...p } : prev))}
                        </td>
                        <td className="py-4 px-3 text-right align-top">
                          <div className="flex flex-col sm:flex-row gap-2 justify-end">
                            <button onClick={saveSnapEdit} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold border border-green-700">Salvar</button>
                            <button onClick={cancelSnapEdit} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold border border-slate-600">Cancelar</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold align-top">{q.ord}</td>
                        <td className="py-4 px-3 border-r border-slate-300 text-black align-top">{q.statement}</td>
                        <td className="py-4 px-3 border-r border-slate-300 text-xs align-top">
                          <span className={`inline-block px-2 py-1 rounded font-black ${q.subscale === "inattention" ? "bg-amber-100 text-amber-800" : "bg-violet-100 text-violet-800"}`}>{subscaleLabel(q.subscale)}</span>
                        </td>
                        <td className="py-4 px-3 text-right align-top">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => startSnapEdit(q)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400">Editar</button>
                            <button onClick={() => setSnapToDelete(q)} className="text-rose-700 hover:text-white font-bold text-xs bg-rose-100 hover:bg-rose-700 px-3 py-2 rounded-md border border-rose-400">Excluir</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mb-4">
          <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2 mb-4">Parecer por resultado do rastreamento (editável)</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {SNAP_CLASSIFICATIONS.map(cls => {
              const existing = m13Pareceres.find(p => p.classification === cls);
              const isEditing = m13ParecerEditingId === cls;
              return (
                <div key={cls} className="border-2 border-slate-300 rounded-xl p-4 bg-slate-50">
                  <h4 className="font-black text-sm text-black mb-2">{cls}</h4>
                  {isEditing && m13ParecerEditData ? (
                    <div className="space-y-2">
                      <textarea className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" rows={2} placeholder="Critério do bloco" value={m13ParecerEditData.basicData} onChange={e => setM13ParecerEditData({ ...m13ParecerEditData, basicData: e.target.value })} />
                      <textarea className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" rows={5} placeholder="Reflexão / recomendação" value={m13ParecerEditData.reflection} onChange={e => setM13ParecerEditData({ ...m13ParecerEditData, reflection: e.target.value })} />
                      <div className="flex gap-2 justify-end">
                        <button onClick={saveM13ParecerEdit} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold border border-green-700">Salvar</button>
                        <button onClick={cancelM13ParecerEdit} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold border border-slate-600">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-800"><span className="font-black">Critério:</span> {existing?.basicData || "—"}</p>
                      <p className="text-xs text-slate-800"><span className="font-black">Parecer:</span> {existing?.reflection || "—"}</p>
                      <div className="flex justify-end">
                        <button onClick={() => startM13ParecerEdit(cls)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400">Editar</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {snapToDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 space-y-4">
              <h4 className="text-lg font-black text-black">Excluir item?</h4>
              <p className="text-sm text-slate-700">Tem certeza que deseja excluir o item <strong>&quot;{snapToDelete.statement}&quot;</strong>? Esta ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setSnapToDelete(null)} className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-200 text-slate-800">Cancelar</button>
                <button onClick={confirmDeleteSnap} className="px-4 py-2 rounded-lg text-sm font-bold bg-rose-600 text-white">Excluir</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "questionario-m11") {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md border border-slate-300">
        <h1 className="text-2xl font-black mb-6 text-black tracking-tight border-b pb-3">Módulo 11: Autoconceito (Escala de Rosenberg)</h1>

        <div className="mb-8 p-6 bg-white border-4 border-black rounded-xl space-y-4 shadow-md">
          <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2">Adicionar nova afirmação</h3>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-black uppercase tracking-wider">Afirmação</label>
            <input type="text" placeholder="Ex: Sinto que sou uma pessoa de valor, pelo menos tanto quanto as outras." className="p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-black focus:ring-2 focus:ring-black outline-none" value={autoNew.statement} onChange={e => setAutoNew({ ...autoNew, statement: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-black uppercase tracking-wider">Tipo do item</label>
            <select className="p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-bold focus:ring-2 focus:ring-black outline-none" value={autoNew.itemType} onChange={e => setAutoNew({ ...autoNew, itemType: e.target.value as AutoconceptItemType })}>
              <option value="positive">Positivo (CT=3, C=2, D=1, DT=0)</option>
              <option value="negative">Negativo (CT=0, C=1, D=2, DT=3)</option>
            </select>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={addAutoQuestion} className="bg-black hover:bg-slate-900 text-white px-8 py-3.5 rounded-lg text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer border border-black uppercase tracking-wide">Adicionar Afirmação</button>
          </div>
        </div>

        <div className="overflow-x-auto mb-10">
          <table className="w-full text-left border-collapse border border-slate-300 min-w-[640px]">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-400 text-sm font-black text-black">
                <th className="py-3 px-3 w-[5%] border-r border-slate-300">#</th>
                <th className="py-3 px-3 border-r border-slate-300">Afirmação</th>
                <th className="py-3 px-3 w-[15%] border-r border-slate-300">Tipo</th>
                <th className="py-3 px-3 w-[15%] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-sm text-black">
              {autoQuestions.map(q => {
                const isEditing = autoEditingId === q.id;
                return (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors align-top">
                    {isEditing && autoEditData ? (
                      <>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold align-top">{q.ord}</td>
                        <td className="py-4 px-3 border-r border-slate-300" colSpan={2}>
                          <input type="text" className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" value={autoEditData.statement} onChange={e => setAutoEditData({ ...autoEditData, statement: e.target.value })} />
                          <select className="p-2 mt-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" value={autoEditData.itemType} onChange={e => setAutoEditData({ ...autoEditData, itemType: e.target.value as AutoconceptItemType })}>
                            <option value="positive">Positivo</option>
                            <option value="negative">Negativo</option>
                          </select>
                        </td>
                        <td className="py-4 px-3 text-right align-top">
                          <div className="flex flex-col sm:flex-row gap-2 justify-end">
                            <button onClick={saveAutoEdit} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold border border-green-700">Salvar</button>
                            <button onClick={cancelAutoEdit} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold border border-slate-600">Cancelar</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold align-top">{q.ord}</td>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold text-black align-top">{q.statement}</td>
                        <td className="py-4 px-3 border-r border-slate-300 align-top">
                          <span className={`text-xs font-bold px-2 py-1 rounded border ${q.itemType === 'positive' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>{q.itemType === 'positive' ? 'Positivo' : 'Negativo'}</span>
                        </td>
                        <td className="py-4 px-3 text-right align-top">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => startAutoEdit(q)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400">Editar</button>
                            <button onClick={() => setAutoToDelete(q)} className="text-rose-700 hover:text-white font-bold text-xs bg-rose-100 hover:bg-rose-700 px-3 py-2 rounded-md border border-rose-400">Excluir</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mb-4">
          <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2 mb-4">Parecer por faixa de autoestima (editável)</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {AUTOCONCEPT_CLASSIFICATIONS.map(cls => {
              const existing = m11Pareceres.find(p => p.classification === cls);
              const isEditing = m11ParecerEditingId === cls;
              return (
                <div key={cls} className="border-2 border-slate-300 rounded-xl p-4 bg-slate-50">
                  <h4 className="font-black text-sm text-black mb-2">{cls}</h4>
                  {isEditing && m11ParecerEditData ? (
                    <div className="space-y-2">
                      <textarea className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" rows={2} placeholder="Dados básicos (faixa de pontos)" value={m11ParecerEditData.basicData} onChange={e => setM11ParecerEditData({ ...m11ParecerEditData, basicData: e.target.value })} />
                      <textarea className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" rows={5} placeholder="Reflexão / recomendação" value={m11ParecerEditData.reflection} onChange={e => setM11ParecerEditData({ ...m11ParecerEditData, reflection: e.target.value })} />
                      <div className="flex gap-2 justify-end">
                        <button onClick={saveM11ParecerEdit} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold border border-green-700">Salvar</button>
                        <button onClick={cancelM11ParecerEdit} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold border border-slate-600">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-800"><span className="font-black">Faixa:</span> {existing?.basicData || "—"}</p>
                      <p className="text-xs text-slate-800"><span className="font-black">Parecer:</span> {existing?.reflection || "—"}</p>
                      <div className="flex justify-end">
                        <button onClick={() => startM11ParecerEdit(cls)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400">Editar</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {autoToDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 space-y-4">
              <h4 className="text-lg font-black text-black">Excluir afirmação?</h4>
              <p className="text-sm text-slate-700">Tem certeza que deseja excluir a afirmação <strong>&quot;{autoToDelete.statement}&quot;</strong>? Esta ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setAutoToDelete(null)} className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-200 text-slate-800">Cancelar</button>
                <button onClick={confirmDeleteAuto} className="px-4 py-2 rounded-lg text-sm font-bold bg-rose-600 text-white">Excluir</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "questionario-m10") {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md border border-slate-300">
        <h1 className="text-2xl font-black mb-6 text-black tracking-tight border-b pb-3">Módulo 10: Higiene Bucal (HU-DBI)</h1>

        <div className="mb-8 p-6 bg-white border-4 border-black rounded-xl space-y-4 shadow-md">
          <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2">Adicionar nova afirmação</h3>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-black uppercase tracking-wider">Afirmação</label>
            <input type="text" placeholder="Ex: Minha gengiva sangra quando escovo os dentes." className="p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-black focus:ring-2 focus:ring-black outline-none" value={oralNew.statement} onChange={e => setOralNew({ ...oralNew, statement: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-black uppercase tracking-wider">Regra de pontuação</label>
            <select className="p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-bold focus:ring-2 focus:ring-black outline-none" value={oralNew.scoringRule} onChange={e => setOralNew({ ...oralNew, scoringRule: e.target.value as OralScoringRule })}>
              <option value="none">Não pontua (perfil comportamental/estético)</option>
              <option value="agree">Pontua se Concordo</option>
              <option value="disagree">Pontua se Discordo</option>
            </select>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={addOralQuestion} className="bg-black hover:bg-slate-900 text-white px-8 py-3.5 rounded-lg text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer border border-black uppercase tracking-wide">Adicionar Afirmação</button>
          </div>
        </div>

        <div className="overflow-x-auto mb-10">
          <table className="w-full text-left border-collapse border border-slate-300 min-w-[640px]">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-400 text-sm font-black text-black">
                <th className="py-3 px-3 w-[5%] border-r border-slate-300">#</th>
                <th className="py-3 px-3 border-r border-slate-300">Afirmação</th>
                <th className="py-3 px-3 w-[22%] border-r border-slate-300">Pontuação</th>
                <th className="py-3 px-3 w-[15%] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-sm text-black">
              {oralQuestions.map(q => {
                const isEditing = oralEditingId === q.id;
                return (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors align-top">
                    {isEditing && oralEditData ? (
                      <>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold align-top">{q.ord}</td>
                        <td className="py-4 px-3 border-r border-slate-300" colSpan={2}>
                          <input type="text" className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" value={oralEditData.statement} onChange={e => setOralEditData({ ...oralEditData, statement: e.target.value })} />
                          <select className="p-2 mt-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" value={oralEditData.scoringRule} onChange={e => setOralEditData({ ...oralEditData, scoringRule: e.target.value as OralScoringRule })}>
                            <option value="none">Não pontua</option>
                            <option value="agree">Pontua se Concordo</option>
                            <option value="disagree">Pontua se Discordo</option>
                          </select>
                        </td>
                        <td className="py-4 px-3 text-right align-top">
                          <div className="flex flex-col sm:flex-row gap-2 justify-end">
                            <button onClick={saveOralEdit} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold border border-green-700">Salvar</button>
                            <button onClick={cancelOralEdit} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold border border-slate-600">Cancelar</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold align-top">{q.ord}</td>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold text-black align-top">{q.statement}</td>
                        <td className="py-4 px-3 border-r border-slate-300 align-top">
                          <span className={`text-xs font-bold px-2 py-1 rounded border ${q.scoringRule === 'agree' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : q.scoringRule === 'disagree' ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>{oralRuleLabel(q.scoringRule)}</span>
                        </td>
                        <td className="py-4 px-3 text-right align-top">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => startOralEdit(q)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400">Editar</button>
                            <button onClick={() => setOralToDelete(q)} className="text-rose-700 hover:text-white font-bold text-xs bg-rose-100 hover:bg-rose-700 px-3 py-2 rounded-md border border-rose-400">Excluir</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mb-4">
          <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2 mb-4">Parecer por faixa de desempenho (editável)</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {ORAL_CLASSIFICATIONS.map(cls => {
              const existing = m10Pareceres.find(p => p.classification === cls);
              const isEditing = m10ParecerEditingId === cls;
              return (
                <div key={cls} className="border-2 border-slate-300 rounded-xl p-4 bg-slate-50">
                  <h4 className="font-black text-sm text-black mb-2">{cls}</h4>
                  {isEditing && m10ParecerEditData ? (
                    <div className="space-y-2">
                      <textarea className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" rows={2} placeholder="Dados básicos (faixa de pontos)" value={m10ParecerEditData.basicData} onChange={e => setM10ParecerEditData({ ...m10ParecerEditData, basicData: e.target.value })} />
                      <textarea className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" rows={5} placeholder="Reflexão / recomendação" value={m10ParecerEditData.reflection} onChange={e => setM10ParecerEditData({ ...m10ParecerEditData, reflection: e.target.value })} />
                      <div className="flex gap-2 justify-end">
                        <button onClick={saveM10ParecerEdit} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold border border-green-700">Salvar</button>
                        <button onClick={cancelM10ParecerEdit} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold border border-slate-600">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-800"><span className="font-black">Faixa:</span> {existing?.basicData || "—"}</p>
                      <p className="text-xs text-slate-800"><span className="font-black">Parecer:</span> {existing?.reflection || "—"}</p>
                      <div className="flex justify-end">
                        <button onClick={() => startM10ParecerEdit(cls)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400">Editar</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {oralToDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 space-y-4">
              <h4 className="text-lg font-black text-black">Excluir afirmação?</h4>
              <p className="text-sm text-slate-700">Tem certeza que deseja excluir a afirmação <strong>&quot;{oralToDelete.statement}&quot;</strong>? Esta ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setOralToDelete(null)} className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-200 text-slate-800">Cancelar</button>
                <button onClick={confirmDeleteOral} className="px-4 py-2 rounded-lg text-sm font-bold bg-rose-600 text-white">Excluir</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "questionario-m9") {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md border border-slate-300">
        <h1 className="text-2xl font-black mb-6 text-black tracking-tight border-b pb-3">Módulo 9: Saúde Global (KIDSCREEN-10)</h1>

        <div className="mb-8 p-6 bg-white border-4 border-black rounded-xl space-y-4 shadow-md">
          <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2">Adicionar nova pergunta</h3>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-black uppercase tracking-wider">Pergunta</label>
            <input type="text" placeholder="Ex: Você tem se sentido bem e com energia?" className="p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-black focus:ring-2 focus:ring-black outline-none" value={healthNew.statement} onChange={e => setHealthNew({ ...healthNew, statement: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-black">
            <input type="checkbox" className="w-4 h-4 accent-black" checked={healthNew.reversed} onChange={e => setHealthNew({ ...healthNew, reversed: e.target.checked })} />
            Item invertido (pontuação 6 - resposta)
          </label>
          <div className="flex justify-end pt-2">
            <button onClick={addHealthQuestion} className="bg-black hover:bg-slate-900 text-white px-8 py-3.5 rounded-lg text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer border border-black uppercase tracking-wide">Adicionar Pergunta</button>
          </div>
        </div>

        <div className="overflow-x-auto mb-10">
          <table className="w-full text-left border-collapse border border-slate-300 min-w-[640px]">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-400 text-sm font-black text-black">
                <th className="py-3 px-3 w-[5%] border-r border-slate-300">#</th>
                <th className="py-3 px-3 border-r border-slate-300">Pergunta</th>
                <th className="py-3 px-3 w-[15%] border-r border-slate-300">Invertido</th>
                <th className="py-3 px-3 w-[15%] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-sm text-black">
              {healthQuestions.map(q => {
                const isEditing = healthEditingId === q.id;
                return (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors align-top">
                    {isEditing && healthEditData ? (
                      <>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold align-top">{q.ord}</td>
                        <td className="py-4 px-3 border-r border-slate-300" colSpan={2}>
                          <input type="text" className="p-2 border-2 border-slate-500 bg-white text-black rounded text-sm w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" value={healthEditData.statement} onChange={e => setHealthEditData({ ...healthEditData, statement: e.target.value })} />
                          <label className="flex items-center gap-2 text-xs font-bold text-black mt-2">
                            <input type="checkbox" className="w-4 h-4 accent-black" checked={healthEditData.reversed} onChange={e => setHealthEditData({ ...healthEditData, reversed: e.target.checked })} />
                            Item invertido
                          </label>
                        </td>
                        <td className="py-4 px-3 text-right align-top">
                          <div className="flex flex-col sm:flex-row gap-2 justify-end">
                            <button onClick={saveHealthEdit} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold border border-green-700">Salvar</button>
                            <button onClick={cancelHealthEdit} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold border border-slate-600">Cancelar</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold align-top">{q.ord}</td>
                        <td className="py-4 px-3 border-r border-slate-300 font-bold text-black align-top">{q.statement}</td>
                        <td className="py-4 px-3 border-r border-slate-300 align-top">
                          {q.reversed ? <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-300">Sim</span> : <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-300">Não</span>}
                        </td>
                        <td className="py-4 px-3 text-right align-top">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => startHealthEdit(q)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400">Editar</button>
                            <button onClick={() => setHealthToDelete(q)} className="text-rose-700 hover:text-white font-bold text-xs bg-rose-100 hover:bg-rose-700 px-3 py-2 rounded-md border border-rose-400">Excluir</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mb-4">
          <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2 mb-4">Parecer por classificação (editável)</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {HEALTH_CLASSIFICATIONS.map(cls => {
              const existing = m9Pareceres.find(p => p.classification === cls);
              const isEditing = m9ParecerEditingId === cls;
              return (
                <div key={cls} className="border-2 border-slate-300 rounded-xl p-4 bg-slate-50">
                  <h4 className="font-black text-sm text-black mb-2">{cls}</h4>
                  {isEditing && m9ParecerEditData ? (
                    <div className="space-y-2">
                      <textarea className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" rows={3} placeholder="Dados básicos" value={m9ParecerEditData.basicData} onChange={e => setM9ParecerEditData({ ...m9ParecerEditData, basicData: e.target.value })} />
                      <textarea className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none" rows={5} placeholder="Reflexão / recomendação" value={m9ParecerEditData.reflection} onChange={e => setM9ParecerEditData({ ...m9ParecerEditData, reflection: e.target.value })} />
                      <div className="flex gap-2 justify-end">
                        <button onClick={saveM9ParecerEdit} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold border border-green-700">Salvar</button>
                        <button onClick={cancelM9ParecerEdit} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold border border-slate-600">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-800"><span className="font-black">Dados:</span> {existing?.basicData || "—"}</p>
                      <p className="text-xs text-slate-800"><span className="font-black">Parecer:</span> {existing?.reflection || "—"}</p>
                      <div className="flex justify-end">
                        <button onClick={() => startM9ParecerEdit(cls)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400">Editar</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {healthToDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 space-y-4">
              <h4 className="text-lg font-black text-black">Excluir pergunta?</h4>
              <p className="text-sm text-slate-700">Tem certeza que deseja excluir a pergunta <strong>&quot;{healthToDelete.statement}&quot;</strong>? Esta ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setHealthToDelete(null)} className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-200 text-slate-800">Cancelar</button>
                <button onClick={confirmDeleteHealth} className="px-4 py-2 rounded-lg text-sm font-bold bg-rose-600 text-white">Excluir</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "questionario-m15") {
    const textInputCls = "p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-bold focus:ring-2 focus:ring-black outline-none";
    const selectInputCls = "p-3 border-2 border-black bg-white text-black rounded-lg text-sm w-full font-bold focus:ring-2 focus:ring-black outline-none";
    const tabBtn = (key: 'grupos' | 'adaptacoes' | 'faixas' | 'matriz' | 'funil', label: string) => (
      <button onClick={() => setM15Tab(key)} className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wide border transition-all cursor-pointer ${m15Tab === key ? "bg-black text-white border-black" : "bg-white text-black border-slate-300 hover:border-black"}`}>{label}</button>
    );
    const m15Detalhes = PCD_DETALHES_POR_GRUPO[m15AdaptGrupoSel] ?? [];
    const m15FaixaDetalhes = PCD_DETALHES_POR_GRUPO[m15FaixasGrupoSel] ?? [];

    return (
      <div className="p-6 bg-white rounded-xl shadow-md border border-slate-300">
        <h1 className="text-2xl font-black mb-6 text-black tracking-tight border-b pb-3">Módulo 15: Qualidade Motora PCD — Protocolo de Avaliação da Capacidade Funcional do Aluno com Deficiência</h1>

        <div className="mb-8 p-6 bg-indigo-50 border-2 border-indigo-300 rounded-xl space-y-2 text-sm text-slate-800">
          <p><span className="font-black">O que é:</span> bateria motora adaptada para alunos com deficiência (4 a 18 anos), com triagem clínica por grupo (física com locomoção independente, física em cadeira de rodas, paralisia cerebral/GMFCS, visual, auditiva e intelectual), adaptações por deficiência e matriz de compatibilidade com modalidades esportivas.</p>
          <p><span className="font-black">Testes:</span> {PCD_TESTES.map(t => t.label).join(" · ")}. Notas relativas de 1 a 3 por teste, conforme as faixas de referência configuradas por grupo.</p>
          <p><span className="font-black">Valências:</span> Velocidade/Agilidade (média das notas), Força Explosiva (salto), Força de Membros Superiores (flexão de braços) e Estabilidade de Tronco/Core (prancha). O Índice de Aptidão Relativa (IAR) por modalidade = Σ(Nota × Peso) da matriz (maior = mais compatível).</p>
          <p className="text-xs font-bold text-indigo-700">💡 Configure abaixo os grupos de triagem, as adaptações por grupo, as faixas de nota por teste, a matriz de pesos por modalidade e o funil qualitativo. Estas telas alimentam a Avaliação PCD (aba Avaliações).</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {tabBtn('grupos', '1 · Grupos de Triagem')}
          {tabBtn('adaptacoes', '2 · Adaptação por Grupo')}
          {tabBtn('faixas', '3 · Faixas de Nota')}
          {tabBtn('matriz', '4 · Matriz de Pesos')}
          {tabBtn('funil', '5 · Funil de Direcionamento')}
        </div>

        {m15Tab === 'grupos' && (
          <div className="space-y-6">
            <div className="p-6 bg-white border-4 border-black rounded-xl space-y-4 shadow-md">
              <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2">Configurar grupo de triagem</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-black uppercase tracking-wider">Nº do grupo (1 a 6)</label>
                  <input type="number" min={1} max={6} className={textInputCls} value={m15GrupoEditing?.grupo ?? 1} onChange={e => setM15GrupoEditing(prev => ({ ...(prev ?? { id: '', grupo: 1, nome: '', descricao: '', laudo: '' }), grupo: Number(e.target.value) }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-black uppercase tracking-wider">Nome do grupo</label>
                  <input type="text" className={textInputCls} placeholder="Ex: Deficiência Auditiva" value={m15GrupoEditing?.nome ?? ''} onChange={e => setM15GrupoEditing(prev => ({ ...(prev ?? { id: '', grupo: 1, nome: '', descricao: '', laudo: '' }), nome: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-black uppercase tracking-wider">Classificação (detalhes disponíveis)</label>
                  <input type="text" className={textInputCls} placeholder="Ex: Surdez/Deficiência auditiva" value={m15GrupoEditing?.descricao ?? ''} onChange={e => setM15GrupoEditing(prev => ({ ...(prev ?? { id: '', grupo: 1, nome: '', descricao: '', laudo: '' }), descricao: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-black uppercase tracking-wider">Exigência de laudo (texto)</label>
                  <input type="text" className={textInputCls} placeholder="Ex: Laudo médico/audiograma" value={m15GrupoEditing?.laudo ?? ''} onChange={e => setM15GrupoEditing(prev => ({ ...(prev ?? { id: '', grupo: 1, nome: '', descricao: '', laudo: '' }), laudo: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {m15GrupoEditing?.id && <button onClick={() => setM15GrupoEditing(null)} className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold border border-slate-600 cursor-pointer">Cancelar</button>}
                <button onClick={() => saveM15Grupo(m15GrupoEditing ?? { id: '', grupo: 1, nome: '', descricao: '', laudo: '' })} className="bg-black hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer border border-black uppercase tracking-wide">Salvar Grupo</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 min-w-[640px]">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-400 text-sm font-black text-black">
                    <th className="py-3 px-3 w-[8%] border-r border-slate-300">#</th>
                    <th className="py-3 px-3 border-r border-slate-300">Nome do grupo</th>
                    <th className="py-3 px-3 border-r border-slate-300">Classificação</th>
                    <th className="py-3 px-3 border-r border-slate-300">Laudo exigido</th>
                    <th className="py-3 px-3 w-[15%] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-sm text-black">
                  {[...m15Grupos].sort((a, b) => a.grupo - b.grupo).map(g => (
                    <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 border-r border-slate-300 font-bold">{g.grupo}</td>
                      <td className="py-3 px-3 border-r border-slate-300 font-bold">{g.nome}</td>
                      <td className="py-3 px-3 border-r border-slate-300">{g.descricao || "—"}</td>
                      <td className="py-3 px-3 border-r border-slate-300">{g.laudo || "—"}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setM15GrupoEditing(g)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400 cursor-pointer">Editar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {m15Tab === 'adaptacoes' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-3 p-6 bg-white border-4 border-black rounded-xl shadow-md">
              <div className="flex flex-col gap-1.5 sm:w-64">
                <label className="text-xs font-black text-black uppercase tracking-wider">Grupo de triagem</label>
                <select className={selectInputCls} value={m15AdaptGrupoSel} onChange={e => setM15AdaptGrupoSel(Number(e.target.value))}>
                  {[...m15Grupos].sort((a, b) => a.grupo - b.grupo).map(g => <option key={g.id} value={g.grupo}>Grupo {g.grupo} — {g.nome}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 sm:w-80">
                <label className="text-xs font-black text-black uppercase tracking-wider">Classificação / detalhe</label>
                <select className={selectInputCls} value={m15AdaptDetalheSel} onChange={e => setM15AdaptDetalheSel(e.target.value)}>
                  <option value="">(geral — todos os alunos do grupo)</option>
                  {(m15Detalhes ?? []).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button onClick={() => ensureM15Adaptacoes(m15AdaptGrupoSel, m15AdaptDetalheSel)} className="bg-black hover:bg-slate-900 text-white px-5 py-3 rounded-lg text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer border border-black">Aplicar adaptações de referência</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 min-w-[640px]">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-400 text-sm font-black text-black">
                    <th className="py-3 px-3 border-r border-slate-300">Teste</th>
                    <th className="py-3 px-3 border-r border-slate-300">Status da adaptação</th>
                    <th className="py-3 px-3 border-r border-slate-300">Instrução adaptada</th>
                    <th className="py-3 px-3 w-[12%] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-sm text-black">
                  {m15Adaptacoes.filter(a => a.grupo === m15AdaptGrupoSel && (a.detalhe || "").trim() === (m15AdaptDetalheSel || "").trim()).map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors align-top">
                      <td className="py-3 px-3 border-r border-slate-300 font-bold whitespace-nowrap">{PCD_TESTES_MAP[a.teste as PcdTesteKey]?.label ?? a.teste}</td>
                      <td className="py-3 px-3 border-r border-slate-300">
                        <select className={selectInputCls} value={a.status} onChange={e => saveM15Adaptacao({ ...a, status: e.target.value })}>
                          {PCD_STATUS_ADAPTACAO.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-3 border-r border-slate-300">
                        <input type="text" className={textInputCls} value={a.instrucao} placeholder="Instrução específica para o teste nesta deficiência" onChange={e => saveM15Adaptacao({ ...a, instrucao: e.target.value })} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button onClick={() => { deleteM15Row("m15_pcd_adaptacoes", a.id); setM15Adaptacoes(m15Adaptacoes.filter(row => row.id !== a.id)); }} className="text-rose-700 hover:text-white font-bold text-xs bg-rose-100 hover:bg-rose-700 px-3 py-2 rounded-md border border-rose-400 cursor-pointer">Remover</button>
                      </td>
                    </tr>
                  ))}
                  {m15Adaptacoes.filter(a => a.grupo === m15AdaptGrupoSel && (a.detalhe || "").trim() === (m15AdaptDetalheSel || "").trim()).length === 0 && (
                    <tr><td colSpan={4} className="py-6 px-3 text-center text-sm text-slate-500">Nenhuma adaptação configurada. Clique em &quot;Aplicar adaptações de referência&quot; para popular com os padrões do protocolo.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {m15Tab === 'faixas' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-3 p-6 bg-white border-4 border-black rounded-xl shadow-md">
              <div className="flex flex-col gap-1.5 sm:w-56">
                <label className="text-xs font-black text-black uppercase tracking-wider">Grupo de triagem</label>
                <select className={selectInputCls} value={m15FaixasGrupoSel} onChange={e => setM15FaixasGrupoSel(Number(e.target.value))}>
                  {[...m15Grupos].sort((a, b) => a.grupo - b.grupo).map(g => <option key={g.id} value={g.grupo}>Grupo {g.grupo} — {g.nome}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 sm:w-64">
                <label className="text-xs font-black text-black uppercase tracking-wider">Classificação / detalhe</label>
                <select className={selectInputCls} value={m15FaixasDetalheSel} onChange={e => setM15FaixasDetalheSel(e.target.value)}>
                  <option value="">(geral — todos os alunos do grupo)</option>
                  {(m15FaixaDetalhes ?? []).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 sm:w-72">
                <label className="text-xs font-black text-black uppercase tracking-wider">Teste</label>
                <select className={selectInputCls} value={m15FaixasTesteSel} onChange={e => setM15FaixasTesteSel(e.target.value as PcdTesteKey)}>
                  {PCD_TESTES.map(t => <option key={t.key} value={t.key}>{t.label} ({t.unidade})</option>)}
                </select>
              </div>
              <button onClick={() => ensureM15Faixas(m15FaixasGrupoSel, m15FaixasDetalheSel, m15FaixasTesteSel)} className="bg-black hover:bg-slate-900 text-white px-5 py-3 rounded-lg text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer border border-black">Aplicar faixas de referência</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 min-w-[640px]">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-400 text-sm font-black text-black">
                    <th className="py-3 px-3 border-r border-slate-300">Nota</th>
                    <th className="py-3 px-3 border-r border-slate-300">Rótulo</th>
                    <th className="py-3 px-3 border-r border-slate-300">Valor mínimo</th>
                    <th className="py-3 px-3 border-r border-slate-300">Valor máximo</th>
                    <th className="py-3 px-3 w-[10%] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-sm text-black">
                  {[1, 2, 3].map(n => {
                    const f = m15Faixas.find(f => f.grupo === m15FaixasGrupoSel && (f.detalhe || "").trim() === (m15FaixasDetalheSel || "").trim() && f.teste === m15FaixasTesteSel && f.nota === n);
                    if (!f) {
                      return (
                        <tr key={n} className="hover:bg-slate-50">
                          <td className="py-3 px-3 border-r border-slate-300 font-bold">Nota {n}</td>
                          <td className="py-3 px-3 border-r border-slate-300 text-xs">{PCD_NOTAS_LABELS[n]}</td>
                          <td className="py-3 px-3 border-r border-slate-300 text-slate-400" colSpan={2}>Não configurada</td>
                          <td className="py-3 px-3 text-right">
                            <button onClick={() => addM15Faixa(m15FaixasGrupoSel, m15FaixasDetalheSel, m15FaixasTesteSel, n)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400 cursor-pointer">Criar</button>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 border-r border-slate-300 font-bold">Nota {n}</td>
                        <td className="py-3 px-3 border-r border-slate-300 text-xs">{PCD_NOTAS_LABELS[n]}</td>
                        <td className="py-3 px-3 border-r border-slate-300">
                          <input type="number" step="0.01" className={textInputCls} placeholder="—" value={f.minVal ?? ''} onChange={e => saveM15Faixa({ ...f, minVal: e.target.value === '' ? null : Number(e.target.value) })} />
                        </td>
                        <td className="py-3 px-3 border-r border-slate-300">
                          <input type="number" step="0.01" className={textInputCls} placeholder="—" value={f.maxVal ?? ''} onChange={e => saveM15Faixa({ ...f, maxVal: e.target.value === '' ? null : Number(e.target.value) })} />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button onClick={() => { deleteM15Row("m15_pcd_faixas", f.id); setM15Faixas(m15Faixas.filter(row => row.id !== f.id)); }} className="text-rose-700 hover:text-white font-bold text-xs bg-rose-100 hover:bg-rose-700 px-3 py-2 rounded-md border border-rose-400 cursor-pointer">Remover</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-600">Regra de aplicação: nos testes <strong>maior-melhor</strong> (abdominal, salto, flexão) — Nota 1 = até o limite inferior, Nota 2 = faixa intermediária, Nota 3 = a partir do limite superior. Nos testes <strong>menor-melhor</strong> (velocidade, agilidade) a ordem se inverte: menor tempo = Nota 3.</p>
          </div>
        )}

        {m15Tab === 'matriz' && (
          <div className="space-y-6">
            <div className="p-6 bg-white border-4 border-black rounded-xl space-y-4 shadow-md">
              <h3 className="font-black text-xl text-black uppercase tracking-wide border-b-2 border-black pb-2">Configurar modalidade da matriz</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-black uppercase tracking-wider">Modalidade</label>
                  <input type="text" className={textInputCls} placeholder="Ex: Atletismo" value={m15MatrizEditing?.nome ?? ''} onChange={e => setM15MatrizEditing(prev => ({ ...(prev ?? { id: '', nome: '', pesoVelAgil: 1, pesoForcaExp: 1, pesoMembrosSup: 1, pesoCore: 1, descricao: '' }), nome: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-black uppercase tracking-wider">Descrição / exigência</label>
                  <input type="text" className={textInputCls} placeholder="Ex: Sprint, saltos e arremessos" value={m15MatrizEditing?.descricao ?? ''} onChange={e => setM15MatrizEditing(prev => ({ ...(prev ?? { id: '', nome: '', pesoVelAgil: 1, pesoForcaExp: 1, pesoMembrosSup: 1, pesoCore: 1, descricao: '' }), descricao: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-black uppercase tracking-wider">Peso Core</label>
                  <input type="number" min={0} max={3} className={textInputCls} value={m15MatrizEditing?.pesoCore ?? 1} onChange={e => setM15MatrizEditing(prev => ({ ...(prev ?? { id: '', nome: '', pesoVelAgil: 1, pesoForcaExp: 1, pesoMembrosSup: 1, pesoCore: 1, descricao: '' }), pesoCore: Number(e.target.value) }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-black uppercase tracking-wider">Peso Velocidade/Agilidade</label>
                  <input type="number" min={0} max={3} className={textInputCls} value={m15MatrizEditing?.pesoVelAgil ?? 1} onChange={e => setM15MatrizEditing(prev => ({ ...(prev ?? { id: '', nome: '', pesoVelAgil: 1, pesoForcaExp: 1, pesoMembrosSup: 1, pesoCore: 1, descricao: '' }), pesoVelAgil: Number(e.target.value) }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-black uppercase tracking-wider">Peso Força Explosiva</label>
                  <input type="number" min={0} max={3} className={textInputCls} value={m15MatrizEditing?.pesoForcaExp ?? 1} onChange={e => setM15MatrizEditing(prev => ({ ...(prev ?? { id: '', nome: '', pesoVelAgil: 1, pesoForcaExp: 1, pesoMembrosSup: 1, pesoCore: 1, descricao: '' }), pesoForcaExp: Number(e.target.value) }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-black uppercase tracking-wider">Peso Membros Superiores</label>
                  <input type="number" min={0} max={3} className={textInputCls} value={m15MatrizEditing?.pesoMembrosSup ?? 1} onChange={e => setM15MatrizEditing(prev => ({ ...(prev ?? { id: '', nome: '', pesoVelAgil: 1, pesoForcaExp: 1, pesoMembrosSup: 1, pesoCore: 1, descricao: '' }), pesoMembrosSup: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {m15MatrizEditing?.id && <button onClick={() => setM15MatrizEditing(null)} className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold border border-slate-600 cursor-pointer">Cancelar</button>}
                <button onClick={() => saveM15Matriz(m15MatrizEditing ?? { id: '', nome: '', pesoVelAgil: 1, pesoForcaExp: 1, pesoMembrosSup: 1, pesoCore: 1, descricao: '' })} className="bg-black hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer border border-black uppercase tracking-wide">Salvar Modalidade</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 min-w-[820px]">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-400 text-sm font-black text-black">
                    <th className="py-3 px-3 border-r border-slate-300">Modalidade</th>
                    <th className="py-3 px-3 border-r border-slate-300">Vel/Agil</th>
                    <th className="py-3 px-3 border-r border-slate-300">Força Expl.</th>
                    <th className="py-3 px-3 border-r border-slate-300">Membros Sup.</th>
                    <th className="py-3 px-3 border-r border-slate-300">Core</th>
                    <th className="py-3 px-3 border-r border-slate-300">Descrição</th>
                    <th className="py-3 px-3 w-[16%] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-sm text-black">
                  {m15Modalidades.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 border-r border-slate-300 font-bold">{m.nome}</td>
                      <td className="py-3 px-3 border-r border-slate-300 text-center font-black">{m.pesoVelAgil}</td>
                      <td className="py-3 px-3 border-r border-slate-300 text-center font-black">{m.pesoForcaExp}</td>
                      <td className="py-3 px-3 border-r border-slate-300 text-center font-black">{m.pesoMembrosSup}</td>
                      <td className="py-3 px-3 border-r border-slate-300 text-center font-black">{m.pesoCore}</td>
                      <td className="py-3 px-3 border-r border-slate-300 text-xs">{m.descricao || "—"}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setM15MatrizEditing(m)} className="text-blue-700 hover:text-white font-bold text-xs bg-blue-100 hover:bg-blue-700 px-3 py-2 rounded-md border border-blue-400 cursor-pointer">Editar</button>
                          <button onClick={() => { deleteM15Row("m15_pcd_modalidades", m.id); setM15Modalidades(m15Modalidades.filter(row => row.id !== m.id)); }} className="text-rose-700 hover:text-white font-bold text-xs bg-rose-100 hover:bg-rose-700 px-3 py-2 rounded-md border border-rose-400 cursor-pointer">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {m15Tab === 'funil' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-3 p-6 bg-white border-4 border-black rounded-xl shadow-md">
              <div className="flex flex-col gap-1.5 sm:w-72">
                <label className="text-xs font-black text-black uppercase tracking-wider">Grupo de triagem</label>
                <select className={selectInputCls} value={m15FunilGrupoSel} onChange={e => setM15FunilGrupoSel(Number(e.target.value))}>
                  {[...m15Grupos].sort((a, b) => a.grupo - b.grupo).map(g => <option key={g.id} value={g.grupo}>Grupo {g.grupo} — {g.nome}</option>)}
                </select>
              </div>
              <button onClick={() => ensureM15Funil(m15FunilGrupoSel)} className="bg-black hover:bg-slate-900 text-white px-5 py-3 rounded-lg text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer border border-black">Aplicar regras de referência</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(m => {
                const f = m15Funil.find(f => f.grupo === m15FunilGrupoSel && f.momento === m);
                return (
                  <div key={m} className="border-2 border-slate-300 rounded-xl p-4 bg-slate-50">
                    <h4 className="font-black text-sm text-black mb-1">Momento {m}</h4>
                    <input type="text" className="w-full p-2 border-2 border-slate-400 bg-white text-black rounded-lg text-xs font-bold mb-2 focus:ring-2 focus:ring-black outline-none" placeholder="Título do filtro" value={f?.titulo ?? ''} disabled={!f} onChange={e => f && saveM15Funil({ ...f, titulo: e.target.value })} />
                    <textarea className="w-full p-2 border-2 border-slate-400 bg-white text-black rounded-lg text-xs font-bold focus:ring-2 focus:ring-black outline-none" rows={6} placeholder="Regra qualitativa / recomendações" value={f?.regra ?? ''} disabled={!f} onChange={e => f && saveM15Funil({ ...f, regra: e.target.value })} />
                    {!f && <p className="text-xs text-slate-500">Configure este momento clicando em &quot;Aplicar regras de referência&quot;.</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "questionario-m7") {
    const filteredM7Rows = m7Rows.filter((row) => {
      const q = searchQuery.toLowerCase();
      return (
        row.profile.toLowerCase().includes(q) ||
        row.component.toLowerCase().includes(q) ||
        row.basicData.toLowerCase().includes(q) ||
        row.reflection.toLowerCase().includes(q)
      );
    }).sort((a, b) => a.profile.localeCompare(b.profile, 'pt-BR') || a.component.localeCompare(b.component, 'pt-BR'));

    const m7AddRow = async () => {
      if (!m7NewRow.basicData.trim() || !m7NewRow.reflection.trim()) {
        return;
      }
      const newId = (await nextM7ParecerId()) || ('m7_r_' + uuid().slice(0, 8));
      const newRow = { ...m7NewRow, id: newId };
      setM7Rows([...m7Rows, newRow]);
      setM7NewRow({
        profile: "Criativo e Tecnológico (Perfil Híbrido)",
        component: "Mapa de Perfis e Carreiras",
        basicData: "",
        reflection: "",
        interestArea: "",
        careers: ""
      });

      // Sync to Supabase
      if (isSupabaseConfigured) {
        const supabase = getDb();
        if (supabase) {
          supabase.from("m7_perfis_pareceres").upsert({
            id: newRow.id,
            profile: newRow.profile,
            component: newRow.component,
            basic_data: newRow.basicData,
            reflection: newRow.reflection,
            interest_area: newRow.interestArea ?? null,
            careers: newRow.careers ?? null,
          }).then(({ error }) => {
            if (error) console.error("Error saving m7_perfis_pareceres to Supabase:", error?.message ?? error);
          });
        }
      }
    };

    const m7StartEditing = (row: M7ProfileRow) => {
      setM7EditingId(row.id);
      setM7EditingData({ ...row });
    };

    const m7CancelEditing = () => {
      setM7EditingId(null);
      setM7EditingData(null);
    };

    const m7SaveEditing = () => {
      if (m7EditingData) {
        setM7Rows(m7Rows.map(row => row.id === m7EditingId ? m7EditingData : row));
        setM7EditingId(null);
        setM7EditingData(null);

        // Sync to Supabase
        if (isSupabaseConfigured) {
          const supabase = getDb();
          if (supabase) {
            supabase.from("m7_perfis_pareceres").upsert({
              id: m7EditingData.id,
              profile: m7EditingData.profile,
              component: m7EditingData.component,
              basic_data: m7EditingData.basicData,
              reflection: m7EditingData.reflection,
              interest_area: m7EditingData.interestArea ?? null,
              careers: m7EditingData.careers ?? null,
            }).then(({ error }) => {
              if (error) console.error("Error saving m7_perfis_pareceres to Supabase:", error?.message ?? error);
            });
          }
        }
      }
    };

    const m7DeleteRow = (id: string) => {
      const row = m7Rows.find(r => r.id === id);
      if (row) {
        setM7RowToDelete(row);
      }
    };

    const handleConfirmDeleteM7 = () => {
      if (m7RowToDelete) {
        const deletedId = m7RowToDelete.id;
        setM7Rows(m7Rows.filter(row => row.id !== deletedId));
        setM7RowToDelete(null);

        // Sync to Supabase
        if (isSupabaseConfigured) {
          const supabase = getDb();
          if (supabase) {
            supabase.from("m7_perfis_pareceres").delete().eq("id", deletedId).then(({ error }) => {
              if (error) console.error("Error deleting m7_perfis_pareceres from Supabase:", error);
            });
          }
        }
      }
    };


    return (
      <div className="p-6 bg-white rounded-xl shadow-md border border-slate-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
              <ClipboardList className="w-7 h-7 text-[#5e2b97]" />
              Módulo 7: Mapa de Perfis, Carreiras e Pareceres
            </h1>
            <p className="text-sm text-slate-600 font-bold mt-1">
              Consulte e configure as diretrizes, habilidades e recomendações dos perfis profissionais
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">


            {/* Global Search inside this tab */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-lg py-2 pl-9 pr-4 text-xs text-black placeholder-slate-500 focus:outline-none focus:border-black font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Form Card for Adding New Entry */}
        <div className="mb-8 p-5 bg-slate-50 border-2 border-slate-300 rounded-xl">
          <h3 className="text-sm font-black text-black uppercase tracking-tight mb-4 flex items-center gap-2 border-b pb-2">
            <Plus className="w-4 h-4 text-blue-600" />
            Adicionar Novo Componente de Perfil
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-extrabold text-slate-800 block mb-1">Módulo / Perfil:</label>
              <select
                value={m7NewRow.profile}
                onChange={(e) => setM7NewRow({ ...m7NewRow, profile: e.target.value })}
                className="w-full bg-white border-2 border-slate-300 rounded-lg p-2.5 text-xs text-black font-black focus:border-black focus:outline-none"
              >
                <option value="Criativo e Tecnológico (Perfil Híbrido)">🧩 Criativo e Tecnológico (Perfil Híbrido)</option>
                <option value="Negócios e Gestão">💼 Negócios e Gestão</option>
                <option value="Biológicas e Criativas">🌱 Biológicas e Criativas</option>
                <option value="Exatas e Tecnológicas">📐 Exatas e Tecnológicas</option>
                <option value="Humanas e Sociais">👥 Humanas e Sociais</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-800 block mb-1">Componente:</label>
              <select
                value={m7NewRow.component}
                onChange={(e) => setM7NewRow({ ...m7NewRow, component: e.target.value })}
                className="w-full bg-white border-2 border-slate-300 rounded-lg p-2.5 text-xs text-black font-black focus:border-black focus:outline-none"
              >
                <option value="Mapa de Perfis e Carreiras">Mapa de Perfis e Carreiras</option>
                <option value="Recomendações Pedagógicas">Recomendações Pedagógicas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-extrabold text-slate-800 block mb-1">Dados Básicos / Carreiras / Ações:</label>
              <textarea
                placeholder="Descreva as características básicas ou os projetos sugeridos..."
                value={m7NewRow.basicData}
                onChange={(e) => setM7NewRow({ ...m7NewRow, basicData: e.target.value })}
                rows={3}
                className="w-full bg-white border-2 border-slate-300 rounded-lg p-2.5 text-xs text-black focus:border-black focus:outline-none font-bold resize-y"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-800 block mb-1">Meu Parecer Reflexivo / Recomendações:</label>
              <textarea
                placeholder="Insira o parecer técnico de orientação profissional..."
                value={m7NewRow.reflection}
                onChange={(e) => setM7NewRow({ ...m7NewRow, reflection: e.target.value })}
                rows={3}
                className="w-full bg-white border-2 border-slate-300 rounded-lg p-2.5 text-xs text-black focus:border-black focus:outline-none font-bold resize-y"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-extrabold text-slate-800 block mb-1">Área de Interesse (mostrada na avaliação):</label>
              <textarea
                placeholder="Ex: Você gosta de se comunicar, ajudar as pessoas e entender a sociedade."
                value={m7NewRow.interestArea ?? ""}
                onChange={(e) => setM7NewRow({ ...m7NewRow, interestArea: e.target.value })}
                rows={2}
                className="w-full bg-white border-2 border-slate-300 rounded-lg p-2.5 text-xs text-black focus:border-black focus:outline-none font-bold resize-y"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-800 block mb-1">Carreiras Indicadas (mostradas na avaliação):</label>
              <textarea
                placeholder="Ex: Direito, Letras, Pedagogia, Psicologia..."
                value={m7NewRow.careers ?? ""}
                onChange={(e) => setM7NewRow({ ...m7NewRow, careers: e.target.value })}
                rows={2}
                className="w-full bg-white border-2 border-slate-300 rounded-lg p-2.5 text-xs text-black focus:border-black focus:outline-none font-bold resize-y"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={m7AddRow}
              className="px-5 py-2.5 bg-black hover:bg-slate-800 text-white font-black rounded-lg text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer border border-black flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Registro</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto border-2 border-slate-300 rounded-xl bg-white shadow-sm">
          <table className="w-full border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-slate-100 text-slate-800 uppercase text-xs font-black border-b-2 border-slate-300">
                <th className="py-3 px-3 text-left border-r border-slate-300 w-[7%]">Módulo / Perfil</th>
                <th className="py-3 px-3 text-left border-r border-slate-300 w-[7%]">Componente</th>
                <th className="py-3 px-3 text-left border-r border-slate-300 w-[20%]">Dados Básicos</th>
                <th className="py-3 px-3 text-left border-r border-slate-300 w-[30%]">Meu Parecer Reflexivo</th>
                <th className="py-3 px-3 text-left border-r border-slate-300 w-[10%]">Área de Interesse</th>
                <th className="py-3 px-3 text-left border-r border-slate-300 w-[10%]">Carreiras Indicadas</th>
                <th className="py-3 px-3 text-center w-[6%]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredM7Rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-bold italic bg-slate-50">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredM7Rows.map((row) => {
                  const isEditing = m7EditingId === row.id;
                  
                  // Helper style for profile badges
                  let badgeStyle = "bg-slate-100 text-slate-800 border-slate-300";
                  let emoji = "🧠";
                  if (row.profile.includes("Criativo e Tecnológico")) {
                    badgeStyle = "bg-purple-100 text-purple-900 border-purple-300";
                    emoji = "🎮";
                  } else if (row.profile.includes("Negócios e Gestão")) {
                    badgeStyle = "bg-red-100 text-red-900 border-red-300";
                    emoji = "💼";
                  } else if (row.profile.includes("Biológicas e Criativas")) {
                    badgeStyle = "bg-emerald-100 text-emerald-900 border-emerald-300";
                    emoji = "🌱";
                  } else if (row.profile.includes("Exatas e Tecnológicas")) {
                    badgeStyle = "bg-blue-100 text-blue-900 border-blue-300";
                    emoji = "📐";
                  } else if (row.profile.includes("Humanas e Sociais")) {
                    badgeStyle = "bg-indigo-100 text-indigo-900 border-indigo-300";
                    emoji = "👥";
                  }

                  return (
                        <tr
                          key={row.id}
                          className="border-b-2 border-slate-200 hover:bg-slate-50/50 transition-colors"
                        >
                      {isEditing && m7EditingData ? (
                        <>
                          <td className="py-3 px-3 align-top border-r border-slate-300">
                            <select
                              className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                              value={m7EditingData.profile}
                              onChange={(e) => setM7EditingData({ ...m7EditingData, profile: e.target.value })}
                            >
                              <option value="Criativo e Tecnológico (Perfil Híbrido)">🧩 Criativo e Tecnológico</option>
                              <option value="Negócios e Gestão">💼 Negócios e Gestão</option>
                              <option value="Biológicas e Criativas">🌱 Biológicas e Criativas</option>
                              <option value="Exatas e Tecnológicas">📐 Exatas e Tecnológicas</option>
                              <option value="Humanas e Sociais">👥 Humanas e Sociais</option>
                            </select>
                          </td>
                          <td className="py-3 px-3 align-top border-r border-slate-300">
                            <select
                              className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                              value={m7EditingData.component}
                              onChange={(e) => setM7EditingData({ ...m7EditingData, component: e.target.value })}
                            >
                              <option value="Mapa de Perfis e Carreiras">Mapa de Perfis e Carreiras</option>
                              <option value="Recomendações Pedagógicas">Recomendações Pedagógicas</option>
                            </select>
                          </td>
                          <td className="py-3 px-3 align-top border-r border-slate-300">
                            <textarea
                              className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold min-h-[100px] focus:ring-2 focus:ring-blue-600 outline-none resize-y"
                              value={m7EditingData.basicData}
                              onChange={(e) => setM7EditingData({ ...m7EditingData, basicData: e.target.value })}
                            />
                          </td>
                          <td className="py-3 px-3 align-top border-r border-slate-300">
                            <textarea
                              className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold min-h-[100px] focus:ring-2 focus:ring-blue-600 outline-none resize-y"
                              value={m7EditingData.reflection}
                              onChange={(e) => setM7EditingData({ ...m7EditingData, reflection: e.target.value })}
                            />
                          </td>
                          <td className="py-3 px-3 align-top border-r border-slate-300">
                            <textarea
                              className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold min-h-[60px] focus:ring-2 focus:ring-blue-600 outline-none resize-y"
                              value={m7EditingData.interestArea ?? ''}
                              onChange={(e) => setM7EditingData({ ...m7EditingData, interestArea: e.target.value })}
                            />
                          </td>
                          <td className="py-3 px-3 align-top border-r border-slate-300">
                            <textarea
                              className="p-2 border-2 border-slate-500 bg-white text-black rounded text-xs w-full font-bold min-h-[60px] focus:ring-2 focus:ring-blue-600 outline-none resize-y"
                              value={m7EditingData.careers ?? ''}
                              onChange={(e) => setM7EditingData({ ...m7EditingData, careers: e.target.value })}
                            />
                          </td>
                          <td className="py-3 px-3 align-top text-center">
                            <div className="flex flex-col gap-1.5 justify-center">
                              <button
                                onClick={m7SaveEditing}
                                className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1.5 rounded text-xs font-bold transition-all shadow-md active:scale-95 border border-green-700 cursor-pointer"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={m7CancelEditing}
                                className="bg-slate-500 hover:bg-slate-600 text-white px-2.5 py-1.5 rounded text-xs font-bold transition-all shadow-md active:scale-95 border border-slate-600 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-4 align-top border-r border-slate-300">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-[11px] font-black tracking-tight ${badgeStyle}`}>
                              <span>{emoji}</span>
                              <span>{row.profile}</span>
                            </span>
                          </td>
                          <td className="py-4 px-4 font-black text-slate-800 text-xs align-top border-r border-slate-300">
                            {row.component}
                          </td>
                          <td className="py-4 px-4 text-slate-900 font-bold text-xs align-top border-r border-slate-300 whitespace-pre-wrap leading-relaxed">
                            {row.basicData}
                          </td>
                          <td className="py-4 px-4 text-slate-700 font-medium text-xs leading-relaxed text-justify align-top border-r border-slate-300 whitespace-pre-wrap">
                            {row.reflection}
                          </td>
                          <td className="py-4 px-4 text-slate-900 font-bold text-xs align-top border-r border-slate-300 whitespace-pre-wrap">{row.interestArea}</td>
                          <td className="py-4 px-4 text-slate-900 font-bold text-xs align-top border-r border-slate-300 whitespace-pre-wrap">{row.careers}</td>
                          <td className="py-4 px-3 align-top text-center">
                            <div className="flex flex-col gap-1.5 justify-center">
                              <button
                                onClick={() => m7StartEditing(row)}
                                className="text-blue-700 hover:text-white flex items-center justify-center gap-1 font-bold text-[10px] bg-blue-100 hover:bg-blue-700 px-2 py-1 rounded transition-all cursor-pointer border border-blue-400"
                                title="Editar"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => m7DeleteRow(row.id)}
                                className="text-red-700 hover:text-white flex items-center justify-center gap-1 font-bold text-[10px] bg-red-100 hover:bg-red-700 px-2 py-1 rounded transition-all cursor-pointer border border-red-400"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal de Confirmação de Exclusão Módulo 7 */}
        {m7RowToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-300 w-full max-w-md rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150">
              <h4 className="text-lg font-black text-black uppercase tracking-tight mb-2 flex items-center gap-2 border-b pb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Confirmar Exclusão
              </h4>
              <p className="text-sm text-slate-700 mb-6 leading-relaxed">
                Tem certeza de que deseja excluir permanentemente o registro para o perfil{" "}
                <span className="text-black font-extrabold font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {m7RowToDelete.profile}
                </span>{" "}
                ({m7RowToDelete.component})? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setM7RowToDelete(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-black text-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteM7}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg text-xs shadow-md transition-colors cursor-pointer border border-red-700"
                >
                  Confirmar Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
