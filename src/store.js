'use strict';
// src/store.js — ローカルJSONへの保存層（外部送信なし）
// 書き込みは一時ファイル＋リネームで、途中終了でも壊れにくくする。
const fs = require('fs');
const path = require('path');
const { normalizeState } = require('./lifecycle');

function loadState(filePath, now) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return normalizeState(raw, now);
  } catch {
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
