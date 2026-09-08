# @saviours/mcp

Cursor / Claude MCP server for SAVIOURS security memory.

## Tools

| Tool | Behavior |
|---|---|
| `check_target` | ENS-first Shield — never Graph, never AI |
| `investigate_target` | Shield → live Graph → signals → explain (`persist` optional) |
| `get_incident` | ENS `saviours.*` texts + registry row |

## Run

```bash
pnpm mcp                 # stdio server
pnpm check:mcp           # ATTACK-1 → BLOCK gate
```

## Cursor

Copy `packages/mcp/mcp.json.example` into `.cursor/mcp.json` (already present in this repo):

```json
{
  "mcpServers": {
    "saviours": {
      "command": "pnpm",
      "args": ["--filter", "@saviours/mcp", "start"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

Restart Cursor MCP after changing `.env` (`SEPOLIA_RPC_URL` required for `check_target`).

## Demo beat

`check_target` on MakinaFi ATTACK-1 → `BLOCK · known TAINTED · source ENS · fresh investigation: NO`
