import timing from "../generated/timing.json";
import { VIDEO } from "../theme";

/** Frames before the narration starts in each chapter (lets the first shot settle) */
export const LEAD = 30;
/** Frames after the narration ends; the title and credits hold longer */
const TAIL: Record<string, number> = { ch00: 210, ch20: 360 };
const DEFAULT_TAIL = 52;
/** Cross-fade between chapters */
export const TRANSITION = 16;

export type TimedWord = { w: string; from: number; to: number };

export type ChapterTiming = {
  id: string;
  title: string;
  audio: string;
  frames: number;
  /** Frame where the narration ends */
  voiceEnd: number;
  words: TimedWord[];
  /** Frame of a [[beat:name]] marker; throws on a typo so a missed cue can't slip through */
  b: (name: string) => number;
};

const f = (seconds: number) => Math.round(seconds * VIDEO.fps);

export function chapterTiming(id: string): ChapterTiming {
  const c = timing.chapters.find((ch) => ch.id === id);
  if (!c) throw new Error(`No timing for ${id}; run scripts/align-captions.ts`);
  const beats = c.beats as unknown as Record<string, number>;
  const voiceEnd = LEAD + f(c.duration);
  return {
    id,
    title: c.title,
    audio: c.audio,
    frames: voiceEnd + (TAIL[id] ?? DEFAULT_TAIL),
    voiceEnd,
    words: c.words.map((w) => ({ w: w.w, from: LEAD + f(w.s), to: LEAD + f(w.e) })),
    b: (name: string) => {
      if (!(name in beats)) throw new Error(`${id}: unknown beat "${name}"`);
      return LEAD + f(beats[name]);
    },
  };
}

export const CHAPTER_IDS = timing.chapters.map((c) => c.id);
export const totalFrames = () => CHAPTER_IDS.reduce((sum, id) => sum + chapterTiming(id).frames, 0) - TRANSITION * (CHAPTER_IDS.length - 1);
