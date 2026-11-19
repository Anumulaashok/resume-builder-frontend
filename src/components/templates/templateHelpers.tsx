import { dateFields, IResume, ISection, SectionType } from '../../types/resume';
import { formatResumeDate } from '../../utils/date';

export type CanonicalSectionKind =
  | 'work'
  | 'education'
  | 'projects'
  | 'skills'
  | 'languages'
  | 'certificates'
  | 'awards'
  | 'courses'
  | 'organizations'
  | 'publications'
  | 'references'
  | 'interests'
  | 'achievements'
  | 'custom';

export type DateFormatPattern = 'MMM YYYY' | 'MM/YYYY' | 'YYYY';

const WORK_TYPES = new Set([
  SectionType.WORK.toLowerCase(),
  'work',
  'experience',
  'workexperience',
  'work_experience',
  'professional_experience',
  'employment',
]);

const EDUCATION_TYPES = new Set([
  SectionType.EDUCATION.toLowerCase(),
  'education',
  'academics',
]);

const PROJECT_TYPES = new Set([
  SectionType.PROJECTS.toLowerCase(),
  'project',
  'projects',
]);

const SKILL_TYPES = new Set([
  SectionType.SKILLS.toLowerCase(),
  SectionType.TECK_SKILLS.toLowerCase(),
  SectionType.SOFTSKILSS.toLowerCase(),
  'skill',
  'skills',
  'technicalskills',
  'technical_skills',
  'softskills',
  'soft_skills',
]);

const LANGUAGE_TYPES = new Set([
  SectionType.LANGUAGES.toLowerCase(),
  'language',
  'languages',
]);

const CERTIFICATE_TYPES = new Set([
  SectionType.CERTIFICATES.toLowerCase(),
  'certificate',
  'certificates',
  'certification',
  'certifications',
]);

const AWARD_TYPES = new Set([
  SectionType.AWARDS.toLowerCase(),
  'award',
  'awards',
  'honors',
]);

const COURSE_TYPES = new Set([
  SectionType.COURSES.toLowerCase(),
  'course',
  'courses',
  'coursework',
]);

const ORGANIZATION_TYPES = new Set([
  SectionType.ORGANIZATIONS.toLowerCase(),
  'organization',
  'organizations',
  'volunteer',
  'volunteering',
  'affiliations',
]);

const PUBLICATION_TYPES = new Set([
  SectionType.PUBLICATIONS.toLowerCase(),
  'publication',
  'publications',
]);

const REFERENCE_TYPES = new Set([
  SectionType.REFERENCES.toLowerCase(),
  'reference',
  'references',
]);

const INTEREST_TYPES = new Set([
  SectionType.INTERESTS.toLowerCase(),
  'interest',
  'interests',
  'hobbies',
]);

const ACHIEVEMENT_TYPES = new Set([
  SectionType.ACHIVEMENTS.toLowerCase(),
  'achievement',
  'achievements',
  'accomplishments',
]);

const CUSTOM_TYPES = new Set([
  SectionType.CUSTOM.toLowerCase(),
  'custom',
]);

function matchKindToken(token: string): CanonicalSectionKind | null {
  if (!token) return null;
  if (WORK_TYPES.has(token)) return 'work';
  if (EDUCATION_TYPES.has(token)) return 'education';
  if (PROJECT_TYPES.has(token)) return 'projects';
  if (SKILL_TYPES.has(token)) return 'skills';
  if (LANGUAGE_TYPES.has(token)) return 'languages';
  if (CERTIFICATE_TYPES.has(token)) return 'certificates';
  if (AWARD_TYPES.has(token)) return 'awards';
  if (COURSE_TYPES.has(token)) return 'courses';
  if (ORGANIZATION_TYPES.has(token)) return 'organizations';
  if (PUBLICATION_TYPES.has(token)) return 'publications';
  if (REFERENCE_TYPES.has(token)) return 'references';
  if (INTEREST_TYPES.has(token)) return 'interests';
  if (ACHIEVEMENT_TYPES.has(token)) return 'achievements';
  if (CUSTOM_TYPES.has(token)) return 'custom';
  return null;
}

export function resolveSectionKind(section: ISection): CanonicalSectionKind {
  const rawType = (section.type ?? '').toString().trim().toLowerCase();
  const byType = matchKindToken(rawType);
  if (byType) return byType;

  // Fallback inference when generic/custom type strings come from external/AI payloads
  const rawId = (section.id ?? '').toString().trim().toLowerCase();
  const byId = matchKindToken(rawId);
  if (byId) return byId;

  const rawTitle = (section.title ?? '').toString().trim().toLowerCase();
  const byTitle = matchKindToken(rawTitle);
  if (byTitle) return byTitle;

  return 'custom';
}

const MONTH_INDEX_MAP: Record<string, number> = {
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

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function parseMonthToken(rawMonth: string): number | null {
  const trimmed = rawMonth.trim().toLowerCase().replace(/\.$/, '');
  if (!trimmed) return null;
  if (MONTH_INDEX_MAP[trimmed]) return MONTH_INDEX_MAP[trimmed];
  const numeric = Number(trimmed);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    return numeric;
  }
  return null;
}

function parseMonthYear(
  value?: string | Partial<dateFields>
): { month: number | null; year: string | null; raw: string } {
  const base = formatResumeDate(value);
  if (!base) {
    return { month: null, year: null, raw: '' };
  }

  if (typeof value === 'object' && value !== null) {
    const rawYear = (value.year ?? '').toString().trim();
    const rawMonth = (value.month ?? '').toString().trim();
    return {
      month: parseMonthToken(rawMonth),
      year: /^\d{4}$/.test(rawYear) ? rawYear : rawYear || null,
      raw: base,
    };
  }

  const trimmed = base.trim();
  if (/^present|current|now$/i.test(trimmed)) {
    return { month: null, year: null, raw: 'Present' };
  }

  // YYYY-MM or YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = parseMonthToken(isoMatch[2]);
    return { month, year, raw: trimmed };
  }

  // MM/YYYY or MM-YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[-/](\d{4})$/);
  if (slashMatch) {
    const month = parseMonthToken(slashMatch[1]);
    const year = slashMatch[2];
    return { month, year, raw: trimmed };
  }

  // Month YYYY (e.g. "Jun 2021", "September 2023")
  const namedMatch = trimmed.match(/^([A-Za-z.]+)\s+(\d{4})$/);
  if (namedMatch) {
    const month = parseMonthToken(namedMatch[1]);
    const year = namedMatch[2];
    return { month, year, raw: trimmed };
  }

  // Year only
  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) {
    return { month: null, year: yearOnly[1], raw: trimmed };
  }

  return { month: null, year: null, raw: trimmed };
}

export function formatDateWithPattern(
  value?: string | Partial<dateFields>,
  dateFormat?: DateFormatPattern
): string {
  const base = formatResumeDate(value);
  if (!base) return '';
  if (!dateFormat) return base;

  const { month, year, raw } = parseMonthYear(value);
  if (!year) return raw;

  if (dateFormat === 'YYYY') {
    return year;
  }

  if (!month) {
    return year;
  }

  if (dateFormat === 'MM/YYYY') {
    return `${String(month).padStart(2, '0')}/${year}`;
  }

  return `${SHORT_MONTHS[month - 1]} ${year}`;
}

export function formatItemDateRange(
  item: Record<string, any>,
  dateFormat?: DateFormatPattern
): string {
  if (!item) return '';

  const start = formatDateWithPattern(item.startDate, dateFormat);
  const end = formatDateWithPattern(item.endDate, dateFormat);
  const singleDate = formatDateWithPattern(item.date, dateFormat);

  if (start) {
    const rawEnd = formatResumeDate(item.endDate);
    const displayEnd = item.current || item.isCurrent || !rawEnd ? 'Present' : end;
    return `${start} - ${displayEnd}`;
  }

  if (item.current || item.isCurrent) {
    return 'Present';
  }

  if (end) {
    return end;
  }

  if (singleDate) {
    return singleDate;
  }

  if (typeof item.dateRange === 'string' && item.dateRange.trim()) {
    return item.dateRange.trim();
  }

  if (typeof item.period === 'string' && item.period.trim()) {
    return item.period.trim();
  }

  return '';
}

export function formatItemLocation(location: unknown): string {
  if (!location) return '';
  if (typeof location === 'string') return location.trim();
  if (typeof location === 'object') {
    const loc = location as Record<string, unknown>;
    return [loc.address, loc.city, loc.region, loc.state, loc.countryCode, loc.country]
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

export function extractKeywords(item: Record<string, any>): string[] {
  if (!item) return [];
  const raw =
    item.keywords ??
    item.subSkills ??
    item.technologies ??
    item.items ??
    item.skills;

  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (typeof entry === 'string') return entry.trim();
        if (entry && typeof entry === 'object' && typeof entry.name === 'string') {
          return entry.name.trim();
        }
        return '';
      })
      .filter(Boolean);
  }

  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

export function extractHighlights(item: Record<string, any>): string[] {
  if (!item || !Array.isArray(item.highlights)) return [];
  return item.highlights
    .map((h: unknown) => (typeof h === 'string' ? h.trim() : ''))
    .filter(Boolean);
}

export function normalizeHref(rawUrl?: unknown): string {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function formatLinkLabel(rawUrl?: unknown): string {
  if (typeof rawUrl !== 'string') return '';
  return rawUrl
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/\/$/, '');
}

export function formatSkillLevel(level: unknown): string {
  if (typeof level === 'string') {
    return level.trim();
  }
  if (typeof level === 'number' && Number.isFinite(level) && level > 0) {
    if (level <= 5) {
      return `Level ${level}/5`;
    }
    return `${Math.min(100, Math.round(level))}%`;
  }
  return '';
}

export function parseSkillLevelInput(raw: string): string | number {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const levelSlashMatch = trimmed.match(/^level\s*(\d+(?:\.\d+)?)\s*\/\s*5$/i);
  if (levelSlashMatch) {
    return Number(levelSlashMatch[1]);
  }
  const pctMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (pctMatch) {
    return Number(pctMatch[1]);
  }
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

export function buildSyncedFieldPatch(
  item: Record<string, any> | null | undefined,
  primaryField: string,
  value: any,
  aliasFields: string[] = []
): Record<string, any> {
  const patch: Record<string, any> = { [primaryField]: value };
  if (!item || typeof item !== 'object') return patch;
  aliasFields.forEach((alias) => {
    if (alias !== primaryField && Object.prototype.hasOwnProperty.call(item, alias)) {
      patch[alias] = value;
    }
  });
  return patch;
}

const STANDARD_CUSTOM_ITEM_KEYS = new Set([
  'id',
  '_id',
  'enabled',
  'title',
  'name',
  'subtitle',
  'position',
  'role',
  'company',
  'organization',
  'institution',
  'issuer',
  'publisher',
  'awarder',
  'course',
  'degree',
  'field',
  'studyType',
  'area',
  'gpa',
  'score',
  'location',
  'startDate',
  'endDate',
  'date',
  'dateRange',
  'period',
  'current',
  'isCurrent',
  'url',
  'website',
  'link',
  'liveUrl',
  'description',
  'summary',
  'reference',
  'highlights',
  'keywords',
  'subSkills',
  'technologies',
  'items',
  'skills',
  'level',
  'fluency',
  'proficiency',
  'contact',
  'email',
  'phone',
]);

export function extractCustomExtraFields(
  item: Record<string, any> | null | undefined
): Array<{ key: string; label: string; value: string }> {
  if (!item || typeof item !== 'object') return [];
  const results: Array<{ key: string; label: string; value: string }> = [];

  Object.entries(item).forEach(([key, rawVal]) => {
    if (STANDARD_CUSTOM_ITEM_KEYS.has(key)) return;
    if (rawVal === null || rawVal === undefined) return;
    const strVal =
      typeof rawVal === 'string'
        ? rawVal.trim()
        : typeof rawVal === 'number' || typeof rawVal === 'boolean'
        ? String(rawVal)
        : '';
    if (!strVal) return;

    const humanized = key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());

    results.push({
      key,
      label: humanized || key,
      value: strVal,
    });
  });

  return results;
}

export interface ContactLinkItem {
  key: string;
  label: string;
  href: string;
}

export function extractExtraBasicsLinks(basics: Record<string, any>): ContactLinkItem[] {
  if (!basics) return [];
  const links: ContactLinkItem[] = [];

  const directUrl = basics.url || basics.website || basics.portfolioUrl;
  if (typeof directUrl === 'string' && directUrl.trim()) {
    links.push({
      key: 'website',
      label: formatLinkLabel(directUrl),
      href: normalizeHref(directUrl),
    });
  }

  if (typeof basics.linkedin === 'string' && basics.linkedin.trim()) {
    links.push({
      key: 'linkedin',
      label: formatLinkLabel(basics.linkedin),
      href: normalizeHref(basics.linkedin),
    });
  }

  if (typeof basics.github === 'string' && basics.github.trim()) {
    links.push({
      key: 'github',
      label: formatLinkLabel(basics.github),
      href: normalizeHref(basics.github),
    });
  }

  if (Array.isArray(basics.profiles)) {
    basics.profiles.forEach((profile: any, idx: number) => {
      if (!profile) return;
      const profileUrl = typeof profile.url === 'string' ? profile.url.trim() : '';
      const network = typeof profile.network === 'string' ? profile.network.trim() : '';
      const username = typeof profile.username === 'string' ? profile.username.trim() : '';
      if (profileUrl) {
        links.push({
          key: `profile-${idx}`,
          label: formatLinkLabel(profileUrl) || network || username,
          href: normalizeHref(profileUrl),
        });
      }
    });
  }

  return links;
}

export function getOrderedSections(
  sections: ISection[] = [],
  sectionOrder: string[] = []
): ISection[] {
  if (!Array.isArray(sections) || sections.length === 0) return [];
  if (!Array.isArray(sectionOrder) || sectionOrder.length === 0) {
    return sections.filter((s) => s && s.enabled !== false);
  }
  const orderedIds = new Set(sectionOrder);
  const fromOrder = sectionOrder
    .map((id) => sections.find((s) => s.id === id))
    .filter((s): s is ISection => Boolean(s) && s!.enabled !== false);
  const remaining = sections.filter(
    (s) => s && s.enabled !== false && !orderedIds.has(s.id)
  );
  return [...fromOrder, ...remaining];
}

export function isResumeEmpty(resume?: IResume | null): boolean {
  if (!resume) return true;
  const basics = resume.content?.basics || {};
  if (
    (basics.name && basics.name.trim()) ||
    (basics.label && basics.label.trim()) ||
    (basics.email && basics.email.trim()) ||
    (basics.phone && basics.phone.trim()) ||
    (basics.summary && basics.summary.trim()) ||
    (resume.summary && resume.summary.trim())
  ) {
    return false;
  }

  const sections = resume.content?.sections || [];
  return !sections.some(
    (sec) =>
      sec &&
      sec.enabled !== false &&
      Array.isArray(sec.content) &&
      sec.content.some((item: any) => item && item.enabled !== false)
  );
}
