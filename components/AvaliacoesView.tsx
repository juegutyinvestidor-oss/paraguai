'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Activity, 
  Heart, 
  Compass, 
  Target, 
  Award, 
  FileText,
  X,
  Lock,
  FileSpreadsheet,
  ClipboardList,
  HeartPulse,
  Smile,
  Sparkles,
  Apple,
  Brain,
  AlertTriangle
} from 'lucide-react';
import { type Student, type ImcRecord, type MotorRecord, type SportRecord, type VocationalRecord, type HealthRecord, type OralRecord, type AutoconceptRecord, type IasRecord, type SnapRecord, type Aq10Record, type PcdRecord, type PcdGroupConfig, type PcdAdaptacaoConfig, type PcdFaixaConfig, type PcdModalidadeConfig, type PcdFunilConfig, type ContratoItem, type EstHierarchical, type RegHierarchical, type LocHierarchical } from '../types/edukyne';
import { nextImcId, nextMotorId, nextSportId, nextVocationalId, nextHealthAssessmentId, nextOralAssessmentId, nextAutoconceptAssessmentId, nextIasAssessmentId, nextSnapAssessmentId, nextAq10AssessmentId, nextPcdAssessmentId, uuid } from '../lib/idGenerator';
import { scoreHealth, isCompleteHealthAnswers, HEALTH_LIKERT_LABELS, type HealthClassification } from '../lib/healthScore';
import { scoreOral, isCompleteOralAnswers, ORAL_ANSWER_LABELS, type OralClassification } from '../lib/oralScore';
import { scoreAutoconcept, isCompleteAutoconceptAnswers, AUTOCONCEPT_ANSWER_CODES, AUTOCONCEPT_ANSWER_LABELS, type AutoconceptAnswerCode, type AutoconceptItemType, type AutoconceptClassification } from '../lib/autoconceptScore';
import { scoreIas, isCompleteIasAnswers, type IasQuestion, type IasClassification } from '../lib/iasScore';
import { scoreSnap, isCompleteSnapAnswers, snapThresholdForAge, SNAP_LIKERT_LABELS, SNAP_RESPONDENT_LABELS, type SnapSubscale, type SnapClassification } from '../lib/snapScore';
import { scoreAq10, isCompleteAq10Answers, AQ10_LIKERT_LABELS, AQ10_RESPONDENT_LABELS, AQ10_VERSION_LABELS, aq10VersionForAge, type Aq10Version, type Aq10Classification } from '../lib/aq10Score';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { computePcdScore, PCD_TESTES, PCD_GRUPO_NOMES, PCD_DETALHES_POR_GRUPO, PCD_NOTAS_LABELS, DEFAULT_M15_ADAPTACOES, DEFAULT_M15_FAIXAS, DEFAULT_M15_MODALIDADES, DEFAULT_M15_FUNIL, M15_GRUPOS_PADRAO, type PcdScoreResult } from '../lib/pcdScore';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addReportBackground } from '../lib/pdfUtils';
import * as XLSX from 'xlsx';
import { logExport } from '../lib/auditLog';
import { ensurePerformanceReport } from '../lib/autoReport';
import type { Permission } from '../lib/rbac';

const DISPLAY_KEYS: Record<string, string> = {
  "Módulo de Avaliações": "moduloTitulo",
  "Filtro Unificado - Avaliações por Localidade e Série": "filtroTitulo",
  "Filtrar Alunos por Contrato / Região": "filtrarAlunosTitulo",
  "Vínculo permanente do registro do usuário": "vinculoPermanenteUsuario",
  "Olá,": "ola",
  "Abaixo estão listados todos os resultados consolidados das suas avaliações cadastrados em sua ficha de estudante.": "boasVindasTexto",
  "Exportar Todas as Avaliações para PDF": "exportarTodasPdfTitle",
  "Exportar PDF Completo": "exportarPdfCompleto",
  "Pesquisar por aluno...": "pesquisarAluno",
  "Selecione o Contrato...": "selecioneContrato",
  "Selecione o Estado...": "selecioneEstado",
  "Selecione a Região...": "selecioneRegiao",
  "Selecione a Localidade...": "selecioneLocalidade",
  "Selecione o Aluno:": "selecioneAlunoColuna",
  "Selecione o Aluno...": "selecioneAluno",
  "Mapear para Aluno:": "mapearAluno",
  "Grupo de Triagem:": "grupoTriagem",
  "Classificação / Detalhe:": "classificacaoDetalhe",
  "(geral)": "geralParenteses",
  "Versão do Instrumento:": "versaoInstrumento",
  "Quem preencheu este relato?": "quemPreenheu",
  "Nenhum registro de IMC cadastrado para você até o momento.": "vazioImcUsuario",
  "Nenhuma avaliação de capacidade motora cadastrada para você.": "vazioMotorUsuario",
  "Nenhuma indicação de modalidade esportiva encontrada para você.": "vazioEsporteUsuario",
  "Nenhum parecer vocacional disponível para você até o momento.": "vazioVocacionalUsuario",
  "Nenhuma avaliação de Saúde Global disponível para você até o momento.": "vazioSaudeUsuario",
  "Nenhuma avaliação de Higiene Bucal disponível para você até o momento.": "vazioOralUsuario",
  "Nenhuma avaliação de Autoconceito disponível para você até o momento.": "vazioAutoUsuario",
  "Nenhuma avaliação de Índice Alimentar disponível para você até o momento.": "vazioIasUsuario",
  "Nenhuma avaliação de Rastreamento do TDAH disponível para você até o momento.": "vazioSnapUsuario",
  "Nenhuma avaliação de Rastreamento Precoce do TEA disponível para você até o momento.": "vazioAq10Usuario",
  "Nenhum registro de IMC encontrado.": "vazioImcTabela",
  "Nenhuma avaliação de capacidade motora cadastrada.": "vazioMotorTabela",
  "Nenhuma indicação de esporte recomendada neste painel.": "vazioEsporteTabela",
  "Nenhum laudo vocacional disponível no catálogo.": "vazioVocCatalogo",
  "Nenhum parecer vocacional disponível.": "vazioVocPdf",
  "Nenhuma avaliação de Saúde Global disponível no catálogo.": "vazioSaudeCatalogo",
  "Nenhuma avaliação de Higiene Bucal disponível no catálogo.": "vazioOralCatalogo",
  "Nenhuma avaliação de Autoconceito disponível no catálogo.": "vazioAutoCatalogo",
  "Nenhuma avaliação de Índice Alimentar disponível no catálogo.": "vazioIasCatalogo",
  "Nenhuma avaliação de Rastreamento do TDAH disponível no catálogo.": "vazioSnapCatalogo",
  "Nenhuma avaliação de Rastreamento Precoce do TEA disponível no catálogo.": "vazioAq10Catalogo",
  "Nenhuma avaliação PCD disponível no catálogo.": "vazioPcdCatalogo",
  "Nenhuma indicação de modalidade esportiva encontrada.": "vazioEsportePdf",
  "Sem dados para calcular a matriz de compatibilidade.": "vazioMatriz",
  "Índice de Massa Corporal (IMC)": "tituloImc",
  "Qualidade Motora": "tituloMotor",
  "Esporte Indicado": "tituloEsporte",
  "Vocacionamento": "tituloVocacional",
  "Saúde Global": "tituloSaude",
  "Higiene Bucal": "tituloOral",
  "Autoconceito": "tituloAuto",
  "Índice Alimentar": "tituloIas",
  "Rastreamento do TDAH (SNAP-IV)": "tituloSnap",
  "Rastreamento Precoce do TEA (AQ-10)": "tituloAq10",
  "Avaliação PCD": "tituloPcd",
  "Rastreamento TDAH": "tituloSnapCurto",
  "Rastreamento TEA": "tituloAq10Curto",
  "Data do Registro": "colunaDataRegistro",
  "Data da Indicação": "colunaDataIndicacao",
  "Peso": "colunaPeso",
  "Altura": "colunaAltura",
  "IMC": "colunaImc",
  "IMC Calculado": "colunaImcCalculado",
  "Classificação": "colunaClassificacao",
  "Classificação:": "campoClassificacao",
  "Aferido em": "colunaAferidoEm",
  "Impulsão": "colunaImpulsao",
  "Abdômen": "colunaAbdomen",
  "Agilidade": "colunaAgilidade",
  "Força Muscular": "colunaForcaMuscular",
  "Velocidade": "colunaVelocidade",
  "Geral": "colunaGeral",
  "Índice Corporal": "colunaIndiceCorporal",
  "Físico Motor": "colunaFisicoMotor",
  "Esporte Sugerido": "colunaEsporteSugerido",
  "Recomendações": "colunaRecomendacoes",
  "Perfil Dominante": "colunaPerfilDominante",
  "Área de Interesse": "colunaAreaInteresse",
  "Carreira Indicada": "colunaCarreiraIndicada",
  "Parecer do Orientador": "colunaParecerOrientador",
  "Escore Bruto": "colunaEscoreBruto",
  "Escore Bruto:": "campoEscoreBruto",
  "Escore T": "colunaEscoreT",
  "Escore T:": "campoEscoreT",
  "Parecer": "colunaParecer",
  "Pontuação (0-12)": "colunaPontuacao12",
  "Pontuação (0-12):": "campoPontuacao12",
  "Pontuação (0-30)": "colunaPontuacao30",
  "Pontuação (0-30):": "campoPontuacao30",
  "Pontuação (0-100)": "colunaPontuacao100",
  "Pontuação (0-100):": "campoPontuacao100",
  "Pontuação (0-10)": "colunaPontuacao10",
  "Pontuação (0-10):": "campoPontuacao10",
  "Desatenção (0-9)": "colunaDesatencao",
  "Hiper/Impulsividade (0-9)": "colunaHiperImpulsividade",
  "Hiper/Impuls. (0-9)": "colunaHiperImpulsCurta",
  "Relato de": "colunaRelatoDe",
  "Versão": "colunaVersao",
  "Grupo": "colunaGrupo",
  "Perfil": "colunaPerfil",
  "Modalidade Sugerida": "colunaModalidadeSugerida",
  "Data": "colunaData",
  "Última aferição": "colunaUltimaAfericao",
  "Última atualização": "colunaUltimaAtualizacao",
  "kg": "unidadeKg",
  "Medir IMC": "botaoMedirImc",
  "Avaliar Qualidade Motora": "botaoAvaliarMotor",
  "Nova Indicação Esportiva": "botaoNovaIndicacao",
  "Gerar Vocacionamento": "botaoGerarVocacional",
  "Avaliar Saúde Global": "botaoAvaliarSaude",
  "Avaliar PCD": "botaoAvaliarPcd",
  "Avaliar Higiene Bucal": "botaoAvaliarOral",
  "Avaliar Autoconceito": "botaoAvaliarAuto",
  "Avaliar Índice Alimentar": "botaoAvaliarIas",
  "Avaliar Rastreamento TDAH": "botaoAvaliarSnap",
  "Avaliar Rastreamento TEA": "botaoAvaliarAq10",
  "Editar Avaliação": "titleEditarAvaliacao",
  "Excluir Medição": "titleExcluirMedicao",
  "Excluir Cadastro": "titleExcluirCadastro",
  "Editar Esporte": "titleEditarEsporte",
  "Excluir Registro": "titleExcluirRegistro",
  "Editar Parecer": "titleEditarParecer",
  "Excluir Parecer": "titleExcluirParecer",
  "Excluir Avaliação": "titleExcluirAvaliacao",
  "Ajustar Medição de IMC": "tituloAjustarImc",
  "Novo Lançamento Fisiológico (IMC)": "tituloNovoImc",
  "Editar Avaliação Motora": "tituloEditarMotor",
  "Nova Avaliação de Qualidade Motora": "tituloNovoMotor",
  "Salvar Edições": "botaoSalvarEdicoes",
  "Salvar Recomendações": "botaoSalvarRecomendacoes",
  "Diligenciar Vocação": "botaoDiligenciar",
  "Salvar Diligência": "botaoSalvarDiligencia",
  "Revisar Avaliação de Saúde Global": "tituloRevisarSaude",
  "Nova Avaliação de Saúde Global": "tituloNovoSaude",
  "Revisar Avaliação PCD": "tituloRevisarPcd",
  "Nova Avaliação PCD": "tituloNovoPcd",
  "Revisar Avaliação de Higiene Bucal": "tituloRevisarOral",
  "Nova Avaliação de Higiene Bucal": "tituloNovoOral",
  "Revisar Avaliação de Autoconceito": "tituloRevisarAuto",
  "Nova Avaliação de Autoconceito": "tituloNovoAuto",
  "Revisar Índice Alimentar": "tituloRevisarIas",
  "Novo Índice Alimentar": "tituloNovoIas",
  "Salvar Revisão": "botaoSalvarRevisao",
  "Entregar Avaliação": "botaoEntregarAvaliacao",
  "Peso (kg):": "campoPeso",
  "Altura (metros):": "campoAltura",
  "Visualização do IMC Estimado": "tituloImcEstimado",
  "Impulsão:": "campoImpulsao",
  "Abdômen:": "campoAbdomen",
  "Agilidade:": "campoAgilidade",
  "Força Muscular:": "campoForcaMuscular",
  "Velocidade:": "campoVelocidade",
  "Classificação Geral (automática):": "campoClassificacaoGeral",
  "Sem dados de IMC": "placeholderSemImc",
  "Sem dados motores": "placeholderSemMotor",
  "Selecione um aluno com perfil motor e biometria avaliados": "placeholderSemPerfilMotor",
  "Índice Corporal:": "campoIndiceCorporal",
  "Físico Motor:": "campoFisicoMotor",
  "Esporte Indicado:": "campoEsporteIndicado",
  "Ex: 3h por semana em dias alternados": "placeholderRecomendacoes",
  "Recomendações:": "campoRecomendacoes",
  "Questionário de Mapeamento (12 Perguntas)": "tituloQuestionario",
  "Auto-calculado...": "calculadoAutomatico",
  "Auto-calculado se vazio...": "calculadoSeVazio",
  "Auto-calculado a partir da classificação...": "calculadoDaClassificacao",
  "Auto...": "placeholderAuto",
  "Perfil Psicológico:": "campoPerfilPsicologico",
  "Gostos / Interesses:": "campoGostos",
  "Carreira Sugerida:": "campoSugerida",
  "Parecer Técnico Detalhado:": "campoParecerTecnico",
  "Avaliar Aluno:": "botaoAvaliarAluno",
  "(invertido)": "marcadorInvertido",
  "(negativo)": "marcadorNegativo",
  "Perfil e Valências (auto):": "tituloPerfilValencias",
  "Vel/Agil": "colunaVelAgil",
  "Força Expl.": "colunaForcaExpl",
  "Membros Sup.": "colunaMembrosSup",
  "Core": "colunaCore",
  "Perfil:": "campoPerfil",
  "Direcionamento:": "campoDirecionamento",
  "Preencha ao menos um teste para calcular.": "dicaPreenchaTeste",
  "Radar de Valências:": "tituloRadar",
  "Matriz de Compatibilidade Esportiva (Ranking por IAR bruto):": "tituloMatriz",
  "IAR": "colunaIar",
  "· norm.": "iarNormalizado",
  "IAR bruto = Σ(Nota × Peso) do protocolo (Etapa D). O valor normalizado (1–3) permite comparar modalidades quando há testes não aplicáveis no grupo; o ranking usa o IAR bruto.": "notaIar",
  "Funil Qualitativo de Decisão (Etapa E):": "tituloFunil",
  "Somente após a análise conjunta dos três filtros deve ser realizado o direcionamento esportivo inicial.": "notaFunil",
  "Bateria de Testes Motores": "tituloBateria",
  "Valor inválido: em teste de tempo, 0 não é aceito. Deixe vazio se não realizou.": "avisoValorInvalido",
  "Testes marcados como &quot;Não aplicável&quot; no Módulo 15 são ignorados no cálculo. Notas variam de 1 (inicial) a 3 (avançado).": "avisoTestesNaoAplicaveis",
  "Testes adaptados/substituídos neste grupo:": "tituloTestesAdaptados",
  "Na ausência de referência específica validada para o teste alternativo, o resultado deve ser interpretado de forma descritiva e funcional (Etapa B), sem criação de normas artificiais.": "notaTesteAlternativo",
  "Substituído": "statusSubstituido",
  "Preencher a Avaliação de Qualidade motora.": "erroPreencherMotor",
  "Selecione um aluno válido antes de salvar.": "erroSelecionarAluno",
  "Peso e Altura devem ser valores positivos.": "erroPesoAltura",
  "Responda todas as perguntas do questionário antes de entregar o parecer.": "erroResponderVoc",
  "Preenha ao menos um teste válido para calcular o parecer.": "erroPreencherPcd",
  "Cadastre a data de nascimento do aluno para aplicar o HU-DBI.": "erroNascimentoOral",
  "O HU-DBI é aplicável a partir de 11 anos.": "erroIdadeOral",
  "Responda todas as afirmações (Concordo/Discordo) antes de entregar o parecer.": "erroResponderOral",
  "Responda todas as afirmações antes de entregar o parecer.": "erroResponderAuto",
  "Responda todas as perguntas antes de entregar o parecer.": "erroResponderIas",
  "Cadastre a data de nascimento do aluno para aplicar o SNAP-IV.": "erroNascimentoSnap",
  "O SNAP-IV é aplicável a alunos de 5 a 17 anos.": "erroIdadeSnap",
  "Selecione quem preencheu o relato (Pai, Mãe, Responsável ou Professor).": "erroRespondenteSnap",
  "Responda todos os 18 itens antes de entregar o parecer.": "erroItensSnap",
  "Selecione quem preencheu o relato (Pai, Mãe ou Responsável).": "erroRespondenteAq10",
  "Responda todos os 10 itens antes de entregar o parecer.": "erroItensAq10",
  "Por favor, cadastre o Índice de Massa Corporal (IMC) deste aluno antes de indicar um esporte.": "erroImcAntesEsporte",
  "Tem certeza de que deseja remover permanentemente": "confirmarRemoverPrefixo",
  "de": "confirmarRemoverDe",
  "a medição de IMC": "tipoExclusaoImc",
  "a avaliação de qualidade motora": "tipoExclusaoMotor",
  "o registro de esporte indicado": "tipoExclusaoEsporte",
  "o parecer de vocacionamento": "tipoExclusaoVoc",
  "a avaliação de saúde global": "tipoExclusaoSaude",
  "a avaliação de higiene bucal": "tipoExclusaoOral",
  "a avaliação de autoconceito": "tipoExclusaoAuto",
  "a avaliação de índice alimentar": "tipoExclusaoIas",
  "a avaliação de rastreamento do TDAH": "tipoExclusaoSnap",
  "a avaliação de rastreamento precoce do TEA": "tipoExclusaoAq10",
  "a avaliação de qualidade motora PCD": "tipoExclusaoPcd",
  "? Esta ação não pode ser desfeita.": "confirmarRemoverSufixo",
  "1. Índice de Massa Corporal (IMC)": "relatorioSecaoImc",
  "1º Ano Médio - A": "ano1A",
  "2º Ano Médio - B": "ano2B",
  "3º Ano Médio - A": "ano3A",
  "A estética e a criatividade do resultado final.": "vocQ7C",
  "A maior parte dos meus cereais diários são integrais (2 ou mais porções/dia).": "iasQ5O3",
  "A)": "opcaoA",
  "Administração, Economia, Ciências Contábeis, Marketing, Logística e Gestão de Recursos Humanos.": "carreiraNegocios",
  "Administrar recursos e organizar doações.": "vocQ9D",
  "afirmações)": "unidadeAfirmacoes",
  "Alcançar sucesso financeiro e cargo de chefia.": "vocQ12D",
  "Alerta – Uso exclusivo para rastreamento inicial": "alertaRastreamento",
  "Alimentação muito baixa em gordura saturada (priorizo carnes magras e grelhados).": "iasQ10O3",
  "aluno(s) sem data de nascimento cadastrada ficam fora da seleção deste teste.": "alunosSemNascimentoNota",
  "AQ-10 -": "aq10Header",
  "Às vezes, me sinto inútil.": "autoQ9",
  "Às vezes, penso que não sirvo para nada.": "autoQ8",
  "Avaliações de Autoconceito (Rosenberg)": "tituloAvaliacoesAuto",
  "Avaliações de Higiene Bucal (HU-DBI)": "tituloAvaliacoesOral",
  "Avaliações de IMC (Índice de Massa Corporal)": "tituloAvaliacoesImc",
  "Avaliações de Indicação Esportiva": "tituloAvaliacoesEsporte",
  "Avaliações de Perfil Vocacional": "tituloAvaliacoesVoc",
  "Avaliações de Qualidade Motora": "tituloAvaliacoesMotor",
  "Avaliações de Qualidade Motora PCD": "tituloAvaliacoesPcd",
  "Avaliações de Saúde Global (KIDSCREEN-10)": "tituloAvaliacoesSaude",
  "B)": "opcaoB",
  "Baixíssimo consumo de proteínas ao longo do dia.": "iasQ7O1",
  "Basquete e Vôlei": "sugeridoBasqueteVolei",
  "Biologia, Educação Física ou Artes.": "vocQ3C",
  "Biológicas e Criativas": "perfilBioCriativo",
  "Boa memória para dados e facilidade com números.": "vocQ11B",
  "C)": "opcaoC",
  "Calorias de Fontes Vazias (açúcar de adição, doces, refrigerantes, álcool e gorduras sólidas)": "iasQ11Titulo",
  "Carnes, Ovos e Leguminosas (fontes de proteína em geral)": "iasQ7Titulo",
  "Cereais Integrais (arroz integral, aveia, pão integral, linhaça, chia)": "iasQ5Titulo",
  "Como ele foi construído e sua estrutura lógica.": "vocQ7B",
  "Como feijão e/ou vegetais verde-escuros praticamente todos os dias.": "iasQ4O3",
  "Como feijão ou vegetais escuros de 3 a 4 vezes por semana.": "iasQ4O2",
  "Como você costuma resolver um problema difícil?": "vocQ4",
  "Como você descreveria suas habilidades?": "vocQ11",
  "componentes)": "unidadeComponentes",
  "Consumo 1 porção por dia (ex: 1 fatia de melancia ou 1 maçã).": "iasQ1O2",
  "Consumo 2 ou mais porções de frutas todos os dias.": "iasQ1O3",
  "Consumo 3 porções por dia (recomendação padrão de cálcio).": "iasQ6O3",
  "Consumo de 1 a 2 porções por dia.": "iasQ6O2",
  "Consumo doces, refrigerantes ou bebidas açucaradas/alcoólicas todos os dias.": "iasQ11O1",
  "Consumo fontes saudáveis distribuídas no almoço, jantar e lanches.": "iasQ7O3",
  "Consumo pelo menos 1 porção de cereal integral ou sementes por dia.": "iasQ5O2",
  "Consumo proteínas em apenas uma das grandes refeições.": "iasQ7O2",
  "Consumo vegetais apenas em 1 refeição (só almoço ou só jantar).": "iasQ3O2",
  "Consumo vegetais no almoço e no jantar todos os dias.": "iasQ3O3",
  "Corre de um lado para outro ou sobe demais nas coisas em situações em que isto é inapropriado.": "snapQ12",
  "Criança (4-11)": "crianca4a11",
  "Criando uma solução prática e inovadora.": "vocQ4C",
  "Criativo e Tecnológico": "perfilCriativoTecnologico",
  "D)": "opcaoD",
  "Desatenção": "subescalaDesatencao",
  "Desenhar, pintar ou cuidar da apresentação visual.": "vocQ1C",
  "Direito, Letras, Pedagogia, Psicologia, História, Jornalismo e Relações Internacionais.": "carreiraHumanas",
  "Distrai-se com estímulos externos.": "snapQ8",
  "Durante a leitura de uma história, ele/a tem dificuldades em perceber as intenções e as emoções das personagens.": "aq10Q7",
  "É curiosa sobre como as coisas funcionam e operam.": "vocQ5B",
  "É esquecido em atividades do dia-a-dia.": "snapQ9",
  "É organizada, prática e gosta de dar ordens.": "vocQ5D",
  "EDUKYNE - Relatório Consolidado de Avaliações": "relatorioTitulo",
  "Ele(a) acha situações sociais fáceis.": "aq10Q19",
  "Ele(a) geralmente foca mais na imagem ou situação como um todo, do que nos pequenos detalhes.": "aq10Q12",
  "Ele(a) sempre percebe padrões/categorias nas coisas.": "aq10Q11",
  "Ele/a não sabe como manter uma conversa com os seus pares.": "aq10Q5",
  "Ele/a nota muitas vezes pequenos ruídos que passam despercebidos às outras pessoas.": "aq10Q1",
  "Ele/a percebe facilmente o que alguém está a pensar ou a sentir, apenas olhando para a sua cara.": "aq10Q9",
  "Em caso de interrupção, ele(a) consegue voltar rapidamente ao que estava fazendo.": "aq10Q14",
  "Em um trabalho de grupo na escola, você prefere:": "vocQ1",
  "Engenharias, Ciência da Computação, Matemática, Física, Arquitetura e Tecnologia da Informação.": "carreiraExatas",
  "Entre estas opções de leitura, qual você prefere?": "vocQ10",
  "Escala: Concordo Totalmente (0) • Concordo em Parte (1) • Discordo em Parte (2) • Discordo Totalmente (3)": "escalaConcordo",
  "Escala: Nem um pouco (0) • Só um pouco (1) • Bastante (2) • Demais (3)": "escalaFrequencia",
  "Estudante com forte inclinação humanística, gosto evidente pela comunicação verbal e escrita, além de alto potencial de empatia.": "perfilTextoHumanas",
  "Eu acho que é impossível evitar problemas na gengiva apenas escovando os dentes.": "oralQ6",
  "Eu costumo escovar meus dentes logo após cada refeição.": "oralQ7",
  "Eu escovo a minha língua com frequência.": "oralQ16",
  "Eu examino meus dentes detalhadamente no espelho após a escovação.": "oralQ12",
  "Eu sinto que escovo meus dentes com muita força.": "oralQ18",
  "Eu sinto que já limpo bem os meus dentes sem precisar usar o fio dental.": "oralQ8",
  "Eu sinto que meus dentes estão piorando, mesmo escovando todos os dias.": "oralQ10",
  "Eu só vou ao dentista quando estou sentindo alguma dor.": "oralQ20",
  "Eu uso uma técnica de escovação recomendada pelo meu dentista.": "oralQ9",
  "Evita, não gosta ou se envolve contra a vontade em tarefas que exigem esforço mental prolongado.": "snapQ6",
  "Exatas e Tecnológicas": "perfilExatas",
  "Exista liderança, metas claras e decisões rápidas.": "vocQ8D",
  "Fazer a diferença na sociedade e no mundo.": "vocQ12A",
  "Fazer os cálculos ou criar gráficos para os dados.": "vocQ1B",
  "Força": "areaForca",
  "Força Explosiva": "habilidadeForcaExplosiva",
  "Frequentemente, ele(a) percebe que não sabe como manter uma conversa.": "aq10Q15",
  "Frutas Integrais (apenas fruta inteira/pedaços, sem sucos)": "iasQ2Titulo",
  "Geografia, Redação ou Sociologia.": "vocQ3D",
  "Ginástica": "modalidadeGinastica",
  "Gordura Saturada (carnes gordas, pele de frango, manteiga, óleo de coco, queijos amarelos)": "iasQ10Titulo",
  "Habitualmente, ele/a concentra-se mais na imagem ou situação no seu todo, do que nos seus pequenos detalhes.": "aq10Q2",
  "História, Literatura ou Filosofia.": "vocQ3A",
  "HU-DBI (": "oralHeader",
  "IAS (": "iasHeader",
  "idade não cadastrada": "idadeNaoCadastrada",
  "Índice de Alimentação Saudável (IAS)": "tituloIasCompleto",
  "Itens clínicos – Desatenção (0-9):": "itensDesatencao",
  "Itens clínicos – Hiper/Impulsividade (0-9):": "itensHiperImpulsividade",
  "itens)": "unidadeItens",
  "Já me disseram que tenho bom hálito.": "oralQ11",
  "KIDSCREEN-10 (": "saudeHeader",
  "Laticínios (leite, queijo, iogurte - preferencialmente menos gordura)": "iasQ6Titulo",
  "Livros sobre economia, finanças ou administração.": "vocQ10D",
  "Matemática, Física ou Química.": "vocQ3B",
  "Medicina, Biologia, Design, Publicidade, Artes Visuais, Educação Física e Veterinária.": "carreiraBioCriativa",
  "Mexe com as mãos ou pés ou se remexe na cadeira.": "snapQ10",
  "Montando um plano de ação passo a passo.": "vocQ4D",
  "Montar ou consertar coisas, ou jogar jogos de lógica.": "vocQ2B",
  "Muita imaginação, criatividade e intuição.": "vocQ11C",
  "não cadastrado": "naoCadastrado",
  "Não cadastrado": "NaoCadastrado",
  "Não consegue prestar muita atenção a detalhes ou comete erros por descuido nos trabalhos da escola ou tarefas.": "snapQ1",
  "Não consumo esses alimentos ou uso apenas óleos vegetais comuns.": "iasQ8O1",
  "Não consumo laticínios (ou equivalentes vegetais fortificados com cálcio).": "iasQ6O1",
  "Não informada": "NaoInformada",
  "Não me preocupo muito em ir ao dentista.": "oralQ1",
  "Não pára ou freqüentemente está a “mil por hora”.": "snapQ14",
  "Não se aplica": "NaoSeAplica",
  "Não segue instruções até o fim e não termina deveres de escola, tarefas ou obrigações.": "snapQ4",
  "Natação": "modalidadeNatacao",
  "Negócios e Gestão": "perfilNegocios",
  "Nenhum aluno com idade compatível para teste (": "semAlunoCompativel",
  "No pré-escolar, ele/a gostava de brincar a jogos de faz-de-conta com as outras crianças.": "aq10Q8",
  "No seu tempo livre, o que você mais gosta de fazer?": "vocQ2",
  "O AQ-10 é um instrumento de rastreamento (triagem) e não confirma o diagnóstico de TEA.\n                  A pontuação avalia apenas sinais de alerta relatados pelos pais/responsáveis para os itens\n                  de comunicação social e flexibilidade comportamental. Para o diagnóstico formal, é obrigatória\n                  a avaliação multidisciplinar especializada (neuropediatra ou psiquiatra infantil e neuropsicólogo).": "notaAq10Longa",
  "O AQ-10 é um instrumento de rastreamento (triagem) e não substitui o diagnóstico formal de TEA.": "notaAq10Curta",
  "O estudante apresenta um perfil dinâmico correspondente às ciências Biológicas e Criativas. Observa-se uma combinação única entre a sensibilidade artística e o fascínio pelo bem-estar, pela saúde e pela preservação da vida em suas diversas formas. Este perfil é movido pelo desejo de inventar, expressar ideias visualmente ou cuidar de organismos vivos.": "perfilTextoBioCriativo",
  "O estudante demonstra interesse voltado para a análise crítica da sociedade, mediação de conflitos e transmissão de conhecimento. Suas competências se alinham perfeitamente a profissões que exigem escuta ativa, escrita fluida e pensamento humanístico.": "perfilTextoHumanasLongo",
  "O estudante manifesta um raciocínio lógico altamente estruturado, facilidade para lidar com dados abstratos e numéricos, além de uma curiosidade natural para entender o funcionamento de sistemas complexos e novas tecnologias. Trata-se de um perfil focado na resolução prática de problemas, otimização de processos e inovação técnica.": "perfilTextoExatas",
  "O estudante não se limita a apenas um campo do saber; ele utiliza a criatividade para dar forma à tecnologia, solucionando problemas de interface, interatividade e experiência do usuário de maneira inovadora.": "perfilTextoCriativoTecnologico",
  "O impacto que ele terá na vida das pessoas.": "vocQ7A",
  "O que é mais importante em uma futura profissão para você?": "vocQ12",
  "O que mais chama sua atenção em um projeto?": "vocQ7",
  "O resultado indica um perfil predominantemente voltado para Negócios e Gestão. O avaliado demonstra traços natos de liderança, visão estratégica, pragmatismo e uma aptidão natural para organizar rotinas, gerenciar recursos e liderar equipes em direção a metas comuns.": "perfilTextoNegocios",
  "O SNAP-IV é uma ferramenta de rastreamento de sintomas e não confirma o diagnóstico de TDAH.\n                  A classificação considera apenas os sintomas (critério A do DSM-5-TR) relatados para os últimos seis meses.\n                  Para o diagnóstico formal, é obrigatório avaliar também os critérios B-E do DSM-5-TR:\n                  início dos sintomas antes dos 12 anos (B), presença em pelo menos dois contextos (C),\n                  prejuízo clinicamente significativo (D) e exclusão de outras causas (E). O DSM-5-TR permite o diagnóstico conjunto com TEA.": "notaSnapLonga",
  "O SNAP-IV é uma ferramenta de rastreamento inicial e não substitui o diagnóstico médico de TDAH.": "notaSnapCurta",
  "Os seus pais têm tratado você com justiça?": "healthQ6",
  "Ótimo para design de jogos ou desenvolvimento web.": "textoExatasWeb",
  "Ouvir, aconselhar e cuidar da saúde ou direitos.": "vocQ9A",
  "Parece não estar ouvindo quando se fala diretamente com ele.": "snapQ3",
  "Perde coisas necessárias para atividades (p. ex: brinquedos, deveres da escola, lápis ou livros).": "snapQ7",
  "perguntas)": "unidadePerguntas",
  "pts)": "unidadePontos",
  "Qual destas matérias escolares você acha mais interessante?": "vocQ3",
  "Quando era mais novo(a), ele(a) gostava de brincar de faz-de-conta com outras crianças.": "aq10Q17",
  "Quando está em um grupo social, ele(a) consegue facilmente acompanhar conversas de várias pessoas.": "aq10Q13",
  "Quando está num grupo social, ele/a consegue facilmente seguir conversas de várias pessoas.": "aq10Q3",
  "Quando o assunto é ajudar os outros, você prefere:": "vocQ9",
  "Raramente consumo (menos de 1 vez por semana) açúcar refinado, refrigerantes ou álcool.": "iasQ11O3",
  "Revistas científicas ou livros de tecnologia e inovação.": "vocQ10B",
  "Revistas de decoração, design ou histórias em quadrinhos.": "vocQ10C",
  "Rosenberg (": "autoHeader",
  "Sai do lugar na sala de aula ou em outras situações em que se espera que fique sentado.": "snapQ11",
  "SNAP-IV (": "snapHeader",
  "Só consumo cereais refinados (arroz branco, pão francês, macarrão normal).": "iasQ5O1",
  "Só tomo suco ou não como frutas.": "iasQ2O1",
  "Socialmente, ele(a) é um(a) bom(boa) conversador(a).": "aq10Q16",
  "Socialmente, ele/a é bom/boa conversador/a.": "aq10Q6",
  "Sódio (Sal de cozinha e alimentos salgados)": "iasQ9Titulo",
  "Sou capaz de fazer as coisas tão bem quanto a maioria das outras pessoas.": "autoQ4",
  "Tem dificuldade de manter a atenção em tarefas ou atividades de lazer.": "snapQ2",
  "Tenho uma atitude positiva em relação a mim mesmo(a).": "autoQ2",
  "Um centro de alta tecnologia ou uma feira de ciências.": "vocQ6B",
  "Uma cidade histórica cheia de museus e cultura.": "vocQ6A",
  "Uma grande metrópole de negócios e comércio.": "vocQ6D",
  "Uma reserva ecológica ou um centro de artes.": "vocQ6C",
  "Usando números, dados e fatos exatos.": "vocQ4B",
  "Vegetais Escuros e Leguminosas (brócolis, couve, espinafre, feijão, lentilha...)": "iasQ4Titulo",
  "Você é movido pela criatividade, gosta de inventar, inovar ou tem forte interesse pela vida e saúde.": "perfilCurtoBioCriativo",
  "Você gosta de resolver problemas lógicos, lidar com números e entender como as tecnologias funcionam.": "perfilCurtoExatas",
  "Você gosta de se comunicar, ajudar as pessoas e entender a sociedade.": "perfilCurtoHumanas",
  "Você prefere um ambiente de trabalho onde:": "vocQ8",
  "Você se considera uma pessoa que:": "vocQ5",
  "Você tem espírito de liderança, gosta de organizar, gerenciar recursos e traçar estratégias.": "perfilCurtoNegocios",
  "Você tem podido fazer as coisas que quer no seu tempo livre?": "healthQ5",
  "Você tem se divertido com os seus amigos?": "healthQ7",
  "Você tem se saído bem na escola/estudos?": "healthQ8",
  "Você tem se sentido bem e com energia?": "healthQ1",
  "Você tem se sentido deprimido(a) ou sem esperança?": "healthQ10",
  "Você tem se sentido sozinho(a)?": "healthQ3",
  "Você tem se sentido triste?": "healthQ2",
  "Você tem sido capaz de prestar atenção/se concentrar?": "healthQ9",
  "Você tem tido tempo suficiente para si mesmo(a)?": "healthQ4",
  "Vôlei": "modalidadeVolei",
  "Sinto que não tenho muito do que me orgulhar.": "autoQ5",
  "anos": "unidadeAnos",
  "Adolescente (12-15)": "adolescente12a15",
  "Criança (4 a 11 anos)": "aq10CriancaLabel",
  "Adolescente (12 a 15 anos)": "aq10AdolescenteLabel",
  "Nunca": "labelNunca",
  "Raramente": "labelRaramente",
  "Às vezes": "labelAsVezes",
  "Frequentemente": "labelFrequentemente",
  "Sempre": "labelSempre",
  "Concordo": "labelConcordo",
  "Discordo": "labelDiscordo",
  "Concordo Totalmente": "labelConcordoTotalmente",
  "Concordo em Parte": "labelConcordoEmParte",
  "Discordo em Parte": "labelDiscordoEmParte",
  "Discordo Totalmente": "labelDiscordoTotalmente",
  "Nem um pouco": "labelNemUmPouco",
  "Só um pouco": "labelSoUmPouco",
  "Bastante": "labelBastante",
  "Demais": "labelDemais",
  "Pai": "labelPai",
  "Mãe": "labelMae",
  "Responsável": "labelResponsavel",
  "Professor(a)": "labelProfessor",
  "Qualidade de Vida Baixa": "classSaudeBaixa",
  "Qualidade de Vida Normal": "classSaudeNormal",
  "Qualidade de Vida Alta": "classSaudeAlta",
  "Autoestima Baixa": "classAutoBaixa",
  "Autoestima Equilibrada": "classAutoEquilibrada",
  "Autoestima Alta": "classAutoAlta",
  "Alto Desempenho": "classOralAlta",
  "Desempenho Moderado": "classOralModerada",
  "Baixo Desempenho": "classOralBaixa",
  "Dieta de Má Qualidade": "classIasBaixa",
  "Necessita de Modificações": "classIasModificacoes",
  "Boa Qualidade (Saudável)": "classIasBoa",
  "Sinais de Desatenção": "classSnapDesatencao",
  "Sinais de Hiperatividade/Impulsividade": "classSnapHiper",
  "Sinais Combinados": "classSnapCombinados",
  "Sem Indícios Significativos": "classSnapSemIndicios",
  "Traços comportamentais dentro da média da população geral": "classAq10Media",
  "Pontuação Indicativa (Alerta de Traços Elevados de TEA)": "classAq10Alerta",
  "Não aplicável": "NaoAplicavel",
  "Padrão": "statusPadrao",
  "Adaptado": "statusAdaptado",
  "Limitações Agudas": "notaPcd1",
  "Desempenho Mediano": "notaPcd2",
  "Desempenho Elevado": "notaPcd3",
  "Mesomorfo": "biotipoMesomorfo",
  "Ectomorfo": "biotipoEctomorfo",
  "Endomorfo": "biotipoEndomorfo",
  "3h por semana": "pratica3h",
  "Regular": "classRegular",
  "Bom": "classBom",
  "Excelente": "classExcelente",
  "Insuficiente": "classInsuficiente",
  "Precisa de Treino": "classPrecisaTreino",
  "Masculino": "sexoMasculino",
  "Feminino": "sexoFeminino",
  "Todos": "todos",
  "Todas": "todas",
  "14-18 anos": "faixa14a18",
  "8-18 anos": "faixa8a18",
  "4-15 anos": "faixa4a15",
  "11+ anos": "faixa11mais",
  "5-17 anos": "faixa5a17",
  "Aprimorar Habilidades Motoras": "sugeridoAprimorar",
  "fora da faixa": "foraDaFaixa",
  "Aguardando Dados": "classAguardando",
  "Abaixo do peso": "classAbaixoPeso",
  "Peso normal": "classPesoNormal",
  "Sobrepeso": "classSobrepeso",
  "Obesidade": "classObesidade",
  "Todas as idades": "todasIdades",
  "Todos os sexos": "todosSexos",
  "ou mais": "ouMais",
  "ou menos": "ouMenos",
  "a": "conectorIntervalo",
  "2. Qualidade Motora": "relatorioSecaoMotor",
  "3. Esporte Indicado": "relatorioSecaoEsporte",
  "4. Perfil Vocacional": "relatorioSecaoVoc",
  "5. Saúde Global (KIDSCREEN-10)": "relatorioSecaoSaude",
  "6. Higiene Bucal (HU-DBI)": "relatorioSecaoOral",
  "7. Autoconceito (Rosenberg)": "relatorioSecaoAuto",
  "8. Índice Alimentar (IAS)": "relatorioSecaoIas",
  "9. Rastreamento de Sintomas de TDAH (SNAP-IV)": "relatorioSecaoSnap",
  "10. Rastreamento Precoce do Autismo (AQ-10)": "relatorioSecaoAq10",
  "Rastreamento de Sintomas de TDAH (SNAP-IV)": "tituloSnapCompleto",
  "Rastreamento Precoce do Autismo (AQ-10)": "tituloAq10Completo",
  "Altura (m)": "colunaAlturaM",
  "Peso (kg)": "colunaPesoKg",
  "Nome do Aluno": "colunaNomeAluno",
  "Carreira": "colunaCarreira",
  "Respondente": "colunaRespondente",
  "Sugerido": "colunaSugerido",
  "Compatibilidade": "colunaCompatibilidade",
  "Estudante": "palavraEstudante",
  "Turno Desconhecido": "turnoDesconhecido",
  "Hibrido": "biotipoHibrido",
  "Humanas e Sociais": "perfilHumanasSociais",
  "Hiperatividade/Impulsividade": "subescalaHiperatividade",
  "Zona Sul": "zonaSul",
  "Zona Norte": "zonaNorte",
  "Zona Leste": "zonaLeste",
  "Centro": "centro",
  "eutrofia": "classEutrofia",
  "magreza": "classMagreza",
  "peso ideal": "classPesoIdeal",
  "sobrepeso": "classSobrepesoMin",
  "obeso": "classObeso",
  "baixo": "classBaixo",
  "Indicar Esporte": "botaoIndicarEsporte",
  "Indicar Novo Esporte": "botaoIndicarNovoEsporte",
  "Atualizar Esporte Recomendado": "botaoAtualizarEsporte",
  "Cadastrar Parecer": "botaoCadastrarParecer",
  "Entregar Parecer": "botaoEntregarParecer",
  "Salvar Ajustes": "botaoSalvarAjustes",
  "Salvar Registro": "botaoSalvarRegistro",
  "Mapear Novo Perfil Vocacional": "botaoMapearNovoPerfil",
  "Novo Rastreamento do TDAH": "botaoNovoSnap",
  "Novo Rastreamento Precoce do TEA": "botaoNovoAq10",
  "Revisar Rastreamento do TDAH": "botaoRevisarSnap",
  "Revisar Rastreamento Precoce do TEA": "botaoRevisarAq10",
  "__confirmarRemoverFrase__": "confirmarRemoverFrase",
  "m": "unidadeM",
  "Filtros:": "filtrosLabel",
  "Turma:": "turmaLabel",
  "Unidade:": "unidadeLabel",
  "Gerado em:": "geradoEmLabel",
  "Data de Emissão:": "dataEmissaoLabel",
  "Aluno:": "alunoLabel",
};

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

interface AvaliacoesViewProps {
  students: Student[];
  imcRecords: ImcRecord[];
  motorRecords: MotorRecord[];
  sportRecords: SportRecord[];
  vocationalRecords: VocationalRecord[];
  healthRecords: HealthRecord[];
  oralRecords: OralRecord[];
  autoconceptRecords: AutoconceptRecord[];
  iasRecords: IasRecord[];
  snapRecords: SnapRecord[];
  aq10Records: Aq10Record[];
  pcdRecords: PcdRecord[];
  updateImcState: (newList: ImcRecord[]) => void;
  updateMotorState: (newList: MotorRecord[]) => void;
  updateSportState: (newList: SportRecord[]) => void;
  updateVocationalState: (newList: VocationalRecord[]) => void;
  updateHealthState: (newList: HealthRecord[]) => void;
  updateOralState: (newList: OralRecord[]) => void;
  updateAutoconceptState: (newList: AutoconceptRecord[]) => void;
  updateIasState: (newList: IasRecord[]) => void;
  updateSnapState: (newList: SnapRecord[]) => void;
  updateAq10State: (newList: Aq10Record[]) => void;
  updatePcdState: (newList: PcdRecord[]) => void;
  runWithPermission: (permission: Permission, onApproved: () => void) => void;
  contratos?: ContratoItem[];
  user?: UserData;
}

// Configuracao de IMC vinda do Modulo 4 (m4_imc_config); alimenta a classificacao
type ImcConfigRow = {
  classification: string;
  status: string;
  alertColor: string;
  description: string;
  imcMin: number | null;
  imcMax: number | null;
};
let m4ImcConfigCache: ImcConfigRow[] = [];

// Configuracao de perfis/pareceres vinda do Modulo 7 (m7_perfis_pareceres)
type M7ConfigRow = { profile: string; component: string; basicData: string; reflection: string; interestArea: string; careers: string };
let m7ConfigCache: M7ConfigRow[] = [];

// Configuracao de pareceres de Saude Global vinda do Modulo 9 (m9_perfis_pareceres)
type M9ParecerRow = { classification: string; basicData: string; reflection: string };
let m9ParecerCache: M9ParecerRow[] = [];

// Configuracao da Avaliacao PCD vinda do Modulo 15 (m15_pcd_*)
let m15GruposCache: PcdGroupConfig[] = [];
let m15AdaptacoesCache: PcdAdaptacaoConfig[] = [];
let m15FaixasCache: PcdFaixaConfig[] = [];
let m15ModalidadesCache: PcdModalidadeConfig[] = [];
let m15FunilCache: PcdFunilConfig[] = [];

// Configuracao de pareceres de Higiene Bucal vinda do Modulo 10 (m10_perfis_pareceres)
let m10ParecerCache: M9ParecerRow[] = [];

// Configuracao de pareceres de Autoconceito vinda do Modulo 11 (m11_perfis_pareceres)
let m11ParecerCache: M9ParecerRow[] = [];

// Configuracao de pareceres de Indice Alimentar vinda do Modulo 12 (m12_perfis_pareceres)
let m12ParecerCache: M9ParecerRow[] = [];

// Configuracao de pareceres de Rastreamento TDAH vinda do Modulo 13 (m13_perfis_pareceres)
let m13ParecerCache: M9ParecerRow[] = [];

// Configuracao de pareceres de Rastreamento Precoce do TEA vinda do Modulo 14 (m14_perfis_pareceres)
let m14ParecerCache: M9ParecerRow[] = [];
const normProfile = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();

const IMC_ALERT_CLASSES: Record<string, string> = {
  emerald: 'text-emerald-400',
  yellow: 'text-yellow-400',
  orange: 'text-orange-400',
  rose: 'text-rose-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
};

// Helper to calculate IMC category and colors (usa as faixas do M4 quando disponiveis)
const getImcClass = (weight: number, height: number) => {
  if (!weight || !height || height <= 0) return { label: 'Aguardando Dados', color: 'text-gray-400' };
  const imc = parseFloat((weight / (height * height)).toFixed(1));
  const cfg = m4ImcConfigCache.find(r =>
    (r.imcMin == null || imc >= r.imcMin) && (r.imcMax == null || imc <= r.imcMax)
  );
  if (cfg) {
    return { label: cfg.classification, value: imc, color: IMC_ALERT_CLASSES[cfg.alertColor] || IMC_ALERT_CLASSES.emerald };
  }
  if (imc < 18.5) return { label: 'Abaixo do peso', value: imc, color: 'text-amber-400' };
  if (imc >= 18.5 && imc <= 24.9) return { label: 'Peso normal', value: imc, color: 'text-emerald-400' };
  if (imc >= 25 && imc <= 29.9) return { label: 'Sobrepeso', value: imc, color: 'text-orange-400' };
  return { label: 'Obesidade', value: imc, color: 'text-red-400' };
};

// Map grade helper
const getStudentGrade = (students: Student[], sId: string) => {
  const std = students.find(s => s.id === sId);
  return std ? std.grade : "3º Ano Médio - A";
};

const calculateStudentAge = (birthDateStr?: string): number => {
  if (!birthDateStr) return 15; // default fallback if no birthDate in system
  let birthDate: Date;
  if (birthDateStr.includes('/')) {
    const parts = birthDateStr.split('/');
    if (parts.length === 3) {
      birthDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    } else {
      return 15;
    }
  } else {
    const parts = birthDateStr.split('-');
    if (parts.length === 3) {
      birthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      return 15;
    }
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Idade em anos completos do estudante (null quando a data de nascimento esta
// ausente ou invalida - ao contrario de calculateStudentAge, que cai para 15).
const getStudentAgeYears = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  let birthDateParsed: Date | null = null;
  const DMY = birthDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const YMD = birthDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (DMY) birthDateParsed = new Date(Number(DMY[3]), Number(DMY[2]) - 1, Number(DMY[1]));
  else if (YMD) birthDateParsed = new Date(Number(YMD[1]), Number(YMD[2]) - 1, Number(YMD[3]));
  if (!birthDateParsed || isNaN(birthDateParsed.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDateParsed.getFullYear();
  const m = today.getMonth() - birthDateParsed.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDateParsed.getDate())) age--;
  return age;
};

// Faixas etarias oficiais dos testes escritos: idade em anos completos
// (ex.: KIDSCREEN 8-18 => precisou completar 8 e ainda nao completou 19).
type AgeRuledSubTab = 'vocational' | 'health' | 'aq10' | 'oral' | 'snap';
const ASSESSMENT_AGE_RULES: Record<AgeRuledSubTab, { min: number; max: number; label: string }> = {
  vocational: { min: 14, max: 18, label: "14-18 anos" },
  health: { min: 8, max: 18, label: "8-18 anos" },
  aq10: { min: 4, max: 15, label: "4-15 anos" },
  oral: { min: 11, max: 120, label: "11+ anos" },
  snap: { min: 5, max: 17, label: "5-17 anos" },
};

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

// Converte datas ISO (YYYY-MM-DD[Thh:mm:ss]) para o padrao brasileiro dd/mm/aaaa
const formatDateBR = (dateStr?: string): string => {
  if (!dateStr) return '';
  const datePart = dateStr.split('T')[0];
  const p = datePart.split('-');
  if (p.length === 3 && /^\d{4}$/.test(p[0]) && /^\d{1,2}$/.test(p[1]) && /^\d{1,2}$/.test(p[2])) {
    return `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[0]}`;
  }
  return dateStr;
};

// Niveis de capacidade motora, do pior ao melhor
const MOTOR_LEVELS = ['Insuficiente', 'Regular', 'Bom', 'Excelente'] as const;
const GERAL_LABELS = ['Precisa de Treino', 'Regular', 'Bom', 'Excelente'] as const;

// Regra da "Geral": precisa de >=4 no nivel mais alto para mante-lo; senao cai 1 degrau.
// O pior nivel mapeia para "Precisa de Treino".
const computeGeneralClass = (levels: string[]): 'Excelente' | 'Bom' | 'Regular' | 'Precisa de Treino' => {
  let best = -1;
  levels.forEach((l) => {
    const idx = (MOTOR_LEVELS as readonly string[]).indexOf(l);
    if (idx > best) best = idx;
  });
  if (best < 0) best = 0;
  const cntBest = levels.filter((l) => l === MOTOR_LEVELS[best]).length;
  let finalIdx = cntBest >= 4 ? best : best - 1;
  if (finalIdx < 0) finalIdx = 0;
  return GERAL_LABELS[finalIdx];
};

interface MotorRef {
  id: string;
  category: string;
  idade: string;
  sexo: string;
  insuficiente: string;
  regular: string;
  bom: string;
  excelente: string;
}

interface JsPdfWithAutoTable {
  lastAutoTable: { finalY: number };
}

const findMatchingRefMotor = (dbRefs: MotorRef[], category: string, sexo?: string, age?: number) => {
  let refs: MotorRef[] = [];
  if (dbRefs && dbRefs.length > 0) {
    refs = dbRefs;
  } else if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('educore_aptidao_referenciais');
    if (stored) {
      try {
        refs = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
  }
  
  if (!refs || refs.length === 0) {
    refs = [
      // Força Muscular
      { id: 'f-1', category: 'forca', idade: '0 a 8', sexo: 'Masculino', insuficiente: '0 a 1', regular: '2', bom: '3', excelente: '4 ou mais' },
      { id: 'f-2', category: 'forca', idade: '0 a 8', sexo: 'Feminino', insuficiente: '0 a 1', regular: '2', bom: '3', excelente: '4 ou mais' },
      { id: 'f-3', category: 'forca', idade: '9 a 12', sexo: 'Masculino', insuficiente: '0 a 2', regular: '3 a 4', bom: '5 a 6', excelente: '7 ou mais' },
      { id: 'f-4', category: 'forca', idade: '9 a 12', sexo: 'Feminino', insuficiente: '0 a 1', regular: '2 a 3', bom: '4 a 5', excelente: '6 ou mais' },
      { id: 'f-5', category: 'forca', idade: '13 a 14', sexo: 'Masculino', insuficiente: '0 a 3', regular: '4 a 5', bom: '6 a 7', excelente: '8 ou mais' },
      { id: 'f-6', category: 'forca', idade: '13 a 14', sexo: 'Feminino', insuficiente: '0 a 2', regular: '3 a 4', bom: '5 a 6', excelente: '7 ou mais' },
      { id: 'f-7', category: 'forca', idade: '15 a 17', sexo: 'Masculino', insuficiente: '0 a 4', regular: '5 a 6', bom: '7 a 8', excelente: '9 ou mais' },
      { id: 'f-8', category: 'forca', idade: '15 a 17', sexo: 'Feminino', insuficiente: '0 a 4', regular: '5 a 6', bom: '7 a 8', excelente: '9 ou mais' },
      { id: 'f-9', category: 'forca', idade: '18 ou mais', sexo: 'Masculino', insuficiente: '0 a 6', regular: '7 a 9', bom: '10 a 11', excelente: '12 ou mais' },
      { id: 'f-10', category: 'forca', idade: '18 ou mais', sexo: 'Feminino', insuficiente: '0 a 6', regular: '7 a 9', bom: '10 a 11', excelente: '12 ou mais' },

      // Impulsão
      { id: 'i-1', category: 'impulsao', idade: '0 a 8', sexo: 'Masculino', insuficiente: '0 a 30', regular: '31 a 40', bom: '41 a 80', excelente: '81 ou mais' },
      { id: 'i-2', category: 'impulsao', idade: '0 a 8', sexo: 'Feminino', insuficiente: '0 a 30', regular: '31 a 40', bom: '41 a 80', excelente: '81 ou mais' },
      { id: 'i-3', category: 'impulsao', idade: '9 a 12', sexo: 'Masculino', insuficiente: '0 a 60', regular: '61 a 90', bom: '91 a 140', excelente: '141 ou mais' },
      { id: 'i-4', category: 'impulsao', idade: '9 a 12', sexo: 'Feminino', insuficiente: '0 a 60', regular: '61 a 90', bom: '91 a 140', excelente: '141 ou mais' },
      { id: 'i-5', category: 'impulsao', idade: '13 a 14', sexo: 'Masculino', insuficiente: '0 a 80', regular: '81 a 100', bom: '101 a 150', excelente: '151 ou mais' },
      { id: 'i-6', category: 'impulsao', idade: '13 a 14', sexo: 'Feminino', insuficiente: '0 a 80', regular: '81 a 100', bom: '101 a 150', excelente: '151 ou mais' },
      { id: 'i-7', category: 'impulsao', idade: '15 a 17', sexo: 'Masculino', insuficiente: '81 a 100', regular: '101 a 120', bom: '121 a 180', excelente: '181 ou mais' },
      { id: 'i-8', category: 'impulsao', idade: '15 a 17', sexo: 'Feminino', insuficiente: '81 a 100', regular: '101 a 120', bom: '121 a 180', excelente: '181 ou mais' },
      { id: 'i-9', category: 'impulsao', idade: '18 ou mais', sexo: 'Masculino', insuficiente: '101 a 120', regular: '121 a 180', bom: '181 a 200', excelente: '201 ou mais' },
      { id: 'i-10', category: 'impulsao', idade: '18 ou mais', sexo: 'Feminino', insuficiente: '101 a 120', regular: '121 a 180', bom: '181 a 200', excelente: '201 ou mais' },

      // Abdômen
      { id: 'a-1', category: 'abdomen', idade: 'Todas as idades', sexo: 'Todos os sexos', insuficiente: 'Não se aplica', regular: '0 a 29', bom: 'Não se aplica', excelente: '30 ou mais' },

      // Agilidade
      { id: 'ag-1', category: 'agilidade', idade: '0 a 8', sexo: 'Masculino', insuficiente: '17 ou mais', regular: '15 a 16', bom: '12 a 14', excelente: '11 ou menos' },
      { id: 'ag-2', category: 'agilidade', idade: '0 a 8', sexo: 'Feminino', insuficiente: '17 ou mais', regular: '15 a 16', bom: '12 a 14', excelente: '11 ou menos' },
      { id: 'ag-3', category: 'agilidade', idade: '9 a 12', sexo: 'Masculino', insuficiente: '16 ou mais', regular: '14 a 15', bom: '11 a 13', excelente: '10 ou menos' },
      { id: 'ag-4', category: 'agilidade', idade: '9 a 12', sexo: 'Feminino', insuficiente: '16 ou mais', regular: '14 a 15', bom: '11 a 13', excelente: '10 ou menos' },
      { id: 'ag-5', category: 'agilidade', idade: '13 a 14', sexo: 'Masculino', insuficiente: '15 ou mais', regular: '13 a 14', bom: '12 a 10', excelente: '9 ou menos' },
      { id: 'ag-6', category: 'agilidade', idade: '13 a 14', sexo: 'Feminino', insuficiente: '15 ou mais', regular: '13 a 14', bom: '12 a 10', excelente: '9 ou menos' },
      { id: 'ag-7', category: 'agilidade', idade: '15 a 17', sexo: 'Masculino', insuficiente: '14 ou mais', regular: '11 a 13', bom: '9 a 10', excelente: '8 ou menos' },
      { id: 'ag-8', category: 'agilidade', idade: '15 a 17', sexo: 'Feminino', insuficiente: '14 ou mais', regular: '11 a 13', bom: '9 a 10', excelente: '8 ou menos' },
      { id: 'ag-9', category: 'agilidade', idade: '18 ou mais', sexo: 'Masculino', insuficiente: '14 ou mais', regular: '11 a 13', bom: '9 a 10', excelente: '8 ou menos' },

      // Velocidade
      { id: 'v-1', category: 'velocidade', idade: '0 a 8', sexo: 'Masculino', insuficiente: '7,00 ou mais', regular: '6,12 a 6,99', bom: '4,11 a 6,11', excelente: '4,10 ou menos' },
      { id: 'v-2', category: 'velocidade', idade: '0 a 8', sexo: 'Feminino', insuficiente: '7,00 ou mais', regular: '6,12 a 6,99', bom: '4,11 a 6,11', excelente: '4,10 ou menos' },
      { id: 'v-3', category: 'velocidade', idade: '9 a 12', sexo: 'Masculino', insuficiente: '7,00 ou mais', regular: '5,61 a 6,99', bom: '3,61 a 5,60', excelente: '3,60 ou menos' },
      { id: 'v-4', category: 'velocidade', idade: '9 a 12', sexo: 'Feminino', insuficiente: '7,00 ou mais', regular: '5,81 a 6,99', bom: '3,81 a 5,80', excelente: '3,80 ou menos' },
      { id: 'v-5', category: 'velocidade', idade: '13 a 14', sexo: 'Masculino', insuficiente: '7,00 ou mais', regular: '5,47 a 6,99', bom: '3,46 a 5,46', excelente: '3,45 ou menos' },
      { id: 'v-6', category: 'velocidade', idade: '13 a 14', sexo: 'Feminino', insuficiente: '7,00 ou mais', regular: '5,69 a 6,99', bom: '3,68 a 5,68', excelente: '3,68 ou menos' },
      { id: 'v-7', category: 'velocidade', idade: '15 a 17', sexo: 'Masculino', insuficiente: '7,00 ou mais', regular: '5,81 a 6,99', bom: '3,81 a 5,80', excelente: '3,80 ou menos' },
      { id: 'v-8', category: 'velocidade', idade: '15 a 17', sexo: 'Feminino', insuficiente: '7,00 ou mais', regular: '5,17 a 6,99', bom: '3,16 a 5,16', excelente: '3,15 ou menos' },
      { id: 'v-9', category: 'velocidade', idade: '18 ou mais', sexo: 'Masculino', insuficiente: '7,00 ou mais', regular: '5,81 a 6,99', bom: '3,81 a 5,80', excelente: '3,80 ou menos' }
    ];
  }

  const catRefs = refs.filter((r: MotorRef) => r.category === category);
  if (catRefs.length === 0) return null;

  const studentSex = sexo || 'Feminino';
  const studentAge = age !== undefined ? age : 15;

  // Pontua cada referencial: maior = mais especifico. Sexos/idades universais
  // pontuam menos, entao uma faixa especifica (ex.: 19 a 30 / Masculino) vence
  // a linha "Todas as idades / Todos os sexos".
  const scoreRef = (r: MotorRef): number => {
    let sexScore = 0;
    if (r.sexo && r.sexo.toLowerCase() === studentSex.toLowerCase()) sexScore = 2;
    else if (r.sexo === 'Todos os sexos') sexScore = 1;

    let ageScore = 0;
    if (r.idade === 'Todas as idades') {
      ageScore = 1;
    } else if (r.idade === '18 ou mais') {
      if (studentAge >= 18) ageScore = 2;
    } else {
      const parts = (r.idade || '').split(' a ');
      if (parts.length === 2) {
        const minAge = parseInt(parts[0], 10);
        const maxAge = parseInt(parts[1], 10);
        if (!isNaN(minAge) && !isNaN(maxAge) && studentAge >= minAge && studentAge <= maxAge) ageScore = 2;
      }
    }

    if (sexScore === 0 || ageScore === 0) return -1; // nao elegivel
    return sexScore * 2 + ageScore;
  };

  let best: MotorRef | null = null;
  let bestScore = -1;
  for (const r of catRefs) {
    const s = scoreRef(r);
    if (s > bestScore) { bestScore = s; best = r; }
  }

  return best || catRefs[0];
};

interface M2Modality {
  id: string;
  name: string;
  requirements: {
    imc: string[];
    v20m: string[];
    impulsao: string[];
    flexao: string[];
    agilidade: string[];
    abdominal: string[];
  };
}

const DEFAULT_M2_MODALIDADES: M2Modality[] = [
  {
    id: 'm2-1',
    name: 'Atletismo',
    requirements: {
      imc: ['Regular', 'Bom', 'Excelente'],
      v20m: ['Bom', 'Excelente'],
      impulsao: ['Bom', 'Excelente'],
      flexao: ['Regular', 'Bom', 'Excelente'],
      agilidade: ['Bom', 'Excelente'],
      abdominal: ['Regular', 'Bom', 'Excelente']
    }
  },
  {
    id: 'm2-2',
    name: "Natação",
    requirements: {
      imc: ['Regular', 'Bom', 'Excelente'],
      v20m: ['Regular', 'Bom', 'Excelente'],
      impulsao: ['Regular', 'Bom', 'Excelente'],
      flexao: ['Bom', 'Excelente'],
      agilidade: ['Regular', 'Bom', 'Excelente'],
      abdominal: ['Bom', 'Excelente']
    }
  },
  {
    id: 'm2-3',
    name: 'Basquete',
    requirements: {
      imc: ['Regular', 'Bom', 'Excelente'],
      v20m: ['Bom', 'Excelente'],
      impulsao: ['Excelente'],
      flexao: ['Bom', 'Excelente'],
      agilidade: ['Bom', 'Excelente'],
      abdominal: ['Bom', 'Excelente']
    }
  },
  {
    id: 'm2-4',
    name: 'Handebol',
    requirements: {
      imc: ['Regular', 'Bom', 'Excelente'],
      v20m: ['Bom', 'Excelente'],
      impulsao: ['Bom', 'Excelente'],
      flexao: ['Excelente'],
      agilidade: ['Bom', 'Excelente'],
      abdominal: ['Bom', 'Excelente']
    }
  },
  {
    id: 'm2-5',
    name: 'Futebol',
    requirements: {
      imc: ['Regular', 'Bom', 'Excelente'],
      v20m: ['Excelente'],
      impulsao: ['Bom', 'Excelente'],
      flexao: ['Regular', 'Bom', 'Excelente'],
      agilidade: ['Excelente'],
      abdominal: ['Bom', 'Excelente']
    }
  },
  {
    id: 'm2-6',
    name: "Vôlei",
    requirements: {
      imc: ['Regular', 'Bom', 'Excelente'],
      v20m: ['Regular', 'Bom', 'Excelente'],
      impulsao: ['Excelente'],
      flexao: ['Bom', 'Excelente'],
      agilidade: ['Bom', 'Excelente'],
      abdominal: ['Bom', 'Excelente']
    }
  },
  {
    id: 'm2-7',
    name: "Ginástica",
    requirements: {
      imc: ['Bom', 'Excelente'],
      v20m: ['Regular', 'Bom', 'Excelente'],
      impulsao: ['Excelente'],
      flexao: ['Excelente'],
      agilidade: ['Excelente'],
      abdominal: ['Excelente']
    }
  },
  {
    id: 'm2-8',
    name: 'Lutas',
    requirements: {
      imc: ['Regular', 'Bom', 'Excelente'],
      v20m: ['Regular', 'Bom', 'Excelente'],
      impulsao: ['Regular', 'Bom', 'Excelente'],
      flexao: ['Excelente'],
      agilidade: ['Bom', 'Excelente'],
      abdominal: ['Excelente']
    }
  }
];

type VocQuestion = {
  id: string;
  ord: number;
  statement: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

const DEFAULT_VOC_QUESTIONS: VocQuestion[] = [
  { id: 'q1', ord: 1, statement: "Em um trabalho de grupo na escola, você prefere:", optionA: 'Escrever o texto e pesquisar os temas.', optionB: "Fazer os cálculos ou criar gráficos para os dados.", optionC: "Desenhar, pintar ou cuidar da apresentação visual.", optionD: 'Organizar o grupo, os prazos e quem vai falar.' },
  { id: 'q2', ord: 2, statement: "No seu tempo livre, o que você mais gosta de fazer?", optionA: 'Ler livros, ver filmes ou discutir ideias com amigos.', optionB: "Montar ou consertar coisas, ou jogar jogos de lógica.", optionC: 'Praticar esportes, cuidar de plantas ou animais.', optionD: 'Planejar eventos, liderar times ou negociar acordos.' },
  { id: 'q3', ord: 3, statement: "Qual destas matérias escolares você acha mais interessante?", optionA: "História, Literatura ou Filosofia.", optionB: "Matemática, Física ou Química.", optionC: "Biologia, Educação Física ou Artes.", optionD: "Geografia, Redação ou Sociologia." },
  { id: 'q4', ord: 4, statement: "Como você costuma resolver um problema difícil?", optionA: 'Conversando e tentando entender o lado das pessoas.', optionB: "Usando números, dados e fatos exatos.", optionC: "Criando uma solução prática e inovadora.", optionD: "Montando um plano de ação passo a passo." },
  { id: 'q5', ord: 5, statement: "Você se considera uma pessoa que:", optionA: 'Gosta de ajudar os outros e se expressar bem.', optionB: "É curiosa sobre como as coisas funcionam e operam.", optionC: 'Tem muita energia e gosta de criar coisas novas.', optionD: "É organizada, prática e gosta de dar ordens." },
  { id: 'q6', ord: 6, statement: 'Se pudesse viajar para um desses lugares, qual escolheria?', optionA: "Uma cidade histórica cheia de museus e cultura.", optionB: "Um centro de alta tecnologia ou uma feira de ciências.", optionC: "Uma reserva ecológica ou um centro de artes.", optionD: "Uma grande metrópole de negócios e comércio." },
  { id: 'q7', ord: 7, statement: "O que mais chama sua atenção em um projeto?", optionA: "O impacto que ele terá na vida das pessoas.", optionB: "Como ele foi construído e sua estrutura lógica.", optionC: "A estética e a criatividade do resultado final.", optionD: 'Os resultados financeiros e o sucesso do projeto.' },
  { id: 'q8', ord: 8, statement: "Você prefere um ambiente de trabalho onde:", optionA: 'Possa debater ideias e escrever.', optionB: 'Haja rotinas claras, pesquisa e muita tecnologia.', optionC: 'Possa expressar sua criatividade e agir livremente.', optionD: "Exista liderança, metas claras e decisões rápidas." },
  { id: 'q9', ord: 9, statement: "Quando o assunto é ajudar os outros, você prefere:", optionA: "Ouvir, aconselhar e cuidar da saúde ou direitos.", optionB: 'Ensinar exatas ou criar novas tecnologias para a vida.', optionC: 'Usar a arte ou o esporte para alegrar o dia.', optionD: "Administrar recursos e organizar doações." },
  { id: 'q10', ord: 10, statement: "Entre estas opções de leitura, qual você prefere?", optionA: 'Biografias, romances ou artigos de comportamento.', optionB: "Revistas científicas ou livros de tecnologia e inovação.", optionC: "Revistas de decoração, design ou histórias em quadrinhos.", optionD: "Livros sobre economia, finanças ou administração." },
  { id: 'q11', ord: 11, statement: "Como você descreveria suas habilidades?", optionA: 'Facilidade para falar, escrever e argumentar.', optionB: "Boa memória para dados e facilidade com números.", optionC: "Muita imaginação, criatividade e intuição.", optionD: 'Talento para convencer, liderar e planejar.' },
  { id: 'q12', ord: 12, statement: "O que é mais importante em uma futura profissão para você?", optionA: "Fazer a diferença na sociedade e no mundo.", optionB: 'Descobrir como as coisas funcionam e resolver desafios.', optionC: 'Ter liberdade para criar e inovar sempre.', optionD: "Alcançar sucesso financeiro e cargo de chefia." },
];

type HealthQuestion = {
  id: string;
  ord: number;
  statement: string;
  reversed: boolean;
};

const DEFAULT_HEALTH_QUESTIONS: HealthQuestion[] = [
  { id: 'hq1', ord: 1, statement: "Você tem se sentido bem e com energia?", reversed: false },
  { id: 'hq2', ord: 2, statement: "Você tem se sentido triste?", reversed: true },
  { id: 'hq3', ord: 3, statement: "Você tem se sentido sozinho(a)?", reversed: true },
  { id: 'hq4', ord: 4, statement: "Você tem tido tempo suficiente para si mesmo(a)?", reversed: false },
  { id: 'hq5', ord: 5, statement: "Você tem podido fazer as coisas que quer no seu tempo livre?", reversed: false },
  { id: 'hq6', ord: 6, statement: "Os seus pais têm tratado você com justiça?", reversed: false },
  { id: 'hq7', ord: 7, statement: "Você tem se divertido com os seus amigos?", reversed: false },
  { id: 'hq8', ord: 8, statement: "Você tem se saído bem na escola/estudos?", reversed: false },
  { id: 'hq9', ord: 9, statement: "Você tem sido capaz de prestar atenção/se concentrar?", reversed: false },
  { id: 'hq10', ord: 10, statement: "Você tem se sentido deprimido(a) ou sem esperança?", reversed: true },
];

type OralQuestion = {
  id: string;
  ord: number;
  statement: string;
};

const DEFAULT_ORAL_QUESTIONS: OralQuestion[] = [
  { id: 'oq1', ord: 1, statement: "Não me preocupo muito em ir ao dentista." },
  { id: 'oq2', ord: 2, statement: 'Minha gengiva sangra quando escovo os dentes.' },
  { id: 'oq3', ord: 3, statement: 'Eu me preocupo muito com a cor dos meus dentes.' },
  { id: 'oq4', ord: 4, statement: 'Eu percebo uma gosma/sujeira (placa) nos meus dentes.' },
  { id: 'oq5', ord: 5, statement: 'Eu uso uma escova de dentes com cerdas duras.' },
  { id: 'oq6', ord: 6, statement: "Eu acho que é impossível evitar problemas na gengiva apenas escovando os dentes." },
  { id: 'oq7', ord: 7, statement: "Eu costumo escovar meus dentes logo após cada refeição." },
  { id: 'oq8', ord: 8, statement: "Eu sinto que já limpo bem os meus dentes sem precisar usar o fio dental." },
  { id: 'oq9', ord: 9, statement: "Eu uso uma técnica de escovação recomendada pelo meu dentista." },
  { id: 'oq10', ord: 10, statement: "Eu sinto que meus dentes estão piorando, mesmo escovando todos os dias." },
  { id: 'oq11', ord: 11, statement: "Já me disseram que tenho bom hálito." },
  { id: 'oq12', ord: 12, statement: "Eu examino meus dentes detalhadamente no espelho após a escovação." },
  { id: 'oq13', ord: 13, statement: 'Eu me preocupo com o alinhamento ou formato dos meus dentes.' },
  { id: 'oq14', ord: 14, statement: 'Eu tenho medo de sentir dor no dentista.' },
  { id: 'oq15', ord: 15, statement: 'Eu sinto que meus dentes nunca ficam totalmente limpos.' },
  { id: 'oq16', ord: 16, statement: "Eu escovo a minha língua com frequência." },
  { id: 'oq17', ord: 17, statement: 'Eu uso enxaguante bucal quase todos os dias.' },
  { id: 'oq18', ord: 18, statement: "Eu sinto que escovo meus dentes com muita força." },
  { id: 'oq19', ord: 19, statement: 'Eu uso o fio dental pelo menos uma vez por dia.' },
  { id: 'oq20', ord: 20, statement: "Eu só vou ao dentista quando estou sentindo alguma dor." },
];

type AutoconceptQuestion = {
  id: string;
  ord: number;
  statement: string;
  itemType: AutoconceptItemType;
};

// Ordem classica de Rosenberg: positivos 1,2,4,6,7; negativos 3,5,8,9,10.
const DEFAULT_AUTOCONCEPT_QUESTIONS: AutoconceptQuestion[] = [
  { id: 'aq1', ord: 1, statement: 'Sinto que sou uma pessoa de valor, pelo menos tanto quanto as outras.', itemType: 'positive' },
  { id: 'aq2', ord: 2, statement: "Tenho uma atitude positiva em relação a mim mesmo(a).", itemType: 'positive' },
  { id: 'aq3', ord: 3, statement: 'No geral, estou inclinado(a) a pensar que sou um(a) fracassado(a).', itemType: 'negative' },
  { id: 'aq4', ord: 4, statement: "Sou capaz de fazer as coisas tão bem quanto a maioria das outras pessoas.", itemType: 'positive' },
  { id: 'aq5', ord: 5, statement: "Sinto que não tenho muito do que me orgulhar.", itemType: 'negative' },
  { id: 'aq6', ord: 6, statement: 'Sinto que tenho qualidades positivas.', itemType: 'positive' },
  { id: 'aq7', ord: 7, statement: 'No geral, estou satisfeito(a) comigo mesmo(a).', itemType: 'positive' },
  { id: 'aq8', ord: 8, statement: "Às vezes, penso que não sirvo para nada.", itemType: 'negative' },
  { id: 'aq9', ord: 9, statement: "Às vezes, me sinto inútil.", itemType: 'negative' },
  { id: 'aq10', ord: 10, statement: 'Gostaria de ter mais respeito por mim mesmo(a).', itemType: 'negative' },
];

const DEFAULT_IAS_QUESTIONS: IasQuestion[] = [
  { id: 'iq1', ord: 1, statement: 'Frutas Totais (incluindo sucos naturais)', option1Text: 'Raramente ou nunca consumo frutas.', option1Points: 0, option2Text: "Consumo 1 porção por dia (ex: 1 fatia de melancia ou 1 maçã).", option2Points: 3, option3Text: "Consumo 2 ou mais porções de frutas todos os dias.", option3Points: 5 },
  { id: 'iq2', ord: 2, statement: "Frutas Integrais (apenas fruta inteira/pedaços, sem sucos)", option1Text: "Só tomo suco ou não como frutas.", option1Points: 0, option2Text: 'Consumo pelo menos 1 fruta inteira na maioria dos dias.', option2Points: 3, option3Text: 'Consumo 2 ou mais frutas inteiras todos os dias (garante fibras).', option3Points: 5 },
  { id: 'iq3', ord: 3, statement: 'Vegetais Totais (verduras e legumes crus ou cozidos)', option1Text: 'Raramente ou nunca como vegetais.', option1Points: 0, option2Text: "Consumo vegetais apenas em 1 refeição (só almoço ou só jantar).", option2Points: 3, option3Text: "Consumo vegetais no almoço e no jantar todos os dias.", option3Points: 5 },
  { id: 'iq4', ord: 4, statement: "Vegetais Escuros e Leguminosas (brócolis, couve, espinafre, feijão, lentilha...)", option1Text: 'Raramente ou nunca consumo esses alimentos.', option1Points: 0, option2Text: "Como feijão ou vegetais escuros de 3 a 4 vezes por semana.", option2Points: 3, option3Text: "Como feijão e/ou vegetais verde-escuros praticamente todos os dias.", option3Points: 5 },
  { id: 'iq5', ord: 5, statement: "Cereais Integrais (arroz integral, aveia, pão integral, linhaça, chia)", option1Text: "Só consumo cereais refinados (arroz branco, pão francês, macarrão normal).", option1Points: 0, option2Text: "Consumo pelo menos 1 porção de cereal integral ou sementes por dia.", option2Points: 5, option3Text: "A maior parte dos meus cereais diários são integrais (2 ou mais porções/dia).", option3Points: 10 },
  { id: 'iq6', ord: 6, statement: "Laticínios (leite, queijo, iogurte - preferencialmente menos gordura)", option1Text: "Não consumo laticínios (ou equivalentes vegetais fortificados com cálcio).", option1Points: 0, option2Text: "Consumo de 1 a 2 porções por dia.", option2Points: 5, option3Text: "Consumo 3 porções por dia (recomendação padrão de cálcio).", option3Points: 10 },
  { id: 'iq7', ord: 7, statement: "Carnes, Ovos e Leguminosas (fontes de proteína em geral)", option1Text: "Baixíssimo consumo de proteínas ao longo do dia.", option1Points: 0, option2Text: "Consumo proteínas em apenas uma das grandes refeições.", option2Points: 5, option3Text: "Consumo fontes saudáveis distribuídas no almoço, jantar e lanches.", option3Points: 10 },
  { id: 'iq8', ord: 8, statement: 'Peixes e Fontes de Gorduras Boas (sardinha/atum, azeite, castanhas, abacate)', option1Text: "Não consumo esses alimentos ou uso apenas óleos vegetais comuns.", option1Points: 0, option2Text: 'Uso azeite de oliva regularmente, ou como castanhas/abacate algumas vezes na semana.', option2Points: 5, option3Text: 'Como peixe pelo menos 2 vezes por semana E uso gorduras boas diariamente.', option3Points: 10 },
  { id: 'iq9', ord: 9, statement: "Sódio (Sal de cozinha e alimentos salgados)", option1Text: 'Uso muito sal, uso temperos prontos (cubos) e como muitos embutidos/salgadinhos.', option1Points: 0, option2Text: 'Uso sal moderadamente, mas ainda consumo alguns industrializados salgados.', option2Points: 5, option3Text: 'Comida baixa em sal, priorizo temperos naturais e evito ultraprocessados.', option3Points: 10 },
  { id: 'iq10', ord: 10, statement: "Gordura Saturada (carnes gordas, pele de frango, manteiga, óleo de coco, queijos amarelos)", option1Text: 'Consumo carnes muito gordas, frituras e queijos gordos quase diariamente.', option1Points: 0, option2Text: 'Consumo moderado; alterno carnes magras/gordas, controlo o uso de manteiga.', option2Points: 5, option3Text: "Alimentação muito baixa em gordura saturada (priorizo carnes magras e grelhados).", option3Points: 10 },
  { id: 'iq11', ord: 11, statement: "Calorias de Fontes Vazias (açúcar de adição, doces, refrigerantes, álcool e gorduras sólidas)", option1Text: "Consumo doces, refrigerantes ou bebidas açucaradas/alcoólicas todos os dias.", option1Points: 0, option2Text: 'Consumo esses itens de forma moderada (2 a 3 vezes por semana).', option2Points: 10, option3Text: "Raramente consumo (menos de 1 vez por semana) açúcar refinado, refrigerantes ou álcool.", option3Points: 20 },
];

type SnapQuestion = {
  id: string;
  ord: number;
  statement: string;
  subscale: SnapSubscale;
};

// SNAP-IV: Bloco I (1-9) Desatencao; Bloco II (10-18) Hiperatividade/Impulsividade.
const DEFAULT_SNAP_QUESTIONS: SnapQuestion[] = [
  { id: 'sq1', ord: 1, statement: "Não consegue prestar muita atenção a detalhes ou comete erros por descuido nos trabalhos da escola ou tarefas.", subscale: 'inattention' },
  { id: 'sq2', ord: 2, statement: "Tem dificuldade de manter a atenção em tarefas ou atividades de lazer.", subscale: 'inattention' },
  { id: 'sq3', ord: 3, statement: "Parece não estar ouvindo quando se fala diretamente com ele.", subscale: 'inattention' },
  { id: 'sq4', ord: 4, statement: "Não segue instruções até o fim e não termina deveres de escola, tarefas ou obrigações.", subscale: 'inattention' },
  { id: 'sq5', ord: 5, statement: 'Tem dificuldade para organizar tarefas e atividades.', subscale: 'inattention' },
  { id: 'sq6', ord: 6, statement: "Evita, não gosta ou se envolve contra a vontade em tarefas que exigem esforço mental prolongado.", subscale: 'inattention' },
  { id: 'sq7', ord: 7, statement: "Perde coisas necessárias para atividades (p. ex: brinquedos, deveres da escola, lápis ou livros).", subscale: 'inattention' },
  { id: 'sq8', ord: 8, statement: "Distrai-se com estímulos externos.", subscale: 'inattention' },
  { id: 'sq9', ord: 9, statement: "É esquecido em atividades do dia-a-dia.", subscale: 'inattention' },
  { id: 'sq10', ord: 10, statement: "Mexe com as mãos ou pés ou se remexe na cadeira.", subscale: 'hyperactivity' },
  { id: 'sq11', ord: 11, statement: "Sai do lugar na sala de aula ou em outras situações em que se espera que fique sentado.", subscale: 'hyperactivity' },
  { id: 'sq12', ord: 12, statement: "Corre de um lado para outro ou sobe demais nas coisas em situações em que isto é inapropriado.", subscale: 'hyperactivity' },
  { id: 'sq13', ord: 13, statement: 'Tem dificuldade em brincar ou envolver-se em atividades de lazer de forma calma.', subscale: 'hyperactivity' },
  { id: 'sq14', ord: 14, statement: "Não pára ou freqüentemente está a “mil por hora”.", subscale: 'hyperactivity' },
  { id: 'sq15', ord: 15, statement: 'Fala em excesso.', subscale: 'hyperactivity' },
  { id: 'sq16', ord: 16, statement: 'Responde as perguntas de forma precipitada antes delas terem sido terminadas.', subscale: 'hyperactivity' },
  { id: 'sq17', ord: 17, statement: 'Tem dificuldade de esperar sua vez.', subscale: 'hyperactivity' },
  { id: 'sq18', ord: 18, statement: 'Interrompe os outros ou se intromete (por exemplo: intromete-se nas conversas, jogos, etc.).', subscale: 'hyperactivity' },
];

type Aq10Question = {
  id: string;
  ord: number;
  statement: string;
  version: Aq10Version;
};

// AQ-10: versao Crianca (4-11) = itens 1-10; versao Adolescente (12-15) = itens 11-20.
const DEFAULT_AQ10_QUESTIONS: Aq10Question[] = [
  { id: 'aq10q1', ord: 1, statement: "Ele/a nota muitas vezes pequenos ruídos que passam despercebidos às outras pessoas.", version: 'crianca' },
  { id: 'aq10q2', ord: 2, statement: "Habitualmente, ele/a concentra-se mais na imagem ou situação no seu todo, do que nos seus pequenos detalhes.", version: 'crianca' },
  { id: 'aq10q3', ord: 3, statement: "Quando está num grupo social, ele/a consegue facilmente seguir conversas de várias pessoas.", version: 'crianca' },
  { id: 'aq10q4', ord: 4, statement: 'Ele/a consegue facilmente fazer mais do que uma coisa ao mesmo tempo.', version: 'crianca' },
  { id: 'aq10q5', ord: 5, statement: "Ele/a não sabe como manter uma conversa com os seus pares.", version: 'crianca' },
  { id: 'aq10q6', ord: 6, statement: "Socialmente, ele/a é bom/boa conversador/a.", version: 'crianca' },
  { id: 'aq10q7', ord: 7, statement: "Durante a leitura de uma história, ele/a tem dificuldades em perceber as intenções e as emoções das personagens.", version: 'crianca' },
  { id: 'aq10q8', ord: 8, statement: "No pré-escolar, ele/a gostava de brincar a jogos de faz-de-conta com as outras crianças.", version: 'crianca' },
  { id: 'aq10q9', ord: 9, statement: "Ele/a percebe facilmente o que alguém está a pensar ou a sentir, apenas olhando para a sua cara.", version: 'crianca' },
  { id: 'aq10q10', ord: 10, statement: 'Ele/a tem dificuldades em fazer novos amigos.', version: 'crianca' },
  { id: 'aq10q11', ord: 1, statement: "Ele(a) sempre percebe padrões/categorias nas coisas.", version: 'adolescente' },
  { id: 'aq10q12', ord: 2, statement: "Ele(a) geralmente foca mais na imagem ou situação como um todo, do que nos pequenos detalhes.", version: 'adolescente' },
  { id: 'aq10q13', ord: 3, statement: "Quando está em um grupo social, ele(a) consegue facilmente acompanhar conversas de várias pessoas.", version: 'adolescente' },
  { id: 'aq10q14', ord: 4, statement: "Em caso de interrupção, ele(a) consegue voltar rapidamente ao que estava fazendo.", version: 'adolescente' },
  { id: 'aq10q15', ord: 5, statement: "Frequentemente, ele(a) percebe que não sabe como manter uma conversa.", version: 'adolescente' },
  { id: 'aq10q16', ord: 6, statement: "Socialmente, ele(a) é um(a) bom(boa) conversador(a).", version: 'adolescente' },
  { id: 'aq10q17', ord: 7, statement: "Quando era mais novo(a), ele(a) gostava de brincar de faz-de-conta com outras crianças.", version: 'adolescente' },
  { id: 'aq10q18', ord: 8, statement: 'Ele(a) tem dificuldades em imaginar como seria ser outra pessoa.', version: 'adolescente' },
  { id: 'aq10q19', ord: 9, statement: "Ele(a) acha situações sociais fáceis.", version: 'adolescente' },
  { id: 'aq10q20', ord: 10, statement: 'Ele(a) tem dificuldades em fazer novos amigos.', version: 'adolescente' },
];

export default function AvaliacoesView({ 
  students,
  imcRecords,
  motorRecords,
  sportRecords,
  vocationalRecords,
  healthRecords,
  oralRecords,
  autoconceptRecords,
  iasRecords,
  snapRecords,
  aq10Records,
  pcdRecords,
  updateImcState,
  updateMotorState,
  updateSportState,
  updateVocationalState,
  updateHealthState,
  updateOralState,
  updateAutoconceptState,
  updateIasState,
  updateSnapState,
  updateAq10State,
  updatePcdState,
  runWithPermission,
  contratos,
  user
}: AvaliacoesViewProps) {
  const isHydrating = user?.id === 'loading';
  const locale = useLocale();
  const t = useTranslations('avaliacoes');
  const ta = useTranslations('alunos');

  const displayValue = (value: unknown): string => {
    if (value == null) return '';
    const raw = String(value);
    const key = DISPLAY_KEYS[raw];
    if (key) return t(key);
    return raw
      .replace(/ a /g, ` ${t('conectorIntervalo')} `)
      .replace(/ ou mais/g, ` ${t('ouMais')}`)
      .replace(/ ou menos/g, ` ${t('ouMenos')}`);
  };

  const loggedInStudentObj = useMemo(() => {
    if (user?.role !== 'Aluno') return null;
    return students.find(s => 
      s.email?.toLowerCase().trim() === user?.email?.toLowerCase().trim() ||
      s.name?.toLowerCase().trim() === user?.name?.toLowerCase().trim() ||
      s.id === user?.id
    );
  }, [user, students]);

  // Navigation tabs for the assessments
  const [activeSubTab, setActiveSubTab] = useState<'imc' | 'motor' | 'sport' | 'vocational' | 'health' | 'oral' | 'autoconcept' | 'ias' | 'snap' | 'aq10' | 'pcd'>('imc');

  // Configuracoes dos modulos do Questionario (fonte: Supabase), usadas nas sugestoes
  const [m2Modalidades, setM2Modalidades] = useState<M2Modality[]>([]);
  const [aptidaoRefs, setAptidaoRefs] = useState<MotorRef[]>([]);
  const [, setImcConfigTick] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    if (!supabase) return;
    (async () => {
      try {
        const { data, error } = await supabase.from('m2_modalidades_config').select('id, name, requirements');
        if (!error && data && data.length > 0) {
          setM2Modalidades(
            data.map((r: { id: string; name: string; requirements: M2Modality['requirements'] }) => ({
              id: r.id,
              name: r.name,
              requirements: r.requirements,
            })),
          );
        }
      } catch (e) {
        console.error('Erro ao carregar m2_modalidades_config:', e);
      }
      try {
        const { data, error } = await supabase.from('aptidao_referenciais').select('id, category, idade, sexo, insuficiente, regular, bom, excelente');
        if (!error && data && data.length > 0) {
          setAptidaoRefs(
            data.map((r: { id: string; category: string; idade: string; sexo: string; insuficiente: string | null; regular: string; bom: string | null; excelente: string }) => ({
              id: r.id,
              category: r.category,
              idade: r.idade,
              sexo: r.sexo,
              insuficiente: r.insuficiente ?? '',
              regular: r.regular,
              bom: r.bom ?? '',
              excelente: r.excelente,
            })),
          );
        }
      } catch (e) {
        console.error('Erro ao carregar aptidao_referenciais:', e);
      }
      try {
        const { data, error } = await supabase.from('m4_imc_config').select('classification, status, alert_color, description, imc_min, imc_max');
        if (!error && data && data.length > 0) {
          m4ImcConfigCache = data.map((r: { classification: string; status: string | null; alert_color: string | null; description: string | null; imc_min: number | string | null; imc_max: number | string | null }) => ({
            classification: r.classification,
            status: r.status ?? '',
            alertColor: r.alert_color ?? 'emerald',
            description: r.description ?? '',
            imcMin: r.imc_min == null ? null : Number(r.imc_min),
            imcMax: r.imc_max == null ? null : Number(r.imc_max),
          }));
          setImcConfigTick(t => t + 1);
        }
      } catch (e) {
        console.error('Erro ao carregar m4_imc_config:', e);
      }
      try {
        const { data, error } = await supabase.from('m7_perfis_pareceres').select('profile, component, basic_data, reflection, interest_area, careers');
        if (!error && data && data.length > 0) {
          m7ConfigCache = data.map((r: { profile: string; component: string; basic_data: string | null; reflection: string | null; interest_area: string | null; careers: string | null }) => ({
            profile: r.profile,
            component: r.component,
            basicData: r.basic_data ?? '',
            reflection: r.reflection ?? '',
            interestArea: r.interest_area ?? '',
            careers: r.careers ?? '',
          }));
          setImcConfigTick(t => t + 1);
        }
      } catch (e) {
        console.error('Erro ao carregar m7_perfis_pareceres:', e);
      }
      try {
        const { data, error } = await supabase.from('voc_questions').select('id, ord, statement, option_a, option_b, option_c, option_d');
        if (!error && data && data.length > 0) {
          const loaded = data
            .map((r: { id: string; ord: number | null; statement: string; option_a: string; option_b: string; option_c: string; option_d: string }) => ({
              id: r.id,
              ord: r.ord ?? 0,
              statement: r.statement,
              optionA: r.option_a,
              optionB: r.option_b,
              optionC: r.option_c,
              optionD: r.option_d,
            }))
            .sort((a, b) => a.ord - b.ord);
          setVocQuestions(loaded);
          setVocAnswers(prev => loaded.map((_, idx) => prev[idx] ?? ''));
        }
      } catch (e) {
        console.error('Erro ao carregar voc_questions:', e);
      }
      try {
        const { data, error } = await supabase.from('m9_health_questions').select('id, ord, statement, reversed');
        if (!error && data && data.length > 0) {
          const loaded = data
            .map((r: { id: string; ord: number | null; statement: string; reversed: boolean | null }) => ({
              id: r.id,
              ord: r.ord ?? 0,
              statement: r.statement,
              reversed: !!r.reversed,
            }))
            .sort((a, b) => a.ord - b.ord);
          setHealthQuestions(loaded);
          setHealthAnswers(prev => loaded.map((_, idx) => prev[idx] ?? 0));
        }
      } catch (e) {
        console.error('Erro ao carregar m9_health_questions:', e);
      }
      try {
        const { data, error } = await supabase.from('m9_perfis_pareceres').select('classification, basic_data, reflection');
        if (!error && data && data.length > 0) {
          m9ParecerCache = data.map((r: { classification: string; basic_data: string | null; reflection: string | null }) => ({
            classification: r.classification,
            basicData: r.basic_data ?? '',
            reflection: r.reflection ?? '',
          }));
        }
      } catch (e) {
        console.error('Erro ao carregar m9_perfis_pareceres:', e);
      }
      try {
        const { data: g15, error: g15e } = await supabase.from('m15_pcd_grupos').select('id, grupo, nome, descricao, laudo');
        if (!g15e && g15 && g15.length > 0) {
          m15GruposCache = g15.map((r: { id: string; grupo: number; nome: string; descricao: string | null; laudo: string | null }) => ({ id: r.id, grupo: r.grupo, nome: r.nome, descricao: r.descricao ?? '', laudo: r.laudo ?? '' }));
        }
      } catch (e) { console.error('Erro ao carregar m15_pcd_grupos:', e); }
      try {
        const { data: a15, error: a15e } = await supabase.from('m15_pcd_adaptacoes').select('id, grupo, detalhe, teste, status, instrucao');
        if (!a15e && a15 && a15.length > 0) {
          m15AdaptacoesCache = a15.map((r: { id: string; grupo: number; detalhe: string; teste: string; status: string; instrucao: string | null }) => ({ id: r.id, grupo: r.grupo, detalhe: r.detalhe ?? '', teste: r.teste, status: r.status, instrucao: r.instrucao ?? '' }));
        }
      } catch (e) { console.error('Erro ao carregar m15_pcd_adaptacoes:', e); }
      try {
        const { data: f15, error: f15e } = await supabase.from('m15_pcd_faixas').select('id, grupo, detalhe, teste, nota, min_val, max_val');
        if (!f15e && f15 && f15.length > 0) {
          m15FaixasCache = f15.map((r: { id: string; grupo: number; detalhe: string; teste: string; nota: number; min_val: number | null; max_val: number | null }) => ({ id: r.id, grupo: r.grupo, detalhe: r.detalhe ?? '', teste: r.teste, nota: r.nota, minVal: r.min_val, maxVal: r.max_val }));
        }
      } catch (e) { console.error('Erro ao carregar m15_pcd_faixas:', e); }
      try {
        const { data: m15, error: m15e } = await supabase.from('m15_pcd_modalidades').select('id, nome, peso_vel_agil, peso_forca_exp, peso_membros_sup, peso_core, descricao');
        if (!m15e && m15 && m15.length > 0) {
          m15ModalidadesCache = m15.map((r: { id: string; nome: string; peso_vel_agil: number; peso_forca_exp: number; peso_membros_sup: number; peso_core: number; descricao: string | null }) => ({ id: r.id, nome: r.nome, pesoVelAgil: r.peso_vel_agil, pesoForcaExp: r.peso_forca_exp, pesoMembrosSup: r.peso_membros_sup, pesoCore: r.peso_core, descricao: r.descricao ?? '' }));
        }
      } catch (e) { console.error('Erro ao carregar m15_pcd_modalidades:', e); }
      try {
        const { data: u15, error: u15e } = await supabase.from('m15_pcd_funil').select('id, grupo, momento, titulo, regra');
        if (!u15e && u15 && u15.length > 0) {
          m15FunilCache = u15.map((r: { id: string; grupo: number; momento: number; titulo: string; regra: string | null }) => ({ id: r.id, grupo: r.grupo, momento: r.momento, titulo: r.titulo, regra: r.regra ?? '' }));
        }
      } catch (e) { console.error('Erro ao carregar m15_pcd_funil:', e); }
      try {
        const { data, error } = await supabase.from('m10_oral_questions').select('id, ord, statement');
        if (!error && data && data.length > 0) {
          const loaded = data
            .map((r: { id: string; ord: number | null; statement: string }) => ({
              id: r.id,
              ord: r.ord ?? 0,
              statement: r.statement,
            }))
            .sort((a, b) => a.ord - b.ord);
          setOralQuestions(loaded);
          setOralAnswers(prev => loaded.map((_, idx) => prev[idx] ?? null));
        }
      } catch (e) {
        console.error('Erro ao carregar m10_oral_questions:', e);
      }
      try {
        const { data, error } = await supabase.from('m10_perfis_pareceres').select('classification, basic_data, reflection');
        if (!error && data && data.length > 0) {
          m10ParecerCache = data.map((r: { classification: string; basic_data: string | null; reflection: string | null }) => ({
            classification: r.classification,
            basicData: r.basic_data ?? '',
            reflection: r.reflection ?? '',
          }));
        }
      } catch (e) {
        console.error('Erro ao carregar m10_perfis_pareceres:', e);
      }
      try {
        const { data, error } = await supabase.from('m11_autoconcept_questions').select('id, ord, statement, item_type');
        if (!error && data && data.length > 0) {
          const loaded = data
            .map((r: { id: string; ord: number | null; statement: string; item_type: string | null }) => ({
              id: r.id,
              ord: r.ord ?? 0,
              statement: r.statement,
              itemType: (r.item_type === 'negative' ? 'negative' : 'positive') as AutoconceptItemType,
            }))
            .sort((a, b) => a.ord - b.ord);
          setAutoQuestions(loaded);
          setAutoAnswers(prev => loaded.map((_, idx) => prev[idx] ?? ''));
        }
      } catch (e) {
        console.error('Erro ao carregar m11_autoconcept_questions:', e);
      }
      try {
        const { data, error } = await supabase.from('m11_perfis_pareceres').select('classification, basic_data, reflection');
        if (!error && data && data.length > 0) {
          m11ParecerCache = data.map((r: { classification: string; basic_data: string | null; reflection: string | null }) => ({
            classification: r.classification,
            basicData: r.basic_data ?? '',
            reflection: r.reflection ?? '',
          }));
        }
      } catch (e) {
        console.error('Erro ao carregar m11_perfis_pareceres:', e);
      }
      try {
        const { data, error } = await supabase.from('ias_questions').select('id, ord, statement, option_1_text, option_1_points, option_2_text, option_2_points, option_3_text, option_3_points');
        if (!error && data && data.length > 0) {
          const loaded: IasQuestion[] = data
            .map((r: { id: string; ord: number | null; statement: string; option_1_text: string | null; option_1_points: number | null; option_2_text: string | null; option_2_points: number | null; option_3_text: string | null; option_3_points: number | null }) => ({
              id: r.id,
              ord: r.ord ?? 0,
              statement: r.statement,
              option1Text: r.option_1_text ?? '',
              option1Points: r.option_1_points ?? 0,
              option2Text: r.option_2_text ?? '',
              option2Points: r.option_2_points ?? 0,
              option3Text: r.option_3_text ?? '',
              option3Points: r.option_3_points ?? 0,
            }))
            .sort((a, b) => a.ord - b.ord);
          setIasQuestions(loaded);
          setIasAnswers(prev => loaded.map((_, idx) => prev[idx] ?? -1));
        }
      } catch (e) {
        console.error('Erro ao carregar ias_questions:', e);
      }
      try {
        const { data, error } = await supabase.from('m12_perfis_pareceres').select('classification, basic_data, reflection');
        if (!error && data && data.length > 0) {
          m12ParecerCache = data.map((r: { classification: string; basic_data: string | null; reflection: string | null }) => ({
            classification: r.classification,
            basicData: r.basic_data ?? '',
            reflection: r.reflection ?? '',
          }));
        }
      } catch (e) {
        console.error('Erro ao carregar m12_perfis_pareceres:', e);
      }
      try {
        const { data, error } = await supabase.from('m13_snap_questions').select('id, ord, statement, subscale');
        if (!error && data && data.length > 0) {
          const loaded = data
            .map((r: { id: string; ord: number | null; statement: string; subscale: string | null }) => ({
              id: r.id,
              ord: r.ord ?? 0,
              statement: r.statement,
              subscale: (r.subscale === 'hyperactivity' ? 'hyperactivity' : 'inattention') as SnapSubscale,
            }))
            .sort((a, b) => a.ord - b.ord);
          setSnapQuestions(loaded);
          setSnapAnswers(prev => loaded.map((_, idx) => prev[idx] ?? -1));
        }
      } catch (e) {
        console.error('Erro ao carregar m13_snap_questions:', e);
      }
      try {
        const { data, error } = await supabase.from('m13_perfis_pareceres').select('classification, basic_data, reflection');
        if (!error && data && data.length > 0) {
          m13ParecerCache = data.map((r: { classification: string; basic_data: string | null; reflection: string | null }) => ({
            classification: r.classification,
            basicData: r.basic_data ?? '',
            reflection: r.reflection ?? '',
          }));
        }
      } catch (e) {
        console.error('Erro ao carregar m13_perfis_pareceres:', e);
      }
      try {
        const { data, error } = await supabase.from('m14_aq10_questions').select('id, ord, statement, version');
        if (!error && data && data.length > 0) {
          const loaded = data
            .map((r: { id: string; ord: number | null; statement: string; version: string | null }) => ({
              id: r.id,
              ord: r.ord ?? 0,
              statement: r.statement,
              version: (r.version === 'adolescente' ? 'adolescente' : 'crianca') as Aq10Version,
            }))
            .sort((a, b) => a.ord - b.ord);
          setAq10Questions(loaded);
          setAq10Answers(prev => loaded.filter(q => q.version === 'crianca').map((_, idx) => prev[idx] ?? -1));
        }
      } catch (e) {
        console.error('Erro ao carregar m14_aq10_questions:', e);
      }
      try {
        const { data, error } = await supabase.from('m14_perfis_pareceres').select('classification, basic_data, reflection');
        if (!error && data && data.length > 0) {
          m14ParecerCache = data.map((r: { classification: string; basic_data: string | null; reflection: string | null }) => ({
            classification: r.classification,
            basicData: r.basic_data ?? '',
            reflection: r.reflection ?? '',
          }));
        }
      } catch (e) {
        console.error('Erro ao carregar m14_perfis_pareceres:', e);
      }
    })();
  }, []);
  const [searchQuery, setSearchQuery] = useState('');

  // Security Context checks: Lock filters if they have single value, restrict if multiple values
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

  // 2. Modals Control state
  const [showImcModal, setShowImcModal] = useState(false);
  const [showMotorModal, setShowMotorModal] = useState(false);
  const [showSportModal, setShowSportModal] = useState(false);
  const [showVocationalModal, setShowVocationalModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showOralModal, setShowOralModal] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [showIasModal, setShowIasModal] = useState(false);
  const [showSnapModal, setShowSnapModal] = useState(false);
  const [showAq10Modal, setShowAq10Modal] = useState(false);

  // 3. For editing records (selected record being modified)
  const [editingImc, setEditingImc] = useState<ImcRecord | null>(null);
  const [editingMotor, setEditingMotor] = useState<MotorRecord | null>(null);
  const [editingSport, setEditingSport] = useState<SportRecord | null>(null);
  const [editingVocational, setEditingVocational] = useState<VocationalRecord | null>(null);
  const [editingHealth, setEditingHealth] = useState<HealthRecord | null>(null);
  const [editingOral, setEditingOral] = useState<OralRecord | null>(null);
  const [editingAuto, setEditingAuto] = useState<AutoconceptRecord | null>(null);
  const [editingIas, setEditingIas] = useState<IasRecord | null>(null);
  const [editingSnap, setEditingSnap] = useState<SnapRecord | null>(null);
  const [editingAq10, setEditingAq10] = useState<Aq10Record | null>(null);

  // Deletion Confirmation Modal state
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'imc' | 'motor' | 'sport' | 'vocational' | 'health' | 'oral' | 'autoconcept' | 'ias' | 'snap' | 'aq10' | 'pcd';
    id: string;
    studentName: string;
  } | null>(null);

  // 4. Form inputs (controlled)
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  // IMC inputs
  const [weightInput, setWeightInput] = useState<string>('70');
  const [heightInput, setHeightInput] = useState<string>('1.75');

  // Motor inputs
  const [impulsao, setImpulsao] = useState<'Excelente' | 'Bom' | 'Regular' | 'Insuficiente'>('Excelente');
  const [abdomen, setAbdomen] = useState<'Excelente' | 'Bom' | 'Regular' | 'Insuficiente'>('Excelente');
  const [agility, setAgility] = useState<'Excelente' | 'Bom' | 'Regular' | 'Insuficiente'>('Excelente');
  const [strength, setStrength] = useState<'Excelente' | 'Bom' | 'Regular' | 'Insuficiente'>('Excelente');
  const [speed, setSpeed] = useState<'Excelente' | 'Bom' | 'Regular' | 'Insuficiente'>('Excelente');

  // Sport inputs
  const [biotype, setBiotype] = useState<string>('Mesomorfo');
  const [mainSkill, setMainSkill] = useState<string>('Força Explosiva');
  const [suggestedSport, setSuggestedSport] = useState(t('sugeridoBasqueteVolei'));
  const [recommendedPractice, setRecommendedPractice] = useState('3h por semana');

  // Vocational inputs
  const [vocationalProfile, setVocationalProfile] = useState<string>('Humanas e Sociais');
  const [interestArea, setInterestArea] = useState<string>(t('perfilCurtoHumanas'));
  const [suggestedCareer, setSuggestedCareer] = useState(t('carreiraHumanas'));
  const [technicalOpinion, setTechnicalOpinion] = useState(t('perfilTextoHumanasLongo'));

  // 12 Vocational questions answers
  const [vocQuestions, setVocQuestions] = useState<VocQuestion[]>(DEFAULT_VOC_QUESTIONS);
  const [vocAnswers, setVocAnswers] = useState<string[]>(Array(12).fill(''));

  // Saude Global (KIDSCREEN-10): 10 itens escala 1-5 (0 = nao respondido)
  const [healthQuestions, setHealthQuestions] = useState<HealthQuestion[]>(DEFAULT_HEALTH_QUESTIONS);
  const [healthAnswers, setHealthAnswers] = useState<number[]>(Array(10).fill(0));
  const [healthResult, setHealthResult] = useState<{ raw: number; t: number; classification: HealthClassification } | null>(null);
  const [healthOpinion, setHealthOpinion] = useState('');

  // Higiene Bucal (HU-DBI): 20 itens Concordo/Discordo (null = nao respondido)
  const [oralQuestions, setOralQuestions] = useState<OralQuestion[]>(DEFAULT_ORAL_QUESTIONS);
  const [oralAnswers, setOralAnswers] = useState<(boolean | null)[]>(Array(20).fill(null));
  const [oralResult, setOralResult] = useState<{ score: number; classification: OralClassification } | null>(null);
  const [oralOpinion, setOralOpinion] = useState('');

  // Autoconceito (Rosenberg): 10 itens CT/C/D/DT ('' = nao respondido)
  const [autoQuestions, setAutoQuestions] = useState<AutoconceptQuestion[]>(DEFAULT_AUTOCONCEPT_QUESTIONS);
  const [autoAnswers, setAutoAnswers] = useState<AutoconceptAnswerCode[]>(Array(10).fill('' as unknown as AutoconceptAnswerCode));
  const [autoResult, setAutoResult] = useState<{ score: number; classification: AutoconceptClassification } | null>(null);
  const [autoOpinion, setAutoOpinion] = useState('');

  // Indice Alimentar (IAS): 11 componentes, respostas = indice da opcao (0/1/2), -1 = nao respondido
  const [iasQuestions, setIasQuestions] = useState<IasQuestion[]>(DEFAULT_IAS_QUESTIONS);
  const [iasAnswers, setIasAnswers] = useState<number[]>(Array(11).fill(-1));
  const [iasResult, setIasResult] = useState<{ score: number; max: number; classification: IasClassification } | null>(null);
  const [iasOpinion, setIasOpinion] = useState('');

  // Rastreamento TDAH (SNAP-IV): 18 itens escala 0-3 (-1 = nao respondido) + respondente do relato
  const [snapQuestions, setSnapQuestions] = useState<SnapQuestion[]>(DEFAULT_SNAP_QUESTIONS);
  const [snapAnswers, setSnapAnswers] = useState<number[]>(Array(18).fill(-1));
  const [snapResult, setSnapResult] = useState<{ inattention: number; hyperactivity: number; classification: SnapClassification } | null>(null);
  const [snapOpinion, setSnapOpinion] = useState('');
  const [snapRespondent, setSnapRespondent] = useState('');

  // Rastreamento Precoce do TEA (AQ-10): 10 itens por versao, escala 0-3 (-1 = nao respondido)
  const [aq10Questions, setAq10Questions] = useState<Aq10Question[]>(DEFAULT_AQ10_QUESTIONS);
  const [aq10Version, setAq10Version] = useState<Aq10Version>('crianca');
  const [aq10Answers, setAq10Answers] = useState<number[]>(Array(10).fill(-1));
  const [aq10Result, setAq10Result] = useState<{ totalScore: number; classification: Aq10Classification } | null>(null);
  const [aq10Opinion, setAq10Opinion] = useState('');
  const [aq10Respondent, setAq10Respondent] = useState('');

  // --- PCD (Qualidade Motora PCD) modal state ---
  const [showPcdModal, setShowPcdModal] = useState(false);
  const [editingPcd, setEditingPcd] = useState<PcdRecord | null>(null);
  const [pcdGrupo, setPcdGrupo] = useState(1);
  const [pcdDetalhe, setPcdDetalhe] = useState('');
  const [pcdAbdominal, setPcdAbdominal] = useState('');
  const [pcdVelocidade, setPcdVelocidade] = useState('');
  const [pcdAgilidade, setPcdAgilidade] = useState('');
  const [pcdSalto, setPcdSalto] = useState('');
  const [pcdFlexao, setPcdFlexao] = useState('');
  const [pcdOpinion, setPcdOpinion] = useState('');
  const [pcdResult, setPcdResult] = useState<PcdScoreResult | null>(null);

  const pcdConfigs = useMemo(() => {
    const grupos = m15GruposCache.length > 0 ? m15GruposCache : M15_GRUPOS_PADRAO.map(g => ({ id: `pg${g.grupo}`, ...g } as PcdGroupConfig));
    const adaptacoes = m15AdaptacoesCache.length > 0 ? m15AdaptacoesCache : DEFAULT_M15_ADAPTACOES;
    const faixas = m15FaixasCache.length > 0 ? m15FaixasCache : DEFAULT_M15_FAIXAS;
    const modalidades = m15ModalidadesCache.length > 0 ? m15ModalidadesCache : DEFAULT_M15_MODALIDADES;
    const funil = m15FunilCache.length > 0 ? m15FunilCache : DEFAULT_M15_FUNIL;
    return { grupos, adaptacoes, faixas, modalidades, funil };
  }, []);

  useEffect(() => {
    if (!showPcdModal) return;
    const res = computePcdScore(
      pcdGrupo,
      pcdDetalhe,
      {
        abdominalS: pcdAbdominal === '' ? null : Number(pcdAbdominal),
        velocidadeS: pcdVelocidade === '' ? null : Number(pcdVelocidade),
        agilidadeS: pcdAgilidade === '' ? null : Number(pcdAgilidade),
        saltoCm: pcdSalto === '' ? null : Number(pcdSalto),
        flexaoRep: pcdFlexao === '' ? null : Number(pcdFlexao),
      },
      pcdConfigs.adaptacoes,
      pcdConfigs.faixas,
      pcdConfigs.modalidades,
      pcdConfigs.funil
    );
    setPcdResult(res);
  }, [showPcdModal, pcdGrupo, pcdDetalhe, pcdAbdominal, pcdVelocidade, pcdAgilidade, pcdSalto, pcdFlexao, pcdConfigs]);

  const autoSuggestProfileAndCareer = useCallback((answers: string[]) => {
    const list = answers;
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    list.forEach(val => {
      if (val === 'A') counts.A++;
      else if (val === 'B') counts.B++;
      else if (val === 'C') counts.C++;
      else if (val === 'D') counts.D++;
    });

    const maxVal = Math.max(counts.A, counts.B, counts.C, counts.D);
    const tiedOptions = Object.keys(counts).filter(key => counts[key as 'A'|'B'|'C'|'D'] === maxVal);
    const isTie = tiedOptions.length > 1;

    let profile = '';
    let area = '';
    let career = '';
    let opinion = '';

    if (isTie) {
      profile = t('perfilCriativoTecnologico');
      career = 'Hibrido';
      area = t('textoExatasWeb');
      opinion = t('perfilTextoCriativoTecnologico');
    } else {
      const maxType = tiedOptions[0];
      if (maxType === 'A') {
        profile = 'Humanas e Sociais';
        career = t('carreiraHumanas');
        area = t('perfilCurtoHumanas');
        opinion = t('perfilTextoHumanasLongo');
      } else if (maxType === 'B') {
        profile = t('perfilExatas');
        career = t('carreiraExatas');
        area = t('perfilCurtoExatas');
        opinion = t('perfilTextoExatas');
      } else if (maxType === 'C') {
        profile = t('perfilBioCriativo');
        career = t('carreiraBioCriativa');
        area = t('perfilCurtoBioCriativo');
        opinion = t('perfilTextoBioCriativo');
      } else {
        profile = t('perfilNegocios');
        career = t('carreiraNegocios');
        area = t('perfilCurtoNegocios');
        opinion = t('perfilTextoNegocios');
      }
    }

    // Perfil/Área/Carreira/Parecer vêm do M7 quando houver perfil correspondente (componente "Mapa")
    const m7match = m7ConfigCache.find(r =>
      normProfile(r.profile) === normProfile(profile) && normProfile(r.component).includes('mapa')
    );
    if (m7match) {
      if (m7match.reflection) opinion = m7match.reflection;
      if (m7match.interestArea) area = m7match.interestArea;
      if (m7match.careers) career = m7match.careers;
    }

    return { profile, area, career, opinion };
  }, [t]);

  // Synchronize vocational profile, interest area, suggested career, and technical opinion whenever choices change or the modal opens
  useEffect(() => {
    if (showVocationalModal) {
      const allAnswered = vocQuestions.length > 0
        && vocAnswers.length === vocQuestions.length
        && vocAnswers.every((a) => a === 'A' || a === 'B' || a === 'C' || a === 'D');
      const timer = setTimeout(() => {
        if (allAnswered) {
          const suggestions = autoSuggestProfileAndCareer(vocAnswers);
          setVocationalProfile(suggestions.profile);
          setInterestArea(suggestions.area);
          setSuggestedCareer(suggestions.career);
          setTechnicalOpinion(suggestions.opinion);
        } else if (!editingVocational) {
          setVocationalProfile('');
          setInterestArea('');
          setSuggestedCareer('');
          setTechnicalOpinion('');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [vocAnswers, showVocationalModal, vocQuestions, editingVocational, autoSuggestProfileAndCareer]);

  // Synchronize Saude Global result (bruto/T/classificacao + parecer) when answers change or modal opens
  useEffect(() => {
    if (showHealthModal) {
      const complete = healthQuestions.length > 0
        && healthAnswers.length === healthQuestions.length
        && isCompleteHealthAnswers(healthAnswers);
      const timer = setTimeout(() => {
        if (complete) {
          const result = scoreHealth(healthAnswers);
          setHealthResult(result);
          const match = m9ParecerCache.find(p => p.classification === result.classification);
          setHealthOpinion(match?.reflection || '');
        } else if (!editingHealth) {
          setHealthResult(null);
          setHealthOpinion('');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [healthAnswers, showHealthModal, healthQuestions, editingHealth]);

  // Synchronize Higiene Bucal result (score 0-12 + classificacao + parecer) when answers change or modal opens
  useEffect(() => {
    if (showOralModal) {
      const complete = oralQuestions.length > 0
        && oralAnswers.length === oralQuestions.length
        && isCompleteOralAnswers(oralAnswers);
      const timer = setTimeout(() => {
        if (complete) {
          const result = scoreOral(oralAnswers as boolean[]);
          setOralResult(result);
          const match = m10ParecerCache.find(p => p.classification === result.classification);
          setOralOpinion(match?.reflection || '');
        } else if (!editingOral) {
          setOralResult(null);
          setOralOpinion('');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [oralAnswers, showOralModal, oralQuestions, editingOral]);

  // Synchronize Autoconceito result (Rosenberg 0-30 + classificacao + parecer)
  useEffect(() => {
    if (showAutoModal) {
      const complete = autoQuestions.length > 0
        && autoAnswers.length === autoQuestions.length
        && isCompleteAutoconceptAnswers(autoAnswers);
      const timer = setTimeout(() => {
        if (complete) {
          const types = autoQuestions.map(q => q.itemType);
          const result = scoreAutoconcept(autoAnswers, types);
          setAutoResult(result);
          const match = m11ParecerCache.find(p => p.classification === result.classification);
          setAutoOpinion(match?.reflection || '');
        } else if (!editingAuto) {
          setAutoResult(null);
          setAutoOpinion('');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoAnswers, showAutoModal, autoQuestions, editingAuto]);

  // Synchronize Indice Alimentar (IAS) result (total + faixa + parecer)
  useEffect(() => {
    if (showIasModal) {
      const complete = isCompleteIasAnswers(iasAnswers, iasQuestions);
      const timer = setTimeout(() => {
        if (complete) {
          const result = scoreIas(iasAnswers, iasQuestions);
          setIasResult(result);
          const match = m12ParecerCache.find(p => p.classification === result.classification);
          setIasOpinion(match?.reflection || '');
        } else if (!editingIas) {
          setIasResult(null);
          setIasOpinion('');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [iasAnswers, showIasModal, iasQuestions, editingIas]);

  // Sincroniza resultado do Rastreamento TDAH (SNAP-IV): itens clinicos por bloco + classificacao + parecer
  useEffect(() => {
    if (showSnapModal) {
      const complete = isCompleteSnapAnswers(snapAnswers);
      const timer = setTimeout(() => {
        if (complete) {
          const selectedStudent = students.find(s => s.id === selectedStudentId);
          const age = selectedStudent ? getStudentAgeYears(selectedStudent.birthDate) : null;
          const result = scoreSnap(snapAnswers, snapThresholdForAge(age));
          setSnapResult(result);
          const match = m13ParecerCache.find(p => p.classification === result.classification);
          setSnapOpinion(match?.reflection || '');
        } else if (!editingSnap) {
          setSnapResult(null);
          setSnapOpinion('');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [snapAnswers, showSnapModal, snapQuestions, editingSnap, selectedStudentId, students]);

  // Sincroniza resultado do Rastreamento Precoce do TEA (AQ-10): pontuacao 0-10 + classificacao + parecer
  useEffect(() => {
    if (showAq10Modal) {
      const complete = isCompleteAq10Answers(aq10Answers);
      const timer = setTimeout(() => {
        if (complete) {
          const result = scoreAq10(aq10Answers);
          setAq10Result(result);
          const match = m14ParecerCache.find(p => p.classification === result.classification);
          setAq10Opinion(match?.reflection || '');
        } else if (!editingAq10) {
          setAq10Result(null);
          setAq10Opinion('');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [aq10Answers, showAq10Modal, aq10Questions, editingAq10, aq10Version]);

  // Modal level selector states
  const [modalContract, setModalContract] = useState(contract);
  const [modalState, setModalState] = useState(stateFilter);
  const [modalRegion, setModalRegion] = useState(cityFilter);
  const [modalLocality, setModalLocality] = useState(localityFilter);

  // Keep modal level selectors synchronized with top level unified page filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setModalContract(contract);
      setModalState(stateFilter);
      setModalRegion(cityFilter);
      setModalLocality(localityFilter);
    }, 0);
    return () => clearTimeout(timer);
  }, [contract, stateFilter, cityFilter, localityFilter]);

  // States: Only unique states matching selected modalContract
  const modalAvailableStates = Array.from(new Set(
    availableContracts
      .filter(c => !modalContract || modalContract === 'Todos' || c.id === modalContract)
      .flatMap(c => {
        if (c.structure && Array.isArray(c.structure.estados)) {
          return c.structure.estados.map((st: EstHierarchical) => st.name);
        }
        return c.estado.split(',').map(s => s.trim());
      })
  )).filter(Boolean);

  // Regiões: Only unique regions matching selected modalContract AND selected modalState
  const modalAvailableRegions = Array.from(new Set(
    availableContracts
      .filter(c => !modalContract || modalContract === 'Todos' || c.id === modalContract)
      .flatMap(c => {
        if (c.structure && Array.isArray(c.structure.estados)) {
          const matchingStates = c.structure.estados.filter((st: EstHierarchical) => !modalState || modalState === 'Todos' || st.name === modalState);
          return matchingStates.flatMap((st: EstHierarchical) => st.regioes.map((r: RegHierarchical) => r.name));
        }
        const matchesState = !modalState || modalState === 'Todos' || c.estado.split(',').map(s => s.trim()).includes(modalState);
        return matchesState ? c.regiao.split(',').map(s => s.trim()) : [];
      })
  )).filter(Boolean);

  // Localidades: Only unique localities matching selected modalContract, modalState, AND modalRegion
  const modalAvailableLocalities = Array.from(new Set(
    availableContracts
      .filter(c => !modalContract || modalContract === 'Todos' || c.id === modalContract)
      .flatMap(c => {
        if (c.structure && Array.isArray(c.structure.estados)) {
          const matchingStates = c.structure.estados.filter((st: EstHierarchical) => !modalState || modalState === 'Todos' || st.name === modalState);
          const matchingRegs = matchingStates.flatMap((st: EstHierarchical) => st.regioes.filter((r: RegHierarchical) => !modalRegion || modalRegion === 'Todos' || modalRegion === 'Todas' || r.name === modalRegion));
          return matchingRegs.flatMap((r: RegHierarchical) => r.localidades.map((l: LocHierarchical) => l.name));
        }
        const matchesState = !modalState || modalState === 'Todos' || c.estado.split(',').map(s => s.trim()).includes(modalState);
        const matchesRegion = !modalRegion || modalRegion === 'Todos' || modalRegion === 'Todas' || c.regiao.split(',').map(s => s.trim()).includes(modalRegion);
        return (matchesState && matchesRegion) ? c.localidade.split(',').map(s => s.trim()) : [];
      })
  )).filter(Boolean);

  const getFilteredModalStudents = () => {
    const list = students.filter(s => {
      if (!isUserAdmin) {
        if (assignedContracts.length > 0 && (!s.contrato || !assignedContracts.includes(s.contrato.toLowerCase()))) {
          return false;
        }
        if (assignedStates.length > 0 && (!s.estado || !assignedStates.includes(s.estado.toLowerCase()))) {
          return false;
        }
        if (assignedRegions.length > 0 && (!s.regiao || !assignedRegions.includes(s.regiao.toLowerCase()))) {
          return false;
        }
        if (assignedLocalities.length > 0 && (!s.locality || !assignedLocalities.includes(s.locality.toLowerCase()))) {
          return false;
        }
        if (assignedGrades.length > 0 && (!s.grade || !assignedGrades.includes(s.grade.toLowerCase()))) {
          return false;
        }
      }
      if (modalContract && modalContract !== 'Todos') {
        const targetContractObj = availableContracts.find(c => c.id === modalContract);
        if (targetContractObj && s.contrato && s.contrato !== targetContractObj.name) {
          return false;
        }
      }
      if (modalState && modalState !== 'Todos') {
        if (s.estado && s.estado !== modalState) {
          return false;
        }
      }
      if (modalRegion && modalRegion !== 'Todos') {
        if (s.regiao && s.regiao !== modalRegion) {
          return false;
        }
      }
      if (modalLocality && modalLocality !== 'Todos') {
        const sLoc = (s.locality || '').toLowerCase().trim();
        const mLoc = modalLocality.toLowerCase().trim();
        if (sLoc !== mLoc) {
          return false;
        }
      }
      if (selectedGrade && selectedGrade !== 'Todos') {
        if (s.grade !== selectedGrade) {
          return false;
        }
      }
      return true;
    });

    const rule = ASSESSMENT_AGE_RULES[activeSubTab as AgeRuledSubTab];
    return list.map(s => {
      const age = getStudentAgeYears(s.birthDate);
      return {
        ...s,
        age,
        eligible: rule ? age != null && age >= rule.min && age <= rule.max : true,
      };
    });
  };

  // Opcoes de alunos por idade: elegiveis habilitados (com idade informada),
  // incompatives ou sem data de nascimento aparecem desabilitados com aviso.
  const renderStudentOptions = (subTab: AgeRuledSubTab) => {
    const rule = ASSESSMENT_AGE_RULES[subTab];
    return getFilteredModalStudents().map(s => {
      const outside = rule && (s.age == null || !s.eligible);
      const keepSelected = s.id === selectedStudentId;
      const ageLabel = s.age != null ? `${s.age} ${t('unidadeAnos')}` : t('idadeNaoCadastrada');
      return (
        <option key={s.id} value={s.id} disabled={outside && !keepSelected}>
          {s.name} - {ageLabel}
          {outside ? ` (${t('foraDaFaixa')} ${displayValue(rule.label)})` : ''}
        </option>
      );
    });
  };

  // Mensagem exibida no modal quando a faixa etaria torna a selecao invalida.
  const renderStudentAgeNote = (subTab: AgeRuledSubTab) => {
    const rule = ASSESSMENT_AGE_RULES[subTab];
    const list = getFilteredModalStudents();
    const noneEligible = list.length > 0 && !list.some(s => s.eligible);
    const withoutBirth = list.filter(s => s.age == null).length;
    return (
      <>
        {noneEligible && (
          <p className="mt-1 text-[10px] text-amber-300/80 font-bold">
            {t('semAlunoCompativel')} ({displayValue(rule.label)}).
          </p>
        )}
        {!noneEligible && withoutBirth > 0 && (
          <p className="mt-1 text-[10px] text-[#bdc8d1]/60">
            {withoutBirth} {t('alunosSemNascimentoNota')}
          </p>
        )}
      </>
    );
  };

  const autoSuggestSportForStudent = (resolvedId: string) => {
    if (!resolvedId) {
      setSuggestedSport(t('sugeridoAprimorar'));
      return;
    }

    // 1. Get latest IMC level
    const studentImcs = imcRecords.filter(r => r.studentId === resolvedId);
    const latestImc = studentImcs.sort((a, b) => safeGetTimestamp(b.date) - safeGetTimestamp(a.date))[0];
    
    let imcLevel: 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente' = 'Regular';
    if (latestImc) {
      const rawCls = latestImc.classification || getImcClass(latestImc.weight, latestImc.height).label || '';
      const cls = rawCls.toLowerCase();
      if (cls.includes('normal') || cls.includes('peso ideal') || cls.includes('eutrofia')) {
        imcLevel = 'Excelente';
      } else if (cls.includes('baixo') || cls.includes('magreza')) {
        imcLevel = 'Bom';
      } else if (cls.includes('sobrepeso')) {
        imcLevel = 'Regular';
      } else if (cls.includes('obesidade') || cls.includes('obeso')) {
        imcLevel = 'Insuficiente';
      } else {
        imcLevel = 'Regular';
      }
    }

    // 2. Get latest Motor level
    const studentMotors = motorRecords.filter(r => r.studentId === resolvedId);
    const latestMotor = studentMotors.sort((a, b) => safeGetTimestamp(b.date) - safeGetTimestamp(a.date))[0];

    if (!latestMotor) {
      setSuggestedSport(t('sugeridoAprimorar'));
      return;
    }

    const studLevels = {
      imc: imcLevel,
      v20m: latestMotor.speed || 'Regular',
      impulsao: latestMotor.impulsao || latestMotor.flexibility || 'Regular',
      flexao: latestMotor.strength || 'Regular',
      agilidade: latestMotor.agility || 'Regular',
      abdominal: latestMotor.abdomen || latestMotor.coordination || 'Regular',
    };

    // 3. Load m2 modalities config (banco -> localStorage -> padrao)
    let loadedMods: M2Modality[] = [];
    if (m2Modalidades && m2Modalidades.length > 0) {
      loadedMods = m2Modalidades;
    } else if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('educore_m2_modalidades_config');
      if (saved) {
        try {
          loadedMods = JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing educore_m2_modalidades_config:', e);
        }
      }
    }
    if (loadedMods.length === 0) loadedMods = DEFAULT_M2_MODALIDADES;

    // 4. Compare and match
    const matchingModalities: string[] = [];
    loadedMods.forEach((mod: M2Modality) => {
      const reqs = mod.requirements || {};
      const testKeys = ['imc', 'v20m', 'impulsao', 'flexao', 'agilidade', 'abdominal'] as const;
      const matchesAll = testKeys.every(k => {
        const allowed = reqs[k] || [];
        const studVal = studLevels[k];
        return allowed.includes(studVal);
      });
      if (matchesAll) {
        matchingModalities.push(mod.name);
      }
    });

    if (matchingModalities.length > 0) {
      setSuggestedSport(matchingModalities.join(', '));
    } else {
      setSuggestedSport(t('sugeridoAprimorar'));
    }
  };

  const getLabelWithRef = (category: string, optionValue: string) => {
    const resolvedId = selectedStudentId;
    const currentStudent = students.find(s => s.id === resolvedId);
    if (!currentStudent) return optionValue;
    const sAge = calculateStudentAge(currentStudent.birthDate);
    const sSex = currentStudent.gender || 'Feminino';
    
    const matchingRef = findMatchingRefMotor(aptidaoRefs, category, sSex, sAge);
    if (!matchingRef) return optionValue;

    // Get range based on the optionValue:
    let range = '';
    if (optionValue === 'Excelente') range = matchingRef.excelente;
    else if (optionValue === 'Bom') range = matchingRef.bom;
    else if (optionValue === 'Regular') range = matchingRef.regular;
    else if (optionValue === 'Insuficiente') range = matchingRef.insuficiente;

    if (!range || range === 'Não se aplica') {
      return optionValue;
    }
    return `${optionValue} (${range})`;
  };

  const resolvedSportId = selectedStudentId;

  const computedBiotype = useMemo(() => {
    if (!resolvedSportId) return 'Não cadastrado';
    const latestImc = imcRecords
      .filter(r => r.studentId === resolvedSportId)
      .sort((a, b) => safeGetTimestamp(b.date) - safeGetTimestamp(a.date))[0];
    if (latestImc) {
      return latestImc.classification || getImcClass(latestImc.weight, latestImc.height).label;
    }
    return 'Não cadastrado';
  }, [resolvedSportId, imcRecords]);

  const computedMainSkill = useMemo(() => {
    if (!resolvedSportId) return 'Não cadastrado';
    const latestMotor = motorRecords
      .filter(r => r.studentId === resolvedSportId)
      .sort((a, b) => safeGetTimestamp(b.date) - safeGetTimestamp(a.date))[0];
    return latestMotor ? (latestMotor.generalClass || 'Regular') : 'Não cadastrado';
  }, [resolvedSportId, motorRecords]);

  // Helper defaults picker to open modals
  const resetFormStateWithStudent = (studentId: string) => {
    const defaultStudentId = studentId || '';
    setSelectedStudentId(defaultStudentId);
    setWeightInput('70');
    setHeightInput('1.75');
    setImpulsao('Excelente');
    setAbdomen('Excelente');
    setAgility('Excelente');
    setStrength('Excelente');
    setSpeed('Excelente');
    setBiotype('Mesomorfo');
    setMainSkill('Força Explosiva');
    autoSuggestSportForStudent(defaultStudentId);
    setRecommendedPractice('3h por semana');
    setVocAnswers(Array(vocQuestions.length).fill(''));
    setVocationalProfile('Humanas e Sociais');
    setInterestArea(t('perfilCurtoHumanas'));
    setSuggestedCareer(t('carreiraHumanas'));
    setTechnicalOpinion(t('perfilTextoHumanas'));
    
    // Set modal filters with current dashboard filter values
    setModalContract(contract || '');
    setModalState(stateFilter || '');
    setModalRegion(cityFilter || '');
    setModalLocality(localityFilter || '');
  };

  // ------------------ CRUD HANDLERS ------------------

  // --- 1. IMC ---
  const handleOpenNewImc = () => {
    setEditingImc(null);
    resetFormStateWithStudent('');
    setShowImcModal(true);
  };

  const handleEditImc = (rec: ImcRecord) => {
    setEditingImc(rec);
    setSelectedStudentId(rec.studentId);
    setWeightInput(rec.weight.toString());
    setHeightInput(rec.height.toString());
    setShowImcModal(true);
  };

  const handleSaveImc = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedStudentId = selectedStudentId;
    if (!resolvedStudentId) {
      alert(t('erroSelecionarAluno'));
      return;
    }
    const targetStudentObj = students.find(s => s.id === resolvedStudentId);
    const sName = targetStudentObj ? targetStudentObj.name : ta('colunaAluno');
    const sGrade = targetStudentObj ? targetStudentObj.grade : t('turnoDesconhecido');
    
    const w = parseFloat(weightInput) || 0;
    const h = parseFloat(heightInput) || 0;
    if (w <= 0 || h <= 0) {
      alert(t('erroPesoAltura'));
      return;
    }
    const computedImc = parseFloat((w / (h * h)).toFixed(1));

    runWithPermission('edit:avaliacoes', async () => {
      if (editingImc) {
        // PUT
        const updated = imcRecords.map(r => {
          if (r.id === editingImc.id) {
            return {
              ...r,
              studentId: resolvedStudentId,
              studentName: sName,
              classGroup: sGrade,
              weight: w,
              height: h,
              imc: computedImc,
              classification: getImcClass(w, h).label
            };
          }
          return r;
        });
        updateImcState(updated);
        void ensurePerformanceReport('imc', { studentId: resolvedStudentId, studentName: sName, studentGrade: sGrade, record: (updated.find(r => r.id === editingImc.id) ?? {}) as unknown as Record<string, unknown> });
      } else {
        // POST
        const generatedId = await nextImcId();
        const nextId = generatedId || ('IMC_' + uuid().slice(0, 8));

        const newRec: ImcRecord = {
          id: nextId,
          studentId: resolvedStudentId,
          studentName: sName,
          classGroup: sGrade,
          weight: w,
          height: h,
          imc: computedImc,
          classification: getImcClass(w, h).label,
          date: new Date().toISOString().split('T')[0]
        };
        updateImcState([newRec, ...imcRecords]);
        void ensurePerformanceReport('imc', { studentId: resolvedStudentId, studentName: sName, studentGrade: sGrade, record: newRec as unknown as Record<string, unknown> });
      }
      setShowImcModal(false);
    });
  };

  const handleDeleteImc = (id: string, name: string) => {
    setItemToDelete({ type: 'imc', id, studentName: name });
  };

  // --- 2. MOTOR QUALITY ---
  const handleOpenNewMotor = () => {
    setEditingMotor(null);
    resetFormStateWithStudent('');
    setShowMotorModal(true);
  };

  const handleEditMotor = (rec: MotorRecord) => {
    setEditingMotor(rec);
    setSelectedStudentId(rec.studentId);
    setImpulsao((rec.impulsao || rec.flexibility || 'Excelente') as 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente');
    setAbdomen((rec.abdomen || rec.coordination || 'Excelente') as 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente');
    setAgility((rec.agility) as 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente');
    setStrength((rec.strength) as 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente');
    setSpeed((rec.speed || 'Excelente') as 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente');
    setShowMotorModal(true);
  };

  const handleSaveMotor = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedStudentId = selectedStudentId;
    if (!resolvedStudentId) {
      alert(t('erroSelecionarAluno'));
      return;
    }
    const targetStudentObj = students.find(s => s.id === resolvedStudentId);
    const sName = targetStudentObj ? targetStudentObj.name : ta('colunaAluno');
    const geralCalculada = computeGeneralClass([impulsao, abdomen, agility, strength, speed]);

    runWithPermission('edit:avaliacoes', async () => {
      if (editingMotor) {
        const updated = motorRecords.map(r => {
          if (r.id === editingMotor.id) {
            return {
              ...r,
              studentId: resolvedStudentId,
              studentName: sName,
              impulsao,
              abdomen,
              agility,
              strength,
              speed,
              generalClass: geralCalculada
            };
          }
          return r;
        });
        updateMotorState(updated);
        void ensurePerformanceReport('motor', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: (updated.find(r => r.id === editingMotor.id) ?? {}) as unknown as Record<string, unknown> });
      } else {
        const generatedId = await nextMotorId();
        const nextId = generatedId || ('Motor_' + uuid().slice(0, 8));

        const newRec: MotorRecord = {
          id: nextId,
          studentId: resolvedStudentId,
          studentName: sName,
          impulsao,
          abdomen,
          agility,
          strength,
          speed,
          generalClass: geralCalculada,
          date: new Date().toISOString().split('T')[0]
        };
        updateMotorState([newRec, ...motorRecords]);
        void ensurePerformanceReport('motor', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: newRec as unknown as Record<string, unknown> });
      }
      setShowMotorModal(false);
    });
  };

  const handleDeleteMotor = (id: string, name: string) => {
    setItemToDelete({ type: 'motor', id, studentName: name });
  };

  // --- 3. INDICATED SPORT ---
  const handleOpenNewSport = () => {
    setEditingSport(null);
    resetFormStateWithStudent('');
    setShowSportModal(true);
  };

  const handleEditSport = (rec: SportRecord) => {
    setEditingSport(rec);
    setSelectedStudentId(rec.studentId);
    setBiotype(rec.biotype);
    setMainSkill(rec.mainSkill);
    setSuggestedSport(rec.suggestedSport);
    setRecommendedPractice(rec.recommendedPractice);
    setShowSportModal(true);
  };

  const handleSaveSport = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedStudentId = selectedStudentId;
    if (!resolvedStudentId) {
      alert(t('erroSelecionarAluno'));
      return;
    }

    const isMotorNotRegistered = (editingSport ? mainSkill : computedMainSkill) === 'Não cadastrado';
    if (isMotorNotRegistered) {
      alert(t('erroPreencherMotor'));
      return;
    }

    const targetStudentObj = students.find(s => s.id === resolvedStudentId);
    const sName = targetStudentObj ? targetStudentObj.name : ta('colunaAluno');

    runWithPermission('edit:avaliacoes', async () => {
      if (editingSport) {
        const updated = sportRecords.map(r => {
          if (r.id === editingSport.id) {
            return {
              ...r,
              studentId: resolvedStudentId,
              studentName: sName,
              biotype: biotype,
              mainSkill: mainSkill,
              suggestedSport,
              recommendedPractice
            };
          }
          return r;
        });
        updateSportState(updated);
        void ensurePerformanceReport('sport', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: (updated.find(r => r.id === editingSport.id) ?? {}) as unknown as Record<string, unknown> });
      } else {
        const generatedId = await nextSportId();
        const nextId = generatedId || ('Esporte_' + uuid().slice(0, 8));

        const newRec: SportRecord = {
          id: nextId,
          studentId: resolvedStudentId,
          studentName: sName,
          biotype: computedBiotype,
          mainSkill: computedMainSkill,
          suggestedSport,
          recommendedPractice,
          date: new Date().toISOString().split('T')[0]
        };
        updateSportState([newRec, ...sportRecords]);
        void ensurePerformanceReport('sport', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: newRec as unknown as Record<string, unknown> });
      }
      setShowSportModal(false);
    });
  };

  const handleDeleteSport = (id: string, name: string) => {
    setItemToDelete({ type: 'sport', id, studentName: name });
  };

  // --- 4. VOCATIONAL ---
  const handleOpenNewVocational = () => {
    setEditingVocational(null);
    resetFormStateWithStudent('');
    setShowVocationalModal(true);
  };

  const handleEditVocational = (rec: VocationalRecord) => {
    setEditingVocational(rec);
    setSelectedStudentId(rec.studentId);
    setVocationalProfile(rec.profile);
    setInterestArea(rec.interestArea);
    setSuggestedCareer(rec.suggestedCareer);
    setTechnicalOpinion(rec.technicalOpinion);
    if (rec.answers && Array.isArray(rec.answers)) {
      const loaded = rec.answers.slice(0, vocQuestions.length);
      while (loaded.length < vocQuestions.length) loaded.push('');
      setVocAnswers(loaded);
    } else {
      setVocAnswers(Array(vocQuestions.length).fill(''));
    }
    setShowVocationalModal(true);
  };

  const handleSaveVocational = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedStudentId = selectedStudentId;
    if (!resolvedStudentId) {
      alert(t('erroSelecionarAluno'));
      return;
    }
    const targetStudentObj = students.find(s => s.id === resolvedStudentId);
    const sName = targetStudentObj ? targetStudentObj.name : ta('colunaAluno');

    const allAnswered = vocQuestions.length > 0
      && vocAnswers.length === vocQuestions.length
      && vocAnswers.every((a) => a === 'A' || a === 'B' || a === 'C' || a === 'D');
    if (!allAnswered) {
      alert(t('erroResponderVoc'));
      return;
    }

    runWithPermission('edit:avaliacoes', async () => {
      if (editingVocational) {
        const updated = vocationalRecords.map(r => {
          if (r.id === editingVocational.id) {
            return {
              ...r,
              studentId: resolvedStudentId,
              studentName: sName,
              profile: vocationalProfile,
              interestArea,
              suggestedCareer,
              technicalOpinion,
              answers: vocAnswers
            };
          }
          return r;
        });
        updateVocationalState(updated);
        void ensurePerformanceReport('vocational', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: (updated.find(r => r.id === editingVocational.id) ?? {}) as unknown as Record<string, unknown> });
      } else {
        const generatedId = await nextVocationalId();
        const nextId = generatedId || ('Vocal_' + uuid().slice(0, 8));

        const newRec: VocationalRecord = {
          id: nextId,
          studentId: resolvedStudentId,
          studentName: sName,
          profile: vocationalProfile,
          interestArea,
          suggestedCareer,
          technicalOpinion,
          date: new Date().toISOString().split('T')[0],
          answers: vocAnswers
        };
        updateVocationalState([newRec, ...vocationalRecords]);
        void ensurePerformanceReport('vocational', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: newRec as unknown as Record<string, unknown> });
      }
      setShowVocationalModal(false);
    });
  };

  const handleDeleteVocational = (id: string, name: string) => {
    setItemToDelete({ type: 'vocational', id, studentName: name });
  };

  // --- 5. SAUDE GLOBAL (KIDSCREEN-10) ---
  const handleOpenNewHealth = () => {
    setEditingHealth(null);
    resetFormStateWithStudent('');
    setHealthAnswers(Array(healthQuestions.length).fill(0));
    setHealthResult(null);
    setHealthOpinion('');
    setShowHealthModal(true);
  };

  const handleEditHealth = (rec: HealthRecord) => {
    setEditingHealth(rec);
    setSelectedStudentId(rec.studentId);
    if (rec.answers && Array.isArray(rec.answers)) {
      const loaded = rec.answers.slice(0, healthQuestions.length);
      while (loaded.length < healthQuestions.length) loaded.push(0);
      setHealthAnswers(loaded);
    } else {
      setHealthAnswers(Array(healthQuestions.length).fill(0));
    }
    setHealthResult({ raw: rec.rawScore, t: rec.tScore, classification: rec.classification as HealthClassification });
    const match = m9ParecerCache.find(p => p.classification === rec.classification);
    setHealthOpinion(rec.technicalOpinion || match?.reflection || '');
    setShowHealthModal(true);
  };

  const handleSaveHealth = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedStudentId = selectedStudentId;
    if (!resolvedStudentId) {
      alert(t('erroSelecionarAluno'));
      return;
    }
    if (healthQuestions.length === 0 || healthAnswers.length !== healthQuestions.length || !isCompleteHealthAnswers(healthAnswers)) {
      alert(t('erroResponderVoc'));
      return;
    }
    const targetStudentObj = students.find(s => s.id === resolvedStudentId);
    const sName = targetStudentObj ? targetStudentObj.name : ta('colunaAluno');
    const result = scoreHealth(healthAnswers);

    runWithPermission('edit:avaliacoes', async () => {
      if (editingHealth) {
        const updated = healthRecords.map(r => r.id === editingHealth.id ? {
          ...r,
          studentId: resolvedStudentId,
          studentName: sName,
          rawScore: result.raw,
          tScore: result.t,
          classification: result.classification,
          technicalOpinion: healthOpinion,
          answers: healthAnswers,
        } : r);
        updateHealthState(updated);
        void ensurePerformanceReport('health', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: (updated.find(r => r.id === editingHealth.id) ?? {}) as unknown as Record<string, unknown> });
      } else {
        const generatedId = await nextHealthAssessmentId();
        const nextId = generatedId || ('Health_' + uuid().slice(0, 8));
        const newRec: HealthRecord = {
          id: nextId,
          studentId: resolvedStudentId,
          studentName: sName,
          rawScore: result.raw,
          tScore: result.t,
          classification: result.classification,
          technicalOpinion: healthOpinion,
          date: new Date().toISOString().split('T')[0],
          answers: healthAnswers,
        };
        updateHealthState([newRec, ...healthRecords]);
        void ensurePerformanceReport('health', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: newRec as unknown as Record<string, unknown> });
      }
      setShowHealthModal(false);
    });
  };

  const handleDeleteHealth = (id: string, name: string) => {
    setItemToDelete({ type: 'health', id, studentName: name });
  };

  // --- 15. PCD (Qualidade Motora PCD) ---
  const handleOpenNewPcd = () => {
    setEditingPcd(null);
    resetFormStateWithStudent('');
    setPcdGrupo(1);
    setPcdDetalhe('');
    setPcdAbdominal('');
    setPcdVelocidade('');
    setPcdAgilidade('');
    setPcdSalto('');
    setPcdFlexao('');
    setPcdOpinion('');
    setPcdResult(null);
    setShowPcdModal(true);
  };

  const handleEditPcd = (rec: PcdRecord) => {
    setEditingPcd(rec);
    setSelectedStudentId(rec.studentId);
    setPcdGrupo(rec.grupo);
    setPcdDetalhe(rec.detalheClassificacao || '');
    setPcdAbdominal(rec.abdominalS !== null && rec.abdominalS !== undefined ? String(rec.abdominalS) : '');
    setPcdVelocidade(rec.velocidadeS !== null && rec.velocidadeS !== undefined ? String(rec.velocidadeS) : '');
    setPcdAgilidade(rec.agilidadeS !== null && rec.agilidadeS !== undefined ? String(rec.agilidadeS) : '');
    setPcdSalto(rec.saltoCm !== null && rec.saltoCm !== undefined ? String(rec.saltoCm) : '');
    setPcdFlexao(rec.flexaoRep !== null && rec.flexaoRep !== undefined ? String(rec.flexaoRep) : '');
    setPcdOpinion(rec.technicalOpinion || '');
    setShowPcdModal(true);
  };

  const handleSavePcd = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedStudentId = selectedStudentId;
    if (!resolvedStudentId) {
      alert(t('erroSelecionarAluno'));
      return;
    }
    const targetStudentObj = students.find(s => s.id === resolvedStudentId);
    const sName = targetStudentObj ? targetStudentObj.name : ta('colunaAluno');
    if (!pcdResult) {
      alert(t('erroPreencherPcd'));
      return;
    }
    const grupoNome = pcdConfigs.grupos.find(g => g.grupo === pcdGrupo)?.nome || PCD_GRUPO_NOMES[pcdGrupo] || `Grupo ${pcdGrupo}`;
    const opinion = pcdOpinion.trim() || `Grupo de triagem ${pcdGrupo} (${grupoNome}). Perfil: ${pcdResult.classificacaoPerfil}. Direcionamento esportivo sugerido: ${pcdResult.direcionamento}.`;

    const numOrNull = (s: string, invertido: boolean): number | null => {
      if (s === '') return null;
      const n = Number(s);
      if (invertido && n <= 0) return null;
      return n;
    };
    runWithPermission('edit:avaliacoes', async () => {
      const fields = {
        studentId: resolvedStudentId,
        studentName: sName,
        grupo: pcdGrupo,
        grupoNome,
        detalheClassificacao: pcdDetalhe,
        abdominalS: numOrNull(pcdAbdominal, false),
        velocidadeS: numOrNull(pcdVelocidade, true),
        agilidadeS: numOrNull(pcdAgilidade, true),
        saltoCm: numOrNull(pcdSalto, false),
        flexaoRep: numOrNull(pcdFlexao, false),
        notaAbdominal: pcdResult.notasPorTeste.abdominal,
        notaVelocidade: pcdResult.notasPorTeste.velocidade,
        notaAgilidade: pcdResult.notasPorTeste.agilidade,
        notaSalto: pcdResult.notasPorTeste.salto,
        notaFlexao: pcdResult.notasPorTeste.flexao,
        notaVelAgil: pcdResult.notasValencias.velAgil,
        notaForcaExplosiva: pcdResult.notasValencias.forcaExplosiva,
        notaMembrosSup: pcdResult.notasValencias.membrosSup,
        notaCore: pcdResult.notasValencias.core,
        compatibilidade: pcdResult.compatibilidade,
        direcionamento: pcdResult.direcionamento,
        classificacaoPerfil: pcdResult.classificacaoPerfil,
        funil: pcdResult.funil,
        adaptacoesAplicadas: pcdResult.adaptacoesAplicadas,
        technicalOpinion: opinion,
      };
      if (editingPcd) {
        const updated = pcdRecords.map(r => r.id === editingPcd.id ? { ...r, ...fields } as PcdRecord : r);
        updatePcdState(updated);
        void ensurePerformanceReport('pcd', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: (updated.find(r => r.id === editingPcd.id) ?? {}) as unknown as Record<string, unknown> });
      } else {
        const generatedId = await nextPcdAssessmentId();
        const nextId = generatedId || ('Pcd_' + uuid().slice(0, 8));
        const newRec: PcdRecord = {
          id: nextId,
          date: new Date().toISOString().split('T')[0],
          ...fields,
        };
        updatePcdState([newRec, ...pcdRecords]);
        void ensurePerformanceReport('pcd', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: newRec as unknown as Record<string, unknown> });
      }
      setShowPcdModal(false);
    });
  };

  const handleDeletePcd = (id: string, name: string) => {
    setItemToDelete({ type: 'pcd', id, studentName: name });
  };

  // --- 6. HIGIENE BUCAL (HU-DBI) ---
  const handleOpenNewOral = () => {
    setEditingOral(null);
    resetFormStateWithStudent('');
    setOralAnswers(Array(oralQuestions.length).fill(null));
    setOralResult(null);
    setOralOpinion('');
    setShowOralModal(true);
  };

  const handleEditOral = (rec: OralRecord) => {
    setEditingOral(rec);
    setSelectedStudentId(rec.studentId);
    if (rec.answers && Array.isArray(rec.answers)) {
      const loaded: (boolean | null)[] = rec.answers.slice(0, oralQuestions.length);
      while (loaded.length < oralQuestions.length) loaded.push(null);
      setOralAnswers(loaded);
    } else {
      setOralAnswers(Array(oralQuestions.length).fill(null));
    }
    setOralResult({ score: rec.score, classification: rec.classification as OralClassification });
    const match = m10ParecerCache.find(p => p.classification === rec.classification);
    setOralOpinion(rec.technicalOpinion || match?.reflection || '');
    setShowOralModal(true);
  };

  const handleSaveOral = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedStudentId = selectedStudentId;
    if (!resolvedStudentId) {
      alert(t('erroSelecionarAluno'));
      return;
    }
    const targetStudentObj = students.find(s => s.id === resolvedStudentId);
    if (!editingOral) {
      const age = targetStudentObj ? getStudentAgeYears(targetStudentObj.birthDate) : null;
      if (age == null) {
        alert(t('erroNascimentoOral'));
        return;
      }
      if (age < 11) {
        alert(t('erroIdadeOral'));
        return;
      }
    }
    if (oralQuestions.length === 0 || oralAnswers.length !== oralQuestions.length || !isCompleteOralAnswers(oralAnswers)) {
      alert(t('erroResponderOral'));
      return;
    }
    const sName = targetStudentObj ? targetStudentObj.name : ta('colunaAluno');
    const result = scoreOral(oralAnswers as boolean[]);

    runWithPermission('edit:avaliacoes', async () => {
      if (editingOral) {
        const updated = oralRecords.map(r => r.id === editingOral.id ? {
          ...r,
          studentId: resolvedStudentId,
          studentName: sName,
          score: result.score,
          classification: result.classification,
          technicalOpinion: oralOpinion,
          answers: oralAnswers as boolean[],
        } : r);
        updateOralState(updated);
        void ensurePerformanceReport('oral', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: (updated.find(r => r.id === editingOral.id) ?? {}) as unknown as Record<string, unknown> });
      } else {
        const generatedId = await nextOralAssessmentId();
        const nextId = generatedId || ('Oral_' + uuid().slice(0, 8));
        const newRec: OralRecord = {
          id: nextId,
          studentId: resolvedStudentId,
          studentName: sName,
          score: result.score,
          classification: result.classification,
          technicalOpinion: oralOpinion,
          date: new Date().toISOString().split('T')[0],
          answers: oralAnswers as boolean[],
        };
        updateOralState([newRec, ...oralRecords]);
        void ensurePerformanceReport('oral', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: newRec as unknown as Record<string, unknown> });
      }
      setShowOralModal(false);
    });
  };

  const handleDeleteOral = (id: string, name: string) => {
    setItemToDelete({ type: 'oral', id, studentName: name });
  };

  // --- 7. AUTOCONCEITO (Escala de Rosenberg) ---
  const handleOpenNewAuto = () => {
    setEditingAuto(null);
    resetFormStateWithStudent('');
    setAutoAnswers(Array(autoQuestions.length).fill('' as unknown as AutoconceptAnswerCode));
    setAutoResult(null);
    setAutoOpinion('');
    setShowAutoModal(true);
  };

  const handleEditAuto = (rec: AutoconceptRecord) => {
    setEditingAuto(rec);
    setSelectedStudentId(rec.studentId);
    if (rec.answers && Array.isArray(rec.answers)) {
      const loaded = rec.answers.slice(0, autoQuestions.length) as AutoconceptAnswerCode[];
      while (loaded.length < autoQuestions.length) loaded.push('' as unknown as AutoconceptAnswerCode);
      setAutoAnswers(loaded);
    } else {
      setAutoAnswers(Array(autoQuestions.length).fill('' as unknown as AutoconceptAnswerCode));
    }
    setAutoResult({ score: rec.score, classification: rec.classification as AutoconceptClassification });
    const match = m11ParecerCache.find(p => p.classification === rec.classification);
    setAutoOpinion(rec.technicalOpinion || match?.reflection || '');
    setShowAutoModal(true);
  };

  const handleSaveAuto = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedStudentId = selectedStudentId;
    if (!resolvedStudentId) {
      alert(t('erroSelecionarAluno'));
      return;
    }
    if (autoQuestions.length === 0 || autoAnswers.length !== autoQuestions.length || !isCompleteAutoconceptAnswers(autoAnswers)) {
      alert(t('erroResponderAuto'));
      return;
    }
    const targetStudentObj = students.find(s => s.id === resolvedStudentId);
    const sName = targetStudentObj ? targetStudentObj.name : ta('colunaAluno');
    const types = autoQuestions.map(q => q.itemType);
    const result = scoreAutoconcept(autoAnswers, types);

    runWithPermission('edit:avaliacoes', async () => {
      if (editingAuto) {
        const updated = autoconceptRecords.map(r => r.id === editingAuto.id ? {
          ...r,
          studentId: resolvedStudentId,
          studentName: sName,
          score: result.score,
          classification: result.classification,
          technicalOpinion: autoOpinion,
          answers: autoAnswers,
        } : r);
        updateAutoconceptState(updated);
        void ensurePerformanceReport('autoconcept', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: (updated.find(r => r.id === editingAuto.id) ?? {}) as unknown as Record<string, unknown> });
      } else {
        const generatedId = await nextAutoconceptAssessmentId();
        const nextId = generatedId || ('Auto_' + uuid().slice(0, 8));
        const newRec: AutoconceptRecord = {
          id: nextId,
          studentId: resolvedStudentId,
          studentName: sName,
          score: result.score,
          classification: result.classification,
          technicalOpinion: autoOpinion,
          date: new Date().toISOString().split('T')[0],
          answers: autoAnswers,
        };
        updateAutoconceptState([newRec, ...autoconceptRecords]);
        void ensurePerformanceReport('autoconcept', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: newRec as unknown as Record<string, unknown> });
      }
      setShowAutoModal(false);
    });
  };

  const handleDeleteAuto = (id: string, name: string) => {
    setItemToDelete({ type: 'autoconcept', id, studentName: name });
  };

  // --- 8. INDICE ALIMENTAR (IAS) ---
  const handleOpenNewIas = () => {
    setEditingIas(null);
    resetFormStateWithStudent('');
    setIasAnswers(Array(iasQuestions.length).fill(-1));
    setIasResult(null);
    setIasOpinion('');
    setShowIasModal(true);
  };

  const handleEditIas = (rec: IasRecord) => {
    setEditingIas(rec);
    setSelectedStudentId(rec.studentId);
    if (rec.answers && Array.isArray(rec.answers)) {
      const loaded = rec.answers.slice(0, iasQuestions.length);
      while (loaded.length < iasQuestions.length) loaded.push(-1);
      setIasAnswers(loaded);
    } else {
      setIasAnswers(Array(iasQuestions.length).fill(-1));
    }
    setIasResult({ score: rec.totalScore, max: iasQuestions.reduce((m, q) => m + Math.max(q.option1Points, q.option2Points, q.option3Points), 0), classification: rec.classification as IasClassification });
    const match = m12ParecerCache.find(p => p.classification === rec.classification);
    setIasOpinion(rec.technicalOpinion || match?.reflection || '');
    setShowIasModal(true);
  };

  const handleSaveIas = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedStudentId = selectedStudentId;
    if (!resolvedStudentId) {
      alert(t('erroSelecionarAluno'));
      return;
    }
    if (!isCompleteIasAnswers(iasAnswers, iasQuestions)) {
      alert(t('erroResponderIas'));
      return;
    }
    const targetStudentObj = students.find(s => s.id === resolvedStudentId);
    const sName = targetStudentObj ? targetStudentObj.name : ta('colunaAluno');
    const result = scoreIas(iasAnswers, iasQuestions);

    runWithPermission('edit:avaliacoes', async () => {
      if (editingIas) {
        const updated = iasRecords.map(r => r.id === editingIas.id ? {
          ...r,
          studentId: resolvedStudentId,
          studentName: sName,
          totalScore: result.score,
          classification: result.classification,
          technicalOpinion: iasOpinion,
          answers: iasAnswers,
        } : r);
        updateIasState(updated);
        void ensurePerformanceReport('ias', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: (updated.find(r => r.id === editingIas.id) ?? {}) as unknown as Record<string, unknown> });
      } else {
        const generatedId = await nextIasAssessmentId();
        const nextId = generatedId || ('IAS_' + uuid().slice(0, 8));
        const newRec: IasRecord = {
          id: nextId,
          studentId: resolvedStudentId,
          studentName: sName,
          totalScore: result.score,
          classification: result.classification,
          technicalOpinion: iasOpinion,
          date: new Date().toISOString().split('T')[0],
          answers: iasAnswers,
        };
        updateIasState([newRec, ...iasRecords]);
        void ensurePerformanceReport('ias', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: newRec as unknown as Record<string, unknown> });
      }
      setShowIasModal(false);
    });
  };

  const handleDeleteIas = (id: string, name: string) => {
    setItemToDelete({ type: 'ias', id, studentName: name });
  };

  // --- 9. RASTREAMENTO DO TDAH (SNAP-IV) ---
  const handleOpenNewSnap = () => {
    setEditingSnap(null);
    resetFormStateWithStudent('');
    setSnapAnswers(Array(18).fill(-1));
    setSnapResult(null);
    setSnapOpinion('');
    setSnapRespondent('');
    setShowSnapModal(true);
  };

  const handleEditSnap = (rec: SnapRecord) => {
    setEditingSnap(rec);
    setSelectedStudentId(rec.studentId);
    if (rec.answers && Array.isArray(rec.answers)) {
      const loaded = rec.answers.slice(0, 18);
      while (loaded.length < 18) loaded.push(-1);
      setSnapAnswers(loaded);
    } else {
      setSnapAnswers(Array(18).fill(-1));
    }
    setSnapResult({ inattention: rec.inattentionScore, hyperactivity: rec.hyperactivityScore, classification: rec.classification as SnapClassification });
    const match = m13ParecerCache.find(p => p.classification === rec.classification);
    setSnapOpinion(rec.technicalOpinion || match?.reflection || '');
    setSnapRespondent(rec.respondent || '');
    setShowSnapModal(true);
  };

  const handleSaveSnap = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedStudentId = selectedStudentId;
    if (!resolvedStudentId) {
      alert(t('erroSelecionarAluno'));
      return;
    }
    const targetStudentObj = students.find(s => s.id === resolvedStudentId);
    const snapAge = targetStudentObj ? getStudentAgeYears(targetStudentObj.birthDate) : null;
    if (!editingSnap) {
      if (snapAge == null) {
        alert(t('erroNascimentoSnap'));
        return;
      }
      if (snapAge < 5 || snapAge > 17) {
        alert(t('erroIdadeSnap'));
        return;
      }
    }
    if (!snapRespondent) {
      alert(t('erroRespondenteSnap'));
      return;
    }
    if (!isCompleteSnapAnswers(snapAnswers)) {
      alert(t('erroItensSnap'));
      return;
    }
    const sName = targetStudentObj ? targetStudentObj.name : ta('colunaAluno');
    const result = scoreSnap(snapAnswers, snapThresholdForAge(snapAge));

    runWithPermission('edit:avaliacoes', async () => {
      if (editingSnap) {
        const updated = snapRecords.map(r => r.id === editingSnap.id ? {
          ...r,
          studentId: resolvedStudentId,
          studentName: sName,
          inattentionScore: result.inattention,
          hyperactivityScore: result.hyperactivity,
          classification: result.classification,
          technicalOpinion: snapOpinion,
          respondent: snapRespondent,
          answers: snapAnswers,
        } : r);
        updateSnapState(updated);
        void ensurePerformanceReport('snap', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: (updated.find(r => r.id === editingSnap.id) ?? {}) as unknown as Record<string, unknown> });
      } else {
        const generatedId = await nextSnapAssessmentId();
        const nextId = generatedId || ('SNAP_' + uuid().slice(0, 8));
        const newRec: SnapRecord = {
          id: nextId,
          studentId: resolvedStudentId,
          studentName: sName,
          inattentionScore: result.inattention,
          hyperactivityScore: result.hyperactivity,
          classification: result.classification,
          technicalOpinion: snapOpinion,
          respondent: snapRespondent,
          date: new Date().toISOString().split('T')[0],
          answers: snapAnswers,
        };
        updateSnapState([newRec, ...snapRecords]);
        void ensurePerformanceReport('snap', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: newRec as unknown as Record<string, unknown> });
      }
      setShowSnapModal(false);
    });
  };

  const handleDeleteSnap = (id: string, name: string) => {
    setItemToDelete({ type: 'snap', id, studentName: name });
  };

  // --- 10. RASTREAMENTO PRECOCE DO TEA (AQ-10) ---
  const handleOpenNewAq10 = () => {
    setEditingAq10(null);
    resetFormStateWithStudent('');
    setAq10Version('crianca');
    setAq10Answers(Array(10).fill(-1));
    setAq10Result(null);
    setAq10Opinion('');
    setAq10Respondent('');
    setShowAq10Modal(true);
  };

  const handleEditAq10 = (rec: Aq10Record) => {
    setEditingAq10(rec);
    setSelectedStudentId(rec.studentId);
    setAq10Version(rec.version);
    if (rec.answers && Array.isArray(rec.answers)) {
      const loaded = rec.answers.slice(0, 10);
      while (loaded.length < 10) loaded.push(-1);
      setAq10Answers(loaded);
    } else {
      setAq10Answers(Array(10).fill(-1));
    }
    setAq10Result({ totalScore: rec.totalScore, classification: rec.classification as Aq10Classification });
    const match = m14ParecerCache.find(p => p.classification === rec.classification);
    setAq10Opinion(rec.technicalOpinion || match?.reflection || '');
    setAq10Respondent(rec.respondent || '');
    setShowAq10Modal(true);
  };

  const handleSaveAq10 = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedStudentId = selectedStudentId;
    if (!resolvedStudentId) {
      alert(t('erroSelecionarAluno'));
      return;
    }
    if (!aq10Respondent) {
      alert(t('erroRespondenteAq10'));
      return;
    }
    if (!isCompleteAq10Answers(aq10Answers)) {
      alert(t('erroItensAq10'));
      return;
    }
    const targetStudentObj = students.find(s => s.id === resolvedStudentId);
    const sName = targetStudentObj ? targetStudentObj.name : ta('colunaAluno');
    const result = scoreAq10(aq10Answers);
    const resolvedVersion = aq10Version;

    runWithPermission('edit:avaliacoes', async () => {
      if (editingAq10) {
        const updated = aq10Records.map(r => r.id === editingAq10.id ? {
          ...r,
          studentId: resolvedStudentId,
          studentName: sName,
          version: resolvedVersion,
          totalScore: result.totalScore,
          classification: result.classification,
          technicalOpinion: aq10Opinion,
          respondent: aq10Respondent,
          answers: aq10Answers,
        } : r);
        updateAq10State(updated);
        void ensurePerformanceReport('aq10', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: (updated.find(r => r.id === editingAq10.id) ?? {}) as unknown as Record<string, unknown> });
      } else {
        const generatedId = await nextAq10AssessmentId();
        const nextId = generatedId || ('Aq10_' + uuid().slice(0, 8));
        const newRec: Aq10Record = {
          id: nextId,
          studentId: resolvedStudentId,
          studentName: sName,
          version: resolvedVersion,
          totalScore: result.totalScore,
          classification: result.classification,
          technicalOpinion: aq10Opinion,
          respondent: aq10Respondent,
          date: new Date().toISOString().split('T')[0],
          answers: aq10Answers,
        };
        updateAq10State([newRec, ...aq10Records]);
        void ensurePerformanceReport('aq10', { studentId: resolvedStudentId, studentName: sName, studentGrade: targetStudentObj?.grade, record: newRec as unknown as Record<string, unknown> });
      }
      setShowAq10Modal(false);
    });
  };

  const handleDeleteAq10 = (id: string, name: string) => {
    setItemToDelete({ type: 'aq10', id, studentName: name });
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    runWithPermission('delete:avaliacoes', () => {
      const { type, id } = itemToDelete;
      if (type === 'imc') {
        const filtered = imcRecords.filter(r => r.id !== id);
        updateImcState(filtered);
      } else if (type === 'motor') {
        const filtered = motorRecords.filter(r => r.id !== id);
        updateMotorState(filtered);
      } else if (type === 'sport') {
        const filtered = sportRecords.filter(r => r.id !== id);
        updateSportState(filtered);
      } else if (type === 'vocational') {
        const filtered = vocationalRecords.filter(r => r.id !== id);
        updateVocationalState(filtered);
      } else if (type === 'health') {
        const filtered = healthRecords.filter(r => r.id !== id);
        updateHealthState(filtered);
      } else if (type === 'oral') {
        const filtered = oralRecords.filter(r => r.id !== id);
        updateOralState(filtered);
      } else if (type === 'autoconcept') {
        const filtered = autoconceptRecords.filter(r => r.id !== id);
        updateAutoconceptState(filtered);
      } else if (type === 'ias') {
        const filtered = iasRecords.filter(r => r.id !== id);
        updateIasState(filtered);
      } else if (type === 'snap') {
        const filtered = snapRecords.filter(r => r.id !== id);
        updateSnapState(filtered);
      } else if (type === 'aq10') {
        const filtered = aq10Records.filter(r => r.id !== id);
        updateAq10State(filtered);
      } else if (type === 'pcd') {
        const filtered = pcdRecords.filter(r => r.id !== id);
        updatePcdState(filtered);
      }
      setItemToDelete(null);
    });
  };

  // ------------------ FILTER & SEARCH LOGIC ------------------

  const matchesFilters = (studentName: string, studentId?: string) => {
    if (user?.role === 'Aluno') {
      if (!loggedInStudentObj) return false;
      if (studentId) {
        return studentId === loggedInStudentObj.id;
      }
      return studentName.toLowerCase().trim() === loggedInStudentObj.name.toLowerCase().trim();
    }

    // 1. Search name
    const nameMatch = studentName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!nameMatch) return false;

    // If no contract is selected, do not apply local filters (show all)
    if (!contract) return true;

    // find the student to obtain her locality
    const student = students.find(s => 
      (studentId && s.id === studentId) || 
      s.name.toLowerCase() === studentName.toLowerCase() || 
      s.id === studentName
    );

    if (!isUserAdmin && student) {
      if (assignedContracts.length > 0 && (!student.contrato || !assignedContracts.includes(student.contrato.toLowerCase()))) {
        return false;
      }
      if (assignedStates.length > 0 && (!student.estado || !assignedStates.includes(student.estado.toLowerCase()))) {
        return false;
      }
      if (assignedRegions.length > 0 && (!student.regiao || !assignedRegions.includes(student.regiao.toLowerCase()))) {
        return false;
      }
      if (assignedLocalities.length > 0 && (!student.locality || !assignedLocalities.includes(student.locality.toLowerCase()))) {
        return false;
      }
      if (assignedGrades.length > 0 && (!student.grade || !assignedGrades.includes(student.grade.toLowerCase()))) {
        return false;
      }
    }

    const sLoc = (student?.locality || (
      studentName.toLowerCase().includes('arthur') ? 'Centro' :
      studentName.toLowerCase().includes('beatriz') ? 'Zona Sul' :
      studentName.toLowerCase().includes('clara') ? 'Zona Norte' :
      studentName.toLowerCase().includes('gabriel') ? 'Zona Leste' : 'Centro'
    )).toLowerCase().trim();

    if (contract !== 'Todos') {
      const targetContractObj = availableContracts.find(c => c.id === contract);
      if (targetContractObj && student?.contrato && student.contrato !== targetContractObj.name) {
        return false;
      }
    }
    if (stateFilter && stateFilter !== 'Todos') {
      if (student?.estado && student.estado !== stateFilter) {
        return false;
      }
    }
    if (cityFilter && cityFilter !== 'Todos' && cityFilter !== 'Todas') {
      if (student?.regiao && student.regiao !== cityFilter) {
        return false;
      }
    }
    if (localityFilter && localityFilter !== 'Todos') {
      const mLoc = localityFilter.toLowerCase().trim();
      if (sLoc !== mLoc) {
        return false;
      }
    }
    if (selectedGrade && selectedGrade !== 'Todos') {
      const sGrade = student?.grade || (
        studentName.toLowerCase().includes('arthur') ? t('ano3A') :
        studentName.toLowerCase().includes('beatriz') ? t('ano2B') :
        studentName.toLowerCase().includes('gabriel') ? t('ano3A') :
        studentName.toLowerCase().includes('elena') ? t('ano1A') : t('ano3A')
      );
      if (sGrade !== selectedGrade) {
        return false;
      }
    }
    return true;
  };

  const getSubTabMatchedRecords = () => {
    switch (activeSubTab) {
      case 'imc':
        return imcRecords.filter(r => matchesFilters(r.studentName, r.studentId));
      case 'motor':
        return motorRecords.filter(r => matchesFilters(r.studentName, r.studentId));
      case 'sport':
        return sportRecords.filter(r => matchesFilters(r.studentName, r.studentId));
      case 'vocational':
        return vocationalRecords.filter(r => matchesFilters(r.studentName, r.studentId));
      case 'health':
        return healthRecords.filter(r => matchesFilters(r.studentName, r.studentId));
      case 'oral':
        return oralRecords.filter(r => matchesFilters(r.studentName, r.studentId));
      case 'autoconcept':
        return autoconceptRecords.filter(r => matchesFilters(r.studentName, r.studentId));
      case 'ias':
        return iasRecords.filter(r => matchesFilters(r.studentName, r.studentId));
      case 'snap':
        return snapRecords.filter(r => matchesFilters(r.studentName, r.studentId));
      case 'aq10':
        return aq10Records.filter(r => matchesFilters(r.studentName, r.studentId));
      case 'pcd':
        return pcdRecords.filter(r => matchesFilters(r.studentName, r.studentId));
      default:
        return [];
    }
  };

  const exportToExcel = () => {
    const list = getSubTabMatchedRecords();
    let data: Record<string, string | number | undefined>[] = [];
    
    if (activeSubTab === 'imc') {
      data = list.map(item => {
        const itemImc = item as ImcRecord;
        const cls = getImcClass(itemImc.weight, itemImc.height);
        return {
          [t('colunaNomeAluno')]: itemImc.studentName,
          [ta('turma')]: displayValue(itemImc.classGroup || getStudentGrade(students, itemImc.studentId)),
          [t('colunaPesoKg')]: itemImc.weight,
          [t('colunaAlturaM')]: itemImc.height,
          [t('colunaImc')]: itemImc.imc,
          [t('colunaClassificacao')]: displayValue(cls.label),
          [t('colunaData')]: itemImc.date ? itemImc.date.split('-').reverse().join('/') : ''
        };
      });
    } else if (activeSubTab === 'motor') {
      data = list.map(item => {
        const itemMotor = item as MotorRecord;
        return {
          [t('colunaNomeAluno')]: itemMotor.studentName,
          [t('colunaImpulsao')]: itemMotor.impulsao || itemMotor.flexibility,
          [t('colunaAbdomen')]: itemMotor.abdomen || itemMotor.coordination,
          [t('colunaAgilidade')]: itemMotor.agility,
          [t('areaForca')]: itemMotor.strength,
          [t('colunaVelocidade')]: displayValue(itemMotor.speed || 'Excelente'),
          [t('colunaClassificacaoGeral')]: displayValue(itemMotor.generalClass),
          [t('colunaData')]: itemMotor.date ? itemMotor.date.split('-').reverse().join('/') : ''
        };
      });
    } else if (activeSubTab === 'sport') {
      data = list.map(item => {
        const itemSport = item as SportRecord;
        return {
          [t('colunaNomeAluno')]: itemSport.studentName,
          [t('colunaIndiceCorporal')]: displayValue(itemSport.biotype),
          [t('colunaFisicoMotor')]: displayValue(itemSport.mainSkill),
          [t('colunaEsporteSugerido')]: itemSport.suggestedSport,
          [t('colunaRecomendacoes')]: displayValue(itemSport.recommendedPractice),
          [t('colunaData')]: itemSport.date ? itemSport.date.split('-').reverse().join('/') : ''
        };
      });
    } else if (activeSubTab === 'vocational') {
      data = list.map(item => {
        const itemVoc = item as VocationalRecord;
        return {
          [t('colunaNomeAluno')]: itemVoc.studentName,
          [t('colunaPerfilVocacional')]: displayValue(itemVoc.profile),
          [t('colunaAreaInteresse')]: displayValue(itemVoc.interestArea),
          [t('colunaCarreiraSugerida')]: displayValue(itemVoc.suggestedCareer),
          [t('colunaOpiniaoTecnica')]: displayValue(itemVoc.technicalOpinion),
          [t('colunaData')]: itemVoc.date ? itemVoc.date.split('-').reverse().join('/') : ''
        };
      });
    } else if (activeSubTab === 'health') {
      data = list.map(item => {
        const itemH = item as HealthRecord;
        return {
          [t('colunaNomeAluno')]: itemH.studentName,
          [t('colunaEscoreBruto')]: itemH.rawScore,
          [t('colunaEscoreT')]: itemH.tScore,
          [t('colunaClassificacao')]: displayValue(itemH.classification),
          [t('colunaParecer')]: displayValue(itemH.technicalOpinion),
          [t('colunaData')]: itemH.date ? itemH.date.split('-').reverse().join('/') : ''
        };
      });
    } else if (activeSubTab === 'oral') {
      data = list.map(item => {
        const itemO = item as OralRecord;
        return {
          [t('colunaNomeAluno')]: itemO.studentName,
          [t('colunaPontuacao12')]: itemO.score,
          [t('colunaClassificacao')]: displayValue(itemO.classification),
          [t('colunaParecer')]: displayValue(itemO.technicalOpinion),
          [t('colunaData')]: itemO.date ? itemO.date.split('-').reverse().join('/') : ''
        };
      });
    } else if (activeSubTab === 'autoconcept') {
      data = list.map(item => {
        const itemA = item as AutoconceptRecord;
        return {
          [t('colunaNomeAluno')]: itemA.studentName,
          [t('colunaPontuacao30')]: itemA.score,
          [t('colunaClassificacao')]: displayValue(itemA.classification),
          [t('colunaParecer')]: displayValue(itemA.technicalOpinion),
          [t('colunaData')]: itemA.date ? itemA.date.split('-').reverse().join('/') : ''
        };
      });
    } else if (activeSubTab === 'ias') {
      data = list.map(item => {
        const itemI = item as IasRecord;
        return {
          [t('colunaNomeAluno')]: itemI.studentName,
          [t('colunaPontuacao100')]: itemI.totalScore,
          [t('colunaClassificacao')]: displayValue(itemI.classification),
          [t('colunaParecer')]: displayValue(itemI.technicalOpinion),
          [t('colunaData')]: itemI.date ? itemI.date.split('-').reverse().join('/') : ''
        };
      });
    } else if (activeSubTab === 'snap') {
      data = list.map(item => {
        const itemS = item as SnapRecord;
        return {
          [t('colunaNomeAluno')]: itemS.studentName,
          [t('colunaItensClinicosDesatencao')]: itemS.inattentionScore,
          [t('colunaItensClinicosHiperatividade')]: itemS.hyperactivityScore,
          [t('colunaClassificacao')]: displayValue(itemS.classification),
          [t('colunaRespondente')]: displayValue(itemS.respondent || ''),
          [t('colunaParecer')]: displayValue(itemS.technicalOpinion),
          [t('colunaData')]: itemS.date ? itemS.date.split('-').reverse().join('/') : ''
        };
      });
    } else if (activeSubTab === 'aq10') {
      data = list.map(item => {
        const itemA = item as Aq10Record;
        return {
          [t('colunaNomeAluno')]: itemA.studentName,
          [t('colunaVersao')]: itemA.version === 'adolescente' ? t('adolescente12a15') : t('crianca4a11'),
          [t('colunaPontuacao10')]: itemA.totalScore,
          [t('colunaClassificacao')]: displayValue(itemA.classification),
          [t('colunaRespondente')]: displayValue(itemA.respondent || ''),
          [t('colunaParecer')]: displayValue(itemA.technicalOpinion),
          [t('colunaData')]: itemA.date ? itemA.date.split('-').reverse().join('/') : ''
        };
      });
    } else if (activeSubTab === 'pcd') {
      data = list.map(item => {
        const itemP = item as PcdRecord;
        const top = itemP.compatibilidade && itemP.compatibilidade.length > 0 ? itemP.compatibilidade[0].modalidade : '';
        return {
          [t('colunaNomeAluno')]: itemP.studentName,
          [t('colunaGrupoTriagem')]: displayValue(itemP.grupoNome),
          [t('colunaClassificacao')]: displayValue(itemP.detalheClassificacao || '-'),
          [t('colunaPerfil')]: displayValue(itemP.classificacaoPerfil),
          [t('colunaVelocidadeAgilidadeNota')]: itemP.notaVelAgil,
          [t('colunaForcaExplosivaNota')]: itemP.notaForcaExplosiva,
          [t('colunaForcaMembrosSupNota')]: itemP.notaMembrosSup,
          [t('colunaCoreNota')]: itemP.notaCore,
          [t('colunaModalidadeSugerida')]: displayValue(top),
          [t('colunaDirecionamento')]: displayValue(itemP.direcionamento),
          [t('colunaParecer')]: displayValue(itemP.technicalOpinion),
          [t('colunaData')]: itemP.date ? itemP.date.split('-').reverse().join('/') : ''
        };
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${t('avaliacoesLabel')} ${activeSubTab.toUpperCase()}`);
    XLSX.writeFile(workbook, `Avaliacoes_${activeSubTab}_${selectedGrade}.xlsx`);
    const exportTarget: 'imc_assessments' | 'motor_assessments' | 'sport_assessments' | 'vocational_assessments' | 'health_assessments' | 'oral_assessments' | 'autoconcept_assessments' | 'ias_assessments' | 'snap_assessments' | 'aq10_assessments' | 'pcd_assessments' =
      activeSubTab === 'imc' ? 'imc_assessments' :
      activeSubTab === 'motor' ? 'motor_assessments' :
      activeSubTab === 'sport' ? 'sport_assessments' :
      activeSubTab === 'health' ? 'health_assessments' :
      activeSubTab === 'oral' ? 'oral_assessments' :
      activeSubTab === 'autoconcept' ? 'autoconcept_assessments' :
      activeSubTab === 'ias' ? 'ias_assessments' :
      activeSubTab === 'snap' ? 'snap_assessments' :
      activeSubTab === 'aq10' ? 'aq10_assessments' :
      activeSubTab === 'pcd' ? 'pcd_assessments' : 'vocational_assessments';
    logExport(user?.id || 'unknown', user?.role || 'unknown', exportTarget, 'excel', list.length);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    addReportBackground(doc);
    const list = getSubTabMatchedRecords();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(11, 19, 38);
    
    const displayTitles = {
      imc: t('tituloAvaliacoesImc'),
      motor: t('tituloAvaliacoesMotor'),
      sport: t('tituloAvaliacoesEsporte'),
      vocational: t('tituloAvaliacoesVoc'),
      health: t('tituloAvaliacoesSaude'),
      oral: t('tituloAvaliacoesOral'),
      autoconcept: t('tituloAvaliacoesAuto'),
      ias: t('tituloIasCompleto'),
      snap: t('tituloSnapCompleto'),
      aq10: t('tituloAq10Completo'),
      pcd: t('tituloAvaliacoesPcd')
    };

    doc.text(`EDUKYNE - ${displayTitles[activeSubTab]}`, 14, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${t('filtrosLabel')} ${t('turmaLabel')} ${selectedGrade} | ${t('unidadeLabel')} ${localityFilter} | ${t('geradoEmLabel')} ${new Date().toLocaleDateString(locale)}`, 14, 21);
    
    let tableColumn: string[] = [];
    let tableRows: string[][] = [];

    if (activeSubTab === 'imc') {
      tableColumn = [t('colunaNomeAluno'), ta('turma'), t('colunaPesoKg'), t('colunaAlturaM'), t('colunaImc'), t('colunaClassificacao'), t('colunaData')];
      tableRows = list.map(item => {
        const itemImc = item as ImcRecord;
        const cls = getImcClass(itemImc.weight, itemImc.height);
        return [
          itemImc.studentName,
          displayValue(itemImc.classGroup || getStudentGrade(students, itemImc.studentId)),
          itemImc.weight.toString(),
          itemImc.height.toString(),
          itemImc.imc.toString(),
          displayValue(cls.label),
          itemImc.date ? itemImc.date.split('-').reverse().join('/') : ''
        ];
      });
    } else if (activeSubTab === 'motor') {
      tableColumn = [t('colunaNomeAluno'), t('colunaImpulsao'), t('colunaAbdomen'), t('colunaAgilidade'), t('areaForca'), t('colunaVelocidade'), t('colunaGeral'), t('colunaData')];
      tableRows = list.map(item => {
        const itemMotor = item as MotorRecord;
        return [
          itemMotor.studentName ?? '',
          itemMotor.impulsao || itemMotor.flexibility || '',
          itemMotor.abdomen || itemMotor.coordination || '',
          itemMotor.agility ?? '',
          displayValue(itemMotor.strength ?? ''),
          displayValue(itemMotor.speed || 'Excelente'),
          displayValue(itemMotor.generalClass ?? ''),
          itemMotor.date ? itemMotor.date.split('-').reverse().join('/') : ''
        ];
      });
    } else if (activeSubTab === 'sport') {
      tableColumn = [t('colunaNomeAluno'), t('colunaIndiceCorporal'), t('colunaFisicoMotor'), t('colunaSugerido'), t('colunaRecomendacoes'), t('colunaData')];
      tableRows = list.map(item => {
        const itemSport = item as SportRecord;
        return [
          itemSport.studentName,
          displayValue(itemSport.biotype),
          displayValue(itemSport.mainSkill),
          itemSport.suggestedSport,
          displayValue(itemSport.recommendedPractice),
          itemSport.date ? itemSport.date.split('-').reverse().join('/') : ''
        ];
      });
    } else if (activeSubTab === 'vocational') {
      tableColumn = [t('colunaNomeAluno'), t('colunaPerfil'), t('colunaAreaInteresse'), t('colunaCarreira'), t('colunaData')];
      tableRows = list.map(item => {
        const itemVoc = item as VocationalRecord;
        return [
          itemVoc.studentName,
          itemVoc.profile,
          itemVoc.interestArea,
          itemVoc.suggestedCareer,
          itemVoc.date ? itemVoc.date.split('-').reverse().join('/') : ''
        ];
      });
    } else if (activeSubTab === 'health') {
      tableColumn = [t('colunaNomeAluno'), t('colunaEscoreBruto'), t('colunaEscoreT'), t('colunaClassificacao'), t('colunaData')];
      tableRows = list.map(item => {
        const itemH = item as HealthRecord;
        return [
          itemH.studentName,
          String(itemH.rawScore),
          String(itemH.tScore),
          displayValue(itemH.classification),
          itemH.date ? itemH.date.split('-').reverse().join('/') : ''
        ];
      });
    } else if (activeSubTab === 'oral') {
      tableColumn = [t('colunaNomeAluno'), t('colunaPontuacao12'), t('colunaClassificacao'), t('colunaData')];
      tableRows = list.map(item => {
        const itemO = item as OralRecord;
        return [
          itemO.studentName,
          String(itemO.score),
          displayValue(itemO.classification),
          itemO.date ? itemO.date.split('-').reverse().join('/') : ''
        ];
      });
    } else if (activeSubTab === 'autoconcept') {
      tableColumn = [t('colunaNomeAluno'), t('colunaPontuacao30'), t('colunaClassificacao'), t('colunaData')];
      tableRows = list.map(item => {
        const itemA = item as AutoconceptRecord;
        return [
          itemA.studentName,
          String(itemA.score),
          displayValue(itemA.classification),
          itemA.date ? itemA.date.split('-').reverse().join('/') : ''
        ];
      });
    } else if (activeSubTab === 'ias') {
      tableColumn = [t('colunaNomeAluno'), t('colunaPontuacao100'), t('colunaClassificacao'), t('colunaData')];
      tableRows = list.map(item => {
        const itemI = item as IasRecord;
        return [
          itemI.studentName,
          String(itemI.totalScore),
          displayValue(itemI.classification),
          itemI.date ? itemI.date.split('-').reverse().join('/') : ''
        ];
      });
    } else if (activeSubTab === 'snap') {
      tableColumn = [t('colunaNomeAluno'), t('colunaDesatencao'), t('colunaHiperImpulsividade'), t('colunaClassificacao'), t('colunaRespondente'), t('colunaData')];
      tableRows = list.map(item => {
        const itemS = item as SnapRecord;
        return [
          itemS.studentName,
          String(itemS.inattentionScore),
          String(itemS.hyperactivityScore),
          displayValue(itemS.classification),
          displayValue(itemS.respondent || ''),
          itemS.date ? itemS.date.split('-').reverse().join('/') : ''
        ];
      });
    } else if (activeSubTab === 'aq10') {
      tableColumn = [t('colunaNomeAluno'), t('colunaVersao'), t('colunaPontuacao10'), t('colunaClassificacao'), t('colunaRespondente'), t('colunaData')];
      tableRows = list.map(item => {
        const itemA = item as Aq10Record;
        return [
          itemA.studentName,
          itemA.version === 'adolescente' ? t('adolescente12a15') : t('crianca4a11'),
          String(itemA.totalScore),
          displayValue(itemA.classification),
          displayValue(itemA.respondent || ''),
          itemA.date ? itemA.date.split('-').reverse().join('/') : ''
        ];
      });
    } else if (activeSubTab === 'pcd') {
      tableColumn = [t('colunaNomeAluno'), t('colunaGrupo'), t('colunaPerfil'), t('colunaVelAgil'), t('colunaForcaExpl'), t('colunaMembrosSup'), t('colunaCore'), t('colunaModalidadeSugerida'), t('colunaData')];
      tableRows = list.map(item => {
        const itemP = item as PcdRecord;
        const top = itemP.compatibilidade && itemP.compatibilidade.length > 0 ? itemP.compatibilidade[0].modalidade : '';
        return [
          itemP.studentName,
          displayValue(itemP.grupoNome) || `${t('colunaGrupo')} ${itemP.grupo}`,
          displayValue(itemP.classificacaoPerfil),
          String(itemP.notaVelAgil),
          String(itemP.notaForcaExplosiva),
          String(itemP.notaMembrosSup),
          String(itemP.notaCore),
          top,
          itemP.date ? itemP.date.split('-').reverse().join('/') : ''
        ];
      });
    }

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: [56, 189, 248], textColor: [0, 30, 44], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addReportBackground(doc);
        }
      }
    });
    
    doc.save(`Avaliacoes_${activeSubTab}_${selectedGrade}.pdf`);
    const pdfExportTarget: 'imc_assessments' | 'motor_assessments' | 'sport_assessments' | 'vocational_assessments' | 'health_assessments' | 'oral_assessments' | 'autoconcept_assessments' | 'ias_assessments' | 'snap_assessments' | 'aq10_assessments' | 'pcd_assessments' =
      activeSubTab === 'imc' ? 'imc_assessments' :
      activeSubTab === 'motor' ? 'motor_assessments' :
      activeSubTab === 'sport' ? 'sport_assessments' :
      activeSubTab === 'health' ? 'health_assessments' :
      activeSubTab === 'oral' ? 'oral_assessments' :
      activeSubTab === 'autoconcept' ? 'autoconcept_assessments' :
      activeSubTab === 'ias' ? 'ias_assessments' :
      activeSubTab === 'snap' ? 'snap_assessments' :
      activeSubTab === 'aq10' ? 'aq10_assessments' :
      activeSubTab === 'pcd' ? 'pcd_assessments' : 'vocational_assessments';
    logExport(user?.id || 'unknown', user?.role || 'unknown', pdfExportTarget, 'pdf', list.length);
  };

  const exportAllStudentDataToPDF = () => {
    const doc = new jsPDF();
    addReportBackground(doc);
    const studentName = loggedInStudentObj?.name || user?.name || t('palavraEstudante');
    const studentGrade = displayValue(loggedInStudentObj?.grade || t('NaoInformada'));
    const schoolUnit = displayValue(loggedInStudentObj?.locality || t('NaoInformada'));
    
    // Header Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(11, 19, 38);
    doc.text(t('relatorioTitulo'), 14, 20);
    
    // Sub-header details
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${t('alunoLabel')} ${studentName}`, 14, 28);
    doc.text(`${t('turmaLabel')} ${studentGrade} | ${t('unidadeLabel')} ${schoolUnit}`, 14, 34);
    doc.text(`${t('dataEmissaoLabel')} ${new Date().toLocaleDateString(locale)}`, 14, 40);
    
    let currentY = 46;

    // 1. IMC Section
    const studentImc = imcRecords.filter(r => matchesFilters(r.studentName, r.studentId));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(56, 189, 248);
    doc.text(t('relatorioSecaoImc'), 14, currentY);
    currentY += 4;

    const imcColumns = [t('colunaDataRegistro'), t('colunaPesoKg'), t('colunaAlturaM'), t('colunaImcCalculado'), t('colunaClassificacao')];
    const imcRows = studentImc.map(rec => {
      const statusVal = getImcClass(rec.weight, rec.height);
      return [
        rec.date || '',
        `${rec.weight} ${t('unidadeKg')}`,
        `${rec.height} ${t('unidadeM')}`,
        rec.imc?.toString() || '',
        displayValue(statusVal.label)
      ];
    });

    autoTable(doc, {
      head: [imcColumns],
      body: imcRows.length > 0 ? imcRows : [[t('vazioImcTabela'), "", "", "", ""]],
      startY: currentY,
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: [56, 189, 248], textColor: [0, 30, 44], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addReportBackground(doc);
        }
      }
    });
    
    currentY = (doc as unknown as JsPdfWithAutoTable).lastAutoTable.finalY + 12;

    if (currentY > 250) {
      doc.addPage();
      addReportBackground(doc);
      currentY = 20;
    }

    // 2. Qualidade Motora Section
    const studentMotor = motorRecords.filter(r => matchesFilters(r.studentName, r.studentId));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(56, 189, 248);
    doc.text(t('relatorioSecaoMotor'), 14, currentY);
    currentY += 4;

    const motorColumns = [t('colunaAferidoEm'), t('colunaImpulsao'), t('colunaAbdomen'), t('colunaAgilidade'), t('colunaForcaMuscular'), t('colunaVelocidade'), t('colunaGeral')];
    const motorRows = studentMotor.map(rec => [
      rec.date || '',
      rec.impulsao || rec.flexibility || '',
      rec.abdomen || rec.coordination || '',
      rec.agility || '',
      displayValue(rec.strength || ''),
      displayValue(rec.speed || 'Excelente'),
      displayValue(rec.generalClass || '')
    ]);

    autoTable(doc, {
      head: [motorColumns],
      body: motorRows.length > 0 ? motorRows : [[t('vazioMotorTabela'), "", "", "", "", "", ""]],
      startY: currentY,
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: [56, 189, 248], textColor: [0, 30, 44], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addReportBackground(doc);
        }
      }
    });

    currentY = (doc as unknown as JsPdfWithAutoTable).lastAutoTable.finalY + 12;

    if (currentY > 250) {
      doc.addPage();
      addReportBackground(doc);
      currentY = 20;
    }

    // 3. Esporte Indicado Section
    const studentSport = sportRecords.filter(r => matchesFilters(r.studentName, r.studentId));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(56, 189, 248);
    doc.text(t('relatorioSecaoEsporte'), 14, currentY);
    currentY += 4;

    const sportColumns = [t('colunaDataIndicacao'), t('colunaIndiceCorporal'), t('colunaFisicoMotor'), t('colunaEsporteSugerido'), t('colunaRecomendacoes')];
    const sportRows = studentSport.map(rec => [
      rec.date || '',
      displayValue(rec.biotype || ''),
      displayValue(rec.mainSkill || ''),
      rec.suggestedSport || '',
      displayValue(rec.recommendedPractice || '')
    ]);

    autoTable(doc, {
      head: [sportColumns],
      body: sportRows.length > 0 ? sportRows : [[t('vazioEsportePdf'), "", "", "", ""]],
      startY: currentY,
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: [56, 189, 248], textColor: [0, 30, 44], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addReportBackground(doc);
        }
      }
    });

    currentY = (doc as unknown as JsPdfWithAutoTable).lastAutoTable.finalY + 12;

    if (currentY > 250) {
      doc.addPage();
      addReportBackground(doc);
      currentY = 20;
    }

    // 4. Vocacionamento Section
    const studentVocational = vocationalRecords.filter(r => matchesFilters(r.studentName, r.studentId));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(56, 189, 248);
    doc.text(t('relatorioSecaoVoc'), 14, currentY);
    currentY += 4;

    const vocationalColumns = [t('colunaAferidoEm'), t('colunaPerfilDominante'), t('colunaAreaInteresse'), t('colunaCarreiraIndicada'), t('colunaParecerOrientador')];
    const vocationalRows = studentVocational.map(rec => [
      rec.date || '',
      displayValue(rec.profile || ''),
      displayValue(rec.interestArea || ''),
      displayValue(rec.suggestedCareer || ''),
      displayValue(rec.technicalOpinion || '')
    ]);

    autoTable(doc, {
      head: [vocationalColumns],
      body: vocationalRows.length > 0 ? vocationalRows : [[t('vazioVocPdf'), "", "", "", ""]],
      startY: currentY,
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: [56, 189, 248], textColor: [0, 30, 44], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addReportBackground(doc);
        }
      }
    });

    const cleanFileName = studentName.replace(/\s+/g, '_');
    doc.save(`Avaliacoes_Consolidadas_${cleanFileName}.pdf`);
    logExport(user?.id || 'unknown', user?.role || 'unknown', 'vocational_assessments', 'pdf', studentVocational.length);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Title Grid Card */}
      <section className="bg-[#171f33]/60 border border-[#3e484f]/20 rounded-xl p-6 text-center shadow-lg backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#38bdf8]/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        <Award className="w-8 h-8 text-[#38bdf8] mx-auto mb-2.5 animate-pulse" />
        <h2 className="text-xl font-bold text-[#dae2fd]">{t('moduloTitulo')}</h2>
      </section>

      {/* FILTER PANEL - MATCHING DASHBOARD EXACTLY */}
      {user?.role !== 'Aluno' && (
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
                <label className="text-xs font-semibold text-[#bdc8d1]/90">{ta('contrato')}</label>
                {!isUserAdmin && assignedContracts.length === 1 && (
                  <Lock className="w-2.5 h-2.5 text-amber-400 ml-1" />
                )}
              </div>
              <select 
                value={contract}
                onChange={(e) => {
                  setContract(e.target.value || 'Todos');
                  setStateFilter('Todos');
                  setCityFilter('Todos');
                  setLocalityFilter('Todos');
                  setSelectedGrade('Todos');
                }}
                disabled={isHydrating || isContractLocked}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed font-sans"
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
                    <Lock className="w-2.5 h-2.5 text-amber-400 ml-1" />
                  </span>
                )}
              </div>
              <select 
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value || 'Todos');
                  setCityFilter('Todos');
                  setLocalityFilter('Todos');
                  setSelectedGrade('Todos');
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
                  <Lock className="w-2.5 h-2.5 text-amber-400 ml-1" />
                )}
              </div>
              <select 
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value || 'Todos');
                  setLocalityFilter('Todos');
                  setSelectedGrade('Todos');
                }}
                disabled={isHydrating || isRegionLocked}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed font-sans"
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
                  <Lock className="w-2.5 h-2.5 text-amber-400 ml-1" />
                )}
              </div>
              <select 
                value={localityFilter}
                onChange={(e) => {
                  setLocalityFilter(e.target.value || 'Todos');
                  setSelectedGrade('Todos');
                }}
                disabled={isHydrating || isLocalityLocked}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed font-sans"
              >
                <option value="Todos">{ta('todasLocalidades')}</option>
                {availableLocalities.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Série/Turma */}
            <div className="flex flex-col gap-1.5 font-sans">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-[#bdc8d1]/90">{ta('serieTurma')}</label>
                {!isUserAdmin && assignedGrades.length === 1 && (
                  <Lock className="w-2.5 h-2.5 text-amber-400 ml-1" />
                )}
              </div>
              <select 
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value || 'Todos')}
                disabled={isHydrating || isGradeLocked}
                className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed font-sans"
              >
                <option value="Todos">{ta('todasTurmas')}</option>
                {availableGrades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

      {user?.role === 'Aluno' ? (
        <div className="space-y-8 animate-fade-in font-sans">
          {/* Welcome Alert banner */}
          <div className="p-5 bg-[#38bdf8]/10 border border-[#38bdf8]/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[#dae2fd]">{t('ola')} {loggedInStudentObj?.name || user?.name || t('palavraEstudante')}!</h4>
              <p className="text-xs text-[#bdc8d1]/80 leading-relaxed">
                {t('boasVindasTexto')}
              </p>
            </div>

            <button
              onClick={exportAllStudentDataToPDF}
              className="px-4 py-2 bg-[#f43f5e] hover:bg-[#e11d48] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer text-center shrink-0 self-start sm:self-center"
              title={t('exportarTodasPdfTitle')}
            >
              <FileText className="w-4 h-4" />
              <span>{t('exportarPdfCompleto')}</span>
            </button>
          </div>

          {/* 1. Índice de Massa Corporal (IMC) */}
          <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl overflow-hidden shadow-xl space-y-4 p-5">
            <div className="flex items-center gap-2 border-b border-[#3e484f]/25 pb-3">
              <Heart className="w-5 h-5 text-rose-400" />
              <h3 className="text-sm font-bold text-[#dae2fd]">{t('tituloImc')}</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaDataRegistro')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaPeso')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaAltura')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaImc')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaClassificacao')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3e484f]/20">
                  {imcRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#bdc8d1]/50 text-xs">
                        {t('vazioImcUsuario')}
                      </td>
                    </tr>
                  ) : (
                    imcRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => {
                      const statusVal = getImcClass(rec.weight, rec.height);
                      return (
                        <tr key={rec.id} className="hover:bg-[#131b2e]/40 transition-all text-xs">
                          <td className="px-6 py-3.5 text-[#bdc8d1]">{formatDateBR(rec.date)}</td>
                          <td className="px-6 py-3.5 text-center text-white font-semibold">{rec.weight} {t('unidadeKg')}</td>
                          <td className="px-6 py-3.5 text-center text-white font-semibold">{rec.height} {t('unidadeM')}</td>
                          <td className="px-6 py-3.5 text-center font-bold text-[#38bdf8] font-mono">{rec.imc}</td>
                          <td className="px-6 py-3.5">
                            <span className={`text-[10px] font-bold ${statusVal.color}`}>
                              {displayValue(statusVal.label)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Qualidade Motora */}
          <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl overflow-hidden shadow-xl space-y-4 p-5">
            <div className="flex items-center gap-2 border-b border-[#3e484f]/25 pb-3">
              <Award className="w-5 h-5 text-[#38bdf8]" />
              <h3 className="text-sm font-bold text-[#dae2fd]">{t('tituloMotor')}</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[820px]">
                <thead>
                  <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaAferidoEm')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaImpulsao')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaAbdomen')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaAgilidade')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaForcaMuscular')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaVelocidade')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaGeral')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3e484f]/20">
                  {motorRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-[#bdc8d1]/50 text-xs">
                        {t('vazioMotorUsuario')}
                      </td>
                    </tr>
                  ) : (
                    motorRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => {
                      const motorBadgeColor = 
                        rec.generalClass === 'Excelente' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        rec.generalClass === 'Bom' ? 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20' :
                        rec.generalClass === 'Regular' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20';

                      return (
                        <tr key={rec.id} className="hover:bg-[#131b2e]/40 transition-all text-xs">
                          <td className="px-6 py-3.5 text-[#bdc8d1]">{formatDateBR(rec.date)}</td>
                          <td className="px-6 py-3.5 text-center text-white">{rec.impulsao || rec.flexibility}</td>
                          <td className="px-6 py-3.5 text-center text-white">{rec.abdomen || rec.coordination}</td>
                          <td className="px-6 py-3.5 text-center text-white">{rec.agility}</td>
                          <td className="px-6 py-3.5 text-center text-white">{rec.strength}</td>
                          <td className="px-6 py-3.5 text-center text-white">{displayValue(rec.speed || 'Excelente')}</td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${motorBadgeColor}`}>
                              {rec.generalClass}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Esporte Indicado */}
          <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl overflow-hidden shadow-xl space-y-4 p-5">
            <div className="flex items-center gap-2 border-b border-[#3e484f]/25 pb-3">
              <Target className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-[#dae2fd]">{t('tituloEsporte')}</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaDataIndicacao')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaIndiceCorporal')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaFisicoMotor')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaEsporteSugerido')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaRecomendacoes')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3e484f]/20">
                  {sportRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#bdc8d1]/50 text-xs">
                        {t('vazioEsporteUsuario')}
                      </td>
                    </tr>
                  ) : (
                    sportRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#131b2e]/40 transition-all text-xs">
                        <td className="px-6 py-3.5 text-[#bdc8d1]">{formatDateBR(rec.date)}</td>
                        <td className="px-6 py-3.5">
                          <span className="px-2 py-0.5 rounded bg-[#1e293b] border border-[#3e484f]/30 text-[#dae2fd] font-medium">
                            {displayValue(rec.biotype)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[#bdc8d1] font-medium">{displayValue(rec.mainSkill)}</td>
                        <td className="px-6 py-3.5 font-bold text-[#38bdf8] flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-[#38bdf8]" />
                          <span>{rec.suggestedSport}</span>
                        </td>
                        <td className="px-6 py-3.5 text-[#dae2fd]">{displayValue(rec.recommendedPractice)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Vocacionamento */}
          <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl overflow-hidden shadow-xl space-y-4 p-5">
            <div className="flex items-center gap-2 border-b border-[#3e484f]/25 pb-3">
              <Compass className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-[#dae2fd]">{t('tituloVocacional')}</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaAferidoEm')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaPerfilDominante')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaAreaInteresse')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaCarreiraIndicada')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaParecerOrientador')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3e484f]/20">
                  {vocationalRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#bdc8d1]/50 text-xs">
                        {t('vazioVocacionalUsuario')}
                      </td>
                    </tr>
                  ) : (
                    vocationalRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#131b2e]/40 transition-all text-xs">
                        <td className="px-6 py-3.5 text-[#bdc8d1]">{formatDateBR(rec.date)}</td>
                        <td className="px-6 py-3.5 font-bold text-[#38bdf8] text-xs">{displayValue(rec.profile)}</td>
                        <td className="px-6 py-3.5 text-[#dae2fd]">{displayValue(rec.interestArea)}</td>
                        <td className="px-6 py-3.5 font-bold text-[#8ed5ff]">{rec.suggestedCareer}</td>
                        <td className="px-6 py-3.5 text-[#bdc8d1] max-w-sm whitespace-pre-wrap">{displayValue(rec.technicalOpinion)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Saúde Global */}
          <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl overflow-hidden shadow-xl space-y-4 p-5">
            <div className="flex items-center gap-2 border-b border-[#3e484f]/25 pb-3">
              <HeartPulse className="w-5 h-5 text-rose-400" />
              <h3 className="text-sm font-bold text-[#dae2fd]">{t('tituloSaude')}</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaAferidoEm')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaEscoreBruto')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaEscoreT')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaClassificacao')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaParecer')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3e484f]/20">
                  {healthRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#bdc8d1]/50 text-xs">
                        {t('vazioSaudeUsuario')}
                      </td>
                    </tr>
                  ) : (
                    healthRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#131b2e]/40 transition-all text-xs">
                        <td className="px-6 py-3.5 text-[#bdc8d1]">{formatDateBR(rec.date)}</td>
                        <td className="px-6 py-3.5 text-[#dae2fd]">{rec.rawScore}</td>
                        <td className="px-6 py-3.5 text-[#dae2fd]">{Number(rec.tScore).toFixed(2)}</td>
                        <td className="px-6 py-3.5 font-bold text-[#38bdf8] text-xs">{displayValue(rec.classification)}</td>
                        <td className="px-6 py-3.5 text-[#bdc8d1] max-w-sm whitespace-pre-wrap">{displayValue(rec.technicalOpinion)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. Higiene Bucal */}
          <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl overflow-hidden shadow-xl space-y-4 p-5">
            <div className="flex items-center gap-2 border-b border-[#3e484f]/25 pb-3">
              <Smile className="w-5 h-5 text-sky-400" />
              <h3 className="text-sm font-bold text-[#dae2fd]">{t('tituloOral')}</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaAferidoEm')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaPontuacao12')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaClassificacao')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaParecer')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3e484f]/20">
                  {oralRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-[#bdc8d1]/50 text-xs">
                        {t('vazioOralUsuario')}
                      </td>
                    </tr>
                  ) : (
                    oralRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#131b2e]/40 transition-all text-xs">
                        <td className="px-6 py-3.5 text-[#bdc8d1]">{formatDateBR(rec.date)}</td>
                        <td className="px-6 py-3.5 text-[#dae2fd]">{rec.score}</td>
                        <td className="px-6 py-3.5 font-bold text-[#38bdf8] text-xs">{displayValue(rec.classification)}</td>
                        <td className="px-6 py-3.5 text-[#bdc8d1] max-w-sm whitespace-pre-wrap">{displayValue(rec.technicalOpinion)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 7. Autoconceito */}
          <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl overflow-hidden shadow-xl space-y-4 p-5">
            <div className="flex items-center gap-2 border-b border-[#3e484f]/25 pb-3">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <h3 className="text-sm font-bold text-[#dae2fd]">{t('tituloAuto')}</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaAferidoEm')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaPontuacao30')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaClassificacao')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaParecer')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3e484f]/20">
                  {autoconceptRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-[#bdc8d1]/50 text-xs">
                        {t('vazioAutoUsuario')}
                      </td>
                    </tr>
                  ) : (
                    autoconceptRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#131b2e]/40 transition-all text-xs">
                        <td className="px-6 py-3.5 text-[#bdc8d1]">{formatDateBR(rec.date)}</td>
                        <td className="px-6 py-3.5 text-[#dae2fd]">{rec.score}</td>
                        <td className="px-6 py-3.5 font-bold text-[#38bdf8] text-xs">{displayValue(rec.classification)}</td>
                        <td className="px-6 py-3.5 text-[#bdc8d1] max-w-sm whitespace-pre-wrap">{displayValue(rec.technicalOpinion)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 8. Índice Alimentar */}
          <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl overflow-hidden shadow-xl space-y-4 p-5">
            <div className="flex items-center gap-2 border-b border-[#3e484f]/25 pb-3">
              <Apple className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-[#dae2fd]">{t('tituloIas')}</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaAferidoEm')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaPontuacao100')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaClassificacao')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaParecer')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3e484f]/20">
                  {iasRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-[#bdc8d1]/50 text-xs">
                        {t('vazioIasUsuario')}
                      </td>
                    </tr>
                  ) : (
                    iasRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#131b2e]/40 transition-all text-xs">
                        <td className="px-6 py-3.5 text-[#bdc8d1]">{formatDateBR(rec.date)}</td>
                        <td className="px-6 py-3.5 text-[#dae2fd]">{rec.totalScore}</td>
                        <td className="px-6 py-3.5 font-bold text-[#38bdf8] text-xs">{displayValue(rec.classification)}</td>
                        <td className="px-6 py-3.5 text-[#bdc8d1] max-w-sm whitespace-pre-wrap">{displayValue(rec.technicalOpinion)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 9. Rastreamento do TDAH (SNAP-IV) */}
          <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl overflow-hidden shadow-xl space-y-4 p-5">
            <div className="flex items-center gap-2 border-b border-[#3e484f]/25 pb-3">
              <Brain className="w-5 h-5 text-violet-400" />
              <h3 className="text-sm font-bold text-[#dae2fd]">{t('tituloSnap')}</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[820px]">
                <thead>
                  <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaAferidoEm')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaDesatencao')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaHiperImpulsividade')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaRelatoDe')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaClassificacao')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaParecer')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3e484f]/20">
                  {snapRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-[#bdc8d1]/50 text-xs">
                        {t('vazioSnapUsuario')}
                      </td>
                    </tr>
                  ) : (
                    snapRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#131b2e]/40 transition-all text-xs">
                        <td className="px-6 py-3.5 text-[#bdc8d1]">{formatDateBR(rec.date)}</td>
                        <td className="px-6 py-3.5 text-[#dae2fd]">{rec.inattentionScore}</td>
                        <td className="px-6 py-3.5 text-[#dae2fd]">{rec.hyperactivityScore}</td>
                        <td className="px-6 py-3.5 text-[#bdc8d1]">{rec.respondent || '—'}</td>
                        <td className="px-6 py-3.5 font-bold text-[#38bdf8] text-xs">{displayValue(rec.classification)}</td>
                        <td className="px-6 py-3.5 text-[#bdc8d1] max-w-sm whitespace-pre-wrap">{displayValue(rec.technicalOpinion)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-[#bdc8d1]/50 italic">{t('notaSnapCurta')}</p>
          </div>

          {/* 10. Rastreamento Precoce do TEA (AQ-10) */}
          <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl overflow-hidden shadow-xl space-y-4 p-5">
            <div className="flex items-center gap-2 border-b border-[#3e484f]/25 pb-3">
              <Brain className="w-5 h-5 text-fuchsia-400" />
              <h3 className="text-sm font-bold text-[#dae2fd]">{t('tituloAq10')}</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[820px]">
                <thead>
                  <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaAferidoEm')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaVersao')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaPontuacao10')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaRelatoDe')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaClassificacao')}</th>
                    <th className="px-6 py-3 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaParecer')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3e484f]/20">
                  {aq10Records.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-[#bdc8d1]/50 text-xs">
                        {t('vazioAq10Usuario')}
                      </td>
                    </tr>
                  ) : (
                    aq10Records.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#131b2e]/40 transition-all text-xs">
                        <td className="px-6 py-3.5 text-[#bdc8d1]">{formatDateBR(rec.date)}</td>
                        <td className="px-6 py-3.5 text-[#dae2fd]">{AQ10_VERSION_LABELS[rec.version]}</td>
                        <td className="px-6 py-3.5 text-center text-[#dae2fd]">{rec.totalScore}</td>
                        <td className="px-6 py-3.5 text-[#bdc8d1]">{rec.respondent || '—'}</td>
                        <td className="px-6 py-3.5 font-bold text-[#38bdf8] text-xs">{displayValue(rec.classification)}</td>
                        <td className="px-6 py-3.5 text-[#bdc8d1] max-w-sm whitespace-pre-wrap">{displayValue(rec.technicalOpinion)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-[#bdc8d1]/50 italic">{t('notaAq10Curta')}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Sub-Navigation Tabs and Quick Controls */}
          <div className="flex border-b border-[#3e484f]/20 pb-0.5 justify-start gap-1 overflow-x-auto">
            <button
              onClick={() => { setActiveSubTab('imc'); setSearchQuery(''); }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t-2 ${
                activeSubTab === 'imc'
                  ? 'bg-[#171f33] text-[#38bdf8] border-[#38bdf8] shadow-md shadow-[#38bdf8]/5'
                  : 'text-[#bdc8d1]/70 hover:text-[#dae2fd] border-transparent hover:bg-[#131b2e]/40'
              }`}
            >
              {t('tituloImc')}
            </button>

            <button
              onClick={() => { setActiveSubTab('motor'); setSearchQuery(''); }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t-2 ${
                activeSubTab === 'motor'
                  ? 'bg-[#171f33] text-[#38bdf8] border-[#38bdf8] shadow-md shadow-[#38bdf8]/5'
                  : 'text-[#bdc8d1]/70 hover:text-[#dae2fd] border-transparent hover:bg-[#131b2e]/40'
              }`}
            >
              {t('tituloMotor')}
            </button>

            <button
              onClick={() => { setActiveSubTab('sport'); setSearchQuery(''); }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t-2 ${
                activeSubTab === 'sport'
                  ? 'bg-[#171f33] text-[#38bdf8] border-[#38bdf8] shadow-md shadow-[#38bdf8]/5'
                  : 'text-[#bdc8d1]/70 hover:text-[#dae2fd] border-transparent hover:bg-[#131b2e]/40'
              }`}
            >
              {t('tituloEsporte')}
            </button>

            <button
              onClick={() => { setActiveSubTab('vocational'); setSearchQuery(''); }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t-2 ${
                activeSubTab === 'vocational'
                  ? 'bg-[#171f33] text-[#38bdf8] border-[#38bdf8] shadow-md shadow-[#38bdf8]/5'
                  : 'text-[#bdc8d1]/70 hover:text-[#dae2fd] border-transparent hover:bg-[#131b2e]/40'
              }`}
            >
              {t('tituloVocacional')}
            </button>

            <button
              onClick={() => { setActiveSubTab('health'); setSearchQuery(''); }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t-2 ${
                activeSubTab === 'health'
                  ? 'bg-[#171f33] text-[#38bdf8] border-[#38bdf8] shadow-md shadow-[#38bdf8]/5'
                  : 'text-[#bdc8d1]/70 hover:text-[#dae2fd] border-transparent hover:bg-[#131b2e]/40'
              }`}
            >
              {t('tituloSaude')}
            </button>

            <button
              onClick={() => { setActiveSubTab('pcd'); setSearchQuery(''); }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t-2 ${
                activeSubTab === 'pcd'
                  ? 'bg-[#171f33] text-[#38bdf8] border-[#38bdf8] shadow-md shadow-[#38bdf8]/5'
                  : 'text-[#bdc8d1]/70 hover:text-[#dae2fd] border-transparent hover:bg-[#131b2e]/40'
              }`}
            >
              {t('tituloPcd')}
            </button>

            <button
              onClick={() => { setActiveSubTab('oral'); setSearchQuery(''); }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t-2 ${
                activeSubTab === 'oral'
                  ? 'bg-[#171f33] text-[#38bdf8] border-[#38bdf8] shadow-md shadow-[#38bdf8]/5'
                  : 'text-[#bdc8d1]/70 hover:text-[#dae2fd] border-transparent hover:bg-[#131b2e]/40'
              }`}
            >
              {t('tituloOral')}
            </button>

            <button
              onClick={() => { setActiveSubTab('autoconcept'); setSearchQuery(''); }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t-2 ${
                activeSubTab === 'autoconcept'
                  ? 'bg-[#171f33] text-[#38bdf8] border-[#38bdf8] shadow-md shadow-[#38bdf8]/5'
                  : 'text-[#bdc8d1]/70 hover:text-[#dae2fd] border-transparent hover:bg-[#131b2e]/40'
              }`}
            >
              {t('tituloAuto')}
            </button>

            <button
              onClick={() => { setActiveSubTab('ias'); setSearchQuery(''); }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t-2 ${
                activeSubTab === 'ias'
                  ? 'bg-[#171f33] text-[#38bdf8] border-[#38bdf8] shadow-md shadow-[#38bdf8]/5'
                  : 'text-[#bdc8d1]/70 hover:text-[#dae2fd] border-transparent hover:bg-[#131b2e]/40'
              }`}
            >
              {t('tituloIas')}
            </button>

            <button
              onClick={() => { setActiveSubTab('snap'); setSearchQuery(''); }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t-2 ${
                activeSubTab === 'snap'
                  ? 'bg-[#171f33] text-[#38bdf8] border-[#38bdf8] shadow-md shadow-[#38bdf8]/5'
                  : 'text-[#bdc8d1]/70 hover:text-[#dae2fd] border-transparent hover:bg-[#131b2e]/40'
              }`}
            >
              {t('tituloSnapCurto')}
            </button>

            <button
              onClick={() => { setActiveSubTab('aq10'); setSearchQuery(''); }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t-2 ${
                activeSubTab === 'aq10'
                  ? 'bg-[#171f33] text-[#38bdf8] border-[#38bdf8] shadow-md shadow-[#38bdf8]/5'
                  : 'text-[#bdc8d1]/70 hover:text-[#dae2fd] border-transparent hover:bg-[#131b2e]/40'
              }`}
            >
              {t('tituloAq10Curto')}
            </button>
          </div>

          {/* Dynamic Ribbon Controls Search & Create Action Button */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#171f33]/40 border border-[#3e484f]/25 p-4 rounded-xl">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
              {user?.role !== 'Aluno' && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#87929a]" />
                  <input 
                    type="text"
                    placeholder={t('pesquisarAluno')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#3e484f]/60 rounded-xl pl-9 pr-4 py-2 text-xs text-[#dae2fd] placeholder-[#87929a] focus:ring-1 focus:ring-[#38bdf8] outline-none"
                  />
                </div>
              )}

              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={exportToExcel}
                  disabled={getSubTabMatchedRecords().length === 0}
                  className="w-full sm:w-auto px-3 py-2 bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-xs text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer text-center"
                  title={ta('exportarExcel')}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{ta('excel')}</span>
                </button>

                <button 
                  onClick={exportToPDF}
                  disabled={getSubTabMatchedRecords().length === 0}
                  className="w-full sm:w-auto px-3 py-2 bg-[#f43f5e] hover:bg-[#e11d48] disabled:opacity-50 disabled:cursor-not-allowed text-xs text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer text-center"
                  title={ta('exportarPdf')}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{ta('pdf')}</span>
                </button>
              </div>
            </div>

            {user?.role !== 'Aluno' && activeSubTab === 'imc' && (
              <button 
                onClick={handleOpenNewImc}
                className="w-full sm:w-auto px-4 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t('botaoMedirImc')}</span>
              </button>
            )}

            {user?.role !== 'Aluno' && activeSubTab === 'motor' && (
              <button 
                onClick={handleOpenNewMotor}
                className="w-full sm:w-auto px-4 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t('botaoAvaliarMotor')}</span>
              </button>
            )}

            {user?.role !== 'Aluno' && activeSubTab === 'sport' && (
              <button 
                onClick={handleOpenNewSport}
                className="w-full sm:w-auto px-4 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t('botaoNovaIndicacao')}</span>
              </button>
            )}

            {user?.role !== 'Aluno' && activeSubTab === 'vocational' && (
              <button 
                onClick={handleOpenNewVocational}
                className="w-full sm:w-auto px-4 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t('botaoGerarVocacional')}</span>
              </button>
            )}

            {user?.role !== 'Aluno' && activeSubTab === 'health' && (
              <button 
                onClick={handleOpenNewHealth}
                className="w-full sm:w-auto px-4 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t('botaoAvaliarSaude')}</span>
              </button>
            )}

            {user?.role !== 'Aluno' && activeSubTab === 'pcd' && (
              <button 
                onClick={handleOpenNewPcd}
                className="w-full sm:w-auto px-4 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t('botaoAvaliarPcd')}</span>
              </button>
            )}

            {user?.role !== 'Aluno' && activeSubTab === 'oral' && (
              <button 
                onClick={handleOpenNewOral}
                className="w-full sm:w-auto px-4 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t('botaoAvaliarOral')}</span>
              </button>
            )}

            {user?.role !== 'Aluno' && activeSubTab === 'autoconcept' && (
              <button 
                onClick={handleOpenNewAuto}
                className="w-full sm:w-auto px-4 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t('botaoAvaliarAuto')}</span>
              </button>
            )}

            {user?.role !== 'Aluno' && activeSubTab === 'ias' && (
              <button 
                onClick={handleOpenNewIas}
                className="w-full sm:w-auto px-4 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t('botaoAvaliarIas')}</span>
              </button>
            )}

            {user?.role !== 'Aluno' && activeSubTab === 'snap' && (
              <button 
                onClick={handleOpenNewSnap}
                className="w-full sm:w-auto px-4 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t('botaoAvaliarSnap')}</span>
              </button>
            )}

            {user?.role !== 'Aluno' && activeSubTab === 'aq10' && (
              <button 
                onClick={handleOpenNewAq10}
                className="w-full sm:w-auto px-4 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t('botaoAvaliarAq10')}</span>
              </button>
            )}
          </div>

          {/* Render selected table block */}
          <section className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl overflow-hidden shadow-2xl">
            {activeSubTab === 'imc' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{ta('colunaAluno')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{ta('turma')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaPeso')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaAltura')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaImcCalculado')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaClassificacao')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaDataRegistro')}</th>
                      {user?.role !== 'Aluno' && (
                        <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-right">{ta('acoes')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3e484f]/30">
                    {imcRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                      <tr>
                        <td colSpan={user?.role === 'Aluno' ? 7 : 8} className="px-6 py-12 text-center text-[#bdc8d1]/60 text-xs">
                          {t('vazioImcTabela')}
                        </td>
                      </tr>
                    ) : (
                      imcRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => {
                        const statusVal = getImcClass(rec.weight, rec.height);
                        return (
                          <tr key={rec.id} className="hover:bg-[#131b2e]/60 transition-all font-sans text-xs">
                            <td className="px-6 py-4 font-semibold text-[#dae2fd]">{rec.studentName}</td>
                            <td className="px-6 py-4 text-[#bdc8d1]">{rec.classGroup}</td>
                            <td className="px-6 py-4 text-center text-[#dae2fd]">{rec.weight} {t('unidadeKg')}</td>
                            <td className="px-6 py-4 text-center text-[#dae2fd]">{rec.height} {t('unidadeM')}</td>
                            <td className="px-6 py-4 text-center font-bold text-[#38bdf8] font-mono">{rec.imc}</td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-bold ${statusVal.color}`}>
                                {displayValue(statusVal.label)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[#bdc8d1]">{formatDateBR(rec.date)}</td>
                            {user?.role !== 'Aluno' && (
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => handleEditImc(rec)} className="p-2 hover:bg-[#0b1326] text-[#bdc8d1] hover:text-[#38bdf8] rounded" title={t('titleEditarAvaliacao')}>
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteImc(rec.id, rec.studentName)} className="p-2 hover:bg-[#93000a]/25 text-[#bdc8d1] hover:text-[#ffb4ab] rounded" title={t('titleExcluirMedicao')}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeSubTab === 'motor' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[1024px]">
                  <thead>
                    <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{ta('colunaAluno')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaImpulsao')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaAbdomen')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaAgilidade')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaForcaMuscular')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-center">{t('colunaVelocidade')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaGeral')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaUltimaAfericao')}</th>
                      {user?.role !== 'Aluno' && (
                        <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-right">{ta('acoes')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3e484f]/30">
                    {motorRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                      <tr>
                        <td colSpan={user?.role === 'Aluno' ? 8 : 9} className="px-6 py-12 text-center text-[#bdc8d1]/60 text-xs">
                          {t('vazioMotorTabela')}
                        </td>
                      </tr>
                    ) : (
                      motorRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => {
                        const motorBadgeColor = 
                          rec.generalClass === 'Excelente' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          rec.generalClass === 'Bom' ? 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20' :
                          rec.generalClass === 'Regular' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20';

                        return (
                          <tr key={rec.id} className="hover:bg-[#131b2e]/60 transition-all font-sans text-xs">
                            <td className="px-6 py-4 font-semibold text-[#dae2fd]">{rec.studentName}</td>
                            <td className="px-6 py-4 text-center">{rec.impulsao || rec.flexibility}</td>
                            <td className="px-6 py-4 text-center">{rec.abdomen || rec.coordination}</td>
                            <td className="px-6 py-4 text-center">{rec.agility}</td>
                            <td className="px-6 py-4 text-center">{rec.strength}</td>
                            <td className="px-6 py-4 text-center">{displayValue(rec.speed || 'Excelente')}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${motorBadgeColor}`}>
                                {rec.generalClass}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[#bdc8d1]">{formatDateBR(rec.date)}</td>
                            {user?.role !== 'Aluno' && (
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => handleEditMotor(rec)} className="p-2 hover:bg-[#0b1326] text-[#bdc8d1] hover:text-[#38bdf8] rounded" title={t('titleEditarAvaliacao')}>
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteMotor(rec.id, rec.studentName)} className="p-2 hover:bg-[#93000a]/25 text-[#bdc8d1] hover:text-[#ffb4ab] rounded" title={t('titleExcluirCadastro')}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeSubTab === 'sport' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{ta('colunaAluno')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaIndiceCorporal')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaFisicoMotor')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('tituloEsporte')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaRecomendacoes')}</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider">{t('colunaUltimaAtualizacao')}</th>
                      {user?.role !== 'Aluno' && (
                        <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-right">{ta('acoes')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3e484f]/30">
                    {sportRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                      <tr>
                        <td colSpan={user?.role === 'Aluno' ? 6 : 7} className="px-6 py-12 text-center text-[#bdc8d1]/60 text-xs">
                          {t('vazioEsporteTabela')}
                        </td>
                      </tr>
                    ) : (
                      sportRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#131b2e]/60 transition-all font-sans text-xs">
                          <td className="px-6 py-4 font-semibold text-[#dae2fd]">{rec.studentName}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded bg-[#1e293b] border border-[#3e484f]/30 text-xs text-[#dae2fd]">
                              {displayValue(rec.biotype)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[#bdc8d1]">{displayValue(rec.mainSkill)}</td>
                          <td className="px-6 py-4 font-bold text-[#38bdf8]">{rec.suggestedSport}</td>
                          <td className="px-6 py-4 text-[#dae2fd]">{displayValue(rec.recommendedPractice)}</td>
                          <td className="px-6 py-4 text-[#bdc8d1]">{formatDateBR(rec.date)}</td>
                          {user?.role !== 'Aluno' && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleEditSport(rec)} className="p-2 hover:bg-[#0b1326] text-[#bdc8d1] hover:text-[#38bdf8] rounded" title={t('titleEditarEsporte')}>
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteSport(rec.id, rec.studentName)} className="p-2 hover:bg-[#93000a]/25 text-[#bdc8d1] hover:text-[#ffb4ab] rounded" title={t('titleExcluirRegistro')}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeSubTab === 'vocational' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[10%]">{ta('colunaAluno')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[10%]">{t('colunaPerfilDominante')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[12%]">{t('colunaAreaInteresse')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[10%]">{t('colunaCarreiraIndicada')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[36%]">{t('colunaParecerOrientador')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[10%]">{t('colunaAferidoEm')}</th>
                      {user?.role !== 'Aluno' && (
                        <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-right">{ta('acoes')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3e484f]/30">
                    {vocationalRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                      <tr>
                        <td colSpan={user?.role === 'Aluno' ? 6 : 7} className="px-6 py-12 text-center text-[#bdc8d1]/60 text-xs">
                          {t('vazioVocCatalogo')}
                        </td>
                      </tr>
                    ) : (
                      vocationalRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#131b2e]/60 transition-all font-sans text-xs">
                          <td className="px-6 py-4 font-semibold text-[#dae2fd]">{rec.studentName}</td>
                          <td className="px-6 py-4 font-bold text-[#38bdf8] text-xs">{displayValue(rec.profile)}</td>
                          <td className="px-6 py-4 text-[#dae2fd]">{displayValue(rec.interestArea)}</td>
                          <td className="px-6 py-4 font-bold text-[#8ed5ff]">{rec.suggestedCareer}</td>
                          <td className="px-6 py-4 text-[#bdc8d1] max-w-md whitespace-pre-wrap leading-relaxed" title={displayValue(rec.technicalOpinion)}>{displayValue(rec.technicalOpinion)}</td>
                          <td className="px-6 py-4 text-[#bdc8d1]/80">{formatDateBR(rec.date)}</td>
                          {user?.role !== 'Aluno' && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleEditVocational(rec)} className="p-2 hover:bg-[#0b1326] text-[#bdc8d1] hover:text-[#38bdf8] rounded" title={t('titleEditarParecer')}>
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteVocational(rec.id, rec.studentName)} className="p-2 hover:bg-[#93000a]/25 text-[#bdc8d1] hover:text-[#ffb4ab] rounded" title={t('titleExcluirParecer')}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {activeSubTab === 'health' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[14%]">{ta('colunaAluno')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[10%]">{t('colunaEscoreBruto')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[10%]">{t('colunaEscoreT')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[16%]">{t('colunaClassificacao')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[38%]">{t('colunaParecer')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[10%]">{t('colunaAferidoEm')}</th>
                      {user?.role !== 'Aluno' && (
                        <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-right">{ta('acoes')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3e484f]/30">
                    {healthRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                      <tr>
                        <td colSpan={user?.role === 'Aluno' ? 6 : 7} className="px-6 py-12 text-center text-[#bdc8d1]/60 text-xs">
                          {t('vazioSaudeCatalogo')}
                        </td>
                      </tr>
                    ) : (
                      healthRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#131b2e]/60 transition-all font-sans text-xs">
                          <td className="px-6 py-4 font-semibold text-[#dae2fd]">{rec.studentName}</td>
                          <td className="px-6 py-4 text-[#dae2fd]">{rec.rawScore}</td>
                          <td className="px-6 py-4 text-[#dae2fd]">{Number(rec.tScore).toFixed(2)}</td>
                          <td className="px-6 py-4 font-bold text-[#38bdf8] text-xs">{displayValue(rec.classification)}</td>
                          <td className="px-6 py-4 text-[#bdc8d1] max-w-md whitespace-pre-wrap leading-relaxed" title={displayValue(rec.technicalOpinion)}>{displayValue(rec.technicalOpinion)}</td>
                          <td className="px-6 py-4 text-[#bdc8d1]/80">{formatDateBR(rec.date)}</td>
                          {user?.role !== 'Aluno' && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleEditHealth(rec)} className="p-2 hover:bg-[#0b1326] text-[#bdc8d1] hover:text-[#38bdf8] rounded" title={t('titleEditarAvaliacao')}>
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteHealth(rec.id, rec.studentName)} className="p-2 hover:bg-[#93000a]/25 text-[#bdc8d1] hover:text-[#ffb4ab] rounded" title={t('titleExcluirAvaliacao')}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeSubTab === 'pcd' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[14%]">{ta('colunaAluno')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[12%]">{t('colunaGrupo')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[14%]">{t('colunaPerfil')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[12%]">{t('colunaModalidadeSugerida')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[26%]">{t('colunaParecer')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[10%]">{t('colunaAferidoEm')}</th>
                      {user?.role !== 'Aluno' && (
                        <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-right">{ta('acoes')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3e484f]/30">
                    {pcdRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                      <tr>
                        <td colSpan={user?.role === 'Aluno' ? 6 : 7} className="px-6 py-12 text-center text-[#bdc8d1]/60 text-xs">
                          {t('vazioPcdCatalogo')}
                        </td>
                      </tr>
                    ) : (
                      pcdRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => {
                        const top = rec.compatibilidade && rec.compatibilidade.length > 0 ? rec.compatibilidade[0] : null;
                        return (
                          <tr key={rec.id} className="hover:bg-[#131b2e]/60 transition-all font-sans text-xs">
                            <td className="px-6 py-4 font-semibold text-[#dae2fd]">{rec.studentName}</td>
                            <td className="px-6 py-4 text-[#dae2fd]">{rec.grupoNome || `Grupo ${rec.grupo}`}</td>
                            <td className="px-6 py-4 font-bold text-[#38bdf8] text-xs">{rec.classificacaoPerfil}</td>
                            <td className="px-6 py-4 text-[#dae2fd]">{top ? (top.modalidade + (top.iar ? ` (IAR ${top.iar.toFixed(2)})` : '')) : '—'}</td>
                            <td className="px-6 py-4 text-[#bdc8d1] max-w-md whitespace-pre-wrap leading-relaxed" title={displayValue(rec.technicalOpinion)}>{displayValue(rec.technicalOpinion)}</td>
                            <td className="px-6 py-4 text-[#bdc8d1]/80">{formatDateBR(rec.date)}</td>
                            {user?.role !== 'Aluno' && (
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => handleEditPcd(rec)} className="p-2 hover:bg-[#0b1326] text-[#bdc8d1] hover:text-[#38bdf8] rounded" title={t('titleEditarAvaliacao')}>
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDeletePcd(rec.id, rec.studentName)} className="p-2 hover:bg-[#93000a]/25 text-[#bdc8d1] hover:text-[#ffb4ab] rounded" title={t('titleExcluirAvaliacao')}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeSubTab === 'oral' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[16%]">{ta('colunaAluno')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[12%]">{t('colunaPontuacao12')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[18%]">{t('colunaClassificacao')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[36%]">{t('colunaParecer')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[10%]">{t('colunaAferidoEm')}</th>
                      {user?.role !== 'Aluno' && (
                        <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-right">{ta('acoes')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3e484f]/30">
                    {oralRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                      <tr>
                        <td colSpan={user?.role === 'Aluno' ? 5 : 6} className="px-6 py-12 text-center text-[#bdc8d1]/60 text-xs">
                          {t('vazioOralCatalogo')}
                        </td>
                      </tr>
                    ) : (
                      oralRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#131b2e]/60 transition-all font-sans text-xs">
                          <td className="px-6 py-4 font-semibold text-[#dae2fd]">{rec.studentName}</td>
                          <td className="px-6 py-4 text-[#dae2fd]">{rec.score}</td>
                          <td className="px-6 py-4 font-bold text-[#38bdf8] text-xs">{displayValue(rec.classification)}</td>
                          <td className="px-6 py-4 text-[#bdc8d1] max-w-md whitespace-pre-wrap leading-relaxed" title={displayValue(rec.technicalOpinion)}>{displayValue(rec.technicalOpinion)}</td>
                          <td className="px-6 py-4 text-[#bdc8d1]/80">{formatDateBR(rec.date)}</td>
                          {user?.role !== 'Aluno' && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleEditOral(rec)} className="p-2 hover:bg-[#0b1326] text-[#bdc8d1] hover:text-[#38bdf8] rounded" title={t('titleEditarAvaliacao')}>
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteOral(rec.id, rec.studentName)} className="p-2 hover:bg-[#93000a]/25 text-[#bdc8d1] hover:text-[#ffb4ab] rounded" title={t('titleExcluirAvaliacao')}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeSubTab === 'autoconcept' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[16%]">{ta('colunaAluno')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[12%]">{t('colunaPontuacao30')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[18%]">{t('colunaClassificacao')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[36%]">{t('colunaParecer')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[10%]">{t('colunaAferidoEm')}</th>
                      {user?.role !== 'Aluno' && (
                        <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-right">{ta('acoes')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3e484f]/30">
                    {autoconceptRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                      <tr>
                        <td colSpan={user?.role === 'Aluno' ? 5 : 6} className="px-6 py-12 text-center text-[#bdc8d1]/60 text-xs">
                          {t('vazioAutoCatalogo')}
                        </td>
                      </tr>
                    ) : (
                      autoconceptRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#131b2e]/60 transition-all font-sans text-xs">
                          <td className="px-6 py-4 font-semibold text-[#dae2fd]">{rec.studentName}</td>
                          <td className="px-6 py-4 text-[#dae2fd]">{rec.score}</td>
                          <td className="px-6 py-4 font-bold text-[#38bdf8] text-xs">{displayValue(rec.classification)}</td>
                          <td className="px-6 py-4 text-[#bdc8d1] max-w-md whitespace-pre-wrap leading-relaxed" title={displayValue(rec.technicalOpinion)}>{displayValue(rec.technicalOpinion)}</td>
                          <td className="px-6 py-4 text-[#bdc8d1]/80">{formatDateBR(rec.date)}</td>
                          {user?.role !== 'Aluno' && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleEditAuto(rec)} className="p-2 hover:bg-[#0b1326] text-[#bdc8d1] hover:text-[#38bdf8] rounded" title={t('titleEditarAvaliacao')}>
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteAuto(rec.id, rec.studentName)} className="p-2 hover:bg-[#93000a]/25 text-[#bdc8d1] hover:text-[#ffb4ab] rounded" title={t('titleExcluirAvaliacao')}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeSubTab === 'ias' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[16%]">{ta('colunaAluno')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[12%]">{t('colunaPontuacao100')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[18%]">{t('colunaClassificacao')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[36%]">{t('colunaParecer')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[10%]">{t('colunaAferidoEm')}</th>
                      {user?.role !== 'Aluno' && (
                        <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-right">{ta('acoes')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3e484f]/30">
                    {iasRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                      <tr>
                        <td colSpan={user?.role === 'Aluno' ? 5 : 6} className="px-6 py-12 text-center text-[#bdc8d1]/60 text-xs">
                          {t('vazioIasCatalogo')}
                        </td>
                      </tr>
                    ) : (
                      iasRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#131b2e]/60 transition-all font-sans text-xs">
                          <td className="px-6 py-4 font-semibold text-[#dae2fd]">{rec.studentName}</td>
                          <td className="px-6 py-4 text-[#dae2fd]">{rec.totalScore}</td>
                          <td className="px-6 py-4 font-bold text-[#38bdf8] text-xs">{displayValue(rec.classification)}</td>
                          <td className="px-6 py-4 text-[#bdc8d1] max-w-md whitespace-pre-wrap leading-relaxed" title={displayValue(rec.technicalOpinion)}>{displayValue(rec.technicalOpinion)}</td>
                          <td className="px-6 py-4 text-[#bdc8d1]/80">{formatDateBR(rec.date)}</td>
                          {user?.role !== 'Aluno' && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleEditIas(rec)} className="p-2 hover:bg-[#0b1326] text-[#bdc8d1] hover:text-[#38bdf8] rounded" title={t('titleEditarAvaliacao')}>
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteIas(rec.id, rec.studentName)} className="p-2 hover:bg-[#93000a]/25 text-[#bdc8d1] hover:text-[#ffb4ab] rounded" title={t('titleExcluirAvaliacao')}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {activeSubTab === 'snap' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[14%]">{ta('colunaAluno')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[9%]">{t('colunaDesatencao')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[9%]">{t('colunaHiperImpulsCurta')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[12%]">{t('colunaRelatoDe')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[15%]">{t('colunaClassificacao')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[23%]">{t('colunaParecer')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[8%]">{t('colunaAferidoEm')}</th>
                      {user?.role !== 'Aluno' && (
                        <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-right">{ta('acoes')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3e484f]/30">
                    {snapRecords.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                      <tr>
                        <td colSpan={user?.role === 'Aluno' ? 6 : 7} className="px-6 py-12 text-center text-[#bdc8d1]/60 text-xs">
                          {t('vazioSnapCatalogo')}
                        </td>
                      </tr>
                    ) : (
                      snapRecords.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#131b2e]/60 transition-all font-sans text-xs">
                          <td className="px-6 py-4 font-semibold text-[#dae2fd]">{rec.studentName}</td>
                          <td className="px-6 py-4 text-center text-[#dae2fd]">{rec.inattentionScore}</td>
                          <td className="px-6 py-4 text-center text-[#dae2fd]">{rec.hyperactivityScore}</td>
                          <td className="px-6 py-4 text-[#bdc8d1]">{rec.respondent || '—'}</td>
                          <td className="px-6 py-4 font-bold text-[#38bdf8] text-xs">{displayValue(rec.classification)}</td>
                          <td className="px-6 py-4 text-[#bdc8d1] max-w-md whitespace-pre-wrap leading-relaxed" title={displayValue(rec.technicalOpinion)}>{displayValue(rec.technicalOpinion)}</td>
                          <td className="px-6 py-4 text-[#bdc8d1]/80">{formatDateBR(rec.date)}</td>
                          {user?.role !== 'Aluno' && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleEditSnap(rec)} className="p-2 hover:bg-[#0b1326] text-[#bdc8d1] hover:text-[#38bdf8] rounded" title={t('titleEditarAvaliacao')}>
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteSnap(rec.id, rec.studentName)} className="p-2 hover:bg-[#93000a]/25 text-[#bdc8d1] hover:text-[#ffb4ab] rounded" title={t('titleExcluirAvaliacao')}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {activeSubTab === 'aq10' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[14%]">{ta('colunaAluno')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[12%]">{t('colunaVersao')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[8%]">{t('colunaPontuacao10')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[12%]">{t('colunaRelatoDe')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[15%]">{t('colunaClassificacao')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[23%]">{t('colunaParecer')}</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider w-[8%]">{t('colunaAferidoEm')}</th>
                      {user?.role !== 'Aluno' && (
                        <th className="px-6 py-3.5 text-xs font-bold text-[#bdc8d1] uppercase tracking-wider text-right">{ta('acoes')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3e484f]/30">
                    {aq10Records.filter(r => matchesFilters(r.studentName, r.studentId)).length === 0 ? (
                      <tr>
                        <td colSpan={user?.role === 'Aluno' ? 7 : 8} className="px-6 py-12 text-center text-[#bdc8d1]/60 text-xs">
                          {t('vazioAq10Catalogo')}
                        </td>
                      </tr>
                    ) : (
                      aq10Records.filter(r => matchesFilters(r.studentName, r.studentId)).map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#131b2e]/60 transition-all font-sans text-xs">
                          <td className="px-6 py-4 font-semibold text-[#dae2fd]">{rec.studentName}</td>
                          <td className="px-6 py-4 text-[#dae2fd]">{AQ10_VERSION_LABELS[rec.version]}</td>
                          <td className="px-6 py-4 text-center text-[#dae2fd]">{rec.totalScore}</td>
                          <td className="px-6 py-4 text-[#bdc8d1]">{rec.respondent || '—'}</td>
                          <td className="px-6 py-4 font-bold text-[#38bdf8] text-xs">{displayValue(rec.classification)}</td>
                          <td className="px-6 py-4 text-[#bdc8d1] max-w-md whitespace-pre-wrap leading-relaxed" title={displayValue(rec.technicalOpinion)}>{displayValue(rec.technicalOpinion)}</td>
                          <td className="px-6 py-4 text-[#bdc8d1]/80">{formatDateBR(rec.date)}</td>
                          {user?.role !== 'Aluno' && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleEditAq10(rec)} className="p-2 hover:bg-[#0b1326] text-[#bdc8d1] hover:text-[#38bdf8] rounded" title={t('titleEditarAvaliacao')}>
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteAq10(rec.id, rec.studentName)} className="p-2 hover:bg-[#93000a]/25 text-[#bdc8d1] hover:text-[#ffb4ab] rounded" title={t('titleExcluirAvaliacao')}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* -------------------- MODAL DIALOGS FOR CRUD OPERATIONS -------------------- */}

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-sm rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150">
            <h4 className="text-sm font-bold text-[#dae2fd] mb-3 flex items-center gap-2">
              <span className="text-[#ffb4ab]">⚠️</span> {ta('confirmarExclusao')}
            </h4>
            <p className="text-xs text-[#bdc8d1] mb-5 leading-relaxed">
              {t.rich('confirmarRemoverFrase', {
                tipo: (() => {
                  const tipos: Record<NonNullable<typeof itemToDelete>['type'], string> = {
                    imc: t('tipoExclusaoImc'),
                    motor: t('tipoExclusaoMotor'),
                    sport: t('tipoExclusaoEsporte'),
                    vocational: t('tipoExclusaoVoc'),
                    health: t('tipoExclusaoSaude'),
                    oral: t('tipoExclusaoOral'),
                    autoconcept: t('tipoExclusaoAuto'),
                    ias: t('tipoExclusaoIas'),
                    snap: t('tipoExclusaoSnap'),
                    aq10: t('tipoExclusaoAq10'),
                    pcd: t('tipoExclusaoPcd'),
                  };
                  return itemToDelete ? tipos[itemToDelete.type] : '';
                })(),
                nome: itemToDelete.studentName,
                strong: (chunks) => <span className="text-[#dae2fd] font-bold">{chunks}</span>,
              })}
            </p>
            <div className="flex gap-2 justify-end">
              <button 
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1] transition-colors"
              >
                {ta('cancelar')}
              </button>
              <button 
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-[#93000a] hover:bg-[#b01614] text-[#ffb4ab] font-bold rounded-lg text-xs shadow-md transition-colors"
              >
                {ta('confirmarExcluir')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. IMC MODAL */}
      {showImcModal && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-md rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150">
            <button 
              onClick={() => setShowImcModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              {editingImc ? t('tituloAjustarImc') : t('tituloNovoImc')}
            </h4>

            <form onSubmit={handleSaveImc} className="space-y-4">
              {/* Modal unified filters for selective student searching */}
              <div className="p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">{t('filtrarAlunosTitulo')}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('contrato')}</label>
                    <select 
                      value={modalContract}
                      onChange={(e) => {
                        setModalContract(e.target.value);
                        setModalState('');
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneContrato')}</option>
                      <option value="Todos">{ta('todosContratos')}</option>
                      {availableContracts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('estado')}</label>
                    <select 
                      value={modalState}
                      onChange={(e) => {
                        setModalState(e.target.value);
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneEstado')}</option>
                      {modalContract === 'Todos' && <option value="Todos">{ta('todosEstados')}</option>}
                      {modalAvailableStates.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('regiao')}</label>
                    <select 
                      value={modalRegion}
                      onChange={(e) => {
                        setModalRegion(e.target.value);
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneRegiao')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos') && <option value="Todos">{ta('todasRegioes')}</option>}
                      {modalAvailableRegions.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('localidade')}</label>
                    <select 
                      value={modalLocality}
                      onChange={(e) => setModalLocality(e.target.value)}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneLocalidade')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos' || modalRegion === 'Todos' || modalRegion === 'Todas') && <option value="Todos">{ta('todasLocalidades')}</option>}
                      {modalAvailableLocalities.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('selecioneAlunoColuna')}</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={!!editingImc}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]"
                >
                  <option value="">{t('selecioneAluno')}</option>
                  {getFilteredModalStudents().map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoPeso')}</label>
                  <input 
                    type="number"
                    step="0.1"
                    required
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoAltura')}</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] outline-none font-mono"
                  />
                </div>
              </div>

              {/* Dynamic Live Calculations Review Block */}
              <div className="p-3 bg-[#0b1326] rounded-lg border border-[#3e484f]/30 text-center">
                <span className="text-[10px] text-[#bdc8d1]/75 block font-semibold uppercase tracking-wider">{t('tituloImcEstimado')}</span>
                <span className="text-xl font-bold text-[#38bdf8] block font-mono">
                  {(parseFloat(weightInput) / ((parseFloat(heightInput) || 1) * (parseFloat(heightInput) || 1))).toFixed(1)}
                </span>
                <span className="text-[11px] font-semibold block text-[#dae2fd]">
                  {displayValue(getImcClass(parseFloat(weightInput), parseFloat(heightInput)).label)}
                </span>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#3e484f]/25">
                <button 
                  type="button"
                  onClick={() => setShowImcModal(false)}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  {ta('cancelar')}
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg text-xs"
                >
                  {editingImc ? t('botaoSalvarAjustes') : t('botaoSalvarRegistro')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MOTOR QUALITY MODAL */}
      {showMotorModal && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150 scrollbar-thin">
            <button 
              onClick={() => setShowMotorModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              {editingMotor ? t('tituloEditarMotor') : t('tituloNovoMotor')}
            </h4>

            <form onSubmit={handleSaveMotor} className="space-y-4">
              {/* Modal unified filters for selective student searching */}
              <div className="p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">{t('filtrarAlunosTitulo')}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('contrato')}</label>
                    <select 
                      value={modalContract}
                      onChange={(e) => {
                        setModalContract(e.target.value);
                        setModalState('');
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneContrato')}</option>
                      <option value="Todos">{ta('todosContratos')}</option>
                      {availableContracts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('estado')}</label>
                    <select 
                      value={modalState}
                      onChange={(e) => {
                        setModalState(e.target.value);
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneEstado')}</option>
                      {modalContract === 'Todos' && <option value="Todos">{ta('todosEstados')}</option>}
                      {modalAvailableStates.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('regiao')}</label>
                    <select 
                      value={modalRegion}
                      onChange={(e) => {
                        setModalRegion(e.target.value);
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneRegiao')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos') && <option value="Todos">{ta('todasRegioes')}</option>}
                      {modalAvailableRegions.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('localidade')}</label>
                    <select 
                      value={modalLocality}
                      onChange={(e) => setModalLocality(e.target.value)}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneLocalidade')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos' || modalRegion === 'Todos' || modalRegion === 'Todas') && <option value="Todos">{ta('todasLocalidades')}</option>}
                      {modalAvailableLocalities.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('selecioneAlunoColuna')}</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={!!editingMotor}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]"
                >
                  <option value="">{t('selecioneAluno')}</option>
                  {getFilteredModalStudents().map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoImpulsao')}</label>
                  <select 
                    value={impulsao}
                    onChange={(e) => setImpulsao(e.target.value as 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente')}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg p-2 text-xs text-[#dae2fd]"
                  >
                    <option value="Excelente">{getLabelWithRef('impulsao', 'Excelente')}</option>
                    <option value="Bom">{getLabelWithRef('impulsao', 'Bom')}</option>
                    <option value="Regular">{getLabelWithRef('impulsao', 'Regular')}</option>
                    <option value="Insuficiente">{getLabelWithRef('impulsao', 'Insuficiente')}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoAbdomen')}</label>
                  <select 
                    value={abdomen}
                    onChange={(e) => setAbdomen(e.target.value as 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente')}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg p-2 text-xs text-[#dae2fd]"
                  >
                    <option value="Excelente">{getLabelWithRef('abdomen', 'Excelente')}</option>
                    <option value="Regular">{getLabelWithRef('abdomen', 'Regular')}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoAgilidade')}</label>
                  <select 
                    value={agility}
                    onChange={(e) => setAgility(e.target.value as 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente')}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg p-2 text-xs text-[#dae2fd]"
                  >
                    <option value="Excelente">{getLabelWithRef('agilidade', 'Excelente')}</option>
                    <option value="Bom">{getLabelWithRef('agilidade', 'Bom')}</option>
                    <option value="Regular">{getLabelWithRef('agilidade', 'Regular')}</option>
                    <option value="Insuficiente">{getLabelWithRef('agilidade', 'Insuficiente')}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoForcaMuscular')}</label>
                  <select 
                    value={strength}
                    onChange={(e) => setStrength(e.target.value as 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente')}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg p-2 text-xs text-[#dae2fd]"
                  >
                    <option value="Excelente">{getLabelWithRef('forca', 'Excelente')}</option>
                    <option value="Bom">{getLabelWithRef('forca', 'Bom')}</option>
                    <option value="Regular">{getLabelWithRef('forca', 'Regular')}</option>
                    <option value="Insuficiente">{getLabelWithRef('forca', 'Insuficiente')}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoVelocidade')}</label>
                  <select 
                    value={speed}
                    onChange={(e) => setSpeed(e.target.value as 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente')}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg p-2 text-xs text-[#dae2fd]"
                  >
                    <option value="Excelente">{getLabelWithRef('velocidade', 'Excelente')}</option>
                    <option value="Bom">{getLabelWithRef('velocidade', 'Bom')}</option>
                    <option value="Regular">{getLabelWithRef('velocidade', 'Regular')}</option>
                    <option value="Insuficiente">{getLabelWithRef('velocidade', 'Insuficiente')}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#0b1326] border border-[#3e484f]/50 rounded-lg px-3 py-2.5">
                {(() => {
                  const g = computeGeneralClass([impulsao, abdomen, agility, strength, speed]);
                  const cls = g === 'Excelente' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : g === 'Bom' ? 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20'
                    : g === 'Regular' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                  return (
                    <>
                      <span className="text-xs font-semibold text-[#bdc8d1]">{t('campoClassificacaoGeral')}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cls}`}>{g}</span>
                    </>
                  );
                })()}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#3e484f]/25">
                <button 
                  type="button"
                  onClick={() => setShowMotorModal(false)}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  {ta('cancelar')}
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg text-xs"
                >
                  {editingMotor ? t('botaoSalvarEdicoes') : t('botaoCadastrarParecer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SPORT MODAL */}
      {showSportModal && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150 scrollbar-thin">
            <button 
              onClick={() => setShowSportModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              {editingSport ? t('botaoAtualizarEsporte') : t('botaoIndicarNovoEsporte')}
            </h4>

            <form onSubmit={handleSaveSport} className="space-y-4">
              {/* Modal unified filters for selective student searching */}
              <div className="p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">{t('filtrarAlunosTitulo')}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('contrato')}</label>
                    <select 
                      value={modalContract}
                      onChange={(e) => {
                        setModalContract(e.target.value);
                        setModalState('');
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneContrato')}</option>
                      <option value="Todos">{ta('todosContratos')}</option>
                      {availableContracts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('estado')}</label>
                    <select 
                      value={modalState}
                      onChange={(e) => {
                        setModalState(e.target.value);
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneEstado')}</option>
                      {modalContract === 'Todos' && <option value="Todos">{ta('todosEstados')}</option>}
                      {modalAvailableStates.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('regiao')}</label>
                    <select 
                      value={modalRegion}
                      onChange={(e) => {
                        setModalRegion(e.target.value);
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneRegiao')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos') && <option value="Todos">{ta('todasRegioes')}</option>}
                      {modalAvailableRegions.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('localidade')}</label>
                    <select 
                      value={modalLocality}
                      onChange={(e) => setModalLocality(e.target.value)}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneLocalidade')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos' || modalRegion === 'Todos' || modalRegion === 'Todas') && <option value="Todos">{ta('todasLocalidades')}</option>}
                      {modalAvailableLocalities.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('mapearAluno')}</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setSelectedStudentId(selId);
                    autoSuggestSportForStudent(selId);
                  }}
                  disabled={!!editingSport}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]"
                >
                  <option value="">{t('selecioneAluno')}</option>
                  {getFilteredModalStudents().map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoIndiceCorporal')}</label>
                  <input 
                    type="text"
                    disabled
                    value={editingSport ? biotype : computedBiotype}
                    className="w-full bg-[#0b1326]/60 border border-[#3e484f] rounded-lg p-2 text-xs text-[#dae2fd] font-semibold opacity-75 select-none focus:outline-none"
                    placeholder={t('placeholderSemImc')}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoFisicoMotor')}</label>
                  <input 
                    type="text"
                    disabled
                    value={editingSport ? mainSkill : computedMainSkill}
                    className="w-full bg-[#0b1326]/60 border border-[#3e484f] rounded-lg p-2 text-xs text-[#dae2fd] font-semibold opacity-75 select-none focus:outline-none"
                    placeholder={t('placeholderSemMotor')}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoEsporteIndicado')}</label>
                <input 
                  type="text"
                  readOnly
                  placeholder={t('placeholderSemPerfilMotor')}
                  value={displayValue(suggestedSport)}
                  className="w-full bg-[#0b1326]/60 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#38bdf8] font-bold cursor-not-allowed select-none focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoRecomendacoes')}</label>
                <input 
                  type="text"
                  required
                  placeholder={t('placeholderRecomendacoes')}
                  value={displayValue(recommendedPractice)}
                  onChange={(e) => setRecommendedPractice(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                />
              </div>

              {((editingSport ? mainSkill : computedMainSkill) === 'Não cadastrado') && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold leading-relaxed animate-pulse">
                  {t('erroPreencherMotor')}
                </div>
              )}

              {(!(editingSport ? biotype : computedBiotype) || (editingSport ? biotype : computedBiotype).toLowerCase() === 'não cadastrado') && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold leading-relaxed animate-pulse">
                  {t('erroImcAntesEsporte')}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t border-[#3e484f]/25 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button 
                  type="button"
                  onClick={() => setShowSportModal(false)}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  {ta('cancelar')}
                </button>
                <button 
                  type="submit"
                  disabled={
                    ((editingSport ? mainSkill : computedMainSkill) === 'Não cadastrado') ||
                    (!(editingSport ? biotype : computedBiotype) || (editingSport ? biotype : computedBiotype).toLowerCase() === 'não cadastrado')
                  }
                  className="px-5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingSport ? t('botaoSalvarRecomendacoes') : t('botaoIndicarEsporte')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. VOCATIONAL MODAL */}
      {showVocationalModal && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150 scrollbar-thin">
            <button 
              onClick={() => setShowVocationalModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              {editingVocational ? t('botaoDiligenciar') : t('botaoMapearNovoPerfil')}
            </h4>

            <form onSubmit={handleSaveVocational} className="space-y-4">
              {/* Modal unified filters for selective student searching */}
              <div className="p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">{t('filtrarAlunosTitulo')}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('contrato')}</label>
                    <select 
                      value={modalContract}
                      onChange={(e) => {
                        setModalContract(e.target.value);
                        setModalState('');
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneContrato')}</option>
                      <option value="Todos">{ta('todosContratos')}</option>
                      {availableContracts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('estado')}</label>
                    <select 
                      value={modalState}
                      onChange={(e) => {
                        setModalState(e.target.value);
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneEstado')}</option>
                      {modalContract === 'Todos' && <option value="Todos">{ta('todosEstados')}</option>}
                      {modalAvailableStates.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('regiao')}</label>
                    <select 
                      value={modalRegion}
                      onChange={(e) => {
                        setModalRegion(e.target.value);
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneRegiao')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos') && <option value="Todos">{ta('todasRegioes')}</option>}
                      {modalAvailableRegions.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('localidade')}</label>
                    <select 
                      value={modalLocality}
                      onChange={(e) => setModalLocality(e.target.value)}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneLocalidade')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos' || modalRegion === 'Todos' || modalRegion === 'Todas') && <option value="Todos">{ta('todasLocalidades')}</option>}
                      {modalAvailableLocalities.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('mapearAluno')}</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={!!editingVocational}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]"
                >
                  <option value="">{t('selecioneAluno')}</option>
                  {renderStudentOptions('vocational')}
                </select>
                {renderStudentAgeNote('vocational')}
              </div>

              {/* QUESTÕES DO PERFIL VOCACIONAL */}
              <div className="p-4 bg-[#131b2e] border border-[#3e484f]/40 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#3e484f]/20 pb-2 mb-2">
                  <span className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4" />
                    {t('tituloQuestionario')}
                  </span>
                </div>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                  {vocQuestions.map((q, i) => (
                    <div key={q.id} className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[#bdc8d1] block leading-relaxed">
                        {i + 1}. {displayValue(q.statement)}
                      </label>
                      <select
                        value={vocAnswers[i] ?? ''}
                        onChange={(e) => {
                          const next = [...vocAnswers];
                          next[i] = e.target.value;
                          setVocAnswers(next);
                        }}
                        className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                      >
                        <option value="">{ta('selecione')}</option>
                        <option value="A">{t('opcaoA')} {displayValue(q.optionA)}</option>
                        <option value="B">{t('opcaoB')} {displayValue(q.optionB)}</option>
                        <option value="C">{t('opcaoC')} {displayValue(q.optionC)}</option>
                        <option value="D">{t('opcaoD')} {displayValue(q.optionD)}</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoPerfilPsicologico')}</label>
                  <input 
                    type="text"
                    readOnly
                    value={vocationalProfile}
                    className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none"
                    placeholder={t('calculadoAutomatico')}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoGostos')}</label>
                  <input 
                    type="text"
                    readOnly
                    value={interestArea}
                    className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none"
                    placeholder={t('calculadoAutomatico')}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoSugerida')}</label>
                <textarea 
                  rows={2}
                  readOnly
                  value={displayValue(suggestedCareer)}
                  className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none resize-none"
                  placeholder={t('calculadoAutomatico')}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoParecerTecnico')}</label>
                <div className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 whitespace-pre-wrap leading-relaxed min-h-[3rem]">
                  {technicalOpinion || t('calculadoAutomatico')}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#3e484f]/25">
                <button 
                  type="button"
                  onClick={() => setShowVocationalModal(false)}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  {ta('cancelar')}
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg text-xs"
                >
                  {editingVocational ? t('botaoSalvarDiligencia') : t('botaoEntregarParecer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. SAUDE GLOBAL MODAL (KIDSCREEN-10) */}
      {showHealthModal && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150 scrollbar-thin">
            <button 
              onClick={() => setShowHealthModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              {editingHealth ? t('tituloRevisarSaude') : t('tituloNovoSaude')}
            </h4>

            <form onSubmit={handleSaveHealth} className="space-y-4">
              {/* Modal unified filters for selective student searching */}
              <div className="p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">{t('filtrarAlunosTitulo')}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('contrato')}</label>
                    <select 
                      value={modalContract}
                      onChange={(e) => {
                        setModalContract(e.target.value);
                        setModalState('');
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneContrato')}</option>
                      <option value="Todos">{ta('todosContratos')}</option>
                      {availableContracts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('estado')}</label>
                    <select 
                      value={modalState}
                      onChange={(e) => {
                        setModalState(e.target.value);
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneEstado')}</option>
                      {modalContract === 'Todos' && <option value="Todos">{ta('todosEstados')}</option>}
                      {modalAvailableStates.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('regiao')}</label>
                    <select 
                      value={modalRegion}
                      onChange={(e) => {
                        setModalRegion(e.target.value);
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneRegiao')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos') && <option value="Todos">{ta('todasRegioes')}</option>}
                      {modalAvailableRegions.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('localidade')}</label>
                    <select 
                      value={modalLocality}
                      onChange={(e) => setModalLocality(e.target.value)}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneLocalidade')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos' || modalRegion === 'Todos' || modalRegion === 'Todas') && <option value="Todos">{ta('todasLocalidades')}</option>}
                      {modalAvailableLocalities.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('botaoAvaliarAluno')}</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={!!editingHealth}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]"
                >
                  <option value="">{t('selecioneAluno')}</option>
                  {renderStudentOptions('health')}
                </select>
                {renderStudentAgeNote('health')}
              </div>

              <div className="p-4 bg-[#131b2e] border border-[#3e484f]/40 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#3e484f]/20 pb-2 mb-2">
                  <span className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4" />
                    {t('saudeHeader')}{healthQuestions.length} {t('unidadePerguntas')})
                  </span>
                </div>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                  {healthQuestions.map((q, i) => (
                    <div key={q.id} className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[#bdc8d1] block leading-relaxed">
                        {i + 1}. {displayValue(q.statement)}
                        {q.reversed && <span className="ml-1 text-[9px] text-amber-400 font-bold">{t('marcadorInvertido')}</span>}
                      </label>
                      <select
                        value={healthAnswers[i] ? String(healthAnswers[i]) : ''}
                        onChange={(e) => {
                          const next = [...healthAnswers];
                          next[i] = Number(e.target.value) || 0;
                          setHealthAnswers(next);
                        }}
                        className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                      >
                        <option value="">{ta('selecione')}</option>
                        {HEALTH_LIKERT_LABELS.map((label, idx) => (
                          <option key={idx} value={String(idx + 1)}>{idx + 1} — {displayValue(label)}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoEscoreBruto')}</label>
                  <input type="text" readOnly value={healthResult ? healthResult.raw : ''} className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none" placeholder={t('placeholderAuto')} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoEscoreT')}</label>
                  <input type="text" readOnly value={healthResult ? healthResult.t.toFixed(2) : ''} className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none" placeholder={t('placeholderAuto')} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoClassificacao')}</label>
                  <input type="text" readOnly value={healthResult ? displayValue(healthResult.classification) : ''} className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none" placeholder={t('placeholderAuto')} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoParecerTecnico')}</label>
                <div className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 whitespace-pre-wrap leading-relaxed min-h-[3rem]">
                  {healthOpinion || t('calculadoAutomatico')}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#3e484f]/25">
                <button 
                  type="button"
                  onClick={() => setShowHealthModal(false)}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  {ta('cancelar')}
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg text-xs"
                >
                  {editingHealth ? t('botaoSalvarRevisao') : t('botaoEntregarAvaliacao')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 15. PCD MODAL (Qualidade Motora PCD) */}
      {showPcdModal && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150 scrollbar-thin">
            <button 
              onClick={() => setShowPcdModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              {editingPcd ? t('tituloRevisarPcd') : t('tituloNovoPcd')}
            </h4>

            <form onSubmit={handleSavePcd} className="space-y-4">
              {/* Modal unified filters for selective student searching */}
              <div className="p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">{t('filtrarAlunosTitulo')}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('contrato')}</label>
                    <select 
                      value={modalContract}
                      onChange={(e) => {
                        setModalContract(e.target.value);
                        setModalState('');
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneContrato')}</option>
                      <option value="Todos">{ta('todosContratos')}</option>
                      {availableContracts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('estado')}</label>
                    <select 
                      value={modalState}
                      onChange={(e) => {
                        setModalState(e.target.value);
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneEstado')}</option>
                      {modalContract === 'Todos' && <option value="Todos">{ta('todosEstados')}</option>}
                      {modalAvailableStates.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('regiao')}</label>
                    <select 
                      value={modalRegion}
                      onChange={(e) => {
                        setModalRegion(e.target.value);
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneRegiao')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos') && <option value="Todos">{ta('todasRegioes')}</option>}
                      {modalAvailableRegions.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('localidade')}</label>
                    <select 
                      value={modalLocality}
                      onChange={(e) => setModalLocality(e.target.value)}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneLocalidade')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos' || modalRegion === 'Todos' || modalRegion === 'Todas') && <option value="Todos">{ta('todasLocalidades')}</option>}
                      {modalAvailableLocalities.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('botaoAvaliarAluno')}</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={!!editingPcd}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]"
                >
                  <option value="">{t('selecioneAluno')}</option>
                  {getFilteredModalStudents().map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.age != null ? ` - ${s.age} anos` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('grupoTriagem')}</label>
                  <select 
                    value={pcdGrupo}
                    onChange={(e) => { setPcdGrupo(Number(e.target.value)); setPcdDetalhe(''); }}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]"
                  >
                    {pcdConfigs.grupos.map(g => <option key={g.id} value={g.grupo}>{t('colunaGrupo')} {g.grupo} — {displayValue(g.nome)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('classificacaoDetalhe')}</label>
                  <select 
                    value={pcdDetalhe}
                    onChange={(e) => setPcdDetalhe(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]"
                  >
                    <option value="">{t('geralParenteses')}</option>
                    {(PCD_DETALHES_POR_GRUPO[pcdGrupo] ?? []).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-4 bg-[#131b2e] border border-[#3e484f]/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#3e484f]/20 pb-2 mb-1">
                  <span className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4" />
                    {t('tituloBateria')}
                  </span>
                </div>
                {PCD_TESTES.map(testeCfg => {
                  const { value, setter } = testeCfg.key === 'abdominal' ? { value: pcdAbdominal, setter: setPcdAbdominal }
                    : testeCfg.key === 'velocidade' ? { value: pcdVelocidade, setter: setPcdVelocidade }
                    : testeCfg.key === 'agilidade' ? { value: pcdAgilidade, setter: setPcdAgilidade }
                    : testeCfg.key === 'salto' ? { value: pcdSalto, setter: setPcdSalto }
                    : { value: pcdFlexao, setter: setPcdFlexao };
                  const nota = pcdResult?.notasPorTeste[testeCfg.key];
                  const invalido = testeCfg.invertido && value.trim() !== '' && Number(value) <= 0;
                  return (
                    <div key={testeCfg.key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <label className="text-[11px] font-semibold text-[#bdc8d1] sm:w-48 sm:shrink-0">{displayValue(testeCfg.label)}</label>
                      <input
                        type="number"
                        step="any"
                        min={0}
                        placeholder={`Ex.: ${testeCfg.unidade === 'cm' ? '150' : '12.5'}`}
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        className="w-full sm:w-28 bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                      />
                      <span className="text-[10px] text-[#bdc8d1]/60 sm:w-16 sm:shrink-0">{displayValue(testeCfg.unidade)}</span>
                      <span className={`text-[11px] font-black rounded px-2 py-0.5 self-start sm:self-auto ${nota && nota > 0 ? 'bg-[#38bdf8]/10 text-[#38bdf8]' : 'bg-[#3e484f]/20 text-[#bdc8d1]/50'}`}>{nota ? PCD_NOTAS_LABELS[nota] : '—'}</span>
                      {invalido && <span className="text-[10px] font-bold text-rose-400 sm:self-auto">{t('avisoValorInvalido')}</span>}
                    </div>
                  );
                })}
                <p className="text-[10px] text-[#bdc8d1]/50 pt-1">{t('avisoTestesNaoAplicaveis')}</p>
                {pcdResult && pcdResult.adaptacoesAplicadas.some(a => a.status === 'Adaptado' || a.status === 'Substituído') && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-wider">{t('tituloTestesAdaptados')}</p>
                    {pcdResult.adaptacoesAplicadas.filter(a => a.status === 'Adaptado' || a.status === 'Substituído').map(a => (
                      <p key={displayValue(a.teste)} className="text-[10px] text-[#bdc8d1]/70"><span className="font-bold text-[#dae2fd]">{PCD_TESTES.find(t => t.key === a.teste)?.label ?? a.teste} ({displayValue(a.status)}):</span> {displayValue(a.instrucao)}</p>
                    ))}
                    <p className="text-[10px] text-[#bdc8d1]/50">{t('notaTesteAlternativo')}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('tituloPerfilValencias')}</label>
                {pcdResult ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-[#0b1326] border border-[#3e484f] rounded-lg p-2 text-center">
                        <p className="text-[9px] text-[#bdc8d1]/60 uppercase tracking-wider">{t('colunaVelAgil')}</p>
                        <p className="text-sm font-black text-[#38bdf8]">{pcdResult.notasValencias.velAgil}</p>
                      </div>
                      <div className="bg-[#0b1326] border border-[#3e484f] rounded-lg p-2 text-center">
                        <p className="text-[9px] text-[#bdc8d1]/60 uppercase tracking-wider">{t('colunaForcaExpl')}</p>
                        <p className="text-sm font-black text-[#38bdf8]">{pcdResult.notasValencias.forcaExplosiva}</p>
                      </div>
                      <div className="bg-[#0b1326] border border-[#3e484f] rounded-lg p-2 text-center">
                        <p className="text-[9px] text-[#bdc8d1]/60 uppercase tracking-wider">{t('colunaMembrosSup')}</p>
                        <p className="text-sm font-black text-[#38bdf8]">{pcdResult.notasValencias.membrosSup}</p>
                      </div>
                      <div className="bg-[#0b1326] border border-[#3e484f] rounded-lg p-2 text-center">
                        <p className="text-[9px] text-[#bdc8d1]/60 uppercase tracking-wider">{t('colunaCore')}</p>
                        <p className="text-sm font-black text-[#38bdf8]">{pcdResult.notasValencias.core}</p>
                      </div>
                    </div>
                    <div className="bg-[#0b1326] border border-[#3e484f] rounded-lg p-3">
                      <p className="text-[10px] text-[#bdc8d1]/70"><span className="font-bold text-[#dae2fd]">{t('campoPerfil')}</span> {pcdResult.classificacaoPerfil}</p>
                      <p className="text-[10px] text-[#bdc8d1]/70 mt-1"><span className="font-bold text-[#dae2fd]">{t('campoDirecionamento')}</span> {pcdResult.direcionamento}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#bdc8d1]/50">{t('dicaPreenchaTeste')}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('tituloRadar')}</label>
                {pcdResult && ((
                  <div className="h-64 w-full bg-[#0b1326] border border-[#3e484f] rounded-lg p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={[
                        { valencia: t('colunaVelAgil'), nota: pcdResult.notasValencias.velAgil },
                        { valencia: t('colunaForcaExpl'), nota: pcdResult.notasValencias.forcaExplosiva },
                        { valencia: t('colunaMembrosSup'), nota: pcdResult.notasValencias.membrosSup },
                        { valencia: t('colunaCore'), nota: pcdResult.notasValencias.core },
                      ]}>
                        <PolarGrid stroke="#3e484f" />
                        <PolarAngleAxis dataKey="valencia" tick={{ fill: '#bdc8d1', fontSize: 10 }} />
                        <Radar dataKey="nota" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.35} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )) || null}
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('tituloMatriz')}</label>
                {pcdResult && pcdResult.compatibilidade.length > 0 ? (
                  <div className="space-y-2">
                    <div className="h-64 w-full bg-[#0b1326] border border-[#3e484f] rounded-lg p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[...pcdResult.compatibilidade].sort((a, b) => b.iar - a.iar).map((c, i) => ({ ...c, posicao: i + 1 }))}
                          layout="vertical"
                          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
                        >
                          <XAxis type="number" domain={[0, 'dataMax']} tick={{ fill: '#bdc8d1', fontSize: 10 }} />
                          <YAxis type="category" dataKey="modalidade" width={150} tick={{ fill: '#dae2fd', fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#131b2e', border: '1px solid #3e484f', borderRadius: 8, fontSize: 11 }}
                            labelStyle={{ color: '#dae2fd' }}
                            formatter={(v) => [`IAR ${Number(v).toFixed(2)} (bruto)`, t('colunaCompatibilidade')]}
                          />
                          <Bar dataKey="iar" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: '#38bdf8', fontSize: 10, formatter: (v) => Number(v).toFixed(2) }}>
                            {[...pcdResult.compatibilidade].sort((a, b) => b.iar - a.iar).map((c, i) => (
                              <Cell key={displayValue(c.modalidade)} fill={i === 0 ? '#38bdf8' : i === 1 ? '#60a5fa' : i === 2 ? '#34d399' : '#475569'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <ol className="space-y-1">
                      {[...pcdResult.compatibilidade].sort((a, b) => b.iar - a.iar).map((c, i) => (
                        <li key={displayValue(c.modalidade)} className="flex items-center justify-between bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-1.5">
                          <span className="text-[11px] font-semibold text-[#dae2fd]">{i + 1}. {displayValue(c.modalidade)}</span>
                          <span className="text-[10px] text-[#38bdf8] font-black">{t('colunaIar')} {c.iar.toFixed(2)} / {c.maxIar ?? 36} {t('iarNormalizado')} {c.iarNormalizado != null ? c.iarNormalizado.toFixed(2) : '0.00'}/3</span>
                        </li>
                      ))}
                    </ol>
                    <p className="text-[10px] text-[#bdc8d1]/50">{t('notaIar')}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#bdc8d1]/50">{t('vazioMatriz')}</p>
                )}
              </div>

              {pcdResult && pcdResult.funil.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('tituloFunil')}</label>
                  <ol className="space-y-1">
                    {pcdResult.funil.map((f) => (
                      <li key={f.momento} className="bg-[#0b1326] border border-[#3e484f]/60 rounded-lg px-3 py-1.5">
                        <p className="text-[10px] font-black text-[#38bdf8] uppercase tracking-wider">{f.momento}. {f.titulo}</p>
                        <p className="text-[10px] text-[#bdc8d1]/70 mt-0.5">{f.regra}</p>
                      </li>
                    ))}
                  </ol>
                  <p className="text-[10px] text-[#bdc8d1]/50 mt-1">{t('notaFunil')}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoParecerTecnico')}</label>
                <textarea
                  value={displayValue(pcdOpinion)}
                  onChange={(e) => setPcdOpinion(e.target.value)}
                  rows={3}
                  placeholder={t('calculadoSeVazio')}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#3e484f]/25">
                <button 
                  type="button"
                  onClick={() => setShowPcdModal(false)}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  {ta('cancelar')}
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg text-xs"
                >
                  {editingPcd ? t('botaoSalvarRevisao') : t('botaoEntregarAvaliacao')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. HIGIENE BUCAL MODAL (HU-DBI) */}
      {showOralModal && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150 scrollbar-thin">
            <button 
              onClick={() => setShowOralModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              {editingOral ? t('tituloRevisarOral') : t('tituloNovoOral')}
            </h4>

            <form onSubmit={handleSaveOral} className="space-y-4">
              {/* Modal unified filters for selective student searching */}
              <div className="p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">{t('filtrarAlunosTitulo')}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('contrato')}</label>
                    <select 
                      value={modalContract}
                      onChange={(e) => {
                        setModalContract(e.target.value);
                        setModalState('');
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneContrato')}</option>
                      <option value="Todos">{ta('todosContratos')}</option>
                      {availableContracts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('estado')}</label>
                    <select 
                      value={modalState}
                      onChange={(e) => {
                        setModalState(e.target.value);
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneEstado')}</option>
                      {modalContract === 'Todos' && <option value="Todos">{ta('todosEstados')}</option>}
                      {modalAvailableStates.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('regiao')}</label>
                    <select 
                      value={modalRegion}
                      onChange={(e) => {
                        setModalRegion(e.target.value);
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneRegiao')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos') && <option value="Todos">{ta('todasRegioes')}</option>}
                      {modalAvailableRegions.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('localidade')}</label>
                    <select 
                      value={modalLocality}
                      onChange={(e) => setModalLocality(e.target.value)}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneLocalidade')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos' || modalRegion === 'Todos' || modalRegion === 'Todas') && <option value="Todos">{ta('todasLocalidades')}</option>}
                      {modalAvailableLocalities.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('botaoAvaliarAluno')}</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={!!editingOral}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]"
                >
                  <option value="">{t('selecioneAluno')}</option>
                  {renderStudentOptions('oral')}
                </select>
                {renderStudentAgeNote('oral')}
              </div>

              <div className="p-4 bg-[#131b2e] border border-[#3e484f]/40 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#3e484f]/20 pb-2 mb-2">
                  <span className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4" />
                    {t('oralHeader')}{oralQuestions.length} {t('unidadeAfirmacoes')})
                  </span>
                </div>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                  {oralQuestions.map((q, i) => (
                    <div key={q.id} className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[#bdc8d1] block leading-relaxed">
                        {i + 1}. {displayValue(q.statement)}
                      </label>
                      <select
                        value={oralAnswers[i] === true ? '1' : oralAnswers[i] === false ? '0' : ''}
                        onChange={(e) => {
                          const next = [...oralAnswers];
                          next[i] = e.target.value === '' ? null : e.target.value === '1';
                          setOralAnswers(next);
                        }}
                        className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                      >
                        <option value="">{ta('selecione')}</option>
                        <option value="1">{ORAL_ANSWER_LABELS[0]}</option>
                        <option value="0">{ORAL_ANSWER_LABELS[1]}</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoPontuacao12')}</label>
                  <input type="text" readOnly value={oralResult ? oralResult.score : ''} className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none" placeholder={t('placeholderAuto')} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoClassificacao')}</label>
                  <input type="text" readOnly value={oralResult ? displayValue(oralResult.classification) : ''} className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none" placeholder={t('placeholderAuto')} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoParecerTecnico')}</label>
                <div className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 whitespace-pre-wrap leading-relaxed min-h-[3rem]">
                  {oralOpinion || t('calculadoAutomatico')}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#3e484f]/25">
                <button 
                  type="button"
                  onClick={() => setShowOralModal(false)}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  {ta('cancelar')}
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg text-xs"
                >
                  {editingOral ? t('botaoSalvarRevisao') : t('botaoEntregarAvaliacao')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. AUTOCONCEITO MODAL (Escala de Rosenberg) */}
      {showAutoModal && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150 scrollbar-thin">
            <button 
              onClick={() => setShowAutoModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              {editingAuto ? t('tituloRevisarAuto') : t('tituloNovoAuto')}
            </h4>

            <form onSubmit={handleSaveAuto} className="space-y-4">
              {/* Modal unified filters for selective student searching */}
              <div className="p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">{t('filtrarAlunosTitulo')}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('contrato')}</label>
                    <select 
                      value={modalContract}
                      onChange={(e) => {
                        setModalContract(e.target.value);
                        setModalState('');
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneContrato')}</option>
                      <option value="Todos">{ta('todosContratos')}</option>
                      {availableContracts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('estado')}</label>
                    <select 
                      value={modalState}
                      onChange={(e) => {
                        setModalState(e.target.value);
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneEstado')}</option>
                      {modalContract === 'Todos' && <option value="Todos">{ta('todosEstados')}</option>}
                      {modalAvailableStates.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('regiao')}</label>
                    <select 
                      value={modalRegion}
                      onChange={(e) => {
                        setModalRegion(e.target.value);
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneRegiao')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos') && <option value="Todos">{ta('todasRegioes')}</option>}
                      {modalAvailableRegions.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('localidade')}</label>
                    <select 
                      value={modalLocality}
                      onChange={(e) => setModalLocality(e.target.value)}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneLocalidade')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos' || modalRegion === 'Todos' || modalRegion === 'Todas') && <option value="Todos">{ta('todasLocalidades')}</option>}
                      {modalAvailableLocalities.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('botaoAvaliarAluno')}</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={!!editingAuto}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]"
                >
                  <option value="">{t('selecioneAluno')}</option>
                  {getFilteredModalStudents().map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-[#131b2e] border border-[#3e484f]/40 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#3e484f]/20 pb-2 mb-2">
                  <span className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4" />
                    {t('autoHeader')}{autoQuestions.length} {t('unidadeAfirmacoes')})
                  </span>
                </div>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                  {autoQuestions.map((q, i) => (
                    <div key={q.id} className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[#bdc8d1] block leading-relaxed">
                        {i + 1}. {displayValue(q.statement)}
                        {q.itemType === 'negative' && <span className="ml-1 text-[9px] text-rose-400 font-bold">{t('marcadorNegativo')}</span>}
                      </label>
                      <select
                        value={autoAnswers[i] ?? ''}
                        onChange={(e) => {
                          const next = [...autoAnswers];
                          next[i] = e.target.value as AutoconceptAnswerCode;
                          setAutoAnswers(next);
                        }}
                        className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                      >
                        <option value="">{ta('selecione')}</option>
                        {AUTOCONCEPT_ANSWER_CODES.map(code => (
                          <option key={code} value={code}>{code} — {AUTOCONCEPT_ANSWER_LABELS[code]}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoPontuacao30')}</label>
                  <input type="text" readOnly value={autoResult ? autoResult.score : ''} className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none" placeholder={t('placeholderAuto')} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoClassificacao')}</label>
                  <input type="text" readOnly value={autoResult ? displayValue(autoResult.classification) : ''} className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none" placeholder={t('placeholderAuto')} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoParecerTecnico')}</label>
                <div className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 whitespace-pre-wrap leading-relaxed min-h-[3rem]">
                  {autoOpinion || t('calculadoAutomatico')}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#3e484f]/25">
                <button 
                  type="button"
                  onClick={() => setShowAutoModal(false)}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  {ta('cancelar')}
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg text-xs"
                >
                  {editingAuto ? t('botaoSalvarRevisao') : t('botaoEntregarAvaliacao')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. INDICE ALIMENTAR MODAL (IAS) */}
      {showIasModal && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150 scrollbar-thin">
            <button 
              onClick={() => setShowIasModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              {editingIas ? t('tituloRevisarIas') : t('tituloNovoIas')}
            </h4>

            <form onSubmit={handleSaveIas} className="space-y-4">
              {/* Modal unified filters for selective student searching */}
              <div className="p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">{t('filtrarAlunosTitulo')}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('contrato')}</label>
                    <select 
                      value={modalContract}
                      onChange={(e) => {
                        setModalContract(e.target.value);
                        setModalState('');
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneContrato')}</option>
                      <option value="Todos">{ta('todosContratos')}</option>
                      {availableContracts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('estado')}</label>
                    <select 
                      value={modalState}
                      onChange={(e) => {
                        setModalState(e.target.value);
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneEstado')}</option>
                      {modalContract === 'Todos' && <option value="Todos">{ta('todosEstados')}</option>}
                      {modalAvailableStates.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('regiao')}</label>
                    <select 
                      value={modalRegion}
                      onChange={(e) => {
                        setModalRegion(e.target.value);
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneRegiao')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos') && <option value="Todos">{ta('todasRegioes')}</option>}
                      {modalAvailableRegions.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('localidade')}</label>
                    <select 
                      value={modalLocality}
                      onChange={(e) => setModalLocality(e.target.value)}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneLocalidade')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos' || modalRegion === 'Todos' || modalRegion === 'Todas') && <option value="Todos">{ta('todasLocalidades')}</option>}
                      {modalAvailableLocalities.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('botaoAvaliarAluno')}</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={!!editingIas}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]"
                >
                  <option value="">{t('selecioneAluno')}</option>
                  {getFilteredModalStudents().map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-[#131b2e] border border-[#3e484f]/40 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#3e484f]/20 pb-2 mb-2">
                  <span className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4" />
                    {t('iasHeader')}{iasQuestions.length} {t('unidadeComponentes')})
                  </span>
                </div>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                  {iasQuestions.map((q, i) => (
                    <div key={q.id} className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[#bdc8d1] block leading-relaxed">
                        {i + 1}. {displayValue(q.statement)}
                      </label>
                      <select
                        value={iasAnswers[i] >= 0 ? String(iasAnswers[i]) : ''}
                        onChange={(e) => {
                          const next = [...iasAnswers];
                          next[i] = e.target.value === '' ? -1 : Number(e.target.value);
                          setIasAnswers(next);
                        }}
                        className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                      >
                        <option value="">{ta('selecione')}</option>
                        <option value="0">{displayValue(q.option1Text)} ({q.option1Points} {t('unidadePontos')})</option>
                        <option value="1">{displayValue(q.option2Text)} ({q.option2Points} {t('unidadePontos')})</option>
                        <option value="2">{displayValue(q.option3Text)} ({q.option3Points} {t('unidadePontos')})</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoPontuacao100')}</label>
                  <input type="text" readOnly value={iasResult ? `${iasResult.score}` : ''} className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none" placeholder={t('placeholderAuto')} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoClassificacao')}</label>
                  <input type="text" readOnly value={iasResult ? displayValue(iasResult.classification) : ''} className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none" placeholder={t('placeholderAuto')} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoParecerTecnico')}</label>
                <div className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 whitespace-pre-wrap leading-relaxed min-h-[3rem]">
                  {iasOpinion || t('calculadoAutomatico')}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#3e484f]/25">
                <button 
                  type="button"
                  onClick={() => setShowIasModal(false)}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  {ta('cancelar')}
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg text-xs"
                >
                  {editingIas ? t('botaoSalvarRevisao') : t('botaoEntregarAvaliacao')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. RASTREAMENTO DO TDAH MODAL (SNAP-IV) */}
      {showSnapModal && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-3xl max-h-[92dvh] overflow-y-auto rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150 scrollbar-thin">
            <button 
              onClick={() => setShowSnapModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              {editingSnap ? t('botaoRevisarSnap') : t('botaoNovoSnap')}
            </h4>

            <form onSubmit={handleSaveSnap} className="space-y-4">
              {/* Modal unified filters for selective student searching */}
              <div className="p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">{t('filtrarAlunosTitulo')}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('contrato')}</label>
                    <select 
                      value={modalContract}
                      onChange={(e) => {
                        setModalContract(e.target.value);
                        setModalState('');
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneContrato')}</option>
                      <option value="Todos">{ta('todosContratos')}</option>
                      {availableContracts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('estado')}</label>
                    <select 
                      value={modalState}
                      onChange={(e) => {
                        setModalState(e.target.value);
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneEstado')}</option>
                      {modalContract === 'Todos' && <option value="Todos">{ta('todosEstados')}</option>}
                      {modalAvailableStates.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('regiao')}</label>
                    <select 
                      value={modalRegion}
                      onChange={(e) => {
                        setModalRegion(e.target.value);
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneRegiao')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos') && <option value="Todos">{ta('todasRegioes')}</option>}
                      {modalAvailableRegions.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('localidade')}</label>
                    <select 
                      value={modalLocality}
                      onChange={(e) => setModalLocality(e.target.value)}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneLocalidade')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos' || modalRegion === 'Todos' || modalRegion === 'Todas') && <option value="Todos">{ta('todasLocalidades')}</option>}
                      {modalAvailableLocalities.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('botaoAvaliarAluno')}</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={!!editingSnap}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]"
                >
                  <option value="">{t('selecioneAluno')}</option>
                  {renderStudentOptions('snap')}
                </select>
                {renderStudentAgeNote('snap')}
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('quemPreenheu')}</label>
                <select 
                  value={snapRespondent}
                  onChange={(e) => setSnapRespondent(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                >
                  <option value="">{ta('selecione')}</option>
                  {SNAP_RESPONDENT_LABELS.map((label) => (
                    <option key={displayValue(label)} value={displayValue(label)}>{displayValue(label)}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-[#131b2e] border border-[#3e484f]/40 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#3e484f]/20 pb-2 mb-2">
                  <span className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4" />
                    {t('snapHeader')}{snapQuestions.length} {t('unidadeItens')})
                  </span>
                  <span className="text-[10px] text-[#bdc8d1]/60">{t('escalaFrequencia')}</span>
                </div>

                <div className="space-y-4 max-h-[330px] overflow-y-auto pr-1 scrollbar-thin">
                  {snapQuestions.map((q, i) => (
                    <div key={q.id} className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[#bdc8d1] block leading-relaxed">
                        {i + 1}. {displayValue(q.statement)}
                        <span className={`ml-2 text-[10px] font-bold ${i < 9 ? 'text-[#8ed5ff]' : 'text-violet-400'}`}>
                          [{i < 9 ? t('subescalaDesatencao') : t('subescalaHiperatividade')}]
                        </span>
                      </label>
                      <select
                        value={snapAnswers[i] >= 0 ? String(snapAnswers[i]) : ''}
                        onChange={(e) => {
                          const next = [...snapAnswers];
                          next[i] = e.target.value === '' ? -1 : Number(e.target.value);
                          setSnapAnswers(next);
                        }}
                        className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                      >
                        <option value="">{ta('selecione')}</option>
                        {SNAP_LIKERT_LABELS.map((label, idx) => (
                          <option key={displayValue(label)} value={idx}>{displayValue(label)} ({idx})</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#3b1d0a]/40 border border-[#f59e0b]/30 rounded-lg space-y-1.5">
                <p className="text-[10px] font-bold text-[#fbbf24] uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {t('alertaRastreamento')}
                </p>
                <p className="text-[11px] text-[#bdc8d1]/90 leading-relaxed">
                  {t('notaSnapLonga')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('itensDesatencao')}</label>
                  <input type="text" readOnly value={snapResult ? `${snapResult.inattention}` : ''} className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none" placeholder={t('placeholderAuto')} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('itensHiperImpulsividade')}</label>
                  <input type="text" readOnly value={snapResult ? `${snapResult.hyperactivity}` : ''} className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none" placeholder={t('placeholderAuto')} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoClassificacao')}</label>
                <input type="text" readOnly value={snapResult ? displayValue(snapResult.classification) : ''} className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none" placeholder={t('placeholderAuto')} />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoParecerTecnico')}</label>
                <textarea 
                  value={displayValue(snapOpinion)}
                  onChange={(e) => setSnapOpinion(e.target.value)}
                  rows={4}
                  placeholder={t('calculadoDaClassificacao')}
                  className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] outline-none min-h-[5rem] leading-relaxed reset-field"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#3e484f]/25">
                <button 
                  type="button"
                  onClick={() => setShowSnapModal(false)}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  {ta('cancelar')}
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg text-xs"
                >
                  {editingSnap ? t('botaoSalvarRevisao') : t('botaoEntregarAvaliacao')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. RASTREAMENTO PRECOCE DO TEA (AQ-10) MODAL */}
      {showAq10Modal && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-3xl max-h-[92dvh] overflow-y-auto rounded-xl shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in duration-150 scrollbar-thin">
            <button 
              onClick={() => setShowAq10Modal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-[#131b2e] rounded-full text-[#bdc8d1] hover:text-[#dae2fd] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider mb-4 border-b border-[#3e484f]/30 pb-2">
              {editingAq10 ? t('botaoRevisarAq10') : t('botaoNovoAq10')}
            </h4>

            <form onSubmit={handleSaveAq10} className="space-y-4">
              {/* Modal unified filters for selective student searching */}
              <div className="p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">{t('filtrarAlunosTitulo')}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('contrato')}</label>
                    <select 
                      value={modalContract}
                      onChange={(e) => {
                        setModalContract(e.target.value);
                        setModalState('');
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneContrato')}</option>
                      <option value="Todos">{ta('todosContratos')}</option>
                      {availableContracts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('estado')}</label>
                    <select 
                      value={modalState}
                      onChange={(e) => {
                        setModalState(e.target.value);
                        setModalRegion('');
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneEstado')}</option>
                      {modalContract === 'Todos' && <option value="Todos">{ta('todosEstados')}</option>}
                      {modalAvailableStates.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('regiao')}</label>
                    <select 
                      value={modalRegion}
                      onChange={(e) => {
                        setModalRegion(e.target.value);
                        setModalLocality('');
                      }}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneRegiao')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos') && <option value="Todos">{ta('todasRegioes')}</option>}
                      {modalAvailableRegions.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#bdc8d1] block mb-0.5">{ta('localidade')}</label>
                    <select 
                      value={modalLocality}
                      onChange={(e) => setModalLocality(e.target.value)}
                      disabled={!isUserAdmin}
                      className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-2 py-1 text-[11px] text-[#dae2fd] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('selecioneLocalidade')}</option>
                      {(modalContract === 'Todos' || modalState === 'Todos' || modalRegion === 'Todos' || modalRegion === 'Todas') && <option value="Todos">{ta('todasLocalidades')}</option>}
                      {modalAvailableLocalities.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('botaoAvaliarAluno')}</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    if (!editingAq10) {
                      const std = students.find(s => s.id === e.target.value);
                      setAq10Version(aq10VersionForAge(calculateStudentAge(std?.birthDate)));
                      setAq10Answers(Array(10).fill(-1));
                      setAq10Result(null);
                      setAq10Opinion('');
                    }
                  }}
                  disabled={!!editingAq10}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]"
                >
                  <option value="">{t('selecioneAluno')}</option>
                  {renderStudentOptions('aq10')}
                </select>
                {renderStudentAgeNote('aq10')}
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('versaoInstrumento')}</label>
                <select 
                  value={aq10Version}
                  onChange={(e) => {
                    const nextVersion = e.target.value as Aq10Version;
                    setAq10Version(nextVersion);
                    setAq10Answers(Array(10).fill(-1));
                    setAq10Result(null);
                    setAq10Opinion('');
                  }}
                  disabled={!!editingAq10}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                >
                  {(() => {
                    // Exibe apenas a versao do instrumento relacionada a idade do
                    // aluno selecionado; sem aluno (ou data de nascimento) mostra
                    // as duas opcoes.
                    const optsAq10Version = editingAq10
                      ? [aq10Version]
                      : (() => {
                          const stdVersion = students.find(s => s.id === selectedStudentId);
                          const ageVersion = stdVersion ? getStudentAgeYears(stdVersion.birthDate) : null;
                          if (ageVersion == null) return ['crianca', 'adolescente'] as Aq10Version[];
                          return [aq10VersionForAge(ageVersion)];
                        })();
                    return optsAq10Version.map(v => (
                      <option key={v} value={v}>{AQ10_VERSION_LABELS[v]}</option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('quemPreenheu')}</label>
                <select 
                  value={aq10Respondent}
                  onChange={(e) => setAq10Respondent(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                >
                  <option value="">{ta('selecione')}</option>
                  {AQ10_RESPONDENT_LABELS.map((label) => (
                    <option key={displayValue(label)} value={displayValue(label)}>{displayValue(label)}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-[#131b2e] border border-[#3e484f]/40 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#3e484f]/20 pb-2 mb-2">
                  <span className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4" />
                    {t('aq10Header')} {displayValue(AQ10_VERSION_LABELS[aq10Version])} ({aq10Questions.filter(q => q.version === aq10Version).length} {t('unidadeItens')})
                  </span>
                  <span className="text-[10px] text-[#bdc8d1]/60">{t('escalaConcordo')}</span>
                </div>

                <div className="space-y-4 max-h-[330px] overflow-y-auto pr-1 scrollbar-thin">
                  {aq10Questions.filter(q => q.version === aq10Version).map((q, i) => (
                    <div key={q.id} className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[#bdc8d1] block leading-relaxed">
                        {i + 1}. {displayValue(q.statement)}
                      </label>
                      <select
                        value={aq10Answers[i] >= 0 ? String(aq10Answers[i]) : ''}
                        onChange={(e) => {
                          const next = [...aq10Answers];
                          next[i] = e.target.value === '' ? -1 : Number(e.target.value);
                          setAq10Answers(next);
                        }}
                        className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
                      >
                        <option value="">{ta('selecione')}</option>
                        {AQ10_LIKERT_LABELS.map((label, idx) => (
                          <option key={displayValue(label)} value={idx}>{displayValue(label)} ({idx})</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#3b1d0a]/40 border border-[#f59e0b]/30 rounded-lg space-y-1.5">
                <p className="text-[10px] font-bold text-[#fbbf24] uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {t('alertaRastreamento')}
                </p>
                <p className="text-[11px] text-[#bdc8d1]/90 leading-relaxed">
                  {t('notaAq10Longa')}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoPontuacao10')}</label>
                <input type="text" readOnly value={aq10Result ? `${aq10Result.totalScore}` : ''} className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none" placeholder={t('placeholderAuto')} />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoClassificacao')}</label>
                <input type="text" readOnly value={aq10Result ? displayValue(aq10Result.classification) : ''} className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd]/85 cursor-not-allowed outline-none" placeholder={t('placeholderAuto')} />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#bdc8d1] block mb-1">{t('campoParecerTecnico')}</label>
                <textarea 
                  value={displayValue(aq10Opinion)}
                  onChange={(e) => setAq10Opinion(e.target.value)}
                  rows={4}
                  placeholder={t('calculadoDaClassificacao')}
                  className="w-full bg-[#0b1326]/50 border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] outline-none min-h-[5rem] leading-relaxed reset-field"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#3e484f]/25">
                <button 
                  type="button"
                  onClick={() => setShowAq10Modal(false)}
                  className="px-4 py-2 bg-[#0b1326] hover:bg-[#131b2e] border border-[#3e484f]/60 rounded-lg text-xs text-[#bdc8d1]"
                >
                  {ta('cancelar')}
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg text-xs"
                >
                  {editingAq10 ? t('botaoSalvarRevisao') : t('botaoEntregarAvaliacao')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
