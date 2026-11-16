import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type QueueRow = {
  protocol: string;
  queue: string;
  chainId: number;
  authorityTarget: string;
  adapter: string;
  notes?: string;
};

export function loadInitialQueues(csvPath?: string): QueueRow[] {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
  const path = csvPath ?? join(root, "fixtures/queues/initial-5.csv");
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
      notes: row.notes,
    };
  });
}
