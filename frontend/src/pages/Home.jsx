import { useEffect, useState } from 'react'
import { API_BASE_URL, health } from '../services/api'

export default function Home() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    health()
      .then(() => setStatus('ok'))
      .catch((e) => {
        setStatus('error')
        setError(String(e?.message || 'Unknown error'))
      })
  }, [])

  const badge =
    status === 'ok'
      ? 'bg-green-100 text-green-700 border-green-200'
      : status === 'error'
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-slate-100 text-slate-700 border-slate-200'

  const label = status === 'ok' ? 'Connected' : status === 'error' ? 'Unavailable' : 'Checking…'

  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="py-10">
        <h1 className="mb-2">RockShield</h1>
        <p className="text-slate-600">Fullstack skeleton with React + Vite + Tailwind and Express + Postgres.</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4">Backend</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${badge}`}>
                <span className="h-2 w-2 rounded-full bg-current opacity-70"></span>
                <span>{label}</span>
              </div>
              <div className="mt-2 text-xs text-slate-500">{API_BASE_URL}</div>
            </div>
            <button
              className="btn-secondary"
              onClick={() => {
                setStatus('loading')
                setError('')
                health()
                  .then(() => setStatus('ok'))
                  .catch((e) => {
                    setStatus('error')
                    setError(String(e?.message || 'Unknown error'))
                  })
              }}
            >
              Check
            </button>
          </div>
          {status === 'error' && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4">Get started</h2>
          <ul className="space-y-2 text-slate-700">
            <li>• Edit <code>frontend/src/pages/Home.jsx</code></li>
            <li>• Add new routes in <code>frontend/src/main.jsx</code></li>
            <li>• Backend runs on <code>{API_BASE_URL}</code></li>
          </ul>
        </div>
      </section>
    </main>
  )
}
