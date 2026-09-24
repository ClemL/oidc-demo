"use client";

import { useState } from "react";

export function UserinfoCall({ accessToken }: { accessToken: string }) {
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(token: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/idp/userinfo", { headers: { Authorization: `Bearer ${token}` } });
      setOut(`HTTP ${r.status}\n${JSON.stringify(await r.json(), null, 2)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="code-block">GET /api/idp/userinfo{"\n"}Authorization: Bearer {accessToken.slice(0, 32)}…</div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={busy} onClick={() => call(accessToken)}>Call /userinfo</button>
        <button
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => call(accessToken.slice(0, -4) + (accessToken.endsWith("AAAA") ? "BBBB" : "AAAA"))}
          title="Alters the signature to show the API rejecting a forged token"
        >
          Call with tampered token
        </button>
      </div>
      {out && <pre className="code-block">{out}</pre>}
    </div>
  );
}
