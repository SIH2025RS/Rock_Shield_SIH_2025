import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiPostAuth, health } from '../services/api'
import { useNavigate, Link } from 'react-router-dom'
import { Activity, Shield, User, RefreshCcw, ArrowRight } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function Dashboard() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [backend, setBackend] = useState('checking')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const sessionToken = await getToken()
        if (sessionToken) {
          await apiPostAuth('/api/users/sync', sessionToken, { role: 'miner' })
        }
        const jwt = await getToken({ template: 'backend' })
        const me = await apiGetAuth('/api/me', jwt)
        if (!mounted) return
        setProfile(me)
        setLoading(false)
      } catch (e) {
        if (!mounted) return
        setError(String(e?.message || 'Failed to load profile'))
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [getToken])

  useEffect(() => {
    setBackend('checking')
    health().then(() => setBackend('ok')).catch(() => setBackend('error'))
  }, [])

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="py-8 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="mb-1 text-4xl">Dashboard</h1>
            <p className="text-slate-600">Welcome back{profile?.fullName ? `, ${profile.fullName}` : ''}.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${backend === 'ok' ? 'bg-green-100 text-green-700 border-green-200' : backend === 'error' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              <Shield size={16} />
              {backend === 'ok' ? 'Backend: Connected' : backend === 'error' ? 'Backend: Unavailable' : 'Backend: Checking…'}
            </span>
            <button className="btn-secondary inline-flex items-center gap-2" onClick={() => {
              setRefreshing(true)
              health().then(() => setBackend('ok')).catch(() => setBackend('error')).finally(() => setRefreshing(false))
            }} disabled={refreshing}>
              <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Role</div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-semibold"><Activity size={18} className="text-blue-600" /> {profile?.role || '—'}</div>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Email</div>
            <div className="mt-1 truncate text-2xl font-semibold">{profile?.email || '—'}</div>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Name</div>
            <div className="mt-1 text-2xl font-semibold">{profile?.fullName || '—'}</div>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Actions</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link to="/profile" className="btn-secondary inline-flex items-center gap-2"><User size={16} /> Profile</Link>
              {profile?.role === 'system_admin' && (
                <Link to="/admin" className="btn-primary inline-flex items-center gap-2">Admin <ArrowRight size={16} /></Link>
              )}
              {profile?.role === 'operator' && (
                <Link to="/operator" className="btn-primary inline-flex items-center gap-2">Operator <ArrowRight size={16} /></Link>
              )}
              {profile?.role === 'miner' && (
                <Link to="/miner" className="btn-primary inline-flex items-center gap-2">Miner <ArrowRight size={16} /></Link>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4">Recent activity</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockActivityData()} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Area type="monotone" dataKey="events" stroke="#3b82f6" fillOpacity={1} fill="url(#colorA)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4">Your profile</h2>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-full border bg-slate-100">
                {profile?.profileImage ? (
                  <img src={profile.profileImage} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-500">{(profile?.fullName || '—').slice(0,1)}</div>
                )}
              </div>
              <div>
                <div className="text-lg font-semibold">{profile?.fullName || '—'}</div>
                <div className="text-slate-600">{profile?.email || '—'}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border bg-slate-50 p-3">
                <div className="text-slate-500">Role</div>
                <div className="font-medium">{profile?.role || '—'}</div>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3">
                <div className="text-slate-500">ID</div>
                <div className="font-medium truncate">{profile?.clerkUserId || '—'}</div>
              </div>
            </div>
            <div className="mt-4">
              <Link to="/profile" className="btn-primary">Edit profile</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function mockActivityData() {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  return days.map((d,i) => ({ day: d, events: Math.floor(8 + Math.sin(i)*4 + (i%3)*2) }))
}
