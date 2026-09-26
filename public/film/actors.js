// Characters and props for the SSO film, all built from paper cutouts and
// sketchy ink. Each actor draws around its own origin; callers position it.
import {
  PAL, TAU, E, clamp, lerp, hash, rng, jitter, state,
  sketch, sLine, sEllipse, paper, paperRect, paperCircle, tape, text,
  linePts, polyPts, ellipsePts, bezPts, roundRectPts, blobPts, star, sparkle, check, cross,
} from "./core.js";

const place = (ctx, id, x, y, s = 1, rot = 0, amt = 1) => {
  const [jx, jy, jr] = jitter(id, amt);
  ctx.save();
  ctx.translate(x + jx, y + jy);
  ctx.rotate(rot + jr);
  ctx.scale(s, s);
};

// ------------------------------------------------------------------ people
/**
 * Paper-doll person. Feet at origin, ~230 units tall at s = 1.
 * pose: "down" | "wave" | "shrug" | "point" | "cheer" | "type"
 * mood: "happy" | "neutral" | "stressed" | "dizzy" | "sad" | "wow" | "smug"
 */
export function person(ctx, o) {
  const {
    x, y, s = 1, t = 0, id = "p", walk = null, face = 1, pose = "down", mood = "happy",
    shirt = PAL.teal, pants = PAL.navy, hair = "#4a2f25", skin = PAL.skin, hairStyle = "bob",
    badge = null, band = false, alpha = 1, tag = null, waveAmt = 1,
  } = o;
  if (alpha <= 0) return;
  place(ctx, id, x, y, s);
  ctx.scale(face, 1);
  ctx.globalAlpha *= alpha;
  const seed = hash(id);
  const swing = walk !== null ? Math.sin(walk) : 0;
  const bob = walk !== null ? -Math.abs(Math.sin(walk)) * 6 : Math.sin(t * 2.2 + seed) * 1.5;

  // legs
  for (const side of [-1, 1]) {
    const a = swing * 0.45 * side;
    const hx = side * 15, hy = -86 + bob;
    const fx = hx + Math.sin(a) * 82, fy = hy + Math.cos(a) * 82;
    sLine(ctx, hx, hy, fx, fy, { color: pants, width: 15, rough: 0.8, seed: seed + side, passes: 1 });
    paper(ctx, ellipsePts(fx + 8, fy - 2, 16, 8, 0, TAU * 0.98), { fill: PAL.ink, seed: seed + side * 3, torn: 0.6, shadow: 0.3, fringe: false });
  }

  ctx.translate(0, bob);
  // torso
  const torso = polyPts([[-30, -166], [30, -166], [42, -78], [-42, -78]], true, 8);
  paper(ctx, torso, { fill: shirt, seed: seed + 11, torn: 1.2, ink: PAL.ink, inkWidth: 2.2 });
  sketch(ctx, linePts(-12, -164, 0, -150, 4).concat(linePts(0, -150, 12, -164, 4)), { width: 2, rough: 0.5, seed: seed + 12 });

  if (badge) {
    sketch(ctx, polyPts([[-14, -164], [0, -118], [14, -164]], false, 5), { color: PAL.red, width: 2, rough: 0.6, seed: seed + 5 });
    paperRect(ctx, -15, -122, 30, 24, { fill: PAL.paper, seed: seed + 6, r: 3, shadow: 0.4 });
    text(ctx, badge, 0, -109, { size: 13, font: "type", color: PAL.ink });
  }

  // arms
  const arm = (side, ang, bend = 0) => {
    const sx = side * 30, sy = -150;
    const ex = sx + Math.sin(ang) * 38 * side, ey = sy + Math.cos(ang) * 38;
    const ang2 = ang + bend;
    const hx = ex + Math.sin(ang2) * 36 * side, hy = ey + Math.cos(ang2) * 36;
    sketch(ctx, polyPts([[sx, sy], [ex, ey], [hx, hy]], false, 6), { color: shirt, width: 12, rough: 0.7, seed: seed + side * 17, passes: 1 });
    sketch(ctx, polyPts([[sx, sy], [ex, ey], [hx, hy]], false, 6), { color: PAL.ink, width: 1.6, rough: 0.9, seed: seed + side * 19, alpha: 0.7 });
    paperCircle(ctx, hx, hy, 8, { fill: skin, seed: seed + side * 23, torn: 0.5, shadow: 0.3, fringe: false });
    return [hx, hy];
  };
  const wv = Math.sin(t * 9) * 0.35 * waveAmt;
  let hand = null;
  if (pose === "down") {
    arm(-1, 0.2 - swing * 0.35, 0.1);
    hand = arm(1, 0.2 + swing * 0.35, 0.1);
  } else if (pose === "wave") {
    arm(-1, 0.2, 0.1);
    hand = arm(1, 2.5 + wv, 0.3);
  } else if (pose === "cheer") {
    arm(-1, 2.6 + wv, 0.2);
    hand = arm(1, 2.6 - wv, 0.2);
  } else if (pose === "shrug") {
    arm(-1, 0.9, 1.4);
    hand = arm(1, 0.9, 1.4);
  } else if (pose === "point") {
    arm(-1, 0.2, 0.1);
    hand = arm(1, 1.55, 0.05);
  } else if (pose === "type") {
    arm(-1, 0.9 + Math.sin(t * 20) * 0.1, 0.9);
    hand = arm(1, 0.9 + Math.cos(t * 22) * 0.1, 0.9);
  }
  if (band && hand) {
    paperRect(ctx, hand[0] - 11, hand[1] - 16, 22, 9, { fill: PAL.coral, seed: 77, r: 3, shadow: 0.3 });
  }

  // head
  paperCircle(ctx, 0, -202, 38, { fill: skin, seed: seed + 31, torn: 0.8, ink: PAL.ink, inkWidth: 2 });
  // hair
  if (hairStyle === "bob") {
    const h = ellipsePts(0, -206, 44, 42, Math.PI * 0.92, Math.PI * 2.08, 7);
    h.push([40, -176], [30, -174], [28, -196], [10, -214], [-12, -210], [-28, -196], [-30, -174], [-41, -176]);
    paper(ctx, h, { fill: hair, seed: seed + 41, torn: 1.2, shadow: 0.5 });
  } else if (hairStyle === "short") {
    const h = ellipsePts(0, -206, 41, 38, Math.PI * 1.0, Math.PI * 2.0, 7);
    h.push([34, -214], [14, -222], [-6, -218], [-26, -212]);
    paper(ctx, h, { fill: hair, seed: seed + 41, torn: 1.4, shadow: 0.5 });
  } else if (hairStyle === "bun") {
    paperCircle(ctx, -18, -246, 16, { fill: hair, seed: seed + 43, shadow: 0.4 });
    const h = ellipsePts(0, -208, 41, 38, Math.PI * 1.0, Math.PI * 2.0, 7);
    h.push([30, -206], [-30, -206]);
    paper(ctx, h, { fill: hair, seed: seed + 41, torn: 1.2, shadow: 0.5 });
  } else if (hairStyle === "cap") {
    const c = ellipsePts(0, -212, 42, 34, Math.PI, TAU, 7);
    c.push([62, -212], [62, -204], [-40, -206]);
    paper(ctx, c, { fill: hair, seed: seed + 45, torn: 1, shadow: 0.6, ink: PAL.ink, inkWidth: 1.6 });
    paperCircle(ctx, 0, -244, 5, { fill: hair, seed: seed + 46, shadow: 0.2, fringe: false });
  }

  // face
  const blink = ((t + (seed % 97) * 0.13) % 3.6) < 0.12;
  const ex1 = 2, ex2 = 22, ey = -200;
  if (mood === "dizzy") {
    for (const ex of [ex1, ex2]) sketch(ctx, spiralPts(ex, ey, 8, t * 6), { width: 2, rough: 0.3 });
  } else if (blink || mood === "smug") {
    for (const ex of [ex1, ex2]) sLine(ctx, ex - 5, ey, ex + 5, ey, { width: 2.5, rough: 0.3 });
  } else {
    for (const ex of [ex1, ex2]) {
      ctx.fillStyle = PAL.ink;
      ctx.beginPath();
      ctx.ellipse(ex, ey, mood === "wow" ? 5 : 4, mood === "wow" ? 6 : 5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ex + 1.5, ey - 1.8, 1.4, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = "rgba(240,122,95,0.35)";
  ctx.beginPath();
  ctx.ellipse(-8, -186, 7, 4.5, 0, 0, TAU);
  ctx.ellipse(32, -186, 7, 4.5, 0, 0, TAU);
  ctx.fill();
  const my = -182;
  if (mood === "happy" || mood === "smug") sketch(ctx, ellipsePts(13, my - 6, 11, 8, 0.35, Math.PI - 0.35, 3), { width: 2.4, rough: 0.4 });
  else if (mood === "neutral") sLine(ctx, 6, my, 20, my, { width: 2.4, rough: 0.4 });
  else if (mood === "sad") sketch(ctx, ellipsePts(13, my + 6, 9, 6, Math.PI + 0.5, TAU - 0.5, 3), { width: 2.4, rough: 0.4 });
  else if (mood === "wow") sEllipse(ctx, 13, my, 5, 7, { width: 2.4, rough: 0.4 });
  else if (mood === "stressed" || mood === "dizzy") {
    const pts = [];
    for (let i = 0; i <= 12; i++) pts.push([4 + i * 1.6, my + Math.sin(i * 1.6) * 2.4]);
    sketch(ctx, pts, { width: 2.2, rough: 0.2 });
  }
  if (mood === "stressed") {
    const d = (t * 1.3) % 1;
    paper(ctx, dropPts(-38, -226 + d * 30, 7), { fill: PAL.sky, seed: 5, torn: 0.3, shadow: 0.2, fringe: false, alpha: 1 - d });
    paper(ctx, dropPts(48, -236 + ((d + 0.5) % 1) * 30, 6), { fill: PAL.sky, seed: 6, torn: 0.3, shadow: 0.2, fringe: false, alpha: 1 - ((d + 0.5) % 1) });
  }
  ctx.restore();

  if (tag) nameTag(ctx, x, y - 272 * s, tag, { seed: seed + 3 });
}

function spiralPts(cx, cy, r, ph) {
  const out = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * TAU * 2 + ph;
    const rr = (i / 24) * r;
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
}

function dropPts(x, y, r) {
  const pts = ellipsePts(x, y, r, r, -0.2, Math.PI + 0.2, 6);
  pts.push([x, y - r * 2.2]);
  return pts;
}

export function nameTag(ctx, x, y, label, o = {}) {
  const { seed = 3, fill = PAL.paper, size = 30, color = PAL.ink, rot = -0.04, alpha = 1 } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const w = ctx.measureText ? label.length * size * 0.42 + 30 : 100;
  place(ctx, "tag" + label + seed, x, y, 1, rot, 0.6);
  paperRect(ctx, -w / 2, -size * 0.75, w, size * 1.5, { fill, seed, r: 4, shadow: 0.6 });
  tape(ctx, 0, -size * 0.75, 50, 0.05, seed + 1);
  text(ctx, label, 0, 2, { size, color });
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------ pigeon
/** The browser, portrayed as a hard-working carrier pigeon. */
export function pigeon(ctx, o) {
  const {
    x, y, s = 1, t = 0, id = "pigeon", flying = false, face = 1, cargo = null, band = false,
    whistle = false, rot = 0, alpha = 1, cargoLabel = null,
  } = o;
  if (alpha <= 0) return;
  place(ctx, id, x, y, s, rot);
  ctx.scale(face, 1);
  ctx.globalAlpha *= alpha;
  const flap = flying ? Math.sin(t * 18) : 0;
  const hop = flying ? 0 : Math.abs(Math.sin(t * 1.4)) * -1.5;
  ctx.translate(0, hop);

  // cargo on a string
  if (cargo) {
    const sway = Math.sin(t * 3) * 0.08;
    ctx.save();
    ctx.translate(4, 26);
    ctx.rotate(sway);
    sLine(ctx, 0, 0, 0, 34, { width: 1.8, rough: 0.4, seed: 4 });
    ctx.translate(0, 34);
    if (cargo === "envelope") envelope(ctx, { w: 78, h: 52, seed: 21, lock: true });
    else if (cargo === "ticket") ticket(ctx, { w: 84, h: 42 });
    else if (cargo === "red") envelope(ctx, { w: 78, h: 52, seed: 23, fill: "#f6c8bd", seal: PAL.red, denied: true });
    else if (cargo === "envelopeSam") envelope(ctx, { w: 78, h: 52, seed: 24, lock: true, fill: "#fbe9b7" });
    if (cargoLabel) text(ctx, cargoLabel, 0, 50, { size: 22, color: PAL.ink });
    ctx.restore();
  }

  // tail
  paper(ctx, [[-40, -6], [-86, -18], [-90, 4], [-82, 14], [-40, 10]], { fill: "#8f8cab", seed: 31, torn: 1, shadow: 0.5 });
  // far wing (when flying)
  if (flying) {
    ctx.save();
    ctx.translate(-2, -14);
    ctx.rotate(-0.4 - flap * 0.9);
    paper(ctx, ellipsePts(-6, -26, 18, 40, 0, TAU * 0.98), { fill: "#9c99b8", seed: 35, shadow: 0.3 });
    ctx.restore();
  }
  // legs
  const legs = flying ? [[-4, 26, -14, 36], [8, 26, 0, 38]] : [[-6, 26, -8, 48], [10, 26, 10, 48]];
  for (const [a, b, c, d] of legs) sLine(ctx, a, b, c, d, { color: PAL.coral, width: 4, rough: 0.5, seed: a + 50 });
  if (band) {
    paperRect(ctx, legs[1][2] - 7, legs[1][3] - 14, 16, 9, { fill: PAL.coral, seed: 78, r: 2, shadow: 0.3, ink: PAL.ink, inkWidth: 1 });
    if (!flying) sparkle(ctx, 28, 40, 7 + Math.sin(t * 6) * 2, { color: PAL.mustard });
  }
  // body
  paper(ctx, ellipsePts(0, 0, 50, 32, 0, TAU * 0.98), { fill: "#bdbbd4", seed: 33, torn: 1.2, ink: PAL.ink, inkWidth: 2 });
  paper(ctx, ellipsePts(12, 10, 30, 18, 0, TAU * 0.98), { fill: "#e0def0", seed: 34, torn: 1, shadow: 0, fringe: false });
  // neck sheen
  paper(ctx, ellipsePts(30, -18, 16, 14, 0, TAU * 0.98), { fill: "#6fb7a7", seed: 36, torn: 0.8, shadow: 0, fringe: false });
  paper(ctx, ellipsePts(26, -10, 12, 8, 0, TAU * 0.98), { fill: "#9a7fc4", seed: 37, torn: 0.8, shadow: 0, fringe: false, alpha: 0.8 });
  // near wing
  ctx.save();
  ctx.translate(-4, -10);
  ctx.rotate(flying ? -0.2 - flap * 1.0 : 0.15);
  paper(ctx, ellipsePts(-14, flying ? -18 : 4, flying ? 20 : 34, flying ? 42 : 17, 0, TAU * 0.98), {
    fill: "#a6a3c3", seed: 38, torn: 1, ink: PAL.ink, inkWidth: 1.6,
  });
  for (let i = 0; i < 3; i++) {
    const yy = flying ? -40 + i * 12 : -4 + i * 6;
    const xx = flying ? -20 : -40 + i * 4;
    sLine(ctx, xx, yy, xx + (flying ? 10 : 30), yy + (flying ? -4 : 6), { width: 1.4, rough: 0.3, seed: 60 + i, alpha: 0.6 });
  }
  ctx.restore();
  // head
  paperCircle(ctx, 44, -32, 19, { fill: "#bdbbd4", seed: 39, torn: 0.8, ink: PAL.ink, inkWidth: 2 });
  paper(ctx, [[60, -38], [80, -30], [60, -26]], { fill: PAL.mustard, seed: 40, torn: 0.5, shadow: 0.3 });
  const blink = ((t + 1.3) % 2.9) < 0.12;
  if (whistle || blink) {
    sketch(ctx, ellipsePts(50, -36, 5, 3, 0.2, Math.PI - 0.2, 3), { width: 2.2, rough: 0.2 });
  } else {
    paperCircle(ctx, 50, -36, 6.5, { fill: "#fff", seed: 41, torn: 0.3, shadow: 0, fringe: false });
    ctx.fillStyle = PAL.ink;
    ctx.beginPath();
    ctx.arc(52, -36, 3.2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  if (whistle) {
    for (let i = 0; i < 2; i++) {
      const p = (t * 0.7 + i * 0.5) % 1;
      musicNote(ctx, x + face * (70 + p * 40) * s, y - (50 + p * 60) * s, 0.9 * s, 1 - p, i);
    }
  }
}

export function musicNote(ctx, x, y, s, alpha, i = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = PAL.ink;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 6, -0.4, 0, TAU);
  ctx.fill();
  sLine(ctx, 7, -2, 7, -30, { width: 2.5, rough: 0.3, seed: 90 + i });
  sLine(ctx, 7, -30, 18, -22, { width: 2.5, rough: 0.3, seed: 95 + i });
  ctx.restore();
}

// ------------------------------------------------------------------ places
/** The identity provider, drawn as a small civic "passport office". */
export function office(ctx, o) {
  const { x, y, s = 1, t = 0, clerk = {}, glow = 0 } = o;
  place(ctx, "office", x, y, s, 0, 0.6);
  if (glow > 0) {
    const g = ctx.createRadialGradient(0, -180, 20, 0, -180, 360);
    g.addColorStop(0, `rgba(255,236,160,${0.55 * glow})`);
    g.addColorStop(1, "rgba(255,236,160,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-380, -560, 760, 620);
  }
  // flag
  sLine(ctx, 0, -330, 0, -420, { width: 4, seed: 5 });
  const fl = [];
  for (let i = 0; i <= 10; i++) fl.push([i * 8, -418 + Math.sin(t * 5 - i * 0.7) * 5 * (i / 10)]);
  for (let i = 10; i >= 0; i--) fl.push([i * 8, -382 + Math.sin(t * 5 - i * 0.7) * 5 * (i / 10)]);
  paper(ctx, fl, { fill: PAL.red, seed: 6, torn: 0.6, shadow: 0.4 });
  // steps
  paperRect(ctx, -222, -24, 444, 26, { fill: "#d9d2c3", seed: 7, r: 3 });
  paperRect(ctx, -200, -46, 400, 24, { fill: "#e7e0d0", seed: 8, r: 3 });
  // body
  paperRect(ctx, -185, -262, 370, 218, { fill: PAL.cream, seed: 9, r: 4, ink: PAL.ink, inkWidth: 2.2 });
  // columns
  for (const cx of [-150, -100, 100, 150]) {
    paperRect(ctx, cx - 16, -226, 32, 180, { fill: "#fffaf0", seed: 10 + cx, r: 3, shadow: 0.4 });
    sLine(ctx, cx - 6, -218, cx - 6, -54, { width: 1.2, alpha: 0.5, seed: 20 + cx, rough: 0.5 });
    sLine(ctx, cx + 6, -218, cx + 6, -54, { width: 1.2, alpha: 0.5, seed: 30 + cx, rough: 0.5 });
  }
  // pediment
  paper(ctx, [[-214, -258], [214, -258], [0, -346]], { fill: PAL.mustard, seed: 12, torn: 1.4, ink: PAL.ink, inkWidth: 2.2 });
  paperCircle(ctx, 0, -290, 18, { fill: PAL.paper, seed: 13, shadow: 0.3 });
  keyIcon(ctx, 0, -290, 0.32, { fill: PAL.mustard });
  // sign
  paperRect(ctx, -170, -252, 340, 40, { fill: PAL.navy, seed: 14, r: 3, shadow: 0.6 });
  text(ctx, "IDENTITY PROVIDER", 0, -231, { size: 25, font: "marker", color: PAL.paper });
  // service window
  paperRect(ctx, -68, -200, 136, 118, { fill: "#cfe6f2", seed: 15, r: 6, ink: PAL.ink, inkWidth: 2 });
  clerkFigure(ctx, 0, -84, t, clerk);
  paperRect(ctx, -80, -92, 160, 20, { fill: "#b88a5a", seed: 16, r: 3, shadow: 0.8 });
  // awning scallops
  const aw = [];
  for (let i = 0; i <= 8; i++) aw.push([-76 + i * 19, -206]);
  for (let i = 8; i >= 0; i--) aw.push([-76 + i * 19, i % 2 ? -188 : -194]);
  paper(ctx, aw, { fill: PAL.coral, seed: 17, torn: 0.8, shadow: 0.6 });
  ctx.restore();
}

function clerkFigure(ctx, x, y, t, c) {
  const { stamp = null, look = 0, mood = "happy", list = 0, sparkleEyes = false } = c;
  ctx.save();
  ctx.translate(x, y);
  // shoulders
  paper(ctx, ellipsePts(0, -8, 40, 30, Math.PI, TAU, 6).concat([[40, 0], [-40, 0]]), { fill: PAL.lattice, seed: 70, shadow: 0 });
  paperCircle(ctx, 0, -62, 26, { fill: PAL.skin2, seed: 71, ink: PAL.ink, inkWidth: 1.6, shadow: 0.2 });
  paperCircle(ctx, 0, -94, 13, { fill: "#2e2330", seed: 72, shadow: 0.2 });
  paper(ctx, ellipsePts(0, -66, 28, 26, Math.PI * 1.05, Math.PI * 1.95, 6).concat([[20, -78], [-20, -78]]), { fill: "#2e2330", seed: 73, shadow: 0.2 });
  // glasses
  const lx = look * 3;
  sEllipse(ctx, -10 + lx, -60, 8, 7, { width: 1.8, rough: 0.3, seed: 74 });
  sEllipse(ctx, 10 + lx, -60, 8, 7, { width: 1.8, rough: 0.3, seed: 75 });
  sLine(ctx, -2 + lx, -60, 2 + lx, -60, { width: 1.6, rough: 0.2, seed: 76 });
  if (sparkleEyes) {
    star(ctx, -10 + lx, -60, 5, { fill: PAL.mustard, shadow: 0 });
    star(ctx, 10 + lx, -60, 5, { fill: PAL.mustard, shadow: 0 });
  } else {
    ctx.fillStyle = PAL.ink;
    ctx.beginPath();
    ctx.arc(-10 + lx, -60, 2.6, 0, TAU);
    ctx.arc(10 + lx, -60, 2.6, 0, TAU);
    ctx.fill();
  }
  if (mood === "happy") sketch(ctx, ellipsePts(0, -52, 8, 5, 0.4, Math.PI - 0.4, 3), { width: 2, rough: 0.2 });
  else if (mood === "stern") sLine(ctx, -6, -46, 6, -46, { width: 2, rough: 0.2 });
  // stamp arm
  if (stamp !== null) {
    const lift = (1 - stamp) * 46;
    ctx.save();
    ctx.translate(34, -30 - lift);
    rubberStamp(ctx, 0, 0, 0.7);
    ctx.restore();
  }
  ctx.restore();
}

export function rubberStamp(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  paperCircle(ctx, 0, -46, 13, { fill: PAL.red, seed: 80, shadow: 0.4 });
  paperRect(ctx, -6, -40, 12, 26, { fill: "#8a5a3a", seed: 81, r: 2, shadow: 0.3 });
  paperRect(ctx, -22, -16, 44, 16, { fill: "#6b4a33", seed: 82, r: 2, shadow: 0.5 });
  ctx.restore();
}

/** An inked stamp imprint ("APPROVED", "DENIED"). */
export function imprint(ctx, x, y, label, o = {}) {
  const { color = PAL.red, rot = -0.18, s = 1, alpha = 1, size = 34 } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.globalAlpha *= alpha * 0.9;
  const baseA = ctx.globalAlpha;
  const w = label.length * size * 0.72 + 30;
  const h = size * 1.6;
  const r = rng(hash(label));
  for (const inset of [0, 6]) {
    sketch(ctx, polyPts([[-w / 2 + inset, -h / 2 + inset], [w / 2 - inset, -h / 2 + inset], [w / 2 - inset, h / 2 - inset], [-w / 2 + inset, h / 2 - inset], [-w / 2 + inset, -h / 2 + inset + 4]]), {
      color, width: inset ? 2 : 4, rough: 1.2, seed: 300 + inset, boil: false,
    });
  }
  text(ctx, label, 0, 3, { size, font: "marker", color });
  // ink voids
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = baseA * 0.5;
    ctx.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, 1 + r() * 3, 1 + r() * 2);
  }
  ctx.restore();
}

export function island(ctx, o) {
  const { x, y, rx, ry, seed = 1, grass = PAL.grass, sand = PAL.sand, alpha = 1, s = 1 } = o;
  if (alpha <= 0) return;
  place(ctx, "island" + seed, x, y, s, 0, 0.3);
  ctx.globalAlpha *= alpha;
  paper(ctx, blobPts(0, 12, rx * 1.08, ry * 1.1, seed + 1), { fill: "rgba(255,255,255,0.35)", seed: seed + 2, shadow: 0, fringe: false, texture: 0 });
  paper(ctx, blobPts(0, 0, rx, ry, seed), { fill: sand, seed: seed + 3, torn: 2.4, shadow: 1.2 });
  paper(ctx, blobPts(0, -10, rx * 0.84, ry * 0.7, seed + 9), { fill: grass, seed: seed + 4, torn: 2.2, shadow: 0.6 });
  const r = rng(seed + 5);
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 0.7;
    const tx = Math.cos(a) * rx * 0.8 * d, ty = -10 + Math.sin(a) * ry * 0.6 * d;
    sketch(ctx, polyPts([[tx - 6, ty], [tx - 2, ty - 9], [tx, ty], [tx + 3, ty - 11], [tx + 6, ty]], false, 3), {
      color: PAL.grassDark, width: 2, rough: 0.4, seed: seed + i * 13,
    });
  }
  ctx.restore();
}

export function palm(ctx, x, y, s = 1, t = 0, seed = 1) {
  place(ctx, "palm" + seed, x, y, s, Math.sin(t * 1.3 + seed) * 0.03, 0.5);
  sketch(ctx, bezPts([0, 0], [4, -40], [14, -80], [22, -120], 20), { color: "#8a5a3a", width: 10, rough: 0.6, seed, passes: 1 });
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.7 + Math.sin(t * 1.6 + i) * 0.05;
    const tip = [22 + Math.cos(a) * 60, -120 + Math.sin(a) * 36 + 18];
    const mid = [22 + Math.cos(a) * 30, -130 + Math.sin(a) * 20];
    paper(ctx, [[22, -120], mid, tip, [mid[0] + 4, mid[1] + 10]], { fill: PAL.grassDark, seed: seed + i, torn: 1, shadow: 0.5 });
  }
  ctx.restore();
}

/** Aircall landmark: a giant retro telephone. */
export function bigPhone(ctx, x, y, s = 1, t = 0, ring = 0) {
  const shake = ring ? Math.sin(t * 40) * 0.05 * ring : 0;
  place(ctx, "bigphone", x, y, s, shake, 0.6);
  paperRect(ctx, -70, -90, 140, 90, { fill: PAL.aircall, seed: 101, r: 18, ink: PAL.ink, inkWidth: 2.2 });
  paperCircle(ctx, 0, -46, 30, { fill: PAL.paper, seed: 102, shadow: 0.4 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    paperCircle(ctx, Math.cos(a) * 19, -46 + Math.sin(a) * 19, 4.5, { fill: PAL.ink, seed: 103 + i, shadow: 0, fringe: false, texture: 0 });
  }
  const hs = ring ? -Math.abs(Math.sin(t * 20)) * 8 * ring : 0;
  paper(ctx, [[-86, -100 + hs], [-60, -122 + hs], [60, -122 + hs], [86, -100 + hs], [70, -92 + hs], [50, -104 + hs], [-50, -104 + hs], [-70, -92 + hs]], {
    fill: "#16806a", seed: 110, torn: 1, ink: PAL.ink, inkWidth: 2,
  });
  ctx.restore();
  if (ring) {
    for (let i = 0; i < 3; i++) {
      sketch(ctx, ellipsePts(x, y - 80 * s, (100 + i * 18) * s, (70 + i * 14) * s, -2.6, -2.0), { width: 3, alpha: ring * (0.8 - i * 0.2), seed: 120 + i });
      sketch(ctx, ellipsePts(x, y - 80 * s, (100 + i * 18) * s, (70 + i * 14) * s, -1.1, -0.5), { width: 3, alpha: ring * (0.8 - i * 0.2), seed: 125 + i });
    }
  }
}

/** Lattice landmark: a growth chart with a little tree. */
export function growthChart(ctx, x, y, s = 1, t = 0, grow = 1) {
  place(ctx, "growth", x, y, s, 0, 0.6);
  const bars = [44, 78, 120];
  bars.forEach((h, i) => {
    const hh = h * clamp(grow * 1.4 - i * 0.2);
    if (hh > 2) paperRect(ctx, -70 + i * 50, -hh, 38, hh, { fill: i === 2 ? PAL.lattice : "#a79ef7", seed: 130 + i, r: 3, ink: PAL.ink, inkWidth: 1.8 });
  });
  if (grow > 0.8) {
    const p = clamp((grow - 0.8) / 0.2);
    sketch(ctx, bezPts([-60, -60], [-20, -90], [20, -110], [70, -160], 20), { color: PAL.red, width: 4, progress: p, seed: 140 });
  }
  ctx.restore();
}

export function tree(ctx, x, y, s = 1, seed = 1) {
  place(ctx, "tree" + seed, x, y, s, 0, 0.5);
  paperRect(ctx, -7, -50, 14, 50, { fill: "#8a5a3a", seed, r: 2 });
  paper(ctx, blobPts(0, -80, 40, 36, seed + 1, 6, 40), { fill: PAL.grassDark, seed: seed + 2, torn: 1.5, ink: PAL.ink, inkWidth: 1.6 });
  ctx.restore();
}

/** Vendor gate with signboard and a "Continue with SSO" kiosk. */
export function gate(ctx, o) {
  const { x, y, s = 1, name, color, t = 0, button = 0, pressed = 0, open = 0 } = o;
  place(ctx, "gate" + name, x, y, s, 0, 0.5);
  paperRect(ctx, -110, -170, 22, 170, { fill: "#a0714a", seed: hash(name) + 1, r: 3, ink: PAL.ink, inkWidth: 1.8 });
  paperRect(ctx, 88, -170, 22, 170, { fill: "#a0714a", seed: hash(name) + 2, r: 3, ink: PAL.ink, inkWidth: 1.8 });
  // swinging barrier arm
  ctx.save();
  ctx.translate(-88, -70);
  ctx.rotate(-open * 1.3);
  paperRect(ctx, 0, -7, 180, 14, { fill: "#fffaf0", seed: hash(name) + 3, r: 3, shadow: 0.6 });
  for (let i = 0; i < 4; i++) paperRect(ctx, 16 + i * 44, -7, 20, 14, { fill: PAL.red, seed: hash(name) + 10 + i, r: 1, shadow: 0, fringe: false });
  ctx.restore();
  paperRect(ctx, -128, -222, 256, 60, { fill: color, seed: hash(name) + 4, r: 8, ink: PAL.ink, inkWidth: 2.2 });
  text(ctx, name, 0, -191, { size: 38, font: "marker", color: PAL.paper });
  tape(ctx, -100, -222, 46, -0.3, hash(name) + 5);
  tape(ctx, 100, -222, 46, 0.3, hash(name) + 6);
  // kiosk
  if (button > 0) {
    ctx.save();
    ctx.translate(170, 0);
    ctx.scale(E.outBack(button), E.outBack(button));
    sLine(ctx, 0, 0, 0, -70, { width: 6, seed: 7 });
    const py = -96 + pressed * 4;
    paperRect(ctx, -96, py - 26, 192, 52, { fill: pressed > 0.5 ? PAL.mustard : PAL.paper, seed: hash(name) + 8, r: 24, ink: PAL.ink, inkWidth: 2.2, shadow: 1 - pressed * 0.7 });
    text(ctx, "Continue with SSO", 0, py + 1, { size: 27, color: PAL.ink });
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ props
export function envelope(ctx, o = {}) {
  const { w = 120, h = 80, seed = 1, fill = PAL.paper, seal = PAL.red, lock = false, denied = false, label = null } = o;
  paperRect(ctx, -w / 2, -h / 2, w, h, { fill, seed, r: 3, ink: PAL.ink, inkWidth: 1.8 });
  sketch(ctx, polyPts([[-w / 2 + 3, -h / 2 + 3], [0, h * 0.08], [w / 2 - 3, -h / 2 + 3]], false, 5), { width: 1.8, rough: 0.5, seed: seed + 1 });
  if (lock) lockIcon(ctx, 0, h * 0.12, w / 260);
  else paperCircle(ctx, 0, h * 0.08, w * 0.1, { fill: seal, seed: seed + 2, shadow: 0.4 });
  if (denied) cross(ctx, 0, h * 0.1, w * 0.24, { width: 4, boil: false });
  if (label) text(ctx, label, 0, h / 2 + 20, { size: 22 });
}

export function ticket(ctx, o = {}) {
  const { w = 110, h = 54, label = "CODE", sub = "60 s", fill = PAL.pink } = o;
  const pts = [
    [-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, -8], [w / 2 - 8, 0], [w / 2, 8], [w / 2, h / 2], [-w / 2, h / 2], [-w / 2, 8], [-w / 2 + 8, 0], [-w / 2, -8],
  ];
  paper(ctx, polyPts(pts, true, 6), { fill, seed: 150, torn: 1, ink: PAL.ink, inkWidth: 1.6 });
  sketch(ctx, linePts(w / 2 - 26, -h / 2 + 4, w / 2 - 26, h / 2 - 4, 4), { width: 1.5, dash: [4, 4], rough: 0.3, seed: 151 });
  text(ctx, label, -12, -3, { size: h * 0.4, font: "marker" });
  text(ctx, sub, w / 2 - 13, 0, { size: h * 0.3, rot: -Math.PI / 2 });
}

export function lockIcon(ctx, x, y, s = 1, o = {}) {
  const { fill = PAL.mustard } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * 2, s * 2);
  sketch(ctx, ellipsePts(0, -8, 9, 11, Math.PI, TAU, 3).concat([[9, -2]]), { width: 3.2, rough: 0.3, seed: 160 });
  sLine(ctx, -9, -8, -9, -2, { width: 3.2, rough: 0.3, seed: 161 });
  paperRect(ctx, -13, -3, 26, 20, { fill, seed: 162, r: 3, ink: PAL.ink, inkWidth: 1.4, shadow: 0.3 });
  paperCircle(ctx, 0, 6, 3, { fill: PAL.ink, seed: 163, shadow: 0, fringe: false, texture: 0 });
  ctx.restore();
}

export function keyIcon(ctx, x, y, s = 1, o = {}) {
  const { fill = PAL.mustard, rot = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  const bow = ellipsePts(-60, 0, 34, 34, 0, TAU * 0.98, 6);
  paper(ctx, bow, { fill, seed: 170, torn: 1, ink: PAL.ink, inkWidth: 3 });
  paperCircle(ctx, -60, 0, 14, { fill: PAL.kraft, seed: 171, shadow: 0, fringe: false });
  paper(ctx, polyPts([[-28, -9], [80, -9], [80, 9], [-28, 9]], true, 8), { fill, seed: 172, torn: 1, ink: PAL.ink, inkWidth: 3 });
  paper(ctx, polyPts([[50, 9], [62, 9], [62, 32], [50, 32]], true, 6), { fill, seed: 173, torn: 1, ink: PAL.ink, inkWidth: 2.4 });
  paper(ctx, polyPts([[68, 9], [80, 9], [80, 24], [68, 24]], true, 6), { fill, seed: 174, torn: 1, ink: PAL.ink, inkWidth: 2.4 });
  ctx.restore();
}

export function stickyNote(ctx, x, y, o = {}) {
  const { label = "", fill = PAL.yellow, rot = 0, s = 1, seed = 1, alpha = 1 } = o;
  if (alpha <= 0) return;
  place(ctx, "sticky" + seed, x, y, s, rot, 0.8);
  ctx.globalAlpha *= alpha;
  paper(ctx, polyPts([[-60, -56], [60, -56], [62, 50], [48, 60], [-60, 58]], true, 10), { fill, seed, torn: 0.8, shadow: 1.2 });
  paper(ctx, [[62, 50], [48, 60], [50, 48]], { fill: "rgba(0,0,0,0.12)", seed: seed + 1, shadow: 0, fringe: false, texture: 0 });
  text(ctx, label, 0, 4, { size: 30, color: PAL.inkSoft, maxWidth: 110 });
  ctx.restore();
}

export function appWindow(ctx, x, y, o = {}) {
  const { w = 230, h = 170, title = "App", color = PAL.sky, s = 1, rot = 0, seed = 1, ghost = 0, alpha = 1, typing = 0, t = 0 } = o;
  if (alpha <= 0) return;
  place(ctx, "win" + seed, x, y, s, rot, 0.7);
  ctx.globalAlpha *= alpha;
  const g = ghost;
  const mix = (c) => (g > 0.5 ? "#d9d6cf" : c);
  paperRect(ctx, -w / 2, -h / 2, w, h, { fill: g > 0.5 ? "#ece9e2" : PAL.paper, seed, r: 8, ink: PAL.ink, inkWidth: 2 });
  paperRect(ctx, -w / 2, -h / 2, w, 38, { fill: mix(color), seed: seed + 1, r: 8, shadow: 0 });
  for (let i = 0; i < 3; i++) paperCircle(ctx, -w / 2 + 16 + i * 16, -h / 2 + 19, 5, { fill: PAL.paper, seed: seed + 2 + i, shadow: 0, fringe: false });
  text(ctx, title, 12, -h / 2 + 20, { size: 26, font: "marker", color: PAL.ink });
  text(ctx, "username", -w / 2 + 18, -h / 2 + 66, { size: 20, align: "left", color: PAL.inkSoft });
  sLine(ctx, -w / 2 + 104, -h / 2 + 74, w / 2 - 16, -h / 2 + 74, { width: 1.8, seed: seed + 8, rough: 0.6 });
  text(ctx, "password", -w / 2 + 18, -h / 2 + 106, { size: 20, align: "left", color: PAL.inkSoft });
  sLine(ctx, -w / 2 + 104, -h / 2 + 114, w / 2 - 16, -h / 2 + 114, { width: 1.8, seed: seed + 9, rough: 0.6 });
  if (typing > 0) {
    const n = Math.floor(typing * 8);
    text(ctx, "•".repeat(n), -w / 2 + 108, -h / 2 + 104, { size: 22, align: "left" });
  }
  paperRect(ctx, w / 2 - 88, h / 2 - 40, 72, 28, { fill: mix(color), seed: seed + 10, r: 10, shadow: 0.4 });
  text(ctx, "log in", w / 2 - 52, h / 2 - 26, { size: 19 });
  ctx.restore();
}

export function ghostie(ctx, x, y, o = {}) {
  const { s = 1, t = 0, alpha = 1, seed = 1, label = null, erase = 0 } = o;
  if (alpha <= 0 || erase >= 1) return;
  const bobY = Math.sin(t * 2.4 + seed) * 8;
  place(ctx, "ghost" + seed, x, y + bobY, s, Math.sin(t * 1.7 + seed) * 0.06, 0.6);
  ctx.globalAlpha *= alpha * (1 - erase);
  const pts = ellipsePts(0, -40, 42, 44, Math.PI, TAU, 6);
  pts.push([42, 30]);
  for (let i = 0; i <= 6; i++) pts.push([42 - i * 14, 30 + (i % 2 ? 12 : 0) + Math.sin(t * 5 + i) * 3]);
  paper(ctx, pts, { fill: "#fdfcf8", seed: seed + 400, torn: 1, shadow: 0.8, ink: PAL.inkSoft, inkWidth: 1.8 });
  ctx.fillStyle = PAL.ink;
  ctx.beginPath();
  ctx.ellipse(-13, -44, 6, 9, 0, 0, TAU);
  ctx.ellipse(13, -44, 6, 9, 0, 0, TAU);
  ctx.fill();
  sEllipse(ctx, 0, -14, 6, 8, { width: 2.4, rough: 0.3, seed: seed + 401 });
  ctx.restore();
  if (label) nameTag(ctx, x, y + 70 * s + bobY, label, { size: 20, seed: seed + 9, fill: PAL.pink, alpha: alpha * (1 - erase) });
}

export function paperPlane(ctx, x, y, o = {}) {
  const { s = 1, rot = 0, fill = PAL.paper, seed = 1, alpha = 1, label = null } = o;
  if (alpha <= 0) return;
  place(ctx, "plane" + seed, x, y, s, rot, 0.4);
  ctx.globalAlpha *= alpha;
  paper(ctx, [[46, 0], [-40, -30], [-18, 0]], { fill, seed: seed + 1, torn: 0.6, ink: PAL.ink, inkWidth: 1.6 });
  paper(ctx, [[46, 0], [-18, 0], [-40, 22]], { fill: shade(fill), seed: seed + 2, torn: 0.6, ink: PAL.ink, inkWidth: 1.6 });
  ctx.restore();
  if (label) text(ctx, label, x, y + 40 * s, { size: 22 * s, alpha });
}

function shade(hex) {
  if (!hex.startsWith("#")) return hex;
  const n = parseInt(hex.slice(1), 16);
  const f = 0.82;
  const r = Math.floor(((n >> 16) & 255) * f), g = Math.floor(((n >> 8) & 255) * f), b = Math.floor((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

export function boat(ctx, x, y, o = {}) {
  const { s = 1, t = 0, rot = 0 } = o;
  place(ctx, "boat", x, y + Math.sin(t * 3) * 4, s, rot + Math.sin(t * 2.2) * 0.05, 0.5);
  paper(ctx, [[-80, -10], [80, -10], [56, 26], [-56, 26]], { fill: PAL.paper, seed: 180, torn: 1, ink: PAL.ink, inkWidth: 2 });
  sketch(ctx, linePts(-60, 6, 60, 6, 6), { width: 1.4, alpha: 0.5, seed: 181 });
  ctx.restore();
}

export function clipboard(ctx, x, y, o = {}) {
  const { s = 1, title = "Guest list", rows = [], progress = 1, rot = 0, highlight = -1, missing = null, seed = 1 } = o;
  place(ctx, "clip" + seed, x, y, s, rot, 0.6);
  paperRect(ctx, -110, -140, 220, 290, { fill: "#b88a5a", seed: seed + 190, r: 10, ink: PAL.ink, inkWidth: 2 });
  paperRect(ctx, -94, -118, 188, 256, { fill: PAL.paper, seed: seed + 191, r: 3, shadow: 0.5 });
  paperRect(ctx, -40, -150, 80, 30, { fill: "#8c96a0", seed: seed + 192, r: 6, ink: PAL.ink, inkWidth: 1.6 });
  text(ctx, title, 0, -92, { size: 28, font: "marker" });
  sLine(ctx, -80, -72, 80, -72, { width: 2, seed: seed + 193, rough: 0.6 });
  rows.forEach((row, i) => {
    const p = clamp(progress * rows.length - i);
    if (p <= 0) return;
    const ry = -44 + i * 40;
    text(ctx, row.name, -70, ry, { size: 25, align: "left", progress: p, color: row.dim ? PAL.grey : PAL.ink });
    if (row.ok) check(ctx, 72, ry, 26, { progress: clamp(p * 2 - 1), width: 4 });
    if (i === highlight) sketch(ctx, ellipsePts(0, ry, 96, 18, -2.4, -2.4 + TAU * 1.08), { color: PAL.red, width: 3, seed: 199 });
  });
  if (missing) {
    const ry = -44 + rows.length * 40;
    text(ctx, missing.name, -70, ry, { size: 25, align: "left", color: PAL.red, progress: missing.p });
    if (missing.p >= 1) cross(ctx, 72, ry, 24, { progress: missing.x ?? 1, width: 4 });
  }
  ctx.restore();
}

export function magnifier(ctx, x, y, s = 1, rot = 0.6) {
  place(ctx, "mag", x, y, s, rot, 0.5);
  paperRect(ctx, 60, -12, 110, 24, { fill: "#6b4a33", seed: 210, r: 10, ink: PAL.ink, inkWidth: 2 });
  ctx.save();
  ctx.globalAlpha *= 0.25;
  ctx.fillStyle = "#cfeaf7";
  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, TAU);
  ctx.fill();
  ctx.restore();
  sEllipse(ctx, 0, 0, 64, 64, { width: 9, color: "#3d3a44", seed: 211, rough: 0.6 });
  sketch(ctx, ellipsePts(0, 0, 44, 44, -2.6, -1.8), { width: 5, color: "#fff", alpha: 0.8, seed: 212 });
  ctx.restore();
}

export function rosette(ctx, x, y, label, o = {}) {
  const { s = 1, fill = PAL.mustard, rot = 0, seed = 1 } = o;
  place(ctx, "ros" + label, x, y, s, rot, 0.5);
  paper(ctx, [[-22, 20], [-34, 90], [-16, 76], [-4, 94], [0, 22]], { fill: PAL.red, seed: seed + 1, torn: 0.8 });
  paper(ctx, [[22, 20], [34, 90], [16, 76], [4, 94], [0, 22]], { fill: PAL.navy, seed: seed + 2, torn: 0.8 });
  const pts = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU;
    const r = i % 2 ? 50 : 58;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  paper(ctx, pts, { fill, seed: seed + 3, torn: 0.6, ink: PAL.ink, inkWidth: 2 });
  paperCircle(ctx, 0, 0, 40, { fill: PAL.paper, seed: seed + 4, shadow: 0.3 });
  text(ctx, label, 0, 2, { size: label.length > 6 ? 18 : 22, font: "marker" });
  ctx.restore();
}

export function phone(ctx, x, y, o = {}) {
  const { s = 1, rot = 0, approve = 0, buzz = 0, t = 0 } = o;
  const shake = buzz ? Math.sin(t * 50) * 3 * buzz : 0;
  place(ctx, "phone", x + shake, y, s, rot, 0.5);
  paperRect(ctx, -60, -110, 120, 220, { fill: PAL.ink, seed: 220, r: 18, shadow: 1 });
  paperRect(ctx, -50, -94, 100, 182, { fill: "#f6f3ea", seed: 221, r: 8, shadow: 0, fringe: false });
  text(ctx, "Approve\nsign-in?", 0, -48, { size: 24, lineHeight: 1 });
  const pressed = approve > 0.5;
  paperRect(ctx, -38, 4, 76, 36, { fill: pressed ? PAL.aircall : PAL.mint, seed: 222, r: 14, shadow: pressed ? 0.2 : 0.7 });
  text(ctx, pressed ? "✓" : "Yes", 0, 22, { size: pressed ? 30 : 24, font: pressed ? "block" : "hand", color: pressed ? PAL.paper : PAL.ink });
  paperRect(ctx, -38, 48, 76, 30, { fill: "#f3d2cb", seed: 223, r: 14, shadow: 0.5 });
  text(ctx, "No", 0, 63, { size: 20 });
  ctx.restore();
  if (buzz) {
    for (const sd of [-1, 1]) {
      sLine(ctx, x + sd * 76 * s, y - 40 * s, x + sd * 90 * s, y - 50 * s, { width: 3, alpha: buzz, seed: 224 + sd });
      sLine(ctx, x + sd * 78 * s, y - 10 * s, x + sd * 94 * s, y - 10 * s, { width: 3, alpha: buzz, seed: 226 + sd });
    }
  }
}

export function finger(ctx, x, y, s = 1, rot = -0.5) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  paper(ctx, polyPts([[-12, 0], [-12, 90], [12, 90], [12, 0]], true, 8).concat([]), { fill: PAL.skin, seed: 230, ink: PAL.ink, inkWidth: 1.6 });
  paperCircle(ctx, 0, 0, 12, { fill: PAL.skin, seed: 231, shadow: 0, ink: PAL.ink, inkWidth: 1.4 });
  paperRect(ctx, -30, 70, 60, 60, { fill: PAL.teal, seed: 232, r: 10 });
  ctx.restore();
}

export function stopwatch(ctx, x, y, s = 1, p = 1, label = "0.4 s") {
  place(ctx, "watch", x, y, s, -0.08, 0.6);
  paperRect(ctx, -12, -84, 24, 18, { fill: PAL.red, seed: 240, r: 4 });
  paperCircle(ctx, 0, 0, 70, { fill: PAL.paper, seed: 241, ink: PAL.ink, inkWidth: 3 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    sLine(ctx, Math.cos(a) * 56, Math.sin(a) * 56, Math.cos(a) * 64, Math.sin(a) * 64, { width: 2.4, seed: 242 + i, rough: 0.3 });
  }
  const a = -Math.PI / 2 + p * TAU * 0.12;
  sLine(ctx, 0, 0, Math.cos(a) * 48, Math.sin(a) * 48, { width: 4, color: PAL.red, seed: 260, rough: 0.3 });
  text(ctx, label, 0, 28, { size: 26, font: "marker" });
  ctx.restore();
}

export function lever(ctx, x, y, s = 1, p = 0) {
  place(ctx, "lever", x, y, s, 0, 0.5);
  ctx.save();
  ctx.translate(0, -30);
  ctx.rotate(-0.7 + p * 1.4);
  sLine(ctx, 0, 0, 0, -86, { width: 8, seed: 270, color: "#3d3a44", passes: 1 });
  paperCircle(ctx, 0, -92, 16, { fill: PAL.red, seed: 271, ink: PAL.ink, inkWidth: 2 });
  ctx.restore();
  paperRect(ctx, -60, -40, 120, 44, { fill: PAL.navy, seed: 272, r: 8, ink: PAL.ink, inkWidth: 2 });
  text(ctx, p > 0.5 ? "LEFT" : "ACTIVE", 0, -17, { size: 20, font: "marker", color: PAL.paper });
  ctx.restore();
}

export function coin(ctx, x, y, s = 1, seed = 1) {
  place(ctx, "coin" + seed, x, y, s, 0, 0.4);
  paperCircle(ctx, 0, 0, 18, { fill: PAL.mustard, seed: 280 + seed, ink: PAL.ink, inkWidth: 1.6, shadow: 0.5 });
  text(ctx, "$", 0, 2, { size: 24, font: "marker" });
  ctx.restore();
}

export function speech(ctx, x, y, label, o = {}) {
  const { w = 260, h = 90, tail = [-60, 70], fill = PAL.paper, size = 30, alpha = 1, font = "hand", seed = 1, s = 1 } = o;
  if (alpha <= 0) return;
  place(ctx, "sp" + seed, x, y, s, 0, 0.5);
  ctx.globalAlpha *= alpha;
  const body = roundRectPts(-w / 2, -h / 2, w, h, 26);
  paper(ctx, [[tail[0] * 0.3 - 14, h / 2 - 6], [tail[0], tail[1]], [tail[0] * 0.3 + 18, h / 2 - 6]], { fill, seed: seed + 1, torn: 0.6, ink: PAL.ink, inkWidth: 2 });
  paper(ctx, body, { fill, seed, torn: 0.8, ink: PAL.ink, inkWidth: 2 });
  text(ctx, label, 0, 2, { size, font, lineHeight: 1.05 });
  ctx.restore();
}

export function capsule(ctx, x, y, rot, o = {}) {
  const { glow = 0, fill = PAL.mustard } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (glow) {
    ctx.fillStyle = `rgba(255,230,120,${0.5 * glow})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 58, 36, 0, 0, TAU);
    ctx.fill();
  }
  paperRect(ctx, -34, -16, 68, 32, { fill, seed: 290, r: 15, ink: PAL.ink, inkWidth: 2, shadow: 0.4 });
  paperRect(ctx, -6, -16, 12, 32, { fill: "#8c96a0", seed: 291, r: 2, shadow: 0, fringe: false });
  ctx.restore();
}

export function personCard(ctx, x, y, o = {}) {
  const { name, role, fill = PAL.paper, s = 1, rot = 0, seed = 1, status = null, alpha = 1, shirt = PAL.teal, hair = "#4a2f25" } = o;
  if (alpha <= 0) return;
  place(ctx, "card" + seed, x, y, s, rot, 0.6);
  ctx.globalAlpha *= alpha;
  paperRect(ctx, -80, -52, 160, 104, { fill, seed: seed + 500, r: 6, ink: PAL.ink, inkWidth: 1.8 });
  paperCircle(ctx, -46, -8, 22, { fill: PAL.skin, seed: seed + 501, shadow: 0.2 });
  paper(ctx, ellipsePts(-46, -12, 24, 22, Math.PI, TAU, 5), { fill: hair, seed: seed + 502, shadow: 0 });
  paper(ctx, ellipsePts(-46, 30, 26, 16, Math.PI, TAU, 5), { fill: shirt, seed: seed + 503, shadow: 0 });
  text(ctx, name, 18, -18, { size: 26, font: "marker" });
  text(ctx, role, 18, 14, { size: 20, color: PAL.inkSoft });
  tape(ctx, 0, -52, 50, 0.08, seed + 504);
  ctx.restore();
  if (status) imprint(ctx, x + 36 * s, y + 30 * s, status.label, { color: status.color, s: status.s ?? 1, alpha: status.a ?? 1, size: 24, rot: -0.2 });
}

/** Scrapbook "polaroid" with a caption, used on the finale page. */
export function polaroid(ctx, x, y, o = {}) {
  const { w = 280, h = 230, caption = "", rot = 0, seed = 1, s = 1, draw = null, alpha = 1 } = o;
  if (alpha <= 0) return;
  place(ctx, "pol" + seed, x, y, s, rot, 0.6);
  ctx.globalAlpha *= alpha;
  paperRect(ctx, -w / 2, -h / 2, w, h, { fill: "#fffdf7", seed: seed + 600, r: 3, shadow: 1.3 });
  const iw = w - 28, ih = h - 76;
  paperRect(ctx, -iw / 2, -h / 2 + 14, iw, ih, { fill: "#e9f1f4", seed: seed + 601, r: 2, shadow: 0, fringe: false });
  if (draw) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-iw / 2, -h / 2 + 14, iw, ih);
    ctx.clip();
    ctx.translate(0, -h / 2 + 14 + ih / 2);
    draw(ctx);
    ctx.restore();
  }
  text(ctx, caption, 0, h / 2 - 30, { size: 30 });
  tape(ctx, -w / 2 + 20, -h / 2 + 4, 70, -0.6, seed + 602);
  tape(ctx, w / 2 - 20, -h / 2 + 4, 70, 0.6, seed + 603);
  ctx.restore();
}

export function questionBubble(ctx, x, y, s = 1, seed = 1, t = 0) {
  const b = Math.sin(t * 4 + seed) * 5;
  place(ctx, "qb" + seed, x, y + b, s, Math.sin(t * 3 + seed) * 0.08, 0.5);
  paperCircle(ctx, 0, 0, 30, { fill: PAL.paper, seed: seed + 700, ink: "#2458d6", inkWidth: 3 });
  text(ctx, "?", 0, 2, { size: 40, font: "marker", color: "#2458d6" });
  ctx.restore();
}

export function sun(ctx, x, y, r, t) {
  place(ctx, "sun", x, y, 1, t * 0.1, 0.5);
  const pts = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const rr = i % 2 ? r : r * 1.3;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  paper(ctx, pts, { fill: PAL.mustard, seed: 800, torn: 1 });
  paperCircle(ctx, 0, 0, r * 0.85, { fill: PAL.yellow, seed: 801, shadow: 0.2 });
  ctx.restore();
}

export function cloud(ctx, x, y, s = 1, seed = 1) {
  place(ctx, "cloud" + seed, x, y, s, 0, 0.4);
  const pts = [];
  const bumps = [[-60, 0, 36], [-20, -24, 44], [30, -18, 40], [66, 4, 30]];
  for (const [bx, by, r] of bumps) pts.push(...ellipsePts(bx, by, r, r * 0.9, Math.PI * 0.9, Math.PI * 2.1, 8));
  pts.push([90, 24], [-90, 24]);
  paper(ctx, pts, { fill: "#fffdf7", seed: seed + 900, torn: 1.2, shadow: 0.6 });
  ctx.restore();
}

export { place, lerp };
