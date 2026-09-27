import { Help } from "@/components/Help";
import { unseal } from "@/lib/session";
import { findClient } from "@/lib/clients";
import { TENANT_DOMAIN } from "@/lib/directory";
import type { AuthRequest } from "@/lib/idp";
import type { SamlLoginRequest } from "@/lib/saml-idp";
import { VENDORS } from "@/lib/vendors";
import { UserPicker } from "./UserPicker";

const SCOPE_TEXT: Record<string, string> = {
  openid: "Sign you in (issue an ID token)",
  profile: "Read your name, job title and department",
  email: "Read your email address",
  groups: "Read your group memberships",
  offline_access: "Stay signed in (issue a refresh token)",
};

const SAML_ATTRS = ["objectidentifier", "displayname", "givenname", "surname", "emailaddress", "groups", "authnmethodsreferences"];

export default async function IdpLogin({ searchParams }: PageProps<"/idp/login">) {
  const sp = await searchParams;
  const reqToken = typeof sp.req === "string" ? sp.req : "";
  const data = await unseal<{ ar?: AuthRequest; saml?: SamlLoginRequest }>(reqToken);
  const client = data?.ar ? findClient(data.ar.client_id) : data?.saml ? VENDORS[data.saml.vendor] : undefined;

  if (!data || !client) {
    return (
      <div className="card mx-auto max-w-md text-sm">
        This sign-in request is missing or expired. Start again from a vendor app.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 flex items-center justify-between text-xs text-muted">
        <span>
          You are on the <b className="text-fg">identity provider</b>, not the vendor
        </span>
        <Help topic="idp-login" label="Why here?" />
      </div>
      <div className="card space-y-5 p-7 shadow-lg">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-fg text-sm font-bold text-panel">A</span>
            <span className="font-semibold">Acme Rx</span>
            <span className="text-xs text-muted">· {TENANT_DOMAIN}</span>
          </div>
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted">
            to continue to <b className="text-fg">{client.name}</b>
          </p>
        </div>

        {typeof sp.error === "string" && (
          <p className="rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{sp.error}</p>
        )}

        <form action="/api/idp/login" method="post" className="space-y-3">
          <input type="hidden" name="req" value={reqToken} />
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Username</span>
            <input type="text" name="username" autoComplete="username" placeholder="alex" required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Password</span>
            <input type="password" name="password" autoComplete="current-password" placeholder="demo" required />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="mfa" defaultChecked className="h-4 w-4 accent-[var(--accent)]" />
            Approve MFA push (simulated authenticator)
          </label>
          <div className="flex gap-2 pt-1">
            <button className="btn btn-primary flex-1 justify-center" name="action" value="signin">Sign in</button>
            <button className="btn btn-ghost" name="action" value="cancel" formNoValidate>Cancel</button>
          </div>
        </form>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Quick pick a demo user</p>
          <UserPicker />
        </div>

        <div className="rounded-lg bg-subtle p-3 text-xs">
          {data.ar ? (
            <>
              <div className="mb-1 flex items-center gap-2 font-semibold">
                {client.name} is requesting (OpenID Connect) <Help topic="oidc" />
              </div>
              <ul className="space-y-0.5">
                {data.ar.scope.split(" ").map((s) => (
                  <li key={s}><code className="code-inline">{s}</code> — {SCOPE_TEXT[s] ?? s}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <div className="mb-1 flex items-center gap-2 font-semibold">
                {client.name} sent a SAML 2.0 AuthnRequest <Help topic="saml-flow" />
              </div>
              <p className="mb-1">
                SAML has no scopes: the IdP releases the attributes configured for this app.
                {data.saml?.req.forceAuthn && <> The app set <code className="code-inline">ForceAuthn=&quot;true&quot;</code>, so the existing session is ignored.</>}
              </p>
              <ul className="flex flex-wrap gap-1">
                {SAML_ATTRS.map((a) => <li key={a}><code className="code-inline">{a}</code></li>)}
              </ul>
            </>
          )}
          <p className="mt-2 text-muted">Consent was pre-granted by a tenant admin, so no consent screen is shown.</p>
        </div>
      </div>
    </div>
  );
}
