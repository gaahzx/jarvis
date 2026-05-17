const { app, BrowserWindow, Menu, Tray, nativeImage, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let tray = null;
let serverProcess = null;
const PORT = 3000;
const SERVER_URL = `http://localhost:${PORT}`;

// Find node via nvm or system
function findNode() {
  const nvmNode = path.join(process.env.HOME || '/Users/' + require('os').userInfo().username, '.nvm/versions/node/v24.15.0/bin/node');
  const fs = require('fs');
  if (fs.existsSync(nvmNode)) return nvmNode;
  return process.execPath; // electron's bundled node
}

function startServer() {
  const node = findNode();
  const serverPath = path.join(__dirname, 'server.js');
  serverProcess = spawn(node, [serverPath], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe'
  });
  serverProcess.stdout.on('data', d => console.log('[server]', d.toString().trim()));
  serverProcess.stderr.on('data', d => console.error('[server]', d.toString().trim()));
  serverProcess.on('exit', (code) => console.log('[server] exited:', code));
}

function waitForServer(retries = 30) {
  return new Promise((resolve, reject) => {
    const check = (n) => {
      http.get(SERVER_URL + '/api/health', (res) => {
        if (res.statusCode === 200) resolve();
        else if (n > 0) setTimeout(() => check(n - 1), 1000);
        else reject(new Error('Server did not start'));
      }).on('error', () => {
        if (n > 0) setTimeout(() => check(n - 1), 1000);
        else reject(new Error('Server did not start'));
      });
    };
    check(retries);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#000914',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // allow mic/camera
    },
    title: 'JARVIS'
  });

  mainWindow.loadURL(SERVER_URL);

  // Grant microphone (and camera) permissions — required for getUserMedia in Electron
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    const allowed = ['media', 'microphone', 'audioCapture', 'clipboard-read'];
    callback(allowed.includes(permission));
  });
  mainWindow.webContents.session.setPermissionCheckHandler((_wc, permission) => {
    const allowed = ['media', 'microphone', 'audioCapture', 'clipboard-read'];
    return allowed.includes(permission);
  });

  // Open external links in browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin') {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const fs = require('fs');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('JARVIS');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir JARVIS', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    { label: 'Reiniciar servidor', click: () => {
      if (serverProcess) serverProcess.kill();
      setTimeout(startServer, 500);
    }},
    { type: 'separator' },
    { label: 'Sair', click: () => { app.quit(); } }
  ]));
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'JARVIS', submenu: [
      { label: 'Sobre JARVIS', role: 'about' },
      { type: 'separator' },
      { label: 'Ocultar', accelerator: 'Cmd+H', role: 'hide' },
      { type: 'separator' },
      { label: 'Sair', accelerator: 'Cmd+Q', click: () => app.quit() }
    ]},
    { label: 'Editar', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
    ]},
    { label: 'Visualizar', submenu: [
      { role: 'reload' }, { role: 'forceReload' },
      { type: 'separator' },
      { label: 'DevTools', accelerator: 'Cmd+Option+I', click: () => mainWindow?.webContents.toggleDevTools() },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]},
    { label: 'Janela', submenu: [
      { role: 'minimize' }, { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ]}
  ]));
}

app.whenReady().then(async () => {
  buildMenu();
  createTray();

  // Start the Express server
  startServer();

  // Show splash while waiting
  mainWindow = new BrowserWindow({
    width: 500, height: 300,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#000914',
    resizable: false,
    webPreferences: { nodeIntegration: false }
  });
  const splashHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:500px;height:300px;overflow:hidden;background:#000914;display:flex;align-items:center;justify-content:center;font-family:'Orbitron','Courier New',monospace}
    .corner{position:absolute;width:28px;height:28px;border-color:rgba(0,228,255,0.4);border-style:solid}
    .tl{top:14px;left:14px;border-width:2px 0 0 2px}
    .tr{top:14px;right:14px;border-width:2px 2px 0 0}
    .bl{bottom:14px;left:14px;border-width:0 0 2px 2px}
    .br{bottom:14px;right:14px;border-width:0 2px 2px 0}
    .center{display:flex;flex-direction:column;align-items:center;gap:14px}
    .reactor{width:60px;height:60px;border-radius:50%;border:2px solid rgba(0,228,255,0.6);box-shadow:0 0 18px 4px rgba(0,228,255,0.5),0 0 40px 8px rgba(0,228,255,0.2),inset 0 0 18px rgba(0,228,255,0.3);animation:pulse 1.8s ease-in-out infinite}
    @keyframes pulse{0%,100%{box-shadow:0 0 18px 4px rgba(0,228,255,0.5),0 0 40px 8px rgba(0,228,255,0.2),inset 0 0 18px rgba(0,228,255,0.3)}50%{box-shadow:0 0 28px 8px rgba(0,228,255,0.8),0 0 60px 14px rgba(0,228,255,0.35),inset 0 0 28px rgba(0,228,255,0.5)}}
    .title{color:#ffd700;font-size:28px;letter-spacing:10px;font-weight:900;text-shadow:0 0 12px rgba(255,215,0,0.6)}
    .rule-wrap{width:260px;height:1px;background:rgba(0,228,255,0.15);overflow:hidden}
    .rule{height:1px;background:linear-gradient(90deg,transparent,#00e4ff,transparent);width:0;animation:grow 1.2s ease-out 0.3s forwards}
    @keyframes grow{to{width:100%}}
    .boot{display:flex;flex-direction:column;gap:4px;font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;color:#00e4ff;letter-spacing:1px}
    .line{opacity:0;animation:fadein 0.4s ease forwards}
    .l1{animation-delay:0.6s}
    .l2{animation-delay:1.1s}
    .l3{animation-delay:1.6s}
    .l4{animation-delay:2.1s}
    @keyframes fadein{to{opacity:1}}
  </style></head><body>
    <div class="corner tl"></div>
    <div class="corner tr"></div>
    <div class="corner bl"></div>
    <div class="corner br"></div>
    <div class="center">
      <div class="reactor"></div>
      <div class="title">J.A.R.V.I.S.</div>
      <div class="rule-wrap"><div class="rule"></div></div>
      <div class="boot">
        <div class="line l1">NEURAL CORE ........... ONLINE</div>
        <div class="line l2">AUDIO SYSTEMS .......... OK</div>
        <div class="line l3">VOICE MODULE ......... READY</div>
        <div class="line l4">ALL SYSTEMS NOMINAL</div>
      </div>
    </div>
  </body></html>`;
  mainWindow.loadURL('data:text/html,' + encodeURIComponent(splashHtml));

  try {
    await waitForServer(40);
  } catch (e) {
    console.error('Server failed to start:', e.message);
  }

  mainWindow.close();
  createWindow();
});

app.on('activate', () => {
  if (mainWindow) mainWindow.show();
});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});

app.on('window-all-closed', () => {
  // macOS: keep running in dock/tray
  if (process.platform !== 'darwin') app.quit();
});
