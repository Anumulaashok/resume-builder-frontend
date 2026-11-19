import { dateFields } from '../types/resume';

export type ResumeDateInput =
  | string
  | number
  | Date
  | Partial<dateFields>
  | Record<string, unknown>
  | null
  | undefined;

export function formatResumeDate(value?: ResumeDateInput | unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const rawMonth = record.month;
    const rawYear = record.year;
    const month =
      typeof rawMonth === 'string' || typeof rawMonth === 'number'
        ? String(rawMonth).trim()
        : '';
    const year =
      typeof rawYear === 'string' || typeof rawYear === 'number'
        ? String(rawYear).trim()
        : '';
    return `${month} ${year}`.trim();
  }

  return '';
}

export const formatDate = formatResumeDate;

export function formatRelativeTime(
  value?: string | number | Date | null,
  nowMs: number = Date.now()
): string {
  if (value === null || value === undefined || value === '') {
    return 'Unknown time';
  }

  const parsed = value instanceof Date ? value : new Date(value);
  const timestamp = parsed.getTime();
  if (Number.isNaN(timestamp)) {
    return 'Unknown time';
  }

  const diffSeconds = Math.max(0, Math.floor((nowMs - timestamp) / 1000));

  if (diffSeconds < 45) {
    return 'Just now';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 30) {
    return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffDays < 365) {
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
}

export function formatSnapshotTimestamp(value?: string | number | Date | null): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
