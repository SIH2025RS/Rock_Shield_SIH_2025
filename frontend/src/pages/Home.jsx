import { useEffect, useState } from 'react'
import { API_BASE_URL, health } from '../services/api'
import { useAuth } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { Shield, Activity, Cloud, MapPin } from 'lucide-react'
import TeamCredits from '../components/TeamCredits'

export default function Home() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const { isSignedIn } = useAuth()

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
      ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
      : status === 'error'
      ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
      : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'

  const label = status === 'ok' ? 'Connected' : status === 'error' ? 'Unavailable' : 'Checking…'
  const devs = [
    'Devendra Kumar Dewangan',
    'Somil Agrawal',
    'Abhishek Dixit',
    'Soumyadeep Biswas',
    'Alefiya Hirani',
    'Akshat Mishra',
  ]

  return (
    <main className="mx-auto max-w-6xl px-4 transition-colors duration-300">
      <section className="py-16 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${badge}`}>
              <span className="h-2 w-2 rounded-full bg-current opacity-70"></span>
              <span>Backend: {label}</span>
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl text-slate-900 dark:text-white">RockShield</h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">AI-powered rockfall prediction and operational safety for modern mines.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {isSignedIn ? (
                <Link to="/dashboard" className="btn-primary dark:bg-blue-600 dark:hover:bg-blue-500">Go to dashboard</Link>
              ) : (
                <>
                  <Link to="/register" className="btn-primary dark:bg-blue-600 dark:hover:bg-blue-500">Get started</Link>
                  <Link to="/login" className="btn-secondary dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700">Sign in</Link>
                </>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"><Shield size={20} /></span>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Uptime</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">{label}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"><Activity size={20} /></span>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">API</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">{API_BASE_URL.replace(/^https?:\/\//, '')}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"><Cloud size={20} /></span>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Telemetry</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">Real‑time</div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"><MapPin size={20} /></span>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Terrain</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">DEM + GIS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isSignedIn && (
        <section className="py-8">
          <h2 className="mb-4 text-slate-900 dark:text-white">Quick access</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/operator/map" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow transition">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"><MapPin size={20} /></span>
                <div>
                  <div className="text-slate-900 dark:text-white font-medium">Map</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">3D terrain, sensors, alerts</div>
                </div>
              </div>
            </Link>
            <Link to="/operator/alerts" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow transition">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"><Activity size={20} /></span>
                <div>
                  <div className="text-slate-900 dark:text-white font-medium">Alerts</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Recent risks and actions</div>
                </div>
              </div>
            </Link>
            <Link to="/operator/incidents" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow transition">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-rose-600/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"><Shield size={20} /></span>
                <div>
                  <div className="text-slate-900 dark:text-white font-medium">Incidents</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Report, track, acknowledge</div>
                </div>
              </div>
            </Link>
            <Link to="/operator/reports" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow transition">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"><Cloud size={20} /></span>
                <div>
                  <div className="text-slate-900 dark:text-white font-medium">Reports</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Share notes and updates</div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      <section className="py-12">
        <h2 className="mb-8 text-center text-slate-900 dark:text-white">Why RockShield</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="text-slate-900 dark:text-white">Predictive safety</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Model risk using weather, terrain and sensor signals to prevent incidents.</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="text-slate-900 dark:text-white">Unified dashboard</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Monitor operations, alerts and team status in one place.</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="text-slate-900 dark:text-white">Open APIs</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Integrate with your tools via secure REST APIs and webhooks.</p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <h2 className="mb-8 text-center text-slate-900 dark:text-white">What our users say</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <p className="text-slate-700 dark:text-slate-300">“RockShield gave us the confidence to scale operations near steep benches.”</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">AK</span>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Arjun K.</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Mine Manager</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <p className="text-slate-700 dark:text-slate-300">“The alerts are timely and easy to act on. Our incident rate dropped noticeably.”</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">SP</span>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Sara P.</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Safety Officer</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <p className="text-slate-700 dark:text-slate-300">“Simple to deploy and integrates with our existing telemetry stack.”</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 text-white">LM</span>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Luis M.</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Ops Lead</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TeamCredits />

      <section className="mt-8 border-t border-slate-200 dark:border-slate-800 py-8 text-sm text-slate-600 dark:text-slate-400">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div>© {new Date().getFullYear()} RockShield</div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:underline hover:text-slate-900 dark:hover:text-white">Privacy</a>
            <a href="#" className="hover:underline hover:text-slate-900 dark:hover:text-white">Terms</a>
            <a href="#" className="hover:underline hover:text-slate-900 dark:hover:text-white">Contact</a>
          </div>
        </div>
      </section>
    </main>
  )
}
