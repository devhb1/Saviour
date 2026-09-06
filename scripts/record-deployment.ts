/**
 * Record a SavioursRegistry deploy into deployments/<network>.json.
 *
 * Prefer reading Foundry's broadcast artifact after `forge script --broadcast`.
 * Never hand-edit addresses into `.env` — this file is the source of truth
 * for the TypeScript registry client.
 *
 * Usage:
 *   pnpm deploy:record -- --network sepolia
 *   pnpm deploy:record -- --network sepolia --address 0x... --block 1234567
 *
 * Broadcast path (auto):
 *   contracts/broadcast/Deploy.s.sol/<chainId>/run-latest.json
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const NETWORKS: Record<string, { chainId: number; file: string }> = {
  sepolia: { chainId: 11155111, file: "deployments/sepolia.json" },
  anvil: { chainId: 31337, file: "deployments/anvil.json" },
};

type BroadcastTx = {
  contractName?: string;
  contractAddress?: string;
  transactionType?: string;
  hash?: string;
};

type BroadcastFile = {
  transactions?: BroadcastTx[];
  receipt?: { blockNumber?: string };
  receipts?: Array<{ blockNumber?: string; contractAddress?: string }>;
  timestamp?: number;
};

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function sha256Hex(payload: string): `0x${string}` {
  return `0x${createHash("sha256").update(payload).digest("hex")}`;
}

function loadAbiHash(): `0x${string}` {
  const artifactPath = resolve(
    ROOT,
    "contracts/out/SavioursRegistry.sol/SavioursRegistry.json",
  );
  if (!existsSync(artifactPath)) {
    throw new Error(
      `Missing forge artifact at ${artifactPath}. Run: cd contracts && forge build`,
    );
  }
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as {
    abi: unknown;
  };
  return sha256Hex(JSON.stringify(artifact.abi));
}

function readFromBroadcast(chainId: number): {
  address: `0x${string}`;
  blockNumber: number;
  txHash?: `0x${string}`;
} {
  const broadcastPath = resolve(
    ROOT,
    `contracts/broadcast/Deploy.s.sol/${chainId}/run-latest.json`,
  );
  if (!existsSync(broadcastPath)) {
    throw new Error(
      `No broadcast file at ${broadcastPath}. Deploy with forge --broadcast, or pass --address and --block.`,
    );
  }
  const raw = JSON.parse(readFileSync(broadcastPath, "utf8")) as BroadcastFile;
  const createTx = (raw.transactions ?? []).find(
    (t) =>
      t.transactionType === "CREATE" &&
      (t.contractName === "SavioursRegistry" || Boolean(t.contractAddress)),
  );
  const address = (createTx?.contractAddress ??
    raw.receipts?.find((r) => r.contractAddress)?.contractAddress) as
    | `0x${string}`
    | undefined;
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Could not find SavioursRegistry address in ${broadcastPath}`);
  }

  const blockRaw =
    raw.receipts?.find((r) => r.blockNumber)?.blockNumber ??
    raw.receipt?.blockNumber;
  const blockNumber = blockRaw ? Number(blockRaw) : 0;
  if (!Number.isFinite(blockNumber) || blockNumber < 0) {
    throw new Error(`Could not parse block number from ${broadcastPath}`);
  }

  const txHash = createTx?.hash as `0x${string}` | undefined;
  return { address, blockNumber, txHash };
}

function main() {
  const network = (argValue("--network") ?? "sepolia").toLowerCase();
  const meta = NETWORKS[network];
  if (!meta) {
    throw new Error(`Unknown network "${network}". Use: ${Object.keys(NETWORKS).join(", ")}`);
  }

  const cliAddress = argValue("--address");
  const cliBlock = argValue("--block");

  let address: `0x${string}`;
  let blockNumber: number;
  let txHash: `0x${string}` | undefined;

  if (cliAddress && cliBlock) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(cliAddress)) {
      throw new Error(`Invalid --address: ${cliAddress}`);
    }
    address = cliAddress as `0x${string}`;
    blockNumber = Number(cliBlock);
    if (!Number.isInteger(blockNumber) || blockNumber < 0) {
      throw new Error(`Invalid --block: ${cliBlock}`);
    }
  } else {
    const fromBroadcast = readFromBroadcast(meta.chainId);
    address = fromBroadcast.address;
    blockNumber = fromBroadcast.blockNumber;
    txHash = fromBroadcast.txHash;
  }

  const abiHash = loadAbiHash();
  const outPath = resolve(ROOT, meta.file);
  mkdirSync(dirname(outPath), { recursive: true });

  const record = {
    network,
    chainId: meta.chainId,
    contracts: {
      SavioursRegistry: {
        address: address.toLowerCase(),
        blockNumber,
        abiHash,
        deployedAt: new Date().toISOString(),
        ...(txHash ? { deployTxHash: txHash.toLowerCase() } : {}),
      },
    },
  };

  writeFileSync(outPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(JSON.stringify(record.contracts.SavioursRegistry, null, 2));
}

main();
