/**
 * Thin LLM client used by investigate() / spikes.
 * Does not fetch chain data — callers pass live Graph evidence in messages.
 */

import { requireAiApiKey, loadRootEnv } from "../config/env";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ChatResult = {
  message: ChatMessage;
  model: string;
};

function provider(): string {
  loadRootEnv();
  return (process.env.AI_PROVIDER ?? "openai").trim().toLowerCase();
}

export function aiModel(): string {
  loadRootEnv();
  return (process.env.AI_MODEL ?? "gpt-4o-mini").trim();
}

/** Provider-agnostic chat with optional tools. OpenAI first (hackathon default). */
export async function chat(opts: {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "none" | "required";
  jsonMode?: boolean;
}): Promise<ChatResult> {
  const p = provider();
  if (p !== "openai") {
    throw new Error(`AI_PROVIDER=${p} is not supported yet (use openai)`);
  }
  return chatOpenAI(opts);
}

async function chatOpenAI(opts: {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "none" | "required";
  jsonMode?: boolean;
}): Promise<ChatResult> {
  const apiKey = requireAiApiKey();
  const model = aiModel();

  const body: Record<string, unknown> = {
    model,
    messages: opts.messages.map((m) => {
      const row: Record<string, unknown> = {
        role: m.role,
        content: m.content,
      };
      if (m.tool_call_id) row.tool_call_id = m.tool_call_id;
      if (m.tool_calls) row.tool_calls = m.tool_calls;
      return row;
    }),
  };

  if (opts.tools?.length) {
    body.tools = opts.tools;
    body.tool_choice = opts.toolChoice ?? "auto";
  }
  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as {
    error?: { message?: string };
    model?: string;
    choices?: Array<{
      message?: {
        role?: string;
        content?: string | null;
        tool_calls?: ToolCall[];
      };
    }>;
  };

  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${json.error?.message ?? JSON.stringify(json)}`);
  }

  const msg = json.choices?.[0]?.message;
  if (!msg) throw new Error("OpenAI response missing choices[0].message");

  return {
    model: json.model ?? model,
    message: {
      role: "assistant",
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    },
  };
}
