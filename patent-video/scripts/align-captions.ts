/**
 * Word and beat timing for every chapter's narration (public/audio/chXX.wav).
 *
 * whisper.cpp (local, free) transcribes the audio; its words are aligned to the exact script words
 * so captions keep the script's spelling (XGBoost, Savitzky–Golay) even where the voice spelled a
 * term out. Unmatched words are interpolated between their matched neighbours.
 * Writes src/generated/timing.json.
 *   npx tsx scripts/align-captions.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { downloadWhisperModel, installWhisperCpp, toCaptions, transcribe } from "@remotion/install-whisper-cpp";
import { ROOT, loadScript, spokenText } from "./lib/script";

const WHISPER_VERSION = "1.5.5";
const MODEL = "small.en";
const WHISPER_DIR = join(ROOT, "whisper.cpp");
const TMP = join(ROOT, "out", "align");

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

type Timed = { start: number; end: number } | null;

/** Longest-common-subsequence alignment of two token lists; returns index pairs */
function lcs(a: string[], b: string[]): [number, number][] {
  const dp = Array.from({ length: a.length + 1 }, () => new Int32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] && a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] && a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

const duration = (file: string) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());

async function main() {
  await installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION, printOutput: false });
  await downloadWhisperModel({ model: MODEL, folder: WHISPER_DIR, printOutput: false });
  mkdirSync(TMP, { recursive: true });

  const { chapters, lexicon } = loadScript();
  const out = [];
  for (const ch of chapters) {
    const wav = join(ROOT, "public", "audio", `${ch.id}.wav`);
    const wav16 = join(TMP, `${ch.id}-16k.wav`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", wav, "-ar", "16000", "-ac", "1", wav16]);
    const json = await transcribe({ inputPath: wav16, whisperPath: WHISPER_DIR, whisperCppVersion: WHISPER_VERSION, model: MODEL, modelFolder: WHISPER_DIR, tokenLevelTimestamps: true, language: "en" });
    rmSync(wav16);

    // Whisper tokens → words (a token starting with a space begins a new word)
    const heard: { text: string; start: number; end: number }[] = [];
    for (const c of toCaptions({ whisperCppOutput: json }).captions) {
      if (!c.text.trim()) continue;
      if (c.text.startsWith(" ") || heard.length === 0) heard.push({ text: c.text.trim(), start: c.startMs / 1000, end: c.endMs / 1000 });
      else {
        heard[heard.length - 1].text += c.text;
        heard[heard.length - 1].end = c.endMs / 1000;
      }
    }

    // Spoken tokens with a pointer back to the script word they came from
    const spoken: { tok: string; word: number }[] = [];
    ch.words.forEach((w, i) => spokenText(w, lexicon).split(/\s+/).forEach((t) => spoken.push({ tok: norm(t), word: i })));
    const pairs = lcs(spoken.map((s) => s.tok), heard.map((h) => norm(h.text)));
    const times: Timed[] = spoken.map(() => null);
    for (const [si, hi] of pairs) times[si] = { start: heard[hi].start, end: heard[hi].end };

    // Interpolate gaps between matched neighbours
    const total = duration(wav);
    for (let i = 0; i < times.length; i++) {
      if (times[i]) continue;
      let j = i;
      while (j < times.length && !times[j]) j++;
      const from = i > 0 ? times[i - 1]!.end : 0;
      const to = j < times.length ? times[j]!.start : total;
      const n = j - i;
      for (let k = 0; k < n; k++) times[i + k] = { start: from + ((to - from) * k) / n, end: from + ((to - from) * (k + 1)) / n };
      i = j - 1;
    }

    const words = ch.words.map((w, i) => {
      const own = spoken.map((s, k) => (s.word === i ? times[k]! : null)).filter(Boolean) as { start: number; end: number }[];
      return { w, s: +own[0].start.toFixed(3), e: +own[own.length - 1].end.toFixed(3) };
    });
    const beats = Object.fromEntries(ch.beats.map((b) => [b.name, b.word < words.length ? words[b.word].s : +total.toFixed(3)]));
    const matched = pairs.length / spoken.length;
    out.push({ id: ch.id, title: ch.title, audio: `audio/${ch.id}.wav`, duration: +total.toFixed(3), words, beats });
    console.log(`  ${ch.id} ${total.toFixed(1).padStart(5)} s  matched ${(matched * 100).toFixed(0)}%  ${ch.title}`);
  }
  mkdirSync(join(ROOT, "src", "generated"), { recursive: true });
  writeFileSync(join(ROOT, "src", "generated", "timing.json"), JSON.stringify({ chapters: out }) + "\n");
  const sum = out.reduce((a, c) => a + c.duration, 0);
  console.log(`\nNarration total ${Math.floor(sum / 60)}:${String(Math.round(sum % 60)).padStart(2, "0")}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
