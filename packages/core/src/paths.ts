/**
 * Resolve monorepo root across local, tsx, and Vercel `/var/task`.
 *
 * Prefer `pnpm-workspace.yaml` so synced copies under `apps/web/deployments/`
 * do not steal the root (that broke `/api/incidents` on Vercel).
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HARD_MARKERS = ["pnpm-workspace.yaml"] as const;
const SOFT_MARKERS = ["deployments/sepolia-ens-identity.json"] as const;

function hasAny(dir: string, markers: readonly string[]): boolean {
  return markers.some((m) => existsSync(resolve(dir, m)));
}

export function repoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.SAVIOURS_ROOT?.trim(),
    process.cwd(),
    resolve(process.cwd(), ".."),
    resolve(process.cwd(), "../.."),
    resolve(process.cwd(), "../../.."),
    "/var/task",
    resolve("/var/task", "../.."),
    // packages/core/src → repo root
    resolve(here, "../../.."),
    // packages/core/src/<dir> → repo root (bundlers sometimes keep folder)
    resolve(here, "../../../.."),
    resolve(here, "../../../../.."),
  ].filter((p): p is string => Boolean(p));

  for (const c of candidates) {
    if (hasAny(c, HARD_MARKERS)) return c;
  }
  for (const c of candidates) {
    if (hasAny(c, SOFT_MARKERS)) return c;
  }

  // Last resort: cwd (surfaces clear Missing /path errors)
  return process.cwd();
}
