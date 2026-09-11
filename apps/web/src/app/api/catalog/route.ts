import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Candidate = {
  n: number;
  id: string;
  address: string;
  status: string;
  class: string;
  label: string;
  proof: string;
  tier?: string;
  source_url?: string;
};

/** Fleet UI buckets — map raw catalog classes into judge-facing categories. */
const FLEET_CLASSES: {
  id: string;
  label: string;
  hint: string;
  match: (c: Candidate) => boolean;
}[] = [
  {
    id: "flashloan",
    label: "Flashloan / atomic",
    hint: "one-shot · multi-protocol",
    match: (c) =>
      /FLASHLOAN|ATOMIC|DRAINER/i.test(c.class) && c.status !== "REJECT",
  },
  {
    id: "bridge",
    label: "Bridge exploits",
    hint: "access control · init bypass",
    match: (c) => /BRIDGE/i.test(c.class),
  },
  {
    id: "reentrancy",
    label: "Reentrancy",
    hint: "classic class",
    match: (c) => /REENTRANCY/i.test(c.class),
  },
  {
    id: "oracle",
    label: "Oracle / other DeFi",
    hint: "oracle · malicious contract",
    match: (c) => /ORACLE|MALICIOUS|DEFI_EXPLOIT/i.test(c.class),
  },
  {
    id: "hops",
    label: "Fund-flow hops",
    hint: "WATCH co-occurrence theater",
    match: (c) => /FUND_FLOW|REGISTRY_COOCCUR/i.test(c.class),
  },
  {
    id: "bots",
    label: "Bots",
    hint: "WATCH · never TAINTED",
    match: (c) => /BOT/i.test(c.class),
  },
  {
    id: "clean",
    label: "Clean contrast",
    hint: "SAFE · never named",
    match: (c) =>
      c.status === "SAFE" ||
      /CLEAN|TOKEN_CONTRACT|CEX|STAKING|DAO|FOUNDATION|LENDING_POOL|DEX_ROUTER/i.test(
        c.class,
      ),
  },
  {
    id: "never",
    label: "Never-name",
    hint: "REJECT · victims · celebrities",
    match: (c) =>
      c.status === "REJECT" ||
      c.proof === "reject" ||
      /VICTIM|CELEBRITY/i.test(c.class),
  },
];

function loadCatalog(): Candidate[] {
  const cwd = process.cwd();
  const roots = [
    join(cwd, "evals", "registry-candidate-catalog-100.json"),
    join(cwd, "apps", "web", "evals", "registry-candidate-catalog-100.json"),
    join(cwd, "..", "evals", "registry-candidate-catalog-100.json"),
    join(cwd, "..", "..", "evals", "registry-candidate-catalog-100.json"),
  ];
  for (const p of roots) {
    try {
      const raw = JSON.parse(readFileSync(p, "utf8")) as {
        candidates?: Candidate[];
      };
      if (Array.isArray(raw.candidates) && raw.candidates.length) {
        return raw.candidates;
      }
    } catch {
      // try next
    }
  }
  return [];
}

/**
 * GET /api/catalog?class=flashloan&limit=10
 * Fleet Run inventory — honest categories from the 100-candidate catalog.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const classId = (url.searchParams.get("class") || "").trim().toLowerCase();
  const limit = Math.min(
    25,
    Math.max(1, Number(url.searchParams.get("limit") || 10) || 10),
  );

  const candidates = loadCatalog();
  if (!candidates.length) {
    return NextResponse.json(
      {
        error:
          "Catalog not found — ensure apps/web/evals/registry-candidate-catalog-100.json exists",
      },
      { status: 404 },
    );
  }

  const classes = FLEET_CLASSES.map((fc) => {
    const rows = candidates.filter(fc.match);
    const seen = new Set<string>();
    const unique = rows.filter((r) => {
      const a = r.address.toLowerCase();
      if (seen.has(a)) return false;
      seen.add(a);
      return true;
    });
    return {
      id: fc.id,
      label: fc.label,
      hint: fc.hint,
      count: unique.length,
    };
  }).filter((c) => c.count > 0);

  if (!classId) {
    return NextResponse.json({
      total: candidates.length,
      classes,
      note: "Every row is for live Shield. Misses stay misses. Graph-verified only when proof=graph.",
    });
  }

  const fc = FLEET_CLASSES.find((c) => c.id === classId);
  if (!fc) {
    return NextResponse.json(
      { error: `Unknown class ${classId}`, classes },
      { status: 400 },
    );
  }

  const seen = new Set<string>();
  const rows = candidates
    .filter(fc.match)
    .filter((r) => {
      const a = r.address.toLowerCase();
      if (seen.has(a)) return false;
      seen.add(a);
      return true;
    })
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      address: r.address.toLowerCase(),
      status: r.status,
      class: r.class,
      label: r.label,
      proof: r.proof,
      tier: r.tier ?? null,
      source_url: r.source_url ?? null,
      graphVerified: r.proof === "graph",
    }));

  return NextResponse.json({
    class: { id: fc.id, label: fc.label, hint: fc.hint },
    count: rows.length,
    rows,
    note: "Live Shield these. Catalog status ≠ live Graph detection unless proof=graph.",
  });
}
