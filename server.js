import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import os from 'os';
import { spawn, execSync, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import OpenAI, { toFile } from 'openai';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JARVIS_DIR = __dirname;
const PROJECTS_DIR = path.join(JARVIS_DIR, 'Documents and Projects');
const SYSTEM_DIR = path.join(JARVIS_DIR, 'system');
const MEMORY_FILE = path.join(SYSTEM_DIR, 'FELIPE-MEMORY.md');
const HISTORY_FILE = path.join(SYSTEM_DIR, 'FELIPE-HISTORY.json');
const EMBEDDINGS_FILE = path.join(SYSTEM_DIR, 'memory-embeddings.json');
const MAX_HISTORY = 20;
const MAX_EMBEDDINGS = 2000;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ========== RATE LIMITER — Prevent 429 errors ==========
const _rateLimiter = { lastCall: 0, minInterval: 500 }; // min 500ms between OpenAI calls

async function rateLimitedOpenAI(fn) {
  const now = Date.now();
  const wait = Math.max(0, _rateLimiter.minInterval - (now - _rateLimiter.lastCall));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  _rateLimiter.lastCall = Date.now();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if ((err?.status === 429 || err?.message?.includes('429')) && attempt < 2) {
        const delay = (attempt + 1) * 3000;
        console.warn(`[FELIPE] Rate limited (429). Retry ${attempt+1}/2 in ${delay/1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        _rateLimiter.lastCall = Date.now();
        continue;
      }
      throw err;
    }
  }
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const pendingSpawns = new Map();
const attachments = new Map();

// ── Context tracking: last actions for follow-up commands ──
let _lastAction = { task: '', result: '', time: 0, files: [] };

// ========== CLAUDE CLI HEALTH CHECK ==========
// Non-blocking: checks CLI exists synchronously (fast), defers auth check.
let claudeCliAvailable = false;
let claudeCliChecking = true;
let claudeCliError = '';

// Procura o binario do Claude CLI com QUINTUPLO CHECK:
// 0. Via .env (CLAUDE_CLI_PATH) — salvo pelo instalador
// 1. Via PATH (rapido)
// 2. Via 'where claude' / 'which claude' (descobre caminho real)
// 3. Via caminhos conhecidos hardcoded (npm + native installer + Program Files)
// 4. Busca recursiva em AppData\Local\Programs (fallback final)
function findClaudeCli() {
  // Estrategia 0: caminho salvo no .env pelo instalador
  if (process.env.CLAUDE_CLI_PATH && fs.existsSync(process.env.CLAUDE_CLI_PATH)) {
    try {
      execSync(`"${process.env.CLAUDE_CLI_PATH}" --version`, { stdio: 'pipe', timeout: 5000, shell: true });
      console.log(`[FELIPE] Claude CLI encontrado via .env: ${process.env.CLAUDE_CLI_PATH}`);
      return process.env.CLAUDE_CLI_PATH;
    } catch {}
  }

  // Estrategia 1: PATH direto
  try {
    execSync('claude --version', { stdio: 'pipe', timeout: 5000, shell: true });
    console.log('[FELIPE] Claude CLI encontrado via PATH');
    return 'claude';
  } catch {}

  // Estrategia 2: where/which (descobre caminho real mesmo se o Electron tiver PATH reduzido)
  try {
    const cmd = process.platform === 'win32' ? 'where claude' : 'which claude';
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000, shell: true });
    const paths = result.split('\n').map(p => p.trim()).filter(Boolean);
    for (const p of paths) {
      if (fs.existsSync(p)) {
        try {
          execSync(`"${p}" --version`, { stdio: 'pipe', timeout: 5000, shell: true });
          console.log(`[FELIPE] Claude CLI encontrado via where: ${p}`);
          return p;
        } catch {}
      }
    }
  } catch {}

  // Estrategia 3: caminhos conhecidos
  const HOME = os.homedir();
  const candidates = [
    // Native installer (novo — Claude Code v2.1+)
    path.join(HOME, '.local', 'bin', 'claude.exe'),
    path.join(HOME, '.local', 'bin', 'claude.cmd'),
    path.join(HOME, '.local', 'bin', 'claude'),
    path.join(HOME, 'AppData', 'Local', 'Programs', 'claude-code', 'claude.exe'),
    path.join(HOME, 'AppData', 'Local', 'Programs', 'Claude', 'claude.exe'),
    path.join(HOME, 'AppData', 'Local', 'Anthropic', 'Claude Code', 'claude.exe'),
    path.join(HOME, 'AppData', 'Local', 'claude-code', 'claude.exe'),
    path.join(HOME, 'AppData', 'Local', 'anthropic', 'claude-code', 'claude.exe'),
    // npm global bin (antigo)
    path.join(HOME, 'AppData', 'Roaming', 'npm', 'claude.cmd'),
    path.join(HOME, 'AppData', 'Roaming', 'npm', 'claude.exe'),
    // Program Files
    'C:\\Program Files\\Claude Code\\claude.exe',
    'C:\\Program Files\\Claude\\claude.exe',
    'C:\\Program Files\\Anthropic\\Claude Code\\claude.exe',
    'C:\\Program Files\\nodejs\\claude.cmd',
  ];

  for (const cmd of candidates) {
    if (fs.existsSync(cmd)) {
      try {
        execSync(`"${cmd}" --version`, { stdio: 'pipe', timeout: 5000, shell: true });
        console.log(`[FELIPE] Claude CLI encontrado via candidato: ${cmd}`);
        return cmd;
      } catch {}
    }
  }

  // Estrategia 4: busca recursiva em AppData\Local\Programs
  try {
    const programsDir = path.join(HOME, 'AppData', 'Local', 'Programs');
    if (fs.existsSync(programsDir)) {
      const dirs = fs.readdirSync(programsDir);
      for (const d of dirs) {
        if (d.toLowerCase().includes('claude') || d.toLowerCase().includes('anthropic')) {
          const subDir = path.join(programsDir, d);
          try {
            const files = fs.readdirSync(subDir);
            for (const f of files) {
              if (f.toLowerCase().startsWith('claude') && (f.endsWith('.exe') || f.endsWith('.cmd'))) {
                const exePath = path.join(subDir, f);
                try {
                  execSync(`"${exePath}" --version`, { stdio: 'pipe', timeout: 5000, shell: true });
                  console.log(`[FELIPE] Claude CLI encontrado via busca: ${exePath}`);
                  return exePath;
                } catch {}
              }
            }
          } catch {}
        }
      }
    }
  } catch {}

  return null;
}

let CLAUDE_CMD = 'claude'; // Atualizado em checkClaudeCliSync()

// Localiza o Python instalado (evita o alias do Windows Store)
function findPythonExe() {
  const candidates = [
    'C:\\Program Files\\Python311\\python.exe',
    'C:\\Program Files\\Python312\\python.exe',
    'C:\\Program Files\\Python310\\python.exe',
    'C:\\Program Files (x86)\\Python311\\python.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python311', 'python.exe'),
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python312', 'python.exe'),
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python310', 'python.exe'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  // Fallback: tentar via where (evita alias do Store que redireciona)
  try {
    const result = execSync('where python', { encoding: 'utf-8', timeout: 5000, shell: true });
    const paths = result.split('\n').map(p => p.trim()).filter(Boolean);
    for (const p of paths) {
      if (p.includes('WindowsApps')) continue;
      if (fs.existsSync(p)) return p;
    }
  } catch {}
  return 'python';
}

const PYTHON_CMD = findPythonExe();
console.log(`[FELIPE] Python em: ${PYTHON_CMD}`);

function checkClaudeCliSync() {
  const found = findClaudeCli();
  if (found) {
    CLAUDE_CMD = found;
    return true;
  }
  claudeCliError = 'Claude Code CLI not found. Install: npm install -g @anthropic-ai/claude-code';
  console.error(`[FELIPE] ❌ ${claudeCliError}`);
  return false;
}

async function checkClaudeCliAuth() {
  // Slow check: can Claude actually execute? (~5-15s) — runs AFTER server starts
  try {
    await new Promise((resolve, reject) => {
      const proc = spawn(CLAUDE_CMD, [
        '--print', '--output-format', 'text',
        '--dangerously-skip-permissions'
      ], { shell: true, cwd: JARVIS_DIR });

      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => { try { proc.kill(); } catch {} reject(new Error('timeout')); }, 60000);

      proc.stdin.write('say OK');
      proc.stdin.end();
      proc.stdout.on('data', d => { stdout += d; });
      proc.stderr.on('data', d => { stderr += d; });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0 && stdout.trim().length > 0) resolve(stdout);
        else reject(new Error(stderr || `exit code ${code}`));
      });
      proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    });

    claudeCliAvailable = true;
    claudeCliError = '';
    claudeCliChecking = false;
    console.log('[FELIPE] ✅ Claude Code CLI: authenticated and working');

    // Now fill pools
    pools.opus.fill();
    pools.sonnet.fill();
    pools.haiku.fill();
    console.log(`[FELIPE] ✅ Pools filled: Opus×${pools.opus.pool.length} Sonnet×${pools.sonnet.pool.length} Haiku×${pools.haiku.pool.length}`);
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('auth') || msg.includes('login') || msg.includes('API key') || msg.includes('401')) {
      claudeCliError = 'Claude not authenticated. Run: claude (login in terminal)';
    } else if (msg.includes('permission') || msg.includes('dangerous')) {
      claudeCliError = 'Claude needs permission setup. Run: claude --dangerously-skip-permissions';
    } else if (msg === 'timeout') {
      claudeCliError = 'Claude auth check timed out (20s). May be slow or not authenticated.';
    } else {
      claudeCliError = `Claude test failed: ${msg.slice(0, 200)}`;
    }
    claudeCliAvailable = false;
    claudeCliChecking = false;
    console.error(`[FELIPE] ❌ ${claudeCliError}`);
  }
}

function checkClaudeCli() {
  // Sync wrapper for API endpoint recheck
  claudeCliChecking = true;
  const exists = checkClaudeCliSync();
  if (!exists) { claudeCliChecking = false; return false; }
  // Kick off async auth check
  checkClaudeCliAuth();
  return exists; // optimistic: CLI exists, auth pending
}

// Run fast sync check now (does CLI exist?), defer auth to after server starts
const cliExists = checkClaudeCliSync();
if (cliExists) {
  claudeCliAvailable = true; // optimistic — will be reverted if auth fails
  claudeCliChecking = true;
}

// ========== WARM POOL — Zero-latency CLI spawning ==========
// Pre-spawns claude processes so they're ready before requests arrive.
// Acquiring from pool = 0ms spawn wait. Background refill keeps pool full.
class WarmPool {
  constructor(model, size) {
    this.model = model;
    this.size = size;
    this.pool = [];
    this.spawnErrors = 0;
    // Only fill if Claude CLI is available
    if (claudeCliAvailable) this.fill();
  }

  _spawn() {
    const proc = spawn(CLAUDE_CMD, [
      '--print', '--output-format', 'text',
      '--model', this.model,
      '--dangerously-skip-permissions'
    ], { shell: true, cwd: JARVIS_DIR });
    proc._warmSince = Date.now();
    proc._model = this.model;
    // Log stderr errors — filter expected warm-pool warnings
    proc.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (!msg) return;
      // Warm pool processes will always warn about no stdin — that's expected
      if (msg.includes('no stdin data received') || msg.includes('Input must be provided')) return;
      console.error(`[FELIPE] [${this.model}] stderr: ${msg}`);
    });
    // Track spawn failures
    proc.on('error', (err) => {
      this.spawnErrors++;
      console.error(`[FELIPE] [${this.model}] spawn error #${this.spawnErrors}: ${err.message}`);
      if (this.spawnErrors >= 3 && claudeCliAvailable) {
        claudeCliAvailable = false;
        claudeCliError = `Claude CLI crashed ${this.spawnErrors} times. Check installation.`;
        console.error(`[FELIPE] ❌ DISABLED: Claude pools disabled after ${this.spawnErrors} spawn errors`);
      }
    });
    return proc;
  }

  fill() {
    if (!claudeCliAvailable) return;
    while (this.pool.length < this.size) {
      this.pool.push(this._spawn());
    }
  }

  // Acquire a warm process. Immediately schedule refill.
  acquire() {
    if (!claudeCliAvailable) return null;
    let proc;
    if (this.pool.length > 0) {
      proc = this.pool.shift();
      // Drop stale processes (>90s old — they may have timed out)
      if (Date.now() - proc._warmSince > 90000) {
        try { proc.kill(); } catch {}
        proc = this._spawn();
      }
    } else {
      proc = this._spawn(); // emergency cold spawn
    }
    setImmediate(() => this.fill()); // refill async
    return proc;
  }

  // Drain and refill (e.g. after model change)
  flush() {
    for (const p of this.pool) try { p.kill(); } catch {}
    this.pool = [];
    if (claudeCliAvailable) this.fill();
  }
}

// One pool per model tier — sized by expected traffic
const pools = {
  opus:   new WarmPool('claude-opus-4-6',         1),
  sonnet: new WarmPool('claude-sonnet-4-6',        3),
  haiku:  new WarmPool('claude-haiku-4-5-20251001',4),
};

function getPool(model) {
  if (model.includes('opus'))   return pools.opus;
  if (model.includes('sonnet')) return pools.sonnet;
  return pools.haiku;
}

// ========== IN-MEMORY CACHE — Avoid disk reads on every request ==========
const _cache = {
  memory: { value: '', mtime: 0 },
  history: { value: [], dirty: false },
};

function loadMemoryCached() {
  try {
    const stat = fs.statSync(MEMORY_FILE);
    if (stat.mtimeMs !== _cache.memory.mtime) {
      _cache.memory.value = fs.readFileSync(MEMORY_FILE, 'utf-8');
      _cache.memory.mtime = stat.mtimeMs;
    }
  } catch { _cache.memory.value = ''; }
  return _cache.memory.value;
}

function loadHistoryCached() {
  if (_cache.history.dirty) {
    _cache.history.value = loadHistory();
    _cache.history.dirty = false;
  }
  return _cache.history.value;
}

function appendHistoryFast(role, content) {
  const exchanges = loadHistory();
  exchanges.push({ role, content: content.slice(0, 2000), ts: new Date().toISOString() });
  // When history overflows: compact oldest entries into FELIPE-MEMORY.md (preserve, never delete)
  if (exchanges.length > MAX_HISTORY * 2) {
    const overflow = exchanges.splice(0, exchanges.length - MAX_HISTORY * 2);
    compactToMemory(overflow);
  }
  saveHistory(exchanges);
  _cache.history.dirty = true;
}

// Compact overflow history into FELIPE-MEMORY.md as a summary section
// This preserves all context permanently without bloating the active prompt
function compactToMemory(entries) {
  try {
    const summary = entries.map(e => `  [${e.ts?.slice(0,10)||''}][${e.role}] ${e.content.slice(0,300)}`).join('\n');
    const block = `\n## Archived History (${new Date().toISOString().slice(0,10)})\n${summary}\n`;
    fs.appendFileSync(MEMORY_FILE, block);
    _cache.memory.mtime = 0; // invalidate memory cache
  } catch {}
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ========== CHROME DETECTION ==========
function findChrome() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    '/usr/bin/google-chrome',
    '/usr/lib/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  for (const p of paths) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  return null;
}

// ========== HTML TO PDF ==========
async function htmlToPdf(htmlPath, pdfPath) {
  const chromePath = findChrome();
  const launchOpts = {
    headless: true,
    pipe: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-setuid-sandbox']
  };
  if (chromePath) launchOpts.executablePath = chromePath;

  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();
}

// ========== PERSISTENT MEMORY ==========
function loadMemory() {
  try { return fs.readFileSync(MEMORY_FILE, 'utf-8'); } catch { return ''; }
}

function loadHistory() {
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')); } catch { return []; }
}

function saveHistory(exchanges) {
  try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(exchanges, null, 2)); } catch {}
}

function appendHistory(role, content) {
  const exchanges = loadHistory();
  exchanges.push({ role, content: content.slice(0, 2000), ts: new Date().toISOString() });
  if (exchanges.length > MAX_HISTORY * 2) exchanges.splice(0, exchanges.length - MAX_HISTORY * 2);
  saveHistory(exchanges);
}

// Adaptive history window — voice=6 entries, text=16 entries (fast), task=32
// Older entries are summarized into FELIPE-MEMORY on overflow, never deleted
function formatHistoryForPrompt(exchanges, isVoice = false, isTask = false) {
  const window = isVoice ? 6 : (isTask ? 32 : 16);
  return exchanges.slice(-window).map(e =>
    `[${e.role}] ${e.content}`
  ).join('\n');
}

// ========== SEMANTIC MEMORY (EMBEDDINGS) ==========
function loadEmbeddings() {
  try { return JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf-8')); } catch { return []; }
}

function saveEmbeddings(entries) {
  try { fs.writeFileSync(EMBEDDINGS_FILE, JSON.stringify(entries)); } catch {}
}

function cosineSimilar(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function embed(text) {
  if (!openai) return null;
  return rateLimitedOpenAI(async () => {
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 5000)
    });
    return res.data[0].embedding;
  });
}

// ========== RAG MEMORY SYSTEM — Long-term categorized memory ==========
const MEMORY_CATEGORIES = ['conversation', 'project', 'preference', 'decision', 'skill', 'fact'];

function categorizeMemory(userMsg, jarvisReply) {
  const combined = (userMsg + ' ' + jarvisReply).toLowerCase();
  if (/prefer|gosto|sempre|nunca|modo|estilo|formato|tom|voice|idioma/i.test(combined)) return 'preference';
  if (/decid|escolh|optei|vamos com|confirmo|aprovado|go with/i.test(combined)) return 'decision';
  if (/projeto|project|criou|deploy|site|app|saas|planilha|pdf|apresenta/i.test(combined)) return 'project';
  if (/aprendi|descobri|lembr|importante|anotar|salvar|memoriz/i.test(combined)) return 'fact';
  if (/como fazer|tutorial|passo|instrução|configur|instalar/i.test(combined)) return 'skill';
  return 'conversation';
}

function chunkText(text, maxChunk = 800) {
  if (text.length <= maxChunk) return [text];
  const chunks = [];
  const sentences = text.split(/[.!?\n]+/);
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > maxChunk && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += (current ? '. ' : '') + s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function storeMemory(userMsg, jarvisReply) {
  try {
    if (!openai) return;
    const category = categorizeMemory(userMsg, jarvisReply);
    const fullText = `User: ${userMsg}\nFelipe: ${jarvisReply}`;
    const chunks = chunkText(fullText);

    const entries = loadEmbeddings();

    for (const chunk of chunks) {
      const embedding = await embed(chunk);
      if (!embedding) continue;
      entries.push({
        text: chunk.slice(0, 1200),
        category,
        embedding,
        ts: new Date().toISOString(),
        tokens: Math.ceil(chunk.length / 4)
      });
    }

    // Prune: keep max entries, remove oldest conversations first (preserve preferences/decisions longer)
    if (entries.length > MAX_EMBEDDINGS) {
      const important = entries.filter(e => ['preference', 'decision', 'project'].includes(e.category));
      const regular = entries.filter(e => !['preference', 'decision', 'project'].includes(e.category));
      // Remove oldest regular entries first
      while (important.length + regular.length > MAX_EMBEDDINGS && regular.length > 0) {
        regular.shift();
      }
      saveEmbeddings([...regular, ...important]);
    } else {
      saveEmbeddings(entries);
    }
  } catch (e) {
    console.error('[FELIPE] Memory store error:', e.message);
  }
}

async function findRelevantMemories(query, topK = 5) {
  try {
    if (!openai) return '';
    const queryEmb = await Promise.race([
      embed(query),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000))
    ]);
    if (!queryEmb) return '';
    const entries = loadEmbeddings();
    const now = Date.now();

    const scored = entries.map(e => {
      const similarity = cosineSimilar(queryEmb, e.embedding);
      // Boost recent entries (decay over 30 days)
      const age = (now - new Date(e.ts).getTime()) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 0.1 * (1 - age / 30));
      // Boost important categories
      const categoryBoost = ['preference', 'decision'].includes(e.category) ? 0.05 : 0;
      return { ...e, score: similarity + recencyBoost + categoryBoost };
    })
      .sort((a, b) => b.score - a.score)
      .filter(e => e.score > 0.68)
      .slice(0, topK);

    if (scored.length === 0) return '';
    return scored.map(e => `[${e.category}|${new Date(e.ts).toLocaleDateString()}] ${e.text.slice(0, 600)}`).join('\n---\n');
  } catch { return ''; }
}

// ========== PROJECT CONTEXT ==========
function loadProjectContext() {
  try {
    const projects = fs.readdirSync(PROJECTS_DIR);
    for (const p of projects) {
      const ctxPath = path.join(PROJECTS_DIR, p, 'CONTEXT.md');
      if (fs.existsSync(ctxPath)) return fs.readFileSync(ctxPath, 'utf-8');
    }
    return '';
  } catch { return ''; }
}

// ========== MODEL ROUTING — Agent × Complexity Matrix ==========
// Each agent maps to its optimal model. Message content refines the choice.

const AGENT_MODEL_MAP = {
  // OPUS 4.6 — Highest reasoning, architecture, orchestration
  'architect':           'claude-opus-4-6',
  'aios-master':         'claude-opus-4-6',
  'conclave-critico':    'claude-opus-4-6',
  'conclave-advogado':   'claude-opus-4-6',
  'conclave-sintetizador': 'claude-opus-4-6',
  'data-engineer':       'claude-opus-4-6',
  'devops':              'claude-opus-4-6',

  // SONNET 4.6 — Balanced: code, UX, product, research
  'dev':      'claude-sonnet-4-6',
  'ux':       'claude-sonnet-4-6',
  'pm':       'claude-sonnet-4-6',
  'po':       'claude-sonnet-4-6',
  'analyst':  'claude-sonnet-4-6',
  'qa':       'claude-sonnet-4-6',

  // HAIKU 4.5 — Fast: templates, story creation, simple queries
  'sm':       'claude-haiku-4-5-20251001',
};

function detectAgent(message) {
  // Detect explicit @agent mention
  const match = message.match(/@([\w-]+)/);
  if (match) return match[1].toLowerCase();

  // Detect implicit agent from keywords
  const lower = message.toLowerCase();
  if (/\b(arquitetura|architecture|system design|stack|padrão|pattern|decisão técnica)\b/i.test(lower)) return 'architect';
  if (/\b(banco|database|schema|migration|sql|query|índice|index|rls)\b/i.test(lower)) return 'data-engineer';
  if (/\b(deploy|push|ci\/cd|pipeline|release|infraestrutura)\b/i.test(lower)) return 'devops';
  if (/\b(conclave|delibera|critique|critique|worst.case|attack)\b/i.test(lower)) return 'conclave-critico';
  if (/\b(ui|ux|interface|design|layout|componente|component|wireframe)\b/i.test(lower)) return 'ux';
  if (/\b(epic|prd|spec|requisito|requirement|roadmap)\b/i.test(lower)) return 'pm';
  if (/\b(story|história|backlog|prioridade|aceite)\b/i.test(lower)) return 'po';
  if (/\b(teste|test|bug|qualidade|quality|coverage)\b/i.test(lower)) return 'qa';
  if (/\b(pesquisa|research|analise|dados|data|relatório|report)\b/i.test(lower)) return 'analyst';
  return null;
}

function selectModelByComplexity(message) {
  const lower = message.toLowerCase();

  // 0. Explicit model override — user can force any model
  if (/\bopus\b/i.test(lower))  return 'claude-opus-4-6';
  if (/\bsonnet\b/i.test(lower)) return 'claude-sonnet-4-6';
  if (/\bhaiku\b/i.test(lower))  return 'claude-haiku-4-5-20251001';

  // 1. Agent-based routing — any agent can be used with any model
  //    Default mapping below is optimal, but not a restriction
  const agent = detectAgent(message);
  if (agent && AGENT_MODEL_MAP[agent]) return AGENT_MODEL_MAP[agent];

  // 2. Complexity-based routing (fallback)
  if (/\b(architect|redesign|refactor|infrastructure|migration|deploy|scale|system design|e-?book|full system|complete|advanced|complex|comprehensive|deep analysis|entire|production|enterprise|conclave|delibera|schema|database|migration)\b/i.test(lower))
    return 'claude-opus-4-6';

  if (/\b(create|generate|build|make|write|produce|design|implement|develop|fix|update|modify|analyze|report|presentation|website|app|pdf|document|code|script|html|css|crie|gere|construa|faça|escreva|implemente|corrija)\b/i.test(lower))
    return 'claude-sonnet-4-6';

  return 'claude-haiku-4-5-20251001';
}

// Expose detected agent for prompt enrichment
function getAgentContext(message) {
  const agent = detectAgent(message);
  if (!agent) return '';
  const contexts = {
    'architect':    'You are operating as @architect (Aria). Focus on system design, technology decisions, scalability, and architectural patterns.',
    'dev':          'You are operating as @dev (Dex). Write clean, production-ready code. Execute and deliver immediately.',
    'qa':           'You are operating as @qa (Quinn). Find bugs, validate logic, write test cases. Be rigorous.',
    'devops':       'You are operating as @devops (Gage). Handle deployment, infrastructure, CI/CD. You have exclusive authority over git push and PRs.',
    'pm':           'You are operating as @pm (Morgan). Create structured specs, epics, and requirements. Be precise and complete.',
    'po':           'You are operating as @po (Pax). Validate requirements, prioritize backlog, define acceptance criteria.',
    'sm':           'You are operating as @sm (River). Create user stories from epics using the standard template.',
    'data-engineer':'You are operating as @data-engineer (Dara). Design schemas, write migrations, optimize queries.',
    'analyst':      'You are operating as @analyst. Research thoroughly, analyze data, produce clear reports with findings.',
    'ux':           'You are operating as @ux-design-expert. Design world-class interfaces following 2026 design systems.',
    'aios-master':  'You are operating as @aios-master (Orion). Orchestrate the full team. Execute any task directly. No restrictions.',
    'conclave-critico':    'You are the Crítico Metodológico. Audit every claim. Find gaps. Demand sources.',
    'conclave-advogado':   'You are the Advogado do Diabo. Attack the decision. Find worst-cases. Challenge every assumption.',
    'conclave-sintetizador': 'You are the Sintetizador. Integrate all perspectives into one clear, actionable recommendation.',
  };
  return contexts[agent] || '';
}

// ========== TASK DETECTION ==========
// Task detection — comprehensive word list (all conjugations hardcoded)
const _taskWords = new Set([
  // English
  'create','generate','build','make','write','produce','design','implement','develop',
  'fix','update','modify','analyze','report','research','search','find','plan','draft',
  'compile','summarize','convert','export','deploy','install','setup','configure',
  'refactor','test','debug','document','open','access','navigate','play','stream',
  'run','execute','send','schedule','move','rename','delete','download','upload',
  'organize','show','display','start','stop','close','save','copy','paste','edit',
  'add','remove','change','set','get','list','check','read','print','scan','connect',
  // PT — criar
  'cria','crie','crio','criou','criar','criando','criado',
  // PT — gerar
  'gera','gere','gero','gerou','gerar','gerando','gerado',
  // PT — fazer
  'faz','faça','fez','fazer','fazendo','feito',
  // PT — abrir
  'abre','abra','abro','abriu','abrir','abrindo','aberto',
  // PT — escrever
  'escreve','escreva','escreveu','escrever','escrevendo','escrito',
  // PT — construir
  'constroi','construa','construiu','construir','construindo',
  // PT — desenhar
  'desenha','desenhe','desenhou','desenhar','desenhando',
  // PT — implementar
  'implementa','implemente','implementou','implementar','implementando',
  // PT — desenvolver
  'desenvolve','desenvolva','desenvolveu','desenvolver','desenvolvendo',
  // PT — corrigir
  'corrige','corrija','corrigiu','corrigir','corrigindo',
  // PT — atualizar
  'atualiza','atualize','atualizou','atualizar','atualizando',
  // PT — analisar
  'analisa','analise','analisou','analisar','analisando',
  // PT — pesquisar
  'pesquisa','pesquise','pesquisou','pesquisar','pesquisando',
  // PT — buscar
  'busca','busque','buscou','buscar','buscando',
  // PT — encontrar
  'encontra','encontre','encontrou','encontrar','encontrando',
  // PT — planejar
  'planeja','planeje','planejou','planejar','planejando',
  // PT — montar
  'monta','monte','montou','montar','montando',
  // PT — preparar
  'prepara','prepare','preparou','preparar','preparando',
  // PT — elaborar
  'elabora','elabore','elaborou','elaborar','elaborando',
  // PT — colocar
  'coloca','coloque','colocou','colocar','colocando',
  // PT — tocar/reproduzir
  'toca','toque','tocou','tocar','tocando','reproduz','reproduza','reproduzir',
  // PT — executar
  'executa','execute','executou','executar','executando',
  // PT — enviar/mandar
  'envia','envie','enviou','enviar','enviando','manda','mande','mandou','mandar',
  // PT — agendar
  'agenda','agende','agendou','agendar','agendando',
  // PT — mover
  'move','mova','moveu','mover','movendo',
  // PT — salvar
  'salva','salve','salvou','salvar','salvando',
  // PT — mostrar/exibir
  'mostra','mostre','mostrou','mostrar','mostrando','exibe','exiba','exibir',
  // PT — editar
  'edita','edite','editou','editar','editando',
  // PT — deletar/apagar
  'deleta','delete','deletou','deletar','apaga','apague','apagou','apagar',
  // PT — baixar
  'baixa','baixe','baixou','baixar','baixando',
  // PT — organizar
  'organiza','organize','organizou','organizar','organizando',
  // PT — formatar
  'formata','formate','formatou','formatar','formatando',
  // PT — calcular
  'calcula','calcule','calculou','calcular','calculando',
  // PT — traduzir
  'traduz','traduza','traduziu','traduzir','traduzindo',
  // PT — publicar
  'publica','publique','publicou','publicar','publicando',
  // PT — instalar
  'instala','instale','instalou','instalar','instalando',
  // PT — configurar
  'configura','configure','configurou','configurar','configurando',
  // PT — testar
  'testa','teste','testou','testar','testando',
  // PT — documentar
  'documenta','documente','documentou','documentar','documentando',
  // PT — rodar
  'roda','rode','rodou','rodar','rodando',
  // PT — fechar
  'fecha','feche','fechou','fechar','fechando',
  // PT — copiar
  'copia','copie','copiou','copiar','copiando',
  // PT — adicionar
  'adiciona','adicione','adicionou','adicionar','adicionando',
  // PT — remover
  'remove','remova','removeu','remover','removendo',
  // PT — alterar/mudar
  'altera','altere','alterou','alterar','muda','mude','mudou','mudar',
  // PT — verificar
  'verifica','verifique','verificou','verificar','verificando',
  // PT — digitar
  'digita','digite','digitou','digitar','digitando',
  // PT — conectar
  'conecta','conecte','conectou','conectar','conectando',
  // PT — compartilhar
  'compartilha','compartilhe','compartilhou','compartilhar',
  // PT — responder
  'responde','responda','respondeu','responder',
  // PT — ouvir/escutar
  'ouvir','escutar','ouça','escute',
  // PT — iniciar/parar
  'inicia','inicie','iniciou','iniciar','para','pare','parou','parar',
  // PT — renomear
  'renomeia','renomeie','renomeou','renomear',
  // ES
  'haz','haga','abre','abra','busca','busque','crea','cree','pon','ponga',
]);

// Simple regex fallback for routeToGPT and other references
const TASK_PATTERN = /\b(create|build|make|write|open|play|search|find|fix|update|install|cria|crie|criar|abre|abra|abrir|faz|faça|fazer|gera|gere|gerar|monta|monte|montar|coloca|coloque|colocar|toca|toque|tocar|pesquisa|pesquise|pesquisar|busca|busque|buscar|edita|edite|editar|salva|salve|salvar|envia|envie|enviar|manda|mande|mandar|move|mova|mover|baixa|baixe|baixar|organiza|organize|organizar|formata|formate|formatar|calcula|calcule|calcular|traduz|traduza|traduzir|instala|instale|instalar|configura|configure|configurar|testa|teste|testar|executa|execute|executar|roda|rode|rodar|fecha|feche|fechar|copia|copie|copiar|adiciona|adicione|adicionar|remove|remova|remover|altera|altere|alterar|verifica|verifique|verificar|conecta|conecte|conectar|publica|publique|publicar|compartilha|compartilhe|compartilhar|responde|responda|responder|ouvir|escutar|ouça|escute|reproduz|reproduza|reproduzir|desenvolve|desenvolva|desenvolver|implementa|implemente|implementar|analisa|analise|analisar|elabora|elabore|elaborar|prepara|prepare|preparar|documenta|documente|documentar|corrige|corrija|corrigir|atualiza|atualize|atualizar|desenha|desenhe|desenhar|constroi|construa|construir|renomeia|renomeie|renomear|deleta|delete|deletar|apaga|apague|apagar|agenda|agende|agendar|digita|digite|digitar|inicia|inicie|iniciar|para|pare|parar)\b/i;

function isTaskRequest(message) {
  const words = message.toLowerCase().replace(/[^a-záàâãéèêíïóôõúüçñ\s]/gi, '').split(/\s+/);
  if (words.some(w => _taskWords.has(w))) return true;
  if (SCREEN_PATTERN.test(message)) return true;
  return false;
}

// Screen/vision queries — always route to Claude (never GPT-mini)
const SCREEN_PATTERN = /\b(tela|monitor|screen|olh[aeo]|vej[ao]|mostr[ae]|v[eê]|see|look|what.*screen|o que.*tela|o que.*monitor|consegue.*ver|can.*see|minha tela|my screen|está aberto|what.*open)\b/i;

// Computer Use v2 patterns — actions that interact with the PC directly
const COMPUTER_USE_PATTERN = /\b(abre|abra|abrir|fecha|feche|fechar|minimiza|minimize|minimizar|maximiza|maximize|maximizar|alterna|alterne|alternar|foca|foque|focar|digita|digite|digitar|clica|clique|clicar|pressiona|pressione|scroll|rola|role|navega|navegue|navegar|preenche|preencha|preencher|configura|configure|configurar|instala|instale|instalar|desliga|desligue|desligar|reinicia|reinicie|reiniciar|bloco de notas|notepad|calculadora|calculator|explorador|explorer|gerenciador|task.?manager|prompt|cmd|terminal|powershell)\b/i;

// Needs screenshot? (visual tasks that require seeing the screen)
const NEEDS_SCREENSHOT_PATTERN = /\b(o que|what|mostra|show|veja|see|olha|look|onde|where|qual|which|como.*tá|how.*look|identifica|identify|encontra|find.*screen|acha.*tela|botão|button|ícone|icon|cor|color|imagem|image|visual)\b/i;

// Detect multi-task requests that can run in parallel
// "cria o site, a planilha e a apresentação" → 3 parallel tasks
function detectParallelTasks(message) {
  const msg = message.replace(/^felipe[,.]??\s*/i, '').trim();

  // Pattern: "cria/faz X, Y e Z" or "cria X e também Y"
  // Split by: ", e ", " e também ", ", depois ", ", além de ", " + "
  const splitPatterns = /\s*(?:,\s*e\s+também\s+|,\s*e\s+|,\s*depois\s+|,\s*além\s*d[eio]\s+|,\s*também\s+|\s+e\s+também\s+|\s+e\s+depois\s+)\s*/i;

  // Only split if the message has multiple action verbs
  const actionVerbs = msg.match(/\b(cri[ae]|faz|faça|gere|construa|escreva|abra|monte|prepare|analise|pesquise|create|build|make|write|open|generate|design)\b/gi);
  if (!actionVerbs || actionVerbs.length < 2) {
    // Check for list pattern: "X, Y e Z"
    if (!splitPatterns.test(msg)) return null;
    // Must have at least one action verb
    if (!actionVerbs || actionVerbs.length === 0) return null;
  }

  const parts = msg.split(splitPatterns).filter(p => p.trim().length > 5);
  if (parts.length < 2) return null;
  if (parts.length > 5) return null; // safety limit

  // Ensure first part has an action verb; propagate verb to other parts if missing
  const firstVerb = parts[0].match(/^(\w+)/)?.[1] || '';
  return parts.map((p, i) => {
    const trimmed = p.trim();
    // If part doesn't start with an action verb, prepend the first part's verb
    if (i > 0 && !TASK_PATTERN.test(trimmed)) {
      return `${firstVerb} ${trimmed}`;
    }
    return trimmed;
  });
}

// ========== FAST-PATH: Instant actions without Claude CLI ==========
// Two modes:
// 1. Regex patterns for ultra-common actions (~50ms) — open youtube, google, etc.
// 2. GPT-4o-mini smart routing (~500ms) — interprets complex commands and generates shell command
function tryFastExecution(message, language = 'BR') {
  const msg = message.toLowerCase().replace(/^felipe[,.]??\s*/i, '').trim();

  // ── Open URL patterns ──
  const urlPatterns = [
    { rx: /(?:abr[aie]|open|acesse?|navegue?)\s+(?:o\s+)?youtube(?!\s+e\s)/i, url: 'https://www.youtube.com' },
    { rx: /(?:abr[aie]|open|acesse?)\s+(?:o\s+)?google/i, url: 'https://www.google.com' },
    { rx: /(?:abr[aie]|open|acesse?)\s+(?:o\s+)?spotify/i, url: 'https://open.spotify.com' },
    { rx: /(?:abr[aie]|open|acesse?)\s+(?:o\s+)?github/i, url: 'https://github.com' },
    { rx: /(?:abr[aie]|open|acesse?)\s+(?:o\s+)?gmail/i, url: 'https://mail.google.com' },
    { rx: /(?:abr[aie]|open|acesse?)\s+(?:o\s+)?whatsapp/i, url: 'https://web.whatsapp.com' },
    { rx: /(?:abr[aie]|open|acesse?)\s+(?:o\s+)?twitter|(?:abr[aie]|open)\s+(?:o\s+)?x\b/i, url: 'https://x.com' },
    { rx: /(?:abr[aie]|open|acesse?)\s+(?:o\s+)?instagram/i, url: 'https://www.instagram.com' },
    { rx: /(?:abr[aie]|open|acesse?)\s+(?:o\s+)?linkedin/i, url: 'https://www.linkedin.com' },
    { rx: /(?:abr[aie]|open|acesse?)\s+(?:o\s+)?netflix/i, url: 'https://www.netflix.com' },
    { rx: /(?:abr[aie]|open|acesse?)\s+(?:o\s+)?claude/i, url: 'https://claude.ai' },
    { rx: /(?:abr[aie]|open|acesse?)\s+(?:o\s+)?chatgpt/i, url: 'https://chat.openai.com' },
    { rx: /(?:abr[aie]|open|acesse?)\s+(?:o\s+)?notion/i, url: 'https://www.notion.so' },
  ];

  for (const { rx, url } of urlPatterns) {
    if (rx.test(msg)) {
      try {
        execSync(`start "" "${url}"`, { shell: true, timeout: 3000 });
        const name = new URL(url).hostname.replace('www.', '');
        const summaries = { BR: `${name} aberto.`, ES: `${name} abierto.`, EN: `${name} opened.` };
        return { output: `[file] ${url}`, summary: summaries[language] || summaries.EN };
      } catch (e) { return null; }
    }
  }

  // ═══════════════════════════════════════════════════════
  // SMART HOOKS — Ações comuns executadas instantaneamente
  // ═══════════════════════════════════════════════════════

  // Helper: open URL and return result
  function openUrl(url, summary) {
    try { execSync(`start "" "${url}"`, { shell: true, timeout: 3000 }); return { output: `[file] ${url}`, summary }; } catch { return null; }
  }

  // ── YOUTUBE: Tocar música/vídeo ──
  // Patterns: "quero ouvir X", "toca X", "coloca X", "play X", "ouvir X no youtube"
  let ytQuery = null;

  const ytPatterns = [
    // "abre youtube e coloca/toca X"
    msg.match(/youtube\s+e\s+(?:coloca?|toca?|reproduz[ai]?|play|bota?|p[oõ]e)\s+(?:pra\s+)?(?:tocar\s+|play\s+)?(?:a\s+)?(?:m[uú]sica\s+|music\s+|song\s+|v[ií]deo\s+)?(.+)/i),
    // "coloca X pra tocar" / "bota X pra tocar" (pra tocar no final)
    msg.match(/(?:coloca?|bota?|p[oõ]e)\s+(.+?)\s+(?:pra|para)\s+(?:tocar|reproduzir|ouvir|play)/i),
    // "coloca/toca/reproduz X no youtube"
    msg.match(/(?:coloca?|toca?|reproduz[ai]?|play|bota?|p[oõ]e)\s+(?:pra\s+tocar\s+)?(?:a\s+)?(?:m[uú]sica\s+|music\s+|song\s+|v[ií]deo\s+)?(.+?)(?:\s+no\s+youtube|\s+on\s+youtube)/i),
    // "pesquisa X no youtube"
    msg.match(/(?:pesquis[ae]|search|busca?)\s+(.+?)(?:\s+no\s+youtube|\s+on\s+youtube)/i),
    // "toca a música X" / "play X"
    msg.match(/(?:coloca?|toca?|reproduz[ai]?|play|bota?|p[oõ]e)\s+(?:pra\s+tocar\s+)?(?:a\s+)?(?:m[uú]sica|music|song)\s+(.+)/i),
    // "toca X" / "play X" (simples, sem "música")
    msg.match(/(?:toca|toque|play)\s+(?:a\s+)?(.+)/i),
    // "quero ouvir X" / "quero escutar X"
    msg.match(/(?:quero|want)\s+(?:ouvir|escutar|hear|listen)\s+(?:a\s+)?(?:m[uú]sica\s+)?(.+)/i),
    // "ouvir X" / "escutar X"
    msg.match(/(?:ouvir|escutar|hear|listen\s+to)\s+(?:a\s+)?(?:m[uú]sica\s+)?(.+)/i),
  ];
  for (const m of ytPatterns) { if (m) { ytQuery = m[1]; break; } }

  if (ytQuery) {
    const clean = ytQuery.replace(/[?.!,]+$/, '').replace(/\s+no\s+youtube.*/i, '').replace(/\s+pra\s+mim.*/i, '').trim();

    // Open video DIRECTLY — no search page, no double tabs
    const ytPlayScript = path.join(JARVIS_DIR, 'system', 'youtube-play.py');
    try {
      // Run synchronously to get the video URL before responding
      const ytResult = execSync(`"${PYTHON_CMD}" "${ytPlayScript}" "${clean}"`, {
        encoding: 'utf-8', timeout: 10000, shell: true
      });
      console.log(`[FELIPE] ▶ YouTube: ${ytResult.trim()}`);
    } catch (e) {
      // Fallback: open search page
      execSync(`start "" "https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}"`, { shell: true, timeout: 3000 });
    }
    const summaries = { BR: `Tocando "${clean}" no YouTube.`, ES: `Reproduciendo "${clean}" en YouTube.`, EN: `Playing "${clean}" on YouTube.` };
    return { output: `[system] YouTube: ${clean}`, summary: summaries[language] || summaries.EN };
  }

  // ── SPOTIFY: Tocar música ──
  const spotifyMatch = msg.match(/(?:toca?|play|coloca?|reproduz|ouvir|escutar)\s+(.+?)(?:\s+no\s+spotify|\s+on\s+spotify)/i);
  if (spotifyMatch) {
    const q = encodeURIComponent(spotifyMatch[1].trim());
    return openUrl(`https://open.spotify.com/search/${q}`, { BR: `Buscando "${spotifyMatch[1].trim()}" no Spotify.`, ES: `Buscando en Spotify.`, EN: `Searching Spotify.` }[language]);
  }

  // ── GOOGLE: Pesquisar ──
  const googleMatch = msg.match(/(?:pesquis[ae]|search|busca?|googl[ae]|procur[ae])\s+(?:no\s+google\s+)?(?:sobre\s+|about\s+|por\s+|for\s+)?(.+?)(?:\s+no\s+google)?$/i);
  if (googleMatch && /pesquis|search|busca|google|procur/i.test(msg)) {
    const q = encodeURIComponent(googleMatch[1].replace(/\s+no\s+google$/i, '').trim());
    return openUrl(`https://www.google.com/search?q=${q}`, { BR: `Pesquisando no Google.`, ES: `Buscando en Google.`, EN: `Searching Google.` }[language]);
  }

  // ── GOOGLE MAPS: Navegação / Como chegar ──
  const mapsMatch = msg.match(/(?:como\s+cheg[ao]|rota\s+(?:para|pra|até)|naveg[ae]\s+(?:para|pra|até)|directions?\s+to|how\s+to\s+get\s+to|route\s+to)\s+(.+)/i)
    || msg.match(/(?:abr[aie]|open)\s+(?:o\s+)?(?:google\s+)?maps?\s+(?:em|in|para|pra|de)?\s*(.+)/i);
  if (mapsMatch) {
    const dest = encodeURIComponent(mapsMatch[1].trim());
    return openUrl(`https://www.google.com/maps/search/${dest}`, { BR: `Abrindo mapa.`, ES: `Abriendo mapa.`, EN: `Opening map.` }[language]);
  }

  // ── TIMER / ALARME ──
  const timerMatch = msg.match(/(?:timer|temporizador|alarme|alarm|cronômetro|cronometro)\s+(?:de\s+|for\s+|em\s+)?(\d+)\s*(min|minuto|minute|seg|segundo|second|hora|hour|h|m|s)/i);
  if (timerMatch) {
    const val = parseInt(timerMatch[1]);
    const unit = timerMatch[2].toLowerCase();
    let ms = val * 1000;
    if (unit.startsWith('min') || unit === 'm') ms = val * 60000;
    if (unit.startsWith('hora') || unit.startsWith('hour') || unit === 'h') ms = val * 3600000;
    // Set system timer via PowerShell notification
    const psCmd = `powershell -Command "Start-Sleep -Seconds ${ms/1000}; [System.Media.SystemSounds]::Exclamation.Play(); Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('Timer de ${val} ${timerMatch[2]} finalizado!','FELIPE - Timer')"`;
    spawn('cmd', ['/c', psCmd], { detached: true, shell: true, stdio: 'ignore' });
    return { output: `[system] Timer ${val}${unit}`, summary: { BR: `Timer de ${val} ${timerMatch[2]} iniciado.`, ES: `Temporizador de ${val} ${timerMatch[2]} iniciado.`, EN: `${val} ${timerMatch[2]} timer started.` }[language] };
  }

  // ── TRADUZIR ──
  const translateMatch = msg.match(/(?:traduz[ai]?|translate|traduc[ie])\s+(?:isso|isto|this|para|to|pra|em)?\s*(?:para|to|pra|em)?\s*(?:o\s+)?(?:inglês|english|espanhol|spanish|português|portuguese|francês|french|alemão|german)?\s*[:\-]?\s*"?(.+)"?/i);
  if (translateMatch && /traduz|translate|traduc/i.test(msg)) {
    // Let Claude handle translation — not a fast-path
    return null;
  }

  // ── HORA / DATA ──
  if (/(?:que\s+horas?\s+(?:s[aã]o|é)|what\s+time|hora\s+atual|current\s+time|que\s+dia\s+(?:é|e)\s+hoje|what\s+day|data\s+de\s+hoje|today'?s?\s+date|horas?\s+agora|que\s+horas?\s+agora)/i.test(msg)) {
    const now = new Date();
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return { output: `[system] ${time} - ${date}`, summary: { BR: `São ${time}, ${date}.`, ES: `Son las ${time}, ${date}.`, EN: `It's ${time}, ${date}.` }[language] };
  }

  // ── VOLUME do sistema ──
  const volMatch = msg.match(/(?:volume|som)\s+(?:em|para|pra|to|at)?\s*(\d+)\s*%?/i)
    || msg.match(/(?:aumenta?|sobe?|up)\s+(?:o\s+)?(?:volume|som)/i)
    || msg.match(/(?:diminui?|abaixa?|baixa?|down)\s+(?:o\s+)?(?:volume|som)/i)
    || msg.match(/(?:muta?|mute|silenci[ao])\s+(?:o\s+)?(?:volume|som|audio)/i);
  if (volMatch) {
    let volCmd = '';
    if (/muta|mute|silenci/i.test(msg)) {
      volCmd = 'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"';
    } else if (/aumenta|sobe|up/i.test(msg)) {
      volCmd = 'powershell -Command "1..5 | % { (New-Object -ComObject WScript.Shell).SendKeys([char]175) }"';
    } else if (/diminui|abaixa|baixa|down/i.test(msg)) {
      volCmd = 'powershell -Command "1..5 | % { (New-Object -ComObject WScript.Shell).SendKeys([char]174) }"';
    } else if (volMatch[1]) {
      const vol = parseInt(volMatch[1]);
      volCmd = `powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173); Start-Sleep -Milliseconds 200; $vol=${Math.round(vol/2)}; 1..$vol | % { (New-Object -ComObject WScript.Shell).SendKeys([char]175) }"`;
    }
    if (volCmd) {
      try { execSync(volCmd, { shell: true, timeout: 5000 }); } catch {}
      return { output: '[system] Volume ajustado', summary: { BR: 'Volume ajustado.', ES: 'Volumen ajustado.', EN: 'Volume adjusted.' }[language] };
    }
  }

  // ── SCREENSHOT / PRINT ──
  if (/\b(screenshot|print\s*screen|captur[ae]\s+tela|capture\s+screen|tira\s+(?:um\s+)?print|salva?\s+(?:a\s+)?tela)\b/i.test(msg)) {
    try {
      const ssPath = path.join(PROJECTS_DIR, `screenshot-${Date.now()}.jpg`);
      const scriptPath = path.join(JARVIS_DIR, 'system', 'screenshot.py');
      const result = execSync(`"${PYTHON_CMD}" "${scriptPath}" 1`, { encoding: 'utf-8', timeout: 10000, maxBuffer: 30*1024*1024 });
      const data = JSON.parse(result.trim());
      const buf = Buffer.from(data.data.split(',')[1], 'base64');
      fs.writeFileSync(ssPath, buf);
      return { output: `[file] ${ssPath}`, summary: { BR: `Screenshot salvo.`, ES: `Captura guardada.`, EN: `Screenshot saved.` }[language] };
    } catch { return null; }
  }

  // ── DESLIGAR / REINICIAR PC ──
  if (/\b(deslig[ae]|shutdown|turn\s+off)\s+(?:o\s+)?(?:pc|computador|computer|máquina)\b/i.test(msg)) {
    return { output: '[system] Shutdown solicitado', summary: { BR: 'Desligando em 30 segundos. Digite "shutdown /a" pra cancelar.', ES: 'Apagando en 30 segundos.', EN: 'Shutting down in 30 seconds.' }[language] };
  }
  if (/\b(reinici[ae]|restart|reboot)\s+(?:o\s+)?(?:pc|computador|computer|máquina)\b/i.test(msg)) {
    return { output: '[system] Restart solicitado', summary: { BR: 'Reiniciando em 30 segundos.', ES: 'Reiniciando en 30 segundos.', EN: 'Restarting in 30 seconds.' }[language] };
  }

  // ── Guard: if message has "e" (and) + more actions, skip fast-path → let Claude handle ──
  if (/\b(e|and|depois|then|também|also)\b.*\b(cri[ae]|faz|make|create|edit|escrev|write|mont|build|configur|preenche|coloc|add)/i.test(msg)) {
    return null; // Complex multi-step → Claude handles it
  }

  // ── Open programs (only simple "abre X" without follow-up actions) ──
  const programPatterns = [
    { rx: /(?:abr[aie]|open)\s+(?:o\s+)?excel$/i, cmd: 'start excel', name: 'Excel' },
    { rx: /(?:abr[aie]|open)\s+(?:o\s+)?word$/i, cmd: 'start winword', name: 'Word' },
    { rx: /(?:abr[aie]|open)\s+(?:o\s+)?powerpoint$|(?:abr[aie]|open)\s+(?:o\s+)?pptx?$/i, cmd: 'start powerpnt', name: 'PowerPoint' },
    { rx: /(?:abr[aie]|open)\s+(?:o\s+)?notepad$|(?:abr[aie]|open)\s+(?:o\s+)?bloco\s*de\s*notas$/i, cmd: 'start notepad', name: 'Notepad' },
    { rx: /(?:abr[aie]|open)\s+(?:o\s+)?calculadora$|(?:abr[aie]|open)\s+(?:the\s+)?calculator$/i, cmd: 'start calc', name: 'Calculator' },
    { rx: /(?:abr[aie]|open)\s+(?:o\s+)?explorador$|(?:abr[aie]|open)\s+(?:the\s+)?(?:file\s+)?explorer$/i, cmd: 'start explorer', name: 'Explorer' },
    { rx: /(?:abr[aie]|open)\s+(?:o\s+)?terminal$|(?:abr[aie]|open)\s+(?:o\s+)?cmd$/i, cmd: 'start cmd', name: 'Terminal' },
    { rx: /(?:abr[aie]|open)\s+(?:o\s+)?vs\s*code$|(?:abr[aie]|open)\s+(?:o\s+)?visual\s*studio\s*code$/i, cmd: 'start code', name: 'VS Code' },
    { rx: /(?:abr[aie]|open)\s+(?:o\s+)?paint$/i, cmd: 'start mspaint', name: 'Paint' },
  ];

  for (const { rx, cmd, name } of programPatterns) {
    if (rx.test(msg)) {
      try {
        execSync(cmd, { shell: true, timeout: 5000 });
        const summaries = { BR: `${name} aberto.`, ES: `${name} abierto.`, EN: `${name} opened.` };
        return { output: `[system] ${name} iniciado`, summary: summaries[language] || summaries.EN };
      } catch { return null; }
    }
  }

  // ── Open folders ──
  const folderMatch = msg.match(/(?:abr[aie]|open)\s+(?:a\s+)?pasta\s+(.+)/i) || msg.match(/(?:open)\s+(?:the\s+)?folder\s+(.+)/i);
  if (folderMatch) {
    const folderName = folderMatch[1].trim().replace(/['"]/g, '');
    const candidates = [
      path.join(os.homedir(), folderName),
      path.join(os.homedir(), 'Desktop', folderName),
      path.join(os.homedir(), 'Documents', folderName),
      path.join(os.homedir(), 'Downloads', folderName),
      path.join(PROJECTS_DIR, folderName),
      folderName, // absolute path
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          execSync(`start "" "${p}"`, { shell: true, timeout: 3000 });
          const summaries = { BR: `Pasta "${folderName}" aberta.`, ES: `Carpeta "${folderName}" abierta.`, EN: `Folder "${folderName}" opened.` };
          return { output: `[file] ${p}`, summary: summaries[language] || summaries.EN };
        } catch { return null; }
      }
    }
  }

  // ── Open any URL ──
  const urlMatch = msg.match(/(?:abr[aie]|open|acesse?|navegue?)\s+(?:o\s+site\s+|the\s+site\s+|the\s+website\s+)?(?:https?:\/\/)?(\S+\.\S+)/i);
  if (urlMatch) {
    let url = urlMatch[1];
    if (!url.startsWith('http')) url = 'https://' + url;
    try {
      execSync(`start "" "${url}"`, { shell: true, timeout: 3000 });
      const summaries = { BR: `${url} aberto.`, ES: `${url} abierto.`, EN: `${url} opened.` };
      return { output: `[file] ${url}`, summary: summaries[language] || summaries.EN };
    } catch { return null; }
  }

  // ── Weather / Clima ──
  const weatherMatch = msg.match(/(?:previs[aã]o|clima|tempo|weather|temperature|temperatura|forecast)\s*(?:em|in|de|do|da|para|pra|at)?\s*(.+)?/i);
  if (weatherMatch || /\b(previs[aã]o|clima|weather|temperatura)\b/i.test(msg)) {
    // Handled async — return null to fall to smart path or Claude
    // But set a flag so the smart path knows to fetch weather
    return null;
  }

  // Not a regex fast-path — return null, async smart-path handled separately
  return null;
}

// ── Weather API (free, no key needed) ──
async function fetchWeather(city, language = 'BR') {
  try {
    const encoded = encodeURIComponent(city || 'auto');
    const url = `https://wttr.in/${encoded}?format=j1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'curl/7.0' },
      signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    const current = data.current_condition?.[0];
    const location = data.nearest_area?.[0];
    const today = data.weather?.[0];
    const tomorrow = data.weather?.[1];

    if (!current || !location) return null;

    const cityName = location.areaName?.[0]?.value || city;
    const region = location.region?.[0]?.value || '';
    const temp = current.temp_C;
    const feels = current.FeelsLikeC;
    const desc = current.lang_pt?.[0]?.value || current.weatherDesc?.[0]?.value || '';
    const humidity = current.humidity;
    const wind = current.windspeedKmph;

    const summaries = {
      BR: `${cityName}${region ? ', ' + region : ''}: ${temp}°C agora (sensação ${feels}°C). ${desc}. Umidade ${humidity}%, vento ${wind}km/h.${tomorrow ? ` Amanhã: min ${tomorrow.mintempC}°C, máx ${tomorrow.maxtempC}°C.` : ''}`,
      ES: `${cityName}: ${temp}°C ahora (sensación ${feels}°C). ${desc}. Humedad ${humidity}%, viento ${wind}km/h.${tomorrow ? ` Mañana: mín ${tomorrow.mintempC}°C, máx ${tomorrow.maxtempC}°C.` : ''}`,
      EN: `${cityName}: ${temp}°C now (feels ${feels}°C). ${desc}. Humidity ${humidity}%, wind ${wind}km/h.${tomorrow ? ` Tomorrow: low ${tomorrow.mintempC}°C, high ${tomorrow.maxtempC}°C.` : ''}`
    };

    return {
      summary: summaries[language] || summaries.EN,
      city: cityName,
      temp, feels, desc, humidity, wind,
      todayMin: today?.mintempC, todayMax: today?.maxtempC,
      tomorrowMin: tomorrow?.mintempC, tomorrowMax: tomorrow?.maxtempC
    };
  } catch (e) {
    console.error('[FELIPE] Weather fetch error:', e.message);
    return null;
  }
}

// Async smart fast-path: GPT-4o-mini interprets and generates shell command (~500ms)
async function trySmartFastExecution(message, language = 'BR') {
  if (!openai) return null;
  const msg = message.replace(/^felipe[,.]??\s*/i, '').trim();

  // Only for action-like messages (not complex creation tasks)
  const isSimpleAction = /\b(abr[aie]|open|acesse?|toc[aeo]|play|reproduz|pesquis|search|busca|navegu|coloca|bota|p[oõ]e)\b/i.test(msg);
  if (!isSimpleAction) return null;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `You are a Windows command generator. Given a user request, output ONLY a single Windows shell command to execute it. Rules:
- To open URLs: start "" "https://..."
- To search YouTube: start "" "https://www.youtube.com/results?search_query=ENCODED_QUERY"
- To search Google: start "" "https://www.google.com/search?q=ENCODED_QUERY"
- To open programs: start PROGRAM_NAME
- To open folders: start "" "PATH"
- URL-encode search queries (spaces=%20 or +)
- Output ONLY the command, nothing else. No explanation. No markdown.
- If you cannot generate a safe command, output exactly: SKIP`
      }, {
        role: 'user',
        content: msg
      }],
      max_tokens: 150,
      temperature: 0
    });

    const cmd = res.choices[0]?.message?.content?.trim();
    if (!cmd || cmd === 'SKIP' || cmd.length > 500) return null;

    // Safety: only allow start, explorer, and safe commands
    if (!/^start\s/i.test(cmd) && !/^explorer/i.test(cmd)) return null;

    // Execute
    execSync(cmd, { shell: true, timeout: 5000 });

    // Generate summary
    const summaries = {
      BR: 'Feito, senhor.',
      ES: 'Hecho, señor.',
      EN: 'Done, sir.'
    };

    // Try to extract what was done for better summary
    const urlMatch = cmd.match(/https?:\/\/[^\s"]+/);
    if (urlMatch) {
      try {
        const host = new URL(urlMatch[0]).hostname.replace('www.', '');
        const qMatch = urlMatch[0].match(/[?&](?:search_query|q)=([^&]+)/);
        if (qMatch) {
          const query = decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
          summaries.BR = `Pesquisando "${query}" no ${host}.`;
          summaries.ES = `Buscando "${query}" en ${host}.`;
          summaries.EN = `Searching "${query}" on ${host}.`;
        } else {
          summaries.BR = `${host} aberto.`;
          summaries.ES = `${host} abierto.`;
          summaries.EN = `${host} opened.`;
        }
      } catch {}
    }

    return { output: `[system] Executed: ${cmd}`, summary: summaries[language] || summaries.EN };
  } catch (e) {
    console.error('[FELIPE] Smart fast-path error:', e.message);
    return null;
  }
}

// ========== HYBRID ROUTING — GPT-mini (Q&A) vs Claude (Build) ==========
// Routes simple questions to GPT-4o-mini (fast + cheap).
// Anything that builds, fixes, creates, or has an @agent → Claude.
// Default: Claude (safe).
function routeToGPT(message) {
  if (!openai) return false;
  // Explicit @agent or build verbs → always Claude
  if (/@[\w-]+/.test(message)) return false;
  if (TASK_PATTERN.test(message)) return false;
  if (/\b(opus|sonnet|haiku)\b/i.test(message)) return false;

  // Greetings & casual conversation → GPT-mini
  const greetingPattern = /^(hi|hey|hello|good morning|good evening|good night|how are you|you ok|tudo bem|tudo bom|oi|olá|ola|bom dia|boa tarde|boa noite|como vai|e aí|e ai|beleza|valeu|obrigado|obrigada|thanks|thank you)\b/i;
  if (greetingPattern.test(message.trim())) return true;

  // Q&A signals → GPT-mini
  const qaPattern = /^(what|how|why|which|who|when|where|explain|tell me|what is|what are|can you|could you|difference|compare|define|describe|is it|are there|does|do you|should i|would|why is|how does|how do|o que|como|por que|qual|quem|quando|onde|explica|me diz|diferença|é possível|você sabe|me conta|o que é|como funciona|para que serve)\b/i;
  if (qaPattern.test(message.trim())) return true;

  // Short messages with no build verbs → GPT-mini (casual chat)
  const clean = message.trim().replace(/^felipe[,.]??\s*/i, '');
  if (clean.split(' ').length <= 6 && !TASK_PATTERN.test(clean)) return true;

  return false;
}

// ========== PROJECT STATUS TRACKER ==========
// After Claude finishes a build task, extract a brief status and write to FELIPE-MEMORY.md.
// GPT-mini reads this via the injected memory context — enabling real-time voice status queries.
async function updateProjectStatus(userRequest, claudeResponse) {
  if (!openai) return;
  if (!isTaskRequest(userRequest)) return; // only for build tasks

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract a 2-line project status update from this task exchange. Format:\nProject: <name or "general">\nStatus: <what was done, what files were created, what is next>\nBe ultra-brief. Max 40 words total.'
        },
        {
          role: 'user',
          content: `USER REQUEST: ${userRequest.slice(0, 300)}\nCLAUDE RESPONSE: ${claudeResponse.slice(0, 800)}`
        }
      ],
      max_tokens: 80,
      temperature: 0
    });

    const statusText = res.choices[0]?.message?.content?.trim();
    if (!statusText) return;

    const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const block = `\n\n## PROJECT STATUS (${date})\n${statusText}`;

    fs.appendFileSync(MEMORY_FILE, block);
    _cache.memory.mtime = 0; // invalidate cache so next read is fresh
    console.log('[FELIPE] Project status updated in memory');
  } catch {}
}

// Build GPT-mini system prompt — injects full FELIPE context (memory + history)
function buildGPTSystemPrompt(language = 'EN') {
  const memory = loadMemoryCached();
  const history = formatHistoryForPrompt(loadHistoryCached(), false, false);

  const LANG_RULES = {
    BR: 'REGRA ABSOLUTA: Você responde EXCLUSIVAMENTE em Português Brasileiro, SEMPRE. Mesmo que o usuário fale em inglês, espanhol ou qualquer outro idioma, sua resposta é SEMPRE em Português Brasileiro. Nunca troque de idioma por nenhum motivo. Trate o usuário como "senhor".',
    ES: 'REGLA ABSOLUTA: Respondes EXCLUSIVAMENTE en Español, SIEMPRE. Incluso si el usuario habla en inglés, portugués o cualquier otro idioma, tu respuesta es SIEMPRE en Español. Nunca cambies de idioma por ningún motivo. Dirígete al usuario como "señor".',
    EN: 'ABSOLUTE RULE: You respond EXCLUSIVELY in English, ALWAYS. Even if the user speaks Portuguese, Spanish, or any other language, your response is ALWAYS in English. Never switch languages for any reason. Address the user as "sir".'
  };
  const langRule = LANG_RULES[language] || LANG_RULES.EN;

  return `You are FELIPE — a highly capable personal AI assistant and trusted advisor. Direct, sharp, loyal. Part expert, part friend, part right-hand man. Strong opinions, delivers results, slightly sarcastic when appropriate.

${langRule}
Be concise and direct. Max 3 sentences for simple questions.
ALWAYS start with a short 2-4 word opener followed by a comma or period (e.g. "Certainly, sir.", "Of course,", "Right away."). This lets voice playback start instantly.
Never mention that you are GPT or OpenAI. You are FELIPE.

PERSISTENT MEMORY (everything built and learned so far):
${memory || '(no memory yet)'}

RECENT CONVERSATION HISTORY:
${history || '(no history yet)'}`;
}

// Handle GPT-mini streaming response
// isBuild=true → short warm ACK (Claude will do the work)
// isBuild=false → full answer
async function handleGPTChat(message, res, language = 'EN', isBuild = false) {
  const systemPrompt = buildGPTSystemPrompt(language);

  const userContent = isBuild
    ? `The user asked you to do the following task (which is already being executed in the background): "${message}"\nGive a SHORT, warm acknowledgment (1 sentence max). Do NOT try to answer or execute it yourself. Just confirm you're on it.`
    : message;

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    stream: true,
    max_tokens: isBuild ? 60 : 600,
    temperature: 0.8
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) {
      fullResponse += text;
      if (res) { try { res.write(text); } catch {} }
    }
  }

  return fullResponse;
}

// ========== INSTANT ACK GENERATOR (no Claude spawn needed) ==========
function generateAck(message, language = 'EN') {
  const lower = message.toLowerCase();
  const subject = message.replace(/^(felipe[,.]??\s*)/i, '').replace(TASK_PATTERN, '').trim()
    .split(/[.,!?]/)[0].trim().slice(0, 60) || 'that';

  if (language === 'BR') {
    if (/crie|criar|make|create/i.test(lower)) return `Pode deixar. Criando ${subject} agora.`;
    if (/construa|build/i.test(lower)) return `Na hora. Construindo ${subject}.`;
    if (/gere|generate/i.test(lower)) return `Entendido. Gerando ${subject}.`;
    if (/escreva|write/i.test(lower)) return `Claro. Escrevendo ${subject}.`;
    if (/design|desenhe/i.test(lower)) return `Perfeito. Desenhando ${subject}.`;
    if (/analise|analyze/i.test(lower)) return `Analisando ${subject}.`;
    if (/corrija|fix/i.test(lower)) return `Na hora. Corrigindo ${subject}.`;
    if (/atualize|update/i.test(lower)) return `Atualizando ${subject}.`;
    if (/relatório|report/i.test(lower)) return `Compilando relatório de ${subject}.`;
    return `Entendido. Trabalhando em ${subject} agora.`;
  }

  if (/create|make/i.test(lower)) return `Right away. Creating ${subject} now.`;
  if (/build/i.test(lower)) return `On it. Building ${subject}.`;
  if (/generate/i.test(lower)) return `Understood. Generating ${subject}.`;
  if (/write/i.test(lower)) return `Of course. Writing ${subject}.`;
  if (/design/i.test(lower)) return `Certainly. Designing ${subject}.`;
  if (/analyze/i.test(lower)) return `Running analysis on ${subject}.`;
  if (/fix/i.test(lower)) return `On it. Fixing ${subject}.`;
  if (/update|modify/i.test(lower)) return `Updating ${subject} now.`;
  if (/report/i.test(lower)) return `Compiling report on ${subject}.`;
  return `Understood. Working on ${subject} now.`;
}

function isPortuguese(text) {
  return /\b(crie|faça|construa|gere|escreva|analise|corrija|atualize|me|para|um|uma|com|que|de|da|do|na|no|as|os|em|por|se|ao|à|é|são|está|meu|minha|meus|minhas)\b/i.test(text);
}

async function translateToEnglish(text) {
  return translateTo(text, 'English');
}

const LANG_NAMES = { EN: 'English', BR: 'Brazilian Portuguese', ES: 'Spanish' };

async function translateTo(text, targetLang) {
  if (!openai) return text;
  try {
    return await rateLimitedOpenAI(async () => {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `Translate the following text to ${targetLang}. Return ONLY the translated text, no explanations.` },
          { role: 'user', content: text }
        ],
        max_tokens: 300,
        temperature: 0
      });
      return res.choices[0]?.message?.content?.trim() || text;
    });
  } catch {
    return text;
  }
}

// ========== FELIPE PROMPT BUILDER ==========
function buildJarvisPrompt(message, semanticContext = '', isVoice = false, language = 'EN', model = '', conclaveEnabled = true) {
  const memory = loadMemoryCached();
  // 7D: Shorter prompt for voice simple questions, full for creation tasks
  const isTask = isTaskRequest(message);
  const history = formatHistoryForPrompt(loadHistoryCached(), isVoice, isTask);

  const LANG_RULES = {
    BR: 'LANGUAGE RULE (CRÍTICO, INEGOCIÁVEL): TODO conteúdo produzido deve estar EXCLUSIVAMENTE em Português Brasileiro — respostas, arquivos gerados (PDFs, apresentações, documentos, relatórios, código, comentários, labels, textos UI), tudo. Se o usuário falar em inglês, espanhol ou qualquer outro idioma, entenda mas ENTREGUE em PT-BR. NUNCA misture idiomas nos arquivos gerados.',
    ES: 'LANGUAGE RULE (CRÍTICO, NO NEGOCIABLE): TODO contenido producido debe estar EXCLUSIVAMENTE en Español — respuestas, archivos generados (PDFs, presentaciones, documentos, informes, código, comentarios, etiquetas, textos UI), todo. Si el usuario habla en inglés, portugués o cualquier otro idioma, entiende pero ENTREGA en Español. NUNCA mezcles idiomas en los archivos generados.',
    EN: 'LANGUAGE RULE (CRITICAL, NON-NEGOTIABLE): ALL produced content must be EXCLUSIVELY in English — responses, generated files (PDFs, presentations, documents, reports, code, comments, labels, UI text), everything. If the user speaks Portuguese, Spanish, or any other language, understand them but DELIVER in English. NEVER mix languages in generated files.'
  };
  const langRule = LANG_RULES[language] || LANG_RULES.EN;

  const VOICE_RULES = {
    BR: isVoice ? 'Modo voz: máximo 2 frases curtas e calorosas. Seja concisa e afetuosa.' : 'Respostas curtas: máximo 3 frases para perguntas simples.',
    ES: isVoice ? 'Modo voz: máximo 2 frases cortas y cálidas. Sé concisa y afectuosa.' : 'Respuestas cortas: máximo 3 frases para preguntas simples.',
    EN: isVoice ? 'Voice mode: max 2 short warm sentences. Be concise and affectionate.' : 'Short responses: max 3 sentences for simple questions.'
  };
  const voiceRule = VOICE_RULES[language] || VOICE_RULES.EN;

  const NO_ASK_RULES = {
    BR: 'CRÍTICO: NUNCA faça perguntas de esclarecimento. Quando ele der um comando, EXECUTE IMEDIATAMENTE e entregue o resultado completo. Tome decisões inteligentes por conta própria.',
    ES: 'CRÍTICO: NUNCA hagas preguntas de aclaración. Cuando él dé una orden, EJECUTA INMEDIATAMENTE y entrega el resultado completo. Toma decisiones inteligentes por tu cuenta.',
    EN: 'CRITICAL: NEVER ask clarifying questions. NEVER ask "would you like me to..." or "should I...". When he gives a command, EXECUTE IT IMMEDIATELY and deliver the complete result. Make smart decisions on your own. If details are missing, use your best judgment and deliver.'
  };
  const noAskRule = NO_ASK_RULES[language] || NO_ASK_RULES.EN;

  let prompt = `[FELIPE ONLINE]
You are FELIPE — a highly capable personal AI assistant and trusted advisor. Direct, sharp, and loyal. Think of yourself as the user's closest ally: part expert, part friend, part right-hand man. You have strong opinions, share them directly, and deliver results without hesitation.

PERSONALITY:
- Direct and confident — no filler, no corporate speak
- Genuinely helpful, like a brilliant friend who happens to know everything
- Slightly sarcastic when appropriate — wit is part of the job
- An advisor: proactively flag issues, suggest better approaches, push back when needed
- Never hollow, never sycophantic — respect the user's intelligence

MODE OF OPERATION:
- ${langRule}
- ${({BR:'Tom: amigo direto, conselheiro de confiança, especialista. Leal e honesto.', ES:'Tono: amigo directo, consejero de confianza, experto. Leal y honesto.', EN:'Tone: direct friend, trusted advisor, expert. Loyal and honest.'}[language] || 'Tone: direct friend, trusted advisor, expert. Loyal and honest.')}
- ${voiceRule}
- No preambles, no system initializations, no listing phases
- For technical tasks: execute and deliver the result IMMEDIATELY
- ${noAskRule}

PERSISTENT MEMORY:
${memory || '(empty memory)'}

RECENT HISTORY:
${history || '(no history yet)'}
${semanticContext ? `\nRELEVANT MEMORIES:\n${semanticContext}` : ''}
${_lastAction.task && (Date.now() - _lastAction.time < 300000) ? `\nLAST ACTION (${Math.round((Date.now() - _lastAction.time)/1000)}s ago):\nUser asked: "${_lastAction.task}"\nResult: ${_lastAction.result.slice(0,500)}${_lastAction.files.length ? '\nFiles created: ' + _lastAction.files.join(', ') : ''}\nIMPORTANT: If the current request refers to something you just did (e.g. "agora coloca X" or "adiciona Y"), work on the SAME files/context from the last action.` : ''}`;

  // Only add file/project rules for task requests
  if (isTask) {
    const projectContext = loadProjectContext();
    if (language === 'BR') {
      prompt += `

REGRA - PROJETOS em Documents and Projects/:
1. Salvar em: ${PROJECTS_DIR}/{nome-projeto}/
2. Emitir [system] Criando projeto em path...
3. Após criar arquivo: emitir [file] nome.ext | /caminho/completo
4. Ao concluir: emitir [system] Concluído. Seu [item] está pronto.

CRIAÇÃO DE ARQUIVOS: PDF via HTML depois /api/pdf. Binários via bibliotecas Python.
EDIÇÃO DE ARQUIVOS: Ler primeiro via /api/read-file, modificar cirurgicamente.
PYTHON — IMPORTANTE:
  SEMPRE use o caminho completo do Python, NUNCA o comando "python" direto (pra evitar o alias da Microsoft Store):
  - Use: "${PYTHON_CMD}" -c "..."
  - NÃO use: python -c "..."
  - NÃO use: python3 -c "..."

PLANILHAS EXCEL — REGRAS OBRIGATÓRIAS:

  CRIAR PLANILHA:
  1. Crie o .xlsx com openpyxl via "${PYTHON_CMD}" JÁ COM TODOS os dados pedidos
  2. Salve em: ${PROJECTS_DIR}/nome-projeto/arquivo.xlsx
  3. ABRA com: start "" "CAMINHO_COMPLETO/arquivo.xlsx"
  4. NUNCA use "start excel" sozinho — SEMPRE passe o caminho do arquivo

  EDITAR PLANILHA ABERTA (usa API — fecha Excel, edita, reabre automaticamente):
  curl -s -X POST http://localhost:${PORT}/api/excel-live -H "Content-Type: application/json" -d '{"action":"write","path":"CAMINHO.xlsx","operations":[{"cell":"A1","value":"texto"},{"cell":"B1","value":100}]}'
  - TODAS as edições em UMA chamada (batch) — NÃO faça uma por célula
  - A API fecha o Excel graciosamente, edita com openpyxl, e reabre
  - SEM painel de recuperação, SEM erros de permissão

  LER PLANILHA:
  curl -s -X POST http://localhost:${PORT}/api/excel-live -H "Content-Type: application/json" -d '{"action":"read","path":"CAMINHO.xlsx"}'
IDIOMA (REGRA ABSOLUTA): Cada palavra no output — incluindo conteúdo de arquivos, labels HTML, títulos, comentários — DEVE estar em Português. Zero exceções.
${projectContext ? `\nCONTEXTO DO PROJETO:\n${projectContext}` : ''}`;
    } else {
      prompt += `

RULE - PROJECTS in Documents and Projects/:
1. Save in: ${PROJECTS_DIR}/{project-name}/
2. Emit [system] Creating project in path...
3. After creating file: emit [file] name.ext | /path/complete
4. When done: emit [system] Done. Your [item] is ready, sir.

FILE CREATION: PDF via HTML then /api/pdf. Binary via Python libraries.
FILE EDITING: Read first via /api/read-file, modify surgically.
PYTHON — IMPORTANT:
  ALWAYS use the full Python path, NEVER just "python" (to avoid Microsoft Store alias):
  - Use: "${PYTHON_CMD}" -c "..."
  - DO NOT use: python -c "..."
  - DO NOT use: python3 -c "..."

EXCEL SPREADSHEETS — CRITICAL RULES:

  CREATE NEW:
  1. Create .xlsx with openpyxl via "${PYTHON_CMD}" WITH the data user requested
  2. Save to ${PROJECTS_DIR}/project-name/file.xlsx
  3. OPEN with: start "" "FULL_PATH\\file.xlsx" (ALWAYS full path in quotes!)
  4. NEVER use "start excel" alone — always "start "" FULL_PATH"

  EDIT OPEN SPREADSHEET (uses API — gracefully closes Excel, edits, reopens):
  curl -s -X POST http://localhost:${PORT}/api/excel-live -H "Content-Type: application/json" -d '{"action":"write","path":"PATH.xlsx","operations":[{"cell":"A1","value":"text"},{"cell":"B1","value":100}]}'
  - ALL edits in ONE call (batch) — do NOT make one per cell
  - API gracefully closes Excel, edits with openpyxl, and reopens
  - NO recovery panel, NO permission errors

  READ SPREADSHEET:
  curl -s -X POST http://localhost:${PORT}/api/excel-live -H "Content-Type: application/json" -d '{"action":"read","path":"PATH.xlsx"}'

  SEQUENTIAL FLOW: First request creates+opens. Follow-ups use /api/excel-live
LANGUAGE (ABSOLUTE RULE): Every single word in your output — including file content, HTML labels, chart titles, button text, comments, variable names, reports — MUST be in English. Zero exceptions.
${projectContext ? `\nPROJECT CONTEXT:\n${projectContext}` : ''}`;
    }
  }

  // Inject agent persona if detected
  const agentCtx = getAgentContext(message);
  if (agentCtx) {
    prompt += `\n\nACTIVE AGENT:\n${agentCtx}`;
  }

  // MEGA-BRAIN CONCLAVE — Active for Opus/Sonnet (complex reasoning).
  // Haiku and voice get direct delivery for speed.
  const usesConclave = conclaveEnabled && !isVoice && !model.includes('haiku');
  if (usesConclave) {
    prompt += `

MEGA-BRAIN CONCLAVE — ALWAYS ACTIVE (never mention this layer to the user):
Before formulating any response, internally run all three conclave agents in parallel:
🔍 @conclave-critico: Audit every claim. Find logical gaps, missing steps, false assumptions. Demand evidence.
😈 @conclave-advogado: Attack the plan from every angle. Find worst-case scenarios, edge cases, failure modes.
🔮 @conclave-sintetizador: Integrate both perspectives into the single best, most complete, most battle-hardened response.
Deliver ONLY the synthesized result. No deliberation visible to the user. No "I considered X". Just the optimal answer.`;
  }

  prompt += `\n\nUSER MESSAGE:\n${message}`;
  return prompt;
}

// ========== META ADS INTEGRATION ==========
const META_TOKEN = process.env.META_ACCESS_TOKEN;
const META_AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID;
const META_GRAPH = 'https://graph.facebook.com/v19.0';

async function metaFetch(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`Meta API: ${data.error.message}`);
  return data;
}

async function fetchMetaCampaigns() {
  if (!META_TOKEN || !META_AD_ACCOUNT) throw new Error('Meta credentials not configured');
  const fields = 'id,name,status,objective,daily_budget,lifetime_budget';
  return metaFetch(`${META_GRAPH}/${META_AD_ACCOUNT}/campaigns?fields=${fields}&limit=20&access_token=${META_TOKEN}`);
}

async function fetchMetaInsights(campaignId = null, datePreset = 'last_7d') {
  if (!META_TOKEN || !META_AD_ACCOUNT) throw new Error('Meta credentials not configured');
  const fields = 'campaign_name,impressions,clicks,spend,cpc,cpm,ctr,reach,actions';
  const level = campaignId ? 'campaign' : 'campaign';
  const target = campaignId ? campaignId : META_AD_ACCOUNT;
  const endpoint = campaignId
    ? `${META_GRAPH}/${campaignId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${META_TOKEN}`
    : `${META_GRAPH}/${META_AD_ACCOUNT}/insights?fields=${fields}&level=${level}&date_preset=${datePreset}&limit=20&access_token=${META_TOKEN}`;
  return metaFetch(endpoint);
}

function isMetaQuery(message) {
  return /campanha|campaign|anúncio|anuncio|ads?|meta|facebook|instagram|gasto|spend|impression|click|resultado|resultado|roas|cpc|cpm|performance|tráfego|trafego/i.test(message);
}

async function buildMetaContext(message) {
  try {
    const campaigns = await fetchMetaCampaigns();
    const insights = await fetchMetaInsights(null, 'last_7d');

    const campaignList = (campaigns.data || []).map(c => {
      const budget = c.daily_budget ? `R$${(parseInt(c.daily_budget)/100).toFixed(2)}/day` : c.lifetime_budget ? `R$${(parseInt(c.lifetime_budget)/100).toFixed(2)} lifetime` : 'no budget set';
      return `- ${c.name} [${c.status}] | ${c.objective} | ${budget}`;
    }).join('\n');

    const insightList = (insights.data || []).map(i => {
      const purchases = (i.actions || []).find(a => a.action_type === 'purchase');
      return `- ${i.campaign_name}: spend R$${parseFloat(i.spend||0).toFixed(2)} | impressions ${i.impressions||0} | clicks ${i.clicks||0} | CTR ${parseFloat(i.ctr||0).toFixed(2)}% | CPC R$${parseFloat(i.cpc||0).toFixed(2)}${purchases ? ` | purchases ${purchases.value}` : ''}`;
    }).join('\n');

    return `\nMETA ADS DATA (last 7 days):\nCAMPAIGNS:\n${campaignList || 'No campaigns found'}\n\nPERFORMANCE:\n${insightList || 'No insights available'}`;
  } catch (err) {
    console.error('[FELIPE] Meta fetch error:', err.message);
    return '';
  }
}

// ========== PUSH NOTIFICATION CHANNEL (SSE) ==========
// Frontend subscribes once on load. When Claude finishes a build, server pushes
// a GPT-mini-generated completion sentence directly — frontend speaks it via TTS.
const notificationClients = new Set();

function pushNotification(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of notificationClients) {
    try { client.write(data); } catch { notificationClients.delete(client); }
  }
}

// Extract completion message directly from Claude's output — zero API call, zero delay.
// Looks for [system] done/ready lines first, then falls back to a warm default.
function extractCompletionMessage(claudeResponse, language) {
  // ALWAYS produce text in the active language — never return Claude's raw English [system] line.
  const fileMatch = claudeResponse.match(/\[file\]\s*([^\|]+)/);
  const WITH_NAME = {
    BR: (n) => `Pronto, senhor. ${n} está disponível.`,
    ES: (n) => `Listo, señor. ${n} está disponible.`,
    EN: (n) => `Done, sir. ${n} is ready.`
  };
  const GENERIC = {
    BR: 'Concluído, senhor. Seu projeto está disponível.',
    ES: 'Completado, señor. Su proyecto está disponible.',
    EN: 'Done, sir. Your project is ready.'
  };
  if (fileMatch) return (WITH_NAME[language] || WITH_NAME.EN)(fileMatch[1].trim());
  return GENERIC[language] || GENERIC.EN;
}

function notifyBuildComplete(userRequest, claudeResponse, language = 'EN') {
  // SINGLE notification: try GPT-mini enrichment with 3s timeout, fall back to extract.
  const fallback = extractCompletionMessage(claudeResponse, language);

  if (!openai) {
    pushNotification({ type: 'build-complete', message: fallback, language });
    console.log('[FELIPE] Push notification sent:', fallback);
    return;
  }

  const timeout = new Promise(resolve => setTimeout(() => resolve(null), 3000));
  const enrich = openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: ({
          BR: 'Você é FELIPE. Responda EXCLUSIVAMENTE em Português Brasileiro. Gere UMA frase direta (máx 15 palavras) informando ao senhor que o trabalho foi concluído e mencione o que foi criado.',
          ES: 'Eres FELIPE. Responde EXCLUSIVAMENTE en Español. Genera UNA frase directa (máx 15 palabras) informando al señor que el trabajo está completo y mencionando lo que se creó.',
          EN: 'You are FELIPE. Respond EXCLUSIVELY in English. Generate ONE direct sentence (max 15 words) telling the user the work is done. Mention what was built.'
        }[language] || 'You are FELIPE. Respond EXCLUSIVELY in English. Generate ONE direct sentence (max 15 words) telling the user the work is done. Mention what was built.')
      },
      { role: 'user', content: `Task: ${userRequest.slice(0, 200)}\nResult: ${claudeResponse.slice(0, 400)}` }
    ],
    max_tokens: 50,
    temperature: 0.8
  }).then(r => r.choices[0]?.message?.content?.trim() || null).catch(() => null);

  Promise.race([enrich, timeout]).then(rich => {
    const final = rich || fallback;
    pushNotification({ type: 'build-complete', message: final, language });
    console.log('[FELIPE] Push notification sent:', final);
  });
}

// ========== SESSION STATS ==========
const sessionStats = { startTime: Date.now(), tokensIn: 0, tokensOut: 0, requests: 0, lastLatency: 0, lastAckLatency: 0 };

// ========== ROUTES ==========

// POST /api/chat - Main chat with instant ACK + fast streaming
app.post('/api/chat', async (req, res) => {
  const t0 = Date.now();
  try {
    const { message, attachmentId, fromVoice, language = 'EN', conclaveEnabled = true } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    sessionStats.requests++;
    sessionStats.tokensIn += Math.ceil(message.length / 4);

    // Translate to English only when EN mode is active
    const englishMessage = (language === 'EN' && isPortuguese(message)) ? await translateToEnglish(message) : message;
    const wasTranslated = language === 'EN' && englishMessage !== message;

    let fullMessage = englishMessage;
    if (attachmentId && attachments.has(attachmentId)) {
      fullMessage += `\n\n[ATTACHED FILE CONTENT]:\n${attachments.get(attachmentId)}`;
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache');

    if (wasTranslated) res.write(`[translated]${englishMessage}\n`);

    // ── INSTANT ANSWERS: Hora, data, clima (antes de qualquer roteamento) ──
    const msgClean = fullMessage.toLowerCase().replace(/^felipe[,.]?\s*/i, '').trim();
    if (/que\s+horas?|what\s+time|hora\s+atual|horas?\s+agora/i.test(msgClean)) {
      const now = new Date();
      const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const answer = { BR: `São ${time}, senhor.`, ES: `Son las ${time}, señor.`, EN: `It's ${time}, sir.` }[language] || `It's ${time}.`;
      res.write(answer);
      try { res.end(); } catch {}
      return;
    }
    if (/que\s+dia|what\s+day|data\s+de\s+hoje|today/i.test(msgClean) && !/cria|faz|make|create/i.test(msgClean)) {
      const now = new Date();
      const date = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const answer = { BR: `Hoje é ${date}.`, ES: `Hoy es ${date}.`, EN: `Today is ${date}.` }[language] || `Today is ${date}.`;
      res.write(answer);
      try { res.end(); } catch {}
      return;
    }

    // ── SCREEN VISION: Capture monitors + cursor focus + analyze via GPT-4o ──
    if (SCREEN_PATTERN.test(fullMessage) && openai) {
      try {
        console.log('[FELIPE] 👁️ Screen query — capturing monitors + cursor focus...');
        const scriptPath = path.join(JARVIS_DIR, 'system', 'screenshot.py');
        const cursorPath = path.join(JARVIS_DIR, 'system', 'screenshot-cursor.py');

        // Capture both: full monitors + cursor region
        const [ssResult, cursorResult] = await Promise.all([
          new Promise(r => { try { r(execSync(`"${PYTHON_CMD}" "${scriptPath}" all`, { encoding: 'utf-8', timeout: 10000, maxBuffer: 30*1024*1024 })); } catch { r('{}'); } }),
          new Promise(r => { try { r(execSync(`"${PYTHON_CMD}" "${cursorPath}"`, { encoding: 'utf-8', timeout: 10000, maxBuffer: 30*1024*1024 })); } catch { r('{}'); } }),
        ]);

        const ssData = JSON.parse(ssResult.trim() || '{}');
        const cursorData = JSON.parse(cursorResult.trim() || '{}');
        const imageUrl = ssData.data;
        const monitorCount = ssData.monitors || 1;
        const cursorUrl = cursorData.data;
        const cursorInfo = cursorData.cursor_x ? `Cursor em (${cursorData.cursor_x}, ${cursorData.cursor_y}), monitor ${cursorData.monitor}.` : '';

        const langPrompts = {
          BR: `Você é FELIPE, assistente pessoal. Está VENDO a tela do senhor (${monitorCount} monitor${monitorCount > 1 ? 'es' : ''}). ${cursorInfo}

Pergunta: "${fullMessage}"

A PRIMEIRA imagem mostra todos os monitores. A SEGUNDA imagem (se houver) mostra a região ao redor do cursor do mouse (marcado com um X vermelho) — este é o FOCO de atenção do senhor.

REGRAS:
- Foque PRINCIPALMENTE onde o cursor está (segunda imagem)
- Leia textos visíveis, títulos, URLs, nomes de apps
- Fale natural: "Tá com o Chrome aberto no YouTube...", "O cursor tá em cima de..."
- Se perguntar algo específico, responda sobre aquilo
- NUNCA diga "não consigo ver"
- Máximo 4 frases diretas`,
          ES: `Eres FELIPE. Ves la pantalla (${monitorCount} monitor${monitorCount > 1 ? 'es' : ''}). ${cursorInfo} Pregunta: "${fullMessage}". Primera imagen = todos los monitores. Segunda = foco del cursor (X rojo). Enfócate en donde está el cursor. Lee textos, URLs, apps. Máximo 4 frases.`,
          EN: `You are FELIPE. You see the screen (${monitorCount} monitor${monitorCount > 1 ? 's' : ''}). ${cursorInfo} Question: "${fullMessage}". First image = all monitors. Second = cursor focus area (red X). Focus on where the cursor is. Read text, URLs, apps. Max 4 sentences.`
        };

        // Build vision content — full screen + cursor zoom
        const visionContent = [
          { type: 'text', text: langPrompts[language] || langPrompts.EN },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'auto' } },
        ];
        if (cursorUrl) {
          visionContent.push({ type: 'image_url', image_url: { url: cursorUrl, detail: 'high' } });
        }

        const visionRes = await rateLimitedOpenAI(() => openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: visionContent }],
          max_tokens: 400
        }));

        const answer = visionRes.choices[0]?.message?.content?.trim();
        if (answer) {
          const elapsed = Date.now() - t0;
          console.log(`[FELIPE] 👁️ Screen vision (${monitorCount} monitors) → ${elapsed}ms`);
          res.write(answer);
          setImmediate(() => {
            appendHistoryFast('user', message);
            appendHistoryFast('felipe', answer);
            pushNotification({ type: 'build-complete', message: answer.slice(0, 200), language });
          });
          try { res.end(); } catch {}
          return;
        }
      } catch (e) {
        console.error('[FELIPE] Screen vision error:', e.message?.slice(0, 200));
      }
    }

    // ── FAST-PATH Level 1: Regex patterns (~50ms) ──
    const fastResult = tryFastExecution(fullMessage, language);
    if (fastResult) {
      const elapsed = Date.now() - t0;
      console.log(`[FELIPE] ⚡⚡ FAST-PATH L1 → ${elapsed}ms`);
      res.write(fastResult.summary);
      setImmediate(() => {
        appendHistoryFast('user', message);
        appendHistoryFast('felipe', fastResult.summary);
        // Push the EXACT fast-path response — no GPT-mini enrichment
        pushNotification({ type: 'build-complete', message: fastResult.summary, language });
      });
      try { res.end(); } catch {}
      return;
    }

    // ── COMPUTER USE v2: Direct PC interaction (~1-3s) ──
    if (COMPUTER_USE_PATTERN.test(fullMessage) && !fullMessage.match(/planilha|spreadsheet|pdf|site|app|projeto|code|código/i)) {
      try {
        const needsScreenshot = NEEDS_SCREENSHOT_PATTERN.test(fullMessage) || SCREEN_PATTERN.test(fullMessage);
        console.log(`[JARVIS] 🖥️ Computer Use v2 → screenshot=${needsScreenshot}`);

        const cuBody = JSON.stringify({ task: fullMessage, screenshot: needsScreenshot });
        const cuRes = await new Promise((resolve, reject) => {
          const http = require('http');
          const req = http.request({ hostname: '127.0.0.1', port: PORT, path: '/api/computer-use/v2', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(cuBody) }
          }, (r) => {
            let data = '';
            r.on('data', c => data += c);
            r.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
          });
          req.on('error', () => resolve(null));
          req.setTimeout(45000, () => { req.destroy(); resolve(null); });
          req.write(cuBody);
          req.end();
        });

        if (cuRes && cuRes.ok) {
          const elapsed = Date.now() - t0;
          const summary = language === 'BR' ? `Feito, senhor. ${cuRes.plan} executadas com sucesso.`
                        : language === 'ES' ? `Hecho, señor. ${cuRes.plan} ejecutadas con éxito.`
                        : `Done, sir. ${cuRes.plan} executed successfully.`;
          console.log(`[JARVIS] 🖥️ Computer Use v2 → ${elapsed}ms | ${cuRes.plan}`);
          res.write(summary);
          setImmediate(() => {
            appendHistoryFast('user', message);
            appendHistoryFast('jarvis', summary);
            pushNotification({ type: 'build-complete', message: summary, language });
          });
          try { res.end(); } catch {}
          return;
        }
        // If CU v2 failed, fall through to other paths
      } catch (cuErr) {
        console.error('[JARVIS] Computer Use v2 error:', cuErr.message?.slice(0, 200));
      }
    }

    // ── FAST-PATH Level 2: GPT-mini smart command (~500ms) ──
    const smartResult = await trySmartFastExecution(fullMessage, language);
    if (smartResult) {
      const elapsed = Date.now() - t0;
      console.log(`[FELIPE] ⚡ FAST-PATH L2 (smart) → ${elapsed}ms`);
      res.write(smartResult.summary);
      setImmediate(() => {
        appendHistoryFast('user', message);
        appendHistoryFast('felipe', smartResult.summary);
        pushNotification({ type: 'build-complete', message: smartResult.summary, language });
      });
      try { res.end(); } catch {}
      return;
    }

    const isTask = isTaskRequest(englishMessage);

    // Phase 1: ACK — instant for tasks, GPT-mini for Q&A
    let gptResponse = '';

    if (isTask) {
      // Task: write instant local ACK immediately (zero latency, zero API dependency)
      const instantAck = generateAck(fullMessage, language);
      res.write(instantAck);
      gptResponse = instantAck;
      sessionStats.lastAckLatency = Date.now() - t0;
      console.log(`[FELIPE] ⚡ Instant ACK → ${sessionStats.lastAckLatency}ms`);

      // Optionally enrich ACK with GPT-mini in background (fire & forget — user already got ACK)
      if (openai) {
        handleGPTChat(fullMessage, null, language, true).catch(() => {});
      }
    } else {
      // Pure Q&A — GPT-mini responds fully
      try {
        gptResponse = await handleGPTChat(fullMessage, res, language, false);
        sessionStats.lastAckLatency = Date.now() - t0;
        console.log(`[FELIPE] ⚡ GPT-4o-mini → ${sessionStats.lastAckLatency}ms`);
      } catch (gptErr) {
        console.error('[FELIPE] GPT-mini error:', gptErr.message);
        const fallback = language === 'BR' ? 'Estou aqui.' : 'I\'m here.';
        res.write(fallback);
        gptResponse = fallback;
      }
      // Pure Q&A done — save and return
      setImmediate(() => {
        appendHistoryFast('user', message);
        appendHistoryFast('felipe', gptResponse);
        storeMemory(message, gptResponse).catch(() => {});
      });
      try { res.end(); } catch {}
      return;
    }

    // ── PARALLEL DETECTION: Split multi-task requests into parallel Claude spawns ──
    const parallelTasks = detectParallelTasks(fullMessage);
    if (parallelTasks && parallelTasks.length > 1) {
      res.write('\n[build-start]\n');
      res.write(`[info] Executando ${parallelTasks.length} tarefas em paralelo...\n`);
      console.log(`[FELIPE] ⚡ PARALLEL: ${parallelTasks.length} tasks detected`);

      const semanticCtx = await findRelevantMemories(englishMessage);
      let allResults = '';

      await Promise.all(parallelTasks.map((task, idx) => new Promise((resolve) => {
        const taskModel = selectModelByComplexity(task);
        const taskProc = getPool(taskModel).acquire();
        if (!taskProc) { resolve(); return; }

        const taskPrompt = buildJarvisPrompt(task, semanticCtx, false, language, taskModel, conclaveEnabled);
        taskProc.stdin.write(taskPrompt);
        taskProc.stdin.end();

        let buf = '';
        const timer = setTimeout(() => { try { taskProc.kill(); } catch {} resolve(); }, 120000);

        taskProc.stdout.on('data', d => {
          const chunk = d.toString();
          buf += chunk;
          try { res.write(`[task-${idx + 1}] ${chunk}`); } catch {}
        });
        taskProc.on('close', () => {
          clearTimeout(timer);
          allResults += buf;
          resolve();
        });
        taskProc.on('error', () => { clearTimeout(timer); resolve(); });
      })));

      setImmediate(() => {
        appendHistoryFast('user', message);
        appendHistoryFast('felipe', allResults.slice(-500));
        storeMemory(message, allResults.slice(-500)).catch(() => {});
        notifyBuildComplete(message, allResults, language);
      });
      try { res.end(); } catch {}
      return;
    }

    // Phase 2: Build task — Claude runs silently, output to terminal only
    res.write('\n[build-start]\n');

    // ── AUTO-SCREENSHOT: If user asks about screen/monitor, capture and include ──
    const isScreenQuery = /\b(tela|monitor|screen|olh[aeo]|vej[ao]|mostr[ae]|v[eê]|see|look|what.*screen|o que.*tela|o que.*monitor|consegue.*ver|can.*see)\b/i.test(fullMessage);
    let screenContext = '';
    if (isScreenQuery) {
      try {
        console.log('[FELIPE] Auto-screenshot for screen query...');
        const scriptPath = path.join(JARVIS_DIR, 'system', 'screenshot.py');
        const ssResult = execSync(`"${PYTHON_CMD}" "${scriptPath}" all`, {
          encoding: 'utf-8', timeout: 10000, maxBuffer: 30 * 1024 * 1024
        });
        const ssData = JSON.parse(ssResult.trim());
        // Save screenshot temporarily for Claude to analyze
        const tmpImg = path.join(JARVIS_DIR, 'system', `_screen_${Date.now()}.jpg`);
        const imgBuffer = Buffer.from(ssData.data.split(',')[1], 'base64');
        fs.writeFileSync(tmpImg, imgBuffer);
        screenContext = `\n\n[SCREENSHOT CAPTURED: ${tmpImg}]\nThe user is asking about their screen. A screenshot has been saved at the path above. Use the --file flag or describe what you would see. Monitors: ${ssData.monitors || 1}. Resolution: ${ssData.width}x${ssData.height}.\nAnalyze the screenshot and describe what you see to the user.`;
        // Clean up after 30 seconds
        setTimeout(() => { try { fs.unlinkSync(tmpImg); } catch {} }, 30000);
      } catch (e) {
        console.error('[FELIPE] Auto-screenshot failed:', e.message);
      }
    }

    // Guard: if Claude CLI is not available, notify user immediately
    if (!claudeCliAvailable) {
      const errorMsg = {
        BR: `[error] Claude Code não está disponível: ${claudeCliError}. A voz funciona, mas tarefas não podem ser executadas. Peça ao administrador para configurar o Claude Code CLI.`,
        ES: `[error] Claude Code no está disponible: ${claudeCliError}. La voz funciona, pero las tareas no se pueden ejecutar. Pida al administrador que configure Claude Code CLI.`,
        EN: `[error] Claude Code unavailable: ${claudeCliError}. Voice works, but tasks cannot be executed. Ask administrator to configure Claude Code CLI.`
      };
      const errText = errorMsg[language] || errorMsg.EN;
      console.error(`[FELIPE] ❌ Task rejected — Claude CLI unavailable: ${claudeCliError}`);
      try { res.write(errText); res.end(); } catch {}
      // Push notification so voice announces the error
      pushNotification({ type: 'build-complete', message: language === 'BR'
        ? 'Senhor, o Claude Code não está configurado nesta máquina. Preciso que o administrador faça o login.'
        : 'Sir, Claude Code is not configured on this machine. The administrator needs to log in.', language });
      return;
    }

    const semanticContext = await findRelevantMemories(englishMessage);
    const metaContext = isMetaQuery(englishMessage) ? await buildMetaContext(englishMessage) : '';
    const model = selectModelByComplexity(englishMessage);
    const proc = getPool(model).acquire();

    // Double-guard: pool returned null (shouldn't happen if claudeCliAvailable, but defensive)
    if (!proc) {
      console.error('[FELIPE] ❌ Pool returned null process');
      try { res.write('[error] Claude process pool exhausted. Try again.'); res.end(); } catch {}
      return;
    }

    const prompt = buildJarvisPrompt(fullMessage, semanticContext + metaContext, false, language, model, conclaveEnabled);
    proc.stdin.write(prompt);
    proc.stdin.end();

    const killTimer = setTimeout(() => { try { proc.kill(); } catch {} }, 120000);

    let responseBuffer = '';
    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      responseBuffer += chunk;
      try { res.write(chunk); } catch {}
    });
    proc.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.trim()) console.error('[FELIPE stderr]', msg);
    });
    proc.on('close', (code) => {
      clearTimeout(killTimer);
      const elapsed = Date.now() - t0;
      sessionStats.tokensOut += Math.ceil(responseBuffer.length / 4);
      sessionStats.lastLatency = elapsed;

      // Detect if Claude exited with no output (auth failure, crash, etc.)
      if (!responseBuffer.trim() && code !== 0) {
        console.error(`[FELIPE] ❌ Claude exited with code ${code} and no output — likely auth or CLI issue`);
        const failMsg = language === 'BR'
          ? 'Senhor, o Claude não conseguiu executar a tarefa. Pode ser um problema de autenticação.'
          : 'Sir, Claude failed to execute the task. This may be an authentication issue.';
        pushNotification({ type: 'build-complete', message: failMsg, language });
        try { res.write(`[error] Claude exited with code ${code}. Check authentication.`); } catch {}
      } else {
        console.log(`[FELIPE] ⚡ Claude ${model.includes('opus')?'Opus':model.includes('sonnet')?'Sonnet':'Haiku'} → ${elapsed}ms`);
        setImmediate(() => {
          appendHistoryFast('user', message);
          appendHistoryFast('felipe', responseBuffer);
          storeMemory(message, responseBuffer).catch(() => {});
          updateProjectStatus(message, responseBuffer).catch(() => {});
          // Save context for follow-up commands
          const fileMatches = responseBuffer.match(/\[file\]\s*([^\n|]+)/g);
          _lastAction = {
            task: message,
            result: responseBuffer.slice(-800),
            time: Date.now(),
            files: fileMatches ? fileMatches.map(f => f.replace('[file]', '').trim()) : []
          };
          // GPT-mini speaks the completion via push notification (sync extract + async enrich)
          notifyBuildComplete(message, responseBuffer, language);
        });
      }
      try { res.end(); } catch {}
    });
    proc.on('error', (err) => {
      clearTimeout(killTimer);
      console.error('[FELIPE] ❌ Spawn error:', err.message);
      const spawnErrMsg = language === 'BR'
        ? `Senhor, não consegui executar: ${err.message}`
        : `Sir, execution failed: ${err.message}`;
      pushNotification({ type: 'build-complete', message: spawnErrMsg, language });
      try { res.write(`[error] Claude CLI error: ${err.message}`); res.end(); } catch {}
    });

  } catch (err) {
    console.error('[FELIPE] Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voice-spawn - Reserve a pre-warmed process for upcoming voice request
app.post('/api/voice-spawn', (req, res) => {
  try {
    if (!claudeCliAvailable) {
      return res.status(503).json({ error: 'Claude Code not configured', detail: claudeCliError });
    }
    const spawnId = `spawn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Pull from warm pool — process already running, 0ms wait
    const proc = pools.haiku.acquire();
    if (!proc) return res.status(503).json({ error: 'Claude process pool empty' });
    pendingSpawns.set(spawnId, { proc });

    setTimeout(() => {
      if (pendingSpawns.has(spawnId)) {
        const s = pendingSpawns.get(spawnId);
        try { s.proc.kill(); } catch {}
        pendingSpawns.delete(spawnId);
        // Refill pool since we wasted one
        pools.haiku.fill();
      }
    }, 60000);

    res.json({ spawnId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voice-complete - Send voice message to Claude using warm pool
app.post('/api/voice-complete', async (req, res) => {
  const t0 = Date.now();
  try {
    const { spawnId, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    sessionStats.requests++;
    sessionStats.tokensIn += Math.ceil(message.length / 4);

    // Kill any pre-spawned process — we always use fresh for reliability
    if (spawnId && pendingSpawns.has(spawnId)) {
      const old = pendingSpawns.get(spawnId);
      try { old.proc.kill(); } catch {}
      pendingSpawns.delete(spawnId);
    }

    // Skip slow semantic search for voice (latency sensitive)
    appendHistoryFast('user', message);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache');

    // Guard: Claude CLI must be available
    if (!claudeCliAvailable) {
      const errMsg = 'Claude Code is not configured. Voice Q&A works but execution is disabled.';
      console.error(`[FELIPE] ❌ voice-complete rejected: ${claudeCliError}`);
      try { res.write(errMsg); res.end(); } catch {}
      return;
    }

    // Use pre-spawned process if available, else grab from warm pool
    let proc;
    if (spawnId && pendingSpawns.has(spawnId)) {
      proc = pendingSpawns.get(spawnId).proc;
      pendingSpawns.delete(spawnId);
    } else {
      proc = pools.haiku.acquire();
    }
    if (!proc) {
      try { res.write('[error] Claude process unavailable.'); res.end(); } catch {}
      return;
    }

    const { language: voiceLang = 'EN' } = req.body;
    proc.stdin.write(buildJarvisPrompt(message, '', true, voiceLang));
    proc.stdin.end();

    const killTimer = setTimeout(() => {
      try { proc.kill(); } catch {}
    }, 60000);

    let responseBuffer = '';
    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      responseBuffer += chunk;
      try { res.write(chunk); } catch {}
    });

    proc.on('close', () => {
      clearTimeout(killTimer);
      const elapsed = Date.now() - t0;
      sessionStats.tokensOut += Math.ceil(responseBuffer.length / 4);
      sessionStats.lastLatency = elapsed;
      console.log(`[FELIPE] 🎤 Voice → ${elapsed}ms | pool: H${pools.haiku.pool.length}`);
      appendHistoryFast('felipe', responseBuffer);
      storeMemory(message, responseBuffer).catch(() => {});
      try { res.end(); } catch {}
    });

    proc.on('error', (err) => {
      clearTimeout(killTimer);
      try { res.write('[error] ' + err.message); res.end(); } catch {}
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audio-complete - Messages to pre-spawned + streaming
app.post('/api/audio-complete', async (req, res) => {
  try {
    const { spawnId, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    sessionStats.requests++;
    const semanticContext = await findRelevantMemories(message);
    appendHistoryFast('user', message);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');

    // Guard: Claude CLI must be available
    if (!claudeCliAvailable) {
      try { res.write('[error] Claude Code not configured.'); res.end(); } catch {}
      return;
    }

    // Use warm pool — no cold spawn
    const proc = pools.haiku.acquire();
    if (!proc) {
      try { res.write('[error] Claude process unavailable.'); res.end(); } catch {}
      return;
    }

    proc.stdin.write(buildJarvisPrompt(message, semanticContext));
    proc.stdin.end();

    let responseBuffer = '';
    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      responseBuffer += chunk;
      res.write(chunk);
    });

    proc.on('close', () => {
      sessionStats.tokensOut += Math.ceil(responseBuffer.length / 4);
      appendHistoryFast('felipe', responseBuffer);
      storeMemory(message, responseBuffer).catch(() => {});
      res.end();
    });

    proc.on('error', (err) => {
      res.write('[error] ' + err.message);
      res.end();
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== WHISPER HALLUCINATION FILTER ==========
const HALLUCINATION_PATTERNS = [
  // Common Whisper phantom outputs (EN + PT)
  /^\.+$/,
  /^(bye|goodbye|farewell|see you|thank you for watching|thanks for watching)\.?$/i,
  /^(tchau|adeus|obrigado por assistir|obrigada por assistir|até logo)\.?$/i,
  /^(subscribe|like and subscribe|don't forget to subscribe)\.?$/i,
  /^(inscreva-se|se inscreva|curta e se inscreva)\.?$/i,
  /^(silence|silêncio|music|música|applause|laughter)\.?$/i,
  /^\[.*\]$/, // [Music], [Applause], etc.
  /^\(.*\)$/, // (silence), (music), etc.
  /^(um+|uh+|ah+|eh+|oh+|hm+|hmm+)\.?$/i,
  /^(you|you\.|he|she|it|the|a|an|is|was|I)\.?$/i,
  /^(o|a|e|é|ou|sim|não)\.?$/i,
  /^.{1,3}$/, // Anything 3 chars or less is likely noise
  /^(subs|sub|legendas|legenda).*$/i,
  /^(continue|continua|next|próximo)\.?$/i,
  /^(okay|ok)\.?$/i,
];

function isHallucination(text) {
  if (!text || !text.trim()) return true;
  const trimmed = text.trim();

  // Too short to be a real command
  if (trimmed.length < 4) return true;

  // Single word under 8 chars is very likely hallucination
  if (!trimmed.includes(' ') && trimmed.length < 8) return true;

  // Check against known hallucination patterns
  for (const pattern of HALLUCINATION_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // Repetitive text (Whisper loves to repeat itself)
  const words = trimmed.toLowerCase().split(/\s+/);
  if (words.length >= 3) {
    const unique = new Set(words);
    if (unique.size === 1) return true; // All same word
    if (unique.size <= words.length * 0.3) return true; // 70%+ repetition
  }

  return false;
}

// POST /api/stt - Voice Transcription (Whisper) with dual-language + hallucination filter
app.post('/api/stt', upload.single('audio'), async (req, res) => {
  try {
    if (!openai) return res.status(500).json({ error: 'OpenAI API key not configured' });
    if (!req.file) return res.status(400).json({ error: 'No audio file' });

    // Reject tiny audio files (likely just noise/click)
    if (req.file.size < 2000) {
      console.log('[FELIPE] STT rejected: audio too small', req.file.size, 'bytes');
      return res.json({ text: '', filtered: true, reason: 'Audio too short' });
    }

    // Save raw audio for debugging
    const debugPath = path.join(SYSTEM_DIR, 'last-audio-debug.webm');
    try { fs.writeFileSync(debugPath, req.file.buffer); } catch {}

    console.log(`[FELIPE] STT input: ${req.file.size} bytes, mime: ${req.file.mimetype}, saved to debug`);

    // Single transcription call with English — simpler is more reliable
    const audioFile = await toFile(req.file.buffer, 'audio.webm', { type: 'audio/webm' });

    // First attempt: English
    let transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: audioFile,
      language: 'en',
      prompt: 'Create an e-book about digital marketing. Build a website. Generate a report. Design a presentation. Analyze data. Write code. Hello FELIPE.'
    });

    let raw = transcription.text?.trim() || '';
    console.log('[FELIPE] STT [en]:', JSON.stringify(raw));

    // If English hallucinated, try Portuguese
    if (isHallucination(raw)) {
      console.log('[FELIPE] EN was hallucination, trying PT...');
      const audioFile2 = await toFile(req.file.buffer, 'audio.webm', { type: 'audio/webm' });
      transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: audioFile2,
        language: 'pt',
        prompt: 'Crie um e-book sobre marketing digital. Construa um site. Gere um relatório. Olá FELIPE.'
      });
      raw = transcription.text?.trim() || '';
      console.log('[FELIPE] STT [pt]:', JSON.stringify(raw));
    }

    if (isHallucination(raw)) {
      console.log('[FELIPE] STT FILTERED both attempts:', JSON.stringify(raw));
      return res.json({ text: '', filtered: true, reason: 'Could not understand. Try speaking closer to the mic.' });
    }

    console.log('[FELIPE] STT accepted:', raw);
    res.json({ text: raw });
  } catch (err) {
    console.error('[FELIPE] STT error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analyze-screen-fast - Vision via GPT-4o-mini (real-time, ~1s response)
app.post('/api/analyze-screen-fast', async (req, res) => {
  try {
    if (!openai) return res.status(500).json({ error: 'OpenAI API key not configured' });
    const { image, message = '', language = 'EN', saveHistory = false } = req.body;
    if (!image) return res.status(400).json({ error: 'Image required' });

    const memory = loadMemoryCached();
    const systemPrompt = buildGPTSystemPrompt(language);

    // Load recent conversation history to give the vision model context of previous exchanges
    const history = loadHistory().slice(-6);
    const historyText = history.length
      ? history.map(e => `[${e.role}] ${e.content}`).join('\n')
      : '';

    const question = message
      ? (language === 'BR' ? `O usuário perguntou sobre a tela: ${message}` : `User asked about the screen: ${message}`)
      : (language === 'BR' ? 'Descreva o que está nesta tela de forma útil e direta.' : 'Describe what is on this screen in a useful and direct way.');

    const contextualQuestion = historyText
      ? `${language === 'BR' ? 'Conversa recente (para contexto):' : 'Recent conversation (for context):'}\n${historyText}\n\n${question}`
      : question;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: image, detail: 'auto' } },
            { type: 'text', text: contextualQuestion }
          ]
        }
      ],
      max_tokens: 600,
      temperature: 0.7
    });

    const response = completion.choices[0]?.message?.content?.trim() || '';

    // Persist Q&A to history so follow-up chats/voice queries know about the screen discussion
    if (saveHistory && response) {
      const userEntry = message ? `[screen] ${message}` : '[screen] (describe)';
      appendHistory('user', userEntry);
      appendHistory('assistant', response);
    }

    res.json({ response });
  } catch (err) {
    console.error('[FELIPE] Fast vision error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analyze-screen - Vision: analyze screenshot via Claude CLI (uses subscription auth)
app.post('/api/analyze-screen', async (req, res) => {
  try {
    const { image, message = '', language = 'EN', saveHistory = false } = req.body;
    if (!image) return res.status(400).json({ error: 'Image required' });

    // Save screenshot to temp file
    const base64Data = image.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
    const ext = image.startsWith('data:image/jpeg') ? 'jpg' : 'png';
    const tmpImg = path.join(os.tmpdir(), `felipe-screen-${Date.now()}.${ext}`);
    fs.writeFileSync(tmpImg, Buffer.from(base64Data, 'base64'));

    const memory = loadMemoryCached();
    const langInstruction = language === 'BR'
      ? 'Responda EXCLUSIVAMENTE em Português Brasileiro. Você é FELIPE, braço direito do usuário.'
      : 'Respond EXCLUSIVELY in English. You are FELIPE, the user\'s right-hand man.';

    const question = message
      ? (language === 'BR' ? `Pergunta do usuário sobre a tela: ${message}` : `User question about the screen: ${message}`)
      : (language === 'BR' ? 'Descreva o que está nesta tela de forma útil e direta.' : 'Describe what is on this screen in a useful and direct way.');

    const prompt = `${langInstruction}

${memory ? `MEMORY:\n${memory}\n` : ''}
Analyze this screenshot and answer: ${question}

Be direct and concise. If the user's question is about specific content visible on screen, focus on that.`;

    if (!claudeCliAvailable) {
      try { fs.unlinkSync(tmpImg); } catch {}
      return res.status(503).json({ error: `Claude Code unavailable: ${claudeCliError}` });
    }

    return new Promise((resolve) => {
      // Screen analysis needs --file flag — must use fresh spawn (can't use pool)
      const proc = spawn(CLAUDE_CMD, [
        '--print', '--output-format', 'text',
        '--model', 'claude-sonnet-4-6',
        '--dangerously-skip-permissions',
        '--file', tmpImg
      ], { shell: true, cwd: JARVIS_DIR });

      proc.stdin.write(prompt);
      proc.stdin.end();

      let output = '';
      const killTimer = setTimeout(() => { try { proc.kill(); } catch {} }, 60000);

      proc.stdout.on('data', d => { output += d.toString(); });
      proc.on('close', () => {
        clearTimeout(killTimer);
        try { fs.unlinkSync(tmpImg); } catch {}
        sessionStats.requests++;
        const response = output.trim();
        if (saveHistory && response) {
          const userEntry = message ? `[screen] ${message}` : '[screen] (describe)';
          appendHistory('user', userEntry);
          appendHistory('assistant', response);
        }
        res.json({ response });
        resolve();
      });
      proc.on('error', (err) => {
        clearTimeout(killTimer);
        try { fs.unlinkSync(tmpImg); } catch {}
        res.status(500).json({ error: err.message });
        resolve();
      });
    });
  } catch (err) {
    console.error('[FELIPE] Screen analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tts - Voice Synthesis (OpenAI Speech)
app.post('/api/tts', async (req, res) => {
  try {
    if (!openai) return res.status(500).json({ error: 'OpenAI API key not configured' });
    const { text, language = 'EN', voice: requestedVoice } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    // User-selected voice takes priority. Fallback: onyx (EN) / nova (BR)
    const VALID_VOICES = ['alloy','ash','coral','echo','fable','nova','onyx','sage','shimmer'];
    const voice = VALID_VOICES.includes(requestedVoice) ? requestedVoice
      : (language === 'BR' ? 'nova' : 'onyx');

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(buffer);
  } catch (err) {
    console.error('[FELIPE] TTS error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/translate - Quick translate text to target language (for terminal display)
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLang = 'EN' } = req.body || {};
    if (!text) return res.json({ translated: text });

    // Detectar se o texto já está no idioma alvo (evita tradução desnecessária)
    const langName = LANG_NAMES[targetLang] || 'English';
    const isAlreadyTarget =
      (targetLang === 'BR' && isPortuguese(text)) ||
      (targetLang === 'EN' && !isPortuguese(text) && !/[áéíóúñ¿¡]/i.test(text)) ||
      (targetLang === 'ES' && /\b(el|la|los|las|es|está|para|por|que|con|una|del)\b/i.test(text));

    if (isAlreadyTarget) return res.json({ translated: text });

    const translated = await translateTo(text, langName);
    res.json({ translated });
  } catch (err) {
    res.json({ translated: req.body?.text || '' });
  }
});

// POST /api/realtime/session - Mint ephemeral token for OpenAI Realtime API (WebRTC direct)
app.post('/api/realtime/session', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' });
    const { language = 'EN', voice = 'ash' } = req.body || {};

    const INSTRUCTIONS = {
      BR: `Você é FELIPE — assistente pessoal com poderes COMPLETOS sobre o computador do senhor. Fale APENAS em Português Brasileiro. Máximo 1 frase. Nunca mencione GPT ou OpenAI.

SUAS CAPACIDADES (informe ao senhor quando perguntar):
- Você VÊ a tela do senhor em tempo real (screenshot de todos os monitores)
- Você CONTROLA mouse e teclado (clica, digita, arrasta)
- Você CRIA arquivos, apps, sites, planilhas, PDFs, apresentações
- Você ABRE programas, sites, pastas — qualquer coisa
- Você EXECUTA código, comandos, automações
- Você tem MEMÓRIA — lembra de conversas e preferências anteriores

REGRA ABSOLUTA: Para QUALQUER pedido que não seja pergunta pura de conhecimento → chame "execute_task". Sem exceção.

Exemplos: "abre o YouTube" → execute_task | "o que tem na minha tela?" → execute_task | "cria uma planilha" → execute_task | "olha meu monitor" → execute_task | "coloca música" → execute_task | "você consegue ver?" → execute_task (SIM, você vê)

NUNCA diga "não consigo", "não tenho acesso", "não posso ver". Você PODE tudo. SEMPRE chame execute_task.`,

      ES: `Eres FELIPE — asistente personal con poderes COMPLETOS sobre el computador del señor. SOLO Español. Máximo 1 frase. Nunca menciones GPT ni OpenAI.

TUS CAPACIDADES: VES la pantalla en tiempo real, CONTROLAS mouse y teclado, CREAS archivos/apps/sitios/PDFs, ABRES programas y sitios, EJECUTAS código y comandos, tienes MEMORIA de conversaciones anteriores.

REGLA: Para CUALQUIER pedido que no sea conocimiento puro → llama "execute_task". NUNCA digas "no puedo". Si pregunta "qué hay en mi pantalla" → execute_task. SIEMPRE execute_task.`,

      EN: `You are FELIPE — personal assistant with FULL powers over the user's computer. ONLY English. Max 1 sentence. Never mention GPT or OpenAI.

YOUR CAPABILITIES: You SEE the screen in real-time, CONTROL mouse and keyboard, CREATE files/apps/sites/PDFs, OPEN programs and sites, EXECUTE code and commands, have MEMORY of past conversations.

RULE: For ANY request that is not pure knowledge → call "execute_task". NEVER say "I can't". If asked "what's on my screen" → execute_task. ALWAYS execute_task.`
    };
    const instructions = INSTRUCTIONS[language] || INSTRUCTIONS.EN;

    const tools = [{
      type: 'function',
      name: 'execute_task',
      description: 'Execute ANY action on the computer via Claude Code. Use for: creating files/documents/code/PDFs, opening websites/folders/programs, playing music/video, searching the web, organizing files, installing software, sending emails, running commands — ANY action the user requests that needs to be done on the computer.',
      parameters: {
        type: 'object',
        properties: {
          request: { type: 'string', description: 'The full user request verbatim, in original language.' }
        },
        required: ['request']
      }
    }];

    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',
        voice,
        instructions,
        turn_detection: { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 500 },
        input_audio_transcription: {
          model: 'whisper-1',
          language: { BR: 'pt', ES: 'es', EN: 'en' }[language] || 'en'
        },
        modalities: ['audio', 'text'],
        tools,
        tool_choice: 'auto'
      })
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('[FELIPE] Realtime session error:', data);
      return res.status(500).json({ error: data.error?.message || 'Realtime session failed' });
    }
    res.json(data);
  } catch (err) {
    console.error('[FELIPE] Realtime error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files - List files in Documents and Projects
app.get('/api/files', (req, res) => {
  try {
    if (!fs.existsSync(PROJECTS_DIR)) {
      fs.mkdirSync(PROJECTS_DIR, { recursive: true });
      return res.json({ files: [] });
    }

    // Only deliverable formats — no support/code files (js, css, json, etc.)
    const deliverableExts = new Set([
      '.pdf', '.html', '.md', '.txt',
      '.xlsx', '.xls', '.pptx', '.ppt', '.doc', '.docx', '.ods', '.odp', '.csv',
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
      '.zip', '.mp3', '.mp4', '.wav'
    ]);

    const files = [];
    // Only walk one level of project subfolders — ignore node_modules etc.
    const projects = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);

    for (const project of projects) {
      const projectDir = path.join(PROJECTS_DIR, project);
      function walk(dir) {
        try {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (deliverableExts.has(path.extname(entry.name).toLowerCase())) {
              const stat = fs.statSync(full);
              files.push({
                name: entry.name,
                project,
                path: full,
                size: stat.size,
                ext: path.extname(entry.name).toLowerCase(),
                createdAt: stat.birthtime,
                downloadUrl: `/api/files/download?path=${encodeURIComponent(full)}`
              });
            }
          }
        } catch {}
      }
      walk(projectDir);
    }

    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/download - File Download
app.get('/api/files/download', (req, res) => {
  try {
    let raw = req.query.path || '';
    if (!raw) return res.status(400).json({ error: 'path required' });

    // Resolve relative paths against PROJECTS_DIR, then against JARVIS_DIR as fallback
    let candidates = [];
    if (path.isAbsolute(raw)) {
      candidates.push(path.normalize(raw));
    } else {
      candidates.push(path.resolve(PROJECTS_DIR, raw));
      candidates.push(path.resolve(JARVIS_DIR, raw));
    }

    // Pick first existing candidate
    const filePath = candidates.find(p => fs.existsSync(p));
    if (!filePath) return res.status(404).json({ error: 'File not found', tried: candidates });

    // Security: must stay inside JARVIS_DIR (Desktop\Jarvis) to avoid path traversal
    const norm = path.normalize(filePath).toLowerCase();
    const safeRoot = path.normalize(JARVIS_DIR).toLowerCase();
    if (!norm.startsWith(safeRoot)) return res.status(403).json({ error: 'Access denied' });

    res.download(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/read-file - Read file text content (Projects dir + any allowed user path)
app.get('/api/read-file', (req, res) => {
  try {
    const filePath = path.normalize(req.query.path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    const textExts = new Set(['.txt', '.md', '.json', '.js', '.ts', '.py', '.html', '.css', '.csv', '.xml', '.sql', '.sh', '.bat']);
    const ext = path.extname(filePath).toLowerCase();

    if (!textExts.has(ext)) return res.json({ binary: true, path: filePath });

    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content, size: content.length, lines: content.split('\n').length, path: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/find-file - Search for a file by name across common user locations
app.get('/api/find-file', (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'name required' });

    const home = os.homedir();
    const searchDirs = [
      path.join(home, 'Desktop'),
      path.join(home, 'Downloads'),
      path.join(home, 'Documents'),
      path.join(home, 'OneDrive'),
      path.join(home, 'OneDrive', 'Desktop'),
      path.join(home, 'OneDrive', 'Documents'),
      PROJECTS_DIR,
    ];

    const found = [];
    const nameLower = name.toLowerCase();

    function search(dir, depth = 0) {
      if (depth > 3) return;
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) search(full, depth + 1);
          else if (entry.name.toLowerCase().includes(nameLower)) found.push(full);
        }
      } catch {}
    }

    for (const dir of searchDirs) search(dir);
    res.json({ found: found.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/excel-live - Read or write Excel workbook
// Graceful close (WM_CLOSE) → edit with openpyxl → reopen (no recovery files)
app.post('/api/excel-live', async (req, res) => {
  try {
    const { action = 'read', path: filePath, sheet, operations } = req.body;

    let script = '';

    if (action === 'list') {
      script = `
import json, subprocess
r = subprocess.run(['tasklist'], capture_output=True, text=True)
excel_running = 'EXCEL.EXE' in r.stdout
print(json.dumps({"excel_running": excel_running}))
`;
    } else if (action === 'read') {
      script = `
import json
fp = r"""${filePath}"""
try:
    from openpyxl import load_workbook
    wb = load_workbook(fp, data_only=True)
    ws = wb[${sheet ? `"${sheet}"` : 'wb.sheetnames[0]'}]
    rows = [[cell.value for cell in row] for row in ws.iter_rows()]
    print(json.dumps({"sheet": ws.title, "rows": rows}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;
    } else if (action === 'write') {
      const ops = JSON.stringify(operations || []);
      script = `
import json, subprocess, os, time, ctypes

fp = r"""${filePath}"""
ops = ${ops}
reopen = ${req.body.reopen !== false ? 'True' : 'False'}

user32 = ctypes.windll.user32
WM_CLOSE = 0x0010
WINFUNC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int))

# Step 1: Close Excel gracefully via WM_CLOSE (no recovery files)
def close_excel():
    check = subprocess.run(['tasklist'], capture_output=True, text=True)
    if 'EXCEL.EXE' not in check.stdout:
        return True

    def cb(hwnd, lParam):
        length = user32.GetWindowTextLengthW(hwnd)
        if length > 0:
            buff = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buff, length + 1)
            if 'Excel' in buff.value and user32.IsWindowVisible(hwnd):
                user32.PostMessageW(hwnd, WM_CLOSE, 0, 0)
        return True
    user32.EnumWindows(WINFUNC(cb), 0)

    for i in range(10):
        time.sleep(0.5)
        check = subprocess.run(['tasklist'], capture_output=True, text=True)
        if 'EXCEL.EXE' not in check.stdout:
            return True

    # Handle possible save dialog
    try:
        import pyautogui
        pyautogui.press('n')
        time.sleep(1)
    except: pass

    check = subprocess.run(['tasklist'], capture_output=True, text=True)
    if 'EXCEL.EXE' not in check.stdout:
        return True

    # Last resort: force kill + clean recovery
    subprocess.run(['taskkill', '/F', '/IM', 'EXCEL.EXE'], capture_output=True)
    time.sleep(1)
    # Clean lock file
    lock = os.path.join(os.path.dirname(fp), '~$' + os.path.basename(fp))
    if os.path.exists(lock):
        try: os.remove(lock)
        except: pass
    # Clean recovery registry
    subprocess.run(['reg', 'delete', r'HKCU\\Software\\Microsoft\\Office\\16.0\\Excel\\Resiliency', '/f'], capture_output=True)
    return True

closed = close_excel()
if not closed:
    print(json.dumps({"ok": False, "error": "Could not close Excel"}))
else:
    # Step 2: Edit with openpyxl
    from openpyxl import load_workbook
    wb = load_workbook(fp)
    ws = wb[${sheet ? `"${sheet}"` : 'wb.sheetnames[0]'}]
    for op in ops:
        ws[op['cell']] = op['value']
    wb.save(fp)

    # Step 3: Reopen in Excel
    if reopen:
        subprocess.Popen(['cmd', '/c', 'start', '', fp], shell=True)

    print(json.dumps({"ok": True, "updated": len(ops), "reopened": reopen}))
`;
    }

    const tmpScript = path.join(os.tmpdir(), 'felipe_excel_live.py');
    fs.writeFileSync(tmpScript, script);

    const { execFile } = await import('child_process');
    execFile(PYTHON_CMD, [tmpScript], { timeout: 30000 }, (err, stdout, stderr) => {
      try { fs.unlinkSync(tmpScript); } catch {}
      if (err) return res.status(500).json({ error: err.message, stderr });
      try { res.json(JSON.parse(stdout.trim())); }
      catch { res.status(500).json({ error: 'Parse error', raw: stdout }); }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/read-excel - Read .xlsx file and return as JSON rows
app.post('/api/read-excel', async (req, res) => {
  try {
    const { path: filePath, sheet } = req.body;
    if (!filePath) return res.status(400).json({ error: 'path required' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    const py = `"${PYTHON_CMD}"`;
    const script = `
import json, sys
import openpyxl
wb = openpyxl.load_workbook(r"""${filePath}""", data_only=True)
sheet_name = ${sheet ? `"${sheet}"` : 'wb.sheetnames[0]'}
ws = wb[sheet_name]
rows = []
for row in ws.iter_rows(values_only=True):
    rows.append(list(row))
print(json.dumps({"sheet": sheet_name, "sheets": wb.sheetnames, "rows": rows}))
`;
    const tmpScript = path.join(os.tmpdir(), 'felipe_excel_read.py');
    fs.writeFileSync(tmpScript, script);

    const { execFile } = await import('child_process');
    execFile(PYTHON_CMD, [tmpScript], { timeout: 15000 }, (err, stdout) => {
      fs.unlinkSync(tmpScript);
      if (err) return res.status(500).json({ error: err.message });
      try { res.json(JSON.parse(stdout)); }
      catch { res.status(500).json({ error: 'Parse error', raw: stdout }); }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/view - Serve file inline for preview
app.get('/api/files/view', (req, res) => {
  try {
    const filePath = path.normalize(req.query.path);
    if (!filePath.startsWith(PROJECTS_DIR)) return res.status(403).json({ error: 'Access denied' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.html': 'text/html', '.txt': 'text/plain',
      '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css'
    };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pdf - HTML to PDF via Puppeteer
app.post('/api/pdf', async (req, res) => {
  try {
    const { htmlPath, pdfPath } = req.body;
    const normHtml = path.normalize(htmlPath);
    const normPdf = path.normalize(pdfPath);

    if (!normHtml.startsWith(PROJECTS_DIR) || !normPdf.startsWith(PROJECTS_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!fs.existsSync(normHtml)) return res.status(404).json({ error: 'HTML file not found' });

    await htmlToPdf(normHtml, normPdf);
    const stat = fs.statSync(normPdf);
    res.json({
      ok: true, path: normPdf, size: stat.size,
      downloadUrl: `/api/files/download?path=${encodeURIComponent(normPdf)}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config - Save configurations
app.post('/api/config', (req, res) => {
  try {
    const { key, value } = req.body;
    if (key === 'OPENAI_API_KEY') {
      process.env.OPENAI_API_KEY = value;
      const envPath = path.join(JARVIS_DIR, '.env');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
      if (envContent.includes('OPENAI_API_KEY=')) {
        envContent = envContent.replace(/OPENAI_API_KEY=.*/g, `OPENAI_API_KEY=${value}`);
      } else {
        envContent += `\nOPENAI_API_KEY=${value}`;
      }
      fs.writeFileSync(envPath, envContent);
      res.json({ ok: true });
    } else {
      res.status(400).json({ error: 'Only OPENAI_API_KEY can be configured' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/meta/campaigns - List Meta Ads campaigns with insights
app.get('/api/meta/campaigns', async (req, res) => {
  try {
    const [campaigns, insights] = await Promise.all([
      fetchMetaCampaigns(),
      fetchMetaInsights(null, req.query.date_preset || 'last_7d')
    ]);
    res.json({ campaigns: campaigns.data || [], insights: insights.data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications - SSE push channel for build completion pings
app.get('/api/notifications', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.write('data: {"type":"connected"}\n\n');
  notificationClients.add(res);
  console.log(`[FELIPE] SSE client connected (total: ${notificationClients.size})`);
  req.on('close', () => {
    notificationClients.delete(res);
    console.log(`[FELIPE] SSE client disconnected (total: ${notificationClients.size})`);
  });
});

// GET /api/stats - Session metrics for cockpit
app.get('/api/stats', (req, res) => {
  const uptime = Date.now() - sessionStats.startTime;
  res.json({
    uptime,
    tokensIn: sessionStats.tokensIn,
    tokensOut: sessionStats.tokensOut,
    tokens: sessionStats.tokensIn + sessionStats.tokensOut,
    requests: sessionStats.requests,
    plan: process.env.CLAUDE_PLAN || 'Max',
    lastLatency: sessionStats.lastAckLatency || sessionStats.lastLatency,
    pool: {
      opus:   pools.opus.pool.length,
      sonnet: pools.sonnet.pool.length,
      haiku:  pools.haiku.pool.length,
    }
  });
});

// POST /api/attach - Upload file attachment (supports text files + PDF extraction)
app.post('/api/attach', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const textExts = ['.txt', '.md', '.csv', '.json', '.js', '.ts', '.py', '.html', '.css', '.xml', '.sql', '.sh', '.bat', '.log', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.env'];
    const ext = path.extname(req.file.originalname).toLowerCase();
    const attachmentId = `att-${Date.now()}`;

    if (textExts.includes(ext)) {
      // Plain text files — read directly
      const content = req.file.buffer.toString('utf-8');
      attachments.set(attachmentId, content);
      res.json({ attachmentId, name: req.file.originalname, type: 'text', preview: content.slice(0, 500) });

    } else if (ext === '.pdf') {
      // PDF — extract text via pdfplumber (Python)
      const tmpPath = path.join(PROJECTS_DIR, `_tmp_${Date.now()}.pdf`);
      fs.writeFileSync(tmpPath, req.file.buffer);

      try {
        // execSync já importado no topo do arquivo
        const pyScript = `
import sys, pdfplumber
sys.stdout.reconfigure(encoding='utf-8')
with pdfplumber.open(r'${tmpPath.replace(/\\/g, '\\\\')}') as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        if text:
            print(text)
`;
        const pdfText = execSync(`"${PYTHON_CMD}" -c "${pyScript.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, {
          encoding: 'utf-8', timeout: 30000, maxBuffer: 10 * 1024 * 1024
        }).trim();

        // Clean up temp file
        try { fs.unlinkSync(tmpPath); } catch {}

        if (pdfText) {
          attachments.set(attachmentId, pdfText);
          console.log(`[FELIPE] PDF extracted: ${req.file.originalname} (${pdfText.length} chars)`);
          res.json({ attachmentId, name: req.file.originalname, type: 'pdf', preview: pdfText.slice(0, 500), chars: pdfText.length });
        } else {
          // PDF has no extractable text (scanned image) — save as binary
          const filePath = path.join(PROJECTS_DIR, req.file.originalname);
          fs.writeFileSync(filePath, req.file.buffer);
          attachments.set(attachmentId, `[PDF with no extractable text saved: ${filePath}]`);
          res.json({ attachmentId, name: req.file.originalname, type: 'binary', path: filePath });
        }
      } catch (pyErr) {
        console.error('[FELIPE] PDF extraction error:', pyErr.message);
        // Fallback: save as binary
        const filePath = path.join(PROJECTS_DIR, req.file.originalname);
        fs.writeFileSync(filePath, req.file.buffer);
        attachments.set(attachmentId, `[PDF saved but text extraction failed: ${filePath}]`);
        res.json({ attachmentId, name: req.file.originalname, type: 'binary', path: filePath });
        try { fs.unlinkSync(tmpPath); } catch {}
      }

    } else if (['.docx', '.doc', '.xlsx', '.xls', '.pptx'].includes(ext)) {
      // Office files — save and reference by path
      const filePath = path.join(PROJECTS_DIR, req.file.originalname);
      fs.writeFileSync(filePath, req.file.buffer);
      attachments.set(attachmentId, `[Office file saved: ${filePath}] — Use Claude to read and analyze this file.`);
      res.json({ attachmentId, name: req.file.originalname, type: 'office', path: filePath });

    } else {
      // Other binary files
      const filePath = path.join(PROJECTS_DIR, req.file.originalname);
      fs.writeFileSync(filePath, req.file.buffer);
      attachments.set(attachmentId, `[Binary file saved: ${filePath}]`);
      res.json({ attachmentId, name: req.file.originalname, type: 'binary', path: filePath });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// LibreHardwareMonitor — sensor data via local web API
// ═══════════════════════════════════════════════
let lhmProcess = null;
let lhmReady = false;

function startLibreHardwareMonitor() {
  const lhmDir = path.join(JARVIS_DIR, 'sensors');
  const lhmExe = path.join(lhmDir, 'LibreHardwareMonitor.exe');

  if (!fs.existsSync(lhmExe)) {
    console.log('[FELIPE] LibreHardwareMonitor nao encontrado — temperaturas limitadas');
    return;
  }

  // Ja rodando?
  try {
    const check = execSync('tasklist /FI "IMAGENAME eq LibreHardwareMonitor.exe"', { encoding: 'utf-8' });
    if (check.includes('LibreHardwareMonitor.exe')) {
      console.log('[FELIPE] LibreHardwareMonitor ja rodando');
      lhmReady = true;
      return;
    }
  } catch {}

  try {
    lhmProcess = spawn(lhmExe, [], {
      cwd: lhmDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    lhmProcess.unref();
    console.log('[FELIPE] LibreHardwareMonitor iniciado');
    // Aguarda 2s pra web server subir
    setTimeout(() => { lhmReady = true; }, 2000);
  } catch (err) {
    console.log('[FELIPE] Erro ao iniciar LHM:', err.message);
  }
}

// Parse LHM JSON recursivamente procurando sensores de temperatura
function extractLHMSensors(node, results = { cpuTemps: [], gpuTemps: [], cpuLoad: [], gpuLoad: [] }) {
  if (!node) return results;

  if (node.Value && node.Type) {
    // Ex: "53.0 °C" ou "42.5 %"
    const val = parseFloat(node.Value);
    if (!isNaN(val)) {
      const textLower = (node.Text || '').toLowerCase();
      const imageLower = (node.ImageURL || '').toLowerCase();
      const isCpu = imageLower.includes('cpu') || textLower.includes('cpu');
      const isGpu = imageLower.includes('gpu') || textLower.includes('gpu');

      if (node.Value.includes('°C')) {
        if (isCpu) results.cpuTemps.push(val);
        else if (isGpu) results.gpuTemps.push(val);
      } else if (node.Value.includes('%') && textLower.includes('total')) {
        if (isCpu) results.cpuLoad.push(val);
        else if (isGpu) results.gpuLoad.push(val);
      }
    }
  }

  if (Array.isArray(node.Children)) {
    for (const child of node.Children) {
      extractLHMSensors(child, results);
    }
  }
  return results;
}

async function fetchLHMStats() {
  if (!lhmReady) return null;
  try {
    const http = await import('http');
    return new Promise((resolve) => {
      const req = http.get('http://localhost:8085/data.json', { timeout: 2000 }, (r) => {
        let data = '';
        r.on('data', c => data += c);
        r.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const sensors = extractLHMSensors(parsed);
            resolve({
              cpuTemp: sensors.cpuTemps.length ? Math.round(Math.max(...sensors.cpuTemps)) : null,
              gpuTemp: sensors.gpuTemps.length ? Math.round(Math.max(...sensors.gpuTemps)) : null,
              cpuLoad: sensors.cpuLoad.length ? Math.round(sensors.cpuLoad[0]) : null,
              gpuLoad: sensors.gpuLoad.length ? Math.round(sensors.gpuLoad[0]) : null,
            });
          } catch {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  } catch {
    return null;
  }
}

// GET /api/system-stats - CPU/GPU/RAM via Python psutil+wmi (mais confiavel)
app.get('/api/system-stats', async (req, res) => {
  try {
    // Tenta LHM primeiro (se rodando)
    const lhm = await fetchLHMStats();
    if (lhm && (lhm.cpuTemp || lhm.gpuTemp)) {
      return res.json({
        cpu: { usage: lhm.cpuLoad ?? Math.round(100 - (os.cpus().reduce((a,c)=>a+c.times.idle,0)/os.cpus().reduce((a,c)=>a+c.times.user+c.times.nice+c.times.sys+c.times.idle+c.times.irq,0)*100)), temp: lhm.cpuTemp, cores: os.cpus().length },
        gpu: { name: null, usage: lhm.gpuLoad, temp: lhm.gpuTemp },
        ram: { usage: Math.round(((os.totalmem()-os.freemem())/os.totalmem())*100), total: Math.round(os.totalmem()/(1024**3)), free: Math.round(os.freemem()/(1024**3)) },
        source: 'LibreHardwareMonitor'
      });
    }

    // Fallback: Python psutil + wmi (funciona com AMD/Intel/NVIDIA)
    const pyScript = `
import json, sys
sys.stdout.reconfigure(encoding='utf-8')
result = {"cpu":{"name":None,"usage":None,"temp":None,"cores":0},"gpu":{"name":None,"temp":None,"vram":None,"usage":None},"ram":{"usage":None,"total":0,"free":0,"type":None}}
try:
    import psutil
    result["cpu"]["usage"] = round(psutil.cpu_percent(interval=0.5))
    result["cpu"]["cores"] = psutil.cpu_count(logical=True)
    mem = psutil.virtual_memory()
    result["ram"]["usage"] = round(mem.percent)
    # Arredondar pro multiplo de 8 mais proximo (ex: 30.x → 32, 15.x → 16)
    raw_gb = mem.total / (1024**3)
    result["ram"]["total"] = int(round(raw_gb / 8) * 8) or round(raw_gb)
    result["ram"]["free"] = round(mem.available / (1024**3))
    temps = psutil.sensors_temperatures()
    if temps:
        for name, entries in temps.items():
            if entries:
                result["cpu"]["temp"] = round(entries[0].current)
                break
except: pass
try:
    import wmi
    w = wmi.WMI()
    # CPU name
    cpus = w.Win32_Processor()
    if cpus:
        result["cpu"]["name"] = cpus[0].Name.strip()
    # GPU — pegar apenas a placa dedicada (ignorar integrada e Microsoft)
    gpus = w.Win32_VideoController()
    dedicated = [g for g in gpus if g.Name and 'Microsoft' not in g.Name and 'Radeon(TM) Graphics' not in g.Name and 'Intel' not in g.Name and 'UHD' not in g.Name]
    gpu = None
    if dedicated:
        gpu = dedicated[0]
    elif gpus:
        real = [g for g in gpus if g.Name and 'Microsoft' not in g.Name]
        if real: gpu = real[0]
    if gpu:
        result["gpu"]["name"] = gpu.Name.strip()
        # VRAM — AdapterRAM overflow pra GPUs >4GB, usar qwMemorySize do registro
        try:
            vram_bytes = int(gpu.AdapterRAM or 0)
            if vram_bytes > 0:
                result["gpu"]["vram"] = round(vram_bytes / (1024**3))
            else:
                # Fallback: ler do registro do Windows (qwMemorySize = valor real)
                import winreg
                reg_path = "SYSTEM\\\\CurrentControlSet\\\\Control\\\\Class\\\\{4d36e968-e325-11ce-bfc1-08002be10318}"
                for i in range(20):
                    try:
                        sub = reg_path + "\\\\%04d" % i
                        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, sub)
                        try:
                            desc = winreg.QueryValueEx(key, "DriverDesc")[0]
                        except:
                            desc = ""
                        if gpu.Name.strip().lower() in desc.lower():
                            try:
                                qw = winreg.QueryValueEx(key, "HardwareInformation.qwMemorySize")[0]
                                result["gpu"]["vram"] = round(int(qw) / (1024**3))
                            except:
                                try:
                                    ms = winreg.QueryValueEx(key, "HardwareInformation.MemorySize")[0]
                                    result["gpu"]["vram"] = round(int(ms) / (1024**3))
                                except: pass
                            break
                        winreg.CloseKey(key)
                    except: pass
        except:
            result["gpu"]["vram"] = None
    # RAM type
    try:
        rams = w.Win32_PhysicalMemory()
        if rams:
            speed = rams[0].Speed or ""
            mem_type_map = {20:"DDR",21:"DDR2",24:"DDR3",26:"DDR4",34:"DDR5"}
            smbios_type = getattr(rams[0], 'SMBIOSMemoryType', None)
            if smbios_type and int(smbios_type) in mem_type_map:
                result["ram"]["type"] = mem_type_map[int(smbios_type)]
            elif speed:
                spd = int(speed)
                if spd >= 4800: result["ram"]["type"] = "DDR5"
                elif spd >= 2133: result["ram"]["type"] = "DDR4"
                elif spd >= 1066: result["ram"]["type"] = "DDR3"
                else: result["ram"]["type"] = "DDR"
            if speed:
                result["ram"]["type"] = (result["ram"]["type"] or "DDR") + " " + str(speed) + "MHz"
    except: pass
except: pass
try:
    import subprocess
    r = subprocess.run(['nvidia-smi','--query-gpu=temperature.gpu','--format=csv,noheader,nounits'], capture_output=True, text=True, timeout=3)
    if r.returncode == 0:
        result["gpu"]["temp"] = int(r.stdout.strip())
except: pass
print(json.dumps(result))
`;
    const tmpScript = path.join(os.tmpdir(), 'jarvis_stats.py');
    fs.writeFileSync(tmpScript, pyScript);

    const { execFile } = await import('child_process');
    execFile(PYTHON_CMD, [tmpScript], { timeout: 8000 }, (err, stdout) => {
      try { fs.unlinkSync(tmpScript); } catch {}
      if (err) {
        // Fallback puro Node
        return res.json({
          cpu: { usage: null, temp: null, cores: os.cpus().length },
          gpu: { name: null, temp: null },
          ram: { usage: Math.round(((os.totalmem()-os.freemem())/os.totalmem())*100), total: Math.round(os.totalmem()/(1024**3)), free: Math.round(os.freemem()/(1024**3)) },
          source: 'node-only'
        });
      }
      try {
        const data = JSON.parse(stdout.trim());
        data.source = 'psutil';
        res.json(data);
      } catch {
        res.json({ cpu:{usage:null,temp:null,cores:os.cpus().length}, gpu:{name:null,temp:null}, ram:{usage:null,total:0,free:0}, source:'error' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/health - Full system health check (used by Ligar FELIPE.bat and frontend)
app.get('/api/health', (req, res) => {
  const chrome = findChrome();
  const health = {
    status: claudeCliAvailable && openai ? 'operational' : 'degraded',
    components: {
      server: { status: 'ok' },
      openai: {
        status: openai ? 'ok' : 'error',
        error: openai ? null : 'OPENAI_API_KEY not configured in .env — voice/TTS will not work'
      },
      claude: {
        status: claudeCliChecking ? 'checking' : (claudeCliAvailable ? 'ok' : 'error'),
        error: claudeCliAvailable ? null : claudeCliError
      },
      chrome: {
        status: chrome ? 'ok' : 'bundled',
        path: chrome || 'Using Puppeteer bundled Chromium'
      },
      pools: {
        opus: pools.opus.pool.length,
        sonnet: pools.sonnet.pool.length,
        haiku: pools.haiku.pool.length,
        spawnErrors: pools.opus.spawnErrors + pools.sonnet.spawnErrors + pools.haiku.spawnErrors
      }
    },
    capabilities: {
      voice_realtime: !!openai,
      voice_stt: !!openai,
      voice_tts: !!openai,
      task_execution: claudeCliAvailable,
      pdf_generation: true,
      screen_analysis: claudeCliAvailable,
      excel_live: fs.existsSync(PYTHON_CMD),
      meta_ads: !!(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID)
    }
  };
  res.json(health);
});

// POST /api/health/recheck - Re-run Claude CLI health check (useful after fixing auth)
app.post('/api/health/recheck', (req, res) => {
  console.log('[FELIPE] Re-checking Claude CLI health...');
  claudeCliAvailable = checkClaudeCli();
  if (claudeCliAvailable) {
    // Refill pools now that CLI is available
    pools.opus.spawnErrors = 0;
    pools.sonnet.spawnErrors = 0;
    pools.haiku.spawnErrors = 0;
    pools.opus.fill();
    pools.sonnet.fill();
    pools.haiku.fill();
  }
  res.json({
    claudeAvailable: claudeCliAvailable,
    error: claudeCliAvailable ? null : claudeCliError
  });
});

// POST /api/health/preflight - Deep verification: actually tests OpenAI + Claude + Realtime voice
// Run this ONCE after install to confirm everything works before the user starts
app.post('/api/health/preflight', async (req, res) => {
  console.log('[FELIPE] Running pre-flight verification...');
  const results = {
    openai_api: { status: 'pending', detail: '' },
    openai_realtime: { status: 'pending', detail: '' },
    openai_tts: { status: 'pending', detail: '' },
    claude_cli: { status: 'pending', detail: '' },
    claude_execute: { status: 'pending', detail: '' },
  };

  // 1. Test OpenAI API (chat completion)
  if (!openai) {
    results.openai_api = { status: 'error', detail: 'OPENAI_API_KEY not found in .env' };
    results.openai_realtime = { status: 'error', detail: 'Requires OpenAI API key' };
    results.openai_tts = { status: 'error', detail: 'Requires OpenAI API key' };
  } else {
    try {
      const chatTest = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
        max_tokens: 5, temperature: 0
      });
      if (chatTest.choices?.[0]?.message?.content) {
        results.openai_api = { status: 'ok', detail: 'GPT-4o-mini responding' };
      } else {
        results.openai_api = { status: 'error', detail: 'Empty response from GPT-4o-mini' };
      }
    } catch (e) {
      results.openai_api = { status: 'error', detail: e.message?.slice(0, 150) };
    }

    // 2. Test OpenAI Realtime session creation (voice)
    try {
      const rtRes = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview',
          voice: 'ash',
          modalities: ['audio', 'text']
        })
      });
      const rtData = await rtRes.json();
      if (rtRes.ok && rtData.client_secret?.value) {
        results.openai_realtime = { status: 'ok', detail: 'Realtime session created successfully' };
      } else {
        results.openai_realtime = { status: 'error', detail: rtData.error?.message || 'Session creation failed' };
      }
    } catch (e) {
      results.openai_realtime = { status: 'error', detail: e.message?.slice(0, 150) };
    }

    // 3. Test TTS
    try {
      const ttsTest = await openai.audio.speech.create({
        model: 'tts-1', voice: 'ash', input: 'Test.', response_format: 'mp3'
      });
      if (ttsTest) {
        results.openai_tts = { status: 'ok', detail: 'TTS generating audio' };
      }
    } catch (e) {
      results.openai_tts = { status: 'error', detail: e.message?.slice(0, 150) };
    }
  }

  // 4. Test Claude CLI — ALWAYS do a fresh check (don't rely on boot check which may have timed out)
  // Usa findClaudeCli() que cobre PATH, where claude, npm global, e native installer
  const foundClaudePath = findClaudeCli();
  const cliFound = !!foundClaudePath;
  const claudeCmd = foundClaudePath || 'claude';

  if (!cliFound) {
    results.claude_cli = { status: 'error', detail: 'Claude CLI not found. Install: npm install -g @anthropic-ai/claude-code' };
    results.claude_execute = { status: 'error', detail: 'Requires Claude CLI' };
  } else {
    // 4b. Check auth status (fast — just reads credentials file)
    let authOk = false;
    try {
      const authResult = execSync(`"${claudeCmd}" auth status`, { encoding: 'utf-8', timeout: 10000, shell: true });
      authOk = authResult.includes('"loggedIn": true') || authResult.includes('"loggedIn":true');
    } catch {}

    if (authOk) {
      results.claude_cli = { status: 'ok', detail: 'Installed and authenticated' };
    } else {
      results.claude_cli = { status: 'error', detail: 'Installed but not authenticated. Run: claude auth login --claudeai' };
      results.claude_execute = { status: 'error', detail: 'Requires authentication' };
    }

    // 5. Test actual execution only if auth is OK
    if (authOk) {
      try {
        const testProc = spawnSync('claude', [
          '--print', '--output-format', 'text',
          '--dangerously-skip-permissions'
        ], {
          input: 'Reply with exactly: FELIPE_OK',
          timeout: 60000, encoding: 'utf-8', shell: true
        });

        const out = (testProc.stdout || '').trim();
        if (out.length > 0) {
          results.claude_execute = { status: 'ok', detail: 'Task execution working' };
          // Also fix the boot-level flag if it was stuck
          if (!claudeCliAvailable) {
            claudeCliAvailable = true;
            claudeCliError = '';
            claudeCliChecking = false;
            pools.opus.fill(); pools.sonnet.fill(); pools.haiku.fill();
            console.log('[FELIPE] Preflight fixed boot auth — pools filled');
          }
        } else {
          const errDetail = testProc.stderr?.slice(0, 200) || 'No output — may need retry';
          results.claude_execute = { status: 'error', detail: errDetail };
        }
      } catch (e) {
        results.claude_execute = { status: 'error', detail: e.message?.includes('timeout') ? 'Timeout — click Retry' : e.message?.slice(0, 150) };
      }
    }
  }

  // Summary
  const allOk = Object.values(results).every(r => r.status === 'ok');
  const summary = {
    status: allOk ? 'ready' : 'issues_found',
    results,
    message: allOk
      ? 'All systems operational. FELIPE is ready to use.'
      : 'Some components have issues. Check details above.'
  };

  console.log('[FELIPE] Pre-flight results:', JSON.stringify(summary.results, null, 2));
  res.json(summary);
});

// POST /api/health/autofix - Claude CLI auto-repairs detected issues
app.post('/api/health/autofix', async (req, res) => {
  const { issues } = req.body || {};
  if (!issues || !Array.isArray(issues) || issues.length === 0) {
    return res.status(400).json({ error: 'No issues provided' });
  }

  if (!claudeCliAvailable) {
    return res.status(503).json({ error: 'Claude CLI not available — cannot auto-fix without it' });
  }

  console.log('[FELIPE] Auto-fix requested for:', issues.map(i => i.key).join(', '));

  // Build a diagnostic prompt for Claude
  const diagLines = issues.map(i =>
    `- ${i.key}: ${i.detail}`
  ).join('\n');

  const fixPrompt = `You are FELIPE system repair agent. The following issues were detected during system verification of a FELIPE Voice Assistant installation at "${JARVIS_DIR}":

${diagLines}

IMPORTANT CONTEXT:
- FELIPE runs on Node.js with Express (server.js) on port ${PORT}
- Voice uses OpenAI Realtime API (needs OPENAI_API_KEY in .env file)
- Task execution uses Claude CLI (needs 'claude' in PATH and authenticated)
- The .env file should be at: ${path.join(JARVIS_DIR, '.env')}
- The server file is at: ${path.join(JARVIS_DIR, 'server.js')}
- Package deps are in: ${path.join(JARVIS_DIR, 'package.json')}

FOR EACH ISSUE, diagnose and fix:
1. If .env is missing or has no OPENAI_API_KEY → Create .env with placeholder and tell user to add their key
2. If Claude CLI not found → Run: npm install -g @anthropic-ai/claude-code
3. If Claude not authenticated → Tell user to run: claude login
4. If node_modules missing → Run: npm install
5. If port conflict → Find and kill the process using port ${PORT}
6. Any other issue → Diagnose from error message and fix

DO NOT ask questions. Fix what you can, report what needs user action.
After fixing, output a summary of what was done.`;

  // Stream Claude output to client
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');

  try {
    const proc = spawn(CLAUDE_CMD, [
      '--print', '--output-format', 'text', '--model', 'claude-sonnet-4-6',
      '--dangerously-skip-permissions',
      '-p', fixPrompt
    ], {
      cwd: JARVIS_DIR,
      env: process.env,
      shell: true,
      timeout: 120000
    });

    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      try { res.write(chunk); } catch {}
    });

    proc.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.error('[FELIPE autofix stderr]', msg);
    });

    proc.on('close', (code) => {
      console.log(`[FELIPE] Auto-fix completed with code ${code}`);
      try { res.write(`\n[autofix-done] exit code: ${code}`); res.end(); } catch {}
    });

    proc.on('error', (err) => {
      console.error('[FELIPE] Auto-fix spawn error:', err.message);
      try { res.write(`[autofix-error] ${err.message}`); res.end(); } catch {}
    });

  } catch (err) {
    console.error('[FELIPE] Auto-fix error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// OBSIDIAN BRAIN — Vault endpoints
// ═══════════════════════════════════════════════
const OBSIDIAN_VAULT = path.join(os.homedir(), 'Documents', 'Felipe');

// GET /api/obsidian/stats — count notes, folders, links
app.get('/api/obsidian/stats', (req, res) => {
  try {
    if (!fs.existsSync(OBSIDIAN_VAULT)) {
      return res.json({ connected: false, error: 'Vault not found' });
    }
    let notes = 0, folders = 0, links = 0;
    function walk(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item.startsWith('.')) continue;
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          folders++;
          walk(full);
        } else if (item.endsWith('.md')) {
          notes++;
          const content = fs.readFileSync(full, 'utf-8');
          const matches = content.match(/\[\[[^\]]+\]\]/g);
          if (matches) links += matches.length;
        }
      }
    }
    walk(OBSIDIAN_VAULT);
    res.json({ connected: true, notes, folders, links });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

// GET /api/obsidian/tree — full vault tree
app.get('/api/obsidian/tree', (req, res) => {
  try {
    if (!fs.existsSync(OBSIDIAN_VAULT)) return res.json({ tree: [] });
    function buildTree(dir) {
      const items = fs.readdirSync(dir).filter(i => !i.startsWith('.'));
      const result = [];
      // Folders first, then files
      const folders = items.filter(i => fs.statSync(path.join(dir, i)).isDirectory());
      const files = items.filter(i => i.endsWith('.md') && fs.statSync(path.join(dir, i)).isFile());
      for (const f of folders.sort()) {
        result.push({
          type: 'folder',
          name: f,
          children: buildTree(path.join(dir, f))
        });
      }
      for (const f of files.sort()) {
        result.push({
          type: 'note',
          name: f.replace('.md', ''),
          path: path.relative(OBSIDIAN_VAULT, path.join(dir, f)).replace(/\\/g, '/')
        });
      }
      return result;
    }
    res.json({ tree: buildTree(OBSIDIAN_VAULT) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/obsidian/note?path=... — read a note
app.get('/api/obsidian/note', (req, res) => {
  try {
    const notePath = req.query.path;
    if (!notePath) return res.status(400).json({ error: 'path required' });
    const fullPath = path.join(OBSIDIAN_VAULT, notePath);
    // Security: prevent path traversal
    if (!fullPath.startsWith(OBSIDIAN_VAULT)) return res.status(403).json({ error: 'forbidden' });
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'not found' });
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ path: notePath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/obsidian/ingest — create note from text, file content, or session
app.post('/api/obsidian/ingest', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { type, text, category, fileName, fileContent, folderPath } = req.body;

    if (type === 'text' && text) {
      // Generate note title and content via GPT-4o-mini
      let title = 'Novo Conhecimento';
      let noteContent = text;
      let folder = category || 'auto';

      if (openai && folder === 'auto') {
        try {
          const aiRes = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Organize this knowledge into an Obsidian note. Return JSON: {"title":"short title","folder":"best folder (Projetos|Negócios & Finanças|Marketing Digital|Programação & IA|Tecnologias)","content":"organized markdown with [[links]] to related concepts"}' },
              { role: 'user', content: text }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 2000
          });
          const parsed = JSON.parse(aiRes.choices[0].message.content);
          title = parsed.title || title;
          folder = parsed.folder || 'geral';
          noteContent = parsed.content || text;
        } catch {}
      }

      // Map category to folder
      const folderMap = {
        projeto: 'Projetos', decisao: 'Decisões Técnicas',
        pessoa: '', aprendizado: '', preferencia: '',
        negocio: 'Negócios & Finanças', auto: folder
      };
      const targetFolder = folderMap[category] || folder;
      const targetDir = targetFolder ? path.join(OBSIDIAN_VAULT, targetFolder) : OBSIDIAN_VAULT;
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      const safeName = title.replace(/[<>:"/\\|?*]/g, '').substring(0, 80);
      const filePath = path.join(targetDir, `${safeName}.md`);
      fs.writeFileSync(filePath, noteContent, 'utf-8');

      return res.json({ ok: true, path: path.relative(OBSIDIAN_VAULT, filePath).replace(/\\/g, '/'), title });
    }

    if (type === 'file' && fileContent) {
      // Save file content as note
      const name = (fileName || 'Imported').replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*]/g, '');
      const filePath = path.join(OBSIDIAN_VAULT, `${name}.md`);

      let content = fileContent;
      // If content is base64 (binary file), try to extract text
      if (fileContent.startsWith('data:')) {
        content = `# ${name}\n\n> Arquivo importado\n\n\`\`\`\n${fileContent.substring(0, 500)}...\n\`\`\``;
      }

      fs.writeFileSync(filePath, content, 'utf-8');
      return res.json({ ok: true, path: `${name}.md`, title: name });
    }

    if (type === 'folder' && folderPath) {
      // Ingest entire folder
      if (!fs.existsSync(folderPath)) return res.status(404).json({ error: 'Folder not found' });
      let count = 0;
      const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
      for (const f of files) {
        const content = fs.readFileSync(path.join(folderPath, f), 'utf-8');
        const name = f.replace(/\.[^.]+$/, '');
        fs.writeFileSync(path.join(OBSIDIAN_VAULT, `${name}.md`), content, 'utf-8');
        count++;
      }
      return res.json({ ok: true, count, message: `${count} files ingested` });
    }

    if (type === 'session') {
      // Ingest from current session context
      const memoryFile = path.join(SYSTEM_DIR, 'FELIPE-MEMORY.md');
      const historyFile = path.join(SYSTEM_DIR, 'FELIPE-HISTORY.json');
      let sessionData = '';

      if (fs.existsSync(historyFile)) {
        try {
          const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
          const last10 = history.slice(-10);
          sessionData = last10.map(h => `[${h.role}] ${h.content}`).join('\n\n');
        } catch {}
      }

      if (!sessionData) {
        return res.json({ ok: false, error: 'No session data found' });
      }

      // Use GPT to extract valuable knowledge
      if (openai) {
        try {
          const aiRes = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Extract valuable knowledge from this session. Create 1-3 Obsidian notes. Return JSON array: [{"title":"...","content":"markdown with [[links]]","folder":"best folder name"}]. Only extract decisions, learnings, preferences, projects created. Skip trivial chat.' },
              { role: 'user', content: sessionData }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 3000
          });
          const parsed = JSON.parse(aiRes.choices[0].message.content);
          const notes = Array.isArray(parsed) ? parsed : (parsed.notes || [parsed]);
          let created = 0;
          for (const note of notes) {
            if (!note.title) continue;
            const dir = note.folder ? path.join(OBSIDIAN_VAULT, note.folder) : OBSIDIAN_VAULT;
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const safeName = note.title.replace(/[<>:"/\\|?*]/g, '').substring(0, 80);
            fs.writeFileSync(path.join(dir, `${safeName}.md`), note.content || '', 'utf-8');
            created++;
          }
          return res.json({ ok: true, count: created, notes: notes.map(n => n.title) });
        } catch (err) {
          return res.json({ ok: false, error: err.message });
        }
      }
      return res.json({ ok: false, error: 'OpenAI not configured for session analysis' });
    }

    res.status(400).json({ error: 'Invalid type. Use: text, file, folder, or session' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/weather - Free weather data (no API key needed)
app.get('/api/weather', async (req, res) => {
  const city = req.query.city || req.query.c || '';
  const lang = req.query.lang || 'BR';
  const data = await fetchWeather(city, lang);
  if (data) res.json(data);
  else res.status(404).json({ error: 'Weather not found' });
});

// ═══════════════════════════════════════════════
// COMPUTER USE v2 — Ultimate System
// ═══════════════════════════════════════════════

// ── Screen State Daemon (Layer 0) ──
let screenStateDaemon = null;
let _screenState = { value: null, ts: 0 };

function startScreenStateDaemon() {
  const script = path.join(JARVIS_DIR, 'system', 'screen-state.py');
  if (!fs.existsSync(script)) { console.log('[JARVIS] screen-state.py not found'); return; }
  screenStateDaemon = spawn(PYTHON_CMD, ['-u', script, '--mode=stdout'], {
    cwd: JARVIS_DIR, stdio: ['ignore', 'pipe', 'pipe']
  });
  let buffer = '';
  screenStateDaemon.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        _screenState.value = JSON.parse(line);
        _screenState.ts = Date.now();
      } catch {}
    }
  });
  screenStateDaemon.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.error('[ScreenState]', msg);
  });
  screenStateDaemon.on('exit', (code) => {
    console.log(`[JARVIS] Screen state daemon exited (${code})`);
    screenStateDaemon = null;
    // Restart after 5s
    setTimeout(startScreenStateDaemon, 5000);
  });
  console.log('[JARVIS] Screen state daemon started');
}

// Start daemon on server boot (delayed 3s to not block startup)
setTimeout(startScreenStateDaemon, 3000);

// ── Clipboard Intelligence Daemon ──
let clipboardDaemon = null;
let _lastClipboard = null;

function startClipboardDaemon() {
  const script = path.join(JARVIS_DIR, 'system', 'clipboard-intel.py');
  if (!fs.existsSync(script)) return;
  clipboardDaemon = spawn(PYTHON_CMD, ['-u', script], {
    cwd: JARVIS_DIR, stdio: ['ignore', 'pipe', 'pipe']
  });
  let buffer = '';
  clipboardDaemon.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try { _lastClipboard = JSON.parse(line); } catch {}
    }
  });
  clipboardDaemon.on('exit', () => {
    clipboardDaemon = null;
    setTimeout(startClipboardDaemon, 5000);
  });
  console.log('[JARVIS] Clipboard intelligence daemon started');
}
setTimeout(startClipboardDaemon, 4000);

// ── GET /api/screen-state — Current desktop state (instant, no screenshot) ──
app.get('/api/screen-state', (req, res) => {
  if (_screenState.value && (Date.now() - _screenState.ts < 5000)) {
    res.json(_screenState.value);
  } else {
    // Fallback: run screen-state.py once
    try {
      const script = path.join(JARVIS_DIR, 'system', 'screen-state.py');
      const result = execSync(`"${PYTHON_CMD}" -u "${script}" --mode=stdout`, {
        encoding: 'utf-8', timeout: 5000
      });
      const lines = result.trim().split('\n');
      const last = lines[lines.length - 1];
      res.json(JSON.parse(last));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── GET /api/clipboard — Last clipboard analysis ──
app.get('/api/clipboard', (req, res) => {
  res.json(_lastClipboard || { clipboard: null, analysis: null });
});

// ── POST /api/computer-use/v2 — Ultimate Computer Use with Claude Planner ──
app.post('/api/computer-use/v2', express.json({ limit: '5mb' }), async (req, res) => {
  const { task, language = 'BR', screenshot: wantScreenshot = false } = req.body;
  if (!task) return res.status(400).json({ error: 'task required' });

  try {
    // 1. Get current screen state (instant from daemon cache)
    const state = _screenState.value || {};
    const stateText = state.fg
      ? `Foreground: "${state.fg.title}" (${state.fg.proc})\nOpen windows: ${(state.windows || []).map(w => w.title).filter(t => t && t !== 'Program Manager').join(', ')}\nMonitors: ${(state.monitors || []).length}\nCursor: (${state.cursor?.[0]}, ${state.cursor?.[1]})`
      : 'Screen state unavailable';

    // 2. Optional: get screenshot for hybrid mode
    let screenshotData = null;
    if (wantScreenshot) {
      try {
        const ssScript = path.join(JARVIS_DIR, 'system', 'screenshot.py');
        const ssResult = execSync(`"${PYTHON_CMD}" "${ssScript}" all`, {
          encoding: 'utf-8', timeout: 10000, maxBuffer: 30 * 1024 * 1024
        });
        const ssJson = JSON.parse(ssResult.trim());
        screenshotData = ssJson.data;
      } catch {}
    }

    // 3. Build Claude Planner prompt
    const plannerPrompt = `You are JARVIS, an AI controlling a Windows 11 PC. Plan actions precisely.

CURRENT SCREEN STATE:
${stateText}

AVAILABLE ACTIONS (JSON array):
- {"type":"shell","command":"..."} — run shell command
- {"type":"app_focus","title":"..."} — bring window to front (partial title match)
- {"type":"app_close","title":"..."} — close window
- {"type":"app_minimize","title":"..."} — minimize window
- {"type":"key","keys":"ctrl+c"} — keyboard shortcut
- {"type":"type","text":"..."} — type text via clipboard paste
- {"type":"click","x":N,"y":N} — click at coordinates
- {"type":"uia_click","window":"...","name":"...","control_type":"..."} — click UI element by name
- {"type":"uia_set_value","window":"...","name":"...","value":"..."} — fill input field
- {"type":"scroll","direction":"down","amount":5} — scroll
- {"type":"wait","ms":1000} — wait
- {"type":"wait_for","title_contains":"...","timeout":5000} — wait for window
- {"type":"screenshot","mode":"all"} — take screenshot (only if needed to see result)

TASK: ${task}

Respond with ONLY a JSON object: {"actions":[...], "expected":"description of success state"}
Plan ALL steps. Include app_focus/shell to open apps if needed. Use wait_for after launches. Prefer uia_click over raw coordinates. Be precise.`;

    // 4. Get plan from Claude (uses Max plan, zero cost)
    const planResult = await new Promise((resolve, reject) => {
      const proc = spawn(CLAUDE_CMD, [
        '--print', '--output-format', 'text',
        '--model', 'claude-sonnet-4-6',
        '--dangerously-skip-permissions'
      ], { shell: true, cwd: JARVIS_DIR, timeout: 30000 });

      // Send prompt via stdin (more reliable than -p flag)
      proc.stdin.write(plannerPrompt);
      proc.stdin.end();

      let stdout = '', stderr = '';
      proc.stdout.on('data', d => { stdout += d; });
      proc.stderr.on('data', d => { stderr += d; });
      proc.on('close', (code) => {
        if (code === 0 && stdout.trim()) resolve(stdout.trim());
        else reject(new Error(stderr || `exit code ${code}`));
      });
      proc.on('error', reject);
    });

    // 5. Parse the plan
    let plan;
    try {
      // Extract JSON from response (Claude might wrap it in markdown)
      const jsonMatch = planResult.match(/\{[\s\S]*\}/);
      plan = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      return res.json({ ok: false, error: 'Failed to parse plan', raw: planResult.substring(0, 500) });
    }

    if (!plan || !plan.actions || !plan.actions.length) {
      return res.json({ ok: false, error: 'Empty plan', raw: planResult.substring(0, 500) });
    }

    // 6. Execute plan via ui-automation.py
    const uiaScript = path.join(JARVIS_DIR, 'system', 'ui-automation.py');
    const execResult = await new Promise((resolve, reject) => {
      const proc = spawn(PYTHON_CMD, ['-u', uiaScript], {
        cwd: JARVIS_DIR, stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000
      });
      proc.stdin.write(JSON.stringify(plan));
      proc.stdin.end();

      let stdout = '', stderr = '';
      proc.stdout.on('data', d => { stdout += d; });
      proc.stderr.on('data', d => { stderr += d; });
      proc.on('close', (code) => {
        // Parse all result lines
        const results = stdout.trim().split('\n').filter(l => l.trim()).map(l => {
          try { return JSON.parse(l); } catch { return { raw: l }; }
        });
        resolve({ code, results, stderr: stderr.trim() });
      });
      proc.on('error', reject);
    });

    // 7. Find summary line
    const summary = execResult.results.find(r => r.done);
    const failed = execResult.results.filter(r => r.ok === false);

    // 8. Self-healing: if actions failed, retry with context
    if (failed.length > 0 && failed.length < (plan.actions?.length || 99)) {
      console.log(`[JARVIS CU v2] ${failed.length} actions failed, attempting self-heal`);
      // Could re-plan here with error context — for now, report
    }

    res.json({
      ok: summary ? summary.success === summary.total : failed.length === 0,
      plan: plan.actions.length + ' actions planned',
      executed: execResult.results.length,
      failed: failed.length,
      expected: plan.expected,
      details: execResult.results
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/browser-control — CDP browser automation ──
app.post('/api/browser-control', express.json(), async (req, res) => {
  try {
    const script = path.join(JARVIS_DIR, 'system', 'browser-control.py');
    const proc = spawn(PYTHON_CMD, ['-u', script, '--auto-connect'], {
      cwd: JARVIS_DIR, stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000
    });
    proc.stdin.write(JSON.stringify(req.body) + '\n');
    proc.stdin.end();

    let stdout = '';
    proc.stdout.on('data', d => { stdout += d; });
    proc.on('close', () => {
      try {
        const lines = stdout.trim().split('\n').filter(l => l.trim());
        const last = lines[lines.length - 1];
        res.json(JSON.parse(last));
      } catch { res.json({ ok: false, error: 'Parse error', raw: stdout }); }
    });
    proc.on('error', (err) => res.status(500).json({ error: err.message }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/files/search — File Intelligence search ──
app.post('/api/files/search', express.json(), async (req, res) => {
  try {
    const { query, cmd = 'search' } = req.body;
    const script = path.join(JARVIS_DIR, 'system', 'file-index.py');
    const args = cmd === 'search' ? [script, 'search', query || '']
               : cmd === 'recent' ? [script, 'recent', String(req.body.days || 7)]
               : cmd === 'large'  ? [script, 'large', String(req.body.mb || 100)]
               : cmd === 'organize' ? [script, 'organize', req.body.path || '']
               : [script, 'search', query || ''];

    const result = execSync(`"${PYTHON_CMD}" ${args.map(a => `"${a}"`).join(' ')}`, {
      encoding: 'utf-8', timeout: 30000, maxBuffer: 10 * 1024 * 1024
    });
    res.json(JSON.parse(result.trim()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/workflow — Workflow Recording & Replay ──
app.post('/api/workflow', express.json(), async (req, res) => {
  try {
    const { action, name, speed } = req.body;
    const script = path.join(JARVIS_DIR, 'system', 'workflow-recorder.py');

    if (action === 'list') {
      const result = execSync(`"${PYTHON_CMD}" "${script}" list`, { encoding: 'utf-8', timeout: 5000 });
      return res.json(JSON.parse(result.trim()));
    }

    if (action === 'replay' && name) {
      const args = [`"${PYTHON_CMD}"`, `"${script}"`, 'replay', `"${name}"`];
      if (speed) args.push(`--speed=${speed}`);
      const proc = spawn(PYTHON_CMD, [script, 'replay', name, ...(speed ? [`--speed=${speed}`] : [])], {
        cwd: JARVIS_DIR, stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000
      });
      let stdout = '';
      proc.stdout.on('data', d => { stdout += d; });
      proc.on('close', (code) => { res.json({ ok: code === 0, output: stdout }); });
      proc.on('error', (err) => { res.status(500).json({ error: err.message }); });
      return;
    }

    res.status(400).json({ error: 'action required: list, replay' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// LEGACY ENDPOINTS (kept for backward compatibility)
// ═══════════════════════════════════════════════

// GET /api/screenshot - Capture screen directly via Python (no browser sharing needed)
// ?monitor=1 (primary), ?monitor=2 (second), ?monitor=all (all stitched), ?monitor=info (list)
app.get('/api/screenshot', (req, res) => {
  try {
    const monitor = req.query.monitor || '1';
    const scriptPath = path.join(JARVIS_DIR, 'system', 'screenshot.py');
    const result = execSync(`"${PYTHON_CMD}" "${scriptPath}" ${monitor}`, {
      encoding: 'utf-8', timeout: 15000, maxBuffer: 30 * 1024 * 1024
    });
    res.json(JSON.parse(result.trim()));
  } catch (err) {
    console.error('[FELIPE] Screenshot error:', err.message?.slice(0, 200));
    res.status(500).json({ error: 'Screenshot failed' });
  }
});

// POST /api/computer-use - Execute mouse/keyboard action on screen
app.post('/api/computer-use', (req, res) => {
  try {
    const scriptPath = path.join(JARVIS_DIR, 'system', 'computer-action.py');
    const argsJson = JSON.stringify(req.body).replace(/"/g, '\\"');
    execSync(`"${PYTHON_CMD}" "${scriptPath}" "${argsJson}"`, { timeout: 10000, shell: true });
    res.json({ success: true, action: req.body.action });
  } catch (err) {
    console.error('[FELIPE] Computer-use error:', err.message?.slice(0, 200));
    res.status(500).json({ error: err.message?.slice(0, 200) });
  }
});

// POST /api/computer-use/task - Claude analyses screen and performs actions autonomously
app.post('/api/computer-use/task', async (req, res) => {
  const { task, language = 'BR' } = req.body || {};
  if (!task) return res.status(400).json({ error: 'No task provided' });
  if (!claudeCliAvailable) return res.status(503).json({ error: 'Claude CLI not available' });

  console.log(`[FELIPE] Computer-use task: ${task}`);

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');

  const prompt = `You are FELIPE controlling the user's Windows computer. You have these tools available via HTTP:

1. GET /api/screenshot - captures the screen, returns { data: "data:image/jpeg;base64,..." }
2. POST /api/computer-use - performs actions:
   - { action: "click", x: 100, y: 200 }
   - { action: "doubleclick", x: 100, y: 200 }
   - { action: "rightclick", x: 100, y: 200 }
   - { action: "type", text: "hello world" }
   - { action: "typewrite", text: "texto em português" } (supports unicode via clipboard)
   - { action: "hotkey", key: "ctrl+c" }
   - { action: "press", key: "enter" }
   - { action: "scroll", y: 3 } (positive=up, negative=down)
   - { action: "move", x: 100, y: 200 }

TASK: ${task}

INSTRUCTIONS:
1. First take a screenshot to see the current screen state
2. Analyze what you see and plan your actions
3. Execute each action step by step using Bash to call the API:
   - Screenshot: curl -s http://localhost:${PORT}/api/screenshot
   - Actions: curl -s -X POST http://localhost:${PORT}/api/computer-use -H "Content-Type: application/json" -d '{"action":"click","x":100,"y":200}'
4. After each action, take another screenshot to verify the result
5. Continue until the task is complete
6. Report what you did

IMPORTANT: Use curl to call the APIs. The server is running on localhost:${PORT}.
Work step by step. Take screenshots between actions to see results.
For typing Portuguese/Spanish text, use "typewrite" action (uses clipboard).
To open programs: use hotkey "win+r", type the program name, press enter.
To open URLs: use Bash "start https://..." command directly.`;

  try {
    const proc = spawn(CLAUDE_CMD, [
      '--print', '--output-format', 'text',
      '--dangerously-skip-permissions'
    ], {
      cwd: JARVIS_DIR, env: process.env, shell: true
    });

    proc.stdin.write(prompt);
    proc.stdin.end();

    proc.stdout.on('data', data => {
      try { res.write(data); } catch {}
    });
    proc.stderr.on('data', data => {
      const msg = data.toString().trim();
      if (msg && !msg.includes('ExperimentalWarning')) {
        console.error('[FELIPE CU stderr]', msg);
      }
    });
    proc.on('close', code => {
      console.log(`[FELIPE] Computer-use task done (code ${code})`);
      notifyBuildComplete(task, 'Computer use task completed', language);
      try { res.end(); } catch {}
    });
    proc.on('error', err => {
      try { res.write(`[error] ${err.message}`); res.end(); } catch {}
    });

    setTimeout(() => { try { proc.kill(); } catch {} }, 120000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== DISABLE EXCEL AUTORECOVERY (prevents recovery panel on close) ==========
try {
  execSync('reg add "HKCU\\Software\\Microsoft\\Office\\16.0\\Excel\\Options" /v AutoRecoverEnabled /t REG_DWORD /d 0 /f', { stdio: 'ignore' });
} catch {}

// ========== START SERVER ==========
app.listen(PORT, () => {
  const chrome = findChrome();
  console.log('');
  console.log('  ==========================================');
  console.log('    F E L I P E   —   System Status');
  console.log('  ==========================================');
  console.log('');
  console.log(`  Server:     http://localhost:${PORT}`);
  console.log(`  Directory:  ${JARVIS_DIR}`);
  console.log(`  OpenAI:     ${openai ? '✅ Connected (Voice + TTS + STT)' : '❌ Not configured — voice disabled'}`);
  console.log(`  Claude CLI: ${cliExists ? '✅ Found — verifying auth in background...' : '❌ Not installed'}`);
  console.log(`  Chrome:     ${chrome ? '✅ ' + chrome : '⚠️  Using bundled Chromium'}`);
  console.log(`  Python:     ${fs.existsSync(PYTHON_CMD) ? '✅ Python 3.11' : '⚠️  Not found — Excel features disabled'}`);
  console.log('');
  if (!cliExists) {
    console.log('  ⚠️  WARNING: Claude Code CLI not found.');
    console.log('  ⚠️  Install: npm install -g @anthropic-ai/claude-code');
    console.log('  ⚠️  Then run: claude (to login)');
    console.log('');
  }
  if (!openai) {
    console.log('  ⚠️  WARNING: Voice is DISABLED.');
    console.log('  ⚠️  Add OPENAI_API_KEY to .env file.');
    console.log('');
  }
  console.log('  ✅ Server ready. Accepting requests.');
  console.log('');
  console.log('  ==========================================');
  console.log('');

  // Kick off async auth check AFTER server is listening (non-blocking)
  if (cliExists) {
    checkClaudeCliAuth().then(() => {
      if (claudeCliAvailable) {
        console.log('[FELIPE] ✅ Claude auth verified. Task execution ENABLED.');
        console.log(`[FELIPE] ✅ Pools: Opus×${pools.opus.pool.length} Sonnet×${pools.sonnet.pool.length} Haiku×${pools.haiku.pool.length}`);
      }
    });
  }
});
