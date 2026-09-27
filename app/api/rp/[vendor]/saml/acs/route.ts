import { NextResponse, type NextRequest } from "next/server";
import { ATTR, packXml, samlIdp, samlSp, verifyResponse } from "@/lib/saml";
import {
  cookieOpts, originFrom, seal, seenCookie, sessionCookie, tokensCookie, txnCookie, unseal,
  type RpSession, type TraceStep,
} from "@/lib/session";
import { VENDORS, isVendorId, mapRole } from "@/lib/vendors";

type SamlTxn = { saml: true; requestId: string; relayState: string; startedAt: number; authnRequest: string };

/** Assertion Consumer Service: receives the POSTed SAML Response, verifies it, creates the local session. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/rp/[vendor]/saml/acs">) {
  const { vendor: id } = await ctx.params;
  if (!isVendorId(id)) return new Response("Unknown vendor", { status: 404 });
  const vendor = VENDORS[id];
  const origin = originFrom(req.headers, req.nextUrl.origin);
  const sp = samlSp(origin, id);
  const back = new URL(`/vendors/${id}`, origin);
  const form = await req.formData();

  const fail = (error: string, description: string) => {
    back.searchParams.set("error", error);
    back.searchParams.set("error_description", description);
    const res = NextResponse.redirect(back, 303);
    res.cookies.delete(txnCookie(id));
    return res;
  };

  const txn = await unseal<SamlTxn>(req.cookies.get(txnCookie(id))?.value);
  if (!txn?.saml) return fail("missing_transaction", "No SAML sign-in transaction cookie. It expired, or this Response was not requested by this browser (unsolicited / replayed).");
  if (form.get("RelayState") !== txn.relayState) return fail("relay_state_mismatch", "RelayState does not match this browser's request — possible CSRF / login injection.");

  let xml: string;
  try {
    xml = Buffer.from(String(form.get("SAMLResponse") ?? ""), "base64").toString("utf8");
  } catch {
    return fail("malformed_response", "SAMLResponse is not base64.");
  }
  const v = verifyResponse(xml, { idpEntityId: samlIdp(origin).entityId, spEntityId: sp.entityId, acsUrl: sp.acsUrl, requestId: txn.requestId });
  if (!v.ok) {
    const error = v.error === "saml_status" && /RequestDenied/.test(v.description) ? "access_denied" : v.error;
    return fail(error, v.description);
  }

  const { assertion } = v;
  const attr = (k: keyof typeof ATTR) => assertion.attributes[ATTR[k]] ?? [];
  const sub = attr("objectId")[0];
  if (!sub) return fail("missing_attribute", "The assertion has no objectidentifier attribute to key the account on.");
  const groups = attr("groups");
  const { role, matched } = mapRole(vendor, groups);
  const authMs = Date.parse(assertion.authnInstant);
  const silent = authMs < txn.startedAt - 1000;
  const amr = attr("amr").some((m) => m.endsWith("multipleauthn")) ? "password + MFA" : "password";

  const trace: TraceStep[] = [
    { t: txn.startedAt, label: "Redirect to IdP SSO URL with SAMLRequest (HTTP-Redirect binding)", detail: `AuthnRequest ID=${txn.requestId} → DEFLATE → base64 → ?SAMLRequest=…&RelayState=…` },
    { t: Date.now(), label: "Browser auto-POSTs the SAML Response to the ACS URL (HTTP-POST binding)", detail: `POST ${sp.acsUrl}  SAMLResponse=<${xml.length} bytes of signed XML, base64>  RelayState ✓ matches` },
    { t: Date.now(), label: "No back channel", detail: "Unlike OIDC there is no server-to-server token request: the identity arrives through the browser, so the signature is the only thing that makes it trustworthy." },
    {
      t: Date.now(),
      label: "Assertion verified",
      detail: silent
        ? `AuthnInstant predates this sign-in → reused the existing IdP session (SSO, no password prompt)`
        : `fresh authentication at ${assertion.authnInstant} via ${amr}`,
    },
  ];
  const seen = (req.cookies.get(seenCookie(id))?.value ?? "").split(",").filter(Boolean);
  const jit = !seen.includes(sub.slice(-4));
  trace.push({
    t: Date.now(),
    label: jit ? "Just-in-time account created" : "Existing account matched",
    detail: `NameID ${assertion.nameId} → role "${role}"${matched ? ` (group ${matched.group})` : " (default)"}`,
  });

  const session: RpSession = { protocol: "saml", sub, role, roleSource: matched?.group ?? null, jit, silent, checks: v.checks, trace };
  const res = NextResponse.redirect(back, 303);
  res.cookies.delete(txnCookie(id));
  res.cookies.set(sessionCookie(id), await seal(session, 3600), cookieOpts(3600));
  res.cookies.set(tokensCookie(id), `saml ${packXml(xml)}`, cookieOpts(3600));
  if (jit) res.cookies.set(seenCookie(id), [...seen, sub.slice(-4)].join(","), cookieOpts(30 * 86400));
  return res;
}
