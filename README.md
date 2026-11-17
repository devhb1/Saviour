<p align="center">
  <img src="apps/web/public/brand/saviours-mark-ink.png" alt="saviours" width="80" height="80" />
</p>

<h1 align="center">SAVIOURS</h1>

<p align="center"><strong>Safe authority audit — Roles reach in progress</strong></p>

<p align="center">
  For DAO treasury &amp; security operators on Safe + Zodiac Delay / Roles.<br />
  <strong>Audit</strong> baseline (Findings · Coverage · Freshness) → <strong>Review</strong> Privilege Diff → signer decides.<br />
  Next: <em>Blast Radius</em> (feature) — independent worst-case Roles reach · intent check · change delta.<br />
  <a href="https://www.saviours.xyz">/</a> · <a href="https://www.saviours.xyz/audit">/audit</a> · <a href="https://www.saviours.xyz/review">/review</a> · <a href="https://www.saviours.xyz/docs">/docs</a> · <a href="https://www.saviours.xyz/integrate">/integrate</a> · <a href="https://www.saviours.xyz/vision">/vision</a><br />
  <code>pnpm audit:cli</code> · <code>pnpm reach:cli</code> · <code>pnpm review:cli</code> · <code>@saviours/check</code><br />
  NO_VERDICT ≠ SAFE · never claim SAFE · ENS/x402/Watch = Archive or Prototype.
</p>

> **Honesty banner:** Shipped today = Delay/topology audit + transaction Privilege Diff. **Blast Radius** (Roles BOUNDED/UNBOUNDED/UNKNOWN) is the in-progress feature — public hero switches only after the 16 Nov replay write-up. Brand stays **Saviour**.

| | |
|---|---|
| **App** | [www.saviours.xyz](https://www.saviours.xyz) · [/docs](https://www.saviours.xyz/docs) · [/integrate](https://www.saviours.xyz/integrate) · [/vision](https://www.saviours.xyz/vision) |
| **Integrate** | [/integrate](https://www.saviours.xyz/integrate) · [`docs/INTEGRATE.md`](docs/INTEGRATE.md) · [`docs/BLAST_RADIUS.md`](docs/BLAST_RADIUS.md) |
| **npm** | [`@saviours/check`](https://www.npmjs.com/package/@saviours/check) |
| **GitHub** | [github.com/devhb1/Saviour](https://github.com/devhb1/Saviour) |
| **Support** | [b4harshit01@gmail.com](mailto:b4harshit01@gmail.com) · [@harshitb01](https://twitter.com/harshitb01) |

**Product (interim):** Safe authority audit — [`/audit`](https://www.saviours.xyz/audit) · [`/review`](https://www.saviours.xyz/review).  
**Roadmap:** [`/vision`](https://www.saviours.xyz/vision) · Vision Lock in repo `ZA ENDGAME FILES/SAVIOUR_BLAST_RADIUS_VISION.md`.

```mermaid
flowchart LR
  Audit[Audit Safe topology] --> Reach[Roles Reach in progress]
  Review[Review tx] --> Delta[Change Delta]
  Reach --> Verdict[BOUNDED / UNBOUNDED / UNKNOWN]
  Delta --> Verdict
  Verdict --> Signer[Signer decides elsewhere]
```

**Locked archive** (investigate-once / ENS): [`/legacy/v1`](https://www.saviours.xyz/legacy/v1) — commit `4e78cad…`. See `apps/web/src/legacy/v1/FROZEN.md`.

---

## Why this exists

Multisig thresholds stop being the control boundary once a module or Zodiac Roles policy exists. Pre-sign tools miss drains when **no owner signs**. Saviour reconstructs standing authority (Delay/topology today; Roles reach next) and diffs proposed changes — with Coverage honesty, never SAFE.

Legacy ENS / Graph naming loop is **Archive only** — not the product.

---

## Product law (authority audit)

1. Never stamp **SAFE**. Use Findings · Coverage · Freshness (and later BOUNDED / UNBOUNDED / UNKNOWN).
2. NO_VERDICT / UNKNOWN ≠ endorsement.
3. Mainnet reads for control state; block-pin when auditing.
4. Signer decides in Safe UI / HW wallet — Saviour never auto-blocks.
5. Cannot detect compromised keys — only what a key/module can already do.
6. ENS / x402 / MCP / Registry / Watch-as-product are frozen or prototype until after Blast Radius M4.

### Quick start

```bash
pnpm audit:cli --fixture reference
pnpm review:cli --fixture term
# After Reach lands:
# pnpm reach:cli --safe 0x…
```

Full paths: [`docs/INTEGRATE.md`](docs/INTEGRATE.md).

---

## Architecture (overview)

Full trust boundary, sequences, and module map: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

| Layer | Role |
|---|---|
| **Consumers** | Web UI · MCP · `cast` · `plain-shield.html` · Bazantic `shieldCheck` — **0 Graph · 0 AI** on a hit |
| **Security memory (Sepolia)** | ENSv2 PermissionedResolver · SavioursRegistry |
| **Investigate (costly miss)** | The Graph (mainnet) → `deriveSignals` → LLM explain → `validateAssessment` → Remember |

### Trust who decides what

| Layer | May decide | Must not |
|---|---|---|
| The Graph (live mainnet) | Evidence rows | Invent threats |
| `deriveSignals` | Signal ids | Write chain |
| LLM | Explanation + cite ids | Own status / write ENS |
| `validateAssessment` | Final status | Accept model TAINTED without threat-class signal |
| ENSv2 texts | Portable verdict | Replace Graph truth |
| Shield Tier-1 | BLOCK / WARN / ALLOW / ESCALATE | Call Graph or AI |

### Chain split

| Concern | Network |
|---|---|
| Threat evidence | Ethereum **mainnet** |
| Security memory | **Sepolia** ENSv2 + SavioursRegistry |

### Resolve path (MEMORY HIT)

1. Address → `checkTarget` → read ENS `saviours.status`
2. **TAINTED** → BLOCK · **WATCH** → WARN · empty / miss → registry fallback or ESCALATE
3. No Graph call · no AI · **$0**

---

## User / demo walkthrough

Nav **is** the film. Primary hashes: `#hook` `#loop` `#registry` `#build` `#playground` `#docs`.

Legacy aliases still resolve: `#threat`→hook · `#investigate`/`#agents`→agents · `#name`→identity · `#resolve`→shield · `#memory`→registry · `#case`→depth.

**Hook → Loop → Registry → Build → Playground → Docs**

| Beat | What you see |
|---|---|
| **Hook** (`#hook`) | 10s USP · live Shield check · chips · VerdictCard |
| **Loop** (`#loop`) | Miss → investigate → name → resolve · second agent `$0` |
| **Registry** (`#registry`) | Graph-verified vs seeded buckets (never laundered) |
| **Build** (`#build`) | `@saviours/check` · MCP · OpenAPI · Help |
| **Playground** (`#playground`) | ENSv2 live panel · EAC · Fleet · wallet gate · Bazantic meter |
| **Docs** (`#docs`) | Long read · stack depth |

---

## Surfaces & integrations

| Surface | Role |
|---|---|
| Web UI | Numbered walkthrough · agent client · naming ceremony · Fleet Run |
| `@saviours/check` | ENS / shield / full modes for integrators |
| MCP (local stdio) | **5 tools** via `pnpm mcp` — `check_target` · `investigate_target` · `fanout_target` · … |
| Bazantic gateway | MCP **17 tools** · Free / ~$0.01 / ~$0.05 · 5 published recipes |
| `cast` / `plain-shield.html` | Independent resolve — no Next server |

Bazantic meters; it does **not** replace Graph or ENS. Details: [`docs/BAZANTIC.md`](docs/BAZANTIC.md).

---

## Quick start

```bash
pnpm install && cp .env.example .env
# Required for Shield/ENS:  SEPOLIA_RPC_URL
# Investigate:              GRAPH_API_KEY + AI_API_KEY
# Remember (writes):        RELAYER_PRIVATE_KEY (+ INVESTIGATOR_ / DISPUTER_)

pnpm dev    # http://localhost:3000
pnpm mcp    # stdio MCP server
```

Production writes are **fail-closed** unless both `SAVIOURS_ALLOW_WRITES=1` and `NEXT_PUBLIC_SAVIOURS_ALLOW_WRITES=1`.

---

## Prove it without our server

```bash
cast call 0xF479306621F718F7d76875f67506ceD33717751c \
  "text(bytes32,string)(string)" \
  $(cast namehash 0x935bfb495e33f74d2e9735df1da66ace442ede48.saviours.eth) \
  saviours.status \
  --rpc-url $SEPOLIA_RPC_URL
# → TAINTED
```

Or open [`consumers/plain-shield.html`](consumers/plain-shield.html) / run [`consumers/live-agent`](consumers/live-agent).

---

## Repo layout

| Path | Role |
|---|---|
| `apps/web` | Next.js UI + APIs |
| `packages/core` | Graph · signals · investigate · ENS · Shield |
| `packages/check` | Client SDK |
| `packages/mcp` | MCP server |
| `contracts` | SavioursRegistry (Foundry) |
| `consumers/` | live-agent · plain-shield |
| `evals/` · `deployments/` | Locked targets · on-chain records |
| `docs/` | Architecture · diagrams · integrate · recipes |

| Depends on | |
|---|---|
| `apps/web` · `packages/mcp` | → `packages/core` |
| `packages/check` · `consumers/plain-shield` | → ENSv2 Sepolia (no our server) |
| `packages/core` | → The Graph mainnet · ENSv2 · SavioursRegistry |
| `apps/web` | → Bazantic gateway (meter) |

---

## Docs

| Doc | Purpose |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full trust · control · data · modules · diagrams |
| [DIAGRAMS.md](docs/DIAGRAMS.md) | All Mermaid in one file — paste into Excalidraw |
| [diagrams/](docs/diagrams/) | Individual `.mmd` sources (one file per board) |
| [GRAPH_QUERIES.md](docs/GRAPH_QUERIES.md) | Messari fan-out · Adapter A |
| [BAZANTIC.md](docs/BAZANTIC.md) | Gateway · pricing tiers · e2e |
| [INTEGRATE.md](docs/INTEGRATE.md) | Agents · wallets · MCP · npm |
| [THREAT_MODEL.md](docs/THREAT_MODEL.md) | Trust assumptions |
| [AI-USAGE.md](docs/AI-USAGE.md) | ETHGlobal AI disclosure |
| [recipes/PUBLISH_KIT.md](docs/recipes/PUBLISH_KIT.md) | Published recipes · paste kit |
| [recipes/safe-swap-with-memory.md](docs/recipes/safe-swap-with-memory.md) | Multi-service recipe |
| [recipes/saviours-check-before-sign.md](docs/recipes/saviours-check-before-sign.md) | Core check-before-sign |

---

## Gates (pre-film)

```bash
pnpm typecheck
pnpm check:shield && pnpm check:ens-resolve && pnpm check:ens-story
pnpm check:clean-pin && pnpm check:mcp && pnpm check:incidents
pnpm bazantic:e2e   # optional: local grant for paid settle
```

---

## Identity (Sepolia)

| Item | Value |
|---|---|
| Parent | `saviours.eth` |
| PermissionedResolver | `0xF479306621F718F7d76875f67506ceD33717751c` |
| UserRegistry | `0x3BA6b1c9F0018cac383C17C2ACA5A4dC0F370De5` |
| SavioursRegistry | `0x8f246dd1f7bdd6d169b3cdb77e95d4e84eaff5db` |

Source of truth: `deployments/*.json` — do not invent addresses.

---

## Scope

**What this is**

- Live Graph evidence on ATTACK-1 (`FLASHLOAN_ONE_SHOT` ∧ `ATOMIC_MULTI_PROTOCOL`) with BOT-1 as a WATCH contrast
- ENSv2 hierarchical memory under `*.saviours.eth` with EAC role ceilings
- MEMORY HIT path: **0 Graph · 0 AI · $0**

**What this is not**

- A broad malware / scam detector
- Eight custom Graph subgraphs — it is **1 Messari template × 8 pinned deployments**
- A decentralized dispute court — EAC is permissioned operators
- Mainnet ENS enforcement of Sepolia memory (stated ceiling)
