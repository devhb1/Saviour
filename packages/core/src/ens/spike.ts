/**
 * ENSv2 Sepolia spike — prove hierarchical identity for SAVIOURS incidents.
 *
 * ### ENSv2 docs consulted
 * - https://docs.ens.domains/ensv2/overview
 * - https://docs.ens.domains/ensv2/permissioned-registry
 * - https://docs.ens.domains/ensv2/tutorial-contract-developers
 * - https://docs.ens.domains/ensv2/verifiable-factory
 * - ensdomains/contracts-v2 docs/addresses/sepolia.md (on-disk)
 *
 * ### Network / deployment verified
 * Sepolia 11155111 — addresses from contracts-v2 sepolia.md; codesize checked earlier.
 *
 * ### Why ENSv2 is central
 * Each remembered threat gets `incident-XXXX.<parent>.eth` that resolves to real
 * registry metadata — not cosmetic .eth text in the UI.
 *
 * Run: pnpm spike:ens
 * Writes: deployments/sepolia-ens-identity.json
 */

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseAbi,
  parseEventLogs,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { namehash } from "viem/ens";
import { loadRootEnv, requireEnv } from "../config/env";
import {
  ALL_ROLES,
  ensSepolia,
  REGISTRATION_ROLE_BITMAP,
} from "./addresses";

const factoryAbi = parseAbi([
  "function deployProxy(address implementation, uint256 salt, bytes data) returns (address)",
  "event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)",
]);

const userRegistryAbi = parseAbi([
  "function initialize(address rootAccount, uint256 roleBitmap)",
  "function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256)",
  "function getTokenId(uint256 anyId) view returns (uint256)",
]);

const resolverAbi = parseAbi([
  "function initialize(address admin, uint256 roleBitmap, bytes[] setters)",
  "function setText(bytes32 node, string key, string value)",
  "function text(bytes32 node, string key) view returns (string)",
]);

const ethRegistrarAbi = parseAbi([
  "function isAvailable(string label) view returns (bool)",
  "function MIN_COMMITMENT_AGE() view returns (uint64)",
  "function MIN_REGISTER_DURATION() view returns (uint64)",
  "function getRegisterPrice(string label, uint64 duration, address paymentToken) view returns (uint256 base, uint256 premium)",
  "function makeCommitment(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, bytes32 referrer) view returns (bytes32)",
  "function commit(bytes32 commitment)",
  "function register(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, address paymentToken, bytes32 referrer) returns (uint256)",
]);

const mockUsdcAbi = parseAbi([
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../../../");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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

  console.log("spike:ens — ENSv2 Sepolia identity");
  console.log("relayer", account.address);
  console.log("source", ensSepolia.source);

  // --- 1) Deploy PermissionedResolver proxy ---
  // Random salt each run (CREATE2 salt is keyed by msg.sender, so re-runs stay unique).
  const resolverSalt = BigInt(`0x${randomBytes(32).toString("hex")}`);
  const resolverInit = encodeFunctionData({
    abi: resolverAbi,
    functionName: "initialize",
    args: [account.address, ALL_ROLES, []],
  });
  const resolverHash = await wallet.writeContract({
    address: ensSepolia.VerifiableFactory,
    abi: factoryAbi,
    functionName: "deployProxy",
    args: [ensSepolia.PermissionedResolverImpl, resolverSalt, resolverInit],
    account,
    chain: sepolia,
  });
  const resolverReceipt = await publicClient.waitForTransactionReceipt({
    hash: resolverHash,
  });
  const [resolverLog] = parseEventLogs({
    abi: factoryAbi,
    eventName: "ProxyDeployed",
    logs: resolverReceipt.logs,
  });
  if (!resolverLog) {
    throw new Error(`PermissionedResolver ProxyDeployed missing: ${resolverHash}`);
  }
  const resolver = resolverLog.args.proxyAddress as Address;
  console.log("PermissionedResolver proxy", resolver, "tx", resolverHash);

  // --- 2) Deploy UserRegistry proxy (incident subname registry) ---
  const registrySalt = BigInt(`0x${randomBytes(32).toString("hex")}`);
  const registryInit = encodeFunctionData({
    abi: userRegistryAbi,
    functionName: "initialize",
    args: [account.address, ALL_ROLES],
  });
  const registryHash = await wallet.writeContract({
    address: ensSepolia.VerifiableFactory,
    abi: factoryAbi,
    functionName: "deployProxy",
    args: [ensSepolia.UserRegistryImpl, registrySalt, registryInit],
    account,
    chain: sepolia,
  });
  const registryReceipt = await publicClient.waitForTransactionReceipt({
    hash: registryHash,
  });
  const [registryLog] = parseEventLogs({
    abi: factoryAbi,
    eventName: "ProxyDeployed",
    logs: registryReceipt.logs,
  });
  if (!registryLog) {
    throw new Error(`UserRegistry ProxyDeployed missing: ${registryHash}`);
  }
  const userRegistry = registryLog.args.proxyAddress as Address;
  console.log("UserRegistry proxy", userRegistry, "tx", registryHash);

  // --- 3) Mint MockUSDC + approve ETHRegistrar ---
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

  // --- 4) Pick available .eth label ---
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

  let parentLabel = `saviours${Date.now().toString(36).slice(-6)}`;
  for (let i = 0; i < 8; i += 1) {
    const available = await publicClient.readContract({
      address: ensSepolia.ETHRegistrar,
      abi: ethRegistrarAbi,
      functionName: "isAvailable",
      args: [parentLabel],
    });
    if (available) break;
    parentLabel = `saviours${randomBytes(3).toString("hex")}`;
  }
  console.log("parent label", parentLabel, "duration", minDuration.toString());

  const secret = `0x${randomBytes(32).toString("hex")}` as Hex;
  const duration = minDuration;
  const commitment = await publicClient.readContract({
    address: ensSepolia.ETHRegistrar,
    abi: ethRegistrarAbi,
    functionName: "makeCommitment",
    args: [
      parentLabel,
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
      parentLabel,
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
  const parentName = `${parentLabel}.eth`;
  console.log("registered parent", parentName, "tx", registerHash);

  // --- 5) Register incident-0001 under UserRegistry ---
  const incidentLabel = "incident-0001";
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);
  const incidentHash = await wallet.writeContract({
    address: userRegistry,
    abi: userRegistryAbi,
    functionName: "register",
    args: [
      incidentLabel,
      account.address,
      ZERO,
      resolver,
      REGISTRATION_ROLE_BITMAP,
      expiry,
    ],
    account,
    chain: sepolia,
  });
  await publicClient.waitForTransactionReceipt({ hash: incidentHash });
  const incidentName = `${incidentLabel}.${parentName}`;
  const incidentNode = namehash(incidentName);
  console.log("registered", incidentName, "node", incidentNode);

  // --- 6) Resolver text records pointing at SavioursRegistry ---
  const savioursPath = resolve(repoRoot(), "deployments/sepolia.json");
  if (!existsSync(savioursPath)) {
    throw new Error("Missing deployments/sepolia.json — deploy SavioursRegistry first");
  }
  const saviours = JSON.parse(readFileSync(savioursPath, "utf8")) as {
    contracts: { SavioursRegistry: { address: string } };
  };
  const registryAddr = saviours.contracts.SavioursRegistry.address;

  const setText = async (key: string, value: string) => {
    const h = await wallet.writeContract({
      address: resolver,
      abi: resolverAbi,
      functionName: "setText",
      args: [incidentNode, key, value],
      account,
      chain: sepolia,
    });
    await publicClient.waitForTransactionReceipt({ hash: h });
  };

  await setText("saviours.registry", registryAddr);
  await setText("saviours.network", "sepolia");
  await setText("url", `https://sepolia.etherscan.io/address/${registryAddr}`);
  console.log("resolver text records set");

  const readBack = await publicClient.readContract({
    address: resolver,
    abi: resolverAbi,
    functionName: "text",
    args: [incidentNode, "saviours.registry"],
  });
  if (readBack.toLowerCase() !== registryAddr.toLowerCase()) {
    throw new Error(`Resolver text mismatch: ${readBack}`);
  }

  const out = {
    network: "sepolia",
    chainId: 11155111,
    docs: {
      consulted: [
        "https://docs.ens.domains/ensv2/overview",
        "https://docs.ens.domains/ensv2/permissioned-registry",
        "https://docs.ens.domains/ensv2/tutorial-contract-developers",
        "https://docs.ens.domains/ensv2/verifiable-factory",
        ensSepolia.source,
      ],
    },
    protocol: ensSepolia,
    identity: {
      parentLabel,
      parentName,
      parentRegisterTx: registerHash,
      userRegistry,
      permissionedResolver: resolver,
      incidentLabel,
      incidentName,
      incidentNode,
      incidentRegisterTx: incidentHash,
      textRecords: {
        "saviours.registry": registryAddr,
        "saviours.network": "sepolia",
      },
      createdAt: new Date().toISOString(),
    },
  };

  const outPath = resolve(repoRoot(), "deployments/sepolia-ens-identity.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
  console.log("wrote", outPath);
  console.log("ok: ens spike —", incidentName, "→", registryAddr);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
