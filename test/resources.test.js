'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RESOURCE_DEFS, applyRecovery, adjustValue, isFull, clampValue,
} = require('../src/resources');

test('applyRecovery: 鍵は1日+2、フォーカスは1日+400', () => {
  const out = applyRecovery({ bossKey: 0, eliteKey: 1, focus: 0 }, 1);
  assert.deepEqual(out, { bossKey: 2, eliteKey: 3, focus: 400 });
});

test('applyRecovery: 上限で止まる', () => {
  const out = applyRecovery({ bossKey: 5, eliteKey: 6, focus: 1900 }, 3);
  assert.deepEqual(out, { bossKey: 6, eliteKey: 6, focus: 2000 });
});

test('applyRecovery: 0日・負の日数は何もしない', () => {
  const v = { bossKey: 3, eliteKey: 3, focus: 100 };
  assert.deepEqual(applyRecovery(v, 0), v);
  assert.deepEqual(applyRecovery(v, -2), v);
});

test('applyRecovery: 入力を書き換えない', () => {
  const v = { bossKey: 0, eliteKey: 0, focus: 0 };
  applyRecovery(v, 2);
  assert.deepEqual(v, { bossKey: 0, eliteKey: 0, focus: 0 });
});

test('adjustValue: 0と上限でクランプする', () => {
  assert.equal(adjustValue({ bossKey: 0 }, 'bossKey', -1).bossKey, 0);
  assert.equal(adjustValue({ bossKey: 6 }, 'bossKey', 1).bossKey, 6);
  assert.equal(adjustValue({ focus: 1950 }, 'focus', 100).focus, 2000);
  assert.equal(adjustValue({ focus: 50 }, 'focus', -100).focus, 0);
});

test('clampValue / isFull / 定義の整合', () => {
  assert.equal(clampValue('focus', 99999), 2000);
  assert.equal(isFull({ bossKey: 6 }, 'bossKey'), true);
  assert.equal(isFull({ bossKey: 5 }, 'bossKey'), false);
  for (const [id, def] of Object.entries(RESOURCE_DEFS)) {
    assert.ok(def.max > 0 && def.perDay > 0, id);
  }
});
