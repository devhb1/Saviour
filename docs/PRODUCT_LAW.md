# Saviour Product Law (V3)

1. **SAFE is never a named status.** Miss → `NO_VERDICT` — never ALLOW-by-absence.
2. **`NO_VERDICT` does not auto-block.** Wallets show unknown; their policies decide.
3. **Resolve ≠ Assess.** Address memory and transaction assessment are separate APIs.
4. **Risk and coverage are orthogonal.** Unsupported never overwrites TAINTED; partial decode never looks fully assessed.
5. **Status → recommendation:** UNSET→NO_VERDICT · WATCH→WARN · TAINTED→BLOCK_RECOMMENDATION.
6. **CRITICAL queue decode → vault WATCH.** TAINTED requires Attester. AI never alone finalizes TAINTED.
7. **DELEGATECALL is contextual** — not auto-CRITICAL.
8. **Execute CRITICAL → 72h quarantine** still WARN in resolve.
9. **`$0` resolve** = no Saviour protocol fee; RPC infra still has operating cost.
10. **Sepolia ENS = staging.** **Base registry = product home.**
11. **Static decode ≠ full simulation.** Never claim guaranteed execution outcomes.
12. **Two workflows:** Monitor (queued governance) ≠ Review (imported Safe/calldata). Do not conflate demos.
13. **Safe review** is import/paste until a full pending-tx integration ships — do not claim all Safe pending transactions.
14. **Signer decides.** Saviour explains; it does not enforce a block unless a wallet integration does.
