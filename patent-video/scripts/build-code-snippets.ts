/**
 * Highlight real source files from the RockShield repo for the CodeScroller scenes.
 *
 * Snippets are located by string anchors (not line numbers) so edits to the code don't silently
 * shift what the video shows. A missing anchor or anything that looks like a secret fails the build.
 *
 *   npx tsx scripts/build-code-snippets.ts
 */
import { createHighlighter } from "shiki";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const REPO = resolve(ROOT, "..");
const OUT = join(ROOT, "src", "generated", "code");
const THEME = "github-dark-default";

type Lang = "python" | "javascript" | "jsx" | "sql";

type SnippetSpec = {
  id: string;
  file: string;
  lang: Lang;
  /** First line of the snippet contains this text (nth match, default 1) */
  start: string;
  startMatch?: number;
  /** Number of lines to include */
  lines: number;
  /** Named focus lines: each name maps to text found inside the snippet */
  focus: Record<string, string>;
};

const SNIPPETS: SnippetSpec[] = [
  {
    id: "preprocess",
    file: "ai-ml/rockfall-prediction-system/preprocessing script for raw data/preprocessing_of_raw_sensor_data.py",
    lang: "python",
    start: "# 2. HANDLE MISSING VALUES",
    lines: 50,
    focus: { ffill: 'fillna(method="ffill")', outliers: "def remove_outliers", smooth: "savgol_filter(series", clip: "clip(lower=0)" },
  },
  {
    id: "timestamp",
    file: "ai-ml/rockfall-prediction-system/preprocessing script for raw data/preprocessing_of_raw_sensor_data.py",
    lang: "python",
    start: "# 1. LOAD RAW DATA",
    lines: 14,
    focus: { parse: "pd.to_datetime", sort: "sort_values" },
  },
  {
    id: "merge",
    file: "ai-ml/rockfall-prediction-system/ModelPipeline/lstm_xgb_ensemble2.py",
    lang: "python",
    start: "def merge_dem_weather",
    lines: 26,
    focus: { time: 'on="timestamp"', patch: 'on="patch_id"' },
  },
  {
    id: "lstm-model",
    file: "ai-ml/rockfall-prediction-system/ModelPipeline/lstm_xgb_ensemble2.py",
    lang: "python",
    start: "def build_lstm_model",
    lines: 21,
    focus: { lstm: "layers.LSTM(64", out: "activation=\"sigmoid\"" },
  },
  {
    id: "xgb-model",
    file: "ai-ml/rockfall-prediction-system/ModelPipeline/lstm_xgb_ensemble2.py",
    lang: "python",
    start: "xgb = XGBClassifier(",
    lines: 15,
    focus: { trees: "n_estimators", balance: "scale_pos_weight=scale_pos_weight", fit: "xgb.fit" },
  },
  {
    id: "health",
    file: "ai-ml/ml-service/main.py",
    lang: "python",
    start: "@app.get('/health')",
    lines: 9,
    focus: { xgb: "'xgb_loaded'", lstm: "'lstm_loaded'", ensemble: "'ensemble_enabled'" },
  },
  {
    id: "lstm-predict",
    file: "ai-ml/ml-service/main.py",
    lang: "python",
    start: "def _predict_lstm",
    lines: 30,
    focus: { window: "_create_lstm_window", scale: "_scaler.transform", predict: "_lstm.predict" },
  },
  {
    id: "ensemble",
    file: "ai-ml/ml-service/main.py",
    lang: "python",
    start: "def _ensemble_predict",
    lines: 36,
    focus: {
      inputs: "xgb_result = _predict_xgboost",
      weighted: "ensemble_score = (xgb_weight * xgb_score)",
      low: "if ensemble_score < safe_threshold",
      medium: "elif ensemble_score < warning_threshold",
      high: "klass = 'HIGH'",
      sms: "send_sms_alert(ensemble_score, action)",
    },
  },
  {
    id: "predict-endpoint",
    file: "ai-ml/ml-service/main.py",
    lang: "python",
    start: "@app.post('/predict'",
    lines: 10,
    focus: { route: "@app.post('/predict'", ensemble: "_ensemble_predict(req)" },
  },
  {
    id: "hub-ml",
    file: "backend/src/index.js",
    lang: "javascript",
    start: '"subscribe-hub-ml"',
    lines: 52,
    focus: { subscribe: '"subscribe-hub-ml"', interval: "Math.max(5000", predict: "/api/ml/predict", timer: "setInterval(runPredict" },
  },
  {
    id: "alert-insert",
    file: "backend/src/controllers/mlcontroller.js",
    lang: "javascript",
    start: "let severity = null;",
    lines: 30,
    focus: { critical: "if (risk >= 0.6) severity = 'critical'", high: "else if (risk >= 0.3) severity = 'high'", insert: "INSERT INTO alerts(" },
  },
  {
    id: "severity-ui",
    file: "frontend/src/pages/operator/HubDashboard.jsx",
    lang: "jsx",
    start: "const classifySeverity",
    lines: 20,
    focus: { fn: "const classifySeverity" },
  },
  {
    id: "notifications",
    file: "backend/src/services/notifications.js",
    lang: "javascript",
    start: "async function sendAlertEscalation",
    lines: 43,
    focus: { sms: "sendSms({ to", voice: "sendVoice({ to", email: "sendEmail({ to" },
  },
  {
    id: "push",
    file: "rockshield-mobile/src/notifications/alertsNotifications.js",
    lang: "javascript",
    start: "export async function notifyNewAlert",
    lines: 26,
    focus: { severity: "const severity", schedule: "scheduleNotificationAsync" },
  },
  {
    id: "alert-sound",
    file: "rockshield-mobile/src/screens/Operator/OperatorAlertsScreen.js",
    lang: "javascript",
    start: "const res = await apiGetAuth(`/api/operator/alerts",
    lines: 46,
    focus: { poll: "apiGetAuth(`/api/operator/alerts", sound: "await playAlertSound();" },
  },
  {
    id: "alert-forward",
    file: "backend/src/routes/operatorroutes.js",
    lang: "javascript",
    start: '"/alerts/:id/forward",',
    lines: 24,
    focus: { route: '"/alerts/:id/forward",', role: 'requireRole(["operator", "system_admin"])', update: "SET forwarded_to_miners = true" },
  },
  {
    id: "storage-schema",
    file: "backend/src/db/initDb.js",
    lang: "sql",
    start: "CREATE TABLE IF NOT EXISTS ml_predictions",
    lines: 16,
    focus: { table: "CREATE TABLE IF NOT EXISTS ml_predictions", risk: "risk_score", explain: "explainability JSONB" },
  },
  {
    id: "alerts-schema",
    file: "backend/src/db/initDb.js",
    lang: "sql",
    start: "CREATE TABLE IF NOT EXISTS alerts",
    lines: 20,
    focus: { severity: "severity VARCHAR(20)", forwarded: "forwarded_to_miners" },
  },
  {
    id: "update-role",
    file: "backend/src/routes/adminroutes.js",
    lang: "javascript",
    start: "router.post('/update-role'",
    lines: 17,
    focus: { route: "router.post('/update-role'", clerk: "clerkClient.users.updateUser", update: "DO UPDATE SET role" },
  },
  {
    id: "register-sensor",
    file: "backend/src/routes/operatorroutes.js",
    lang: "javascript",
    start: '"/sensors",',
    startMatch: 2,
    lines: 44,
    focus: { route: '"/sensors",', role: 'requireRole(["operator", "system_admin"])', insert: "INSERT INTO sensors" },
  },
];

const SECRET_PATTERNS = [/sk_(test|live)_[A-Za-z0-9]{10,}/, /pk_(test|live)_[A-Za-z0-9]{10,}/, /pk\.eyJ/, /github_pat_/, /AC[0-9a-f]{32}/, /BEGIN (RSA |)PRIVATE KEY/];

function locate(spec: SnippetSpec, text: string) {
  const lines = text.split("\n");
  let seen = 0;
  const startIdx = lines.findIndex((l) => l.includes(spec.start) && ++seen === (spec.startMatch ?? 1));
  if (startIdx === -1) throw new Error(`${spec.id}: anchor "${spec.start}" not found in ${spec.file}`);
  const slice = lines.slice(startIdx, startIdx + spec.lines);
  // Dedent so snippets taken from inside a function or template string sit flush left
  const indent = Math.min(...slice.filter((l) => l.trim()).map((l) => l.match(/^\s*/)![0].length));
  const code = slice.map((l) => l.slice(indent)).join("\n").replace(/\s+$/, "");
  const focus: Record<string, number> = {};
  for (const [name, needle] of Object.entries(spec.focus)) {
    const i = slice.findIndex((l) => l.includes(needle));
    if (i === -1) throw new Error(`${spec.id}: focus "${name}" (${needle}) not inside snippet`);
    focus[name] = i;
  }
  for (const p of SECRET_PATTERNS) if (p.test(code)) throw new Error(`${spec.id}: snippet looks like it contains a secret (${p})`);
  return { code, startLine: startIdx + 1, focus };
}

async function main() {
  const highlighter = await createHighlighter({ themes: [THEME], langs: ["python", "javascript", "jsx", "sql"] });
  mkdirSync(OUT, { recursive: true });
  const index: Record<string, { file: string; startLine: number; lines: number }> = {};
  for (const spec of SNIPPETS) {
    const { code, startLine, focus } = locate(spec, readFileSync(join(REPO, spec.file), "utf8"));
    const { tokens } = highlighter.codeToTokens(code, { lang: spec.lang, theme: THEME });
    const out = {
      id: spec.id,
      file: spec.file,
      lang: spec.lang,
      startLine,
      focus,
      lines: tokens.map((line) => line.map((t) => ({ c: t.content, color: t.color ?? "#e6edf3", italic: ((t.fontStyle ?? 0) & 1) === 1 }))),
    };
    writeFileSync(join(OUT, `${spec.id}.json`), JSON.stringify(out));
    index[spec.id] = { file: spec.file, startLine, lines: tokens.length };
    console.log(`  ${spec.id.padEnd(16)} ${spec.file}:${startLine} (${tokens.length} lines)`);
  }
  writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 1));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
