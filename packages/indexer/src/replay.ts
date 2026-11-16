import { replayTermCritical } from "./poll.js";

async function main() {
  const alert = await replayTermCritical();
  console.log(JSON.stringify({ ok: true, alert }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
