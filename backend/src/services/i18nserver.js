const fs = require("fs");
const path = require("path");

const TRANSLATIONS_DIR = path.resolve(__dirname, "../../translations");

function safeJsonParse(txt, fallback = null) {
  try {
    return JSON.parse(txt);
  } catch {
    return fallback;
  }
}

function resolveFile(lang, ns) {
  const p = path.join(TRANSLATIONS_DIR, lang, `${ns}.json`);
  return p;
}

function loadNamespace(lang, ns, fallbackLang = "en") {
  try {
    const fp = resolveFile(lang, ns);
    if (fs.existsSync(fp)) {
      const raw = fs.readFileSync(fp, "utf-8");
      const j = safeJsonParse(raw, {});
      return j || {};
    }
    if (fallbackLang && fallbackLang !== lang) {
      const fb = resolveFile(fallbackLang, ns);
      if (fs.existsSync(fb)) {
        const raw = fs.readFileSync(fb, "utf-8");
        const j = safeJsonParse(raw, {});
        return j || {};
      }
    }
  } catch {}
  return {};
}

function alertTemplate(lang, severity, channel = "sms") {
  const alertsNs = loadNamespace(lang, "alerts");
  const ch = alertsNs?.templates?.[channel] || {};
  const msg = ch?.[String(severity || "").toLowerCase()] || null;
  if (msg) return msg;
  // fallback to en
  const fb = loadNamespace("en", "alerts");
  const fch = fb?.templates?.[channel] || {};
  return fch?.[String(severity || "").toLowerCase()] || "";
}

module.exports = { loadNamespace, alertTemplate };
