# Threat model — Saviour authority / Blast Radius

**Supersedes** the legacy ENS/Graph investigate threat model for day-1 product thinking. Archive ENS assumptions remain in git history / `/legacy/v1`.

## Assets

- DAO Safe treasuries (ERC-20, vault shares, native)
- Standing Roles / Delay / module configuration
- Operator trust in Saviour reports (Findings · Coverage · Freshness · Reach)

## Adversaries

| Adversary | Capability |
|---|---|
| Compromised role-member key | Executes within Roles policy without owner signatures (16 Nov class) |
| Malicious / mistaken policy author | Grants free-recipient transfer, call-to-Safe, delegatecall |
| Queued privilege collapse | Delay cooldown→0 + enableModule (Term class) |
| Report liar | Tries to present MISMATCH payload as MATCH / hide Coverage gaps |

## In scope

- Reconstruct topology + (progressively) Roles reach at pinned block
- Flag UNBOUNDED / UNKNOWN / Delay bypass; never false BOUNDED when unmodeled
- Safe 1.3+ hash integrity for Delta
- Intent ⊆ check (token qty)
- Disclosure for live UNBOUNDED findings

## Out of scope (explicit)

- Detecting compromised keys / social engineering
- Full EVM fork of every possible path (static over-approx only)
- Pre-sign screening competition (Hypernative / Hexagate)
- ENS memory / x402 / agents as control plane
- Multi-chain free-form RPC

## Trust boundary

| Component | Trust |
|---|---|
| Mainnet RPC (pinned block) | Trust root for reads |
| Zodiac SDK / App | Differential **oracle only** — never sole trust root |
| `@saviours/check` / queuewatch | Own verdicts with Coverage honesty |
| This website | Convenience; CLI can re-verify |
| Signer / HW wallet | Final authority |

See [`BLAST_RADIUS.md`](./BLAST_RADIUS.md) · [`DISCLOSURE.md`](./DISCLOSURE.md) · [`SECURITY.md`](../SECURITY.md).
