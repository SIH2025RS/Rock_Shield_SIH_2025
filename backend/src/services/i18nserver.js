const fs = require("fs").promises;
const path = require("path");

// Cache for loaded translation files
const translationCache = new Map();
const CACHE_TTL = 60000; // 1 minute

const SUPPORTED_LANGUAGES = ["en", "hi", "mr", "bn", "te", "kn", "ta"];
const TRANSLATIONS_DIR = path.join(__dirname, "../../frontend/public/i18n/strings");

/**
 * Load a translation namespace for a specific language
 * @param {string} lang - Language code (e.g., 'en', 'hi')
 * @param {string} namespace - Namespace (e.g., 'common', 'alerts')
 * @returns {Promise<object>} Translation object
 */
async function loadTranslations(lang, namespace) {
    const cacheKey = `${lang}:${namespace}`;

    // Check cache
    const cached = translationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    // Load from file
    try {
        const filePath = path.join(TRANSLATIONS_DIR, lang, `${namespace}.json`);
        const content = await fs.readFile(filePath, "utf8");
        const data = JSON.parse(content);

        // Update cache
        translationCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
        });

        return data;
    } catch (error) {
        console.error(`Failed to load translations for ${lang}/${namespace}:`, error.message);

        // Fallback to English if available
        if (lang !== "en") {
            try {
                const fallbackPath = path.join(TRANSLATIONS_DIR, "en", `${namespace}.json`);
                const content = await fs.readFile(fallbackPath, "utf8");
                return JSON.parse(content);
            } catch (fallbackError) {
                console.error("Failed to load English fallback:", fallbackError.message);
            }
        }

        return {};
    }
}

/**
 * Get a translated string with variable substitution
 * @param {string} lang - Language code
 * @param {string} key - Translation key (e.g., 'alerts.critical_alert')
 * @param {object} vars - Variables for substitution
 * @returns {Promise<string>} Translated string
 */
async function translate(lang, key, vars = {}) {
    // Parse key (namespace:path or just path)
    const parts = key.split(":");
    let namespace = "common";
    let path = key;

    if (parts.length === 2) {
        namespace = parts[0];
        path = parts[1];
    }

    // Load translations
    const translations = await loadTranslations(lang, namespace);

    // Navigate to the key
    const keys = path.split(".");
    let value = translations;

    for (const k of keys) {
        if (value && typeof value === "object") {
            value = value[k];
        } else {
            value = undefined;
            break;
        }
    }

    // If not found, return key
    if (value === undefined || value === null) {
        return key;
    }

    // Convert to string
    let result = String(value);

    // Substitute variables (simple {{var}} syntax)
    for (const [varKey, varValue] of Object.entries(vars)) {
        const regex = new RegExp(`{{\\s*${varKey}\\s*}}`, "g");
        result = result.replace(regex, String(varValue));
    }

    return result;
}

/**
 * Get alert template with localization
 * @param {string} lang - Language code
 * @param {string} severity - Alert severity (critical, high, medium, low)
 * @param {object} vars - Variables for the template
 * @returns {Promise<object>} Alert messages for SMS, voice, and email
 */
async function getAlertTemplate(lang, severity, vars = {}) {
    const validLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : "en";

    const smsKey = `alerts:templates.${severity}.sms`;
    const voiceKey = `alerts:templates.${severity}.voice`;
    const emailKey = `alerts:templates.${severity}.email`;
    const subjectKey = `alerts:templates.${severity}.subject`;

    const [sms, voice, email, subject] = await Promise.all([
        translate(validLang, smsKey, vars),
        translate(validLang, voiceKey, vars),
        translate(validLang, emailKey, vars),
        translate(validLang, subjectKey, vars),
    ]);

    return {
        sms,
        voice,
        email,
        subject,
    };
}

/**
 * Clear translation cache (useful for development/testing)
 */
function clearCache() {
    translationCache.clear();
}

module.exports = {
    loadTranslations,
    translate,
    getAlertTemplate,
    clearCache,
};
