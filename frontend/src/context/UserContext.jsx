import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { apiGetAuth } from '../services/api'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const { isLoaded, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      setUserProfile(null)
      setLoading(false)
      return
    }

    async function fetchUserProfile() {
      try {
        console.log('[UserContext] Fetching user profile...')
        const jwt = await getToken({ template: 'backend' })
        const profile = await apiGetAuth('/api/me', jwt)
        console.log('[UserContext] User profile loaded:', profile)
        setUserProfile(profile)
        setError(null)
      } catch (err) {
        console.error('[UserContext] Failed to fetch user profile:', err)
        setError(err.message)
        setUserProfile(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [isLoaded, isSignedIn, getToken])

  return (
    <UserContext.Provider value={{ userProfile, loading, error }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserProfile() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUserProfile must be used within UserProvider')
  }
  return context
}
