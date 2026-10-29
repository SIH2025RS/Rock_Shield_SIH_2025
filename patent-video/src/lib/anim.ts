import { Easing, spring } from "remotion";

export type Pt = [number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Expo-out: fast start, long settle; the default for UI entrances */
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** 0→1 between `start` and `start + duration` frames */
export const progress = (frame: number, start: number, duration: number, easing = easeOut) =>
  easing(clamp01((frame - start) / duration));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const springIn = (frame: number, fps: number, start: number, damping = 18, stiffness = 120) =>
  spring({ frame: frame - start, fps, config: { damping, stiffness, mass: 1 } });

export type CameraKey = { frame: number; x: number; y: number; scale: number };

/** Camera between keyframes; scale interpolates in log space so zooms feel uniform */
export function cameraAt(frame: number, keys: CameraKey[]): Omit<CameraKey, "frame"> {
  if (frame <= keys[0].frame) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (frame <= b.frame) {
      const t = easeInOut(clamp01((frame - a.frame) / Math.max(1, b.frame - a.frame)));
      return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        scale: Math.exp(lerp(Math.log(a.scale), Math.log(b.scale), t)),
      };
    }
  }
  return keys[keys.length - 1];
}

export function polylineLength(pts: Pt[]) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}

/** Point at fraction t (0..1) of a polyline's length */
export function pointOnPolyline(pts: Pt[], t: number): Pt {
  const total = polylineLength(pts);
  let target = clamp01(t) * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (target <= seg || i === pts.length - 1) {
      const f = seg === 0 ? 0 : target / seg;
      return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
    }
    target -= seg;
  }
  return pts[pts.length - 1];
}

export const toPath = (pts: Pt[]) => pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");

/** Deterministic pseudo-random in [0, 1) so renders are repeatable */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
