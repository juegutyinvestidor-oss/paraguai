import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { sessionFromRequest } from "../../../lib/session";
import { uuid } from "../../../lib/idGenerator";
import { getApiTranslator } from "../../../lib/apiI18n";

export const dynamic = "force-dynamic";

const MAX_SIZE = 3 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  const t = getApiTranslator(req);
  try {
    const session = sessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: t("erroSessaoInvalidaOuExpirada") }, { status: 401 });
    }
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: t("erroServidorIndisponivel") }, { status: 500 });
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: t("erroMultipartFormData") }, { status: 400 });
    }

    const action = String(form.get("action") || "");

    if (action === "upload") {
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: t("avatarArquivoAusente") }, { status: 400 });
      }
      if (file.size === 0 || file.size > MAX_SIZE) {
        return NextResponse.json({ error: t("avatarImagemMuitoGrande") }, { status: 413 });
      }
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: t("avatarSomenteImagens") }, { status: 415 });
      }
      const ext = MIME_EXT[file.type] || "jpg";
      const rawPrefix = String(form.get("prefix") || "avatar");
      const prefix = rawPrefix.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "avatar";
      const path = `${prefix}-${uuid().slice(0, 8)}.${ext}`;

      const bytes = new Uint8Array(await file.arrayBuffer());
      const { error } = await admin.storage.from("avatars").upload(path, bytes, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (error) {
        console.error("[Edukyne] Erro no upload via service_role:", error.message);
        return NextResponse.json({ error: t("avatarFalhaEnviarImagem") }, { status: 500 });
      }
      const { data } = admin.storage.from("avatars").getPublicUrl(path);
      const base = data?.publicUrl || "";
      const url = base ? `${base}${base.includes("?") ? "&" : "?"}v=${Date.now()}` : null;
      return NextResponse.json({ url });
    }

    if (action === "delete") {
      const path = String(form.get("path") || "");
      if (!path || path.length > 300 || path.includes("..") || path.includes("/") || path.includes("\\")) {
        return NextResponse.json({ error: t("erroCaminhoInvalido") }, { status: 400 });
      }
      const { error } = await admin.storage.from("avatars").remove([path]);
      if (error) {
        console.error("[Edukyne] Erro ao excluir avatar via service_role:", error.message);
        return NextResponse.json({ error: t("avatarFalhaExcluirImagem") }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: t("erroAcaoInvalida") }, { status: 400 });
  } catch (err) {
    console.error("Erro na API avatar:", err);
    return NextResponse.json({ error: t("erroInternoServidor") }, { status: 500 });
  }
}
