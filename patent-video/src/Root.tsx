import React from "react";
import { Composition } from "remotion";
import { VIDEO } from "./theme";
import { SFFig1 } from "./styleframes/SFFig1";
import { SFAlert, SFClaim, SFCode, SFTitle, SFUI } from "./styleframes/Styleframes";
import { PatentVideo } from "./Master";
import { CHAPTER_COMPONENTS } from "./chapters/Chapters";
import { CHAPTER_IDS, chapterTiming, totalFrames } from "./lib/timing";

export const Root: React.FC = () => (
  <>
    <Composition id="PatentVideo" component={PatentVideo} durationInFrames={totalFrames()} {...VIDEO} />
    {CHAPTER_IDS.map((id) => (
      <Composition key={id} id={id} component={CHAPTER_COMPONENTS[id]} durationInFrames={chapterTiming(id).frames} {...VIDEO} />
    ))}
    <Composition id="SF-Title" component={SFTitle} durationInFrames={150} {...VIDEO} />
    <Composition id="SF-Fig1" component={SFFig1} durationInFrames={300} {...VIDEO} />
    <Composition id="SF-Claim" component={SFClaim} durationInFrames={180} {...VIDEO} />
    <Composition id="SF-Code" component={SFCode} durationInFrames={180} {...VIDEO} />
    <Composition id="SF-UI" component={SFUI} durationInFrames={160} {...VIDEO} />
    <Composition id="SF-Alert" component={SFAlert} durationInFrames={180} {...VIDEO} />
  </>
);
