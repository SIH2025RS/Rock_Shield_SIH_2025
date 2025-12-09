import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center">
      <div className="mx-auto max-w-6xl px-4 w-full">
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-red-600 text-white shadow-lg">
            <AlertTriangle size={28} />
          </div>
          <h1 className="mt-4 text-6xl font-extrabold tracking-tight bg-gradient-to-r from-amber-600 via-red-600 to-purple-600 bg-clip-text text-transparent">404</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-xl">The page you are looking for could not be found or may have been moved.</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all">
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
