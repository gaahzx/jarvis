'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Check, Building2, Bot, Clock, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

const STEPS = [
  { id: 1, label: 'Dados da empresa', icon: Building2 },
  { id: 2, label: 'Personalidade da IA', icon: Bot },
  { id: 3, label: 'Horários', icon: Clock },
  { id: 4, label: 'Concluir', icon: Check },
];

const SEGMENTOS_PRESET = [
  { key: 'salao', label: '💇 Salão de Beleza' },
  { key: 'barbearia', label: '💈 Barbearia' },
  { key: 'estetica', label: '✨ Estética / Spa' },
  { key: 'clinica', label: '🏥 Clínica / Saúde' },
  { key: 'odontologia', label: '🦷 Odontologia' },
  { key: 'psicologia', label: '🧠 Psicologia / Terapia' },
  { key: 'nutricionista', label: '🥗 Nutrição' },
  { key: 'fisioterapia', label: '🦴 Fisioterapia' },
  { key: 'restaurante', label: '🍽️ Restaurante' },
  { key: 'petshop', label: '🐾 Pet Shop / Veterinária' },
  { key: 'academia', label: '💪 Academia / Fitness' },
  { key: 'imobiliaria', label: '🏠 Imobiliária' },
  { key: 'investimento_imobiliario', label: '📈 Investimento Imobiliário' },
  { key: 'advocacia', label: '⚖️ Advocacia' },
  { key: 'contabilidade', label: '📊 Contabilidade' },
  { key: 'consultoria', label: '💼 Consultoria' },
  { key: 'farmacia', label: '💊 Farmácia' },
  { key: 'otica', label: '👓 Ótica' },
  { key: 'educacao', label: '📚 Escola / Curso' },
  { key: 'automotivo', label: '🚗 Automotivo / Mecânica' },
  { key: 'moda', label: '👗 Moda / Vestuário' },
  { key: 'ecommerce', label: '🛍️ Loja / E-commerce' },
];

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function NovaEmpresaPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [segmentoSelecionado, setSegmentoSelecionado] = useState('');

  const [dados, setDados] = useState({ nome_fantasia: '', segmento: '', email_contato: '', telefone: '', whatsapp_humano: '', plano: 'basico' });
  const [identidade, setIdentidade] = useState({ nome_assistente: 'Assistente', tom_voz: 'profissional_amigavel', usa_emojis: true, estilo_resposta: 'medio' });
  const [horarios, setHorarios] = useState(
    Array.from({ length: 7 }, (_, i) => ({
      dia_semana: i,
      fechado: i === 0 || i === 6,
      abre: '09:00',
      fecha: '18:00',
    }))
  );

  function toggleDia(idx: number) {
    setHorarios(h => h.map((d, i) => i === idx ? { ...d, fechado: !d.fechado } : d));
  }

  function setHorario(idx: number, campo: 'abre' | 'fecha', val: string) {
    setHorarios(h => h.map((d, i) => i === idx ? { ...d, [campo]: val } : d));
  }

  async function criarEmpresa() {
    if (!dados.nome_fantasia.trim()) return toast.error('Nome é obrigatório');
    setLoading(true);
    try {
      const emp = await api.createEmpresa({ ...dados, segmento: dados.segmento || segmentoSelecionado });
      setEmpresaId(emp.id);
      // Aplicar template se segmento preset selecionado
      if (segmentoSelecionado) {
        await api.aplicarTemplate(emp.id, segmentoSelecionado).catch(() => {});
      }
      setStep(2);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  async function salvarIdentidade() {
    if (!empresaId) return;
    setLoading(true);
    try {
      await api.updateIdentidade(empresaId, identidade);
      setStep(3);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  async function salvarHorarios() {
    if (!empresaId) return;
    setLoading(true);
    try {
      await api.updateHorarios(empresaId, horarios);
      setStep(4);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <h1 className="mb-2 text-3xl font-bold text-white">Nova empresa</h1>
        <p className="mb-6 text-white/50">Configure em 4 passos simples.</p>

        {/* Progress */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = s.id === step;
            const done = s.id < step;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  active ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30' :
                  done ? 'text-emerald-400' : 'text-white/30'
                }`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`h-px flex-1 mx-1 ${done ? 'bg-emerald-500/40' : 'bg-white/10'}`} />}
              </div>
            );
          })}
        </div>

        <div className="card p-8 space-y-5">
          {/* STEP 1: Dados */}
          {step === 1 && (
            <>
              <h2 className="font-bold text-white text-lg">Dados da empresa</h2>

              <div>
                <label className="label">Nome fantasia *</label>
                <input value={dados.nome_fantasia} onChange={e => setDados({ ...dados, nome_fantasia: e.target.value })} placeholder="Ex: Clínica Vida" className="input" />
              </div>

              <div>
                <label className="label mb-2">Segmento — escolha um preset (opcional)</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {SEGMENTOS_PRESET.map(s => (
                    <button key={s.key} type="button"
                      onClick={() => { setSegmentoSelecionado(s.key === segmentoSelecionado ? '' : s.key); setDados(d => ({ ...d, segmento: s.label.replace(/^[^\s]+ /, '') })); }}
                      className={`text-sm px-2 py-2 rounded-lg border transition text-left ${segmentoSelecionado === s.key ? 'bg-brand-500/20 border-brand-500/40 text-brand-300' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                    >{s.label}</button>
                  ))}
                </div>
                <input value={dados.segmento} onChange={e => setDados({ ...dados, segmento: e.target.value })} placeholder="Ou escreva o segmento..." className="input" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">E-mail</label><input type="email" value={dados.email_contato} onChange={e => setDados({ ...dados, email_contato: e.target.value })} placeholder="contato@empresa.com" className="input" /></div>
                <div><label className="label">Telefone</label><input value={dados.telefone} onChange={e => setDados({ ...dados, telefone: e.target.value })} placeholder="(11) 99999-9999" className="input" /></div>
              </div>

              <div><label className="label">WhatsApp do humano (para escalações)</label><input value={dados.whatsapp_humano} onChange={e => setDados({ ...dados, whatsapp_humano: e.target.value })} placeholder="5511999999999" className="input" /></div>

              <div><label className="label">Plano</label>
                <select value={dados.plano} onChange={e => setDados({ ...dados, plano: e.target.value })} className="input">
                  <option value="basico">Básico — R$ 397/mês</option>
                  <option value="pro">Pro — R$ 697/mês</option>
                  <option value="premium">Premium — R$ 1.297/mês</option>
                </select>
              </div>

              <button onClick={criarEmpresa} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" /> Continuar</>}
              </button>
            </>
          )}

          {/* STEP 2: Identidade IA */}
          {step === 2 && (
            <>
              <h2 className="font-bold text-white text-lg">Personalidade da IA</h2>
              <p className="text-sm text-white/40">
                {segmentoSelecionado ? '✅ Template aplicado automaticamente! Você pode ajustar abaixo.' : 'Configure como a IA vai se comunicar.'}
              </p>

              <div><label className="label">Nome do assistente</label><input value={identidade.nome_assistente} onChange={e => setIdentidade({ ...identidade, nome_assistente: e.target.value })} className="input" /></div>

              <div><label className="label">Tom de voz</label>
                <select value={identidade.tom_voz} onChange={e => setIdentidade({ ...identidade, tom_voz: e.target.value })} className="input">
                  <option value="profissional_amigavel">Profissional e amigável</option>
                  <option value="descontraido_amigavel">Descontraído e amigável</option>
                  <option value="formal">Formal</option>
                  <option value="energetico">Enérgico / Animado</option>
                </select>
              </div>

              <div><label className="label">Estilo de resposta</label>
                <select value={identidade.estilo_resposta} onChange={e => setIdentidade({ ...identidade, estilo_resposta: e.target.value })} className="input">
                  <option value="curto">Curto (1 linha)</option>
                  <option value="medio">Médio (2-3 frases)</option>
                  <option value="longo">Detalhado</option>
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setIdentidade(i => ({ ...i, usa_emojis: !i.usa_emojis }))} className={`relative w-10 h-5 rounded-full transition-colors ${identidade.usa_emojis ? 'bg-brand-500' : 'bg-white/10'}`}>
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${identidade.usa_emojis ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-white/70">Usar emojis</span>
              </label>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Voltar</button>
                <button onClick={salvarIdentidade} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" /> Continuar</>}
                </button>
              </div>
            </>
          )}

          {/* STEP 3: Horários */}
          {step === 3 && (
            <>
              <h2 className="font-bold text-white text-lg">Horários de funcionamento</h2>
              <p className="text-sm text-white/40">A IA bloqueia atendimento fora do horário automaticamente.</p>

              <div className="space-y-2">
                {horarios.map((h, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <button onClick={() => toggleDia(i)} className={`w-10 h-10 rounded-lg text-xs font-bold transition ${!h.fechado ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30' : 'bg-white/5 text-white/30'}`}>
                      {DIAS[i]}
                    </button>
                    {!h.fechado ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" value={h.abre} onChange={e => setHorario(i, 'abre', e.target.value)} className="input w-28 text-sm py-1.5" />
                        <span className="text-white/30 text-sm">até</span>
                        <input type="time" value={h.fecha} onChange={e => setHorario(i, 'fecha', e.target.value)} className="input w-28 text-sm py-1.5" />
                      </div>
                    ) : (
                      <span className="text-xs text-white/30 flex-1">Fechado</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Voltar</button>
                <button onClick={salvarHorarios} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" /> Continuar</>}
                </button>
              </div>
            </>
          )}

          {/* STEP 4: Conclusão */}
          {step === 4 && (
            <div className="text-center space-y-5 py-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-500/30 flex items-center justify-center">
                  <Check className="h-8 w-8 text-emerald-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white">Empresa criada! 🎉</h2>
              <p className="text-white/50 text-sm">
                Próximos passos: adicionar <strong className="text-white/70">serviços</strong>, cadastrar <strong className="text-white/70">FAQs</strong> e conectar o <strong className="text-white/70">WhatsApp</strong>.
              </p>
              <div className="flex gap-3">
                <button onClick={() => router.push('/empresas')} className="btn-secondary flex-1">Ver todas empresas</button>
                <button onClick={() => empresaId && router.push(`/empresas/${empresaId}`)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Smartphone className="h-4 w-4" /> Configurar empresa
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
