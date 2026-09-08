/**
 * Deterministic threat signals over Evidence (PIVOT §3.3).
 *
 * Pure functions — no Graph, no AI. Product paths feed live fan-out Evidence here;
 * evals may pass synthetic fixtures labeled unit-test-only.
 */

import type { Evidence, HexAddress } from "../types";

export const SIGNALS_VERSION = "0.1.0";

export type SignalId =
  | "FLASHLOAN_ONE_SHOT"
  | "ATOMIC_MULTI_PROTOCOL"
  | "DRAIN_FANIN"
  | "REGISTRY_COOCCURRENCE"
  | "FRESH_ACCOUNT"
  | "BOT_PROFILE"
  | "LIQUIDATED_VICTIM"
  | "NORMAL_USAGE";

export type SignalClass = "threat" | "amplifier" | "counter" | "neutral";

export type Signal = {
  id: SignalId;
  class: SignalClass;
  detail: string;
  /** Evidence ids that support this signal */
  evidenceIds: string[];
};

export type DeriveSignalsOptions = {
  /** Subject under investigation (lowercase). Used for drain direction heuristics. */
  address?: string;
  /**
   * Counterparties already TAINTED in ENS/registry (propagation).
   * Stub-friendly: pass a Set from a registry/ENS read in S1.4+.
   */
  taintedCounterparties?: Iterable<string>;
  /** Clock for fresh/drain windows (unix seconds). Default: now. */
  nowSec?: number;
};

const DAY = 86_400;
const ONE_SHOT_MAX_FL_COUNT = 5;
const ONE_SHOT_MIN_USD = 1_000_000;
const BOT_FL_COUNT = 500;
const BOT_SWAP_COUNT = 5_000;
const BOT_TINY_MEDIAN_USD = 1_000;
const DRAIN_MIN_IN_CPS = 10;
const DRAIN_OUT_SHARE = 0.8;
const FRESH_WINDOW = 7 * DAY;
const DRAIN_WINDOW = DAY;

function lc(addr: string | undefined): string | undefined {
  return addr?.toLowerCase();
}

function activityRows(evidence: Evidence[]): Evidence[] {
  return evidence.filter((e) => e.kind !== "protocol");
}

function median(nums: number[]): number | undefined {
  if (!nums.length) return undefined;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid];
}

/** Parse `flashloans=N` / `swaps=N` from account claims produced by fan-out. */
function parseAccountCounts(evidence: Evidence[]): {
  flashloanCount?: number;
  swapCount?: number;
  evidenceIds: string[];
} {
  let flashloanCount: number | undefined;
  let swapCount: number | undefined;
  const evidenceIds: string[] = [];
  for (const e of evidence) {
    if (e.kind !== "account") continue;
    evidenceIds.push(e.id);
    const fl = e.claim.match(/flashloans?=(\d+)/i);
    if (fl) flashloanCount = Number(fl[1]);
    const sw = e.claim.match(/swaps?=(\d+)/i);
    if (sw) swapCount = Number(sw[1]);
  }
  return { flashloanCount, swapCount, evidenceIds };
}

function flashloanEvents(evidence: Evidence[]): Evidence[] {
  return evidence.filter((e) => e.kind === "flashloan");
}

function swapEvents(evidence: Evidence[]): Evidence[] {
  return evidence.filter((e) => e.kind === "swap");
}

/**
 * Inbound value edges for DRAIN_FANIN: deposits, or swaps tagged flow=in via reference.
 * Convention for fixtures / Adapter A later: `reference` starts with `in:` or kind=deposit.
 */
function isInbound(e: Evidence): boolean {
  if (e.kind === "deposit") return true;
  if (e.kind === "swap" && e.reference.startsWith("in:")) return true;
  return false;
}

function isOutbound(e: Evidence): boolean {
  if (e.kind === "withdraw") return true;
  if (e.kind === "swap" && e.reference.startsWith("out:")) return true;
  return false;
}

function detectFlashloanOneShot(evidence: Evidence[]): Signal | null {
  const fls = flashloanEvents(evidence);
  const counts = parseAccountCounts(evidence);
  const count =
    counts.flashloanCount ??
    (fls.length > 0 ? fls.length : undefined);
  if (count === undefined) return null;
  if (count > ONE_SHOT_MAX_FL_COUNT) return null;

  const big = fls.filter((e) => (e.amountUSD ?? 0) >= ONE_SHOT_MIN_USD);
  if (!big.length) return null;

  const maxUsd = Math.max(...big.map((e) => e.amountUSD ?? 0));
  return {
    id: "FLASHLOAN_ONE_SHOT",
    class: "threat",
    detail: `flashloanCount=${count}≤${ONE_SHOT_MAX_FL_COUNT} and flashloan ≈$${maxUsd.toFixed(0)}≥${ONE_SHOT_MIN_USD}`,
    evidenceIds: [...new Set([...counts.evidenceIds, ...big.map((e) => e.id)])],
  };
}

function detectAtomicMultiProtocol(evidence: Evidence[]): Signal | null {
  const byTx = new Map<string, Set<string>>();
  const idsByTx = new Map<string, string[]>();

  for (const e of evidence) {
    const tx = e.txHash?.toLowerCase();
    const protocol = e.protocol;
    if (!tx || !protocol || e.kind === "protocol" || e.kind === "account") continue;
    if (!byTx.has(tx)) byTx.set(tx, new Set());
    byTx.get(tx)!.add(protocol);
    const list = idsByTx.get(tx) ?? [];
    list.push(e.id);
    idsByTx.set(tx, list);
  }

  for (const [tx, protocols] of byTx) {
    if (protocols.size >= 2) {
      return {
        id: "ATOMIC_MULTI_PROTOCOL",
        class: "threat",
        detail: `tx ${tx.slice(0, 10)}… spans ${[...protocols].sort().join("+")}`,
        evidenceIds: idsByTx.get(tx) ?? [],
      };
    }
  }
  return null;
}

function detectDrainFanIn(evidence: Evidence[], nowSec: number): Signal | null {
  const windowStart = nowSec - DRAIN_WINDOW;
  const inWindow = evidence.filter(
    (e) => e.timestamp >= windowStart && e.timestamp <= nowSec,
  );

  const inbound = inWindow.filter((e) => isInbound(e) && e.counterparty);
  const cps = new Set(inbound.map((e) => lc(e.counterparty)!));
  if (cps.size < DRAIN_MIN_IN_CPS) return null;

  const outbound = inWindow.filter((e) => isOutbound(e) && e.counterparty);
  if (!outbound.length) return null;

  const byOut = new Map<string, number>();
  let totalOut = 0;
  for (const e of outbound) {
    const c = lc(e.counterparty)!;
    const usd = e.amountUSD ?? 0;
    totalOut += usd;
    byOut.set(c, (byOut.get(c) ?? 0) + usd);
  }
  if (totalOut <= 0) return null;

  let topCp = "";
  let topUsd = 0;
  for (const [c, usd] of byOut) {
    if (usd > topUsd) {
      topUsd = usd;
      topCp = c;
    }
  }
  const share = topUsd / totalOut;
  if (share < DRAIN_OUT_SHARE) return null;

  return {
    id: "DRAIN_FANIN",
    class: "threat",
    detail: `${cps.size} inbound counterparties in 24h; ${(share * 100).toFixed(0)}% out to ${topCp.slice(0, 10)}…`,
    evidenceIds: [...inbound, ...outbound].map((e) => e.id),
  };
}

function detectRegistryCooccurrence(
  evidence: Evidence[],
  tainted: Set<string>,
): Signal | null {
  if (!tainted.size) return null;
  const hits: Evidence[] = [];
  for (const e of evidence) {
    const c = lc(e.counterparty);
    if (c && tainted.has(c)) hits.push(e);
  }
  if (!hits.length) return null;
  const cps = [...new Set(hits.map((e) => lc(e.counterparty)!))];
  return {
    id: "REGISTRY_COOCCURRENCE",
    class: "threat",
    detail: `counterparty already TAINTED: ${cps.map((c) => c.slice(0, 10) + "…").join(", ")}`,
    evidenceIds: hits.map((e) => e.id),
  };
}

function detectFreshAccount(evidence: Evidence[]): Signal | null {
  const rows = activityRows(evidence).filter((e) => e.kind !== "account");
  if (rows.length < 2) return null;

  const first = rows.reduce((a, b) => (a.timestamp <= b.timestamp ? a : b));
  const largest = rows.reduce((a, b) =>
    (a.amountUSD ?? 0) >= (b.amountUSD ?? 0) ? a : b,
  );
  if ((largest.amountUSD ?? 0) <= 0) return null;
  // Must be a later large event after an earlier first touch
  if (largest.id === first.id || largest.timestamp <= first.timestamp) return null;
  const delta = largest.timestamp - first.timestamp;
  if (delta >= FRESH_WINDOW) return null;

  return {
    id: "FRESH_ACCOUNT",
    class: "amplifier",
    detail: `first activity ${delta}s before largest event (≤${FRESH_WINDOW}s)`,
    evidenceIds: [first.id, largest.id],
  };
}

function detectBotProfile(evidence: Evidence[]): Signal | null {
  const counts = parseAccountCounts(evidence);
  const flEvents = flashloanEvents(evidence);
  const swEvents = swapEvents(evidence);
  const flCount = counts.flashloanCount ?? flEvents.length;
  const swapCount = counts.swapCount ?? swEvents.length;

  const amounts = [...flEvents, ...swEvents]
    .map((e) => e.amountUSD)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const med = median(amounts);

  const highVolume =
    flCount >= BOT_FL_COUNT || swapCount >= BOT_SWAP_COUNT;
  const tinyMedian =
    med !== undefined && med < BOT_TINY_MEDIAN_USD && amounts.length >= 5;

  if (!highVolume && !tinyMedian) return null;
  // Prefer high-volume bot definition from PIVOT; tiny median alone is weak
  if (!highVolume) return null;

  return {
    id: "BOT_PROFILE",
    class: "counter",
    detail: `flashloanCount=${flCount}, swapCount=${swapCount}${med !== undefined ? `, median≈$${med.toFixed(0)}` : ""}`,
    evidenceIds: counts.evidenceIds.length
      ? counts.evidenceIds
      : [...flEvents, ...swEvents].slice(0, 5).map((e) => e.id),
  };
}

function detectLiquidatedVictim(evidence: Evidence[]): Signal | null {
  const liq = evidence.filter((e) => e.kind === "liquidate");
  if (!liq.length) return null;
  const asVictim = liq.filter((e) => /as liquidatee/i.test(e.claim));
  const asLiquidator = liq.filter((e) => /as liquidator/i.test(e.claim));
  if (!asVictim.length || asLiquidator.length) return null;
  return {
    id: "LIQUIDATED_VICTIM",
    class: "counter",
    detail: `liquidated ${asVictim.length}×, never liquidator`,
    evidenceIds: asVictim.map((e) => e.id),
  };
}

/**
 * Derive the PIVOT §3.3 signal set from Evidence.
 * Emits NORMAL_USAGE only when there is activity and no other signal fired.
 */
export function deriveSignals(
  evidence: Evidence[],
  opts: DeriveSignalsOptions = {},
): Signal[] {
  const nowSec = opts.nowSec ?? Math.floor(Date.now() / 1000);
  const tainted = new Set(
    [...(opts.taintedCounterparties ?? [])].map((a) => a.toLowerCase()),
  );

  const found: Signal[] = [];
  const push = (s: Signal | null) => {
    if (s) found.push(s);
  };

  push(detectFlashloanOneShot(evidence));
  push(detectAtomicMultiProtocol(evidence));
  push(detectDrainFanIn(evidence, nowSec));
  push(detectRegistryCooccurrence(evidence, tainted));
  push(detectFreshAccount(evidence));
  push(detectBotProfile(evidence));
  push(detectLiquidatedVictim(evidence));

  const active = activityRows(evidence);
  if (active.length > 0 && found.length === 0) {
    found.push({
      id: "NORMAL_USAGE",
      class: "neutral",
      detail: "activity present; no threat/amplifier/counter signals",
      evidenceIds: active.slice(0, 8).map((e) => e.id),
    });
  }

  return found;
}

export function signalIds(signals: Signal[]): SignalId[] {
  return signals.map((s) => s.id);
}

export function hasThreatSignal(signals: Signal[]): boolean {
  return signals.some((s) => s.class === "threat");
}

/**
 * Status ceiling implied by signals alone (validator wiring = S2.1).
 * TAINTED ⇐ (ONE_SHOT ∧ ATOMIC) ∨ DRAIN ∨ REGISTRY
 * BOT_PROFILE caps at WATCH when it would otherwise escalate.
 */
export function statusFromSignals(signals: Signal[]): {
  status: "TAINTED" | "WATCH" | "SAFE" | "UNKNOWN";
  rule: string;
} {
  const ids = new Set(signalIds(signals));
  if (ids.size === 0) {
    return { status: "UNKNOWN", rule: "no-signals-no-rows" };
  }

  const bot = ids.has("BOT_PROFILE");
  const oneShot = ids.has("FLASHLOAN_ONE_SHOT");
  const atomic = ids.has("ATOMIC_MULTI_PROTOCOL");
  const drain = ids.has("DRAIN_FANIN");
  const registry = ids.has("REGISTRY_COOCCURRENCE");

  const taintedRule =
    (oneShot && atomic) || drain || registry;

  if (taintedRule) {
    if (bot && !drain && !registry) {
      // Bot with one-shot+atomic is still a bot-shaped pattern → WATCH max
      return {
        status: "WATCH",
        rule: "BOT_PROFILE caps TAINTED from ONE_SHOT∧ATOMIC",
      };
    }
    if (oneShot && atomic) {
      return { status: "TAINTED", rule: "FLASHLOAN_ONE_SHOT∧ATOMIC_MULTI_PROTOCOL" };
    }
    if (drain) return { status: "TAINTED", rule: "DRAIN_FANIN" };
    return { status: "TAINTED", rule: "REGISTRY_COOCCURRENCE" };
  }

  if (bot || ids.has("LIQUIDATED_VICTIM") || ids.has("FRESH_ACCOUNT")) {
    return { status: "WATCH", rule: "counter/amplifier-only" };
  }
  if (ids.has("NORMAL_USAGE")) {
    return { status: "SAFE", rule: "NORMAL_USAGE" };
  }
  return { status: "WATCH", rule: "residual-signals" };
}

/** Normalize a counterparty list for REGISTRY_COOCCURRENCE stubs. */
export function taintedSet(
  addresses: Iterable<string | HexAddress>,
): Set<string> {
  return new Set([...addresses].map((a) => a.toLowerCase()));
}
