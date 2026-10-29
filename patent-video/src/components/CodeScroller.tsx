import React from "react";
import { useCurrentFrame } from "remotion";
import { COLOR, FONT } from "../theme";
import { clamp01, easeInOut, lerp, progress } from "../lib/anim";

export type Snippet = {
  id: string;
  file: string;
  lang: string;
  startLine: number;
  focus: Record<string, number>;
  lines: { c: string; color: string; italic: boolean }[][];
};

/** Focus step: from frame `at`, highlight lines [from..to] (names from the snippet or indices) */
export type CodeFocus = { at: number; from: string | number; to?: string | number; note?: string };

const LANG_DOT: Record<string, string> = { python: "#3572A5", javascript: "#F1E05A", jsx: "#61DAFB", sql: "#E38C00" };

/** A real source file in an editor window: smooth scroll to each focus, dim the rest, annotate. */
export const CodeScroller: React.FC<{
  snippet: Snippet;
  focus: CodeFocus[];
  width?: number;
  height?: number;
  fontSize?: number;
  enter?: number;
  style?: React.CSSProperties;
}> = ({ snippet, focus, width = 1180, height = 760, fontSize = 24, enter = 0, style }) => {
  const frame = useCurrentFrame();
  const lh = Math.round(fontSize * 1.62);
  const header = 50;
  const crumbs = 40;
  const noteBar = focus.some((f) => f.note) ? 78 : 0;
  const bodyH = height - header - crumbs - noteBar;
  const total = snippet.lines.length * lh + 48;
  const idx = (v: string | number) => (typeof v === "number" ? v : snippet.focus[v]);

  // Active focus and the one before it, for smooth transitions
  const steps = focus.map((f) => ({ ...f, a: idx(f.from), b: idx(f.to ?? f.from) }));
  let k = -1;
  steps.forEach((s, i) => {
    if (frame >= s.at) k = i;
  });
  const cur = k >= 0 ? steps[k] : null;
  const prev = k > 0 ? steps[k - 1] : null;
  const tr = cur ? easeInOut(clamp01((frame - cur.at) / 22)) : 0;
  const center = (s: { a: number; b: number } | null) => (s ? ((s.a + s.b + 1) / 2) * lh : bodyH / 2);
  const scrollTarget = (s: { a: number; b: number } | null) => Math.max(0, Math.min(total - bodyH, center(s) - bodyH / 2 + 24));
  const scroll = lerp(scrollTarget(prev), scrollTarget(cur), cur ? tr : 0);
  const bandTop = lerp(prev ? prev.a * lh : cur ? cur.a * lh : 0, cur ? cur.a * lh : 0, prev ? tr : 1);
  const bandH = lerp(prev ? (prev.b - prev.a + 1) * lh : cur ? (cur.b - cur.a + 1) * lh : 0, cur ? (cur.b - cur.a + 1) * lh : 0, prev ? tr : 1);
  const bandOn = cur ? progress(frame, cur.at, 14) : 0;
  const t = progress(frame, enter, 24);
  const parts = snippet.file.split("/");
  const fileName = parts[parts.length - 1];

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 14,
        overflow: "hidden",
        background: "#0D1117",
        border: "1px solid #30363D",
        boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
        opacity: t,
        transform: `translateY(${(1 - t) * 30}px)`,
        ...style,
      }}
    >
      <div style={{ height: header, background: "#161B22", borderBottom: "1px solid #30363D", display: "flex", alignItems: "center", padding: "0 18px", gap: 9 }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
        ))}
        <div style={{ marginLeft: 22, height: header, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", background: "#0D1117", borderTop: `2px solid ${COLOR.brand}` }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: LANG_DOT[snippet.lang] ?? COLOR.dim }} />
          <div style={{ fontFamily: FONT.body, fontSize: 17, color: "#E6EDF3" }}>{fileName}</div>
        </div>
      </div>
      <div style={{ height: crumbs, display: "flex", alignItems: "center", padding: "0 20px", fontFamily: FONT.body, fontSize: 16, color: "#7D8590", borderBottom: "1px solid #21262D" }}>
        {parts.join("  ›  ")}
      </div>
      <div style={{ position: "relative", height: bodyH, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 24 - scroll }}>
          {cur && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: bandTop,
                height: bandH,
                background: `rgba(79,107,255,${0.16 * bandOn})`,
                borderLeft: `4px solid rgba(122,149,255,${bandOn})`,
              }}
            />
          )}
          {snippet.lines.map((tokens, i) => {
            const level = (s: { a: number; b: number } | null) => (!s || (i >= s.a && i <= s.b) ? 1 : 0.32);
            const inFocus = !cur || (i >= cur.a && i <= cur.b);
            const op = !cur ? 1 : prev ? lerp(level(prev), level(cur), tr) : lerp(1, level(cur), bandOn);
            return (
              <div key={i} style={{ position: "relative", height: lh, display: "flex", alignItems: "center", fontFamily: FONT.mono, fontSize, whiteSpace: "pre", opacity: op }}>
                <div style={{ width: 84, paddingRight: 22, textAlign: "right", color: inFocus && cur ? "#C9D1D9" : "#6E7681", flexShrink: 0 }}>{snippet.startLine + i}</div>
                <div>
                  {tokens.map((tok, j) => (
                    <span key={j} style={{ color: tok.color, fontStyle: tok.italic ? "italic" : "normal" }}>
                      {tok.c}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {noteBar > 0 && (
        <div style={{ height: noteBar, borderTop: "1px solid #30363D", background: "#121A33", display: "flex", alignItems: "center", gap: 16, padding: "0 24px" }}>
          <div style={{ width: 4, height: 34, borderRadius: 2, background: COLOR.brand, opacity: cur?.note ? 1 : 0.3 }} />
          <div
            style={{
              fontFamily: FONT.body,
              fontSize: 23,
              color: COLOR.text,
              opacity: cur?.note ? progress(frame, cur.at + 6, 14) : 0,
              transform: `translateY(${cur?.note ? (1 - progress(frame, cur.at + 6, 14)) * 8 : 0}px)`,
            }}
          >
            {cur?.note}
          </div>
        </div>
      )}
    </div>
  );
};
