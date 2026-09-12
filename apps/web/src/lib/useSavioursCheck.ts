"use client";

import { useCallback, useEffect, useState } from "react";

export type SavioursCheckDecision = "BLOCK" | "WARN" | "ALLOW" | "ESCALATE";

export type SavioursCheckResult = {
  decision: SavioursCheckDecision;
  status: string;
  ensName: string | null;
  source: string;
  reason?: string;
  latencyMs?: number;
  usedAi?: boolean;
  cost: { graph: number; ai: number; usd: number };
};

/**
 * Browser hook — Shield via our gateway (same as ⌘K).
 * For zero-server ENS reads use `import { check } from "@saviours/check"` in Node.
 */
export function useSavioursCheck(address: string | null | undefined) {
  const [result, setResult] = useState<SavioursCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (addr?: string) => {
    const a = (addr ?? address ?? "").trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(a)) {
      setError("Need a 0x address");
      setResult(null);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shield/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 1,
          address: a,
          registryNetwork: "sepolia",
        }),
      });
      const json = (await res.json()) as {
        check?: {
          decision?: SavioursCheckDecision;
          reason?: string;
          source?: string;
          ensName?: string | null;
          latencyMs?: number;
          usedAi?: boolean;
          records?: Record<string, string> | null;
        };
        memoryHit?: { graphQueries?: number; aiCalls?: number } | null;
        error?: string;
      };
      if (!res.ok || !json.check?.decision) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      const fromRecords = (json.check.records?.["saviours.status"] ?? "")
        .trim()
        .toUpperCase();
      const out: SavioursCheckResult = {
        decision: json.check.decision,
        status:
          fromRecords ||
          (json.check.decision === "BLOCK"
            ? "TAINTED"
            : json.check.decision === "WARN"
              ? "WATCH"
              : json.check.decision === "ALLOW"
                ? "SAFE"
                : "UNKNOWN"),
        // Never invent a name — miss stays null (unnamed / escalate).
        ensName: json.check.ensName ?? null,
        source: json.check.source ?? "none",
        reason: json.check.reason,
        latencyMs: json.check.latencyMs,
        usedAi: json.check.usedAi,
        cost: {
          graph: json.memoryHit?.graphQueries ?? 0,
          ai: json.memoryHit?.aiCalls ?? 0,
          usd: 0,
        },
      };
      setResult(out);
      return out;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "check failed";
      setError(msg);
      setResult(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address && /^0x[a-fA-F0-9]{40}$/.test(address.trim())) {
      void run(address);
    }
  }, [address, run]);

  return { result, error, loading, refetch: run };
}
