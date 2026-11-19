import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import App from '../App';
import ResumeEditor from '../components/ResumeEditor';
import axiosInstance from '../services/axios';
import { authEventBus } from '../utils/authEventBus';
import { getToken, setStoredUser, setToken } from '../utils/token';
import { IResume, SectionType } from '../types/resume';

jest.mock('react-resizable-panels', () => ({
  PanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  Panel: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  PanelResizeHandle: ({ children, ...props }: any) => (
    <div role="separator" {...props}>
      {children}
    </div>
  ),
}));

const sampleResume: IResume = {
  _id: 'resume-auth-1',
  title: 'Staff Distributed Systems Resume',
  summary: 'Original persisted summary.',
  content: {
    basics: {
      name: 'Elena Rostova',
      label: 'Staff Backend Engineer',
      email: 'elena@example.com',
      phone: '555-0142',
      summary: 'Original persisted summary.',
      location: {
        city: 'Seattle',
        countryCode: 'US',
      },
    },
    sections: [
      {
        id: 'sec-work-1',
        type: SectionType.WORK,
        title: 'Professional Experience',
        content: [
          {
            id: 'work-1',
            company: 'CloudScale',
            position: 'Staff Engineer',
            startDate: 'Jan 2022',
            current: true,
            description: 'Architected multi-region consensus engine.',
          },
        ],
      },
    ],
    sectionOrder: ['sec-work-1'],
  },
};

function makeAxiosResponse(
  config: InternalAxiosRequestConfig,
  status: number,
  data: any
) {
  return {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config: { ...config, headers: new AxiosHeaders() },
    data,
  };
}

function rejectAxios(
  config: InternalAxiosRequestConfig,
  status: number,
  message: string
) {
  return Promise.reject(
    new AxiosError(
      message,
      String(status),
      config,
      null,
      makeAxiosResponse(config, status, { message })
    )
  );
}

describe('Global Auth Event Bus & In-Place Re-Authentication Flow', () => {
  const originalAdapter = axiosInstance.defaults.adapter;
  let toastSuccessSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
    toastSuccessSpy = jest
      .spyOn(toast, 'success')
      .mockImplementation(() => 'toast-ok');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    (window as any).ResizeObserver = class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    axiosInstance.defaults.adapter = originalAdapter;
    jest.clearAllTimers();
    jest.useRealTimers();
    toastSuccessSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('broadcasts auth:session-expired with user email hint on 401 for protected endpoints and ignores auth/public endpoints', async () => {
    setToken('expired-jwt');
    setStoredUser({
      id: 'u-1',
      name: 'Elena Rostova',
      email: 'elena@example.com',
    });

    const expiredEvents: any[] = [];
    const unsubscribe = authEventBus.onSessionExpired((detail) => {
      expiredEvents.push(detail);
    });

    await expect(
      axiosInstance.put('/api/resumes/resume-auth-1', sampleResume, {
        adapter: (config) => rejectAxios(config, 401, 'Token expired'),
      })
    ).rejects.toMatchObject({
      message: 'Token expired',
      status: 401,
      isUnauthorized: true,
    });

    expect(getToken()).toBeNull();
    expect(expiredEvents).toHaveLength(1);
    expect(expiredEvents[0]).toMatchObject({
      email: 'elena@example.com',
      message: 'Token expired',
      url: '/api/resumes/resume-auth-1',
    });

    // 401s on login, register, and public share do NOT emit session-expired
    setToken('active-jwt');
    await expect(
      axiosInstance.post(
        '/api/auth/login',
        { email: 'elena@example.com', password: 'wrong' },
        { adapter: (config) => rejectAxios(config, 401, 'Invalid credentials') }
      )
    ).rejects.toThrow('Invalid credentials');

    await expect(
      axiosInstance.post(
        '/api/auth/register',
        { name: 'Elena', email: 'elena@example.com', password: 'wrong' },
        { adapter: (config) => rejectAxios(config, 401, 'Unauthorized') }
      )
    ).rejects.toThrow('Unauthorized');

    await expect(
      axiosInstance.get('/api/resumes/share/public-token', {
        adapter: (config) => rejectAxios(config, 401, 'Expired share'),
      })
    ).rejects.toThrow('Expired share');

    expect(expiredEvents).toHaveLength(1);
    expect(getToken()).toBe('active-jwt');

    unsubscribe();
  });

  it('opens in-place ReauthModal within 500ms on auto-save 401 without unmounting App/ResumeEditor, updates token on login, and automatically retries pending save with success toast', async () => {
    setToken('expired-session-token');
    setStoredUser({
      id: 'u-1',
      name: 'Elena Rostova',
      email: 'elena@example.com',
    });

    const putPayloads: Array<{ authHeader?: string; body: any }> = [];
    let shouldFailSaveWith401 = true;

    axiosInstance.defaults.adapter = async (config) => {
      const url = config.url || '';
      const method = (config.method || 'get').toLowerCase();

      if (method === 'get' && url === '/api/resumes') {
        return makeAxiosResponse(config, 200, {
          success: true,
          data: [{ ...sampleResume, id: 'resume-auth-1', updatedAt: new Date().toISOString() }],
        });
      }

      if (method === 'put' && url === '/api/resumes/resume-auth-1') {
        putPayloads.push({
          authHeader: config.headers?.Authorization as string | undefined,
          body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
        });
        if (shouldFailSaveWith401) {
          shouldFailSaveWith401 = false;
          return rejectAxios(config, 401, 'Session token expired');
        }
        return makeAxiosResponse(config, 200, {
          _id: 'resume-auth-1',
          ...sampleResume,
        });
      }

      if (method === 'post' && url === '/api/auth/login') {
        return makeAxiosResponse(config, 200, {
          success: true,
          message: 'Welcome back',
          token: 'fresh-jwt-token-999',
          user: {
            id: 'u-1',
            name: 'Elena Rostova',
            email: 'elena@example.com',
          },
        });
      }

      return makeAxiosResponse(config, 200, {});
    };

    render(<App />);

    // Open resume in ResumeEditor from HomePage list
    const editButton = await screen.findByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    const summaryTextarea = screen.getByLabelText(
      'Professional Summary'
    ) as HTMLTextAreaElement;
    const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement;

    // Make uncommitted edits in the editor
    fireEvent.change(nameInput, {
      target: { value: 'Elena Rostova, Ph.D.' },
    });
    fireEvent.change(summaryTextarea, {
      target: {
        value: 'Uncommitted high-impact summary written right before token expiry.',
      },
    });

    // Trigger 2000ms auto-save debounce -> receives HTTP 401
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Modal opens immediately (< 500ms), only 1 dialog is mounted, and editor is NOT unmounted
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
    const modal = screen.getByTestId('reauth-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('Session Expired')).toBeInTheDocument();

    // Verify local uncommitted state in ResumeEditor is completely intact
    expect((screen.getByLabelText('Full Name') as HTMLInputElement).value).toBe(
      'Elena Rostova, Ph.D.'
    );
    expect(
      (screen.getByLabelText('Professional Summary') as HTMLTextAreaElement).value
    ).toBe('Uncommitted high-impact summary written right before token expiry.');

    // Pre-populated email from stored user; enter password and submit
    const modalEmailInput = within(modal).getByLabelText(
      /Email address/i
    ) as HTMLInputElement;
    expect(modalEmailInput.value).toBe('elena@example.com');

    const modalPasswordInput = within(modal).getByLabelText(/^Password$/i);
    fireEvent.change(modalPasswordInput, {
      target: { value: 'StrongPass!2026' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: /^Sign in$/i }));

    // Modal closes, token is updated, queued save retries automatically with fresh Bearer token
    await waitFor(() => {
      expect(screen.queryByTestId('reauth-modal')).not.toBeInTheDocument();
    });

    expect(getToken()).toBe('fresh-jwt-token-999');
    expect(putPayloads).toHaveLength(2);
    expect(putPayloads[1].authHeader).toBe('Bearer fresh-jwt-token-999');
    expect(putPayloads[1].body).toMatchObject({
      summary: 'Uncommitted high-impact summary written right before token expiry.',
      content: expect.objectContaining({
        basics: expect.objectContaining({
          name: 'Elena Rostova, Ph.D.',
          summary:
            'Uncommitted high-impact summary written right before token expiry.',
        }),
      }),
    });

    // Toolbar reflects saved state, success toast was shown, and user remains in editor
    await waitFor(() => {
      expect(screen.getByTestId('save-status-indicator')).toHaveTextContent(
        'All changes saved'
      );
    });
    expect(toastSuccessSpy).toHaveBeenCalledWith('Resume saved successfully!');
    expect(
      (screen.getByLabelText('Professional Summary') as HTMLTextAreaElement).value
    ).toBe('Uncommitted high-impact summary written right before token expiry.');
  });

  it('displays persistent unsaved changes warning banner and halts background network requests when modal is dismissed, then saves upon later sign-in', async () => {
    setToken('expired-token');
    let putCallCount = 0;
    let shouldReturn401 = true;

    axiosInstance.defaults.adapter = async (config) => {
      const url = config.url || '';
      const method = (config.method || 'get').toLowerCase();

      if (method === 'put' && url === '/api/resumes/resume-auth-1') {
        putCallCount += 1;
        if (shouldReturn401) {
          shouldReturn401 = false;
          return rejectAxios(config, 401, 'Unauthorized');
        }
        return makeAxiosResponse(config, 200, {
          _id: 'resume-auth-1',
          ...sampleResume,
        });
      }

      if (method === 'post' && url === '/api/auth/login') {
        return makeAxiosResponse(config, 200, {
          success: true,
          message: 'Authenticated',
          token: 'renewed-token-777',
          user: {
            id: 'u-1',
            name: 'Elena Rostova',
            email: 'elena@example.com',
          },
        });
      }

      return makeAxiosResponse(config, 200, {});
    };

    render(<ResumeEditor initialResume={sampleResume} onBack={jest.fn()} />);

    const summaryTextarea = screen.getByLabelText('Professional Summary');
    fireEvent.change(summaryTextarea, {
      target: { value: 'Draft edit before dismissing modal' },
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(putCallCount).toBe(1);
    expect(screen.getByTestId('reauth-modal')).toBeInTheDocument();
    expect(
      screen.queryByTestId('unsaved-changes-warning-banner')
    ).not.toBeInTheDocument();

    // User cancels / closes the modal without logging in
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));

    expect(screen.queryByTestId('reauth-modal')).not.toBeInTheDocument();

    // Persistent unsaved changes warning banner is displayed
    const warningBanner = screen.getByTestId('unsaved-changes-warning-banner');
    expect(warningBanner).toBeInTheDocument();
    expect(warningBanner).toHaveTextContent(/Unsaved changes/i);

    // User continues typing multiple times — background auto-save MUST remain halted
    fireEvent.change(summaryTextarea, {
      target: { value: 'Continued offline editing paragraph 1' },
    });
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    fireEvent.change(summaryTextarea, {
      target: { value: 'Continued offline editing paragraph 2' },
    });
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(putCallCount).toBe(1);
    expect(screen.getByTestId('unsaved-changes-warning-banner')).toBeInTheDocument();

    // User clicks "Sign in to save" in the persistent banner to re-open modal
    fireEvent.click(screen.getByTestId('reopen-reauth-btn'));
    const reopenedModal = screen.getByTestId('reauth-modal');
    expect(reopenedModal).toBeInTheDocument();

    fireEvent.change(within(reopenedModal).getByLabelText(/Email address/i), {
      target: { value: 'elena@example.com' },
    });
    fireEvent.change(within(reopenedModal).getByLabelText(/^Password$/i), {
      target: { value: 'ValidSecret!99' },
    });
    fireEvent.click(
      within(reopenedModal).getByRole('button', { name: /^Sign in$/i })
    );

    await waitFor(() => {
      expect(screen.queryByTestId('reauth-modal')).not.toBeInTheDocument();
    });
    expect(
      screen.queryByTestId('unsaved-changes-warning-banner')
    ).not.toBeInTheDocument();
    expect(putCallCount).toBe(2);

    await waitFor(() => {
      expect(screen.getByTestId('save-status-indicator')).toHaveTextContent(
        'All changes saved'
      );
    });
    expect(toastSuccessSpy).toHaveBeenCalledWith('Resume saved successfully!');
  });

  it('validates inputs, displays warning on invalid credentials, prevents infinite auto-save loops, and never logs credentials', async () => {
    setToken('expired-token');
    const secretPassword = 'MySuperSecretPassword#42';
    let putCallCount = 0;
    let loginCallCount = 0;

    axiosInstance.defaults.adapter = async (config) => {
      const url = config.url || '';
      const method = (config.method || 'get').toLowerCase();

      if (method === 'put' && url === '/api/resumes/resume-auth-1') {
        putCallCount += 1;
        return rejectAxios(config, 401, 'Session expired');
      }

      if (method === 'post' && url === '/api/auth/login') {
        loginCallCount += 1;
        return rejectAxios(config, 401, 'Invalid email or password');
      }

      return makeAxiosResponse(config, 200, {});
    };

    render(<ResumeEditor initialResume={sampleResume} onBack={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: 'Elena Updated' },
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(putCallCount).toBe(1);
    const modal = screen.getByTestId('reauth-modal');

    // 1. Empty fields validation
    const emailInput = within(modal).getByLabelText(/Email address/i);
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.click(within(modal).getByRole('button', { name: /^Sign in$/i }));

    expect(screen.getByTestId('reauth-error-alert')).toHaveTextContent(
      /Please enter both your email address and password/i
    );
    expect(loginCallCount).toBe(0);

    // 2. Invalid email format validation
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.change(within(modal).getByLabelText(/^Password$/i), {
      target: { value: secretPassword },
    });
    fireEvent.click(within(modal).getByRole('button', { name: /^Sign in$/i }));

    expect(screen.getByTestId('reauth-error-alert')).toHaveTextContent(
      /Please enter a valid email address/i
    );
    expect(loginCallCount).toBe(0);

    // 3. Invalid credentials from server (401 on /api/auth/login)
    fireEvent.change(emailInput, { target: { value: 'elena@example.com' } });
    fireEvent.click(within(modal).getByRole('button', { name: /^Sign in$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('reauth-error-alert')).toHaveTextContent(
        /Invalid email or password/i
      );
    });
    expect(loginCallCount).toBe(1);

    // Modal stays open, local edits remain intact, and NO background retry loop occurs
    expect(screen.getByTestId('reauth-modal')).toBeInTheDocument();
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    expect(putCallCount).toBe(1);
    expect((screen.getByLabelText('Full Name') as HTMLInputElement).value).toBe(
      'Elena Updated'
    );

    // Verify credentials never appeared in console logs/warnings/errors
    const allConsoleOutput = [
      ...consoleErrorSpy.mock.calls.flat(),
      ...consoleWarnSpy.mock.calls.flat(),
      ...consoleLogSpy.mock.calls.flat(),
    ]
      .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
      .join(' ');
    expect(allConsoleOutput).not.toContain(secretPassword);
  });
});
