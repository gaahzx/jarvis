'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bot, LayoutDashboard, Building2, LogOut, Settings, Activity, Bell, BellRing, BarChart3, Calendar, Sparkles, Target } from 'lucide-react';
import { clearToken, api } from '@/lib/api';
import { toast } from 'sonner';

function useNotificacoes() {
  const prevEscalRef = useRef<Set<string>>(new Set());
  const prevAgRef = useRef<Set<string>>(new Set());
  const [badges, setBadges] = useState({ escalacoes: 0, agendamentos: 0 });
  const audioRef = useRef<AudioContext | null>(null);

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
    async function checar() {
      try {
        const [escals, ags] = await Promise.all([
          api.escalonamentos(false),
          api.agendamentosPendentes(),
        ]);

        // Escalações novas
        const novosEscals = escals.filter((e: any) => !prevEscalRef.current.has(e.id));
        if (novosEscals.length > 0 && prevEscalRef.current.size > 0) {
          tocarSom();
          novosEscals.forEach((e: any) => {
            toast.warning(`🚨 Nova escalação: ${e.empresa_nome || ''}`, {
              description: e.motivo,
              duration: 8000,
              action: { label: 'Ver', onClick: () => window.location.href = `/empresas/${e.empresa_id}?tab=escalacoes` },
            });
          });
        }
        prevEscalRef.current = new Set(escals.map((e: any) => e.id));
        setBadges(b => ({ ...b, escalacoes: escals.length }));

        // Agendamentos novos
        const novosAgs = ags.filter((a: any) => !prevAgRef.current.has(a.id));
        if (novosAgs.length > 0 && prevAgRef.current.size > 0) {
          tocarSom();
          novosAgs.forEach((a: any) => {
            toast.info(`📅 Novo agendamento: ${a.cliente_nome || 'Cliente'}`, {
              description: `${a.empresa_nome} — ${new Date(a.data_hora).toLocaleString('pt-BR')}`,
              duration: 8000,
            });
          });
        }
        prevAgRef.current = new Set(ags.map((a: any) => a.id));
        setBadges(b => ({ ...b, agendamentos: ags.length }));

        // Título da aba
        const total = escals.length + ags.length;
        document.title = total > 0 ? `(${total}) JARVIS Admin` : 'JARVIS Admin';
      } catch { /* ignora erros de rede */ }
    }

    checar();
    const interval = setInterval(checar, 60000); // 60s — metade das chamadas, ainda rápido pra notificações
    return () => clearInterval(interval);
  }, []);

  return badges;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const badges = useNotificacoes();

  useEffect(() => {
    const token = localStorage.getItem('jarvis_token');
    if (!token) router.replace('/login');
    else setMounted(true);
  }, [router]);

  if (!mounted) return null;

  const nav = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/empresas', label: 'Empresas', icon: Building2 },
    { href: '/agenda', label: 'Agenda do Dia', icon: Calendar },
    { href: '/consumo', label: 'Consumo IA', icon: BarChart3 },
    { href: '/atividade', label: 'Atividade', icon: Activity },
    { href: '/marketing', label: 'Marketing IA', icon: Sparkles },
    { href: '/prospeccao', label: 'Prospecção IA', icon: Target },
    { href: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  const totalBadge = badges.escalacoes + badges.agendamentos;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black via-brand-900/30 to-black">
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-white/5 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 ring-1 ring-brand-500/30">
              <Bot className="h-5 w-5 text-brand-400" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-white">JARVIS</div>
              <div className="text-xs text-white/50">Super Admin</div>
            </div>
            {totalBadge > 0 && (
              <div className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400 animate-pulse">
                <BellRing className="h-3 w-3" />
                {totalBadge}
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {nav.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30'
                      : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mini painel de alertas */}
          {(badges.escalacoes > 0 || badges.agendamentos > 0) && (
            <div className="mx-4 mb-3 rounded-xl bg-white/[0.03] border border-white/5 p-3 space-y-2">
              {badges.escalacoes > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-400 flex items-center gap-1.5"><Bell className="h-3 w-3" /> Escalações</span>
                  <span className="bg-red-500/20 text-red-400 rounded-full px-2 py-0.5 font-bold">{badges.escalacoes}</span>
                </div>
              )}
              {badges.agendamentos > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400 flex items-center gap-1.5"><Bell className="h-3 w-3" /> Agendamentos</span>
                  <span className="bg-amber-500/20 text-amber-400 rounded-full px-2 py-0.5 font-bold">{badges.agendamentos}</span>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-white/5 p-4">
            <button
              onClick={() => { clearToken(); router.push('/login'); }}
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
