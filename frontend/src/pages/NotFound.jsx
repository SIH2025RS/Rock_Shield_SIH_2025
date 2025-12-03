import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-4">
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1>404</h1>
        <p className="mt-2 text-slate-600">The page you are looking for could not be found.</p>
        <Link to="/" className="mt-6 btn-primary inline-block">Go home</Link>
      </div>
    </main>
  )
}
