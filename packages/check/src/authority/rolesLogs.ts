import {
  decodeEventLog,
  parseAbi,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import type { RolesPolicy, RolesRole, RolesTargetClearance } from "./rolesTree.js";

const BLOCKSCOUT_LOGS = "https://eth.blockscout.com/api/v2/addresses";

/** Permission events plus the module lifecycle events a Roles proxy always emits. */
const ROLES_LOG_ABI = parseAbi([
  "event AssignRoles(address module, bytes32[] roleKeys, bool[] memberOf)",
  "event SetDefaultRole(address module, bytes32 defaultRoleKey)",
  "event AllowTarget(bytes32 roleKey, address targetAddress, uint8 options)",
  "event ScopeTarget(bytes32 roleKey, address targetAddress)",
  "event RevokeTarget(bytes32 roleKey, address targetAddress)",
  "event AllowFunction(bytes32 roleKey, address targetAddress, bytes4 selector, uint8 options)",
  "event ScopeFunction(bytes32 roleKey, address targetAddress, bytes4 selector, (uint8 parent, uint8 paramType, uint8 operator, bytes compValue)[] conditions, uint8 options)",
  "event RevokeFunction(bytes32 roleKey, address targetAddress, bytes4 selector)",
  "event SetAllowance(bytes32 allowanceKey, uint128 balance, uint128 maxRefill, uint128 refill, uint64 period, uint64 timestamp)",
  "event EnabledModule(address indexed module)",
  "event DisabledModule(address indexed module)",
  "event RolesModSetup(address indexed initiator, address indexed owner, address indexed avatar, address target)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event Initialized(uint8 version)",
  "event AvatarSet(address indexed previousAvatar, address indexed newAvatar)",
  "event TargetSet(address indexed previousTarget, address indexed newTarget)",
  "event ExecutionFromModuleSuccess(address indexed module)",
  "event ExecutionFromModuleFailure(address indexed module)",
]);
const DEAD_ROLE = `0x${"0".repeat(64)}`;

type ScoutParam = { name?: string; value?: unknown };
type ScoutLog = {
  block_number?: number;
  index?: number;
  decoded?: { abi?: { name?: string }; parameters?: ScoutParam[] };
};

export type RolesEvent = {
  blockNumber: number;
  index: number;
  name: string;
  params: Record<string, unknown>;
};

function publicError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const line = msg.split("\n")[0] ?? "read failed";
  if (/https?:\/\//i.test(line) || /\/v2\/|api[_-]?key/i.test(line)) {
    return "RPC request failed";
  }
  return line.slice(0, 160);
}

const EXEC: Record<number, string> = {
  0: "None",
  1: "Send",
  2: "DelegateCall",
  3: "Both",
};

function asAddress(v: unknown): Hex | null {
  if (typeof v !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(v)) return null;
  return v.toLowerCase() as Hex;
}

function asBytes32(v: unknown): Hex | null {
  if (typeof v !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(v)) return null;
  return v.toLowerCase() as Hex;
}

function asBool(v: unknown): boolean {
  return v === true || v === "true";
}

function asUint(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v !== "") return Number(v);
  return 0;
}

function paramsOf(log: ScoutLog): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of log.decoded?.parameters ?? []) {
    if (p.name) out[p.name] = p.value;
  }
  return out;
}

/** Newest-first explorer pages → ascending chain order, capped at the pin. */
export function scoutItemsToEvents(
  items: ScoutLog[],
  toBlock: bigint,
): { events: RolesEvent[]; truncated: boolean; dropped: number } {
  const pin = Number(toBlock);
  const events: RolesEvent[] = [];
  let dropped = 0;
  for (const item of items) {
    const block = item.block_number ?? 0;
    if (block > pin) continue;
    const name = item.decoded?.abi?.name;
    if (!name) {
      dropped += 1;
      continue;
    }
    events.push({
      blockNumber: block,
      index: item.index ?? 0,
      name,
      params: paramsOf(item),
    });
  }
  events.sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);
  return { events, truncated: false, dropped };
}

type MutableFn = RolesTargetClearance["functions"][number];
type MutableTarget = {
  address: Hex;
  clearance: string;
  executionOptions?: string;
  functions: MutableFn[];
};
type MutableRole = {
  key: Hex;
  members: Set<Hex>;
  targets: Map<Hex, MutableTarget>;
};

function roleOf(roles: Map<Hex, MutableRole>, key: Hex): MutableRole {
  let role = roles.get(key);
  if (!role) {
    role = { key, members: new Set(), targets: new Map() };
    roles.set(key, role);
  }
  return role;
}

function targetOf(role: MutableRole, address: Hex): MutableTarget {
  let target = role.targets.get(address);
  if (!target) {
    target = { address, clearance: "None", functions: [] };
    role.targets.set(address, target);
  }
  return target;
}

function upsertFn(
  target: MutableTarget,
  selector: Hex,
  wildcarded: boolean,
  executionOptions: string,
  conditionId: string | null,
) {
  const sel = selector.toLowerCase() as Hex;
  const existing = target.functions.find((f) => f.selector === sel);
  const next: MutableFn = {
    selector: sel,
    wildcarded,
    executionOptions,
    conditionId,
  };
  if (existing) {
    Object.assign(existing, next);
  } else {
    target.functions.push(next);
  }
}

/**
 * Replay Roles v2.1.1 configuration events.
 * Allow* is an explicit unconstrained permission. Scope* with a condition
 * list is recorded, not evaluated into a token quantity.
 */
export function replayRolesEvents(events: RolesEvent[]): {
  roles: RolesRole[];
  hasAllowanceData: boolean;
  conditionedFunctions: number;
} {
  const roles = new Map<Hex, MutableRole>();
  let hasAllowanceData = false;
  let conditionedFunctions = 0;

  for (const ev of events) {
    const p = ev.params;
    if (ev.name === "AssignRoles") {
      const member = asAddress(p.module);
      const keys = Array.isArray(p.roleKeys) ? p.roleKeys : [];
      const flags = Array.isArray(p.memberOf) ? p.memberOf : [];
      if (!member) continue;
      keys.forEach((key, i) => {
        const roleKey = asBytes32(key);
        if (!roleKey) return;
        const role = roleOf(roles, roleKey);
        if (asBool(flags[i])) role.members.add(member);
        else role.members.delete(member);
      });
      continue;
    }
    if (ev.name === "SetDefaultRole") {
      const member = asAddress(p.module);
      const roleKey = asBytes32(p.roleKey ?? p.defaultRoleKey);
      if (!member || !roleKey || roleKey === DEAD_ROLE) continue;
      roleOf(roles, roleKey).members.add(member);
      continue;
    }
    if (ev.name === "AllowTarget") {
      const roleKey = asBytes32(p.roleKey);
      const target = asAddress(p.targetAddress);
      if (!roleKey || !target) continue;
      const t = targetOf(roleOf(roles, roleKey), target);
      t.clearance = "Target";
      t.functions = [];
      t.executionOptions = EXEC[asUint(p.options)] ?? "None";
      continue;
    }
    if (ev.name === "ScopeTarget") {
      const roleKey = asBytes32(p.roleKey);
      const target = asAddress(p.targetAddress);
      if (!roleKey || !target) continue;
      targetOf(roleOf(roles, roleKey), target).clearance = "Function";
      continue;
    }
    if (ev.name === "RevokeTarget") {
      const roleKey = asBytes32(p.roleKey);
      const target = asAddress(p.targetAddress);
      if (!roleKey || !target) continue;
      roles.get(roleKey)?.targets.delete(target);
      continue;
    }
    if (ev.name === "AllowFunction" || ev.name === "ScopeFunction") {
      const roleKey = asBytes32(p.roleKey);
      const targetAddr = asAddress(p.targetAddress);
      const selector = typeof p.selector === "string" ? p.selector : "";
      if (!roleKey || !targetAddr || !/^0x[a-fA-F0-9]{8}$/.test(selector)) continue;
      const target = targetOf(roleOf(roles, roleKey), targetAddr);
      if (target.clearance === "None" || target.clearance === "Target") {
        target.clearance = "Function";
      }
      const options = EXEC[asUint(p.options)] ?? "None";
      if (ev.name === "AllowFunction") {
        upsertFn(target, selector as Hex, true, options, null);
      } else {
        const conditions = Array.isArray(p.conditions) ? p.conditions : [];
        const conditionId =
          conditions.length > 0 ? `conditions:${conditions.length}` : null;
        if (conditionId) conditionedFunctions += 1;
        upsertFn(target, selector as Hex, false, options, conditionId);
      }
      continue;
    }
    if (ev.name === "RevokeFunction") {
      const roleKey = asBytes32(p.roleKey);
      const targetAddr = asAddress(p.targetAddress);
      const selector =
        typeof p.selector === "string" ? p.selector.toLowerCase() : "";
      const target = roleKey ? roles.get(roleKey)?.targets.get(targetAddr ?? "0x") : undefined;
      if (!target) continue;
      target.functions = target.functions.filter((f) => f.selector !== selector);
      continue;
    }
    if (ev.name === "SetAllowance") {
      hasAllowanceData = true;
    }
  }

  const out: RolesRole[] = [...roles.values()].map((role) => ({
    key: role.key,
    members: [...role.members],
    targets: [...role.targets.values()].map(
      (t): RolesTargetClearance => ({
        address: t.address,
        clearance: t.clearance,
        executionOptions: t.executionOptions,
        functions: t.functions,
      }),
    ),
  }));
  return { roles: out, hasAllowanceData, conditionedFunctions };
}

async function loadBlockscoutEvents(
  rolesAddress: Hex,
  toBlock: bigint,
): Promise<{ events: RolesEvent[]; truncated: boolean; pages: number; dropped: number }> {
  const items: ScoutLog[] = [];
  let url: string | null = `${BLOCKSCOUT_LOGS}/${rolesAddress}/logs`;
  let pages = 0;
  let truncated = false;
  while (url && pages < 40) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`blockscout logs HTTP ${res.status}`);
    }
    const json = (await res.json()) as {
      items?: ScoutLog[];
      next_page_params?: Record<string, string> | null;
    };
    pages += 1;
    items.push(...(json.items ?? []));
    if (json.next_page_params && pages >= 40) {
      truncated = true;
      break;
    }
    if (!json.next_page_params) break;
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(json.next_page_params).map(([k, v]) => [k, String(v)]),
      ),
    );
    url = `${BLOCKSCOUT_LOGS}/${rolesAddress}/logs?${q}`;
  }
  const parsed = scoutItemsToEvents(items, toBlock);
  return {
    events: parsed.events,
    truncated: truncated || parsed.truncated,
    pages,
    dropped: parsed.dropped,
  };
}

/**
 * Roles v2.1.1 policy from chain logs, pinned at `toBlock`.
 * RPC eth_getLogs is attempted once. Alchemy free tier rejects wide ranges,
 * so Blockscout's decoded log index is the production reader. Membership and
 * permissions still come from chain events, not from a fixture.
 */
export async function rolesPolicyFromChainLogs(opts: {
  client: PublicClient;
  rolesAddress: Hex;
  toBlock: bigint;
}): Promise<
  Pick<
    RolesPolicy,
    "roles" | "hasAllowanceData" | "gaps" | "reconstructed" | "source" | "status"
  >
> {
  const addr = opts.rolesAddress.toLowerCase() as Hex;
  const gaps: RolesPolicy["gaps"] = [];
  const reconstructed: string[] = [];

  let events: RolesEvent[] = [];
  let truncated = false;
  let undecoded = 0;
  let usedFallback = false;
  let fallbackDropped = 0;
  try {
    const deploy = await findDeploymentBlock(opts.client, addr, opts.toBlock);
    reconstructed.push(`chain.deployBlock:${deploy}`);
    const rpc = await loadRpcEvents(opts.client, addr, deploy, opts.toBlock);
    if (rpc) {
      events = rpc.events;
      undecoded = rpc.undecoded;
      reconstructed.push(`chain.logsSource:rpc-logs`);
      reconstructed.push(`chain.logs:${events.length}:undecoded=${undecoded}`);
    } else {
      usedFallback = true;
      const loaded = await loadBlockscoutEvents(addr, opts.toBlock);
      events = loaded.events;
      truncated = loaded.truncated;
      fallbackDropped = loaded.dropped;
      reconstructed.push(`chain.logsSource:blockscout-fallback`);
      reconstructed.push(`chain.logs:${events.length}:pages=${loaded.pages}`);
      gaps.push({
        area: `roles:${addr}:rpc-logs`,
        reason:
          "eth_getLogs could not cover this block span. Indexed chain logs were used as a labeled fallback, so status stays partial.",
      });
    }
  } catch (e) {
    gaps.push({
      area: `roles:${addr}:logs`,
      reason: `Chain log read failed: ${publicError(e)}`,
    });
    return {
      roles: [],
      hasAllowanceData: false,
      gaps,
      reconstructed,
      source: "chain-logs",
      status: "failed",
    };
  }

  if (truncated) {
    gaps.push({
      area: `roles:${addr}:logs-truncated`,
      reason: "Log index pagination stopped early — policy may be incomplete",
    });
  }
  if (undecoded > 0) {
    gaps.push({
      area: `roles:${addr}:undecoded-logs`,
      reason: `${undecoded} log(s) did not match the Roles ABI. Those permissions are missing, so status stays partial.`,
    });
  }
  if (fallbackDropped > 0) {
    gaps.push({
      area: `roles:${addr}:fallback-undecoded`,
      reason: `${fallbackDropped} indexed log(s) had no decoded name and were not replayed. Status stays partial.`,
    });
  }

  const replay = replayRolesEvents(events);
  if (replay.conditionedFunctions > 0) {
    gaps.push({
      area: `roles:${addr}:conditions`,
      reason: `${replay.conditionedFunctions} scoped function(s) have condition trees. Selectors are reconstructed; token quantities are not evaluated.`,
    });
  }
  if (replay.hasAllowanceData) {
    gaps.push({
      area: `roles:${addr}:allowances`,
      reason: "SetAllowance events exist — balances are not reduced to token quantities",
    });
  }

  for (const role of replay.roles) {
    reconstructed.push(
      `role:${role.key}:members=${role.members.length}:targets=${role.targets.length}`,
    );
    for (const member of role.members) {
      try {
        const current = (await opts.client.readContract({
          address: addr as Address,
          abi: [
            {
              type: "function",
              name: "defaultRoles",
              stateMutability: "view",
              inputs: [{ name: "member", type: "address" }],
              outputs: [{ type: "bytes32" }],
            },
          ],
          functionName: "defaultRoles",
          args: [member as Address],
          blockNumber: opts.toBlock,
        })) as Hex;
        reconstructed.push(
          `defaultRoles:${member}=${current.toLowerCase()}`,
        );
      } catch (e) {
        gaps.push({
          area: `roles:${addr}:defaultRoles:${member}`,
          reason: `Pinned defaultRoles read failed: ${publicError(e)}`,
        });
      }
    }
  }

  if (!replay.roles.length) {
    gaps.push({
      area: `roles:${addr}:empty-logs`,
      reason: "No AssignRoles / permission events at or before the pinned block",
    });
  }

  const incomplete =
    truncated ||
    usedFallback ||
    undecoded > 0 ||
    fallbackDropped > 0 ||
    replay.conditionedFunctions > 0 ||
    replay.hasAllowanceData;
  const status: RolesPolicy["status"] =
    replay.roles.length === 0
      ? "failed"
      : incomplete
        ? "partial"
        : "reconstructed";

  return {
    roles: replay.roles,
    hasAllowanceData: replay.hasAllowanceData,
    gaps,
    reconstructed,
    source: "chain-logs",
    status,
  };
}

async function loadRpcEvents(
  client: PublicClient,
  address: Address,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<{ events: RolesEvent[]; undecoded: number } | null> {
  const pull = (from: bigint, to: bigint) =>
    client.getLogs({ address, fromBlock: from, toBlock: to });

  let chunk: bigint | null = null;
  try {
    const logs = await pull(fromBlock, toBlock);
    return decodeRawLogs(logs);
  } catch {
    for (const size of [5000n, 1000n, 200n, 50n, 10n]) {
      const end = fromBlock + size - 1n > toBlock ? toBlock : fromBlock + size - 1n;
      try {
        await pull(fromBlock, end);
        chunk = size;
        break;
      } catch {
        /* try a narrower window */
      }
    }
  }
  if (chunk == null) return null;
  const span = toBlock - fromBlock + 1n;
  if (span / chunk > 24n) return null;

  const raw = [];
  for (let from = fromBlock; from <= toBlock; from += chunk) {
    const to = from + chunk - 1n > toBlock ? toBlock : from + chunk - 1n;
    raw.push(...(await pull(from, to)));
  }
  return decodeRawLogs(raw);
}

function decodeRawLogs(
  logs: Awaited<ReturnType<PublicClient["getLogs"]>>,
): { events: RolesEvent[]; undecoded: number } {
  const events: RolesEvent[] = [];
  let undecoded = 0;
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: ROLES_LOG_ABI,
        data: log.data,
        topics: log.topics,
      });
      const params: Record<string, unknown> = {};
      const args = decoded.args as Record<string, unknown>;
      for (const [key, value] of Object.entries(args)) {
        params[key] = typeof value === "bigint" ? Number(value) : value;
      }
      events.push({
        blockNumber: Number(log.blockNumber ?? 0),
        index: Number(log.logIndex ?? 0),
        name: decoded.eventName,
        params,
      });
    } catch {
      undecoded += 1;
    }
  }
  events.sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);
  return { events, undecoded };
}

async function findDeploymentBlock(
  client: PublicClient,
  address: Address,
  toBlock: bigint,
): Promise<bigint> {
  const read = (blockNumber: bigint) =>
    client.getCode({ address, blockNumber });
  let lo = 1n;
  let hi = toBlock;
  const atEnd = await read(toBlock);
  if (!atEnd || atEnd === "0x") return toBlock;
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    const code = await read(mid);
    if (code && code !== "0x") hi = mid;
    else lo = mid + 1n;
  }
  return lo;
}
