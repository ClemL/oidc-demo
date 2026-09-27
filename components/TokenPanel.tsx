"use client";

import { useEffect, useState } from "react";
import { Help } from "./Help";

/** Live view of the vendor's OIDC tokens, with refresh, replay and admin-revoke actions. */
export function TokenPanel(p: {
  vendorId: string;
  sub: string;
  userName: string;
  accessExp: number; // unix seconds
  family?: { fid: string; gen: number };
  hasRefresh: boolean;
  hasPrevious: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = now === null ? null : Math.max(0, Math.round(p.accessExp - now / 1000));
  const expired = left === 0;

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Tokens held by the app</h2>
        <Help topic="refresh-tokens" />
        <Help topic="revocation" label="revocation" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line p-3 text-sm">
          <div className="text-xs uppercase tracking-wider text-muted">Access token</div>
          <div className={`mt-1 text-lg font-semibold ${expired ? "text-bad" : ""}`} data-testid="at-status">
            {left === null ? "…" : expired ? "Expired" : `Expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}
          </div>
          <p className="text-xs text-muted">
            Lives 2 minutes (deliberately short). {expired ? "Calls to /userinfo now return 401 until the app refreshes." : "Revoking the user does not shorten it: a JWT is valid until exp."}
          </p>
        </div>
        <div className="rounded-lg border border-line p-3 text-sm">
          <div className="text-xs uppercase tracking-wider text-muted">Refresh token</div>
          {p.hasRefresh && p.family ? (
            <>
              <div className="mt-1 text-lg font-semibold" data-testid="rt-gen">Generation {p.family.gen}</div>
              <p className="text-xs text-muted">
                Family <code className="code-inline">{p.family.fid}</code>. Each use returns a new one and kills the old one (rotation).
              </p>
            </>
          ) : (
            <p className="mt-1 text-muted">None (no offline_access).</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <form action={`/api/rp/${p.vendorId}/refresh`} method="post">
          <input type="hidden" name="action" value="refresh" />
          <button className="btn btn-primary" disabled={!p.hasRefresh}>Refresh now</button>
        </form>
        <form action={`/api/rp/${p.vendorId}/refresh`} method="post">
          <input type="hidden" name="action" value="replay" />
          <button
            className="btn btn-ghost"
            disabled={!p.hasPrevious}
            title={p.hasPrevious ? "Present the already-rotated refresh token, as an attacker with a stolen copy would" : "Refresh once first, so there is an old token to replay"}
          >
            Attacker: replay the old refresh token
          </button>
        </form>
        <form action="/api/idp/admin/revoke-sessions" method="post">
          <input type="hidden" name="sub" value={p.sub} />
          <input type="hidden" name="back" value={p.vendorId} />
          <button className="btn btn-ghost border-bad/50 text-bad">IdP admin: revoke all sessions for {p.userName}</button>
        </form>
      </div>
      <p className="text-xs text-muted">
        Try: <b>Refresh now</b> → <b>replay</b> (the IdP detects reuse and revokes the family) → <b>Refresh now</b> again (the app is
        locked out). Or <b>revoke</b>, and notice the app stays signed in until its next refresh.
      </p>
    </div>
  );
}
