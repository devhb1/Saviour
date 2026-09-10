/**
 * Bazantic end-to-end production gate for SAVIOURS.
 *
 * Usage: pnpm bazantic:e2e
 *
 * Beats:
 *  1) shieldCheck ATTACK-1 → 200 BLOCK · $0
 *  2) shieldCheck BOT-1 → 200 WARN · $0
 *  3) investigate unpaid → 402 x402 Base USDC
 *  4) investigate with Bearer JWT → 200 (developer bypass / funded account path)
 *  5) MCP initialize + tools/list (info · shieldCheck · investigate)
 *  6) OpenAPI upstream 200
 *
 * Optional (requires `bazantic login` + grant/wallet):
 *  BAZANTIC_PAID_CURL=1 → attempt `bazantic curl --account <grant> --network base --yes`
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function loadDotEnv() {
  const p = resolve(process.cwd(), ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env) || !process.env[k]) process.env[k] = v;
  }
}

loadDotEnv();

const GATEWAY = (
  process.env.BAZANTIC_GATEWAY_URL?.trim() || "https://saviour.bazgateway.com"
).replace(/\/$/, "");
const UPSTREAM = (
  process.env.PUBLIC_APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "https://saviour-gilt.vercel.app"
).replace(/\/$/, "");
const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";
const BOT_1 = "0x352423e2fa5d5c99343d371c9e3bc56c87723cc7";

function apiKey(): string | null {
  return (
    process.env.BAZANTIC_API_KEY?.trim() ||
    process.env.BAZENTI_API_KEY?.trim() ||
    null
  );
}

type Beat = { name: string; ok: boolean; detail: string };

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; json: unknown; text: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

async function main() {
  const beats: Beat[] = [];
  const key = apiKey();

  console.log("bazantic:e2e — SAVIOURS production gate\n");
  console.log("gateway:", GATEWAY);
  console.log("upstream:", UPSTREAM);
  console.log("api key:", key ? `present (len=${key.length})` : "MISSING");
  console.log("");

  // 1) OpenAPI
  try {
    const res = await fetch(`${UPSTREAM}/openapi-saviours.json`, {
      signal: AbortSignal.timeout(15_000),
    });
    beats.push({
      name: "OpenAPI upstream",
      ok: res.ok,
      detail: `HTTP ${res.status} ${UPSTREAM}/openapi-saviours.json`,
    });
  } catch (e) {
    beats.push({
      name: "OpenAPI upstream",
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    });
  }

  // 2) Shield ATTACK-1
  {
    const { status, json } = await postJson(`${GATEWAY}/api/shield/check`, {
      chainId: 1,
      address: ATTACK_1,
      registryNetwork: "sepolia",
    });
    const check = asRecord(asRecord(json)?.check);
    const decision = check?.decision;
    const usedAi = check?.usedAi;
    const ok = status === 200 && decision === "BLOCK" && usedAi === false;
    beats.push({
      name: "shieldCheck ATTACK-1 ($0)",
      ok,
      detail: `HTTP ${status} decision=${String(decision)} source=${String(check?.source)} usedAi=${String(usedAi)} ens=${String(check?.ensName ?? "")}`,
    });
  }

  // 3) Shield BOT-1
  {
    const { status, json } = await postJson(`${GATEWAY}/api/shield/check`, {
      chainId: 1,
      address: BOT_1,
      registryNetwork: "sepolia",
    });
    const check = asRecord(asRecord(json)?.check);
    const decision = check?.decision;
    const ok = status === 200 && decision === "WARN" && check?.usedAi === false;
    beats.push({
      name: "shieldCheck BOT-1 ($0)",
      ok,
      detail: `HTTP ${status} decision=${String(decision)} source=${String(check?.source)}`,
    });
  }

  // 4) Investigate unpaid → 402
  {
    const { status, json } = await postJson(`${GATEWAY}/api/investigate`, {
      chainId: 1,
      address: ATTACK_1,
      persist: false,
      forceFresh: true,
      registryNetwork: "sepolia",
    });
    const rec = asRecord(json);
    const accepts = Array.isArray(rec?.accepts) ? rec.accepts : [];
    const first = asRecord(accepts[0]);
    const ok =
      status === 402 &&
      (rec?.x402Version === 1 || typeof rec?.x402Version === "number") &&
      first?.network === "base";
    beats.push({
      name: "investigate unpaid → 402 x402",
      ok,
      detail: `HTTP ${status} network=${String(first?.network)} maxAmount=${String(first?.maxAmountRequired)} asset=${String(first?.asset)}`,
    });
  }

  // 5) Investigate with JWT (developer / funded bypass)
  if (key) {
    const { status, json } = await postJson(
      `${GATEWAY}/api/investigate`,
      {
        chainId: 1,
        address: ATTACK_1,
        persist: false,
        forceFresh: true,
        registryNetwork: "sepolia",
      },
      { Authorization: `Bearer ${key}` },
    );
    const assessment = asRecord(asRecord(json)?.assessment);
    const cost = asRecord(asRecord(json)?.cost);
    const ok =
      status === 200 &&
      (assessment?.status === "TAINTED" || assessment?.status === "WATCH");
    beats.push({
      name: "investigate Bearer JWT (funded bypass)",
      ok,
      detail: `HTTP ${status} status=${String(assessment?.status)} graph=${String(cost?.graphQueries)} ai=${String(cost?.aiCalls)} latencyMs=${String(cost?.latencyMs)}`,
    });
  } else {
    beats.push({
      name: "investigate Bearer JWT (funded bypass)",
      ok: false,
      detail: "No BAZANTIC_API_KEY / BAZENTI_API_KEY",
    });
  }

  // 6) MCP
  {
    const init = await postJson(
      `${GATEWAY}/mcp`,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "saviours-e2e", version: "1.0" },
        },
      },
      { accept: "application/json, text/event-stream" },
    );
    const list = await postJson(
      `${GATEWAY}/mcp`,
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      { accept: "application/json, text/event-stream" },
    );
    const blob = `${init.text}\n${list.text}`;
    const ok =
      init.status === 200 &&
      list.status === 200 &&
      blob.includes('"name":"info"') &&
      blob.includes('"name":"shieldCheck"') &&
      blob.includes('"name":"investigate"');
    beats.push({
      name: "MCP initialize + tools",
      ok,
      detail: `init HTTP ${init.status} · list HTTP ${list.status} · tools info/shieldCheck/investigate`,
    });
  }

  // 7) Optional native x402 curl settle
  if (process.env.BAZANTIC_PAID_CURL === "1") {
    const account = process.env.BAZANTIC_PAY_ACCOUNT?.trim() || "local";
    const r = spawnSync(
      "bazantic",
      [
        "curl",
        `${GATEWAY}/api/investigate`,
        "-X",
        "POST",
        "-H",
        "content-type: application/json",
        "-d",
        JSON.stringify({
          chainId: 1,
          address: ATTACK_1,
          persist: false,
          forceFresh: true,
          registryNetwork: "sepolia",
        }),
        "--account",
        account,
        "--network",
        "base",
        "--max-amount",
        "0.05",
        "--yes",
        "--json",
      ],
      { encoding: "utf8", timeout: 180_000 },
    );
    const out = `${r.stdout || ""}\n${r.stderr || ""}`;
    const ok =
      r.status === 0 &&
      (out.includes("TAINTED") || out.includes('"status":"TAINTED"'));
    beats.push({
      name: `bazantic curl settle (--account ${account})`,
      ok,
      detail: ok
        ? `exit ${r.status} · settled on Base`
        : `exit ${r.status} · ${out.slice(0, 280).replace(/\s+/g, " ")}`,
    });
  }

  console.log("Results");
  console.log("-------");
  let failed = 0;
  for (const b of beats) {
    console.log(`${b.ok ? "✓" : "✗"} ${b.name}`);
    console.log(`  ${b.detail}`);
    if (!b.ok) failed += 1;
  }
  console.log("");
  if (failed) {
    console.log(`FAIL · ${failed}/${beats.length} beats`);
    if (!process.env.BAZANTIC_PAID_CURL) {
      console.log(
        "Tip: after `bazantic login` + `bazantic grant create --name film --cap 1`, run:",
      );
      console.log(
        "  BAZANTIC_PAID_CURL=1 BAZANTIC_PAY_ACCOUNT=film pnpm bazantic:e2e",
      );
    }
    process.exit(1);
  }
  console.log(`PASS · ${beats.length}/${beats.length} beats`);
  console.log(
    "Production ready for agents: Shield $0 · investigate metered · MCP live.",
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
