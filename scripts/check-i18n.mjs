import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const dir = 'messages';
const files = readdirSync(dir).filter((file) => file.endsWith('.json')).sort();
const flatten = (value, prefix = '') =>
  Object.entries(value).flatMap(([key, child]) =>
    child && typeof child === 'object' ? flatten(child, `${prefix}${key}.`) : [`${prefix}${key}`]
  );

const readKeys = (file) => flatten(JSON.parse(readFileSync(join(dir, file), 'utf8'))).sort();
const base = readKeys('pt-BR.json');
let failed = false;

for (const file of files) {
  const keys = readKeys(file);
  const missing = base.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !base.includes(key));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`[i18n] ${file}:`, {missing, extra});
  }
}

if (failed) process.exit(1);
console.log(`[i18n] OK - ${files.length} idiomas, ${base.length} chaves cada.`);
