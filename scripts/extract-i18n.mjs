import {readFileSync, writeFileSync} from 'node:fs';

const scan = JSON.parse(readFileSync('reports/i18n-scan.json', 'utf8'));
const locales = ['pt-BR', 'pt-PT', 'es-PY', 'gn-PY', 'en'];

const slug = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'texto';

const namespace = (path) =>
  path
    .replace(/\\/g, '/')
    .replace(/^app\/\[locale\]\//, '')
    .replace(/^app\//, '')
    .replace(/^components\//, '')
    .replace(/^lib\//, '')
    .replace(/\.[jt]sx?$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

const grouped = new Map();
for (const file of scan.files) {
  const ns = namespace(file.path);
  for (const item of file.items) {
    const key = `${ns}.${slug(item.value)}`;
    const existing = grouped.get(item.value);
    if (existing) {
      existing.locations.push({file: file.path, line: item.line});
      continue;
    }
    grouped.set(item.value, {
      key,
      source: item.value,
      kind: item.kind,
      occurrences: 1,
      locations: [{file: file.path, line: item.line}],
      messages: Object.fromEntries(locales.map((locale) => [locale, locale === 'pt-BR' ? item.value : '']))
    });
  }
}

const entries = [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key));
const report = {
  generatedAt: new Date().toISOString(),
  source: 'reports/i18n-scan.json',
  uniqueStrings: entries.length,
  locales,
  entries
};

writeFileSync('reports/i18n-pending.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(`[i18n:extract] ${entries.length} strings únicas prontas para tradução em reports/i18n-pending.json`);
