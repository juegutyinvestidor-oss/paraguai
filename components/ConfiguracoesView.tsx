'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { apiCall } from '../lib/sessionClient';
import { normalizeRole } from '../lib/rbac';
import { type LgpdRequest } from '../types/edukyne';

const LGPD_REQUEST_LABELS: Record<string, string> = {
  copia: 'Cópia de dados',
  correcao: 'Correção',
  exclusao: 'Exclusão',
  portabilidade: 'Portabilidade',
  revogacao: 'Revogação',
};

export default function ConfiguracoesView() {
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
      setLgpdError('Não foi possível carregar as solicitações. A tabela lgpd_requests pode não existir ainda (execute a migração 20260909_004 no SQL Editor).');
    } finally {
      setLgpdLoading(false);
    }
  }, []);

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
          role: p.role || 'Profissional',
        }));
      setTitulares(opts);
    } catch (err) {
      console.error('Erro ao carregar titulares:', err);
    }
  }, []);

  useEffect(() => {
    loadTitulares();
  }, [loadTitulares]);

  const handleCreateForTitular = async () => {
    const t = titulares.find(o => o.key === lgpdForForm.titularKey);
    if (!t) {
      setLgpdError('Selecione o titular da solicitacao.');
      return;
    }
    setLgpdForBusy(true);
    setLgpdError(null);
    setLgpdInfo(null);
    const res = await apiCall('/api/lgpd', {
      action: 'create_for',
      requestType: lgpdForForm.requestType,
      titular: { id: t.id, email: t.email, role: t.role },
      notes: lgpdForForm.notes || undefined,
    });
    setLgpdForBusy(false);
    if (!res.ok) {
      setLgpdError(res.error || 'Falha ao registrar a solicitacao.');
      return;
    }
    setLgpdInfo(`Solicitacao registrada para ${t.name} - Protocolo: ${res.data?.protocol || ''}`);
    setLgpdForForm({ titularKey: '', requestType: 'copia', notes: '' });
    loadLgpdRequests();
  };

  const handleResolveLgpd = async (id: string, status: 'resolvida' | 'recusada') => {
    setLgpdBusyId(id);
    setLgpdError(null);
    const res = await apiCall('/api/lgpd', { action: 'resolve', id, status });
    setLgpdBusyId(null);
    if (!res.ok) {
      setLgpdError(res.error || 'Falha ao atualizar a solicitação.');
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
                <span>Solicitações LGPD dos Titulares (Art. 18)</span>
              </h4>
              <p className="text-[11px] text-[#bdc8d1]/75 mt-1">
                Console do encarregado: pedidos de cópia, correção e exclusão recebidos pelo sistema ou por canal externo. Prazo legal: 15 dias.
              </p>
            </div>
            <button
              type="button"
              onClick={loadLgpdRequests}
              className="shrink-0 p-2 bg-[#0a0f1d] border border-[#3e484f]/40 rounded-lg hover:border-[#38bdf8]/60 text-[#8ed5ff] cursor-pointer"
              title="Recarregar solicitações"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${lgpdLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {canResolveLgpd && (
            <div className="p-4 bg-[#0a0f1d]/70 border border-[#3e484f]/25 rounded-xl space-y-3">
              <p className="text-[10px] font-bold text-[#8ed5ff] uppercase tracking-wider">
                Registrar solicitação recebida por canal externo (e-mail/telefone) — titulares: Gestores e Professores
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={lgpdForForm.titularKey}
                  onChange={(e) => setLgpdForForm(f => ({ ...f, titularKey: e.target.value }))}
                  className="bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-[11px] text-[#dae2fd] outline-none focus:border-[#38bdf8] cursor-pointer"
                >
                  <option value="">Titular do pedido...</option>
                  {titulares.map(t => (
                    <option key={t.key} value={t.key}>{t.name} ({t.role})</option>
                  ))}
                </select>
                <select
                  value={lgpdForForm.requestType}
                  onChange={(e) => setLgpdForForm(f => ({ ...f, requestType: e.target.value }))}
                  className="bg-[#0b1326] border border-[#3e484f] rounded-lg px-3 py-2 text-[11px] text-[#dae2fd] outline-none focus:border-[#38bdf8] cursor-pointer"
                >
                  <option value="copia">Cópia dos dados</option>
                  <option value="correcao">Correção de dados</option>
                  <option value="exclusao">Exclusão de dados</option>
                  <option value="portabilidade">Portabilidade</option>
                  <option value="revogacao">Revogação de consentimento</option>
                </select>
                <input
                  type="text"
                  placeholder="Observações (opcional)"
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
                  {lgpdForBusy ? 'Registrando...' : 'Registrar Solicitação'}
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
            <p className="text-[11px] text-[#bdc8d1]/60">Nenhuma solicitação registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse min-w-[820px]">
                <thead>
                  <tr className="text-[#8ed5ff] uppercase tracking-wider text-[9px] border-b border-[#3e484f]/30">
                    <th className="py-2 pr-3 font-bold">Protocolo</th>
                    <th className="py-2 pr-3 font-bold">Titular</th>
                    <th className="py-2 pr-3 font-bold">Tipo</th>
                    <th className="py-2 pr-3 font-bold">Data</th>
                    <th className="py-2 pr-3 font-bold">Status</th>
                    {canResolveLgpd && <th className="py-2 font-bold text-right">Ações</th>}
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
                      <td className="py-2 pr-3 capitalize">{LGPD_REQUEST_LABELS[r.request_type] || r.request_type}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide ${
                          r.status === 'pendente'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                            : r.status === 'resolvida'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                        }`}
                        >
                          {r.status}
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
                                {lgpdBusyId === r.id ? '...' : 'Resolver'}
                              </button>
                              <button
                                type="button"
                                disabled={lgpdBusyId === r.id}
                                onClick={() => handleResolveLgpd(r.id, 'recusada')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-bold cursor-pointer disabled:opacity-50"
                              >
                                <X className="w-3 h-3" />
                                <span>Recusar</span>
                              </button>
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#bdc8d1]/45">
                              {r.resolved_at ? `tratada em ${new Date(r.resolved_at).toLocaleDateString('pt-BR')}` : 'concluída'}
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
              <strong className="text-[#8ed5ff]">Encarregado de Proteção de Dados (DPO):</strong>{' '}
              Para revogar consentimento, solicitar portabilidade ou esclarecer dúvidas,
              entre em contato pelo e-mail <span className="text-[#8ed5ff] font-mono">lgpd@edukyne.com.br</span>.
              Consulte também nossa{' '}
              <a href="/politica-privacidade" className="text-[#38bdf8] underline hover:text-[#8ed5ff]">
                Política de Privacidade
              </a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
