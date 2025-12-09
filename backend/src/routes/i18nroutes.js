const express = require("express");
const pool = require("../db/pool");
const { verifyClerkToken } = require("../middleware/auth");

const router = express.Router();

// Supported languages for the app
const SUPPORTED = ["en", "hi", "mr", "bn", "te", "kn", "ta"];
const DEFAULT_LANG = "en";

function pickBestLanguage(acceptLanguageHeader) {
  try {
    if (!acceptLanguageHeader || typeof acceptLanguageHeader !== "string") {
      return DEFAULT_LANG;
    }
    // Parse header like: "hi-IN,hi;q=0.9,en;q=0.8"
    const parts = acceptLanguageHeader
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const ranked = parts
      .map((p) => {
        const [tag, qstr] = p.split(";");
        const q =
          qstr && qstr.startsWith("q=") ? parseFloat(qstr.slice(2)) : 1.0;
        const base = tag.toLowerCase();
        const lang = base.split("-")[0];
        return { tag: base, lang, q: Number.isFinite(q) ? q : 0 };
      })
      .sort((a, b) => b.q - a.q);
    for (const r of ranked) {
      if (SUPPORTED.includes(r.lang)) return r.lang;
    }
    return DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

async function ensureUserLangColumns() {
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS lang_code VARCHAR(8),
      ADD COLUMN IF NOT EXISTS lang_pref_source VARCHAR(16)
    `);
  } catch (e) {
    // ignore
  }
}

router.get("/supported", (req, res) => {
  res.json({ supported: SUPPORTED, default: DEFAULT_LANG });
});

// Resolve language for current user using fallback chain: profile -> Accept-Language -> default
router.get("/me", async (req, res) => {
  const userId = req.auth?.sub || req.auth?.userId || null;
  let lang = null;
  let source = "default";
  try {
    if (userId) {
      await ensureUserLangColumns();
      const { rows } = await pool.query(
        "SELECT lang_code, lang_pref_source FROM users WHERE clerk_user_id = $1 LIMIT 1",
        [userId]
      );
      const row = rows[0] || null;
      if (row?.lang_code) {
        lang = row.lang_code;
        source = row.lang_pref_source || "profile";
      }
    }
  } catch {}

  if (!lang) {
    const header = req.headers["accept-language"];
    const best = pickBestLanguage(header);
    if (best) {
      lang = best;
      source = header ? "header" : "default";
    }
  }

  if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;

  res.json({
    language: lang,
    source,
    supported: SUPPORTED,
    default: DEFAULT_LANG,
  });
});

// Update user's preferred language
router.put("/me", verifyClerkToken, async (req, res) => {
  try {
    const userId = req.auth?.sub || req.auth?.userId;
    const { language } = req.body || {};
    const lang = String(language || "")
      .trim()
      .toLowerCase();
    if (!SUPPORTED.includes(lang)) {
      return res
        .status(400)
        .json({ error: "unsupported_language", supported: SUPPORTED });
    }
    await ensureUserLangColumns();
    await pool.query(
      `UPDATE users SET lang_code = $1, lang_pref_source = 'profile' WHERE clerk_user_id = $2`,
      [lang, userId]
    );
    res.json({ success: true, language: lang });
  } catch (e) {
    res.status(500).json({ error: "failed_to_update_language" });
  }
});

module.exports = router;
