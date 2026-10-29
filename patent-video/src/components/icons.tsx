import React from "react";

/** Line icons on a 24x24 grid, drawn for this video (stroke only, round caps). */
type Shape = { d?: string[]; circles?: [number, number, number][]; dots?: [number, number][] };

const ICONS: Record<string, Shape> = {
  vibration: { d: ["M2 12h3l2.2-6 3.4 12 3-9 2.2 6 1.6-3H22"] },
  humidity: {
    d: ["M7 15a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 17.3 8.5 3.25 3.25 0 0 1 17 15H7z", "M12 17.2c-1.1 1.5-1.7 2.4-1.7 3.1a1.7 1.7 0 0 0 3.4 0c0-.7-.6-1.6-1.7-3.1z"],
  },
  pore: { d: ["M12 2.8c-3.4 4.5-5.4 7.6-5.4 9.9a5.4 5.4 0 0 0 10.8 0c0-2.3-2-5.4-5.4-9.9z", "M12 14.6l2.6-2.6"], circles: [[12, 14.6, 1]] },
  strain: { d: ["M4 7h16v10H4z", "M7 10v4M9.5 10v4M12 10v4M14.5 10v4M17 10v4", "M2 12h2M20 12h2"] },
  gas: { d: ["M3 8c1.8-1.6 3.6 1.6 5.4 0s3.6 1.6 5.4 0 3.6 1.6 5.4 0", "M3 12.5c1.8-1.6 3.6 1.6 5.4 0s3.6 1.6 5.4 0 3.6 1.6 5.4 0", "M3 17c1.8-1.6 3.6 1.6 5.4 0s3.6 1.6 5.4 0 3.6 1.6 5.4 0"] },
  temperature: { d: ["M10 4.5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z", "M12 10v6"] },
  rain: { d: ["M7 14a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 17.3 7.5 3.25 3.25 0 0 1 17 14H7z", "M8.5 16.5l-1 3M12.5 16.5l-1 3M16.5 16.5l-1 3"] },
  displacement: { d: ["M3 12h18", "M6 9l-3 3 3 3", "M18 9l3 3-3 3", "M12 5v3M12 16v3"] },
  tilt: { d: ["M3 20h18", "M4 20L17 7", "M10.5 20a6.5 6.5 0 0 0-1.9-4.6"] },
  acoustic: { d: ["M4 9.5h3.2L12 6v12l-4.8-3.5H4z", "M15.5 9a4.2 4.2 0 0 1 0 6", "M18 6.5a8 8 0 0 1 0 11"] },
  groundwater: { d: ["M3 15c1.8-1.4 3.6 1.4 5.4 0s3.6 1.4 5.4 0 3.6 1.4 5.4 0 1.8 0 1.8 0", "M3 19c1.8-1.4 3.6 1.4 5.4 0s3.6 1.4 5.4 0 3.6 1.4 5.4 0 1.8 0 1.8 0", "M12 3v8", "M9 8.2l3 3 3-3"] },
  dust: { dots: [[6, 7], [12, 5], [18, 8], [8, 12], [15, 12], [5, 17], [11, 17], [18, 16]] },
  airflow: { d: ["M3 9h11a3 3 0 1 0-3-3", "M3 15h14a3 3 0 1 1-3 3", "M3 12h7"] },
  antenna: { d: ["M12 11v10", "M8.6 14.2a4.8 4.8 0 0 1 0-6.4", "M15.4 7.8a4.8 4.8 0 0 1 0 6.4", "M5.6 17.2a9 9 0 0 1 0-12.4", "M18.4 4.8a9 9 0 0 1 0 12.4"], circles: [[12, 11, 1.2]] },
  database: { d: ["M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3z", "M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6", "M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"] },
  funnel: { d: ["M3 4h18l-7 8.2V19l-4 2v-8.8z"] },
  gauge: { d: ["M3.5 16.5a8.5 8.5 0 1 1 17 0", "M12 16.5l4.2-5.2", "M5.8 11.2l1.4.8M12 7.5V9M18.2 11.2l-1.4.8"], circles: [[12, 16.5, 1.3]] },
  bell: { d: ["M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z", "M10 20.5a2 2 0 0 0 4 0"] },
  phone: { d: ["M7.5 2h9A1.5 1.5 0 0 1 18 3.5v17a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20.5v-17A1.5 1.5 0 0 1 7.5 2z", "M10.5 18.5h3"] },
  monitor: { d: ["M3 4h18v12H3z", "M8 20h8M12 16v4", "M6 12l3-3 2.5 2L15 7l3 3"] },
  user: { d: ["M4.5 21a7.5 7.5 0 0 1 15 0"], circles: [[12, 8, 4]] },
  users: { d: ["M2.5 20a6.5 6.5 0 0 1 13 0", "M16 4.4a3.6 3.6 0 0 1 0 6.9", "M18 14.2a6.5 6.5 0 0 1 3.5 5.8"], circles: [[9, 8, 3.6]] },
  cloud: { d: ["M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 9.2a4.4 4.4 0 0 1-.5 8.8z"] },
  cloudOff: { d: ["M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 9.2a4.4 4.4 0 0 1-.5 8.8z", "M3 3l18 18"] },
  chip: { d: ["M7 7h10v10H7z", "M10 10h4v4h-4z", "M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"] },
  lstm: { d: ["M7 6.5l10 0M7 17.5h10M7 6.5l10 11M7 17.5l10-11"], circles: [[5, 6.5, 2], [5, 17.5, 2], [19, 6.5, 2], [19, 17.5, 2]] },
  tree: { d: ["M12 6.5v3.5M12 10l-6 5.5M12 10l6 5.5"], circles: [[12, 4.5, 2], [6, 17.5, 2], [18, 17.5, 2]] },
  ensemble: { d: ["M4 6l6 6-6 6", "M11 6l6 6-6 6", "M18 6v12"] },
  mail: { d: ["M3 5h18v14H3z", "M3 6l9 7 9-7"] },
  sms: { d: ["M4 4h16v12H9l-5 4z", "M8 9h8M8 12h5"] },
  call: { d: ["M5 3.5h3.2l1.6 4-2 1.3a10.5 10.5 0 0 0 5.4 5.4l1.3-2 4 1.6V17a2 2 0 0 1-2 2A15.5 15.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"] },
  siren: { d: ["M7 18v-5a5 5 0 0 1 10 0v5", "M5 18h14v3H5z", "M12 3v2M4.2 6.2l1.4 1.4M19.8 6.2l-1.4 1.4"] },
  evacuate: { d: ["M14 5.5a1.5 1.5 0 1 0 0-.01", "M9 21l2.5-6 2.5 2v4", "M7.5 12l2.5-3.5 4 1 2 3.5", "M11.5 15l1-6", "M19 4v16"] },
  power: { d: ["M12 3v8", "M6.3 6.8a8 8 0 1 0 11.4 0"] },
  alert: { d: ["M12 3.5l9.5 16.5h-19z", "M12 10v4.5"], circles: [[12, 17.2, 0.6]] },
  check: { d: ["M4.5 12.5l5 5 10-11"] },
  wifi: { d: ["M2.5 9a14 14 0 0 1 19 0", "M5.5 12.5a9.5 9.5 0 0 1 13 0", "M8.6 15.8a5 5 0 0 1 6.8 0"], circles: [[12, 19, 1]] },
  satellite: { d: ["M8 8l4-4 4 4-4 4z", "M5 11l3-3M13 19l3-3", "M3 13l4 4M11 21l4-4", "M15 15l4.5 4.5"] },
  tower: { d: ["M12 6v15", "M8 21l4-15 4 15", "M9 15h6"], circles: [[12, 5, 1.3]] },
  broker: { d: ["M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0", "M12 3v6M12 15v6M3 12h6M15 12h6"] },
  sliders: { d: ["M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"], circles: [[16, 6, 2], [10, 12, 2], [18, 18, 2]] },
  sync: { d: ["M20 12a8 8 0 0 1-14.3 4.9", "M4 12a8 8 0 0 1 14.3-4.9", "M18.6 3.5v3.6H15", "M5.4 20.5v-3.6H9"] },
  layers: { d: ["M12 3l9 5-9 5-9-5z", "M3 13l9 5 9-5", "M3 17.5l9 5 9-5"] },
  mountain: { d: ["M2 20l7-12 4 6 2.5-3.5L22 20z", "M9 8l1.6 2.6"] },
};

export type IconName = keyof typeof ICONS;

/** Icon inside an existing <svg>: positioned at (x, y) top-left, `size` px square */
export const Icon: React.FC<{ name: IconName; x: number; y: number; size: number; color: string; strokeWidth?: number; opacity?: number }> = ({
  name,
  x,
  y,
  size,
  color,
  strokeWidth = 1.7,
  opacity = 1,
}) => {
  const shape = ICONS[name];
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 24})`} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
      {shape.d?.map((d, i) => <path key={i} d={d} />)}
      {shape.circles?.map(([cx, cy, r], i) => <circle key={`c${i}`} cx={cx} cy={cy} r={r} />)}
      {shape.dots?.map(([cx, cy], i) => <circle key={`d${i}`} cx={cx} cy={cy} r={1.1} fill={color} stroke="none" />)}
    </g>
  );
};

/** Standalone icon for HTML layouts */
export const IconBox: React.FC<{ name: IconName; size: number; color: string; strokeWidth?: number; style?: React.CSSProperties }> = ({
  name,
  size,
  color,
  strokeWidth,
  style,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible", ...style }}>
    <Icon name={name} x={0} y={0} size={24} color={color} strokeWidth={strokeWidth} />
  </svg>
);
