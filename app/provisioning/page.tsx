import { Help, HelpHeading } from "@/components/Help";
import { ScimSimulator } from "./ScimSimulator";

export default function Provisioning() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">SCIM provisioning simulator</h1>
          <Help topic="scim" />
        </div>
        <p className="mt-1 max-w-3xl text-muted">
          SSO decides <i>who can sign in</i>. Provisioning decides <i>who exists</i> in each vendor — before first login and
          after they leave. Edit the directory on the left, run a provisioning cycle, and inspect the exact SCIM 2.0
          requests the IdP would send to Aircall and Lattice.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card text-sm">
          <HelpHeading topic="jit" as="h3">JIT (what the SSO demo does)</HelpHeading>
          <p className="text-muted">Account created on first sign-in from token claims. Nothing is ever removed.</p>
        </div>
        <div className="card text-sm">
          <HelpHeading topic="scim" as="h3">SCIM push</HelpHeading>
          <p className="text-muted">IdP creates, updates and deactivates accounts on a schedule (Entra: ~every 40 minutes).</p>
        </div>
        <div className="card text-sm">
          <HelpHeading topic="deprovisioning" as="h3">Leavers</HelpHeading>
          <p className="text-muted">Terminate a user and run a cycle: both vendors receive <code className="code-inline">active: false</code>.</p>
        </div>
      </div>
      <ScimSimulator />
      <p className="text-xs text-muted">
        This simulator runs in your browser and is independent of the sign-in demo&apos;s fixed directory. State is kept in
        localStorage for convenience.
      </p>
    </div>
  );
}
