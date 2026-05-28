'use client';

import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function TabDados({ data, reload }: any) {
  const e = data.empresa;
  const [form, setForm] = useState({
    nome_fantasia: e.nome_fantasia || '',
    razao_social: e.razao_social || '',
    cnpj: e.cnpj || '',
    segmento: e.segmento || '',
    email_contato: e.email_contato || '',
    telefone: e.telefone || '',
    whatsapp_humano: e.whatsapp_humano || '',
    plano: e.plano || 'basico',
    status: e.status || 'ativo',
    limite_msgs_mes: e.limite_msgs_mes || 1000,
    valor_mensal: e.valor_mensal || 0,
    observacoes: e.observacoes || '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.updateEmpresa(e.id, form);
      toast.success('Salvo!');
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm({ ...form, [k]: v });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Nome fantasia *</label>
          <input className="input" value={form.nome_fantasia} onChange={(ev) => set('nome_fantasia', ev.target.value)} />
        </div>
        <div>
          <label className="label">Razão social</label>
          <input className="input" value={form.razao_social} onChange={(ev) => set('razao_social', ev.target.value)} />
        </div>
        <div>
          <label className="label">CNPJ</label>
          <input className="input" value={form.cnpj} onChange={(ev) => set('cnpj', ev.target.value)} placeholder="00.000.000/0000-00" />
        </div>
        <div>
          <label className="label">Segmento</label>
          <input className="input" value={form.segmento} onChange={(ev) => set('segmento', ev.target.value)} />
        </div>
        <div>
          <label className="label">E-mail contato</label>
          <input className="input" type="email" value={form.email_contato} onChange={(ev) => set('email_contato', ev.target.value)} />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input className="input" value={form.telefone} onChange={(ev) => set('telefone', ev.target.value)} />
        </div>
        <div>
          <label className="label">WhatsApp humano (escalonamento)</label>
          <input className="input" value={form.whatsapp_humano} onChange={(ev) => set('whatsapp_humano', ev.target.value)} placeholder="5511999998888" />
        </div>
        <div>
          <label className="label">Plano</label>
          <select className="input" value={form.plano} onChange={(ev) => set('plano', ev.target.value)}>
            <option value="basico">Básico</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={(ev) => set('status', ev.target.value)}>
            <option value="trial">Trial</option>
            <option value="ativo">Ativo</option>
            <option value="suspenso">Suspenso</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div>
          <label className="label">Limite msgs/mês</label>
          <input className="input" type="number" value={form.limite_msgs_mes} onChange={(ev) => set('limite_msgs_mes', parseInt(ev.target.value) as any)} />
        </div>
        <div>
          <label className="label">Valor mensal (R$)</label>
          <input className="input" type="number" step="0.01" value={form.valor_mensal} onChange={(ev) => set('valor_mensal', parseFloat(ev.target.value) as any)} />
        </div>
      </div>

      <div>
        <label className="label">Observações</label>
        <textarea className="input min-h-[100px]" value={form.observacoes} onChange={(ev) => set('observacoes', ev.target.value)} />
      </div>

      {e.slug_publico && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-2">
          <div className="text-xs font-medium text-emerald-400">🔗 Link da Agenda Pública</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-white/70 bg-white/5 rounded-lg px-3 py-2 break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/agendar/${e.slug_publico}` : `/agendar/${e.slug_publico}`}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/agendar/${e.slug_publico}`); }}
              className="shrink-0 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
            >Copiar</button>
          </div>
          <p className="text-xs text-white/30">Compartilhe com clientes para agendamento direto pelo navegador, sem WhatsApp.</p>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </button>
      </div>
    </div>
  );
}
