'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Lock, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api.login(email, password);
      setToken(result.token);
      localStorage.setItem('jarvis_user', JSON.stringify(result.user));
      toast.success('Bem-vindo!');
      router.push(result.user.role === 'empresa' ? '/empresa' : '/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-brand-900 to-black p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/20 ring-1 ring-brand-500/30">
            <Bot className="h-8 w-8 text-brand-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">JARVIS Admin</h1>
          <p className="mt-2 text-white/50">Gestão das suas empresas</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl"
        >
          <div className="space-y-5">
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="admin@suaempresa.com"
                  className="input pl-11"
                />
              </div>
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-white/30" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input pl-11"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-white/30">
          🤖 JARVIS IA · Painel de Super Admin
        </p>
      </div>
    </div>
  );
}
