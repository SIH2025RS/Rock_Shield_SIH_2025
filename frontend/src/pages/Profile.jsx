import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { apiGetAuth, apiPutAuth } from '../services/api'

export default function Profile() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = await getToken({ template: 'backend' })
        const me = await apiGetAuth('/api/me', token)
        if (!mounted) return
        setProfile(me)
        setForm({ fullName: me.fullName || '', phone: me.phone || '' })
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

  function validate() {
    if (form.fullName && form.fullName.trim().length < 2) {
      return 'Full name must be at least 2 characters'
    }
    if (form.phone && !/^[- +()0-9]{6,20}$/.test(form.phone)) {
      return 'Phone contains invalid characters'
    }
    return ''
  }

  async function onSave(e) {
    e.preventDefault()
    setFormError('')
    const v = validate()
    if (v) {
      setFormError(v)
      return
    }
    try {
      setSaving(true)
      const token = await getToken({ template: 'backend' })
      await apiPutAuth('/api/me/profile', token, form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setFormError('Failed to update: ' + (e?.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">Profile</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border bg-slate-100">
                {profile?.profileImage ? (
                  <img src={profile.profileImage} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl text-slate-500">{(profile?.fullName || '—').slice(0,1)}</div>
                )}
              </div>
              <div>
                <div className="text-xl font-semibold">{profile?.fullName || '—'}</div>
                <div className="text-slate-600">{profile?.email || '—'}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border bg-slate-50 p-3">
                <div className="text-slate-500">Role</div>
                <div className="font-medium">{profile?.role || '—'}</div>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3">
                <div className="text-slate-500">Clerk ID</div>
                <div className="font-medium truncate">{user?.id || '—'}</div>
              </div>
            </div>
          </div>

          <form onSubmit={onSave} className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl">App Profile</h2>
              {saved && <span className="text-sm text-emerald-600">Saved</span>}
            </div>
            <label className="block mb-3">
              <span className="mb-1 block text-slate-700">Full name</span>
              <input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                type="text"
                className="input w-full"
                placeholder="Jane Doe"
              />
            </label>
            <label className="block mb-3">
              <span className="mb-1 block text-slate-700">Phone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                type="tel"
                className="input w-full"
                placeholder="+1 555 123 4567"
              />
            </label>
            {formError && <div className="mb-3 text-sm text-red-600">{formError}</div>}
            <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </form>
        </div>
      </section>
    </main>
  )
}
