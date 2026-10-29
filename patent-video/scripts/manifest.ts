/**
 * List every file under public/ so components can check for optional assets (e.g. the college
 * emblem) at build time instead of failing on a missing staticFile at render time.
 *   npx tsx scripts/manifest.ts
 */
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const PUBLIC = join(ROOT, "public");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [relative(PUBLIC, full)];
  });
}

const files = walk(PUBLIC).filter((f) => !f.split("/").some((part) => part.startsWith("."))).sort();
mkdirSync(join(ROOT, "src", "generated"), { recursive: true });
writeFileSync(join(ROOT, "src", "generated", "manifest.json"), JSON.stringify({ files }, null, 1) + "\n");
console.log(`manifest: ${files.length} files`);
