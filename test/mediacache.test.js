'use strict';
// mediacache（動画 Blob キャッシュの上限・失効）のテスト。
// レビュー中4：再生した分だけ増え続けないこと、再生中は守られること、
// 削除・表示オフで失効することを固定する。
const test = require('node:test');
const assert = require('node:assert/strict');
const { createMediaCache } = require('../renderer/mediacache');

const tick = () => new Promise((r) => setImmediate(r));

function makeCache(maxBytes, sizes) {
  const revoked = [];
  const cache = createMediaCache({
    maxBytes,
    fetchBlob: async (path) => ({ size: sizes[path] || 0 }),
    makeUrl: (blob) => `blob:fake-${blob.size}-${Math.random()}`,
    revokeUrl: (url) => revoked.push(url),
    onSettled: null,
  });
  return { cache, revoked };
}

async function resolveFully(cache, path, prot) {
  const url = cache.resolve(path, prot);
  if (url) return url;
  await tick(); await tick();
  return cache.resolve(path, prot);
}

test('mediacache: 取得完了後は URL を返し、バイト数を数える', async () => {
  const { cache } = makeCache(1000, { 'a.mp4': 300 });
  const url = await resolveFully(cache, 'a.mp4');
  assert.ok(url && url.startsWith('blob:'));
  assert.deepEqual(cache.stats(), { count: 1, pendingCount: 0, totalBytes: 300 });
});

test('mediacache: 上限を超えたら古いものから退避し Blob URL を破棄する', async () => {
  const { cache, revoked } = makeCache(500, { 'a.mp4': 300, 'b.mp4': 300, 'c.mp4': 300 });
  await resolveFully(cache, 'a.mp4');
  await resolveFully(cache, 'b.mp4'); // ここで a が退避される
  assert.equal(cache.stats().totalBytes, 300);
  assert.equal(cache.stats().count, 1);
  assert.equal(revoked.length, 1);
  await resolveFully(cache, 'c.mp4');
  assert.equal(cache.stats().count, 1);
});

test('mediacache: 再生中（protected）のパスは上限退避から守られる', async () => {
  const { cache } = makeCache(500, { 'a.mp4': 300, 'b.mp4': 300 });
  await resolveFully(cache, 'a.mp4');
  const prot = new Set(['a.mp4']);
  cache.resolve('b.mp4', prot);
  await tick(); await tick();
  // a は protected なので残り、b は入った直後でも合計が上限超えなら b 自体は残る
  // （退避候補が protected しかない場合は上限超過を許容する）
  assert.equal(cache.stats().count, 2);
  assert.ok(cache.resolve('a.mp4', prot));
});

test('mediacache: evictWhere で対象キャラ分だけ失効する', async () => {
  const { cache, revoked } = makeCache(10000, { 'assets/momo-idle.mp4': 100, 'assets/suzuran-idle.mp4': 100 });
  await resolveFully(cache, 'assets/momo-idle.mp4');
  await resolveFully(cache, 'assets/suzuran-idle.mp4');
  cache.evictWhere((p) => p.includes('suzuran'));
  assert.equal(cache.stats().count, 1);
  assert.equal(revoked.length, 1);
  assert.ok(cache.resolve('assets/momo-idle.mp4'));
});

test('mediacache: evictAll で全部失効する（表示オフ時）', async () => {
  const { cache } = makeCache(10000, { 'a.mp4': 100, 'b.mp4': 100 });
  await resolveFully(cache, 'a.mp4');
  await resolveFully(cache, 'b.mp4');
  cache.evictAll();
  assert.deepEqual(cache.stats(), { count: 0, pendingCount: 0, totalBytes: 0 });
});

test('mediacache: 取得中に evict された結果は登録されず URL も破棄される', async () => {
  let release;
  const revoked = [];
  const cache = createMediaCache({
    maxBytes: 1000,
    fetchBlob: () => new Promise((res) => { release = () => res({ size: 10 }); }),
    makeUrl: () => 'blob:late',
    revokeUrl: (u) => revoked.push(u),
    onSettled: null,
  });
  assert.equal(cache.resolve('x.mp4'), null);
  cache.evict('x.mp4');
  release();
  await tick(); await tick();
  assert.equal(cache.stats().count, 0);
  assert.deepEqual(revoked, ['blob:late']);
});

test('mediacache: fetch 失敗時は通常パス（フォールバック）で返し、破棄対象にしない', async () => {
  const revoked = [];
  const cache = createMediaCache({
    maxBytes: 1000,
    fetchBlob: async () => { throw new Error('nope'); },
    makeUrl: () => 'blob:unused',
    revokeUrl: (u) => revoked.push(u),
    onSettled: null,
  });
  assert.equal(cache.resolve('z.mp4'), null);
  await tick(); await tick();
  assert.equal(cache.resolve('z.mp4'), 'z.mp4');
  cache.evictAll();
  assert.deepEqual(revoked, []); // フォールバックは Blob URL ではないので revoke しない
});
