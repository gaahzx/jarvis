'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, LogOut, BellRing, Bell, X, Calendar, AlertTriangle } from 'lucide-react';
import { clearToken, api } from '@/lib/api';
import { toast } from 'sonner';

function useNotificacoesEmpresa(empresaId: string | null) {
  const prevEscalRef = useRef<Set<string>>(new Set());
  const prevAgRef = useRef<Set<string>>(new Set());
  const [notifs, setNotifs] = useState<any[]>([]);
  const [totalNovo, setTotalNovo] = useState(0);

  function tocarSom() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch { /* sem suporte */ }
  }

  useEffect(() => {
    if (!empresaId) return;

    async function checar() {
      try {
        const [escals, ags] = await Promise.all([
          api.escalonamentos(false),
          api.agendamentosDaEmpresa(empresaId!, 'pendente'),
        ]);

        const minhaEscals = escals.filter((e: any) => e.empresa_id === empresaId);
        const novosEscals = minhaEscals.filter((e: any) => !prevEscalRef.current.has(e.id));
        const novosAgs = ags.filter((a: any) => !prevAgRef.current.has(a.id));

        if ((novosEscals.length > 0 || novosAgs.length > 0) && (prevEscalRef.current.size > 0 || prevAgRef.current.size > 0)) {
          tocarSom();
          novosEscals.forEach((e: any) => {
            toast.warning(`🚨 Nova escalação de ${e.palavra_gatilho || 'cliente'}`, { description: e.motivo, duration: 8000 });
          });
          novosAgs.forEach((a: any) => {
            toast.info(`📅 Novo agendamento: ${a.cliente_nome || 'Cliente'}`, {
              description: new Date(a.data_hora).toLocaleString('pt-BR'),
              duration: 8000,
            });
          });
        }

        prevEscalRef.current = new Set(minhaEscals.map((e: any) => e.id));
        prevAgRef.current = new Set(ags.map((a: any) => a.id));

        // Monta lista de notificações para o painel
        const lista = [
          ...minhaEscals.map((e: any) => ({ tipo: 'escalacao', id: e.id, texto: e.motivo || 'Cliente pediu atendimento humano', ts: e.created_at })),
          ...ags.map((a: any) => ({ tipo: 'agendamento', id: a.id, texto: `${a.cliente_nome || 'Cliente'} — ${new Date(a.data_hora).toLocaleString('pt-BR')}`, ts: a.created_at })),
        ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 20);

        setNotifs(lista);
        setTotalNovo(lista.length);
        document.title = lista.length > 0 ? `(${lista.length}) Painel` : 'Painel';
      } catch { /* ignora */ }
    }

    checar();
    const interval = setInterval(checar, 60000); // 60s — metade das chamadas
    return () => clearInterval(interval);
  }, [empresaId]);

  return { notifs, totalNovo };
}

export function EmpresaShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [painelAberto, setPainelAberto] = useState(false);
  const { notifs, totalNovo } = useNotificacoesEmpresa(user?.empresa_id || null);

  useEffect(() => {
    const token = localStorage.getItem('jarvis_token');
    const userStr = localStorage.getItem('jarvis_user');
    if (!token) { router.replace('/login'); return; }
    const parsed = userStr ? JSON.parse(userStr) : null;
    if (parsed?.role !== 'empresa') { router.replace('/dashboard'); return; }
    setUser(parsed);
    setMounted(true);
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black via-brand-900/30 to-black">
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/5 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 ring-1 ring-brand-500/30 shrink-0">
              <Bot className="h-5 w-5 text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white truncate">{user?.nome_fantasia || 'Minha Empresa'}</div>
              <div className="text-xs text-white/50 truncate">{user?.nome || user?.email}</div>
            </div>
            {/* Sininho */}
            <button
              onClick={() => setPainelAberto(!painelAberto)}
              className="relative shrink-0 p-1.5 rounded-lg hover:bg-white/5 transition"
            >
              {totalNovo > 0 ? (
                <BellRing className="h-5 w-5 text-amber-400 animate-bounce" />
              ) : (
                <Bell className="h-5 w-5 text-white/30" />
              )}
              {totalNovo > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {totalNovo > 9 ? '9+' : totalNovo}
                </span>
              )}
            </button>
          </div>

          {/* Painel de notificações */}
          {painelAberto && (
            <div className="border-b border-white/5 bg-black/20">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs font-semibold text-white/60">Notificações</span>
                <button onClick={() => setPainelAberto(false)} className="text-white/30 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto pb-2 space-y-1 px-2">
                {notifs.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-4">Nenhuma notificação</p>
                ) : notifs.map((n) => (
                  <div key={n.id} className={`rounded-lg p-2.5 text-xs ${n.tipo === 'escalacao' ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                    <div className="flex items-start gap-1.5">
                      {n.tipo === 'escalacao'
                        ? <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                        : <Calendar className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      }
                      <span className={n.tipo === 'escalacao' ? 'text-red-300' : 'text-amber-300'}>{n.texto}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 p-4 text-xs text-white/20 flex items-end pb-6">
            <span>Painel da Empresa · JARVIS</span>
          </div>

          <div className="border-t border-white/5 p-4">
            <button
              onClick={() => { clearToken(); localStorage.removeItem('jarvis_user'); router.push('/login'); }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white/60 transition-all hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  );
}
