# SSO Lab — OIDC single sign-on demo

An interactive Next.js app that demonstrates how OpenID Connect (OIDC) single sign-on and SCIM provisioning connect a corporate identity provider to SaaS vendors such as **Aircall** and **Lattice**. Every section has a **?** button that opens an explainer panel.

## What is inside

| Area | Path | What it shows |
|---|---|---|
| Overview | `/` | 3-minute animated explainer film, architecture, guided scenarios, demo directory |
| Vendor apps | `/vendors/aircall`, `/vendors/lattice` | Real authorization code flow + PKCE, protocol trace, ID token decoder, validation checks, `/userinfo` call, group → role mapping; **SAML 2.0 sign-in**; **refresh, reuse detection and revocation** panel |
| OIDC vs SAML | `/saml` | Concept-by-concept mapping, a live signed SAML Response next to the equivalent ID token, IdP metadata and certificate |
| Mock IdP | `/api/idp/*`, `/idp/login` | Discovery, JWKS, authorize, token (code + refresh), revoke, userinfo, logout, SAML SSO + metadata; login + simulated MFA; app assignment enforcement |
| SCIM simulator | `/provisioning` | Joiner / mover / leaver cycles and the exact SCIM 2.0 requests |
| Integration guide | `/guide` | Rollout plan for Microsoft Entra ID, OIDC vs SAML, ASP.NET Core sample |
| IdP internals | `/idp` | Discovery document, JWKS, PowerShell examples |

Demo users: `alex`, `priya`, `jordan`, `sam` — password `demo`.

## The explainer film

A ~3½-minute, hand-drawn collage animation with subtitles (no audio) is embedded at the top of the overview page and also runs standalone at `/film/index.html` (`?t=90` starts at 1:30).

- Pure JavaScript + Canvas 2D, no libraries: `public/film/` — `core.js` (sketchy "boiling" strokes, torn-paper cutouts, textures, ransom-note type), `actors.js` (cast and props), `scenes.js` (choreography), `script.js` (subtitles and chapters), `film.js` (player: controls, chapters, captions, keyboard, fullscreen, end-card links).
- Every frame is a pure function of time, so scrubbing and chapter jumps are exact.
- Keyboard: Space/K play-pause, ←/→ ±5 s, C captions, F fullscreen. Honors `prefers-reduced-motion` (no line boil or jitter).
- Fonts: Caveat, Permanent Marker and Special Elite from Google Fonts, with system fallbacks.

## Scenarios to try

1. Sign in to Aircall as `alex` → interactive login, role **Admin**.
2. Open Lattice → **silent SSO** (no password prompt), role **Manager**.
3. Global sign-out, then sign in to Aircall as `jordan` → IdP returns `access_denied` (not assigned).
4. `/provisioning` → run a cycle, terminate a user, run again → `PATCH active:false`.
5. Aircall → **Continue with SSO (SAML 2.0)** → signed XML assertion, verified against the pinned certificate; compare tabs with the OIDC sign-in.
6. Sign in with OIDC → **Refresh now** (rotation) → **replay the old refresh token** (the IdP revokes the family) → **Refresh now** (the app loses its session).
7. Sign in with OIDC → **IdP admin: revoke all sessions** → the app stays signed in until its next refresh; the IdP asks for a password again.

## SAML 2.0

- SP-initiated Web Browser SSO: AuthnRequest over HTTP-Redirect, signed Response over HTTP-POST to `/api/rp/{vendor}/saml/acs`. IdP metadata: `/api/idp/saml/metadata`.
- The assertion is signed with the same P-256 key as the JWKS (`ecdsa-sha256`, exclusive C14N) via `xml-crypto`. Entra ID signs with RSA-SHA256 by default; ECDSA keeps a single deterministic key for the stateless demo.
- The certificate is built in `lib/x509.ts` and issued by an Ed25519 demo CA, so every serverless instance derives the same certificate and thumbprint from `OIDC_KEY_SEED`.
- The SP pins the certificate (ignores `KeyInfo`), allows only one signature algorithm, and reads identity only from the bytes the signature covered, with exactly one assertion permitted (signature-wrapping defense).

## Refresh tokens and revocation

- Vendors request `offline_access`; access tokens live **2 minutes** so expiry is visible. Refresh tokens rotate on every use; presenting an already-rotated token revokes the whole family (RFC 9700 §4.14.2).
- "IdP admin: revoke all sessions" mirrors Entra's `Revoke-MgUserSignInSession`: refresh tokens and the IdP session die, but existing access tokens and the vendor's session survive until the next refresh.
- Local logout revokes the app's refresh token (RFC 7009, `/api/idp/revoke`).

## Tests and CI

```powershell
npm run build
npx playwright install chromium   # once
npm run test:e2e                  # starts `next start` on port 3100
```

`.github/workflows/ci.yml` runs build, typecheck (`npm run lint`) and the Playwright suite on every pull request. The suite covers the guided scenarios, SAML sign-in and tamper rejection, refresh rotation, reuse detection and admin revocation.

## Run locally

```powershell
npm install
npm run dev   # http://localhost:3000
```

## Deploy to Vercel

1. Import this repository in Vercel (framework preset: Next.js; no build settings to change).
2. Add an environment variable `OIDC_KEY_SEED` with a long random value, for example:
   ```powershell
   [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
   ```
3. Deploy. The app derives its issuer from the request host, so preview and production URLs both work.

## Design notes and limitations

- **Stateless by design.** Vercel functions share no memory, so the ES256 signing key, client secrets and cookie keys are derived from `OIDC_KEY_SEED`, and authorization codes are encrypted self-contained blobs (60-second lifetime). A real IdP stores codes server-side and enforces single use, and keeps keys in an HSM / key vault.
- **Grant store in a cookie.** Refresh-token families and "revoke sessions" timestamps live in a sealed, IdP-owned cookie (`idp_grants`) instead of a database. The rotation, reuse-detection and revocation logic is the same as a real IdP's; the storage is not.
- **Back channel in-process.** The vendor's token request calls the same function as `POST /api/idp/token` rather than making an HTTP self-call, which Vercel Deployment Protection would block on preview URLs.
- **Aircall and Lattice use SAML 2.0** for enterprise SSO in practice. The demo uses OIDC because the trust model is identical and JWTs are easier to inspect. See the "Reality check" panel.
- Vendor apps are simulations and are not affiliated with Aircall or Lattice.

## References

- OpenID Connect Core 1.0 — https://openid.net/specs/openid-connect-core-1_0.html
- RFC 7636 (PKCE) — https://datatracker.ietf.org/doc/html/rfc7636
- RFC 7009 (Token Revocation) — https://datatracker.ietf.org/doc/html/rfc7009
- OASIS SAML 2.0 Core and Bindings — https://docs.oasis-open.org/security/saml/v2.0/
- RFC 9700 (OAuth 2.0 Security BCP) — https://datatracker.ietf.org/doc/html/rfc9700
- RFC 7643 / 7644 (SCIM 2.0) — https://datatracker.ietf.org/doc/html/rfc7644
- Microsoft Entra app provisioning — https://learn.microsoft.com/entra/identity/app-provisioning/user-provisioning
