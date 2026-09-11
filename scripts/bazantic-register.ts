/**
 * Bazantic register helper — smoke-tests OpenAPI + prints gateway commands.
 *
 * Usage: pnpm bazantic:register
 *
 * Accepts BAZANTIC_API_KEY or BAZENTI_API_KEY (typo alias).
 * Gateway create still needs `bazantic login` (browser device-code).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv() {
  const p = resolve(process.cwd(), ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env) || !process.env[k]) process.env[k] = v;
  }
}

loadDotEnv();

const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";

function apiKey(): string | null {
  return (
    process.env.BAZANTIC_API_KEY?.trim() ||
    process.env.BAZENTI_API_KEY?.trim() ||
    null
  );
}

function publicBase(): string {
  const raw =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";
  return raw.replace(/\/$/, "");
}

async function main() {
  const key = apiKey();
  const base = publicBase();
  const localSpec = resolve(
    process.cwd(),
    "apps/web/public/openapi-saviours.json",
  );

  console.log("bazantic:register — SAVIOURS agent gateway helper\n");

  if (!existsSync(localSpec)) {
    throw new Error(`Missing OpenAPI at ${localSpec}`);
  }
  const spec = JSON.parse(readFileSync(localSpec, "utf8")) as {
    info?: { title?: string };
    paths?: Record<string, unknown>;
  };
  console.log("✓ OpenAPI local:", localSpec);
  console.log("  title:", spec.info?.title);
  console.log("  paths:", Object.keys(spec.paths ?? {}).join(", "));

  if (key) {
    console.log(
      `✓ API key present (${key.startsWith("eyJ") ? "JWT" : "token"}, len=${key.length})`,
    );
    console.log(
      "  note: gateway add uses bazantic login (browser); key is for account/dashboard attribution",
    );
  } else {
    console.log("⚠ No BAZANTIC_API_KEY / BAZENTI_API_KEY in env");
  }

  if (!base) {
    console.log(
      "\n⚠ PUBLIC_APP_URL unset — set to your Vercel URL before gateway add",
    );
    console.log("  example: PUBLIC_APP_URL=https://www.saviours.xyz");
  } else {
    const specUrl = `${base}/openapi-saviours.json`;
    console.log("\n→ Public base:", base);
    console.log("→ Spec URL:", specUrl);
    try {
      const res = await fetch(specUrl, { signal: AbortSignal.timeout(12_000) });
      console.log(`  GET openapi → HTTP ${res.status}`);
      if (!res.ok) {
        console.log("  Deploy / sync public/openapi-saviours.json then retry.");
      }
    } catch (e) {
      console.log(
        "  fetch failed:",
        e instanceof Error ? e.message : String(e),
      );
    }

    // Smoke Shield on public host (free path)
    try {
      const res = await fetch(`${base}/api/shield/check`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 1,
          address: ATTACK_1,
          registryNetwork: "sepolia",
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const body = (await res.json()) as {
        check?: { decision?: string; source?: string };
        error?: string;
      };
      console.log(`  POST shield/check ATTACK-1 → HTTP ${res.status}`);
      if (body.check) {
        console.log(
          `  decision=${body.check.decision} source=${body.check.source}`,
        );
      } else if (body.error) {
        console.log("  error:", body.error);
      }
    } catch (e) {
      console.log(
        "  shield smoke failed:",
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  console.log(`
Next steps
----------
1. Ensure PUBLIC_APP_URL points at live deploy with /openapi-saviours.json
2. Install CLI (GitHub Packages auth required for @bazantic/bazantic-cli)
3. Register:

   bazantic login
   bazantic gateway add \\
     --spec-url "${base || "https://YOUR_HOST"}/openapi-saviours.json" \\
     --endpoint "${base || "https://YOUR_HOST"}" \\
     --name "SAVIOURS" \\
     --status active

4. Paste Recipe from docs/recipes/saviours-agent-shield.md
5. Screen-record: raw OpenAPI vs Recipe → ATTACK-1 BLOCK via Shield

Pricing: shield = free · investigate = paid miss · Graph+ENS remain primary tracks.
`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
