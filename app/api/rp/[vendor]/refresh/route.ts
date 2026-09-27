import { NextResponse, type NextRequest } from "next/server";
import { clientSecret } from "@/lib/clients";
import { GRANTS_COOKIE, grantsCookieOpts, loadGrants, sealGrants } from "@/lib/grants";
import { tokenRequest } from "@/lib/idp";
import { validateIdToken } from "@/lib/rp";
import {
  cookieOpts, issuerFor, originFrom, packTokens, seal, sessionCookie, tokensCookie, unpackTokens, unseal,
  type RpSession,
} from "@/lib/session";
import { VENDORS, isVendorId } from "@/lib/vendors";

/**
 * The vendor's server uses its refresh token (grant_type=refresh_token).
 * action=refresh — normal rotation: new access token, new ID token, new refresh token.
 * action=replay  — presents the PREVIOUS refresh token, as an attacker holding a stolen copy would.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/rp/[vendor]/refresh">) {
  const { vendor: id } = await ctx.params;
  if (!isVendorId(id)) return new Response("Unknown vendor", { status: 404 });
  const vendor = VENDORS[id];
  const origin = originFrom(req.headers, req.nextUrl.origin);
  const issuer = issuerFor(origin);
  const back = new URL(`/vendors/${id}`, origin);
  const action = String((await req.formData()).get("action") ?? "refresh");

  const session = await unseal<RpSession>(req.cookies.get(sessionCookie(id))?.value);
  const tokens = unpackTokens(req.cookies.get(tokensCookie(id))?.value);
  if (!session || !tokens || "saml" in tokens || !tokens.refreshToken) {
    back.searchParams.set("error", "no_refresh_token");
    back.searchParams.set("error_description", "This session has no refresh token. Sign in with OIDC first.");
    return NextResponse.redirect(back, 303);
  }

  const presented = action === "replay" ? tokens.prevRefreshToken : tokens.refreshToken;
  if (!presented) {
    back.searchParams.set("tokens", "nothing-to-replay");
    return NextResponse.redirect(back, 303);
  }

  const grants = await loadGrants(req.cookies.get(GRANTS_COOKIE)?.value);
  const result = await tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: presented,
      client_id: vendor.clientId,
      client_secret: clientSecret(id),
    }),
    issuer,
    grants,
  );
  const persist = async (res: NextResponse) => {
    res.cookies.set(GRANTS_COOKIE, await sealGrants(grants), cookieOpts(grantsCookieOpts.maxAge));
    return res;
  };
  const now = Date.now();

  if (action === "replay") {
    // The attacker's request. Whatever happens, the legitimate session is unchanged — for now.
    back.searchParams.set("tokens", result.ok ? "replay-accepted" : "reuse-detected");
    if (!result.ok) back.searchParams.set("detail", result.body.error_description);
    return persist(NextResponse.redirect(back, 303));
  }

  if (!result.ok) {
    // The refresh failed, so the vendor ends its own session: this is where revocation finally bites.
    back.searchParams.set("error", "session_ended");
    back.searchParams.set("error_description", `Refresh failed (${result.body.error}): ${result.body.error_description}`);
    const res = NextResponse.redirect(back, 303);
    res.cookies.delete(sessionCookie(id));
    res.cookies.delete(tokensCookie(id));
    return persist(res);
  }

  const { id_token, access_token, refresh_token } = result.body;
  const v = await validateIdToken(id_token, { issuer, audience: vendor.clientId, accessToken: access_token });
  if (!v.ok || v.claims.sub !== session.sub) {
    back.searchParams.set("error", "invalid_id_token");
    back.searchParams.set("error_description", v.ok ? "Refreshed ID token has a different sub (OIDC Core §12.2)." : v.description);
    return persist(NextResponse.redirect(back, 303));
  }

  const updated: RpSession = {
    ...session,
    family: result.family,
    trace: [
      ...session.trace,
      {
        t: now,
        label: `Refresh #${(result.family?.gen ?? 2) - 1}: POST /token grant_type=refresh_token`,
        detail: `Rotation: generation ${(result.family?.gen ?? 2) - 1} → ${result.family?.gen}. New access token (expires in ${result.body.expires_in}s), new ID token (same sub, original auth_time), new refresh token. The old refresh token is now dead.`,
      },
    ].slice(-14),
  };
  back.searchParams.set("tokens", "refreshed");
  const res = NextResponse.redirect(back, 303);
  res.cookies.set(sessionCookie(id), await seal(updated, 3600), cookieOpts(3600));
  res.cookies.set(
    tokensCookie(id),
    packTokens({ idToken: id_token, accessToken: access_token, refreshToken: refresh_token, prevRefreshToken: presented }),
    cookieOpts(3600),
  );
  return persist(res);
}
