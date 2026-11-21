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
  renderChecklist();
  renderResources();
  renderCharacter();
  renderSettings();
  renderFirstRun();
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

// チェック時のキャラ反応：チェックで褒め＋笑顔、その周期の全完了で特別な褒め
function onItemChecked(period, item, checked, complete) {
  if (!checked) return;
  if (complete) {
    say('complete');
    reactAvatar('smile', 3500);
  } else {
    say('praise');
    reactAvatar('smile', 2200);
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

/* ---- キャラ表示＋吹き出し（feat/character） ----
 * モモ（momo3.mavatar）を mesh-avatar コンポーネントで表示し、
 * アイドルモーションで常駐させる。表情は Viewer と同じ API
 * （setExpression / setParameters）で切り替える。 */
let avatar = null;
let avatarStarted = false;
let greeted = false;
let lastLineKind = null;
let lastLineText = '';

function renderCharacter() {
  const stage = document.getElementById('avatar-stage');
  if (!stage) return;
  // 描画先は正方形の枠（avatar-frame）。無ければステージ自体に描く。
  const mount = document.getElementById('avatar-frame') || stage;
  if (!avatarStarted) {
    avatarStarted = true;
    mount.innerHTML = '';
    const el = document.createElement('mesh-avatar');
    el.id = 'avatar';
    el.setAttribute('src', 'assets/momo3.mavatar');
    el.setAttribute('label', 'モモのアバター');
    mount.appendChild(el);
    const script = document.createElement('script');
    script.src = 'assets/mesh-avatar.js';
    document.body.appendChild(script);
    el.addEventListener('load', (ev) => { avatar = ev.detail.avatar; });
    el.addEventListener('error', () => {
      mount.innerHTML = '<div class="avatar-placeholder">モモ（読み込みに失敗しました）</div>';
    });
  }
  if (!greeted && state && state.settings) {
    greeted = true;
    say('greeting');
  }
}

// 台詞の種別（greeting/praise/complete）から選んで吹き出しに出す。
// 直前と同じ文は避ける（カーナビ式のバリエーションを活かす）。
function say(kind) {
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

function reactAvatar(expression, ms) {
  if (!avatar) return;
  try {
    avatar.setExpression(expression);
    setTimeout(() => {
      if (!avatar) return;
      try { avatar.setExpression('neutral'); avatar.setParameters({}); } catch { /* 復帰失敗は無視 */ }
    }, ms);
  } catch { /* 表情が使えない環境では吹き出しだけ */ }
}

/* ---- 設定（feat/settings） ----
 * 呼び方の変更、キャラ選択（モモのみ有効、他は準備中）、
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
    { id: 'suzuran', label: 'スズラン（準備中）', ready: false },
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
  refresh();
});
