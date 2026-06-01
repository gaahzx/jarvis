'use client';

import { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/AppShell';
import {
  Sparkles, Video, Image, ChevronRight, Clock, CheckCircle2,
  XCircle, Calendar, Send, Eye, Trash2, RefreshCw, Zap,
  MessageSquare, Link2, Play, Instagram
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const TIPOS = [
  { id: 'carrossel', label: 'Carrossel', icon: Image, desc: '8-10 slides PNG prontos' },
  { id: 'video', label: 'Vídeo HeyGen', icon: Video, desc: 'Reels com seu avatar IA' },
];

const TEMAS_SUGERIDOS = [
  { label: 'Apresentar o JARVIS', tipo_tema: 'jarvis' },
  { label: 'Nova funcionalidade Claude', tipo_tema: 'claude_code' },
  { label: 'Claude agora no Instagram', tipo_tema: 'meta_ia' },
  { label: 'Novidade de IA da semana', tipo_tema: 'ia_news' },
  { label: 'Como o JARVIS cria sites', tipo_tema: 'jarvis' },
  { label: 'AIOX Agents — conheça meu time', tipo_tema: 'jarvis' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  gerando:     { label: 'Gerando...', color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  pendente:    { label: 'Aguardando aprovação', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  agendado:    { label: 'Agendado', color: 'text-cyan-400',   bg: 'bg-cyan-500/10' },
  aprovado:    { label: 'Publicando...', color: 'text-green-400', bg: 'bg-green-500/10' },
  publicado:   { label: 'Publicado', color: 'text-green-400',  bg: 'bg-green-500/10' },
  rejeitado:   { label: 'Rejeitado', color: 'text-white/30',   bg: 'bg-white/5' },
  erro:        { label: 'Erro', color: 'text-red-400',    bg: 'bg-red-500/10' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendente;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cfg.color} ${cfg.bg}`}>
      {status === 'gerando' && <RefreshCw className="h-3 w-3 animate-spin" />}
      {status === 'publicado' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'rejeitado' && <XCircle className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
}

function ProgressBar({ id, onConcluido }: { id: string; onConcluido: () => void }) {
  const [progresso, setProgresso] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const data = await api.get(`/content/progresso/${id}`);
        setProgresso(data.progresso || 0);
        if (data.status !== 'gerando') {
          clearInterval(intervalRef.current);
          onConcluido();
        }
      } catch { /* ignora */ }
    }, 3000);
    return () => clearInterval(intervalRef.current);
  }, [id]);

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-white/40 mb-1">
        <span>Gerando conteúdo com IA...</span>
        <span>{progresso}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${progresso}%` }}
        />
      </div>
    </div>
  );
}

function ModalAprovar({
  item,
  onClose,
  onAprovado,
}: {
  item: any;
  onClose: () => void;
  onAprovado: () => void;
}) {
  const [legenda, setLegenda] = useState(item.legenda || '');
  const [ctaKeyword, setCtaKeyword] = useState(item.cta_keyword || 'EU QUERO');
  const [ctaLink, setCtaLink] = useState(item.cta_link || '');
  const [ctaMensagem, setCtaMensagem] = useState(item.cta_mensagem || '');
  const [publicarAgora, setPublicarAgora] = useState(false);
  const [publicarEm, setPublicarEm] = useState(() => {
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    if (d < new Date()) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });
  const [salvando, setSalvando] = useState(false);

  async function handleAprovar() {
    setSalvando(true);
    try {
      await api.post(`/content/${item.id}/aprovar`, {
        publicar_agora: publicarAgora,
        publicar_em: publicarAgora ? null : publicarEm,
        legenda,
        cta_keyword: ctaKeyword,
        cta_link: ctaLink,
        cta_mensagem: ctaMensagem,
      });
      toast.success(publicarAgora ? 'Publicando agora...' : 'Agendado com sucesso!');
      onAprovado();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#0a0f1e] border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="font-bold text-white">Aprovar e Publicar</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><XCircle className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Legenda */}
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider block mb-2">Legenda do Post</label>
            <textarea
              value={legenda}
              onChange={e => setLegenda(e.target.value)}
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white resize-none focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* CTA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider block mb-2">Keyword de Comentário</label>
              <input
                value={ctaKeyword}
                onChange={e => setCtaKeyword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                placeholder="EU QUERO"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider block mb-2">Link do DM</label>
              <input
                value={ctaLink}
                onChange={e => setCtaLink(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider block mb-2">Mensagem do DM automático</label>
            <textarea
              value={ctaMensagem}
              onChange={e => setCtaMensagem(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white resize-none focus:outline-none focus:border-cyan-500/50"
              placeholder="Oi! Aqui está o link que você pediu 👇"
            />
          </div>

          {/* Agendamento */}
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-3">
            <label className="text-xs text-white/50 uppercase tracking-wider block">Quando publicar</label>
            <div className="flex gap-3">
              <button
                onClick={() => setPublicarAgora(false)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium border transition-all ${
                  !publicarAgora
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'border-white/10 text-white/50 hover:border-white/20'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-2" />
                Agendar
              </button>
              <button
                onClick={() => setPublicarAgora(true)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium border transition-all ${
                  publicarAgora
                    ? 'bg-green-500/20 border-green-500/40 text-green-300'
                    : 'border-white/10 text-white/50 hover:border-white/20'
                }`}
              >
                <Zap className="h-4 w-4 inline mr-2" />
                Publicar agora
              </button>
            </div>

            {!publicarAgora && (
              <input
                type="datetime-local"
                value={publicarEm}
                onChange={e => setPublicarEm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              />
            )}
          </div>
        </div>

        <div className="p-6 border-t border-white/5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl py-3 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleAprovar}
            disabled={salvando}
            className="flex-1 rounded-xl py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {salvando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {publicarAgora ? 'Publicar agora' : 'Agendar publicação'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CardConteudo({ item, onAtualizar }: { item: any; onAtualizar: () => void }) {
  const [modalAberto, setModalAberto] = useState(false);

  async function rejeitar() {
    if (!confirm('Rejeitar este conteúdo?')) return;
    await api.post(`/content/${item.id}/rejeitar`, {});
    toast.success('Rejeitado');
    onAtualizar();
  }

  const isGerando = item.status === 'gerando';
  const isPendente = item.status === 'pendente';

  return (
    <>
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 space-y-4 hover:border-white/10 transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {item.tipo === 'video' ? (
                <Video className="h-4 w-4 text-purple-400" />
              ) : (
                <Image className="h-4 w-4 text-cyan-400" />
              )}
              <span className="text-xs text-white/40 uppercase tracking-wider">{item.tipo}</span>
            </div>
            <p className="text-white font-medium text-sm">{item.tema}</p>
          </div>
          <StatusBadge status={item.status} />
        </div>

        {isGerando && (
          <ProgressBar id={item.id} onConcluido={onAtualizar} />
        )}

        {item.cta_keyword && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Comenta "{item.cta_keyword}"</span>
            {item.cta_link && <><Link2 className="h-3.5 w-3.5 ml-1" /><span className="truncate max-w-32">{item.cta_link}</span></>}
          </div>
        )}

        {item.publicar_em && item.status === 'agendado' && (
          <div className="flex items-center gap-2 text-xs text-cyan-400/70">
            <Clock className="h-3.5 w-3.5" />
            <span>Publicar em {new Date(item.publicar_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}

        {isPendente && (
          <div className="flex gap-2 pt-1">
            {item.arquivo_url && (
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL}${item.arquivo_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium bg-white/5 text-white/60 hover:text-white border border-white/5 hover:border-white/10 transition-all"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </a>
            )}
            <button
              onClick={() => setModalAberto(true)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold bg-gradient-to-r from-cyan-600/80 to-blue-600/80 text-white hover:opacity-90 transition-all"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Aprovar e Publicar
            </button>
            <button
              onClick={rejeitar}
              className="rounded-xl px-3 py-2 text-xs bg-white/5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {item.status === 'publicado' && (
          <div className="flex items-center gap-2 text-xs text-green-400/70">
            <Instagram className="h-3.5 w-3.5" />
            <span>Publicado {item.publicado_em ? new Date(item.publicado_em).toLocaleString('pt-BR') : ''}</span>
          </div>
        )}
      </div>

      {modalAberto && (
        <ModalAprovar item={item} onClose={() => setModalAberto(false)} onAprovado={onAtualizar} />
      )}
    </>
  );
}

export default function ContentStudioPage() {
  const [tipo, setTipo] = useState('carrossel');
  const [tema, setTema] = useState('');
  const [tipoTema, setTipoTema] = useState('livre');
  const [ctaKeyword, setCtaKeyword] = useState('EU QUERO');
  const [ctaLink, setCtaLink] = useState('');
  const [gerando, setGerando] = useState(false);
  const [fila, setFila] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregarFila() {
    try {
      const data = await api.get('/content/fila');
      setFila(data);
    } catch { /* ignora */ } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarFila();
    const i = setInterval(carregarFila, 15000);
    return () => clearInterval(i);
  }, []);

  async function handleGerar() {
    if (!tema.trim()) { toast.error('Digite o tema do conteúdo'); return; }
    setGerando(true);
    try {
      await api.post('/content/gerar', {
        tipo, tema: tema.trim(), tipo_tema: tipoTema,
        cta_keyword: ctaKeyword, cta_link: ctaLink,
      });
      toast.success('Geração iniciada! Aparecerá na fila em instantes.');
      setTema('');
      setTimeout(carregarFila, 2000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGerando(false);
    }
  }

  const filaAtiva = fila.filter(i => !['rejeitado', 'publicado'].includes(i.status));
  const historico = fila.filter(i => ['rejeitado', 'publicado'].includes(i.status));

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-cyan-400" />
            Content Studio
          </h1>
          <p className="text-white/50 mt-1 text-sm">
            Gere, aprove e publique conteúdo no Instagram automaticamente
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Painel de geração */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 space-y-5">
              <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Gerar Conteúdo</h2>

              {/* Tipo */}
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTipo(t.id)}
                      className={`rounded-xl p-3 text-left border transition-all ${
                        tipo === t.id
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                          : 'bg-white/[0.02] border-white/5 text-white/50 hover:border-white/10'
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-1.5" />
                      <div className="text-xs font-semibold">{t.label}</div>
                      <div className="text-[11px] opacity-60 mt-0.5">{t.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Tema */}
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider block mb-2">Tema do Conteúdo</label>
                <textarea
                  value={tema}
                  onChange={e => setTema(e.target.value)}
                  rows={3}
                  placeholder="Ex: Como o JARVIS cria sites completos em minutos..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Sugestões */}
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider block mb-2">Sugestões</label>
                <div className="flex flex-wrap gap-2">
                  {TEMAS_SUGERIDOS.map(s => (
                    <button
                      key={s.label}
                      onClick={() => { setTema(s.label); setTipoTema(s.tipo_tema); }}
                      className="rounded-lg px-2.5 py-1 text-xs bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/5 hover:border-white/10 transition-all"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="space-y-3 pt-1 border-t border-white/5">
                <label className="text-xs text-white/50 uppercase tracking-wider block">Automação de Comentário</label>
                <div className="flex gap-2">
                  <input
                    value={ctaKeyword}
                    onChange={e => setCtaKeyword(e.target.value)}
                    className="w-32 bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                    placeholder="EU QUERO"
                  />
                  <input
                    value={ctaLink}
                    onChange={e => setCtaLink(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50"
                    placeholder="https://link-de-destino.com"
                  />
                </div>
              </div>

              <button
                onClick={handleGerar}
                disabled={gerando || !tema.trim()}
                className="w-full rounded-xl py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {gerando ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Gerando...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Gerar Conteúdo</>
                )}
              </button>
            </div>
          </div>

          {/* Fila de aprovação */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                Fila de Aprovação
                {filaAtiva.length > 0 && (
                  <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">{filaAtiva.length}</span>
                )}
              </h2>
              <button onClick={carregarFila} className="text-white/30 hover:text-white/60 transition-all">
                <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {filaAtiva.length === 0 && !carregando ? (
              <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-12 text-center">
                <Sparkles className="h-8 w-8 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Nenhum conteúdo na fila</p>
                <p className="text-white/20 text-xs mt-1">Gere algo ao lado para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filaAtiva.map(item => (
                  <CardConteudo key={item.id} item={item} onAtualizar={carregarFila} />
                ))}
              </div>
            )}

            {historico.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs text-white/30 uppercase tracking-wider mb-3">Histórico</h3>
                <div className="space-y-2">
                  {historico.slice(0, 5).map(item => (
                    <div key={item.id} className="rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.tipo === 'video' ? <Video className="h-3.5 w-3.5 text-white/20 shrink-0" /> : <Image className="h-3.5 w-3.5 text-white/20 shrink-0" />}
                        <span className="text-xs text-white/40 truncate">{item.tema}</span>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
