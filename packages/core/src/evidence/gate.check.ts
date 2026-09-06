import { getEvidenceForAddress } from "../index";

async function main() {
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const evidence = await getEvidenceForAddress(1, address);
  console.log("gate: evidence count", evidence.length);
  if (evidence.length === 0) {
    throw new Error("expected non-empty Evidence[] from live Graph");
  }
  for (const item of evidence) {
    if (!item.source || !item.reference || !item.claim || !item.rawHash) {
      throw new Error(`invalid evidence row: ${JSON.stringify(item)}`);
    }
  }
  console.log(
    "sample:",
    evidence.slice(0, 3).map((e) => ({
      id: e.id,
      source: e.source,
      claim: e.claim.slice(0, 100),
    })),
  );
  console.log("ok: evidence gate");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
