import type { AuthorityAuditReport } from "../authority/types.js";

export type PlainExplanation = {
  paragraphs: string[];
  brief: string;
};

const AMOUNT =
  /\b\d[\d,]*(?:\.\d+)?\s*(?:usdc|dai|eth|weth|tokens?|usd)\b/gi;

/**
 * Sentences taken only from the report. This is the explanation a model
 * is allowed to paraphrase, and the answer used when the model is absent.
 */
export function explainAudit(report: AuthorityAuditReport): PlainExplanation {
  const paragraphs: string[] = [];
  const block = report.freshness?.blockNumber;
  paragraphs.push(
    block
      ? `This is a read of Safe ${report.safeAddress} at block ${block}. It says who can act. It does not say the Safe is safe.`
      : `This is a read of Safe ${report.safeAddress}. Freshness is missing, so the block is not pinned.`,
  );

  if (report.findings.length === 0) {
    paragraphs.push(
      "There are no findings. Absence of findings is not an endorsement. Check Coverage.",
    );
  } else {
    for (const f of report.findings) {
      paragraphs.push(`${f.severity}: ${f.title}. ${f.detail}`);
    }
  }

  paragraphs.push(
    report.coverage.complete
      ? "Coverage is complete for the components this engine assesses."
      : "Coverage is incomplete. An incomplete report is not a clean bill of health.",
  );

  for (const p of report.reach?.principals ?? []) {
    const why = p.reasons[0] ?? "No reason recorded.";
    paragraphs.push(`${p.principalId} is ${p.verdict}. ${why}`);
  }

  paragraphs.push(
    "Condition trees are counted, not turned into token amounts. UNKNOWN is a result, not a pass. This report does not claim it would have prevented a past incident.",
  );

  return { paragraphs, brief: paragraphs.join("\n") };
}

/** Answer a question from the report text. Does not call a model. */
export function answerFromReport(
  report: AuthorityAuditReport,
  question: string,
): string {
  const q = question.toLowerCase();
  const explained = explainAudit(report);
  const principals = report.reach?.principals ?? [];

  if (/how much|token|usdc|dai|amount|drain|quantity/.test(q)) {
    return "No token amount is in this report. Condition trees are counted and left UNKNOWN. This answer will not invent a quantity.";
  }
  if (/16 nov|november|prevent|would have|stopped the/.test(q)) {
    return "This engine does not claim it would have prevented an incident. Roles v1, including the 16 Nov module, is identified and not interpreted.";
  }
  if (/\bsafe\b|secure|all clear|no risk/.test(q)) {
    const coverage = report.coverage.complete ? "complete" : "incomplete";
    return `This product never stamps SAFE. Coverage on this report is ${coverage}. UNKNOWN is not an endorsement.`;
  }
  if (/owner|burn|dead|sign/.test(q)) {
    const owner = principals.find((p) => p.principalId === "owner-set");
    return owner
      ? `The owner set is ${owner.verdict}. ${owner.reasons[0] ?? ""}`.trim()
      : "This report has no owner-set principal.";
  }
  if (/who|module|role|act|reach|verdict/.test(q)) {
    if (principals.length === 0) return "This report has no Reach principals.";
    return principals
      .map((p) => `${p.principalId}: ${p.verdict}. ${p.reasons[0] ?? ""}`.trim())
      .join(" ");
  }
  return `From this report only:\n${explained.brief}`;
}

/**
 * Keep a model paraphrase only when it stays inside the brief.
 * A rejected paraphrase is not shown.
 */
export function acceptModelParaphrase(
  modelText: string,
  brief: string,
): { ok: true; text: string } | { ok: false; reason: string } {
  const text = modelText.trim();
  if (!text) return { ok: false, reason: "empty model text" };
  if (text.length > 4000) return { ok: false, reason: "model text too long" };

  const lower = text.toLowerCase();
  const scrubbed = lower
    .replace(/does not say the safe is safe/g, "")
    .replace(/never stamps safe/g, "")
    .replace(/\bnot safe\b/g, "")
    .replace(/\bisn't safe\b/g, "")
    .replace(/\bis not safe\b/g, "");
  if (
    /\bthe safe is safe\b/.test(scrubbed) ||
    /\bis safe to\b/.test(scrubbed) ||
    /\bno risk\b/.test(lower) ||
    /\ball clear\b/.test(lower) ||
    /\bfully constrained\b/.test(lower)
  ) {
    return { ok: false, reason: "model stamped a safety claim" };
  }
  if (/would have (prevented|stopped|caught|blocked)/.test(lower)) {
    return { ok: false, reason: "model claimed prevention" };
  }

  const briefAmounts = new Set(
    (brief.match(AMOUNT) ?? []).map((s) => s.toLowerCase()),
  );
  for (const hit of text.match(AMOUNT) ?? []) {
    if (!briefAmounts.has(hit.toLowerCase())) {
      return { ok: false, reason: "model invented a token amount" };
    }
  }
  return { ok: true, text };
}
