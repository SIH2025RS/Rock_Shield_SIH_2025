import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT, SAFE } from "../theme";
import { progress } from "../lib/anim";

export type Evidence = "PROTOTYPE" | "EMBODIMENT";

/** Top-left: "CLAIM 07 · depends on 5" */
export const ClaimChip: React.FC<{ n: number; dependsOn: number | null; kind: "system" | "method"; enter?: number }> = ({
  n,
  dependsOn,
  kind,
  enter = 0,
}) => {
  const frame = useCurrentFrame();
  const t = progress(frame, enter, 18);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.x - 24,
        top: SAFE.y - 16,
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: t,
        transform: `translateY(${(1 - t) * -12}px)`,
        fontFamily: FONT.mono,
      }}
    >
      <div
        style={{
          padding: "8px 14px",
          borderRadius: 10,
          background: "#121C3A",
          border: `1px solid ${COLOR.teal}88`,
          color: COLOR.teal,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        CLAIM {String(n).padStart(2, "0")}
      </div>
      <div style={{ color: COLOR.dim, fontSize: 19, letterSpacing: 1, padding: "6px 12px", borderRadius: 8, background: "rgba(11,17,32,0.82)" }}>
        {kind === "method" ? "method (200)" : "system (100)"}
        {" · "}
        {dependsOn ? `depends on claim ${dependsOn}` : "independent"}
      </div>
    </div>
  );
};

/** Top-right evidence tag: real prototype vs illustrative embodiment */
export const EvidenceTag: React.FC<{ kind: Evidence; note?: string; enter?: number }> = ({ kind, note, enter = 0 }) => {
  const frame = useCurrentFrame();
  const t = progress(frame, enter, 18);
  const real = kind === "PROTOTYPE";
  const color = real ? COLOR.green : COLOR.violet;
  return (
    <div
      style={{
        position: "absolute",
        right: SAFE.x - 24,
        top: SAFE.y - 16,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        borderRadius: 10,
        background: "rgba(11,17,32,0.88)",
        border: `1px solid ${color}55`,
        fontFamily: FONT.mono,
        opacity: t,
        transform: `translateY(${(1 - t) * -12}px)`,
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: 5, background: color, boxShadow: `0 0 12px ${color}` }} />
      <div style={{ color, fontSize: 19, fontWeight: 700, letterSpacing: 2 }}>{real ? "PROTOTYPE" : "EMBODIMENT"}</div>
      <div style={{ color: COLOR.dim, fontSize: 17 }}>{note ?? (real ? "running RockShield code" : "illustrative")}</div>
    </div>
  );
};

/** Thin bottom rail showing position across the 18 claims */
export const ProgressRail: React.FC<{ current: number; total?: number }> = ({ current, total = 18 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const within = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  const gap = 6;
  const width = 1920 - SAFE.x * 2;
  const seg = (width - gap * (total - 1)) / total;
  return (
    <div style={{ position: "absolute", left: SAFE.x, bottom: 22, width, height: 4, display: "flex", gap }}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const fill = n < current ? 1 : n === current ? within : 0;
        return (
          <div key={n} style={{ width: seg, height: 4, borderRadius: 2, background: "rgba(148,163,184,0.16)", overflow: "hidden" }}>
            <div style={{ width: `${fill * 100}%`, height: "100%", background: n === current ? COLOR.teal : "rgba(20,184,166,0.55)" }} />
          </div>
        );
      })}
    </div>
  );
};
