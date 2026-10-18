import type { Metadata } from "next";
import Link from "next/link";
import { OidcInfographic } from "@/components/OidcInfographic";

export const metadata: Metadata = {
  title: "How OpenID Connect works · SSO Lab",
  description: "Infographic: the parties, the six-step sign-in, the ID token, the three tokens and the key OIDC concepts.",
};

export default function HowOidcWorks() {
  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">Infographic</p>
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">How OpenID Connect works</h1>
        <p className="mt-3 text-muted">
          One page covering the whole protocol: who the parties are, what travels where during a sign-in, what is inside an
          ID token, and the concepts you meet when integrating an app with Entra ID. Every <span className="help-btn mx-0.5 align-middle">?</span>{" "}
          opens a deeper explanation.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/vendors/aircall" className="btn btn-primary">See it run: sign in to Aircall →</Link>
          <Link href="/saml" className="btn btn-ghost">Compare with SAML</Link>
        </div>
      </div>
      <OidcInfographic />
    </div>
  );
}
