# Architecture

Trust boundary, control flow, data flow, module map, and UI walkthrough for SAVIOURS.

**Companions:** [DIAGRAMS.md](./DIAGRAMS.md) (Excalidraw-ready Mermaid) · [GRAPH_QUERIES.md](./GRAPH_QUERIES.md) · [BAZANTIC.md](./BAZANTIC.md) · [INTEGRATE.md](./INTEGRATE.md) · [THREAT_MODEL.md](./THREAT_MODEL.md)

**Product law:** root [README.md](../README.md).  
**UI walkthrough:** 01 Threat · 02 Investigate · 03 Name · 04 Resolve · 05 Memory · Build · Docs (`#case` = depth only).

---

## 0. Big picture

```mermaid
flowchart LR
  subgraph mainnet [Mainnet evidence]
    G[The Graph · Messari x8 + Adapter A]
  end
  subgraph decide [Decision]
    S[deriveSignals]
    L[LLM explain · cites only]
    V[validateAssessment]
  end
  subgraph sepolia [Sepolia memory]
    E["ENSv2 · address.saviours.eth"]
    R[SavioursRegistry]
  end
  subgraph free [Resolve · $0]
    Sh[Shield / MCP / cast / plain-shield / Bazantic]
  end
  G --> S --> L --> V
  S --> V
  V --> E
  V --> R
  E --> Sh
  R -->|fallback| Sh
```

**Loop:** Investigate once → Name forever → Resolve for free. Detection is narrow; **naming** is the product.

---

## 1. System context

```mermaid
flowchart TB
  subgraph consumers [Consumers_0_Graph_0_AI]
    UI[Web_UI_walkthrough]
    MCP[MCP_check_target]
    Cast[cast_text]
    Plain[plain_shield_html]
    Baz[Bazantic_shieldCheck]
    SDK[saviours_check]
  end

  subgraph memory [Security_memory_Sepolia]
    ENS[ENSv2_PermissionedResolver]
    Reg[SavioursRegistry]
    Dossier[IPFS_or_public_JSON]
  end

  subgraph investigate [Investigate_path_costly]
    Graph[The_Graph_mainnet]
    Sig[deriveSignals]
    LLM[LLM_explain_only]
    Val[validateAssessment]
  end

  Address[Target_address] --> UI
  Address --> MCP
  Address --> Baz
  Address --> SDK
  UI -->|miss_or_forceFresh| Graph
  MCP -->|investigate_target| Graph
  Baz -->|paid_investigate| Graph
  Graph --> Sig --> LLM --> Val
  Val -->|Remember| ENS
  Val -->|Remember| Reg
  Val -->|optional| Dossier
  ENS --> UI
  ENS --> MCP
  ENS --> Cast
  ENS --> Plain
  ENS --> Baz
  ENS --> SDK
  Reg -->|fallback| UI
  Reg -->|fallback| MCP
  Reg -->|fallback| SDK
```

---

## 2. Trust boundary (who may decide what)

| Layer | May decide | Must not |
|---|---|---|
| The Graph (live mainnet) | Evidence rows only | Invent threats; offline dumps in product paths |
| `deriveSignals` | Signal ids from evidence | Write chain state |
| LLM | Natural-language explanation + cite ids | Own status; write ENS/registry |
| `validateAssessment` | Final `status` / confidence | Accept model TAINTED without threat-class signal |
| ENSv2 texts | Portable verdict for any resolver client | Replace Graph truth |
| SavioursRegistry | Append-only ledger + Shield fallback | Shorten TAINTED history on dispute |
| Shield Tier-1 | BLOCK / WARN / ALLOW / ESCALATE | Call Graph or AI |
| Bazantic | Meter miss / pass through | Own memory or verdict |

```mermaid
flowchart LR
  Graph[Live_Graph] -->|evidence| Signals
  Signals -->|ids| LLM
  Signals -->|gate| Validator
  LLM -->|cites_only| Validator
  Validator -->|status| ENS
  Validator -->|status| Registry
  ENS -->|first| Shield
  Registry -->|fallback| Shield
```

---

## 3. Chain boundary

| Concern | Network | Why |
|---|---|---|
| Threat evidence | Ethereum **mainnet** `chainId=1` | Real Messari + Adapter A activity |
| Security memory | **Sepolia** ENSv2 + SavioursRegistry | ENSv2 beta; intentional ceiling |
| Agent settle | **Base** USDC (x402 via Bazantic) | Gateway invoices `network: base` |
| Local proof | Anvil | `check:hero-loop` backup |

`Incident.chainId` = **target** chain (usually 1), not the memory deployment chain.

```mermaid
flowchart TB
  subgraph L1 [Ethereum mainnet]
    Ev[Graph evidence · ATTACK-1 / BOT-1]
  end
  subgraph L2 [Sepolia]
    Mem[ENSv2 texts + SavioursRegistry]
  end
  subgraph L3 [Base]
    Pay[x402 investigate settle ~$0.01]
  end
  Ev -->|Remember verdict| Mem
  Pay -->|funds miss investigate| Ev
  Mem -->|MEMORY HIT $0| Agents[Any agent / cast / UI]
```

---

## 4. User walkthrough (UI = product film)

```mermaid
flowchart TD
  H[01 Threat · tagline + tracks] --> I[02 Investigate · fan-out + agent console]
  I --> N[03 Name · ceremony + EAC]
  N --> R[04 Resolve · Shield / CmdK]
  R --> M[05 Memory · verified vs seeded]
  M --> B[Build · SDK / recipe / OpenAPI]
  B --> D[Docs]
  I -.->|Open full dossier| C[Case · depth only]
  R -.->|Open full dossier| C
  M -.->|Open full dossier| C
```

| Hash | Screen | Job |
|---|---|---|
| `#threat` | Home | Frame the product + honesty |
| `#investigate` | Investigate | Live Graph + who pays |
| `#name` | Identity / ceremony | ENS is the API |
| `#resolve` | Resolve / ⌘K | MEMORY HIT decision |
| `#memory` | Memory | Provenance buckets |
| `#build` / `#docs` | Build / Docs | Outside this UI |
| `#case` | Case | Depth — not a primary beat |

---

## 5. Control flow — Investigate → Remember

```mermaid
sequenceDiagram
  participant U as Operator_UI
  participant API as POST_api_investigate
  participant S as Shield_checkTarget
  participant E as getEvidenceBundle
  participant AI as LLM_explain
  participant V as validateAssessment
  participant N as Remember_ENS_Registry

  U->>API: address forceFresh persist
  API->>S: ENS then registry
  alt MEMORY_HIT and not forceFresh
    S-->>API: BLOCK_WARN_ALLOW usedAi=false
    API-->>U: assessment cost graph=0 ai=0
  else miss or forceFresh
    API->>E: Messari_x8 plus Adapter_A plus cooccur
    E-->>API: evidence signals banner
    API->>AI: explain cite ids
    AI-->>API: explanation
    API->>V: signal gate
    V-->>API: status confidence
    opt persist and writes allowed
      API->>N: dossier ENS texts registry
    end
    API-->>U: verdict evidence fold
  end
```

### Branch table

| Condition | Graph | AI | Persist |
|---|---|---|---|
| MEMORY HIT · `forceFresh=false` | 0 | 0 | no |
| MEMORY HIT · `forceFresh=true` | live | explain | if writes on |
| Miss | live | explain | if writes on + WATCH/TAINTED |
| Writes fail-closed (prod unset/`=0`) | live OK | live OK | never |

---

## 6. Control flow — Agent pay (Bazantic)

```mermaid
sequenceDiagram
  participant A1 as Agent_1_swap_router
  participant GW as Bazantic_gateway
  participant API as Saviours_API
  participant ENS as ENSv2
  participant A2 as Agent_2_vault_keeper

  A1->>GW: investigate
  GW->>API: POST investigate
  API-->>GW: 402 x402 invoice
  GW-->>A1: pay ~0.01 USDC Base
  A1->>GW: settle
  GW->>API: authorized investigate
  API-->>A1: TAINTED + optional Remember
  A2->>GW: shieldCheck
  GW->>API: POST shield check
  API->>ENS: resolve status
  ENS-->>A2: BLOCK · usedAi false · $0
```

Pitch: Graph + ENS first. Bazantic = settlement at the miss — never the hero detector.

---

## 7. Control flow — Resolve (0 Graph · 0 AI)

```mermaid
flowchart TD
  Addr[Address] --> Shield[checkTarget]
  Shield --> ENSRead{ENS_saviours.status}
  ENSRead -->|TAINTED| BLOCK[BLOCK]
  ENSRead -->|WATCH| WARN[WARN]
  ENSRead -->|SAFE| ALLOW[ALLOW]
  ENSRead -->|miss| RegRead{Registry_latest}
  RegRead -->|hit| MapStatus[Map_to_BLOCK_WARN_ALLOW]
  RegRead -->|miss| ESC[ESCALATE]
```

Consumers: UI Resolve · MCP `check_target` · `cast` · `plain-shield.html` · Bazantic `shieldCheck` — **none** call The Graph or the LLM on MEMORY HIT.

---

## 8. Control flow — Name (ceremony + EAC)

```mermaid
flowchart LR
  F[FOUND · address + verdict] --> NM[NAME · label.saviours.eth]
  NM --> REC[RECORDS · saviours.* texts]
  REC --> TX[SEPOLIA TX · register / setText]
  TX --> P[PASSPORT · cast readable]
```

```mermaid
flowchart TD
  Inv[Investigator role] -->|may write| Status[saviours.status / threat / evidenceHash]
  Disp[Disputer role] -->|may write| Dispute[dispute / revoke paths]
  Inv -->|wrong role on dispute key| Revert[EAC REVERT]
  Disp -->|wrong role on status key| Revert
```

EAC proves **permission model in code** (operator wallets today) — not decentralization.

---

## 9. Control flow — Govern / Memory honesty

```mermaid
flowchart TD
  List[GET_incidents] --> Split{proof}
  Split -->|graph| GV[Graph_verified_table]
  Split -->|provenance| PR[Seeded_collapsed]
  GV --> EAC[eac_probe_write_gated]
  GV --> Dispute[dispute_ENS_WATCH]
  GV --> Revoke[revoke_unregister]
  Dispute --> Note[Registry_append_only_may_still_BLOCK]
  EAC --> Revert[Investigator_setText_dispute_REVERT]
```

Buckets never laundered: seeds are not Graph detections.

---

## 10. Evidence pipeline (Graph)

```mermaid
flowchart TB
  Addr[Address] --> FO[fanOut_STANDARD_PROTOCOLS_x8]
  Addr --> AA[Adapter_A_uni_v3_community]
  FO --> Soft[Promise_allSettled_per_protocol]
  Soft --> Norm[normalizeEvidence_subgraphId_protocol_txHash]
  AA --> Norm
  Norm --> Peers[taintedPeers_from_ENS]
  Peers --> Co[cooccurrence_enrich]
  Co --> Sig[deriveSignals]
  Sig --> Status[statusFromSignals]
```

**ATOMIC_MULTI_PROTOCOL** = set intersection on shared Messari `hash` across protocols.  
**Excluded** (never queried): Balancer / Pancake / Convex — broken on network (Coverage honesty).

```mermaid
flowchart TD
  Sig[Signals] --> Gate{Threat class?}
  Gate -->|FLASHLOAN_ONE_SHOT AND ATOMIC_MULTI_PROTOCOL| T[TAINTED]
  Gate -->|DRAIN_FANIN| T
  Gate -->|REGISTRY_COOCCURRENCE| T
  Gate -->|BOT_PROFILE only| W[WATCH]
  Gate -->|none| U[UNKNOWN / SAFE path]
```

Signal gate (TAINTED): `(FLASHLOAN_ONE_SHOT ∧ ATOMIC_MULTI_PROTOCOL) ∨ DRAIN_FANIN ∨ REGISTRY_COOCCURRENCE`  
`BOT_PROFILE` caps at WATCH.

---

## 11. Module map (`packages/core`)

```mermaid
flowchart TB
  inv[investigator] --> ev[evidence]
  inv --> sh[shield]
  inv --> ens[ens]
  inv --> reg[registry]
  inv --> llm[llm]
  inv --> dos[dossier]
  ev --> graph[graph]
  ev --> sig[signals]
  sh --> ens
  sh --> reg
  mcp[packages/mcp] --> inv
  web[apps/web APIs] --> inv
```

| Dir | Responsibility | Key entry |
|---|---|---|
| `graph/` | Gateway, `fanOut`, protocols table, Adapter A/B | `fanOut`, `STANDARD_PROTOCOLS` |
| `evidence/` | Normalize, cache, signals, co-occurrence, bundle | `getEvidenceBundle` |
| `investigator/` | Shield pre-check, explain, cost/trace, remember wire | `investigateDetailed` |
| `classifier/` | Validator / signal gate | `validateAssessment` |
| `ens/` | Labels, resolve, register, roles, dispute, EAC | `resolveIncident`, `registerIncidentName` |
| `registry/` | SavioursRegistry client | `rememberValidatedAssessment` |
| `shield/` | ENS-first Tier-1 | `checkTarget` |
| `dossier/` | Pinata / public JSON (soft-skip) | `pinAssessmentDossier` |
| `incidents/` | Seed ∪ live index | `listAllIncidents` |
| `memory/` | Live TAINTED peers | `loadDemoAttackSeeds` |
| `llm/` | OpenAI client | `chatCompletion` |

---

## 12. Surfaces & APIs

| Surface | Entry |
|---|---|
| Web UI | `apps/web` — 01 Threat → 05 Memory · Build · Docs · `#case` depth |
| HTTP | `/api/investigate` · `/api/evidence/[chainId]/[address]` · `/api/shield/check` · `/api/resolve` · `/api/incidents` · `/api/govern/*` · `/api/agent/stream` · `/api/dossier/fetch` · `/api/fingerprint/recompute` |
| MCP | `check_target` · `investigate_target` · `get_incident` · `list_standard_protocols` · `fanout_target` |
| Zero-SDK | `consumers/plain-shield.html` |
| Contracts | `contracts/src/SavioursRegistry.sol` |

### Write gate

```mermaid
flowchart TD
  Req[Write_API] --> Env{SAVIOURS_ALLOW_WRITES}
  Env -->|0_false| Deny[401]
  Env -->|unset_and_production| Deny
  Env -->|1_or_dev_unset| Token{WRITE_TOKEN?}
  Token -->|set_and_mismatch| Deny
  Token -->|ok| Allow[Proceed]
```

Browser: `NEXT_PUBLIC_SAVIOURS_ALLOW_WRITES` mirrors for `persist` (Investigate).

---

## 13. State machines

### Assessment status

```mermaid
stateDiagram-v2
  [*] --> UNKNOWN
  UNKNOWN --> WATCH: investigate + bot / soft
  UNKNOWN --> TAINTED: threat-class signals
  UNKNOWN --> SAFE: rare · not named
  WATCH --> TAINTED: re-investigate escalate
  WATCH --> [*]: expiry 7d
  TAINTED --> WATCH: dispute
  TAINTED --> [*]: revoke unregister
```

### Shield decision

| Memory | Decision |
|---|---|
| TAINTED | BLOCK |
| WATCH | WARN |
| SAFE | ALLOW |
| none | ESCALATE |

### ENS vs registry after dispute

```text
Dispute → ENS saviours.status = WATCH
        → Registry row unchanged (append-only)
        → Shield may still BLOCK via registry until revoke story understood
Revoke  → ENS unregistered (miss)
        → Registry may still hold historical TAINTED
```

---

## 14. Deployments (source of truth)

Addresses live in `deployments/*.json` — **never invent**, never put contract addresses only in `.env`.

| Artifact | Role |
|---|---|
| `deployments/sepolia.json` | SavioursRegistry |
| `deployments/sepolia-ens-identity.json` | Parent, resolver, UserRegistry |
| `evals/demo-targets.json` | Locked demo addresses |
| `evals/seed-incidents.json` | Govern seeds + `proof` badge |

---

## 15. Non-goals (architecture)

- Ambient monitoring / general detector
- Static chain payloads in product paths
- AI-owned verdicts
- Mainnet ENS enforcement in this cut (Sepolia ceiling is intentional)
- Treating Bazantic as the detector (it meters; Graph + ENS own truth)
