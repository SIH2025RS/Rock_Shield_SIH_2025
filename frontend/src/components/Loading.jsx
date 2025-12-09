import { useTranslation } from "react-i18next";

export default function Loading() {
  const { t } = useTranslation("common");
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.2s]" />
        <span className="h-3 w-3 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.1s]" />
        <span className="h-3 w-3 animate-bounce rounded-full bg-blue-500" />
        <span className="sr-only">{t("loading")}</span>
      </div>
    </div>
  )
}
