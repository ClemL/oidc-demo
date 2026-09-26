"use client";

import { useEffect, useRef } from "react";

/**
 * A native <details> section with a chevron summary. Open by default; it also
 * opens itself when the page navigates to (or links to) its id.
 */
export function Collapsible({
  id,
  summary,
  children,
  className = "card",
  summaryClassName = "text-lg font-semibold",
  defaultOpen = true,
}: {
  id?: string;
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  summaryClassName?: string;
  defaultOpen?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!id) return;
    const reveal = () => {
      if (location.hash === `#${id}` && ref.current) ref.current.open = true;
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (a?.getAttribute("href") === `#${id}` && ref.current) ref.current.open = true;
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", reveal);
      document.removeEventListener("click", onClick);
    };
  }, [id]);

  return (
    <details ref={ref} id={id} open={defaultOpen} className={`group ${className}`}>
      <summary
        className={`flex cursor-pointer list-none flex-wrap items-center gap-2 select-none [&::-webkit-details-marker]:hidden ${summaryClassName}`}
      >
        <span
          aria-hidden
          className="inline-block w-3 shrink-0 text-xs text-muted transition-transform group-open:rotate-90"
        >
          ▶
        </span>
        {summary}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
