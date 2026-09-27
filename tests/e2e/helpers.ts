import { expect, type Page } from "@playwright/test";

/** Complete the IdP sign-in form (every demo password is "demo"). */
export async function idpSignIn(page: Page, username: string) {
  await expect(page).toHaveURL(/\/idp\/login/);
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill("demo");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

/**
 * auth_time (OIDC) and AuthnInstant (SAML) have one-second resolution, and the app
 * calls a sign-in silent when auth_time is in an earlier second than the sign-in's
 * start. Wait a second after an interactive login before one expected to be silent;
 * a fast runner can otherwise start both within the same second.
 */
export async function nextSecond(page: Page) {
  await page.waitForTimeout(1_000);
}

export async function oidcSignIn(page: Page, vendor: "aircall" | "lattice", username?: string) {
  await page.goto(`/vendors/${vendor}`);
  await page.getByRole("link", { name: "Continue with SSO", exact: true }).click();
  if (username) await idpSignIn(page, username);
  await page.waitForURL(new RegExp(`/vendors/${vendor}`));
}

export async function samlSignIn(page: Page, vendor: "aircall" | "lattice", username?: string) {
  await page.goto(`/vendors/${vendor}`);
  await page.getByRole("link", { name: "Continue with SSO (SAML 2.0)" }).click();
  if (username) await idpSignIn(page, username);
  await page.waitForURL(new RegExp(`/vendors/${vendor}`));
}
