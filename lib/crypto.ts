import "server-only";
import { createECDH, createHash, createPrivateKey, type KeyObject } from "node:crypto";
import type { JWK } from "jose";

/**
 * Key material for the mock IdP.
 *
 * Serverless functions on Vercel do not share memory, so a randomly generated
 * key per instance would break signature verification. Instead, every key is
 * derived deterministically from OIDC_KEY_SEED. A real IdP keeps its private
 * key in an HSM / key vault and rotates it, publishing old + new keys in JWKS.
 */
const SEED = process.env.OIDC_KEY_SEED ?? "oidc-demo-insecure-default-seed";

export function derive(label: string): Buffer {
  return createHash("sha256").update(`${label}:${SEED}`).digest();
}

const b64u = (b: Buffer) => b.toString("base64url");

function buildSigningKey() {
  const d = derive("es256-signing-key");
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(d);
  const pub = ecdh.getPublicKey(); // 0x04 || X (32) || Y (32)
  const x = b64u(pub.subarray(1, 33));
  const y = b64u(pub.subarray(33, 65));

  // RFC 7638 JWK thumbprint as the key id.
  const kid = createHash("sha256")
    .update(JSON.stringify({ crv: "P-256", kty: "EC", x, y }))
    .digest("base64url")
    .slice(0, 16);

  const privateKey: KeyObject = createPrivateKey({
    key: { kty: "EC", crv: "P-256", x, y, d: b64u(d) },
    format: "jwk",
  });
  const publicJwk: JWK = { kty: "EC", crv: "P-256", x, y, kid, use: "sig", alg: "ES256" };
  return { privateKey, publicJwk, kid };
}

export const signingKey = buildSigningKey();

/** Symmetric key for cookies (HS256) — IdP session, vendor sessions, transactions. */
export const cookieKey = new Uint8Array(derive("cookie-hmac"));

/** Symmetric key for encrypting authorization codes (dir + A256GCM). */
export const codeKey = new Uint8Array(derive("auth-code-enc"));

export function jwks() {
  return { keys: [signingKey.publicJwk] };
}

/** OIDC Core §3.1.3.6: at_hash = base64url(left half of SHA-256(access_token)). */
export function atHash(accessToken: string): string {
  const h = createHash("sha256").update(accessToken).digest();
  return b64u(h.subarray(0, h.length / 2));
}

/** RFC 7636 S256 code challenge. */
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function randomToken(bytes = 32): string {
  return b64u(Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))));
}
