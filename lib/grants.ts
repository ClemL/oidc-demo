import "server-only";
import { seal, unseal } from "./session";

/**
 * The IdP's refresh-token grant store.
 *
 * A real IdP keeps this in a database: one row per refresh-token *family*
 * (the chain of tokens produced by rotation), with the current generation
 * and a revoked flag. This demo is stateless on Vercel, so the store lives
 * in a sealed, IdP-owned cookie instead. Everything else about the logic —
 * rotation, reuse detection, admin revocation — is what a real IdP does.
 */
export const GRANTS_COOKIE = "idp_grants";
const TTL = 24 * 3600;
const MAX_FAMILIES = 12;

export type Family = {
  sub: string;
  cid: string;
  /** Generation of the only refresh token in this family that is still valid. */
  gen: number;
  created: number;
  revoked?: { at: number; reason: string };
};

export type GrantStore = {
  fams: Record<string, Family>;
  /** Per-user "revoke all sessions" timestamp (ms). IdP sessions older than this are dead. */
  revokedBefore: Record<string, number>;
};

export async function loadGrants(value: string | undefined): Promise<GrantStore> {
  const s = await unseal<GrantStore>(value);
  return { fams: s?.fams ?? {}, revokedBefore: s?.revokedBefore ?? {} };
}

export async function sealGrants(store: GrantStore) {
  // Keep the cookie small: drop the oldest families first.
  const ids = Object.keys(store.fams).sort((a, b) => store.fams[b].created - store.fams[a].created);
  const fams = Object.fromEntries(ids.slice(0, MAX_FAMILIES).map((id) => [id, store.fams[id]]));
  return seal({ fams, revokedBefore: store.revokedBefore }, TTL);
}

export const grantsCookieOpts = { maxAge: TTL };

export function revokeFamily(store: GrantStore, fid: string, reason: string) {
  const f = store.fams[fid];
  if (f && !f.revoked) f.revoked = { at: Date.now(), reason };
}

/** Entra's "Revoke sessions" (Revoke-MgUserSignInSession): kill every refresh token and IdP session for a user. */
export function revokeUser(store: GrantStore, sub: string) {
  const now = Date.now();
  store.revokedBefore[sub] = now;
  for (const [fid, f] of Object.entries(store.fams)) if (f.sub === sub) revokeFamily(store, fid, "admin revoked all sessions");
  return now;
}
