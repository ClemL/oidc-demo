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
  sub: string;
  role: string;
  roleSource: string | null;
  jit: boolean;
  silent: boolean;
  checks: { name: string; ok: boolean; detail: string }[];
  trace: TraceStep[];
};
