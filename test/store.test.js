'use strict';
// store（保存層）のテスト。レビュー中8：読めない保存データは退避する。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadState, saveState } = require('../src/store');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'maid-store-'));
}

test('store: ファイルが無ければ初期状態（退避ファイルは作らない）', () => {
  const dir = tmpDir();
  const file = path.join(dir, 'data.json');
  const s = loadState(file, new Date());
  assert.ok(s && s.settings);
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('store: 壊れた JSON は退避して初期状態で始める', () => {
  const dir = tmpDir();
  const file = path.join(dir, 'data.json');
  fs.writeFileSync(file, '{broken json', 'utf8');
  const s = loadState(file, new Date());
  assert.ok(s && s.settings);
  const names = fs.readdirSync(dir);
  assert.equal(names.length, 1);
  assert.match(names[0], /^data\.json\.corrupt-\d+$/);
  assert.equal(fs.readFileSync(path.join(dir, names[0]), 'utf8'), '{broken json');
});

test('store: 保存→読み込みの往復で状態が一致する', () => {
  const dir = tmpDir();
  const file = path.join(dir, 'data.json');
  const s0 = loadState(file, new Date());
  saveState(file, s0);
  const s1 = loadState(file, new Date());
  assert.deepEqual(s1.settings, s0.settings);
});
