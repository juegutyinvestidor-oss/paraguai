'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ShieldCheck, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { apiCall } from '../lib/sessionClient';
import { normalizeRole } from '../lib/rbac';
import { type LgpdRequest } from '../types/edukyne';
import { Link } from '../i18n/navigation';

export default function ConfiguracoesView() {
  const t = useTranslations('configuracoes');
  const ta = useTranslations('alunos');
  const locale = useLocale();

  const requestLabels: Record<string, string> = {
    copia: t('tipoCopia'),
    correcao: t('tipoCorrecao'),
    exclusao: t('tipoExclusao'),
    portabilidade: t('tipoPortabilidade'),
    revogacao: t('tipoRevogacao'),
  };

  const statusLabels: Record<string, string> = {
    pendente: t('statusPendente'),
    resolvida: t('statusResolvida'),
    recusada: t('statusRecusada'),
  };

  const richTags = {
    strong: (chunks: React.ReactNode) => <strong className="text-[#8ed5ff]">{chunks}</strong>,
    email: (chunks: React.ReactNode) => <span className="text-[#8ed5ff] font-mono">{chunks}</span>,
    link: (chunks: React.ReactNode) => (
      <Link href="/politica-privacidade" className="text-[#38bdf8] underline hover:text-[#8ed5ff]">
        {chunks}
      </Link>
    ),
  };

  // --- LGPD Art.18 requests console (DPO / Administrador) ---
  const [lgpdRequests, setLgpdRequests] = useState<LgpdRequest[]>([]);
  const [lgpdLoading, setLgpdLoading] = useState(false);
  const [lgpdBusyId, setLgpdBusyId] = useState<string | null>(null);
  const [lgpdError, setLgpdError] = useState<string | null>(null);
  const [lgpdInfo, setLgpdInfo] = useState<string | null>(null);
  const [canResolveLgpd, setCanResolveLgpd] = useState(false);
  type TitularOption = { key: string; id: string; name: string; email: string; role: string };
  const [titulares, setTitulares] = useState<TitularOption[]>([]);
  const [lgpdForForm, setLgpdForForm] = useState({ titularKey: '', requestType: 'copia', notes: '' });
  const [lgpdForBusy, setLgpdForBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Limpa credenciais legadas do antigo painel de conexão (override não existe mais)
    localStorage.removeItem('educore_supabase_url');
    localStorage.removeItem('educore_supabase_anon_key');
    try {
      const raw = localStorage.getItem('educore_user');
      if (raw) setCanResolveLgpd(normalizeRole(JSON.parse(raw)?.role || '') === 'Administrador');
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadLgpdRequests = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLgpdLoading(true);
    setLgpdError(null);
    try {
      const { data, error } = await supabase
        .from('lgpd_requests')
        .select('id, requester_id, requester_email, requester_role, request_type, notes, status, resolved_by, resolved_at, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setLgpdRequests((data as LgpdRequest[]) || []);
    } catch (err) {
      console.error('Erro ao carregar solicitacoes LGPD:', err);
      setLgpdError(t('erroCarregar'));
    } finally {
      setLgpdLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadLgpdRequests();
  }, [loadLgpdRequests]);

  const loadTitulares = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      // Titulares restritos a Gestor e Professor (mantem a lista enxuta)
      const { data } = await supabase.from('professionals').select('id, name, email, role');
      const allowed = new Set(['Gestor', 'Professor']);
      const opts: TitularOption[] = (data || [])
        .filter((p: { role?: string }) => allowed.has(normalizeRole(p?.role || '')))
        .map((p: { id: string; name: string; email: string; role: string }) => ({
          key: `P|${p.id}`,
          id: p.id,
          name: p.name,
          email: p.email || '',
          role: p.role || t('profissional'),
        }));
      setTitulares(opts);
    } catch (err) {
      console.error('Erro ao carregar titulares:', err);
    }
  }, [t]);

  useEffect(() => {
    loadTitulares();
  }, [loadTitulares]);

  const handleCreateForTitular = async () => {
    const titularSelecionado = titulares.find(o => o.key === lgpdForForm.titularKey);
    if (!titularSelecionado) {
      setLgpdError(t('erroSelecionarTitular'));
      return;
    }
    setLgpdForBusy(true);
    setLgpdError(null);
    setLgpdInfo(null);
    const res = await apiCall('/api/lgpd', {
      action: 'create_for',
      requestType: lgpdForForm.requestType,
      titular: { id: titularSelecionado.id, email: titularSelecionado.email, role: titularSelecionado.role },
      notes: lgpdForForm.notes || undefined,
    });
    setLgpdForBusy(false);
    if (!res.ok) {
      setLgpdError(res.error || t('erroRegistrar'));
      return;
    }
    setLgpdInfo(t('solicitacaoRegistrada', {
      nome: titularSelecionado.name,
      protocolo: String(res.data?.protocol ?? ''),
    }));
    setLgpdForForm({ titularKey: '', requestType: 'copia', notes: '' });
    loadLgpdRequests();
  };

  const handleResolveLgpd = async (id: string, status: 'resolvida' | 'recusada') => {
    setLgpdBusyId(id);
    setLgpdError(null);
    const res = await apiCall('/api/lgpd', { action: 'resolve', id, status });
    setLgpdBusyId(null);
    if (!res.ok) {
      setLgpdError(res.error || t('erroAtualizar'));
      return;
    }
    setLgpdRequests(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-[#dae2fd]">
      <section className="bg-[#171f33] border border-[#3e484f]/40 rounded-xl p-6 shadow-lg space-y-6">
        {/* LGPD REQUESTS CONSOLE */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-[#3e484f]/25 pb-3">
            <div>
              <h4 className="text-xs font-bold text-[#bdc8d1] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-4 h-4 text-[#38bdf8]" />
                <span>{t('titulo')}</span>
              </h4>
              <p className="text-[11px] text-[#bdc8d1]/75 mt-1">
                {t('subtitulo')}
              </p>
            </div>
            <button
              type="button"
              onClick={loadLgpdRequests}
              className="shrink-0 p-2 bg-[#0a0f1d] border border-[#3e484f]/40 rounded-lg hover:border-[#38bdf8]/60 text-[#8ed5ff] cursor-pointer"
              title={t('recarregar')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${lgpdLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {canResolveLgpd && (
            <div className="p-4 bg-[#0a0f1d]/70 border border-[#3e484f]/25 rounded-xl space-y-3">
              <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">
                {t('registrarExterno')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={lgpdForForm.titularKey}
                  onChange={(e) => setLgpdForForm(f => ({ ...f, titularKey: e.target.value }))}
                  className="bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-[11px] text-[#dae2fd] outline-none focus:border-[#38bdf8] cursor-pointer"
                >
                  <option value="">{t('titularPedido')}</option>
                  {titulares.map(op => (
                    <option key={op.key} value={op.key}>{op.name} ({op.role})</option>
                  ))}
                </select>
                <select
                  value={lgpdForForm.requestType}
                  onChange={(e) => setLgpdForForm(f => ({ ...f, requestType: e.target.value }))}
                  className="bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-[11px] text-[#dae2fd] outline-none focus:border-[#38bdf8] cursor-pointer"
                >
                  <option value="copia">{t('formCopia')}</option>
                  <option value="correcao">{t('formCorrecao')}</option>
                  <option value="exclusao">{t('formExclusao')}</option>
                  <option value="portabilidade">{t('formPortabilidade')}</option>
                  <option value="revogacao">{t('formRevogacao')}</option>
                </select>
                <input
                  type="text"
                  placeholder={t('observacoes')}
                  maxLength={500}
                  value={lgpdForForm.notes}
                  onChange={(e) => setLgpdForForm(f => ({ ...f, notes: e.target.value }))}
                  className="bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-[11px] text-[#dae2fd] outline-none focus:border-[#38bdf8]"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={lgpdForBusy || !lgpdForForm.titularKey}
                  onClick={handleCreateForTitular}
                  className="px-4 py-2 rounded-lg bg-[#38bdf8] text-[#001e2c] hover:bg-[#38bdf8]/90 text-[11px] font-extrabold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {lgpdForBusy ? t('registrando') : t('registrarSolicitacao')}
                </button>
              </div>
            </div>
          )}

          {lgpdInfo && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/25 rounded-lg text-[11px] text-emerald-400">
              {lgpdInfo}
            </div>
          )}

          {lgpdError && (
            <div className="p-3 bg-[#93000a]/15 border border-[#93000a]/40 rounded-lg text-[11px] text-[#ffb4ab] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{lgpdError}</span>
            </div>
          )}

          {lgpdRequests.length === 0 && !lgpdLoading && !lgpdError ? (
            <p className="text-[11px] text-[#bdc8d1]/60">{t('nenhumaSolicitacao')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse min-w-[820px]">
                <thead>
                  <tr className="text-[#8ed5ff] uppercase tracking-wider text-[9px] border-b border-[#3e484f]/30">
                    <th className="py-2 pr-3 font-bold">{t('protocolo')}</th>
                    <th className="py-2 pr-3 font-bold">{t('titular')}</th>
                    <th className="py-2 pr-3 font-bold">{t('tipo')}</th>
                    <th className="py-2 pr-3 font-bold">{t('data')}</th>
                    <th className="py-2 pr-3 font-bold">{ta('status')}</th>
                    {canResolveLgpd && <th className="py-2 font-bold text-right">{ta('acoes')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {lgpdRequests.map((r) => (
                    <tr key={r.id} className="border-b border-[#3e484f]/15 text-[#bdc8d1]/85">
                      <td className="py-2 pr-3 font-mono whitespace-nowrap">{r.id}</td>
                      <td className="py-2 pr-3">
                        <span className="block font-semibold text-[#dae2fd]">{r.requester_email}</span>
                        <span className="text-[10px] text-[#bdc8d1]/55">{r.requester_role || '-'}</span>
                      </td>
                      <td className="py-2 pr-3 capitalize">{requestLabels[r.request_type] || r.request_type}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleDateString(locale) : '-'}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide ${
                          r.status === 'pendente'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                            : r.status === 'resolvida'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                        }`}
                        >
                          {statusLabels[r.status] || r.status}
                        </span>
                      </td>
                      {canResolveLgpd && (
                        <td className="py-2 text-right whitespace-nowrap">
                          {r.status === 'pendente' ? (
                            <span className="inline-flex gap-1.5">
                              <button
                                type="button"
                                disabled={lgpdBusyId === r.id}
                                onClick={() => handleResolveLgpd(r.id, 'resolvida')}
                                className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 font-bold cursor-pointer disabled:opacity-50"
                              >
                                {lgpdBusyId === r.id ? '...' : t('resolver')}
                              </button>
                              <button
                                type="button"
                                disabled={lgpdBusyId === r.id}
                                onClick={() => handleResolveLgpd(r.id, 'recusada')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-bold cursor-pointer disabled:opacity-50"
                              >
                                <X className="w-3 h-3" />
                                  <span>{t('recusar')}</span>
                              </button>
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#bdc8d1]/45">
                              {r.resolved_at
                                ? t('tratadaEm', { data: new Date(r.resolved_at).toLocaleDateString(locale) })
                                : t('concluida')}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-[#0b1326]/50 border border-[#3e484f]/25 rounded-xl p-4">
            <p className="text-[10px] text-[#bdc8d1]/80 leading-relaxed">
              {t.rich('contatoDpo', richTags)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
