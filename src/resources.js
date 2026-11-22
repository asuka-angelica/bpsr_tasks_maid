'use strict';
// src/resources.js — 数値管理の純粋ロジック
// ボス鍵・精鋭鍵：上限6、毎日5:00に+2。フォーカス：上限2000、毎日5:00に+400。
// 回復は境界を跨いだ日数ぶんまとめて加算し、上限で止める。消費は手動。

const RESOURCE_DEFS = {
  bossKey: { label: 'ボス鍵', max: 6, perDay: 2, step: 1 },
  eliteKey: { label: '精鋭鍵', max: 6, perDay: 2, step: 1 },
  focus: { label: 'フォーカス', max: 2000, perDay: 400, step: 100 },
};

const DEFAULT_VALUES = { bossKey: 6, eliteKey: 6, focus: 2000 };

function defOf(id) {
  const def = RESOURCE_DEFS[id];
  if (!def) throw new Error(`unknown resource: ${id}`);
  return def;
}

function clampValue(id, v) {
  const def = defOf(id);
  const n = Number.isFinite(v) ? Math.round(v) : 0;
  return Math.min(def.max, Math.max(0, n));
}

function applyRecovery(values, days) {
  const out = { ...values };
  if (!days || days <= 0) return out;
  for (const id of Object.keys(RESOURCE_DEFS)) {
    const def = RESOURCE_DEFS[id];
    out[id] = clampValue(id, (out[id] || 0) + def.perDay * days);
  }
  return out;
}

function adjustValue(values, id, delta) {
  const out = { ...values };
  out[id] = clampValue(id, (out[id] || 0) + delta);
  return out;
}

function isFull(values, id) {
  return (values[id] || 0) >= defOf(id).max;
}

// 上限超えの見通し（表示用）：次回回復（1日分）を足した時に溢れる量を返す。
// show = 満タン、または次回回復で溢れる場合に警告表示を出す条件。
function overflowInfo(values, id) {
  const def = defOf(id);
  const value = values[id] || 0;
  const room = Math.max(0, def.max - value);
  const overflowNext = Math.max(0, value + def.perDay - def.max);
  const full = value >= def.max;
  return {
    value,
    max: def.max,
    perDay: def.perDay,
    room,
    full,
    overflowNext,
    show: full || overflowNext > 0,
  };
}

module.exports = { RESOURCE_DEFS, DEFAULT_VALUES, clampValue, applyRecovery, adjustValue, isFull, overflowInfo };
