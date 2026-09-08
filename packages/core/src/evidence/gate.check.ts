/**
 * Live evidence gate — Messari fan-out + Adapter A + signals.
 *
 *   pnpm check:evidence
 *   pnpm check:evidence 0x935b…   # optional override address
 *
 * Defaults: ATTACK-1 then BENIGN-1 from evals/demo-targets.json.
 * Never uses static chain rows.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadRootEnv } from "../config/env";
import { getEvidenceBundle } from "./getEvidence";
import { signalIds } from "./signals";

loadRootEnv();

type Target = { id: string; address: string; expected?: string };

function loadTargets(): Target[] {
  const path = resolve(process.cwd(), "../../evals/demo-targets.json");
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      targets?: Target[];
    };
    return raw.targets ?? [];
  } catch {
    return [];
  }
}

function pickDefaults(): Target[] {
  const all = loadTargets();
  const attack = all.find((t) => t.id === "ATTACK-1");
  const benign = all.find((t) => t.id === "BENIGN-1");
  const out: Target[] = [];
  if (attack) out.push(attack);
  if (benign) out.push(benign);
  if (!out.length) {
    out.push({
      id: "ATTACK-1",
      address: "0x935bfb495e33f74d2e9735df1da66ace442ede48",
      expected: "TAINTED",
    });
  }
  return out;
}

async function checkOne(t: Target): Promise<void> {
  console.log(`\n--- ${t.id} ${t.address} ---`);
  const bundle = await getEvidenceBundle(1, t.address, { bypassCache: true });

  console.log(bundle.banner);
  console.log(
    `adapterA=${bundle.adapterACount}  totalEvidence=${bundle.evidence.length}`,
  );
  console.log(
    `signals=[${signalIds(bundle.signals).join(", ")}]  implied=${bundle.signalStatus.status} (${bundle.signalStatus.rule})`,
  );

  const sources = new Set(bundle.evidence.map((e) => e.source));
  console.log("sources", [...sources].slice(0, 12));

  const hasMessari = [...sources].some((s) => s.includes("messari"));
  const hasAdapterA = [...sources].some(
    (s) => s.includes("uniswap-v3-ethereum") && !s.includes("messari"),
  );

  if (!hasMessari && bundle.fanOut.protocolsError === bundle.fanOut.protocolsQueried) {
    throw new Error(`${t.id}: all Messari protocols errored — check GRAPH_API_KEY`);
  }

  // Protocol context rows always come back on healthy gateway even if address is empty
  if (bundle.fanOut.protocolsQueried < 8) {
    throw new Error(`${t.id}: expected 8 Messari protocols queried`);
  }

  if (t.id === "ATTACK-1") {
    if (bundle.evidence.length === 0) {
      throw new Error("ATTACK-1: expected non-empty live evidence");
    }
    if (!hasMessari) throw new Error("ATTACK-1: missing Messari fan-out sources");
    const ids = signalIds(bundle.signals);
    const threatish =
      ids.includes("FLASHLOAN_ONE_SHOT") ||
      ids.includes("ATOMIC_MULTI_PROTOCOL") ||
      ids.includes("FRESH_ACCOUNT");
    if (!ids.includes("FLASHLOAN_ONE_SHOT")) {
      throw new Error(
        `ATTACK-1: expected FLASHLOAN_ONE_SHOT, got [${ids.join(", ")}]`,
      );
    }
    console.log(
      `ATTACK-1 signal check OK (threat-related=${threatish}; ATOMIC may wait shared tx)`,
    );
    // Adapter A is best-effort — warn if missing but don't fail if Messari is strong
    if (!hasAdapterA) {
      console.warn("  note: Adapter A returned no rows (community subgraph thin for this addr)");
    }
  }

  if (t.id === "BENIGN-1") {
    const ids = signalIds(bundle.signals);
    const threat = bundle.signals.filter((s) => s.class === "threat");
    if (threat.length > 0) {
      throw new Error(
        `BENIGN-1: unexpected threat signals [${ids.join(", ")}]`,
      );
    }
    // Empty Graph → no NORMAL_USAGE; that's honest Coverage
    console.log(
      `BENIGN-1 OK — no threat signals (ids=[${ids.join(", ") || "none"}])`,
    );
  }

  for (const item of bundle.evidence.slice(0, 50)) {
    if (!item.source || !item.reference || !item.claim || !item.rawHash) {
      throw new Error(`invalid evidence row: ${JSON.stringify(item)}`);
    }
  }
}

async function main() {
  const override = process.argv[2];
  const targets = override
    ? [{ id: "CLI", address: override }]
    : pickDefaults();

  console.log("check:evidence — live fan-out + Adapter A + signals");
  for (const t of targets) {
    await checkOne(t);
  }
  console.log("\nok: evidence gate (fan-out + Adapter A + signals)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
