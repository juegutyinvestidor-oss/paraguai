import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import ts from 'typescript';

const ROOTS = ['app', 'components', 'lib'];
const EXTS = new Set(['.ts', '.tsx']);
const ATTRS = new Set(['title', 'placeholder', 'aria-label', 'aria-description', 'alt']);
const PORTUGUESE = /[ãõáéíóúâêôçÁÉÍÓÚÃÕÂÊÔÇÑñ]/;
const WIDE = process.argv.includes('--wide');

function listFiles(dir) {
  const output = [];
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      output.push(...listFiles(path));
    } else if (EXTS.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      output.push(path.replace(/\\/g, '/'));
    }
  }
  return output;
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function isTranslated(node) {
  let current = node.parent;
  while (current && !ts.isSourceFile(current)) {
    if (ts.isCallExpression(current)) {
      const expression = current.expression.getText();
      if (expression === 't' || expression === '$t' || expression.endsWith('.t')) return true;
    }
    current = current.parent;
  }
  return false;
}

function collect(file) {
  const text = readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const items = [];

  const add = (node, kind, value, context) => {
    const clean = value.trim();
    if (!clean || clean.length < 2) return;
    if (/^[\d\W_]+$/.test(clean)) return;
    items.push({line: lineOf(sourceFile, node), kind, value: clean, context});
  };

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      add(node, 'jsx-text', node.getText(sourceFile), 'JSX');
    } else if (ts.isJsxAttribute(node) && ATTRS.has(node.name.getText(sourceFile))) {
      const initializer = node.initializer;
      if (initializer && ts.isStringLiteral(initializer)) {
        add(initializer, 'attribute', initializer.text, node.name.getText(sourceFile));
      }
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression.getText();
      const first = node.arguments[0];
      if ((callee === 'alert' || callee === 'confirm' || callee === 'window.alert' || callee === 'window.confirm') && first && ts.isStringLiteral(first)) {
        add(first, 'dialog', first.text, callee);
      }
    } else if (WIDE && ts.isStringLiteral(node) && !isTranslated(node)) {
      const parent = node.parent;
      if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return;
      if (ts.isPropertyAssignment(parent) && parent.name === node) return;
      const value = node.text;
      if (PORTUGUESE.test(value) && /\s/.test(value) && value.length > 5) {
        add(node, 'string-literal', value, ts.SyntaxKind[parent.kind]);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return items;
}

const files = ROOTS.flatMap(listFiles).sort();
const report = {
  generatedAt: new Date().toISOString(),
  mode: WIDE ? 'wide' : 'strict',
  roots: ROOTS,
  totals: {files: 0, occurrences: 0, byKind: {}},
  files: []
};

for (const file of files) {
  const items = collect(file);
  if (!items.length) continue;
  report.files.push({path: file, occurrences: items.length, items});
  report.totals.files += 1;
  report.totals.occurrences += items.length;
  for (const item of items) {
    report.totals.byKind[item.kind] = (report.totals.byKind[item.kind] ?? 0) + 1;
  }
}

report.files.sort((a, b) => b.occurrences - a.occurrences);
writeFileSync('reports/i18n-scan.json', `${JSON.stringify(report, null, 2)}\n`);

console.log(`[i18n:scan] ${report.totals.occurrences} ocorrências em ${report.totals.files} arquivos (${report.mode}).`);
console.log(`[i18n:scan] por tipo: ${JSON.stringify(report.totals.byKind)}`);
for (const file of report.files.slice(0, 15)) {
  console.log(`  ${String(file.occurrences).padStart(4)}  ${file.path}`);
}
console.log('[i18n:scan] relatório completo: reports/i18n-scan.json');
