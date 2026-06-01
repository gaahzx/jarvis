// Em produção (Vercel HTTPS), chamamos via /api/proxy/* que faz server-side fetch HTTP
// para o backend na VPS (sem Mixed Content)
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('jarvis_token');
}

export function setToken(token: string) {
  localStorage.setItem('jarvis_token', token);
}

export function clearToken() {
  localStorage.removeItem('jarvis_token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Path vem como /api/empresas → vira /api/proxy/empresas
  const proxyPath = path.replace(/^\/api/, '/api/proxy');
  const res = await fetch(proxyPath, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Não autorizado');
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/api/auth/me'),

  // Dashboard
  stats: () => request('/api/dashboard/stats'),
  consumoMensal: () => request('/api/dashboard/consumo-mensal'),

  // Empresas
  listEmpresas: () => request('/api/empresas'),
  getEmpresa: (id: string) => request(`/api/empresas/${id}`),
  createEmpresa: (data: any) =>
    request('/api/empresas', { method: 'POST', body: JSON.stringify(data) }),
  updateEmpresa: (id: string, data: any) =>
    request(`/api/empresas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmpresa: (id: string) =>
    request(`/api/empresas/${id}`, { method: 'DELETE' }),
  updateIdentidade: (id: string, data: any) =>
    request(`/api/empresas/${id}/identidade`, { method: 'PUT', body: JSON.stringify(data) }),

  // Serviços
  addServico: (empresaId: string, data: any) =>
    request(`/api/empresas/${empresaId}/servicos`, { method: 'POST', body: JSON.stringify(data) }),
  deleteServico: (empresaId: string, servicoId: string) =>
    request(`/api/empresas/${empresaId}/servicos/${servicoId}`, { method: 'DELETE' }),

  // FAQ
  addFaq: (empresaId: string, data: any) =>
    request(`/api/empresas/${empresaId}/faq`, { method: 'POST', body: JSON.stringify(data) }),
  deleteFaq: (empresaId: string, faqId: string) =>
    request(`/api/empresas/${empresaId}/faq/${faqId}`, { method: 'DELETE' }),

  // API Keys
  setApiKey: (id: string, data: any) =>
    request(`/api/empresas/${id}/api-key`, { method: 'PUT', body: JSON.stringify(data) }),
  clearApiKey: (id: string) =>
    request(`/api/empresas/${id}/api-key`, { method: 'DELETE' }),
  testApiKey: (id: string) =>
    request(`/api/empresas/${id}/api-key/test`, { method: 'POST' }),

  // Provedores e Modelos
  provedores: () => request('/api/provedores'),
  modelos: (gratisApenas = false) =>
    request(`/api/modelos${gratisApenas ? '?gratis_apenas=true' : ''}`),

  // Horários
  updateHorarios: (id: string, horarios: any[]) =>
    request(`/api/empresas/${id}/horarios`, { method: 'PUT', body: JSON.stringify({ horarios }) }),

  // Conversas / Atividade
  conversasAtivas: () => request('/api/conversas/ativas'),
  conversasDaEmpresa: (id: string) => request(`/api/empresas/${id}/conversas`),
  mensagensDaConversa: (id: string) => request(`/api/conversas/${id}/mensagens`),
  escalonamentos: (resolvido?: boolean) =>
    request(`/api/escalonamentos${resolvido !== undefined ? `?resolvido=${resolvido}` : ''}`),

  // Consumo e Métricas
  consumoEmpresa: (id: string) => request(`/api/empresas/${id}/consumo`),
  consumoDiario: (id: string) => request(`/api/empresas/${id}/consumo/diario`),
  metricasEmpresa: (id: string, periodo?: number) =>
    request(`/api/empresas/${id}/metricas${periodo ? `?periodo=${periodo}` : ''}`),
  consumoGlobal: (periodo?: number) =>
    request(`/api/consumo/global${periodo ? `?periodo=${periodo}` : ''}`),
  funilEmpresa: (id: string, periodo?: number) =>
    request(`/api/empresas/${id}/funil${periodo ? `?periodo=${periodo}` : ''}`),

  // Clientes
  clientesDaEmpresa: (id: string, search?: string) =>
    request(`/api/empresas/${id}/clientes${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  atualizarCliente: (empresaId: string, numero: string, data: any) =>
    request(`/api/empresas/${empresaId}/clientes/${encodeURIComponent(numero)}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Blacklist
  blacklist: (id: string) => request(`/api/empresas/${id}/blacklist`),
  adicionarBlacklist: (id: string, numero: string, motivo?: string) =>
    request(`/api/empresas/${id}/blacklist`, { method: 'POST', body: JSON.stringify({ numero, motivo }) }),
  removerBlacklist: (id: string, numero: string) =>
    request(`/api/empresas/${id}/blacklist/${encodeURIComponent(numero)}`, { method: 'DELETE' }),

  // Lista de Espera
  listaEspera: (id: string) => request(`/api/empresas/${id}/lista-espera`),
  removerListaEspera: (id: string, leId: string) =>
    request(`/api/empresas/${id}/lista-espera/${leId}`, { method: 'DELETE' }),
  notificarListaEspera: (id: string, leId: string) =>
    request(`/api/empresas/${id}/lista-espera/${leId}/notificar`, { method: 'POST' }),

  // Marketing / Criativos (campanha própria do JARVIS)
  gerarCriativos: (_: string, briefing: any) =>
    request('/api/marketing/criativos', { method: 'POST', body: JSON.stringify(briefing) }),
  historicoMarketing: () =>
    request('/api/marketing/historico'),

  // Templates por segmento
  segmentoTemplates: () => request(`/api/empresas/segmento-templates`),
  aplicarTemplate: (id: string, segmento: string) =>
    request(`/api/empresas/${id}/identidade/aplicar-template`, { method: 'POST', body: JSON.stringify({ segmento }) }),

  // Agendamentos
  agendamentosDaEmpresa: (id: string, status?: string) =>
    request(`/api/empresas/${id}/agendamentos${status ? `?status=${status}` : ''}`),
  agendamentosPendentes: () => request('/api/agendamentos/pendentes'),
  agendamentosDia: (data?: string) => request(`/api/agendamentos/dia${data ? `?data=${data}` : ''}`),
  verificarDisponibilidade: (empresaId: string, dataHora: string, duracaoMinutos?: number) =>
    request(`/api/empresas/${empresaId}/agendamentos/disponibilidade?data_hora=${encodeURIComponent(dataHora)}&duracao_minutos=${duracaoMinutos || 60}`),
  criarAgendamento: (empresaId: string, data: any) =>
    request(`/api/empresas/${empresaId}/agendamentos`, { method: 'POST', body: JSON.stringify(data) }),
  atualizarAgendamento: (id: string, data: any) =>
    request(`/api/agendamentos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletarAgendamento: (id: string) =>
    request(`/api/agendamentos/${id}`, { method: 'DELETE' }),

  // Prospecção
  post: (path: string, data: any) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path: string, data: any) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
  get: (path: string) => request(path),
  patch: (path: string, data: any) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),

  // Chat Test
  chatTest: (empresaId: string, message: string, history: any[] = []) =>
    request(`/api/empresas/${empresaId}/chat-test`, {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),

  resolverEscalonamento: (id: string, feedback?: string) =>
    request(`/api/escalonamentos/${id}`, { method: 'PUT', body: JSON.stringify({ feedback }) }),

  // Usuários da empresa (admin cria login pra empresa)
  listUsuarios: (empresaId: string) =>
    request(`/api/empresas/${empresaId}/usuarios`),
  createUsuario: (empresaId: string, data: any) =>
    request(`/api/empresas/${empresaId}/usuarios`, { method: 'POST', body: JSON.stringify(data) }),
  updateUsuario: (empresaId: string, uid: string, data: any) =>
    request(`/api/empresas/${empresaId}/usuarios/${uid}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUsuario: (empresaId: string, uid: string) =>
    request(`/api/empresas/${empresaId}/usuarios/${uid}`, { method: 'DELETE' }),

  // WhatsApp
  createWhatsApp: (id: string, data: any) =>
    request(`/api/empresas/${id}/whatsapp`, { method: 'POST', body: JSON.stringify(data) }),
  getQrWhatsApp: (id: string, instancia: string) =>
    request(`/api/empresas/${id}/whatsapp/${instancia}/qr`),
  stateWhatsApp: (id: string, instancia: string) =>
    request(`/api/empresas/${id}/whatsapp/${instancia}/state`),
  logoutWhatsApp: (id: string, instancia: string) =>
    request(`/api/empresas/${id}/whatsapp/${instancia}/logout`, { method: 'POST' }),
  atualizarWebhook: (id: string, instancia: string) =>
    request(`/api/empresas/${id}/whatsapp/${instancia}/webhook`, { method: 'POST' }),
  deleteWhatsApp: (id: string, instancia: string) =>
    request(`/api/empresas/${id}/whatsapp/${instancia}`, { method: 'DELETE' }),
};
