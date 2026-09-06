# SAVIOURS Cursor Prompts

Two prompts live here. Use PROMPT 0 exactly once, first. Use PROMPT 1 for
every step after that.

---

## PROMPT 0 — Agent Initialization (run this first, not Step 1)

```
AGENT INITIALIZATION

You are setting up the SAVIOURS repository before any application code
is written. Do not write application logic in this session.

0.1 Confirm .cursor/rules/00-core.mdc through 07-step-execution.mdc are
    present and readable. List them back to me with a one-line summary
    of each.
0.2 Confirm docs/SOURCES.md is present.
0.3 Read docs/SAVIOURS_MASTER_BUILD_PLAN.md and
    docs/SAVIOURS_CURSOR_STEPS.md. Summarize the product thesis and the
    first 5 planned steps back to me in a few bullets, so I can confirm
    you've correctly loaded them as the source of truth.
0.4 Create docs/DECISIONS.md if it does not already exist (it should —
    confirm instead of recreating).
0.5 Perform a documentation verification pass:
    - Open each URL in docs/SOURCES.md's "ETHGlobal" section and confirm
      the current Graph and ENS prize requirements match what's recorded
      in 06-hackathon.mdc. Flag any discrepancy — do not silently update
      the rule file yourself.
    - Open the "THE GRAPH" and "ENS" sections and confirm the doc pages
      still exist at those URLs. Flag any that have moved or 404'd.
0.6 Do NOT choose a specific Graph adapter (e.g. do not assume Messari)
    yet. Just report what standardized/composable options are currently
    documented, per 03-the-graph.mdc's "PREFERRED PATH".
0.7 Produce a final report in this format:

RULES LOADED
<list + one-line summary each>

MASTER PLAN SUMMARY
<bullets>

FIRST 5 STEPS
<bullets>

DOCUMENTATION VERIFICATION
<what matched, what changed, what needs my attention>

GRAPH ROUTE OPTIONS OBSERVED
<bullets, no decision made yet>

STATUS: READY FOR STEP 1 (or: BLOCKED — <reason>)

Do not proceed to Step 1 automatically. Wait for my next prompt.
```

---

## PROMPT 1 — Reusable Step-Execution Wrapper (use for every step after init)

Copy this for every future Cursor session. Fill in `<NUMBER>` and
`<STEP NAME>` (or just point at the step file and let Cursor read it).

```
Execute Step <NUMBER> — <STEP NAME> from /docs/SAVIOURS_CURSOR_STEPS.md.

First inspect the current repository state and the files named by that
step.

Before coding:
- identify every external protocol/API involved;
- consult the relevant official documentation using the applicable
  .cursor/rules;
- verify the current API/schema/contract interface;
- state a concise implementation plan.

Then implement only this step.

Do not implement future steps.
Do not refactor unrelated code.
Do not invent protocol behavior.
Do not use mocked blockchain data in the real path.
Keep the diff minimal and independently testable.

Required output:

Understanding
Documentation consulted
Verified protocol facts
Files changed
Implementation
Verification/tests
Security/architecture check
Remaining limitations
Commit message

Do not move to the next step automatically.
```

---

## Notes

- If Cursor ever proposes a Graph adapter choice (e.g. "I'll use Messari"),
  make it show the decision chain from 03-the-graph.mdc first: what data
  is required → which products can supply it → is there a standardized
  schema → coverage check → THEN choice. If it skips straight to a
  choice, push back and ask it to show the chain.
- Log any real decision it makes in docs/DECISIONS.md — don't let
  decisions live only in chat history.
- If a step comes back BLOCKED, fix only that step. Don't let Cursor
  "helpfully" expand scope to unblock itself.
