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
function renderChecklist() { /* 後続ブランチで実装 */ }

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
