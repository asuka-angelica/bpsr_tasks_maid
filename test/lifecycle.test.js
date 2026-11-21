'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  defaultState, normalizeState, advanceState, toggleCheck, isPeriodComplete,
} = require('../src/lifecycle');
const { PRESETS } = require('../src/presets');

const D = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

test('defaultState: 周期キーは現在時刻のもの、資源は満タン', () => {
  const s = defaultState(D(2026, 11, 21, 10));
  assert.equal(s.checks.daily.key, '2026-11-21');
  assert.equal(s.checks.weekly.key, '2026-11-16');
  assert.equal(s.checks.biweekly.key, '2026-11-16');
  assert.deepEqual(s.resources.values, { bossKey: 6, eliteKey: 6, focus: 2000 });
  assert.equal(s.settings.address, null);
});

test('advanceState: 同じ周期日内では何も起きない', () => {
  const s = defaultState(D(2026, 11, 21, 10));
  const { events } = advanceState(s, D(2026, 11, 21, 23));
  assert.deepEqual(events, { resetPeriods: [], recoveredDays: 0 });
});

test('advanceState: 日を跨ぐとデイリーがリセットされ資源が回復する', () => {
  let s = defaultState(D(2026, 11, 21, 10));
  s = toggleCheck(s, 'daily', 'daily-activity');
  s.resources.values = { bossKey: 3, eliteKey: 0, focus: 100 };
  const { state: next, events } = advanceState(s, D(2026, 11, 22, 10));
  assert.deepEqual(events.resetPeriods, ['daily']);
  assert.deepEqual(next.checks.daily.done, {});
  assert.equal(next.checks.daily.key, '2026-11-22');
  assert.deepEqual(next.resources.values, { bossKey: 5, eliteKey: 2, focus: 500 });
  assert.equal(events.recoveredDays, 1);
  // 元の状態は書き換えない
  assert.equal(s.checks.daily.done['daily-activity'], true);
});

test('advanceState: 月曜5:00を跨ぐとウィークリーもリセットされる', () => {
  let s = defaultState(D(2026, 11, 22, 10)); // 日曜
  s = toggleCheck(s, 'weekly', 'weekly-raid');
  const { state: next, events } = advanceState(s, D(2026, 11, 23, 10)); // 月曜
  assert.ok(events.resetPeriods.includes('weekly'));
  assert.deepEqual(next.checks.weekly.done, {});
});

test('advanceState: 2週間境界を跨ぐと隔週もリセットされる', () => {
  let s = defaultState(D(2026, 11, 29, 10));
  s = toggleCheck(s, 'biweekly', 'biweekly-relics');
  const { state: next, events } = advanceState(s, D(2026, 11, 30, 10));
  assert.ok(events.resetPeriods.includes('biweekly'));
  assert.deepEqual(next.checks.biweekly.done, {});
});

test('advanceState: 数日空けても回復は跨いだ日数ぶん（上限あり）', () => {
  let s = defaultState(D(2026, 11, 21, 10));
  s.resources.values = { bossKey: 0, eliteKey: 0, focus: 0 };
  const { state: next, events } = advanceState(s, D(2026, 11, 24, 10));
  assert.equal(events.recoveredDays, 3);
  assert.deepEqual(next.resources.values, { bossKey: 6, eliteKey: 6, focus: 1200 });
});

test('toggleCheck: オン・オフが切り替わる', () => {
  let s = defaultState(D(2026, 11, 21, 10));
  s = toggleCheck(s, 'daily', 'daily-unstable');
  assert.equal(s.checks.daily.done['daily-unstable'], true);
  s = toggleCheck(s, 'daily', 'daily-unstable');
  assert.equal(s.checks.daily.done['daily-unstable'], undefined);
});

test('isPeriodComplete: 全項目チェックで true', () => {
  let s = defaultState(D(2026, 11, 21, 10));
  assert.equal(isPeriodComplete(s, 'biweekly', PRESETS.biweekly), false);
  s = toggleCheck(s, 'biweekly', 'biweekly-relics');
  assert.equal(isPeriodComplete(s, 'biweekly', PRESETS.biweekly), true);
});

test('normalizeState: 壊れた・欠けたデータでも既定で埋まる', () => {
  const s = normalizeState({ settings: { address: 'お嬢様' } }, D(2026, 11, 21, 10));
  assert.equal(s.settings.address, 'お嬢様');
  assert.equal(s.checks.daily.key, '2026-11-21');
  assert.deepEqual(s.resources.values, { bossKey: 6, eliteKey: 6, focus: 2000 });
  assert.equal(normalizeState(null, D(2026, 11, 21, 10)).settings.character, 'momo');
});

test('showAgent: 既定はオン、保存済みのオフは保持され、欠けていればオンで埋まる', () => {
  assert.equal(defaultState(D(2026, 11, 21, 10)).settings.showAgent, true);
  const off = normalizeState({ settings: { showAgent: false } }, D(2026, 11, 21, 10));
  assert.equal(off.settings.showAgent, false);
  const missing = normalizeState({ settings: {} }, D(2026, 11, 21, 10));
  assert.equal(missing.settings.showAgent, true);
});
