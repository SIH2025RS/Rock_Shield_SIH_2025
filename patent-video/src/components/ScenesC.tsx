import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, FONT, LAYER_COLOR, RISK_COLOR, SAFE } from "../theme";
import { lerp, progress } from "../lib/anim";
import { Label } from "./Widgets";
import { EmblemPlate } from "./TitleCard";
import { APPLICANT, INVENTORS } from "../lib/content";
import { CLAIM_SHORT } from "./ScenesA";
import reading from "../../public/data/reading.json";

/* ---------- Claim 16: remote configuration (illustrative control panel) ---------- */

const Slider: React.FC<{ label: string; from: string; to: string; at: number; a: number; b: number }> = ({ label, from, to, at, a, b }) => {
  const frame = useCurrentFrame();
  const t = progress(frame, at, 30);
  const pos = lerp(a, b, t);
  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT.body, fontSize: 24 }}>
        <span style={{ color: COLOR.text }}>{label}</span>
        <span style={{ fontFamily: FONT.mono, color: t > 0.5 ? COLOR.orange : COLOR.dim }}>{t > 0.5 ? to : from}</span>
      </div>
      <div style={{ position: "relative", height: 10, borderRadius: 5, background: "#1E293B", marginTop: 14 }}>
        <div style={{ width: `${pos * 100}%`, height: 10, borderRadius: 5, background: COLOR.orange }} />
        <div style={{ position: "absolute", left: `calc(${pos * 100}% - 13px)`, top: -8, width: 26, height: 26, borderRadius: 13, background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }} />
      </div>
    </div>
  );
};

export const ControlPanel: React.FC<{ enter: number; thresholdAt: number }> = ({ enter, thresholdAt }) => {
  const frame = useCurrentFrame();
  const t = progress(frame, enter, 20);
  const ota = Math.min(1, Math.max(0, (frame - enter - 40) / 120));
  return (
    <div style={{ position: "absolute", left: SAFE.x, top: 160, width: 760, padding: "34px 40px", borderRadius: 20, background: COLOR.panelSolid, border: `1px solid ${COLOR.line}`, opacity: t, transform: `translateY(${(1 - t) * 24}px)` }}>
      <Label color={COLOR.orange}>Remote configuration · control commands (103e)</Label>
      <Slider label="Sensing interval" from="60 s" to="30 s" at={enter + 10} a={0.6} b={0.3} />
      <Slider label="Critical threshold" from="0.60" to="0.55 (monsoon)" at={thresholdAt} a={0.6} b={0.55} />
      <Slider label="Synchronisation policy" from="hourly" to="processed only" at={enter + 30} a={0.3} b={0.8} />
      <div style={{ marginTop: 30, display: "flex", justifyContent: "space-between", fontFamily: FONT.body, fontSize: 24, color: COLOR.text }}>
        <span>Firmware update · node 101a</span>
        <span style={{ fontFamily: FONT.mono, color: COLOR.dim }}>{Math.round(ota * 100)}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: "#1E293B", marginTop: 14 }}>
        <div style={{ width: `${ota * 100}%`, height: 10, borderRadius: 5, background: COLOR.green }} />
      </div>
      <div style={{ marginTop: 26, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {["prediction model", "communication", "calibration", "user permissions"].map((c) => (
          <div key={c} style={{ fontFamily: FONT.body, fontSize: 19, color: COLOR.dim, padding: "8px 14px", borderRadius: 18, border: `1px solid ${COLOR.line}` }}>
            {c}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Claim 17: deployment sites as engineering sketches ---------- */

type Site = { name: string; group: "mines" | "transport" | "structures" | "terrain"; draw: React.ReactNode; dots: [number, number][] };

const G = (props: { children: React.ReactNode }) => (
  <g fill="none" stroke="#CBD5E1" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
    {props.children}
  </g>
);
const ground = "M0 70 H220";

const SITES: Site[] = [
  { name: "Open-pit mine", group: "mines", draw: <G><path d="M0 30 H40 L52 46 H70 L82 62 H138 L150 46 H168 L180 30 H220" /></G>, dots: [[46, 42], [110, 60], [174, 34]] },
  { name: "Underground mine", group: "mines", draw: <G><path d="M0 22 H220" /><path d="M40 22 V96 H200" /><path d="M120 96 V110" /></G>, dots: [[40, 60], [130, 96], [190, 96]] },
  { name: "Quarry", group: "mines", draw: <G><path d="M0 30 H90 V50 H120 V70 H150 V90 H220" /></G>, dots: [[90, 40], [135, 70]] },
  { name: "Excavation site", group: "mines", draw: <G><path d={ground} /><path d="M60 70 V108 H160 V70" /><path d="M60 82 H160 M60 96 H160" strokeDasharray="5 6" /></G>, dots: [[60, 90], [160, 90]] },
  { name: "Tunnel", group: "transport", draw: <G><path d="M0 100 C 60 20, 160 20, 220 100" /><path d="M86 100 V78 A24 24 0 0 1 134 78 V100" /></G>, dots: [[86, 84], [134, 84], [110, 40]] },
  { name: "Railway cutting", group: "transport", draw: <G><path d="M0 30 H60 L90 90 H130 L160 30 H220" /><path d="M96 84 H124 M100 90 V80 M120 90 V80" /></G>, dots: [[74, 58], [146, 58]] },
  { name: "Highway slope", group: "transport", draw: <G><path d="M0 24 L120 84 H220" /><path d="M130 92 H210" strokeDasharray="10 8" /></G>, dots: [[50, 48], [96, 72]] },
  { name: "Retaining wall", group: "structures", draw: <G><path d="M0 40 H110 V100 H220" /><path d="M110 40 V100 M122 40 V100 M110 40 H122" /></G>, dots: [[116, 56], [116, 84]] },
  { name: "Embankment", group: "structures", draw: <G><path d="M0 96 L70 40 H150 L220 96" /></G>, dots: [[40, 70], [110, 40], [180, 70]] },
  { name: "Dam", group: "structures", draw: <G><path d="M60 100 L90 20 H120 L150 100" /><path d="M0 40 H86" stroke="#38BDF8" /><path d="M0 52 H82 M0 64 H78" stroke="#38BDF8" strokeDasharray="6 6" /></G>, dots: [[100, 40], [130, 80]] },
  { name: "Bridge foundation", group: "structures", draw: <G><path d="M0 34 H220" /><path d="M70 34 V96 M150 34 V96" /><path d="M0 70 H220" strokeDasharray="4 6" /></G>, dots: [[70, 88], [150, 88]] },
  { name: "Landfill", group: "terrain", draw: <G><path d="M10 96 Q 110 10 210 96" /><path d="M40 80 Q 110 30 180 80 M62 92 Q 110 54 158 92" strokeDasharray="5 6" /></G>, dots: [[110, 50], [60, 80]] },
  { name: "Natural slope", group: "terrain", draw: <G><path d="M0 100 L170 26 H220" /></G>, dots: [[60, 74], [130, 44]] },
  { name: "Landslide-prone terrain", group: "terrain", draw: <G><path d="M0 100 L160 24 H220" /><path d="M40 82 Q 100 40 150 30" stroke="#EF4444" strokeDasharray="6 6" /></G>, dots: [[70, 72], [120, 48]] },
];

export const SiteGrid: React.FC<{ enter: number; groups: Record<Site["group"], number> }> = ({ enter, groups }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: SAFE.x, right: SAFE.x, top: 150, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 18 }}>
      {SITES.map((s, i) => {
        const t = progress(frame, enter + i * 3, 14);
        const lit = progress(frame, groups[s.group], 14);
        return (
          <div key={s.name} style={{ height: 200, borderRadius: 16, background: COLOR.panelSolid, border: `1px solid ${lit > 0 ? `rgba(251,191,36,${0.2 + 0.5 * lit})` : COLOR.line}`, padding: "16px 18px", opacity: t }}>
            <svg width={220} height={112} style={{ display: "block", margin: "0 auto" }}>
              {s.draw}
              {s.dots.map(([x, y], k) => (
                <circle key={k} cx={x} cy={y} r={6} fill={LAYER_COLOR["101"]} opacity={lit} stroke="#000" strokeWidth={2} />
              ))}
            </svg>
            <div style={{ marginTop: 18, textAlign: "center", fontFamily: FONT.body, fontWeight: 600, fontSize: 22, color: lit > 0 ? COLOR.text : COLOR.dim }}>{s.name}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Claim 18: the method as eleven steps, following one real reading ---------- */

const STEPS = [
  "Acquire readings from distributed sensor nodes",
  "Send them to the edge computing layer",
  "Preprocess, synchronise, filter, extract features",
  "Fuse the different kinds of readings",
  "Run the prediction models",
  "Keep the hazard risk score up to date",
  "Classify into hazard levels",
  "Raise early warning alerts",
  "Buffer locally if the network drops",
  "Synchronise when the network returns",
  "Present the assessment in the application layer",
];

export const MethodSteps: React.FC<{ beats: number[] }> = ({ beats }) => {
  const frame = useCurrentFrame();
  const active = beats.reduce((k, b, i) => (frame >= b ? i : k), -1);
  const detail: Record<number, string> = {
    0: `pore pressure ${reading.raw.pore_pressure_kpa} kPa · strain ${reading.raw.strain_microstrain} µε · rain ${reading.raw.rain_A24} mm`,
    2: `${reading.window}-step window · ${reading.xgbFeatures} features`,
    4: `XGBoost ${reading.xgb.toFixed(3)} · LSTM ${reading.lstm.toFixed(3)}`,
    5: `0.7 × ${reading.xgb.toFixed(3)} + 0.3 × ${reading.lstm.toFixed(3)} = ${reading.ensemble.toFixed(3)}`,
    6: `${reading.level} (≥ 0.6)`,
    7: "Immediate inspection required",
  };
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: SAFE.x, top: 130, width: 1000 }}>
        {STEPS.map((s, i) => {
          const on = i <= active;
          const cur = i === active;
          const emb = i === 8 || i === 9;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 20, height: 70, opacity: on ? 1 : 0.35 }}>
              <div style={{ width: 50, height: 50, borderRadius: 25, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono, fontWeight: 700, fontSize: 22, color: cur ? "#fff" : COLOR.text, background: cur ? COLOR.brand : on ? "rgba(79,107,255,0.25)" : "transparent", border: `2px solid ${on ? COLOR.brand : COLOR.line}` }}>{i + 1}</div>
              <div style={{ fontFamily: FONT.body, fontWeight: cur ? 600 : 500, fontSize: 27, color: COLOR.text }}>{s}</div>
              {emb && <div style={{ fontFamily: FONT.mono, fontSize: 15, color: "#C4B5FD", border: "1px solid rgba(167,139,250,0.5)", borderRadius: 12, padding: "3px 10px" }}>embodiment</div>}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 1180, top: 300, width: 640, padding: "30px 34px", borderRadius: 20, background: COLOR.panelSolid, border: `1px solid ${COLOR.line}` }}>
        <Label>{`The reading we followed · ${reading.patch} · ${reading.timestamp}`}</Label>
        {Object.entries(detail).map(([k, v]) => {
          const i = Number(k);
          const show = progress(frame, beats[i] ?? 1e9, 14);
          return (
            <div key={k} style={{ marginTop: 18, opacity: show, display: "flex", gap: 14 }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 20, color: COLOR.brandSoft, width: 36 }}>{i + 1}</div>
              <div style={{ fontFamily: i === 6 ? FONT.body : FONT.mono, fontWeight: i === 6 ? 700 : 400, fontSize: 22, color: i === 6 ? RISK_COLOR.HIGH : COLOR.text }}>{v}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Outro: all eighteen claims, then the credits ---------- */

export const ClaimGrid: React.FC<{ enter: number }> = ({ enter }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: SAFE.x, right: SAFE.x, top: 200, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
      {Array.from({ length: 18 }, (_, i) => {
        const t = progress(frame, enter + i * 4, 12);
        return (
          <div key={i} style={{ height: 150, borderRadius: 16, background: COLOR.panelSolid, border: `1px solid rgba(79,107,255,${0.2 + 0.6 * t})`, padding: "18px 20px", opacity: 0.3 + 0.7 * t }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 26, color: COLOR.brandSoft }}>{String(i + 1).padStart(2, "0")}</div>
              <svg width={26} height={26} viewBox="0 0 24 24" style={{ opacity: t }}>
                <path d="M4.5 12.5l5 5 10-11" fill="none" stroke={COLOR.green} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ marginTop: 18, fontFamily: FONT.body, fontWeight: 600, fontSize: 21, color: COLOR.text, lineHeight: 1.3 }}>{CLAIM_SHORT[i + 1]}</div>
          </div>
        );
      })}
    </div>
  );
};

export const CreditsCard: React.FC<{ enter: number }> = ({ enter }) => {
  const frame = useCurrentFrame();
  const r = (d: number): React.CSSProperties => ({ opacity: progress(frame, enter + d, 20), transform: `translateY(${(1 - progress(frame, enter + d, 20)) * 18}px)` });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={r(0)}>
          <EmblemPlate size={150} />
        </div>
        <div style={{ ...r(8), marginTop: 30 }}>
          <Label>Applicant</Label>
          {APPLICANT.map((l) => (
            <div key={l} style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 32, color: COLOR.text, lineHeight: 1.35 }}>
              {l}
            </div>
          ))}
        </div>
        <div style={{ ...r(18), marginTop: 36 }}>
          <Label>Inventors</Label>
          <div style={{ display: "flex", alignItems: "center", marginTop: 10, whiteSpace: "nowrap" }}>
            {INVENTORS.map((name, i) => (
              <React.Fragment key={name}>
                {i > 0 && <div style={{ width: 1, height: 22, background: COLOR.lineStrong, margin: "0 22px" }} />}
                <div style={{ fontFamily: FONT.body, fontWeight: 500, fontSize: 26, color: COLOR.text }}>{name}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={{ ...r(34), marginTop: 48, maxWidth: 1250, fontFamily: FONT.body, fontSize: 19, lineHeight: 1.6, color: COLOR.dim }}>
          Illustrative embodiments depict the claimed scope. Prototype segments show the working RockShield implementation, trained on a simulated sensor dataset.
          <br />
          Satellite imagery and terrain © Mapbox © OpenStreetMap.
        </div>
      </div>
    </AbsoluteFill>
  );
};
