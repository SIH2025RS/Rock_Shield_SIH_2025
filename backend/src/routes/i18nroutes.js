const express = require("express");
const pool = require("../db/pool");
const { verifyClerkToken } = require("../middleware/auth");
const path = require("path");
const fs = require("fs").promises;

const router = express.Router();

// Supported languages
const SUPPORTED_LANGUAGES = ["en", "hi", "mr", "bn", "te", "kn", "ta"];
const DEFAULT_LANGUAGE = "en";

// GET /api/i18n/supported - List supported languages
router.get("/supported", (req, res) => {
    res.json({
        languages: SUPPORTED_LANGUAGES,
        default: DEFAULT_LANGUAGE,
    });
});

// GET /api/i18n/me - Get user's language preference
router.get("/me", verifyClerkToken, async (req, res) => {
    try {
        const userId = req.auth?.sub || req.auth?.userId;

        // Try to get from user profile
        if (userId) {
            const result = await pool.query(
                "SELECT lang_code, lang_pref_source FROM users WHERE clerk_id = $1",
                [userId]
            );
            if (result.rows.length > 0 && result.rows[0].lang_code) {
                return res.json({
                    language: result.rows[0].lang_code,
                    source: result.rows[0].lang_pref_source || "profile",
                });
            }
        }

        // Fallback to Accept-Language header
        const acceptLang = req.headers["accept-language"];
        if (acceptLang) {
            const detected = detectLanguageFromHeader(acceptLang);
            if (detected) {
                return res.json({
                    language: detected,
                    source: "accept-language",
                });
            }
        }

        // Final fallback to default
        res.json({
            language: DEFAULT_LANGUAGE,
            source: "default",
        });
    } catch (e) {
        console.error("Error getting user language:", e);
        res.json({
            language: DEFAULT_LANGUAGE,
            source: "default",
        });
    }
});

// PUT /api/i18n/me - Update user's language preference
router.put("/me", verifyClerkToken, async (req, res) => {
    try {
        const userId = req.auth?.sub || req.auth?.userId;
        const { language } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "unauthorized" });
        }

        if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
            return res.status(400).json({ error: "invalid_language" });
        }

        // Ensure lang_code and lang_pref_source columns exist
        await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='lang_code'
        ) THEN
          ALTER TABLE users ADD COLUMN lang_code VARCHAR(8);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='lang_pref_source'
        ) THEN
          ALTER TABLE users ADD COLUMN lang_pref_source VARCHAR(20);
        END IF;
      END $$;
    `);

        // Update user's language preference
        await pool.query(
            `UPDATE users 
       SET lang_code = $1, lang_pref_source = 'user_selected', updated_at = now() 
       WHERE clerk_id = $2`,
            [language, userId]
        );

        res.json({
            success: true,
            language,
        });
    } catch (e) {
        console.error("Error updating user language:", e);
        res.status(500).json({ error: "failed_to_update" });
    }
});

// Helper function to detect language from Accept-Language header
function detectLanguageFromHeader(header) {
    if (!header) return null;

    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,hi;q=0.8")
    const languages = header
        .split(",")
        .map((lang) => {
            const parts = lang.trim().split(";");
            const code = parts[0].split("-")[0].toLowerCase();
            const quality = parts[1] ? parseFloat(parts[1].split("=")[1]) : 1.0;
            return { code, quality };
        })
        .sort((a, b) => b.quality - a.quality);

    // Find first supported language
    for (const lang of languages) {
        if (SUPPORTED_LANGUAGES.includes(lang.code)) {
            return lang.code;
        }
    }

    return null;
}

module.exports = router;
