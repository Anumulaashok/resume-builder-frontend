import axiosInstance from './axios';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const { data } = await axiosInstance.post('/api/auth/login', { email, password });
      return data;
    },

    register: async (email: string, password: string): Promise<AuthResponse> => {
      const { data } = await axiosInstance.post('/api/auth/register', { email, password });
      return data;
    },
  },

  resumes: {
    getAll: async () => {
      const { data } = await axiosInstance.get('/api/resumes');
      return data;
    },

    getById: async (id: string) => {
      const { data } = await axiosInstance.get(`/api/resumes/${id}`);
      return data;
    },
  },
};
