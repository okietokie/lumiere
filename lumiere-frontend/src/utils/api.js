const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

/* ── helpers ─────────────────────────────────────────── */
const getToken = () => localStorage.getItem('lumiere_token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const request = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? err.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
};

/* ── Auth ────────────────────────────────────────────── */
export const authAPI = {
  login:    (email, password)     => request('POST', '/auth/login',    { email, password }),
  register: (name, email, password) => request('POST', '/auth/register', { name, email, password }),
  logout:   ()                    => request('POST', '/auth/logout'),
  me:       ()                    => request('GET',  '/auth/me'),
};

/* ── Projects ────────────────────────────────────────── */
export const projectsAPI = {
  getAll:    ()            => request('GET',    '/projects'),
  getOne:    (id)          => request('GET',    `/projects/${id}`),
  create:    (data)        => request('POST',   '/projects', data),
  update:    (id, data)    => request('PUT',    `/projects/${id}`, data),
  delete:    (id)          => request('DELETE', `/projects/${id}`),
  duplicate: (id)          => request('POST',   `/projects/${id}/duplicate`),
  search:    (q)           => request('GET',    `/projects/search?q=${encodeURIComponent(q)}`),
  lastSession: ()          => request('GET',    '/projects/last'),
};

/* ── Rooms ───────────────────────────────────────────── */
export const roomsAPI = {
  getByProject: (projectId)   => request('GET',    `/rooms/${projectId}`),
  create:       (data)        => request('POST',   '/rooms', data),
  update:       (id, data)    => request('PUT',    `/rooms/${id}`, data),
  delete:       (id)          => request('DELETE', `/rooms/${id}`),
};

/* ── Activity ────────────────────────────────────────── */
export const activityAPI = {
  getRecent: () => request('GET',  '/activity/user'),
  log:       (data) => request('POST', '/activity/log', data),
};

/* ── Storage ─────────────────────────────────────────── */
export const storageAPI = {
  getUsage: () => request('GET', '/storage/usage'),
};
