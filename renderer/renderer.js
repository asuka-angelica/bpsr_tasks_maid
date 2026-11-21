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

// チェック時のキャラ反応（feat/character で実装）
function onItemChecked() { /* 後続ブランチで実装 */ }

/* ---- 数値管理（feat/resources） ---- */
function renderResources() { /* 後続ブランチで実装 */ }

/* ---- キャラ表示＋吹き出し（feat/character） ---- */
function renderCharacter() { /* 後続ブランチで実装 */ }
function say() { /* 後続ブランチで実装 */ }

/* ---- 設定（feat/settings） ---- */
function renderSettings() { /* 後続ブランチで実装 */ }
function renderFirstRun() { /* 後続ブランチで実装 */ }

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
