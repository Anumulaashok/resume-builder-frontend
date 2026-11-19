import axios, { isAxiosError } from 'axios';
import { getToken, removeToken } from '../utils/token';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:10000';

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
  (error) => {
    const message = isAxiosError(error)
      ? error.response?.data?.message || error.message || 'Request failed'
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
