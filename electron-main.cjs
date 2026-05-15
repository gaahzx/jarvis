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
  mainWindow.loadURL('data:text/html,<body style="margin:0;background:#000914;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Orbitron,sans-serif"><div style="text-align:center;color:#00d4ff"><div style="font-size:32px;letter-spacing:8px;font-weight:900">J A R V I S</div><div style="margin-top:16px;font-size:11px;letter-spacing:3px;color:#00ff88;animation:pulse 1s infinite">INICIANDO SISTEMAS...</div></div></body>');

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
