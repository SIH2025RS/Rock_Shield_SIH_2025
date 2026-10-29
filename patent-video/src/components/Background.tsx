import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR } from "../theme";

/** Calm slate backdrop with a faint engineering-paper grid and light film grain */
export const Background: React.FC<{ grid?: boolean; children?: React.ReactNode }> = ({ grid = true, children }) => (
  <AbsoluteFill style={{ backgroundColor: COLOR.bg, overflow: "hidden" }}>
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${COLOR.bgLift} 0%, ${COLOR.bg} 55%, ${COLOR.bgDeep} 100%)` }} />
    {grid && (
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="bg-grid-minor" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="rgba(148,163,184,0.035)" strokeWidth="1" />
          </pattern>
          <pattern id="bg-grid-major" width="120" height="120" patternUnits="userSpaceOnUse">
            <rect width="120" height="120" fill="url(#bg-grid-minor)" />
            <path d="M120 0H0V120" fill="none" stroke="rgba(148,163,184,0.07)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg-grid-major)" />
      </svg>
    )}
    {children}
    <Grain />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.38) 100%)", pointerEvents: "none" }} />
  </AbsoluteFill>
);

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => {
  const frame = useCurrentFrame();
  return (
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <filter id="grain-f">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 24} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-f)" />
    </svg>
  );
};
