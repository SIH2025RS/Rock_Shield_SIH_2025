import { useEffect } from 'react'
import { SignUp, useUser } from '@clerk/clerk-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Shield } from 'lucide-react'

export default function Register() {
  const { isSignedIn } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isSignedIn) navigate('/dashboard', { replace: true, state: { from: location } })
  }, [isSignedIn, navigate, location])

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center">
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
              <Shield size={24} />
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">Create your account</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Join RockShield to predict and prevent rockfall risks</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <SignUp routing="path" path="/register" signInUrl="/login" />
          </div>
        </div>
      </section>
    </main>
  )
}
