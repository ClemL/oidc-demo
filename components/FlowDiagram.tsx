const LANES = [
  { x: 110, label: "Browser", sub: "user agent" },
  { x: 400, label: "Vendor app", sub: "relying party" },
  { x: 690, label: "Identity provider", sub: "Entra ID / Okta" },
];

type Step = { from: 0 | 1 | 2; to: 0 | 1 | 2; text: string; back?: boolean; self?: boolean };

const STEPS: Step[] = [
  { from: 0, to: 1, text: "Click “Continue with SSO”" },
  { from: 1, to: 0, text: "302 → /authorize (state, nonce, PKCE)" },
  { from: 0, to: 2, text: "GET /authorize" },
  { from: 2, to: 2, text: "Login + MFA, or reuse IdP session (SSO)", self: true },
  { from: 2, to: 0, text: "302 → /callback ? code, state" },
  { from: 0, to: 1, text: "GET /callback ? code, state" },
  { from: 1, to: 2, text: "POST /token  code + secret + code_verifier", back: true },
  { from: 2, to: 1, text: "{ id_token, access_token }", back: true },
  { from: 1, to: 1, text: "Validate ID token → map role → set session", self: true },
];

const ROW = 46;
const TOP = 78;

export function FlowDiagram({ activeUpTo = STEPS.length }: { activeUpTo?: number }) {
  const h = TOP + STEPS.length * ROW + 20;
  return (
    <div className="-mx-2 overflow-x-auto px-2">
    <svg viewBox={`0 0 800 ${h}`} className="w-full min-w-[640px]" role="img" aria-label="OIDC authorization code flow sequence diagram">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
        </marker>
        <marker id="arr-m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" />
        </marker>
      </defs>
      {LANES.map((l) => (
        <g key={l.label}>
          <rect x={l.x - 95} y={8} width={190} height={48} rx={10} fill="var(--subtle)" stroke="var(--line)" />
          <text x={l.x} y={29} textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--text)">{l.label}</text>
          <text x={l.x} y={46} textAnchor="middle" fontSize="11" fill="var(--muted)">{l.sub}</text>
          <line x1={l.x} x2={l.x} y1={56} y2={h - 8} stroke="var(--line)" strokeDasharray="3 4" />
        </g>
      ))}
      {STEPS.map((s, i) => {
        const y = TOP + i * ROW + 18;
        const active = i < activeUpTo;
        const color = active ? "var(--accent)" : "var(--muted)";
        const x1 = LANES[s.from].x;
        const x2 = LANES[s.to].x;
        const num = (
          <g>
            <circle cx={x1} cy={y} r={10} fill={color} />
            <text x={x1} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--panel)">{i + 1}</text>
          </g>
        );
        if (s.self) {
          const bx = s.from === 2 ? x1 - 14 - 318 : x1 + 14;
          return (
            <g key={i} opacity={active ? 1 : 0.55}>
              <rect x={bx} y={y - 14} width={318} height={28} rx={6} fill="var(--panel)" stroke={color} />
              <text x={bx + 159} y={y + 4} textAnchor="middle" fontSize="12" fill="var(--text)">{s.text}</text>
              {num}
            </g>
          );
        }
        const pad = 14;
        const dirSign = x2 > x1 ? 1 : -1;
        const mid = (x1 + x2) / 2;
        return (
          <g key={i} opacity={active ? 1 : 0.55}>
            <line
              x1={x1 + dirSign * pad}
              x2={x2 - dirSign * 4}
              y1={y}
              y2={y}
              stroke={color}
              strokeWidth={1.6}
              strokeDasharray={s.back ? "6 4" : undefined}
              markerEnd={active ? "url(#arr)" : "url(#arr-m)"}
            />
            <text x={mid} y={y - 6} textAnchor="middle" fontSize="12" fill="var(--text)">{s.text}</text>
            {num}
          </g>
        );
      })}
      <text x={545} y={h - 4} textAnchor="middle" fontSize="10.5" fill="var(--muted)">dashed = back channel (server ↔ server, never through the browser)</text>
    </svg>
    </div>
  );
}
