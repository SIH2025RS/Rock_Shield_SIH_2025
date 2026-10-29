import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadTinos } from "@remotion/google-fonts/Tinos";

/*
 * Visual identity follows the RockShield web app (Tailwind slate palette, brand blue #4f6bff,
 * red-600 alerts, emerald for safe) and the line-art style of the patent's FIG. 1, so the video
 * reads as documentation of the real project rather than a generic animation.
 */

const body = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });
const mono = loadJetBrainsMono("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
// Metric-compatible with Times New Roman, the typeface of the filed Form 2 document
const doc = loadTinos("normal", { weights: ["400", "700"], subsets: ["latin"] });

export const FONT = {
  heading: body.fontFamily,
  body: body.fontFamily,
  mono: mono.fontFamily,
  doc: doc.fontFamily,
};

export const COLOR = {
  bg: "#0B1120",
  bgDeep: "#070B16",
  bgLift: "#0F172A", // slate-900
  panel: "rgba(15, 23, 42, 0.86)",
  panelSolid: "#111A2E",
  surface: "#1E293B", // slate-800
  line: "rgba(148, 163, 184, 0.16)",
  lineStrong: "rgba(148, 163, 184, 0.34)",
  text: "#F1F5F9", // slate-100
  dim: "#94A3B8", // slate-400
  faint: "#64748B", // slate-500
  brand: "#4F6BFF", // RockShield brand-500
  brandSoft: "#7A95FF", // brand-400
  blue: "#3B82F6",
  sky: "#38BDF8",
  amber: "#F59E0B",
  orange: "#FB923C",
  red: "#EF4444",
  green: "#10B981", // emerald-500
  violet: "#A78BFA",
  ivory: "#F7F3EA",
  // aliases kept for components written against the first palette
  teal: "#4F6BFF",
};

/** One muted colour per FIG. 1 layer, used consistently in every chapter */
export const LAYER_COLOR: Record<string, string> = {
  "101": "#FBBF24", // amber-400: sensors in the ground
  "102": "#38BDF8", // sky-400: links
  "103": "#7A95FF", // brand-400: edge computing
  "104": "#A78BFA", // violet-400: storage
  "105": "#34D399", // emerald-400: people and screens
};

export const RISK_COLOR = { LOW: "#10B981", MEDIUM: "#F59E0B", HIGH: "#EF4444" } as const;

export const VIDEO = { width: 1920, height: 1080, fps: 30 };

/** Title-safe margins */
export const SAFE = { x: 96, y: 64 };
