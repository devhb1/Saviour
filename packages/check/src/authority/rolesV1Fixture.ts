/**
 * Fixture-scoped Roles v1 reader for the 16 Nov 2026 incident Safe only.
 * Not a general v1 product adapter — do not use for arbitrary Safes.
 */
import type { Address, Hex, PublicClient } from "viem";
import { ROLES_V1_MASTERCOPY } from "./rolesAbi.js";
import type { CoverageGap } from "./types.js";

export const NOV16_FIXTURE = {
  safe: "0x595362a906a0b4e90aee1430b1f80fdde2be80de" as Hex,
  roles: "0x729c87d1b6939c9b2b0858ac25e235e83e5e6410" as Hex,
  operator: "0x065f395147fc72747c7f48f67f039d4235884148" as Hex,
  mastercopy: ROLES_V1_MASTERCOPY,
  blockBeforeTheft: 26427326n,
  drainBlock: 26427327n,
} as const;

/** Minimal v1 ABI — numeric role ids / membership probes. */
const rolesV1Abi = [
  {
    type: "function",
    name: "avatar",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getMemberRoles",
    stateMutability: "view",
    inputs: [{ name: "member", type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
] as const;

export type Nov16V1Snapshot = {
  rolesAddress: Hex;
  blockNumber: string;
  avatar: Hex | null;
  owner: Hex | null;
  operatorRolesBitmap: string | null;
  mastercopyOk: boolean;
  gaps: CoverageGap[];
  reconstructed: string[];
  /**
   * Without full v1 permission tree: we can confirm membership probe + identity,
   * but cannot claim reconstructed free-recipient from chain alone.
   */
  authorityClaim:
    | "member_has_roles_bitmap"
    | "unreadable"
    | "wrong_fixture";
};

export async function readNov16V1AtBlock(
  client: PublicClient,
  blockNumber: bigint = NOV16_FIXTURE.blockBeforeTheft,
): Promise<Nov16V1Snapshot> {
  const gaps: CoverageGap[] = [];
  const reconstructed: string[] = [];
  const addr = NOV16_FIXTURE.roles;

  let avatar: Hex | null = null;
  let owner: Hex | null = null;
  let operatorRolesBitmap: string | null = null;
  let mastercopyOk = false;

  try {
    const code = await client.getCode({
      address: addr as Address,
      blockNumber,
    });
    const c = (code ?? "").toLowerCase();
    mastercopyOk = c.includes(
      NOV16_FIXTURE.mastercopy.toLowerCase().replace(/^0x/, ""),
    );
    reconstructed.push(`v1.mastercopyMatch:${mastercopyOk}`);
  } catch (e) {
    gaps.push({
      area: "nov16:code",
      reason: e instanceof Error ? e.message : String(e),
    });
  }

  try {
    avatar = (
      (await client.readContract({
        address: addr as Address,
        abi: rolesV1Abi,
        functionName: "avatar",
        blockNumber,
      })) as Address
    ).toLowerCase() as Hex;
    reconstructed.push(`v1.avatar:${avatar}`);
  } catch {
    gaps.push({ area: "nov16:avatar", reason: "avatar unread" });
  }

  try {
    owner = (
      (await client.readContract({
        address: addr as Address,
        abi: rolesV1Abi,
        functionName: "owner",
        blockNumber,
      })) as Address
    ).toLowerCase() as Hex;
    reconstructed.push(`v1.owner:${owner}`);
  } catch {
    gaps.push({ area: "nov16:owner", reason: "owner unread" });
  }

  try {
    const bitmap = await client.readContract({
      address: addr as Address,
      abi: rolesV1Abi,
      functionName: "getMemberRoles",
      args: [NOV16_FIXTURE.operator as Address],
      blockNumber,
    });
    operatorRolesBitmap = String(bitmap);
    reconstructed.push(
      `v1.getMemberRoles:${NOV16_FIXTURE.operator}=${operatorRolesBitmap}`,
    );
  } catch {
    gaps.push({
      area: "nov16:getMemberRoles",
      reason:
        "getMemberRoles unread — v1 membership bitmap unavailable at this block; authorityClaim=unreadable for permissions",
    });
  }

  gaps.push({
    area: "nov16:permissions",
    reason:
      "Full v1 target/function trees not reconstructed in fixture reader — do not claim free-recipient from chain without tree; report UNKNOWN or use explicit assumption label in CLI only",
  });

  const authorityClaim: Nov16V1Snapshot["authorityClaim"] =
    operatorRolesBitmap && operatorRolesBitmap !== "0x" + "0".repeat(64)
      ? "member_has_roles_bitmap"
      : gaps.some((g) => g.area.includes("getMemberRoles"))
        ? "unreadable"
        : "member_has_roles_bitmap";

  return {
    rolesAddress: addr,
    blockNumber: blockNumber.toString(),
    avatar,
    owner,
    operatorRolesBitmap,
    mastercopyOk,
    gaps,
    reconstructed,
    authorityClaim,
  };
}
