'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Copy, Check, Loader2, Instagram, MessageSquare, Monitor, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition shrink-0">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-white/30 uppercase tracking-wide">{label}</div>
      <div className="flex items-start gap-2 bg-white/5 rounded-lg px-3 py-2">
        <span className="text-sm text-white/80 flex-1 leading-relaxed">{valor}</span>
        <CopyButton text={valor} />
      </div>
    </div>
  );
}

const SEGMENTOS = [
  { value: 'geral', label: 'Geral (todos os nichos)' },
  { value: 'salao', label: 'Salão de beleza / Barbearia' },
  { value: 'clinica', label: 'Clínica / Consultório' },
  { value: 'restaurante', label: 'Restaurante / Delivery' },
  { value: 'petshop', label: 'Pet Shop / Veterinário' },
  { value: 'academia', label: 'Academia / Personal' },
  { value: 'ecommerce', label: 'E-commerce / Loja online' },
];

const ANGULOS = [
  { value: '', label: 'Escolher automaticamente' },
  { value: 'perder vendas por falta de atendimento rápido no WhatsApp', label: 'Perder vendas por demora no WhatsApp' },
  { value: 'atendente humano caro, cansado e limitado a horário comercial', label: 'Custo alto de atendente humano' },
  { value: 'clientes abandonam quando não são respondidos em minutos', label: 'Cliente abandona sem resposta rápida' },
  { value: 'dificuldade de escalar atendimento sem contratar mais funcionários', label: 'Não consegue escalar atendimento' },
  { value: 'concorrentes já usando IA e saindo na frente', label: 'Concorrência usando IA' },
  { value: 'WhatsApp cheio de mensagens sem organização ou follow-up', label: 'WhatsApp desorganizado' },
];

export default function MarketingPage() {
  const [form, setForm] = useState({
    segmento_alvo: 'geral',
    promocao: 'teste grátis por 7 dias, sem cartão de crédito',
    angulo: '',
    tom: 'profissional_amigavel',
    objetivo: 'captar_leads',
  });
  const [gerando, setGerando] = useState(false);
  const [criativos, setCriativos] = useState<any>(null);
  const [modelo, setModelo] = useState('');
  const [modeloImagem, setModeloImagem] = useState('');
  const [tabAtiva, setTabAtiva] = useState('instagram');

  async function gerar() {
    setGerando(true);
    setCriativos(null);
    try {
      const r = await api.gerarCriativos('jarvis', form);
      setCriativos(r.criativos);
      setModelo(r.modelo || '');
      setModeloImagem(r.modelo_imagem || '');
      toast.success('Criativos gerados!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGerando(false);
    }
  }

  const tabs = [
    { id: 'instagram', label: 'Instagram', icon: Instagram },
    { id: 'stories', label: 'Stories', icon: Instagram },
    { id: 'carrossel', label: 'Carrossel', icon: Instagram },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'meta', label: 'Meta Ads', icon: Monitor },
    { id: 'google', label: 'Google Ads', icon: Search },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-pink-500/20 ring-1 ring-pink-500/30 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Criativos de Marketing</h1>
              <p className="text-white/40 text-sm">Gere copies prontos para divulgar o JARVIS em todos os canais.</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-5 space-y-4">
              <h2 className="font-semibold text-white text-sm">Briefing da campanha</h2>

              <div>
                <label className="label">Nicho / segmento-alvo</label>
                <select value={form.segmento_alvo} onChange={e => setForm({ ...form, segmento_alvo: e.target.value })} className="input">
                  {SEGMENTOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Ângulo / dor principal</label>
                <select value={form.angulo} onChange={e => setForm({ ...form, angulo: e.target.value })} className="input">
                  {ANGULOS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Promoção / oferta</label>
                <input
                  value={form.promocao}
                  onChange={e => setForm({ ...form, promocao: e.target.value })}
                  placeholder="Ex: 7 dias grátis, sem cartão..."
                  className="input"
                />
              </div>

              <div>
                <label className="label">Tom de comunicação</label>
                <select value={form.tom} onChange={e => setForm({ ...form, tom: e.target.value })} className="input">
                  <option value="profissional_amigavel">Profissional e acessível</option>
                  <option value="descontraido">Descontraído / Startup</option>
                  <option value="urgente">Urgente / Escassez</option>
                  <option value="divertido">Irreverente / Bem-humorado</option>
                </select>
              </div>

              <div>
                <label className="label">Objetivo</label>
                <select value={form.objetivo} onChange={e => setForm({ ...form, objetivo: e.target.value })} className="input">
                  <option value="captar_leads">Captar leads (teste grátis)</option>
                  <option value="gerar_vendas">Converter em venda direta</option>
                  <option value="reconhecimento">Reconhecimento de marca</option>
                  <option value="reativar">Reengajar leads frios</option>
                </select>
              </div>

              <button onClick={gerar} disabled={gerando}
                className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 text-white py-3 rounded-xl font-medium transition disabled:opacity-50">
                {gerando
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando criativos...</>
                  : <><Sparkles className="h-4 w-4" /> Gerar criativos</>}
              </button>
            </div>

            {/* Dica */}
            <div className="rounded-xl bg-pink-500/5 border border-pink-500/10 p-4 text-xs text-white/40 leading-relaxed">
              💡 <strong className="text-white/60">Dica:</strong> Gere variações mudando o nicho e o ângulo para ter copies para diferentes públicos e testes A/B.
            </div>
          </div>

          {/* Resultado */}
          <div className="lg:col-span-3">
            {gerando && (
              <div className="card p-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="h-12 w-12 rounded-2xl bg-pink-500/20 flex items-center justify-center animate-pulse">
                  <Sparkles className="h-6 w-6 text-pink-400" />
                </div>
                <div className="text-white/60 text-sm">IA escrevendo seus criativos...</div>
              </div>
            )}

            {!gerando && !criativos && (
              <div className="card p-12 text-center text-white/20 text-sm">
                Configure o briefing e clique em <strong className="text-white/40">Gerar criativos</strong>
              </div>
            )}

            {criativos && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-white/20">
                  {modelo && <span>Texto: {modelo}</span>}
                  {modeloImagem && <span>Imagem: {modeloImagem}</span>}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-white/5 pb-2 flex-wrap">
                  {tabs.map(t => {
                    const Icon = t.icon;
                    return (
                      <button key={t.id} onClick={() => setTabAtiva(t.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${tabAtiva === t.id ? 'bg-pink-500/20 text-pink-300' : 'text-white/40 hover:text-white'}`}>
                        <Icon className="h-3.5 w-3.5" />{t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Instagram Feed */}
                {tabAtiva === 'instagram' && criativos.instagram_feed && (
                  <div className="space-y-3">
                    <Campo label="Caption" valor={criativos.instagram_feed.caption} />
                    <Campo label="Hashtags" valor={criativos.instagram_feed.hashtags?.join(' ') || ''} />
                    <Campo label="Call to Action" valor={criativos.instagram_feed.cta} />
                    {criativos.instagram_feed.descricao_publicacao && (
                      <Campo label="📋 Publicação pronta (copiar e colar)" valor={criativos.instagram_feed.descricao_publicacao} />
                    )}
                  </div>
                )}

                {/* Stories */}
                {tabAtiva === 'stories' && criativos.instagram_stories && (
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-gradient-to-br from-pink-600 via-purple-600 to-blue-600 p-6 text-center space-y-3 aspect-[9/16] max-h-80 flex flex-col items-center justify-center">
                      <div className="text-2xl font-black text-white leading-tight">{criativos.instagram_stories.texto_principal}</div>
                      <div className="text-white/80 text-sm">{criativos.instagram_stories.subtexto}</div>
                      <div className="mt-4 bg-white text-purple-700 font-bold rounded-full px-6 py-2 text-sm">{criativos.instagram_stories.cta_stories}</div>
                    </div>
                    <Campo label="Texto principal" valor={criativos.instagram_stories.texto_principal} />
                    <Campo label="Subtexto" valor={criativos.instagram_stories.subtexto} />
                    <Campo label="Botão CTA" valor={criativos.instagram_stories.cta_stories} />
                  </div>
                )}

                {/* Carrossel */}
                {tabAtiva === 'carrossel' && criativos.carrossel && (
                  <div className="space-y-4">
                    {criativos.carrossel.titulo_capa && (
                      <div className="rounded-2xl bg-gradient-to-br from-brand-600 via-purple-600 to-pink-600 p-6 text-center">
                        <div className="text-xs text-white/60 mb-2 uppercase tracking-wider">Capa do carrossel</div>
                        <div className="text-2xl font-black text-white">{criativos.carrossel.titulo_capa}</div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {criativos.carrossel.slides?.map((slide: any, i: number) => (
                        <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-lg bg-pink-500/20 text-pink-400 text-xs font-bold flex items-center justify-center shrink-0">
                              {slide.numero}
                            </div>
                            <div className="flex-1 space-y-1.5">
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-semibold text-white flex-1">{slide.titulo}</span>
                                <CopyButton text={`${slide.titulo}\n\n${slide.texto}`} />
                              </div>
                              <div className="text-xs text-white/50 leading-relaxed">{slide.texto}</div>
                              {slide.elemento_visual && (
                                <div className="text-xs text-pink-400/70 italic">🎨 {slide.elemento_visual}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {criativos.carrossel.descricao_publicacao && (
                      <Campo label="📋 Legenda do carrossel (copiar e colar)" valor={criativos.carrossel.descricao_publicacao} />
                    )}
                  </div>
                )}

                {/* WhatsApp */}
                {tabAtiva === 'whatsapp' && criativos.whatsapp_broadcast && (
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-[#075E54] p-4">
                      <div className="bg-white/10 rounded-xl p-3 text-sm text-white leading-relaxed whitespace-pre-wrap">
                        {criativos.whatsapp_broadcast.mensagem}
                      </div>
                    </div>
                    <Campo label="Mensagem completa" valor={criativos.whatsapp_broadcast.mensagem} />
                    <Campo label="Prévia / Assunto" valor={criativos.whatsapp_broadcast.assunto} />
                  </div>
                )}

                {/* Meta Ads */}
                {tabAtiva === 'meta' && criativos.meta_ads && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                      <div className="bg-white/10 h-28 flex items-center justify-center text-white/20 text-xs">
                        {criativos.sugestao_imagem}
                      </div>
                      <div className="p-3 space-y-1">
                        <div className="text-xs text-white/30">Publicidade · JARVIS IA</div>
                        <div className="font-bold text-white text-sm">{criativos.meta_ads.headline}</div>
                        <div className="text-xs text-white/60">{criativos.meta_ads.texto_principal}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-white/30">{criativos.meta_ads.descricao}</span>
                          <span className="text-xs bg-blue-600 text-white rounded px-2 py-0.5">{criativos.meta_ads.cta_botao?.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    </div>
                    <Campo label="Headline" valor={criativos.meta_ads.headline} />
                    <Campo label="Texto principal" valor={criativos.meta_ads.texto_principal} />
                    <Campo label="Descrição" valor={criativos.meta_ads.descricao} />
                    <Campo label="Botão" valor={criativos.meta_ads.cta_botao} />
                  </div>
                )}

                {/* Google Ads */}
                {tabAtiva === 'google' && criativos.google_ads && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-white p-4 space-y-1">
                      <div className="text-xs text-green-700">Anúncio · jarvis.ai</div>
                      <div className="text-blue-800 font-semibold text-base">
                        {criativos.google_ads.titulo1} | {criativos.google_ads.titulo2} | {criativos.google_ads.titulo3}
                      </div>
                      <div className="text-sm text-gray-600">{criativos.google_ads.descricao1}</div>
                      <div className="text-sm text-gray-600">{criativos.google_ads.descricao2}</div>
                    </div>
                    <Campo label="Título 1" valor={criativos.google_ads.titulo1} />
                    <Campo label="Título 2" valor={criativos.google_ads.titulo2} />
                    <Campo label="Título 3" valor={criativos.google_ads.titulo3} />
                    <Campo label="Descrição 1" valor={criativos.google_ads.descricao1} />
                    <Campo label="Descrição 2" valor={criativos.google_ads.descricao2} />
                  </div>
                )}

                {/* Imagem gerada */}
                {criativos.imagem_url && (
                  <div className="rounded-xl overflow-hidden border border-white/10">
                    <img src={criativos.imagem_url} alt="Criativo gerado por IA" className="w-full object-cover" />
                    <div className="bg-white/5 px-3 py-2 flex items-center justify-between">
                      <span className="text-xs text-white/30">Imagem gerada por IA</span>
                      <a href={criativos.imagem_url} download="jarvis-criativo.png" target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 transition">
                        <Download className="h-3 w-3" /> Download
                      </a>
                    </div>
                  </div>
                )}

                {/* Sugestão de imagem */}
                {criativos.sugestao_imagem && (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="text-xs text-white/30 mb-1">💡 {criativos.imagem_url ? 'Prompt da imagem' : 'Sugestão de imagem'}</div>
                    <div className="text-sm text-white/70">{criativos.sugestao_imagem}</div>
                  </div>
                )}

                {/* Copiar tudo */}
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(criativos, null, 2)); toast.success('JSON copiado!'); }}
                  className="w-full flex items-center justify-center gap-2 border border-white/10 text-white/40 hover:text-white py-2 rounded-xl text-sm transition">
                  <Copy className="h-3.5 w-3.5" /> Copiar todos os criativos (JSON)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
