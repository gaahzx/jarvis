'use client';

import { useEffect, useState, useCallback } from 'react';
import { Shield, Key, Globe, Server, CheckCircle, AlertCircle, Loader2, MessageSquare, RefreshCw, Wifi, WifiOff, QrCode, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

function WhatsAppProspeccao() {
  const [status, setStatus] = useState<string>('verificando');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [pollingQr, setPollingQr] = useState(false);

  const verificarStatus = useCallback(async () => {
    try {
      const r = await api.get('/api/prospeccao/whatsapp/status');
      setStatus(r.status);
      if (r.status === 'open') { setQrCode(null); setPollingQr(false); }
    } catch { setStatus('erro'); }
  }, []);

  useEffect(() => { verificarStatus(); }, [verificarStatus]);

  useEffect(() => {
    if (!pollingQr) return;

    // Verifica conexão a cada 4s
    const ivStatus = setInterval(async () => {
      const r = await api.get('/api/prospeccao/whatsapp/status').catch(() => null);
      if (r?.status === 'open') {
        setStatus('open'); setQrCode(null); setPollingQr(false);
        toast.success('WhatsApp conectado com sucesso!');
        clearInterval(ivStatus); clearInterval(ivQr);
      }
    }, 4000);

    // Renova QR a cada 50s (expira em ~60s)
    const ivQr = setInterval(async () => {
      const r = await api.get('/api/prospeccao/whatsapp/qr').catch(() => null);
      const qr = r?.base64 || r?.qrcode?.base64 || r?.qr || null;
      if (qr) setQrCode(qr);
    }, 50000);

    return () => { clearInterval(ivStatus); clearInterval(ivQr); };
  }, [pollingQr]);

  async function conectar() {
    setCarregando(true);
    try {
      // Se já estava em 'connecting' (loop), desconecta e recria limpo
      if (status === 'connecting') {
        await api.delete('/api/prospeccao/whatsapp/desconectar').catch(() => {});
        await new Promise(res => setTimeout(res, 1500));
      }
      // Cria instância (ignora erro se já existe)
      await api.post('/api/prospeccao/whatsapp/criar', {}).catch(() => {});

      // Tenta buscar QR até 6 vezes com 2s de intervalo (Evolution precisa de alguns segundos)
      let qr: string | null = null;
      for (let tentativa = 1; tentativa <= 6; tentativa++) {
        const r = await api.get('/api/prospeccao/whatsapp/qr');
        qr = r.base64 || r.qrcode?.base64 || r.qr || null;
        if (qr) break;
        if (tentativa < 6) await new Promise(res => setTimeout(res, 2000));
      }

      if (qr) {
        setQrCode(qr);
        setPollingQr(true);
        toast.success('QR gerado! Escaneie com seu WhatsApp.');
      } else {
        toast.error('Não foi possível gerar o QR. Tente novamente.');
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setCarregando(false); }
  }

  async function desconectar() {
    setCarregando(true);
    try {
      await api.delete('/api/prospeccao/whatsapp/desconectar');
      setStatus('desconectado'); setQrCode(null); setPollingQr(false);
      toast.success('WhatsApp desconectado.');
    } catch (e: any) { toast.error(e.message); }
    finally { setCarregando(false); }
  }

  const isConectado = status === 'open';
  // 'connecting' sozinho não conta — só conta quando o usuário gerou o QR ativamente
  const isConectando = pollingQr;

  return (
    <section className="card p-6 mb-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-emerald-400" /> WhatsApp — Prospecção IA
      </h2>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${isConectado ? 'bg-emerald-400 animate-pulse' : isConectando ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
          <div>
            <p className="text-sm font-medium text-white">
              {isConectado ? 'Conectado' : isConectando ? 'Aguardando escaneamento...' : status === 'verificando' ? 'Verificando...' : 'Desconectado'}
            </p>
            <p className="text-xs text-white/30">Instância: prospeccao-admin</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={verificarStatus} className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition" title="Atualizar status">
            <RefreshCw className="h-4 w-4" />
          </button>
          {isConectado && (
            <button onClick={desconectar} disabled={carregando} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition">
              <WifiOff className="h-3.5 w-3.5" /> Desconectar
            </button>
          )}
          {!isConectado && !isConectando && (
            <button onClick={conectar} disabled={carregando} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition disabled:opacity-50">
              {carregando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
              Gerar QR Code
            </button>
          )}
        </div>
      </div>

      {qrCode && (
        <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-white/5 border border-white/10">
          <p className="text-sm text-white/60 text-center">Abra o WhatsApp → <strong className="text-white">⋮ Menu</strong> → <strong className="text-white">Aparelhos conectados</strong> → <strong className="text-white">Conectar aparelho</strong></p>
          <div className="bg-white p-4 rounded-2xl shadow-2xl">
            <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code WhatsApp" className="h-72 w-72" style={{imageRendering:'pixelated'}} />
          </div>
          <div className="flex items-center gap-2 text-amber-400 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando escaneamento... (renova automaticamente)
          </div>
        </div>
      )}

      {isConectado && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2 text-sm text-emerald-300">
          <Wifi className="h-4 w-4 shrink-0" />
          WhatsApp conectado! Os leads autorizados serão enviados diretamente por este número.
        </div>
      )}

      {!isConectado && !qrCode && (
        <p className="text-xs text-white/20">Conecte um número de WhatsApp para enviar mensagens de prospecção diretamente pelo painel, sem abrir o celular.</p>
      )}
    </section>
  );
}

export default function ConfiguracoesPage() {
  const [provedores, setProvedores] = useState<any[]>([]);
  const [modelos, setModelos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiHealth, setApiHealth] = useState<'ok' | 'erro' | 'verificando'>('verificando');

  useEffect(() => {
    Promise.all([
      api.provedores().catch(() => []),
      api.modelos(true).catch(() => []),
      fetch('/api/proxy/health').then((r) => r.ok ? 'ok' : 'erro').catch(() => 'erro' as const),
    ]).then(([p, m, h]) => {
      setProvedores(p);
      setModelos(m);
      setApiHealth(h);
      setLoading(false);
    });
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Configurações</h1>
          <p className="mt-1 text-white/50">Visão geral do sistema</p>
        </header>

        {/* Sistema */}
        <section className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="h-5 w-5" /> Status do sistema
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusCard label="Backend API" status={apiHealth === 'ok'} />
            <StatusCard label="Frontend Vercel" status={true} />
            <StatusCard label="PostgreSQL" status={true} />
            <StatusCard label="OpenRouter" status={true} subtitle="Limite: $0" />
          </div>
        </section>

        {/* WhatsApp Prospecção */}
        <WhatsAppProspeccao />

        {/* Provedores */}
        <section className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" /> Provedores de IA disponíveis
          </h2>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-white/30 mx-auto" />
          ) : (
            <div className="space-y-2">
              {provedores.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div>
                    <div className="font-medium text-white">{p.nome}</div>
                    <div className="text-xs text-white/40">{p.descricao}</div>
                  </div>
                  {p.suporta_free && <span className="text-xs rounded-full bg-emerald-500/10 text-emerald-400 px-2 py-1">Tem modelos grátis</span>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Modelos gratuitos */}
        <section className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key className="h-5 w-5" /> Modelos gratuitos cadastrados
          </h2>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-white/30 mx-auto" />
          ) : modelos.length === 0 ? (
            <p className="text-white/50 text-sm">Nenhum modelo gratuito cadastrado</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/5">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase text-white/50">
                  <tr>
                    <th className="px-4 py-2 text-left">Modelo</th>
                    <th className="px-4 py-2 text-left">Provedor</th>
                    <th className="px-4 py-2 text-right">Qualidade PT-BR</th>
                    <th className="px-4 py-2 text-right">Velocidade</th>
                  </tr>
                </thead>
                <tbody>
                  {modelos.map((m) => (
                    <tr key={m.id} className="border-t border-white/5">
                      <td className="px-4 py-2">
                        <code className="text-white">{m.modelo_id}</code>
                        <div className="text-xs text-white/40">{m.nome_amigavel}</div>
                      </td>
                      <td className="px-4 py-2 text-white/60 capitalize">{m.provedor_nome}</td>
                      <td className="px-4 py-2 text-right">
                        <Stars n={m.qualidade_ptbr} max={10} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Stars n={m.velocidade} max={10} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Segurança */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" /> Segurança
          </h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="h-4 w-4" /> API keys criptografadas no banco (AES-256)
            </li>
            <li className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="h-4 w-4" /> Autenticação JWT com expiração 7 dias
            </li>
            <li className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="h-4 w-4" /> OpenRouter limite $0 (só modelos free)
            </li>
            <li className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="h-4 w-4" /> Backup diário automático às 3h
            </li>
            <li className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="h-4 w-4" /> Backend em HTTP (proxy via Vercel HTTPS resolve mixed content)
            </li>
          </ul>
        </section>

        <p className="mt-6 text-center text-xs text-white/30">
          JARVIS Admin · v1.0 · {new Date().getFullYear()}
        </p>
      </div>
    </AppShell>
  );
}

function StatusCard({ label, status, subtitle }: { label: string; status: boolean; subtitle?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${status ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
      <div className="mt-1 text-xs text-white/40">{status ? 'Online' : 'Offline'}{subtitle ? ` · ${subtitle}` : ''}</div>
    </div>
  );
}

function Stars({ n, max }: { n: number; max: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[...Array(max)].map((_, i) => (
        <span key={i} className={`text-xs ${i < n ? 'text-amber-400' : 'text-white/10'}`}>★</span>
      ))}
    </span>
  );
}
