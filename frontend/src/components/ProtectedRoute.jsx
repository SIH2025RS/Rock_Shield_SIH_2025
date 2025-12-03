import { useUser } from '@clerk/clerk-react'
import { Navigate, useLocation } from 'react-router-dom'
import { useUserProfile } from '../context/UserContext'
import Loading from './Loading'

export default function ProtectedRoute({ children, roles }) {
  const { isLoaded, isSignedIn } = useUser()
  const location = useLocation()
  const { userProfile, loading: profileLoading, error } = useUserProfile()

  if (!isLoaded || profileLoading) return <Loading />
  if (!isSignedIn) return <Navigate to="/login" state={{ from: location }} replace />

  if (error) {
    console.error('[ProtectedRoute] Error loading user profile:', error)
    return <div className="p-6 text-red-600">Error loading user profile: {error}</div>
  }

  if (roles && roles.length > 0) {
    const userRole = userProfile?.role
    console.log('[ProtectedRoute] Checking access:', { userRole, requiredRoles: roles, path: location.pathname })
    
    if (!userRole || !roles.includes(userRole)) {
      console.log('[ProtectedRoute] Access denied, redirecting to dashboard')
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}
