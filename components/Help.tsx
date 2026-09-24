"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HELP, type HelpKey } from "@/lib/help";

/** A "?" button that opens a side panel explaining one part of the demo. */
export function Help({ topic, label }: { topic: HelpKey; label?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const t = HELP[topic];

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="help-btn"
        aria-label={`Explain: ${t.title}`}
        title={t.title}
      >
        ?{label && <span className="ml-1 font-medium">{label}</span>}
      </button>
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
            <aside
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative flex h-full w-full max-w-lg flex-col border-l border-line bg-panel shadow-2xl animate-slide-in"
            >
              <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent">Explainer</p>
                  <h2 id={titleId} className="text-lg font-semibold">
                    {t.title}
                  </h2>
                </div>
                <button
                  ref={closeRef}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-1 text-muted hover:bg-subtle"
                  aria-label="Close"
                >
                  ✕
                </button>
              </header>
              <div className="prose-help flex-1 overflow-y-auto px-6 py-5">{t.body}</div>
              {"links" in t && t.links && (
                <footer className="border-t border-line px-6 py-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Sources &amp; further reading</p>
                  <ul className="space-y-1 text-sm">
                    {t.links.map((l) => (
                      <li key={l.href}>
                        <a href={l.href} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                          {l.label} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </footer>
              )}
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Section heading with an attached help button. */
export function HelpHeading({ topic, children, as: Tag = "h2" }: { topic: HelpKey; children: React.ReactNode; as?: "h2" | "h3" }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Tag className={Tag === "h2" ? "text-lg font-semibold" : "text-base font-semibold"}>{children}</Tag>
      <Help topic={topic} />
    </div>
  );
}
