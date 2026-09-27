import Link from "next/link";
import { Help } from "@/components/Help";
import { Collapsible } from "@/components/Collapsible";
import { Architecture } from "@/components/Architecture";
import { FlowDiagram } from "@/components/FlowDiagram";
import { ExplainerFilm } from "@/components/ExplainerFilm";
import { USERS } from "@/lib/directory";
import { VENDORS } from "@/lib/vendors";

const SCENARIOS = [
  { n: 1, title: "First sign-in", body: "Open Aircall, click Continue with SSO, sign in as alex / demo. Inspect the trace, ID token and validation checks.", href: "/vendors/aircall" },
  { n: 2, title: "Single sign-on", body: "Open Lattice and click Continue with SSO. No password prompt — the IdP session is reused. The trace says so.", href: "/vendors/lattice" },
  { n: 3, title: "Role mapping", body: "Compare roles: Alex is Aircall Admin and Lattice Manager, derived from the groups claim.", href: "/vendors/lattice" },
  { n: 4, title: "Access denied", body: "Global sign-out, then sign in to Aircall as jordan or sam. The IdP authenticates them but refuses the app.", href: "/vendors/aircall" },
  { n: 5, title: "Provisioning & leavers", body: "Assign, change and terminate users in the directory and watch the SCIM requests the IdP would send.", href: "/provisioning" },
  { n: 6, title: "Logout semantics", body: "Log out of one app locally, then sign in again: instant. Use global sign-out to end the IdP session.", href: "/vendors/aircall" },
  { n: 7, title: "The same login in SAML", body: "Use Continue with SSO (SAML 2.0): a signed XML assertion arrives by browser POST. Compare it with the ID token.", href: "/saml" },
  { n: 8, title: "Refresh, reuse & revocation", body: "Watch the 2-minute access token expire, refresh it, replay an old refresh token, then revoke the user as an IdP admin.", href: "/vendors/aircall" },
];

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  return (
    <div className="space-y-10">
      {sp.loggedOut && (
        <div className="card border-ok text-sm">
          Global sign-out complete: the IdP session and every vendor session in this browser were cleared.
        </div>
      )}
      <section className="space-y-6">
        <div className="max-w-3xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">Interactive lab</p>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            Single sign-on with OpenID Connect, end to end
          </h1>
          <p className="mt-4 text-muted">
            A working identity provider and two simulated SaaS vendors — <b className="text-fg">Aircall</b> and{" "}
            <b className="text-fg">Lattice</b> — wired together with real OIDC: authorization code flow, PKCE, signed JWTs,
            JWKS verification, group-based roles, and SCIM-style provisioning. Click any{" "}
            <span className="help-btn mx-0.5 align-middle">?</span> for an explanation.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#film" className="btn btn-primary">▶ Watch the 3-minute story</a>
            <Link href="/vendors/aircall" className="btn btn-ghost">Start with Aircall →</Link>
            <Link href="/saml" className="btn btn-ghost">OIDC vs SAML</Link>
            <Link href="/guide" className="btn btn-ghost">How it integrates for real</Link>
          </div>
          <Collapsible
            className="mt-6 rounded-lg border border-warn/50 bg-warn/5 p-3 text-sm"
            summaryClassName="text-sm"
            summary={
              <>
                <b>Reality check:</b> these vendors use SAML 2.0 <Help topic="saml-vs-oidc" />
              </>
            }
          >
            <p className="-mt-1">
              Both vendors document <b>SAML 2.0</b> for enterprise SSO. OIDC is shown here because it is the modern standard
              and easier to inspect; the trust model and setup steps are the same. Each vendor page can also run the real SAML
              flow — see <Link href="/saml" className="text-accent hover:underline">OIDC vs SAML</Link>.
            </p>
          </Collapsible>
        </div>
        <Collapsible
          id="film"
          className="card scroll-mt-20 p-3 md:p-5"
          summaryClassName="px-1"
          summary={
            <>
              <h2 className="text-lg font-semibold">Watch first: the 3-minute story</h2>
              <Help topic="sso" />
              <span className="text-xs text-muted">no sound needed · subtitles on · space to play/pause, ← → to skip</span>
            </>
          }
        >
          <ExplainerFilm />
        </Collapsible>
        <Collapsible summary={<SectionTitle topic="architecture">Architecture</SectionTitle>}>
          <Architecture />
        </Collapsible>
      </section>

      <Collapsible className="" summary={<SectionTitle topic="sso">Guided scenarios</SectionTitle>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((s) => (
            <Link key={s.n} href={s.href} className="card block transition hover:border-accent">
              <div className="mb-1 flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-bold text-panel">{s.n}</span>
                <h3 className="font-semibold">{s.title}</h3>
              </div>
              <p className="text-sm text-muted">{s.body}</p>
            </Link>
          ))}
        </div>
      </Collapsible>

      <Collapsible summary={<SectionTitle topic="auth-code-flow">The flow you are about to run</SectionTitle>}>
        <FlowDiagram />
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-1.5">PKCE <Help topic="pkce" /></span>
          <span className="flex items-center gap-1.5">state &amp; nonce <Help topic="state-nonce" /></span>
          <span className="flex items-center gap-1.5">ID token <Help topic="id-token" /></span>
          <span className="flex items-center gap-1.5">Validation <Help topic="validation" /></span>
          <span className="flex items-center gap-1.5">OIDC basics <Help topic="oidc" /></span>
        </div>
      </Collapsible>

      <section className="grid items-start gap-6 lg:grid-cols-2">
        <Collapsible summary={<SectionTitle topic="idp-login">Demo directory (password: demo)</SectionTitle>}>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr><th className="py-1.5">User</th><th>Groups</th></tr>
            </thead>
            <tbody>
              {USERS.map((u) => (
                <tr key={u.sub} className="border-t border-line align-top">
                  <td className="py-2 pr-3">
                    <div className="font-mono font-semibold">{u.username}</div>
                    <div className="text-xs text-muted">{u.title}</div>
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">{u.groups.map((g) => <span key={g} className="pill">{g}</span>)}</div>
                    <div className="mt-1 text-xs text-muted">{u.note}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Collapsible>
        <Collapsible summary={<SectionTitle topic="assignment">App assignments &amp; roles</SectionTitle>}>
          <div className="space-y-4 text-sm">
            {Object.values(VENDORS).map((v) => (
              <div key={v.id}>
                <div className="flex items-center gap-2 font-semibold">
                  <span className="h-3 w-3 rounded-sm" style={{ background: v.accent }} /> {v.name}
                </div>
                <p className="text-xs text-muted">Assigned groups: {v.assignedGroups.join(", ")}</p>
                <ul className="mt-1 text-xs">
                  {v.roleRules.map((r) => (
                    <li key={r.group}><span className="font-mono">{r.group}</span> → <b>{r.role}</b></li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="flex items-center gap-2 text-xs text-muted">How role mapping works <Help topic="role-mapping" /></p>
          </div>
        </Collapsible>
      </section>
    </div>
  );
}

function SectionTitle({ topic, children }: { topic: Parameters<typeof Help>[0]["topic"]; children: React.ReactNode }) {
  return (
    <>
      <h2 className="text-lg font-semibold">{children}</h2>
      <Help topic={topic} />
    </>
  );
}
