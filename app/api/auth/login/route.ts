import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { createSessionToken } from "../../../../lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email.includes("@") || password.length < 4) {
      return NextResponse.json({ error: "Credenciais invalidas." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Servidor de autenticacao indisponivel." }, { status: 500 });
    }

    const xff = req.headers.get("x-forwarded-for");
    const clientIp = (xff ? xff.split(",")[0].trim() : "") || req.headers.get("x-real-ip") || "127.0.0.1";
    const ip = clientIp.slice(0, 64);

    let { data, error } = await admin.rpc("validate_login_secure", {
      email_input: email,
      password_input: password,
      ip_input: ip,
    });

    if (error && /ip_input|PGRST202|Could not find the function/i.test(error.message || "")) {
      // Funcao antiga (2 argumentos) ainda no banco: migration 20260909_005 pendente
      ({ data, error } = await admin.rpc("validate_login_secure", {
        email_input: email,
        password_input: password,
      }));
    }

    if (error) {
      const msg = error.message || "";
      if (/bloquead/i.test(msg)) {
        return NextResponse.json(
          { error: "Conta temporariamente bloqueada devido a múltiplas tentativas. Aguarde 15 minutos." },
          { status: 423 }
        );
      }
      console.error("[Edukyne] Erro em validate_login_secure:", msg);
      return NextResponse.json({ error: "Erro ao autenticar. Tente novamente." }, { status: 500 });
    }

    const user = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!user || !user.id) {
      return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
    }

    const token = createSessionToken({
      id: String(user.id),
      email: String(user.email || email),
      role: String(user.role || ""),
    });

    try {
      await admin.from("data_access_logs").insert({
        user_id: String(user.id),
        user_role: String(user.role || ""),
        action: "login",
        target_table: "auth",
        ip_address: ip,
        user_agent: (req.headers.get("user-agent") || "").slice(0, 300) || null,
      });
    } catch (auditErr) {
      console.warn("[LGPD] Falha ao auditar login:", auditErr);
    }

    return NextResponse.json({ user, token });
  } catch (err) {
    console.error("Erro na API auth/login:", err);
    return NextResponse.json({ error: "Erro inesperado ao autenticar." }, { status: 500 });
  }
}
