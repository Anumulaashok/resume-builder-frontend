import { ISection, SectionType } from '../../types/resume';
import { formatResumeDate } from '../../utils/date';

export type CanonicalSectionKind =
  | 'work'
  | 'education'
  | 'skills'
  | 'technical_skills'
  | 'soft_skills'
  | 'languages'
  | 'certificates'
  | 'interests'
  | 'projects'
  | 'courses'
  | 'awards'
  | 'organizations'
  | 'publications'
  | 'references'
  | 'achievements'
  | 'custom';

const SECTION_KIND_ALIASES: Array<[CanonicalSectionKind, string[]]> = [
  [
    'work',
    [
      SectionType.WORK.toLowerCase(),
      'work',
      'experience',
      'workexperience',
      'work_experience',
      'professional_experience',
      'employment',
    ],
  ],
  [
    'education',
    [
      SectionType.EDUCATION.toLowerCase(),
      'education',
      'academics',
      'academic',
    ],
  ],
  [
    'technical_skills',
    [
      SectionType.TECK_SKILLS.toLowerCase(),
      'technicalskills',
      'technical_skills',
      'techskills',
      'tech_skills',
      'teck_skills',
    ],
  ],
  [
    'soft_skills',
    [
      SectionType.SOFTSKILSS.toLowerCase(),
      'softskills',
      'soft_skills',
      'softskilss',
      'interpersonal_skills',
    ],
  ],
  [
    'skills',
    [
      SectionType.SKILLS.toLowerCase(),
      'skill',
      'skills',
      'competencies',
    ],
  ],
  [
    'languages',
    [
      SectionType.LANGUAGES.toLowerCase(),
      'language',
      'languages',
    ],
  ],
  [
    'certificates',
    [
      SectionType.CERTIFICATES.toLowerCase(),
      'certificate',
      'certificates',
      'certification',
      'certifications',
      'licenses',
    ],
  ],
  [
    'interests',
    [
      SectionType.INTERESTS.toLowerCase(),
      'interest',
      'interests',
      'hobbies',
    ],
  ],
  [
    'projects',
    [
      SectionType.PROJECTS.toLowerCase(),
      'project',
      'projects',
    ],
  ],
  [
    'courses',
    [
      SectionType.COURSES.toLowerCase(),
      'course',
      'courses',
      'coursework',
      'training',
    ],
  ],
  [
    'awards',
    [
      SectionType.AWARDS.toLowerCase(),
      'award',
      'awards',
      'honors',
      'honours',
    ],
  ],
  [
    'organizations',
    [
      SectionType.ORGANIZATIONS.toLowerCase(),
      'organization',
      'organizations',
      'organisation',
      'organisations',
      'volunteer',
      'volunteering',
      'affiliations',
    ],
  ],
  [
    'publications',
    [
      SectionType.PUBLICATIONS.toLowerCase(),
      'publication',
      'publications',
      'papers',
    ],
  ],
  [
    'references',
    [
      SectionType.REFERENCES.toLowerCase(),
      'reference',
      'references',
    ],
  ],
  [
    'achievements',
    [
      SectionType.ACHIVEMENTS.toLowerCase(),
      'achievement',
      'achievements',
      'achivements',
      'accomplishments',
    ],
  ],
  [
    'custom',
    [
      SectionType.CUSTOM.toLowerCase(),
      'custom',
      'other',
    ],
  ],
];

const KIND_LOOKUP = new Map<string, CanonicalSectionKind>();
SECTION_KIND_ALIASES.forEach(([kind, aliases]) => {
  aliases.forEach((alias) => {
    KIND_LOOKUP.set(alias, kind);
  });
});

export function resolveSectionKind(section: ISection): CanonicalSectionKind {
  if (!section) return 'custom';

  const rawType = safeString(section.type).trim().toLowerCase();
  const matchedByType = KIND_LOOKUP.get(rawType);
  if (matchedByType && matchedByType !== 'custom') {
    return matchedByType;
  }

  // Fallback inference when generic/custom type strings come from external/AI payloads
  const rawId = safeString(section.id).trim().toLowerCase();
  const matchedById = KIND_LOOKUP.get(rawId);
  if (matchedById) {
    return matchedById;
  }

  if (matchedByType) {
    return matchedByType;
  }

  return 'custom';
}

export function safeString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

export function formatSkillLevel(level: unknown): string {
  if (level === null || level === undefined) return '';
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

export function parseSkillLevelInput(rawValue: string): string | number {
  const trimmed = rawValue.trim();
  if (!trimmed) return '';
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

export function formatItemDateRange(item: Record<string, any> | null | undefined): string {
  if (!item || typeof item !== 'object') return '';

  const start = formatResumeDate(item.startDate);
  const end = formatResumeDate(item.endDate);
  const singleDate = formatResumeDate(item.date);

  if (start) {
    const displayEnd = item.current || item.isCurrent || !end ? 'Present' : end;
    return `${start} - ${displayEnd}`;
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

export function parseDateRangePatch(
  rawValue: string,
  currentItem?: Record<string, any>
): Record<string, any> {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    if (currentItem && currentItem.date !== undefined && currentItem.startDate === undefined) {
      return { date: '' };
    }
    return { startDate: '', endDate: '', current: false };
  }

  const separatorMatch = trimmed.match(/\s+(?:-|–|—|to)\s+/i);
  if (separatorMatch && separatorMatch.index !== undefined) {
    const startPart = trimmed.slice(0, separatorMatch.index).trim();
    const endPart = trimmed
      .slice(separatorMatch.index + separatorMatch[0].length)
      .trim();
    const isPresent = /^present|current|now|ongoing$/i.test(endPart);
    return {
      startDate: startPart,
      endDate: isPresent ? '' : endPart,
      current: isPresent,
    };
  }

  if (currentItem && currentItem.date !== undefined && currentItem.startDate === undefined) {
    return { date: trimmed };
  }

  return {
    startDate: trimmed,
    endDate: '',
    current: false,
  };
}

export function buildSyncedFieldPatch(
  item: Record<string, any> | null | undefined,
  primaryField: string,
  value: any,
  aliasFields: string[] = []
): Record<string, any> {
  const patch: Record<string, any> = { [primaryField]: value };
  if (item && typeof item === 'object') {
    aliasFields.forEach((alias) => {
      if (alias !== primaryField && item[alias] !== undefined) {
        patch[alias] = value;
      }
    });
  }
  return patch;
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

export function extractKeywords(item: Record<string, any> | null | undefined): string[] {
  if (!item || typeof item !== 'object') return [];
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

export function extractHighlights(item: Record<string, any> | null | undefined): string[] {
  if (!item || typeof item !== 'object' || !Array.isArray(item.highlights)) return [];
  return item.highlights
    .map((h: unknown) => (typeof h === 'string' ? h.trim() : ''))
    .filter(Boolean);
}

export function normalizeHref(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function formatLinkLabel(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
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
  if (!basics || typeof basics !== 'object') return [];
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
    .map((id) => sections.find((s) => s && s.id === id))
    .filter((s): s is ISection => Boolean(s) && s!.enabled !== false);
}
