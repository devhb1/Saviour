const DEFAULT_RESOLVER =
  "0xF479306621F718F7d76875f67506ceD33717751c" as const;

/**
 * Verifiable one-liner — same path as Identity / live-agent (no our server).
 */
export function castCommand(
  address: string,
  opts?: { resolver?: string; parent?: string; key?: string },
): string {
  const a = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(a)) {
    throw new Error(`Invalid address: ${address}`);
  }
  const parent = opts?.parent ?? "saviours.eth";
  const resolver = opts?.resolver ?? DEFAULT_RESOLVER;
  const key = opts?.key ?? "saviours.status";
  const ens = `${a}.${parent}`;
  return `cast call ${resolver} "text(bytes32,string)(string)" $(cast namehash ${ens}) "${key}"`;
}
