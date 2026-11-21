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
  renderMini();
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

function playMiniClip(kind) {
  if (!miniVideo) return;
  const sd = clipsFor(currentCharacterId(), 'sd');
  miniClipKind = sd[kind] ? kind : 'idle';
  const src = sd[miniClipKind];
  miniVideo.loop = miniClipKind === 'idle';
  if (miniVideo.getAttribute('src') !== src) miniVideo.setAttribute('src', src);
  try { miniVideo.currentTime = 0; } catch { /* メタデータ未読込時は無視 */ }
  const p = miniVideo.play();
  if (p && typeof p.catch === 'function') p.catch(() => { /* 自動再生不可の環境では静止画のまま */ });
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
    if (miniVideo) { try { miniVideo.pause(); } catch { /* 無視 */ } }
    return;
  }
  wrap.style.display = '';
  wrap.title = currentCharacterLabel();
  // キャラが切り替わっていたら、SD クリップも新しいキャラのものへ作り替える
  if (miniVideo && miniCharacter !== currentCharacterId()) {
    miniVideo = null;
    wrap.innerHTML = '';
  }
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
    miniVideo.addEventListener('error', () => {
      wrap.innerHTML = `<div class="avatar-placeholder">${currentCharacterLabel()}</div>`;
      miniVideo = null;
    });
    wrap.appendChild(miniVideo);
    playMiniClip('idle');
    // 展開側で褒められた直後にミニへ戻ってきたら、SD ジャンプで迎える
    if (Date.now() - lastPraiseAt < 5000) playMiniClip('praise');
  } else if (!miniVideo.getAttribute('src') || miniVideo.paused) {
    playMiniClip(miniClipKind);
  }
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
    playClip('praise');
  } else {
    say('praise');
    playClip('praise');
  }
}

/* ---- 数値管理（feat/resources-ui） ----
 * 回復はメイン側が境界で自動加算する。ここは表示と手動の増減だけ。
 * 上限到達は「満タン」表示で知らせる（通知の発火はフェーズ1）。 */
function renderResources() {
  const wrap = document.getElementById('resources');
  if (!wrap || !state || !state.resources) return;
  const { defs, values } = state.resources;
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
    wrap.appendChild(row);
  }
}

/* ---- キャラ表示＋吹き出し（feat/video-display → feat/dock-states → feat/suzuran-video） ----
 * メイドを動画クリップで表示する（Mesh Avatar から置き換え、2026-11-22 あすか決定）。
 *   起動時：挨拶クリップを1回 → 待機ループ
 *   チェック時／周期の全完了時：褒めるクリップを1回 → 待機へ復帰
 * 等身クリップは展開（メイン）表示専用、SD クリップは待機（ミニ）表示専用。
 * 割当はドックの状態で決まる（旧・ステージの高さによる SD 切替は廃止）。
 * 設定でエージェント表示をオフにすると、キャラ表示と吹き出しは完全に消え、
 * 数値管理はリスト側へ移して管理機能だけが残る。 */
const CHARACTER_LABELS = { momo: 'モモ', suzuran: 'スズラン', mimoza: 'ミモザ' };
const CLIPS = {
  momo: {
    full: {
      idle: 'assets/momo-idle.mp4', // 0〜4.0s にトリミング済み（煙の崩れ区間を回避）
      greeting: 'assets/momo-greeting.mp4',
      praise: 'assets/momo-praise.mp4',
    },
    sd: {
      idle: 'assets/momo-sd-idle.mp4',
      greeting: null, // SD の挨拶クリップは無いので待機で代用する
      praise: 'assets/momo-sd-jump.mp4',
    },
  },
  suzuran: {
    full: {
      // 待機は原画クリップ 0〜2.0s のクリーン区間（背景変形・カメラ寄りの前）を往復再生化
      idle: 'assets/suzuran-idle.mp4',
      greeting: 'assets/suzuran-greeting.mp4', // 0〜7s（お辞儀→復帰まで）
      praise: 'assets/suzuran-praise.mp4',
    },
    sd: {
      idle: 'assets/suzuran-sd-idle.mp4', // 待機は 0〜2.0s のクリーン区間を往復再生化
      greeting: null, // SD の挨拶クリップは無いので待機で代用する
      praise: 'assets/suzuran-sd-jump.mp4',
    },
  },
};

function currentCharacterId() {
  return (state && state.settings && state.settings.character) || 'momo';
}
function currentCharacterLabel() {
  return CHARACTER_LABELS[currentCharacterId()] || 'モモ';
}
function clipsFor(character, form) {
  const set = CLIPS[character] || CLIPS.momo;
  return set[form] || set.full;
}

let videoEl = null;
let charStarted = false;
let greeted = false;
let displayedCharacter = null;
let clipKind = 'idle'; // 'idle' | 'greeting' | 'praise'
let lastLineKind = null;
let lastLineText = '';
let lastPraiseAt = 0; // 直近の褒めイベント（ミニへ戻った直後なら SD ジャンプで迎える）

function agentEnabled() {
  return !state || !state.settings || state.settings.showAgent !== false;
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

function playClip(kind) {
  if (!videoEl || !agentEnabled()) return;
  const full = clipsFor(currentCharacterId(), 'full');
  clipKind = full[kind] ? kind : 'idle';
  const src = currentClipSrc(clipKind);
  videoEl.loop = clipKind === 'idle';
  if (videoEl.getAttribute('src') !== src) videoEl.setAttribute('src', src);
  try { videoEl.currentTime = 0; } catch { /* メタデータ未読込時は無視 */ }
  const p = videoEl.play();
  if (p && typeof p.catch === 'function') p.catch(() => { /* 自動再生不可の環境では静止画のまま */ });
}

function stopCharacter() {
  if (videoEl) {
    try { videoEl.pause(); } catch { /* 無視 */ }
    videoEl.removeAttribute('src');
    try { videoEl.load(); } catch { /* 無視 */ }
  }
  clipKind = 'idle';
}

function renderCharacter() {
  const stage = document.getElementById('avatar-stage');
  if (!stage) return;
  if (!agentEnabled()) {
    stopCharacter();
    return;
  }
  // 等身クリップは展開表示の時だけ鳴らす（ミニ／最小化では止めておく）
  if (dockMode() !== 'expanded') {
    if (videoEl) { try { videoEl.pause(); } catch { /* 無視 */ } }
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
    videoEl.addEventListener('error', () => {
      mount.innerHTML = `<div class="avatar-placeholder">${currentCharacterLabel()}（動画を読み込めませんでした）</div>`;
      videoEl = null;
      charStarted = false;
    });
    mount.appendChild(videoEl);
    playClip('idle');
  } else if (videoEl && (!videoEl.getAttribute('src') || videoEl.paused)) {
    // オフ→オン、または他モードから展開に戻った時は再生を再開する
    playClip(clipKind);
  }
  if (!greeted && state && state.settings) {
    greeted = true;
    playClip('greeting');
    say('greeting');
  }
}

// 台詞の種別（greeting/praise/complete）から選んで吹き出しに出す。
// 直前と同じ文は避ける（カーナビ式のバリエーションを活かす）。
function say(kind) {
  if (!agentEnabled()) return;
  if (!state || !state.lines) return;
  const address = state.settings.address || 'ご主人様';
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
 * 呼び方の変更、キャラ選択（モモ／スズラン有効、ミモザは準備中）、
 * 2週間周期のアンカー日、項目ごとの通知オン/オフ（保存のみ・発火はフェーズ1）。 */
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
  charLabel.textContent = '常駐するメイド';
  charRow.appendChild(charLabel);
  const charSel = document.createElement('select');
  const chars = [
    { id: 'momo', label: 'モモ', ready: true },
    { id: 'suzuran', label: 'スズラン', ready: true },
    { id: 'mimoza', label: 'ミモザ（準備中）', ready: false },
  ];
  for (const c of chars) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.label;
    opt.disabled = !c.ready;
    if (state.settings.character === c.id) opt.selected = true;
    charSel.appendChild(opt);
  }
  charSel.addEventListener('change', async () => {
    state = await window.maid.setCharacter(charSel.value);
    render();
  });
  charRow.appendChild(charSel);
  body.appendChild(charRow);

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
  document.getElementById('btn-settings').addEventListener('click', () => {
    document.getElementById('settings-overlay').classList.remove('hidden');
  });
  document.getElementById('btn-settings-close').addEventListener('click', () => {
    document.getElementById('settings-overlay').classList.add('hidden');
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
    playMiniClip('praise');
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
