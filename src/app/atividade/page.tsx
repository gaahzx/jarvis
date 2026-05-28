'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

export default function AtividadePage() {
  const [tab, setTab] = useState<'conversas' | 'escalonamentos'>('conversas');
  const [conversas, setConversas] = useState<any[]>([]);
  const [escalonamentos, setEscalonamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [c, e] = await Promise.all([
        api.conversasAtivas().catch(() => []),
        api.escalonamentos(false).catch(() => []),
      ]);
      setConversas(c);
      setEscalonamentos(e);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Atividade em tempo real</h1>
            <p className="mt-1 text-white/50">Conversas abertas e escalonamentos pendentes</p>
          </div>
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-white/5 pb-2">
          <button
            onClick={() => setTab('conversas')}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              tab === 'conversas'
                ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30'
                : 'text-white/60 hover:bg-white/5'
            }`}
          >
            <MessageCircle className="inline h-4 w-4 mr-2" />
            Conversas ativas ({conversas.length})
          </button>
          <button
            onClick={() => setTab('escalonamentos')}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              tab === 'escalonamentos'
                ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30'
                : 'text-white/60 hover:bg-white/5'
            }`}
          >
            <AlertCircle className="inline h-4 w-4 mr-2" />
            Escalonamentos ({escalonamentos.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-white/50">Carregando...</div>
        ) : tab === 'conversas' ? (
          <div className="card overflow-hidden">
            {conversas.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="mx-auto h-12 w-12 text-white/20 mb-3" />
                <p className="text-white/50">Nenhuma conversa ativa no momento</p>
                <p className="text-xs text-white/30 mt-1">Quando os clientes começarem a conversar, aparecerá aqui em tempo real</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-white/[0.04] text-left text-xs uppercase text-white/50">
                  <tr>
                    <th className="px-5 py-3">Contato</th>
                    <th className="px-5 py-3">Empresa</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Mensagens</th>
                    <th className="px-5 py-3 text-right">Inativa há</th>
                  </tr>
                </thead>
                <tbody>
                  {conversas.map((c) => (
                    <tr key={c.id} className="border-t border-white/5">
                      <td className="px-5 py-4">
                        <div className="font-medium text-white">{c.contato_nome || c.contato_numero}</div>
                        <div className="text-xs text-white/40">{c.contato_numero}</div>
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/empresas/${c.empresa_id}`} className="text-brand-300 hover:underline">
                          {c.empresa}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          c.status === 'escalada' ? 'bg-red-500/10 text-red-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-white/70">{c.total_mensagens}</td>
                      <td className="px-5 py-4 text-right text-white/50 text-xs">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {Math.floor(parseFloat(c.minutos_inativa))} min
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            {escalonamentos.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-white/20 mb-3" />
                <p className="text-white/50">Nenhum escalonamento pendente 🎉</p>
                <p className="text-xs text-white/30 mt-1">A IA está dando conta de tudo!</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-white/[0.04] text-left text-xs uppercase text-white/50">
                  <tr>
                    <th className="px-5 py-3">Contato</th>
                    <th className="px-5 py-3">Empresa</th>
                    <th className="px-5 py-3">Motivo</th>
                    <th className="px-5 py-3 text-right">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {escalonamentos.map((e) => (
                    <tr key={e.id} className="border-t border-white/5">
                      <td className="px-5 py-4">
                        <div className="font-medium text-white">{e.contato_nome || e.contato_numero || '—'}</div>
                      </td>
                      <td className="px-5 py-4 text-brand-300">{e.empresa}</td>
                      <td className="px-5 py-4 text-white/70">{e.motivo || '—'}</td>
                      <td className="px-5 py-4 text-right text-white/50 text-xs">
                        {new Date(e.notificado_em).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
