'use strict';
// src/resources.js — 数値管理の純粋ロジック（DESIGN.md §2 #7）
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

module.exports = { RESOURCE_DEFS, DEFAULT_VALUES, clampValue, applyRecovery, adjustValue, isFull };
