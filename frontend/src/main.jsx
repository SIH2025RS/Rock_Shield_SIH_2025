import React, { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Navbar from './components/Navbar'
import Loading from './components/Loading'

const Home = React.lazy(() => import('./pages/Home'))
const NotFound = React.lazy(() => import('./pages/NotFound'))

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Suspense fallback={<Loading />}>        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
