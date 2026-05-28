'use client';

import { useEffect, useState } from 'react';
import { Loader2, TrendingDown, Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { api } from '@/lib/api';

export function TabFunil({ data }: any) {
  const [funil, setFunil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(30);

  useEffect(() => {
    setLoading(true);
    api.funilEmpresa(data.empresa.id, periodo)
      .then(setFunil)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [data.empresa.id, periodo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-violet-400" /> Funil de Conversas
          </h2>
          <p className="text-sm text-white/40 mt-0.5">Jornada dos clientes no atendimento IA</p>
        </div>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(Number(e.target.value))}
          className="rounded-lg bg-white/5 border border-white/10 text-white text-sm px-3 py-1.5"
        >
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-brand-400" /></div>
      ) : !funil ? (
        <p className="text-center text-white/40 py-12">Erro ao carregar dados</p>
      ) : (
        <>
          {/* Funil visual */}
          <div className="space-y-2">
            {funil.funil.map((etapa: any, i: number) => {
              const cores = ['violet', 'blue', 'cyan', 'emerald', 'amber'];
              const cor = cores[i] || 'white';
              const largura = Math.max(etapa.pct, 4);
              return (
                <div key={etapa.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">{etapa.label}</span>
                    <span className="text-white font-medium">
                      {etapa.valor.toLocaleString('pt-BR')}
                      <span className="text-white/40 ml-1.5 text-xs">{etapa.pct}%</span>
                    </span>
                  </div>
                  <div className="h-8 rounded-lg bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-lg bg-${cor}-500/40 border border-${cor}-500/30 flex items-center pl-3 text-xs text-${cor}-300 font-medium transition-all duration-500`}
                      style={{ width: `${largura}%` }}
                    >
                      {etapa.pct}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Métricas rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="card p-4">
              <div className="text-2xl font-bold text-white">{funil.media_msgs}</div>
              <div className="text-xs text-white/40 mt-0.5">Msgs por conversa (média)</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-white">{funil.duracao_media_min}min</div>
              <div className="text-xs text-white/40 mt-0.5">Duração média atendimento</div>
            </div>
            {funil.satisfacao.total > 0 && (
              <div className="card p-4">
                <div className="text-2xl font-bold text-emerald-400">{funil.satisfacao.pct_positivo}%</div>
                <div className="text-xs text-white/40 mt-0.5">Satisfação positiva</div>
              </div>
            )}
          </div>

          {/* Satisfação */}
          {funil.satisfacao.total > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-white">Pesquisa de Satisfação</span>
                <span className="text-xs text-white/40">({funil.satisfacao.total} respostas)</span>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                  <ThumbsUp className="h-5 w-5 text-emerald-400" />
                  <div>
                    <div className="text-xl font-bold text-emerald-400">{funil.satisfacao.otimo}</div>
                    <div className="text-xs text-white/40">Ótimo</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-1 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <ThumbsDown className="h-5 w-5 text-red-400" />
                  <div>
                    <div className="text-xl font-bold text-red-400">{funil.satisfacao.ruim}</div>
                    <div className="text-xs text-white/40">Pode melhorar</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {funil.satisfacao.total === 0 && (
            <div className="card p-6 text-center text-white/30 text-sm">
              Ainda não há respostas de satisfação neste período.
            </div>
          )}
        </>
      )}
    </div>
  );
}
