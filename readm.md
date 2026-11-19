# EDUKYNE — Retomada de trabalho (18/11/2026)

## Objetivo
Traduzir todo o front-end para 5 idiomas sem alterar o Supabase: `pt-BR` (padrão), `pt-PT`, `es-PY`, `gn-PY` (Guarani) e `en`. Critério de aceite: nenhuma string visível ao usuário permaneça em pt-BR quando o locale não for pt-BR, exceto dados inseridos pelo próprio usuário e textos explicitamente marcados como pendentes.

## Ponto de retomada (18/11/2026)
### Já finalizado
- Infraestrutura i18n completa: `next-intl`, `[locale]`, middleware, navegação, 5 dicionários, seletor de idioma e camada de conteúdo com fallback pt-BR.
- Telas/base zeradas no scan strict: `DashboardView`, `AlunosView`, `ProfissionaisView`, Sidebar, LoginView, erro/not-found e política de privacidade.
- `ProfissionaisView.tsx` foi a última tela concluída: filtros, cards, alertas, modais de cadastro/edição/exclusão e captura de foto traduzidos; reaproveitou chaves de `alunos` e adicionou apenas `profissionais.confirmarRegistro`.
- Validações atuais: `npm run i18n:check` → 291 chaves por idioma; `npm run i18n:scan` → 1.763 ocorrências em 16 arquivos (`ProfissionaisView` fora da lista); `npm run i18n:extract` → 1.006 strings únicas; `npm run lint` → 0 erros e 2 avisos de `exhaustive-deps` na câmera; `npx tsc --noEmit` limpo; `npm run build` aprovado (13 páginas, middleware 46,4 kB).
- `readm.md` e `reports/i18n-scan.json` / `reports/i18n-pending.json` já foram regenerados. Nada foi commitado.

### Falta / próximo passo
- Próxima tela: `components/ContratosView.tsx` (55 ocorrências strict). Depois: `PresencaView` (49), `ModalidadesView` (92), `PerfilView` (39), `ConfiguracoesView` (24), `PlanoAcaoView` (42), `ComparativeStudyView` (22), `app/[locale]/page.tsx` (22), `global-error.tsx` (3), `AvaliacoesView` (571), `QuestionarioView` (713), `PerformanceView` (125).
- Pendências fora de UI: traduzir o restante do conteúdo do Supabase via `content/<locale>.json`, mensagens de API (`app/api/**`), formatação por locale, PDF/DOCX Unicode, rótulos de RBAC/metadata e revisão humana do Guarani.
- Ao retomar: rodar `npm run dev`, traduzir a próxima tela com `t()` manual, validar com `npm run i18n:check`, `npm run i18n:scan`, `npm run i18n:extract`, `npm run lint`, `npx tsc --noEmit`, `npm run build` e atualizar este arquivo.

## Decisões já tomadas
- Supabase permanece em pt-BR. Traduções de conteúdo ficam no front, com fallback para o texto original.
- `next-intl` + App Router com segmento dinâmico `[locale]`.
- `pt-BR` é o default em `/`; os demais usam prefixo (`/pt-PT`, `/es-PY`, `/gn-PY`, `/en`). `/pt-BR` redireciona 307 para `/` — isso é esperado (`localePrefix: 'as-needed'`).
- Seletor de idioma disponível na tela de login e no sidebar (após login).
- Guarani será revisado por falante nativo; a versão atual usa empréstimos do espanhol e já teve alguns erros grosseiros corrigidos, mas não é definitiva.
- Nada foi commitado ainda. Não usar `git commit` sem pedido explícito.

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

## Baseline atualizado (após Dashboard + Alunos + Profissionais, 18/11/2026)
- Modo strict: **1.763 ocorrências em 16 arquivos** (baseline inicial: 2.082/19; após Dashboard+Alunos: 1.885/17).
  - `jsx-text`: 1.525
  - `attribute` (`title`, `placeholder`, `aria-label`, `alt`): 184
  - `dialog` (`alert`/`confirm`): 54
- **1.006 strings únicas** prontas para tradução em `reports/i18n-pending.json` (baseline inicial: 1.131; após Dashboard+Alunos: 1.052).
- Concentração atual:
  - `components/QuestionarioView.tsx` — 713
  - `components/AvaliacoesView.tsx` — 571
  - `components/PerformanceView.tsx` — 125
  - `components/ModalidadesView.tsx` — 92
  - `components/ContratosView.tsx` — 55
  - `components/PresencaView.tsx` — 49
  - `components/PlanoAcaoView.tsx` — 42
  - `components/PerfilView.tsx` — 39
  - `components/ConfiguracoesView.tsx` — 24
  - `app/[locale]/page.tsx` — 22
  - `components/ComparativeStudyView.tsx` — 22
  - `app/[locale]/politica-privacidade/page.tsx` — 3
  - `app/global-error.tsx` — 3
  - `components/Header.tsx` — 1 (`EDUKYNE`)
  - `components/LoginView.tsx` — 1 (`EDUKYNE`)
  - `components/Sidebar.tsx` — 1 (`EDUKYNE`)
- Já zerados: `DashboardView`, `AlunosView`, `ProfissionaisView`.
- Regenerar sempre que uma tela for traduzida. Meta final: **0 ocorrências** no modo strict, exceto marca `EDUKYNE` (`Header`, `LoginView`, `Sidebar`), fragmentos `EDU`/`KYNE` e e-mail em `politica-privacidade`, e o tratamento separado de `global-error.tsx`.

## Validações já executadas (todas passaram)
- `npm run i18n:check` → 5 idiomas, 291 chaves cada.
- `npm run content:build` → 72 entradas/idioma; cobertura informada por tabela.
- `npm run i18n:scan` → 1.763 ocorrências em 16 arquivos (strict); `ProfissionaisView` não aparece mais.
- `npm run i18n:extract` → 1.006 strings únicas em `reports/i18n-pending.json`.
- `npm run lint` → 0 erros; 2 avisos `react-hooks/exhaustive-deps` no efeito da câmera (`AlunosView.tsx:443`, `ProfissionaisView.tsx:353`).
- `npx tsc --noEmit` → limpo.
- `npm run build` → compilou, 13 páginas estáticas, middleware 46,4 kB.
- Dev em execução testado via curl:
  - `/` → 200
  - `/es-PY` → 200
  - `/gn-PY` → 200
  - `/en/politica-privacidade` → 200
  - `/pt-BR` → 307 (esperado)

## O que falta (ordem recomendada)
1. **Traduzir telas internas (maior pendência)**: usar `reports/i18n-pending.json` como fila. Ordem sugerida:
   - Próximo: Contratos, Presença, Modalidades, Perfil, Configurações
   - Plano de Ação
   - Avaliações
   - Questionário
   - Performance, Análise Geral, Painel Estatístico, Estudo Comparativo
   - `app/[locale]/page.tsx` (22 strings soltas)
   - `global-error.tsx` (fora do provider — tratamento separado)
2. **Conteúdo do Supabase restante**, ampliando `content/<locale>.json` por tabela:
   - Perguntas curtas: `m9_health_questions`, `m10_oral_questions`, `m11_autoconcept_questions`, `m13_snap_questions`, `m14_aq10_questions`, `ias_questions`
   - Configs: `m2_modalidades_config`, `m3_cenarios`, `m3_impactos`, `m5_capacidades_config`, `m6_modalidades_direcionamento`, `m6_diretrizes_intervencao`
   - Pareceres: `m7_perfis_pareceres`, `m9_perfis_pareceres`, `m10_perfis_pareceres`, `m11_perfis_pareceres`, `m12_perfis_pareceres`, `m13_perfis_pareceres`, `m14_perfis_pareceres`
   - PCD: `m15_pcd_grupos`, `m15_pcd_adaptacoes`, `m15_pcd_modalidades`, `m15_pcd_funil`
   - Assessments e `performance_reports.report` (69 relatórios salvos)
   - Observação: `reportBuilder.ts`, `autoReport.ts` e `comparativeAnalysis.ts` geram texto em pt-BR; o ideal é localizar os templates e regenerar os relatórios, mantendo o dicionário de conteúdo como ponte para os já salvos.
3. **Mensagens de API**: 98 literais em 10 rotas (`app/api/**`). Criar `lib/apiI18n.ts` (cookie `NEXT_LOCALE`, header `x-locale` ou `Accept-Language`) ou trocar por códigos estáveis resolvidos no cliente. Adicionar namespace `api` aos 5 dicionários.
4. **Formatação**: substituir `toLocaleDateString('pt-BR')` em `lib/autoReport.ts` e `localeCompare(..., 'pt-BR')` em `components/QuestionarioView.tsx` e `components/ComparativeStudyView.tsx` por locale ativo.
5. **Documentos gerados**: PDF/DOCX (jspdf/docx) precisam de fonte Unicode para `ã`, `ñ`, `’`; conferir saída em cada idioma.
6. **Imagens/texto embutido**: verificar se `login-bg.webp` contém texto; se sim, criar versões por idioma ou overlay.
7. **RBAC/metadados**: rótulos de papéis/permissões em `lib/rbac.ts` e metadata de `app/[locale]/layout.tsx`.
8. **Revisão final**: `i18n:check`, `content:build`, `i18n:scan` zerado, lint, tsc, build e checklist manual por idioma.

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
