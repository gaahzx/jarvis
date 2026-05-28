'use client';

import { useState } from 'react';
import { Key, Eye, EyeOff, TestTube, Trash2, Save, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function TabApiKey({ data, reload }: any) {
  const e = data.empresa;
  const [provider, setProvider] = useState(e.api_provider || 'master');
  const [apiKey, setApiKey] = useState('');
  const [modeloPref, setModeloPref] = useState(e.api_modelo_preferido || '');
  const [soGratuitos, setSoGratuitos] = useState(e.api_so_gratuitos ?? true);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  async function save() {
    setSaving(true);
    try {
      await api.setApiKey(e.id, {
        api_provider: provider,
        api_key: apiKey || null,
        api_modelo_preferido: modeloPref || null,
        api_so_gratuitos: soGratuitos,
      });
      setApiKey('');
      toast.success('Configuração salva!');
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function testKey() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await api.testApiKey(e.id);
      setTestResult(r);
      r.ok ? toast.success('Key válida!') : toast.error(r.message);
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  }

  async function clear() {
    if (!confirm('Limpar API key e voltar pra master?')) return;
    try {
      await api.clearApiKey(e.id);
      toast.success('Key removida');
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-200">
        🔑 Por padrão, esta empresa usa a <strong>key master</strong> (sua, gratuita). Configure aqui se o cliente quiser usar key própria (Premium).
      </div>

      {/* Status atual */}
      <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5">
        <h3 className="font-semibold text-white mb-3">Status atual</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/50">Provedor</span>
            <span className="font-medium text-white">{e.api_provider}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Status da Key</span>
            <span className={`font-medium ${e.api_key_status === 'master' ? 'text-blue-400' : e.api_key_status === 'propria_valida' ? 'text-emerald-400' : 'text-red-400'}`}>
              {e.api_key_status === 'master' ? '🔵 Usando master (sua)' :
               e.api_key_status === 'propria_valida' ? '🟢 Key própria válida' :
               e.api_key_status === 'propria_invalida' ? '🔴 Key própria inválida' : 'Não configurada'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Apenas modelos gratuitos</span>
            <span className="font-medium text-white">{e.api_so_gratuitos ? '✅ Sim' : '❌ Não'}</span>
          </div>
          {e.api_ultima_validacao && (
            <div className="flex justify-between">
              <span className="text-white/50">Última validação</span>
              <span className="text-white/60 text-xs">{new Date(e.api_ultima_validacao).toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Provedor */}
      <div>
        <label className="label">📡 Provedor de IA</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { v: 'master', l: '🔵 Master (sua key)', d: 'Usa a key gratuita do sistema' },
            { v: 'openrouter_propria', l: '🟣 OpenRouter próprio', d: 'Cliente paga sua API key' },
            { v: 'anthropic', l: '🟠 Anthropic Claude', d: 'Direto com Anthropic' },
            { v: 'openai', l: '🟢 OpenAI GPT', d: 'Direto com OpenAI' },
            { v: 'google', l: '🔴 Google Gemini', d: 'Direto com Google AI' },
            { v: 'groq', l: '⚡ Groq', d: 'Llama ultra-rápido' },
          ].map((p) => (
            <button
              key={p.v}
              onClick={() => setProvider(p.v)}
              className={`text-left rounded-xl p-3 border-2 transition-all ${
                provider === p.v
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <div className="font-medium text-white">{p.l}</div>
              <div className="text-xs text-white/40 mt-1">{p.d}</div>
            </button>
          ))}
        </div>
      </div>

      {provider !== 'master' && (
        <>
          <div>
            <label className="label">🔐 API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-3 h-5 w-5 text-white/30" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={e.api_key_status === 'propria_valida' ? 'sk-•••••••••• (já configurada, digite nova para trocar)' : 'sk-...'}
                  className="input pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-3 text-white/40 hover:text-white"
                >
                  {showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {e.api_key_propria && (
                <button onClick={testKey} disabled={testing} className="btn-secondary flex items-center gap-2 px-4">
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                  Testar
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-white/40">
              A key é criptografada (AES-256) antes de salvar no banco.
            </p>

            {testResult && (
              <div className={`mt-3 rounded-xl p-3 text-sm ${testResult.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                {testResult.ok ? <CheckCircle className="inline h-4 w-4 mr-2" /> : <XCircle className="inline h-4 w-4 mr-2" />}
                {testResult.message}
                {testResult.model && <span className="text-xs opacity-70"> ({testResult.model})</span>}
              </div>
            )}
          </div>

          <div>
            <label className="label">⚙️ Modelo preferido</label>
            <input
              className="input"
              value={modeloPref}
              onChange={(e) => setModeloPref(e.target.value)}
              placeholder="Ex: anthropic/claude-3.5-sonnet"
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
        <input
          type="checkbox"
          id="sogratis"
          checked={soGratuitos}
          onChange={(e) => setSoGratuitos(e.target.checked)}
          className="h-5 w-5 rounded accent-emerald-500"
        />
        <label htmlFor="sogratis" className="text-white cursor-pointer flex-1">
          🛡️ Apenas modelos gratuitos (proteção contra gastos)
          <p className="text-xs text-white/50 mt-0.5">Mesmo com key paga, sistema só usa modelos :free</p>
        </label>
      </div>

      <div className="flex gap-3 justify-end">
        {e.api_key_propria && (
          <button onClick={clear} className="btn-danger flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Limpar key
          </button>
        )}
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar configuração
        </button>
      </div>
    </div>
  );
}
