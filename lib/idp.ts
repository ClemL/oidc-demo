import "server-only";
import { EncryptJWT, SignJWT, jwtDecrypt, jwtVerify, createLocalJWKSet } from "jose";
import { atHash, codeKey, jwks, pkceChallenge, randomToken, signingKey } from "./crypto";
import { clientSecret, findClient, redirectUriFor } from "./clients";
import { findUserBySub, type DirectoryUser } from "./directory";
import type { Vendor } from "./vendors";

export const SUPPORTED_SCOPES = ["openid", "profile", "email", "groups"];

export type AuthRequest = {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope: string;
  state: string;
  nonce: string;
  code_challenge: string;
  code_challenge_method: string;
  prompt?: string;
};

export function discovery(issuer: string) {
  return {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    userinfo_endpoint: `${issuer}/userinfo`,
    jwks_uri: `${issuer}/jwks`,
    end_session_endpoint: `${issuer}/logout`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["ES256"],
    scopes_supported: SUPPORTED_SCOPES,
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["S256"],
    claims_supported: [
      "sub", "iss", "aud", "exp", "iat", "auth_time", "nonce", "amr", "at_hash",
      "name", "given_name", "family_name", "preferred_username", "email", "email_verified",
      "groups", "department", "job_title", "employee_id",
    ],
  };
}

export type ValidatedRequest =
  | { ok: true; req: AuthRequest; client: Vendor }
  | { ok: false; redirect: boolean; error: string; description: string; req?: AuthRequest };

/** Validates an /authorize request. Errors before redirect_uri is trusted must NOT redirect. */
export function validateAuthRequest(params: URLSearchParams, origin: string): ValidatedRequest {
  const req = Object.fromEntries(params.entries()) as unknown as AuthRequest;
  const client = findClient(req.client_id ?? "");
  if (!client) return { ok: false, redirect: false, error: "invalid_client", description: "Unknown client_id." };
  if (req.redirect_uri !== redirectUriFor(origin, client.id)) {
    return {
      ok: false,
      redirect: false,
      error: "invalid_request",
      description: `redirect_uri is not registered for this client. Expected ${redirectUriFor(origin, client.id)}`,
    };
  }
  const fail = (error: string, description: string): ValidatedRequest => ({ ok: false, redirect: true, error, description, req });
  if (req.response_type !== "code") return fail("unsupported_response_type", "Only response_type=code is supported.");
  if (!req.scope?.split(" ").includes("openid")) return fail("invalid_scope", "The openid scope is required.");
  if (!req.state) return fail("invalid_request", "state is required by this IdP.");
  if (!req.nonce) return fail("invalid_request", "nonce is required by this IdP.");
  if (!req.code_challenge || req.code_challenge_method !== "S256")
    return fail("invalid_request", "PKCE with code_challenge_method=S256 is required.");
  return { ok: true, req, client };
}

export function isAssigned(user: DirectoryUser, client: Vendor) {
  return user.groups.some((g) => client.assignedGroups.includes(g));
}

export function errorRedirect(req: AuthRequest, error: string, description: string) {
  const url = new URL(req.redirect_uri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (req.state) url.searchParams.set("state", req.state);
  return url.toString();
}

/**
 * Issue an authorization code. Real IdPs store codes server-side and enforce
 * single use; here the code is an encrypted, 60-second, self-contained blob so
 * the demo works on stateless serverless functions.
 */
export async function issueCode(req: AuthRequest, issuer: string, sub: string, authTime: number, amr: string[]) {
  const code = await new EncryptJWT({
    sub,
    cid: req.client_id,
    ru: req.redirect_uri,
    sc: req.scope,
    n: req.nonce,
    cc: req.code_challenge,
    at: authTime,
    amr,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("60s")
    .setJti(randomToken(8))
    .encrypt(codeKey);
  const url = new URL(req.redirect_uri);
  url.searchParams.set("code", code);
  url.searchParams.set("state", req.state);
  url.searchParams.set("iss", issuer); // RFC 9207 mix-up defense
  return { code, redirect: url.toString() };
}

export type TokenResult =
  | { ok: true; body: { access_token: string; id_token: string; token_type: "Bearer"; expires_in: number; scope: string } }
  | { ok: false; status: number; body: { error: string; error_description: string } };

/** The token endpoint logic, shared by the HTTP route and the in-process RP callback. */
export async function exchangeCode(form: URLSearchParams, issuer: string): Promise<TokenResult> {
  const bad = (error: string, error_description: string, status = 400): TokenResult => ({
    ok: false,
    status,
    body: { error, error_description },
  });

  if (form.get("grant_type") !== "authorization_code") return bad("unsupported_grant_type", "Only authorization_code is supported.");
  const client = findClient(form.get("client_id") ?? "");
  if (!client || form.get("client_secret") !== clientSecret(client.id))
    return bad("invalid_client", "Client authentication failed.", 401);

  let c: Record<string, unknown>;
  try {
    ({ payload: c } = await jwtDecrypt(form.get("code") ?? "", codeKey));
  } catch {
    return bad("invalid_grant", "Authorization code is invalid or expired (codes live 60 seconds).");
  }
  if (c.cid !== client.clientId) return bad("invalid_grant", "Code was issued to a different client.");
  if (c.ru !== form.get("redirect_uri")) return bad("invalid_grant", "redirect_uri does not match the authorization request.");
  if (pkceChallenge(form.get("code_verifier") ?? "") !== c.cc)
    return bad("invalid_grant", "PKCE verification failed: SHA-256(code_verifier) ≠ code_challenge.");

  const user = findUserBySub(String(c.sub));
  if (!user) return bad("invalid_grant", "User no longer exists.");
  const scopes = String(c.sc).split(" ");

  const accessToken = await new SignJWT({
    scope: scopes.join(" "),
    client_id: client.clientId,
  })
    .setProtectedHeader({ alg: "ES256", kid: signingKey.kid, typ: "at+jwt" })
    .setIssuer(issuer)
    .setSubject(user.sub)
    .setAudience(`${issuer}/userinfo`)
    .setIssuedAt()
    .setExpirationTime("1h")
    .setJti(randomToken(8))
    .sign(signingKey.privateKey);

  const claims: Record<string, unknown> = {
    nonce: c.n,
    auth_time: c.at,
    amr: c.amr,
    at_hash: atHash(accessToken),
    ...profileClaims(user, scopes),
  };

  const idToken = await new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256", kid: signingKey.kid, typ: "JWT" })
    .setIssuer(issuer)
    .setSubject(user.sub)
    .setAudience(client.clientId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(signingKey.privateKey);

  return {
    ok: true,
    body: { access_token: accessToken, id_token: idToken, token_type: "Bearer", expires_in: 3600, scope: scopes.join(" ") },
  };
}

export function profileClaims(user: DirectoryUser, scopes: string[]) {
  const out: Record<string, unknown> = {};
  if (scopes.includes("profile")) {
    Object.assign(out, {
      name: `${user.givenName} ${user.familyName}`,
      given_name: user.givenName,
      family_name: user.familyName,
      preferred_username: user.email,
      job_title: user.title,
      department: user.department,
      employee_id: user.employeeId,
    });
  }
  if (scopes.includes("email")) Object.assign(out, { email: user.email, email_verified: true });
  if (scopes.includes("groups")) out.groups = user.groups;
  return out;
}

export async function verifyAccessToken(token: string, issuer: string) {
  const { payload } = await jwtVerify(token, createLocalJWKSet(jwks()), {
    issuer,
    audience: `${issuer}/userinfo`,
    typ: "at+jwt",
  });
  return payload;
}
