/** One concept, two wire formats. Values are optional so the table works as a reference or for a live sign-in. */
export const PROTOCOL_ROWS = [
  { concept: "Who issued it", oidc: "iss", saml: "<saml:Issuer>", why: "Must equal the IdP you configured." },
  { concept: "Who it is for", oidc: "aud", saml: "<saml:Audience>", why: "Stops a token for app A being replayed at app B." },
  { concept: "Who the user is", oidc: "sub", saml: "<saml:NameID> + objectidentifier", why: "Key accounts on the immutable id, not the email." },
  { concept: "Bound to this sign-in", oidc: "nonce (+ state)", saml: "InResponseTo (+ RelayState)", why: "Replay and login-CSRF protection." },
  { concept: "Where it may be delivered", oidc: "redirect_uri", saml: "Recipient / ACS URL", why: "Exact match, registered in advance." },
  { concept: "Validity window", oidc: "iat / exp", saml: "NotBefore / NotOnOrAfter", why: "Short-lived; small clock skew allowed." },
  { concept: "When / how they signed in", oidc: "auth_time, amr", saml: "AuthnInstant, AuthnContext, authnmethodsreferences", why: "Detects silent SSO; step-up MFA decisions." },
  { concept: "Groups for roles", oidc: "groups claim", saml: "groups <saml:Attribute>", why: "Drives the app's role mapping." },
  { concept: "Integrity", oidc: "JWS signature (ES256)", saml: "XML-DSig (ecdsa-sha256, exc-c14n)", why: "Verified with the IdP's published key or certificate." },
  { concept: "Key distribution", oidc: "JWKS URL (auto-rotates)", saml: "X.509 cert in metadata (manual rollover)", why: "SAML cert expiry is a classic outage cause." },
  { concept: "How it reaches the app", oidc: "code via browser, tokens via back channel", saml: "whole assertion via browser POST", why: "SAML has no back channel; the signature is everything." },
  { concept: "Calling APIs later", oidc: "access + refresh tokens", saml: "none (session only)", why: "SAML is sign-in only; OIDC/OAuth also covers API access." },
] as const;

export function ProtocolMap({ values }: { values?: Partial<Record<string, { oidc?: string; saml?: string }>> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="py-1.5 pr-3">Concept</th>
            <th className="pr-3">OIDC (JWT)</th>
            <th className="pr-3">SAML 2.0 (XML)</th>
            <th>Why it matters</th>
          </tr>
        </thead>
        <tbody>
          {PROTOCOL_ROWS.map((r) => {
            const v = values?.[r.concept];
            return (
              <tr key={r.concept} className="border-t border-line align-top">
                <td className="py-2 pr-3 font-semibold">{r.concept}</td>
                <td className="pr-3">
                  <code className="code-inline">{r.oidc}</code>
                  {v?.oidc && <div className="mt-0.5 break-all font-mono text-xs text-muted">{v.oidc}</div>}
                </td>
                <td className="pr-3">
                  <code className="code-inline">{r.saml}</code>
                  {v?.saml && <div className="mt-0.5 break-all font-mono text-xs text-muted">{v.saml}</div>}
                </td>
                <td className="text-muted">{r.why}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
