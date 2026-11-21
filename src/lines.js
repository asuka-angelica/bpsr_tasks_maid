'use strict';
// src/lines.js — 吹き出し台詞（フェーズ0はボイスなし、台詞のみ）
// {address} は呼び方（ご主人様／お嬢様）に差し替わる。
// カーナビ式に、呼びかけの位置（文頭／文末／なし）を変えた複数パターンを
// 用意し、ランダムに回して単調さを避ける（DESIGN.md §5）。
// 台詞セットはキャラごと。フェーズ0はモモのみ（他2人は素材準備中）。

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
