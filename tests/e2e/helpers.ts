import { expect, type Page } from "@playwright/test";

/** Complete the IdP sign-in form (every demo password is "demo"). */
export async function idpSignIn(page: Page, username: string) {
  await expect(page).toHaveURL(/\/idp\/login/);
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill("demo");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
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
