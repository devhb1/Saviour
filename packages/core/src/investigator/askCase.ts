/**
 * Read-only Q&A over a case packet (Plan 1 F3).
 * Tools never write; never open web search; never change the verdict.
 */

import { chat } from "../llm/client";
import { resolveIncident } from "../ens/resolve";
import { getLatestIncidentByTarget } from "../registry/client";
import { isRegistryDeployed } from "../registry/remember";
import { listAllIncidents } from "../incidents/index";

export type AskPacket = {
  address: string;
  status?: string | null;
  confidence?: number | null;
  signals?: Array<{ id: string; class?: string; detail?: string }>;
  evidence?: Array<{
    id: string;
    claim?: string;
    protocol?: string;
    kind?: string;
    txHash?: string;
    amountUSD?: number;
  }>;
  explanation?: string | null;
  threatTypes?: string[];
  rulesVersion?: string | null;
  evidenceHash?: string | null;
  atomicTx?: string | null;
  protocols?: string | null;
};

export type AskToolTrace = {
  name: string;
  args: Record<string, unknown>;
  summary: string;
};

export type AskCaseResult = {
  answer: string;
  toolTrace: AskToolTrace[];
  model: string | null;
  mode: "llm+tools" | "deterministic";
};

async function runTool(
  name: string,
  args: Record<string, unknown>,
  packet: AskPacket,
): Promise<AskToolTrace & { result: unknown }> {
  const addr = packet.address.toLowerCase();

  if (name === "graph_tx") {
    const tx = String(args.txHash ?? packet.atomicTx ?? "").toLowerCase();
    const rows = (packet.evidence ?? []).filter(
      (e) => e.txHash?.toLowerCase() === tx,
    );
    return {
      name: "graph.tx",
      args: { txHash: tx },
      summary: `${rows.length} rows for ${tx.slice(0, 10)}…`,
      result: { txHash: tx, rows },
    };
  }

  if (name === "graph_events") {
    const byProtocol = new Map<string, number>();
    const byKind = new Map<string, number>();
    for (const e of packet.evidence ?? []) {
      if (e.protocol) byProtocol.set(e.protocol, (byProtocol.get(e.protocol) ?? 0) + 1);
      if (e.kind) byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
    }
    return {
      name: "graph.events",
      args: {},
      summary: `${packet.evidence?.length ?? 0} rows · ${byProtocol.size} protocols`,
      result: {
        rowCount: packet.evidence?.length ?? 0,
        byProtocol: Object.fromEntries(byProtocol),
        byKind: Object.fromEntries(byKind),
        signals: packet.signals ?? [],
      },
    };
  }

  if (name === "registry_lookup" || name === "ens_records") {
    const resolved = await resolveIncident(addr, {
      keys: [
        "saviours.status",
        "saviours.threat",
        "saviours.confidence",
        "saviours.evidenceHash",
        "saviours.atomicTx",
        "saviours.protocols",
        "saviours.plainVerdict",
        "saviours.investigator",
        "saviours.dispute",
        "saviours.rulesVersion",
      ],
    });
    let registry: unknown = null;
    if (isRegistryDeployed("sepolia")) {
      try {
        registry = await getLatestIncidentByTarget(
          1,
          addr as `0x${string}`,
          "sepolia",
        );
      } catch {
        registry = null;
      }
    }
    return {
      name: name === "ens_records" ? "ens.records" : "registry.lookup",
      args: { address: addr },
      summary: resolved.hit
        ? `hit · status=${resolved.records["saviours.status"] ?? "?"}`
        : "no ENS hit",
      result: {
        ensName: resolved.ensName,
        hit: resolved.hit,
        source: resolved.source,
        records: resolved.records,
        registry,
      },
    };
  }

  if (name === "registry_related") {
    const list = await listAllIncidents();
    const peers = list.incidents
      .filter((i) => i.address !== addr)
      .filter(
        (i) =>
          i.ensStatus === "TAINTED" ||
          i.ensStatus === "WATCH" ||
          i.expectedStatus === "TAINTED",
      )
      .slice(0, 8)
      .map((i) => ({
        address: i.address,
        label: i.label,
        status: i.ensStatus || i.expectedStatus,
        proof: i.proof,
      }));
    return {
      name: "registry.related",
      args: { address: addr },
      summary: `${peers.length} related named cases`,
      result: { peers },
    };
  }

  if (name === "fingerprint_match") {
    const hash = (packet.evidenceHash ?? "").toLowerCase();
    const list = await listAllIncidents();
    // Without per-incident evidenceHash in list, match via ENS resolve batch is heavy;
    // report packet hash + whether subject is named.
    const self = list.incidents.find((i) => i.address === addr);
    return {
      name: "fingerprint.match",
      args: { evidenceHash: hash || null },
      summary: hash
        ? `packet hash ${hash.slice(0, 12)}… · subject ${self ? "named" : "unnamed"}`
        : "no evidenceHash in packet",
      result: {
        evidenceHash: hash || null,
        subjectNamed: Boolean(self),
        subjectStatus: self?.ensStatus ?? null,
        note: "Full cross-case hash index is post-film; this checks packet + subject naming.",
      },
    };
  }

  return {
    name,
    args,
    summary: "unknown tool",
    result: { error: `Unknown tool ${name}` },
  };
}

function deterministicAnswer(
  question: string,
  packet: AskPacket,
  traces: AskToolTrace[],
): string {
  const q = question.toLowerCase();
  const ids = new Set((packet.signals ?? []).map((s) => s.id));
  const status = packet.status ?? "UNKNOWN";

  if (q.includes("watch") || q.includes("tainted")) {
    if (ids.has("FLASHLOAN_ONE_SHOT") && ids.has("ATOMIC_MULTI_PROTOCOL")) {
      return `Status is ${status} because FLASHLOAN_ONE_SHOT ∧ ATOMIC_MULTI_PROTOCOL fired — a one-shot flashloan funded activity across multiple protocols in the same transaction. BOT_PROFILE alone cannot mint TAINTED; this path can. The model does not decide the verdict.`;
    }
    if (ids.has("BOT_PROFILE")) {
      return `Status is ${status} (WATCH ceiling). BOT_PROFILE means high flashloan volume without an atomic multi-protocol one-shot. Amplifier-only signals cannot reach TAINTED.`;
    }
    return `Status is ${status}. Rule paths use only the signals in this packet; AI cannot raise the ceiling.`;
  }
  if (q.includes("atomic") || q.includes("transaction") || q.includes("tx")) {
    const tx = packet.atomicTx;
    if (tx) {
      return `Atomic transaction ${tx}. Rows sharing that hash across protocols are what ATOMIC_MULTI_PROTOCOL means. See tool trace for graph.tx.`;
    }
    return `No atomicTx is attached to this packet. Check Graph evidence for shared tx hashes across protocols.`;
  }
  if (q.includes("protocol")) {
    return packet.protocols
      ? `Protocols on this finding: ${packet.protocols}.`
      : `Packet lists ${(packet.evidence ?? []).map((e) => e.protocol).filter(Boolean).slice(0, 8).join(", ") || "no protocol labels"}.`;
  }
  if (q.includes("against") || q.includes("malicious") || q.includes("benign")) {
    if (ids.has("BOT_PROFILE") && !ids.has("ATOMIC_MULTI_PROTOCOL")) {
      return `Against malice-as-TAINTED: repeated flashloans look bot-like / arb-shaped, not a single atomic drain. That is why the ceiling is WATCH, not TAINTED.`;
    }
    return `Counters in this packet: look for missing ATOMIC_MULTI_PROTOCOL, repeated activity (BOT_PROFILE), or empty Graph coverage. Absence of a name never means endorsed SAFE.`;
  }
  if (q.includes("hash") || q.includes("fingerprint") || q.includes("seen")) {
    return packet.evidenceHash
      ? `Packet evidenceHash is ${packet.evidenceHash}. Tool fingerprint.match reports whether this subject is already named; a full cross-case hash index is post-film.`
      : `No evidenceHash in packet yet.`;
  }
  if (q.includes("how") || q.includes("work")) {
    return (
      packet.explanation?.slice(0, 500) ||
      packet.signals?.map((s) => `${s.id}: ${s.detail}`).join(" · ") ||
      "Insufficient packet detail."
    );
  }
  return (
    packet.explanation?.slice(0, 400) ||
    `Status ${status}. Signals: ${(packet.signals ?? []).map((s) => s.id).join(", ") || "none"}. Tools used: ${traces.map((t) => t.name).join(" · ") || "none"}.`
  );
}

function pickToolsForQuestion(question: string, packet: AskPacket): string[] {
  const q = question.toLowerCase();
  const tools: string[] = ["graph_events"];
  if (q.includes("atomic") || q.includes("tx") || q.includes("transaction") || packet.atomicTx) {
    tools.push("graph_tx");
  }
  if (q.includes("protocol")) tools.push("graph_events");
  if (q.includes("ens") || q.includes("record") || q.includes("name")) {
    tools.push("ens_records");
  }
  if (q.includes("related") || q.includes("peer") || q.includes("seen")) {
    tools.push("registry_related");
  }
  if (q.includes("hash") || q.includes("fingerprint")) {
    tools.push("fingerprint_match");
  }
  if (q.includes("registry") || q.includes("lookup") || q.includes("status")) {
    tools.push("registry_lookup");
  }
  // Always include registry_lookup once for memory context
  if (!tools.includes("registry_lookup")) tools.push("registry_lookup");
  return [...new Set(tools)].slice(0, 4);
}

/**
 * Answer a question about this finding. Prefer LLM+tools; fall back to
 * deterministic packet answers with the same tool traces if AI is unavailable.
 */
export async function askAboutCase(input: {
  question: string;
  packet: AskPacket;
}): Promise<AskCaseResult> {
  const question = input.question.trim().slice(0, 500);
  if (!question) {
    return {
      answer: "Ask a question about this finding.",
      toolTrace: [],
      model: null,
      mode: "deterministic",
    };
  }

  const toolNames = pickToolsForQuestion(question, input.packet);
  const toolTrace: AskToolTrace[] = [];
  const toolResults: Array<{ name: string; result: unknown }> = [];

  for (const name of toolNames) {
    const args: Record<string, unknown> =
      name === "graph_tx"
        ? { txHash: input.packet.atomicTx ?? "" }
        : {};
    const ran = await runTool(name, args, input.packet);
    toolTrace.push({
      name: ran.name,
      args: ran.args,
      summary: ran.summary,
    });
    toolResults.push({ name: ran.name, result: ran.result });
  }

  try {
    const system = `You are SAVIOURS case Q&A. Answer ONLY from the case packet and tool results.
Rules:
- Never change or propose writing a verdict. Code already decided status=${input.packet.status ?? "?"}.
- Never invent fund flows, counterparties, or protocols not in the packet/tools.
- Cite signal ids and tx hashes when relevant.
- Keep answer under 180 words.
- If evidence is thin, say so.`;

    const user = JSON.stringify({
      question,
      packet: {
        address: input.packet.address,
        status: input.packet.status,
        signals: input.packet.signals,
        threatTypes: input.packet.threatTypes,
        atomicTx: input.packet.atomicTx,
        protocols: input.packet.protocols,
        evidenceHash: input.packet.evidenceHash,
        explanation: input.packet.explanation?.slice(0, 600),
        evidenceSample: (input.packet.evidence ?? []).slice(0, 12),
      },
      toolResults,
    });

    const result = await chat({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      toolChoice: "none",
    });

    return {
      answer:
        result.message.content?.trim() ||
        deterministicAnswer(question, input.packet, toolTrace),
      toolTrace,
      model: result.model,
      mode: "llm+tools",
    };
  } catch {
    return {
      answer: deterministicAnswer(question, input.packet, toolTrace),
      toolTrace,
      model: null,
      mode: "deterministic",
    };
  }
}
