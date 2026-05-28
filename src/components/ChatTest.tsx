'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, Loader2, Trash2, Zap, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  meta?: {
    modelo?: string;
    tokens?: number;
    tempo_ms?: number;
    gratuito?: boolean;
    intent?: any;
    agendamento_id?: string;
    escalacao_id?: string;
    encerrado?: boolean;
  };
};

interface Props {
  empresaId: string;
  empresaNome: string;
  assistenteNome?: string;
  emojiEmpresa?: string;
  compact?: boolean;
}

export function ChatTest({ empresaId, empresaNome, assistenteNome = 'Assistente', emojiEmpresa = '🏢', compact = false }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [encerrado, setEncerrado] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Reset ao trocar empresa
  useEffect(() => {
    setMessages([]);
    setEncerrado(false);
  }, [empresaId]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const r = await api.chatTest(
        empresaId,
        userMsg.content,
        newMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }))
      );
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: r.reply,
          meta: {
            modelo: r.modelo,
            tokens: r.tokens?.total,
            tempo_ms: r.tempo_ms,
            gratuito: r.gratuito,
            intent: r.intent,
            agendamento_id: r.agendamento_id,
            escalacao_id: r.escalacao_id,
            encerrado: r.encerrado,
          },
        },
      ]);
      if (r.agendamento_id) {
        toast.success('📅 Agendamento criado e salvo!', {
          description: 'Veja na aba "Agendamentos" da empresa',
        });
      }
      if (r.escalacao_id) {
        toast.warning('🚨 Escalação para humano registrada!', {
          description: 'Veja na aba "Escalações" da empresa',
        });
      }
      if (r.encerrado) {
        setEncerrado(true);
        toast.success('👋 Conversa encerrada pelo cliente');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao chamar IA');
      setMessages([...newMessages, { role: 'assistant', content: `❌ Erro: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  const placeholderQuestions = [
    'Oi, qual o horário de atendimento?',
    'Vocês fazem botox? Quanto custa?',
    'Onde fica a clínica?',
    'Aceitam convênio?',
    'Quero agendar uma consulta',
  ];

  return (
    <div className={`flex flex-col ${compact ? 'h-[500px]' : 'h-[600px]'} card overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-xl">
          {emojiEmpresa}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-white">{assistenteNome}</div>
          <div className="text-xs text-emerald-300/70 flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> online
          </div>
        </div>
        <button
          onClick={() => setMessages([])}
          className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white"
          title="Limpar conversa"
          disabled={messages.length === 0}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Mensagens */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ background: 'linear-gradient(180deg, rgba(13,29,43,0.4) 0%, rgba(0,0,0,0.6) 100%)' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-12 w-12 text-white/20 mb-3" />
            <p className="text-sm text-white/50 mb-4">
              Teste a IA da <span className="font-semibold text-white">{empresaNome}</span>
            </p>
            <p className="text-xs text-white/30 mb-4">Sugestões:</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {placeholderQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div className={`max-w-[80%] ${m.role === 'user' ? 'order-2' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    m.role === 'user'
                      ? 'bg-brand-500 text-white rounded-tr-sm'
                      : 'bg-white/10 text-white rounded-tl-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                </div>
                {m.meta?.agendamento_id && m.meta?.intent && (
                  <div className="mt-2 rounded-xl bg-violet-500/10 border border-violet-500/30 p-3 text-xs">
                    <div className="flex items-center gap-2 mb-2 text-violet-300 font-semibold">
                      📅 Agendamento criado e salvo!
                    </div>
                    <div className="space-y-0.5 text-white/70">
                      {m.meta.intent.servico && <div>📋 {m.meta.intent.servico}</div>}
                      {m.meta.intent.data_hora && (
                        <div>🕐 {new Date(m.meta.intent.data_hora).toLocaleString('pt-BR')}</div>
                      )}
                      {m.meta.intent.cliente_nome && <div>👤 {m.meta.intent.cliente_nome}</div>}
                    </div>
                    <div className="mt-1 text-white/40 text-[10px]">ID: {m.meta.agendamento_id.slice(0, 8)}...</div>
                  </div>
                )}
                {m.meta?.escalacao_id && m.meta?.intent && (
                  <div className="mt-2 rounded-xl bg-orange-500/10 border border-orange-500/30 p-3 text-xs">
                    <div className="flex items-center gap-2 mb-2 text-orange-300 font-semibold">
                      🚨 Escalação para atendimento humano!
                    </div>
                    <div className="space-y-0.5 text-white/70">
                      {m.meta.intent.motivo && <div>💬 {m.meta.intent.motivo}</div>}
                      {m.meta.intent.cliente_nome && <div>👤 {m.meta.intent.cliente_nome}</div>}
                      {m.meta.intent.urgente && <div className="text-red-400 font-semibold">⚡ URGENTE</div>}
                    </div>
                    <div className="mt-1 text-white/40 text-[10px]">ID: {m.meta.escalacao_id.slice(0, 8)}...</div>
                  </div>
                )}
                {m.meta?.encerrado && (
                  <div className="mt-2 rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-center text-white/50">
                    👋 Conversa encerrada pelo cliente
                  </div>
                )}
                {m.meta && (
                  <div className="flex items-center gap-2 mt-1 ml-1 text-[10px] text-white/30">
                    {m.meta.modelo && (
                      <span className="rounded-full bg-white/5 px-2 py-0.5">
                        {m.meta.modelo.split('/').pop()?.replace(':free', '')}
                      </span>
                    )}
                    {m.meta.tempo_ms !== undefined && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {m.meta.tempo_ms}ms
                      </span>
                    )}
                    {m.meta.tokens !== undefined && (
                      <span className="flex items-center gap-0.5">
                        <Zap className="h-2.5 w-2.5" /> {m.meta.tokens}t
                      </span>
                    )}
                    {m.meta.gratuito && <span className="text-emerald-400">grátis</span>}
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-300 order-3">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/5 bg-black/30 p-3">
        {encerrado ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-white/40">Conversa encerrada</p>
            <button
              onClick={() => { setMessages([]); setEncerrado(false); }}
              className="btn-ghost text-sm flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" /> Nova conversa
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Digite uma mensagem ou 1, 2, 3..."
                disabled={loading}
                className="input flex-1"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="btn-primary px-4 disabled:opacity-30"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-white/30 text-center">
              🧪 Modo teste — usa a mesma IA que vai responder no WhatsApp real
            </p>
          </>
        )}
      </div>
    </div>
  );
}
