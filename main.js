'use strict';
// main.js — Electron メインプロセス（フェーズ0）
// データはローカルJSONのみ。外部送信は一切しない（ガーディアンと同じ原則）。
// レンダラーはカスタムスキーム maid:// で配信する（file:// の制限を避け、
// キャラ動画をストリーミング再生できるようにするため）。

const { app, BrowserWindow, ipcMain, protocol, net, screen, dialog } = require('electron');
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
      // ボイスパックは userData/voice/ から配信する（アプリ本体には含めない）
      if (rel.startsWith('voice/')) {
        const base = voiceDirPath();
        const filePath = path.join(base, rel.slice('voice/'.length));
        if (!filePath.startsWith(base)) {
          return new Response('forbidden', { status: 403 });
        }
        return net.fetch(pathToFileURL(filePath).toString());
      }
      // ユーザー追加キャラの素材は userData/characters/ から配信する
      if (rel.startsWith('characters/')) {
        const base = charactersDirPath();
        const filePath = path.join(base, rel.slice('characters/'.length));
        if (!filePath.startsWith(base)) {
          return new Response('forbidden', { status: 403 });
        }
        return net.fetch(pathToFileURL(filePath).toString());
      }
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

// ---- 右端ドックの3態（レイアウトイメージ正本） ----
// 最小化＝アイコンのみ／待機（ミニ）＝細い縦バー（キャラは SD）／展開＝メインパネル。
// ウィンドウはフレームレスで画面右端に貼り付き、大きさと位置はモードごとに
// メインプロセスが決める（レンダラーはモード切替を依頼するだけ）。
const DOCK_SIZE = {
  expanded: { width: 1040, height: 680 },
  mini: { width: 116, height: 600 },
  minimized: { width: 60, height: 60 },
};
let dockMode = 'expanded';

// モードごとの bounds（右端に貼り付け、縦は作業領域の中央）
function dockBounds(mode) {
  const wa = screen.getPrimaryDisplay().workArea;
  let { width, height } = DOCK_SIZE[mode] || DOCK_SIZE.expanded;
  width = Math.min(width, wa.width);
  height = Math.min(height, wa.height);
  return {
    x: wa.x + wa.width - width,
    y: wa.y + Math.round((wa.height - height) / 2),
    width,
    height,
  };
}

function applyDockMode(mode, { persist = true } = {}) {
  if (!lifecycle.DOCK_MODES.includes(mode)) return;
  dockMode = mode;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBounds(dockBounds(mode));
  }
  if (persist && appState) {
    appState = structuredClone(appState);
    appState.settings.dockMode = mode;
    save();
  }
  broadcast();
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!mainWindow.isVisible()) mainWindow.show();
    return mainWindow;
  }
  // 初期モードは保存済み設定から復元する。スモーク確認では
  // MAID_SMOKE_DOCK でモードを、MAID_SMOKE_WIDTH/HEIGHT で展開時の大きさを差し替えられる
  dockMode = (appState && appState.settings.dockMode) || 'expanded';
  if (process.env.MAID_SMOKE === '1' && lifecycle.DOCK_MODES.includes(process.env.MAID_SMOKE_DOCK)) {
    dockMode = process.env.MAID_SMOKE_DOCK;
  }
  const bounds = dockBounds(dockMode);
  if (process.env.MAID_SMOKE === '1' && dockMode === 'expanded') {
    const smokeW = Number(process.env.MAID_SMOKE_WIDTH || 0);
    const smokeH = Number(process.env.MAID_SMOKE_HEIGHT || 0);
    if (smokeW > 0) bounds.width = smokeW;
    if (smokeH > 0) bounds.height = smokeH;
  }
  const win = new BrowserWindow({
    ...bounds,
    frame: false,
    resizable: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
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
const { RESOURCE_DEFS, overflowInfo } = require('./src/resources');
const lines = require('./src/lines');
const lifecycle = require('./src/lifecycle');
const store = require('./src/store');
const { voiceDir, scanVoicePack } = require('./src/voice');
const charactersModule = require('./src/characters');
const { writeZip, readZip } = require('./src/zip');

function voiceDirPath() {
  return voiceDir(app.getPath('userData'));
}

function charactersDirPath() {
  return path.join(app.getPath('userData'), 'characters');
}

// 登録済みキャラ（組み込み＋ユーザー追加）を解決する。毎回走査するので、
// フォルダを置いた直後や登録直後でも再起動なしに反映される。
function resolvedCharacters() {
  return charactersModule.allCharacters(charactersDirPath());
}

function currentCharacterDef(chars) {
  const list = chars || resolvedCharacters().characters;
  return list.find((c) => c.id === appState.settings.character) || list[0];
}

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
  // ボイスパックとキャラは毎回走査する（起動後に追加されても検出できるように）
  const chars = resolvedCharacters();
  const currentDef = currentCharacterDef(chars.characters);
  const voice = scanVoicePack(voiceDirPath(), chars.characters.map((c) => c.id));
  return {
    appVersion: APP_VERSION,
    dockMode,
    voiceAvailable: voice.available,
    voiceFiles: voice.files,
    characters: chars.characters,
    characterErrors: chars.errors,
    address: charactersModule.resolveAddress(currentDef, appState.settings),
    settings: appState.settings,
    checks: appState.checks,
    presets: PRESETS,
    periodLabels: PERIOD_LABELS,
    resources: {
      defs: RESOURCE_DEFS,
      values: appState.resources.values,
      overflow: Object.fromEntries(
        Object.keys(RESOURCE_DEFS).map((id) => [id, overflowInfo(appState.resources.values, id)]),
      ),
    },
    lines: currentDef.builtin
      ? lines.forCharacter(currentDef.id)
      : (currentDef.lines || lines.forCharacter('momo')),
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

ipcMain.handle('set-dock-mode', (_e, mode) => {
  applyDockMode(mode);
  return snapshot();
});

ipcMain.handle('quit-app', () => {
  quitting = true;
  app.quit();
});

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

ipcMain.handle('set-show-agent', (_e, value) => {
  appState = structuredClone(appState);
  appState.settings.showAgent = !!value;
  save();
  broadcast();
  return snapshot();
});

ipcMain.handle('set-voice-enabled', (_e, value) => {
  appState = structuredClone(appState);
  appState.settings.voiceEnabled = !!value;
  save();
  broadcast();
  return snapshot();
});

ipcMain.handle('set-show-bubble', (_e, value) => {
  appState = structuredClone(appState);
  appState.settings.showBubble = !!value;
  save();
  broadcast();
  return snapshot();
});

ipcMain.handle('set-character', (_e, value) => {
  const ids = resolvedCharacters().characters.map((c) => c.id);
  if (ids.includes(value)) {
    appState = structuredClone(appState);
    appState.settings.character = value;
    save();
    broadcast();
  }
  return snapshot();
});

ipcMain.handle('set-character-address', (_e, { charId, value }) => {
  const ids = resolvedCharacters().characters.map((c) => c.id);
  if (ids.includes(charId)) {
    appState = structuredClone(appState);
    if (!appState.settings.characterAddress) appState.settings.characterAddress = {};
    if (typeof value === 'string' && value) {
      appState.settings.characterAddress[charId] = value;
    } else {
      delete appState.settings.characterAddress[charId];
    }
    save();
    broadcast();
  }
  return snapshot();
});

/* ---- キャラ登録・パッケージ（v0.7.0） ----
 * 登録は「キャラフォルダ＋character.json」を userData/characters/<id>/ に作る。
 * パッケージは character.json＋素材一式の zip（src/zip.js）。 */
const PICK_FILTERS = {
  video: [{ name: '動画（mp4 / webm）', extensions: ['mp4', 'webm'] }],
  image: [{ name: '画像（png / jpg / webp）', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
  audio: [{ name: '音声（mp3 / wav）', extensions: ['mp3', 'wav'] }],
  model: [{ name: 'Live2D モデル（model3.json）', extensions: ['json'] }],
  any: [{ name: 'すべてのファイル', extensions: ['*'] }],
};

ipcMain.handle('pick-file', async (_e, kind) => {
  const filters = PICK_FILTERS[kind] || PICK_FILTERS.any;
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters,
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

function slugifyId(name) {
  const base = String(name || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || `char-${Date.now().toString(36)}`;
}

function uniqueCharacterId(base) {
  const existing = new Set(resolvedCharacters().characters.map((c) => c.id));
  if (!existing.has(base)) return base;
  for (let n = 2; ; n++) {
    const cand = `${base}-${n}`;
    if (!existing.has(cand)) return cand;
  }
}

ipcMain.handle('register-character', (_e, payload) => {
  try {
    const p = payload || {};
    const id = uniqueCharacterId(slugifyId(p.name));
    const files = p.files || {};
    const dir = path.join(charactersDirPath(), id);
    fs.mkdirSync(dir, { recursive: true });
    const copied = {};
    const copySlot = (slot, srcPath, keepName = false) => {
      if (!srcPath) return null;
      const ext = path.extname(srcPath).toLowerCase();
      const destName = keepName ? path.basename(srcPath) : `${slot}${ext}`;
      fs.copyFileSync(srcPath, path.join(dir, destName));
      copied[slot] = destName;
      return destName;
    };
    const def = {
      id,
      name: String(p.name || '').trim(),
      type: p.type,
      lines: p.lines,
    };
    if (Array.isArray(p.addressCandidates) && p.addressCandidates.length > 0) {
      def.address = { candidates: p.addressCandidates };
      if (p.addressDefault) def.address.default = p.addressDefault;
    }
    if (p.type === 'video') {
      def.clips = {};
      for (const slot of ['idle', 'greeting', 'praise', 'sdIdle', 'sdJump']) {
        const dest = copySlot(slot, files[slot]);
        if (dest) def.clips[slot] = dest;
      }
    } else if (p.type === 'image') {
      def.images = {};
      for (const slot of ['idle', 'greeting', 'praise', 'complete', 'sdIdle', 'sdJump']) {
        const dest = copySlot(slot, files[slot]);
        if (dest) def.images[slot] = dest;
      }
    } else if (p.type === 'live2d') {
      const dest = copySlot('model', files.model, true);
      if (dest) def.model = dest;
      for (const extra of files.extras || []) {
        const destName = path.basename(extra);
        if (charactersModule.isSafeFileName(destName)) {
          fs.copyFileSync(extra, path.join(dir, destName));
        }
      }
    }
    const errors = charactersModule.validateCharacterDef(def);
    if (errors.length > 0) {
      fs.rmSync(dir, { recursive: true, force: true });
      return { ok: false, error: errors.join('／') };
    }
    fs.writeFileSync(path.join(dir, 'character.json'), JSON.stringify(def, null, 2), 'utf8');
    // ボイス（任意）は voice/<id>/ へ同じ規約で置く
    const voiceFiles = p.voiceFiles || {};
    for (const kind of ['greeting', 'praise', 'complete']) {
      if (voiceFiles[kind]) {
        const ext = path.extname(voiceFiles[kind]).toLowerCase();
        if (['.mp3', '.wav'].includes(ext)) {
          const vDir = path.join(voiceDirPath(), id);
          fs.mkdirSync(vDir, { recursive: true });
          fs.copyFileSync(voiceFiles[kind], path.join(vDir, `${kind}${ext}`));
        }
      }
    }
    broadcast();
    return { ok: true, id, state: snapshot() };
  } catch (err) {
    console.error('[register-character]', err);
    return { ok: false, error: String(err && err.message || err) };
  }
});

ipcMain.handle('delete-character', (_e, charId) => {
  const target = resolvedCharacters().characters.find((c) => c.id === charId);
  if (target && !target.builtin) {
    fs.rmSync(path.join(charactersDirPath(), charId), { recursive: true, force: true });
    if (appState.settings.character === charId) {
      appState = structuredClone(appState);
      appState.settings.character = 'momo';
      save();
    }
    broadcast();
  }
  return snapshot();
});

function builtinExportDef(def) {
  const flat = {};
  for (const form of ['full', 'sd']) {
    for (const [kind, p] of Object.entries(def.clips[form])) {
      if (!p) continue;
      const key = form === 'sd' ? (kind === 'praise' ? 'sdJump' : 'sdIdle') : kind;
      flat[key] = path.basename(p);
    }
  }
  return {
    id: def.id, name: def.name, type: 'video',
    clips: flat, lines: lines.forCharacter(def.id),
  };
}

ipcMain.handle('export-character', async (_e, charId) => {
  try {
    const chars = resolvedCharacters().characters;
    const def = chars.find((c) => c.id === charId);
    if (!def) return { ok: false, error: 'キャラが見つかりません' };
    let exportDef;
    let fileData;
    if (def.builtin) {
      exportDef = builtinExportDef(def);
      fileData = charactersModule.referencedFiles(exportDef)
        .map((f) => ({
          name: f,
          data: fs.readFileSync(path.join(RENDERER_DIR, 'assets', f)),
        }));
    } else {
      const dir = path.join(charactersDirPath(), charId);
      exportDef = JSON.parse(fs.readFileSync(path.join(dir, 'character.json'), 'utf8'));
      fileData = charactersModule.referencedFiles(exportDef)
        .map((f) => ({ name: f, data: fs.readFileSync(path.join(dir, f)) }));
      if (def.type === 'live2d') {
        // モデルが参照する同梱ファイルも可能な範囲で一緒に包む
        const known = new Set(fileData.map((f) => f.name));
        for (const f of fs.readdirSync(dir)) {
          if (f !== 'character.json' && !known.has(f) &&
              charactersModule.isSafeFileName(f) && fs.statSync(path.join(dir, f)).isFile()) {
            fileData.push({ name: f, data: fs.readFileSync(path.join(dir, f)) });
          }
        }
      }
    }
    const res = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${charId}.zip`,
      filters: [{ name: 'キャラクターパッケージ', extensions: ['zip'] }],
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    const zip = writeZip([
      { name: 'character.json', data: Buffer.from(JSON.stringify(exportDef, null, 2), 'utf8') },
      ...fileData,
    ]);
    fs.writeFileSync(res.filePath, zip);
    return { ok: true, path: res.filePath };
  } catch (err) {
    console.error('[export-character]', err);
    return { ok: false, error: String(err && err.message || err) };
  }
});

ipcMain.handle('import-character', async () => {
  try {
    const res = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'キャラクターパッケージ', extensions: ['zip'] }],
    });
    if (res.canceled || res.filePaths.length === 0) return { ok: false, canceled: true };
    const entries = readZip(fs.readFileSync(res.filePaths[0]));
    let prefix = '';
    let defRaw = entries.get('character.json');
    if (!defRaw) {
      for (const key of entries.keys()) {
        if (key.endsWith('/character.json')) {
          prefix = key.slice(0, key.length - 'character.json'.length);
          defRaw = entries.get(key);
          break;
        }
      }
    }
    if (!defRaw) return { ok: false, error: 'character.json がパッケージにありません' };
    const def = JSON.parse(defRaw.toString('utf8'));
    const errors = charactersModule.validateCharacterDef(def);
    if (errors.length > 0) return { ok: false, error: errors.join('／') };
    const id = charactersModule.isValidId(def.id) ? def.id : slugifyId(def.name);
    const existing = new Set(resolvedCharacters().characters.map((c) => c.id));
    if (existing.has(id)) {
      return { ok: false, error: `同じID「${id}」のキャラが既に登録されています` };
    }
    const dir = path.join(charactersDirPath(), id);
    fs.mkdirSync(dir, { recursive: true });
    for (const f of charactersModule.referencedFiles(def)) {
      const data = entries.get(prefix + f) || entries.get(f);
      if (!data) {
        fs.rmSync(dir, { recursive: true, force: true });
        return { ok: false, error: `素材ファイル ${f} がパッケージにありません` };
      }
      fs.writeFileSync(path.join(dir, f), data);
    }
    if (def.type === 'live2d') {
      for (const [key, data] of entries) {
        if (!key.startsWith(prefix)) continue;
        const base = path.basename(key);
        if (base && base !== 'character.json' && charactersModule.isSafeFileName(base) &&
            !fs.existsSync(path.join(dir, base))) {
          fs.writeFileSync(path.join(dir, base), data);
        }
      }
    }
    fs.writeFileSync(path.join(dir, 'character.json'),
      JSON.stringify({ ...def, id }, null, 2), 'utf8');
    broadcast();
    return { ok: true, id, state: snapshot() };
  } catch (err) {
    console.error('[import-character]', err);
    return { ok: false, error: String(err && err.message || err) };
  }
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
          if (process.env.MAID_SMOKE_SETTINGS === '1') {
            await mainWindow.webContents.executeJavaScript(
              "document.getElementById('settings-overlay').classList.remove('hidden')",
            );
            await new Promise((r) => setTimeout(r, 600));
          }
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
