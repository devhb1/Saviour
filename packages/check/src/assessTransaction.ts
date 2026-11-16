import { decodeTermLike, explainPrivilege } from "@saviours/queuewatch";
import type { PrivilegeExplanation } from "@saviours/queuewatch";
import type {
  AssessmentCoverage,
  AssessmentDecision,
  AssessmentIntegrity,
  DecodedActionNode,
  Hex,
  SecurityFindingRef,
  TransactionAssessment,
  TransactionAssessmentInput,
  UnsupportedAction,
} from "./assessTypes.js";
import { resolveBase, type BaseResolveOptions } from "./baseResolve.js";
import {
  computeSafeTxHashWithDomainName,
  extractSelectorHints,
  selectorLabel,
} from "./safeTxHash.js";

export type AssessOptions = {
  /** Optional live registry resolve for subjects */
  resolve?: BaseResolveOptions;
  /** Subjects to resolve in addition to to/safeAddress */
  extraSubjects?: Hex[];
  decoderVersion?: string;
};

export type AssessWithExplanation = TransactionAssessment & {
  explanation: PrivilegeExplanation;
};

function rankDecision(d: AssessmentDecision): number {
  if (d === "BLOCK_RECOMMENDATION") return 3;
  if (d === "WARN") return 2;
  return 1;
}

/**
 * V3 core: assess the transaction being considered (not just an address).
 * Static decode + optional registry memory. Never claims SAFE.
 */
export async function assessTransaction(
  input: TransactionAssessmentInput,
  opts: AssessOptions = {},
): Promise<TransactionAssessment> {
  const errors: TransactionAssessment["errors"] = [];
  const unsupportedActions: UnsupportedAction[] = [];
  const findings: SecurityFindingRef[] = [];
  const evidence: TransactionAssessment["evidence"] = [];
  let integrity: AssessmentIntegrity = "N_A";
  let coverage: AssessmentCoverage = "COMPLETE";

  let to: Hex;
  let data: Hex;
  let operation: 0 | 1 = 0;
  let value = 0n;
  let safeAddress: Hex | undefined;
  let chainId: number;

  if (input.kind === "SAFE_TRANSACTION") {
    chainId = input.chainId;
    safeAddress = input.safeAddress;
    to = input.safeTx.to;
    data = input.safeTx.data;
    operation = input.safeTx.operation;
    value = input.safeTx.value;

    const computed = computeSafeTxHashWithDomainName({
      chainId: input.chainId,
      safeAddress: input.safeAddress,
      safeVersion: input.safeVersion,
      safeTx: input.safeTx,
    });

    if (input.expectedSafeTxHash) {
      integrity =
        input.expectedSafeTxHash.toLowerCase() === computed.toLowerCase()
          ? "MATCH"
          : "MISMATCH";
      if (integrity === "MISMATCH") {
        errors.push({
          code: "SAFE_TX_HASH_MISMATCH",
          message:
            "Imported Safe tx hash does not match recomputed hash — do not treat this assessment as the transaction you will sign.",
        });
        coverage = "ERROR";
      }
    } else {
      integrity = "UNCHECKED";
      evidence.push({
        label: "computedSafeTxHash",
        chainId,
        txHash: computed,
        decoderVersion: opts.decoderVersion ?? "queuewatch@0.1",
      });
    }
  } else {
    chainId = input.chainId;
    to = input.to;
    data = input.data;
    value = input.value;
    integrity = "N_A";
  }

  if (integrity === "MISMATCH") {
    return {
      decision: "NO_VERDICT",
      coverage: "ERROR",
      integrity,
      actions: [],
      findings: [],
      unsupportedActions: [],
      freshness: [],
      evidence,
      errors,
      assessedAt: {
        chainId,
        blockNumber: 0n,
        blockHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      },
    };
  }

  const hints = extractSelectorHints(data);
  const labeled = hints.map(selectorLabel);

  const decode = decodeTermLike({
    rolesInner: labeled.map((selectorHint) => ({
      to,
      data,
      selectorHint,
    })),
  });

  if (operation === 1) {
    // force contextual DELEGATECALL note via unknown proxy path
    decode.actions.push({
      to,
      selectorHint: "DELEGATECALL",
      severity: "HIGH",
      registryWrite: "WATCH",
      path: ["outer", "DELEGATECALL"],
      note: "Outer DELEGATECALL — contextual; not auto-CRITICAL",
      operation: 1,
    });
  }

  const actions: DecodedActionNode[] = decode.actions.map((a, i) => ({
    id: `a${i}`,
    parentId: null,
    to: (a.to as Hex) ?? to,
    value: value.toString(),
    data,
    operation: (a.operation as 0 | 1) ?? operation,
    selectorHint: a.selectorHint,
    severity: a.severity,
    note: a.note,
  }));

  for (const a of decode.actions) {
    if (a.severity === "UNSUPPORTED") {
      unsupportedActions.push({
        id: a.selectorHint ?? "unknown",
        reason: a.note ?? "Unsupported adapter path",
        parentId: null,
      });
    }
  }

  if (!decode.supported || unsupportedActions.length > 0 || hints.length === 0) {
    coverage = "PARTIAL";
    if (hints.length === 0 && data !== "0x" && data.length > 2) {
      unsupportedActions.push({
        id: "opaque-calldata",
        reason: "No known privileged selectors recognized in calldata",
        parentId: null,
      });
    }
  }

  // Registry memory for relevant subjects
  const subjects = new Set<Hex>();
  if (safeAddress) subjects.add(safeAddress);
  subjects.add(to);
  for (const s of opts.extraSubjects ?? []) subjects.add(s);

  let decision: AssessmentDecision = "NO_VERDICT";

  if (decode.vaultWrite === "WATCH") {
    decision = "WARN";
  }

  if (opts.resolve) {
    for (const subject of subjects) {
      try {
        const r = await resolveBase(subject, {
          ...opts.resolve,
          subjectChainId: chainId,
        });
        const status =
          r.action === "BLOCK"
            ? "TAINTED"
            : r.action === "WARN"
              ? "WATCH"
              : "UNSET";
        findings.push({
          subject,
          status,
          findingId: r.findingId as Hex | undefined,
          evidenceHash: r.evidenceHash as Hex | undefined,
        });
        if (r.action === "BLOCK") {
          decision = "BLOCK_RECOMMENDATION";
        } else if (r.action === "WARN" && rankDecision(decision) < 2) {
          decision = "WARN";
        } else if (r.action === "RPC_ERROR") {
          coverage = coverage === "ERROR" ? "ERROR" : "STALE";
          errors.push({
            code: "RPC_ERROR",
            message: r.error ?? "Registry resolve failed",
          });
        }
        if (r.findingId) {
          evidence.push({
            label: `resolve:${subject.slice(0, 10)}`,
            chainId,
            decoderVersion: opts.decoderVersion ?? "queuewatch@0.1",
          });
        }
      } catch (e) {
        coverage = "ERROR";
        errors.push({
          code: "RESOLVE_THROW",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  } else {
    coverage = coverage === "COMPLETE" ? "PARTIAL" : coverage;
    evidence.push({
      label: "decode-only",
      chainId,
      decoderVersion: opts.decoderVersion ?? "queuewatch@0.1",
    });
  }

  // Never invent SAFE; empty decode with no findings stays NO_VERDICT
  if (actions.length === 0 && findings.every((f) => f.status === "UNSET")) {
    decision = "NO_VERDICT";
    if (coverage === "COMPLETE") coverage = "PARTIAL";
  }

  const base: TransactionAssessment = {
    decision,
    coverage,
    integrity,
    actions,
    findings,
    unsupportedActions,
    freshness: opts.resolve
      ? [{ source: "base-registry", lastBlock: null, stale: coverage === "STALE" }]
      : [{ source: "decode-only", lastBlock: null, stale: false }],
    evidence,
    errors,
    assessedAt: {
      chainId,
      blockNumber: 0n,
      blockHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
    },
  };

  return base;
}

/** Assess + English privilege narrative for Review / Telegram. */
export async function assessAndExplain(
  input: TransactionAssessmentInput,
  opts: AssessOptions = {},
): Promise<AssessWithExplanation> {
  const assessment = await assessTransaction(input, opts);
  const decode = decodeTermLike({
    rolesInner: assessment.actions.map((a) => ({
      to: a.to,
      data: a.data,
      selectorHint: a.selectorHint,
    })),
  });
  return {
    ...assessment,
    explanation: explainPrivilege(decode),
  };
}
