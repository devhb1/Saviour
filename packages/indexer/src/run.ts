import { pollOnce } from "./poll.js";
import { computeHealth } from "./health.js";
import { loadTip } from "./store.js";

const INTERVAL_MS = Number(process.env.WATCH_POLL_MS ?? 60_000);

async function tick() {
  try {
    const result = await pollOnce();
    const tip = loadTip(1);
    const health = computeHealth({
      lastProcessedBlock: tip.lastProcessedBlock,
      tipBlock: result.to,
      updatedAtMs: tip.updatedAtMs,
    });
    console.log(
      JSON.stringify({
        polled: { from: result.from, to: result.to, logs: result.logs },
        alerts: result.alerts,
        health,
      }),
    );
  } catch (e) {
    console.error("[watch] poll failed", e);
  }
}

async function main() {
  const once = process.argv.includes("--once");
  console.log(
    JSON.stringify({
      mode: once ? "once" : "loop",
      intervalMs: INTERVAL_MS,
      note: "Privilege Guard Watch — Term allowlist · Telegram optional",
    }),
  );
  await tick();
  if (once) return;
  setInterval(() => {
    void tick();
  }, INTERVAL_MS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
