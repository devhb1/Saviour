"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { btnPrimary, DEMO_TARGETS } from "./AppShell";
import { ErrorBanner } from "./ErrorBanner";
import { fetchJson } from "../lib/fetchJson";
import { writeHeaders } from "../lib/writeGuard";

const INVESTIGATOR = "investigator-01.saviours.eth";
const NEVER_NAMED = "0x1111111111111111111111111111111111111111";

type TextMap = Record<string, string>;

async function readTexts(ensName: string, keys: string[]): Promise<TextMap> {
  const out: TextMap = {};
  for (const key of keys) {
    try {
      const res = await fetch("/api/ens-text", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ensName, key }),
      });
      const json = (await res.json()) as { value?: string; error?: string };
      out[key] = json.value ?? "";
    } catch {
      out[key] = "";
    }
  }
  return out;
}

/**
 * Live ENSv2 integration surface:
 * agent namespace identity · record alias · honest wildcard miss.
 */
export function EnsPointsPanel({ address }: { address: string }) {
  const hero = DEMO_TARGETS[0]?.address ?? address;
  const [inv, setInv] = useState<TextMap | null>(null);
  const [alias, setAlias] = useState<{
    status: string;
    verdict: string;
    ensName: string;
  } | null>(null);
  const [wild, setWild] = useState<{
    named: { ensName: string; status: string };
    miss: { ensName: string; status: string };
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [eac, setEac] = useState<{
    reverted?: boolean;
    message?: string;
  } | null>(null);

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      const invKeys = [
        "name",
        "description",
        "url",
        "saviours.cannotWrite",
        "saviours.canWrite",
        "saviours.role",
        "saviours.model",
        "saviours.namesWritten",
      ];
      const invTexts = await readTexts(INVESTIGATOR, invKeys);
      setInv(invTexts);

      const ensName = `${hero.toLowerCase()}.saviours.eth`;
      const status = (await readTexts(ensName, ["saviours.status"]))[
        "saviours.status"
      ];
      const verdict = (await readTexts(ensName, ["saviours.verdict"]))[
        "saviours.verdict"
      ];
      setAlias({
        ensName,
        status: status ?? "",
        verdict: verdict ?? "",
      });

      const missName = `${NEVER_NAMED}.saviours.eth`;
      const missStatus = (await readTexts(missName, ["saviours.status"]))[
        "saviours.status"
      ];
      setWild({
        named: { ensName, status: status ?? "" },
        miss: { ensName: missName, status: missStatus ?? "" },
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ENS points load failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hero]);

  async function probeEac() {
    setEac(null);
    try {
      const json = await fetchJson<{
        reverted?: boolean;
        message?: string;
        error?: string;
      }>("/api/govern/eac-probe", {
        method: "POST",
        headers: { "content-type": "application/json", ...writeHeaders() },
        body: JSON.stringify({ address: hero }),
      });
      setEac({
        reverted: json.reverted ?? /revert/i.test(json.message ?? json.error ?? ""),
        message: json.message ?? json.error,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "EAC probe failed";
      setEac({ reverted: /revert/i.test(msg), message: msg });
    }
  }

  const box: CSSProperties = {
    flex: "1 1 280px",
    padding: 14,
    border: "1px solid var(--line)",
    borderRadius: "var(--r-md)",
    background: "var(--bg-raise)",
    minWidth: 0,
  };

  return (
    <div>
      <p
        style={{
          margin: "0 0 14px",
          fontSize: "var(--t-sm)",
          color: "var(--tx-lo)",
          maxWidth: 640,
          lineHeight: 1.5,
        }}
      >
        Full ENSv2 wiring on Sepolia — not a thin name wrapper. Hierarchical
        agent identity under <code>*.saviours.eth</code>, a stable{" "}
        <code>saviours.verdict</code> alias (mirrored write beside{" "}
        <code>saviours.status</code>), EAC role ceilings you can probe live, and
        an honest wildcard miss so unnamed resolves empty. Readable on a public
        path with no Saviours server — UNKNOWN is deliberate; UNKNOWN ≠ SAFE.
      </p>
      <button
        type="button"
        onClick={() => void load()}
        disabled={busy}
        style={{ ...btnPrimary, marginBottom: 14 }}
      >
        {busy ? "Reading ENS…" : "Refresh live ENS reads"}
      </button>
      {err ? (
        <div style={{ marginBottom: 12 }}>
          <ErrorBanner title="ENS read failed" detail={err} />
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <div style={box}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--sig)",
            }}
          >
            AGENT NAMESPACE
          </p>
          <p style={{ margin: "8px 0 0", fontWeight: 600, color: "var(--tx-hi)" }}>
            {INVESTIGATOR}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--tx)" }}>
            {inv?.name || "…"}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12,
              color: "var(--tx-lo)",
              lineHeight: 1.45,
            }}
          >
            {inv?.description || "Identity texts not loaded yet."}
          </p>
          <p
            style={{
              margin: "10px 0 0",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--tx-lo)",
            }}
          >
            cannotWrite → {inv?.["saviours.cannotWrite"] || "…"}
          </p>
          <button
            type="button"
            onClick={() => void probeEac()}
            style={{ ...btnPrimary, marginTop: 12 }}
          >
            Prove ceiling: probe dispute write
          </button>
          {eac ? (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 12,
                color: eac.reverted ? "var(--safe)" : "var(--warn)",
                lineHeight: 1.4,
              }}
            >
              {eac.reverted
                ? "Reverted — investigator cannot write saviours.dispute."
                : `Unexpected: ${eac.message ?? "no revert"}`}
            </p>
          ) : null}
        </div>

        <div style={box}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--sig)",
            }}
          >
            RECORD ALIAS
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color: "var(--tx-lo)",
              lineHeight: 1.45,
            }}
          >
            Integrators bind to <code>saviours.verdict</code> — a stable key. We
            version <code>saviours.status</code> underneath via a{" "}
            <strong>mirrored write</strong> (not resolver-level aliasing in the
            ENSv2 beta).
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 12,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 11, color: "var(--tx-faint)" }}>
                status
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: "var(--tx-hi)",
                }}
              >
                {alias?.status || "(empty)"}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: "var(--tx-faint)" }}>
                verdict
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: "var(--tx-hi)",
                }}
              >
                {alias?.verdict || "(empty)"}
              </p>
            </div>
          </div>
          <p
            style={{
              margin: "10px 0 0",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--tx-faint)",
              wordBreak: "break-all",
            }}
          >
            {alias?.ensName}
          </p>
          {alias && alias.status && alias.status === alias.verdict ? (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--safe)" }}>
              Match — alias holds.
            </p>
          ) : null}
        </div>

        <div style={box}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--sig)",
            }}
          >
            WILDCARD / HONEST MISS
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color: "var(--tx-lo)",
              lineHeight: 1.45,
            }}
          >
            An unnamed address resolves. It resolves to nothing. That&apos;s{" "}
            <code>UNKNOWN</code>, and <code>UNKNOWN</code> is never{" "}
            <code>SAFE</code>.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 12,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 11, color: "var(--tx-faint)" }}>
                named
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                }}
              >
                {wild?.named.status || "(empty)"}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: "var(--tx-faint)" }}>
                never registered
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                }}
              >
                {wild?.miss.status === "" || wild?.miss.status == null
                  ? "(empty)"
                  : wild.miss.status}
              </p>
            </div>
          </div>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--tx-faint)",
              wordBreak: "break-all",
            }}
          >
            miss → {wild?.miss.ensName}
          </p>
        </div>
      </div>
    </div>
  );
}
