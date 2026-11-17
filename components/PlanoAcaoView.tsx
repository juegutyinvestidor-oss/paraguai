'use client';

import React from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  X,
  Plus,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';
import { type UserProfile, type PlanoAcaoFolder, type PlanoAcaoFile } from '../types/edukyne';
import { normalizeRole, type Permission } from '../lib/rbac';
import { getSessionToken } from '../lib/sessionClient';

interface PlanoAcaoViewProps {
  user: UserProfile & { id?: string };
  runWithPermission: (permission: Permission, onApproved: () => void | Promise<void>) => Promise<void>;
}

interface ApiResponse {
  ok?: boolean;
  error?: string;
  errors?: string[];
  folders?: PlanoAcaoFolder[];
  files?: PlanoAcaoFile[];
  folder?: PlanoAcaoFolder;
}

interface DeleteTarget {
  type: 'folder' | 'file';
  id: string;
  name: string;
}

async function planoAcaoFetch(form: FormData): Promise<ApiResponse | null> {
  try {
    const token = getSessionToken();
    const res = await fetch('/api/plano-acao', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    return await res.json().catch(() => null);
  } catch (err) {
    console.error('[Edukyne] Erro na chamada de plano de acao:', err);
    return null;
  }
}

function buildForm(action: string, extra?: Record<string, string | File | File[]>): FormData {
  const form = new FormData();
  form.append('action', action);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (Array.isArray(value)) {
        value.forEach((file) => form.append(key, file));
      } else {
        form.append(key, value);
      }
    }
  }
  return form;
}

function formatSize(size?: number | null): string {
  if (!size) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date?: string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

export default function PlanoAcaoView({ user, runWithPermission }: PlanoAcaoViewProps) {
  const [folders, setFolders] = React.useState<PlanoAcaoFolder[]>([]);
  const [files, setFiles] = React.useState<PlanoAcaoFile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [selectedFolder, setSelectedFolder] = React.useState<PlanoAcaoFolder | null>(null);
  const [lastVisited, setLastVisited] = React.useState<PlanoAcaoFolder | null>(null);

  const [showNewFolderModal, setShowNewFolderModal] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [creatingFolder, setCreatingFolder] = React.useState(false);

  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [uploadingFiles, setUploadingFiles] = React.useState<File[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [uploadErrors, setUploadErrors] = React.useState<string[]>([]);

  const [previewFile, setPreviewFile] = React.useState<PlanoAcaoFile | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [notice, setNotice] = React.useState<string | null>(null);

  const isStaff = ['Administrador', 'Gestor'].includes(normalizeRole(user.role || ''));
  const canView = normalizeRole(user.role || '') !== 'Aluno';
  const canManage = isStaff && canView;

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const data = await planoAcaoFetch(buildForm('list'));
    setLoading(false);
    if (!data) {
      setLoadError('Servidor indisponivel ou modo offline.');
      return;
    }
    if (data.error) {
      setLoadError(data.error);
      return;
    }
    setFolders(data.folders || []);
    setFiles(data.files || []);
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const openFolder = (folder: PlanoAcaoFolder) => {
    setLastVisited(folder);
    setSelectedFolder(folder);
    setPreviewFile(null);
  };

  const handleCreateFolder = () => {
    void runWithPermission('create:plano_acao', async () => {
      const name = newFolderName.trim();
      if (!name) return;
      setCreatingFolder(true);
      const form = buildForm('create_folder', { name });
      const data = await planoAcaoFetch(form);
      setCreatingFolder(false);
      if (!data || data.error || !data.folder) {
        setNotice(data?.error || 'Falha ao criar pasta.');
        return;
      }
      setFolders((prev) => [data.folder!, ...prev]);
      setNewFolderName('');
      setShowNewFolderModal(false);
      setNotice('Pasta criada com sucesso.');
    });
  };

  const handleUpload = () => {
    if (!selectedFolder) return;
    void runWithPermission('create:plano_acao', async () => {
      if (uploadingFiles.length === 0) return;
      setUploading(true);
      setUploadErrors([]);
      const form = buildForm('upload', { folder_id: selectedFolder.id, files: uploadingFiles });
      const data = await planoAcaoFetch(form);
      setUploading(false);
      if (!data) {
        setUploadErrors(['Servidor indisponivel.']);
        return;
      }
      if (data.error) {
        setUploadErrors([data.error]);
        return;
      }
      setFiles((prev) => [...(data.files || []), ...prev]);
      setUploadErrors(data.errors || []);
      if ((data.errors || []).length === 0) {
        setUploadingFiles([]);
        setShowUploadModal(false);
        setNotice('PDF(s) enviado(s) com sucesso.');
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    void runWithPermission('delete:plano_acao', async () => {
      setDeleting(true);
      const isFolder = deleteTarget.type === 'folder';
      const form = buildForm(isFolder ? 'delete_folder' : 'delete_file', {
        [isFolder ? 'folder_id' : 'file_id']: deleteTarget.id,
      });
      const data = await planoAcaoFetch(form);
      setDeleting(false);
      if (!data || data.error) {
        setNotice(data?.error || 'Falha ao excluir.');
        setDeleteTarget(null);
        return;
      }
      if (isFolder) {
        setFolders((prev) => prev.filter((f) => f.id !== deleteTarget.id));
        setFiles((prev) => prev.filter((f) => f.folder_id !== deleteTarget.id));
        if (selectedFolder?.id === deleteTarget.id) setSelectedFolder(null);
      } else {
        setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      }
      setDeleteTarget(null);
      setNotice('Excluido com sucesso.');
    });
  };

  const handleFileChange = (input: HTMLInputElement | null) => {
    if (!input || !input.files) return;
    const pdfs = Array.from(input.files).filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    setUploadingFiles((prev) => [...prev, ...pdfs]);
    if (input) input.value = '';
  };

  const downloadFile = async (file: PlanoAcaoFile) => {
    if (!file.url) return;
    try {
      const res = await fetch(file.url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = file.name || 'plano.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('[Edukyne] Falha ao baixar PDF:', err);
      setNotice('Falha ao baixar o arquivo.');
    }
  };

  const folderFiles = selectedFolder ? files.filter((f) => f.folder_id === selectedFolder.id) : [];

  return (
    <div className="min-h-screen bg-[#070b19] text-[#dae2fd]">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#1a2b4b] border border-[#38bdf8]/30 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-[#38bdf8]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Plano de Ação</h1>
              <p className="text-xs text-[#bdc8d1]/80">Pastas com arquivos PDF de plano de ação do sistema</p>
            </div>
          </div>

          {selectedFolder ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedFolder(null)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#3e484f]/40 bg-[#0b1326] hover:bg-[#131b2e] text-xs font-bold text-[#8ed5ff] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              {canManage && (
                <button
                  onClick={() => {
                    setUploadErrors([]);
                    setShowUploadModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#0b1326] text-xs font-bold transition-colors"
                >
                  <Upload className="w-4 h-4" /> Enviar PDF(s)
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {canManage && (
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#0b1326] text-xs font-bold transition-colors"
                >
                  <Plus className="w-4 h-4" /> Nova Pasta
                </button>
              )}
            </div>
          )}
        </header>

        {notice && (
          <div className="bg-[#1a2b4b] border border-[#38bdf8]/40 text-[#8ed5ff] rounded-lg px-4 py-3 text-xs font-semibold">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-[#38bdf8] animate-spin" />
            <p className="text-xs text-[#bdc8d1]/70 font-mono tracking-widest uppercase">Carregando Planos de Ação...</p>
          </div>
        ) : loadError ? (
          <div className="bg-[#171f33] border border-amber-500/30 rounded-2xl p-10 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <p className="text-sm text-[#bdc8d1]">{loadError}</p>
            <button
              onClick={() => void loadData()}
              className="px-5 py-2 bg-[#1a2b4b] hover:bg-[#1a2b4b]/80 border border-[#3e484f]/40 text-xs font-bold text-[#8ed5ff] rounded-lg transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : selectedFolder ? (
          <section className="bg-[#171f33] border border-[#3e484f]/40 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-[#3e484f]/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Folder className="w-5 h-5 text-[#38bdf8] shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#dae2fd] truncate">{selectedFolder.name}</h3>
                  <p className="text-[10px] text-[#bdc8d1]/70">
                    {folderFiles.length} arquivo(s) · criada em {formatDate(selectedFolder.created_at)}
                  </p>
                </div>
              </div>
              {canManage && folderFiles.length > 0 && (
                <button
                  onClick={() => setDeleteTarget({ type: 'folder', id: selectedFolder.id, name: selectedFolder.name })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#ffb4ab] hover:bg-[#93000a]/20 text-[10px] font-bold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir pasta
                </button>
              )}
            </div>

            {folderFiles.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <FileCheck2 className="w-10 h-10 text-[#38bdf8]/40 mx-auto" />
                <p className="text-xs text-[#bdc8d1]/70">Nenhum PDF nesta pasta ainda.</p>
                {canManage && (
                  <button
                    onClick={() => {
                      setUploadErrors([]);
                      setShowUploadModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#0b1326] text-xs font-bold transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Enviar primeiro PDF
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-[#0b1326] border-b border-[#3e484f]/40 text-left">
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8ed5ff]">Arquivo</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8ed5ff]">Tamanho</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8ed5ff]">Enviado em</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8ed5ff] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3e484f]/30">
                    {folderFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-[#131b2e]/40 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-4 h-4 text-[#38bdf8] shrink-0" />
                            <span className="text-xs font-semibold text-[#dae2fd] truncate">{file.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-[#bdc8d1]/70 whitespace-nowrap">{formatSize(file.size)}</td>
                        <td className="px-5 py-3 text-xs text-[#bdc8d1]/70 whitespace-nowrap">{formatDate(file.created_at)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewFile(file)}
                              title="Visualizar"
                              className="p-2 rounded-lg hover:bg-[#1a2b4b] text-[#8ed5ff] transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => void downloadFile(file)}
                              title="Baixar"
                              className="p-2 rounded-lg hover:bg-[#1a2b4b] text-[#8ed5ff] transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {canManage && (
                              <button
                                onClick={() => setDeleteTarget({ type: 'file', id: file.id, name: file.name })}
                                title="Excluir"
                                className="p-2 rounded-lg hover:bg-[#93000a]/20 text-[#ffb4ab] transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <>
            {folders.length === 0 ? (
              <div className="bg-[#171f33] border border-[#3e484f]/40 rounded-2xl py-20 text-center space-y-3 shadow-2xl">
                <FolderOpen className="w-12 h-12 text-[#38bdf8]/40 mx-auto" />
                <p className="text-sm font-semibold text-[#bdc8d1]">Nenhuma pasta criada ainda</p>
                <p className="text-xs text-[#bdc8d1]/60">
                  {canManage
                    ? 'Crie uma pasta para começar a organizar os PDFs de plano de ação.'
                    : 'Aguarde a equipe disponibilizar os planos de ação.'}
                </p>
                {canManage && (
                  <button
                    onClick={() => setShowNewFolderModal(true)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#0b1326] text-xs font-bold transition-colors mt-2"
                  >
                    <Plus className="w-4 h-4" /> Nova Pasta
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder) => {
                  const count = files.filter((f) => f.folder_id === folder.id).length;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => openFolder(folder)}
                      className="group bg-[#171f33] border border-[#3e484f]/40 rounded-2xl p-5 text-left hover:border-[#38bdf8]/50 hover:bg-[#1a2b4b]/60 transition-all shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1a2b4b] border border-[#38bdf8]/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Folder className="w-5 h-5 text-[#38bdf8]" />
                        </div>
                        {canManage && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name });
                              }
                            }}
                            className="p-2 rounded-lg text-[#bdc8d1]/50 hover:text-[#ffb4ab] hover:bg-[#93000a]/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                      <h3 className="mt-4 text-sm font-bold text-[#dae2fd] truncate">{folder.name}</h3>
                      <p className="mt-1 text-[11px] text-[#bdc8d1]/70">
                        {count} arquivo(s) · {formatDate(folder.created_at)}
                      </p>
                      <p className="mt-3 text-[10px] font-semibold text-[#38bdf8] group-hover:underline">Abrir pasta →</p>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        <footer className="pb-6 text-center text-[10px] text-[#bdc8d1]/40">
          Documentos hospedados em armazenamento seguro · Plano de Ação · {folders.length} pasta(s) ·{' '}
          {files.length} arquivo(s)
        </footer>
      </div>

      {lastVisited && previewFile && (
        <div className="fixed inset-0 bg-[#060e20]/90 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-[#0b1326] border border-[#3e484f]/40 w-full max-w-6xl h-[94dvh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-[#3e484f]/30">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-[#38bdf8] shrink-0" />
                <span className="text-xs font-bold text-[#dae2fd] truncate">{previewFile.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewFile.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a2b4b] hover:bg-[#1a2b4b]/80 text-[#8ed5ff] text-[10px] font-bold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Nova aba
                </a>
                <button
                  onClick={() => void downloadFile(previewFile)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a2b4b] hover:bg-[#1a2b4b]/80 text-[#8ed5ff] text-[10px] font-bold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 rounded-lg hover:bg-[#93000a]/20 text-[#bdc8d1] hover:text-[#ffb4ab] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-[#0f1a2e] overflow-hidden">
              <iframe
                src={previewFile.url ? `${previewFile.url}#toolbar=1&navpanes=0&view=FitH` : ''}
                title={previewFile.name}
                className="w-full h-full block"
              />
            </div>
            <div className="px-4 sm:px-5 py-2 border-t border-[#3e484f]/30 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-[#bdc8d1]/60 min-w-0">
                Use a barra do visualizador de PDF para dar zoom e navegar entre páginas.
              </p>
              {previewFile.name && (
                <p className="text-[10px] text-[#bdc8d1]/60 font-mono truncate">{previewFile.name}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showNewFolderModal && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-md rounded-xl shadow-2xl p-4 sm:p-6 relative">
            <button
              onClick={() => setShowNewFolderModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[#93000a]/20 text-[#bdc8d1] hover:text-[#ffb4ab] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider">Nova Pasta de Plano de Ação</h4>
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateFolder();
              }}
            >
              <div>
                <label className="block text-xs font-semibold text-[#bdc8d1] mb-1.5">Nome da pasta</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ex.: 2026 · Anual, Matrícula, Cobranças..."
                  className="w-full bg-[#0b1326] border border-[#3e484f]/40 rounded-lg px-4 py-2.5 text-sm text-[#dae2fd] placeholder:text-[#bdc8d1]/40 focus:outline-none focus:border-[#38bdf8] transition-colors"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#3e484f]/40 bg-[#0b1326] hover:bg-[#131b2e] text-xs font-bold text-[#bdc8d1] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim() || creatingFolder}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#38bdf8] hover:bg-[#38bdf8]/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#0b1326] text-xs font-bold transition-colors"
                >
                  {creatingFolder && <Loader2 className="w-4 h-4 animate-spin" />}
                  Criar pasta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUploadModal && selectedFolder && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#3e484f] w-full max-w-lg rounded-xl shadow-2xl p-4 sm:p-6 relative">
            <button
              onClick={() => {
                setShowUploadModal(false);
                setUploadErrors([]);
                setUploadingFiles([]);
              }}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[#93000a]/20 text-[#bdc8d1] hover:text-[#ffb4ab] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider">Enviar PDFs — {selectedFolder.name}</h4>
            <p className="mt-1 text-[11px] text-[#bdc8d1]/70">Apenas arquivos PDF, até 20MB cada.</p>
            <div className="mt-5 space-y-4">
              <label className="block cursor-pointer bg-[#0b1326] border-2 border-dashed border-[#3e484f]/40 rounded-xl px-4 py-8 text-center hover:border-[#38bdf8]/60 transition-colors">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileChange(e.currentTarget)}
                />
                <Upload className="w-8 h-8 text-[#38bdf8] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#dae2fd]">Clique para selecionar os PDFs</p>
                <p className="text-[10px] text-[#bdc8d1]/60 mt-1">É possível selecionar vários de uma vez.</p>
              </label>

              {uploadingFiles.length > 0 && (
                <div className="bg-[#0b1326] border border-[#3e484f]/30 rounded-lg divide-y divide-[#3e484f]/30 max-h-40 overflow-y-auto">
                  {uploadingFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                        <span className="text-[11px] text-[#dae2fd] truncate">{file.name}</span>
                      </div>
                      <button
                        onClick={() => setUploadingFiles((prev) => prev.filter((_, i) => i !== index))}
                        className="p-2 rounded text-[#bdc8d1]/60 hover:text-[#ffb4ab] transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploadErrors.length > 0 && (
                <div className="bg-[#93000a]/10 border border-[#93000a]/40 rounded-lg px-3 py-2.5 space-y-1">
                  {uploadErrors.map((err, i) => (
                    <p key={i} className="text-[11px] text-[#ffb4ab]">{err}</p>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadErrors([]);
                    setUploadingFiles([]);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#3e484f]/40 bg-[#0b1326] hover:bg-[#131b2e] text-xs font-bold text-[#bdc8d1] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploadingFiles.length === 0 || uploading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#38bdf8] hover:bg-[#38bdf8]/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#0b1326] text-xs font-bold transition-colors"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploading ? 'Enviando...' : 'Enviar arquivos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-[#060e20]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#171f33] border border-[#93000a]/40 w-full max-w-md rounded-xl shadow-2xl p-4 sm:p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-[#ffb4ab] mx-auto mb-3" />
            <h4 className="text-sm font-bold text-[#dae2fd]">
              Excluir {deleteTarget.type === 'folder' ? 'pasta' : 'arquivo'}?
            </h4>
            <p className="mt-2 text-xs text-[#bdc8d1]/80 break-words">
              &quot;{deleteTarget.name}&quot; será removido permanentemente
              {deleteTarget.type === 'folder' ? ' junto com todos os PDFs contidos nele' : ''}.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-[#3e484f]/40 bg-[#0b1326] hover:bg-[#131b2e] text-xs font-bold text-[#bdc8d1] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#93000a] hover:bg-[#93000a]/80 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}