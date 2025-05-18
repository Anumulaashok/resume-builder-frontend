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
    const response = await axiosInstance.post(
      "/api/auth/login",
      payload
    );
    const { data } = response;
    if (data.token) {
      setToken(data.token);
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
    return data;
  }
}

export const authService = new AuthService();
