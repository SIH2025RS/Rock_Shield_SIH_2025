import { Link, NavLink } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
  useUser,
  useAuth,
} from "@clerk/clerk-react";
import { useTheme } from "../context/ThemeContext";
import {
  Sun,
  Moon,
  Map,
  AlertTriangle,
  CheckSquare,
  Radio,
  FileText,
  AlertCircle,
  Image,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiPutAuth } from "../services/api";

export default function Navbar() {
  const { user } = useUser();
  const { getToken, isSignedIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation("common");
  const role = user?.publicMetadata?.role;

  const linkClass = ({ isActive }) =>
    `transition-colors hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 ${isActive
      ? "text-slate-900 dark:text-white font-medium"
      : "text-slate-600 dark:text-slate-300"
    }`;

  const isOperator = role === "operator" || role === "system_admin";

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 sticky top-0 z-40 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="font-bold text-slate-900 dark:text-white text-xl"
            >
              {t("app.name")}
            </Link>
            <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
              {role ? role.replace("_", " ") : t("guest")}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm">
            {!isOperator && (
              <NavLink to="/" className={linkClass}>
                {t("nav.home")}
              </NavLink>
            )}

            <SignedIn>
              <NavLink to="/dashboard" className={linkClass}>
                {t("nav.dashboard")}
              </NavLink>

              {role === "system_admin" && (
                <NavLink to="/admin" className={linkClass}>
                  {t("nav.admin")}
                </NavLink>
              )}

              {/* Operator Navigation Items */}
              {isOperator && (
                <>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                  <NavLink to="/operator/map" className={linkClass}>
                    <Map size={16} /> {t("nav.map")}
                  </NavLink>
                  <NavLink to="/operator/alerts" className={linkClass}>
                    <AlertTriangle size={16} /> {t("nav.alerts")}
                  </NavLink>
                  <NavLink to="/operator/tasks" className={linkClass}>
                    <CheckSquare size={16} /> {t("nav.tasks")}
                  </NavLink>
                  <NavLink to="/operator/sensors" className={linkClass}>
                    <Radio size={16} /> {t("nav.sensors")}
                  </NavLink>
                  <NavLink to="/operator/drone-imagery" className={linkClass}>
                    <Image size={16} /> {t("nav.droneImagery")}
                  </NavLink>
                  <NavLink to="/operator/reports" className={linkClass}>
                    <FileText size={16} /> {t("nav.reports")}
                  </NavLink>
                  <NavLink to="/operator/incidents" className={linkClass}>
                    <AlertCircle size={16} /> {t("nav.incidents")}
                  </NavLink>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                </>
              )}

              {role === "miner" && (
                <NavLink to="/miner" className={linkClass}>
                  {t("nav.miner")}
                </NavLink>
              )}
            </SignedIn>
          </nav>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <LangSelector
              i18n={i18n}
              t={t}
              getToken={getToken}
              isSignedIn={isSignedIn}
            />

            <div className="flex items-center gap-3">
              <SignedOut>
                <NavLink to="/login" className={linkClass}>
                  {t("nav.login")}
                </NavLink>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-500/20"
                >
                  {t("nav.getStarted")}
                </Link>
              </SignedOut>

              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Nav Placeholder (Optional: Add a real mobile menu if needed later) */}
    </header>
  );
}

function LangSelector({ i18n, t, getToken, isSignedIn }) {
  async function onChange(e) {
    const lng = e.target.value;
    try {
      if (isSignedIn) {
        const token = await getToken({ template: "backend" });
        await apiPutAuth("/api/i18n/me", token, { language: lng });
      }
    } catch { }
    i18n.changeLanguage(lng);
  }
  return (
    <select
      aria-label={t("i18n.language")}
      onChange={onChange}
      defaultValue={i18n.language?.split("-")[0] || "en"}
      className="px-2 py-1 rounded border border-slate-300 text-sm bg-white dark:bg-slate-800 dark:text-slate-200"
    >
      <option value="en">{t("i18n.english")}</option>
      <option value="hi">{t("i18n.hindi")}</option>
    </select>
  );
}
