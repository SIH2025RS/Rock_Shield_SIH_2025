import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

const supportedLngs = ["en", "hi", "mr", "bn", "te", "kn", "ta"];

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs,
    load: "languageOnly",
    ns: ["common", "dashboard", "alerts", "home", "operator", "admin", "auth", "miner", "dem"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    backend: { loadPath: "/i18n/strings/{{lng}}/{{ns}}.json" },
    detection: {
      order: ["querystring", "cookie", "localStorage", "navigator"],
    },
  });



export default i18n;
