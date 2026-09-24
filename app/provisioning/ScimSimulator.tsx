"use client";

import { useEffect, useState } from "react";
import { Help } from "@/components/Help";
import { TENANT_DOMAIN, USERS } from "@/lib/directory";
import { VENDORS, VENDOR_IDS, type VendorId } from "@/lib/vendors";

type DirUser = {
  sub: string;
  givenName: string;
  familyName: string;
  email: string;
  title: string;
  department: string;
  employeeId: string;
  active: boolean;
  apps: Record<VendorId, boolean>;
};
type VendorUser = { id: string; externalId: string; userName: string; title: string; department: string; active: boolean };
type Op = { cycle: number; vendor: VendorId; method: string; path: string; status: number; body?: unknown; note: string };
type State = { users: DirUser[]; stores: Record<VendorId, VendorUser[]>; log: Op[]; cycle: number; hires: number };

const KEY = "scim-sim-v1";
const CORE = "urn:ietf:params:scim:schemas:core:2.0:User";
const ENT = "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User";
const PATCH = "urn:ietf:params:scim:api:messages:2.0:PatchOp";

function initial(): State {
  return {
    users: USERS.map((u) => ({
      sub: u.sub,
      givenName: u.givenName,
      familyName: u.familyName,
      email: u.email,
      title: u.title,
      department: u.department,
      employeeId: u.employeeId,
      active: true,
      apps: {
        aircall: u.groups.some((g) => VENDORS.aircall.assignedGroups.includes(g)),
        lattice: u.groups.some((g) => VENDORS.lattice.assignedGroups.includes(g)),
      },
    })),
    stores: { aircall: [], lattice: [] },
    log: [],
    cycle: 0,
    hires: 0,
  };
}

function scimUser(u: DirUser) {
  return {
    schemas: [CORE, ENT],
    externalId: u.sub,
    userName: u.email,
    active: true,
    name: { givenName: u.givenName, familyName: u.familyName },
    emails: [{ value: u.email, type: "work", primary: true }],
    title: u.title,
    [ENT]: { employeeNumber: u.employeeId, department: u.department },
  };
}

function runCycle(s: State): State {
  const cycle = s.cycle + 1;
  const log: Op[] = [];
  const stores = { aircall: [...s.stores.aircall], lattice: [...s.stores.lattice] };

  for (const v of VENDOR_IDS) {
    const prefix = v === "aircall" ? "ac" : "lt";
    for (const u of s.users) {
      const inScope = u.active && u.apps[v];
      const idx = stores[v].findIndex((x) => x.externalId === u.sub);
      const existing = idx >= 0 ? stores[v][idx] : undefined;

      if (inScope && !existing) {
        log.push({ cycle, vendor: v, method: "GET", path: `/scim/v2/Users?filter=userName eq "${u.email}"`, status: 200, note: "Match check before create: totalResults 0" });
        const id = `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
        stores[v].push({ id, externalId: u.sub, userName: u.email, title: u.title, department: u.department, active: true });
        log.push({ cycle, vendor: v, method: "POST", path: "/scim/v2/Users", status: 201, body: scimUser(u), note: `Create ${u.givenName} (joiner / newly assigned)` });
        continue;
      }
      if (!existing) continue;

      const ops: { op: string; path: string; value: unknown }[] = [];
      if (inScope && !existing.active) ops.push({ op: "replace", path: "active", value: true });
      if (!inScope && existing.active) ops.push({ op: "replace", path: "active", value: false });
      if (inScope && existing.title !== u.title) ops.push({ op: "replace", path: "title", value: u.title });
      if (inScope && existing.department !== u.department)
        ops.push({ op: "replace", path: `${ENT}:department`, value: u.department });
      if (!ops.length) continue;

      stores[v][idx] = {
        ...existing,
        active: inScope,
        title: inScope ? u.title : existing.title,
        department: inScope ? u.department : existing.department,
      };
      const why = !inScope
        ? u.active ? "unassigned from app" : "terminated in directory"
        : !existing.active ? "re-enabled" : "attribute change (mover)";
      log.push({
        cycle,
        vendor: v,
        method: "PATCH",
        path: `/scim/v2/Users/${existing.id}`,
        status: 200,
        body: { schemas: [PATCH], Operations: ops },
        note: `${u.givenName}: ${why}`,
      });
    }
  }
  if (!log.length) log.push({ cycle, vendor: "aircall", method: "—", path: "", status: 0, note: "No changes detected — nothing sent (incremental cycle)." });
  return { ...s, stores, cycle, log: [...log, ...s.log].slice(0, 80) };
}

export function ScimSimulator() {
  const [s, setS] = useState<State>(initial);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
  }, [s]);

  const update = (sub: string, patch: Partial<DirUser>) =>
    setS((p) => ({ ...p, users: p.users.map((u) => (u.sub === sub ? { ...u, ...patch } : u)) }));

  const hire = () =>
    setS((p) => {
      const n = p.hires + 1;
      const names = [["Taylor", "Nguyen"], ["Morgan", "Patel"], ["Casey", "Kim"], ["Riley", "Garcia"]];
      const [g, f] = names[(n - 1) % names.length];
      return {
        ...p,
        hires: n,
        users: [
          ...p.users,
          {
            sub: `new-hire-${n}-${Date.now()}`,
            givenName: g,
            familyName: f,
            email: `${g}.${f}${n > names.length ? n : ""}@${TENANT_DOMAIN}`.toLowerCase(),
            title: "Data Analyst",
            department: "Analytics",
            employeeId: `E-${1100 + n}`,
            active: true,
            apps: { aircall: false, lattice: true },
          },
        ],
      };
    });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
      <div className="card overflow-x-auto">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">IdP directory</h2>
          <Help topic="assignment" />
          <div className="ml-auto flex gap-2">
            <button className="btn btn-ghost" onClick={hire}>+ New hire</button>
            <button className="btn btn-ghost" onClick={() => setS(initial())}>Reset</button>
          </div>
        </div>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="py-1.5">Person</th>
              <th>Title</th>
              <th className="px-2 text-center">Aircall</th>
              <th className="px-2 text-center">Lattice</th>
              <th className="px-2 text-center">Employed</th>
            </tr>
          </thead>
          <tbody>
            {s.users.map((u) => (
              <tr key={u.sub} className={`border-t border-line ${u.active ? "" : "opacity-50"}`}>
                <td className="py-2 pr-2">
                  <div className="font-medium">{u.givenName} {u.familyName}</div>
                  <div className="text-xs text-muted">{u.email}</div>
                </td>
                <td className="pr-2">
                  <input
                    type="text"
                    value={u.title}
                    onChange={(e) => update(u.sub, { title: e.target.value })}
                    className="!py-1 text-xs"
                    aria-label={`Title for ${u.givenName}`}
                  />
                </td>
                {VENDOR_IDS.map((v) => (
                  <td key={v} className="text-center">
                    <input
                      type="checkbox"
                      checked={u.apps[v]}
                      onChange={(e) => update(u.sub, { apps: { ...u.apps, [v]: e.target.checked } })}
                      className="h-4 w-4 accent-[var(--accent)]"
                      aria-label={`Assign ${u.givenName} to ${v}`}
                    />
                  </td>
                ))}
                <td className="text-center">
                  <button
                    className={`pill ${u.active ? "text-ok" : "text-bad"}`}
                    onClick={() => update(u.sub, { active: !u.active })}
                    title="Toggle employment (leaver / rehire)"
                  >
                    {u.active ? "Active" : "Terminated"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex items-center gap-3">
          <button className="btn btn-primary" onClick={() => setS(runCycle)}>
            ▶ Run provisioning cycle {s.cycle ? `#${s.cycle + 1}` : "(initial)"}
          </button>
          <span className="text-xs text-muted">Change titles, assignments or employment, then run again.</span>
        </div>
      </div>

      <div className="space-y-4">
        {VENDOR_IDS.map((v) => (
          <div key={v} className="card">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: VENDORS[v].accent }} />
              <h3 className="font-semibold">{VENDORS[v].name} — user store</h3>
              <Help topic={v === "aircall" ? "vendor-aircall" : "vendor-lattice"} />
              <span className="ml-auto text-xs text-muted">
                {s.stores[v].filter((x) => x.active).length} active seat(s)
              </span>
            </div>
            {s.stores[v].length === 0 ? (
              <p className="text-sm text-muted">Empty — run a cycle.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {s.stores[v].map((x) => (
                  <li key={x.id} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${x.active ? "bg-ok" : "bg-bad"}`} />
                    <span className={x.active ? "" : "line-through text-muted"}>{x.userName}</span>
                    <span className="text-xs text-muted">{x.title}</span>
                    <span className="ml-auto font-mono text-xs text-muted">{x.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="card xl:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-semibold">SCIM request log</h2>
          <Help topic="scim" />
          <Help topic="deprovisioning" label="leavers" />
        </div>
        {s.log.length === 0 ? (
          <p className="text-sm text-muted">No requests yet.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {s.log.map((op, i) => (
              <li key={i} className="py-2">
                <button className="flex w-full flex-wrap items-center gap-2 text-left" onClick={() => setOpen(open === i ? null : i)}>
                  <span className="pill">#{op.cycle}</span>
                  {op.method !== "—" && <span className="pill" style={{ color: VENDORS[op.vendor].accent }}>{op.vendor}</span>}
                  <span className="font-mono font-semibold">{op.method}</span>
                  <span className="font-mono text-xs break-all">{op.path}</span>
                  {op.status > 0 && <span className="font-mono text-xs text-ok">{op.status}</span>}
                  <span className="ml-auto text-xs text-muted">{op.note}</span>
                </button>
                {open === i && op.body !== undefined && (
                  <pre className="code-block mt-2">
                    {`${op.method} ${op.path} HTTP/1.1\nHost: api.${op.vendor}.example\nAuthorization: Bearer <secret token from vendor admin console>\nContent-Type: application/scim+json\n\n${JSON.stringify(op.body, null, 2)}`}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
