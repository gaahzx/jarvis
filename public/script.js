// ========== JARVIS COCKPIT - CLIENT LOGIC ==========

// DOM Elements
const terminal = document.getElementById('terminal-output');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const avatarContainer = document.querySelector('.avatar-container');
const avatarStatus = document.getElementById('avatar-status');
const fileAttach = document.getElementById('file-attach');

// ========== PARTICLE ORB — Rainbow Sphere ==========
class ParticleOrb {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'idle';
    this.time = 0;
    this.speedMul = 1;
    this.targetSpeed = 1;
    this.stateSpeeds = { idle: 0.4, listening: 0.8, thinking: 1.5, speaking: 1.0 };

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Rainbow colors
    this.rainbow = [
      [255, 0, 0],     // red
      [255, 127, 0],   // orange
      [255, 255, 0],   // yellow
      [0, 255, 0],     // green
      [0, 200, 255],   // cyan
      [0, 100, 255],   // blue
      [139, 0, 255],   // violet
      [255, 0, 200],   // pink
    ];

    // Create particles — sphere distribution
    this.count = 250;
    this.particles = [];
    for (let i = 0; i < this.count; i++) {
      const roll = Math.random();
      const sz = roll < 0.15 ? (3.5 + Math.random() * 4) :
                 roll < 0.45 ? (2 + Math.random() * 2.5) :
                               (1 + Math.random() * 1.5);
      this.particles.push({
        theta: Math.random() * Math.PI * 2,
        phi: Math.acos(2 * Math.random() - 1),
        radius: 0.3 + Math.random() * 0.5,
        speed: 0.003 + Math.random() * 0.005,
        size: sz,
        opacity: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        colorIdx: Math.random(), // 0-1 position in rainbow
        orbitTilt: Math.random() * 0.4 - 0.2, // slight tilt variation
      });
    }

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setState(state) {
    this.state = state;
    this.targetSpeed = this.stateSpeeds[state] || 0.4;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.size = Math.max(rect.width, rect.height, 300);
    this.canvas.width = this.size * this.dpr;
    this.canvas.height = this.size * this.dpr;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cx = this.size / 2;
    this.cy = this.size / 2;
    this.R = this.size * 0.38;
  }

  getRainbowColor(t) {
    // t is 0-1, returns [r, g, b]
    const idx = t * (this.rainbow.length - 1);
    const i = Math.floor(idx);
    const f = idx - i;
    const c1 = this.rainbow[i % this.rainbow.length];
    const c2 = this.rainbow[(i + 1) % this.rainbow.length];
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * f),
      Math.round(c1[1] + (c2[1] - c1[1]) * f),
      Math.round(c1[2] + (c2[2] - c1[2]) * f),
    ];
  }

  animate() {
    const ctx = this.ctx;
    const cx = this.cx;
    const cy = this.cy;
    const S = this.size;
    const R = this.R;
    this.time += 0.016;
    this.speedMul += (this.targetSpeed - this.speedMul) * 0.03;
    const t = this.time * this.speedMul;

    ctx.clearRect(0, 0, S, S);

    // Soft ambient glow
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 1.2);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
    glow.addColorStop(0, `rgba(150,100,255,${0.06 * pulse})`);
    glow.addColorStop(0.5, `rgba(0,200,255,${0.02 * pulse})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, S, S);

    // Project and sort particles
    const projected = [];
    for (const p of this.particles) {
      p.theta += p.speed * this.speedMul;

      // Sphere position
      let r = p.radius * R;

      // State effects
      if (this.state === 'speaking') {
        r *= 1 + 0.1 * Math.sin(t * 5 + p.phase);
      } else if (this.state === 'listening') {
        r *= 0.85 + 0.15 * Math.sin(t * 2.5 + p.phase);
      } else if (this.state === 'thinking') {
        p.theta += p.speed * 0.5; // extra rotation
      }

      const x3d = r * Math.sin(p.phi) * Math.cos(p.theta);
      const y3d = r * Math.sin(p.phi) * Math.sin(p.theta) + r * p.orbitTilt * Math.sin(t * 0.5);
      const z3d = r * Math.cos(p.phi);

      // Perspective
      const perspective = S * 0.9;
      const scale = perspective / (perspective + z3d);
      const x2d = cx + x3d * scale;
      const y2d = cy + y3d * scale;
      const depth = (z3d + R) / (R * 2);

      // Rainbow color — shifts over time for flowing effect
      const colorPos = (p.colorIdx + this.time * 0.05) % 1;
      const [cr, cg, cb] = this.getRainbowColor(colorPos);

      projected.push({ x: x2d, y: y2d, z: z3d, depth, scale, p, cr, cg, cb });
    }

    projected.sort((a, b) => a.z - b.z);

    // Draw particles
    for (const { x, y, depth, scale, p, cr, cg, cb } of projected) {
      const alpha = p.opacity * (0.2 + 0.8 * depth) * (0.85 + 0.15 * Math.sin(this.time * 1.5 + p.phase));
      const sz = p.size * scale * (0.5 + 0.5 * depth);

      // Main dot
      ctx.beginPath();
      ctx.arc(x, y, Math.max(sz, 0.5), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(2)})`;
      ctx.fill();

      // Glow
      if (sz > 1.5) {
        ctx.beginPath();
        ctx.arc(x, y, sz * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${(alpha * 0.1).toFixed(3)})`;
        ctx.fill();
      }
      if (sz > 3.5) {
        ctx.beginPath();
        ctx.arc(x, y, sz * 4.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${(alpha * 0.04).toFixed(3)})`;
        ctx.fill();
      }
    }

    // Core — white/rainbow glow
    const coreR = S * 0.025 + S * 0.01 * pulse;
    const coreColor = this.getRainbowColor((this.time * 0.1) % 1);
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    core.addColorStop(0, `rgba(255,255,255,${0.5 * pulse})`);
    core.addColorStop(0.5, `rgba(${coreColor[0]},${coreColor[1]},${coreColor[2]},${0.25 * pulse})`);
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(this.animate);
  }
}

// Initialize particle orb (after layout settles)
let particleOrb = null;
requestAnimationFrame(() => {
  const particleCanvas = document.getElementById('particle-orb');
  if (particleCanvas) {
    particleOrb = new ParticleOrb(particleCanvas);
    window.particleOrb = particleOrb;
  }
});

// State
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let currentAttachment = null;
let voiceEnabled = true;
let ttsVoice = localStorage.getItem('ttsVoice') || 'ash';

// Realtime API supports a different voice set than TTS.
// Map TTS voice to nearest valid Realtime voice.
const REALTIME_VOICES = new Set(['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar']);
const REALTIME_VOICE_MAP = { onyx: 'ash', nova: 'shimmer', fable: 'sage' };
function getRealtimeVoice() {
  if (REALTIME_VOICES.has(ttsVoice)) return ttsVoice;
  return REALTIME_VOICE_MAP[ttsVoice] || 'ash';
}

let wakeWordEnabled = false;
let wakeWordRecognition = null;
let ttsQueue = [];
let ttsPlaying = false;
let userGestureReceived = false;
let webSpeechRec = null;
const canWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

// ========== SCREEN CAPTURE (LIVE MODE) ==========
let capturedScreen = null;    // base64 PNG of last captured frame
let screenStream = null;       // persistent stream for live mode
let liveScreenMode = false;    // when true: stream stays alive, fresh frame per query
let hiddenVideo = null;        // off-screen video element bound to stream

const screenBtn = document.getElementById('screen-btn');

function stopScreenCapture() {
  capturedScreen = null;
  liveScreenMode = false;
  if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); screenStream = null; }
  if (hiddenVideo) { hiddenVideo.srcObject = null; hiddenVideo.remove(); hiddenVideo = null; }
  document.getElementById('screen-preview-box')?.remove();
  screenBtn.classList.remove('active');
}

// Legacy alias (existing X button callback expects this name)
const removeScreenPreview = stopScreenCapture;

// Grab latest frame from the live stream (returns base64 dataURL)
async function grabLatestFrame() {
  if (!hiddenVideo || hiddenVideo.readyState < 2) return capturedScreen;
  const canvas = document.createElement('canvas');
  canvas.width = hiddenVideo.videoWidth || 1920;
  canvas.height = hiddenVideo.videoHeight || 1080;
  canvas.getContext('2d').drawImage(hiddenVideo, 0, 0);
  capturedScreen = canvas.toDataURL('image/jpeg', 0.85); // jpeg for smaller payload
  return capturedScreen;
}

async function captureScreen() {
  // Toggle off if already active
  if (liveScreenMode || capturedScreen) {
    stopScreenCapture();
    addTerminalLine(
      currentLang === 'BR' ? '[system] Compartilhamento de tela desligado.' : '[system] Screen sharing stopped.',
      'system-line'
    );
    return;
  }

  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'monitor', width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 15 } },
      audio: false,
      preferCurrentTab: false,
      selfBrowserSurface: 'exclude',
      surfaceSwitching: 'exclude',
      monitorTypeSurfaces: 'include'
    });

    // Bind stream to a hidden <video> so we can grab frames on demand
    hiddenVideo = document.createElement('video');
    hiddenVideo.autoplay = true;
    hiddenVideo.muted = true;
    hiddenVideo.playsInline = true;
    hiddenVideo.style.position = 'fixed';
    hiddenVideo.style.left = '-9999px';
    hiddenVideo.srcObject = screenStream;
    document.body.appendChild(hiddenVideo);
    await new Promise((resolve) => {
      hiddenVideo.onloadedmetadata = () => { hiddenVideo.play().then(resolve).catch(resolve); };
    });

    // User stops sharing via browser UI → clean up
    screenStream.getVideoTracks()[0].addEventListener('ended', () => {
      stopScreenCapture();
      addTerminalLine(
        currentLang === 'BR' ? '[system] Compartilhamento encerrado pelo navegador.' : '[system] Sharing ended by browser.',
        'system-line'
      );
    });

    liveScreenMode = true;
    await grabLatestFrame();
    showScreenPreview(capturedScreen);
    screenBtn.classList.add('active');

    addTerminalLine(
      currentLang === 'BR'
        ? '[system] 🔴 LIVE — tela compartilhada. JARVIS vê em tempo real. Fale ou digite suas perguntas.'
        : '[system] 🔴 LIVE — screen shared. JARVIS sees in real-time. Speak or type your questions.',
      'system-line'
    );
  } catch (err) {
    if (err.name !== 'NotAllowedError') {
      addTerminalLine(`[error] Screen capture failed: ${err.message}`, 'error-line');
    }
    stopScreenCapture();
  }
}

function showScreenPreview(dataUrl) {
  document.getElementById('screen-preview-box')?.remove();

  const preview = document.createElement('div');
  preview.id = 'screen-preview-box';
  preview.className = 'screen-preview live';
  preview.innerHTML = `
    <img src="${dataUrl}" alt="Live screen">
    <span class="screen-label">LIVE</span>
    <button class="remove-screen" title="Stop sharing">✕</button>
  `;
  preview.querySelector('.remove-screen').onclick = stopScreenCapture;

  // Posicionar acima do terminal (canto inferior direito)
  preview.style.cssText = 'position:fixed; bottom:200px; right:16px; width:360px; z-index:51;';
  document.body.appendChild(preview);
}

function updatePreviewImage(dataUrl) {
  const img = document.querySelector('#screen-preview-box img');
  if (img) img.src = dataUrl;
}

async function analyzeScreen(userMessage) {
  // In live mode, grab a FRESH frame for every question
  if (liveScreenMode) {
    await grabLatestFrame();
    updatePreviewImage(capturedScreen);
  }
  if (!capturedScreen) return null;

  const screen = capturedScreen;
  setAvatarState('thinking');

  try {
    // Fast path: GPT-4o-mini vision (~1s, real-time)
    const res = await fetch('/api/analyze-screen-fast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: screen, message: userMessage, language: currentLang, saveHistory: true })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.response) return data.response;
    }
    // Fallback: Claude vision (deeper analysis)
    const res2 = await fetch('/api/analyze-screen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: screen, message: userMessage, language: currentLang, saveHistory: true })
    });
    const data2 = await res2.json();
    return data2.response || null;
  } catch (err) {
    addTerminalLine(`[error] Screen analysis failed: ${err.message}`, 'error-line');
    return null;
  }
}

screenBtn?.addEventListener('click', captureScreen);

// ========== CONCLAVE TOGGLE ==========
let conclaveEnabled = localStorage.getItem('jarvis-conclave') !== 'false';

function initConclaveToggle() {
  const cb = document.getElementById('conclave-checkbox');
  const chip = cb?.closest('.mega-chip');
  if (!cb) return;

  cb.checked = conclaveEnabled;
  if (!conclaveEnabled) chip?.classList.add('conclave-off');

  cb.addEventListener('change', () => {
    conclaveEnabled = cb.checked;
    localStorage.setItem('jarvis-conclave', conclaveEnabled);
    if (conclaveEnabled) chip?.classList.remove('conclave-off');
    else chip?.classList.add('conclave-off');
  });
}

// ========== LANGUAGE STATE ==========
let currentLang = localStorage.getItem('jarvis-lang') || 'BR';

function initLangToggle() {
  const enBtn = document.getElementById('lang-en');
  const brBtn = document.getElementById('lang-br');
  const esBtn = document.getElementById('lang-es');
  if (!enBtn || !brBtn) return;

  function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('jarvis-lang', lang);
    enBtn.classList.toggle('active', lang === 'EN');
    brBtn.classList.toggle('active', lang === 'BR');
    if (esBtn) esBtn.classList.toggle('active', lang === 'ES');
    const placeholders = {
      BR: 'Fale com o JARVIS...',
      ES: 'Habla con JARVIS...',
      EN: 'Talk to JARVIS...'
    };
    document.getElementById('chat-input').placeholder = placeholders[lang] || placeholders.EN;
    const bootMsg = document.getElementById('boot-msg');
    if (bootMsg) {
      const boots = {
        BR: '[system] JARVIS COCKPIT INICIALIZADO. TODO SISTEMA DE INTELIGÊNCIA CARREGADO COM SUCESSO E PRONTO PARA USO.',
        ES: '[system] JARVIS COCKPIT INICIADO. TODO EL SISTEMA DE INTELIGENCIA CARGADO CON ÉXITO Y LISTO PARA USAR.',
        EN: '[system] JARVIS COCKPIT ONLINE. ALL SYSTEMS LOADED AND READY.'
      };
      bootMsg.textContent = boots[lang] || boots.EN;
    }
    // Update tab labels based on language
    const langKey = `data-lang-${lang.toLowerCase()}`;
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
      const label = btn.getAttribute(langKey);
      if (label) btn.textContent = label;
    });

    // If Realtime is active, reconnect to pick up new language instructions
    if (realtimeActive) { stopRealtime(); setTimeout(() => startRealtime(), 300); }
  }

  applyLang(currentLang);

  enBtn.addEventListener('click', () => { if (currentLang !== 'EN') applyLang('EN'); });
  brBtn.addEventListener('click', () => { if (currentLang !== 'BR') applyLang('BR'); });
  if (esBtn) esBtn.addEventListener('click', () => { if (currentLang !== 'ES') applyLang('ES'); });
}

// ========== AUDIO CONTEXT (SOUND FEEDBACK) ==========
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration = 80, vol = 0.1) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch {}
}

function playSendSound() { playTone(880, 60); setTimeout(() => playTone(1100, 60), 70); }
function playReceiveSound() { playTone(660, 80); }
function playErrorSound() { playTone(440, 100); setTimeout(() => playTone(330, 150), 120); }

// ========== TERMINAL RENDERING ==========
function getTimestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function addTerminalLine(text, type = '') {
  const line = document.createElement('div');
  line.className = `terminal-line ${type}`;
  const ts = document.createElement('span');
  ts.className = 'ts';
  ts.textContent = `[${getTimestamp()}]`;
  const msg = document.createElement('span');
  msg.className = 'msg';

  if (type === '' || type === 'jarvis-line') {
    msg.innerHTML = renderMarkdown(text);
    addCopyButtons(msg);
  } else {
    msg.textContent = text;
  }

  line.appendChild(ts);
  line.appendChild(document.createTextNode(' '));
  line.appendChild(msg);
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

let pendingAckTTS = null; // Track ACK that needs TTS

// ========== MODEL CARD HIGHLIGHTING ==========
function setActiveModel(model) {
  document.querySelectorAll('.model-card').forEach(c => c.classList.remove('active-model'));
  const id = model === 'opus' ? 'model-opus' : model === 'sonnet' ? 'model-sonnet' : 'model-haiku';
  document.getElementById(id)?.classList.add('active-model');
}

// ========== AGENT CHIP HIGHLIGHTING ==========
function highlightAgents(text) {
  document.querySelectorAll('.agent-chip').forEach(c => c.classList.remove('active-agent'));
  const agentMap = {
    'dev': 'dev', 'architect': 'architect', 'qa': 'qa', 'pm': 'pm',
    'po': 'po', 'devops': 'devops', 'analyst': 'analyst', 'ux': 'ux',
    'sm': 'sm', 'data-eng': 'data-eng', 'data-engineer': 'data-eng',
    'aios-master': 'aios-master', 'orion': 'aios-master',
    'conclave': 'conclave', 'crítico': 'conclave', 'advogado': 'conclave', 'sintetizador': 'conclave',
  };
  const lower = text.toLowerCase();
  for (const [keyword, dataAgent] of Object.entries(agentMap)) {
    if (lower.includes(`@${keyword}`) || lower.includes(keyword)) {
      document.querySelector(`.agent-chip[data-agent="${dataAgent}"]`)?.classList.add('active-agent');
    }
  }
}

// Show which model is active based on agent chip selection
function setModelFromAgent(agentEl) {
  if (!agentEl) return;
  document.querySelectorAll('.model-card').forEach(c => c.classList.remove('active-model'));
  if (agentEl.classList.contains('model-opus'))   document.getElementById('model-opus')?.classList.add('active-model');
  if (agentEl.classList.contains('model-sonnet')) document.getElementById('model-sonnet')?.classList.add('active-model');
  if (agentEl.classList.contains('model-haiku'))  document.getElementById('model-haiku')?.classList.add('active-model');
}

function processStreamLine(line) {
  if (!line.trim()) return;

  if (line.startsWith('[translated]')) {
    // Replace last user line in terminal with English translation
    const translated = line.slice(12).trim();
    const userLines = terminal.querySelectorAll('.user-line');
    if (userLines.length > 0) {
      const last = userLines[userLines.length - 1];
      last.querySelector('.msg').textContent = `> ${translated}`;
    }
    return true;
  } else if (line.startsWith('[ack]')) {
    // 7A: Instant acknowledgment — show + speak immediately
    const ackText = line.slice(5).trim();
    addTerminalLine(ackText, 'info-line');
    // Fire TTS for ACK immediately (non-blocking)
    if (voiceEnabled && userGestureReceived) {
      pendingAckTTS = speakResponse(ackText);
    }
    return true;
  } else if (line.startsWith('[system]')) {
    addTerminalLine(line, 'system-line');
    // Completion TTS is handled exclusively by GPT-mini push notifications (SSE)
  } else if (line.startsWith('[file]')) {
    addTerminalLine(line, 'file-line');
    const match = line.match(/\[file\]\s*(.+?)\s*\|\s*(.+)/);
    if (match) addDownloadCard(match[1].trim(), match[2].trim());
  } else if (line.startsWith('[error]')) {
    addTerminalLine(line, 'error-line');
  } else if (line.startsWith('[warn]')) {
    addTerminalLine(line, 'warn-line');
  } else if (line.startsWith('[info]')) {
    addTerminalLine(line, 'info-line');
  } else {
    return false;
  }
  return true;
}

function addDownloadCard(fileName, filePath) {
  const card = document.createElement('div');
  card.className = 'download-card';
  card.innerHTML = `
    <span class="file-icon">📄</span>
    <span class="file-name">${fileName}</span>
    <a class="dl-btn" href="/api/files/download?path=${encodeURIComponent(filePath)}" download>Download</a>
  `;
  terminal.appendChild(card);
  terminal.scrollTop = terminal.scrollHeight;
}

// ========== MARKDOWN RENDERING ==========
function renderMarkdown(text) {
  try {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        highlight: function(code, lang) {
          if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
          }
          return code;
        },
        breaks: true,
        gfm: true
      });
      return marked.parse(text);
    }
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  } catch {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

function addCopyButtons(container) {
  container.querySelectorAll('pre').forEach(pre => {
    pre.style.position = 'relative';
    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.textContent = 'Copy';
    btn.onclick = () => {
      const code = pre.querySelector('code')?.textContent || pre.textContent;
      navigator.clipboard.writeText(code);
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 1500);
    };
    pre.appendChild(btn);
  });
}

// ========== CHAT - SEND MESSAGE ==========
async function sendMessage(text, fromVoice = false) {
  if (!text.trim() && !capturedScreen) return;

  userGestureReceived = true;
  pendingAckTTS = null;
  const displayText = text.trim() || (currentLang === 'BR' ? '[análise de tela]' : '[screen analysis]');
  addTerminalLine(`> ${displayText}`, 'user-line');
  chatInput.value = '';
  playSendSound();
  setAvatarState('thinking');

  // If screen is captured + Q&A → GPT-4o-mini vision (fast, real-time)
  // If screen is captured + build task → fall through to normal chat (Claude gets context via /api/chat)
  const isBuildTask = /\b(create|generate|build|make|write|produce|design|implement|develop|fix|update|report|crie|gere|construa|faça|escreva|implemente|corrija|analise|relatório)\b/i.test(text);
  if ((capturedScreen || liveScreenMode) && !isBuildTask) {
    const screenResponse = await analyzeScreen(text.trim());
    if (screenResponse) {
      addTerminalLine(screenResponse, 'jarvis-line');
      playReceiveSound();
      highlightAgents(screenResponse);
      if (voiceEnabled && userGestureReceived) {
        const brief = screenResponse.replace(/```[\s\S]*?```/g, '').replace(/[#*_`~>|]/g, '')
          .replace(/\n+/g, ' ').trim().split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').slice(0, 300);
        if (brief) await speakResponse(brief);
      }
      setAvatarState('idle');
      scheduleNextListen(1200); // continuous voice mode restart after vision
      return;
    }
    setAvatarState('idle');
    scheduleNextListen(1500);
    return;
  }

  if (!text.trim()) return;

  // Highlight active model based on complexity
  const opusMatch = /\b(architect|redesign|refactor|infrastructure|migration|deploy|scale|database|system design|e-?book|full|complete|advanced|complex|detailed|comprehensive|deep|entire|production|enterprise)\b/i.test(text);
  const sonnetMatch = /\b(create|generate|build|make|write|produce|design|implement|develop|fix|update|modify|analyze|report|presentation|website|app|pdf|document|code|script|html|css|crie|gere|construa|faça|escreva)\b/i.test(text);
  const isVoiceTask = fromVoice && (opusMatch || sonnetMatch);
  setActiveModel(opusMatch ? 'opus' : sonnetMatch ? 'sonnet' : 'haiku');

  // ACK is now handled by GPT-mini response (Phase 1 of /api/chat)
  let ackPromise = null;

  try {
    const body = { message: text, fromVoice, language: currentLang, conclaveEnabled };
    if (currentAttachment) {
      body.attachmentId = currentAttachment.id;
      currentAttachment = null;
      removeAttachmentPreview();
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';
    let claudeSilent = false;   // true after [build-start] — Claude output is terminal-only
    let gptResponse = '';       // GPT-mini portion (before [build-start]) — this gets spoken
    let streamTtsBuffer = '';
    let streamTtsFired = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      fullResponse += chunk;

      // Extract GPT portion (before [build-start]) for TTS — before mutating claudeSilent
      const ackPortion = chunk.split('[build-start]')[0];
      const hadBuildStart = chunk.includes('[build-start]');

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('[build-start]')) { claudeSilent = true; continue; }
        processStreamLine(line);
        if (!claudeSilent) gptResponse += line + '\n';
      }

      // Streaming TTS: fire on ACK portion regardless of claudeSilent state
      if (!streamTtsFired && voiceEnabled && userGestureReceived && ackPortion.trim()) {
        const cleanAck = ackPortion.split('\n')
          .filter(l => !l.match(/^\[(system|file|error|warn|info|ack|build-start|translated)\]/))
          .join(' ').trim();
        if (cleanAck) {
          streamTtsBuffer += cleanAck + ' ';
          // Fire TTS as soon as possible: first clause ending with .!?,: OR 18+ chars accumulated
          const sentMatch = streamTtsBuffer.match(/^(.{6,}?[.!?,:])\s/);
          const bufTrim = streamTtsBuffer.trim();
          if (sentMatch || (hadBuildStart && bufTrim.length > 6) || bufTrim.length >= 18) {
            streamTtsFired = true;
            speakResponse((sentMatch ? sentMatch[1] : bufTrim).trim());
          }
        }
      }
    }

    if (buffer.trim() && !buffer.startsWith('[build-start]')) processStreamLine(buffer);

    // GPT-mini response → render + speak (if not already fired by streaming)
    const cleanGpt = gptResponse.split('\n')
      .filter(l => !l.startsWith('[system]') && !l.startsWith('[file]') && !l.startsWith('[error]') && !l.startsWith('[warn]') && !l.startsWith('[info]') && !l.startsWith('[ack]'))
      .join('\n').trim();

    // Claude output (after [build-start]) → render to terminal, NO TTS
    const claudeOutput = fullResponse.split('[build-start]')[1] || '';
    const cleanClaude = claudeOutput.split('\n')
      .filter(l => !l.startsWith('[system]') && !l.startsWith('[file]') && !l.startsWith('[error]') && !l.startsWith('[warn]') && !l.startsWith('[info]') && !l.startsWith('[ack]'))
      .join('\n').trim();

    if (cleanGpt) {
      addTerminalLine(cleanGpt, 'jarvis-line');
      playReceiveSound();
      highlightAgents(cleanGpt);
      // Speak GPT-mini response if streaming TTS didn't already fire
      if (voiceEnabled && userGestureReceived && !streamTtsFired) {
        const brief = cleanGpt.replace(/```[\s\S]*?```/g, '').replace(/[#*_`~>|]/g, '')
          .replace(/\n+/g, ' ').trim()
          .split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5).slice(0, 2).join(' ').slice(0, 300);
        if (brief) await speakResponse(brief);
      }
    }

    if (cleanClaude) {
      addTerminalLine(cleanClaude, 'jarvis-line');
      if (!cleanGpt) { playReceiveSound(); highlightAgents(cleanClaude); }
      // NO TTS — completion will come via push notification (GPT-mini SSE)
    }

    if (true) { // keep block structure
    }

    setAvatarState('idle');
    scheduleNextListen(1500); // continuous mode restart
  } catch (err) {
    addTerminalLine(`[error] ${err.message}`, 'error-line');
    playErrorSound();
    setAvatarState('idle');
    scheduleNextListen(2000);
  }
}

// ========== AVATAR STATES ==========
function setAvatarState(state) {
  if (avatarContainer) {
    avatarContainer.classList.remove('listening', 'thinking', 'speaking');
    if (state === 'listening' || state === 'thinking' || state === 'speaking') {
      avatarContainer.classList.add(state);
    }
  }
  switch (state) {
    case 'listening': avatarStatus.textContent = 'LISTENING'; break;
    case 'thinking':  avatarStatus.textContent = 'PROCESSING'; break;
    case 'speaking':  avatarStatus.textContent = 'SPEAKING'; break;
    default:          avatarStatus.textContent = '';
  }
  // Update particle orb
  if (particleOrb) particleOrb.setState(state);
}

// ========== VOICE CAPTURE (MEDIARECORDER + WHISPER) ==========
let recordingStartTime = 0;
let audioAnalyser = null;
let peakVolume = 0;
let vadTimer = null;         // silence auto-stop timer
let continuousMode = false;  // hands-free loop
let continuousTimer = null;

const VAD_SILENCE_MS = 1100; // fastest: stop after 1.1s of silence

// Continuous mode toggle button (injected into input bar)
function initContinuousBtn() {
  const btn = document.createElement('button');
  btn.id = 'continuous-btn';
  btn.className = 'screen-btn';
  btn.title = 'Continuous voice mode';
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <circle cx="12" cy="22" r="1.5" fill="currentColor"/>
  </svg>`;
  btn.addEventListener('click', async () => {
    if (realtimeConnecting) {
      addTerminalLine(
        currentLang === 'BR' ? '[status] Conectando, aguarde...' : '[status] Connecting, please wait...',
        'info-line'
      );
      // Wait for current connection attempt to finish, then report final status
      while (realtimeConnecting) await new Promise(r => setTimeout(r, 200));
      btn.style.color = realtimeActive ? 'var(--cyan)' : '';
      btn.style.background = realtimeActive ? 'rgba(0,212,255,0.1)' : '';
      addTerminalLine(
        realtimeActive
          ? (currentLang === 'BR' ? '[status] Modo contínuo: ATIVADO' : '[status] Continuous mode: ON')
          : (currentLang === 'BR' ? '[status] Modo contínuo: DESATIVADO' : '[status] Continuous mode: OFF'),
        'info-line'
      );
      return;
    }
    await startRealtime();
    btn.style.color = realtimeActive ? 'var(--cyan)' : '';
    btn.style.background = realtimeActive ? 'rgba(0,212,255,0.1)' : '';
    addTerminalLine(
      realtimeActive
        ? (currentLang === 'BR' ? '[status] Modo contínuo: ATIVADO' : '[status] Continuous mode: ON')
        : (currentLang === 'BR' ? '[status] Modo contínuo: DESATIVADO' : '[status] Continuous mode: OFF'),
      'info-line'
    );
  });
  const sendBtn = document.getElementById('send-btn');
  sendBtn.parentNode.insertBefore(btn, sendBtn);
}

// ========== REALTIME VOICE MODE (OpenAI WebRTC — ~300ms latency) ==========
let realtimePC = null;
let realtimeStream = null;
let realtimeAudio = null;
let realtimeDC = null;
let realtimeActive = false;
let realtimeConnecting = false;
let realtimeUserDisabled = false;

async function startRealtime() {
  if (realtimeActive) { realtimeUserDisabled = true; return stopRealtime(); }
  if (realtimeConnecting) return; // guard against parallel connects
  realtimeConnecting = true;
  realtimeUserDisabled = false;
  try {
    userGestureReceived = true;
    const tokenRes = await fetch('/api/realtime/session', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      // Realtime API only supports: alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar
      // TTS voices like onyx, nova, fable are NOT supported — always map to a valid Realtime voice
      body: JSON.stringify({ language: currentLang, voice: getRealtimeVoice() })
    });
    const sess = await tokenRes.json();
    if (!sess.client_secret?.value) throw new Error(sess.error || 'No ephemeral token');

    const pc = new RTCPeerConnection();
    realtimePC = pc;

    // Remote audio sink
    realtimeAudio = new Audio();
    realtimeAudio.autoplay = true;
    pc.ontrack = (e) => { realtimeAudio.srcObject = e.streams[0]; setAvatarState('speaking'); };

    // Mic input
    realtimeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    realtimeStream.getTracks().forEach(t => pc.addTrack(t, realtimeStream));

    // Data channel for events
    const dc = pc.createDataChannel('oai-events');
    realtimeDC = dc;
    dc.addEventListener('message', (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === 'input_audio_buffer.speech_started') setAvatarState('listening');
        if (ev.type === 'response.audio.done') setAvatarState('idle');
        if (ev.type === 'conversation.item.input_audio_transcription.completed' && ev.transcript) {
          // Translate user transcript to match the active language toggle
          (async () => {
            try {
              const r = await fetch('/api/translate', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ text: ev.transcript, targetLang: currentLang })
              });
              const d = await r.json();
              addTerminalLine('> ' + (d.translated || ev.transcript), 'user-line');
            } catch {
              addTerminalLine('> ' + ev.transcript, 'user-line');
            }
          })();
        }
        if (ev.type === 'response.audio_transcript.done' && ev.transcript) {
          addTerminalLine(ev.transcript, 'jarvis-line');
        }
        // Handle function call: GPT-realtime asks us to dispatch to Claude
        if (ev.type === 'response.function_call_arguments.done' && ev.name === 'execute_task') {
          handleRealtimeTask(ev.call_id, ev.arguments);
        }
      } catch {}
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const sdpRes = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
      method: 'POST',
      body: offer.sdp,
      headers: { 'Authorization': `Bearer ${sess.client_secret.value}`, 'Content-Type': 'application/sdp' }
    });
    await pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() });

    realtimeActive = true;
    realtimeConnecting = false;
    // Stop wake word listener (Realtime owns the mic now)
    try { if (wakeWordRecognition) { wakeWordRecognition.onend = null; wakeWordRecognition.stop(); } } catch {}
    const btn = document.getElementById('realtime-btn');
    if (btn) { btn.style.color = 'var(--cyan)'; btn.style.background = 'rgba(0,212,255,0.15)'; }
    const cbtn = document.getElementById('continuous-btn');
    if (cbtn) { cbtn.style.color = 'var(--cyan)'; cbtn.style.background = 'rgba(0,212,255,0.1)'; }
    micBtn.classList.add('recording');
  } catch (err) {
    addTerminalLine('[error] Realtime: ' + err.message, 'error-line');
    realtimeConnecting = false;
    stopRealtime();
  }
}

function stopRealtime() {
  realtimeActive = false;
  realtimeConnecting = false;
  try { realtimeDC?.close(); } catch {}
  try { realtimePC?.close(); } catch {}
  try { realtimeStream?.getTracks().forEach(t => t.stop()); } catch {}
  if (realtimeAudio) { realtimeAudio.srcObject = null; realtimeAudio = null; }
  realtimePC = null; realtimeStream = null; realtimeDC = null;
  const btn = document.getElementById('realtime-btn');
  if (btn) { btn.style.color = ''; btn.style.background = ''; }
  const cbtn = document.getElementById('continuous-btn');
  if (cbtn) { cbtn.style.color = ''; cbtn.style.background = ''; }
  micBtn.classList.remove('recording');
  setAvatarState('idle');
  // Resume wake word listening so "jarvis" can reactivate later
  if (wakeWordEnabled) { try { startWakeWord(); } catch {} }
}

// Dispatch Realtime function call to Claude via existing /api/chat, then feed result back
async function handleRealtimeTask(callId, argsJson) {
  let request = '';
  try { request = JSON.parse(argsJson).request || ''; } catch {}
  if (!request) return;

  // Send the function result back to Realtime immediately (keeps conversation flowing)
  if (realtimeDC?.readyState === 'open') {
    realtimeDC.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify({ status: 'dispatched', message: 'Claude is executing in background' })
      }
    }));
    realtimeDC.send(JSON.stringify({ type: 'response.create' }));
  }

  // Fire Claude in background via /api/chat (non-blocking)
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: request, fromVoice: true, language: currentLang, conclaveEnabled })
    });
    // Stream & render to terminal; completion announcement comes via SSE notification channel
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (line && !line.startsWith('[build-start]')) processStreamLine(line);
      }
    }
  } catch (err) {
    addTerminalLine('[error] Claude dispatch: ' + err.message, 'error-line');
  }
}

// When Claude finishes (SSE push), inject completion announcement into Realtime session.
// The message is ALREADY the final sentence to speak — just tell the model to say it verbatim.
// Falls back to TTS if Realtime data channel is dead.
function announceToRealtime(message) {
  // If Realtime DC is alive, inject the message for GPT to speak
  if (realtimeActive && realtimeDC?.readyState === 'open') {
    try {
      const INSTR = {
        BR: `Fale exatamente esta frase ao senhor, sem traduzir nem adicionar nada: "${message}"`,
        ES: `Di exactamente esta frase al señor, sin traducir ni añadir nada: "${message}"`,
        EN: `Say exactly this sentence to the user, do not translate or add anything: "${message}"`
      };
      const instruction = INSTR[currentLang] || INSTR.EN;
      realtimeDC.send(JSON.stringify({
        type: 'conversation.item.create',
        item: { type: 'message', role: 'system', content: [{ type: 'input_text', text: instruction }] }
      }));
      realtimeDC.send(JSON.stringify({ type: 'response.create' }));
      return;
    } catch (e) {
      console.warn('[JARVIS] Realtime DC send failed, falling back to TTS:', e.message);
    }
  }
  // Fallback: Realtime is supposed to be active but DC is dead — use TTS directly
  if (userGestureReceived) {
    speakResponse(message);
  }
}

function initRealtimeBtn() {
  // Push-to-talk: Realtime only starts when user explicitly clicks mic button.
  // No auto-start, no auto-reconnect. User is in full control.
  // Wake word ("Jarvis") can also activate if enabled in settings.
}

async function startRecording() {
  try {
    userGestureReceived = true;

    // Fast path: Web Speech API — zero latency, no server round-trip
    if (canWebSpeech) {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      webSpeechRec = new SpeechRec();
      // Language follows the BR/EN toggle
      webSpeechRec.lang = ({ BR: 'pt-BR', ES: 'es-ES', EN: 'en-US' }[currentLang]) || 'en-US';
      webSpeechRec.interimResults = true;
      webSpeechRec.maxAlternatives = 1;
      webSpeechRec.continuous = false;

      let finalSent = false;
      webSpeechRec.onresult = (event) => {
        let interim = '', final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        if (interim) chatInput.value = interim;
        if (final && !finalSent) {
          finalSent = true;
          chatInput.value = final;
          stopRecording();
          sendMessage(final.trim(), true);
        }
      };

      webSpeechRec.onerror = (e) => {
        console.warn('[JARVIS] Web Speech error:', e.error, '— falling back to Whisper');
        isRecording = false;
        micBtn.classList.remove('recording');
        setAvatarState('idle');
        webSpeechRec = null;
      };

      webSpeechRec.onend = () => {
        if (!finalSent) {
          isRecording = false;
          micBtn.classList.remove('recording');
          setAvatarState('idle');
          webSpeechRec = null;
          // Continuous mode: restart after brief pause
          if (continuousMode) {
            continuousTimer = setTimeout(() => startRecording(), 800);
          }
        }
      };

      webSpeechRec.start();
      isRecording = true;
      micBtn.classList.add('recording');
      setAvatarState('listening');
      playTone(1200, 40);
      addTerminalLine('[system] Listening (real-time)...', 'system-line');
      return;
    }

    // Fallback: MediaRecorder + Whisper
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true
      }
    });

    // Set up audio level monitoring
    try {
      const actx = getAudioCtx();
      const source = actx.createMediaStreamSource(stream);
      audioAnalyser = actx.createAnalyser();
      audioAnalyser.fftSize = 512;
      source.connect(audioAnalyser);
      peakVolume = 0;

      const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
      const monitorVolume = () => {
        if (!isRecording) return;
        audioAnalyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        if (avg > peakVolume) peakVolume = avg;

        // VAD: auto-stop on sustained silence (after user has spoken)
        const elapsed = Date.now() - recordingStartTime;
        if (elapsed > 1200 && peakVolume > 8) {
          // User spoke at least once — now detect silence
          if (avg < 3) {
            if (!vadTimer) {
              vadTimer = setTimeout(() => {
                if (isRecording) {
                  addTerminalLine('[system] Silence detected — processing...', 'system-line');
                  stopRecording();
                }
              }, VAD_SILENCE_MS);
            }
          } else {
            // Sound detected — reset silence timer
            clearTimeout(vadTimer);
            vadTimer = null;
          }
        }

        requestAnimationFrame(monitorVolume);
      };
      requestAnimationFrame(monitorVolume);
    } catch {}

    // 64kbps: half upload size = ~40% faster Whisper round-trip, quality still excellent for STT
    const recorderOpts = { audioBitsPerSecond: 64000 };
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      recorderOpts.mimeType = 'audio/webm;codecs=opus';
    }

    mediaRecorder = new MediaRecorder(stream, recorderOpts);
    console.log('MediaRecorder:', mediaRecorder.mimeType, recorderOpts.audioBitsPerSecond + 'bps');

    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());

      const duration = Date.now() - recordingStartTime;
      if (duration < 800) {
        addTerminalLine('[warn] Recording too short. Hold the mic button and speak, then click again to stop.', 'warn-line');
        setAvatarState('idle');
        return;
      }

      const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      if (blob.size < 1000) {
        addTerminalLine('[warn] No audio captured. Check your microphone.', 'warn-line');
        setAvatarState('idle');
        return;
      }

      if (peakVolume < 5) {
        addTerminalLine('[warn] No voice detected — only silence captured. Speak louder or check mic.', 'warn-line');
        setAvatarState('idle');
        return;
      }

      addTerminalLine(`[system] Audio captured: ${(blob.size / 1024).toFixed(1)}KB, ${(duration / 1000).toFixed(1)}s, peak vol: ${peakVolume.toFixed(0)}`, 'system-line');
      await transcribeAndSend(blob);
    };

    // Single chunk — timeslice fragments corrupt WebM for Whisper
    mediaRecorder.start();
    recordingStartTime = Date.now();
    isRecording = true;
    micBtn.classList.add('recording');
    setAvatarState('listening');
    playTone(1200, 40);
    addTerminalLine('[system] Listening... Click mic again when done speaking.', 'system-line');
  } catch (err) {
    addTerminalLine(`[error] Microphone access denied: ${err.message}`, 'error-line');
    playErrorSound();
  }
}

function stopRecording() {
  clearTimeout(vadTimer); vadTimer = null;
  if (webSpeechRec && isRecording) {
    webSpeechRec.stop();
    isRecording = false;
    micBtn.classList.remove('recording');
    setAvatarState('thinking');
    playTone(800, 40);
    return;
  }
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    micBtn.classList.remove('recording');
    setAvatarState('thinking');
    playTone(800, 40);
  }
}

// After JARVIS finishes responding in continuous mode — restart listening
function scheduleNextListen(delayMs = 1200) {
  if (!continuousMode) return;
  clearTimeout(continuousTimer);
  continuousTimer = setTimeout(() => {
    if (!isRecording && continuousMode) startRecording();
  }, delayMs);
}

async function transcribeAndSend(audioBlob) {
  try {
    setAvatarState('thinking');
    addTerminalLine('[system] Transcribing voice...', 'system-line');

    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');

    const sttRes = await fetch('/api/stt', { method: 'POST', body: formData });
    if (!sttRes.ok) {
      const err = await sttRes.json().catch(() => ({ error: 'STT failed' }));
      throw new Error(err.error || 'Transcription failed');
    }
    const sttData = await sttRes.json();

    // Handle filtered hallucinations
    if (sttData.filtered) {
      addTerminalLine(`[warn] ${sttData.reason || 'No clear speech detected.'}  Speak clearly and try again.`, 'warn-line');
      setAvatarState('idle');
      return;
    }

    if (!sttData.text || !sttData.text.trim()) {
      addTerminalLine('[warn] No speech detected. Try again.', 'warn-line');
      setAvatarState('idle');
      return;
    }

    // Use sendMessage with fromVoice=true for the optimized pipeline
    await sendMessage(sttData.text, true);
  } catch (err) {
    addTerminalLine(`[error] Voice processing failed: ${err.message}`, 'error-line');
    playErrorSound();
    setAvatarState('idle');
  }
}

// ========== TTS PIPELINE (SERIAL QUEUE — prevents double-voice overlap) ==========
let _ttsQueue = Promise.resolve();
let _currentAudio = null;

function speakResponse(text) {
  // Enqueue — each call waits for the previous to finish before starting
  _ttsQueue = _ttsQueue.then(() => _ttsPlay(text)).catch(() => _ttsPlay(text));
  return _ttsQueue;
}

async function _ttsPlay(text) {
  // Clean text for TTS — remove code blocks, markdown, bracket prefixes
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/[#*_`~>|]/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  // Split into sentences, max 3 for voice brevity
  const sentences = cleanText
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 5)
    .slice(0, 3);

  if (sentences.length === 0) return;

  // Combine into one TTS call for speed (avoid multiple round-trips)
  const ttsText = sentences.join(' ').slice(0, 500);

  setAvatarState('speaking');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ttsText, language: currentLang, voice: ttsVoice }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error('TTS failed:', res.status);
      setAvatarState('idle');
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    await new Promise((resolve) => {
      const audio = new Audio(url);
      _currentAudio = audio;
      audio.onended = () => { _currentAudio = null; URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { _currentAudio = null; URL.revokeObjectURL(url); resolve(); };
      audio.play().catch((e) => {
        console.warn('Audio autoplay blocked:', e.message);
        _currentAudio = null;
        URL.revokeObjectURL(url);
        resolve();
      });
    });
  } catch (err) {
    console.error('TTS error:', err.message);
  }

  setAvatarState('idle');
}

// ========== WAKE WORD DETECTION ==========
function startWakeWord() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  wakeWordRecognition = new SpeechRec();
  wakeWordRecognition.continuous = true;
  wakeWordRecognition.interimResults = true;
  wakeWordRecognition.lang = 'en-US';

  wakeWordRecognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript.toLowerCase();
      if (transcript.includes('jarvis')) {
        // Wake word → activate Realtime voice (continuous mode)
        if (!realtimeActive && !realtimeConnecting) {
          addTerminalLine(
            currentLang === 'BR' ? '[info] Palavra-chave detectada — ativando voz contínua.' : '[info] Wake word detected — activating continuous voice.',
            'info-line'
          );
          startRealtime();
        }
        break;
      }
    }
  };

  wakeWordRecognition.onend = () => {
    if (wakeWordEnabled) wakeWordRecognition.start();
  };

  wakeWordRecognition.start();
}

function stopWakeWord() {
  if (wakeWordRecognition) {
    wakeWordEnabled = false;
    wakeWordRecognition.stop();
    wakeWordRecognition = null;
  }
}

// ========== TAB NAVIGATION ==========
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

    if (btn.dataset.tab === 'file') loadFiles();
  });
});

// ========== FILE BROWSER ==========
async function loadFiles() {
  try {
    const res = await fetch('/api/files');
    const data = await res.json();
    const fileList = document.getElementById('file-list');

    if (!data.files || data.files.length === 0) {
      fileList.innerHTML = '<div class="file-empty">No files yet. Ask JARVIS to create something.</div>';
      return;
    }

    const icons = {
      '.pdf': '📕', '.md': '📝', '.txt': '📄', '.html': '🌐', '.css': '🎨',
      '.js': '⚡', '.ts': '💠', '.py': '🐍', '.json': '📋', '.png': '🖼️',
      '.jpg': '🖼️', '.jpeg': '🖼️', '.gif': '🖼️', '.svg': '🖼️',
      '.xlsx': '📊', '.pptx': '📽️', '.docx': '📃', '.zip': '📦',
      '.mp3': '🎵', '.mp4': '🎬', '.wav': '🎵'
    };

    // Group by project
    const byProject = {};
    for (const f of data.files) {
      const proj = f.project || 'General';
      if (!byProject[proj]) byProject[proj] = [];
      byProject[proj].push(f);
    }

    fileList.innerHTML = Object.entries(byProject).map(([project, files]) => {
      const items = files.map(f => {
        const icon = icons[f.ext] || '📄';
        const size = f.size > 1024 * 1024
          ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
          : `${(f.size / 1024).toFixed(1)} KB`;
        const date = new Date(f.createdAt).toLocaleDateString();
        return `<div class="file-item">
          <span class="file-item-icon">${icon}</span>
          <div class="file-item-info">
            <div class="file-item-name">${f.name}</div>
            <div class="file-item-meta">${size} · ${date}</div>
          </div>
          <div class="file-item-actions">
            <a href="/api/files/view?path=${encodeURIComponent(f.path)}" target="_blank">Preview</a>
            <a href="${f.downloadUrl}" download>Download</a>
          </div>
        </div>`;
      }).join('');
      return `<div class="file-project-group">
        <div class="file-project-header">${project}</div>
        ${items}
      </div>`;
    }).join('');
  } catch (err) {
    document.getElementById('file-list').innerHTML = '<div class="file-empty">Error loading files.</div>';
  }
}

// ========== ATTACHMENT ==========
fileAttach.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/attach', { method: 'POST', body: formData });
    const data = await res.json();

    currentAttachment = { id: data.attachmentId, name: data.name };
    showAttachmentPreview(data.name);
  } catch (err) {
    addTerminalLine(`[error] Upload failed: ${err.message}`, 'error-line');
  }
  fileAttach.value = '';
});

function showAttachmentPreview(name) {
  removeAttachmentPreview();
  const preview = document.createElement('div');
  preview.className = 'attachment-preview';
  preview.id = 'att-preview';
  preview.innerHTML = `📎 ${name} <button class="remove-att" onclick="removeAttachment()">✕</button>`;
  document.querySelector('.input-bar').insertAdjacentElement('beforebegin', preview);
}

function removeAttachmentPreview() {
  document.getElementById('att-preview')?.remove();
}

function removeAttachment() {
  currentAttachment = null;
  removeAttachmentPreview();
}

// ========== STAT CARD POLLING ==========
async function updateStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();

    const h = Math.floor(data.uptime / 3600000);
    const m = Math.floor((data.uptime % 3600000) / 60000);
    const s = Math.floor((data.uptime % 60000) / 1000);
    const sessionEl = document.getElementById('stat-session');
    if (sessionEl) sessionEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const tokensEl = document.getElementById('stat-tokens');
    if (tokensEl) tokensEl.textContent = data.tokens.toLocaleString();
    const planEl = document.getElementById('stat-plan');
    if (planEl) planEl.textContent = data.plan;
    const reqEl = document.getElementById('stat-requests');
    if (reqEl) reqEl.textContent = data.requests;

    // Latency
    const latEl = document.getElementById('stat-latency');
    if (latEl && data.lastLatency) {
      const ms = data.lastLatency;
      latEl.textContent = ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1) + 's';
      latEl.style.color = ms < 800 ? '#00ff88' : ms < 2000 ? '#ffd700' : '#ff4444';
    }

    // Pool health HUD — O=Opus S=Sonnet H=Haiku, number = warm processes ready
    const poolEl = document.getElementById('stat-pool');
    if (poolEl && data.pool) {
      const { opus = 0, sonnet = 0, haiku = 0 } = data.pool;
      poolEl.textContent = `O${opus} S${sonnet} H${haiku}`;
      poolEl.style.color = (opus + sonnet + haiku) > 4 ? '#00ff88' : '#ffd700';
    }
  } catch {}
}

// ========== CLOCK ==========
function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
}

// ========== CONFIG ==========
document.getElementById('save-api-key')?.addEventListener('click', async () => {
  const key = document.getElementById('config-api-key').value;
  if (!key) return;
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'OPENAI_API_KEY', value: key })
    });
    addTerminalLine('[system] API key updated. Restart server for changes to take effect.', 'system-line');
  } catch (err) {
    addTerminalLine(`[error] Failed to save config: ${err.message}`, 'error-line');
  }
});

document.getElementById('config-voice')?.addEventListener('change', (e) => {
  voiceEnabled = e.target.checked;
  addTerminalLine(`[system] Voice ${voiceEnabled ? 'enabled' : 'disabled'}`, 'system-line');
});

document.getElementById('config-wakeword')?.addEventListener('change', (e) => {
  wakeWordEnabled = e.target.checked;
  if (wakeWordEnabled) {
    startWakeWord();
    addTerminalLine('[system] Wake word "Jarvis" activated', 'system-line');
  } else {
    stopWakeWord();
    addTerminalLine('[system] Wake word deactivated', 'system-line');
  }
});

// TTS Voice selector — persists to localStorage
const ttsVoiceSelect = document.getElementById('config-tts-voice');
if (ttsVoiceSelect) {
  ttsVoiceSelect.value = ttsVoice;
  ttsVoiceSelect.addEventListener('change', (e) => {
    ttsVoice = e.target.value;
    localStorage.setItem('ttsVoice', ttsVoice);
    addTerminalLine(`[info] TTS voice set to: ${ttsVoice}`, 'info-line');
  });
}

// ========== EVENT LISTENERS ==========
sendBtn.addEventListener('click', () => sendMessage(chatInput.value));

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(chatInput.value);
  }
});

micBtn.addEventListener('click', () => {
  userGestureReceived = true;
  // Feedback visual imediato
  micBtn.classList.toggle('recording');
  addTerminalLine(realtimeActive ? '[system] Desconectando voz...' : '[system] Conectando voz...', 'system-line');
  startRealtime().then(() => {
    if (realtimeActive) micBtn.classList.add('recording');
    else micBtn.classList.remove('recording');
  }).catch((err) => {
    micBtn.classList.remove('recording');
    addTerminalLine(`[error] Voz: ${err.message || err}`, 'error-line');
  });
});

// Terminal direct input
terminal.addEventListener('click', () => chatInput.focus());

// Agent chip click → insert @mention + highlight model
document.querySelectorAll('.agent-chip[data-agent]').forEach(chip => {
  chip.style.cursor = 'pointer';
  chip.addEventListener('click', () => {
    const agent = chip.dataset.agent;
    const mention = `@${agent} `;
    const input = document.getElementById('chat-input');
    if (!input.value.startsWith('@')) {
      input.value = mention + input.value;
    } else {
      input.value = mention;
    }
    input.focus();
    setModelFromAgent(chip);
    // Visual feedback
    document.querySelectorAll('.agent-chip').forEach(c => c.classList.remove('active-agent'));
    chip.classList.add('active-agent');
  });
});

// ========== INIT ==========
updateClock();
setInterval(updateClock, 1000);
setInterval(updateStats, 4000);
updateStats();
initLangToggle();
initConclaveToggle();
initContinuousBtn();
initRealtimeBtn();

// Realtime connects when user clicks mic — no auto-connect to save API calls


// ── PUSH NOTIFICATION CHANNEL ──────────────────────────────────────────────
// Listens for Claude build completions. GPT-mini generates the message server-side
// and pushes it here — frontend speaks it automatically via TTS.
(function initNotifications() {
  const es = new EventSource('/api/notifications');
  es.onmessage = (e) => {
    try {
      const payload = JSON.parse(e.data);
      if (payload.type === 'build-complete' && payload.message) {
        addTerminalLine(`[info] ✓ ${payload.message}`, 'info-line');
        console.log('[JARVIS] Build complete notification received:', payload.message);
        // Route to Realtime when active (GPT-realtime speaks the completion); otherwise use TTS
        // announceToRealtime has its own fallback to TTS if DC is dead
        if (realtimeActive) {
          announceToRealtime(payload.message);
        } else if (userGestureReceived) {
          speakResponse(payload.message);
        }
      }
    } catch {}
  };
  es.onerror = () => { /* silent reconnect handled by browser */ };
})();

// ── PRE-FLIGHT VERIFICATION ──────────────────────────────────────────────
// Runs on first visit (or if user cleared localStorage). Tests all systems.
(async function runPreflight() {
  const PREFLIGHT_KEY = 'jarvis_preflight_passed';
  const overlay = document.getElementById('preflight-overlay');
  if (!overlay) return;

  // Skip if already passed (unless Shift held during load for re-check)
  if (localStorage.getItem(PREFLIGHT_KEY) && !window._forcePreflightRecheck) {
    overlay.style.display = 'none';
    return;
  }

  overlay.style.display = 'flex';

  try {
    const res = await fetch('/api/health/preflight', { method: 'POST' });
    const data = await res.json();

    // Update each check item
    for (const [key, result] of Object.entries(data.results)) {
      const el = document.querySelector(`.pf-item[data-key="${key}"]`);
      if (!el) continue;
      const icon = el.querySelector('.pf-icon');
      if (result.status === 'ok') {
        icon.textContent = '✅';
        el.classList.add('pf-ok');
      } else {
        icon.textContent = '❌';
        el.classList.add('pf-err');
        el.setAttribute('data-detail', result.detail || 'Unknown error');
      }
    }

    // Collect failed issues for auto-fix
    const failedIssues = [];
    for (const [key, result] of Object.entries(data.results)) {
      if (result.status !== 'ok') {
        failedIssues.push({ key, detail: result.detail || 'Unknown error' });
      }
    }

    // Show result
    const resultDiv = document.getElementById('preflight-result');
    const msgEl = document.getElementById('preflight-msg');
    const okBtn = document.getElementById('preflight-ok');
    const retryBtn = document.getElementById('preflight-retry');
    resultDiv.style.display = 'block';

    // Ensure autofix button exists
    let fixBtn = document.getElementById('preflight-autofix');
    if (!fixBtn) {
      fixBtn = document.createElement('button');
      fixBtn.id = 'preflight-autofix';
      fixBtn.style.cssText = 'background:linear-gradient(135deg,#00d4ff,#00ff88);color:#000;border:none;padding:10px 28px;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;margin-left:8px;';
      fixBtn.textContent = 'Corrigir Automaticamente';
      retryBtn.parentElement.appendChild(fixBtn);
    }

    // Ensure autofix log area exists
    let fixLog = document.getElementById('preflight-fixlog');
    if (!fixLog) {
      fixLog = document.createElement('div');
      fixLog.id = 'preflight-fixlog';
      fixLog.style.cssText = 'display:none;margin-top:14px;background:#060a1a;border:1px solid #1a3a5c;border-radius:8px;padding:12px;max-height:180px;overflow-y:auto;font-family:"JetBrains Mono",monospace;font-size:10px;color:#c9d1d9;white-space:pre-wrap;word-break:break-all;';
      resultDiv.appendChild(fixLog);
    }

    if (data.status === 'ready') {
      msgEl.textContent = 'Todos os sistemas operacionais. JARVIS esta pronto.';
      msgEl.style.color = '#00ff88';
      okBtn.textContent = 'Iniciar JARVIS';
      okBtn.style.background = '#00d4ff';
      okBtn.style.display = 'inline-block';
      retryBtn.style.display = 'none';
      fixBtn.style.display = 'none';
    } else {
      msgEl.textContent = 'Problemas detectados. JARVIS pode funcionar com recursos limitados.';
      msgEl.style.color = '#ffaa00';
      okBtn.textContent = 'Continuar Assim';
      okBtn.style.background = '#555';
      okBtn.style.display = 'inline-block';
      retryBtn.style.display = 'inline-block';
      // Show auto-fix only if Claude CLI is available
      const claudeOk = data.results.claude_cli?.status === 'ok';
      fixBtn.style.display = claudeOk ? 'inline-block' : 'none';
    }

    okBtn.onclick = () => {
      localStorage.setItem(PREFLIGHT_KEY, Date.now().toString());
      overlay.style.display = 'none';
    };

    retryBtn.onclick = () => {
      document.querySelectorAll('.pf-item').forEach(el => {
        el.classList.remove('pf-ok', 'pf-err');
        el.removeAttribute('data-detail');
        el.querySelector('.pf-icon').textContent = '⏳';
      });
      resultDiv.style.display = 'none';
      fixLog.style.display = 'none';
      fixLog.textContent = '';
      window._forcePreflightRecheck = true;
      runPreflight();
    };

    fixBtn.onclick = async () => {
      // Disable buttons during fix
      fixBtn.disabled = true;
      fixBtn.textContent = 'Corrigindo...';
      fixBtn.style.opacity = '0.6';
      retryBtn.disabled = true;
      okBtn.disabled = true;
      fixLog.style.display = 'block';
      fixLog.textContent = '[JARVIS] Acionando Claude para corrigir problemas...\n\n';

      try {
        const fixRes = await fetch('/api/health/autofix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issues: failedIssues })
        });

        const reader = fixRes.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fixLog.textContent += chunk;
          fixLog.scrollTop = fixLog.scrollHeight;
        }

        fixLog.textContent += '\n\n[JARVIS] Correcao concluida. Executando verificacao novamente...\n';

        // Wait 2s then re-run preflight
        await new Promise(r => setTimeout(r, 2000));
        document.querySelectorAll('.pf-item').forEach(el => {
          el.classList.remove('pf-ok', 'pf-err');
          el.removeAttribute('data-detail');
          el.querySelector('.pf-icon').textContent = '⏳';
        });
        resultDiv.style.display = 'none';
        fixLog.style.display = 'none';
        fixLog.textContent = '';
        window._forcePreflightRecheck = true;
        runPreflight();

      } catch (err) {
        fixLog.textContent += `\n[ERRO] ${err.message}\n`;
        fixBtn.disabled = false;
        fixBtn.textContent = 'Corrigir Automaticamente';
        fixBtn.style.opacity = '1';
        retryBtn.disabled = false;
        okBtn.disabled = false;
      }
    };
  } catch (e) {
    // Server not reachable
    const resultDiv = document.getElementById('preflight-result');
    const msgEl = document.getElementById('preflight-msg');
    resultDiv.style.display = 'block';
    msgEl.textContent = '❌ Cannot reach JARVIS server. Is it running?';
    msgEl.style.color = '#ff4444';
  }
})();



// ═══════════════════════════════════════════════
// COCKPIT HUD LOGIC — Iron Man Edition
// ═══════════════════════════════════════════════

(function() {
  // ── Quick Access Buttons (HUD esquerdo) ──
  document.querySelectorAll('.hud-qbtn[data-quick-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.quickTab;
      const tabBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
      if (tabBtn) tabBtn.click();
    });
  });

  // ── Weather Widget ──
  async function loadWeather() {
    try {
      // Tenta detectar localizacao via IP (gratis)
      let city = 'São Paulo';
      try {
        const geoRes = await fetch('https://ipapi.co/json/', { timeout: 5000 });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (geo.city) city = geo.city;
        }
      } catch {}

      // Primeiro tenta endpoint local (se JARVIS server tiver)
      let data = null;
      try {
        const r = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
        if (r.ok) data = await r.json();
      } catch {}

      // Fallback: wttr.in direto (nao precisa de server)
      if (!data) {
        const r2 = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
        if (r2.ok) {
          const w = await r2.json();
          const cur = w.current_condition[0];
          data = {
            city,
            temp: cur.temp_C,
            desc: cur.lang_pt?.[0]?.value || cur.weatherDesc[0].value
          };
        }
      }

      if (data) {
        document.getElementById('weather-city').textContent = data.city.toUpperCase();
        document.getElementById('weather-temp').textContent = `${data.temp}°C`;
        document.getElementById('weather-desc').textContent = data.desc;
      }
    } catch (err) {
      document.getElementById('weather-city').textContent = 'OFFLINE';
      document.getElementById('weather-temp').textContent = '--°C';
      document.getElementById('weather-desc').textContent = 'sem conexao';
    }
  }

  // ── System Health Bars ──
  async function updateHealth() {
    const barApi = document.getElementById('bar-api');
    const barVoice = document.getElementById('bar-voice');
    const barClaude = document.getElementById('bar-claude');

    try {
      const r = await fetch('/api/health', { timeout: 3000 });
      if (r.ok) {
        const data = await r.json();
        barApi.className = 'bar-fill ok';

        if (data.capabilities?.voice_realtime) barVoice.className = 'bar-fill ok';
        else barVoice.className = 'bar-fill err';

        if (data.capabilities?.task_execution) barClaude.className = 'bar-fill ok';
        else barClaude.className = 'bar-fill err';
        return;
      }
    } catch {}

    // Offline
    barApi.className = 'bar-fill err';
    barVoice.className = 'bar-fill err';
    barClaude.className = 'bar-fill err';
  }

  // ── Active Model Display ──
  function updateModel(model, status) {
    const modelEl = document.getElementById('active-model');
    const statusEl = document.getElementById('model-status');
    if (!modelEl) return;

    const modelMap = {
      'claude-opus-4-6': 'Opus 4.6',
      'claude-sonnet-4-6': 'Sonnet 4.6',
      'claude-haiku-4-5': 'Haiku 4.5',
      'opus': 'Opus 4.6',
      'sonnet': 'Sonnet 4.6',
      'haiku': 'Haiku 4.5',
    };

    modelEl.textContent = modelMap[model] || model || 'Sonnet 4.6';
    statusEl.textContent = status || 'standby';
  }

  // Listen to server-log events for model detection
  window.addEventListener('jarvis-log', (e) => {
    const msg = e.detail || '';
    if (msg.includes('opus')) updateModel('opus', 'executing');
    else if (msg.includes('sonnet')) updateModel('sonnet', 'executing');
    else if (msg.includes('haiku')) updateModel('haiku', 'executing');
  });

  // ── Active Agents ──
  const agentsList = document.getElementById('agents-list');
  const activeAgents = new Set();

  function addAgent(name) {
    activeAgents.add(name);
    renderAgents();
  }
  function removeAgent(name) {
    activeAgents.delete(name);
    renderAgents();
  }
  function renderAgents() {
    if (!agentsList) return;
    if (activeAgents.size === 0) {
      agentsList.innerHTML = '<span class="agent-pill idle">nenhum</span>';
      return;
    }
    agentsList.innerHTML = [...activeAgents]
      .map(a => `<span class="agent-pill active">${a}</span>`)
      .join('');
  }

  // Expose for external calls
  window.felipeHUD = {
    addAgent, removeAgent, updateModel,
    detectAgent: (text) => {
      const agents = ['architect', 'dev', 'qa', 'pm', 'po', 'analyst', 'ux', 'devops', 'conclave'];
      agents.forEach(a => {
        if (text?.toLowerCase().includes(`@${a}`) || text?.toLowerCase().includes(a)) {
          addAgent(a);
          setTimeout(() => removeAgent(a), 30000);
        }
      });
    }
  };

  // ── Metrics (tasks/uptime/voice) ──
  let startTime = Date.now();
  let taskCount = parseInt(localStorage.getItem('felipe-tasks-today') || '0');
  const lastTaskDate = localStorage.getItem('felipe-last-task-date');
  const today = new Date().toDateString();
  if (lastTaskDate !== today) {
    taskCount = 0;
    localStorage.setItem('felipe-tasks-today', '0');
    localStorage.setItem('felipe-last-task-date', today);
  }

  function updateMetrics() {
    const tasksEl = document.getElementById('metric-tasks');
    const uptimeEl = document.getElementById('metric-uptime');
    const voiceEl = document.getElementById('metric-voice');

    if (tasksEl) tasksEl.textContent = taskCount;

    if (uptimeEl) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      uptimeEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }

    if (voiceEl) {
      const micBtn = document.getElementById('mic-btn');
      if (micBtn?.classList.contains('recording')) voiceEl.textContent = 'REC';
      else voiceEl.textContent = 'READY';
    }
  }

  window.felipeHUD.incrementTasks = () => {
    taskCount++;
    localStorage.setItem('felipe-tasks-today', String(taskCount));
    updateMetrics();
  };

  // ── System Stats (CPU/GPU temperature + usage) ──
  async function updateSystemStats() {
    try {
      const r = await fetch('/api/system-stats', { signal: AbortSignal.timeout(3000) });
      if (!r.ok) return;
      const s = await r.json();

      const cpuTempEl = document.getElementById('cpu-temp');
      const cpuUsageEl = document.getElementById('cpu-usage');
      const cpuCoresEl = document.getElementById('cpu-cores');
      const gpuTempEl = document.getElementById('gpu-temp');
      const gpuStatusEl = document.getElementById('gpu-status');

      if (cpuTempEl) {
        if (s.cpu?.temp !== null && s.cpu?.temp !== undefined) {
          cpuTempEl.textContent = `${s.cpu.temp}°C`;
          cpuTempEl.style.color = s.cpu.temp > 80 ? '#ff4455' : s.cpu.temp > 65 ? '#ffaa00' : 'var(--cyan)';
        } else {
          cpuTempEl.textContent = '—';
        }
      }
      if (cpuUsageEl) cpuUsageEl.textContent = s.cpu?.usage !== null ? `${s.cpu.usage}%` : '--%';
      if (cpuCoresEl) cpuCoresEl.textContent = `${s.cpu?.cores || '--'} cores`;

      if (gpuTempEl) {
        if (s.gpu?.temp !== null && s.gpu?.temp !== undefined) {
          gpuTempEl.textContent = `${s.gpu.temp}°C`;
          gpuTempEl.style.color = s.gpu.temp > 80 ? '#ff4455' : s.gpu.temp > 65 ? '#ffaa00' : 'var(--cyan)';
          if (gpuStatusEl) gpuStatusEl.textContent = s.gpu.name || 'active';
        } else {
          gpuTempEl.textContent = s.gpu?.name ? '—' : 'N/A';
          if (gpuStatusEl) gpuStatusEl.textContent = s.gpu?.name || 'no GPU';
        }
      }
      // Update GPU label with detected name
      const gpuLabel = document.querySelector('#widget-gpu .widget-label');
      if (gpuLabel && s.gpu?.name) {
        gpuLabel.textContent = s.gpu.name.length > 20 ? s.gpu.name.substring(0, 20) : s.gpu.name;
      }
    } catch {}
  }

  // ── Init ──
  loadWeather();
  updateHealth();
  updateMetrics();
  updateSystemStats();

  // Periodic updates
  setInterval(loadWeather, 15 * 60 * 1000);     // 15 min
  setInterval(updateHealth, 10 * 1000);         // 10 sec
  setInterval(updateMetrics, 1000);             // 1 sec
  setInterval(updateSystemStats, 5 * 1000);     // 5 sec
})();

// ═══════════════════════════════════════════════
// PREFLIGHT AUTO-SKIP (se server offline)
// ═══════════════════════════════════════════════
(function() {
  const overlay = document.getElementById('preflight-overlay');
  if (!overlay) return;

  // Se em 3s nao tiver /api/health-check-full, pula o preflight
  setTimeout(async () => {
    try {
      const r = await fetch('/api/health-check-full', { signal: AbortSignal.timeout(2000) });
      if (!r.ok) throw new Error('not ok');
    } catch {
      console.log('[JARVIS] Server offline — pulando preflight');
      overlay.style.display = 'none';
    }
  }, 3000);
})();


// ═══════════════════════════════════════════════


// ═══════════════════════════════════════════════
// HUD FUNCTIONAL — Entity activation, Obsidian, Ingest, Brain Viewer
// ═══════════════════════════════════════════════

(function() {
  // ── Entity Activation (modelos/agentes/conclave) ──
  function setEntityActive(name, active) {
    const row = document.querySelector('[data-entity="' + name + '"]');
    if (!row) return;
    if (active) { row.classList.add('active'); row.classList.remove('idle'); }
    else { row.classList.remove('active'); row.classList.add('idle'); }
  }
  function pulseEntity(name, ms) {
    setEntityActive(name, true);
    setTimeout(function() { setEntityActive(name, false); }, ms || 15000);
  }

  // Detection rules
  var rules = [
    { p: /opus/i, e: 'opus' }, { p: /sonnet/i, e: 'sonnet' }, { p: /haiku/i, e: 'haiku' },
    { p: /realtime|gpt-4o-rt/i, e: 'gpt-realtime' }, { p: /gpt-4o-mini/i, e: 'gpt-mini' },
    { p: /@architect|aria/i, e: 'architect' }, { p: /@dev\b|dex/i, e: 'dev' },
    { p: /@qa|quinn/i, e: 'qa' }, { p: /@pm|morgan/i, e: 'pm' },
    { p: /@po\b|pax/i, e: 'po' }, { p: /@analyst|atlas/i, e: 'analyst' },
    { p: /@ux|uma/i, e: 'ux' }, { p: /@devops|gage/i, e: 'devops' },
    { p: /@sm\b|river/i, e: 'sm' }, { p: /data.engineer|dara/i, e: 'data-engineer' },
    { p: /aios.master|orion/i, e: 'aios-master' }, { p: /squad.creator|craft/i, e: 'squad-creator' },
    { p: /conclave.critico|critico/i, e: 'conclave-critico' },
    { p: /conclave.advogado|advogado/i, e: 'conclave-advogado' },
    { p: /conclave.sintetizador|sintetizador/i, e: 'conclave-sintetizador' },
  ];
  window.felipeHUD = window.felipeHUD || {};
  window.felipeHUD.setEntityActive = setEntityActive;
  window.felipeHUD.pulseEntity = pulseEntity;
  window.felipeHUD.analyzeText = function(text) {
    if (!text) return;
    rules.forEach(function(r) { if (r.p.test(text)) pulseEntity(r.e, 20000); });
  };

  // ── Obsidian Stats ──
  async function loadObsidianStats() {
    var notesEl = document.getElementById('obsidian-notes');
    var statusEl = document.getElementById('obsidian-status');
    if (!notesEl) return;
    try {
      var r = await fetch('/api/obsidian/stats');
      if (!r.ok) throw new Error('offline');
      var data = await r.json();
      if (data.connected) {
        notesEl.textContent = data.notes + ' notas';
        statusEl.textContent = data.folders + ' pastas \u00B7 ' + data.links + ' links';
      } else {
        notesEl.textContent = 'N/A';
        statusEl.textContent = 'vault nao instalado';
      }
    } catch(e) {
      notesEl.textContent = 'N/A';
      statusEl.textContent = 'offline';
    }
  }
  loadObsidianStats();
  setInterval(loadObsidianStats, 60000);

  // ── Quick Access Buttons ──
  document.querySelectorAll('.hud-qbtn[data-quick-tab]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tabBtn = document.querySelector('.tab-btn[data-tab="' + btn.dataset.quickTab + '"]');
      if (tabBtn) tabBtn.click();
    });
  });

  // ── Ingest Modal ──
  var ingestModal = document.getElementById('ingest-modal');
  var btnIngest = document.getElementById('btn-ingest');
  var ingestClose = document.getElementById('ingest-close');
  var ingestCancel = document.getElementById('ingest-cancel');
  var ingestSubmit = document.getElementById('ingest-submit');
  var ingestStatus = document.getElementById('ingest-status');

  if (btnIngest) {
    btnIngest.addEventListener('click', function() {
      if (ingestModal) ingestModal.style.display = 'flex';
    });
  }
  if (ingestClose) ingestClose.addEventListener('click', function() { ingestModal.style.display = 'none'; });
  if (ingestCancel) ingestCancel.addEventListener('click', function() { ingestModal.style.display = 'none'; });

  // Ingest tabs
  document.querySelectorAll('.ingest-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.ingest-tab').forEach(function(t) { t.classList.remove('active'); });
      document.querySelectorAll('.ingest-panel').forEach(function(p) { p.classList.remove('active'); });
      tab.classList.add('active');
      var panel = document.getElementById('ingest-' + tab.dataset.ingest);
      if (panel) panel.classList.add('active');
    });
  });

  // File dropzone
  var dropzone = document.getElementById('ingest-dropzone');
  var fileInput = document.getElementById('ingest-file-input');
  var fileNameEl = document.getElementById('ingest-file-name');
  var selectedFile = null;

  if (dropzone) {
    dropzone.addEventListener('click', function() { fileInput.click(); });
    dropzone.addEventListener('dragover', function(e) { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', function() { dropzone.classList.remove('dragover'); });
    dropzone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        selectedFile = e.dataTransfer.files[0];
        fileNameEl.textContent = '\u2705 ' + selectedFile.name + ' (' + Math.round(selectedFile.size/1024) + 'KB)';
      }
    });
    fileInput.addEventListener('change', function() {
      if (fileInput.files.length) {
        selectedFile = fileInput.files[0];
        fileNameEl.textContent = '\u2705 ' + selectedFile.name + ' (' + Math.round(selectedFile.size/1024) + 'KB)';
      }
    });
  }

  // Submit ingest
  if (ingestSubmit) {
    ingestSubmit.addEventListener('click', async function() {
      var activeTab = document.querySelector('.ingest-tab.active');
      var tabType = activeTab ? activeTab.dataset.ingest : 'text';
      ingestStatus.textContent = '\u23F3 Processando...';
      ingestSubmit.disabled = true;

      try {
        var body = {};

        if (tabType === 'text') {
          var text = document.getElementById('ingest-text-input').value.trim();
          var cat = document.getElementById('ingest-text-category').value;
          if (!text) { ingestStatus.textContent = '\u274C Digite algo primeiro'; ingestSubmit.disabled = false; return; }
          body = { type: 'text', text: text, category: cat };
        }

        if (tabType === 'file') {
          if (!selectedFile) { ingestStatus.textContent = '\u274C Selecione um arquivo'; ingestSubmit.disabled = false; return; }
          var reader = new FileReader();
          var content = await new Promise(function(resolve) {
            reader.onload = function() { resolve(reader.result); };
            reader.readAsText(selectedFile);
          });
          body = { type: 'file', fileName: selectedFile.name, fileContent: content };
        }

        if (tabType === 'session') {
          body = { type: 'session' };
        }

        var r = await fetch('/api/obsidian/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        var data = await r.json();

        if (data.ok) {
          ingestStatus.textContent = '\u2705 Salvo no Obsidian: ' + (data.title || data.count + ' notas');
          loadObsidianStats();
          setTimeout(function() { ingestModal.style.display = 'none'; ingestStatus.textContent = ''; }, 2000);
        } else {
          ingestStatus.textContent = '\u274C ' + (data.error || 'Erro desconhecido');
        }
      } catch(err) {
        ingestStatus.textContent = '\u274C ' + err.message;
      }
      ingestSubmit.disabled = false;
    });
  }

  // ── Brain Viewer Modal ──
  var brainModal = document.getElementById('brain-modal');
  var btnBrain = document.getElementById('btn-brain');
  var brainClose = document.getElementById('brain-close');
  var brainMaximize = document.getElementById('brain-maximize');
  var brainTree = document.getElementById('brain-tree');
  var brainPreview = document.getElementById('brain-preview');
  var brainSearch = document.getElementById('brain-search');

  if (btnBrain) {
    btnBrain.addEventListener('click', function() {
      if (brainModal) {
        brainModal.style.display = 'flex';
        loadBrainTree();
      }
    });
  }
  if (brainClose) brainClose.addEventListener('click', function() { brainModal.style.display = 'none'; });
  if (brainMaximize) {
    brainMaximize.addEventListener('click', function() {
      var card = brainModal.querySelector('.modal-brain');
      card.classList.toggle('maximized');
      brainMaximize.textContent = card.classList.contains('maximized') ? '\u2750' : '\u2B1C';
    });
  }

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.style.display = 'none';
    });
  });

  // Load brain tree
  async function loadBrainTree() {
    if (!brainTree) return;
    brainTree.innerHTML = '<div class="brain-loading">Carregando vault...</div>';
    try {
      var r = await fetch('/api/obsidian/tree');
      var data = await r.json();
      if (!data.tree || !data.tree.length) {
        brainTree.innerHTML = '<div class="brain-loading">Vault vazio ou nao encontrado</div>';
        return;
      }
      brainTree.innerHTML = '';
      renderTree(data.tree, brainTree);
    } catch(err) {
      brainTree.innerHTML = '<div class="brain-loading">Erro: ' + err.message + '</div>';
    }
  }

  function renderTree(items, parent) {
    items.forEach(function(item) {
      if (item.type === 'folder') {
        var folder = document.createElement('div');
        folder.className = 'brain-folder';
        var header = document.createElement('div');
        header.className = 'brain-folder-header';
        header.innerHTML = '<span class="folder-icon">\uD83D\uDCC1</span><span class="folder-name">' + item.name + '</span><span class="folder-count">' + (item.children ? item.children.length : 0) + '</span>';
        var items_div = document.createElement('div');
        items_div.className = 'brain-folder-items';
        items_div.style.display = 'none';
        header.addEventListener('click', function() {
          items_div.style.display = items_div.style.display === 'none' ? 'block' : 'none';
          header.querySelector('.folder-icon').textContent = items_div.style.display === 'none' ? '\uD83D\uDCC1' : '\uD83D\uDCC2';
        });
        folder.appendChild(header);
        folder.appendChild(items_div);
        if (item.children) renderTree(item.children, items_div);
        parent.appendChild(folder);
      } else {
        var note = document.createElement('div');
        note.className = 'brain-note';
        note.innerHTML = '<span class="note-icon">\uD83D\uDCC4</span> ' + item.name;
        note.addEventListener('click', function() {
          document.querySelectorAll('.brain-note').forEach(function(n) { n.classList.remove('active'); });
          note.classList.add('active');
          loadNote(item.path);
        });
        parent.appendChild(note);
      }
    });
  }

  // Load note content
  async function loadNote(notePath) {
    if (!brainPreview) return;
    brainPreview.innerHTML = '<div class="brain-loading">Carregando...</div>';
    try {
      var r = await fetch('/api/obsidian/note?path=' + encodeURIComponent(notePath));
      var data = await r.json();
      if (data.content) {
        // Render markdown
        var html = marked.parse(data.content);
        // Convert [[links]] to clickable elements
        html = html.replace(/\[\[([^\]|#]+)\]\]/g, '<span class="brain-link" data-link="$1">$1</span>');
        brainPreview.innerHTML = html;
        // Make [[links]] clickable
        brainPreview.querySelectorAll('.brain-link').forEach(function(link) {
          link.addEventListener('click', function() {
            var target = link.dataset.link;
            // Find note in tree by name
            var noteEl = null;
            document.querySelectorAll('.brain-note').forEach(function(n) {
              if (n.textContent.trim().includes(target)) noteEl = n;
            });
            if (noteEl) noteEl.click();
          });
        });
      } else {
        brainPreview.innerHTML = '<div class="brain-empty"><p>Nota nao encontrada</p></div>';
      }
    } catch(err) {
      brainPreview.innerHTML = '<div class="brain-empty"><p>Erro: ' + err.message + '</p></div>';
    }
  }

  // Brain search
  if (brainSearch) {
    brainSearch.addEventListener('input', function() {
      var q = brainSearch.value.toLowerCase();
      document.querySelectorAll('.brain-note').forEach(function(n) {
        n.style.display = n.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
      // Show all parent folders
      document.querySelectorAll('.brain-folder-items').forEach(function(fi) {
        var hasVisible = fi.querySelector('.brain-note:not([style*="display: none"])');
        fi.style.display = q && hasVisible ? 'block' : (q ? 'none' : '');
      });
    });
  }

  // ── RAM metric ──
  async function updateRAM() {
    var el = document.getElementById('metric-ram');
    if (!el) return;
    try {
      var r = await fetch('/api/system-stats');
      if (r.ok) {
        var d = await r.json();
        if (d.ram) el.textContent = d.ram.usage + '%';
      }
    } catch(e) {}
  }
  updateRAM();
  setInterval(updateRAM, 10000);
})();
