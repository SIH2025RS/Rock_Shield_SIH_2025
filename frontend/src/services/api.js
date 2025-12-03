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

export async function health() {
  return apiGet('/health')
}

export { API_BASE_URL }
