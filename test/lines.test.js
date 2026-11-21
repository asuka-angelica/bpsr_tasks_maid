'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { LINES, forCharacter, formatLine, pickLine } = require('../src/lines');

test('formatLine: {address} が全て差し替わる', () => {
  assert.equal(formatLine('{address}、やりましたね、{address}', 'お嬢様'), 'お嬢様、やりましたね、お嬢様');
  assert.ok(!formatLine('{address}', 'ご主人様').includes('{'));
});

test('formatLine: 呼び方未設定なら ご主人様 にフォールバック', () => {
  assert.equal(formatLine('{address}、すごいです', null), 'ご主人様、すごいです');
});

test('pickLine: rng で選ばれ、差し替え済みの文が返る', () => {
  const lines = forCharacter('momo');
  const first = pickLine(lines, 'praise', 'お嬢様', () => 0);
  assert.equal(first, formatLine(LINES.momo.praise[0], 'お嬢様'));
  const last = pickLine(lines, 'praise', 'お嬢様', () => 0.999);
  assert.equal(last, formatLine(LINES.momo.praise[LINES.momo.praise.length - 1], 'お嬢様'));
});

test('pickLine: 未知の種別は空文字', () => {
  assert.equal(pickLine(forCharacter('momo'), 'nope', 'ご主人様'), '');
});

test('全台詞に {address} 以外のプレースホルダが残っていない', () => {
  for (const set of Object.values(LINES)) {
    for (const arr of Object.values(set)) {
      for (const line of arr) {
        const stripped = line.split('{address}').join('');
        assert.ok(!stripped.includes('{') && !stripped.includes('}'), line);
      }
    }
  }
});

test('各キャラ・各種別に複数パターンがある（カーナビ式バリエーション）', () => {
  for (const set of Object.values(LINES)) {
    for (const kind of ['greeting', 'praise', 'complete']) {
      assert.ok(set[kind].length >= 3, kind);
    }
  }
});
