
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

export const apiRequest = async (url: string, options: RequestInit = {}) => {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            removeToken();
            // Redirect to login if needed
            window.location.href = '/';
        }
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
};

class AuthService {
    private baseUrl: string = 'https://api.example.com'; // Replace with your actual API URL

    async login(payload: LoginPayload): Promise<AuthResponse> {
        try {
            console.log('Login API Payload:', payload);
            
            // Simulating API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For development: always return success
            const response = {
                success: true,
                message: 'Login successful',
                token: 'dummy-jwt-token',
                user: {
                    id: '1',
                    name: 'John Doe',
                    email: payload.email
                }
            };

            // Save the JWT token
            if (response.token) {
                setToken(response.token);
            }

            return response;

            // Real API implementation would look like this:
            /*
            const response = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }
            return data;
            */
        } catch (error) {
            console.error('Login Error:', error);
            throw error;
        }
    }

    async signup(payload: SignupPayload): Promise<AuthResponse> {
        try {
            console.log('Signup API Payload:', payload);
            
            // Simulating API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For development: always return success
            return {
                success: true,
                message: 'Signup successful',
                token: 'dummy-jwt-token',
                user: {
                    id: '1',
                    name: payload.name,
                    email: payload.email
                }
            };

            // Real API implementation would look like this:
            /*
            const response = await fetch(`${this.baseUrl}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Signup failed');
            }
            return data;
            */
        } catch (error) {
            console.error('Signup Error:', error);
            throw error;
        }
    }
}

export const authService = new AuthService();
