/**
 * Short ENS story texts for resolve UI / cast — never huge JSON.
 */

import type { Evidence } from "../types";
import type { Signal } from "../evidence/signals";

const MAX = 120;

function clip(s: string, n = MAX): string {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

export function plainVerdictText(
  signals: Signal[],
  status: string,
): string {
  const ids = new Set(signals.map((s) => s.id));
  if (ids.has("FLASHLOAN_ONE_SHOT") && ids.has("ATOMIC_MULTI_PROTOCOL")) {
    return clip("Flashloan-funded same-tx multi-protocol drain");
  }
  if (ids.has("BOT_PROFILE")) {
    return clip("High flashloan volume · bot-like · not TAINTED");
  }
  if (ids.has("REGISTRY_COOCCURRENCE")) {
    return clip("Shared Graph counterparty with named threat");
  }
  if (status === "TAINTED") return clip("Threat verified from Graph signals");
  if (status === "WATCH") return clip("Under watch — insufficient for TAINTED");
  return clip(status);
}

/** Strongest same-tx multi-protocol hash from evidence (or empty). */
export function atomicTxFromEvidence(evidence: Evidence[]): string {
  const byTx = new Map<string, Set<string>>();
  for (const e of evidence) {
    if (!e.txHash || !e.protocol) continue;
    const t = e.txHash.toLowerCase();
    const set = byTx.get(t) ?? new Set();
    set.add(e.protocol);
    byTx.set(t, set);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [tx, protos] of byTx) {
    if (protos.size >= 2 && protos.size > bestN) {
      best = tx;
      bestN = protos.size;
    }
  }
  return best ?? "";
}

export function protocolsFromEvidence(evidence: Evidence[], txHash: string): string {
  if (!txHash) {
    const all = [
      ...new Set(
        evidence.map((e) => e.protocol).filter((p): p is string => Boolean(p)),
      ),
    ].sort();
    return clip(all.slice(0, 8).join(","), 100);
  }
  const protos = [
    ...new Set(
      evidence
        .filter((e) => e.txHash?.toLowerCase() === txHash.toLowerCase())
        .map((e) => e.protocol)
        .filter((p): p is string => Boolean(p)),
    ),
  ].sort();
  return clip(protos.join(","), 100);
}

export function buildStoryTextRecords(input: {
  signals: Signal[];
  status: string;
  evidence: Evidence[];
  rulesVersion?: string;
}): Record<string, string> {
  const atomicTx = atomicTxFromEvidence(input.evidence);
  const out: Record<string, string> = {
    "saviours.plainVerdict": plainVerdictText(input.signals, input.status),
    "saviours.rulesVersion": clip(input.rulesVersion ?? "pivot-3.3", 64),
  };
  if (atomicTx) {
    out["saviours.atomicTx"] = atomicTx;
    out["saviours.protocols"] = protocolsFromEvidence(input.evidence, atomicTx);
  }
  return out;
}
