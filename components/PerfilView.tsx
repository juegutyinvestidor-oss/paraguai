'use client';

import React, { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { User, Shield, Save, Key, KeyRound, ShieldAlert, ShieldCheck, Camera, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { type UserProfile } from '../types/edukyne';
import { PERMISSION_LABEL_KEYS, normalizeRole, type UserRole, type Permission } from '../lib/rbac';
import { apiWrite, profilePayloadFromUser } from '../lib/sessionClient';
import { uploadAvatar } from '../lib/storage';

interface PerfilViewProps {
  user: UserProfile & { id?: string };
  setUser: React.Dispatch<React.SetStateAction<UserProfile & { id?: string }>>;
  rolePermissions: Record<UserRole, Permission[]>;
  setRolePermissions: React.Dispatch<React.SetStateAction<Record<UserRole, Permission[]>>>;
}

export default function PerfilView({ user, setUser, rolePermissions, setRolePermissions }: PerfilViewProps) {
  const t = useTranslations('perfil');
  const ta = useTranslations('alunos');
  const trbac = useTranslations('rbac');
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  // Track selected role to configure in the RBAC permissions matrix
  const [selectedRbacRole, setSelectedRbacRole] = useState<UserRole>(() => normalizeRole(user.role || 'Administrador'));
  const isAdmin = normalizeRole(user.role || '') === 'Administrador';
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [rbacSync, setRbacSync] = useState<'ok' | string | null>(null);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate a mock ID if none exists for the logged in user
  const userId = user.id || '1';

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadMsg(null);
    try {
      const url = await uploadAvatar(file, `user-${userId}`);
      if (!url) {
        setUploadMsg(ta('erroUploadFoto'));
        return;
      }
      const updated = { ...user, id: userId, avatarUrl: url };
      setUser(updated);
      const res = await apiWrite('/api/profile', profilePayloadFromUser(updated));
      if (!res.ok) {
        setUploadMsg(t('fotoSalvaSemPerfil', { erro: res.error ?? t('erroDesconhecido') }));
        return;
      }
      setUploadMsg(t('fotoSucesso'));
    } catch (err) {
      console.error('Erro no upload do avatar:', err);
      setUploadMsg(t('erroUploadFotoGenerico'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      id: userId,
      name,
      email,
      role: user.role,
      avatarUrl: user.avatarUrl
    };
    setUser(updated);
    const res = await apiWrite('/api/profile', profilePayloadFromUser(updated));
    if (!res.ok) setUploadMsg(t('dadosSalvosSemServidor', { erro: res.error ?? t('erroDesconhecido') }));
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwNew.length < 8) {
      setPwMsg({ type: 'err', text: t('senhaMinimo') });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwMsg({ type: 'err', text: t('senhaConfirmacaoDiferente') });
      return;
    }
    setPwSaving(true);
    const res = await apiWrite('/api/password', { currentPassword: pwCurrent, newPassword: pwNew });
    setPwSaving(false);
    if (res.ok) {
      setPwMsg({ type: 'ok', text: t('senhaSucesso') });
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
    } else {
      setPwMsg({ type: 'err', text: res.error || t('senhaFalha') });
    }
  };

  // Get current permissions list for display
  const currentPermissions = rolePermissions[selectedRbacRole] || [];
  const allPermissions: { key: string; label: string }[] = Object.entries(PERMISSION_LABEL_KEYS).map(([k, labelKey]) => ({
    key: k,
    label: trbac(labelKey)
  }));

  const handleTogglePermission = async (permissionKey: Permission) => {
    const currentList = rolePermissions[selectedRbacRole] || [];
    const isAllowed = currentList.includes(permissionKey);
    const nextList = isAllowed
      ? currentList.filter(p => p !== permissionKey)
      : [...currentList, permissionKey];

    const previous = rolePermissions;
    const updated = {
      ...rolePermissions,
      [selectedRbacRole]: nextList
    };

    setRolePermissions(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('educore_rbac_permissions', JSON.stringify(updated));
    }

    try {
      const res = await apiWrite('/api/rbac', { action: 'update', role: selectedRbacRole, permissions: nextList });
      if (!res.ok) {
        // Servidor recusou (ex.: nao-e-admin): desfaz a alteracao local para nao divergir do banco
        setRolePermissions(previous);
        if (typeof window !== 'undefined') {
          localStorage.setItem('educore_rbac_permissions', JSON.stringify(previous));
        }
        setRbacSync(`error:${res.error ?? t('erroDesconhecido')}`);
      } else {
        setRbacSync('ok');
      }
    } catch (err) {
      console.error('Error syncing rbac_permissions to Supabase:', err);
      setRolePermissions(previous);
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_rbac_permissions', JSON.stringify(previous));
      }
      setRbacSync(`error:${t('erroRede')}`);
    }
  };

  // Define categories for grouping
  const categories = [
    {
      title: t('categoriaVisualizacaoTitulo'),
      description: t('categoriaVisualizacaoDescricao'),
      items: allPermissions.filter(p => p.key.startsWith('view:'))
    },
    {
      title: t('categoriaOperacoesTitulo'),
      description: t('categoriaOperacoesDescricao'),
      items: allPermissions.filter(p => !p.key.startsWith('view:'))
    }
  ];

  const richTags = {
    strong: (chunks: React.ReactNode) => <strong className="text-[#dae2fd]">{chunks}</strong>,
    code: (chunks: React.ReactNode) => <code className="text-[#e0f2fe] bg-[#1a2b4b] px-1 rounded">{chunks}</code>,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-[#dae2fd]">

      {/* 1. PERSONAL ADMINISTRATIVE CADASTRO */}
      <section className="bg-[#171f33] border border-[#3e484f]/40 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-[#3e484f]/25 pb-3">
          <div className="p-2 bg-[#8ed5ff]/10 rounded-lg border border-[#8ed5ff]/20">
            <User className="w-5 h-5 text-[#8ed5ff]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#8ed5ff] uppercase tracking-wider">
              {t('editarTitulo')}
            </h4>
            <p className="text-[11px] text-[#bdc8d1]/75">
              {t('editarSubtitulo')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-start gap-5 flex-wrap">
            {/* Avatar / Foto de perfil */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#38bdf8]/40 bg-[#0b1326] flex items-center justify-center">
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt={ta('fotoPerfilAlt')} width={96} height={96} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-10 h-10 text-[#87929a]" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-[11px] bg-[#0b1326] border border-[#3e484f]/40 hover:border-[#38bdf8]/60 text-[#8ed5ff] px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold cursor-pointer disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{isUploading ? ta('enviando') : ta('trocarFoto')}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              {uploadMsg && (
                <p className="text-[10px] text-[#8ed5ff]/80 text-center max-w-[120px]">{uploadMsg}</p>
              )}
            </div>

            {/* ID, Nome e Email lado a lado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-w-[280px]">
            {/* ID Identificação */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#bdc8d1] block flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>{t('idUsuario')}</span>
              </label>
              <input 
                type="text"
                disabled
                value={userId}
                className="w-full bg-[#080f1d] border border-[#3e484f]/25 rounded-lg px-3 py-2 text-xs text-[#bdc8d1]/60 font-mono select-none cursor-not-allowed"
              />
            </div>

            {/* Nome */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#bdc8d1] block flex items-center gap-1">
                <span>{t('nomeCompleto')}</span>
              </label>
              <input 
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#bdc8d1] block flex items-center gap-1">
                <span>{t('emailCorporativo')}</span>
              </label>
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
              />
            </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit"
              className="px-6 py-2.5 bg-[#38bdf8] text-[#001e2c] hover:bg-[#38bdf8]/90 text-xs font-extrabold rounded-lg flex items-center gap-2 transition-transform active:scale-95 shadow-md font-sans cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{t('salvarDados')}</span>
            </button>
          </div>
        </form>
      </section>

      {/* 1a. ALTERAR SENHA */}
      <section className="bg-[#171f33] border border-[#3e484f]/40 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-[#3e484f]/25 pb-3">
          <div className="p-2 bg-[#8ed5ff]/10 rounded-lg border border-[#8ed5ff]/20">
            <KeyRound className="w-5 h-5 text-[#8ed5ff]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#8ed5ff] uppercase tracking-wider">
              {t('senhaTitulo')}
            </h4>
            <p className="text-[11px] text-[#bdc8d1]/75">
              {t('senhaSubtitulo')}
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#bdc8d1] block">
              <span>{t('senhaAtual')}</span>
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#bdc8d1] block">
              <span>{t('senhaNova')}</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#bdc8d1] block">
              <span>{t('senhaConfirmar')}</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              className="w-full bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:border-[#38bdf8] outline-none"
            />
          </div>
          <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3">
            {pwMsg && (
              <p className={`text-[11px] font-semibold ${pwMsg.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pwMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={pwSaving}
              className="ml-auto px-6 py-2.5 bg-[#38bdf8] text-[#001e2c] hover:bg-[#38bdf8]/90 text-xs font-extrabold rounded-lg flex items-center gap-2 transition-transform active:scale-95 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>{pwSaving ? t('verificando') : t('alterarSenha')}</span>
            </button>
          </div>
        </form>
      </section>

      {/* 2. CONFIGURABLE PERMISSIONS MATRIX (somente Administrador) */}
      {isAdmin && (
      <section className="bg-[#171f33] border border-[#3e484f]/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-5 pb-4 border-b border-[#3e484f]/25">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#38bdf8]" />
              <h3 className="text-sm sm:text-base font-bold text-[#dae2fd] uppercase tracking-wider items-center gap-1 flex">
                <span>{t('rbacTitulo')}</span>
              </h3>
            </div>
            <p className="text-xs text-[#bdc8d1]/85 mt-1">
              {t('rbacSubtitulo')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto shrink-0">
            <div className="flex items-center gap-2 bg-[#0b1326] border border-[#3e484f]/45 rounded-xl px-3 py-1.5 min-w-[260px]">
              <span className="text-[10px] uppercase font-bold text-[#38bdf8] shrink-0 font-sans">{t('configurarCargo')}</span>
              <select
                value={selectedRbacRole}
                onChange={(e) => setSelectedRbacRole(e.target.value as UserRole)}
                className="bg-transparent text-xs font-bold text-[#dae2fd] grow outline-none border-none cursor-pointer focus:ring-0 select-none py-1 h-7 font-sans"
              >
                <option value="Administrador" className="bg-[#0b1326]">{t('cargoAdministrador')}</option>
                <option value="Gestor" className="bg-[#0b1326]">{t('cargoGestor')}</option>
                <option value="Professor" className="bg-[#0b1326]">{t('cargoProfessor')}</option>
                <option value="Estagiário" className="bg-[#0b1326]">{t('cargoEstagiario')}</option>
                <option value="Assistente" className="bg-[#0b1326]">{t('cargoAssistente')}</option>
                <option value="Aluno" className="bg-[#0b1326]">{t('cargoAluno')}</option>
              </select>
            </div>

            <span className={`text-[10px] border px-3 py-2.5 rounded-xl font-mono font-bold tracking-wide text-center ${
              rbacSync && rbacSync !== 'ok'
                ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {rbacSync && rbacSync !== 'ok'
                ? t('semSincronia', { erro: rbacSync.replace(/^error:/, '') })
                : t('statusSincronizado')}
            </span>
          </div>
        </div>

        {/* Categories Grid - Column 1: Telas/Navegação, Column 2: Operações Específicas do CRM */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
          
          {categories.map((cat, idx) => (
            <div key={idx} className="bg-[#0b1326]/50 border border-[#3e484f]/25 rounded-xl p-5 space-y-4 flex flex-col justify-between h-full">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#8ed5ff] flex items-center gap-2 pb-2 border-b border-[#3e484f]/20">
                  <span className="text-[#38bdf8] font-bold">●</span> {cat.title}
                </h4>
                <p className="text-[10px] sm:text-xs text-[#bdc8d1]/75 mt-1 mb-4 select-none italic">{cat.description}</p>
                
                <div className="grid grid-cols-1 gap-3">
                  {cat.items.map((item) => {
                    const isAllowed = currentPermissions.includes(item.key as Permission);
                    return (
                      <button 
                        key={item.key} 
                        type="button"
                        onClick={() => handleTogglePermission(item.key as Permission)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-[11px] sm:text-xs transition-all text-left outline-none cursor-pointer select-none group focus:ring-1 focus:ring-[#38bdf8] ${
                          isAllowed 
                            ? 'bg-emerald-950/15 border-emerald-500/30 text-emerald-400 font-medium shadow-sm shadow-emerald-500/5 hover:bg-emerald-950/25' 
                            : 'bg-rose-950/5 border-rose-500/15 text-[#fb7185]/90 hover:bg-rose-950/15'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 pr-2">
                          {isAllowed ? (
                            <ShieldCheck className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-[#fb7185]/70 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <p className="font-bold leading-snug group-hover:text-white transition-colors">{item.label}</p>
                            <p className="text-[9px] opacity-55 font-mono mt-0.5 tracking-wider">{item.key}</p>
                          </div>
                        </div>

                        {/* Sliding Switch indicator */}
                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`text-[9px] font-bold uppercase tracking-wider font-mono ${isAllowed ? 'text-emerald-400' : 'text-rose-400/70'}`}>
                            {isAllowed ? t('liberado') : t('bloqueado')}
                          </span>
                          <div className={`w-9 h-5 rounded-full p-0.5 transition-all duration-200 ${isAllowed ? 'bg-emerald-500 shadow-inner' : 'bg-[#0b1326] border border-[#3e484f]/40'}`}>
                            <div className={`bg-[#e2e8f0] w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-200 ${isAllowed ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          
        </div>

        {/* New Informational Summary of Screen Visibility and CRM Operations updates */}
        <div className="mt-6 bg-[#090f1d] border border-[#3e484f]/25 p-5 rounded-xl space-y-4 font-sans text-xs">
          <h4 className="text-[#38bdf8] font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <span>{t('manualTitulo')}</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[#bdc8d1]/80">
            <div className="space-y-1.5 bg-[#0b1326]/30 p-3 rounded-lg border border-[#3e484f]/10">
              <span className="font-bold text-[#8ed5ff] block">{t('manualVisualizacaoTitulo')}</span>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>{t.rich('manualRemocao', richTags)}</li>
                <li>{t.rich('manualPersistencia', richTags)}</li>
              </ul>
            </div>
            <div className="space-y-1.5 bg-[#0b1326]/30 p-3 rounded-lg border border-[#3e484f]/10">
              <span className="font-bold text-[#8ed5ff] block">{t('manualOperacoesTitulo')}</span>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>{t.rich('manualContratos', richTags)}</li>
                <li>{t.rich('manualSelecao', richTags)}</li>
                <li>{t.rich('manualSeguranca', richTags)}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#3e484f]/25 bg-[#0b1326]/50 p-4 rounded-xl text-center text-xs text-[#bdc8d1]/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            💡 {t.rich('dicaSeguranca', richTags)}
          </span>
          <span className="text-[10px] font-mono text-[#cbd5e1]/45">
            {t('versaoSchema')}
          </span>
        </div>
      </section>
      )}
    </div>
  );
}
