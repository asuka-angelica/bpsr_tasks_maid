'use strict';
/* renderer.js — 画面の描画と操作（フェーズ0）
 * 状態の正本はメインプロセス側（window.maid 経由で取得／更新する）。
 * このファイルは「状態を受け取って描く」ことだけを行う。
 * 各機能（チェックリスト／数値／キャラ／設定）の描画は同ファイル内の
 * render* 関数が担い、機能ブランチごとに中身が入る。 */

let state = null;
let activePeriod = 'daily';

async function refresh() {
  state = await window.maid.getState();
  render();
}

function render() {
  if (!state) return;
  document.getElementById('app-version').textContent = state.appVersion ? `v${state.appVersion}` : '';
  document.body.dataset.dock = dockMode();
  renderChecklist();
  renderResources();
  layoutForAgent();
  renderCharacter();
  const bubble = document.getElementById('bubble');
  if (bubble) bubble.style.display = bubbleEnabled() ? '' : 'none';
  renderMini();
  // 表示オフでは動画キャッシュを失効させ、鳴っているボイスも止める（レビュー中4・中6）
  if (!agentEnabled()) mediaCache.evictAll();
  if (!agentEnabled() || !voiceEnabled()) stopVoice();
  pruneMediaCache();
  renderSettings();
  renderFirstRun();
  // ミニから設定ボタンで展開した時は、展開が済んでから設定を開く
  if (pendingOpenSettings && dockMode() === 'expanded') {
    pendingOpenSettings = false;
    document.getElementById('settings-overlay').classList.remove('hidden');
  }
}

/* ---- 右端ドックの3態（feat/dock-states） ----
 * 状態の正本はメインプロセス（ウィンドウの大きさ・位置もメインが決める）。
 * ここでは snapshot の dockMode に合わせて3つのビューを切り替え、
 * ミニ表示の SD クリップとバッジを描く。 */
let pendingOpenSettings = false;

function dockMode() {
  return (state && state.dockMode) || 'expanded';
}

async function setDock(mode) {
  state = await window.maid.setDockMode(mode);
  render();
}

// ミニ表示：SD クリップ（待機ループ／喜ぶ場面はジャンプ）＋残り件数バッジ。
// エージェント表示オフの時はキャラを出さず、アイコンボタンだけのバーになる。
let miniVideo = null;
let miniClipKind = 'idle';
let miniCharacter = null;
let miniDisplayType = null; // ミニ表示中の形式（キャラ・形式が変わったら作り替える）
// メイン表示と同じく、切替の直列化と段階復帰で割り込みエラーを防ぐ
let miniInFlight = false;
let pendingMiniKind = null;
let miniRetryUsed = false;
let miniCurrentClipPath = null; // 設定済み（または適用中）の論理パス

/* クリップは一度 fetch して Blob URL 化してから再生する（不具合2の根本対策）。
 * カスタムスキーム越しのストリーミング再生は、切替で読み込みが割り込まれると
 * デマルチプレクサを開けず MEDIA_ERR_SRC_NOT_SUPPORTED になることがあるため、
 * 割り込まれる読み込み自体を無くす。Blob はメモリ読みなので切替・シーク・
 * ループが割り込みの影響を受けない。
 * 保持は mediacache.js が担う（レビュー中4）：バイト上限付きで古いものから
 * 退避し、キャラの削除・置換・表示オフでは失効させる。 */
const mediaCache = window.MediaCache.createMediaCache({
  maxBytes: 32 * 1024 * 1024,
  fetchBlob: (path, signal) => fetch(path, { signal })
    .then((r) => { if (!r.ok) throw new Error('fetch failed'); return r.blob(); }),
  makeUrl: (b) => URL.createObjectURL(b),
  revokeUrl: (u) => URL.revokeObjectURL(u),
  onSettled: () => { flushPendingClip(false); flushPendingMiniClip(false); },
});

function protectedMediaPaths() {
  return new Set([currentClipPath, miniCurrentClipPath].filter(Boolean));
}

function resolveMediaSrc(path) {
  return mediaCache.resolve(path, protectedMediaPaths());
}

// 論理パスから持ち主のキャラ ID を推定する（キャッシュの失効判定用）。
// ファイル名の接頭辞とキャラ ID は一致するとは限らない（例：ミモザのキャラ ID は
// 'mimoza' だがクリップのファイル名は 'mimosa-*.mp4'）。接頭辞で推定すると
// 実在しないキャラの所有と誤判定して、再生中のキャラの取得まで破棄してしまう
// （v0.7.2 実機：ミモザ選択時に挨拶クリップが一切表示されなかった原因）。
// そのため、キャラ定義が実際に参照しているクリップパスと突き合わせて判定し、
// どの定義にも属さないパスは「持ち主不明」として破棄対象から外す。
function mediaPathOwner(p) {
  const m = /characters\/([a-z0-9-]+)\//.exec(p);
  if (m) return m[1];
  const list = (state && state.characters) || [];
  for (const c of list) {
    const sets = c.clips || {};
    for (const form of Object.values(sets)) {
      if (form && Object.values(form).includes(p)) return c.id;
    }
  }
  return null;
}

// 存在しないキャラのキャッシュを落とし、上限を効かせる（描画のたびに軽く確認）
function pruneMediaCache() {
  const ids = new Set(((state && state.characters) || []).map((c) => c.id));
  mediaCache.evictWhere((p) => {
    const owner = mediaPathOwner(p);
    return owner && !ids.has(owner);
  });
  mediaCache.enforceCap(protectedMediaPaths());
}

/* 非表示側のメディアが後から再生を始めないための世代カウンタ（レビュー中6）。
 * ドック切替・キャラ切替・表示オフで進み、非同期完了（Blob 取得・canplay・
 * 遅延リトライ）は、世代と表示状態と現在のキャラを照合してから再生する。 */
let mediaEpoch = 0;

function mainClipActive() {
  return agentEnabled() && dockMode() === 'expanded';
}
function miniClipActive() {
  return agentEnabled() && dockMode() === 'mini';
}

/* クリップの先頭フレームには生成時の白背景フレームが1枚だけ混ざっている
 * ことがある（v0.7.2 の褒め・挨拶・SDジャンプで実測）。そのまま 0 秒から
 * 再生すると、チェックや切替の瞬間に白がちらつく。再生開始位置を
 * 1フレーム分（24fps で約0.042秒）より先に置き、そのフレームを表示しない。
 * あわせて、切替の合間に要素が無地になる瞬間は styles.css 側でステージと
 * 同じ濃い紫（--panel-solid）を敷き、白い無地が挟まらないようにする。 */
const CLIP_START_SKIP_SEC = 0.06;

function applyMiniClip(kind, { force = false } = {}) {
  if (!miniVideo || !miniClipActive()) return;
  const sd = miniClips();
  miniClipKind = sd[kind] ? kind : 'idle';
  const path = sd[miniClipKind];
  miniVideo.loop = miniClipKind === 'idle';
  const url = resolveMediaSrc(path);
  if (!url) {
    pendingMiniKind = miniClipKind; // Blob が届いたら flush 側で適用する
    return;
  }
  if (force) {
    miniVideo.removeAttribute('src');
    try { miniVideo.load(); } catch { /* 無視 */ }
    miniCurrentClipPath = null;
  }
  if (miniCurrentClipPath !== path) {
    miniVideo.setAttribute('src', url);
    miniCurrentClipPath = path;
    miniInFlight = true;
  }
  try { miniVideo.currentTime = CLIP_START_SKIP_SEC; } catch { /* メタデータ未読込時は無視 */ }
  const p = miniVideo.play();
  if (p && typeof p.catch === 'function') p.catch(() => { /* 自動再生不可の環境では静止画のまま */ });
}

function playMiniClip(kind) {
  if (!miniVideo || !miniClipActive()) return;
  const sd = miniClips();
  const want = sd[kind] ? kind : 'idle';
  const action = window.ClipGuard.nextAction({
    currentSrc: miniCurrentClipPath,
    requestedSrc: sd[want],
    inFlight: miniInFlight,
    readyState: miniVideo.readyState,
  });
  if (action === 'switch') {
    pendingMiniKind = null;
    applyMiniClip(want);
  } else if (action === 'defer') {
    pendingMiniKind = want;
  } else if (action === 'restart') {
    if (want !== 'idle') applyMiniClip(want);
    else if (miniVideo.paused) { const p = miniVideo.play(); if (p && p.catch) p.catch(() => {}); }
  } else if (miniVideo.paused && !miniInFlight) {
    const p = miniVideo.play();
    if (p && typeof p.catch === 'function') p.catch(() => { /* 同上 */ });
  }
}

// settled=true は canplay（読み込みが落ち着いた）からの flush。
// settled=false は Blob 取得完了からの flush で、別の読み込みが進行中なら
// 保留を維持する（割り込みを作らない）。
function flushPendingMiniClip(settled) {
  if (!miniVideo || !pendingMiniKind) {
    if (settled) miniInFlight = false;
    return;
  }
  // 非表示の間に届いた完了は、再生を始めずに保留を捨てる（レビュー中6）
  if (!miniClipActive()) {
    pendingMiniKind = null;
    miniInFlight = false;
    return;
  }
  if (miniInFlight && !settled) return;
  miniInFlight = false;
  const kind = pendingMiniKind;
  pendingMiniKind = null;
  const sd = miniClips();
  if (miniCurrentClipPath !== (sd[kind] || sd.idle)) applyMiniClip(kind);
}

function onMiniVideoError(wrap) {
  const action = window.ClipGuard.errorAction({
    hasPending: !!pendingMiniKind,
    retryUsed: miniRetryUsed,
  });
  if (action === 'apply-pending') {
    miniInFlight = false;
    const kind = pendingMiniKind;
    pendingMiniKind = null;
    applyMiniClip(kind, { force: true });
    return;
  }
  if (action === 'retry') {
    miniRetryUsed = true;
    miniInFlight = false;
    const kind = miniClipKind;
    const epoch = mediaEpoch;
    setTimeout(() => {
      if (miniVideo && epoch === mediaEpoch && miniClipActive()) applyMiniClip(kind, { force: true });
    }, 350);
    return;
  }
  // キャラ名は常に textContent で描画する（innerHTML へ埋め込まない、レビュー高3）
  wrap.innerHTML = '';
  const ph = document.createElement('div');
  ph.className = 'avatar-placeholder';
  ph.textContent = currentCharacterLabel();
  wrap.appendChild(ph);
  miniVideo = null;
  miniInFlight = false;
  pendingMiniKind = null;
  miniRetryUsed = false;
  miniCurrentClipPath = null;
}

// ミニ側を非表示にする時は、止めるだけでなくソースを外し、保留中の
// 切替も捨てる（後から非同期完了が再生を再開しないように、レビュー中6）。
function stopMiniCharacter() {
  // 世代は「止めるものがある時」だけ進める（描画のたびに進むと正規のリトライまで巻き込む）
  if (miniCurrentClipPath || pendingMiniKind || miniInFlight) mediaEpoch++;
  if (miniVideo) {
    try { miniVideo.pause(); } catch { /* 無視 */ }
    miniVideo.removeAttribute('src');
    try { miniVideo.load(); } catch { /* 無視 */ }
  }
  miniInFlight = false;
  pendingMiniKind = null;
  miniCurrentClipPath = null;
}

function renderMini() {
  const wrap = document.getElementById('mini-char');
  const badge = document.getElementById('mini-badge');
  if (badge && state && state.presets) {
    const total = PERIODS.reduce((n, p) => n + remainingOf(p), 0);
    badge.textContent = String(total);
    badge.classList.toggle('hidden', total === 0);
  }
  if (!wrap) return;
  if (dockMode() !== 'mini' || !agentEnabled()) {
    wrap.style.display = 'none';
    stopMiniCharacter();
    return;
  }
  wrap.style.display = '';
  wrap.title = currentCharacterLabel();
  // キャラが切り替わっていたら、ミニ表示も新しいキャラのものへ作り替える。
  // 表示形式（立ち絵／動画）が切り替わった時も同様に作り替える。
  if (miniCharacter !== currentCharacterId() || miniDisplayType !== displayType()) {
    miniDisplayType = displayType();
    mediaEpoch++; // 前キャラ向けの非同期完了を無効化する
    miniVideo = null;
    miniImgEl = null;
    miniLive2dEl = null;
    miniInFlight = false;
    pendingMiniKind = null;
    miniRetryUsed = false;
    miniCurrentClipPath = null;
    if (miniImgTimer) { clearTimeout(miniImgTimer); miniImgTimer = null; }
    wrap.innerHTML = '';
  }
  const miniType = displayType();
  if (miniType === 'image') { renderMiniImage(wrap); return; }
  if (miniType === 'live2d') { renderMiniLive2d(wrap); return; }
  if (!miniVideo) {
    miniCharacter = currentCharacterId();
    wrap.innerHTML = '';
    miniVideo = document.createElement('video');
    miniVideo.id = 'mini-video';
    miniVideo.muted = true;
    miniVideo.autoplay = true;
    miniVideo.playsInline = true;
    miniVideo.setAttribute('aria-label', `${currentCharacterLabel()}（SD）`);
    miniVideo.addEventListener('ended', () => {
      if (miniClipKind !== 'idle') playMiniClip('idle');
    });
    miniVideo.addEventListener('canplay', () => { miniRetryUsed = false; flushPendingMiniClip(true); });
    miniVideo.addEventListener('error', () => onMiniVideoError(wrap));
    wrap.appendChild(miniVideo);
    playMiniClip('idle');
    // 展開側で褒められた直後にミニへ戻ってきたら、SD ジャンプで迎える
    if (Date.now() - lastPraiseAt < 5000) playMiniClip('praise');
  } else if (!miniVideo.getAttribute('src') || miniVideo.paused) {
    playMiniClip(miniClipKind);
  }
}

/* ---- ミニ表示：立ち絵（type=image）／Live2D 受け口 ---- */
let miniImgEl = null;
let miniImgScene = 'idle';
let miniImgTimer = null;
let miniLive2dEl = null;

function setMiniImageScene(kind) {
  miniImgScene = kind;
  if (!miniImgEl) return;
  const sd = imagesFor(currentCharacterId(), 'sd');
  const src = kind === 'praise' ? (sd.jump || sd.idle) : sd.idle;
  if (src && miniImgEl.getAttribute('src') !== src) miniImgEl.setAttribute('src', src);
  if (miniImgTimer) { clearTimeout(miniImgTimer); miniImgTimer = null; }
  if (kind !== 'idle') {
    miniImgTimer = setTimeout(() => setMiniImageScene('idle'), 3000);
  }
}

function renderMiniImage(wrap) {
  if (!miniImgEl) {
    miniCharacter = currentCharacterId();
    wrap.innerHTML = '';
    miniImgEl = document.createElement('img');
    miniImgEl.id = 'mini-image';
    miniImgEl.alt = `${currentCharacterLabel()}（SD）`;
    wrap.appendChild(miniImgEl);
    setMiniImageScene('idle');
    if (Date.now() - lastPraiseAt < 5000) setMiniImageScene('praise');
  }
}

function renderMiniLive2d(wrap) {
  if (!miniLive2dEl) {
    miniCharacter = currentCharacterId();
    wrap.innerHTML = '';
    miniLive2dEl = document.createElement('div');
    miniLive2dEl.className = 'avatar-placeholder';
    miniLive2dEl.textContent = currentCharacterLabel();
    wrap.appendChild(miniLive2dEl);
  }
}

// ミニ側の場面表示をキャラの表示形式に振り分ける
function playMiniScene(kind) {
  const t = displayType();
  if (t === 'image') { setMiniImageScene(kind); return; }
  if (t === 'live2d') return;
  playMiniClip(kind);
}

/* ---- チェックリスト（feat/checklist-reset） ---- */
const PERIODS = ['daily', 'weekly', 'biweekly'];

function periodItems(period) {
  return (state.presets && state.presets[period]) || [];
}
function periodDone(period) {
  return (state.checks && state.checks[period] && state.checks[period].done) || {};
}
function remainingOf(period) {
  const done = periodDone(period);
  return periodItems(period).filter((it) => !done[it.id]).length;
}

function renderChecklist() {
  if (!state || !state.presets) return;
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = '';
  for (const period of PERIODS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    if (period === activePeriod) btn.classList.add('active');
    const remaining = remainingOf(period);
    const label = document.createElement('span');
    label.textContent = state.periodLabels[period];
    btn.appendChild(label);
    const badge = document.createElement('span');
    badge.className = 'badge' + (remaining === 0 ? ' done' : '');
    badge.textContent = remaining === 0 ? '✓' : String(remaining);
    btn.appendChild(badge);
    btn.addEventListener('click', () => { activePeriod = period; renderChecklist(); });
    tabs.appendChild(btn);
  }

  const items = periodItems(activePeriod);
  const done = periodDone(activePeriod);
  const doneCount = items.filter((it) => done[it.id]).length;
  document.getElementById('progress-fill').style.width =
    items.length ? `${Math.round((doneCount / items.length) * 100)}%` : '0%';
  document.getElementById('progress-text').textContent =
    `${state.periodLabels[activePeriod]} ${doneCount} / ${items.length}`;

  const list = document.getElementById('check-list');
  list.innerHTML = '';
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'check-item' + (done[item.id] ? ' done' : '');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!done[item.id];
    input.readOnly = true;
    input.tabIndex = -1;
    row.appendChild(input);
    const name = document.createElement('span');
    name.className = 'ci-name';
    name.textContent = item.name;
    row.appendChild(name);
    if (item.note) {
      const note = document.createElement('span');
      note.className = 'ci-note';
      note.textContent = item.note;
      row.appendChild(note);
    }
    if (item.deadline) {
      const tag = document.createElement('span');
      tag.className = 'ci-tag ci-deadline';
      tag.textContent = `締切 ${item.deadline}`;
      row.appendChild(tag);
    }
    if (item.optional) {
      const tag = document.createElement('span');
      tag.className = 'ci-tag';
      tag.textContent = '任意';
      row.appendChild(tag);
    }
    row.addEventListener('click', async () => {
      const wasDone = !!periodDone(activePeriod)[item.id];
      state = await window.maid.toggleCheck(activePeriod, item.id);
      render();
      const nowDone = !!periodDone(activePeriod)[item.id];
      const complete = nowDone && periodItems(activePeriod).every((it) => periodDone(activePeriod)[it.id]);
      onItemChecked(activePeriod, item, !wasDone && nowDone, complete);
    });
    list.appendChild(row);
  }
}

// チェック時のキャラ反応：チェックで褒めクリップ、その周期の全完了で特別な褒め。
// エージェント表示オフの時はキャラ依存の振る舞いを一切出さない。
function onItemChecked(period, item, checked, complete) {
  if (!checked) return;
  if (!agentEnabled()) return;
  lastPraiseAt = Date.now();
  if (complete) {
    say('complete');
    playVoice('complete');
    showScene('complete');
  } else {
    say('praise');
    playVoice('praise');
    showScene('praise');
  }
}

/* ---- 数値管理（feat/resources-ui） ----
 * 回復はメイン側が境界で自動加算する。ここは表示と手動の増減だけ。
 * 上限到達は「満タン」表示で知らせる（通知の発火はフェーズ1）。
 * 満タン、または次回回復で溢れる場合は、溢れる量を警告色で併記する。 */
function renderResources() {
  const wrap = document.getElementById('resources');
  if (!wrap || !state || !state.resources) return;
  const { defs, values } = state.resources;
  const overflow = state.resources.overflow || {};
  wrap.innerHTML = '';
  for (const id of Object.keys(defs)) {
    const def = defs[id];
    const value = values[id] || 0;
    const full = value >= def.max;
    const row = document.createElement('div');
    row.className = 'resource-row';
    const label = document.createElement('span');
    label.className = 'r-label';
    label.textContent = def.label;
    row.appendChild(label);
    const val = document.createElement('span');
    val.className = 'r-value' + (full ? ' full' : '');
    val.textContent = String(value);
    const max = document.createElement('span');
    max.className = 'r-max';
    max.textContent = full ? `/ ${def.max} 満タン` : `/ ${def.max}`;
    val.appendChild(max);
    row.appendChild(val);
    for (const sign of [-1, 1]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = sign < 0 ? `−${def.step}` : `＋${def.step}`;
      btn.title = sign < 0 ? '使った分を減らす' : '戻す';
      btn.addEventListener('click', async () => {
        state = await window.maid.adjustResource(id, sign * def.step);
        render();
      });
      row.appendChild(btn);
    }
    const ov = overflow[id];
    if (ov && ov.show) {
      const warn = document.createElement('div');
      warn.className = 'r-warn';
      warn.textContent = ov.full
        ? `⚠ 満タンです。次回回復 +${ov.perDay} は全て溢れます`
        : `⚠ あと ${ov.room} で上限。次回回復 +${ov.perDay} のうち ${ov.overflowNext} が溢れます`;
      row.appendChild(warn);
    }
    wrap.appendChild(row);
  }
}

/* ---- キャラ表示＋吹き出し（feat/video-display → feat/dock-states → feat/suzuran-video → feat/mimoza-video） ----
 * メイドを動画クリップで表示する（動画方式）。
 *   起動時：挨拶クリップを1回 → 待機ループ
 *   チェック時／周期の全完了時：褒めるクリップを1回 → 待機へ復帰
 * 等身クリップは展開（メイン）表示専用、SD クリップは待機（ミニ）表示専用。
 * 割当はドックの状態で決まる（旧・ステージの高さによる SD 切替は廃止）。
 * 設定でエージェント表示をオフにすると、キャラ表示と吹き出しは完全に消え、
 * 数値管理はリスト側へ移して管理機能だけが残る。 */
/* キャラ定義はメイン側（src/characters.js）が解決して snapshot.characters で
 * 渡す（組み込み3人＋ユーザー追加）。ここはハードコードを持たず、定義に
 * 従って表示するだけにする（キャラ・形式の追加で本体を書き換えない）。 */
const FALLBACK_CHARACTER = {
  id: 'momo', name: 'モモ', type: 'video', builtin: true,
  clips: {
    full: { idle: 'assets/momo-idle.mp4', greeting: 'assets/momo-greeting.mp4', praise: 'assets/momo-praise.mp4' },
    sd: { idle: 'assets/momo-sd-idle.mp4', greeting: null, praise: 'assets/momo-sd-jump.mp4' },
  },
};

function characterDef(id) {
  const list = (state && state.characters) || [];
  return list.find((c) => c.id === (id || currentCharacterId())) || FALLBACK_CHARACTER;
}
function currentCharacterId() {
  return (state && state.settings && state.settings.character) || 'momo';
}
function currentCharacterLabel() {
  return characterDef().name || 'モモ';
}
function displayType() {
  return characterDef().type || 'video';
}
function clipsFor(character, form) {
  const def = characterDef(character);
  const set = def.clips || {};
  return set[form] || set.full || { idle: null, greeting: null, praise: null };
}
// ミニ表示用：縮小版 SD（sdSmall）があればそちらを使う（レビュー中5）。
// 幅116px のミニで 960×960・24fps を回し続けないための定常負荷対策。
// 縮小版が無いキャラ（ユーザー追加など）は通常の SD にフォールバックする。
function miniClips() {
  const def = characterDef();
  const set = def.clips || {};
  if (set.sdSmall && set.sdSmall.idle) return set.sdSmall;
  return set.sd || set.full || { idle: null, greeting: null, praise: null };
}
function imagesFor(character, form) {
  const def = characterDef(character);
  const set = def.images || {};
  return set[form] || set.full || { idle: null };
}

let videoEl = null;
let charStarted = false;
let greeted = false;
let displayedCharacter = null;
let displayedType = null; // 表示中の形式（設定で切り替わったら表示要素を作り替える）
let clipKind = 'idle'; // 'idle' | 'greeting' | 'praise'
let lastLineKind = null;
let lastLineText = '';
let lastPraiseAt = 0; // 直近の褒めイベント（ミニへ戻った直後なら SD ジャンプで迎える）

function agentEnabled() {
  return !state || !state.settings || state.settings.showAgent !== false;
}

function voiceEnabled() {
  return !state || !state.settings || state.settings.voiceEnabled !== false;
}

function bubbleEnabled() {
  return !state || !state.settings || state.settings.showBubble !== false;
}

// エージェント表示オフ：キャラ列を畳み、数値管理はリスト列へ移す（管理機能は残す）
function layoutForAgent() {
  const off = !agentEnabled();
  document.body.classList.toggle('agent-off', off);
  const res = document.getElementById('resources');
  const charCol = document.querySelector('.char-column');
  const listCol = document.querySelector('.list-column');
  const checkList = document.getElementById('check-list');
  if (!res || !charCol || !listCol || !checkList) return;
  if (off) {
    if (res.parentElement !== listCol) listCol.insertBefore(res, checkList);
  } else if (res.parentElement !== charCol) {
    charCol.appendChild(res);
  }
}

function currentClipSrc(kind) {
  const full = clipsFor(currentCharacterId(), 'full');
  return full[kind] || full.idle;
}

/* クリップ切替の直列化とエラー復帰（不具合2対策、判断は clipguard.js）
 * 根本対策は Blob URL 化（resolveMediaSrc）で、ここはその上での防御:
 * - 切替の読み込みが終わるまで次の切替は保留する（割り込みを作らない）
 * - error が来ても、保留の適用→1回だけ再読み込み→致命、の順に段階復帰する
 * - 起動時は idle を経由せず挨拶を直接始める（二重切替の排除） */
let clipInFlight = false;
let pendingClipKind = null;
let clipRetryUsed = false;
let currentClipPath = null; // 設定済み（または適用中）の論理パス

function applyClip(kind, { force = false } = {}) {
  if (!videoEl || !mainClipActive()) return;
  const full = clipsFor(currentCharacterId(), 'full');
  clipKind = full[kind] ? kind : 'idle';
  const path = currentClipSrc(clipKind);
  videoEl.loop = clipKind === 'idle';
  const url = resolveMediaSrc(path);
  if (!url) {
    pendingClipKind = clipKind; // Blob が届いたら flush 側で適用する
    return;
  }
  if (force) {
    videoEl.removeAttribute('src');
    try { videoEl.load(); } catch { /* 無視 */ }
    currentClipPath = null;
  }
  if (currentClipPath !== path) {
    videoEl.setAttribute('src', url);
    currentClipPath = path;
    clipInFlight = true;
  }
  try { videoEl.currentTime = CLIP_START_SKIP_SEC; } catch { /* メタデータ未読込時は無視 */ }
  const p = videoEl.play();
  if (p && typeof p.catch === 'function') p.catch(() => { /* 自動再生不可の環境では静止画のまま */ });
}

function playClip(kind) {
  if (!videoEl || !mainClipActive()) return;
  const full = clipsFor(currentCharacterId(), 'full');
  const want = full[kind] ? kind : 'idle';
  const action = window.ClipGuard.nextAction({
    currentSrc: currentClipPath,
    requestedSrc: currentClipSrc(want),
    inFlight: clipInFlight,
    readyState: videoEl.readyState,
  });
  if (action === 'switch') {
    pendingClipKind = null;
    applyClip(want);
  } else if (action === 'defer') {
    pendingClipKind = want; // 読み込みが落ち着いたら canplay 側で適用する
  } else if (action === 'restart') {
    if (want !== 'idle') applyClip(want); // 褒めの再要求は先頭から
    else if (videoEl.paused) { const p = videoEl.play(); if (p && p.catch) p.catch(() => {}); }
  } else if (videoEl.paused && !clipInFlight) {
    const p = videoEl.play();
    if (p && typeof p.catch === 'function') p.catch(() => { /* 同上 */ });
  }
}

// 保留中の切替の適用。settled=true は canplay（読み込みが落ち着いた）から、
// settled=false は Blob 取得完了から。読み込み中（inFlight）の間は、
// loadedmetadata 段階でデマルチプレクサがまだ開きかけのため切替やシークが
// 割り込むと DEMUXER_ERROR_COULD_NOT_OPEN になるので、settled 側に委ねる。
function flushPendingClip(settled) {
  if (!videoEl || !pendingClipKind) {
    if (settled) clipInFlight = false;
    return;
  }
  // 非表示の間に届いた完了は、再生を始めずに保留を捨てる（レビュー中6）
  if (!mainClipActive()) {
    pendingClipKind = null;
    clipInFlight = false;
    return;
  }
  if (clipInFlight && !settled) return;
  clipInFlight = false;
  const kind = pendingClipKind;
  pendingClipKind = null;
  if (currentClipPath !== currentClipSrc(kind)) applyClip(kind);
}

function onVideoError(mount) {
  const action = window.ClipGuard.errorAction({
    hasPending: !!pendingClipKind,
    retryUsed: clipRetryUsed,
  });
  if (action === 'apply-pending') {
    clipInFlight = false;
    const kind = pendingClipKind;
    pendingClipKind = null;
    applyClip(kind, { force: true });
    return;
  }
  if (action === 'retry') {
    clipRetryUsed = true;
    clipInFlight = false;
    const kind = clipKind;
    const epoch = mediaEpoch;
    setTimeout(() => {
      if (videoEl && epoch === mediaEpoch && mainClipActive()) applyClip(kind, { force: true });
    }, 350);
    return;
  }
  // キャラ名は常に textContent で描画する（innerHTML へ埋め込まない、レビュー高3）
  mount.innerHTML = '';
  const ph = document.createElement('div');
  ph.className = 'avatar-placeholder';
  ph.textContent = `${currentCharacterLabel()}（動画を読み込めませんでした）`;
  mount.appendChild(ph);
  videoEl = null;
  charStarted = false;
  clipInFlight = false;
  pendingClipKind = null;
  clipRetryUsed = false;
  currentClipPath = null;
}

function stopCharacter() {
  if (currentClipPath || pendingClipKind || clipInFlight) mediaEpoch++;
  if (videoEl) {
    try { videoEl.pause(); } catch { /* 無視 */ }
    videoEl.removeAttribute('src');
    try { videoEl.load(); } catch { /* 無視 */ }
  }
  clipKind = 'idle';
  clipInFlight = false;
  pendingClipKind = null;
  currentClipPath = null;
}

/* ---- 立ち絵＋表情差分（type=image）の表示 ----
 * 場面ごとに表情差分画像を切り替え、一定時間で待機（idle）へ戻す。
 * 動画のような読み込み競合は無いので、単純なタイマーで足りる。 */
let imgEl = null;
let imgScene = 'idle';
let imgSceneTimer = null;
let imgStarted = false;

function setImageScene(kind) {
  imgScene = kind;
  if (!imgEl) return;
  const full = imagesFor(currentCharacterId(), 'full');
  const src = full[kind] || full.idle;
  if (src && imgEl.getAttribute('src') !== src) imgEl.setAttribute('src', src);
  if (imgSceneTimer) { clearTimeout(imgSceneTimer); imgSceneTimer = null; }
  if (kind !== 'idle') {
    const ms = kind === 'greeting' ? 4000 : kind === 'complete' ? 5000 : 3500;
    imgSceneTimer = setTimeout(() => { if (imgScene !== 'idle') setImageScene('idle'); }, ms);
  }
}

function renderImageCharacter(mount) {
  if (!imgStarted) {
    imgStarted = true;
    mount.innerHTML = '';
    imgEl = document.createElement('img');
    imgEl.id = 'char-image';
    imgEl.alt = currentCharacterLabel();
    mount.appendChild(imgEl);
    if (!greeted && state && state.settings) {
      greeted = true;
      setImageScene('greeting');
      say('greeting');
      playVoice('greeting');
      return;
    }
    setImageScene('idle');
  }
  if (!greeted && state && state.settings) {
    greeted = true;
    setImageScene('greeting');
    say('greeting');
    playVoice('greeting');
  }
}

/* ---- Live2D（type=live2d）は受け口のみ ----
 * モデルの検出・登録・選択までは対応するが、ランタイム再生は未対応。
 * 完成したことにせず、未対応であることを画面に出す。 */
let live2dStarted = false;

function renderLive2dCharacter(mount) {
  if (live2dStarted) return;
  live2dStarted = true;
  mount.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'avatar-placeholder';
  div.textContent = `${currentCharacterLabel()}（Live2D モデル登録済み・再生は未対応です）`;
  mount.appendChild(div);
  if (!greeted && state && state.settings) {
    greeted = true;
    say('greeting');
    playVoice('greeting');
  }
}

// 場面の表示をキャラの表示形式に振り分ける（チェック時の反応など）
function showScene(kind) {
  const t = displayType();
  if (t === 'image') { setImageScene(kind); return; }
  if (t === 'live2d') return;
  playClip(kind === 'complete' ? 'praise' : kind);
}

function renderCharacter() {
  const stage = document.getElementById('avatar-stage');
  if (!stage) return;
  if (!agentEnabled()) {
    stopCharacter();
    return;
  }
  // 等身クリップは展開表示の時だけ（ミニ／最小化ではソースを外して止める、レビュー中6）
  if (dockMode() !== 'expanded') {
    stopCharacter();
    return;
  }
  // キャラが切り替わったら、前キャラの表示要素を片付けて挨拶から出し直す。
  // 表示形式（立ち絵／動画）が切り替わった時も同じく作り替える
  // （前の形式の要素が残ると、戻した時に外れた要素を触ってしまうため）。
  if (displayedCharacter !== currentCharacterId() || displayedType !== displayType()) {
    displayedCharacter = currentCharacterId();
    displayedType = displayType();
    greeted = false;
    lastLineText = '';
    stopCharacter();
    if (videoEl) { videoEl.remove(); videoEl = null; }
    charStarted = false;
    imgStarted = false;
    imgEl = null;
    if (imgSceneTimer) { clearTimeout(imgSceneTimer); imgSceneTimer = null; }
    imgScene = 'idle';
    live2dStarted = false;
    const m0 = document.getElementById('avatar-frame');
    if (m0) m0.innerHTML = '';
  }
  const type = displayType();
  if (type === 'image' || type === 'live2d') {
    const mount = document.getElementById('avatar-frame') || stage;
    if (type === 'image') renderImageCharacter(mount);
    else renderLive2dCharacter(mount);
    return;
  }
  // キャラが切り替わったら、新しいキャラの挨拶から出し直す
  if (displayedCharacter !== currentCharacterId()) {
    displayedCharacter = currentCharacterId();
    greeted = false;
    lastLineText = '';
    if (videoEl) videoEl.setAttribute('aria-label', currentCharacterLabel());
  }
  const mount = document.getElementById('avatar-frame') || stage;
  if (!charStarted) {
    charStarted = true;
    mount.innerHTML = '';
    videoEl = document.createElement('video');
    videoEl.id = 'char-video';
    videoEl.muted = true;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.setAttribute('aria-label', currentCharacterLabel());
    videoEl.addEventListener('ended', () => {
      if (clipKind !== 'idle') playClip('idle');
    });
    videoEl.addEventListener('canplay', () => { clipRetryUsed = false; flushPendingClip(true); });
    videoEl.addEventListener('error', () => onVideoError(mount));
    mount.appendChild(videoEl);
    // 起動時は idle を経由せず、挨拶を直接始める（切替の二重化が割り込みの温床になる）。
    // エラー復帰で要素を作り直した時は、挨拶済みなら待機から再開する（再挨拶しない）。
    if (!greeted && state && state.settings) {
      greeted = true;
      applyClip('greeting');
      say('greeting');
      playVoice('greeting');
    } else {
      applyClip('idle');
    }
  } else if (videoEl && (!videoEl.getAttribute('src') || videoEl.paused)) {
    // オフ→オン、または他モードから展開に戻った時は再生を再開する
    playClip(clipKind);
  }
  if (!greeted && state && state.settings) {
    greeted = true;
    playClip('greeting');
    say('greeting');
    playVoice('greeting');
  }
}

/* ---- ボイス再生（ボイスパック連動） ----
 * 音声はアプリに同梱せず、userData の voice/ フォルダに置かれた
 * ボイスパックをメイン側が検出して snapshot.voiceFiles で渡す。
 * パックが無い環境では playVoice は何もせず、設定のボイス項目も出さない。 */
let voiceAudio = null;

function voiceAvailable() {
  return !!(state && state.voiceAvailable);
}

// 再生中のボイスを止める（表示オフ・ボイスオフで鳴りっぱなしにしない、レビュー中6）
function stopVoice() {
  if (!voiceAudio) return;
  try {
    voiceAudio.pause();
    voiceAudio.currentTime = 0;
  } catch { /* 無視 */ }
}

function playVoice(kind) {
  if (!agentEnabled() || !voiceEnabled()) return;
  const files = (state && state.voiceFiles && state.voiceFiles[currentCharacterId()]) || {};
  const src = files[kind];
  if (!src) return; // その場面のボイスがパックに無い
  if (!voiceAudio) voiceAudio = new Audio();
  if (voiceAudio.getAttribute('src') !== src) voiceAudio.setAttribute('src', src);
  try { voiceAudio.currentTime = 0; } catch { /* 無視 */ }
  const p = voiceAudio.play();
  if (p && typeof p.catch === 'function') p.catch(() => { /* 再生不可の環境では無音のまま */ });
}

// 台詞の種別（greeting/praise/complete）から選んで吹き出しに出す。
// 直前と同じ文は避ける（カーナビ式のバリエーションを活かす）。
// 吹き出しオフ（showBubble）の時は台詞表示自体を出さない（キャラ表示は残る）。
function say(kind) {
  if (!agentEnabled()) return;
  if (!bubbleEnabled()) return;
  if (!state || !state.lines) return;
  // 呼び方はメイン側で解決済み（キャラごとの設定 > 定義の既定 > 全体設定）
  const address = state.address || state.settings.address || 'ご主人様';
  const arr = state.lines[kind] || [];
  if (arr.length === 0) return;
  let text = '';
  for (let i = 0; i < 5; i++) {
    const raw = arr[Math.floor(Math.random() * arr.length)];
    text = raw.split('{address}').join(address);
    if (text !== lastLineText || arr.length === 1) break;
  }
  lastLineKind = kind;
  lastLineText = text;
  document.getElementById('bubble-text').textContent = text;
}

/* ---- 設定（feat/settings） ----
 * 呼び方の変更、キャラ選択（組み込み＋ユーザー追加）、キャラ登録、
 * 2週間周期のアンカー日、項目ごとの通知オン/オフ（保存のみ・発火はフェーズ1）。 */

/* キャラ登録フォームの入力保持。renderSettings は state 更新のたびに再構築
 * されるので、入力中の内容はここに退避して復元する。 */
const regState = {
  name: '', type: 'video',
  addressCandidates: '', addressDefault: '',
  lines: { greeting: '', praise: '', complete: '' },
  files: {}, voiceFiles: {}, extras: [],
  status: '',
};

const REG_SLOTS = {
  video: [
    ['idle', '待機クリップ（必須）', 'video'],
    ['greeting', '挨拶クリップ（必須）', 'video'],
    ['praise', '褒めクリップ（必須）', 'video'],
    ['sdIdle', 'SD待機クリップ（任意）', 'video'],
    ['sdJump', 'SD喜ぶクリップ（任意）', 'video'],
  ],
  image: [
    ['idle', '待機の立ち絵（必須）', 'image'],
    ['greeting', '挨拶の表情差分（必須）', 'image'],
    ['praise', '褒めの表情差分（必須）', 'image'],
    ['complete', '全完了の表情差分（必須）', 'image'],
    ['sdIdle', 'SD待機（任意）', 'image'],
    ['sdJump', 'SD喜ぶ（任意）', 'image'],
  ],
  live2d: [
    ['model', 'モデルファイル（*.model3.json・必須）', 'model'],
  ],
};
const REG_VOICE_SLOTS = [
  ['greeting', '挨拶ボイス（任意）'],
  ['praise', '褒めボイス（任意）'],
  ['complete', '全完了ボイス（任意）'],
];

function regEl(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function renderRegistrationForm(body) {
  const h = regEl('h3', null, 'キャラクター追加');
  body.appendChild(h);
  const intro = regEl('p', 'setting-note',
    'ここは通常の設定ではなく、新しいキャラクターをアプリに追加するための場所です。表示形式を選んで、名前・台詞・素材を登録します。登録したキャラは上のキャラ選択に現れます。');
  body.appendChild(intro);

  const nameRow = regEl('div', 'setting-row');
  nameRow.appendChild(regEl('span', 's-label', '名前'));
  const nameInput = regEl('input');
  nameInput.type = 'text';
  nameInput.value = regState.name;
  nameInput.placeholder = '例：ミモザ';
  nameInput.addEventListener('input', () => { regState.name = nameInput.value; });
  nameRow.appendChild(nameInput);
  body.appendChild(nameRow);

  const typeRow = regEl('div', 'setting-row');
  typeRow.appendChild(regEl('span', 's-label', '表示形式'));
  const typeSel = regEl('select');
  const typeOpts = [
    ['video', 'アニメーション（動画：mp4 / webm）'],
    ['image', '立ち絵（＋表情差分）（既定）'],
    ['live2d', 'Live2D（登録・検出のみ／再生は未対応）'],
  ];
  for (const [v, label] of typeOpts) {
    const opt = regEl('option', null, label);
    opt.value = v;
    if (regState.type === v) opt.selected = true;
    typeSel.appendChild(opt);
  }
  typeSel.addEventListener('change', () => {
    regState.type = typeSel.value;
    regState.files = {};
    renderSettings();
  });
  typeRow.appendChild(typeSel);
  body.appendChild(typeRow);

  const addrRow = regEl('div', 'setting-row');
  addrRow.appendChild(regEl('span', 's-label', '呼び方の候補（任意・カンマ区切り）'));
  const addrInput = regEl('input');
  addrInput.type = 'text';
  addrInput.value = regState.addressCandidates;
  addrInput.placeholder = '例：ご主人様, お嬢様';
  addrInput.addEventListener('input', () => { regState.addressCandidates = addrInput.value; });
  addrRow.appendChild(addrInput);
  body.appendChild(addrRow);

  const addrDefRow = regEl('div', 'setting-row');
  addrDefRow.appendChild(regEl('span', 's-label', '既定の呼び方（任意）'));
  const addrDefInput = regEl('input');
  addrDefInput.type = 'text';
  addrDefInput.value = regState.addressDefault;
  addrDefInput.placeholder = '候補の中から1つ';
  addrDefInput.addEventListener('input', () => { regState.addressDefault = addrDefInput.value; });
  addrDefRow.appendChild(addrDefInput);
  body.appendChild(addrDefRow);

  for (const [kind, label] of [['greeting', '挨拶の台詞'], ['praise', '褒めの台詞'], ['complete', '全完了の台詞']]) {
    const row = regEl('div', 'setting-row');
    row.appendChild(regEl('span', 's-label', `${label}（1行に1台詞・{address} が呼び方に置き換わります）`));
    const ta = regEl('textarea');
    ta.rows = 2;
    ta.value = regState.lines[kind];
    ta.addEventListener('input', () => { regState.lines[kind] = ta.value; });
    row.appendChild(ta);
    body.appendChild(row);
  }

  const fileLabel = regEl('p', 'setting-note',
    regState.type === 'video' ? 'モーション（場面ごとのクリップ。対応拡張子：mp4 / webm）'
      : regState.type === 'image' ? '立ち絵・表情差分（対応拡張子：png / jpg / webp）'
        : 'Live2D モデル（model3.json。テクスチャ等の同梱ファイルも一緒に選べます）');
  body.appendChild(fileLabel);

  const addPickRow = (store, slot, label, kind) => {
    const row = regEl('div', 'setting-row');
    row.appendChild(regEl('span', 's-label', label));
    const btn = regEl('button', 'mini-action', 'ファイルを選ぶ');
    btn.type = 'button';
    const chosen = regEl('span', 'setting-note', store[slot] ? store[slot].split(/[\\/]/).pop() : '未選択');
    btn.addEventListener('click', async () => {
      const picked = await window.maid.pickFile(kind);
      if (picked) {
        store[slot] = picked;
        chosen.textContent = picked.split(/[\\/]/).pop();
      }
    });
    row.appendChild(btn);
    row.appendChild(chosen);
    body.appendChild(row);
  };
  for (const [slot, label, kind] of REG_SLOTS[regState.type] || []) {
    addPickRow(regState.files, slot, label, kind);
  }
  if (regState.type === 'live2d') {
    const row = regEl('div', 'setting-row');
    row.appendChild(regEl('span', 's-label', '同梱ファイル（任意・テクスチャ等）'));
    const btn = regEl('button', 'mini-action', '追加する');
    btn.type = 'button';
    const chosen = regEl('span', 'setting-note',
      regState.extras.length > 0 ? `${regState.extras.length} 件選択中` : '未選択');
    btn.addEventListener('click', async () => {
      const picked = await window.maid.pickFile('any');
      if (picked) {
        regState.extras.push(picked);
        chosen.textContent = `${regState.extras.length} 件選択中`;
      }
    });
    row.appendChild(btn);
    row.appendChild(chosen);
    body.appendChild(row);
  }

  body.appendChild(regEl('p', 'setting-note', 'ボイス（任意・対応拡張子：mp3 / wav）'));
  for (const [kind, label] of REG_VOICE_SLOTS) {
    addPickRow(regState.voiceFiles, kind, label, 'audio');
  }

  const submitRow = regEl('div', 'setting-row');
  const submitBtn = regEl('button', 'mini-action', 'このキャラを登録する');
  submitBtn.type = 'button';
  submitBtn.addEventListener('click', async () => {
    const splitLines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
    const payload = {
      name: regState.name.trim(),
      type: regState.type,
      lines: {
        greeting: splitLines(regState.lines.greeting),
        praise: splitLines(regState.lines.praise),
        complete: splitLines(regState.lines.complete),
      },
      addressCandidates: regState.addressCandidates.split(/[,、，]/).map((x) => x.trim()).filter(Boolean),
      addressDefault: regState.addressDefault.trim(),
      files: { ...regState.files, extras: regState.extras },
      voiceFiles: { ...regState.voiceFiles },
    };
    const r = await window.maid.registerCharacter(payload);
    if (r && r.ok) {
      regState.status = `「${payload.name}」を登録しました`;
      regState.name = ''; regState.files = {}; regState.voiceFiles = {}; regState.extras = [];
      if (r.state) state = r.state;
      render();
    } else {
      regState.status = `登録できませんでした：${(r && r.error) || '不明なエラー'}`;
      renderSettings();
    }
  });
  submitRow.appendChild(submitBtn);
  body.appendChild(submitRow);
  if (regState.status) {
    body.appendChild(regEl('p', 'setting-note', regState.status));
  }
}
function notifyValueOf(item) {
  const saved = state.settings.notify && state.settings.notify[item.id];
  if (typeof saved === 'boolean') return saved;
  return item.notifyDefault !== false;
}

function renderSettings() {
  const body = document.getElementById('settings-body');
  if (!body || !state || !state.settings) return;
  body.innerHTML = '';

  const hAgent = document.createElement('h3');
  hAgent.textContent = 'エージェント';
  body.appendChild(hAgent);
  const agentRow = document.createElement('div');
  agentRow.className = 'setting-row';
  const agentLabel = document.createElement('span');
  agentLabel.className = 's-label';
  agentLabel.textContent = 'エージェント表示（オフにすると管理機能だけになります）';
  agentRow.appendChild(agentLabel);
  const agentSw = document.createElement('label');
  agentSw.className = 'switch';
  const agentInput = document.createElement('input');
  agentInput.type = 'checkbox';
  agentInput.checked = agentEnabled();
  agentInput.addEventListener('change', async () => {
    state = await window.maid.setShowAgent(agentInput.checked);
    render();
  });
  const agentTrack = document.createElement('span');
  agentTrack.className = 'track';
  agentSw.appendChild(agentInput);
  agentSw.appendChild(agentTrack);
  agentRow.appendChild(agentSw);
  body.appendChild(agentRow);

  // ボイス／吹き出しのオン・オフ（エージェント表示とは独立に切り替える）
  const toggleRow = (labelText, checked, onChange) => {
    const row = document.createElement('div');
    row.className = 'setting-row';
    const label = document.createElement('span');
    label.className = 's-label';
    label.textContent = labelText;
    row.appendChild(label);
    const sw = document.createElement('label');
    sw.className = 'switch';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', async () => {
      state = await onChange(input.checked);
      render();
    });
    const track = document.createElement('span');
    track.className = 'track';
    sw.appendChild(input);
    sw.appendChild(track);
    row.appendChild(sw);
    return row;
  };
  // ボイス関連の設定は、ボイスパック（userData の voice/ フォルダ）が
  // 存在する環境でのみ表示する。無い環境では項目ごと出さない。
  if (voiceAvailable()) {
    body.appendChild(toggleRow(
      'ボイス（挨拶・褒め・全完了の声）',
      voiceEnabled(),
      (v) => window.maid.setVoiceEnabled(v),
    ));
  }
  body.appendChild(toggleRow(
    '吹き出し（台詞の表示。オフでもキャラは表示されます）',
    bubbleEnabled(),
    (v) => window.maid.setShowBubble(v),
  ));

  // 表示形式（立ち絵＋表情差分／動画）。両形式の素材を持つキャラ
  // （組み込み3人）にだけ効く設定で、既定は立ち絵。動画も選択肢として残す。
  const fmtRow = document.createElement('div');
  fmtRow.className = 'setting-row';
  const fmtLabel = document.createElement('span');
  fmtLabel.className = 's-label';
  fmtLabel.textContent = '表示形式（立ち絵と動画の両方があるキャラ用）';
  fmtRow.appendChild(fmtLabel);
  const fmtSel = document.createElement('select');
  const curFmt = state.settings.displayFormat === 'video' ? 'video' : 'image';
  for (const [v, label] of [
    ['image', '立ち絵＋表情差分（既定）'],
    ['video', 'アニメーション（動画）'],
  ]) {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = label;
    if (curFmt === v) opt.selected = true;
    fmtSel.appendChild(opt);
  }
  fmtSel.addEventListener('change', async () => {
    state = await window.maid.setDisplayFormat(fmtSel.value);
    render();
  });
  fmtRow.appendChild(fmtSel);
  body.appendChild(fmtRow);

  const hAddr = document.createElement('h3');
  hAddr.textContent = '呼び方';
  body.appendChild(hAddr);
  const addrRow = document.createElement('div');
  addrRow.className = 'setting-row';
  const addrLabel = document.createElement('span');
  addrLabel.className = 's-label';
  addrLabel.textContent = 'わたしからの呼び方';
  addrRow.appendChild(addrLabel);
  const addrSel = document.createElement('select');
  for (const v of ['ご主人様', 'お嬢様']) {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    if (state.settings.address === v) opt.selected = true;
    addrSel.appendChild(opt);
  }
  addrSel.addEventListener('change', async () => {
    state = await window.maid.setAddress(addrSel.value);
    render();
    say('greeting');
  });
  addrRow.appendChild(addrSel);
  body.appendChild(addrRow);

  const hChar = document.createElement('h3');
  hChar.textContent = 'キャラ';
  body.appendChild(hChar);
  const charRow = document.createElement('div');
  charRow.className = 'setting-row';
  const charLabel = document.createElement('span');
  charLabel.className = 's-label';
  charLabel.textContent = '常駐するキャラ';
  charRow.appendChild(charLabel);
  const charSel = document.createElement('select');
  const typeSuffix = { video: '', image: '（立ち絵）', live2d: '（Live2D・再生未対応）' };
  for (const c of state.characters || []) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name + (typeSuffix[c.type] || '');
    if (state.settings.character === c.id) opt.selected = true;
    charSel.appendChild(opt);
  }
  charSel.addEventListener('change', async () => {
    state = await window.maid.setCharacter(charSel.value);
    render();
  });
  charRow.appendChild(charSel);
  body.appendChild(charRow);

  // キャラごとの呼び方（未設定なら全体設定を使う）
  const curDef = characterDef();
  const charAddrRow = document.createElement('div');
  charAddrRow.className = 'setting-row';
  const charAddrLabel = document.createElement('span');
  charAddrLabel.className = 's-label';
  charAddrLabel.textContent = `${curDef.name} の呼び方`;
  charAddrRow.appendChild(charAddrLabel);
  const charAddrSel = document.createElement('select');
  const optGlobal = document.createElement('option');
  optGlobal.value = '';
  optGlobal.textContent = '全体設定を使う';
  charAddrSel.appendChild(optGlobal);
  const candidates = (curDef.addressCandidates && curDef.addressCandidates.length > 0)
    ? curDef.addressCandidates : ['ご主人様', 'お嬢様'];
  for (const cand of candidates) {
    const opt = document.createElement('option');
    opt.value = cand;
    opt.textContent = cand;
    charAddrSel.appendChild(opt);
  }
  charAddrSel.value = (state.settings.characterAddress || {})[curDef.id] || '';
  charAddrSel.addEventListener('change', async () => {
    state = await window.maid.setCharacterAddress(curDef.id, charAddrSel.value || null);
    render();
  });
  charAddrRow.appendChild(charAddrSel);
  body.appendChild(charAddrRow);

  // 定義が壊れているユーザーキャラがいれば知らせる
  for (const err of state.characterErrors || []) {
    const note = document.createElement('p');
    note.className = 'setting-note';
    note.textContent = `キャラ「${err.id}」を読み込めませんでした：${err.message}`;
    body.appendChild(note);
  }

  // パッケージ書き出し／読み込み／削除（ユーザー追加キャラ）
  const pkgRow = document.createElement('div');
  pkgRow.className = 'setting-row';
  const pkgLabel = document.createElement('span');
  pkgLabel.className = 's-label';
  pkgLabel.textContent = 'キャラ設定パッケージ';
  pkgRow.appendChild(pkgLabel);
  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'mini-action';
  exportBtn.textContent = '書き出し';
  exportBtn.addEventListener('click', async () => {
    const r = await window.maid.exportCharacter(curDef.id);
    regState.status = r && r.ok ? `書き出しました：${r.path}` :
      (r && r.canceled ? '' : `書き出しに失敗しました：${(r && r.error) || ''}`);
    renderSettings();
  });
  pkgRow.appendChild(exportBtn);
  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.className = 'mini-action';
  importBtn.textContent = '読み込み';
  importBtn.addEventListener('click', async () => {
    const r = await window.maid.importCharacter();
    if (r && r.ok) {
      regState.status = `キャラを読み込みました（ID: ${r.id}）`;
      if (r.state) state = r.state;
      render();
    } else {
      regState.status = r && r.canceled ? '' : `読み込みに失敗しました：${(r && r.error) || ''}`;
      renderSettings();
    }
  });
  pkgRow.appendChild(importBtn);
  if (!curDef.builtin) {
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'mini-action';
    delBtn.textContent = 'このキャラを削除';
    delBtn.addEventListener('click', async () => {
      state = await window.maid.deleteCharacter(curDef.id);
      regState.status = `「${curDef.name}」を削除しました`;
      render();
    });
    pkgRow.appendChild(delBtn);
  }
  body.appendChild(pkgRow);

  // キャラクター追加は通常の設定項目とは別機能なので、枠付きの独立
  // セクションとして描く（実機報告：設定にそのまま付いていて分かりにくい）。
  const regSection = document.createElement('section');
  regSection.className = 'settings-subsection';
  regSection.setAttribute('aria-label', 'キャラクター追加');
  body.appendChild(regSection);
  renderRegistrationForm(regSection);

  const hAnchor = document.createElement('h3');
  hAnchor.textContent = '2週間周期';
  body.appendChild(hAnchor);
  const anchorRow = document.createElement('div');
  anchorRow.className = 'setting-row';
  const anchorLabel = document.createElement('span');
  anchorLabel.className = 's-label';
  anchorLabel.textContent = 'アンカー日（周期の開始日）';
  anchorRow.appendChild(anchorLabel);
  const anchorInput = document.createElement('input');
  anchorInput.type = 'date';
  anchorInput.value = state.settings.biweeklyAnchor || '';
  anchorInput.addEventListener('change', async () => {
    if (anchorInput.value) {
      state = await window.maid.setAnchor(anchorInput.value);
      render();
    }
  });
  anchorRow.appendChild(anchorInput);
  body.appendChild(anchorRow);

  const hNotify = document.createElement('h3');
  hNotify.textContent = '項目ごとの通知（オン/オフは保存のみ・通知の発火はフェーズ1）';
  body.appendChild(hNotify);
  for (const period of PERIODS) {
    const sub = document.createElement('h3');
    sub.textContent = state.periodLabels[period];
    body.appendChild(sub);
    for (const item of periodItems(period)) {
      const row = document.createElement('div');
      row.className = 'setting-row';
      const label = document.createElement('span');
      label.className = 's-label';
      label.textContent = item.name;
      row.appendChild(label);
      const sw = document.createElement('label');
      sw.className = 'switch';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = notifyValueOf(item);
      input.addEventListener('change', async () => {
        state = await window.maid.setNotify(item.id, input.checked);
        render();
      });
      const track = document.createElement('span');
      track.className = 'track';
      sw.appendChild(input);
      sw.appendChild(track);
      row.appendChild(sw);
      body.appendChild(row);
    }
  }
}

/* ---- 初回起動時の呼び方選択（feat/settings） ---- */
function renderFirstRun() {
  const overlay = document.getElementById('firstrun-overlay');
  if (!overlay || !state || !state.settings) return;
  overlay.classList.toggle('hidden', !!state.settings.address);
  // 初回選択が済んでいない時は、潰れたドック状態で始まっても選択肢が見えるよう展開へ寄せる
  if (!state.settings.address && dockMode() !== 'expanded') setDock('expanded');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-address]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state = await window.maid.setAddress(btn.getAttribute('data-address'));
      render();
      say('greeting');
    });
  });
});

window.addEventListener('DOMContentLoaded', () => {
  window.maid.onState((s) => { state = s; render(); });
  // 設定の開閉：閉じるボタンだけでなく、設定ボタンの再押し（トグル）と
  // Esc キーでも閉じられるようにする（実機報告：閉じるためだけに毎回
  // パネル上部のボタンまで行く必要があった）。
  const settingsOverlay = document.getElementById('settings-overlay');
  const setSettingsOpen = (open) => settingsOverlay.classList.toggle('hidden', !open);
  document.getElementById('btn-settings').addEventListener('click', () => {
    setSettingsOpen(settingsOverlay.classList.contains('hidden'));
  });
  document.getElementById('btn-settings-close').addEventListener('click', () => {
    setSettingsOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsOverlay.classList.contains('hidden')) {
      setSettingsOpen(false);
    }
  });

  /* ドックの状態遷移（feat/dock-states）
   * 展開→ミニ／最小化：ヘッダーのボタン（明示操作）。
   *   チェック作業中にマウスが外へ出ることは多く、ホバー解除で自動で
   *   畳むと作業を邪魔するので、戻る操作はボタンに寄せる。
   * ミニ→展開：バーのホバー（650ms 置く）かクリック（ボタン以外）。
   * 最小化→ミニ：アイコンのホバー（650ms）かクリック。 */
  document.getElementById('btn-to-mini').addEventListener('click', () => setDock('mini'));
  document.getElementById('btn-to-minimized').addEventListener('click', () => setDock('minimized'));
  document.getElementById('btn-quit').addEventListener('click', () => window.maid.quitApp());

  let hoverTimer = null;
  const armHover = (el, fn) => {
    el.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(fn, 650);
    });
    el.addEventListener('mouseleave', () => clearTimeout(hoverTimer));
  };

  const miniView = document.getElementById('view-mini');
  armHover(miniView, () => setDock('expanded'));
  miniView.addEventListener('click', () => setDock('expanded'));
  document.getElementById('mini-char').addEventListener('click', (e) => {
    e.stopPropagation(); // キャラをクリックした時は展開せず SD ジャンプ
    playMiniScene('praise');
  });
  document.getElementById('btn-mini-expand').addEventListener('click', (e) => { e.stopPropagation(); setDock('expanded'); });
  document.getElementById('btn-mini-tasks').addEventListener('click', (e) => { e.stopPropagation(); setDock('expanded'); });
  document.getElementById('btn-mini-settings').addEventListener('click', (e) => {
    e.stopPropagation();
    pendingOpenSettings = true;
    setDock('expanded');
  });
  document.getElementById('btn-mini-minimize').addEventListener('click', (e) => { e.stopPropagation(); setDock('minimized'); });

  const minView = document.getElementById('view-minimized');
  armHover(minView, () => setDock('mini'));
  document.getElementById('btn-restore').addEventListener('click', () => setDock('mini'));

  refresh();
});
