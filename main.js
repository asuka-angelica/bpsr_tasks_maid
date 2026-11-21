'use strict';
// main.js — Electron メインプロセス（フェーズ0）
// データはローカルJSONのみ。外部送信は一切しない（ガーディアンと同じ原則）。
// レンダラーはカスタムスキーム maid:// で配信する（file:// の fetch 制限を避け、
// mesh-avatar ランタイムが .mavatar を fetch で読めるようにするため）。

const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const RENDERER_DIR = path.join(__dirname, 'renderer');
const APP_VERSION = (() => {
  try { return require('./package.json').version || 'unknown'; } catch { return 'unknown'; }
})();

protocol.registerSchemesAsPrivileged([
  { scheme: 'maid', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

let mainWindow = null;
let quitting = false;

process.on('uncaughtException', (err) => {
  try { console.error('[uncaughtException]', err); } catch { /* 終了はしない */ }
});
process.on('unhandledRejection', (reason) => {
  try { console.error('[unhandledRejection]', reason); } catch { /* 同上 */ }
});

function registerProtocol() {
  protocol.handle('maid', (request) => {
    try {
      const url = new URL(request.url);
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const filePath = path.join(RENDERER_DIR, rel || 'index.html');
      if (!filePath.startsWith(RENDERER_DIR)) {
        return new Response('forbidden', { status: 403 });
      }
      return net.fetch(pathToFileURL(filePath).toString());
    } catch (err) {
      console.error('[protocol]', err);
      return new Response('error', { status: 500 });
    }
  });
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!mainWindow.isVisible()) mainWindow.show();
    return mainWindow;
  }
  const win = new BrowserWindow({
    width: 1040,
    height: 680,
    minWidth: 880,
    minHeight: 560,
    title: 'スタレゾ日課メイド（仮称）',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow = win;
  win.loadURL('maid://app/index.html').catch((err) => console.error('[loadURL]', err));
  win.on('closed', () => { if (mainWindow === win) mainWindow = null; });
  return win;
}

// ---- 状態管理（正本は src/ の純粋モジュール＋ローカルJSON） ----
const { PRESETS } = require('./src/presets');
const { PERIOD_LABELS } = require('./src/cycles');
const { RESOURCE_DEFS } = require('./src/resources');
const lines = require('./src/lines');
const lifecycle = require('./src/lifecycle');
const store = require('./src/store');

let appState = null;
let advanceTimer = null;

function stateFilePath() {
  return path.join(app.getPath('userData'), 'data.json');
}

function save() {
  try { store.saveState(stateFilePath(), appState); } catch (err) { console.error('[save]', err); }
}

// 時間経過（周期リセット＋資源回復）を反映し、変化があれば保存して配る
function advanceAndSave() {
  if (!appState) return;
  const { state, events } = lifecycle.advanceState(appState, new Date());
  if (events.resetPeriods.length > 0 || events.recoveredDays > 0) {
    appState = state;
    save();
    broadcast();
  }
}

function snapshot() {
  return {
    appVersion: APP_VERSION,
    settings: appState.settings,
    checks: appState.checks,
    presets: PRESETS,
    periodLabels: PERIOD_LABELS,
    resources: { defs: RESOURCE_DEFS, values: appState.resources.values },
    lines: lines.forCharacter(appState.settings.character),
  };
}

function broadcast() {
  try {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('state-changed', snapshot());
    }
  } catch (err) {
    console.error('[broadcast]', err);
  }
}

ipcMain.handle('get-state', () => snapshot());

ipcMain.handle('toggle-check', (_e, { period, itemId }) => {
  appState = lifecycle.toggleCheck(appState, period, itemId);
  save();
  broadcast();
  return snapshot();
});

ipcMain.handle('adjust-resource', (_e, { id, delta }) => {
  appState = lifecycle.adjustResource(appState, id, delta);
  save();
  broadcast();
  return snapshot();
});

ipcMain.handle('set-address', (_e, value) => {
  if (value === 'ご主人様' || value === 'お嬢様') {
    appState = structuredClone(appState);
    appState.settings.address = value;
    save();
    broadcast();
  }
  return snapshot();
});

ipcMain.handle('set-character', (_e, value) => {
  if (value === 'momo' || value === 'suzuran' || value === 'mimoza') {
    appState = structuredClone(appState);
    appState.settings.character = value;
    save();
    broadcast();
  }
  return snapshot();
});

ipcMain.handle('set-notify', (_e, { itemId, value }) => {
  appState = structuredClone(appState);
  appState.settings.notify[itemId] = !!value;
  save();
  broadcast();
  return snapshot();
});

ipcMain.handle('set-anchor', (_e, value) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    appState = structuredClone(appState);
    appState.settings.biweeklyAnchor = String(value);
    // アンカーが変わったら隔週キーを計算し直す
    const { state } = lifecycle.advanceState(appState, new Date());
    appState = state;
    save();
    broadcast();
  }
  return snapshot();
});

app.whenReady().then(() => {
  appState = store.loadState(stateFilePath(), new Date());
  advanceAndSave();
  advanceTimer = setInterval(advanceAndSave, 30 * 1000);
  registerProtocol();
  createMainWindow();

  // スモーク確認用（MAID_SMOKE=1）: 読み込み後に画面を撮影して終了する。
  if (process.env.MAID_SMOKE === '1' && mainWindow) {
    const out = process.env.MAID_SMOKE_OUT || path.join(__dirname, 'smoke.png');
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const img = await mainWindow.webContents.capturePage();
          fs.writeFileSync(out, img.toPNG());
          console.log('[smoke] captured:', out);
        } catch (err) {
          console.error('[smoke]', err);
        }
        app.quit();
      }, Number(process.env.MAID_SMOKE_WAIT_MS || 4000));
    });
  }
});

app.on('window-all-closed', () => {
  if (!quitting) app.quit();
});
