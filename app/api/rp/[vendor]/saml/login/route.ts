import { NextResponse, type NextRequest } from "next/server";
import { randomToken } from "@/lib/crypto";
import { buildAuthnRequest, encodeRedirect, samlId, samlIdp, samlSp } from "@/lib/saml";
import { cookieOpts, originFrom, seal, txnCookie } from "@/lib/session";
import { isVendorId } from "@/lib/vendors";

/** SP-initiated SAML: build an AuthnRequest and send the browser to the IdP (HTTP-Redirect binding). */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/rp/[vendor]/saml/login">) {
  const { vendor: id } = await ctx.params;
  if (!isVendorId(id)) return new Response("Unknown vendor", { status: 404 });
  const origin = originFrom(req.headers, req.nextUrl.origin);
  const sp = samlSp(origin, id);
  const idp = samlIdp(origin);

  const requestId = samlId();
  const relayState = randomToken(16);
  const xml = buildAuthnRequest({
    id: requestId,
    spEntityId: sp.entityId,
    acsUrl: sp.acsUrl,
    destination: idp.ssoUrl,
    forceAuthn: req.nextUrl.searchParams.get("force") === "1",
  });
  const url = new URL(idp.ssoUrl);
  url.searchParams.set("SAMLRequest", encodeRedirect(xml));
  url.searchParams.set("RelayState", relayState);

  const res = NextResponse.redirect(url);
  // Same idea as the OIDC transaction cookie: the request ID plays the role of nonce, RelayState of state.
  res.cookies.set(txnCookie(id), await seal({ saml: true, requestId, relayState, startedAt: Date.now(), authnRequest: xml }, 600), cookieOpts(600));
  return res;
}
