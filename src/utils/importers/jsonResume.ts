import {
  AwardItem,
  CertificateItem,
  dateFields,
  EducationItem,
  InterestItem,
  IResume,
  ISection,
  LanguageItem,
  OrganizationItem,
  ProjectItem,
  PublicationItem,
  ReferenceItem,
  ResumeProfile,
  SectionType,
  SkillItem,
  WorkItem,
} from '../../types/resume';
import { formatResumeDate } from '../date';

export const JSON_RESUME_SCHEMA_V1 =
  'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json';

export interface JsonResumeProfile {
  network?: string;
  username?: string;
  url?: string;
}

export interface JsonResumeLocation {
  address?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  region?: string;
}

export interface JsonResumeBasics {
  name?: string;
  label?: string;
  image?: string;
  email?: string;
  phone?: string;
  url?: string;
  website?: string;
  summary?: string;
  location?: JsonResumeLocation;
  profiles?: JsonResumeProfile[];
}

export interface JsonResumeWork {
  name?: string;
  company?: string;
  location?: string | JsonResumeLocation;
  description?: string;
  position?: string;
  url?: string;
  website?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
}

export interface JsonResumeVolunteer {
  organization?: string;
  name?: string;
  position?: string;
  url?: string;
  website?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
  location?: string;
}

export interface JsonResumeEducation {
  institution?: string;
  url?: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  score?: string;
  gpa?: string;
  courses?: string[];
  location?: string;
  summary?: string;
  description?: string;
}

export interface JsonResumeAward {
  title?: string;
  name?: string;
  date?: string;
  awarder?: string;
  issuer?: string;
  summary?: string;
}

export interface JsonResumeCertificate {
  name?: string;
  title?: string;
  date?: string;
  url?: string;
  issuer?: string;
  summary?: string;
}

export interface JsonResumePublication {
  name?: string;
  title?: string;
  publisher?: string;
  releaseDate?: string;
  date?: string;
  url?: string;
  website?: string;
  summary?: string;
}

export interface JsonResumeSkill {
  name?: string;
  level?: string | number;
  keywords?: string[];
}

export interface JsonResumeLanguage {
  language?: string;
  name?: string;
  fluency?: string;
  level?: string;
}

export interface JsonResumeInterest {
  name?: string;
  keywords?: string[];
  summary?: string;
}

export interface JsonResumeReference {
  name?: string;
  reference?: string;
  position?: string;
  company?: string;
  contact?: string;
}

export interface JsonResumeProject {
  name?: string;
  description?: string;
  highlights?: string[];
  keywords?: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
  roles?: string[];
  entity?: string;
  type?: string;
}

export interface JsonResumeMeta {
  canonical?: string;
  version?: string;
  lastModified?: string;
  title?: string;
  templateId?: string;
  [key: string]: unknown;
}

export interface JsonResumeSchema {
  $schema?: string;
  basics?: JsonResumeBasics;
  work?: JsonResumeWork[];
  volunteer?: JsonResumeVolunteer[];
  education?: JsonResumeEducation[];
  awards?: JsonResumeAward[];
  certificates?: JsonResumeCertificate[];
  publications?: JsonResumePublication[];
  skills?: JsonResumeSkill[];
  languages?: JsonResumeLanguage[];
  interests?: JsonResumeInterest[];
  references?: JsonResumeReference[];
  projects?: JsonResumeProject[];
  meta?: JsonResumeMeta;
  [key: string]: unknown;
}

const RECOGNIZED_SECTION_KEYS = [
  'work',
  'education',
  'skills',
  'projects',
  'languages',
  'certificates',
  'awards',
  'publications',
  'volunteer',
  'interests',
  'references',
] as const;

type RecognizedSectionKey = (typeof RECOGNIZED_SECTION_KEYS)[number];

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

const MONTH_NAME_TO_INDEX: Record<string, number> = {
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

function cleanStr(val: unknown): string {
  return typeof val === 'string' ? val.trim() : '';
}

function cleanStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object' && typeof (entry as any).name === 'string') {
        return (entry as any).name.trim();
      }
      return '';
    })
    .filter(Boolean);
}

function isPresentString(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  return /^(present|current|now|ongoing|today)$/i.test(val.trim());
}

function parseMonthIndex(token: string): number | null {
  const normalized = token.trim().toLowerCase().replace(/\.$/, '');
  if (!normalized) return null;
  if (MONTH_NAME_TO_INDEX[normalized]) {
    return MONTH_NAME_TO_INDEX[normalized];
  }
  const numeric = Number(normalized);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    return numeric;
  }
  return null;
}

export function formatDateFromJson(raw: unknown): string {
  const str = cleanStr(raw);
  if (!str) return '';
  if (isPresentString(str)) return '';

  // YYYY-MM -> "MMM YYYY"
  const ymMatch = str.match(/^(\d{4})-(\d{1,2})$/);
  if (ymMatch) {
    const year = ymMatch[1];
    const monthIdx = parseMonthIndex(ymMatch[2]);
    if (monthIdx) {
      return `${SHORT_MONTHS[monthIdx - 1]} ${year}`;
    }
    return year;
  }

  // YYYY-MM-DD -> keep exact ISO date if day is non-01? Wait: if YYYY-MM-DD is exported, let's check:
  // Keeping YYYY-MM-DD when day is present preserves exact day precision on round-trip, OR if we format to MMM YYYY?
  // Wait: in JSON Resume v1, dates are often "2014-06-29" or "2020-01". Keeping YYYY-MM-DD as-is or converting?
  // Note templateHelpers.tsx parseMonthYear handles "2014-06-29" natively! And keeping YYYY-MM-DD preserves exact day on round-trip!
  return str;
}

export function parseDateToDateFields(raw: unknown): dateFields {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const rawMonth = cleanStr(obj.month);
    const monthIdx = parseMonthIndex(rawMonth);
    return {
      month: monthIdx ? SHORT_MONTHS[monthIdx - 1] : rawMonth,
      year: cleanStr(obj.year),
    };
  }

  const str = cleanStr(raw);
  if (!str || isPresentString(str)) {
    return { month: '', year: '' };
  }

  // YYYY-MM or YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?$/);
  if (isoMatch) {
    const monthIdx = parseMonthIndex(isoMatch[2]);
    return {
      month: monthIdx ? SHORT_MONTHS[monthIdx - 1] : '',
      year: isoMatch[1],
    };
  }

  // MM/YYYY or MM-YYYY
  const slashMatch = str.match(/^(\d{1,2})[-/](\d{4})$/);
  if (slashMatch) {
    const monthIdx = parseMonthIndex(slashMatch[1]);
    return {
      month: monthIdx ? SHORT_MONTHS[monthIdx - 1] : '',
      year: slashMatch[2],
    };
  }

  // Month YYYY
  const namedMatch = str.match(/^([A-Za-z.]+)\s+(\d{4})$/);
  if (namedMatch) {
    const monthIdx = parseMonthIndex(namedMatch[1]);
    return {
      month: monthIdx ? SHORT_MONTHS[monthIdx - 1] : namedMatch[1],
      year: namedMatch[2],
    };
  }

  // YYYY only
  const yearMatch = str.match(/^(\d{4})$/);
  if (yearMatch) {
    return { month: '', year: yearMatch[1] };
  }

  return { month: '', year: str };
}

export function formatToJsonResumeDate(value: unknown): string {
  if (!value) return '';

  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const year = cleanStr(obj.year);
    const rawMonth = cleanStr(obj.month);
    if (!year && !rawMonth) return '';
    const monthIdx = parseMonthIndex(rawMonth);
    if (year && monthIdx) {
      return `${year}-${String(monthIdx).padStart(2, '0')}`;
    }
    return year || rawMonth;
  }

  const str = formatResumeDate(value);
  if (!str || isPresentString(str)) return '';

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // YYYY-M or YYYY-MM
  const ymMatch = str.match(/^(\d{4})[-/](\d{1,2})$/);
  if (ymMatch) {
    const monthIdx = parseMonthIndex(ymMatch[2]);
    if (monthIdx) {
      return `${ymMatch[1]}-${String(monthIdx).padStart(2, '0')}`;
    }
  }

  // MM/YYYY or MM-YYYY
  const slashMatch = str.match(/^(\d{1,2})[-/](\d{4})$/);
  if (slashMatch) {
    const monthIdx = parseMonthIndex(slashMatch[1]);
    if (monthIdx) {
      return `${slashMatch[2]}-${String(monthIdx).padStart(2, '0')}`;
    }
  }

  // Month YYYY (e.g. "Mar 2022", "September 2020")
  const namedMatch = str.match(/^([A-Za-z.]+)\s+(\d{4})$/);
  if (namedMatch) {
    const monthIdx = parseMonthIndex(namedMatch[1]);
    if (monthIdx) {
      return `${namedMatch[2]}-${String(monthIdx).padStart(2, '0')}`;
    }
  }

  // YYYY
  if (/^\d{4}$/.test(str)) {
    return str;
  }

  return str;
}

function formatLocationValue(loc: unknown): string {
  if (!loc) return '';
  if (typeof loc === 'string') return loc.trim();
  if (typeof loc === 'object' && !Array.isArray(loc)) {
    const record = loc as Record<string, unknown>;
    return [record.address, record.city, record.region, record.countryCode]
      .map((v) => cleanStr(v))
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

export function parseJsonResumeString(raw: string): JsonResumeSchema {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('JSON Resume content cannot be empty.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON syntax. Please upload a valid .json file.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON Resume root must be a JSON object.');
  }

  return parsed as JsonResumeSchema;
}

export function hasRecognizedJsonResumeFields(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }
  const record = data as Record<string, unknown>;
  if (record.basics && typeof record.basics === 'object' && !Array.isArray(record.basics)) {
    return true;
  }
  return RECOGNIZED_SECTION_KEYS.some(
    (key) => Array.isArray(record[key]) && (record[key] as unknown[]).length > 0
  );
}

function omitEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val === undefined || val === null || val === '') return;
    if (Array.isArray(val) && val.length === 0) return;
    result[key] = val;
  });
  return result as Partial<T>;
}

function buildSectionFromKey(
  key: RecognizedSectionKey,
  rawItems: unknown[]
): ISection | null {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return null;
  }

  switch (key) {
    case 'work': {
      const items: WorkItem[] = rawItems
        .filter((item): item is JsonResumeWork => Boolean(item && typeof item === 'object'))
        .map((w, idx) => {
          const companyName = cleanStr(w.name) || cleanStr(w.company);
          const rawStart = cleanStr(w.startDate);
          const rawEnd = cleanStr(w.endDate);
          const current = Boolean(rawStart && !rawEnd) || isPresentString(rawEnd);
          const highlights = cleanStringArray(w.highlights);
          const item: WorkItem = {
            id: `work-${idx + 1}`,
            enabled: true,
            name: companyName,
            company: companyName,
            position: cleanStr(w.position),
            startDate: formatDateFromJson(rawStart),
            endDate: current ? '' : formatDateFromJson(rawEnd),
            current,
            location: formatLocationValue(w.location),
            description: cleanStr(w.summary) || cleanStr(w.description),
            ...(cleanStr(w.url) || cleanStr(w.website)
              ? { url: cleanStr(w.url) || cleanStr(w.website) }
              : {}),
            ...(highlights.length > 0 ? { highlights } : {}),
          };
          return item;
        });

      if (!items.length) return null;
      return {
        id: 'section-work',
        type: SectionType.WORK,
        title: 'Professional Experience',
        enabled: true,
        content: items,
      };
    }

    case 'education': {
      const items: EducationItem[] = rawItems
        .filter(
          (item): item is JsonResumeEducation => Boolean(item && typeof item === 'object')
        )
        .map((edu, idx) => {
          const rawStart = cleanStr(edu.startDate);
          const rawEnd = cleanStr(edu.endDate);
          const current = Boolean(rawStart && !rawEnd) || isPresentString(rawEnd);
          const studyType = cleanStr(edu.studyType);
          const area = cleanStr(edu.area);
          const institution = cleanStr(edu.institution);
          const score = cleanStr(edu.score) || cleanStr(edu.gpa);
          const courses = cleanStringArray(edu.courses);

          const item: EducationItem = {
            id: `education-${idx + 1}`,
            enabled: true,
            institution,
            degree: studyType || area,
            field: studyType ? area : '',
            startDate: parseDateToDateFields(rawStart),
            endDate: current ? { month: '', year: '' } : parseDateToDateFields(rawEnd),
            current,
            location: cleanStr(edu.location),
            description: cleanStr(edu.summary) || cleanStr(edu.description),
            ...(cleanStr(edu.url) ? { url: cleanStr(edu.url) } : {}),
            ...(score ? { score } : {}),
            ...(courses.length > 0 ? { courses, highlights: courses } : {}),
          };
          return item;
        });

      if (!items.length) return null;
      return {
        id: 'section-education',
        type: SectionType.EDUCATION,
        title: 'Education',
        enabled: true,
        content: items,
      };
    }

    case 'skills': {
      const items: SkillItem[] = rawItems
        .filter((item): item is JsonResumeSkill => Boolean(item && typeof item === 'object'))
        .map((skill, idx) => {
          const rawLevel = skill.level;
          let resolvedLevel: number | string | undefined;
          if (typeof rawLevel === 'number' && !Number.isNaN(rawLevel)) {
            resolvedLevel = rawLevel;
          } else if (typeof rawLevel === 'string' && rawLevel.trim()) {
            const trimmed = rawLevel.trim();
            if (/^\d+$/.test(trimmed)) {
              resolvedLevel = Number(trimmed);
            } else {
              resolvedLevel = trimmed;
            }
          }
          const subSkills = cleanStringArray(skill.keywords);
          const item: SkillItem = {
            id: `skills-${idx + 1}`,
            enabled: true,
            name: cleanStr(skill.name),
            ...(resolvedLevel !== undefined ? { level: resolvedLevel } : {}),
            ...(subSkills.length > 0 ? { subSkills } : {}),
          };
          return item;
        });

      if (!items.length) return null;
      return {
        id: 'section-skills',
        type: SectionType.SKILLS,
        title: 'Skills',
        enabled: true,
        content: items,
      };
    }

    case 'projects': {
      const items: ProjectItem[] = rawItems
        .filter(
          (item): item is JsonResumeProject => Boolean(item && typeof item === 'object')
        )
        .map((proj, idx) => {
          const rawStart = cleanStr(proj.startDate);
          const rawEnd = cleanStr(proj.endDate);
          const current = Boolean(rawStart && !rawEnd) || isPresentString(rawEnd);
          const highlights = cleanStringArray(proj.highlights);
          const technologies = cleanStringArray(proj.keywords);
          const roles = cleanStringArray(proj.roles);
          const entity = cleanStr(proj.entity);
          const projType = cleanStr(proj.type);

          const item: ProjectItem = {
            id: `projects-${idx + 1}`,
            enabled: true,
            name: cleanStr(proj.name),
            description: cleanStr(proj.description),
            startDate: formatDateFromJson(rawStart),
            endDate: current ? '' : formatDateFromJson(rawEnd),
            current,
            url: cleanStr(proj.url),
            ...(technologies.length > 0 ? { technologies } : {}),
            ...(highlights.length > 0 ? { highlights } : {}),
            ...(roles.length > 0 ? { position: roles.join(', ') } : {}),
            ...(entity ? { company: entity } : {}),
            ...(projType ? { type: projType } : {}),
          };
          return item;
        });

      if (!items.length) return null;
      return {
        id: 'section-projects',
        type: SectionType.PROJECTS,
        title: 'Projects',
        enabled: true,
        content: items,
      };
    }

    case 'languages': {
      const items: LanguageItem[] = rawItems
        .filter(
          (item): item is JsonResumeLanguage => Boolean(item && typeof item === 'object')
        )
        .map((lang, idx) => {
          const name = cleanStr(lang.language) || cleanStr(lang.name);
          const level = cleanStr(lang.fluency) || cleanStr(lang.level);
          return {
            id: `languages-${idx + 1}`,
            enabled: true,
            name,
            language: name,
            level,
            fluency: level,
          };
        });

      if (!items.length) return null;
      return {
        id: 'section-languages',
        type: SectionType.LANGUAGES,
        title: 'Languages',
        enabled: true,
        content: items,
      };
    }

    case 'certificates': {
      const items: CertificateItem[] = rawItems
        .filter(
          (item): item is JsonResumeCertificate => Boolean(item && typeof item === 'object')
        )
        .map((cert, idx) => ({
          id: `certificates-${idx + 1}`,
          enabled: true,
          name: cleanStr(cert.name) || cleanStr(cert.title),
          issuer: cleanStr(cert.issuer),
          date: formatDateFromJson(cert.date),
          url: cleanStr(cert.url),
          ...(cleanStr(cert.summary) ? { description: cleanStr(cert.summary) } : {}),
        }));

      if (!items.length) return null;
      return {
        id: 'section-certificates',
        type: SectionType.CERTIFICATES,
        title: 'Certifications',
        enabled: true,
        content: items,
      };
    }

    case 'awards': {
      const items: AwardItem[] = rawItems
        .filter((item): item is JsonResumeAward => Boolean(item && typeof item === 'object'))
        .map((award, idx) => {
          const title = cleanStr(award.title) || cleanStr(award.name);
          const issuer = cleanStr(award.awarder) || cleanStr(award.issuer);
          return {
            id: `awards-${idx + 1}`,
            enabled: true,
            name: title,
            title,
            issuer,
            awarder: issuer,
            date: formatDateFromJson(award.date),
            description: cleanStr(award.summary),
          };
        });

      if (!items.length) return null;
      return {
        id: 'section-awards',
        type: SectionType.AWARDS,
        title: 'Awards',
        enabled: true,
        content: items,
      };
    }

    case 'publications': {
      const items: PublicationItem[] = rawItems
        .filter(
          (item): item is JsonResumePublication => Boolean(item && typeof item === 'object')
        )
        .map((pub, idx) => ({
          id: `publications-${idx + 1}`,
          enabled: true,
          title: cleanStr(pub.name) || cleanStr(pub.title),
          publisher: cleanStr(pub.publisher),
          date: formatDateFromJson(pub.releaseDate || pub.date),
          url: cleanStr(pub.url) || cleanStr(pub.website),
          description: cleanStr(pub.summary),
        }));

      if (!items.length) return null;
      return {
        id: 'section-publications',
        type: SectionType.PUBLICATIONS,
        title: 'Publications',
        enabled: true,
        content: items,
      };
    }

    case 'volunteer': {
      const items: OrganizationItem[] = rawItems
        .filter(
          (item): item is JsonResumeVolunteer => Boolean(item && typeof item === 'object')
        )
        .map((vol, idx) => {
          const orgName = cleanStr(vol.organization) || cleanStr(vol.name);
          const rawStart = cleanStr(vol.startDate);
          const rawEnd = cleanStr(vol.endDate);
          const current = Boolean(rawStart && !rawEnd) || isPresentString(rawEnd);
          const highlights = cleanStringArray(vol.highlights);

          return {
            id: `organizations-${idx + 1}`,
            enabled: true,
            name: orgName,
            organization: orgName,
            position: cleanStr(vol.position),
            startDate: formatDateFromJson(rawStart),
            endDate: current ? '' : formatDateFromJson(rawEnd),
            current,
            description: cleanStr(vol.summary),
            ...(cleanStr(vol.url) || cleanStr(vol.website)
              ? { url: cleanStr(vol.url) || cleanStr(vol.website) }
              : {}),
            ...(cleanStr(vol.location) ? { location: cleanStr(vol.location) } : {}),
            ...(highlights.length > 0 ? { highlights } : {}),
          };
        });

      if (!items.length) return null;
      return {
        id: 'section-organizations',
        type: SectionType.ORGANIZATIONS,
        title: 'Organizations',
        enabled: true,
        content: items,
      };
    }

    case 'interests': {
      const items: InterestItem[] = rawItems
        .filter(
          (item): item is JsonResumeInterest => Boolean(item && typeof item === 'object')
        )
        .map((interest, idx) => {
          const keywords = cleanStringArray(interest.keywords);
          return {
            id: `interests-${idx + 1}`,
            enabled: true,
            name: cleanStr(interest.name),
            description: cleanStr(interest.summary),
            ...(keywords.length > 0 ? { keywords } : {}),
          };
        });

      if (!items.length) return null;
      return {
        id: 'section-interests',
        type: SectionType.INTERESTS,
        title: 'Interests',
        enabled: true,
        content: items,
      };
    }

    case 'references': {
      const items: ReferenceItem[] = rawItems
        .filter(
          (item): item is JsonResumeReference => Boolean(item && typeof item === 'object')
        )
        .map((ref, idx) => {
          const note = cleanStr(ref.reference);
          return {
            id: `references-${idx + 1}`,
            enabled: true,
            name: cleanStr(ref.name),
            reference: note,
            description: note,
            ...(cleanStr(ref.position) ? { position: cleanStr(ref.position) } : {}),
            ...(cleanStr(ref.company) ? { company: cleanStr(ref.company) } : {}),
            ...(cleanStr(ref.contact) ? { contact: cleanStr(ref.contact) } : {}),
          };
        });

      if (!items.length) return null;
      return {
        id: 'section-references',
        type: SectionType.REFERENCES,
        title: 'References',
        enabled: true,
        content: items,
      };
    }
  }
}

export function importJsonResume(input: string | JsonResumeSchema): IResume {
  const schema: JsonResumeSchema =
    typeof input === 'string' ? parseJsonResumeString(input) : input;

  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new Error('JSON Resume root must be a JSON object.');
  }

  const rawBasics =
    schema.basics && typeof schema.basics === 'object' && !Array.isArray(schema.basics)
      ? schema.basics
      : {};

  const name = cleanStr(rawBasics.name);
  const label = cleanStr(rawBasics.label);
  const email = cleanStr(rawBasics.email);
  const phone = cleanStr(rawBasics.phone);
  const url = cleanStr(rawBasics.url) || cleanStr(rawBasics.website);
  const image = cleanStr(rawBasics.image);
  const summary = cleanStr(rawBasics.summary);

  const rawLocation =
    rawBasics.location &&
    typeof rawBasics.location === 'object' &&
    !Array.isArray(rawBasics.location)
      ? rawBasics.location
      : {};

  const profiles: ResumeProfile[] = Array.isArray(rawBasics.profiles)
    ? rawBasics.profiles
        .filter((p): p is JsonResumeProfile => Boolean(p && typeof p === 'object'))
        .map((p) => ({
          ...(cleanStr(p.network) ? { network: cleanStr(p.network) } : {}),
          ...(cleanStr(p.username) ? { username: cleanStr(p.username) } : {}),
          ...(cleanStr(p.url) ? { url: cleanStr(p.url) } : {}),
        }))
        .filter((p) => p.network || p.username || p.url)
    : [];

  // Preserve key ordering from the input JSON object first, then check any remaining recognized keys
  const inputKeys = Object.keys(schema);
  const orderedKeys: RecognizedSectionKey[] = [];
  const seenKeys = new Set<RecognizedSectionKey>();

  inputKeys.forEach((k) => {
    if ((RECOGNIZED_SECTION_KEYS as readonly string[]).includes(k)) {
      const typedKey = k as RecognizedSectionKey;
      if (!seenKeys.has(typedKey)) {
        seenKeys.add(typedKey);
        orderedKeys.push(typedKey);
      }
    }
  });

  RECOGNIZED_SECTION_KEYS.forEach((typedKey) => {
    if (!seenKeys.has(typedKey)) {
      seenKeys.add(typedKey);
      orderedKeys.push(typedKey);
    }
  });

  const sections: ISection[] = [];
  orderedKeys.forEach((key) => {
    const rawArray = schema[key];
    if (Array.isArray(rawArray) && rawArray.length > 0) {
      const built = buildSectionFromKey(key, rawArray);
      if (built) {
        sections.push(built);
      }
    }
  });

  const metaTitle =
    schema.meta && typeof schema.meta === 'object' && typeof schema.meta.title === 'string'
      ? schema.meta.title.trim()
      : '';
  const metaTemplateId =
    schema.meta &&
    typeof schema.meta === 'object' &&
    typeof schema.meta.templateId === 'string'
      ? schema.meta.templateId.trim()
      : '';

  const derivedTitle =
    metaTitle ||
    (name && label ? `${name} — ${label}` : name ? `${name}'s Resume` : 'Imported Resume');

  return {
    title: derivedTitle,
    summary,
    ...(metaTemplateId ? { templateId: metaTemplateId } : {}),
    content: {
      basics: {
        name,
        label,
        email,
        phone,
        summary,
        ...(url ? { url } : {}),
        ...(image ? { image } : {}),
        location: {
          address: cleanStr(rawLocation.address),
          city: cleanStr(rawLocation.city),
          region: cleanStr(rawLocation.region),
          countryCode: cleanStr(rawLocation.countryCode),
          postalCode: cleanStr(rawLocation.postalCode),
        },
        ...(profiles.length > 0 ? { profiles } : {}),
      },
      sections,
      sectionOrder: sections.map((s) => s.id),
    },
  };
}

function getOrderedEnabledSections(resume: IResume): ISection[] {
  const sections = Array.isArray(resume.content?.sections)
    ? resume.content.sections
    : [];
  const order = Array.isArray(resume.content?.sectionOrder)
    ? resume.content.sectionOrder
    : [];

  const seen = new Set<string>();
  const ordered: ISection[] = [];

  order.forEach((id) => {
    const found = sections.find((s) => s && s.id === id);
    if (found && found.enabled !== false && !seen.has(found.id)) {
      seen.add(found.id);
      ordered.push(found);
    }
  });

  sections.forEach((sec) => {
    if (sec && sec.enabled !== false && !seen.has(sec.id)) {
      seen.add(sec.id);
      ordered.push(sec);
    }
  });

  return ordered;
}

function extractSkillKeywordsForExport(item: Record<string, any>): string[] {
  const raw = item.subSkills ?? item.technologies ?? item.keywords;
  if (Array.isArray(raw)) {
    return cleanStringArray(raw);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function exportJsonResume(resume: IResume): JsonResumeSchema {
  const basics = (resume?.content?.basics || {}) as Record<string, any>;
  const resolvedSummary =
    cleanStr(basics.summary) || cleanStr(resume?.summary) || '';
  const loc = (basics.location || {}) as Record<string, any>;

  const profiles: JsonResumeProfile[] = [];
  if (Array.isArray(basics.profiles)) {
    basics.profiles.forEach((p: any) => {
      if (!p || typeof p !== 'object') return;
      const entry = omitEmpty({
        network: cleanStr(p.network),
        username: cleanStr(p.username),
        url: cleanStr(p.url),
      });
      if (Object.keys(entry).length > 0) {
        profiles.push(entry);
      }
    });
  }

  if (cleanStr(basics.linkedin) && !profiles.some((p) => p.url === cleanStr(basics.linkedin))) {
    profiles.push({
      network: 'LinkedIn',
      url: cleanStr(basics.linkedin),
    });
  }
  if (cleanStr(basics.github) && !profiles.some((p) => p.url === cleanStr(basics.github))) {
    profiles.push({
      network: 'GitHub',
      url: cleanStr(basics.github),
    });
  }

  const locationObj = omitEmpty({
    address: cleanStr(loc.address),
    postalCode: cleanStr(loc.postalCode),
    city: cleanStr(loc.city),
    countryCode: cleanStr(loc.countryCode),
    region: cleanStr(loc.region),
  });

  const basicsObj: JsonResumeBasics = omitEmpty({
    name: cleanStr(basics.name),
    label: cleanStr(basics.label),
    image: cleanStr(basics.image),
    email: cleanStr(basics.email),
    phone: cleanStr(basics.phone),
    url: cleanStr(basics.url) || cleanStr(basics.website),
    summary: resolvedSummary,
    ...(Object.keys(locationObj).length > 0 ? { location: locationObj } : {}),
    ...(profiles.length > 0 ? { profiles } : {}),
  });

  const output: JsonResumeSchema = {
    $schema: JSON_RESUME_SCHEMA_V1,
    basics: basicsObj,
  };

  const orderedSections = getOrderedEnabledSections(resume);

  orderedSections.forEach((section) => {
    const items = Array.isArray(section.content)
      ? section.content.filter((it: any) => it && it.enabled !== false)
      : [];
    if (items.length === 0) return;

    switch (section.type) {
      case SectionType.WORK: {
        const mapped: JsonResumeWork[] = items.map((item: any) => {
          const highlights = cleanStringArray(item.highlights);
          const startDate = formatToJsonResumeDate(item.startDate);
          const endDate = item.current ? '' : formatToJsonResumeDate(item.endDate);
          return omitEmpty({
            name: cleanStr(item.name) || cleanStr(item.company),
            position: cleanStr(item.position) || cleanStr(item.role),
            url: cleanStr(item.url) || cleanStr(item.website),
            startDate,
            endDate,
            summary: cleanStr(item.description) || cleanStr(item.summary),
            location: formatLocationValue(item.location),
            ...(highlights.length > 0 ? { highlights } : {}),
          });
        });
        output.work = [...(output.work || []), ...mapped];
        break;
      }

      case SectionType.EDUCATION: {
        const mapped: JsonResumeEducation[] = items.map((item: any) => {
          const explicitInstitution =
            cleanStr(item.institution) || cleanStr(item.school) || cleanStr(item.name);
          const degree = cleanStr(item.degree);
          const field = cleanStr(item.field);

          const institution = explicitInstitution || '';
          const studyType = degree;
          const area = field;

          const startDate = formatToJsonResumeDate(item.startDate);
          const endDate = item.current ? '' : formatToJsonResumeDate(item.endDate);
          const courses = cleanStringArray(item.courses);
          const score = cleanStr(item.score) || cleanStr(item.gpa);

          return omitEmpty({
            institution,
            url: cleanStr(item.url),
            area,
            studyType,
            startDate,
            endDate,
            score,
            ...(courses.length > 0 ? { courses } : {}),
            location: cleanStr(item.location),
            summary: cleanStr(item.description),
          });
        });
        output.education = [...(output.education || []), ...mapped];
        break;
      }

      case SectionType.SKILLS:
      case SectionType.TECK_SKILLS:
      case SectionType.SOFTSKILSS: {
        const mapped: JsonResumeSkill[] = items.map((item: any) => {
          const keywords = extractSkillKeywordsForExport(item);
          const level =
            typeof item.level === 'number' && !Number.isNaN(item.level)
              ? String(item.level)
              : cleanStr(item.level);
          return omitEmpty({
            name: cleanStr(item.name) || cleanStr(item.title),
            level,
            ...(keywords.length > 0 ? { keywords } : {}),
          });
        });
        output.skills = [...(output.skills || []), ...mapped];
        break;
      }

      case SectionType.PROJECTS: {
        const mapped: JsonResumeProject[] = items.map((item: any) => {
          const highlights = cleanStringArray(item.highlights);
          const keywords = extractSkillKeywordsForExport(item);
          const startDate = formatToJsonResumeDate(item.startDate);
          const endDate = item.current ? '' : formatToJsonResumeDate(item.endDate);
          const roles = Array.isArray(item.roles)
            ? cleanStringArray(item.roles)
            : cleanStr(item.position)
            ? cleanStr(item.position)
                .split(',')
                .map((r) => r.trim())
                .filter(Boolean)
            : [];
          return omitEmpty({
            name: cleanStr(item.name) || cleanStr(item.title),
            description: cleanStr(item.description),
            ...(highlights.length > 0 ? { highlights } : {}),
            ...(keywords.length > 0 ? { keywords } : {}),
            startDate,
            endDate,
            url: cleanStr(item.url),
            ...(roles.length > 0 ? { roles } : {}),
            entity: cleanStr(item.company) || cleanStr(item.entity),
            type: cleanStr(item.type),
          });
        });
        output.projects = [...(output.projects || []), ...mapped];
        break;
      }

      case SectionType.LANGUAGES: {
        const mapped: JsonResumeLanguage[] = items.map((item: any) =>
          omitEmpty({
            language: cleanStr(item.name) || cleanStr(item.language),
            fluency: cleanStr(item.level) || cleanStr(item.fluency),
          })
        );
        output.languages = [...(output.languages || []), ...mapped];
        break;
      }

      case SectionType.CERTIFICATES: {
        const mapped: JsonResumeCertificate[] = items.map((item: any) =>
          omitEmpty({
            name: cleanStr(item.name) || cleanStr(item.title),
            date: formatToJsonResumeDate(item.date),
            issuer: cleanStr(item.issuer),
            url: cleanStr(item.url),
            summary: cleanStr(item.description),
          })
        );
        output.certificates = [...(output.certificates || []), ...mapped];
        break;
      }

      case SectionType.AWARDS:
      case SectionType.ACHIVEMENTS: {
        const mapped: JsonResumeAward[] = items.map((item: any) =>
          omitEmpty({
            title: cleanStr(item.name) || cleanStr(item.title),
            date: formatToJsonResumeDate(item.date),
            awarder: cleanStr(item.issuer) || cleanStr(item.awarder),
            summary: cleanStr(item.description),
          })
        );
        output.awards = [...(output.awards || []), ...mapped];
        break;
      }

      case SectionType.PUBLICATIONS: {
        const mapped: JsonResumePublication[] = items.map((item: any) =>
          omitEmpty({
            name: cleanStr(item.title) || cleanStr(item.name),
            publisher: cleanStr(item.publisher),
            releaseDate: formatToJsonResumeDate(item.date),
            url: cleanStr(item.url),
            summary: cleanStr(item.description),
          })
        );
        output.publications = [...(output.publications || []), ...mapped];
        break;
      }

      case SectionType.ORGANIZATIONS: {
        const mapped: JsonResumeVolunteer[] = items.map((item: any) => {
          const highlights = cleanStringArray(item.highlights);
          const startDate = formatToJsonResumeDate(item.startDate);
          const endDate = item.current ? '' : formatToJsonResumeDate(item.endDate);
          return omitEmpty({
            organization: cleanStr(item.name) || cleanStr(item.organization),
            position: cleanStr(item.position),
            url: cleanStr(item.url),
            startDate,
            endDate,
            summary: cleanStr(item.description),
            location: cleanStr(item.location),
            ...(highlights.length > 0 ? { highlights } : {}),
          });
        });
        output.volunteer = [...(output.volunteer || []), ...mapped];
        break;
      }

      case SectionType.INTERESTS: {
        const mapped: JsonResumeInterest[] = items.map((item: any) => {
          const keywords = cleanStringArray(item.keywords);
          return omitEmpty({
            name: cleanStr(item.name) || cleanStr(item.title),
            ...(keywords.length > 0 ? { keywords } : {}),
            summary: cleanStr(item.description),
          });
        });
        output.interests = [...(output.interests || []), ...mapped];
        break;
      }

      case SectionType.REFERENCES: {
        const mapped: JsonResumeReference[] = items.map((item: any) =>
          omitEmpty({
            name: cleanStr(item.name),
            reference: cleanStr(item.description) || cleanStr(item.reference),
            position: cleanStr(item.position),
            company: cleanStr(item.company),
            contact: cleanStr(item.contact) || cleanStr(item.email) || cleanStr(item.phone),
          })
        );
        output.references = [...(output.references || []), ...mapped];
        break;
      }

      default:
        break;
    }
  });

  const metaObj = omitEmpty({
    version: 'v1.0.0',
    title: cleanStr(resume?.title),
    templateId: cleanStr(resume?.templateId),
  });
  if (Object.keys(metaObj).length > 0) {
    output.meta = metaObj;
  }

  return output;
}

export function buildJsonResumeFilename(resume: IResume): string {
  const baseName =
    cleanStr(resume?.title) ||
    cleanStr(resume?.content?.basics?.name) ||
    'resume';
  const slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'resume'}.json`;
}

export function downloadResumeAsJson(resume: IResume): {
  filename: string;
  json: string;
} {
  const schema = exportJsonResume(resume);
  const json = JSON.stringify(schema, null, 2);
  const filename = buildJsonResumeFilename(resume);

  if (typeof document !== 'undefined') {
    const hasObjectUrl =
      typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
    let href: string;
    let shouldRevoke = false;

    if (hasObjectUrl) {
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      href = URL.createObjectURL(blob);
      shouldRevoke = true;
    } else {
      href = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
    }

    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (shouldRevoke && typeof URL.revokeObjectURL === 'function') {
      setTimeout(() => {
        URL.revokeObjectURL(href);
      }, 0);
    }
  }

  return { filename, json };
}
