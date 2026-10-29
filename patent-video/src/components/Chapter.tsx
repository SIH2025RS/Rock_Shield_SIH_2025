import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { COLOR, FONT } from "../theme";
import { progress } from "../lib/anim";
import { ChapterTiming, LEAD, chapterTiming } from "../lib/timing";
import { paginate } from "../lib/captions";
import { claim } from "../lib/content";
import { Background } from "./Background";
import { ClaimChip, ProgressRail } from "./HUD";

/** A shot visible from `from` to `to` (chapter frames) with short cross-fades at both ends */
export const Shot: React.FC<{ from: number; to: number; fade?: number; children: React.ReactNode }> = ({ from, to, fade = 10, children }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const opacity = Math.min(progress(frame, from, fade), 1 - progress(frame, to - fade, fade));
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/** Fade-and-rise entrance at a given chapter frame */
export const Reveal: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const frame = useCurrentFrame();
  const t = progress(frame, at, 16);
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * 12}px)`, ...style }}>{children}</div>;
};

export const Captions: React.FC<{ t: ChapterTiming }> = ({ t }) => {
  const frame = useCurrentFrame();
  const pages = React.useMemo(() => paginate(t.words), [t.words]);
  const page = pages.find((p) => frame >= p.from && frame < p.to);
  if (!page) return null;
  const op = Math.min(progress(frame, page.from, 4), 1 - progress(frame, page.to - 4, 4));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 66, display: "flex", justifyContent: "center", opacity: op }}>
      <div style={{ padding: "10px 22px", borderRadius: 10, background: "rgba(7,11,22,0.78)", textAlign: "center" }}>
        {page.text.map((line, i) => (
          <div key={i} style={{ fontFamily: FONT.body, fontWeight: 500, fontSize: 34, lineHeight: 1.32, color: COLOR.text, whiteSpace: "nowrap" }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Everything every chapter shares: backdrop, claim chip, progress rail, captions and the voice */
export const ChapterShell: React.FC<{
  id: string;
  claimN?: number;
  rail?: number;
  background?: boolean;
  children: (t: ChapterTiming) => React.ReactNode;
}> = ({ id, claimN, rail, background = true, children }) => {
  const t = chapterTiming(id);
  const c = claimN ? claim(claimN) : null;
  return (
    <AbsoluteFill>
      {background && <Background />}
      {children(t)}
      {c && <ClaimChip n={c.n} dependsOn={c.dependsOn} kind={c.kind} enter={4} />}
      {(claimN || rail) && <ProgressRail current={rail ?? claimN!} />}
      <Captions t={t} />
      <Sequence from={LEAD}>
        <Html5Audio src={staticFile(t.audio)} />
      </Sequence>
    </AbsoluteFill>
  );
};
