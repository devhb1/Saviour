# SAVIOURS Decision Log

Record every non-obvious technical or strategic decision here, in order,
so Cursor (and you) never have to re-derive "why did we do it this way."

Format:

## DEC-0001 — <short title>
Date:
Context:
Decision:
Alternatives considered:
Why rejected:
Reversible? (yes/no)

---

## DEC-0000 — Agent initialization
Date: 2026-09-06
Context: Starting SAVIOURS build for ETHOnline 2026. Needed Cursor rules
in place before any application code so every step follows the same
engineering discipline (Investigate → Remember → Protect, Graph
load-bearing, ENSv2 central, AI never authoritative).
Decision: Created .cursor/rules/00–07 and docs/SOURCES.md before Step 1.
Alternatives considered: Start coding Step 1 directly and add rules later.
Why rejected: Risk of inconsistent conventions across 50+ steps, risk of
Cursor inventing Graph/ENSv2 APIs without a documentation-first habit.
Reversible? Yes — rules can be edited any time.

---

## DEC-0001 — Live ETHOnline 2026 prize verification
Date: 2026-09-06
Context: Before running Prompt 0 / Step 1, verified the actual live
ETHGlobal prize page (ethglobal.com/events/ethonline2026/prizes) rather
than trusting an earlier written summary of it.
Decision / findings:
- The Graph AI track is TWO separate $5,000 pools (Start Fresh vs
  Continuity) — SAVIOURS targets Start Fresh, since it's new code.
- ENS has TWO tracks: "Best Use of ENSv2" ($4,500, net-new, Sepolia —
  SAVIOURS' target) and "Best Integration of ENSv2 into an Existing
  Project" ($500, Continuity-only — not applicable to us).
- Messari Standardized Subgraphs is explicitly one EXAMPLE of a
  standardized schema, not the only qualifying path — confirms we should
  not pre-commit to a Messari adapter before checking coverage for our
  actual data need.
- Composable/Standardized track adds two more Substreams doc links not
  previously recorded: streamingfast/substreams-chain-modules and
  pinax-network/substreams-evm.
- ENS prize text explicitly calls out "agents as namespaces, each with
  their own identity and permissions" as a bonus — this maps directly
  onto SAVIOURS' future-agent-check design and should be emphasized in
  the demo narrative.
Updated: .cursor/rules/06-hackathon.mdc, docs/SOURCES.md.
Alternatives considered: Leave the earlier summary as-is and verify only
when Prompt 0 runs.
Why rejected: Cheap to check now; avoids Cursor building against a
subtly wrong track description for 50+ steps.
Reversible? Yes — re-verify again before final submission, event runs
through 09.16.26.

---

## DEC-0002 — Step-scoped modular creation (no bottom-up scaffolding)
Date: 2026-09-06
Context: Cursor Steps ladder Step 1 text asks to create every empty
apps/* and packages/* folder up front. That fights real modular
development and produces a fake monorepo full of unused shells.
Decision: Create packages, apps, and contracts only in the step that
first needs them. Step 1 is root workspace + rules + gitignore only.
Examples: packages/shared at Step 3, packages/graph at Step 4,
contracts at the first Foundry/ENS spike that needs it, apps/web when
UI work starts. Do not pnpm-add dependencies for future steps.
Alternatives considered: Pre-create all empty package folders with
.gitkeep as the written Step 1 prompt suggests.
Why rejected: Empty shells add no value, obscure which modules actually
exist, and encourage installing/wiring everything before any spike
proves the primitives.
Reversible? Yes — folders can still be added early if a step truly needs
them, but default remains just-in-time.
