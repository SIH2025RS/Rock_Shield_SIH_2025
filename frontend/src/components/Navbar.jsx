import { Link, NavLink } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, SignInButton, useUser } from '@clerk/clerk-react'
import { useTheme } from '../context/ThemeContext'
import { Sun, Moon } from 'lucide-react'

export default function Navbar() {
  const { user } = useUser()
  const { theme, toggleTheme } = useTheme()
  const role = user?.publicMetadata?.role

  const linkClass = ({ isActive }) => 
    `transition-colors hover:text-blue-600 dark:hover:text-blue-400 ${
      isActive 
        ? 'text-slate-900 dark:text-white font-medium' 
        : 'text-slate-600 dark:text-slate-300'
    }`

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 sticky top-0 z-40 transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="font-bold text-slate-900 dark:text-white text-xl">
              RockShield
            </Link>
            <span className="text-xs text-slate-500 dark:text-slate-400">Clerk + Roles</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <NavLink to="/" className={linkClass}>
              Home
            </NavLink>
            <SignedIn>
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>
              {role === 'system_admin' && (
                <NavLink to="/admin" className={linkClass}>
                  Admin
                </NavLink>
              )}
              {(role === 'operator' || role === 'system_admin') && (
                <NavLink to="/operator" className={linkClass}>
                  Operator
                </NavLink>
              )}
              {role === 'miner' && (
                <NavLink to="/miner" className={linkClass}>
                  Miner
                </NavLink>
              )}
              <NavLink to="/profile" className={linkClass}>
                Profile
              </NavLink>
            </SignedIn>
            <SignedOut>
              <NavLink to="/login" className={linkClass}>
                Login
              </NavLink>
              <NavLink to="/register" className={linkClass}>
                Register
              </NavLink>
            </SignedOut>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="btn-secondary dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700">Sign in</button>
              </SignInButton>
            </SignedOut>
          </nav>
        </div>
      </div>
    </header>
  )
}
