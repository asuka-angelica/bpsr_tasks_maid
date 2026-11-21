/*! fflate
MIT License

Copyright (c) 2026 Arjun Barrett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
function Ze(t, e) {
  const n = [0];
  for (let o = 1; o < t.length; o++) n.push(n.at(-1) + Math.hypot(t[o][0] - t[o - 1][0], t[o][1] - t[o - 1][1]));
  const s = Math.max(0, Math.min(1, e)) * n.at(-1);
  let a = 1;
  for (; a < t.length - 1 && n[a] < s; ) a++;
  const i = (s - n[a - 1]) / Math.max(1e-9, n[a] - n[a - 1]);
  return t[a - 1].map((o, m) => o + (t[a][m] - o) * i);
}
const jt = (t) => t.slice(1).reduce((e, n, s) => e + Math.hypot(n[0] - t[s][0], n[1] - t[s][1]), 0);
function Sn(t, e) {
  let n = 0;
  const s = jt(t), a = [];
  for (let o = 1; o < t.length; o++) {
    const m = t[o - 1], w = t[o], y = w[0] - m[0], v = w[1] - m[1], h = Math.hypot(y, v);
    for (let c = 1; c < e.length; c++) {
      const d = e[c - 1], l = e[c], p = l[0] - d[0], u = l[1] - d[1], g = y * u - v * p;
      if (Math.abs(g) < 1e-9) continue;
      const r = ((d[0] - m[0]) * u - (d[1] - m[1]) * p) / g, f = ((d[0] - m[0]) * v - (d[1] - m[1]) * y) / g;
      r >= -1e-8 && r <= 1 + 1e-8 && f >= -1e-8 && f <= 1 + 1e-8 && a.push((n + r * h) / s);
    }
    n += h;
  }
  const i = a.filter((o, m) => a.findIndex((w) => Math.abs(o - w) < 1e-7) === m);
  if (i.length !== 1) throw new RangeError("Each tier must cross every column exactly once");
  return i[0];
}
function ln(t) {
  const e = !!(t.seams?.length || t.tiers?.length), n = t.seams?.length || (t.columns ?? 8), s = t.seams?.length ? t.seams : Array.from({ length: n }, (v, h) => [Ze(t.waist, h / (n - 1)), Ze(t.hem, h / (n - 1))]);
  if (e && s.some((v) => jt(v) < 1)) throw new RangeError("Columns must have nonzero source length");
  const a = s.map((v) => [0, ...t.tiers?.length ? t.tiers.map((h) => Sn(v, h)) : [0.5], 1]);
  for (const v of a) if (v.some((h, c) => c > 0 && h - v[c - 1] < 1e-3)) throw new RangeError("Tier intersections must be ordered from waist to hem, with nonzero links");
  const i = a[0].length - 1, o = e ? Math.max(2, Math.ceil(((t.rows ?? 5) - 1) / i)) : 0, m = e ? i * o + 1 : t.rows ?? 5, w = new Float64Array(m * n * 2), y = [];
  for (let v = 0; v < n; v++) {
    y[v] = [];
    for (let h = 0; h < m; h++) {
      const c = e ? Math.min(i - 1, Math.floor(h / o)) : 0, d = e ? (h - c * o) / o : h / (m - 1), l = e ? a[v][c] + (a[v][c + 1] - a[v][c]) * d : d;
      y[v].push(l), w.set(Ze(s[v], l), (h * n + v) * 2);
    }
  }
  if (e) for (let v = 0; v < m - 1; v++) for (let h = 0; h < n - 1; h++) {
    const c = (v * n + h) * 2, d = c + 2, l = c + n * 2, p = l + 2, u = (g, r, f) => (w[r] - w[g]) * (w[f + 1] - w[g + 1]) - (w[r + 1] - w[g + 1]) * (w[f] - w[g]);
    if (u(c, d, p) <= 1e-6 || u(c, p, l) <= 1e-6) throw new RangeError("Columns must be ordered left to right without crossing");
  }
  return { custom: e, cols: n, rows: m, rest: w, seams: s, joints: a, fractions: y, lengths: s.map(jt), top: s.map((v) => v[0]) };
}
const he = (t, e, n) => {
  (typeof t != "number" || !Number.isFinite(t)) && n.push(`${e}: expected a finite number`);
}, ve = (t, e, n) => {
  he(t, e, n), typeof t == "number" && t <= 0 && n.push(`${e}: must be positive`);
}, Ye = (t, e, n) => {
  he(t, e, n), typeof t == "number" && t < 0 && n.push(`${e}: must be nonnegative`);
}, kn = (t, e, n) => {
  Ye(t, e, n), typeof t == "number" && (!Number.isInteger(t) || t > 8) && n.push(`${e}: expected an integer from 0 to 8`);
}, Re = (t, e, n) => {
  ve(t, e, n), typeof t == "number" && !Number.isInteger(t) && n.push(`${e}: expected an integer`);
}, Ke = (t, e, n) => {
  he(t, e, n), typeof t == "number" && !Number.isInteger(t) && n.push(`${e}: expected an integer`);
}, ut = (t, e, n) => {
  (typeof t != "string" || !t.trim()) && n.push(`${e}: expected a non-empty string`);
}, Ae = (t, e = 0, n = 1 / 0) => (s, a, i) => {
  if (!Array.isArray(s)) {
    i.push(`${a}: expected an array`);
    return;
  }
  (s.length < e || s.length > n) && i.push(`${a}: expected ${e}..${n} items`), s.forEach((o, m) => t(o, `${a}[${m}]`, i));
}, pe = Ae(he, 2, 2), we = (t, e, n) => {
  pe(t, e, n), Array.isArray(t) && t.length === 2 && t[0] >= t[1] && n.push(`${e}: start must be less than end`);
}, ue = (t, e = []) => (n, s, a) => {
  if (!n || typeof n != "object" || Array.isArray(n)) {
    a.push(`${s}: expected an object`);
    return;
  }
  const i = n;
  for (const [o, m] of Object.entries(t))
    i[o] === void 0 && e.includes(o) || m(i[o], `${s}.${o}`, a);
}, at = { cx: he, cy: he, rx: ve, ry: ve }, _e = ue(at), Qe = Ae(pe, 3), Be = Ae(pe, 2), We = (t, e, n) => {
  he(t, e, n), typeof t == "number" && (t < 0 || t > 1) && n.push(`${e}: must be between 0 and 1`);
}, Rn = (t) => ue({
  version: (e, n, s) => {
    e !== 1 && s.push(`${n}: only version 1 is supported`);
  },
  image: ue({ width: Re, height: Re }),
  head: ue({
    ...at,
    shiftX: he,
    shiftY: he,
    pivotX: he,
    pivotY: he,
    maxRoll: he,
    weightBand: we,
    turnBand: we
  }),
  body: ue({
    pivotX: he,
    pivotY: he,
    maxRoll: he,
    breathBand: we,
    rollBand: we,
    chest: _e,
    shoulders: Ae(_e),
    hip: ue({ shift: he, band: we })
  }, ["hip"]),
  face: ue({
    nose: _e,
    mouth: _e,
    eyeA: _e,
    eyeB: _e,
    earL: _e,
    earR: _e,
    brow: ue({ ...at, band: we }),
    jaw: ue({ ...at, band: we })
  }),
  buns: ue({ bunL: _e, bunR: _e }, ["bunL", "bunR"]),
  eyes: Ae(ue({
    opening: Qe,
    roi: Qe,
    x0: he,
    x1: he,
    top: Ae(he, 24, 24),
    bot: Ae(he, 24, 24)
  }, t ? ["x0", "x1", "top", "bot"] : []), 2, 2),
  mouth: ue({
    cx: he,
    cy: he,
    angle: he,
    halfLen: ve,
    bow: he,
    area: ue({ ...at, angle: he })
  }),
  cheeks: Ae(pe, 2, 2),
  strands: Ae(ue({ name: ut, nodes: Be, sigma: ve, k: ve, max: ve })),
  accessories: Ae(ue({
    name: ut,
    pivot: pe,
    tip: pe,
    split: We,
    box: Ae(Ke, 4, 4),
    color: ue({ redness: We, minRed: he })
  })),
  hand: ue({
    outline: Qe,
    jaw: Be,
    jawRange: we,
    background: Qe,
    elbow: pe,
    wrist: pe,
    knuckle: pe,
    contact: pe,
    forearmShare: We,
    armBand: we,
    wristBand: we,
    handBand: we,
    fingerXBand: we,
    fingerYBand: we,
    pinBand: we
  }),
  cloth: Ae(ue({
    name: ut,
    outline: Qe,
    waist: Be,
    hem: Be,
    columns: Re,
    rows: Re,
    stiffness: ve,
    damping: ve,
    max: ve,
    tierGain: ve,
    highModeDamping: ve,
    responseGain: ve,
    swing: ve,
    follow: We,
    cohesion: kn,
    wind: Ye,
    behind: (e, n, s) => {
      typeof e != "boolean" && s.push(`${n}: expected a boolean`);
    },
    parent: ut,
    scale: ve,
    seams: Ae(Be, 0, 64),
    tiers: Ae(Be, 0, 8)
  }, ["tierGain", "highModeDamping", "seams", "tiers", "responseGain", "columns", "rows", "stiffness", "damping", "max", "swing", "follow", "cohesion", "wind", "behind", "parent", "scale"])),
  legs: ue({
    spine: We,
    bob: Ye,
    twist: Ye,
    pelvis: pe,
    shift: Ye,
    tilt: Ye,
    bend: Ye,
    band: we,
    split: Be,
    left: ue({ hip: pe, knee: pe, ankle: pe }),
    right: ue({ hip: pe, knee: pe, ankle: pe })
  }, ["spine", "bob", "twist"]),
  arms: ue({
    swing: Ye,
    bend: Ye,
    inward: We,
    left: ue({ shoulder: pe, elbow: pe, wrist: pe, split: Be }),
    right: ue({ shoulder: pe, elbow: pe, wrist: pe, split: Be })
  }, ["swing", "bend", "inward"]),
  mesh: ue({
    baseCell: Re,
    fine: ue({
      x0: Ke,
      x1: Ke,
      y0: Ke,
      y1: Ke,
      cell: Re
    }),
    handCell: Re,
    tasselCell: Re,
    eyeBallCell: Re,
    eyeCell: Re,
    spriteCell: Re,
    clothCell: Re
  }, ["clothCell"]),
  view: ue({ padTop: he, padSide: he, gazeCenter: pe, irisTravel: ve }, ["gazeCenter", "irisTravel"])
}, ["buns", "strands", "accessories", "hand", "cloth", "legs", "arms"]);
function hn(t, e = {}) {
  const n = [];
  if (Rn(e.draft ?? !1)(t, "rig", n), n.length) return n;
  const s = t;
  s.eyes.forEach((i, o) => {
    const m = ["x0", "x1", "top", "bot"];
    if (!(e.draft && m.every((w) => i[w] === void 0))) {
      if (m.some((w) => i[w] === void 0)) {
        n.push(`rig.eyes[${o}]: supply all x0/x1/top/bot fields or omit all in a draft`);
        return;
      }
      i.x0 >= i.x1 && n.push(`rig.eyes[${o}].x1: must exceed x0`), i.top.some((w, y) => w > i.bot[y]) && n.push(`rig.eyes[${o}].top: must not exceed bottom curve`);
    }
  }), (s.mesh.fine.x0 >= s.mesh.fine.x1 || s.mesh.fine.y0 >= s.mesh.fine.y1) && n.push("rig.mesh.fine: rectangle must have positive area"), (s.view.padTop <= -1 || s.view.padTop >= 1 || s.view.padSide <= -0.5) && n.push("rig.view: margins must leave a positive viewport");
  for (const [i, o] of (s.strands ?? []).entries())
    o.nodes.some((m, w) => w > 0 && m[0] === o.nodes[w - 1][0] && m[1] === o.nodes[w - 1][1]) && n.push(`rig.strands[${i}].nodes: consecutive nodes must differ`);
  for (const [i, o] of (s.accessories ?? []).entries())
    (o.box[0] < 0 || o.box[1] < 0 || o.box[2] > s.image.width || o.box[3] > s.image.height) && n.push(`rig.accessories[${i}].box: rectangle must stay inside the image`), (o.split <= 0 || o.split >= 1) && n.push(`rig.accessories[${i}].split: must be strictly between 0 and 1`), o.pivot.every((m, w) => m === o.tip[w]) && n.push(`rig.accessories[${i}].tip: must differ from pivot`), (o.box[0] >= o.box[2] || o.box[1] >= o.box[3]) && n.push(`rig.accessories[${i}].box: rectangle must have positive area`);
  const a = /* @__PURE__ */ new Set();
  if (s.legs) {
    (s.legs.twist ?? 0) > 15 && n.push("rig.legs.twist: must be between 0 and 15 degrees");
    const i = s.legs;
    for (const o of ["left", "right"]) {
      const m = i[o];
      i.band[0] < m.hip[1] && m.hip[1] < m.knee[1] && m.knee[1] < m.ankle[1] || n.push(`rig.legs.${o}: require band start < hip y < knee y < ankle y`);
    }
    i.split.some((o, m) => m > 0 && o[1] <= i.split[m - 1][1]) && n.push("rig.legs.split: y coordinates must increase");
  }
  if (s.arms) {
    (s.arms.swing ?? 4) > 10 && n.push("rig.arms.swing: must be between 0 and 10 degrees"), (s.arms.bend ?? 6) > 12 && n.push("rig.arms.bend: must be between 0 and 12 degrees");
    for (const i of ["left", "right"]) {
      const o = s.arms[i], m = `rig.arms.${i}`;
      o.shoulder[1] < o.elbow[1] && o.elbow[1] < o.wrist[1] || n.push(`${m}: require shoulder y < elbow y < wrist y`);
      for (const [w, y] of Object.entries({ shoulder: [o.shoulder], elbow: [o.elbow], wrist: [o.wrist], split: o.split }))
        y.some(([v, h]) => v < 0 || h < 0 || v >= s.image.width || h >= s.image.height) && n.push(`${m}.${w}: points must stay inside the image`);
      if (o.split.some((w, y) => y > 0 && w[1] <= o.split[y - 1][1]))
        n.push(`${m}.split: y coordinates must increase`);
      else {
        const w = (y) => {
          let v = 0;
          for (; v < o.split.length - 2 && y > o.split[v + 1][1]; ) v++;
          const h = o.split[v], c = o.split[v + 1], d = Math.max(0, Math.min(1, (y - h[1]) / (c[1] - h[1])));
          return h[0] + (c[0] - h[0]) * d;
        };
        [o.elbow, o.wrist].some(([y, v]) => i === "left" ? w(v) <= y : w(v) >= y) && n.push(`${m}.split: must lie on the body side of elbow and wrist`);
      }
    }
  }
  for (const [i, o] of (s.cloth ?? []).entries()) {
    if ((!/^[A-Za-z0-9_-]+$/.test(o.name) || a.has(o.name)) && n.push(`rig.cloth[${i}].name: must be a unique layer-safe name`), o.parent !== void 0 && !a.has(o.parent) && n.push(`rig.cloth[${i}].parent: must name an earlier cloth entry`), ((o.columns ?? 2) < 2 || (o.rows ?? 2) < 2) && n.push(`rig.cloth[${i}]: columns and rows must be at least 2`), o.seams?.length === 1 && n.push(`rig.cloth[${i}].seams: at least two columns required`), o.seams?.length || o.tiers?.length) {
      o.seams?.some((m) => m.some((w, y) => y > 0 && w[1] <= m[y - 1][1])) && n.push(`rig.cloth[${i}].seams: y must increase from waist to hem`);
      try {
        ln(o);
      } catch (m) {
        n.push(`rig.cloth[${i}]: ${m instanceof Error ? m.message : String(m)}`);
      }
    }
    a.add(o.name);
  }
  return n;
}
function Bt(t) {
  const e = hn(t);
  if (e.length) throw new Error(`Invalid rig:
${e.join(`
`)}`);
  return structuredClone(t);
}
const qe = (t, e, n) => Math.max(e, Math.min(n, t)), je = (t, e, n) => {
  const s = qe((n - t) / (e - t), 0, 1);
  return s * s * (3 - 2 * s);
}, gt = (t, e) => Math.hypot(t[0] - e[0], t[1] - e[1]), ct = (t, e, n) => {
  const s = t[0] - e[0], a = t[1] - e[1], i = Math.cos(n), o = Math.sin(n);
  return [e[0] + s * i - a * o, e[1] + s * o + a * i];
};
function Nt(t, e, n, s) {
  const a = gt(t, e), i = gt(n, s), o = (e[0] - t[0]) / a, m = (e[1] - t[1]) / a, w = (s[0] - n[0]) / i, y = (s[1] - n[1]) / i, v = i / a, h = [
    w * v * o + y * m,
    w * v * m - y * o,
    y * v * o - w * m,
    y * v * m + w * o
  ];
  return [...h, n[0] - h[0] * t[0] - h[1] * t[1], n[1] - h[2] * t[0] - h[3] * t[1]];
}
const Dt = (t, e) => [e[0] * t[0] + e[1] * t[1] + e[4], e[2] * t[0] + e[3] * t[1] + e[5]], vt = Object.freeze({ spine: 0.7, bob: 2, twist: 0 });
function Ln(t, e, n = null) {
  if (!t) return null;
  const s = [t.left, t.right].map((L, C) => {
    const Y = gt(L.hip, L.knee), $ = gt(L.knee, L.ankle), q = Math.min(Y, $) * 0.05, X = Math.hypot(Y, q), oe = Math.hypot($, q), ee = L.ankle[0] - L.hip[0], J = L.ankle[1] - L.hip[1], B = ee * (L.knee[1] - L.hip[1]) - J * (L.knee[0] - L.hip[0]);
    return { ...L, u: X, v: oe, depth: q, lateral: B / Math.hypot(ee, J), side: Math.sign(B) || (C ? 1 : -1) };
  }), a = (t.twist ?? 0) > 0, i = (t.twist ?? 0) * Math.PI / 180, o = Math.max(1, ...s.map((L) => Math.abs(L.hip[0] - t.pelvis[0]) * 1.35)), m = Math.max(e.chest.rx, ...e.shoulders.map((L) => Math.abs(L.cx - e.chest.cx) + L.rx)), w = [0, 0], y = [0, 0];
  let v = 0;
  const h = (L, C, Y, $) => {
    const q = L - C, X = Math.max(0, 1 - (q / Y) ** 2);
    return q * (Math.cos($) - 1) + Y * 0.75 * X * X * Math.sin($);
  }, c = [0, 0, 0], d = [0, 0, 0];
  let l = 0, p = 0, u = 0, g = 0, r;
  function f(L, C) {
    const Y = qe(L.weightShift ?? 0, -1, 1), $ = Math.min(Math.max(C, 0), 0.05), q = y[0], X = a ? i * qe(0.4 * Y + ($ ? 0.6 * Math.tanh((Y - u) / $) : 0), -1, 1) : 0;
    if (!$)
      a && (w.fill(X), y.fill(0), v = 0), c.fill(Y), d.fill(0), l = 0, p = 0;
    else {
      const oe = (t.bob ?? vt.bob) * Math.min(1, Math.abs(Y - u) / $ / 1.5), ee = Math.ceil($ * 240), J = $ / ee;
      for (let B = 0; B < ee; B++) {
        for (let H = 0; H < 3; H++) {
          const V = H ? c[H - 1] : Y;
          d[H] += (576 * (V - c[H]) - 2 * 0.9 * 24 * d[H]) * J, c[H] += d[H] * J;
        }
        if (a) for (let H = 0; H < 2; H++) {
          const V = H ? w[0] : X;
          y[H] += (196 * (V - w[H]) - 2 * 0.95 * 14 * y[H]) * J, w[H] += y[H] * J;
        }
        p += (576 * (oe - l) - 2 * 0.9 * 24 * p) * J, l += p * J;
      }
    }
    a && $ && (v = (y[0] - q) / $), u = Y, g++;
  }
  const x = Math.min(...s.map((L) => L.ankle[1]));
  let b, T, F;
  function P(L) {
    const C = qe(L.weightShift ?? 0, -1, 1), Y = qe(L.bodyAngleX ?? 0, -10, 10);
    if (C === b && Y === T && g === r) return F;
    b = C, T = Y, r = g;
    const $ = -t.tilt * C, q = t.shift * C + Y / 10 * (e.hip?.shift ?? t.shift), X = a ? g ? w[0] : i * 0.4 * C : 0, oe = a ? -(1 - (t.spine ?? vt.spine)) * (g ? w[1] : X) : 0, ee = (Z) => {
      const M = ct(Z, t.pelvis, $);
      return a && (M[0] += h(Z[0], t.pelvis[0], o, X)), M[0] += q, M;
    }, J = s.map((Z) => ee(Z.hip)), B = s.map((Z, M) => Z.lateral + Z.side * t.bend * Math.max(0, M ? -C : C) ** 2), H = C * C + (Y / 10) ** 2, V = t.bend ** 2 / Math.min(...s.map((Z) => Z.u + Z.v)) * H, re = (Z) => (Z + Math.hypot(Z, V)) / 2;
    let ne = l + t.bend ** 2 / Math.min(...s.map((Z) => Z.u + Z.v)) * C * C;
    for (let Z = 0; Z < s.length; Z++) {
      const M = s[Z], E = J[Z], S = E[0] - M.ankle[0], R = Math.sqrt(Math.max(0, M.u * M.u - B[Z] ** 2)) + Math.sqrt(Math.max(0, M.v * M.v - B[Z] ** 2)), j = M.ankle[1] - Math.sqrt(Math.max(0, R * R - S * S)) - E[1];
      ne += re(j - ne);
    }
    const se = s.map((Z, M) => {
      const E = [J[M][0], J[M][1] + ne], S = Z.ankle;
      if (!C && !Y && !l && !X) return {
        hip: Z.hip,
        knee: Z.knee,
        ankle: S,
        hip3: [...Z.hip, 0],
        knee3: [...Z.knee, Z.depth],
        ankle3: [...S, 0],
        upper: [1, 0, 0, 1, 0, 0],
        lower: [1, 0, 0, 1, 0, 0]
      };
      const R = S[0] - E[0], j = S[1] - E[1], z = Math.hypot(R, j), _ = (Z.u * Z.u - Z.v * Z.v + z * z) / (2 * z), U = Math.sqrt(Math.max(0, Z.u * Z.u - _ * _)), G = [
        E[0] + R / z * _ - j / z * B[M],
        E[1] + j / z * _ + R / z * B[M]
      ], Q = Math.sqrt(Math.max(0, U * U - B[M] ** 2));
      return {
        hip: E,
        knee: G,
        ankle: S,
        hip3: [...E, 0],
        knee3: [...G, Q],
        ankle3: [...S, 0],
        upper: Nt(Z.hip, Z.knee, E, G),
        lower: Nt(Z.knee, Z.ankle, G, S)
      };
    });
    return F = {
      ws: C,
      bx: Y,
      angle: $,
      shift: q,
      drop: ne,
      bones: se,
      ...a && { twist: { pelvis: X, shoulder: oe, head: 0, acceleration: v } },
      trunk: { spine: c[0], chest: c[1], head: c[2], bob: l }
    }, F;
  }
  function te(L) {
    const C = t.split;
    let Y = 0;
    for (; Y < C.length - 2 && L > C[Y + 1][1]; ) Y++;
    const $ = C[Y], q = C[Y + 1], X = qe((L - $[1]) / (q[1] - $[1]), 0, 1);
    return $[0] + (q[0] - $[0]) * X;
  }
  function I(L, C) {
    const Y = C >= t.split[0][1] ? +(L >= te(C)) : je(te(C) - 4, te(C) + 4, L), $ = s.map((q) => ({
      leg: je(t.band[0], q.hip[1], C),
      shin: je(q.knee[1] - 45, q.knee[1] + 45, C),
      pin: 1 - je(q.ankle[1] - 55, q.ankle[1], C)
    }));
    return { right: Y, perBone: $ };
  }
  function D(L, C, Y, $, q) {
    const X = P(q);
    if (!X.ws && !X.bx && !X.trunk.chest && !X.trunk.head && !l && !X.twist?.pelvis && !X.twist?.shoulder) return;
    const oe = [t.pelvis[0] + X.shift, t.pelvis[1] + X.drop], ee = 1 - je(Math.min(e.chest.cy, t.pelvis[1] - 1), t.pelvis[1], Y), J = 1 - je(...t.band, Y), B = t.spine ?? vt.spine, H = t.tilt * (1 - B) * X.trunk.chest, V = t.shift * (1.12 * X.trunk.chest - X.ws) + Math.sin(H) * Math.max(0, t.pelvis[1] - e.chest.cy), re = (M) => {
      const E = ct(M, t.pelvis, X.angle);
      E[0] += X.shift, E[1] += X.drop;
      const S = ct(E, oe, (H - X.angle) * J);
      return S[0] += V * ee, S;
    }, ne = re(L);
    if (n) {
      const M = 1 - je(...n.weightBand, Y), E = re([n.pivotX, n.pivotY]), S = -t.tilt * (1 - B) * X.trunk.head * M, R = ct(ne, E, S);
      ne[0] = R[0] + t.shift * 1.12 * (X.trunk.head - X.trunk.chest) * M, ne[1] = R[1];
    }
    if (a) {
      const M = e.chest.cy + Math.max(40, (t.pelvis[1] - e.chest.cy) * 0.5), E = je(e.chest.cy, M, Y), S = X.twist.shoulder + (X.twist.pelvis - X.twist.shoulder) * E, R = e.chest.cx + (t.pelvis[0] - e.chest.cx) * E, j = m + (o - m) * E, z = n ? je(...n.weightBand, Y) : 1;
      ne[0] += h(C, R, j, S) * z;
    }
    let se = 0, Z = 0;
    s.forEach((M, E) => {
      const S = X.bones[E], R = $.perBone[E], j = Dt(L, S.upper), z = Dt(L, S.lower), _ = j[0] + (z[0] - j[0]) * R.shin, U = j[1] + (z[1] - j[1]) * R.shin, G = E ? $.right : 1 - $.right;
      se += ((ne[0] - L[0]) * (1 - R.leg) + (_ - L[0]) * R.leg) * R.pin * G, Z += ((ne[1] - L[1]) * (1 - R.leg) + (U - L[1]) * R.leg) * R.pin * G;
    }), L[0] += se, L[1] += Z;
  }
  function O(L) {
    return 1 - je(x - 55, x, L);
  }
  return { frame: P, weights: I, apply: D, pin: O, step: f };
}
const De = (t, e, n) => Math.max(e, Math.min(n, t)), et = (t, e = 0) => Number.isFinite(t) ? t : e, tt = (t, e, n) => {
  const s = De((n - t) / Math.max(1e-6, e - t), 0, 1);
  return s * s * (3 - 2 * s);
}, wt = (t, e, n) => {
  const s = t[0] - e[0], a = t[1] - e[1], i = Math.cos(n), o = Math.sin(n);
  return [e[0] + s * i - a * o, e[1] + s * o + a * i];
}, rt = Object.freeze({ swing: 4, bend: 6, inward: 0.4 });
function On(t, e, n = null) {
  if (!t) return null;
  const s = De(et(t.swing, rt.swing), 0, 10) * Math.PI / 180, a = De(et(t.bend, rt.bend), 0, 12) * Math.PI / 180, i = De(et(t.inward, rt.inward), 0, 1), o = [t.left, t.right];
  function m(h, c) {
    let d = 0;
    for (; d < h.length - 2 && c > h[d + 1][1]; ) d++;
    const l = h[d], p = h[d + 1], u = De((c - l[1]) / Math.max(1e-6, p[1] - l[1]), 0, 1);
    return l[0] + (p[0] - l[0]) * u;
  }
  function w(h, c) {
    return o.map((d, l) => {
      const p = Math.max(1, d.elbow[1] - d.shoulder[1]), u = Math.max(1, d.wrist[1] - d.elbow[1]), g = Math.max(1, Math.min(p, u, e.chest.ry) * 0.2), r = m(d.split, c), f = l ? h - r : r - h, x = +(f >= 0), b = tt(-g, g, f), T = tt(d.split[0][1] - g, d.split[0][1], c);
      return {
        arm: (b + (x - b) * T) * tt(d.shoulder[1], d.shoulder[1] + p * 0.55, c) * (1 - tt(d.split.at(-1)[1], d.split.at(-1)[1] + g, c)),
        forearm: tt(d.elbow[1] - g, d.elbow[1] + g, c)
      };
    });
  }
  function y(h, c = (d) => [...d]) {
    return o.map((d, l) => {
      const p = l ? "R" : "L", u = l ? -1 : 1, g = De(et(h[`armSwing${p}`]), -1, 1);
      return {
        shoulder: c(d.shoulder),
        elbow: c(d.elbow),
        swing: u * s * g * (g < 0 ? i : 1),
        // Flex inward; negative values never hyper-extend the elbow.
        bend: -u * a * De(et(h[`elbowBend${p}`]), 0, 1)
      };
    });
  }
  function v(h, c, d, l, p, u = y(p)) {
    const g = [...h];
    u.forEach((r, f) => {
      if (!l[f].arm || !r.swing && !r.bend) return;
      const x = r.swing ? wt(g, r.shoulder, r.swing) : g, b = r.swing ? wt(r.elbow, r.shoulder, r.swing) : r.elbow, T = r.bend ? wt(x, b, r.bend) : x;
      h[0] += (x[0] - g[0] + (T[0] - x[0]) * l[f].forearm) * l[f].arm, h[1] += (x[1] - g[1] + (T[1] - x[1]) * l[f].forearm) * l[f].arm;
    });
  }
  return { weights: w, frame: y, apply: v };
}
const mt = [
  { id: "angleX", label: "Face angle X", min: -30, max: 30, def: 0, group: "Head and body" },
  { id: "angleY", label: "Face angle Y", min: -30, max: 30, def: 0, group: "Head and body" },
  { id: "angleZ", label: "Face roll", min: -30, max: 30, def: 0, group: "Head and body" },
  { id: "bodyAngleX", label: "Body angle X", min: -10, max: 10, def: 0, group: "Head and body" },
  { id: "bodyAngleZ", label: "Body roll", min: -10, max: 10, def: 0, group: "Head and body" },
  { id: "breath", label: "Breath", min: 0, max: 1, def: 0, group: "Head and body" },
  { id: "eyeLOpen", label: "Left eye open", min: 0, max: 1.25, def: 1, group: "Eyes and brows" },
  { id: "eyeROpen", label: "Right eye open", min: 0, max: 1.25, def: 1, group: "Eyes and brows" },
  { id: "eyeSmile", label: "Eye smile", min: 0, max: 1, def: 0, group: "Eyes and brows" },
  { id: "gazeX", label: "Gaze X", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "gazeY", label: "Gaze Y", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "browY", label: "Brow Y", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "browAngle", label: "Brow angle", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "mouthOpen", label: "Mouth open", min: 0, max: 1, def: 0, group: "Mouth and cheeks" },
  { id: "mouthForm", label: "Mouth form (i to o)", min: -1, max: 1, def: 0, group: "Mouth and cheeks" },
  { id: "blush", label: "Blush", min: 0, max: 1, def: 0, group: "Mouth and cheeks" },
  { id: "armAngle", label: "Arm angle", min: -10, max: 10, def: 0, group: "Hand" },
  { id: "handAngle", label: "Wrist angle", min: -10, max: 10, def: 0, group: "Hand" },
  { id: "fingerTap", label: "Finger tap", min: 0, max: 1, def: 0, group: "Hand" },
  { id: "weightShift", label: "Weight shift", min: -1, max: 1, def: 0, group: "Legs" },
  ...["L", "R"].flatMap((t) => [
    { id: `armSwing${t}`, label: `Arm swing ${t}`, min: -1, max: 1, def: 0, group: "Arms" },
    { id: `elbowBend${t}`, label: `Elbow bend ${t}`, min: 0, max: 1, def: 0, group: "Arms" }
  ])
];
function Fn(t) {
  const e = { w: t.image.width, h: t.image.height }, n = (M, E, S) => S ? Math.exp(-(((M - S.cx) / S.rx) ** 2 + ((E - S.cy) / S.ry) ** 2)) : 0, s = 24, a = t.eyes;
  function i(M, E) {
    const S = Math.min(1, Math.max(0, E)) * (s - 1), R = Math.min(Math.floor(S), s - 2), j = S - R;
    return M[R] + (M[R + 1] - M[R]) * j;
  }
  function o(M, E, S, R) {
    E = Math.min(1, Math.max(0, E));
    const j = i(M.top, E), z = i(M.bot, E), _ = 1 - S, U = 4 * E * (1 - E), G = i(M.bot, 0.5) - i(M.top, 0.5), Q = M.top[0] + (M.top[s - 1] - M.top[0]) * E - 0.3 * G * U, A = Math.max(j, z + 1 + (Q - z - 1) * R);
    return [(A - j) * Math.max(_, -0.07), _ > 0 ? (A - z) * _ * R : 0];
  }
  const m = [[-2, 1], [-1, 2], [0, 3], [1, 2], [2, 1]], w = 5;
  function y(M, E, S, R) {
    let j = 0, z = 0;
    for (const [Q, A] of m) {
      const [k, N] = o(M, (E + Q * w - M.x0) / (M.x1 - M.x0), S, R);
      j += k * A / 9, z += N * A / 9;
    }
    const _ = Math.min(1, Math.max(0, (E - M.x0) / (M.x1 - M.x0))), U = i(M.top, _), G = i(M.bot, _);
    return { top: U, bot: G, b: 1 - S, lid: U + j, bc: G + z };
  }
  function v(M, E, S, R, j, z) {
    const _ = y(M, S, j, z);
    return E === "lash" ? _.lid - (_.top - R) * (1 - 0.3 * Math.min(1, Math.max(0, _.b))) : E === "low" ? R + (_.bc - _.bot) : E === "crease" ? R + (_.lid - _.top) * 0.22 : R;
  }
  function h(M, E, S) {
    const R = Math.min(1, Math.max(0, 1 - E));
    return M === "low" ? 1 - Math.min(1, R * S * 1.2) : M === "crease" ? 1 - 0.45 * R : 1;
  }
  const c = t.mouth, d = t.cheeks, l = t.head, p = t.body, u = Ln(t.legs, p, l), g = On(t.arms, p, t.legs), r = (M, E, S) => {
    const R = Math.min(1, Math.max(0, (S - M) / (E - M)));
    return R * R * (3 - 2 * R);
  };
  function f(M, E) {
    return 1 - r(...l.weightBand, E);
  }
  function x(M, E) {
    return 1 - r(...l.turnBand, E);
  }
  const b = t.strands ?? [];
  function T(M, E, S) {
    let R = 1 / 0, j = 0;
    const z = S.length - 1;
    for (let _ = 0; _ < z; _++) {
      const [U, G] = S[_], [Q, A] = S[_ + 1], k = Q - U, N = A - G, W = Math.min(1, Math.max(0, ((M - U) * k + (E - G) * N) / (k * k + N * N))), ae = Math.hypot(M - U - k * W, E - G - N * W);
      ae < R && (R = ae, j = (_ + W) / z);
    }
    return [R, j];
  }
  function F(M, E, S) {
    if (S < 0.02) return [];
    const R = [];
    let j = 0;
    b.forEach((_, U) => {
      const [G, Q] = T(M, E, _.nodes), A = Math.exp(-((G / _.sigma) ** 2));
      A < 0.02 || (R.push([U, A, Q]), j += A);
    });
    const z = Math.max(1, j);
    return R.map(([_, U, G]) => [_, S * U / z * r(0.04, 0.55, G), G]);
  }
  function P(M, E, S = 1) {
    return {
      head: f(M, E),
      turn: x(M, E),
      strands: F(M, E, S),
      bunL: n(M, E, t.buns?.bunL),
      bunR: n(M, E, t.buns?.bunR),
      brow: n(M, E, t.face.brow) * (1 - r(...t.face.brow.band, E)),
      // chin below the mouth line drops a little when the mouth opens
      jaw: n(M, E, t.face.jaw) * r(...t.face.jaw.band, E),
      // per-feature depth for head turns (nose sticks out most, ears sit at the back)
      nose: n(M, E, t.face.nose),
      mouth: n(M, E, t.face.mouth),
      eyeA: n(M, E, t.face.eyeA),
      eyeB: n(M, E, t.face.eyeB),
      earR: n(M, E, t.face.earR),
      earL: n(M, E, t.face.earL),
      chest: n(M, E, p.chest),
      breath: 1 - r(...p.breathBand, E),
      shoulder: p.shoulders.reduce((R, j) => R + n(M, E, j), 0),
      ...u && { legs: u.weights(M, E) },
      ...g && { arms: g.weights(M, E) }
    };
  }
  function te(M, E, S, R) {
    const j = (M - l.cx) / l.rx, z = (E - l.cy) / l.ry, _ = 1 - j * j - z * z;
    if (_ <= 0) return [0, 0];
    const U = r(0, 0.84, _);
    return [S * l.shiftX * U, -R * l.shiftY * U];
  }
  function I(M, E, S, R) {
    const j = Math.cos(R), z = Math.sin(R), _ = M[0] - E, U = M[1] - S;
    M[0] = E + _ * j - U * z, M[1] = S + _ * z + U * j;
  }
  function D(M, E, S, R = E) {
    const j = te(M[0], M[1], S.angleX / 30, S.angleY / 30);
    M[0] += j[0] * R, M[1] += j[1] * R, !(E <= 0) && I(M, l.pivotX, l.pivotY, -S.angleZ / 30 * l.maxRoll * E);
  }
  function O(M, E, S, R = 0, j = 1, z = 0, _) {
    u && u.apply(M, M[0], E, _ ?? u.weights(M[0], E), S);
    const U = M[0], G = M[1], Q = S.breath;
    M[1] -= Q * (5 * j + 4 * z), M[0] += (M[0] - p.chest.cx) * 0.012 * Q * R;
    const A = p.hip;
    if (u || (M[0] += S.bodyAngleX / 10 * (A ? A.shift * (1 - r(...A.band, E)) : 7 + 9 * R)), I(M, p.pivotX, p.pivotY, -S.bodyAngleZ / 10 * p.maxRoll * (1 - r(...p.rollBand, E))), u) {
      const k = u.pin(E);
      M[0] = U + (M[0] - U) * k, M[1] = G + (M[1] - G) * k;
    }
  }
  let L, C;
  function Y(M, E, S, R, j, z) {
    const _ = z;
    if (_[0] = M, _[1] = E, u && !u.pin(E)) return _;
    const U = j.gain;
    for (const [A, k, N] of S.strands) {
      const W = j.strands?.[A];
      if (!W) continue;
      const ae = N * 3, ie = Math.min(2, Math.floor(ae)), de = ae - ie;
      _[0] += (W[ie][0] + (W[ie + 1][0] - W[ie][0]) * de) * k * U, _[1] += (W[ie][1] + (W[ie + 1][1] - W[ie][1]) * de) * k * U;
    }
    if (_[0] += (j.bunL[0] * S.bunL + j.bunR[0] * S.bunR) * U, _[1] += (j.bunL[1] * S.bunL + j.bunR[1] * S.bunR) * U, _[1] -= R.browY * 7 * S.brow, S.brow > 0.01) {
      const A = R.browAngle * 0.12 * S.brow;
      _[1] += (M - t.face.brow.cx) * Math.sin(A);
    }
    _[1] += R.mouthOpen * 3.5 * S.jaw;
    const G = R.angleX / 30, Q = R.angleY / 30;
    if (_[0] += G * (8 * S.nose + 5 * S.mouth) + (M - t.face.eyeA.cx) * 0.12 * G * S.eyeA - (M - t.face.eyeB.cx) * 0.12 * G * S.eyeB - G * 9 * S.earR + G * 4 * S.earL - G * 10 * (S.bunL + S.bunR), _[1] -= Q * (6 * S.nose + 3 * S.mouth), _[1] += (E - t.face.eyeA.cy) * -0.06 * Math.abs(Q) * S.eyeA + (E - t.face.eyeB.cy) * -0.06 * Math.abs(Q) * S.eyeB, D(_, S.head, R, S.turn), O(_, E, R, S.chest, S.breath, S.shoulder, S.legs), g && S.arms.some((A) => A.arm > 0)) {
      const A = [
        R.angleX,
        R.angleY,
        R.angleZ,
        R.bodyAngleX,
        R.bodyAngleZ,
        R.breath,
        R.armSwingL,
        R.armSwingR,
        R.elbowBendL,
        R.elbowBendR,
        u?.frame(R)
      ];
      (!L || A.some((k, N) => k !== L[N])) && (L = A, C = g.frame(R, (k) => {
        const N = [...k], W = P(...k, 0);
        return D(N, W.head, R, W.turn), O(N, k[1], R, W.chest, W.breath, W.shoulder, W.legs), N;
      })), g.apply(_, M, E, S.arms, R, C);
    }
    return _;
  }
  const $ = t.hand, q = $?.elbow ?? [0, 0], X = $?.wrist ?? [0, 0], oe = $?.knuckle ?? [0, 0], ee = $?.contact ?? [0, 0], J = $?.forearmShare ?? 0;
  function B(M, E) {
    return $ ? {
      arm: 1 - r(...$.armBand, E),
      wrist: 1 - r(...$.wristBand, E),
      hand: 1 - r(...$.handBand, E),
      finger: r(...$.fingerXBand, M) * (1 - r(...$.fingerYBand, E)),
      pinBottom: r(...$.pinBand, E)
    } : { arm: 0, wrist: 0, hand: 0, finger: 0, pinBottom: 0 };
  }
  const H = (M, E, S, R) => {
    const j = M[0] - E[0], z = M[1] - E[1];
    return [E[0] + j * S - z * R, E[1] + j * R + z * S];
  }, V = (M) => Math.atan2(M[1], M[0]);
  function re(M) {
    const E = [...ee];
    D(E, f(...ee), M, x(...ee)), O(E, ee[1], M, 0, 1, 0);
    const S = [...q];
    O(S, q[1], M, 0, 0, 0);
    const R = (V([E[0] - S[0], E[1] - S[1]]) - V([ee[0] - q[0], ee[1] - q[1]])) * J, j = Math.cos(R), z = Math.sin(R), _ = (k) => {
      const N = H(k, q, j, z);
      return [N[0] + S[0] - q[0], N[1] + S[1] - q[1]];
    }, U = _(X), G = _(ee), Q = V([E[0] - U[0], E[1] - U[1]]) - V([G[0] - U[0], G[1] - U[1]]), A = Math.min(1.03, Math.max(0.97, Math.hypot(E[0] - U[0], E[1] - U[1]) / Math.hypot(G[0] - U[0], G[1] - U[1])));
    return { tr: _, w: U, b: Q, k: A };
  }
  function ne(M, E, S, R, j, z) {
    let _ = [M, E];
    _ = H(_, oe, Math.cos(R.fingerTap * 0.07 * S.finger), Math.sin(R.fingerTap * 0.07 * S.finger));
    const U = -R.handAngle / 10 * 0.045 * S.wrist, G = -R.armAngle / 10 * 0.015 * S.arm;
    _ = H(_, X, Math.cos(U), Math.sin(U)), _ = H(_, q, Math.cos(G), Math.sin(G)), _ = j.tr(_);
    const Q = j.b * S.hand, A = 1 + (j.k - 1) * S.hand;
    return _ = H(_, j.w, Math.cos(Q) * A, Math.sin(Q) * A), _[1] += (E - _[1]) * S.pinBottom, z[0] = _[0], z[1] = _[1], z;
  }
  const se = t.accessories ?? [];
  function Z(M, E, S, R) {
    const j = P(M.pivot[0], M.pivot[1]);
    return Y(M.pivot[0], M.pivot[1], j, E, S, R);
  }
  return { legs: u, stepBody: (M, E) => u?.step(M, E), IMG: e, EYES: a, MOUTH: c, CHEEKS: d, STRANDS: b, TASSELS: se, headWeight: f, turnWeight: x, baseWeights: P, deformBase: Y, applyHead: D, applyBody: O, handWeights: B, handFrame: re, deformHand: ne, eyePartY: v, eyePartAlpha: h, tasselAnchor: Z };
}
function _n(t, e, n, s = !1) {
  const a = s ? Math.max(e, n) * 2 : 1, i = new Float32Array(t.length), o = Math.SQRT2;
  for (let m = 0; m < n; m++) for (let w = 0; w < e; w++) {
    const y = m * e + w;
    t[y] <= 3 || (i[y] = Math.min(
      w ? i[y - 1] + 1 : a,
      m ? i[y - e] + 1 : a,
      w && m ? i[y - e - 1] + o : a,
      m && w + 1 < e ? i[y - e + 1] + o : a
    ));
  }
  for (let m = n - 1; m >= 0; m--) for (let w = e - 1; w >= 0; w--) {
    const y = m * e + w;
    !t[y] || t[y] <= 3 || (i[y] = Math.min(
      i[y],
      w + 1 < e ? i[y + 1] + 1 : a,
      m + 1 < n ? i[y + e] + 1 : a,
      w && m + 1 < n ? i[y + e - 1] + o : a,
      w + 1 < e && m + 1 < n ? i[y + e + 1] + o : a
    ));
  }
  return i;
}
function xt(t, e, n) {
  return Math.exp(-(((t - n.cx) / n.rx) ** 2 + ((e - n.cy) / n.ry) ** 2));
}
function jn(t, e, n) {
  const s = ((t - n.head.cx) / n.head.rx) ** 2 + ((e - n.head.cy) / n.head.ry) ** 2;
  let a = n.head.rx * 0.8 * Math.sqrt(Math.max(0, 1 - s)) + n.body.chest.rx * 0.23 * xt(t, e, n.body.chest);
  a += n.face.nose.rx * 0.2 * xt(t, e, n.face.nose);
  for (const [i, o] of n.cheeks) a += n.head.rx * 0.012 * xt(t, e, { cx: i, cy: o, rx: n.head.rx * 0.3, ry: n.head.ry * 0.16 });
  return a;
}
function yt(t, e, n, s) {
  const a = new Float32Array(t.length), i = new Float32Array(t.length), o = (m, w, y, v, h, c) => {
    for (let d = 0; d < v; d++) {
      const l = d * c;
      let p = 0, u = 0;
      for (let g = 0; g < Math.min(s, y - 1) + 1; g++)
        p += m[l + g * h], u++;
      for (let g = 0; g < y; g++) {
        w[l + g * h] = p / u;
        const r = g + s + 1, f = g - s;
        r < y && (p += m[l + r * h], u++), f >= 0 && (p -= m[l + f * h], u--);
      }
    }
  };
  return o(t, a, e, n, 1, e), o(a, i, n, e, e, 1), i;
}
function Un(t, e, n, s) {
  const a = yt(t, n, s, 1), i = yt(t, n, s, 6), o = new Float32Array(t.length);
  for (let y = 0; y < o.length; y++) o[y] = e[y] > 128 ? a[y] - i[y] : 0;
  const m = new Float32Array(t.length * 2), w = (y, v) => o[Math.max(0, Math.min(s - 1, v)) * n + Math.max(0, Math.min(n - 1, y))];
  for (let y = 0; y < s; y++) for (let v = 0; v < n; v++) {
    const h = y * n + v;
    e[h] <= 128 || (m[2 * h] = Math.max(-1, Math.min(1, -(w(v + 1, y) - w(v - 1, y)) * 4)), m[2 * h + 1] = Math.max(-1, Math.min(1, -(w(v, y + 1) - w(v, y - 1)) * 4)));
  }
  return m;
}
function $n(t, e, n, s, a, i = !0, o) {
  const m = !!a && s[0] === 0 && s[1] === 0 && s[2] === a.image.width && s[3] === a.image.height, w = _n(t, e, n, m), y = new Float32Array(t.length), v = s[2] / e, h = s[3] / n, c = Math.min(v, h), d = Math.min(s[2], s[3]) * 0.08;
  for (let r = 0; r < n; r++) for (let f = 0; f < e; f++) {
    const x = r * e + f;
    y[x] = (i ? Math.sqrt(w[x] * c * d) * 0.55 : 0) + (a ? jn(s[0] + (f + 0.5) * v, s[1] + (r + 0.5) * h, a) : 0);
  }
  const l = Math.max(1, Math.round(Math.min(e, n) * 0.02));
  y.set(yt(yt(y, e, n, l), e, n, l));
  const p = o ? Un(o, t, e, n) : null, u = new Uint8Array(e * n * 4), g = (r, f) => y[Math.max(0, Math.min(n - 1, f)) * e + Math.max(0, Math.min(e - 1, r))];
  for (let r = 0; r < n; r++) for (let f = 0; f < e; f++) {
    const x = -(g(f + 2, r) - g(f - 2, r)) / (4 * v), b = -(g(f, r + 2) - g(f, r - 2)) / (4 * h), T = Math.hypot(x, b, 1), F = (r * e + f) * 4, P = r * e + f;
    u[F] = Math.round((x / T * 0.5 + 0.5) * 255), u[F + 1] = Math.round((b / T * 0.5 + 0.5) * 255), u[F + 2] = Math.round(((p?.[2 * P] ?? 0) * 0.5 + 0.5) * 255), u[F + 3] = Math.round(((p?.[2 * P + 1] ?? 0) * 0.5 + 0.5) * 255);
  }
  return u;
}
const Zt = /* @__PURE__ */ new WeakMap();
function Bn(t, e, n, s) {
  const a = JSON.stringify([e, n.head, n.body.chest, n.face.nose, n.cheeks, s]), i = Zt.get(t);
  if (i?.key === a) return { ...i, computed: !1, ms: 0 };
  const o = performance.now(), m = Math.min(1, 512 / Math.max(t.width, t.height)), w = Math.max(1, Math.round(t.width * m)), y = Math.max(1, Math.round(t.height * m)), v = document.createElement("canvas");
  v.width = w, v.height = y;
  const h = v.getContext("2d", { willReadFrequently: !0 });
  h.drawImage(t, 0, 0, w, y);
  const c = h.getImageData(0, 0, w, y).data, d = new Uint8Array(w * y), l = new Float32Array(w * y);
  for (let u = 0; u < d.length; u++)
    d[u] = c[4 * u + 3], l[u] = (0.2126 * c[4 * u] + 0.7152 * c[4 * u + 1] + 0.0722 * c[4 * u + 2]) / 255;
  const p = { key: a, data: $n(d, w, y, e, n, s, s ? l : void 0), width: w, height: y };
  return Zt.set(t, p), { ...p, computed: !0, ms: performance.now() - o };
}
const Ve = Object.freeze({
  enabled: !1,
  x: 0.2,
  y: 0.2,
  z: 0.45,
  color: 16777215,
  strength: 0.8,
  intensity: 0.8,
  ambient: 0.4,
  mode: "soft",
  shadow: !1,
  reach: 1.2,
  ambientColor: 15659256,
  softness: 0.45,
  specular: 0.12,
  rim: 0.3,
  detail: 0.4
}), Wt = {
  x: [0, 1],
  y: [0, 1],
  z: [0.1, 2],
  color: [0, 16777215],
  strength: [0, 1],
  intensity: [0, 2],
  ambient: [0, 1],
  reach: [0.2, 3],
  ambientColor: [0, 16777215],
  softness: [0, 1],
  specular: [0, 1],
  rim: [0, 1],
  detail: [0, 1]
}, Pn = /* @__PURE__ */ new Set(["color", "ambientColor"]);
function Yn(t) {
  if (!t || typeof t != "object" || Array.isArray(t)) return null;
  const e = t;
  if (Object.keys(e).length !== Object.keys(Ve).length || Object.keys(e).some((s) => !(s in Ve)) || ![!0, !1].includes(e.enabled) || ![!0, !1].includes(e.shadow) || !["soft", "cel"].includes(e.mode)) return null;
  const n = { ...Ve, enabled: e.enabled, shadow: e.shadow, mode: e.mode };
  for (const s of Object.keys(Wt)) {
    const a = e[s], [i, o] = Wt[s];
    if (typeof a != "number" || !Number.isFinite(a) || Pn.has(s) && !Number.isInteger(a)) return null;
    n[s] = Math.max(i, Math.min(o, a));
  }
  return n;
}
const pt = -0.1, zn = 0.9, Xn = 1, In = 1.06;
function Cn(t, e) {
  return [(0.5 - t) * 0.12, (0.5 - e) * 0.12];
}
function Nn(t, e, n, s) {
  const a = t * Math.PI / 180, i = e * Math.PI / 180, o = -n / 30 * s, m = Math.cos(a), w = Math.sin(a), y = Math.cos(i), v = Math.sin(i), h = Math.cos(o), c = Math.sin(o);
  return [
    h * m,
    c * m,
    -w,
    h * w * v - c * y,
    c * w * v + h * y,
    m * v,
    h * w * y + c * v,
    c * w * y - h * v,
    m * y
  ];
}
class Dn {
  constructor(e, n) {
    this.gl = e, this.program = n(e, `#version 300 es
      out vec2 vUv;
      void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0, 1); }`, `#version 300 es
      precision highp float; in vec2 vUv; out vec4 o;
      uniform sampler2D uTex; uniform vec2 uStep; uniform vec2 uShift; uniform int uPass;
      float alphaAt(vec2 p) { if (any(lessThan(p, vec2(0))) || any(greaterThan(p, vec2(1)))) return 0.0; return texture(uTex, p).a; }
      void main() {
        if (uPass == 2) { o = texture(uTex, vUv); return; }
        vec2 p = vUv - uShift;
        float a = alphaAt(p) * 0.227027;
        a += (alphaAt(p + uStep * 1.384615) + alphaAt(p - uStep * 1.384615)) * 0.316216;
        a += (alphaAt(p + uStep * 3.230769) + alphaAt(p - uStep * 3.230769)) * 0.070270;
        o = uPass == 0 ? vec4(0, 0, 0, a) : vec4(vec3(0.035, 0.045, 0.065) * a * 0.28, a * 0.28);
      }`), this.vao = e.createVertexArray(), this.targets = [];
  }
  target(e, n) {
    const s = this.gl, a = s.createTexture(), i = s.createFramebuffer();
    if (s.bindTexture(s.TEXTURE_2D, a), s.texImage2D(s.TEXTURE_2D, 0, s.RGBA, e, n, 0, s.RGBA, s.UNSIGNED_BYTE, null), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_MIN_FILTER, s.LINEAR), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_MAG_FILTER, s.LINEAR), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_WRAP_S, s.CLAMP_TO_EDGE), s.texParameteri(s.TEXTURE_2D, s.TEXTURE_WRAP_T, s.CLAMP_TO_EDGE), s.bindFramebuffer(s.FRAMEBUFFER, i), s.framebufferTexture2D(s.FRAMEBUFFER, s.COLOR_ATTACHMENT0, s.TEXTURE_2D, a, 0), s.checkFramebufferStatus(s.FRAMEBUFFER) !== s.FRAMEBUFFER_COMPLETE) throw new Error("Shadow framebuffer unavailable");
    return { texture: a, framebuffer: i };
  }
  begin(e, n) {
    const s = this.gl;
    (this.width !== e || this.height !== n) && (this.clearTargets(), this.width = e, this.height = n, this.targets = [this.target(e, n), this.target(Math.ceil(e / 2), Math.ceil(n / 2))]), s.bindFramebuffer(s.FRAMEBUFFER, this.targets[0].framebuffer), s.viewport(0, 0, e, n), s.clearColor(0, 0, 0, 0), s.clear(s.COLOR_BUFFER_BIT);
  }
  composite(e) {
    const n = this.gl, { prog: s, u: a } = this.program, i = this.width, o = this.height;
    n.useProgram(s), n.bindVertexArray(this.vao), n.activeTexture(n.TEXTURE0), n.uniform1i(a.uTex, 0), n.disable(n.BLEND), n.bindFramebuffer(n.FRAMEBUFFER, this.targets[1].framebuffer), n.viewport(0, 0, Math.ceil(i / 2), Math.ceil(o / 2)), n.bindTexture(n.TEXTURE_2D, this.targets[0].texture), n.uniform1i(a.uPass, 0), n.uniform2f(a.uShift, 0, 0), n.uniform2f(a.uStep, 3 / i, 0), n.drawArrays(n.TRIANGLES, 0, 3), n.bindFramebuffer(n.FRAMEBUFFER, null), n.viewport(0, 0, i, o), n.clearColor(0, 0, 0, 0), n.clear(n.COLOR_BUFFER_BIT), n.enable(n.BLEND), n.bindTexture(n.TEXTURE_2D, this.targets[1].texture);
    const m = Cn(e.x, e.y);
    n.uniform1i(a.uPass, 1), n.uniform2f(a.uShift, m[0], -m[1]), n.uniform2f(a.uStep, 0, 3 / o), n.drawArrays(n.TRIANGLES, 0, 3), n.bindTexture(n.TEXTURE_2D, this.targets[0].texture), n.uniform1i(a.uPass, 2), n.drawArrays(n.TRIANGLES, 0, 3), n.bindVertexArray(null);
  }
  clearTargets() {
    for (const e of this.targets)
      this.gl.deleteTexture(e.texture), this.gl.deleteFramebuffer(e.framebuffer);
    this.targets = [];
  }
  destroy() {
    this.clearTargets(), this.gl.deleteProgram(this.program.prog), this.gl.deleteVertexArray(this.vao);
  }
}
function Zn(t, e) {
  const { IMG: n, EYES: s, MOUTH: a, CHEEKS: i } = t, o = `#version 300 es
  in vec2 aPos; in vec2 aUv;
  uniform vec2 uScale; uniform vec2 uOffset;
  out vec2 vUv;
  void main() { vUv = aUv; gl_Position = vec4(aPos * uScale + uOffset, 0.0, 1.0); }`, m = `#version 300 es
  precision highp float;
  in vec2 vUv; out vec4 outColor;
  uniform sampler2D uTex;
  uniform vec4 uRect;        // layer rect in source px
  uniform int uFace;
  uniform float uAlpha;
  uniform vec4 uEyeBox[2];   // x0, x1, -, -
  uniform float uEyeTop[48]; // 2 eyes x EYE_N samples
  uniform float uEyeBot[48];
  uniform vec4 uEyeState[2]; // open, smile, ballX(px), ballY(px)
  uniform vec4 uMouth;       // cx, cy, angle, halfLen
  uniform vec4 uMouthState;  // open, form, bow, -
  uniform vec4 uCheeks;      // x0, y0, x1, y1
  uniform float uCheek;

  const int EYE_N = 24;
  float crv(int e, bool top, float u) {
    float f = clamp(u, 0.0, 1.0) * float(EYE_N - 1);
    int i = min(int(floor(f)), EYE_N - 2);
    float t = f - float(i);
    int k = e * EYE_N + i;
    return top ? mix(uEyeTop[k], uEyeTop[k + 1], t) : mix(uEyeBot[k], uEyeBot[k + 1], t);
  }

  // Upper lid line and lower lid line of eye e at column u, for the current open/smile state.
  // Must match eyeLids() in rig.js, which moves the lash meshes to the same lines.
  // Must match eyeLidsRaw() / eyeLids() in rig.js.
  vec2 eyeLidsRaw(int e, float u) {
    u = clamp(u, 0.0, 1.0);
    vec4 st = uEyeState[e];
    float top = crv(e, true, u), bot = crv(e, false, u);
    float b = 1.0 - st.x, smile = st.y, hump = 4.0 * u * (1.0 - u);
    float H = crv(e, false, 0.5) - crv(e, true, 0.5);
    float arc = mix(uEyeTop[e * EYE_N], uEyeTop[e * EYE_N + EYE_N - 1], u) - 0.3 * H * hump;
    float closed = max(top, bot + 1.0 + (arc - bot - 1.0) * smile);
    return vec2((closed - top) * max(b, -0.07), b > 0.0 ? (closed - bot) * b * smile : 0.0);
  }

  vec2 eyeLids(int e, float u, float top, float bot) {
    vec4 box = uEyeBox[e];
    float du = 5.0 / (box.y - box.x);
    vec2 raw = eyeLidsRaw(e, u);
    vec2 d = (eyeLidsRaw(e, u - 2.0 * du) + 2.0 * eyeLidsRaw(e, u - du) + 3.0 * raw
            + 2.0 * eyeLidsRaw(e, u + du) + eyeLidsRaw(e, u + 2.0 * du)) / 9.0;
    // for hiding the ball take whichever closes more: the smoothed lash can sit a little
    // above the raw lid near the corners, and the gap must show lid skin, not eye white
    return vec2(top + max(d.x, raw.x), bot + min(d.y, raw.y));
  }

  vec4 texAt(vec2 p) { return texture(uTex, (p - uRect.xy) / uRect.zw); }

  // Half-eye sprites share the open eye's rig curves. Use the middle of that
  // opening for gaze, tapering travel near the painted lids and corners.
  vec2 halfEyeUv(int e, vec2 p) {
    vec2 gaze = uEyeState[e].zw;
    vec2 box = uEyeBox[e].xy;
    float span = box.y - box.x;
    float u = (p.x - box.x) / span;
    if (all(equal(gaze, vec2(0.0))) || u <= 0.0 || u >= 1.0) return vUv;
    float top = crv(e, true, u), bottom = crv(e, false, u);
    float height = bottom - top;
    if (height < 2.0) return vUv;
    float v = (p.y - top) / height;
    float w = smoothstep(0.18, 0.34, v) * (1.0 - smoothstep(0.70, 0.85, v))
            * smoothstep(0.0, 0.23, min(u, 1.0 - u));
    if (w == 0.0) return vUv;
    float x = p.x - clamp(gaze.x * 0.8, -0.08 * span, 0.08 * span) * w;
    float sourceU = (x - box.x) / span;
    float dy = clamp(gaze.y / height, -0.05, 0.05) * w;
    float y = mix(crv(e, true, sourceU), crv(e, false, sourceU), v - dy);
    return (vec2(x, y) - uRect.xy) / uRect.zw;
  }

  // Eye white + iris layer: shown only between the lids (the lids cover it, it never squashes);
  // the iris slides inside the opening for the gaze.
  vec4 eyeBall(int e, vec2 p) {
    vec4 box = uEyeBox[e]; vec4 st = uEyeState[e];
    float u = clamp((p.x - box.x) / (box.y - box.x), 0.0, 1.0);
    float top = crv(e, true, u), bot = crv(e, false, u);
    vec2 lids = eyeLids(e, u, top, bot);
    float v = clamp((p.y - top) / max(bot - top, 1.0), 0.0, 1.0);
    float w = sqrt(4.0 * u * (1.0 - u)) * sqrt(4.0 * v * (1.0 - v));
    vec4 c = texAt(p - vec2(st.z, st.w) * w);
      // the lash covers ~2px of the ball's upper edge, so the cut can sit under it (no seam)
    return c * smoothstep(lids.x - 1.0, lids.x + 0.5, p.y) * (1.0 - smoothstep(lids.y - 0.9, lids.y + 0.6, p.y));
  }

  vec4 mouth(vec2 p, vec4 base) {
    float open = uMouthState.x;
    if (open < 0.01) return base;
    vec2 d = vec2(cos(uMouth.z), sin(uMouth.z)), n = vec2(-d.y, d.x);
    vec2 r = p - uMouth.xy;
    float s = dot(r, d) / uMouth.w, t = dot(r, n);
    float form = uMouthState.y;                       // -1 wide "i" .. +1 round "o"
    float wf = mix(0.78, 0.46, clamp(form * 0.5 + 0.5, 0.0, 1.0));
    float k = 1.0 - (s / wf) * (s / wf);
    if (k <= 0.0) return base;
    float line = uMouthState.z * (1.0 - s * s);
    float hk = pow(k, mix(0.55, 0.85, clamp(form, 0.0, 1.0)));
    float H = mix(20.0, 26.0, clamp(form, 0.0, 1.0));
    float up = line - 0.6 - open * 2.5 * hk;
    float lo = line + open * H * hk;
    float cov = smoothstep(-0.7, 0.7, t - up) * smoothstep(-0.7, 0.7, lo - t);
    if (cov <= 0.0) return base;
    float tv = clamp((t - up) / max(lo - up, 1.0), 0.0, 1.0);
    vec3 col = mix(vec3(0.24, 0.05, 0.08), vec3(0.48, 0.15, 0.19), tv);
    float tongue = smoothstep(0.5, 0.78, tv) * (1.0 - smoothstep(0.45, 0.8, abs(s) / wf));
    col = mix(col, vec3(0.86, 0.44, 0.47), tongue * 0.9);
    float teeth = (1.0 - smoothstep(0.12, 0.22, tv)) * smoothstep(0.25, 0.45, open) * (1.0 - smoothstep(0.55, 0.85, abs(s) / wf));
    col = mix(col, vec3(0.99, 0.96, 0.94), teeth);
    float rim = 1.0 - smoothstep(0.6, 1.8, lo - t);
    col = mix(col, vec3(0.36, 0.09, 0.11), rim * 0.85);
    return vec4(mix(base.rgb, col, cov), 1.0);
  }

  void main() {
    vec2 p = uRect.xy + vUv * uRect.zw;
    vec2 materialUv = vUv;
    vec4 c;
    if (uFace == 1) {
      c = mouth(p, texAt(p));
      float blush = exp(-dot((p - uCheeks.xy) / vec2(48.0, 22.0), (p - uCheeks.xy) / vec2(48.0, 22.0)))
                  + exp(-dot((p - uCheeks.zw) / vec2(40.0, 20.0), (p - uCheeks.zw) / vec2(40.0, 20.0)));
      c.rgb = mix(c.rgb, c.rgb * vec3(1.0, 0.62, 0.64) , clamp(blush * uCheek * 0.55, 0.0, 1.0) * c.a);
    } else if (uFace >= 4) {
      materialUv = halfEyeUv(uFace - 4, p);
      c = texture(uTex, materialUv);
    } else if (uFace >= 2) {
      c = eyeBall(uFace - 2, p);
    } else {
      c = texAt(p);
    }
    outColor = c * uAlpha;
  }`, w = o.replace("out vec2 vUv;", "in float aHeadWeight; out float vHeadWeight; out vec2 vScreen; out vec2 vUv;").replace("vUv = aUv;", "vHeadWeight = aHeadWeight; vScreen = vec2((aPos.x * uScale.x + uOffset.x + 1.0) * 0.5, (1.0 - aPos.y * uScale.y - uOffset.y) * 0.5); vUv = aUv;"), y = m.replace("uniform sampler2D uTex;", `uniform sampler2D uTex;
    uniform sampler2D uNormal; in float vHeadWeight; in vec2 vScreen;
    uniform mat3 uHeadRotation; uniform vec3 uLight; uniform vec3 uLightColor; uniform vec3 uAmbientColor;
    uniform vec4 uLighting; uniform vec4 uSurface; uniform float uAspect; uniform int uCel;`).replace("outColor = c * uAlpha;", `
      // RG hold the smooth surface normal, BA the painting's relief (see lighting/normals.ts).
      vec4 encoded = texture(uNormal, materialUv);
      vec2 base = encoded.rg * 2.0 - 1.0;
      vec3 n = vec3(base, sqrt(max(0.0, 1.0 - dot(base, base))));
      n = normalize(n + vec3((encoded.ba * 2.0 - 1.0) * uSurface.w * ${zn.toFixed(3)}, 0.0));
      n = normalize(mix(n, uHeadRotation * n, vHeadWeight));
      vec2 toLight = (uLight.xy - vScreen) * vec2(uAspect, 1.0);
      vec3 light = normalize(vec3(toLight, uLight.z));
      float ndl = dot(n, light);
      float diffuse;
      if (uCel == 1) {
        float w = 0.01 + uSurface.x * 0.08;
        diffuse = 0.2 + 0.45 * smoothstep(${pt.toFixed(3)} - w, ${pt.toFixed(3)} + w, ndl) + 0.35 * smoothstep(0.55 - w, 0.55 + w, ndl);
      } else {
        float s = 0.05 + uSurface.x * 0.5;
        diffuse = smoothstep(${pt.toFixed(3)} - s, ${pt.toFixed(3)} + s, ndl) * (0.35 + 0.65 * max(0.0, ndl));
      }
      float reach = dot(toLight, toLight) / (uLighting.w * uLighting.w);
      float attenuation = 1.0 / (1.0 + reach);
      vec3 radiance = uLightColor * uLighting.y * attenuation;
      // A light close to the surface may brighten a little, but must not bleach painted colours.
      vec3 irradiance = min(uAmbientColor * uLighting.z + radiance * diffuse, vec3(${In.toFixed(3)}));
      // Painted shadows are deeper versions of the base colour, not grey: multiply by the colour
      // itself as the surface turns away from the light.
      vec3 albedo = c.rgb / max(c.a, 1e-4);
      float dark = 1.0 - clamp(dot(irradiance, vec3(0.3333)), 0.0, 1.0);
      vec3 shaded = c.rgb * mix(vec3(1.0), albedo, dark * ${Xn.toFixed(3)}) * irradiance;
      float specular = pow(max(dot(n, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 60.0) * uSurface.y;
      if (uCel == 1) specular = smoothstep(0.3, 0.35, specular) * uSurface.y;
      vec2 side = length(n.xy) > 0.001 ? normalize(n.xy) : vec2(0.0);
      float rim = pow(1.0 - max(n.z, 0.0), 4.0) * smoothstep(-0.2, 0.7, dot(side, normalize(toLight + vec2(1e-4)))) * uSurface.z;
      shaded += radiance * (specular * max(0.0, ndl) + rim) * c.a;
      // Strength blends between the original painting and the relit result; alpha is unchanged.
      c.rgb = clamp(mix(c.rgb, shaded, uLighting.x), vec3(0.0), vec3(c.a));
      outColor = c * uAlpha;`), v = `#version 300 es
  in vec2 aPos; uniform vec2 uScale; uniform vec2 uOffset;
  void main() { gl_Position = vec4(aPos * uScale + uOffset, 0.0, 1.0); gl_PointSize = 7.0; }`, h = `#version 300 es
  precision mediump float; uniform vec4 uColor; out vec4 o; void main() { o = uColor; }`;
  function c(u, g, r) {
    const f = u.createProgram();
    for (const [T, F] of [[u.VERTEX_SHADER, g], [u.FRAGMENT_SHADER, r]]) {
      const P = u.createShader(T);
      if (u.shaderSource(P, F), u.compileShader(P), !u.getShaderParameter(P, u.COMPILE_STATUS)) throw new Error(u.getShaderInfoLog(P));
      u.attachShader(f, P), u.deleteShader(P);
    }
    if (u.bindAttribLocation(f, 0, "aPos"), u.bindAttribLocation(f, 1, "aUv"), u.bindAttribLocation(f, 2, "aHeadWeight"), u.linkProgram(f), !u.getProgramParameter(f, u.LINK_STATUS)) throw new Error(u.getProgramInfoLog(f));
    const x = {}, b = u.getProgramParameter(f, u.ACTIVE_UNIFORMS);
    for (let T = 0; T < b; T++) {
      const F = u.getActiveUniform(f, T).name.replace("[0]", "");
      x[F] = u.getUniformLocation(f, F);
    }
    return { prog: f, u: x };
  }
  function d(u, g, r, f) {
    const x = [u];
    let b = u;
    for (; b < u + g - 0.5; ) {
      const T = f && b >= f.from && b < f.to ? f.cell : r;
      b = Math.min(u + g, b + T), x.push(b);
    }
    return x;
  }
  function l(u, g, r, f, x = null) {
    const [b, T, F, P] = u, te = d(b, F, g, x && { from: x.x0, to: x.x1, cell: x.cell }), I = d(T, P, g, x && { from: x.y0, to: x.y1, cell: x.cell }), D = te.length - 1, O = I.length - 1, L = (D + 1) * (O + 1), C = new Float32Array(L * 2), Y = new Float32Array(L * 2);
    for (let ee = 0; ee <= O; ee++) for (let J = 0; J <= D; J++) {
      const B = ee * (D + 1) + J;
      C[B * 2] = te[J], C[B * 2 + 1] = I[ee], Y[B * 2] = (te[J] - b) / F, Y[B * 2 + 1] = (I[ee] - T) / P;
    }
    const $ = [], q = [], X = r.length / f, oe = f === 1 ? 0 : 1;
    for (let ee = 0; ee < O; ee++) for (let J = 0; J < D; J++) {
      const B = Math.floor(te[J] - b) * oe - 2, H = Math.ceil(te[J + 1] - b) * oe + 2, V = Math.floor(I[ee] - T) * oe - 2, re = Math.ceil(I[ee + 1] - T) * oe + 2;
      let ne = !1;
      for (let S = Math.max(0, V); S < Math.min(X, re) && !ne; S += 1)
        for (let R = Math.max(0, B); R < Math.min(f, H); R += 1)
          if (r[S * f + R] > 3) {
            ne = !0;
            break;
          }
      if (!ne) continue;
      const se = ee * (D + 1) + J, Z = se + 1, M = se + D + 1, E = M + 1;
      $.push(se, Z, M, Z, E, M), q.push(se, Z, se, M, Z, M), J === D - 1 && q.push(Z, E), ee === O - 1 && q.push(M, E);
    }
    return { rect: u, cols: D, rows: O, rest: C, uv: Y, pos: new Float32Array(C), tris: new Uint32Array($), lines: new Uint32Array(q) };
  }
  class p {
    // padTop / padSide: margin around the image, as a share of its height / width. A negative
    // padTop pushes the top of the image above the canvas (hides a cut-off top edge).
    constructor(g, { padTop: r = 0, padSide: f = 0, fit: x = "contain" } = {}) {
      this.pad = { top: r, side: f }, this.fit = x;
      const b = g.getContext("webgl2", { premultipliedAlpha: !0, antialias: !0, alpha: !0, preserveDrawingBuffer: !0 });
      if (!b) throw new Error("WebGL2 is not available");
      this.gl = b, this.canvas = g, this.main = c(b, o, m), this.line = c(b, v, h), this.layers = [], this.lighting = Ve, this.lightingStats = { normalMs: 0, computedLayers: 0, cachedLayers: 0 }, b.enable(b.BLEND), b.blendFunc(b.ONE, b.ONE_MINUS_SRC_ALPHA);
    }
    texture(g) {
      const r = this.gl, f = r.createTexture();
      return r.bindTexture(r.TEXTURE_2D, f), r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !0), r.texImage2D(r.TEXTURE_2D, 0, r.RGBA, r.RGBA, r.UNSIGNED_BYTE, g), r.generateMipmap(r.TEXTURE_2D), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_MIN_FILTER, r.LINEAR_MIPMAP_LINEAR), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_MAG_FILTER, r.LINEAR), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_WRAP_S, r.CLAMP_TO_EDGE), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_WRAP_T, r.CLAMP_TO_EDGE), f;
    }
    addLayer(g, r, f, x = {}) {
      const b = this.gl, T = b.createVertexArray();
      b.bindVertexArray(T);
      const F = b.createBuffer();
      b.bindBuffer(b.ARRAY_BUFFER, F), b.bufferData(b.ARRAY_BUFFER, f.pos, b.DYNAMIC_DRAW);
      for (const C of [this.main, this.line]) {
        const Y = b.getAttribLocation(C.prog, "aPos");
        b.enableVertexAttribArray(Y), b.vertexAttribPointer(Y, 2, b.FLOAT, !1, 0, 0);
      }
      const P = b.createBuffer();
      b.bindBuffer(b.ARRAY_BUFFER, P), b.bufferData(b.ARRAY_BUFFER, f.uv, b.STATIC_DRAW);
      const te = b.getAttribLocation(this.main.prog, "aUv");
      b.enableVertexAttribArray(te), b.vertexAttribPointer(te, 2, b.FLOAT, !1, 0, 0);
      const I = b.createBuffer();
      b.bindBuffer(b.ELEMENT_ARRAY_BUFFER, I), b.bufferData(b.ELEMENT_ARRAY_BUFFER, f.tris, b.STATIC_DRAW), b.bindVertexArray(null);
      const D = b.createBuffer();
      b.bindBuffer(b.ELEMENT_ARRAY_BUFFER, D), b.bufferData(b.ELEMENT_ARRAY_BUFFER, f.lines, b.STATIC_DRAW);
      let O = x.face ? 1 : 0;
      x.eyeBall !== void 0 && (O = 2 + x.eyeBall), x.halfEye !== void 0 && (O = 4 + x.halfEye);
      const L = { name: g, image: r, mesh: f, tex: this.texture(r), vao: T, posBuf: F, uvBuf: P, triBuf: I, lineBuf: D, visible: !0, faceMode: O, color: x.color || [1, 1, 1, 1] };
      return this.layers.push(L), L;
    }
    destroy() {
      const g = this.gl;
      for (const r of this.layers) {
        g.deleteTexture(r.tex), r.normal && g.deleteTexture(r.normal), r.headBuf && g.deleteBuffer(r.headBuf), g.deleteVertexArray(r.vao);
        for (const f of [r.posBuf, r.uvBuf, r.triBuf, r.lineBuf]) g.deleteBuffer(f);
      }
      g.deleteProgram(this.main.prog), g.deleteProgram(this.line.prog), this.lit && g.deleteProgram(this.lit.prog), this.shadow?.destroy(), this.layers.length = 0;
    }
    setLighting(g) {
      if (this.lighting = Yn({ ...Ve, ...g }) ?? Ve, !this.lighting.enabled) return;
      const r = this.gl;
      this.lit || (this.lit = c(r, w, y));
      for (const f of this.layers) {
        if (f.normal || f.overlay) continue;
        const x = Bn(f.image, f.mesh.rect, e, !/^(eye|mouth)/.test(f.name));
        this.lightingStats.normalMs += x.ms, this.lightingStats[x.computed ? "computedLayers" : "cachedLayers"]++, f.normal = r.createTexture(), r.activeTexture(r.TEXTURE0), r.bindTexture(r.TEXTURE_2D, f.normal), r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), r.texImage2D(r.TEXTURE_2D, 0, r.RGBA, x.width, x.height, 0, r.RGBA, r.UNSIGNED_BYTE, x.data), r.generateMipmap(r.TEXTURE_2D), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_MIN_FILTER, r.LINEAR_MIPMAP_LINEAR), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_MAG_FILTER, r.LINEAR), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_WRAP_S, r.CLAMP_TO_EDGE), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_WRAP_T, r.CLAMP_TO_EDGE);
        const b = new Float32Array(f.mesh.rest.length / 2);
        for (let T = 0; T < b.length; T++) b[T] = t.headWeight(f.mesh.rest[T * 2], f.mesh.rest[T * 2 + 1]);
        f.headBuf = r.createBuffer(), r.bindVertexArray(f.vao), r.bindBuffer(r.ARRAY_BUFFER, f.headBuf), r.bufferData(r.ARRAY_BUFFER, b, r.STATIC_DRAW), r.enableVertexAttribArray(2), r.vertexAttribPointer(2, 1, r.FLOAT, !1, 0, 0);
      }
      r.bindVertexArray(null), this.lighting.shadow && !this.shadow && (this.shadow = new Dn(r, c));
    }
    resize() {
      const g = this.canvas, r = Math.min(window.devicePixelRatio || 1, 2), f = Math.round(g.clientWidth * r), x = Math.round(g.clientHeight * r);
      (g.width !== f || g.height !== x) && (g.width = f, g.height = x);
      const b = (this.fit === "cover" ? Math.max : Math.min)(f / (n.w * (1 + 2 * this.pad.side)), x / (n.h * (1 + this.pad.top))), T = (f - n.w * b) / 2, F = (x - n.h * b) / (this.fit === "cover" ? 2 : 1);
      this.scale = [2 * b / f, -2 * b / x], this.offset = [-1 + 2 * T / f, 1 - 2 * F / x], this.pxScale = b, this.pxOff = [T, F];
    }
    draw(g) {
      const r = this.gl;
      this.resize(), r.viewport(0, 0, this.canvas.width, this.canvas.height), r.clearColor(0, 0, 0, 0), r.clear(r.COLOR_BUFFER_BIT);
      const f = this.lighting.enabled, x = f && this.lighting.shadow;
      x && this.shadow.begin(this.canvas.width, this.canvas.height);
      const b = f ? this.lit : this.main;
      if (this.current = b, r.useProgram(b.prog), f) {
        const T = this.lighting;
        r.uniform1i(b.u.uNormal, 1), r.uniform3f(b.u.uLight, T.x, T.y, T.z), r.uniform3f(b.u.uLightColor, (T.color >> 16 & 255) / 255, (T.color >> 8 & 255) / 255, (T.color & 255) / 255), r.uniform3f(b.u.uAmbientColor, (T.ambientColor >> 16 & 255) / 255, (T.ambientColor >> 8 & 255) / 255, (T.ambientColor & 255) / 255), r.uniform4f(b.u.uLighting, T.strength, T.intensity, T.ambient, T.reach), r.uniform4f(b.u.uSurface, T.softness, T.specular, T.rim, T.detail), r.uniform1f(b.u.uAspect, this.canvas.width / this.canvas.height), r.uniform1i(b.u.uCel, T.mode === "cel" ? 1 : 0), r.uniformMatrix3fv(b.u.uHeadRotation, !1, Nn(g.angleX ?? 0, g.angleY ?? 0, g.angleZ ?? 0, e.head.maxRoll));
      }
      r.uniform2fv(b.u.uScale, this.scale), r.uniform2fv(b.u.uOffset, this.offset), r.uniform1i(b.u.uTex, 0), r.uniform4fv(b.u.uEyeBox, s.flatMap((T) => [T.x0, T.x1, 0, 0])), r.uniform1fv(b.u.uEyeTop, s.flatMap((T) => T.top)), r.uniform1fv(b.u.uEyeBot, s.flatMap((T) => T.bot)), r.uniform4fv(b.u.uEyeState, g.eyes), r.uniform4f(b.u.uMouth, a.cx, a.cy, a.angle, a.halfLen), r.uniform4f(b.u.uMouthState, g.mouthOpen, g.mouthForm, a.bow, 0), r.uniform4f(b.u.uCheeks, i[0][0], i[0][1], i[1][0], i[1][1]), r.uniform1f(b.u.uCheek, g.cheek), r.activeTexture(r.TEXTURE0);
      for (const T of this.layers)
        !T.visible || T.overlay || this.drawLayer(T, T.alpha ?? 1);
      if (this.original && g.originalAlpha > 0 && this.drawLayer(this.original, g.originalAlpha), x && this.shadow.composite(this.lighting), g.showMesh) {
        const T = this.line;
        r.useProgram(T.prog), r.uniform2fv(T.u.uScale, this.scale), r.uniform2fv(T.u.uOffset, this.offset);
        for (const F of this.layers)
          !F.visible || F.overlay || (r.bindVertexArray(F.vao), r.bindBuffer(r.ELEMENT_ARRAY_BUFFER, F.lineBuf), r.uniform4fv(T.u.uColor, F.color), r.drawElements(r.LINES, F.mesh.lines.length, r.UNSIGNED_INT, 0), r.bindBuffer(r.ELEMENT_ARRAY_BUFFER, F.triBuf));
        g.joints?.length && this.drawPoints(g.joints), r.bindVertexArray(null);
      }
    }
    drawLayer(g, r) {
      const f = this.gl, x = this.current;
      f.useProgram(x.prog), f.bindVertexArray(g.vao), f.bindBuffer(f.ARRAY_BUFFER, g.posBuf), f.bufferSubData(f.ARRAY_BUFFER, 0, g.mesh.pos), this.lighting.enabled && (f.activeTexture(f.TEXTURE1), f.bindTexture(f.TEXTURE_2D, g.normal), f.activeTexture(f.TEXTURE0)), f.bindTexture(f.TEXTURE_2D, g.tex), f.uniform4fv(x.u.uRect, g.mesh.rect), f.uniform1i(x.u.uFace, g.faceMode), f.uniform1f(x.u.uAlpha, r), f.drawElements(f.TRIANGLES, g.mesh.tris.length, f.UNSIGNED_INT, 0);
    }
    drawPoints(g) {
      const r = this.gl, f = this.line;
      if (!this.pointBuf) {
        this.pointBuf = r.createBuffer(), this.pointVao = r.createVertexArray(), r.bindVertexArray(this.pointVao), r.bindBuffer(r.ARRAY_BUFFER, this.pointBuf);
        const x = r.getAttribLocation(f.prog, "aPos");
        r.enableVertexAttribArray(x), r.vertexAttribPointer(x, 2, r.FLOAT, !1, 0, 0);
      }
      r.bindVertexArray(this.pointVao), r.bindBuffer(r.ARRAY_BUFFER, this.pointBuf), r.bufferData(r.ARRAY_BUFFER, new Float32Array(g.flat()), r.DYNAMIC_DRAW), r.uniform4f(f.u.uColor, 1, 0.85, 0.2, 1), r.drawArrays(r.POINTS, 0, g.length);
    }
    // canvas CSS px -> source image px
    toImage(g, r) {
      if (!this.pxOff) return null;
      const f = this.canvas.width / this.canvas.clientWidth;
      return [(g * f - this.pxOff[0]) / this.pxScale, (r * f - this.pxOff[1]) / this.pxScale];
    }
  }
  return { Renderer: p, buildGrid: l };
}
function Wn(t, e) {
  const { applyHead: n, applyBody: s, TASSELS: a, tasselAnchor: i } = t, o = (e.strands ?? []).map((r) => {
    if (r.nodes.length === 4) return r;
    const f = Array.from({ length: 4 }, (x, b) => {
      const T = b / 3 * (r.nodes.length - 1), F = Math.min(r.nodes.length - 2, Math.floor(T)), P = T - F;
      return [0, 1].map((te) => r.nodes[F][te] + (r.nodes[F + 1][te] - r.nodes[F][te]) * P);
    });
    return { ...r, nodes: f };
  }), m = [0, 300, 200, 140], w = 0.9, y = 7, v = { stiff: 1.7, damp: 1.6, couple: 0.85, reach: 0.9, bind: 4 }, h = Math.min(6, o.filter((r) => r.name.startsWith("bang")).length), c = { freq: 0.7, zeta: 0.22, hang: 0.85, inertia: 0.32, wind: 0.03, max: 0.55, smooth: 6 }, d = (r, f) => [r[0] * Math.cos(f) - r[1] * Math.sin(f), r[0] * Math.sin(f) + r[1] * Math.cos(f)], l = (r, f) => {
    const x = Math.hypot(r[0], r[1]);
    if (x < 1e-6) return r;
    const b = f * Math.tanh(x / f) / x;
    return [r[0] * b, r[1] * b];
  }, p = Object.fromEntries(Object.entries(e.buns ?? {}).map(([r, f]) => [r, { at: [f.cx, f.cy], k: 260, c: 11, hang: 3, max: 4 }])), u = (r, f) => {
    const x = Math.hypot(r[0], r[1]);
    x > f && (r[0] *= f / x, r[1] *= f / x);
  };
  class g {
    constructor() {
      this.gain = 1, this.out = { gain: 1, bunL: [0, 0], bunR: [0, 0] }, this.hair = {};
      for (const f of Object.keys(p))
        this.hair[f] = { p: null, v: [0, 0] }, this.out[f] = [0, 0];
      this.strands = o.map(() => ({ p: null, v: [[0, 0], [0, 0], [0, 0], [0, 0]] })), this.out.strands = o.map(() => [[0, 0], [0, 0], [0, 0], [0, 0]]), this.chains = a.map((f) => {
        const x = f.tip[0] - f.pivot[0], b = f.tip[1] - f.pivot[1], T = Math.hypot(x, b), F = [x / T, b / T];
        return { t: f, dir: F, L1: T * f.split, L2: T * (1 - f.split), pts: null, prev: null, phi: [0, 0], anchor: [0, 0] };
      }), this.time = 0;
    }
    hairAnchor(f, x) {
      const b = [f[0], f[1]];
      return n(b, 1, x), s(b, f[1], x), b;
    }
    step(f, x) {
      t.stepBody?.(f, x);
      const b = Math.max(1, Math.ceil(x / (1 / 240))), T = Math.min(x, 0.05) / b, F = -f.angleZ / 30 * e.head.maxRoll - f.bodyAngleZ / 10 * e.body.maxRoll, P = this.gain;
      o.forEach((I, D) => {
        const O = this.strands[D], L = this.out.strands[D], C = I.nodes.map(($) => this.hairAnchor($, f));
        O.p || (O.p = C.map(($) => [...$]));
        const Y = D * 1.7;
        for (let $ = 0; $ < b; $++) {
          const q = this.time + $ * T;
          for (let X = 1; X < 4; X++) {
            const oe = Math.hypot(I.nodes[X][0] - I.nodes[0][0], I.nodes[X][1] - I.nodes[0][1]), ee = (Math.sin(q * 1.3) * 0.5 + Math.sin(q * 3.1) * 0.3 + Math.sin(q * 4.7 + Y) * 0.2) * I.max * 0.1 * X / 3, J = [O.p[X - 1][0] - C[X - 1][0], O.p[X - 1][1] - C[X - 1][1]], B = C[X][0] + J[0] * w * v.couple - Math.sin(F) * oe * 0.12 + ee, H = C[X][1] + J[1] * w * v.couple, V = m[X] * I.k * v.stiff / Math.max(0.35, P), re = y * v.damp * Math.sqrt(v.stiff) / Math.max(0.5, Math.sqrt(P)), ne = O.v[X], se = O.p[X];
            ne[0] += (V * (B - se[0]) - re * ne[0]) * T, ne[1] += (V * (H - se[1]) - re * ne[1]) * T, se[0] += ne[0] * T, se[1] += ne[1] * T;
          }
          O.p[0] = [...C[0]];
        }
        for (let $ = 0; $ < 4; $++) {
          const q = [O.p[$][0] - C[$][0], O.p[$][1] - C[$][1]];
          L[$] = l(q, Math.max(0.5, I.max * v.reach * Math.max(1, P) * $ / 3));
        }
      });
      for (const [I, D] of Object.entries(p)) {
        const O = this.hair[I], L = this.hairAnchor(D.at, f), C = Math.sin(this.time * 1.3 + D.at[0] * 0.01) * 0.6 + Math.sin(this.time * 2.9 + D.at[1] * 0.02) * 0.4, Y = L[0] - Math.sin(F) * D.hang + C * D.max * 0.12, $ = L[1];
        O.p || (O.p = [Y, $]);
        const q = D.k / Math.max(0.35, P), X = D.c / Math.max(0.5, Math.sqrt(P));
        for (let ee = 0; ee < b; ee++)
          O.v[0] += (q * (Y - O.p[0]) - X * O.v[0]) * T, O.v[1] += (q * ($ - O.p[1]) - X * O.v[1]) * T, O.p[0] += O.v[0] * T, O.p[1] += O.v[1] * T;
        const oe = [O.p[0] - L[0], O.p[1] - L[1]];
        u(oe, D.max * Math.max(1, P)), this.out[I] = oe;
      }
      this.out.gain = 1;
      const te = this.out.strands;
      for (let I = 0; I < v.bind; I++) for (let D = 1; D < 4; D++) {
        const O = te.slice(0, h).map((L) => [...L[D]]);
        for (let L = 0; L < h; L++) {
          const C = O[Math.max(0, L - 1)], Y = O[Math.min(h - 1, L + 1)];
          for (const $ of [0, 1]) te[L][D][$] = O[L][$] * 0.5 + (C[$] + Y[$]) * 0.25;
        }
      }
      for (const I of this.chains) {
        const D = i(I.t, f, this.out, [0, 0]);
        I.st || (I.st = { th: [0, 0], w: [0, 0], pos: [...D], vel: [0, 0], acc: [0, 0] });
        const O = I.st, L = c, C = [(D[0] - O.pos[0]) / Math.max(x, 1e-3), (D[1] - O.pos[1]) / Math.max(x, 1e-3)], Y = 1 - Math.exp(-x * L.smooth), $ = [(C[0] - O.vel[0]) / Math.max(x, 1e-3), (C[1] - O.vel[1]) / Math.max(x, 1e-3)];
        O.acc = [O.acc[0] + ($[0] - O.acc[0]) * Y, O.acc[1] + ($[1] - O.acc[1]) * Y], O.vel = [O.vel[0] + (C[0] - O.vel[0]) * Y, O.vel[1] + (C[1] - O.vel[1]) * Y], O.pos = [...D];
        const q = [-I.dir[1], I.dir[0]], X = -(O.acc[0] * q[0] + O.acc[1] * q[1]) / (I.L1 + I.L2) * L.inertia, oe = (Math.sin(this.time * 0.9 + I.t.pivot[0]) * 0.6 + Math.sin(this.time * 0.37 + I.t.pivot[1]) * 0.4) * L.wind, ee = -F * L.hang + oe, J = 2 * Math.PI * L.freq / Math.sqrt(Math.max(0.4, P)), B = J * 1.35;
        for (let ne = 0; ne < b; ne++) {
          const se = -J * J * (O.th[0] - ee) - 2 * L.zeta * J * O.w[0] + X;
          O.w[0] += se * T, O.th[0] += O.w[0] * T;
          const Z = -B * B * (O.th[1] - O.th[0]) - 2 * L.zeta * B * O.w[1] + X * 0.4 + se * 0.5;
          O.w[1] += Z * T, O.th[1] += O.w[1] * T;
        }
        O.th[0] = Math.max(-0.55, Math.min(L.max, O.th[0])), O.th[1] = Math.max(-0.55 * 1.4, Math.min(L.max * 1.4, O.th[1])), I.phi = [O.th[0], O.th[1]];
        const H = d(I.dir, O.th[0]), V = d(I.dir, O.th[1]), re = [D[0] + H[0] * I.L1, D[1] + H[1] * I.L1];
        I.pts = [[...D], re, [re[0] + V[0] * I.L2, re[1] + V[1] * I.L2]], I.anchor = D;
      }
      return this.time += x, this.out;
    }
  }
  return { Physics: g };
}
const un = (t, e) => t.reduce((n, s, a) => n + s * e[a], 0);
function qn(t, e) {
  const n = e.length, s = Array.from({ length: n }, () => Array(n).fill(0));
  for (let o = 0; o < n; o++) for (let m = 0; m <= o; m++) {
    let w = t[o][m];
    for (let y = 0; y < m; y++) w -= s[o][y] * s[m][y];
    s[o][m] = o === m ? Math.sqrt(Math.max(1e-18, w)) : w / s[m][m];
  }
  const a = [], i = [];
  for (let o = 0; o < n; o++) a[o] = (e[o] - un(s[o].slice(0, o), a)) / s[o][o];
  for (let o = n - 1; o >= 0; o--) {
    let m = a[o];
    for (let w = o + 1; w < n; w++) m -= s[w][o] * i[w];
    i[o] = m / s[o][o];
  }
  return i;
}
function Gn(t) {
  const e = t.map((a) => [...a]), n = e.length, s = e.map((a, i) => e.map((o, m) => +(i === m)));
  for (let a = 0; a < 100 * n * n; a++) {
    let i = 0, o = 1, m = 0;
    for (let l = 0; l < n; l++) for (let p = l + 1; p < n; p++) Math.abs(e[l][p]) > m && (m = Math.abs(e[l][p]), i = l, o = p);
    if (m < 1e-12) break;
    const w = 0.5 * Math.atan2(2 * e[i][o], e[o][o] - e[i][i]), y = Math.cos(w), v = Math.sin(w), h = e[i][i], c = e[o][o], d = e[i][o];
    for (let l = 0; l < n; l++) if (l !== i && l !== o) {
      const p = e[l][i], u = e[l][o];
      e[l][i] = e[i][l] = y * p - v * u, e[l][o] = e[o][l] = v * p + y * u;
    }
    e[i][i] = y * y * h - 2 * v * y * d + v * v * c, e[o][o] = v * v * h + 2 * v * y * d + y * y * c, e[i][o] = e[o][i] = 0;
    for (let l = 0; l < n; l++) {
      const p = s[l][i], u = s[l][o];
      s[l][i] = y * p - v * u, s[l][o] = v * p + y * u;
    }
  }
  return { values: e.map((a, i) => a[i]), vectors: s };
}
function Hn(t, e, n, s = 1) {
  const a = t.map((h, c) => t.slice(c).reduce((d, l) => d + l, 0)), i = t.map((h, c) => t.map((d, l) => a[Math.max(c, l)] * h * d)), o = t.map((h, c) => e * a[c] * h), m = o.map(Math.sqrt), w = Gn(i.map((h, c) => h.map((d, l) => d / m[c] / m[l]))), y = w.values.indexOf(Math.max(...w.values)), v = t.map((h, c) => t.map((d, l) => m[c] * m[l] * w.values.reduce((p, u, g) => p + w.vectors[c][g] * w.vectors[l][g] * 2 * n * Math.sqrt(u) * (g === y ? 1 : s), 0)));
  return { lengths: t, mass: a, coefficient: i, stiffness: o, damping: v, frequencies: w.values.map((h) => 1 / Math.sqrt(h) / (2 * Math.PI)).sort((h, c) => h - c), angles: t.map(() => 0), velocities: t.map(() => 0) };
}
function Mt(t, e = t.angles, n = t.velocities) {
  let s = t.stiffness.reduce((a, i, o) => a + i * (1 - Math.cos(e[o])), 0);
  for (let a = 0; a < e.length; a++) for (let i = 0; i < e.length; i++) s += 0.5 * t.coefficient[a][i] * Math.cos(e[a] - e[i]) * n[a] * n[i];
  return s;
}
function Vn(t, e, n = 0, s = 1) {
  const a = t.angles, i = t.velocities, o = t.coefficient.map((v, h) => v.map((c, d) => c * Math.cos(a[h] - a[d]))), m = a.map((v, h) => un(o[h], i) + e * (-t.stiffness[h] * s * Math.sin(v) - n * t.mass[h] * t.lengths[h] * Math.cos(v) - t.coefficient[h].reduce((c, d, l) => c + d * Math.sin(v - a[l]) * i[l] * i[l], 0)));
  let w = qn(o.map((v, h) => v.map((c, d) => c + e * t.damping[h][d])), m), y = a.map((v, h) => v + e * w[h]);
  if (n === 0 && s === 1) {
    const v = Mt(t), h = Mt(t, y, w.map(() => 0)), c = Mt(t, y, w);
    if (c > v)
      if (h > v)
        y = [...a], w = i.map((d) => d * 0.999);
      else {
        const d = Math.sqrt(Math.max(0, (v - h) / Math.max(1e-30, c - h)));
        w = w.map((l) => l * d);
      }
  }
  t.angles = y, t.velocities = w;
}
const cn = Object.freeze({
  responseGain: 1,
  swing: 1,
  stiffness: 1,
  damping: 1,
  follow: 0.85,
  cohesion: 3,
  wind: 0.05,
  max: 20
}), mn = Object.freeze({ tierGain: 1, highModeDamping: 1 });
function Jn(t) {
  if (!t || typeof t != "object" || Array.isArray(t)) throw new TypeError("Expected cloth tuning");
  for (const [e, n] of Object.entries(t)) {
    if (!Object.hasOwn(cn, e) && !Object.hasOwn(mn, e)) throw new RangeError(`Unknown cloth tuning: ${e}`);
    if (typeof n != "number" || !Number.isFinite(n)) throw new RangeError(`${e}: expected a finite number`);
    if (["tierGain", "highModeDamping", "responseGain", "swing", "stiffness", "damping", "max"].includes(e) && n <= 0) throw new RangeError(`${e}: must be positive`);
    if (["follow", "wind"].includes(e) && (n < 0 || e === "follow" && n > 1)) throw new RangeError(`${e}: out of range`);
    if (e === "cohesion" && (!Number.isInteger(n) || n < 0 || n > 8)) throw new RangeError("cohesion: expected an integer from 0 to 8");
  }
}
function qt(t, e) {
  const n = [0];
  for (let a = 1; a < t.length; a++)
    n.push(n[a - 1] + Math.hypot(t[a][0] - t[a - 1][0], t[a][1] - t[a - 1][1]));
  const s = n.at(-1);
  return Array.from({ length: e }, (a, i) => {
    const o = s * i / (e - 1);
    let m = 1;
    for (; m < t.length - 1 && n[m] < o; ) m++;
    const w = (o - n[m - 1]) / Math.max(1e-9, n[m] - n[m - 1]);
    return [0, 1].map((y) => t[m - 1][y] + (t[m][y] - t[m - 1][y]) * w);
  });
}
function Kn(t, e) {
  const { baseWeights: n, deformBase: s } = t, a = { bounceHz: 2.6, zeta: 0.25 }, i = e.legs ? 0.8 / ((Math.hypot(...e.legs.left.ankle.map((c, d) => c - e.legs.left.hip[d])) + Math.hypot(...e.legs.right.ankle.map((c, d) => c - e.legs.right.hip[d]))) / 2) : 1.6 / e.image.height, o = 0.8, m = (e.cloth ?? []).map((c) => {
    const d = ln(c), l = d.custom ? d.cols : c.columns ?? 8, p = d.custom ? d.rows : c.rows ?? 5, u = qt(c.waist, l), g = qt(c.hem, l), r = new Float64Array(p * l * 2);
    for (let x = 0; x < p; x++) for (let b = 0; b < l; b++) {
      const T = x / (p - 1), F = (x * l + b) * 2;
      r[F] = u[b][0] + (g[b][0] - u[b][0]) * T, r[F + 1] = u[b][1] + (g[b][1] - u[b][1]) * T;
    }
    d.custom && r.set(d.rest);
    const f = Array.from({ length: l }, (x, b) => {
      const T = b * 2, F = ((p - 1) * l + b) * 2;
      return !d.custom && Math.hypot(r[F] - r[T], r[F + 1] - r[T + 1]) <= 1;
    });
    return {
      grid: d,
      pinned: f,
      pendulums: (
        /** @type {ReturnType<typeof pendulumSystem>[]} */
        []
      ),
      systemKey: null,
      c,
      gravity: 9.80665 / (c.scale === void 0 ? i : c.scale / 1e3),
      tuning: Object.fromEntries(Object.entries({ ...cn, ...mn }).map(([x, b]) => [x, c[x] ?? b])),
      cols: l,
      rows: p,
      rest: r,
      top: d.custom ? d.top : u,
      weights: (d.custom ? d.top : u).map(([x, b]) => n(x, b, 0)),
      target: new Float64Array(r.length),
      previous: null,
      pivotVelocity: new Float64Array(l * 2),
      angle: new Float64Array(l),
      angularVelocity: new Float64Array(l),
      lowerAngle: new Float64Array(l),
      lowerAngularVelocity: new Float64Array(l),
      bounce: new Float64Array(l),
      bounceVelocity: new Float64Array(l),
      out: Float64Array.from(r),
      physicalOut: Float64Array.from(r),
      parent: null,
      parentLoc: null,
      meshes: []
    };
  }), w = Object.fromEntries(m.map((c) => [c.c.name, c]));
  function y(c, d, l) {
    const p = c.grid.custom || c.pinned.some(Boolean);
    let u = null;
    for (let g = 0; g < c.rows - 1; g++) for (let r = 0; r < c.cols - 1; r++) {
      const f = [(g * c.cols + r) * 2, (g * c.cols + r + 1) * 2, ((g + 1) * c.cols + r + 1) * 2, ((g + 1) * c.cols + r) * 2], [x, b, T, F, P, te, I, D] = f.flatMap((Y) => [c.rest[Y], c.rest[Y + 1]]);
      let O = 0.5, L = 0.5;
      for (let Y = 0; Y < 10; Y++) {
        const $ = x * (1 - O) * (1 - L) + T * O * (1 - L) + P * O * L + I * (1 - O) * L - d, q = b * (1 - O) * (1 - L) + F * O * (1 - L) + te * O * L + D * (1 - O) * L - l, X = (T - x) * (1 - L) + (P - I) * L, oe = (F - b) * (1 - L) + (te - D) * L, ee = (I - x) * (1 - O) + (P - T) * O, J = (D - b) * (1 - O) + (te - F) * O, B = X * J - oe * ee;
        if (Math.abs(B) < 1e-9) break;
        O -= ($ * J - q * ee) / B, L -= (X * q - oe * $) / B;
      }
      let C = Math.max(0, -O, O - 1) + Math.max(0, -L, L - 1);
      if (p) {
        const Y = Math.max(0, Math.min(1, O)), $ = Math.max(0, Math.min(1, L)), q = x * (1 - Y) * (1 - $) + T * Y * (1 - $) + P * Y * $ + I * (1 - Y) * $, X = b * (1 - Y) * (1 - $) + F * Y * (1 - $) + te * Y * $ + D * (1 - Y) * $;
        C = Math.hypot(q - d, X - l);
      }
      (!u || C < u.miss) && (u = { q: f, s: O, t: L, miss: C });
    }
    if (u.s = Math.min(p ? 1 : 4, Math.max(p ? 0 : -3, u.s)), u.t = Math.min(p ? 1 : 4, Math.max(p ? 0 : -3, u.t)), p) {
      const g = [0, 0];
      v(c.rest, u, g), u.offset = [d - g[0], l - g[1]];
    }
    return u;
  }
  function v(c, d, l) {
    const { q: p, s: u, t: g } = d, r = [(1 - u) * (1 - g), u * (1 - g), u * g, (1 - u) * g];
    l[0] = d.offset?.[0] ?? 0, l[1] = d.offset?.[1] ?? 0;
    for (let f = 0; f < 4; f++)
      l[0] += c[p[f]] * r[f], l[1] += c[p[f] + 1] * r[f];
    return l;
  }
  for (const c of m) c.c.parent && (c.parent = w[c.c.parent], c.parentLoc = c.top.map(([d, l]) => y(c.parent, d, l)));
  class h {
    constructor() {
      this.gain = 1, this.time = 0;
    }
    setTuning(d, l) {
      if (Jn(l), d !== null && !Object.hasOwn(w, d)) throw new RangeError(`Unknown cloth: ${d}`);
      for (const p of m) (d === null || p.c.name === d) && Object.assign(p.tuning, l);
    }
    /** Skin a layer mesh (rest/pos arrays in source px) to the named garment. */
    attach(d, l) {
      const p = w[d], u = [];
      for (let g = 0; g < l.rest.length; g += 2) u.push(y(p, l.rest[g], l.rest[g + 1]));
      p.meshes.push({ mesh: l, locs: u });
    }
    step(d, l, p) {
      if (l < 0) return;
      const u = Math.min(l, 0.05), g = Math.max(1, Math.ceil(u * 240)), r = u / g, f = [0, 0];
      for (const x of m) {
        const { cols: b, rows: T, rest: F, target: P, out: te, angle: I, angularVelocity: D, lowerAngle: O, lowerAngularVelocity: L, bounce: C, bounceVelocity: Y } = x, { stiffness: $, damping: q, max: X, swing: oe, follow: ee, cohesion: J, wind: B, responseGain: H, tierGain: V, highModeDamping: re } = x.tuning, ne = this.gain * (H ?? 1), se = new Float64Array(b * 2), Z = new Float64Array(b * 2), M = new Float64Array(b * 2);
        for (let j = 0; j < b; j++) {
          x.parent ? v(x.parent.physicalOut, x.parentLoc[j], f) : s(x.top[j][0], x.top[j][1], x.weights[j], d, p, f), se[j * 2] = f[0], se[j * 2 + 1] = f[1], x.parent && v(x.parent.out, x.parentLoc[j], f), Z[j * 2] = f[0], Z[j * 2 + 1] = f[1];
          for (let z = 0; z < 2; z++) {
            const _ = j * 2 + z, U = x.previous && u > 0 ? (se[_] - x.previous[_]) / u : 0;
            M[_] = u > 0 ? (U - x.pivotVelocity[_]) / u : 0, x.pivotVelocity[_] = U;
          }
          for (let z = 0; z < T; z++) {
            const _ = (z * b + j) * 2;
            P[_] = F[_] + f[0] - x.top[j][0], P[_ + 1] = F[_ + 1] + f[1] - x.top[j][1];
          }
        }
        x.previous = se;
        const E = oe * Math.sqrt($), S = 2 * Math.PI * a.bounceHz;
        if (x.grid.custom) {
          const j = `${E}:${q}:${re}`;
          if (x.systemKey !== j) {
            const Q = x.pendulums;
            x.pendulums = x.grid.lengths.map((A, k) => {
              const N = x.grid.joints[k], W = Hn(N.slice(1).map((ae, ie) => (ae - N[ie]) * A * o), x.gravity * E ** 2, a.zeta * q, re);
              return Q[k] && (W.angles = Q[k].angles, W.velocities = Q[k].velocities), W;
            }), x.systemKey = j;
          }
          const z = Math.max(...x.pendulums.flatMap((Q) => Q.frequencies)), _ = Math.max(g, Math.ceil(u * z * 32)), U = u / _;
          for (let Q = 0; Q < _; Q++) {
            const A = this.time + (Q + 1) * U, k = (Math.sin(A * 1.1) * 0.6 + Math.sin(A * 2.3) * 0.4) * X * B;
            for (let N = 0; N < b; N++) {
              const W = M[N * 2 + 1], ae = Math.max(x.gravity * 0.1, x.gravity - W), ie = Math.max(-8 * x.gravity, Math.min(8 * x.gravity, M[N * 2])) - ae * k / x.grid.lengths[N];
              Vn(x.pendulums[N], U, ie, ae / x.gravity), Y[N] += (-(S ** 2) * C[N] - 2 * S * Y[N] - W * 0.15) * U, C[N] += Y[N] * U;
            }
          }
          for (let Q = 0; u > 0 && Q < J; Q++) for (const A of ["angles", "velocities"]) {
            const k = x.pendulums.map((N) => [...N[A]]);
            x.pendulums.forEach((N, W) => {
              N[A] = k[W].map((ae, ie) => 0.5 * ae + 0.25 * (k[Math.max(0, W - 1)][ie] + k[Math.min(b - 1, W + 1)][ie]));
            });
          }
          const G = (Q, A, k, N = 1) => {
            for (let W = 0; W < b; W++) {
              const ae = x.grid.joints[W], ie = x.grid.seams[W], de = x.grid.lengths[W], ye = X * 0.1 * Math.tanh(C[W] * k / (X * 0.1)), Fe = 2 * Math.asin(Math.min(0.95, (X - Math.abs(ye)) / (2 * de))), $e = x.pendulums[W].angles[0], ge = x.pendulums[W].angles.map((le) => {
                const fe = N === 1 ? le : $e + (le - $e) * N;
                return Fe * Math.tanh(fe * k / Fe);
              }), K = [Array.from(A.slice(W * 2, W * 2 + 2))];
              for (let le = 0; le < ge.length; le++) {
                const fe = Ze(ie, ae[le]), ce = Ze(ie, ae[le + 1]), xe = ce[0] - fe[0], be = ce[1] - fe[1], Me = ge[le];
                K.push([K[le][0] + xe * Math.cos(Me) + be * Math.sin(Me), K[le][1] - xe * Math.sin(Me) + be * Math.cos(Me)]);
              }
              for (let le = 0; le < T; le++) {
                const fe = x.grid.fractions[W][le];
                let ce = 0;
                for (; ce < ge.length - 1 && fe > ae[ce + 1] + 1e-9; ) ce++;
                const xe = Ze(ie, ae[ce]), be = Ze(ie, fe), Me = (fe - ae[ce]) / (ae[ce + 1] - ae[ce]), ke = ge[ce] * (1 - 0.1 * (1 - ee) * (1 - Me)), ze = be[0] - xe[0], Je = be[1] - xe[1], Ct = (le * b + W) * 2;
                Q[Ct] = K[ce][0] + ze * Math.cos(ke) + Je * Math.sin(ke), Q[Ct + 1] = K[ce][1] - ze * Math.sin(ke) + Je * Math.cos(ke) + ye * fe;
              }
            }
          };
          G(x.physicalOut, se, 1), G(te, Z, ne, V);
          continue;
        }
        for (let j = 0; j < g; j++) {
          const z = this.time + (j + 1) * r, _ = (Math.sin(z * 1.1) * 0.6 + Math.sin(z * 2.3) * 0.4) * X * B;
          for (let U = 0; U < b; U++) {
            if (x.pinned[U]) continue;
            const G = U * 2, Q = ((T - 1) * b + U) * 2, A = Math.max(1, Math.hypot(F[Q] - F[G], F[Q + 1] - F[G + 1])), k = Math.max(x.gravity * 0.1, x.gravity - M[G + 1]), N = o * A / 2, W = k / N * E * E, ae = Math.sqrt(W), ie = a.zeta * q, de = ae * Math.sqrt(2 - Math.SQRT2), ye = ae * Math.sqrt(2 + Math.SQRT2), Fe = 2 * ie * de * ye / (de + ye), $e = 2 * ie / (de + ye), ge = I[U] - O[U], K = Math.cos(ge), le = Math.sin(ge), fe = D[U], ce = L[U], xe = (Math.max(-8 * x.gravity, Math.min(8 * x.gravity, M[G])) - k * _ / A) / N, be = Fe * (2 * fe + K * ce) + $e * 2 * W * fe, Me = Fe * (K * fe + ce) + $e * W * ce, ke = -2 * W * Math.sin(I[U]) - le * ce * ce - 2 * xe * Math.cos(I[U]) - be, ze = -W * Math.sin(O[U]) + le * fe * fe - xe * Math.cos(O[U]) - Me, Je = 2 - K * K;
            D[U] += (ke - K * ze) / Je * r, L[U] += (2 * ze - K * ke) / Je * r, I[U] += D[U] * r, O[U] += L[U] * r, Y[U] += (-S * S * C[U] - 2 * S * Y[U] - M[G + 1] * 0.15) * r, C[U] += Y[U] * r;
          }
        }
        for (let j = 0; u > 0 && j < J; j++) for (const z of [I, D, O, L]) {
          const _ = z.slice();
          for (let U = 0; U < b; U++) z[U] = x.pinned[U] ? 0 : _[U] * 0.5 + (_[Math.max(0, U - 1)] + _[Math.min(b - 1, U + 1)]) * 0.25;
        }
        const R = (j, z, _) => {
          for (let U = 0; U < b; U++) {
            const G = U * 2, Q = ((T - 1) * b + U) * 2;
            if (x.pinned[U]) {
              for (let ge = 0; ge < T; ge++) {
                const K = (ge * b + U) * 2;
                j[K] = F[K] + z[G] - F[G], j[K + 1] = F[K + 1] + z[G + 1] - F[G + 1];
              }
              continue;
            }
            const A = Math.max(1, Math.hypot(F[Q] - F[G], F[Q + 1] - F[G + 1])), k = X * 0.1 * Math.tanh(C[U] * _ / (X * 0.1)), N = 2 * Math.asin(Math.min(0.95, (X - Math.abs(k)) / (2 * A))), W = N * Math.tanh(I[U] * _ / N), ae = N * Math.tanh(O[U] * _ / N), ie = 0.1 * (1 - ee), de = (F[Q] - F[G]) / 2, ye = (F[Q + 1] - F[G + 1]) / 2, Fe = z[G] + de * Math.cos(W) + ye * Math.sin(W), $e = z[G + 1] - de * Math.sin(W) + ye * Math.cos(W);
            for (let ge = 0; ge < T; ge++) {
              const K = ge / (T - 1), le = (ge * b + U) * 2, fe = K <= 0.5, ce = fe ? K * 2 : (K - 0.5) * 2, xe = (fe ? W : ae) * (1 - ie + ie * ce), be = Math.cos(xe), Me = Math.sin(xe), ke = de * ce, ze = ye * ce;
              j[le] = (fe ? z[G] : Fe) + ke * be + ze * Me, j[le + 1] = (fe ? z[G + 1] : $e) - ke * Me + ze * be + k * K;
            }
          }
        };
        R(x.physicalOut, se, 1), R(te, Z, ne);
      }
      this.time += u;
    }
    deform() {
      const d = [0, 0];
      for (const l of m) for (const { mesh: p, locs: u } of l.meshes)
        for (let g = 0; g < u.length; g++)
          v(l.out, u[g], d), p.pos[g * 2] = d[0], p.pos[g * 2 + 1] = d[1];
    }
    /** Grid nodes per garment, for debug overlays. */
    get grids() {
      return m.map((d) => ({ name: d.c.name, cols: d.cols, rows: d.rows, nodes: d.out }));
    }
  }
  return { Cloth: h, garments: m };
}
function Qn(t, e) {
  const { baseWeights: n, deformBase: s, MOUTH: a } = t, i = (b, T, F) => {
    const P = Math.min(1, Math.max(0, (F - b) / (T - b)));
    return P * P * (3 - 2 * P);
  }, o = e.mouth.area, m = {
    a: { sprite: "mouth_a", ref: 0.9, width: 1 },
    aHalf: { sprite: "mouth_a_half", ref: 0.55, width: 1 },
    i: { sprite: "mouth_i", ref: 0.55, width: 1 },
    e: { sprite: "mouth_a_half", ref: 0.65, width: 1.06 },
    o: { sprite: "mouth_o", ref: 0.75, width: 1 },
    u: { sprite: "mouth_o", ref: 0.75, width: 0.78 }
  }, w = 0.16, y = ["angry", "sad"];
  function v(b, T) {
    const F = (I, D, O) => I >= D - (T ? 0.07 : 0) && I < O + (T ? 0.07 : 0), P = [["i", -9, -0.55], ["e", -0.55, -0.2], ["a", -0.2, 0.35], ["o", 0.35, 0.75], ["u", 0.75, 9]], te = T && P.find((I) => I[0] === T || T === "aHalf" && I[0] === "a");
    return te && F(b, te[1], te[2]) ? te[0] : P.find((I) => b >= I[1] && b < I[2])[0];
  }
  const h = 0.75, c = 0.3, d = 0.06, l = ["sad", "surprise"];
  function p(b, T, F = null) {
    return F && b >= c ? F : b >= h ? null : b < c ? T >= 0.5 ? "eyes_smile" : "eyes_closed" : "eyes_half";
  }
  function u(b, T, F = null) {
    if (b < w) return null;
    const P = v(T, F);
    return P === "a" ? b >= 0.6 ? "a" : "aHalf" : P;
  }
  function g(b) {
    return a.cy + (b - a.cx) * Math.tan(a.angle);
  }
  function r() {
    return o.cx;
  }
  function f(b, T) {
    const F = Math.cos(-o.angle), P = Math.sin(-o.angle), te = b - o.cx, I = T - o.cy, D = (te * F - I * P) / o.rx, O = (te * P + I * F) / o.ry;
    return 1 - i(0.55, 0.95, Math.hypot(D, O));
  }
  function x(b, T, F, P, te) {
    const I = {}, D = (B) => B.startsWith("eyes_closed") || B.startsWith("eyes_smile"), O = (B) => y.some((H) => B === `mouth_${H}`), L = (B) => D(B) ? 1 : B.startsWith("eyes_") ? 0 : O(B) ? 2 : 3, C = Object.entries(T.layers).sort((B, H) => L(B[0]) - L(H[0]));
    for (const [B, H] of C) {
      const V = P(H, e.mesh.spriteCell, te(F[B]), F[B].width), re = [], ne = [];
      for (let M = 0; M < V.rest.length / 2; M++) {
        const E = V.rest[M * 2], S = V.rest[M * 2 + 1];
        re.push(n(E, S, 0)), ne.push(B.startsWith("mouth") ? f(E, S) : 0);
      }
      const se = B === "eyes_half_0" ? 0 : B === "eyes_half_1" ? 1 : void 0, Z = b.addLayer(B, F[B], V, { color: [0.4, 1, 0.8, 0.6], halfEye: se });
      Z.visible = !1, I[B] = { mesh: V, W: re, inner: ne, layer: Z };
    }
    const Y = [0, 1].map((B) => !!(I[`eyes_closed_${B}`] && I[`eyes_half_${B}`])), $ = Object.values(m).some((B) => I[B.sprite]), q = (B, H) => (B === "eyes_smile" && !I[`eyes_smile_${H}`] && (B = "eyes_closed"), B === "open" || I[`${B}_${H}`] ? B : "open"), X = [0, 0];
    let oe = null;
    const ee = [0, 1].map(() => ({ cur: "open", prev: "open", t: 1 }));
    function J(B, H, V, re, ne = 1) {
      const se = B.mesh.rest, Z = B.mesh.pos;
      for (let M = 0; M < B.W.length; M++) {
        let E = se[M * 2], S = se[M * 2 + 1];
        const R = B.inner[M];
        if (R > 0) {
          const j = g(E);
          S = j + (S - j) * (1 + (re - 1) * R), E = r() + (E - r()) * (1 + (ne - 1) * R);
        }
        s(E, S, B.W[M], H, V, X), Z[M * 2] = X[0], Z[M * 2 + 1] = X[1];
      }
    }
    return {
      /**
       * Show / hide and deform the sprites for this frame.
       * Returns which eyes are covered by a sprite, so the layered eye parts can be hidden, and
       * whether a drawing shows the mouth, so the shader mouth can be left out.
       * `mood` (angry / sad / surprise) picks drawn expression eyes (sad, surprise) and closed
       * mouths (angry, sad) when the avatar has them.
       */
      update(B, H, V = 1 / 60, re = null) {
        for (const S of Object.values(I)) S.layer.visible = !1;
        const ne = [!1, !1];
        [
          [B.eyeROpen, B.eyeSmile],
          [B.eyeLOpen, B.eyeSmileL ?? B.eyeSmile]
        ].forEach(([S, R], j) => {
          const z = ee[j], _ = l.includes(re) && I[`eyes_${re}_${j}`] ? `eyes_${re}` : null, U = q(p(S, R, _) ?? "open", j);
          U !== z.cur && (z.prev = z.cur, z.cur = U, z.t = 0), z.t = V > 0 ? Math.min(1, z.t + V / d) : 1;
          const G = i(0, 1, z.t), Q = (k, N) => {
            if (k === "open" || N <= 1e-3) return;
            const W = I[`${k}_${j}`];
            W && (W.layer.visible = !0, W.layer.alpha = N, J(W, B, H, 1));
          }, A = (k) => k === "open" ? -1 : D(k) ? 1 : 0;
          z.t >= 1 ? Q(z.cur, 1) : A(z.cur) > A(z.prev) ? (Q(z.prev, 1), Q(z.cur, G)) : (Q(z.cur, 1), Q(z.prev, 1 - G)), ne[j] = z.cur !== "open" && G >= 0.999;
        });
        const se = u(B.mouthOpen, B.mouthForm, oe);
        oe = se;
        const Z = se && m[se], M = Z && I[Z.sprite], E = y.includes(re) && I[`mouth_${re}`];
        if (E && (!M || B.mouthOpen < w + 0.04) && (E.layer.visible = !0, E.layer.alpha = 1, J(E, B, H, 1)), M) {
          M.layer.visible = !0, M.layer.alpha = i(w, w + 0.04, B.mouthOpen);
          const S = Math.min(1.1, Math.max(0.5, B.mouthOpen / Z.ref));
          J(M, B, H, S, Z.width);
        }
        return { eyes: ne, mouth: se, mouthDrawn: $ && (!Z || !!M) };
      },
      /** Whether each eye has the closed and half-closed drawings, so the layered eye stays open. */
      eyesDrawn: Y
    };
  }
  return { createSprites: x, mouthShape: u, eyeSprite: p };
}
const Gt = { angry: "angry", angryTalk: "angry", sad: "sad", sadTalk: "sad", surprise: "surprise", surprisedTalk: "surprise" };
function es(t, e) {
  return t && t !== "neutral" ? Gt[t] ?? null : (e && Gt[e]) ?? null;
}
function ts(t, e, n, s = 6) {
  let a = e, i = n, o = -1, m = -1;
  for (let v = 0; v < n; v++) {
    const h = v * e;
    for (let c = 0; c < e; c++)
      t[h + c] > 3 && (c < a && (a = c), c > o && (o = c), v < i && (i = v), v > m && (m = v));
  }
  if (o < 0) return null;
  const w = Math.max(0, a - s), y = Math.max(0, i - s);
  return [w, y, Math.min(e, o + 1 + s) - w, Math.min(n, m + 1 + s) - y];
}
function ns(t, e, n, s, a, i, o = 16, m, w, y) {
  const v = /* @__PURE__ */ new Map();
  for (const h of e.overlays) {
    const c = n[h.name];
    if (m !== void 0 && c.width !== m || w !== void 0 && c.height !== w)
      throw new Error(`overlay ${h.name}: image size does not match base.png`);
    const d = a(c), l = ts(d, c.width, c.height);
    if (!l) continue;
    const [p, u, g, r] = l, f = new Uint8Array(g * r);
    for (let F = 0; F < r; F++) f.set(d.subarray((u + F) * c.width + p, (u + F) * c.width + p + g), F * g);
    const x = s(l, o, f, g), b = [];
    for (let F = 0; F < x.rest.length; F += 2) {
      const P = i(x.rest[F], x.rest[F + 1], 0);
      b.push({ ...P, brow: 0, jaw: 0 });
    }
    const T = t.addLayer(`overlay_${h.name}`, y(c, l), x);
    T.visible = !1, v.set(h.name, { mesh: x, weights: b, layer: T });
  }
  return {
    /** Shows the named overlays and hides the rest. Unknown names are ignored. */
    set(h) {
      const c = new Set(h);
      for (const [d, l] of v) l.layer.visible = c.has(d);
    },
    update(h, c, d, l) {
      for (const { mesh: p, weights: u, layer: g } of v.values())
        if (g.visible)
          for (let r = 0; r < u.length; r++)
            d(p.rest[r * 2], p.rest[r * 2 + 1], u[r], h, c, l), p.pos[r * 2] = l[0], p.pos[r * 2 + 1] = l[1];
    }
  };
}
function Pt(t) {
  if (!t || typeof t != "object" || Array.isArray(t)) throw new TypeError("lipSync: expected an object");
  const e = t, n = {};
  for (const s of ["granularity", "openness", "closeSpeed"]) {
    const a = e[s];
    if (a !== void 0) {
      if (typeof a != "number" || !Number.isFinite(a) || a < 0 || a > 1)
        throw new RangeError(`lipSync.${s}: expected 0–1`);
      n[s] = a;
    }
  }
  if (e.preset !== void 0) {
    if (!["calm", "default", "lively", "subtle", "big", "custom"].includes(e.preset))
      throw new RangeError("lipSync.preset: expected calm, default, lively, subtle, big or custom");
    n.preset = e.preset;
  }
  return n;
}
function Ht(t = {}, e = {
  granularity: 0.5,
  openness: 0.5,
  closeSpeed: 0.5
}) {
  const n = Pt(t);
  return {
    granularity: n.granularity ?? e.granularity,
    openness: n.openness ?? e.openness,
    closeSpeed: n.closeSpeed ?? e.closeSpeed
  };
}
const Xe = (t, e, n, s) => t === 0.5 ? n : t < 0.5 ? e + (n - e) * t * 2 : n + (s - n) * (t - 0.5) * 2;
function Vt(t) {
  return {
    arm: Xe(t.granularity, 0.2, 0.6, 0.9),
    trigger: Xe(t.granularity, 0.65, 0.8, 0.95),
    relax: Xe(t.granularity, 1.5, 5, 12),
    range: Xe(t.granularity, 0.7, 0.3, 0.05),
    risePower: Xe(t.granularity, 0.05, 0.3, 0.8),
    openness: Xe(t.openness, 0.55, 1, 1.25),
    audioRelease: Xe(t.closeSpeed, 6, 32, 45),
    kanaRelease: Xe(t.closeSpeed, 6, 22, 45)
  };
}
const ss = /* @__PURE__ */ new Set([
  "angleX",
  "angleY",
  "angleZ",
  "bodyAngleX",
  "bodyAngleZ",
  "armAngle",
  "handAngle",
  "gazeX",
  "gazeY"
]), Yt = {
  nod: {
    label: "Nod",
    dur: 1.7,
    tracks: {
      angleY: [[0, 0], [0.32, -13], [0.62, 2], [0.95, -9], [1.3, 1], [1.7, 0]],
      angleZ: [[0, 0], [0.4, -2], [1, -1], [1.7, 0]],
      bodyAngleX: [[0, 0], [0.5, -1.5], [1.7, 0]],
      eyeSmile: [[0, 0], [0.3, 0.45], [1.3, 0.45], [1.7, 0]],
      eyeOpen: [[0, 1], [0.3, 0.72], [1.3, 0.72], [1.7, 1]],
      mouthOpen: [[0, 0], [0.3, 0.12], [1.3, 0.12], [1.7, 0]],
      mouthForm: [[0, 0], [0.3, -0.6], [1.7, -0.3]]
    }
  },
  tilt: {
    label: "Head tilt",
    dur: 2.6,
    tracks: {
      angleZ: [[0, 0], [0.55, 17], [2, 15], [2.6, 0]],
      angleX: [[0, 0], [0.6, 8], [2, 7], [2.6, 0]],
      angleY: [[0, 0], [0.6, 4], [2.6, 0]],
      bodyAngleZ: [[0, 0], [0.8, 3], [2, 3], [2.6, 0]],
      gazeX: [[0, 0], [0.4, 0.5], [2.1, 0.4], [2.6, 0]],
      gazeY: [[0, 0], [0.4, 0.35], [2.1, 0.3], [2.6, 0]],
      browAngle: [[0, 0], [0.5, -0.7], [2.1, -0.6], [2.6, 0]],
      browY: [[0, 0], [0.5, 0.35], [2.1, 0.3], [2.6, 0]]
      // closed mouth: a barely open round mouth read as a squashed blob
    }
  },
  think: {
    label: "Thinking",
    dur: 3.6,
    tracks: {
      angleX: [[0, 0], [0.7, -11], [3, -9], [3.6, 0]],
      angleY: [[0, 0], [0.7, 9], [3, 8], [3.6, 0]],
      angleZ: [[0, 0], [0.8, 6], [3, 5], [3.6, 0]],
      gazeX: [[0, 0], [0.35, -0.8], [3.1, -0.7], [3.6, 0]],
      gazeY: [[0, 0], [0.35, 0.7], [3.1, 0.6], [3.6, 0]],
      handAngle: [[0, 0], [0.6, 3], [3, 3], [3.6, 0]],
      fingerTap: [
        [0, 0],
        [0.9, 0],
        [1.05, 1],
        [1.2, 0],
        [1.4, 1],
        [1.55, 0],
        [1.75, 1],
        [1.9, 0],
        [2.3, 0],
        [2.45, 1],
        [2.6, 0],
        [3.6, 0]
      ],
      browY: [[0, 0], [0.6, 0.25], [3, 0.2], [3.6, 0]],
      browAngle: [[0, 0], [0.6, -0.3], [3, -0.3], [3.6, 0]],
      mouthForm: [[0, 0], [0.6, 0.4], [3.6, 0]]
    }
  },
  giggle: {
    label: "Chuckle",
    dur: 2.2,
    tracks: {
      eyeOpen: [[0, 1], [0.2, 0], [1.8, 0], [2.2, 1]],
      eyeSmile: [[0, 0], [0.2, 1], [1.8, 1], [2.2, 0]],
      mouthOpen: [[0, 0], [0.2, 0.5], [0.45, 0.32], [0.7, 0.55], [0.95, 0.34], [1.2, 0.5], [1.8, 0.3], [2.1, 0]],
      mouthForm: [[0, 0], [0.2, -0.8], [2.2, -0.2]],
      blush: [[0, 0], [0.3, 0.7], [1.8, 0.7], [2.2, 0.1]],
      angleY: [[0, 0], [0.2, -5], [0.45, -1], [0.7, -6], [0.95, -2], [1.2, -5], [1.6, -2], [2.2, 0]],
      angleZ: [[0, 0], [0.3, -6], [1.8, -5], [2.2, 0]],
      bodyAngleZ: [[0, 0], [0.25, 2], [0.5, -1], [0.75, 2], [1, -1], [1.3, 1.5], [2.2, 0]],
      browY: [[0, 0], [0.3, 0.3], [1.8, 0.3], [2.2, 0]]
    }
  },
  surprise: {
    label: "Surprise",
    dur: 2,
    tracks: {
      angleY: [[0, 0], [0.12, 10], [0.5, 6], [1.5, 5], [2, 0]],
      angleX: [[0, 0], [0.12, -4], [2, 0]],
      bodyAngleX: [[0, 0], [0.15, -4], [1.5, -3], [2, 0]],
      eyeOpen: [[0, 1], [0.1, 1.25], [1.5, 1.2], [2, 1]],
      browY: [[0, 0], [0.1, 1], [1.5, 0.9], [2, 0]],
      mouthOpen: [[0, 0], [0.12, 0.6], [1.4, 0.45], [2, 0]],
      mouthForm: [[0, 0], [0.12, 0.6], [1.5, 0.55], [2, 0]],
      // o
      armAngle: [[0, 0], [0.15, -4], [1.5, -3], [2, 0]]
    }
  },
  shy: {
    label: "Shy",
    dur: 3.2,
    tracks: {
      angleX: [[0, 0], [0.6, 14], [2.6, 12], [3.2, 0]],
      angleY: [[0, 0], [0.6, -9], [2.6, -8], [3.2, 0]],
      angleZ: [[0, 0], [0.7, -8], [2.6, -7], [3.2, 0]],
      gazeX: [[0, 0], [0.3, 0.8], [1.6, 0.8], [1.9, -0.3], [2.2, 0.8], [2.8, 0.6], [3.2, 0]],
      gazeY: [[0, 0], [0.3, -0.5], [2.8, -0.4], [3.2, 0]],
      eyeOpen: [[0, 1], [0.5, 0.75], [2.7, 0.75], [3.2, 1]],
      eyeSmile: [[0, 0], [0.5, 0.5], [2.7, 0.5], [3.2, 0]],
      blush: [[0, 0], [0.8, 1], [2.7, 1], [3.2, 0]],
      browAngle: [[0, 0], [0.5, -0.6], [2.7, -0.5], [3.2, 0]],
      mouthForm: [[0, 0], [0.5, -0.4], [3.2, 0]],
      handAngle: [[0, 0], [0.8, 4], [2.6, 4], [3.2, 0]]
    }
  },
  no: {
    label: "Shake head",
    dur: 1.9,
    tracks: {
      angleX: [[0, 0], [0.2, 13], [0.45, -13], [0.7, 12], [0.95, -10], [1.2, 5], [1.5, 0]],
      angleY: [[0, 0], [0.2, -3], [1.3, -3], [1.9, 0]],
      bodyAngleX: [[0, 0], [0.3, 1.5], [0.6, -1.5], [0.9, 1], [1.3, 0]],
      eyeOpen: [[0, 1], [0.15, 0], [1.4, 0], [1.9, 1]],
      eyeSmile: [[0, 0], [0.15, 1], [1.4, 1], [1.9, 0]],
      // closed mouth while shaking the head
      browAngle: [[0, 0], [0.2, -0.5], [1.4, -0.5], [1.9, 0]]
    }
  },
  wink: {
    label: "Wink",
    dur: 2,
    tracks: {
      angleZ: [[0, 0], [0.35, -13], [1.5, -12], [2, 0]],
      angleX: [[0, 0], [0.35, 9], [1.5, 8], [2, 0]],
      bodyAngleZ: [[0, 0], [0.5, -2], [1.5, -2], [2, 0]],
      eyeOpenL: [[0, 1], [0.25, 1], [0.4, 0], [1.4, 0], [1.6, 1]],
      eyeSmileL: [[0, 0], [0.3, 1], [1.5, 1], [1.7, 0]],
      mouthOpen: [[0, 0], [2, 0]],
      // wink with a closed smile
      mouthForm: [[0, 0], [0.35, -0.8], [2, 0]],
      blush: [[0, 0], [0.4, 0.5], [1.6, 0.5], [2, 0]]
    }
  },
  greet: {
    label: "Greeting",
    dur: 2.6,
    tracks: {
      angleY: [[0, 0], [0.7, -18], [1.2, -17], [1.9, 2], [2.6, 0]],
      bodyAngleX: [[0, 0], [0.8, 2], [1.8, 0]],
      bodyAngleZ: [[0, 0], [0.8, 1.5], [2, 0]],
      armAngle: [[0, 0], [0.8, 3], [2, 0]],
      eyeOpen: [[0, 1], [0.5, 0], [1.4, 0], [1.8, 1]],
      eyeSmile: [[0, 0], [0.5, 1], [1.6, 1], [2.3, 0.4], [2.6, 0]],
      mouthOpen: [[0, 0], [1.6, 0], [1.8, 0.3], [2.3, 0.2], [2.6, 0]],
      mouthForm: [[0, 0], [1.6, -0.8], [2.6, -0.3]],
      blush: [[0, 0], [1.6, 0.3], [2.6, 0]]
    }
  }
}, zt = {
  lookAround: {
    label: "Look around",
    dur: 5.2,
    idle: !0,
    tracks: {
      gazeX: [[0, 0], [0.25, -0.85], [1.5, -0.8], [1.8, 0.1], [2.1, 0.85], [3.4, 0.8], [3.7, 0], [5.2, 0]],
      gazeY: [[0, 0], [0.25, 0.15], [1.8, 0.25], [2.1, 0.1], [3.7, 0], [5.2, 0]],
      angleX: [[0, 0], [0.7, -20], [1.6, -18], [2.5, 19], [3.5, 17], [4.4, 0], [5.2, 0]],
      angleY: [[0, 0], [0.7, 3], [1.8, 5], [2.5, 3], [4.4, 0]],
      angleZ: [[0, 0], [0.8, 4], [1.8, 0], [2.6, -4], [4.4, 0]],
      bodyAngleX: [[0, 0], [1, -4], [2.8, 4], [4.6, 0]],
      bodyAngleZ: [[0, 0], [1, 1.5], [2.8, -1.5], [4.6, 0]],
      handAngle: [[0, 0], [1, -2], [2.8, 2], [4.6, 0]],
      browY: [[0, 0], [0.5, 0.35], [3.6, 0.3], [4.4, 0]],
      // curious: a quick inhale, held while looking, let out at the end
      breath: [[0, 0.2], [0.6, 0.85], [3.6, 0.7], [4.6, 0], [5.2, 0.1]]
    }
  },
  glance: {
    label: "Side glance",
    dur: 4.6,
    idle: !0,
    tracks: {
      gazeX: [[0, 0], [0.18, 0.9], [2.6, 0.85], [2.9, 0.15], [3.2, 0], [4.6, 0]],
      gazeY: [[0, 0], [0.18, 0.4], [2.6, 0.35], [3.2, 0]],
      angleX: [[0, 0], [0.6, 13], [2.6, 11], [3.6, 0]],
      angleY: [[0, 0], [0.6, 6], [2.6, 5], [3.6, 0]],
      angleZ: [[0, 0], [0.7, -5], [2.6, -4], [3.6, 0]],
      bodyAngleX: [[0, 0], [1, 2.5], [2.8, 2], [4, 0]],
      eyeOpen: [[0, 1], [0.3, 1.06], [2.5, 1.05], [2.8, 0.85], [3.4, 1]],
      browY: [[0, 0], [0.4, 0.4], [2.5, 0.35], [3.4, 0]],
      browAngle: [[0, 0], [0.4, -0.2], [2.5, -0.2], [3.4, 0]],
      breath: [[0, 0], [0.5, 0.6], [2.6, 0.55], [3.8, 0], [4.6, 0.3]]
    }
  },
  sway: {
    label: "Sway",
    dur: 7,
    idle: !0,
    tracks: {
      bodyAngleZ: [[0, 0], [1.6, 6], [3.4, -6], [5.2, 5], [7, 0]],
      bodyAngleX: [[0, 0], [1.6, 3], [3.4, -3], [5.2, 2.5], [7, 0]],
      angleZ: [[0, 0], [1.8, -10], [3.6, 10], [5.4, -8], [7, 0]],
      angleX: [[0, 0], [1.8, 6], [3.6, -6], [5.4, 5], [7, 0]],
      angleY: [[0, 0], [0.9, 3], [1.8, 0], [2.7, 3], [3.6, 0], [4.5, 3], [5.4, 0], [7, 0]],
      armAngle: [[0, 0], [1.6, 3], [3.4, -3], [5.2, 2], [7, 0]],
      handAngle: [[0, 0], [1.8, -4], [3.6, 4], [5.4, -3], [7, 0]],
      gazeX: [[0, 0], [1.8, -0.3], [3.6, 0.3], [5.4, -0.2], [7, 0]],
      eyeOpen: [[0, 1], [0.8, 0.82], [6.2, 0.82], [7, 1]],
      eyeSmile: [[0, 0], [0.8, 0.35], [6.2, 0.35], [7, 0]],
      // slow, even breaths in time with the sway
      breath: [[0, 0], [0.9, 1], [1.8, 0], [2.7, 1], [3.6, 0], [4.5, 1], [5.4, 0], [6.3, 0.8], [7, 0]]
    }
  },
  sigh: {
    label: "Sigh",
    dur: 5.6,
    idle: !0,
    tracks: {
      breath: [[0, 0], [1.3, 1.25], [1.9, 1.25], [3.6, 0], [5.6, 0]],
      angleY: [[0, 0], [1.3, 9], [1.9, 9], [3.3, -9], [4.6, -6], [5.6, 0]],
      angleZ: [[0, 0], [1.3, -3], [3.3, 5], [5.6, 0]],
      bodyAngleX: [[0, 0], [1.3, -2.5], [3.3, 2.5], [5.6, 0]],
      bodyAngleZ: [[0, 0], [1.9, 1], [3.3, -1.5], [5.6, 0]],
      armAngle: [[0, 0], [1.3, -2.5], [3.3, 2], [5.6, 0]],
      gazeY: [[0, 0], [1.2, 0.4], [2, 0.3], [3.2, -0.4], [4.8, -0.2], [5.6, 0]],
      eyeOpen: [[0, 1], [1, 0.95], [1.9, 0.6], [3.4, 0.6], [4.6, 0.78], [5.6, 1]],
      browY: [[0, 0], [1.3, 0.35], [3.2, -0.2], [5.6, 0]],
      browAngle: [[0, 0], [1.9, -0.4], [4.6, -0.35], [5.6, 0]]
    }
  },
  doze: {
    label: "Drowsy",
    dur: 7.2,
    idle: !0,
    tracks: {
      eyeOpen: [[0, 1], [1.8, 0.78], [3.2, 0.62], [4.5, 0.55], [4.75, 1.1], [5.6, 1.05], [7.2, 1]],
      angleY: [[0, 0], [1.8, -6], [3.2, -9], [4.5, -17], [4.75, 5], [5.6, 2], [7.2, 0]],
      angleZ: [[0, 0], [2, 4], [4.5, 10], [4.75, -2], [7.2, 0]],
      angleX: [[0, 0], [4.5, -4], [4.75, 3], [5.4, -6], [6.2, 5], [7.2, 0]],
      bodyAngleZ: [[0, 0], [4.5, 3], [4.8, -2], [7.2, 0]],
      bodyAngleX: [[0, 0], [4.5, 2], [4.8, -1.5], [7.2, 0]],
      armAngle: [[0, 0], [4.5, 3], [4.8, -2], [7.2, 0]],
      handAngle: [[0, 0], [4.5, 5], [4.8, -1], [7.2, 0]],
      gazeY: [[0, 0], [4.5, -0.4], [4.75, 0.2], [7.2, 0]],
      gazeX: [[0, 0], [4.8, 0], [5.3, -0.6], [6.1, 0.6], [6.8, 0]],
      browY: [[0, 0], [4.5, -0.35], [4.75, 0.8], [5.8, 0.3], [7.2, 0]],
      // long, slow, deepening breaths; a sharp inhale on waking
      breath: [[0, 0], [1.1, 0.7], [2.6, 0], [3.8, 0.6], [4.5, 0.2], [4.8, 1.1], [6, 0.2], [7.2, 0]]
    }
  },
  stretch: {
    label: "Stretch",
    dur: 6.2,
    idle: !0,
    tracks: {
      angleZ: [[0, 0], [1.3, -22], [2.3, -21], [3.8, 20], [4.8, 19], [6.2, 0]],
      angleY: [[0, 0], [1.3, 5], [2.3, 7], [3.1, -3], [3.8, 5], [4.8, 6], [6.2, 0]],
      angleX: [[0, 0], [1.3, -5], [3.8, 5], [6.2, 0]],
      bodyAngleZ: [[0, 0], [1.3, 4], [3.8, -4], [6.2, 0]],
      bodyAngleX: [[0, 0], [1.3, -2], [3.8, 2], [6.2, 0]],
      armAngle: [[0, 0], [1.3, 2], [3.8, -2], [6.2, 0]],
      eyeOpen: [[0, 1], [0.8, 0.62], [4.9, 0.62], [5.6, 1]],
      browAngle: [[0, 0], [1, -0.3], [4.9, -0.3], [5.8, 0]],
      breath: [[0, 0], [1.3, 1.1], [2.3, 0.9], [3.1, 0.2], [3.8, 1.1], [4.8, 0.9], [6.2, 0]]
    }
  },
  lean: {
    label: "Peek",
    dur: 4.8,
    idle: !0,
    tracks: {
      bodyAngleX: [[0, 0], [0.9, 6], [3.4, 6], [4.4, 0]],
      bodyAngleZ: [[0, 0], [0.9, -3], [3.4, -3], [4.4, 0]],
      angleX: [[0, 0], [0.9, 9], [2, 7], [2.6, 10], [3.4, 8], [4.4, 0]],
      angleY: [[0, 0], [0.9, -6], [3.4, -5], [4.4, 0]],
      angleZ: [[0, 0], [0.9, 10], [2.2, 12], [3.4, 9], [4.4, 0]],
      armAngle: [[0, 0], [0.9, -3], [3.4, -3], [4.4, 0]],
      handAngle: [[0, 0], [0.9, 3], [3.4, 3], [4.4, 0]],
      gazeY: [[0, 0], [0.6, 0.45], [3.4, 0.4], [4.2, 0]],
      gazeX: [[0, 0], [1.5, 0], [1.8, -0.3], [2.3, 0.2], [2.8, 0], [4.2, 0]],
      eyeOpen: [[0, 1], [0.6, 1.1], [3.4, 1.08], [4.2, 1]],
      browY: [[0, 0], [0.6, 0.45], [3.4, 0.4], [4.2, 0]],
      browAngle: [[0, 0], [0.6, -0.3], [3.4, -0.3], [4.2, 0]],
      blush: [[0, 0], [1.2, 0.25], [3.4, 0.25], [4.4, 0]],
      breath: [[0, 0], [0.8, 0.8], [3.4, 0.6], [4.4, 0], [4.8, 0.2]]
    }
  },
  hum: {
    label: "Listen",
    dur: 5.6,
    idle: !0,
    tracks: {
      angleY: [[0, 0], [0.45, -5], [0.9, 2], [1.35, -5], [1.8, 2], [2.25, -5], [2.7, 2], [3.15, -5], [3.6, 2], [4.05, -4], [4.8, 0]],
      angleZ: [[0, 0], [0.9, 8], [1.8, -8], [2.7, 8], [3.6, -8], [4.6, 0]],
      angleX: [[0, 0], [0.9, 4], [1.8, -4], [2.7, 4], [3.6, -4], [4.6, 0]],
      bodyAngleZ: [[0, 0], [0.9, -3], [1.8, 3], [2.7, -3], [3.6, 3], [4.6, 0]],
      bodyAngleX: [[0, 0], [1.8, 2], [3.6, -2], [4.8, 0]],
      handAngle: [[0, 0], [0.9, 3], [1.8, -3], [2.7, 3], [3.6, -3], [4.6, 0]],
      fingerTap: [[0, 0], [0.45, 1], [0.9, 0], [1.35, 1], [1.8, 0], [2.25, 1], [2.7, 0], [3.15, 1], [3.6, 0], [5.6, 0]],
      gazeX: [[0, 0], [0.9, 0.3], [1.8, -0.3], [2.7, 0.3], [3.6, -0.3], [4.6, 0]],
      eyeOpen: [[0, 1], [0.4, 0.72], [4.6, 0.72], [5.3, 1]],
      eyeSmile: [[0, 0], [0.4, 0.55], [4.6, 0.55], [5.3, 0]],
      blush: [[0, 0], [0.8, 0.3], [4.6, 0.3], [5.6, 0]],
      browY: [[0, 0], [0.5, 0.25], [4.6, 0.25], [5.4, 0]],
      breath: [[0, 0], [0.9, 0.9], [1.8, 0.2], [2.7, 0.9], [3.6, 0.2], [4.6, 0.8], [5.6, 0]]
    }
  },
  tap: {
    label: "Tap",
    dur: 5,
    idle: !0,
    tracks: {
      gazeX: [[0, 0], [0.3, -0.6], [2.2, -0.5], [2.5, -0.1], [2.8, -0.6], [4.2, -0.5], [4.7, 0]],
      gazeY: [[0, 0], [0.3, 0.55], [4.2, 0.5], [4.7, 0]],
      angleX: [[0, 0], [0.8, -11], [2.4, -9], [3, -12], [4.2, -10], [5, 0]],
      angleY: [[0, 0], [0.8, 8], [4.2, 7], [5, 0]],
      angleZ: [[0, 0], [0.8, 6], [2.4, 4], [3, 7], [4.2, 5], [5, 0]],
      bodyAngleX: [[0, 0], [1, -2], [4.2, -2], [5, 0]],
      handAngle: [[0, 0], [0.8, 3], [4.2, 3], [5, 0]],
      fingerTap: [
        [0, 0],
        [0.9, 0],
        [1.05, 1],
        [1.2, 0],
        [1.4, 1],
        [1.55, 0],
        [1.75, 1],
        [1.9, 0],
        [2.6, 0],
        [2.75, 1],
        [2.9, 0],
        [3.1, 1],
        [3.25, 0],
        [5, 0]
      ],
      browY: [[0, 0], [0.6, 0.3], [4.2, 0.25], [5, 0]],
      browAngle: [[0, 0], [0.6, -0.35], [4.2, -0.3], [5, 0]],
      eyeOpen: [[0, 1], [0.6, 0.9], [4.2, 0.9], [5, 1]],
      breath: [[0, 0], [0.8, 0.7], [2.2, 0.4], [3.2, 0.8], [4.4, 0], [5, 0.2]]
    }
  },
  readNote: {
    label: "Read script",
    dur: 2.6,
    idle: !0,
    tracks: {
      // a quick look down at the notes on the desk and back to the camera
      gazeY: [[0, 0], [0.2, -0.85], [1.5, -0.8], [1.75, 0], [2.6, 0]],
      gazeX: [[0, 0], [0.2, -0.15], [1.5, -0.1], [1.75, 0]],
      angleY: [[0, 0], [0.45, -9], [1.5, -8], [2, 1], [2.6, 0]],
      angleZ: [[0, 0], [0.5, 2], [1.6, 2], [2.6, 0]],
      eyeOpen: [[0, 1], [0.3, 0.78], [1.5, 0.78], [1.75, 1]],
      breath: [[0, 0.3], [0.8, 0.5], [1.8, 0.2], [2.6, 0.4]]
    }
  },
  waiting: {
    label: "Fidget",
    dur: 6.4,
    idle: !0,
    tracks: {
      // shifts her weight, checks the viewer, looks away, shifts back
      bodyAngleZ: [[0, 0], [0.9, 5], [2.4, 4], [3.3, -5], [5.2, -4], [6.4, 0]],
      bodyAngleX: [[0, 0], [0.9, 3], [3.3, -3], [5.2, -2], [6.4, 0]],
      angleZ: [[0, 0], [1, -6], [2.4, -4], [3.4, 6], [5.2, 5], [6.4, 0]],
      angleX: [[0, 0], [1.2, -8], [2.2, 2], [3.6, 12], [5, 10], [6.2, 0]],
      angleY: [[0, 0], [1.2, -3], [2.2, 2], [3.6, -2], [6.2, 0]],
      armAngle: [[0, 0], [0.9, 3], [3.3, -3], [5.2, -2], [6.4, 0]],
      handAngle: [[0, 0], [1.2, 3], [3.4, -3], [6.4, 0]],
      fingerTap: [[0, 0], [4.2, 0], [4.35, 1], [4.5, 0], [4.7, 1], [4.85, 0], [6.4, 0]],
      gazeX: [[0, 0], [0.9, -0.7], [1.9, -0.6], [2.1, 0], [2.7, 0], [2.9, 0.8], [5, 0.7], [5.4, 0], [6.4, 0]],
      gazeY: [[0, 0], [0.9, -0.2], [2.1, 0], [2.9, 0.3], [5.4, 0]],
      eyeOpen: [[0, 1], [2, 1], [2.2, 1.06], [2.8, 1.05], [3.1, 0.85], [5.4, 0.85], [6.2, 1]],
      browAngle: [[0, 0], [0.9, -0.35], [2, -0.35], [2.3, 0], [3.1, -0.4], [5.4, -0.35], [6.4, 0]],
      browY: [[0, 0], [2.2, 0.4], [2.8, 0.35], [3.2, 0], [6.4, 0]],
      breath: [[0, 0.3], [0.9, 0.8], [2, 0.3], [2.6, 0.9], [3.4, 0.2], [4.4, 0.8], [5.6, 0], [6.4, 0.2]]
    }
  },
  spaceOut: {
    label: "Daydream",
    dur: 7.4,
    idle: !0,
    tracks: {
      // gaze drifts up and away, breaths get slow and long, one slow blink
      gazeX: [[0, 0], [1.4, -0.55], [4.8, -0.6], [5.6, 0.1], [7, 0]],
      gazeY: [[0, 0], [1.4, 0.6], [4.8, 0.55], [5.6, 0], [7, 0]],
      angleX: [[0, 0], [2, -9], [4.8, -10], [6, 2], [7.4, 0]],
      angleY: [[0, 0], [2, 7], [4.8, 8], [6, -2], [7.4, 0]],
      angleZ: [[0, 0], [2, 9], [4.8, 11], [6, 2], [7.4, 0]],
      bodyAngleZ: [[0, 0], [2.2, 3], [4.8, 3.5], [6.4, 0]],
      bodyAngleX: [[0, 0], [2.2, -2], [4.8, -2], [6.4, 0]],
      handAngle: [[0, 0], [2.2, 4], [4.8, 5], [6.4, 0]],
      armAngle: [[0, 0], [2.2, 2], [4.8, 2], [6.4, 0]],
      eyeOpen: [[0, 1], [1.4, 0.8], [3, 0.8], [3.35, 0.56], [3.8, 0.8], [4.8, 0.8], [5.6, 1.04], [6.4, 1]],
      browY: [[0, 0], [1.6, 0.15], [4.8, 0.15], [5.6, 0.35], [6.6, 0]],
      breath: [[0, 0], [1.6, 0.9], [3.4, 0], [5, 0.9], [6.2, 0.1], [7.4, 0]]
    }
  }
};
function as(t, e) {
  if (e <= t[0][0]) return t[0][1];
  const n = t.length - 1;
  if (e >= t[n][0]) return t[n][1];
  let s = 0;
  for (; e > t[s + 1][0]; ) s++;
  const [a, i] = t[s], [o, m] = t[s + 1], w = (p) => p <= 0 || p >= n ? 0 : (t[p + 1][1] - t[p - 1][1]) / (t[p + 1][0] - t[p - 1][0]), y = o - a, v = (e - a) / y, h = w(s) * y, c = w(s + 1) * y, d = v * v, l = d * v;
  return (2 * l - 3 * d + 1) * i + (l - 2 * d + v) * h + (-2 * l + 3 * d) * m + (l - d) * c;
}
const ot = {
  a: { open: 0.9, form: 0, label: "あ" },
  i: { open: 0.5, form: -0.85, label: "い" },
  u: { open: 0.4, form: 0.9, label: "う" },
  e: { open: 0.62, form: -0.4, label: "え" },
  o: { open: 0.75, form: 0.6, label: "お" },
  n: { open: 0, form: null, label: "ん" }
  // closes with the previous shape
}, rs = {
  a: "あかさたなはまやらわがざだばぱぁ",
  i: "いきしちにひみりぎじぢびぴぃ",
  u: "うくすつぬふむゆるぐずづぶぷぅゔ",
  e: "えけせてねへめれげぜでべぺぇ",
  o: "おこそとのほもよろをごぞどぼぽぉ"
}, pn = {};
for (const [t, e] of Object.entries(rs)) for (const n of e) pn[n] = t;
const os = /* @__PURE__ */ new Set([..."まみむめもばびぶべぼぱぴぷぺぽ"]), is = /* @__PURE__ */ new Set([..."あいうえおぁぃぅぇぉ"]), Jt = { ゃ: "a", ゅ: "u", ょ: "o" }, ls = /* @__PURE__ */ new Set([..."、。，．,.！？!? 　…"]), hs = (t) => t.replace(/[ァ-ヶ]/g, (e) => String.fromCharCode(e.charCodeAt(0) - 96));
function us(t, e = 0.14) {
  const n = [];
  for (const s of hs(t)) {
    const a = n[n.length - 1];
    if (Jt[s] && a) {
      a.vowel = Jt[s];
      continue;
    }
    if (s === "ー" && a) {
      a.dur += e;
      continue;
    }
    if (s === "っ") {
      n.push({ vowel: "n", dur: e * 0.8, onset: null });
      continue;
    }
    if (s === "ん") {
      n.push({ vowel: "n", dur: e, onset: null });
      continue;
    }
    if (ls.has(s)) {
      n.push({ vowel: "n", dur: e * 2.2, onset: null });
      continue;
    }
    const i = pn[s];
    i && n.push({ vowel: i, dur: e, onset: os.has(s) ? "lips" : is.has(s) ? null : "consonant" });
  }
  return n;
}
function cs(t, e, n = 0.5) {
  if (n !== 0.5) return ms(t, e, n);
  let s = 0;
  for (const a of t) {
    if (e < s + a.dur) {
      const i = (e - s) / a.dur, o = ot[a.vowel], m = a.onset === "lips" ? 0.05 : a.onset === "consonant" ? 0.45 : 1, w = i < 0.35 ? m + (1 - m) * (i / 0.35) : 1;
      return { open: o.open * w, form: o.form, vowel: a.vowel };
    }
    s += a.dur;
  }
  return null;
}
function ms(t, e, n) {
  const s = n < 0.5 ? (0.5 - n) * 0.72 : 0;
  let a = 0, i = 0, o = null;
  for (const m of t) {
    let w = m.vowel;
    if (m.vowel === "n" ? s && m.dur <= 0.2 && o ? w = o : (i = 0, o = null) : ((!o || i >= s) && (o = m.vowel, i = 0), i += m.dur, s && (w = o)), e < a + m.dur) {
      const y = ot[w], v = m.onset === "lips" ? 0.05 : m.onset === "consonant" ? 0.45 : 1, h = n < 0.5 ? 1 - (1 - v) * n * 2 : v * (2 - n * 2), c = Math.min(m.dur * 0.35, 0.05), d = (e - a) / c;
      return { open: y.open * (d < 1 ? h + (1 - h) * d : 1), form: y.form, vowel: w };
    }
    a += m.dur;
  }
  return null;
}
const At = { ...Yt, ...zt }, Kt = { amp: 1, stiff: 1.8 }, ps = /^(angle|bodyAngle|armAngle|handAngle)/, fs = /* @__PURE__ */ new Set([
  "eyeOpen",
  "eyeOpenL",
  "eyeSmileL",
  "eyeSmile",
  "mouthOpen",
  "mouthForm",
  "blush",
  "browY",
  "browAngle"
]), ft = (t, e, n) => {
  const s = Math.min(1, Math.max(0, (n - t) / (e - t)));
  return s * s * (3 - 2 * s);
};
function Qt(t, e) {
  const n = Math.floor(t), s = t - n, a = (o) => {
    const m = Math.sin((o + e * 57.3) * 127.1) * 43758.5453;
    return m - Math.floor(m);
  }, i = s * s * (3 - 2 * s);
  return (a(n) * (1 - i) + a(n + 1) * i) * 2 - 1;
}
const Pe = (t, e) => Qt(t, e) * 0.7 + Qt(t * 2.3, e + 9) * 0.3, Ee = (t, e, n) => Math.max(e, Math.min(n, t)), fn = {
  normal: { label: "Neutral", p: {} },
  smile: { label: "Smile", p: { eyeOpen: 0, eyeSmile: 1, blush: 0.35, browY: 0.2 } },
  shy: { label: "Blush", p: { eyeOpen: 0.78, eyeSmile: 0.5, blush: 1, browAngle: -0.5, browY: -0.1, glance: [0.7, 0.35] } },
  jito: { label: "Half-lidded", p: { eyeOpen: 0.5, browY: -0.5, browAngle: 0.6 } },
  surprise: { label: "Surprise", p: { eyeOpen: 1.22, browY: 1, mouthOpen: 0.6, mouthForm: 0.6 } },
  wink: { label: "Wink", p: { eyeOpenL: 0, eyeSmileL: 1, blush: 0.3 } },
  // talking faces for AITuber OnAir emotion tags: eyes stay mostly open (closed / ^^ eyes are
  // what a single image fakes worst, and they would stay shut for a whole sentence)
  happyTalk: { label: "happy", p: { eyeOpen: 0.8, eyeSmile: 0.45, blush: 0.35, browY: 0.25, mouthForm: -0.5 } },
  sadTalk: { label: "sad", p: { eyeOpen: 0.78, browAngle: -0.8, browY: -0.2, mouthForm: 0.3, glance: [0, -0.35] } },
  angryTalk: { label: "angry", p: { eyeOpen: 0.72, browAngle: 0.85, browY: -0.55, mouthForm: 0.2 } },
  surprisedTalk: { label: "surprised", p: { eyeOpen: 1.18, browY: 0.9, mouthForm: 0.9 } },
  relaxedTalk: { label: "relaxed", p: { eyeOpen: 0.82, eyeSmile: 0.35, blush: 0.15, browY: 0.1 } }
}, en = {
  happy: ["happyTalk", "nod"],
  sad: ["sadTalk", "sigh"],
  angry: ["angryTalk", "no"],
  surprised: ["surprisedTalk", "surprise"],
  relaxed: ["relaxedTalk", "sway"],
  neutral: ["normal", null]
}, ds = {
  gazeX: [260, 0.9],
  gazeY: [260, 0.9],
  angleX: [55, 0.72],
  angleY: [55, 0.72],
  angleZ: [45, 0.75],
  bodyAngleX: [14, 0.9],
  bodyAngleZ: [12, 0.9],
  weightShift: [14, 0.9],
  armAngle: [20, 0.85],
  handAngle: [30, 0.8]
};
function gs(t) {
  const e = (t + 0.45) % 5, n = e < 2.5 ? -0.7 : 0.7, s = -n, a = e % 2.5;
  if (a >= 0.9) return s;
  const i = a / 0.9, o = i * i * i * (10 + i * (-15 + 6 * i));
  return n + (s - n) * o;
}
class ys {
  /** @param {number[]} gazeCenter @param {boolean} [planted] @param {import('../rig/types').Rig|null} [armRig] */
  constructor(e, n = !1, s = null) {
    this.armRig = s, this.armFollow = 0, this.armVelocity = 0, this.planted = n, this.mode = "auto", this.P = Object.fromEntries(mt.map((a) => [a.id, a.def])), this.manual = { ...this.P }, this.cur = { ...this.P }, this.vel = Object.fromEntries(mt.map((a) => [a.id, 0])), this.expr = "normal", this.exprMix = {}, this.t = 0, this.blink = { t: 0, start: 1.5, double: !1 }, this.gaze = { x: 0, y: 0, next: 0 }, this.tap = { next: 4, until: -1 }, this.pointer = null, this.faceCenter = [...e], this.lipOpen = null, this.lipForm = 0, this.speaking = !1, this.voice = 0, this.mouth = 0, this.vowel = "a", this.vowelForm = 0, this.lipSync = Ht(), this.lipMotion = Vt(this.lipSync), this.syllableArmed = !0, this.voicePeak = 0, this.voiceTrough = 0, this.kana = null, this.lipHold = null, this.emotionUntil = 0, this.talkGain = 1, this.play = null, this.autoMotion = !0, this.nextAuto = 14, this.autoIdle = !0, this.nextIdle = 3, this.lastAuto = null, this.onMotion = null;
  }
  setExpression(e) {
    this.expr = e;
  }
  hasMotion(e) {
    return e in At;
  }
  // ---- speech (driven from outside, e.g. by the TTS audio analyser) ----
  setVoiceLevel(e) {
    this.voice = Math.min(1, Math.max(0, Number(e) || 0));
  }
  setLipSync(e) {
    this.lipSync = Ht(e, this.lipSync), this.lipMotion = Vt(this.lipSync);
  }
  setSpeaking(e) {
    e !== this.speaking && (this.speaking = !!e, e || (this.emotionUntil = this.t + 1.2, this.voice = 0));
  }
  /** `playMotion: false` changes only the face (a caller that picks motions itself). */
  setEmotion(e, { playMotion: n = !0 } = {}) {
    const s = en[e] ?? en.neutral;
    this.expr = s[0], this.emotionUntil = 1 / 0, s[1] && n && this.playMotion(s[1]);
  }
  /** Mouth shapes from kana text, without audio (preview / tuning). */
  /** @param {string} text @param {{ speed?: number, loop?: boolean }} [options] */
  speakKana(e, { speed: n, loop: s = !1 } = {}) {
    this.lipHold = null;
    const a = us(e, n === void 0 ? 0.14 : 1 / Ee(Number(n) || 7, 4, 12));
    this.kana = a.length ? { moras: a, t: 0, loop: s, duration: a.reduce((i, o) => i + o.dur, 0) } : null;
  }
  holdMouth(e) {
    this.kana = null, this.lipHold = Object.hasOwn(ot, e) ? e : null;
  }
  stopLipSync() {
    this.kana = null, this.lipHold = null, this.lipOpen = null, this.mouth = 0;
  }
  getLipSyncState() {
    return { active: this.kana !== null || this.lipHold !== null, open: this.P.mouthOpen, form: this.P.mouthForm };
  }
  // Mouth from the TTS loudness. A volume signal has no vowel information, so each syllable
  // (the voice dipping and rising again) gets one vowel at random, weighted towards a, and
  // keeps it until the next syllable: the drawn mouths must not change shape mid-syllable.
  // Syllables are found relative to the recent peak (not an absolute level), and the mouth
  // is scaled by where the voice sits between the recent trough and peak, so it closes in
  // the dip before each mora even when a loud voice never gets quiet.
  speechMouth(e) {
    if (this.kana || this.lipHold) {
      let c;
      if (this.lipHold ? c = ot[this.lipHold] : (this.kana.t += e, this.kana.loop && (this.kana.t %= this.kana.duration), c = cs(this.kana.moras, this.kana.t, this.lipSync.granularity)), !c)
        return this.kana = null, this.mouth > 0.01 ? [this.mouth *= this.lipSync.closeSpeed === 0.5 ? 0.6 : Math.exp(-e * this.lipMotion.kanaRelease), this.vowelForm] : null;
      const d = this.lipMotion.openness === 1 ? c.open : Math.min(1, c.open * this.lipMotion.openness), l = d > this.mouth ? 1 - Math.exp(-e * 30) : 1 - Math.exp(-e * this.lipMotion.kanaRelease);
      return this.mouth += (d - this.mouth) * l, c.form !== null && (this.vowelForm = c.form), [this.mouth, this.vowelForm];
    }
    const n = this.speaking ? this.voice : 0, s = 1 - Math.exp(-e * this.lipMotion.relax);
    this.voicePeak = n > this.voicePeak ? n : this.voicePeak + (n - this.voicePeak) * s, this.voiceTrough = n < this.voiceTrough ? n : this.voiceTrough + (n - this.voiceTrough) * s;
    const a = Math.max(this.voicePeak, 0.05);
    if (n < a * this.lipMotion.arm) this.syllableArmed = !0;
    else if (this.syllableArmed && n > a * this.lipMotion.trigger && n > 0.1) {
      this.syllableArmed = !1;
      const c = Math.random();
      this.vowel = c < 0.4 ? "a" : c < 0.58 ? "o" : c < 0.74 ? "e" : c < 0.88 ? "i" : "u";
    }
    const i = this.voicePeak - this.voiceTrough, o = i < a * this.lipMotion.range ? 1 : Math.max(0, (n - this.voiceTrough) / i), m = ot[this.vowel ?? "a"], w = Math.min(1, Math.pow(n, 0.7) * 1.15) * Math.pow(o, this.lipMotion.risePower), y = this.speaking ? Math.min(0.95, w) * (0.45 + 0.55 * m.open / 0.9) : 0, v = this.lipMotion.openness === 1 ? y : Math.min(1, y * this.lipMotion.openness), h = v > this.mouth ? 1 - Math.exp(-e * 40) : 1 - Math.exp(-e * this.lipMotion.audioRelease);
    return this.mouth += (v - this.mouth) * h, this.speaking && (this.vowelForm = m.form), this.speaking || this.mouth > 0.01 ? [this.mouth, this.vowelForm] : null;
  }
  // Breathing: inhale ~40% of the cycle, a slower exhale, a short pause at the bottom,
  // and a period that drifts between ~3.2 and 4.6 s so it never looks metronomic.
  breathValue(e) {
    this.breathPhase = (this.breathPhase ?? 0) + e / (this.breathPeriod ?? 3.8), this.breathPhase >= 1 && (this.breathPhase -= 1, this.breathPeriod = 3.2 + Math.random() * 1.4);
    const n = this.breathPhase;
    return n < 0.4 ? ft(0, 0.4, n) : n < 0.88 ? 1 - ft(0.4, 0.88, n) : 0;
  }
  // pick one at random, never the one that just played
  playRandom(e) {
    const n = e.filter((s) => s !== this.lastAuto);
    this.playMotion(n[Math.floor(Math.random() * n.length)]);
  }
  playMotion(e) {
    this.lastAuto = e, this.play = { id: e, t: 0 }, this.onMotion?.(e);
  }
  blinkValue(e) {
    const n = this.blink;
    if (n.t += e, n.t < n.start) return 1;
    const s = (n.t - n.start) / 0.17;
    return s >= 1 ? (n.double ? (n.double = !1, n.start = n.t + 0.07) : (n.start = n.t + 1.8 + Math.random() * 4.2, n.double = Math.random() < 0.18), 1) : s < 0.45 ? 1 - s / 0.45 : (s - 0.45) / 0.55;
  }
  update(e) {
    this.t += e;
    const n = this.t, s = {};
    for (const l of mt) s[l.id] = l.def;
    if (this.mode === "manual")
      Object.assign(s, this.manual);
    else if (this.mode === "auto") {
      if (s.angleX = Pe(n * 0.18, 1) * 10 + this.gaze.x * 11, s.angleY = Pe(n * 0.15, 2) * 6 - 1 + this.gaze.y * 7, s.angleZ = Pe(n * 0.12, 3) * 10, s.bodyAngleX = Pe(n * 0.1, 4) * 5 * (this.planted ? 0.35 : 1), s.bodyAngleZ = Pe(n * 0.09, 5) * 4 * (this.planted ? 0.35 : 1), s.weightShift = this.planted ? gs(n) : 0.7 * Math.sin(n * Math.PI * 2 / 5), s.armAngle = Pe(n * 0.14, 6) * 5, s.handAngle = Pe(n * 0.21, 7) * 5, n > this.gaze.next) {
        const l = Math.random();
        this.gaze.x = l < 0.45 ? 0 : (Math.random() * 2 - 1) * 0.8, this.gaze.y = l < 0.45 ? 0 : (Math.random() * 2 - 1) * 0.5, this.gaze.next = n + 0.8 + Math.random() * 2.5;
      }
      if (s.gazeX = this.gaze.x + s.angleX / 60, s.gazeY = this.gaze.y + s.angleY / 60, n > this.tap.next && (this.tap.until = n + 1.1, this.tap.next = n + 5 + Math.random() * 6), this.speaking) {
        this.nextIdle = Math.max(this.nextIdle, n + 2.5), this.nextAuto = Math.max(this.nextAuto, n + 6);
        const l = this.talkGain;
        this.talkNod = (this.talkNod ?? 0) + (this.voice * 7 * l - (this.talkNod ?? 0)) * Math.min(1, e * 6), s.angleY -= this.talkNod, s.angleX += Pe(n * 0.6, 11) * 5 * l, s.angleZ += Pe(n * 0.5, 12) * 4 * l;
      }
      !this.speaking && n > this.emotionUntil && (this.expr = "normal", this.emotionUntil = 1 / 0), this.speaking || (!this.play && this.autoMotion && n > this.nextAuto ? (this.playRandom(Object.keys(Yt).filter((l) => l !== "surprise")), this.nextAuto = n + 15 + Math.random() * 10, this.nextIdle = Math.max(this.nextIdle, n + 5)) : !this.play && this.autoIdle && n > this.nextIdle && (this.playRandom(Object.keys(zt)), this.nextIdle = n + 5 + Math.random() * 5));
    } else if (this.mode === "mouse" && this.pointer) {
      const l = (this.pointer[0] - this.faceCenter[0]) / 500, p = (this.pointer[1] - this.faceCenter[1]) / 500;
      s.angleX = Ee(l * 30, -30, 30), s.angleY = Ee(-p * 30, -30, 30), s.angleZ = Ee(-l * p * 25, -12, 12), s.bodyAngleX = Ee(l * 10, -10, 10) * 0.6, s.gazeX = Ee(l * 1.4, -1, 1), s.gazeY = Ee(-p * 1.4, -1, 1), s.handAngle = Ee(l * 4, -5, 5);
    }
    this.mode !== "manual" && (s.breath = this.breathValue(e), n < this.tap.until && (s.fingerTap = Math.max(0, Math.sin((this.tap.until - n) * Math.PI * 3.6)) ** 2));
    let a = null, i = 0;
    if (this.play) {
      const l = At[this.play.id];
      if (this.play.t += e, this.play.t >= l.dur)
        this.play = null, this.onMotion?.(null);
      else {
        a = {};
        for (const [p, u] of Object.entries(l.tracks))
          a[p] = as(u, this.play.t) * (l.idle && ps.test(p) ? Kt.amp : 1);
        i = ft(0, 0.15, this.play.t) * (1 - ft(l.dur - 0.25, l.dur, this.play.t));
        for (const [p, u] of Object.entries(a))
          ss.has(p) ? s[p] += u : p === "breath" ? s[p] += (u - s[p]) * i : fs.has(p) || (s[p] = Math.max(s[p], Math.max(0, u)));
      }
    }
    if (this.mode !== "manual" && (s.angleY += s.breath * 1.6), this.armRig?.arms && this.mode !== "manual") {
      const { arms: l, body: p, legs: u } = this.armRig, g = -s.bodyAngleZ / 10 * p.maxRoll + (u ? u.tilt * (1 - (u.spine ?? 0.7)) * s.weightShift : 0), r = Ee(e, 0, 0.05), f = Math.ceil(r * 240);
      for (let T = 0; T < f; T++) {
        const F = r / f;
        this.armVelocity += (100 * (-g * 0.65 - this.armFollow) - 18 * this.armVelocity) * F, this.armFollow += this.armVelocity * F;
      }
      const x = (l.swing ?? rt.swing) * Math.PI / 180, b = l.inward ?? rt.inward;
      for (const [T, F] of [["L", 1], ["R", -1]]) {
        const P = F * this.armFollow, te = x * (P < 0 ? b : 1);
        s[`armSwing${T}`] = Ee((te > 0 ? P / te : 0) + (s.breath - 0.5) * 0.06, -1, 1), s[`elbowBend${T}`] = s.breath * 0.025;
      }
    }
    const o = fn[this.expr].p, m = ["eyeOpen", "eyeOpenL", "eyeSmileL", "eyeSmile", "mouthOpen", "mouthForm", "blush", "browY", "browAngle", "gx", "gy"], w = {
      eyeOpen: o.eyeOpen ?? 1,
      eyeOpenL: o.eyeOpenL ?? o.eyeOpen ?? 1,
      eyeSmileL: o.eyeSmileL ?? o.eyeSmile ?? 0,
      eyeSmile: o.eyeSmile ?? 0,
      mouthOpen: o.mouthOpen ?? 0,
      mouthForm: o.mouthForm ?? 0,
      blush: o.blush ?? 0,
      browY: o.browY ?? 0,
      browAngle: o.browAngle ?? 0,
      gx: o.glance?.[0] ?? 0,
      gy: o.glance?.[1] ?? 0
    }, y = 1 - Math.exp(-e * 9);
    for (const l of m)
      this.exprMix[l] === void 0 && (this.exprMix[l] = w[l]), this.exprMix[l] += (w[l] - this.exprMix[l]) * y;
    const v = this.exprMix, h = {};
    for (const l of mt) {
      const p = l.id;
      if (this.mode === "manual" && !a) {
        h[p] = s[p], this.cur[p] = s[p], this.vel[p] = 0;
        continue;
      }
      let [u, g] = ds[p] ?? [120, 0.95];
      a && /^angle|^body/.test(p) && (At[this.play?.id ?? ""]?.idle ? (u *= Kt.stiff, g = 0.8) : /^angle/.test(p) && (u *= 4.5, g = 0.75));
      const r = 2 * Math.sqrt(u) * g;
      this.vel[p] += (u * (s[p] - this.cur[p]) - r * this.vel[p]) * e, this.cur[p] += this.vel[p] * e, h[p] = this.cur[p];
    }
    let c = 1;
    if (this.mode !== "manual" ? (c = this.blinkValue(e), h.eyeROpen = v.eyeOpen * c, h.eyeLOpen = v.eyeOpenL * c, h.eyeSmile = v.eyeSmile, h.eyeSmileL = v.eyeSmileL, h.mouthOpen = v.mouthOpen, h.mouthForm = v.mouthForm, h.blush = v.blush, h.browY = v.browY + (h.angleY > 0 ? h.angleY / 60 : 0) - (1 - c) * 0.18, h.browAngle = v.browAngle, h.gazeX = Ee(h.gazeX + v.gx, -1, 1), h.gazeY = Ee(h.gazeY + v.gy, -1, 1)) : h.eyeSmileL = h.eyeSmile, a) {
      const l = (u, g) => {
        h[u] += (g - h[u]) * i;
      }, p = (u) => Math.min(1.3, Math.max(0, u));
      "eyeOpen" in a && (l("eyeROpen", p(a.eyeOpen) * c), "eyeOpenL" in a || l("eyeLOpen", p(a.eyeOpen) * c)), "eyeOpenL" in a && l("eyeLOpen", p(a.eyeOpenL) * c), "eyeSmile" in a && (l("eyeSmile", a.eyeSmile), "eyeSmileL" in a || l("eyeSmileL", a.eyeSmile)), "eyeSmileL" in a && l("eyeSmileL", a.eyeSmileL);
      for (const u of ["mouthOpen", "mouthForm", "blush", "browY", "browAngle"])
        u in a && l(u, u === "mouthOpen" || u === "blush" ? Math.max(0, a[u]) : a[u]);
    }
    const d = this.speechMouth(e);
    return d ? (this.lipOpen = d[0], this.lipForm = d[1]) : this.lipOpen !== null && !this.speaking && !this.kana && (this.lipOpen = null), this.lipOpen !== null && (h.mouthOpen = Math.max(h.mouthOpen * 0.3, this.lipOpen), h.mouthForm = Ee(this.lipForm, -1, 1)), this.P = h, h;
  }
}
const bt = {
  neutral: "normal",
  smile: "smile",
  shy: "shy",
  surprise: "surprise",
  halfLidded: "jito",
  angry: "angryTalk",
  sad: "sadTalk",
  wink: "wink"
}, bs = { sad: { pitch: -6, gy: -0.45 } }, nt = (t, e, n) => Math.max(e, Math.min(n, t)), st = Object.freeze({ eyeOpen: 1, eyeOpenL: 1, eyeSmile: 0, eyeSmileL: 0, blush: 0, browY: 0, browAngle: 0, mouthOpen: 0, mouthForm: 0, gx: 0, gy: 0, pitch: 0 });
function vs(t, e = {}) {
  const n = fn[bt[t]]?.p ?? {}, s = bs[t] ?? {}, a = t === "neutral" ? void 0 : e[t]?.mouthOpen;
  return {
    eyeOpen: n.eyeOpen ?? 1,
    eyeOpenL: n.eyeOpenL ?? n.eyeOpen ?? 1,
    eyeSmile: n.eyeSmile ?? 0,
    eyeSmileL: n.eyeSmileL ?? n.eyeSmile ?? 0,
    blush: n.blush ?? 0,
    browY: n.browY ?? 0,
    browAngle: n.browAngle ?? 0,
    mouthOpen: a ?? n.mouthOpen ?? 0,
    mouthForm: n.mouthForm ?? 0,
    gx: n.glance?.[0] ?? 0,
    gy: s.gy ?? n.glance?.[1] ?? 0,
    pitch: s.pitch ?? 0
  };
}
function ws(t, e) {
  const n = { ...t };
  return n.eyeROpen = (t.eyeROpen ?? 1) * e.eyeOpen, n.eyeLOpen = (t.eyeLOpen ?? 1) * e.eyeOpenL, n.eyeSmile = Math.max(t.eyeSmile ?? 0, e.eyeSmile), n.eyeSmileL = Math.max(t.eyeSmileL ?? t.eyeSmile ?? 0, e.eyeSmileL), n.blush = Math.max(t.blush ?? 0, e.blush), n.browY = nt((t.browY ?? 0) + e.browY, -1, 1), n.browAngle = nt((t.browAngle ?? 0) + e.browAngle, -1, 1), n.mouthOpen = Math.max(t.mouthOpen ?? 0, e.mouthOpen), e.mouthOpen > (t.mouthOpen ?? 0) && (n.mouthForm = e.mouthForm), n.gazeX = nt((t.gazeX ?? 0) + e.gx, -1, 1), n.gazeY = nt((t.gazeY ?? 0) + e.gy, -1, 1), n.angleY = nt((t.angleY ?? 0) + e.pitch, -30, 30), n;
}
class xs {
  /** @type {keyof typeof OVERLAY_EXPRESSIONS} */
  name = "neutral";
  mix = { ...st };
  /** @param {Record<string, { mouthOpen?: number }>} [settings] parsed per-expression settings */
  constructor(e = {}) {
    this.settings = e;
  }
  /** @param {string} name */
  set(e) {
    this.name = Object.hasOwn(bt, e) ? (
      /** @type {keyof typeof OVERLAY_EXPRESSIONS} */
      e
    ) : "neutral";
  }
  /** True while an expression is shown or still fading out. */
  get active() {
    return this.name !== "neutral" || Object.keys(st).some((e) => Math.abs(this.mix[e] - st[e]) > 1e-3);
  }
  apply(e, n) {
    if (!this.active)
      return this.mix = { ...st }, e;
    const s = vs(this.name, this.settings), a = 1 - Math.exp(-Math.max(0, n) * 12);
    for (const i of Object.keys(st)) this.mix[i] += (s[i] - this.mix[i]) * a;
    return ws(e, this.mix);
  }
}
const tn = (t) => !!t && typeof t == "object" && !Array.isArray(t);
function Xt(t) {
  if (!tn(t)) throw new TypeError("expressions: expected an object");
  const e = {};
  for (const [n, s] of Object.entries(t)) {
    if (n === "neutral" || !Object.hasOwn(bt, n)) continue;
    if (!tn(s)) throw new TypeError(`expressions.${n}: expected an object`);
    const a = {}, i = s.mouthOpen;
    if (i !== void 0) {
      if (typeof i != "number" || !Number.isFinite(i) || i < 0 || i > 1)
        throw new RangeError(`expressions.${n}.mouthOpen: expected 0–1`);
      a.mouthOpen = i;
    }
    e[n] = a;
  }
  return e;
}
function Ms(t = {}, e = {}) {
  const n = {};
  for (const s of /* @__PURE__ */ new Set([...Object.keys(t), ...Object.keys(e)]))
    n[s] = { ...t[s], ...e[s] };
  return n;
}
const nn = ["ball", "low", "crease", "lash"], Et = /* @__PURE__ */ new Map(), Tt = /* @__PURE__ */ new Map();
async function St(t) {
  return Tt.has(t) || Tt.set(t, fetch(t).then((e) => {
    if (!e.ok) throw new Error(`failed to load ${t}`);
    return e.json();
  })), Tt.get(t);
}
function kt(t) {
  if (Et.has(t)) return Et.get(t);
  const e = new Promise((n, s) => {
    const a = new Image();
    a.onload = () => n(a), a.onerror = () => s(new Error(`failed to load ${t}`)), a.src = t;
  });
  return Et.set(t, e), e;
}
function dn(t, e) {
  const n = document.createElement("canvas");
  n.width = t.width, n.height = t.height;
  const s = n.getContext("2d");
  s.drawImage(t, 0, 0);
  const a = s.getImageData(0, 0, n.width, n.height).data, i = new Uint8Array(n.width * n.height);
  for (let o = 0; o < i.length; o++) i[o] = a[o * 4 + e];
  return i;
}
const Ce = (t) => dn(t, 3);
function As(t, [e, n, s, a]) {
  const i = document.createElement("canvas");
  return i.width = s, i.height = a, i.getContext("2d").drawImage(t, e, n, s, a, 0, 0, s, a), i;
}
function Es(t, e) {
  const [n, s] = t.t.pivot, a = t.dir, i = t.pts, o = (d, l, p) => {
    const u = Math.min(1, Math.max(0, (p - d) / (l - d)));
    return u * u * (3 - 2 * u);
  }, m = Math.cos(t.phi[0]), w = Math.sin(t.phi[0]), y = Math.cos(t.phi[1]), v = Math.sin(t.phi[1]), h = e.rest, c = e.pos;
  for (let d = 0; d < h.length; d += 2) {
    const l = h[d] - n, p = h[d + 1] - s, u = l * a[0] + p * a[1], g = i[0][0] + l * m - p * w, r = i[0][1] + l * w + p * m, f = l - a[0] * t.L1, x = p - a[1] * t.L1, b = i[1][0] + f * y - x * v, T = i[1][1] + f * v + x * y, F = o(t.L1 * 0.55, t.L1 * 1.35, u);
    c[d] = g + (b - g) * F, c[d + 1] = r + (T - r) * F;
  }
}
async function Ts(t, e) {
  if (!e.assets && e.assetsBase === void 0)
    throw new Error("createMeshAvatar requires assets or assetsBase.");
  const n = e.rig, s = Fn(n), {
    IMG: a,
    EYES: i,
    baseWeights: o,
    deformBase: m,
    eyePartY: w,
    eyePartAlpha: y,
    handWeights: v,
    handFrame: h,
    deformHand: c,
    TASSELS: d
  } = s, { Renderer: l, buildGrid: p } = Zn(s, n), { Physics: u } = Wn(s, n), { Cloth: g } = Kn(s, n), r = n.cloth ?? [], { createSprites: f } = Qn(s, n), x = (e.assetsBase ?? "").replace(/\/?$/, "/"), b = (A, k) => {
    if (e.assets) {
      if (!e.assets[A]) throw new Error(`Missing project asset: ${A}`);
      return e.assets[A];
    }
    return `${x}${A}${k === void 0 ? "" : `?b=${k}`}`;
  }, T = await St(b("layers.json")), F = [r.length ? "base_cloth" : "base", ...n.hand ? ["hand"] : [], ...d.map((A) => A.name), ...r.map((A) => `cloth_${A.name}`), ...[0, 1].flatMap((A) => nn.map((k) => `eye${A}_${k}`)), "hairmask"], P = Object.fromEntries(await Promise.all(F.map(async (A) => [A, await kt(b(`${A}.png`, T.build))])));
  r.length && (P.base = P.base_cloth);
  const te = dn(P.hairmask, 0), I = (A, k) => te[Math.min(a.h - 1, Math.max(0, Math.round(k))) * a.w + Math.min(a.w - 1, Math.max(0, Math.round(A)))] / 255, D = new l(t, { padTop: e.padTop ?? n.view.padTop, padSide: e.padSide ?? n.view.padSide, fit: e.fit }), O = { base: [0, 0, a.w, a.h], ...T.layers }, L = new g(), C = (A) => {
    const k = `cloth_${A.name}`, N = p(O[k], n.mesh.clothCell ?? 8, Ce(P[k]), P[k].width);
    L.attach(A.name, N), D.addLayer(k, P[k], N);
  };
  r.filter((A) => A.behind).forEach(C);
  const Y = p(O.base, n.mesh.baseCell, Ce(P.base), P.base.width, n.mesh.fine), $ = [];
  for (let A = 0; A < Y.rest.length / 2; A++) {
    const k = Y.rest[A * 2], N = Y.rest[A * 2 + 1];
    $.push(o(k, N, I(k, N)));
  }
  D.addLayer("base", P.base, Y, { face: !0 });
  const q = [];
  i.forEach((A, k) => {
    for (const N of nn) {
      const W = `eye${k}_${N}`, ae = p(O[W], N === "ball" ? n.mesh.eyeBallCell : n.mesh.eyeCell, Ce(P[W]), P[W].width), ie = [];
      for (let ye = 0; ye < ae.rest.length / 2; ye++) ie.push(o(ae.rest[ye * 2], ae.rest[ye * 2 + 1], 0));
      const de = D.addLayer(W, P[W], ae, { eyeBall: N === "ball" ? k : void 0 });
      q.push({ e: A, eye: k, part: N, mesh: ae, W: ie, layer: de });
    }
  });
  let X = null;
  try {
    {
      const A = await St(b("sprites/sprites.json")), k = Object.fromEntries(await Promise.all(Object.keys(A.layers).map(async (N) => [N, await kt(b(`sprites/${N}.png`, A.build))])));
      X = f(D, A, k, p, Ce);
    }
  } catch (A) {
    console.warn("eye / mouth sprites not loaded:", A);
  }
  r.filter((A) => !A.behind).forEach(C);
  let oe = null;
  try {
    const A = await St(b("overlays/overlays.json")), k = Object.fromEntries(await Promise.all(A.overlays.map(async (N) => [N.name, await kt(b(`overlays/${N.file}`))])));
    oe = ns(D, A, k, p, Ce, o, n.mesh.spriteCell, a.w, a.h, As);
  } catch (A) {
    e.assets?.["overlays/overlays.json"] && console.warn("overlay layers not loaded:", A);
  }
  const ee = d.map((A) => {
    const k = p(O[A.name], n.mesh.tasselCell, Ce(P[A.name]), P[A.name].width);
    return D.addLayer(A.name, P[A.name], k);
  }), J = n.hand ? p(O.hand, n.mesh.handCell, Ce(P.hand), P.hand.width) : { rest: [], pos: [] }, B = [];
  for (let A = 0; A < J.rest.length / 2; A++) B.push(v(J.rest[A * 2], J.rest[A * 2 + 1]));
  n.hand && D.addLayer("hand", P.hand, J);
  const H = new u(), V = new ys(n.view.gazeCenter ?? [n.head.cx, n.head.cy], !!n.legs, n.arms ? n : null);
  e.lipSync !== void 0 && V.setLipSync(e.lipSync);
  const re = /* @__PURE__ */ new Set();
  V.onMotion = (A) => {
    for (const k of re) k(A);
  };
  let ne = {}, se = 1, Z = {}, M = {};
  const E = new xs(e.expressions === void 0 ? void 0 : Xt(e.expressions));
  let S = !0;
  const R = [0, 0];
  function j(A) {
    const k = { ...V.update(A) };
    for (const [ae, ie] of Object.entries(ne)) {
      const de = se * (Z[ae] ?? 1);
      k[ae] = de === 1 ? ie : (k[ae] ?? 0) + (ie - (k[ae] ?? 0)) * de;
    }
    V.lipOpen !== null && (k.mouthOpen = V.P.mouthOpen, (!e.preserveMouthForm || ne.mouthForm === void 0) && (k.mouthForm = V.P.mouthForm));
    const N = E.apply(k, A), W = S ? N : k;
    return M = W, W;
  }
  function z(A) {
    const k = j(A), N = H.step(k, A), W = Y.pos, ae = Y.rest;
    for (let K = 0; K < $.length; K++)
      m(ae[K * 2], ae[K * 2 + 1], $[K], k, N, R), W[K * 2] = R[0], W[K * 2 + 1] = R[1];
    const ie = (K, le) => X?.eyesDrawn[le] ? 1 : K;
    for (const K of q) {
      const le = ie(K.eye === 0 ? k.eyeROpen : k.eyeLOpen, K.eye), fe = K.eye === 0 ? k.eyeSmile : k.eyeSmileL ?? k.eyeSmile;
      K.layer.alpha = y(K.part, le, fe);
      const ce = K.mesh.rest, xe = K.mesh.pos;
      for (let be = 0; be < K.W.length; be++) {
        const Me = ce[be * 2], ke = ce[be * 2 + 1];
        m(Me, w(K.e, K.part, Me, ke, le, fe), K.W[be], k, N, R), xe[be * 2] = R[0], xe[be * 2 + 1] = R[1];
      }
    }
    const de = X?.update(k, N, A, es(E.name, V.mode === "manual" ? null : V.expr));
    if (de) for (const K of q) de.eyes[K.eye] && (K.layer.alpha = 0);
    oe?.update(k, N, m, R);
    const ye = J.pos, Fe = J.rest, $e = h(k);
    for (let K = 0; K < B.length; K++)
      c(Fe[K * 2], Fe[K * 2 + 1], B[K], k, $e, R), ye[K * 2] = R[0], ye[K * 2 + 1] = R[1];
    H.chains.forEach((K, le) => Es(K, ee[le].mesh)), r.length && (L.step(k, A, N), L.deform());
    const ge = n.view.irisTravel ?? 7;
    D.draw({
      angleX: k.angleX,
      angleY: k.angleY,
      angleZ: k.angleZ,
      eyes: [
        ie(k.eyeROpen, 0),
        k.eyeSmile,
        k.gazeX * ge,
        -k.gazeY * ge * 0.6,
        ie(k.eyeLOpen, 1),
        k.eyeSmileL ?? k.eyeSmile,
        k.gazeX * ge * 0.85,
        -k.gazeY * ge * 0.6
      ],
      // with sprites the drawn mouths replace the shader-painted one
      mouthOpen: de?.mouthDrawn ? 0 : k.mouthOpen,
      mouthForm: k.mouthForm,
      cheek: k.blush,
      showMesh: !1,
      originalAlpha: 0,
      joints: []
    });
  }
  let _ = 0, U = performance.now(), G = !1;
  const Q = (A) => {
    const k = Math.min(0.05, (A - U) / 1e3);
    U = A, z(k), _ = requestAnimationFrame(Q);
  };
  return e.manual || (_ = requestAnimationFrame(Q)), {
    motions: [
      ...Object.entries(Yt).map(([A, k]) => ({ id: A, label: k.label, idle: !1 })),
      ...Object.entries(zt).map(([A, k]) => ({ id: A, label: k.label, idle: !0 }))
    ],
    setParameters(A, k = 1, N = {}) {
      ne = { ...A }, se = Math.min(1, Math.max(0, Number(k) || 0)), Z = Object.fromEntries(Object.entries(N ?? {}).map(([W, ae]) => [W, Math.min(1, Math.max(0, Number(ae) || 0))]));
    },
    getParameters() {
      return { ...M };
    },
    /** 0..1 loudness of the voice being played (e.g. normalised RMS). */
    setVoiceLevel(A) {
      V.setVoiceLevel(A);
    },
    /** Partial mouth-movement settings; omitted fields retain their current values. */
    setLipSync(A) {
      V.setLipSync(A);
    },
    /** true while TTS audio is playing: idle motions pause and the head nods along. */
    setSpeaking(A) {
      V.setSpeaking(A);
    },
    /** AITuber OnAir emotion tag: happy / sad / angry / surprised / relaxed / neutral (or null). */
    setEmotion(A, k) {
      V.setEmotion(A, k);
    },
    /** Live expression layered over tracking (see OVERLAY_EXPRESSIONS); 'neutral' clears it. */
    // parameters:false selects drawn expression sprites without changing numeric parameters.
    setExpression(A, { parameters: k = !0 } = {}) {
      E.set(A), S = k;
    },
    /** Show the named overlay layers (built/overlays/overlays.json) and hide the others. */
    setOverlays(A) {
      oe?.set(A);
    },
    getExpression() {
      return { name: E.name, active: E.active };
    },
    /** How much the head moves with the voice while speaking (1 = default, calmer below). */
    setTalkGain(A) {
      V.talkGain = Math.max(0, Number(A) || 0);
    },
    /** Play a motion or idle motion by id (see `motions`). */
    play(A) {
      V.hasMotion(A) && V.playMotion(A);
    },
    /** Move the mouth through the vowels of kana text (no audio; for previews). */
    speakKana(A, k) {
      V.speakKana(String(A ?? ""), k);
    },
    holdMouth(A) {
      V.holdMouth(A);
    },
    stopLipSync() {
      V.stopLipSync();
    },
    getLipSyncState() {
      return V.getLipSyncState();
    },
    setAutoIdle(A) {
      V.autoIdle = !!A;
    },
    setLighting(A) {
      D.setLighting(A);
    },
    getLightingStats() {
      return { ...D.lightingStats };
    },
    setAutoMotion(A) {
      V.autoMotion = !!A;
    },
    /** Hair / tassel sway multiplier (1 = default). */
    setSwayGain(A) {
      H.gain = A, L.gain = A;
    },
    setClothTuning(A, k) {
      L.setTuning(A, k);
    },
    /** Called with the motion id when a motion starts and with null when it ends. */
    onMotion(A) {
      return re.add(A), () => re.delete(A);
    },
    /** Advance the simulation by `sec` and draw (for tests / hidden tabs). */
    advance(A, k = 60) {
      if (!G)
        if (A === 0) z(0);
        else for (let N = 0; N < Math.round(A * k); N++) z(1 / k);
    },
    /** Update motion and lip sync without drawing a hidden preview. */
    advanceParameters(A) {
      G || j(A);
    },
    destroy() {
      G || (G = !0, cancelAnimationFrame(_), re.clear(), D.destroy());
    }
  };
}
const Ss = Object.keys(bt);
async function ks(t, e) {
  return Ts(t, { ...e, rig: Bt(e.rig) });
}
function lt(t) {
  if (!t || typeof t != "object" || Array.isArray(t))
    throw new Error("avatar.json: expected an object");
  const e = t, n = [];
  e.format !== "mesh-avatar" && n.push('avatar.json.format: expected "mesh-avatar"'), e.version !== 1 && n.push(`avatar.json.version: unsupported version ${JSON.stringify(e.version) ?? "missing"} (expected 1)`), (typeof e.name != "string" || !e.name.trim()) && n.push("avatar.json.name: expected a non-empty string");
  const s = { format: "mesh-avatar", version: 1, name: e.name };
  for (const a of ["author", "license", "thumbnail", "source"])
    e[a] !== void 0 && (typeof e[a] != "string" ? n.push(`avatar.json.${a}: expected a string`) : s[a] = e[a]);
  if (e.studio !== void 0) {
    const a = e.studio;
    !a || typeof a != "object" || Array.isArray(a) || !("version" in a) || typeof a.version != "string" || !a.version.trim() ? n.push("avatar.json.studio.version: expected a non-empty string") : s.studio = { version: a.version };
  }
  if (e.lipSync !== void 0)
    try {
      s.lipSync = Pt(e.lipSync);
    } catch (a) {
      n.push(`avatar.json.lipSync: ${a instanceof Error ? a.message : String(a)}`);
    }
  if (e.expressions !== void 0)
    try {
      s.expressions = Xt(e.expressions);
    } catch (a) {
      n.push(`avatar.json.expressions: ${a instanceof Error ? a.message : String(a)}`);
    }
  if (n.length) throw new Error(n.join(`
`));
  return s;
}
function Rs(t) {
  return lt({ format: "mesh-avatar", version: 1, name: t });
}
const dt = (t) => !!t && typeof t == "object" && !Array.isArray(t), Ne = (t, e) => Array.isArray(t) && t.length === e && t.every((n) => typeof n == "number" && Number.isFinite(n)), Rt = (t, e) => Object.hasOwn(t, e);
function Ls(t) {
  const e = [];
  function n(d, l = !0) {
    if (!Rt(t, d)) {
      l && e.push(`${d}: missing file`);
      return;
    }
    const p = t[d];
    if (!(p instanceof Uint8Array)) {
      e.push(`${d}: JSON bytes are required`);
      return;
    }
    let u;
    try {
      u = JSON.parse(new TextDecoder("utf-8", { fatal: !0 }).decode(p));
    } catch {
      e.push(`${d}: invalid UTF-8 JSON`);
      return;
    }
    if (!dt(u)) {
      e.push(`${d}: expected an object`);
      return;
    }
    return u;
  }
  function s(d, l, p = !0) {
    return d.version === 1 || p && d.version === void 0 ? !0 : (e.push(`${l}.version: unsupported version ${JSON.stringify(d.version) ?? "missing"} (expected 1)`), !1);
  }
  function a(d) {
    if (!Rt(t, d)) {
      e.push(`${d}: missing file`);
      return;
    }
    const l = t[d], p = l instanceof Uint8Array ? l.byteLength : l?.size;
    (!Number.isSafeInteger(p) || p <= 0) && e.push(`${d}: expected a non-empty file`);
  }
  function i(d, l, p, u) {
    if (!dt(d)) {
      e.push(`${l}.layers: expected a layer rectangle map`);
      return;
    }
    for (const [g, r] of Object.entries(d)) {
      const f = `${l}.layers.${g}`;
      if (!/^[A-Za-z0-9_-]+$/.test(g)) {
        e.push(`${f}: expected a safe layer name (letters, digits, hyphens or underscores)`);
        continue;
      }
      !Ne(r, 4) || !r.every(Number.isInteger) || r[0] < 0 || r[1] < 0 || r[2] <= 0 || r[3] <= 0 ? e.push(`${f}: expected [x, y, width, height] with non-negative integer origins and positive integer dimensions`) : u && (r[0] + r[2] > u[0] || r[1] + r[3] > u[1]) && e.push(`${f}: rectangle must stay inside the image`), a(`${p}/${g}.png`);
    }
    return d;
  }
  function o(d, l) {
    (typeof d.build != "string" || !d.build.trim()) && e.push(`${l}.build: expected a non-empty string`);
  }
  const m = n("avatar.json", !1);
  if (m)
    try {
      lt(m);
    } catch (d) {
      e.push(d.message);
    }
  const w = n("rig.json");
  let y;
  if (w && s(w, "rig.json", !1)) {
    const d = hn(w);
    e.push(...d.map((l) => `rig.json: ${l}`)), d.length || (y = w);
  }
  a("built/base.png"), a("built/hairmask.png"), y?.cloth?.length && a("built/base_cloth.png");
  const v = n("built/layers.json");
  if (v && s(v, "built/layers.json")) {
    o(v, "built/layers.json");
    let d;
    !Ne(v.size, 2) || !v.size.every((p) => Number.isInteger(p) && p > 0) ? e.push("built/layers.json.size: expected [width, height] with positive integer dimensions") : (d = v.size, y && (d[0] !== y.image.width || d[1] !== y.image.height) && e.push("built/layers.json.size: must match rig.json.image"));
    const l = i(v.layers, "built/layers.json", "built", d);
    if (y && l) {
      const p = [
        ...y.eyes.flatMap((u, g) => ["ball", "low", "crease", "lash"].map((r) => `eye${g}_${r}`)),
        ...y.hand ? ["hand"] : [],
        ...(y.accessories ?? []).map((u) => u.name),
        ...(y.cloth ?? []).map((u) => `cloth_${u.name}`)
      ];
      for (const u of p) Rt(l, u) || e.push(`built/layers.json.layers.${u}: missing required layer`);
    }
    !Array.isArray(v.eyes) || v.eyes.length !== 2 ? e.push("built/layers.json.eyes: expected two eye curves") : v.eyes.forEach((p, u) => {
      const g = `built/layers.json.eyes[${u}]`;
      if (!dt(p)) {
        e.push(`${g}: expected an object`);
        return;
      }
      Ne([p.x0, p.x1], 2) && p.x0 < p.x1 || e.push(`${g}: expected finite x0 < x1`);
      for (const r of ["top", "bot"])
        Ne(p[r], 24) || e.push(`${g}.${r}: expected 24 finite numbers`);
      if (Ne(p.top, 24) && Ne(p.bot, 24) && p.top.some((r, f) => r > p.bot[f]) && e.push(`${g}.top: must not exceed bottom curve`), y) for (const r of ["x0", "x1", "top", "bot"]) {
        const f = p[r], x = y.eyes[u][r];
        (Array.isArray(x) ? Ne(f, x.length) && f.every((b, T) => b === x[T]) : f === x) || e.push(`${g}.${r}: must match rig.json.eyes[${u}].${r}`);
      }
    });
  }
  const h = n("built/sprites/sprites.json", !1);
  h && s(h, "built/sprites/sprites.json") && (o(h, "built/sprites/sprites.json"), i(h.layers, "built/sprites/sprites.json", "built/sprites", y ? [y.image.width, y.image.height] : void 0));
  const c = n("built/overlays/overlays.json", !1);
  if (c && s(c, "built/overlays/overlays.json"))
    if (!Array.isArray(c.overlays)) e.push("built/overlays/overlays.json.overlays: expected an array");
    else {
      const d = /* @__PURE__ */ new Set();
      for (const [l, p] of c.overlays.entries()) {
        const u = `built/overlays/overlays.json.overlays[${l}]`;
        if (!dt(p) || typeof p.name != "string" || !/^[A-Za-z0-9_-]+$/.test(p.name) || typeof p.file != "string" || !/^[A-Za-z0-9_-]+\.png$/.test(p.file)) {
          e.push(`${u}: expected { name, file } with safe names`);
          continue;
        }
        d.has(p.name) && e.push(`${u}.name: duplicate overlay name`), d.add(p.name), a(`built/overlays/${p.file}`);
      }
    }
  return e;
}
var Se = Uint8Array, He = Uint16Array, Os = Int32Array, gn = new Se([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]), yn = new Se([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]), Fs = new Se([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]), bn = function(t, e) {
  for (var n = new He(31), s = 0; s < 31; ++s)
    n[s] = e += 1 << t[s - 1];
  for (var a = new Os(n[30]), s = 1; s < 30; ++s)
    for (var i = n[s]; i < n[s + 1]; ++i)
      a[i] = i - n[s] << 5 | s;
  return { b: n, r: a };
}, vn = bn(gn, 2), wn = vn.b, _s = vn.r;
wn[28] = 258, _s[258] = 28;
var js = bn(yn, 0), Us = js.b, Ut = new He(32768);
for (var me = 0; me < 32768; ++me) {
  var Ie = (me & 43690) >> 1 | (me & 21845) << 1;
  Ie = (Ie & 52428) >> 2 | (Ie & 13107) << 2, Ie = (Ie & 61680) >> 4 | (Ie & 3855) << 4, Ut[me] = ((Ie & 65280) >> 8 | (Ie & 255) << 8) >> 1;
}
var it = (function(t, e, n) {
  for (var s = t.length, a = 0, i = new He(e); a < s; ++a)
    t[a] && ++i[t[a] - 1];
  var o = new He(e);
  for (a = 1; a < e; ++a)
    o[a] = o[a - 1] + i[a - 1] << 1;
  var m;
  if (n) {
    m = new He(1 << e);
    var w = 15 - e;
    for (a = 0; a < s; ++a)
      if (t[a])
        for (var y = a << 4 | t[a], v = e - t[a], h = o[t[a] - 1]++ << v, c = h | (1 << v) - 1; h <= c; ++h)
          m[Ut[h] >> w] = y;
  } else
    for (m = new He(s), a = 0; a < s; ++a)
      t[a] && (m[a] = Ut[o[t[a] - 1]++] >> 15 - t[a]);
  return m;
}), ht = new Se(288);
for (var me = 0; me < 144; ++me)
  ht[me] = 8;
for (var me = 144; me < 256; ++me)
  ht[me] = 9;
for (var me = 256; me < 280; ++me)
  ht[me] = 7;
for (var me = 280; me < 288; ++me)
  ht[me] = 8;
var xn = new Se(32);
for (var me = 0; me < 32; ++me)
  xn[me] = 5;
var $s = /* @__PURE__ */ it(ht, 9, 1), Bs = /* @__PURE__ */ it(xn, 5, 1), Lt = function(t) {
  for (var e = t[0], n = 1; n < t.length; ++n)
    t[n] > e && (e = t[n]);
  return e;
}, Oe = function(t, e, n) {
  var s = e / 8 | 0;
  return (t[s] | t[s + 1] << 8) >> (e & 7) & n;
}, Ot = function(t, e) {
  var n = e / 8 | 0;
  return (t[n] | t[n + 1] << 8 | t[n + 2] << 16) >> (e & 7);
}, Ps = function(t) {
  return (t + 7) / 8 | 0;
}, It = function(t, e, n) {
  return (e == null || e < 0) && (e = 0), (n == null || n > t.length) && (n = t.length), new Se(t.subarray(e, n));
}, Ys = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
], Te = function(t, e, n) {
  var s = new Error(e || Ys[t]);
  if (s.code = t, Error.captureStackTrace && Error.captureStackTrace(s, Te), !n)
    throw s;
  return s;
}, zs = function(t, e, n, s) {
  var a = t.length, i = s ? s.length : 0;
  if (!a || e.f && !e.l)
    return n || new Se(0);
  var o = !n, m = o || e.i != 2, w = e.i;
  o && (n = new Se(a * 3));
  var y = function(S) {
    var R = n.length;
    if (S > R) {
      var j = new Se(Math.max(R * 2, S));
      j.set(n), n = j;
    }
  }, v = e.f || 0, h = e.p || 0, c = e.b || 0, d = e.l, l = e.d, p = e.m, u = e.n, g = a * 8;
  do {
    if (!d) {
      v = Oe(t, h, 1);
      var r = Oe(t, h + 1, 3);
      if (h += 3, r)
        if (r == 1)
          d = $s, l = Bs, p = 9, u = 5;
        else if (r == 2) {
          var f = Oe(t, h, 31) + 257, x = Oe(t, h + 10, 15) + 4, b = f + Oe(t, h + 5, 31) + 1;
          h += 14;
          for (var T = new Se(b), F = new Se(19), P = 0; P < x; ++P)
            F[Fs[P]] = Oe(t, h + P * 3, 7);
          h += x * 3;
          for (var te = Lt(F), I = (1 << te) - 1, D = it(F, te, 1), P = 0; P < b; ) {
            var O = D[Oe(t, h, I)];
            h += O & 15;
            var L = O >> 4;
            if (L < 16)
              T[P++] = L;
            else {
              var C = 0, Y = 0;
              for (L == 16 ? (Y = 3 + Oe(t, h, 3), h += 2, C = T[P - 1]) : L == 17 ? (Y = 3 + Oe(t, h, 7), h += 3) : L == 18 && (Y = 11 + Oe(t, h, 127), h += 7); Y--; )
                T[P++] = C;
            }
          }
          var $ = T.subarray(0, f), q = T.subarray(f);
          p = Lt($), u = Lt(q), d = it($, p, 1), l = it(q, u, 1);
        } else
          Te(1);
      else {
        var L = Ps(h) + 4, X = t[L - 4] | t[L - 3] << 8, oe = L + X;
        if (oe > a) {
          w && Te(0);
          break;
        }
        m && y(c + X), n.set(t.subarray(L, oe), c), e.b = c += X, e.p = h = oe * 8, e.f = v;
        continue;
      }
      if (h > g) {
        w && Te(0);
        break;
      }
    }
    m && y(c + 131072);
    for (var ee = (1 << p) - 1, J = (1 << u) - 1, B = h; ; B = h) {
      var C = d[Ot(t, h) & ee], H = C >> 4;
      if (h += C & 15, h > g) {
        w && Te(0);
        break;
      }
      if (C || Te(2), H < 256)
        n[c++] = H;
      else if (H == 256) {
        B = h, d = null;
        break;
      } else {
        var V = H - 254;
        if (H > 264) {
          var P = H - 257, re = gn[P];
          V = Oe(t, h, (1 << re) - 1) + wn[P], h += re;
        }
        var ne = l[Ot(t, h) & J], se = ne >> 4;
        ne || Te(3), h += ne & 15;
        var q = Us[se];
        if (se > 3) {
          var re = yn[se];
          q += Ot(t, h) & (1 << re) - 1, h += re;
        }
        if (h > g) {
          w && Te(0);
          break;
        }
        m && y(c + 131072);
        var Z = c + V;
        if (c < q) {
          var M = i - q, E = Math.min(q, Z);
          for (M + c < 0 && Te(3); c < E; ++c)
            n[c] = s[M + c];
        }
        for (; c < Z; ++c)
          n[c] = n[c - q];
      }
    }
    e.l = d, e.p = B, e.b = c, e.f = v, d && (v = 1, e.m = p, e.d = l, e.n = u);
  } while (!v);
  return c != n.length && o ? It(n, 0, c) : n.subarray(0, c);
}, Xs = /* @__PURE__ */ new Se(0), Ue = function(t, e) {
  return t[e] | t[e + 1] << 8;
}, Le = function(t, e) {
  return (t[e] | t[e + 1] << 8 | t[e + 2] << 16 | t[e + 3] << 24) >>> 0;
}, Ft = function(t, e) {
  return Le(t, e) + Le(t, e + 4) * 4294967296;
};
function Is(t, e) {
  return zs(t, { i: 2 }, e && e.out, e && e.dictionary);
}
var $t = typeof TextDecoder < "u" && /* @__PURE__ */ new TextDecoder(), Cs = 0;
try {
  $t.decode(Xs, { stream: !0 }), Cs = 1;
} catch {
}
var Ns = function(t) {
  for (var e = "", n = 0; ; ) {
    var s = t[n++], a = (s > 127) + (s > 223) + (s > 239);
    if (n + a > t.length)
      return { s: e, r: It(t, n - 1) };
    a ? a == 3 ? (s = ((s & 15) << 18 | (t[n++] & 63) << 12 | (t[n++] & 63) << 6 | t[n++] & 63) - 65536, e += String.fromCharCode(55296 | s >> 10, 56320 | s & 1023)) : a & 1 ? e += String.fromCharCode((s & 31) << 6 | t[n++] & 63) : e += String.fromCharCode((s & 15) << 12 | (t[n++] & 63) << 6 | t[n++] & 63) : e += String.fromCharCode(s);
  }
};
function Ds(t, e) {
  if (e) {
    for (var n = "", s = 0; s < t.length; s += 16384)
      n += String.fromCharCode.apply(null, t.subarray(s, s + 16384));
    return n;
  } else {
    if ($t)
      return $t.decode(t);
    var a = Ns(t), i = a.s, n = a.r;
    return n.length && Te(8), i;
  }
}
var Zs = function(t, e) {
  return e + 30 + Ue(t, e + 26) + Ue(t, e + 28);
}, Ws = function(t, e, n) {
  var s = Ue(t, e + 28), a = Ue(t, e + 30), i = Ds(t.subarray(e + 46, e + 46 + s), !(Ue(t, e + 8) & 2048)), o = e + 46 + s, m = qs(t, o, a, n, Le(t, e + 20), Le(t, e + 24), Le(t, e + 42)), w = m[0], y = m[1], v = m[2];
  return [Ue(t, e + 10), w, y, i, o + a + Ue(t, e + 32), v];
}, qs = function(t, e, n, s, a, i, o) {
  var m = a == 4294967295, w = i == 4294967295, y = o == 4294967295, v = e + n, h = m + w + y;
  if (s && h) {
    for (; e + 4 < v; e += 4 + Ue(t, e + 2))
      if (Ue(t, e) == 1)
        return [
          m ? Ft(t, e + 4 + 8 * w) : a,
          w ? Ft(t, e + 4) : i,
          y ? Ft(t, e + 4 + 8 * (w + m)) : o,
          1
        ];
    s < 2 && Te(13);
  }
  return [a, i, o, 0];
};
function Gs(t, e) {
  for (var n = {}, s = t.length - 22; Le(t, s) != 101010256; --s)
    (!s || t.length - s > 65558) && Te(13);
  var a = Ue(t, s + 8);
  if (!a)
    return {};
  var i = Le(t, s + 16), o = Le(t, s - 20) == 117853008;
  if (o) {
    var m = Le(t, s - 12);
    o = Le(t, m) == 101075792, o && (a = Le(t, m + 32), i = Le(t, m + 48));
  }
  for (var w = e && e.filter, y = 0; y < a; ++y) {
    var v = Ws(t, i, o), h = v[0], c = v[1], d = v[2], l = v[3], p = v[4], u = v[5], g = Zs(t, u);
    i = p, (!w || w({
      name: l,
      size: c,
      originalSize: d,
      compression: h
    })) && (h ? h == 8 ? n[l] = Is(t.subarray(g, g + c), { out: new Se(d) }) : Te(14, "unknown compression type " + h) : n[l] = It(t, g, g + c));
  }
  return n;
}
const sn = 200, an = 64 * 1024 * 1024, rn = new TextDecoder("utf-8", { fatal: !0 });
function Mn(t) {
  if (!t || t.startsWith("/") || /^[A-Za-z]:/.test(t) || t.includes("\\") || t.includes("\0") || t.split("/").includes(".."))
    throw new Error(`ZIP entry ${JSON.stringify(t)}: path must be relative, without .. or backslashes`);
}
function Hs(t) {
  const e = new DataView(t.buffer, t.byteOffset, t.byteLength), n = (c = "(archive)") => {
    throw new Error(`ZIP entry ${JSON.stringify(c)}: invalid or truncated ZIP`);
  }, s = (c) => c >= 0 && c + 2 <= t.length ? e.getUint16(c, !0) : n(), a = (c) => c >= 0 && c + 4 <= t.length ? e.getUint32(c, !0) : n();
  let i = t.length - 22;
  for (; i >= Math.max(0, t.length - 65557) && !(a(i) === 101010256 && i + 22 + s(i + 20) === t.length); i--)
    ;
  (i < 0 || i < t.length - 65557) && n(), (s(i + 4) || s(i + 6) || s(i + 8) !== s(i + 10)) && n();
  const o = s(i + 10), m = a(i + 16), w = m + a(i + 12);
  w !== i && n();
  const y = [], v = /* @__PURE__ */ new Set();
  let h = m;
  for (let c = 0; c < o; c++) {
    (h + 46 > w || a(h) !== 33639248) && n();
    const d = s(h + 28), l = h + 46 + d + s(h + 30) + s(h + 32);
    l > w && n();
    let p;
    try {
      p = rn.decode(t.subarray(h + 46, h + 46 + d));
    } catch {
      throw new Error("ZIP entry (invalid UTF-8 name): invalid filename");
    }
    if (Mn(p), c >= sn) throw new Error(`ZIP entry ${JSON.stringify(p)}: more than ${sn} entries`);
    if (v.has(p)) throw new Error(`ZIP entry ${JSON.stringify(p)}: duplicate entry`);
    v.add(p);
    const u = a(h + 24), g = a(h + 20), r = a(h + 42);
    if (u > an || g > an) throw new Error(`ZIP entry ${JSON.stringify(p)}: exceeds 64 MB`);
    if (s(h + 10) !== 0) throw new Error(`ZIP entry ${JSON.stringify(p)}: expected stored compression (method 0)`);
    if (s(h + 8) & 1) throw new Error(`ZIP entry ${JSON.stringify(p)}: encrypted entries are not supported`);
    (g !== u || r + 30 > m || a(r) !== 67324752) && n(p);
    const f = r + 30 + s(r + 26) + s(r + 28);
    (f + u > m || s(r + 8) !== 0 || s(r + 6) !== s(h + 8)) && n(p);
    let x;
    try {
      x = rn.decode(t.subarray(r + 30, r + 30 + s(r + 26)));
    } catch {
      n(p);
    }
    x !== p && n(p), y.push({ name: p, offset: r, start: f, size: u, central: h }), h = l;
  }
  return h !== w && n(), { files: y };
}
function Vs(t) {
  const e = t instanceof Uint8Array ? t : new Uint8Array(t), n = Hs(e), s = Gs(e, { filter: (i) => i.name !== "__proto__" }), a = /* @__PURE__ */ Object.create(null);
  for (const i of n.files) {
    const o = i.name === "__proto__" ? e.slice(i.start, i.start + i.size) : s[i.name];
    if (!(o instanceof Uint8Array) || o.length !== i.size) throw new Error(`ZIP entry ${JSON.stringify(i.name)}: invalid size`);
    a[i.name] = o;
  }
  return a;
}
const Js = (t) => JSON.parse(new TextDecoder("utf-8", { fatal: !0 }).decode(t));
function Ge(t, e) {
  try {
    return Js(t);
  } catch {
    throw new Error(`${e}: invalid UTF-8 JSON`);
  }
}
function An(t, e, n, s) {
  return [
    "layers.json",
    "base.png",
    "hairmask.png",
    ...s?.cloth?.length ? ["base_cloth.png"] : [],
    ...Object.keys(t?.layers ?? {}).map((a) => `${a}.png`),
    ...e ? ["sprites/sprites.json", ...Object.keys(e.layers ?? {}).map((a) => `sprites/${a}.png`)] : [],
    // malformed entries are left to validateAvatarFiles, which reports them
    ...n ? ["overlays/overlays.json", ...(Array.isArray(n.overlays) ? n.overlays : []).flatMap((a) => typeof a?.file == "string" ? [`overlays/${a.file}`] : [])] : []
  ];
}
function En(t) {
  const e = Ls(t);
  if (e.length) throw new Error(e.join(`
`));
}
function Tn(t) {
  return !!t && typeof t == "object" && "manifest" in t && "rig" in t && "assets" in t && "release" in t;
}
function _t(t) {
  const e = Vs(t);
  if (!Object.hasOwn(e, "avatar.json")) throw new Error("avatar.json: missing file in .mavatar archive");
  En(e);
  const n = lt(Ge(e["avatar.json"], "avatar.json")), s = Bt(Ge(e["rig.json"], "rig.json")), a = e["built/overlays/overlays.json"] ? Ge(e["built/overlays/overlays.json"], "built/overlays/overlays.json") : void 0, i = An(
    Ge(e["built/layers.json"], "built/layers.json"),
    e["built/sprites/sprites.json"] ? Ge(e["built/sprites/sprites.json"], "built/sprites/sprites.json") : void 0,
    a,
    s
  ), o = {}, m = [], w = () => {
    m.splice(0).forEach((y) => URL.revokeObjectURL(y));
  };
  try {
    for (const y of new Set(i)) {
      const v = URL.createObjectURL(new Blob([new Uint8Array(e[`built/${y}`])], { type: y.endsWith(".json") ? "application/json" : "image/png" }));
      m.push(v), o[y] = v;
    }
  } catch (y) {
    throw w(), y;
  }
  return { manifest: n, rig: s, assets: o, release: w };
}
async function Ks(t, e = {}) {
  if (Tn(t)) return t;
  if (t instanceof Blob) return _t(await t.arrayBuffer());
  if (t instanceof ArrayBuffer || t instanceof Uint8Array) return _t(t);
  const n = new URL(t, typeof location > "u" ? void 0 : location.href);
  if (/\.mavatar$/i.test(n.pathname)) {
    const u = await fetch(n);
    if (!u.ok) throw new Error(`.mavatar: could not load (${u.status})`);
    return _t(await u.arrayBuffer());
  }
  n.pathname.endsWith("/") || (n.pathname += "/");
  const s = (u) => {
    const g = new URL(n);
    return g.pathname += u.split("/").map(encodeURIComponent).join("/"), e.version !== void 0 && g.searchParams.set("v", String(e.version)), g.href;
  }, a = {};
  async function i(u, g = !1) {
    const r = await fetch(s(u));
    if (g && (r.status === 404 || r.ok && r.headers.get("content-type")?.includes("text/html"))) return;
    if (!r.ok) throw new Error(`${u}: could not load (${r.status})`);
    const f = new Uint8Array(await r.arrayBuffer());
    return a[u] = f, Ge(f, u);
  }
  const o = e.rigFile ?? "rig.json";
  Mn(o);
  const [m, w, y, v, h] = await Promise.all([
    i(o),
    i("built/layers.json"),
    i("avatar.json", !0),
    i("built/sprites/sprites.json", !0),
    i("built/overlays/overlays.json", !0)
  ]);
  Array.isArray(m?.eyes) && Array.isArray(w?.eyes) && (m.eyes = m.eyes.map((u, g) => {
    if (!u || typeof u != "object") return u;
    const r = { ...u };
    for (const f of ["x0", "x1", "top", "bot"]) r[f] === void 0 && (r[f] = w.eyes[g]?.[f]);
    return r;
  })), a["rig.json"] = new TextEncoder().encode(JSON.stringify(m));
  const c = An(w, v, h, m);
  for (const u of c) u.endsWith(".png") && (a[`built/${u}`] = { size: 1 });
  En(a);
  const d = Bt(m), l = Object.fromEntries(c.map((u) => [u, s(`built/${u}`)])), p = decodeURIComponent(n.pathname.split("/").filter(Boolean).at(-1) ?? "Avatar");
  return { manifest: y === void 0 ? Rs(p) : lt(y), rig: d, assets: l, release() {
  } };
}
async function Qs(t, e, n = {}) {
  const s = !Tn(e), a = await Ks(e);
  try {
    const i = n.lipSync === void 0 ? a.manifest.lipSync : { ...a.manifest.lipSync, ...Pt(n.lipSync) }, o = n.expressions === void 0 ? a.manifest.expressions : Ms(a.manifest.expressions, Xt(n.expressions)), m = await ks(t, {
      ...n,
      ...i === void 0 ? {} : { lipSync: i },
      ...o === void 0 ? {} : { expressions: o },
      rig: a.rig,
      assets: a.assets
    }), w = m.destroy.bind(m);
    let y = !1;
    return Object.assign(m, { package: a, destroy() {
      if (!y) {
        y = !0;
        try {
          w();
        } finally {
          s && a.release();
        }
      }
    } });
  } catch (i) {
    throw s && a.release(), i;
  }
}
const ea = "https://shinshin86.github.io/mesh-avatar-studio/miko.mavatar", ta = ["happy", "sad", "angry", "surprised", "relaxed", "neutral"];
function na(t) {
  return t === null || t === "" ? "neutral" : Ss.includes(t) ? t : void 0;
}
function sa(t) {
  return t === null || t === "" ? null : ta.includes(t) ? t : void 0;
}
function on(t) {
  return t === null || t === "" ? "contain" : t === "contain" || t === "cover" ? t : void 0;
}
function aa(t) {
  return t ? t.split(/\s+/).filter(Boolean) : [];
}
function ra(t, e) {
  return Math.min(0.05, Math.max(1e-3, (t - e) / 1e3));
}
class oa {
  promise;
  #n;
  #e;
  #t = !0;
  /** Call when a load starts. */
  start() {
    this.#t && (this.#t = !1, this.promise = new Promise((e, n) => {
      this.#n = e, this.#e = n;
    }), this.promise.catch(() => {
    }));
  }
  resolve(e) {
    this.#t || (this.#t = !0, this.#n(e));
  }
  reject(e) {
    this.#t || (this.#t = !0, this.#e(e));
  }
}
const ia = `
:host { display: block; position: relative; aspect-ratio: 1 / 1; }
:host([hidden]) { display: none; }
canvas { display: block; width: 100%; height: 100%; }
`, la = typeof HTMLElement > "u" ? class {
} : HTMLElement;
class ha extends la {
  static observedAttributes = ["src", "fit", "expression", "emotion", "paused", "no-idle", "label", "overlays"];
  #n;
  #e = null;
  #t = new oa();
  #i = 0;
  #a = !1;
  #r = null;
  #u;
  #o = 0;
  #c = 0;
  #g = !0;
  #m = null;
  #p = null;
  #l = {};
  #y = /* @__PURE__ */ new Set();
  constructor() {
    super();
    const e = this.attachShadow({ mode: "open" }), n = document.createElement("style");
    n.textContent = ia, this.#n = document.createElement("canvas"), this.#n.setAttribute("role", "img"), this.#n.setAttribute("aria-label", "Avatar"), e.append(n, this.#n), this.#t.start(), this.#n.addEventListener("webglcontextlost", (s) => {
      s.preventDefault(), this.#h();
    }), this.#n.addEventListener("webglcontextrestored", () => this.#f());
  }
  /** The loaded runtime avatar, or null while loading. Every `mesh-avatar` method is available on it. */
  get avatar() {
    return this.#e;
  }
  /** Resolves with the avatar once the current source has loaded. */
  get ready() {
    return this.#t.promise;
  }
  /** Loads a file, archive or URL without changing `src`. A changed `src` replaces this source. */
  load(e) {
    return this.#r = null, this.#u = e, this.#f(), this.ready;
  }
  get src() {
    return this.getAttribute("src") ?? "";
  }
  set src(e) {
    this.setAttribute("src", e);
  }
  get fit() {
    return on(this.getAttribute("fit")) ?? "contain";
  }
  set fit(e) {
    this.setAttribute("fit", e);
  }
  get expression() {
    return this.getAttribute("expression") ?? "neutral";
  }
  set expression(e) {
    this.setAttribute("expression", e);
  }
  get emotion() {
    return this.getAttribute("emotion");
  }
  set emotion(e) {
    e === null ? this.removeAttribute("emotion") : this.setAttribute("emotion", e);
  }
  get paused() {
    return this.hasAttribute("paused");
  }
  set paused(e) {
    this.toggleAttribute("paused", e);
  }
  /** Overlay layers to show, such as glasses (the avatar's built/overlays). Kept across loads. */
  get overlays() {
    return aa(this.getAttribute("overlays"));
  }
  set overlays(e) {
    e.length ? this.setAttribute("overlays", e.join(" ")) : this.removeAttribute("overlays");
  }
  /** Mouth opening from the voice loudness, 0 to 1. Kept until the avatar loads. */
  setVoiceLevel(e) {
    this.#p = e, this.#e?.setVoiceLevel(e);
  }
  /** Explicit mouth-movement overrides, retained across loads. Assignment is a partial update. */
  get lipSync() {
    return { ...this.#l };
  }
  set lipSync(e) {
    this.setLipSync(e);
  }
  /** Partial overrides of the avatar's saved mouth-movement settings, retained across loads. */
  setLipSync(e) {
    const n = lt({ format: "mesh-avatar", version: 1, name: "Avatar", lipSync: e }).lipSync;
    this.#e?.setLipSync(n), this.#l = { ...this.#l, ...n };
  }
  /** Moves the mouth to Japanese text without audio. Waits for the avatar to load. */
  async speak(e, n) {
    (await this.ready).speakKana(e, n);
  }
  /** Plays a motion by id (see `avatar.motions`). Waits for the avatar to load. */
  async play(e) {
    (await this.ready).play(e);
  }
  connectedCallback() {
    this.#m ??= new IntersectionObserver((e) => {
      this.#g = e.at(-1)?.isIntersecting ?? !0, this.#s();
    }), this.#m.observe(this), document.addEventListener("visibilitychange", this.#s), !this.#e && !this.#a ? this.#v() : this.#s();
  }
  disconnectedCallback() {
    this.#m?.disconnect(), document.removeEventListener("visibilitychange", this.#s), this.#h(), queueMicrotask(() => {
      this.isConnected || this.#w();
    });
  }
  attributeChangedCallback(e, n, s) {
    n !== s && (e === "src" || e === "fit" ? (e === "src" && (this.#u = void 0), e === "fit" && on(s) === void 0 && this.#d(e, s), this.isConnected && this.#v()) : e === "label" ? this.#n.setAttribute("aria-label", s || "Avatar") : e === "paused" ? this.#s() : this.#e && this.#b(this.#e, e));
  }
  #b(e, n) {
    if (n === "expression") {
      const s = na(this.getAttribute("expression"));
      s ? e.setExpression(s) : this.#d(n, this.getAttribute(n));
    } else if (n === "emotion") {
      const s = sa(this.getAttribute("emotion"));
      s !== void 0 ? e.setEmotion(s) : this.#d(n, this.getAttribute(n));
    } else n === "no-idle" ? e.setAutoIdle(!this.hasAttribute("no-idle")) : n === "overlays" && e.setOverlays(this.overlays);
  }
  #v() {
    if (this.#t.start(), this.#r) return;
    const e = this.#r = {};
    queueMicrotask(() => {
      this.#r === e && (this.#r = null, this.isConnected && this.#f());
    });
  }
  async #f(e = this.#u ?? (this.getAttribute("src") || ea)) {
    const n = ++this.#i;
    this.#w(!1), this.#a = !0, this.#t.start();
    try {
      const s = await Qs(this.#n, e, { manual: !0, fit: this.fit });
      if (n !== this.#i) {
        s.destroy();
        return;
      }
      this.#a = !1, this.#e = s;
      for (const a of ["expression", "emotion", "no-idle", "overlays"])
        (a !== "emotion" || this.hasAttribute(a)) && this.#b(s, a);
      this.#p !== null && s.setVoiceLevel(this.#p), s.setLipSync(this.#l), matchMedia("(prefers-reduced-motion: reduce)").matches && s.setSwayGain(0.5), s.onMotion((a) => this.dispatchEvent(new CustomEvent("motion", { detail: { id: a } }))), s.advance(0), this.#t.resolve(s), this.dispatchEvent(new CustomEvent("load", { detail: { avatar: s } })), this.#s();
    } catch (s) {
      if (n !== this.#i) return;
      this.#a = !1, this.#t.reject(s), this.dispatchEvent(new CustomEvent("error", { detail: { error: s } }));
    }
  }
  /** Destroys the avatar. Without `cancel = false` it also abandons a load in progress. */
  #w(e = !0) {
    e && (this.#i++, this.#a = !1), this.#h(), this.#e?.destroy(), this.#e = null;
  }
  #s = () => {
    const e = this.#e && this.isConnected && this.#g && !document.hidden && !this.paused;
    e && !this.#o ? (this.#c = performance.now(), this.#o = requestAnimationFrame(this.#x)) : e || this.#h();
  };
  #x = (e) => {
    const n = ra(e, this.#c);
    this.#c = e, this.#e?.advance(n, 1 / n), this.#o = requestAnimationFrame(this.#x);
  };
  #h() {
    cancelAnimationFrame(this.#o), this.#o = 0;
  }
  #d(e, n) {
    const s = `${e}=${n}`;
    this.#y.has(s) || (this.#y.add(s), console.warn(`<mesh-avatar> ignores ${e}="${n}".`));
  }
}
typeof customElements < "u" && !customElements.get("mesh-avatar") && customElements.define("mesh-avatar", ha);
