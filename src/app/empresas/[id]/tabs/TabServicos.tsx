'use client';

import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function TabServicos({ data, reload }: any) {
  const [form, setForm] = useState({ nome: '', descricao: '', preco: '', duracao_minutos: '', categoria: '' });
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!form.nome) return toast.error('Nome é obrigatório');
    setAdding(true);
    try {
      await api.addServico(data.empresa.id, {
        ...form,
        preco: form.preco ? parseFloat(form.preco) : null,
        duracao_minutos: form.duracao_minutos ? parseInt(form.duracao_minutos) : null,
      });
      setForm({ nome: '', descricao: '', preco: '', duracao_minutos: '', categoria: '' });
      toast.success('Serviço adicionado!');
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function del(id: string) {
    if (!confirm('Excluir este serviço?')) return;
    try {
      await api.deleteServico(data.empresa.id, id);
      toast.success('Excluído!');
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-200">
        💼 Liste todos os serviços/produtos. A IA vai usar essa lista pra responder.
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {data.servicos.length === 0 ? (
          <div className="text-center text-white/40 py-8">Nenhum serviço cadastrado ainda.</div>
        ) : (
          data.servicos.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">{s.nome}</span>
                  {s.categoria && <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/60">{s.categoria}</span>}
                </div>
                {s.descricao && <p className="text-sm text-white/50 mt-1">{s.descricao}</p>}
                <div className="flex items-center gap-4 mt-2 text-sm">
                  {s.preco && <span className="text-emerald-400 font-medium">R$ {parseFloat(s.preco).toFixed(2)}</span>}
                  {s.duracao_minutos && <span className="text-white/40">{s.duracao_minutos} min</span>}
                </div>
              </div>
              <button onClick={() => del(s.id)} className="btn-danger p-2">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Form add */}
      <div className="rounded-xl border border-white/10 p-5 space-y-3">
        <h3 className="font-semibold text-white">+ Adicionar serviço</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input" placeholder="Nome *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <input className="input" placeholder="Categoria (opcional)" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
          <input className="input" type="number" step="0.01" placeholder="Preço (R$)" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} />
          <input className="input" type="number" placeholder="Duração (min)" value={form.duracao_minutos} onChange={(e) => setForm({ ...form, duracao_minutos: e.target.value })} />
        </div>
        <textarea className="input" placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <button onClick={add} disabled={adding} className="btn-primary flex items-center gap-2">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar
        </button>
      </div>
    </div>
  );
}
