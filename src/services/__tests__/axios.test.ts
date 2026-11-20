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

  it('preserves structured validation errors and fieldErrors on 400 responses', async () => {
    const adapter = (config: InternalAxiosRequestConfig) =>
      Promise.reject(
        new AxiosError('Request failed with status code 400', '400', config, null, {
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config: { ...config, headers: new AxiosHeaders() },
          data: {
            success: false,
            message: 'Full name is required; Please enter a valid email address',
            errors: [
              { path: 'content.basics.name', msg: 'Full name is required' },
              { path: 'content.basics.email', msg: 'Please enter a valid email address' },
            ],
          },
        })
      );

    await expect(
      axiosInstance.post('/api/resumes', {}, { adapter })
    ).rejects.toMatchObject({
      message: 'Full name is required; Please enter a valid email address',
      status: 400,
      fieldErrors: {
        'content.basics.name': 'Full name is required',
        'content.basics.email': 'Please enter a valid email address',
      },
    });
  });

  it('derives human-readable field messages when server errors contain raw Invalid value', async () => {
    const adapter = (config: InternalAxiosRequestConfig) =>
      Promise.reject(
        new AxiosError('Request failed with status code 400', '400', config, null, {
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config: { ...config, headers: new AxiosHeaders() },
          data: {
            errors: [{ path: 'content.basics.email', msg: 'Invalid value' }],
          },
        })
      );

    await expect(
      axiosInstance.post('/api/resumes', {}, { adapter })
    ).rejects.toMatchObject({
      message: 'Please enter a valid email address',
      status: 400,
      fieldErrors: {
        'content.basics.email': 'Please enter a valid email address',
      },
    });
  });
});
