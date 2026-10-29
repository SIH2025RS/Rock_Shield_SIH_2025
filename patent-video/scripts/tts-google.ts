/**
 * Narrate every chapter of content/script.md with Google Cloud Chirp 3 HD (free tier) and write
 * public/audio/chXX.wav. Run scripts/align-captions.ts afterwards for word and beat timing.
 *   npx tsx scripts/tts-google.ts            # all chapters
 *   npx tsx scripts/tts-google.ts ch05 ch08  # only these (e.g. after editing their text)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Chapter, ROOT, loadScript, spokenText } from "./lib/script";
import { synthesizeChirp, usageThisMonth } from "./lib/google-tts";

export const VOICE = "en-IN-Chirp3-HD-Iapetus";
export const RATE = 1.0;
const OUT = join(ROOT, "public", "audio");

/** Spoken markup: lexicon applied, a short pause where a beat line ends a sentence */
export function markupFor(ch: Chapter, lexicon: ReturnType<typeof loadScript>["lexicon"]) {
  const cuts = [...ch.beats.map((b) => b.word), ch.words.length].filter((w, i, a) => a.indexOf(w) === i).sort((a, b) => a - b);
  const segments: string[] = [];
  let start = 0;
  for (const cut of cuts) {
    if (cut > start) segments.push(ch.words.slice(start, cut).join(" "));
    start = cut;
  }
  return segments
    .map((seg, i) => {
      const spoken = spokenText(seg, lexicon);
      const last = i === segments.length - 1;
      return last ? spoken : `${spoken}${/[.?!:]$/.test(seg) ? " [pause short]" : ""}`;
    })
    .join(" ");
}

async function main() {
  const only = process.argv.slice(2);
  const { chapters, lexicon } = loadScript();
  mkdirSync(OUT, { recursive: true });
  for (const ch of chapters) {
    if (only.length && !only.includes(ch.id)) continue;
    const wav = await synthesizeChirp(markupFor(ch, lexicon), VOICE, RATE);
    writeFileSync(join(OUT, `${ch.id}.wav`), wav);
    console.log(`  ${ch.id} ${ch.title}`);
  }
  console.log(`Characters used this month: ${usageThisMonth()} (safety cap 250,000; free allowance 1,000,000)`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
