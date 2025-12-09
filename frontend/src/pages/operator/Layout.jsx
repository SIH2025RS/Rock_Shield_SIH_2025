import { Outlet } from 'react-router-dom'
import { Shield } from 'lucide-react'

export default function OperatorLayout() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-xl shadow-blue-500/20">
              <Shield size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Operator Hub</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Manage live operations: maps, alerts, tasks, sensors, and reports.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="animate-fadeIn min-h-[500px]">
          <Outlet />
        </div>
      </section>
    </main>
  )
}
