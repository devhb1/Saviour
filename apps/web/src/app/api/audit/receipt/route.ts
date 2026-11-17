import { NextResponse } from "next/server";
import {
  pilotReceiptMarkdown,
  type AuthorityAuditReport,
} from "@saviours/check";
import { clientIp, rateLimitConsume } from "../../../../lib/rateLimit";

export const dynamic = "force-dynamic";

function isReport(value: unknown): value is AuthorityAuditReport {
  if (!value || typeof value !== "object") return false;
  const r = value as AuthorityAuditReport;
  return (
    r.product === "saviour-control-path-auditor" &&
    typeof r.safeAddress === "string" &&
    !!r.coverage
  );
}

/** Markdown an operator can hand to a witness. Names are not verified. */
export async function POST(req: Request) {
  const rl = rateLimitConsume(`receipt:${clientIp(req)}`, { capacity: 20 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate limit exceeded — retry shortly" },
      { status: 429 },
    );
  }

  let body: {
    report?: unknown;
    operator?: unknown;
    witness?: unknown;
    pinUrl?: unknown;
    digest?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }
  if (!isReport(body.report)) {
    return NextResponse.json({ error: "report is not an audit" }, { status: 400 });
  }
  const operator = typeof body.operator === "string" ? body.operator.trim() : "";
  if (operator.length < 2 || operator.length > 80) {
    return NextResponse.json(
      { error: "operator name is required" },
      { status: 400 },
    );
  }
  const witness = typeof body.witness === "string" ? body.witness.trim().slice(0, 80) : "";
  const pinUrl = typeof body.pinUrl === "string" ? body.pinUrl.trim().slice(0, 500) : "";
  if (!pinUrl.startsWith("http")) {
    return NextResponse.json(
      { error: "pin URL is missing — run the audit first" },
      { status: 400 },
    );
  }

  const digest = typeof body.digest === "string" ? body.digest.trim() : "";
  if (!/^[a-fA-F0-9]{64}$/.test(digest)) {
    return NextResponse.json(
      { error: "digest is missing — run the audit first" },
      { status: 400 },
    );
  }

  const markdown = pilotReceiptMarkdown({
    operator,
    witness,
    safe: body.report.safeAddress,
    block: body.report.freshness?.blockNumber ?? "",
    digest,
    pinUrl,
    coverageComplete: body.report.coverage.complete,
    principals: (body.report.reach?.principals ?? []).map((p) => ({
      id: p.principalId,
      verdict: p.verdict,
    })),
    recordedAt: new Date().toISOString(),
  });

  return NextResponse.json({ markdown });
}
