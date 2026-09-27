import { NextResponse, type NextRequest } from "next/server";
import { findUserBySub } from "@/lib/directory";
import { GRANTS_COOKIE, loadGrants } from "@/lib/grants";
import { decodeRedirect, parseAuthnRequest } from "@/lib/saml";
import { findSamlSp, samlRespond } from "@/lib/saml-idp";
import { IDP_SESSION_COOKIE, originFrom, seal, unseal, type IdpSession } from "@/lib/session";

/** SAML SSO endpoint, HTTP-Redirect binding. The SAML twin of /authorize. */
export async function GET(req: NextRequest) {
  const origin = originFrom(req.headers, req.nextUrl.origin);
  const errorPage = (description: string) => {
    const u = new URL("/idp/error", origin);
    u.searchParams.set("error", "invalid_saml_request");
    u.searchParams.set("error_description", description);
    return NextResponse.redirect(u);
  };

  let parsed;
  try {
    parsed = parseAuthnRequest(decodeRedirect(req.nextUrl.searchParams.get("SAMLRequest") ?? ""));
  } catch (e) {
    return errorPage(`Could not decode SAMLRequest: ${(e as Error).message}`);
  }
  // Never POST an assertion to an unregistered ACS URL (the SAML open-redirect).
  const sp = findSamlSp(origin, parsed);
  if (!sp.ok) return errorPage(sp.description);

  const login = { req: parsed, relayState: req.nextUrl.searchParams.get("RelayState") ?? "", vendor: sp.vendor.id };
  const cookieSession = await unseal<IdpSession>(req.cookies.get(IDP_SESSION_COOKIE)?.value);
  const grants = await loadGrants(req.cookies.get(GRANTS_COOKIE)?.value);
  const revokedAt = cookieSession ? grants.revokedBefore[cookieSession.sub] : undefined;
  const session = cookieSession && !(revokedAt && cookieSession.authTime * 1000 <= revokedAt) ? cookieSession : null;
  const user = session ? findUserBySub(session.sub) : undefined;

  if (!session || !user || parsed.forceAuthn) {
    const u = new URL("/idp/login", origin);
    u.searchParams.set("req", await seal({ saml: login }, 600));
    return NextResponse.redirect(u);
  }
  // Existing IdP session → silent SSO, exactly as with OIDC.
  return samlRespond(origin, login, { user, authTime: session.authTime, amr: session.amr });
}
