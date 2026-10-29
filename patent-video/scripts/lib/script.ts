/**
 * Parse content/script.md into chapters with spoken text, beat positions and the pronunciation
 * lexicon. Shared by the scratch voice, the Google TTS step and caption alignment.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const ROOT = resolve(__dirname, "..", "..");

export type Beat = { name: string; word: number };
export type Chapter = {
  id: string;
  title: string;
  targetSeconds: number;
  /** Display text (what captions show), beats removed */
  text: string;
  words: string[];
  beats: Beat[];
};

export type Lexicon = [written: string, spoken: string][];

export function loadScript(): { chapters: Chapter[]; lexicon: Lexicon } {
  const md = readFileSync(join(ROOT, "content", "script.md"), "utf8");
  const lexicon: Lexicon = [];
  let inLexicon = false;
  for (const line of md.split("\n")) {
    if (line.startsWith("Pronunciation")) inLexicon = true;
    else if (inLexicon && line.startsWith("---")) break;
    const m = inLexicon && line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);
    if (m && m[1] !== "Written" && !m[1].startsWith("-")) lexicon.push([m[1], m[2]]);
  }
  // Longer forms first so "LoRaWAN" is replaced before "LoRa"
  lexicon.sort((a, b) => b[0].length - a[0].length);

  const chapters: Chapter[] = [];
  for (const block of md.split(/^## /m).slice(1)) {
    const [header, ...rest] = block.split("\n");
    const hm = header.match(/^(ch\d+)\s*·\s*(.+)$/);
    if (!hm) continue;
    const body = rest.join("\n");
    const target = Number(body.match(/target\s+(\d+)\s*s/)?.[1] ?? 0);
    const prose = body
      .replace(/<!--[\s\S]*?-->/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ");
    const words: string[] = [];
    const beats: Beat[] = [];
    for (const token of prose.split(/\s+/)) {
      const b = token.match(/^\[\[beat:([\w-]+)\]\]$/);
      if (b) beats.push({ name: b[1], word: words.length });
      else if (token) words.push(token);
    }
    chapters.push({ id: hm[1], title: hm[2].trim(), targetSeconds: target, text: words.join(" "), words, beats });
  }
  return { chapters, lexicon };
}

/** Text as it should be spoken: lexicon applied, symbols the voices stumble on removed */
export function spokenText(text: string, lexicon: Lexicon) {
  let out = text;
  for (const [written, spoken] of lexicon) {
    const escaped = written.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`(?<![\\w-])${escaped}(?![\\w])`, "g"), spoken);
  }
  return out.replace(/–/g, " ").replace(/\s+/g, " ").trim();
}
