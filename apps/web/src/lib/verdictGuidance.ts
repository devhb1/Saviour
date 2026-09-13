/**
 * First-timer “what to do” lines for Case / Shield outcomes.
 * Named by evidence, never by opinion.
 */

export function whatToDoForStatus(status: string | null | undefined): string {
  switch ((status ?? "").toUpperCase()) {
    case "TAINTED":
      return "Do not sign or approve. Treat as named threat memory — open case only to audit evidence.";
    case "WATCH":
      return "Proceed with caution. Bot-like or incomplete signals — not proven theft. Do not overfit to TAINTED.";
    case "SAFE":
      return "No threat named in our memory for this address. Dated caveat — not a guarantee of future safety.";
    case "UNKNOWN":
    case "":
      return "Insufficient data — never treat blank as safe. Investigate (forceFresh) or escalate.";
    default:
      return "Read the plain verdict and evidence before acting. ENS stores findings; it does not decide them.";
  }
}

export function whatToDoForDecision(
  decision: string | null | undefined,
  status?: string | null,
): string {
  const d = (decision ?? "").toUpperCase();
  if (d === "BLOCK") {
    return "Cancel the transaction. Shield BLOCK from security memory — ENS resolve · $0 on a memory hit.";
  }
  if (d === "WARN") {
    return whatToDoForStatus(status ?? "WATCH");
  }
  if (d === "ALLOW") {
    return whatToDoForStatus(status ?? "SAFE");
  }
  if (d === "ESCALATE") {
    return whatToDoForStatus(status ?? "UNKNOWN");
  }
  return whatToDoForStatus(status);
}
