'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, User, Phone, Check, X, Trash2, Loader2, RefreshCw, Plus, AlertTriangle, Pencil, ChevronLeft, ChevronRight, LayoutList, Download } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type Visao = 'lista' | 'calendario';

export function TabAgendamentos({ data }: any) {
  const [ags, setAgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [modalAg, setModalAg] = useState<any>(null);
  const [visao, setVisao] = useState<Visao>('lista');

  async function load() {
    setLoading(true);
    try {
      const r = await api.agendamentosDaEmpresa(data.empresa.id);
      setAgs(r);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [data.empresa.id]);

  async function setStatus(id: string, status: string) {
    try {
      await api.atualizarAgendamento(id, { status });
      toast.success(`Marcado como ${status}`);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function deletar(id: string) {
    if (!confirm('Excluir este agendamento?')) return;
    try {
      await api.deletarAgendamento(id);
      toast.success('Excluído');
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function exportarCSV() {
    const rows = filtered.map(a => ({
      cliente: a.cliente_nome || '',
      numero: a.cliente_numero || '',
      servico: a.servico_nome || '',
      data_hora: a.data_hora ? new Date(a.data_hora).toLocaleString('pt-BR') : '',
      status: a.status || '',
      profissional: a.profissional || '',
      duracao: a.duracao_minutos || '',
    }));
    const header = Object.keys(rows[0] || {}).join(';');
    const body = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const csv = '﻿' + header + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'agendamentos.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = ags.filter((a) => filtroStatus === 'todos' || a.status === filtroStatus);
  const pendentes = ags.filter((a) => a.status === 'pendente').length;
  const confirmados = ags.filter((a) => a.status === 'confirmado').length;
  const realizados = ags.filter((a) => a.status === 'realizado').length;
  const cancelados = ags.filter((a) => a.status === 'cancelado').length;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4 text-sm text-violet-200 flex items-center justify-between gap-3">
        <span>📅 Agendamentos capturados pela IA aparecem aqui automaticamente.</span>
        <div className="flex gap-2 shrink-0 items-center">
          {/* Toggle visão */}
          <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs">
            <button
              onClick={() => setVisao('lista')}
              className={`px-3 py-1.5 flex items-center gap-1 transition ${visao === 'lista' ? 'bg-violet-600 text-white' : 'text-white/40 hover:text-white'}`}
            >
              <LayoutList className="h-3.5 w-3.5" /> Lista
            </button>
            <button
              onClick={() => setVisao('calendario')}
              className={`px-3 py-1.5 flex items-center gap-1 transition ${visao === 'calendario' ? 'bg-violet-600 text-white' : 'text-white/40 hover:text-white'}`}
            >
              <Calendar className="h-3.5 w-3.5" /> Calendário
            </button>
          </div>
          <button onClick={() => setModalAg({})} className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
            <Plus className="h-3.5 w-3.5" /> Novo
          </button>
          <button onClick={exportarCSV} title="Exportar CSV" className="text-violet-300 hover:text-white p-1.5 rounded-lg hover:bg-white/5">
            <Download className="h-4 w-4" />
          </button>
          <button onClick={load} className="text-violet-300 hover:text-white p-1.5 rounded-lg hover:bg-white/5">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cards de status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: 'pendente', label: 'Pendentes', count: pendentes, color: 'amber' },
          { key: 'confirmado', label: 'Confirmados', count: confirmados, color: 'blue' },
          { key: 'realizado', label: 'Realizados', count: realizados, color: 'emerald' },
          { key: 'cancelado', label: 'Cancelados', count: cancelados, color: 'red' },
        ].map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => setFiltroStatus(filtroStatus === key ? 'todos' : key)}
            className={`card p-4 text-left transition ${filtroStatus === key ? `ring-2 ring-${color}-500` : ''}`}
          >
            <div className={`text-2xl font-bold text-${color}-400`}>{count}</div>
            <div className="text-xs text-white/50 flex items-center gap-1">
              {key === 'pendente' && <Clock className="h-3 w-3" />}{label}
            </div>
          </button>
        ))}
      </div>

      {/* Modal */}
      {modalAg !== null && (
        <AgendamentoModal
          empresaId={data.empresa.id}
          agendamento={modalAg}
          onClose={() => setModalAg(null)}
          onSaved={() => { setModalAg(null); load(); }}
        />
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin text-white/30 mx-auto" /></div>
      ) : visao === 'calendario' ? (
        <CalendarioView
          agendamentos={ags}
          filtroStatus={filtroStatus}
          onEditar={(a: any) => setModalAg(a)}
          onNovo={(dataHora?: string) => setModalAg(dataHora ? { data_hora: dataHora } : {})}
        />
      ) : (
        <>
          {filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-white/20 mb-3" />
              <p className="text-white/50">{filtroStatus === 'todos' ? 'Nenhum agendamento ainda' : `Nenhum agendamento ${filtroStatus}`}</p>
              <p className="text-xs text-white/30 mt-1">Quando a IA detectar uma marcação no WhatsApp ou no chat-teste, aparecerá aqui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((a) => (
                <AgendamentoCard
                  key={a.id}
                  a={a}
                  onConfirmar={() => setStatus(a.id, 'confirmado')}
                  onRealizar={() => setStatus(a.id, 'realizado')}
                  onCancelar={() => setStatus(a.id, 'cancelado')}
                  onDeletar={() => deletar(a.id)}
                  onEditar={() => setModalAg(a)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Calendário mensal
// ============================================================
const STATUS_COLORS: Record<string, string> = {
  pendente:   'bg-amber-500/80 text-amber-950',
  confirmado: 'bg-blue-500/80 text-blue-950',
  realizado:  'bg-emerald-500/80 text-emerald-950',
  cancelado:  'bg-red-500/30 text-red-300 line-through',
  reagendado: 'bg-violet-500/80 text-violet-950',
};

function CalendarioView({ agendamentos, filtroStatus, onEditar, onNovo }: any) {
  const hoje = new Date();
  const [mes, setMes] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [diaDetalhe, setDiaDetalhe] = useState<string | null>(null);

  const ano = mes.getFullYear();
  const mesIdx = mes.getMonth();
  const primeiroDia = new Date(ano, mesIdx, 1).getDay(); // 0=dom
  const ultimoDia = new Date(ano, mesIdx + 1, 0).getDate();

  const filtered = agendamentos.filter((a: any) => filtroStatus === 'todos' || a.status === filtroStatus);

  function agsDoDia(dia: number) {
    const dStr = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return filtered.filter((a: any) => a.data_hora?.slice(0, 10) === dStr);
  }

  function clickDia(dia: number) {
    const dStr = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    setDiaDetalhe(dStr === diaDetalhe ? null : dStr);
  }

  function novoNoDia(dia: number) {
    const dStr = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}T09:00`;
    onNovo(dStr);
  }

  const mesNome = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Agendamentos do dia selecionado para o painel lateral
  const agsDetalhe = diaDetalhe ? filtered.filter((a: any) => a.data_hora?.slice(0, 10) === diaDetalhe) : [];

  return (
    <div className="space-y-3">
      {/* Cabeçalho do calendário */}
      <div className="flex items-center justify-between">
        <button onClick={() => setMes(new Date(ano, mesIdx - 1, 1))} className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-white font-semibold capitalize">{mesNome}</h3>
        <button onClick={() => setMes(new Date(ano, mesIdx + 1, 1))} className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Grid */}
      <div className="card p-4">
        <div className="grid grid-cols-7 mb-2">
          {diasSemana.map((d) => (
            <div key={d} className="text-center text-xs text-white/30 font-medium py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {/* Células vazias antes do primeiro dia */}
          {Array.from({ length: primeiroDia }).map((_, i) => <div key={`v${i}`} />)}

          {/* Dias do mês */}
          {Array.from({ length: ultimoDia }, (_, i) => i + 1).map((dia) => {
            const ags = agsDoDia(dia);
            const dStr = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const isHoje = dStr === hoje.toISOString().slice(0, 10);
            const isSelecionado = dStr === diaDetalhe;

            return (
              <button
                key={dia}
                onClick={() => clickDia(dia)}
                className={`min-h-[4.5rem] rounded-xl p-1.5 text-left transition border ${
                  isSelecionado ? 'border-violet-500/60 bg-violet-500/10' :
                  isHoje ? 'border-white/20 bg-white/5' :
                  'border-transparent hover:border-white/10 hover:bg-white/[0.03]'
                }`}
              >
                <div className={`text-xs font-semibold mb-1 ${isHoje ? 'text-violet-400' : 'text-white/60'}`}>{dia}</div>
                <div className="space-y-0.5">
                  {ags.slice(0, 3).map((a: any) => (
                    <div
                      key={a.id}
                      className={`text-[10px] rounded px-1 truncate leading-tight py-0.5 font-medium ${STATUS_COLORS[a.status] || 'bg-white/10 text-white/60'}`}
                    >
                      {new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {a.cliente_nome || a.servico_nome || '—'}
                    </div>
                  ))}
                  {ags.length > 3 && (
                    <div className="text-[10px] text-white/40 pl-1">+{ags.length - 3} mais</div>
                  )}
                  {ags.length === 0 && (
                    <div
                      onClick={(e) => { e.stopPropagation(); novoNoDia(dia); }}
                      className="text-[10px] text-white/10 hover:text-violet-400 pl-1 transition"
                      title="Novo agendamento"
                    >+ novo</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel de detalhe do dia */}
      {diaDetalhe && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-medium">
              {new Date(diaDetalhe + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </h4>
            <button
              onClick={() => novoNoDia(parseInt(diaDetalhe.slice(8, 10)))}
              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
            >
              <Plus className="h-3.5 w-3.5" /> Novo neste dia
            </button>
          </div>

          {agsDetalhe.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-4">Nenhum agendamento neste dia</p>
          ) : (
            <div className="space-y-2">
              {agsDetalhe
                .sort((a: any, b: any) => a.data_hora.localeCompare(b.data_hora))
                .map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/5 p-3">
                    <div className="text-xs text-white/50 w-12 shrink-0 font-mono">
                      {new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{a.cliente_nome || '—'}</div>
                      <div className="text-xs text-white/40 truncate">{a.servico_nome || 'Sem serviço'}{a.duracao_minutos ? ` · ${a.duracao_minutos}min` : ''}</div>
                    </div>
                    <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[a.status] || ''}`}>
                      {a.status}
                    </span>
                    <button onClick={() => onEditar(a)} className="text-white/30 hover:text-white p-1">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Modal criar / editar
// ============================================================
function AgendamentoModal({ empresaId, agendamento, onClose, onSaved }: any) {
  const isEdit = !!agendamento?.id;

  function toLocalDatetime(iso: string) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const [form, setForm] = useState({
    cliente_nome:    agendamento?.cliente_nome    || '',
    cliente_numero:  agendamento?.cliente_numero  || '',
    servico_nome:    agendamento?.servico_nome    || '',
    data_hora:       agendamento?.data_hora ? toLocalDatetime(agendamento.data_hora) : (agendamento?._data_hora_pre || ''),
    duracao_minutos: String(agendamento?.duracao_minutos || '60'),
    profissional:    agendamento?.profissional    || '',
    observacoes:     agendamento?.observacoes     || '',
  });
  const [conflito, setConflito] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  async function checkDisponibilidade() {
    if (!form.data_hora) return;
    setChecking(true);
    setConflito(null);
    try {
      const r = await api.verificarDisponibilidade(empresaId, form.data_hora, parseInt(form.duracao_minutos) || 60);
      if (!r.disponivel && r.conflito?.id !== agendamento?.id) setConflito(r.conflito);
    } catch { } finally {
      setChecking(false);
    }
  }

  async function salvar() {
    if (!form.data_hora) return toast.error('Data/hora obrigatório');
    if (conflito) return toast.error('Resolva o conflito de horário');
    setSaving(true);
    try {
      if (isEdit) {
        await api.atualizarAgendamento(agendamento.id, { ...form, duracao_minutos: parseInt(form.duracao_minutos) || 60 });
        toast.success('Agendamento atualizado!');
      } else {
        await api.criarAgendamento(empresaId, { ...form, duracao_minutos: parseInt(form.duracao_minutos) || 60 });
        toast.success('Agendamento criado!');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{isEdit ? '✏️ Editar Agendamento' : '📅 Novo Agendamento'}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Data e Hora *</label>
            <input type="datetime-local" className="input w-full"
              value={form.data_hora}
              onChange={(e) => { setForm({ ...form, data_hora: e.target.value }); setConflito(null); }}
              onBlur={checkDisponibilidade}
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Duração (min)</label>
            <input type="number" className="input w-full" min="15" step="15"
              value={form.duracao_minutos}
              onChange={(e) => { setForm({ ...form, duracao_minutos: e.target.value }); setConflito(null); }}
              onBlur={checkDisponibilidade}
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Serviço</label>
            <input type="text" className="input w-full" placeholder="Nome do serviço"
              value={form.servico_nome} onChange={(e) => setForm({ ...form, servico_nome: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Cliente</label>
            <input type="text" className="input w-full" placeholder="Nome completo"
              value={form.cliente_nome} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Telefone/WhatsApp</label>
            <input type="text" className="input w-full" placeholder="5511999887766"
              value={form.cliente_numero} onChange={(e) => setForm({ ...form, cliente_numero: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Profissional</label>
            <input type="text" className="input w-full" placeholder="Opcional"
              value={form.profissional} onChange={(e) => setForm({ ...form, profissional: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Observações</label>
            <textarea className="input w-full resize-none" rows={2}
              value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>

        {checking && <div className="flex items-center gap-2 text-xs text-white/40"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando disponibilidade...</div>}

        {conflito && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 flex items-start gap-2 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Horário já ocupado!</p>
              <p className="text-xs text-red-400 mt-0.5">{conflito.cliente} — {conflito.servico} às {new Date(conflito.data_hora).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
          <button onClick={salvar} disabled={saving || !!conflito || !form.data_hora}
            className="flex-1 btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : isEdit ? 'Salvar alterações' : 'Criar agendamento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Card de agendamento (visão lista)
// ============================================================
function AgendamentoCard({ a, onConfirmar, onRealizar, onCancelar, onDeletar, onEditar }: any) {
  const dt = new Date(a.data_hora);
  const dataStr = dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  const horaStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const isPast = dt < new Date();

  const styles: Record<string, any> = {
    pendente:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400' },
    confirmado: { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400' },
    realizado:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
    cancelado:  { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400' },
    reagendado: { bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  text: 'text-violet-400' },
  };
  const s = styles[a.status] || { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/60' };

  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>{a.status.toUpperCase()}</span>
            <span className="text-white font-semibold capitalize">{dataStr}</span>
            <span className="text-white/60">às {horaStr}</span>
            {a.duracao_minutos && <span className="text-xs text-white/40">({a.duracao_minutos}min)</span>}
            {isPast && a.status === 'pendente' && <span className="text-xs text-red-400">⚠️ atrasado</span>}
            {a.lembrete_enviado && <span className="text-xs text-violet-400">🔔 lembrete enviado</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {a.servico_nome && <div className="text-white/80">📋 {a.servico_nome}</div>}
            {a.cliente_nome && <div className="text-white/70 flex items-center gap-1"><User className="h-3.5 w-3.5" /> {a.cliente_nome}</div>}
            {a.cliente_numero && a.cliente_numero !== 'TESTE' && <div className="text-white/60 flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {a.cliente_numero}</div>}
            {a.profissional && <div className="text-white/60">👨‍⚕️ {a.profissional}</div>}
          </div>
          {a.observacoes && <p className="mt-2 text-xs text-white/50 italic">&quot;{a.observacoes}&quot;</p>}
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          {a.status === 'pendente' && (
            <button onClick={onConfirmar} className="rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-1.5 text-xs flex items-center gap-1">
              <Check className="h-3 w-3" /> Confirmar
            </button>
          )}
          {(a.status === 'confirmado' || a.status === 'pendente') && (
            <button onClick={onRealizar} className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3 py-1.5 text-xs flex items-center gap-1">
              <Check className="h-3 w-3" /> Realizado
            </button>
          )}
          <button onClick={onEditar} className="rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-3 py-1.5 text-xs flex items-center gap-1">
            <Pencil className="h-3 w-3" /> Editar
          </button>
          {a.status !== 'cancelado' && a.status !== 'realizado' && (
            <button onClick={onCancelar} className="rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 text-xs flex items-center gap-1">
              <X className="h-3 w-3" /> Cancelar
            </button>
          )}
          <button onClick={onDeletar} className="rounded-lg hover:bg-white/5 text-white/30 hover:text-red-400 p-1.5">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
