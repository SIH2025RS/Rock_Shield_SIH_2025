import React from "react";
import { AbsoluteFill } from "remotion";
import { ChapterShell, Reveal, Shot } from "../components/Chapter";
import { CAM, Fig1World, FlowId, NodeId } from "../components/Fig1World";
import { ClaimIntro, FigSide, Label, Terminal } from "../components/Widgets";
import { EvidenceTag } from "../components/HUD";
import { TitleCard } from "../components/TitleCard";
import { CodeScroller, Snippet } from "../components/CodeScroller";
import { BrowserFrame, PhoneFrame } from "../components/Frames";
import { AlertFan, Channel } from "../components/AlertFan";
import { ClaimMap, DatasetTable, EnsembleFlow, LayerMap, ModelFamilies, ModelGlyphs, PreprocessScene, RainConcept, SensorGrid, SiteHero, TimeTracks } from "../components/ScenesA";
import { DecisionCards, EdgeLinkScene, FusionScene, HazardReplay, MineSection, PubSub } from "../components/ScenesB";
import { ClaimGrid, ControlPanel, CreditsCard, MethodSteps, SiteGrid } from "../components/ScenesC";
import { COLOR, FONT, RISK_COLOR, SAFE } from "../theme";
import { claim } from "../lib/content";
import reading from "../../public/data/reading.json";
import metrics from "../../public/data/metrics.json";
import live from "../../public/data/predict-response.json";
import mergeCode from "../generated/code/merge.json";
import preprocessCode from "../generated/code/preprocess.json";
import lstmCode from "../generated/code/lstm-model.json";
import xgbCode from "../generated/code/xgb-model.json";
import ensembleCode from "../generated/code/ensemble.json";
import hubCode from "../generated/code/hub-ml.json";
import pushCode from "../generated/code/push.json";
import forwardCode from "../generated/code/alert-forward.json";
import notifyCode from "../generated/code/notifications.json";
import schemaCode from "../generated/code/storage-schema.json";
import roleCode from "../generated/code/update-role.json";
import sensorCode from "../generated/code/register-sensor.json";

const S = (x: unknown) => x as Snippet;

/* ================================ Opening ================================ */

export const Ch00: React.FC = () => (
  <ChapterShell id="ch00" background={false}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("title") + 14} fade={1}>
          <SiteHero crackAt={t.b("crack")} pinsAt={t.b("question")} />
          <Shot from={t.b("crack")} to={t.b("question")}>
            <EvidenceTag kind="EMBODIMENT" note="illustration" />
          </Shot>
        </Shot>
        <Shot from={t.b("title")} to={t.frames} fade={16}>
          <TitleCard enter={t.b("title")} />
        </Shot>
      </>
    )}
  </ChapterShell>
);

export const Ch01: React.FC = () => (
  <ChapterShell id="ch01">
    {(t) => {
      const keys = [
        { frame: 0, ...CAM.top },
        { frame: t.b("sensors"), ...CAM.top },
        { frame: t.b("sensors") + 30, ...CAM.sensor },
        { frame: t.b("comm"), ...CAM.sensor },
        { frame: t.b("comm") + 30, ...CAM.comm },
        { frame: t.b("edge"), ...CAM.comm },
        { frame: t.b("edge") + 30, ...CAM.edge },
        { frame: t.b("storage"), ...CAM.edge },
        { frame: t.b("storage") + 30, ...CAM.storage },
        { frame: t.b("app"), ...CAM.storage },
        { frame: t.b("app") + 30, ...CAM.app },
        { frame: t.b("loop"), ...CAM.app },
        { frame: t.b("loop") + 34, ...CAM.loop },
      ];
      return (
        <>
          <Shot from={0} to={t.b("claims") + 14}>
            <Fig1World revealAt={t.b("fig")} camera={keys} packets={["101c-a", "101c-b", "102a", "103f", "103g", "103e", "103e-102"]} />
          </Shot>
          <Shot from={t.b("claims")} to={t.frames}>
            <ClaimMap enter={t.b("claims")} />
          </Shot>
        </>
      );
    }}
  </ChapterShell>
);

/* ============================= Claim 1 ============================= */

const c1 = claim(1);
const between = (start: string, end: string) => {
  const a = c1.text.indexOf(start);
  const b = c1.text.indexOf(end, a + 1);
  return c1.text.slice(a, b).trim();
};

export const Ch02: React.FC = () => (
  <ChapterShell id="ch02" claimN={1}>
    {(t) => {
      const parts: { beat: string; next: string; excerpt: string; focus: NodeId[]; tag?: "EMBODIMENT"; packets?: FlowId[] }[] = [
        { beat: "intro", next: "sensor", excerpt: c1.paragraphs[0], focus: [] },
        { beat: "sensor", next: "comm", excerpt: c1.paragraphs[1], focus: ["101", "101a", "101b"] },
        { beat: "comm", next: "edge", excerpt: c1.paragraphs[2], focus: ["102", "101c"] },
        { beat: "edge", next: "storage", excerpt: between("an edge computing layer (103)", "a data storage layer (104)"), focus: ["103", "103a", "103b", "103c", "103d"] },
        { beat: "storage", next: "app", excerpt: between("a data storage layer (104)", "and an application layer (105)"), focus: ["104", "103f"] },
        { beat: "app", next: "wherein", excerpt: between("an application layer (105)", "wherein,"), focus: ["105", "103g"] },
        { beat: "wherein", next: "buffer", excerpt: c1.paragraphs[5], focus: ["103", "103a", "103b", "103c", "103d"] },
        { beat: "buffer", next: "sync", excerpt: c1.paragraphs[6], focus: ["103"], tag: "EMBODIMENT" },
        { beat: "sync", next: "config", excerpt: c1.paragraphs[7], focus: ["104", "103f"], tag: "EMBODIMENT", packets: ["103f"] },
        { beat: "config", next: "proto", excerpt: c1.paragraphs[8], focus: ["103e", "105"], packets: ["103e", "103e-102"] },
      ];
      return (
        <>
          {parts.map((p) => (
            <Shot key={p.beat} from={t.b(p.beat)} to={t.b(p.next) + 12}>
              <ClaimIntro n={1} focus={p.focus} excerpt={p.excerpt} fontSize={p.excerpt.length > 420 ? 25 : 29} packets={p.packets} />
              {p.tag && <EvidenceTag kind={p.tag} />}
            </Shot>
          ))}
          <Shot from={t.b("proto")} to={t.frames}>
            <LayerMap enter={t.b("proto")} />
            <EvidenceTag kind="PROTOTYPE" />
          </Shot>
        </>
      );
    }}
  </ChapterShell>
);

/* ========================== Claims 2 – 4: sensing ========================== */

export const Ch03: React.FC = () => (
  <ChapterShell id="ch03" claimN={2}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("list") + 12}>
          <ClaimIntro n={2} focus={["101a"]} highlights={["strain sensing elements", "vibration sensing elements", "pore pressure sensing elements", "gas sensing elements", "acoustic emission sensing elements"].map((phrase, i) => ({ phrase, at: t.b("intro") + 20 + i * 12 }))} />
        </Shot>
        <Shot from={t.b("list")} to={t.b("world") + 12}>
          <SensorGrid enter={t.b("list")} emphasise={{ at: t.b("why"), names: ["Strain", "Vibration", "Pore pressure"] }} />
          <EvidenceTag kind="PROTOTYPE" note="sparklines: simulated dataset" />
        </Shot>
        <Shot from={t.b("world")} to={t.b("proto") + 12}>
          <RainConcept enter={t.b("world")} />
          <EvidenceTag kind="EMBODIMENT" note="concept" />
        </Shot>
        <Shot from={t.b("proto")} to={t.frames}>
          <DatasetTable enter={t.b("proto")} />
          <EvidenceTag kind="PROTOTYPE" note="simulated dataset" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

export const Ch04: React.FC = () => (
  <ChapterShell id="ch04" claimN={3}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("why") + 12}>
          <ClaimIntro n={3} focus={["103a"]} highlights={[{ phrase: "temporally synchronized", at: t.b("intro") + 30 }, { phrase: "before execution of predictive inference", at: t.b("intro") + 60 }]} />
        </Shot>
        <Shot from={t.b("why")} to={t.b("code") + 12}>
          <TimeTracks enter={t.b("why")} mismatchAt={t.b("world")} snapAt={t.b("world") + 70} />
        </Shot>
        <Shot from={t.b("code")} to={t.frames}>
          <div style={{ position: "absolute", left: SAFE.x, top: 130 }}>
            <CodeScroller snippet={S(mergeCode)} width={1728} height={800} focus={[{ at: t.b("code") + 6, from: "time", note: "Weather rows joined to sensor rows on the same timestamp" }, { at: t.b("code") + 100, from: "patch", note: "Terrain features joined per patch" }]} />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="ModelPipeline/lstm_xgb_ensemble2.py" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

export const Ch05: React.FC = () => (
  <ChapterShell id="ch05" claimN={4}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("raw") + 12}>
          <ClaimIntro n={4} focus={["103a"]} highlights={["noise reduction", "missing data estimation", "feature extraction", "normalization"].map((phrase, i) => ({ phrase, at: t.b("intro") + 20 + i * 14 }))} />
        </Shot>
        <Shot from={t.b("raw")} to={t.b("world") + 12}>
          <PreprocessScene beats={{ raw: t.b("raw"), fill: t.b("fill"), outlier: t.b("outlier"), smooth: t.b("smooth"), scale: t.b("scale"), features: t.b("features") }} />
          <EvidenceTag kind="PROTOTYPE" note="raw test data → preprocessing script" />
        </Shot>
        <Shot from={t.b("world")} to={t.b("scope") + 12}>
          <div style={{ position: "absolute", left: SAFE.x, top: 130 }}>
            <CodeScroller snippet={S(preprocessCode)} width={1728} height={800} focus={[{ at: t.b("world"), from: "ffill", note: "Gaps filled from neighbouring readings" }, { at: t.b("world") + 90, from: "outliers", to: "smooth", note: "Extreme spikes rejected, then Savitzky–Golay smoothing" }]} />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="preprocessing_of_raw_sensor_data.py" />
        </Shot>
        <Shot from={t.b("scope")} to={t.frames}>
          <FigSide focus={["103a"]} />
          <div style={{ position: "absolute", left: 1060, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
            {["Sensor calibration", "Anomaly detection", "Spatial correlation between nodes", "Temporal aggregation"].map((s) => (
              <div key={s} style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 34, color: COLOR.text, padding: "16px 24px", borderRadius: 14, background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.45)" }}>
                {s}
              </div>
            ))}
          </div>
          <EvidenceTag kind="EMBODIMENT" note="also claimed" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

/* ========================== Claims 5 – 7: models ========================== */

export const Ch06: React.FC = () => (
  <ChapterShell id="ch06" claimN={5}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("list") + 12}>
          <ClaimIntro n={5} focus={["103b"]} highlights={["temporal sequence learning models", "feature-based machine learning models", "ensemble prediction models"].map((phrase, i) => ({ phrase, at: t.b("intro") + 20 + i * 14 }))} />
        </Shot>
        <Shot from={t.b("list")} to={t.b("proto") + 12}>
          <ModelFamilies enter={t.b("list")} pickAt={t.b("world")} />
        </Shot>
        <Shot from={t.b("proto")} to={t.frames}>
          <div style={{ position: "absolute", left: SAFE.x, top: 150 }}>
            <Terminal
              title="ai-ml/ml-service — python main.py"
              width={1728}
              height={760}
              enter={t.b("proto")}
              lines={[
                { text: "python main.py", at: t.b("proto") + 6, typed: true },
                { text: "✓ Ensemble config loaded: 38 XGB features, 21 LSTM features", at: t.b("proto") + 30, color: "#7EE787" },
                { text: "✓ XGBoost model loaded with 38 features", at: t.b("proto") + 40, color: "#7EE787" },
                { text: "✓ LSTM model loaded", at: t.b("proto") + 50, color: "#7EE787" },
                { text: "INFO:     Uvicorn running on http://0.0.0.0:8001", at: t.b("proto") + 60 },
                { text: "curl -s localhost:8001/health", at: t.b("proto") + 80, typed: true },
                { text: JSON.stringify(live.health), at: t.b("proto") + 110, color: "#79C0FF" },
              ]}
            />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="recorded output of the ML service" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

export const Ch07: React.FC = () => (
  <ChapterShell id="ch07" claimN={6}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("world") + 12}>
          <ClaimIntro
            n={6}
           
            focus={["103b"]}
            highlights={[
              { phrase: "Long Short-Term Memory neural network", at: t.b("intro") + 20 },
              { phrase: "Extreme Gradient Boosting model", at: t.b("xgb") },
              { phrase: "Random Forest model", at: t.b("others") },
              { phrase: "Gradient Boosting Machine", at: t.b("others") + 10 },
              { phrase: "Artificial Neural Network", at: t.b("others") + 20 },
              { phrase: "Support Vector Machine", at: t.b("others") + 30 },
              { phrase: "Decision Tree model", at: t.b("others") + 40 },
            ]}
          />
        </Shot>
        <Shot from={t.b("world")} to={t.b("proto") + 12}>
          <ModelGlyphs enter={t.b("world")} />
        </Shot>
        <Shot from={t.b("proto")} to={t.frames}>
          <div style={{ position: "absolute", left: SAFE.x, top: 140, display: "flex", gap: 28 }}>
            <CodeScroller snippet={S(lstmCode)} width={850} height={780} fontSize={21} focus={[{ at: t.b("proto") + 6, from: "lstm", note: "LSTM with 64 memory units" }]} />
            <CodeScroller snippet={S(xgbCode)} width={850} height={780} fontSize={21} focus={[{ at: t.b("proto") + 50, from: "trees", note: "300 boosted trees" }]} enter={t.b("proto") + 20} />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="ModelPipeline/lstm_xgb_ensemble2.py" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

export const Ch08: React.FC = () => (
  <ChapterShell id="ch08" claimN={7}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("lstm") + 12}>
          <ClaimIntro n={7} focus={["103b"]} highlights={["a temporal learning model", "a feature-based learning model", "an ensemble prediction model", "consolidated hazard prediction"].map((phrase, i) => ({ phrase, at: t.b("intro") + 24 + i * 16 }))} />
        </Shot>
        <Shot from={t.b("lstm")} to={t.b("merge") + 12}>
          <EnsembleFlow lstmAt={t.b("lstm")} xgbAt={t.b("xgb")} mergeAt={t.b("merge")} />
          <EvidenceTag kind="PROTOTYPE" note="real model outputs" />
        </Shot>
        <Shot from={t.b("merge")} to={t.frames}>
          <div style={{ position: "absolute", left: SAFE.x, top: 130 }}>
            <CodeScroller snippet={S(ensembleCode)} width={1120} height={820} focus={[{ at: t.b("merge") + 6, from: "weighted", note: "0.7 × XGBoost + 0.3 × LSTM" }, { at: t.b("auc") - 20, from: "low", to: "high", note: "Score mapped to LOW / MEDIUM / HIGH" }]} />
          </div>
          <div style={{ position: "absolute", left: 1290, top: 170, width: 540 }}>
            <Label>{`Real output · ${reading.patch} · ${reading.timestamp}`}</Label>
            {[
              ["XGBoost", reading.xgb.toFixed(3)],
              ["LSTM", reading.lstm.toFixed(3)],
              ["0.7 × XGB + 0.3 × LSTM", reading.ensemble.toFixed(3)],
            ].map(([k, v], i) => (
              <Reveal key={k} at={t.b("example") + i * 14} style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: `1px solid ${COLOR.line}` }}>
                <span style={{ fontFamily: FONT.body, fontSize: 24, color: COLOR.dim }}>{k}</span>
                <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 32, color: COLOR.text }}>{v}</span>
              </Reveal>
            ))}
            <Reveal at={t.b("example") + 48} style={{ display: "flex", justifyContent: "space-between", padding: "16px 0" }}>
              <span style={{ fontFamily: FONT.body, fontSize: 24, color: COLOR.dim }}>Hazard level</span>
              <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 32, color: RISK_COLOR.HIGH }}>{reading.level}</span>
            </Reveal>
            <Shot from={t.b("auc")} to={t.frames}>
              <div style={{ position: "absolute", top: 440, left: 0, width: 540, padding: 24, borderRadius: 14, background: COLOR.panelSolid, border: `1px solid ${COLOR.line}` }}>
                <Label>Held-out test set · ROC-AUC</Label>
                <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 56, color: COLOR.text, marginTop: 8 }}>{metrics.pipelineSplit.ensembleAuc.toFixed(2)}</div>
                <div style={{ fontFamily: FONT.body, fontSize: 19, color: COLOR.faint }}>ensemble · simulated dataset · {metrics.pipelineSplit.testRows.toLocaleString()} test rows</div>
              </div>
            </Shot>
          </div>
          <EvidenceTag kind="PROTOTYPE" note="ai-ml/ml-service/main.py" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

/* ========================== Claims 8 – 10: risk & alerts ========================== */

export const Ch09: React.FC = () => (
  <ChapterShell id="ch09" claimN={8}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("fusion") + 12}>
          <ClaimIntro n={8} focus={["103c"]} highlights={[{ phrase: "continuously updates the hazard risk scores", at: t.b("intro") + 24 }, { phrase: "fused heterogeneous sensing information", at: t.b("intro") + 60 }]} />
        </Shot>
        <Shot from={t.b("fusion")} to={t.b("proto") + 12}>
          <FusionScene enter={t.b("fusion")} end={t.b("proto")} />
          <EvidenceTag kind="PROTOTYPE" note="real scores · simulated dataset" />
        </Shot>
        <Shot from={t.b("proto")} to={t.b("dashboard") + 12}>
          <div style={{ position: "absolute", left: SAFE.x, top: 130 }}>
            <CodeScroller snippet={S(hubCode)} width={1728} height={800} focus={[{ at: t.b("proto") + 6, from: "interval", note: "A fresh prediction every 15 seconds per monitored location" }, { at: t.b("proto") + 90, from: "predict", to: "timer" }]} />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="backend/src/index.js" />
        </Shot>
        <Shot from={t.b("dashboard")} to={t.frames}>
          <div style={{ position: "absolute", left: (1920 - 1520) / 2, top: 128 }}>
            <BrowserFrame src="ui/dashboard-analytics.png" imageSize={[1920, 1080]} url="localhost:5173/dashboard" width={1520} zoom={[{ frame: t.b("dashboard"), x: 960, y: 540, scale: 1 }, { frame: t.b("dashboard") + 80, x: 880, y: 690, scale: 1.3 }]} callouts={[{ at: t.b("dashboard") + 70, box: [100, 443, 1709, 528], label: "Risk trend over the day", side: "top" }]} enter={t.b("dashboard")} />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="RockShield web dashboard" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

export const Ch10: React.FC = () => (
  <ChapterShell id="ch10" claimN={9}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("world") + 12}>
          <ClaimIntro n={9} focus={["103c"]} highlights={["a normal condition", "a warning condition", "a critical condition", "customized hazard levels"].map((phrase, i) => ({ phrase, at: t.b("intro") + 30 + i * 18 }))} />
        </Shot>
        <Shot from={t.b("world")} to={t.b("thresholds") + 12}>
          <DecisionCards enter={t.b("world")} />
        </Shot>
        <Shot from={t.b("thresholds")} to={t.frames}>
          <HazardReplay enter={t.b("thresholds")} replayAt={t.b("replay")} end={t.voiceEnd} />
          <EvidenceTag kind="PROTOTYPE" note="real scores · simulated dataset" />
        </Shot>
      </>
    )}
  </ChapterShell>
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

export const Ch11: React.FC = () => (
  <ChapterShell id="ch11" claimN={10}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("channels") + 12}>
          <ClaimIntro n={10} focus={["103d"]} highlights={["visual notifications", "audible alarms", "push notifications", "evacuation alerts", "equipment shutdown commands"].map((phrase, i) => ({ phrase, at: t.b("intro") + 24 + i * 12 }))} />
        </Shot>
        <Shot from={t.b("channels")} to={t.b("push") + 12}>
          <div style={{ position: "absolute", left: 150, top: 160 }}>
            <PhoneFrame src="ui/sms-phone.jpg" width={350} enter={t.b("sms") - 10} />
          </div>
          <AlertFan channels={CHANNELS} cx={780} cy={500} enter={t.b("channels")} stagger={8} />
          <EvidenceTag kind="PROTOTYPE" note="real SMS received in testing" />
        </Shot>
        <Shot from={t.b("push")} to={t.b("dashboard") + 12}>
          <div style={{ position: "absolute", left: 170, top: 120 }}>
            <PhoneFrame src="ui/mobile-alerts.mp4" kind="video" width={380} enter={t.b("push")} />
          </div>
          <div style={{ position: "absolute", left: 700, top: 160 }}>
            <CodeScroller snippet={S(pushCode)} width={1120} height={760} fontSize={22} focus={[{ at: t.b("push") + 10, from: "schedule", note: "Push notification with the alert's severity" }]} />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="RockShield mobile app (team recording)" />
        </Shot>
        <Shot from={t.b("dashboard")} to={t.b("scope") + 12}>
          <div style={{ position: "absolute", left: SAFE.x, top: 130 }}>
            <CodeScroller
              snippet={S(forwardCode)}
              width={850}
              height={800}
              fontSize={21}
              focus={[{ at: t.b("dashboard") + 6, from: "update", note: "Operator forwards the alert to miners" }]}
            />
          </div>
          <div style={{ position: "absolute", left: SAFE.x + 878, top: 130 }}>
            <CodeScroller snippet={S(notifyCode)} width={850} height={800} fontSize={21} enter={t.b("escalate") - 10} focus={[{ at: t.b("escalate"), from: "sms", to: "email", note: "Escalation by SMS, voice call and email" }]} />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="backend routes and notification service" />
        </Shot>
        <Shot from={t.b("scope")} to={t.frames}>
          <AlertFan channels={CHANNELS} cx={700} cy={500} enter={t.b("scope") - 30} stagger={0} />
          <EvidenceTag kind="EMBODIMENT" note="sirens, evacuation, shutdown" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

/* ========================== Claims 11 – 14: links & resilience ========================== */

export const Ch12: React.FC = () => (
  <ChapterShell id="ch12" claimN={11}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("world") + 12}>
          <ClaimIntro n={11} focus={["102"]} highlights={[{ phrase: "Ethernet, Wi-Fi", at: t.b("intro") + 20 }, { phrase: "LoRa®, LoRaWAN®", at: t.b("intro") + 36 }, { phrase: "satellite communication", at: t.b("intro") + 52 }]} />
        </Shot>
        <Shot from={t.b("world")} to={t.frames}>
          <MineSection beats={{ wired: t.b("wired"), radio: t.b("radio"), cellular: t.b("cellular"), satellite: t.b("satellite"), proto: t.b("proto") }} />
          <EvidenceTag kind="EMBODIMENT" note="claimed link types" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

export const Ch13: React.FC = () => (
  <ChapterShell id="ch13" claimN={12}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("topics") + 12}>
          <ClaimIntro n={12} focus={["102"]} highlights={[{ phrase: "publish-subscribe communication protocol", at: t.b("intro") + 20 }, { phrase: "MQTT, AMQP, DDS, CoAP, ZeroMQ", at: t.b("intro") + 50 }]} />
        </Shot>
        <Shot from={t.b("topics")} to={t.b("proto") + 12}>
          <PubSub enter={t.b("topics")} whyAt={t.b("why")} />
          <EvidenceTag kind="EMBODIMENT" note="claimed protocols" />
        </Shot>
        <Shot from={t.b("proto")} to={t.frames}>
          <div style={{ position: "absolute", left: SAFE.x, top: 130 }}>
            <CodeScroller snippet={S(hubCode)} width={1728} height={800} focus={[{ at: t.b("proto") + 6, from: "subscribe", note: "The dashboard subscribes to a location and receives each new prediction" }]} />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="same pattern over Socket.io" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

export const Ch14: React.FC = () => (
  <ChapterShell id="ch14" claimN={13}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("world") + 12}>
          <ClaimIntro n={13} focus={["103"]} highlights={[{ phrase: "hazard prediction continues during intermittent communication", at: t.b("intro") + 20 }, { phrase: "locally buffering processed sensing information", at: t.b("intro") + 50 }]} />
        </Shot>
        <Shot from={t.b("world")} to={t.b("proto") + 12}>
          <EdgeLinkScene mode="offline" cutAt={t.b("cut")} bufferAt={t.b("buffer")} />
          <EvidenceTag kind="EMBODIMENT" note="offline buffering" />
        </Shot>
        <Shot from={t.b("proto")} to={t.frames}>
          <div style={{ position: "absolute", left: SAFE.x, top: 150 }}>
            <Terminal
              title="local machine · no internet needed for the prediction"
              width={1728}
              height={700}
              enter={t.b("proto")}
              lines={[
                { text: `curl -s localhost:8001/predict -d @${live.request.location}_${live.request.timestamp.replace(/[ :]/g, "-")}.json`, at: t.b("proto") + 6, typed: true },
                { text: `{"risk_score": ${live.response.risk_score.toFixed(4)}, "klass": "${live.response.klass}",`, at: t.b("proto") + 40, color: "#79C0FF" },
                { text: ` "recommended_action": "${live.response.recommended_action}",`, at: t.b("proto") + 44, color: "#79C0FF" },
                { text: ` "ensemble_calculation": "${live.calculation}"}`, at: t.b("proto") + 48, color: "#79C0FF" },
              ]}
            />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="recorded response from the local service" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

export const Ch15: React.FC = () => (
  <ChapterShell id="ch15" claimN={14}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("what") + 12}>
          <ClaimIntro n={14} focus={["104", "103f"]} highlights={[{ phrase: "only processed sensing information", at: t.b("intro") + 20 }, { phrase: "following restoration of communication connectivity", at: t.b("intro") + 50 }]} />
        </Shot>
        <Shot from={t.b("what")} to={t.b("proto") + 12}>
          <EdgeLinkScene mode="sync" cutAt={0} restoreAt={t.b("what") + 10} />
          <EvidenceTag kind="EMBODIMENT" note="selective synchronisation" />
        </Shot>
        <Shot from={t.b("proto")} to={t.frames}>
          <div style={{ position: "absolute", left: SAFE.x, top: 130 }}>
            <CodeScroller snippet={S(schemaCode)} width={1728} height={760} focus={[{ at: t.b("proto") + 6, from: "table", to: "explain", note: "Each prediction stored as one compact record" }]} />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="backend/src/db/initDb.js" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

/* ========================== Claims 15 – 17: people & places ========================== */

export const Ch16: React.FC = () => (
  <ChapterShell id="ch16" claimN={15}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("dashboard") + 12}>
          <ClaimIntro n={15} focus={["105"]} highlights={[{ phrase: "remote visualization", at: t.b("intro") + 20 }, { phrase: "historical monitoring information", at: t.b("intro") + 44 }, { phrase: "alert notifications", at: t.b("intro") + 70 }]} />
        </Shot>
        <Shot from={t.b("dashboard")} to={t.b("map") + 12}>
          <div style={{ position: "absolute", left: (1920 - 1560) / 2, top: 128 }}>
            <BrowserFrame src="ui/dashboard-analytics.png" imageSize={[1920, 1080]} url="localhost:5173/dashboard" width={1560} enter={t.b("dashboard")} zoom={[{ frame: t.b("dashboard"), x: 960, y: 540, scale: 1.0 }, { frame: t.b("map"), x: 900, y: 480, scale: 1.12 }]} />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="RockShield web dashboard" />
        </Shot>
        <Shot from={t.b("map")} to={t.b("mobile") + 12}>
          <div style={{ position: "absolute", left: 640, top: 110 }}>
            <BrowserFrame src="ui/multilingual-2.png" imageSize={[446, 1079]} url="localhost:5173/dashboard" width={640} enter={t.b("map")} zoom={[{ frame: t.b("map"), x: 223, y: 420, scale: 1.0 }, { frame: t.b("pages"), x: 223, y: 520, scale: 1.0 }, { frame: t.b("pages") + 60, x: 223, y: 760, scale: 1.0 }]} />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="terrain view, weather, zones, recent alerts" />
        </Shot>
        <Shot from={t.b("mobile")} to={t.b("language") + 12}>
          <div style={{ position: "absolute", left: SAFE.x, top: 200 }}>
            <BrowserFrame src="ui/mobile-miner-home.jpg" imageSize={[1280, 617]} url="RockShield mobile · miner view (Expo web preview)" width={1150} enter={t.b("mobile")} />
          </div>
          <div style={{ position: "absolute", left: 1350, top: 120 }}>
            <PhoneFrame src="ui/mobile-alerts.mp4" kind="video" width={380} enter={t.b("mobile") + 10} startFrom={60} />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="RockShield mobile app" />
        </Shot>
        <Shot from={t.b("language")} to={t.frames}>
          <div style={{ position: "absolute", left: 360, top: 110 }}>
            <BrowserFrame src="ui/multilingual-tamil.png" imageSize={[511, 941]} url="localhost:5173 · தமிழ்" width={560} enter={t.b("language")} />
          </div>
          <div style={{ position: "absolute", left: 1000, top: 140, display: "flex", flexDirection: "column", gap: 14 }}>
            <Label>Dashboard languages</Label>
            {["English", "हिन्दी  Hindi", "বাংলা  Bengali", "मराठी  Marathi", "தமிழ்  Tamil", "తెలుగు  Telugu", "ಕನ್ನಡ  Kannada"].map((l) => (
              <div key={l} style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 34, color: COLOR.text }}>
                {l}
              </div>
            ))}
          </div>
          <EvidenceTag kind="PROTOTYPE" note="7 languages in the web dashboard" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

export const Ch17: React.FC = () => (
  <ChapterShell id="ch17" claimN={16}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("list") + 12}>
          <ClaimIntro n={16} focus={["105", "103e"]} highlights={["remote modification", "sensing intervals", "hazard thresholds", "firmware updates", "user permissions"].map((phrase, i) => ({ phrase, at: t.b("intro") + 20 + i * 12 }))} />
        </Shot>
        <Shot from={t.b("list")} to={t.b("proto") + 12}>
          <AbsoluteFill style={{ clipPath: "inset(0 0 0 46%)" }}>
            <Fig1World camera={[{ frame: 0, x: 1180, y: 1300, scale: 0.78 }]} focus={["103e", "105", "103", "102"]} focusAt={t.b("path")} packets={["103e", "103e-102"]} />
          </AbsoluteFill>
          <ControlPanel enter={t.b("list")} thresholdAt={t.b("world")} />
          <EvidenceTag kind="EMBODIMENT" note="remote configuration" />
        </Shot>
        <Shot from={t.b("proto")} to={t.frames}>
          <div style={{ position: "absolute", left: SAFE.x, top: 140, display: "flex", gap: 28 }}>
            <CodeScroller snippet={S(roleCode)} width={850} height={780} fontSize={21} focus={[{ at: t.b("proto") + 6, from: "clerk", to: "update", note: "Administrator changes a user's role" }]} />
            <CodeScroller snippet={S(sensorCode)} width={850} height={780} fontSize={21} enter={t.b("proto") + 24} focus={[{ at: t.b("proto") + 60, from: "route", to: "role", note: "Backend accepts new sensor registrations" }]} />
          </div>
          <EvidenceTag kind="PROTOTYPE" note="backend/src/routes" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

export const Ch18: React.FC = () => (
  <ChapterShell id="ch18" claimN={17}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("mines") + 12}>
          <ClaimIntro n={17} focus={["101"]} highlights={["open-pit mine, underground mine", "tunnel", "dam", "landslide-prone terrain"].map((phrase, i) => ({ phrase, at: t.b("intro") + 20 + i * 14 }))} />
        </Shot>
        <Shot from={t.b("mines")} to={t.b("proto") + 12}>
          <SiteGrid enter={t.b("mines") - 10} groups={{ mines: t.b("mines"), transport: t.b("transport"), structures: t.b("structures"), terrain: t.b("terrain") }} />
          <EvidenceTag kind="EMBODIMENT" note="claimed deployment sites" />
        </Shot>
        <Shot from={t.b("proto")} to={t.frames}>
          <SiteHero crackAt={1e9} pinsAt={t.b("proto") - 200} />
          <EvidenceTag kind="PROTOTYPE" note="JH-UG patches · simulated dataset" />
        </Shot>
      </>
    )}
  </ChapterShell>
);

/* ========================== Claim 18 and close ========================== */

export const Ch19: React.FC = () => (
  <ChapterShell id="ch19" claimN={18}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("s1") + 12}>
          <ClaimIntro n={18} focus={[]} excerpt={claim(18).paragraphs[0]} highlights={[{ phrase: "A method (200)", at: t.b("intro") + 10 }]} />
        </Shot>
        <Shot from={t.b("s1")} to={t.b("wherein") + 12}>
          <MethodSteps beats={["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11"].map((s) => t.b(s))} />
        </Shot>
        <Shot from={t.b("wherein")} to={t.frames}>
          <Fig1World camera={[{ frame: t.b("wherein"), ...CAM.overview }, { frame: t.b("wherein") + 120, ...CAM.loop }]} packets={["101c-a", "101c-b", "102a", "103f", "103g", "103e", "103e-102"]} focus={["103"]} focusAt={t.b("example")} />
          <Shot from={t.b("example")} to={t.frames}>
            <div style={{ position: "absolute", left: SAFE.x, top: 180, width: 560, padding: 28, borderRadius: 18, background: COLOR.panelSolid, border: `2px solid ${RISK_COLOR.HIGH}` }}>
              <Label>{`${reading.patch} · ${reading.timestamp}`}</Label>
              <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 54, color: COLOR.text, marginTop: 10 }}>{reading.ensemble.toFixed(3)}</div>
              <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 28, letterSpacing: 3, color: RISK_COLOR.HIGH }}>CRITICAL · alert raised on site</div>
            </div>
          </Shot>
        </Shot>
      </>
    )}
  </ChapterShell>
);

export const Ch20: React.FC = () => (
  <ChapterShell id="ch20" rail={18}>
    {(t) => (
      <>
        <Shot from={0} to={t.b("credits") + 30}>
          <ClaimGrid enter={4} />
        </Shot>
        <Shot from={t.b("credits") + 10} to={t.frames} fade={20}>
          <CreditsCard enter={t.b("credits") + 14} />
        </Shot>
      </>
    )}
  </ChapterShell>
);

export const CHAPTER_COMPONENTS: Record<string, React.FC> = {
  ch00: Ch00,
  ch01: Ch01,
  ch02: Ch02,
  ch03: Ch03,
  ch04: Ch04,
  ch05: Ch05,
  ch06: Ch06,
  ch07: Ch07,
  ch08: Ch08,
  ch09: Ch09,
  ch10: Ch10,
  ch11: Ch11,
  ch12: Ch12,
  ch13: Ch13,
  ch14: Ch14,
  ch15: Ch15,
  ch16: Ch16,
  ch17: Ch17,
  ch18: Ch18,
  ch19: Ch19,
  ch20: Ch20,
};
