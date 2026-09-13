# SAVIOURS — Agent Skill

**Public security memory on ENS for AI agents and wallets.**

Investigate a counterparty once with The Graph. Name the verdict on ENSv2. Every agent after you resolves it for **$0** (0 Graph · 0 AI).

---

## When to use this skill

Use Saviours **before** any swap, approve, transfer, or contract call to an unfamiliar EVM address.

Do **not** use it as a general "is this DeFi safe?" oracle. It names proven threat memory — it does not endorse SAFE counterparties.

---

## Product law (do not violate)

1. Only **WATCH** / **TAINTED** are named. **SAFE is never a name.**
2. No name / UNKNOWN ≠ safe. Escalate; never treat blank as ALLOW.
3. Memory hit (ENS / registry) is **always $0**. Never charge for remembering.
4. Fresh investigate costs ~**$0.01 USDC on Base** (Bazantic x402). The **calling agent** pays.
5. AI explains and cites. A deterministic validator owns the verdict. AI never writes ENS.

---

## Fastest setup (Claude / Cursor / npm)

```bash
# Agents
claude mcp add --transport http saviours https://saviours.bazgateway.com/mcp

# Wallets / apps — fresh project only (not inside the Saviours monorepo)
mkdir saviours-demo && cd saviours-demo
npm init -y && npm i @saviours/check
```

Or add to Cursor MCP settings:

```json
{
  "mcpServers": {
    "saviours": {
      "url": "https://saviours.bazgateway.com/mcp"
    }
  }
}
```

Gateway: https://saviours.bazgateway.com/mcp (POST) · human guide: https://www.saviours.xyz/gateway  
OpenAPI: https://www.saviours.xyz/openapi-saviours.json  
App: https://www.saviours.xyz  
**Published Bazantic recipes (5):** `safe-swap-with-memory` · `saviours-check-before-sign` · `investigate-once-explain` · `dossier-deep-dive` · `fleet-triage`  
Paste kit: `docs/recipes/PUBLISH_KIT.md` · human guide: https://www.saviours.xyz/gateway

---

## Check-before-sign recipe (copy into the agent)

```
Before any transfer, approve, or swap to an EVM address:
1. Call shieldCheck with chainId=1 and the address (registryNetwork=sepolia).
2. If decision is BLOCK or WARN → CANCEL. Do not sign. Cost must be $0.
3. If miss / ESCALATE → call investigate (expect HTTP 402; settle x402 on Base) OR ask the user.
4. Optionally re-verify independently: ENS text saviours.status on <lowercase-address>.saviours.eth via public Sepolia RPC — no Saviours server required.
Never invent TAINTED. Never treat UNKNOWN as SAFE. Never pay for a memory hit.
```

---

## Tools

### Bazantic gateway MCP (`https://saviours.bazgateway.com/mcp`)

Primary (check-before-sign):

| Tool | Price | Use |
|---|---|---|
| `shieldCheck` | **$0** | ENS-first memory; BLOCK / WARN / ALLOW / ESCALATE |
| `investigate` | ~USDC on Base (x402) | Fresh Graph + validator — pay on miss only |
| `info` | $0 | Service description |

Also exposed: `resolveEns` · `resolveTarget` · `getEvidence` · `askCase` · `payInvestigate` · `fleetCatalog` · `fetchDossier` · path variants. MCP total: **17 tools**. Prefer **shieldCheck first**; never pay for a memory hit.

**Never bind in agent recipes:** `dispute` · `revoke` · `eacProbe` (operator-only).

### Local stdio MCP (`packages/mcp`)

`check_target` · `investigate_target` · `get_incident` · `list_standard_protocols` · `fanout_target`

---

## Two-line SDK (Node)

```bash
# Fresh project — not inside the Saviours monorepo
mkdir saviours-demo && cd saviours-demo
npm init -y && npm i @saviours/check
```

```ts
import { check, guard } from "@saviours/check";

const r = await check("0x935bfb495e33f74d2e9735df1da66ace442ede48");
// ens mode default: PermissionedResolver only · $0 · no Saviours server
if (r.decision === "BLOCK" || r.decision === "WARN") throw new Error("named threat");
await guard(addr); // throws on BLOCK
```

Modes: `ens` (default, $0, no server) · `shield` (gateway $0) · `full` (investigate on miss).

---

## Prove it without Saviours (kill switch)

```bash
cast call 0xF479306621F718F7d76875f67506ceD33717751c \
  "text(bytes32,string)(string)" \
  $(cast namehash 0x935bfb495e33f74d2e9735df1da66ace442ede48.saviours.eth) \
  "saviours.status" \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com
# → TAINTED
```

Or open `consumers/plain-shield.html` in a browser.

---

## Demo heroes (locked)

| Label | Address | Expect |
|---|---|---|
| Known exploiter | `0x935bfb495e33f74d2e9735df1da66ace442ede48` | BLOCK / TAINTED |
| Flashloan bot | `0x352423e2fa5d5c99343d371c9e3bc56c87723cc7` | WARN / WATCH |
| Clean treasury | `0x55fe002aeff02f77364de339a1292923a15844b8` | no name / ESCALATE or ALLOW path |

Evidence = Ethereum mainnet Graph. Memory = Sepolia ENSv2. Payment = Base USDC.

---

## Repo pointers

- Integrate (devs / agents): `docs/INTEGRATE.md`
- Product law: root `README.md`
- Architecture: `docs/ARCHITECTURE.md`
- Endgame build plan: `docs/ENDGAME.md`
- Pitch / Q&A: `docs/PITCH_AND_QA.md`

## Support

- Email: b4harshit01@gmail.com
- Twitter: [@harshitb01](https://twitter.com/harshitb01)
- GitHub: [devhb1](https://github.com/devhb1) · [Saviour issues](https://github.com/devhb1/Saviour/issues)
