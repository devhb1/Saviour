import { NextResponse } from "next/server";
import { aiModel, chat } from "@saviours/core";
import {
  acceptModelParaphrase,
  answerFromReport,
  explainAudit,
  type AuthorityAuditReport,
} from "@saviours/check";
import { clientIp, rateLimitConsume } from "../../../../lib/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isReport(value: unknown): value is AuthorityAuditReport {
  if (!value || typeof value !== "object") return false;
  const r = value as AuthorityAuditReport;
  return (
    r.product === "saviour-control-path-auditor" &&
    typeof r.safeAddress === "string" &&
    Array.isArray(r.findings) &&
    !!r.coverage &&
    Array.isArray(r.errors)
  );
}

/** Plain-language restatement of one audit. The model may paraphrase; it cannot add claims. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimitConsume(`explain:${ip}`, { capacity: 12 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate limit exceeded — retry shortly" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: { report?: unknown; question?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }
  if (!isReport(body.report)) {
    return NextResponse.json({ error: "report is not an audit" }, { status: 400 });
  }

  const question =
    typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  const explanation = explainAudit(body.report);
  const grounded = question ? answerFromReport(body.report, question) : null;

  if (!question) {
    return NextResponse.json({
      paragraphs: explanation.paragraphs,
      answer: null,
      source: "report",
    });
  }

  let answer = grounded;
  let source: "report" | "model" = "report";
  try {
    const result = await chat({
      messages: [
        {
          role: "system",
          content:
            "Paraphrase the audit brief for a treasury operator. Use only facts in the brief. Keep UNKNOWN as UNKNOWN. Never say the Safe is safe. Never invent a token amount. Never say an incident would have been prevented. If the brief does not answer, say the report does not contain that.",
        },
        {
          role: "user",
          content: `Brief:\n${explanation.brief}\n\nQuestion: ${question}\n\nGrounded answer, which you may rephrase and must not contradict:\n${grounded}`,
        },
      ],
    });
    const text = result.message.content ?? "";
    const gated = acceptModelParaphrase(text, `${explanation.brief}\n${grounded}`);
    if (gated.ok) {
      answer = gated.text;
      source = "model";
    }
  } catch {
    source = "report";
  }

  return NextResponse.json({
    paragraphs: explanation.paragraphs,
    answer,
    source,
    model: source === "model" ? aiModel() : null,
  });
}
