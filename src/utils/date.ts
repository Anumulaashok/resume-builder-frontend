import { dateFields } from '../types/resume';

export function formatResumeDate(value?: string | Partial<dateFields>): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    const month = (value.month ?? '').toString().trim();
    const year = (value.year ?? '').toString().trim();
    return `${month} ${year}`.trim();
  }

  return '';
}
