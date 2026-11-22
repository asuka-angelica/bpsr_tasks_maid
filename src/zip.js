'use strict';
// src/zip.js — 最小限の ZIP 実装（キャラ設定パッケージの書き出し／読み込み用）
// 書き出しは STORE（無圧縮：素材は mp4/png 等で圧縮が効かないため）。
// 読み込みは STORE と DEFLATE に対応し、他ツールで作った zip も取り込める。
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d) {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) |
    ((d.getSeconds() >> 1) & 0x1f);
  const date = (((Math.max(0, d.getFullYear() - 1980)) & 0x7f) << 9) |
    (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

// entries: [{ name: 'character.json', data: Buffer }] → zip の Buffer
function writeZip(entries, now = new Date()) {
  const { time, date } = dosDateTime(now);
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const crc = crc32(e.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);          // version needed
    local.writeUInt16LE(0x800, 6);       // UTF-8 ファイル名
    local.writeUInt16LE(0, 8);           // STORE
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(e.data.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, e.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(e.data.length, 20);
    central.writeUInt32LE(e.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + e.data.length;
  }
  const centralStart = offset;
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralStart, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

/* 読み込みの上限（レビュー中7：巨大な入力でメインプロセスが固まらないように）。
 * キャラパッケージは動画を含むため 1 ファイルの上限は広めに取るが、
 * 件数・展開後合計・入力自体に上限を付け、超過は例外にする。
 * 整合性は中央目次に記録された展開後サイズと CRC32 で照合する。 */
const ZIP_LIMITS = {
  maxInputBytes: 256 * 1024 * 1024, // 入力（zip ファイル自体）
  maxEntries: 512,
  maxEntryBytes: 256 * 1024 * 1024, // 展開後 1 件
  maxTotalBytes: 512 * 1024 * 1024, // 展開後 合計
};

// zip の Buffer → Map<名前, Buffer>。壊れた入力・上限超過では例外を投げる。
function readZip(buf, limits = ZIP_LIMITS) {
  if (!Buffer.isBuffer(buf) || buf.length < 22) throw new Error('zip ではありません');
  if (buf.length > limits.maxInputBytes) {
    throw new Error(`パッケージが大きすぎます（上限 ${Math.floor(limits.maxInputBytes / 1024 / 1024)}MB）`);
  }
  // End of Central Directory を末尾から探す
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65536); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('zip の終端レコードが見つかりません');
  const count = buf.readUInt16LE(eocd + 10);
  if (count > limits.maxEntries) {
    throw new Error(`パッケージ内のファイル数が多すぎます（上限 ${limits.maxEntries} 件）`);
  }
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  let totalBytes = 0;
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) {
      throw new Error('zip の目次が壊れています');
    }
    const method = buf.readUInt16LE(p + 10);
    const expectedCrc = buf.readUInt32LE(p + 16);
    const compSize = buf.readUInt32LE(p + 20);
    const rawSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    if (rawSize > limits.maxEntryBytes) {
      throw new Error(`パッケージ内のファイルが大きすぎます（上限 ${Math.floor(limits.maxEntryBytes / 1024 / 1024)}MB）`);
    }
    if (p + 46 + nameLen > buf.length) throw new Error('zip の目次が壊れています');
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    // ローカルヘッダ側の名前／拡張長からデータ開始位置を求める
    if (localOffset + 30 > buf.length || buf.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error('zip のローカルヘッダが壊れています');
    }
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    if (dataStart + compSize > buf.length) throw new Error('zip のデータ範囲が壊れています');
    const raw = buf.subarray(dataStart, dataStart + compSize);
    let data;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) {
      data = zlib.inflateRawSync(raw, { maxOutputLength: limits.maxEntryBytes + 1 });
      if (data.length > limits.maxEntryBytes) {
        throw new Error(`パッケージ内のファイルが大きすぎます（上限 ${Math.floor(limits.maxEntryBytes / 1024 / 1024)}MB）`);
      }
    } else throw new Error(`未対応の圧縮形式です (method=${method})`);
    // 整合性確認：展開後サイズと CRC が目次と一致すること
    if (data.length !== rawSize) throw new Error(`zip のサイズが一致しません: ${name}`);
    if (crc32(data) !== expectedCrc) throw new Error(`zip の CRC が一致しません: ${name}`);
    totalBytes += data.length;
    if (totalBytes > limits.maxTotalBytes) {
      throw new Error(`パッケージの展開後サイズが大きすぎます（上限 ${Math.floor(limits.maxTotalBytes / 1024 / 1024)}MB）`);
    }
    out.set(name, data);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

module.exports = { writeZip, readZip, crc32, ZIP_LIMITS };
