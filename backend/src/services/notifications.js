// Notification service for sending SMS, voice, and email alerts
const { getAlertTemplate } = require("./i18nserver");

function getTwilioClient() {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) return null;
    // Lazy require
    const twilio = require("twilio");
    return twilio(sid, token);
  } catch {
    return null;
  }
}

function getMailer() {
  try {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || "false") === "true";
    if (!host || !user || !pass) return null;
    const nodemailer = require("nodemailer");
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  } catch {
    return null;
  }
}

function mapLang(lang) {
  const s = String(lang || "").toLowerCase();
  if (s.startsWith("hi")) return "hi-IN";
  if (s.startsWith("mr")) return "mr-IN";
  if (s.startsWith("bn")) return "bn-IN";
  if (s.startsWith("te")) return "te-IN";
  if (s.startsWith("kn")) return "kn-IN";
  if (s.startsWith("ta")) return "ta-IN";
  return "en-US";
}

async function sendSms({ to, body }) {
  const client = getTwilioClient();
  const from = process.env.TWILIO_FROM;
  if (!client || !from || !to)
    return { queued: false, reason: "missing_twilio_or_to" };
  try {
    const res = await client.messages.create({ from, to, body });
    return { queued: true, sid: res.sid };
  } catch (e) {
    return { queued: false, error: String(e?.message || e) };
  }
}

async function sendVoice({ to, text, lang }) {
  const client = getTwilioClient();
  const from = process.env.TWILIO_FROM;
  if (!client || !from || !to)
    return { queued: false, reason: "missing_twilio_or_to" };
  const sayLang = mapLang(lang);
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="${sayLang}">${text}</Say></Response>`;
  try {
    const res = await client.calls.create({ from, to, twiml });
    return { queued: true, sid: res.sid };
  } catch (e) {
    return { queued: false, error: String(e?.message || e) };
  }
}

async function sendEmail({ to, subject, text }) {
  const mailer = getMailer();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!mailer || !from || !to)
    return { queued: false, reason: "missing_smtp_or_to" };
  try {
    const info = await mailer.sendMail({ from, to, subject, text });
    return { queued: true, id: info.messageId };
  } catch (e) {
    return { queued: false, error: String(e?.message || e) };
  }
}

async function sendAlertEscalation({
  toList = {},
  severity = "medium",
  language = "en",
  message,
  location,
  reasons,
  confidence,
}) {
  const smsNumbers = Array.isArray(toList.sms) ? toList.sms : [];
  const emails = Array.isArray(toList.email) ? toList.email : [];
  const voiceNumbers = Array.isArray(toList.voice) ? toList.voice : [];

  // Get localized templates
  const templates = await getAlertTemplate(language, severity, {
    message: message || "Alert detected",
    location: location || "",
    severity: severity.toUpperCase(),
    confidence: confidence ? Math.round(confidence * 100) : "",
    reasons: Array.isArray(reasons) ? reasons.join(", ") : "",
  });

  const results = { sms: [], voice: [], email: [] };
  for (const to of smsNumbers) {
    // eslint-disable-next-line no-await-in-loop
    results.sms.push(await sendSms({ to, body: templates.sms }));
  }
  for (const to of voiceNumbers) {
    // eslint-disable-next-line no-await-in-loop
    results.voice.push(
      await sendVoice({ to, text: templates.voice, lang: language })
    );
  }
  for (const to of emails) {
    // eslint-disable-next-line no-await-in-loop
    results.email.push(
      await sendEmail({ to, subject: templates.subject, text: templates.email })
    );
  }
  return results;
}

module.exports = { sendAlertEscalation };
