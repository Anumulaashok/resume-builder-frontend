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
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      // Don't redirect, let the component handle it
      throw new Error('Authentication failed');
    }
    if (isAxiosError(error)) {
      return new Error(error.response?.data?.message || 'An error occurred');

    }
    throw new Error(error.response?.data?.message || 'Request failed');
  }

);


export default axiosInstance;
