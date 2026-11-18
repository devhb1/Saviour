import { Diagram } from "../ui/Diagram";

const NPM = "https://www.npmjs.com/package/@saviours/audit";

function DownFlow({
  markerId,
  steps,
}: {
  markerId: string;
  steps: { title: string; detail: string }[];
}) {
  const boxH = 46;
  const gap = 22;
  const width = 360;
  const boxW = 300;
  const x = 30;
  const height = steps.length * boxH + (steps.length - 1) * gap + 8;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      style={{ width: "100%", maxWidth: 420, height: "auto", display: "block" }}
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M0 0 L8 4 L0 8 Z" fill="var(--sig)" />
        </marker>
      </defs>
      {steps.map((step, i) => {
        const y = 4 + i * (boxH + gap);
        const nextY = y + boxH;
        return (
          <g key={step.title}>
            <rect
              x={x}
              y={y}
              width={boxW}
              height={boxH}
              rx={6}
              fill="var(--bg-raise)"
              stroke="var(--line-mid)"
            />
            <text
              x={x + boxW / 2}
              y={y + 18}
              textAnchor="middle"
              fill="var(--tx-hi)"
              fontSize={12}
              fontFamily="var(--font-mono), ui-monospace, monospace"
            >
              {step.title}
            </text>
            <text
              x={x + boxW / 2}
              y={y + 34}
              textAnchor="middle"
              fill="var(--tx-lo)"
              fontSize={10}
              fontFamily="var(--font-mono), ui-monospace, monospace"
            >
              {step.detail}
            </text>
            {i < steps.length - 1 ? (
              <line
                x1={width / 2}
                y1={nextY}
                x2={width / 2}
                y2={nextY + gap - 2}
                stroke="var(--sig)"
                strokeWidth={1.5}
                markerEnd={`url(#${markerId})`}
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function ReadFlow() {
  return (
    <Diagram
      title="HOW A READ RUNS"
      caption="The website, the CLI, and @saviours/audit call the same read. Condition amounts stay unknown. The report never says the Safe is safe."
    >
      <DownFlow
        markerId="audit-read-arrow"
        steps={[
          { title: "Safe address", detail: "mainnet · chainId 1 · optional block" },
          { title: "@saviours/audit", detail: "auditSafe · or GET /api/audit" },
          { title: "Safe inventory", detail: "owners · modules · guard · fallback" },
          { title: "Delay", detail: "cooldown · expiration · modules on the Delay" },
          { title: "Roles v2.1.1", detail: "selectors from logs · v1 is named only" },
          { title: "Report", detail: "Findings · Coverage · Freshness · Reach" },
          { title: "Pin", detail: "safe + block + digest" },
        ]}
      />
    </Diagram>
  );
}

export function WitnessFlow() {
  return (
    <Diagram
      title="HOW A PIN IS CHECKED"
      caption="A match means this engine reproduced the report at that block. It is not a signature of who ran it. The signer still approves in Safe."
    >
      <DownFlow
        markerId="audit-pin-arrow"
        steps={[
          { title: "Operator runs the audit", detail: "web, CLI, or the npm package" },
          { title: "Share the pin", detail: "/audit?safe&block&digest" },
          { title: "Second person opens it", detail: "the page re-audits that block" },
          { title: "Digest match or mismatch", detail: "mismatch means keep the new digest" },
          { title: "Signer decides", detail: "in Safe · this product does not block" },
        ]}
      />
    </Diagram>
  );
}

export function PackageFlow() {
  return (
    <Diagram
      title="WHICH PACKAGE"
      caption="Install the auditor from npm. The older name is a different product."
    >
      <svg
        viewBox="0 0 360 132"
        role="img"
        style={{ width: "100%", maxWidth: 420, height: "auto", display: "block" }}
      >
        <rect x="16" y="12" width="150" height="108" rx="6" fill="var(--bg-raise)" stroke="var(--sig)" />
        <text x="91" y="36" textAnchor="middle" fill="var(--sig)" fontSize={11} fontFamily="var(--font-mono), ui-monospace, monospace">
          this auditor
        </text>
        <text x="91" y="58" textAnchor="middle" fill="var(--tx-hi)" fontSize={11} fontFamily="var(--font-mono), ui-monospace, monospace">
          @saviours/audit
        </text>
        <text x="91" y="78" textAnchor="middle" fill="var(--tx-lo)" fontSize={10} fontFamily="var(--font-mono), ui-monospace, monospace">
          0.1.0 · published
        </text>
        <a href={NPM}>
          <text x="91" y="100" textAnchor="middle" fill="var(--sig)" fontSize={10} fontFamily="var(--font-mono), ui-monospace, monospace">
            npmjs.com
          </text>
        </a>
        <rect x="194" y="12" width="150" height="108" rx="6" fill="var(--bg-raise)" stroke="var(--line-mid)" />
        <text x="269" y="36" textAnchor="middle" fill="var(--tx-lo)" fontSize={11} fontFamily="var(--font-mono), ui-monospace, monospace">
          older product
        </text>
        <text x="269" y="58" textAnchor="middle" fill="var(--tx-hi)" fontSize={11} fontFamily="var(--font-mono), ui-monospace, monospace">
          @saviours/check
        </text>
        <text x="269" y="84" textAnchor="middle" fill="var(--tx-lo)" fontSize={10} fontFamily="var(--font-mono), ui-monospace, monospace">
          ENS counterparty
        </text>
        <text x="269" y="100" textAnchor="middle" fill="var(--tx-lo)" fontSize={10} fontFamily="var(--font-mono), ui-monospace, monospace">
          check
        </text>
      </svg>
    </Diagram>
  );
}

export const AUDIT_NPM_URL = NPM;
