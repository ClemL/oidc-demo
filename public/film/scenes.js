// Scene choreography. render(ctx, t) draws the frame at time t (seconds).
// Everything is a pure function of t so the film can be scrubbed freely.
import {
  W, H, TAU, PAL, state, E, clamp, lerp, seg, pulse, bez, bezAngle, rng, hash, jitter,
  sketch, sLine, paper, paperRect, paperCircle, tape, text, ransom, arrow, check, cross,
  circleDoodle, star, sparkle, burst, confetti, linePts, polyPts, ellipsePts, bezPts, roundRectPts, blobPts, measure,
} from "./core.js";
import * as A from "./actors.js";
import { CHAPTERS } from "./script.js";

// ------------------------------------------------------------ world layout
const IDP = { x: 1200, y: 480, s: 0.9 };
const AIR = { gate: [600, 960], perch: [745, 827], alex: [612, 1045], guard: [860, 1032] };
const LAT = { gate: [1800, 960], perch: [1945, 827], alex: [1812, 1045], guard: [2070, 1032] };
const COUNTER_L = [1112, 368];
const COUNTER_R = [1290, 368];
const ISLETS = [
  { name: "Notion", x: 200, y: 330, seed: 51, color: "#e9e6df" },
  { name: "Wrike", x: 2200, y: 340, seed: 52, color: PAL.mint },
  { name: "Figma", x: 2230, y: 1250, seed: 53, color: PAL.pink },
];
const TUBE_A = [[830, 1100], [960, 1250], [1150, 1230], [1235, 590]];
const TUBE_L = [[1770, 1100], [1640, 1250], [1300, 1230], [1265, 590]];

const CAM = [
  [40, 1200, 690, 0.64],
  [55.3, 1200, 660, 0.7],
  [58.3, 640, 930, 1.45],
  [69.0, 640, 930, 1.45],
  [71.8, 1300, 360, 1.42],
  [85.9, 1300, 360, 1.42],
  [89.4, 640, 930, 1.45],
  [93.0, 640, 930, 1.45],
  [94.8, 1000, 690, 0.8],
  [120.0, 1000, 690, 0.8],
  [121.6, 1150, 860, 0.8],
  [124.2, 1560, 860, 0.9],
  [125.6, 1540, 690, 0.82],
  [131.2, 1540, 690, 0.82],
  [132.6, 1860, 880, 1.15],
  [137.6, 1860, 880, 1.15],
  [139.6, 880, 700, 0.9],
  [150.6, 880, 700, 0.9],
  [152.6, 1200, 690, 0.64],
  [173, 1200, 690, 0.67],
];

function camAt(t) {
  if (t <= CAM[0][0]) return CAM[0].slice(1);
  for (let i = 0; i < CAM.length - 1; i++) {
    const a = CAM[i], b = CAM[i + 1];
    if (t <= b[0]) {
      const p = E.inOut(clamp((t - a[0]) / (b[0] - a[0])));
      // zoom interpolated in log space feels natural
      return [lerp(a[1], b[1], p), lerp(a[2], b[2], p), Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), p))];
    }
  }
  return CAM[CAM.length - 1].slice(1);
}

// ------------------------------------------------------------ helpers
function flight(t, a, b, from, to, lift = 260) {
  const p = seg(t, a, b, E.inOut);
  const c1 = [lerp(from[0], to[0], 0.25), Math.min(from[1], to[1]) - lift];
  const c2 = [lerp(from[0], to[0], 0.75), Math.min(from[1], to[1]) - lift];
  const [x, y] = bez(from, c1, c2, to, p);
  const ang = bezAngle(from, c1, c2, to, p);
  const face = to[0] >= from[0] ? 1 : -1;
  const rot = face > 0 ? ang * 0.3 : (ang - Math.PI) * 0.3;
  return { x, y, face, rot, p };
}

const within = (t, a, b) => t >= a && t < b;

function popScale(t, a, dur = 0.5) {
  return E.outBack(clamp((t - a) / dur));
}

// ------------------------------------------------------------ main
export function render(ctx, t) {
  ctx.drawImage(state.kraft, 0, 0, W, H);
  const [fx, fy] = jitter("frame", 0.45);
  ctx.save();
  ctx.translate(fx, fy);

  if (t < 12) sceneTitle(ctx, t);
  else if (t < 40) sceneProblem(ctx, t);
  else if (t < 173) sceneWorld(ctx, t);
  else sceneFinale(ctx, t);

  ctx.restore();

  wipe(ctx, t, 12, 1);
  wipe(ctx, t, 40, 2);
  wipe(ctx, t, 173, 8);
  chapterTag(ctx, t);
  grain(ctx);
  // fade in from black at the very start
  const fin = 1 - seg(t, 0, 0.8, E.out);
  if (fin > 0) {
    ctx.fillStyle = `rgba(28,22,16,${fin})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function grain(ctx) {
  if (!state.grain) return;
  const r = rng(state.boil * 17 + 3);
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.globalCompositeOperation = "overlay";
  const ox = -Math.floor(r() * 256), oy = -Math.floor(r() * 256);
  for (let x = ox; x < W; x += 256) for (let y = oy; y < H; y += 256) ctx.drawImage(state.grain, x, y);
  ctx.restore();
}

// Torn-paper wipe between big scenes, carrying the chapter title.
function wipe(ctx, t, b, chapterIndex) {
  const a0 = b - 1.1, a1 = b + 1.1;
  if (t < a0 || t > a1) return;
  const p = seg(t, a0, a1, E.inOut);
  const sw = W * 1.5;
  const x = lerp(-sw - 40, W + 40, p);
  const colors = { 1: PAL.mustard, 2: PAL.sky, 8: PAL.pink };
  const fill = colors[chapterIndex] ?? PAL.cream;
  const pts = [];
  const r = rng(chapterIndex * 13);
  for (let i = 0; i <= 30; i++) pts.push([x + sw + (r() - 0.5) * 34 + Math.sin(i * 1.7) * 10, -40 + (i / 30) * (H + 80)]);
  for (let i = 30; i >= 0; i--) pts.push([x + (r() - 0.5) * 34 + Math.sin(i * 2.1) * 10, -40 + (i / 30) * (H + 80)]);
  paper(ctx, pts, { fill, seed: 900 + chapterIndex, torn: 3, shadow: 2.2 });
  const ch = CHAPTERS[chapterIndex];
  if (!ch) return;
  const cx = x + sw / 2;
  ctx.save();
  ctx.translate(cx, H / 2);
  ctx.rotate(-0.03);
  text(ctx, `chapter ${chapterIndex + 1}`, 0, -70, { size: 44, color: PAL.inkSoft });
  text(ctx, ch.title, 0, 10, { size: 92, font: "marker" });
  sketch(ctx, linePts(-260, 80, 260, 74), { width: 5, color: PAL.red, seed: 902 + chapterIndex });
  ctx.restore();
}

// Small corner label for chapters inside the world.
function chapterTag(ctx, t) {
  CHAPTERS.forEach((c, i) => {
    if (![3, 4, 5, 6, 7].includes(i)) return;
    const a = c.t + 0.3, b = c.t + 4.2;
    if (t < a || t > b) return;
    const inP = seg(t, a, a + 0.6, E.outBack), outP = seg(t, b - 0.5, b, E.in);
    const x = lerp(-420, 40, inP) - outP * 460;
    ctx.save();
    ctx.translate(x, 58);
    ctx.rotate(-0.02);
    const label = `ch. ${i + 1} · ${c.title}`;
    const w = measure(ctx, label, 36) + 50;
    paperRect(ctx, 0, -32, w, 64, { fill: PAL.paper, seed: 950 + i, r: 4, shadow: 1 });
    tape(ctx, w - 10, -30, 60, 0.5, 960 + i);
    text(ctx, label, 25, 2, { size: 36, align: "left" });
    ctx.restore();
  });
}

// ============================================================ 1. title
function sceneTitle(ctx, t) {
  // doodled stars around
  const r = rng(5);
  for (let i = 0; i < 9; i++) {
    const x = 80 + r() * 1440, y = 60 + r() * 780;
    if (Math.abs(x - 800) < 560 && Math.abs(y - 430) < 300) continue;
    const s = popScale(t, 1.6 + i * 0.12);
    if (s > 0) star(ctx, x, y, 22 * s, { fill: [PAL.yellow, PAL.pink, PAL.sky, PAL.mint][i % 4], rot: r() * 2, seed: 30 + i });
  }
  const sheetIn = seg(t, 0.1, 0.9, E.out);
  ctx.save();
  ctx.translate(800, 440 + (1 - sheetIn) * 40);
  ctx.rotate(-0.015);
  ctx.globalAlpha = sheetIn;
  paperRect(ctx, -560, -290, 1120, 560, { fill: PAL.paper, seed: 1, r: 4, shadow: 1.6 });
  // notebook lines
  for (let i = 0; i < 11; i++) sLine(ctx, -530, -220 + i * 46, 530, -220 + i * 46, { color: "#9cc3de", width: 1.4, alpha: 0.6, seed: 10 + i, rough: 0.6 });
  sLine(ctx, -470, -280, -470, 262, { color: "#e89a9a", width: 1.6, alpha: 0.7, seed: 25, rough: 0.6 });
  tape(ctx, -520, -280, 120, -0.6, 2);
  tape(ctx, 520, -280, 120, 0.6, 3);
  tape(ctx, 0, 272, 140, 0.04, 4);
  ctx.restore();

  ransom(ctx, "SINGLE SIGN-ON", 800, 318, { size: 80, t: seg(t, 0.5, 3.4, E.linear), seed: 21 });
  text(ctx, "a tale of keys, passports & one very busy pigeon", 800, 452, {
    size: 50, progress: seg(t, 3.1, 5.3, E.linear), color: PAL.inkSoft,
  });
  sketch(ctx, linePts(430, 488, 1170, 482), { width: 4, color: PAL.red, progress: seg(t, 5.0, 5.8), seed: 40 });

  // the key swings in
  const kp = seg(t, 1.0, 2.4, E.outBack);
  if (kp > 0) A.keyIcon(ctx, lerp(-100, 420, kp), lerp(760, 610, kp), 1.35, { rot: lerp(-2, -0.3, kp) + Math.sin(t * 1.5) * 0.05 });

  // an APPROVED stamp thunks onto the page
  const st = seg(t, 2.6, 2.8, E.out);
  if (st > 0) {
    A.imprint(ctx, 820, 620, "APPROVED", { color: PAL.aircall, s: lerp(1.9, 1, st), alpha: st, size: 34, rot: -0.12 });
    burst(ctx, 820, 620, 120, seg(t, 2.6, 3.3), { seed: 41 });
  }

  // the pigeon delivers a letter, then heads off
  if (within(t, 5.2, 7.2)) {
    const f = flight(t, 5.2, 7.2, [-160, 260], [1150, 640], 140);
    A.pigeon(ctx, { x: f.x, y: f.y, s: 1.05, t, flying: true, face: 1, rot: f.rot, cargo: "envelope" });
  } else if (within(t, 7.2, 10.3)) {
    ctx.save();
    ctx.translate(1060, 668);
    ctx.rotate(-0.12);
    A.envelope(ctx, { w: 110, h: 72, seed: 44, lock: true });
    ctx.restore();
    A.pigeon(ctx, { x: 1180, y: 630, s: 1.05, t, face: -1 });
  } else if (within(t, 10.3, 12)) {
    ctx.save();
    ctx.translate(1060, 668);
    ctx.rotate(-0.12);
    A.envelope(ctx, { w: 110, h: 72, seed: 44, lock: true });
    ctx.restore();
    const f = flight(t, 10.3, 11.8, [1180, 630], [1800, 120], 60);
    A.pigeon(ctx, { x: f.x, y: f.y, s: 1.05, t, flying: true, face: 1, rot: f.rot });
  }
  if (within(t, 7.4, 10.2)) A.speech(ctx, 1270, 500, "coo!", { w: 120, h: 70, tail: [-50, 60], seed: 45, s: popScale(t, 7.4, 0.4) });

  // "try it" sticky
  const sp = popScale(t, 8.0, 0.6);
  if (sp > 0) {
    A.stickyNote(ctx, 1450, 620, { label: "", fill: PAL.yellow, rot: 0.06, s: sp * 1.6, seed: 70 });
    text(ctx, "the lab below\nis real —\ntry it!", 1450, 612, { size: 38, rot: 0.06, progress: seg(t, 8.4, 9.8, E.linear), color: PAL.inkSoft, lineHeight: 1.0 });
    arrow(ctx, [1480, 720], [1540, 860], { progress: seg(t, 9.6, 10.4), color: PAL.red, bend: -0.3, seed: 72, width: 4.5 });
  }
}

// ============================================================ 2. problem
const APPS = [
  { title: "Aircall", color: PAL.aircall, x: 250, y: 175, rot: -0.06, ghost: true, s: 1.3 },
  { title: "Lattice", color: PAL.lattice, x: 615, y: 150, rot: 0.04, ghost: true, s: 1.3 },
  { title: "Notion", color: "#d8d4cc", x: 985, y: 160, rot: -0.03, ghost: false, s: 1.3 },
  { title: "Wrike", color: PAL.mint, x: 1350, y: 190, rot: 0.05, ghost: false, s: 1.3 },
  { title: "Figma", color: PAL.pink, x: 230, y: 480, rot: 0.05, ghost: true, s: 1.3 },
  { title: "Teams", color: PAL.sky, x: 1370, y: 490, rot: -0.05, ghost: true, s: 1.3 },
  { title: "Payroll", color: PAL.yellow, x: 540, y: 440, rot: -0.08, s: 0.95, ghost: false },
  { title: "Expenses", color: PAL.coral, x: 1065, y: 430, rot: 0.07, s: 0.95, ghost: false },
];
const NOTE_SPOTS = [[330, 250], [700, 225], [1065, 235], [1430, 280], [250, 560], [1390, 575], [625, 650], [985, 630], [790, 720], [440, 700], [1160, 700]];
const NOTES = ["Password1!", "aircall2024", "lattice?!", "hunter2", "Spring#25", "figma_ok", "wrike123", "notion!!", "P@ssw0rd", "same as\nthe rest", "don't\nforget!"];

function sceneProblem(ctx, t) {
  const leave = seg(t, 28.9, 31.6, E.inOut);
  const greyed = seg(t, 30.2, 31.2);

  // app windows
  APPS.forEach((a, i) => {
    const s = popScale(t, 12.9 + i * 0.55, 0.55) * (a.s ?? 1);
    if (s <= 0) return;
    const typing = within(t, 17.5, 23) ? ((t * 1.3 + i * 0.37) % 1) : 0;
    A.appWindow(ctx, a.x, a.y, { title: a.title, color: a.color, s, rot: a.rot, seed: 100 + i * 10, ghost: a.ghost ? greyed : 0, typing, alpha: a.ghost ? 1 : 1 - greyed * 0.5 });
  });

  // desk strip with props
  paper(ctx, polyPts([[-40, 800], [1640, 790], [1640, 940], [-40, 940]], true, 40), { fill: "#b88a5a", seed: 160, torn: 3, shadow: 1.4 });
  sLine(ctx, -20, 816, 1620, 806, { width: 2, alpha: 0.4, seed: 161 });
  // mug
  paperRect(ctx, 1150, 720, 70, 86, { fill: PAL.coral, seed: 162, r: 8, ink: PAL.ink, inkWidth: 2 });
  sketch(ctx, ellipsePts(1224, 762, 18, 22, -1.4, 1.4), { width: 6, color: PAL.coral, seed: 163, passes: 1 });
  for (let i = 0; i < 3; i++) sketch(ctx, [[1165 + i * 20, 705], [1160 + i * 20, 685], [1170 + i * 20, 665], [1163 + i * 20, 645]], { width: 3, alpha: 0.5 + 0.3 * Math.sin(t * 3 + i), seed: 164 + i, color: "#fffaf0" });
  // plant
  paperRect(ctx, 390, 730, 90, 76, { fill: PAL.mustard, seed: 170, r: 6, ink: PAL.ink, inkWidth: 2 });
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.45 + Math.sin(t * 1.4 + i) * 0.04;
    paper(ctx, [[435, 730], [435 + Math.cos(a - 0.2) * 50, 730 + Math.sin(a - 0.2) * 50], [435 + Math.cos(a) * 95, 730 + Math.sin(a) * 95], [435 + Math.cos(a + 0.2) * 50, 730 + Math.sin(a + 0.2) * 50]], { fill: i % 2 ? PAL.grass : PAL.grassDark, seed: 171 + i, torn: 0.8, shadow: 0.4 });
  }

  // Alex
  const mood = t < 19 ? "happy" : t < 22.4 ? "neutral" : t < 25.4 ? "stressed" : t < 28 ? "dizzy" : "happy";
  const ax = lerp(800, 1820, leave);
  const pose = within(t, 28.1, 29.2) ? "wave" : t < 17.5 ? "down" : within(t, 17.5, 22.5) ? "type" : "down";
  A.person(ctx, {
    x: ax, y: 870, s: 1.55, t, id: "alex", mood, pose, badge: "ALEX",
    walk: leave > 0 && leave < 1 ? t * 9 : null, face: 1,
  });
  const hi = popScale(t, 12.6, 0.5);
  if (hi > 0 && t < 17.4) A.speech(ctx, 1010, 470, "hi! I'm Alex", { w: 240, h: 84, tail: [-120, 60], s: hi, seed: 140 });
  if (within(t, 28.2, 30.2)) A.speech(ctx, ax + 230, 460, "bye! last day :)", { w: 250, h: 80, tail: [-110, 60], seed: 141, s: popScale(t, 28.2, 0.4) });

  // password counter
  const cp = popScale(t, 17.6, 0.5);
  if (cp > 0 && t < 30) {
    const n = Math.max(1, Math.round(lerp(1, 17, seg(t, 17.8, 22.4, E.out))));
    ctx.save();
    ctx.translate(1480, 700);
    ctx.scale(cp, cp);
    ctx.rotate(0.06);
    paperCircle(ctx, 0, 0, 82, { fill: PAL.red, seed: 150, ink: PAL.ink, inkWidth: 2.5 });
    text(ctx, String(n), 0, -6, { size: 74, font: "marker", color: PAL.paper });
    text(ctx, "passwords", 0, 44, { size: 26, color: PAL.paper });
    ctx.restore();
  }

  // sticky notes swarm
  NOTES.forEach((label, i) => {
    const a = 22.9 + i * 0.42;
    const p = seg(t, a, a + 0.55, E.outBack);
    if (p <= 0) return;
    const r = rng(200 + i);
    const [tx, ty] = NOTE_SPOTS[i];
    const ang = r() * TAU;
    const sx = 800 + Math.cos(ang) * 1100, sy = 450 + Math.sin(ang) * 800;
    const fall = seg(t, 29.6 + i * 0.05, 30.8 + i * 0.05, E.in);
    const x = lerp(sx, tx, p) + (ax - 800) * 0.0, y = lerp(sy, ty, p) + fall * 700;
    A.stickyNote(ctx, x, y, {
      label, fill: [PAL.yellow, PAL.pink, PAL.mint, PAL.sky][i % 4], rot: (r() - 0.5) * 0.6 + fall * 1.2, s: 0.9, seed: 210 + i, alpha: 1 - fall,
    });
  });

  // ghosts rise from abandoned accounts
  const ghosts = APPS.filter((a) => a.ghost);
  ghosts.forEach((a, i) => {
    const gp = seg(t, 31.2 + i * 0.5, 32.4 + i * 0.5, E.out);
    if (gp <= 0) return;
    const gx = a.x + 40, gy = a.y + 10 - gp * 70;
    A.ghostie(ctx, gx, gy, { s: 1.25 * gp, t, seed: 300 + i, alpha: gp });
    // dripping coins: still paid for
    if (t > 33.7) {
      for (let k = 0; k < 3; k++) {
        const c = ((t - 33.7) * 0.9 + k / 3 + i * 0.21) % 1;
        ctx.save();
        ctx.globalAlpha = 1 - c;
        A.coin(ctx, gx + (k - 1) * 26, gy + 70 + c * 170, 1.5, i * 5 + k);
        ctx.restore();
      }
    }
  });
  const g1 = seg(t, 33.8, 34.4, E.outBack);
  if (g1 > 0) A.nameTag(ctx, 800, 330, "still paid for", { size: 46, fill: PAL.yellow, seed: 320, rot: -0.05 });
  const g2 = seg(t, 36.2, 36.8, E.outBack);
  if (g2 > 0) {
    A.nameTag(ctx, 800, 620, "still able to log in!", { size: 46, fill: PAL.pink, seed: 321, rot: 0.04 });
    A.keyIcon(ctx, 800, 720, 0.8 * g2, { rot: -0.2 + Math.sin(t * 3) * 0.1 });
    arrow(ctx, [580, 610], [330, 470], { progress: seg(t, 36.8, 37.6), color: PAL.red, seed: 322, width: 4.5 });
    arrow(ctx, [1020, 600], [1330, 470], { progress: seg(t, 37.0, 37.8), color: PAL.red, seed: 323, bend: -0.25, width: 4.5 });
  }
}

// ============================================================ 3-7. the world
function sceneWorld(ctx, t) {
  const [cx, cy, z] = camAt(t);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(z, z);
  ctx.translate(-cx, -cy);

  sea(ctx, t);
  tubes(ctx, t);
  islets(ctx, t);
  idpIsland(ctx, t);
  aircallIsland(ctx, t);
  latticeIsland(ctx, t);
  trustLines(ctx, t);
  boatRide(ctx, t);
  characters(ctx, t);
  idpProps(ctx, t);
  scim(ctx, t);
  birds(ctx, t);

  ctx.restore();
  passportPage(ctx, t);
}

function sea(ctx, t) {
  paper(ctx, [[-600, -500], [3000, -500], [3000, 1900], [-600, 1900]], { fill: PAL.sea, seed: 400, shadow: 0, fringe: false, texture: 0.7 });
  const r = rng(401);
  for (let i = 0; i < 90; i++) {
    const bx = -300 + r() * 3000, by = -250 + r() * 1900;
    const x = ((bx + t * 14 + 3000) % 3000) - 300;
    const pts = [];
    for (let k = 0; k <= 10; k++) pts.push([x + k * 5, by + Math.sin(k * 0.9 + t * 2 + i) * 4]);
    sketch(ctx, pts, { color: "#e8f4fb", width: 3, alpha: 0.7, seed: 410 + i, rough: 0.8 });
  }
}

function islets(ctx, t) {
  ISLETS.forEach((it, i) => {
    const s = popScale(t, 42.2 + i * 0.25, 0.6);
    if (s <= 0) return;
    A.island(ctx, { x: it.x, y: it.y, rx: 130, ry: 64, seed: it.seed, s });
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.scale(s, s);
    sLine(ctx, 0, -10, 0, -110, { width: 4, seed: it.seed + 1 });
    const fl = [];
    for (let k = 0; k <= 8; k++) fl.push([k * 13, -108 + Math.sin(t * 4 - k * 0.6) * 4 * (k / 8)]);
    for (let k = 8; k >= 0; k--) fl.push([k * 13, -66 + Math.sin(t * 4 - k * 0.6) * 4 * (k / 8)]);
    paper(ctx, fl, { fill: it.color, seed: it.seed + 2, torn: 0.8, ink: PAL.ink, inkWidth: 1.6 });
    text(ctx, it.name, 52, -86, { size: 26, font: "marker" });
    ctx.restore();
  });
}

function idpIsland(ctx, t) {
  const s = popScale(t, 40.7, 0.7);
  if (s <= 0) return;
  A.island(ctx, { x: 1200, y: 500, rx: 380, ry: 140, seed: 60, s });
  A.palm(ctx, 880, 560, 0.8 * s, t, 61);
  A.palm(ctx, 1520, 555, 0.7 * s, t, 62);
  const drop = seg(t, 42.6, 43.2, E.in);
  if (drop > 0) {
    const y = lerp(-400, IDP.y, drop);
    const squash = t > 43.2 ? 1 + Math.sin((t - 43.2) * 20) * 0.06 * Math.exp(-(t - 43.2) * 5) : 1;
    ctx.save();
    ctx.translate(IDP.x, y);
    ctx.scale(1 / squash, squash);
    A.office(ctx, { x: 0, y: 0, s: IDP.s, t, clerk: clerkState(t), glow: pulse(t, 43.4, 47, 0.8) });
    ctx.restore();
    burst(ctx, IDP.x, IDP.y - 20, 300, seg(t, 43.2, 44.0, E.out), { seed: 63, n: 14 });
  }
  if (t > 43.4) {
    for (let i = 0; i < 5; i++) {
      const a = pulse(t, 43.6 + i * 0.3, 47.5, 0.4);
      if (a > 0) sparkle(ctx, 1200 + Math.cos(i * 1.3) * 300, 220 + Math.sin(i * 2.1) * 120, 16 + Math.sin(t * 5 + i) * 4, { alpha: a });
    }
  }
  const tagP = popScale(t, 46.0, 0.6);
  if (tagP > 0 && t < 56) {
    ctx.save();
    ctx.translate(1200, 660);
    ctx.scale(tagP, tagP);
    A.nameTag(ctx, 0, 0, "in real life: Microsoft Entra ID · Okta", { size: 36, fill: PAL.yellow, seed: 64, rot: 0.02 });
    ctx.restore();
  }
}

function clerkState(t) {
  const c = { look: 0, mood: "happy", stamp: null, sparkleEyes: false };
  if (within(t, 75.4, 80.2) || within(t, 144.0, 146.0)) c.look = -1;
  if (within(t, 144.6, 150)) c.mood = "stern";
  // stamp swings: approve (84), welcome back (127), denied (145.6)
  const stampAt = (s0) => {
    if (!within(t, s0 - 0.8, s0 + 1.0)) return null;
    const down = seg(t, s0 - 0.35, s0, E.in);
    const up = seg(t, s0 + 0.35, s0 + 0.8, E.out);
    return down * (1 - up);
  };
  for (const s0 of [84.2, 127.1, 145.6]) {
    const v = stampAt(s0);
    if (v !== null) c.stamp = v;
  }
  if (within(t, 126.4, 127.6)) c.sparkleEyes = true;
  return c;
}

function aircallIsland(ctx, t) {
  const s = popScale(t, 41.3, 0.7);
  if (s <= 0) return;
  A.island(ctx, { x: 560, y: 1000, rx: 340, ry: 175, seed: 70, s });
  if (s < 0.98) return;
  A.bigPhone(ctx, 330, 975, 0.8, t, pulse(t, 44, 46, 0.3) * 0.8);
  A.palm(ctx, 300, 1110, 0.75, t, 71);
  A.gate(ctx, {
    x: AIR.gate[0], y: AIR.gate[1], s: 0.85, name: "Aircall", color: PAL.aircall, t,
    button: seg(t, 58.6, 59.2), pressed: pulse(t, 60.3, 61.6, 0.1),
    open: Math.max(seg(t, 118.2, 119.0, E.outBack) * (1 - seg(t, 137.8, 138.4)), 0),
  });
  const zzz = within(t, 142.5, 151);
  A.person(ctx, { x: AIR.guard[0], y: AIR.guard[1], s: 0.62, t, id: "guardA", face: -1, hairStyle: "cap", hair: PAL.aircall, shirt: "#3c5a7a", pants: PAL.ink, skin: PAL.skin2, mood: zzz ? "smug" : "neutral", pose: within(t, 63.4, 65.4) ? "type" : "down", badge: "GUARD" });
  if (zzz) zzzs(ctx, AIR.guard[0] - 20, AIR.guard[1] - 170, t);
  // guard keeps the PKCE verifier in a strongbox
  const box = popScale(t, 67.3, 0.5);
  if (box > 0 && t < 104) {
    ctx.save();
    ctx.translate(930, 1080);
    ctx.scale(box * 0.8, box * 0.8);
    paperRect(ctx, -46, -40, 92, 70, { fill: "#6c7a89", seed: 72, r: 6, ink: PAL.ink, inkWidth: 2 });
    A.keyIcon(ctx, 0, -6, 0.3, { rot: 0 });
    ctx.restore();
    if (t < 93) A.nameTag(ctx, 930, 1150, "verifier stays home", { size: 24, seed: 73, fill: PAL.paper });
  }
}

function latticeIsland(ctx, t) {
  const s = popScale(t, 41.7, 0.7);
  if (s <= 0) return;
  A.island(ctx, { x: 1840, y: 1000, rx: 340, ry: 175, seed: 80, s });
  if (s < 0.98) return;
  A.growthChart(ctx, 1600, 1010, 0.85, t, seg(t, 44, 46));
  A.tree(ctx, 2110, 945, 0.8, 81);
  A.gate(ctx, {
    x: LAT.gate[0], y: LAT.gate[1], s: 0.85, name: "Lattice", color: PAL.lattice, t,
    button: seg(t, 124.0, 124.5), pressed: pulse(t, 124.7, 125.6, 0.1),
    open: seg(t, 131.0, 131.8, E.outBack),
  });
  A.person(ctx, { x: LAT.guard[0], y: LAT.guard[1], s: 0.62, t, id: "guardL", face: -1, hairStyle: "cap", hair: PAL.lattice, shirt: "#5a4a7a", pants: PAL.ink, skin: "#e8b48f", mood: "happy", badge: "GUARD" });
}

function zzzs(ctx, x, y, t) {
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.6 + i / 3) % 1;
    text(ctx, "z", x + p * 60, y - p * 90, { size: 26 + p * 20, font: "marker", alpha: 1 - p, color: PAL.inkSoft });
  }
}

function trustLines(ctx, t) {
  if (t < 50.8 || t > 57) return;
  const fade = 1 - seg(t, 56, 57);
  const targets = [[700, 850], [1700, 850], [320, 360], [2080, 370], [2150, 1200]];
  targets.forEach((to, i) => {
    const p = seg(t, 51 + i * 0.35, 52.4 + i * 0.35);
    const from = [1200 + (to[0] - 1200) * 0.18, 560 + (to[1] - 560) * 0.1];
    sketch(ctx, linePts(from[0], from[1], to[0], to[1], 10), { color: PAL.red, width: 5, dash: [14, 12], progress: p, alpha: fade, seed: 500 + i });
    if (p >= 1) {
      const mx = lerp(from[0], to[0], 0.55), my = lerp(from[1], to[1], 0.55);
      const hp = popScale(t, 52.4 + i * 0.35, 0.4) * fade;
      heart(ctx, mx, my, 22 * hp, 510 + i);
    }
  });
  if (t > 52.6) text(ctx, "trusts", 890, 700, { size: 42, rot: 0.45, alpha: fade, progress: seg(t, 52.6, 53.4, E.linear), color: PAL.red });
}

function heart(ctx, x, y, s, seed) {
  if (s <= 0) return;
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * TAU;
    const hx = 16 * Math.pow(Math.sin(a), 3);
    const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    pts.push([x + (hx * s) / 16, y + (hy * s) / 16]);
  }
  paper(ctx, pts, { fill: PAL.coral, seed, torn: 0.5, shadow: 0.6 });
}

// ---------------------------------------------------------------- tubes
function tubes(ctx, t) {
  const drawTube = (P, a, seedBase, fade = 1) => {
    const prog = seg(t, a, a + 1.6);
    if (prog <= 0 || fade <= 0) return;
    const pts = bezPts(P[0], P[1], P[2], P[3], 60);
    ctx.save();
    ctx.globalAlpha = fade;
    sketch(ctx, pts, { color: "#6f6456", width: 46, passes: 1, rough: 0.8, progress: prog, seed: seedBase });
    sketch(ctx, pts, { color: "#b9ab94", width: 32, passes: 1, rough: 0.6, progress: prog, seed: seedBase + 1 });
    sketch(ctx, pts, { color: "#e6dcc8", width: 7, passes: 1, rough: 0.5, progress: prog, seed: seedBase + 2, alpha: 0.8 });
    ctx.restore();
  };
  drawTube(TUBE_A, 93.4, 600, 1 - seg(t, 152, 153));
  drawTube(TUBE_L, 129.0, 610, 1 - seg(t, 152, 153));
  // Aircall capsule: out with the ticket, back with the token
  const cap = (P, a, b, reverse, glow) => {
    if (!within(t, a, b + 0.01)) return;
    let p = seg(t, a, b, E.inOut);
    if (reverse) p = 1 - p;
    const [x, y] = bez(P[0], P[1], P[2], P[3], p);
    A.capsule(ctx, x, y, bezAngle(P[0], P[1], P[2], P[3], p), { glow, fill: glow ? PAL.yellow : PAL.pink });
  };
  cap(TUBE_A, 95.2, 97.6, false, 0);
  cap(TUBE_A, 98.8, 101.3, true, 1);
  cap(TUBE_L, 129.7, 130.3, false, 0);
  cap(TUBE_L, 130.4, 131.0, true, 1);
  if (within(t, 95.3, 98.5)) A.nameTag(ctx, 800, 700, "ticket + app secret + PKCE key", { size: 34, seed: 620, fill: PAL.paper, rot: -0.03 });
  const ok = popScale(t, 97.8, 0.4);
  if (ok > 0 && t < 101) {
    A.nameTag(ctx, 1420, 640, "PKCE ✓  secret ✓", { size: 32, seed: 621, fill: PAL.mint });
  }
  if (within(t, 99.2, 103.8)) {
    A.nameTag(ctx, 800, 700, "back comes: a signed ID token", { size: 38, seed: 622, fill: PAL.yellow });
  }
  const arrive = seg(t, 101.3, 101.9, E.out);
  if (arrive > 0 && arrive < 1) burst(ctx, TUBE_A[0][0], TUBE_A[0][1] - 20, 90, arrive, { seed: 623, color: PAL.mustard });
  // tube mouths
  const m = seg(t, 93.4, 93.9, E.outBack) * (1 - seg(t, 152, 153));
  if (m > 0) {
    paperRect(ctx, TUBE_A[0][0] - 40, TUBE_A[0][1] - 44, 80, 50, { fill: "#8c7d6b", seed: 630, r: 8, ink: PAL.ink, inkWidth: 2, alpha: m });
    if (t > 129) paperRect(ctx, TUBE_L[0][0] - 40, TUBE_L[0][1] - 44, 80, 50, { fill: "#8c7d6b", seed: 631, r: 8, ink: PAL.ink, inkWidth: 2, alpha: m });
  }
}

// ---------------------------------------------------------------- people & pigeons
function alexState(t) {
  const st = { x: 400, y: 1040, walk: null, face: 1, pose: "down", mood: "happy", visible: t > 55.6, band: false, rosette: null };
  if (t < 56.2) st.x = 380;
  else if (t < 59.6) {
    const p = seg(t, 56.2, 59.6, E.linear);
    st.x = lerp(380, AIR.alex[0], p);
    st.walk = t * 9;
  } else st.x = AIR.alex[0];
  if (within(t, 59.6, 61.8)) st.pose = "point";
  if (within(t, 93, 103.6)) st.pose = "down";
  if (t > 118.6) st.rosette = "ADMIN";
  // to the boat
  if (t >= 120.2) {
    if (t < 121.2) {
      const p = seg(t, 120.2, 121.2, E.linear);
      st.x = lerp(AIR.alex[0], 830, p);
      st.y = lerp(1040, 1128, p);
      st.walk = t * 9;
    } else if (t < 124.2) {
      const [bx, by] = boatPos(t);
      st.x = bx;
      st.y = by - 12;
      st.pose = t > 122 ? "wave" : "down";
    } else {
      const p = seg(t, 124.2, 124.9, E.linear);
      st.x = lerp(1560, LAT.alex[0], p);
      st.y = lerp(1100, 1040, p);
      if (p < 1) st.walk = t * 9;
    }
  }
  if (t > 131.2) {
    st.rosette = "MANAGER";
    st.pose = within(t, 131.4, 134.5) ? "cheer" : "down";
    st.mood = "happy";
  }
  return st;
}

function boatPos(t) {
  const p = seg(t, 121.2, 124.2, E.inOut);
  return [lerp(830, 1560, p), lerp(1140, 1110, p) + Math.sin(t * 3) * 4];
}

function boatRide(ctx, t) {
  if (!within(t, 120.2, 125.5)) return;
  const [bx, by] = boatPos(t);
  const a = seg(t, 120.2, 120.7) * (1 - seg(t, 124.9, 125.5));
  ctx.save();
  ctx.globalAlpha = a;
  A.boat(ctx, bx, by, { s: 0.9, t });
  ctx.restore();
}

function pigeonState(t) {
  // default: absent
  const s = { visible: false, x: 0, y: 0, flying: false, face: 1, rot: 0, cargo: null, band: t > 80.9, whistle: false, s: 0.6 };
  const at = (p, face = 1) => Object.assign(s, { visible: true, x: p[0], y: p[1], flying: false, face, rot: 0 });
  const fly = (a, b, from, to, lift) => {
    const f = flight(t, a, b, from, to, lift);
    Object.assign(s, { visible: true, x: f.x, y: f.y, flying: true, face: f.face, rot: f.rot });
  };
  if (t < 61.2) return s;
  if (t < 62.6) fly(61.2, 62.6, [300, 500], AIR.perch, 80);
  else if (t < 69.2) at(AIR.perch);
  else if (t < 71.6) fly(69.2, 71.6, AIR.perch, COUNTER_L, 260);
  else if (t < 86.0) at(COUNTER_L, 1);
  else if (t < 89.6) fly(86.0, 89.6, COUNTER_L, AIR.perch, 260);
  else if (t < 121.2) at(AIR.perch, -1);
  else if (t < 124.2) {
    const [bx, by] = boatPos(t);
    at([bx + 60, by - 40], 1);
  } else if (t < 124.9) fly(124.2, 124.9, [1620, 1070], LAT.perch, 60);
  else if (t < 126.5) fly(124.9, 126.5, LAT.perch, COUNTER_R, 240);
  else if (t < 127.8) at(COUNTER_R, -1);
  else if (t < 129.4) fly(127.8, 129.4, COUNTER_R, LAT.perch, 240);
  else at(LAT.perch, -1);

  // cargo
  if (t >= 65.4 && t < 85.6) s.cargo = "envelope";
  if (t >= 85.6 && t < 92.2) s.cargo = "ticket";
  if (t >= 124.9 && t < 127.3) s.cargo = "envelope";
  if (t >= 127.3 && t < 129.6) s.cargo = "ticket";
  if (within(t, 94, 103.6)) s.whistle = true;
  return s;
}

function samPigeonState(t) {
  const s = { visible: false, x: 0, y: 0, flying: false, face: 1, rot: 0, cargo: null, s: 0.6 };
  const at = (p, face = 1) => Object.assign(s, { visible: true, x: p[0], y: p[1], flying: false, face });
  const fly = (a, b, from, to, lift) => {
    const f = flight(t, a, b, from, to, lift);
    Object.assign(s, { visible: true, x: f.x, y: f.y, flying: true, face: f.face, rot: f.rot });
  };
  if (t < 140.6 || t > 151.5) return s;
  if (t < 141.6) fly(140.6, 141.6, [320, 520], AIR.perch, 60);
  else if (t < 142.4) at(AIR.perch);
  else if (t < 144.0) fly(142.4, 144.0, AIR.perch, COUNTER_L, 240);
  else if (t < 146.2) at(COUNTER_L);
  else if (t < 148.0) fly(146.2, 148.0, COUNTER_L, AIR.perch, 240);
  else at(AIR.perch, -1);
  if (t >= 141.8 && t < 146.0) s.cargo = "envelopeSam";
  if (t >= 146.0) s.cargo = "red";
  return s;
}

function characters(ctx, t) {
  // Alex
  const a = alexState(t);
  if (a.visible) {
    A.person(ctx, { x: a.x, y: a.y, s: 0.72, t, id: "alex", walk: a.walk, face: a.face, pose: a.pose, mood: a.mood, badge: "ALEX" });
    if (a.rosette) {
      const rp = popScale(t, a.rosette === "ADMIN" ? 118.6 : 131.2, 0.6);
      A.rosette(ctx, a.x + 40, a.y - 118, a.rosette, { s: 0.42 * rp, rot: 0.1, seed: a.rosette === "ADMIN" ? 1 : 2 });
    }
    if (within(t, 131.4, 134.8)) confetti(ctx, a.x, a.y - 150, t - 131.4, { seed: 19, n: 50 });
    if (within(t, 132.2, 136.8)) A.speech(ctx, a.x - 170, a.y - 250, "wait… that's it?!", { w: 250, h: 76, tail: [90, 60], seed: 145, s: popScale(t, 132.2, 0.4) * 0.8 });
  }
  const sw = popScale(t, 131.8, 0.5);
  if (sw > 0 && t < 137.8) A.stopwatch(ctx, 1660, 830, 0.85 * sw, seg(t, 131.8, 133), "0.4 s");

  // Sam
  if (within(t, 138.2, 152)) {
    const p = seg(t, 138.4, 141.2, E.linear);
    const moving = p > 0 && p < 1;
    const shrug = within(t, 148.3, 151);
    A.person(ctx, {
      x: lerp(300, AIR.alex[0], p), y: 1040, s: 0.72, t, id: "sam", walk: moving ? t * 9 : null,
      hairStyle: "cap", hair: PAL.red, shirt: PAL.mustard, pants: "#5b4b3a", skin: PAL.skin2, badge: "SAM",
      mood: shrug ? "sad" : "happy", pose: shrug ? "shrug" : within(t, 141.2, 142.2) ? "point" : "down",
      alpha: 1 - seg(t, 151, 152),
    });
    const tag = popScale(t, 138.6, 0.5);
    if (tag > 0 && t < 144) A.nameTag(ctx, lerp(300, AIR.alex[0], p), 800, "Sam · contractor", { size: 28, fill: PAL.yellow, seed: 146 });
  }

  // pigeons
  const pg = pigeonState(t);
  if (pg.visible) {
    A.pigeon(ctx, { x: pg.x, y: pg.y, s: pg.s, t, id: "pigeon", flying: pg.flying, face: pg.face, rot: pg.rot, cargo: pg.cargo, band: pg.band, whistle: pg.whistle });
    if (within(t, 62.8, 66.2)) A.nameTag(ctx, pg.x, pg.y - 90, "Alex's browser", { size: 30, fill: PAL.sky, seed: 147, alpha: pulse(t, 62.8, 66.2, 0.3) });
    if (within(t, 99.2, 103.8)) A.nameTag(ctx, pg.x - 10, pg.y - 100, "(not involved)", { size: 26, fill: PAL.paper, seed: 148 });
  }
  const sp = samPigeonState(t);
  if (sp.visible) A.pigeon(ctx, { x: sp.x, y: sp.y, s: sp.s, t: t + 0.7, id: "pigeon2", flying: sp.flying, face: sp.face, rot: sp.rot, cargo: sp.cargo });

  // the pigeon hands its ticket to the tube
  if (within(t, 92.2, 93.6)) {
    const p = seg(t, 92.2, 93.4, E.inOut);
    const [x, y] = bez([AIR.perch[0], AIR.perch[1] + 64], [800, 900], [830, 980], [TUBE_A[0][0], TUBE_A[0][1] - 30], p);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p * 0.6);
    ctx.scale(lerp(0.8, 0.5, p), lerp(0.8, 0.5, p));
    A.ticket(ctx, { w: 84, h: 42 });
    ctx.restore();
  }

  // envelope being written at the Aircall gate
  const env = seg(t, 63.6, 64.3, E.outBack);
  if (env > 0 && t < 65.4) {
    const p = seg(t, 64.8, 65.4, E.inOut);
    const x = lerp(860, AIR.perch[0] + 4, p), y = lerp(760, AIR.perch[1] + 60, p);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(env * lerp(1.2, 0.47, p), env * lerp(1.2, 0.47, p));
    A.envelope(ctx, { w: 110, h: 72, seed: 21, lock: true });
    ctx.restore();
  }
  if (within(t, 66.2, 69.4)) {
    const a1 = popScale(t, 66.3, 0.4), a2 = popScale(t, 67.0, 0.4);
    if (a1 > 0) {
      ctx.save();
      ctx.translate(500, 730);
      ctx.scale(a1, a1);
      A.nameTag(ctx, 0, 0, "state: x7Qp9… (random)", { size: 26, fill: PAL.paper, seed: 149, rot: -0.05 });
      ctx.restore();
      arrow(ctx, [600, 750], [715, 880], { progress: seg(t, 66.5, 67.1), seed: 150, width: 3 });
    }
    if (a2 > 0) {
      ctx.save();
      ctx.translate(960, 720);
      ctx.scale(a2, a2);
      A.nameTag(ctx, 0, 0, "PKCE lock", { size: 26, fill: PAL.yellow, seed: 151, rot: 0.05 });
      ctx.restore();
      arrow(ctx, [920, 745], [785, 880], { progress: seg(t, 67.2, 67.8), seed: 152, width: 3, bend: -0.2 });
    }
  }
}

// ---------------------------------------------------------------- IdP-side props
function idpProps(ctx, t) {
  // sign-in card (what the browser shows) + phone MFA
  const card = popScale(t, 71.9, 0.5) * (1 - seg(t, 79.6, 80.2));
  if (card > 0) {
    ctx.save();
    ctx.translate(1560, 250);
    ctx.scale(card * 0.82, card * 0.82);
    ctx.rotate(0.03);
    paperRect(ctx, -170, -120, 340, 250, { fill: PAL.paper, seed: 700, r: 10, ink: PAL.ink, inkWidth: 2 });
    paperRect(ctx, -170, -120, 340, 46, { fill: PAL.navy, seed: 701, r: 10, shadow: 0 });
    text(ctx, "Acme Rx · sign in", 0, -96, { size: 26, color: PAL.paper, font: "marker" });
    text(ctx, "username", -140, -46, { size: 22, align: "left", color: PAL.inkSoft });
    text(ctx, "alex", -20, -48, { size: 30, align: "left", progress: seg(t, 72.3, 72.9, E.linear) });
    text(ctx, "password", -140, 6, { size: 22, align: "left", color: PAL.inkSoft });
    const dots = Math.floor(seg(t, 72.9, 73.8, E.linear) * 8);
    text(ctx, "•".repeat(dots), -20, 4, { size: 30, align: "left" });
    const ok = t > 75.1;
    paperRect(ctx, -70, 50, 140, 44, { fill: ok ? PAL.aircall : PAL.mustard, seed: 702, r: 16, shadow: 0.5 });
    text(ctx, ok ? "MFA ✓" : "sign in", 0, 72, { size: 26, color: ok ? PAL.paper : PAL.ink });
    tape(ctx, 0, -124, 80, 0.04, 703);
    ctx.restore();
    const ph = popScale(t, 73.7, 0.4);
    if (ph > 0) {
      A.phone(ctx, 1760, 330, { s: 0.55 * ph * card, rot: 0.12, approve: seg(t, 74.9, 75.0), buzz: pulse(t, 73.9, 74.9, 0.1), t });
    }
  }
  // guest list (Alex, then Sam)
  const gl = popScale(t, 75.4, 0.5) * (1 - seg(t, 80.2, 80.8));
  if (gl > 0) {
    A.clipboard(ctx, 880, 330, {
      s: 0.85 * gl, title: "Aircall guests", seed: 1, rot: -0.06,
      rows: [{ name: "Alex Rivera", ok: true }, { name: "Priya Shah", ok: true }, { name: "…", ok: false, dim: true }],
      progress: seg(t, 75.8, 77.4, E.linear), highlight: t > 77.6 ? 0 : -1,
    });
  }
  const gs = popScale(t, 144.0, 0.5) * (1 - seg(t, 149.5, 150.2));
  if (gs > 0) {
    A.clipboard(ctx, 880, 330, {
      s: 0.85 * gs, title: "Aircall guests", seed: 2, rot: -0.06,
      rows: [{ name: "Alex Rivera", ok: true }, { name: "Priya Shah", ok: true }],
      progress: 1, missing: { name: "Sam Carter?", p: seg(t, 144.3, 144.9, E.linear), x: seg(t, 144.9, 145.3) },
    });
  }
  // wristband
  const wb = pulse(t, 80.7, 85.9, 0.4);
  if (wb > 0) {
    A.nameTag(ctx, 930, 220, "wristband = IdP session", { size: 28, fill: PAL.coral, seed: 710, alpha: wb, rot: 0.04 });
    for (let i = 0; i < 4; i++) sparkle(ctx, COUNTER_L[0] + Math.cos(t * 3 + i * 1.6) * 60, COUNTER_L[1] + 20 + Math.sin(t * 3 + i * 1.6) * 30, 10, { alpha: wb });
  }
  // stamps
  const st1 = seg(t, 84.2, 84.35, E.out) * (1 - seg(t, 85.4, 85.8));
  if (st1 > 0) {
    A.imprint(ctx, COUNTER_L[0], COUNTER_L[1] + 62, "APPROVED", { color: PAL.aircall, s: lerp(1.8, 0.8, st1), alpha: st1, size: 30 });
    burst(ctx, COUNTER_L[0], COUNTER_L[1] + 62, 100, seg(t, 84.2, 84.9), { seed: 711 });
  }
  const st2 = seg(t, 127.1, 127.25, E.out) * (1 - seg(t, 128.4, 128.9));
  if (st2 > 0) {
    A.imprint(ctx, COUNTER_R[0], COUNTER_R[1] + 62, "WELCOME BACK", { color: PAL.lattice, s: lerp(1.8, 0.8, st2), alpha: st2, size: 26 });
    burst(ctx, COUNTER_R[0], COUNTER_R[1] + 62, 100, seg(t, 127.1, 127.8), { seed: 712 });
  }
  if (within(t, 125.8, 128.6)) A.speech(ctx, 1450, 170, "oh hi! I know\nthat wristband", { w: 250, h: 104, tail: [-100, 70], size: 30, seed: 713, s: popScale(t, 125.8, 0.4) * 0.9 });
  const st3 = seg(t, 145.6, 145.75, E.out) * (1 - seg(t, 149.4, 150));
  if (st3 > 0) {
    A.imprint(ctx, COUNTER_L[0], COUNTER_L[1] + 62, "DENIED", { color: PAL.red, s: lerp(2.2, 1.0, st3), alpha: st3, size: 36 });
    burst(ctx, COUNTER_L[0], COUNTER_L[1] + 62, 120, seg(t, 145.6, 146.3), { seed: 714, color: PAL.red });
  }
  if (within(t, 146.4, 150.6)) A.nameTag(ctx, 620, 700, "error = access_denied", { size: 30, fill: PAL.pink, seed: 715, rot: -0.03, alpha: pulse(t, 146.4, 150.6, 0.3) });
  if (within(t, 147.0, 151)) A.nameTag(ctx, AIR.guard[0] + 30, AIR.guard[1] - 230, "Aircall: never saw Sam", { size: 24, fill: PAL.paper, seed: 716, alpha: pulse(t, 147.0, 151, 0.3) });
}

// ---------------------------------------------------------------- SCIM
const ACCOUNT_SPOTS = [
  [450, 1120], [1990, 1120], [200, 245], [2200, 255], [2230, 1165],
];

function scim(ctx, t) {
  if (t < 151.2) return;
  // directory cards beside the office
  const d = popScale(t, 152.0, 0.6);
  if (d > 0) {
    ctx.save();
    ctx.translate(1520, 330);
    ctx.scale(d, d);
    A.personCard(ctx, 0, -80, {
      name: "Taylor", role: "new hire · Mon", fill: PAL.mint, seed: 1, rot: 0.04, shirt: PAL.coral, hair: "#2e2330",
      alpha: seg(t, 156.5, 157.0), status: t > 157 ? { label: "NEW", color: PAL.teal, s: popScale(t, 157.0, 0.4) } : null,
    });
    A.personCard(ctx, 10, 60, {
      name: "Priya", role: "support", fill: PAL.paper, seed: 2, rot: -0.03, shirt: PAL.lattice,
      status: t > 162.0 ? { label: "LEFT", color: PAL.red, s: seg(t, 162.0, 162.2) < 1 ? lerp(2, 1, seg(t, 162.0, 162.2)) : 1 } : null,
    });
    ctx.restore();
    A.lever(ctx, 930, 360, 0.7 * d, seg(t, 161.8, 162.3, E.outBack));
    if (t > 161.8) burst(ctx, 930, 290, 90, seg(t, 162.0, 162.7), { seed: 720 });
  }
  // Priya's existing accounts on every island
  ACCOUNT_SPOTS.forEach((p, i) => {
    const show = popScale(t, 152.4 + i * 0.15, 0.4);
    if (show <= 0) return;
    const hit = 164.0 + i * 0.35;
    const closed = t > hit;
    const g = seg(t, 167.4 + i * 0.25, 168.4 + i * 0.25, E.out);
    const erase = seg(t, 169.0 + i * 0.3, 169.8 + i * 0.3, E.in);
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.scale(show * 0.62, show * 0.62);
    A.personCard(ctx, 0, 0, {
      name: "Priya", role: closed ? "account closed" : "account active", fill: closed ? "#e4e0d8" : PAL.paper, seed: 20 + i, rot: (i % 2 ? 1 : -1) * 0.05, shirt: PAL.lattice,
      status: closed ? { label: "CLOSED", color: PAL.red, s: lerp(1.8, 1, seg(t, hit, hit + 0.2)) } : null,
    });
    ctx.restore();
    if (g > 0 && erase < 1) {
      A.ghostie(ctx, p[0], p[1] - 70 - g * 50, { s: 0.55 * g, t, seed: 40 + i, erase });
    }
    if (erase > 0 && erase < 1) burst(ctx, p[0], p[1] - 110, 60, erase, { seed: 730 + i, color: PAL.mustard });
    const ok = popScale(t, 160.8, 0.5) * (1 - seg(t, 165.5, 166));
    if (i < 2 && ok > 0) A.nameTag(ctx, p[0], p[1] - 110, "Taylor ✓ ready", { size: 26, fill: PAL.mint, seed: 740 + i });
  });
  // paper planes: create (green) then deactivate (red)
  const from = [1200, 250];
  [[600, 870], [1800, 870]].forEach((to, i) => {
    const a = 157.4 + i * 0.3, b = 160.6 + i * 0.3;
    if (!within(t, a, b)) return;
    const f = flight(t, a, b, from, to, 200);
    A.paperPlane(ctx, f.x, f.y, { s: 0.9, rot: bezAngleLike(f), fill: PAL.mint, seed: 750 + i, label: i === 0 ? "SCIM: create" : null });
  });
  ACCOUNT_SPOTS.forEach((to, i) => {
    const a = 162.4 + i * 0.12, b = 164.0 + i * 0.35;
    if (!within(t, a, b)) return;
    const f = flight(t, a, b, from, [to[0], to[1] - 60], 200);
    A.paperPlane(ctx, f.x, f.y, { s: 0.9, rot: bezAngleLike(f), fill: PAL.coral, seed: 760 + i, label: i === 0 ? "SCIM: deactivate" : null });
  });
  const ng = seg(t, 168.2, 169.4, E.linear);
  if (ng > 0) {
    ctx.save();
    ctx.translate(1200, 790);
    ctx.rotate(-0.04);
    const w = 820;
    const sc = popScale(t, 168.0, 0.5);
    ctx.scale(sc, sc);
    paperRect(ctx, -w / 2, -70, w, 140, { fill: PAL.paper, seed: 770, r: 6, shadow: 1.4 });
    tape(ctx, -w / 2 + 20, -66, 90, -0.5, 771);
    tape(ctx, w / 2 - 20, -66, 90, 0.5, 772);
    text(ctx, "one switch · no ghosts left behind", 0, 4, { size: 60, progress: ng });
    ctx.restore();
  }
}

function bezAngleLike(f) {
  return f.face > 0 ? f.rot * 2.2 : Math.PI + f.rot * 2.2;
}

function birds(ctx, t) {
  // two tiny seagulls for life
  for (let i = 0; i < 2; i++) {
    const x = ((t * 40 + i * 900) % 3200) - 400;
    const y = 120 + i * 60 + Math.sin(t + i) * 20;
    const f = Math.sin(t * 8 + i) * 8;
    sketch(ctx, [[x - 20, y - f], [x - 8, y - 4], [x, y], [x + 8, y - 4], [x + 20, y - f]], { width: 3, seed: 780 + i, rough: 0.4 });
  }
}

// ---------------------------------------------------------------- passport page
function passportPage(ctx, t) {
  if (!within(t, 103.6, 120.6)) return;
  const inP = seg(t, 103.6, 104.6, E.out);
  const outP = seg(t, 119.4, 120.4, E.in);
  const y = (1 - inP) * H * 1.1 + outP * H * 1.1;
  ctx.save();
  ctx.translate(0, y);
  // page
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.012);
  paperRect(ctx, -740, -410, 1480, 820, { fill: PAL.cream, seed: 800, r: 4, shadow: 2 });
  for (let i = 0; i < 16; i++) sLine(ctx, -720, -330 + i * 48, 720, -330 + i * 48, { color: "#c9dbe6", width: 1.2, alpha: 0.5, seed: 801 + i, rough: 0.5 });
  tape(ctx, -700, -400, 130, -0.5, 820);
  tape(ctx, 700, -400, 130, 0.5, 821);
  ctx.restore();

  text(ctx, "the ID token, up close", 420, 110, { size: 50, font: "marker", progress: seg(t, 104.4, 105.4, E.linear), rot: -0.02 });

  // passport booklet
  const bx = 560, by = 455;
  const K = 1.25;
  const P = (x, y) => [bx + (x - bx) * K, by + (y - by) * K];
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(K, K);
  ctx.translate(-bx, -by);
  paperRect(ctx, bx - 330, by - 230, 660, 450, { fill: PAL.navy, seed: 830, r: 16, shadow: 1.5 });
  paperRect(ctx, bx - 312, by - 212, 304, 414, { fill: "#f4efe2", seed: 831, r: 6, shadow: 0.3, fringe: false });
  paperRect(ctx, bx + 8, by - 212, 304, 414, { fill: "#f7f3e8", seed: 832, r: 6, shadow: 0.3, fringe: false });
  sLine(ctx, bx, by - 212, bx, by + 202, { width: 2, alpha: 0.5, seed: 833 });
  // left page: portrait
  text(ctx, "ACME RX · IDENTITY", bx - 160, by - 180, { size: 22, font: "type" });
  paperRect(ctx, bx - 250, by - 150, 180, 210, { fill: "#dfeef5", seed: 834, r: 4, shadow: 0.4 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(bx - 250, by - 150, 180, 210);
  ctx.clip();
  A.person(ctx, { x: bx - 160, y: by + 140, s: 0.95, t, id: "alexPhoto", mood: "happy", badge: null });
  ctx.restore();
  text(ctx, "Alex Rivera", bx - 160, by + 100, { size: 34 });
  text(ctx, "Engineering Manager", bx - 160, by + 136, { size: 22, color: PAL.inkSoft });
  // right page: claims
  const rows = [
    ["iss", "acme idp"],
    ["sub", "8f14…0001"],
    ["aud", "aircall"],
    ["exp", "in 1 hour"],
    ["nonce", "matches note"],
    ["groups", "App-Aircall-Admins"],
  ];
  rows.forEach(([k, v], i) => {
    const p = seg(t, 105.0 + i * 0.55, 105.5 + i * 0.55, E.linear);
    const ry = by - 170 + i * 50;
    text(ctx, k, bx + 30, ry, { size: 22, font: "type", align: "left", color: PAL.inkSoft, progress: p });
    text(ctx, v, bx + 116, ry, { size: 22, font: "type", align: "left", progress: p, maxWidth: 190 });
  });
  // wax seal
  const sealP = popScale(t, 108.6, 0.5);
  if (sealP > 0) {
    ctx.save();
    ctx.translate(bx + 230, by + 130);
    ctx.scale(sealP, sealP);
    paper(ctx, [[-14, 20], [-30, 70], [-10, 58], [0, 76], [4, 22]], { fill: PAL.red, seed: 840 });
    paper(ctx, blobPts(0, 0, 44, 44, 841, 5, 40), { fill: "#b8322a", seed: 842, ink: PAL.ink, inkWidth: 1.6 });
    A.keyIcon(ctx, 0, 0, 0.26, { fill: "#e0675a" });
    ctx.restore();
    text(ctx, "signature", bx + 120, by + 178, { size: 26, color: PAL.red, progress: seg(t, 109, 109.6, E.linear), rot: -0.05 });
  }
  ctx.restore();

  // magnifier: over the seal, then over groups
  const mg = seg(t, 109.6, 110.6, E.inOut);
  if (mg > 0) {
    const toGroups = seg(t, 114.8, 115.6, E.inOut);
    const seal = P(bx + 230, by + 130), grp = P(bx + 200, by + 80);
    const mx = lerp(lerp(1500, seal[0], mg), grp[0], toGroups);
    const my = lerp(lerp(820, seal[1], mg), grp[1], toGroups) + Math.sin(t * 2) * 6;
    const away = seg(t, 116.2, 117, E.inOut);
    A.magnifier(ctx, lerp(mx, 1700, away), lerp(my, 900, away), 0.9, 0.6);
  }
  // public key card
  const kp = popScale(t, 109.7, 0.5);
  if (kp > 0) {
    ctx.save();
    ctx.translate(1370, 640);
    ctx.rotate(0.05);
    ctx.scale(kp, kp);
    paperRect(ctx, -150, -80, 300, 160, { fill: PAL.yellow, seed: 850, r: 4, shadow: 1 });
    tape(ctx, 0, -80, 80, 0.05, 851);
    A.keyIcon(ctx, -40, -10, 0.55, { fill: PAL.mustard });
    text(ctx, "provider's\npublic key", 60, 10, { size: 30, lineHeight: 1 });
    text(ctx, "(JWKS)", 60, 60, { size: 22, font: "type", color: PAL.inkSoft });
    ctx.restore();
  }
  // checks
  const checks = ["seal matches public key", "issued by our IdP", "meant for Aircall", "not expired", "nonce matches our note"];
  text(ctx, "Aircall checks:", 1060, 190, { size: 40, font: "marker", align: "left", progress: seg(t, 110.0, 110.6, E.linear) });
  checks.forEach((c, i) => {
    const a = 110.5 + i * 0.75;
    const ry = 250 + i * 50;
    text(ctx, c, 1110, ry, { size: 34, align: "left", progress: seg(t, a, a + 0.5, E.linear) });
    check(ctx, 1080, ry - 2, 26, { progress: seg(t, a + 0.45, a + 0.7) });
  });
  const fk = popScale(t, 113.9, 0.4);
  if (fk > 0) {
    text(ctx, "forged or tampered? rejected.", 1110, 510, { size: 30, align: "left", color: PAL.red, progress: seg(t, 114.0, 114.7, E.linear) });
    cross(ctx, 1080, 508, 24, { progress: seg(t, 114.5, 114.8) });
  }
  // groups → role
  if (t > 115.2) {
    const g = P(bx + 170, by + 80), ge = P(bx + 320, by + 90);
    circleDoodle(ctx, g[0], g[1], 175, 30, { progress: seg(t, 115.2, 116.0) });
    arrow(ctx, [ge[0] + 20, ge[1]], [1045, 610], { progress: seg(t, 116.0, 116.8), color: PAL.red, bend: -0.2, seed: 860 });
  }
  const rp = popScale(t, 116.8, 0.6);
  if (rp > 0) {
    A.rosette(ctx, 1130, 630, "ADMIN", { s: 1.1 * rp, seed: 1, rot: -0.08 });
    confetti(ctx, 1130, 660, t - 116.9, { seed: 861, n: 40 });
    text(ctx, "your role in Aircall", 1130, 752, { size: 30, progress: seg(t, 117.3, 118, E.linear) });
  }
  ctx.restore();
}

// ============================================================ 8. finale
function sceneFinale(ctx, t) {
  const ex = seg(t, 190.4, 191.3, E.in);
  ctx.save();
  ctx.globalAlpha = 1 - ex;
  ctx.translate(0, ex * 90);
  finaleCollage(ctx, t);
  ctx.restore();

  const yp = seg(t, 191.0, 192.8, E.linear);
  ransom(ctx, "YOUR TURN", 800, 360, { size: 150, t: yp, seed: 1060 });
  text(ctx, "scroll down, pick a user, poke every ?", 800, 540, { size: 52, progress: seg(t, 193.2, 195.2, E.linear), color: PAL.ink, rot: -0.015 });
  arrow(ctx, [1180, 600], [1240, 740], { progress: seg(t, 195.0, 195.8), color: PAL.red, bend: 0.3, seed: 1064, width: 5, head: 24 });
  confetti(ctx, 800, 380, t - 192.3, { seed: 1061, n: 80, spread: 1.4 });
  confetti(ctx, 300, 700, t - 192.8, { seed: 1062, n: 40 });
  confetti(ctx, 1300, 700, t - 193.1, { seed: 1063, n: 40 });
  const r2 = rng(1070);
  for (let i = 0; i < 6; i++) {
    const s = popScale(t, 192.4 + i * 0.15, 0.5);
    if (s > 0) star(ctx, 200 + r2() * 1200, 150 + r2() * 80 + (i % 2) * 420, 26 * s, { fill: [PAL.yellow, PAL.pink, PAL.sky, PAL.mint][i % 4], seed: 1071 + i, rot: t * 0.3 });
  }
}

function finaleCollage(ctx, t) {
  const r = rng(90);
  for (let i = 0; i < 7; i++) {
    const s = popScale(t, 174 + i * 0.2);
    if (s > 0) star(ctx, 60 + r() * 1480, 40 + r() * 40 + (i % 2) * 790, 18 * s, { fill: [PAL.yellow, PAL.pink, PAL.sky, PAL.mint][i % 4], seed: 91 + i });
  }
  // small print note
  const np = seg(t, 173.4, 174.2, E.outBack);
  if (np > 0) {
    ctx.save();
    ctx.translate(430, 290);
    ctx.rotate(-0.03);
    ctx.scale(np, np);
    paperRect(ctx, -350, -190, 700, 380, { fill: PAL.paper, seed: 1000, r: 4, shadow: 1.4 });
    tape(ctx, -300, -186, 110, -0.4, 1001);
    tape(ctx, 300, -186, 110, 0.4, 1002);
    text(ctx, "small print *", -300, -140, { size: 40, font: "marker", align: "left" });
    ctx.save();
    ctx.translate(-170, 10);
    ctx.rotate(-0.06);
    A.envelope(ctx, { w: 200, h: 130, seed: 1003, fill: PAL.sky });
    text(ctx, "{ JSON }", 0, -8, { size: 30, font: "type" });
    ctx.restore();
    text(ctx, "OIDC", -170, 110, { size: 36, font: "marker" });
    text(ctx, "≈", 0, 10, { size: 70, font: "marker", color: PAL.red });
    ctx.save();
    ctx.translate(170, 10);
    ctx.rotate(0.06);
    A.envelope(ctx, { w: 200, h: 130, seed: 1004, fill: PAL.pink });
    text(ctx, "<xml/>", 0, -8, { size: 30, font: "type" });
    ctx.restore();
    text(ctx, "SAML", 170, 110, { size: 36, font: "marker" });
    text(ctx, "same idea · different envelope", 0, 160, { size: 30, color: PAL.inkSoft, progress: seg(t, 175, 177, E.linear) });
    ctx.restore();
  }

  // polaroids of the lab
  const pols = [
    { x: 1080, y: 230, rot: 0.05, cap: "sign in as alex", at: 179.4, draw: (c) => miniLogin(c, t) },
    { x: 1400, y: 250, rot: -0.06, cap: "inspect the token", at: 180.2, draw: (c) => miniToken(c) },
    { x: 1110, y: 560, rot: -0.04, cap: "get denied as sam", at: 181.0, draw: (c) => A.imprint(c, 0, 0, "DENIED", { s: 1, size: 34 }) },
    { x: 1420, y: 590, rot: 0.05, cap: "run SCIM", at: 181.8, draw: (c) => miniPlanes(c, t) },
  ];
  pols.forEach((p, i) => {
    const s = popScale(t, p.at, 0.6);
    if (s <= 0) return;
    A.polaroid(ctx, p.x, p.y, { rot: p.rot, s: s * 0.95, caption: p.cap, seed: 1010 + i * 10, draw: p.draw });
  });
  const pw = popScale(t, 185.3, 0.6);
  if (pw > 0) {
    A.stickyNote(ctx, 420, 620, { fill: PAL.yellow, rot: -0.07, s: 1.6 * pw, seed: 1050 });
    text(ctx, "password:\ndemo", 420, 615, { size: 44, rot: -0.07, progress: seg(t, 185.6, 186.6, E.linear), lineHeight: 1 });
    circleDoodle(ctx, 420, 640, 70, 30, { progress: seg(t, 186.6, 187.3), seed: 1051 });
  }
  const users = popScale(t, 186.2, 0.6);
  if (users > 0) {
    text(ctx, "alex · priya · jordan · sam", 420, 740, { size: 34, progress: seg(t, 186.4, 187.8, E.linear), color: PAL.inkSoft, rot: -0.03 });
  }
  if (t > 187.5) {
    [[1250, 420], [940, 400], [1560, 440], [1270, 740]].forEach(([x, y], i) => {
      const s = popScale(t, 187.5 + i * 0.25, 0.4);
      if (s > 0) A.questionBubble(ctx, x, y, s, i, t);
    });
  }
}

function miniLogin(c, t) {
  paperRect(c, -90, -55, 180, 110, { fill: PAL.paper, seed: 1100, r: 6, shadow: 0.4 });
  paperRect(c, -90, -55, 180, 26, { fill: PAL.navy, seed: 1101, r: 6, shadow: 0 });
  text(c, "alex", -40, -8, { size: 24, align: "left" });
  text(c, "••••", -40, 22, { size: 24, align: "left" });
  A.pigeon(c, { x: 80, y: 20, s: 0.45, t, id: "mini", cargo: null });
}

function miniToken(c) {
  text(c, "eyJhbGci", -70, -30, { size: 24, font: "type", color: "#d6336c", align: "left" });
  text(c, ".eyJzdWIi", -70, 0, { size: 24, font: "type", color: "#7048e8", align: "left" });
  text(c, ".Sflkxw", -70, 30, { size: 24, font: "type", color: "#0c8599", align: "left" });
}

function miniPlanes(c, t) {
  A.paperPlane(c, -50 + Math.sin(t) * 10, -10, { s: 0.7, rot: -0.2, fill: PAL.mint, seed: 1110 });
  A.paperPlane(c, 50, 20 + Math.cos(t) * 8, { s: 0.7, rot: 0.15, fill: PAL.coral, seed: 1111 });
}
