import axios, { isAxiosError } from 'axios';
import { getToken, removeToken } from '../utils/token';

const baseURL = 'https://resume-builder-backend-wzkk.onrender.com';

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
        if(isAxiosError(error)) {
            return new Error(error.response?.data?.message || 'An error occurred');

        }
        throw new Error(error.response?.data?.message || 'Request failed');
    }
    
);


export default axiosInstance;
