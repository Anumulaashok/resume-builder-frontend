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
