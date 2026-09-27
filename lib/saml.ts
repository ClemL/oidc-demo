import "server-only";
import { KeyObject, createHash, createPublicKey, sign, verify, type BinaryLike, type KeyLike } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { DOMParser, type Document, type Element } from "@xmldom/xmldom";
import { SignedXml } from "xml-crypto";
import { derive, randomToken, signingKey } from "./crypto";
import type { DirectoryUser } from "./directory";
import type { VendorId } from "./vendors";
import { buildCertificate, ed25519FromSeed } from "./x509";

/**
 * SAML 2.0 Web Browser SSO profile: SP-initiated, HTTP-Redirect binding for the
 * AuthnRequest, HTTP-POST binding for the Response. The IdP signs the assertion
 * (Entra ID's default) with the same P-256 key that signs OIDC ID tokens.
 */
export const NS = {
  p: "urn:oasis:names:tc:SAML:2.0:protocol",
  a: "urn:oasis:names:tc:SAML:2.0:assertion",
  md: "urn:oasis:names:tc:SAML:2.0:metadata",
  ds: "http://www.w3.org/2000/09/xmldsig#",
};
const ECDSA_SHA256 = "http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256";
const EXC_C14N = "http://www.w3.org/2001/10/xml-exc-c14n#";
const ENVELOPED = "http://www.w3.org/2000/09/xmldsig#enveloped-signature";
const SHA256 = "http://www.w3.org/2001/04/xmlenc#sha256";
const BEARER = "urn:oasis:names:tc:SAML:2.0:cm:bearer";
const EMAIL_FORMAT = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress";
const SKEW_MS = 30_000;
const ASSERTION_TTL_MS = 5 * 60_000;

/** Attribute names Microsoft Entra ID emits by default, so the XML looks like the real thing. */
export const ATTR = {
  objectId: "http://schemas.microsoft.com/identity/claims/objectidentifier",
  displayName: "http://schemas.microsoft.com/identity/claims/displayname",
  givenName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
  surname: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
  email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
  name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  groups: "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups",
  amr: "http://schemas.microsoft.com/claims/authnmethodsreferences",
};

/** XML-DSig 1.1 ECDSA: the SignatureValue is r || s, not DER. */
class EcdsaSha256 {
  getSignature(signedInfo: BinaryLike, privateKey: KeyLike): string {
    return sign("sha256", Buffer.from(signedInfo as string), { key: privateKey as KeyObject, dsaEncoding: "ieee-p1363" }).toString("base64");
  }
  verifySignature(material: string, key: KeyLike, signatureValue: string): boolean {
    const k = key instanceof KeyObject ? key : createPublicKey(key as string | Buffer);
    return verify("sha256", Buffer.from(material), { key: k, dsaEncoding: "ieee-p1363" }, Buffer.from(signatureValue, "base64"));
  }
  getAlgorithmName() {
    return ECDSA_SHA256;
  }
}

export const idpCertificate = buildCertificate({
  subjectKey: signingKey.privateKey,
  subjectCn: "SSO Lab IdP SAML Signing",
  issuerKey: ed25519FromSeed(derive("saml-demo-ca")),
  issuerCn: "SSO Lab Demo CA",
  serial: derive("saml-cert-serial").subarray(0, 8),
  notBefore: "250101000000Z",
  notAfter: "350101000000Z",
});

/** SHA-256 thumbprint, the value an SP admin compares when uploading IdP metadata. */
export const certThumbprint = createHash("sha256").update(idpCertificate.der).digest("hex").toUpperCase().match(/../g)!.join(":");

export const samlIdp = (origin: string) => ({
  entityId: `${origin}/api/idp/saml`,
  ssoUrl: `${origin}/api/idp/saml/sso`,
  metadataUrl: `${origin}/api/idp/saml/metadata`,
});

export const samlSp = (origin: string, vendor: VendorId) => ({
  entityId: `${origin}/api/rp/${vendor}/saml`,
  acsUrl: `${origin}/api/rp/${vendor}/saml/acs`,
});

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
export const samlId = () => `_${randomToken(16).replace(/[-_]/g, "x")}`;

function parse(xml: string) {
  let error: string | undefined;
  const doc = new DOMParser({
    onError: (level, msg) => {
      if (level !== "warning") error ??= msg;
    },
  }).parseFromString(xml, "text/xml");
  if (error || !doc.documentElement) throw new Error(`Malformed XML: ${error ?? "no root element"}`);
  return doc;
}

const all = (node: Document | Element, ns: string, local: string) => Array.from(node.getElementsByTagNameNS(ns, local)) as Element[];
const first = (node: Document | Element, ns: string, local: string) => all(node, ns, local)[0] as Element | undefined;
const text = (node: Document | Element, ns: string, local: string) => first(node, ns, local)?.textContent?.trim() ?? "";

// ---------------------------------------------------------------- AuthnRequest

export function buildAuthnRequest(a: { id: string; spEntityId: string; acsUrl: string; destination: string; forceAuthn?: boolean }) {
  return (
    `<samlp:AuthnRequest xmlns:samlp="${NS.p}" xmlns:saml="${NS.a}" ID="${a.id}" Version="2.0" IssueInstant="${iso(Date.now())}"` +
    ` Destination="${esc(a.destination)}" AssertionConsumerServiceURL="${esc(a.acsUrl)}"` +
    ` ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"${a.forceAuthn ? ' ForceAuthn="true"' : ""}>` +
    `<saml:Issuer>${esc(a.spEntityId)}</saml:Issuer>` +
    `<samlp:NameIDPolicy Format="${EMAIL_FORMAT}" AllowCreate="true"/>` +
    `</samlp:AuthnRequest>`
  );
}

/** HTTP-Redirect binding: raw DEFLATE, then base64, then URL-encode. */
export const encodeRedirect = (xml: string) => deflateRawSync(Buffer.from(xml, "utf8")).toString("base64");
export const decodeRedirect = (b64: string) => inflateRawSync(Buffer.from(b64, "base64")).toString("utf8");

export type ParsedAuthnRequest = { id: string; issuer: string; acsUrl: string; forceAuthn: boolean; destination: string };

export function parseAuthnRequest(xml: string): ParsedAuthnRequest {
  const doc = parse(xml);
  const root = doc.documentElement!;
  if (root.localName !== "AuthnRequest" || root.namespaceURI !== NS.p) throw new Error("Not a SAML AuthnRequest.");
  return {
    id: root.getAttribute("ID") ?? "",
    issuer: text(doc, NS.a, "Issuer"),
    acsUrl: root.getAttribute("AssertionConsumerServiceURL") ?? "",
    forceAuthn: root.getAttribute("ForceAuthn") === "true",
    destination: root.getAttribute("Destination") ?? "",
  };
}

// ---------------------------------------------------------------- Response (IdP side)

export type SamlSubject = { user: DirectoryUser; authTime: number; amr: string[] };

export function buildResponse(a: {
  idpEntityId: string;
  spEntityId: string;
  acsUrl: string;
  inResponseTo: string;
  subject?: SamlSubject;
  status?: { code: string; message: string };
}) {
  const now = Date.now();
  const status = a.status
    ? `<samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Responder"><samlp:StatusCode Value="${a.status.code}"/></samlp:StatusCode><samlp:StatusMessage>${esc(a.status.message)}</samlp:StatusMessage></samlp:Status>`
    : `<samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status>`;

  let assertion = "";
  if (a.subject && !a.status) {
    const { user, authTime, amr } = a.subject;
    const attr = (name: string, values: string[]) =>
      `<saml:Attribute Name="${name}">${values.map((v) => `<saml:AttributeValue>${esc(v)}</saml:AttributeValue>`).join("")}</saml:Attribute>`;
    assertion =
      `<saml:Assertion ID="${samlId()}" Version="2.0" IssueInstant="${iso(now)}">` +
      `<saml:Issuer>${esc(a.idpEntityId)}</saml:Issuer>` +
      `<saml:Subject><saml:NameID Format="${EMAIL_FORMAT}">${esc(user.email)}</saml:NameID>` +
      `<saml:SubjectConfirmation Method="${BEARER}"><saml:SubjectConfirmationData InResponseTo="${a.inResponseTo}" NotOnOrAfter="${iso(now + ASSERTION_TTL_MS)}" Recipient="${esc(a.acsUrl)}"/></saml:SubjectConfirmation></saml:Subject>` +
      `<saml:Conditions NotBefore="${iso(now - SKEW_MS)}" NotOnOrAfter="${iso(now + ASSERTION_TTL_MS)}"><saml:AudienceRestriction><saml:Audience>${esc(a.spEntityId)}</saml:Audience></saml:AudienceRestriction></saml:Conditions>` +
      `<saml:AttributeStatement>` +
      attr(ATTR.objectId, [user.sub]) +
      attr(ATTR.displayName, [`${user.givenName} ${user.familyName}`]) +
      attr(ATTR.givenName, [user.givenName]) +
      attr(ATTR.surname, [user.familyName]) +
      attr(ATTR.email, [user.email]) +
      attr(ATTR.name, [user.email]) +
      attr(ATTR.groups, user.groups) +
      attr(ATTR.amr, amr.map((m) => (m === "pwd" ? "http://schemas.microsoft.com/ws/2008/06/identity/authenticationmethod/password" : "http://schemas.microsoft.com/claims/multipleauthn"))) +
      `</saml:AttributeStatement>` +
      `<saml:AuthnStatement AuthnInstant="${iso(authTime * 1000)}" SessionIndex="${samlId()}"><saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></saml:AuthnContext></saml:AuthnStatement>` +
      `</saml:Assertion>`;
  }

  const xml =
    `<samlp:Response xmlns:samlp="${NS.p}" xmlns:saml="${NS.a}" ID="${samlId()}" Version="2.0" IssueInstant="${iso(now)}"` +
    ` Destination="${esc(a.acsUrl)}" InResponseTo="${a.inResponseTo}">` +
    `<saml:Issuer>${esc(a.idpEntityId)}</saml:Issuer>${status}${assertion}</samlp:Response>`;
  return assertion ? signAssertion(xml) : xml;
}

function signAssertion(xml: string) {
  const sig = new SignedXml({ privateKey: signingKey.privateKey, publicCert: idpCertificate.pem });
  sig.SignatureAlgorithms[ECDSA_SHA256] = EcdsaSha256;
  sig.signatureAlgorithm = ECDSA_SHA256;
  sig.canonicalizationAlgorithm = EXC_C14N;
  sig.addReference({
    xpath: "//*[local-name(.)='Assertion']",
    transforms: [ENVELOPED, EXC_C14N],
    digestAlgorithm: SHA256,
  });
  // saml-schema: ds:Signature must come right after the assertion's Issuer.
  sig.computeSignature(xml, {
    prefix: "ds",
    location: { reference: "//*[local-name(.)='Assertion']/*[local-name(.)='Issuer']", action: "after" },
  });
  return sig.getSignedXml();
}

/** HTTP-POST binding: the IdP hands the browser a self-submitting form. */
export function postBindingHtml(acsUrl: string, samlResponseXml: string, relayState: string) {
  const b64 = Buffer.from(samlResponseXml, "utf8").toString("base64");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Signing in…</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f7f9;color:#16181d}
@media (prefers-color-scheme:dark){body{background:#0e1116;color:#e7eaf0}}</style></head>
<body onload="document.forms[0].submit()"><form method="post" action="${esc(acsUrl)}">
<input type="hidden" name="SAMLResponse" value="${b64}"><input type="hidden" name="RelayState" value="${esc(relayState)}">
<noscript><button type="submit">Continue</button></noscript></form><p>Posting the SAML Response to the app…</p></body></html>`;
}

// ---------------------------------------------------------------- Verification (SP side)

export type SamlCheck = { name: string; ok: boolean; detail: string };

export type VerifiedAssertion = {
  nameId: string;
  attributes: Record<string, string[]>;
  authnInstant: string;
  sessionIndex: string;
  assertionId: string;
  notOnOrAfter: string;
};

export type SamlVerifyResult =
  | { ok: true; assertion: VerifiedAssertion; checks: SamlCheck[] }
  | { ok: false; error: string; description: string; checks: SamlCheck[] };

/**
 * The SP's verification. Order matters: the signature is checked against the
 * certificate pinned from IdP metadata (never the one inside the message), and
 * every value is then read from the *signed bytes* xml-crypto returns, not from
 * the original document, which is the defense against XML signature wrapping.
 */
export function verifyResponse(
  responseXml: string,
  expect: { idpEntityId: string; spEntityId: string; acsUrl: string; requestId: string },
  now = Date.now(),
): SamlVerifyResult {
  const checks: SamlCheck[] = [];
  const fail = (error: string, description: string): SamlVerifyResult => ({ ok: false, error, description, checks });

  let doc: Document;
  try {
    doc = parse(responseXml);
  } catch (e) {
    return fail("malformed_response", (e as Error).message);
  }
  const root = doc.documentElement!;
  if (root.localName !== "Response" || root.namespaceURI !== NS.p) return fail("malformed_response", "Root element is not samlp:Response.");

  const codes = all(doc, NS.p, "StatusCode").map((c) => c.getAttribute("Value") ?? "");
  if (codes[0] !== "urn:oasis:names:tc:SAML:2.0:status:Success") {
    const detail = codes.map((c) => c.split(":").pop()).join(" / ");
    return fail("saml_status", `IdP returned status ${detail}: ${text(doc, NS.p, "StatusMessage")}`);
  }
  checks.push({ name: "Status", ok: true, detail: "urn:…:status:Success" });

  // Unsigned envelope fields: checked, but not trusted for identity.
  if (root.getAttribute("Destination") !== expect.acsUrl) return fail("destination_mismatch", "Response Destination is not this app's ACS URL.");
  if (root.getAttribute("InResponseTo") !== expect.requestId)
    return fail("in_response_to_mismatch", "Response InResponseTo does not match an outstanding AuthnRequest (unsolicited or replayed).");
  checks.push({ name: "Destination", ok: true, detail: `${expect.acsUrl} (Response envelope)` });

  const signatures = all(doc, NS.ds, "Signature");
  const assertions = all(doc, NS.a, "Assertion");
  if (signatures.length !== 1 || assertions.length !== 1)
    return fail("signature_wrapping", `Expected exactly one Assertion and one Signature, found ${assertions.length} and ${signatures.length}.`);

  const sig = new SignedXml({ publicCert: idpCertificate.pem, getCertFromKeyInfo: () => null });
  sig.SignatureAlgorithms = { [ECDSA_SHA256]: EcdsaSha256 }; // allow-list: nothing else is accepted
  sig.loadSignature(signatures[0] as unknown as Node);
  let valid = false;
  try {
    valid = sig.checkSignature(responseXml);
  } catch (e) {
    return fail("invalid_signature", `Signature rejected: ${(e as Error).message}`);
  }
  if (!valid) return fail("invalid_signature", "XML signature is not valid for the pinned IdP certificate.");
  checks.push({ name: "XML signature", ok: true, detail: `ecdsa-sha256 over exc-c14n SignedInfo, verified with the pinned certificate (SHA-256 ${certThumbprint.slice(0, 23)}…); KeyInfo in the message ignored` });

  const signed = sig.getSignedReferences();
  if (signed.length !== 1) return fail("signature_wrapping", "Signature does not cover exactly one element.");
  const a = parse(signed[0]).documentElement!;
  if (a.localName !== "Assertion" || a.namespaceURI !== NS.a) return fail("signature_wrapping", "The signed element is not the Assertion.");
  checks.push({ name: "Wrapping defense", ok: true, detail: "all values below are read from the signed bytes, not from the original document" });

  const issuer = text(a, NS.a, "Issuer");
  if (issuer !== expect.idpEntityId) return fail("issuer_mismatch", `Assertion Issuer ${issuer} is not the configured IdP.`);
  checks.push({ name: "Issuer", ok: true, detail: `${issuer} equals the IdP entity ID` });

  const audiences = all(a, NS.a, "Audience").map((x) => x.textContent?.trim());
  if (!audiences.includes(expect.spEntityId))
    return fail("audience_mismatch", `Audience ${audiences.join(", ")} is not this app's entity ID. The assertion was issued to another app.`);
  checks.push({ name: "Audience", ok: true, detail: `${expect.spEntityId} (≈ OIDC aud)` });

  const scd = first(a, NS.a, "SubjectConfirmationData");
  const cond = first(a, NS.a, "Conditions");
  if (first(a, NS.a, "SubjectConfirmation")?.getAttribute("Method") !== BEARER || !scd) return fail("invalid_subject_confirmation", "No bearer SubjectConfirmation.");
  if (scd.getAttribute("Recipient") !== expect.acsUrl) return fail("recipient_mismatch", "SubjectConfirmationData Recipient is not this app's ACS URL.");
  if (scd.getAttribute("InResponseTo") !== expect.requestId) return fail("in_response_to_mismatch", "Signed InResponseTo does not match this browser's AuthnRequest.");
  checks.push({ name: "InResponseTo", ok: true, detail: `${expect.requestId} (≈ OIDC nonce / state: binds the assertion to this sign-in)` });
  checks.push({ name: "Recipient", ok: true, detail: `${expect.acsUrl} (≈ OIDC redirect_uri)` });

  const nb = Date.parse(cond?.getAttribute("NotBefore") ?? "");
  const noa = Math.min(Date.parse(cond?.getAttribute("NotOnOrAfter") ?? ""), Date.parse(scd.getAttribute("NotOnOrAfter") ?? ""));
  if (!(now + SKEW_MS >= nb) || !(now - SKEW_MS < noa)) return fail("assertion_expired", "Assertion is outside its NotBefore / NotOnOrAfter window.");
  checks.push({ name: "Time window", ok: true, detail: `valid until ${new Date(noa).toISOString()} (≈ OIDC exp, 30s skew allowed)` });

  const attributes: Record<string, string[]> = {};
  for (const at of all(a, NS.a, "Attribute")) {
    attributes[at.getAttribute("Name") ?? ""] = all(at, NS.a, "AttributeValue").map((v) => v.textContent ?? "");
  }
  const authn = first(a, NS.a, "AuthnStatement");
  return {
    ok: true,
    checks,
    assertion: {
      nameId: text(a, NS.a, "NameID"),
      attributes,
      authnInstant: authn?.getAttribute("AuthnInstant") ?? "",
      sessionIndex: authn?.getAttribute("SessionIndex") ?? "",
      assertionId: a.getAttribute("ID") ?? "",
      notOnOrAfter: new Date(noa).toISOString(),
    },
  };
}

// ---------------------------------------------------------------- Metadata & display

export function idpMetadata(origin: string) {
  const idp = samlIdp(origin);
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<md:EntityDescriptor xmlns:md="${NS.md}" xmlns:ds="${NS.ds}" entityID="${esc(idp.entityId)}">\n` +
    `  <md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="${NS.p}">\n` +
    `    <md:KeyDescriptor use="signing">\n      <ds:KeyInfo><ds:X509Data><ds:X509Certificate>${idpCertificate.b64}</ds:X509Certificate></ds:X509Data></ds:KeyInfo>\n    </md:KeyDescriptor>\n` +
    `    <md:NameIDFormat>${EMAIL_FORMAT}</md:NameIDFormat>\n` +
    `    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${esc(idp.ssoUrl)}"/>\n` +
    `  </md:IDPSSODescriptor>\n</md:EntityDescriptor>\n`
  );
}

/** Indent XML for display only. Never verify a pretty-printed copy: whitespace changes the digest. */
export function prettyXml(xml: string) {
  let depth = 0;
  return xml
    .replace(/>\s*</g, "><")
    .replace(/(<[^>]+>)/g, "\n$1\n")
    .split("\n")
    .filter((l) => l.trim())
    .reduce<string[]>((out, line) => {
      const closing = /^<\//.test(line);
      const selfClosing = /\/>$/.test(line) || /^<\?/.test(line);
      const opening = /^<[^/!?]/.test(line) && !selfClosing;
      if (closing) depth = Math.max(0, depth - 1);
      const prev = out[out.length - 1];
      // Keep short text nodes on the same line as their tags: <a>text</a>
      if (!line.startsWith("<") && prev !== undefined) {
        out[out.length - 1] = prev + line;
        return out;
      }
      if (closing && prev !== undefined && !prev.trimStart().startsWith("</") && /^\s*<[^/][^>]*>[^<]+$/.test(prev)) {
        out[out.length - 1] = prev + line;
        return out;
      }
      out.push("  ".repeat(depth) + line);
      if (opening) depth++;
      return out;
    }, [])
    .join("\n");
}

/** Deflate + base64url so the signed Response fits in the vendor's display cookie. */
export const packXml = (xml: string) => deflateRawSync(Buffer.from(xml, "utf8"), { level: 9 }).toString("base64url");
export const unpackXml = (v: string) => inflateRawSync(Buffer.from(v, "base64url")).toString("utf8");
