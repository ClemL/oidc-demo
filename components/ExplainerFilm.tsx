"use client";

import { useEffect, useRef, useState } from "react";

type Chapter = { t: number; title: string };
type Subtitle = [number, number, string];
type FilmApi = { destroy(): void; seek(t: number): void; play(): void; pause(): void };
type FilmModule = {
  createFilm(el: HTMLElement, opts: unknown): Promise<FilmApi>;
  CHAPTERS: Chapter[];
  SUBTITLES: Subtitle[];
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Embeds the hand-drawn explainer film. The film itself is plain JavaScript
 * served from /public/film, loaded at runtime so it stays framework-free.
 */
export function ExplainerFilm() {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<FilmApi | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subs, setSubs] = useState<Subtitle[]>([]);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const src = "/film/film.js";
    import(/* webpackIgnore: true */ /* turbopackIgnore: true */ src)
      .then((mod: FilmModule) => {
        if (cancelled || !host.current) return;
        setChapters(mod.CHAPTERS);
        setSubs(mod.SUBTITLES);
        return mod
          .createFilm(host.current, {
            cta: [
              { label: "Sign in to Aircall as alex →", href: "/vendors/aircall", primary: true },
              { label: "Run a SCIM cycle →", href: "/provisioning" },
              { label: "Read the integration guide", href: "/guide" },
            ],
          })
          .then((a) => {
            if (cancelled) a.destroy();
            else {
              api.current = a;
              setLoaded(true);
            }
          });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      api.current?.destroy();
      api.current = null;
    };
  }, []);

  // Pause when a collapsible ancestor section is closed.
  useEffect(() => {
    const details = host.current?.closest("details");
    if (!details) return;
    const onToggle = () => !details.open && api.current?.pause();
    details.addEventListener("toggle", onToggle);
    return () => details.removeEventListener("toggle", onToggle);
  }, []);

  const jump = (t: number) => {
    api.current?.seek(t);
    api.current?.play();
    host.current?.querySelector<HTMLElement>(".ssof")?.focus();
  };

  return (
    <div>
      {/* The film script owns this node's children; React never renders into it. */}
      <div ref={host} className={loaded ? "w-full" : "aspect-video w-full rounded-[14px] bg-[#cdb48b]"} />
      {failed && <p className="mt-2 text-sm text-bad">The film could not be loaded. Try refreshing the page.</p>}
      {chapters.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="mr-1 text-muted">Jump to:</span>
          {chapters.map((c) => (
            <button key={c.t} onClick={() => jump(c.t)} className="pill hover:border-accent hover:text-accent">
              <span className="font-mono text-muted">{fmt(c.t)}</span> {c.title}
            </button>
          ))}
        </div>
      )}
      {subs.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted">Read the transcript</summary>
          <ol className="mt-2 space-y-1">
            {subs.map(([a, , line]) => (
              <li key={a} className="flex gap-3">
                <button onClick={() => jump(a)} className="shrink-0 font-mono text-xs text-accent hover:underline">
                  {fmt(a)}
                </button>
                <span>{line}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
