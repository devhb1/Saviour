#!/usr/bin/env tsx
/**
 * Instant pre-sign decode CLI — the product in one command.
 *
 *   pnpm review:cli
 *   pnpm review:cli --fixture term
 *   pnpm review:cli --data 0xebb2… --to 0x35C9… --safe 0x46DA…
 *   pnpm review:cli --json path/to/safe-tx.json
 *
 * Reads live Delay/Safe state when RPC is reachable (ETH_RPC_URL optional).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessAndExplain,
  computeSafeTxHash,
  readCurrentControls,
  type Hex,
} from "@saviours/check";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return undefined;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

async function main() {
  const fixture = arg("--fixture") ?? (hasFlag("--fixture") ? "term" : undefined);
  let to: Hex;
  let data: Hex;
  let safe: Hex;
  let chainId = Number(arg("--chain") ?? "1");
  let expectedHash: Hex | undefined;
  let safeTx:
    | {
        to: Hex;
        value: bigint;
        data: Hex;
        operation: 0 | 1;
        safeTxGas: bigint;
        baseGas: bigint;
        gasPrice: bigint;
        gasToken: Hex;
        refundReceiver: Hex;
        nonce: bigint;
      }
    | undefined;

  if (arg("--json")) {
    const raw = JSON.parse(readFileSync(arg("--json")!, "utf8"));
    const tx = raw.safeTx ?? raw;
    safe = (raw.safeAddress ?? arg("--safe")!) as Hex;
    chainId = Number(raw.chainId ?? chainId);
    safeTx = {
      to: tx.to as Hex,
      value: BigInt(tx.value ?? 0),
      data: tx.data as Hex,
      operation: Number(tx.operation ?? 0) as 0 | 1,
      safeTxGas: BigInt(tx.safeTxGas ?? 0),
      baseGas: BigInt(tx.baseGas ?? 0),
      gasPrice: BigInt(tx.gasPrice ?? 0),
      gasToken: (tx.gasToken ??
        "0x0000000000000000000000000000000000000000") as Hex,
      refundReceiver: (tx.refundReceiver ??
        "0x0000000000000000000000000000000000000000") as Hex,
      nonce: BigInt(tx.nonce ?? 0),
    };
    to = safeTx.to;
    data = safeTx.data;
    expectedHash = (raw.expectedSafeTxHash ?? undefined) as Hex | undefined;
  } else if (fixture === "term" || (!arg("--data") && !arg("--json"))) {
    const raw = JSON.parse(
      readFileSync(join(root, "fixtures/safe/term-prop5-review.json"), "utf8"),
    );
    safe = raw.safeAddress as Hex;
    chainId = raw.chainId;
    safeTx = {
      to: raw.safeTx.to as Hex,
      value: BigInt(raw.safeTx.value),
      data: raw.safeTx.data as Hex,
      operation: raw.safeTx.operation as 0 | 1,
      safeTxGas: BigInt(raw.safeTx.safeTxGas),
      baseGas: BigInt(raw.safeTx.baseGas),
      gasPrice: BigInt(raw.safeTx.gasPrice),
      gasToken: raw.safeTx.gasToken as Hex,
      refundReceiver: raw.safeTx.refundReceiver as Hex,
      nonce: BigInt(raw.safeTx.nonce),
    };
    to = safeTx.to;
    data = safeTx.data;
    expectedHash = raw.expectedSafeTxHash as Hex;
  } else {
    to = (arg("--to") ?? "0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33") as Hex;
    data = arg("--data") as Hex;
    safe = (arg("--safe") ??
      "0x46DA347d1Db6EdCA62BF6Cd5892Dc284fC938613") as Hex;
    if (!data?.startsWith("0x")) {
      console.error("Need --data 0x… or --fixture term or --json file");
      process.exit(1);
    }
  }

  console.log("=== Saviour Review CLI ===");
  console.log("to:", to);
  console.log("safe:", safe);
  console.log("chain:", chainId);

  const controls = await readCurrentControls({
    chainId,
    delayOrTimelock: to,
    safeAddress: safe,
  });
  if (controls.rpcError) {
    console.log("rpc:", "soft-fail —", controls.rpcError.slice(0, 120));
  } else {
    console.log(
      "on-chain:",
      `block=${controls.blockNumber}`,
      `cooldown=${controls.txCooldown ?? "n/a"}`,
      `expiration=${controls.txExpiration ?? "n/a"}`,
      `modules=${controls.modules?.length ?? "n/a"}`,
    );
  }

  const result = safeTx
    ? await assessAndExplain(
        {
          kind: "SAFE_TRANSACTION",
          chainId,
          safeAddress: safe,
          safeVersion: "1.3.0",
          safeTx,
          expectedSafeTxHash:
            expectedHash ??
            computeSafeTxHash({
              chainId,
              safeAddress: safe,
              safeTx,
            }),
        },
        { currentControls: controls },
      )
    : await assessAndExplain(
        {
          kind: "RAW_CALL",
          chainId,
          from: safe,
          to,
          value: 0n,
          data,
        },
        { currentControls: controls },
      );

  const status =
    result.decision === "WARN" || result.decision === "BLOCK_RECOMMENDATION"
      ? "CRITICAL/WARN"
      : result.decision;

  console.log("\n--- verdict ---");
  console.log(
    JSON.stringify(
      {
        status,
        decision: result.decision,
        coverage: result.coverage,
        integrity: result.integrity,
        plainEnglish: result.privilegeDiff.summary,
        privilegeDiff: result.privilegeDiff.claims.map((c) => ({
          control: c.control,
          before: c.before,
          after: c.after,
          source: c.source,
          ruleHint: c.severity,
        })),
        actions: result.actions.map((a) => ({
          selector: a.selectorHint,
          severity: a.severity,
        })),
        unknowns: result.privilegeDiff.unknowns,
      },
      null,
      2,
    ),
  );

  if (result.decision === "WARN" || result.decision === "BLOCK_RECOMMENDATION") {
    console.log("\n🛑 Privilege / control change detected — review before signing.");
  } else {
    console.log("\nNo privilege WARN from supported decoders (NO_VERDICT ≠ SAFE).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
