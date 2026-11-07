/** Thin, typed-ish wrappers around every API endpoint. */
import { api } from './client.js';

const data = (p) => p.then((r) => r.data);

export const authApi = {
  register: (body) => data(api.post('/auth/register', body)).then((d) => d.user),
  login: (body) => data(api.post('/auth/login', body)).then((d) => d.user),
  logout: () => data(api.post('/auth/logout')),
  me: () => data(api.get('/auth/me')).then((d) => d.user),
  updateMe: (body) => data(api.patch('/auth/me', body)).then((d) => d.user),
};

export const countersApi = {
  list: () => data(api.get('/counters')),
  create: (name) => data(api.post('/counters', { name })).then((d) => d.counter),
  rename: (id, name) => data(api.patch(`/counters/${id}`, { name })).then((d) => d.counter),
  remove: (id) => data(api.delete(`/counters/${id}`)),

  today: (id) => data(api.get(`/counters/${id}/today`)),
  increment: (id, amount) => data(api.post(`/counters/${id}/increment`, { amount })),
  resetToday: (id) => data(api.post(`/counters/${id}/reset-today`)),

  history: (id, params) => data(api.get(`/counters/${id}/history`, { params })),
  stats: (id) => data(api.get(`/counters/${id}/stats`)),

  /** Download the CSV through Axios so the auth cookie works cross-site too. */
  async exportCsv(id, fallbackName = 'history.csv') {
    const res = await api.get(`/counters/${id}/export.csv`, { responseType: 'blob' });
    const match = /filename="([^"]+)"/.exec(res.headers['content-disposition'] || '');
    const url = URL.createObjectURL(res.data);
    const a = Object.assign(document.createElement('a'), { href: url, download: match?.[1] || fallbackName });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
