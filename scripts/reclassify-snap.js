#!/usr/bin/env node
/*
 * Reclassifica avaliações SNAP-IV antigas de alunos com 17 anos ou mais.
 *
 * Regra aplicada (DSM-5-TR, conforme documento de adaptação brasileira):
 *   - até 16 anos: >= 6 itens "Bastante"/"Demais" por bloco;
 *   - 17 anos ou mais: >= 5 itens "Bastante"/"Demais" por bloco.
 *
 * O script usa a data da avaliação e a data de nascimento do aluno para
 * calcular a idade no momento do teste. Sem --apply ele apenas mostra o que
 * mudaria (dry-run). Com --apply, atualiza snap_assessments no Supabase.
 *
 * Uso:
 *   node scripts/reclassify-snap.js
 *   node scripts/reclassify-snap.js --apply
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const vars = {};
  if (!fs.existsSync(envPath)) return vars;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    vars[key] = val;
  });
  return vars;
}

function parseDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return isNaN(date.getTime()) ? null : date;
  }
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    return isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function completedYears(birthDate, referenceDate) {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

function computeCounts(answers) {
  let inattention = 0;
  let hyperactivity = 0;
  for (let i = 0; i < 18; i += 1) {
    const value = Number(answers[i]);
    if (Number.isFinite(value) && value >= 2) {
      if (i < 9) inattention += 1;
      else hyperactivity += 1;
    }
  }
  return { inattention, hyperactivity };
}

function classify(inattention, hyperactivity, threshold) {
  const inat = inattention >= threshold;
  const hip = hyperactivity >= threshold;
  if (inat && hip) return 'Sinais Combinados';
  if (inat) return 'Sinais de Desatenção';
  if (hip) return 'Sinais de Hiperatividade/Impulsividade';
  return 'Sem Indícios Significativos';
}

async function fetchAll(supabase, table, select) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env.local.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Modo: ${apply ? 'APLICAR ALTERAÇÕES' : 'DRY-RUN (nenhuma alteração será gravada)'}`);

  const [snapRecords, students] = await Promise.all([
    fetchAll(
      supabase,
      'snap_assessments',
      'id, student_id, student_name, inattention_score, hyperactivity_score, classification, date, answers',
    ),
    fetchAll(supabase, 'students', 'id, name, birth_date'),
  ]);

  const studentsById = new Map(students.map(student => [student.id, student]));
  const changes = [];
  const skipped = [];

  for (const record of snapRecords) {
    const student = studentsById.get(record.student_id);
    if (!student) {
      skipped.push({ id: record.id, reason: 'aluno não encontrado' });
      continue;
    }

    const birthDate = parseDate(student.birth_date);
    const assessmentDate = parseDate(record.date);
    if (!birthDate || !assessmentDate) {
      skipped.push({ id: record.id, reason: 'data de nascimento ou da avaliação ausente/inválida' });
      continue;
    }

    const age = completedYears(birthDate, assessmentDate);
    if (age < 17) continue;

    if (!Array.isArray(record.answers) || record.answers.length !== 18) {
      skipped.push({ id: record.id, reason: 'respostas ausentes ou incompletas' });
      continue;
    }

    const counts = computeCounts(record.answers);
    const threshold = 5;
    const classification = classify(counts.inattention, counts.hyperactivity, threshold);

    if (
      Number(record.inattention_score) !== counts.inattention ||
      Number(record.hyperactivity_score) !== counts.hyperactivity ||
      record.classification !== classification
    ) {
      changes.push({
        id: record.id,
        studentId: record.student_id,
        studentName: record.student_name || student.name || '',
        date: record.date,
        age,
        before: {
          inattention: Number(record.inattention_score),
          hyperactivity: Number(record.hyperactivity_score),
          classification: record.classification,
        },
        after: {
          inattention: counts.inattention,
          hyperactivity: counts.hyperactivity,
          classification,
        },
      });
    }
  }

  console.log(`Avaliações analisadas: ${snapRecords.length}`);
  console.log(`Avaliações de alunos com 17+ anos com mudança: ${changes.length}`);
  console.log(`Ignoradas: ${skipped.length}`);

  if (changes.length > 0) {
    console.log('\nMudanças:');
    changes.forEach(change => {
      console.log(
        `- ${change.id} | ${change.studentName} | ${change.date} | ${change.age} anos\n` +
        `  antes: desat. ${change.before.inattention}, hiper. ${change.before.hyperactivity} -> ${change.before.classification}\n` +
        `  depois: desat. ${change.after.inattention}, hiper. ${change.after.hyperactivity} -> ${change.after.classification}`,
      );
    });
  }

  if (skipped.length > 0) {
    console.log('\nIgnoradas (detalhes):');
    skipped.forEach(item => console.log(`- ${item.id}: ${item.reason}`));
  }

  if (!apply) {
    console.log('\nDry-run concluído. Rode novamente com --apply para gravar as mudanças.');
    return;
  }

  if (changes.length === 0) {
    console.log('\nNada para atualizar.');
    return;
  }

  let updated = 0;
  for (const change of changes) {
    const { error } = await supabase
      .from('snap_assessments')
      .update({
        inattention_score: change.after.inattention,
        hyperactivity_score: change.after.hyperactivity,
        classification: change.after.classification,
      })
      .eq('id', change.id);

    if (error) {
      console.error(`Erro ao atualizar ${change.id}: ${error.message}`);
    } else {
      updated += 1;
    }
  }

  console.log(`\nAtualizações concluídas: ${updated}/${changes.length}`);
  console.log('Observação: relatórios de performance já gerados não são alterados por este script. Regere-os pela interface se precisar do texto atualizado.');
}

main().catch(error => {
  console.error('Falha:', error instanceof Error ? error.message : error);
  process.exit(1);
});