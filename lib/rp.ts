import "server-only";
import { createLocalJWKSet, jwtVerify, type JWTPayload } from "jose";
import { atHash, jwks } from "./crypto";
import type { RpSession } from "./session";

export type Check = RpSession["checks"][number];

export type IdTokenResult =
  | { ok: true; claims: JWTPayload; checks: Check[] }
  | { ok: false; error: string; description: string; checks: Check[] };

/**
 * The vendor's ID token validation (OIDC Core §3.1.3.7), shared by the sign-in
 * callback and the refresh route. Omit `nonce` for refreshed ID tokens, which
 * carry none (OIDC Core §12.2).
 */
export async function validateIdToken(
  idToken: string,
  expect: { issuer: string; audience: string; nonce?: string; accessToken?: string },
): Promise<IdTokenResult> {
  const checks: Check[] = [];
  const fail = (error: string, description: string): IdTokenResult => ({ ok: false, error, description, checks });

  let claims: JWTPayload;
  try {
    const { payload, protectedHeader } = await jwtVerify(idToken, createLocalJWKSet(jwks()), {
      issuer: expect.issuer,
      audience: expect.audience,
      algorithms: ["ES256"],
      clockTolerance: 30,
    });
    claims = payload;
    checks.push({ name: "Signature", ok: true, detail: `ES256 signature valid against JWKS key kid=${protectedHeader.kid}` });
    checks.push({ name: "alg allow-list", ok: true, detail: `alg=${protectedHeader.alg} (alg=none and HS* rejected)` });
    checks.push({ name: "iss", ok: true, detail: `${payload.iss} equals the configured issuer` });
    checks.push({ name: "aud", ok: true, detail: `${payload.aud} equals this app's client_id` });
    checks.push({ name: "exp / iat", ok: true, detail: `expires ${new Date(payload.exp! * 1000).toISOString()} (30s clock skew allowed)` });
  } catch (e) {
    return fail("invalid_id_token", `ID token rejected: ${(e as Error).message}`);
  }

  if (expect.nonce !== undefined) {
    if (claims.nonce !== expect.nonce) return fail("nonce_mismatch", "nonce in ID token does not match — possible token replay.");
    checks.push({ name: "nonce", ok: true, detail: "matches the value stored in the transaction cookie (replay protection)" });
  }

  if (expect.accessToken !== undefined) {
    const ah = atHash(expect.accessToken);
    if (claims.at_hash !== ah) return fail("at_hash_mismatch", "at_hash does not bind the access token to this ID token.");
    checks.push({ name: "at_hash", ok: true, detail: `left-half SHA-256 of access_token = ${ah}` });
  }

  return { ok: true, claims, checks };
}
