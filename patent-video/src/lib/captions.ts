import type { TimedWord } from "./timing";

export type Page = { text: string[]; from: number; to: number };

/** Group words into broadcast-style pages: up to two lines of ~44 characters, breaking at sentences */
export function paginate(words: TimedWord[]): Page[] {
  const pages: Page[] = [];
  let lines: string[] = [""];
  let start = words[0]?.from ?? 0;
  const flush = (nextFrom: number) => {
    if (lines.join("").trim()) pages.push({ text: lines.map((l) => l.trim()), from: start, to: nextFrom });
    lines = [""];
    start = nextFrom;
  };
  words.forEach((word, i) => {
    const cur = lines[lines.length - 1];
    if ((cur + " " + word.w).trim().length > 44) {
      if (lines.length === 2) flush(word.from);
      else lines.push("");
    }
    lines[lines.length - 1] = `${lines[lines.length - 1]} ${word.w}`;
    const next = words[i + 1];
    const sentenceEnd = /[.?!:]$/.test(word.w);
    const pageLen = lines.join(" ").length;
    if (next && sentenceEnd && pageLen > 28) flush(next.from);
  });
  const last = words[words.length - 1];
  if (last) flush(last.to + 12);
  return pages;
}
