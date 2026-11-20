import { type NextRequest, NextResponse } from "next/server";
import { getApiTranslator } from "../../../lib/apiI18n";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const t = getApiTranslator(req);
  try {
    const data = await req.json();

    const escapeStr = (val: unknown) => {
      if (val === null || val === undefined) return "NULL";
      const s = String(val).replace(/'/g, "''");
      return `'${s}'`;
    };

    const escapeNum = (val: unknown) => {
      if (val === null || val === undefined || isNaN(Number(val))) return "NULL";
      return Number(val);
    };

    const escapeJson = (val: unknown) => {
      if (val === null || val === undefined) return "NULL";
      const jsonStr = JSON.stringify(val).replace(/'/g, "''");
      return `'${jsonStr}'::jsonb`;
    };

    const escapeArray = (val: unknown) => {
      if (!Array.isArray(val)) return "'{}'::text[]";
      const items = (val as unknown[]).map(item => `"${String(item).replace(/"/g, '\\"')}"`).join(",");
      return `'{${items}}'::text[]`;
    };

    let sql = `-- Migration: Dynamic Consolidated Schema & Assessments for EDUKYNE
-- Generated dynamically with local data

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 0. Clean up existing objects to prevent relation/column errors from old states
drop table if exists public.students cascade;
drop table if exists public.professionals cascade;
drop table if exists public.modalities cascade;
drop table if exists public.profiles cascade;
drop table if exists public.imc_assessments cascade;
drop table if exists public.motor_assessments cascade;
drop table if exists public.sport_assessments cascade;
drop table if exists public.vocational_assessments cascade;
drop table if exists public.contratos cascade;
drop table if exists public.attendance_records cascade;
drop table if exists public.aptidao_referenciais cascade;
drop table if exists public.m2_modalidades_config cascade;
drop table if exists public.m3_cenarios cascade;
drop table if exists public.m3_impactos cascade;
drop table if exists public.m3_analises cascade;
drop table if exists public.performance_reports cascade;
drop table if exists public.rbac_permissions cascade;
drop table if exists public.lgpd_requests cascade;

-- 1. Students Table
create table public.students (
    id text primary key,
    name text not null,
    email text not null,
    enrollment_id text not null,
    grade text not null,
    status text not null check (status in ('Ativo', 'Inativo')) default 'Ativo',
    cpf text,
    gender text check (gender in ('Masculino', 'Feminino')),
    birth_date text,
    phone text,
    parent_name text,
    locality text,
    contrato text,
    estado text,
    regiao text,
    avatar_url text,
    created_at timestamptz default now()
);

-- 2. Professionals Table
create table public.professionals (
    id text primary key,
    name text not null,
    role text not null,
    email text not null,
    specialty text not null,
    avatar_url text not null,
    status text not null check (status in ('Ativo', 'Afastado')) default 'Ativo',
    cpf text,
    gender text check (gender in ('Masculino', 'Feminino')),
    birth_date text,
    phone text,
    locality text,
    contrato text,
    estado text,
    regiao text,
    grade text,
    created_at timestamptz default now()
);

-- 3. Modalities Table
create table public.modalities (
    id text primary key,
    name text not null,
    coach text not null,
    enrolled integer not null default 0,
    capacity integer not null,
    status text not null check (status in ('Matrículas Abertas', 'Turma Cheia', 'Encerrado')) default 'Matrículas Abertas',
    category text not null check (category in ('Esporte', 'Cultura', 'Tecnologia')),
    contrato text,
    estado text,
    regiao text,
    locality text,
    professor_id text,
    enrolled_student_ids text[] default '{}'::text[],
    created_at timestamptz default now()
);

-- 4. User Profiles Table
create table public.profiles (
    id text primary key,
    name text not null,
    role text not null,
    email text not null,
    avatar_url text,
    revenue_goal integer not null default 0,
    created_at timestamptz default now()
);

-- 5. IMC Assessments Table
create table public.imc_assessments (
    id text primary key,
    student_id text not null,
    student_name text not null,
    weight numeric not null,
    height numeric not null,
    imc numeric not null,
    classification text,
    class_group text not null,
    date text not null,
    created_at timestamptz default now()
);

-- 6. Motor Quality Table
create table public.motor_assessments (
    id text primary key,
    student_id text not null,
    student_name text not null,
    impulsao text not null,
    abdomen text not null,
    agility text not null,
    strength text not null,
    speed text not null,
    general_class text not null,
    date text not null,
    created_at timestamptz default now()
);

-- 7. Sport Indicated Table
create table public.sport_assessments (
    id text primary key,
    student_id text not null,
    student_name text not null,
    biotype text not null,
    main_skill text not null,
    suggested_sport text not null,
    recommended_practice text not null,
    date text not null,
    created_at timestamptz default now()
);

-- 8. Vocational Assessments Table
create table public.vocational_assessments (
    id text primary key,
    student_id text not null,
    student_name text not null,
    profile text not null,
    interest_area text not null,
    suggested_career text not null,
    technical_opinion text not null,
    date text not null,
    created_at timestamptz default now()
);

-- 9. Contratos Table
create table public.contratos (
    id text primary key,
    name text not null,
    estado text not null,
    regiao text not null,
    localidade text not null,
    grade text,
    structure jsonb,
    created_at timestamptz default now()
);

-- 10. Attendance Records Table
create table public.attendance_records (
    id text primary key,
    grade text not null,
    locality text not null,
    date text not null,
    student_id text not null,
    present boolean not null,
    created_at timestamptz default now()
);

-- 11. Aptidão Referenciais Table
create table public.aptidao_referenciais (
    id text primary key,
    category text not null check (category in ('forca', 'impulsao', 'abdomen', 'agilidade', 'velocidade')),
    idade text not null,
    sexo text not null,
    insuficiente text,
    regular text not null,
    bom text,
    excelente text not null,
    created_at timestamptz default now()
);

-- 12. Módulo 2 Modalidades Config Table
create table public.m2_modalidades_config (
    id text primary key,
    name text not null,
    requirements jsonb not null,
    created_at timestamptz default now()
);

-- 14. Módulo 3 Cenários de Frequência Table
create table public.m3_cenarios (
    id text primary key,
    cenario text not null,
    condicao text not null,
    frequencia text not null,
    mensagem text not null,
    created_at timestamptz default now()
);

-- 14b. Módulo 3 Impactos Pedagógicos Table
create table public.m3_impactos (
    id text primary key,
    tipo text not null,
    indicador text not null,
    descricao text not null,
    created_at timestamptz default now()
);

-- 15. Relatório de Performance Table
create table public.performance_reports (
    id text primary key,
    student_id text not null,
    student_name text not null,
    grade text not null,
    focus_area text not null,
    observations text,
    report text not null,
    date text not null,
    evaluation_id text,
    evaluation_result text,
    created_at timestamptz default now()
);

-- 16. RBAC Permissions Table
create table public.rbac_permissions (
    role text primary key,
    permissions jsonb not null,
    updated_at timestamptz default now()
);

-- 17. LGPD Requests Table (Art. 18 data subject requests)
create table public.lgpd_requests (
    id text primary key,
    requester_id text not null,
    requester_email text not null,
    requester_role text not null default '',
    request_type text not null check (request_type in ('copia','correcao','exclusao','portabilidade','revogacao')),
    notes text,
    status text not null default 'pendente' check (status in ('pendente','resolvida','recusada')),
    resolved_by text,
    resolved_at timestamptz,
    created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.students enable row level security;
alter table public.professionals enable row level security;
alter table public.modalities enable row level security;
alter table public.profiles enable row level security;
alter table public.imc_assessments enable row level security;
alter table public.motor_assessments enable row level security;
alter table public.sport_assessments enable row level security;
alter table public.vocational_assessments enable row level security;
alter table public.contratos enable row level security;
alter table public.attendance_records enable row level security;
alter table public.aptidao_referenciais enable row level security;
alter table public.m2_modalidades_config enable row level security;
alter table public.m3_cenarios enable row level security;
alter table public.m3_impactos enable row level security;
alter table public.performance_reports enable row level security;
alter table public.rbac_permissions enable row level security;
alter table public.lgpd_requests enable row level security;

-- Create Policies (public access for demo sync; profiles/rbac_permissions are SELECT-only for anon)
create policy "Allow public select students" on public.students for select using (true);

create policy "Allow public select professionals" on public.professionals for select using (true);

create policy "Allow public select modalities" on public.modalities for select using (true);

-- SECURITY: profiles e rbac_permissions permitem apenas LEITURA publica via anon key.
-- Escrita e feita pelas rotas /api/profile e /api/rbac (service_role + sessao validada).
create policy "Allow public select profiles" on public.profiles for select using (true);

create policy "Allow public select imc" on public.imc_assessments for select using (true);

create policy "Allow public select motor" on public.motor_assessments for select using (true);

create policy "Allow public select sport" on public.sport_assessments for select using (true);

create policy "Allow public select vocational" on public.vocational_assessments for select using (true);

create policy "Allow public select contratos" on public.contratos for select using (true);

create policy "Allow public select attendance" on public.attendance_records for select using (true);

create policy "Allow public select aptidao_referenciais" on public.aptidao_referenciais for select using (true);

create policy "Allow public select m2_modalidades_config" on public.m2_modalidades_config for select using (true);

create policy "Allow public select m3_cenarios" on public.m3_cenarios for select using (true);

create policy "Allow public select m3_impactos" on public.m3_impactos for select using (true);

create policy "Allow public select performance" on public.performance_reports for select using (true);

create policy "Allow public select rbac_permissions" on public.rbac_permissions for select using (true);
create policy "Allow public select lgpd_requests" on public.lgpd_requests for select using (true);

`;

    // Append default profiles if no user is present
    sql += `
-- Insert default system profiles
insert into public.profiles (id, name, role, email, avatar_url, revenue_goal)
values
  ('1', 'Admin EDUKYNE', 'Administrador', 'projetobrasil11@gmail.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 50000)
on conflict (id) do nothing;
`;

    // Dynamic insertion blocks
    if (data.user) {
      const u = data.user;
      sql += `
-- Insert user profile
insert into public.profiles (id, name, role, email, avatar_url, revenue_goal)
values (${escapeStr(u.id || 'current-user')}, ${escapeStr(u.name)}, ${escapeStr(u.role)}, ${escapeStr(u.email)}, ${escapeStr(u.avatarUrl || u.avatar_url)}, ${escapeNum(u.revenueGoal || u.revenue_goal || 0)})
on conflict (id) do update set name = excluded.name, role = excluded.role, email = excluded.email, avatar_url = excluded.avatar_url, revenue_goal = excluded.revenue_goal;
`;
    }

    if (Array.isArray(data.students) && data.students.length > 0) {
      sql += `\n-- Insert Students\n`;
      data.students.forEach((s: Record<string, unknown>) => {
        sql += `insert into public.students (id, name, email, enrollment_id, grade, status, cpf, gender, birth_date, phone, parent_name, locality, contrato, estado, regiao, avatar_url) values (${escapeStr(s.id)}, ${escapeStr(s.name)}, ${escapeStr(s.email)}, ${escapeStr(s.enrollmentId || s.enrollment_id)}, ${escapeStr(s.grade)}, ${escapeStr(s.status)}, ${escapeStr(s.cpf)}, ${escapeStr(s.gender)}, ${escapeStr(s.birthDate || s.birth_date)}, ${escapeStr(s.phone)}, ${escapeStr(s.parentName || s.parent_name)}, ${escapeStr(s.locality)}, ${escapeStr(s.contrato)}, ${escapeStr(s.estado)}, ${escapeStr(s.regiao)}, ${escapeStr(s.avatarUrl || s.avatar_url)}) on conflict (id) do nothing;\n`;
      });
    }

    if (Array.isArray(data.professionals) && data.professionals.length > 0) {
      sql += `\n-- Insert Professionals\n`;
      data.professionals.forEach((p: Record<string, unknown>) => {
        sql += `insert into public.professionals (id, name, role, email, specialty, avatar_url, status, cpf, gender, birth_date, phone, locality, contrato, estado, regiao, grade) values (${escapeStr(p.id)}, ${escapeStr(p.name)}, ${escapeStr(p.role)}, ${escapeStr(p.email)}, ${escapeStr(p.specialty)}, ${escapeStr(p.avatarUrl || p.avatar_url)}, ${escapeStr(p.status)}, ${escapeStr(p.cpf)}, ${escapeStr(p.gender)}, ${escapeStr(p.birthDate || p.birth_date)}, ${escapeStr(p.phone)}, ${escapeStr(p.locality)}, ${escapeStr(p.contrato)}, ${escapeStr(p.estado)}, ${escapeStr(p.regiao)}, ${escapeStr(p.grade)}) on conflict (id) do nothing;\n`;
      });
    }

    if (Array.isArray(data.modalities) && data.modalities.length > 0) {
      sql += `\n-- Insert Modalities\n`;
      data.modalities.forEach((m: Record<string, unknown>) => {
        sql += `insert into public.modalities (id, name, coach, enrolled, capacity, status, category, contrato, estado, regiao, locality, professor_id, enrolled_student_ids) values (${escapeStr(m.id)}, ${escapeStr(m.name)}, ${escapeStr(m.coach)}, ${escapeNum(m.enrolled)}, ${escapeNum(m.capacity)}, ${escapeStr(m.status)}, ${escapeStr(m.category)}, ${escapeStr(m.contrato)}, ${escapeStr(m.estado)}, ${escapeStr(m.regiao)}, ${escapeStr(m.locality)}, ${escapeStr(m.professor_id || m.professorId)}, ${escapeArray(m.enrolled_student_ids || m.enrolledStudentIds)}) on conflict (id) do nothing;\n`;
      });
    }

    if (Array.isArray(data.imc_assessments) && data.imc_assessments.length > 0) {
      sql += `\n-- Insert IMC Assessments\n`;
      data.imc_assessments.forEach((i: Record<string, unknown>) => {
        sql += `insert into public.imc_assessments (id, student_id, student_name, weight, height, imc, classification, class_group, date) values (${escapeStr(i.id)}, ${escapeStr(i.studentId || i.student_id)}, ${escapeStr(i.studentName || i.student_name)}, ${escapeNum(i.weight)}, ${escapeNum(i.height)}, ${escapeNum(i.imc)}, ${escapeStr(i.classification)}, ${escapeStr(i.classGroup || i.class_group)}, ${escapeStr(i.date)}) on conflict (id) do nothing;\n`;
      });
    }

    if (Array.isArray(data.motor_assessments) && data.motor_assessments.length > 0) {
      sql += `\n-- Insert Motor Assessments\n`;
      data.motor_assessments.forEach((m: Record<string, unknown>) => {
        sql += `insert into public.motor_assessments (id, student_id, student_name, impulsao, abdomen, agility, strength, speed, general_class, date) values (${escapeStr(m.id)}, ${escapeStr(m.studentId || m.student_id)}, ${escapeStr(m.studentName || m.student_name)}, ${escapeStr(m.impulsao || m.flexibility || m.impulsão || '')}, ${escapeStr(m.abdomen || m.coordination || '')}, ${escapeStr(m.agility)}, ${escapeStr(m.strength)}, ${escapeStr(m.speed)}, ${escapeStr(m.generalClass || m.general_class)}, ${escapeStr(m.date)}) on conflict (id) do nothing;\n`;
      });
    }

    if (Array.isArray(data.sport_assessments) && data.sport_assessments.length > 0) {
      sql += `\n-- Insert Sport Assessments\n`;
      data.sport_assessments.forEach((s: Record<string, unknown>) => {
        sql += `insert into public.sport_assessments (id, student_id, student_name, biotype, main_skill, suggested_sport, recommended_practice, date) values (${escapeStr(s.id)}, ${escapeStr(s.studentId || s.student_id)}, ${escapeStr(s.studentName || s.student_name)}, ${escapeStr(s.biotype)}, ${escapeStr(s.mainSkill || s.main_skill)}, ${escapeStr(s.suggestedSport || s.suggested_sport)}, ${escapeStr(s.recommendedPractice || s.recommended_practice)}, ${escapeStr(s.date)}) on conflict (id) do nothing;\n`;
      });
    }

    if (Array.isArray(data.vocational_assessments) && data.vocational_assessments.length > 0) {
      sql += `\n-- Insert Vocational Assessments\n`;
      data.vocational_assessments.forEach((v: Record<string, unknown>) => {
        sql += `insert into public.vocational_assessments (id, student_id, student_name, profile, interest_area, suggested_career, technical_opinion, date) values (${escapeStr(v.id)}, ${escapeStr(v.studentId || v.student_id)}, ${escapeStr(v.studentName || v.student_name)}, ${escapeStr(v.profile)}, ${escapeStr(v.interestArea || v.interest_area)}, ${escapeStr(v.suggestedCareer || v.suggested_career)}, ${escapeStr(v.technicalOpinion || v.technical_opinion)}, ${escapeStr(v.date)}) on conflict (id) do nothing;\n`;
      });
    }

    if (Array.isArray(data.contratos) && data.contratos.length > 0) {
      sql += `\n-- Insert Contratos\n`;
      data.contratos.forEach((c: Record<string, unknown>) => {
        sql += `insert into public.contratos (id, name, estado, regiao, localidade, grade, structure) values (${escapeStr(c.id)}, ${escapeStr(c.name)}, ${escapeStr(c.estado)}, ${escapeStr(c.regiao)}, ${escapeStr(c.localidade)}, ${escapeStr(c.grade)}, ${escapeJson(c.structure)}) on conflict (id) do nothing;\n`;
      });
    }

    if (Array.isArray(data.attendance_records) && data.attendance_records.length > 0) {
      sql += `\n-- Insert Attendance Records\n`;
      data.attendance_records.forEach((a: Record<string, unknown>) => {
        sql += `insert into public.attendance_records (id, grade, locality, date, student_id, present) values (${escapeStr(a.id)}, ${escapeStr(a.grade)}, ${escapeStr(a.locality)}, ${escapeStr(a.date)}, ${escapeStr(a.student_id || a.studentId)}, ${!!a.present}) on conflict (id) do nothing;\n`;
      });
    }

    if (Array.isArray(data.aptidao_referenciais) && data.aptidao_referenciais.length > 0) {
      sql += `\n-- Insert Aptidao Referenciais\n`;
      data.aptidao_referenciais.forEach((ar: Record<string, unknown>) => {
        sql += `insert into public.aptidao_referenciais (id, category, idade, sexo, insuficiente, regular, bom, excelente) values (${escapeStr(ar.id)}, ${escapeStr(ar.category)}, ${escapeStr(ar.idade)}, ${escapeStr(ar.sexo)}, ${escapeStr(ar.insuficiente)}, ${escapeStr(ar.regular)}, ${escapeStr(ar.bom)}, ${escapeStr(ar.excelente)}) on conflict (id) do nothing;\n`;
      });
    }

    if (Array.isArray(data.m2_modalidades_config) && data.m2_modalidades_config.length > 0) {
      sql += `\n-- Insert M2 Modalidades Config\n`;
      data.m2_modalidades_config.forEach((m2: Record<string, unknown>) => {
        sql += `insert into public.m2_modalidades_config (id, name, requirements) values (${escapeStr(m2.id)}, ${escapeStr(m2.name)}, ${escapeJson(m2.requirements)}) on conflict (id) do nothing;\n`;
      });
    }

    if (Array.isArray(data.m3_cenarios) && data.m3_cenarios.length > 0) {
      sql += `\n-- Insert M3 Cenários de Frequência\n`;
      data.m3_cenarios.forEach((cen: Record<string, unknown>) => {
        sql += `insert into public.m3_cenarios (id, cenario, condicao, frequencia, mensagem) values (${escapeStr(cen.id)}, ${escapeStr(cen.cenario)}, ${escapeStr(cen.condicao)}, ${escapeStr(cen.frequencia)}, ${escapeStr(cen.mensagem)}) on conflict (id) do update set cenario = excluded.cenario, condicao = excluded.condicao, frequencia = excluded.frequencia, mensagem = excluded.mensagem;\n`;
      });
    }

    if (Array.isArray(data.m3_impactos) && data.m3_impactos.length > 0) {
      sql += `\n-- Insert M3 Impactos Pedagógicos\n`;
      data.m3_impactos.forEach((imp: Record<string, unknown>) => {
        sql += `insert into public.m3_impactos (id, tipo, indicador, descricao) values (${escapeStr(imp.id)}, ${escapeStr(imp.tipo)}, ${escapeStr(imp.indicador)}, ${escapeStr(imp.descricao)}) on conflict (id) do update set tipo = excluded.tipo, indicador = excluded.indicador, descricao = excluded.descricao;\n`;
      });
    }

    if (Array.isArray(data.performance_reports) && data.performance_reports.length > 0) {
      sql += `\n-- Insert Performance Reports\n`;
      data.performance_reports.forEach((pr: Record<string, unknown>) => {
        sql += `insert into public.performance_reports (id, student_id, student_name, grade, focus_area, observations, report, date, evaluation_id, evaluation_result, created_at) values (${escapeStr(pr.id)}, ${escapeStr(pr.student_id || pr.studentId)}, ${escapeStr(pr.student_name || pr.studentName)}, ${escapeStr(pr.grade)}, ${escapeStr(pr.focus_area || pr.focusArea)}, ${escapeStr(pr.observations)}, ${escapeStr(pr.report)}, ${escapeStr(pr.date)}, ${escapeStr(pr.evaluation_id || pr.evaluationId)}, ${escapeStr(pr.evaluation_result || pr.evaluationResult)}, ${escapeStr(pr.created_at || pr.createdAt)}) on conflict (id) do nothing;\n`;
      });
    }

    if (data.rbac_permissions && typeof data.rbac_permissions === 'object') {
      sql += `\n-- Insert RBAC Permissions\n`;
      Object.entries(data.rbac_permissions).forEach(([role, permissions]) => {
        sql += `insert into public.rbac_permissions (role, permissions) values (${escapeStr(role)}, ${escapeJson(permissions)}) on conflict (role) do update set permissions = excluded.permissions, updated_at = now();\n`;
      });
    }

    return NextResponse.json({ sql });
  } catch (err) {
    console.error("Erro na API migration-schema:", err);
    const message = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : "");
    return NextResponse.json({ error: message || t("erroInternoServidor") }, { status: 500 });
  }
}
