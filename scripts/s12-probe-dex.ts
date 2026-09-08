/**
 * S1.2 follow-up: dump Swap fields + test account filters with correct selection sets.
 */
import { loadRootEnv } from "../packages/core/src/config/env";
import { querySubgraph } from "../packages/core/src/graph/client";

loadRootEnv();

const DEX = [
  { name: "uniswap-v3", id: "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6", family: "ext" },
  { name: "sushi", id: "77jZ9KWeyi3CJ96zkkj5s1CojKPHt6XJKjLFzsDCd8Fd", family: "amm" },
  { name: "curve", id: "3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF", family: "amm" },
] as const;

const MAKINA = "0x935bfb495e33f74d2e9735df1da66ace442ede48";
const BOT = "0x352423e2fa5d5c99343d371c9e3bc56c87723cc7";

type Field = { name: string; type: { name: string | null; kind: string; ofType: { name: string | null; kind: string } | null } };

async function dumpSwapFields(name: string, id: string) {
  const data = await querySubgraph<{ __type: { fields: Field[] } | null }>(
    id,
    `{ __type(name: "Swap") { fields { name type { name kind ofType { name kind } } } } }`,
  );
  const fields = (data.__type?.fields ?? []).map((f) => f.name).sort();
  console.log(`\n${name} Swap fields (${fields.length}):`, fields.join(", "));
}

async function trySwaps(
  label: string,
  id: string,
  whereClause: string,
  selection: string,
  account: string,
) {
  try {
    const data = await querySubgraph<{ swaps: unknown[] }>(
      id,
      `query($account: String!, $first: Int!) {
        swaps(first: $first, orderBy: timestamp, orderDirection: desc, ${whereClause}) {
          ${selection}
        }
      }`,
      { account, first: 2 },
    );
    console.log(`  OK  ${label}: swaps[${data.swaps?.length ?? 0}]`, JSON.stringify(data.swaps?.[0] ?? null).slice(0, 180));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  FAIL ${label}: ${msg.slice(0, 220)}`);
  }
}

async function tryAccount(name: string, id: string, addr: string, fields: string) {
  try {
    const data = await querySubgraph<{ account: unknown }>(
      id,
      `query($id: ID!) { account(id: $id) { ${fields} } }`,
      { id: addr },
    );
    console.log(`  account ${name}:`, JSON.stringify(data.account).slice(0, 200));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  account FAIL ${name}:`, msg.slice(0, 180));
  }
}

async function main() {
  for (const d of DEX) {
    await dumpSwapFields(d.name, d.id);

    console.log(`\n--- ${d.name} filter tests (Makina) ---`);
    if (d.family === "ext") {
      await trySwaps("account", d.id, "where: { account: $account }", "id timestamp hash amountInUSD amountOutUSD blockNumber", MAKINA);
    } else {
      // classic dex-amm — try several
      await trySwaps("account", d.id, "where: { account: $account }", "id timestamp hash amountInUSD amountOutUSD", MAKINA);
      await trySwaps("from", d.id, "where: { from: $account }", "id timestamp hash amountInUSD from to", MAKINA);
      await trySwaps("to", d.id, "where: { to: $account }", "id timestamp hash amountInUSD from to", MAKINA);
      await trySwaps("account_contains", d.id, "where: { account_contains: $account }", "id timestamp hash amountInUSD", MAKINA);
      // Maybe swaps are nested under account
      await tryAccount("with swaps", d.id, MAKINA, "id swapCount swaps(first: 2) { id timestamp hash amountInUSD }");
      await tryAccount("counts only", d.id, BOT, "id swapCount depositCount withdrawCount");
    }
  }

  // Lending + yearn quick field check
  console.log("\n=== lending Aave account/flashloans ===");
  const aave = "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk";
  await tryAccount(
    "aave",
    aave,
    MAKINA,
    "id flashloanCount borrowCount depositCount withdrawCount liquidateCount liquidationCount",
  );
  try {
    const fl = await querySubgraph<{ flashloans: unknown[] }>(
      aave,
      `query($account: String!) {
        flashloans(first: 2, orderBy: amountUSD, orderDirection: desc, where: { account: $account }) {
          id hash amountUSD timestamp blockNumber asset { symbol }
        }
      }`,
      { account: MAKINA },
    );
    console.log("  flashloans", JSON.stringify(fl.flashloans).slice(0, 300));
  } catch (e) {
    console.log("  flashloans FAIL", e);
  }

  console.log("\n=== yearn ===");
  const yearn = "FDLuaz69DbMADuBjJDEcLnTuPnjhZqNbFVrkNiBLGkEg";
  await tryAccount("yearn makina", yearn, MAKINA, "id");
  // introspect Account
  try {
    const t = await querySubgraph<{ __type: { fields: Field[] } | null }>(
      yearn,
      `{ __type(name: "Account") { fields { name } } }`,
    );
    console.log(
      "  Yearn Account fields:",
      (t.__type?.fields ?? []).map((f) => f.name).sort().join(", "),
    );
  } catch (e) {
    console.log("  yearn introspect FAIL", e);
  }
}

main();
