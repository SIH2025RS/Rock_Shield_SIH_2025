import React, { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Navbar from './components/Navbar'
import Loading from './components/Loading'
import { ClerkProvider } from '@clerk/clerk-react'
import ProtectedRoute from './components/ProtectedRoute'

const Home = React.lazy(() => import('./pages/Home'))
const NotFound = React.lazy(() => import('./pages/NotFound'))
const Login = React.lazy(() => import('./pages/Login'))
const Register = React.lazy(() => import('./pages/Register'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Admin = React.lazy(() => import('./pages/Admin'))
const Operator = React.lazy(() => import('./pages/Operator'))
const Miner = React.lazy(() => import('./pages/Miner'))
const Profile = React.lazy(() => import('./pages/Profile'))

import { ThemeProvider } from './context/ThemeContext'
import { UserProvider } from './context/UserContext'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey} afterSignInUrl="/dashboard" afterSignUpUrl="/dashboard">
      <UserProvider>
        <ThemeProvider>
          <BrowserRouter>
          <Navbar />
          <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["system_admin"]}>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operator"
              element={
                <ProtectedRoute roles={["operator", "system_admin"]}>
                  <Operator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/miner"
              element={
                <ProtectedRoute roles={["miner", "operator", "system_admin"]}>
                  <Miner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </BrowserRouter>
        </ThemeProvider>
      </UserProvider>
    </ClerkProvider>
  )
}

createRoot(document.getElementById('root')).render(<App />)
