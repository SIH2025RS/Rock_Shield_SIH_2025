import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  Volume2,
} from "lucide-react";

export default function InsightCard({
  severity = "low",
  headlineBySeverity = {},
  confidence,
  reasons = [],
  onAcknowledge,
  onEscalate,
  whyDetails,
  locationLabel,
}) {
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const [showWhy, setShowWhy] = useState(false);

  const styles = useMemo(() => {
    const map = {
      critical: {
        border: "border-red-300",
        iconWrap: "bg-red-100 text-red-700",
        cta: "bg-red-600",
        ackBorder: "border-red-300",
        ackText: "text-red-700",
        ackHover: "hover:bg-red-50",
      },
      high: {
        border: "border-orange-300",
        iconWrap: "bg-orange-100 text-orange-700",
        cta: "bg-orange-600",
        ackBorder: "border-orange-300",
        ackText: "text-orange-700",
        ackHover: "hover:bg-orange-50",
      },
      medium: {
        border: "border-amber-300",
        iconWrap: "bg-amber-100 text-amber-700",
        cta: "bg-amber-600",
        ackBorder: "border-amber-300",
        ackText: "text-amber-700",
        ackHover: "hover:bg-amber-50",
      },
      low: {
        border: "border-emerald-300",
        iconWrap: "bg-emerald-100 text-emerald-700",
        cta: "bg-emerald-600",
        ackBorder: "border-emerald-300",
        ackText: "text-emerald-700",
        ackHover: "hover:bg-emerald-50",
      },
    };
    return map[severity] || map.low;
  }, [severity]);

  const Icon = useMemo(() => {
    if (severity === "critical" || severity === "high") return AlertTriangle;
    if (severity === "medium") return Lightbulb;
    return Info;
  }, [severity]);

  const headline =
    headlineBySeverity?.[severity] ||
    t(`dashboard:insight.headline.${severity}`);

  function speak() {
    try {
      const text = `${locationLabel ? locationLabel + ". " : ""}${headline} ${
        confidence
          ? t("dashboard:insight.confidence", {
              val: Math.round(confidence * 100),
            })
          : ""
      }`;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = mapLang(i18n.language);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch {}
  }

  return (
    <div
      className={`rounded-xl border-2 p-5 bg-white dark:bg-slate-900 shadow-sm ${styles.border}`}
      role="region"
      aria-label="insight"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${styles.iconWrap}`} aria-hidden>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <h1 className="text-lg sm:text-xl font-semibold leading-snug text-slate-900 dark:text-white">
              {headline}
              {confidence != null && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {t("dashboard:insight.confidence", {
                    val: Math.round(confidence * 100),
                  })}
                </span>
              )}
            </h1>
            <button
              className={`ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ${styles.cta} text-white text-sm hover:opacity-90`}
              onClick={onEscalate}
            >
              {t("common:actions.escalate")}
            </button>
          </div>
          {!!reasons?.length && (
            <ul className="mt-2 text-slate-700 dark:text-slate-300 text-sm list-disc pl-6">
              {reasons.slice(0, 3).map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-center gap-2">
            <button
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border ${styles.ackBorder} ${styles.ackText} text-sm ${styles.ackHover}`}
              onClick={onAcknowledge}
            >
              <CheckCircle2 className="w-4 h-4" />{" "}
              {t("common:actions.acknowledge")}
            </button>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
              onClick={() => setShowWhy((v) => !v)}
              aria-expanded={showWhy}
            >
              {t("dashboard:insight.reasons_title")}
            </button>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
              onClick={speak}
              aria-label="listen"
            >
              <Volume2 className="w-4 h-4" /> {t("common:actions.listen")}
            </button>
          </div>
          {showWhy && whyDetails && (
            <div className="mt-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700 dark:text-slate-300">
              {whyDetails}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function mapLang(l) {
  const s = String(l || "").toLowerCase();
  if (s.startsWith("hi")) return "hi-IN";
  return "en-US";
}
