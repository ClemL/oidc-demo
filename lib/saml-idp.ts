import "server-only";
import { NextResponse } from "next/server";
import { isAssigned } from "./idp";
import { buildResponse, postBindingHtml, samlIdp, samlSp, type ParsedAuthnRequest, type SamlSubject } from "./saml";
import { VENDORS, VENDOR_IDS, type Vendor } from "./vendors";

export type SamlLoginRequest = { req: ParsedAuthnRequest; relayState: string; vendor: Vendor["id"] };

/** Find the SP by its entity ID and insist on its registered ACS URL (the SAML twin of redirect_uri matching). */
export function findSamlSp(origin: string, req: ParsedAuthnRequest) {
  const id = VENDOR_IDS.find((v) => samlSp(origin, v).entityId === req.issuer);
  if (!id) return { ok: false as const, description: `Unknown service provider entity ID: ${req.issuer || "(none)"}` };
  if (req.acsUrl && req.acsUrl !== samlSp(origin, id).acsUrl)
    return { ok: false as const, description: `AssertionConsumerServiceURL is not registered for ${VENDORS[id].name}. Expected ${samlSp(origin, id).acsUrl}` };
  return { ok: true as const, vendor: VENDORS[id] };
}

/** Build the signed Response (or a RequestDenied status) and return the auto-POST page. */
export function samlRespond(origin: string, login: SamlLoginRequest, subject: SamlSubject | null, cancelled = false) {
  const vendor = VENDORS[login.vendor];
  const sp = samlSp(origin, vendor.id);
  const base = { idpEntityId: samlIdp(origin).entityId, spEntityId: sp.entityId, acsUrl: sp.acsUrl, inResponseTo: login.req.id };
  let xml: string;
  if (cancelled || !subject) {
    xml = buildResponse({ ...base, status: { code: "urn:oasis:names:tc:SAML:2.0:status:AuthnFailed", message: "The user cancelled sign-in." } });
  } else if (!isAssigned(subject.user, vendor)) {
    xml = buildResponse({
      ...base,
      status: { code: "urn:oasis:names:tc:SAML:2.0:status:RequestDenied", message: `${subject.user.email} is not assigned to ${vendor.name} in the IdP.` },
    });
  } else {
    xml = buildResponse({ ...base, subject });
  }
  return new NextResponse(postBindingHtml(sp.acsUrl, xml, login.relayState), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
