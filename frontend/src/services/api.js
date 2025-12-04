const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

function join(base, path) {
  if (!path) return base
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

export async function apiGet(path) {
  const res = await fetch(join(API_BASE_URL, path))
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(join(API_BASE_URL, path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export function apiGetAuth(path, token) {
  return apiRequest(path, { method: 'GET', token })
}

export function apiPostAuth(path, token, body) {
  return apiRequest(path, { method: 'POST', token, body })
}

export function apiPutAuth(path, token, body) {
  return apiRequest(path, { method: 'PUT', token, body })
}

export async function apiUploadAuth(path, token, formData) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(join(API_BASE_URL, path), {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export async function health() {
  return apiGet('/health')
}

export { API_BASE_URL }
