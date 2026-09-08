/**
 * Resolve SAVIOURS incident verdicts from ENSv2 text records (Sepolia).
 *
 * Prefer UniversalResolver; fall back to PermissionedResolver.text(namehash, key)
 * when UR returns empty / reverts (common for UserRegistry subnames).
 *
 * Never invents records — missing keys → empty string / absent.
 */

import {
  createPublicClient,
  http,
  namehash,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { sepolia } from "viem/chains";
import { loadRootEnv, requireEnv } from "../config/env";
import { permissionedResolverAbi, userRegistryAbi } from "./abi";
import { ensSepolia } from "./addresses";
import { isEnsIdentityReady, loadEnsIdentity } from "./identity";
import { ensNameForAddress, labelForAddress } from "./label";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
/** PIVOT §2.4 text keys (and helpers). */
export const SAVIOURS_TEXT_KEYS = [
  "saviours.status",
  "saviours.threat",
  "saviours.confidence",
  "saviours.evidenceHash",
  "saviours.dossier",
  "saviours.investigator",
  "saviours.incident",
  "saviours.registry",
  "saviours.dispute",
  "saviours.network",
  "saviours.plainVerdict",
  "saviours.atomicTx",
  "saviours.protocols",
  "saviours.rulesVersion",
  "url",
] as const;

export type SavioursTextKey = (typeof SAVIOURS_TEXT_KEYS)[number];

export type IncidentRecords = Partial<Record<SavioursTextKey, string>>;

export type ResolveIncidentResult = {
  ensName: string;
  ensNode: Hex;
  label: string;
  parentName: string;
  /** Non-empty text records found */
  records: IncidentRecords;
  /** How the primary read succeeded */
  source: "universal-resolver" | "resolver.text" | "none";
  /** True when at least one saviours.* key is set */
  hit: boolean;
};

function publicClient(): PublicClient {
  loadRootEnv();
  const rpc = requireEnv("SEPOLIA_RPC_URL");
  return createPublicClient({
    chain: sepolia,
    transport: http(rpc),
  });
}

function resolverAddress(): Address {
  if (!isEnsIdentityReady()) {
    throw new Error(
      "ENS identity not ready — need deployments/sepolia-ens-identity.json",
    );
  }
  return loadEnsIdentity().identity.permissionedResolver;
}

async function readTextViaResolver(
  client: PublicClient,
  node: Hex,
  key: string,
): Promise<string> {
  try {
    const value = await client.readContract({
      address: resolverAddress(),
      abi: permissionedResolverAbi,
      functionName: "text",
      args: [node, key],
    });
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

async function readTextViaUniversal(
  client: PublicClient,
  ensName: string,
  key: string,
): Promise<string | null> {
  try {
    const value = await client.getEnsText({
      name: ensName,
      key,
      universalResolverAddress: ensSepolia.UniversalResolver,
    });
    return value ?? null;
  } catch {
    return null;
  }
}

/**
 * Read all known SAVIOURS text keys for an ENS name.
 * Tries UniversalResolver first for `saviours.status` / `saviours.registry`,
 * then fills remaining keys via direct PermissionedResolver.text.
 */
export async function resolveIncidentName(
  ensName: string,
  opts: { keys?: readonly SavioursTextKey[] } = {},
): Promise<ResolveIncidentResult> {
  if (!ensName.includes(".")) {
    throw new Error(`Invalid ENS name: ${ensName}`);
  }

  const identity = isEnsIdentityReady() ? loadEnsIdentity().identity : null;
  const parentName = identity?.parentName ?? ensName.split(".").slice(1).join(".");
  const label = ensName.slice(0, ensName.length - parentName.length - 1);
  const ensNode = namehash(ensName);
  const keys = opts.keys ?? SAVIOURS_TEXT_KEYS;
  const client = publicClient();

  const records: IncidentRecords = {};
  let source: ResolveIncidentResult["source"] = "none";

  // Probe UniversalResolver with a key we know may exist on spike names
  const probeKey: SavioursTextKey =
    keys.includes("saviours.registry")
      ? "saviours.registry"
      : keys.includes("saviours.status")
        ? "saviours.status"
        : keys[0]!;

  const urProbe = await readTextViaUniversal(client, ensName, probeKey);
  if (urProbe !== null && urProbe !== "") {
    records[probeKey] = urProbe;
    source = "universal-resolver";
  }

  for (const key of keys) {
    if (records[key]) continue;
    const viaUr =
      source === "universal-resolver"
        ? await readTextViaUniversal(client, ensName, key)
        : null;
    if (viaUr !== null && viaUr !== "") {
      records[key] = viaUr;
      source = "universal-resolver";
      continue;
    }
    const viaDirect = await readTextViaResolver(client, ensNode, key);
    if (viaDirect) {
      records[key] = viaDirect;
      if (source === "none") source = "resolver.text";
    }
  }

  const hit = Object.keys(records).some((k) => k.startsWith("saviours."));

  return {
    ensName,
    ensNode,
    label,
    parentName,
    records,
    source: hit ? source : "none",
    hit,
  };
}

/**
 * True when the address-label is still registered under the parent UserRegistry.
 * Unregistered labels must not count as ENS memory (resolver texts can linger).
 */
export async function isIncidentNameRegistered(
  address: string,
): Promise<boolean> {
  if (!isEnsIdentityReady()) return false;
  const identity = loadEnsIdentity().identity;
  const label = labelForAddress(address);
  const client = publicClient();
  try {
    const resolver = await client.readContract({
      address: identity.userRegistry,
      abi: userRegistryAbi,
      functionName: "getResolver",
      args: [label],
    });
    return (
      typeof resolver === "string" &&
      resolver.toLowerCase() !== ZERO_ADDRESS.toLowerCase()
    );
  } catch {
    return false;
  }
}

/**
 * Resolve incident records for a target address under the SAVIOURS parent.
 * Name = `<lowercase-address>.<parent>.eth` (may not exist until S3.2 registers it).
 * If the label is not registered, returns empty records (hit=false).
 */
export async function resolveIncident(
  address: string,
  opts: { parentName?: string; keys?: readonly SavioursTextKey[] } = {},
): Promise<ResolveIncidentResult> {
  const label = labelForAddress(address);
  const ensName = ensNameForAddress(address, opts.parentName);
  const registered = await isIncidentNameRegistered(address);
  if (!registered) {
    const identity = isEnsIdentityReady() ? loadEnsIdentity().identity : null;
    return {
      ensName,
      ensNode: namehash(ensName),
      label,
      parentName: identity?.parentName ?? ensName.split(".").slice(1).join("."),
      records: {},
      source: "none",
      hit: false,
    };
  }
  return resolveIncidentName(ensName, { keys: opts.keys });
}

/** Convenience: only `saviours.status` (empty string if unset). */
export async function resolveStatus(address: string): Promise<{
  ensName: string;
  status: string;
  source: ResolveIncidentResult["source"];
}> {
  const r = await resolveIncident(address, {
    keys: ["saviours.status", "saviours.registry"],
  });
  return {
    ensName: r.ensName,
    status: r.records["saviours.status"] ?? "",
    source: r.source,
  };
}
