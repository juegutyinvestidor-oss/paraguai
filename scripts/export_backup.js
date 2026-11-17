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

if (!supabaseUrl || !effectiveKey) {
  console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL e chave do Supabase não encontradas no .env.local');
  process.exit(1);
}

if (!serviceKey) {
  console.log('⚠️ AVISO: SUPABASE_SERVICE_ROLE_KEY não configurada no .env.local.');
  console.log('   Usando ANON KEY. Tabelas com RLS ativado ou sem permissão pública podem vir vazias.\n');
}

const supabase = createClient(supabaseUrl, effectiveKey);

// Lista padrão de tabelas conhecidas do Edukyne
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
      // Fallback para lista conhecida
    }
  }
  return Array.from(tableSet);
}

async function backupDatabase() {
  console.log('📦 Iniciando Backup do Banco de Dados Supabase (Edukyne)...');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Modo: ${serviceKey ? '🔑 Service Role (Acesso total)' : '🔒 Anon Key (Sujeito a RLS)'}\n`);

  const tablesToExport = await discoverTables();

  const backupData = {
    createdAt: new Date().toISOString(),
    projectUrl: supabaseUrl,
    mode: serviceKey ? 'service_role' : 'anon',
    tables: {}
  };

  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  let totalRecords = 0;
  let successfulTables = 0;
  let missingTables = 0;

  for (const table of tablesToExport) {
    try {
      process.stdout.write(`Exportando tabela [${table}]... `);
      const { data, error } = await supabase.from(table).select('*');

      if (error) {
        if (error.message.includes('Could not find the table') || error.code === 'PGRST205' || error.code === '42P01') {
          console.log(`⚠️ Não criada no banco (Execute as migrações SQL no Supabase)`);
          missingTables++;
        } else {
          console.log(`❌ Erro: ${error.message}`);
        }
      } else {
        const count = data ? data.length : 0;
        totalRecords += count;
        successfulTables++;
        console.log(`✅ ${count} registros exportados`);
        backupData.tables[table] = {
          count,
          rows: data
        };
      }
    } catch (err) {
      console.log(`❌ Erro: ${err.message}`);
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_edukyne_${timestamp}.json`;
  const filePath = path.join(backupsDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');

  console.log(`\n🎉 Backup concluído!`);
  console.log(`📊 Tabelas exportadas: ${successfulTables}`);
  if (missingTables > 0) {
    console.log(`⚠️ Tabelas não encontradas no banco: ${missingTables} (execute os SQLs pendentes no Supabase Dashboard)`);
  }
  console.log(`📊 Total de registros salvos: ${totalRecords}`);
  console.log(`📁 Arquivo de backup salvo em: ${filePath}`);
}

backupDatabase();
