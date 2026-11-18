import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  toGoldenReport,
  verifyGoldenDigest,
  isShareableAuditStatus,
  type AuthorityAuditReport,
  type GoldenReport,
} from "@saviours/check";
import { clientIp, rateLimitConsume } from "../../../lib/rateLimit";

export const dynamic = "force-dynamic";

const STORE = join(process.cwd(), ".data", "reports");

async function ensureStore() {
  await mkdir(STORE, { recursive: true });
}

/**
 * Pin an audit as an immutable golden report (digest = sha256).
 * Normal pins require COMPLETE or PARTIAL. Pass diagnostic=1 for failed audits.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimitConsume(`report:${ip}`, { capacity: 30 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  try {
    const url = new URL(req.url);
    const diagnostic = url.searchParams.get("diagnostic") === "1";
    const body = (await req.json()) as { report?: AuthorityAuditReport };
    if (!body.report?.safeAddress) {
      return NextResponse.json(
        { error: "body.report (AuthorityAuditReport) required" },
        { status: 400 },
      );
    }
    const status = body.report.status;
    if (!status) {
      return NextResponse.json(
        { error: "body.report.status required" },
        { status: 400 },
      );
    }
    if (!diagnostic && !isShareableAuditStatus(status)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Refuse normal pin for status ${status}. Pass diagnostic=1 for a failed-audit export.`,
          status,
        },
        { status: 422 },
      );
    }

    const golden = toGoldenReport(body.report);
    if (!golden.reportDigest || !verifyGoldenDigest(golden)) {
      return NextResponse.json(
        { error: "digest verification failed" },
        { status: 500 },
      );
    }

    let stored = false;
    try {
      await ensureStore();
      const path = join(STORE, `${golden.reportDigest}.json`);
      await writeFile(path, JSON.stringify(golden), { encoding: "utf8" });
      stored = true;
    } catch {
      // Serverless FS may be read-only — still return digest + golden for download
      stored = false;
    }

    return NextResponse.json({
      ok: true,
      digest: golden.reportDigest,
      stored,
      golden,
      diagnostic: diagnostic || undefined,
      url: stored ? `/report/${golden.reportDigest}` : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

/** Load a pinned report by digest (query ?digest=). */
export async function GET(req: Request) {
  const digest = new URL(req.url).searchParams.get("digest");
  if (!digest || !/^[a-f0-9]{64}$/.test(digest)) {
    return NextResponse.json(
      { error: "digest=64 hex sha256 required" },
      { status: 400 },
    );
  }
  try {
    const raw = await readFile(join(STORE, `${digest}.json`), "utf8");
    const golden = JSON.parse(raw) as GoldenReport;
    return NextResponse.json({ ok: true, pinned: true, golden });
  } catch {
    return NextResponse.json(
      { error: "pinned report not found on this instance" },
      { status: 404 },
    );
  }
}
