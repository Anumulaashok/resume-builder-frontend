import React, { useEffect, useState } from 'react';
import {
  DocumentDuplicateIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ICoverLetter } from '../../types/coverLetter';
import { ResumeWithMeta } from '../../services/resume.service';
import { Skeleton } from '../ui/skeleton';
import { getTemplate } from '../templates/registry';

export interface CoverLetterListProps {
  coverLetters: ICoverLetter[];
  resumes: ResumeWithMeta[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (coverLetter: ICoverLetter) => void;
  onDuplicate: (coverLetter: ICoverLetter) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const formatCountSubtitle = (
  count: number,
  loading: boolean,
  hasError: boolean
): string => {
  if (loading) {
    return 'Loading your cover letters…';
  }
  if (hasError) {
    return 'Unable to load cover letters right now';
  }
  if (count === 0) {
    return '0 cover letters · Pair tailored cover letters with your resumes';
  }
  if (count === 1) {
    return '1 cover letter · Matched to your resume style and ready to export';
  }
  return `${count} cover letters · Matched to your resume styles and ready to export`;
};

const formatUpdatedDate = (updatedAt?: string, createdAt?: string): string => {
  const raw = updatedAt || createdAt;
  if (!raw) return 'Recently';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return 'Recently';
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const CoverLetterList: React.FC<CoverLetterListProps> = ({
  coverLetters,
  resumes,
  loading,
  error,
  creating,
  onRetry,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const [confirmTarget, setConfirmTarget] = useState<ICoverLetter | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmTarget) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) {
        setConfirmTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmTarget, deleting]);

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    const id = confirmTarget._id || confirmTarget.id;
    if (!id) {
      setConfirmTarget(null);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(id);
      setConfirmTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicateClick = async (letter: ICoverLetter) => {
    const id = letter._id || letter.id || '';
    if (!id || duplicatingId) return;
    setDuplicatingId(id);
    try {
      await onDuplicate(letter);
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Cover Letters
          </h1>
          <p
            data-testid="cover-letters-count-subtitle"
            className="mt-1.5 text-sm text-neutral-600"
          >
            {formatCountSubtitle(coverLetters.length, loading, Boolean(error))}
          </p>
        </div>

        {!loading && !error && coverLetters.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onCreate}
              disabled={creating}
              className="inline-flex items-center justify-center h-10 px-4 border border-transparent rounded-control shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 transition-colors focus-ring"
            >
              <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              <span>{creating ? 'Creating…' : 'New Cover Letter'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div
          role="status"
          aria-label="Loading cover letters"
          data-testid="cover-letter-list-skeleton"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
        >
          <span className="sr-only">Loading cover letters...</span>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="bg-white rounded-card border border-neutral-200/90 shadow-card overflow-hidden flex flex-col"
            >
              <div className="bg-neutral-100/80 border-b border-neutral-200/70 px-4 pt-4 pb-0">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="bg-white rounded-t-lg border border-b-0 border-neutral-200/80 px-3.5 py-3 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-24" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
                  <Skeleton className="h-9 flex-1 rounded-control" />
                  <Skeleton className="h-9 w-24 rounded-control" />
                  <Skeleton className="h-9 w-9 rounded-control shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div
          role="alert"
          data-testid="cover-letter-error-state"
          className="bg-white rounded-panel border border-red-200 shadow-card px-6 py-12 text-center"
        >
          <div className="max-w-md mx-auto">
            <div className="w-12 h-12 rounded-card bg-red-50 text-red-600 ring-1 ring-inset ring-red-100 flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900">
              Could not load cover letters
            </h2>
            <p className="mt-1.5 text-sm text-neutral-600">{error}</p>
            <div className="mt-5">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center justify-center h-10 px-4 rounded-control border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus-ring"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      ) : coverLetters.length === 0 ? (
        /* Empty State */
        <div
          data-testid="cover-letter-empty-state"
          className="bg-white rounded-panel border border-dashed border-neutral-300 shadow-card px-6 py-14 sm:py-16 text-center"
        >
          <div className="max-w-md mx-auto">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="w-16 h-16 rounded-card bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100 flex items-center justify-center">
                <EnvelopeIcon className="h-8 w-8" aria-hidden="true" />
              </div>
              <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-600 text-white shadow-sm ring-2 ring-white">
                <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">
              No cover letters yet
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Create a cover letter paired with any of your resumes—sharing the
              same letterhead, typography, and theme colors—or draft one with AI.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={onCreate}
                disabled={creating}
                className="inline-flex items-center justify-center h-10 px-5 border border-transparent rounded-control shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 transition-colors focus-ring"
              >
                <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>{creating ? 'Creating…' : 'New Cover Letter'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {coverLetters.map((letter) => {
            const letterId = letter._id || letter.id || '';
            const pairedResume = letter.resumeId
              ? resumes.find(
                  (r) => String(r._id || r.id) === String(letter.resumeId)
                )
              : undefined;
            const templateName = getTemplate(
              letter.templateId || pairedResume?.templateId || 'modern'
            ).name;
            const accentHex =
              letter.themeConfig?.accentColor ||
              letter.themeConfig?.primaryColor ||
              pairedResume?.themeConfig?.accentColor ||
              pairedResume?.themeConfig?.primaryColor ||
              '#2563eb';
            const updatedLabel = formatUpdatedDate(
              letter.updatedAt,
              letter.createdAt
            );
            const targetLine = [
              letter.jobTitle?.trim(),
              letter.recipient?.company?.trim(),
            ]
              .filter(Boolean)
              .join(' · ');
            const snippet =
              letter.body?.replace(/\s+/g, ' ').trim() ||
              'No body drafted yet — open editor to write or draft with AI.';

            return (
              <article
                key={letterId || letter.title}
                data-testid="cover-letter-card"
                className="bg-white rounded-card border border-neutral-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col overflow-hidden"
              >
                {/* Stationery Miniature Header */}
                <div className="bg-gradient-to-br from-neutral-100/90 via-neutral-50 to-primary-50/60 border-b border-neutral-200/80 px-4 pt-3.5 pb-0">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {pairedResume ? (
                      <span
                        title={`Paired with ${pairedResume.title || 'Resume'}`}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/95 text-primary-700 ring-1 ring-inset ring-primary-200/80 shadow-sm max-w-[65%] truncate"
                      >
                        <DocumentTextIcon
                          className="h-3 w-3 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {pairedResume.title || 'Paired Resume'}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/95 text-neutral-600 ring-1 ring-inset ring-neutral-200/90 shadow-sm">
                        {templateName}
                      </span>
                    )}

                    <span className="text-xs text-neutral-500 truncate">
                      Updated {updatedLabel}
                    </span>
                  </div>

                  {/* Mini A4 Stationery Sheet Top */}
                  <div className="bg-white rounded-t-lg border border-b-0 border-neutral-200/90 shadow-sm px-3.5 py-3">
                    <div
                      className="h-1 w-12 rounded-full mb-2"
                      style={{ backgroundColor: accentHex }}
                      aria-hidden="true"
                    />
                    <p className="text-xs font-semibold text-neutral-800 truncate">
                      {pairedResume?.content?.basics?.name?.trim() ||
                        letter.title ||
                        'Untitled Cover Letter'}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                      {letter.greeting || 'Dear Hiring Manager,'}
                    </p>
                    <div className="mt-2 space-y-1" aria-hidden="true">
                      <div className="h-1 w-full rounded-full bg-neutral-100" />
                      <div className="h-1 w-4/5 rounded-full bg-neutral-100" />
                    </div>
                  </div>
                </div>

                {/* Card Body & Actions */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 line-clamp-1">
                      <button
                        type="button"
                        onClick={() => onEdit(letter)}
                        className="text-left hover:text-primary-600 transition-colors rounded focus-ring"
                      >
                        {letter.title || 'Untitled Cover Letter'}
                      </button>
                    </h3>
                    {targetLine ? (
                      <p className="mt-1 text-xs font-medium text-primary-700 line-clamp-1">
                        {targetLine}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-neutral-500">
                        {templateName} letterhead
                      </p>
                    )}
                    <p className="mt-2 text-xs text-neutral-600 line-clamp-2">
                      {snippet}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => onEdit(letter)}
                      className="flex-1 h-9 px-3 inline-flex items-center justify-center gap-1.5 border border-transparent text-sm font-medium rounded-control text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-colors focus-ring"
                    >
                      <PencilSquareIcon
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicateClick(letter)}
                      disabled={duplicatingId === letterId}
                      className="h-9 px-3 inline-flex items-center justify-center gap-1.5 border border-neutral-300 text-sm font-medium rounded-control text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50 transition-colors focus-ring"
                    >
                      <DocumentDuplicateIcon
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        {duplicatingId === letterId ? 'Copying…' : 'Duplicate'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmTarget(letter)}
                      aria-label={`Delete cover letter ${letter.title || ''}`.trim()}
                      title="Delete cover letter"
                      className="h-9 w-9 shrink-0 inline-flex items-center justify-center border border-neutral-200 rounded-control text-neutral-500 bg-white hover:text-red-600 hover:bg-red-50 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Accessible Delete Confirmation Modal */}
      {confirmTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-cover-letter-title"
          data-testid="delete-cover-letter-modal"
          className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
        >
          <div className="bg-white rounded-panel border border-neutral-200 w-full max-w-md shadow-modal p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-control bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <ExclamationTriangleIcon
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </div>
                <h2
                  id="delete-cover-letter-title"
                  className="text-lg font-semibold text-neutral-900"
                >
                  Delete Cover Letter
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close confirmation dialog"
                disabled={deleting}
                onClick={() => setConfirmTarget(null)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-control text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors focus-ring"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-3 text-sm text-neutral-600">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-neutral-900">
                &ldquo;{confirmTarget.title || 'Untitled Cover Letter'}&rdquo;
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmTarget(null)}
                className="w-full sm:w-auto h-10 px-4 rounded-control border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-cover-letter-btn"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto h-10 px-4 rounded-control border border-transparent bg-red-600 hover:bg-red-700 text-sm font-medium text-white shadow-sm disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverLetterList;
