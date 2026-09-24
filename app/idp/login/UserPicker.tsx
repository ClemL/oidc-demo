"use client";

import { USERS } from "@/lib/directory";

export function UserPicker() {
  const pick = (username: string) => {
    const u = document.querySelector<HTMLInputElement>('input[name="username"]');
    const p = document.querySelector<HTMLInputElement>('input[name="password"]');
    if (u && p) {
      u.value = username;
      p.value = "demo";
      p.focus();
    }
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      {USERS.map((u) => (
        <button
          key={u.sub}
          type="button"
          onClick={() => pick(u.username)}
          className="rounded-lg border border-line px-3 py-2 text-left text-xs hover:border-accent hover:bg-subtle"
        >
          <div className="font-semibold">{u.givenName} {u.familyName}</div>
          <div className="text-muted">{u.title}</div>
        </button>
      ))}
    </div>
  );
}
