#!/usr/bin/env node
/**
 * SAVIOURS MCP server (stdio) for Cursor / Claude.
 *
 * Tools: check_target · investigate_target · get_incident ·
 *         list_standard_protocols · fanout_target
 *
 *   pnpm mcp
 *   # or: pnpm --filter @saviours/mcp start
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadRootEnv } from "@saviours/core";
import {
  check_target,
  fanout_target,
  get_incident,
  investigate_target,
  list_standard_protocols,
} from "./tools";

loadRootEnv();

const server = new McpServer({
  name: "saviours",
  version: "0.1.0",
});

server.tool(
  "check_target",
  "ENS-first Shield check. Returns BLOCK/WARN/ALLOW/ESCALATE. Never Graph, never AI. Demo: ATTACK-1 → BLOCK · source ENS · fresh investigation: NO.",
  {
    address: z.string().describe("0x target address (usually mainnet)"),
    chainId: z.number().optional().describe("Target chain id (default 1)"),
    registryNetwork: z
      .enum(["sepolia", "anvil"])
      .optional()
      .describe("Memory network (default sepolia)"),
  },
  async (args) => {
    try {
      const result = await check_target(args);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: e instanceof Error ? e.message : String(e),
            }),
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "investigate_target",
  "Investigate an address: Shield pre-check → live Messari Graph fan-out → signals → optional AI explain. Set persist=true to Remember on Sepolia.",
  {
    address: z.string(),
    chainId: z.number().optional(),
    persist: z
      .boolean()
      .optional()
      .describe("Write ENS+registry when WATCH/TAINTED (default false)"),
    forceFresh: z
      .boolean()
      .optional()
      .describe("Skip MEMORY HIT short-circuit"),
    registryNetwork: z.enum(["sepolia", "anvil"]).optional(),
  },
  async (args) => {
    try {
      const result = await investigate_target(args);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: e instanceof Error ? e.message : String(e),
            }),
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "get_incident",
  "Read saviours.* ENS text records for an address-label name, plus registry row if present.",
  {
    address: z.string(),
    chainId: z.number().optional(),
    registryNetwork: z.enum(["sepolia", "anvil"]).optional(),
  },
  async (args) => {
    try {
      const result = await get_incident(args);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: e instanceof Error ? e.message : String(e),
            }),
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "list_standard_protocols",
  "Messari standards registry: 1 template family set × pinned subgraph ids, plus excluded pins and Adapter A. No network.",
  {},
  async () => {
    try {
      const result = list_standard_protocols();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: e instanceof Error ? e.message : String(e),
            }),
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "fanout_target",
  "Read-only Messari Graph fan-out for an address. Returns banner, per-protocol {slug,subgraphId,status,ms,rowCount}, signals, adapterACount. No persist.",
  {
    address: z.string(),
    chainId: z.number().optional().describe("Target chain id (default 1)"),
  },
  async (args) => {
    try {
      const result = await fanout_target(args);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: e instanceof Error ? e.message : String(e),
            }),
          },
        ],
        isError: true,
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
