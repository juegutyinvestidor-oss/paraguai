import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { sessionFromRequest } from "../../../lib/session";
import { normalizeRole } from "../../../lib/rbac";

export const dynamic = "force-dynamic";

const REQUEST_TYPES = ["copia", "correcao", "exclusao", "portabilidade", "revogacao"];
const RESOLVE_STATUSES = ["resolvida", "recusada"];
const MAX_NOTES = 500;

function makeProtocol(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `LR-${ymd}-${rand}`;
}

function cleanNotes(val: unknown): string | null {
  if (typeof val !== "string") return null;
  const s = val.trim().slice(0, MAX_NOTES);
  return s.length > 0 ? s : null;
}

export async function POST(req: NextRequest) {
  try {
    const session = sessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Sessao invalida ou expirada. Faca login novamente." }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Servidor indisponivel." }, { status: 500 });
    }

    const body = await req.json();
    const action = String(body?.action || "create");

    if (action === "create") {
      const requestType = String(body?.requestType || "");
      if (!REQUEST_TYPES.includes(requestType)) {
        return NextResponse.json({ error: "Tipo de solicitacao invalido." }, { status: 400 });
      }
      const protocol = makeProtocol();
      const { error } = await admin.from("lgpd_requests").insert({
        id: protocol,
        requester_id: session.sub,
        requester_email: session.email,
        requester_role: session.role || "",
        request_type: requestType,
        notes: cleanNotes(body?.notes),
        status: "pendente",
      });
      if (error) {
        console.error("[Edukyne] Erro ao registrar solicitacao LGPD:", error.message);
        return NextResponse.json({ error: "Falha ao registrar a solicitacao." }, { status: 500 });
      }
      return NextResponse.json({ ok: true, protocol });
    }

    if (action === "create_for") {
      // Console do DPO: registra pedido recebido por canal externo em nome do titular.
      if (normalizeRole(session.role) !== "Administrador") {
        return NextResponse.json({ error: "Apenas Administradores podem registrar em nome de terceiros." }, { status: 403 });
      }
      const requestType = String(body?.requestType || "");
      if (!REQUEST_TYPES.includes(requestType)) {
        return NextResponse.json({ error: "Tipo de solicitacao invalido." }, { status: 400 });
      }
      const titular = body?.titular as Record<string, unknown> | undefined;
      const tId = typeof titular?.id === "string" ? titular.id.trim() : "";
      const tEmail = typeof titular?.email === "string" ? titular.email.trim().toLowerCase() : "";
      const tRole = typeof titular?.role === "string" ? titular.role.trim().slice(0, 60) : "";
      if (!tId || !tEmail || !tEmail.includes("@")) {
        return NextResponse.json({ error: "Titular invalido (id e email obrigatorios)." }, { status: 400 });
      }
      const protocol = makeProtocol();
      const { error } = await admin.from("lgpd_requests").insert({
        id: protocol,
        requester_id: tId,
        requester_email: tEmail,
        requester_role: tRole,
        request_type: requestType,
        notes: cleanNotes(body?.notes),
        status: "pendente",
      });
      if (error) {
        console.error("[Edukyne] Erro ao registrar solicitacao LGPD em nome de terceiro:", error.message);
        return NextResponse.json({ error: "Falha ao registrar a solicitacao." }, { status: 500 });
      }
      return NextResponse.json({ ok: true, protocol });
    }

    if (action === "resolve") {
      if (normalizeRole(session.role) !== "Administrador") {
        return NextResponse.json({ error: "Apenas Administradores podem resolver solicitacoes." }, { status: 403 });
      }
      const id = String(body?.id || "");
      const status = String(body?.status || "");
      if (!id || !RESOLVE_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Payload de resolucao invalido." }, { status: 400 });
      }
      const { error } = await admin
        .from("lgpd_requests")
        .update({
          status,
          resolved_by: session.sub,
          resolved_at: new Date().toISOString(),
          notes: cleanNotes(body?.resolutionNote) || undefined,
        })
        .eq("id", id);
      if (error) {
        console.error("[Edukyne] Erro ao resolver solicitacao LGPD:", error.message);
        return NextResponse.json({ error: "Falha ao atualizar a solicitacao." }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  } catch (err) {
    console.error("Erro na API lgpd:", err);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
