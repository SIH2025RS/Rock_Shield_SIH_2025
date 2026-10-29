import React from "react";
import { AbsoluteFill } from "remotion";
import { Background } from "../components/Background";
import { CAM, Fig1World } from "../components/Fig1World";
import { ProgressRail } from "../components/HUD";

/** Styleframe: FIG. 1 assembles, then the camera settles on the edge computing layer */
export const SFFig1: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <Fig1World
      revealAt={0}
      camera={[
        { frame: 0, ...CAM.top },
        { frame: 120, ...CAM.overview },
        { frame: 190, ...CAM.overview },
        { frame: 250, ...CAM.edge },
      ]}
      focus={["103", "103a", "103b", "103c", "103d"]}
      focusAt={200}
      packets={["101c-a", "101c-b", "102a", "103f", "103g"]}
    />
    <ProgressRail current={1} />
  </AbsoluteFill>
);
