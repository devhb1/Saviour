/**
 * Register fixed parent `saviours.eth` on Sepolia ENSv2.
 * Reuses existing UserRegistry + PermissionedResolver (EAC stays intact),
 * rewrites identity JSON, then re-names ATTACK-1 / BOT-1 under the new parent.
 *
 * Usage: pnpm --filter @saviours/core exec tsx src/ens/migrateToSavioursEth.ts
 */
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { namehash } from "viem/ens";
import { loadRootEnv, requireEnv } from "../config/env";
import { getEvidenceBundle } from "../evidence/getEvidence";
import { evidenceHashFrom } from "../registry/ids";
import { ensSepolia } from "./addresses";
import { registerIncidentName, writeIncidentStoryTexts } from "./client";
import { loadEnsIdentity, type EnsIdentityRecord } from "./identity";
import { resolveIncident } from "./resolve";
import { buildStoryTextRecords } from "./story";
import { checkTarget } from "../shield/check";

const PARENT_LABEL = "saviours";
const PARENT_NAME = `${PARENT_LABEL}.eth`;

const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";
const BOT_1 = "0x352423e2fa5d5c99343d371c9e3bc56c87723cc7";

const ethRegistrarAbi = parseAbi([
  "function isAvailable(string label) view returns (bool)",
  "function MIN_COMMITMENT_AGE() view returns (uint64)",
  "function MIN_REGISTER_DURATION() view returns (uint64)",
  "function makeCommitment(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, bytes32 referrer) view returns (bytes32)",
  "function commit(bytes32 commitment)",
  "function register(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, address paymentToken, bytes32 referrer) returns (uint256)",
]);

const mockUsdcAbi = parseAbi([
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
]);

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../../../");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function syncWebCopy() {
  const corePath = resolve(repoRoot(), "deployments/sepolia-ens-identity.json");
  const webPath = resolve(repoRoot(), "apps/web/deployments/sepolia-ens-identity.json");
  mkdirSync(dirname(webPath), { recursive: true });
  copyFileSync(corePath, webPath);
  console.log("synced", webPath);
}

async function renameHero(
  address: string,
  incidentLabel: string,
  incidentIdSuffix: string,
) {
  console.log(`\n— rename ${incidentLabel} —`);
  const before = await resolveIncident(address, { keys: ["saviours.status"] });
  console.log("BEFORE", { hit: before.hit, status: before.records["saviours.status"], name: before.ensName });

  const bundle = await getEvidenceBundle(1, address);
  const status = bundle.signalStatus.status;
  console.log("live Graph", status, bundle.signalStatus.rule);
  if (status !== "TAINTED" && status !== "WATCH") {
    throw new Error(`${incidentLabel}: unexpected status ${status}`);
  }

  const story = buildStoryTextRecords({
    signals: bundle.signals,
    status,
    evidence: bundle.evidence,
    rulesVersion: "pivot-3.3",
  });

  const { identity } = loadEnsIdentity();
  const registered = await registerIncidentName({
    address,
    status,
    incidentId: `0x${incidentIdSuffix.repeat(32).slice(0, 64)}`,
    incidentLabel,
    confidence: status === "TAINTED" ? 0.92 : 0.88,
    evidenceHash: evidenceHashFrom(
      bundle.evidence.slice(0, 8).map((e, i) => ({
        id: e.id || `e-${i}`,
        source: e.source || "graph",
        reference: e.txHash || e.id || `r-${i}`,
        claim: e.claim || e.id,
        timestamp: e.timestamp || 1,
        rawHash: ("11".repeat(32)) as `0x${string}`,
      })),
    ),
    threat: bundle.signals.map((s) => s.id).join(","),
    investigatorName: `investigator-01.${identity.parentName}`,
  });
  console.log("registered", registered.ensName, registered.txHash ?? "(reused)", "reused=", registered.reused);

  const written = await writeIncidentStoryTexts(address, story);
  console.log("story", written.txHash ?? "(unchanged)");

  const after = await resolveIncident(address);
  console.log("AFTER", {
    hit: after.hit,
    status: after.records["saviours.status"],
    plain: after.records["saviours.plainVerdict"],
    ensName: after.ensName,
    source: after.source,
  });

  const shield = await checkTarget({
    targetChainId: 1,
    address,
    registryNetwork: "sepolia",
  });
  console.log("SHIELD", { decision: shield.decision, source: shield.source });

  if (!after.hit || after.records["saviours.status"] !== status) {
    throw new Error(`${incidentLabel}: rename failed — status not readable under ${PARENT_NAME}`);
  }
  if (!after.ensName?.endsWith(`.${PARENT_NAME}`)) {
    throw new Error(`${incidentLabel}: ensName ${after.ensName} not under ${PARENT_NAME}`);
  }
}

async function main() {
  loadRootEnv();
  const pk = requireEnv("RELAYER_PRIVATE_KEY");
  const rpc = requireEnv("SEPOLIA_RPC_URL");
  const key = (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex;
  const account = privateKeyToAccount(key);

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpc),
  });
  const wallet = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpc),
  });

  const record = loadEnsIdentity();
  const old = record.identity;
  console.log("migrate →", PARENT_NAME);
  console.log("relayer", account.address);
  console.log(
    "balance",
    formatEther(await publicClient.getBalance({ address: account.address })),
    "ETH",
  );
  console.log("reuse userRegistry", old.userRegistry);
  console.log("reuse permissionedResolver", old.permissionedResolver);
  console.log("old parent", old.parentName);

  if (old.parentLabel === PARENT_LABEL) {
    console.log("identity already on saviours.eth — skip parent register");
  } else {
    const available = await publicClient.readContract({
      address: ensSepolia.ETHRegistrar,
      abi: ethRegistrarAbi,
      functionName: "isAvailable",
      args: [PARENT_LABEL],
    });
    if (!available) {
      throw new Error(`${PARENT_NAME} is not available`);
    }

    const decimals = await publicClient.readContract({
      address: ensSepolia.MockUSDC,
      abi: mockUsdcAbi,
      functionName: "decimals",
    });
    const mintAmount = 10_000n * 10n ** BigInt(decimals);
    const mintHash = await wallet.writeContract({
      address: ensSepolia.MockUSDC,
      abi: mockUsdcAbi,
      functionName: "mint",
      args: [account.address, mintAmount],
      account,
      chain: sepolia,
    });
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
    const approveHash = await wallet.writeContract({
      address: ensSepolia.MockUSDC,
      abi: mockUsdcAbi,
      functionName: "approve",
      args: [ensSepolia.ETHRegistrar, mintAmount],
      account,
      chain: sepolia,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log("MockUSDC minted + approved");

    const minDuration = await publicClient.readContract({
      address: ensSepolia.ETHRegistrar,
      abi: ethRegistrarAbi,
      functionName: "MIN_REGISTER_DURATION",
    });
    const minCommitAge = await publicClient.readContract({
      address: ensSepolia.ETHRegistrar,
      abi: ethRegistrarAbi,
      functionName: "MIN_COMMITMENT_AGE",
    });

    const secret = `0x${randomBytes(32).toString("hex")}` as Hex;
    const duration = minDuration;
    const userRegistry = old.userRegistry as Address;
    const resolver = old.permissionedResolver as Address;

    const commitment = await publicClient.readContract({
      address: ensSepolia.ETHRegistrar,
      abi: ethRegistrarAbi,
      functionName: "makeCommitment",
      args: [
        PARENT_LABEL,
        account.address,
        secret,
        userRegistry,
        resolver,
        duration,
        ZERO_BYTES32,
      ],
    });

    const commitHash = await wallet.writeContract({
      address: ensSepolia.ETHRegistrar,
      abi: ethRegistrarAbi,
      functionName: "commit",
      args: [commitment],
      account,
      chain: sepolia,
    });
    await publicClient.waitForTransactionReceipt({ hash: commitHash });
    console.log("commitment submitted; waiting", minCommitAge.toString(), "s");
    await sleep(Number(minCommitAge) * 1000 + 2000);

    const registerHash = await wallet.writeContract({
      address: ensSepolia.ETHRegistrar,
      abi: ethRegistrarAbi,
      functionName: "register",
      args: [
        PARENT_LABEL,
        account.address,
        secret,
        userRegistry,
        resolver,
        duration,
        ensSepolia.MockUSDC,
        ZERO_BYTES32,
      ],
      account,
      chain: sepolia,
    });
    await publicClient.waitForTransactionReceipt({ hash: registerHash });
    console.log("registered parent", PARENT_NAME, "tx", registerHash);

    const parentNode = namehash(PARENT_NAME);
    const next: EnsIdentityRecord = {
      ...record,
      identity: {
        ...old,
        parentLabel: PARENT_LABEL,
        parentName: PARENT_NAME,
        parentRegisterTx: registerHash,
        incidentName: `${old.incidentLabel}.${PARENT_NAME}`,
        incidentNode: namehash(`${old.incidentLabel}.${PARENT_NAME}`) as Hex,
        investigatorName: old.investigatorName?.replace(
          old.parentName,
          PARENT_NAME,
        ),
        createdAt: old.createdAt,
        // keep eacConfiguredAt / investigator / disputer
      },
    };
    // Patch investigator name if present
    if ("investigatorName" in old && typeof (old as { investigatorName?: string }).investigatorName === "string") {
      (next.identity as { investigatorName?: string }).investigatorName =
        `investigator-01.${PARENT_NAME}`;
    }

    const outPath = resolve(repoRoot(), "deployments/sepolia-ens-identity.json");
    writeFileSync(outPath, `${JSON.stringify(next, null, 2)}\n`);
    console.log("wrote", outPath, "parentNode", parentNode);
    syncWebCopy();
  }

  await renameHero(ATTACK_1, "SAV-ATTACK-1", "51");
  await renameHero(BOT_1, "SAV-BOT-1", "52");

  console.log("\nok: saviours.eth parent live · heroes re-named");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
