/**
 * Messari query templates — one per schema family.
 *
 * Live-verified 2026-09-08:
 * - lending-cdp 3.1: account + flashloans(account) + liquidates(liquidator|liquidatee)
 * - lending-cdp 2.0 (Maker): account counts only (no flashloan entity in use)
 * - dex-amm-ext 4.0 (Uni): swaps where { account }
 * - dex-amm 1.3 (Sushi/Curve): Swap has `from`/`to`, NOT `account` — dual filter
 * - yield 1.3 (Yearn): Deposit/Withdraw use `from`, not `account`
 */

/** Lending CDP 3.1.0 — Aave / Compound / Spark */
export const LENDING_QUERY = `query($id: ID!, $account: String!, $first: Int!) {
  protocol: protocols(first: 1) {
    id
    name
    slug
    schemaVersion
    network
    type
    totalValueLockedUSD
  }
  account(id: $id) {
    id
    flashloanCount
    borrowCount
    depositCount
    withdrawCount
    liquidateCount
    liquidationCount
  }
  flashloans(
    first: $first
    orderBy: amountUSD
    orderDirection: desc
    where: { account: $account }
  ) {
    id
    hash
    amountUSD
    timestamp
    blockNumber
    asset { symbol }
  }
  liquidatesAsLiquidator: liquidates(
    first: $first
    orderBy: timestamp
    orderDirection: desc
    where: { liquidator: $account }
  ) {
    id
    hash
    amountUSD
    timestamp
    blockNumber
    liquidator { id }
    liquidatee { id }
  }
  liquidatesAsLiquidatee: liquidates(
    first: $first
    orderBy: timestamp
    orderDirection: desc
    where: { liquidatee: $account }
  ) {
    id
    hash
    amountUSD
    timestamp
    blockNumber
    liquidator { id }
    liquidatee { id }
  }
}`;

/** MakerDAO lending-cdp 2.0.1 — no flashloanCount; presence + activity counts */
export const LENDING_LEGACY_QUERY = `query($id: ID!) {
  protocol: protocols(first: 1) {
    id
    name
    slug
    schemaVersion
    network
    type
  }
  account(id: $id) {
    id
    depositCount
    withdrawCount
    borrowCount
    repayCount
    liquidateCount
    liquidationCount
  }
}`;

/** Uniswap V3 dex-amm-extended — Swap.account exists */
export const DEX_EXT_QUERY = `query($id: ID!, $account: String!, $first: Int!) {
  protocol: protocols(first: 1) {
    id
    name
    slug
    schemaVersion
    network
    type
    totalValueLockedUSD
  }
  account(id: $id) {
    id
    swapCount
    depositCount
    withdrawCount
  }
  swaps(
    first: $first
    orderBy: timestamp
    orderDirection: desc
    where: { account: $account }
  ) {
    id
    hash
    timestamp
    blockNumber
    amountInUSD
    amountOutUSD
    tokenIn { symbol }
    tokenOut { symbol }
    account { id }
  }
}`;

/**
 * Sushi / Curve dex-amm 1.3.x — Swap has from/to, not account.
 * Dual query so we catch both legs without relying on broken `or` semantics.
 */
export const DEX_AMM_QUERY = `query($account: String!, $first: Int!) {
  protocol: protocols(first: 1) {
    id
    name
    slug
    schemaVersion
    network
    type
    totalValueLockedUSD
  }
  swapsFrom: swaps(
    first: $first
    orderBy: timestamp
    orderDirection: desc
    where: { from: $account }
  ) {
    id
    hash
    timestamp
    blockNumber
    amountInUSD
    amountOutUSD
    from
    to
    tokenIn { symbol }
    tokenOut { symbol }
  }
  swapsTo: swaps(
    first: $first
    orderBy: timestamp
    orderDirection: desc
    where: { to: $account }
  ) {
    id
    hash
    timestamp
    blockNumber
    amountInUSD
    amountOutUSD
    from
    to
    tokenIn { symbol }
    tokenOut { symbol }
  }
}`;

/** Yearn yield-aggregator — deposits/withdraws keyed by `from` */
export const YIELD_QUERY = `query($account: String!, $first: Int!) {
  protocol: protocols(first: 1) {
    id
    name
    slug
    schemaVersion
    network
    type
    totalValueLockedUSD
  }
  deposits(
    first: $first
    orderBy: timestamp
    orderDirection: desc
    where: { from: $account }
  ) {
    id
    hash
    timestamp
    blockNumber
    amountUSD
    from
    to
  }
  withdraws(
    first: $first
    orderBy: timestamp
    orderDirection: desc
    where: { from: $account }
  ) {
    id
    hash
    timestamp
    blockNumber
    amountUSD
    from
    to
  }
}`;
