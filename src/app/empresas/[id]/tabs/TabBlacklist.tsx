'use client';

import { useEffect, useState } from 'react';
import { ShieldX, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function TabBlacklist({ data }: any) {
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [numero, setNumero] = useState('');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function load() {
    setLoading(true);
    try { setLista(await api.blacklist(data.empresa.id)); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [data.empresa.id]);

  async function adicionar() {
    if (!numero.trim()) return toast.error('Informe o número');
    setSalvando(true);
    try {
      await api.adicionarBlacklist(data.empresa.id, numero.trim(), motivo.trim());
      toast.success('Número bloqueado');
      setNumero(''); setMotivo('');
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSalvando(false); }
  }

  async function remover(num: string) {
    try {
      await api.removerBlacklist(data.empresa.id, num);
      toast.success('Desbloqueado');
      await load();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldX className="h-5 w-5 text-red-400" />
        <h2 className="text-lg font-bold text-white">Blacklist</h2>
        <span className="text-xs text-white/30 ml-1">Números bloqueados silenciosamente do atendimento IA</span>
      </div>

      {/* Adicionar */}
      <div className="card p-4 space-y-3">
        <p className="text-xs text-white/50">Adicionar número à blacklist</p>
        <div className="flex gap-2">
          <input
            value={numero}
            onChange={e => setNumero(e.target.value)}
            placeholder="55119xxxxxxxx"
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500"
          />
          <input
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Motivo (opcional)"
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={adicionar}
            disabled={salvando}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Bloquear
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-brand-400" /></div>
      ) : lista.length === 0 ? (
        <div className="text-center text-white/30 text-sm py-10">Nenhum número bloqueado.</div>
      ) : (
        <div className="space-y-2">
          {lista.map((item: any) => (
            <div key={item.numero} className="card p-3 flex items-center justify-between gap-3">
              <div>
                <span className="font-mono text-sm text-white">{item.numero}</span>
                {item.motivo && <span className="ml-3 text-xs text-white/40">{item.motivo}</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-white/30">
                <span>{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                <button onClick={() => remover(item.numero)} className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition">
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
