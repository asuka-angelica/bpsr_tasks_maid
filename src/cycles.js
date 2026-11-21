'use strict';
// src/cycles.js — 周期境界の純粋計算（ローカル時刻基準）
// リセットは毎日 5:00。5:00 より前は「前日の周期日」に属する。
// 週は月曜始まり。2週間周期はアンカー日（周期開始日）から14日ごとに区切る。

const RESET_HOUR = 5;
const PERIODS = ['daily', 'weekly', 'biweekly'];
const PERIOD_LABELS = { daily: '毎日', weekly: '毎週', biweekly: '2週間ごと' };

// その時刻が属する周期日の 0:00（ローカル）を返す
function cycleDateOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (date.getHours() < RESET_HOUR) d.setDate(d.getDate() - 1);
  return d;
}

function fmtLocal(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseLocal(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// 日付の通し番号（ローカル日付ベース。差分計算用）
function serialOf(d) {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

function dailyKey(date) {
  return fmtLocal(cycleDateOf(date));
}

function weeklyKey(date) {
  const cd = cycleDateOf(date);
  const dow = (cd.getDay() + 6) % 7; // 月曜=0
  cd.setDate(cd.getDate() - dow);
  return fmtLocal(cd);
}

function biweeklyKey(date, anchor) {
  const cd = cycleDateOf(date);
  const a = parseLocal(anchor);
  const diff = serialOf(cd) - serialOf(a);
  const idx = Math.floor(diff / 14);
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate() + idx * 14);
  return fmtLocal(start);
}

function periodKey(period, date, anchor) {
  if (period === 'daily') return dailyKey(date);
  if (period === 'weekly') return weeklyKey(date);
  if (period === 'biweekly') return biweeklyKey(date, anchor);
  throw new Error(`unknown period: ${period}`);
}

// from から to の間に跨いだ「毎日5:00境界」の数（資源回復の回数になる）
function dailyBoundariesCrossed(from, to) {
  const n = serialOf(cycleDateOf(to)) - serialOf(cycleDateOf(from));
  return Math.max(0, n);
}

module.exports = {
  RESET_HOUR,
  PERIODS,
  PERIOD_LABELS,
  cycleDateOf,
  fmtLocal,
  parseLocal,
  dailyKey,
  weeklyKey,
  biweeklyKey,
  periodKey,
  dailyBoundariesCrossed,
};
