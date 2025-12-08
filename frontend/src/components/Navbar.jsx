import { Link, NavLink } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, SignInButton, useUser } from '@clerk/clerk-react'
import { useTheme } from '../context/ThemeContext'
import { Sun, Moon, Map, AlertTriangle, CheckSquare, Radio, FileText, AlertCircle } from 'lucide-react'

export default function Navbar() {
  const { user } = useUser()
  const { theme, toggleTheme } = useTheme()
  const role = user?.publicMetadata?.role

  const linkClass = ({ isActive }) =>
    `transition-colors hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 ${isActive
      ? 'text-slate-900 dark:text-white font-medium'
      : 'text-slate-600 dark:text-slate-300'
    }`

  const isOperator = role === 'operator' || role === 'system_admin'

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 sticky top-0 z-40 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="font-bold text-slate-900 dark:text-white text-xl">
              RockShield
            </Link>
            <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
              {role ? role.replace('_', ' ') : 'Guest'}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm">
            {!isOperator && (
              <NavLink to="/" className={linkClass}>
                Home
              </NavLink>
            )}

            <SignedIn>
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>

              {role === 'system_admin' && (
                <NavLink to="/admin" className={linkClass}>
                  Admin
                </NavLink>
              )}

              {/* Operator Navigation Items */}
              {isOperator && (
                <>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                  <NavLink to="/operator/map" className={linkClass}>
                    <Map size={16} /> Map
                  </NavLink>
                  <NavLink to="/operator/alerts" className={linkClass}>
                    <AlertTriangle size={16} /> Alerts
                  </NavLink>
                  <NavLink to="/operator/tasks" className={linkClass}>
                    <CheckSquare size={16} /> Tasks
                  </NavLink>
                  <NavLink to="/operator/sensors" className={linkClass}>
                    <Radio size={16} /> Sensors
                  </NavLink>
                  <NavLink to="/operator/reports" className={linkClass}>
                    <FileText size={16} /> Reports
                  </NavLink>
                  <NavLink to="/operator/incidents" className={linkClass}>
                    <AlertCircle size={16} /> Incidents
                  </NavLink>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                </>
              )}

              {role === 'miner' && (
                <NavLink to="/miner" className={linkClass}>
                  Miner
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
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="flex items-center gap-3">
              <SignedOut>
                <NavLink to="/login" className={linkClass}>
                  Login
                </NavLink>
                <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-500/20">
                  Get Started
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
  )
}
