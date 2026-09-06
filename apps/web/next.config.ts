import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@saviours/core"],
  agentRules: false,
};

export default nextConfig;
