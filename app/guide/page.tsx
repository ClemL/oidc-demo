import { Help, HelpHeading } from "@/components/Help";

const STEPS = [
  { phase: "1. Inventory", items: ["List every SaaS app, its owner, seat count and plan tier.", "Record which support SAML, OIDC, SCIM — and on which plan (SSO is often an upsell).", "Pick the people-data source of truth: HRIS → Entra ID → apps."] },
  { phase: "2. IdP groundwork", items: ["Create app-scoped groups: App-Aircall-Users, App-Aircall-Admins, App-Lattice-Users…", "Confirm Entra ID P1 (included in M365 Business Premium / E3 / E5) for group-based assignment and Conditional Access.", "Enforce MFA for all users via Conditional Access before federating anything."] },
  { phase: "3. Configure SSO per app", items: ["Enterprise applications → New application → gallery → Aircall / Lattice.", "Single sign-on → SAML (or OIDC if the vendor offers it) → exchange metadata / certificate.", "Properties → Assignment required = Yes → assign the app groups."] },
  { phase: "4. Provisioning", items: ["Where SCIM exists: Provisioning → Automatic → Tenant URL + secret token from the vendor.", "Review attribute mappings; scope to assigned users and groups; use Provision on demand for one test user.", "Where it does not: JIT + a leaver checklist item owned by IT."] },
  { phase: "5. Pilot & enforce", items: ["Pilot with IT + one team for a week.", "Keep one break-glass admin per vendor on password + MFA, stored in the password vault.", "Turn on \"SSO required\" in each vendor only after every active user has signed in once."] },
  { phase: "6. Operate", items: ["Calendar reminder for SAML certificate expiry (Entra emails notifications 60/30/7 days prior by default to the configured address).", "Quarterly access review of app groups (Entra ID Governance, or a manual export).", "Monitor Entra sign-in and provisioning logs for failures."] },
];

const MATRIX = [
  ["Token format", "Signed JSON (JWT)", "Signed XML assertion"],
  ["Browser carries", "Short-lived code only", "Full assertion (HTTP-POST)"],
  ["Key distribution", "Automatic via JWKS", "Manual certificate exchange"],
  ["Mobile / SPA / API fit", "Designed for it", "Awkward"],
  ["Vendor support (B2B SaaS)", "Growing", "Near-universal"],
  ["Aircall", "Not documented for enterprise SSO", "Yes"],
  ["Lattice", "Google/Microsoft sign-in", "Yes"],
];

export default function Guide() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">How it integrates for real</h1>
        <p className="mt-1 max-w-3xl text-muted">
          A practical rollout plan for a Microsoft 365 organization connecting Aircall, Lattice and similar SaaS apps to
          Microsoft Entra ID. Every step has an equivalent in Okta or Google Workspace.
        </p>
      </div>

      <div className="card border-warn/50">
        <HelpHeading topic="saml-vs-oidc">Protocol choice: OIDC vs. SAML</HelpHeading>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr><th className="py-1.5"></th><th>OIDC</th><th>SAML 2.0</th></tr>
            </thead>
            <tbody>
              {MATRIX.map(([k, a, b]) => (
                <tr key={k} className="border-t border-line"><td className="py-1.5 font-semibold">{k}</td><td>{a}</td><td>{b}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm">
          <b>Bottom line:</b> you will not choose the protocol for Aircall or Lattice — the vendor does, and today that is SAML.
          Choose OIDC for anything you build yourself.
        </p>
      </div>

      <section>
        <HelpHeading topic="sso">Rollout plan</HelpHeading>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.phase} className="card">
              <h3 className="mb-2 font-semibold">{s.phase}</h3>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
                {s.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <HelpHeading topic="vendor-aircall">Aircall specifics</HelpHeading>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            <li>SSO: SAML via the Entra gallery app; plan-gated.</li>
            <li>Phone numbers, call recordings and IVR ownership must be reassigned when an agent leaves — deactivation alone does not do it.</li>
            <li>Call-log exports to Azure SQL use Aircall&apos;s REST API with an API key / OAuth app, not SSO.</li>
          </ul>
        </div>
        <div className="card">
          <HelpHeading topic="vendor-lattice">Lattice specifics</HelpHeading>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            <li>SSO: SAML via the Entra gallery app, or Microsoft sign-in.</li>
            <li>People data (manager, department, start date) should come from the HRIS integration.</li>
            <li>User matching is by email — align HRIS email with the Entra UPN before enforcing SSO.</li>
          </ul>
        </div>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Building your own app? Use OIDC (ASP.NET Core)</h2>
          <Help topic="oidc" />
          <Help topic="validation" label="what it validates" />
        </div>
        <p className="mb-3 text-sm text-muted">
          For internal .NET tools, <code className="code-inline">Microsoft.Identity.Web</code> implements this entire demo — code
          flow, PKCE, JWKS caching, issuer/audience/nonce validation — in a few lines.
        </p>
        <pre className="code-block">{`// dotnet add package Microsoft.Identity.Web
// Program.cs
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Identity.Web;
using Microsoft.Identity.Web.UI;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApp(builder.Configuration.GetSection("AzureAd"));

builder.Services.AddAuthorization(options =>
{
    // App role defined in the Entra app registration → arrives in the "roles" claim
    options.AddPolicy("AdminsOnly", p => p.RequireRole("Admin"));
    options.FallbackPolicy = options.DefaultPolicy; // require sign-in everywhere
});

builder.Services.AddRazorPages().AddMicrosoftIdentityUI();

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();
app.MapRazorPages();
app.Run();`}</pre>
        <pre className="code-block mt-3">{`// appsettings.json — example default values
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "00000000-0000-0000-0000-000000000000",
    "ClientId": "11111111-1111-1111-1111-111111111111",
    "ClientSecret": "<from Key Vault or user-secrets, never committed>",
    "CallbackPath": "/signin-oidc",
    "SignedOutCallbackPath": "/signout-callback-oidc"
  }
}`}</pre>
      </section>

      <section className="card">
        <HelpHeading topic="deprovisioning">Common failure modes</HelpHeading>
        <ul className="list-disc space-y-1 pl-4 text-sm">
          <li><b>Keying accounts on email.</b> Renames break login or, worse, map a new hire to a former employee&apos;s account.</li>
          <li><b>Expired SAML certificate.</b> SSO for that app fails for everyone at once.</li>
          <li><b>No break-glass account.</b> An IdP outage or misconfiguration locks admins out of the vendor.</li>
          <li><b>Assuming SSO = deprovisioning.</b> Without SCIM, disabled users keep paid seats and existing sessions.</li>
          <li><b>Local password login left enabled.</b> Users bypass MFA and Conditional Access.</li>
        </ul>
      </section>
    </div>
  );
}
