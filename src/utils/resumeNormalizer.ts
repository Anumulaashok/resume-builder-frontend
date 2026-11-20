import { defaultResume } from "../constants/editorConstants";
import { dateFields, IResume, ISection, SectionType } from "../types/resume";

const omittedSummaryResumes = new WeakSet<object>();

let runtimeIdCounter = 0;

export function createUniqueItemId(prefix = "item"): string {
  runtimeIdCounter += 1;
  return `${prefix}-${Date.now()}-${runtimeIdCounter.toString(36)}`;
}

export function hasValidIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function markResumeOmittedSummary<T extends object>(resume: T): T {
  if (resume && typeof resume === "object") {
    omittedSummaryResumes.add(resume);
  }
  return resume;
}

export function hasResumeOmittedSummary(resume: unknown): boolean {
  return Boolean(
    resume && typeof resume === "object" && omittedSummaryResumes.has(resume)
  );
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

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

const CANONICAL_SECTION_TYPE_SET = new Set<string>(Object.values(SectionType));

const WORK_ALIASES = new Set([
  SectionType.WORK.toLowerCase(),
  "work",
  "experience",
  "experiences",
  "workexperience",
  "work_experience",
  "professional_experience",
  "professionalexperience",
  "employment",
  "employment_history",
  "career",
  "career_history",
]);

const EDUCATION_ALIASES = new Set([
  SectionType.EDUCATION.toLowerCase(),
  "education",
  "academics",
  "academic",
  "academic_background",
]);

const PROJECT_ALIASES = new Set([
  SectionType.PROJECTS.toLowerCase(),
  "project",
  "projects",
  "personal_projects",
]);

const TECH_SKILL_ALIASES = new Set([
  SectionType.TECK_SKILLS.toLowerCase(),
  "technicalskills",
  "technical_skills",
  "tech_skills",
  "techskills",
]);

const SOFT_SKILL_ALIASES = new Set([
  SectionType.SOFTSKILSS.toLowerCase(),
  "softskills",
  "soft_skills",
]);

const SKILL_ALIASES = new Set([
  SectionType.SKILLS.toLowerCase(),
  "skill",
  "skills",
  "core_skills",
  "competencies",
]);

const LANGUAGE_ALIASES = new Set([
  SectionType.LANGUAGES.toLowerCase(),
  "language",
  "languages",
]);

const CERTIFICATE_ALIASES = new Set([
  SectionType.CERTIFICATES.toLowerCase(),
  "certificate",
  "certificates",
  "certification",
  "certifications",
  "licenses",
]);

const AWARD_ALIASES = new Set([
  SectionType.AWARDS.toLowerCase(),
  "award",
  "awards",
  "honors",
  "honours",
  "honors_and_awards",
]);

const COURSE_ALIASES = new Set([
  SectionType.COURSES.toLowerCase(),
  "course",
  "courses",
  "coursework",
]);

const ORGANIZATION_ALIASES = new Set([
  SectionType.ORGANIZATIONS.toLowerCase(),
  "organization",
  "organizations",
  "volunteer",
  "volunteering",
  "volunteer_experience",
  "affiliations",
  "leadership",
]);

const PUBLICATION_ALIASES = new Set([
  SectionType.PUBLICATIONS.toLowerCase(),
  "publication",
  "publications",
  "papers",
]);

const REFERENCE_ALIASES = new Set([
  SectionType.REFERENCES.toLowerCase(),
  "reference",
  "references",
]);

const INTEREST_ALIASES = new Set([
  SectionType.INTERESTS.toLowerCase(),
  "interest",
  "interests",
  "hobbies",
]);

const ACHIEVEMENT_ALIASES = new Set([
  SectionType.ACHIVEMENTS.toLowerCase(),
  "achievement",
  "achievements",
  "accomplishments",
  "key_achievements",
]);

const CUSTOM_ALIASES = new Set([
  SectionType.CUSTOM.toLowerCase(),
  "custom",
]);

const DEFAULT_SECTION_TITLES: Record<SectionType, string> = {
  [SectionType.WORK]: "Work Experience",
  [SectionType.EDUCATION]: "Education",
  [SectionType.SKILLS]: "Skills",
  [SectionType.LANGUAGES]: "Languages",
  [SectionType.CERTIFICATES]: "Certifications",
  [SectionType.INTERESTS]: "Interests",
  [SectionType.PROJECTS]: "Projects",
  [SectionType.COURSES]: "Courses",
  [SectionType.AWARDS]: "Awards",
  [SectionType.ORGANIZATIONS]: "Organizations",
  [SectionType.PUBLICATIONS]: "Publications",
  [SectionType.REFERENCES]: "References",
  [SectionType.SOFTSKILSS]: "Soft Skills",
  [SectionType.ACHIVEMENTS]: "Achievements",
  [SectionType.TECK_SKILLS]: "Technical Skills",
  [SectionType.CUSTOM]: "Custom Section",
};

const SECTION_ID_PREFIX: Record<SectionType, string> = {
  [SectionType.WORK]: "work",
  [SectionType.EDUCATION]: "education",
  [SectionType.SKILLS]: "skills",
  [SectionType.LANGUAGES]: "languages",
  [SectionType.CERTIFICATES]: "certificates",
  [SectionType.INTERESTS]: "interests",
  [SectionType.PROJECTS]: "projects",
  [SectionType.COURSES]: "courses",
  [SectionType.AWARDS]: "awards",
  [SectionType.ORGANIZATIONS]: "organizations",
  [SectionType.PUBLICATIONS]: "publications",
  [SectionType.REFERENCES]: "references",
  [SectionType.SOFTSKILSS]: "soft-skills",
  [SectionType.ACHIVEMENTS]: "achievements",
  [SectionType.TECK_SKILLS]: "tech-skills",
  [SectionType.CUSTOM]: "custom",
};

const PLACEHOLDER_TOKENS = new Set([
  "string",
  "n/a",
  "na",
  "none",
  "null",
  "undefined",
  "unknown",
  "not provided",
  "not specified",
]);

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isMeaningfulText(value: unknown): value is string {
  const cleaned = cleanString(value);
  if (!cleaned) return false;
  return !PLACEHOLDER_TOKENS.has(cleaned.toLowerCase());
}

export function isValidEmail(value: unknown): boolean {
  const email = cleanString(value);
  if (!email || email.length > 254) return false;
  if (PLACEHOLDER_TOKENS.has(email.toLowerCase())) return false;
  if (/\s/.test(email) || email.includes("..")) return false;

  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain || local.length > 64) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.startsWith("-") ||
    domain.endsWith("-")
  ) {
    return false;
  }

  const domainLabels = domain.split(".");
  if (domainLabels.length < 2) return false;
  const tld = domainLabels[domainLabels.length - 1];
  if (!/^[A-Za-z]{2,63}$/.test(tld)) return false;

  return domainLabels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[A-Za-z0-9-]+$/.test(label) &&
      !label.startsWith("-") &&
      !label.endsWith("-")
  );
}

function matchSectionTypeToken(raw: unknown): SectionType | null {
  const cleaned = cleanString(raw).toLowerCase();
  if (!cleaned) return null;

  const underscored = cleaned.replace(/[\s-]+/g, "_");
  const collapsed = cleaned.replace(/[\s_-]+/g, "");
  const candidates = [cleaned, underscored, collapsed];

  for (const token of candidates) {
    if (WORK_ALIASES.has(token)) return SectionType.WORK;
    if (EDUCATION_ALIASES.has(token)) return SectionType.EDUCATION;
    if (PROJECT_ALIASES.has(token)) return SectionType.PROJECTS;
    if (TECH_SKILL_ALIASES.has(token)) return SectionType.TECK_SKILLS;
    if (SOFT_SKILL_ALIASES.has(token)) return SectionType.SOFTSKILSS;
    if (SKILL_ALIASES.has(token)) return SectionType.SKILLS;
    if (LANGUAGE_ALIASES.has(token)) return SectionType.LANGUAGES;
    if (CERTIFICATE_ALIASES.has(token)) return SectionType.CERTIFICATES;
    if (AWARD_ALIASES.has(token)) return SectionType.AWARDS;
    if (COURSE_ALIASES.has(token)) return SectionType.COURSES;
    if (ORGANIZATION_ALIASES.has(token)) return SectionType.ORGANIZATIONS;
    if (PUBLICATION_ALIASES.has(token)) return SectionType.PUBLICATIONS;
    if (REFERENCE_ALIASES.has(token)) return SectionType.REFERENCES;
    if (INTEREST_ALIASES.has(token)) return SectionType.INTERESTS;
    if (ACHIEVEMENT_ALIASES.has(token)) return SectionType.ACHIVEMENTS;
    if (CUSTOM_ALIASES.has(token)) return SectionType.CUSTOM;
  }

  return null;
}

export function resolveCanonicalSectionType(section?: {
  type?: unknown;
  id?: unknown;
  title?: unknown;
  isCustom?: unknown;
}): { type: SectionType; isCustom: boolean } {
  const byType = matchSectionTypeToken(section?.type);
  if (byType) {
    return {
      type: byType,
      isCustom: byType === SectionType.CUSTOM || Boolean(section?.isCustom),
    };
  }

  const byId = matchSectionTypeToken(section?.id);
  if (byId) {
    return {
      type: byId,
      isCustom: byId === SectionType.CUSTOM,
    };
  }

  const byTitle = matchSectionTypeToken(section?.title);
  if (byTitle) {
    return {
      type: byTitle,
      isCustom: byTitle === SectionType.CUSTOM,
    };
  }

  return {
    type: SectionType.CUSTOM,
    isCustom: true,
  };
}

export function normalizeSectionType(
  rawType: unknown,
  fallback?: { id?: unknown; title?: unknown; isCustom?: unknown }
): SectionType {
  return resolveCanonicalSectionType({
    type: rawType,
    id: fallback?.id,
    title: fallback?.title,
    isCustom: fallback?.isCustom,
  }).type;
}

function humanizeToken(raw: string): string {
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function parseMonthIndex(rawMonth: unknown): number | null {
  if (
    typeof rawMonth === "number" &&
    Number.isInteger(rawMonth) &&
    rawMonth >= 1 &&
    rawMonth <= 12
  ) {
    return rawMonth;
  }
  if (typeof rawMonth !== "string") return null;
  const trimmed = rawMonth.trim().toLowerCase().replace(/\.$/, "");
  if (!trimmed) return null;
  if (MONTH_INDEX_MAP[trimmed]) return MONTH_INDEX_MAP[trimmed];
  const numeric = Number(trimmed);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    return numeric;
  }
  return null;
}

export function isPresentDateValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^(present|current|now|ongoing|today)$/i.test(value.trim());
}

export function normalizeEducationDate(raw: unknown): dateFields {
  if (raw === null || raw === undefined) {
    return { month: "", year: "" };
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { month: "", year: String(Math.trunc(raw)) };
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    const monthIdx = parseMonthIndex(record.month);
    const rawMonthStr =
      typeof record.month === "string" || typeof record.month === "number"
        ? String(record.month).trim()
        : "";
    const rawYearStr =
      typeof record.year === "string" || typeof record.year === "number"
        ? String(record.year).trim()
        : "";
    if (isPresentDateValue(rawYearStr) || isPresentDateValue(rawMonthStr)) {
      return { month: "", year: "" };
    }
    return {
      month: monthIdx ? SHORT_MONTHS[monthIdx - 1] : rawMonthStr,
      year: rawYearStr,
    };
  }

  if (typeof raw !== "string") {
    return { month: "", year: "" };
  }

  const str = raw.trim();
  if (!str || isPresentDateValue(str) || PLACEHOLDER_TOKENS.has(str.toLowerCase())) {
    return { month: "", year: "" };
  }

  // YYYY-MM or YYYY-MM-DD or YYYY/MM
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?$/);
  if (isoMatch) {
    const monthIdx = parseMonthIndex(isoMatch[2]);
    return {
      month: monthIdx ? SHORT_MONTHS[monthIdx - 1] : "",
      year: isoMatch[1],
    };
  }

  // MM/YYYY or MM-YYYY
  const slashMatch = str.match(/^(\d{1,2})[-/](\d{4})$/);
  if (slashMatch) {
    const monthIdx = parseMonthIndex(slashMatch[1]);
    return {
      month: monthIdx ? SHORT_MONTHS[monthIdx - 1] : "",
      year: slashMatch[2],
    };
  }

  // Month YYYY (e.g. "Sep 2018", "September 2018")
  const namedMatch = str.match(/^([A-Za-z.]+)\s*,?\s*(\d{4})$/);
  if (namedMatch) {
    const monthIdx = parseMonthIndex(namedMatch[1]);
    return {
      month: monthIdx
        ? SHORT_MONTHS[monthIdx - 1]
        : namedMatch[1].replace(/\.$/, ""),
      year: namedMatch[2],
    };
  }

  // YYYY Month
  const yearFirstNamed = str.match(/^(\d{4})\s+([A-Za-z.]+)$/);
  if (yearFirstNamed) {
    const monthIdx = parseMonthIndex(yearFirstNamed[2]);
    return {
      month: monthIdx ? SHORT_MONTHS[monthIdx - 1] : "",
      year: yearFirstNamed[1],
    };
  }

  // YYYY only
  const yearMatch = str.match(/^(\d{4})$/);
  if (yearMatch) {
    return { month: "", year: yearMatch[1] };
  }

  // Embedded Month YYYY or 4-digit year
  const embeddedNamed = str.match(/\b([A-Za-z]{3,9})\.?\s+(\d{4})\b/);
  if (embeddedNamed) {
    const monthIdx = parseMonthIndex(embeddedNamed[1]);
    if (monthIdx) {
      return { month: SHORT_MONTHS[monthIdx - 1], year: embeddedNamed[2] };
    }
  }
  const embeddedYear = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (embeddedYear) {
    return { month: "", year: embeddedYear[1] };
  }

  return { month: "", year: str };
}

function slugifyIdPart(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function allocateUniqueId(base: string, usedIds: Set<string>): string {
  let candidate = base || "id-1";
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function isNormalizedEducationDateObject(val: unknown): boolean {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  const rec = val as Record<string, unknown>;
  if (typeof rec.month !== "string" || typeof rec.year !== "string") return false;
  if (!rec.month) return true;
  return (SHORT_MONTHS as readonly string[]).includes(rec.month);
}

function normalizeSectionItem(
  rawItem: unknown,
  sectionType: SectionType,
  sectionId: string,
  itemIndex: number,
  usedItemIds: Set<string>,
  reservedItemIds: Set<string>
): any {
  if (rawItem === null || rawItem === undefined || typeof rawItem === "boolean") {
    return null;
  }

  let baseObj: Record<string, any>;
  if (typeof rawItem === "string") {
    const trimmed = rawItem.trim();
    if (!trimmed) return null;
    if (sectionType === SectionType.PUBLICATIONS) {
      baseObj = { title: trimmed };
    } else if (sectionType === SectionType.CUSTOM) {
      baseObj = { title: trimmed, name: trimmed };
    } else {
      baseObj = { name: trimmed };
    }
  } else if (typeof rawItem === "object" && !Array.isArray(rawItem)) {
    baseObj = { ...(rawItem as Record<string, any>) };
  } else {
    return null;
  }

  const candidateId = cleanString(baseObj.id) || cleanString(baseObj._id);
  let resolvedId: string;
  if (candidateId && !usedItemIds.has(candidateId)) {
    resolvedId = candidateId;
    usedItemIds.add(resolvedId);
  } else {
    const combinedUnavailable = new Set<string>([
      ...Array.from(usedItemIds),
      ...Array.from(reservedItemIds),
    ]);
    resolvedId = allocateUniqueId(
      `${sectionId}-item-${itemIndex + 1}`,
      combinedUnavailable
    );
    usedItemIds.add(resolvedId);
  }

  const normalized: Record<string, any> = {
    ...baseObj,
    id: resolvedId,
  };

  if (sectionType === SectionType.EDUCATION) {
    const studyType = cleanString(normalized.studyType);
    const area = cleanString(normalized.area);
    const school =
      cleanString(normalized.institution) ||
      cleanString(normalized.school) ||
      cleanString(normalized.university) ||
      cleanString(normalized.college);

    if (!cleanString(normalized.institution) && school) {
      normalized.institution = school;
    }
    if (!cleanString(normalized.degree) && (studyType || area)) {
      normalized.degree = studyType || area;
    }
    if (!cleanString(normalized.field) && studyType && area) {
      normalized.field = area;
    }

    let rawEnd = normalized.endDate;
    if (
      normalized.startDate === undefined &&
      rawEnd === undefined &&
      (normalized.date !== undefined ||
        normalized.graduationDate !== undefined ||
        normalized.year !== undefined)
    ) {
      rawEnd = normalized.date ?? normalized.graduationDate ?? normalized.year;
    }

    const endIndicatesCurrent = isPresentDateValue(rawEnd);
    if (endIndicatesCurrent && normalized.current === undefined) {
      normalized.current = true;
    }

    if (
      normalized.startDate !== undefined &&
      !isNormalizedEducationDateObject(normalized.startDate)
    ) {
      normalized.startDate = normalizeEducationDate(normalized.startDate);
    }

    if (endIndicatesCurrent) {
      normalized.endDate = { month: "", year: "" };
    } else if (
      rawEnd !== undefined &&
      !isNormalizedEducationDateObject(rawEnd)
    ) {
      normalized.endDate = normalizeEducationDate(rawEnd);
    }

    if (
      normalized.description === undefined &&
      typeof normalized.summary === "string"
    ) {
      normalized.description = normalized.summary;
    }
    return normalized;
  }

  if (sectionType === SectionType.WORK) {
    const resolvedCompany =
      cleanString(normalized.company) ||
      cleanString(normalized.name) ||
      cleanString(normalized.employer) ||
      cleanString(normalized.organization);
    if (!cleanString(normalized.name) && resolvedCompany) {
      normalized.name = resolvedCompany;
    }
    const resolvedPosition =
      cleanString(normalized.position) ||
      cleanString(normalized.role) ||
      cleanString(normalized.jobTitle) ||
      cleanString(normalized.title);
    if (!cleanString(normalized.position) && resolvedPosition) {
      normalized.position = resolvedPosition;
    }
    if (isPresentDateValue(normalized.endDate)) {
      if (normalized.current === undefined) normalized.current = true;
      normalized.endDate = "";
    }
    if (
      normalized.description === undefined &&
      typeof normalized.summary === "string"
    ) {
      normalized.description = normalized.summary;
    }
    return normalized;
  }

  if (
    sectionType === SectionType.SKILLS ||
    sectionType === SectionType.TECK_SKILLS ||
    sectionType === SectionType.SOFTSKILSS
  ) {
    if (!cleanString(normalized.name)) {
      const fallbackName =
        cleanString(normalized.category) ||
        cleanString(normalized.title) ||
        cleanString(normalized.skill);
      if (fallbackName) normalized.name = fallbackName;
    }
    if (
      sectionType === SectionType.SKILLS &&
      normalized.subSkills === undefined &&
      Array.isArray(normalized.keywords)
    ) {
      normalized.subSkills = normalized.keywords
        .map((kw: unknown) => cleanString(kw))
        .filter(Boolean);
    }
    if (
      sectionType === SectionType.TECK_SKILLS &&
      normalized.technologies === undefined &&
      Array.isArray(normalized.keywords)
    ) {
      normalized.technologies = normalized.keywords
        .map((kw: unknown) => cleanString(kw))
        .filter(Boolean);
    }
    return normalized;
  }

  if (sectionType === SectionType.PROJECTS) {
    if (!cleanString(normalized.name) && cleanString(normalized.title)) {
      normalized.name = cleanString(normalized.title);
    }
    if (
      normalized.technologies === undefined &&
      Array.isArray(normalized.keywords)
    ) {
      normalized.technologies = normalized.keywords
        .map((kw: unknown) => cleanString(kw))
        .filter(Boolean);
    }
    return normalized;
  }

  if (sectionType === SectionType.LANGUAGES) {
    if (!cleanString(normalized.name) && cleanString(normalized.language)) {
      normalized.name = cleanString(normalized.language);
    }
    if (normalized.level === undefined && cleanString(normalized.fluency)) {
      normalized.level = cleanString(normalized.fluency);
    }
    return normalized;
  }

  if (sectionType === SectionType.PUBLICATIONS) {
    if (!cleanString(normalized.title) && cleanString(normalized.name)) {
      normalized.title = cleanString(normalized.name);
    }
    return normalized;
  }

  if (sectionType === SectionType.CUSTOM) {
    if (!cleanString(normalized.title) && cleanString(normalized.name)) {
      normalized.title = cleanString(normalized.name);
    }
    return normalized;
  }

  if (!cleanString(normalized.name) && cleanString(normalized.title)) {
    normalized.name = cleanString(normalized.title);
  }

  return normalized;
}

export function normalizeSectionsAndOrder(
  rawSections: unknown,
  rawSectionOrder?: unknown
): { sections: ISection[]; sectionOrder: string[] } {
  const inputSections = Array.isArray(rawSections) ? rawSections : [];

  const reservedSectionIds = new Set<string>();
  const reservedItemIds = new Set<string>();

  for (const rawSec of inputSections) {
    if (!rawSec || typeof rawSec !== "object") continue;
    const secId = cleanString((rawSec as any).id);
    if (secId) reservedSectionIds.add(secId);
    const items = Array.isArray((rawSec as any).content)
      ? (rawSec as any).content
      : [];
    for (const rawIt of items) {
      if (rawIt && typeof rawIt === "object") {
        const itId =
          cleanString((rawIt as any).id) || cleanString((rawIt as any)._id);
        if (itId) reservedItemIds.add(itId);
      }
    }
  }

  const usedSectionIds = new Set<string>();
  const usedItemIds = new Set<string>();
  const rawIdToFinalId = new Map<string, string>();
  const normalizedSections: ISection[] = [];

  inputSections.forEach((rawSec, secIdx) => {
    if (!rawSec || typeof rawSec !== "object" || Array.isArray(rawSec)) {
      return;
    }

    const secRecord = rawSec as Record<string, any>;
    const { type, isCustom } = resolveCanonicalSectionType(secRecord);

    const rawTitle = cleanString(secRecord.title);
    const rawTypeLabel = cleanString(secRecord.type);
    const resolvedTitle =
      rawTitle ||
      (isCustom &&
      rawTypeLabel &&
      rawTypeLabel.toLowerCase() !== SectionType.CUSTOM.toLowerCase()
        ? humanizeToken(rawTypeLabel)
        : DEFAULT_SECTION_TITLES[type]);

    const rawSecId = cleanString(secRecord.id);
    let finalSecId: string;
    if (rawSecId && !usedSectionIds.has(rawSecId)) {
      finalSecId = rawSecId;
      usedSectionIds.add(finalSecId);
      rawIdToFinalId.set(rawSecId, finalSecId);
    } else {
      const combinedUnavailable = new Set<string>([
        ...Array.from(usedSectionIds),
        ...Array.from(reservedSectionIds),
      ]);
      const prefix =
        type === SectionType.CUSTOM
          ? slugifyIdPart(resolvedTitle) || SECTION_ID_PREFIX[type]
          : SECTION_ID_PREFIX[type];
      finalSecId = allocateUniqueId(
        `${prefix}-${secIdx + 1}`,
        combinedUnavailable
      );
      usedSectionIds.add(finalSecId);
      if (rawSecId && !rawIdToFinalId.has(rawSecId)) {
        rawIdToFinalId.set(rawSecId, finalSecId);
      }
    }

    const rawItems = Array.isArray(secRecord.content) ? secRecord.content : [];
    const normalizedItems: any[] = [];
    rawItems.forEach((rawIt, itemIdx) => {
      const item = normalizeSectionItem(
        rawIt,
        type,
        finalSecId,
        itemIdx,
        usedItemIds,
        reservedItemIds
      );
      if (item) {
        normalizedItems.push(item);
      }
    });

    const normalizedSection: ISection = {
      ...secRecord,
      id: finalSecId,
      type,
      title: resolvedTitle,
      content: normalizedItems,
      ...(isCustom ? { isCustom: true } : {}),
    };

    normalizedSections.push(normalizedSection);
  });

  const validFinalSectionIds = new Set(normalizedSections.map((s) => s.id));
  const orderedIds: string[] = [];
  const seenInOrder = new Set<string>();

  if (Array.isArray(rawSectionOrder)) {
    for (const rawEntry of rawSectionOrder) {
      const cleaned = cleanString(rawEntry);
      if (!cleaned) continue;
      const mapped = validFinalSectionIds.has(cleaned)
        ? cleaned
        : rawIdToFinalId.get(cleaned);
      if (mapped && validFinalSectionIds.has(mapped) && !seenInOrder.has(mapped)) {
        seenInOrder.add(mapped);
        orderedIds.push(mapped);
      }
    }
  }

  for (const sec of normalizedSections) {
    if (!seenInOrder.has(sec.id)) {
      seenInOrder.add(sec.id);
      orderedIds.push(sec.id);
    }
  }

  return {
    sections: normalizedSections,
    sectionOrder: orderedIds,
  };
}

export function normalizeGeneratedResumePayload<T extends Partial<IResume>>(
  resume: T,
  fallbackBasics?: { name?: string; email?: string }
): T {
  if (!resume || typeof resume !== "object") {
    return resume;
  }

  const resolvedId = resume._id || resume.id;
  const rawContent = resume.content;
  const rawBasics = rawContent?.basics || {};

  const resolvedName = isMeaningfulText(rawBasics.name)
    ? rawBasics.name.trim()
    : isMeaningfulText(fallbackBasics?.name)
    ? fallbackBasics!.name!.trim()
    : rawBasics.name ?? "";

  const candidateEmail = cleanString(rawBasics.email);
  const fallbackEmail = cleanString(fallbackBasics?.email);
  const resolvedEmail = isValidEmail(candidateEmail)
    ? candidateEmail
    : isValidEmail(fallbackEmail)
    ? fallbackEmail
    : fallbackBasics
    ? "you@example.com"
    : candidateEmail;

  const { sections, sectionOrder } = normalizeSectionsAndOrder(
    rawContent?.sections,
    rawContent?.sectionOrder
  );

  return {
    ...resume,
    ...(resolvedId
      ? {
          _id: resume._id || resolvedId,
          id: resume.id || resolvedId,
        }
      : {}),
    content: {
      ...(rawContent || {}),
      basics: {
        ...rawBasics,
        name: resolvedName,
        email: resolvedEmail,
      },
      sections,
      sectionOrder,
    },
  };
}

export function ensureTemplateResumeIds(resume: IResume): IResume {
  if (!resume || !resume.content || !Array.isArray(resume.content.sections)) {
    return resume;
  }

  const seenSecIds = new Set<string>();
  const seenItemIds = new Set<string>();
  let needsNormalization = false;

  for (const sec of resume.content.sections) {
    if (!sec || typeof sec !== "object") {
      needsNormalization = true;
      break;
    }
    const secId = cleanString(sec.id);
    if (!secId || seenSecIds.has(secId)) {
      needsNormalization = true;
      break;
    }
    seenSecIds.add(secId);

    if (!CANONICAL_SECTION_TYPE_SET.has(String(sec.type || ""))) {
      needsNormalization = true;
      break;
    }

    if (Array.isArray(sec.content)) {
      for (const item of sec.content) {
        if (typeof item === "string") {
          needsNormalization = true;
          break;
        }
        if (item && typeof item === "object") {
          const itemId = cleanString((item as any).id);
          if (!itemId || seenItemIds.has(itemId)) {
            needsNormalization = true;
            break;
          }
          seenItemIds.add(itemId);
        }
      }
    }

    if (needsNormalization) break;
  }

  if (!needsNormalization) {
    return resume;
  }

  const { sections, sectionOrder } = normalizeSectionsAndOrder(
    resume.content.sections,
    resume.content.sectionOrder
  );

  return {
    ...resume,
    content: {
      ...resume.content,
      sections,
      sectionOrder,
    },
  };
}

export function normalizeResume(input?: IResume): IResume {
  const source = input || defaultResume;
  const basics = source.content?.basics || defaultResume.content.basics;
  const rawBasicsSummary = basics?.summary;
  const rawTopSummary = source.summary;

  const resolvedSummary =
    typeof rawBasicsSummary === "string" && rawBasicsSummary.length > 0
      ? rawBasicsSummary
      : typeof rawTopSummary === "string" && rawTopSummary.length > 0
      ? rawTopSummary
      : rawBasicsSummary ?? rawTopSummary ?? "";

  const { sections, sectionOrder } = normalizeSectionsAndOrder(
    source.content?.sections,
    source.content?.sectionOrder
  );
  const resolvedId = source._id || source.id;

  return {
    ...defaultResume,
    ...source,
    ...(resolvedId
      ? {
          _id: source._id || resolvedId,
          id: source.id || resolvedId,
        }
      : {}),
    title: source.title ?? defaultResume.title ?? "Untitled Resume",
    summary: resolvedSummary,
    content: {
      ...defaultResume.content,
      ...source.content,
      basics: {
        ...defaultResume.content.basics,
        ...basics,
        name: basics?.name ?? "",
        label: basics?.label ?? "",
        email: basics?.email ?? "",
        phone: basics?.phone ?? "",
        summary: resolvedSummary,
        location: {
          ...defaultResume.content.basics.location,
          ...(basics?.location || {}),
        },
      },
      sections,
      sectionOrder,
    },
  };
}
