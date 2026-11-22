'use strict';
// clipguard（クリップ切替の直列化とエラー復帰の判断）のテスト。
// 不具合2（チェック→解除で動画が読み込めなくなる）の再発防止として、
// 「読み込み中の切替は保留」「エラーは段階的に復帰」の判断を固定する。
const test = require('node:test');
const assert = require('node:assert/strict');
const { nextAction, errorAction } = require('../renderer/clipguard');

test('nextAction: 要求なしは none', () => {
  assert.equal(nextAction({ currentSrc: 'a.mp4', requestedSrc: null, inFlight: false, readyState: 4 }), 'none');
});

test('nextAction: 別クリップへの通常切替は switch', () => {
  assert.equal(nextAction({ currentSrc: 'idle.mp4', requestedSrc: 'praise.mp4', inFlight: false, readyState: 4 }), 'switch');
});

test('nextAction: 切替の読み込み中は別クリップ要求を defer（割り込み回避）', () => {
  assert.equal(nextAction({ currentSrc: 'greeting.mp4', requestedSrc: 'praise.mp4', inFlight: true, readyState: 0 }), 'defer');
});

test('nextAction: 同じクリップの再要求は restart（褒めの再生し直し）', () => {
  assert.equal(nextAction({ currentSrc: 'praise.mp4', requestedSrc: 'praise.mp4', inFlight: false, readyState: 4 }), 'restart');
});

test('nextAction: 同じクリップでも読み込み中は触らない', () => {
  assert.equal(nextAction({ currentSrc: 'praise.mp4', requestedSrc: 'praise.mp4', inFlight: true, readyState: 0 }), 'none');
});

test('nextAction: 同じクリップでメタデータ未着なら触らない', () => {
  assert.equal(nextAction({ currentSrc: 'praise.mp4', requestedSrc: 'praise.mp4', inFlight: false, readyState: 0 }), 'none');
});

test('errorAction: 保留中の要求があればそれを適用する', () => {
  assert.equal(errorAction({ hasPending: true, retryUsed: false }), 'apply-pending');
  assert.equal(errorAction({ hasPending: true, retryUsed: true }), 'apply-pending');
});

test('errorAction: 初回エラーは1回だけ再読み込みする', () => {
  assert.equal(errorAction({ hasPending: false, retryUsed: false }), 'retry');
});

test('errorAction: 再読み込み後もエラーなら致命としてプレースホルダにする', () => {
  assert.equal(errorAction({ hasPending: false, retryUsed: true }), 'fatal');
});
