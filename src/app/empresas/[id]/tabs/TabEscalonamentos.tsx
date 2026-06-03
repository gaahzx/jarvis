'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle, Loader2, RefreshCw, Phone, Send,
  Bot, UserRound, MessagesSquare, ArrowLeftRight, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type Conversa = {
  id: string;
  empresa_id: string;
  contato_numero: string;
  contato_nome: string | null;
  status: string;
  atendimento_humano: boolean;
  ultima_mensagem_em: string | null;
  ultima_atividade_humana: string | null;
  contexto_handoff: string | null;
  resumo: string | null;
  total_mensagens: number;
};

type Mensagem = {
  id: string;
  origem: string; // 'cliente' | 'ia' | 'humano'
  conteudo: string;
  created_at: string;
};

function tempoRelativo(iso: string | null) {
  if (!iso) return '';
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export function TabEscalonamentos({ data }: any) {
  const empresaId = data.empresa.id;
  const empresaNome = data.empresa.nome_fantasia;
  const whatsappHumano = data.empresa.whatsapp_humano;

  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [escalonamentos, setEscalonamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [selecionada, setSelecionada] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregandoMsgs, setCarregandoMsgs] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sugestaoFaq, setSugestaoFaq] = useState<any>(null);

  const msgEndRef = useRef<HTMLDivElement>(null);
  const selecionadaId = selecionada?.id;

  // ── Carrega listas ──────────────────────────────────────────────────────
  async function loadListas(silencioso = false) {
    if (!silencioso) setLoading(true);
    try {
      const [convs, escs] = await Promise.all([
        api.conversasDaEmpresa(empresaId),
        api.escalonamentos(false),
      ]);
      setConversas(convs || []);
      setEscalonamentos((escs || []).filter((e: any) => e.empresa_id === empresaId || e.empresa === empresaNome));
    } catch (err: any) {
      if (!silencioso) toast.error(err.message);
    } finally {
      if (!silencioso) setLoading(false);
    }
  }

  // ── Carrega mensagens da conversa aberta ────────────────────────────────
  async function loadMensagens(convId: string, silencioso = false) {
    if (!silencioso) setCarregandoMsgs(true);
    try {
      const msgs = await api.mensagensDaConversa(convId);
      setMensagens(msgs || []);
    } catch (err: any) {
      if (!silencioso) toast.error(err.message);
    } finally {
      if (!silencioso) setCarregandoMsgs(false);
    }
  }

  useEffect(() => { loadListas(); }, [empresaId]);

  // Polling das listas
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => loadListas(true), 5000);
    return () => clearInterval(t);
  }, [autoRefresh, empresaId, empresaNome]);

  // Carrega + faz polling das mensagens da conversa aberta
  useEffect(() => {
    if (!selecionadaId) return;
    loadMensagens(selecionadaId);
    if (!autoRefresh) return;
    const t = setInterval(() => loadMensagens(selecionadaId, true), 4000);
    return () => clearInterval(t);
  }, [selecionadaId, autoRefresh]);

  // Scroll pro fim quando chegam mensagens
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens.length]);

  // ── Ações ───────────────────────────────────────────────────────────────
  async function enviar() {
    if (!texto.trim() || !selecionada) return;
    setEnviando(true);
    try {
      await api.responderConversa(selecionada.id, texto.trim());
      setTexto('');
      await loadMensagens(selecionada.id, true);
      loadListas(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function alternarAtendimento() {
    if (!selecionada) return;
    try {
      if (selecionada.atendimento_humano) {
        await api.devolverConversaIA(selecionada.id);
        toast.success('Conversa devolvida para a IA');
        setSelecionada({ ...selecionada, atendimento_humano: false, status: 'em_andamento' });
      } else {
        await api.assumirConversa(selecionada.id);
        toast.success('Você assumiu a conversa — IA pausada');
        setSelecionada({ ...selecionada, atendimento_humano: true, status: 'escalada' });
      }
      loadListas(true);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function resolver(id: string) {
    try {
      const resultado = await api.resolverEscalonamento(id, 'Resolvido pelo painel');
      toast.success('Marcado como resolvido!');
      if (resultado?.sugestao_faq?.pergunta_sugerida) {
        setSugestaoFaq({ ...resultado.sugestao_faq, empresaId });
      }
      loadListas(true);
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

  // ── Derivações ──────────────────────────────────────────────────────────
  const humanas = conversas.filter(c => c.atendimento_humano);
  const ia = conversas.filter(c => !c.atendimento_humano && c.status !== 'finalizada');
  const pendentes = escalonamentos.filter(e => !e.resolvido);

  // ── Card de conversa ──────────────────────────────────────────────────────
  function CardConversa({ c }: { c: Conversa }) {
    const ativo = selecionada?.id === c.id;
    return (
      <button
        onClick={() => setSelecionada(c)}
        className={`w-full text-left rounded-xl border p-3 transition-all ${
          ativo
            ? 'border-brand-500/50 bg-brand-500/10'
            : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-white truncate">
            {c.contato_nome || c.contato_numero || 'Contato'}
          </span>
          <span className="text-[10px] text-white/30 shrink-0">{tempoRelativo(c.ultima_mensagem_em)}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {c.atendimento_humano ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-300">
              <UserRound className="h-3 w-3" /> Humano
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-300">
              <Bot className="h-3 w-3" /> IA
            </span>
          )}
          <span className="text-[10px] text-white/30">{c.total_mensagens || 0} msgs</span>
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Escalações & Monitor de Conversas</h2>
          <p className="text-sm text-white/50">Acompanhe em tempo real e assuma o atendimento quando precisar</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              autoRefresh ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-white/40'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
            {autoRefresh ? 'Tempo real' : 'Pausado'}
          </button>
          <button onClick={() => loadListas()} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>
      </div>

      {/* Escalações pendentes (alertas) */}
      {pendentes.length > 0 && (
        <div className="space-y-2">
          {pendentes.map((e) => (
            <div key={e.id} className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-white">{e.motivo || 'Cliente solicitou atendimento humano'}</div>
                  <div className="text-xs text-white/50 flex items-center gap-2 mt-0.5">
                    {e.contato_nome && <span>👤 {e.contato_nome}</span>}
                    {e.contato_numero && e.contato_numero !== 'TESTE' && (
                      <a href={`https://wa.me/${e.contato_numero.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {e.contato_numero}
                      </a>
                    )}
                    <span className="text-white/30">{new Date(e.notificado_em || e.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => resolver(e.id)} className="shrink-0 flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20">
                <CheckCircle className="h-3.5 w-3.5" /> Resolver
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand-400" /></div>
      ) : (
        <div className="grid lg:grid-cols-[360px_1fr] gap-4">
          {/* COLUNA ESQUERDA: listas */}
          <div className="space-y-4">
            {/* Em atendimento humano */}
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-orange-300">
                <UserRound className="h-4 w-4" /> Em atendimento humano
                <span className="text-xs text-white/30">({humanas.length})</span>
              </div>
              <div className="space-y-2">
                {humanas.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/30">Nenhuma conversa transferida</div>
                ) : humanas.map(c => <CardConversa key={c.id} c={c} />)}
              </div>
            </div>

            {/* Atendidas pela IA */}
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-sky-300">
                <Bot className="h-4 w-4" /> Atendidas pela IA
                <span className="text-xs text-white/30">({ia.length})</span>
              </div>
              <div className="space-y-2">
                {ia.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/30">Nenhuma conversa ativa com a IA</div>
                ) : ia.map(c => <CardConversa key={c.id} c={c} />)}
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: viewer da conversa */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col min-h-[520px]">
            {!selecionada ? (
              <div className="flex-1 flex flex-col items-center justify-center text-white/30 gap-2">
                <MessagesSquare className="h-10 w-10" />
                <p className="text-sm">Selecione uma conversa para acompanhar em tempo real</p>
              </div>
            ) : (
              <>
                {/* Header da conversa */}
                <div className="border-b border-white/10 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">{selecionada.contato_nome || selecionada.contato_numero}</span>
                      {selecionada.atendimento_humano ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-300"><UserRound className="h-3 w-3" /> Humano</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-300"><Bot className="h-3 w-3" /> IA</span>
                      )}
                    </div>
                    <div className="text-xs text-white/40">{selecionada.contato_numero}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selecionada.contato_numero && selecionada.contato_numero !== 'TESTE' && (
                      <a href={`https://wa.me/${selecionada.contato_numero.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20">
                        <Phone className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    )}
                    <button onClick={alternarAtendimento}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                        selecionada.atendimento_humano
                          ? 'bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
                          : 'bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'
                      }`}>
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      {selecionada.atendimento_humano ? 'Devolver à IA' : 'Assumir'}
                    </button>
                  </div>
                </div>

                {/* Banner de contexto (onde continuar) */}
                {(selecionada.contexto_handoff || selecionada.resumo) && (
                  <div className="border-b border-white/10 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-300 mb-1">
                      <Sparkles className="h-3.5 w-3.5" /> Onde continuar
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">
                      {selecionada.contexto_handoff || selecionada.resumo}
                    </p>
                  </div>
                )}

                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px]">
                  {carregandoMsgs && mensagens.length === 0 ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-brand-400" /></div>
                  ) : mensagens.length === 0 ? (
                    <div className="text-center text-xs text-white/30 py-6">Sem mensagens ainda</div>
                  ) : mensagens.map((m) => {
                    const isCliente = m.origem === 'cliente';
                    const isHumano = m.origem === 'humano';
                    return (
                      <div key={m.id} className={`flex ${isCliente ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                          isCliente
                            ? 'bg-white/10 text-white/90 rounded-tl-sm'
                            : isHumano
                              ? 'bg-orange-500/20 text-orange-50 rounded-tr-sm'
                              : 'bg-brand-500/20 text-brand-50 rounded-tr-sm'
                        }`}>
                          <div className="flex items-center gap-1.5 mb-0.5 text-[10px] opacity-60">
                            {isCliente ? <UserRound className="h-2.5 w-2.5" /> : isHumano ? <UserRound className="h-2.5 w-2.5" /> : <Bot className="h-2.5 w-2.5" />}
                            {isCliente ? 'Cliente' : isHumano ? 'Você' : 'IA'}
                            <span className="ml-1">{new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="whitespace-pre-wrap break-words">{m.conteudo}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={msgEndRef} />
                </div>

                {/* Composer */}
                <div className="border-t border-white/10 p-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                      placeholder="Responder ao cliente pela plataforma..."
                      rows={1}
                      className="input flex-1 resize-none max-h-28"
                    />
                    <button
                      onClick={enviar}
                      disabled={enviando || !texto.trim()}
                      className="flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 px-4 py-2.5 text-white transition-colors"
                    >
                      {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/30 mt-1.5">
                    A mensagem vai pelo WhatsApp do cliente · Enter envia, Shift+Enter quebra linha
                  </p>
                </div>
              </>
            )}
          </div>
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
              <button onClick={() => setSugestaoFaq(null)} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white">Ignorar</button>
              <button onClick={adicionarFaqSugerida} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium">Adicionar ao FAQ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
