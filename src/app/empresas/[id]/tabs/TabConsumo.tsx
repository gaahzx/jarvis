'use client';

import { useEffect, useState } from 'react';
import { BarChart3, MessageCircle, DollarSign, Zap, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export function TabConsumo({ data }: any) {
  const e = data.empresa;
  const [consumo, setConsumo] = useState<any[]>([]);
  const [diario, setDiario] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.consumoEmpresa(e.id).catch(() => []),
      api.consumoDiario(e.id).catch(() => []),
    ]).then(([c, d]) => {
      setConsumo(c);
      setDiario(d);
      setLoading(false);
    });
  }, [e.id]);

  const totalMsgs = consumo.reduce((sum, c) => sum + parseInt(c.total_chamadas || 0), 0);
  const totalTokens = consumo.reduce((sum, c) => sum + parseInt(c.tokens_total || 0), 0);
  const totalCusto = consumo.reduce((sum, c) => sum + parseFloat(c.custo_brl || 0), 0);
  const pctUso = (totalMsgs / parseInt(e.limite_msgs_mes || 1)) * 100;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-200">
        📊 Consumo da empresa no mês corrente (refresh em tempo real)
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <MessageCircle className="h-6 w-6 text-violet-400 mb-2" />
          <div className="text-2xl font-bold text-white">{totalMsgs}</div>
          <div className="text-xs text-white/50">de {e.limite_msgs_mes} msgs</div>
          <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full ${pctUso > 80 ? 'bg-red-400' : pctUso > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(pctUso, 100)}%` }}
            />
          </div>
        </div>
        <div className="card p-5">
          <Zap className="h-6 w-6 text-amber-400 mb-2" />
          <div className="text-2xl font-bold text-white">{totalTokens.toLocaleString('pt-BR')}</div>
          <div className="text-xs text-white/50">tokens consumidos</div>
        </div>
        <div className="card p-5">
          <DollarSign className="h-6 w-6 text-emerald-400 mb-2" />
          <div className="text-2xl font-bold text-white">R$ {totalCusto.toFixed(4)}</div>
          <div className="text-xs text-white/50">custo IA mês</div>
        </div>
        <div className="card p-5">
          <BarChart3 className="h-6 w-6 text-blue-400 mb-2" />
          <div className="text-2xl font-bold text-white">R$ {parseFloat(e.valor_mensal).toFixed(0)}</div>
          <div className="text-xs text-white/50">mensalidade cobrada</div>
        </div>
      </div>

      {/* Margem */}
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-3">💰 Margem do mês</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-white/50">Receita</div>
            <div className="text-xl font-bold text-emerald-400">R$ {parseFloat(e.valor_mensal).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-white/50">Custo IA</div>
            <div className="text-xl font-bold text-red-400">- R$ {totalCusto.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-xs text-white/50">Lucro</div>
            <div className="text-xl font-bold text-white">R$ {(parseFloat(e.valor_mensal) - totalCusto).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Por modelo */}
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-3">🤖 Uso por modelo</h3>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-white/30 mx-auto" />
        ) : consumo.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-6">Nenhuma mensagem processada ainda este mês</p>
        ) : (
          <div className="space-y-2">
            {consumo.map((c) => (
              <div key={c.modelo_usado} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div>
                  <code className="text-sm text-white">{c.modelo_usado}</code>
                  <div className="text-xs text-white/40">
                    {c.tempo_medio_ms ? `${Math.round(parseFloat(c.tempo_medio_ms))}ms médio` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white">{c.total_chamadas} chamadas</div>
                  <div className="text-xs text-white/40">
                    {parseInt(c.tokens_total || 0).toLocaleString('pt-BR')} tokens · R$ {parseFloat(c.custo_brl || 0).toFixed(4)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico diário */}
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-3">📈 Últimos 30 dias</h3>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-white/30 mx-auto" />
        ) : diario.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-6">Sem histórico ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 h-32">
              {diario.slice(0, 30).reverse().map((d) => {
                const max = Math.max(...diario.map((x) => parseInt(x.msgs || 0)));
                const h = max > 0 ? (parseInt(d.msgs || 0) / max) * 100 : 0;
                return (
                  <div key={d.data} className="flex-1 flex flex-col items-center gap-1 min-w-[20px]" title={`${d.data}: ${d.msgs} msgs`}>
                    <div
                      className="w-full bg-brand-500/40 hover:bg-brand-500/60 rounded-t transition-all"
                      style={{ height: `${h}%`, minHeight: '4px' }}
                    />
                    <div className="text-[10px] text-white/30">{new Date(d.data).getDate()}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
