# EDUKYNE — Retomada de trabalho (19/11/2026)

## Objetivo
Traduzir todo o front-end para 5 idiomas sem alterar o Supabase: `pt-BR` (padrão), `pt-PT`, `es-PY`, `gn-PY` (Guarani) e `en`. Critério de aceite: nenhuma string visível ao usuário permaneça em pt-BR quando o locale não for pt-BR, exceto dados inseridos pelo próprio usuário e textos explicitamente marcados como pendentes.

## PONTO DE CONTINUAÇÃO — MARCADOR (20/11/2026 — atualizado para 2.503 chaves/idioma)
### Estado atual (última sessão)
- Infraestrutura i18n completa: `next-intl`, `[locale]`, middleware, navegação, 5 dicionários, seletor de idioma e camada de conteúdo com fallback pt-BR.
- UI zerada no scan strict: `DashboardView`, `AlunosView`, `ProfissionaisView`, `ContratosView`, `PresencaView`, `ModalidadesView`, `PlanoAcaoView`, `PerfilView`, `ConfiguracoesView`, `ComparativeStudyView`, `app/[locale]/page.tsx`, `AvaliacoesView`, `QuestionarioView`, `PerformanceView` e `global-error.tsx`.
- `global-error.tsx` fora do provider: monta `NextIntlClientProvider` próprio e detecta idioma por cookie `NEXT_LOCALE` → path → `navigator.language`.
- Dicionários UI por namespace: `contratos` (41), `presenca` (59), `modalidades` (41), `planoAcao` (50), `perfil` (50), `configuracoes` (37), `comparativo` (120), `appShell` (33), `avaliacoes` (563), `questionario` (546), `desempenho` (475), `globalError` (3), `rbac` (34) e `api` (70) — todos com paridade nos 5 idiomas.
- `lib/comparativeAnalysis.ts` usa `AnalysisTranslator`/`comparativo.analise`; `lib/rbac.ts` expõe `PERMISSION_LABEL_KEYS` e `app/[locale]/layout.tsx` gera metadata por locale.
- API localizada: `lib/apiI18n.ts` resolve locale por `x-locale` → cookie `NEXT_LOCALE` → referer → `Accept-Language`; 103 ocorrências em 10 rotas usam o namespace `api`, incluindo ICU `{name}` em `plano-acao`.
- **Relatórios localizados nesta sessão**: criado `lib/reportI18n.ts` com `createReportTranslator`, `displayValue`/`DISPLAY_KEYS` e `localizeAssessmentReport`; reusa 115 chaves do namespace `desempenho` e cobre todos os focos (`Corporal`, `Capacidades Físicas`, `Esportivas`, `Vocacional`, `Saúde Global`, `Higiene Bucal`, `Autoconceito`, `Índice Alimentar`, `TDAH`, `TEA`, `Qualidade Motora PCD`, `Escolar`, `Completo`).
- `lib/reportBuilder.ts` permanece inalterado e é usado apenas em `pt-BR`; `PerformanceView` e `lib/autoReport.ts` chamam `localizeAssessmentReport` para os demais locales. `autoReport.ts` preserva `gn-PY` bruto para mensagens (`currentUiLocale`) e usa o mapeamento `gn-PY` → `es-PY` apenas em `Intl` (`currentReportLocale`).
- Valores canônicos gravados no Supabase seguem em pt-BR; apenas a exibição é traduzida. Os 69 `performance_reports.report` passam a ser regenerados no locale ativo; o texto antigo em pt-BR é substituído ao abrir/regenerar no idioma escolhido.
- Validações finais da sessão: `npm run i18n:check` → **2.503 chaves por idioma**; `npm run i18n:scan` → **6 ocorrências em 4 arquivos** (todas intencionais); `npm run i18n:extract` → **4 strings únicas**; `npm run lint` → 0 erros/2 avisos prévios; `npx tsc --noEmit` limpo; `npm run build` OK (13 páginas, middleware 46,4 kB); teste de `createTranslator` com `api` e com as 115 chaves de `reportI18n` → 0 falhas nos 5 idiomas.
- `readm.md`, `reports/i18n-scan.json` e `reports/i18n-pending.json` atualizados; scripts temporários removidos. O trabalho da sessão anterior foi commitado como `94f7630 attv4` (o commit `bb47b5a` continha apenas o trabalho até `ProfissionaisView`).

### Atualização (20/11/2026 — continuação)
- `content/<locale>.json` ampliado com **6 tabelas de perguntas** (122 strings/idioma), **18 tabelas de configuração, pareceres e PCD** (461 strings/idioma) e **9 tabelas de assessments** (58 strings/idioma: pareceres técnicos de vocacional/saúde/bucal/autoconceito/IAS/TDAH/TEA/PCD, prática recomendada e direcionamento). `content:build` gera **551 entradas por idioma**.
- Foram traduzidos apenas campos de texto exibido; campos usados como valor canônico em filtros/comparações (`name`, `category`, `level`, `profile`, `classification`, `grupo`, `teste`, `status`, `requirements`, `idade`, `sexo`) permanecem em pt-BR. `m2_modalidades_config.requirements` é um JSON de classificações canônicas e não deve ser traduzido.
- `lib/contentI18n.ts` ganhou `delocalizeRows`; `lib/dbFacade.ts` converte valores traduzidos de volta ao canônico antes de qualquer `upsert`/`insert`, eliminando o risco de a edição de configs em outro idioma gravar texto localizado no Supabase.
- Rótulos canônicos: novo namespace `canonical` (31 chaves por idioma) e helper `displayCanonical` em `lib/reportI18n.ts`. `displayValue` ganhou fallback canônico. Aplicado em `DashboardView` (gráficos de esporte, vocação e PCD), `ComparativeStudyView` (matriz/PDF/chart), `AvaliacoesView` (esporte sugerido, PDF/Excel/tabela) e `QuestionarioView` (tabelas de configuração e selects PCD). Os valores gravados permanecem canônicos; a tradução é apenas de exibição.
- Relatórios: `lib/reportI18n.ts` já contém `localizeAssessmentReport` com 115 chaves `tpl*`/`texto*`/`valor*` por idioma. `localizeAssessmentReport` agora recebe `locale`, e `displayValue` usa `displayCanonical` nos valores dinâmicos (classificações, perfis, modalidades, grupos/testes PCD) sem traduzir `evaluationResult` gravado. `PerformanceView` (prévia e auto-save) e `autoReport` passam o locale ativo; `buildAssessmentReport` permanece como fonte pt-BR.
- Validações após a mudança: `i18n:check` 2.444 chaves/idioma; `i18n:scan` 6 ocorrências/4 arquivos (intencionais); `i18n:extract` 4 strings; `content:build` 551 entradas/idioma; `lint` 0 erros/2 avisos prévios; `tsc --noEmit` limpo; `build` OK (13 páginas, middleware 46,4 kB).
- Estado do git: `94f7630 attv4` contém todo o trabalho de i18n até a sessão anterior; as mudanças desta continuação ainda **não** foram commitadas.

### Atualização (20/11/2026 — rótulos remanescentes e PDF Unicode)
- Namespace `canonical` ampliado para **40 chaves por idioma** (`Peso Ideal`, AQ-10, testes PCD e `Força/Resistência (Membros Sup.)`); `i18n:check` agora reporta **2.454 chaves por idioma**.
- `displayValue`/`displayCanonical` passaram a cobrir IMC, níveis motores, classificações de Saúde Global/Higiene Bucal/Autoestima/IAS/TDAH/TEA, perfis PCD, status de adaptação, notas PCD, cenários e dimensões do Dashboard.
- Rótulos crus eliminados em exports/tabelas de `AvaliacoesView` (PDF/Excel/JSX), selects/tabelas de `QuestionarioView`, gráficos de `DashboardView` e ternários AQ-10 em `PerformanceView`. Parecer PCD padrão gerado no frontend usa `avaliacoes.tplParecerPcdPadrao`, preservando o valor gravado como texto já localizado no ato do save.
- `buildComparativeAnalysis` recebe um quarto argumento opcional `localizeLabel`; `ComparativeStudyView` passa `displayCanonical(label, locale)`. A polaridade continua calculada sobre rótulos canônicos, mas títulos/frases/PDF exibem o idioma ativo.
- PDF Unicode: `public/fonts/NotoSans-Regular.ttf` e `NotoSans-Bold.ttf` embedados por `lib/pdfFont.ts` (`setupPdfFont`), registrados como `helvetica` normal/bold para que `autoTable` herde a fonte. Todos os fluxos de PDF passaram a fazer `await setupPdfFont(doc)`. Não há geração DOCX real no código (dependência `docx` existe, mas não é usada).
- Validações desta fase: `i18n:check` 2.454 chaves/idioma; `i18n:scan` 6 ocorrências/4 arquivos (intencionais); `i18n:extract` 4 strings; `content:build` 551 entradas/idioma; `lint` 0 erros/2 avisos prévios; `tsc --noEmit` limpo; `build` OK (13 páginas, middleware 46,4 kB).

### Atualização (20/11/2026 — exports, prosa PCD e validação)
- Exports Excel/PDF localizados em `AlunosView`, `PresencaView`, `ModalidadesView` e `AvaliacoesView`: cabeçalhos, abas, títulos, filtros, nomes de arquivo e datas via namespace `exp*` + `useLocale()`.
- Texto gerado PCD localizado: `avaliacoes.tplPcdDirecionamento`, `valorAguardandoAvaliacaoCompleta`, templates de funil/adaptações; `displayCanonical` agora traduz prosa canônica residual para `es-PY`/`gn-PY`/`en`.
- `AvaliacoesView` e `QuestionarioView`: detalhes, unidades, notas, descrições de grupos/modalidades e laudos passam por `displayValue`/`displayCanonical`; `PlanoAcaoView` usa datas por locale e `planoAcao.nomeArquivoPadrao`.
- Validações finais desta fase: `i18n:check` **2.503 chaves por idioma**; `i18n:scan` 6/4 (intencionais); `i18n:extract` 4; `content:build` 551/idioma; `lint` 0 erros/2 avisos prévios; `tsc --noEmit` limpo; `build` OK (13 páginas, middleware 46,4 kB).
- Pendência conhecida: algumas traduções antigas geradas por glossário em `desempenho` ainda soam como pt-BR/inglês misto; revisar antes de considerar o texto de relatório definitivo.

### Fechamento da sessão (20/11/2026) — inventário completo do que foi feito
- **Dicionários (`messages/<locale>.json`)**: paridade em 5 idiomas subiu de 2.413 → 2.503 chaves. Namespace `canonical` ficou com 40 chaves. Foram adicionadas/consolidadas chaves para:
  - `canonical`: `pesoIdeal`, níveis/capacidades, testes PCD, AQ-10, PCD, cenários, dimensões e status/notas PCD.
  - `alunos`: `expNome`, `expEmail`, `expMatricula`, `expTurma`, `expLocalidade`, `expLocalidadePadrao`, `expContrato`, `expEstado`, `expRegiao`, `expCpf`, `expTelefone`, `expResponsavel`, `expNascimento`, `expStatus`, `expGeradoEmAs`, `expFiltrosAtivosAlunos`, `expTituloPdfAlunos`, `expAbaAlunos`, `expArquivoAlunos`.
  - `presenca`: `expPresencas`, `expFaltas`, `expFrequencia`, `expFrequenciaSimples`, `expDatasPresenca`, `expDatasFalta`, `expAbaPresenca`, `expArquivoPresenca`, `expTituloPdfPresenca`, `expFiltrosAtivosPresenca`.
  - `modalidades`: `campoProfissional`, `avisoCamposObrigatorios`, `prefixoProf`, `profSemNome`, `expAbaMatriculados`, `expArquivoMatriculados`, `expTituloPdfMatriculados`, `expProfessorCategoria`, `expUnidadeGerado`, `expLocalidadePadrao`.
  - `avaliacoes`: `tplParecerPcdPadrao`, `tplIarBruto`, `tplPcdDirecionamento`, `valorAguardandoAvaliacaoCompleta`, `tplPcdFunilItem`, `tplPcdAdaptacaoItem`, `tplExemploValor`, `expArquivoAvaliacoes`.
  - `desempenho`: `tplPcdFunilItem`, `tplPcdAdaptacaoItem`.
  - `planoAcao`: `nomeArquivoPadrao`.
- **`lib/reportI18n.ts`**: `DISPLAY_KEYS`/`CANONICAL_KEYS` ampliados; `displayValue`/`displayCanonical` passaram a cobrir IMC, níveis motores, classificações, perfis/status/notas PCD, cenários, dimensões, AQ-10, `Ativo`/`Inativo`, `Aguardando avaliação completa` e `Abaixo do peso`. `displayCanonical` também traduz prosa canônica residual para `es-PY`/`gn-PY`/`en` via dicionários locais (`PROSE_ES`/`PROSE_EN`) e trata frases de `Pré-seleção (matriz física): ...` com `tplPcdDirecionamento`.
- **`lib/comparativeAnalysis.ts` / `components/ComparativeStudyView.tsx`**: `buildComparativeAnalysis` ganhou 4º argumento opcional `localizeLabel`; polaridade continua sobre rótulos canônicos, mas saída textual/PDF usa `displayCanonical(label, locale)`.
- **`lib/autoReport.ts` / `lib/pdfFont.ts` / `public/fonts/`**: regeneração no locale ativo preservando observações do educador; PDFs com fonte Unicode `NotoSans` registrada como `helvetica` para `jsPDF`/`autoTable`. Não existe geração DOCX real.
- **`lib/contentI18n.ts` / `lib/dbFacade.ts`**: `delocalizeRows` converte valores traduzidos de volta ao canônico antes de escrita no Supabase; somente texto descritivo é traduzido.
- **`components/AlunosView.tsx`**: Excel/PDF localizados (cabeçalhos, aba, título, filtros, data e nomes de arquivo) e `useLocale()` adicionado.
- **`components/PresencaView.tsx`**: Excel/PDF localizados (cabeçalhos, presenças/faltas/frequência, datas, aba, título, filtros e nomes de arquivo) e `useLocale()` adicionado.
- **`components/ModalidadesView.tsx`**: alerta de campos obrigatórios e professor localizados; Excel/PDF de matriculados localizados; `useLocale()` adicionado; fallback `coach`/`category` com `-`.
- **`components/AvaliacoesView.tsx`**: rótulos canônicos em PDF/Excel/tabela/JSX, parecer PCD padrão, tooltip `tplIarBruto`, `direcionamento`/funil/adaptações PCD, detalhes, unidades, notas e nomes de arquivo localizados.
- **`components/QuestionarioView.tsx`**: rótulos PCD, IMC (`Abaixo do peso` incluído), descrições/laudos de grupos e modalidades, unidades de testes e placeholders locais via `displayValue`/`displayCanonical`. Inputs editáveis de regras PCD foram preservados como dados canônicos para não corromper o Supabase.
- **`components/DashboardView.tsx`**: dimensões e labels de gráficos via `displayCanonical`; série de frequência trocada para `matriculasAcumuladas`/`frequenciaPct`/`ausenciaPct`; tooltips usam `matriculas`/`frequencia`/`ausencia`; `TooltipEntry.dataKey` tipado.
- **`components/PerformanceView.tsx`**: ternários AQ-10 por chaves `t`; fallbacks de parecer/observação por chaves; funil e adaptações PCD localizados; preview/auto-save usam `localizeAssessmentReport`.
- **`components/PlanoAcaoView.tsx`**: `formatDate(date, locale)` e fallback `planoAcao.nomeArquivoPadrao`.
- **Validações executadas ao final**: `i18n:check` OK (5 idiomas, 2.503 chaves); `i18n:scan` 6 ocorrências/4 arquivos (intencionais); `i18n:extract` 4 strings; `content:build` 551 entradas/idioma; `lint` 0 erros/2 avisos prévios (`AlunosView.tsx:445`, `ProfissionaisView.tsx:353`); `npx tsc --noEmit` limpo; `npm run build` OK (13 páginas, middleware 46,4 kB).
- **Git**: HEAD permanece `94f7630 attv4`; nenhum commit foi criado. Há alterações não commitadas nos arquivos listados acima, mais `lib/pdfFont.ts` e `public/fonts/` como untracked.

### MARCADOR PARA CONTINUAR DEPOIS (20/11/2026)
- **Estado congelado**: 5 idiomas com 2.503 chaves/idioma; scan/extract/content/lint/tsc/build passando; alterações ainda não commitadas.
- **Próximo trabalho imediato, nesta ordem**:
  1. Revisar e corrigir traduções antigas geradas por glossário no namespace `desempenho`, especialmente `textoParabenizamosPeloOtimoHistoricoFisicoContinuaremosDesafiando`, `textoOIndiceIndicaUmFatorDeRisco`, `textoDiagnosticamosNoAEstudanteUmaEstruturaCognitiva`, `tplDownloadConcluidoAddedcountRelatoriosForamExportados`, `uiConsultandoFrequenciaDoEstudanteNoSistemaEletronico` e `tplFrequenciaEscolarAcumuladaRateStatusResumoDo`.
  2. Fazer a conferência visual por idioma: telas, PDFs (`ã`, `ñ`, `’`), Excel e gráficos; validar especialmente exports e tooltips alterados nesta sessão.
  3. Regenerar os 69 `performance_reports.report` no locale ativo pela tela de Performance (“Preencher relatórios”); observações do educador devem ser preservadas.
  4. Revisão humana obrigatória do Guarani antes de declarar a tradução definitiva.
  5. Não traduzir as 6 ocorrências restantes do scan: marca `EDUKYNE` (Header/Login/Sidebar) e `EDU`/`KYNE`/`lgpd@edukyne.com.br` em `politica-privacidade`.
  6. Ao finalizar, rodar novamente `npm run i18n:check`, `npm run i18n:scan`, `npm run i18n:extract`, `npm run content:build`, `npm run lint`, `npx tsc --noEmit`, `npm run build`; só commitar se o usuário pedir explicitamente.

## Decisões já tomadas
- Supabase permanece em pt-BR. Traduções de conteúdo ficam no front, com fallback para o texto original.
- `next-intl` + App Router com segmento dinâmico `[locale]`.
- `pt-BR` é o default em `/`; os demais usam prefixo (`/pt-PT`, `/es-PY`, `/gn-PY`, `/en`). `/pt-BR` redireciona 307 para `/` — isso é esperado (`localePrefix: 'as-needed'`).
- Seletor de idioma disponível na tela de login e no sidebar (após login).
- Guarani será revisado por falante nativo; a versão atual usa empréstimos do espanhol e já teve alguns erros grosseiros corrigidos, mas não é definitiva.
- Valores canônicos de geometria (`ESTADOS_LIST`, séries pré-definidas e o fallback `São Paulo` em `ContratosView`) permanecem em pt-BR de propósito: são gravados no Supabase e usados em filtros; traduzi-los geraria dados incompatíveis entre idiomas. A estratégia de rótulos localizados com valores canônicos preservados usa `displayCanonical` e `delocalizeRows`.
- Em `AvaliacoesView`, classificações, níveis motores, respostas e itens de questionários permanecem em pt-BR como valores gravados/comparados; o helper `displayValue` + `DISPLAY_KEYS` traduz apenas a exibição, inclusive em PDF/Excel, sem alterar a lógica.
- Nos dicionários de conteúdo, apenas texto descritivo é traduzido. Identificadores, classificações, níveis e demais valores usados em filtros/gravações permanecem canônicos em pt-BR; `delocalizeRows` garante que edições feitas em outro idioma não persistam valores traduzidos.
- Relatórios de performance já salvos serão regenerados no locale ativo (decisão do usuário); `buildAssessmentReport` permanece a fonte canônica em pt-BR e `localizeAssessmentReport` produz o texto exibido/gravado por idioma. As anotações do educador sempre são preservadas.
- Marca/identidade (`EDUKYNE`, `EDU`, `KYNE`, `lgpd@edukyne.com.br`) não é traduzida (decisão do usuário); as 6 ocorrências do scan são intencionais.
- Não usar `git commit` sem pedido explícito.

## Contexto anterior (antes do i18n)
- Remote GitHub: `origin https://github.com/juegutyinvestidor-oss/paraguai.git` — considerado concluído.
- Supabase recriado e validado: 53/53 tabelas, `validate_login` presente, seeds aplicados.
- Dados restaurados do backup `backups/full_2026-10-07-1157`: 51/51 tabelas, 2.874 linhas e 258 arquivos de storage.
- Scripts de backup/restore já existem (`npm run restore`, `npm run backup-full`).
- `.env.local` está no `.gitignore` e contém as chaves Supabase/sessão. **Nunca exibir valores de chaves.**
- Vercel ainda não foi configurada. Variáveis a configurar depois: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`.
- Execution policy do PowerShell já foi liberada para o usuário (`RemoteSigned`), então `npm run dev` funciona direto.

## Concluído nesta sessão de i18n
1. Instalado `next-intl@4.15.1` e adicionado ao `package.json`.
2. Criados:
   - `i18n/routing.ts` (5 locales, default `pt-BR`, `as-needed`)
   - `i18n/navigation.ts` (`Link`, `useRouter`, `usePathname`)
   - `i18n/request.ts` (carrega `messages/<locale>.json`)
   - `middleware.ts` (com matcher que exclui `api`, `_next`, arquivos)
   - `next.config.ts` envolvido por `createNextIntlPlugin`
3. Rotas movidas para `app/[locale]/`:
   - `layout.tsx` (async, valida locale, `<html lang={locale}>`, `NextIntlClientProvider`)
   - `page.tsx` (imports `../` ajustados para `../../`)
   - `error.tsx`, `not-found.tsx`, `politica-privacidade/page.tsx`
   - `global-error.tsx` permaneceu na raiz e ainda está em pt-BR (não há provider nesse ponto).
4. `components/LanguageSwitcher.tsx` criado; integrado em:
   - `components/Sidebar.tsx:278` (rodapé, acima do mini-perfil)
   - `components/LoginView.tsx:116` (cartão de login)
5. Dicionários UI criados em `messages/`: `pt-BR.json`, `pt-PT.json`, `es-PY.json`, `gn-PY.json`, `en.json` — **291 chaves iguais em todos**.
   - Namespaces: `common`, `sidebar`, `header`, `login`, `errors`, `legal`, `dashboard`, `alunos`, `profissionais` (32 chaves).
   - Validação: `npm run i18n:check`.
6. Traduzidos: sidebar/menu, cabeçalho mobile, login (incluindo erros locais), páginas de erro, not-found e política de privacidade inteira.
7. Links internos `/politica-privacidade` trocados por `Link` do `i18n/navigation` em `LoginView`, `not-found` e `ConfiguracoesView`.
8. Camada de conteúdo criada sem tocar no Supabase:
   - `content/<locale>.json` (formato `tabela → id → campo`)
   - `scripts/build-content-dictionary.mjs` gera `content/generated/<locale>.json` com chaves `tabela:campo:textoOriginal`
   - `npm run content:build`
   - `lib/contentI18n.ts` (`currentLocale`, `loadContentTranslations`, `localizeRows`)
   - `lib/dbFacade.ts` intercepta leituras do Supabase e aplica o dicionário do locale ativo; fallback pt-BR garante que nada quebre.
9. Lote 1 de conteúdo traduzido: `voc_questions` (60 strings) + `m4_imc_config` (12 strings) = **72 entradas por idioma**.
10. Fase 1 de automação/inventário implementada:
    - `scripts/i18n-scan.mjs` → `npm run i18n:scan` → `reports/i18n-scan.json`
    - `scripts/extract-i18n.mjs` → `npm run i18n:extract` → `reports/i18n-pending.json`
    - `npm run i18n:scan -- --wide` inclui literais de texto com acentuação (modo mais amplo, mais ruído).
    - `scripts/wrap-i18n.mjs` (codemod) **ainda não foi criado** — decisão: aplicar `t()` manualmente por tela, com scan validando o resultado.
11. Fase 2 iniciada:
    - `components/DashboardView.tsx` totalmente traduzido (namespace `dashboard`): filtros, KPIs, gráficos, tooltips, legendas, níveis motores e fallbacks; `ColumnChartCard` também usa `useTranslations`.
    - `components/AlunosView.tsx` totalmente traduzido (namespace `alunos`): alertas de upload/câmera/campo, filtros, tabela, paginação, credenciais, LGPD, modais de cadastro/edição/exclusão e captura de foto; link da política usa `Link` do `i18n/navigation`.
    - Ambos saíram do scan strict; nenhuma ocorrência restante.
    12. `components/ProfissionaisView.tsx` totalmente traduzido: filtros, busca, cards, alertas, modais de cadastro/edição/exclusão, captura de foto e chaves reutilizadas de `alunos`; única chave nova adicionada foi `profissionais.confirmarRegistro`.

## Concluído em 19/11/2026
1. `components/ContratosView.tsx` totalmente traduzido (namespace `contratos`, 41 chaves em 5 idiomas): alertas de validação, busca, cards hierárquicos e fallback legado, botões, modais de cadastro/edição e confirmação de exclusão; mensagem de lista vazia usa interpolação do rótulo `novoContrato`.
2. Rodadas `i18n:check`, `i18n:scan`, `i18n:extract`, `lint`, `tsc` e `build` após a mudança.
3. `components/PresencaView.tsx` totalmente traduzido (namespace `presenca`, 59 chaves em 5 idiomas): cabeçalho do diário do aluno, filtros encadeados, meses, lista de alunos, indicadores, chamada diária, estatísticas e footer de sincronização; aliases reutilizados de `alunos` (`todosContratos`, `todosEstados`, `todasRegioes`, `todasLocalidades`, `todasTurmas`, `cpf`, `exportarExcel`, `excel`, `exportarPdf`, `pdf`). Interpolations ICU e plurais validados nos 5 locales.
4. `components/ModalidadesView.tsx` totalmente traduzido (namespace `modalidades`, 41 chaves em 5 idiomas): header, filtros, criação/edição, categorias (valor canônico preservado), cards, matrícula, exportações e confirmação de exclusão; aliases reutilizados de `alunos` (`contrato`, `estado`, `regiao`, `localidade`, `todosContratos`, `todosEstados`, `todasRegioes`, `todasLocalidades`, `selecione`, `cancelar`, `salvarAlteracoes`, `excel`, `pdf`, `confirmarExclusao`).
5. `components/PlanoAcaoView.tsx` totalmente traduzido (namespace `planoAcao`, 50 chaves em 5 idiomas): header, estados de carregamento/erro, pastas, tabela de PDFs, visualizador, modais de criação/upload/exclusão e notificações (inclusive literais em `setNotice`/`setUploadErrors`, fora do scan strict); pluralizações ICU validadas e `t` adicionado às dependências de `loadData`.
6. `components/PerfilView.tsx` totalmente traduzido (namespace `perfil`, 50 chaves em 5 idiomas): dados cadastrais, upload de avatar, troca de senha, matriz RBAC por cargo, categorias e manual de operações com `t.rich`; aliases reutilizados de `alunos` (`erroUploadFoto`, `fotoPerfilAlt`, `enviando`, `trocarFoto`); literais de estado/ternários e fallbacks de erro também traduzidos. `PERMISSION_LABELS` foi posteriormente localizado via namespace `rbac`.
7. `components/ConfiguracoesView.tsx` totalmente traduzido (namespace `configuracoes`, 37 chaves em 5 idiomas): console LGPD Art. 18, registro por titular externo, tabela de solicitações, status/tipos traduzidos, ações, datas com `useLocale()` e rodapé DPO com `t.rich`; aliases reutilizados de `alunos` (`status`, `acoes`). Mensagens de erro/estado fora do scan strict também traduzidas.
8. `components/ComparativeStudyView.tsx` totalmente traduzido (namespace `comparativo`, 120 chaves em 5 idiomas): filtros encadeados, KPIs, gráficos, matriz comparativa, análise automática e PDF. `lib/comparativeAnalysis.ts` deixou de emitir texto fixo em pt-BR: `buildComparativeAnalysis(recortes, stats, tr)` usa `AnalysisTranslator` com o prefixo `comparativo.analise`; `locale` ativo aplicado em `localeCompare`, `toLocaleString` e data do PDF.
9. `app/[locale]/page.tsx` totalmente traduzido (namespace `appShell`, 31 chaves em 5 idiomas): bloqueios RBAC (com `t.rich` para `<strong>`), fallback de carregamento, status Supabase/offline, mensagens de sincronização/erro via objeto `StatusError` resolvido no render e modal de ação negada. `PERMISSION_LABELS` em `lib/rbac.ts` foi posteriormente localizado via namespace `rbac`.
10. `components/AvaliacoesView.tsx` totalmente traduzido (namespace `avaliacoes`, 563 chaves em 5 idiomas): filtros, tabelas, 11 abas de avaliação, modais, questionários, gráficos, PDF e Excel; `DISPLAY_KEYS` + `displayValue` preservam valores canônicos e traduzem rótulos dinâmicos/classificações na exibição; `useLocale()` aplicado em datas e números.
11. `components/QuestionarioView.tsx` totalmente traduzido (namespace `questionario`, 546 chaves em 5 idiomas): 15 módulos de configuração, CRUDs, tabelas de referência, cenários, pareceres, questionários, matriz PCD, impressão e máscaras; `DISPLAY_KEYS` + `displayValue` preservam valores canônicos em salvamentos/comparações e traduzem a exibição; `localeCompare`, datas e formatação usam `useLocale()`.
12. `components/PerformanceView.tsx` totalmente traduzido (namespace `desempenho`, 475 chaves em 5 idiomas): filtros, Painel Estatístico, Análise Geral, histórico, PDF/ZIP, impressão e todos os templates de relatório; `DISPLAY_KEYS` + `displayValue` cobrem valores canônicos, classificações, fallbacks e longos pareceres padrão; strings ocultas do scan (ternários, `alert`, template literals e PDF) também passaram por `t()`/ICU; formatação por `useLocale()`.
13. `app/global-error.tsx` traduzido (namespace `globalError`, 3 chaves em 5 idiomas): fora do provider do `[locale]`, agora monta seu próprio `NextIntlClientProvider` com dicionários importados e detecta o idioma por cookie `NEXT_LOCALE`, path e `navigator.language`; `<html lang>` acompanha o idioma detectado.
14. Auditoria de qualidade dos dicionários: 346 valores corrigidos em `es-PY` (105), `gn-PY` (151) e `en` (90), eliminando pt-BR residual e traduções glossário em `avaliacoes`/`desempenho`; placeholders ICU e tags `<strong>` preservados.
15. `lib/rbac.ts`, `app/[locale]/layout.tsx` e `lib/autoReport.ts`: 34 rótulos de permissão traduzidos no namespace `rbac` (`PERMISSION_LABEL_KEYS`; `PERMISSION_LABELS` mantido como fallback compatível), consumidos em `app/[locale]/page.tsx` e `components/PerfilView.tsx`; metadata por locale via `generateMetadata` + `getTranslations` (`appShell.metadadosTitulo`/`metadadosDescricao`); data dos relatórios gerados por `autoReport.ts` usa o `document.documentElement.lang` ativo, com fallback `pt-BR` e mapeamento `gn-PY` → `es-PY` para `Intl`.
16. Mensagens de API localizadas: novo `lib/apiI18n.ts` detecta locale por header `x-locale`, cookie `NEXT_LOCALE`, path do `referer` e `Accept-Language`, e expõe `getApiTranslator(req)` via `createTranslator`; namespace `api` com 70 chaves nos 5 dicionários; 103 ocorrências em 10 rotas (`app/api/**`) substituídas por códigos estáveis, incluindo mensagens dinâmicas com `{name}` em `plano-acao`. `data/route.ts` passou a receber o tradutor em `sanitizeRows`.

## Baseline atualizado (após Dashboard + Alunos + Profissionais + Contratos + Presença + Modalidades + Plano de Ação + Perfil + Configurações + Estudo Comparativo + shell + Avaliações + Questionário + Performance + global-error + RBAC/metadados/autoReport + API, 19/11/2026)
- Modo strict: **6 ocorrências em 4 arquivos** (baseline inicial: 2.082/19; após Dashboard+Alunos: 1.885/17; após Profissionais: 1.763/16; após Contratos: 1.708/15; após Presença: 1.659/14; após Modalidades: 1.567/13; após Plano de Ação: 1.525/12; após Perfil: 1.486/11; após Configurações: 1.462/10; após Estudo Comparativo + shell: 1.418/8; após Avaliações: 847/7; após Questionário: 134/6; após Performance: 9/5; após global-error: 6/4).
  - `jsx-text`: 6
- **4 strings únicas** prontas para tradução em `reports/i18n-pending.json` (baseline inicial: 1.131; após Dashboard+Alunos: 1.052; após Profissionais: 1.006; após Contratos: 973; após Presença: 933; após Modalidades: 896; após Plano de Ação: 863; após Perfil: 824; após Configurações: 804; após Estudo Comparativo + shell: 763; após Avaliações: 553; após Questionário: 122; após Performance: 7; após global-error: 4).
- Concentração atual:
  - `app/[locale]/politica-privacidade/page.tsx` — 3 (`EDU`, `KYNE`, `lgpd@edukyne.com.br`)
  - `components/Header.tsx` — 1 (`EDUKYNE`)
  - `components/LoginView.tsx` — 1 (`EDUKYNE`)
  - `components/Sidebar.tsx` — 1 (`EDUKYNE`)
- Já zerados: `DashboardView`, `AlunosView`, `ProfissionaisView`, `ContratosView`, `PresencaView`, `ModalidadesView`, `PlanoAcaoView`, `PerfilView`, `ConfiguracoesView`, `ComparativeStudyView`, `app/[locale]/page.tsx`, `AvaliacoesView`, `QuestionarioView`, `PerformanceView`, `global-error.tsx`, `app/api/**`.
- Regenerar sempre que uma tela for traduzida. Meta final: **0 ocorrências** no modo strict, exceto marca `EDUKYNE` (`Header`, `LoginView`, `Sidebar`), fragmentos `EDU`/`KYNE` e e-mail em `politica-privacidade`, todos intencionais.

## Validações já executadas (todas passaram)
- `npm run i18n:check` → 5 idiomas, 2.503 chaves cada.
- `npm run content:build` → 551 entradas/idioma; cobertura informada por tabela.
- `npm run i18n:scan` → 6 ocorrências em 4 arquivos (strict); `ComparativeStudyView`, `app/[locale]/page.tsx`, `AvaliacoesView`, `QuestionarioView`, `PerformanceView` e `global-error.tsx` não aparecem mais.
- `npm run i18n:extract` → 4 strings únicas em `reports/i18n-pending.json`.
- `npm run lint` → 0 erros; 2 avisos `react-hooks/exhaustive-deps` no efeito da câmera (`AlunosView.tsx:445`, `ProfissionaisView.tsx:353`).
- `npx tsc --noEmit` → limpo.
- `npm run build` → compilou, 13 páginas estáticas, middleware 46,4 kB.
- Teste rápido de `createTranslator` com namespace `api`: mensagens e ICU `{name}` renderizam corretamente nos 5 idiomas.
- Dev em execução testado via curl:
  - `/` → 200
  - `/es-PY` → 200
  - `/gn-PY` → 200
  - `/en/politica-privacidade` → 200
  - `/pt-BR` → 307 (esperado)

## O que falta (ordem recomendada)
1. **Ocorrências restantes do scan (intencionais)**: `politica-privacidade` (3: `EDU`, `KYNE` e `lgpd@edukyne.com.br`) e marca `EDUKYNE` em Header/Login/Sidebar. Não traduzir sem decisão de produto; `reports/i18n-pending.json` contém apenas essas 4 strings.
2. **Conteúdo do Supabase restante**, ampliando `content/<locale>.json` por tabela:
   - ~~Perguntas curtas: `m9_health_questions`, `m10_oral_questions`, `m11_autoconcept_questions`, `m13_snap_questions`, `m14_aq10_questions`, `ias_questions`~~ (concluído)
   - ~~Configs (texto descritivo), pareceres e PCD~~ (concluído; campos canônicos preservados)
   - ~~Assessments (texto de sistema de 9 tabelas)~~ (concluído)
   - ~~`performance_reports.report` (69 relatórios salvos)~~ (regeneração no locale ativo decidida e implementada); `rbac_permissions` com rótulos já traduzidos no front.
    - ~~Rótulos canônicos principais (`m2.name`, níveis/categorias, perfis/classificações, grupos/testes/status PCD)~~ (concluído via `canonical`/`displayCanonical` em UI, PDF, Excel e análise automática; `reportBuilder.ts` continua canônico em pt-BR por decisão de produto).
    - Observação: `reportBuilder.ts` gera o corpo canônico em pt-BR; `reportI18n.ts` localiza os templates via `localizeAssessmentReport` e `autoReport.ts`/`PerformanceView` já aplicam o locale ativo. `comparativeAnalysis.ts` usa `AnalysisTranslator` e `localizeLabel`. Os 69 relatórios salvos são regenerados no locale ativo preservando observações.
3. **Documentos gerados**: PDF já usa fonte Unicode (`NotoSans`; `ã`, `ñ`, `’`) via `lib/pdfFont.ts`; conferir a saída final por idioma. Não existe geração DOCX real no código (dependência `docx` não é usada).
4. **Imagens/texto embutido**: verificar se `login-bg.webp` contém texto; se sim, criar versões por idioma ou overlay.
5. **Revisão de qualidade textual**: revisar traduções antigas geradas por glossário no namespace `desempenho` (especialmente pareceres e cabeçalhos de relatório) e confirmar a prosa PCD em `es-PY`/`gn-PY`/`en`.
6. **Revisão final**: `i18n:check`, `content:build`, `i18n:scan` com apenas as 6 ocorrências intencionais, lint, tsc, build e checklist manual por idioma.

## Como retomar
```powershell
npm run dev
npm run i18n:scan        # inventário atualizado
npm run i18n:extract     # fila de strings únicas
npm run i18n:check       # paridade de chaves
npm run content:build    # regenera dicionários de conteúdo
npm run lint
npx tsc --noEmit
npm run build
```

## Riscos / atenção
- Guarani: revisão humana obrigatória; não confiar em tradução automática.
- `es-PY` e `pt-PT`: revisar terminologia esportiva/pedagógica (ex.: “Desportivas” em PT-PT, “Rendimiento” em es-PY).
- Trocar idioma recarrega a rota; a aba ativa pode voltar ao Dashboard (estado local em `app/[locale]/page.tsx`).
- Pluralização/ICU e gênero (“o(a) aluno(a)”) precisam de tratamento por idioma.
- Strings iguais com sentidos diferentes devem usar chaves semânticas por tela, não uma chave global.
- Não editar tabelas do Supabase nem rodar `parte_00_schema_base.sql` novamente (ele derruba tabelas).
