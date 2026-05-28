'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin, Globe, Phone, Loader2, Trash2,
  MessageSquare, ChevronDown, ChevronUp, Copy,
  Check, ExternalLink, Target, ShieldCheck, AlertCircle, FileText,
  Radar, Trophy, ChevronRight, Edit3, Send, RefreshCw,
  Clock, Play, Settings, CalendarClock, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

const NICHOS = [
  'Restaurante', 'Pizzaria', 'Hamburgueria', 'Lanchonete',
  'Clinica medica', 'Consultorio odontologico', 'Clinica estetica', 'Fisioterapia',
  'Salao de beleza', 'Barbearia', 'Spa',
  'Academia', 'Personal trainer',
  'Pet shop', 'Clinica veterinaria',
  'Advogado', 'Imobiliaria',
  'Escola de idiomas', 'Escola particular',
  'Farmacia', 'Otica',
  'Mecanica', 'Oficina auto',
  'Psicologo', 'Nutricionista',
  'Loja de roupas', 'Loja de calcados',
];

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  novo:              { label: 'Novo',                color: 'bg-white/10 text-white/50' },
  analisado:         { label: 'Analisado',           color: 'bg-blue-500/20 text-blue-400' },
  aguardando_ok:     { label: 'Aguardando OK',       color: 'bg-amber-500/20 text-amber-400' },
  autorizado:        { label: 'Autorizado ✓',        color: 'bg-emerald-500/20 text-emerald-400' },
  enviado:           { label: 'Enviado',             color: 'bg-purple-500/20 text-purple-400' },
  respondeu:         { label: 'Respondeu 💬',        color: 'bg-cyan-500/20 text-cyan-400' },
  transferido:       { label: 'Quer fechar 🤝',      color: 'bg-orange-500/20 text-orange-300' },
  reuniao_agendada:  { label: 'Reunião agendada 📅', color: 'bg-violet-500/20 text-violet-300' },
  fechou:            { label: 'Fechou negócio 🎉',   color: 'bg-green-500/20 text-green-400' },
  nao_fechou:        { label: 'Não fechou',          color: 'bg-red-500/20 text-red-400' },
  convertido:        { label: 'Convertido ✅',       color: 'bg-emerald-600/30 text-emerald-300' },
  descartado:        { label: 'Descartado',          color: 'bg-red-500/20 text-red-400' },
};

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

function Badge({ status }: { status: string }) {
  const info = STATUS_INFO[status] || STATUS_INFO['novo'];
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>{info.label}</span>;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition shrink-0">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── RESUMO DO JOB (atualiza a cada 5min) ────────────────────────────────────
function JobResumo({ jobId, onDone }: { jobId: string; onDone?: (job: any) => void }) {
  const [resumo, setResumo] = useState<{ status: string; total: number; ultimo: string; propostas: number } | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    const poll = async () => {
      try {
        const job = await api.get(`/api/prospeccao/jobs/${jobId}`);
        if (!active) return;
        const logs: any[] = job.log || [];
        const total = logs.length;
        const ultimo = logs[logs.length - 1]?.m || 'Iniciando...';
        const propostas = job.resultado?.propostas || 0;
        setResumo({ status: job.status, total, ultimo, propostas });
        if (job.status === 'rodando') setTimeout(poll, 5 * 60 * 1000);
        else onDone?.(job);
      } catch { if (active) setTimeout(poll, 60000); }
    };
    poll();
    // Primeira atualização rápida para confirmar que iniciou
    setTimeout(async () => {
      try {
        const job = await api.get(`/api/prospeccao/jobs/${jobId}`);
        if (!active) return;
        const logs: any[] = job.log || [];
        setResumo({ status: job.status, total: logs.length, ultimo: logs[logs.length - 1]?.m || 'Iniciando...', propostas: job.resultado?.propostas || 0 });
      } catch {}
    }, 5000);
    return () => { active = false; };
  }, [jobId, onDone]);

  if (!resumo) return <div className="flex items-center gap-2 text-xs text-white/30 py-3"><Loader2 className="h-3.5 w-3.5 animate-spin" />Iniciando agentes...</div>;

  const isRunning = resumo.status === 'rodando';
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${isRunning ? 'bg-emerald-500/5 border-emerald-500/20' : resumo.status === 'erro' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.03] border-white/10'}`}>
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isRunning ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
        {isRunning ? <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" /> : resumo.status === 'concluido' ? <Check className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{isRunning ? 'Agentes trabalhando...' : resumo.status === 'concluido' ? `${resumo.propostas} propostas geradas` : 'Erro no ciclo'}</p>
        <p className="text-xs text-white/40 truncate mt-0.5">{resumo.ultimo}</p>
      </div>
      {isRunning && <span className="text-xs text-white/20 shrink-0">Atualiza em 5min</span>}
    </div>
  );
}

// ─── RADAR ───────────────────────────────────────────────────────────────────
function getNivelConcorrencia(c: number) {
  if (c === 0) return { label: 'Mínima', color: 'text-emerald-400' };
  if (c <= 2)  return { label: 'Baixa',  color: 'text-emerald-300' };
  if (c <= 5)  return { label: 'Média',  color: 'text-amber-400' };
  return               { label: 'Alta',   color: 'text-red-400' };
}

function RadarTab({ onSelectCity }: { onSelectCity: (cidade: string) => void }) {
  const [ufFiltro, setUfFiltro] = useState('');
  const [top, setTop] = useState(20);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultados, setResultados] = useState<any[]>([]);
  const [totalAnalisado, setTotalAnalisado] = useState(0);
  const [cacheInfo, setCacheInfo] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState(false);

  // Carrega cache ao montar
  useEffect(() => {
    api.get('/api/prospeccao/radar/cache').then((r: any) => {
      if (r.cache && r.resultados?.length) {
        setResultados(r.resultados);
        setTotalAnalisado(r.total_analisado);
        const d = new Date(r.criado_em);
        setCacheInfo(`Último scan: ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
      }
    }).catch(() => {});
  }, []);

  async function iniciarRadar() {
    setIniciando(true);
    try {
      const r = await api.post('/api/prospeccao/radar-brasil', { top, uf_filtro: ufFiltro || null });
      setJobId(r.jobId);
      setResultados([]);
    } catch (e: any) { toast.error(e.message); }
    finally { setIniciando(false); }
  }

  function onRadarDone(job: any) {
    if (job.resultado?.resultados) {
      setResultados(job.resultado.resultados);
      setTotalAnalisado(job.resultado.total_analisado);
      setCacheInfo('Acabou de ser atualizado');
      toast.success(`${job.resultado.resultados.length} cidades rankeadas!`);
    }
    setJobId(null);
  }

  const scanning = !!jobId;

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Radar className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">Radar de Mercado — Brasil</h2>
              {cacheInfo
                ? <p className="text-xs text-white/30">{cacheInfo}</p>
                : <p className="text-xs text-white/30">Detecta onde há mais negócios e menos concorrência digital</p>}
            </div>
          </div>
          {!scanning && (
            <div className="flex items-center gap-2">
              <select value={ufFiltro} onChange={e => setUfFiltro(e.target.value)}
                className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/60">
                <option value="">🇧🇷 Brasil</option>
                {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
              <select value={top} onChange={e => setTop(Number(e.target.value))}
                className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/60">
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={30}>Top 30</option>
              </select>
              <button onClick={iniciarRadar} disabled={iniciando}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-xs font-medium transition border border-violet-500/20">
                <RefreshCw className={`h-3.5 w-3.5 ${iniciando ? 'animate-spin' : ''}`} />
                {resultados.length ? 'Atualizar' : 'Iniciar scan'}
              </button>
            </div>
          )}
        </div>

        {scanning && jobId && (
          <JobResumo jobId={jobId} onDone={onRadarDone} />
        )}

        {!scanning && resultados.length === 0 && (
          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-10 text-center">
            <Radar className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30 mb-3">Sem dados de radar ainda</p>
            <button onClick={iniciarRadar}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition">
              Iniciar primeiro scan do Brasil
            </button>
          </div>
        )}
      </div>

      {resultados.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/30 px-1">{totalAnalisado} cidades analisadas · clique para prospectar esta cidade</p>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-white/30">
                  <th className="text-left px-4 py-3 w-8">#</th>
                  <th className="text-left px-4 py-3">Cidade</th>
                  <th className="text-left px-4 py-3">UF</th>
                  <th className="text-right px-4 py-3">Negócios</th>
                  <th className="text-right px-4 py-3">Concorrência</th>
                  <th className="text-right px-4 py-3">Score</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((r: any, i: number) => {
                  const conc = getNivelConcorrencia(r.concorrencia);
                  const isTop3 = i < 3;
                  return (
                    <tr key={i} onClick={() => onSelectCity(r.cidade)}
                      className={`border-b border-white/[0.03] hover:bg-white/[0.03] transition cursor-pointer ${isTop3 ? 'bg-violet-500/[0.04]' : ''}`}>
                      <td className="px-4 py-3">
                        {isTop3
                          ? <Trophy className={`h-4 w-4 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : 'text-amber-600'}`} />
                          : <span className="text-white/20 text-xs">{i + 1}</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{r.cidade}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-md font-mono">{r.uf}</span></td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-medium">{r.potencial}</td>
                      <td className="px-4 py-3 text-right"><span className={`font-medium ${conc.color}`}>{conc.label} ({r.concorrencia})</span></td>
                      <td className="px-4 py-3 text-right font-bold text-base text-violet-300">{r.score}</td>
                      <td className="px-4 py-3 text-center"><ChevronRight className="h-4 w-4 text-white/20" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PROSPECTAR ───────────────────────────────────────────────────────────────
function ProspectarTab({ cidadePre, onDone }: { cidadePre: string; onDone: () => void }) {
  const [cidade, setCidade] = useState(cidadePre);
  const [nichosSelected, setNichosSelected] = useState<string[]>([]);
  const [maxPorNicho, setMaxPorNicho] = useState(5);
  const [intervaloHoras, setIntervaloHoras] = useState(3);
  const [cidadesAuto, setCidadesAuto] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [agAtivo, setAgAtivo] = useState(true);
  const [ultimoCiclo, setUltimoCiclo] = useState<string | null>(null);
  const [jobsRecentes, setJobsRecentes] = useState<any[]>([]);
  const saveTimer = useRef<any>(null);

  useEffect(() => { setCidade(cidadePre); }, [cidadePre]);

  // Carrega config e jobs recentes ao montar
  useEffect(() => {
    api.get('/api/prospeccao/config').then((cfg: any) => {
      const ag = cfg.agendamento;
      if (ag) {
        setAgAtivo(ag.ativo !== false);
        setIntervaloHoras(ag.intervalo_horas || 3);
        setNichosSelected(ag.nichos || []);
        setMaxPorNicho(ag.max_por_nicho || 5);
        if (ag.cidades?.length) setCidadesAuto(ag.cidades.join(', '));
      }
      if (cfg.ultimo_ciclo?.data) {
        setUltimoCiclo(new Date(cfg.ultimo_ciclo.data).toLocaleString('pt-BR'));
      }
    }).catch(() => {});
    api.get('/api/prospeccao/jobs').then((jobs: any[]) => setJobsRecentes(jobs.slice(0, 6))).catch(() => {});
  }, []);

  // Auto-salva no backend 2s após qualquer mudança nas configurações
  function autoSalvar(patch: any) {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const cidades = cidadesAuto ? cidadesAuto.split(',').map(c => c.trim()).filter(Boolean) : [];
        await api.post('/api/prospeccao/config', {
          chave: 'agendamento',
          valor: { ativo: agAtivo, intervalo_horas: intervaloHoras, nichos: nichosSelected, max_por_nicho: maxPorNicho, cidades, ...patch },
        });
      } catch {}
    }, 2000);
  }

  const toggleNicho = (n: string) => {
    const next = nichosSelected.includes(n) ? nichosSelected.filter(x => x !== n) : [...nichosSelected, n];
    setNichosSelected(next);
    autoSalvar({ nichos: next });
  };

  async function toggleAtivo() {
    const novo = !agAtivo;
    setAgAtivo(novo);
    const cidades = cidadesAuto ? cidadesAuto.split(',').map(c => c.trim()).filter(Boolean) : [];
    await api.post('/api/prospeccao/config', {
      chave: 'agendamento',
      valor: { ativo: novo, intervalo_horas: intervaloHoras, nichos: nichosSelected, max_por_nicho: maxPorNicho, cidades },
    }).catch(() => {});
    toast.success(novo ? 'Agente reativado' : 'Agente pausado');
  }

  async function rodarAgora() {
    if (!cidade.trim()) { toast.error('Informe uma cidade'); return; }
    if (nichosSelected.length === 0) { toast.error('Selecione ao menos um nicho'); return; }
    setIniciando(true);
    try {
      const r = await api.post('/api/prospeccao/iniciar-autonomo', { cidade, nichos: nichosSelected, max_por_nicho: maxPorNicho });
      setJobId(r.jobId);
    } catch (e: any) { toast.error(e.message); }
    finally { setIniciando(false); }
  }

  function onJobDone(job: any) {
    if (job.status === 'concluido') { toast.success(`${job.resultado?.propostas || 0} propostas geradas!`); setJobId(null); onDone(); }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Status em tempo real */}
      <div className={`card p-5 ${agAtivo ? 'ring-1 ring-emerald-500/20' : 'opacity-60'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${agAtivo ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
            <div>
              <span className="text-sm font-semibold text-white">
                {agAtivo ? 'Agente rodando continuamente' : 'Agente pausado'}
              </span>
              <p className="text-xs text-white/30 mt-0.5">
                {agAtivo
                  ? `Ciclos a cada ${intervaloHoras}h · ${ultimoCiclo ? 'último: ' + ultimoCiclo : 'iniciando em breve...'}`
                  : 'Reative nas configurações abaixo'}
              </p>
            </div>
          </div>
          {/* Toggle pausar/reativar */}
          <button onClick={toggleAtivo}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${agAtivo ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
            {agAtivo ? 'Pausar' : 'Reativar'}
          </button>
        </div>

        {/* Job atual */}
        {jobId && <div className="mb-3"><JobResumo jobId={jobId} onDone={onJobDone} /></div>}

        {/* Histórico de ciclos */}
        {jobsRecentes.length > 0 && (
          <div className="space-y-1 mb-4">
            <p className="text-xs text-white/20 mb-2">Últimos ciclos</p>
            {jobsRecentes.map((j: any) => (
              <div key={j.id} className="flex items-center gap-3 text-xs py-1 border-b border-white/[0.03] last:border-0">
                <span className={j.status === 'concluido' ? 'text-emerald-400' : j.status === 'erro' ? 'text-red-400' : 'text-amber-400'}>
                  {j.status === 'concluido' ? '✓' : j.status === 'erro' ? '✗' : '●'}
                </span>
                <span className="flex-1 text-white/50 truncate">{j.config?.cidade || 'automático'}</span>
                <span className="text-emerald-400/70">{j.resultado?.propostas != null ? `${j.resultado.propostas} propostas` : '—'}</span>
                <span className="text-white/20">{new Date(j.criado_em).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configurações — auto-salva */}
      <div className="card p-5 space-y-4">
        <p className="text-xs text-white/30 flex items-center gap-1.5"><Settings className="h-3.5 w-3.5" />Configurações · salvam automaticamente</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Intervalo</label>
            <select value={intervaloHoras} onChange={e => { setIntervaloHoras(Number(e.target.value)); autoSalvar({ intervalo_horas: Number(e.target.value) }); }} className="input">
              <option value={1}>A cada 1h</option>
              <option value={2}>A cada 2h</option>
              <option value={3}>A cada 3h</option>
              <option value={6}>A cada 6h</option>
            </select>
          </div>
          <div>
            <label className="label">Empresas/nicho</label>
            <select value={maxPorNicho} onChange={e => { setMaxPorNicho(Number(e.target.value)); autoSalvar({ max_por_nicho: Number(e.target.value) }); }} className="input">
              <option value={3}>3 por nicho</option>
              <option value={5}>5 por nicho</option>
              <option value={8}>8 por nicho</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Cidades fixas (vazio = usa Radar automático)</label>
          <input value={cidadesAuto} onChange={e => { setCidadesAuto(e.target.value); autoSalvar({ cidades: e.target.value.split(',').map(c => c.trim()).filter(Boolean) }); }}
            placeholder="Ex: Curitiba, Londrina, Maringá" className="input" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Nichos ativos ({nichosSelected.length})</label>
            <div className="flex gap-2">
              <button onClick={() => { setNichosSelected([...NICHOS]); autoSalvar({ nichos: NICHOS }); }} className="text-xs text-emerald-400">Todos</button>
              <button onClick={() => { setNichosSelected([]); autoSalvar({ nichos: [] }); }} className="text-xs text-white/30">Limpar</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {NICHOS.map(n => (
              <button key={n} onClick={() => toggleNicho(n)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition border ${nichosSelected.includes(n) ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Forçar cidade específica agora */}
      <div className="card p-4">
        <p className="text-xs text-white/30 mb-2">Forçar ciclo agora em cidade específica</p>
        <div className="flex gap-2">
          <input value={cidade} onChange={e => setCidade(e.target.value)}
            placeholder="Ex: Joinville, Santos, Natal" className="input flex-1" />
          <button onClick={rodarAgora} disabled={iniciando}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition disabled:opacity-50 shrink-0">
            {iniciando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Agora
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARD DE APROVAÇÃO ────────────────────────────────────────────────────────
function AprovacaoCard({ lead, onUpdate, onDelete }: { lead: any; onUpdate: (id: number, data: any) => void; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editandoMsg, setEditandoMsg] = useState(false);
  const [msgEditada, setMsgEditada] = useState(lead.mensagem_outreach || '');
  const [autorizando, setAutorizando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [solicitandoMelhoria, setSolicitandoMelhoria] = useState(false);
  const [modalMelhoria, setModalMelhoria] = useState(false);
  const [feedbackMelhoria, setFeedbackMelhoria] = useState('');

  async function autorizar() {
    setAutorizando(true);
    try {
      if (editandoMsg && msgEditada !== lead.mensagem_outreach) {
        await api.patch(`/api/prospeccao/leads/${lead.id}`, { mensagem_outreach: msgEditada });
        onUpdate(lead.id, { mensagem_outreach: msgEditada });
      }
      await api.post(`/api/prospeccao/leads/${lead.id}/autorizar`, {});
      onUpdate(lead.id, { status: 'autorizado', mensagem_outreach: msgEditada });
      toast.success('Autorizado! Enviando...');
      await enviarAgora(lead.id, msgEditada);
    } catch (e: any) { toast.error(e.message); }
    finally { setAutorizando(false); }
  }

  async function enviarAgora(id: number, msg?: string) {
    setEnviando(true);
    try {
      await api.post(`/api/prospeccao/leads/${id}/enviar-whatsapp`, {});
      onUpdate(id, { status: 'enviado' });
      toast.success('Mensagem enviada!');
    } catch {
      const tel = lead.telefone?.replace(/\D/g, '').replace(/^0/, '');
      const texto = msg || lead.mensagem_outreach;
      if (tel && texto) {
        window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`, '_blank');
        await api.post(`/api/prospeccao/leads/${id}/enviado`, {}).catch(() => {});
        onUpdate(id, { status: 'enviado' });
      } else toast.error('Telefone não encontrado.');
    } finally { setEnviando(false); }
  }

  async function atualizarStatus(status: string) {
    setAtualizandoStatus(true);
    try {
      await api.patch(`/api/prospeccao/leads/${lead.id}`, { status });
      onUpdate(lead.id, { status });
    } catch (e: any) { toast.error(e.message); }
    finally { setAtualizandoStatus(false); }
  }

  async function solicitarMelhoria() {
    if (!feedbackMelhoria.trim() || feedbackMelhoria.trim().length < 10) {
      toast.error('Descreva o que precisa melhorar (mínimo 10 caracteres)');
      return;
    }
    setSolicitandoMelhoria(true);
    try {
      await api.post(`/api/prospeccao/leads/${lead.id}/melhorar`, { feedback: feedbackMelhoria });
      toast.success('IA está regenerando a proposta com seu feedback...');
      setModalMelhoria(false);
      setFeedbackMelhoria('');
      onUpdate(lead.id, { status: 'processando' });
    } catch (e: any) { toast.error(e.message); }
    finally { setSolicitandoMelhoria(false); }
  }

  const qualidade = lead.qualidade_score ? (() => { try { return JSON.parse(lead.qualidade_score); } catch { return null; } })() : null;

  const aguardando = lead.status === 'aguardando_ok';
  const autorizado = lead.status === 'autorizado';
  const enviado = lead.status === 'enviado';
  const querFechar = lead.status === 'transferido' || lead.status === 'reuniao_agendada';
  const fechou = lead.status === 'fechou';

  return (
    <div className={`card overflow-hidden ${aguardando ? 'ring-1 ring-amber-500/40' : autorizado ? 'ring-1 ring-emerald-500/40' : ''}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand-500/20 flex items-center justify-center shrink-0 text-brand-400 font-bold text-sm">
            {lead.nome.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-white text-sm">{lead.nome}</div>
                <div className="text-xs text-white/40">{lead.segmento} · {lead.cidade}</div>
              </div>
              <Badge status={lead.status} />
            </div>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-white/30">
              {lead.website
                ? <span className="flex items-center gap-1 text-blue-400"><Globe className="h-3 w-3" />Site</span>
                : <span className="text-red-400/70 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Sem site</span>}
              {lead.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.telefone}</span>}
              {lead.analise && <span className="flex items-center gap-1 text-blue-400/70">Score {lead.analise.score}/10</span>}
              {qualidade && (
                <span className={`flex items-center gap-1 font-medium ${qualidade.score >= 8 ? 'text-emerald-400' : qualidade.score >= 7 ? 'text-amber-400' : 'text-red-400'}`}>
                  <ShieldCheck className="h-3 w-3" />
                  IA {qualidade.score}/10 · {qualidade.fonte || 'revisado'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3 items-center flex-wrap">
          {aguardando && (
            <>
              <button onClick={autorizar} disabled={autorizando || enviando}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition border border-amber-500/40 animate-pulse disabled:opacity-50">
                {autorizando || enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                Aprovar e enviar
              </button>
              <button onClick={() => setModalMelhoria(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs transition border border-blue-500/30">
                <Edit3 className="h-3.5 w-3.5" />
                Solicitar Melhoria
              </button>
              <button onClick={() => atualizarStatus('descartado')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition">
                Descartar
              </button>
            </>
          )}

          {/* Modal Solicitar Melhoria */}
          {modalMelhoria && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-white font-semibold text-base mb-1">Solicitar Melhoria</h3>
                <p className="text-white/40 text-xs mb-4">Descreva o que precisa melhorar. A IA vai regenerar a proposta com seu feedback.</p>
                <textarea
                  value={feedbackMelhoria}
                  onChange={e => setFeedbackMelhoria(e.target.value)}
                  placeholder="Ex: A proposta não mencionou o serviço de Marketing Digital. O tom ficou muito agressivo. Falta urgência na oferta..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-brand-500/50 h-32"
                  autoFocus
                />
                <div className="flex gap-2 mt-4 justify-end">
                  <button onClick={() => { setModalMelhoria(false); setFeedbackMelhoria(''); }}
                    className="px-4 py-2 rounded-xl text-white/40 hover:text-white text-sm transition">
                    Cancelar
                  </button>
                  <button onClick={solicitarMelhoria} disabled={solicitandoMelhoria || feedbackMelhoria.trim().length < 10}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50">
                    {solicitandoMelhoria ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Regenerar com IA
                  </button>
                </div>
              </div>
            </div>
          )}
          {autorizado && (
            <button onClick={() => enviarAgora(lead.id)} disabled={enviando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-50">
              {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Enviar agora
            </button>
          )}
          {enviado && <span className="text-xs text-purple-400 flex items-center gap-1"><Check className="h-3 w-3" />Enviado</span>}

          {querFechar && (
            <div className="w-full mt-1">
              <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-3 mb-2">
                <p className="text-xs text-orange-300 font-semibold mb-2">
                  {lead.status === 'transferido' ? '🤝 Cliente quer fechar — como foi?' : '📅 Reunião agendada — como foi?'}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => atualizarStatus('fechou')} disabled={atualizandoStatus}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition">
                    ✅ Fechou negócio
                  </button>
                  <button onClick={() => atualizarStatus('nao_fechou')} disabled={atualizandoStatus}
                    className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 text-xs font-semibold transition">
                    ❌ Não fechou
                  </button>
                </div>
              </div>
            </div>
          )}

          {fechou && (
            <div className="w-full mt-1">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <p className="text-xs text-emerald-300 font-semibold mb-2">🎉 Negócio fechado! Pagamento confirmado?</p>
                <button onClick={() => atualizarStatus('convertido')} disabled={atualizandoStatus}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">
                  ✅ Confirmar pagamento → Criar empresa no JARVIS
                </button>
              </div>
            </div>
          )}

          <button onClick={() => setExpanded(e => !e)} className="ml-auto text-white/20 hover:text-white/50 transition">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button onClick={() => onDelete(lead.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {!aguardando && !autorizado && !enviado && !querFechar && !fechou && (
          <div className="mt-2">
            <select value={lead.status} onChange={e => atualizarStatus(e.target.value)} disabled={atualizandoStatus}
              className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/40 w-full">
              {Object.entries(STATUS_INFO).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-3">
          {lead.endereco && (
            <div className="text-xs text-white/30 flex items-start gap-1.5">
              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />{lead.endereco}
            </div>
          )}
          {lead.website && (
            <a href={lead.website} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition">
              <ExternalLink className="h-3 w-3" />{lead.website}
            </a>
          )}
          {lead.analise && (
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/60">Análise do site</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-bold ${lead.analise.score >= 7 ? 'text-emerald-400' : lead.analise.score >= 4 ? 'text-amber-400' : 'text-red-400'}`}>
                    {lead.analise.score}/10
                  </span>
                  <span className={lead.analise.mobile_friendly ? 'text-emerald-400' : 'text-red-400/70'}>
                    {lead.analise.mobile_friendly ? '📱 Mobile OK' : '⚠️ Não mobile'}
                  </span>
                </div>
              </div>
              {lead.analise.resumo && <p className="text-xs text-white/50">{lead.analise.resumo}</p>}
              {lead.analise.oportunidades?.length > 0 && (
                <ul className="space-y-0.5">
                  {lead.analise.oportunidades.map((o: string, i: number) => (
                    <li key={i} className="text-xs text-emerald-400/70 flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5 shrink-0">↗</span>{o}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {lead.proposta && (
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white/60 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />Proposta comercial
                </span>
                <CopyBtn text={lead.proposta} />
              </div>
              <p className="text-xs text-white/50 whitespace-pre-wrap leading-relaxed">{lead.proposta}</p>
            </div>
          )}
          {lead.mensagem_outreach && (
            <div className={`rounded-xl border p-3 ${aguardando ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#075E54]/10 border-[#075E54]/20'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />Mensagem WhatsApp
                </span>
                <div className="flex gap-1">
                  <CopyBtn text={editandoMsg ? msgEditada : lead.mensagem_outreach} />
                  <button onClick={() => setEditandoMsg(e => !e)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {editandoMsg
                ? <textarea value={msgEditada} onChange={e => setMsgEditada(e.target.value)} rows={5}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white/80 resize-none focus:outline-none focus:border-emerald-500/50" />
                : <p className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed">{lead.mensagem_outreach}</p>}
              {aguardando && (
                <button onClick={autorizar} disabled={autorizando || enviando}
                  className="w-full mt-3 flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50">
                  {autorizando || enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Aprovar e enviar esta mensagem
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function ProspeccaoPage() {
  const [tab, setTab] = useState<'radar' | 'prospectar' | 'aprovacao'>('radar');
  const [cidadePre, setCidadePre] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState('aguardando_ok');
  const [carregandoLeads, setCarregandoLeads] = useState(false);

  const carregarLeads = useCallback(async () => {
    setCarregandoLeads(true);
    try {
      const url = filtroStatus === 'todos' ? '/api/prospeccao/leads' : `/api/prospeccao/leads?status=${filtroStatus}`;
      setLeads(await api.get(url));
    } catch {}
    finally { setCarregandoLeads(false); }
  }, [filtroStatus]);

  useEffect(() => { if (tab === 'aprovacao') carregarLeads(); }, [tab, carregarLeads]);

  function updateLead(id: number, data: any) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
  }
  async function deleteLead(id: number) {
    try {
      await api.delete(`/api/prospeccao/leads/${id}`);
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch {}
  }

  const pendentes = leads.filter(l => l.status === 'aguardando_ok').length;
  const leadsVisiveis = leads.filter(l => filtroStatus === 'todos' || l.status === filtroStatus);

  function selecionarCidade(cidade: string) {
    setCidadePre(cidade);
    setTab('prospectar');
    toast.success(`${cidade} selecionada! Configure os nichos e lance os agentes.`);
  }

  function agentesConcluidosIrParaAprovacao() {
    setTab('aprovacao');
    carregarLeads();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/30 flex items-center justify-center">
              <Target className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Prospecção IA</h1>
              <p className="text-white/40 text-sm">Agentes autônomos. Você só aprova.</p>
            </div>
          </div>
        </header>

        <div className="flex gap-1 mb-6 border-b border-white/5">
          {[
            { id: 'radar',      label: '📡 Radar Brasil' },
            { id: 'prospectar', label: '🤖 Lançar agentes' },
            { id: 'aprovacao',  label: `✅ Aprovação${pendentes > 0 ? ` · ${pendentes}` : ''}` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                tab === t.id ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-white/40 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'radar' && <RadarTab onSelectCity={selecionarCidade} />}
        {tab === 'prospectar' && <ProspectarTab cidadePre={cidadePre} onDone={agentesConcluidosIrParaAprovacao} />}

        {tab === 'aprovacao' && (
          <div>
            {pendentes > 0 && (
              <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-center gap-2 text-sm text-amber-300">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span><strong>{pendentes}</strong> proposta{pendentes > 1 ? 's' : ''} aguardando sua aprovação.</span>
              </div>
            )}
            <div className="flex gap-1 mb-4 flex-wrap items-center">
              {[
                { v: 'aguardando_ok',    l: '⏳ Aguardando' },
                { v: 'enviado',          l: '📤 Enviados' },
                { v: 'respondeu',        l: '💬 Responderam' },
                { v: 'transferido',      l: '🤝 Quer fechar' },
                { v: 'reuniao_agendada', l: '📅 Reunião' },
                { v: 'fechou',           l: '🎉 Fecharam' },
                { v: 'convertido',       l: '✅ Convertidos' },
                { v: 'nao_fechou',       l: '❌ Não fechou' },
                { v: 'todos',            l: 'Todos' },
              ].map(({ v, l }) => (
                <button key={v} onClick={() => setFiltroStatus(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filtroStatus === v ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>
                  {l}
                </button>
              ))}
              <button onClick={carregarLeads} className="ml-auto text-xs text-white/30 hover:text-white transition">↺</button>
            </div>

            {carregandoLeads && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>}

            {!carregandoLeads && leadsVisiveis.length === 0 && (
              <div className="card p-12 text-center text-white/20 text-sm space-y-2">
                <Target className="h-10 w-10 mx-auto text-white/10 mb-3" />
                <p>{leads.length === 0 ? 'Nenhum lead ainda.' : 'Nenhum lead com esse status.'}</p>
                {leads.length === 0 && (
                  <button onClick={() => setTab('prospectar')} className="mt-2 text-emerald-400 hover:text-emerald-300 text-sm transition">
                    → Lançar agentes agora
                  </button>
                )}
              </div>
            )}

            {!carregandoLeads && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {leadsVisiveis.map(lead => (
                  <AprovacaoCard key={lead.id} lead={lead} onUpdate={updateLead} onDelete={deleteLead} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
