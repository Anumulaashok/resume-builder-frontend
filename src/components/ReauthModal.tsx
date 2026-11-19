import React, { useEffect, useRef, useState } from 'react';
import {
  EnvelopeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { authService, AuthUser } from '../services/auth.service';
import { authEventBus } from '../utils/authEventBus';
import { getToken, setStoredUser, setToken } from '../utils/token';

export interface ReauthModalProps {
  isOpen: boolean;
  initialEmail?: string;
  onSuccess?: (user?: AuthUser) => void;
  onDismiss: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ReauthModal: React.FC<ReauthModalProps> = ({
  isOpen,
  initialEmail = '',
  onSuccess,
  onDismiss,
}) => {
  const [email, setEmail] = useState<string>(initialEmail);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setErrorMessage(null);
      if (initialEmail) {
        setEmail((prev) => prev || initialEmail);
      }
      const focusTarget = initialEmail
        ? passwordInputRef.current
        : emailInputRef.current;
      focusTarget?.focus();
    } else {
      setPassword('');
      setShowPassword(false);
      setErrorMessage(null);
    }
  }, [isOpen, initialEmail]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        event.stopPropagation();
        setPassword('');
        setErrorMessage(null);
        onDismiss();
        authEventBus.emitReauthDismissed();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading, onDismiss]);

  if (!isOpen) {
    return null;
  }

  const handleDismissClick = () => {
    if (loading) return;
    setPassword('');
    setErrorMessage(null);
    onDismiss();
    authEventBus.emitReauthDismissed();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login({
        email: trimmedEmail,
        password,
      });

      if (
        !response ||
        response.success === false ||
        (!response.token && response.success !== true && !getToken())
      ) {
        throw new Error(
          response?.message ||
            'Authentication failed. Please check your credentials and try again.'
        );
      }

      if (response.token && getToken() !== response.token) {
        setToken(response.token);
      }
      if (response.user) {
        setStoredUser(response.user);
      }

      setPassword('');
      setErrorMessage(null);
      onSuccess?.(response.user);
      authEventBus.emitReauthenticated({ user: response.user });
    } catch (err) {
      const rawMessage =
        err instanceof Error && err.message
          ? err.message
          : 'Re-authentication failed. Please check your credentials and try again.';
      // Ensure entered password never appears in displayed error messages
      const safeMessage =
        password && rawMessage.includes(password)
          ? 'Re-authentication failed. Please check your credentials and try again.'
          : rawMessage;
      setErrorMessage(safeMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="reauth-modal-backdrop"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-sm print:hidden"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reauth-modal-title"
        aria-describedby="reauth-modal-description"
        data-testid="reauth-modal"
        className="w-full max-w-md rounded-panel border border-neutral-200 bg-white p-6 sm:p-7 shadow-modal text-neutral-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-amber-100 text-amber-700">
              <LockClosedIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="reauth-modal-title"
                className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900"
              >
                Session Expired
              </h2>
              <p
                id="reauth-modal-description"
                className="mt-0.5 text-xs sm:text-sm text-neutral-600"
              >
                Sign in to save your unsaved changes without leaving the editor.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismissClick}
            disabled={loading}
            aria-label="Close re-authentication dialog"
            title="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 focus-ring transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            data-testid="reauth-error-alert"
            className="mt-4 flex items-start gap-2.5 rounded-control border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
          >
            <ExclamationTriangleIcon
              className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium">{errorMessage}</p>
              <p className="mt-0.5 text-xs text-red-700">
                Your unsaved edits are still preserved in memory.
              </p>
            </div>
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="reauth-email"
              className="block text-sm font-medium text-neutral-700"
            >
              Email address
            </label>
            <div className="mt-1.5 relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <EnvelopeIcon
                  className="h-5 w-5 text-neutral-400"
                  aria-hidden="true"
                />
              </div>
              <input
                ref={emailInputRef}
                id="reauth-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={loading}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="block w-full appearance-none rounded-control border border-neutral-300 py-2.5 pl-10 pr-3 text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm transition-colors disabled:bg-neutral-50"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reauth-password"
              className="block text-sm font-medium text-neutral-700"
            >
              Password
            </label>
            <div className="mt-1.5 relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <LockClosedIcon
                  className="h-5 w-5 text-neutral-400"
                  aria-hidden="true"
                />
              </div>
              <input
                ref={passwordInputRef}
                id="reauth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                disabled={loading}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="block w-full appearance-none rounded-control border border-neutral-300 py-2.5 pl-10 pr-10 text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm transition-colors disabled:bg-neutral-50"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={loading}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-1.5 my-auto flex h-8 w-8 items-center justify-center rounded-control text-neutral-400 hover:text-neutral-600 focus-ring transition-colors"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <EyeIcon className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleDismissClick}
              disabled={loading}
              className="w-full sm:w-auto h-10 px-4 rounded-control border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus-ring transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto h-10 px-5 inline-flex items-center justify-center rounded-control border border-transparent bg-primary-600 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReauthModal;
