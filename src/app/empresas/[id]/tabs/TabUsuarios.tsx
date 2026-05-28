'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Eye, EyeOff, Loader2, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function TabUsuarios({ data }: any) {
  const empresaId = data.empresa.id;
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  const [email, setEmail]       = useState('');
  const [nome, setNome]         = useState('');
  const [senha, setSenha]       = useState('');
  const [saving, setSaving]     = useState(false);

  async function load() {
    setLoading(true);
    try {
      const list = await api.listUsuarios(empresaId);
      setUsuarios(list);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [empresaId]);

  async function criar() {
    if (!email || !senha) return toast.error('E-mail e senha obrigatórios');
    setSaving(true);
    try {
      await api.createUsuario(empresaId, { email, nome, password: senha });
      toast.success('Usuário criado!');
      setEmail(''); setNome(''); setSenha(''); setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(u: any) {
    try {
      await api.updateUsuario(empresaId, u.id, { ativo: !u.ativo });
      toast.success(u.ativo ? 'Usuário desativado' : 'Usuário ativado');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function deletar(u: any) {
    if (!confirm(`Excluir ${u.email}?`)) return;
    try {
      await api.deleteUsuario(empresaId, u.id);
      toast.success('Removido');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Usuários do Painel</h2>
          <p className="text-sm text-white/50">Logins que a empresa usa para acessar o painel delas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
            <UserPlus className="h-4 w-4" /> Novo Usuário
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <h3 className="font-medium text-white">Criar acesso</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nome</label>
              <input className="input" placeholder="Nome da pessoa" value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div>
              <label className="label">E-mail *</label>
              <input className="input" type="email" placeholder="email@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="relative">
            <label className="label">Senha *</label>
            <input
              className="input pr-10"
              type={showSenha ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={e => setSenha(e.target.value)}
            />
            <button type="button" className="absolute right-3 top-9 text-white/40" onClick={() => setShowSenha(!showSenha)}>
              {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={criar} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Criar
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
        </div>
      ) : usuarios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-white/40">
          Nenhum usuário cadastrado. Crie o primeiro acesso acima.
        </div>
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{u.nome || u.email}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${u.ativo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {u.ativo ? 'ativo' : 'inativo'}
                  </span>
                </div>
                {u.nome && <div className="text-sm text-white/50">{u.email}</div>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleAtivo(u)} className="text-white/40 hover:text-white transition-colors" title={u.ativo ? 'Desativar' : 'Ativar'}>
                  {u.ativo ? <ToggleRight className="h-5 w-5 text-emerald-400" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
                <button onClick={() => deletar(u)} className="text-white/30 hover:text-red-400 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-brand-500/5 border border-brand-500/10 p-4 text-sm text-white/50">
        <strong className="text-white/70">Como funciona:</strong> A empresa acessa{' '}
        <code className="text-brand-400">jarvis-admin-panel.vercel.app</code> com o e-mail e senha que você criou aqui.
        O painel deles mostra apenas: Identidade IA, Serviços, FAQ, Horários, Agendamentos, WhatsApp e Teste.
      </div>
    </div>
  );
}
