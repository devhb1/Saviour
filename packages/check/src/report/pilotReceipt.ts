export type PilotReceiptInput = {
  operator: string;
  witness: string;
  safe: string;
  block: string;
  digest: string;
  pinUrl: string;
  coverageComplete: boolean;
  principals: { id: string; verdict: string }[];
  recordedAt: string;
};

/**
 * A file an operator can hand to someone else. It does not make the run
 * external, and it does not verify the names.
 */
export function pilotReceiptMarkdown(input: PilotReceiptInput): string {
  const operator = input.operator.trim() || "(unnamed)";
  const witness = input.witness.trim() || "(none yet)";
  const principals =
    input.principals.length === 0
      ? "- (no principals)"
      : input.principals
          .map((p) => `- ${p.id}: ${p.verdict}`)
          .join("\n");
  return `# Saviour pilot receipt

This file is an assertion by the people named below. Saviour does not check their identity.

A run counts toward adoption only when both are true:

1. The operator is outside the Saviour team.
2. A second person opens the pin URL, gets digest match, and writes their name as witness.

A team run, one run, or a receipt with no witness does not count.

- Operator: ${operator}
- Witness: ${witness}
- Safe: ${input.safe}
- Block: ${input.block}
- Digest: ${input.digest}
- Pin: ${input.pinUrl}
- Coverage complete: ${input.coverageComplete ? "true" : "false"}
- Recorded at: ${input.recordedAt}

## Reach

${principals}

Never SAFE. UNKNOWN is a result. This receipt does not claim a token amount.
`;
}
