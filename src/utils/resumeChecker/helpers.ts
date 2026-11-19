import type { dateFields, ISection } from '../../types/resume';
import {
  EXTRA_TRACKED_VERBS,
  STOPWORDS,
  STRONG_VERB_LOOKUP,
} from './dictionaries';

export type CheckerSectionKind = 'work' | 'skills' | 'education' | 'projects' | 'other';

const WORK_TOKENS = new Set([
  'workitem',
  'work',
  'experience',
  'workexperience',
  'work_experience',
  'professional_experience',
  'professional experience',
  'work experience',
  'employment',
]);

const SKILL_TOKENS = new Set([
  'skillitem',
  'technicalskillitem',
  'softskillitem',
  'skill',
  'skills',
  'core skills',
  'technicalskills',
  'technical_skills',
  'technical skills',
  'softskills',
  'soft_skills',
  'soft skills',
]);

const EDUCATION_TOKENS = new Set(['educationitem', 'education', 'academics']);
const PROJECT_TOKENS = new Set(['projectitem', 'project', 'projects', 'featured projects']);

export function getCheckerSectionKind(section: ISection): CheckerSectionKind {
  const candidates = [section.type, section.id, section.title].map((v) =>
    (v ?? '').toString().trim().toLowerCase()
  );
  for (let i = 0; i < candidates.length; i += 1) {
    const token = candidates[i];
    if (!token) continue;
    if (WORK_TOKENS.has(token)) return 'work';
    if (SKILL_TOKENS.has(token)) return 'skills';
    if (EDUCATION_TOKENS.has(token)) return 'education';
    if (PROJECT_TOKENS.has(token)) return 'projects';
  }
  return 'other';
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed
    .split(/\s+/)
    .map((t) => t.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''))
    .filter((t) => t.length > 0).length;
}

export function stripLeadingBulletMarker(line: string): string {
  return line
    .trim()
    .replace(/^(?:[•●▪◦‣⁃\-*–—]+|\d+[.)])\s+/, '')
    .trim();
}

/**
 * Extracts clean bullet strings from a WorkItem (combining `description` lines
 * and `highlights[]` without duplicating identical entries).
 */
export function extractExperienceBullets(item: Record<string, any>): string[] {
  const rawBullets: string[] = [];

  if (typeof item.description === 'string' && item.description.trim()) {
    const lines = item.description
      .split(/\r?\n/)
      .map(stripLeadingBulletMarker)
      .filter((line) => line.length > 0);
    lines.forEach((line) => rawBullets.push(line));
  }

  if (Array.isArray(item.highlights)) {
    item.highlights.forEach((entry: unknown) => {
      if (typeof entry === 'string') {
        const cleaned = stripLeadingBulletMarker(entry);
        if (cleaned) {
          rawBullets.push(cleaned);
        }
      }
    });
  }

  return rawBullets;
}

export function normalizeBulletForDedup(bullet: string): string {
  return bullet
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function bulletHasMetric(bullet: string): boolean {
  // Matches percentages, currency figures, multipliers (2x, 10x), latency/perf metrics, or concrete counts
  return /(?:[$€£¥₹]\s*\d+|\b\d+(?:[.,]\d+)*(?:\s*(?:%|\+|x|k|m|b|ms|s|fps|rps|qps|tb|gb|mb|hrs?|hours?|days?|weeks?|months?|yrs?|years?))?\b)/i.test(
    bullet
  );
}

export function stripUrlsAndEmails(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\bwww\.\S+/gi, ' ')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, ' ')
    .replace(
      /\b(?:github\.com|gitlab\.com|linkedin\.com|bitbucket\.org|npmjs\.com)\/\S*/gi,
      ' '
    );
}

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(trimmed);
}

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

export interface ParsedResumeDate {
  year: number;
  month: number; // 1..12
  hasExplicitMonth: boolean;
  isPresent: boolean;
  monthIndex: number; // year * 12 + (month - 1)
}

function parseMonthNumber(raw: string): number | null {
  const cleaned = raw.trim().toLowerCase().replace(/\.$/, '');
  if (!cleaned) return null;
  if (MONTH_MAP[cleaned]) return MONTH_MAP[cleaned];
  const numeric = Number(cleaned);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    return numeric;
  }
  return null;
}

export function isPresentToken(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^(?:present|current|now|ongoing|to date)$/i.test(value.trim());
}

/**
 * Parses a resume date value (`"Jan 2022"`, `"2022-03"`, `"03/2022"`, `"2022"`,
 * `{ month: "Sep", year: "2020" }`, or `"Present"`).
 * When only a year is given, `defaultMonth` controls whether it anchors at
 * January (`1`, for start dates) or December (`12`, for end dates).
 */
export function parseResumeDateValue(
  value: string | Partial<dateFields> | unknown,
  defaultMonth: number,
  now: Date
): ParsedResumeDate | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'object' && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>;
    const rawYear = rec.year !== undefined ? String(rec.year).trim() : '';
    const rawMonth = rec.month !== undefined ? String(rec.month).trim() : '';
    if (!rawYear && !rawMonth) return null;
    if (isPresentToken(rawYear) || isPresentToken(rawMonth)) {
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      return {
        year: y,
        month: m,
        hasExplicitMonth: true,
        isPresent: true,
        monthIndex: y * 12 + (m - 1),
      };
    }
    if (!/^\d{4}$/.test(rawYear)) return null;
    const year = Number(rawYear);
    const parsedMonth = parseMonthNumber(rawMonth);
    const month = parsedMonth ?? defaultMonth;
    return {
      year,
      month,
      hasExplicitMonth: parsedMonth !== null,
      isPresent: false,
      monthIndex: year * 12 + (month - 1),
    };
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (isPresentToken(trimmed)) {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return {
      year: y,
      month: m,
      hasExplicitMonth: true,
      isPresent: true,
      monthIndex: y * 12 + (m - 1),
    };
  }

  // YYYY-MM or YYYY-MM-DD or YYYY/MM
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = parseMonthNumber(isoMatch[2]);
    if (!month) return null;
    return {
      year,
      month,
      hasExplicitMonth: true,
      isPresent: false,
      monthIndex: year * 12 + (month - 1),
    };
  }

  // MM/YYYY or MM-YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[-/](\d{4})$/);
  if (slashMatch) {
    const month = parseMonthNumber(slashMatch[1]);
    const year = Number(slashMatch[2]);
    if (!month) return null;
    return {
      year,
      month,
      hasExplicitMonth: true,
      isPresent: false,
      monthIndex: year * 12 + (month - 1),
    };
  }

  // Month YYYY or Month, YYYY (e.g. "Mar 2022", "September 2021")
  const namedMatch = trimmed.match(/^([A-Za-z.]+)[,\s]+(\d{4})$/);
  if (namedMatch) {
    const month = parseMonthNumber(namedMatch[1]);
    const year = Number(namedMatch[2]);
    if (!month) return null;
    return {
      year,
      month,
      hasExplicitMonth: true,
      isPresent: false,
      monthIndex: year * 12 + (month - 1),
    };
  }

  // Year only ("2022")
  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) {
    const year = Number(yearOnly[1]);
    return {
      year,
      month: defaultMonth,
      hasExplicitMonth: false,
      isPresent: false,
      monthIndex: year * 12 + (defaultMonth - 1),
    };
  }

  return null;
}

export function extractFirstWordToken(bullet: string): string {
  const cleaned = stripLeadingBulletMarker(bullet)
    .replace(/^["'“”‘’([{\s]+/, '')
    .trim();
  const match = cleaned.match(/^([A-Za-z]+(?:-[A-Za-z]+)?)/);
  return match ? match[1].toLowerCase() : '';
}

export function resolveTrackedVerb(
  rawToken: string
): { base: string; alternatives: string[] } | null {
  const lower = rawToken.toLowerCase();
  if (!lower || STOPWORDS.has(lower)) {
    return null;
  }
  const strong = STRONG_VERB_LOOKUP.get(lower);
  if (strong) {
    return { base: strong.base, alternatives: strong.alternatives };
  }
  const extra = EXTRA_TRACKED_VERBS[lower];
  if (extra) {
    return extra;
  }
  return null;
}

/**
 * Checks whether a heading contains emoji or decorative/special characters.
 * Standard prose punctuation (& / - – — , . ' : ( )) is permitted.
 */
export function hasHeadingSpecialCharsOrEmoji(title: string): boolean {
  if (!title) return false;
  // Check UTF-16 surrogate pairs (emoji in supplementary planes) or BMP symbol/dingbat blocks
  if (/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF\u2B50]/.test(title)) {
    return true;
  }
  // Check non-standard decorative ASCII/Unicode symbols in headings
  if (/[@#$%^*=~`<>\\|{}[\]★☆✦✧⚡❖➤➢✓✔✗✘]/.test(title)) {
    return true;
  }
  return false;
}

const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL',
  'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT',
  'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);

export function shouldAdviseAgainstPhotoForLocation(location: unknown): boolean {
  if (!location || typeof location !== 'object') {
    // Default English-speaking market tip when no non-US/UK country is specified
    return true;
  }
  const loc = location as Record<string, unknown>;
  const countryRaw = String(loc.countryCode || loc.country || '')
    .trim()
    .toUpperCase();
  const combined = [loc.address, loc.city, loc.region, loc.state, countryRaw]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .join(', ');

  if (
    countryRaw === 'US' ||
    countryRaw === 'USA' ||
    countryRaw === 'UK' ||
    countryRaw === 'GB' ||
    countryRaw === 'GBR' ||
    countryRaw === 'UNITED STATES' ||
    countryRaw === 'UNITED KINGDOM'
  ) {
    return true;
  }

  // If an explicit country code is provided and it's NOT US/UK (e.g. DE, FR, CH, JP), do not flag photo
  if (countryRaw && countryRaw.length >= 2) {
    return false;
  }

  // Check city/region hints like "San Francisco, CA" or "London, UK"
  if (/\b(?:United States|USA|UK|United Kingdom|London|England|Scotland|Wales)\b/i.test(combined)) {
    return true;
  }
  const stateMatch = combined.match(/,\s*([A-Z]{2})\b/);
  if (stateMatch && US_STATE_CODES.has(stateMatch[1])) {
    return true;
  }

  // Unspecified country -> surface US/UK tip
  return true;
}
