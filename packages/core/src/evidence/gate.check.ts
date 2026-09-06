import { getEvidenceForAddress } from "../index";

async function main() {
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const evidence = await getEvidenceForAddress(1, address);
  console.log("gate: evidence count", evidence.length);
  if (evidence.length === 0) {
    throw new Error("expected non-empty Evidence[] from live Graph");
  }

  const sources = new Set(evidence.map((e) => e.source));
  console.log("sources", [...sources]);

  if (![...sources].some((s) => s.includes("uniswap-v3-ethereum") && !s.includes("messari"))) {
    throw new Error("missing Adapter A source");
  }
  if (![...sources].some((s) => s.includes("messari"))) {
    throw new Error("missing Adapter B (Messari standardized) source");
  }

  for (const item of evidence) {
    if (!item.source || !item.reference || !item.claim || !item.rawHash) {
      throw new Error(`invalid evidence row: ${JSON.stringify(item)}`);
    }
  }

  console.log(
    "sample:",
    evidence.slice(0, 4).map((e) => ({
      id: e.id,
      source: e.source,
      claim: e.claim.slice(0, 100),
    })),
  );
  console.log("ok: evidence gate (Adapter A + B)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
