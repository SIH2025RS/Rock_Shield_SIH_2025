import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiUploadAuth, API_BASE_URL } from '../../services/api'
import { MapPin, Paperclip, Plus, RefreshCcw, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, TrendingDown, Brain, Activity, FileText } from 'lucide-react'

import { useTranslation } from 'react-i18next'

export default function OperatorIncidents() {
  const { t } = useTranslation(['operator', 'common'])
  const { getToken } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [incident, setIncident] = useState({ title: '', description: '', incident_type: 'rockfall', location_name: '', location_lat: '', location_lon: '', severity: 'high' })
  const [incidentFiles, setIncidentFiles] = useState([])
  const [status, setStatus] = useState('idle')
  const [expandedIncident, setExpandedIncident] = useState(null)

  async function loadIncidents() {
    try {
      setLoading(true)
      const token = await getToken({ template: 'backend' })
      const res = await apiGetAuth('/api/operator/incidents?limit=200', token)
      setIncidents(res.incidents || [])
    } catch (e) {
      setLoading(true)
      const token = await getToken({ template: 'backend' })
      const res = await apiGetAuth('/api/operator/incidents?limit=200', token)
      setIncidents(res.incidents || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
      ; (async () => { if (mounted) await loadIncidents() })()
    return () => { mounted = false }
  }, [getToken])

  async function submitIncident(e) {
    e.preventDefault()
    try {
      setStatus('submitting')
      const token = await getToken({ template: 'backend' })
      const form = new FormData()
      Object.entries(incident).forEach(([k, v]) => form.append(k, v))
      for (const f of incidentFiles) form.append('files', f)
      await apiUploadAuth('/api/operator/incidents', token, form)
      setIncident({ title: '', description: '', incident_type: 'rockfall', location_name: '', location_lat: '', location_lon: '', severity: 'high' })
      setIncidentFiles([])
      setStatus('success')
      setTimeout(() => setStatus('idle'), 1500)
      await loadIncidents()
      setShowForm(false)
    } catch (e) {
      setStatus(e?.message || 'error')
    }
  }

  function removeFile(idx) {
    setIncidentFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  function toggleExpand(incidentId) {
    setExpandedIncident(expandedIncident === incidentId ? null : incidentId)
  }

  // Get severity badge styling
  function getSeverityBadge(severity) {
    const styles = {
      critical: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300',
      low: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300'
    }
    return styles[severity] || styles.medium
  }

  // Parse and display SHAP metadata
  function renderSHAPMetadata(inc) {
    const metadata = typeof inc.metadata === 'string' ? JSON.parse(inc.metadata) : inc.metadata
    if (!metadata || inc.incident_type !== 'ml_shap_report') return null

    const shapTop = metadata.shap_top || []
    const riskScore = parseFloat(metadata.risk_score) || 0
    const ensembleDetails = metadata.ensemble_details || {}
    const isExpanded = expandedIncident === inc.id

    // Feature name mapping for better readability
    const featureLabels = {
      'vibration_hz': 'Ground Vibration',
      'displacement_mm': 'Rock Displacement',
      'displacement_mm_rate': 'Displacement Rate',
      'pore_pressure_kpa': 'Pore Water Pressure',
      'pore_pressure_kpa_rate': 'Pressure Change Rate',
      'pore_pressure_ratio': 'Pressure Ratio',
      'strain_microstrain': 'Rock Strain',
      'strain_microstrain_rate': 'Strain Rate',
      'fs': 'Factor of Safety',
      'fs_rate': 'Safety Factor Change',
      'rain_A24': '24-Hour Rainfall',
      'rain_A72': '72-Hour Rainfall',
      'rain_A168': 'Weekly Rainfall',
      'temperature_c': 'Temperature',
      'humidity_pct': 'Humidity',
      'normal_stress_kpa': 'Normal Stress',
      'shear_stress_kpa': 'Shear Stress',
      'cohesion_kpa': 'Rock Cohesion',
      'friction_angle_deg': 'Friction Angle',
      'dem_slope_angle': 'Slope Angle',
      'dem_curvature': 'Terrain Curvature',
      'dem_terrain_ruggedness': 'Terrain Ruggedness',
      'TWI_dynamic': 'Topographic Wetness Index'
    }

    // Explain why each feature contributes to risk
    const getFeatureExplanation = (featureName, contribution) => {
      const isPositive = contribution > 0
      const explanations = {
        'vibration_hz': isPositive ? 'Elevated ground vibrations indicate active rock movement and instability' : 'Low vibrations suggest stable ground conditions',
        'displacement_mm_rate': isPositive ? 'Rapid displacement indicates accelerating rock movement toward failure' : 'Minimal displacement suggests stable rock mass',
        'pore_pressure_kpa': isPositive ? 'High pore water pressure reduces effective stress and weakens rock stability' : 'Low pore pressure maintains rock strength',
        'strain_microstrain_rate': isPositive ? 'Increasing strain rate signals progressive rock deformation' : 'Stable strain indicates no progressive failure',
        'rain_A24': isPositive ? 'Recent heavy rainfall increases pore pressure and reduces rock friction' : 'Dry conditions maintain rock stability',
        'rain_A72': isPositive ? 'Prolonged rainfall saturates rock mass and increases failure risk' : 'Extended dry period supports stability',
        'fs': isPositive ? 'Decreasing factor of safety indicates approaching failure threshold' : 'High safety factor provides stability margin',
        'temperature_c': isPositive ? 'Temperature variations cause thermal expansion and rock stress' : 'Stable temperature reduces thermal stress',
        'dem_slope_angle': isPositive ? 'Steep slopes increase gravitational driving forces' : 'Gentle slopes reduce failure risk',
        'cohesion_kpa': isPositive ? 'Weakening cohesion reduces rock mass strength' : 'Strong cohesion maintains stability',
        'shear_stress_kpa': isPositive ? 'High shear stress approaches rock failure threshold' : 'Low shear stress indicates stable conditions'
      }
      return explanations[featureName] || (isPositive ? 'This factor increases instability risk' : 'This factor supports stability')
    }

    return (
      <div className="mt-4 border-t pt-4">
        {/* Government-style header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-l-4 border-blue-600 p-4 rounded-r-lg mb-4">
          <div className="flex items-start gap-3">
            <Brain className="text-blue-600 mt-1" size={24} />
            <div className="flex-1">
              <h4 className="font-bold text-lg text-blue-900 dark:text-blue-100">
                Machine Learning Risk Assessment Report
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                AI-Powered Geological Hazard Analysis • Generated by Ensemble Model
              </p>
            </div>
          </div>
        </div>

        {/* Risk Score Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white dark:bg-slate-800 border rounded-lg p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Risk Score</div>
            <div className={`text-3xl font-bold ${riskScore >= 0.8 ? 'text-red-600' : riskScore >= 0.6 ? 'text-orange-600' : 'text-yellow-600'}`}>
              {(riskScore * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-600 mt-1">{metadata.klass || 'MEDIUM'} Risk Level</div>
          </div>

          <div className="bg-white dark:bg-slate-800 border rounded-lg p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Model Type</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-white">{metadata.model_name || 'Ensemble'}</div>
            <div className="text-xs text-slate-600 mt-1">
              {ensembleDetails.xgb_score && ensembleDetails.lstm_score ? 'XGBoost + LSTM' : 'Single Model'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border rounded-lg p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Confidence</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-white">
              {metadata.confidence ? `${(metadata.confidence * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-xs text-slate-600 mt-1">Prediction Reliability</div>
          </div>
        </div>

        {/* Ensemble Breakdown */}
        {ensembleDetails.xgb_score && ensembleDetails.lstm_score && (
          <div className="bg-slate-50 dark:bg-slate-800/50 border rounded-lg p-4 mb-4">
            <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Activity size={16} className="text-indigo-600" />
              Ensemble Model Breakdown
            </h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-600 mb-1">XGBoost Component</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${ensembleDetails.xgb_score * 100}%` }}
                    />
                  </div>
                  <span className="font-semibold">{(ensembleDetails.xgb_score * 100).toFixed(1)}%</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">Weight: {ensembleDetails.xgb_weight || 0.7}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">LSTM Component</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${ensembleDetails.lstm_score * 100}%` }}
                    />
                  </div>
                  <span className="font-semibold">{(ensembleDetails.lstm_score * 100).toFixed(1)}%</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">Weight: {ensembleDetails.lstm_weight || 0.3}</div>
              </div>
            </div>
          </div>
        )}

        {/* Recommended Action */}
        {metadata.recommended_action && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-lg mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-amber-600 mt-0.5" size={18} />
              <div>
                <div className="font-semibold text-amber-900 dark:text-amber-100 text-sm">Recommended Action</div>
                <div className="text-sm text-amber-800 dark:text-amber-200 mt-1">{metadata.recommended_action}</div>
              </div>
            </div>
          </div>
        )}

        {/* SHAP Feature Importance */}
        {shapTop && shapTop.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div
              className="bg-slate-100 dark:bg-slate-800 p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              onClick={() => toggleExpand(inc.id)}
            >
              <div className="flex items-center justify-between">
                <h5 className="font-semibold text-sm flex items-center gap-2">
                  <FileText size={16} className="text-slate-600" />
                  Contributing Factors Analysis ({shapTop.length} factors identified)
                </h5>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                SHAP (SHapley Additive exPlanations) values explain which factors contributed most to this risk assessment
              </p>
            </div>

            {isExpanded && (
              <div className="p-4 bg-white dark:bg-slate-900">
                <div className="space-y-3">
                  {shapTop.map(([feature, contribution], idx) => {
                    const isPositive = contribution > 0
                    const absContribution = Math.abs(contribution)
                    const maxContribution = Math.max(...shapTop.map(([_, c]) => Math.abs(c)))
                    const barWidth = (absContribution / maxContribution) * 100

                    return (
                      <div key={idx} className="border-b pb-3 last:border-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {isPositive ? (
                                <TrendingUp size={16} className="text-red-600" />
                              ) : (
                                <TrendingDown size={16} className="text-green-600" />
                              )}
                              <span className="font-semibold text-sm">
                                {featureLabels[feature] || feature}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1 ml-6">
                              {getFeatureExplanation(feature, contribution)}
                            </div>
                          </div>
                          <div className={`text-sm font-bold ml-4 ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
                            {isPositive ? '+' : ''}{contribution.toFixed(4)}
                          </div>
                        </div>
                        <div className="ml-6">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full ${isPositive ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-12 text-right">
                              {((absContribution / maxContribution) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Summary Statistics */}
                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-slate-600">Risk-Increasing</div>
                    <div className="text-lg font-bold text-red-600">
                      {shapTop.filter(([_, c]) => c > 0).length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-600">Risk-Decreasing</div>
                    <div className="text-lg font-bold text-green-600">
                      {shapTop.filter(([_, c]) => c < 0).length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-600">Net Impact</div>
                    <div className={`text-lg font-bold ${shapTop.reduce((sum, [_, c]) => sum + c, 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {shapTop.reduce((sum, [_, c]) => sum + c, 0).toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Additional Metadata */}
        {metadata.location_id && (
          <div className="mt-4 text-xs text-slate-500 border-t pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="font-semibold">Location ID:</span> {metadata.location_id}</div>
              <div><span className="font-semibold">Generated:</span> {new Date(metadata.generated_at || inc.created_at).toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('incidents_page.title')}</h2>
          <div className="text-sm text-slate-600 dark:text-slate-400">{t('incidents_page.subtitle')}</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => loadIncidents()} disabled={loading}><RefreshCcw size={14} /> {t('common:actions.refresh')}</button>
          <button className={`btn-primary ${showForm ? 'btn-ghost' : ''}`} onClick={() => setShowForm(!showForm)}>{showForm ? t('common:close') : (<span className="inline-flex items-center gap-1"><Plus size={14} /> {t('incidents_page.add_btn')}</span>)}</button>
        </div>
      </div>

      {showForm && (
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm md:col-span-2">
            <form onSubmit={submitIncident}>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">{t('incidents_page.form.title')}</label>
                  <input className="input mt-1 w-full" placeholder={t('placeholders.title')} value={incident.title} onChange={(e) => setIncident({ ...incident, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('incidents_page.form.type')}</label>
                  <select className="input mt-1 w-full" value={incident.incident_type} onChange={(e) => setIncident({ ...incident, incident_type: e.target.value })}>
                    <option value="rockfall">{t('incidents_page.types.rockfall')}</option>
                    <option value="hazard">{t('incidents_page.types.hazard')}</option>
                    <option value="near_miss">{t('incidents_page.types.near_miss')}</option>
                    <option value="equipment">{t('incidents_page.types.equipment')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('incidents_page.form.severity')}</label>
                  <select className="input mt-1 w-full" value={incident.severity} onChange={(e) => setIncident({ ...incident, severity: e.target.value })}>
                    <option value="low">{t('tasks_page.priorities.low')}</option>
                    <option value="medium">{t('tasks_page.priorities.medium')}</option>
                    <option value="high">{t('tasks_page.priorities.high')}</option>
                    <option value="critical">{t('tasks_page.priorities.critical')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('incidents_page.form.location_name')}</label>
                  <div className="relative mt-1">
                    <input className="input w-full pl-8" placeholder={t('placeholders.location_name')} value={incident.location_name} onChange={(e) => setIncident({ ...incident, location_name: e.target.value })} />
                    <MapPin size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('incidents_page.form.lat')}</label>
                  <input className="input mt-1 w-full" placeholder={t('placeholders.latitude')} value={incident.location_lat} onChange={(e) => setIncident({ ...incident, location_lat: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('incidents_page.form.lon')}</label>
                  <input className="input mt-1 w-full" placeholder={t('placeholders.longitude')} value={incident.location_lon} onChange={(e) => setIncident({ ...incident, location_lon: e.target.value })} />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-sm font-medium">{t('incidents_page.form.desc')}</label>
                <textarea className="input mt-1 w-full" rows={4} placeholder={t('placeholders.description')} value={incident.description} onChange={(e) => setIncident({ ...incident, description: e.target.value })} />
              </div>
              <div className="mt-3">
                <label className="text-sm font-medium">{t('incidents_page.form.attachments')}</label>
                <div className="mt-1 rounded-lg border border-dashed p-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Paperclip size={16} />
                    <span>{t('incidents_page.form.upload_prompt')}</span>
                  </div>
                  <input className="mt-2" type="file" multiple onChange={(e) => setIncidentFiles(Array.from(e.target.files || []))} />
                  {incidentFiles.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {incidentFiles.map((f, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-3 border-b py-1 last:border-0">
                          <span className="truncate">{f.name}</span>
                          <button type="button" className="text-slate-500 hover:text-red-600" onClick={() => removeFile(idx)}>{t('common:delete')}</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button className="btn-primary" type="submit" disabled={status === 'submitting' || !incident.title || !incident.description}>
                  {status === 'submitting' ? t('reports_page.form.submitting') : t('incidents_page.form.submit')}
                </button>
                {status === 'success' && <span className="badge badge-green">{t('reports_page.form.submitted')}</span>}
                {status !== 'idle' && status !== 'success' && status !== 'submitting' && <span className="badge badge-red">{String(status)}</span>}
              </div>
            </form>
          </div>
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="font-medium mb-2">{t('incidents_page.tips_title')}</h3>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>{t('incidents_page.tips.one')}</li>
              <li>{t('incidents_page.tips.two')}</li>
              <li>{t('incidents_page.tips.three')}</li>
              <li>{t('incidents_page.tips.four')}</li>
            </ul>
            <div className="mt-4 text-xs text-slate-500">{t('incidents_page.admin_note')}</div>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
        <h3 className="font-medium mb-3">{t('incidents_page.recent_title')}</h3>
        {loading && <div className="text-sm text-slate-500">{t('messages.loading')}</div>}
        {!loading && incidents.length === 0 && <div className="text-sm text-slate-500">{t('incidents_page.no_incidents')}</div>}
        <ul className="space-y-4 max-h-[640px] overflow-auto">
          {incidents.map((inc) => (
            <li key={inc.id} className="rounded-xl border p-4 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-lg">{inc.title}</h4>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getSeverityBadge(inc.severity)}`}>
                      {inc.severity?.toUpperCase() || 'MEDIUM'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
                    <span className="font-medium">{inc.incident_type?.replace('_', ' ').toUpperCase()}</span>
                    <span>•</span>
                    <span>{inc.status}</span>
                    <span>•</span>
                    <span>{new Date(inc.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300">{inc.description || ''}</div>
                </div>
              </div>

              {/* Render SHAP metadata if available */}
              {renderSHAPMetadata(inc)}

              {/* Attachments */}
              {Array.isArray(inc.attachments) && inc.attachments.length > 0 && (
                <div className="mt-3 grid gap-2 grid-cols-3">
                  {inc.attachments.filter(a => (a.mimetype || '').startsWith('image/')).slice(0, 9).map((a, idx) => (
                    <img key={idx} className="h-28 w-full object-cover rounded border" src={`${API_BASE_URL}/${a.path}`} alt={a.originalname || 'attachment'} />
                  ))}
                </div>
              )}

              {/* Location */}
              {typeof inc.location_lat === 'number' && typeof inc.location_lon === 'number' && (
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
                  <MapPin size={12} />
                  <span>{inc.location_lat.toFixed(5)}, {inc.location_lon.toFixed(5)}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}