/**
 * Temporary narration with the built-in macOS Indian-English voice, used to time the script and
 * the animation before the Google Cloud voice is generated. Writes public/audio/chXX.wav.
 *   npx tsx scripts/scratch-vo.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ROOT, loadScript, spokenText } from "./lib/script";

const VOICE = process.env.SCRATCH_VOICE ?? "Rishi";
const RATE = process.env.SCRATCH_RATE ?? "160";
const OUT = join(ROOT, "public", "audio");

function duration(file: string) {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
}

const { chapters, lexicon } = loadScript();
mkdirSync(OUT, { recursive: true });
let total = 0;
let totalTarget = 0;
let totalWords = 0;
for (const ch of chapters) {
  const aiff = join(OUT, `${ch.id}.aiff`);
  const wav = join(OUT, `${ch.id}.wav`);
  execFileSync("say", ["-v", VOICE, "-r", RATE, "-o", aiff, spokenText(ch.text, lexicon)]);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", aiff, "-ar", "48000", "-ac", "1", wav]);
  rmSync(aiff);
  const d = duration(wav);
  total += d;
  totalTarget += ch.targetSeconds;
  totalWords += ch.words.length;
  console.log(`${ch.id}  ${d.toFixed(1).padStart(5)} s  (target ${String(ch.targetSeconds).padStart(3)} s, ${String(ch.words.length).padStart(3)} words)  ${ch.title}`);
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
console.log(`\nTotal narration ${fmt(total)} (target ${fmt(totalTarget)}), ${totalWords} words, voice ${VOICE} @ ${RATE} wpm`);
