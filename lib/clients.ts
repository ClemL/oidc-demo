import "server-only";
import { createHash } from "node:crypto";
import { VENDORS, type VendorId } from "./vendors";

/**
 * Client registrations held by the IdP (in Entra ID: an "App registration" /
 * "Enterprise application"). The secret is derived from OIDC_KEY_SEED so the
 * IdP and the vendor side of this single app agree without shared storage.
 */
const SEED = process.env.OIDC_KEY_SEED ?? "oidc-demo-insecure-default-seed";

export function clientSecret(vendor: VendorId) {
  return createHash("sha256").update(`client-secret:${vendor}:${SEED}`).digest("base64url");
}

export function findClient(clientId: string) {
  return Object.values(VENDORS).find((v) => v.clientId === clientId);
}

/**
 * Exact-match redirect URI check. Real IdPs store a fixed list; this demo
 * allows the current deployment origin so Vercel preview URLs work.
 */
export function redirectUriFor(origin: string, vendor: VendorId) {
  return `${origin}/api/rp/${vendor}/callback`;
}
