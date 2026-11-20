import posthog from 'posthog-js';

export const POSTHOG_PROJECT_ID =
  process.env.REACT_APP_POSTHOG_PROJECT_ID || '741313';
export const DEFAULT_POSTHOG_HOST =
  process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com';
export const DEFAULT_POSTHOG_API_KEY =
  process.env.REACT_APP_POSTHOG_KEY ||
  'phc_oEFx2wsdx9f7LREWQUB6uCrwVsMnpdHjmT7Pm9wJHMLP';

export type ClientTelemetryEventName =
  | 'resume_tailored'
  | 'ai_rewrite_accepted'
  | 'ai_rewrite_rejected'
  | 'resume_exported'
  | 'time_to_export';

export interface CapturedClientTelemetryEvent {
  distinctId: string | null;
  event: string;
  properties: Record<string, unknown>;
}

export interface ClientPostHogAdapter {
  init?: (token: string, config: Record<string, unknown>) => void;
  capture?: (event: string, properties?: Record<string, unknown>) => void;
  identify?: (distinctId: string) => void;
  reset?: () => void;
  opt_out_capturing?: () => void;
  opt_in_capturing?: () => void;
}

export const CLIENT_PII_KEY_PATTERN = new RegExp(
  [
    'pass(word)?',
    'token',
    'secret',
    'authorization',
    'apikey',
    '^(full_?)?name$',
    'first_?name',
    'last_?name',
    'user_?name',
    'candidate_?name',
    'recipient_?name',
    'email',
    'phone',
    'mobile',
    'summary',
    'bio',
    'headline',
    '^label$',
    'bullet',
    'highlight',
    'description',
    'jd_?text',
    'company',
    'employer',
    'organization',
    '^role$',
    'target_?role',
    'candidate_?role',
    'contact_?role',
    'position',
    'job_?title',
    '^title$',
    'resume_?title',
    'notes?',
    'next_?action_?note',
    'contacts?',
    'address',
    'street',
    'city',
    'postal_?code',
    'location',
    'salary',
    'compensation',
    'url',
    'website',
    'linkedin',
    'github',
    'pathname',
    'referrer',
    'referring_domain',
    'el_text',
    'elements',
    'prompt',
    'instruction',
    'plain_?text',
    'raw_?text',
    '^content$',
    '^sections$',
    '^basics$',
    'share_?token',
    'slug',
    '^\\$?ip$',
    'ip_?address'
  ].join('|'),
  'i'
);

const POSTHOG_BLOCKED_SYSTEM_KEYS = new Set([
  '$current_url',
  '$pathname',
  '$referrer',
  '$referring_domain',
  '$initial_current_url',
  '$initial_pathname',
  '$initial_referrer',
  '$initial_referring_domain',
  '$el_text',
  '$elements',
  '$ip'
]);

const EMAIL_VALUE_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_VALUE_PATTERN = /^(https?:\/\/|www\.|\/share\/|\/r\/|\/p\/|\/portfolio\/)/i;
const SHARE_QUERY_PATTERN = /[?&]shareToken=/i;
const MONGO_OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_VALUE_PATTERN = /^\+?[\d\s().-]{9,20}$/;

const MAX_SAFE_STRING_LENGTH = 120;
const MAX_CAPTURED_HISTORY = 500;

let initialized = false;
let publicRoutePrivacyActive = false;
let currentIdentifiedUserId: string | null = null;
let customAdapter: ClientPostHogAdapter | null = null;
let lastInitConfig: { apiKey: string; options: Record<string, unknown> } | null =
  null;
const capturedClientHistory: CapturedClientTelemetryEvent[] = [];

function getAdapter(): ClientPostHogAdapter {
  return (customAdapter || (posthog as unknown as ClientPostHogAdapter)) ?? {};
}

function isSafeIdentifierKey(key: string): boolean {
  return /(^|_)(id|project_id)$/i.test(key);
}

function isPiiStringValue(value: string, key: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (EMAIL_VALUE_PATTERN.test(trimmed)) return true;
  if (URL_VALUE_PATTERN.test(trimmed) || SHARE_QUERY_PATTERN.test(trimmed)) {
    return true;
  }
  if (trimmed.length > MAX_SAFE_STRING_LENGTH) {
    return true;
  }
  if (
    !isSafeIdentifierKey(key) &&
    !MONGO_OBJECT_ID_PATTERN.test(trimmed) &&
    !UUID_PATTERN.test(trimmed) &&
    PHONE_VALUE_PATTERN.test(trimmed) &&
    /\d{7,}/.test(trimmed.replace(/\D/g, ''))
  ) {
    return true;
  }
  return false;
}

function sanitizeClientValue(
  value: unknown,
  key: string,
  ancestors: WeakSet<object>
): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    if (isPiiStringValue(value, key)) {
      return undefined;
    }
    return value.trim();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  if (typeof value !== 'object') {
    return undefined;
  }
  if (ancestors.has(value as object)) {
    return undefined;
  }
  ancestors.add(value as object);
  try {
    if (Array.isArray(value)) {
      return value
        .map((item) => sanitizeClientValue(item, key, ancestors))
        .filter((item) => item !== undefined);
    }

    const output: Record<string, unknown> = {};
    for (const childKey of Object.keys(value as Record<string, unknown>)) {
      if (childKey === '__proto__' || childKey === 'constructor') {
        continue;
      }
      if (POSTHOG_BLOCKED_SYSTEM_KEYS.has(childKey)) {
        continue;
      }
      const normalizedKey = childKey.replace(/^\$+/, '');
      if (CLIENT_PII_KEY_PATTERN.test(normalizedKey)) {
        continue;
      }
      const rawChild = (value as Record<string, unknown>)[childKey];
      const cleanChild = sanitizeClientValue(rawChild, childKey, ancestors);
      if (cleanChild !== undefined) {
        output[childKey] = cleanChild;
      }
    }
    return output;
  } finally {
    ancestors.delete(value as object);
  }
}

export function sanitizeClientTelemetryProperties(
  properties: Record<string, unknown> = {}
): Record<string, unknown> {
  const cleaned = sanitizeClientValue(properties, 'root', new WeakSet<object>());
  if (!cleaned || typeof cleaned !== 'object' || Array.isArray(cleaned)) {
    return {};
  }
  return cleaned as Record<string, unknown>;
}

export function isPublicRouteLocation(
  loc?: { pathname?: string; search?: string; hash?: string } | null
): boolean {
  const target =
    loc ?? (typeof window !== 'undefined' ? window.location : null);
  if (!target) return false;

  const pathname = target.pathname || '';
  const search = target.search || '';
  const hash = target.hash || '';

  if (
    pathname.startsWith('/share/') ||
    pathname.startsWith('/r/') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/portfolio/')
  ) {
    return true;
  }
  if (
    hash.startsWith('#/r/') ||
    hash.startsWith('#/p/') ||
    hash.startsWith('#/portfolio/')
  ) {
    return true;
  }
  if (/[?&]shareToken=/i.test(search)) {
    return true;
  }
  return false;
}

export function initTelemetry(): void {
  if (initialized) {
    return;
  }

  try {
    const publicRoute = isPublicRouteLocation();
    publicRoutePrivacyActive = publicRoute;

    const options: Record<string, unknown> = {
      api_host: DEFAULT_POSTHOG_HOST,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_dead_clicks: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      opt_out_useragent_filter: true,
      request_batching: false,
      persistence: 'memory',
      opt_out_capturing_by_default: publicRoute,
      property_denylist: Array.from(POSTHOG_BLOCKED_SYSTEM_KEYS),
      before_send: (captureResult: Record<string, unknown> | null) => {
        if (!captureResult) return null;
        if (publicRoutePrivacyActive || isPublicRouteLocation()) {
          return null;
        }
        const rawProps =
          (captureResult.properties as Record<string, unknown> | undefined) || {};
        const preservedSdkToken =
          rawProps.token === DEFAULT_POSTHOG_API_KEY
            ? DEFAULT_POSTHOG_API_KEY
            : undefined;
        const preservedDistinctId =
          typeof rawProps.distinct_id === 'string' &&
          !EMAIL_VALUE_PATTERN.test(rawProps.distinct_id)
            ? rawProps.distinct_id
            : undefined;
        const cleanedProps = sanitizeClientTelemetryProperties(rawProps);
        if (preservedSdkToken) {
          cleanedProps.token = preservedSdkToken;
        }
        if (preservedDistinctId) {
          cleanedProps.distinct_id = preservedDistinctId;
        }
        cleanedProps.$ip = null;
        const nextResult: Record<string, unknown> = {
          ...captureResult,
          properties: cleanedProps
        };
        if (nextResult.$set && typeof nextResult.$set === 'object') {
          nextResult.$set = sanitizeClientTelemetryProperties(
            nextResult.$set as Record<string, unknown>
          );
        }
        if (nextResult.$set_once && typeof nextResult.$set_once === 'object') {
          nextResult.$set_once = sanitizeClientTelemetryProperties(
            nextResult.$set_once as Record<string, unknown>
          );
        }
        return nextResult;
      }
    };

    lastInitConfig = {
      apiKey: DEFAULT_POSTHOG_API_KEY,
      options
    };

    const isTestEnv =
      process.env.NODE_ENV === 'test' &&
      process.env.REACT_APP_POSTHOG_ENABLE_IN_TEST !== 'true' &&
      !customAdapter;

    if (!isTestEnv) {
      getAdapter().init?.(DEFAULT_POSTHOG_API_KEY, options);
    }

    initialized = true;
  } catch {
    initialized = true;
  }
}

export function setPublicRoutePrivacyMode(isPublic: boolean): void {
  publicRoutePrivacyActive = isPublic;
  try {
    const adapter = getAdapter();
    if (isPublic) {
      adapter.opt_out_capturing?.();
    } else {
      adapter.opt_in_capturing?.();
    }
  } catch {
    // Non-blocking
  }
}

export function identifyTelemetryUser(rawUserId?: string | null): void {
  try {
    const trimmed = typeof rawUserId === 'string' ? rawUserId.trim() : '';
    if (!trimmed || EMAIL_VALUE_PATTERN.test(trimmed) || /\s/.test(trimmed)) {
      return;
    }
    if (publicRoutePrivacyActive || isPublicRouteLocation()) {
      return;
    }
    initTelemetry();
    if (currentIdentifiedUserId === trimmed) {
      return;
    }
    currentIdentifiedUserId = trimmed;
    getAdapter().identify?.(trimmed);
  } catch {
    // Non-blocking
  }
}

export function resetTelemetryUser(): void {
  try {
    currentIdentifiedUserId = null;
    getAdapter().reset?.();
  } catch {
    // Non-blocking
  }
}

/**
 * Non-blocking client-side PostHog capture.
 * Never throws or awaits network I/O so UI mutations and exports are never delayed.
 */
export function captureClientEvent(
  event: ClientTelemetryEventName | string,
  rawProperties: Record<string, unknown> = {}
): void {
  try {
    if (publicRoutePrivacyActive || isPublicRouteLocation()) {
      return;
    }

    initTelemetry();
    const sanitized = sanitizeClientTelemetryProperties(rawProperties);
    const properties: Record<string, unknown> = {
      ...sanitized,
      telemetry_source: 'frontend',
      posthog_project_id: POSTHOG_PROJECT_ID
    };

    if (capturedClientHistory.length >= MAX_CAPTURED_HISTORY) {
      capturedClientHistory.shift();
    }
    capturedClientHistory.push({
      distinctId: currentIdentifiedUserId,
      event,
      properties
    });

    const isTestEnv =
      process.env.NODE_ENV === 'test' &&
      process.env.REACT_APP_POSTHOG_ENABLE_IN_TEST !== 'true' &&
      !customAdapter;

    if (!isTestEnv) {
      getAdapter().capture?.(event, properties);
    }
  } catch {
    // Never block caller
  }
}

export function setTelemetryAdapterForTests(
  adapter: ClientPostHogAdapter | null
): void {
  customAdapter = adapter;
  initialized = false;
}

export function getTelemetryInitConfigForTests(): {
  apiKey: string;
  options: Record<string, unknown>;
} | null {
  return lastInitConfig;
}

export function getCapturedClientEventsForTests(): CapturedClientTelemetryEvent[] {
  return [...capturedClientHistory];
}

export function getIdentifiedUserIdForTests(): string | null {
  return currentIdentifiedUserId;
}

export function resetTelemetryStateForTests(): void {
  customAdapter = null;
  initialized = false;
  publicRoutePrivacyActive = false;
  currentIdentifiedUserId = null;
  lastInitConfig = null;
  capturedClientHistory.length = 0;
}
