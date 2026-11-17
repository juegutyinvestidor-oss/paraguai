import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

const OUT_FILE = path.join(process.cwd(), 'docs', 'Edukyne - Apresentacao do Sistema.docx');

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const run = (text, opts = {}) => {
  const rPr = [];
  if (opts.bold) rPr.push('<w:b/>');
  if (opts.italic) rPr.push('<w:i/>');
  if (opts.color) rPr.push(`<w:color w:val="${opts.color}"/>`);
  if (opts.size) rPr.push(`<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>`);
  return `<w:r><w:rPr>${rPr.join('')}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
};

const para = (text, style = 'Normal', opts = {}) => {
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${run(text, opts)}</w:p>`;
};

const bullet = (text) => {
  return `<w:p><w:pPr><w:pStyle w:val="ListBullet"/></w:pPr>${run(text)}</w:p>`;
};

const subbullet = (text) => {
  return `<w:p><w:pPr><w:pStyle w:val="ListBullet2"/></w:pPr>${run(text)}</w:p>`;
};

const spacing = () => `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr></w:p>`;

const cell = (text, width, opts = {}) => {
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="TableText"/></w:pPr>${run(text, opts)}</w:p></w:tc>`;
};

const hCell = (text, width) => {
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:shd w:val="clear" w:fill="1A2B4B"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="TableText"/></w:pPr>${run(text, { bold: true, color: 'FFFFFF' })}</w:p></w:tc>`;
};

const table = (headers, rows) => {
  const widths = headers.map((h) => h[1]);
  const grid = widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('');
  const headerRow = `<w:tr>${headers
    .map(([text, w], i) => (i === 0 ? hCell(text, w) : hCell(text, w)))
    .join('')}</w:tr>`;
  const bodyRows = rows
    .map(
      (r) =>
        `<w:tr>${r.map((c, i) => cell(c, widths[i], { bold: i === 0 && widths.length === 1 })).join('')}</w:tr>`
    )
    .join('');
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblW w:w="9350" w:type="dxa"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${headerRow}${bodyRows}</w:tbl>`;
};

const spacerAfterTable = () => spacing();

const body = [];

// ============================= CAPA =============================
body.push(para('Sistema EDUKYNE', 'Title'));
body.push(para('Gestão Esportiva e Educacional — Documento de Apresentação', 'Subtitle'));
body.push(spacing());
body.push(para('Preparado para apresentação a profissionais, pais/responsáveis e alunos.', 'Normal', { italic: true, color: '5A6572' }));
body.push(spacing());

// ============================= 1. VISÃO GERAL =============================
body.push(para('1. Visão Geral', 'Heading1'));
body.push(para('O Edukyne é um sistema web completo de gestão esportiva e educacional, desenvolvido para apoiar a administração de uma escola de esportes e o acompanhamento integral de cada aluno. Ele reúne em um único lugar o controle administrativo (alunos, contratos, profissionais, modalidades e frequência), o registro de avaliações físicas e vocacionais, questionários de acompanhamento, relatórios de desempenho e a guarda de documentos de plano de ação — tudo com segurança de dados em conformidade com a Lei Geral de Proteção de Dados (LGPD).'));
body.push(para('O sistema funciona pela internet, em navegador (computador, tablet ou celular), com acessos diferenciados por perfil. Os dados ficam armazenados na nuvem com permissões de acesso controladas e registros de auditoria.'));
body.push(spacing());

// ============================= 2. SEGURANÇA =============================
body.push(para('2. Segurança, Privacidade e LGPD', 'Heading1'));
body.push(bullet('Login individual com e-mail e senha, com proteção contra tentativas repetidas (bloqueio temporário).'));
body.push(bullet('Perfis de acesso definidos (Administrador, Gestor, Professor, Estagiário, Assistente e Aluno), cada um com as permissões adequadas ao seu papel.'));
body.push(bullet('Controle de permissões (RBAC): o que cada perfil pode ver, criar, editar e excluir é configurável.'));
body.push(bullet('Registro de auditoria: ações importantes e exportações de dados ficam registradas para fins de rastreabilidade.'));
body.push(bullet('Conformidade LGPD: consentimento de uso de dados (fotos, avaliações e questionários), canais para solicitar cópia, correção, portabilidade ou exclusão de dados, e botão de "Minhas permissões"/exportação dos próprios dados no perfil de cada usuária ou usuário.'));
body.push(spacing());

// ============================= 3. DASHBOARD =============================
body.push(para('3. Dashboard — Painel de Indicadores', 'Heading1'));
body.push(para('A tela inicial resume a saúde da instituição em tempo real:'));
body.push(bullet('KPIs principais: alunos ativos, presenças do dia, percentual de presença do mês, alunos em dia e status das avaliações (ex.: classificações de IMC em situação normal ou crítica).'));
body.push(bullet('Gráficos: evolução de matrículas ao longo do tempo versus frequência mensal, distribuição das classificações de avaliações, faixas de IMC, alertas de questionários (ex.: AQ-10), qualidade motora (PCD), modalidades cadastradas e distribuição por sexo.'));
body.push(bullet('Feriados calculados automaticamente para o controle de presença.'));
body.push(bullet('Uma aluna ou aluno logado visualiza somente os próprios dados e evolução.'));

// ============================= 4. CONTRATOS =============================
body.push(para('4. Gestão de Contratos', 'Heading1'));
body.push(para('O módulo de contratos organiza a operação por uma estrutura hierárquica de Estados → Regiões → Localidades → Séries/Turmas.'));
body.push(bullet('Cadastro e edição de contratos com estrutura hierárquica completa.'));
body.push(bullet('Alocação de alunos e profissionais às localidades de cada contrato.'));
body.push(bullet('Restrições de configuração (limites de regiões e localidades por contrato) para manter a estrutura organizada.'));

// ============================= 5. ALUNOS =============================
body.push(para('5. Cadastro de Alunos', 'Heading1'));
body.push(bullet('Cadastro e matrícula completos, com geração de matrícula e situação Ativo/Inativo.'));
body.push(bullet('Foto do aluno — por upload de imagem ou captura pela câmera.'));
body.push(bullet('Filtros unificados por Contrato → Estado → Região → Localidade → Série/Turma.'));
body.push(bullet('Busca rápida por nome ou número de matrícula.'));
body.push(bullet('Consentimento LGPD no cadastro (finalidades de uso dos dados).'));
body.push(bullet('Exportação da listagem em Excel e PDF.'));

// ============================= 6. PRESENÇA =============================
body.push(para('6. Controle de Presença e Diário de Classe', 'Heading1'));
body.push(bullet('Lançamento de presença por data, localidade e turma.'));
body.push(bullet('Ações rápidas: marcar todos como presentes ou como faltosos e alterar aluno a aluno.'));
body.push(bullet('Indicador mensal de presenças e faltas por aluno.'));
body.push(bullet('Exportação do diário em Excel e PDF.'));

// ============================= 7. PROFISSIONAIS =============================
body.push(para('7. Quadro de Profissionais', 'Heading1'));
body.push(bullet('Cadastro completo de profissionais com foto, CPF e contatos.'));
body.push(bullet('Para Gestores: seleção hierárquica de atuação com limites de Estados (máx. 2), Regiões (máx. 10) e Localidades (máx. 20).'));
body.push(bullet('Filtros por contrato, estado, região e localidade.'));
body.push(bullet('Controle de acesso: professor visualiza apenas suas próprias modalidades (quando aplicável).'));

// ============================= 8. MODALIDADES =============================
body.push(para('8. Modalidades Esportivas', 'Heading1'));
body.push(bullet('Cadastro de modalidades por categoria (esporte, cultura, tecnologia), com treinador/coach, localidade, contrato, status e capacidade de vagas.'));
body.push(bullet('Gestão de vagas: expandir capacidade e matricular/desvincular alunos, com quantidade de vagas restantes.'));
body.push(bullet('Professor visualiza apenas as modalidades sob sua responsabilidade; aluno visualiza as modalidades em que está matriculado.'));
body.push(bullet('Exportação da lista de matriculados em Excel e PDF.'));

// ============================= 9. AVALIAÇÕES =============================
body.push(para('9. Central de Avaliações', 'Heading1'));
body.push(para('A central registra 11 dimensões de avaliação por aluno, com escoramento automático, histórico e exportação:'));
const avalTable = [
  ['Índice de Massa Corporal (IMC)', 'Peso, altura, IMC e classificação (faixas normativas).'],
  ['Avaliação Motora', 'Capacidades físicas: velocidade, agilidade, força, abdominal e impulsão.'],
  ['Desempenho Esportivo', 'Resultados por modalidade esportiva.'],
  ['Direcionamento Vocacional', 'Aptidão e indicação de modalidades conforme perfil.'],
  ['Saúde Global', 'KIDSCREEN-10 — qualidade de vida relacionada à saúde.'],
  ['Higiene Bucal', 'HU-DBI — índice de higiene bucal.'],
  ['Autoconceito', 'Escala de Rosenberg — autoconceito e autoestima.'],
  ['Índice de Alimentação Saudável (IAS)', 'Qualidade da alimentação do aluno.'],
  ['SNAP-IV', 'Rastreamento de sintomas de desatenção e hiperatividade.'],
  ['AQ-10', 'Rastreamento de traços de autismo (versões criança e adolescente).'],
  ['Qualidade Motora PCD', 'Protocolo para crianças/adolescentes com deficiência (grupos de triagem, adaptações por grupo, matriz de pesos e funil qualitativo).']
];
body.push(table([['Avaliação', 'O que mede']], avalTable.map((r) => [r[0], r[1]])));
body.push(spacerAfterTable());
body.push(bullet('Lançamento por professor/administrador, com escoramento e parecer automáticos.'));
body.push(bullet('Histórico completo por aluno — cada avaliação pode ser consultada e exportada em Excel e PDF.'));
body.push(bullet('O aluno visualiza apenas os próprios resultados em formato de cartão consolidado e relatório em PDF.'));
body.push(spacing());

// ============================= 10. QUESTIONÁRIOS =============================
body.push(para('10. Questionários e Referenciais Técnicos (15 Módulos)', 'Heading1'));
body.push(para('Os módulos funcionam como referencial técnico-científico que alimenta as avaliações e o direcionamento vocacional:'));
const qTable = [
  ['M1', 'Referenciais e tabelas de aptidão motora por sexo.'],
  ['M2', 'Direcionamento vocacional — tabela de aptidão por modalidade.'],
  ['M3', 'Análise de frequência escolar (matriz de faltas).'],
  ['M4', 'Tabela de classificação e parecer do IMC.'],
  ['M5', 'Diagnósticos e recomendações — capacidades físicas (velocidade, força, agilidade, abdominal, impulsão).'],
  ['M6', 'Direcionamento por modalidade e diretrizes.'],
  ['M7', 'Mapa de perfis, carreiras e pareceres.'],
  ['M8', 'Banco de perguntas do questionário vocacional.'],
  ['M9', 'Saúde global (KIDSCREEN-10).'],
  ['M10', 'Higiene bucal (HU-DBI).'],
  ['M11', 'Autoconceito — Escala de Rosenberg.'],
  ['M12', 'Índice de alimentação saudável (IAS).'],
  ['M13', 'SNAP-IV (desatenção e hiperatividade).'],
  ['M14', 'AQ-10 (versionado para crianças e adolescentes).'],
  ['M15', 'Qualidade motora PCD — grupos, adaptações, faixas de nota, matriz de pesos e funil qualitativo.']
];
body.push(table([['Módulo', 'Conteúdo']], qTable));
body.push(spacerAfterTable());
body.push(spacing());

// ============================= 11. PERFORMANCE =============================
body.push(para('11. Relatório de Performance', 'Heading1'));
body.push(bullet('Geração de relatórios de desempenho individual por avaliação (IMC, motora, esportiva, vocacional, saúde global, higiene bucal, autoconceito, alimentação, SNAP, AQ-10 e PCD).'));
body.push(bullet('Relatório em PDF com identificação e foto do aluno, pronto para entrega aos pais e responsáveis.'));
body.push(bullet('Exportação em lote por turma/filtro.'));
body.push(bullet('Análise geral em nível institucional e painel estatístico por filtros (turma, contrato, região, localidade).'));
body.push(bullet('Histórico de relatórios gerados, sincronizado e armazenado.'));

// ============================= 12. ESTUDO COMPARATIVO =============================
body.push(para('12. Estudo Comparativo', 'Heading1'));
body.push(bullet('Compara o desempenho de alunos lado a lado por dimensão avaliada.'));
body.push(bullet('Mostra diferenças (deltas) entre avaliações e períodos.'));
body.push(bullet('Gera documento PDF assinado com a comparação.'));

// ============================= 13. PLANO DE AÇÃO =============================
body.push(para('13. Plano de Ação', 'Heading1'));
body.push(bullet('Organiza em pastas os documentos e planos de ação em PDF (ex.: por ano, por turma ou por tema).'));
body.push(bullet('Upload de múltiplos PDFs de uma só vez, visualização e download direto no sistema.'));
body.push(bullet('Acesso de leitura para todos os perfis; Administrador e Gestor criam pastas e enviam documentos.'));
body.push(bullet('Central de documentos: evita trocas de arquivos por e-mail ou aplicativos externos.'));

// ============================= 14. PERFIL =============================
body.push(para('14. Perfil de Usuário', 'Heading1'));
body.push(bullet('Edição de nome, e-mail e foto de perfil.'));
body.push(bullet('Alteração de senha.'));
body.push(bullet('Painel "Minhas permissões" (RBAC) com a matriz de acessos do seu papel.'));
body.push(bullet('Exportação dos próprios dados (direito garantido pela LGPD).'));

// ============================= 15. CONFIGURAÇÕES =============================
body.push(para('15. Configurações e Encarregado de Dados (LGPD)', 'Heading1'));
body.push(bullet('Console do encarregado de dados: registrar solicitações de cópia, correção, exclusão, portabilidade ou revogação de dados.'));
body.push(bullet('Resolução das solicitações é exclusiva do Administrador; Gestor e Professor podem registrar.'));
body.push(bullet('Status e acompanhamento de cada solicitação (pendente, resolvida, recusada).'));

// ============================= 16. PÚBLICOS =============================
body.push(para('16. O que cada público pode fazer', 'Heading1'));
body.push(table(
  [['Público', 'Acesso']],
  [
    ['Administrador', 'Administração completa: todos os módulos, permissões, resolução de solicitações LGPD e exclusões.'],
    ['Gestor', 'Gestão de contratos, alunos, profissionais, modalidades, avaliações e planos de ação; cadastra solicitações LGPD.'],
    ['Professor / Estagiário / Assistente', 'Rotina técnica: presença, avaliações, questionários, relatórios e acompanhamento dos alunos.'],
    ['Aluno', 'Visão dos próprios dados: presenças, avaliações, desempenho e documentos liberados para a sua turma.'],
    ['Pais e responsáveis', 'Acompanham a evolução dos filhos por meio dos relatórios de desempenho e avaliações (PDF) gerados pela equipe — materiais que o sistema centraliza e organiza.']
  ]
));
body.push(spacerAfterTable());
body.push(para('O sistema foi pensado para unir a equipe técnica, a gestão, os alunos e as famílias em um só fluxo de informações confiável e seguro.', 'Normal'));
body.push(spacing());

// ============================= 17. CONCLUSÃO =============================
body.push(para('17. Conclusão', 'Heading1'));
body.push(para('O Edukyne concentra em uma única plataforma o que antes estava espalhado entre planilhas, papel e arquivos: cadastros, frequência, avaliações técnicas, questionários validados cientificamente, relatórios de desempenho e os planos de ação. Com acesso seguro e em conformidade com a LGPD, ele dá à equipe mais agilidade e aos alunos e famílias mais transparência sobre a evolução de cada um.'));
body.push(spacing());
body.push(para('Edukyne — Gestão Esportiva e Educacional. Todos os direitos reservados.', 'Normal', { italic: true, color: '5A6572' }));

// ============================= DOCUMENTO =============================
const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body.join('\n    ')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

// ============================= STYLES =============================
const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:spacing w:after="120"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr><w:spacing w:after="120"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:color w:val="0B1326"/><w:sz w:val="64"/><w:szCs w:val="64"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:pPr><w:spacing w:after="240"/></w:pPr>
    <w:rPr><w:color w:val="1A2B4B"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:keepNext/><w:spacing w:before="360" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="0B5AA8"/><w:sz w:val="34"/><w:szCs w:val="34"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="1A2B4B"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListBullet">
    <w:name w:val="List Paragraph"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:ind w:left="360"/><w:spacing w:after="60"/></w:pPr>
    <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListBullet2">
    <w:name w:val="List Paragraph 2"/>
    <w:basedOn w:val="ListBullet"/>
    <w:pPr><w:ind w:left="720"/></w:pPr>
  </w:style>
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:tblPr><w:tblBorders>
      <w:top w:val="single" w:sz="4" w:color="3E484F"/>
      <w:left w:val="single" w:sz="4" w:color="3E484F"/>
      <w:bottom w:val="single" w:sz="4" w:color="3E484F"/>
      <w:right w:val="single" w:sz="4" w:color="3E484F"/>
      <w:insideH w:val="single" w:sz="4" w:color="3E484F"/>
      <w:insideV w:val="single" w:sz="4" w:color="3E484F"/>
    </w:tblBorders></w:tblPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TableText">
    <w:name w:val="Table Text"/>
    <w:pPr><w:spacing w:after="20"/></w:pPr>
    <w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
  </w:style>
</w:styles>`;

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Sistema EDUKYNE - Apresentacao do Sistema</dc:title>
  <dc:creator>Edukyne</dc:creator>
  <cp:lastModifiedBy>Edukyne</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-09-23T12:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-09-23T12:00:00Z</dcterms:modified>
</cp:coreProperties>`;

const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Edukyne</Application>
  <Company>Edukyne</Company>
</Properties>`;

async function main() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', relsXml);
  zip.file('docProps/core.xml', coreXml);
  zip.file('docProps/app.xml', appXml);
  zip.file('word/document.xml', documentXml);
  zip.file('word/styles.xml', stylesXml);
  zip.file('word/_rels/document.xml.rels', documentRelsXml);

  const buffer = await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  fs.writeFileSync(OUT_FILE, buffer);
  console.log('Documento gerado:', OUT_FILE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});