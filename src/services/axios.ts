import axios, { isAxiosError } from 'axios';
import { authEventBus } from '../utils/authEventBus';
import { getStoredUser, getToken, removeToken } from '../utils/token';

/**
 * Resolves the base URL for API requests.
 * Supports:
 * - Explicit process.env.REACT_APP_API_URL if configured.
 * - Relative /api base path (empty string '') when using Netlify proxy in production.
 * - Explicit fallback to http://localhost:10000 for local development.
 */
export const getBaseURL = (): string => {
  if (process.env.REACT_APP_API_URL !== undefined) {
    const raw = process.env.REACT_APP_API_URL.trim();
    if (raw === '' || raw === '/api' || raw === '/api/') {
      return '';
    }
    // Remove trailing slash or trailing /api since endpoints are prefixed with /api
    return raw.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  // When deployed in production without an explicit API URL, use relative base path (Netlify proxy rewrite)
  if (process.env.NODE_ENV === 'production') {
    return '';
  }

  // Explicit fallback to local backend for development/testing
  return 'http://localhost:10000';
};

const baseURL = getBaseURL();

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
export const AUTH_LOGOUT_EVENT = 'auth:logout';

export interface ValidationFieldError {
  field?: string;
  path?: string;
  param?: string;
  msg?: string;
  message?: string;
  location?: string;
  type?: string;
}

export type NormalizedApiError = Error & {
  status?: number;
  isUnauthorized?: boolean;
  errors?: ValidationFieldError[];
  fieldErrors?: Record<string, string>;
};

const FIELD_FALLBACK_MESSAGES: Record<string, string> = {
  title: 'Resume title is required',
  'content.basics.name': 'Full name is required',
  'basics.name': 'Full name is required',
  'content.basics.email': 'Please enter a valid email address',
  'basics.email': 'Please enter a valid email address',
};

function resolveReadableFieldMessage(rawMsg: unknown, field?: string): string {
  const trimmed = typeof rawMsg === 'string' ? rawMsg.trim() : '';
  if (trimmed && trimmed.toLowerCase() !== 'invalid value') {
    return trimmed;
  }
  if (field && FIELD_FALLBACK_MESSAGES[field]) {
    return FIELD_FALLBACK_MESSAGES[field];
  }
  if (field) {
    return `Invalid ${field}`;
  }
  return 'Invalid input';
}

function extractValidationDetails(rawErrors: unknown): {
  errors?: ValidationFieldError[];
  fieldErrors?: Record<string, string>;
  summary?: string;
} {
  if (!Array.isArray(rawErrors) || rawErrors.length === 0) {
    return {};
  }

  const normalizedList: ValidationFieldError[] = [];
  const fieldErrors: Record<string, string> = {};
  const summaryMessages: string[] = [];

  for (const entry of rawErrors) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const rawField =
      (typeof item.field === 'string' && item.field.trim()) ||
      (typeof item.path === 'string' && item.path.trim()) ||
      (typeof item.param === 'string' && item.param.trim()) ||
      undefined;
    const readable = resolveReadableFieldMessage(
      item.message ?? item.msg,
      rawField
    );

    normalizedList.push({
      ...(typeof item.type === 'string' ? { type: item.type } : {}),
      ...(typeof item.location === 'string' ? { location: item.location } : {}),
      ...(rawField ? { field: rawField, path: rawField } : {}),
      msg: readable,
      message: readable,
    });

    if (rawField) {
      if (!fieldErrors[rawField]) {
        fieldErrors[rawField] = readable;
        if (!summaryMessages.includes(readable)) {
          summaryMessages.push(readable);
        }
      }
    } else if (!summaryMessages.includes(readable)) {
      summaryMessages.push(readable);
    }
  }

  if (normalizedList.length === 0) {
    return {};
  }

  return {
    errors: normalizedList,
    fieldErrors,
    summary: summaryMessages.join('; '),
  };
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    let blobMessage: string | undefined;
    let blobErrors: unknown;
    if (
      isAxiosError(error) &&
      typeof Blob !== 'undefined' &&
      error.response?.data instanceof Blob &&
      typeof error.response.data.text === 'function'
    ) {
      try {
        const rawText = await error.response.data.text();
        const parsed = JSON.parse(rawText);
        if (parsed && typeof parsed.message === 'string') {
          blobMessage = parsed.message;
        }
        if (parsed && Array.isArray(parsed.errors)) {
          blobErrors = parsed.errors;
        }
      } catch {
        // Ignore non-JSON blob error bodies
      }
    }

    const rawErrors = isAxiosError(error)
      ? blobErrors ?? error.response?.data?.errors
      : error?.errors;
    const validationDetails = extractValidationDetails(rawErrors);

    const rawServerMessage = isAxiosError(error)
      ? blobMessage || error.response?.data?.message
      : undefined;
    const usableServerMessage =
      typeof rawServerMessage === 'string' &&
      rawServerMessage.trim() &&
      rawServerMessage.trim().toLowerCase() !== 'invalid value'
        ? rawServerMessage.trim()
        : undefined;

    const message = isAxiosError(error)
      ? usableServerMessage ||
        validationDetails.summary ||
        rawServerMessage ||
        error.message ||
        'Request failed'
      : validationDetails.summary || error?.message || 'Request failed';

    // A 401 from login/register means wrong credentials, not an expired session.
    const requestUrl = isAxiosError(error) ? error.config?.url || '' : '';
    const isAuthRequest =
      requestUrl.includes('/api/auth/login') ||
      requestUrl.includes('/api/auth/register');
    const isPublicShareRequest =
      requestUrl.includes('/api/resumes/share/') ||
      requestUrl.includes('/api/public/r/');

    const isExpiredSession =
      isAxiosError(error) &&
      error.response?.status === 401 &&
      !isAuthRequest &&
      !isPublicShareRequest;

    if (isExpiredSession) {
      const previousUser = getStoredUser();
      removeToken();
      window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
      authEventBus.emitSessionExpired({
        email: previousUser?.email,
        message,
        url: requestUrl,
      });
    }

    const normalizedError = new Error(message) as NormalizedApiError;
    if (isAxiosError(error) && error.response?.status !== undefined) {
      normalizedError.status = error.response.status;
    }
    if (validationDetails.errors) {
      normalizedError.errors = validationDetails.errors;
    }
    if (validationDetails.fieldErrors) {
      normalizedError.fieldErrors = validationDetails.fieldErrors;
    }
    if (isExpiredSession) {
      normalizedError.isUnauthorized = true;
    }

    return Promise.reject(normalizedError);
  }
);


export default axiosInstance;
