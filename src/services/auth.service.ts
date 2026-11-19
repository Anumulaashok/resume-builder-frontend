import { setToken, setStoredUser } from "../utils/token";
import axiosInstance from "./axios";

interface LoginPayload {
  email: string;
  password: string;
}

interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: AuthUser;
}


class AuthService {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await axiosInstance.post(
      "/api/auth/login",
      payload
    );
    const { data } = response;
    if (data.token) {
      setToken(data.token);
    }
    if (data.user) {
      setStoredUser(data.user);
    }
    return data;
  }

  async signup(payload: SignupPayload): Promise<AuthResponse> {
    const response = await axiosInstance.post(
      "/api/auth/register",
      payload
    );
    const { data } = response;
    if (data.token) {
      setToken(data.token);
    }
    if (data.user) {
      setStoredUser(data.user);
    }
    return data;
  }
}

export const authService = new AuthService();
