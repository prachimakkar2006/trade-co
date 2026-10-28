import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
export const api = axios.create({ baseURL, withCredentials: true, headers: { 'Content-Type': 'application/json' } });

let accessToken = null;
let csrfToken = null;
let refreshPromise = null;

export function setSessionTokens(nextAccessToken, nextCsrfToken) {
  accessToken = nextAccessToken || null;
  csrfToken = nextCsrfToken || null;
}

export function clearSessionTokens() {
  accessToken = null;
  csrfToken = null;
}

function requestPath(config) {
  return `${config.baseURL || ''}${config.url || ''}`;
}

function isAuthEndpoint(config) {
  return /\/auth\/(csrf|login|register|google|refresh|logout|forgot-password|reset-password)(\?|$)/.test(requestPath(config));
}

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes((config.method || 'get').toLowerCase())) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  if (error.response?.status !== 401 || !original || original._retried || isAuthEndpoint(original)) {
    return Promise.reject(error);
  }
  original._retried = true;

  if (!refreshPromise) {
    refreshPromise = api.post('/auth/refresh')
      .then(({ data }) => {
        const result = data.data;
        setSessionTokens(result.accessToken, result.csrfToken);
        return result.accessToken;
      })
      .catch((refreshError) => {
        clearSessionTokens();
        window.dispatchEvent(new Event('auth:expired'));
        throw refreshError;
      })
      .finally(() => { refreshPromise = null; });
  }

  try {
    const token = await refreshPromise;
    original.headers = original.headers || {};
    original.headers.Authorization = `Bearer ${token}`;
    return api(original);
  } catch {
    return Promise.reject(error);
  }
});
