'use client';

import { useEffect, useState } from 'react';
import { Clock, Bell, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function TabListaEspera({ data }: any) {
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificando, setNotificando] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try { setLista(await api.listaEspera(data.empresa.id)); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [data.empresa.id]);

  async function notificar(id: string) {
    setNotificando(id);
    try {
      await api.notificarListaEspera(data.empresa.id, id);
      toast.success('Cliente notificado via WhatsApp!');
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setNotificando(null); }
  }

  async function remover(id: string) {
    try {
      await api.removerListaEspera(data.empresa.id, id);
      toast.success('Removido da lista');
      await load();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-amber-400" />
        <h2 className="text-lg font-bold text-white">Lista de Espera</h2>
        <span className="text-xs text-white/30 ml-1">Clientes aguardando uma vaga</span>
      </div>

      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-200">
        💡 Quando abrir uma vaga, clique em <strong>Notificar</strong> para avisar o cliente automaticamente pelo WhatsApp.
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-brand-400" /></div>
      ) : lista.length === 0 ? (
        <div className="text-center text-white/30 text-sm py-10">Nenhum cliente na lista de espera.</div>
      ) : (
        <div className="space-y-2">
          {lista.map((item: any) => (
            <div key={item.id} className="card p-4 flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="font-medium text-white text-sm">{item.nome || item.numero}</div>
                <div className="text-xs text-white/40 mt-0.5">
                  {item.numero}{item.servico && ` · ${item.servico}`}
                  {' · '}{new Date(item.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => notificar(item.id)}
                  disabled={notificando === item.id}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  {notificando === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                  Notificar
                </button>
                <button onClick={() => remover(item.id)} className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition text-white/30">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
