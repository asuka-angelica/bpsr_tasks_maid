'use strict';
/* mediacache.js — 動画 Blob URL キャッシュ（バイト上限・失効付き）
 * ブラウザでは window.MediaCache、node（テスト）では module.exports として使う。
 *
 * 背景：クリップは割り込みエラー対策（不具合2）として一度 fetch して
 * Blob URL 化してから再生する。その保持が無制限だと、キャラの追加・
 * 入れ替えを繰り返す長時間運用で増え続ける（レビュー中4）。ここでは
 * - 合計バイト数の上限を持ち、古いものから退避する（LRU）
 * - 再生中のパスは呼び出し側が protected として渡し、退避から守る
 * - キャラの削除・置換・表示オフでは呼び出し側が evict/evictAll で失効させる
 * - 取得途中のパスは AbortController で中止でき、破棄後に届いた結果は捨てる
 * を担う。取得・URL 化の実処理は注入する（テストでは差し替え可能）。 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MediaCache = api;
})(typeof window !== 'undefined' ? window : null, function () {
  function createMediaCache({ maxBytes, fetchBlob, makeUrl, revokeUrl, onSettled }) {
    const entries = new Map(); // path -> { url, bytes, fallback }
    const pending = new Map(); // path -> { controller }
    let totalBytes = 0;

    function evict(path) {
      const e = entries.get(path);
      if (e) {
        entries.delete(path);
        totalBytes -= e.bytes;
        if (!e.fallback && e.url) revokeUrl(e.url);
      }
      const p = pending.get(path);
      if (p) {
        pending.delete(path);
        try { p.controller.abort(); } catch { /* 無視 */ }
      }
    }

    function evictWhere(predicate) {
      for (const path of [...entries.keys()]) {
        if (predicate(path)) evict(path);
      }
      for (const path of [...pending.keys()]) {
        if (predicate(path)) evict(path);
      }
    }

    function evictAll() {
      for (const path of [...entries.keys()]) evict(path);
      for (const path of [...pending.keys()]) evict(path);
    }

    // 上限を超えていたら古い順に退避する。protected なパスは守る。
    function enforceCap(protectedPaths) {
      if (totalBytes <= maxBytes) return;
      for (const path of [...entries.keys()]) {
        if (totalBytes <= maxBytes) break;
        if (protectedPaths && protectedPaths.has(path)) continue;
        evict(path);
      }
    }

    // path の再生用 URL を返す。取得中は null（完了時に onSettled が呼ばれる）。
    function resolve(path, protectedPaths) {
      const hit = entries.get(path);
      if (hit) {
        entries.delete(path); // LRU: 触ったものを新しい側へ
        entries.set(path, hit);
        return hit.url;
      }
      if (pending.has(path)) return null;
      const controller = new AbortController();
      const record = { controller };
      pending.set(path, record);
      fetchBlob(path, controller.signal)
        .then((blob) => ({ url: makeUrl(blob), bytes: blob.size, fallback: false }))
        .catch(() => ({ url: path, bytes: 0, fallback: true })) // Blob 化に失敗したら通常パスで直接再生を試す
        .then((result) => {
          if (pending.get(path) !== record) {
            // 取得中に破棄された。作った Blob URL はそのまま捨てる
            if (!result.fallback && result.url) revokeUrl(result.url);
            return;
          }
          pending.delete(path);
          entries.set(path, result);
          totalBytes += result.bytes;
          // 今入ったものはこれから再生される側なので、自分の退避では落とさない
          const prot = new Set(protectedPaths || []);
          prot.add(path);
          enforceCap(prot);
          if (onSettled) onSettled(path);
        });
      return null;
    }

    function stats() {
      return { count: entries.size, pendingCount: pending.size, totalBytes };
    }

    return { resolve, evict, evictWhere, evictAll, enforceCap, stats };
  }

  return { createMediaCache };
});
