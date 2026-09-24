import { headers } from "next/headers";
import { HelpHeading } from "@/components/Help";
import { jwks } from "@/lib/crypto";
import { discovery } from "@/lib/idp";
import { issuerFor, originFrom } from "@/lib/session";

export default async function IdpInternals() {
  const origin = originFrom(await headers());
  const issuer = issuerFor(origin);
  const disc = discovery(issuer);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Identity provider internals</h1>
        <p className="text-muted">
          The public, standards-defined surface of the mock IdP. Any OIDC library can integrate with it using only the
          discovery URL.
        </p>
      </div>
      <div className="card">
        <HelpHeading topic="discovery">Discovery document</HelpHeading>
        <p className="mb-2 text-sm">
          <a className="text-accent hover:underline" href={`${issuer}/.well-known/openid-configuration`}>
            {issuer}/.well-known/openid-configuration
          </a>
        </p>
        <pre className="code-block">{JSON.stringify(disc, null, 2)}</pre>
      </div>
      <div className="card">
        <HelpHeading topic="jwks">JSON Web Key Set</HelpHeading>
        <p className="mb-2 text-sm">
          <a className="text-accent hover:underline" href={disc.jwks_uri}>{disc.jwks_uri}</a> — public key only; the private
          key never leaves the IdP.
        </p>
        <pre className="code-block">{JSON.stringify(jwks(), null, 2)}</pre>
      </div>
      <div className="card">
        <HelpHeading topic="auth-code-flow">Try the endpoints yourself (PowerShell)</HelpHeading>
        <pre className="code-block">{`# Discovery
Invoke-RestMethod "${issuer}/.well-known/openid-configuration"

# Token endpoint rejects a bad code (expected: 400 invalid_grant or 401 invalid_client)
$body = @{
  grant_type    = "authorization_code"
  code          = "not-a-real-code"
  redirect_uri  = "${origin}/api/rp/aircall/callback"
  client_id     = "aircall-demo-client"
  client_secret = "wrong-secret"
  code_verifier = "abc123"
}
try { Invoke-RestMethod -Method Post -Uri "${issuer}/token" -Body $body }
catch { $_.ErrorDetails.Message }

# Userinfo without a token (expected: 401)
try { Invoke-RestMethod "${issuer}/userinfo" } catch { $_.Exception.Response.StatusCode }`}</pre>
        <p className="mt-2 text-xs text-muted">
          If Vercel Deployment Protection is on for preview URLs, calls from outside the browser need a bypass token.
        </p>
      </div>
    </div>
  );
}
