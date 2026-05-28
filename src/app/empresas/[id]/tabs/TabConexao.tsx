'use client';

import { useState, useEffect, useRef } from 'react';
import { Smartphone, Wifi, WifiOff, Plus, Trash2, RefreshCw, Loader2, QrCode, Power, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const API_BASE = '/api/proxy';

async function callApi(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem('jarvis_token');
  const res = await fetch(`${API_BASE}${path.replace(/^\/api/, '')}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'erro' }));
    throw new Error(err.error || 'Erro');
  }
  return res.json();
}

export function TabConexao({ data, reload }: any) {
  const empresaId = data.empresa.id;
  const [showAdd, setShowAdd] = useState(false);
  const [instName, setInstName] = useState('');
  const [apelido, setApelido] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrData, setQrData] = useState<Record<string, any>>({});
  const [polling, setPolling] = useState<string | null>(null);
  // Tracks which instances are in active QR polling (awaiting scan)
  const [pollingQr, setPollingQr] = useState<Record<string, boolean>>({});
  // Interval refs per instance: { [instancia]: { status: id, qr: id } }
  const intervals = useRef<Record<string, { status?: ReturnType<typeof setInterval>; qr?: ReturnType<typeof setInterval> }>>({});

  // Clean up all intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(intervals.current).forEach(({ status, qr }) => {
        if (status) clearInterval(status);
        if (qr) clearInterval(qr);
      });
    };
  }, []);

  function stopPolling(instancia: string) {
    const iv = intervals.current[instancia];
    if (iv?.status) clearInterval(iv.status);
    if (iv?.qr) clearInterval(iv.qr);
    intervals.current[instancia] = {};
    setPollingQr((prev) => ({ ...prev, [instancia]: false }));
  }

  async function startQrPolling(instancia: string) {
    stopPolling(instancia);

    // Poll connection state every 4s
    const ivStatus = setInterval(async () => {
      const r = await callApi(`/empresas/${empresaId}/whatsapp/${instancia}/state`).catch(() => null);
      if (r?.instance?.state === 'open') {
        stopPolling(instancia);
        setQrData((prev) => ({ ...prev, [instancia]: { connected: true } }));
        toast.success('WhatsApp conectado!');
        await reload();
      }
    }, 4000);

    // Renew QR every 50s (expires in ~60s)
    const ivQr = setInterval(async () => {
      const r = await callApi(`/empresas/${empresaId}/whatsapp/${instancia}/qr`).catch(() => null);
      const qr = r?.base64 || r?.qrcode?.base64 || r?.qr || null;
      if (qr) setQrData((prev) => ({ ...prev, [instancia]: { ...prev[instancia], qr, base64: qr } }));
    }, 50000);

    intervals.current[instancia] = { status: ivStatus, qr: ivQr };
    setPollingQr((prev) => ({ ...prev, [instancia]: true }));
  }

  async function createInstance() {
    if (!instName) return toast.error('Nome da instância obrigatório');
    if (!/^[a-z0-9_-]+$/.test(instName)) return toast.error('Use apenas letras minúsculas, números, _ ou -');
    setCreating(true);
    try {
      await callApi(`/empresas/${empresaId}/whatsapp`, {
        method: 'POST',
        body: JSON.stringify({ instancia_evo: instName, apelido }),
      });
      toast.success('Instância criada! Gerando QR...');
      setShowAdd(false);
      const instNameCopy = instName;
      setInstName('');
      setApelido('');
      await reload();
      // Fetch QR after short delay (Evolution needs ~2s)
      setTimeout(() => fetchQR(instNameCopy), 2000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function fetchQR(instancia: string) {
    setPolling(instancia);
    try {
      // Retry up to 6 times with 2s interval (Evolution needs a few seconds to generate QR)
      let qr: string | null = null;
      for (let tentativa = 1; tentativa <= 6; tentativa++) {
        const r = await callApi(`/empresas/${empresaId}/whatsapp/${instancia}/qr`);
        // Handle all possible field names Evolution API may return
        qr = r?.base64 || r?.qrcode?.base64 || r?.qr || null;
        if (qr || r?.connected) {
          if (r?.connected) {
            toast.success('WhatsApp já conectado!');
            await reload();
            setPolling(null);
            return;
          }
          break;
        }
        if (tentativa < 6) await new Promise((res) => setTimeout(res, 2000));
      }

      if (qr) {
        setQrData((prev) => ({ ...prev, [instancia]: { qr, base64: qr } }));
        toast.success('QR gerado! Escaneie com seu WhatsApp.');
        await startQrPolling(instancia);
      } else {
        toast.error('Não foi possível gerar o QR. Tente novamente.');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPolling(null);
    }
  }

  async function checkState(instancia: string) {
    try {
      const r = await callApi(`/empresas/${empresaId}/whatsapp/${instancia}/state`);
      if (r.instance?.state === 'open') {
        toast.success('Conectado!');
        stopPolling(instancia);
        await reload();
      } else {
        toast.info(`Estado: ${r.instance?.state}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function logout(instancia: string) {
    if (!confirm('Desconectar essa instância?')) return;
    try {
      await callApi(`/empresas/${empresaId}/whatsapp/${instancia}/logout`, { method: 'POST' });
      stopPolling(instancia);
      setQrData((prev) => { const n = { ...prev }; delete n[instancia]; return n; });
      toast.success('Desconectado');
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function ativarWebhook(instancia: string) {
    try {
      await api.atualizarWebhook(empresaId, instancia);
      toast.success('Webhook da IA ativado! Mensagens do WhatsApp agora chegam direto para a IA.');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function deleteInstance(instancia: string) {
    if (!confirm('Excluir essa instância? Não dá pra reverter.')) return;
    try {
      await callApi(`/empresas/${empresaId}/whatsapp/${instancia}`, { method: 'DELETE' });
      stopPolling(instancia);
      setQrData((prev) => {
        const n = { ...prev };
        delete n[instancia];
        return n;
      });
      toast.success('Excluída');
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-200">
        📱 Conexões WhatsApp. Crie uma instância, escaneie o QR Code com o WhatsApp da empresa, e está pronto.
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-white">Instâncias</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {showAdd ? 'Cancelar' : 'Nova instância'}
        </button>
      </div>

      {showAdd && (
        <div className="card p-5 space-y-3">
          <div>
            <label className="label">Nome da instância (slug)</label>
            <input
              className="input"
              placeholder="clinicavida"
              value={instName}
              onChange={(e) => setInstName(e.target.value.toLowerCase())}
            />
            <p className="text-xs text-white/40 mt-1">Apenas letras minúsculas, números, _ ou -</p>
          </div>
          <div>
            <label className="label">Apelido (opcional)</label>
            <input className="input" placeholder="WhatsApp principal" value={apelido} onChange={(e) => setApelido(e.target.value)} />
          </div>
          <button onClick={createInstance} disabled={creating} className="btn-primary flex items-center gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Criar e gerar QR
          </button>
        </div>
      )}

      {data.conexoes.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <Smartphone className="mx-auto h-12 w-12 mb-3 text-white/20" />
          <p>Nenhuma conexão WhatsApp ainda.</p>
          <p className="text-xs mt-1">Clique em &quot;Nova instância&quot; pra começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.conexoes.map((c: any) => {
            const qr = qrData[c.instancia_evo];
            const conectado = c.status === 'conectado' || qr?.connected;
            const aguardandoScan = pollingQr[c.instancia_evo];
            const qrSrc = qr?.base64
              ? (qr.base64.startsWith('data:') ? qr.base64 : `data:image/png;base64,${qr.base64}`)
              : qr?.qr || null;
            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      conectado ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {conectado ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{c.apelido || c.instancia_evo}</h4>
                      <p className="text-xs text-white/50">
                        Instância: <code className="bg-white/5 px-1.5 py-0.5 rounded">{c.instancia_evo}</code>
                      </p>
                      {c.numero && <p className="text-xs text-white/60 mt-1">📱 {c.numero}</p>}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    conectado ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {conectado ? 'Conectado' : c.status}
                  </span>
                </div>

                {/* Área do QR */}
                {!conectado && (
                  <div className="bg-black/40 rounded-xl p-5 border border-white/5">
                    {qrSrc ? (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-sm text-white/60 text-center">
                          Abra o WhatsApp → <strong className="text-white">⋮ Menu</strong> → <strong className="text-white">Aparelhos conectados</strong> → <strong className="text-white">Conectar aparelho</strong>
                        </p>
                        <div className="bg-white p-4 rounded-2xl shadow-2xl">
                          <img
                            src={qrSrc}
                            alt="QR Code"
                            className="w-72 h-72"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </div>
                        {qr?.pairingCode && (
                          <div className="text-center">
                            <p className="text-xs text-white/40 mt-2">Ou use o código de pareamento:</p>
                            <code className="text-lg font-bold text-brand-300 tracking-widest">{qr.pairingCode}</code>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-amber-400 text-xs">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando escaneamento... (renova automaticamente)
                        </div>
                      </div>
                    ) : polling === c.instancia_evo ? (
                      <div className="flex flex-col items-center py-8 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
                        <p className="text-sm text-white/60">Gerando QR Code...</p>
                        <p className="text-xs text-white/30">Pode levar até 12 segundos</p>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <QrCode className="mx-auto h-12 w-12 text-white/20 mb-3" />
                        <p className="text-sm text-white/60 mb-3">Clique pra gerar o QR Code</p>
                        <button onClick={() => fetchQR(c.instancia_evo)} className="btn-primary inline-flex items-center gap-2">
                          <QrCode className="h-4 w-4" />
                          Gerar QR Code
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Ações */}
                <div className="mt-4 flex gap-2 justify-end flex-wrap">
                  {conectado && (
                    <button
                      onClick={() => ativarWebhook(c.instancia_evo)}
                      className="btn-primary text-sm flex items-center gap-2 bg-violet-500/20 border-violet-500/30 text-violet-300 hover:bg-violet-500/30"
                    >
                      <Zap className="h-3 w-3" />
                      Ativar Webhook IA
                    </button>
                  )}
                  <button onClick={() => checkState(c.instancia_evo)} className="btn-secondary text-sm flex items-center gap-2">
                    <RefreshCw className="h-3 w-3" />
                    Verificar
                  </button>
                  {conectado && (
                    <button onClick={() => logout(c.instancia_evo)} className="btn-secondary text-sm flex items-center gap-2">
                      <Power className="h-3 w-3" />
                      Desconectar
                    </button>
                  )}
                  <button onClick={() => deleteInstance(c.instancia_evo)} className="btn-danger text-sm flex items-center gap-2">
                    <Trash2 className="h-3 w-3" />
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-200/80">
        <strong>⚠️ Aviso técnico:</strong> A geração do QR depende do Evolution API + Baileys (engine WhatsApp Web). Se o QR não aparecer em ~30s, pode ser problema temporário do Baileys. Veja <code>dashboard/WHATSAPP_PROVIDERS.md</code> para alternativas (Z-API, WhatsApp Cloud API, etc).
      </div>
    </div>
  );
}
