/**
 * Example — wrap a viem wallet client sendTransaction with guard().
 * Not shipped as a dependency; copy into your agent.
 */
import { guard, SavioursBlockedError } from "@saviours/check";

export async function sendWithSavioursGuard(
  to: `0x${string}`,
  send: () => Promise<`0x${string}`>,
): Promise<`0x${string}`> {
  const r = await guard(to, { mode: "ens" });
  if (r.decision === "WARN") {
    console.warn(`[saviours] WARN ${r.ensName} — reduce size`);
  }
  try {
    return await send();
  } catch (e) {
    if (e instanceof SavioursBlockedError) throw e;
    throw e;
  }
}
