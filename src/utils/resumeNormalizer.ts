import { defaultResume } from "../constants/editorConstants";
import { IResume, ISection, SectionType } from "../types/resume";

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

type CanonicalKind =
  | "work"
  | "education"
  | "skills"
  | "projects"
  | "languages"
  | "certificates"
  | "interests"
  | "courses"
  | "awards"
  | "achievements"
  | "organizations"
  | "publications"
  | "references"
  | "custom";

interface AliasMigrationRule {
  canonical: string;
  aliases: string[];
}

const SECTION_ALIAS_RULES: Record<CanonicalKind, AliasMigrationRule[]> = {
  work: [
    { canonical: "company", aliases: ["name", "organization", "employer"] },
    { canonical: "position", aliases: ["role", "jobTitle", "title"] },
    { canonical: "url", aliases: ["website", "link", "liveUrl"] },
    { canonical: "description", aliases: ["summary"] },
  ],
  education: [
    { canonical: "institution", aliases: ["school", "name"] },
    { canonical: "gpa", aliases: ["score"] },
    { canonical: "url", aliases: ["website", "link", "liveUrl"] },
    { canonical: "description", aliases: ["summary"] },
  ],
  skills: [{ canonical: "name", aliases: ["category", "title"] }],
  projects: [
    { canonical: "name", aliases: ["title"] },
    { canonical: "position", aliases: ["role"] },
    { canonical: "company", aliases: ["organization", "entity"] },
    { canonical: "url", aliases: ["website", "link", "liveUrl"] },
    { canonical: "description", aliases: ["summary"] },
  ],
  languages: [
    { canonical: "name", aliases: ["language"] },
    { canonical: "level", aliases: ["fluency"] },
  ],
  certificates: [
    { canonical: "name", aliases: ["title"] },
    { canonical: "url", aliases: ["website", "link", "liveUrl"] },
    { canonical: "description", aliases: ["summary"] },
  ],
  interests: [
    { canonical: "name", aliases: ["title"] },
    { canonical: "description", aliases: ["summary"] },
  ],
  courses: [
    { canonical: "name", aliases: ["course", "title"] },
    { canonical: "institution", aliases: ["school", "issuer"] },
    { canonical: "description", aliases: ["summary"] },
  ],
  awards: [
    { canonical: "name", aliases: ["title"] },
    { canonical: "issuer", aliases: ["awarder"] },
    { canonical: "description", aliases: ["summary"] },
  ],
  achievements: [
    { canonical: "name", aliases: ["title"] },
    { canonical: "issuer", aliases: ["organization", "awarder"] },
    { canonical: "description", aliases: ["summary"] },
  ],
  organizations: [
    { canonical: "name", aliases: ["organization"] },
    { canonical: "position", aliases: ["role"] },
    { canonical: "description", aliases: ["summary"] },
  ],
  publications: [
    { canonical: "title", aliases: ["name"] },
    { canonical: "date", aliases: ["releaseDate"] },
    { canonical: "url", aliases: ["website", "link", "liveUrl"] },
    { canonical: "description", aliases: ["summary"] },
  ],
  references: [
    { canonical: "position", aliases: ["role"] },
    { canonical: "description", aliases: ["reference", "summary"] },
  ],
  custom: [
    { canonical: "title", aliases: ["name"] },
    { canonical: "description", aliases: ["summary"] },
  ],
};

function inferCanonicalKind(
  sectionOrType:
    | SectionType
    | string
    | Pick<ISection, "type" | "id" | "title" | "isCustom">
    | undefined
): CanonicalKind {
  if (!sectionOrType) return "custom";

  const rawType =
    typeof sectionOrType === "string" ? sectionOrType : sectionOrType.type;

  switch (rawType) {
    case SectionType.WORK:
    case "work":
      return "work";
    case SectionType.EDUCATION:
    case "education":
      return "education";
    case SectionType.SKILLS:
    case SectionType.TECK_SKILLS:
    case SectionType.SOFTSKILSS:
    case "skills":
      return "skills";
    case SectionType.PROJECTS:
    case "projects":
      return "projects";
    case SectionType.LANGUAGES:
    case "languages":
      return "languages";
    case SectionType.CERTIFICATES:
    case "certificates":
      return "certificates";
    case SectionType.INTERESTS:
    case "interests":
      return "interests";
    case SectionType.COURSES:
    case "courses":
      return "courses";
    case SectionType.AWARDS:
    case "awards":
      return "awards";
    case SectionType.ACHIVEMENTS:
    case "achievements":
      return "achievements";
    case SectionType.ORGANIZATIONS:
    case "organizations":
      return "organizations";
    case SectionType.PUBLICATIONS:
    case "publications":
      return "publications";
    case SectionType.REFERENCES:
    case "references":
      return "references";
    case SectionType.CUSTOM:
    case "custom":
      if (typeof sectionOrType === "object" && sectionOrType.isCustom) {
        return "custom";
      }
      break;
    default:
      break;
  }

  const hint =
    typeof sectionOrType === "string"
      ? sectionOrType.toLowerCase()
      : `${sectionOrType.id || ""} ${sectionOrType.title || ""}`.toLowerCase();

  if (/work|experience|employment|career/.test(hint)) return "work";
  if (/education|academic|degree|university/.test(hint)) return "education";
  if (/skill|tech|competenc|expertise|tool/.test(hint)) return "skills";
  if (/project|portfolio/.test(hint)) return "projects";
  if (/language/.test(hint)) return "languages";
  if (/certificat|licens|credential/.test(hint)) return "certificates";
  if (/award|honor|honour/.test(hint)) return "awards";
  if (/achiev|accomplish/.test(hint)) return "achievements";
  if (/course|training/.test(hint)) return "courses";
  if (/organization|volunteer|affiliat|community|club/.test(hint))
    return "organizations";
  if (/publication|paper|research/.test(hint)) return "publications";
  if (/reference/.test(hint)) return "references";
  if (/interest|hobb/.test(hint)) return "interests";

  return "custom";
}

function isMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return false;
}

export interface NormalizeSectionItemOptions {
  /**
   * Keys explicitly written in the current edit patch. If a canonical key is in
   * this set (even with an empty string `""`), legacy aliases will NOT overwrite
   * it and will be removed cleanly.
   */
  explicitKeys?: Iterable<string>;
}

export function normalizeSectionItem<T = any>(
  sectionOrType:
    | SectionType
    | string
    | Pick<ISection, "type" | "id" | "title" | "isCustom">
    | undefined,
  item: T,
  options?: NormalizeSectionItemOptions
): T {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return item;
  }

  const kind = inferCanonicalKind(sectionOrType);
  const rules = SECTION_ALIAS_RULES[kind];
  const explicitSet = options?.explicitKeys
    ? new Set(options.explicitKeys)
    : null;
  const next: Record<string, any> = { ...(item as Record<string, any>) };

  // Migrate section-specific composite legacy fields first
  if (kind === "education") {
    const explicitlyEditedDegree = explicitSet?.has("degree");
    const explicitlyEditedField = explicitSet?.has("field");
    if (!explicitlyEditedDegree && !isMeaningfulValue(next.degree) && isMeaningfulValue(next.studyType)) {
      next.degree = next.studyType;
    }
    if (!explicitlyEditedField && !isMeaningfulValue(next.field) && isMeaningfulValue(next.area)) {
      next.field = next.area;
    }
    delete next.studyType;
    delete next.area;
  } else if (kind === "references") {
    const explicitlyEditedContact = explicitSet?.has("contact");
    if (!explicitlyEditedContact && !isMeaningfulValue(next.contact)) {
      const email = typeof next.email === "string" ? next.email.trim() : "";
      const phone = typeof next.phone === "string" ? next.phone.trim() : "";
      const combined = [email, phone].filter(Boolean).join(" · ");
      if (combined) {
        next.contact = combined;
      } else if (next.contact === undefined && ("email" in next || "phone" in next)) {
        next.contact = "";
      }
    }
    delete next.email;
    delete next.phone;
  }

  for (let i = 0; i < rules.length; i += 1) {
    const { canonical, aliases } = rules[i];
    const isExplicit = explicitSet?.has(canonical);

    if (!isExplicit && !isMeaningfulValue(next[canonical])) {
      let migrated: unknown;
      let hadAliasProperty = false;
      for (let j = 0; j < aliases.length; j += 1) {
        const aliasKey = aliases[j];
        if (aliasKey in next) {
          hadAliasProperty = true;
          if (isMeaningfulValue(next[aliasKey])) {
            migrated = next[aliasKey];
            break;
          }
        }
      }
      if (migrated !== undefined) {
        next[canonical] = migrated;
      } else if (next[canonical] === undefined && hadAliasProperty) {
        next[canonical] = "";
      }
    }

    for (let j = 0; j < aliases.length; j += 1) {
      delete next[aliases[j]];
    }
  }

  // Handle inline patches sent to a legacy alias key directly (e.g. external callers)
  if (explicitSet) {
    for (let i = 0; i < rules.length; i += 1) {
      const { canonical, aliases } = rules[i];
      if (!explicitSet.has(canonical)) {
        for (let j = 0; j < aliases.length; j += 1) {
          const aliasKey = aliases[j];
          if (explicitSet.has(aliasKey) && aliasKey in (item as Record<string, any>)) {
            next[canonical] = (item as Record<string, any>)[aliasKey];
            break;
          }
        }
      }
    }
  }

  if (next.isCurrent !== undefined) {
    if (next.current === undefined) {
      next.current = Boolean(next.isCurrent);
    }
    delete next.isCurrent;
  }

  return next as T;
}

export function normalizeSection(section: ISection): ISection {
  if (!section || typeof section !== "object") {
    return section;
  }
  if (!Array.isArray(section.content)) {
    return section;
  }
  return {
    ...section,
    content: section.content.map((item) => normalizeSectionItem(section, item)),
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

  const rawSections = Array.isArray(source.content?.sections)
    ? source.content.sections
    : [];
  const sections = rawSections.map((sec) => normalizeSection(sec));
  const rawOrder = Array.isArray(source.content?.sectionOrder)
    ? source.content.sectionOrder
    : [];
  const missingIds = sections
    .map((s) => s.id)
    .filter((id) => !rawOrder.includes(id));
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
      sectionOrder: [...rawOrder, ...missingIds],
    },
  };
}
