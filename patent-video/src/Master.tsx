import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { CHAPTER_COMPONENTS } from "./chapters/Chapters";
import { CHAPTER_IDS, TRANSITION, chapterTiming } from "./lib/timing";

/** The full video: every chapter in order, cross-faded */
export const PatentVideo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0B1120" }}>
    <TransitionSeries>
      {CHAPTER_IDS.flatMap((id, i) => {
        const Chapter = CHAPTER_COMPONENTS[id];
        const seq = (
          <TransitionSeries.Sequence key={id} durationInFrames={chapterTiming(id).frames}>
            <Chapter />
          </TransitionSeries.Sequence>
        );
        return i === 0 ? [seq] : [<TransitionSeries.Transition key={`${id}-t`} presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION })} />, seq];
      })}
    </TransitionSeries>
  </AbsoluteFill>
);
