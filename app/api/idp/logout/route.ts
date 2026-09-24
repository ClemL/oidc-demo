import { NextResponse, type NextRequest } from "next/server";
import { IDP_SESSION_COOKIE, originFrom, sessionCookie, tokensCookie } from "@/lib/session";
import { VENDOR_IDS } from "@/lib/vendors";

/**
 * RP-initiated logout (OIDC RP-Initiated Logout 1.0). Clearing the vendor
 * cookies stands in for front-channel / back-channel logout notifications,
 * which a real IdP would send to each app that shares the session.
 */
export async function GET(req: NextRequest) {
  const origin = originFrom(req.headers, req.nextUrl.origin);
  const target = req.nextUrl.searchParams.get("post_logout_redirect_uri");
  const dest = target && target.startsWith(origin + "/") ? target : `${origin}/?loggedOut=1`;
  const res = NextResponse.redirect(dest);
  res.cookies.delete(IDP_SESSION_COOKIE);
  for (const v of VENDOR_IDS) {
    res.cookies.delete(sessionCookie(v));
    res.cookies.delete(tokensCookie(v));
  }
  return res;
}
