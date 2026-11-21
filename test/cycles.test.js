'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  dailyKey, weeklyKey, biweeklyKey, dailyBoundariesCrossed,
} = require('../src/cycles');

// ローカル時刻で日時を作る（テストは実行環境のTZに依存しない形にする）
const D = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

test('dailyKey: 5:00より前は前日のキー', () => {
  assert.equal(dailyKey(D(2026, 11, 21, 4, 59)), '2026-11-20');
  assert.equal(dailyKey(D(2026, 11, 21, 0, 0)), '2026-11-20');
});

test('dailyKey: 5:00ちょうどから当日のキー', () => {
  assert.equal(dailyKey(D(2026, 11, 21, 5, 0)), '2026-11-21');
  assert.equal(dailyKey(D(2026, 11, 21, 23, 59)), '2026-11-21');
});

test('weeklyKey: 週のキーは月曜の日付（2026-11-21は土曜）', () => {
  assert.equal(weeklyKey(D(2026, 11, 21, 12)), '2026-11-16');
  assert.equal(weeklyKey(D(2026, 11, 22, 12)), '2026-11-16'); // 日曜も同じ週
  assert.equal(weeklyKey(D(2026, 11, 23, 12)), '2026-11-23'); // 月曜から次の週
});

test('weeklyKey: 月曜5:00より前は前週のキー', () => {
  assert.equal(weeklyKey(D(2026, 11, 16, 4, 59)), '2026-11-09');
  assert.equal(weeklyKey(D(2026, 11, 16, 5, 0)), '2026-11-16');
});

test('biweeklyKey: アンカーから14日ごとに区切る', () => {
  const anchor = '2026-11-16';
  assert.equal(biweeklyKey(D(2026, 11, 16, 12), anchor), '2026-11-16');
  assert.equal(biweeklyKey(D(2026, 11, 29, 12), anchor), '2026-11-16');
  assert.equal(biweeklyKey(D(2026, 11, 30, 12), anchor), '2026-11-30');
  assert.equal(biweeklyKey(D(2026, 12, 14, 12), anchor), '2026-12-14');
});

test('biweeklyKey: アンカーより前は負方向にも区切る', () => {
  assert.equal(biweeklyKey(D(2026, 11, 10, 12), '2026-11-16'), '2026-11-02');
  assert.equal(biweeklyKey(D(2026, 11, 2, 12), '2026-11-16'), '2026-11-02');
  assert.equal(biweeklyKey(D(2026, 11, 1, 12), '2026-11-16'), '2026-10-19');
});

test('biweeklyKey: 5:00より前は前日の周期日に属する', () => {
  assert.equal(biweeklyKey(D(2026, 11, 30, 4, 0), '2026-11-16'), '2026-11-16');
  assert.equal(biweeklyKey(D(2026, 11, 30, 5, 0), '2026-11-16'), '2026-11-30');
});

test('dailyBoundariesCrossed: 同じ周期日内は0', () => {
  assert.equal(dailyBoundariesCrossed(D(2026, 11, 21, 10), D(2026, 11, 21, 23)), 0);
  assert.equal(dailyBoundariesCrossed(D(2026, 11, 21, 10), D(2026, 11, 22, 4)), 0); // 22日4時は21日の周期日
});

test('dailyBoundariesCrossed: 境界を跨いだ日数を数える', () => {
  assert.equal(dailyBoundariesCrossed(D(2026, 11, 21, 10), D(2026, 11, 22, 6)), 1);
  assert.equal(dailyBoundariesCrossed(D(2026, 11, 21, 10), D(2026, 11, 24, 10)), 3);
  assert.equal(dailyBoundariesCrossed(D(2026, 11, 21, 4), D(2026, 11, 21, 6)), 1); // 4時は前周期日
});

test('dailyBoundariesCrossed: 逆方向は0に丸める', () => {
  assert.equal(dailyBoundariesCrossed(D(2026, 11, 22, 10), D(2026, 11, 21, 10)), 0);
});
