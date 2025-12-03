import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiPostAuth } from '../services/api'

const ROLES = ['system_admin', 'operator', 'miner']

export default function Admin() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = await getToken({ template: 'backend' })
        const data = await apiGetAuth('/api/admin/users', token)
        if (!mounted) return
        setUsers(data.users || [])
        setLoading(false)
      } catch (e) {
        if (!mounted) return
        setError(String(e?.message || 'Failed to load'))
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [getToken])

  async function changeRole(clerkUserId, role) {
    try {
      const token = await getToken({ template: 'backend' })
      await apiPostAuth('/api/admin/update-role', token, { clerkUserId, role })
      setUsers((prev) => prev.map((u) => (u.clerkUserId === clerkUserId ? { ...u, role } : u)))
    } catch (e) {
      alert('Failed to update role: ' + (e?.message || 'Unknown error'))
    }
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="py-10">
        <h1 className="mb-2">Admin</h1>
        <p className="text-slate-600">Manage users and roles</p>

        <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.clerkUserId} className="border-t">
                    <td className="py-2 pr-4">{u.fullName || u.clerkUserId}</td>
                    <td className="py-2 pr-4">{u.email || '—'}</td>
                    <td className="py-2 pr-4 font-mono">{u.role}</td>
                    <td className="py-2 pr-4">
                      <select
                        className="input"
                        value={u.role}
                        onChange={(e) => changeRole(u.clerkUserId, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  )
}
