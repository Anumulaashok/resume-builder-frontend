import axios from 'axios';
import { setToken, getToken, removeToken } from '../utils/token';

interface LoginPayload {
    email: string;
    password: string;
}

interface SignupPayload {
    name: string;
    email: string;
    password: string;
}

interface AuthResponse {
    success: boolean;
    message: string;
    token?: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
}

class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

// Replace apiRequest with axios instance
const api = axios.create({
    baseURL: 'https://resume-builder-backend-wzkk.onrender.com',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Update request interceptor
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Update response interceptor to handle errors without page reloads
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401) {
            removeToken();
            // Don't redirect, let the component handle it
            throw new AuthError('Authentication failed');
        }
        throw new AuthError(error.response?.data?.message || 'Request failed');
    }
);

class AuthService {
    async login(payload: LoginPayload): Promise<AuthResponse> {
        try {
            const response :AuthResponse= await api.post('/api/auth/login', payload);
            if (response.token) {
                setToken(response.token);
            }
            return response;
        } catch (error) {
            // Don't log to console in production
            if (process.env.NODE_ENV !== 'production') {
                console.error('Login Error:', error);
            }
            throw error instanceof AuthError ? error : new AuthError('Login failed');
        }
    }

    async signup(payload: SignupPayload): Promise<AuthResponse> {
        try {
            const response:AuthResponse = await api.post('/api/auth/register', payload);
            if (response.token) {
                setToken(response.token);
            }
            return response;
        } catch (error) {
            console.error('Signup Error:', error);
            // Prevent page reload by throwing a custom error
            if (axios.isAxiosError(error)) {
                throw new AuthError(error.response?.data?.message || 'Registration failed');
            }
            throw new AuthError('An unexpected error occurred during registration');
        }
    }
}

export const authService = new AuthService();
