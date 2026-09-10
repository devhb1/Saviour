"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { btnGhost, btnPrimary, fieldStyle, HOME_CHIPS } from "./AppShell";
import { fetchJson } from "../lib/fetchJson";
import { resolveTargetClient } from "../lib/resolveTargetClient";
import {
  DarkThesis,
  MarkMark,
  MetricCard,
  SectionMark,
  StatusPill,
  markGrid,
} from "./Mark";
import { BrandMark } from "./BrandMark";

type StripCounts = {
  cases: number;
  graph: number;
  live: number;
  seeded: number;
};

export function HomeScreen({
  address,
  onAddress,
  onOpenCase,
  onOpenShield,
  onOpenRegistry,
  onOpenSurface,
  onOpenAgents,
  memoryHits,
}: {
  address: string;
  onAddress: (a: string) => void;
  onOpenCase: (a?: string) => void;
  onOpenShield: (a?: string) => void;
  onOpenRegistry?: () => void;
  onOpenSurface?: () => void;
  onOpenAgents?: () => void;
  memoryHits: number;
}) {
  const [counts, setCounts] = useState<StripCounts | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const json = await fetchJson<{
          incidents?: Array<{ proof?: string }>;
        }>("/api/incidents");
        if (cancelled) return;
        const list = json.incidents ?? [];
        setCounts({
          cases: list.length,
          graph: list.filter((r) => r.proof === "graph").length,
          live: list.filter((r) => r.proof === "live").length,
          seeded: list.filter((r) => (r.proof ?? "provenance") === "provenance")
            .length,
        });
      } catch {
        if (!cancelled) setCounts(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function resolvePaste(): Promise<string | null> {
    const a = address.trim();
    if (!a) return null;
    setResolving(true);
    setResolveError(null);
    try {
      const r = await resolveTargetClient(a);
      if (!r.ok) {
        setResolveError(r.error);
        return null;
      }
      if (r.address !== a.toLowerCase()) onAddress(r.address);
      return r.address;
    } finally {
      setResolving(false);
    }
  }

  async function submit() {
    const a = await resolvePaste();
    if (!a) return;
    onOpenCase(a);
  }

  async function runAgents() {
    const a = await resolvePaste();
    if (!a) return;
    if (onOpenAgents) onOpenAgents();
    else onOpenCase(a);
  }

  return (
    <section className="rise" style={{ paddingTop: 8 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <SectionMark>SECURITY MEMORY FOR AGENTS</SectionMark>
        <StatusPill>MAINNET EVIDENCE · SEPOLIA MEMORY</StatusPill>
      </div>

      {/* Brand-first hero: mark is the signal; wordmark secondary; thesis follows */}
      <div
        style={{
          marginTop: 28,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 20,
          alignItems: "end",
        }}
        className="home-hero"
      >
        <div>
          <BrandMark
            size={112}
            style={{
              marginBottom: 18,
              filter: "drop-shadow(0 18px 40px color-mix(in srgb, var(--ink) 18%, transparent))",
            }}
          />
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(48px, 9vw, 80px)",
              fontWeight: 500,
              letterSpacing: "-0.04em",
              lineHeight: 0.9,
              color: "var(--ink)",
            }}
          >
            saviour
          </p>
          <h1
            style={{
              margin: "18px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(26px, 4.2vw, 40px)",
              fontWeight: 500,
              letterSpacing: "-0.025em",
              lineHeight: 1.08,
              maxWidth: 640,
            }}
          >
            Investigate once.
            <br />
            <MarkMark>Remember forever.</MarkMark>
          </h1>
          <p
            style={{
              margin: "16px 0 0",
              fontSize: 16,
              color: "var(--ink-muted)",
              maxWidth: 520,
              lineHeight: 1.55,
            }}
          >
            When a threat is verified on The Graph, saviour{" "}
            <strong style={{ color: "var(--ink)" }}>names it on ENSv2</strong>.
            The next agent resolves that name for{" "}
            <strong style={{ color: "var(--ink)" }}>0 Graph · 0 AI</strong> —
            Shield, cast, or MCP.
          </p>
          <p
            style={{
              margin: "12px 0 0",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.04em",
              color: "var(--ink-muted)",
            }}
          >
            Named by evidence, never by opinion.
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: 22,
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
        }}
      >
        <span>// built on</span>
        <span style={{ color: "var(--ink)" }}>The Graph</span>
        <span aria-hidden>·</span>
        <span style={{ color: "var(--ink)" }}>ENS</span>
        <span aria-hidden>·</span>
        <span style={{ color: "var(--ink)" }}>Bazantic</span>
        <span aria-hidden>·</span>
        <span>evidence mainnet · memory sepolia</span>
      </div>

      <div style={{ marginTop: 26, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <input
          value={address}
          onChange={(e) => {
            onAddress(e.target.value.trim());
            setResolveError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void runAgents();
          }}
          style={{ ...fieldStyle, maxWidth: 480 }}
          placeholder="0x… or ENS (jaredfromsubway.eth)"
          spellCheck={false}
          aria-label="Address or ENS name"
        />
        <button
          type="button"
          onClick={() => void runAgents()}
          disabled={resolving}
          style={btnPrimary}
        >
          {resolving ? "Resolving…" : "↓ Run agents"}
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={resolving}
          style={btnGhost}
        >
          Open case
        </button>
      </div>
      {resolveError ? (
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--block)",
          }}
        >
          {resolveError}
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 12,
        }}
      >
        {HOME_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => {
              onAddress(chip.address);
              if (onOpenAgents) onOpenAgents();
              else onOpenShield(chip.address);
            }}
            style={chipStyle}
            title="Opens Agents demo — film-first path"
          >
            Try {chip.plain}
          </button>
        ))}
      </div>

      {/* Below-fold: numbered loop — Kollateral 01/02/03, not first-viewport clutter */}
      <div style={{ marginTop: 48 }}>
        <SectionMark>HOW THE LEDGER WORKS</SectionMark>
        <h2 style={h2}>Named by evidence, never by opinion.</h2>
        <p style={lead}>
          One composition for agents: pay Graph once, write ENS forever, resolve free.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 10,
            marginTop: 16,
          }}
        >
          {(
            [
              {
                n: "01",
                cat: "INVESTIGATE",
                title: "Graph verifies",
                body: "Messari × 8 + rules. AI explains; code decides.",
              },
              {
                n: "02",
                cat: "NAME",
                title: "ENS remembers",
                body: "<address>.saviours.eth — status, threat, evidenceHash.",
              },
              {
                n: "03",
                cat: "RESOLVE",
                title: "Next agent is free",
                body: "Shield / cast / Bazantic shieldCheck — 0 Graph · 0 AI.",
              },
            ] as const
          ).map((step) => (
            <div
              key={step.n}
              style={{
                padding: "16px 16px 18px",
                borderTop: "2px solid var(--ink)",
                background: "color-mix(in srgb, var(--surface) 80%, transparent)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  color: "var(--signal)",
                }}
              >
                {step.n} · {step.cat}
              </p>
              <p
                style={{
                  margin: "10px 0 0",
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                }}
              >
                {step.title}
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 14,
                  color: "var(--ink-muted)",
                  lineHeight: 1.45,
                }}
              >
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 36 }}>
        <SectionMark>THREE STOPS · IF YOU PREFER CLICKS</SectionMark>
        <h2 style={h2}>A short walkthrough</h2>
        <p style={lead}>
          Optional path for first-timers. Film opens on Agents, not this syllabus.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          <WalkCard
            n="1"
            ask="What do two agents pay?"
            doLabel="Agents · A then B"
            detail="Agent A investigates + names. Agent B Shield-checks and cancels — 0 Graph · 0 AI."
            onClick={() => onOpenAgents?.()}
            primary
          />
          <WalkCard
            n="2"
            ask="Is this address already named?"
            doLabel="Shield · memory check"
            detail="Paste ATTACK-1. You should see BLOCK from ENS — no Graph, no AI on the hit."
            onClick={() => onOpenShield(address.trim() || HOME_CHIPS[0].address)}
          />
          <WalkCard
            n="3"
            ask="How did we earn that name?"
            doLabel="Case · investigate"
            detail="Force-fresh fan-out: one Messari template across pinned deployments. Rules mint TAINTED; AI only explains."
            onClick={() => onOpenCase(address.trim() || HOME_CHIPS[0].address)}
          />
        </div>
        {onOpenSurface ? (
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--ink-muted)" }}>
            After Registry, jump to{" "}
            <button
              type="button"
              onClick={onOpenSurface}
              style={{
                border: "none",
                background: "none",
                padding: 0,
                color: "var(--signal)",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Devs → cast / MCP
            </button>
            .
          </p>
        ) : null}
      </div>

      <div style={{ ...markGrid, marginTop: 32 }}>
        <MetricCard
          label="Graph-verified now"
          value={counts?.graph ?? "—"}
          hint="Live ATTACK-1 · BOT-1 only"
          accent
        />
        <MetricCard
          label="Second resolve"
          value="0 · 0"
          hint="Graph · AI on Shield MEMORY HIT"
          accent
        />
        <MetricCard
          label="Indexed cases"
          value={counts?.cases ?? "—"}
          hint={`Live ${counts?.live ?? "—"} · seeded ${counts?.seeded ?? "—"}`}
        />
        <MetricCard
          label="Your memory hits"
          value={memoryHits}
          hint="This browser only"
        />
      </div>

      <DarkThesis
        headline={
          <>
            The Graph buys the finding. ENS makes the{" "}
            <MarkMark>second</MarkMark> check free.
          </>
        }
        body={
          <>
            First encounter: fan-out live Graph → deterministic signals → AI cites
            → validator decides → write ENS texts on{" "}
            <code>&lt;address&gt;.saviours.eth</code> (onchain key{" "}
            <code>saviours.status</code>). Next encounter: Shield reads that name
            first. Naming is the product — not ambient monitoring.
          </>
        }
        pills={["BLOCK · ENS", "WATCH · WARN", "ESCALATE · UNKNOWN", "0 · 0"]}
      />

      <div style={{ marginTop: 40 }}>
        <SectionMark>WHY GRAPH · WHY ENS</SectionMark>
        <h2 style={h2}>Evidence and memory are different jobs.</h2>
        <p style={lead}>
          One partner answers “what happened onchain.” The other answers “what did
          we already decide.” Confusing them is how agents re-pay for the same
          investigation.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 0,
            marginTop: 18,
            border: "1px solid var(--line)",
            borderRadius: 4,
            overflow: "hidden",
            background: "var(--surface)",
          }}
        >
          <BuiltCol
            role="EVIDENCE"
            name="The Graph"
            points={[
              "Pinned Messari deployments — one standardized query template",
              "Eight protocols on the fan-out (+ Adapter A as a second Graph surface)",
              "Pays once when you investigate; never on a memory hit",
            ]}
          />
          <BuiltCol
            role="MEMORY"
            name="ENS"
            points={[
              "ENSv2 address-label + PermissionedResolver texts",
              "Any cast / MCP / plain HTML client can resolve without our server",
              "EAC roles cap who may write — permission, not theater",
            ]}
            last
          />
        </div>
      </div>

      <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          onClick={() => onOpenAgents?.()}
          style={btnPrimary}
        >
          1 · Run agents demo
        </button>
        <button
          type="button"
          onClick={() => onOpenShield(HOME_CHIPS[0].address)}
          style={btnGhostSoft}
        >
          2 · Shield ATTACK-1
        </button>
        {onOpenSurface ? (
          <button type="button" onClick={onOpenSurface} style={btnGhostSoft}>
            3 · cast / MCP surface
          </button>
        ) : null}
      </div>
    </section>
  );
}

function WalkCard({
  n,
  ask,
  doLabel,
  detail,
  onClick,
  primary,
}: {
  n: string;
  ask: string;
  doLabel: string;
  detail: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: 18,
        border: primary ? "1px solid var(--ink)" : "1px solid var(--line)",
        borderRadius: 4,
        background: primary ? "var(--ink)" : "var(--surface)",
        color: primary ? "var(--paper)" : "var(--ink)",
        cursor: "pointer",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          opacity: 0.7,
        }}
      >
        STOP {n}
      </p>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          lineHeight: 1.25,
        }}
      >
        {ask}
      </p>
      <p
        style={{
          margin: "12px 0 0",
          fontSize: 13,
          fontWeight: 600,
          color: primary ? "var(--signal-bright)" : "var(--signal)",
        }}
      >
        {doLabel} →
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          lineHeight: 1.45,
          opacity: primary ? 0.75 : 1,
          color: primary ? "var(--paper)" : "var(--ink-muted)",
        }}
      >
        {detail}
      </p>
    </button>
  );
}

function BuiltCol({
  role,
  name,
  points,
  last,
}: {
  role: string;
  name: string;
  points: string[];
  last?: boolean;
}) {
  return (
    <div
      style={{
        padding: 20,
        borderRight: last ? undefined : "1px solid var(--line)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--ink-muted)",
        }}
      >
        {role}
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 500,
        }}
      >
        {name}
      </p>
      <ul
        style={{
          margin: "14px 0 0",
          paddingLeft: 18,
          fontSize: 13,
          color: "var(--ink-muted)",
          lineHeight: 1.55,
        }}
      >
        {points.map((p) => (
          <li key={p} style={{ marginBottom: 8 }}>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

const h2: CSSProperties = {
  margin: "10px 0 0",
  fontFamily: "var(--font-display)",
  fontSize: "clamp(24px, 4vw, 32px)",
  fontWeight: 500,
  letterSpacing: "-0.02em",
  maxWidth: 640,
};

const lead: CSSProperties = {
  margin: "10px 0 0",
  fontSize: 14,
  color: "var(--ink-muted)",
  maxWidth: 560,
  lineHeight: 1.55,
};

const chipStyle: CSSProperties = {
  padding: "8px 14px",
  border: "1px solid var(--line)",
  borderRadius: 2,
  background: "var(--surface)",
  color: "var(--ink)",
  fontFamily: "var(--font-body)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const btnGhostSoft: CSSProperties = {
  padding: "11px 18px",
  border: "1px solid var(--ink)",
  borderRadius: 2,
  background: "transparent",
  color: "var(--ink)",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};
