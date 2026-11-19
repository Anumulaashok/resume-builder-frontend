import {
  AwardItem,
  CertificateItem,
  CourseItem,
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
import { parseDateToDateFields } from './jsonResume';

type ParsedBlockKind =
  | 'summary'
  | 'work'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certificates'
  | 'languages'
  | 'awards'
  | 'publications'
  | 'organizations'
  | 'interests'
  | 'references'
  | 'courses';

const HEADING_PATTERNS: Array<{
  kind: ParsedBlockKind;
  defaultTitle: string;
  regex: RegExp;
}> = [
  {
    kind: 'summary',
    defaultTitle: 'Summary',
    regex:
      /^(?:professional\s+summary|executive\s+summary|career\s+summary|summary|about(?:\s+me)?|profile|professional\s+profile|career\s+objective|objective)$/i,
  },
  {
    kind: 'work',
    defaultTitle: 'Professional Experience',
    regex:
      /^(?:work\s+experience|professional\s+experience|relevant\s+experience|employment(?:\s+history)?|work\s+history|career\s+history|experience)$/i,
  },
  {
    kind: 'education',
    defaultTitle: 'Education',
    regex:
      /^(?:education(?:\s*(?:&|and)\s*training)?|academic\s+background|educational\s+background|academics|academic\s+qualifications)$/i,
  },
  {
    kind: 'skills',
    defaultTitle: 'Skills',
    regex:
      /^(?:technical\s+skills|core\s+skills|top\s+skills|key\s+skills|core\s+competencies|skills\s*(?:&|and)\s*(?:technologies|expertise)|technologies|areas\s+of\s+expertise|skills)$/i,
  },
  {
    kind: 'projects',
    defaultTitle: 'Projects',
    regex:
      /^(?:featured\s+projects|selected\s+projects|personal\s+projects|key\s+projects|academic\s+projects|side\s+projects|projects)$/i,
  },
  {
    kind: 'certificates',
    defaultTitle: 'Certifications',
    regex:
      /^(?:licenses\s*(?:&|and)\s*certifications|professional\s+certifications|certifications\s*(?:&|and)\s*licenses|certifications|certificates|credentials)$/i,
  },
  {
    kind: 'languages',
    defaultTitle: 'Languages',
    regex: /^(?:spoken\s+languages|language\s+proficiency|languages)$/i,
  },
  {
    kind: 'awards',
    defaultTitle: 'Awards',
    regex:
      /^(?:honors\s*(?:&|and)\s*awards|awards\s*(?:&|and)\s*honors|honors|awards|achievements|accomplishments)$/i,
  },
  {
    kind: 'publications',
    defaultTitle: 'Publications',
    regex:
      /^(?:research\s*(?:&|and)\s*publications|selected\s+publications|publications|papers)$/i,
  },
  {
    kind: 'organizations',
    defaultTitle: 'Organizations',
    regex:
      /^(?:volunteer\s+experience|volunteering|volunteer|organizations|organisations|leadership\s*(?:&|and)\s*activities|community\s+involvement|affiliations)$/i,
  },
  {
    kind: 'interests',
    defaultTitle: 'Interests',
    regex: /^(?:hobbies\s*(?:&|and)\s*interests|interests|hobbies)$/i,
  },
  {
    kind: 'references',
    defaultTitle: 'References',
    regex: /^references$/i,
  },
  {
    kind: 'courses',
    defaultTitle: 'Courses',
    regex: /^(?:relevant\s+coursework|coursework|courses)$/i,
  },
];

const MONTH_TOKEN =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?';
const SEASON_TOKEN = '(?:Spring|Summer|Fall|Autumn|Winter)';
const DATE_POINT = `(?:${MONTH_TOKEN}\\s+\\d{4}|${SEASON_TOKEN}\\s+\\d{4}|\\d{1,2}[/-]\\d{4}|\\d{4}-\\d{1,2}(?:-\\d{1,2})?|\\d{4})`;
const END_POINT = `(?:Present|Current|Now|Ongoing|Today|${DATE_POINT})`;
const DATE_RANGE_REGEX = new RegExp(
  `\\b(${DATE_POINT})\\s*(?:[-–—]|\\bto\\b)\\s*(${END_POINT})(?!\\d)`,
  'i'
);
const SINGLE_DATE_REGEX = new RegExp(
  `(?:Issued\\s+|Completed\\s+|Graduated\\s+|Class\\s+of\\s+)?\\b(${MONTH_TOKEN}\\s+\\d{4}|${SEASON_TOKEN}\\s+\\d{4}|\\d{4}-\\d{2}(?:-\\d{2})?|\\d{1,2}/\\d{4}|(?:19|20)\\d{2})\\b`,
  'i'
);

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_REGEX =
  /(?:https?:\/\/[^\s|,;)]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s|,;)]*)?)/gi;

const BULLET_PREFIX_REGEX = /^\s*(?:[•●◦▪▸►✓✔*–—-]|(?:\d+\.))\s+/;
const LINKEDIN_DURATION_SUFFIX_REGEX =
  /\s*(?:[·•|]|\()\s*\d+\s*(?:yrs?|years?)(?:\s+\d+\s*(?:mos?|months?))?\s*\)?\s*$/i;
const LINKEDIN_MONTHS_DURATION_SUFFIX_REGEX =
  /\s*(?:[·•|]|\()\s*\d+\s*(?:mos?|months?)\s*\)?\s*$/i;
const LINKEDIN_EMPLOYMENT_BADGE_REGEX =
  /\s*[·•|]\s*(?:Full-time|Part-time|Contract|Freelance|Internship|Self-employed|Apprenticeship|Seasonal)\s*$/i;
const LINKEDIN_WORKPLACE_BADGE_REGEX =
  /\s*[·•|]\s*(?:On-site|Remote|Hybrid)\s*$/i;

const ROLE_KEYWORDS_REGEX =
  /\b(?:engineer|developer|architect|manager|director|designer|analyst|scientist|lead|intern|consultant|specialist|principal|staff|senior|junior|associate|vp|vice\s+president|chief|cto|ceo|cpo|cfo|founder|co-founder|coordinator|administrator|researcher|professor|lecturer|instructor|fellow|advisor|officer|president|chair|maintainer|contributor|head\s+of|product|qa|sre|devops)\b/i;

const COMPANY_KEYWORDS_REGEX =
  /\b(?:inc\.?|llc|corp\.?|corporation|ltd\.?|limited|gmbh|plc|technologies|technology|labs|systems|solutions|group|studio|studios|ventures|partners|consulting|cloud|networks|software|health|bank|capital|media|global|enterprises)\b/i;

const DEGREE_KEYWORDS_REGEX =
  /\b(?:b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|ph\.?d\.?|m\.?b\.?a\.?|b\.?tech|m\.?tech|b\.?sc|m\.?sc|b\.?eng|m\.?eng|bachelor(?:'s)?|master(?:'s)?|doctor(?:ate)?|associate(?:'s)?|diploma|certificate\s+in|jd|md)\b/i;

const INSTITUTION_KEYWORDS_REGEX =
  /\b(?:university|college|institute|school|academy|polytechnic|conservatory)\b/i;

const LINKEDIN_UI_NOISE_REGEX =
  /^(?:contact|500\+\s+connections|\d+\s+connections|\d+\s+followers|connect|message|more|page\s+\d+\s+of\s+\d+|show\s+all\s+.+)$/i;

export interface ExtractedDateRange {
  startDate: string;
  endDate: string;
  current: boolean;
  matchedText: string;
  remainingText: string;
}

function stripLinkedInAnnotations(line: string): string {
  return line
    .replace(LINKEDIN_DURATION_SUFFIX_REGEX, '')
    .replace(LINKEDIN_MONTHS_DURATION_SUFFIX_REGEX, '')
    .replace(LINKEDIN_EMPLOYMENT_BADGE_REGEX, '')
    .replace(LINKEDIN_WORKPLACE_BADGE_REGEX, '')
    .trim();
}

export function extractDateRangeFromLine(rawLine: string): ExtractedDateRange | null {
  const cleaned = stripLinkedInAnnotations(rawLine);
  const match = cleaned.match(DATE_RANGE_REGEX);
  if (!match || match.index === undefined) {
    return null;
  }

  const startRaw = match[1].trim();
  const endRaw = match[2].trim();
  const current = /^(?:present|current|now|ongoing|today)$/i.test(endRaw);

  const before = cleaned.slice(0, match.index);
  const after = cleaned.slice(match.index + match[0].length);
  const remainingText = `${before} ${after}`
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/^[\s|•·,–—-]+|[\s|•·,–—-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    startDate: startRaw,
    endDate: current ? '' : endRaw,
    current,
    matchedText: match[0].trim(),
    remainingText,
  };
}

function extractSingleDateFromLine(
  rawLine: string
): { date: string; remainingText: string } | null {
  const cleaned = stripLinkedInAnnotations(rawLine);
  const match = cleaned.match(SINGLE_DATE_REGEX);
  if (!match || match.index === undefined) {
    return null;
  }
  const before = cleaned.slice(0, match.index);
  const after = cleaned.slice(match.index + match[0].length);
  const remainingText = `${before} ${after}`
    .replace(/\(\s*\)/g, '')
    .replace(/^[\s|•·,–—-]+|[\s|•·,–—-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    date: match[1].trim(),
    remainingText,
  };
}

function isBulletLine(rawLine: string): boolean {
  if (/^\s*[-–—]\s*\d{4}/.test(rawLine)) return false;
  return BULLET_PREFIX_REGEX.test(rawLine);
}

function stripBulletPrefix(rawLine: string): string {
  return rawLine.replace(BULLET_PREFIX_REGEX, '').trim();
}

function detectHeading(rawLine: string): { kind: ParsedBlockKind; title: string } | null {
  if (isBulletLine(rawLine)) return null;
  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.length > 60) return null;
  if (extractDateRangeFromLine(trimmed)) return null;

  // Strip optional markdown '#' or '**' or trailing ':' / '—'
  const normalized = trimmed
    .replace(/^#+\s*/, '')
    .replace(/^\*\*|\*\*$/g, '')
    .replace(/^__+|__+$/g, '')
    .replace(/[:\-–—]+\s*$/, '')
    .trim();

  if (!normalized) return null;

  for (let i = 0; i < HEADING_PATTERNS.length; i += 1) {
    const pattern = HEADING_PATTERNS[i];
    if (pattern.regex.test(normalized)) {
      return {
        kind: pattern.kind,
        title: pattern.defaultTitle,
      };
    }
  }

  return null;
}

function extractPhone(text: string): string {
  // Match phone numbers while avoiding 4-digit year ranges like 2020 - 2024
  const candidates = text.match(
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\d{2,4}[\s.-])\d{3,4}[\s.-]\d{3,4}\b/g
  );
  if (!candidates) return '';
  for (let i = 0; i < candidates.length; i += 1) {
    const raw = candidates[i].trim();
    if (/^(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}$/.test(raw)) {
      continue;
    }
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return raw;
    }
  }
  return '';
}

function extractLinks(text: string): {
  website: string;
  profiles: ResumeProfile[];
  matchedTokens: string[];
} {
  // Remove emails first so domain part of email is not mistaken for a website
  const withoutEmails = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, ' ');
  const matches = withoutEmails.match(URL_REGEX) || [];

  const profiles: ResumeProfile[] = [];
  let website = '';
  const seenUrls = new Set<string>();
  const matchedTokens: string[] = [];

  const commonTlds =
    /\.(?:com|org|net|io|dev|co|ai|me|app|edu|gov|uk|ca|de|fr|in|au|tech|design|xyz)(?:\/|$)/i;

  matches.forEach((rawToken) => {
    const cleaned = rawToken.replace(/[.,;:!?)]+$/, '').trim();
    if (!cleaned) return;
    if (!/^https?:\/\//i.test(cleaned) && !commonTlds.test(cleaned)) {
      return;
    }

    const href = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
    const lower = href.toLowerCase();
    if (seenUrls.has(lower)) return;
    seenUrls.add(lower);
    matchedTokens.push(cleaned);

    if (lower.includes('linkedin.com')) {
      const userMatch = cleaned.match(/linkedin\.com\/in\/([^/?#]+)/i);
      profiles.push({
        network: 'LinkedIn',
        ...(userMatch ? { username: userMatch[1] } : {}),
        url: href,
      });
    } else if (lower.includes('github.com')) {
      const userMatch = cleaned.match(/github\.com\/([^/?#]+)/i);
      profiles.push({
        network: 'GitHub',
        ...(userMatch ? { username: userMatch[1] } : {}),
        url: href,
      });
    } else if (lower.includes('gitlab.com')) {
      profiles.push({ network: 'GitLab', url: href });
    } else if (lower.includes('twitter.com') || lower.includes('x.com')) {
      profiles.push({ network: 'X', url: href });
    } else if (!website) {
      website = href;
    } else {
      profiles.push({ network: 'Portfolio', url: href });
    }
  });

  return { website, profiles, matchedTokens };
}

function looksLikeLocationLine(line: string): boolean {
  const trimmed = stripLinkedInAnnotations(line);
  if (!trimmed || trimmed.length > 65) return false;
  if (EMAIL_REGEX.test(trimmed) || /https?:\/\//i.test(trimmed)) return false;
  if (ROLE_KEYWORDS_REGEX.test(trimmed) || DEGREE_KEYWORDS_REGEX.test(trimmed)) {
    return false;
  }
  // e.g. "San Francisco, CA", "Seattle, WA, USA", "London, United Kingdom", "Greater Boston Area"
  if (/^[A-Z][A-Za-z .'-]+,\s*(?:[A-Z]{2}|[A-Z][A-Za-z .'-]+)(?:,\s*[A-Z][A-Za-z .'-]+)?$/.test(trimmed)) {
    return true;
  }
  if (/\b(?:Bay Area|Metropolitan Area|Greater\s+[A-Z][A-Za-z\s]+Area|Remote)\b/i.test(trimmed)) {
    return true;
  }
  return false;
}

function parseLocationParts(raw: string): {
  city: string;
  region: string;
  countryCode: string;
} {
  const cleaned = stripLinkedInAnnotations(raw);
  const parts = cleaned
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { city: '', region: '', countryCode: '' };
  }
  if (parts.length === 1) {
    return { city: parts[0], region: '', countryCode: '' };
  }
  if (parts.length === 2) {
    const second = parts[1];
    if (/^[A-Z]{2}$/.test(second)) {
      return { city: parts[0], region: second, countryCode: '' };
    }
    return { city: parts[0], region: second, countryCode: '' };
  }
  return {
    city: parts[0],
    region: parts[1],
    countryCode: parts[2].length <= 3 ? parts[2].toUpperCase() : parts[2],
  };
}

function splitRoleAndCompany(text: string): { position: string; company: string } {
  const cleaned = stripLinkedInAnnotations(text);
  if (!cleaned) return { position: '', company: '' };

  // "Senior Engineer at Acme Corp" or "Senior Engineer @ Acme Corp"
  const atMatch = cleaned.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (atMatch) {
    return {
      position: atMatch[1].trim(),
      company: atMatch[2].trim(),
    };
  }

  // Delimiters: " | ", " — ", " – ", " - ", ", "
  const delimiterMatch = cleaned.split(/\s*(?:\||—|–|\s-\s)\s*/).filter(Boolean);
  if (delimiterMatch.length >= 2) {
    const first = delimiterMatch[0].trim();
    const second = delimiterMatch[1].trim();
    const firstIsRole = ROLE_KEYWORDS_REGEX.test(first);
    const secondIsRole = ROLE_KEYWORDS_REGEX.test(second);
    const firstIsCompany = COMPANY_KEYWORDS_REGEX.test(first);
    const secondIsCompany = COMPANY_KEYWORDS_REGEX.test(second);

    if (
      (firstIsCompany && !secondIsCompany && !firstIsRole) ||
      (secondIsRole && !firstIsRole)
    ) {
      return { company: first, position: second };
    }
    if (secondIsCompany && !firstIsCompany) {
      return { position: first, company: second };
    }
    return { position: first, company: second };
  }

  if (ROLE_KEYWORDS_REGEX.test(cleaned) && !COMPANY_KEYWORDS_REGEX.test(cleaned)) {
    return { position: cleaned, company: '' };
  }

  return { position: '', company: cleaned };
}

function parseWorkOrVolunteerItems(
  lines: string[],
  kind: 'work' | 'organizations'
): Array<WorkItem | OrganizationItem> {
  interface DraftEntry {
    headerLines: string[];
    dateInfo: ExtractedDateRange | null;
    location: string;
    bullets: string[];
    paragraphs: string[];
  }

  const entries: DraftEntry[] = [];
  let current: DraftEntry | null = null;
  let pendingHeaderBuffer: string[] = [];

  const createEntryFromPending = (
    dateInfo: ExtractedDateRange | null,
    extraHeader?: string
  ): DraftEntry => {
    const headers = [...pendingHeaderBuffer];
    pendingHeaderBuffer = [];
    if (extraHeader) {
      headers.push(extraHeader);
    }
    const nextEntry: DraftEntry = {
      headerLines: headers,
      dateInfo,
      location: '',
      bullets: [],
      paragraphs: [],
    };
    entries.push(nextEntry);
    return nextEntry;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      // Blank line: if current entry already has content/date, reset so next lines start fresh
      if (current && (current.dateInfo || current.bullets.length > 0 || current.paragraphs.length > 0)) {
        current = null;
      }
      continue;
    }

    if (LINKEDIN_UI_NOISE_REGEX.test(trimmed)) {
      continue;
    }

    if (isBulletLine(raw)) {
      const bulletText = stripBulletPrefix(raw);
      if (!bulletText) continue;
      if (!current) {
        current = createEntryFromPending(null);
      }
      current.bullets.push(bulletText);
      continue;
    }

    const dateRange = extractDateRangeFromLine(trimmed);
    if (dateRange) {
      if (current && !current.dateInfo && current.bullets.length === 0 && current.paragraphs.length === 0) {
        current.dateInfo = dateRange;
        if (dateRange.remainingText) {
          current.headerLines.push(dateRange.remainingText);
        }
      } else {
        current = createEntryFromPending(dateRange, dateRange.remainingText || undefined);
      }
      continue;
    }

    // Non-bullet, non-date line
    const stripped = stripLinkedInAnnotations(trimmed);
    if (!stripped) continue;

    // Check if next 1-2 lines contain a date range -> this line is a header for a new entry!
    const nextLine = (lines[i + 1] || '').trim();
    const nextNextLine = (lines[i + 2] || '').trim();
    const nextHasDate = Boolean(nextLine && !isBulletLine(nextLine) && extractDateRangeFromLine(nextLine));
    const nextNextHasDate = Boolean(
      nextLine &&
        !isBulletLine(nextLine) &&
        nextNextLine &&
        !isBulletLine(nextNextLine) &&
        extractDateRangeFromLine(nextNextLine)
    );

    if (!current) {
      pendingHeaderBuffer.push(stripped);
      if (!nextHasDate && !nextNextHasDate && pendingHeaderBuffer.length >= 2) {
        current = createEntryFromPending(null);
      }
      continue;
    }

    if (nextHasDate || nextNextHasDate) {
      current = null;
      pendingHeaderBuffer.push(stripped);
      continue;
    }

    // Immediately after date line, a short location line like "San Francisco, CA"
    if (
      !current.location &&
      current.bullets.length === 0 &&
      current.paragraphs.length === 0 &&
      looksLikeLocationLine(stripped)
    ) {
      current.location = stripped;
      continue;
    }

    // If current entry hasn't collected bullets/paragraphs yet and only has 1 header line, second short line may be company/role
    if (
      current.headerLines.length < 2 &&
      current.bullets.length === 0 &&
      current.paragraphs.length === 0 &&
      stripped.length <= 70 &&
      !/[.!]$/.test(stripped)
    ) {
      current.headerLines.push(stripped);
      continue;
    }

    current.paragraphs.push(stripped);
  }

  if (pendingHeaderBuffer.length > 0) {
    createEntryFromPending(null);
  }

  return entries
    .map((entry, idx): WorkItem | OrganizationItem | null => {
      let position = '';
      let company = '';
      let location = entry.location;

      if (entry.headerLines.length === 1) {
        const parsed = splitRoleAndCompany(entry.headerLines[0]);
        position = parsed.position;
        company = parsed.company;
      } else if (entry.headerLines.length >= 2) {
        const first = entry.headerLines[0];
        const second = entry.headerLines[1];
        const third = entry.headerLines[2] || '';

        if (!location && third && looksLikeLocationLine(third)) {
          location = third;
        }

        // Check if either line contains both via separator
        if (/\s+(?:at|@)\s+|\s*(?:\||—|–|\s-\s)\s*/i.test(first) && looksLikeLocationLine(second)) {
          const parsed = splitRoleAndCompany(first);
          position = parsed.position;
          company = parsed.company;
          location = location || second;
        } else {
          const firstIsRole = ROLE_KEYWORDS_REGEX.test(first);
          const secondIsRole = ROLE_KEYWORDS_REGEX.test(second);
          const firstIsCompany = COMPANY_KEYWORDS_REGEX.test(first);

          if ((firstIsCompany && !firstIsRole) || (secondIsRole && !firstIsRole)) {
            company = first;
            position = second;
          } else {
            position = first;
            company = second;
          }
        }
      }

      const description = entry.paragraphs.join('\n').trim();
      const highlights = entry.bullets;

      if (!company && !position && !description && highlights.length === 0) {
        return null;
      }

      if (kind === 'organizations') {
        const orgName = company || position;
        const orgRole = company && position ? position : '';
        const orgItem: OrganizationItem = {
          id: `organizations-${idx + 1}`,
          enabled: true,
          name: orgName,
          organization: orgName,
          position: orgRole,
          startDate: entry.dateInfo?.startDate || '',
          endDate: entry.dateInfo?.endDate || '',
          current: Boolean(entry.dateInfo?.current),
          ...(location ? { location } : {}),
          description,
          ...(highlights.length > 0 ? { highlights } : {}),
        };
        return orgItem;
      }

      const workCompany = company || position;
      const workRole = company && position ? position : position || '';
      const workItem: WorkItem = {
        id: `work-${idx + 1}`,
        enabled: true,
        name: workCompany,
        company: workCompany,
        position: workRole,
        startDate: entry.dateInfo?.startDate || '',
        endDate: entry.dateInfo?.endDate || '',
        current: Boolean(entry.dateInfo?.current),
        location,
        description,
        ...(highlights.length > 0 ? { highlights } : {}),
      };
      return workItem;
    })
    .filter((it): it is WorkItem | OrganizationItem => it !== null);
}

function parseEducationItems(lines: string[]): EducationItem[] {
  interface EduDraft {
    lines: string[];
    dateInfo: ExtractedDateRange | null;
    singleYear: string;
    bullets: string[];
  }

  const drafts: EduDraft[] = [];
  let current: EduDraft | null = null;

  const createEduDraft = (): EduDraft => {
    const draft: EduDraft = { lines: [], dateInfo: null, singleYear: '', bullets: [] };
    drafts.push(draft);
    return draft;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) {
      if (current && current.lines.length > 0) {
        current = null;
      }
      continue;
    }

    if (isBulletLine(raw)) {
      if (!current) {
        current = createEduDraft();
      }
      current.bullets.push(stripBulletPrefix(raw));
      continue;
    }

    const dateRange = extractDateRangeFromLine(trimmed);
    if (dateRange) {
      if (!current || current.dateInfo) {
        current = createEduDraft();
      }
      current.dateInfo = dateRange;
      if (dateRange.remainingText) {
        current.lines.push(dateRange.remainingText);
      }
      continue;
    }

    // If current already has both an institution line and a degree line, start a new education entry when another institution/degree header appears
    if (
      current &&
      current.lines.length >= 2 &&
      (INSTITUTION_KEYWORDS_REGEX.test(trimmed) || DEGREE_KEYWORDS_REGEX.test(trimmed))
    ) {
      const hasExistingInst = current.lines.some((l) => INSTITUTION_KEYWORDS_REGEX.test(l));
      const hasExistingDeg = current.lines.some((l) => DEGREE_KEYWORDS_REGEX.test(l));
      if (hasExistingInst && hasExistingDeg) {
        current = null;
      }
    }

    const singleDate = extractSingleDateFromLine(trimmed);
    if (singleDate && !trimmed.includes('GPA')) {
      if (!current) {
        current = createEduDraft();
      }
      if (!current.singleYear) {
        current.singleYear = singleDate.date;
      }
      if (singleDate.remainingText) {
        current.lines.push(singleDate.remainingText);
      }
      continue;
    }

    if (!current) {
      current = createEduDraft();
    }
    current.lines.push(stripLinkedInAnnotations(trimmed));
  }

  return drafts
    .map((draft, idx): EducationItem | null => {
      let institution = '';
      let degree = '';
      let field = '';
      let location = '';
      let score = '';
      const extraDesc: string[] = [];

      // Split pipe/dash combined single-line education headers
      const expandedLines: string[] = [];
      draft.lines.forEach((l) => {
        const parts = l.split(/\s*(?:\||—|–|\s-\s)\s*/).filter(Boolean);
        if (parts.length > 1) {
          parts.forEach((p) => expandedLines.push(p.trim()));
        } else {
          expandedLines.push(l);
        }
      });

      expandedLines.forEach((line) => {
        const gpaMatch = line.match(/\bGPA\s*[:=-]?\s*([\d.]+(?:\s*\/\s*[\d.]+)?)/i);
        if (gpaMatch && !score) {
          score = gpaMatch[1].trim();
          const rest = line.replace(gpaMatch[0], '').replace(/^[\s,·•-]+|[\s,·•-]+$/g, '');
          if (!rest) return;
        }

        if (!institution && INSTITUTION_KEYWORDS_REGEX.test(line)) {
          institution = line;
        } else if (!degree && DEGREE_KEYWORDS_REGEX.test(line)) {
          const inSplit = line.match(/^(.+?)\s+(?:in|of)\s+(.+)$/i);
          if (inSplit && /^(?:b\.?[sa]\.?|m\.?[sa]\.?|ph\.?d\.?|bachelor(?:'s)?|master(?:'s)?|associate(?:'s)?|doctor(?:ate)?)$/i.test(inSplit[1].trim())) {
            degree = inSplit[1].trim();
            field = inSplit[2].trim();
          } else {
            const commaSplit = line.split(',').map((s) => s.trim());
            if (commaSplit.length === 2 && DEGREE_KEYWORDS_REGEX.test(commaSplit[0])) {
              degree = commaSplit[0];
              field = commaSplit[1];
            } else {
              degree = line;
            }
          }
        } else if (!location && looksLikeLocationLine(line)) {
          location = line;
        } else if (!institution) {
          institution = line;
        } else if (!degree) {
          degree = line;
        } else {
          extraDesc.push(line);
        }
      });

      if (!institution && !degree && !field) return null;

      const startDate = draft.dateInfo
        ? parseDateToDateFields(draft.dateInfo.startDate)
        : { month: '', year: '' };
      const endDate = draft.dateInfo
        ? draft.dateInfo.current
          ? { month: '', year: '' }
          : parseDateToDateFields(draft.dateInfo.endDate)
        : draft.singleYear
        ? parseDateToDateFields(draft.singleYear)
        : { month: '', year: '' };

      const description = [...extraDesc, ...draft.bullets].join('\n').trim();

      return {
        id: `education-${idx + 1}`,
        enabled: true,
        institution,
        degree: degree || institution,
        field: degree ? field : '',
        startDate,
        endDate,
        current: Boolean(draft.dateInfo?.current),
        location,
        ...(score ? { score } : {}),
        description,
      };
    })
    .filter((item): item is EducationItem => item !== null);
}

function parseSkillsItems(lines: string[]): SkillItem[] {
  const items: SkillItem[] = [];

  lines.forEach((rawLine) => {
    const cleaned = stripBulletPrefix(rawLine).trim();
    if (!cleaned || LINKEDIN_UI_NOISE_REGEX.test(cleaned)) return;

    // Category: skill1, skill2, skill3
    const colonIdx = cleaned.indexOf(':');
    if (colonIdx > 0 && colonIdx < 38) {
      const category = cleaned.slice(0, colonIdx).trim();
      const rest = cleaned.slice(colonIdx + 1).trim();
      const subSkills = rest
        .split(/\s*[,|•·/]\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (category && subSkills.length > 0) {
        items.push({
          id: `skills-${items.length + 1}`,
          enabled: true,
          name: category,
          subSkills,
        });
        return;
      }
    }

    // Comma, pipe, or bullet-dot separated tokens
    const tokens = cleaned
      .split(/\s*[,|•·]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);

    tokens.forEach((token) => {
      if (!token) return;
      // Optional proficiency in parens e.g. "TypeScript (Expert)"
      const levelMatch = token.match(/^(.+?)\s*\((Beginner|Intermediate|Advanced|Expert|Master|Proficient)\)$/i);
      if (levelMatch) {
        items.push({
          id: `skills-${items.length + 1}`,
          enabled: true,
          name: levelMatch[1].trim(),
          level: levelMatch[2].trim(),
        });
      } else {
        items.push({
          id: `skills-${items.length + 1}`,
          enabled: true,
          name: token,
        });
      }
    });
  });

  return items;
}

function parseProjectItems(lines: string[]): ProjectItem[] {
  interface ProjDraft {
    title: string;
    url: string;
    startDate: string;
    endDate: string;
    current: boolean;
    technologies: string[];
    bullets: string[];
    paragraphs: string[];
  }

  const drafts: ProjDraft[] = [];
  let current: ProjDraft | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      if (current) current = null;
      continue;
    }

    if (isBulletLine(raw)) {
      const bullet = stripBulletPrefix(raw);
      if (!current) {
        current = {
          title: 'Project',
          url: '',
          startDate: '',
          endDate: '',
          current: false,
          technologies: [],
          bullets: [],
          paragraphs: [],
        };
        drafts.push(current);
      }
      current.bullets.push(bullet);
      continue;
    }

    const techPrefixMatch = trimmed.match(
      /^(?:Technologies|Tech\s+Stack|Stack|Built\s+with|Tools)\s*:\s*(.+)$/i
    );
    if (techPrefixMatch && current) {
      const techs = techPrefixMatch[1]
        .split(/\s*[,|•·]\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      current.technologies.push(...techs);
      continue;
    }

    const { website, profiles, matchedTokens } = extractLinks(trimmed);
    const detectedUrl = website || profiles[0]?.url || '';
    let lineWithoutUrl = trimmed;
    matchedTokens.forEach((tok) => {
      lineWithoutUrl = lineWithoutUrl.replace(tok, '').trim();
    });

    const dateRange = extractDateRangeFromLine(lineWithoutUrl);
    const candidateHeader = dateRange ? dateRange.remainingText : lineWithoutUrl;
    const cleanedHeader = candidateHeader
      .replace(/^[\s|•·,–—-]+|[\s|•·,–—-]+$/g, '')
      .trim();

    if (!current) {
      // Check bracketed or pipe tech list on title line: "Lattice UI | React, TypeScript"
      const parts = cleanedHeader.split(/\s*(?:\||—|–|\s-\s)\s*/).filter(Boolean);
      let title = parts[0] || cleanedHeader || 'Project';
      const inlineTechs: string[] = [];
      if (parts.length >= 2 && parts[1].includes(',')) {
        parts[1]
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .forEach((t) => inlineTechs.push(t));
      } else if (parts.length >= 2 && !/[.!]$/.test(parts[1])) {
        title = parts[0];
      }

      current = {
        title,
        url: detectedUrl,
        startDate: dateRange?.startDate || '',
        endDate: dateRange?.endDate || '',
        current: Boolean(dateRange?.current),
        technologies: inlineTechs,
        bullets: [],
        paragraphs:
          parts.length >= 2 && !parts[1].includes(',') ? [parts.slice(1).join(' — ')] : [],
      };
      drafts.push(current);
    } else {
      if (detectedUrl && !current.url) {
        current.url = detectedUrl;
      }
      if (dateRange && !current.startDate) {
        current.startDate = dateRange.startDate;
        current.endDate = dateRange.endDate;
        current.current = dateRange.current;
      }
      if (cleanedHeader) {
        current.paragraphs.push(cleanedHeader);
      }
    }
  }

  return drafts
    .filter((d) => d.title || d.paragraphs.length > 0 || d.bullets.length > 0)
    .map((d, idx) => ({
      id: `projects-${idx + 1}`,
      enabled: true,
      name: d.title,
      description: d.paragraphs.join('\n').trim(),
      startDate: d.startDate,
      endDate: d.endDate,
      current: d.current,
      url: d.url,
      ...(d.technologies.length > 0 ? { technologies: d.technologies } : {}),
      ...(d.bullets.length > 0 ? { highlights: d.bullets } : {}),
    }));
}

function parseCertificateItems(lines: string[]): CertificateItem[] {
  const items: CertificateItem[] = [];
  let buffer: string[] = [];

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    const joined = buffer.join(' | ');
    buffer = [];

    const { website, profiles, matchedTokens } = extractLinks(joined);
    const url = website || profiles[0]?.url || '';
    let working = joined;
    matchedTokens.forEach((tok) => {
      working = working.replace(tok, '').trim();
    });

    const singleDate = extractSingleDateFromLine(working);
    const date = singleDate?.date || '';
    const remainder = singleDate ? singleDate.remainingText : working;
    const rawParts = remainder.includes('|')
      ? remainder.split(/\s*\|\s*/)
      : remainder.split(/\s*(?:—|–|\s-\s)\s*/);
    const parts = rawParts
      .map((s) => s.replace(/^Issued\s+by\s+/i, '').trim())
      .filter((s) => s && !/^Credential\s+ID/i.test(s));

    const name = parts[0] || '';
    const issuer = parts[1] || '';
    if (!name) return;

    items.push({
      id: `certificates-${items.length + 1}`,
      enabled: true,
      name,
      issuer,
      date,
      url,
    });
  };

  lines.forEach((raw) => {
    const trimmed = stripBulletPrefix(raw).trim();
    if (!trimmed) {
      flushBuffer();
      return;
    }
    if (/^Credential\s+ID/i.test(trimmed) || /^Show\s+credential/i.test(trimmed)) {
      return;
    }
    // Single-line certificate with separator or date
    if (isBulletLine(raw) || /\s*(?:\||—|–|\s-\s)\s*/.test(trimmed)) {
      flushBuffer();
      buffer.push(trimmed);
      flushBuffer();
      return;
    }
    buffer.push(trimmed);
    if (/^Issued\s+/i.test(trimmed) || buffer.length >= 3) {
      flushBuffer();
    }
  });
  flushBuffer();

  return items;
}

function parseLanguageItems(lines: string[]): LanguageItem[] {
  const items: LanguageItem[] = [];
  lines.forEach((raw) => {
    const cleaned = stripBulletPrefix(raw).trim();
    if (!cleaned) return;
    const chunks = cleaned.split(/\s*[,;|]\s*/).filter(Boolean);
    chunks.forEach((chunk) => {
      const match = chunk.match(/^(.+?)\s*(?:\((.+?)\)|[:–—-]\s*(.+))$/);
      const name = (match ? match[1] : chunk).trim();
      const level = (match ? match[2] || match[3] || '' : '').trim();
      if (name) {
        items.push({
          id: `languages-${items.length + 1}`,
          enabled: true,
          name,
          language: name,
          level,
          fluency: level,
        });
      }
    });
  });
  return items;
}

function parseAwardItems(lines: string[]): AwardItem[] {
  const items: AwardItem[] = [];
  lines.forEach((raw) => {
    const cleaned = stripBulletPrefix(raw).trim();
    if (!cleaned) return;
    const singleDate = extractSingleDateFromLine(cleaned);
    const remainder = singleDate ? singleDate.remainingText : cleaned;
    const parts = remainder.split(/\s*(?:\||—|–|\s-\s)\s*/).filter(Boolean);
    const title = parts[0] || remainder;
    const issuer = parts[1] || '';
    const description = parts.slice(2).join(' — ');
    if (title) {
      items.push({
        id: `awards-${items.length + 1}`,
        enabled: true,
        name: title,
        title,
        issuer,
        awarder: issuer,
        date: singleDate?.date || '',
        description,
      });
    }
  });
  return items;
}

function parsePublicationItems(lines: string[]): PublicationItem[] {
  const items: PublicationItem[] = [];
  lines.forEach((raw) => {
    const cleaned = stripBulletPrefix(raw).trim();
    if (!cleaned) return;
    const { website, profiles, matchedTokens } = extractLinks(cleaned);
    const url = website || profiles[0]?.url || '';
    let working = cleaned;
    matchedTokens.forEach((t) => {
      working = working.replace(t, '').trim();
    });
    const singleDate = extractSingleDateFromLine(working);
    const remainder = singleDate ? singleDate.remainingText : working;
    const parts = remainder.split(/\s*(?:\||—|–|\s-\s)\s*/).filter(Boolean);
    const title = parts[0] || remainder;
    const publisher = parts[1] || '';
    if (title) {
      items.push({
        id: `publications-${items.length + 1}`,
        enabled: true,
        title,
        publisher,
        date: singleDate?.date || '',
        url,
        description: parts.slice(2).join(' — '),
      });
    }
  });
  return items;
}

function parseInterestItems(lines: string[]): InterestItem[] {
  const items: InterestItem[] = [];
  lines.forEach((raw) => {
    const cleaned = stripBulletPrefix(raw).trim();
    if (!cleaned) return;
    cleaned
      .split(/\s*[,|•·]\s*/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((name) => {
        items.push({
          id: `interests-${items.length + 1}`,
          enabled: true,
          name,
        });
      });
  });
  return items;
}

function parseReferenceItems(lines: string[]): ReferenceItem[] {
  const items: ReferenceItem[] = [];
  lines.forEach((raw) => {
    const cleaned = stripBulletPrefix(raw).trim();
    if (!cleaned) return;
    const parts = cleaned.split(/\s*(?:\||—|–|\s-\s)\s*/).filter(Boolean);
    const name = parts[0] || cleaned;
    const rest = parts.slice(1).join(' · ');
    items.push({
      id: `references-${items.length + 1}`,
      enabled: true,
      name,
      description: rest,
      reference: rest,
    });
  });
  return items;
}

function parseCourseItems(lines: string[]): CourseItem[] {
  const items: CourseItem[] = [];
  lines.forEach((raw) => {
    const cleaned = stripBulletPrefix(raw).trim();
    if (!cleaned) return;
    cleaned
      .split(/\s*[,|•·]\s*/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((courseName) => {
        items.push({
          id: `courses-${items.length + 1}`,
          enabled: true,
          name: courseName,
          course: courseName,
        });
      });
  });
  return items;
}

export function parseResumeText(rawText: string): IResume {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('Please paste resume or profile text to parse.');
  }

  const normalizedLines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  interface RawBlock {
    kind: ParsedBlockKind | 'header';
    title: string;
    lines: string[];
  }

  const blocks: RawBlock[] = [{ kind: 'header', title: 'Header', lines: [] }];

  normalizedLines.forEach((line) => {
    const heading = detectHeading(line);
    if (heading) {
      blocks.push({
        kind: heading.kind,
        title: heading.title,
        lines: [],
      });
    } else {
      blocks[blocks.length - 1].lines.push(line);
    }
  });

  const headerLines = blocks[0].lines;
  const headerText = headerLines.join('\n');

  // Extract contact details primarily from header, falling back to full text for email/phone
  const emailMatch = headerText.match(EMAIL_REGEX) || rawText.match(EMAIL_REGEX);
  const email = emailMatch ? emailMatch[0].trim() : '';
  const phone = extractPhone(headerText) || extractPhone(rawText);
  const { website, profiles, matchedTokens } = extractLinks(headerText);

  let name = '';
  let label = '';
  let locationRaw = '';
  const summaryParts: string[] = [];

  headerLines.forEach((rawLine) => {
    const trimmed = rawLine.trim();
    if (!trimmed || LINKEDIN_UI_NOISE_REGEX.test(trimmed)) return;

    // Remove email, phone, and URLs from header line to see if name/title/location remains
    let stripped = trimmed;
    if (email) stripped = stripped.replace(email, '');
    if (phone) stripped = stripped.replace(phone, '');
    matchedTokens.forEach((tok) => {
      stripped = stripped.replace(tok, '');
    });
    stripped = stripped
      .replace(/^[\s|•·,–—-]+|[\s|•·,–—-]+$/g, '')
      .replace(/(?:\s*[|•·]\s*){2,}/g, ' | ')
      .trim();

    if (!stripped) return;

    if (!name) {
      const pipeParts = stripped
        .split(/\s*(?:\||—|–)\s*/)
        .map((p) => p.trim())
        .filter(Boolean);
      name = pipeParts[0];
      if (pipeParts.length > 1 && !label) {
        if (looksLikeLocationLine(pipeParts[1]) && !locationRaw) {
          locationRaw = pipeParts[1];
        } else {
          label = pipeParts[1];
        }
      }
      if (pipeParts.length > 2 && !locationRaw && looksLikeLocationLine(pipeParts[2])) {
        locationRaw = pipeParts[2];
      }
      return;
    }

    if (!locationRaw && looksLikeLocationLine(stripped)) {
      locationRaw = stripped;
      return;
    }

    if (!label && stripped.length <= 85 && !/[.!]$/.test(stripped)) {
      label = stripped;
      return;
    }

    summaryParts.push(stripped);
  });

  const sections: ISection[] = [];

  for (let i = 1; i < blocks.length; i += 1) {
    const block = blocks[i];
    const nonEmpty = block.lines.some((l) => l.trim().length > 0);
    if (!nonEmpty) continue;

    if (block.kind === 'summary') {
      block.lines.forEach((l) => {
        const cleaned = stripBulletPrefix(l).trim();
        if (cleaned) summaryParts.push(cleaned);
      });
      continue;
    }

    if (block.kind === 'work') {
      const items = parseWorkOrVolunteerItems(block.lines, 'work') as WorkItem[];
      if (items.length > 0) {
        sections.push({
          id: `section-work-${sections.length + 1}`,
          type: SectionType.WORK,
          title: block.title,
          enabled: true,
          content: items,
        });
      }
      continue;
    }

    if (block.kind === 'education') {
      const items = parseEducationItems(block.lines);
      if (items.length > 0) {
        sections.push({
          id: `section-education-${sections.length + 1}`,
          type: SectionType.EDUCATION,
          title: block.title,
          enabled: true,
          content: items,
        });
      }
      continue;
    }

    if (block.kind === 'skills') {
      const items = parseSkillsItems(block.lines);
      if (items.length > 0) {
        sections.push({
          id: `section-skills-${sections.length + 1}`,
          type: SectionType.SKILLS,
          title: block.title,
          enabled: true,
          content: items,
        });
      }
      continue;
    }

    if (block.kind === 'projects') {
      const items = parseProjectItems(block.lines);
      if (items.length > 0) {
        sections.push({
          id: `section-projects-${sections.length + 1}`,
          type: SectionType.PROJECTS,
          title: block.title,
          enabled: true,
          content: items,
        });
      }
      continue;
    }

    if (block.kind === 'certificates') {
      const items = parseCertificateItems(block.lines);
      if (items.length > 0) {
        sections.push({
          id: `section-certificates-${sections.length + 1}`,
          type: SectionType.CERTIFICATES,
          title: block.title,
          enabled: true,
          content: items,
        });
      }
      continue;
    }

    if (block.kind === 'languages') {
      const items = parseLanguageItems(block.lines);
      if (items.length > 0) {
        sections.push({
          id: `section-languages-${sections.length + 1}`,
          type: SectionType.LANGUAGES,
          title: block.title,
          enabled: true,
          content: items,
        });
      }
      continue;
    }

    if (block.kind === 'awards') {
      const items = parseAwardItems(block.lines);
      if (items.length > 0) {
        sections.push({
          id: `section-awards-${sections.length + 1}`,
          type: SectionType.AWARDS,
          title: block.title,
          enabled: true,
          content: items,
        });
      }
      continue;
    }

    if (block.kind === 'publications') {
      const items = parsePublicationItems(block.lines);
      if (items.length > 0) {
        sections.push({
          id: `section-publications-${sections.length + 1}`,
          type: SectionType.PUBLICATIONS,
          title: block.title,
          enabled: true,
          content: items,
        });
      }
      continue;
    }

    if (block.kind === 'organizations') {
      const items = parseWorkOrVolunteerItems(
        block.lines,
        'organizations'
      ) as OrganizationItem[];
      if (items.length > 0) {
        sections.push({
          id: `section-organizations-${sections.length + 1}`,
          type: SectionType.ORGANIZATIONS,
          title: block.title,
          enabled: true,
          content: items,
        });
      }
      continue;
    }

    if (block.kind === 'interests') {
      const items = parseInterestItems(block.lines);
      if (items.length > 0) {
        sections.push({
          id: `section-interests-${sections.length + 1}`,
          type: SectionType.INTERESTS,
          title: block.title,
          enabled: true,
          content: items,
        });
      }
      continue;
    }

    if (block.kind === 'references') {
      const items = parseReferenceItems(block.lines);
      if (items.length > 0) {
        sections.push({
          id: `section-references-${sections.length + 1}`,
          type: SectionType.REFERENCES,
          title: block.title,
          enabled: true,
          content: items,
        });
      }
      continue;
    }

    if (block.kind === 'courses') {
      const items = parseCourseItems(block.lines);
      if (items.length > 0) {
        sections.push({
          id: `section-courses-${sections.length + 1}`,
          type: SectionType.COURSES,
          title: block.title,
          enabled: true,
          content: items,
        });
      }
    }
  }

  const summary = summaryParts.join(' ').trim();
  const parsedLoc = parseLocationParts(locationRaw);
  const title =
    name && label
      ? `${name} — ${label}`
      : name
      ? `${name}'s Resume`
      : 'Imported Resume';

  return {
    title,
    summary,
    content: {
      basics: {
        name,
        label,
        email,
        phone,
        summary,
        ...(website ? { url: website } : {}),
        location: {
          address: '',
          city: parsedLoc.city,
          region: parsedLoc.region,
          countryCode: parsedLoc.countryCode,
          postalCode: '',
        },
        ...(profiles.length > 0 ? { profiles } : {}),
      },
      sections,
      sectionOrder: sections.map((s) => s.id),
    },
  };
}
