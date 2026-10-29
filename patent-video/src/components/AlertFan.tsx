import React from "react";
import { useCurrentFrame } from "remotion";
import { COLOR, FONT } from "../theme";
import { progress } from "../lib/anim";
import { Icon, IconName } from "./icons";

export type Channel = { icon: IconName; label: string; sub: string; real: boolean };

/** One early-warning alert from the alert generation node (103d) fanning out to every channel */
export const AlertFan: React.FC<{ channels: Channel[]; cx: number; cy: number; enter?: number; stagger?: number }> = ({ channels, cx, cy, enter = 0, stagger = 10 }) => {
  const frame = useCurrentFrame();
  const f = frame - enter;
  const n = channels.length;
  const cardW = 470;
  const cardH = 76;
  const gapY = 14;
  const colX = cx + 300;
  const top = cy - (n * cardH + (n - 1) * gapY) / 2;
  const hub = progress(f, 0, 20);

  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {channels.map((ch, i) => {
        const y = top + i * (cardH + gapY) + cardH / 2;
        const p = progress(f, 14 + i * stagger, 18);
        const x1 = cx + 64;
        const midX = (x1 + colX) / 2;
        const d = `M${x1} ${cy} C ${midX} ${cy}, ${midX} ${y}, ${colX} ${y}`;
        return (
          <path key={`l${i}`} d={d} fill="none" stroke={ch.real ? "rgba(239,68,68,0.55)" : "rgba(167,139,250,0.5)"} strokeWidth={2.5} strokeDasharray={ch.real ? undefined : "8 7"} pathLength={1} strokeDashoffset={ch.real ? 1 - p : undefined} opacity={ch.real ? 1 : p} />
        );
      })}

      {/* 103d hub with pulse rings */}
      <g opacity={hub}>
        {[0, 1, 2].map((k) => {
          const cycle = ((f + k * 20) % 60) / 60;
          return <circle key={k} cx={cx} cy={cy} r={64 + cycle * 70} fill="none" stroke={COLOR.red} strokeWidth={2} opacity={(1 - cycle) * 0.5} />;
        })}
        <circle cx={cx} cy={cy} r={64} fill="#2A1216" stroke={COLOR.red} strokeWidth={3} />
        <Icon name="bell" x={cx - 30} y={cy - 34} size={60} color="#FCA5A5" strokeWidth={1.7} />
        <text x={cx} y={cy + 112} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={22} fill={COLOR.red}>
          103d
        </text>
        <text x={cx} y={cy + 140} textAnchor="middle" fontFamily={FONT.body} fontSize={20} fill={COLOR.dim}>
          alert generation node
        </text>
      </g>

      {channels.map((ch, i) => {
        const y = top + i * (cardH + gapY);
        const p = progress(f, 22 + i * stagger, 18);
        const color = ch.real ? COLOR.red : COLOR.violet;
        return (
          <g key={`c${i}`} opacity={p} transform={`translate(${(1 - p) * 30} 0)`}>
            <rect x={colX} y={y} width={cardW} height={cardH} rx={14} fill={COLOR.panelSolid} stroke={ch.real ? "rgba(239,68,68,0.45)" : "rgba(167,139,250,0.4)"} strokeWidth={1.5} />
            <rect x={colX + 14} y={y + 12} width={52} height={52} rx={12} fill={`${color}22`} />
            <Icon name={ch.icon} x={colX + 26} y={y + 24} size={28} color={ch.real ? "#FCA5A5" : "#C4B5FD"} strokeWidth={1.8} />
            <text x={colX + 84} y={y + 33} fontFamily={FONT.body} fontWeight={600} fontSize={22} fill={COLOR.text}>
              {ch.label}
            </text>
            <text x={colX + 84} y={y + 58} fontFamily={FONT.body} fontSize={17} fill={COLOR.dim}>
              {ch.sub}
            </text>
            <circle cx={colX + cardW - 26} cy={y + cardH / 2} r={6} fill={ch.real ? COLOR.green : COLOR.violet} />
          </g>
        );
      })}
    </svg>
  );
};
