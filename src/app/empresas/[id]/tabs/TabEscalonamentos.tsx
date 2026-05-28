'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function TabEscalonamentos({ data }: any) {
  const empresaId = data.empresa.id;
  const whatsappHumano = data.empresa.whatsapp_humano;
  const [lista, setLista]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro]   = useState<'pendentes' | 'todos'>('pendentes');

  async function load() {
    setLoading(true);
    try {
      const todos = await api.escalonamentos(filtro === 'pendentes' ? false : undefined);
      setLista(todos.filter((e: any) => e.empresa_id === empresaId || e.empresa === data.empresa.nome_fantasia));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [empresaId, filtro]);

  const [sugestaoFaq, setSugestaoFaq] = useState<any>(null);

  async function resolver(id: string) {
    try {
      const resultado = await api.resolverEscalonamento(id, 'Resolvido pelo painel');
      toast.success('Marcado como resolvido!');
      if (resultado?.sugestao_faq?.pergunta_sugerida) {
        setSugestaoFaq({ ...resultado.sugestao_faq, empresaId: data.empresa.id });
      }
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function adicionarFaqSugerida() {
    if (!sugestaoFaq) return;
    try {
      await api.addFaq(sugestaoFaq.empresaId, { pergunta: sugestaoFaq.pergunta_sugerida, resposta: sugestaoFaq.contexto?.slice(0, 200) || '', ativo: true });
      toast.success('FAQ adicionada!');
      setSugestaoFaq(null);
    } catch (e: any) { toast.error(e.message); }
  }

  const pendentes = lista.filter(e => !e.resolvido).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Escalações para Humano</h2>
          <p className="text-sm text-white/50">Quando a IA transferiu o cliente para atendimento humano</p>
        </div>
        <div className="flex gap-2">
          {whatsappHumano && (
            <a
              href={`https://wa.me/${whatsappHumano.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
            >
              <Phone className="h-4 w-4" /> {whatsappHumano}
            </a>
          )}
          <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {(['pendentes', 'todos'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-all ${
              filtro === f
                ? 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30'
                : 'text-white/50 hover:bg-white/5 hover:text-white'
            }`}
          >
            {f === 'pendentes' ? `🚨 Pendentes${pendentes > 0 ? ` (${pendentes})` : ''}` : '📋 Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-white/40">
          {filtro === 'pendentes' ? '✅ Nenhuma escalação pendente!' : 'Nenhuma escalação registrada ainda.'}
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((e) => (
            <div
              key={e.id}
              className={`rounded-xl border p-4 ${
                e.resolvido
                  ? 'border-white/5 bg-white/[0.02]'
                  : 'border-orange-500/30 bg-orange-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.resolvido
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-orange-500/10 text-orange-400'
                    }`}>
                      {e.resolvido ? '✅ Resolvido' : '🚨 Pendente'}
                    </span>
                    {e.palavra_gatilho === 'urgente' && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">⚡ Urgente</span>
                    )}
                  </div>

                  <div className="text-sm font-medium text-white">
                    {e.motivo || 'Cliente solicitou atendimento humano'}
                  </div>

                  {(e.contato_nome || e.contato_numero) && (
                    <div className="text-sm text-white/60 flex items-center gap-3">
                      {e.contato_nome && <span>👤 {e.contato_nome}</span>}
                      {e.contato_numero && e.contato_numero !== 'TESTE' && (
                        <a
                          href={`https://wa.me/${e.contato_numero.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" /> {e.contato_numero}
                        </a>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-white/30">
                    {new Date(e.notificado_em || e.created_at).toLocaleString('pt-BR')}
                    {e.resolvido_em && (
                      <span className="ml-2">· Resolvido em {new Date(e.resolvido_em).toLocaleString('pt-BR')}</span>
                    )}
                  </div>
                </div>

                {!e.resolvido && (
                  <button
                    onClick={() => resolver(e.id)}
                    className="shrink-0 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" /> Resolver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!whatsappHumano && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 text-sm text-amber-300/70">
          <strong className="text-amber-300">Dica:</strong> Cadastre o WhatsApp humano nos "Dados" da empresa para que a IA passe o número direto para o cliente na hora da escalação.
        </div>
      )}

      {/* Modal sugestão de FAQ */}
      {sugestaoFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">💡</span>
              <h3 className="text-lg font-bold text-white">Adicionar ao FAQ?</h3>
            </div>
            <p className="text-sm text-white/60">
              A IA escalou por este motivo. Quer adicionar ao FAQ para que ela resolva sozinha da próxima vez?
            </p>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-white/80">
              <strong>Pergunta sugerida:</strong> {sugestaoFaq.pergunta_sugerida}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSugestaoFaq(null)} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white">
                Ignorar
              </button>
              <button onClick={adicionarFaqSugerida} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium">
                Adicionar ao FAQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
