/**
 * Shared Axios instance.
 *  - Sends the httpOnly auth cookie (withCredentials).
 *  - Adds X-Requested-With, which the API requires on writes (CSRF defence).
 *  - Normalises errors so `err.message` is always a human-readable string.
 *  - Broadcasts `auth:expired` when a session dies mid-use.
 */
import axios from 'axios';

const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const api = axios.create({
  baseURL: `${base}/api`,
  withCredentials: true,
  timeout: 15_000,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    let message = error.response?.data?.error;

    // Blob responses (CSV export) carry their JSON error inside the blob.
    if (!message && error.response?.data instanceof Blob) {
      try {
        message = JSON.parse(await error.response.data.text()).error;
      } catch {
        /* ignore */
      }
    }

    // No response at all, or a gateway/proxy error with no API error body
    // (e.g. the API is down or restarting behind Render/Vercel/Vite).
    if (!error.response || (!message && status >= 500)) {
      message = navigator.onLine ? 'Can’t reach the server. Please try again.' : 'You’re offline.';
    }

    const url = error.config?.url || '';
    if (status === 401 && !url.startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth:expired'));
    }

    const normalised = new Error(message || 'Something went wrong');
    normalised.status = status;
    normalised.details = error.response?.data?.details;
    return Promise.reject(normalised);
  }
);
