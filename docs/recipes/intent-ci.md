# Recipe — Intent CI

1. Commit `intent.json` (token qty only) — see [`INTENT_SPEC.md`](../INTENT_SPEC.md)
2. Ensure `.github/workflows/intent-check.yml` runs on PRs
3. Locally: `pnpm intent:cli --intent path/to/intent.json --safe 0x…`
4. Exit code 2 = break — do not merge
