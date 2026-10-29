/**
 * Voice audition: the same passage in several free-tier en-IN voices → out/voice-samples/*.m4a
 *   npx tsx scripts/voice-samples.ts            # Chirp 3 HD (expressive)
 *   npx tsx scripts/voice-samples.ts --neural2  # Neural2
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, loadScript, spokenText } from "./lib/script";
import { escapeXml, synthesize, synthesizeChirp, usageThisMonth } from "./lib/google-tts";

const NEURAL2 = ["en-IN-Neural2-A", "en-IN-Neural2-B", "en-IN-Neural2-C", "en-IN-Neural2-D"];
const CHIRP = ["en-IN-Chirp3-HD-Charon", "en-IN-Chirp3-HD-Iapetus", "en-IN-Chirp3-HD-Kore", "en-IN-Chirp3-HD-Sulafat"];
const OUT = join(ROOT, "out", "voice-samples");

async function main() {
  const { chapters, lexicon } = loadScript();
  const open = chapters.find((c) => c.id === "ch00")!.words.slice(19).join(" "); // "In ground like this…"
  const claim7 = chapters.find((c) => c.id === "ch08")!.words.slice(0, 58).join(" ");
  mkdirSync(OUT, { recursive: true });

  const useNeural2 = process.argv.includes("--neural2");
  for (const voice of useNeural2 ? NEURAL2 : CHIRP) {
    let wav: Buffer;
    if (useNeural2) {
      const sentences = spokenText(claim7, lexicon).split(/(?<=[.:])\s+/);
      wav = (await synthesize(`<speak>${sentences.map(escapeXml).join('<break time="350ms"/>')}</speak>`, voice, 0.95)).wav;
    } else {
      wav = await synthesizeChirp(`${spokenText(open, lexicon)} [pause] ${spokenText(claim7, lexicon)}`, voice, 1.0);
    }
    const tmp = join(OUT, `${voice}.wav`);
    writeFileSync(tmp, wav);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", tmp, "-c:a", "aac", "-b:a", "160k", join(OUT, `${voice}.m4a`)]);
    rmSync(tmp);
    console.log(`  out/voice-samples/${voice}.m4a`);
  }
  console.log(`Characters used this month: ${usageThisMonth()} (safety cap 250,000; free allowance 1,000,000)`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
