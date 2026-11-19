import { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import axiosInstance, { AUTH_LOGOUT_EVENT } from '../axios';

const failWith = (status: number, message: string) => (config: InternalAxiosRequestConfig) =>
  Promise.reject(
    new AxiosError(message, String(status), config, null, {
      status,
      statusText: '',
      headers: {},
      config: { ...config, headers: new AxiosHeaders() },
      data: { message },
    })
  );

describe('axios response interceptor', () => {
  beforeEach(() => localStorage.setItem('jwt_token', 'real-token'));

  it('rejects failed requests with the server message', async () => {
    await expect(
      axiosInstance.get('/api/resumes', { adapter: failWith(500, 'Boom') })
    ).rejects.toThrow('Boom');
  });

  it('clears the token and emits logout on 401 for protected calls', async () => {
    const onLogout = jest.fn();
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);

    await expect(
      axiosInstance.get('/api/resumes', { adapter: failWith(401, 'Not authorized') })
    ).rejects.toThrow('Not authorized');

    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(onLogout).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout);
  });

  it('does not log out on 401 from login', async () => {
    const onLogout = jest.fn();
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);

    await expect(
      axiosInstance.post('/api/auth/login', {}, { adapter: failWith(401, 'Invalid credentials') })
    ).rejects.toThrow('Invalid credentials');

    expect(localStorage.getItem('jwt_token')).toBe('real-token');
    expect(onLogout).not.toHaveBeenCalled();
    window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout);
  });
});
