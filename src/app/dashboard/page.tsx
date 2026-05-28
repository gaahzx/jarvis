'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, MessageCircle, DollarSign, AlertCircle,
  Plus, TrendingUp, Activity, MessageSquareCode, Calendar, Clock, User
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { ChatTest } from '@/components/ChatTest';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [empresaChat, setEmpresaChat] = useState<any>(null);

  async function reloadAgendamentos() {
    try {
      const a = await api.agendamentosPendentes();
      setAgendamentos(a);
    } catch {}
  }

  useEffect(() => {
    Promise.all([
      api.stats(),
      api.listEmpresas(),
      api.agendamentosPendentes().catch(() => []),
    ])
      .then(([s, e, a]) => {
        setStats(s);
        setEmpresas(e);
        setAgendamentos(a);
        const primeira = e.find((x: any) => x.status === 'ativo') || e[0];
        if (primeira) setEmpresaChat(primeira);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));

    // Auto-refresh de agendamentos a cada 30s
    const intv = setInterval(reloadAgendamentos, 60000); // 60s
    return () => clearInterval(intv);
  }, []);

  const filtered = empresas.filter((e) =>
    e.nome_fantasia?.toLowerCase().includes(search.toLowerCase())
  );

  const statCards = [
    { label: 'MRR', value: `R$ ${parseFloat(stats?.mrr_total || 0).toFixed(0)}`, icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20' },
    { label: 'Empresas ativas', value: stats?.empresas_ativas || 0, icon: Building2, color: 'text-blue-400 bg-blue-500/10 ring-blue-500/20' },
    { label: 'Mensagens hoje', value: stats?.mensagens_hoje || 0, icon: MessageCircle, color: 'text-violet-400 bg-violet-500/10 ring-violet-500/20' },
    { label: 'Custo IA 30d', value: `R$ ${parseFloat(stats?.custo_30d || 0).toFixed(2)}`, icon: TrendingUp, color: 'text-amber-400 bg-amber-500/10 ring-amber-500/20' },
    { label: 'Escalonamentos', value: stats?.escalonamentos_pendentes || 0, icon: AlertCircle, color: 'text-red-400 bg-red-500/10 ring-red-500/20' },
    { label: 'WhatsApps online', value: `${stats?.whatsapps_online || 0}/${(parseInt(stats?.whatsapps_online || 0) + parseInt(stats?.whatsapps_offline || 0))}`, icon: Activity, color: 'text-cyan-400 bg-cyan-500/10 ring-cyan-500/20' },
  ];

  function getEmpresaName(id: string) {
    return empresas.find((e) => e.id === id)?.nome_fantasia || 'Empresa';
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="mt-1 text-white/50">Visão geral das suas empresas</p>
          </div>
          <button onClick={() => router.push('/empresas/nova')} className="btn-primary flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova empresa
          </button>
        </header>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card p-5">
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold text-white">{loading ? '...' : s.value}</div>
                <div className="text-xs text-white/50">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Agendamentos Pendentes */}
        {agendamentos.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-violet-400" />
                Agendamentos pendentes
                <span className="rounded-full bg-violet-500/20 text-violet-300 px-2 py-0.5 text-xs">
                  {agendamentos.length}
                </span>
              </h2>
              <button onClick={reloadAgendamentos} className="text-xs text-white/50 hover:text-white">
                ↻ Atualizar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {agendamentos.slice(0, 6).map((a) => {
                const dt = new Date(a.data_hora);
                const isPast = dt < new Date();
                return (
                  <Link
                    key={a.id}
                    href={`/empresas/${a.empresa_id}`}
                    className={`card p-4 hover:ring-2 hover:ring-violet-500/50 transition ${
                      isPast ? 'border-red-500/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-violet-400" />
                        <span className="text-sm font-semibold text-white">
                          {dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                        <span className="text-sm text-white/60">
                          {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        a.status === 'confirmado' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {a.status}
                      </span>
                    </div>

                    <div className="text-xs text-white/50 mb-1">{a.empresa_nome}</div>

                    {a.servico_nome && (
                      <div className="text-sm text-white mb-1">📋 {a.servico_nome}</div>
                    )}
                    {a.cliente_nome && (
                      <div className="text-xs text-white/60 flex items-center gap-1">
                        <User className="h-3 w-3" /> {a.cliente_nome}
                      </div>
                    )}

                    {isPast && (
                      <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Atrasado
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>

            {agendamentos.length > 6 && (
              <p className="mt-3 text-xs text-white/40 text-center">
                + {agendamentos.length - 6} agendamentos. Veja na aba &quot;Agendamentos&quot; de cada empresa.
              </p>
            )}
          </section>
        )}

        {/* Layout 2 colunas: Empresas + Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-6">

          {/* Empresas */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Empresas</h2>
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input max-w-[200px]"
              />
            </div>

            {loading ? (
              <div className="text-center text-white/50 py-12">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="card p-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-white/20 mb-3" />
                <p className="text-white/50">Nenhuma empresa cadastrada ainda.</p>
                <button
                  onClick={() => router.push('/empresas/nova')}
                  className="btn-primary mt-4"
                >
                  Cadastrar primeira empresa
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filtered.map((e) => (
                  <div
                    key={e.id}
                    className={`card p-5 group ${empresaChat?.id === e.id ? 'ring-2 ring-emerald-500/50' : ''}`}
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/20 text-2xl ring-1 ring-brand-500/30">
                        {getEmoji(e.segmento)}
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(e.status)}`}>
                        {e.status}
                      </span>
                    </div>

                    <Link href={`/empresas/${e.id}`} className="block mb-3">
                      <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors">
                        {e.nome_fantasia}
                      </h3>
                      <p className="text-xs text-white/40">{e.segmento || 'Sem segmento'}</p>
                    </Link>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/50">Plano</span>
                        <span className="text-white capitalize">{e.plano}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Msgs</span>
                        <span className="text-white">{e.msgs_mes}/{e.limite_msgs_mes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">API</span>
                        <span className={e.api_key_status === 'master' ? 'text-blue-400' : 'text-emerald-400'}>
                          {e.api_key_status === 'master' ? '🔵 Master' : '🟢 Própria'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-white/5 pt-3 flex items-center gap-2">
                      <button
                        onClick={() => setEmpresaChat(e)}
                        className="flex-1 text-xs rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 py-2 transition flex items-center justify-center gap-1.5"
                      >
                        <MessageSquareCode className="h-3 w-3" />
                        Testar chat
                      </button>
                      <Link
                        href={`/empresas/${e.id}`}
                        className="flex-1 text-xs rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 py-2 transition text-center"
                      >
                        Configurar
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Chat Widget Lateral */}
          <section className="lg:sticky lg:top-8 lg:self-start">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquareCode className="h-5 w-5" />
              Chat de Teste
            </h2>

            {!empresaChat ? (
              <div className="card p-8 text-center text-white/50">
                Selecione uma empresa pra testar
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-white/50">Testando:</span>
                  <select
                    value={empresaChat.id}
                    onChange={(e) => {
                      const found = empresas.find((x) => x.id === e.target.value);
                      if (found) setEmpresaChat(found);
                    }}
                    className="input py-1 text-sm flex-1"
                  >
                    {empresas.map((e) => (
                      <option key={e.id} value={e.id}>{e.nome_fantasia}</option>
                    ))}
                  </select>
                </div>
                <ChatTest
                  empresaId={empresaChat.id}
                  empresaNome={empresaChat.nome_fantasia}
                  assistenteNome={empresaChat.nome_assistente || 'Assistente'}
                  emojiEmpresa={getEmoji(empresaChat.segmento)}
                  compact
                />
              </>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function getEmoji(segmento?: string): string {
  if (!segmento) return '🏢';
  const s = segmento.toLowerCase();
  if (s.includes('clínica') || s.includes('clinica') || s.includes('médic') || s.includes('saúde')) return '🏥';
  if (s.includes('imob')) return '🏠';
  if (s.includes('loja') || s.includes('varejo')) return '🛍️';
  if (s.includes('salão') || s.includes('salao') || s.includes('estét')) return '💇';
  if (s.includes('restaur')) return '🍽️';
  if (s.includes('academia')) return '💪';
  if (s.includes('advoga') || s.includes('jurí')) return '⚖️';
  if (s.includes('tecnolog')) return '💻';
  return '🏢';
}

function getStatusStyle(status: string): string {
  switch (status) {
    case 'ativo': return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20';
    case 'trial': return 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20';
    case 'suspenso': return 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20';
    case 'cancelado': return 'bg-gray-500/10 text-gray-400 ring-1 ring-gray-500/20';
    default: return 'bg-white/5 text-white/60';
  }
}
