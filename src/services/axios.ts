import axios, { isAxiosError } from 'axios';
import { getToken, removeToken } from '../utils/token';

/**
 * Resolves the base URL for API requests.
 * Supports:
 * - Explicit process.env.REACT_APP_API_URL if configured.
 * - Relative /api base path (empty string '') when using Netlify proxy in production.
 * - Explicit fallback to http://localhost:10000 for local development.
 */
export const getBaseURL = (): string => {
  if (process.env.REACT_APP_API_URL !== undefined) {
    const raw = process.env.REACT_APP_API_URL.trim();
    if (raw === '' || raw === '/api' || raw === '/api/') {
      return '';
    }
    // Remove trailing slash or trailing /api since endpoints are prefixed with /api
    return raw.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  // When deployed in production without an explicit API URL, use relative base path (Netlify proxy rewrite)
  if (process.env.NODE_ENV === 'production') {
    return '';
  }

  // Explicit fallback to local backend for development/testing
  return 'http://localhost:10000';
};

const baseURL = getBaseURL();

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
export const AUTH_LOGOUT_EVENT = 'auth:logout';

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    let blobMessage: string | undefined;
    if (
      isAxiosError(error) &&
      typeof Blob !== 'undefined' &&
      error.response?.data instanceof Blob &&
      typeof error.response.data.text === 'function'
    ) {
      try {
        const rawText = await error.response.data.text();
        const parsed = JSON.parse(rawText);
        if (parsed && typeof parsed.message === 'string') {
          blobMessage = parsed.message;
        }
      } catch {
        // Ignore non-JSON blob error bodies
      }
    }

    const message = isAxiosError(error)
      ? blobMessage || error.response?.data?.message || error.message || 'Request failed'
      : error?.message || 'Request failed';

    // A 401 from login means wrong credentials, not an expired session.
    const isLoginRequest = isAxiosError(error) && error.config?.url?.includes('/api/auth/login');
    if (isAxiosError(error) && error.response?.status === 401 && !isLoginRequest) {
      removeToken();
      window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
    }

    return Promise.reject(new Error(message));
  }
);


export default axiosInstance;
