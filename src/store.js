'use strict';
// src/store.js — ローカルJSONへの保存層（外部送信なし）
// 書き込みは一時ファイル＋リネームで、途中終了でも壊れにくくする。
const fs = require('fs');
const path = require('path');
const { normalizeState } = require('./lifecycle');

function loadState(filePath, now) {
  let rawText;
  try {
    rawText = fs.readFileSync(filePath, 'utf8');
  } catch {
    return normalizeState(null, now); // ファイルが無い（初回起動）など
  }
  try {
    return normalizeState(JSON.parse(rawText), now);
  } catch {
    // 読めない元データは退避してから初期状態で始める（レビュー中8：
    // 黙って初期化して次の保存で上書きしてしまわないように）
    try {
      fs.renameSync(filePath, `${filePath}.corrupt-${Date.now()}`);
    } catch { /* 退避できなくても起動は続ける */ }
    return normalizeState(null, now);
  }
}

function saveState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

module.exports = { loadState, saveState };
