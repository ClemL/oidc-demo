import type { ReactNode } from "react";
import { Help } from "./Help";
import type { HelpKey } from "@/lib/help";

/*
 * "How OpenID Connect works" infographic. Colours are categorical and carry meaning:
 *   neutral = browser, accent (blue) = the app, ok (green) = the identity provider,
 *   warn (amber) = a protection. Everything uses theme tokens, so it works in both themes.
 */

type Party = "browser" | "app" | "idp";
const PARTY: Record<Party, { name: string; sub: string; color: string }> = {
  browser: { name: "User & browser", sub: "carries the redirects", color: "var(--muted)" },
  app: { name: "The app", sub: "relying party (Aircall)", color: "var(--accent)" },
  idp: { name: "Identity provider", sub: "OpenID provider (Entra ID)", color: "var(--ok)" },
};

function Icon({ kind, size = 24 }: { kind: Party | "key" | "check"; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...common}>
      {kind === "browser" && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      )}
      {kind === "app" && (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <path d="M3 9h18M7 6.5h.01M10 6.5h.01" />
        </>
      )}
      {kind === "idp" && (
        <>
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
          <path d="M9.5 12l2 2 3.5-4" />
        </>
      )}
      {kind === "key" && (
        <>
          <circle cx="8" cy="15" r="4" />
          <path d="M11 12l8-8M16 7l2 2M14 9l2 2" />
        </>
      )}
      {kind === "check" && <path d="M5 12.5l4.5 4.5L19 7.5" />}
    </svg>
  );
}

function SectionTitle({ n, children, help }: { n: number; children: ReactNode; help?: HelpKey }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-fg text-sm font-bold text-panel">{n}</span>
      <h2 className="text-xl font-semibold">{children}</h2>
      {help && <Help topic={help} />}
    </div>
  );
}

export function OidcInfographic() {
  return (
    <div className="space-y-12">
      <Equation />
      <section>
        <SectionTitle n={1} help="architecture">Three parties, one trust relationship</SectionTitle>
        <Parties />
      </section>
      <section>
        <SectionTitle n={2} help="auth-code-flow">The sign-in, in six moves</SectionTitle>
        <FlowMap />
        <FlowList />
      </section>
      <section>
        <SectionTitle n={3} help="id-token">Anatomy of an ID token</SectionTitle>
        <IdTokenAnatomy />
      </section>
      <section>
        <SectionTitle n={4} help="access-token">Three tokens, three jobs</SectionTitle>
        <TokenTrio />
      </section>
      <section>
        <SectionTitle n={5} help="oidc">Key concepts</SectionTitle>
        <Concepts />
      </section>
      <section>
        <SectionTitle n={6} help="validation">Before the app trusts an ID token</SectionTitle>
        <Checklist />
      </section>
      <Sources />
    </div>
  );
}

/* ------------------------------------------------------------------ 0. The idea */

function Equation() {
  const box = "flex-1 rounded-xl border p-4";
  return (
    <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
      <div className={`${box} border-line bg-subtle`}>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">OAuth 2.0 (2012)</div>
        <div className="mt-1 text-lg font-semibold">Delegated access</div>
        <p className="text-sm text-muted">An <b className="text-fg">access token</b> lets an app call an API. It says what the app may do, not who the user is.</p>
      </div>
      <div className="text-center text-3xl font-light text-muted" aria-hidden>+</div>
      <div className={`${box} border-violet/40 bg-violet/5`}>
        <div className="text-xs font-semibold uppercase tracking-wider text-violet">The identity layer</div>
        <div className="mt-1 text-lg font-semibold">An ID token</div>
        <p className="text-sm text-muted">A <b className="text-fg">signed statement</b> from the IdP: who signed in, when, how, and for which app.</p>
      </div>
      <div className="text-center text-3xl font-light text-muted" aria-hidden>=</div>
      <div className={`${box} border-accent/50 bg-accent/5`}>
        <div className="text-xs font-semibold uppercase tracking-wider text-accent">OpenID Connect 1.0 (2014)</div>
        <div className="mt-1 text-lg font-semibold">Sign-in for any app</div>
        <p className="text-sm text-muted">Single sign-on built on OAuth&apos;s redirects. The app never sees the password.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 1. Parties */

function Parties() {
  const cards: { p: Party; points: string[] }[] = [
    { p: "browser", points: ["Carries every front-channel redirect", "Can be tampered with: never trusted", "Holds the IdP's session cookie (that is what makes SSO work)"] },
    { p: "app", points: ["Registered in advance: client_id, redirect URI, secret", "Never sees the password", "Validates the ID token, then runs its own session"] },
    { p: "idp", points: ["The only place the user authenticates (password, MFA)", "Decides who may use which app", "Signs tokens with a private key and publishes the public half"] },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map(({ p, points }) => (
        <div key={p} className="rounded-xl border border-line bg-panel p-5" style={{ borderTop: `4px solid ${PARTY[p].color}` }}>
          <div className="mb-3 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full" style={{ color: PARTY[p].color, background: "var(--subtle)" }}>
              <Icon kind={p} />
            </span>
            <div>
              <div className="font-semibold">{PARTY[p].name}</div>
              <div className="text-xs text-muted">{PARTY[p].sub}</div>
            </div>
          </div>
          <ul className="space-y-1.5 text-sm">
            {points.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: PARTY[p].color }} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ 2. Flow (desktop map) */

const X = { app: 150, browser: 500, idp: 850 } as const;

function Badge({ x, y, n, party }: { x: number; y: number; n: number; party: Party }) {
  return (
    <g>
      <circle cx={x} cy={y} r={13} fill={PARTY[party].color} />
      <text x={x} y={y + 4.5} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--panel)">{n}</text>
    </g>
  );
}

function Chip({ cx, y, w, children, tone = "line" }: { cx: number; y: number; w: number; children: string; tone?: "line" | "warn" }) {
  const warn = tone === "warn";
  return (
    <g>
      <rect x={cx - w / 2} y={y} width={w} height={22} rx={11} fill={warn ? "var(--warn)" : "var(--panel)"} fillOpacity={warn ? 0.12 : 1} stroke={warn ? "var(--warn)" : "var(--line)"} />
      <text x={cx} y={y + 15} textAnchor="middle" fontSize="11.5" fontFamily="var(--font-mono)" fill={warn ? "var(--warn)" : "var(--text)"}>
        {children}
      </text>
    </g>
  );
}

function FlowMap() {
  const H = 600;
  return (
    <figure className="hidden md:block">
      <svg viewBox={`0 0 1000 ${H}`} className="w-full" role="img" aria-labelledby="oidc-flow-title oidc-flow-desc">
        <title id="oidc-flow-title">OpenID Connect authorization code flow</title>
        <desc id="oidc-flow-desc">
          1, the app redirects the browser to the identity provider with state, nonce and a PKCE challenge. 2, the user
          authenticates or an existing session is reused. 3, the provider redirects back with a one-time code. 4, the
          app sends the code, its secret and the PKCE verifier to the token endpoint, server to server. 5, the provider
          returns the ID, access and refresh tokens. 6, the app validates the ID token using the provider&apos;s public
          keys and starts its own session.
        </desc>
        <defs>
          {(["app", "idp"] as const).map((p) => (
            <marker key={p} id={`oi-arr-${p}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={PARTY[p].color} />
            </marker>
          ))}
          <marker id="oi-arr-muted" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" />
          </marker>
        </defs>

        {/* Channel bands */}
        <rect x={12} y={104} width={976} height={250} rx={16} fill="var(--subtle)" fillOpacity={0.7} stroke="var(--line)" />
        <text x={30} y={126} fontSize="11" fontWeight="700" letterSpacing="1.2" fill="var(--muted)">
          FRONT CHANNEL · THROUGH THE BROWSER · VISIBLE IN URLS, NEVER TRUSTED
        </text>
        <rect x={12} y={372} width={976} height={124} rx={16} fill="var(--accent)" fillOpacity={0.05} stroke="var(--accent)" strokeOpacity={0.45} strokeDasharray="6 5" />
        <text x={30} y={394} fontSize="11" fontWeight="700" letterSpacing="1.2" fill="var(--accent)">
          BACK CHANNEL · SERVER ↔ SERVER OVER TLS · THE BROWSER NEVER SEES IT
        </text>

        {/* Lanes */}
        <line x1={X.app} x2={X.app} y1={86} y2={516} stroke="var(--line)" strokeDasharray="3 4" />
        <line x1={X.idp} x2={X.idp} y1={86} y2={516} stroke="var(--line)" strokeDasharray="3 4" />
        <line x1={X.browser} x2={X.browser} y1={86} y2={354} stroke="var(--line)" strokeDasharray="3 4" />

        {/* Party headers */}
        {(Object.keys(X) as Party[]).map((p) => (
          <g key={p}>
            <rect x={X[p] - 120} y={12} width={240} height={74} rx={14} fill="var(--panel)" stroke={PARTY[p].color} strokeWidth={1.5} />
            <circle cx={X[p] - 82} cy={49} r={21} fill="var(--subtle)" />
            <g transform={`translate(${X[p] - 94}, 37)`} color={PARTY[p].color}>
              <Icon kind={p} />
            </g>
            <text x={X[p] - 52} y={45} fontSize="15" fontWeight="700" fill="var(--text)">{PARTY[p].name}</text>
            <text x={X[p] - 52} y={64} fontSize="11.5" fill="var(--muted)">{PARTY[p].sub}</text>
          </g>
        ))}

        {/* 1 · authorization request */}
        <line x1={X.app + 16} x2={X.idp - 6} y1={152} y2={152} stroke={PARTY.app.color} strokeWidth={2} markerEnd="url(#oi-arr-app)" />
        <text x={325} y={143} textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--text)">Send the user to the IdP</text>
        <text x={675} y={143} textAnchor="middle" fontSize="12" fill="var(--muted)">302 redirect → GET /authorize</text>
        <Badge x={X.app} y={152} n={1} party="app" />
        <Chip cx={500} y={164} w={560}>/authorize ? client_id · redirect_uri · scope=openid profile … · state · nonce · code_challenge</Chip>
        <Chip cx={320} y={194} w={150} tone="warn">state → anti-CSRF</Chip>
        <Chip cx={490} y={194} w={150} tone="warn">nonce → anti-replay</Chip>
        <Chip cx={670} y={194} w={176} tone="warn">code_challenge → PKCE</Chip>

        {/* 2 · authenticate */}
        <rect x={696} y={228} width={292} height={52} rx={10} fill="var(--panel)" stroke={PARTY.idp.color} strokeWidth={1.5} />
        <text x={850} y={249} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--text)">Authenticate the user</text>
        <text x={850} y={267} textAnchor="middle" fontSize="11.5" fill="var(--muted)">password + MFA, or existing session = SSO</text>
        <Badge x={696} y={254} n={2} party="idp" />
        <text x={470} y={252} textAnchor="middle" fontSize="11.5" fill="var(--muted)">also checks: is this user assigned to this app?</text>
        <text x={470} y={268} textAnchor="middle" fontSize="11.5" fill="var(--muted)">(Entra ID: Conditional Access, group assignment)</text>

        {/* 3 · code back */}
        <line x1={X.idp - 16} x2={X.app + 6} y1={306} y2={306} stroke={PARTY.idp.color} strokeWidth={2} markerEnd="url(#oi-arr-idp)" />
        <text x={675} y={297} textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--text)">Send the user back with a one-time code</text>
        <text x={290} y={297} textAnchor="middle" fontSize="12" fill="var(--muted)">302 redirect → GET /callback</text>
        <Badge x={X.idp} y={306} n={3} party="idp" />
        <Chip cx={500} y={318} w={330}>/callback ? code=SplxlOBe… · state=af0ifjsl…</Chip>

        {/* 4 & 5 · token exchange */}
        <line x1={X.app + 16} x2={X.idp - 6} y1={428} y2={428} stroke={PARTY.app.color} strokeWidth={2} strokeDasharray="7 5" markerEnd="url(#oi-arr-app)" />
        <text x={500} y={419} textAnchor="middle" fontSize="13" fontFamily="var(--font-mono)" fill="var(--text)">
          POST /token  code + client_secret + code_verifier
        </text>
        <Badge x={X.app} y={428} n={4} party="app" />
        <line x1={X.idp - 16} x2={X.app + 6} y1={474} y2={474} stroke={PARTY.idp.color} strokeWidth={2} strokeDasharray="7 5" markerEnd="url(#oi-arr-idp)" />
        <text x={500} y={465} textAnchor="middle" fontSize="13" fontFamily="var(--font-mono)" fill="var(--text)">
          {"{ id_token, access_token, refresh_token }"}
        </text>
        <Badge x={X.idp} y={474} n={5} party="idp" />

        {/* 6 · validate + session */}
        <rect x={24} y={524} width={540} height={60} rx={12} fill="var(--panel)" stroke={PARTY.app.color} strokeWidth={1.5} />
        <text x={50} y={548} fontSize="13.5" fontWeight="600" fill="var(--text)">Validate the ID token, then start the app&apos;s own session</text>
        <text x={50} y={568} fontSize="11.5" fill="var(--muted)">signature (JWKS) · iss · aud · exp · nonce  →  sub = account, groups = role</text>
        <Badge x={24} y={554} n={6} party="app" />

        <rect x={660} y={524} width={322} height={60} rx={12} fill="var(--subtle)" stroke="var(--line)" />
        <g transform="translate(676, 542)" color="var(--ok)">
          <Icon kind="key" />
        </g>
        <text x={710} y={548} fontSize="13" fontWeight="600" fill="var(--text)">IdP publishes its public keys</text>
        <text x={710} y={568} fontSize="10.5" fontFamily="var(--font-mono)" fill="var(--muted)">/.well-known/openid-configuration · /jwks</text>
        <line x1={656} x2={570} y1={554} y2={554} stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="2 4" markerEnd="url(#oi-arr-muted)" />
        <text x={613} y={546} textAnchor="middle" fontSize="11" fill="var(--muted)">cached</text>
      </svg>
    </figure>
  );
}

/* ------------------------------------------------------------------ 2. Flow (phone list) */

const FLOW_STEPS: { party: Party; where: string; title: string; detail: string; tags?: string[] }[] = [
  { party: "app", where: "front channel", title: "Send the user to the IdP", detail: "GET /authorize ? client_id, redirect_uri, scope=openid …", tags: ["state → anti-CSRF", "nonce → anti-replay", "code_challenge → PKCE"] },
  { party: "idp", where: "at the IdP", title: "Authenticate the user", detail: "Password + MFA, or an existing session (SSO). Checks the user is assigned to the app." },
  { party: "idp", where: "front channel", title: "Send the user back with a one-time code", detail: "GET /callback ? code, state" },
  { party: "app", where: "back channel", title: "Exchange the code", detail: "POST /token: code + client_secret + code_verifier" },
  { party: "idp", where: "back channel", title: "Return the tokens", detail: "{ id_token, access_token, refresh_token }" },
  { party: "app", where: "in the app", title: "Validate, then start a session", detail: "Signature via JWKS · iss · aud · exp · nonce → sub = account, groups = role" },
];

function FlowList() {
  return (
    <ol className="space-y-3 md:hidden">
      {FLOW_STEPS.map((s, i) => (
        <li key={i} className={`flex gap-3 rounded-xl border p-3 ${s.where === "back channel" ? "border-dashed border-accent/50 bg-accent/5" : "border-line bg-panel"}`}>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold text-panel" style={{ background: PARTY[s.party].color }}>
            {i + 1}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">{PARTY[s.party].name} · {s.where}</div>
            <div className="font-semibold">{s.title}</div>
            <div className="break-words font-mono text-xs text-muted">{s.detail}</div>
            {s.tags && (
              <div className="mt-2 flex flex-wrap gap-1">
                {s.tags.map((t) => <span key={t} className="rounded-full border border-warn/60 bg-warn/10 px-2 py-0.5 font-mono text-[11px] text-warn">{t}</span>)}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ 3. ID token */

type ClaimGroup = "trust" | "who" | "when" | "bind";
const GROUPS: Record<ClaimGroup, { label: string; color: string; text: string }> = {
  trust: { label: "Issued by, and for", color: "var(--accent)", text: "iss must equal your IdP; aud must contain your client_id. Stops tokens minted for another app being accepted." },
  who: { label: "Who the user is", color: "var(--ok)", text: "sub is the stable, unique account key. Name, email and groups are convenient, but emails change: never join on them." },
  when: { label: "When and how", color: "var(--warn)", text: "exp and iat bound the token's life; auth_time and amr say when and how the user really authenticated (MFA or not)." },
  bind: { label: "Bound to this sign-in", color: "var(--violet)", text: "nonce echoes the value the app sent in step 1; at_hash ties the ID token to the access token issued with it." },
};

const PAYLOAD: [string, string, ClaimGroup][] = [
  ["iss", '"https://login.example.com/api/idp"', "trust"],
  ["aud", '"aircall-demo-client"', "trust"],
  ["sub", '"8f14e45f-ea3c-4c2b-9a1e-000000000001"', "who"],
  ["name", '"Alex Rivera"', "who"],
  ["email", '"alex.rivera@acme-rx.example"', "who"],
  ["groups", '["Managers", "App-Aircall-Admins"]', "who"],
  ["iat", "1760799600", "when"],
  ["exp", "1760803200", "when"],
  ["auth_time", "1760799588", "when"],
  ["amr", '["pwd", "mfa"]', "when"],
  ["nonce", '"n-0S6_WzA2Mj"', "bind"],
  ["at_hash", '"77QmUPtjPfzWtF2AnpK9RQ"', "bind"],
];

function IdTokenAnatomy() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-panel p-4">
        <div className="break-all font-mono text-sm leading-relaxed">
          <span className="jwt-h">eyJhbGciOiJFUzI1NiIsImtpZCI6Ik…</span>
          <span className="text-muted">.</span>
          <span className="jwt-p">eyJpc3MiOiJodHRwczovL2xvZ2luLmV4YW1wbGUuY29tL2FwaS9pZHAiLCJhdWQiOi…</span>
          <span className="text-muted">.</span>
          <span className="jwt-s">MEUCIQDf3k1x9…</span>
        </div>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div><b className="jwt-h">Header</b> — <span className="text-muted">which algorithm (<code className="code-inline">ES256</code>) and which key (<code className="code-inline">kid</code>) signed it</span></div>
          <div><b className="jwt-p">Payload</b> — <span className="text-muted">the claims below, base64url-encoded, <i>not</i> encrypted: anyone holding it can read it</span></div>
          <div><b className="jwt-s">Signature</b> — <span className="text-muted">made with the IdP&apos;s private key; checked with the public key from JWKS</span></div>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <pre className="overflow-x-auto rounded-xl border border-line bg-codebg p-4 font-mono text-[13px] leading-7" aria-label="Decoded ID token payload">
          <span className="text-muted">{"{"}</span>
          {PAYLOAD.map(([k, v, g], i) => (
            <div key={k} className="flex">
              <span className="mr-3 w-1 shrink-0 rounded-full" style={{ background: GROUPS[g].color }} aria-hidden />
              <span>
                {"  "}<span className="font-semibold">&quot;{k}&quot;</span>: <span className="text-muted">{v}</span>{i < PAYLOAD.length - 1 ? "," : ""}
              </span>
            </div>
          ))}
          <span className="text-muted">{"}"}</span>
        </pre>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {(Object.keys(GROUPS) as ClaimGroup[]).map((g) => (
            <div key={g} className="rounded-xl border border-line bg-panel p-3" style={{ borderLeft: `4px solid ${GROUPS[g].color}` }}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold">{GROUPS[g].label}</span>
                <span className="font-mono text-xs text-muted">{PAYLOAD.filter((p) => p[2] === g).map((p) => p[0]).join(" · ")}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{GROUPS[g].text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 4. Tokens */

const TOKENS = [
  {
    name: "ID token",
    color: "var(--violet)",
    question: "Who signed in, when, and how?",
    rows: [
      ["Read by", "The app (aud = its client_id)"],
      ["Format", "Signed JWT, always"],
      ["Lifetime", "Entra ID: 1 hour · this demo: 1 hour"],
      ["Never", "Send it to an API as a bearer token"],
    ],
    help: "id-token" as HelpKey,
  },
  {
    name: "Access token",
    color: "var(--accent)",
    question: "What may this app call?",
    rows: [
      ["Read by", "The API (resource server), not the app"],
      ["Format", "Bearer; JWT or opaque: the app treats it as opaque"],
      ["Lifetime", "Entra ID: 60–90 min · this demo: 2 min"],
      ["Never", "Use it to decide who the user is in the app"],
    ],
    help: "access-token" as HelpKey,
  },
  {
    name: "Refresh token",
    color: "var(--ok)",
    question: "How to get new tokens without a login?",
    rows: [
      ["Read by", "Only the IdP"],
      ["Format", "Opaque (encrypted in this demo); rotates on each use"],
      ["Lifetime", "Entra ID: up to 90 days (24 h for SPAs) · this demo: 24 h"],
      ["Never", "Let it reach the browser; revoke it at logout"],
    ],
    help: "refresh-tokens" as HelpKey,
  },
];

function TokenTrio() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {TOKENS.map((t) => (
        <div key={t.name} className="flex flex-col rounded-xl border border-line bg-panel p-5" style={{ borderTop: `4px solid ${t.color}` }}>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">{t.name}</span>
            <Help topic={t.help} />
          </div>
          <p className="mt-1 text-sm font-medium" style={{ color: t.color }}>{t.question}</p>
          <dl className="mt-3 space-y-2 text-sm">
            {t.rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[72px_1fr] gap-2 border-t border-line pt-2">
                <dt className={`text-xs font-semibold uppercase tracking-wider ${k === "Never" ? "text-bad" : "text-muted"}`}>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ 5. Concepts */

const CONCEPTS: { term: string; what: string; why: string; help: HelpKey; tone?: "warn" }[] = [
  { term: "Scopes", what: "What the app asks for: openid (required), profile, email, groups, offline_access.", why: "Without openid it is plain OAuth: no ID token.", help: "oidc" },
  { term: "Claims", what: "Facts about the user, in the ID token or from /userinfo.", why: "Key accounts on sub; emails get renamed.", help: "id-token" },
  { term: "Discovery", what: "/.well-known/openid-configuration lists every endpoint and capability.", why: "One URL configures the app; no hand-copied endpoints.", help: "discovery" },
  { term: "JWKS", what: "The IdP's public signing keys, looked up by kid and cached.", why: "Keys rotate; a hard-coded key breaks sign-in on rollover.", help: "jwks" },
  { term: "Redirect URI", what: "The pre-registered return address for codes, matched exactly.", why: "Loose matching can deliver a code to the wrong place.", help: "auth-code-flow", tone: "warn" },
  { term: "state", what: "A random value tying the callback to this browser's request.", why: "Stops login CSRF: landing in someone else's account.", help: "state-nonce", tone: "warn" },
  { term: "nonce", what: "A random value the IdP copies into the ID token.", why: "Stops an old ID token being replayed into a new sign-in.", help: "state-nonce", tone: "warn" },
  { term: "PKCE", what: "A one-time secret (verifier) whose hash (challenge) goes in step 1.", why: "A code is useless without the verifier only the app holds.", help: "pkce", tone: "warn" },
  { term: "Client authentication", what: "The app proves itself at /token with a secret or a signed assertion.", why: "Only the registered app can redeem its codes.", help: "auth-code-flow" },
  { term: "SSO session", what: "The IdP's own cookie. Later apps sign in without a password.", why: "Why logging out of one app does not log you out of the IdP.", help: "sso" },
  { term: "Logout", what: "Local logout ends the app session; RP-initiated logout ends the IdP's.", why: "Leavers need IdP revocation and deprovisioning, not just logout.", help: "logout" },
  { term: "Refresh & revocation", what: "Short access tokens, rotating refresh tokens, admin revoke.", why: "Revocation bites at the next refresh, not instantly.", help: "revocation" },
];

function Concepts() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {CONCEPTS.map((c) => (
        <div key={c.term} className={`rounded-xl border p-4 ${c.tone === "warn" ? "border-warn/50 bg-warn/5" : "border-line bg-panel"}`}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className={`font-semibold ${c.term === c.term.toLowerCase() ? "font-mono" : ""}`}>{c.term}</span>
            <Help topic={c.help} />
          </div>
          <p className="text-sm">{c.what}</p>
          <p className="mt-2 text-xs text-muted">{c.why}</p>
        </div>
      ))}
      <p className="text-xs text-muted sm:col-span-2 lg:col-span-4">
        <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-warn/60 bg-warn/20 align-middle" /> Amber tiles are the
        protections added to the redirects in step 1.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ 6. Checklist */

const CHECKS: [string, string][] = [
  ["Signature", "verifies with the JWKS key named by kid"],
  ["alg", "is on the allow-list (e.g. ES256, RS256), never none"],
  ["iss", "equals your IdP's issuer exactly"],
  ["aud", "contains your client_id"],
  ["exp / iat", "token is current (allow ~30 s clock skew)"],
  ["nonce", "equals the value you sent in step 1"],
  ["sub", "then (iss, sub) is the account key — not email"],
];

function Checklist() {
  return (
    <div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {CHECKS.map(([k, v], i) => (
          <li key={k} className="relative rounded-xl border border-line bg-panel p-3">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-ok/15 text-ok"><Icon kind="check" size={16} /></span>
              <span className="text-xs text-muted">{i + 1}</span>
            </div>
            <div className="mt-2 font-mono text-sm font-semibold">{k}</div>
            <div className="text-xs text-muted">{v}</div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-muted">
        Libraries such as <code className="code-inline">Microsoft.Identity.Web</code> perform every check above. Most real-world OIDC
        incidents come from hand-written validation that skips one of them.
      </p>
    </div>
  );
}

function Sources() {
  const links = [
    ["OpenID Connect Core 1.0", "https://openid.net/specs/openid-connect-core-1_0.html"],
    ["RFC 6749 — OAuth 2.0", "https://datatracker.ietf.org/doc/html/rfc6749"],
    ["RFC 7636 — PKCE", "https://datatracker.ietf.org/doc/html/rfc7636"],
    ["RFC 9700 — OAuth 2.0 Security BCP", "https://datatracker.ietf.org/doc/html/rfc9700"],
    ["Microsoft identity platform — token lifetimes", "https://learn.microsoft.com/entra/identity-platform/configurable-token-lifetimes"],
  ];
  return (
    <footer className="border-t border-line pt-4 text-xs text-muted">
      Sources:{" "}
      {links.map(([l, h], i) => (
        <span key={h}>
          <a href={h} target="_blank" rel="noreferrer" className="text-accent hover:underline">{l}</a>
          {i < links.length - 1 ? " · " : ""}
        </span>
      ))}
    </footer>
  );
}
