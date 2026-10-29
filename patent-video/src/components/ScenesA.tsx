import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { COLOR, FONT, LAYER_COLOR, RISK_COLOR, SAFE } from "../theme";
import { clamp01, easeInOut, progress, rand } from "../lib/anim";
import { Icon, IconBox, IconName } from "./icons";
import { Label, SeriesChart } from "./Widgets";
import dataset from "../../public/data/dataset.json";
import sensors from "../../public/data/sensors.json";
import pre from "../../public/data/preprocess-sample.json";
import timeline from "../../public/data/event-timeline.json";
import reading from "../../public/data/reading.json";

/* ---------- Cold open: real satellite imagery of the JH-UG site ---------- */

const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
/** Pixel position in public/site/sat-site.jpg (2560², Mapbox bbox fit) for a lat/lon */
const sitePx = (lat: number, lon: number) => {
  const half = 0.03;
  const ppu = 2560 / (merc(dataset.lat + half) - merc(dataset.lat - half));
  return { x: 1280 + (((lon - dataset.lon) * Math.PI) / 180) * ppu, y: 1280 - (merc(lat) - merc(dataset.lat)) * ppu };
};

export const SiteHero: React.FC<{ crackAt: number; pinsAt: number }> = ({ crackAt, pinsAt }) => {
  const frame = useCurrentFrame();
  const regionOp = 1 - progress(frame, 40, 40, easeInOut);
  const districtOp = 1 - progress(frame, 120, 40, easeInOut);
  const zoomR = interpolate(frame, [0, 80], [1.0, 1.6], { extrapolateRight: "clamp" });
  const zoomD = interpolate(frame, [40, 160], [1.0, 1.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const zoomS = interpolate(frame, [120, 520], [1.05, 1.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shake = frame > crackAt && frame < crackAt + 18 ? Math.sin(frame * 2.3) * 3 * (1 - (frame - crackAt) / 18) : 0;
  const crack = progress(frame, crackAt, 26);
  const pts = dataset.patchCoords.map((p) => ({ ...p, ...sitePx(p.lat, p.lon) }));
  const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  const crackPath = "M -170 -40 L -120 -22 L -96 -36 L -40 -8 L -10 -18 L 40 10 L 72 2 L 118 30 L 170 24";

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
        <Img src={staticFile("site/sat-site.jpg")} style={{ position: "absolute", left: 960 - cx, top: 540 - cy, width: 2560, height: 2560, transformOrigin: `${cx}px ${cy}px`, transform: `scale(${zoomS * 0.75})`, filter: "saturate(0.85) contrast(1.05)" }} />
        <Img src={staticFile("site/sat-district.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: districtOp, transform: `scale(${zoomD})` }} />
        <Img src={staticFile("site/sat-region.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: regionOp, transform: `scale(${zoomR})` }} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <g transform={`translate(960 ${540 + 40}) scale(${0.75 * zoomS})`}>
            <path d={crackPath} fill="none" stroke="#FDE68A" strokeWidth={2.4 / (0.75 * zoomS)} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - crack} opacity={0.95} />
            {crack > 0.9 &&
              Array.from({ length: 10 }, (_, i) => {
                const age = frame - crackAt - 24;
                const x = -120 + rand(i) * 260;
                return <circle key={i} cx={x} cy={-10 + rand(i + 9) * 30 + Math.max(0, age) * (1 + rand(i + 3) * 1.5)} r={2 / (0.75 * zoomS)} fill="#E7D9B8" opacity={clamp01(1 - age / 40)} />;
              })}
          </g>
          {pts.map((p, i) => {
            const pop = progress(frame, pinsAt + i * 5, 14);
            const sx = 960 + (p.x - cx) * 0.75 * zoomS;
            const sy = 540 + (p.y - cy) * 0.75 * zoomS;
            return (
              <g key={p.id} opacity={pop}>
                <circle cx={sx} cy={sy} r={10 + 14 * ((frame % 45) / 45)} fill="none" stroke={COLOR.amber} strokeWidth={2} opacity={1 - (frame % 45) / 45} />
                <circle cx={sx} cy={sy} r={7} fill={COLOR.amber} stroke="#000" strokeWidth={2} />
                {i % 2 === 0 && (
                  <text x={sx + 16} y={sy - 12} fontFamily={FONT.mono} fontWeight={700} fontSize={20} fill="#FDE68A" stroke="#000" strokeWidth={4} paintOrder="stroke">
                    {p.id}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)" }} />
      <div style={{ position: "absolute", left: SAFE.x, bottom: 150, fontFamily: FONT.mono, fontSize: 18, color: "#E2E8F0", textShadow: "0 1px 6px #000", lineHeight: 1.6, opacity: progress(frame, 10, 20) }}>
        JHARIA COALFIELD · DHANBAD, JHARKHAND
        <br />
        <span style={{ color: "#94A3B8", fontSize: 15 }}>
          {dataset.lat.toFixed(2)}° N, {dataset.lon.toFixed(2)}° E · imagery © Mapbox © OpenStreetMap
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Overview: how the 18 claims depend on each other ---------- */

export const CLAIM_SHORT: Record<number, string> = {
  1: "Complete system",
  2: "Sensing elements",
  3: "Time synchronisation",
  4: "Preprocessing",
  5: "Model families",
  6: "Named models",
  7: "Ensemble prediction",
  8: "Continuous risk score",
  9: "Hazard levels",
  10: "Alert outputs",
  11: "Communication tech",
  12: "Publish / subscribe",
  13: "Offline operation",
  14: "Selective sync",
  15: "Remote visualisation",
  16: "Remote modification",
  17: "Deployment sites",
  18: "Method (200)",
};

export const ClaimMap: React.FC<{ enter: number }> = ({ enter }) => {
  const frame = useCurrentFrame();
  const children = [2, 4, 5, 8, 10, 11, 13, 15, 17];
  const grand: Record<number, number[]> = { 2: [3], 5: [6, 7], 8: [9], 11: [12], 13: [14], 15: [16] };
  const rowH = 84;
  const top = 150;
  const rows: { n: number; parent?: number; col: number; row: number }[] = [];
  let r = 0;
  for (const c of children) {
    rows.push({ n: c, parent: 1, col: 1, row: r });
    (grand[c] ?? [c]).forEach((g, i) => {
      if (g !== c) rows.push({ n: g, parent: c, col: 2, row: r + i });
    });
    r += Math.max(1, grand[c]?.length ?? 1);
  }
  const colX = [130, 640, 1220];
  const w = 430;
  const h = 62;
  const pos = (col: number, row: number) => ({ x: colX[col], y: top + row * rowH * 0.88 });
  const root = { x: colX[0], y: top + ((r - 1) * rowH * 0.88) / 2 };
  const node = (n: number, x: number, y: number, delay: number, accent = COLOR.brand) => {
    const t = progress(frame, enter + delay, 16);
    return (
      <g key={n} opacity={t} transform={`translate(${(1 - t) * -16} 0)`}>
        <rect x={x} y={y} width={w} height={h} rx={14} fill={COLOR.panelSolid} stroke={`${accent}aa`} strokeWidth={2} />
        <text x={x + 22} y={y + 40} fontFamily={FONT.mono} fontWeight={700} fontSize={24} fill={accent}>
          {String(n).padStart(2, "0")}
        </text>
        <text x={x + 76} y={y + 40} fontFamily={FONT.body} fontWeight={500} fontSize={25} fill={COLOR.text}>
          {CLAIM_SHORT[n]}
        </text>
      </g>
    );
  };
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {rows.map((it, i) => {
        const p = pos(it.col, it.row);
        const from = it.col === 1 ? root : pos(1, rows.find((x) => x.n === it.parent)!.row);
        const t = progress(frame, enter + 6 + i * 3, 14);
        const x1 = from.x + w;
        const y1 = from.y + h / 2;
        const x2 = p.x;
        const y2 = p.y + h / 2;
        return <path key={`e${it.n}`} d={`M${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2} ${y2}`} fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth={2} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} />;
      })}
      {node(1, root.x, root.y, 0)}
      {rows.map((it, i) => node(it.n, pos(it.col, it.row).x, pos(it.col, it.row).y, 6 + i * 3))}
      {node(18, colX[0], top + r * rowH * 0.88 - h, 70, COLOR.amber)}
      <text x={colX[0]} y={top - 40} fontFamily={FONT.mono} fontSize={18} letterSpacing={3} fill={COLOR.dim} opacity={progress(frame, enter, 16)}>
        18 CLAIMS · 17 SYSTEM (100) · 1 METHOD (200)
      </text>
    </svg>
  );
};

/* ---------- Claim 1: each layer of the claim mapped to the prototype ---------- */

export const LayerMap: React.FC<{ enter: number }> = ({ enter }) => {
  const frame = useCurrentFrame();
  const rows: { n: string; name: string; tech: string; icon: IconName }[] = [
    { n: "101", name: "Sensor layer", tech: "Simulated sensor dataset of five JH-UG patches (5-minute readings)", icon: "vibration" },
    { n: "102", name: "Communication layer", tech: "HTTP / REST and WebSocket (Socket.io) over Wi-Fi and wired networks", icon: "antenna" },
    { n: "103", name: "Edge computing layer", tech: "Python FastAPI inference service (XGBoost + LSTM) and Node.js backend", icon: "chip" },
    { n: "104", name: "Data storage layer", tech: "PostgreSQL with the TimescaleDB extension", icon: "database" },
    { n: "105", name: "Application layer", tech: "React web dashboard and React Native (Expo) mobile app", icon: "monitor" },
  ];
  return (
    <div style={{ position: "absolute", left: SAFE.x + 40, top: 170, width: 1650 }}>
      <Label style={{ opacity: progress(frame, enter, 14) }}>In the RockShield prototype</Label>
      {rows.map((row, i) => {
        const t = progress(frame, enter + 8 + i * 10, 18);
        const color = LAYER_COLOR[row.n];
        return (
          <div key={row.n} style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 24, opacity: t, transform: `translateX(${(1 - t) * -30}px)` }}>
            <div style={{ width: 88, fontFamily: FONT.mono, fontWeight: 700, fontSize: 28, color, padding: "8px 0", textAlign: "center", border: `2px solid ${color}`, borderRadius: 26, background: `${color}1f` }}>{row.n}</div>
            <IconBox name={row.icon} size={46} color={color} />
            <div style={{ width: 380, fontFamily: FONT.body, fontWeight: 600, fontSize: 31, color: COLOR.text }}>{row.name}</div>
            <svg width={60} height={20}>
              <path d="M2 10 H48 M40 3 L50 10 L40 17" stroke={COLOR.dim} strokeWidth={2.5} fill="none" />
            </svg>
            <div style={{ flex: 1, fontFamily: FONT.body, fontSize: 28, color: COLOR.dim }}>{row.tech}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Claim 2: sensing elements, with real sparklines where the dataset has them ---------- */

const SENSOR_CARDS: { name: string; icon: IconName; column?: string }[] = [
  { name: "Strain", icon: "strain", column: "strain_microstrain" },
  { name: "Vibration", icon: "vibration", column: "vibration_hz" },
  { name: "Pore pressure", icon: "pore", column: "pore_pressure_kpa" },
  { name: "Temperature", icon: "temperature", column: "temperature_c" },
  { name: "Humidity", icon: "humidity", column: "humidity_pct" },
  { name: "Rainfall", icon: "rain", column: "rain_A24" },
  { name: "Soil moisture", icon: "groundwater" },
  { name: "Gas (methane)", icon: "gas", column: "methane_ppm" },
  { name: "Displacement", icon: "displacement", column: "displacement_mm" },
  { name: "Tilt", icon: "tilt" },
  { name: "Groundwater level", icon: "groundwater" },
  { name: "Acoustic emission", icon: "acoustic" },
];

const Spark: React.FC<{ values: (number | null)[]; color: string; width: number; height: number; reveal: number }> = ({ values, color, width, height, reveal }) => {
  const v = values.filter((x): x is number => x !== null);
  const min = Math.min(...v);
  const max = Math.max(...v);
  const d = values
    .map((x, i) => (x === null ? null : `${i === 0 ? "M" : "L"}${((i / (values.length - 1)) * width).toFixed(1)} ${(height - ((x - min) / (max - min || 1)) * height).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={2.2} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - reveal} />
    </svg>
  );
};

export const SensorGrid: React.FC<{ enter: number; emphasise?: { at: number; names: string[] } }> = ({ enter, emphasise }) => {
  const frame = useCurrentFrame();
  const em = emphasise && frame >= emphasise.at ? progress(frame, emphasise.at, 14) : 0;
  return (
    <div style={{ position: "absolute", left: SAFE.x, top: 150, width: 1728, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
      {SENSOR_CARDS.map((s, i) => {
        const t = progress(frame, enter + i * 4, 16);
        const series = sensors.find((x) => x.column === s.column);
        const real = !!series;
        const dim = emphasise && em > 0 && !emphasise.names.includes(s.name) ? 1 - 0.6 * em : 1;
        const color = real ? LAYER_COLOR["101"] : COLOR.violet;
        return (
          <div key={s.name} style={{ height: 190, borderRadius: 16, padding: "18px 20px", background: COLOR.panelSolid, border: `1px solid ${real ? "rgba(251,191,36,0.35)" : "rgba(167,139,250,0.35)"}`, opacity: t * dim, transform: `translateY(${(1 - t) * 20}px)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <IconBox name={s.icon} size={36} color={color} />
              <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 25, color: COLOR.text }}>{s.name}</div>
            </div>
            <div style={{ marginTop: 22, height: 70 }}>
              {series ? (
                <Spark values={series.values} color={color} width={370} height={64} reveal={progress(frame, enter + 10 + i * 4, 30)} />
              ) : (
                <div style={{ height: 64, borderRadius: 10, border: "1px dashed rgba(167,139,250,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.body, fontSize: 18, color: "#C4B5FD" }}>claimed embodiment</div>
              )}
            </div>
            <div style={{ marginTop: 8, fontFamily: FONT.mono, fontSize: 15, color: COLOR.faint }}>{series ? `${series.column} · ${series.unit} · 12 h` : "not in the prototype dataset"}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Why water matters: rain soaks in, pore pressure rises, the slope loses grip (concept) */
export const RainConcept: React.FC<{ enter: number }> = ({ enter }) => {
  const frame = useCurrentFrame();
  const f = frame - enter;
  const water = clamp01(f / 140);
  const gauge = water;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5B4636" />
          <stop offset="1" stopColor="#2E241C" />
        </linearGradient>
      </defs>
      <path d="M200 860 L760 420 L1240 420 L1240 860 Z" fill="url(#soil)" stroke="#8C7461" strokeWidth={2} />
      <path d={`M200 860 L760 420 L1240 420 L1240 ${860 - water * 260} L${200 + 330 * water} ${860 - water * 260} Z`} fill="rgba(56,189,248,0.0)" />
      <path d={`M240 860 Q 700 ${860 - 300 * water} 1240 ${700 - 200 * water}`} fill="none" stroke={COLOR.sky} strokeWidth={3} strokeDasharray="10 8" opacity={0.85} />
      <text x={1050} y={700 - 210 * water - 16} fontFamily={FONT.body} fontSize={22} fill={COLOR.sky}>
        water table rises
      </text>
      {Array.from({ length: 60 }, (_, i) => {
        const x = 220 + rand(i) * 1000;
        const y = ((f * (14 + rand(i + 4) * 6) + rand(i + 2) * 600) % 420) + 20;
        return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 22} stroke="#93C5FD" strokeWidth={2} opacity={0.55} />;
      })}
      {Array.from({ length: 9 }, (_, i) => {
        const x = 420 + i * 90;
        const y = 820 - (i % 3) * 70;
        const p = 10 + gauge * 18;
        return (
          <g key={i} opacity={0.9}>
            <circle cx={x} cy={y} r={14} fill="#1E293B" stroke="#94A3B8" />
            {[0, 90, 180, 270].map((a) => (
              <line key={a} x1={x} y1={y} x2={x + Math.cos((a * Math.PI) / 180) * p} y2={y + Math.sin((a * Math.PI) / 180) * p} stroke={COLOR.sky} strokeWidth={2} />
            ))}
          </g>
        );
      })}
      <g transform="translate(1400 380)">
        <rect width={380} height={300} rx={18} fill={COLOR.panelSolid} stroke={COLOR.line} />
        <text x={28} y={52} fontFamily={FONT.body} fontWeight={600} fontSize={26} fill={COLOR.text}>
          Pore pressure
        </text>
        <rect x={28} y={84} width={324} height={22} rx={11} fill="#1E293B" />
        <rect x={28} y={84} width={324 * (0.2 + 0.75 * gauge)} height={22} rx={11} fill={gauge > 0.7 ? COLOR.red : COLOR.amber} />
        <text x={28} y={150} fontFamily={FONT.body} fontWeight={600} fontSize={26} fill={COLOR.text}>
          Effective strength
        </text>
        <rect x={28} y={182} width={324} height={22} rx={11} fill="#1E293B" />
        <rect x={28} y={182} width={324 * (0.95 - 0.6 * gauge)} height={22} rx={11} fill={COLOR.green} />
        <text x={28} y={262} fontFamily={FONT.body} fontSize={20} fill={COLOR.dim}>
          long before the slope moves
        </text>
      </g>
    </svg>
  );
};

/** Real rows from the simulated dataset (the reading followed through the video) */
export const DatasetTable: React.FC<{ enter: number }> = ({ enter }) => {
  const frame = useCurrentFrame();
  const cols = ["pore_pressure_kpa", "strain_microstrain", "displacement_mm", "vibration_hz", "rain_A24"] as const;
  const rows = timeline.steps.slice(timeline.firstHigh - 7, timeline.firstHigh + 1);
  return (
    <div style={{ position: "absolute", left: SAFE.x, top: 190, width: 1728 }}>
      <Label>{`Simulated sensor dataset · ${timeline.patch} · one reading every ${timeline.intervalMinutes} minutes`}</Label>
      <div style={{ marginTop: 22, borderRadius: 14, overflow: "hidden", border: `1px solid ${COLOR.line}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "300px repeat(5, 1fr)", background: "#162036", fontFamily: FONT.mono, fontSize: 21, color: LAYER_COLOR["101"] }}>
          {["timestamp", ...cols].map((c) => (
            <div key={c} style={{ padding: "16px 18px" }}>
              {c}
            </div>
          ))}
        </div>
        {rows.map((row, i) => {
          const t = progress(frame, enter + 6 + i * 4, 12);
          return (
            <div key={row.t} style={{ display: "grid", gridTemplateColumns: "300px repeat(5, 1fr)", background: i % 2 ? COLOR.panelSolid : "#0E1626", fontFamily: FONT.mono, fontSize: 22, color: COLOR.text, opacity: t }}>
              <div style={{ padding: "13px 18px", color: COLOR.dim }}>{row.t}</div>
              {cols.map((c) => (
                <div key={c} style={{ padding: "13px 18px" }}>
                  {row.sensors[c]?.toFixed(2) ?? "-"}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- Claim 3: three clocks snapping onto one timeline ---------- */

export const TimeTracks: React.FC<{ enter: number; mismatchAt: number; snapAt: number }> = ({ enter, mismatchAt, snapAt }) => {
  const frame = useCurrentFrame();
  const snap = progress(frame, snapAt, 30, easeInOut);
  const tracks = [
    { name: "Sensor node", sub: "every 5 min", color: LAYER_COLOR["101"], step: 60, offset: 23, icon: "vibration" as IconName },
    { name: "Weather", sub: "rainfall aggregates", color: COLOR.sky, step: 120, offset: 61, icon: "rain" as IconName },
    { name: "Terrain (DEM)", sub: "static per patch", color: COLOR.violet, step: 0, offset: 0, icon: "mountain" as IconName },
  ];
  const x0 = 520;
  const width = 1260;
  const mismatch = progress(frame, mismatchAt, 16) * (1 - snap);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {tracks.map((tr, i) => {
        const y = 290 + i * 200;
        const t = progress(frame, enter + i * 8, 18);
        return (
          <g key={tr.name} opacity={t}>
            <Icon name={tr.icon} x={SAFE.x + 10} y={y - 30} size={56} color={tr.color} />
            <text x={SAFE.x + 90} y={y - 4} fontFamily={FONT.body} fontWeight={600} fontSize={28} fill={COLOR.text}>
              {tr.name}
            </text>
            <text x={SAFE.x + 90} y={y + 28} fontFamily={FONT.body} fontSize={20} fill={COLOR.dim}>
              {tr.sub}
            </text>
            <line x1={x0} x2={x0 + width} y1={y} y2={y} stroke={COLOR.lineStrong} strokeWidth={2} />
            {tr.step === 0 ? (
              <rect x={x0} y={y - 16} width={width} height={32} rx={8} fill={`${tr.color}26`} stroke={`${tr.color}77`} />
            ) : (
              Array.from({ length: Math.floor(width / tr.step) + 1 }, (_, k) => {
                const x = x0 + k * tr.step + tr.offset * (1 - snap);
                return x <= x0 + width ? <rect key={k} x={x - 4} y={y - 22} width={8} height={44} rx={4} fill={tr.color} /> : null;
              })
            )}
          </g>
        );
      })}
      {Array.from({ length: Math.floor(width / 120) + 1 }, (_, k) => (
        <line key={k} x1={x0 + k * 120} x2={x0 + k * 120} y1={230} y2={720} stroke={COLOR.text} strokeOpacity={0.18 * snap} strokeDasharray="4 6" />
      ))}
      <g opacity={mismatch}>
        <rect x={x0 + 300} y={760} width={720} height={96} rx={14} fill="#2A1216" stroke={`${COLOR.red}88`} />
        <text x={x0 + 330} y={818} fontFamily={FONT.body} fontSize={26} fill="#FCA5A5">
          Rain and strain an hour apart → wrong cause and effect
        </text>
      </g>
      <g opacity={snap}>
        <rect x={x0 + 300} y={760} width={720} height={96} rx={14} fill="#0F2A22" stroke={`${COLOR.green}88`} />
        <text x={x0 + 330} y={818} fontFamily={FONT.body} fontSize={26} fill="#6EE7B7">
          Joined on one shared timestamp before prediction
        </text>
      </g>
    </svg>
  );
};

/* ---------- Claim 4: real raw data cleaned stage by stage ---------- */

export const PreprocessScene: React.FC<{ beats: { raw: number; fill: number; outlier: number; smooth: number; scale: number; features: number } }> = ({ beats }) => {
  const frame = useCurrentFrame();
  const raw = pre.raw as (number | null)[];
  const filled = pre.filled as number[];
  const clean = pre.clean as number[];
  const norm = pre.normalized as number[];
  const vals = filled.filter((v) => v !== null);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  const lo = Math.min(...vals) - 2;
  const hi = Math.max(...vals) + 2;
  const stage = frame >= beats.features ? 5 : frame >= beats.scale ? 4 : frame >= beats.smooth ? 3 : frame >= beats.outlier ? 2 : frame >= beats.fill ? 1 : 0;
  const stages = ["Raw readings", "Gaps filled", "Spikes rejected", "Smoothed", "Scaled", "Features"];
  const fillOp = progress(frame, beats.fill, 14) * (1 - progress(frame, beats.smooth, 14) * 0.7);
  const smoothOp = progress(frame, beats.smooth, 20);
  const missing = raw.filter((v) => v === null).length;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: SAFE.x, top: 150, display: "flex", gap: 14 }}>
        {stages.map((s, i) => (
          <div key={s} style={{ padding: "10px 18px", borderRadius: 22, fontFamily: FONT.body, fontWeight: 600, fontSize: 21, color: i <= stage ? "#fff" : COLOR.faint, background: i === stage ? COLOR.brand : i < stage ? "rgba(79,107,255,0.25)" : "rgba(148,163,184,0.08)", border: `1px solid ${i <= stage ? COLOR.brand : COLOR.line}` }}>
            {i + 1}. {s}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: SAFE.x, top: 250 }}>
        <Label>{`Vibration (Hz) · raw test data · ${Math.round((pre.missingShare as number) * 100)}% of readings missing · ${missing} gaps in this window`}</Label>
        <div style={{ marginTop: 10 }}>
          <SeriesChart
            width={stage >= 4 ? 1100 : 1728}
            height={560}
            yMin={lo}
            yMax={hi}
            series={[
              { values: raw, color: "rgba(251,191,36,0.85)", width: 2 },
              ...(fillOp > 0 ? [{ values: filled.map((v, i) => (raw[i] === null ? v : null)), color: `rgba(56,189,248,${fillOp})`, width: 3 }] : []),
              ...(smoothOp > 0 ? [{ values: clean, color: `rgba(16,185,129,${smoothOp})`, width: 4 }] : []),
            ]}
            reveal={progress(frame, beats.raw, 40)}
            bands={stage >= 2 ? [{ from: mean + 4 * sd, to: hi, color: COLOR.red, label: "reject above z = 4" }] : []}
          />
        </div>
      </div>
      {stage >= 4 && (
        <div style={{ position: "absolute", left: 1270, top: 280, width: 560, opacity: progress(frame, beats.scale, 16) }}>
          <Label>Scaled for the sequence model</Label>
          <SeriesChart width={560} height={300} yMin={-3} yMax={3} series={[{ values: norm, color: COLOR.brandSoft, width: 3 }]} />
          {stage >= 5 && (
            <div style={{ marginTop: 20, opacity: progress(frame, beats.features, 16) }}>
              <Label>Rates of change added</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                {["fs_rate", "pore_pressure_kpa_rate", "displacement_mm_rate", "strain_microstrain_rate"].map((c) => (
                  <div key={c} style={{ fontFamily: FONT.mono, fontSize: 18, color: COLOR.text, padding: "8px 12px", borderRadius: 8, background: "rgba(79,107,255,0.18)", border: `1px solid ${COLOR.brand}` }}>
                    {c}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, fontFamily: FONT.body, fontSize: 24, color: COLOR.text }}>→ one 38-feature vector per moment</div>
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ---------- Claim 5 and 6: model families and how two of them work ---------- */

export const ModelFamilies: React.FC<{ enter: number; pickAt: number }> = ({ enter, pickAt }) => {
  const frame = useCurrentFrame();
  const fam: { name: string; icon: IconName; used: boolean }[] = [
    { name: "Temporal sequence", icon: "lstm", used: true },
    { name: "Feature-based", icon: "tree", used: true },
    { name: "Ensemble", icon: "ensemble", used: true },
    { name: "Probabilistic", icon: "gauge", used: false },
    { name: "Statistical", icon: "monitor", used: false },
    { name: "Deep learning", icon: "layers", used: false },
  ];
  const pick = progress(frame, pickAt, 18);
  return (
    <div style={{ position: "absolute", left: SAFE.x, right: SAFE.x, top: 300, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 22 }}>
      {fam.map((m, i) => {
        const t = progress(frame, enter + i * 5, 16);
        const op = m.used ? 1 : 1 - 0.55 * pick;
        const lift = m.used ? -24 * pick : 0;
        return (
          <div key={m.name} style={{ height: 300, borderRadius: 18, background: COLOR.panelSolid, border: `2px solid ${m.used && pick > 0 ? COLOR.brand : COLOR.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, opacity: t * op, transform: `translateY(${(1 - t) * 24 + lift}px)` }}>
            <IconBox name={m.icon} size={80} color={m.used ? COLOR.brandSoft : COLOR.dim} />
            <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 26, color: COLOR.text, textAlign: "center", padding: "0 12px" }}>{m.name}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 15, color: m.used ? COLOR.green : "#C4B5FD", opacity: pick }}>{m.used ? "in the prototype" : "claimed"}</div>
          </div>
        );
      })}
    </div>
  );
};

export const ModelGlyphs: React.FC<{ enter: number }> = ({ enter }) => {
  const frame = useCurrentFrame();
  const f = frame - enter;
  const cells = 8;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <text x={SAFE.x} y={210} fontFamily={FONT.body} fontWeight={600} fontSize={34} fill={COLOR.text}>
        LSTM: slow build-ups over time
      </text>
      <text x={SAFE.x} y={250} fontFamily={FONT.body} fontSize={22} fill={COLOR.dim}>
        reads eight readings in order and carries a memory forward
      </text>
      {Array.from({ length: cells }, (_, i) => {
        const x = SAFE.x + i * 210;
        const on = progress(f, i * 8, 12);
        const v = timeline.steps[timeline.firstHigh - 7 + i]?.sensors.pore_pressure_kpa ?? 0;
        return (
          <g key={i} opacity={0.35 + 0.65 * on}>
            <rect x={x} y={300} width={150} height={110} rx={16} fill={COLOR.panelSolid} stroke={COLOR.brandSoft} strokeWidth={2} />
            <text x={x + 75} y={346} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={COLOR.dim}>
              t−{7 - i}
            </text>
            <text x={x + 75} y={384} textAnchor="middle" fontFamily={FONT.mono} fontSize={22} fill={COLOR.text}>
              {v.toFixed(1)}
            </text>
            {i < cells - 1 && <path d={`M${x + 150} 355 h56`} stroke={COLOR.brandSoft} strokeWidth={3} />}
          </g>
        );
      })}
      <path d={`M${SAFE.x + 75} 440 H ${SAFE.x + 75 + 210 * 7 * clamp01(f / 70)}`} stroke={COLOR.amber} strokeWidth={4} />
      <text x={SAFE.x} y={480} fontFamily={FONT.mono} fontSize={18} fill={COLOR.amber}>
        memory carried across the window (pore pressure, kPa)
      </text>

      <text x={SAFE.x} y={620} fontFamily={FONT.body} fontWeight={600} fontSize={34} fill={COLOR.text}>
        XGBoost: sharp combinations at one moment
      </text>
      <text x={SAFE.x} y={660} fontFamily={FONT.body} fontSize={22} fill={COLOR.dim}>
        300 small decision trees, each correcting the last, over 38 features
      </text>
      {Array.from({ length: 5 }, (_, k) => {
        const x0 = SAFE.x + 60 + k * 330;
        const g = progress(f, 30 + k * 10, 20);
        const node = (x: number, y: number, r = 14) => <circle cx={x} cy={y} r={r} fill={COLOR.panelSolid} stroke={COLOR.brandSoft} strokeWidth={2.5} />;
        return (
          <g key={k} opacity={g}>
            <path d={`M${x0 + 110} 720 L${x0 + 50} 800 M${x0 + 110} 720 L${x0 + 170} 800 M${x0 + 50} 800 L${x0 + 15} 880 M${x0 + 50} 800 L${x0 + 85} 880 M${x0 + 170} 800 L${x0 + 205} 880`} stroke={COLOR.brandSoft} strokeWidth={2.5} />
            {node(x0 + 110, 720, 16)}
            {node(x0 + 50, 800)}
            {node(x0 + 170, 800)}
            {node(x0 + 15, 880, 10)}
            {node(x0 + 85, 880, 10)}
            {node(x0 + 205, 880, 10)}
            {k < 4 && (
              <text x={x0 + 280} y={810} fontFamily={FONT.heading} fontSize={40} fill={COLOR.dim}>
                +
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

/* ---------- Claim 7: two opinions merged into one prediction (real numbers) ---------- */

export const EnsembleFlow: React.FC<{ lstmAt: number; xgbAt: number; mergeAt: number }> = ({ lstmAt, xgbAt, mergeAt }) => {
  const frame = useCurrentFrame();
  const win = timeline.steps.slice(timeline.firstHigh - 7, timeline.firstHigh + 1);
  const l = progress(frame, lstmAt, 20);
  const x = progress(frame, xgbAt, 20);
  const m = progress(frame, mergeAt, 20);
  const box = (label: string, value: number, show: number, top: number) => (
    <div style={{ position: "absolute", left: 1010, top, width: 300, height: 150, borderRadius: 18, background: COLOR.panelSolid, border: `2px solid ${COLOR.brand}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: show }}>
      <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 30, color: COLOR.text }}>{label}</div>
      <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 40, color: COLOR.brandSoft, opacity: progress(frame, (label === "LSTM" ? lstmAt : xgbAt) + 24, 14) }}>{value.toFixed(3)}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: SAFE.x, top: 200, opacity: l }}>
        <Label>Last 8 readings · 40 minutes · {timeline.patch}</Label>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          {win.map((s, i) => (
            <div key={s.t} style={{ width: 96, height: 92, borderRadius: 12, background: COLOR.panelSolid, border: `1px solid ${COLOR.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: progress(frame, lstmAt + i * 3, 10) }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 16, color: COLOR.dim }}>{s.t.slice(11)}</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 18, color: COLOR.text, marginTop: 6 }}>{s.sensors.pore_pressure_kpa?.toFixed(0)}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: SAFE.x, top: 560, width: 860, opacity: x }}>
        <Label>Current reading · 38 features</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(13, 1fr)", gap: 8, marginTop: 14 }}>
          {Array.from({ length: 38 }, (_, i) => (
            <div key={i} style={{ height: 40, borderRadius: 6, background: `rgba(79,107,255,${0.15 + 0.5 * rand(i)})`, opacity: progress(frame, xgbAt + i, 8) }} />
          ))}
        </div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d="M955 305 H1005" stroke={COLOR.dim} strokeWidth={3} opacity={l} />
        <path d="M960 655 H1005" stroke={COLOR.dim} strokeWidth={3} opacity={x} />
        <path d="M1310 305 C 1400 305, 1400 480, 1460 480 M1310 655 C 1400 655, 1400 480, 1460 480" fill="none" stroke={COLOR.dim} strokeWidth={3} opacity={m} />
      </svg>
      {box("LSTM", reading.lstm, l, 230)}
      {box("XGBoost", reading.xgb, x, 580)}
      <div style={{ position: "absolute", left: 1470, top: 360, width: 360, padding: 26, borderRadius: 18, background: "#1A1F3A", border: `2px solid ${RISK_COLOR.HIGH}`, opacity: m, transform: `scale(${0.9 + 0.1 * m})` }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: COLOR.dim }}>0.7 × {reading.xgb.toFixed(3)}</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: COLOR.dim }}>+ 0.3 × {reading.lstm.toFixed(3)}</div>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 52, color: COLOR.text, marginTop: 8 }}>{reading.ensemble.toFixed(3)}</div>
        <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 26, letterSpacing: 3, color: RISK_COLOR.HIGH }}>HIGH</div>
      </div>
    </AbsoluteFill>
  );
};
