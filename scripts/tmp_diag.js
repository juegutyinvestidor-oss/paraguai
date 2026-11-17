const fs = require('fs');
const env = {};
fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"`]|['"`]$/g, '').trim();
});
const url = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/, '');
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const tables = ['students', 'professionals', 'modalities', 'contratos', 'attendance_records', 'imc_assessments', 'vocational_assessments', 'profiles', 'rbac_permissions', 'performance_reports'];
(async () => {
  for (const t of tables) {
    const r = await fetch(`${url}/rest/v1/${t}?select=id&limit=1`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
    const j = await r.json().catch(() => r.statusText);
    const n = Array.isArray(j) ? j.length : `ERR ${JSON.stringify(j).slice(0, 80)}`;
    console.log(`${t.padEnd(24)} HTTP ${r.status} rows=${n}`);
  }
})();
