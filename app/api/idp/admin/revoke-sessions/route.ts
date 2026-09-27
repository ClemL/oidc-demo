import { NextResponse, type NextRequest } from "next/server";
import { findUserBySub } from "@/lib/directory";
import { GRANTS_COOKIE, grantsCookieOpts, loadGrants, revokeUser, sealGrants } from "@/lib/grants";
import { IDP_SESSION_COOKIE, cookieOpts, originFrom, unseal, type IdpSession } from "@/lib/session";
import { isVendorId } from "@/lib/vendors";

/**
 * IdP admin action, equivalent to Entra's "Revoke sessions" button
 * (Revoke-MgUserSignInSession): invalidates every refresh token and IdP
 * session for the user. Vendor sessions and already-issued access tokens
 * are NOT touched — that is the point the demo makes.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const sub = String(form.get("sub") ?? "");
  const back = String(form.get("back") ?? "");
  const origin = originFrom(req.headers, req.nextUrl.origin);
  const user = findUserBySub(sub);
  const dest = new URL(isVendorId(back) ? `/vendors/${back}` : "/", origin);
  if (!user) return NextResponse.redirect(dest, 303);

  const grants = await loadGrants(req.cookies.get(GRANTS_COOKIE)?.value);
  revokeUser(grants, sub);
  dest.searchParams.set("tokens", "admin-revoked");
  const res = NextResponse.redirect(dest, 303);
  res.cookies.set(GRANTS_COOKIE, await sealGrants(grants), cookieOpts(grantsCookieOpts.maxAge));
  const idp = await unseal<IdpSession>(req.cookies.get(IDP_SESSION_COOKIE)?.value);
  if (idp?.sub === sub) res.cookies.delete(IDP_SESSION_COOKIE);
  return res;
}
