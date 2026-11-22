'use strict';
// src/lifecycle.js — 状態の形と時間経過による遷移（純粋関数）
// 起動時と境界通過時に advanceState を通し、周期キーが変わった周期の
// チェックを外す。あわせて資源の自動回復（毎日5:00境界ぶん）を適用する。

const { PERIODS, periodKey, dailyBoundariesCrossed } = require('./cycles');
const { DEFAULT_VALUES, applyRecovery, adjustValue } = require('./resources');

const DEFAULT_ANCHOR = '2026-11-16'; // 2週間周期のアンカー（月曜）

// 右端ドックの3態（レイアウトイメージ正本：最小化／待機ミニ／展開メイン）
const DOCK_MODES = ['expanded', 'mini', 'minimized'];
const DEFAULT_DOCK_MODE = 'expanded';

function defaultState(now, anchor = DEFAULT_ANCHOR) {
  const checks = {};
  for (const p of PERIODS) checks[p] = { key: periodKey(p, now, anchor), done: {} };
  return {
    version: 1,
    settings: {
      address: null, // 'ご主人様' | 'お嬢様'（初回選択までは null）
      character: 'momo',
      showAgent: true, // エージェント（キャラ表示）のオン/オフ。管理専用ではオフにできる
      voiceEnabled: true, // ボイス再生のオン/オフ（挨拶・褒め・全完了。再生自体はフェーズ1）
      showBubble: true, // 吹き出し（台詞表示）のオン/オフ。オフでもキャラ表示は残る
      dockMode: DEFAULT_DOCK_MODE, // ドックの表示状態（expanded/mini/minimized）
      notify: {}, // itemId -> bool（未設定はプリセットの既定に従う）
      biweeklyAnchor: anchor,
    },
    checks,
    resources: {
      values: { ...DEFAULT_VALUES },
      lastRecoveryAt: now.toISOString(),
    },
  };
}

// 欠けた項目を既定で埋める（保存データの世代差・欠損への耐性）
function normalizeState(raw, now) {
  const base = defaultState(now);
  if (!raw || typeof raw !== 'object') return base;
  const out = {
    version: 1,
    settings: { ...base.settings, ...(raw.settings || {}) },
    checks: {},
    resources: {
      values: { ...DEFAULT_VALUES, ...((raw.resources && raw.resources.values) || {}) },
      lastRecoveryAt: (raw.resources && raw.resources.lastRecoveryAt) || now.toISOString(),
    },
  };
  // dockMode は想定外の値を既定へ戻す（壊れた保存データで表示が消えないように）
  if (!DOCK_MODES.includes(out.settings.dockMode)) out.settings.dockMode = DEFAULT_DOCK_MODE;
  for (const p of PERIODS) {
    const c = raw.checks && raw.checks[p];
    out.checks[p] = c && typeof c.key === 'string'
      ? { key: c.key, done: { ...(c.done || {}) } }
      : base.checks[p];
  }
  return out;
}

// 時間経過を状態へ反映する。戻り値: { state, events: { resetPeriods, recoveredDays } }
function advanceState(state, now) {
  const next = structuredClone(state);
  const events = { resetPeriods: [], recoveredDays: 0 };
  const anchor = next.settings.biweeklyAnchor || DEFAULT_ANCHOR;
  for (const p of PERIODS) {
    const key = periodKey(p, now, anchor);
    if (next.checks[p].key !== key) {
      next.checks[p] = { key, done: {} };
      events.resetPeriods.push(p);
    }
  }
  const last = new Date(next.resources.lastRecoveryAt);
  const crossed = Number.isNaN(last.getTime()) ? 0 : dailyBoundariesCrossed(last, now);
  if (crossed > 0) {
    next.resources.values = applyRecovery(next.resources.values, crossed);
    next.resources.lastRecoveryAt = now.toISOString();
    events.recoveredDays = crossed;
  }
  return { state: next, events };
}

function toggleCheck(state, period, itemId) {
  const next = structuredClone(state);
  const done = next.checks[period].done;
  if (done[itemId]) delete done[itemId];
  else done[itemId] = true;
  return next;
}

function adjustResource(state, id, delta) {
  const next = structuredClone(state);
  next.resources.values = adjustValue(next.resources.values, id, delta);
  return next;
}

function isPeriodComplete(state, period, items) {
  const done = state.checks[period].done;
  return items.length > 0 && items.every((it) => done[it.id]);
}

module.exports = {
  DEFAULT_ANCHOR,
  DOCK_MODES,
  DEFAULT_DOCK_MODE,
  defaultState,
  normalizeState,
  advanceState,
  toggleCheck,
  adjustResource,
  isPeriodComplete,
};
