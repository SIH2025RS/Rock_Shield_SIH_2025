import React from "react";
import { Img, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { COLOR, FONT } from "../theme";
import { CameraKey, cameraAt, progress } from "../lib/anim";

export type Callout = { at: number; box: [number, number, number, number]; label: string; side?: "top" | "bottom" | "left" | "right" };

/**
 * A real screenshot of the RockShield web app in a browser window. `zoom` keys use image pixel
 * coordinates for the centre, so the camera can push in on a specific widget; callouts follow it.
 */
export const BrowserFrame: React.FC<{
  src: string;
  imageSize: [number, number];
  url: string;
  width: number;
  zoom?: CameraKey[];
  callouts?: Callout[];
  enter?: number;
  style?: React.CSSProperties;
}> = ({ src, imageSize, url, width, zoom, callouts = [], enter = 0, style }) => {
  const frame = useCurrentFrame();
  const bar = 54;
  const contentW = width;
  const contentH = Math.round((contentW * imageSize[1]) / imageSize[0]);
  const fit = contentW / imageSize[0];
  const cam = zoom ? cameraAt(frame, zoom) : { x: imageSize[0] / 2, y: imageSize[1] / 2, scale: 1 };
  const s = fit * cam.scale;
  const tx = contentW / 2 - cam.x * s;
  const ty = contentH / 2 - cam.y * s;
  const t = progress(frame, enter, 26);

  return (
    <div
      style={{
        width,
        borderRadius: 14,
        overflow: "hidden",
        background: "#0F172A",
        border: "1px solid rgba(148,163,184,0.22)",
        boxShadow: "0 40px 80px rgba(0,0,0,0.55)",
        opacity: t,
        transform: `translateY(${(1 - t) * 36}px) scale(${0.97 + 0.03 * t})`,
        ...style,
      }}
    >
      <div style={{ height: bar, background: "#1E293B", display: "flex", alignItems: "center", padding: "0 20px", gap: 9 }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
        ))}
        <div
          style={{
            marginLeft: 24,
            flex: 1,
            maxWidth: 720,
            height: 32,
            borderRadius: 16,
            background: "#0F172A",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 10,
            fontFamily: FONT.body,
            fontSize: 16,
            color: "#CBD5E1",
          }}
        >
          <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="#94A3B8" strokeWidth="1.6">
            <rect x="1" y="6" width="10" height="7" rx="1.5" />
            <path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" />
          </svg>
          {url}
        </div>
      </div>
      <div style={{ position: "relative", width: contentW, height: contentH, overflow: "hidden", background: "#fff" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: imageSize[0], height: imageSize[1], transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
          <Img src={staticFile(src)} style={{ width: imageSize[0], height: imageSize[1], display: "block" }} />
          {callouts.map((c, i) => {
            const p = progress(frame, c.at, 16);
            const [x, y, w, h] = c.box;
            const inv = 1 / s;
            return (
              <div key={i} style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: p }}>
                <div style={{ position: "absolute", inset: -6 * inv, border: `${3 * inv}px solid ${COLOR.brand}`, borderRadius: 12 * inv, boxShadow: `0 0 0 ${9999}px rgba(2,6,23,${0.38 * p})` }} />
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: c.side === "bottom" ? h + 16 * inv : undefined,
                    bottom: c.side === "bottom" ? undefined : h + 16 * inv,
                    transform: `scale(${inv})`,
                    transformOrigin: c.side === "bottom" ? "0 0" : "0 100%",
                    whiteSpace: "nowrap",
                    padding: "10px 16px",
                    borderRadius: 10,
                    background: COLOR.brand,
                    color: "white",
                    fontFamily: FONT.body,
                    fontWeight: 600,
                    fontSize: 22,
                    boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
                  }}
                >
                  {c.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** A phone showing a real capture (image or the team's screen recording) */
export const PhoneFrame: React.FC<{
  src: string;
  kind?: "image" | "video";
  width: number;
  /** Fraction of the content height to scroll by (0..1) over the shot */
  objectPosition?: string;
  enter?: number;
  startFrom?: number;
  style?: React.CSSProperties;
}> = ({ src, kind = "image", width, objectPosition = "top", enter = 0, startFrom = 0, style }) => {
  const frame = useCurrentFrame();
  const height = Math.round(width * 2.05);
  const bezel = Math.round(width * 0.025);
  const t = progress(frame, enter, 26);
  return (
    <div
      style={{
        width,
        height,
        borderRadius: width * 0.1,
        background: "#05070C",
        padding: bezel,
        boxShadow: "0 40px 80px rgba(0,0,0,0.6), inset 0 0 0 2px #2A2F3A, 0 0 0 1px #11141B",
        position: "relative",
        opacity: t,
        transform: `translateY(${(1 - t) * 40}px)`,
        ...style,
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: width * 0.075, overflow: "hidden", position: "relative", background: "#000" }}>
        {kind === "video" ? (
          <OffthreadVideo src={staticFile(src)} startFrom={startFrom} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition }} />
        ) : (
          <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition }} />
        )}
        <div style={{ position: "absolute", top: width * 0.028, left: "50%", width: width * 0.045, height: width * 0.045, marginLeft: -width * 0.0225, borderRadius: "50%", background: "#000", boxShadow: "0 0 0 2px #111" }} />
      </div>
    </div>
  );
};
