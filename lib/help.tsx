import type { ReactNode } from "react";

export type HelpTopic = {
  title: string;
  body: ReactNode;
  links?: { label: string; href: string }[];
};

const C = ({ children }: { children: ReactNode }) => <code className="code-inline">{children}</code>;

const SPEC = {
  core: { label: "OpenID Connect Core 1.0", href: "https://openid.net/specs/openid-connect-core-1_0.html" },
  discovery: { label: "OpenID Connect Discovery 1.0", href: "https://openid.net/specs/openid-connect-discovery-1_0.html" },
  pkce: { label: "RFC 7636 — PKCE", href: "https://datatracker.ietf.org/doc/html/rfc7636" },
  bcp: { label: "RFC 9700 — OAuth 2.0 Security Best Current Practice", href: "https://datatracker.ietf.org/doc/html/rfc9700" },
  jwt: { label: "RFC 7519 — JSON Web Token", href: "https://datatracker.ietf.org/doc/html/rfc7519" },
  jwk: { label: "RFC 7517 — JSON Web Key", href: "https://datatracker.ietf.org/doc/html/rfc7517" },
  scimCore: { label: "RFC 7643 — SCIM Core Schema", href: "https://datatracker.ietf.org/doc/html/rfc7643" },
  scimProto: { label: "RFC 7644 — SCIM Protocol", href: "https://datatracker.ietf.org/doc/html/rfc7644" },
  rpLogout: { label: "OIDC RP-Initiated Logout 1.0", href: "https://openid.net/specs/openid-connect-rpinitiated-1_0.html" },
  bcLogout: { label: "OIDC Back-Channel Logout 1.0", href: "https://openid.net/specs/openid-connect-backchannel-1_0.html" },
  iss: { label: "RFC 9207 — Authorization Server Issuer Identification", href: "https://datatracker.ietf.org/doc/html/rfc9207" },
  entraApps: { label: "Microsoft Entra — SaaS app integration tutorials", href: "https://learn.microsoft.com/entra/identity/saas-apps/tutorial-list" },
  entraProv: { label: "Microsoft Entra — What is app provisioning?", href: "https://learn.microsoft.com/entra/identity/app-provisioning/user-provisioning" },
  entraGroups: { label: "Microsoft Entra — Configure group claims", href: "https://learn.microsoft.com/entra/identity/hybrid/connect/how-to-connect-fed-group-claims" },
  saml: { label: "OASIS SAML 2.0 Technical Overview", href: "https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html" },
  aircall: { label: "Aircall Help Center (search: SSO, SAML)", href: "https://support.aircall.io" },
  lattice: { label: "Lattice Help Center (search: SSO, SAML, SCIM)", href: "https://help.lattice.com" },
  samlCore: { label: "OASIS SAML 2.0 Core (assertions and protocols)", href: "https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf" },
  samlBindings: { label: "OASIS SAML 2.0 Bindings (HTTP-Redirect, HTTP-POST)", href: "https://docs.oasis-open.org/security/saml/v2.0/saml-bindings-2.0-os.pdf" },
  xmldsig: { label: "W3C XML Signature Syntax and Processing 1.1", href: "https://www.w3.org/TR/xmldsig-core1/" },
  xsw: { label: "Somorovsky et al., \"On Breaking SAML: Be Whoever You Want to Be\" (USENIX Security 2012)", href: "https://www.usenix.org/conference/usenixsecurity12/technical-sessions/presentation/somorovsky" },
  entraSaml: { label: "Microsoft Entra — SAML token claims reference", href: "https://learn.microsoft.com/entra/identity-platform/reference-saml-tokens" },
  refresh: { label: "RFC 6749 §6 — Refreshing an access token", href: "https://datatracker.ietf.org/doc/html/rfc6749#section-6" },
  rotation: { label: "RFC 9700 §4.14 — Refresh token protection (rotation, reuse detection)", href: "https://datatracker.ietf.org/doc/html/rfc9700#section-4.14" },
  revocation: { label: "RFC 7009 — OAuth 2.0 Token Revocation", href: "https://datatracker.ietf.org/doc/html/rfc7009" },
  entraRevoke: { label: "Microsoft Entra — Revoke user access in an emergency", href: "https://learn.microsoft.com/entra/identity/users/users-revoke-access" },
  cae: { label: "Microsoft Entra — Continuous access evaluation", href: "https://learn.microsoft.com/entra/identity/conditional-access/concept-continuous-access-evaluation" },
};

export const HELP = {
  architecture: {
    title: "The three parties",
    body: (
      <>
        <p>Every SSO integration has the same three roles, regardless of protocol:</p>
        <ul>
          <li><b>User agent</b> — the employee&apos;s browser. It carries redirects between the other two parties; it is never trusted.</li>
          <li><b>Identity Provider (IdP)</b> — the single source of authentication. For an O365 shop this is <b>Microsoft Entra ID</b>; alternatives are Okta, Google Workspace, JumpCloud. OIDC calls it the <i>OpenID Provider (OP)</i>.</li>
          <li><b>Relying Party (RP)</b> / <b>Service Provider (SP)</b> — the vendor app (Aircall, Lattice). It never sees the password; it trusts a signed statement from the IdP.</li>
        </ul>
        <p>In this demo all three run inside one Next.js deployment under different paths (<C>/api/idp/*</C> and <C>/api/rp/*</C>), but they only talk through the same messages they would use across the internet.</p>
        <p><b>Analogy:</b> the IdP is the passport office, the ID token is the passport, and the vendor is border control. Border control checks the passport&apos;s seal (signature) and expiry — it does not call your parents to confirm who you are.</p>
      </>
    ),
    links: [SPEC.core],
  },
  oidc: {
    title: "What is OpenID Connect?",
    body: (
      <>
        <p><b>OAuth 2.0</b> is an <i>authorization</i> framework: it lets an app obtain an access token to call an API. It says nothing about who the user is.</p>
        <p><b>OpenID Connect (OIDC)</b> is a thin identity layer on top of OAuth 2.0 (finalized 2014). It adds:</p>
        <ul>
          <li>The <C>openid</C> scope, which switches a request into an OIDC request.</li>
          <li>The <b>ID token</b> — a signed JWT stating who authenticated, when, how, and for which app.</li>
          <li>A standard <C>/userinfo</C> endpoint, <b>discovery</b> document and <b>JWKS</b> key publication.</li>
        </ul>
        <p>Short version: OAuth answers &quot;may this app call that API?&quot;; OIDC answers &quot;who is this user?&quot;.</p>
      </>
    ),
    links: [SPEC.core, SPEC.bcp],
  },
  sso: {
    title: "What makes it single sign-on",
    body: (
      <>
        <p>SSO is not a protocol — it is the <b>effect</b> of many apps trusting the same IdP session.</p>
        <ol>
          <li>First app: the IdP has no session → it shows a login page, runs MFA, and sets its own session cookie on the IdP domain.</li>
          <li>Second app: the browser is redirected to the same IdP, which sees its cookie and immediately issues a code — <b>no password prompt</b>.</li>
        </ol>
        <p>There are therefore <b>two layers of session</b>: the IdP session (here 8 hours) and one local session per app (here 1 hour). Logging out of one does not automatically end the other — see the logout panel.</p>
        <p>Try it: sign in to Aircall, then open Lattice. The trace will say <i>&quot;reused existing IdP session&quot;</i>. You can prove it from the ID token: <C>auth_time</C> is earlier than the moment the second sign-in started.</p>
      </>
    ),
  },
  "saml-vs-oidc": {
    title: "Reality check: most B2B vendors use SAML",
    body: (
      <>
        <p>Direct answer: <b>Aircall and Lattice both document SAML 2.0 as their enterprise SSO protocol</b>, not OIDC. Lattice also offers &quot;Sign in with Google / Microsoft&quot;, which is OIDC-based but is not the same as tenant-controlled enterprise SSO.</p>
        <p>The trust model is identical, so this demo still teaches the integration correctly. The differences:</p>
        <ul>
          <li><b>Token format:</b> SAML uses a signed XML <i>assertion</i>; OIDC uses a signed JSON <i>ID token</i> (JWT).</li>
          <li><b>Transport:</b> SAML posts the assertion through the browser (HTTP-POST binding). OIDC&apos;s code flow sends only a short-lived code through the browser; tokens come over a back channel.</li>
          <li><b>Key exchange:</b> SAML — you upload/download certificate + metadata XML manually, and certificates expire (Entra defaults to 3 years). OIDC — keys are fetched automatically from <C>jwks_uri</C>.</li>
          <li><b>Mapping:</b> SAML &quot;attributes&quot; ≈ OIDC &quot;claims&quot;. SAML <C>NameID</C> ≈ OIDC <C>sub</C>.</li>
          <li><b>Fit:</b> OIDC is the default for new apps, SPAs, mobile and APIs; SAML remains dominant for legacy enterprise SaaS.</li>
        </ul>
        <p>Practical implication: in Entra ID you will add Aircall and Lattice from the <b>Enterprise applications gallery</b> and choose <i>SAML</i> as the SSO method. You will not write any OIDC code for them — the vendor already implemented the RP side.</p>
        <p className="muted">Data note: vendor plan gating and protocol support change; verify on the vendor help centers linked below before committing.</p>
      </>
    ),
    links: [SPEC.saml, SPEC.entraApps, SPEC.aircall, SPEC.lattice],
  },
  "auth-code-flow": {
    title: "Authorization Code Flow + PKCE",
    body: (
      <>
        <p>The flow used by every modern server-side app (and recommended for SPAs and mobile too by RFC 9700):</p>
        <ol>
          <li><b>Vendor → browser → IdP</b>: redirect to <C>/authorize</C> with <C>client_id</C>, <C>redirect_uri</C>, <C>scope=openid …</C>, <C>state</C>, <C>nonce</C>, <C>code_challenge</C>.</li>
          <li><b>IdP authenticates</b> the user (or reuses its session) and checks the user is assigned to this app.</li>
          <li><b>IdP → browser → vendor</b>: redirect to <C>redirect_uri?code=…&amp;state=…</C>. The code is single-use and short-lived (60 s here; Entra ~10 min).</li>
          <li><b>Vendor → IdP (back channel)</b>: <C>POST /token</C> with the code, client secret and <C>code_verifier</C>.</li>
          <li><b>IdP → vendor</b>: ID token + access token.</li>
          <li><b>Vendor validates</b> the ID token and creates its own session cookie.</li>
        </ol>
        <p>Why not return tokens directly in the redirect (the old <i>implicit</i> flow)? URLs leak — into browser history, logs, <C>Referer</C> headers. Only the useless-on-its-own code travels through the browser.</p>
      </>
    ),
    links: [SPEC.core, SPEC.bcp],
  },
  pkce: {
    title: "PKCE (Proof Key for Code Exchange)",
    body: (
      <>
        <p>Pronounced &quot;pixie&quot;. It stops a stolen authorization code from being redeemed by anyone else.</p>
        <ol>
          <li>Vendor generates a random <C>code_verifier</C> (43–128 chars) and keeps it secret.</li>
          <li>It sends only <C>code_challenge = BASE64URL(SHA-256(code_verifier))</C> to <C>/authorize</C>.</li>
          <li>At <C>/token</C> it sends the original verifier. The IdP hashes it and compares.</li>
        </ol>
        <p>An attacker who intercepts the code (malicious browser extension, logged URL) does not have the verifier, so the code is worthless. SHA-256 is one-way, so the challenge does not reveal the verifier.</p>
        <p>This demo&apos;s IdP <b>rejects requests without PKCE</b>, as RFC 9700 recommends even for confidential clients that also hold a client secret.</p>
      </>
    ),
    links: [SPEC.pkce, SPEC.bcp],
  },
  "state-nonce": {
    title: "state and nonce",
    body: (
      <>
        <p>Two random values the vendor generates per sign-in attempt and stores in a short-lived, HTTP-only cookie.</p>
        <ul>
          <li><b>state</b> — echoed back on the redirect. If it does not match the cookie, the callback was not started by this browser: a <b>CSRF / login-injection</b> attempt (an attacker trying to log you in to <i>their</i> account).</li>
          <li><b>nonce</b> — embedded by the IdP <i>inside the signed ID token</i>. If it does not match, the token was minted for a different request: <b>token replay</b>.</li>
        </ul>
        <p>This demo also checks the <C>iss</C> parameter on the redirect (RFC 9207), which defends against &quot;mix-up&quot; attacks when an app trusts several IdPs.</p>
      </>
    ),
    links: [SPEC.core, SPEC.iss],
  },
  "id-token": {
    title: "Anatomy of the ID token",
    body: (
      <>
        <p>A JWT: three base64url segments — <b>header</b>.<b>payload</b>.<b>signature</b>. Anyone can decode it; only the IdP can produce a valid signature.</p>
        <ul>
          <li><C>iss</C> — who issued it. Must equal the configured IdP exactly.</li>
          <li><C>sub</C> — stable, never-reassigned user id. <b>Use this as the account key, not email</b> — emails change on marriage/rename and can be recycled.</li>
          <li><C>aud</C> — which app it is for. A token for Aircall must be rejected by Lattice.</li>
          <li><C>exp</C>/<C>iat</C> — validity window.</li>
          <li><C>auth_time</C>, <C>amr</C> — when and how the user authenticated (<C>pwd</C>, <C>mfa</C>). Apps can demand recent or MFA authentication.</li>
          <li><C>nonce</C>, <C>at_hash</C> — replay protection and binding to the access token.</li>
          <li>Profile claims — <C>name</C>, <C>email</C>, <C>groups</C>, etc., controlled by scopes and IdP claim configuration.</li>
        </ul>
        <p>In Entra ID, the equivalent of <C>sub</C> for cross-app joins is the <C>oid</C> claim; Entra&apos;s <C>sub</C> is pairwise (different per app).</p>
      </>
    ),
    links: [SPEC.core, SPEC.jwt],
  },
  "access-token": {
    title: "ID token vs. access token",
    body: (
      <>
        <ul>
          <li><b>ID token</b> — for the <i>client app</i>. Proves who logged in. Never send it to an API as a credential.</li>
          <li><b>Access token</b> — for an <i>API</i> (resource server). Its audience is the API, here the IdP&apos;s <C>/userinfo</C>.</li>
        </ul>
        <p>Click <b>Call /userinfo</b> to send the access token as <C>Authorization: Bearer …</C>. The IdP validates its signature, audience and expiry, then returns the claims.</p>
        <p>In a real integration you rarely call vendor APIs with the user&apos;s token. System integrations (e.g., pulling Aircall call logs into Azure SQL) use a separate <b>API key or OAuth client-credentials</b> grant owned by a service account, not SSO.</p>
      </>
    ),
    links: [SPEC.core],
  },
  jwks: {
    title: "JWKS and signature verification",
    body: (
      <>
        <p>The IdP signs tokens with a private key and publishes the matching public keys at <C>jwks_uri</C>. The token header&apos;s <C>kid</C> says which key to use.</p>
        <ul>
          <li><b>Rotation</b>: the IdP publishes the new key before signing with it, so RPs that cache JWKS never break. Entra rotates signing keys periodically without notice; apps must fetch keys dynamically, not hard-code them.</li>
          <li><b>alg allow-list</b>: the RP must only accept the expected algorithm. Accepting <C>alg: none</C> or letting an attacker switch RS256→HS256 are classic JWT vulnerabilities.</li>
          <li>This demo signs with <b>ES256</b> (ECDSA P-256). Entra and Okta default to RS256; both are fine.</li>
        </ul>
        <p>Contrast with SAML: you download a certificate once, and SSO breaks the day it expires unless someone rotates it on both sides.</p>
      </>
    ),
    links: [SPEC.jwk, SPEC.bcp],
  },
  validation: {
    title: "What the vendor must validate",
    body: (
      <>
        <p>Each check below ran on the server before the session cookie was created. Skipping any one is a real-world vulnerability:</p>
        <ul>
          <li><b>Signature</b> via JWKS, with an <b>algorithm allow-list</b>.</li>
          <li><b>iss</b> equals the tenant&apos;s issuer. Multi-tenant apps that accept &quot;any Entra tenant&quot; have been breached this way.</li>
          <li><b>aud</b> equals this app&apos;s <C>client_id</C>.</li>
          <li><b>exp</b> in the future, with small clock skew allowance.</li>
          <li><b>nonce</b> matches the transaction.</li>
          <li><b>at_hash</b> matches the access token (when present).</li>
        </ul>
        <p>Use a maintained library (e.g. <C>Microsoft.IdentityModel</C> / <C>Microsoft.Identity.Web</C> in .NET, <C>jose</C> or <C>openid-client</C> in Node) rather than hand-rolling these checks.</p>
      </>
    ),
    links: [SPEC.core, SPEC.bcp],
  },
  discovery: {
    title: "Discovery document",
    body: (
      <>
        <p>Every OIDC IdP publishes <C>{"{issuer}"}/.well-known/openid-configuration</C>: a JSON file listing endpoints, supported algorithms, scopes and claims.</p>
        <p>Vendors that support &quot;generic OIDC&quot; usually ask for only three values: <b>issuer / discovery URL</b>, <b>client ID</b>, <b>client secret</b>. Everything else is discovered.</p>
        <p>Entra ID&apos;s is at <C>https://login.microsoftonline.com/{"{tenant-id}"}/v2.0/.well-known/openid-configuration</C>.</p>
      </>
    ),
    links: [SPEC.discovery],
  },
  "idp-login": {
    title: "The IdP sign-in page",
    body: (
      <>
        <p>This page belongs to the <b>IdP</b>, not the vendor. That is the core security benefit: the vendor never sees or stores passwords, and all policy is enforced in one place.</p>
        <ul>
          <li><b>MFA</b> — enforced once at the IdP, applies to every connected app. The <C>amr</C> claim reports it.</li>
          <li><b>Conditional Access</b> (Entra ID P1+) — require compliant device, block risky countries, require MFA only off-network, etc.</li>
          <li><b>Consent</b> — skipped here because an admin pre-approved the app for the tenant (&quot;admin consent&quot;), which is normal for enterprise apps.</li>
        </ul>
        <p>Demo users: <C>alex</C>, <C>priya</C>, <C>jordan</C>, <C>sam</C>. Password: <C>demo</C>.</p>
      </>
    ),
  },
  assignment: {
    title: "User assignment (who is allowed in)",
    body: (
      <>
        <p>Authentication (&quot;who are you?&quot;) and authorization (&quot;may you use this app?&quot;) are separate.</p>
        <p>In Entra ID, set <b>Enterprise app → Properties → Assignment required = Yes</b>, then assign groups. Unassigned users get an error at the IdP (Entra error <C>AADSTS50105</C>) and never reach the vendor.</p>
        <p>Try it: sign in as <C>sam</C> (contractor) or as <C>jordan</C> to Aircall. The IdP authenticates them successfully, then returns <C>error=access_denied</C> to the vendor.</p>
        <p>Assigning <b>groups</b> (rather than individuals) requires Entra ID P1 or higher — included in Microsoft 365 Business Premium and E3/E5.</p>
      </>
    ),
    links: [SPEC.entraApps],
  },
  "role-mapping": {
    title: "Group → role mapping",
    body: (
      <>
        <p>The IdP sends a <C>groups</C> claim; the vendor maps group names to its own roles. First matching rule wins.</p>
        <ul>
          <li>Keep role groups <b>app-specific</b> (<C>App-Aircall-Admins</C>) rather than reusing org groups, so granting app admin is an explicit, auditable decision.</li>
          <li>Entra sends group <b>object IDs</b> by default, not names. You can emit names for cloud groups, or use <b>App roles</b>, which appear in a <C>roles</C> claim and avoid group sprawl.</li>
          <li><b>Group overage</b>: if a user is in more than 200 groups (JWT) or 150 (SAML), Entra omits the claim and returns a pointer to Microsoft Graph instead. Filter to &quot;groups assigned to the application&quot; to avoid it.</li>
          <li>Many vendors (Lattice included) manage roles inside the app and ignore IdP groups; check whether role mapping via SSO is supported at all.</li>
        </ul>
      </>
    ),
    links: [SPEC.entraGroups],
  },
  jit: {
    title: "Just-in-time (JIT) provisioning",
    body: (
      <>
        <p>With JIT, the vendor creates the account the first time a valid ID token (or SAML assertion) arrives, using its claims.</p>
        <ul>
          <li><b>Pro</b>: zero setup — assignment in the IdP is the only step.</li>
          <li><b>Con</b>: the vendor learns nothing until the user logs in (can&apos;t pre-assign a phone number or a review cycle), and <b>JIT never deletes</b>. A leaver&apos;s account and license stay active in the vendor.</li>
        </ul>
        <p>That is why SCIM exists. Most mature setups use SCIM for lifecycle and SSO for login.</p>
      </>
    ),
  },
  scim: {
    title: "SCIM provisioning",
    body: (
      <>
        <p><b>SCIM 2.0</b> (System for Cross-domain Identity Management, RFC 7643/7644) is a REST + JSON standard the IdP uses to <b>push</b> user and group changes into the vendor.</p>
        <ul>
          <li><C>POST /Users</C> — joiner / newly assigned.</li>
          <li><C>PATCH /Users/{"{id}"}</C> — attribute change (title, department) or <C>active: false</C> for leavers.</li>
          <li><C>DELETE /Users/{"{id}"}</C> — hard delete; many IdPs soft-disable instead.</li>
          <li><C>externalId</C> holds the IdP&apos;s immutable id; the vendor returns its own <C>id</C>.</li>
        </ul>
        <p>Setup in Entra: Enterprise app → Provisioning → Automatic → paste the vendor&apos;s <b>Tenant URL</b> and <b>Secret token</b> → review attribute mappings → set scope to &quot;assigned users and groups&quot; → start.</p>
        <p>Entra runs an initial cycle, then <b>incremental cycles roughly every 40 minutes</b>. &quot;Provision on demand&quot; pushes a single user immediately for testing.</p>
      </>
    ),
    links: [SPEC.scimCore, SPEC.scimProto, SPEC.entraProv],
  },
  deprovisioning: {
    title: "Deprovisioning: the reason this matters",
    body: (
      <>
        <p>The highest-value outcome of SSO + SCIM is the <b>leaver process</b>: disable one account in the IdP and access to every connected app ends.</p>
        <ul>
          <li>Disabling the IdP account blocks <b>new</b> sign-ins immediately.</li>
          <li><b>Existing</b> vendor sessions survive until they expire — minutes to weeks depending on the vendor. Mobile apps with refresh tokens are the usual gap.</li>
          <li>SCIM <C>active: false</C> closes that gap for apps that honor it, and frees the paid seat.</li>
        </ul>
        <p>Also consider: shared phone numbers and call recordings (Aircall), and review history (Lattice) — data ownership on deactivation is a vendor setting, not an IdP one.</p>
      </>
    ),
    links: [SPEC.entraProv],
  },
  logout: {
    title: "Local logout vs. global logout",
    body: (
      <>
        <ul>
          <li><b>Local</b> — deletes only this vendor&apos;s cookie. The IdP session remains, so clicking &quot;Continue with SSO&quot; again signs you straight back in. This surprises users on shared computers.</li>
          <li><b>Global (RP-initiated)</b> — the vendor redirects to the IdP&apos;s <C>end_session_endpoint</C>, which ends the IdP session and notifies other apps via <b>front-channel</b> (hidden iframes) or <b>back-channel</b> (server-to-server logout token) logout.</li>
        </ul>
        <p>In practice, back-channel logout support among SaaS vendors is uneven. Assume global logout ends the IdP session and <i>may</i> end vendor sessions; rely on short vendor session lifetimes and SCIM deactivation for real revocation.</p>
      </>
    ),
    links: [SPEC.rpLogout, SPEC.bcLogout],
  },
  trace: {
    title: "Protocol trace",
    body: (
      <>
        <p>A record of every message exchanged during the last sign-in, captured by the vendor&apos;s server. Secrets are masked.</p>
        <p>The token request is a <b>back-channel</b> call — browser-invisible. In this demo it runs in-process (both parties live in one deployment, and Vercel preview protection can block self-calls), but it goes through the exact same code as the public <C>POST /api/idp/token</C> endpoint, which you can call with curl.</p>
      </>
    ),
  },
  "vendor-aircall": {
    title: "Integrating Aircall for real",
    body: (
      <>
        <ol>
          <li>Confirm your Aircall plan includes SSO (it has historically been limited to higher tiers).</li>
          <li>Entra ID → Enterprise applications → New application → search the gallery for <b>Aircall</b> → SSO method <b>SAML</b>.</li>
          <li>Copy Entra&apos;s <i>Login URL</i>, <i>Entra Identifier</i> and signing certificate into Aircall&apos;s SSO settings (Admin dashboard → Company → SSO/Integrations).</li>
          <li>Assign <C>App-Aircall-Users</C>. Test with one user; keep one Aircall owner on password login as <b>break-glass</b> until SSO is proven.</li>
          <li>Decide provisioning: SCIM if available for your IdP/plan; otherwise JIT plus a manual leaver checklist item.</li>
        </ol>
        <p className="muted">Data note: public documentation on Aircall&apos;s Entra-specific provisioning is limited; confirm with Aircall support.</p>
      </>
    ),
    links: [SPEC.aircall, SPEC.entraApps],
  },
  "vendor-lattice": {
    title: "Integrating Lattice for real",
    body: (
      <>
        <ol>
          <li>Decide the source of truth for people data. Lattice is usually fed by the <b>HRIS</b> (manager, department, start date), not the IdP.</li>
          <li>Entra ID → Enterprise applications → gallery → <b>Lattice</b> → SSO method <b>SAML</b>; exchange metadata with Lattice&apos;s SSO settings.</li>
          <li>Match users by <b>email</b> (Lattice&apos;s usual key) — make sure the HRIS email equals the Entra UPN/mail, or logins will fail for renamed users.</li>
          <li>Enforce SSO only after every active employee has signed in once successfully.</li>
        </ol>
        <p>Lattice roles (Admin, Manager, Employee) are typically managed in Lattice and in the HRIS reporting line — the <C>groups</C> mapping shown in this demo illustrates the pattern, not a guaranteed Lattice feature.</p>
      </>
    ),
    links: [SPEC.lattice, SPEC.entraApps],
  },
  "saml-flow": {
    title: "The same login in SAML 2.0",
    body: (
      <>
        <p>This is how Aircall and Lattice actually integrate with Entra ID. The trust model matches OIDC; the plumbing differs:</p>
        <ol>
          <li>The app builds an XML <C>AuthnRequest</C>, deflates and base64-encodes it, and redirects the browser to the IdP&apos;s SSO URL (<b>HTTP-Redirect binding</b>). <C>RelayState</C> plays the role of <C>state</C>.</li>
          <li>The IdP signs the user in (or reuses its session) and returns an HTML page that auto-POSTs a signed <C>&lt;samlp:Response&gt;</C> to the app&apos;s <b>Assertion Consumer Service</b> URL (<b>HTTP-POST binding</b>).</li>
          <li>The app verifies the XML signature against the certificate it <b>pinned from IdP metadata</b>, then checks Issuer, Audience, Recipient, <C>InResponseTo</C> and the time window.</li>
        </ol>
        <p><b>No back channel.</b> OIDC&apos;s identity arrives server-to-server; SAML&apos;s arrives through the browser. The XML signature is the only thing standing between the user and a forged assertion.</p>
        <p><b>Signature wrapping (XSW).</b> A verifier can check one element&apos;s signature and then read identity from a different, unsigned element. This demo reads values only from the bytes the signature covered, and rejects responses with more than one assertion. A 2012 study broke 11 of 14 SAML frameworks this way.</p>
        <p className="muted">Operational note: SAML signing certificates expire (Entra defaults to 3 years) and must be rolled over by hand in each vendor. OIDC&apos;s JWKS rotates automatically.</p>
      </>
    ),
    links: [SPEC.samlCore, SPEC.samlBindings, SPEC.xmldsig, SPEC.xsw, SPEC.entraSaml],
  },
  "refresh-tokens": {
    title: "Refresh tokens and rotation",
    body: (
      <>
        <p>Access tokens are short-lived on purpose (here 2 minutes; Entra ID defaults to 60–90). To keep working, the app trades a <b>refresh token</b> for a new set, server-to-server, without bothering the user.</p>
        <ul>
          <li><b>Requested with</b> the <C>offline_access</C> scope. Only the app&apos;s server holds it; it never reaches the browser.</li>
          <li><b>Rotation:</b> every refresh returns a new refresh token and invalidates the old one. All tokens descended from one sign-in form a <b>family</b>.</li>
          <li><b>Reuse detection:</b> if an already-rotated token is presented, either the app or a thief has a stale copy. The IdP cannot tell which, so it revokes the whole family and both are locked out (RFC 9700 §4.14.2).</li>
          <li>A refreshed ID token keeps the original <C>auth_time</C> and <C>sub</C>, and has no <C>nonce</C>.</li>
        </ul>
        <p className="muted">Demo shortcut: the IdP&apos;s grant store is a sealed cookie instead of a database, because Vercel functions share no memory.</p>
      </>
    ),
    links: [SPEC.refresh, SPEC.rotation],
  },
  revocation: {
    title: "What revocation does — and does not — do",
    body: (
      <>
        <p>When someone leaves or an account is compromised, an admin clicks <b>Revoke sessions</b> in Entra ID (<C>Revoke-MgUserSignInSession</C>). That kills the user&apos;s <b>refresh tokens</b> and <b>IdP session cookies</b>. It does <i>not</i> reach into each vendor:</p>
        <ul>
          <li>Already-issued <b>access tokens</b> stay valid until <C>exp</C>, because they are self-contained JWTs that APIs check offline.</li>
          <li>The vendor&apos;s own <b>session cookie</b> keeps working until the vendor next talks to the IdP, usually at its next refresh.</li>
          <li>SAML apps never talk to the IdP after sign-in, so their sessions last until they expire (often 8–24 hours) unless you deprovision via SCIM or the vendor supports logout.</li>
        </ul>
        <p>Mitigations: short access-token lifetimes, <b>Continuous Access Evaluation</b> (supported Microsoft services re-check revocation within minutes), SCIM deprovisioning (<C>active: false</C>) and the leaver checklist.</p>
        <p>Apps should also revoke their own refresh token at logout (RFC 7009) — the vendor&apos;s &quot;Log out&quot; button here does that.</p>
      </>
    ),
    links: [SPEC.entraRevoke, SPEC.cae, SPEC.revocation],
  },
} satisfies Record<string, HelpTopic>;

export type HelpKey = keyof typeof HELP;
