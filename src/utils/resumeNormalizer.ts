import {
  CanonicalSectionKind,
  resolveSectionKind,
} from "../components/templates/templateHelpers";
import { defaultResume } from "../constants/editorConstants";
import { dateFields, IResume, ISection, SectionType } from "../types/resume";

const omittedSummaryResumes = new WeakSet<object>();

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

const VALID_SECTION_TYPE_MAP = new Map<string, SectionType>(
  Object.values(SectionType).map((val) => [val.toLowerCase(), val])
);

const SPECIFIC_SKILL_ALIAS_MAP: Record<string, SectionType> = {
  technicalskillitem: SectionType.TECK_SKILLS,
  technicalskills: SectionType.TECK_SKILLS,
  technical_skills: SectionType.TECK_SKILLS,
  softskillitem: SectionType.SOFTSKILSS,
  softskills: SectionType.SOFTSKILSS,
  soft_skills: SectionType.SOFTSKILSS,
};

const CANONICAL_KIND_TO_SECTION_TYPE: Record<CanonicalSectionKind, SectionType> = {
  work: SectionType.WORK,
  education: SectionType.EDUCATION,
  projects: SectionType.PROJECTS,
  skills: SectionType.SKILLS,
  languages: SectionType.LANGUAGES,
  certificates: SectionType.CERTIFICATES,
  awards: SectionType.AWARDS,
  courses: SectionType.COURSES,
  organizations: SectionType.ORGANIZATIONS,
  publications: SectionType.PUBLICATIONS,
  references: SectionType.REFERENCES,
  interests: SectionType.INTERESTS,
  achievements: SectionType.ACHIVEMENTS,
  custom: SectionType.CUSTOM,
};

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

export function normalizeSectionType(section: Partial<ISection> | Record<string, any>): SectionType {
  const rawType = typeof section?.type === "string" ? section.type.trim() : "";
  const lowered = rawType.toLowerCase();
  const underscored = lowered.replace(/[\s-]+/g, "_");

  if (VALID_SECTION_TYPE_MAP.has(lowered)) {
    return VALID_SECTION_TYPE_MAP.get(lowered)!;
  }
  if (SPECIFIC_SKILL_ALIAS_MAP[underscored]) {
    return SPECIFIC_SKILL_ALIAS_MAP[underscored];
  }

  // Normalize plural/singular/underscore/hyphen variants via templateHelpers token mappings
  const candidateForHelper = {
    ...section,
    type: underscored,
    id:
      typeof section?.id === "string"
        ? section.id.trim().replace(/[\s-]+/g, "_")
        : "",
    title:
      typeof section?.title === "string"
        ? section.title.trim().replace(/[\s-]+/g, "_")
        : "",
  } as ISection;

  const resolvedKind = resolveSectionKind(candidateForHelper);
  return CANONICAL_KIND_TO_SECTION_TYPE[resolvedKind] || SectionType.CUSTOM;
}

function parseStringDateFields(raw: string): dateFields {
  const trimmed = raw.trim();
  if (!trimmed || /^present|current|now$/i.test(trimmed)) {
    return { month: "", year: "" };
  }
  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) {
    return { month: "", year: yearOnly[1] };
  }
  const namedMonth = trimmed.match(/^([A-Za-z]{3,9})\.?\s+(\d{4})$/);
  if (namedMonth) {
    const short =
      namedMonth[1].charAt(0).toUpperCase() +
      namedMonth[1].slice(1, 3).toLowerCase();
    return { month: short, year: namedMonth[2] };
  }
  return { month: "", year: trimmed };
}

function allocateUniqueId(
  preferredId: unknown,
  fallbackBase: string,
  usedIds: Set<string>
): string {
  const raw = typeof preferredId === "string" ? preferredId.trim() : "";
  const base = raw || fallbackBase;
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }
  let suffix = 2;
  while (usedIds.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  const unique = `${base}-${suffix}`;
  usedIds.add(unique);
  return unique;
}

function normalizeSectionItem(
  rawItem: any,
  sectionType: SectionType,
  sectionId: string,
  itemIndex: number,
  usedItemIds: Set<string>
): any {
  const fallbackId = `${sectionId}-item-${itemIndex + 1}`;

  if (typeof rawItem === "string") {
    const id = allocateUniqueId("", fallbackId, usedItemIds);
    return {
      id,
      name: rawItem,
    };
  }

  if (!rawItem || typeof rawItem !== "object") {
    const id = allocateUniqueId("", fallbackId, usedItemIds);
    return { id };
  }

  const preferredId =
    typeof rawItem.id === "string" && rawItem.id.trim()
      ? rawItem.id
      : typeof rawItem._id === "string" && rawItem._id.trim()
      ? rawItem._id
      : "";
  const resolvedItemId = allocateUniqueId(preferredId, fallbackId, usedItemIds);

  let normalizedItem: Record<string, any> =
    rawItem.id === resolvedItemId ? rawItem : { ...rawItem, id: resolvedItemId };

  if (
    sectionType === SectionType.WORK &&
    !normalizedItem.name &&
    typeof normalizedItem.company === "string" &&
    normalizedItem.company.trim()
  ) {
    normalizedItem = {
      ...normalizedItem,
      name: normalizedItem.company,
    };
  } else if (sectionType === SectionType.EDUCATION) {
    let patched = normalizedItem;
    if (
      !patched.field &&
      typeof patched.institution === "string" &&
      patched.institution.trim()
    ) {
      patched = { ...patched, field: patched.institution };
    }
    if (typeof patched.startDate === "string") {
      patched = { ...patched, startDate: parseStringDateFields(patched.startDate) };
    }
    if (typeof patched.endDate === "string") {
      patched = { ...patched, endDate: parseStringDateFields(patched.endDate) };
    }
    normalizedItem = patched;
  }

  return normalizedItem;
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

  const rawSections = Array.isArray(source.content?.sections)
    ? source.content.sections
    : [];

  const usedSectionIds = new Set<string>();
  const usedItemIds = new Set<string>();
  const sectionIdRemap = new Map<string, string>();

  const sections: ISection[] = rawSections
    .filter((sec): sec is ISection => Boolean(sec && typeof sec === "object"))
    .map((sec, secIdx) => {
      const normalizedType = normalizeSectionType(sec);
      const rawSecId = typeof sec.id === "string" ? sec.id.trim() : "";
      const normalizedSecId = allocateUniqueId(
        rawSecId,
        `section-${secIdx + 1}`,
        usedSectionIds
      );
      if (rawSecId && rawSecId !== normalizedSecId && !sectionIdRemap.has(rawSecId)) {
        sectionIdRemap.set(rawSecId, normalizedSecId);
      }

      const rawTitle = typeof sec.title === "string" ? sec.title.trim() : "";
      const normalizedTitle =
        rawTitle || DEFAULT_SECTION_TITLES[normalizedType] || "Section";

      const rawItems = Array.isArray(sec.content) ? sec.content : [];
      const normalizedItems = rawItems.map((item, itemIdx) =>
        normalizeSectionItem(
          item,
          normalizedType,
          normalizedSecId,
          itemIdx,
          usedItemIds
        )
      );

      return {
        ...sec,
        id: normalizedSecId,
        type: normalizedType,
        title: normalizedTitle,
        content: normalizedItems,
      };
    });

  const validSectionIds = new Set(sections.map((s) => s.id));
  const rawOrder = Array.isArray(source.content?.sectionOrder)
    ? source.content.sectionOrder
    : [];

  const seenOrderIds = new Set<string>();
  const normalizedOrder: string[] = [];
  for (const rawId of rawOrder) {
    if (typeof rawId !== "string") continue;
    const mappedId = sectionIdRemap.get(rawId) || rawId.trim();
    if (mappedId && validSectionIds.has(mappedId) && !seenOrderIds.has(mappedId)) {
      seenOrderIds.add(mappedId);
      normalizedOrder.push(mappedId);
    }
  }

  const missingIds = sections
    .map((s) => s.id)
    .filter((id) => !seenOrderIds.has(id));
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
      sectionOrder: [...normalizedOrder, ...missingIds],
    },
  };
}
