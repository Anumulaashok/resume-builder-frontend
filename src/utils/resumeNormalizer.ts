import { defaultResume } from "../constants/editorConstants";
import { IResume, ISection, SectionType } from "../types/resume";

const SECTION_TYPE_ALIAS_MAP: Record<string, SectionType> = {
  work: SectionType.WORK,
  experience: SectionType.WORK,
  workitem: SectionType.WORK,
  education: SectionType.EDUCATION,
  educationitem: SectionType.EDUCATION,
  skills: SectionType.SKILLS,
  skill: SectionType.SKILLS,
  skillitem: SectionType.SKILLS,
  projects: SectionType.PROJECTS,
  project: SectionType.PROJECTS,
  projectitem: SectionType.PROJECTS,
  certificates: SectionType.CERTIFICATES,
  certifications: SectionType.CERTIFICATES,
  certificateitem: SectionType.CERTIFICATES,
  awards: SectionType.AWARDS,
  awarditem: SectionType.AWARDS,
  achievements: SectionType.ACHIVEMENTS,
  achievementitem: SectionType.ACHIVEMENTS,
  languages: SectionType.LANGUAGES,
  languageitem: SectionType.LANGUAGES,
};

function normalizeSectionType(section: ISection): ISection {
  const rawType = String(section?.type || "").trim();
  const mapped = SECTION_TYPE_ALIAS_MAP[rawType.toLowerCase()];
  if (mapped && mapped !== section.type) {
    return { ...section, type: mapped };
  }
  return section;
}

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

  const sections = Array.isArray(source.content?.sections)
    ? source.content.sections.map(normalizeSectionType)
    : [];
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
