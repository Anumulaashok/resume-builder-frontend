import React, { useEffect, useRef, useState } from 'react';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  FolderOpenIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { resumeService } from '../../services/resume.service';
import { careerProfileService } from '../../services/careerProfile.service';
import { PortfolioProject } from '../../types/portfolio';
import { Skeleton } from '../ui/skeleton';

interface ImportProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (projects: PortfolioProject[]) => void;
}

interface ExtractedProject {
  id: string;
  sourceResumeTitle: string;
  name: string;
  description: string;
  highlights?: string[];
  technologies?: string[];
  url?: string;
  githubUrl?: string;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const ImportProjectsModal: React.FC<ImportProjectsModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [loading, setLoading] = useState(false);
  const [extractedProjects, setExtractedProjects] = useState<ExtractedProject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusable.length === 0) {
          event.preventDefault();
          dialog.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (!active || active === first || !dialog.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (!active || active === last || !dialog.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const loadResumeProjects = async () => {
      setLoading(true);
      try {
        const foundProjects: ExtractedProject[] = [];
        const profile = await careerProfileService.getProfile().catch(() => null);
        const profileProjects = Array.isArray(profile?.projects)
          ? profile!.projects
          : [];

        if (profileProjects.length > 0) {
          profileProjects.forEach((proj, idx) => {
            const cleanHighlights = Array.isArray(proj.highlights)
              ? proj.highlights.map((h) => (h || '').trim()).filter(Boolean)
              : [];
            foundProjects.push({
              id: `profile-proj-${proj.id || idx}`,
              sourceResumeTitle: 'Career Profile',
              name: proj.name || `Project ${idx + 1}`,
              description: proj.description || '',
              highlights: cleanHighlights,
              technologies: Array.isArray(proj.technologies)
                ? proj.technologies
                : [],
              url: proj.url || '',
              githubUrl: proj.githubUrl || ''
            });
          });
        } else {
          const resumes = (await resumeService.getResumes()) || [];

          resumes.forEach((resume) => {
            const resumeTitle = resume.title || 'Untitled Resume';
            const sections = resume.content?.sections || [];

            sections.forEach((section) => {
              const isProjectSection =
                section.type?.toLowerCase().includes('project') ||
                section.title?.toLowerCase().includes('project');

              if (Array.isArray(section.content)) {
                section.content.forEach((item: any, idx: number) => {
                  if (isProjectSection || item.technologies || item.url) {
                    const name = item.name || item.title || `Project ${idx + 1}`;
                    const description = item.description || item.summary || '';
                    const highlights = Array.isArray(item.highlights)
                      ? item.highlights.map((h: any) => String(h || '').trim()).filter(Boolean)
                      : [];
                    const technologies = Array.isArray(item.technologies)
                      ? item.technologies
                      : [];

                    foundProjects.push({
                      id: `${resume.id || resume._id || 'res'}-${section.id}-${item.id || idx}`,
                      sourceResumeTitle: resumeTitle,
                      name,
                      description,
                      highlights,
                      technologies,
                      url: item.url || '',
                      githubUrl: item.githubUrl || ''
                    });
                  }
                });
              }
            });
          });
        }

        setExtractedProjects(foundProjects);
        // By default select all found projects
        setSelectedIds(new Set(foundProjects.map((p) => p.id)));
      } catch (error) {
        toast.error('Failed to load projects from resumes');
      } finally {
        setLoading(false);
      }
    };

    loadResumeProjects();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmImport = () => {
    const toImport: PortfolioProject[] = extractedProjects
      .filter((p) => selectedIds.has(p.id))
      .map((p, idx) => ({
        id: `imported-proj-${Date.now()}-${idx}`,
        title: p.name,
        description: p.description,
        ...(p.highlights && p.highlights.length > 0
          ? { highlights: [...p.highlights] }
          : {}),
        tags: p.technologies || [],
        demoUrl: p.url || '',
        githubUrl: p.githubUrl || '',
        images: []
      }));

    if (toImport.length === 0) {
      toast.error('Please select at least one project to import');
      return;
    }

    onImport(toImport);
    toast.success(`Successfully imported ${toImport.length} project(s)`);
    onClose();
  };

  return (
    <div
      data-testid="import-projects-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-projects-modal-title"
        aria-describedby="import-projects-modal-description"
        tabIndex={-1}
        className="bg-white rounded-panel border border-neutral-200 shadow-modal max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100">
              <ArrowDownTrayIcon className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="import-projects-modal-title"
                className="text-lg font-semibold text-neutral-900 truncate"
              >
                Import Projects from Resumes
              </h2>
              <p
                id="import-projects-modal-description"
                className="text-xs text-neutral-500"
              >
                Bring existing resume project entries into your portfolio showcase.
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-control text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors focus-ring"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div
              role="status"
              aria-label="Loading resume projects"
              data-testid="import-projects-skeleton"
              className="space-y-3"
            >
              <span className="sr-only">Scanning your resumes for project records...</span>
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-card border border-neutral-200 bg-white space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Skeleton className="h-4 w-4 rounded shrink-0" />
                      <Skeleton className="h-4 w-44" />
                    </div>
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </div>
                  <div className="pl-7 space-y-2">
                    <Skeleton className="h-3.5 w-full" />
                    <div className="flex gap-1.5 pt-1">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : extractedProjects.length === 0 ? (
            <div
              data-testid="import-projects-empty-state"
              className="rounded-panel border border-dashed border-neutral-300 bg-neutral-50/70 px-6 py-12 text-center"
            >
              <div className="w-12 h-12 rounded-card bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100 flex items-center justify-center mx-auto mb-4">
                <FolderOpenIcon className="w-6 h-6" aria-hidden="true" />
              </div>
              <p className="text-base font-semibold text-neutral-900">
                No project records found in your resumes.
              </p>
              <p className="text-sm mt-1.5 text-neutral-600 max-w-sm mx-auto">
                You can manually create project cards in the portfolio workspace.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs text-neutral-600">
                  Select the project records you wish to import directly into your portfolio showcase:
                </p>
                {extractedProjects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedIds.size === extractedProjects.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(extractedProjects.map((p) => p.id)));
                      }
                    }}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 rounded px-1.5 py-0.5 transition-colors focus-ring shrink-0"
                  >
                    {selectedIds.size === extractedProjects.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              {extractedProjects.map((p) => {
                const isSelected = selectedIds.has(p.id);
                const checkboxId = `import-project-${p.id}`;
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleSelect(p.id)}
                    className={`p-4 rounded-card border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-500 shadow-sm'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        id={checkboxId}
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.id)}
                        aria-label={`Select ${p.name}`}
                        className="h-4 w-4 mt-1 text-primary-600 rounded border-neutral-300 cursor-pointer focus-ring"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label
                            htmlFor={checkboxId}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-semibold text-neutral-900 cursor-pointer"
                          >
                            {p.name}
                          </label>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 ring-1 ring-inset ring-neutral-200/80 font-medium">
                            {p.sourceResumeTitle}
                          </span>
                        </div>
                        {p.description && (
                          <p className="text-xs text-neutral-600 mt-1.5 line-clamp-2 leading-relaxed">
                            {p.description}
                          </p>
                        )}
                        {p.highlights && p.highlights.length > 0 && (
                          <ul
                            data-testid="import-project-highlights"
                            className="mt-1.5 space-y-1 text-xs text-neutral-700 list-disc pl-4"
                          >
                            {p.highlights.map((bullet, bIdx) => (
                              <li key={bIdx} className="leading-snug">
                                {bullet}
                              </li>
                            ))}
                          </ul>
                        )}
                        {p.technologies && p.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {p.technologies.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-[11px] rounded-full bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200/70 font-medium"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <div className="text-xs font-medium text-neutral-600 text-center sm:text-left">
            {selectedIds.size} of {extractedProjects.length} selected
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto h-10 px-4 border border-neutral-300 bg-white rounded-control text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus-ring"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={selectedIds.size === 0 || loading}
              className="w-full sm:w-auto h-10 px-5 rounded-control text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors focus-ring"
            >
              Import Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
