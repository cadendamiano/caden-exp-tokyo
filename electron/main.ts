import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { spawn, ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as http from 'node:http';
import Store from 'electron-store';
import getPort from 'get-port';
import { DevPasswordVerifier, AuthVerifier, User, Credentials } from './auth';

type AuthStore = {
  auth?: { token: string; userId: string };
};

const store = new Store<AuthStore>({ name: 'bill-coworker' });
const verifier: AuthVerifier = new DevPasswordVerifier();

let serverProcess: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;
let serverPort = 0;

function getSecretsPath(): string {
  const dir = path.join(app.getPath('userData'));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'secrets.json');
}

function resolveServerEntry(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', 'electron-next', 'server.js');
  }
  return path.join(__dirname, '..', 'electron-next', 'server.js');
}

function resolveServerCwd(): string {
  return path.dirname(resolveServerEntry());
}

async function startNextServer(): Promise<number> {
  const port = await getPort({ port: [3100, 3200, 3300] });
  const entry = resolveServerEntry();
  const cwd = resolveServerCwd();

  serverProcess = spawn(process.execPath, [entry], {
    cwd,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      COWORKER_SECRETS_PATH: getSecretsPath(),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout?.on('data', (chunk: Buffer) => {
    process.stdout.write(`[next] ${chunk.toString()}`);
  });
  serverProcess.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(`[next:err] ${chunk.toString()}`);
  });
  serverProcess.on('exit', (code) => {
    console.error(`[next] exited with code ${code}`);
  });

  await waitForServer(port);
  return port;
}

function waitForServer(port: number, attempts = 60, delayMs = 500): Promise<void> {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const tick = () => {
      tries += 1;
      const req = http.get({ host: '127.0.0.1', port, path: '/api/settings', timeout: 1000 }, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) return resolve();
        if (tries >= attempts) return reject(new Error(`server timeout (status ${res.statusCode})`));
        setTimeout(tick, delayMs);
      });
      req.on('error', () => {
        if (tries >= attempts) return reject(new Error('server timeout'));
        setTimeout(tick, delayMs);
      });
      req.on('timeout', () => {
        req.destroy();
        if (tries >= attempts) return reject(new Error('server timeout'));
        setTimeout(tick, delayMs);
      });
    };
    tick();
  });
}

async function getCurrentAuthState(): Promise<{ loggedIn: boolean; user: User | null }> {
  const auth = store.get('auth');
  if (!auth?.userId) return { loggedIn: false, user: null };
  const user = await verifier.getUserById(auth.userId);
  if (!user) {
    store.delete('auth');
    return { loggedIn: false, user: null };
  }
  return { loggedIn: true, user };
}

function broadcastAuthChange(state: { loggedIn: boolean; user: User | null }) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('auth-changed', state);
  }
}

async function loadInitialRoute(win: BrowserWindow) {
  const state = await getCurrentAuthState();
  const route = state.loggedIn ? '/' : '/login';
  await win.loadURL(`http://127.0.0.1:${serverPort}${route}`);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 920,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 14 },
    vibrancy: 'sidebar',
    backgroundColor: '#FAFAF7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  await loadInitialRoute(mainWindow);
}

function registerIpc() {
  ipcMain.handle('get-auth-state', async () => getCurrentAuthState());

  ipcMain.handle('login', async (_evt, credentials: Credentials) => {
    const user = await verifier.verify(credentials);
    if (!user) return { ok: false, error: 'Invalid password' };
    const token = randomBytes(24).toString('hex');
    store.set('auth', { token, userId: user.id });
    broadcastAuthChange({ loggedIn: true, user });
    return { ok: true, user };
  });

  ipcMain.handle('logout', async () => {
    store.delete('auth');
    broadcastAuthChange({ loggedIn: false, user: null });
    if (mainWindow) await mainWindow.loadURL(`http://127.0.0.1:${serverPort}/login`);
  });

  ipcMain.handle('export-template', async (_evt, data: object) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export template',
      defaultPath: 'coworker-template.json',
      filters: [{ name: 'Coworker Template', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { ok: false };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, path: filePath };
  });

  ipcMain.handle('import-template', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import template',
      filters: [{ name: 'Coworker Template', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths[0]) return { ok: false };
    const raw = fs.readFileSync(filePaths[0], 'utf8');
    return { ok: true, data: JSON.parse(raw) };
  });
}

app.whenReady().then(async () => {
  registerIpc();
  serverPort = await startNextServer();
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
    serverProcess = null;
  }
});
