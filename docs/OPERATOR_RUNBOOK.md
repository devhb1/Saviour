# Operator runbook

## Monthly / after any Roles or module change

1. `pnpm reach:cli --safe 0x… --out monthly.json` (or `/audit`)
2. Compare Reach principals vs last report
3. Diff Coverage gaps — new UNKNOWN is a ticket, not “fine”
4. If CRITICAL / UNBOUNDED → escalate to security council; revoke/rotate role keys if needed

## Before signing a privilege tx

1. Export Safe JSON from Safe UI
2. `pnpm review:cli --json …` — require independent `expectedSafeTxHash` (never self-MATCH)
3. Confirm Delay discovery is not MultiSend; inconclusive → do not invent before-state
4. Share report URL with co-signers
5. Authorize only in Safe / HW wallet

## Incident (alert from elsewhere)

1. Reach report: which principals still UNBOUNDED?
2. Identify revocation path / latency (intent `revocation.max_latency_hours`)
3. Disable module / remove member in Safe UI if possible
4. Re-audit after remediation

## Pilots

Opt-in list: [`docs/outreach/PILOT_TRACKER.md`](./outreach/PILOT_TRACKER.md)
