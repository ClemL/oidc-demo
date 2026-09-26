# SSO Lab — OIDC single sign-on demo

An interactive Next.js app that demonstrates how OpenID Connect (OIDC) single sign-on and SCIM provisioning connect a corporate identity provider to SaaS vendors such as **Aircall** and **Lattice**. Every section has a **?** button that opens an explainer panel.

## What is inside

| Area | Path | What it shows |
|---|---|---|
| Overview | `/` | 3-minute animated explainer film, architecture, guided scenarios, demo directory |
| Vendor apps | `/vendors/aircall`, `/vendors/lattice` | Real authorization code flow + PKCE, protocol trace, ID token decoder, validation checks, `/userinfo` call, group → role mapping |
| Mock IdP | `/api/idp/*`, `/idp/login` | Discovery, JWKS, authorize, token, userinfo, logout; login + simulated MFA; app assignment enforcement |
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
- **Back channel in-process.** The vendor's token request calls the same function as `POST /api/idp/token` rather than making an HTTP self-call, which Vercel Deployment Protection would block on preview URLs.
- **Aircall and Lattice use SAML 2.0** for enterprise SSO in practice. The demo uses OIDC because the trust model is identical and JWTs are easier to inspect. See the "Reality check" panel.
- Vendor apps are simulations and are not affiliated with Aircall or Lattice.

## References

- OpenID Connect Core 1.0 — https://openid.net/specs/openid-connect-core-1_0.html
- RFC 7636 (PKCE) — https://datatracker.ietf.org/doc/html/rfc7636
- RFC 9700 (OAuth 2.0 Security BCP) — https://datatracker.ietf.org/doc/html/rfc9700
- RFC 7643 / 7644 (SCIM 2.0) — https://datatracker.ietf.org/doc/html/rfc7644
- Microsoft Entra app provisioning — https://learn.microsoft.com/entra/identity/app-provisioning/user-provisioning
