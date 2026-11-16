/** Pure operation lifecycle — mirrors on-chain OperationState rules. */

export type OpState =
  | "NONE"
  | "QUEUED"
  | "CANCELLED"
  | "VETOED"
  | "EXECUTED_QUARANTINE"
  | "EXPIRED";

export type Op = {
  opKey: string;
  state: OpState;
  opExpiresAt: number; // unix seconds; 0 = none
  quarantineUntil: number;
};

export const QUARANTINE_SECONDS = 72 * 60 * 60;

export function isRelevant(op: Op, now: number): boolean {
  if (op.state === "QUEUED") {
    if (op.opExpiresAt !== 0 && op.opExpiresAt < now) return false;
    return true;
  }
  if (op.state === "EXECUTED_QUARANTINE") {
    return op.quarantineUntil !== 0 && op.quarantineUntil >= now;
  }
  return false;
}

export function onCancel(op: Op): Op {
  if (op.state !== "QUEUED") throw new Error("BadOpTransition");
  return { ...op, state: "CANCELLED" };
}

export function onExecute(op: Op, now: number): Op {
  if (op.state !== "QUEUED") throw new Error("BadOpTransition");
  return {
    ...op,
    state: "EXECUTED_QUARANTINE",
    quarantineUntil: now + QUARANTINE_SECONDS,
  };
}

export function onExpire(op: Op, now: number): Op {
  if (op.state !== "QUEUED") throw new Error("BadOpTransition");
  if (op.opExpiresAt === 0 || op.opExpiresAt > now) throw new Error("BadOpTransition");
  return { ...op, state: "EXPIRED" };
}

export function hasRelevantCriticalOperation(ops: Op[], now: number): boolean {
  return ops.some((o) => isRelevant(o, now));
}
