'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Clock, User, Phone, CheckCircle, Loader2 } from 'lucide-react';

const DIAS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.jarvis.app.br';

async function reqPublica(path: string, options?: RequestInit) {
  const proxyPath = path.replace(/^\/api/, '/api/proxy');
  const res = await fetch(proxyPath, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function gerarHorarios(abre: string, fecha: string, ocupados: any[], duracao: number) {
  const slots: string[] = [];
  const [ha, ma] = abre.split(':').map(Number);
  const [hf, mf] = fecha.split(':').map(Number);
  let cur = ha * 60 + ma;
  const fim = hf * 60 + mf;
  while (cur + duracao <= fim) {
    const hh = String(Math.floor(cur / 60)).padStart(2, '0');
    const mm = String(cur % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
    cur += duracao;
  }
  return slots.filter(slot => {
    const [sh, sm] = slot.split(':').map(Number);
    const slotMin = sh * 60 + sm;
    return !ocupados.some(o => {
      const d = new Date(o.data_hora);
      const oMin = d.getHours() * 60 + d.getMinutes();
      return slotMin >= oMin && slotMin < oMin + (o.duracao_minutos || 60);
    });
  });
}

export default function AgendaPublicaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [step, setStep] = useState<'info' | 'horario' | 'dados' | 'ok'>('info');
  const [servicoSel, setServicoSel] = useState<any>(null);
  const [dataSel, setDataSel] = useState('');
  const [horarioSel, setHorarioSel] = useState('');
  const [ocupados, setOcupados] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    reqPublica(`/api/publica/${slug}/info`)
      .then(d => { setInfo(d); setStep('info'); })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  async function selecionarData(data: string) {
    setDataSel(data);
    setHorarioSel('');
    setLoadingSlots(true);
    try {
      const oc = await reqPublica(`/api/publica/${slug}/disponibilidade?data=${data}`);
      setOcupados(oc);
    } catch { setOcupados([]); }
    finally { setLoadingSlots(false); }
  }

  async function confirmar() {
    if (!nome.trim() || !telefone.trim()) return;
    setSalvando(true);
    try {
      const dataHora = `${dataSel}T${horarioSel}:00`;
      await reqPublica(`/api/publica/${slug}/agendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, telefone, servico: servicoSel?.nome, data_hora: dataHora, duracao_minutos: servicoSel?.duracao_minutos || 60 }),
      });
      setStep('ok');
    } catch (e: any) { alert(e.message); }
    finally { setSalvando(false); }
  }

  const horarioHoje = () => {
    if (!dataSel || !info) return [];
    const dia = new Date(dataSel + 'T12:00:00').getDay();
    const h = info.horarios.find((h: any) => h.dia_semana === dia);
    if (!h || h.fechado) return [];
    return gerarHorarios(h.abre, h.fecha, ocupados, servicoSel?.duracao_minutos || 60);
  };

  // Próximos 30 dias habilitados
  const diasDisponiveis = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const dia = d.getDay();
    const h = info?.horarios.find((h: any) => h.dia_semana === dia);
    return { iso, diaNome: DIAS_PT[dia], diaNum: d.getDate(), habilitado: h && !h.fechado };
  }).filter(d => d.habilitado);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
    </div>
  );

  if (erro || !info) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white/50">{erro || 'Empresa não encontrada'}</div>
  );

  const { empresa, servicos } = info;
  const slots = horarioHoje();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-violet-950/20 to-gray-950 p-4">
      <div className="mx-auto max-w-md pt-8 pb-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20 ring-1 ring-violet-500/30 mb-4">
            <Calendar className="h-7 w-7 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">{empresa.nome_fantasia}</h1>
          {empresa.segmento && <p className="text-sm text-white/40 mt-1">{empresa.segmento}</p>}
        </div>

        {step === 'ok' ? (
          <div className="text-center space-y-4 py-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-500/30">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Agendado!</h2>
            <p className="text-white/50 text-sm">
              Seu agendamento foi registrado com sucesso.<br />
              Você receberá uma confirmação em breve.
            </p>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/70 space-y-1.5">
              <div><strong className="text-white">{servicoSel?.nome || 'Serviço'}</strong></div>
              <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{new Date(dataSel + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
              <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{horarioSel}</div>
              <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{nome}</div>
            </div>
            <button onClick={() => { setStep('info'); setDataSel(''); setHorarioSel(''); setServicoSel(null); }} className="text-sm text-violet-400 hover:text-violet-300">
              Fazer outro agendamento
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Serviços */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Serviço</h2>
              <div className="space-y-2">
                {servicos.length === 0 ? (
                  <p className="text-white/30 text-sm">Nenhum serviço cadastrado.</p>
                ) : servicos.map((s: any) => (
                  <button key={s.nome} onClick={() => { setServicoSel(s); setStep('horario'); }}
                    className={`w-full text-left p-3 rounded-xl border transition ${servicoSel?.nome === s.nome ? 'bg-violet-500/20 border-violet-500/40 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:border-white/20'}`}>
                    <div className="font-medium text-sm">{s.nome}</div>
                    <div className="text-xs text-white/40 mt-0.5 flex items-center gap-2">
                      {s.preco && <span>R$ {parseFloat(s.preco).toFixed(2)}</span>}
                      {s.duracao_minutos && <span>· {s.duracao_minutos}min</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Data */}
            {step !== 'info' && (
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Data</h2>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {diasDisponiveis.slice(0, 14).map(d => (
                    <button key={d.iso} onClick={() => selecionarData(d.iso)}
                      className={`shrink-0 flex flex-col items-center rounded-xl px-3 py-2 border transition text-xs ${dataSel === d.iso ? 'bg-violet-500/20 border-violet-500/40 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}>
                      <span className="text-white/30">{d.diaNome.slice(0, 3)}</span>
                      <span className="font-bold text-sm mt-0.5">{d.diaNum}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Horários */}
            {dataSel && (
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Horário</h2>
                {loadingSlots ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-violet-400" /></div>
                ) : slots.length === 0 ? (
                  <p className="text-white/30 text-sm">Sem horários disponíveis neste dia.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(s => (
                      <button key={s} onClick={() => { setHorarioSel(s); setStep('dados'); }}
                        className={`py-2 rounded-lg text-sm border transition ${horarioSel === s ? 'bg-violet-500/20 border-violet-500/40 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dados pessoais */}
            {step === 'dados' && horarioSel && (
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-4">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Seus dados</h2>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input value={nome} onChange={e => setNome(e.target.value)} placeholder="João Silva" className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500" />
                  </div>
                </div>

                {/* Resumo */}
                <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-3 text-xs text-violet-200 space-y-1">
                  <div><strong>{servicoSel?.nome}</strong></div>
                  <div>{new Date(dataSel + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às {horarioSel}</div>
                </div>

                <button onClick={confirmar} disabled={salvando || !nome.trim() || !telefone.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-medium transition disabled:opacity-50">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4" /> Confirmar agendamento</>}
                </button>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-white/20 mt-8">Powered by JARVIS AI</p>
      </div>
    </div>
  );
}
