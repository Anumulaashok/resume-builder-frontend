import { useState, useEffect, useCallback, useRef } from "react";
import {
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  PlusIcon,
  SparklesIcon,
  ShareIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import {
  Resume,
  ResumeWithMeta,
  resumeService,
} from "../services/resume.service";
import { applicationService } from "../services/application.service";
import { IResumeAttributionItem } from "../types/application";
import toast from "react-hot-toast";
import ShareModal from "./ShareModal";
import ImportResumeModal from "./ImportResumeModal";
import { Skeleton } from "./ui/skeleton";

interface ResumeListProps {
  onEditResume: (resume: Resume) => void;
  onNewResume?: () => void;
  onImportResume?: () => void;
  onAIGenerate?: () => void;
  onResumesLoad?: (resumes: ResumeWithMeta[]) => void;
}

const getResumeInitials = (resume: ResumeWithMeta): string => {
  const source =
    resume.content?.basics?.name?.trim() ||
    resume.title?.trim() ||
    "Resume";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
};

const getTemplateLabel = (resume: ResumeWithMeta): string => {
  const raw =
    resume.templateId ||
    (resume as unknown as { template?: string }).template ||
    "modern";
  const normalized = raw.trim().toLowerCase();
  if (normalized === "professional") return "Professional";
  if (normalized === "modern") return "Modern";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const formatUpdatedDate = (updatedAt?: string, createdAt?: string): string => {
  const raw = updatedAt || createdAt;
  if (!raw) return "Recently";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function ResumeList({
  onEditResume,
  onNewResume,
  onImportResume,
  onAIGenerate,
  onResumesLoad,
}: ResumeListProps) {
  const [resumes, setResumes] = useState<ResumeWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingResume, setSharingResume] = useState<ResumeWithMeta | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [attributionByResumeId, setAttributionByResumeId] = useState<
    Record<string, IResumeAttributionItem>
  >({});
  const onResumesLoadRef = useRef(onResumesLoad);

  const handleOpenImport = () => {
    if (onImportResume) {
      onImportResume();
    } else {
      setShowImportModal(true);
    }
  };

  useEffect(() => {
    onResumesLoadRef.current = onResumesLoad;
  }, [onResumesLoad]);

  const loadResumes = useCallback(async () => {
    try {
      const data = await resumeService.getResumes();
      const next = data || [];
      setResumes(next);
      onResumesLoadRef.current?.(next);

      if (
        next.length > 0 &&
        typeof applicationService?.getAttributionSummary === "function"
      ) {
        Promise.resolve(applicationService.getAttributionSummary())
          .then((summary) => {
            if (summary && Array.isArray(summary.byResume)) {
              const map: Record<string, IResumeAttributionItem> = {};
              for (const entry of summary.byResume) {
                if (entry?.resumeId) {
                  map[entry.resumeId] = entry;
                }
              }
              setAttributionByResumeId(map);
            }
          })
          .catch(() => {
            // Attribution summary is non-blocking so resume list always renders
          });
      }
    } catch (error) {
      toast.error("Failed to load resumes");
      setResumes([]);
      onResumesLoadRef.current?.([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  const handleDelete = async (id: string | undefined) => {
    if (
      !id ||
      !window.confirm("Are you sure you want to delete this resume?")
    ) {
      return;
    }

    try {
      await resumeService.deleteResume(id);
      toast.success("Resume deleted successfully");
      const next = resumes.filter(
        (resume) => (resume.id || resume._id) !== id
      );
      setResumes(next);
      onResumesLoadRef.current?.(next);
    } catch (error) {
      toast.error("Failed to delete resume");
    }
  };

  const handleClone = async (resume: ResumeWithMeta) => {
    try {
      const {
        _id: _mongoId,
        id: _,
        createdAt: _createdAt,
        updatedAt: __,
        sharing: _sharing,
        ...cloneData
      } = resume;
      const created = await resumeService.createResume({
        ...cloneData,
        title: `${cloneData.title || "Untitled Resume"} (Copy)`,
      });
      const resolvedId = created?.id || created?._id || "";
      const clonedResume: ResumeWithMeta = {
        ...created,
        id: created?.id || resolvedId,
        ...(resolvedId ? { _id: created?._id || resolvedId } : {}),
      };
      toast.success("Resume cloned successfully");
      const next = [...resumes, clonedResume];
      setResumes(next);
      onResumesLoadRef.current?.(next);
    } catch (error) {
      toast.error("Failed to clone resume");
    }
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading resumes"
        data-testid="resume-list-skeleton"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
      >
        <span className="sr-only">Loading resumes...</span>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="bg-white rounded-card border border-neutral-200/90 shadow-card overflow-hidden flex flex-col"
          >
            <div className="bg-neutral-100/80 border-b border-neutral-200/70 px-4 pt-4 pb-0">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="bg-white rounded-t-lg border border-b-0 border-neutral-200/80 px-3.5 py-3 flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-control shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-3.5 w-2/5" />
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
                <Skeleton className="h-9 flex-1 rounded-control" />
                <Skeleton className="h-9 w-20 rounded-control" />
                <Skeleton className="h-9 w-20 rounded-control" />
                <Skeleton className="h-9 w-9 rounded-control shrink-0" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!resumes || resumes.length === 0) {
    return (
      <div
        data-testid="resume-empty-state"
        className="bg-white rounded-panel border border-dashed border-neutral-300 shadow-card px-6 py-14 sm:py-16 text-center"
      >
        <div className="max-w-md mx-auto">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="w-16 h-16 rounded-card bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100 flex items-center justify-center">
              <DocumentTextIcon className="h-8 w-8" aria-hidden="true" />
            </div>
            <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-600 text-white shadow-sm ring-2 ring-white">
              <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">
            No resumes yet
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Start from a clean template or generate a tailored resume with AI in seconds.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={onNewResume}
              className="inline-flex items-center justify-center h-10 px-4 border border-transparent rounded-control shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors focus-ring"
            >
              <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              New Resume
            </button>
            <button
              type="button"
              data-testid="import-resume-btn"
              onClick={handleOpenImport}
              className="inline-flex items-center justify-center h-10 px-4 border border-neutral-300 rounded-control shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus-ring"
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              Import
            </button>
            <button
              type="button"
              onClick={onAIGenerate}
              className="inline-flex items-center justify-center h-10 px-4 border border-transparent rounded-control shadow-sm text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 transition-colors focus-ring"
            >
              <SparklesIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              AI Generate
            </button>
          </div>
        </div>
        {!onImportResume && showImportModal && (
          <ImportResumeModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImported={(createdResume) => {
              setShowImportModal(false);
              const next = [createdResume];
              setResumes(next);
              onResumesLoadRef.current?.(next);
              onEditResume(createdResume);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
      {resumes.map((resume) => {
        const resumeId = resume.id || resume._id || "";
        const initials = getResumeInitials(resume);
        const templateName = getTemplateLabel(resume);
        const updatedLabel = formatUpdatedDate(
          resume.updatedAt,
          resume.createdAt
        );
        const candidateName =
          resume.content?.basics?.name?.trim() ||
          resume.title ||
          "Untitled Resume";
        const candidateRole =
          resume.content?.basics?.label?.trim() || `${templateName} layout`;

        return (
          <article
            key={resumeId || resume.title}
            data-testid="resume-card"
            className="bg-white rounded-card border border-neutral-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col overflow-hidden"
          >
            {/* Visual Thumbnail / Preview Area */}
            <div
              data-testid="resume-card-preview"
              className="bg-gradient-to-br from-primary-50/80 via-neutral-50 to-accent-50/70 border-b border-neutral-200/80 px-4 pt-3.5 pb-0"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/95 text-primary-700 ring-1 ring-inset ring-primary-200/80 shadow-sm">
                  {templateName}
                </span>
                <span className="text-xs text-neutral-500 truncate">
                  Updated {updatedLabel}
                </span>
              </div>

              <div className="bg-white rounded-t-lg border border-b-0 border-neutral-200/90 shadow-sm px-3.5 py-3 flex items-center gap-3">
                <div
                  aria-hidden="true"
                  className="h-9 w-9 rounded-control bg-primary-600 text-white text-xs font-bold tracking-wide flex items-center justify-center shrink-0 shadow-sm"
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-neutral-800 truncate">
                    {candidateName}
                  </p>
                  <p className="text-[11px] text-neutral-500 truncate">
                    {candidateRole}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-1 w-12 rounded-full bg-neutral-200" />
                    <span className="h-1 w-8 rounded-full bg-neutral-100" />
                    <span className="h-1 w-6 rounded-full bg-neutral-100" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card Body & Actions */}
            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-neutral-900 line-clamp-1">
                  {resume.title || "Untitled Resume"}
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  {templateName} template · Last updated: {updatedLabel}
                </p>
                {(() => {
                  const metrics = resumeId
                    ? attributionByResumeId[resumeId]
                    : undefined;
                  const linkedCount = metrics?.totalApplications ?? 0;
                  const submittedCount = metrics?.submittedCount ?? 0;
                  const interviewRate = metrics?.interviewRate ?? 0;

                  return (
                    <div
                      data-testid="resume-card-attribution"
                      className="mt-3 flex flex-wrap items-center gap-2"
                    >
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-neutral-200/80">
                        {linkedCount === 1
                          ? "1 linked app"
                          : `${linkedCount} linked apps`}
                        {submittedCount > 0 ? ` · ${submittedCount} submitted` : ""}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ring-inset ${
                          submittedCount > 0 && interviewRate > 0
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200/80"
                            : "bg-primary-50/70 text-primary-700 ring-primary-200/70"
                        }`}
                      >
                        {interviewRate}% interview rate
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => onEditResume(resume)}
                  className="flex-1 h-9 px-3 inline-flex items-center justify-center gap-1.5 border border-transparent text-sm font-medium rounded-control text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-colors focus-ring"
                >
                  <PencilIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSharingResume(resume)}
                  className="h-9 px-3 inline-flex items-center justify-center gap-1.5 border border-neutral-300 text-sm font-medium rounded-control text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus-ring"
                >
                  <ShareIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Share</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleClone(resume)}
                  className="h-9 px-3 inline-flex items-center justify-center gap-1.5 border border-neutral-300 text-sm font-medium rounded-control text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus-ring"
                >
                  <DocumentDuplicateIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Clone</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(resumeId)}
                  aria-label="Delete resume"
                  title="Delete resume"
                  className="h-9 w-9 shrink-0 inline-flex items-center justify-center border border-neutral-200 rounded-control text-neutral-500 bg-white hover:text-red-600 hover:bg-red-50 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        );
      })}

      {sharingResume && (
        <ShareModal
          isOpen={!!sharingResume}
          onClose={() => setSharingResume(null)}
          resumeId={sharingResume.id || sharingResume._id || ""}
          resumeTitle={sharingResume.title}
          initialSharing={sharingResume.sharing}
          onSharingUpdated={(sharing) => {
            const targetId = sharingResume.id || sharingResume._id;
            setResumes((prev) =>
              prev.map((r) =>
                targetId && (r.id || r._id) === targetId
                  ? { ...r, sharing }
                  : r
              )
            );
            setSharingResume((prev) => (prev ? { ...prev, sharing } : null));
          }}
        />
      )}
    </div>
  );
}
