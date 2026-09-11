import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, "../..");

/**
 * Vercel serverless only ships traced files. ENS identity + Govern seeds live
 * outside apps/web — force-include them at the monorepo root so /var/task has:
 *   deployments/sepolia-ens-identity.json
 *   evals/seed-incidents.json
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@saviours/core"],
  // Do NOT serverExternalPackages bazantic-cli / force-include its node_modules:
  // pnpm lays those out as symlinks and Vercel rejects the function package with
  // "invalid deployment package … files in symlinked directories".
  // In-process settle imports are bundled by Turbopack into the route chunk.
  agentRules: false,
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/*": [
      "../../deployments/**/*",
      "../../evals/seed-incidents.json",
      "../../evals/demo-targets.json",
      "./deployments/**/*",
      "./evals/seed-incidents.json",
      "./evals/demo-targets.json",
    ],
    "/api/**/*": [
      "../../deployments/**/*",
      "../../evals/seed-incidents.json",
      "../../evals/demo-targets.json",
      "./deployments/**/*",
      "./evals/seed-incidents.json",
      "./evals/demo-targets.json",
    ],
  },
};

export default nextConfig;
