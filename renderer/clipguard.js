'use strict';
/* clipguard.js — クリップ切替とエラー復帰の判断（純粋関数）
 * ブラウザでは window.ClipGuard、node（テスト）では module.exports として使う。
 *
 * 背景（v0.6.0 の不具合2）：クリップの src を切り替えるたびに、読み込み中の
 * メディア fetch が割り込まれ（net::ERR_ABORTED）、割り込みがデマルチプレクサを
 * 開く段階で起きると MEDIA_ERR_SRC_NOT_SUPPORTED（DEMUXER_ERROR_COULD_NOT_OPEN）
 * になって video の error イベントが発火する。チェック→解除のような高速な
 * 操作でこれが連発し、プレースホルダ表示が固定化した。
 * 対策は「割り込みを起こさない（切替の直列化）」＋「エラーでも段階的に復帰する」。 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ClipGuard = api;
})(typeof window !== 'undefined' ? window : null, function () {
  // 次のクリップ要求への判断を返す。
  //   currentSrc: 現在の video の src（未設定なら null）
  //   requestedSrc: 要求されたクリップの src
  //   inFlight: 別の src への切替（読み込み）が進行中か
  //   readyState: video の readyState
  // 戻り値:
  //   'switch'  今すぐ切り替える
  //   'defer'   切替が進行中なので保留する（割り込み回避）
  //   'restart' 同じ src なので、先頭から再生し直す
  //   'none'    何もしない（同じものの読み込み中／メタデータ未着）
  function nextAction({ currentSrc, requestedSrc, inFlight, readyState }) {
    if (!requestedSrc) return 'none';
    if (requestedSrc === currentSrc) {
      if (inFlight) return 'none';
      return readyState >= 1 ? 'restart' : 'none';
    }
    return inFlight ? 'defer' : 'switch';
  }

  // video の error イベントへの判断を返す。
  //   hasPending: 保留中のクリップ要求があるか
  //   retryUsed: 現在のクリップで既に再読み込みを試したか
  // 戻り値:
  //   'apply-pending' 保留中の要求を適用する（エラーは切替割り込み由来とみなす）
  //   'retry'         意図したクリップを1回だけ読み直す
  //   'fatal'         復帰不能としてプレースホルダ表示にする
  function errorAction({ hasPending, retryUsed }) {
    if (hasPending) return 'apply-pending';
    if (!retryUsed) return 'retry';
    return 'fatal';
  }

  return { nextAction, errorAction };
});
