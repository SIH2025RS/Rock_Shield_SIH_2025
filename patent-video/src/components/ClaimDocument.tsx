import React from "react";
import { useCurrentFrame } from "remotion";
import { COLOR, FONT } from "../theme";
import { progress } from "../lib/anim";
import { Claim } from "../lib/content";

export type Highlight = { phrase: string; at: number };

type Segment = { text: string; hl?: Highlight };

/** Split the exact claim text into plain and highlighted runs (phrases must appear verbatim) */
function segment(text: string, highlights: Highlight[]): Segment[] {
  const found = highlights
    .map((h) => ({ h, i: text.indexOf(h.phrase) }))
    .filter((x) => {
      if (x.i === -1) throw new Error(`Highlight phrase not in claim text: "${x.h.phrase}"`);
      return true;
    })
    .sort((a, b) => a.i - b.i);
  const out: Segment[] = [];
  let cursor = 0;
  for (const { h, i } of found) {
    if (i < cursor) continue;
    if (i > cursor) out.push({ text: text.slice(cursor, i) });
    out.push({ text: h.phrase, hl: h });
    cursor = i + h.phrase.length;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out;
}

/**
 * The claim as it appears in the filed specification: a printed page (Times-compatible serif),
 * with phrases marked by a highlighter as the narrator explains them.
 */
export const ClaimDocument: React.FC<{
  claim: Claim;
  /** Override the displayed text (e.g. one element of claim 1); must be a verbatim excerpt */
  excerpt?: string;
  highlights?: Highlight[];
  enter?: number;
  width?: number;
  fontSize?: number;
  style?: React.CSSProperties;
}> = ({ claim, excerpt, highlights = [], enter = 0, width = 820, fontSize = 33, style }) => {
  const frame = useCurrentFrame();
  const text = excerpt ?? claim.text;
  if (excerpt && !claim.text.includes(excerpt)) throw new Error(`Excerpt is not verbatim from claim ${claim.n}`);
  const t = progress(frame, enter, 26);
  const segments = segment(text, highlights);
  const dep = claim.dependsOn ? `depends on claim ${claim.dependsOn}` : "independent claim";

  return (
    <div
      style={{
        width,
        padding: "44px 56px 48px",
        background: "#FBFAF6",
        borderRadius: 6,
        boxShadow: "0 30px 60px rgba(0,0,0,0.45), 0 2px 0 rgba(255,255,255,0.6) inset",
        opacity: t,
        transform: `translateY(${(1 - t) * 40}px) rotate(${(1 - t) * -0.8}deg)`,
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid #E4E0D6", paddingBottom: 14, marginBottom: 22 }}>
        <div style={{ fontFamily: FONT.body, fontSize: 15, letterSpacing: 2.5, color: "#7C756A" }}>FORM 2 · COMPLETE SPECIFICATION · CLAIMS</div>
        <div style={{ fontFamily: FONT.body, fontSize: 16, color: "#7C756A" }}>{dep}</div>
      </div>
      <div style={{ fontFamily: FONT.doc, fontWeight: 700, fontSize: fontSize * 0.82, color: "#1F2937", marginBottom: 10 }}>{claim.n}.</div>
      <div style={{ fontFamily: FONT.doc, fontSize, lineHeight: 1.55, color: "#1F2937" }}>
        {segments.map((s, i) => {
          if (!s.hl) return <span key={i}>{s.text}</span>;
          const p = progress(frame, s.hl.at, 14);
          return (
            <span
              key={i}
              style={{
                backgroundImage: "linear-gradient(100deg, rgba(253,224,71,0.0) 0%, rgba(253,224,71,0.78) 2%, rgba(250,204,21,0.72) 98%, rgba(250,204,21,0.0) 100%)",
                backgroundRepeat: "no-repeat",
                backgroundSize: `${p * 100}% 78%`,
                backgroundPosition: "0 70%",
                WebkitBoxDecorationBreak: "clone",
                boxDecorationBreak: "clone",
                padding: "0 2px",
                color: p > 0.5 ? "#111827" : "#1F2937",
              }}
            >
              {s.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Small plain-language explanation shown beside the legal text */
export const PlainNote: React.FC<{ label?: string; children: React.ReactNode; enter?: number; width?: number }> = ({ label = "In plain words", children, enter = 0, width = 820 }) => {
  const frame = useCurrentFrame();
  const t = progress(frame, enter, 22);
  return (
    <div style={{ width, opacity: t, transform: `translateY(${(1 - t) * 16}px)` }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 16, letterSpacing: 3, color: COLOR.brandSoft, marginBottom: 10 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: FONT.body, fontSize: 30, lineHeight: 1.45, color: COLOR.text }}>{children}</div>
    </div>
  );
};
