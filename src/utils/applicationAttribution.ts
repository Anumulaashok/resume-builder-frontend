import {
  IApplicationAttributionMetrics,
  IApplicationAttributionSummary,
  IJobApplication,
  IResumeAttributionItem,
  ITemplateAttributionItem,
} from '../types/application';

export function hasApplicationReachedInterview(
  app: Pick<IJobApplication, 'status' | 'reachedInterviewAt' | 'stageHistory'>
): boolean {
  if (app.reachedInterviewAt) {
    return true;
  }
  if (app.status === 'interview' || app.status === 'offer') {
    return true;
  }
  if (
    Array.isArray(app.stageHistory) &&
    app.stageHistory.some(
      (entry) => entry?.status === 'interview' || entry?.status === 'offer'
    )
  ) {
    return true;
  }
  return false;
}

function finalizeMetrics(counts: {
  totalApplications: number;
  submittedCount: number;
  interviewCount: number;
  offerCount: number;
}): IApplicationAttributionMetrics {
  const interviewRate =
    counts.submittedCount > 0
      ? Math.round((counts.interviewCount / counts.submittedCount) * 100)
      : 0;
  return {
    ...counts,
    interviewRate,
  };
}

export function computeAttributionSummary(
  applications: IJobApplication[],
  resumes: Array<{
    id?: string;
    _id?: string;
    title?: string;
    templateId?: string;
    template?: string;
  }> = []
): IApplicationAttributionSummary {
  const resumeMeta = new Map<
    string,
    { resumeId: string; title: string; templateId: string }
  >();
  const resumeCounts = new Map<
    string,
    {
      totalApplications: number;
      submittedCount: number;
      interviewCount: number;
      offerCount: number;
    }
  >();
  const templateCounts = new Map<
    string,
    {
      resumeIds: Set<string>;
      totalApplications: number;
      submittedCount: number;
      interviewCount: number;
      offerCount: number;
    }
  >();

  for (const resume of resumes) {
    const rId = String(resume.id || resume._id || '');
    if (!rId) continue;
    if ((resume.title || '').trim() === 'AI Draft') continue;
    const rawTemplate = resume.templateId || resume.template || 'modern';
    const templateId = rawTemplate.trim() || 'modern';
    resumeMeta.set(rId, {
      resumeId: rId,
      title: (resume.title || '').trim() || 'Untitled Resume',
      templateId,
    });
    resumeCounts.set(rId, {
      totalApplications: 0,
      submittedCount: 0,
      interviewCount: 0,
      offerCount: 0,
    });
    if (!templateCounts.has(templateId)) {
      templateCounts.set(templateId, {
        resumeIds: new Set<string>(),
        totalApplications: 0,
        submittedCount: 0,
        interviewCount: 0,
        offerCount: 0,
      });
    }
    templateCounts.get(templateId)!.resumeIds.add(rId);
  }

  const totals = {
    totalApplications: 0,
    submittedCount: 0,
    interviewCount: 0,
    offerCount: 0,
  };
  const unlinked = {
    totalApplications: 0,
    submittedCount: 0,
    interviewCount: 0,
    offerCount: 0,
  };

  for (const app of applications) {
    const isSubmitted = app.status !== 'wishlist';
    const reachedInterview = isSubmitted && hasApplicationReachedInterview(app);
    const isOffer = app.status === 'offer';

    totals.totalApplications += 1;
    if (isSubmitted) totals.submittedCount += 1;
    if (reachedInterview) totals.interviewCount += 1;
    if (isOffer) totals.offerCount += 1;

    const linkedId = app.resumeId ? String(app.resumeId) : '';
    if (!linkedId) {
      unlinked.totalApplications += 1;
      if (isSubmitted) unlinked.submittedCount += 1;
      if (reachedInterview) unlinked.interviewCount += 1;
      if (isOffer) unlinked.offerCount += 1;
      continue;
    }

    if (!resumeMeta.has(linkedId)) {
      resumeMeta.set(linkedId, {
        resumeId: linkedId,
        title: 'Deleted Resume',
        templateId: 'unknown',
      });
    }
    if (!resumeCounts.has(linkedId)) {
      resumeCounts.set(linkedId, {
        totalApplications: 0,
        submittedCount: 0,
        interviewCount: 0,
        offerCount: 0,
      });
    }

    const rBucket = resumeCounts.get(linkedId)!;
    rBucket.totalApplications += 1;
    if (isSubmitted) rBucket.submittedCount += 1;
    if (reachedInterview) rBucket.interviewCount += 1;
    if (isOffer) rBucket.offerCount += 1;

    const meta = resumeMeta.get(linkedId)!;
    if (!templateCounts.has(meta.templateId)) {
      templateCounts.set(meta.templateId, {
        resumeIds: new Set<string>([linkedId]),
        totalApplications: 0,
        submittedCount: 0,
        interviewCount: 0,
        offerCount: 0,
      });
    }
    const tBucket = templateCounts.get(meta.templateId)!;
    tBucket.resumeIds.add(linkedId);
    tBucket.totalApplications += 1;
    if (isSubmitted) tBucket.submittedCount += 1;
    if (reachedInterview) tBucket.interviewCount += 1;
    if (isOffer) tBucket.offerCount += 1;
  }

  const byResume: IResumeAttributionItem[] = Array.from(resumeMeta.values())
    .map((meta) => ({
      ...meta,
      ...finalizeMetrics(resumeCounts.get(meta.resumeId)!),
    }))
    .sort(
      (a, b) =>
        b.submittedCount - a.submittedCount ||
        b.interviewRate - a.interviewRate ||
        a.title.localeCompare(b.title)
    );

  const byTemplate: ITemplateAttributionItem[] = Array.from(
    templateCounts.entries()
  )
    .map(([templateId, bucket]) => ({
      templateId,
      resumeCount: bucket.resumeIds.size,
      ...finalizeMetrics({
        totalApplications: bucket.totalApplications,
        submittedCount: bucket.submittedCount,
        interviewCount: bucket.interviewCount,
        offerCount: bucket.offerCount,
      }),
    }))
    .sort(
      (a, b) =>
        b.submittedCount - a.submittedCount ||
        b.interviewRate - a.interviewRate ||
        a.templateId.localeCompare(b.templateId)
    );

  return {
    totals: finalizeMetrics(totals),
    byResume,
    byTemplate,
    unlinked: finalizeMetrics(unlinked),
  };
}
