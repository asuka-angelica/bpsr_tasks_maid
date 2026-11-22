'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  validateCharacterDef, scanUserCharacters, resolveAddress,
  addressCandidatesOf, builtinCharacters,
} = require('../src/characters');

function lines() {
  return { greeting: ['やあ、{address}'], praise: ['すごい'], complete: ['全部終わった'] };
}

function videoDef() {
  return {
    name: 'テスト', type: 'video',
    clips: { idle: 'idle.mp4', greeting: 'greeting.webm', praise: 'praise.mp4' },
    lines: lines(),
  };
}

test('characters: 妥当な動画定義はエラーなし', () => {
  assert.deepEqual(validateCharacterDef(videoDef()), []);
});

test('characters: 必須クリップ不足・拡張子違い・台詞不足を検出する', () => {
  const d1 = videoDef();
  delete d1.clips.praise;
  assert.ok(validateCharacterDef(d1).some((e) => e.includes('praise')));
  const d2 = videoDef();
  d2.clips.idle = 'idle.mov';
  assert.ok(validateCharacterDef(d2).some((e) => e.includes('拡張子')));
  const d3 = videoDef();
  d3.lines.praise = [];
  assert.ok(validateCharacterDef(d3).some((e) => e.includes('lines.praise')));
});

test('characters: パストラバーサルを含むファイル名を拒否する', () => {
  const d = videoDef();
  d.clips.idle = '../secret.mp4';
  assert.ok(validateCharacterDef(d).length > 0);
});

test('characters: 立ち絵定義は complete が必須、Live2D は model3.json が必須', () => {
  const img = {
    name: '絵', type: 'image',
    images: { idle: 'i.png', greeting: 'g.png', praise: 'p.png', complete: 'c.png' },
    lines: lines(),
  };
  assert.deepEqual(validateCharacterDef(img), []);
  delete img.images.complete;
  assert.ok(validateCharacterDef(img).length > 0);
  const l2d = { name: 'L', type: 'live2d', model: 'm.model3.json', lines: lines() };
  assert.deepEqual(validateCharacterDef(l2d), []);
  l2d.model = 'm.json';
  assert.ok(validateCharacterDef(l2d).length > 0);
});

test('characters: 呼び方の既定は候補の中からでないとエラー', () => {
  const d = videoDef();
  d.address = { candidates: ['ご主人様'], default: 'お嬢様' };
  assert.ok(validateCharacterDef(d).length > 0);
  d.address.default = 'ご主人様';
  assert.deepEqual(validateCharacterDef(d), []);
});

function tmpCharDir(def, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'maid-chars-'));
  const dir = path.join(root, 'test-char');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'character.json'), JSON.stringify(def));
  for (const f of files) fs.writeFileSync(path.join(dir, f), 'x');
  return root;
}

test('characters: フォルダ走査で解決済み定義（URL付き）が返る', () => {
  const root = tmpCharDir(videoDef(), ['idle.mp4', 'greeting.webm', 'praise.mp4']);
  const { characters, errors } = scanUserCharacters(root);
  assert.deepEqual(errors, []);
  assert.equal(characters.length, 1);
  const c = characters[0];
  assert.equal(c.id, 'test-char');
  assert.equal(c.clips.full.idle, 'maid://app/characters/test-char/idle.mp4');
  // SD が無い場合は等身で代用される
  assert.equal(c.clips.sd.idle, 'maid://app/characters/test-char/idle.mp4');
  assert.equal(c.clips.sd.praise, 'maid://app/characters/test-char/praise.mp4');
});

test('characters: 素材不足のキャラはエラー側に回る', () => {
  const root = tmpCharDir(videoDef(), ['idle.mp4']);
  const { characters, errors } = scanUserCharacters(root);
  assert.equal(characters.length, 0);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /素材ファイルがありません/);
});

test('characters: 呼び方の解決順位（キャラ設定 > 定義の既定 > 全体設定）', () => {
  const def = { id: 'x', addressDefault: '旦那様' };
  const settings = { address: 'お嬢様', characterAddress: {} };
  assert.equal(resolveAddress(def, settings), '旦那様');
  settings.characterAddress = { x: 'ご主人様' };
  assert.equal(resolveAddress(def, settings), 'ご主人様');
  assert.equal(resolveAddress({ id: 'momo', addressDefault: null }, settings), 'お嬢様');
  assert.equal(resolveAddress({ id: 'momo' }, {}), 'ご主人様');
});

test('characters: 候補は定義優先、無ければ既定の2つ', () => {
  assert.deepEqual(addressCandidatesOf({ addressCandidates: ['A', 'B'] }), ['A', 'B']);
  assert.deepEqual(addressCandidatesOf({ addressCandidates: null }), ['ご主人様', 'お嬢様']);
  assert.equal(builtinCharacters().length, 3);
});
