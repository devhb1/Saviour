/**
 * OpenAI tool schemas + runners for the investigator.
 *
 * Graph tools always hit live The Graph adapters.
 * `get_known_incidents` reads SavioursRegistry when deployments/<network>.json exists.
 */

import { getTransferFlows } from "../graph/adapterA";
import { getProtocolContext, getProtocolInteractions } from "../graph/adapterB";
import type { ToolDefinition } from "../llm/client";
import { getLatestIncidentByTarget } from "../registry/client";
import { isRegistryDeployed, type RegistryNetwork } from "../registry/remember";

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
        "Look up SAVIOURS on-chain registry for a prior incident on this target (Shield memory).",
      parameters: {
        type: "object",
        properties: {
          chainId: { type: "number" },
          address: { type: "string" },
          network: {
            type: "string",
            description: "sepolia (default) or anvil",
          },
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
    case "get_known_incidents": {
      const network = (String(args.network ?? "sepolia") as RegistryNetwork);
      if (network !== "sepolia" && network !== "anvil") {
        return { error: "network must be sepolia or anvil" };
      }
      if (!isRegistryDeployed(network)) {
        return {
          incidents: [],
          note: `Registry deployment missing for ${network} — empty result.`,
        };
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return { error: "Invalid address" };
      }
      const row = await getLatestIncidentByTarget(
        chainId,
        address as `0x${string}`,
        network,
      );
      return {
        incidents: row ? [row] : [],
        note: row ? "Found latest registry incident for target." : "No registry hit.",
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
