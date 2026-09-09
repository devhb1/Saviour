/**
 * Copy runtime JSON into apps/web so Vercel works when Root Directory is apps/web
 * (cwd=/var/task) as well as monorepo-root deploys.
 *
 *   pnpm exec tsx scripts/sync-runtime-data.ts
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(root, "apps/web");

function copyFile(srcRel: string, destRel: string) {
  const src = join(root, srcRel);
  const dest = join(web, destRel);
  if (!existsSync(src)) {
    console.warn(`skip missing ${srcRel}`);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
  console.log(`copied ${srcRel} → apps/web/${destRel}`);
}

function copyDirJson(srcDir: string, destDir: string) {
  const src = join(root, srcDir);
  if (!existsSync(src)) {
    console.warn(`skip missing ${srcDir}`);
    return;
  }
  mkdirSync(join(web, destDir), { recursive: true });
  for (const name of readdirSync(src)) {
    if (!name.endsWith(".json")) continue;
    copyFile(`${srcDir}/${name}`, `${destDir}/${name}`);
  }
}

copyDirJson("deployments", "deployments");
copyFile("evals/seed-incidents.json", "evals/seed-incidents.json");
copyFile("evals/demo-targets.json", "evals/demo-targets.json");
console.log("sync-runtime-data ok");
