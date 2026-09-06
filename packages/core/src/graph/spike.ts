/**
 * Day 0 spike — prove one live Graph query works.
 * Not production adapter code. Throwaway verification only.
 *
 * Docs consulted:
 * - https://thegraph.com/docs/en/subgraphs/querying/from-an-application/
 * - https://thegraph.com/docs/en/subgraphs/querying/introduction/
 *
 * Product: The Graph Network gateway (Subgraph Studio API key)
 * Subgraph: Uniswap V3 (Ethereum mainnet) — high-signal activity for an address
 * Endpoint shape:
 *   https://gateway.thegraph.com/api/<API_KEY>/subgraphs/id/<SUBGRAPH_ID>
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function loadRootEnv() {
  const here = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(here, "../../../../.env");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env) || !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadRootEnv();

const SUBGRAPH_ID = "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV";

/** Vitalik — well-known address with public Uniswap activity */
const TARGET = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045".toLowerCase();

const QUERY = `
  query SpikeTransfers($origin: String!) {
    swaps(
      first: 5
      orderBy: timestamp
      orderDirection: desc
      where: { origin: $origin }
    ) {
      id
      timestamp
      amountUSD
      sender
      recipient
      origin
      transaction {
        id
        blockNumber
      }
      token0 { symbol }
      token1 { symbol }
    }
  }
`;

async function main() {
  const apiKey = process.env.GRAPH_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "GRAPH_API_KEY is empty.\n" +
        "1. Open https://thegraph.com/studio/\n" +
        "2. Create an API key (free plan is enough)\n" +
        "3. Paste it into .env as GRAPH_API_KEY=...\n" +
        "4. Re-run: pnpm spike:graph",
    );
    process.exit(1);
  }

  const url = `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${SUBGRAPH_ID}`;

  console.log("spike: live Graph query");
  console.log("subgraph:", SUBGRAPH_ID);
  console.log("target:  ", TARGET);
  console.log("endpoint: gateway.thegraph.com (API key redacted)");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { origin: TARGET },
    }),
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    console.error("Non-JSON response", res.status, text.slice(0, 500));
    process.exit(1);
  }

  if (!res.ok) {
    console.error("HTTP", res.status, JSON.stringify(body, null, 2));
    process.exit(1);
  }

  const payload = body as {
    errors?: unknown;
    data?: { swaps?: unknown[] };
  };

  if (payload.errors) {
    console.error("GraphQL errors:", JSON.stringify(payload.errors, null, 2));
    process.exit(1);
  }

  const swaps = payload.data?.swaps ?? [];
  console.log("ok: received", swaps.length, "swaps");
  console.log(JSON.stringify(payload.data, null, 2));

  if (swaps.length === 0) {
    console.warn(
      "Query succeeded but returned zero swaps for this address. " +
        "That still proves the live Graph path works.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
