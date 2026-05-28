'use client';

import { useEffect, useState } from 'react';
import { Loader2, Calendar, MessageSquare, Users, TrendingUp, Clock, CheckCircle, AlertTriangle, Phone, Star, RefreshCw, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { EmpresaShell } from '@/components/EmpresaShell';
import { api } from '@/lib/api';
import { TabIdentidade } from '@/app/empresas/[id]/tabs/TabIdentidade';
import { TabServicos } from '@/app/empresas/[id]/tabs/TabServicos';
import { TabFaq } from '@/app/empresas/[id]/tabs/TabFaq';
import { TabHorarios } from '@/app/empresas/[id]/tabs/TabHorarios';
import { TabConexao } from '@/app/empresas/[id]/tabs/TabConexao';
import { TabChatTest } from '@/app/empresas/[id]/tabs/TabChatTest';
import { TabAgendamentos } from '@/app/empresas/[id]/tabs/TabAgendamentos';
import { TabEscalonamentos } from '@/app/empresas/[id]/tabs/TabEscalonamentos';
import { TabMetricas } from '@/app/empresas/[id]/tabs/TabMetricas';

const TABS = [
  { id: 'home',         label: '🏠 Início' },
  { id: 'agendamentos', label: '📅 Agenda' },
  { id: 'conversas',    label: '💬 Conversas' },
  { id: 'clientes',     label: '👥 Clientes' },
  { id: 'escalacoes',   label: '🚨 Escalações' },
  { id: 'metricas',     label: '📈 Métricas' },
  { id: 'ia',           label: '🤖 IA' },
  { id: 'servicos',     label: '💼 Serviços' },
  { id: 'faq',          label: '❓ FAQ' },
  { id: 'horarios',     label: '🕐 Horários' },
  { id: 'conexao',      label: '📱 WhatsApp' },
  { id: 'chat',         label: '💬 Teste' },
];

// ─── HOME DASHBOARD ────────────────────────────────────────────
function TabHome({ data, empresaId }: any) {
  const [stats, setStats] = useState<any>(null);
  const [agendaDia, setAgendaDia] = useState<any[]>([]);
  const [escalacoes, setEscalacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.metricasEmpresa(empresaId, 30),
      api.agendamentosDaEmpresa(empresaId),
      api.escalonamentos(false),
    ]).then(([m, ags, escals]) => {
      setStats(m);
      const hoje = new Date().toDateString();
      setAgendaDia(ags.filter((a: any) => new Date(a.data_hora).toDateString() === hoje && a.status !== 'cancelado').sort((a: any, b: any) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()));
      setEscalacoes(escals.filter((e: any) => e.empresa_id === empresaId).slice(0, 5));
    }).catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [empresaId]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-400" /></div>;
  const r = stats?.resumo || {};
  const c = stats?.conversas || {};

  return (
    <div className="space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Conversas (30d)', valor: c.total || 0, icon: MessageSquare, cor: 'brand' },
          { label: 'Resolvidas pela IA', valor: `${c.taxa_resolucao || 0}%`, icon: CheckCircle, cor: 'emerald' },
          { label: 'Escalações', valor: c.escaladas || 0, icon: AlertTriangle, cor: 'amber' },
          { label: 'Tempo médio resp.', valor: r.tempo_medio_ms ? `${(r.tempo_medio_ms/1000).toFixed(1)}s` : '—', icon: Clock, cor: 'blue' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-4">
              <div className={`text-2xl font-bold text-${card.cor}-400`}>{card.valor}</div>
              <div className="flex items-center gap-1.5 text-xs text-white/40 mt-1">
                <Icon className="h-3 w-3" />{card.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Agenda de hoje */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-violet-400" /> Agenda de Hoje
            </h3>
            <span className="text-xs text-white/30">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
          </div>
          {agendaDia.length === 0 ? (
            <p className="text-sm text-white/30 py-4 text-center">Nenhum agendamento hoje.</p>
          ) : (
            <div className="space-y-2">
              {agendaDia.map((ag: any) => {
                const hora = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const statusCor = ag.status === 'confirmado' ? 'emerald' : ag.status === 'realizado' ? 'blue' : 'amber';
                return (
                  <div key={ag.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
                    <span className="text-sm font-mono font-bold text-white/70 w-10 shrink-0">{hora}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{ag.cliente_nome || ag.cliente_numero}</div>
                      <div className="text-xs text-white/40 truncate">{ag.servico_nome || 'Serviço'}</div>
                    </div>
                    <span className={`text-xs rounded-full px-2 py-0.5 bg-${statusCor}-500/10 text-${statusCor}-400 shrink-0`}>{ag.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Escalações pendentes */}
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Escalações Pendentes
          </h3>
          {escalacoes.filter(e => !e.resolvido).length === 0 ? (
            <p className="text-sm text-white/30 py-4 text-center">✅ Nenhuma escalação pendente!</p>
          ) : (
            <div className="space-y-2">
              {escalacoes.filter(e => !e.resolvido).map((e: any) => (
                <div key={e.id} className="flex items-start gap-3 rounded-lg bg-orange-500/5 border border-orange-500/20 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{e.contato_nome || e.contato_numero}</div>
                    <div className="text-xs text-white/50 truncate">{e.motivo}</div>
                  </div>
                  {e.contato_numero && (
                    <a href={`https://wa.me/${e.contato_numero.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      className="shrink-0 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Satisfação recente */}
      {(stats?.conversas?.finalizadas > 0) && (
        <div className="card p-4">
          <h3 className="font-semibold text-white flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-amber-400" /> Desempenho da IA (últimos 30 dias)
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{c.total || 0}</div>
              <div className="text-xs text-white/40">Conversas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{c.finalizadas || 0}</div>
              <div className="text-xs text-white/40">Resolvidas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-400">{c.taxa_resolucao || 0}%</div>
              <div className="text-xs text-white/40">Taxa resolução</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB CONVERSAS ─────────────────────────────────────────────
function TabConversas({ empresaId }: any) {
  const [convs, setConvs] = useState<any[]>([]);
  const [convSel, setConvSel] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [filtro, setFiltro] = useState('todas');

  useEffect(() => {
    api.conversasDaEmpresa(empresaId)
      .then(setConvs)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [empresaId]);

  async function abrirConversa(conv: any) {
    setConvSel(conv);
    setLoadingMsgs(true);
    try { setMsgs(await api.mensagensDaConversa(conv.id)); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoadingMsgs(false); }
  }

  const filtradas = convs.filter(c => filtro === 'todas' || c.status === filtro);

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Lista */}
      <div className="w-72 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
        <div className="flex gap-1 mb-1">
          {['todas','em_andamento','escalada','finalizada'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-2 py-1 rounded-lg text-xs transition ${filtro === f ? 'bg-brand-500/20 text-brand-300' : 'text-white/40 hover:text-white'}`}>
              {f === 'todas' ? 'Todas' : f === 'em_andamento' ? 'Ativas' : f === 'escalada' ? 'Escaladas' : 'Finalizadas'}
            </button>
          ))}
        </div>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-brand-400" /></div>
          : filtradas.length === 0 ? <p className="text-center text-white/30 text-sm py-8">Nenhuma conversa</p>
          : filtradas.map(c => (
            <button key={c.id} onClick={() => abrirConversa(c)}
              className={`text-left p-3 rounded-xl border transition ${convSel?.id === c.id ? 'bg-brand-500/10 border-brand-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm text-white truncate">{c.contato_nome || c.contato_numero}</span>
                <span className={`text-xs rounded-full px-1.5 shrink-0 ${c.status === 'em_andamento' ? 'bg-blue-500/20 text-blue-400' : c.status === 'escalada' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {c.status === 'em_andamento' ? '●' : c.status === 'escalada' ? '!' : '✓'}
                </span>
              </div>
              <div className="text-xs text-white/30 mt-0.5">{new Date(c.ultima_mensagem_em || c.iniciada_em).toLocaleString('pt-BR')}</div>
            </button>
          ))}
      </div>

      {/* Chat */}
      <div className="flex-1 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col overflow-hidden">
        {!convSel ? (
          <div className="flex-1 flex items-center justify-center text-white/20 text-sm">Selecione uma conversa</div>
        ) : (
          <>
            <div className="p-3 border-b border-white/5 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-brand-500/20 flex items-center justify-center text-sm font-bold text-brand-300">
                {(convSel.contato_nome || convSel.contato_numero)?.[0]?.toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{convSel.contato_nome || convSel.contato_numero}</div>
                <div className="text-xs text-white/30">{convSel.contato_numero}</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-brand-400" /></div>
                : msgs.map((m: any) => (
                  <div key={m.id} className={`flex ${m.origem === 'cliente' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.origem === 'cliente' ? 'bg-white/10 text-white' : m.origem === 'ia' ? 'bg-brand-500/20 text-brand-100' : 'bg-emerald-500/20 text-emerald-100'}`}>
                      {m.conteudo}
                      <div className="text-xs opacity-40 mt-1">{m.origem === 'ia' ? '🤖' : m.origem === 'humano' ? '👤' : ''} {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── TAB CLIENTES ──────────────────────────────────────────────
function TabClientes({ empresaId }: any) {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editando, setEditando] = useState<any>(null);

  useEffect(() => {
    api.clientesDaEmpresa(empresaId, search)
      .then(setClientes)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [empresaId, search]);

  async function salvarNotas() {
    if (!editando) return;
    try {
      await api.atualizarCliente(empresaId, editando.numero, { notas: editando.notas, preferencias: editando.preferencias });
      toast.success('Salvo!');
      setEditando(null);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou número..." className="input" />

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-brand-400" /></div>
        : clientes.length === 0 ? <p className="text-center text-white/30 py-8">Nenhum cliente encontrado.</p>
        : (
          <div className="space-y-2">
            {clientes.map((c: any) => (
              <div key={c.numero} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{c.nome || c.numero}</span>
                      {c.total_visitas > 1 && <span className="text-xs bg-brand-500/20 text-brand-300 rounded-full px-2 py-0.5">{c.total_visitas}x visitas</span>}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5 flex items-center gap-3">
                      <span>{c.numero}</span>
                      {c.ultima_visita && <span>Última visita: {new Date(c.ultima_visita).toLocaleDateString('pt-BR')}</span>}
                      {c.total_agendamentos_real > 0 && <span>{c.total_agendamentos_real} agendamentos</span>}
                    </div>
                    {c.notas && <div className="text-xs text-white/50 mt-1.5 bg-white/5 rounded-lg px-2 py-1">📝 {c.notas}</div>}
                    {c.preferencias && <div className="text-xs text-white/50 mt-1 bg-white/5 rounded-lg px-2 py-1">⭐ {c.preferencias}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={`https://wa.me/${c.numero.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                    <button onClick={() => setEditando(editando?.numero === c.numero ? null : { ...c })} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white">
                      <ChevronRight className={`h-3.5 w-3.5 transition ${editando?.numero === c.numero ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                </div>

                {editando?.numero === c.numero && (
                  <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                    <div><label className="text-xs text-white/40 mb-1 block">Notas internas</label>
                      <textarea value={editando.notas || ''} onChange={e => setEditando({ ...editando, notas: e.target.value })} className="input text-sm min-h-[60px]" placeholder="Ex: prefere horários de manhã..." /></div>
                    <div><label className="text-xs text-white/40 mb-1 block">Preferências</label>
                      <input value={editando.preferencias || ''} onChange={e => setEditando({ ...editando, preferencias: e.target.value })} className="input text-sm" placeholder="Ex: serviço X, profissional Y..." /></div>
                    <button onClick={salvarNotas} className="btn-primary text-sm px-4 py-1.5">Salvar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ──────────────────────────────────────────
export default function EmpresaPainelPage() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('home');
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('jarvis_user');
    if (!userStr) return;
    try { setEmpresaId(JSON.parse(userStr).empresa_id); } catch {}
  }, []);

  async function load() {
    if (!empresaId) return;
    try { setData(await api.getEmpresa(empresaId)); }
    catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  return (
    <EmpresaShell>
      <div className="mx-auto max-w-6xl">
        {loading || !data ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-brand-400" /></div>
        ) : (
          <>
            <header className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">{data.empresa.nome_fantasia}</h1>
                <p className="mt-1 text-sm text-white/50">{data.empresa.segmento || ''}</p>
              </div>
              <button onClick={load} className="text-white/30 hover:text-white p-2 rounded-lg hover:bg-white/5">
                <RefreshCw className="h-4 w-4" />
              </button>
            </header>

            <div className="mb-6 flex flex-wrap gap-2 border-b border-white/5 pb-2">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${tab === t.id ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="card p-6">
              {tab === 'home'         && <TabHome data={data} empresaId={empresaId} />}
              {tab === 'agendamentos' && <TabAgendamentos data={data} />}
              {tab === 'conversas'    && <TabConversas empresaId={empresaId} />}
              {tab === 'clientes'     && <TabClientes empresaId={empresaId} />}
              {tab === 'escalacoes'   && <TabEscalonamentos data={data} />}
              {tab === 'metricas'     && <TabMetricas data={data} />}
              {tab === 'ia'           && <TabIdentidade data={data} reload={load} />}
              {tab === 'servicos'     && <TabServicos data={data} reload={load} />}
              {tab === 'faq'          && <TabFaq data={data} reload={load} />}
              {tab === 'horarios'     && <TabHorarios data={data} reload={load} />}
              {tab === 'conexao'      && <TabConexao data={data} reload={load} />}
              {tab === 'chat'         && <TabChatTest data={data} />}
            </div>
          </>
        )}
      </div>
    </EmpresaShell>
  );
}
