import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowPathIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClockIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  MapPinIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  APPLICATION_COLUMNS,
  APPLICATION_STATUSES,
  ApplicationReorderMove,
  ApplicationStatus,
  IJobApplication,
  UpsertApplicationPayload,
} from '../../types/application';
import { ICoverLetter } from '../../types/coverLetter';
import { applicationService } from '../../services/application.service';
import { coverLetterService } from '../../services/coverLetter.service';
import { ResumeWithMeta, resumeService } from '../../services/resume.service';
import { Skeleton } from '../ui/skeleton';
import { ApplicationDrawer, CheckMatchPrefill } from './ApplicationDrawer';

interface JobTrackerProps {
  onCheckMatch: (prefill: CheckMatchPrefill) => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcMidnightMs(input?: string | Date | null): number | null {
  if (!input) return null;
  if (typeof input === 'string') {
    const ymd = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) {
      return Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    }
  }
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function todayUtcMidnightMs(now: Date = new Date()): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

export function formatDaysSinceApplied(appliedAt?: string | null, now: Date = new Date()): string {
  const appliedMs = toUtcMidnightMs(appliedAt);
  if (appliedMs === null) {
    return 'Not applied yet';
  }
  const todayMs = todayUtcMidnightMs(now);
  const diffDays = Math.max(0, Math.floor((todayMs - appliedMs) / MS_PER_DAY));
  if (diffDays === 0) return 'Applied today';
  if (diffDays === 1) return '1 day since applied';
  return `${diffDays} days since applied`;
}

function formatNextActionBadge(
  nextActionAt?: string | null,
  now: Date = new Date()
): { text: string; toneClass: string } {
  const dueMs = toUtcMidnightMs(nextActionAt);
  if (dueMs === null) {
    return {
      text: 'No date',
      toneClass: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
    };
  }
  const todayMs = todayUtcMidnightMs(now);
  const diffDays = Math.round((dueMs - todayMs) / MS_PER_DAY);
  const shortDate = new Date(dueMs).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  if (diffDays < 0) {
    return {
      text: `Overdue · ${shortDate}`,
      toneClass: 'bg-rose-50 text-rose-700 ring-rose-200',
    };
  }
  if (diffDays === 0) {
    return {
      text: `Today · ${shortDate}`,
      toneClass: 'bg-amber-50 text-amber-800 ring-amber-200',
    };
  }
  if (diffDays === 1) {
    return {
      text: `Tomorrow · ${shortDate}`,
      toneClass: 'bg-primary-50 text-primary-700 ring-primary-200',
    };
  }
  return {
    text: `${shortDate} (${diffDays}d)`,
    toneClass: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
  };
}

export function groupApplicationsByStatus(
  applications: IJobApplication[]
): Record<ApplicationStatus, IJobApplication[]> {
  const grouped: Record<ApplicationStatus, IJobApplication[]> = {
    wishlist: [],
    applied: [],
    interview: [],
    offer: [],
    rejected: [],
  };

  for (const app of applications) {
    const bucket = grouped[app.status] ? app.status : 'wishlist';
    grouped[bucket].push(app);
  }

  for (const status of APPLICATION_STATUSES) {
    grouped[status].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return (a.id || '').localeCompare(b.id || '');
    });
  }

  return grouped;
}

export function computeBoardMove(
  applications: IJobApplication[],
  movingId: string,
  targetStatus: ApplicationStatus,
  targetIndex?: number
): { nextApplications: IJobApplication[]; moves: ApplicationReorderMove[] } {
  const grouped = groupApplicationsByStatus(applications);
  const movingApp = applications.find((a) => (a.id || a._id) === movingId);
  if (!movingApp) {
    return { nextApplications: applications, moves: [] };
  }

  const sourceStatus = movingApp.status;
  const sourceList = grouped[sourceStatus].filter((a) => (a.id || a._id) !== movingId);

  if (sourceStatus === targetStatus) {
    const insertAt =
      targetIndex === undefined
        ? sourceList.length
        : Math.max(0, Math.min(sourceList.length, targetIndex));
    const reordered = [...sourceList];
    reordered.splice(insertAt, 0, { ...movingApp, status: targetStatus });
    grouped[sourceStatus] = reordered.map((item, idx) => ({ ...item, order: idx }));
  } else {
    grouped[sourceStatus] = sourceList.map((item, idx) => ({ ...item, order: idx }));
    const destBase = [...grouped[targetStatus]];
    const insertAt =
      targetIndex === undefined
        ? destBase.length
        : Math.max(0, Math.min(destBase.length, targetIndex));
    destBase.splice(insertAt, 0, { ...movingApp, status: targetStatus });
    grouped[targetStatus] = destBase.map((item, idx) => ({ ...item, order: idx }));
  }

  const affectedStatuses =
    sourceStatus === targetStatus ? [sourceStatus] : [sourceStatus, targetStatus];

  const originalById = new Map<string, IJobApplication>();
  for (const item of applications) {
    originalById.set(item.id || item._id || '', item);
  }

  const moves: ApplicationReorderMove[] = [];
  for (const st of affectedStatuses) {
    for (const item of grouped[st]) {
      const itemId = item.id || item._id || '';
      const prev = originalById.get(itemId);
      if (!prev || prev.status !== item.status || prev.order !== item.order) {
        moves.push({
          id: itemId,
          status: item.status,
          order: item.order,
        });
      }
    }
  }

  const nextApplications = APPLICATION_STATUSES.flatMap((st) => grouped[st]);
  return { nextApplications, moves };
}

function JobTrackerSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading job applications"
      data-testid="job-tracker-skeleton"
      className="space-y-6"
    >
      <span className="sr-only">Loading your job application board…</span>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-white rounded-card border border-neutral-200/90 shadow-card p-4 space-y-2.5"
          >
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {[0, 1, 2, 3, 4].map((col) => (
          <div
            key={col}
            className="bg-neutral-100/80 rounded-card border border-neutral-200/80 p-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-7 rounded-full" />
            </div>
            <div className="bg-white rounded-control border border-neutral-200 p-3 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const JobTracker: React.FC<JobTrackerProps> = ({ onCheckMatch }) => {
  const [applications, setApplications] = useState<IJobApplication[]>([]);
  const [resumes, setResumes] = useState<ResumeWithMeta[]>([]);
  const [coverLetters, setCoverLetters] = useState<ICoverLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Drag-and-drop state
  const draggedIdRef = useRef<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ApplicationStatus | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [drawerInitialStatus, setDrawerInitialStatus] = useState<ApplicationStatus>('wishlist');
  const [activeApplicationId, setActiveApplicationId] = useState<string | null>(null);
  const [savingDrawer, setSavingDrawer] = useState(false);
  const [deletingDrawer, setDeletingDrawer] = useState(false);

  const loadBoardData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [appsResult, resumesResult, coverLettersResult] = await Promise.all([
        applicationService.getApplications(),
        Promise.resolve(resumeService.getResumes())
          .then((list) => (Array.isArray(list) ? list : []))
          .catch(() => [] as ResumeWithMeta[]),
        Promise.resolve(coverLetterService.getCoverLetters())
          .then((list) => (Array.isArray(list) ? list : []))
          .catch(() => [] as ICoverLetter[]),
      ]);
      setApplications(appsResult);
      setResumes(resumesResult);
      setCoverLetters(coverLettersResult);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load job applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);

  const resumesById = useMemo(() => {
    const map = new Map<string, ResumeWithMeta>();
    for (const r of resumes) {
      if (r.id) map.set(r.id, r);
      if (r._id) map.set(r._id, r);
    }
    return map;
  }, [resumes]);

  const coverLettersById = useMemo(() => {
    const map = new Map<string, ICoverLetter>();
    for (const cl of coverLetters) {
      if (cl.id) map.set(cl.id, cl);
      if (cl._id) map.set(cl._id, cl);
    }
    return map;
  }, [coverLetters]);

  const groupedColumns = useMemo(
    () => groupApplicationsByStatus(applications),
    [applications]
  );

  // Header KPI stats: total, applied this week, interview rate
  const stats = useMemo(() => {
    const total = applications.length;
    const todayMs = todayUtcMidnightMs();
    const sevenDaysAgoMs = todayMs - 6 * MS_PER_DAY;

    let appliedThisWeek = 0;
    let submittedCount = 0;
    let interviewOrOfferCount = 0;

    for (const app of applications) {
      const appliedMs = toUtcMidnightMs(app.appliedAt);
      if (appliedMs !== null && appliedMs >= sevenDaysAgoMs && appliedMs <= todayMs + MS_PER_DAY) {
        appliedThisWeek += 1;
      }

      if (app.status !== 'wishlist') {
        submittedCount += 1;
      }
      if (app.status === 'interview' || app.status === 'offer') {
        interviewOrOfferCount += 1;
      }
    }

    const interviewRate =
      submittedCount > 0 ? Math.round((interviewOrOfferCount / submittedCount) * 100) : 0;

    return {
      total,
      appliedThisWeek,
      interviewRate,
      submittedCount,
      interviewOrOfferCount,
    };
  }, [applications]);

  // Upcoming next-actions list (sorted chronologically)
  const upcomingActions = useMemo(() => {
    return applications
      .filter((app) => Boolean(app.nextActionAt) || Boolean(app.nextActionNote?.trim()))
      .slice()
      .sort((a, b) => {
        const aMs = toUtcMidnightMs(a.nextActionAt);
        const bMs = toUtcMidnightMs(b.nextActionAt);
        if (aMs !== null && bMs !== null) return aMs - bMs;
        if (aMs !== null) return -1;
        if (bMs !== null) return 1;
        return (a.company || '').localeCompare(b.company || '');
      });
  }, [applications]);

  const activeApplication = useMemo(
    () => applications.find((a) => (a.id || a._id) === activeApplicationId) || null,
    [applications, activeApplicationId]
  );

  const openCreateDrawer = (status: ApplicationStatus = 'wishlist') => {
    setDrawerMode('create');
    setDrawerInitialStatus(status);
    setActiveApplicationId(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (app: IJobApplication) => {
    setDrawerMode('edit');
    setActiveApplicationId(app.id || app._id || null);
    setDrawerOpen(true);
  };

  const executeOptimisticMove = async (
    movingId: string,
    targetStatus: ApplicationStatus,
    targetIndex?: number
  ) => {
    const { nextApplications, moves } = computeBoardMove(
      applications,
      movingId,
      targetStatus,
      targetIndex
    );
    if (moves.length === 0) return;

    const snapshot = applications;
    setApplications(nextApplications);

    try {
      await applicationService.reorderApplications(moves);
    } catch (err) {
      setApplications(snapshot);
      toast.error(
        err instanceof Error
          ? `${err.message} — rolled back card position`
          : 'Failed to save new card position — rolled back'
      );
    }
  };

  const resolveDraggedId = (e?: React.DragEvent): string | null => {
    try {
      const fromTransfer = e?.dataTransfer?.getData('text/plain');
      if (fromTransfer) return fromTransfer;
    } catch {
      // Ignore environments without full DataTransfer support
    }
    return draggedIdRef.current || draggedId;
  };

  const resetDragState = () => {
    draggedIdRef.current = null;
    setDraggedId(null);
    setDragOverColumn(null);
    setDragOverCardId(null);
  };

  const handleCardDragStart = (appId: string, e: React.DragEvent) => {
    draggedIdRef.current = appId;
    setDraggedId(appId);
    try {
      e.dataTransfer?.setData('text/plain', appId);
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
      }
    } catch {
      // Safe fallback for jsdom
    }
  };

  const handleColumnDrop = async (targetStatus: ApplicationStatus, e: React.DragEvent) => {
    e.preventDefault();
    const movingId = resolveDraggedId(e);
    resetDragState();
    if (!movingId) return;
    await executeOptimisticMove(movingId, targetStatus);
  };

  const handleCardDrop = async (
    targetStatus: ApplicationStatus,
    targetIndex: number,
    e: React.DragEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const movingId = resolveDraggedId(e);
    resetDragState();
    if (!movingId) return;
    await executeOptimisticMove(movingId, targetStatus, targetIndex);
  };

  const handleDrawerSave = async (
    payload: UpsertApplicationPayload,
    existingId?: string
  ): Promise<IJobApplication | void> => {
    setSavingDrawer(true);
    try {
      if (modeIsCreate(existingId)) {
        const columnStatus = payload.status || 'wishlist';
        const nextOrder = groupedColumns[columnStatus].length;
        const created = await applicationService.createApplication({
          ...payload,
          status: columnStatus,
          order: nextOrder,
        });
        setApplications((prev) => [...prev, created]);
        toast.success(`Added ${created.company} to ${columnLabelOf(created.status)}`);
        setDrawerOpen(false);
        return created;
      }

      const targetId = existingId!;
      const prevApp = applications.find((a) => (a.id || a._id) === targetId);
      let orderToSave = prevApp?.order ?? 0;
      if (prevApp && payload.status && payload.status !== prevApp.status) {
        orderToSave = groupedColumns[payload.status].length;
      }

      const updated = await applicationService.updateApplication(targetId, {
        ...payload,
        order: orderToSave,
      });
      setApplications((prev) =>
        prev.map((item) => ((item.id || item._id) === targetId ? updated : item))
      );
      toast.success('Application saved');
      setDrawerOpen(false);
      return updated;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save application');
      throw err;
    } finally {
      setSavingDrawer(false);
    }
  };

  const handleDrawerDelete = async (id: string) => {
    if (!id) return;
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const confirmed = window.confirm('Delete this job application?');
      if (!confirmed) return;
    }
    setDeletingDrawer(true);
    try {
      await applicationService.deleteApplication(id);
      setApplications((prev) => prev.filter((item) => (item.id || item._id) !== id));
      toast.success('Application deleted');
      setDrawerOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete application');
    } finally {
      setDeletingDrawer(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Job Tracker
          </h1>
          <p className="mt-1.5 text-sm text-neutral-600 max-w-2xl">
            Organize target opportunities across stages, schedule follow-ups, and check how well your resume aligns with each role.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateDrawer('wishlist')}
          data-testid="add-application-btn"
          className="inline-flex items-center justify-center h-10 px-4 rounded-control bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-sm transition-colors focus-ring shrink-0"
        >
          <PlusIcon className="h-4 w-4 mr-2 stroke-[2.2]" aria-hidden="true" />
          <span>Add Application</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && <JobTrackerSkeleton />}

      {/* Error State */}
      {!loading && loadError && (
        <div
          role="alert"
          data-testid="job-tracker-error"
          className="bg-white rounded-card border border-rose-200 shadow-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <ExclamationCircleIcon
              className="h-6 w-6 text-rose-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Unable to load your job board
              </h2>
              <p className="mt-1 text-sm text-neutral-600">{loadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadBoardData}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-control border border-neutral-300 bg-white hover:bg-neutral-50 text-sm font-medium text-neutral-800 transition-colors focus-ring shrink-0"
          >
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Loaded Content */}
      {!loading && !loadError && (
        <>
          {/* Header Stats Bar */}
          <section
            aria-label="Job search statistics"
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <div
              data-testid="stat-total"
              className="bg-white rounded-card border border-neutral-200/90 shadow-card p-4 sm:p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Total Applications
              </p>
              <p className="mt-1.5 text-2xl sm:text-3xl font-bold tabular-nums text-neutral-900">
                {stats.total}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Across {APPLICATION_COLUMNS.length} pipeline stages
              </p>
            </div>

            <div
              data-testid="stat-applied-week"
              className="bg-white rounded-card border border-neutral-200/90 shadow-card p-4 sm:p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Applied This Week
              </p>
              <p className="mt-1.5 text-2xl sm:text-3xl font-bold tabular-nums text-primary-700">
                {stats.appliedThisWeek}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Submitted in the last 7 days
              </p>
            </div>

            <div
              data-testid="stat-interview-rate"
              className="bg-white rounded-card border border-neutral-200/90 shadow-card p-4 sm:p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Interview Rate
              </p>
              <p className="mt-1.5 text-2xl sm:text-3xl font-bold tabular-nums text-accent-700">
                {stats.interviewRate}%
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {stats.submittedCount > 0
                  ? `${stats.interviewOrOfferCount} of ${stats.submittedCount} applied reached interview/offer`
                  : 'Move applications past Wishlist to track conversion'}
              </p>
            </div>
          </section>

          {/* Upcoming Next-Actions List */}
          <section
            aria-labelledby="upcoming-actions-heading"
            data-testid="upcoming-next-actions"
            className="bg-white rounded-card border border-neutral-200/90 shadow-card overflow-hidden"
          >
            <div className="px-4 sm:px-5 py-3.5 border-b border-neutral-200/80 bg-neutral-50/70 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="h-4 w-4 text-primary-600" aria-hidden="true" />
                <h2
                  id="upcoming-actions-heading"
                  className="text-sm font-semibold text-neutral-900"
                >
                  Upcoming Next Actions
                </h2>
              </div>
              <span className="text-xs font-medium text-neutral-500 tabular-nums">
                {upcomingActions.length}{' '}
                {upcomingActions.length === 1 ? 'scheduled item' : 'scheduled items'}
              </span>
            </div>

            {upcomingActions.length === 0 ? (
              <p className="px-4 sm:px-5 py-4 text-xs sm:text-sm text-neutral-500">
                No upcoming follow-ups scheduled yet. Open any card to set a next action date and reminder note.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-200/75">
                {upcomingActions.map((app) => {
                  const appId = app.id || app._id || '';
                  const badge = formatNextActionBadge(app.nextActionAt);
                  return (
                    <li key={appId}>
                      <button
                        type="button"
                        onClick={() => openEditDrawer(app)}
                        className="w-full px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-neutral-50 transition-colors focus-ring"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {app.nextActionNote?.trim() || 'Follow up on application'}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
                            {app.company} · {app.role} ({columnLabelOf(app.status)})
                          </p>
                        </div>
                        <span
                          className={`self-start sm:self-center inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset shrink-0 ${badge.toneClass}`}
                        >
                          {badge.text}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Empty Board Onboarding Callout */}
          {applications.length === 0 && (
            <div
              data-testid="job-tracker-empty-state"
              className="bg-white rounded-card border border-dashed border-neutral-300 shadow-card px-5 py-8 text-center"
            >
              <div className="max-w-md mx-auto">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-card bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100 mb-3">
                  <BriefcaseIcon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="text-base sm:text-lg font-semibold text-neutral-900">
                  Start tracking your job search
                </h2>
                <p className="mt-1.5 text-sm text-neutral-600">
                  Add target roles to your Wishlist or Applied column, link tailored resumes, and drag cards as you progress to offers.
                </p>
                <button
                  type="button"
                  onClick={() => openCreateDrawer('wishlist')}
                  className="mt-4 inline-flex items-center justify-center h-9 px-4 rounded-control bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium shadow-sm transition-colors focus-ring"
                >
                  <PlusIcon className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  <span>Add your first role</span>
                </button>
              </div>
            </div>
          )}

          {/* Mobile Quick Stage Jump Navigation */}
          <nav
            aria-label="Jump to board stage"
            className="xl:hidden flex items-center gap-1.5 overflow-x-auto pb-1"
          >
            {APPLICATION_COLUMNS.map((col) => (
              <a
                key={col.id}
                href={`#kanban-col-${col.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 whitespace-nowrap shrink-0 focus-ring"
              >
                <span className={`h-2 w-2 rounded-full ${col.dotClass}`} aria-hidden="true" />
                <span>{col.label}</span>
                <span className="text-neutral-400 tabular-nums">
                  {groupedColumns[col.id].length}
                </span>
              </a>
            ))}
          </nav>

          {/* 5-Column Kanban Board */}
          <div
            data-testid="kanban-board"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start"
          >
            {APPLICATION_COLUMNS.map((col, colIndex) => {
              const colCards = groupedColumns[col.id];
              const isColumnHighlighted = dragOverColumn === col.id;
              const prevColumn = colIndex > 0 ? APPLICATION_COLUMNS[colIndex - 1] : null;
              const nextColumn =
                colIndex < APPLICATION_COLUMNS.length - 1
                  ? APPLICATION_COLUMNS[colIndex + 1]
                  : null;

              return (
                <section
                  key={col.id}
                  id={`kanban-col-${col.id}`}
                  aria-labelledby={`kanban-heading-${col.id}`}
                  data-testid={`kanban-column-${col.id}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverColumn !== col.id) {
                      setDragOverColumn(col.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (
                      e.currentTarget &&
                      e.relatedTarget instanceof Node &&
                      e.currentTarget.contains(e.relatedTarget)
                    ) {
                      return;
                    }
                    if (dragOverColumn === col.id) {
                      setDragOverColumn(null);
                    }
                  }}
                  onDrop={(e) => handleColumnDrop(col.id, e)}
                  className={`rounded-card border border-t-4 ${col.headerBorderClass} p-3 transition-colors min-h-[240px] flex flex-col ${
                    isColumnHighlighted
                      ? 'bg-primary-50/60 border-primary-300 ring-2 ring-primary-300/60'
                      : 'bg-neutral-100/75 border-neutral-200/90'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between gap-2 px-1 pb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${col.dotClass}`}
                        aria-hidden="true"
                      />
                      <h2
                        id={`kanban-heading-${col.id}`}
                        className="text-sm font-semibold text-neutral-900 truncate"
                      >
                        {col.label}
                      </h2>
                      <span
                        data-testid={`column-count-${col.id}`}
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset tabular-nums ${col.countBadgeClass}`}
                      >
                        {colCards.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCreateDrawer(col.id)}
                      aria-label={`Add application to ${col.label}`}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-control text-neutral-500 hover:text-neutral-900 hover:bg-white/90 transition-colors focus-ring shrink-0"
                    >
                      <PlusIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Cards List */}
                  <div className="space-y-2.5 flex-1 flex flex-col">
                    {colCards.length === 0 ? (
                      <div className="flex-1 rounded-control border border-dashed border-neutral-300/80 bg-white/50 px-3 py-6 text-center flex items-center justify-center">
                        <p className="text-xs text-neutral-500 leading-relaxed">{col.emptyHint}</p>
                      </div>
                    ) : (
                      colCards.map((app, cardIndex) => {
                        const appId = app.id || app._id || '';
                        const linkedResume = app.resumeId
                          ? resumesById.get(app.resumeId)
                          : undefined;
                        const linkedResumeTitle = app.resumeId
                          ? linkedResume?.title ||
                            linkedResume?.content?.basics?.name ||
                            'Linked resume'
                          : null;
                        const linkedCoverLetter = app.coverLetterId
                          ? coverLettersById.get(app.coverLetterId)
                          : undefined;
                        const linkedCoverLetterTitle = app.coverLetterId
                          ? linkedCoverLetter?.title ||
                            linkedCoverLetter?.jobTitle ||
                            'Linked cover letter'
                          : null;
                        const isDraggingThis = draggedId === appId;
                        const isCardDropTarget = dragOverCardId === appId && draggedId !== appId;

                        return (
                          <article
                            key={appId}
                            draggable
                            data-testid={`application-card-${appId}`}
                            onDragStart={(e) => handleCardDragStart(appId, e)}
                            onDragEnd={resetDragState}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragOverCardId !== appId) {
                                setDragOverCardId(appId);
                              }
                              if (dragOverColumn !== col.id) {
                                setDragOverColumn(col.id);
                              }
                            }}
                            onDrop={(e) => handleCardDrop(col.id, cardIndex, e)}
                            className={`group bg-white rounded-control border p-3 shadow-card hover:shadow-card-hover transition-all cursor-grab active:cursor-grabbing ${
                              isDraggingThis
                                ? 'opacity-50 border-primary-400'
                                : isCardDropTarget
                                ? 'border-primary-500 ring-2 ring-primary-300'
                                : 'border-neutral-200/90 hover:border-neutral-300'
                            }`}
                          >
                            {/* Clickable Primary Card Area */}
                            <button
                              type="button"
                              onClick={() => openEditDrawer(app)}
                              aria-label={`Open details for ${app.company} — ${app.role}`}
                              className="w-full text-left rounded focus-ring block"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-sm font-semibold text-neutral-900 leading-snug break-words">
                                  {app.company}
                                </h3>
                                {app.salary && (
                                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                                    {app.salary}
                                  </span>
                                )}
                              </div>

                              <p className="mt-0.5 text-xs font-medium text-neutral-600 break-words">
                                {app.role}
                              </p>

                              {app.location && (
                                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-neutral-500 truncate max-w-full">
                                  <MapPinIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{app.location}</span>
                                </p>
                              )}

                              {/* Days since applied & Linked resume */}
                              <div className="mt-2.5 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                                  <ClockIcon className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
                                  <span>{formatDaysSinceApplied(app.appliedAt)}</span>
                                </div>

                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <DocumentTextIcon
                                    className={`h-3.5 w-3.5 shrink-0 ${
                                      linkedResumeTitle ? 'text-primary-600' : 'text-neutral-400'
                                    }`}
                                    aria-hidden="true"
                                  />
                                  <span
                                    className={`truncate ${
                                      linkedResumeTitle
                                        ? 'font-medium text-primary-700'
                                        : 'text-neutral-400'
                                    }`}
                                  >
                                    {linkedResumeTitle || 'No resume linked'}
                                  </span>
                                </div>

                                {linkedCoverLetterTitle && (
                                  <div
                                    data-testid={`application-card-cover-letter-${appId}`}
                                    className="flex items-center gap-1.5 text-[11px]"
                                  >
                                    <EnvelopeIcon
                                      className="h-3.5 w-3.5 shrink-0 text-primary-600"
                                      aria-hidden="true"
                                    />
                                    <span className="truncate font-medium text-primary-700">
                                      {linkedCoverLetterTitle}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </button>

                            {/* Keyboard Alternative Controls: Move Left / Right & Reorder Up / Down */}
                            <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between gap-1">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={!prevColumn}
                                  onClick={() =>
                                    prevColumn && executeOptimisticMove(appId, prevColumn.id)
                                  }
                                  aria-label={
                                    prevColumn
                                      ? `Move ${app.company} left to ${prevColumn.label}`
                                      : `Move ${app.company} left`
                                  }
                                  title={prevColumn ? `Move to ${prevColumn.label}` : 'First column'}
                                  className="h-7 w-7 inline-flex items-center justify-center rounded border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-35 disabled:cursor-not-allowed transition-colors focus-ring"
                                >
                                  <ChevronLeftIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>

                                <button
                                  type="button"
                                  disabled={!nextColumn}
                                  onClick={() =>
                                    nextColumn && executeOptimisticMove(appId, nextColumn.id)
                                  }
                                  aria-label={
                                    nextColumn
                                      ? `Move ${app.company} right to ${nextColumn.label}`
                                      : `Move ${app.company} right`
                                  }
                                  title={nextColumn ? `Move to ${nextColumn.label}` : 'Last column'}
                                  className="h-7 w-7 inline-flex items-center justify-center rounded border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-35 disabled:cursor-not-allowed transition-colors focus-ring"
                                >
                                  <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </div>

                              {colCards.length > 1 && (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={cardIndex === 0}
                                    onClick={() =>
                                      executeOptimisticMove(appId, col.id, cardIndex - 1)
                                    }
                                    aria-label={`Move ${app.company} up in ${col.label}`}
                                    title="Move up"
                                    className="h-7 w-7 inline-flex items-center justify-center rounded border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-35 disabled:cursor-not-allowed transition-colors focus-ring"
                                  >
                                    <ChevronUpIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={cardIndex === colCards.length - 1}
                                    onClick={() =>
                                      executeOptimisticMove(appId, col.id, cardIndex + 1)
                                    }
                                    aria-label={`Move ${app.company} down in ${col.label}`}
                                    title="Move down"
                                    className="h-7 w-7 inline-flex items-center justify-center rounded border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-35 disabled:cursor-not-allowed transition-colors focus-ring"
                                  >
                                    <ChevronDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      {/* Detail / Create Slide-Over Drawer */}
      <ApplicationDrawer
        isOpen={drawerOpen}
        mode={drawerMode}
        initialStatus={drawerInitialStatus}
        application={activeApplication}
        resumes={resumes}
        coverLetters={coverLetters}
        saving={savingDrawer}
        deleting={deletingDrawer}
        onClose={() => setDrawerOpen(false)}
        onSave={handleDrawerSave}
        onDelete={handleDrawerDelete}
        onCheckMatch={(prefill) => {
          setDrawerOpen(false);
          onCheckMatch(prefill);
        }}
      />
    </div>
  );
};

function modeIsCreate(existingId?: string): boolean {
  return !existingId;
}

function columnLabelOf(status: ApplicationStatus): string {
  return APPLICATION_COLUMNS.find((c) => c.id === status)?.label || status;
}

export default JobTracker;
