'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';
import { TabDados } from './tabs/TabDados';
import { TabIdentidade } from './tabs/TabIdentidade';
import { TabServicos } from './tabs/TabServicos';
import { TabFaq } from './tabs/TabFaq';
import { TabApiKey } from './tabs/TabApiKey';
import { TabHorarios } from './tabs/TabHorarios';
import { TabConexao } from './tabs/TabConexao';
import { TabConsumo } from './tabs/TabConsumo';
import { TabChatTest } from './tabs/TabChatTest';
import { TabAgendamentos } from './tabs/TabAgendamentos';
import { TabUsuarios } from './tabs/TabUsuarios';
import { TabEscalonamentos } from './tabs/TabEscalonamentos';
import { TabMetricas } from './tabs/TabMetricas';
import { TabFunil } from './tabs/TabFunil';
import { TabBlacklist } from './tabs/TabBlacklist';
import { TabListaEspera } from './tabs/TabListaEspera';

const TABS = [
  { id: 'dados', label: '📋 Dados' },
  { id: 'ia', label: '🤖 Identidade IA' },
  { id: 'servicos', label: '💼 Serviços' },
  { id: 'faq', label: '❓ FAQ' },
  { id: 'agendamentos', label: '📅 Agendamentos' },
  { id: 'funil', label: '🔻 Funil' },
  { id: 'lista-espera', label: '⏳ Lista Espera' },
  { id: 'blacklist', label: '🚫 Blacklist' },
  { id: 'escalacoes', label: '🚨 Escalações' },
  { id: 'usuarios', label: '👤 Usuários' },
  { id: 'apikey', label: '🔑 API Key' },
  { id: 'horarios', label: '🕐 Horários' },
  { id: 'conexao', label: '📱 WhatsApp' },
  { id: 'metricas', label: '📈 Métricas IA' },
  { id: 'consumo', label: '📊 Consumo' },
  { id: 'chat', label: '💬 Chat Teste' },
];

export default function EmpresaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dados');

  async function load() {
    try {
      const d = await api.getEmpresa(id);
      setData(d);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading || !data) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <button onClick={() => router.push('/dashboard')} className="mb-4 flex items-center gap-2 text-sm text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{data.empresa.nome_fantasia}</h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-white/50">
              <span>{data.empresa.segmento || 'Sem segmento'}</span>
              <span>•</span>
              <span className="capitalize">Plano {data.empresa.plano}</span>
              <span>•</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                data.empresa.status === 'ativo' ? 'bg-emerald-500/10 text-emerald-400' :
                data.empresa.status === 'trial' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
              }`}>{data.empresa.status}</span>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-white/5 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="card p-6">
          {tab === 'dados' && <TabDados data={data} reload={load} />}
          {tab === 'ia' && <TabIdentidade data={data} reload={load} />}
          {tab === 'servicos' && <TabServicos data={data} reload={load} />}
          {tab === 'faq' && <TabFaq data={data} reload={load} />}
          {tab === 'apikey' && <TabApiKey data={data} reload={load} />}
          {tab === 'horarios' && <TabHorarios data={data} reload={load} />}
          {tab === 'conexao' && <TabConexao data={data} reload={load} />}
          {tab === 'metricas' && <TabMetricas data={data} />}
          {tab === 'consumo' && <TabConsumo data={data} />}
          {tab === 'chat' && <TabChatTest data={data} />}
          {tab === 'agendamentos' && <TabAgendamentos data={data} />}
          {tab === 'funil' && <TabFunil data={data} />}
          {tab === 'lista-espera' && <TabListaEspera data={data} />}
          {tab === 'blacklist' && <TabBlacklist data={data} />}
          {tab === 'escalacoes' && <TabEscalonamentos data={data} />}
          {tab === 'usuarios' && <TabUsuarios data={data} />}
        </div>
      </div>
    </AppShell>
  );
}
