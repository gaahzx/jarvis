'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Phone, User, Clock, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

const STATUS_STYLE: Record<string, string> = {
  pendente:   'bg-amber-500/10 border-amber-500/30 text-amber-400',
  confirmado: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  realizado:  'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  cancelado:  'bg-red-500/10 border-red-500/30 text-red-400 opacity-50',
};

const HORAS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h às 20h

export default function AgendaDiaPage() {
  const [ags, setAgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));

  async function load() {
    setLoading(true);
    try {
      const r = await api.agendamentosDia(data);
      setAgs(r);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [data]);

  function mudarDia(delta: number) {
    const d = new Date(data + 'T12:00');
    d.setDate(d.getDate() + delta);
    setData(d.toISOString().slice(0, 10));
  }

  async function setStatus(id: string, status: string) {
    try {
      await api.atualizarAgendamento(id, { status });
      toast.success(`Marcado como ${status}`);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const dataFormatada = new Date(data + 'T12:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
  const isHoje = data === new Date().toISOString().slice(0, 10);

  // Agrupa por hora
  const porHora: Record<number, any[]> = {};
  ags.forEach(a => {
    const h = new Date(a.data_hora).getHours();
    if (!porHora[h]) porHora[h] = [];
    porHora[h].push(a);
  });

  const totalDia = ags.filter(a => a.status !== 'cancelado').length;
  const realizados = ags.filter(a => a.status === 'realizado').length;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white capitalize">{dataFormatada}</h1>
            {isHoje && <span className="text-xs text-violet-400 font-medium">HOJE</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => mudarDia(-1)} className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setData(new Date().toISOString().slice(0, 10))} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/60 hover:text-white">
              Hoje
            </button>
            <button onClick={() => mudarDia(1)} className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white">
              <ChevronRight className="h-5 w-5" />
            </button>
            <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Resumo do dia */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-white">{totalDia}</div>
            <div className="text-xs text-white/40 mt-1">agendamentos</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{realizados}</div>
            <div className="text-xs text-white/40 mt-1">realizados</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{totalDia - realizados}</div>
            <div className="text-xs text-white/40 mt-1">pendentes</div>
          </div>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-white/20 mx-auto" /></div>
        ) : (
          <div className="card overflow-hidden">
            {HORAS.map((hora) => {
              const agsHora = porHora[hora] || [];
              const horaStr = `${String(hora).padStart(2, '0')}:00`;
              const isAgora = isHoje && new Date().getHours() === hora;

              return (
                <div key={hora} className={`flex border-b border-white/[0.04] last:border-0 ${isAgora ? 'bg-violet-500/[0.04]' : ''}`}>
                  {/* Coluna de hora */}
                  <div className={`w-16 shrink-0 p-3 text-xs font-mono border-r border-white/[0.04] flex items-start justify-end ${isAgora ? 'text-violet-400 font-bold' : 'text-white/20'}`}>
                    {horaStr}
                  </div>

                  {/* Agendamentos desta hora */}
                  <div className="flex-1 p-2 min-h-[3.5rem]">
                    {agsHora.length === 0 ? null : (
                      <div className="space-y-2">
                        {agsHora
                          .sort((a: any, b: any) => a.data_hora.localeCompare(b.data_hora))
                          .map((a: any) => (
                            <AgendamentoLinha
                              key={a.id}
                              a={a}
                              onConfirmar={() => setStatus(a.id, 'confirmado')}
                              onRealizar={() => setStatus(a.id, 'realizado')}
                              onCancelar={() => setStatus(a.id, 'cancelado')}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {Object.keys(porHora).length === 0 && (
              <div className="text-center py-16 text-white/20">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum agendamento para este dia</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AgendamentoLinha({ a, onConfirmar, onRealizar, onCancelar }: any) {
  const dt = new Date(a.data_hora);
  const horaStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const style = STATUS_STYLE[a.status] || 'bg-white/5 border-white/10 text-white/40';

  return (
    <div className={`rounded-xl border p-3 flex items-center gap-3 ${style}`}>
      <span className="text-xs font-mono w-10 shrink-0">{horaStr}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white truncate">{a.cliente_nome || '—'}</span>
          {a.servico_nome && <span className="text-xs text-white/40 truncate">· {a.servico_nome}</span>}
          {a.duracao_minutos && <span className="text-xs text-white/30">{a.duracao_minutos}min</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {a.empresa_nome && <span className="text-xs text-white/30">{a.empresa_nome}</span>}
          {a.cliente_numero && a.cliente_numero !== 'TESTE' && (
            <a href={`https://wa.me/${a.cliente_numero}`} target="_blank" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              <Phone className="h-3 w-3" /> {a.cliente_numero}
            </a>
          )}
          {a.profissional && <span className="text-xs text-white/30">👨‍⚕️ {a.profissional}</span>}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        {a.status === 'pendente' && (
          <button onClick={onConfirmar} title="Confirmar" className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300">
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        {(a.status === 'pendente' || a.status === 'confirmado') && (
          <button onClick={onRealizar} title="Realizado" className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300">
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        {a.status !== 'cancelado' && a.status !== 'realizado' && (
          <button onClick={onCancelar} title="Cancelar" className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
