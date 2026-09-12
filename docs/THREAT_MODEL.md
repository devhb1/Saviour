# Threat model

Scope for the ETHOnline cut. Expand only if pursuing production hardening.

## Trust boundary

| Component | Trust |
|---|---|
| The Graph (pinned deployments) | Evidence substrate — honest empties / excluded broken subgraphs |
| Deterministic signals + `validateAssessment` | Own the verdict |
| LLM | Explains and cites only — cannot invent TAINTED |
| ENSv2 PermissionedResolver | Public memory; role-gated writes (EAC) |
| SavioursRegistry | Append-only evidence hash index |
| This website / API | Convenience — not required for MEMORY HIT resolve |
| Bazantic gateway | Meters investigate; does not own memory |

## Assumptions

- Evidence chain = Ethereum **mainnet**. Memory chain = **Sepolia** ENSv2.
- Operator wallets hold Relayer / Investigator / Disputer roles — permission model, not a dispute court.
- Public hosts are write-fail-closed unless both write env flags are set.
- Consumers that only read mainnet ENS cannot see Sepolia names yet (stated ceiling).

## In scope for this cut

- Live Graph evidence integrity for the flashloan-atomic class
- AI cannot own status
- EAC wrong-role revert
- Shield MEMORY HIT = 0 Graph · 0 AI · $0
- Canonical `<address>.saviours.eth` only

## Out of scope (explicit)

- General detector / novel contract-logic exploits
- Social engineering / offchain coordination
- Mainnet ENS enforcement
- Decentralized multi-investigator dispute

See [ARCHITECTURE.md](./ARCHITECTURE.md) · [BAZANTIC.md](./BAZANTIC.md) · [INTEGRATE.md](./INTEGRATE.md).
