'use client';

import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function TabFaq({ data, reload }: any) {
  const [form, setForm] = useState({ categoria: '', pergunta: '', resposta: '', prioridade: 5 });
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!form.pergunta || !form.resposta) return toast.error('Pergunta e resposta são obrigatórios');
    setAdding(true);
    try {
      await api.addFaq(data.empresa.id, form);
      setForm({ categoria: '', pergunta: '', resposta: '', prioridade: 5 });
      toast.success('FAQ adicionada!');
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function del(id: string) {
    if (!confirm('Excluir esta FAQ?')) return;
    try {
      await api.deleteFaq(data.empresa.id, id);
      toast.success('Excluída!');
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4 text-sm text-violet-200">
        ❓ FAQ é o coração da IA. Quanto mais perguntas você cadastrar, mais inteligente ela fica. <strong>Meta: mínimo 20 FAQs.</strong>
      </div>

      <div className="space-y-2">
        {data.faq.length === 0 ? (
          <div className="text-center text-white/40 py-8">Nenhuma FAQ cadastrada ainda.</div>
        ) : (
          data.faq.map((f: any) => (
            <div key={f.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {f.categoria && <span className="rounded-full bg-violet-500/20 text-violet-300 px-2 py-0.5 text-xs">{f.categoria}</span>}
                    <span className="text-xs text-white/40">Prioridade: {f.prioridade}</span>
                  </div>
                  <p className="font-semibold text-white">❓ {f.pergunta}</p>
                  <p className="text-sm text-white/60 mt-1">💬 {f.resposta}</p>
                </div>
                <button onClick={() => del(f.id)} className="btn-danger p-2">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-xl border border-white/10 p-5 space-y-3">
        <h3 className="font-semibold text-white">+ Adicionar FAQ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input" placeholder="Categoria (ex: Horário)" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
          <div>
            <label className="text-xs text-white/50 block mb-1">Prioridade (1-10)</label>
            <input
              className="input"
              type="range" min="1" max="10"
              value={form.prioridade}
              onChange={(e) => setForm({ ...form, prioridade: parseInt(e.target.value) })}
            />
            <div className="text-xs text-white/40 text-right">{form.prioridade}</div>
          </div>
        </div>
        <input className="input" placeholder="Pergunta do cliente *" value={form.pergunta} onChange={(e) => setForm({ ...form, pergunta: e.target.value })} />
        <textarea className="input min-h-[100px]" placeholder="Resposta da IA *" value={form.resposta} onChange={(e) => setForm({ ...form, resposta: e.target.value })} />
        <button onClick={add} disabled={adding} className="btn-primary flex items-center gap-2">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar FAQ
        </button>
      </div>
    </div>
  );
}
