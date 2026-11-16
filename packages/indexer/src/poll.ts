import {
  createPublicClient,
  http,
  type Hex,
  type Log,
} from "viem";
import { mainnet } from "viem/chains";
import { decodeTermLike, explainPrivilege } from "@saviours/queuewatch";
import { extractSelectorHints, selectorLabel } from "@saviours/check";
import { loadInitialQueues, type QueueRow } from "./allowlist.js";
import {
  loadTip,
  saveTip,
  loadSubscribers,
  type AlertEvent,
} from "./store.js";
import { sendTelegram, sendWebhook } from "./telegram.js";

const APP = process.env.SAVIOURS_APP_URL?.trim() || "http://localhost:3000";

function rpcUrl() {
  return (
    process.env.ETH_RPC_URL?.trim() ||
    process.env.MAINNET_RPC_URL?.trim() ||
    "https://ethereum-rpc.publicnode.com"
  );
}

function client() {
  return createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl()),
  });
}

function watchTargets(queues: QueueRow[]) {
  return queues
    .filter((q) => q.chainId === 1)
    .slice(0, 3)
    .map((q) => q.queue.toLowerCase() as Hex);
}

async function assessLogTx(
  c: ReturnType<typeof client>,
  log: Log,
  row: QueueRow,
): Promise<AlertEvent | null> {
  if (!log.transactionHash) return null;
  const tx = await c.getTransaction({ hash: log.transactionHash });
  const data = (tx.input || "0x") as Hex;
  const hints = extractSelectorHints(data).map(selectorLabel);
  if (hints.length === 0) return null;

  const decoded = decodeTermLike({
    rolesInner: hints.map((selectorHint) => ({
      to: (tx.to as string) || row.queue,
      data,
      selectorHint,
    })),
  });

  if (decoded.vaultWrite !== "WATCH" && decoded.maxSeverity !== "CRITICAL") {
    return null;
  }

  const explanation = explainPrivilege(decoded);
  const reviewPath = `${APP}/review?chainId=1&safe=${encodeURIComponent(row.authorityTarget)}&to=${encodeURIComponent(String(tx.to ?? row.queue))}&data=${encodeURIComponent(data)}&alert=${encodeURIComponent(explanation.summary.slice(0, 120))}`;

  return {
    id: `${log.transactionHash}-${log.logIndex}`,
    at: new Date().toISOString(),
    chainId: 1,
    queue: row.queue,
    protocol: row.protocol,
    severity: decoded.maxSeverity,
    summary: explanation.summary,
    bullets: explanation.bullets,
    txHash: log.transactionHash,
    data,
    to: tx.to ?? undefined,
    reviewPath,
  };
}

export async function pollOnce(opts?: { fromBlock?: bigint; maxBlocks?: number }) {
  const queues = loadInitialQueues().filter((q) => q.chainId === 1).slice(0, 3);
  const tip = loadTip(1);
  const c = client();
  const latest = await c.getBlockNumber();
  const maxBlocks = BigInt(opts?.maxBlocks ?? 20);
  let from =
    opts?.fromBlock ??
    (tip.lastProcessedBlock != null
      ? BigInt(tip.lastProcessedBlock + 1)
      : latest > maxBlocks
        ? latest - maxBlocks
        : 0n);
  if (from > latest) from = latest;

  const addresses = watchTargets(queues);
  const byAddr = new Map(queues.map((q) => [q.queue.toLowerCase(), q]));

  const logs = await c.getLogs({
    address: addresses,
    fromBlock: from,
    toBlock: latest,
  });

  const newAlerts: AlertEvent[] = [];
  for (const log of logs) {
    const addr = (log.address as string).toLowerCase();
    const row = byAddr.get(addr);
    if (!row) continue;
    try {
      const alert = await assessLogTx(c, log, row);
      if (alert && !tip.alerts.some((a) => a.id === alert.id)) {
        newAlerts.push(alert);
      }
    } catch (e) {
      console.warn("[poll] tx decode failed", log.transactionHash, e);
    }
  }

  for (const alert of newAlerts) {
    tip.alerts.unshift(alert);
    tip.lastCriticalAt = alert.at;
    const text = [
      `CRITICAL privilege · ${alert.protocol}`,
      alert.summary,
      ...alert.bullets.slice(0, 3).map((b) => `• ${b}`),
      alert.txHash ? `tx: ${alert.txHash}` : "",
      `review: ${alert.reviewPath}`,
    ]
      .filter(Boolean)
      .join("\n");

    const subs = loadSubscribers().filter(
      (s) =>
        s.chainId === 1 &&
        (s.target.toLowerCase() === alert.queue.toLowerCase() ||
          s.target.toLowerCase() === alert.to?.toLowerCase()),
    );
    const chatIds = subs
      .map((s) => s.telegramChatId)
      .filter((x): x is string => Boolean(x));
    await sendTelegram(text, chatIds.length ? chatIds : undefined);
    for (const s of subs) {
      if (s.webhookUrl) await sendWebhook(s.webhookUrl, alert);
    }
  }

  tip.lastProcessedBlock = Number(latest);
  tip.updatedAtMs = Date.now();
  tip.alerts = tip.alerts.slice(0, 50);
  saveTip(tip);

  return {
    from: Number(from),
    to: Number(latest),
    logs: logs.length,
    alerts: newAlerts.length,
    tip,
  };
}

/** Inject a Term-shaped CRITICAL alert without live chain activity (acceptance). */
export async function replayTermCritical() {
  const queues = loadInitialQueues().filter((q) => q.chainId === 1);
  const delay = queues.find((q) => q.protocol.includes("delay")) ?? queues[0];
  const data =
    "0xebb2b4a200000000000000000000000000000000000000000000000000000000000000009b56d5be0000000000000000000000000000000000000000000000000000000000000000610b59250000000000000000000000000ae12af3878a2d896f5c4dce3be7250fb187c0a6";
  const decoded = decodeTermLike({
    rolesInner: ["setTxCooldown", "setTxExpiration", "enableModule"].map(
      (selectorHint) => ({
        to: delay.queue,
        data,
        selectorHint,
      }),
    ),
  });
  const explanation = explainPrivilege(decoded);
  const alert: AlertEvent = {
    id: `replay-term-${Date.now()}`,
    at: new Date().toISOString(),
    chainId: 1,
    queue: delay.queue,
    protocol: delay.protocol,
    severity: "CRITICAL",
    summary: explanation.summary,
    bullets: explanation.bullets,
    data,
    to: delay.queue,
    reviewPath: `${APP}/review?chainId=1&safe=${encodeURIComponent(delay.authorityTarget)}&to=${encodeURIComponent(delay.queue)}&data=${encodeURIComponent(data)}&alert=${encodeURIComponent(explanation.summary.slice(0, 120))}`,
  };

  const tip = loadTip(1);
  tip.alerts.unshift(alert);
  tip.lastCriticalAt = alert.at;
  tip.updatedAtMs = Date.now();
  tip.lastProcessedBlock = tip.lastProcessedBlock ?? 0;
  tip.alerts = tip.alerts.slice(0, 50);
  saveTip(tip);

  const text = [
    `CRITICAL privilege · ${alert.protocol} (replay)`,
    alert.summary,
    ...alert.bullets.slice(0, 3).map((b) => `• ${b}`),
    `review: ${alert.reviewPath}`,
  ].join("\n");
  await sendTelegram(text);

  return alert;
}
