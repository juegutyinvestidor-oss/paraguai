import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { sessionFromRequest } from "../../../lib/session";
import { normalizeRole, type UserRole } from "../../../lib/rbac";

export const dynamic = "force-dynamic";

const VALID_ROLES: UserRole[] = ["Administrador", "Gestor", "Professor", "Estagiário", "Assistente", "Aluno"];

function isStringArray(val: unknown): val is string[] {
  return Array.isArray(val) && val.every((p) => typeof p === "string");
}

export async function POST(req: NextRequest) {
  try {
    const session = sessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Sessao invalida ou expirada. Faca login novamente." }, { status: 401 });
    }
    if (normalizeRole(session.role) !== "Administrador") {
      return NextResponse.json({ error: "Apenas Administradores podem alterar permissoes RBAC." }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Servidor indisponivel." }, { status: 500 });
    }

    const body = await req.json();
    const action = String(body?.action || "update");

    if (action === "seed") {
      const map = body?.map;
      if (!map || typeof map !== "object") {
        return NextResponse.json({ error: "Payload de seed invalido." }, { status: 400 });
      }
      for (const [roleName, permissions] of Object.entries(map as Record<string, unknown>)) {
        if (!VALID_ROLES.includes(normalizeRole(roleName)) || !isStringArray(permissions)) continue;
        const { error } = await admin.from("rbac_permissions").upsert({ role: normalizeRole(roleName), permissions });
        if (error) {
          console.error("[Edukyne] Erro no seed RBAC:", error.message);
          return NextResponse.json({ error: "Falha ao semear permissoes." }, { status: 500 });
        }
      }
      return NextResponse.json({ ok: true });
    }

    const role = cleanRole(body?.role);
    const permissions = body?.permissions;
    if (!role || !isStringArray(permissions)) {
      return NextResponse.json({ error: "Payload RBAC invalido." }, { status: 400 });
    }

    const { error } = await admin.from("rbac_permissions").upsert({ role, permissions });
    if (error) {
      console.error("[Edukyne] Erro ao gravar RBAC:", error.message);
      return NextResponse.json({ error: "Falha ao gravar permissoes." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro na API rbac:", err);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

function cleanRole(val: unknown): UserRole | null {
  if (typeof val !== "string") return null;
  const norm = normalizeRole(val);
  return VALID_ROLES.includes(norm) ? norm : null;
}
