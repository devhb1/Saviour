import { loadInitialQueues } from "./allowlist.js";
import { computeHealth } from "./health.js";

/** Stub runner — logs allowlist + health. Wire HyperSync/log-poll in follow-up. */
async function main() {
  const queues = loadInitialQueues();
  const health = computeHealth({
    lastProcessedBlock: null,
    updatedAtMs: null,
  });
  console.log(
    JSON.stringify(
      {
        queues: queues.length,
        sample: queues.map((q) => ({
          protocol: q.protocol,
          chainId: q.chainId,
          adapter: q.adapter,
        })),
        health,
        note: "Fund Base Sepolia + set REGISTRY to enable writers; INDEXER≠ATTESTER",
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
