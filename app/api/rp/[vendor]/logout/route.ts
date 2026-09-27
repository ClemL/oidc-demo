import { NextResponse, type NextRequest } from "next/server";
import { clientSecret } from "@/lib/clients";
import { GRANTS_COOKIE, grantsCookieOpts, loadGrants, sealGrants } from "@/lib/grants";
import { revokeToken } from "@/lib/idp";
import { cookieOpts, originFrom, sessionCookie, tokensCookie, unpackTokens } from "@/lib/session";
import { VENDORS, isVendorId } from "@/lib/vendors";

/**
 * Local logout: ends the vendor session only. The IdP session survives, so the next sign-in is silent.
 * A well-behaved app also revokes its refresh token (RFC 7009) so it cannot outlive the logout.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/rp/[vendor]/logout">) {
  const { vendor } = await ctx.params;
  if (!isVendorId(vendor)) return new Response("Unknown vendor", { status: 404 });
  const res = NextResponse.redirect(new URL(`/vendors/${vendor}?loggedOut=local`, originFrom(req.headers, req.nextUrl.origin)));
  const tokens = unpackTokens(req.cookies.get(tokensCookie(vendor))?.value);
  if (tokens && !("saml" in tokens) && tokens.refreshToken) {
    const grants = await loadGrants(req.cookies.get(GRANTS_COOKIE)?.value);
    await revokeToken(
      new URLSearchParams({ token: tokens.refreshToken, client_id: VENDORS[vendor].clientId, client_secret: clientSecret(vendor) }),
      grants,
    );
    res.cookies.set(GRANTS_COOKIE, await sealGrants(grants), cookieOpts(grantsCookieOpts.maxAge));
  }
  res.cookies.delete(sessionCookie(vendor));
  res.cookies.delete(tokensCookie(vendor));
  return res;
}
