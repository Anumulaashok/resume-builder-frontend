import { getBaseURL } from '../services/axios';

describe('Axios Base URL & Environment Alignment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses explicit REACT_APP_API_URL when configured', () => {
    process.env.REACT_APP_API_URL = 'https://api.myresumeapp.com';
    expect(getBaseURL()).toBe('https://api.myresumeapp.com');
  });

  it('trims trailing slashes from REACT_APP_API_URL', () => {
    process.env.REACT_APP_API_URL = 'https://api.myresumeapp.com/';
    expect(getBaseURL()).toBe('https://api.myresumeapp.com');
  });

  it('normalizes /api base URL to empty string to prevent /api/api duplicate paths', () => {
    process.env.REACT_APP_API_URL = '/api';
    expect(getBaseURL()).toBe('');

    process.env.REACT_APP_API_URL = '/api/';
    expect(getBaseURL()).toBe('');

    process.env.REACT_APP_API_URL = 'https://backend.com/api';
    expect(getBaseURL()).toBe('https://backend.com');
  });

  it('returns empty string when REACT_APP_API_URL is empty string', () => {
    process.env.REACT_APP_API_URL = '';
    expect(getBaseURL()).toBe('');
  });

  it('uses relative base path ("") in production when REACT_APP_API_URL is unset (Netlify proxy mode)', () => {
    delete process.env.REACT_APP_API_URL;
    (process.env as any).NODE_ENV = 'production';
    expect(getBaseURL()).toBe('');
  });

  it('falls back to http://localhost:10000 in development when REACT_APP_API_URL is unset', () => {
    delete process.env.REACT_APP_API_URL;
    (process.env as any).NODE_ENV = 'development';
    expect(getBaseURL()).toBe('http://localhost:10000');
  });

  it('falls back to http://localhost:10000 in test mode when REACT_APP_API_URL is unset', () => {
    delete process.env.REACT_APP_API_URL;
    (process.env as any).NODE_ENV = 'test';
    expect(getBaseURL()).toBe('http://localhost:10000');
  });
});
