/**
 * Minimal Google Cloud Text-to-Speech client with a hard free-tier guard.
 *
 * Only voice types with a free monthly allowance are allowed (Chirp 3 HD, WaveNet, Neural2: 1M
 * characters; Standard: 4M). Every request is logged in
 * out/tts-usage.json and the script refuses to send anything that would take this month past
 * MONTHLY_CAP characters, a quarter of the smallest free allowance, so the project cannot be billed.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./script";

const MONTHLY_CAP = 250_000;
const LEDGER = join(ROOT, "out", "tts-usage.json");
const ALLOWED = /^en-IN-(Wavenet|Neural2|Standard)-[A-Z]$|^en-IN-Chirp3-HD-[A-Za-z]+$/;

function apiKey(): string {
  const file = join(ROOT, ".env.local");
  const line = existsSync(file) ? readFileSync(file, "utf8").split("\n").find((l) => l.startsWith("GOOGLE_TTS_API_KEY=")) : undefined;
  const key = line?.slice("GOOGLE_TTS_API_KEY=".length).trim();
  if (!key) throw new Error("GOOGLE_TTS_API_KEY missing in patent-video/.env.local");
  return key;
}

type Ledger = Record<string, { characters: number; requests: number }>;
const month = () => new Date().toISOString().slice(0, 7);
const readLedger = (): Ledger => (existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, "utf8")) : {});

export function usageThisMonth() {
  return readLedger()[month()]?.characters ?? 0;
}

function charge(characters: number) {
  const ledger = readLedger();
  const m = month();
  const used = ledger[m]?.characters ?? 0;
  if (used + characters > MONTHLY_CAP) {
    throw new Error(`Refusing: ${used + characters} characters this month would pass the ${MONTHLY_CAP} free-tier safety cap`);
  }
  ledger[m] = { characters: used + characters, requests: (ledger[m]?.requests ?? 0) + 1 };
  mkdirSync(join(ROOT, "out"), { recursive: true });
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + "\n");
}

export type Voice = { name: string; ssmlGender: string; naturalSampleRateHertz: number };

/** voices.list is not billed */
export async function listVoices(languageCode = "en-IN"): Promise<Voice[]> {
  const res = await fetch(`https://texttospeech.googleapis.com/v1/voices?languageCode=${languageCode}&key=${apiKey()}`);
  if (!res.ok) throw new Error(`voices.list ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { voices } = (await res.json()) as { voices: Voice[] };
  return voices.filter((v) => ALLOWED.test(v.name)).sort((a, b) => a.name.localeCompare(b.name));
}

export type Synthesis = { wav: Buffer; timepoints: { markName: string; timeSeconds: number }[] };

/** Synthesize SSML to 48 kHz LINEAR16 WAV with <mark> timepoints */
export async function synthesize(ssml: string, voice: string, speakingRate = 1): Promise<Synthesis> {
  if (!ALLOWED.test(voice)) throw new Error(`${voice} is not an allowed free-tier voice type`);
  if (Buffer.byteLength(ssml) > 5000) throw new Error(`SSML is ${Buffer.byteLength(ssml)} bytes; Google's limit is 5000`);
  charge(ssml.length);
  const res = await fetch(`https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { ssml },
      voice: { languageCode: "en-IN", name: voice },
      audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 48000, speakingRate },
      enableTimePointing: ["SSML_MARK"],
    }),
  });
  if (!res.ok) throw new Error(`synthesize ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { audioContent: string; timepoints?: { markName: string; timeSeconds: number }[] };
  return { wav: Buffer.from(body.audioContent, "base64"), timepoints: body.timepoints ?? [] };
}

/**
 * Chirp 3 HD: expressive voices that vary pace and stress on their own. They take plain text
 * or "markup" with [pause short] / [pause] / [pause long] tags and return no timepoints, so
 * word timing comes from alignment afterwards.
 */
export async function synthesizeChirp(markup: string, voice: string, speakingRate = 1): Promise<Buffer> {
  if (!/^en-IN-Chirp3-HD-/.test(voice)) throw new Error(`${voice} is not a Chirp 3 HD voice`);
  if (Buffer.byteLength(markup) > 5000) throw new Error(`Input is ${Buffer.byteLength(markup)} bytes; Google's limit is 5000`);
  charge(markup.length);
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { markup },
      voice: { languageCode: "en-IN", name: voice },
      audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 48000, speakingRate },
    }),
  });
  if (!res.ok) throw new Error(`synthesize ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(((await res.json()) as { audioContent: string }).audioContent, "base64");
}

export const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
