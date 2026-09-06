import { investigate } from "./investigate";

async function main() {
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  console.log("live investigate", address);
  const assessment = await investigate(1, address);
  console.log("status", assessment.status);
  console.log("confidence", assessment.confidence);
  console.log("threatTypes", assessment.threatTypes);
  console.log("evidence", assessment.evidence.length);
  console.log("counterEvidence", assessment.counterEvidence.length);
  console.log("model", assessment.modelVersion);
  console.log("rules", assessment.rulesVersion);
  console.log(JSON.stringify(assessment, null, 2).slice(0, 1500));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
