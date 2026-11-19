import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  PencilIcon,
  PencilSquareIcon,
  PrinterIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  createDefaultCoverLetter,
  ICoverLetter,
} from '../../types/coverLetter';
import { coverLetterService } from '../../services/coverLetter.service';
import { ResumeWithMeta } from '../../services/resume.service';
import CoverLetterPreview, {
  splitBodyIntoParagraphs,
} from './CoverLetterPreview';
import { getTemplate } from '../templates/registry';

export interface CoverLetterEditorProps {
  initialCoverLetter?: ICoverLetter;
  resumes: ResumeWithMeta[];
  user?: {
    name?: string;
    email?: string;
  } | null;
  onSaved?: (coverLetter: ICoverLetter) => void;
  onBack: () => void;
}

type SaveStatus = 'unsaved_new' | 'saving' | 'saved' | 'failed';

const INPUT_CLASS =
  'w-full h-10 px-3 py-2 text-sm bg-white border border-neutral-300 rounded-control text-neutral-900 placeholder-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

const TEXTAREA_CLASS =
  'w-full px-3 py-2.5 text-sm bg-white border border-neutral-300 rounded-control text-neutral-900 placeholder-neutral-400 leading-relaxed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

const LABEL_CLASS = 'block text-xs font-medium text-neutral-700 mb-1.5';

const AUTOSAVE_DELAY_MS = 900;

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return true;
    }
    const mql = window.matchMedia('(min-width: 1024px)');
    return mql ? Boolean(mql.matches) : true;
  });

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }
    const mql = window.matchMedia('(min-width: 1024px)');
    if (!mql) return;
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    if (typeof mql.addListener === 'function') {
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, []);

  return isDesktop;
}

function serializeCoverLetterSnapshot(letter: ICoverLetter): string {
  return JSON.stringify({
    title: letter.title ?? '',
    resumeId: letter.resumeId ?? null,
    recipient: {
      name: letter.recipient?.name ?? '',
      company: letter.recipient?.company ?? '',
      address: letter.recipient?.address ?? '',
    },
    jobTitle: letter.jobTitle ?? '',
    jobDescription: letter.jobDescription ?? '',
    date: letter.date ?? '',
    greeting: letter.greeting ?? '',
    body: letter.body ?? '',
    closing: letter.closing ?? '',
    templateId: letter.templateId ?? '',
    themeConfig: letter.themeConfig ?? null,
  });
}

function buildEditablePayload(letter: ICoverLetter): Partial<ICoverLetter> {
  return {
    title: (letter.title || 'Untitled Cover Letter').trim() || 'Untitled Cover Letter',
    resumeId: letter.resumeId || null,
    recipient: {
      name: letter.recipient?.name ?? '',
      company: letter.recipient?.company ?? '',
      address: letter.recipient?.address ?? '',
    },
    jobTitle: letter.jobTitle ?? '',
    jobDescription: letter.jobDescription ?? '',
    date: letter.date ?? '',
    greeting: letter.greeting ?? '',
    body: letter.body ?? '',
    closing: letter.closing ?? '',
    templateId: letter.templateId,
    themeConfig: letter.themeConfig,
  };
}

export const CoverLetterEditor: React.FC<CoverLetterEditorProps> = ({
  initialCoverLetter,
  resumes,
  user,
  onSaved,
  onBack,
}) => {
  const isDesktop = useIsDesktop();
  const [activeView, setActiveView] = useState<'editor' | 'preview'>('editor');
  const [leftPanePercent, setLeftPanePercent] = useState<number>(48);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  const initialNormalized = useMemo(
    () => createDefaultCoverLetter(initialCoverLetter),
    [initialCoverLetter]
  );
  const initialId = initialNormalized._id || initialNormalized.id;

  const [coverLetter, setCoverLetter] = useState<ICoverLetter>(initialNormalized);
  const [persistedId, setPersistedId] = useState<string | undefined>(initialId);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    initialId ? 'saved' : 'unsaved_new'
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);

  const persistedIdRef = useRef<string | undefined>(initialId);
  const latestLetterRef = useRef<ICoverLetter>(initialNormalized);
  latestLetterRef.current = coverLetter;

  const lastSavedSnapshotRef = useRef<string | null>(
    initialId ? serializeCoverLetterSnapshot(initialNormalized) : null
  );
  const isInitialMountRef = useRef(true);
  const isMountedRef = useRef(true);
  const isSavingRef = useRef(false);
  const queuedSaveRef = useRef<ICoverLetter | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const titleBeforeEditRef = useRef<string>('');
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const linkedResume = useMemo(() => {
    if (!coverLetter.resumeId) return null;
    return (
      resumes.find(
        (r) => String(r._id || r.id) === String(coverLetter.resumeId)
      ) || null
    );
  }, [coverLetter.resumeId, resumes]);

  const cancelDebounce = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const performSave = useCallback(
    async (
      target: ICoverLetter,
      origin: 'autosave' | 'manual'
    ): Promise<ICoverLetter | null> => {
      if (isSavingRef.current) {
        queuedSaveRef.current = target;
        return null;
      }

      isSavingRef.current = true;
      if (isMountedRef.current) {
        setSaveStatus('saving');
      }

      let currentTarget: ICoverLetter | null = target;
      let latestSavedResult: ICoverLetter | null = null;

      while (currentTarget) {
        const snapshotAttempted = serializeCoverLetterSnapshot(currentTarget);
        const activeId =
          currentTarget._id || currentTarget.id || persistedIdRef.current;

        try {
          let saved: ICoverLetter;
          if (activeId) {
            saved = await coverLetterService.updateCoverLetter(
              activeId,
              buildEditablePayload(currentTarget)
            );
          } else {
            saved = await coverLetterService.createCoverLetter(
              buildEditablePayload(currentTarget)
            );
            const createdId = saved._id || saved.id;
            if (createdId) {
              persistedIdRef.current = createdId;
              if (isMountedRef.current) {
                setPersistedId(createdId);
              }
            }
          }

          lastSavedSnapshotRef.current = snapshotAttempted;
          latestSavedResult = saved;
          onSavedRef.current?.(saved);

          if (!queuedSaveRef.current && isMountedRef.current) {
            setSaveStatus('saved');
          }
        } catch (err) {
          if (isMountedRef.current) {
            setSaveStatus('failed');
            if (origin === 'autosave') {
              toast.error('Auto-save failed');
            }
          }
          isSavingRef.current = false;
          queuedSaveRef.current = null;
          if (origin === 'manual') {
            throw err;
          }
          return null;
        }

        if (queuedSaveRef.current) {
          currentTarget = queuedSaveRef.current;
          queuedSaveRef.current = null;
        } else {
          currentTarget = null;
        }
      }

      isSavingRef.current = false;
      return latestSavedResult;
    },
    []
  );

  // Debounced autosave whenever coverLetter changes
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    const activeId =
      coverLetter._id || coverLetter.id || persistedIdRef.current;
    if (!activeId) {
      return;
    }

    const currentSnapshot = serializeCoverLetterSnapshot(coverLetter);
    if (
      !isSavingRef.current &&
      lastSavedSnapshotRef.current !== null &&
      currentSnapshot === lastSavedSnapshotRef.current
    ) {
      cancelDebounce();
      return;
    }

    cancelDebounce();
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void performSave(latestLetterRef.current, 'autosave');
    }, AUTOSAVE_DELAY_MS);
  }, [coverLetter, cancelDebounce, performSave]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelDebounce();
    };
  }, [cancelDebounce]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleManualSave = async () => {
    cancelDebounce();
    setManualSaving(true);
    try {
      const saved = await performSave(latestLetterRef.current, 'manual');
      if (saved) {
        toast.success('Cover letter saved');
      }
    } catch {
      toast.error('Failed to save cover letter');
    } finally {
      if (isMountedRef.current) {
        setManualSaving(false);
      }
    }
  };

  const handleRetrySave = () => {
    cancelDebounce();
    void performSave(latestLetterRef.current, 'autosave');
  };

  const handlePrint = useCallback(() => {
    flushSync(() => {
      if (!isDesktop && activeView !== 'preview') {
        setActiveView('preview');
      }
    });
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  }, [activeView, isDesktop]);

  const handleResumeChange = (nextResumeId: string) => {
    if (!nextResumeId) {
      setCoverLetter((prev) => ({
        ...prev,
        resumeId: null,
      }));
      return;
    }

    const matched = resumes.find(
      (r) => String(r._id || r.id) === String(nextResumeId)
    );
    setCoverLetter((prev) => ({
      ...prev,
      resumeId: nextResumeId,
      templateId: matched?.templateId || prev.templateId || 'modern',
      themeConfig: matched?.themeConfig ?? prev.themeConfig,
    }));
  };

  const handleSyncFromResume = () => {
    if (!linkedResume) return;
    setCoverLetter((prev) => ({
      ...prev,
      templateId: linkedResume.templateId || 'modern',
      themeConfig: linkedResume.themeConfig,
    }));
    toast.success('Synced template and theme from paired resume');
  };

  const handleDraftWithAI = async () => {
    cancelDebounce();
    setIsGenerating(true);

    try {
      let targetId =
        latestLetterRef.current._id ||
        latestLetterRef.current.id ||
        persistedIdRef.current;

      // Flush latest edits (or create if brand-new) so backend /generate sees fresh resumeId & jobDescription
      const savedFirst = await performSave(latestLetterRef.current, 'manual');
      if (savedFirst) {
        targetId = savedFirst._id || savedFirst.id || targetId;
      }

      if (!targetId) {
        throw new Error('Could not save cover letter before generating draft');
      }

      const generated = await coverLetterService.generateCoverLetter(
        targetId,
        aiPrompt
      );

      if (isMountedRef.current) {
        setCoverLetter((prev) => {
          const next = {
            ...prev,
            ...generated,
            body: generated.body ?? prev.body,
          };
          lastSavedSnapshotRef.current = serializeCoverLetterSnapshot(next);
          return next;
        });
        setSaveStatus('saved');
        onSavedRef.current?.(generated);
        toast.success('Cover letter drafted with AI');
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to draft cover letter'
      );
    } finally {
      if (isMountedRef.current) {
        setIsGenerating(false);
      }
    }
  };

  const paragraphCount = splitBodyIntoParagraphs(coverLetter.body).length;
  const wordCount = coverLetter.body.trim()
    ? coverLetter.body.trim().split(/\s+/).length
    : 0;
  const activeTemplateName = getTemplate(
    coverLetter.templateId || linkedResume?.templateId || 'modern'
  ).name;

  const editorToolbar = (
    <div
      data-testid="cover-letter-editor-toolbar"
      className="bg-white border-b border-neutral-200 px-4 sm:px-6 py-2.5 shrink-0 relative z-30 print:hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 min-w-[200px] sm:min-w-[260px] flex-1">
          <button
            type="button"
            onClick={onBack}
            title="Back to cover letters"
            aria-label="Back"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors focus-ring shrink-0"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            <span>Back</span>
          </button>

          <div className="h-5 w-px bg-neutral-200 shrink-0" aria-hidden="true" />

          <div className="min-w-0 flex-1">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                aria-label="Cover Letter Title"
                value={coverLetter.title}
                onChange={(e) =>
                  setCoverLetter((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                onBlur={() => {
                  setCoverLetter((prev) => ({
                    ...prev,
                    title: prev.title.trim() || 'Untitled Cover Letter',
                  }));
                  setIsEditingTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setCoverLetter((prev) => ({
                      ...prev,
                      title: prev.title.trim() || 'Untitled Cover Letter',
                    }));
                    setIsEditingTitle(false);
                  } else if (e.key === 'Escape') {
                    setCoverLetter((prev) => ({
                      ...prev,
                      title: titleBeforeEditRef.current,
                    }));
                    setIsEditingTitle(false);
                  }
                }}
                placeholder="Cover Letter Title"
                className="w-full max-w-xl text-base sm:text-lg font-semibold text-neutral-900 bg-transparent border-b-2 border-primary-600 focus:outline-none px-1 py-0.5"
              />
            ) : (
              <button
                type="button"
                data-testid="cover-letter-title-heading"
                onClick={() => {
                  titleBeforeEditRef.current = coverLetter.title;
                  setIsEditingTitle(true);
                }}
                title="Click to rename cover letter"
                aria-label="Edit cover letter title"
                className="group inline-flex items-center gap-1.5 max-w-full text-left rounded-control px-1.5 py-1 -mx-1.5 hover:bg-neutral-100 transition-colors focus-ring"
              >
                <h1
                  title={coverLetter.title || 'Untitled Cover Letter'}
                  className="text-base sm:text-lg font-semibold text-neutral-900 truncate"
                >
                  {coverLetter.title || 'Untitled Cover Letter'}
                </h1>
                <PencilSquareIcon
                  className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 shrink-0 transition-colors"
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        </div>

        {/* Save Status & Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            data-testid="save-status-indicator"
            role="status"
            aria-live="polite"
            className="inline-flex items-center text-xs font-medium"
          >
            {saveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-primary-50 text-primary-700 border border-primary-200">
                <ArrowPathIcon
                  className="h-3.5 w-3.5 text-primary-600 animate-spin shrink-0"
                  aria-hidden="true"
                />
                <span>Saving…</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-neutral-50 text-neutral-600 border border-neutral-200">
                <CheckCircleIcon
                  className="h-3.5 w-3.5 text-emerald-600 shrink-0"
                  aria-hidden="true"
                />
                <span>All changes saved</span>
              </span>
            )}
            {saveStatus === 'failed' && (
              <button
                type="button"
                onClick={handleRetrySave}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-colors focus-ring"
              >
                <ExclamationCircleIcon
                  className="h-3.5 w-3.5 text-red-600 shrink-0"
                  aria-hidden="true"
                />
                <span className="underline underline-offset-2">
                  Save failed - Retry
                </span>
              </button>
            )}
            {saveStatus === 'unsaved_new' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-neutral-100 text-neutral-600 border border-neutral-200">
                <ClockIcon
                  className="h-3.5 w-3.5 text-neutral-500 shrink-0"
                  aria-hidden="true"
                />
                <span>Not saved yet</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleManualSave}
            disabled={manualSaving || isGenerating}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-neutral-300 rounded-control text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-50 transition-colors focus-ring"
          >
            <PencilIcon className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <span>Save</span>
          </button>

          <button
            type="button"
            data-testid="print-cover-letter-btn"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 border border-transparent rounded-control shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors focus-ring"
          >
            <PrinterIcon className="h-4 w-4" aria-hidden="true" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>
    </div>
  );

  const editorFormContent = (
    <div className="h-full min-h-0 flex flex-col bg-neutral-50 text-neutral-900 print:hidden">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 pb-12 space-y-4">
        {/* Section 1: Paired Resume */}
        <section className="bg-white rounded-card border border-neutral-200/90 shadow-card overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 bg-neutral-50/80 border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <DocumentTextIcon
                className="h-4 w-4 text-primary-600 shrink-0"
                aria-hidden="true"
              />
              <h2 className="text-sm sm:text-base font-semibold text-neutral-900">
                Paired Resume &amp; Letterhead
              </h2>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200/80">
              {activeTemplateName} style
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            <div>
              <label htmlFor="cl-resume-select" className={LABEL_CLASS}>
                Link to a Resume
              </label>
              <select
                id="cl-resume-select"
                value={coverLetter.resumeId || ''}
                onChange={(e) => handleResumeChange(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">No linked resume (use account basics)</option>
                {resumes.map((resume) => {
                  const rId = resume._id || resume.id || '';
                  const candidate = resume.content?.basics?.name?.trim();
                  const label = candidate
                    ? `${resume.title || 'Untitled Resume'} — ${candidate}`
                    : resume.title || 'Untitled Resume';
                  return (
                    <option key={rId} value={rId}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {linkedResume ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-control bg-primary-50/60 border border-primary-100 px-3.5 py-2.5 text-xs text-neutral-700">
                <div className="min-w-0">
                  <span className="font-semibold text-neutral-900">
                    Letterhead synced with:{' '}
                  </span>
                  <span>
                    {linkedResume.content?.basics?.name || 'Unnamed'}
                    {linkedResume.content?.basics?.label
                      ? ` · ${linkedResume.content.basics.label}`
                      : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSyncFromResume}
                  className="self-start sm:self-auto shrink-0 px-2.5 py-1 rounded-control text-xs font-medium bg-white border border-primary-200 text-primary-700 hover:bg-primary-50 transition-colors focus-ring"
                >
                  Reset Theme to Resume
                </button>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                Select one of your resumes to automatically reuse its contact
                header, template typography, and color palette.
              </p>
            )}
          </div>
        </section>

        {/* Section 2: Recipient & Date */}
        <section className="bg-white rounded-card border border-neutral-200/90 shadow-card overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 bg-neutral-50/80 border-b border-neutral-200/80">
            <h2 className="text-sm sm:text-base font-semibold text-neutral-900">
              Recipient &amp; Date
            </h2>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cl-recipient-name" className={LABEL_CLASS}>
                  Hiring Manager / Recipient Name
                </label>
                <input
                  id="cl-recipient-name"
                  type="text"
                  value={coverLetter.recipient?.name || ''}
                  onChange={(e) =>
                    setCoverLetter((prev) => ({
                      ...prev,
                      recipient: {
                        ...prev.recipient,
                        name: e.target.value,
                      },
                    }))
                  }
                  placeholder="e.g., Jordan Taylor"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="cl-recipient-company" className={LABEL_CLASS}>
                  Company / Organization
                </label>
                <input
                  id="cl-recipient-company"
                  type="text"
                  value={coverLetter.recipient?.company || ''}
                  onChange={(e) =>
                    setCoverLetter((prev) => ({
                      ...prev,
                      recipient: {
                        ...prev.recipient,
                        company: e.target.value,
                      },
                    }))
                  }
                  placeholder="e.g., Northstar Systems"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cl-date" className={LABEL_CLASS}>
                  Letter Date
                </label>
                <input
                  id="cl-date"
                  type="date"
                  value={coverLetter.date || ''}
                  onChange={(e) =>
                    setCoverLetter((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="cl-recipient-address" className={LABEL_CLASS}>
                  Company Address
                </label>
                <textarea
                  id="cl-recipient-address"
                  rows={2}
                  value={coverLetter.recipient?.address || ''}
                  onChange={(e) =>
                    setCoverLetter((prev) => ({
                      ...prev,
                      recipient: {
                        ...prev.recipient,
                        address: e.target.value,
                      },
                    }))
                  }
                  placeholder="100 Market St, San Francisco, CA"
                  className={TEXTAREA_CLASS}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Job Details */}
        <section className="bg-white rounded-card border border-neutral-200/90 shadow-card overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 bg-neutral-50/80 border-b border-neutral-200/80">
            <h2 className="text-sm sm:text-base font-semibold text-neutral-900">
              Target Role &amp; Job Description
            </h2>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            <div>
              <label htmlFor="cl-job-title" className={LABEL_CLASS}>
                Job Title
              </label>
              <input
                id="cl-job-title"
                type="text"
                value={coverLetter.jobTitle || ''}
                onChange={(e) =>
                  setCoverLetter((prev) => ({
                    ...prev,
                    jobTitle: e.target.value,
                  }))
                }
                placeholder="e.g., Senior Frontend Engineer"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="cl-job-description" className={LABEL_CLASS}>
                Job Description (optional — used for AI tailoring)
              </label>
              <textarea
                id="cl-job-description"
                rows={4}
                value={coverLetter.jobDescription || ''}
                onChange={(e) =>
                  setCoverLetter((prev) => ({
                    ...prev,
                    jobDescription: e.target.value,
                  }))
                }
                placeholder="Paste key responsibilities and requirements from the job posting..."
                className={TEXTAREA_CLASS}
              />
            </div>
          </div>
        </section>

        {/* Section 4: Letter Content & AI Assistant */}
        <section className="bg-white rounded-card border border-neutral-200/90 shadow-card overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 bg-neutral-50/80 border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-neutral-900">
              Letter Content
            </h2>
            <span className="text-xs text-neutral-500 tabular-nums">
              {paragraphCount} {paragraphCount === 1 ? 'paragraph' : 'paragraphs'} ·{' '}
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            <div>
              <label htmlFor="cl-greeting" className={LABEL_CLASS}>
                Greeting
              </label>
              <input
                id="cl-greeting"
                type="text"
                value={coverLetter.greeting || ''}
                onChange={(e) =>
                  setCoverLetter((prev) => ({
                    ...prev,
                    greeting: e.target.value,
                  }))
                }
                placeholder="Dear Hiring Manager,"
                className={INPUT_CLASS}
              />
            </div>

            {/* AI Drafting Controls */}
            <div className="rounded-card bg-accent-50/60 border border-accent-200/80 p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div>
                  <p className="text-xs font-semibold text-neutral-900">
                    Tailor from Paired Resume &amp; Job Description
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Generates structured paragraphs grounded in your resume and
                    role details.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="draft-with-ai-btn"
                  onClick={handleDraftWithAI}
                  disabled={isGenerating}
                  className="inline-flex items-center justify-center h-9 px-3.5 rounded-control shadow-sm text-xs sm:text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-60 transition-colors focus-ring shrink-0"
                >
                  {isGenerating ? (
                    <>
                      <ArrowPathIcon
                        className="h-4 w-4 mr-1.5 animate-spin"
                        aria-hidden="true"
                      />
                      <span>Drafting…</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon
                        className="h-4 w-4 mr-1.5"
                        aria-hidden="true"
                      />
                      <span>Draft with AI</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label htmlFor="cl-ai-prompt" className="sr-only">
                  Optional AI guidance
                </label>
                <input
                  id="cl-ai-prompt"
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Optional focus (e.g., highlight design systems & mentorship)..."
                  className="w-full h-9 px-3 text-xs sm:text-sm bg-white border border-accent-200 rounded-control text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="cl-body" className="text-xs font-medium text-neutral-700">
                  Body Paragraphs
                </label>
                <span className="text-[11px] text-neutral-500">
                  Separate paragraphs with a blank line
                </span>
              </div>
              <textarea
                id="cl-body"
                rows={11}
                value={coverLetter.body || ''}
                onChange={(e) =>
                  setCoverLetter((prev) => ({
                    ...prev,
                    body: e.target.value,
                  }))
                }
                placeholder={
                  'Write your opening paragraph introducing why you are excited about this role...\n\nAdd a second paragraph connecting your experience and skills to their goals...\n\nClose with enthusiasm for discussing how you can contribute.'
                }
                className={TEXTAREA_CLASS}
              />
            </div>

            <div>
              <label htmlFor="cl-closing" className={LABEL_CLASS}>
                Closing Sign-off
              </label>
              <input
                id="cl-closing"
                type="text"
                value={coverLetter.closing || ''}
                onChange={(e) =>
                  setCoverLetter((prev) => ({
                    ...prev,
                    closing: e.target.value,
                  }))
                }
                placeholder="Sincerely,"
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  const fallbackBasics = useMemo(
    () => ({
      name: user?.name || '',
      email: user?.email || '',
    }),
    [user?.email, user?.name]
  );

  // Keep persistedId state read so CRA lint sees no unused variable if referenced
  const rootDataId = persistedId || 'unsaved';

  return (
    <div
      data-letter-id={rootDataId}
      className="h-screen pt-16 bg-neutral-50 flex flex-col overflow-hidden print:!h-auto print:!pt-0 print:!bg-white print:!overflow-visible"
    >
      {editorToolbar}

      {/* Mobile View Switcher (< 1024px, down to 375px) */}
      {!isDesktop && (
        <div
          role="tablist"
          aria-label="Cover letter editor view"
          className="flex justify-center gap-3 py-2 px-4 bg-white border-b border-neutral-200 shrink-0 print:hidden"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'editor'}
            onClick={() => setActiveView('editor')}
            className={`px-4 py-1.5 rounded-control text-sm font-medium transition-colors focus-ring ${
              activeView === 'editor'
                ? 'bg-primary-50 text-primary-700 font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            Editor
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'preview'}
            onClick={() => setActiveView('preview')}
            className={`px-4 py-1.5 rounded-control text-sm font-medium transition-colors focus-ring ${
              activeView === 'preview'
                ? 'bg-primary-50 text-primary-700 font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            Preview
          </button>
        </div>
      )}

      <div
        ref={splitContainerRef}
        className="flex-1 min-h-0 print:!block print:!h-auto"
      >
        {isDesktop ? (
          <div className="flex h-full w-full min-h-0 print:!block print:!h-auto">
            <div
              className="h-full min-w-0 overflow-hidden print:hidden"
              style={{ width: `${leftPanePercent}%` }}
            >
              {editorFormContent}
            </div>

            <div
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-valuemin={34}
              aria-valuemax={64}
              aria-valuenow={Math.round(leftPanePercent)}
              aria-label="Resize cover letter editor and preview panels"
              title="Drag or use arrow keys to resize panels"
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  setLeftPanePercent((p) => Math.max(34, p - 2));
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  setLeftPanePercent((p) => Math.min(64, p + 2));
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                const container = splitContainerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                if (!rect.width) return;

                const onMove = (moveEvent: MouseEvent) => {
                  const pct =
                    ((moveEvent.clientX - rect.left) / rect.width) * 100;
                  setLeftPanePercent(Math.max(34, Math.min(64, pct)));
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
              className="w-2 shrink-0 bg-neutral-200 hover:bg-primary-500 active:bg-primary-600 focus:outline-none focus-visible:bg-primary-500 transition-colors duration-150 flex items-center justify-center cursor-col-resize select-none print:hidden"
            >
              <div className="h-8 w-1 rounded-full bg-neutral-400/70 pointer-events-none" />
            </div>

            <div
              className="h-full min-w-0 flex-1 print:!w-full print:!h-auto"
            >
              <CoverLetterPreview
                coverLetter={coverLetter}
                linkedResume={linkedResume}
                fallbackBasics={fallbackBasics}
                onChange={(updated) => setCoverLetter(updated)}
                onPrint={handlePrint}
              />
            </div>
          </div>
        ) : activeView === 'editor' ? (
          editorFormContent
        ) : (
          <CoverLetterPreview
            coverLetter={coverLetter}
            linkedResume={linkedResume}
            fallbackBasics={fallbackBasics}
            onChange={(updated) => setCoverLetter(updated)}
            onPrint={handlePrint}
          />
        )}
      </div>
    </div>
  );
};

export default CoverLetterEditor;
