import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { sessionFromRequest } from "../../../lib/session";
import { normalizeRole } from "../../../lib/rbac";

export const dynamic = "force-dynamic";

const MAX_LEN = 180;

function cleanStr(val: unknown, fallback = ""): string {
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim();
  return s.length > MAX_LEN ? s.slice(0, MAX_LEN) : (s || fallback);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Manutencao: apaga "espelhos" de perfil (sem senha) de alunos/profissionais
    // excluidos. Linha com password_hash so e removida se for GHOST comprovado:
    // mesmo id+email do registro excluido, nenhum dono vivo em students/professionals
    // com aquele email, e nunca o Admin nativo (id '1').
    if (body?.action === "delete_mirrors") {
      const session = sessionFromRequest(req);
      if (!session) {
        return NextResponse.json({ error: "Sessao invalida ou expirada. Faca login novamente." }, { status: 401 });
      }
      const rawIds = Array.isArray(body?.ids) ? body.ids : [];
      const ids = rawIds.map((i: unknown) => cleanStr(i)).filter(Boolean).slice(0, 200);
      const entries: { id: string; email: string }[] = (Array.isArray(body?.entries) ? body.entries : [])
        .map((e: { id?: unknown; email?: unknown }) => ({ id: cleanStr(e?.id), email: cleanStr(e?.email) }))
        .filter((e: { id: string; email: string }) => e.id && e.email.includes("@"))
        .slice(0, 200);
      if (ids.length === 0 && entries.length === 0) return NextResponse.json({ ok: true });
      const adminSvc = getSupabaseAdmin();
      if (!adminSvc) {
        return NextResponse.json({ error: "Servidor indisponivel." }, { status: 500 });
      }
      const { error: delErr } = await adminSvc.from("profiles").delete().in("id", ids).is("password_hash", null);
      if (delErr) {
        console.error("[Edukyne] Erro ao apagar espelhos em profiles:", delErr.message);
        return NextResponse.json({ error: "Falha ao limpar espelhos de perfil." }, { status: 500 });
      }
      // Ghosts com hash: exige par id+email, ausencia de dono vivo e nunca o Admin (id '1')
      for (const entry of entries) {
        if (entry.id === "1") continue;
        try {
          const { data: row } = await adminSvc.from("profiles").select("id, email, password_hash").eq("id", entry.id).maybeSingle();
          if (!row || !row.password_hash) continue; // ja era espelho sem senha -> tratado acima
          if (String(row.email || "").toLowerCase() !== entry.email.toLowerCase()) continue;
          const ownerEmail = entry.email.toLowerCase();
          const { data: ownerStu } = await adminSvc.from("students").select("id").ilike("email", ownerEmail).limit(1);
          let hasOwner = Array.isArray(ownerStu) && ownerStu.length > 0;
          if (!hasOwner) {
            const { data: ownerProf } = await adminSvc.from("professionals").select("id").ilike("email", ownerEmail).limit(1);
            hasOwner = Array.isArray(ownerProf) && ownerProf.length > 0;
          }
          if (hasOwner) continue; // email ainda pertence a uma conta viva: nao e ghost
          const { error: ghostErr } = await adminSvc.from("profiles").delete().eq("id", entry.id);
          if (ghostErr) console.error("[Edukyne] Erro ao apagar ghost de perfil:", ghostErr.message);
        } catch (e) {
          console.error("[Edukyne] Erro no exame de ghost de perfil:", e);
        }
      }
      return NextResponse.json({ ok: true });
    }

    const id = cleanStr(body?.id);
    const name = cleanStr(body?.name);
    const email = cleanStr(body?.email);

    if (!id || !name || !email || !email.includes("@")) {
      return NextResponse.json({ error: "Dados de perfil invalidos." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Servidor indisponivel." }, { status: 500 });
    }

    const session = sessionFromRequest(req);
    const isAdmin = !!session && normalizeRole(session.role) === "Administrador";

    const record: Record<string, unknown> = {
      id,
      name,
      email,
      avatar_url: cleanStr(body?.avatar_url) || null,
    };

    if (session) {
      if (isAdmin) {
        record.role = cleanStr(body?.role) || "Administrador";
      } else if (session.sub === id) {
        // Auto-escrita: cargo sempre vem da sessao validada (anti-privilege escalation)
        record.role = session.role;
      } else {
        return NextResponse.json({ error: "Voce so pode atualizar o seu proprio perfil." }, { status: 403 });
      }
    } else {
      // Sem sessao valida: permite apenas criar um perfil inexistente (auto-cura
      // de bases zeradas). Nunca permite sobrescrever registro alheio.
      const { data: existing } = await admin.from("profiles").select("id").eq("id", id).maybeSingle();
      if (existing) {
        return NextResponse.json({ error: "Sessao invalida ou expirada. Faca login novamente." }, { status: 401 });
      }
      record.role = cleanStr(body?.role) || "Gestor";
    }

    const { error } = await admin.from("profiles").upsert(record);
    if (error) {
      console.error("[Edukyne] Erro ao gravar perfil:", error.message);
      return NextResponse.json({ error: "Falha ao gravar perfil." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro na API profile:", err);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
