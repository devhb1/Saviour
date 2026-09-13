"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveTargetClient } from "../lib/resolveTargetClient";
import { Badge, Button, Field, Sheet, toneOf } from "../ui";
import { DEMO_TARGETS } from "./AppShell";
import { pushMeterEntry } from "./SessionMeter";
import { formatCostMeter } from "../lib/productStory";

type ShieldResult = {
  decision: string;
  reason?: string;
  source?: string;
  usedAi?: boolean;
  latencyMs?: number;
  ensName?: string | null;
  records?: Record<string, string>;
  cost?: { graphQueries?: number; aiCalls?: number; ensResolutions?: number };
};

/**
 * Global Shield — ⌘K / Ctrl+K opens; any address → verdict sheet.
 * This replaces Shield as a nav destination.
 */
export function CommandBar({
  onOpenPassport,
  onOpenCase,
  onMemoryHit,
}: {
  onOpenPassport?: (address: string) => void;
  onOpenCase?: (address: string) => void;
  onMemoryHit?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [check, setCheck] = useState<ShieldResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setCheck(null);
    setAddress(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reset]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open]);

  async function runCheck(raw: string) {
    const q = raw.trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    setCheck(null);
    try {
      const resolved = await resolveTargetClient(q);
      if (!resolved.ok) {
        setError(resolved.error);
        return;
      }
      setAddress(resolved.address);
      const res = await fetch("/api/shield/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 1,
          address: resolved.address,
          registryNetwork: "sepolia",
        }),
      });
      const json = (await res.json()) as {
        check?: ShieldResult;
        memoryHit?: unknown;
        error?: string;
      };
      if (!res.ok || !json.check) {
        setError(json.error || `Shield failed (${res.status})`);
        return;
      }
      setCheck(json.check);
      if (json.memoryHit) onMemoryHit?.();
      const hit = json.check.source === "ens" || json.check.source === "registry";
      pushMeterEntry({
        kind: "shield",
        label: `${json.check.decision} · ${resolved.address.slice(0, 10)}…`,
        usd: 0,
        ok: true,
      });
      if (hit) {
        // memory hit already $0
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Shield failed");
    } finally {
      setBusy(false);
    }
  }

  const decision = check?.decision ?? "";
  const status =
    check?.records?.["saviours.status"] ||
    (decision === "BLOCK"
      ? "TAINTED"
      : decision === "WARN"
        ? "WATCH"
        : decision === "ALLOW"
          ? "ALLOW"
          : decision === "ESCALATE"
            ? "ESCALATE"
            : "UNKNOWN");
  const tone = toneOf(decision || status);
  const isHit =
    check?.source === "ens" || check?.source === "registry";

  return (
    <>
      <button
        type="button"
        className="command-bar-trigger"
        onClick={() => {
          setOpen(true);
          reset();
        }}
        aria-label="Check address (⌘K)"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "7px 12px",
          border: "1px solid var(--line-mid)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-inset)",
          color: "var(--tx-lo)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          cursor: "pointer",
          minWidth: 180,
          maxWidth: 220,
        }}
      >
        <span style={{ color: "var(--tx-faint)" }}>⌘K</span>
        <span>Check address…</span>
      </button>

      <Sheet
        open={open}
        onClose={close}
        eyebrow="SHIELD · ANYWHERE"
        title="Check before you sign"
        width={440}
      >
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 13,
            color: "var(--tx-lo)",
            lineHeight: 1.45,
          }}
        >
          ENS-first. Never Graph. Never AI. MEMORY HIT = $0.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runCheck(query);
          }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <Field
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="0x… or ENS"
            style={{ flex: "1 1 200px" }}
            aria-label="Address or ENS"
          />
          <Button type="submit" disabled={busy || !query.trim()}>
            {busy ? "Checking…" : "Shield →"}
          </Button>
        </form>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {DEMO_TARGETS.slice(0, 3).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setQuery(t.address);
                void runCheck(t.address);
              }}
              style={{
                border: "1px solid var(--line)",
                background: "var(--bg-high)",
                color: "var(--tx-lo)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                padding: "5px 9px",
                borderRadius: "var(--r-sm)",
                cursor: "pointer",
              }}
            >
              {t.id}
            </button>
          ))}
        </div>

        {error ? (
          <p role="alert" style={{ marginTop: 16, color: "var(--red)", fontSize: 13 }}>
            {error}
          </p>
        ) : null}

        {check && address ? (
          <div
            className="stamp-in"
            style={{
              marginTop: 22,
              padding: "16px 16px",
              border: `1px solid ${tone.line}`,
              borderRadius: "var(--r-md)",
              background: tone.wash,
              borderLeft: `2px solid ${tone.color}`,
              boxShadow:
                tone.rail === "red"
                  ? "var(--glow-red)"
                  : tone.rail === "green"
                    ? "var(--glow-green)"
                    : tone.rail === "sig"
                      ? "var(--glow-sig)"
                      : "var(--edge)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  color: tone.color,
                }}
              >
                {decision || "—"}
              </p>
              <Badge status={status} />
            </div>

            <p
              style={{
                margin: "12px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--tx)",
                wordBreak: "break-all",
              }}
            >
              {address}
            </p>

            <dl
              style={{
                margin: "14px 0 0",
                display: "grid",
                gridTemplateColumns: "88px 1fr",
                gap: "8px 12px",
                fontSize: 13,
              }}
            >
              <dt style={dt}>source</dt>
              <dd style={dd}>
                {check.source ?? "—"}
                {check.ensName ? ` · ${check.ensName}` : ""}
              </dd>
              <dt style={dt}>cost</dt>
              <dd style={{ ...dd, color: isHit ? "var(--green)" : "var(--tx)" }}>
                {isHit
                  ? formatCostMeter(0, 0)
                  : `${check.cost?.graphQueries ?? 0} Graph · ${check.cost?.aiCalls ?? 0} AI`}
              </dd>
              <dt style={dt}>threat</dt>
              <dd style={dd}>
                {check.records?.["saviours.threat"] || check.reason || "—"}
              </dd>
              <dt style={dt}>latency</dt>
              <dd style={{ ...dd, fontVariantNumeric: "tabular-nums" }}>
                {check.latencyMs != null ? `${check.latencyMs} ms` : "—"}
              </dd>
            </dl>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {onOpenPassport ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onOpenPassport(address);
                    close();
                  }}
                >
                  Open passport
                </Button>
              ) : null}
              {onOpenCase ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onOpenCase(address);
                    close();
                  }}
                >
                  See evidence
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

const dt = {
  margin: 0,
  fontFamily: "var(--font-mono)" as const,
  fontSize: 11,
  letterSpacing: "0.06em",
  color: "var(--tx-faint)",
  textTransform: "uppercase" as const,
};

const dd = {
  margin: 0,
  color: "var(--tx)",
  lineHeight: 1.4,
  wordBreak: "break-word" as const,
};
