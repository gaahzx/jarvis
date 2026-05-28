'use client';

import { useEffect, useState } from 'react';
import { Loader2, Key, TrendingUp, Zap, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

export default function ConsumoGlobalPage() {
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(30);

  async function load() {
    setLoading(true);
    try {
      const r = await api.consumoGlobal(periodo);
      setDados(r);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [periodo]);

  const totalMsgs = dados.reduce((s, d) => s + parseInt(d.total_msgs || 0), 0);
  const totalGratis = dados.reduce((s, d) => s + parseInt(d.msgs_gratuitas || 0), 0);
  const semApiKey = dados.filter((d) => !d.tem_api_key && parseInt(d.total_msgs || 0) > 0).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Consumo Global</h1>
            <p className="text-white/50 mt-1">Uso de IA por empresa</p>
          </div>
          <div className="flex gap-2">
            {[7, 15, 30, 60].map((d) => (
              <button
                key={d}
                onClick={() => setPeriodo(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${periodo === d ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/50 hover:text-white'}`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Resumo geral */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-violet-400" /><span className="text-xs text-white/50">Total mensagens</span></div>
            <div className="text-3xl font-bold text-white">{totalMsgs.toLocaleString()}</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-2"><Zap className="h-4 w-4 text-emerald-400" /><span className="text-xs text-white/50">Gratuitas</span></div>
            <div className="text-3xl font-bold text-emerald-400">{totalGratis.toLocaleString()}</div>
            <div className="text-xs text-white/30 mt-1">
              {totalMsgs > 0 ? `${Math.round((totalGratis/totalMsgs)*100)}% do total` : '—'}
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-amber-400" /><span className="text-xs text-white/50">Sem API key própria</span></div>
            <div className="text-3xl font-bold text-amber-400">{semApiKey}</div>
            <div className="text-xs text-white/30 mt-1">empresas ativas</div>
          </div>
        </div>

        {/* Tabela por empresa */}
        {loading ? (
          <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/20 mx-auto" /></div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-xs text-white/40 font-medium">Empresa</th>
                  <th className="text-right p-4 text-xs text-white/40 font-medium">Msgs</th>
                  <th className="text-right p-4 text-xs text-white/40 font-medium">Gratuitas</th>
                  <th className="text-right p-4 text-xs text-white/40 font-medium">Pagas</th>
                  <th className="text-right p-4 text-xs text-white/40 font-medium">Tempo médio</th>
                  <th className="text-center p-4 text-xs text-white/40 font-medium">API Key</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {dados.map((d) => {
                  const msgs = parseInt(d.total_msgs || 0);
                  const gratis = parseInt(d.msgs_gratuitas || 0);
                  const pagas = parseInt(d.msgs_pagas || 0);
                  const alerta = !d.tem_api_key && msgs > 100;
                  return (
                    <tr key={d.empresa_id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] ${alerta ? 'bg-amber-500/[0.03]' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {alerta && <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                          <span className="text-white font-medium">{d.nome_fantasia}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right text-white">{msgs > 0 ? msgs.toLocaleString() : <span className="text-white/20">—</span>}</td>
                      <td className="p-4 text-right text-emerald-400">{gratis > 0 ? gratis : <span className="text-white/20">—</span>}</td>
                      <td className="p-4 text-right text-amber-400">{pagas > 0 ? pagas : <span className="text-white/20">—</span>}</td>
                      <td className="p-4 text-right text-white/50">
                        {d.tempo_medio_ms ? `${(parseInt(d.tempo_medio_ms)/1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="p-4 text-center">
                        {d.tem_api_key
                          ? <span className="text-xs text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">✓ própria</span>
                          : <span className="text-xs text-white/30 bg-white/5 rounded-full px-2 py-0.5">compartilhada</span>
                        }
                      </td>
                      <td className="p-4">
                        <Link href={`/empresas/${d.empresa_id}?tab=metricas`} className="text-xs text-violet-400 hover:text-violet-300">
                          ver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {dados.length === 0 && (
              <div className="text-center py-12 text-white/30">Nenhum dado no período</div>
            )}
          </div>
        )}

        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-sm text-blue-300">
          <p className="font-medium mb-1">💡 Sobre a API key própria</p>
          <p className="text-blue-400 text-xs">Quando uma empresa tem alto volume de mensagens, peça para cadastrar a própria API key do OpenRouter na aba <strong>🔑 API Key</strong>. Assim o consumo delas não impacta as cotas gratuitas compartilhadas.</p>
        </div>
      </div>
    </AppShell>
  );
}
