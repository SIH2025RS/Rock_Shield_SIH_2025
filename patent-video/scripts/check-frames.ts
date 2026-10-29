/**
 * Smoke test: bundle once, render three frames from every chapter of the master at half size,
 * and tile them into contact sheets (out/check/sheet-*.jpg). Catches runtime errors fast.
 *   npx tsx scripts/check-frames.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import timing from "../src/generated/timing.json";

const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "out", "check");
const LEAD = 30, TRANSITION = 16, FPS = 30;
const TAIL: Record<string, number> = { ch00: 210, ch20: 360 };

async function main() {
  mkdirSync(OUT, { recursive: true });
  const serveUrl = await bundle({ entryPoint: join(ROOT, "src", "index.ts") });
  const composition = await selectComposition({ serveUrl, id: "PatentVideo" });
  let start = 0;
  const files: string[] = [];
  for (const [i, c] of timing.chapters.entries()) {
    const frames = LEAD + Math.round(c.duration * FPS) + (TAIL[c.id] ?? 52);
    for (const f of [0.22, 0.55, 0.86]) {
      const frame = start + Math.floor(frames * f);
      const file = join(OUT, `${c.id}-${Math.round(f * 100)}.jpg`);
      await renderStill({ composition, serveUrl, output: file, frame, scale: 0.5, imageFormat: "jpeg", jpegQuality: 80 });
      files.push(file);
    }
    console.log(`  ${c.id} ok`);
    start += frames - (i < timing.chapters.length - 1 ? TRANSITION : 0);
  }
  // 3 frames per chapter → sheets of 7 chapters (3 columns x 7 rows)
  for (let s = 0; s * 21 < files.length; s++) {
    const chunk = files.slice(s * 21, s * 21 + 21);
    const inputs = chunk.flatMap((f) => ["-i", f]);
    const layout = chunk.map((_, k) => `${(k % 3) * 960}_${Math.floor(k / 3) * 540}`).join("|");
    execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", `xstack=inputs=${chunk.length}:layout=${layout}:fill=black,scale=1440:-1`, "-q:v", "4", join(OUT, `sheet-${s + 1}.jpg`)]);
  }
  console.log("contact sheets in out/check/");
}

main().catch((e) => {
  console.error(e.stack ?? e.message);
  process.exit(1);
});
