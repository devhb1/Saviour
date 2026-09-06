/**
 * Load secrets from repo-root `.env` for scripts and Next route handlers.
 * Never commit `.env`. Prefer GRAPH_API_KEY (query key) and OPEN_AI_API_KEY.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let loaded = false;

function candidateEnvPaths(): string[] {
  const paths: string[] = [];
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    paths.push(resolve(here, "../../../../.env"));
  } catch {
    // ignore — import.meta.url may be unavailable in some bundles
  }
  const cwd = process.cwd();
  paths.push(resolve(cwd, ".env"));
  paths.push(resolve(cwd, "../../.env"));
  paths.push(resolve(cwd, "../.env"));
  return paths;
}

function applyEnvFile(envPath: string): void {
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env) || !process.env[key]) {
      process.env[key] = value;
    }
  }
}

/** Load repo-root `.env` once (server-side / scripts only). */
export function loadRootEnv(): void {
  if (loaded) return;
  for (const envPath of candidateEnvPaths()) {
    if (existsSync(envPath)) {
      applyEnvFile(envPath);
      loaded = true;
      return;
    }
  }
  loaded = true;
}

export function requireEnv(name: string): string {
  loadRootEnv();
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is missing. Set it in the repo-root .env`);
  }
  return value;
}

/** Accept AI_API_KEY, OPEN_AI_API_KEY, or OPENAI_API_KEY. */
export function requireAiApiKey(): string {
  loadRootEnv();
  const value =
    process.env.AI_API_KEY?.trim() ||
    process.env.OPEN_AI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();
  if (!value) {
    throw new Error(
      "OpenAI key missing. Set AI_API_KEY or OPEN_AI_API_KEY in the repo-root .env",
    );
  }
  return value;
}
