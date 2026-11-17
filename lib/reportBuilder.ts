// Construtor compartilhado de relatorios de performance (fonte unica de verdade).
// Usado tanto pela tela de Performance (botao "Adicionar Informacoes") quanto
// pela geracao automatica no salvamento de uma avaliacao (Avaliacoes).
// Cobre somente as 8 DIMENSOES DE AVALIACAO. 'Desempenho Escolar', 'Desempenho
// Completo' e outros permanecem na tela de Performance (dependem de frequencia).

import type {
  ImcRecord, MotorRecord, SportRecord, VocationalRecord,
  HealthRecord, OralRecord, AutoconceptRecord, IasRecord, SnapRecord, Aq10Record, PcdRecord,
} from '../types/edukyne';

export interface M4Item { classification: string; status: string; alertColor?: string; description: string; }
export interface M5Item { level: string; healthStatus: string; toImprove: string; recommendation: string; }
export interface M6Modalidade { name: string; valencias: string; condition: string; report: string; }
export interface M6Diretriz { diretriz: string; criterio: string; conduta: string; objetivo: string; }
export interface M7Row { profile: string; component: string; basicData: string; reflection: string; }
export interface ParecerRow { classification: string; basicData: string; reflection: string; }

export interface ReportBuildCtx {
  focusArea: string;
  studentName: string;
  studentGrade?: string;
  observations: string;
  dateStr: string;

  imcRecords: ImcRecord[]; selectedImcId: string; m4ImcData: M4Item[];
  motorRecords: MotorRecord[]; selectedMotorId: string; m5Data: Record<string, M5Item[]>;
  sportRecords: SportRecord[]; selectedSportId: string; selectedSportName: string;
  m6Modalidades: M6Modalidade[]; m6Diretrizes: M6Diretriz[];
  vocationRecords: VocationalRecord[]; selectedVocationId: string; m7Rows: M7Row[];
  healthRecords: HealthRecord[]; selectedHealthId: string; m9Rows: ParecerRow[];
  oralRecords: OralRecord[]; selectedOralId: string; m10Rows: ParecerRow[];
  autoconceptRecords: AutoconceptRecord[]; selectedAutoId: string; m11Rows: ParecerRow[];
  iasRecords: IasRecord[]; selectedIasId: string; m12Rows: ParecerRow[];
  snapRecords: SnapRecord[]; selectedSnapId: string; m13Rows: ParecerRow[];
  aq10Records: Aq10Record[]; selectedAq10Id: string; m14Rows: ParecerRow[];
  pcdRecords: PcdRecord[]; selectedPcdId: string;

  // Dados derivados (presenca/consolidacao), usados por 'Desempenho Escolar' e 'Desempenho Completo'.
  attendanceRate: number | null;
  presenceCount: number;
  totalCount: number;
  m3Analysis: { cenario?: string; parecerFrequencia?: string; parecerPais?: string } | null;
  existingReports: { focusArea: string; report: string }[];
}

const norm = (s: string) => (s || '').toLowerCase().trim();
const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export interface BuildResult { report: string; evaluationResult: string; }

// Retorna null se a dimensao nao for uma das 8 de avaliacao (fica a cargo da tela).
export function buildAssessmentReport(ctx: ReportBuildCtx): BuildResult | null {
  const {
    focusArea, studentName, observations, dateStr,
  } = ctx;

  if (focusArea === 'Desempenho Corporal') {
    const selectedImc = ctx.imcRecords.find(r => r.id === ctx.selectedImcId);
    if (!selectedImc) {
      return { evaluationResult: '', report: `### RELATÓRIO DE DESEMPENHO CORPORAL\n\nNenhum registro de IMC selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.` };
    }
    const match = ctx.m4ImcData.find(row => norm(row.classification) === norm(selectedImc.classification || ''));
    const classification = selectedImc.classification || 'Não classificado';
    const weight = selectedImc.weight || 'N/A';
    const height = selectedImc.height || 'N/A';
    const imcValue = selectedImc.imc || 'N/A';
    const statusM4 = match?.status || 'Aguardando Análise';
    const descriptionM4 = match?.description || 'Não há um parecer específico cadastrado para esta classificação.';
    const report = `### RELATÓRIO DE DESEMPENHO CORPORAL

#### DADOS DA AVALIAÇÃO (${selectedImc.date ? selectedImc.date.split('-').reverse().join('/') : 'N/A'})
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
    return { report, evaluationResult: classification };
  }

  if (focusArea === 'Desempenho de Capacidades Físicas') {
    const selectedMotor = ctx.motorRecords.find(r => r.id === ctx.selectedMotorId);
    if (!selectedMotor) {
      return { evaluationResult: '', report: `### RELATÓRIO DE DESEMPENHO DE CAPACIDADES FÍSICAS\n\nNenhum registro de Qualidade Motora selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.` };
    }
    const getCapDetail = (capKey: string, levelName: string) => {
      const rows = ctx.m5Data[capKey] || [];
      const found = rows.find(r => norm(r.level) === norm(levelName));
      return found || {
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
    const report = `### RELATÓRIO DE DESEMPENHO DE CAPACIDADES FÍSICAS

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
    return { report, evaluationResult: selectedMotor.generalClass || 'Excelente' };
  }

  if (focusArea === 'Desempenho em Atividades Esportivas') {
    const selectedSport = ctx.sportRecords.find(r => r.id === ctx.selectedSportId);
    if (!selectedSport) {
      return { evaluationResult: '', report: `### RELATÓRIO DE DESEMPENHO EM ATIVIDADES ESPORTIVAS\n\nNenhum registro de Esporte Indicado selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.` };
    }
    const rawActiveSportName = ctx.selectedSportName || selectedSport.suggestedSport || '';
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
    let report = '';
    if (isAprimorar) {
      const matchedDiretriz = ctx.m6Diretrizes.find(d => {
        const dirNorm = (d.diretriz || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
        return dirNorm.includes('aprimorar habilidades motoras') || dirNorm.includes('habilidades motoras');
      }) || {
        diretriz: "APRIMORAR HABILIDADES MOTORAS",
        criterio: "Esta via deve ser adotada se três ou mais valências físicas estiverem em níveis Insuficiente ou Regular.",
        conduta: "Desaconselho totalmente a especialização precoce em esportes com regras rígidas ou alta demanda competitiva neste momento. O foco pedagógico deve migrar para circuitos funcionais multiesportivos, jogos cooperativos e estimulação motora de base.",
        objetivo: "O foco exclusivo deste direcionamento é restaurar a integridade física do(a) jovem. Buscaremos o ganho de massa magra, ativação do tônus postural e melhora da coordenação global para que seu corpo esteja preparado e protegido antes de ser exposto a cargas esportivas avançadas."
      };
      report = `### RELATÓRIO DE DIRETRIZES DE INTERVENÇÃO MOTORAS

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
      const matchedMods = ctx.m6Modalidades.filter(modalidade => {
        const modNameNorm = (modalidade.name || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
        const selSportNorm = activeSportName.toLowerCase().trim().replace(/[^\w\s]/g, '');
        return modNameNorm.includes(selSportNorm) || selSportNorm.includes(modNameNorm);
      });
      const checkStudentEnquadramento = (mod: M6Modalidade) => {
        const modName = (mod.name || '').toUpperCase().replace(/[🥋🏐🏃swick⚽🤾🤸🏀♂♀\u200d\ufe0f]/g, '').trim();
        return modName.includes(activeSportName.toUpperCase().trim()) || activeSportName.toUpperCase().trim().includes(modName);
      };
      const activeMods = matchedMods.filter(mod => checkStudentEnquadramento(mod));
      const renderMod = (list: M6Modalidade[]) => list.map(mod => `##### **${(mod.name || '').replace(/[🥋🏐🏃🏊⚽🤾🤸🏀♂♀\u200d\ufe0f]/g, '').trim()}**
- **Valências Importantes:** ${mod.valencias}
- **Condição de Enquadramento:** ${mod.condition}
- **Parecer / Diretriz:** ${mod.report}`).join('\n\n');
      let matchedModalitiesText = '';
      if (activeMods.length > 0) matchedModalitiesText = renderMod(activeMods);
      else if (matchedMods.length > 0) matchedModalitiesText = renderMod(matchedMods);
      else matchedModalitiesText = `Não foi encontrado um enquadramento exato para a modalidade "${activeSportName}" nas tabelas de referência. 

No entanto, recomenda-se focar nas valências de força muscular, velocidade e agilidade exigidas por esportes de dinâmica similar.`;
      report = `### RELATÓRIO DE DESEMPENHO EM ATIVIDADES ESPORTIVAS

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
    return { report, evaluationResult: selectedSport.mainSkill || '' };
  }

  if (focusArea === 'Desempenho Vocacional') {
    const selectedVocation = ctx.vocationRecords.find(r => r.id === ctx.selectedVocationId);
    if (!selectedVocation) {
      return { evaluationResult: '', report: `### RELATÓRIO DE DESEMPENHO VOCACIONAL\n\nNenhum registro de Vocacionamento selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.` };
    }
    const profile = selectedVocation.profile || 'Não especificado';
    const normalizeProfileName = (name: string) => (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\(perfil hibrido\)/gi, '').replace(/hibrido/gi, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const targetNorm = normalizeProfileName(profile);
    const mapaRow = ctx.m7Rows.find(row => normalizeProfileName(row.profile) === targetNorm && row.component === 'Mapa de Perfis e Carreiras');
    const recRow = ctx.m7Rows.find(row => normalizeProfileName(row.profile) === targetNorm && row.component === 'Recomendações Pedagógicas');
    const basicDataMapa = mapaRow?.basicData || `Dados Básicos: Não cadastrados para o perfil ${profile} no Módulo 7.`;
    const reflectionMapa = mapaRow?.reflection || `Reflexão: Não cadastrada para o perfil ${profile} no Módulo 7.`;
    const basicDataRec = recRow?.basicData || `Diretrizes Pedagógicas: Não cadastradas para o perfil ${profile} no Módulo 7.`;
    const reflectionRec = recRow?.reflection || `Imersão de Mercado: Não cadastrada para o perfil ${profile} no Módulo 7.`;
    const report = `### RELATÓRIO DE DESEMPENHO VOCACIONAL

**ESTUDANTE:** ${studentName}
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
    return { report, evaluationResult: profile };
  }

  if (focusArea === 'Desempenho Saúde Global') {
    const selectedHealth = ctx.healthRecords.find(r => r.id === ctx.selectedHealthId);
    if (!selectedHealth) {
      return { evaluationResult: '', report: `### RELATÓRIO DE DESEMPENHO - SAÚDE GLOBAL\n\nNenhum registro de Saúde Global selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.` };
    }
    const classification = selectedHealth.classification || 'Não classificado';
    const m9match = ctx.m9Rows.find(row => normCls(row.classification) === normCls(classification));
    const basicData = m9match?.basicData || `Dados da classificação "${classification}" não cadastrados no Módulo 9.`;
    const reflection = m9match?.reflection || '';
    const report = `### RELATÓRIO DE DESEMPENHO - SAÚDE GLOBAL (KIDSCREEN-10)

**ESTUDANTE:** ${studentName}
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
    return { report, evaluationResult: classification };
  }

  if (focusArea === 'Desempenho Higiene Bucal') {
    const selectedOral = ctx.oralRecords.find(r => r.id === ctx.selectedOralId);
    if (!selectedOral) {
      return { evaluationResult: '', report: `### RELATÓRIO DE DESEMPENHO - HIGIENE BUCAL\n\nNenhum registro de Higiene Bucal selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.` };
    }
    const classification = selectedOral.classification || 'Não classificado';
    const m10match = ctx.m10Rows.find(row => normCls(row.classification) === normCls(classification));
    const basicData = m10match?.basicData || `Faixa da classificação "${classification}" não cadastrada no Módulo 10.`;
    const reflection = m10match?.reflection || '';
    const report = `### RELATÓRIO DE DESEMPENHO - HIGIENE BUCAL (HU-DBI)

**ESTUDANTE:** ${studentName}
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
    return { report, evaluationResult: classification };
  }

  if (focusArea === 'Desempenho Autoconceito') {
    const selectedAuto = ctx.autoconceptRecords.find(r => r.id === ctx.selectedAutoId);
    if (!selectedAuto) {
      return { evaluationResult: '', report: `### RELATÓRIO DE DESEMPENHO - AUTOCONCEITO\n\nNenhum registro de Autoconceito selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.` };
    }
    const classification = selectedAuto.classification || 'Não classificado';
    const m11match = ctx.m11Rows.find(row => normCls(row.classification) === normCls(classification));
    const basicData = m11match?.basicData || `Faixa da classificação "${classification}" não cadastrada no Módulo 11.`;
    const reflection = m11match?.reflection || '';
    const report = `### RELATÓRIO DE DESEMPENHO - AUTOCONCEITO (Escala de Rosenberg)

**ESTUDANTE:** ${studentName}
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
    return { report, evaluationResult: classification };
  }

  if (focusArea === 'Desempenho Índice Alimentar') {
    const selectedIas = ctx.iasRecords.find(r => r.id === ctx.selectedIasId);
    if (!selectedIas) {
      return { evaluationResult: '', report: `### RELATÓRIO DE DESEMPENHO - ÍNDICE ALIMENTAR\n\nNenhum registro de Índice Alimentar selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.` };
    }
    const classification = selectedIas.classification || 'Não classificado';
    const m12match = ctx.m12Rows.find(row => normCls(row.classification) === normCls(classification));
    const basicData = m12match?.basicData || `Faixa da classificação "${classification}" não cadastrada no Módulo 12.`;
    const reflection = m12match?.reflection || '';
    const report = `### RELATÓRIO DE DESEMPENHO - ÍNDICE ALIMENTAR (IAS)

**ESTUDANTE:** ${studentName}
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
    return { report, evaluationResult: classification };
  }

  if (focusArea === 'Desempenho Rastreamento TDAH') {
    const selectedSnap = ctx.snapRecords.find(r => r.id === ctx.selectedSnapId);
    if (!selectedSnap) {
      return { evaluationResult: '', report: `### RELATÓRIO DE DESEMPENHO - RASTREAMENTO TDAH\n\nNenhum registro de Rastreamento do TDAH selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.` };
    }
    const classification = selectedSnap.classification || 'Não classificado';
    const m13match = ctx.m13Rows.find(row => normCls(row.classification) === normCls(classification));
    const basicData = m13match?.basicData || `Critério da classificação "${classification}" não cadastrado no Módulo 13.`;
    const reflection = m13match?.reflection || '';
    const report = `### RELATÓRIO DE DESEMPENHO - RASTREAMENTO TDAH (SNAP-IV)

**ESTUDANTE:** ${studentName}
**DATA DA AVALIAÇÃO:** ${selectedSnap.date ? selectedSnap.date.split('-').reverse().join('/') : 'N/A'}
**RESPONDENTE DO RELATO:** ${selectedSnap.respondent || 'Não informado'}
**ITENS CLÍNICOS DE DESATENÇÃO:** ${selectedSnap.inattentionScore}/9
**ITENS CLÍNICOS DE HIPERATIVIDADE/IMPULSIVIDADE:** ${selectedSnap.hyperactivityScore}/9
**CLASSIFICAÇÃO:** ${classification}

---

#### 1. INTERPRETAÇÃO DO RESULTADO
- **Leitura:** ${basicData}

---

#### 2. PARECER DO EDUCADOR
${selectedSnap.technicalOpinion || reflection || 'Nenhum parecer técnico inserido no registro de Rastreamento do TDAH original.'}

#### 3. OBSERVAÇÕES COMPLEMENTARES DO EDUCADOR
${observations || 'Nenhuma observação complementar registrada para este período.'}

#### 4. CRITÉRIOS DIAGNÓSTICOS COMPLEMENTARES (DSM-5-TR - TDAH)
O SNAP-IV mapeia apenas o Critério A. A investigação diagnóstica completa exige a observação clínica dos demais critérios:
- **Critério B:** alguns sintomas presentes antes dos 12 anos de idade.
- **Critério C:** problemas causados pelos sintomas em pelo menos 2 contextos diferentes (escola, casa, vida social, trabalho).
- **Critério D:** prejuízos e problemas evidentes na vida escolar, social ou familiar.
- **Critério E:** exclusão de outras causas (os sintomas não podem ser atribuídos exclusivamente a outro quadro associado, como depressão, deficiência mental ou psicose). O DSM-5-TR permite o diagnóstico conjunto com TEA.

⚠️ ALERTA: Este questionário é exclusivamente uma ferramenta de rastreamento inicial e NÃO substitui ou constitui, sob hipótese alguma, um diagnóstico nosológico formal ou laudo médico conclusivo. O diagnóstico de TDAH exige longa anamnese conduzida por profissional médico especializado (psiquiatra, neurologista ou neuropediatra), além do mapeamento de possíveis comorbidades.

---
*Relatório de Rastreamento do TDAH (SNAP-IV) - ${dateStr}*`;
    return { report, evaluationResult: classification };
  }

  if (focusArea === 'Desempenho Rastreamento Precoce do TEA') {
    const selectedAq10 = ctx.aq10Records.find(r => r.id === ctx.selectedAq10Id);
    if (!selectedAq10) {
      return { evaluationResult: '', report: `### RELATÓRIO DE DESEMPENHO - RASTREAMENTO PRECOCE DO TEA\n\nNenhum registro de Rastreamento Precoce do TEA selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.` };
    }
    const classification = selectedAq10.classification || 'Não classificado';
    const m14match = ctx.m14Rows.find(row => normCls(row.classification) === normCls(classification));
    const basicData = m14match?.basicData || `Critério da classificação "${classification}" não cadastrado no Módulo 14.`;
    const reflection = m14match?.reflection || '';
    const versionLabel = selectedAq10.version === 'adolescente' ? 'Adolescente (12-15)' : 'Criança (4-11)';
    const report = `### RELATÓRIO DE DESEMPENHO - RASTREAMENTO PRECOCE DO TEA (AQ-10)

**ESTUDANTE:** ${studentName}
**DATA DA AVALIAÇÃO:** ${selectedAq10.date ? selectedAq10.date.split('-').reverse().join('/') : 'N/A'}
**RESPONDENTE DO RELATO:** ${selectedAq10.respondent || 'Não informado'}
**VERSÃO DO QUESTIONÁRIO:** ${versionLabel}
**PONTUAÇÃO TOTAL:** ${selectedAq10.totalScore}/10
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

> **Alerta Fundamental:** O AQ-10 é um instrumento de rastreamento (triagem) e NÃO constitui, sob hipótese alguma, um diagnóstico formal de TEA. O diagnóstico definitivo exige avaliação clínica multidisciplinar por profissionais de saúde habilitados, considerando anamnese, observação comportamental e instrumentos especializados.

---
*Relatório de Rastreamento Precoce do TEA (AQ-10) - ${dateStr}*`;
    return { report, evaluationResult: classification };
  }

  if (focusArea === 'Desempenho Qualidade Motora PCD') {
    const selectedPcd = ctx.pcdRecords.find(r => r.id === ctx.selectedPcdId);
    if (!selectedPcd) {
      return { evaluationResult: '', report: `### RELATÓRIO DE DESEMPENHO - QUALIDADE MOTORA PCD\n\nNenhum registro de Avaliação PCD selecionado ou encontrado para este aluno. Por favor, realize uma avaliação na área de Avaliações primeiro.` };
    }
    const valenciaLabels: { label: string; nota: number }[] = [
      { label: 'Velocidade e Agilidade', nota: selectedPcd.notaVelAgil },
      { label: 'Força Explosiva (Membros Inf.)', nota: selectedPcd.notaForcaExplosiva },
      { label: 'Força Membros Superiores', nota: selectedPcd.notaMembrosSup },
      { label: 'Estabilidade de Tronco / Core', nota: selectedPcd.notaCore },
    ];
    const valenciaStr = valenciaLabels.map(v => `- **${v.label}:** nota ${v.nota} (de 1 a 3)`).join('\n');
    const compStr = (selectedPcd.compatibilidade && selectedPcd.compatibilidade.length > 0
      ? selectedPcd.compatibilidade.map((c, i) => `${i + 1}. ${c.modalidade} — IAR ${c.iar.toFixed(2)} (bruto)${c.iarNormalizado != null ? ` · normalizado ${c.iarNormalizado.toFixed(2)}/3` : ''}`).join('\n')
      : '- Sem dados de compatibilidade registrados.');
    const funil = selectedPcd.funil ?? [];
    const funilStr = funil.length > 0
      ? funil.map(f => `${f.momento}. **${f.titulo}:** ${f.regra}`).join('\n')
      : '- Funil qualitativo não registrado nesta avaliação.';
    const adaptStr = (selectedPcd.adaptacoesAplicadas ?? [])
      .filter(a => a.status === 'Adaptado' || a.status === 'Substituído')
      .map(a => `- **${a.teste}** (${a.status}): ${a.instrucao}`).join('\n');
    const topModalidade = selectedPcd.compatibilidade && selectedPcd.compatibilidade.length > 0 ? selectedPcd.compatibilidade[0].modalidade : 'A complementar';
    const report = `### RELATÓRIO DE DESEMPENHO - QUALIDADE MOTORA PCD

**ESTUDANTE:** ${studentName}
**DATA DA AVALIAÇÃO:** ${selectedPcd.date ? selectedPcd.date.split('-').reverse().join('/') : 'N/A'}
**GRUPO DE TRIAGEM:** ${selectedPcd.grupoNome || `Grupo ${selectedPcd.grupo}`}
**CLASSIFICAÇÃO / DETALHE:** ${selectedPcd.detalheClassificacao || 'Geral'}
**PERFIL MOTOR:** ${selectedPcd.classificacaoPerfil}

---

#### 1. VALÊNCIAS DOMINANTES (NOTAS 1 A 3)
${valenciaStr}

---

#### 2. MATRIZ DE COMPATIBILIDADE ESPORTIVA
${compStr}

> **Nota metodológica:** o IAR é uma soma ponderada e, portanto, sensível a quanto cada modalidade valoriza cada capacidade e a quais capacidades foram efetivamente avaliadas. Avaliações incompletas produzem rankings parciais. O índice é orientativo e não substitui o funil qualitativo.

---

#### 3. MODALIDADE SUGERIDA (INDICAÇÃO PRELIMINAR)
- **${topModalidade}**
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
    return { report, evaluationResult: selectedPcd.classificacaoPerfil };
  }

  const rate = ctx.attendanceRate !== null ? ctx.attendanceRate.toFixed(1) : 'N/A';
  const absenceRate = ctx.attendanceRate !== null ? (100 - ctx.attendanceRate).toFixed(1) : 'N/A';
  const attendanceStatus = ctx.attendanceRate !== null ? (ctx.attendanceRate >= 75 ? 'Excelente' : ctx.attendanceRate >= 50 ? 'Regular' : 'Crítico') : 'N/A';

  if (focusArea === 'Desempenho Escolar') {
    const scenario = ctx.m3Analysis?.cenario || (ctx.attendanceRate !== null ? (ctx.attendanceRate >= 50 ? 'A' : 'B') : 'C');
    let scenarioText = ''; let frequencyText = ''; let parentsText = ''; let impactosText = '';
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
    const absenceCount = ctx.totalCount - ctx.presenceCount;
    const report = `### FREQUÊNCIA ESCOLAR ACUMULADA: ${rate}% (${attendanceStatus})

#### RESUMO DO CÁLCULO
| Categoria | Quantidade | Porcentagem |
| **Total** | ${ctx.totalCount} | 100% |
| **Presenças** | ${ctx.presenceCount} | ${rate}% (Frequência) |
| **Faltas** | ${absenceCount} | ${absenceRate}% |

#### 1. Análise de Cenário
**${scenarioText}**

#### 2. Parecer de Frequência
${ctx.m3Analysis?.parecerFrequencia || frequencyText}

#### 3. Orientações aos Pais e Responsáveis
${ctx.m3Analysis?.parecerPais || parentsText}

${impactosText}

#### 4. Observações Complementares
${observations || 'Nenhuma observação adicional registrada.'}

---
*Relatório de desempenho escolar acumulado - ${dateStr}*`;
    return { report, evaluationResult: '' };
  }

  if (focusArea === 'Desempenho Completo') {
    const find = (fa: string) => ctx.existingReports.find(r => r.focusArea === fa);
    const cleanSub = (t: string) => (t || '').replace(/#+/g, '').replace(/\*\*/g, '').replace(/^\s*\d+\.\s+(?=[A-ZÀ-Ú])/gm, '');
    const emb = (r?: { report: string }, label = '') => (r ? cleanSub(r.report) : `*Nenhum relatório de ${label} foi encontrado no histórico.*`);
    const reportEscolar = find('Desempenho Escolar');
    const reportCorporal = find('Desempenho Corporal');
    const reportMotor = find('Desempenho de Capacidades Físicas');
    const reportEsportivo = find('Desempenho em Atividades Esportivas');
    const reportVocacional = find('Desempenho Vocacional');
    const reportSaudeGlobal = find('Desempenho Saúde Global');
    const reportHigieneBucal = find('Desempenho Higiene Bucal');
    const reportAutoconcept = find('Desempenho Autoconceito');
    const reportIas = find('Desempenho Índice Alimentar');
    const reportSnap = find('Desempenho Rastreamento TDAH');
    const reportAq10 = find('Desempenho Rastreamento Precoce do TEA');
    const reportPcd = find('Desempenho Qualidade Motora PCD');
    const hasAny = !!(reportEscolar || reportCorporal || reportMotor || reportEsportivo || reportVocacional || reportSaudeGlobal || reportHigieneBucal || reportAutoconcept || reportIas || reportSnap || reportAq10 || reportPcd);
    if (!hasAny) {
      return { evaluationResult: '', report: `### PARECER INTEGRADO DE DESEMPENHO COMPLETO\n\n**ESTUDANTE:** ${studentName}\n\n**AVISO:** Nenhum relatório de dimensão individual foi encontrado ainda para este estudante. Os relatórios são gerados automaticamente conforme as avaliações são concluídas.` };
    }
    const report = `### PARECER INTEGRADO DE DESEMPENHO COMPLETO

**ESTUDANTE:** ${studentName}
**TURMA:** ${ctx.studentGrade || 'Não informada'}
**DATA DE CONSOLIDAÇÃO:** ${dateStr}

---

#### APRESENTAÇÃO
Este documento consolida e integra de forma sistêmica as dimensões multidisciplinares de acompanhamento do estudante **${studentName}**.

---

## 1. DIMENSÃO ESCOLAR (FREQUÊNCIA E ENGAJAMENTO)
${emb(reportEscolar, 'Desempenho Escolar')}

---

## 2. DIMENSÃO CORPORAL (COMPOSIÇÃO E IMC)
${emb(reportCorporal, 'Desempenho Corporal')}

---

## 3. DIMENSÃO DE CAPACIDADES FÍSICAS (QUALIDADE MOTORA)
${emb(reportMotor, 'Capacidades Físicas')}

---

## 4. DIMENSÃO ESPORTIVA (DIRECIONAMENTO POR MODALIDADE)
${emb(reportEsportivo, 'Desempenho Esportivo')}

---

## 5. DIMENSÃO VOCACIONAL (PERFIS E CARREIRAS DE MODALIDADE)
${emb(reportVocacional, 'Desempenho Vocacional')}

---

## 6. DIMENSÃO SAÚDE GLOBAL (KIDSCREEN-10)
${emb(reportSaudeGlobal, 'Saúde Global')}

---

## 7. DIMENSÃO HIGIENE BUCAL (HU-DBI)
${emb(reportHigieneBucal, 'Higiene Bucal')}

---

## 8. DIMENSÃO AUTOCONCEITO (ESCALA DE ROSENBERG)
${emb(reportAutoconcept, 'Autoconceito')}

---

## 9. DIMENSÃO ÍNDICE ALIMENTAR (IAS)
${emb(reportIas, 'Índice Alimentar')}

---

## 10. DIMENSÃO RASTREAMENTO TDAH (SNAP-IV)
${emb(reportSnap, 'Rastreamento TDAH')}

---

## 11. DIMENSÃO RASTREAMENTO PRECOCE DO TEA (AQ-10)
${emb(reportAq10, 'Rastreamento Precoce do TEA')}

---

## 12. DIMENSÃO QUALIDADE MOTORA PCD
${emb(reportPcd, 'Qualidade Motora PCD')}

---
*Relatório Consolidado de Desempenho Completo Integrado - ${dateStr}*`;;
    return { report, evaluationResult: '' };
  }

  return null;
}

// Mapeia o tipo de avaliacao salvo -> dimensao de foco correspondente.
export const FOCUS_BY_ASSESSMENT: Record<string, string> = {
  imc: 'Desempenho Corporal',
  motor: 'Desempenho de Capacidades Físicas',
  sport: 'Desempenho em Atividades Esportivas',
  vocational: 'Desempenho Vocacional',
  health: 'Desempenho Saúde Global',
  oral: 'Desempenho Higiene Bucal',
  autoconcept: 'Desempenho Autoconceito',
  ias: 'Desempenho Índice Alimentar',
  snap: 'Desempenho Rastreamento TDAH',
  aq10: 'Desempenho Rastreamento Precoce do TEA',
  pcd: 'Desempenho Qualidade Motora PCD',
};
