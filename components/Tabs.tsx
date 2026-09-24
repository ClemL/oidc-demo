"use client";

import { useState, type ReactNode } from "react";

export function Tabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div>
      <div role="tablist" className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              active === t.id ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" hidden={active !== t.id}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
