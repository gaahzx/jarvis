'use client';

import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, MessageSquare, Clock, CheckCircle, AlertTriangle, Zap, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function TabMetricas({ data }: any) {
  const [metricas, setMetricas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(30);

  async function load() {
    setLoading(true);
    try {
      const r = await api.metricasEmpresa(data.empresa.id, periodo);
      setMetricas(r);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [data.empresa.id, periodo]);

  if (loading) return <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-white/20 mx-auto" /></div>;
  if (!metricas) return null;

  const { resumo, conversas, por_dia, por_modelo } = metricas;

  // Gráfico de barras simples
  const maxMsgs = Math.max(...(por_dia?.map((d: any) => parseInt(d.msgs)) || [1]), 1);

  return (
    <div className="space-y-6">
      {/* Seletor de período */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/50">Período:</span>
        {[7, 15, 30, 60].map((d) => (
          <button
            key={d}
            onClick={() => setPeriodo(d)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${periodo === d ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/50 hover:text-white'}`}
          >
            {d} dias
          </button>
        ))}
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<MessageSquare className="h-5 w-5 text-violet-400" />} label="Mensagens IA" value={resumo.total_msgs.toLocaleString()} />
        <MetricCard icon={<CheckCircle className="h-5 w-5 text-emerald-400" />} label="Taxa de sucesso" value={`${resumo.taxa_sucesso}%`} color="emerald" />
        <MetricCard icon={<Clock className="h-5 w-5 text-blue-400" />} label="Tempo médio" value={resumo.tempo_medio_ms > 0 ? `${(resumo.tempo_medio_ms/1000).toFixed(1)}s` : '—'} color="blue" />
        <MetricCard icon={<Zap className="h-5 w-5 text-amber-400" />} label="Tokens usados" value={resumo.tokens_total > 1000 ? `${(resumo.tokens_total/1000).toFixed(1)}k` : resumo.tokens_total} color="amber" />
      </div>

      {/* Conversas */}
      <div className="card p-5 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-violet-400" /> Conversas ({periodo} dias)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{conversas.total}</div>
            <div className="text-xs text-white/40 mt-1">Total</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-400">{conversas.taxa_resolucao}%</div>
            <div className="text-xs text-white/40 mt-1">Resolvidas pela IA</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400">{conversas.escaladas}</div>
            <div className="text-xs text-white/40 mt-1">Escaladas p/ humano</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">{conversas.media_msgs}</div>
            <div className="text-xs text-white/40 mt-1">Msgs por conversa</div>
          </div>
        </div>

        {/* Barra de taxa de resolução */}
        <div>
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>IA resolveu sozinha</span>
            <span>Precisou de humano</span>
          </div>
          <div className="h-3 rounded-full bg-red-500/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${conversas.taxa_resolucao}%` }}
            />
          </div>
        </div>
      </div>

      {/* Gráfico de atividade por dia */}
      {por_dia?.length > 0 && (
        <div className="card p-5 space-y-3">
          <h3 className="text-white font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-400" /> Atividade diária</h3>
          <div className="flex items-end gap-1 h-24">
            {por_dia.map((d: any) => {
              const h = Math.max(4, Math.round((parseInt(d.msgs) / maxMsgs) * 96));
              const dataStr = new Date(d.data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              return (
                <div key={d.data} className="flex-1 flex flex-col items-center gap-1 group" title={`${dataStr}: ${d.msgs} msgs`}>
                  <div
                    className="w-full rounded-t bg-violet-500/40 group-hover:bg-violet-500/70 transition"
                    style={{ height: `${h}px` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-white/30">
            <span>{new Date(por_dia[0]?.data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
            <span>{new Date(por_dia[por_dia.length-1]?.data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
          </div>
        </div>
      )}

      {/* Modelos usados */}
      {por_modelo?.length > 0 && (
        <div className="card p-5 space-y-3">
          <h3 className="text-white font-semibold">Modelos de IA usados</h3>
          <div className="space-y-2">
            {por_modelo.map((m: any) => {
              const pct = Math.round((m.msgs / resumo.total_msgs) * 100);
              const isGratis = m.modelo_usado?.endsWith(':free');
              return (
                <div key={m.modelo_usado} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/70 font-mono">{m.modelo_usado}</span>
                    <span className="flex items-center gap-2">
                      {isGratis ? <span className="text-emerald-400 text-[10px] font-medium">GRÁTIS</span> : <span className="text-amber-400 text-[10px] font-medium">PAGO</span>}
                      <span className="text-white/40">{m.msgs} msgs · {pct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full rounded-full ${isGratis ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status API key */}
          <div className={`mt-3 rounded-xl p-3 text-xs ${resumo.msgs_pagas > 0 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'}`}>
            {resumo.msgs_pagas > 0
              ? `⚠️ ${resumo.msgs_pagas} mensagens usaram modelos pagos. Configure a API key própria para controlar os custos.`
              : `✅ Todas as ${resumo.msgs_gratuitas} mensagens usaram modelos gratuitos.`
            }
          </div>
        </div>
      )}

      {resumo.total_msgs === 0 && (
        <div className="card p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-white/10 mb-3" />
          <p className="text-white/40">Nenhuma atividade no período selecionado</p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, color = 'violet' }: any) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-white/50">{label}</span></div>
      <div className={`text-2xl font-bold text-${color}-400`}>{value}</div>
    </div>
  );
}
