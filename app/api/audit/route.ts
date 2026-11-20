import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { sessionFromRequest } from "../../../lib/session";
import { getApiTranslator } from "../../../lib/apiI18n";

export const dynamic = "force-dynamic";

const ACTIONS = ["view", "export", "edit", "delete", "login", "consent"];
const TABLES = [
  "students", "professionals", "consent_records", "modalities", "contratos",
  "imc_assessments", "motor_assessments", "sport_assessments",
  "vocational_assessments", "health_assessments", "oral_assessments", "autoconcept_assessments", "ias_assessments", "performance_reports", "auth",
];
const MAX_ID_LEN = 200;
const MAX_DETAILS_BYTES = 4096;

function cleanStr(val: unknown, max: number): string | null {
  if (typeof val !== "string") return null;
  const s = val.trim();
  if (!s) return null;
  return s.slice(0, max);
}

export async function POST(req: NextRequest) {
  const t = getApiTranslator(req);
  try {
    const session = sessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: t("erroSessaoInvalida") }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: t("erroServidorIndisponivel") }, { status: 500 });
    }

    const body = await req.json();
    const action = String(body?.action || "");
    const targetTable = String(body?.targetTable || "");
    if (!ACTIONS.includes(action) || !TABLES.includes(targetTable)) {
      return NextResponse.json({ error: t("auditoriaAcaoTabelaInvalida") }, { status: 400 });
    }

    let details: Record<string, unknown> | null = null;
    if (body?.details && typeof body.details === "object" && !Array.isArray(body.details)) {
      const json = JSON.stringify(body.details);
      if (json.length <= MAX_DETAILS_BYTES) details = body.details as Record<string, unknown>;
    }

    const xff = req.headers.get("x-forwarded-for");
    const ip = ((xff ? xff.split(",")[0].trim() : "") || req.headers.get("x-real-ip") || "127.0.0.1").slice(0, 64);
    const userAgent = cleanStr(req.headers.get("user-agent"), 300);

    const { error } = await admin.from("data_access_logs").insert({
      user_id: session.sub,
      user_role: session.role || "",
      action,
      target_table: targetTable,
      target_id: cleanStr(body?.targetId, MAX_ID_LEN),
      target_field: cleanStr(body?.targetField, MAX_ID_LEN),
      ip_address: ip,
      user_agent: userAgent,
      details,
    });
    if (error) {
      console.error("[Edukyne] Erro ao gravar trilha de auditoria:", error.message);
      return NextResponse.json({ error: t("auditoriaFalhaRegistrar") }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro na API audit:", err);
    return NextResponse.json({ error: t("erroInternoServidor") }, { status: 500 });
  }
}
