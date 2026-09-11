"use client";

import { Diagram } from "../../ui/Diagram";

const stroke = "var(--line-mid, var(--line))";
const ink = "var(--tx-hi)";
const muted = "var(--tx-lo)";
const accent = "var(--sig)";
const red = "var(--red, #e85d4c)";

function Box({
  x,
  y,
  w,
  h,
  label,
  sub,
  fill = "transparent",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  fill?: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.25}
      />
      <text
        x={x + w / 2}
        y={y + (sub ? h / 2 - 4 : h / 2 + 4)}
        textAnchor="middle"
        fill={ink}
        fontSize={11}
        fontFamily="var(--font-mono), ui-monospace, monospace"
      >
        {label}
      </text>
      {sub ? (
        <text
          x={x + w / 2}
          y={y + h / 2 + 12}
          textAnchor="middle"
          fill={muted}
          fontSize={9}
          fontFamily="var(--font-mono), ui-monospace, monospace"
        >
          {sub}
        </text>
      ) : null}
    </g>
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  label,
  color = accent,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  color?: string;
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={1.5}
        markerEnd="url(#arrow)"
      />
      {label ? (
        <text
          x={(x1 + x2) / 2}
          y={y1 - 6}
          textAnchor="middle"
          fill={color}
          fontSize={9}
          fontFamily="var(--font-mono), ui-monospace, monospace"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <marker
        id="arrow"
        viewBox="0 0 10 10"
        refX={8}
        refY={5}
        markerWidth={6}
        markerHeight={6}
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill={accent} />
      </marker>
      <marker
        id="arrow-red"
        viewBox="0 0 10 10"
        refX={8}
        refY={5}
        markerWidth={6}
        markerHeight={6}
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill={red} />
      </marker>
    </defs>
  );
}

/** 1 · Investigate → Name → Resolve free */
export function LoopDiagram() {
  return (
    <Diagram
      title="THE LOOP"
      caption="Investigate once (~$0.01) · name on ENS · every later resolve is $0."
    >
      <svg viewBox="0 0 520 110" width="100%" height={110} role="img">
        <Defs />
        <Box x={8} y={28} w={140} h={52} label="Investigate" sub="Graph · AI cites" />
        <Arrow x1={152} y1={54} x2={188} y2={54} label="~$0.01" />
        <Box x={190} y={28} w={140} h={52} label="Name" sub="WATCH / TAINTED" />
        <Arrow x1={334} y1={54} x2={370} y2={54} label="write" />
        <Box
          x={372}
          y={28}
          w={140}
          h={52}
          label="Resolve"
          sub="$0 forever"
          fill="color-mix(in srgb, var(--sig) 12%, transparent)"
        />
      </svg>
    </Diagram>
  );
}

/** 2 · Graph fan-out */
export function GraphFanOutDiagram() {
  const protos = ["Aave", "Comp", "Spark", "Maker", "Uni", "Sushi", "Curve", "Yearn"];
  return (
    <Diagram
      title="GRAPH FAN-OUT"
      caption="1 Messari template → 8 deployments → rows → deterministic signals → validator."
    >
      <svg viewBox="0 0 560 160" width="100%" height={160} role="img">
        <Defs />
        <Box x={8} y={54} w={100} h={44} label="Template" sub="Messari" />
        {protos.map((p, i) => {
          const x = 140 + (i % 4) * 70;
          const y = i < 4 ? 18 : 90;
          return (
            <g key={p}>
              <line
                x1={108}
                y1={76}
                x2={x + 28}
                y2={y + 16}
                stroke={stroke}
                strokeWidth={1}
              />
              <Box x={x} y={y} w={56} h={32} label={p} />
            </g>
          );
        })}
        <Arrow x1={420} y1={76} x2={455} y2={76} />
        <Box x={458} y={54} w={90} h={44} label="Signals" sub="→ validator" />
      </svg>
    </Diagram>
  );
}

/** 3 · ENS write path */
export function EnsWriteDiagram() {
  return (
    <Diagram
      title="ENS WRITE PATH"
      caption="Investigator EOA → UserRegistry → PermissionedResolver → 6 text records → any reader."
    >
      <svg viewBox="0 0 560 130" width="100%" height={130} role="img">
        <Defs />
        <Box x={8} y={40} w={90} h={44} label="EOA" sub="investigator" />
        <Arrow x1={102} y1={62} x2={130} y2={62} />
        <Box x={132} y={40} w={100} h={44} label="UserRegistry" />
        <Arrow x1={236} y1={62} x2={264} y2={62} />
        <Box x={266} y={40} w={120} h={44} label="Permissioned" sub="Resolver" />
        <Arrow x1={390} y1={62} x2={418} y2={62} />
        <Box x={420} y={40} w={128} h={44} label="6 texts" sub="cast / wallet" />
        <line
          x1={310}
          y1={88}
          x2={310}
          y2={112}
          stroke={red}
          strokeWidth={1.5}
          markerEnd="url(#arrow-red)"
        />
        <text
          x={318}
          y={118}
          fill={red}
          fontSize={9}
          fontFamily="var(--font-mono), ui-monospace, monospace"
        >
          EAC wrong-role → revert
        </text>
      </svg>
    </Diagram>
  );
}

/** 4 · Agent decision path */
export function AgentDecisionDiagram() {
  return (
    <Diagram
      title="AGENT DECISION PATH"
      caption="ENS read first. Hit → BLOCK/WARN free. Miss → 402 → x402 Base → investigate → maybe name."
    >
      <svg viewBox="0 0 560 150" width="100%" height={150} role="img">
        <Defs />
        <Box x={8} y={50} w={70} h={40} label="Agent" />
        <Arrow x1={82} y1={70} x2={112} y2={70} />
        <Box x={114} y={50} w={100} h={40} label="ENS read" sub="$0" />
        <Arrow x1={218} y1={50} x2={250} y2={28} label="hit" />
        <Box
          x={252}
          y={8}
          w={120}
          h={40}
          label="BLOCK / WARN"
          fill="color-mix(in srgb, var(--sig) 12%, transparent)"
        />
        <Arrow x1={218} y1={90} x2={250} y2={112} label="miss" color="var(--amber, #d4a017)" />
        <Box x={252} y={96} w={70} h={36} label="402" />
        <Arrow x1={326} y1={114} x2={358} y2={114} />
        <Box x={360} y={96} w={90} h={36} label="x402 Base" sub="~$0.01" />
        <Arrow x1={454} y1={114} x2={478} y2={114} />
        <Box x={480} y={96} w={70} h={36} label="invest." />
      </svg>
    </Diagram>
  );
}

/** 5 · Trust boundary */
export function TrustBoundaryDiagram() {
  return (
    <Diagram
      title="TRUST BOUNDARY"
      caption="AI explains and cites. Code decides status, writes, and what never gets named."
    >
      <svg viewBox="0 0 520 140" width="100%" height={140} role="img">
        <Defs />
        <rect
          x={8}
          y={16}
          width={230}
          height={108}
          rx={6}
          fill="color-mix(in srgb, var(--violet, #8b7cf7) 8%, transparent)"
          stroke={stroke}
        />
        <text
          x={24}
          y={36}
          fill={muted}
          fontSize={10}
          fontFamily="var(--font-mono), ui-monospace, monospace"
        >
          AI MAY
        </text>
        <text x={24} y={58} fill={ink} fontSize={11} fontFamily="var(--font-mono), ui-monospace, monospace">
          · explain cited rows
        </text>
        <text x={24} y={78} fill={ink} fontSize={11} fontFamily="var(--font-mono), ui-monospace, monospace">
          · propose status
        </text>
        <text x={24} y={98} fill={ink} fontSize={11} fontFamily="var(--font-mono), ui-monospace, monospace">
          · draft banners
        </text>

        <rect
          x={270}
          y={16}
          width={240}
          height={108}
          rx={6}
          fill="color-mix(in srgb, var(--sig) 10%, transparent)"
          stroke={accent}
        />
        <text
          x={286}
          y={36}
          fill={accent}
          fontSize={10}
          fontFamily="var(--font-mono), ui-monospace, monospace"
        >
          ONLY CODE
        </text>
        <text x={286} y={58} fill={ink} fontSize={11} fontFamily="var(--font-mono), ui-monospace, monospace">
          · validateAssessment
        </text>
        <text x={286} y={78} fill={ink} fontSize={11} fontFamily="var(--font-mono), ui-monospace, monospace">
          · ENS / registry writes
        </text>
        <text x={286} y={98} fill={ink} fontSize={11} fontFamily="var(--font-mono), ui-monospace, monospace">
          · never-name SAFE / REJECT
        </text>
      </svg>
    </Diagram>
  );
}

/** 6 · Clone cascade */
export function CloneCascadeDiagram() {
  return (
    <Diagram
      title="CLONE CASCADE"
      caption="We don't ask who the address is. We ask what it's made of. Address miss → bytecode → code-hash ENS."
    >
      <svg viewBox="0 0 560 150" width="100%" height={150} role="img">
        <Defs />
        <Box x={8} y={50} w={88} h={44} label="address" sub="ENS miss" />
        <Arrow x1={100} y1={72} x2={128} y2={72} />
        <Box x={130} y={50} w={88} h={44} label="getCode" sub="mainnet" />
        <Arrow x1={222} y1={72} x2={250} y2={72} />
        <Box x={252} y={50} w={110} h={44} label="code-hash" sub="label" />
        <Arrow x1={366} y1={50} x2={398} y2={28} label="hit" />
        <Box
          x={400}
          y={8}
          w={148}
          h={44}
          label="BLOCK · clone"
          fill="color-mix(in srgb, var(--sig) 12%, transparent)"
        />
        <Arrow x1={366} y1={94} x2={398} y2={116} label="miss" color="var(--amber, #d4a017)" />
        <Box x={400} y={98} w={148} h={40} label="ESCALATE" sub="honest" />
      </svg>
    </Diagram>
  );
}

export function DocsDiagrams() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <LoopDiagram />
      <GraphFanOutDiagram />
      <EnsWriteDiagram />
      <AgentDecisionDiagram />
      <TrustBoundaryDiagram />
      <CloneCascadeDiagram />
    </div>
  );
}
