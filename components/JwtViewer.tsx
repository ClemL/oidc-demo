import { decodeJwt, decodeProtectedHeader } from "jose";

const CLAIM_NOTES: Record<string, string> = {
  iss: "Issuer — must equal the configured IdP",
  sub: "Subject — stable user id; use as the account key",
  aud: "Audience — the client_id this token is for",
  exp: "Expiry (Unix seconds)",
  iat: "Issued at",
  auth_time: "When the user actually authenticated",
  amr: "Authentication methods (pwd, mfa)",
  nonce: "Echo of the RP's nonce — replay protection",
  at_hash: "Binds this ID token to the access token",
  groups: "Group memberships — drives role mapping",
  email: "Email (not a safe primary key)",
  preferred_username: "UPN-like login name",
  scope: "Granted scopes",
  client_id: "Client the token was issued to",
  jti: "Unique token id",
  typ: "Token type",
  alg: "Signature algorithm",
  kid: "Which JWKS key signed this",
};

function fmt(k: string, v: unknown) {
  if ((k === "exp" || k === "iat" || k === "auth_time") && typeof v === "number") {
    return `${v}  (${new Date(v * 1000).toLocaleString("en-US", { timeZone: "America/New_York" })} ET)`;
  }
  return JSON.stringify(v);
}

export function JwtViewer({ token }: { token: string }) {
  const [h, p, s] = token.split(".");
  const header = decodeProtectedHeader(token) as Record<string, unknown>;
  const payload = decodeJwt(token) as Record<string, unknown>;
  return (
    <div className="space-y-4">
      <div className="code-block">
        <span className="jwt-h">{h}</span>.<span className="jwt-p">{p}</span>.<span className="jwt-s">{s}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ClaimTable title="Header" cls="jwt-h" data={header} />
        <ClaimTable title="Payload" cls="jwt-p" data={payload} />
      </div>
      <p className="text-xs text-muted">
        <span className="jwt-s font-semibold">Signature</span> — ECDSA P-256 over <code className="code-inline">header.payload</code>.
        Decoding needs no key; <i>verifying</i> needs the IdP&apos;s public key from JWKS.
      </p>
    </div>
  );
}

function ClaimTable({ title, cls, data }: { title: string; cls: string; data: Record<string, unknown> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className={`border-b border-line bg-subtle px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${cls}`}>{title}</div>
      <table className="w-full text-xs">
        <tbody>
          {Object.entries(data).map(([k, v]) => (
            <tr key={k} className="border-b border-line last:border-0 align-top">
              <td className="whitespace-nowrap px-3 py-1.5 font-mono font-semibold">{k}</td>
              <td className="px-3 py-1.5">
                <div className="font-mono break-all">{fmt(k, v)}</div>
                {CLAIM_NOTES[k] && <div className="text-muted">{CLAIM_NOTES[k]}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
