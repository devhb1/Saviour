/**
 * Live Messari standardized protocol table (PIVOT §0.1).
 * Product fan-out queries ONLY these — never Balancer/Pancake/Convex.
 * IDs are network deployment ids verified live; do not invent.
 */

export type StandardSchemaFamily =
  | "lending-cdp-3.1"
  | "lending-cdp-2.0"
  | "dex-amm-ext-4.0"
  | "dex-amm-1.3"
  | "yield-1.3";

export type StandardProtocol = {
  /** Stable slug used in Evidence.protocol + Coverage UI */
  slug: string;
  displayName: string;
  subgraphId: string;
  /** Messari schema label for banners / Evidence.schema */
  schema: string;
  family: StandardSchemaFamily;
};

/** Eight live Messari deployments — one query template per family × N ids. */
export const STANDARD_PROTOCOLS: readonly StandardProtocol[] = [
  {
    slug: "aave-v3",
    displayName: "Aave V3",
    subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
    schema: "lending-cdp 3.1.0",
    family: "lending-cdp-3.1",
  },
  {
    slug: "compound-v3",
    displayName: "Compound V3",
    subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9",
    schema: "lending-cdp 3.1.0",
    family: "lending-cdp-3.1",
  },
  {
    slug: "spark",
    displayName: "Spark Lend",
    subgraphId: "GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si",
    schema: "lending-cdp 3.1.0",
    family: "lending-cdp-3.1",
  },
  {
    slug: "makerdao",
    displayName: "MakerDAO",
    subgraphId: "8sE6rTNkPhzZXZC6c8UQy2ghFTu5PPdGauwUBm4t7HZ1",
    schema: "lending-cdp 2.0.1",
    family: "lending-cdp-2.0",
  },
  {
    slug: "uniswap-v3",
    displayName: "Uniswap V3",
    subgraphId: "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6",
    schema: "dex-amm-ext 4.0.0",
    family: "dex-amm-ext-4.0",
  },
  {
    slug: "sushi",
    displayName: "SushiSwap",
    subgraphId: "77jZ9KWeyi3CJ96zkkj5s1CojKPHt6XJKjLFzsDCd8Fd",
    schema: "dex-amm 1.3.2",
    family: "dex-amm-1.3",
  },
  {
    slug: "curve",
    displayName: "Curve",
    subgraphId: "3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF",
    schema: "dex-amm 1.3.0",
    family: "dex-amm-1.3",
  },
  {
    slug: "yearn-v2",
    displayName: "Yearn V2",
    subgraphId: "FDLuaz69DbMADuBjJDEcLnTuPnjhZqNbFVrkNiBLGkEg",
    schema: "yield-aggregator 1.3.0",
    family: "yield-1.3",
  },
] as const;

/** Broken on network — never query in product paths; surface on Coverage. */
export const EXCLUDED_PROTOCOLS = [
  {
    slug: "balancer-v2",
    subgraphId: "794H6CNzdGF5YfBK9nPsUgGn7EBbdJSCTjgcKPEPyFnn",
    reason: "indexing_error on The Graph Network",
  },
  {
    slug: "pancake-v3",
    subgraphId: "JAGXF8B14mpB8QGKnwhKTs5JxsQZBJQvbDGFcWwL7gbm",
    reason: "no allocations",
  },
  {
    slug: "convex",
    subgraphId: "7rFZ2x6aLQ7EZsNx8F5yenk4xcqwqR3Dynf9rdixCSME",
    reason: "indexing_error on The Graph Network",
  },
] as const;

export function protocolBySlug(slug: string): StandardProtocol | undefined {
  return STANDARD_PROTOCOLS.find((p) => p.slug === slug);
}
