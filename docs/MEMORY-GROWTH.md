# Honest memory growth (Phase E)

**Product law:** Graph-verified grows only from live Messari fan-out + threat-class signals. Provenance never counts as Graph-verified (`getIncidentHeadline` / `proof === "graph"` only).

## Process (one address at a time)

1. Pick an address from `evals/registry-candidate-catalog-*.json` that has a public `source_url`.
2. Prefer reserved film candidates when filming: BEANSTALK / CREAM-1 — see `ZA ENDGAME FILES/REGISTRY-WORKLIST.md`.
3. Run investigate with `forceFresh: true` (persist only when writes are allowed and you intend to Remember).
4. Inspect live Graph signals. Only if a threat-class rule fired, Remember with `proof: "graph"`.
5. Otherwise name as `provenance` / skip. Empty Graph → **do not invent TAINTED**.
6. Cap public story ~**60** named ENS rows. Large lists stay candidates · not named.

## Scripts

```bash
# Audit existing live rows; promote to proof:graph only when signals fire
pnpm audit:live-proof
pnpm audit:live-proof -- --write   # persist after review

# One-at-a-time growth helper (dry by default)
pnpm grow:one -- --address=0x… --dry-run
```

## Second TAINTED class (`DRAIN_FANIN`)

Only claim / film when `DRAIN_FANIN` (or a new rule) fires on **live mainnet Graph**. Do not claim early.

## Explicit non-goals

- Bulk-name 300–400 onto ENS
- Launder provenance into Graph-verified
- Pad Playground “Candidates (not named)” before submit
