'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Building2, MoreVertical, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

export default function EmpresasPage() {
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  async function load() {
    try {
      const r = await api.listEmpresas();
      setList(r);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function deletar(id: string, nome: string) {
    if (!confirm(`Excluir empresa "${nome}"? Esta ação é IRREVERSÍVEL e remove todos os dados (conversas, FAQs, serviços, etc).`)) return;
    try {
      await api.deleteEmpresa(id);
      toast.success('Empresa excluída');
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const filtered = list.filter((e) => {
    const okSearch = e.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) ||
                     e.segmento?.toLowerCase().includes(search.toLowerCase());
    const okStatus = filtroStatus === 'todos' || e.status === filtroStatus;
    return okSearch && okStatus;
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Empresas</h1>
            <p className="mt-1 text-white/50">
              {list.length} empresa{list.length !== 1 ? 's' : ''} cadastrada{list.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/empresas/nova" className="btn-primary flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova empresa
          </Link>
        </header>

        {/* Filtros */}
        <div className="card p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-white/30" />
            <input
              placeholder="Buscar por nome ou segmento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select className="input w-auto" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="trial">Trial</option>
            <option value="suspenso">Suspensos</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>

        {/* Tabela */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-white/50">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-white/20 mb-3" />
              <p className="text-white/50">Nenhuma empresa encontrada</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-white/50">
                <tr>
                  <th className="px-5 py-3">Empresa</th>
                  <th className="px-5 py-3">Plano</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Msgs/mês</th>
                  <th className="px-5 py-3 text-right">MRR</th>
                  <th className="px-5 py-3 text-right">API</th>
                  <th className="px-5 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/empresas/${e.id}`} className="font-semibold text-white hover:text-brand-300">
                        {e.nome_fantasia}
                      </Link>
                      <div className="text-xs text-white/40">{e.segmento || '—'}</div>
                    </td>
                    <td className="px-5 py-4 capitalize text-white/70">{e.plano}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        e.status === 'ativo' ? 'bg-emerald-500/10 text-emerald-400' :
                        e.status === 'trial' ? 'bg-amber-500/10 text-amber-400' :
                        e.status === 'suspenso' ? 'bg-red-500/10 text-red-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-white/70 tabular-nums">
                      {e.msgs_mes}/{e.limite_msgs_mes}
                    </td>
                    <td className="px-5 py-4 text-right text-emerald-400 font-medium tabular-nums">
                      R$ {parseFloat(e.valor_mensal || 0).toFixed(0)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`text-xs ${e.api_key_status === 'master' ? 'text-blue-400' : 'text-emerald-400'}`}>
                        {e.api_key_status === 'master' ? '🔵 Master' :
                         e.api_key_status === 'propria_valida' ? '🟢 Própria' :
                         e.api_key_status === 'propria_invalida' ? '🔴 Inválida' : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => deletar(e.id, e.nome_fantasia)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
