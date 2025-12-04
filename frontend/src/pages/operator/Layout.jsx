import { NavLink, Outlet } from 'react-router-dom'

export default function OperatorLayout() {
  const linkClass = ({ isActive }) =>
    `btn-tab ${isActive ? 'btn-tab-active' : ''}`

  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="py-10">
        <div className="mb-4">
          <h1>Operator</h1>
          <p className="subtext mt-1">Manage live operations: maps, alerts, tasks, sensors, and reports.</p>
        </div>
        <nav className="mb-6 flex flex-wrap gap-2 text-sm">
          <NavLink to="/operator/map" className={linkClass}>Map</NavLink>
          <NavLink to="/operator/alerts" className={linkClass}>Alerts</NavLink>
          <NavLink to="/operator/tasks" className={linkClass}>Tasks</NavLink>
          <NavLink to="/operator/sensors" className={linkClass}>Sensors</NavLink>
          <NavLink to="/operator/reports" className={linkClass}>Reports</NavLink>
          <NavLink to="/operator/incidents" className={linkClass}>Incident</NavLink>
        </nav>
        <div className="card animate-fadeIn">
          <Outlet />
        </div>
      </section>
    </main>
  )
}
