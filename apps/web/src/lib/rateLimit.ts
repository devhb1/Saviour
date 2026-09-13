/**
 * In-memory per-IP rate limiter for costly / abuse-prone API routes.
 *
 * Ceiling: process-local Map — resets on cold start / multi-instance.
 * Best-effort anti-burn for Graph/AI keys, not production abuse protection.
 * Optional Upstash later — keep this zero-dep for Vercel serverless.
 */

import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Best-effort client IP behind Vercel / proxies. */
export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

/**
 * Sliding fixed window. Returns ok:false when over limit.
 */
export function takeToken(opts: {
  scope: string;
  ip: string;
  limit: number;
  windowMs: number;
}): { ok: true; remaining: number } | { ok: false; retryAfterSec: number } {
  const key = `${opts.scope}:${opts.ip}`;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + opts.windowMs };
    buckets.set(key, b);
  }
  if (b.count >= opts.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }
  b.count += 1;
  return { ok: true, remaining: opts.limit - b.count };
}

export function rateLimitJson(retryAfterSec: number, scope: string) {
  return NextResponse.json(
    {
      error: "rate_limited",
      message: `Too many ${scope} requests. Retry after ${retryAfterSec}s.`,
      retryAfterSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "Cache-Control": "no-store",
      },
    },
  );
}

/** Presets — costly routes tight; shield/resolve light anti-abuse. */
export const RATE = {
  evidence: { limit: 12, windowMs: 60_000 },
  /** Same Graph burn as POST /api/evidence — path form was ungated. */
  evidencePath: { limit: 12, windowMs: 60_000 },
  investigatePersist: { limit: 8, windowMs: 60_000 },
  /** Graph+AI without Remember — easy to burn OpenAI/Graph. */
  investigateEphemeral: { limit: 5, windowMs: 60_000 },
  ask: { limit: 10, windowMs: 60_000 },
  /** SSE demo that can forceFresh + settle. */
  agentStream: { limit: 8, windowMs: 60_000 },
  /** Live QuoterV2 + multi shieldCheck. */
  recipeSafeSwap: { limit: 20, windowMs: 60_000 },
  /** Paid investigate settle path. */
  payInvestigate: { limit: 12, windowMs: 60_000 },
  fingerprint: { limit: 20, windowMs: 60_000 },
  dossierFetch: { limit: 30, windowMs: 60_000 },
  shield: { limit: 90, windowMs: 60_000 },
  resolve: { limit: 90, windowMs: 60_000 },
} as const;
