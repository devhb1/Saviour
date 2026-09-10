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
      {/* Full-bleed night hero — brand + one thesis + one CTA + ENS visual plane */}
      <div
        className="home-hero-plane"
        style={{
          marginTop: 4,
          padding: "clamp(28px, 5vw, 48px) clamp(20px, 4vw, 40px) clamp(24px, 4vw, 36px)",
          borderRadius: 2,
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
              // SECURITY MEMORY FOR AGENTS
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
              fontSize: "clamp(28px, 4.5vw, 44px)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: 520,
              color: "var(--mark-on-night)",
            }}
          >
            Investigate once.
            <br />
            <span className="mark-sheen">Remember forever.</span>
          </h1>
          <p
            style={{
              margin: "16px 0 0",
              fontSize: 16,
              color: "color-mix(in srgb, var(--mark-on-night) 68%, transparent)",
              maxWidth: 460,
              lineHeight: 1.55,
            }}
          >
            The Graph verifies. ENS names. The next agent resolves for{" "}
            <strong style={{ color: "var(--mark-on-night)" }}>0 Graph · 0 AI</strong>.
          </p>

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
                title="Opens Agents demo"
              >
                Try {chip.plain}
              </button>
            ))}
          </div>
        </div>

        {/* Dominant visual: named memory plane */}
        <div className="rise-delay-2" style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 16 }}>
          <div
            className="stage-live"
            style={{
              padding: "22px 20px",
              border: "1px solid var(--night-line)",
              background: "color-mix(in srgb, var(--mark-on-night) 4%, transparent)",
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
              NAMED MEMORY · CAST-READY
            </p>
            <p
              style={{
                margin: "14px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(13px, 1.6vw, 15px)",
                color: "var(--mark-on-night)",
                wordBreak: "break-all",
                lineHeight: 1.45,
              }}
            >
              {attack.toLowerCase()}
              <span style={{ color: "var(--signal-bright)" }}>.saviours.eth</span>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: "1.1em",
                  marginLeft: 4,
                  background: "var(--signal-bright)",
                  verticalAlign: "text-bottom",
                  animation: "cursor-blink 1s step-end infinite",
                }}
              />
            </p>
            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <HeroStat label="saviours.status" value="TAINTED" hot />
              <HeroStat label="second resolve" value="0 · 0" />
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

      {/* Live ticker — not a card grid */}
      <div className="rise-delay-3" style={{ marginTop: 28 }}>
        <p
          style={{
            margin: "0 0 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "var(--ink-muted)",
          }}
        >
          Live right now · this host
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 0,
            borderTop: "1px solid var(--line)",
            borderBottom: "1px solid var(--line)",
          }}
          className="home-ticker"
        >
          <TickerCell label="Graph-verified" value={counts?.graph ?? "—"} hint="ATTACK-1 · BOT-1" accent />
          <TickerCell label="Second resolve" value="0 · 0" hint="Graph · AI on hit" accent />
          <TickerCell
            label="Indexed cases"
            value={counts?.cases ?? "—"}
            hint={`Live ${counts?.live ?? "—"} · seed ${counts?.seeded ?? "—"}`}
          />
          <TickerCell label="Your memory hits" value={memoryHits} hint="This browser" />
        </div>
      </div>

      <div style={{ marginTop: 52 }}>
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
            marginTop: 20,
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
          ).map((step, i) => (
            <div
              key={step.n}
              className="ledger-step"
              style={{
                padding: "20px 18px 22px",
                borderTop: "3px solid var(--ink)",
                borderRight: i < 2 ? "1px solid var(--line)" : undefined,
                background: "color-mix(in srgb, var(--surface) 70%, transparent)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  color: "var(--signal)",
                }}
              >
                {step.n} · {step.cat}
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
            alignItems: "end",
          }}
        >
          <div>
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
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 0,
            borderTop: "1px solid var(--line)",
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

function HeroStat({
  label,
  value,
  hot,
}: {
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          color: "color-mix(in srgb, var(--mark-on-night) 45%, transparent)",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "6px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: hot ? "var(--block)" : "var(--mark-on-night)",
        }}
      >
        {value}
      </p>
    </div>
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
    <div
      style={{
        padding: "16px 14px",
        borderRight: "1px solid var(--line)",
      }}
    >
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
          margin: "8px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 500,
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
      style={{
        padding: "22px 20px 24px",
        borderBottom: "1px solid var(--line)",
        borderRight: "1px solid var(--line)",
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
          fontSize: 13,
          color: "var(--ink-muted)",
          lineHeight: 1.55,
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

const h2: CSSProperties = {
  margin: "10px 0 0",
  fontFamily: "var(--font-display)",
  fontSize: "clamp(24px, 4vw, 34px)",
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

const heroChip: CSSProperties = {
  padding: "7px 12px",
  border: "1px solid var(--night-line)",
  borderRadius: 2,
  background: "transparent",
  color: "color-mix(in srgb, var(--mark-on-night) 80%, transparent)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  cursor: "pointer",
};
