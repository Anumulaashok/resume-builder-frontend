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

  const resolvedUrl =
    typeof basics?.url === "string" && basics.url.length > 0
      ? basics.url
      : typeof basics?.website === "string" && basics.website.length > 0
      ? basics.website
      : typeof basics?.portfolioUrl === "string" && basics.portfolioUrl.length > 0
      ? basics.portfolioUrl
      : basics?.url ?? "";

  const normalizedProfiles = Array.isArray(basics?.profiles)
    ? basics.profiles
        .filter((p) => p && typeof p === "object")
        .map((p) => ({
          network: p.network ?? "",
          username: p.username ?? "",
          url: p.url ?? "",
        }))
    : [];

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
        url: resolvedUrl,
        linkedin: basics?.linkedin ?? "",
        github: basics?.github ?? "",
        summary: resolvedSummary,
        location: {
          ...defaultResume.content.basics.location,
          ...(basics?.location || {}),
          address: basics?.location?.address ?? "",
          city: basics?.location?.city ?? "",
          region: basics?.location?.region ?? "",
          countryCode: basics?.location?.countryCode ?? "",
          postalCode: basics?.location?.postalCode ?? "",
        },
        profiles: normalizedProfiles,
      },
      sections,
      sectionOrder: [...rawOrder, ...missingIds],
    },
  };
}
