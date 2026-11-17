import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { sessionFromRequest } from "../../../lib/session";

export const dynamic = "force-dynamic";

const HASH_TABLES = ["professionals", "students", "profiles"] as const;

type HashRow = { id: string; password_hash: string | null };

export async function POST(req: NextRequest) {
  try {
    const session = sessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Sessao invalida ou expirada. Faca login novamente." }, { status: 401 });
    }

    const body = await req.json();
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword) {
      return NextResponse.json({ error: "Informe a senha atual." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "A nova senha deve ter no minimo 8 caracteres." }, { status: 400 });
    }
    if (newPassword.length > 100) {
      return NextResponse.json({ error: "A nova senha e muito longa." }, { status: 400 });
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: "A nova senha deve ser diferente da atual." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Servidor indisponivel." }, { status: 500 });
    }

    const email = String(session.email || "").toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Sessao sem e-mail valido." }, { status: 401 });
    }
    const ilikeEmail = email.replace(/[%_\\]/g, (ch) => `\\${ch}`);

    const collected: { table: (typeof HASH_TABLES)[number]; ids: string[] }[] = [];
    for (const table of HASH_TABLES) {
      const { data, error } = await admin
        .from(table)
        .select("id, password_hash")
        .ilike("email", ilikeEmail);
      if (error) {
        console.error(`[Edukyne] /api/password read ${table}:`, error.message);
        return NextResponse.json({ error: "Falha ao verificar credenciais." }, { status: 500 });
      }
      const rows = (data || []) as HashRow[];
      const matched = rows.filter(r => !!r.password_hash && bcrypt.compareSync(currentPassword, r.password_hash));
      if (matched.length === 0) continue;
      collected.push({ table, ids: rows.map(r => r.id) });
      break;
    }

    if (collected.length === 0) {
      return NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 });
    }

    const newHash = bcrypt.hashSync(newPassword, 10).replace(/^\$2b\$/, "$2a$");
    let updated = 0;
    for (const entry of collected) {
      const { error } = await admin
        .from(entry.table)
        .update({ password_hash: newHash })
        .in("id", entry.ids);
      if (error) {
        console.error(`[Edukyne] /api/password update ${entry.table}:`, error.message);
        return NextResponse.json({ error: "Falha ao gravar a nova senha." }, { status: 500 });
      }
      updated += entry.ids.length;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    console.error("Erro na API password:", err);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
