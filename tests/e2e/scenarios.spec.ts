import { expect, test } from "@playwright/test";
import { idpSignIn, nextSecond, oidcSignIn } from "./helpers";

// The six guided scenarios from the overview page.

test("1. first sign-in: interactive OIDC login maps alex to Aircall Admin", async ({ page }) => {
  await oidcSignIn(page, "aircall", "alex");
  await expect(page.getByText("Interactive · OpenID Connect")).toBeVisible();
  await expect(page.getByText("Admin access granted by the App-Aircall-Admins group.")).toBeVisible();
  await page.getByRole("tab", { name: "Validation checks" }).click();
  for (const check of ["Signature", "iss", "aud", "nonce", "at_hash", "PKCE"]) {
    await expect(page.getByRole("tabpanel").locator("li span.font-mono", { hasText: new RegExp(`^${check}$`) })).toBeVisible();
  }
});

test("2 & 3. single sign-on reuses the IdP session and maps alex to Lattice Manager", async ({ page }) => {
  await oidcSignIn(page, "aircall", "alex");
  await nextSecond(page);
  await oidcSignIn(page, "lattice"); // no password prompt
  await expect(page.getByText("Silent SSO · OpenID Connect")).toBeVisible();
  await expect(page.getByText("You have 1 direct report")).toBeVisible();
});

test("4. access denied: an unassigned user is authenticated but refused", async ({ page }) => {
  await oidcSignIn(page, "aircall", "jordan");
  await expect(page.getByText("Sign-in failed")).toBeVisible();
  await expect(page.getByText("access_denied", { exact: true })).toBeVisible();
  await expect(page.getByText("IdP session: Jordan")).toBeVisible();
});

test("5. provisioning page renders the SCIM simulator", async ({ page }) => {
  await page.goto("/provisioning");
  await expect(page.getByRole("heading", { name: "SCIM provisioning simulator" })).toBeVisible();
});

test("6. local logout keeps the IdP session; global sign-out ends it", async ({ page }) => {
  await oidcSignIn(page, "aircall", "alex");
  await page.getByRole("link", { name: "Log out of Aircall" }).click();
  await expect(page.getByText("You logged out of this app only.")).toBeVisible();
  await nextSecond(page);
  await oidcSignIn(page, "aircall"); // silent
  await expect(page.getByText("Silent SSO · OpenID Connect")).toBeVisible();

  await page.getByRole("link", { name: "Global sign-out" }).first().click();
  await expect(page.getByText("Global sign-out complete")).toBeVisible();
  await page.goto("/vendors/aircall");
  await page.getByRole("link", { name: "Continue with SSO", exact: true }).click();
  await expect(page).toHaveURL(/\/idp\/login/);
});

test("wrong password stays on the IdP with an error", async ({ page }) => {
  await page.goto("/vendors/aircall");
  await page.getByRole("link", { name: "Continue with SSO", exact: true }).click();
  await page.locator('input[name="username"]').fill("alex");
  await page.locator('input[name="password"]').fill("nope");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Incorrect username or password.")).toBeVisible();
  await idpSignIn(page, "alex");
  await expect(page.getByText("Admin access granted")).toBeVisible();
});

test("overview sections collapse and the film link reopens its section", async ({ page }) => {
  await page.goto("/");
  const arch = page.locator("details", { has: page.getByRole("heading", { name: "Architecture" }) });
  await expect(arch).toHaveAttribute("open", "");
  await arch.locator("summary").click();
  await expect(arch).not.toHaveAttribute("open", "");

  const film = page.locator("#film");
  await film.locator("summary h2").click();
  await expect(film).not.toHaveAttribute("open", "");
  await page.getByRole("link", { name: "▶ Watch the 3-minute story" }).click();
  await expect(film).toHaveAttribute("open", "");
});
