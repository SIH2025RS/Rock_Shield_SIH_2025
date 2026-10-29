import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, FONT, LAYER_COLOR, RISK_COLOR, SAFE } from "../theme";
import { clamp01, progress, rand } from "../lib/anim";
import { Icon, IconBox, IconName } from "./icons";
import { Label, RiskGauge, SeriesChart } from "./Widgets";
import timeline from "../../public/data/event-timeline.json";

const scores = timeline.steps.map((s) => s.ensemble);
/** Real ensemble score at a given frame while replaying the example sequence */
export const replayValue = (frame: number, from: number, to: number) => {
  const p = clamp01((frame - from) / Math.max(1, to - from)) * (scores.length - 1);
  const i = Math.floor(p);
  const f = p - i;
  return { index: p, value: scores[i] + (scores[Math.min(scores.length - 1, i + 1)] - scores[i]) * f };
};

/* ---------- Claim 8: everything fused into one continuously updated score ---------- */

export const FusionScene: React.FC<{ enter: number; end: number }> = ({ enter, end }) => {
  const frame = useCurrentFrame();
  const { value } = replayValue(frame, enter + 20, end);
  const sources: { name: string; sub: string; icon: IconName; color: string }[] = [
    { name: "Underground sensors", sub: "pore pressure, strain, vibration …", icon: "vibration", color: LAYER_COLOR["101"] },
    { name: "Weather", sub: "rainfall over 24, 72 and 168 h", icon: "rain", color: COLOR.sky },
    { name: "Terrain", sub: "slope, curvature, drainage", icon: "mountain", color: COLOR.violet },
  ];
  return (
    <AbsoluteFill>
      {sources.map((s, i) => {
        const t = progress(frame, enter + i * 8, 16);
        return (
          <div key={s.name} style={{ position: "absolute", left: SAFE.x, top: 230 + i * 210, width: 560, height: 160, borderRadius: 18, background: COLOR.panelSolid, border: `1px solid ${s.color}66`, display: "flex", alignItems: "center", gap: 24, padding: "0 28px", opacity: t, transform: `translateX(${(1 - t) * -30}px)` }}>
            <IconBox name={s.icon} size={58} color={s.color} />
            <div>
              <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 30, color: COLOR.text }}>{s.name}</div>
              <div style={{ fontFamily: FONT.body, fontSize: 21, color: COLOR.dim, marginTop: 4 }}>{s.sub}</div>
            </div>
          </div>
        );
      })}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {[310, 520, 730].map((y, i) => {
          const x0 = SAFE.x + 560;
          const bez = (t: number, a: number, b: number, c: number, d: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
          return (
            <g key={y} opacity={progress(frame, enter + 10 + i * 6, 16)}>
              <path d={`M${x0} ${y} C 900 ${y}, 980 520, 1150 520`} fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth={3} />
              {[0, 0.5].map((o) => {
                const t = ((frame - enter) / 50 + i * 0.3 + o) % 1;
                return <circle key={o} cx={bez(t, x0, 900, 980, 1150)} cy={bez(t, y, y, 520, 520)} r={7} fill={COLOR.brandSoft} opacity={Math.min(1, t * 6, (1 - t) * 6)} />;
              })}
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", left: 1160, top: 250, opacity: progress(frame, enter + 16, 18) }}>
        <Label>Risk assessment node · 38 fused features</Label>
        <RiskGauge value={value} size={620} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Claim 9: levels become decisions, then a real sequence replayed ---------- */

export const DecisionCards: React.FC<{ enter: number }> = ({ enter }) => {
  const frame = useCurrentFrame();
  const cards = [
    { level: "NORMAL", range: "score below 0.3", act: "Keep working", color: RISK_COLOR.LOW },
    { level: "WARNING", range: "0.3 to 0.6", act: "Watch closely, inspect", color: RISK_COLOR.MEDIUM },
    { level: "CRITICAL", range: "0.6 and above", act: "Move people out", color: RISK_COLOR.HIGH },
  ];
  return (
    <div style={{ position: "absolute", left: SAFE.x, right: SAFE.x, top: 290, display: "flex", gap: 30 }}>
      {cards.map((c, i) => {
        const t = progress(frame, enter + i * 10, 18);
        return (
          <div key={c.level} style={{ flex: 1, height: 400, borderRadius: 22, background: COLOR.panelSolid, border: `2px solid ${c.color}`, padding: 36, opacity: t, transform: `translateY(${(1 - t) * 30}px)` }}>
            <div style={{ width: 64, height: 10, borderRadius: 5, background: c.color }} />
            <div style={{ marginTop: 30, fontFamily: FONT.body, fontWeight: 700, fontSize: 46, letterSpacing: 3, color: c.color }}>{c.level}</div>
            <div style={{ marginTop: 10, fontFamily: FONT.mono, fontSize: 24, color: COLOR.dim }}>{c.range}</div>
            <div style={{ marginTop: 70, fontFamily: FONT.body, fontWeight: 600, fontSize: 38, color: COLOR.text }}>{c.act}</div>
          </div>
        );
      })}
    </div>
  );
};

export const HazardReplay: React.FC<{ enter: number; replayAt: number; end: number }> = ({ enter, replayAt, end }) => {
  const frame = useCurrentFrame();
  const { index, value } = replayValue(frame, replayAt, end - 20);
  const level = value < 0.3 ? "LOW" : value < 0.6 ? "MEDIUM" : "HIGH";
  const shown = frame < replayAt ? 0 : index / (scores.length - 1);
  const labels = [0, 12, 24, 36, scores.length - 1].map((i) => ({ at: i, text: timeline.steps[i].t.slice(11) }));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: SAFE.x, top: 170, opacity: progress(frame, enter, 16) }}>
        <Label>{`Ensemble risk score · ${timeline.patch} · ${timeline.steps[0].t.slice(0, 10)} · simulated dataset, scored by the prototype models`}</Label>
        <div style={{ marginTop: 14 }}>
          <SeriesChart
            width={1180}
            height={620}
            yMin={0}
            yMax={1}
            series={[{ values: scores, color: COLOR.text, width: 4 }]}
            reveal={shown}
            playhead={frame >= replayAt ? index : undefined}
            bands={[
              { from: 0, to: 0.3, color: RISK_COLOR.LOW, label: "NORMAL" },
              { from: 0.3, to: 0.6, color: RISK_COLOR.MEDIUM, label: "WARNING" },
              { from: 0.6, to: 1, color: RISK_COLOR.HIGH, label: "CRITICAL" },
            ]}
            xLabels={labels}
          />
        </div>
      </div>
      <div style={{ position: "absolute", left: 1330, top: 260, opacity: progress(frame, enter + 10, 16) }}>
        <RiskGauge value={frame >= replayAt ? value : scores[0]} size={500} />
        <div style={{ marginTop: 10, textAlign: "center", fontFamily: FONT.mono, fontSize: 22, color: RISK_COLOR[level] }}>{frame >= replayAt ? timeline.steps[Math.round(index)].t : ""}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Claim 11: a mine cross-section with every claimed link type ---------- */

export const MineSection: React.FC<{ beats: { wired: number; radio: number; cellular: number; satellite: number; proto: number } }> = ({ beats }) => {
  const frame = useCurrentFrame();
  const on = (b: number) => progress(frame, b, 18);
  const nodes = [
    [520, 760],
    [700, 790],
    [880, 760],
    [1060, 795],
    [1240, 765],
  ];
  const proto = on(beats.proto);
  const wave = (cx: number, cy: number, color: string, t: number, k = 3, r0 = 30) =>
    Array.from({ length: k }, (_, i) => {
      const c = ((frame / 40 + i / k) % 1);
      return <circle key={i} cx={cx} cy={cy} r={r0 + c * 80} fill="none" stroke={color} strokeWidth={2.5} opacity={(1 - c) * t} />;
    });
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B2F25" />
          <stop offset="1" stopColor="#1C1612" />
        </linearGradient>
      </defs>
      <rect x={0} y={480} width={1920} height={600} fill="url(#ground)" />
      <path d="M0 480 L520 480 L620 430 L900 430 L1000 480 L1920 480" fill="none" stroke="#8C7461" strokeWidth={3} />
      <rect x={380} y={720} width={1000} height={110} rx={50} fill="#0B0E14" stroke="#4B3A2E" strokeWidth={3} />
      <text x={400} y={870} fontFamily={FONT.body} fontSize={20} fill="#A8927E">
        underground working (illustrative)
      </text>
      {/* control room */}
      <rect x={140} y={360} width={190} height={120} rx={10} fill={COLOR.panelSolid} stroke={COLOR.lineStrong} />
      <Icon name="monitor" x={205} y={385} size={60} color={COLOR.text} />
      <text x={235} y={510 - 8} textAnchor="middle" fontFamily={FONT.body} fontSize={20} fill={COLOR.dim}>
        control room · edge
      </text>
      {nodes.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={16} fill={LAYER_COLOR["101"]} stroke="#000" strokeWidth={3} />
        </g>
      ))}
      {/* wired: ethernet along the shaft + wifi at the control room */}
      <g opacity={on(beats.wired)}>
        <path d="M330 440 H450 V760 H504" fill="none" stroke={proto > 0 ? COLOR.green : COLOR.sky} strokeWidth={4} strokeDasharray={proto > 0 ? undefined : "1 0"} />
        {wave(235, 360, proto > 0 ? COLOR.green : COLOR.sky, on(beats.wired), 3, 20)}
        <text x={470} y={600} fontFamily={FONT.body} fontWeight={600} fontSize={24} fill={proto > 0 ? COLOR.green : COLOR.sky}>
          Ethernet · Wi-Fi
        </text>
      </g>
      {/* short radio mesh between nodes, long-range LoRa to the portal gateway */}
      <g opacity={on(beats.radio)}>
        {nodes.slice(0, -1).map(([x, y], i) => (
          <path key={i} d={`M${x} ${y} L${nodes[i + 1][0]} ${nodes[i + 1][1]}`} stroke={COLOR.violet} strokeWidth={3} strokeDasharray="6 6" />
        ))}
        <text x={720} y={700} fontFamily={FONT.body} fontWeight={600} fontSize={24} fill={COLOR.violet}>
          Bluetooth · ZigBee · mesh
        </text>
        <rect x={1460} y={410} width={36} height={70} fill={COLOR.panelSolid} stroke={COLOR.violet} />
        {wave(1478, 400, COLOR.violet, on(beats.radio), 3, 12)}
        <path d="M1240 765 Q 1400 600 1478 470" fill="none" stroke={COLOR.violet} strokeWidth={3} strokeDasharray="14 8" />
        <text x={1300} y={560} fontFamily={FONT.body} fontWeight={600} fontSize={24} fill={COLOR.violet}>
          LoRa · LoRaWAN
        </text>
      </g>
      {/* cellular */}
      <g opacity={on(beats.cellular)}>
        <path d="M1660 480 L1690 250 L1720 480 M1672 400 H1708 M1680 330 H1700" fill="none" stroke={COLOR.amber} strokeWidth={4} />
        {wave(1690, 240, COLOR.amber, on(beats.cellular), 3, 16)}
        <text x={1560} y={210} fontFamily={FONT.body} fontWeight={600} fontSize={24} fill={COLOR.amber}>
          NB-IoT · LTE · 5G
        </text>
      </g>
      {/* satellite */}
      <g opacity={on(beats.satellite)}>
        <Icon name="satellite" x={1180} y={90} size={90} color={COLOR.text} />
        <path d="M1225 190 L 1478 400" stroke={COLOR.text} strokeWidth={2.5} strokeDasharray="4 8" />
        <text x={1300} y={150} fontFamily={FONT.body} fontWeight={600} fontSize={24} fill={COLOR.text}>
          satellite link for remote sites
        </text>
      </g>
      {proto > 0 && (
        <g opacity={proto}>
          <rect x={SAFE.x} y={150} width={640} height={64} rx={12} fill="#0F2A22" stroke={`${COLOR.green}aa`} />
          <text x={SAFE.x + 24} y={192} fontFamily={FONT.body} fontSize={24} fill="#6EE7B7">
            Prototype: Wi-Fi and wired network (HTTP + WebSocket)
          </text>
        </g>
      )}
    </svg>
  );
};

/* ---------- Claim 12: publish / subscribe through a broker ---------- */

export const PubSub: React.FC<{ enter: number; whyAt: number }> = ({ enter, whyAt }) => {
  const frame = useCurrentFrame();
  const f = frame - enter;
  const pubs = ["site/JH-UG-01/strain", "site/JH-UG-02/pore_pressure", "site/JH-UG-03/vibration"];
  const subs: { name: string; icon: IconName }[] = [
    { name: "Edge computing layer", icon: "chip" },
    { name: "Dashboard", icon: "monitor" },
  ];
  const bx = 960;
  const by = 520;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {pubs.map((topic, i) => {
        const y = 300 + i * 220;
        const t = progress(f, i * 8, 16);
        const c = ((f / 45 + i * 0.33) % 1);
        const x = 520 + (bx - 80 - 520) * c;
        const yy = y + (by - y) * c;
        return (
          <g key={topic} opacity={t}>
            <circle cx={SAFE.x + 60} cy={y} r={34} fill={COLOR.panelSolid} stroke={LAYER_COLOR["101"]} strokeWidth={3} />
            <Icon name="vibration" x={SAFE.x + 42} y={y - 18} size={36} color={LAYER_COLOR["101"]} />
            <text x={SAFE.x + 112} y={y - 6} fontFamily={FONT.body} fontWeight={600} fontSize={22} fill={COLOR.text}>
              Sensor node publishes
            </text>
            <text x={SAFE.x + 112} y={y + 24} fontFamily={FONT.mono} fontSize={19} fill={LAYER_COLOR["101"]}>
              {topic}
            </text>
            <path d={`M520 ${y} L${bx - 80} ${by}`} stroke="rgba(148,163,184,0.35)" strokeWidth={2.5} />
            <rect x={x - 12} y={yy - 8} width={24} height={16} rx={4} fill={LAYER_COLOR["101"]} />
          </g>
        );
      })}
      <g opacity={progress(f, 10, 16)}>
        <circle cx={bx} cy={by} r={80} fill={COLOR.panelSolid} stroke={COLOR.sky} strokeWidth={3} />
        <Icon name="broker" x={bx - 32} y={by - 44} size={64} color={COLOR.sky} />
        <text x={bx} y={by + 48} textAnchor="middle" fontFamily={FONT.body} fontWeight={600} fontSize={22} fill={COLOR.text}>
          broker
        </text>
      </g>
      {subs.map((s, i) => {
        const y = 380 + i * 300;
        const t = progress(f, 24 + i * 8, 16);
        const c = ((f / 45 + i * 0.5) % 1);
        return (
          <g key={s.name} opacity={t}>
            <path d={`M${bx + 80} ${by} L1380 ${y}`} stroke="rgba(148,163,184,0.35)" strokeWidth={2.5} />
            <rect x={bx + 80 + (1380 - bx - 80) * c - 12} y={by + (y - by) * c - 8} width={24} height={16} rx={4} fill={COLOR.brandSoft} />
            <rect x={1390} y={y - 60} width={420} height={120} rx={16} fill={COLOR.panelSolid} stroke={COLOR.brand} />
            <Icon name={s.icon} x={1414} y={y - 26} size={52} color={COLOR.brandSoft} />
            <text x={1484} y={y - 4} fontFamily={FONT.body} fontWeight={600} fontSize={24} fill={COLOR.text}>
              {s.name}
            </text>
            <text x={1484} y={y + 26} fontFamily={FONT.mono} fontSize={17} fill={COLOR.dim}>
              subscribes to site/+/…
            </text>
          </g>
        );
      })}
      <g opacity={progress(frame, whyAt, 16)}>
        {["MQTT", "AMQP", "DDS", "CoAP", "ZeroMQ"].map((p, i) => (
          <g key={p}>
            <rect x={SAFE.x + i * 160} y={150} width={140} height={52} rx={10} fill="rgba(56,189,248,0.12)" stroke={`${COLOR.sky}88`} />
            <text x={SAFE.x + i * 160 + 70} y={184} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={21} fill={COLOR.sky}>
              {p}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
};

/* ---------- Claims 13 and 14: the network drops, the edge carries on, then syncs selectively ---------- */

export const EdgeLinkScene: React.FC<{ mode: "offline" | "sync"; cutAt: number; bufferAt?: number; restoreAt?: number }> = ({ mode, cutAt, bufferAt = cutAt, restoreAt = 0 }) => {
  const frame = useCurrentFrame();
  const cut = mode === "offline" ? progress(frame, cutAt, 10) : 1 - progress(frame, restoreAt, 16);
  const ex = 640;
  const ey = 560;
  const cloudX = 1460;
  const cloudY = 300;
  const beat = (frame % 30) / 30;
  const buffered = mode === "offline" ? Math.min(12, Math.max(0, Math.floor((frame - bufferAt) / 9))) : Math.max(0, 12 - Math.floor((frame - restoreAt) / 6));
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {/* link */}
      <path d={`M${ex + 130} ${ey - 60} L${cloudX - 110} ${cloudY + 40}`} stroke={cut > 0.5 ? "rgba(239,68,68,0.5)" : COLOR.green} strokeWidth={4} strokeDasharray={cut > 0.5 ? "10 12" : undefined} />
      {cut > 0.5 && (
        <g transform={`translate(${(ex + cloudX) / 2} ${(ey + cloudY) / 2 - 20})`} opacity={cut}>
          <circle r={34} fill="#2A1216" stroke={COLOR.red} strokeWidth={3} />
          <path d="M-13 -13 L13 13 M13 -13 L-13 13" stroke={COLOR.red} strokeWidth={5} strokeLinecap="round" />
        </g>
      )}
      <g opacity={1 - 0.65 * cut}>
        <Icon name="cloud" x={cloudX - 90} y={cloudY - 90} size={180} color={cut > 0.5 ? COLOR.faint : COLOR.text} strokeWidth={1.4} />
        <text x={cloudX} y={cloudY + 110} textAnchor="middle" fontFamily={FONT.body} fontSize={24} fill={COLOR.dim}>
          data storage layer (104) · cloud
        </text>
      </g>
      {/* edge device keeps working */}
      <rect x={ex - 160} y={ey - 120} width={320} height={240} rx={22} fill={COLOR.panelSolid} stroke={COLOR.brand} strokeWidth={3} />
      <Icon name="chip" x={ex - 40} y={ey - 100} size={80} color={COLOR.brandSoft} />
      <text x={ex} y={ey + 22} textAnchor="middle" fontFamily={FONT.body} fontWeight={600} fontSize={26} fill={COLOR.text}>
        edge computing layer
      </text>
      <path
        d={`M${ex - 120} ${ey + 70} h60 l14 -30 l18 56 l14 -40 l10 14 h${120}`}
        fill="none"
        stroke={COLOR.green}
        strokeWidth={3.5}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - beat}
      />
      <text x={ex} y={ey + 160} textAnchor="middle" fontFamily={FONT.body} fontSize={22} fill={COLOR.green}>
        {cut > 0.5 ? "still predicting · alerts still raised" : "predicting"}
      </text>
      {/* local buffer */}
      <g transform={`translate(${ex + 240} ${ey + 140})`}>
        <text x={0} y={-312} fontFamily={FONT.body} fontSize={22} fill={COLOR.dim}>
          local buffer
        </text>
        {Array.from({ length: buffered }, (_, i) => (
          <rect key={i} x={0} y={-24 - i * 24} width={150} height={18} rx={4} fill={COLOR.brandSoft} opacity={0.85} />
        ))}
      </g>
      {mode === "sync" &&
        Array.from({ length: 6 }, (_, k) => {
          const c = ((frame - restoreAt) / 50 + k / 6) % 1;
          if (frame < restoreAt + 10) return null;
          const x = ex + 130 + (cloudX - 110 - ex - 130) * c;
          const y = ey - 60 + (cloudY + 40 - ey + 60) * c;
          return <rect key={k} x={x - 14} y={y - 9} width={28} height={18} rx={4} fill={COLOR.green} opacity={Math.min(1, c * 5, (1 - c) * 5)} />;
        })}
      {mode === "sync" && (
        <g opacity={progress(frame, restoreAt + 20, 16)}>
          <rect x={SAFE.x} y={840} width={560} height={130} rx={14} fill={COLOR.panelSolid} stroke={COLOR.line} />
          <circle cx={SAFE.x + 32} cy={884} r={9} fill={COLOR.green} />
          <text x={SAFE.x + 54} y={892} fontFamily={FONT.body} fontSize={24} fill={COLOR.text}>
            synced: results, assessments, alerts, metadata
          </text>
          <circle cx={SAFE.x + 32} cy={934} r={9} fill={COLOR.faint} />
          <text x={SAFE.x + 54} y={942} fontFamily={FONT.body} fontSize={24} fill={COLOR.dim}>
            kept at the edge: raw high-rate readings
          </text>
        </g>
      )}
      {Array.from({ length: 3 }, (_, i) => (
        <circle key={i} cx={ex - 220 - i * 26} cy={ey + rand(i) * 40 - 20} r={6} fill={LAYER_COLOR["101"]} opacity={0.8} />
      ))}
    </svg>
  );
};
