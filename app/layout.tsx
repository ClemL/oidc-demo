import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import { IDP_SESSION_COOKIE, unseal, type IdpSession } from "@/lib/session";
import { findUserBySub } from "@/lib/directory";

export const metadata: Metadata = {
  title: "SSO & OIDC Demo",
  description: "Interactive demo of OpenID Connect single sign-on and SCIM provisioning with simulated Aircall and Lattice integrations.",
};

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/vendors/aircall", label: "Aircall" },
  { href: "/vendors/lattice", label: "Lattice" },
  { href: "/provisioning", label: "SCIM provisioning" },
  { href: "/guide", label: "Integration guide" },
  { href: "/idp", label: "IdP internals" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const s = await unseal<IdpSession>(jar.get(IDP_SESSION_COOKIE)?.value);
  const user = s ? findUserBySub(s.sub) : undefined;

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 border-b border-line bg-panel/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm text-panel">ID</span>
              SSO Lab
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-md px-2.5 py-1.5 text-muted hover:bg-subtle hover:text-fg">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2 text-xs">
              {user ? (
                <>
                  <span className="pill" title="Session cookie on the IdP. Any app can reuse it for silent SSO.">
                    <span className="h-2 w-2 rounded-full bg-ok" /> IdP session: {user.givenName}
                    {s!.amr.includes("mfa") ? " · MFA" : ""}
                  </span>
                  <a href="/api/idp/logout" className="text-muted underline-offset-2 hover:underline">
                    Global sign-out
                  </a>
                </>
              ) : (
                <span className="pill">
                  <span className="h-2 w-2 rounded-full bg-muted" /> No IdP session
                </span>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-muted">
          Educational demo. Vendor apps are simulations and not affiliated with Aircall or Lattice. The IdP is a mock standing in
          for Microsoft Entra ID / Okta — do not reuse its key handling in production.
        </footer>
      </body>
    </html>
  );
}
