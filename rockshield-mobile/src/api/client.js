// @ts-nocheck
// Simple API client for the mobile app. Mirrors the frontend's api.js pattern.

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = process.env.EXPO_PUBLIC_BACKEND_TOKEN || null;

function join(base, path) {
  if (!path) return base;
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(join(API_BASE_URL, path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Treat 304 Not Modified as a non-error (no new body, but not a failure)
  if (res.status === 304) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  return res.json();
}

export function apiGet(path) {
  return apiRequest(path, { method: 'GET' });
}

export function apiGetAuth(path, token) {
  return apiRequest(path, { method: 'GET', token });
}

export function apiPostAuth(path, token, body) {
  return apiRequest(path, { method: 'POST', token, body });
}

export function apiPutAuth(path, token, body) {
  return apiRequest(path, { method: 'PUT', token, body });
}

export function apiGetOperator(path) {
  return apiRequest(path, { method: 'GET', token: API_TOKEN });
}

export { API_BASE_URL };
