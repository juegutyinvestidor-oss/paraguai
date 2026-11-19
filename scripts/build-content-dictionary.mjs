import {readFileSync, writeFileSync} from 'node:fs';

const backup = JSON.parse(readFileSync('backups/full_2026-10-07-1157/database_tables.json', 'utf8'));
const locales = ['pt-PT', 'es-PY', 'gn-PY', 'en'];
const skip = /url|email|hash|token|date|created_at|updated_at|id$|cpf|phone|password/i;
const pt = /[ãõáéíóúâêôçÁÉÍÓÚÃÕÂÊÔÇ]/;
let failed = false;

const eligible = new Map();
for (const [table, data] of Object.entries(backup.tables)) {
  const fields = new Set();
  for (const row of data.rows ?? []) {
    for (const [field, value] of Object.entries(row)) {
      if (typeof value === 'string' && value.length > 8 && !skip.test(field) && pt.test(value)) fields.add(field);
    }
  }
  if (fields.size) eligible.set(table, fields);
}

for (const locale of locales) {
  const translations = JSON.parse(readFileSync(`content/${locale}.json`, 'utf8'));
  const generated = {};

  for (const [table, rows] of Object.entries(translations)) {
    const sourceRows = backup.tables[table]?.rows ?? [];
    const byId = new Map(sourceRows.map((row) => [String(row.id), row]));
    for (const [id, fields] of Object.entries(rows)) {
      const source = byId.get(String(id));
      if (!source) {
        failed = true;
        console.error(`[content] ${locale}: linha ${table}:${id} não existe no backup`);
        continue;
      }
      for (const [field, value] of Object.entries(fields)) {
        const sourceText = source[field];
        if (typeof sourceText !== 'string' || !sourceText) {
          failed = true;
          console.error(`[content] ${locale}: campo ${table}:${id}:${field} não é texto no backup`);
          continue;
        }
        if (typeof value !== 'string' || !value) {
          failed = true;
          console.error(`[content] ${locale}: tradução vazia em ${table}:${id}:${field}`);
          continue;
        }
        generated[`${table}:${field}:${sourceText}`] = value;
      }
    }
  }

  const sorted = Object.fromEntries(Object.entries(generated).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(`content/generated/${locale}.json`, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`[content] ${locale}: ${Object.keys(sorted).length} entradas geradas.`);
}

for (const [table, fields] of eligible) {
  const total = (backup.tables[table].rows ?? []).reduce(
    (sum, row) => sum + [...fields].filter((field) => typeof row[field] === 'string' && row[field]).length,
    0
  );
  const covered = Object.keys(JSON.parse(readFileSync('content/generated/en.json', 'utf8'))).filter((key) => key.startsWith(`${table}:`)).length;
  console.log(`[coverage] ${table}: ${covered}/${total}`);
}

if (failed) process.exit(1);
