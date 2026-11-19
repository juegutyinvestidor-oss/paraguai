-- Migration: Dynamic Consolidated Schema & Assessments for EDUKYNE
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

create policy "Allow public select imc" on public.imc_assessments for select using (true);

create policy "Allow public select motor" on public.motor_assessments for select using (true);

create policy "Allow public select sport" on public.sport_assessments for select using (true);

create policy "Allow public select vocational" on public.vocational_assessments for select using (true);

create policy "Allow public select contratos" on public.contratos for select using (true);

create policy "Allow public select attendance" on public.attendance_records for select using (true);

create policy "Allow public select aptidao_referenciais" on public.aptidao_referenciais for select using (true);

create policy "Allow public select m2_modalidades_config" on public.m2_modalidades_config for select using (true);



create policy "Allow public select performance" on public.performance_reports for select using (true);

create policy "Allow public select lgpd_requests" on public.lgpd_requests for select using (true);
