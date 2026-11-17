import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { sessionFromRequest, type SessionPayload } from "../../../lib/session";
import { normalizeRole, hasPermissionDynamic, ROLE_PERMISSIONS, type Permission, type UserRole } from "../../../lib/rbac";

export const dynamic = "force-dynamic";

type Rule = { kind: "perm"; perms: Permission[] } | { kind: "any" } | { kind: "staff" };

const TABLE_RULES: Record<string, { upsert: Rule; delete: Rule }> = {
  students: {
    upsert: { kind: "perm", perms: ["edit:alunos", "create:alunos"] },
    delete: { kind: "perm", perms: ["delete:alunos"] },
  },
  professionals: {
    upsert: { kind: "perm", perms: ["edit:profissionais", "create:profissionais"] },
    delete: { kind: "perm", perms: ["delete:profissionais"] },
  },
  modalities: {
    upsert: { kind: "perm", perms: ["edit:modalidades", "create:modalidades"] },
    delete: { kind: "perm", perms: ["delete:modalidades"] },
  },
  contratos: {
    upsert: { kind: "perm", perms: ["edit:contrato", "create:contrato"] },
    delete: { kind: "perm", perms: ["delete:contrato"] },
  },
  attendance_records: {
    upsert: { kind: "perm", perms: ["edit:presenca"] },
    delete: { kind: "perm", perms: ["edit:presenca"] },
  },
  imc_assessments: {
    upsert: { kind: "perm", perms: ["create:avaliacoes", "edit:avaliacoes"] },
    delete: { kind: "perm", perms: ["delete:avaliacoes"] },
  },
  motor_assessments: {
    upsert: { kind: "perm", perms: ["create:avaliacoes", "edit:avaliacoes"] },
    delete: { kind: "perm", perms: ["delete:avaliacoes"] },
  },
  sport_assessments: {
    upsert: { kind: "perm", perms: ["create:avaliacoes", "edit:avaliacoes"] },
    delete: { kind: "perm", perms: ["delete:avaliacoes"] },
  },
  vocational_assessments: {
    upsert: { kind: "perm", perms: ["create:avaliacoes", "edit:avaliacoes"] },
    delete: { kind: "perm", perms: ["delete:avaliacoes"] },
  },
  health_assessments: {
    upsert: { kind: "perm", perms: ["create:avaliacoes", "edit:avaliacoes"] },
    delete: { kind: "perm", perms: ["delete:avaliacoes"] },
  },
  oral_assessments: {
    upsert: { kind: "perm", perms: ["create:avaliacoes", "edit:avaliacoes"] },
    delete: { kind: "perm", perms: ["delete:avaliacoes"] },
  },
  autoconcept_assessments: {
    upsert: { kind: "perm", perms: ["create:avaliacoes", "edit:avaliacoes"] },
    delete: { kind: "perm", perms: ["delete:avaliacoes"] },
  },
  ias_assessments: {
    upsert: { kind: "perm", perms: ["create:avaliacoes", "edit:avaliacoes"] },
    delete: { kind: "perm", perms: ["delete:avaliacoes"] },
  },
  snap_assessments: {
    upsert: { kind: "perm", perms: ["create:avaliacoes", "edit:avaliacoes"] },
    delete: { kind: "perm", perms: ["delete:avaliacoes"] },
  },
  aq10_assessments: {
    upsert: { kind: "perm", perms: ["create:avaliacoes", "edit:avaliacoes"] },
    delete: { kind: "perm", perms: ["delete:avaliacoes"] },
  },
  pcd_assessments: {
    upsert: { kind: "perm", perms: ["create:avaliacoes", "edit:avaliacoes"] },
    delete: { kind: "perm", perms: ["delete:avaliacoes"] },
  },
  performance_reports: {
    upsert: { kind: "perm", perms: ["create:avaliacoes", "edit:avaliacoes"] },
    delete: { kind: "perm", perms: ["delete:avaliacoes"] },
  },
  m2_modalidades_config: staffRules(),
  m3_cenarios: staffRules(),
  m3_impactos: staffRules(),
  m4_imc_config: staffRules(),
  m5_capacidades_config: staffRules(),
  m6_modalidades_direcionamento: staffRules(),
  m6_diretrizes_intervencao: staffRules(),
  m7_perfis_pareceres: staffRules(),
  voc_questions: staffRules(),
  m9_health_questions: staffRules(),
  m9_perfis_pareceres: staffRules(),
  m10_oral_questions: staffRules(),
  m10_perfis_pareceres: staffRules(),
  m11_autoconcept_questions: staffRules(),
  m11_perfis_pareceres: staffRules(),
  ias_questions: staffRules(),
  m12_perfis_pareceres: staffRules(),
  m13_snap_questions: staffRules(),
  m13_perfis_pareceres: staffRules(),
  m14_aq10_questions: staffRules(),
  m14_perfis_pareceres: staffRules(),
  aptidao_referenciais: staffRules(),
  m15_pcd_grupos: staffRules(),
  m15_pcd_adaptacoes: staffRules(),
  m15_pcd_faixas: staffRules(),
  m15_pcd_modalidades: staffRules(),
  m15_pcd_funil: staffRules(),
};

function staffRules(): { upsert: Rule; delete: Rule } {
  const r: Rule = { kind: "staff" };
  return { upsert: r, delete: r };
}

const MAX_ROWS = 500;
const MAX_BODY_BYTES = 1_500_000;

let permCache: { map: Record<UserRole, Permission[]>; ts: number } | null = null;

async function loadRolePermissions(admin: ReturnType<typeof getSupabaseAdmin>): Promise<Record<UserRole, Permission[]>> {
  const now = Date.now();
  if (permCache && now - permCache.ts < 30_000) return permCache.map;
  const base = { ...ROLE_PERMISSIONS } as Record<UserRole, Permission[]>;
  try {
    const { data } = await admin!.from("rbac_permissions").select("role, permissions");
    if (Array.isArray(data)) {
      data.forEach((row: { role: string; permissions: unknown }) => {
        if (row.role && Array.isArray(row.permissions)) {
          base[normalizeRole(row.role)] = row.permissions as Permission[];
        }
      });
    }
  } catch {
    // keep static defaults
  }
  permCache = { map: base, ts: now };
  return base;
}

function allowed(rule: Rule, session: SessionPayload, map: Record<UserRole, Permission[]>): boolean {
  if (rule.kind === "any") return true;
  if (rule.kind === "staff") return normalizeRole(session.role) !== "Aluno";
  const norm = normalizeRole(session.role);
  if (norm === "Administrador") return true;
  return rule.perms.some(p => hasPermissionDynamic(map, norm, p));
}

function sanitizeRows(val: unknown): { rows: Record<string, unknown>[] | null; error?: string } {
  const rows = Array.isArray(val) ? val : [val];
  if (rows.length === 0 || rows.length > MAX_ROWS) return { rows: null, error: "Payload de linhas invalido." };
  for (const r of rows) {
    if (!r || typeof r !== "object" || Array.isArray(r)) return { rows: null, error: "Linhas devem ser objetos." };
    const row = r as Record<string, unknown>;
    if (typeof row.id !== "string" || row.id.length === 0 || row.id.length > 300) {
      return { rows: null, error: "Cada linha precisa de um campo id (texto) valido." };
    }
  }
  return { rows: rows as Record<string, unknown>[] };
}

export async function POST(req: NextRequest) {
  try {
    const session = sessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Sessao invalida ou expirada. Faca login novamente." }, { status: 401 });
    }

    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload muito grande." }, { status: 413 });
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
    }

    const table = String(body?.table || "");
    const op = String(body?.op || "");
    const rule = TABLE_RULES[table];
    if (!rule || (op !== "upsert" && op !== "insert" && op !== "delete")) {
      return NextResponse.json({ error: "Tabela ou operacao nao permitidas." }, { status: 404 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Servidor indisponivel." }, { status: 500 });
    }

    const map = await loadRolePermissions(admin);
    if (!allowed(op === "delete" ? rule.delete : rule.upsert, session, map)) {
      return NextResponse.json({ error: "Seu cargo nao tem permissao para esta operacao." }, { status: 403 });
    }

    if (op === "delete") {
      const ids = body?.ids;
      if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_ROWS || !ids.every(i => typeof i === "string" && i.length > 0 && i.length <= 300)) {
        return NextResponse.json({ error: "Lista de ids invalida." }, { status: 400 });
      }
      const { error } = await admin.from(table).delete().in("id", ids as string[]);
      if (error) {
        console.error(`[Edukyne] /api/data delete ${table}:`, error.message);
        return NextResponse.json({ error: "Falha ao excluir registros." }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const { rows, error } = sanitizeRows(body?.rows);
    if (!rows) {
      return NextResponse.json({ error }, { status: 400 });
    }
    const { error: upErr } = await admin.from(table).upsert(rows);
    if (upErr) {
      console.error(`[Edukyne] /api/data upsert ${table}:`, upErr.message);
      return NextResponse.json({ error: "Falha ao gravar registros." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro na API data:", err);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
