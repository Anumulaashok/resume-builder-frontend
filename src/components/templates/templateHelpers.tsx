import { ISection, SectionType } from '../../types/resume';
import { formatResumeDate } from '../../utils/date';

export type CanonicalSectionKind =
  | 'work'
  | 'education'
  | 'projects'
  | 'skills'
  | 'other';

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

export function resolveSectionKind(section: ISection): CanonicalSectionKind {
  const rawType = (section.type ?? '').toString().trim().toLowerCase();

  if (WORK_TYPES.has(rawType)) return 'work';
  if (EDUCATION_TYPES.has(rawType)) return 'education';
  if (PROJECT_TYPES.has(rawType)) return 'projects';
  if (SKILL_TYPES.has(rawType)) return 'skills';

  // Fallback inference when generic/custom type strings come from external/AI payloads
  const rawId = (section.id ?? '').toString().trim().toLowerCase();
  if (WORK_TYPES.has(rawId)) return 'work';
  if (EDUCATION_TYPES.has(rawId)) return 'education';
  if (PROJECT_TYPES.has(rawId)) return 'projects';
  if (SKILL_TYPES.has(rawId)) return 'skills';

  return 'other';
}

export function formatItemDateRange(item: Record<string, any>): string {
  if (!item) return '';

  const start = formatResumeDate(item.startDate);
  const end = formatResumeDate(item.endDate);
  const singleDate = formatResumeDate(item.date);

  if (start) {
    const displayEnd = item.current || item.isCurrent || !end ? 'Present' : end;
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

export function normalizeHref(rawUrl?: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function formatLinkLabel(rawUrl?: string): string {
  if (!rawUrl) return '';
  return rawUrl
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/\/$/, '');
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
  return sectionOrder
    .map((id) => sections.find((s) => s.id === id))
    .filter((s): s is ISection => Boolean(s) && s!.enabled !== false);
}
