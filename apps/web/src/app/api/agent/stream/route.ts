/**
 * GET /api/agent/stream?address=0x…&pay=1
 *
 * Server-Sent Events: a labelled third-party agent using SAVIOURS the way an
 * integrator would — ENS first, 402 on miss, settle from *its* account, then a
 * second agent that never paid us anything reading the same memory for $0.
 *
 * This is the answer to "who pays?": not the website. The calling agent.
 *
 * pay=1 attempts real Base settle via /api/bazantic/pay-investigate (needs
 * local bazantic CLI + grant). Without it, the stream still shows live ENS
 * reads and a live HTTP 402 invoice.
 */

import { spawnSync } from "node:child_process";
import { createPublicClient, http, type Hex } from "viem";
import { namehash } from "viem/ens";
import { sepolia } from "viem/chains";

export const runtime = "nodejs";
export const maxDuration = 180;

const RESOLVER = (process.env.SAVIOURS_RESOLVER?.trim() ||
  "0xF479306621F718F7d76875f67506ceD33717751c") as Hex;
const PARENT = process.env.SAVIOURS_PARENT?.trim() || "saviours.eth";
const GATEWAY = (
  process.env.BAZANTIC_GATEWAY_URL?.trim() || "https://saviour.bazgateway.com"
).replace(/\/$/, "");
const ORIGIN = (
  process.env.PUBLIC_APP_URL?.trim() || "http://127.0.0.1:3000"
).replace(/\/$/, "");

const textAbi = [
  {
    name: "text",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

type AgentEvent = {
  t: number;
  kind:
    | "meta"
    | "line"
    | "ens"
    | "invoice"
    | "settle"
    | "verdict"
    | "second"
    | "done"
    | "error";
  agent?: "payer" | "free";
  text?: string;
  tone?: "sys" | "ok" | "block" | "warn" | "miss" | "pay" | "hdr";
  data?: Record<string, unknown>;
};

function short(a: string) {
  return `${a.slice(0, 8)}…${a.slice(-4)}`;
}

async function readEns(address: string) {
  const ensName = `${address}.${PARENT}`;
  const rpc =
    process.env.SEPOLIA_RPC_URL?.trim() ||
    "https://ethereum-sepolia-rpc.publicnode.com";
  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpc),
  });
  const node = namehash(ensName) as Hex;
  const t0 = Date.now();
  const status = (
    await client.readContract({
      address: RESOLVER,
      abi: textAbi,
      functionName: "text",
      args: [node, "saviours.status"],
    })
  ).trim();
  let threat = "";
  if (status) {
    threat = (
      await client.readContract({
        address: RESOLVER,
        abi: textAbi,
        functionName: "text",
        args: [node, "saviours.threat"],
      })
    ).trim();
  }
  const latencyMs = Date.now() - t0;
  const upper = status.toUpperCase();
  const decision =
    upper === "TAINTED"
      ? "BLOCK"
      : upper === "WATCH"
        ? "WARN"
        : upper === "SAFE"
          ? "ALLOW"
          : "ESCALATE";
  return {
    ensName,
    status: status || "UNKNOWN",
    threat,
    decision,
    hit: Boolean(status),
    latencyMs,
    cost: { graph: 0, ai: 0, usd: 0 },
  };
}

async function probe402(address: string) {
  const body = {
    chainId: 1,
    address,
    persist: false,
    forceFresh: true,
    registryNetwork: "sepolia",
  };
  const res = await fetch(`${GATEWAY}/api/investigate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

async function settlePaid(address: string) {
  const account = process.env.BAZANTIC_PAY_ACCOUNT?.trim() || "film-base";
  const network = process.env.BAZANTIC_PAY_NETWORK?.trim() || "base";
  const key =
    process.env.BAZANTIC_API_KEY?.trim() ||
    process.env.BAZENTI_API_KEY?.trim() ||
    null;

  const which = spawnSync("which", ["bazantic"], { encoding: "utf8" });
  if (which.status === 0) {
    const payload = {
      chainId: 1,
      address,
      persist: false,
      forceFresh: true,
      registryNetwork: "sepolia",
    };
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
        JSON.stringify(payload),
        "--account",
        account,
        "--network",
        network,
        "--max-amount",
        "0.05",
        "--yes",
        "--json",
      ],
      { encoding: "utf8", timeout: 180_000 },
    );
    type PaidJson = {
      ok?: boolean;
      paid?: {
        amountUsd?: string;
        payer?: string;
        transaction?: string;
        network?: string;
        explorerUrl?: string;
      };
      body?: {
        assessment?: { status?: string; threatTypes?: string[] };
        remember?: { ensName?: string; named?: boolean };
      };
    };
    let parsed: PaidJson | null = null;
    try {
      parsed = JSON.parse(r.stdout || "") as PaidJson;
    } catch {
      parsed = null;
    }
    if (parsed?.ok && parsed.paid?.transaction) {
      return {
        ok: true as const,
        settlement: "x402-cli" as const,
        amountUsd: parsed.paid.amountUsd,
        payer: parsed.paid.payer,
        transaction: parsed.paid.transaction,
        network: parsed.paid.network ?? network,
        explorerUrl:
          parsed.paid.explorerUrl ??
          `https://basescan.org/tx/${parsed.paid.transaction}`,
        assessmentStatus: parsed.body?.assessment?.status ?? null,
        threatTypes: parsed.body?.assessment?.threatTypes ?? [],
        ensName: parsed.body?.remember?.ensName ?? null,
        account,
      };
    }
  }

  if (key) {
    const res = await fetch(`${GATEWAY}/api/investigate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        chainId: 1,
        address,
        persist: false,
        forceFresh: true,
        registryNetwork: "sepolia",
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      assessment?: { status?: string; threatTypes?: string[] };
      remember?: { ensName?: string; named?: boolean };
    } | null;
    if (res.ok && json?.assessment?.status) {
      return {
        ok: true as const,
        settlement: "developer-jwt" as const,
        amountUsd: null,
        payer: null,
        transaction: null,
        network: "base",
        explorerUrl: null,
        assessmentStatus: json.assessment.status,
        threatTypes: json.assessment.threatTypes ?? [],
        ensName: json.remember?.ensName ?? null,
        account: "gateway-bearer",
      };
    }
  }

  return {
    ok: false as const,
    error:
      "bazantic CLI not on this host and JWT settle unavailable — live 402 above is still real",
    account,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = String(url.searchParams.get("address") ?? "")
    .trim()
    .toLowerCase();
  const wantPay = url.searchParams.get("pay") === "1";

  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    return new Response(JSON.stringify({ error: "Invalid address" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const t0 = Date.now();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(ev: AgentEvent) {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ ...ev, t: Date.now() - t0 })}\n\n`),
        );
      }
      function line(
        agent: "payer" | "free",
        text: string,
        tone: AgentEvent["tone"] = "sys",
      ) {
        send({ t: 0, kind: "line", agent, text, tone });
      }

      try {
        const payerLabel = "swap-router-agent";
        const freeLabel = "vault-keeper";
        const payAccount =
          process.env.BAZANTIC_PAY_ACCOUNT?.trim() || "film-base";

        send({
          t: 0,
          kind: "meta",
          data: {
            payer: {
              id: payerLabel,
              role: "integrator #1 · trading bot",
              note: "not saviours · not this website",
              settleAccount: payAccount,
              network: "base",
            },
            free: {
              id: freeLabel,
              role: "integrator #2 · vault / wallet copilot",
              note: "different account · has never paid us anything",
            },
            address,
            gateway: GATEWAY,
            origin: ORIGIN,
          },
        });

        line(
          "payer",
          `${payerLabel} · about to sign swap → counterparty ${short(address)}`,
          "hdr",
        );
        line(
          "payer",
          "saviours.check(ens) · PermissionedResolver.text · no gateway · $0",
          "sys",
        );

        const ens = await readEns(address);
        send({
          t: 0,
          kind: "ens",
          agent: "payer",
          data: ens as unknown as Record<string, unknown>,
        });

        if (ens.hit) {
          const tone =
            ens.decision === "BLOCK"
              ? "block"
              : ens.decision === "WARN"
                ? "warn"
                : "ok";
          line(
            "payer",
            `HIT · ${ens.status} · ${ens.decision} · 0 Graph · 0 AI · $${ens.cost.usd} · ${ens.latencyMs}ms · ${ens.ensName}`,
            tone,
          );
          if (ens.threat) {
            line("payer", `  threat · ${ens.threat}`, "sys");
          }
          line(
            "payer",
            "DECISION · cancel transaction · paid nothing (memory already existed)",
            "ok",
          );
        } else {
          line(
            "payer",
            `MISS · no saviours.status at ${ens.ensName}`,
            "miss",
          );
        }

        // Always show the live 402 path — answers "what does a miss cost"
        line(
          "payer",
          "POST /investigate (forceFresh) → expecting HTTP 402 on unpaid miss path",
          "sys",
        );
        const invoice = await probe402(address);
        send({
          t: 0,
          kind: "invoice",
          agent: "payer",
          data: {
            httpStatus: invoice.status,
            gateway: GATEWAY,
            body: invoice.body,
          },
        });
        if (invoice.status === 402) {
          line(
            "payer",
            `← HTTP 402 Payment Required · ~$0.01 USDC on Base · metered by Bazantic`,
            "pay",
          );
        } else {
          line(
            "payer",
            `← HTTP ${invoice.status} (expected 402 on unpaid path — gateway may have settled or errored)`,
            "warn",
          );
        }

        if (wantPay) {
          line(
            "payer",
            `settle investigate · account ${payAccount} · paid by ME, not by saviours`,
            "pay",
          );
          const settled = await settlePaid(address);
          if (settled.ok) {
            send({
              t: 0,
              kind: "settle",
              agent: "payer",
              data: settled as unknown as Record<string, unknown>,
            });
            if (settled.settlement === "developer-jwt") {
              line(
                "payer",
                `← JWT unlock · gateway funded account · assess ${settled.assessmentStatus ?? "ok"}`,
                "ok",
              );
              line(
                "payer",
                "  note · not an x402 Basescan settle — film film-base locally for that",
                "sys",
              );
            } else {
              line(
                "payer",
                `← settled $${settled.amountUsd} · payer ${settled.payer ?? payAccount} · ${settled.transaction}`,
                "ok",
              );
              if (settled.explorerUrl) {
                line(
                  "payer",
                  `  basescan ↗ ${settled.explorerUrl}`,
                  "sys",
                );
              }
            }
            if (settled.assessmentStatus) {
              line(
                "payer",
                `investigate → ${settled.assessmentStatus}${(settled.threatTypes ?? []).length ? ` · ${(settled.threatTypes ?? []).join(", ")}` : ""}`,
                settled.assessmentStatus === "TAINTED"
                  ? "block"
                  : settled.assessmentStatus === "WATCH"
                    ? "warn"
                    : "ok",
              );
            }
            send({
              t: 0,
              kind: "verdict",
              agent: "payer",
              data: {
                status: settled.assessmentStatus,
                ensName: settled.ensName,
                paidBy: settled.payer,
                amountUsd: settled.amountUsd,
                settlement: settled.settlement,
              },
            });
          } else {
            send({
              t: 0,
              kind: "settle",
              agent: "payer",
              data: settled as unknown as Record<string, unknown>,
            });
            line(
              "payer",
              `settle skipped · ${settled.error}`,
              "warn",
            );
            line(
              "payer",
              "honest ceiling: set BAZANTIC_API_KEY on Vercel for JWT path, or film x402 on pnpm dev + grant",
              "sys",
            );
          }
        } else {
          line(
            "payer",
            "pay=0 · skipped settle (toggle Pay & run to settle from this agent's account)",
            "sys",
          );
        }

        // Second agent — never paid us
        line(
          "free",
          `${freeLabel} · different account · has never paid us anything`,
          "hdr",
        );
        line(
          "free",
          "saviours.check(ens) · same counterparty · no gateway · $0",
          "sys",
        );
        const ens2 = await readEns(address);
        send({
          t: 0,
          kind: "second",
          agent: "free",
          data: ens2 as unknown as Record<string, unknown>,
        });
        if (ens2.hit) {
          const tone =
            ens2.decision === "BLOCK"
              ? "block"
              : ens2.decision === "WARN"
                ? "warn"
                : "ok";
          line(
            "free",
            `HIT · ${ens2.status} · ${ens2.decision} · 0 Graph · 0 AI · $0 · ${ens2.latencyMs}ms`,
            tone,
          );
          line(
            "free",
            "DECISION · refuse counterparty · paid nothing — free because the first agent paid",
            "ok",
          );
        } else {
          line(
            "free",
            `MISS · still unnamed · this agent would now face the same 402`,
            "miss",
          );
        }

        send({ t: 0, kind: "done", data: { ok: true } });
      } catch (err) {
        const message = err instanceof Error ? err.message : "stream failed";
        send({ t: 0, kind: "error", text: message });
        send({ t: 0, kind: "done", data: { ok: false } });
      } finally {
        closed = true;
        controller.close();
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
