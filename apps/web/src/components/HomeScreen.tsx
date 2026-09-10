"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { btnGhost, btnPrimary, fieldStyle, HOME_CHIPS } from "./AppShell";
import { fetchJson } from "../lib/fetchJson";
import { resolveTargetClient } from "../lib/resolveTargetClient";
import { SectionMark, StatusPill } from "./Mark";
import { BrandMark } from "./BrandMark";
import { WhatWeDont } from "./WhatWeDont";

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
  onOpenRegistry: _onOpenRegistry,
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
  void _onOpenRegistry;
  const [counts, setCounts] = useState<StripCounts | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    try {
      setGuideOpen(localStorage.getItem("saviours.home.guide.dismissed") !== "1");
    } catch {
      setGuideOpen(true);
    }
  }, []);

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

  const attack = HOME_CHIPS[0]?.address ?? "0x935bfb495e33f74d2e9735df1da66ace442ede48";

  return (
    <section className="rise" style={{ paddingTop: 4 }}>
      {/* Full-bleed night hero — brand + one thesis + one CTA + live activity */}
      <div
        className="home-hero-plane"
        style={{
          marginTop: 4,
          padding: "clamp(28px, 5vw, 48px) clamp(20px, 4vw, 40px) clamp(24px, 4vw, 36px)",
          borderRadius: "var(--radius-md)",
          minHeight: "min(72vh, 640px)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
          gap: "clamp(24px, 4vw, 48px)",
          alignItems: "end",
        }}
      >
        <div className="rise-delay-1">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.12em",
                color: "color-mix(in srgb, var(--mark-on-night) 55%, transparent)",
              }}
            >
              // COUNTERPARTY THREAT MEMORY
            </p>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "var(--signal-bright)",
                border: "1px solid color-mix(in srgb, var(--signal) 45%, transparent)",
                padding: "4px 10px",
              }}
            >
              LIVE · SEPOLIA MEMORY
            </span>
          </div>

          <BrandMark
            size={96}
            style={{
              marginBottom: 16,
              filter: "drop-shadow(0 20px 50px color-mix(in srgb, var(--signal) 35%, transparent))",
            }}
          />
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(52px, 10vw, 88px)",
              fontWeight: 500,
              letterSpacing: "-0.045em",
              lineHeight: 0.88,
              color: "var(--mark-on-night)",
            }}
          >
            saviour
          </p>
          <h1
            style={{
              margin: "20px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(26px, 4vw, 40px)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.12,
              maxWidth: 560,
              color: "var(--mark-on-night)",
            }}
          >
            This address drained a protocol.
            <br />
            <span className="mark-sheen">An agent is about to sign with it.</span>
          </h1>
          <p
            style={{
              margin: "16px 0 0",
              fontSize: 16,
              color: "color-mix(in srgb, var(--mark-on-night) 68%, transparent)",
              maxWidth: 480,
              lineHeight: 1.55,
            }}
          >
            We investigate once on The Graph, name it on ENS, and every agent after
            that gets{" "}
            <strong style={{ color: "var(--mark-on-night)" }}>BLOCK</strong> for{" "}
            <strong style={{ color: "var(--mark-on-night)" }}>0 Graph · 0 AI</strong>.
          </p>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {(
              [
                "ENS Best Use of ENSv2",
                "Graph Composable",
                "Bazantic Agentify",
              ] as const
            ).map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  padding: "5px 10px",
                  border: "1px solid color-mix(in srgb, var(--signal) 40%, var(--night-line))",
                  color: "color-mix(in srgb, var(--mark-on-night) 85%, transparent)",
                }}
              >
                {t}
              </span>
            ))}
          </div>

          <div
            style={{
              marginTop: 28,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "stretch",
            }}
          >
            <input
              value={address}
              onChange={(e) => {
                onAddress(e.target.value.trim());
                setResolveError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runAgents();
              }}
              className="field-focus"
              style={{
                ...fieldStyle,
                maxWidth: 420,
                flex: "1 1 240px",
                background: "color-mix(in srgb, var(--mark-on-night) 6%, transparent)",
                border: "1px solid var(--night-line)",
                color: "var(--mark-on-night)",
              }}
              placeholder="0x… or ENS"
              spellCheck={false}
              aria-label="Address or ENS name"
            />
            <button
              type="button"
              onClick={() => void runAgents()}
              disabled={resolving}
              className="btn-primary-motion"
              style={{
                ...btnPrimary,
                background: "var(--signal)",
                color: "var(--night)",
                padding: "12px 22px",
              }}
            >
              {resolving ? "Resolving…" : "Run agents →"}
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={resolving}
              style={{
                ...btnGhost,
                borderColor: "var(--night-line)",
                color: "var(--mark-on-night)",
              }}
            >
              Open case
            </button>
          </div>
          {resolveError ? (
            <p
              style={{
                margin: "10px 0 0",
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
              marginTop: 14,
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
                style={heroChip}
                aria-label={`Try ${chip.plain} — opens Agents demo`}
              >
                Try {chip.plain}
              </button>
            ))}
          </div>
        </div>

        {/* Mockup-inspired live activity card — real ATTACK-1 data only */}
        <div
          className="rise-delay-2"
          style={{
            alignSelf: "stretch",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: 14,
          }}
        >
          <div
            className="stage-live activity-card"
            style={{
              padding: "18px 18px 16px",
              borderRadius: 12,
              border: "1px solid color-mix(in srgb, var(--signal-bright) 35%, var(--night-line))",
              background:
                "linear-gradient(165deg, color-mix(in srgb, var(--mark-on-night) 9%, transparent), color-mix(in srgb, var(--mark-on-night) 3%, transparent))",
              boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--mark-on-night) 10%, transparent)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: "var(--signal-bright)",
                }}
              >
                LATEST ACTIVITY
              </p>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "color-mix(in srgb, var(--mark-on-night) 50%, transparent)",
                }}
              >
                live · Sepolia
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "10px 1fr",
                gap: 12,
                alignItems: "start",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  marginTop: 4,
                  borderRadius: "50%",
                  background: "var(--block)",
                  boxShadow: "0 0 0 4px color-mix(in srgb, var(--block) 28%, transparent)",
                }}
              />
              <div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: 8,
                    alignItems: "baseline",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      color: "var(--mark-on-night)",
                    }}
                  >
                    ATTACK-1 named
                  </p>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--block)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    TAINTED · BLOCK
                  </span>
                </div>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(11px, 1.35vw, 13px)",
                    color: "color-mix(in srgb, var(--mark-on-night) 78%, transparent)",
                    wordBreak: "break-all",
                    lineHeight: 1.45,
                  }}
                >
                  {attack.toLowerCase()}
                  <span style={{ color: "var(--signal-bright)" }}>.saviours.eth</span>
                </p>
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <span style={activityChip}>0 Graph</span>
                  <span style={activityChip}>0 AI</span>
                  <span style={activityChipMuted}>second resolve · cast-ready</span>
                </div>
              </div>
            </div>
          </div>
          <div className="ens-marquee" aria-hidden>
            <span>
              Graph buys the finding · ENS makes the second check free · Shield $0 ·
              Bazantic settles investigate · AI explains · code decides ·
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .home-hero-plane {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
          }
        }
      `}</style>

      {/* Sourcemark-style thin-border metric strip — real counts only */}
      <div className="rise-delay-3" style={{ marginTop: 36 }}>
        {guideOpen ? (
          <div
            style={{
              marginBottom: 14,
              padding: "12px 14px",
              border: "1px solid color-mix(in srgb, var(--signal) 35%, var(--line))",
              borderRadius: "var(--radius-md)",
              background: "color-mix(in srgb, var(--signal) 5%, var(--surface))",
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--ink-muted)",
                lineHeight: 1.45,
                maxWidth: 520,
              }}
            >
              New here? Run{" "}
              <strong style={{ color: "var(--ink)", fontWeight: 600 }}>Agents</strong>{" "}
              on ATTACK-1 — Agent A pays Graph once; Agent B resolves free from ENS.
            </p>
            <button
              type="button"
              onClick={() => {
                setGuideOpen(false);
                try {
                  localStorage.setItem("saviours.home.guide.dismissed", "1");
                } catch {
                  // ignore
                }
              }}
              style={{
                ...btnGhost,
                padding: "6px 10px",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
              }}
            >
              Got it
            </button>
          </div>
        ) : null}
        <p
          style={{
            margin: "0 0 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "var(--ink-muted)",
          }}
        >
          // LIVE · THIS HOST
        </p>
        <div className="metric-strip home-ticker">
          <TickerCell label="Graph-verified" value={counts?.graph ?? "—"} hint="ATTACK-1 · BOT-1" accent />
          <TickerCell label="Second resolve" value="0 · 0" hint="Graph · AI on hit" accent />
          <TickerCell
            label="Indexed cases"
            value={counts?.cases ?? "—"}
            hint={`Live ${counts?.live ?? "—"} · seed ${counts?.seeded ?? "—"}`}
          />
          <TickerCell
            label="Your memory hits"
            value={memoryHits}
            hint="This browser · Shield / Agents only"
            accent={memoryHits > 0}
          />
        </div>
      </div>

      <div style={{ marginTop: 48 }}>
        <SectionMark>WHERE WE SIT</SectionMark>
        <h2 style={h2}>Public ENS memory for the counterparty — empty quadrant.</h2>
        <p style={lead}>
          Mandate leashes your agent. We name the address on the other side.
        </p>
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "minmax(100px, 140px) 1fr 1fr",
            gap: 0,
            border: "1px solid color-mix(in srgb, var(--line) 75%, transparent)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            fontSize: 13,
            maxWidth: 720,
          }}
        >
          <div style={quadCorner} />
          <div style={quadHead}>Constrains YOUR agent</div>
          <div style={quadHead}>Evaluates COUNTERPARTY</div>
          <div style={quadSide}>Private / SaaS</div>
          <div style={quadCell}>AgentProof · Mandate</div>
          <div style={quadCell}>GoPlus · Blockaid · CIM</div>
          <div style={quadSide}>Public / ENS</div>
          <div style={quadCell}>Mandate (permissions)</div>
          <div
            style={{
              ...quadCell,
              background: "color-mix(in srgb, var(--signal) 10%, var(--surface))",
              borderTop: "2px solid var(--signal)",
              fontWeight: 600,
              color: "var(--signal)",
            }}
          >
            ◆ SAVIOURS ◆
          </div>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--ink-muted)", maxWidth: 560 }}>
          Shield checks are free forever. A fresh investigation costs $0.01, metered
          by Bazantic.
        </p>
      </div>

      <div style={{ marginTop: 56 }}>
        <SectionMark>HOW THE LEDGER WORKS</SectionMark>
        <h2 style={h2}>Named by evidence, never by opinion.</h2>
        <p style={lead}>
          One composition for agents: pay Graph once, write ENS forever, resolve free.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 0,
            marginTop: 22,
            border: "1px solid color-mix(in srgb, var(--line) 75%, transparent)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            background: "var(--surface)",
          }}
        >
          {(
            [
              {
                n: "01",
                cat: "INVESTIGATE",
                title: "Graph verifies",
                body: "Messari × 8 + rules. AI explains; code decides.",
                product: false,
              },
              {
                n: "02",
                cat: "NAME",
                title: "ENS remembers",
                body: "<address>.saviours.eth — status, threat, evidenceHash.",
                product: false,
              },
              {
                n: "03",
                cat: "RESOLVE",
                title: "Next agent is free",
                body: "Shield / cast / Bazantic shieldCheck — 0 Graph · 0 AI.",
                product: true,
              },
            ] as const
          ).map((step, i) => (
            <div
              key={step.n}
              className={step.product ? "ledger-step ledger-product" : "ledger-step"}
              style={{
                padding: "22px 20px 24px",
                borderTop: step.product ? "3px solid var(--signal)" : "3px solid var(--ink)",
                borderRight:
                  i < 2
                    ? "1px solid color-mix(in srgb, var(--line) 75%, transparent)"
                    : undefined,
                background: step.product
                  ? "color-mix(in srgb, var(--signal) 6%, var(--surface))"
                  : "var(--surface)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  color: step.product ? "var(--signal)" : "var(--ink-muted)",
                }}
              >
                {step.n} · {step.cat}
                {step.product ? " · THE PRODUCT" : ""}
              </p>
              <p
                style={{
                  margin: "12px 0 0",
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                }}
              >
                {step.title}
              </p>
              <p
                style={{
                  margin: "10px 0 0",
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

      <WhatWeDont />

      <div style={{ marginTop: 48 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-end",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 240px" }}>
            <SectionMark>WHY GRAPH · WHY ENS · WHY BAZANTIC</SectionMark>
            <h2 style={h2}>Three jobs. One loop.</h2>
          </div>
          <StatusPill>LOAD-BEARING PARTNERS</StatusPill>
        </div>
        <p style={lead}>
          Evidence, memory, and settlement stay separate — so the second agent never
          re-pays for a finding that already has a name.
        </p>
        <div
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          <PartnerRow
            role="EVIDENCE"
            name="The Graph"
            points={[
              "One Messari template × eight pinned deployments",
              "Pays once on investigate — never on MEMORY HIT",
            ]}
          />
          <PartnerRow
            role="MEMORY"
            name="ENS"
            points={[
              "Address-label + PermissionedResolver texts",
              "cast / MCP / plain HTML — no saviour server required",
            ]}
          />
          <PartnerRow
            role="SETTLEMENT"
            name="Bazantic"
            points={[
              "Shield stays $0 · investigate settles via x402",
              "MCP + OpenAPI for agents that never open this UI",
            ]}
          />
        </div>
      </div>

      <div style={{ marginTop: 40, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          onClick={() => onOpenAgents?.()}
          className="btn-primary-motion"
          style={btnPrimary}
        >
          Run agents demo
        </button>
        {onOpenSurface ? (
          <button type="button" onClick={onOpenSurface} style={btnGhost}>
            cast / MCP surface
          </button>
        ) : null}
      </div>

      <style>{`
        @media (max-width: 720px) {
          .home-ticker { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function TickerCell({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="metric-cell">
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: accent ? "var(--signal)" : "var(--ink)",
        }}
      >
        {value}
      </p>
      <p
        style={{
          margin: "6px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-muted)",
        }}
      >
        {hint}
      </p>
    </div>
  );
}

function PartnerRow({
  role,
  name,
  points,
}: {
  role: string;
  name: string;
  points: string[];
}) {
  return (
    <div
      className="soft-surface"
      style={{
        padding: "22px 20px 24px",
        borderRadius: "var(--radius-md)",
        border: "1px solid color-mix(in srgb, var(--line) 55%, transparent)",
        background: "var(--surface)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "var(--signal)",
        }}
      >
        {role}
      </p>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: "-0.02em",
        }}
      >
        {name}
      </p>
      <ul
        style={{
          margin: "14px 0 0",
          paddingLeft: 18,
          color: "var(--ink-muted)",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {points.map((p) => (
          <li key={p} style={{ marginBottom: 6 }}>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

const activityChip: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.04em",
  padding: "5px 10px",
  borderRadius: 6,
  border: "1px solid color-mix(in srgb, var(--signal-bright) 40%, transparent)",
  color: "var(--signal-bright)",
  background: "color-mix(in srgb, var(--signal) 14%, transparent)",
};

const activityChipMuted: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.02em",
  padding: "5px 10px",
  borderRadius: 6,
  border: "1px solid var(--night-line)",
  color: "color-mix(in srgb, var(--mark-on-night) 55%, transparent)",
};

const quadCorner: CSSProperties = {
  padding: "10px 12px",
  background: "var(--paper-deep)",
  borderBottom: "1px solid var(--line)",
  borderRight: "1px solid var(--line)",
};

const quadHead: CSSProperties = {
  padding: "10px 12px",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.06em",
  color: "var(--ink-muted)",
  background: "var(--paper-deep)",
  borderBottom: "1px solid var(--line)",
  borderRight: "1px solid var(--line)",
};

const quadSide: CSSProperties = {
  padding: "14px 12px",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-muted)",
  background: "var(--paper-deep)",
  borderBottom: "1px solid var(--line)",
  borderRight: "1px solid var(--line)",
};

const quadCell: CSSProperties = {
  padding: "14px 12px",
  borderBottom: "1px solid var(--line)",
  borderRight: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--ink)",
  lineHeight: 1.4,
};

const h2: CSSProperties = {
  margin: "10px 0 0",
  fontFamily: "var(--font-display)",
  fontSize: "clamp(26px, 3.5vw, 36px)",
  fontWeight: 500,
  letterSpacing: "-0.03em",
  color: "var(--ink)",
};

const lead: CSSProperties = {
  margin: "10px 0 0",
  fontSize: 15,
  color: "var(--ink-muted)",
  maxWidth: 560,
  lineHeight: 1.55,
};

const heroChip: CSSProperties = {
  padding: "7px 12px",
  borderRadius: 6,
  border: "1px solid var(--night-line)",
  background: "color-mix(in srgb, var(--mark-on-night) 5%, transparent)",
  color: "color-mix(in srgb, var(--mark-on-night) 75%, transparent)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  cursor: "pointer",
};

