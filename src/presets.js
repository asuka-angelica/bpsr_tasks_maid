'use strict';
// src/presets.js — チェックリストのプリセット
// 収録方針：
//  - 開拓局／ホーム・園芸は任意項目
//  - ワールドレイドは任意＋通知の既定オフ（S4ではない見込み）
//  - 極限空間は「若葉極限」「ホタテ集め」に分割
//  - ショップ回収は全て分割（鍛造はS4追加分）
//  - クラフトクラスの週クエは入れない（S1で廃止）
//  - ギルド輸送の締切は毎日4:00（リセット5:00より早い）
// 項目の編集機能はフェーズ0の範囲外（プリセット固定＋通知オン/オフのみ）。

const PRESETS = {
  daily: [
    { id: 'daily-activity', name: '毎日活躍度 200まで', note: '50/100/200/500で報酬' },
    { id: 'daily-unstable', name: '不安定な空間 2回', note: 'デイリーダンジョン' },
    { id: 'daily-guild-checkin', name: 'ギルドチェックイン', note: '受付NPCに話すだけ' },
    { id: 'daily-guild-transport', name: 'ギルド輸送', note: '納品20000pt目安', deadline: '04:00' },
    { id: 'daily-mystery-store', name: '神秘ストア', note: '日替わり' },
    { id: 'daily-focus', name: 'フォーカス消費', note: '溢れ防止に消化' },
    { id: 'daily-keys', name: 'ボス鍵・精鋭鍵の消費', note: '溢れると消滅' },
    { id: 'daily-bureau', name: '開拓局の依頼', optional: true },
    { id: 'daily-home', name: 'ホーム依頼・園芸', note: '依頼は9回分までストック可', optional: true },
    { id: 'daily-world-raid', name: 'ワールドレイド', note: '20:30〜22:00', optional: true, notifyDefault: false },
  ],
  weekly: [
    { id: 'weekly-pioneer-reward', name: '開拓者褒賞', note: '週目標9項目から選択式・報酬は翌週' },
    { id: 'weekly-extreme-wakaba', name: '極限空間：若葉極限', note: '改鋳石は週40個まで' },
    { id: 'weekly-extreme-hotate', name: '極限空間：ホタテ集め', note: '改鋳石は週40個まで' },
    { id: 'weekly-friendship', name: '友情ポイント 週2000Pt', note: 'アシスト1000＋イベント1000' },
    { id: 'weekly-shop-forge', name: 'ショップ回収：鍛造', note: '巡光の融合材（S4追加）' },
    { id: 'weekly-shop-season', name: 'ショップ回収：シーズンストア', note: '上級素材の箱は買い占め' },
    { id: 'weekly-shop-guild', name: 'ショップ回収：ギルド雑貨店', note: 'フォーカス回復薬が最優先' },
    { id: 'weekly-shop-colorful', name: 'ショップ回収：カラフルストア' },
    { id: 'weekly-shop-compensation', name: 'ショップ回収：補償ショップ' },
    { id: 'weekly-shop-module', name: 'ショップ回収：モジュール交換' },
    { id: 'weekly-raid', name: '高難易度20人レイド', note: '週1回クリア報酬' },
    { id: 'weekly-guild-hunt', name: 'ギルドハント', note: '金曜18:00〜' },
    { id: 'weekly-guild-dance', name: 'ギルドダンス', note: '金曜19:30〜19:55' },
    { id: 'weekly-starry', name: 'スターリー島 週課', note: 'コラボ期間中の仕様', optional: true },
  ],
  biweekly: [
    { id: 'biweekly-relics', name: 'レグディニス遺跡', note: '進捗リセット・補償ほぼなし' },
  ],
};

function allItems() {
  const out = [];
  for (const period of Object.keys(PRESETS)) {
    for (const item of PRESETS[period]) out.push({ period, ...item });
  }
  return out;
}

function notifyDefaultOf(item) {
  return item.notifyDefault !== false;
}

module.exports = { PRESETS, allItems, notifyDefaultOf };
