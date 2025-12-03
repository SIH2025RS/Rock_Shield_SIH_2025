import { useEffect } from 'react'
import { SignIn, useUser } from '@clerk/clerk-react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Login() {
  const { isSignedIn } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isSignedIn) navigate('/dashboard', { replace: true, state: { from: location } })
  }, [isSignedIn, navigate, location])

  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="py-10">
        <h1 className="mb-6">Login</h1>
        <div className="max-w-md">
          <SignIn routing="path" path="/login" />
        </div>
      </section>
    </main>
  )
}
