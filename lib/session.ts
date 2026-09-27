import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookieKey } from "./crypto";
import type { VendorId } from "./vendors";

export const IDP_SESSION_COOKIE = "idp_session";
export const txnCookie = (v: VendorId) => `rp_txn_${v}`;
export const sessionCookie = (v: VendorId) => `rp_session_${v}`;
export const seenCookie = (v: VendorId) => `rp_seen_${v}`;
/** Raw tokens kept in their own cookie: browsers drop any single cookie over ~4 KB. */
export const tokensCookie = (v: VendorId) => `rp_tokens_${v}`;

export async function seal(payload: JWTPayload, ttlSeconds: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(cookieKey);
}

export async function unseal<T>(token: string | undefined): Promise<(T & JWTPayload) | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, cookieKey, { algorithms: ["HS256"] });
    return payload as T & JWTPayload;
  } catch {
    return null;
  }
}

export const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

/** Resolve the public origin, respecting Vercel's forwarded headers. */
export function originFrom(headers: Headers, fallback?: string) {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto = headers.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  if (host) return `${proto.split(",")[0]}://${host.split(",")[0]}`;
  return fallback ?? "http://localhost:3000";
}

export const issuerFor = (origin: string) => `${origin}/api/idp`;

export type IdpSession = { sub: string; authTime: number; amr: string[] };

export type TraceStep = { t: number; label: string; detail?: string };

export type RpSession = {
  protocol: "oidc" | "saml";
  sub: string;
  role: string;
  roleSource: string | null;
  jit: boolean;
  silent: boolean;
  checks: { name: string; ok: boolean; detail: string }[];
  trace: TraceStep[];
  /** OIDC only: the refresh-token family this session holds. */
  family?: { fid: string; gen: number };
};

/**
 * What the vendor keeps next to its session. OIDC: the raw tokens (plus the
 * previous refresh token, kept only so the demo can replay it). SAML: the
 * signed Response, deflated. Stored in its own cookie because browsers drop
 * any single cookie over ~4 KB.
 */
export type OidcTokens = { idToken: string; accessToken: string; refreshToken?: string; prevRefreshToken?: string };

export function packTokens(t: OidcTokens) {
  return ["oidc", t.idToken, t.accessToken, t.refreshToken ?? "-", t.prevRefreshToken ?? "-"].join(" ");
}

export function unpackTokens(v: string | undefined): OidcTokens | { saml: string } | null {
  const parts = (v ?? "").split(" ");
  if (parts[0] === "saml" && parts[1]) return { saml: parts[1] };
  if (parts[0] !== "oidc" || !parts[1] || !parts[2]) return null;
  const opt = (x?: string) => (x && x !== "-" ? x : undefined);
  return { idToken: parts[1], accessToken: parts[2], refreshToken: opt(parts[3]), prevRefreshToken: opt(parts[4]) };
}
