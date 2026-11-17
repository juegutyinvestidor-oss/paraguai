'use client';

import React, { useRef, useState } from 'react';
import { User, Shield, Save, Key, KeyRound, ShieldAlert, ShieldCheck, Camera, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { type UserProfile } from '../types/edukyne';
import { PERMISSION_LABELS, normalizeRole, type UserRole, type Permission } from '../lib/rbac';
import { apiWrite, profilePayloadFromUser } from '../lib/sessionClient';
import { uploadAvatar } from '../lib/storage';

interface PerfilViewProps {
  user: UserProfile & { id?: string };
  setUser: React.Dispatch<React.SetStateAction<UserProfile & { id?: string }>>;
  rolePermissions: Record<UserRole, Permission[]>;
  setRolePermissions: React.Dispatch<React.SetStateAction<Record<UserRole, Permission[]>>>;
}

export default function PerfilView({ user, setUser, rolePermissions, setRolePermissions }: PerfilViewProps) {
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
        setUploadMsg('Falha ao enviar a foto. Verifique a configuração do Storage no Supabase.');
        return;
      }
      const updated = { ...user, id: userId, avatarUrl: url };
      setUser(updated);
      const res = await apiWrite('/api/profile', profilePayloadFromUser(updated));
      if (!res.ok) {
        setUploadMsg(`Foto enviada, mas o servidor não salvou no perfil (${res.error}). Se você recarregar, a foto antiga voltará.`);
        return;
      }
      setUploadMsg('Foto de perfil atualizada com sucesso!');
    } catch (err) {
      console.error('Erro no upload do avatar:', err);
      setUploadMsg('Ocorreu um erro ao enviar a foto.');
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
    if (!res.ok) setUploadMsg(`Dados atualizados localmente, mas o servidor não salvou (${res.error}).`);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwNew.length < 8) {
      setPwMsg({ type: 'err', text: 'A nova senha deve ter no minimo 8 caracteres.' });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwMsg({ type: 'err', text: 'A confirmacao nao coincide com a nova senha.' });
      return;
    }
    setPwSaving(true);
    const res = await apiWrite('/api/password', { currentPassword: pwCurrent, newPassword: pwNew });
    setPwSaving(false);
    if (res.ok) {
      setPwMsg({ type: 'ok', text: 'Senha alterada com sucesso!' });
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
    } else {
      setPwMsg({ type: 'err', text: res.error || 'Falha ao alterar a senha.' });
    }
  };

  // Get current permissions list for display
  const currentPermissions = rolePermissions[selectedRbacRole] || [];
  const allPermissions: { key: string; label: string }[] = Object.entries(PERMISSION_LABELS).map(([k, v]) => ({
    key: k,
    label: v
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
        setRbacSync(`error:${res.error}`);
      } else {
        setRbacSync('ok');
      }
    } catch (err) {
      console.error('Error syncing rbac_permissions to Supabase:', err);
      setRolePermissions(previous);
      if (typeof window !== 'undefined') {
        localStorage.setItem('educore_rbac_permissions', JSON.stringify(previous));
      }
      setRbacSync('error:erro de rede');
    }
  };

  // Define categories for grouping
  const categories = [
    {
      title: "Visualização de Telas e Módulos",
      description: "Controle de visibilidade do menu lateral (as abas e cadeados restritos são automaticamente ocultados para manter o layout limpo de acordo com as permissões delegadas) e visualização de dados do dashboard, contratos, alunos, frequência e avaliações.",
      items: allPermissions.filter(p => p.key.startsWith('view:'))
    },
    {
      title: "Operações e Alterações do CRM",
      description: "Habilita a criação, edição (incluindo os painéis visuais no estilo caixas de seleção do filtro avançado de Gestores para até 2 Estados, 10 Regiões e 20 Localidades) e exclusão nos módulos ativos.",
      items: allPermissions.filter(p => !p.key.startsWith('view:'))
    }
  ];

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
              Editar Meus Dados Cadastrais Individuais
            </h4>
            <p className="text-[11px] text-[#bdc8d1]/75">
              Altere suas informações básicas de cadastro no CRM. Estas informações são usadas em relatórios de desempenho.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-start gap-5 flex-wrap">
            {/* Avatar / Foto de perfil */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#38bdf8]/40 bg-[#0b1326] flex items-center justify-center">
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt="Foto de perfil" width={96} height={96} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                <span>{isUploading ? 'Enviando...' : 'Trocar Foto'}</span>
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
                <span>ID do Usuário (Imutável):</span>
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
                <span>Nome Completo:</span>
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
                <span>E-mail Corporativo:</span>
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
              <span>Salvar Meus Dados Cadastrais</span>
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
              Alterar Minha Senha
            </h4>
            <p className="text-[11px] text-[#bdc8d1]/75">
              A senha atual e verificada no servidor antes da troca. Minimo de 8 caracteres na nova senha.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#bdc8d1] block">
              <span>Senha Atual:</span>
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
              <span>Nova Senha:</span>
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
              <span>Confirmar Nova Senha:</span>
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
              <span>{pwSaving ? 'Verificando...' : 'Alterar Senha'}</span>
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
                <span>Painel Console - Permissões de Acesso (RBAC)</span>
              </h3>
            </div>
            <p className="text-xs text-[#bdc8d1]/85 mt-1">
              Ative ou desative telas e operações por cargo. As mudanças valem imediatamente para todos os usuários do cargo selecionado.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto shrink-0">
            <div className="flex items-center gap-2 bg-[#0b1326] border border-[#3e484f]/45 rounded-xl px-3 py-1.5 min-w-[260px]">
              <span className="text-[10px] uppercase font-bold text-[#38bdf8] shrink-0 font-sans">Configurar Cargo:</span>
              <select
                value={selectedRbacRole}
                onChange={(e) => setSelectedRbacRole(e.target.value as UserRole)}
                className="bg-transparent text-xs font-bold text-[#dae2fd] grow outline-none border-none cursor-pointer focus:ring-0 select-none py-1 h-7 font-sans"
              >
                <option value="Administrador" className="bg-[#0b1326]">👑 Administrador (Acesso Total)</option>
                <option value="Gestor" className="bg-[#0b1326]">💼 Gestor (Sem exclusão)</option>
                <option value="Professor" className="bg-[#0b1326]">🧑‍🏫 Professor (Lançamento e Diários)</option>
                <option value="Estagiário" className="bg-[#0b1326]">📋 Estagiário (Lançamento simples)</option>
                <option value="Assistente" className="bg-[#0b1326]">🤝 Assistente (Apoio administrativo)</option>
                <option value="Aluno" className="bg-[#0b1326]">🎓 Aluno (Somente visualização básica)</option>
              </select>
            </div>

            <span className={`text-[10px] border px-3 py-2.5 rounded-xl font-mono font-bold tracking-wide text-center ${
              rbacSync && rbacSync !== 'ok'
                ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {rbacSync && rbacSync !== 'ok'
                ? `Sem sincronia: ${rbacSync.replace(/^error:/, '')}`
                : 'Status: Ativo & Sincronizado'}
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
                            {isAllowed ? 'Liberado' : 'Bloqueado'}
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
            <span>ℹ️ Manual de Recursos e Operações do CRM</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[#bdc8d1]/80">
            <div className="space-y-1.5 bg-[#0b1326]/30 p-3 rounded-lg border border-[#3e484f]/10">
              <span className="font-bold text-[#8ed5ff] block">Visualização de Telas e Módulos:</span>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li><strong className="text-[#dae2fd]">Remoção de Elementos de Bloqueio:</strong> Se um usuário não possui acesso a um recurso, tanto o botão no menu do app (Sidebar) quanto qualquer elemento restritivo de cadeado são dinamicamente omitidos da visualização para manter a interface limpa e focada.</li>
                <li><strong className="text-[#dae2fd]">Persistência em Tempo Real:</strong> Todo controle visual se adapta instantaneamente quando novas configurações do perfil são gravadas na matriz acima.</li>
              </ul>
            </div>
            <div className="space-y-1.5 bg-[#0b1326]/30 p-3 rounded-lg border border-[#3e484f]/10">
              <span className="font-bold text-[#8ed5ff] block">Operações e Alterações do CRM:</span>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li><strong className="text-[#dae2fd]">Gestão de Contratos (Vínculo Hierárquico):</strong> Permissões granulares de criação, edição e exclusão de contratos controlam quem pode atualizar as estruturas de alocação de até 2 Estados, 10 Regiões e 20 Localidades.</li>
                <li><strong className="text-[#dae2fd]">Seleção Múltipla Avançada:</strong> No cadastro e edição de profissionais, o papel de <code className="text-[#e0f2fe] bg-[#1a2b4b] px-1 rounded">Gestor</code> substitui os seletores simples por caixas de seleção, permitindo registrar simultaneamente até 2 Estados, 10 Regiões e 20 Localidades.</li>
                <li><strong className="text-[#dae2fd]">Segurança e Resiliência (Auto-cura):</strong> Restaurações automáticas de tabela garantem que nenhum perfil de usuário seja perdido em reinicializações do banco de dados relacional.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#3e484f]/25 bg-[#0b1326]/50 p-4 rounded-xl text-center text-xs text-[#bdc8d1]/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            💡 <strong>Dica de Segurança:</strong> Alterações de privilégios nesta matriz são persistidas no banco (via servidor) e aplicadas em tempo real para cada módulo do sistema, conforme o cargo correspondente.
          </span>
          <span className="text-[10px] font-mono text-[#cbd5e1]/45">
            Versão do Schema RBAC: 1.6.0-educore
          </span>
        </div>
      </section>
      )}
    </div>
  );
}
