import { expect, test } from "@playwright/test";
import { oidcSignIn, samlSignIn } from "./helpers";

test("SAML sign-in verifies a signed assertion and maps roles", async ({ page }) => {
  await samlSignIn(page, "aircall", "alex");
  await expect(page.getByText("Interactive · SAML 2.0")).toBeVisible();
  await expect(page.getByText("Admin access granted by the App-Aircall-Admins group.")).toBeVisible();

  await page.getByRole("tab", { name: "Validation checks" }).click();
  for (const check of ["XML signature", "Wrapping defense", "Audience", "InResponseTo", "Recipient", "RelayState"]) {
    await expect(page.getByRole("tabpanel").locator("li span.font-mono", { hasText: new RegExp(`^${check}$`) })).toBeVisible();
  }
  await page.getByRole("tab", { name: "SAML Response" }).click();
  await expect(page.getByRole("tabpanel").getByText("ds:SignatureValue").first()).toBeVisible();
});

test("an IdP session from OIDC gives silent SSO over SAML", async ({ page }) => {
  await oidcSignIn(page, "aircall", "alex");
  await samlSignIn(page, "lattice");
  await expect(page.getByText("Silent SSO · SAML 2.0")).toBeVisible();
});

test("SAML denies an unassigned user with a RequestDenied status", async ({ page }) => {
  await samlSignIn(page, "aircall", "jordan");
  await expect(page.getByText("access_denied", { exact: true })).toBeVisible();
  await expect(page.getByText(/RequestDenied/)).toBeVisible();
});

test("a SAML Response altered in transit is rejected", async ({ page }) => {
  // Priya is an Aircall Agent; rewrite her groups to claim the admin group on the way to the ACS.
  await page.route("**/api/rp/aircall/saml/acs", async (route) => {
    const form = new URLSearchParams(route.request().postData() ?? "");
    const xml = Buffer.from(form.get("SAMLResponse") ?? "", "base64").toString("utf8");
    form.set("SAMLResponse", Buffer.from(xml.replace("App-Aircall-Users", "App-Aircall-Admins")).toString("base64"));
    await route.continue({ postData: form.toString() });
  });
  await samlSignIn(page, "aircall", "priya");
  await expect(page.getByText("invalid_signature", { exact: true })).toBeVisible();
});

test("the OIDC vs SAML page and IdP metadata are served", async ({ page, request }) => {
  await page.goto("/saml");
  await expect(page.getByRole("heading", { name: "OIDC vs SAML 2.0, side by side" })).toBeVisible();
  const meta = await request.get("/api/idp/saml/metadata");
  expect(meta.ok()).toBeTruthy();
  const xml = await meta.text();
  expect(xml).toContain("<ds:X509Certificate>");
  expect(xml).toContain("/api/idp/saml/sso");
});

test("the SSO endpoint refuses an unregistered ACS URL without redirecting", async ({ page }) => {
  await page.goto("/idp/error"); // establish origin
  const res = await page.request.get("/api/idp/saml/sso?SAMLRequest=not-valid", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toContain("/idp/error");
});
