import "server-only";
import { EncryptJWT, SignJWT, jwtDecrypt, jwtVerify, createLocalJWKSet } from "jose";
import { atHash, codeKey, jwks, pkceChallenge, randomToken, signingKey } from "./crypto";
import { clientSecret, findClient, redirectUriFor } from "./clients";
import { findUserBySub, type DirectoryUser } from "./directory";
import { revokeFamily, type GrantStore } from "./grants";
import type { Vendor } from "./vendors";

export const SUPPORTED_SCOPES = ["openid", "profile", "email", "groups", "offline_access"];

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
    revocation_endpoint: `${issuer}/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["ES256"],
    scopes_supported: SUPPORTED_SCOPES,
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    revocation_endpoint_auth_methods_supported: ["client_secret_post"],
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
  const registered = redirectUriFor(origin, client.id);
  if (req.redirect_uri !== registered) {
    return {
      ok: false,
      redirect: false,
      error: "invalid_request",
      description: `redirect_uri is not registered for this client. Expected ${registered}`,
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
    k: "code",
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

export const ACCESS_TOKEN_TTL = 120; // seconds — short on purpose so expiry and refresh are visible
export const REFRESH_TOKEN_TTL = 24 * 3600;

export type TokenBody = {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
};

export type TokenResult =
  | { ok: true; body: TokenBody; family?: { fid: string; gen: number } }
  | { ok: false; status: number; body: { error: string; error_description: string } };

/** Sign an ID token. */
export async function signIdToken(
  claims: Record<string, unknown>,
  opts: { issuer: string; sub: string; aud: string; iat?: number; ttl?: number },
) {
  const iat = opts.iat ?? Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256", kid: signingKey.kid, typ: "JWT" })
    .setIssuer(opts.issuer)
    .setSubject(opts.sub)
    .setAudience(opts.aud)
    .setIssuedAt(iat)
    .setExpirationTime(iat + (opts.ttl ?? 3600))
    .sign(signingKey.privateKey);
}

/**
 * The token endpoint logic, shared by the HTTP route and the in-process RP routes.
 * `grants` is the IdP's refresh-token store; the caller persists it afterwards.
 */
export async function tokenRequest(
  form: URLSearchParams,
  issuer: string,
  grants: GrantStore,
): Promise<TokenResult> {
  const bad = (error: string, error_description: string, status = 400): TokenResult => ({
    ok: false,
    status,
    body: { error, error_description },
  });

  const grantType = form.get("grant_type");
  if (grantType !== "authorization_code" && grantType !== "refresh_token")
    return bad("unsupported_grant_type", "Supported grant types: authorization_code, refresh_token.");
  const client = findClient(form.get("client_id") ?? "");
  if (!client || form.get("client_secret") !== clientSecret(client.id))
    return bad("invalid_client", "Client authentication failed.", 401);

  if (grantType === "refresh_token") return refresh(form, issuer, grants, client, bad);

  let c: Record<string, unknown>;
  try {
    ({ payload: c } = await jwtDecrypt(form.get("code") ?? "", codeKey));
  } catch {
    return bad("invalid_grant", "Authorization code is invalid or expired (codes live 60 seconds).");
  }
  if (c.k !== "code") return bad("invalid_grant", "That is not an authorization code.");
  if (c.cid !== client.clientId) return bad("invalid_grant", "Code was issued to a different client.");
  if (c.ru !== form.get("redirect_uri")) return bad("invalid_grant", "redirect_uri does not match the authorization request.");
  if (pkceChallenge(form.get("code_verifier") ?? "") !== c.cc)
    return bad("invalid_grant", "PKCE verification failed: SHA-256(code_verifier) ≠ code_challenge.");

  const user = findUserBySub(String(c.sub));
  if (!user) return bad("invalid_grant", "User no longer exists.");
  const scopes = String(c.sc).split(" ");

  let family: { fid: string; gen: number } | undefined;
  if (scopes.includes("offline_access")) {
    family = { fid: randomToken(9), gen: 1 };
    grants.fams[family.fid] = { sub: user.sub, cid: client.clientId, gen: 1, created: Date.now() };
  }
  const body = await issueTokens({
    issuer, user, client, scopes, family,
    idClaims: { nonce: c.n, auth_time: c.at, amr: c.amr },
    rt: { at: Number(c.at), amr: c.amr as string[] },
  });
  return { ok: true, body, family };
}

async function refresh(
  form: URLSearchParams,
  issuer: string,
  grants: GrantStore,
  client: Vendor,
  bad: (e: string, d: string, s?: number) => TokenResult,
): Promise<TokenResult> {
  let r: Record<string, unknown>;
  try {
    ({ payload: r } = await jwtDecrypt(form.get("refresh_token") ?? "", codeKey));
  } catch {
    return bad("invalid_grant", "Refresh token is invalid or expired.");
  }
  if (r.k !== "rt") return bad("invalid_grant", "That is not a refresh token.");
  if (r.cid !== client.clientId) return bad("invalid_grant", "Refresh token was issued to a different client.");
  const fid = String(r.fid);
  const fam = grants.fams[fid];
  if (!fam) return bad("invalid_grant", "Unknown refresh token family (the IdP has no record of this grant).");
  if (fam.revoked) return bad("invalid_grant", `Refresh token revoked: ${fam.revoked.reason}.`);
  if (Number(r.gen) !== fam.gen) {
    // RFC 9700 §4.14.2: an old, already-rotated token came back. Either the client or an attacker
    // holds a stolen copy; the IdP cannot tell which, so it kills the whole family.
    revokeFamily(grants, fid, `reuse detected (generation ${r.gen} presented, current is ${fam.gen})`);
    return bad("invalid_grant", `Refresh token reuse detected: generation ${r.gen} was already rotated. The whole token family is now revoked.`);
  }
  const user = findUserBySub(String(r.sub));
  if (!user) return bad("invalid_grant", "User no longer exists.");
  if (!isAssigned(user, client)) {
    revokeFamily(grants, fid, "user no longer assigned to the app");
    return bad("invalid_grant", `${user.email} is no longer assigned to ${client.name}.`);
  }

  fam.gen += 1;
  const family = { fid, gen: fam.gen };
  const scopes = String(r.sc).split(" ");
  const body = await issueTokens({
    issuer, user, client, scopes, family,
    // OIDC Core §12.2: a refreshed ID token keeps the original auth_time and carries no nonce.
    idClaims: { auth_time: r.at, amr: r.amr },
    rt: { at: Number(r.at), amr: r.amr as string[] },
  });
  return { ok: true, body, family };
}

async function issueTokens(a: {
  issuer: string;
  user: DirectoryUser;
  client: Vendor;
  scopes: string[];
  family?: { fid: string; gen: number };
  idClaims: Record<string, unknown>;
  rt: { at: number; amr: string[] };
}): Promise<TokenBody> {
  const { issuer, user, client, scopes } = a;
  const accessToken = await new SignJWT({
    scope: scopes.join(" "),
    client_id: client.clientId,
  })
    .setProtectedHeader({ alg: "ES256", kid: signingKey.kid, typ: "at+jwt" })
    .setIssuer(issuer)
    .setSubject(user.sub)
    .setAudience(`${issuer}/userinfo`)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .setJti(randomToken(8))
    .sign(signingKey.privateKey);

  const idToken = await signIdToken(
    { ...a.idClaims, at_hash: atHash(accessToken), ...profileClaims(user, scopes) },
    { issuer, sub: user.sub, aud: client.clientId },
  );

  const body: TokenBody = {
    access_token: accessToken,
    id_token: idToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL,
    scope: scopes.join(" "),
  };
  if (a.family) {
    body.refresh_token = await new EncryptJWT({
      k: "rt",
      sub: user.sub,
      cid: client.clientId,
      sc: scopes.join(" "),
      fid: a.family.fid,
      gen: a.family.gen,
      at: a.rt.at,
      amr: a.rt.amr,
    })
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
      .setIssuedAt()
      .setExpirationTime(`${REFRESH_TOKEN_TTL}s`)
      .encrypt(codeKey);
  }
  return body;
}

/** RFC 7009 token revocation (refresh tokens only; access tokens are self-contained JWTs). */
export async function revokeToken(form: URLSearchParams, grants: GrantStore) {
  const client = findClient(form.get("client_id") ?? "");
  if (!client || form.get("client_secret") !== clientSecret(client.id)) return { ok: false as const, status: 401 };
  try {
    const { payload } = await jwtDecrypt(form.get("token") ?? "", codeKey);
    if (payload.k === "rt" && payload.cid === client.clientId) revokeFamily(grants, String(payload.fid), "revoked by the app at logout");
  } catch {
    // RFC 7009 §2.2: invalid tokens still get 200.
  }
  return { ok: true as const, status: 200 };
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
