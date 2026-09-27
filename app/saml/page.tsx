import Link from "next/link";
import { headers } from "next/headers";
import { Help, HelpHeading } from "@/components/Help";
import { JwtViewer } from "@/components/JwtViewer";
import { ProtocolMap } from "@/components/ProtocolMap";
import { Tabs } from "@/components/Tabs";
import { XmlViewer } from "@/components/XmlViewer";
import { USERS } from "@/lib/directory";
import { profileClaims, signIdToken } from "@/lib/idp";
import { buildAuthnRequest, buildResponse, certThumbprint, idpCertificate, prettyXml, samlId, samlIdp, samlSp } from "@/lib/saml";
import { issuerFor, originFrom } from "@/lib/session";
import { VENDORS } from "@/lib/vendors";

export const dynamic = "force-dynamic";

export default async function SamlComparison() {
  const origin = originFrom(await headers());
  const user = USERS[0];
  const vendor = VENDORS.aircall;
  const sp = samlSp(origin, vendor.id);
  const idp = samlIdp(origin);
  const authTime = Math.floor(Date.now() / 1000);
  const requestId = samlId();

  // Illustrative samples for the same user and app, generated and signed on each page load.
  const authnRequest = buildAuthnRequest({ id: requestId, spEntityId: sp.entityId, acsUrl: sp.acsUrl, destination: idp.ssoUrl });
  const response = buildResponse({
    idpEntityId: idp.entityId,
    spEntityId: sp.entityId,
    acsUrl: sp.acsUrl,
    inResponseTo: requestId,
    subject: { user, authTime, amr: ["pwd", "mfa"] },
  });
  const idToken = await signIdToken(
    { nonce: "example-nonce", auth_time: authTime, amr: ["pwd", "mfa"], ...profileClaims(user, vendor.scopes) },
    { issuer: issuerFor(origin), sub: user.sub, aud: vendor.clientId },
  );

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">OIDC vs SAML 2.0, side by side</h1>
          <Help topic="saml-flow" />
        </div>
        <p className="mt-1 text-muted">
          Aircall and Lattice integrate with Entra ID over <b className="text-fg">SAML 2.0</b>. The same IdP here speaks both
          protocols with the same signing key, so you can compare them on one sign-in. Both vendor pages have a{" "}
          <b className="text-fg">Continue with SSO (SAML 2.0)</b> button that runs the real SAML flow.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/vendors/aircall" className="btn btn-primary">Try SAML with Aircall →</Link>
          <Link href="/vendors/lattice" className="btn btn-ghost">Try SAML with Lattice →</Link>
        </div>
      </div>

      <div className="card">
        <HelpHeading topic="saml-vs-oidc">Same concepts, different wire formats</HelpHeading>
        <ProtocolMap
          values={{
            "Who issued it": { oidc: issuerFor(origin), saml: idp.entityId },
            "Who it is for": { oidc: vendor.clientId, saml: sp.entityId },
            "Who the user is": { oidc: user.sub, saml: `${user.email} + ${user.sub}` },
            "Where it may be delivered": { oidc: `${origin}/api/rp/aircall/callback`, saml: sp.acsUrl },
          }}
        />
      </div>

      <div className="card">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-lg font-semibold">The artifacts for {user.givenName} signing in to Aircall</h2>
          <Help topic="id-token" label="ID token" />
          <Help topic="saml-flow" label="SAML" />
        </div>
        <p className="mb-4 text-sm text-muted">
          Generated and signed on this page load. The SAML Response is {response.length.toLocaleString()} bytes; the ID token is{" "}
          {idToken.length.toLocaleString()} characters.
        </p>
        <Tabs
          tabs={[
            { id: "resp", label: "SAML Response (signed)", content: <XmlViewer xml={prettyXml(response)} /> },
            { id: "jwt", label: "OIDC ID token", content: <JwtViewer token={idToken} /> },
            {
              id: "req",
              label: "SAML AuthnRequest",
              content: (
                <div className="space-y-2">
                  <XmlViewer xml={prettyXml(authnRequest)} />
                  <p className="text-xs text-muted">
                    Sent as <code className="code-inline">?SAMLRequest=</code> after raw DEFLATE + base64 (HTTP-Redirect binding). The OIDC
                    equivalent is the <code className="code-inline">/authorize</code> query string.
                  </p>
                </div>
              ),
            },
          ]}
        />
      </div>

      <div className="card">
        <HelpHeading topic="jwks">IdP metadata and signing certificate</HelpHeading>
        <p className="mb-2 text-sm">
          <a className="text-accent hover:underline" href={idp.metadataUrl}>{idp.metadataUrl}</a> — the file an admin uploads to the
          vendor. It is SAML&apos;s counterpart of the discovery document plus JWKS.
        </p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="font-semibold">Subject</dt><dd className="font-mono text-xs text-muted">{idpCertificate.parsed.subject}</dd></div>
          <div><dt className="font-semibold">Issuer</dt><dd className="font-mono text-xs text-muted">{idpCertificate.parsed.issuer}</dd></div>
          <div><dt className="font-semibold">Valid</dt><dd className="font-mono text-xs text-muted">{idpCertificate.parsed.validFrom} → {idpCertificate.parsed.validTo}</dd></div>
          <div><dt className="font-semibold">SHA-256 thumbprint</dt><dd className="break-all font-mono text-xs text-muted">{certThumbprint}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">
          The certificate wraps the same P-256 public key as the JWKS entry. Vendors pin this certificate; when it expires, every SAML
          app must be updated by hand, whereas OIDC clients re-read the JWKS URL automatically.
        </p>
      </div>
    </div>
  );
}
