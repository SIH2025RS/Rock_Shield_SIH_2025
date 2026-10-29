import React from "react";
import { useCurrentFrame } from "remotion";
import { COLOR, FONT, LAYER_COLOR } from "../theme";
import { CameraKey, Pt, cameraAt, clamp01, polylineLength, pointOnPolyline, progress, toPath } from "../lib/anim";
import { Icon, IconName } from "./icons";

/**
 * FIG. 1 of the specification, redrawn as an animated vector world (units = px at scale 1).
 * Every reference numeral from the figure appears; chapters move the camera to their part.
 */

type Box = { x: number; y: number; w: number; h: number };

export const GEO = {
  s101: { x: 150, y: 110, w: 1500, h: 470 },
  n101a: { x: 190, y: 190, w: 650, h: 350 },
  n101b: { x: 960, y: 190, w: 650, h: 350 },
  c102: { x: 190, y: 700, w: 1420, h: 210 },
  e103: { x: 110, y: 1030, w: 1580, h: 500 },
  a: { x: 150, y: 1110, w: 300, h: 380 },
  b: { x: 490, y: 1110, w: 540, h: 380 },
  c: { x: 1070, y: 1110, w: 280, h: 380 },
  d: { x: 1390, y: 1110, w: 260, h: 380 },
  s104: { x: 150, y: 1680, w: 780, h: 310 },
  a105: { x: 990, y: 1680, w: 700, h: 310 },
} satisfies Record<string, Box>;

export const FLOWS = {
  "101c-a": [[515, 540], [515, 700]],
  "101c-b": [[1285, 540], [1285, 700]],
  "102a": [[900, 910], [900, 972], [66, 972], [66, 1300], [150, 1300]],
  "a-b": [[450, 1300], [490, 1300]],
  "b-c": [[1030, 1300], [1070, 1300]],
  "c-d": [[1350, 1300], [1390, 1300]],
  "103f": [[680, 1490], [680, 1680]],
  "103g": [[1210, 1490], [1210, 1680]],
  "103e": [[1690, 1835], [1752, 1835], [1752, 1300], [1650, 1300]],
  "103e-102": [[1752, 1300], [1752, 805], [1610, 805]],
} satisfies Record<string, Pt[]>;

export type FlowId = keyof typeof FLOWS;
export type NodeId = "100" | "101" | "101a" | "101b" | "101c" | "102" | "102a" | "103" | "103a" | "103b" | "103c" | "103d" | "103e" | "103f" | "103g" | "104" | "105";

/** Camera presets (world centre + scale) */
export const CAM = {
  overview: { x: 900, y: 1060, scale: 0.5 },
  top: { x: 900, y: 520, scale: 0.78 },
  sensor: { x: 900, y: 360, scale: 1.08 },
  node101a: { x: 515, y: 365, scale: 1.9 },
  comm: { x: 900, y: 805, scale: 1.15 },
  edge: { x: 900, y: 1290, scale: 1.06 },
  n103a: { x: 300, y: 1300, scale: 2.1 },
  n103b: { x: 760, y: 1300, scale: 1.65 },
  n103c: { x: 1210, y: 1300, scale: 2.1 },
  n103d: { x: 1520, y: 1300, scale: 2.1 },
  bottom: { x: 920, y: 1700, scale: 0.85 },
  storage: { x: 540, y: 1835, scale: 1.55 },
  app: { x: 1340, y: 1835, scale: 1.55 },
  loop: { x: 1160, y: 1400, scale: 0.72 },
};

const FLOW_COLOR: Record<FlowId, string> = {
  "101c-a": LAYER_COLOR["101"],
  "101c-b": LAYER_COLOR["101"],
  "102a": LAYER_COLOR["102"],
  "a-b": LAYER_COLOR["103"],
  "b-c": LAYER_COLOR["103"],
  "c-d": LAYER_COLOR["103"],
  "103f": LAYER_COLOR["104"],
  "103g": LAYER_COLOR["105"],
  "103e": COLOR.orange,
  "103e-102": COLOR.orange,
};

const FLOW_NODE: Record<FlowId, NodeId> = {
  "101c-a": "101c",
  "101c-b": "101c",
  "102a": "102a",
  "a-b": "103",
  "b-c": "103",
  "c-d": "103",
  "103f": "103f",
  "103g": "103g",
  "103e": "103e",
  "103e-102": "103e",
};

/** Internal arrows appear with the node they point into */
const FLOW_REVEAL: Partial<Record<FlowId, NodeId>> = { "a-b": "103b", "b-c": "103c", "c-d": "103d" };
const flowRevealT = (ctx: Ctx, id: FlowId, dur = 16) =>
  ctx.revealAt === undefined ? 1 : progress(ctx.frame, ctx.revealAt + REVEAL[FLOW_REVEAL[id] ?? FLOW_NODE[id]], dur);

/** Build order for the overview reveal: node → delay (frames) */
const REVEAL: Record<NodeId, number> = {
  "100": 150,
  "101": 0,
  "101a": 10,
  "101b": 18,
  "101c": 34,
  "102": 42,
  "102a": 60,
  "103": 68,
  "103a": 80,
  "103b": 88,
  "103c": 96,
  "103d": 104,
  "103f": 116,
  "103g": 120,
  "104": 126,
  "105": 132,
  "103e": 142,
};

export type Fig1Props = {
  camera: CameraKey[];
  /** Frame at which the build-up starts; omit to show the full figure immediately */
  revealAt?: number;
  /** Nodes to emphasise; everything else dims */
  focus?: NodeId[];
  focusAt?: number;
  /** Flows that carry animated packets */
  packets?: FlowId[];
  /** Highlight colour override for focused nodes */
  accent?: string;
  /** Hide (rather than dim) everything outside the focus, for isolated close-ups */
  isolate?: boolean;
};

type Ctx = { frame: number; revealAt?: number; focus?: NodeId[]; focusAt: number; isolate?: boolean };

const appear = (ctx: Ctx, id: NodeId, dur = 22) => (ctx.revealAt === undefined ? 1 : progress(ctx.frame, ctx.revealAt + REVEAL[id], dur));

const dimOf = (ctx: Ctx, ids: NodeId[]) => {
  if (!ctx.focus || ctx.focus.length === 0) return 1;
  const t = progress(ctx.frame, ctx.focusAt, 16);
  const focused = ids.some((id) => ctx.focus!.includes(id));
  return focused ? 1 : 1 - (ctx.isolate ? 1 : 0.7) * t;
};

/** A layer box: in isolate mode it only shows when the layer itself is focused, not just a child */
const layerDim = (ctx: Ctx, layer: NodeId, kids: NodeId[]) => dimOf(ctx, ctx.isolate ? [layer] : [layer, ...kids]);

const isFocused = (ctx: Ctx, id: NodeId) => !!ctx.focus?.includes(id) && ctx.frame >= ctx.focusAt;

const Chip: React.FC<{ x: number; y: number; label: string; color: string; size?: number; glow?: boolean }> = ({ x, y, label, color, size = 24, glow }) => {
  const w = label.length * size * 0.62 + size * 0.9;
  const h = size * 1.55;
  return (
    <g filter={glow ? "url(#f1-glow)" : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={`${color}2b`} stroke={color} strokeWidth={2} />
      <text x={x + w / 2} y={y + h * 0.69} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={size} fill={color}>
        {label}
      </text>
    </g>
  );
};

const LayerBox: React.FC<{ box: Box; color: string; title: string; numeral: string; t: number; dim: number; glow: boolean; dashed?: boolean }> = ({
  box,
  color,
  title,
  numeral,
  t,
  dim,
  glow,
  dashed,
}) => (
  <g opacity={dim}>
    <rect
      x={box.x}
      y={box.y}
      width={box.w}
      height={box.h}
      rx={24}
      fill={`${color}${glow ? "14" : "0a"}`}
      fillOpacity={t}
      stroke={color}
      strokeOpacity={glow ? 0.95 : 0.6}
      strokeWidth={glow ? 3.5 : 2.5}
      pathLength={1}
      strokeDasharray={dashed ? undefined : 1}
      strokeDashoffset={dashed ? undefined : 1 - t}
      filter={glow ? "url(#f1-glow)" : undefined}
    />
    {glow && <rect x={box.x - 9} y={box.y - 9} width={box.w + 18} height={box.h + 18} rx={31} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={2} />}
    <g opacity={clamp01(t * 1.6 - 0.4)}>
      <text x={box.x + 34} y={box.y + 52} fontFamily={FONT.heading} fontWeight={600} fontSize={30} letterSpacing={3} fill={COLOR.text}>
        {title}
      </text>
      <Chip x={box.x + 34 + title.length * 23.4 + 18} y={box.y + 24} label={numeral} color={color} glow={glow} />
    </g>
  </g>
);

const NodeBox: React.FC<{
  box: Box;
  color: string;
  numeral: string;
  title: string[];
  icons: IconName[];
  foot: string[];
  t: number;
  dim: number;
  glow: boolean;
  dashed?: boolean;
  children?: React.ReactNode;
}> = ({ box, color, numeral, title, icons, foot, t, dim, glow, dashed, children }) => (
  <g opacity={dim * t} transform={`translate(0 ${(1 - t) * 24})`}>
    <rect
      x={box.x}
      y={box.y}
      width={box.w}
      height={box.h}
      rx={18}
      fill={COLOR.panelSolid}
      fillOpacity={0.92}
      stroke={color}
      strokeOpacity={glow ? 1 : 0.55}
      strokeWidth={glow ? 3.5 : 2}
      strokeDasharray={dashed ? "10 8" : undefined}
      filter={glow ? "url(#f1-glow)" : undefined}
    />
    {glow && <rect x={box.x - 8} y={box.y - 8} width={box.w + 16} height={box.h + 16} rx={25} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={2} />}
    <Chip x={box.x + 20} y={box.y + 20} label={numeral} color={color} size={22} glow={glow} />
    {title.map((line, i) => (
      <text key={i} x={box.x + box.w / 2} y={box.y + 104 + i * 32} textAnchor="middle" fontFamily={FONT.body} fontWeight={600} fontSize={27} fill={COLOR.text}>
        {line}
      </text>
    ))}
    {icons.map((name, i) => {
      const size = 64;
      const total = icons.length * size + (icons.length - 1) * 26;
      return <Icon key={name} name={name} x={box.x + box.w / 2 - total / 2 + i * (size + 26)} y={box.y + 104 + title.length * 32} size={size} color={color} strokeWidth={1.6} />;
    })}
    {foot.map((line, i) => (
      <text key={i} x={box.x + box.w / 2} y={box.y + box.h - 30 - (foot.length - 1 - i) * 26} textAnchor="middle" fontFamily={FONT.body} fontSize={20} fill={COLOR.dim}>
        {line}
      </text>
    ))}
    {children}
  </g>
);

const SENSORS: { icon: IconName; label: string[] }[] = [
  { icon: "vibration", label: ["Vibration"] },
  { icon: "humidity", label: ["Humidity"] },
  { icon: "pore", label: ["Pore", "pressure"] },
  { icon: "strain", label: ["Strain"] },
  { icon: "gas", label: ["Gas"] },
  { icon: "temperature", label: ["Temperature"] },
  { icon: "rain", label: ["Rainfall /", "moisture"] },
  { icon: "dust", label: ["+ more"] },
];

const SensorNode: React.FC<{ box: Box; numeral: string; title: string; t: number; dim: number; glow: boolean; frame: number; start: number }> = ({
  box,
  numeral,
  title,
  t,
  dim,
  glow,
  frame,
  start,
}) => {
  const color = LAYER_COLOR["101"];
  return (
    <g opacity={dim * t} transform={`translate(0 ${(1 - t) * 20})`}>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={18} fill={COLOR.panelSolid} fillOpacity={0.9} stroke={color} strokeOpacity={glow ? 1 : 0.5} strokeWidth={glow ? 3.5 : 2} filter={glow ? "url(#f1-glow)" : undefined} />
      <text x={box.x + 28} y={box.y + 48} fontFamily={FONT.body} fontWeight={600} fontSize={26} fill={COLOR.text}>
        {title}
      </text>
      <Chip x={box.x + 28 + title.length * 14.6 + 16} y={box.y + 22} label={numeral} color={color} size={21} glow={glow} />
      {SENSORS.map((s, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const tx = box.x + 25 + col * 155;
        const ty = box.y + 75 + row * 135;
        const pop = start < 0 ? 1 : progress(frame, start + i * 3, 14);
        return (
          <g key={s.icon} opacity={pop} transform={`translate(${tx + 67.5} ${ty + 60}) scale(${0.85 + 0.15 * pop}) translate(${-(tx + 67.5)} ${-(ty + 60)})`}>
            <rect x={tx} y={ty} width={135} height={120} rx={14} fill={`${color}0f`} stroke={`${color}40`} strokeWidth={1.5} />
            <Icon name={s.icon} x={tx + 47.5} y={ty + 12} size={40} color={color} strokeWidth={1.7} />
            {s.label.map((line, j) => (
              <text key={j} x={tx + 67.5} y={ty + 78 + j * 22 - (s.label.length - 1) * 8} textAnchor="middle" fontFamily={FONT.body} fontSize={19} fill={COLOR.text}>
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </g>
  );
};

const Flow: React.FC<{ id: FlowId; ctx: Ctx; label?: { text: string; numeral: string; at: Pt; anchor?: "start" | "end" } }> = ({ id, ctx, label }) => {
  const pts = FLOWS[id];
  const node = FLOW_NODE[id];
  const t = flowRevealT(ctx, id);
  const dim = dimOf(ctx, [node]);
  const control = id.startsWith("103e");
  const color = isFocused(ctx, node) ? FLOW_COLOR[id] : control ? `${COLOR.orange}cc` : "rgba(154,167,189,0.75)";
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const angle = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
  return (
    <g opacity={dim}>
      <path
        d={toPath(pts)}
        fill="none"
        stroke={color}
        strokeWidth={isFocused(ctx, node) ? 4.5 : 3}
        strokeLinejoin="round"
        pathLength={control ? undefined : 1}
        strokeDasharray={control ? "12 10" : 1}
        strokeDashoffset={control ? -ctx.frame * 0.8 : 1 - t}
        opacity={control ? t : 1}
      />
      {t > 0.95 && (
        <path
          d="M-16 -9 L0 0 L-16 9 Z"
          fill={color}
          transform={`translate(${end[0]} ${end[1]}) rotate(${(angle * 180) / Math.PI})`}
        />
      )}
      {label && t > 0.6 && (
        <g opacity={clamp01((t - 0.6) / 0.4)}>
          <Chip x={label.anchor === "end" ? label.at[0] - label.numeral.length * 13.6 - 20 : label.at[0]} y={label.at[1] - 18} label={label.numeral} color={control ? COLOR.orange : COLOR.dim} size={22} glow={isFocused(ctx, node)} />
          <text
            x={label.anchor === "end" ? label.at[0] - label.numeral.length * 13.6 - 36 : label.at[0] + label.numeral.length * 13.6 + 36}
            y={label.at[1] + 9}
            textAnchor={label.anchor === "end" ? "end" : "start"}
            fontFamily={FONT.body}
            fontSize={21}
            fill={COLOR.dim}
          >
            {label.text}
          </text>
        </g>
      )}
    </g>
  );
};

const Packets: React.FC<{ id: FlowId; ctx: Ctx; count?: number }> = ({ id, ctx, count = 3 }) => {
  const frame = ctx.frame;
  const shown = ctx.revealAt === undefined ? 1 : progress(frame, ctx.revealAt + REVEAL[FLOW_REVEAL[id] ?? FLOW_NODE[id]] + 16, 12);
  if (shown <= 0) return null;
  const pts = FLOWS[id];
  const len = polylineLength(pts);
  const speed = 5.5;
  const color = FLOW_COLOR[id];
  return (
    <g opacity={shown * dimOf(ctx, [FLOW_NODE[id]])}>
      {Array.from({ length: count }, (_, k) => {
        const t = ((frame * speed) / len + k / count) % 1;
        const [x, y] = pointOnPolyline(pts, t);
        const fade = Math.min(1, t * 6, (1 - t) * 6);
        return (
          <g key={k} opacity={fade}>
            <circle cx={x} cy={y} r={11} fill="none" stroke={color} strokeOpacity={0.45} strokeWidth={2} />
            <circle cx={x} cy={y} r={6} fill={color} />
          </g>
        );
      })}
    </g>
  );
};

export const Fig1World: React.FC<Fig1Props> = ({ camera, revealAt, focus, focusAt = 0, packets = [], accent, isolate }) => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame, camera);
  const ctx: Ctx = { frame, revealAt, focus, focusAt, isolate };
  const vw = 1920 / cam.scale;
  const vh = 1080 / cam.scale;

  const L = (id: NodeId) => LAYER_COLOR[id.slice(0, 3)] ?? COLOR.teal;
  const glow = (id: NodeId) => isFocused(ctx, id);
  const nodeColor = (id: NodeId) => (accent && glow(id) ? accent : L(id));
  const sensorStart = revealAt === undefined ? -1 : revealAt + 16;

  return (
    <svg width={1920} height={1080} viewBox={`${cam.x - vw / 2} ${cam.y - vh / 2} ${vw} ${vh}`} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id="f1-glow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* 100: whole system */}
      <g opacity={appear(ctx, "100") * dimOf(ctx, ["100"])}>
        <text x={1712} y={74} fontFamily={FONT.mono} fontWeight={700} fontSize={34} fill={COLOR.text}>
          100
        </text>
        <path d="M1704 66 C 1680 70, 1662 84, 1652 104" fill="none" stroke={COLOR.text} strokeWidth={2.5} />
      </g>

      {/* Sensor layer (101) */}
      <LayerBox box={GEO.s101} color={nodeColor("101")} title="SENSOR LAYER" numeral="101" t={appear(ctx, "101")} dim={layerDim(ctx, "101", ["101a", "101b"])} glow={glow("101")} />
      <SensorNode box={GEO.n101a} numeral="101a" title="Sensor node 1" t={appear(ctx, "101a")} dim={dimOf(ctx, ["101", "101a"])} glow={glow("101a")} frame={frame} start={sensorStart} />
      <g opacity={appear(ctx, "101b") * dimOf(ctx, ["101"])}>
        <text x={900} y={380} textAnchor="middle" fontFamily={FONT.heading} fontSize={44} fill={COLOR.dim}>
          ···
        </text>
      </g>
      <SensorNode box={GEO.n101b} numeral="101b" title="Sensor node n" t={appear(ctx, "101b")} dim={dimOf(ctx, ["101", "101b"])} glow={glow("101b")} frame={frame} start={sensorStart + 8} />

      <Flow id="101c-a" ctx={ctx} label={{ numeral: "101c", text: "raw data / status", at: [540, 622] }} />
      <Flow id="101c-b" ctx={ctx} label={{ numeral: "101c", text: "raw data / status", at: [1310, 622] }} />

      {/* Communication layer (102) */}
      <LayerBox box={GEO.c102} color={nodeColor("102")} title="COMMUNICATION LAYER" numeral="102" t={appear(ctx, "102")} dim={dimOf(ctx, ["102"])} glow={glow("102")} />
      <g opacity={appear(ctx, "102") * dimOf(ctx, ["102"])}>
        <Icon name="antenna" x={250} y={790} size={92} color={nodeColor("102")} strokeWidth={1.5} />
        {[
          { x: 520, w: 290, label: "MQTT broker", icon: "broker" as IconName },
          { x: 850, w: 400, label: "Reverse telemetry service", icon: "sync" as IconName },
        ].map((b) => (
          <g key={b.label}>
            <rect x={b.x} y={800} width={b.w} height={84} rx={14} fill={COLOR.panelSolid} stroke={`${nodeColor("102")}80`} strokeWidth={2} />
            <Icon name={b.icon} x={b.x + 20} y={822} size={40} color={nodeColor("102")} />
            <text x={b.x + 74} y={851} fontFamily={FONT.body} fontWeight={500} fontSize={24} fill={COLOR.text}>
              {b.label}
            </text>
          </g>
        ))}
      </g>

      <Flow id="102a" ctx={ctx} label={{ numeral: "102a", text: "aggregated data", at: [926, 940] }} />

      {/* Edge computing layer (103) */}
      <LayerBox box={GEO.e103} color={nodeColor("103")} title="EDGE COMPUTING LAYER" numeral="103" t={appear(ctx, "103")} dim={layerDim(ctx, "103", ["103a", "103b", "103c", "103d"])} glow={glow("103")} />
      <NodeBox box={GEO.a} color={nodeColor("103a")} numeral="103a" title={["Data preprocessing", "node"]} icons={["database", "funnel"]} foot={["noise reduction · filtering", "feature extraction"]} t={appear(ctx, "103a")} dim={dimOf(ctx, ["103", "103a"])} glow={glow("103a")} />
      <NodeBox box={GEO.b} color={nodeColor("103b")} numeral="103b" title={["Predictive inference engine"]} icons={[]} foot={["temporal + feature-based models"]} t={appear(ctx, "103b")} dim={dimOf(ctx, ["103", "103b"])} glow={glow("103b")} dashed>
        {[
          { label: "LSTM", icon: "lstm" as IconName },
          { label: "XGBoost", icon: "tree" as IconName },
          { label: "Ensemble", icon: "ensemble" as IconName },
        ].map((m, i) => {
          const x = GEO.b.x + 35 + i * 165;
          const midY = GEO.b.y + 224;
          return (
            <g key={m.label}>
              <rect x={x} y={GEO.b.y + 140} width={140} height={168} rx={14} fill={`${nodeColor("103b")}12`} stroke={`${nodeColor("103b")}70`} strokeWidth={2} />
              <text x={x + 70} y={GEO.b.y + 184} textAnchor="middle" fontFamily={FONT.body} fontWeight={600} fontSize={23} fill={COLOR.text}>
                {m.label}
              </text>
              <Icon name={m.icon} x={x + 40} y={GEO.b.y + 208} size={60} color={nodeColor("103b")} strokeWidth={1.6} />
              {i < 2 && (
                <g fill={COLOR.dim} stroke={COLOR.dim}>
                  <path d={`M${x + 144} ${midY} h12`} strokeWidth={2.5} />
                  <path d={`M${x + 161} ${midY} l-8 -6 v12 z`} stroke="none" />
                </g>
              )}
            </g>
          );
        })}
      </NodeBox>
      <NodeBox box={GEO.c} color={nodeColor("103c")} numeral="103c" title={["Risk assessment", "node"]} icons={["gauge"]} foot={["hazard risk score", "generation"]} t={appear(ctx, "103c")} dim={dimOf(ctx, ["103", "103c"])} glow={glow("103c")} />
      <NodeBox box={GEO.d} color={nodeColor("103d")} numeral="103d" title={["Alert generation", "node"]} icons={["bell"]} foot={["early warning", "& alerting"]} t={appear(ctx, "103d")} dim={dimOf(ctx, ["103", "103d"])} glow={glow("103d")} />
      <Flow id="a-b" ctx={ctx} />
      <Flow id="b-c" ctx={ctx} />
      <Flow id="c-d" ctx={ctx} />

      <Flow id="103f" ctx={ctx} label={{ numeral: "103f", text: "cleaned data, predictions & metadata", at: [706, 1588] }} />
      <Flow id="103g" ctx={ctx} label={{ numeral: "103g", text: "alerts / risk scores", at: [1236, 1588] }} />

      {/* Data storage layer (104) */}
      <LayerBox box={GEO.s104} color={nodeColor("104")} title="DATA STORAGE LAYER" numeral="104" t={appear(ctx, "104")} dim={dimOf(ctx, ["104"])} glow={glow("104")} />
      <g opacity={appear(ctx, "104") * dimOf(ctx, ["104"])}>
        <Icon name="database" x={200} y={1790} size={120} color={nodeColor("104")} strokeWidth={1.4} />
        <text x={380} y={1792} fontFamily={FONT.body} fontWeight={600} fontSize={26} fill={COLOR.text}>
          Time-series database
        </text>
        {["Processed sensor data", "Risk scores & predictions", "Alerts & events", "System metadata"].map((line, i) => (
          <g key={line}>
            <circle cx={392} cy={1830 + i * 38} r={5} fill={nodeColor("104")} />
            <text x={410} y={1838 + i * 38} fontFamily={FONT.body} fontSize={23} fill={COLOR.dim}>
              {line}
            </text>
          </g>
        ))}
      </g>

      {/* Application layer (105) */}
      <LayerBox box={GEO.a105} color={nodeColor("105")} title="APPLICATION LAYER" numeral="105" t={appear(ctx, "105")} dim={dimOf(ctx, ["105"])} glow={glow("105")} />
      <g opacity={appear(ctx, "105") * dimOf(ctx, ["105"])}>
        {[
          { icon: "phone" as IconName, label: ["Mobile app", "interface"], x: 1050 },
          { icon: "monitor" as IconName, label: ["Web dashboard", "interface"], x: 1270 },
          { icon: "users" as IconName, label: ["Users & role-", "based access"], x: 1490 },
        ].map((a) => (
          <g key={a.icon}>
            <Icon name={a.icon} x={a.x + 50} y={1775} size={80} color={nodeColor("105")} strokeWidth={1.5} />
            {a.label.map((line, j) => (
              <text key={j} x={a.x + 90} y={1898 + j * 28} textAnchor="middle" fontFamily={FONT.body} fontSize={22} fill={COLOR.text}>
                {line}
              </text>
            ))}
          </g>
        ))}
      </g>

      {/* Control and configuration commands (103e) */}
      <Flow id="103e" ctx={ctx} label={{ numeral: "103e", text: "control / configuration", at: [1774, 1560] }} />
      <Flow id="103e-102" ctx={ctx} />

      {packets.map((id) => (
        <Packets key={id} id={id} ctx={ctx} />
      ))}
    </svg>
  );
};
