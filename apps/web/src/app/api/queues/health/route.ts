import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

function loadCsv() {
  try {
    const path = join(process.cwd(), "../../fixtures/queues/initial-5.csv");
    const text = readFileSync(path, "utf8").trim();
    const [header, ...lines] = text.split("\n");
    const cols = header.split(",");
    return lines.filter(Boolean).map((line) => {
      const parts = line.split(",");
      const row: Record<string, string> = {};
      cols.forEach((c, i) => {
        row[c] = parts[i] ?? "";
      });
      return {
        protocol: row.protocol,
        queue: row.queue,
        chainId: Number(row.chainId),
        authorityTarget: row.authorityTarget,
        adapter: row.adapter,
      };
    });
  } catch {
    return [];
  }
}

export async function GET() {
  const queues = loadCsv();
  return NextResponse.json({
    queues,
    health: {
      lastProcessedBlock: null,
      stale: true,
      updatedAt: null,
      note: "Allowlist includes real Term Prop5 addresses. Continuous writes pending Base Sepolia funding + HyperSync.",
    },
  });
}
