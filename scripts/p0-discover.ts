/**
 * S0.1 — P0 discover: live Messari coverage for demo-target candidates.
 *
 *   pnpm p0:discover
 *
 * Prints a table. Does NOT write evals/demo-targets.json (human locks S0.2).
 * Never invents addresses — only Graph results + PIVOT §6 candidates.
 */

import { loadRootEnv } from "../packages/core/src/config/env";
import { querySubgraph } from "../packages/core/src/graph/client";

loadRootEnv();

/** Live Messari subgraphs (verified 7 Sep 2026). Excluded: Balancer, Pancake, Convex. */
const SUBGRAPHS = {
  aaveV3: {
    id: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
    name: "aave-v3",
    kind: "lending" as const,
  },
  compoundV3: {
    id: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9",
    name: "compound-v3",
    kind: "lending" as const,
  },
  spark: {
    id: "GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si",
    name: "spark",
    kind: "lending" as const,
  },
  uniswapV3: {
    id: "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6",
    name: "uniswap-v3",
    kind: "dex" as const,
  },
  sushi: {
    id: "77jZ9KWeyi3CJ96zkkj5s1CojKPHt6XJKjLFzsDCd8Fd",
    name: "sushi",
    kind: "dex" as const,
  },
  curve: {
    id: "3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF",
    name: "curve",
    kind: "dex" as const,
  },
  yearn: {
    id: "FDLuaz69DbMADuBjJDEcLnTuPnjhZqNbFVrkNiBLGkEg",
    name: "yearn-v2",
    kind: "yield" as const,
  },
} as const;

/** PIVOT §6 candidates — verify live; do not invent. */
const PIVOT_CANDIDATES: Array<{ label: string; address: string; note: string }> = [
  {
    label: "MakinaFi-A",
    address: "0x935bfb495E33f74d2E9735DF1DA66acE442ede48",
    note: "MakinaFi Jan 2026 ~$4.1M (CertiK)",
  },
  {
    label: "MakinaFi-B",
    address: "0xbed26250Db2097318386F540fD546acEDf7bdE25",
    note: "MakinaFi second EOA",
  },
  {
    label: "Euler-exploiter",
    address: "0xb66cd966670d962C227B3EABA30a872DbFb995db",
    note: "Euler Mar 2023 ~$197M (Chainalysis)",
  },
];

type Row = {
  label: string;
  address: string;
  flashloanCount: number | null;
  maxFlashUsd: number | null;
  protocolsHit: string[];
  sharedTxHashes: string[];
  amountUSD: number | null;
  notes: string;
};

function norm(addr: string): string {
  return addr.toLowerCase();
}

function txFromId(id: string): string {
  // Messari entity ids often start with 0x{64}-hex tx hash
  const m = id.match(/^(0x[a-fA-F0-9]{64})/);
  return m ? m[1].toLowerCase() : id.toLowerCase();
}

async function softQuery<T>(
  label: string,
  subgraphId: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T | null> {
  try {
    return await querySubgraph<T>(subgraphId, query, variables);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`  ! ${label}: ${msg.slice(0, 160)}`);
    return null;
  }
}

async function lendingAccount(subgraphId: string, address: string) {
  return softQuery<{
    account: {
      id: string;
      flashloanCount: string | number;
      borrowCount: string | number;
      depositCount: string | number;
      withdrawCount: string | number;
      liquidateCount: string | number;
      liquidationCount: string | number;
    } | null;
  }>(
    `account@${subgraphId.slice(0, 6)}`,
    subgraphId,
    `query($id: ID!) {
      account(id: $id) {
        id flashloanCount borrowCount depositCount withdrawCount
        liquidateCount liquidationCount
      }
    }`,
    { id: address },
  );
}

async function lendingFlashloans(subgraphId: string, address: string, first = 25) {
  return softQuery<{
    flashloans: Array<{
      id: string;
      hash: string;
      amountUSD: string;
      timestamp: string;
      blockNumber: string;
    }>;
  }>(
    `flashloans@${subgraphId.slice(0, 6)}`,
    subgraphId,
    `query($account: String!, $first: Int!) {
      flashloans(
        first: $first
        orderBy: amountUSD
        orderDirection: desc
        where: { account: $account }
      ) {
        id hash amountUSD timestamp blockNumber
      }
    }`,
    { account: address, first },
  );
}

async function dexSwaps(subgraphId: string, address: string, first = 50) {
  // Extended schema (Uni V3) uses account; classic DEX AMM may use same
  return softQuery<{
    swaps: Array<{ id: string; hash?: string | null; timestamp: string; amountInUSD?: string }>;
  }>(
    `swaps@${subgraphId.slice(0, 6)}`,
    subgraphId,
    `query($account: String!, $first: Int!) {
      swaps(
        first: $first
        orderBy: timestamp
        orderDirection: desc
        where: { account: $account }
      ) {
        id
        timestamp
        amountInUSD
      }
    }`,
    { account: address, first },
  );
}

async function topAaveFlashloanAccounts(first = 40): Promise<
  Array<{ address: string; amountUSD: number; hash: string }>
> {
  const data = await softQuery<{
    flashloans: Array<{
      hash: string;
      amountUSD: string;
      account: { id: string };
    }>;
  }>(
    "aave-top-fl",
    SUBGRAPHS.aaveV3.id,
    `query($first: Int!) {
      flashloans(first: $first, orderBy: amountUSD, orderDirection: desc) {
        hash
        amountUSD
        account { id }
      }
    }`,
    { first },
  );
  if (!data?.flashloans) return [];
  return data.flashloans.map((f) => ({
    address: norm(f.account.id),
    amountUSD: Number(f.amountUSD),
    hash: f.hash.toLowerCase(),
  }));
}

async function profileAddress(label: string, address: string, extraNote: string): Promise<Row> {
  const addr = norm(address);
  const protocolsHit: string[] = [];
  const flHashes = new Set<string>();
  const dexHashes = new Set<string>();
  let flashloanCount: number | null = null;
  let maxFlashUsd: number | null = null;

  // Lending protocols
  for (const key of ["aaveV3", "compoundV3", "spark"] as const) {
    const sg = SUBGRAPHS[key];
    const acc = await lendingAccount(sg.id, addr);
    if (acc?.account) {
      protocolsHit.push(sg.name);
      const c = Number(acc.account.flashloanCount);
      if (Number.isFinite(c)) {
        flashloanCount = (flashloanCount ?? 0) + c;
      }
    }
    const fl = await lendingFlashloans(sg.id, addr);
    if (fl?.flashloans?.length) {
      if (!protocolsHit.includes(sg.name)) protocolsHit.push(sg.name);
      for (const row of fl.flashloans) {
        flHashes.add(row.hash.toLowerCase());
        const usd = Number(row.amountUSD);
        if (Number.isFinite(usd)) {
          maxFlashUsd = maxFlashUsd == null ? usd : Math.max(maxFlashUsd, usd);
        }
      }
    }
  }

  // DEX — collect swap tx ids for intersection
  for (const key of ["uniswapV3", "sushi", "curve"] as const) {
    const sg = SUBGRAPHS[key];
    const sw = await dexSwaps(sg.id, addr);
    if (sw?.swaps?.length) {
      protocolsHit.push(sg.name);
      for (const s of sw.swaps) {
        dexHashes.add(txFromId(s.id));
      }
    }
  }

  // Yearn — presence only
  {
    const sg = SUBGRAPHS.yearn;
    const acc = await softQuery<{ account: { id: string } | null }>(
      "yearn-acc",
      sg.id,
      `query($id: ID!) { account(id: $id) { id } }`,
      { id: addr },
    );
    if (acc?.account) protocolsHit.push(sg.name);
  }

  const sharedTxHashes = [...flHashes].filter((h) => dexHashes.has(h));

  return {
    label,
    address: addr,
    flashloanCount,
    maxFlashUsd,
    protocolsHit: [...new Set(protocolsHit)],
    sharedTxHashes,
    amountUSD: maxFlashUsd,
    notes: extraNote,
  };
}

function printTable(rows: Row[]) {
  console.log("\n=== P0 discover results ===\n");
  console.log(
    [
      "label".padEnd(18),
      "address".padEnd(44),
      "flCount".padStart(8),
      "maxFlUSD".padStart(14),
      "protocols".padEnd(40),
      "sharedTx".padStart(8),
    ].join("  "),
  );
  console.log("-".repeat(140));
  for (const r of rows) {
    console.log(
      [
        r.label.slice(0, 18).padEnd(18),
        r.address.padEnd(44),
        String(r.flashloanCount ?? "—").padStart(8),
        r.maxFlashUsd != null ? r.maxFlashUsd.toFixed(0).padStart(14) : "—".padStart(14),
        r.protocolsHit.join(",").slice(0, 40).padEnd(40),
        String(r.sharedTxHashes.length).padStart(8),
      ].join("  "),
    );
    if (r.sharedTxHashes.length) {
      console.log(`    shared: ${r.sharedTxHashes.slice(0, 3).join(", ")}`);
    }
    if (r.notes) console.log(`    note: ${r.notes}`);
  }
}

async function main() {
  console.log("S0.1 p0-discover — live The Graph / Messari only\n");

  const rows: Row[] = [];

  // 1) PIVOT §6 named candidates
  for (const c of PIVOT_CANDIDATES) {
    process.stdout.write(`Profiling ${c.label}...\n`);
    rows.push(await profileAddress(c.label, c.address, c.note));
  }

  // 2) Scan Aave for one-shot large flashloaners (flCount ≤ 5)
  process.stdout.write("Scanning Aave V3 top flashloans for one-shot accounts...\n");
  const top = await topAaveFlashloanAccounts(50);
  const seen = new Set(rows.map((r) => r.address));
  const oneShotHits: Array<{ address: string; amountUSD: number }> = [];

  for (const t of top) {
    if (seen.has(t.address)) continue;
    const acc = await lendingAccount(SUBGRAPHS.aaveV3.id, t.address);
    const count = acc?.account ? Number(acc.account.flashloanCount) : NaN;
    if (!Number.isFinite(count) || count > 5 || count < 1) continue;
    if (t.amountUSD < 1_000_000) continue;
    oneShotHits.push({ address: t.address, amountUSD: t.amountUSD });
    seen.add(t.address);
    if (oneShotHits.length >= 5) break;
  }

  for (const [i, hit] of oneShotHits.entries()) {
    process.stdout.write(`Profiling one-shot-${i + 1} ${hit.address.slice(0, 10)}...\n`);
    rows.push(
      await profileAddress(
        `one-shot-${i + 1}`,
        hit.address,
        `Aave scan amountUSD≈${hit.amountUSD.toFixed(0)} flashloanCount≤5`,
      ),
    );
  }

  // 3) One high-volume bot for WATCH contrast
  process.stdout.write("Finding BOT_PROFILE candidate (flashloanCount≥500)...\n");
  let botAddr: string | null = null;
  for (const t of top) {
    const acc = await lendingAccount(SUBGRAPHS.aaveV3.id, t.address);
    const count = acc?.account ? Number(acc.account.flashloanCount) : 0;
    if (count >= 500) {
      botAddr = t.address;
      break;
    }
  }
  if (botAddr && !rows.some((r) => r.address === botAddr)) {
    rows.push(
      await profileAddress("BOT-candidate", botAddr, "flashloanCount≥500 — expect WATCH not TAINTED"),
    );
  }

  printTable(rows);

  const multi = rows.filter((r) => r.protocolsHit.length >= 2 && !r.label.startsWith("BOT"));
  const withShared = rows.filter((r) => r.sharedTxHashes.length > 0);

  console.log("\n=== Gate ===");
  console.log(`Rows: ${rows.length}`);
  console.log(`Multi-protocol (≥2): ${multi.length}`);
  console.log(`With shared flashloan↔dex tx: ${withShared.length}`);

  if (multi.length >= 2) {
    console.log("✅ S0.1 PASS — ≥2 candidates with rows in ≥2 protocols.");
    if (withShared.length === 0) {
      console.log(
        "⚠️ FALLBACK NOTE: no cross-protocol same-tx yet — validator may use FLASHLOAN_ONE_SHOT ∧ FRESH_ACCOUNT (PIVOT).",
      );
    }
  } else {
    console.log("❌ S0.1 FAIL — need ≥2 multi-protocol candidates. Widen scan or check API key.");
    process.exitCode = 1;
  }

  console.log("\nNext: YOU lock evals/demo-targets.json (S0.2) with source_url — agent must not invent.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
