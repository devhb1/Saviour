/**
 * Resolve monorepo root across local, tsx, and Vercel `/var/task`.
 * Marker: deployments/sepolia-ens-identity.json (or pnpm-workspace.yaml).
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MARKERS = [
  "deployments/sepolia-ens-identity.json",
  "pnpm-workspace.yaml",
] as const;

function hasMarker(dir: string): boolean {
  return MARKERS.some((m) => existsSync(resolve(dir, m)));
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
    if (hasMarker(c)) return c;
  }

  // Last resort: cwd (surfaces clear Missing /path errors)
  return process.cwd();
}
