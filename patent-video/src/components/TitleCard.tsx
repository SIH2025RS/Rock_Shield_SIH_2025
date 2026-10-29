import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT, SAFE } from "../theme";
import { progress } from "../lib/anim";
import { APPLICANT, INVENTORS, TITLE, hasAsset, titleCase } from "../lib/content";
import { Grain } from "./Background";

const LOGO = "brand/bvp-logo.png";

/** Ivory plate that holds the official emblem unmodified (its white background stays intact) */
export const EmblemPlate: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.16,
      background: COLOR.ivory,
      boxShadow: "0 14px 34px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(0,0,0,0.06)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    {hasAsset(LOGO) ? (
      <Img src={staticFile(LOGO)} style={{ width: size * 0.84, height: size * 0.84, objectFit: "contain" }} />
    ) : (
      <div style={{ fontFamily: FONT.mono, fontSize: size * 0.1, color: "#9a8f78", textAlign: "center", lineHeight: 1.4 }}>
        emblem
        <br />
        pending
      </div>
    )}
  </div>
);

export const TitleCard: React.FC<{ enter?: number }> = ({ enter = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const f = frame - enter;
  const bgScale = interpolate(frame, [0, durationInFrames], [1.1, 1.0]);
  const t = (start: number, dur = 24) => progress(f, start, dur);

  const reveal = (start: number): React.CSSProperties => ({
    opacity: t(start),
    transform: `translateY(${(1 - t(start)) * 24}px)`,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.bg, overflow: "hidden" }}>
      <Img
        src={staticFile("site/sat-district.jpg")}
        style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", transform: `scale(${bgScale})`, filter: "saturate(0.7) brightness(0.62) contrast(1.05)" }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(11,17,32,0.96) 0%, rgba(11,17,32,0.9) 42%, rgba(11,17,32,0.45) 72%, rgba(11,17,32,0.25) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(7,11,22,0.85) 0%, transparent 35%)" }} />

      <div style={{ position: "absolute", left: SAFE.x, top: 176, width: 1180 }}>
        <div style={{ ...reveal(0), fontFamily: FONT.mono, fontSize: 18, letterSpacing: 3, color: COLOR.brandSoft }}>
          THE PATENTS ACT, 1970 · FORM 2 · COMPLETE SPECIFICATION
        </div>
        <div style={{ ...reveal(8), marginTop: 26, fontFamily: FONT.heading, fontWeight: 600, fontSize: 56, lineHeight: 1.14, letterSpacing: -0.6, color: COLOR.text }}>
          {titleCase(TITLE).replace(/-/g, "\u2011")}
        </div>
        <div style={{ marginTop: 40, width: interpolate(t(22), [0, 1], [0, 72]), height: 3, background: COLOR.brand, borderRadius: 2 }} />

        <div style={{ ...reveal(30), marginTop: 40, display: "flex", alignItems: "center", gap: 28 }}>
          <EmblemPlate size={128} />
          <div>
            <div style={{ fontFamily: FONT.mono, fontSize: 16, letterSpacing: 3, color: COLOR.dim }}>APPLICANT</div>
            {APPLICANT.map((line) => (
              <div key={line} style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 28, lineHeight: 1.3, color: COLOR.text }}>
                {line}
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...reveal(40), marginTop: 40, width: 1728 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 16, letterSpacing: 3, color: COLOR.dim }}>INVENTORS</div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
            {INVENTORS.map((name, i) => (
              <React.Fragment key={name}>
                {i > 0 && <div style={{ width: 1, height: 22, background: COLOR.lineStrong, margin: "0 22px" }} />}
                <div style={{ fontFamily: FONT.body, fontWeight: 500, fontSize: 25, color: COLOR.text, opacity: t(44 + i * 4, 18) }}>{name}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...reveal(52), position: "absolute", right: SAFE.x, bottom: 40, textAlign: "right", fontFamily: FONT.mono, fontSize: 15, color: "rgba(226,232,240,0.7)", lineHeight: 1.6 }}>
        Jharia coalfield, Dhanbad, Jharkhand · 23.76° N, 86.40° E
        <br />
        Satellite imagery © Mapbox © OpenStreetMap
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
