// "Single Sign-On: a tale of keys, passports & one very busy pigeon"
// A pure-JavaScript, canvas-rendered film with DOM subtitles and controls.
//
// Usage:
//   import { createFilm } from "/film/film.js";
//   const film = await createFilm(document.getElementById("film"), { cta: [...] });

import { W, H, state, makeTextures } from "./core.js";
import { render } from "./scenes.js";
import { DURATION, CHAPTERS, SUBTITLES, subtitleAt, chapterAt } from "./script.js";

export { DURATION, CHAPTERS, SUBTITLES };

const FONT_CSS = "https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Permanent+Marker&family=Special+Elite&display=swap";

const CSS = `
.ssof{--ink:#2b2a33;--paper:#fbf6ea;--kraft:#d9c19b;--accent:#e2553f;position:relative;font-family:system-ui,"Segoe UI",sans-serif;color:var(--ink);outline:none;border-radius:14px;overflow:hidden;background:#1d1a17;box-shadow:0 18px 40px -18px rgba(40,25,10,.55)}
.ssof:focus-visible{box-shadow:0 0 0 3px #2458d6}
.ssof-stage{position:relative;aspect-ratio:16/9;width:100%;background:#cdb48b;cursor:pointer;overflow:hidden}
.ssof-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.ssof-sub{position:absolute;left:50%;bottom:4.2%;transform:translateX(-50%) rotate(-.4deg);max-width:84%;pointer-events:none;text-align:center;transition:opacity .25s ease}
.ssof-sub span{display:inline;background:#fffaf0;color:#1f1d24;font-family:Caveat,"Segoe Print","Comic Sans MS",cursive;font-weight:700;font-size:var(--fs,22px);line-height:1.38;padding:.08em .5em;box-decoration-break:clone;-webkit-box-decoration-break:clone;box-shadow:3px 4px 0 rgba(60,40,20,.28);text-wrap:balance}
.ssof-sub.off{opacity:0}
.ssof-cover{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2%;background:radial-gradient(ellipse at center,rgba(20,14,8,.15),rgba(20,14,8,.55));transition:opacity .35s ease;border:0;cursor:pointer;color:#fffaf0;font:inherit}
.ssof-cover.hidden{opacity:0;pointer-events:none}
.ssof-cover svg{width:min(17%,130px);height:auto;filter:drop-shadow(4px 6px 0 rgba(40,25,10,.35));transition:transform .2s ease}
.ssof-cover:hover svg{transform:scale(1.07) rotate(-3deg)}
.ssof-cover b{font-family:Caveat,cursive;font-size:var(--fsBig,34px);font-weight:700;text-shadow:2px 3px 0 rgba(40,25,10,.45)}
.ssof-cover small{font-size:var(--fsSmall,14px);opacity:.92;letter-spacing:.02em;background:rgba(20,14,8,.35);padding:.25em .7em;border-radius:99px}
.ssof-end{position:absolute;left:0;right:0;bottom:7%;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding:0 16px;transition:opacity .4s ease,transform .4s ease}
.ssof-end.hidden{opacity:0;transform:translateY(12px);pointer-events:none}
.ssof-end a,.ssof-end button{font-family:Caveat,cursive;font-weight:700;font-size:var(--fsCta,24px);padding:.15em .8em;border-radius:10px;border:2px solid var(--ink);background:var(--paper);color:var(--ink);text-decoration:none;cursor:pointer;box-shadow:3px 4px 0 rgba(40,25,10,.35);transform:rotate(-1deg);transition:transform .15s ease}
.ssof-end a:nth-child(2n){transform:rotate(1.2deg)}
.ssof-end a:hover,.ssof-end button:hover{transform:rotate(0) scale(1.05)}
.ssof-end a.primary{background:#f7d95c}
.ssof-loading{position:absolute;inset:0;display:grid;place-items:center;font-family:Caveat,cursive;font-size:28px;color:#3d2f1f}
.ssof-bar{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#2b2a33;color:#fbf6ea;font-size:13px}
.ssof-bar button{display:grid;place-items:center;width:34px;height:34px;border-radius:8px;border:0;background:transparent;color:inherit;cursor:pointer;flex-shrink:0}
.ssof-bar button:hover{background:rgba(255,255,255,.1)}
.ssof-bar button[aria-pressed="false"]{opacity:.55}
.ssof-bar svg{width:20px;height:20px}
.ssof-time{font-variant-numeric:tabular-nums;white-space:nowrap;opacity:.85}
.ssof-chapter{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:26%;font-family:Caveat,cursive;font-size:19px;font-weight:700;color:#f7d95c}
.ssof-track{position:relative;flex:1;height:34px;min-width:80px}
.ssof-rail{position:absolute;left:0;right:0;top:50%;height:6px;margin-top:-3px;border-radius:6px;background:rgba(255,255,255,.18)}
.ssof-fill{position:absolute;left:0;top:0;bottom:0;border-radius:6px;background:linear-gradient(90deg,#f7d95c,#e2553f)}
.ssof-tick{position:absolute;top:50%;width:3px;height:12px;margin:-6px 0 0 -1px;background:#fbf6ea;border-radius:2px;opacity:.6}
.ssof-track input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}
.ssof-knob{position:absolute;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:#fbf6ea;border:3px solid #e2553f;pointer-events:none}
.ssof-tip{position:absolute;bottom:34px;transform:translateX(-50%);background:#fbf6ea;color:#2b2a33;padding:2px 8px;border-radius:6px;font-family:Caveat,cursive;font-weight:700;font-size:18px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s}
.ssof-track:hover .ssof-tip{opacity:1}
.ssof:fullscreen{border-radius:0;display:flex;flex-direction:column;justify-content:center;background:#111}
.ssof:fullscreen .ssof-stage{max-height:calc(100vh - 50px);width:auto;margin:0 auto;height:calc(100vh - 50px)}
@media (max-width:560px){.ssof-chapter{display:none}.ssof-bar{gap:4px;padding:6px}}
`;

const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>',
  restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>',
  cc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.2a2.3 2.3 0 1 0 0 3.6M17 10.2a2.3 2.3 0 1 0 0 3.6" stroke-linecap="round"/></svg>',
  full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  bigPlay:
    '<svg viewBox="0 0 120 120"><path d="M60 6c29 1 55 22 54 55-1 31-25 54-55 53C29 113 5 90 6 59 7 29 31 5 60 6z" fill="#f7d95c" stroke="#2b2a33" stroke-width="5" stroke-linejoin="round"/><path d="M48 37c2-1 30 17 31 22 0 3-29 22-32 21-2-1-2-42 1-43z" fill="#2b2a33"/></svg>',
};

const fmt = (s) => {
  s = Math.max(0, Math.floor(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function ensureAssets() {
  if (!document.getElementById("ssof-style")) {
    const st = document.createElement("style");
    st.id = "ssof-style";
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  if (!document.querySelector(`link[href="${FONT_CSS}"]`)) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = FONT_CSS;
    document.head.appendChild(l);
  }
}

async function loadFonts() {
  if (!document.fonts?.load) return;
  const wanted = ["700 40px Caveat", "400 40px 'Permanent Marker'", "400 40px 'Special Elite'"];
  await Promise.race([
    Promise.all(wanted.map((f) => document.fonts.load(f).catch(() => null))),
    new Promise((r) => setTimeout(r, 3500)),
  ]);
}

export async function createFilm(container, opts = {}) {
  const {
    cta = [{ label: "Try it: sign in to Aircall →", href: "/vendors/aircall", primary: true }],
    startAt = 0,
    posterAt = 3.9,
  } = opts;
  ensureAssets();

  const root = document.createElement("div");
  root.className = "ssof";
  root.tabIndex = 0;
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "Animated explainer: single sign-on (3 minutes 20 seconds, no audio, subtitles)");
  root.innerHTML = `
    <div class="ssof-stage">
      <canvas role="img" aria-label="Hand-drawn collage animation explaining single sign-on. Subtitles below describe each scene."></canvas>
      <div class="ssof-sub off" aria-hidden="true"><span></span></div>
      <div class="ssof-end hidden"></div>
      <button class="ssof-cover" type="button" aria-label="Play the film">
        ${ICON.bigPlay}
        <b>Watch the 3-minute story</b>
        <small>no sound needed · subtitles on</small>
      </button>
      <div class="ssof-loading">sharpening pencils…</div>
    </div>
    <div class="ssof-bar">
      <button data-a="play" aria-label="Play">${ICON.play}</button>
      <button data-a="restart" aria-label="Restart">${ICON.restart}</button>
      <span class="ssof-time">0:00 / ${fmt(DURATION)}</span>
      <div class="ssof-track">
        <div class="ssof-rail"><div class="ssof-fill"></div></div>
        <div class="ssof-knob"></div>
        <div class="ssof-tip"></div>
        <input type="range" min="0" max="${DURATION}" step="0.1" value="0" aria-label="Seek">
      </div>
      <span class="ssof-chapter"></span>
      <button data-a="cc" aria-label="Subtitles" aria-pressed="true">${ICON.cc}</button>
      <button data-a="full" aria-label="Full screen">${ICON.full}</button>
    </div>`;
  container.innerHTML = "";
  container.appendChild(root);

  const $ = (s) => root.querySelector(s);
  const stage = $(".ssof-stage");
  const canvas = $("canvas");
  const ctx = canvas.getContext("2d");
  const sub = $(".ssof-sub");
  const subText = $(".ssof-sub span");
  const cover = $(".ssof-cover");
  const end = $(".ssof-end");
  const loading = $(".ssof-loading");
  const playBtn = $('[data-a="play"]');
  const ccBtn = $('[data-a="cc"]');
  const timeEl = $(".ssof-time");
  const fill = $(".ssof-fill");
  const knob = $(".ssof-knob");
  const range = $(".ssof-track input");
  const tip = $(".ssof-tip");
  const chapterEl = $(".ssof-chapter");
  const rail = $(".ssof-rail");

  CHAPTERS.forEach((c) => {
    if (!c.t) return;
    const tick = document.createElement("div");
    tick.className = "ssof-tick";
    tick.style.left = `${(c.t / DURATION) * 100}%`;
    rail.appendChild(tick);
  });

  cta.forEach((c) => {
    const a = document.createElement("a");
    a.href = c.href;
    a.textContent = c.label;
    if (c.primary) a.className = "primary";
    end.appendChild(a);
  });
  const again = document.createElement("button");
  again.type = "button";
  again.textContent = "↺ watch again";
  end.appendChild(again);

  const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  state.reduced = !!mq?.matches;

  await loadFonts();
  const tex = makeTextures();
  state.kraft = tex.kraft;
  state.grain = tex.grain;
  state.paper = ctx.createPattern(tex.paperCanvas, "repeat");
  loading.remove();

  let t = startAt || posterAt;
  let playing = false;
  let started = !!startAt;
  let captions = true;
  let dirty = true;
  let last = performance.now();
  let raf = 0;
  let cssW = 0;
  let lastSub = null;

  function resize() {
    const r = stage.getBoundingClientRect();
    cssW = r.width;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    root.style.setProperty("--fs", `${Math.max(14, r.width * 0.0265)}px`);
    root.style.setProperty("--fsBig", `${Math.max(20, r.width * 0.036)}px`);
    root.style.setProperty("--fsSmall", `${Math.max(11, r.width * 0.014)}px`);
    root.style.setProperty("--fsCta", `${Math.max(16, r.width * 0.024)}px`);
    dirty = true;
  }

  function draw() {
    state.boil = state.reduced ? 0 : Math.floor(t * 8);
    const sx = canvas.width / W, sy = canvas.height / H;
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.clearRect(0, 0, W, H);
    try {
      render(ctx, t);
    } catch (e) {
      console.error("[film] render error at t=" + t.toFixed(2), e);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function syncUi() {
    const p = (t / DURATION) * 100;
    fill.style.width = `${p}%`;
    knob.style.left = `${p}%`;
    range.value = String(t);
    timeEl.textContent = `${fmt(t)} / ${fmt(DURATION)}`;
    chapterEl.textContent = chapterAt(t).title;
    const s = started && captions ? subtitleAt(t) : "";
    if (s !== lastSub) {
      lastSub = s;
      if (s) subText.textContent = s;
      sub.classList.toggle("off", !s);
    }
    playBtn.innerHTML = playing ? ICON.pause : ICON.play;
    playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    end.classList.toggle("hidden", !(t >= DURATION - 6.5 && started));
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing) {
      t += dt;
      if (t >= DURATION) {
        t = DURATION;
        playing = false;
      }
      dirty = true;
    }
    if (dirty) {
      draw();
      syncUi();
      dirty = false;
    }
    raf = requestAnimationFrame(frame);
  }

  function play() {
    if (t >= DURATION) t = 0;
    if (!started) {
      started = true;
      t = startAt || 0;
    }
    playing = true;
    cover.classList.add("hidden");
    last = performance.now();
    dirty = true;
  }
  function pause() {
    playing = false;
    dirty = true;
  }
  function toggle() {
    playing ? pause() : play();
  }
  function seek(v) {
    if (!started) {
      started = true;
      cover.classList.add("hidden");
    }
    t = Math.max(0, Math.min(DURATION, v));
    dirty = true;
  }

  cover.addEventListener("click", (e) => {
    e.stopPropagation();
    play();
  });
  stage.addEventListener("click", (e) => {
    if (e.target.closest("a,button")) return;
    toggle();
  });
  again.addEventListener("click", (e) => {
    e.stopPropagation();
    seek(0);
    play();
  });
  playBtn.addEventListener("click", toggle);
  $('[data-a="restart"]').addEventListener("click", () => {
    seek(0);
    play();
  });
  ccBtn.addEventListener("click", () => {
    captions = !captions;
    ccBtn.setAttribute("aria-pressed", String(captions));
    lastSub = null;
    dirty = true;
  });
  $('[data-a="full"]').addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else root.requestFullscreen?.();
  });
  range.addEventListener("input", () => seek(parseFloat(range.value)));
  range.addEventListener("pointermove", (e) => {
    const r = range.getBoundingClientRect();
    const v = ((e.clientX - r.left) / r.width) * DURATION;
    tip.style.left = `${((e.clientX - r.left) / r.width) * 100}%`;
    tip.textContent = `${fmt(v)} · ${chapterAt(v).title}`;
  });
  root.addEventListener("keydown", (e) => {
    if (e.target === range && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
    const k = e.key.toLowerCase();
    if (k === " " || k === "k") {
      e.preventDefault();
      toggle();
    } else if (k === "arrowright") seek(t + 5);
    else if (k === "arrowleft") seek(t - 5);
    else if (k === "c") ccBtn.click();
    else if (k === "f") $('[data-a="full"]').click();
    else if (k === "home") seek(0);
    else return;
    e.preventDefault();
  });

  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  document.addEventListener("fullscreenchange", resize);
  const onMotion = () => {
    state.reduced = !!mq?.matches;
    dirty = true;
  };
  mq?.addEventListener?.("change", onMotion);
  resize();
  if (startAt) cover.classList.add("hidden");
  raf = requestAnimationFrame(frame);

  const api = {
    play, pause, seek, toggle,
    get time() { return t; },
    get playing() { return playing; },
    renderAt(v) {
      seek(v);
      draw();
      syncUi();
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("fullscreenchange", resize);
      mq?.removeEventListener?.("change", onMotion);
      container.innerHTML = "";
    },
  };
  return api;
}
