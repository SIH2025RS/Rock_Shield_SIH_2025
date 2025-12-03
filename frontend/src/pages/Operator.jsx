import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiPostAuth } from '../services/api'

export default function Operator() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sensors, setSensors] = useState([])
  const [report, setReport] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = await getToken({ template: 'backend' })
        const data = await apiGetAuth('/api/operator/dashboard', token)
        if (!mounted) return
        setSensors(data.sensors || [])
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

  async function submitReport(e) {
    e.preventDefault()
    try {
      const token = await getToken({ template: 'backend' })
      await apiPostAuth('/api/operator/submit-report', token, { payload: { message: report } })
      setReport('')
      alert('Report submitted')
    } catch (e) {
      alert('Failed to submit: ' + (e?.message || 'Unknown error'))
    }
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="py-10">
        <h1 className="mb-2">Operator</h1>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4">Last 24h sensors</h2>
          <ul className="space-y-1 text-sm">
            {sensors.map((s) => (
              <li key={s.sensor_id} className="flex justify-between">
                <span>{s.sensor_id}</span>
                <span className="text-slate-600">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={submitReport} className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4">Submit report</h2>
          <textarea value={report} onChange={(e) => setReport(e.target.value)} className="input" rows={4} placeholder="Enter report details" />
          <button className="btn-primary mt-3" type="submit">Submit</button>
        </form>
      </section>
    </main>
  )
}
