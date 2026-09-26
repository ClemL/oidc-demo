// Core drawing kit for the SSO film: seeded randomness, easing, hand-drawn
// ("boiling") strokes, torn-paper cutouts, handwriting and ransom-note text.
// Every function is a pure function of its inputs + state.boil, so any frame
// can be rendered at any time (scrubbing works without accumulated state).

export const W = 1600;
export const H = 900;
export const TAU = Math.PI * 2;

export const state = {
  boil: 0, // changes ~8x per second → lines "boil" like hand-drawn animation
  reduced: false, // prefers-reduced-motion
  paper: null, // CanvasPattern for paper fibre texture
  grain: null, // canvas with film grain
  kraft: null, // pre-rendered background
};

export const PAL = {
  ink: "#2b2a33",
  inkSoft: "#4a4756",
  paper: "#fbf6ea",
  cream: "#f3e9d2",
  kraft: "#d9c19b",
  red: "#e2553f",
  coral: "#f07a5f",
  mustard: "#f2b134",
  yellow: "#f7d95c",
  teal: "#2a9d8f",
  aircall: "#1fb58f",
  lattice: "#7a6cf5",
  sky: "#8fc4e3",
  sea: "#6fb1d6",
  seaDeep: "#4f93bf",
  navy: "#27406f",
  pink: "#f4a7b9",
  mint: "#a8dcc0",
  grass: "#8cc47a",
  grassDark: "#5f9e57",
  sand: "#eed7a1",
  skin: "#f0c7a2",
  skin2: "#c98f63",
  lilac: "#b9b2d9",
  grey: "#9aa0a6",
  white: "#ffffff",
};

// ---------- randomness ----------
export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(s) {
  let h = 2166136261;
  const str = String(s);
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---------- math / easing ----------
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const E = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  outBack: (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

/** Progress of t through [a, b], eased. */
export const seg = (t, a, b, ease = E.inOut) => ease(clamp((t - a) / (b - a)));
/** 0→1 in, hold, 1→0 out. */
export const pulse = (t, a, b, fade = 0.4) => Math.min(seg(t, a, a + fade, E.out), 1 - seg(t, b - fade, b, E.in));

export function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}
export function bezAngle(p0, p1, p2, p3, t) {
  const a = bez(p0, p1, p2, p3, Math.max(0, t - 0.01));
  const b = bez(p0, p1, p2, p3, Math.min(1, t + 0.01));
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

/** Small per-object stop-motion jitter that changes with the boil frame. */
export function jitter(id, amt = 1) {
  if (state.reduced) return [0, 0, 0];
  const r = rng(hash(id) + state.boil * 131);
  return [(r() - 0.5) * 1.6 * amt, (r() - 0.5) * 1.6 * amt, (r() - 0.5) * 0.008 * amt];
}

// ---------- point sampling ----------
export function linePts(x1, y1, x2, y2, step = 9) {
  const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / step));
  const out = [];
  for (let i = 0; i <= n; i++) out.push([lerp(x1, x2, i / n), lerp(y1, y2, i / n)]);
  return out;
}

export function polyPts(points, closed = false, step = 9) {
  const out = [];
  const pts = closed ? [...points, points[0]] : points;
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = linePts(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], step);
    if (i) seg.shift();
    out.push(...seg);
  }
  return out;
}

export function ellipsePts(cx, cy, rx, ry, a0 = 0, a1 = TAU, step = 8) {
  const len = Math.abs(a1 - a0) * Math.max(rx, ry);
  const n = Math.max(8, Math.ceil(len / step));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = lerp(a0, a1, i / n);
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

export function bezPts(p0, p1, p2, p3, n = 40) {
  const out = [];
  for (let i = 0; i <= n; i++) out.push(bez(p0, p1, p2, p3, i / n));
  return out;
}

export function roundRectPts(x, y, w, h, r = 12) {
  r = Math.min(r, w / 2, h / 2);
  const pts = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= 5; i++) {
      const a = a0 + (i / 5) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return pts;
}

export function blobPts(cx, cy, rx, ry, seed, lumps = 7, n = 64) {
  const r = rng(seed);
  const amps = Array.from({ length: lumps }, () => [r() * 0.14, r() * TAU]);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    let k = 1;
    amps.forEach(([amp, ph], j) => (k += amp * Math.sin(a * (j + 1) + ph) * (j < 3 ? 1 : 0.4)));
    out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return out;
}

// ---------- hand-drawn strokes ----------
/**
 * Draws a sketchy line through `pts`. Two passes with smooth, low-frequency
 * wobble; the wobble re-seeds every boil frame so the line gently "boils".
 */
export function sketch(ctx, pts, o = {}) {
  const {
    color = PAL.ink,
    width = 3,
    rough = 1.6,
    passes = 2,
    progress = 1,
    alpha = 1,
    seed = hash(pts.length + ":" + Math.round(pts[0][0]) + ":" + Math.round(pts[0][1])),
    boil = true,
    dash = null,
  } = o;
  if (progress <= 0 || alpha <= 0) return;
  const n = pts.length;
  const exact = (n - 1) * clamp(progress);
  const last = Math.floor(exact);
  const frac = exact - last;
  const base = ctx.globalAlpha;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  if (dash) ctx.setLineDash(dash);
  const b = boil && !state.reduced ? state.boil : 0;
  for (let p = 0; p < passes; p++) {
    const r = rng(seed * 31 + p * 977 + b * 7919);
    const k = 7;
    const amp = rough * (p ? 1.5 : 1);
    const ctrl = [];
    for (let i = 0; i <= Math.ceil(n / k) + 1; i++) ctrl.push([(r() - 0.5) * 2 * amp, (r() - 0.5) * 2 * amp]);
    const at = (i) => {
      const f = i / k, i0 = Math.floor(f), fr = f - i0, s = fr * fr * (3 - 2 * fr);
      const a = ctrl[i0], c = ctrl[i0 + 1];
      return [pts[i][0] + a[0] + (c[0] - a[0]) * s, pts[i][1] + a[1] + (c[1] - a[1]) * s];
    };
    ctx.beginPath();
    for (let i = 0; i <= last; i++) {
      const [x, y] = at(i);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    if (frac > 0 && last + 1 < n) {
      const a = at(last), c = at(last + 1);
      ctx.lineTo(lerp(a[0], c[0], frac), lerp(a[1], c[1], frac));
    }
    ctx.globalAlpha = base * alpha * (p ? 0.55 : 1);
    ctx.lineWidth = width * (p ? 0.5 : 1);
    ctx.stroke();
  }
  ctx.restore();
}

export const sLine = (ctx, x1, y1, x2, y2, o) => sketch(ctx, linePts(x1, y1, x2, y2), o);
export const sEllipse = (ctx, cx, cy, rx, ry, o = {}) =>
  sketch(ctx, ellipsePts(cx, cy, rx, ry, (o.start ?? -0.4), (o.start ?? -0.4) + TAU + 0.25), o);
export const sRect = (ctx, x, y, w, h, o = {}) =>
  sketch(ctx, polyPts([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y + 6]]), o);

// ---------- torn paper cutouts ----------
function tornPath(pts, seed, torn) {
  const r = rng(seed);
  const p = new Path2D();
  pts.forEach(([x, y], i) => {
    const jx = x + (r() - 0.5) * torn * 2;
    const jy = y + (r() - 0.5) * torn * 2;
    i ? p.lineTo(jx, jy) : p.moveTo(jx, jy);
  });
  p.closePath();
  return p;
}

/**
 * A cut-paper shape: drop shadow, light torn fringe, colour fill, paper fibre
 * texture, optional sketchy ink outline.
 */
export function paper(ctx, pts, o = {}) {
  const {
    fill = PAL.paper,
    seed = hash(pts.length + ":" + pts[0][0] + ":" + pts[0][1]),
    torn = 1.6,
    shadow = 1,
    fringe = true,
    texture = 0.55,
    ink = null,
    inkWidth = 2.5,
    alpha = 1,
  } = o;
  if (alpha <= 0) return;
  const path = tornPath(pts, seed, torn);
  const base = ctx.globalAlpha;
  ctx.save();
  ctx.globalAlpha = base * alpha;
  if (shadow) {
    ctx.save();
    ctx.translate(4 * shadow, 6 * shadow);
    ctx.fillStyle = "rgba(58,40,22,0.22)";
    ctx.fill(path);
    ctx.restore();
  }
  if (fringe) {
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fffaf0";
    ctx.stroke(path);
  }
  ctx.fillStyle = fill;
  ctx.fill(path);
  if (texture && state.paper) {
    ctx.save();
    ctx.clip(path);
    ctx.globalAlpha = base * alpha * texture;
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = state.paper;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    ctx.fillRect(x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 12);
    ctx.restore();
  }
  ctx.restore();
  if (ink) sketch(ctx, [...pts, pts[0], pts[1]], { color: ink, width: inkWidth, alpha, rough: 1.2, seed: seed + 7 });
}

export const paperRect = (ctx, x, y, w, h, o = {}) => paper(ctx, roundRectPts(x, y, w, h, o.r ?? 6), o);
export const paperCircle = (ctx, cx, cy, r, o = {}) => paper(ctx, ellipsePts(cx, cy, r, o.ry ?? r, 0, TAU * 0.985), o);

/** A strip of translucent masking tape. */
export function tape(ctx, x, y, w = 90, rot = 0, seed = 1, alpha = 1) {
  const h = 26;
  const r = rng(seed);
  const base = ctx.globalAlpha;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = base * 0.78 * alpha;
  const pts = [];
  for (let i = 0; i <= 5; i++) pts.push([-w / 2 + (r() - 0.5) * 5, -h / 2 + (i / 5) * h]);
  for (let i = 0; i <= 5; i++) pts.push([w / 2 + (r() - 0.5) * 5, h / 2 - (i / 5) * h]);
  const p = new Path2D();
  pts.forEach(([a, b], i) => (i ? p.lineTo(a, b) : p.moveTo(a, b)));
  p.closePath();
  ctx.fillStyle = "#efe3bf";
  ctx.fill(p);
  ctx.globalAlpha = base * 0.18 * alpha;
  ctx.fillStyle = "#fff";
  ctx.fillRect(-w / 2 + 4, -h / 2 + 3, w - 8, 5);
  ctx.restore();
}

// ---------- text ----------
export const FONTS = {
  hand: "'Caveat', 'Segoe Print', 'Comic Sans MS', cursive",
  marker: "'Permanent Marker', 'Segoe Print', 'Comic Sans MS', cursive",
  type: "'Special Elite', 'Courier New', monospace",
  serif: "Georgia, 'Times New Roman', serif",
  block: "'Arial Black', Impact, 'Helvetica Neue', sans-serif",
};

/**
 * Handwritten text. `progress` reveals it left→right like it is being written.
 */
export function text(ctx, str, x, y, o = {}) {
  const {
    size = 40,
    font = "hand",
    weight = font === "hand" ? 700 : 400,
    color = PAL.ink,
    align = "center",
    baseline = "middle",
    progress = 1,
    alpha = 1,
    rot = 0,
    lineHeight = 1.1,
    maxWidth,
  } = o;
  if (progress <= 0 || alpha <= 0) return;
  const base = ctx.globalAlpha;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `${weight} ${size}px ${FONTS[font] ?? font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = color;
  ctx.globalAlpha = base * alpha;
  const lines = String(str).split("\n");
  const widths = lines.map((l) => ctx.measureText(l).width);
  const total = widths.reduce((a, b) => a + b, 0) || 1;
  let budget = progress * total;
  lines.forEach((line, i) => {
    const w = widths[i];
    const ly = (i - (lines.length - 1) / 2) * size * lineHeight;
    if (budget <= 0) return;
    const show = Math.min(1, budget / w);
    budget -= w;
    ctx.save();
    if (show < 1) {
      const lx = align === "center" ? -w / 2 : align === "right" ? -w : 0;
      ctx.beginPath();
      ctx.rect(lx - 4, ly - size, w * show + 4, size * 2);
      ctx.clip();
    }
    ctx.fillText(line, 0, ly, maxWidth);
    ctx.restore();
  });
  ctx.restore();
}

export function measure(ctx, str, size, font = "hand", weight) {
  ctx.save();
  ctx.font = `${weight ?? (font === "hand" ? 700 : 400)} ${size}px ${FONTS[font] ?? font}`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

const RANSOM_BG = ["#fbf6ea", "#f7d95c", "#f4a7b9", "#8fc4e3", "#ffffff", "#a8dcc0", "#f07a5f", "#27406f", "#2b2a33"];
const RANSOM_FONTS = [
  ["marker", 400],
  [FONTS.serif, 700],
  [FONTS.block, 900],
  ["type", 400],
  [FONTS.serif, 400],
];

/** Ransom-note title: each letter on its own scrap of paper, dropping in. */
export function ransom(ctx, str, cx, cy, o = {}) {
  const { size = 90, t = 1, seed = 7, spread = 0.7 } = o;
  const r = rng(seed);
  const letters = [...str].map((ch) => {
    const [font, weight] = RANSOM_FONTS[Math.floor(r() * RANSOM_FONTS.length)];
    const bg = RANSOM_BG[Math.floor(r() * RANSOM_BG.length)];
    const s = size * (0.86 + r() * 0.28);
    const dark = bg === "#27406f" || bg === "#2b2a33";
    return {
      ch, font, weight, bg, s,
      fg: dark ? "#fbf6ea" : r() < 0.25 ? PAL.red : PAL.ink,
      rot: (r() - 0.5) * 0.22,
      dy: (r() - 0.5) * size * 0.14,
      pad: 0.18 + r() * 0.12,
      seed: Math.floor(r() * 1e6),
    };
  });
  letters.forEach((l) => {
    l.w = l.ch === " " ? size * 0.38 : measure(ctx, l.ch, l.s, l.font, l.weight) + l.s * l.pad * 2;
  });
  const gap = size * 0.06;
  const total = letters.reduce((a, l) => a + l.w + gap, -gap);
  let x = cx - total / 2;
  const n = letters.length;
  letters.forEach((l, i) => {
    const start = (i / n) * spread;
    const p = clamp((t - start) / (1 - spread));
    const lx = x + l.w / 2;
    x += l.w + gap;
    if (l.ch === " " || p <= 0) return;
    const e = E.outBack(p);
    const [jx, jy, jr] = jitter("ransom" + seed + i, 0.8);
    ctx.save();
    ctx.translate(lx + jx, cy + l.dy + jy - (1 - E.out(p)) * 120);
    ctx.rotate(l.rot + (1 - e) * 0.6 + jr);
    ctx.scale(e, e);
    const h = l.s * 1.18;
    paperRect(ctx, -l.w / 2, -h / 2, l.w, h, { fill: l.bg, seed: l.seed, torn: 2.2, r: 2, shadow: 0.8 });
    text(ctx, l.ch, 0, l.s * 0.06, { size: l.s, font: l.font, weight: l.weight, color: l.fg });
    ctx.restore();
  });
}

// ---------- doodles ----------
export function arrow(ctx, from, to, o = {}) {
  const { bend = 0.25, color = PAL.ink, width = 3.5, progress = 1, head = 18, seed = 3 } = o;
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const c1 = [from[0] + dx * 0.3 - dy * bend, from[1] + dy * 0.3 + dx * bend];
  const c2 = [from[0] + dx * 0.7 - dy * bend, from[1] + dy * 0.7 + dx * bend];
  sketch(ctx, bezPts(from, c1, c2, to, 30), { color, width, progress: progress / 0.85, seed });
  const hp = clamp((progress - 0.85) / 0.15);
  if (hp > 0) {
    const a = bezAngle(from, c1, c2, to, 0.99);
    for (const s of [-1, 1]) {
      const ang = a + Math.PI + s * 0.5;
      sketch(ctx, linePts(to[0], to[1], to[0] + Math.cos(ang) * head, to[1] + Math.sin(ang) * head, 4), {
        color, width, progress: hp, seed: seed + s + 5,
      });
    }
  }
}

export function check(ctx, x, y, s = 30, o = {}) {
  sketch(ctx, polyPts([[x - s * 0.5, y], [x - s * 0.1, y + s * 0.42], [x + s * 0.6, y - s * 0.55]], false, 5), {
    color: PAL.teal, width: 5, rough: 1, ...o,
  });
}

export function cross(ctx, x, y, s = 30, o = {}) {
  const p = o.progress ?? 1;
  sketch(ctx, linePts(x - s / 2, y - s / 2, x + s / 2, y + s / 2, 5), { color: PAL.red, width: 5, ...o, progress: p * 2 });
  sketch(ctx, linePts(x + s / 2, y - s / 2, x - s / 2, y + s / 2, 5), { color: PAL.red, width: 5, ...o, progress: p * 2 - 1, seed: 99 });
}

export function circleDoodle(ctx, cx, cy, rx, ry, o = {}) {
  sketch(ctx, ellipsePts(cx, cy, rx, ry, -2.2, -2.2 + TAU * 1.12), { color: PAL.red, width: 4, ...o });
}

export function star(ctx, x, y, r, o = {}) {
  const { fill = PAL.yellow, rot = 0, points = 5, inner = 0.45 } = o;
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i / (points * 2)) * TAU - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  paper(ctx, pts, { fill, torn: 0.8, shadow: 0.5, ...o });
}

export function sparkle(ctx, x, y, s, o = {}) {
  const { color = PAL.mustard, alpha = 1 } = o;
  sLine(ctx, x - s, y, x + s, y, { color, width: 3, alpha, rough: 0.6 });
  sLine(ctx, x, y - s, x, y + s, { color, width: 3, alpha, rough: 0.6 });
  sLine(ctx, x - s * 0.5, y - s * 0.5, x + s * 0.5, y + s * 0.5, { color, width: 2, alpha: alpha * 0.8, rough: 0.5 });
  sLine(ctx, x + s * 0.5, y - s * 0.5, x - s * 0.5, y + s * 0.5, { color, width: 2, alpha: alpha * 0.8, rough: 0.5 });
}

/** Burst of radiating dashes (impact / "ta-da"). */
export function burst(ctx, x, y, r, p, o = {}) {
  if (p <= 0 || p >= 1) return;
  const { color = PAL.ink, n = 10, seed = 4 } = o;
  const rr = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rr() * 0.3;
    const r0 = r * (0.6 + p * 0.7);
    const r1 = r0 + r * 0.35 * (1 - p);
    sLine(ctx, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, {
      color, width: 3.5, alpha: 1 - p, rough: 0.5, seed: seed + i,
    });
  }
}

/** Deterministic confetti: position is a pure function of time since the burst. */
export function confetti(ctx, x, y, since, o = {}) {
  if (since < 0 || since > 3.2) return;
  const { n = 46, seed = 11, spread = 1, colors = [PAL.red, PAL.mustard, PAL.teal, PAL.lattice, PAL.pink, PAL.sky] } = o;
  const r = rng(seed);
  for (let i = 0; i < (state.reduced ? n / 3 : n); i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.4 * spread;
    const v = 420 + r() * 520;
    const px = x + Math.cos(a) * v * since * 0.9 + Math.sin(since * 3 + i) * 12;
    const py = y + Math.sin(a) * v * since + 520 * since * since;
    const rot = r() * TAU + since * (r() - 0.5) * 14;
    const c = colors[Math.floor(r() * colors.length)];
    ctx.save();
    ctx.globalAlpha = clamp(1 - (since - 2.2) / 1);
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.scale(1, Math.cos(since * 9 + i));
    ctx.fillStyle = c;
    ctx.fillRect(-7, -4, 14, 8);
    ctx.restore();
  }
}

// ---------- textures ----------
export function makeTextures() {
  const mk = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return [c, c.getContext("2d")];
  };

  // Paper fibre pattern (multiplied over every cutout).
  const [pc, p] = mk(220, 220);
  const r = rng(42);
  p.fillStyle = "#ffffff";
  p.fillRect(0, 0, 220, 220);
  for (let i = 0; i < 26; i++) {
    const g = p.createRadialGradient(r() * 220, r() * 220, 0, r() * 220, r() * 220, 30 + r() * 60);
    g.addColorStop(0, `rgba(150,120,80,${0.05 + r() * 0.06})`);
    g.addColorStop(1, "rgba(150,120,80,0)");
    p.fillStyle = g;
    p.fillRect(0, 0, 220, 220);
  }
  for (let i = 0; i < 900; i++) {
    p.fillStyle = `rgba(90,70,40,${r() * 0.18})`;
    p.fillRect(r() * 220, r() * 220, 1 + r() * 1.3, 1 + r() * 1.3);
  }
  p.lineCap = "round";
  for (let i = 0; i < 60; i++) {
    const x = r() * 220, y = r() * 220, a = r() * TAU, l = 4 + r() * 12;
    p.strokeStyle = `rgba(110,85,50,${0.08 + r() * 0.12})`;
    p.lineWidth = 0.6;
    p.beginPath();
    p.moveTo(x, y);
    p.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    p.stroke();
  }

  // Kraft-paper backdrop with mottling, fibres and vignette.
  const S = 1.25;
  const [kc, k] = mk(W * S, H * S);
  k.scale(S, S);
  const base = k.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, "#dcc6a2");
  base.addColorStop(1, "#cdb48b");
  k.fillStyle = base;
  k.fillRect(0, 0, W, H);
  const r2 = rng(9);
  for (let i = 0; i < 70; i++) {
    const x = r2() * W, y = r2() * H, rad = 60 + r2() * 260;
    const g = k.createRadialGradient(x, y, 0, x, y, rad);
    const light = r2() < 0.5;
    g.addColorStop(0, light ? `rgba(255,245,220,${0.05 + r2() * 0.08})` : `rgba(120,85,45,${0.04 + r2() * 0.06})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    k.fillStyle = g;
    k.fillRect(0, 0, W, H);
  }
  for (let i = 0; i < 5000; i++) {
    k.fillStyle = r2() < 0.5 ? `rgba(90,60,30,${r2() * 0.16})` : `rgba(255,250,235,${r2() * 0.2})`;
    k.fillRect(r2() * W, r2() * H, 1 + r2() * 1.5, 1 + r2() * 1.5);
  }
  k.lineCap = "round";
  for (let i = 0; i < 600; i++) {
    const x = r2() * W, y = r2() * H, a = r2() * TAU, l = 5 + r2() * 22;
    k.strokeStyle = r2() < 0.6 ? `rgba(100,70,35,${0.07 + r2() * 0.12})` : `rgba(255,248,230,${0.1 + r2() * 0.15})`;
    k.lineWidth = 0.5 + r2() * 0.9;
    k.beginPath();
    k.moveTo(x, y);
    k.quadraticCurveTo(x + Math.cos(a + 0.5) * l / 2, y + Math.sin(a + 0.5) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l);
    k.stroke();
  }
  const v = k.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.72);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(60,35,10,0.32)");
  k.fillStyle = v;
  k.fillRect(0, 0, W, H);

  // Film grain tile.
  const [gc, g] = mk(256, 256);
  const img = g.createImageData(256, 256);
  const r3 = rng(77);
  for (let i = 0; i < img.data.length; i += 4) {
    const val = 128 + (r3() - 0.5) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = val;
    img.data[i + 3] = 22;
  }
  g.putImageData(img, 0, 0);

  return { paperCanvas: pc, kraft: kc, grain: gc };
}
