/** High-level picture: one IdP, many apps, two integration channels (SSO + SCIM) plus HRIS. */
export function Architecture() {
  const apps = [
    { y: 40, name: "Aircall", sub: "SAML/OIDC + SCIM" },
    { y: 130, name: "Lattice", sub: "SAML/OIDC (+ HRIS sync)" },
    { y: 220, name: "Other SaaS", sub: "Notion, Wrike, Figma…" },
  ];
  return (
    <div className="-mx-2 overflow-x-auto px-2">
    <svg viewBox="0 0 760 300" className="mx-auto block w-full min-w-[600px] max-w-4xl" role="img" aria-label="Architecture: HRIS feeds the IdP, which federates sign-in and provisions users to vendor apps">
      <defs>
        <marker id="a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
        </marker>
        <marker id="a3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--ok)" />
        </marker>
      </defs>
      <rect x={4} y={115} width={152} height={70} rx={10} fill="var(--subtle)" stroke="var(--line)" />
      <text x={80} y={145} textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--text)">HRIS</text>
      <text x={80} y={163} textAnchor="middle" fontSize="11" fill="var(--muted)">joiners · movers · leavers</text>
      <line x1={150} y1={150} x2={255} y2={150} stroke="var(--ok)" strokeWidth={1.6} markerEnd="url(#a3)" />
      <text x={202} y={142} textAnchor="middle" fontSize="11" fill="var(--muted)">sync</text>

      <rect x={260} y={95} width={200} height={110} rx={12} fill="var(--panel)" stroke="var(--accent)" strokeWidth={2} />
      <text x={360} y={130} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text)">Identity Provider</text>
      <text x={360} y={150} textAnchor="middle" fontSize="11.5" fill="var(--muted)">Entra ID (O365) / Okta</text>
      <text x={360} y={172} textAnchor="middle" fontSize="11" fill="var(--muted)">MFA · Conditional Access</text>
      <text x={360} y={188} textAnchor="middle" fontSize="11" fill="var(--muted)">groups · app assignment</text>

      {apps.map((a) => (
        <g key={a.name}>
          <rect x={590} y={a.y} width={160} height={50} rx={10} fill="var(--subtle)" stroke="var(--line)" />
          <text x={670} y={a.y + 22} textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--text)">{a.name}</text>
          <text x={670} y={a.y + 38} textAnchor="middle" fontSize="10.5" fill="var(--muted)">{a.sub}</text>
          <line x1={460} y1={140} x2={587} y2={a.y + 20} stroke="var(--accent)" strokeWidth={1.5} markerEnd="url(#a2)" />
          <line x1={460} y1={162} x2={587} y2={a.y + 34} stroke="var(--ok)" strokeWidth={1.5} strokeDasharray="5 4" markerEnd="url(#a3)" />
        </g>
      ))}
      <g fontSize="11">
        <line x1={270} y1={250} x2={300} y2={250} stroke="var(--accent)" strokeWidth={2} />
        <text x={306} y={254} fill="var(--text)">SSO: who is signing in (OIDC / SAML)</text>
        <line x1={270} y1={272} x2={300} y2={272} stroke="var(--ok)" strokeWidth={2} strokeDasharray="5 4" />
        <text x={306} y={276} fill="var(--text)">Provisioning: who should exist (SCIM)</text>
      </g>
    </svg>
    </div>
  );
}
