'use strict';
// voice（ボイスパック検出）のテスト。
// 仕様: フォルダが無ければ available=false（設定のボイス UI を出さない）、
// フォルダがあれば available=true で、置かれたファイルを場面ごとに検出する。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scanVoicePack, voiceDir } = require('../src/voice');

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'maid-voice-'));
}

test('voiceDir は userData 直下の voice/', () => {
  assert.equal(voiceDir('/data'), path.join('/data', 'voice'));
});

test('フォルダが無い環境では available=false でファイルも空', () => {
  const dir = path.join(tmpdir(), 'voice'); // 作らない
  const r = scanVoicePack(dir);
  assert.equal(r.available, false);
  assert.deepEqual(r.files, {});
});

test('フォルダが有れば（空でも）available=true', () => {
  const dir = path.join(tmpdir(), 'voice');
  fs.mkdirSync(dir, { recursive: true });
  const r = scanVoicePack(dir);
  assert.equal(r.available, true);
  assert.deepEqual(r.files, {});
});

test('置かれたファイルをキャラ×場面で検出し、mp3 を wav より優先する', () => {
  const dir = path.join(tmpdir(), 'voice');
  fs.mkdirSync(path.join(dir, 'momo'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'suzuran'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'momo', 'greeting.mp3'), 'x');
  fs.writeFileSync(path.join(dir, 'momo', 'praise.wav'), 'x');
  fs.writeFileSync(path.join(dir, 'momo', 'complete.wav'), 'x');
  fs.writeFileSync(path.join(dir, 'momo', 'complete.mp3'), 'x');
  fs.writeFileSync(path.join(dir, 'suzuran', 'praise.mp3'), 'x');
  const r = scanVoicePack(dir);
  assert.equal(r.available, true);
  assert.equal(r.files.momo.greeting, 'maid://app/voice/momo/greeting.mp3');
  assert.equal(r.files.momo.praise, 'maid://app/voice/momo/praise.wav');
  assert.equal(r.files.momo.complete, 'maid://app/voice/momo/complete.mp3');
  assert.equal(r.files.suzuran.praise, 'maid://app/voice/suzuran/praise.mp3');
  assert.equal(r.files.suzuran.greeting, undefined);
  assert.equal(r.files.mimoza, undefined);
});

test('ファイルではなく同名フォルダがある場合は検出しない', () => {
  const dir = path.join(tmpdir(), 'voice');
  fs.mkdirSync(path.join(dir, 'momo', 'greeting.mp3'), { recursive: true });
  const r = scanVoicePack(dir);
  assert.equal(r.available, true);
  assert.equal(r.files.momo, undefined);
});
