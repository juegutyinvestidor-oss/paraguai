const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Ler variáveis do .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let envVars = {};
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

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];
const anonKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const effectiveKey = serviceKey || anonKey;

// Credenciais do banco (opcional para pg_dump)
const dbUrl = envVars['SUPABASE_DB_URL'];
const dbHost = envVars['SUPABASE_DB_HOST'];
const dbUser = envVars['SUPABASE_DB_USER'];
const dbPassword = envVars['SUPABASE_DB_PASSWORD'];
const dbName = envVars['SUPABASE_DB_NAME'] || 'postgres';
const dbPort = envVars['SUPABASE_DB_PORT'] || '5432';
const dbDiscrete = !!(dbHost && dbUser && dbPassword);

if (!supabaseUrl || !effectiveKey) {
  console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL e chave do Supabase são obrigatórios no .env.local');
  process.exit(1);
}

const BACKUPS_DIR = path.join(__dirname, '..', 'backups');
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-').replace(/-(\d\d)$/, '$1');
const runDir = path.join(BACKUPS_DIR, `full_${stamp}`);

fs.mkdirSync(runDir, { recursive: true });

console.log('📦 Backup COMPLETO Edukyne (banco + storage + json)');
console.log(`   Destino: ${runDir}`);
console.log(`   Modo: ${serviceKey ? '🔑 Service Role (Acesso total)' : '🔒 Anon Key (Defina SUPABASE_SERVICE_ROLE_KEY para ignorar RLS)'}\n`);

const KNOWN_TABLES = [
  'profiles',
  'rbac_permissions',
  'students',
  'modalities',
  'professionals',
  'contratos',
  'imc_assessments',
  'motor_assessments',
  'sport_assessments',
  'vocational_assessments',
  'attendance_records',
  'performance_reports',
  'm2_modalidades_config',
  'questionarios_respostas',
  'aptidao_referenciais',
  'm3_cenarios',
  'm3_impactos',
  'm4_imc_config',
  'm5_capacidades_config',
  'm6_modalidades_direcionamento',
  'm6_diretrizes_intervencao',
  'm7_perfis_pareceres'
];

async function discoverTables() {
  const tableSet = new Set(KNOWN_TABLES);
  if (serviceKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`
        }
      });
      if (res.ok) {
        const spec = await res.json();
        const discovered = Object.keys(spec.definitions || spec.components?.schemas || {});
        discovered.forEach(t => tableSet.add(t));
      }
    } catch (e) {
      // Fallback
    }
  }
  return Array.from(tableSet);
}

// ─────────────────────────────────────────────────────────────
// PARTE 1 — Exportação de Tabelas em JSON (Através da API)
// ─────────────────────────────────────────────────────────────
async function backupJsonTables() {
  console.log('📄 Exportando dados das tabelas em JSON...');
  const supabase = createClient(supabaseUrl, effectiveKey);
  const tablesToExport = await discoverTables();

  const backupData = {
    createdAt: new Date().toISOString(),
    projectUrl: supabaseUrl,
    mode: serviceKey ? 'service_role' : 'anon',
    tables: {}
  };

  let totalRecords = 0;
  let successfulTables = 0;
  let missingTables = 0;

  for (const table of tablesToExport) {
    try {
      process.stdout.write(`   Exportando [${table}]... `);
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        if (error.message.includes('Could not find the table') || error.code === 'PGRST205' || error.code === '42P01') {
          console.log(`⚠️ Não criada no banco (Execute as migrações SQL no Supabase)`);
          missingTables++;
        } else {
          console.log(`❌ Erro (${error.message})`);
        }
      } else {
        const count = data ? data.length : 0;
        totalRecords += count;
        successfulTables++;
        console.log(`✅ ${count} registros`);
        backupData.tables[table] = { count, rows: data };
      }
    } catch (err) {
      console.log(`❌ Erro: ${err.message}`);
    }
  }

  const outFile = path.join(runDir, 'database_tables.json');
  fs.writeFileSync(outFile, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`✅ Tabelas JSON salvas: database_tables.json (${successfulTables} tabelas, ${totalRecords} registros)`);
  if (missingTables > 0) {
    console.log(`⚠️ ${missingTables} tabela(s) pendente(s) de criação via SQL Editor no Supabase Dashboard.`);
  }
  console.log('');
  return true;
}

// ─────────────────────────────────────────────────────────────
// PARTE 2 — Banco de dados via pg_dump (tabelas, auth, RPCs, RLS)
// ─────────────────────────────────────────────────────────────
function findPgDump() {
  const candidates = [];
  if (dbUrl || dbDiscrete) {
    try {
      const probe = spawnSync('pg_dump', ['--version'], { shell: false });
      if (probe.status === 0) candidates.push('pg_dump');
    } catch {}
    const pgRoot = 'C:\\Program Files\\PostgreSQL';
    if (fs.existsSync(pgRoot)) {
      fs.readdirSync(pgRoot)
        .sort((a, b) => Number(b) - Number(a))
        .forEach(v => candidates.push(path.join(pgRoot, v, 'bin', 'pg_dump.exe')));
    }
  }
  return candidates.find(c => c === 'pg_dump' || fs.existsSync(c));
}

async function backupDatabasePgDump() {
  if (!dbUrl && !dbDiscrete) {
    console.log('ℹ️  Credenciais diretas do banco (pg_dump) não configuradas no .env.local.');
    console.log('   (Para dump .sql nativo, adicione SUPABASE_DB_HOST, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD no .env.local)\n');
    return true;
  }
  const pgDump = findPgDump();
  if (!pgDump) {
    console.log('⚠️  pg_dump não encontrado no sistema.\n');
    return false;
  }

  const outFile = path.join(runDir, 'database.dump');
  console.log(`🗄️  Exportando dump nativo PostgreSQL com ${path.basename(pgDump)}...`);

  let args;
  let spawnEnv = process.env;
  if (dbDiscrete) {
    args = ['-h', dbHost, '-p', dbPort, '-U', dbUser, '-d', dbName, '--no-owner', '--no-privileges', '-Fc', '-f', outFile];
    spawnEnv = { ...process.env, PGPASSWORD: dbPassword };
  } else {
    args = ['--no-owner', '--no-privileges', '-Fc', '-d', dbUrl, '-f', outFile];
  }

  const res = spawnSync(pgDump, args, { shell: false, env: spawnEnv });

  if (res.status !== 0 || !fs.existsSync(outFile)) {
    const errOut = res.stderr ? res.stderr.toString().slice(0, 500) : 'erro desconhecido';
    console.error(`❌ Falhou o pg_dump: ${errOut}\n`);
    return false;
  }
  const mb = (fs.statSync(outFile).size / 1024 / 1024).toFixed(2);
  console.log(`✅ Banco nativo salvo: database.dump (${mb} MB)\n`);
  return true;
}

// ─────────────────────────────────────────────────────────────
// PARTE 3 — Arquivos do Storage (todos os buckets)
// ─────────────────────────────────────────────────────────────
async function apiGet(urlPath) {
  const res = await fetch(`${supabaseUrl}${urlPath}`, {
    headers: { Authorization: `Bearer ${effectiveKey}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function apiPost(urlPath, body) {
  const res = await fetch(`${supabaseUrl}${urlPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${effectiveKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

function safeJoin(base, relPath) {
  const target = path.join(base, ...relPath.split('/'));
  if (!target.startsWith(base)) throw new Error(`Caminho inválido: ${relPath}`);
  return target;
}

async function downloadObject(bucket, objPath) {
  const encoded = objPath.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encoded}`, {
    headers: { Authorization: `Bearer ${effectiveKey}` },
  });
  if (!res.ok) throw new Error(`${res.status} ao baixar ${objPath}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const dest = safeJoin(runDir, `storage/${bucket}/${objPath}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function walkBucket(bucket, prefix = '') {
  let files = 0, bytes = 0;
  const items = await apiPost(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
    prefix,
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });
  for (const item of items) {
    const childPath = `${prefix}${item.name}`;
    if (item.id === null) {
      const sub = await walkBucket(bucket, `${childPath}/`);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      bytes += await downloadObject(bucket, childPath);
      files++;
    }
  }
  return { files, bytes };
}

async function backupStorage() {
  let buckets;
  try {
    buckets = await apiGet('/storage/v1/bucket');
  } catch (e) {
    console.log(`ℹ️  Storage buckets não acessíveis sem a SUPABASE_SERVICE_ROLE_KEY no .env.local.\n`);
    return true;
  }
  if (!buckets || !buckets.length) {
    console.log('ℹ️  Nenhum bucket de storage encontrado para copiar.\n');
    return true;
  }
  let totalFiles = 0, totalBytes = 0;
  for (const b of buckets) {
    process.stdout.write(`📁 Bucket "${b.name}"... `);
    try {
      const r = await walkBucket(b.name);
      totalFiles += r.files;
      totalBytes += r.bytes;
      console.log(`${r.files} arquivo(s), ${(r.bytes / 1024 / 1024).toFixed(2)} MB`);
    } catch (e) {
      console.log(`❌ ${e.message.slice(0, 120)}`);
    }
  }
  console.log(`✅ Storage salvo em storage/ (${totalFiles} arquivo(s), ${(totalBytes / 1024 / 1024).toFixed(2)} MB)\n`);
  return true;
}

(async () => {
  const jsonOk = await backupJsonTables();
  const dbOk = await backupDatabasePgDump();
  const stOk = await backupStorage();

  if (jsonOk && dbOk && stOk) {
    console.log(`🎉 Backup finalizado! Arquivos salvos em:\n   ${runDir}`);
  } else {
    console.log('🏁 Backup finalizado com ressalvas — revise as mensagens acima.');
  }
})();
