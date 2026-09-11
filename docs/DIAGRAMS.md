# SAVIOURS diagrams — Excalidraw import kit

Every diagram below is **Mermaid**. Use these to rebuild boards in Excalidraw.

## How to import into Excalidraw

### Option A — paste Mermaid (recommended)

1. Open [excalidraw.com](https://excalidraw.com) (or Excalidraw desktop / Obsidian plugin).
2. Menu → **More tools** → **Mermaid to Excalidraw** (or Insert → Mermaid).
3. Paste **one** `flowchart` block at a time (native editable elements).
4. Sequence / state diagrams import as images — fine for slides; prefer flowcharts for editable boards.

### Option B — `.mmd` files

Plain Mermaid sources live in [`diagrams/`](./diagrams/). Open a file, copy all, paste into Excalidraw Mermaid import.

### Option C — CLI (optional)

```bash
# if you use markdown-mermaid-to-excalidraw / me2ex-conv:
me2ex-conv -i docs/DIAGRAMS.md -o docs/diagrams/saviours
```

**Tip:** Excalidraw’s converter supports **flowcharts** best. This file prefers `flowchart` for that reason. Matching narrative lives in [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Index

| # | File | Title |
|---|---|---|
| 01 | [`01-product-loop.mmd`](./diagrams/01-product-loop.mmd) | Product loop |
| 02 | [`02-system-context.mmd`](./diagrams/02-system-context.mmd) | System context |
| 03 | [`03-trust-boundary.mmd`](./diagrams/03-trust-boundary.mmd) | Trust boundary |
| 04 | [`04-chain-split.mmd`](./diagrams/04-chain-split.mmd) | Chain split |
| 05 | [`05-user-walkthrough.mmd`](./diagrams/05-user-walkthrough.mmd) | User / demo walkthrough |
| 06 | [`06-investigate.mmd`](./diagrams/06-investigate.mmd) | Investigate → Remember |
| 07 | [`07-resolve.mmd`](./diagrams/07-resolve.mmd) | Resolve MEMORY HIT |
| 08 | [`08-agent-pay.mmd`](./diagrams/08-agent-pay.mmd) | Agent pay (who pays) |
| 09 | [`09-naming-ceremony.mmd`](./diagrams/09-naming-ceremony.mmd) | Naming ceremony |
| 10 | [`10-eac-roles.mmd`](./diagrams/10-eac-roles.mmd) | EAC roles |
| 11 | [`11-evidence-pipeline.mmd`](./diagrams/11-evidence-pipeline.mmd) | Evidence pipeline |
| 12 | [`12-signal-gate.mmd`](./diagrams/12-signal-gate.mmd) | Signal gate |
| 13 | [`13-memory-honesty.mmd`](./diagrams/13-memory-honesty.mmd) | Memory honesty |
| 14 | [`14-write-gate.mmd`](./diagrams/14-write-gate.mmd) | Write gate |
| 15 | [`15-monorepo.mmd`](./diagrams/15-monorepo.mmd) | Monorepo modules |
| 16 | [`16-surfaces.mmd`](./diagrams/16-surfaces.mmd) | Surfaces |

---

## 01 · Product loop

```mermaid
flowchart LR
  I[Investigate · The Graph] --> N[Name · ENSv2]
  N --> R[Resolve · MEMORY HIT · $0]
```

---

## 02 · System context

```mermaid
flowchart TB
  subgraph consumers [Consumers · 0 Graph · 0 AI on hit]
    UI[Web UI]
    MCP[MCP]
    Cast[cast]
    Plain[plain-shield]
    Baz[Bazantic shieldCheck]
    SDK["@saviours/check"]
  end
  subgraph memory [Sepolia memory]
    ENS[ENSv2 PermissionedResolver]
    Reg[SavioursRegistry]
  end
  subgraph investigate [Investigate · costly]
    Graph[The Graph mainnet]
    Sig[deriveSignals]
    LLM[LLM explain]
    Val[validateAssessment]
  end
  Addr[Target address] --> consumers
  consumers -->|miss| Graph
  Graph --> Sig --> LLM --> Val
  Sig --> Val
  Val --> ENS
  Val --> Reg
  ENS --> consumers
  Reg -->|fallback| consumers
```

---

## 03 · Trust boundary

```mermaid
flowchart LR
  Graph[Live Graph] -->|evidence| Signals
  Signals -->|ids| LLM
  Signals -->|gate| Validator
  LLM -->|cites only| Validator
  Validator -->|status| ENS
  Validator -->|status| Registry
  ENS -->|first| Shield
  Registry -->|fallback| Shield
```

---

## 04 · Chain split

```mermaid
flowchart TB
  subgraph mainnet [Ethereum mainnet]
    Ev[Graph evidence]
  end
  subgraph sepolia [Sepolia]
    Mem[ENSv2 + SavioursRegistry]
  end
  subgraph base [Base]
    Pay[x402 ~$0.01 USDC]
  end
  Ev -->|Remember| Mem
  Pay -->|funds miss| Ev
  Mem -->|MEMORY HIT $0| Agents[Agents / cast / UI]
```

---

## 05 · User / demo walkthrough

```mermaid
flowchart TD
  H[01 Threat] --> I[02 Investigate]
  I --> N[03 Name]
  N --> R[04 Resolve]
  R --> M[05 Memory]
  M --> B[Build]
  B --> D[Docs]
  I -.->|dossier depth| C[Case]
  R -.-> C
  M -.-> C
```

---

## 06 · Investigate → Remember

```mermaid
flowchart TD
  Start[POST /api/investigate] --> Shield{MEMORY HIT?}
  Shield -->|yes · no forceFresh| Hit[Return verdict · 0 Graph · 0 AI · $0]
  Shield -->|miss or forceFresh| Fan[Messari x8 + Adapter A]
  Fan --> Sig[deriveSignals]
  Sig --> AI[LLM explain · cite ids]
  AI --> Val[validateAssessment]
  Val --> Persist{writes + WATCH/TAINTED?}
  Persist -->|yes| Name[ENS texts + Registry]
  Persist -->|no| Out[Return verdict only]
  Name --> Out
```

---

## 07 · Resolve MEMORY HIT

```mermaid
flowchart TD
  Addr[Address] --> Shield[checkTarget]
  Shield --> ENS{ENS saviours.status}
  ENS -->|TAINTED| BLOCK
  ENS -->|WATCH| WARN
  ENS -->|SAFE| ALLOW
  ENS -->|miss| Reg{Registry}
  Reg -->|hit| Map[Map to decision]
  Reg -->|miss| ESCALATE
```

---

## 08 · Agent pay (who pays)

```mermaid
flowchart TD
  A1[Agent 1 · swap-router] -->|investigate| GW[Bazantic gateway]
  GW -->|402 invoice| A1
  A1 -->|settle ~$0.01 Base| GW
  GW -->|paid investigate| API[Saviours API]
  API --> Optional[Optional Remember on ENS]
  A2[Agent 2 · vault-keeper] -->|shieldCheck| GW
  GW --> API2[shield/check]
  API2 --> ENS[ENSv2]
  ENS -->|BLOCK · $0| A2
```

---

## 09 · Naming ceremony

```mermaid
flowchart LR
  F[FOUND] --> NM[NAME]
  NM --> REC[RECORDS]
  REC --> TX[SEPOLIA TX]
  TX --> P[PASSPORT]
```

---

## 10 · EAC roles

```mermaid
flowchart TD
  Inv[Investigator] -->|may write| StatusKeys[status / threat / evidenceHash]
  Disp[Disputer] -->|may write| DisputeKeys[dispute / revoke]
  Inv -->|dispute key| Revert[EAC REVERT]
  Disp -->|status key| Revert
```

---

## 11 · Evidence pipeline

```mermaid
flowchart TB
  Addr[Address] --> FO[fanOut Messari x8]
  Addr --> AA[Adapter A Uni V3]
  FO --> Soft[allSettled]
  Soft --> Norm[normalizeEvidence]
  AA --> Norm
  Norm --> Peers[taintedPeers from ENS]
  Peers --> Co[cooccurrence]
  Co --> Sig[deriveSignals]
```

---

## 12 · Signal gate

```mermaid
flowchart TD
  Sig[Signals] --> Gate{Threat class?}
  Gate -->|FLASHLOAN_ONE_SHOT AND ATOMIC_MULTI_PROTOCOL| T[TAINTED]
  Gate -->|DRAIN_FANIN| T
  Gate -->|REGISTRY_COOCCURRENCE| T
  Gate -->|BOT_PROFILE only| W[WATCH]
  Gate -->|none| U[UNKNOWN]
```

---

## 13 · Memory honesty

```mermaid
flowchart TD
  List[Incidents] --> Split{proof}
  Split -->|graph| GV[Graph-verified]
  Split -->|provenance| Seed[Seeded · collapsed]
  GV --> Actions[EAC / dispute / revoke]
  Seed -->|never counted as| GraphDet[Graph detections]
```

---

## 14 · Write gate

```mermaid
flowchart TD
  Req[Write API] --> Env{SAVIOURS_ALLOW_WRITES}
  Env -->|0 or prod unset| Deny[401]
  Env -->|1 or local| Token{WRITE_TOKEN?}
  Token -->|mismatch| Deny
  Token -->|ok| Allow[Proceed]
```

---

## 15 · Monorepo modules

```mermaid
flowchart TB
  web[apps/web] --> core[packages/core]
  mcp[packages/mcp] --> core
  check[packages/check] --> ens[ENSv2]
  core --> graph[The Graph]
  core --> ens
  core --> reg[SavioursRegistry]
  consumers[consumers/plain-shield] --> ens
  web --> baz[Bazantic]
```

---

## 16 · Surfaces

```mermaid
flowchart LR
  UI[Web UI] --> Core[packages/core]
  MCP[MCP] --> Core
  HTTP[HTTP APIs] --> Core
  Core --> Graph[Graph]
  Core --> ENS[ENS]
  Core --> Reg[Registry]
  Baz[Bazantic] --> HTTP
  Cast[cast / plain-shield] --> ENS
```

---

## Copy-paste checklist (film board)

Build one Excalidraw page in this order for judges:

1. Product loop (01)
2. User walkthrough (05)
3. Investigate (06) + Agent pay (08)
4. Naming (09) + EAC (10)
5. Resolve (07)
6. System context (02) as appendix
