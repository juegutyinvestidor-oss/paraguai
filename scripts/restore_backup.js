const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envVars = {};

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      envVars[key] = val;
    }
  });
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local');
  process.exit(1);
}

const backupDir = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.join(__dirname, '..', 'backups', 'full_2026-10-07-1157');

const jsonFile = path.join(backupDir, 'database_tables.json');

if (!fs.existsSync(jsonFile)) {
  console.error(`Backup nao encontrado: ${jsonFile}`);
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const BATCH_SIZE = 200;
const PRIMARY_KEYS = { rbac_permissions: 'role' };
const SKIP_TABLES = new Set(['log_entries']);

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json'
};

function chunkRows(rows, size) {
  const chunks = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
}

async function upsertChunk(table, rows, primaryKey) {
  let current = rows;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { error } = await supabase.from(table).upsert(current, { onConflict: primaryKey });
    if (!error) return null;

    const match = /Column ['"]?([A-Za-z0-9_]+)['"]? does not exist/i.exec(error.message || '');
    if (!match || !current[0] || !(match[1] in current[0])) return error;

    const column = match[1];
    current = current.map(row => {
      const copy = { ...row };
      delete copy[column];
      return copy;
    });
  }

  return new Error('nao foi possivel remover colunas incompativeis');
}

async function restoreDatabase() {
  const entries = Object.entries(backup.tables || {})
    .filter(([table, value]) => {
      return !SKIP_TABLES.has(table) && Array.isArray(value.rows) && value.rows.length > 0;
    })
    .sort(([a], [b]) => {
      if (a === 'plano_acao_folders') return -1;
      if (b === 'plano_acao_folders') return 1;
      return 0;
    });

  let totalRows = 0;
  let okTables = 0;
  const failures = [];

  console.log(`Restaurando ${entries.length} tabelas\n`);

  for (const [table, value] of entries) {
    const primaryKey = PRIMARY_KEYS[table] || 'id';
    const chunks = chunkRows(value.rows, BATCH_SIZE);
    let failed = null;

    for (const chunk of chunks) {
      failed = await upsertChunk(table, chunk, primaryKey);
      if (failed) break;
    }

    if (failed) {
      failures.push(`${table}: ${failed.message}`);
      console.log(`FALHA ${table} (${value.rows.length} linhas): ${failed.message}`);
    } else {
      totalRows += value.rows.length;
      okTables += 1;
      console.log(`OK    ${table} (${value.rows.length} linhas)`);
    }
  }

  console.log(`\nBanco: ${okTables}/${entries.length} tabelas, ${totalRows} linhas`);
  return failures;
}

function walkFiles(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkFiles(full));
    } else if (entry.isFile()) {
      result.push(full);
    }
  }

  return result;
}

function guessContentType(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function restoreStorage() {
  const storageRoot = path.join(backupDir, 'storage');
  if (!fs.existsSync(storageRoot)) {
    console.log('Pasta storage/ nao encontrada no backup');
    return [];
  }

  const buckets = fs.readdirSync(storageRoot, { withFileTypes: true }).filter(entry => entry.isDirectory());
  const failures = [];
  let totalFiles = 0;

  console.log(`\nRestaurando ${buckets.length} buckets\n`);

  for (const bucketEntry of buckets) {
    const bucket = bucketEntry.name;
    const bucketRoot = path.join(storageRoot, bucket);
    const { error: bucketError } = await supabase.storage.createBucket(bucket, { public: true });

    if (bucketError && !/already exists/i.test(bucketError.message)) {
      failures.push(`bucket ${bucket}: ${bucketError.message}`);
      console.log(`FALHA bucket ${bucket}: ${bucketError.message}`);
      continue;
    }

    let bucketFiles = 0;
    for (const file of walkFiles(bucketRoot)) {
      const objectPath = path.relative(bucketRoot, file).split(path.sep).join('/');
      const bytes = fs.readFileSync(file);
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, bytes, {
          upsert: true,
          contentType: guessContentType(file)
        });

      if (uploadError) {
        failures.push(`${bucket}/${objectPath}: ${uploadError.message}`);
      } else {
        bucketFiles += 1;
      }
    }

    totalFiles += bucketFiles;
    console.log(`OK    ${bucket} (${bucketFiles} arquivos)`);
  }

  console.log(`\nStorage: ${totalFiles} arquivos`);
  return failures;
}

(async () => {
  const args = new Set(process.argv.slice(2));
  const storageOnly = args.has('--storage-only');
  const withStorage = args.has('--storage') || args.has('--all') || storageOnly;
  const failures = [];

  if (!storageOnly) {
    failures.push(...await restoreDatabase());
  }
  if (withStorage) {
    failures.push(...await restoreStorage());
  }

  if (failures.length) {
    console.log(`\n${failures.length} falha(s):`);
    failures.forEach(item => console.log(`  - ${item}`));
    process.exit(1);
  }

  console.log('\nRestauracao concluida.');
})();
