import { defaultResume } from "../constants/editorConstants";
import { IResume } from "../types/resume";

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

  const profiles = Array.isArray(basics?.profiles) ? basics.profiles : [];
  const findProfileUrl = (networkRegex: RegExp, urlRegex: RegExp): string | undefined => {
    const matched = profiles.find((profile) => {
      if (!profile || typeof profile !== "object") return false;
      const network = typeof profile.network === "string" ? profile.network : "";
      const url = typeof profile.url === "string" ? profile.url : "";
      return networkRegex.test(network) || urlRegex.test(url);
    });
    const candidate = typeof matched?.url === "string" ? matched.url.trim() : "";
    return candidate || undefined;
  };

  const hydratedLinkedin =
    basics?.linkedin !== undefined
      ? basics.linkedin
      : findProfileUrl(/linkedin/i, /linkedin\.com/i);
  const hydratedGithub =
    basics?.github !== undefined
      ? basics.github
      : findProfileUrl(/github/i, /github\.com/i);
  const hydratedUrl =
    basics?.url !== undefined
      ? basics.url
      : basics?.website || basics?.portfolioUrl;

  const sections = Array.isArray(source.content?.sections)
    ? source.content.sections
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
        ...(hydratedUrl !== undefined ? { url: hydratedUrl } : {}),
        ...(hydratedLinkedin !== undefined ? { linkedin: hydratedLinkedin } : {}),
        ...(hydratedGithub !== undefined ? { github: hydratedGithub } : {}),
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
