import {createTranslator, type AbstractIntlMessages} from 'use-intl';
import {routing} from '../i18n/routing';
import ptBR from '../messages/pt-BR.json';
import ptPT from '../messages/pt-PT.json';
import esPY from '../messages/es-PY.json';
import gnPY from '../messages/gn-PY.json';
import en from '../messages/en.json';
import type {BuildResult, ReportBuildCtx} from './reportBuilder';

type AppLocale = (typeof routing.locales)[number];

export type ReportTranslator = (key: string, values?: Record<string, string | number>) => string;

const messages: Record<AppLocale, AbstractIntlMessages> = {
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  'es-PY': esPY,
  'gn-PY': gnPY,
  en
};

const DISPLAY_KEYS: Record<string, string> = {
  'GINÁSTICA (Artística / Rítmica)': 'valorGinasticaArtisticaRitmica',
  'FUTEBOL / FUTSAL': 'valorFutebolFutsal',
  'VÔLEI': 'valorVolei',
  'LUTAS / ARTES MARCIAIS': 'valorLutasArtesMarciais',
  'NATAÇÃO': 'valorNatacao',
  'APRIMORAR HABILIDADES MOTORAS': 'valorAprimorarHabilidadesMotoras',
  'Desempenho Escolar': 'valorDesempenhoEscolar',
  'Desempenho Corporal': 'valorDesempenhoCorporal',
  'Desempenho de Capacidades Físicas': 'valorDesempenhoDeCapacidadesFisicas',
  'Desempenho em Atividades Esportivas': 'valorDesempenhoEmAtividadesEsportivas',
  'Desempenho Vocacional': 'valorDesempenhoVocacional',
  'Desempenho Saúde Global': 'valorDesempenhoSaudeGlobal',
  'Desempenho Higiene Bucal': 'valorDesempenhoHigieneBucal',
  'Desempenho Autoconceito': 'valorDesempenhoAutoconceito',
  'Desempenho Índice Alimentar': 'valorDesempenhoIndiceAlimentar',
  'Desempenho Rastreamento TDAH': 'valorDesempenhoRastreamentoTdah',
  'Desempenho Rastreamento Precoce do TEA': 'valorDesempenhoRastreamentoPrecoceDoTea',
  'Desempenho Qualidade Motora PCD': 'valorDesempenhoQualidadeMotoraPcd',
  'Desempenho Completo': 'valorDesempenhoCompleto',
  'Avaliação de IMC': 'valorAvaliacaoDeImc',
  'Desempenho de capacidades físicas': 'valorDesempenhoDeCapacidadesFisicas2',
  'Qualidade Motora': 'valorQualidadeMotora',
  'Avaliação Esportiva': 'valorAvaliacaoEsportiva',
  'Desempenho vocacional': 'valorDesempenhoVocacional2',
  'Perfil Vocacional': 'valorPerfilVocacional',
  'Não informado': 'valorNaoInformado',
  'CENÁRIO A – MAIS PRESENÇAS DO QUE FALTAS': 'valorCenarioAMaisPresencasDoQueFaltas',
  'O estudante demonstrou excelente regularidade e compromisso com a rotina escolar ao longo deste período. A baixa taxa de absenteísmo reflete uma postura participativa e engajada com o ambiente de aprendizagem.': 'valorOEstudanteDemonstrouExcelenteRegularidadeECompromisso',
  'Parabéns pelo incentivo e parceria. A presença constante tem sido o pilar para os bons resultados mantidos até aqui.': 'valorParabensPeloIncentivoEParceriaAPresenca',
  '### Matriz de Impactos Pedagógicos\n- **Continuidade Pedagógica**: Quando presente, o aluno acompanha as explicações passo a passo, facilitando a execução de tarefas complexas.\n- **Socialização Ativa**: A convivência diária fortalece os vínculos com professores e colegas, desenvolvendo inteligência emocional e trabalho em equipe.\n- **Ritmo de Avaliação**: Menor necessidade de aplicação de provas substitutivas ou trabalhos de recuperação de nota por perda de prazos.': 'valorMatrizDeImpactosPedagogicosContinuidadePedagogicaQuando',
  'CENÁRIO B – MAIS FALTAS DO QUE PRESENÇAS': 'valorCenarioBMaisFaltasDoQuePresencas',
  'Identificamos um número crítico de ausências neste período, superando os dias de comparecimento em sala de aula. Esse padrão de faltas excessivas acende um alerta pedagógico, pois interrompe a sequência didática e prejudica a absorção dos conteúdos ministrados.': 'valorIdentificamosUmNumeroCriticoDeAusenciasNeste',
  'Solicitamos uma atenção especial e um diálogo familiar para identificarmos o motivo das ausências. É fundamental restabelecer a rotina de idas à escola para evitar prejuízos severos na avaliação final deste ciclo.': 'valorSolicitamosUmaAtencaoEspecialEUmDialogo',
  '### Matriz de Impactos Pedagógicos\n- **Lacunas de Conteúdo**: Cada ausência gera a perda de conceitos-chave, acumulando dúvidas para as unidades seguintes.\n- **Desengajamento Escolar**: O excesso de faltas quebra a rotina do estudante, gerando desmotivação e sensação de isolamento em relação à turma.\n- **Sobrecarga de Tarefas**: Acúmulo de atividades pendentes que precisam ser realizadas em casa para cumprir as exigências do ano letivo.': 'valorMatrizDeImpactosPedagogicosLacunasDeConteudo',
  'CENÁRIO C – SEM REGISTROS SUFICIENTES': 'valorCenarioCSemRegistrosSuficientes',
  'Até o momento, não foram identificados registros de presença ou ausência suficientes para o estudante no sistema neste período. A ausência de dados impede uma avaliação precisa do acompanhamento escolar.': 'valorAteOMomentoNaoForamIdentificadosRegistros',
  'Solicitamos que entrem em contato com a secretaria escolar para a regularização dos registros de frequência.': 'valorSolicitamosQueEntremEmContatoComA',
  '### Matriz de Impactos Pedagógicos\n- **Inconsistência de Dados**: A falta de registros impede a análise de evolução pedagógica.\n- **Alerta de Monitoramento**: Recomenda-se a verificação imediata da rotina de frequência.': 'valorMatrizDeImpactosPedagogicosInconsistenciaDeDados',
  'Nenhuma observação adicional registrada.': 'valorNenhumaObservacaoAdicionalRegistrada',
  'Não classificado': 'valorNaoClassificado',
  'Aguardando Análise': 'valorAguardandoAnalise',
  'Não há um parecer específico cadastrado para esta classificação.': 'valorNaoHaUmParecerEspecificoCadastradoPara',
  'Nenhuma observação específica registrada pelo educador para este período.': 'valorNenhumaObservacaoEspecificaRegistradaPeloEducadorPara',
  'Não avaliado': 'valorNaoAvaliado',
  'Nenhuma observação complementar registrada.': 'valorNenhumaObservacaoComplementarRegistrada',
  'Não especificado': 'valorNaoEspecificado',
  'Nenhum parecer técnico inserido no registro de vocacionamento original.': 'valorNenhumParecerTecnicoInseridoNoRegistroDe',
  'Nenhuma observação complementar registrada para este período.': 'valorNenhumaObservacaoComplementarRegistradaParaEstePeriodo',
  'Nenhum parecer técnico inserido no registro de Saúde Global original.': 'valorNenhumParecerTecnicoInseridoNoRegistroDe2',
  'Nenhum parecer técnico inserido no registro de Higiene Bucal original.': 'valorNenhumParecerTecnicoInseridoNoRegistroDe3',
  'Nenhum parecer técnico inserido no registro de Autoconceito original.': 'valorNenhumParecerTecnicoInseridoNoRegistroDe4',
  'Nenhum parecer técnico inserido no registro de Índice Alimentar original.': 'valorNenhumParecerTecnicoInseridoNoRegistroDe5',
  'Nenhum parecer técnico inserido no registro de Rastreamento do TDAH original.': 'valorNenhumParecerTecnicoInseridoNoRegistroDe6',
  'Nenhum parecer técnico inserido no registro de Rastreamento Precoce do TEA original.': 'valorNenhumParecerTecnicoInseridoNoRegistroDe7',
  'Não classificada': 'valorNaoClassificada',
  'Geral': 'valorGeral',
  '- Funil qualitativo não registrado nesta avaliação.': 'uiFunilQualitativoNaoRegistradoNestaAvaliacao',
  'A complementar': 'uiAComplementar',
  '- Nenhum teste adaptado ou substituído neste grupo.': 'valorNenhumTesteAdaptadoOuSubstituidoNesteGrupo',
  'Nenhum parecer técnico inserido no registro de Avaliação PCD original.': 'valorNenhumParecerTecnicoInseridoNoRegistroDe8',
  'Não informada': 'valorNaoInformada',
  'Excelente': 'valorExcelente',
  'Regular': 'valorRegular',
  'Crítico': 'uiCritico',
  'Força Muscular': 'valorForcaMuscular',
  'Impulsão': 'valorImpulsao',
  'Velocidade e Agilidade': 'uiVelocidadeEAgilidade',
  'Força Explosiva (Membros Inf.)': 'uiForcaExplosivaMembrosInf',
  'Força Membros Superiores': 'uiForcaMembrosSuperiores',
  'Estabilidade de Tronco / Core': 'uiEstabilidadeDeTroncoCore',
  '*Nenhum relatório de Desempenho Escolar foi encontrado no histórico.*': 'valorSemRelatorioEscolar',
  '*Nenhum relatório de Desempenho Corporal foi encontrado no histórico.*': 'valorSemRelatorioCorporal',
  '*Nenhum relatório de Capacidades Físicas foi encontrado no histórico.*': 'valorSemRelatorioCapacidades',
  '*Nenhum relatório de Desempenho Esportivo foi encontrado no histórico.*': 'valorSemRelatorioEsportivo',
  '*Nenhum relatório de Desempenho Vocacional foi encontrado no histórico.*': 'valorSemRelatorioVocacional',
  '*Nenhum relatório de Saúde Global foi encontrado no histórico.*': 'valorSemRelatorioSaude',
  '*Nenhum relatório de Higiene Bucal foi encontrado no histórico.*': 'valorSemRelatorioHigiene',
  '*Nenhum relatório de Autoconceito foi encontrado no histórico.*': 'valorSemRelatorioAutoconceito',
  '*Nenhum relatório de Índice Alimentar foi encontrado no histórico.*': 'valorSemRelatorioIas'
};

export function displayValue(value: unknown, t: (key: string) => string): string {
  const text = String(value ?? '');
  return DISPLAY_KEYS[text] ? t(DISPLAY_KEYS[text]) : text;
}

export function createReportTranslator(locale: string): ReportTranslator {
  const resolved = (routing.locales as readonly string[]).includes(locale)
    ? locale as AppLocale
    : routing.defaultLocale as AppLocale;
  return createTranslator({locale: resolved, messages: messages[resolved], namespace: 'desempenho'}) as unknown as ReportTranslator;
}

export function localizeAssessmentReport(ctx: ReportBuildCtx, t: ReportTranslator): BuildResult | null {
  const dv = (value: unknown) => displayValue(value, t);
  const formatDate = (value?: string) => (value ? value.split('-').reverse().join('/') : 'N/A');
  const {focusArea, studentName, observations, dateStr} = ctx;

  if (focusArea === 'Desempenho Corporal') {
    const selectedImc = ctx.imcRecords.find(r => r.id === ctx.selectedImcId);
    if (!selectedImc) return {evaluationResult: '', report: t('valorRelatorioDeDesempenhoCorporalNenhumRegistroDe')};
    const match = ctx.m4ImcData.find(row => row.classification.toLowerCase().trim() === (selectedImc.classification || '').toLowerCase().trim());
    const classification = selectedImc.classification || t('valorNaoClassificado');
    const statusM4 = match?.status || t('valorAguardandoAnalise');
    const descriptionM4 = match?.description || t('valorNaoHaUmParecerEspecificoCadastradoPara');
    const report = t('tplRelatorioDeDesempenhoCorporalDadosDaAvaliacao', {
      p0: dv(formatDate(selectedImc.date)),
      p1: dv(selectedImc.weight || 'N/A'),
      p2: dv(selectedImc.height || 'N/A'),
      p3: dv(selectedImc.imc || 'N/A'),
      p4: dv(classification),
      p5: dv(statusM4),
      p6: dv(descriptionM4),
      p7: dv(observations || t('valorNenhumaObservacaoAdicionalRegistrada')),
      p8: dv(dateStr)
    });
    return {report, evaluationResult: classification};
  }

  if (focusArea === 'Desempenho de Capacidades Físicas') {
    const selectedMotor = ctx.motorRecords.find(r => r.id === ctx.selectedMotorId);
    if (!selectedMotor) return {evaluationResult: '', report: t('valorRelatorioDeDesempenhoDeCapacidadesFisicasNenhum')};
    const getCapDetail = (capKey: string, levelName: string) => {
      const rows = ctx.m5Data[capKey] || [];
      const found = rows.find(r => (r.level || '').toLowerCase().trim() === (levelName || '').toLowerCase().trim());
      const capName = capKey === 'forca_muscular' ? t('valorForcaMuscular') : capKey === 'impulsao' ? t('valorImpulsao') : capKey.charAt(0).toUpperCase() + capKey.slice(1);
      return found || {
        healthStatus: t('tplACapacidadeDeCapkeyForcaMuscularForca', {p0: dv(capName), p1: dv(levelName)}),
        toImprove: t('tplFocarEmAtividadesProgressivasEAdaptadasPara', {p0: dv(capName)}),
        recommendation: t('textoEstimularAtividadesMotoras')
      };
    };
    const vel = getCapDetail('velocidade', selectedMotor.speed || t('valorExcelente'));
    const forca = getCapDetail('forca_muscular', selectedMotor.strength || t('valorExcelente'));
    const agil = getCapDetail('agilidade', selectedMotor.agility || t('valorExcelente'));
    const abdomen = getCapDetail('abdomen', selectedMotor.abdomen || selectedMotor.coordination || t('valorExcelente'));
    const impulsao = getCapDetail('impulsao', selectedMotor.impulsao || selectedMotor.flexibility || t('valorExcelente'));
    const report = t('tplRelatorioDeDesempenhoDeCapacidadesFisicasDados', {
      p0: dv(formatDate(selectedMotor.date)),
      p1: dv(selectedMotor.speed || t('valorExcelente')),
      p2: dv(selectedMotor.strength || t('valorExcelente')),
      p3: dv(selectedMotor.agility || t('valorExcelente')),
      p4: dv(selectedMotor.abdomen || selectedMotor.coordination || t('valorExcelente')),
      p5: dv(selectedMotor.impulsao || selectedMotor.flexibility || t('valorExcelente')),
      p6: dv(selectedMotor.generalClass || t('valorExcelente')),
      p7: dv(selectedMotor.speed || t('valorExcelente')),
      p8: dv(vel.healthStatus),
      p9: dv(vel.toImprove),
      p10: dv(vel.recommendation),
      p11: dv(selectedMotor.strength || t('valorExcelente')),
      p12: dv(forca.healthStatus),
      p13: dv(forca.toImprove),
      p14: dv(forca.recommendation),
      p15: dv(selectedMotor.agility || t('valorExcelente')),
      p16: dv(agil.healthStatus),
      p17: dv(agil.toImprove),
      p18: dv(agil.recommendation),
      p19: dv(selectedMotor.abdomen || selectedMotor.coordination || t('valorExcelente')),
      p20: dv(abdomen.healthStatus),
      p21: dv(abdomen.toImprove),
      p22: dv(abdomen.recommendation),
      p23: dv(selectedMotor.impulsao || selectedMotor.flexibility || t('valorExcelente')),
      p24: dv(impulsao.healthStatus),
      p25: dv(impulsao.toImprove),
      p26: dv(impulsao.recommendation),
      p27: dv(observations || t('valorNenhumaObservacaoEspecificaRegistradaPeloEducadorPara')),
      p28: dv(dateStr)
    });
    return {report, evaluationResult: selectedMotor.generalClass || t('valorExcelente')};
  }

  if (focusArea === 'Desempenho em Atividades Esportivas') {
    const selectedSport = ctx.sportRecords.find(r => r.id === ctx.selectedSportId);
    if (!selectedSport) return {evaluationResult: '', report: t('valorRelatorioDeDesempenhoEmAtividadesEsportivasNenhum')};
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

    if (isAprimorar) {
      const matchedDiretriz = ctx.m6Diretrizes.find(d => {
        const dirNorm = (d.diretriz || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
        return dirNorm.includes('aprimorar habilidades motoras') || dirNorm.includes('habilidades motoras');
      }) || {
        diretriz: t('valorAprimorarHabilidadesMotoras'),
        criterio: t('textoEstaViaDeveSerAdotadaSeTres'),
        conduta: t('textoDesaconselhoTotalmenteAEspecializacaoPrecoceEmEsportes'),
        objetivo: t('textoOFocoExclusivoDesteDirecionamentoERestaurar')
      };
      return {
        evaluationResult: selectedSport.mainSkill || '',
        report: t('tplRelatorioDeDiretrizesDeIntervencaoMotorasDados', {
          p0: dv(formatDate(selectedSport.date)),
          p1: dv(selectedSport.biotype || t('valorNaoAvaliado')),
          p2: dv(selectedSport.mainSkill || t('valorNaoAvaliado')),
          p3: dv(activeSportName),
          p4: dv(selectedSport.recommendedPractice || t('valorNaoAvaliado')),
          p5: dv(matchedDiretriz.diretriz),
          p6: dv(matchedDiretriz.criterio),
          p7: dv(matchedDiretriz.conduta),
          p8: dv(matchedDiretriz.objetivo),
          p9: dv(observations || t('valorNenhumaObservacaoComplementarRegistrada')),
          p10: dv(dateStr)
        })
      };
    }

    const matchedMods = ctx.m6Modalidades.filter(modalidade => {
      const modNameNorm = (modalidade.name || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
      const selSportNorm = activeSportName.toLowerCase().trim().replace(/[^\w\s]/g, '');
      return modNameNorm.includes(selSportNorm) || selSportNorm.includes(modNameNorm);
    });
    const checkStudentEnquadramento = (mod: (typeof ctx.m6Modalidades)[number]) => {
      const modName = (mod.name || '').toUpperCase().replace(/[🥋🏐🏃swick⚽🤾🤸🏀♂♀\u200d\ufe0f]/g, '').trim();
      const sportUpper = activeSportName.toUpperCase().trim();
      return modName.includes(sportUpper) || sportUpper.includes(modName);
    };
    const activeMods = matchedMods.filter(checkStudentEnquadramento);
    const renderMod = (list: (typeof ctx.m6Modalidades)[number][]) => list.map(mod => t('tplModNameReplaceU200dUfe0fGTrim', {
      p0: dv((mod.name || '').replace(/[🥋🏐🏃🏊⚽🤾🤸🏀♂♀\u200d\ufe0f]/g, '').trim()),
      p1: dv(mod.valencias),
      p2: dv(mod.condition),
      p3: dv(mod.report)
    })).join('\n\n');
    const matchedModalitiesText = activeMods.length > 0
      ? renderMod(activeMods)
      : matchedMods.length > 0
        ? renderMod(matchedMods)
        : t('tplNaoFoiEncontradoUmEnquadramentoExatoPara', {p0: dv(activeSportName)});
    const report = t('tplRelatorioDeDesempenhoEmAtividadesEsportivasDados', {
      p0: dv(formatDate(selectedSport.date)),
      p1: dv(selectedSport.biotype || t('valorNaoAvaliado')),
      p2: dv(selectedSport.mainSkill || t('valorNaoAvaliado')),
      p3: dv(activeSportName),
      p4: dv(selectedSport.recommendedPractice || t('valorNaoAvaliado')),
      p5: dv(matchedModalitiesText),
      p6: dv(observations || t('valorNenhumaObservacaoComplementarRegistrada')),
      p7: dv(dateStr)
    });
    return {report, evaluationResult: selectedSport.mainSkill || ''};
  }

  if (focusArea === 'Desempenho Vocacional') {
    const selectedVocation = ctx.vocationRecords.find(r => r.id === ctx.selectedVocationId);
    if (!selectedVocation) return {evaluationResult: '', report: t('valorRelatorioDeDesempenhoVocacionalNenhumRegistroDe')};
    const profile = selectedVocation.profile || t('valorNaoEspecificado');
    const normalizeProfileName = (name: string) => (name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\(perfil hibrido\)/gi, '')
      .replace(/hibrido/gi, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const targetNorm = normalizeProfileName(profile);
    const mapaLabel = t('uiMapaDePerfisECarreiras');
    const recLabel = t('uiRecomendacoesPedagogicas');
    const mapaRow = ctx.m7Rows.find(row => normalizeProfileName(row.profile) === targetNorm && (row.component === 'Mapa de Perfis e Carreiras' || row.component === mapaLabel));
    const recRow = ctx.m7Rows.find(row => normalizeProfileName(row.profile) === targetNorm && (row.component === 'Recomendações Pedagógicas' || row.component === recLabel));
    const basicDataMapa = mapaRow?.basicData || t('tplDadosBasicosNaoCadastradosParaOPerfil', {p0: dv(profile)});
    const reflectionMapa = mapaRow?.reflection || t('tplReflexaoNaoCadastradaParaOPerfilProfile', {p0: dv(profile)});
    const basicDataRec = recRow?.basicData || t('tplDiretrizesPedagogicasNaoCadastradasParaOPerfil', {p0: dv(profile)});
    const reflectionRec = recRow?.reflection || t('tplImersaoDeMercadoNaoCadastradaParaO', {p0: dv(profile)});
    const analysis = reflectionMapa !== (selectedVocation.technicalOpinion || '')
      ? t('tplAnaliseCognitivaPsicologica', {p0: dv(reflectionMapa)})
      : '';
    const report = t('tplRelatorioDeDesempenhoVocacionalEstudanteStudentobjName', {
      p0: dv(studentName),
      p1: dv(formatDate(selectedVocation.date)),
      p2: dv(profile),
      p3: dv(basicDataMapa),
      p4: dv(analysis),
      p5: dv(basicDataRec),
      p6: dv(reflectionRec),
      p7: dv(selectedVocation.technicalOpinion || t('valorNenhumParecerTecnicoInseridoNoRegistroDe')),
      p8: dv(observations || t('valorNenhumaObservacaoComplementarRegistradaParaEstePeriodo')),
      p9: dv(dateStr)
    });
    return {report, evaluationResult: profile};
  }

  if (focusArea === 'Desempenho Saúde Global') {
    const selectedHealth = ctx.healthRecords.find(r => r.id === ctx.selectedHealthId);
    if (!selectedHealth) return {evaluationResult: '', report: t('valorRelatorioDeDesempenhoSaudeGlobalNenhumRegistro')};
    const classification = selectedHealth.classification || t('valorNaoClassificado');
    const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const match = ctx.m9Rows.find(row => normCls(row.classification) === normCls(classification));
    const basicData = match?.basicData || t('tplDadosDaClassificacaoClassificationNaoCadastradosNo', {p0: dv(classification)});
    const report = t('tplRelatorioDeDesempenhoSaudeGlobalKidscreen10', {
      p0: dv(studentName),
      p1: dv(formatDate(selectedHealth.date)),
      p2: dv(selectedHealth.rawScore),
      p3: dv(Number(selectedHealth.tScore).toFixed(2)),
      p4: dv(classification),
      p5: dv(basicData),
      p6: dv(selectedHealth.technicalOpinion || match?.reflection || t('valorNenhumParecerTecnicoInseridoNoRegistroDe2')),
      p7: dv(observations || t('valorNenhumaObservacaoComplementarRegistradaParaEstePeriodo')),
      p8: dv(dateStr)
    });
    return {report, evaluationResult: classification};
  }

  if (focusArea === 'Desempenho Higiene Bucal') {
    const selectedOral = ctx.oralRecords.find(r => r.id === ctx.selectedOralId);
    if (!selectedOral) return {evaluationResult: '', report: t('valorRelatorioDeDesempenhoHigieneBucalNenhumRegistro')};
    const classification = selectedOral.classification || t('valorNaoClassificado');
    const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const match = ctx.m10Rows.find(row => normCls(row.classification) === normCls(classification));
    const basicData = match?.basicData || t('tplFaixaDaClassificacaoClassificationNaoCadastradaNo', {p0: dv(classification)});
    const report = t('tplRelatorioDeDesempenhoHigieneBucalHuDbi', {
      p0: dv(studentName),
      p1: dv(formatDate(selectedOral.date)),
      p2: dv(selectedOral.score),
      p3: dv(classification),
      p4: dv(basicData),
      p5: dv(selectedOral.technicalOpinion || match?.reflection || t('valorNenhumParecerTecnicoInseridoNoRegistroDe3')),
      p6: dv(observations || t('valorNenhumaObservacaoComplementarRegistradaParaEstePeriodo')),
      p7: dv(dateStr)
    });
    return {report, evaluationResult: classification};
  }

  if (focusArea === 'Desempenho Autoconceito') {
    const selectedAuto = ctx.autoconceptRecords.find(r => r.id === ctx.selectedAutoId);
    if (!selectedAuto) return {evaluationResult: '', report: t('valorRelatorioDeDesempenhoAutoconceitoNenhumRegistroDe')};
    const classification = selectedAuto.classification || t('valorNaoClassificado');
    const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const match = ctx.m11Rows.find(row => normCls(row.classification) === normCls(classification));
    const basicData = match?.basicData || t('tplFaixaDaClassificacaoClassificationNaoCadastradaNo2', {p0: dv(classification)});
    const report = t('tplRelatorioDeDesempenhoAutoconceitoEscalaDeRosenberg', {
      p0: dv(studentName),
      p1: dv(formatDate(selectedAuto.date)),
      p2: dv(selectedAuto.score),
      p3: dv(classification),
      p4: dv(basicData),
      p5: dv(selectedAuto.technicalOpinion || match?.reflection || t('valorNenhumParecerTecnicoInseridoNoRegistroDe4')),
      p6: dv(observations || t('valorNenhumaObservacaoComplementarRegistradaParaEstePeriodo')),
      p7: dv(dateStr)
    });
    return {report, evaluationResult: classification};
  }

  if (focusArea === 'Desempenho Índice Alimentar') {
    const selectedIas = ctx.iasRecords.find(r => r.id === ctx.selectedIasId);
    if (!selectedIas) return {evaluationResult: '', report: t('valorRelatorioDeDesempenhoIndiceAlimentarNenhumRegistro')};
    const classification = selectedIas.classification || t('valorNaoClassificado');
    const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const match = ctx.m12Rows.find(row => normCls(row.classification) === normCls(classification));
    const basicData = match?.basicData || t('tplFaixaDaClassificacaoClassificationNaoCadastradaNo3', {p0: dv(classification)});
    const report = t('tplRelatorioDeDesempenhoIndiceAlimentarIasEstudante', {
      p0: dv(studentName),
      p1: dv(formatDate(selectedIas.date)),
      p2: dv(selectedIas.totalScore),
      p3: dv(classification),
      p4: dv(basicData),
      p5: dv(selectedIas.technicalOpinion || match?.reflection || t('valorNenhumParecerTecnicoInseridoNoRegistroDe5')),
      p6: dv(observations || t('valorNenhumaObservacaoComplementarRegistradaParaEstePeriodo')),
      p7: dv(dateStr)
    });
    return {report, evaluationResult: classification};
  }

  if (focusArea === 'Desempenho Rastreamento TDAH') {
    const selectedSnap = ctx.snapRecords.find(r => r.id === ctx.selectedSnapId);
    if (!selectedSnap) return {evaluationResult: '', report: t('valorRelatorioDeDesempenhoRastreamentoDoTdahNenhum')};
    const classification = selectedSnap.classification || t('valorNaoClassificado');
    const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const match = ctx.m13Rows.find(row => normCls(row.classification) === normCls(classification));
    const basicData = match?.basicData || t('tplClassificacaoClassificationNaoCadastradaNoModulo13', {p0: dv(classification)});
    const report = t('tplRelatorioDeDesempenhoRastreamentoDoTdahSnap', {
      p0: dv(studentName),
      p1: dv(formatDate(selectedSnap.date)),
      p2: dv(selectedSnap.respondent || t('valorNaoInformado')),
      p3: dv(selectedSnap.inattentionScore),
      p4: dv(selectedSnap.hyperactivityScore),
      p5: dv(classification),
      p6: dv(basicData),
      p7: dv(selectedSnap.technicalOpinion || match?.reflection || t('valorNenhumParecerTecnicoInseridoNoRegistroDe6')),
      p8: dv(observations || t('valorNenhumaObservacaoComplementarRegistradaParaEstePeriodo')),
      p9: dv(dateStr)
    });
    return {report, evaluationResult: classification};
  }

  if (focusArea === 'Desempenho Rastreamento Precoce do TEA') {
    const selectedAq10 = ctx.aq10Records.find(r => r.id === ctx.selectedAq10Id);
    if (!selectedAq10) return {evaluationResult: '', report: t('valorRelatorioDeDesempenhoRastreamentoPrecoceDoTea')};
    const classification = selectedAq10.classification || t('valorNaoClassificada');
    const normCls = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const match = ctx.m14Rows.find(row => normCls(row.classification) === normCls(classification));
    const basicData = match?.basicData || t('tplClassificacaoClassificationNaoCadastradaNoModulo14', {p0: dv(classification)});
    const recommendation = (selectedAq10.totalScore ?? 0) <= 6 ? t('valorPontuacao0a6') : t('valorPontuacao7a10');
    const report = t('tplRelatorioDeDesempenhoRastreamentoPrecoceDoTea', {
      p0: dv(studentName),
      p1: dv(formatDate(selectedAq10.date)),
      p2: dv(selectedAq10.respondent || t('valorNaoInformado')),
      p3: dv(selectedAq10.version === 'adolescente' ? t('valorAdolescente12A15Anos') : t('valorCrianca4A11Anos')),
      p4: dv(selectedAq10.totalScore),
      p5: dv(classification),
      p6: dv(basicData),
      p7: dv(selectedAq10.technicalOpinion || match?.reflection || t('valorNenhumParecerTecnicoInseridoNoRegistroDe7')),
      p8: dv(observations || t('valorNenhumaObservacaoComplementarRegistradaParaEstePeriodo')),
      p9: dv(recommendation),
      p10: dv(dateStr)
    });
    return {report, evaluationResult: classification};
  }

  if (focusArea === 'Desempenho Qualidade Motora PCD') {
    const selectedPcd = ctx.pcdRecords.find(r => r.id === ctx.selectedPcdId);
    if (!selectedPcd) return {evaluationResult: '', report: t('valorRelatorioDeDesempenhoQualidadeMotoraPcdNenhuma')};
    const valenciaLabels = [
      {label: t('uiVelocidadeEAgilidade'), nota: selectedPcd.notaVelAgil},
      {label: t('uiForcaExplosivaMembrosInf'), nota: selectedPcd.notaForcaExplosiva},
      {label: t('uiForcaMembrosSuperiores'), nota: selectedPcd.notaMembrosSup},
      {label: t('uiEstabilidadeDeTroncoCore'), nota: selectedPcd.notaCore}
    ];
    const valenciaStr = valenciaLabels.map(v => t('tplValenciaNota', {p0: dv(v.label), p1: dv(v.nota)})).join('\n');
    const compatibilidade = selectedPcd.compatibilidade ?? [];
    const compStr = compatibilidade.length > 0
      ? compatibilidade.map((c, i) => t('tplCompatibilidadeItem', {
          p0: dv(i + 1),
          p1: dv(c.modalidade),
          p2: dv(c.iar.toFixed(2)),
          p3: c.iarNormalizado != null ? t('tplCompatibilidadeNormalizado', {p0: dv(c.iarNormalizado.toFixed(2))}) : ''
        })).join('\n')
      : t('uiSemDadosDeCompatibilidadeRegistrados');
    const funil = selectedPcd.funil ?? [];
    const funilStr = funil.length > 0
      ? funil.map(f => `${f.momento}. **${dv(f.titulo)}:** ${dv(f.regra)}`).join('\n')
      : t('uiFunilQualitativoNaoRegistradoNestaAvaliacao');
    const adaptStr = (selectedPcd.adaptacoesAplicadas ?? [])
      .filter(a => a.status === 'Adaptado' || a.status === 'Substituído')
      .map(a => `- **${dv(a.teste)}** (${dv(a.status)}): ${dv(a.instrucao)}`).join('\n');
    const topModalidade = compatibilidade.length > 0 ? compatibilidade[0].modalidade : t('uiAComplementar');
    const report = t('tplRelatorioDeDesempenhoQualidadeMotoraPcdEstudante', {
      p0: dv(studentName),
      p1: dv(formatDate(selectedPcd.date)),
      p2: dv(selectedPcd.grupoNome || t('tplGrupoP0', {p0: dv(selectedPcd.grupo)})),
      p3: dv(selectedPcd.detalheClassificacao || t('valorGeral')),
      p4: dv(selectedPcd.classificacaoPerfil),
      p5: dv(valenciaStr),
      p6: dv(compStr),
      p7: dv(topModalidade),
      p8: dv(adaptStr || t('valorNenhumTesteAdaptadoOuSubstituidoNesteGrupo')),
      p9: dv(funilStr),
      p10: dv(selectedPcd.technicalOpinion || t('valorNenhumParecerTecnicoInseridoNoRegistroDe8')),
      p11: dv(observations || t('valorNenhumaObservacaoComplementarRegistradaParaEstePeriodo')),
      p12: dv(dateStr)
    });
    return {report, evaluationResult: selectedPcd.classificacaoPerfil};
  }

  if (focusArea === 'Desempenho Escolar') {
    const scenario = ctx.m3Analysis?.cenario || (ctx.attendanceRate !== null ? (ctx.attendanceRate >= 50 ? 'A' : 'B') : 'C');
    let scenarioText = '';
    let frequencyText = '';
    let parentsText = '';
    let impactosText = '';
    if (scenario === 'A') {
      scenarioText = t('valorCenarioAMaisPresencasDoQueFaltas');
      frequencyText = t('valorOEstudanteDemonstrouExcelenteRegularidadeECompromisso');
      parentsText = t('valorParabensPeloIncentivoEParceriaAPresenca');
      impactosText = t('valorMatrizDeImpactosPedagogicosContinuidadePedagogicaQuando');
    } else if (scenario === 'B') {
      scenarioText = t('valorCenarioBMaisFaltasDoQuePresencas');
      frequencyText = t('valorIdentificamosUmNumeroCriticoDeAusenciasNeste');
      parentsText = t('valorSolicitamosUmaAtencaoEspecialEUmDialogo');
      impactosText = t('valorMatrizDeImpactosPedagogicosLacunasDeConteudo');
    } else {
      scenarioText = t('valorCenarioCSemRegistrosSuficientes');
      frequencyText = t('valorAteOMomentoNaoForamIdentificadosRegistros');
      parentsText = t('valorSolicitamosQueEntremEmContatoComA');
      impactosText = t('valorMatrizDeImpactosPedagogicosInconsistenciaDeDados');
    }
    const rate = ctx.attendanceRate !== null ? ctx.attendanceRate.toFixed(1) : 'N/A';
    const absenceRate = ctx.attendanceRate !== null ? (100 - ctx.attendanceRate).toFixed(1) : 'N/A';
    const attendanceStatus = ctx.attendanceRate !== null ? (ctx.attendanceRate >= 75 ? t('valorExcelente') : ctx.attendanceRate >= 50 ? t('valorRegular') : t('uiCritico')) : 'N/A';
    const report = t('tplFrequenciaEscolarAcumuladaRateStatusResumoDo', {
      p0: dv(rate),
      p1: dv(attendanceStatus),
      p2: dv(ctx.totalCount),
      p3: dv(ctx.presenceCount),
      p4: dv(rate),
      p5: dv(ctx.totalCount - ctx.presenceCount),
      p6: dv(absenceRate),
      p7: dv(scenarioText),
      p8: dv(ctx.m3Analysis?.parecerFrequencia || frequencyText),
      p9: dv(ctx.m3Analysis?.parecerPais || parentsText),
      p10: dv(impactosText),
      p11: dv(observations || t('valorNenhumaObservacaoAdicionalRegistrada')),
      p12: dv(dateStr)
    });
    return {report, evaluationResult: ''};
  }

  if (focusArea === 'Desempenho Completo') {
    const find = (focus: string) => ctx.existingReports.find(r => r.focusArea === focus);
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
      return {
        evaluationResult: '',
        report: t('tplParecerIntegradoDeDesempenhoCompletoEstudanteStudentobj', {
          p0: dv(studentName),
          p1: dv(ctx.studentGrade || t('valorNaoInformada')),
          p2: dv(dateStr)
        })
      };
    }
    const extra: string[] = [];
    if (reportSnap) extra.push(`### ${t('uiRastreamentoTdah')}\n${reportSnap.report}`);
    if (reportAq10) extra.push(`### ${t('uiRastreamentoTea')}\n${reportAq10.report}`);
    if (reportPcd) extra.push(`### ${t('uiQualidadeMotoraPcd')}\n${reportPcd.report}`);
    const integrated = [extra.join('\n\n'), observations || t('valorNenhumParecerIntegradorOuObservacaoComplementarGeral')].filter(Boolean).join('\n\n');
    const report = t('tplParecerIntegradoDeDesempenhoCompletoEstudanteStudentobj2', {
      p0: dv(studentName),
      p1: dv(ctx.studentGrade || t('valorNaoInformada')),
      p2: dv(dateStr),
      p3: dv(studentName),
      p4: dv(reportEscolar?.report || t('valorSemRelatorioEscolar')),
      p5: dv(reportCorporal?.report || t('valorSemRelatorioCorporal')),
      p6: dv(reportMotor?.report || t('valorSemRelatorioCapacidades')),
      p7: dv(reportEsportivo?.report || t('valorSemRelatorioEsportivo')),
      p8: dv(reportVocacional?.report || t('valorSemRelatorioVocacional')),
      p9: dv(reportSaudeGlobal?.report || t('valorSemRelatorioSaude')),
      p10: dv(reportHigieneBucal?.report || t('valorSemRelatorioHigiene')),
      p11: dv(reportAutoconcept?.report || t('valorSemRelatorioAutoconceito')),
      p12: dv(reportIas?.report || t('valorSemRelatorioIas')),
      p13: dv(integrated),
      p14: dv(dateStr)
    });
    return {report, evaluationResult: ''};
  }

  return null;
}
