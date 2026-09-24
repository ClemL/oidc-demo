import { NextResponse, type NextRequest } from "next/server";
import { pkceChallenge, randomToken } from "@/lib/crypto";
import { redirectUriFor } from "@/lib/clients";
import { cookieOpts, issuerFor, originFrom, seal, txnCookie } from "@/lib/session";
import { VENDORS, isVendorId } from "@/lib/vendors";

/** Step 1: the vendor app builds an authorization request and redirects the browser to the IdP. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/rp/[vendor]/login">) {
  const { vendor: id } = await ctx.params;
  if (!isVendorId(id)) return new Response("Unknown vendor", { status: 404 });
  const vendor = VENDORS[id];
  const origin = originFrom(req.headers, req.nextUrl.origin);

  const state = randomToken(16);
  const nonce = randomToken(16);
  const codeVerifier = randomToken(32);

  const authorize = new URL(`${issuerFor(origin)}/authorize`);
  authorize.search = new URLSearchParams({
    response_type: "code",
    client_id: vendor.clientId,
    redirect_uri: redirectUriFor(origin, id),
    scope: vendor.scopes.join(" "),
    state,
    nonce,
    code_challenge: pkceChallenge(codeVerifier),
    code_challenge_method: "S256",
  }).toString();
  const prompt = req.nextUrl.searchParams.get("prompt");
  if (prompt === "login" || prompt === "none") authorize.searchParams.set("prompt", prompt);

  const res = NextResponse.redirect(authorize);
  // The transaction cookie binds this browser to the request (state, nonce, PKCE verifier).
  res.cookies.set(
    txnCookie(id),
    await seal({ state, nonce, codeVerifier, startedAt: Date.now(), authorizeUrl: authorize.toString() }, 600),
    cookieOpts(600),
  );
  return res;
}
