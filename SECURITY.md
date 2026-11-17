# Security

## Reporting

Email: **b4harshit01@gmail.com** (subject: `[Saviour security]`)

Please include: affected Safe/module (if opt-in), engine version, block number, and whether the issue is a **false BOUNDED**, missed UNBOUNDED path, or integrity/self-MATCH bug.

## Policy

- We prefer **private disclosure** for live UNBOUNDED findings on non-public treasuries — see [`docs/DISCLOSURE.md`](docs/DISCLOSURE.md).
- Public research fixtures (e.g. Term reference, widely reported incidents) may be discussed with redaction of exploit-ready encodings.

## Scope

In scope: `@saviours/check` authority/Reach/intent, `@saviours/queuewatch` decode, web Audit/Review APIs.  
Out of scope: social engineering of operators, physical key theft, generic Safe bugs unrelated to our reports.

## Production hygiene

- Set `ETH_RPC_URL` (do not rely on public fallbacks for operator-critical reports).
- Pin and record Freshness (block + hash + RPC host) on every shared report.
- Never treat NO_VERDICT / UNKNOWN / empty findings as SAFE.
