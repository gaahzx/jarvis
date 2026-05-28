'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Zap, Clock, TrendingUp, Shield, Star, CheckCircle2, ChevronDown, Bot, ArrowRight, Sparkles, Users, BarChart3, Calendar } from 'lucide-react';

const WA_LINK = 'https://wa.me/5518991301092?text=Ol%C3%A1%21+Quero+contratar+a+Ana%2C+a+IA+de+atendimento.';

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const step = target / 60;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, 25);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{count}{suffix}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left gap-4 hover:bg-white/[0.03] transition">
        <span className="font-medium text-white">{q}</span>
        <ChevronDown className={`h-5 w-5 text-white/40 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 text-white/60 text-sm leading-relaxed">{a}</div>}
    </div>
  );
}

const depoimentos = [
  { nome: 'Camila R.', negocio: 'Studio de EstÃ©tica', texto: 'A Ana responde meus clientes 24h. Reduzi faltas em 60% com os lembretes automÃ¡ticos e nunca mais perdi agendamento por demora na resposta.' },
  { nome: 'Dr. Felipe M.', negocio: 'ClÃ­nica OdontolÃ³gica', texto: 'Implantamos em menos de 1 hora. A IA jÃ¡ vem treinada para clÃ­nica, entende convÃªnio, agenda consultas e escala pro humano quando precisa.' },
  { nome: 'Rafaela S.', negocio: 'Pet Shop & Vet', texto: 'Meus clientes adoram a Ana. Ela faz orÃ§amento de banho e tosa, manda lembrete de vacina e ainda avisa quando temos promoÃ§Ã£o. IncrÃ­vel.' },
];

const recursos = [
  { icon: Clock, titulo: 'Atendimento 24/7', texto: 'Seus clientes recebem resposta imediata, qualquer hora do dia â€” inclusive madrugada, finais de semana e feriados.', cor: 'blue' },
  { icon: Calendar, titulo: 'Agenda AutomÃ¡tica', texto: 'A Ana agenda, confirma e reagenda horÃ¡rios direto no WhatsApp. Envia lembrete 24h antes e reduz faltas em atÃ© 60%.', cor: 'purple' },
  { icon: Users, titulo: 'EscalaÃ§Ã£o Inteligente', texto: 'Quando o assunto exige um humano, ela transfere com um resumo completo da conversa. Zero ruÃ­do, atendimento fluido.', cor: 'pink' },
  { icon: BarChart3, titulo: 'MÃ©tricas e Funil', texto: 'Painel completo com histÃ³rico de conversas, taxa de resoluÃ§Ã£o, satisfaÃ§Ã£o do cliente e consumo de IA em tempo real.', cor: 'emerald' },
  { icon: Shield, titulo: 'Treinada pro Seu Nicho', texto: 'ConfiguraÃ§Ã£o com FAQ, serviÃ§os, horÃ¡rios e tom de voz da sua empresa. A Ana fala exatamente como vocÃª quer.', cor: 'amber' },
  { icon: Sparkles, titulo: 'Aprende com o Tempo', texto: 'Cada escalaÃ§Ã£o vira aprendizado. A IA sugere respostas para o FAQ e melhora com o histÃ³rico de atendimento.', cor: 'rose' },
];


export default function LandingAna() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Gradientes de fundo */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-500/8 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5' : ''}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-brand-500/20 ring-1 ring-brand-500/40 flex items-center justify-center">
              <Bot className="h-4 w-4 text-brand-400" />
            </div>
            <span className="font-bold text-white text-lg">Ana IA</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#recursos" className="hover:text-white transition">Recursos</a>
            <a href="#como-funciona" className="hover:text-white transition">Como funciona</a>
            <a href="#planos" className="hover:text-white transition">Planos</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </div>
          <a href={WA_LINK} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
            <MessageCircle className="h-4 w-4" /> Contratar Ana
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-sm text-brand-300 font-medium">
            <Zap className="h-3.5 w-3.5" /> IA de atendimento para WhatsApp
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight">
            ConheÃ§a a{' '}
            <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Ana
            </span>
            <br />sua atendente virtual
          </h1>

          <p className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
            IA treinada para o seu negÃ³cio que responde clientes, agenda horÃ¡rios e nunca deixa uma venda escapar â€” <strong className="text-white/80">24h por dia, 7 dias por semana.</strong>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a href={WA_LINK} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-green-900/30">
              <MessageCircle className="h-5 w-5" />
              Quero testar grÃ¡tis por 7 dias
            </a>
            <a href="#como-funciona"
              className="flex items-center gap-2 text-white/50 hover:text-white transition text-sm font-medium">
              Ver como funciona <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <p className="text-xs text-white/30">Sem cartÃ£o de crÃ©dito Â· ConfiguraÃ§Ã£o em menos de 1 hora Â· Cancele quando quiser</p>
        </div>

        {/* Mockup chat */}
        <div className="mt-16 max-w-sm mx-auto">
          <div className="rounded-3xl bg-[#111] border border-white/10 overflow-hidden shadow-2xl shadow-black/50">
            <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-brand-500/30 ring-2 ring-brand-400/40 flex items-center justify-center">
                <Bot className="h-5 w-5 text-brand-300" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm">Ana</div>
                <div className="text-[11px] text-green-300/80">â— Online agora</div>
              </div>
            </div>
            <div className="p-4 space-y-3 bg-[#0a0a0a]">
              {[
                { msg: 'Oi! Quero agendar um horÃ¡rio', side: 'right' },
                { msg: 'OlÃ¡! ðŸ˜Š Temos horÃ¡rios disponÃ­veis amanhÃ£ Ã s 14h, 15h e 17h. Qual prefere?', side: 'left' },
                { msg: '15h estÃ¡ Ã³timo!', side: 'right' },
                { msg: 'Perfeito! âœ… Agendado para amanhÃ£ Ã s 15h. VocÃª receberÃ¡ um lembrete 24h antes!', side: 'left' },
              ].map((item, i) => (
                <div key={i} className={`flex ${item.side === 'right' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                    item.side === 'right'
                      ? 'bg-[#005C4B] text-white rounded-tr-sm'
                      : 'bg-[#1f1f1f] text-white/90 rounded-tl-sm'
                  }`}>
                    {item.msg}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NÃºmeros */}
      <section className="py-16 px-6 border-y border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { n: 98, s: '%', label: 'taxa de resoluÃ§Ã£o automÃ¡tica' },
            { n: 60, s: '%', label: 'menos faltas com lembretes' },
            { n: 24, s: 'h', label: 'disponÃ­vel por dia' },
            { n: 3, s: 'min', label: 'tempo mÃ©dio de resposta' },
          ].map((item, i) => (
            <div key={i}>
              <div className="text-4xl font-black text-white">
                <AnimatedCounter target={item.n} suffix={item.s} />
              </div>
              <div className="text-sm text-white/40 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-3">Tudo que sua empresa precisa</h2>
            <p className="text-white/40 text-lg">A Ana nÃ£o Ã© sÃ³ um chatbot â€” Ã© uma atendente completa.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recursos.map((r, i) => {
              const Icon = r.icon;
              const cores: Record<string, string> = {
                blue: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
                purple: 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
                pink: 'bg-pink-500/10 text-pink-400 ring-pink-500/20',
                emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
                amber: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
                rose: 'bg-rose-500/10 text-rose-400 ring-rose-500/20',
              };
              return (
                <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/8 p-6 space-y-4 hover:border-white/15 transition">
                  <div className={`h-11 w-11 rounded-xl ring-1 flex items-center justify-center ${cores[r.cor]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-white mb-1">{r.titulo}</div>
                    <div className="text-sm text-white/50 leading-relaxed">{r.texto}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-3">Funcionando em menos de 1 hora</h2>
            <p className="text-white/40 text-lg">Sem tÃ©cnico, sem programador, sem complicaÃ§Ã£o.</p>
          </div>
          <div className="space-y-6">
            {[
              { n: '01', titulo: 'Conecte seu WhatsApp', texto: 'Leia o QR code no painel e sua linha estÃ¡ pronta. Funciona com qualquer nÃºmero â€” nÃ£o precisa de API oficial do Meta.' },
              { n: '02', titulo: 'Configure a identidade da Ana', texto: 'Informe o nome do negÃ³cio, horÃ¡rios, serviÃ§os, FAQ e o tom de voz. O assistente fica com a cara da sua empresa.' },
              { n: '03', titulo: 'Ative e relaxe', texto: 'A Ana comeÃ§a a atender imediatamente. VocÃª acompanha tudo pelo painel â€” conversas, agendamentos e mÃ©tricas em tempo real.' },
            ].map((step, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="shrink-0 h-12 w-12 rounded-2xl bg-brand-500/15 ring-1 ring-brand-500/30 flex items-center justify-center font-black text-brand-400 text-sm">
                  {step.n}
                </div>
                <div className="pt-1">
                  <div className="font-semibold text-white mb-1">{step.titulo}</div>
                  <div className="text-white/50 text-sm leading-relaxed">{step.texto}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <a href={WA_LINK} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105">
              <MessageCircle className="h-5 w-5" /> ComeÃ§ar agora â€” grÃ¡tis por 7 dias
            </a>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-3">Quem jÃ¡ usa a Ana</h2>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />)}
              <span className="text-white/50 text-sm ml-2">4.9 / 5 de mÃ©dia</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {depoimentos.map((d, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/8 p-6 space-y-4">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-white/70 text-sm leading-relaxed">"{d.texto}"</p>
                <div>
                  <div className="font-semibold text-white text-sm">{d.nome}</div>
                  <div className="text-white/40 text-xs">{d.negocio}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PreÃ§o Ãºnico */}
      <section id="planos" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-white mb-3">PreÃ§o simples e Ãºnico</h2>
            <p className="text-white/40 text-lg">Sem planos confusos. Tudo incluso, sem surpresas.</p>
          </div>

          <div className="relative rounded-3xl border border-brand-500/40 bg-brand-500/8 ring-1 ring-brand-500/20 p-10 space-y-8">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-purple-500 text-white text-xs font-bold px-5 py-1.5 rounded-full">
              TUDO INCLUSO
            </div>

            {/* PreÃ§o */}
            <div>
              <div className="text-white/50 text-sm mb-2">apenas</div>
              <div className="flex items-end justify-center gap-2">
                <span className="text-white/50 text-2xl font-bold mb-1">R$</span>
                <span className="text-8xl font-black text-white leading-none">197</span>
                <span className="text-white/50 text-xl mb-2">/mÃªs</span>
              </div>
              <p className="text-white/40 text-sm mt-3">Cancele quando quiser Â· Sem fidelidade Â· Sem taxa de adesÃ£o</p>
            </div>

            {/* Recursos em 2 colunas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {[
                'WhatsApp conectado ilimitado',
                'Atendimento por IA 24h/7 dias',
                'Agendamento automÃ¡tico',
                'Lembretes de confirmaÃ§Ã£o',
                'EscalaÃ§Ã£o para humano',
                'Painel de mÃ©tricas completo',
                'FAQ e treinamento da IA',
                'RelatÃ³rio semanal automÃ¡tico',
                'HistÃ³rico de conversas',
                'Suporte pelo WhatsApp',
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-white/70">
                  <CheckCircle2 className="h-4 w-4 text-brand-400 shrink-0" />
                  {r}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="space-y-3">
              <a href={WA_LINK} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-3 w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] shadow-lg shadow-green-900/30">
                <MessageCircle className="h-5 w-5" />
                ComeÃ§ar agora â€” 7 dias grÃ¡tis
              </a>
              <p className="text-white/30 text-xs">Sem cartÃ£o de crÃ©dito para o teste gratuito</p>
            </div>
          </div>

          {/* Comparativo custo */}
          <div className="mt-10 rounded-2xl bg-white/[0.03] border border-white/8 p-6">
            <div className="text-sm text-white/50 mb-4 font-medium">Compare o custo com um atendente humano</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="text-3xl font-black text-red-400">R$ 2.000+</div>
                <div className="text-xs text-white/40">atendente humano/mÃªs<br />(salÃ¡rio + encargos)</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-3xl font-black text-brand-400">R$ 197</div>
                <div className="text-xs text-white/40">Ana IA/mÃªs<br />(24h, 7 dias, ilimitado)</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-white/30 border-t border-white/5 pt-4">
              Economia de mais de <strong className="text-white/60">R$ 1.800 por mÃªs</strong> com atendimento ainda mais rÃ¡pido
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-12">Perguntas frequentes</h2>
          <div className="space-y-3">
            <FaqItem q="Precisa de API oficial do WhatsApp?" a="NÃ£o. A Ana funciona com qualquer nÃºmero de WhatsApp â€” basta fazer a leitura do QR code no painel, como se fosse o WhatsApp Web. Mais simples e sem burocracia." />
            <FaqItem q="Quanto tempo leva para configurar?" a="Em mÃ©dia 30 a 60 minutos. O painel Ã© intuitivo e jÃ¡ vem com sugestÃµes prontas para o seu segmento. Sem precisar de TI ou programador." />
            <FaqItem q="A Ana funciona para qualquer tipo de negÃ³cio?" a="Sim. Temos templates prontos para salÃµes, clÃ­nicas, restaurantes, pet shops, academias e e-commerce. Para outros segmentos, a configuraÃ§Ã£o manual Ã© igualmente simples." />
            <FaqItem q="O que acontece quando a IA nÃ£o sabe responder?" a="Ela escala automaticamente para um atendente humano com um resumo completo da conversa. O cliente nunca fica sem resposta." />
            <FaqItem q="Posso cancelar a qualquer momento?" a="Sim. Sem fidelidade, sem multa. Cancele pelo painel ou pelo WhatsApp e o serviÃ§o encerra no fim do perÃ­odo pago." />
            <FaqItem q="Os dados dos meus clientes ficam seguros?" a="Todos os dados sÃ£o armazenados em servidor seguro no Brasil. NÃ£o compartilhamos informaÃ§Ãµes com terceiros." />
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl bg-gradient-to-br from-brand-500/15 via-purple-500/10 to-pink-500/10 border border-brand-500/20 p-12 space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-brand-500/20 ring-1 ring-brand-500/30 flex items-center justify-center mx-auto">
              <Bot className="h-8 w-8 text-brand-400" />
            </div>
            <h2 className="text-4xl font-black text-white">
              Sua empresa aberta<br />
              <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
                para sempre
              </span>
            </h2>
            <p className="text-white/50 text-lg leading-relaxed">
              Pare de perder clientes por falta de resposta. A Ana atende, agenda e vende enquanto vocÃª descansa.
            </p>
            <a href={WA_LINK} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all hover:scale-105 shadow-xl shadow-green-900/30">
              <MessageCircle className="h-6 w-6" />
              Contratar agora
            </a>
            <div className="text-white/30 text-sm">Configuração inclusa · Sem fidelidade · Suporte pelo WhatsApp</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-brand-400" />
            <span className="font-semibold text-white/50">Ana IA</span>
            <span>â€” Atendimento inteligente via WhatsApp</span>
          </div>
          <div className="flex items-center gap-6">
            <a href={WA_LINK} target="_blank" rel="noreferrer" className="hover:text-white transition flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" /> Fale conosco
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}


