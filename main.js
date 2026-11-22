'use strict';
// main.js — Electron メインプロセス（フェーズ0）
// データはローカルJSONのみ。外部送信は一切しない。
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

/* 配信先の解決（レビュー高3）：文字列の前方一致ではなく、リンク解決後の
 * 実パスがベース配下にあることを確認する。ファイルが無い場合も null。 */
function resolveWithinBase(base, rel) {
  let baseReal;
  try { baseReal = fs.realpathSync(base); } catch { return null; }
  const target = path.resolve(baseReal, rel);
  let real;
  try { real = fs.realpathSync(target); } catch { return null; }
  if (real !== baseReal && !real.startsWith(baseReal + path.sep)) return null;
  return real;
}

function registerProtocol() {
  protocol.handle('maid', (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'app') {
        return new Response('forbidden', { status: 403 });
      }
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      // ボイスパックは userData/voice/ から配信する（アプリ本体には含めない）
      if (rel.startsWith('voice/')) {
        const filePath = resolveWithinBase(voiceDirPath(), rel.slice('voice/'.length));
        if (!filePath) return new Response('not found', { status: 404 });
        return net.fetch(pathToFileURL(filePath).toString());
      }
      // ユーザー追加キャラの素材は userData/characters/ から配信する
      if (rel.startsWith('characters/')) {
        const filePath = resolveWithinBase(charactersDirPath(), rel.slice('characters/'.length));
        if (!filePath) return new Response('not found', { status: 404 });
        return net.fetch(pathToFileURL(filePath).toString());
      }
      const filePath = resolveWithinBase(RENDERER_DIR, rel || 'index.html');
      if (!filePath) return new Response('not found', { status: 404 });
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
      sandbox: true,
    },
  });
  mainWindow = win;
  // 遷移・新規ウィンドウの制限（レビュー高3）：自アプリ（maid://app/）の
  // 外へは一切遷移させず、ポップアップも開かない。
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('maid://app/')) e.preventDefault();
  });
  win.webContents.on('will-redirect', (e, url) => {
    if (!url.startsWith('maid://app/')) e.preventDefault();
  });
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
const { writeZip, readZip, ZIP_LIMITS } = require('./src/zip');

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

/* ---- IPC の信頼境界（レビュー高3） ----
 * ハンドラは「自アプリのメインフレームからの呼び出し」だけを受け付ける。
 * あわせて、ファイル選択ダイアログで実際に選ばれたパスをメイン側で記録し、
 * キャラ登録のコピー元をその記録に限定する（レンダラーが任意のパスを
 * 差し込んでもコピーできないようにする）。 */
const pickedFilePaths = new Set();

function isTrustedSender(event) {
  try {
    const frame = event && event.senderFrame;
    if (!frame || frame !== event.sender.mainFrame) return false;
    const u = new URL(frame.url);
    return u.protocol === 'maid:' && u.hostname === 'app';
  } catch {
    return false;
  }
}

function guard(handler, fallback) {
  return (event, ...args) => {
    if (!isTrustedSender(event)) {
      console.error('[ipc] 信頼できない送信元からの呼び出しを拒否しました');
      return fallback ? fallback() : snapshot();
    }
    return handler(event, ...args);
  };
}

ipcMain.handle('get-state', guard(() => snapshot()));

ipcMain.handle('set-dock-mode', guard((_e, mode) => {
  applyDockMode(mode);
  return snapshot();
}));

ipcMain.handle('quit-app', guard(() => {
  quitting = true;
  app.quit();
}));

ipcMain.handle('toggle-check', guard((_e, arg) => {
  const { period, itemId } = arg || {};
  if (!['daily', 'weekly', 'biweekly'].includes(period) || typeof itemId !== 'string') {
    return snapshot();
  }
  appState = lifecycle.toggleCheck(appState, period, itemId);
  save();
  broadcast();
  return snapshot();
}));

ipcMain.handle('adjust-resource', guard((_e, arg) => {
  const { id, delta } = arg || {};
  if (!RESOURCE_DEFS[id] || !Number.isFinite(delta) || Math.abs(delta) > 10000) {
    return snapshot();
  }
  appState = lifecycle.adjustResource(appState, id, delta);
  save();
  broadcast();
  return snapshot();
}));

ipcMain.handle('set-address', guard((_e, value) => {
  if (value === 'ご主人様' || value === 'お嬢様') {
    appState = structuredClone(appState);
    appState.settings.address = value;
    save();
    broadcast();
  }
  return snapshot();
}));

ipcMain.handle('set-show-agent', guard((_e, value) => {
  appState = structuredClone(appState);
  appState.settings.showAgent = !!value;
  save();
  broadcast();
  return snapshot();
}));

ipcMain.handle('set-voice-enabled', guard((_e, value) => {
  appState = structuredClone(appState);
  appState.settings.voiceEnabled = !!value;
  save();
  broadcast();
  return snapshot();
}));

ipcMain.handle('set-show-bubble', guard((_e, value) => {
  appState = structuredClone(appState);
  appState.settings.showBubble = !!value;
  save();
  broadcast();
  return snapshot();
}));

ipcMain.handle('set-character', guard((_e, value) => {
  const ids = resolvedCharacters().characters.map((c) => c.id);
  if (ids.includes(value)) {
    appState = structuredClone(appState);
    appState.settings.character = value;
    save();
    broadcast();
  }
  return snapshot();
}));

ipcMain.handle('set-character-address', guard((_e, arg) => {
  const { charId, value } = arg || {};
  const ids = resolvedCharacters().characters.map((c) => c.id);
  if (typeof charId === 'string' && ids.includes(charId) &&
      (value === null || value === undefined || (typeof value === 'string' && value.length <= 100))) {
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
}));

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

ipcMain.handle('pick-file', guard(async (_e, kind) => {
  const filters = PICK_FILTERS[kind] || PICK_FILTERS.any;
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters,
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  // 登録のコピー元を「実際にダイアログで選ばれたファイル」に限定するため記録する
  pickedFilePaths.add(path.resolve(res.filePaths[0]));
  return res.filePaths[0];
}, () => null));

function slugifyId(name) {
  const base = String(name || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || `char-${Date.now().toString(36)}`;
}

function uniqueCharacterId(base) {
  const existing = new Set(resolvedCharacters().characters.map((c) => c.id));
  const taken = (cand) => existing.has(cand) ||
    fs.existsSync(path.join(charactersDirPath(), cand));
  if (!taken(base)) return base;
  for (let n = 2; ; n++) {
    const cand = `${base}-${n}`;
    if (!taken(cand)) return cand;
  }
}

// 登録用に「ダイアログで選択済み」のパスだけを通す（レビュー高3）
function assertPickedFile(srcPath) {
  if (typeof srcPath !== 'string' || !pickedFilePaths.has(path.resolve(srcPath))) {
    throw new Error('ファイルは選択ダイアログから選んでください');
  }
}

ipcMain.handle('register-character', guard((_e, payload) => {
  // 一時フォルダで組み立てて検証し、確定時だけ本フォルダへ移す（レビュー中8：
  // 途中で失敗しても部分登録が残らないように）。
  let tmpDir = null;
  let finalDir = null;
  const copiedVoice = [];
  try {
    const p = payload || {};
    if (typeof p.name !== 'string' || p.name.trim() === '' || p.name.length > 100) {
      return { ok: false, error: '名前を入力してください（100文字まで）' };
    }
    if (!charactersModule.CHARACTER_TYPES.includes(p.type)) {
      return { ok: false, error: '表示形式が不正です' };
    }
    const id = uniqueCharacterId(slugifyId(p.name));
    const files = p.files || {};
    const baseDir = charactersDirPath();
    fs.mkdirSync(baseDir, { recursive: true });
    tmpDir = fs.mkdtempSync(path.join(baseDir, '.tmp-'));
    finalDir = path.join(baseDir, id);
    const copied = {};
    const copySlot = (slot, srcPath, keepName = false) => {
      if (!srcPath) return null;
      assertPickedFile(srcPath);
      const ext = path.extname(srcPath).toLowerCase();
      const destName = keepName ? path.basename(srcPath) : `${slot}${ext}`;
      fs.copyFileSync(srcPath, path.join(tmpDir, destName));
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
        assertPickedFile(extra);
        const destName = path.basename(extra);
        if (charactersModule.isSafeFileName(destName)) {
          fs.copyFileSync(extra, path.join(tmpDir, destName));
        }
      }
    }
    const errors = charactersModule.validateCharacterDef(def);
    if (errors.length > 0) {
      return { ok: false, error: errors.join('／') };
    }
    fs.writeFileSync(path.join(tmpDir, 'character.json'), JSON.stringify(def, null, 2), 'utf8');
    fs.renameSync(tmpDir, finalDir);
    tmpDir = null;
    // ボイス（任意）は voice/<id>/ へ同じ規約で置く。失敗したら登録自体を取り消す
    const voiceFiles = p.voiceFiles || {};
    for (const kind of ['greeting', 'praise', 'complete']) {
      if (voiceFiles[kind]) {
        assertPickedFile(voiceFiles[kind]);
        const ext = path.extname(voiceFiles[kind]).toLowerCase();
        if (['.mp3', '.wav'].includes(ext)) {
          const vDir = path.join(voiceDirPath(), id);
          fs.mkdirSync(vDir, { recursive: true });
          const dest = path.join(vDir, `${kind}${ext}`);
          fs.copyFileSync(voiceFiles[kind], dest);
          copiedVoice.push(dest);
        }
      }
    }
    broadcast();
    return { ok: true, id, state: snapshot() };
  } catch (err) {
    console.error('[register-character]', err);
    if (tmpDir) { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* 無視 */ } }
    if (finalDir) { try { fs.rmSync(finalDir, { recursive: true, force: true }); } catch { /* 無視 */ } }
    for (const f of copiedVoice) { try { fs.rmSync(f, { force: true }); } catch { /* 無視 */ } }
    return { ok: false, error: String(err && err.message || err) };
  }
}, () => ({ ok: false, error: '許可されていない呼び出しです' })));

ipcMain.handle('delete-character', guard((_e, charId) => {
  if (!charactersModule.isValidId(charId)) return snapshot();
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
}));

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

ipcMain.handle('export-character', guard(async (_e, charId) => {
  try {
    const chars = resolvedCharacters().characters;
    const def = chars.find((c) => c.id === charId);
    if (!def) return { ok: false, error: 'キャラが見つかりません' };
    // 定義だけ先に用意し、素材の読み込みは保存先が確定してから行う
    let exportDef;
    let assetDir;
    if (def.builtin) {
      exportDef = builtinExportDef(def);
      assetDir = path.join(RENDERER_DIR, 'assets');
    } else {
      assetDir = path.join(charactersDirPath(), charId);
      exportDef = JSON.parse(fs.readFileSync(path.join(assetDir, 'character.json'), 'utf8'));
    }
    const res = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${charId}.zip`,
      filters: [{ name: 'キャラクターパッケージ', extensions: ['zip'] }],
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    const fileData = charactersModule.referencedFiles(exportDef)
      .map((f) => ({ name: f, data: fs.readFileSync(path.join(assetDir, f)) }));
    if (!def.builtin && def.type === 'live2d') {
      // モデルが参照する同梱ファイルも可能な範囲で一緒に包む
      const known = new Set(fileData.map((f) => f.name));
      for (const f of fs.readdirSync(assetDir)) {
        if (f !== 'character.json' && !known.has(f) &&
            charactersModule.isSafeFileName(f) && fs.statSync(path.join(assetDir, f)).isFile()) {
          fileData.push({ name: f, data: fs.readFileSync(path.join(assetDir, f)) });
        }
      }
    }
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
}, () => ({ ok: false, error: '許可されていない呼び出しです' })));
ipcMain.handle('import-character', guard(async () => {
  // 一時フォルダで組み立ててから本フォルダへ移す（レビュー中8）。
  // 読み込み前にファイルサイズで弾き、展開は src/zip.js の上限で制限する（中7）。
  let tmpDir = null;
  try {
    const res = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'キャラクターパッケージ', extensions: ['zip'] }],
    });
    if (res.canceled || res.filePaths.length === 0) return { ok: false, canceled: true };
    const zipPath = res.filePaths[0];
    const st = fs.statSync(zipPath);
    if (st.size > ZIP_LIMITS.maxInputBytes) {
      return { ok: false, error: `パッケージが大きすぎます（上限 ${Math.floor(ZIP_LIMITS.maxInputBytes / 1024 / 1024)}MB）` };
    }
    const entries = readZip(fs.readFileSync(zipPath));
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
    const dir = path.join(charactersDirPath(), id);
    if (existing.has(id) || fs.existsSync(dir)) {
      return { ok: false, error: `同じID「${id}」のキャラが既に登録されています` };
    }
    const baseDir = charactersDirPath();
    fs.mkdirSync(baseDir, { recursive: true });
    tmpDir = fs.mkdtempSync(path.join(baseDir, '.tmp-'));
    for (const f of charactersModule.referencedFiles(def)) {
      const data = entries.get(prefix + f) || entries.get(f);
      if (!data) {
        return { ok: false, error: `素材ファイル ${f} がパッケージにありません` };
      }
      fs.writeFileSync(path.join(tmpDir, f), data);
    }
    if (def.type === 'live2d') {
      for (const [key, data] of entries) {
        if (!key.startsWith(prefix)) continue;
        const base = path.basename(key);
        if (base && base !== 'character.json' && charactersModule.isSafeFileName(base) &&
            !fs.existsSync(path.join(tmpDir, base))) {
          fs.writeFileSync(path.join(tmpDir, base), data);
        }
      }
    }
    fs.writeFileSync(path.join(tmpDir, 'character.json'),
      JSON.stringify({ ...def, id }, null, 2), 'utf8');
    fs.renameSync(tmpDir, dir);
    tmpDir = null;
    broadcast();
    return { ok: true, id, state: snapshot() };
  } catch (err) {
    console.error('[import-character]', err);
    return { ok: false, error: String(err && err.message || err) };
  } finally {
    if (tmpDir) { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* 無視 */ } }
  }
}, () => ({ ok: false, error: '許可されていない呼び出しです' })));

ipcMain.handle('set-notify', guard((_e, arg) => {
  const { itemId, value } = arg || {};
  const knownIds = new Set(Object.values(PRESETS).flat().map((it) => it.id));
  if (typeof itemId !== 'string' || !knownIds.has(itemId)) return snapshot();
  appState = structuredClone(appState);
  appState.settings.notify[itemId] = !!value;
  save();
  broadcast();
  return snapshot();
}));

ipcMain.handle('set-anchor', guard((_e, value) => {
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
}));

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
