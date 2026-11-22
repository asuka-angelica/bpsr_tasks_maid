'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { writeZip, readZip, crc32 } = require('../src/zip');

test('zip: 書き出し→読み込みの往復で中身が一致する', () => {
  const entries = [
    { name: 'character.json', data: Buffer.from('{"name":"テスト"}', 'utf8') },
    { name: 'idle.mp4', data: Buffer.alloc(1024, 7) },
    { name: '日本語ファイル.txt', data: Buffer.from('あいうえお', 'utf8') },
  ];
  const zip = writeZip(entries);
  const back = readZip(zip);
  assert.equal(back.size, 3);
  for (const e of entries) {
    assert.deepEqual(back.get(e.name), e.data);
  }
});

test('zip: 空の zip も往復できる', () => {
  const back = readZip(writeZip([]));
  assert.equal(back.size, 0);
});

test('zip: 壊れた入力は例外', () => {
  assert.throws(() => readZip(Buffer.from('not a zip at all........')));
  assert.throws(() => readZip(Buffer.alloc(4)));
});

test('zip: crc32 が既知値と一致する', () => {
  // "123456789" の CRC32 は 0xCBF43926（標準のチェック値）
  assert.equal(crc32(Buffer.from('123456789', 'ascii')), 0xcbf43926);
});

test('zip: 展開後サイズの上限を超えると例外（レビュー中7）', () => {
  const zip = writeZip([{ name: 'big.bin', data: Buffer.alloc(2048, 1) }]);
  assert.throws(
    () => readZip(zip, { maxInputBytes: 1 << 30, maxEntries: 10, maxEntryBytes: 1024, maxTotalBytes: 1 << 30 }),
    /大きすぎます/,
  );
});

test('zip: 件数の上限を超えると例外（レビュー中7）', () => {
  const zip = writeZip([
    { name: 'a.txt', data: Buffer.from('a') },
    { name: 'b.txt', data: Buffer.from('b') },
  ]);
  assert.throws(
    () => readZip(zip, { maxInputBytes: 1 << 30, maxEntries: 1, maxEntryBytes: 1024, maxTotalBytes: 1 << 30 }),
    /ファイル数が多すぎます/,
  );
});

test('zip: 入力サイズの上限を超えると例外（レビュー中7）', () => {
  const zip = writeZip([{ name: 'a.txt', data: Buffer.from('hello') }]);
  assert.throws(
    () => readZip(zip, { maxInputBytes: 10, maxEntries: 10, maxEntryBytes: 1024, maxTotalBytes: 1 << 30 }),
    /大きすぎます/,
  );
});

test('zip: データが壊れて CRC が合わないと例外（レビュー中7）', () => {
  const zip = Buffer.from(writeZip([{ name: 'a.txt', data: Buffer.from('hello world') }]));
  // ローカルヘッダ（30バイト）＋名前（5バイト）の直後がデータ
  zip[35] ^= 0xff;
  assert.throws(() => readZip(zip), /CRC|サイズ/);
});
