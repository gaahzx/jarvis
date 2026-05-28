'use client';

import { useState } from 'react';
import { Save, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const SEGMENTOS = [
  { key: 'salao', label: '💇 Salão de Beleza' },
  { key: 'clinica', label: '🏥 Clínica / Saúde' },
  { key: 'restaurante', label: '🍽️ Restaurante / Delivery' },
  { key: 'petshop', label: '🐾 Pet Shop / Vet' },
  { key: 'academia', label: '💪 Academia / Fitness' },
  { key: 'ecommerce', label: '🛍️ E-commerce / Loja' },
];

export function TabIdentidade({ data, reload }: any) {
  const i = data.identidade || {};
  const [form, setForm] = useState({
    nome_assistente: i.nome_assistente || '',
    saudacao_inicial: i.saudacao_inicial || '',
    tom_voz: i.tom_voz || 'profissional_amigavel',
    estilo_resposta: i.estilo_resposta || 'medio',
    usa_emojis: i.usa_emojis ?? true,
    modelo_principal: i.modelo_principal || 'openai/gpt-oss-120b:free',
    temperatura: i.temperatura || 0.7,
    max_tokens: i.max_tokens || 500,
  });
  const [saving, setSaving] = useState(false);
  const [aplicando, setAplicando] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.updateIdentidade(data.empresa.id, form);
      toast.success('Identidade salva!');
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function aplicarTemplate(segmento: string) {
    if (!confirm(`Aplicar template de ${SEGMENTOS.find(s => s.key === segmento)?.label}? Isso vai atualizar a identidade e adicionar FAQs sugeridas.`)) return;
    setAplicando(true);
    try {
      await api.aplicarTemplate(data.empresa.id, segmento);
      toast.success('Template aplicado! Recarregando...');
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAplicando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-brand-500/10 border border-brand-500/20 p-4 text-sm text-brand-200">
        🤖 Esta é a <strong>personalidade da IA</strong>. Como ela se apresenta e fala com seus clientes.
      </div>

      {/* Templates por segmento */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Wand2 className="h-4 w-4 text-violet-400" />
          Templates por segmento
          <span className="text-xs text-white/30 font-normal ml-1">— aplica configurações pré-definidas + FAQs sugeridas</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {SEGMENTOS.map(s => (
            <button
              key={s.key}
              onClick={() => aplicarTemplate(s.key)}
              disabled={aplicando}
              className="text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-500/30 text-sm text-white/70 hover:text-white transition disabled:opacity-50"
            >
              {aplicando ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : null}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Nome da assistente</label>
          <input className="input" value={form.nome_assistente} onChange={(e) => setForm({ ...form, nome_assistente: e.target.value })} placeholder="Ex: Ana" />
        </div>
        <div>
          <label className="label">Tom de voz</label>
          <select className="input" value={form.tom_voz} onChange={(e) => setForm({ ...form, tom_voz: e.target.value })}>
            <option value="formal_profissional">Formal e profissional</option>
            <option value="profissional_amigavel">Profissional mas amigável</option>
            <option value="descontraido">Descontraído e próximo</option>
            <option value="jovem_divertido">Jovem e divertido</option>
            <option value="acolhedor">Acolhedor e empático</option>
            <option value="direto_objetivo">Direto e objetivo</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Saudação inicial (primeira mensagem)</label>
        <textarea
          className="input min-h-[80px]"
          value={form.saudacao_inicial}
          onChange={(e) => setForm({ ...form, saudacao_inicial: e.target.value })}
          placeholder="Ex: Oi! Sou a Ana da Clínica Vida 😊 Como posso te ajudar?"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Tamanho da resposta</label>
          <select className="input" value={form.estilo_resposta} onChange={(e) => setForm({ ...form, estilo_resposta: e.target.value })}>
            <option value="curto">Bem curto (1 linha)</option>
            <option value="medio">Médio (2-3 linhas)</option>
            <option value="longo">Longo (parágrafo)</option>
          </select>
        </div>
        <div>
          <label className="label">Temperatura ({form.temperatura})</label>
          <input
            type="range" min="0" max="1" step="0.1"
            value={form.temperatura}
            onChange={(e) => setForm({ ...form, temperatura: parseFloat(e.target.value) as any })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-white/40">
            <span>Mais previsível</span>
            <span>Mais criativo</span>
          </div>
        </div>
        <div>
          <label className="label">Max tokens</label>
          <input
            type="number"
            className="input"
            value={form.max_tokens}
            onChange={(e) => setForm({ ...form, max_tokens: parseInt(e.target.value) as any })}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5">
        <input
          type="checkbox"
          id="emojis"
          checked={form.usa_emojis}
          onChange={(e) => setForm({ ...form, usa_emojis: e.target.checked })}
          className="h-5 w-5 rounded accent-brand-500"
        />
        <label htmlFor="emojis" className="text-white cursor-pointer">😊 Usar emojis nas respostas</label>
      </div>

      <div>
        <label className="label">Modelo de IA padrão</label>
        <select className="input" value={form.modelo_principal} onChange={(e) => setForm({ ...form, modelo_principal: e.target.value })}>
          <optgroup label="Gratuitos (recomendado)">
            <option value="openai/gpt-oss-120b:free">GPT OSS 120B (free)</option>
            <option value="minimax/minimax-m2.5:free">MiniMax 2.5 (free)</option>
            <option value="z-ai/glm-4.5-air:free">GLM 4.5 Air (free)</option>
            <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B (free)</option>
          </optgroup>
          <optgroup label="Pagos (usam API key própria)">
            <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
            <option value="openai/gpt-4o">GPT-4o</option>
            <option value="google/gemini-2.0-flash">Gemini 2.0 Flash</option>
          </optgroup>
        </select>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar identidade
        </button>
      </div>
    </div>
  );
}
