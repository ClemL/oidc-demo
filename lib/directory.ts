/**
 * The mock corporate directory (stands in for Microsoft Entra ID / Okta).
 * Every demo user's password is "demo".
 */
export type DirectoryUser = {
  sub: string; // immutable object id — never use email as the join key
  username: string;
  email: string;
  givenName: string;
  familyName: string;
  title: string;
  department: string;
  manager?: string;
  employeeId: string;
  groups: string[];
  note: string;
};

export const TENANT_DOMAIN = "acme-rx.example";

export const USERS: DirectoryUser[] = [
  {
    sub: "8f14e45f-ea3c-4c2b-9a1e-000000000001",
    username: "alex",
    email: `alex.rivera@${TENANT_DOMAIN}`,
    givenName: "Alex",
    familyName: "Rivera",
    title: "Engineering Manager",
    department: "Engineering",
    employeeId: "E-1001",
    groups: ["All-Staff", "Managers", "App-Aircall-Admins", "App-Lattice-Users"],
    note: "Assigned to both apps. Aircall admin, Lattice manager.",
  },
  {
    sub: "8f14e45f-ea3c-4c2b-9a1e-000000000002",
    username: "priya",
    email: `priya.shah@${TENANT_DOMAIN}`,
    givenName: "Priya",
    familyName: "Shah",
    title: "Client Support Specialist",
    department: "Client Services",
    manager: "Alex Rivera",
    employeeId: "E-1002",
    groups: ["All-Staff", "App-Aircall-Users", "App-Lattice-Users"],
    note: "Aircall agent, Lattice employee.",
  },
  {
    sub: "8f14e45f-ea3c-4c2b-9a1e-000000000003",
    username: "jordan",
    email: `jordan.lee@${TENANT_DOMAIN}`,
    givenName: "Jordan",
    familyName: "Lee",
    title: "People Operations Lead",
    department: "HR",
    employeeId: "E-1003",
    groups: ["All-Staff", "HR-Admins", "App-Lattice-Admins"],
    note: "Lattice admin only. Not assigned to Aircall → access denied there.",
  },
  {
    sub: "8f14e45f-ea3c-4c2b-9a1e-000000000004",
    username: "sam",
    email: `sam.carter@${TENANT_DOMAIN}`,
    givenName: "Sam",
    familyName: "Carter",
    title: "Contract Data Analyst",
    department: "Analytics",
    employeeId: "C-2001",
    groups: ["Contractors"],
    note: "Contractor with no app assignments → denied by the IdP everywhere.",
  },
];

export function findUser(username: string) {
  return USERS.find((u) => u.username === username.trim().toLowerCase());
}

export function findUserBySub(sub: string) {
  return USERS.find((u) => u.sub === sub);
}

export const DEMO_PASSWORD = "demo";
