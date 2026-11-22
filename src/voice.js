'use strict';
// src/voice.js — ボイスパック（任意の追加音声）の検出
// 置き場所: アプリの userData フォルダ直下の `voice/`
//   voice/<キャラID>/<場面>.mp3|wav   場面は greeting / praise / complete
// フォルダが存在しない環境では「ボイスなし」として扱い、設定画面の
// ボイス関連 UI 自体を出さない（renderer は snapshot.voiceAvailable で判断）。
// 音声ファイルは repo には含めない（.gitignore 済み）。利用条件は素材ごとに
// 従うこと（README の「ボイスパックの追加」参照）。
const fs = require('fs');
const path = require('path');

const VOICE_CHARACTERS = ['momo', 'suzuran', 'mimoza'];
const VOICE_KINDS = ['greeting', 'praise', 'complete'];
const VOICE_EXTS = ['.mp3', '.wav'];

function voiceDir(userDataDir) {
  return path.join(userDataDir, 'voice');
}

// ボイスパックを走査する。charIds は対象キャラ（未指定なら組み込み3人。
// ユーザー追加キャラのボイスも同じ規約で置けるよう、呼び出し側が渡す）。
// 戻り値:
//   { available: フォルダが存在するか,
//     files: { <キャラID>: { <場面>: 'maid://app/voice/...' } } }
function scanVoicePack(dir, charIds = VOICE_CHARACTERS) {
  let available = false;
  try {
    available = fs.statSync(dir).isDirectory();
  } catch {
    available = false;
  }
  const files = {};
  if (!available) return { available, files };
  for (const ch of charIds) {
    for (const kind of VOICE_KINDS) {
      for (const ext of VOICE_EXTS) {
        const p = path.join(dir, ch, `${kind}${ext}`);
        try {
          if (fs.statSync(p).isFile()) {
            if (!files[ch]) files[ch] = {};
            files[ch][kind] = `maid://app/voice/${ch}/${kind}${ext}`;
            break;
          }
        } catch { /* 無い場合は次候補へ */ }
      }
    }
  }
  return { available, files };
}

module.exports = { VOICE_CHARACTERS, VOICE_KINDS, VOICE_EXTS, voiceDir, scanVoicePack };
