/**
 * OpenAI tool schemas + runners for the investigator.
 *
 * Every data tool hits live The Graph adapters — never fixtures.
 * `get_known_incidents` is a stub until Phase 3 registry ships.
 */

import { getTransferFlows } from "../graph/adapterA";
import { getProtocolContext, getProtocolInteractions } from "../graph/adapterB";
import type { ToolDefinition } from "../llm/client";

export const investigatorTools: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_transfer_context",
      description:
        "Live Graph Adapter A: recent Uniswap V3 swap/activity evidence for an address on a chain.",
      parameters: {
        type: "object",
        properties: {
          chainId: { type: "number" },
          address: { type: "string" },
        },
        required: ["chainId", "address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_protocol_context",
      description:
        "Live Graph Adapter B: Messari standardized protocol + account interaction evidence.",
      parameters: {
        type: "object",
        properties: {
          chainId: { type: "number" },
          address: { type: "string" },
        },
        required: ["chainId", "address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_known_incidents",
      description:
        "Look up SAVIOURS registry incidents for an address. Stub until registry is deployed.",
      parameters: {
        type: "object",
        properties: {
          chainId: { type: "number" },
          address: { type: "string" },
        },
        required: ["chainId", "address"],
      },
    },
  },
];

export async function runInvestigatorTool(
  name: string,
  argsJson: string,
): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
    return { error: "Invalid tool arguments JSON" };
  }

  const chainId = Number(args.chainId);
  const address = String(args.address ?? "");

  switch (name) {
    case "get_transfer_context":
      return getTransferFlows(chainId, address, { first: 20 });
    case "get_protocol_context": {
      const [protocol, interactions] = await Promise.all([
        getProtocolContext(chainId),
        getProtocolInteractions(chainId, address, { first: 15 }),
      ]);
      return [...protocol, ...interactions];
    }
    case "get_known_incidents":
      return { incidents: [], note: "Registry not deployed yet — empty result." };
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
