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

const CANONICAL_KEYS: Record<string, string> = {
  'velocidade': 'canonical.velocidade',
  'INSUFICIENTE': 'canonical.nivelInsuficiente',
  'EXCELENTE': 'canonical.nivelExcelente',
  'forca_muscular': 'canonical.forcaMuscular',
  'BOM': 'canonical.nivelBom',
  'abdomen': 'canonical.abdomen',
  'REGULAR': 'canonical.nivelRegular',
  'impulsao': 'canonical.impulsao',
  'agilidade': 'canonical.agilidade',
  'O aluno possui uma força funcional para atividades rotineiras, mas falha ou perde o alinhamento corporal quando exposto a esforços um pouco mais prolongados. A estrutura de saúde é estável, porém a musculatura estabilizadora cansa rápido, gerando descompensações posturais durante os jogos.': 'canonical.forcaFuncionalRotina',
  'Deficiência Intelectual': 'canonical.pcdIntelectual',
  'Deficiência Física (Locomoção Independente)': 'canonical.pcdFisicaLocomocao',
  'Deficiência Física (Cadeira de Rodas)': 'canonical.pcdFisicaCadeira',
  'Paralisia Cerebral (GMFCS)': 'canonical.pcdParalisiaCerebral',
  'Deficiência Visual (B1-B3)': 'canonical.pcdVisual',
  'Deficiência Auditiva': 'canonical.pcdAuditiva',
  'Basquete / Rugby em Cadeira': 'canonical.pcdBasqueteRugby',
  'Boccia (Bocha Adaptada)': 'canonical.pcdBoccia',
  'Atletismo (Velocidade)': 'canonical.pcdAtletismoVelocidade',
  'Natação Adaptada': 'canonical.pcdNatacaoAdaptada',
  'Halterofilismo Adaptado': 'canonical.pcdHalterofilismo',
  'Goalball / Futebol de 5': 'canonical.pcdGoalball',
  'salto': 'canonical.testeSalto',
  'flexao': 'canonical.testeFlexao',
  'Filtro Clínico/Grupo': 'canonical.filtroClinicoGrupo',
  'Filtro Cognitivo/Sensorial': 'canonical.filtroCognitivoSensorial',
  'Filtro de Preferência e Desejo Pessoal': 'canonical.filtroPreferencia',
  'Perfil Motor Elevado': 'canonical.pcdPerfilElevado',
  'Perfil Motor Mediano': 'canonical.pcdPerfilMediano',
  'Perfil Motor com Limitações': 'canonical.pcdPerfilLimitacoes',
  'Não definida': 'comparativo.naoDefinida',
  'Aprimorar Habilidades Motoras': 'avaliacoes.sugeridoAprimorar',
  'Humanas e Sociais': 'desempenho.uiHumanasESociais',
  'Exatas e Tecnológicas': 'desempenho.uiExatasETecnologicas',
  'Biológicas e Criativas': 'desempenho.uiBiologicasECriativas',
  'Negócios e Gestão': 'desempenho.uiNegociosEGestao',
  'Criativo e Tecnológico': 'desempenho.uiCriativoETecnologicoPerfilHibrido',
  'Abaixo Peso': 'questionario.classAbaixoPeso',
  'Abaixo do peso': 'questionario.classAbaixoPeso',
  'Peso Ideal': 'canonical.pesoIdeal',
  'Peso normal': 'questionario.classPesoNormal',
  'Sobrepeso': 'questionario.classSobrepeso',
  'Obesidade': 'questionario.classObesidade',
  'Impulso': 'questionario.impulsao',
  'Abdômen': 'questionario.abdomen',
  'Agilidade': 'questionario.agilidade',
  'Força': 'avaliacoes.areaForca',
  'Velocidade': 'questionario.velocidade',
  'Qualidade de Vida Baixa': 'avaliacoes.classSaudeBaixa',
  'Qualidade de Vida Normal': 'avaliacoes.classSaudeNormal',
  'Qualidade de Vida Alta': 'avaliacoes.classSaudeAlta',
  'Alto Desempenho': 'avaliacoes.classOralAlta',
  'Desempenho Moderado': 'avaliacoes.classOralModerada',
  'Baixo Desempenho': 'avaliacoes.classOralBaixa',
  'Autoestima Baixa': 'avaliacoes.classAutoBaixa',
  'Autoestima Equilibrada': 'avaliacoes.classAutoEquilibrada',
  'Autoestima Alta': 'avaliacoes.classAutoAlta',
  'Dieta de Má Qualidade': 'avaliacoes.classIasBaixa',
  'Necessita de Modificações': 'avaliacoes.classIasModificacoes',
  'Boa Qualidade (Saudável)': 'avaliacoes.classIasBoa',
  'Sinais de Desatenção': 'avaliacoes.classSnapDesatencao',
  'Sinais de Hiperatividade/Impulsividade': 'avaliacoes.classSnapHiper',
  'Sinais Combinados': 'avaliacoes.classSnapCombinados',
  'Sem Indícios Significativos': 'avaliacoes.classSnapSemIndicios',
  'Dentro da média populacional': 'canonical.aq10DentroMedia',
  'Alerta de Traços Elevados de TEA': 'canonical.aq10AlertaTracos',
  'Adolescente (12 a 15 anos)': 'desempenho.uiAdolescente12A15Anos',
  'Criança (4 a 11 anos)': 'desempenho.uiCrianca4A11Anos',
  'Pontuação de 0 a 6: traços comportamentais dentro da média da população geral; acompanhamento rotineiro do desenvolvimento.': 'desempenho.textoPontuacaoDe0A6TracosComportamentais',
  'Pontuação de 7 a 10: alerta de traços elevados de TEA; recomendação de encaminhamento prioritário para avaliação multidisciplinar especializada (neuropediatra ou psiquiatra infantil e neuropsicólogo).': 'desempenho.textoPontuacaoDe7A10AlertaDe',
  'Abdominal (Prancha)': 'canonical.testeAbdominalPrancha',
  'Velocidade (Corrida 20m)': 'canonical.testeVelocidadeCorrida20m',
  'Agilidade (Shuttle Run)': 'canonical.testeAgilidadeShuttleRun',
  'Salto Horizontal': 'canonical.testeSaltoHorizontal',
  'Flexão de Braço': 'canonical.testeFlexaoBraco',
  'Força/Resistência (Membros Sup.)': 'canonical.pcdForcaResistenciaMembrosSup',
  'Limitações Agudas': 'avaliacoes.notaPcd1',
  'Desempenho Mediano': 'avaliacoes.notaPcd2',
  'Desempenho Elevado': 'avaliacoes.notaPcd3',
  'Padrão': 'avaliacoes.statusPadrao',
  'Adaptado': 'avaliacoes.statusAdaptado',
  'Substituído': 'avaliacoes.statusSubstituido',
  'Não aplicável': 'avaliacoes.NaoAplicavel',
  'CENÁRIO A': 'questionario.cenario_a',
  'CENÁRIO B': 'questionario.cenario_b',
  'CENÁRIO C': 'questionario.cenario_c',
  'IMC': 'dashboard.imc',
  'Capacidades': 'comparativo.dimMotor',
  'Esportivo': 'comparativo.dimSport',
  'Vocacional': 'comparativo.dimVoc',
  'Saúde Global': 'dashboard.saudeGlobal',
  'Higiene Bucal': 'dashboard.higieneBucal',
  'Autoconceito': 'dashboard.autoconceito',
  'Índice Alimentar': 'dashboard.indiceAlimentar',
  'Rastreamento TDAH': 'avaliacoes.tituloSnapCurto',
  'Rastreamento Precoce do TEA': 'avaliacoes.tituloAq10',
  'Qualidade Motora PCD': 'dashboard.qualidadeMotoraPCD',
  'Ativo': 'alunos.ativo',
  'Inativo': 'alunos.inativo',
  'Aguardando avaliação completa': 'avaliacoes.valorAguardandoAvaliacaoCompleta',
};

export function displayValue(value: unknown, t: (key: string) => string, locale?: string): string {
  const text = String(value ?? '');
  if (DISPLAY_KEYS[text]) return t(DISPLAY_KEYS[text]);
  if (locale && CANONICAL_KEYS[text]) return displayCanonical(text, locale);
  return text;
}

const PROSE_ES: Record<string, string> = {
  'prancha ventral isométrica': 'tabla ventral isométrica',
  'teto de 30s': 'límite de 30 s',
  'corrida 20m com aceleração máxima': 'carrera de 20 m con aceleración máxima',
  'shuttle run 9,14m com dois blocos': 'shuttle run de 9,14 m con dos bloques',
  'salto horizontal em base bilateral': 'salto horizontal con base bilateral',
  'avaliar criteriosamente a viabilidade articular': 'evaluar cuidadosamente la viabilidad articular',
  'acometimentos severos de membros inferiores': 'compromisos severos de miembros inferiores',
  'flexão de braço': 'flexión de brazo',
  'versão joelhos apoiados se necessário': 'versión con rodillas apoyadas si es necesario',
  'mediante suporte, encosto ou estabilização mecânica de tronco': 'con soporte, respaldo o estabilización mecánica del tronco',
  'propulsão rápida em cadeira de rodas ao longo dos 20m cronometrados': 'propulsión rápida en silla de ruedas a lo largo de los 20 m cronometrados',
  'percurso sinuoso com propulsão manual ou teste de agilidade em cadeira': 'recorrido sinuoso con propulsión manual o prueba de agilidad en silla',
  'realizar padrão quando houver capacidade funcional e segurança': 'realizar el estándar cuando haya capacidad funcional y seguridad',
  'não realizar quando o comprometimento dos membros inferiores tornar o salto inseguro ou inviável': 'no realizar cuando el compromiso de los miembros inferiores haga el salto inseguro o inviable',
  'considerar teste alternativo de potência dos membros inferiores, quando aplicável': 'considerar una prueba alternativa de potencia de miembros inferiores, cuando corresponda',
  'aplicável na íntegra': 'aplicable íntegramente',
  'ajustes mínimos pelo hemicorpo de maior dominância/espasticidade': 'ajustes mínimos según el hemicuerpo de mayor dominancia/espasticidad',
  'aplicável; requer avaliação individual prévia': 'aplicable; requiere evaluación individual previa',
  'exige avaliação individual prévia (deambulação com apoio instrumental)': 'exige evaluación individual previa (deambulación con apoyo instrumental)',
  'realizar somente quando houver capacidade funcional e segurança': 'realizar solo cuando haya capacidad funcional y seguridad',
  'quando não for viável, considerar teste alternativo de potência dos membros inferiores': 'cuando no sea viable, considerar una prueba alternativa de potencia de miembros inferiores',
  'realizável apenas sob suporte e alta tolerância postural': 'realizable solo con soporte y alta tolerancia postural',
  'priorizar avaliação funcional clínica com fisioterapia': 'priorizar la evaluación funcional clínica con fisioterapia',
  'padrão ou adaptado quando houver capacidade funcional dos membros superiores; caso contrário, priorizar avaliação funcional clínica com fisioterapia': 'estándar o adaptado cuando haya capacidad funcional de miembros superiores; de lo contrario, priorizar la evaluación funcional clínica con fisioterapia',
  'movimento idêntico; demarcação tátil e comando verbal claro': 'movimiento idéntico; delimitación táctil y comando verbal claro',
  'guia humano ou corda-guia; comando sonoro; demarcação tátil na saída': 'guía humana o cuerda guía; comando sonoro; delimitación táctil en la salida',
  'guia humano ou corda-guia; demarcação tátil e comandos sonoros': 'guía humana o cuerda guía; delimitación táctil y comandos sonoros',
  'linha de partida tátil (fita em relevo); comando sonoro claro': 'línea de salida táctil (cinta en relieve); comando sonoro claro',
  'instrução verbal e cinestésica; demonstração física': 'instrucción verbal y cinestésica; demostración física',
  'execução padrão': 'ejecución estándar',
  'largada com estímulo visual nítido': 'salida con estímulo visual nítido',
  'substituir sinal sonoro por estímulo visual nítido': 'sustituir la señal sonora por un estímulo visual nítido',
  'estímulos visuais nítidos': 'estímulos visuales nítidos',
  'demonstração visual e suporte via libras quando disponível': 'demostración visual y apoyo vía lengua de señas cuando esté disponible',
  'demonstração física repetida e instruções em passos simples': 'demostración física repetida e instrucciones en pasos simples',
  'demonstração física repetida; tentativa prática extra não pontuada': 'demostración física repetida; intento práctico adicional no puntuado',
  'demonstração física repetida; retirada gradual de apoio verbal': 'demostración física repetida; retirada gradual del apoyo verbal',
  'velocidade e potência de membros inferiores são cruciais': 'la velocidad y la potencia de miembros inferiores son cruciales',
  'deslocamento, potência e uso intenso de membros superiores sobre a cadeira': 'desplazamiento, potencia y uso intenso de miembros superiores sobre la silla',
  'força de membros superiores e estabilidade central do tronco determinam o êxito': 'la fuerza de miembros superiores y la estabilidad central del tronco determinan el éxito',
  'precisão com estabilidade de tronco; baixa exigência de deslocamento': 'precisión con estabilidad de tronco; baja exigencia de desplazamiento',
  'deslocamento orientado, agilidade e velocidade de reação': 'desplazamiento orientado, agilidad y velocidad de reacción',
  'potência de membros superiores e inferiores com estabilidade de tronco': 'potencia de miembros superiores e inferiores con estabilidad de tronco',
  'adequação postural intrínseca': 'adecuación postural intrínseca',
  'avaliar articulações de membros inferiores antes do salto': 'evaluar las articulaciones de miembros inferiores antes del salto',
  'priorizar provas de membros superiores e estabilização de tronco; evitar impacto vertical': 'priorizar pruebas de miembros superiores y estabilización de tronco; evitar impacto vertical',
  'orientar percurso de agilidade em cadeira e adaptar comandos ao nível de compreensão': 'orientar el recorrido de agilidad en silla y adaptar los comandos al nivel de comprensión',
  'cruzar o nível gmfcs com cada modalidade': 'cruzar el nivel GMFCS con cada modalidad',
  'respeitar contra-indicações por padrão motor': 'respetar las contraindicaciones por patrón motor',
  'preferir modalidades como goalball ou futebol de 5': 'preferir modalidades como Goalball o Fútbol de 5',
  'prever guia/comandos sonoros e demarcação tátil': 'prever guía/comandos sonoros y delimitación táctil',
  'assegurar estímulos visuais nítidos e suporte via libras': 'asegurar estímulos visuales nítidos y apoyo vía lengua de señas',
  'fragmentar instruções, demonstrar repetidamente e permitir tentativa prática extra': 'fragmentar instrucciones, demostrar repetidamente y permitir un intento práctico adicional',
  'considerar soberanamente a preferência e o desejo pessoal da criança/adolescente na escolha final da modalidade': 'considerar soberanamente la preferencia y el deseo personal del niño/adolescente en la elección final de la modalidade',
  'criança anda/caminha de forma autônoma ou com auxílio leve (bengala, órtese), com acometimento estrutural sem alteração neurológica central': 'el niño camina de forma autónoma o con ayuda leve (bastón, ortesis), con compromiso estructural sin alteración neurológica central',
  'diagnóstico clínico formal + classificação de gravidade. detalhar nível de amputação se houver': 'diagnóstico clínico formal + clasificación de gravedad. detallar el nivel de amputación si lo hubiera',
  'cadeira de rodas como mecanismo principal ou exclusivo de locomoção. testes adaptados ou substituídos': 'silla de ruedas como mecanismo principal o exclusivo de locomoción. pruebas adaptadas o sustituidas',
  'diagnóstico clínico formal + laudo médico. confirmar uso de cadeira como meio principal': 'diagnóstico clínico formal + informe médico. confirmar el uso de silla como medio principal',
  'classificação obrigatória prévia pela escala gmfcs (níveis i a v) antes de delimitar qualquer teste': 'clasificación obligatoria previa por la escala GMFCS (niveles I a V) antes de delimitar cualquier prueba',
  'aplicação obrigatória da escala gmfcs + laudo médico': 'aplicación obligatoria de la escala GMFCS + informe médico',
  'estrutura motora global preservada. ajustes na instrução verbal, cinestésica e orientação espacial': 'estructura motora global preservada. ajustes en la instrucción verbal, cinestésica y orientación espacial',
  'mapeamento do nível de acuidade visual (b1, b2 ou b3) + laudo oftalmológico': 'mapeo del nivel de agudeza visual (B1, B2 o B3) + informe oftalmológico',
  'funções motoras e de orientação espacial preservadas. adaptações nos canais de comunicação': 'funciones motoras y de orientación espacial preservadas. adaptaciones en los canales de comunicación',
  'identificação do grau de perda auditiva (leve, moderada, severa ou profunda) + laudo audiológico': 'identificación del grado de pérdida auditiva (leve, moderada, severa o profunda) + informe audiológico',
  'capacidades sensoriais e motoras íntegras. barreira primária na cognição e compreensão das tarefas': 'capacidades sensoriales y motoras íntegras. barrera primaria en la cognición y comprensión de las tareas',
  'nível de funcionamento adaptativo (leve, moderado ou severo) respaldado por laudo psicológico/pedagógico': 'nivel de funcionamiento adaptativo (leve, moderado o severo) respaldado por informe psicológico/pedagógico',
  'locomoção autônoma': 'locomoción autónoma',
  'cadeira de rodas': 'silla de ruedas',
  'b1 (cegueira total)': 'B1 (ceguera total)',
  'perda auditiva severa': 'pérdida auditiva severa',
  'colchonete e cronômetro de precisão': 'colchoneta y cronómetro de precisión',
  'cronômetro de precisão': 'cronómetro de precisión',
  'suporte via libras': 'apoyo vía lengua de señas',
  'criança/adolescente': 'niño/adolescente',
  'prática recomendada': 'práctica recomendada',
  'não avaliado': 'no evaluado',
  'biotipo corporal': 'biotipo corporal',
  'aptidão predominante': 'aptitud predominante',
  'foco de direcionamento': 'foco de direccionamiento',
};

const PROSE_EN: Record<string, string> = {
  'prancha ventral isométrica': 'isometric ventral plank',
  'teto de 30s': '30 s cap',
  'corrida 20m com aceleração máxima': '20 m run with maximum acceleration',
  'shuttle run 9,14m com dois blocos': '9.14 m shuttle run with two shuttles',
  'salto horizontal em base bilateral': 'horizontal jump from a bilateral base',
  'avaliar criteriosamente a viabilidade articular': 'carefully assess joint viability',
  'acometimentos severos de membros inferiores': 'severe lower-limb impairments',
  'flexão de braço': 'push-up',
  'versão joelhos apoiados se necessário': 'knees-supported version if needed',
  'mediante suporte, encosto ou estabilização mecânica de tronco': 'with support, backrest or mechanical trunk stabilization',
  'propulsão rápida em cadeira de rodas ao longo dos 20m cronometrados': 'fast wheelchair propulsion over the timed 20 m',
  'percurso sinuoso com propulsão manual ou teste de agilidade em cadeira': 'slalom course with manual propulsion or wheelchair agility test',
  'realizar padrão quando houver capacidade funcional e segurança': 'perform the standard version when functional capacity and safety allow',
  'não realizar quando o comprometimento dos membros inferiores tornar o salto inseguro ou inviável': 'do not perform when lower-limb impairment makes the jump unsafe or unfeasible',
  'considerar teste alternativo de potência dos membros inferiores, quando aplicável': 'consider an alternative lower-limb power test when applicable',
  'aplicável na íntegra': 'fully applicable',
  'ajustes mínimos pelo hemicorpo de maior dominância/espasticidade': 'minimal adjustments for the more dominant/spastic body side',
  'aplicável; requer avaliação individual prévia': 'applicable; requires prior individual assessment',
  'exige avaliação individual prévia (deambulação com apoio instrumental)': 'requires prior individual assessment (walking with assistive device)',
  'realizar somente quando houver capacidade funcional e segurança': 'perform only when functional capacity and safety allow',
  'quando não for viável, considerar teste alternativo de potência dos membros inferiores': 'when not feasible, consider an alternative lower-limb power test',
  'realizável apenas sob suporte e alta tolerância postural': 'feasible only with support and high postural tolerance',
  'priorizar avaliação funcional clínica com fisioterapia': 'prioritize clinical functional assessment with physiotherapy',
  'padrão ou adaptado quando houver capacidade funcional dos membros superiores; caso contrário, priorizar avaliação funcional clínica com fisioterapia': 'standard or adapted when upper-limb functional capacity allows; otherwise, prioritize clinical functional assessment with physiotherapy',
  'movimento idêntico; demarcação tátil e comando verbal claro': 'same movement; tactile marking and clear verbal command',
  'guia humano ou corda-guia; comando sonoro; demarcação tátil na saída': 'human guide or guide rope; sound command; tactile marking at the start',
  'guia humano ou corda-guia; demarcação tátil e comandos sonoros': 'human guide or guide rope; tactile marking and sound commands',
  'linha de partida tátil (fita em relevo); comando sonoro claro': 'tactile start line (raised tape); clear sound command',
  'instrução verbal e cinestésica; demonstração física': 'verbal and kinesthetic instruction; physical demonstration',
  'execução padrão': 'standard execution',
  'largada com estímulo visual nítido': 'start with a clear visual cue',
  'substituir sinal sonoro por estímulo visual nítido': 'replace the sound signal with a clear visual cue',
  'estímulos visuais nítidos': 'clear visual cues',
  'demonstração visual e suporte via libras quando disponível': 'visual demonstration and sign-language support when available',
  'demonstração física repetida e instruções em passos simples': 'repeated physical demonstration and simple step-by-step instructions',
  'demonstração física repetida; tentativa prática extra não pontuada': 'repeated physical demonstration; unscored extra practice attempt',
  'demonstração física repetida; retirada gradual de apoio verbal': 'repeated physical demonstration; gradual withdrawal of verbal support',
  'velocidade e potência de membros inferiores são cruciais': 'speed and lower-limb power are crucial',
  'deslocamento, potência e uso intenso de membros superiores sobre a cadeira': 'movement, power and intense use of upper limbs on the chair',
  'força de membros superiores e estabilidade central do tronco determinam o êxito': 'upper-limb strength and central trunk stability determine success',
  'precisão com estabilidade de tronco; baixa exigência de deslocamento': 'precision with trunk stability; low movement demand',
  'deslocamento orientado, agilidade e velocidade de reação': 'oriented movement, agility and reaction speed',
  'potência de membros superiores e inferiores com estabilidade de tronco': 'upper- and lower-limb power with trunk stability',
  'adequação postural intrínseca': 'intrinsic postural alignment',
  'avaliar articulações de membros inferiores antes do salto': 'assess lower-limb joints before the jump',
  'priorizar provas de membros superiores e estabilização de tronco; evitar impacto vertical': 'prioritize upper-limb tests and trunk stabilization; avoid vertical impact',
  'orientar percurso de agilidade em cadeira e adaptar comandos ao nível de compreensão': 'guide the wheelchair agility course and adapt commands to the comprehension level',
  'cruzar o nível gmfcs com cada modalidade': 'cross-reference the GMFCS level with each modality',
  'respeitar contra-indicações por padrão motor': 'respect contraindications by motor pattern',
  'preferir modalidades como goalball ou futebol de 5': 'prefer modalities such as Goalball or Football 5-a-side',
  'prever guia/comandos sonoros e demarcação tátil': 'provide a guide/sound commands and tactile marking',
  'assegurar estímulos visuais nítidos e suporte via libras': 'ensure clear visual cues and sign-language support',
  'fragmentar instruções, demonstrar repetidamente e permitir tentativa prática extra': 'break instructions into steps, demonstrate repeatedly and allow an extra practice attempt',
  'considerar soberanamente a preferência e o desejo pessoal da criança/adolescente na escolha final da modalidade': 'give full consideration to the child/adolescent personal preference and desire in the final modality choice',
  'criança anda/caminha de forma autônoma ou com auxílio leve (bengala, órtese), com acometimento estrutural sem alteração neurológica central': 'the child walks independently or with light assistance (crutch, orthosis), with structural impairment and no central neurological alteration',
  'diagnóstico clínico formal + classificação de gravidade. detalhar nível de amputação se houver': 'formal clinical diagnosis + severity classification. specify amputation level if applicable',
  'cadeira de rodas como mecanismo principal ou exclusivo de locomoção. testes adaptados ou substituídos': 'wheelchair as the main or exclusive means of locomotion. adapted or substituted tests',
  'diagnóstico clínico formal + laudo médico. confirmar uso de cadeira como meio principal': 'formal clinical diagnosis + medical report. confirm wheelchair use as the main means',
  'classificação obrigatória prévia pela escala gmfcs (níveis i a v) antes de delimitar qualquer teste': 'mandatory prior classification using the GMFCS scale (levels I to V) before defining any test',
  'aplicação obrigatória da escala gmfcs + laudo médico': 'mandatory GMFCS scale application + medical report',
  'estrutura motora global preservada. ajustes na instrução verbal, cinestésica e orientação espacial': 'global motor structure preserved. adjustments to verbal, kinesthetic instruction and spatial orientation',
  'mapeamento do nível de acuidade visual (b1, b2 ou b3) + laudo oftalmológico': 'visual acuity level mapping (B1, B2 or B3) + ophthalmological report',
  'funções motoras e de orientação espacial preservadas. adaptações nos canais de comunicação': 'motor and spatial orientation functions preserved. adaptations in communication channels',
  'identificação do grau de perda auditiva (leve, moderada, severa ou profunda) + laudo audiológico': 'hearing loss degree identification (mild, moderate, severe or profound) + audiological report',
  'capacidades sensoriais e motoras íntegras. barreira primária na cognição e compreensão das tarefas': 'intact sensory and motor capacities. primary barrier in cognition and task comprehension',
  'nível de funcionamento adaptativo (leve, moderado ou severo) respaldado por laudo psicológico/pedagógico': 'adaptive functioning level (mild, moderate or severe) supported by psychological/educational report',
  'locomoção autônoma': 'independent locomotion',
  'cadeira de rodas': 'wheelchair',
  'b1 (cegueira total)': 'B1 (total blindness)',
  'perda auditiva severa': 'severe hearing loss',
  'colchonete e cronômetro de precisão': 'mat and precision stopwatch',
  'cronômetro de precisão': 'precision stopwatch',
  'suporte via libras': 'sign-language support',
  'criança/adolescente': 'child/adolescent',
  'prática recomendada': 'recommended practice',
  'não avaliado': 'not assessed',
  'biotipo corporal': 'body biotype',
  'aptidão predominante': 'predominant aptitude',
  'foco de direcionamento': 'guidance focus',
};

function translateProse(text: string, locale: string): string {
  const dictionary = locale === 'en' ? PROSE_EN : PROSE_ES;
  let output = text;
  for (const [from, to] of Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length)) {
    const pattern = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    output = output.replace(pattern, match => {
      if (match === match.toUpperCase()) return to.toUpperCase();
      if (match[0] === match[0].toUpperCase()) return to.charAt(0).toUpperCase() + to.slice(1);
      return to;
    });
  }
  return output;
}

export function displayCanonical(value: unknown, locale: string): string {
  const text = String(value ?? '');
  const resolved = (routing.locales as readonly string[]).includes(locale)
    ? locale as AppLocale
    : routing.defaultLocale as AppLocale;
  const group = /^Grupo (\d+)$/.exec(text);
  if (group) {
    const questionario = messages[resolved].questionario as Record<string, unknown> | undefined;
    return `${typeof questionario?.grupo === 'string' ? questionario.grupo : 'Grupo'} ${group[1]}`;
  }
  const direcionamento = /^Pré-seleção \(matriz física\): (.+)\. Indicação preliminar, sujeita ao funil qualitativo \(filtros clínico-funcional, cognitivo-sensorial e de preferência do participante\)\.$/.exec(text);
  if (direcionamento) {
    const avaliacoes = messages[resolved].avaliacoes as Record<string, unknown>;
    const template = avaliacoes.tplPcdDirecionamento;
    if (typeof template === 'string') {
      const modalidades = direcionamento[1].split('; ').map(item => displayCanonical(item.trim(), locale)).join('; ');
      return template.replace('{p0}', modalidades);
    }
  }
  const key = DISPLAY_KEYS[text] ?? CANONICAL_KEYS[text];
  if (!key) {
    if (resolved !== 'pt-BR' && resolved !== 'pt-PT') {
      const prose = translateProse(text, resolved);
      if (prose !== text) return prose;
    }
    return text;
  }
  const dot = key.indexOf('.');
  const namespace = key.slice(0, dot);
  const section = (messages[resolved] as Record<string, unknown>)[namespace];
  if (!section || typeof section !== 'object') return text;
  const translated = (section as Record<string, unknown>)[key.slice(dot + 1)];
  return typeof translated === 'string' ? translated : text;
}

export function createReportTranslator(locale: string): ReportTranslator {
  const resolved = (routing.locales as readonly string[]).includes(locale)
    ? locale as AppLocale
    : routing.defaultLocale as AppLocale;
  return createTranslator({locale: resolved, messages: messages[resolved], namespace: 'desempenho'}) as unknown as ReportTranslator;
}

export function localizeAssessmentReport(ctx: ReportBuildCtx, t: ReportTranslator, locale?: string): BuildResult | null {
  const dv = (value: unknown) => displayValue(value, t, locale);
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
