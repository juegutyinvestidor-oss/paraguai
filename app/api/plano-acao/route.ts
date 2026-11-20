import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { sessionFromRequest } from "../../../lib/session";
import { hasPermission } from "../../../lib/rbac";
import { getApiTranslator } from "../../../lib/apiI18n";

export const dynamic = "force-dynamic";

const BUCKET = "plano-de-acao";
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function cleanFolderName(raw: string): string {
  const name = String(raw || "").trim().replace(/\s+/g, " ").slice(0, 80);
  return name;
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function publicUrl(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, path: string): string {
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  const base = data?.publicUrl || "";
  return base ? `${base}${base.includes("?") ? "&" : "?"}v=${Date.now()}` : "";
}

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

    if (action === "list") {
      const { data: folders, error: foldersErr } = await admin
        .from("plano_acao_folders")
        .select("id, name, created_by, created_at")
        .order("created_at", { ascending: true });

      if (foldersErr) {
        console.error("[Edukyne] Erro ao listar pastas do plano de acao:", foldersErr.message);
        return NextResponse.json({ error: t("planoFalhaCarregarPastas") }, { status: 500 });
      }

      const { data: files, error: filesErr } = await admin
        .from("plano_acao_files")
        .select("id, folder_id, name, path, size, created_by, created_at")
        .order("created_at", { ascending: true });

      if (filesErr) {
        console.error("[Edukyne] Erro ao listar arquivos do plano de acao:", filesErr.message);
        return NextResponse.json({ error: t("planoFalhaCarregarArquivos") }, { status: 500 });
      }

      const filesWithUrl = (files || []).map((f) => ({ ...f, url: publicUrl(admin, f.path) }));
      return NextResponse.json({ folders: folders || [], files: filesWithUrl });
    }

    if (action === "create_folder") {
      if (!hasPermission(session.role, "create:plano_acao")) {
        return NextResponse.json({ error: t("erroPermissaoNegada") }, { status: 403 });
      }
      const name = cleanFolderName(String(form.get("name") || ""));
      if (!name) {
        return NextResponse.json({ error: t("planoInformeNomePasta") }, { status: 400 });
      }
      const { data, error } = await admin
        .from("plano_acao_folders")
        .insert({ id: randomUUID(), name, created_by: session.sub })
        .select("id, name, created_by, created_at")
        .single();
      if (error) {
        console.error("[Edukyne] Erro ao criar pasta do plano de acao:", error.message);
        return NextResponse.json({ error: t("planoFalhaCriarPasta") }, { status: 500 });
      }
      return NextResponse.json({ folder: data });
    }

    if (action === "upload") {
      if (!hasPermission(session.role, "create:plano_acao")) {
        return NextResponse.json({ error: t("erroPermissaoNegada") }, { status: 403 });
      }
      const folderId = String(form.get("folder_id") || "");
      if (!isValidUuid(folderId)) {
        return NextResponse.json({ error: t("planoPastaInvalida") }, { status: 400 });
      }
      const { data: folder } = await admin
        .from("plano_acao_folders")
        .select("id")
        .eq("id", folderId)
        .maybeSingle();
      if (!folder) {
        return NextResponse.json({ error: t("planoPastaNaoEncontrada") }, { status: 404 });
      }

      const files = form.getAll("files").filter((f): f is File => f instanceof File);
      if (files.length === 0) {
        return NextResponse.json({ error: t("planoSelecioneArquivoPdf") }, { status: 400 });
      }

      const uploaded: Array<Record<string, unknown>> = [];
      const errors: string[] = [];

      for (const file of files) {
        if (file.size === 0 || file.size > MAX_FILE_SIZE) {
          errors.push(t("planoArquivoExcede20Mb", { name: file.name }));
          continue;
        }
        if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
          errors.push(t("planoArquivoNaoPdf", { name: file.name }));
          continue;
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9À-ú _.-]/g, "").slice(0, 120) || "plano.pdf";
        const path = `${folderId}/${randomUUID()}.pdf`;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
          contentType: "application/pdf",
          cacheControl: "3600",
          upsert: false,
        });
        if (uploadErr) {
          console.error("[Edukyne] Erro no upload de PDF:", uploadErr.message);
          errors.push(t("planoArquivoFalhaEnvio", { name: file.name }));
          continue;
        }
        const { data: row, error: rowErr } = await admin
          .from("plano_acao_files")
          .insert({ id: randomUUID(), folder_id: folderId, name: safeName, path, size: file.size, created_by: session.sub })
          .select("id, folder_id, name, path, size, created_by, created_at")
          .single();
        if (rowErr) {
          console.error("[Edukyne] Erro ao registrar PDF:", rowErr.message);
          await admin.storage.from(BUCKET).remove([path]);
          errors.push(t("planoArquivoFalhaRegistro", { name: file.name }));
          continue;
        }
        uploaded.push({ ...row, url: publicUrl(admin, row.path) });
      }

      return NextResponse.json({ files: uploaded, errors });
    }

    if (action === "delete_file") {
      if (!hasPermission(session.role, "delete:plano_acao")) {
        return NextResponse.json({ error: t("erroPermissaoNegada") }, { status: 403 });
      }
      const fileId = String(form.get("file_id") || "");
      if (!isValidUuid(fileId)) {
        return NextResponse.json({ error: t("planoArquivoInvalido") }, { status: 400 });
      }
      const { data: row } = await admin
        .from("plano_acao_files")
        .select("id, path")
        .eq("id", fileId)
        .maybeSingle();
      if (!row) {
        return NextResponse.json({ error: t("planoArquivoNaoEncontrado") }, { status: 404 });
      }
      if (row.path.includes("..") || row.path.includes("\\")) {
        return NextResponse.json({ error: t("erroCaminhoInvalido") }, { status: 400 });
      }
      await admin.storage.from(BUCKET).remove([row.path]);
      const { error: delErr } = await admin.from("plano_acao_files").delete().eq("id", fileId);
      if (delErr) {
        console.error("[Edukyne] Erro ao excluir registro de PDF:", delErr.message);
        return NextResponse.json({ error: t("planoFalhaExcluirArquivo") }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_folder") {
      if (!hasPermission(session.role, "delete:plano_acao")) {
        return NextResponse.json({ error: t("erroPermissaoNegada") }, { status: 403 });
      }
      const folderId = String(form.get("folder_id") || "");
      if (!isValidUuid(folderId)) {
        return NextResponse.json({ error: t("planoPastaInvalida") }, { status: 400 });
      }
      const { data: files } = await admin
        .from("plano_acao_files")
        .select("path")
        .eq("folder_id", folderId);
      if (files && files.length > 0) {
        const safePaths = files.map((f) => f.path).filter((p) => !p.includes("..") && !p.includes("\\"));
        await admin.storage.from(BUCKET).remove(safePaths);
      }
      const { error: delErr } = await admin.from("plano_acao_folders").delete().eq("id", folderId);
      if (delErr) {
        console.error("[Edukyne] Erro ao excluir pasta do plano de acao:", delErr.message);
        return NextResponse.json({ error: t("planoFalhaExcluirPasta") }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: t("erroAcaoInvalida") }, { status: 400 });
  } catch (err) {
    console.error("Erro na API plano-acao:", err);
    return NextResponse.json({ error: t("erroInternoServidor") }, { status: 500 });
  }
}