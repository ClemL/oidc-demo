import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { Help, HelpHeading } from "@/components/Help";
import { FlowDiagram } from "@/components/FlowDiagram";
import { JwtViewer } from "@/components/JwtViewer";
import { Tabs } from "@/components/Tabs";
import { UserinfoCall } from "@/components/UserinfoCall";
import { ProtocolMap } from "@/components/ProtocolMap";
import { TokenPanel } from "@/components/TokenPanel";
import { XmlViewer } from "@/components/XmlViewer";
import { findUserBySub, type DirectoryUser } from "@/lib/directory";
import { ATTR, prettyXml, unpackXml } from "@/lib/saml";
import {
  IDP_SESSION_COOKIE, sessionCookie, tokensCookie, unpackTokens, unseal,
  type IdpSession, type OidcTokens, type RpSession,
} from "@/lib/session";
import { VENDORS, isVendorId, type Vendor } from "@/lib/vendors";

type FullSession = RpSession & ({ protocol: "oidc"; tokens: OidcTokens } | { protocol: "saml"; responseXml: string });

function safeSub(token: string) {
  try {
    return decodeJwt(token).sub;
  } catch {
    return undefined;
  }
}

const ERROR_HINTS: Record<string, string> = {
  access_denied: "The IdP authenticated the user but they are not assigned to this application (or they cancelled).",
  login_required: "prompt=none was requested but there is no IdP session, so the IdP could not sign in silently.",
  state_mismatch: "The callback did not originate from this browser's sign-in attempt.",
  invalid_grant: "The code was expired, reused, issued to another client, or PKCE failed.",
  session_ended:
    "The app tried to refresh its tokens and the IdP refused, so the app ended its own session. This is the moment revocation actually takes effect in the vendor.",
  relay_state_mismatch: "The SAML Response did not come back to the browser that asked for it.",
  invalid_signature: "The XML signature did not verify against the IdP certificate the app pinned from metadata.",
  missing_transaction: "The app has no record of starting this sign-in. Unsolicited or replayed responses are rejected.",
};

const TOKEN_BANNERS: Record<string, { tone: "ok" | "bad" | "warn"; text: string }> = {
  refreshed: { tone: "ok", text: "Refreshed: new access token, new ID token and a new refresh token. The previous refresh token is now dead." },
  "reuse-detected": {
    tone: "bad",
    text: "The IdP saw an already-rotated refresh token come back, so it revoked the whole family. The app is still signed in for now; its next refresh will fail.",
  },
  "replay-accepted": { tone: "bad", text: "The replayed refresh token was accepted — rotation is not being enforced." },
  "nothing-to-replay": { tone: "warn", text: "Refresh once first, so there is an old refresh token to replay." },
  "admin-revoked": {
    tone: "warn",
    text: "IdP admin revoked all sessions: refresh tokens and the IdP session are dead. This app is still signed in, and its access token keeps working until it expires. Click Refresh now to see the app lose access.",
  },
};

export default async function VendorPage({ params, searchParams }: PageProps<"/vendors/[vendor]">) {
  const { vendor: id } = await params;
  if (!isVendorId(id)) notFound();
  const vendor = VENDORS[id];
  const sp = await searchParams;
  const jar = await cookies();
  const sealed = await unseal<RpSession>(jar.get(sessionCookie(id))?.value);
  const stored = unpackTokens(jar.get(tokensCookie(id))?.value);
  // The token cookie is display-only; discard it unless it belongs to the sealed session.
  let session: FullSession | null = null;
  if (sealed && stored) {
    if (sealed.protocol === "oidc" && !("saml" in stored) && safeSub(stored.idToken) === sealed.sub) {
      session = { ...sealed, protocol: "oidc", tokens: stored };
    } else if (sealed.protocol === "saml" && "saml" in stored) {
      try {
        const responseXml = unpackXml(stored.saml);
        if (responseXml.includes(`>${sealed.sub}<`)) session = { ...sealed, protocol: "saml", responseXml };
      } catch {
        session = null;
      }
    }
  }
  const idp = await unseal<IdpSession>(jar.get(IDP_SESSION_COOKIE)?.value);
  const idpUser = idp ? findUserBySub(idp.sub) : undefined;
  const user = session ? findUserBySub(session.sub) : undefined;

  return (
    <div className="space-y-6">
      <VendorBar vendor={vendor} user={user} role={session?.role} />

      {typeof sp.error === "string" && (
        <div className="card border-bad/50 bg-bad/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-bad">Sign-in failed</p>
          <p className="font-mono">{sp.error}</p>
          <p className="text-sm">{String(sp.error_description ?? "")}</p>
          {ERROR_HINTS[sp.error] && <p className="mt-1 text-sm text-muted">{ERROR_HINTS[sp.error]}</p>}
          {sp.error === "access_denied" && (
            <p className="mt-2 flex items-center gap-2 text-sm">
              Why this happens <Help topic="assignment" />
            </p>
          )}
        </div>
      )}

      {typeof sp.tokens === "string" && TOKEN_BANNERS[sp.tokens] && (
        <div
          data-testid="token-banner"
          className={`rounded-xl border p-4 text-sm ${
            { ok: "border-ok/50 bg-ok/5", bad: "border-bad/50 bg-bad/5", warn: "border-warn/50 bg-warn/5" }[TOKEN_BANNERS[sp.tokens].tone]
          }`}
        >
          {TOKEN_BANNERS[sp.tokens].text}
          {typeof sp.detail === "string" && <p className="mt-1 font-mono text-xs text-muted">{sp.detail}</p>}
        </div>
      )}

      {session && user ? (
        <SignedIn vendor={vendor} session={session} user={user} />
      ) : (
        <SignedOut vendor={vendor} idpUser={idpUser} localLogout={sp.loggedOut === "local"} />
      )}
    </div>
  );
}

function VendorBar({ vendor, user, role }: { vendor: Vendor; user?: DirectoryUser; role?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl px-5 py-3 text-white" style={{ background: vendor.accent }}>
      <span className="grid h-8 w-8 place-items-center rounded-md bg-white/20 font-bold">{vendor.name[0]}</span>
      <div>
        <div className="font-semibold">{vendor.name}</div>
        <div className="text-xs opacity-85">{vendor.tagline}</div>
      </div>
      <div className="ml-auto flex items-center gap-3 text-sm">
        {user ? (
          <>
            <span>
              {user.givenName} {user.familyName} · <b>{role}</b>
            </span>
            <a href={`/api/rp/${vendor.id}/logout`} className="rounded-md bg-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/30">
              Log out of {vendor.name.split(" ")[0]}
            </a>
            <a href="/api/idp/logout" className="rounded-md bg-black/20 px-3 py-1.5 text-xs font-semibold hover:bg-black/30">
              Global sign-out
            </a>
            <Help topic="logout" />
          </>
        ) : (
          <span className="text-xs opacity-85">Not signed in</span>
        )}
      </div>
    </div>
  );
}

function SignedOut({ vendor, idpUser, localLogout }: { vendor: Vendor; idpUser?: DirectoryUser; localLogout: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div className="card space-y-4 p-7">
        <h1 className="text-xl font-semibold">Sign in to {vendor.name.split(" ")[0]}</h1>
        {localLogout && (
          <p className="rounded-md bg-subtle p-3 text-sm">
            You logged out of this app only. The IdP session is still active, so signing in again will not prompt for a
            password. <Help topic="logout" />
          </p>
        )}
        <a href={`/api/rp/${vendor.id}/login`} className="btn btn-primary w-full justify-center" style={{ background: vendor.accent, color: "#fff" }}>
          Continue with SSO
        </a>
        <a href={`/api/rp/${vendor.id}/saml/login`} className="btn btn-ghost w-full justify-center">
          Continue with SSO (SAML 2.0)
        </a>
        <p className="-mt-2 flex items-center justify-center gap-1.5 text-xs text-muted">
          The first button uses OpenID Connect; the second is how {vendor.name.split(" ")[0]} really does it. <Help topic="saml-flow" />
        </p>
        <div className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">
          Email + password login is <b>disabled</b> for this workspace — SSO is enforced by the admin.
        </div>
        <div className="text-sm">
          {idpUser ? (
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-ok" />
              IdP session found for <b>{idpUser.givenName}</b> → this will be silent SSO. <Help topic="sso" />
            </p>
          ) : (
            <p className="flex items-center gap-2 text-muted">
              <span className="h-2 w-2 rounded-full bg-muted" />
              No IdP session → you will see the IdP sign-in page. <Help topic="sso" />
            </p>
          )}
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Advanced: prompt parameter</summary>
          <div className="mt-2 flex flex-col gap-2">
            <a className="btn btn-ghost" href={`/api/rp/${vendor.id}/login?prompt=login`}>prompt=login (force re-authentication)</a>
            <a className="btn btn-ghost" href={`/api/rp/${vendor.id}/login?prompt=none`}>prompt=none (silent only, fail if no session)</a>
            <a className="btn btn-ghost" href={`/api/rp/${vendor.id}/saml/login?force=1`}>SAML ForceAuthn=&quot;true&quot; (SAML&apos;s prompt=login)</a>
          </div>
        </details>
      </div>
      <div className="space-y-6">
        <div className="card">
          <HelpHeading topic="auth-code-flow">What happens when you click</HelpHeading>
          <FlowDiagram activeUpTo={0} />
        </div>
        <RealWorld vendor={vendor} />
      </div>
    </div>
  );
}

function RealWorld({ vendor }: { vendor: Vendor }) {
  return (
    <div className="card">
      <HelpHeading topic={vendor.id === "aircall" ? "vendor-aircall" : "vendor-lattice"}>
        The real {vendor.name.split(" ")[0]} integration
      </HelpHeading>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">SSO protocol</dt><dd className="text-muted">{vendor.realWorld.protocols}</dd></div>
        <div><dt className="font-semibold">Provisioning</dt><dd className="text-muted">{vendor.realWorld.provisioning}</dd></div>
        <div><dt className="font-semibold">Licensing</dt><dd className="text-muted">{vendor.realWorld.plan}</dd></div>
        <div><dt className="font-semibold">Caveat</dt><dd className="text-muted">{vendor.realWorld.caveat}</dd></div>
      </dl>
    </div>
  );
}

function SignedIn({ vendor, session, user }: { vendor: Vendor; session: FullSession; user: DirectoryUser }) {
  const saml = session.protocol === "saml";
  const claims = session.protocol === "oidc" ? decodeJwt(session.tokens.idToken) : {};
  const samlAttrs = saml ? samlAttributes(session.responseXml) : {};
  const groups = saml ? samlAttrs[ATTR.groups] ?? [] : ((claims.groups as string[]) ?? []);
  const methods = saml
    ? (samlAttrs[ATTR.amr] ?? []).map((m) => (m.endsWith("multipleauthn") ? "mfa" : "pwd"))
    : ((claims.amr as string[]) ?? []);
  const protocolLabel = saml ? "SAML 2.0" : "OpenID Connect";
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Sign-in type" value={`${session.silent ? "Silent SSO" : "Interactive"} · ${protocolLabel}`} note={session.silent ? "IdP session reused, no password" : `Authenticated via ${methods.join(" + ")}`} help="sso" />
        <Stat label="Account" value={session.jit ? "Created just-in-time" : "Existing account"} note={`Matched on sub …${session.sub.slice(-6)}`} help="jit" />
        <Stat label="Role in app" value={session.role} note={session.roleSource ? `from group ${session.roleSource}` : "default role"} help="role-mapping" />
      </div>

      {vendor.id === "aircall" ? <AircallDash session={session} /> : <LatticeDash session={session} user={user} />}

      {session.protocol === "oidc" && (
        <TokenPanel
          vendorId={vendor.id}
          sub={session.sub}
          userName={user.givenName}
          accessExp={Number(decodeJwt(session.tokens.accessToken).exp)}
          family={session.family}
          hasRefresh={!!session.tokens.refreshToken}
          hasPrevious={!!session.tokens.prevRefreshToken}
        />
      )}

      <div className="card">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Under the hood</h2>
          <Help topic="trace" />
        </div>
        <p className="mb-4 text-sm text-muted">Everything the vendor&apos;s server saw and checked during this sign-in.</p>
        <Tabs
          tabs={[
            {
              id: "trace",
              label: "Protocol trace",
              content: (
                <ol className="space-y-3">
                  {session.trace.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-panel">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{s.label}</div>
                        {s.detail && <div className="code-block mt-1">{s.detail}</div>}
                      </div>
                    </li>
                  ))}
                </ol>
              ),
            },
            {
              id: "checks",
              label: "Validation checks",
              content: (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted">Why each check exists <Help topic="validation" /> <Help topic="jwks" label="JWKS" /> <Help topic="state-nonce" label="nonce" /></div>
                  <ul className="divide-y divide-line rounded-lg border border-line">
                    {session.checks.map((c) => (
                      <li key={c.name} className="flex items-start gap-3 px-3 py-2 text-sm">
                        <span className={c.ok ? "text-ok" : "text-bad"}>{c.ok ? "✓" : "✗"}</span>
                        <span className="w-28 shrink-0 font-mono font-semibold">{c.name}</span>
                        <span className="text-muted">{c.detail}</span>
                      </li>
                    ))}
                    {saml ? (
                      <li className="flex items-start gap-3 px-3 py-2 text-sm">
                        <span className="text-ok">✓</span>
                        <span className="w-28 shrink-0 font-mono font-semibold">RelayState</span>
                        <span className="text-muted">matched the transaction cookie before the Response was processed (CSRF protection)</span>
                      </li>
                    ) : (
                      <>
                        <li className="flex items-start gap-3 px-3 py-2 text-sm">
                          <span className="text-ok">✓</span>
                          <span className="w-28 shrink-0 font-mono font-semibold">state</span>
                          <span className="text-muted">matched the transaction cookie before the code was used (CSRF protection)</span>
                        </li>
                        <li className="flex items-start gap-3 px-3 py-2 text-sm">
                          <span className="text-ok">✓</span>
                          <span className="w-28 shrink-0 font-mono font-semibold">PKCE</span>
                          <span className="text-muted">IdP confirmed SHA-256(code_verifier) = code_challenge</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              ),
            },
            ...(session.protocol === "oidc"
              ? [
                  {
                    id: "idtoken",
                    label: "ID token",
                    content: (
                      <div>
                        <div className="mb-3 flex items-center gap-2 text-sm text-muted">Claim-by-claim explanation <Help topic="id-token" /></div>
                        <JwtViewer token={session.tokens.idToken} />
                      </div>
                    ),
                  },
                  {
                    id: "access",
                    label: "Access token & /userinfo",
                    content: (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted">ID token vs. access token <Help topic="access-token" /></div>
                        <UserinfoCall accessToken={session.tokens.accessToken} />
                        <details>
                          <summary className="cursor-pointer text-sm text-muted">Decode the access token</summary>
                          <div className="mt-3"><JwtViewer token={session.tokens.accessToken} /></div>
                        </details>
                      </div>
                    ),
                  },
                ]
              : [
                  {
                    id: "saml",
                    label: "SAML Response",
                    content: (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted">
                          The signed XML the browser POSTed to the app. The highlighted block is the signature. <Help topic="saml-flow" />
                        </div>
                        <XmlViewer xml={prettyXml(session.responseXml)} />
                        <p className="text-xs text-muted">
                          Indented for reading. The app verified the exact bytes it received: re-indenting signed XML changes its digest unless
                          it is canonicalized first.
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "map",
                    label: "OIDC ↔ SAML",
                    content: (
                      <div className="space-y-3">
                        <p className="text-sm text-muted">Every check in the OIDC flow has a SAML twin. Values are from this sign-in.</p>
                        <ProtocolMap
                          values={{
                            "Who the user is": { saml: samlAttrs[ATTR.objectId]?.[0] },
                            "Groups for roles": { saml: groups.join(", ") },
                          }}
                        />
                      </div>
                    ),
                  },
                ]),
            {
              id: "roles",
              label: "Role mapping",
              content: (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted">First matching rule wins <Help topic="role-mapping" /></div>
                  <table className="w-full">
                    <thead className="text-left text-xs uppercase tracking-wider text-muted">
                      <tr><th className="py-1">IdP group</th><th>App role</th><th>In token?</th></tr>
                    </thead>
                    <tbody>
                      {vendor.roleRules.map((r) => {
                        const hit = groups.includes(r.group);
                        const chosen = session.roleSource === r.group;
                        return (
                          <tr key={r.group} className={`border-t border-line ${chosen ? "bg-accent/10" : ""}`}>
                            <td className="py-1.5 font-mono">{r.group}</td>
                            <td>{r.role}</td>
                            <td>{hit ? <span className="text-ok">yes{chosen ? " → applied" : ""}</span> : <span className="text-muted">no</span>}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-t border-line">
                        <td className="py-1.5 text-muted">(no match)</td>
                        <td>{vendor.defaultRole}</td>
                        <td className="text-muted">default</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-muted">
                    <code className="code-inline">groups</code> {saml ? "attribute" : "claim"}: {groups.map((g) => <span key={g} className="pill mr-1">{g}</span>)}
                  </p>
                </div>
              ),
            },
          ]}
        />
      </div>

      {!saml && (
        <div className="card">
          <HelpHeading topic="auth-code-flow">The flow that just ran</HelpHeading>
          <FlowDiagram />
        </div>
      )}
      <RealWorld vendor={vendor} />
    </div>
  );
}

/** Display-only attribute read; the ACS route already verified the signature. */
function samlAttributes(xml: string) {
  const out: Record<string, string[]> = {};
  for (const m of xml.matchAll(/<saml:Attribute Name="([^"]+)">(.*?)<\/saml:Attribute>/g)) {
    out[m[1]] = [...m[2].matchAll(/<saml:AttributeValue>([^<]*)<\/saml:AttributeValue>/g)].map((v) => v[1]);
  }
  return out;
}

function Stat({ label, value, note, help }: { label: string; value: string; note: string; help: "sso" | "jit" | "role-mapping" }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted">
        {label} <Help topic={help} />
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted">{note}</div>
    </div>
  );
}

const CALLS = [
  { dir: "Inbound", who: "Hospital pharmacy desk", dur: "4:12", when: "09:41", line: "Support" },
  { dir: "Outbound", who: "+1 617 555 0199", dur: "1:05", when: "10:02", line: "Support" },
  { dir: "Missed", who: "+1 781 555 0123", dur: "—", when: "10:18", line: "Main" },
  { dir: "Inbound", who: "Vendor escalation", dur: "12:47", when: "11:30", line: "Support" },
];

function AircallDash({ session }: { session: RpSession }) {
  const admin = session.role === "Admin";
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="card">
        <h2 className="mb-3 font-semibold">Recent calls</h2>
        <table className="w-full text-sm">
          <tbody>
            {CALLS.map((c, i) => (
              <tr key={i} className="border-t border-line first:border-0">
                <td className="py-2">
                  <span className={`pill ${c.dir === "Missed" ? "text-bad" : ""}`}>{c.dir}</span>
                </td>
                <td>{c.who}</td>
                <td className="text-muted">{c.line}</td>
                <td className="font-mono text-muted">{c.dur}</td>
                <td className="text-right text-muted">{c.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card space-y-3 text-sm">
        <h2 className="font-semibold">Workspace settings</h2>
        {admin ? (
          <>
            <p className="text-ok">Admin access granted by the App-Aircall-Admins group.</p>
            <ul className="space-y-1">
              <li>• Numbers: Support (+1 617 555 0142), Main (+1 617 555 0100)</li>
              <li>• Users: 2 seats in use</li>
              <li>• SSO: enforced · Provisioning: SCIM</li>
            </ul>
          </>
        ) : (
          <p className="text-muted">Settings are hidden — your role is <b>Agent</b>. An IdP admin would add you to App-Aircall-Admins to change that.</p>
        )}
      </div>
    </div>
  );
}

function LatticeDash({ session, user }: { session: RpSession; user: DirectoryUser }) {
  const goals = [
    { name: "Ship 340B reconciliation v2", pct: 70 },
    { name: "Reduce claim data latency to <24h", pct: 45 },
    { name: "Complete security awareness training", pct: 100 },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="card">
        <h2 className="mb-3 font-semibold">{user.givenName}&apos;s goals</h2>
        <ul className="space-y-3 text-sm">
          {goals.map((g) => (
            <li key={g.name}>
              <div className="flex justify-between"><span>{g.name}</span><span className="text-muted">{g.pct}%</span></div>
              <div className="mt-1 h-2 rounded-full bg-subtle">
                <div className="h-2 rounded-full" style={{ width: `${g.pct}%`, background: "#6d5dfc" }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="card space-y-2 text-sm">
        <h2 className="font-semibold">Review cycle: Q4 2026</h2>
        <p className="text-muted">Self-review due Oct 15.</p>
        {session.role === "Manager" && <p>You have <b>1 direct report</b> awaiting a manager review. (Reporting lines come from the HRIS, not SSO.)</p>}
        {session.role === "Super Admin" && <p>You can configure review cycles and permissions for the whole company.</p>}
        {session.role === "Employee" && <p className="text-muted">Employee view — no admin or manager tools.</p>}
      </div>
    </div>
  );
}
