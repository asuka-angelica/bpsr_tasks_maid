'use strict';
// src/characters.js — キャラクター定義の解決（組み込み＋ユーザー追加）
// キャラは「キャラフォルダ＋定義ファイル（character.json）」で足せる。
// 本体コードを書き換えずにキャラ・表示形式を増やせる構造にするのが原則。
//
// ユーザーキャラの置き場所: userData/characters/<id>/character.json ＋素材ファイル
// character.json の形式:
// {
//   "name": "名前",
//   "type": "video" | "image" | "live2d",
//   "clips":  { "idle": "idle.mp4", "greeting": "...", "praise": "...",
//               "sdIdle": "...", "sdJump": "..." },              // type=video
//   "images": { "idle": "idle.png", "greeting": "...", "praise": "...",
//               "complete": "...", "sdIdle": "...", "sdJump": "..." }, // type=image
//   "model": "xxx.model3.json",                                  // type=live2d
//   "lines": { "greeting": ["..."], "praise": ["..."], "complete": ["..."] },
//   "address": { "candidates": ["ご主人様", "お嬢様"], "default": "ご主人様" } // 任意
// }
// 対応拡張子: 動画 mp4/webm、画像 png/jpg/jpeg/webp、ボイスは voice.js 側。
const fs = require('fs');
const path = require('path');

const CHARACTER_TYPES = ['video', 'image', 'live2d'];
const VIDEO_EXTS = ['.mp4', '.webm'];
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp'];
const LINE_KINDS = ['greeting', 'praise', 'complete'];
const DEFAULT_ADDRESS_CANDIDATES = ['ご主人様', 'お嬢様'];

const BUILTIN_CHARACTERS = [
  {
    id: 'momo', name: 'モモ', type: 'video', builtin: true,
    clips: {
      full: { idle: 'assets/momo-idle.mp4', greeting: 'assets/momo-greeting.mp4', praise: 'assets/momo-praise.mp4' },
      sd: { idle: 'assets/momo-sd-idle.mp4', greeting: null, praise: 'assets/momo-sd-jump.mp4' },
    },
  },
  {
    id: 'suzuran', name: 'スズラン', type: 'video', builtin: true,
    clips: {
      full: { idle: 'assets/suzuran-idle.mp4', greeting: 'assets/suzuran-greeting.mp4', praise: 'assets/suzuran-praise.mp4' },
      sd: { idle: 'assets/suzuran-sd-idle.mp4', greeting: null, praise: 'assets/suzuran-sd-jump.mp4' },
    },
  },
  {
    id: 'mimoza', name: 'ミモザ', type: 'video', builtin: true,
    clips: {
      full: { idle: 'assets/mimosa-idle.mp4', greeting: 'assets/mimosa-greeting.mp4', praise: 'assets/mimosa-praise.mp4' },
      sd: { idle: 'assets/mimosa-sd-idle.mp4', greeting: null, praise: 'assets/mimosa-sd-jump.mp4' },
    },
  },
];

function isSafeFileName(name) {
  return typeof name === 'string' && name.length > 0 &&
    !name.includes('/') && !name.includes('\\') && !name.includes('..') &&
    path.basename(name) === name;
}

function isValidId(id) {
  return typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(id);
}

// 定義の検証。戻り値: エラー文字列の配列（空なら妥当）
function validateCharacterDef(def) {
  const errors = [];
  if (!def || typeof def !== 'object') return ['定義がオブジェクトではありません'];
  if (def.id !== undefined && !isValidId(def.id)) {
    errors.push('id は英小文字・数字・ハイフンで始まる必要があります');
  }
  if (typeof def.name !== 'string' || def.name.trim() === '') {
    errors.push('name（表示名）が必要です');
  }
  if (!CHARACTER_TYPES.includes(def.type)) {
    errors.push(`type は ${CHARACTER_TYPES.join(' / ')} のいずれかです`);
    return errors;
  }
  const checkFiles = (obj, required, optional, exts, label) => {
    if (!obj || typeof obj !== 'object') {
      errors.push(`${label} が必要です`);
      return;
    }
    for (const key of required) {
      const v = obj[key];
      if (!isSafeFileName(v)) errors.push(`${label}.${key} のファイル名が不正です`);
      else if (!exts.includes(path.extname(v).toLowerCase())) {
        errors.push(`${label}.${key} の拡張子は ${exts.join(' ')} のいずれかです`);
      }
    }
    for (const key of optional) {
      const v = obj[key];
      if (v === undefined || v === null) continue;
      if (!isSafeFileName(v)) errors.push(`${label}.${key} のファイル名が不正です`);
      else if (!exts.includes(path.extname(v).toLowerCase())) {
        errors.push(`${label}.${key} の拡張子は ${exts.join(' ')} のいずれかです`);
      }
    }
  };
  if (def.type === 'video') {
    checkFiles(def.clips, ['idle', 'greeting', 'praise'], ['sdIdle', 'sdJump'], VIDEO_EXTS, 'clips');
  } else if (def.type === 'image') {
    checkFiles(def.images, ['idle', 'greeting', 'praise', 'complete'], ['sdIdle', 'sdJump'], IMAGE_EXTS, 'images');
  } else if (def.type === 'live2d') {
    if (!isSafeFileName(def.model) || !def.model.endsWith('.model3.json')) {
      errors.push('model は *.model3.json のファイル名で指定してください');
    }
  }
  if (!def.lines || typeof def.lines !== 'object') {
    errors.push('lines（台詞）が必要です');
  } else {
    for (const kind of LINE_KINDS) {
      const arr = def.lines[kind];
      if (!Array.isArray(arr) || arr.length === 0 ||
          arr.some((s) => typeof s !== 'string' || s.trim() === '')) {
        errors.push(`lines.${kind} に1つ以上の台詞が必要です`);
      }
    }
  }
  if (def.address !== undefined) {
    const a = def.address;
    if (!a || typeof a !== 'object' ||
        !Array.isArray(a.candidates) || a.candidates.length === 0 ||
        a.candidates.some((s) => typeof s !== 'string' || s.trim() === '')) {
      errors.push('address.candidates に1つ以上の呼び方候補が必要です');
    } else if (a.default !== undefined && !a.candidates.includes(a.default)) {
      errors.push('address.default は candidates の中から選んでください');
    }
  }
  return errors;
}

// ユーザー定義（フラットな clips/images）を、レンダラーが使う解決済み形へ。
// urlBase は 'maid://app/characters/<id>/' のような接頭辞。
function resolveUserCharacter(id, def, urlBase) {
  const url = (f) => (f ? `${urlBase}${f}` : null);
  const out = {
    id, name: def.name, type: def.type, builtin: false,
    lines: def.lines,
    addressCandidates: (def.address && def.address.candidates) || null,
    addressDefault: (def.address && def.address.default) || null,
  };
  if (def.type === 'video') {
    const c = def.clips;
    out.clips = {
      full: { idle: url(c.idle), greeting: url(c.greeting), praise: url(c.praise) },
      sd: {
        idle: url(c.sdIdle || c.idle),
        greeting: null,
        praise: url(c.sdJump || c.sdIdle || c.praise),
      },
    };
  } else if (def.type === 'image') {
    const im = def.images;
    out.images = {
      full: {
        idle: url(im.idle), greeting: url(im.greeting),
        praise: url(im.praise), complete: url(im.complete),
      },
      sd: {
        idle: url(im.sdIdle || im.idle),
        jump: url(im.sdJump || im.sdIdle || im.idle),
      },
    };
  } else if (def.type === 'live2d') {
    out.live2d = { modelUrl: url(def.model) };
  }
  return out;
}

function referencedFiles(def) {
  const files = [];
  if (def.type === 'video' && def.clips) {
    for (const k of ['idle', 'greeting', 'praise', 'sdIdle', 'sdJump']) {
      if (def.clips[k]) files.push(def.clips[k]);
    }
  } else if (def.type === 'image' && def.images) {
    for (const k of ['idle', 'greeting', 'praise', 'complete', 'sdIdle', 'sdJump']) {
      if (def.images[k]) files.push(def.images[k]);
    }
  } else if (def.type === 'live2d' && def.model) {
    files.push(def.model);
  }
  return [...new Set(files)];
}

// userData/characters/ を走査する。戻り値 { characters, errors: [{id, message}] }
function scanUserCharacters(dir) {
  const characters = [];
  const errors = [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return { characters, errors };
  }
  for (const id of entries) {
    if (!isValidId(id)) {
      errors.push({ id, message: 'フォルダ名（id）が不正です' });
      continue;
    }
    const defPath = path.join(dir, id, 'character.json');
    let def;
    try {
      def = JSON.parse(fs.readFileSync(defPath, 'utf8'));
    } catch {
      errors.push({ id, message: 'character.json が読めません' });
      continue;
    }
    const vErrors = validateCharacterDef(def);
    if (vErrors.length > 0) {
      errors.push({ id, message: vErrors.join('／') });
      continue;
    }
    const missing = referencedFiles(def).filter(
      (f) => !fs.existsSync(path.join(dir, id, f)));
    if (missing.length > 0) {
      errors.push({ id, message: `素材ファイルがありません: ${missing.join(', ')}` });
      continue;
    }
    characters.push(resolveUserCharacter(id, def, `maid://app/characters/${id}/`));
  }
  return { characters, errors };
}

function builtinCharacters() {
  return BUILTIN_CHARACTERS.map((c) => ({
    ...c,
    addressCandidates: null,
    addressDefault: null,
  }));
}

function allCharacters(userDir) {
  const { characters, errors } = scanUserCharacters(userDir);
  return { characters: [...builtinCharacters(), ...characters], errors };
}

// 呼び方の解決：キャラごとの設定 > キャラ定義の既定 > 全体設定 > ご主人様
function resolveAddress(charDef, settings) {
  const per = settings && settings.characterAddress && charDef &&
    settings.characterAddress[charDef.id];
  if (typeof per === 'string' && per) return per;
  if (charDef && charDef.addressDefault) return charDef.addressDefault;
  if (settings && settings.address) return settings.address;
  return 'ご主人様';
}

function addressCandidatesOf(charDef) {
  if (charDef && Array.isArray(charDef.addressCandidates) &&
      charDef.addressCandidates.length > 0) {
    return charDef.addressCandidates;
  }
  return DEFAULT_ADDRESS_CANDIDATES;
}

module.exports = {
  CHARACTER_TYPES, VIDEO_EXTS, IMAGE_EXTS, LINE_KINDS,
  DEFAULT_ADDRESS_CANDIDATES, BUILTIN_CHARACTERS,
  isSafeFileName, isValidId, validateCharacterDef,
  resolveUserCharacter, referencedFiles, scanUserCharacters,
  builtinCharacters, allCharacters, resolveAddress, addressCandidatesOf,
};
