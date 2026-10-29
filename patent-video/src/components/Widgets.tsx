import React from "react";
import { useCurrentFrame } from "remotion";
import { COLOR, FONT, RISK_COLOR } from "../theme";
import { clamp01, progress } from "../lib/anim";
import { CAM, FLOWS, Fig1World, FlowId, GEO, NodeId } from "./Fig1World";
import { ClaimDocument, Highlight } from "./ClaimDocument";
import { claim } from "../lib/content";

/** Terminal window replaying real console output (typed commands, instant output) */
export const Terminal: React.FC<{
  title?: string;
  lines: { text: string; at: number; color?: string; typed?: boolean }[];
  width?: number;
  height?: number;
  enter?: number;
  style?: React.CSSProperties;
}> = ({ title = "zsh", lines, width = 1100, height = 520, enter = 0, style }) => {
  const frame = useCurrentFrame();
  const t = progress(frame, enter, 20);
  return (
    <div style={{ width, height, borderRadius: 14, overflow: "hidden", background: "#0B0F17", border: "1px solid #30363D", boxShadow: "0 30px 70px rgba(0,0,0,0.5)", opacity: t, transform: `translateY(${(1 - t) * 24}px)`, ...style }}>
      <div style={{ height: 44, background: "#161B22", display: "flex", alignItems: "center", padding: "0 16px", gap: 8 }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
        ))}
        <div style={{ flex: 1, textAlign: "center", fontFamily: FONT.body, fontSize: 16, color: "#8B949E", marginRight: 60 }}>{title}</div>
      </div>
      <div style={{ padding: "18px 24px", fontFamily: FONT.mono, fontSize: 22, lineHeight: 1.55 }}>
        {lines.map((l, i) => {
          if (frame < l.at) return null;
          const chars = l.typed ? Math.floor(clamp01((frame - l.at) / Math.max(8, l.text.length * 0.8)) * l.text.length) : l.text.length;
          return (
            <div key={i} style={{ color: l.color ?? "#C9D1D9", whiteSpace: "pre-wrap" }}>
              {l.typed && <span style={{ color: COLOR.green }}>$ </span>}
              {l.text.slice(0, chars)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Line chart for real series; nulls leave gaps (missing sensor values stay visible) */
export const SeriesChart: React.FC<{
  series: { values: (number | null)[]; color: string; width?: number; dashed?: boolean; label?: string }[];
  width: number;
  height: number;
  yMin: number;
  yMax: number;
  /** 0..1 left-to-right reveal */
  reveal?: number;
  bands?: { from: number; to: number; color: string; label: string }[];
  playhead?: number;
  xLabels?: { at: number; text: string }[];
  yLabel?: string;
}> = ({ series, width, height, yMin, yMax, reveal = 1, bands = [], playhead, xLabels = [], yLabel }) => {
  const pad = { l: 70, r: 20, t: 16, b: 40 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const n = Math.max(...series.map((s) => s.values.length));
  const x = (i: number) => pad.l + (i / Math.max(1, n - 1)) * w;
  const y = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * h;
  const path = (values: (number | null)[]) => {
    let d = "";
    let pen = false;
    values.forEach((v, i) => {
      if (v === null || v === undefined) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };
  const clipId = React.useId().replace(/:/g, "");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={pad.l + w * clamp01(reveal) + 2} height={height} />
        </clipPath>
      </defs>
      {bands.map((b) => (
        <g key={b.label}>
          <rect x={pad.l} y={y(b.to)} width={w} height={y(b.from) - y(b.to)} fill={b.color} opacity={0.09} />
          <text x={pad.l + w - 8} y={y(b.to) + 24} textAnchor="end" fontFamily={FONT.mono} fontSize={17} fill={b.color} opacity={0.9}>
            {b.label}
          </text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((k) => {
        const v = yMin + (yMax - yMin) * k;
        return (
          <g key={k}>
            <line x1={pad.l} x2={pad.l + w} y1={y(v)} y2={y(v)} stroke="rgba(148,163,184,0.12)" />
            <text x={pad.l - 12} y={y(v) + 6} textAnchor="end" fontFamily={FONT.mono} fontSize={16} fill={COLOR.faint}>
              {Math.abs(yMax - yMin) < 5 ? v.toFixed(2) : Math.round(v)}
            </text>
          </g>
        );
      })}
      {yLabel && (
        <text x={pad.l} y={pad.t - 2} fontFamily={FONT.body} fontSize={17} fill={COLOR.dim}>
          {yLabel}
        </text>
      )}
      {xLabels.map((l) => (
        <text key={l.at} x={x(l.at)} y={height - 10} textAnchor="middle" fontFamily={FONT.mono} fontSize={15} fill={COLOR.faint}>
          {l.text}
        </text>
      ))}
      <g clipPath={`url(#${clipId})`}>
        {series.map((s, i) => (
          <path key={i} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={s.width ?? 3} strokeDasharray={s.dashed ? "6 6" : undefined} strokeLinejoin="round" strokeLinecap="round" />
        ))}
      </g>
      {playhead !== undefined && (
        <g>
          <line x1={x(playhead)} x2={x(playhead)} y1={pad.t} y2={pad.t + h} stroke={COLOR.text} strokeOpacity={0.5} strokeDasharray="4 4" />
          {series[0].values[Math.round(playhead)] != null && <circle cx={x(playhead)} cy={y(series[0].values[Math.round(playhead)]!)} r={8} fill={series[0].color} stroke={COLOR.bg} strokeWidth={3} />}
        </g>
      )}
    </svg>
  );
};

/** Semicircular gauge with the prototype's three bands (0.3 / 0.6) */
export const RiskGauge: React.FC<{ value: number; size?: number }> = ({ value, size = 360 }) => {
  const cx = size / 2;
  const cy = size * 0.62;
  const r = size * 0.42;
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => [cx + r * Math.cos(Math.PI * (1 - a)), cy - r * Math.sin(Math.PI * (1 - a))];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const level = value < 0.3 ? "LOW" : value < 0.6 ? "MEDIUM" : "HIGH";
  const ang = Math.PI * (1 - value);
  return (
    <svg width={size} height={size * 0.8}>
      <path d={arc(0, 0.3)} stroke={RISK_COLOR.LOW} strokeWidth={22} fill="none" />
      <path d={arc(0.3, 0.6)} stroke={RISK_COLOR.MEDIUM} strokeWidth={22} fill="none" />
      <path d={arc(0.6, 1)} stroke={RISK_COLOR.HIGH} strokeWidth={22} fill="none" />
      <line x1={cx} y1={cy} x2={cx + (r - 30) * Math.cos(ang)} y2={cy - (r - 30) * Math.sin(ang)} stroke={COLOR.text} strokeWidth={5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={10} fill={COLOR.text} />
      <text x={cx} y={cy + 56} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={size * 0.13} fill={COLOR.text}>
        {value.toFixed(3)}
      </text>
      <text x={cx} y={cy + 92} textAnchor="middle" fontFamily={FONT.body} fontWeight={700} fontSize={size * 0.075} letterSpacing={3} fill={RISK_COLOR[level]}>
        {level}
      </text>
    </svg>
  );
};

type Box = { x: number; y: number; w: number; h: number };
const WORLD: Box = { x: 40, y: 20, w: 1780, h: 1990 };
const NODE_BOX: Partial<Record<NodeId, Box>> = {
  "101": GEO.s101,
  "101a": GEO.n101a,
  "101b": GEO.n101b,
  "102": GEO.c102,
  "103": GEO.e103,
  "103a": GEO.a,
  "103b": GEO.b,
  "103c": GEO.c,
  "103d": GEO.d,
  "104": GEO.s104,
  "105": GEO.a105,
};
const NODE_FLOWS: Partial<Record<NodeId, FlowId[]>> = { "101c": ["101c-a", "101c-b"], "102a": ["102a"], "103e": ["103e", "103e-102"], "103f": ["103f"], "103g": ["103g"] };

function boxOf(id: NodeId): Box {
  const node = NODE_BOX[id];
  if (node) return node;
  const pts = (NODE_FLOWS[id] ?? []).flatMap((f) => FLOWS[f]);
  if (pts.length === 0) return WORLD;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  // flow labels sit to the right of their line
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 330, h: Math.max(...ys) - Math.min(...ys) };
}

/** Camera that fits the focused parts of FIG. 1 inside a screen area, plus that area in screen px */
export function fitFocus(focus: NodeId[], area = { cx: 505, cy: 505, w: 890, h: 760 }) {
  const boxes = focus.length ? focus.map(boxOf) : [WORLD];
  const pad = 36;
  const x0 = Math.min(...boxes.map((b) => b.x)) - pad;
  const y0 = Math.min(...boxes.map((b) => b.y)) - pad;
  const x1 = Math.max(...boxes.map((b) => b.x + b.w)) + pad;
  const y1 = Math.max(...boxes.map((b) => b.y + b.h)) + pad;
  const scale = Math.min(area.w / (x1 - x0), area.h / (y1 - y0), 1.5);
  const cam = { x: (x0 + x1) / 2 + (960 - area.cx) / scale, y: (y0 + y1) / 2 + (540 - area.cy) / scale, scale };
  const halfW = ((x1 - x0) * scale) / 2;
  const halfH = ((y1 - y0) * scale) / 2;
  return { cam, rect: { l: area.cx - halfW, r: area.cx + halfW, t: area.cy - halfH, b: area.cy + halfH } };
}

/**
 * The focused part of FIG. 1, fitted into the left half of the frame. Everything outside the fitted
 * box fades out softly, so nothing is cut at the screen edge; the right half is darkened for text.
 */
export const FigSide: React.FC<{ focus: NodeId[]; packets?: FlowId[]; area?: { cx: number; cy: number; w: number; h: number }; darkenRight?: boolean }> = ({
  focus,
  packets,
  area,
  darkenRight = true,
}) => {
  const { cam, rect } = fitFocus(focus, area);
  const fade = 56;
  const mask = [
    `linear-gradient(to right, transparent ${rect.l - fade}px, #000 ${rect.l}px, #000 ${rect.r}px, transparent ${rect.r + fade}px)`,
    `linear-gradient(to bottom, transparent ${rect.t - fade}px, #000 ${rect.t}px, #000 ${rect.b}px, transparent ${rect.b + fade}px)`,
  ].join(", ");
  return (
    <>
      <div style={{ position: "absolute", inset: 0, WebkitMaskImage: mask, WebkitMaskComposite: "source-in", maskImage: mask, maskComposite: "intersect" }}>
        <Fig1World camera={[{ frame: 0, ...cam }]} focus={focus} focusAt={0} packets={packets} isolate={focus.length > 0} />
      </div>
      {darkenRight && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 51%, rgba(11,17,32,0.94) 55%)" }} />}
    </>
  );
};

/** Parts much wider than tall (whole layers) read better full-width above the claim text */
const isWide = (focus: NodeId[]) => {
  const { rect } = fitFocus(focus, { cx: 960, cy: 540, w: 10000, h: 1000 });
  return focus.length > 0 && (rect.r - rect.l) / (rect.b - rect.t) > 2.4;
};

/** Opening shot of a claim chapter: the part of FIG. 1 it covers, beside the exact claim text */
export const ClaimIntro: React.FC<{
  n: number;
  focus: NodeId[];
  highlights?: Highlight[];
  excerpt?: string;
  fontSize?: number;
  packets?: FlowId[];
}> = ({ n, focus, highlights = [], excerpt, fontSize = 32, packets }) =>
  isWide(focus) ? (
    <>
      <FigSide focus={focus} packets={packets} area={{ cx: 960, cy: 255, w: 1700, h: 350 }} darkenRight={false} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 470, display: "flex", justifyContent: "center" }}>
        <ClaimDocument claim={claim(n)} excerpt={excerpt} highlights={highlights} width={1560} fontSize={Math.min(fontSize, 24)} enter={2} style={{ padding: "26px 48px 30px" }} />
      </div>
    </>
  ) : (
  <>
    <FigSide focus={focus} packets={packets} />
    <div style={{ position: "absolute", left: 1056, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
      <ClaimDocument claim={claim(n)} excerpt={excerpt} highlights={highlights} width={790} fontSize={fontSize} enter={2} />
    </div>
  </>
);

export const Label: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = COLOR.brandSoft, style }) => (
  <div style={{ fontFamily: FONT.mono, fontSize: 17, letterSpacing: 3, color, textTransform: "uppercase", ...style }}>{children}</div>
);

export const Heading: React.FC<{ children: React.ReactNode; enter?: number; size?: number; style?: React.CSSProperties }> = ({ children, enter = 0, size = 46, style }) => {
  const frame = useCurrentFrame();
  const t = progress(frame, enter, 20);
  return <div style={{ fontFamily: FONT.heading, fontWeight: 600, fontSize: size, lineHeight: 1.2, color: COLOR.text, opacity: t, transform: `translateY(${(1 - t) * 18}px)`, ...style }}>{children}</div>;
};

export { CAM };
