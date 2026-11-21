'use strict';
// src/lines.js — 吹き出し台詞（フェーズ0はボイスなし、台詞のみ）
// {address} は呼び方（ご主人様／お嬢様）に差し替わる。
// カーナビ式に、呼びかけの位置（文頭／文末／なし）を変えた複数パターンを
// 用意し、ランダムに回して単調さを避ける（DESIGN.md §5）。
// 台詞セットはキャラごと。モモ／スズランを用意（ミモザは素材準備中）。

const LINES = {
  momo: {
    greeting: [
      'おかえりなさい、{address}。今日の用事はこちらです',
      '{address}、お待ちしていました。リストを用意してありますね',
      'こんにちは。今日の用事、全部出してありますよ',
      'お疲れさまです、{address}。無理のない範囲で片付けていきましょう',
    ],
    praise: [
      'すごいですっ、{address}！',
      'はいっ、その調子です！',
      '{address}、順調に片付いていますね',
      'できましたね。えらいです！',
      'お見事です、{address}',
    ],
    complete: [
      '{address}、全部終わっちゃったんですか？すごいですっ！',
      '全完了です。{address}、今日はもう安心ですよ',
      '全部片付きました。お疲れさまです、{address}',
    ],
  },
  suzuran: {
    greeting: [
      'お疲れさまです、{address}。本日のタスクをご一緒に確認しましょうか？',
      '{address}、お待ちしておりました。今日の用事は整えてありますね',
      'こんにちは。無理はなさらず、できることから進めていきましょう',
      'おかえりなさい、{address}。まずは一息ついてからで大丈夫ですよ',
    ],
    praise: [
      'よくできましたね、{address}',
      'お見事です。順調に片付いていますね',
      'はい、確かに終わりました。お疲れさまです',
      '{address}、とても丁寧に進められていますね',
      'その調子です。一つずつ、まいりましょう',
    ],
    complete: [
      'すべて終わりましたね、{address}。よく頑張りましたね',
      '本日の分は完了です。どうぞゆっくりお休みください',
      '{address}、全部片付きました。とても素晴らしいです',
    ],
  },
};

function forCharacter(character) {
  return LINES[character] || LINES.momo;
}

function formatLine(line, address) {
  return String(line).split('{address}').join(address || 'ご主人様');
}

// kind の台詞から1つ選んで呼び方を差し替える。rng はテスト用に差し替え可能。
function pickLine(lines, kind, address, rng = Math.random) {
  const arr = lines && lines[kind];
  if (!arr || arr.length === 0) return '';
  const idx = Math.min(arr.length - 1, Math.floor(rng() * arr.length));
  return formatLine(arr[idx], address);
}

module.exports = { LINES, forCharacter, formatLine, pickLine };
