import { NextResponse, type NextRequest } from "next/server";
import { errorRedirect, isAssigned, issueCode, validateAuthRequest } from "@/lib/idp";
import { findUserBySub } from "@/lib/directory";
import { IDP_SESSION_COOKIE, issuerFor, originFrom, seal, unseal, type IdpSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const origin = originFrom(req.headers, req.nextUrl.origin);
  const v = validateAuthRequest(req.nextUrl.searchParams, origin);

  if (!v.ok) {
    if (!v.redirect || !v.req) {
      // Never redirect to an unverified redirect_uri (open-redirect protection).
      const u = new URL("/idp/error", origin);
      u.searchParams.set("error", v.error);
      u.searchParams.set("error_description", v.description);
      return NextResponse.redirect(u);
    }
    return NextResponse.redirect(errorRedirect(v.req, v.error, v.description));
  }

  const { req: ar, client } = v;
  const session = await unseal<IdpSession>(req.cookies.get(IDP_SESSION_COOKIE)?.value);
  const user = session ? findUserBySub(session.sub) : undefined;

  if (!session || !user || ar.prompt === "login") {
    if (ar.prompt === "none") {
      return NextResponse.redirect(errorRedirect(ar, "login_required", "No active IdP session and prompt=none."));
    }
    const sealed = await seal({ ar }, 600);
    const u = new URL("/idp/login", origin);
    u.searchParams.set("req", sealed);
    return NextResponse.redirect(u);
  }

  // Existing IdP session → silent single sign-on, no credentials prompted.
  if (!isAssigned(user, client)) {
    return NextResponse.redirect(
      errorRedirect(ar, "access_denied", `${user.email} is not assigned to ${client.name} in the IdP.`),
    );
  }
  const { redirect } = await issueCode(ar, issuerFor(origin), user.sub, session.authTime, session.amr);
  return NextResponse.redirect(redirect);
}
