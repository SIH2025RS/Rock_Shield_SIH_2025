import { Link, NavLink } from 'react-router-dom'

export default function Navbar() {
  return (
    <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="font-bold text-slate-900">
              RockShield
            </Link>
            <span className="text-xs text-slate-500">Fullstack Skeleton</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-slate-600">
            <NavLink to="/" className={({ isActive }) => isActive ? 'text-slate-900 font-medium' : undefined}>
              Home
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  )
}
