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
