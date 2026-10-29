import React from "react";
import { AbsoluteFill } from "remotion";
import { Background } from "../components/Background";
import { CAM, Fig1World } from "../components/Fig1World";
import { ClaimChip, EvidenceTag, ProgressRail } from "../components/HUD";
import { TitleCard } from "../components/TitleCard";
import { ClaimDocument, PlainNote } from "../components/ClaimDocument";
import { CodeScroller, Snippet } from "../components/CodeScroller";
import { BrowserFrame, PhoneFrame } from "../components/Frames";
import { AlertFan, Channel } from "../components/AlertFan";
import { COLOR, FONT, RISK_COLOR, SAFE } from "../theme";
import { claim } from "../lib/content";
import { progress } from "../lib/anim";
import { useCurrentFrame } from "remotion";
import ensembleSnippet from "../generated/code/ensemble.json";
import reading from "../../public/data/reading.json";
import metrics from "../../public/data/metrics.json";

export const SFTitle: React.FC = () => <TitleCard />;

/** Claim 7 on the page, beside the part of FIG. 1 it covers */
export const SFClaim: React.FC = () => {
  const c = claim(7);
  return (
    <AbsoluteFill>
      <Background />
      <Fig1World camera={[{ frame: 0, x: CAM.n103b.x + 330, y: CAM.n103b.y, scale: 1.25 }]} focus={["103b"]} focusAt={0} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, transparent 38%, rgba(11,17,32,0.92) 56%)" }} />
      <div style={{ position: "absolute", left: 1010, top: 150 }}>
        <ClaimDocument
          claim={c}
          width={820}
          highlights={[
            { phrase: "a temporal learning model", at: 30 },
            { phrase: "a feature-based learning model", at: 55 },
            { phrase: "an ensemble prediction model", at: 80 },
            { phrase: "consolidated hazard prediction", at: 105 },
          ]}
        />
        <div style={{ marginTop: 44 }}>
          <PlainNote enter={110} width={820}>
            One model reads the last 40 minutes as a sequence, one reads the current readings as features, and the two
            opinions are combined into a single hazard prediction.
          </PlainNote>
        </div>
      </div>
      <ClaimChip n={7} dependsOn={5} kind="system" />
      <ProgressRail current={7} />
    </AbsoluteFill>
  );
};

const ResultRow: React.FC<{ label: string; value: string; color?: string; at: number }> = ({ label, value, color = COLOR.text, at }) => {
  const frame = useCurrentFrame();
  const t = progress(frame, at, 16);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "14px 0", borderBottom: `1px solid ${COLOR.line}`, opacity: t }}>
      <div style={{ fontFamily: FONT.body, fontSize: 22, color: COLOR.dim }}>{label}</div>
      <div style={{ fontFamily: FONT.mono, fontSize: 30, fontWeight: 700, color }}>{value}</div>
    </div>
  );
};

/** The real ensemble function, with the real numbers it produced for one reading */
export const SFCode: React.FC = () => {
  const lvl = reading.level as keyof typeof RISK_COLOR;
  return (
    <AbsoluteFill>
      <Background />
      <div style={{ position: "absolute", left: SAFE.x, top: 130 }}>
        <CodeScroller
          snippet={ensembleSnippet as Snippet}
          width={1160}
          height={830}
          focus={[
            { at: 20, from: "weighted", note: "Weighted vote: 0.7 × XGBoost + 0.3 × LSTM" },
            { at: 120, from: "low", to: "high", note: "Score mapped to LOW / MEDIUM / HIGH (thresholds 0.3 and 0.6)" },
          ]}
        />
      </div>
      <div style={{ position: "absolute", left: 1320, top: 160, width: 500 }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 16, letterSpacing: 3, color: COLOR.brandSoft }}>REAL OUTPUT · {reading.patch}</div>
        <div style={{ fontFamily: FONT.body, fontSize: 20, color: COLOR.dim, marginTop: 6 }}>reading at {reading.timestamp} (simulated dataset)</div>
        <div style={{ marginTop: 22 }}>
          <ResultRow label="XGBoost (38 features)" value={reading.xgb.toFixed(3)} at={40} />
          <ResultRow label={`LSTM (${reading.window}-step window)`} value={reading.lstm.toFixed(3)} at={52} />
          <ResultRow label="0.7 × XGB + 0.3 × LSTM" value={reading.ensemble.toFixed(3)} color={COLOR.text} at={70} />
          <ResultRow label="Hazard level" value={lvl} color={RISK_COLOR[lvl]} at={130} />
        </div>
        <div style={{ marginTop: 34, fontFamily: FONT.body, fontSize: 18, lineHeight: 1.5, color: COLOR.faint }}>
          Held-out test set ROC-AUC: ensemble {metrics.pipelineSplit.ensembleAuc.toFixed(2)} · XGBoost {metrics.pipelineSplit.xgbAuc.toFixed(2)} · LSTM{" "}
          {metrics.pipelineSplit.lstmAuc.toFixed(2)}
        </div>
      </div>
      <ClaimChip n={7} dependsOn={5} kind="system" />
      <EvidenceTag kind="PROTOTYPE" note="ai-ml/ml-service/main.py" />
      <ProgressRail current={7} />
    </AbsoluteFill>
  );
};

/** Real dashboard capture with a push-in on the live risk score */
export const SFUI: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <div style={{ position: "absolute", left: (1920 - 1520) / 2, top: 128 }}>
      <BrowserFrame
        src="ui/dashboard-analytics.png"
        imageSize={[1920, 1080]}
        url="localhost:5173/dashboard"
        width={1520}
        zoom={[
          { frame: 0, x: 960, y: 540, scale: 1 },
          { frame: 40, x: 960, y: 540, scale: 1 },
          { frame: 110, x: 800, y: 470, scale: 1.45 },
        ]}
        callouts={[{ at: 100, box: [100, 249, 411, 148], label: "Hazard risk score from the risk assessment node (103c)", side: "bottom" }]}
      />
    </div>
    <ClaimChip n={8} dependsOn={1} kind="system" />
    <EvidenceTag kind="PROTOTYPE" note="RockShield web dashboard" />
    <ProgressRail current={8} />
  </AbsoluteFill>
);

const CHANNELS: Channel[] = [
  { icon: "monitor", label: "Dashboard alert", sub: "acknowledge, forward to miners", real: true },
  { icon: "phone", label: "Push notification + alarm", sub: "RockShield mobile app", real: true },
  { icon: "sms", label: "SMS", sub: "Twilio, to registered phones", real: true },
  { icon: "call", label: "Voice call", sub: "Twilio, in the worker's language", real: true },
  { icon: "mail", label: "Email", sub: "SMTP escalation", real: true },
  { icon: "siren", label: "Audible site alarm", sub: "hooter at the working face", real: false },
  { icon: "evacuate", label: "Evacuation alert", sub: "muster and move to safety", real: false },
  { icon: "power", label: "Equipment shutdown", sub: "supervisory control command", real: false },
];

/** Alert fan-out with the real SMS that reached a team member's phone */
export const SFAlert: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <div style={{ position: "absolute", left: 150, top: 160 }}>
      <PhoneFrame src="ui/sms-phone.jpg" width={350} />
    </div>
    <AlertFan channels={CHANNELS} cx={780} cy={560} />
    <div style={{ position: "absolute", right: SAFE.x, bottom: 70, display: "flex", gap: 28, fontFamily: FONT.body, fontSize: 18, color: COLOR.dim }}>
      <span>
        <span style={{ color: COLOR.green }}>●</span> in the prototype
      </span>
      <span>
        <span style={{ color: COLOR.violet }}>●</span> claimed embodiment
      </span>
    </div>
    <ClaimChip n={10} dependsOn={1} kind="system" />
    <EvidenceTag kind="PROTOTYPE" note="real SMS received in testing" />
    <ProgressRail current={10} />
  </AbsoluteFill>
);
