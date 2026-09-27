import { NextResponse, type NextRequest } from "next/server";
import { clientSecret, redirectUriFor } from "@/lib/clients";
import { GRANTS_COOKIE, grantsCookieOpts, loadGrants, sealGrants } from "@/lib/grants";
import { tokenRequest } from "@/lib/idp";
import { validateIdToken } from "@/lib/rp";
import {
  cookieOpts, issuerFor, originFrom, packTokens, seal, seenCookie, sessionCookie, tokensCookie, txnCookie, unseal,
  type RpSession, type TraceStep,
} from "@/lib/session";
import { VENDORS, isVendorId, mapRole } from "@/lib/vendors";

type Txn = { state: string; nonce: string; codeVerifier: string; startedAt: number; authorizeUrl: string };

const short = (s: string, n = 24) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Steps 3–6: receive the code, exchange it, validate the ID token, create the local session. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/rp/[vendor]/callback">) {
  const { vendor: id } = await ctx.params;
  if (!isVendorId(id)) return new Response("Unknown vendor", { status: 404 });
  const vendor = VENDORS[id];
  const origin = originFrom(req.headers, req.nextUrl.origin);
  const issuer = issuerFor(origin);
  const q = req.nextUrl.searchParams;
  const back = new URL(`/vendors/${id}`, origin);

  const fail = (error: string, description: string) => {
    back.searchParams.set("error", error);
    back.searchParams.set("error_description", description);
    const res = NextResponse.redirect(back);
    res.cookies.delete(txnCookie(id));
    return res;
  };

  const txn = await unseal<Txn>(req.cookies.get(txnCookie(id))?.value);
  if (!txn) return fail("missing_transaction", "No sign-in transaction cookie. It expired or this callback was not started by this browser.");
  if (q.get("state") !== txn.state) return fail("state_mismatch", "state does not match — possible CSRF / login injection. Request rejected.");
  if (q.get("error")) return fail(q.get("error")!, q.get("error_description") ?? "");
  if (q.get("iss") && q.get("iss") !== issuer) return fail("issuer_mismatch", "iss parameter does not match the expected IdP (RFC 9207).");

  const code = q.get("code") ?? "";
  const trace: TraceStep[] = [
    { t: txn.startedAt, label: "Redirect to IdP /authorize", detail: txn.authorizeUrl.replace(/state=[^&]+/, "state=…").replace(/nonce=[^&]+/, "nonce=…") },
    { t: Date.now(), label: "Browser returns to callback with code + state", detail: `code=${short(code)}  state=${short(txn.state, 10)} ✓ matches` },
  ];

  // Back-channel token request. In production this is an HTTPS POST from the vendor's servers to the IdP.
  const tokenForm = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUriFor(origin, id),
    client_id: vendor.clientId,
    client_secret: clientSecret(id),
    code_verifier: txn.codeVerifier,
  });
  // The IdP's grant store; see lib/grants.ts for why it is a cookie in this demo.
  const grants = await loadGrants(req.cookies.get(GRANTS_COOKIE)?.value);
  const tokens = await tokenRequest(tokenForm, issuer, grants);
  trace.push({
    t: Date.now(),
    label: "POST /token (server-to-server)",
    detail: `grant_type=authorization_code&code=${short(code, 12)}&redirect_uri=…&client_id=${vendor.clientId}&client_secret=•••••&code_verifier=${short(txn.codeVerifier, 10)}`,
  });
  if (!tokens.ok) return fail(tokens.body.error, tokens.body.error_description);
  trace.push({
    t: Date.now(),
    label: "Token response",
    detail: `200 OK { id_token, access_token, ${tokens.body.refresh_token ? "refresh_token, " : ""}token_type: Bearer, expires_in: ${tokens.body.expires_in} }`,
  });

  const { id_token, access_token, refresh_token } = tokens.body;
  const v = await validateIdToken(id_token, { issuer, audience: vendor.clientId, nonce: txn.nonce, accessToken: access_token });
  if (!v.ok) return fail(v.error, v.description);
  const { claims, checks } = v;

  const authTimeMs = Number(claims.auth_time) * 1000;
  const silent = authTimeMs < txn.startedAt - 1000;
  trace.push({
    t: Date.now(),
    label: "ID token validated",
    detail: silent
      ? `auth_time predates this sign-in → reused existing IdP session (SSO, no password prompt)`
      : `fresh authentication at ${new Date(authTimeMs).toISOString()} via ${(claims.amr as string[]).join("+")}`,
  });

  const groups = (claims.groups as string[]) ?? [];
  const { role, matched } = mapRole(vendor, groups);
  const seen = (req.cookies.get(seenCookie(id))?.value ?? "").split(",").filter(Boolean);
  const jit = !seen.includes(String(claims.sub).slice(-4));
  trace.push({
    t: Date.now(),
    label: jit ? "Just-in-time account created" : "Existing account matched by sub",
    detail: `${claims.email} → role "${role}"${matched ? ` (group ${matched.group})` : " (default)"}`,
  });

  const session: RpSession = {
    protocol: "oidc",
    sub: String(claims.sub),
    role,
    roleSource: matched?.group ?? null,
    jit,
    silent,
    checks,
    trace,
    family: tokens.family,
  };

  const res = NextResponse.redirect(back);
  res.cookies.delete(txnCookie(id));
  res.cookies.set(sessionCookie(id), await seal(session, 3600), cookieOpts(3600));
  res.cookies.set(tokensCookie(id), packTokens({ idToken: id_token, accessToken: access_token, refreshToken: refresh_token }), cookieOpts(3600));
  res.cookies.set(GRANTS_COOKIE, await sealGrants(grants), cookieOpts(grantsCookieOpts.maxAge));
  if (jit) res.cookies.set(seenCookie(id), [...seen, String(claims.sub).slice(-4)].join(","), cookieOpts(30 * 86400));
  return res;
}
