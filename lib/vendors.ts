/**
 * Public vendor ("relying party" / "service provider") configuration.
 * Secrets live in lib/clients.ts, which is server-only.
 */
export type VendorId = "aircall" | "lattice";

export type RoleRule = { group: string; role: string };

export type Vendor = {
  id: VendorId;
  name: string;
  tagline: string;
  clientId: string;
  scopes: string[];
  /** IdP-side "user assignment": only members of these groups may sign in. */
  assignedGroups: string[];
  /** First matching rule wins; evaluated against the `groups` claim. */
  roleRules: RoleRule[];
  defaultRole: string;
  accent: string; // tailwind-friendly hex
  realWorld: {
    protocols: string;
    provisioning: string;
    plan: string;
    caveat: string;
  };
};

export const VENDORS: Record<VendorId, Vendor> = {
  aircall: {
    id: "aircall",
    name: "Aircall (simulated)",
    tagline: "Cloud phone system for support and sales teams",
    clientId: "aircall-demo-client",
    scopes: ["openid", "profile", "email", "groups"],
    assignedGroups: ["App-Aircall-Admins", "App-Aircall-Users"],
    roleRules: [
      { group: "App-Aircall-Admins", role: "Admin" },
      { group: "App-Aircall-Users", role: "Agent" },
    ],
    defaultRole: "Agent",
    accent: "#00b388",
    realWorld: {
      protocols: "SAML 2.0 SSO via Okta, Microsoft Entra ID and Google Workspace (per Aircall's help center).",
      provisioning:
        "User provisioning is documented for some IdPs; confirm SCIM support for Entra ID on your plan with Aircall before relying on it.",
      plan: "SSO is gated to Aircall's higher-tier plans (historically \"Professional\"). Verify current packaging.",
      caveat:
        "Aircall is a SAML integration in practice. The OIDC flow here demonstrates the same trust model; the wire format differs (XML assertion instead of a JWT).",
    },
  },
  lattice: {
    id: "lattice",
    name: "Lattice (simulated)",
    tagline: "Performance reviews, goals, and engagement",
    clientId: "lattice-demo-client",
    scopes: ["openid", "profile", "email", "groups"],
    assignedGroups: ["App-Lattice-Admins", "App-Lattice-Users"],
    roleRules: [
      { group: "App-Lattice-Admins", role: "Super Admin" },
      { group: "Managers", role: "Manager" },
      { group: "App-Lattice-Users", role: "Employee" },
    ],
    defaultRole: "Employee",
    accent: "#6d5dfc",
    realWorld: {
      protocols:
        "SAML 2.0 SSO (Okta, OneLogin, Entra ID and others) plus \"Sign in with Google/Microsoft\", which is OAuth 2.0 / OIDC under the hood.",
      provisioning:
        "Lattice typically sources people data from an HRIS sync (e.g., BambooHR, Workday, Rippling). SCIM via an IdP is documented for some IdPs; confirm for Entra ID.",
      plan: "SSO/SAML availability depends on the Lattice contract. Verify with your account team.",
      caveat:
        "Manager relationships and review cycles usually come from the HRIS, not the IdP. The IdP answers \"who are you\"; the HRIS answers \"who do you report to\".",
    },
  },
};

export const VENDOR_IDS = Object.keys(VENDORS) as VendorId[];

export function isVendorId(v: string): v is VendorId {
  return v in VENDORS;
}

export function mapRole(vendor: Vendor, groups: string[]) {
  const rule = vendor.roleRules.find((r) => groups.includes(r.group));
  return { role: rule?.role ?? vendor.defaultRole, matched: rule ?? null };
}
