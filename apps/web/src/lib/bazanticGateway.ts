/**
 * Canonical Bazantic gateway for SAVIOURS (ETHOnline 2026).
 * Custom subdomain: saviours.bazgateway.com → upstream www.saviours.xyz
 */
export const BAZANTIC_GATEWAY_DEFAULT =
  "https://saviours.bazgateway.com" as const;

export const BAZANTIC_MCP_DEFAULT =
  `${BAZANTIC_GATEWAY_DEFAULT}/mcp` as const;

export function bazanticGatewayBase(): string {
  return (
    process.env.BAZANTIC_GATEWAY_URL?.trim() ||
    process.env.NEXT_PUBLIC_BAZANTIC_GATEWAY_URL?.trim() ||
    BAZANTIC_GATEWAY_DEFAULT
  ).replace(/\/$/, "");
}

/** MCP tools/list count live (OpenAPI ops + gateway `info`). */
export const MCP_TOOL_COUNT = 17 as const;

/**
 * Safe agent-recipe tools — never bind dispute / revoke / eacProbe.
 * Prefer body forms: getEvidence, askCase (path forms historically 404 on proxy).
 */
export const MCP_AGENT_SAFE_TOOLS = [
  "info",
  "shieldCheck",
  "investigate",
  "payInvestigate",
  "getEvidence",
  "askCase",
  "resolveEns",
  "resolveTarget",
  "listIncidents",
  "fleetCatalog",
  "fetchDossier",
  "recomputeFingerprint",
  "getEvidenceByPath",
  "askCaseByPath",
] as const;

export const MCP_OPERATOR_ONLY_TOOLS = [
  "dispute",
  "revoke",
  "eacProbe",
] as const;

export const BAZANTIC_TIERS = [
  {
    id: "free",
    label: "Free",
    price: "$0",
    routes: "shieldCheck · resolve · catalog · dossier fetch",
  },
  {
    id: "standard",
    label: "Standard",
    price: "~$0.01",
    routes: "investigate · payInvestigate · govern*",
  },
  {
    id: "complex",
    label: "Complex",
    price: "~$0.05",
    routes: "POST /api/evidence · POST /api/case/ask",
  },
] as const;

export const BAZANTIC_RECIPES = [
  {
    handle: "safe-swap-with-memory",
    role: "Multi-service prize",
    spend: "$0 on BLOCK · ~$0.01 miss",
    paste: "docs/recipes/safe-swap-with-memory.md",
  },
  {
    handle: "saviours-check-before-sign",
    role: "Core",
    spend: "$0 hit · ~$0.01 miss",
    paste: "docs/recipes/saviours-check-before-sign.md",
  },
  {
    handle: "investigate-once-explain",
    role: "Discovery",
    spend: "$0 / ~$0.01 + ~$0.05 depth",
    paste: "docs/recipes/investigate-once-explain.md",
  },
  {
    handle: "dossier-deep-dive",
    role: "$0 memory",
    spend: "$0 (+ optional ~$0.05 ask)",
    paste: "docs/recipes/dossier-deep-dive.md",
  },
  {
    handle: "fleet-triage",
    role: "Batch",
    spend: "$0×N · ~$0.01×miss",
    paste: "docs/recipes/fleet-triage.md",
  },
] as const;

export const BAZANTIC_PUBLISH_KIT = "docs/recipes/PUBLISH_KIT.md" as const;
