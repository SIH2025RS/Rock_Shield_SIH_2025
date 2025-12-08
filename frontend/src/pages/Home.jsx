import { useEffect, useState } from 'react'
import { API_BASE_URL, health } from '../services/api'
import { useAuth } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { Shield, Activity, Cloud, MapPin, AlertTriangle, TrendingDown, Eye, Zap, BarChart3, Brain, Layers, Radio } from 'lucide-react'
import TeamCredits from '../components/TeamCredits'

export default function Home() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const { isSignedIn } = useAuth()

  useEffect(() => {
    health()
      .then(() => setStatus('ok'))
      .catch((e) => {
        setStatus('error')
        setError(String(e?.message || 'Unknown error'))
      })
  }, [])

  const badge =
    status === 'ok'
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400'
      : status === 'error'
        ? 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400'
        : 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-400'

  const label = status === 'ok' ? 'All Systems Operational' : status === 'error' ? 'System Unavailable' : 'Checking Status…'

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      {/* Hero Section with Gradient Background */}
      <section className="relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-amber-600/10 dark:from-blue-600/20 dark:via-purple-600/20 dark:to-amber-600/20"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcn4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left column - Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className={`flex h-2 w-2 rounded-full ${status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                  <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75 ${status === 'ok' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
              </div>

              <div>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-amber-600 bg-clip-text text-transparent">
                    RockShield
                  </span>
                </h1>
                <p className="mt-6 text-xl sm:text-2xl text-slate-600 dark:text-slate-400 leading-relaxed">
                  AI-Powered Rockfall Prediction & Real-Time Safety Monitoring for Modern Mining Operations
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {isSignedIn ? (
                  <Link
                    to="/dashboard"
                    className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                  >
                    <span>Open Dashboard</span>
                    <Zap size={18} className="group-hover:rotate-12 transition-transform" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                    >
                      <span>Get Started</span>
                      <Shield size={18} className="group-hover:scale-110 transition-transform" />
                    </Link>
                    <Link
                      to="/login"
                      className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-600 dark:hover:border-blue-500 hover:scale-105 transition-all duration-200"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 pt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">99.9%</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Uptime</div>
                </div>
                <div className="text-center border-x border-slate-200 dark:border-slate-700">
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent">&lt;1s</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Response</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-blue-600 bg-clip-text text-transparent">24/7</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Monitoring</div>
                </div>
              </div>
            </div>

            {/* Right column - Feature Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="group rounded-2xl border-2 border-blue-200 dark:border-blue-900 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg mb-4">
                  <Brain size={24} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI Prediction</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Machine learning models for risk assessment</p>
              </div>

              <div className="group rounded-2xl border-2 border-purple-200 dark:border-purple-900 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg mb-4">
                  <Radio size={24} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Real-Time</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Live sensor data streaming</p>
              </div>

              <div className="group rounded-2xl border-2 border-emerald-200 dark:border-emerald-900 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg mb-4">
                  <Layers size={24} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">3D Terrain</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Digital elevation modeling</p>
              </div>

              <div className="group rounded-2xl border-2 border-amber-200 dark:border-amber-900 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Smart Alerts</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Intelligent risk notifications</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Quick Access for Signed-in Users */}
        {isSignedIn && (
          <section className="py-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Quick Access</h2>
              <Link to="/dashboard" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-2 group">
                View all
                <Zap size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Link to="/operator/map" className="group rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-lg hover:scale-105 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <MapPin size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Interactive Map</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">3D terrain visualization</div>
                  </div>
                </div>
              </Link>

              <Link to="/operator/alerts" className="group rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-lg hover:scale-105 hover:border-amber-500 dark:hover:border-amber-500 transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Risk Alerts</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Recent warnings & risks</div>
                  </div>
                </div>
              </Link>

              <Link to="/operator/incidents" className="group rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-lg hover:scale-105 hover:border-rose-500 dark:hover:border-rose-500 transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all">
                    <Shield size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">Incidents</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Track & acknowledge</div>
                  </div>
                </div>
              </Link>

              <Link to="/operator/reports" className="group rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-lg hover:scale-105 hover:border-purple-500 dark:hover:border-purple-500 transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
                    <BarChart3 size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Analytics</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Insights & reports</div>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Core Capabilities */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Enterprise-Grade Safety Platform</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Combining advanced AI, real-time monitoring, and predictive analytics to prevent rockfall incidents before they happen
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="group rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-2xl transition-all duration-300">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg mb-6">
                <Brain size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Predictive AI Models</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Advanced machine learning algorithms analyze patterns from historical data, weather conditions, and terrain characteristics to predict rockfall risks with high accuracy.
              </p>
            </div>

            <div className="group rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-2xl transition-all duration-300">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg mb-6">
                <Eye size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Unified Monitoring</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Centralized dashboard displaying real-time sensor data, weather updates, terrain analysis, and incident reports. Monitor your entire operation from one place.
              </p>
            </div>

            <div className="group rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-2xl transition-all duration-300">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg mb-6">
                <Layers size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">3D Terrain Analytics</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                High-resolution digital elevation models (DEM) provide detailed topographic analysis, slope stability assessments, and visual representations of your mining site.
              </p>
            </div>

            <div className="group rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-2xl transition-all duration-300">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg mb-6">
                <Radio size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">IoT Sensor Network</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Seamlessly integrate with existing sensor infrastructure. Real-time data streaming from vibration, displacement, and environmental sensors ensures comprehensive coverage.
              </p>
            </div>

            <div className="group rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 hover:border-rose-500 dark:hover:border-rose-500 hover:shadow-2xl transition-all duration-300">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg mb-6">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Intelligent Alerting</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Smart notification system with customizable thresholds. Receive instant alerts via multiple channels when critical conditions are detected. Reduce false positives with AI filtering.
              </p>
            </div>

            <div className="group rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-2xl transition-all duration-300">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg mb-6">
                <Cloud size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Open API Integration</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                RESTful APIs and webhooks enable seamless integration with your existing tools and workflows. Build custom applications leveraging our prediction engine.
              </p>
            </div>
          </div>
        </section>


        {/* CTA Section */}
        {!isSignedIn && (
          <section className="py-20">
            <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-amber-600 p-12 shadow-2xl">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-4xl font-bold text-white mb-4">Ready to enhance your safety operations?</h2>
                <p className="text-xl text-blue-100 mb-8">
                  Join leading mining operations using AI-powered rockfall prediction
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                  >
                    <span>Start Free Trial</span>
                    <Shield size={20} />
                  </Link>
                  <Link
                    to="/login"
                    className="px-8 py-4 bg-transparent text-white font-semibold rounded-xl border-2 border-white hover:bg-white hover:text-blue-600 transition-all duration-200"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Team Credits */}
        <TeamCredits />

        {/* Footer */}
        <footer className="mt-20 border-t-2 border-slate-200 dark:border-slate-800 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Shield className="text-blue-600 dark:text-blue-400" size={24} />
              <span className="text-lg font-bold text-slate-900 dark:text-white">RockShield</span>
              <span className="text-slate-600 dark:text-slate-400">© {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Privacy Policy</a>
              <a href="#" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Terms of Service</a>
              <a href="#" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Contact Support</a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}
