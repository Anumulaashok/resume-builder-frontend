import { setToken} from "../utils/token";
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


class AuthService {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response: AuthResponse = await axiosInstance.post(
      "/api/auth/login",
      payload
    );
    if (response.token) {
      setToken(response.token);
    }
    return response;
  }

  async signup(payload: SignupPayload): Promise<AuthResponse> {
    const response: AuthResponse = await axiosInstance.post(
      "/api/auth/register",
      payload
    );
    if (response.token) {
      setToken(response.token);
    }
    return response;
  }
}

export const authService = new AuthService();
