import { expect, test } from "@playwright/test";
import { idpSignIn, oidcSignIn } from "./helpers";

test("refresh rotates the refresh token", async ({ page }) => {
  await oidcSignIn(page, "aircall", "alex");
  await expect(page.getByTestId("rt-gen")).toHaveText("Generation 1");
  await page.getByRole("button", { name: "Refresh now" }).click();
  await expect(page.getByTestId("token-banner")).toContainText("Refreshed");
  await expect(page.getByTestId("rt-gen")).toHaveText("Generation 2");
  await page.getByRole("tab", { name: "Protocol trace" }).click();
  await expect(page.getByText("Refresh #1: POST /token grant_type=refresh_token")).toBeVisible();
});

test("replaying a rotated refresh token revokes the family and locks the app out", async ({ page }) => {
  await oidcSignIn(page, "aircall", "alex");
  await page.getByRole("button", { name: "Refresh now" }).click();
  await page.getByRole("button", { name: "Attacker: replay the old refresh token" }).click();
  await expect(page.getByTestId("token-banner")).toContainText("revoked the whole family");
  await expect(page.getByText("Admin access granted")).toBeVisible(); // still signed in, for now

  await page.getByRole("button", { name: "Refresh now" }).click();
  await expect(page.getByText("session_ended", { exact: true })).toBeVisible();
  await expect(page.getByText(/reuse detected/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue with SSO", exact: true })).toBeVisible();
});

test("admin revocation ends the IdP session; the app notices at its next refresh", async ({ page }) => {
  await oidcSignIn(page, "aircall", "alex");
  await page.getByRole("button", { name: /IdP admin: revoke all sessions/ }).click();
  await expect(page.getByTestId("token-banner")).toContainText("revoked all sessions");
  await expect(page.getByText("Admin access granted")).toBeVisible();

  await page.getByRole("button", { name: "Refresh now" }).click();
  await expect(page.getByText("session_ended", { exact: true })).toBeVisible();
  await expect(page.getByText(/admin revoked all sessions/)).toBeVisible();

  // The IdP session is gone too, so signing in again prompts for a password.
  await page.getByRole("link", { name: "Continue with SSO", exact: true }).click();
  await idpSignIn(page, "alex");
  await expect(page.getByText("Interactive · OpenID Connect")).toBeVisible();
});

test("local logout revokes the app's refresh token", async ({ page }) => {
  await oidcSignIn(page, "aircall", "alex");
  const before = (await page.context().cookies()).find((c) => c.name === "idp_grants")?.value;
  await page.getByRole("link", { name: "Log out of Aircall" }).click();
  const after = (await page.context().cookies()).find((c) => c.name === "idp_grants")?.value;
  expect(after).toBeTruthy();
  expect(after).not.toBe(before);
});

test("discovery advertises refresh and revocation; the token endpoint rejects junk", async ({ request }) => {
  const disc = await (await request.get("/api/idp/.well-known/openid-configuration")).json();
  expect(disc.grant_types_supported).toContain("refresh_token");
  expect(disc.revocation_endpoint).toMatch(/\/api\/idp\/revoke$/);

  const bad = await request.post("/api/idp/token", {
    form: { grant_type: "refresh_token", refresh_token: "junk", client_id: "aircall-demo-client", client_secret: "wrong" },
  });
  expect(bad.status()).toBe(401);
});
