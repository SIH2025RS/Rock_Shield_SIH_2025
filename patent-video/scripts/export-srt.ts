/**
 * Subtitle files for the master video, paged exactly like the on-screen captions.
 *   npx tsx scripts/export-srt.ts   → out/RockShield_Patent_Claims.en.srt and .vtt
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { paginate } from "../src/lib/captions";
import { CHAPTER_IDS, TRANSITION, chapterTiming } from "../src/lib/timing";

const FPS = 30;
const ROOT = join(__dirname, "..");

const stamp = (frame: number, sep: string) => {
  const ms = Math.round((frame / FPS) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms % 1000, 3)}`;
};

const cues: { from: number; to: number; text: string }[] = [];
let offset = 0;
CHAPTER_IDS.forEach((id, i) => {
  const t = chapterTiming(id);
  for (const p of paginate(t.words)) cues.push({ from: offset + p.from, to: offset + p.to, text: p.text.join("\n") });
  offset += t.frames - (i < CHAPTER_IDS.length - 1 ? TRANSITION : 0);
});

const srt = cues.map((c, i) => `${i + 1}\n${stamp(c.from, ",")} --> ${stamp(c.to, ",")}\n${c.text}\n`).join("\n");
const vtt = "WEBVTT\n\n" + cues.map((c) => `${stamp(c.from, ".")} --> ${stamp(c.to, ".")}\n${c.text}\n`).join("\n");
writeFileSync(join(ROOT, "out", "RockShield_Patent_Claims.en.srt"), srt);
writeFileSync(join(ROOT, "out", "RockShield_Patent_Claims.en.vtt"), vtt);
console.log(`${cues.length} cues · ends ${stamp(offset, ".")}`);
