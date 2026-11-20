import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ArrowUpTrayIcon, PlusIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { defaultResume } from '../constants/editorConstants';
import { portfolioService } from '../services/portfolio.service';
import { Resume, resumeService } from '../services/resume.service';
import { IPortfolio } from '../types/portfolio';
import Header, { AppTab } from './common/Header';
import UnsavedChangesDialog from './common/UnsavedChangesDialog';
import CoverLettersWorkspace from './coverLetters/CoverLettersWorkspace';
import ImportResumeModal from './ImportResumeModal';
import JobMatch from './jobMatch/JobMatch';
import JobTracker from './jobTracker/JobTracker';
import { CheckMatchPrefill } from './jobTracker/ApplicationDrawer';
import ResumeEditor from './ResumeEditor';
import ResumeList from './ResumeList';
import { PortfolioList } from './portfolio/PortfolioList';
import { PortfolioEditor } from './portfolio/PortfolioEditor';
import { removeToken } from '../utils/token';
import { Container } from './ui/container';

interface HomePageProps {
  onLogout?: () => void;
  user?: {
    name?: string;
    email?: string;
  } | null;
}

export interface WorkspaceUrlState {
  tab: AppTab;
  view: 'list' | 'editor';
  id: string | null;
}

type PendingDirtyNavigation =
  | { kind: 'tab'; targetTab: AppTab }
  | { kind: 'popstate'; targetUrlState: WorkspaceUrlState };

export const parseWorkspaceUrl = (search: string): WorkspaceUrlState => {
  const params = new URLSearchParams(search || '');
  const tabParam = params.get('tab');
  const tab: AppTab =
    tabParam === 'cover-letters' ||
    tabParam === 'portfolios' ||
    tabParam === 'job-match' ||
    tabParam === 'job-tracker'
      ? tabParam
      : 'resumes';

  const supportsEditor = tab === 'resumes' || tab === 'portfolios';
  const view: 'list' | 'editor' =
    supportsEditor && params.get('view') === 'editor' ? 'editor' : 'list';
  const rawId = view === 'editor' ? params.get('id')?.trim() || null : null;

  return { tab, view, id: rawId };
};

export const buildWorkspaceUrl = (state: WorkspaceUrlState): string => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
  const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
  const supportsEditor = state.tab === 'resumes' || state.tab === 'portfolios';
  const resolvedView: 'list' | 'editor' = supportsEditor ? state.view : 'list';

  const params = new URLSearchParams();
  params.set('tab', state.tab);
  params.set('view', resolvedView);
  if (supportsEditor && resolvedView === 'editor' && state.id) {
    params.set('id', state.id);
  }

  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}${hash}`;
};

const syncBrowserUrl = (state: WorkspaceUrlState, mode: 'push' | 'replace'): void => {
  if (typeof window === 'undefined' || !window.history) return;
  const nextUrl = buildWorkspaceUrl(state);
  const currentUrl = `${window.location.pathname || '/'}${window.location.search || ''}${
    window.location.hash || ''
  }`;
  if (nextUrl === currentUrl) {
    return;
  }
  if (mode === 'push') {
    window.history.pushState(state, '', nextUrl);
  } else {
    window.history.replaceState(state, '', nextUrl);
  }
};

const formatResumeCountSubtitle = (count: number | null): string => {
  if (count === null) {
    return 'Loading your resumes…';
  }
  if (count === 0) {
    return '0 resumes · Create a resume from scratch or generate one with AI';
  }
  if (count === 1) {
    return '1 resume · Manage, customize, and share your CV';
  }
  return `${count} resumes · Manage, customize, and share your CVs`;
};

export default function HomePage({ onLogout, user }: HomePageProps) {
  const initialUrlState = useMemo(
    () => parseWorkspaceUrl(typeof window !== 'undefined' ? window.location.search : ''),
    []
  );

  const [activeTab, setActiveTab] = useState<AppTab>(initialUrlState.tab);
  const [activeView, setActiveView] = useState<'list' | 'editor'>(
    initialUrlState.tab === 'resumes' ? initialUrlState.view : 'list'
  );
  const [portfolioView, setPortfolioView] = useState<'list' | 'editor'>(
    initialUrlState.tab === 'portfolios' ? initialUrlState.view : 'list'
  );
  const [requestedDocId, setRequestedDocId] = useState<string | null>(
    initialUrlState.view === 'editor' ? initialUrlState.id : null
  );
  const [hydratingEditor, setHydratingEditor] = useState<boolean>(
    Boolean(initialUrlState.view === 'editor' && initialUrlState.id)
  );

  const [jobMatchPrefill, setJobMatchPrefill] = useState<CheckMatchPrefill | null>(null);
  const [coverLetterResetKey, setCoverLetterResetKey] = useState(0);

  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<IPortfolio | null>(null);

  const [isResumeDirty, setIsResumeDirty] = useState(false);
  const [isPortfolioDirty, setIsPortfolioDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingDirtyNavigation | null>(null);
  const discardResumeChangesRef = useRef<(() => void) | null>(null);

  const registerResumeDiscardHandler = useCallback(
    (handler: (() => void) | null) => {
      discardResumeChangesRef.current = handler;
    },
    []
  );

  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [resumeCount, setResumeCount] = useState<number | null>(null);

  const prefilledNewResume = useMemo<Resume>(
    () => ({
      ...defaultResume,
      content: {
        ...defaultResume.content,
        basics: {
          ...defaultResume.content.basics,
          name: user?.name?.trim() || '',
          email: user?.email?.trim() || '',
          location: {
            ...defaultResume.content.basics.location,
          },
        },
        sections: [...defaultResume.content.sections],
        sectionOrder: [...defaultResume.content.sectionOrder],
      },
    }),
    [user?.name, user?.email]
  );

  const currentWorkspaceState = useMemo<WorkspaceUrlState>(() => {
    if (activeTab === 'resumes') {
      const resumeId =
        activeView === 'editor'
          ? selectedResume?._id || selectedResume?.id || requestedDocId
          : null;
      return { tab: 'resumes', view: activeView, id: resumeId || null };
    }
    if (activeTab === 'portfolios') {
      const portfolioId =
        portfolioView === 'editor'
          ? selectedPortfolio?._id || selectedPortfolio?.id || requestedDocId
          : null;
      return { tab: 'portfolios', view: portfolioView, id: portfolioId || null };
    }
    return { tab: activeTab, view: 'list', id: null };
  }, [
    activeTab,
    activeView,
    portfolioView,
    selectedResume,
    selectedPortfolio,
    requestedDocId,
  ]);

  const isActiveEditorOpen =
    (activeTab === 'resumes' && activeView === 'editor') ||
    (activeTab === 'portfolios' && portfolioView === 'editor');

  const isActiveEditorDirty =
    (activeTab === 'resumes' && activeView === 'editor' && isResumeDirty) ||
    (activeTab === 'portfolios' && portfolioView === 'editor' && isPortfolioDirty);

  const currentStateRef = useRef<WorkspaceUrlState>(currentWorkspaceState);
  currentStateRef.current = currentWorkspaceState;
  const isEditorOpenRef = useRef<boolean>(isActiveEditorOpen);
  isEditorOpenRef.current = isActiveEditorOpen;
  const isEditorDirtyRef = useRef<boolean>(isActiveEditorDirty);
  isEditorDirtyRef.current = isActiveEditorDirty;
  const selectedResumeRef = useRef<Resume | null>(selectedResume);
  selectedResumeRef.current = selectedResume;
  const selectedPortfolioRef = useRef<IPortfolio | null>(selectedPortfolio);
  selectedPortfolioRef.current = selectedPortfolio;

  // Normalize initial history entry so browser Back has explicit query parameters
  useEffect(() => {
    syncBrowserUrl(initialUrlState, 'replace');
  }, [initialUrlState]);

  const applyWorkspaceUrlState = useCallback((next: WorkspaceUrlState) => {
    setIsResumeDirty(false);
    setIsPortfolioDirty(false);
    setActiveTab(next.tab);

    if (next.tab === 'resumes') {
      setPortfolioView('list');
      if (next.view === 'editor') {
        if (!next.id) {
          setSelectedResume(null);
          setRequestedDocId(null);
          setHydratingEditor(false);
        } else {
          const currentId =
            selectedResumeRef.current?._id || selectedResumeRef.current?.id;
          if (currentId !== next.id) {
            setSelectedResume(null);
            setHydratingEditor(true);
          } else {
            setHydratingEditor(false);
          }
          setRequestedDocId(next.id);
        }
        setActiveView('editor');
      } else {
        setRequestedDocId(null);
        setHydratingEditor(false);
        setActiveView('list');
      }
      return;
    }

    if (next.tab === 'portfolios') {
      setActiveView('list');
      if (next.view === 'editor') {
        if (!next.id) {
          setSelectedPortfolio(null);
          setRequestedDocId(null);
          setHydratingEditor(false);
        } else {
          const currentId =
            selectedPortfolioRef.current?._id || selectedPortfolioRef.current?.id;
          if (currentId !== next.id) {
            setSelectedPortfolio(null);
            setHydratingEditor(true);
          } else {
            setHydratingEditor(false);
          }
          setRequestedDocId(next.id);
        }
        setPortfolioView('editor');
      } else {
        setRequestedDocId(null);
        setHydratingEditor(false);
        setPortfolioView('list');
      }
      return;
    }

    setActiveView('list');
    setPortfolioView('list');
    setRequestedDocId(null);
    setHydratingEditor(false);
  }, []);

  // Hydrate deep-linked or history-restored resume editor by ID
  useEffect(() => {
    if (activeTab !== 'resumes' || activeView !== 'editor' || !requestedDocId) {
      return;
    }
    const loadedId = selectedResume?._id || selectedResume?.id;
    if (loadedId === requestedDocId) {
      setHydratingEditor(false);
      return;
    }

    let cancelled = false;
    setHydratingEditor(true);

    resumeService
      .getResumeById(requestedDocId)
      .then((fetched) => {
        if (cancelled) return;
        setSelectedResume(fetched);
        setHydratingEditor(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        const message =
          err?.status === 404
            ? 'Resume not found'
            : err instanceof Error && err.message
            ? err.message
            : 'Failed to load resume';
        toast.error(message);
        setSelectedResume(null);
        setRequestedDocId(null);
        setHydratingEditor(false);
        setActiveView('list');
        syncBrowserUrl({ tab: 'resumes', view: 'list', id: null }, 'replace');
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, activeView, requestedDocId, selectedResume]);

  // Hydrate deep-linked or history-restored portfolio editor by ID
  useEffect(() => {
    if (activeTab !== 'portfolios' || portfolioView !== 'editor' || !requestedDocId) {
      return;
    }
    const loadedId = selectedPortfolio?._id || selectedPortfolio?.id;
    if (loadedId === requestedDocId) {
      setHydratingEditor(false);
      return;
    }

    let cancelled = false;
    setHydratingEditor(true);

    portfolioService
      .getPortfolioById(requestedDocId)
      .then((fetched) => {
        if (cancelled) return;
        setSelectedPortfolio(fetched);
        setHydratingEditor(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        const message =
          err?.status === 404
            ? 'Portfolio not found'
            : err instanceof Error && err.message
            ? err.message
            : 'Failed to load portfolio';
        toast.error(message);
        setSelectedPortfolio(null);
        setRequestedDocId(null);
        setHydratingEditor(false);
        setPortfolioView('list');
        syncBrowserUrl({ tab: 'portfolios', view: 'list', id: null }, 'replace');
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, portfolioView, requestedDocId, selectedPortfolio]);

  // Listen to browser Back/Forward (popstate) and guard dirty editors
  useEffect(() => {
    const handlePopState = () => {
      const targetUrlState = parseWorkspaceUrl(window.location.search);
      const current = currentStateRef.current;
      const isLeavingEditor =
        isEditorOpenRef.current &&
        (targetUrlState.tab !== current.tab ||
          targetUrlState.view !== 'editor' ||
          targetUrlState.id !== current.id);

      if (isLeavingEditor && isEditorDirtyRef.current) {
        window.history.pushState(current, '', buildWorkspaceUrl(current));
        setPendingNavigation({ kind: 'popstate', targetUrlState });
        return;
      }

      applyWorkspaceUrlState(targetUrlState);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [applyWorkspaceUrlState]);

  const handleResumesLoad = useCallback((resumes: Resume[]) => {
    setResumeCount(resumes.length);
  }, []);

  const handleLogout = () => {
    removeToken();
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', window.location.pathname || '/');
    }
    onLogout?.();
  };

  const executeTabNavigation = useCallback((tab: AppTab) => {
    setIsResumeDirty(false);
    setIsPortfolioDirty(false);
    setRequestedDocId(null);
    setHydratingEditor(false);
    setActiveTab(tab);
    if (tab === 'portfolios') setPortfolioView('list');
    if (tab === 'resumes') setActiveView('list');
    if (tab === 'cover-letters') setCoverLetterResetKey((k) => k + 1);
    syncBrowserUrl({ tab, view: 'list', id: null }, 'push');
  }, []);

  const handleHeaderTabChange = useCallback(
    (tab: AppTab) => {
      if (isEditorOpenRef.current && isEditorDirtyRef.current) {
        setPendingNavigation({ kind: 'tab', targetTab: tab });
        return;
      }
      executeTabNavigation(tab);
    },
    [executeTabNavigation]
  );

  const handleConfirmPendingDiscard = useCallback(() => {
    const pending = pendingNavigation;
    discardResumeChangesRef.current?.();
    setPendingNavigation(null);
    setIsResumeDirty(false);
    setIsPortfolioDirty(false);

    if (!pending) return;

    if (pending.kind === 'tab') {
      executeTabNavigation(pending.targetTab);
    } else {
      applyWorkspaceUrlState(pending.targetUrlState);
      syncBrowserUrl(pending.targetUrlState, 'replace');
    }
  }, [pendingNavigation, executeTabNavigation, applyWorkspaceUrlState]);

  const handleAIGeneration = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    setLoading(true);
    try {
      const resume = await resumeService.generateFromPrompt(prompt, {
        name: user?.name?.trim() || 'Your Name',
        email: user?.email?.trim() || 'you@example.com',
      });
      const createdId = resume._id || resume.id || null;
      toast.success('Resume generated successfully!');
      setShowPromptModal(false);
      setSelectedResume(resume);
      setRequestedDocId(createdId);
      setHydratingEditor(false);
      setActiveView('editor');
      syncBrowserUrl({ tab: 'resumes', view: 'editor', id: createdId }, 'push');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate resume');
    } finally {
      setLoading(false);
    }
  };

  const handleEditResume = (resume: Resume) => {
    const resumeId = resume._id || resume.id || null;
    setIsResumeDirty(false);
    setSelectedResume(resume);
    setRequestedDocId(resumeId);
    setHydratingEditor(false);
    setActiveView('editor');
    syncBrowserUrl({ tab: 'resumes', view: 'editor', id: resumeId }, 'push');
  };

  const handleNewResume = () => {
    setIsResumeDirty(false);
    setSelectedResume(null);
    setRequestedDocId(null);
    setHydratingEditor(false);
    setActiveView('editor');
    syncBrowserUrl({ tab: 'resumes', view: 'editor', id: null }, 'push');
  };

  const handleResumePersisted = useCallback(
    (savedResume: Resume) => {
      const savedId =
        savedResume?._id ||
        savedResume?.id ||
        (savedResume as any)?.data?._id ||
        (savedResume as any)?.data?.id ||
        null;

      if (savedResume && typeof savedResume === 'object') {
        setSelectedResume((prev) => {
          const base = prev || prefilledNewResume;
          return savedResume.content
            ? { ...base, ...savedResume }
            : {
                ...base,
                ...(savedId ? { _id: savedId, id: savedId } : {}),
              };
        });
      }

      if (savedId) {
        setRequestedDocId(savedId);
        syncBrowserUrl({ tab: 'resumes', view: 'editor', id: savedId }, 'replace');
      }
    },
    [prefilledNewResume]
  );

  const handleResumeBack = useCallback(() => {
    setIsResumeDirty(false);
    setRequestedDocId(null);
    setHydratingEditor(false);
    setActiveView('list');
    syncBrowserUrl({ tab: 'resumes', view: 'list', id: null }, 'push');
  }, []);

  const handleEditPortfolio = (portfolio: IPortfolio) => {
    const portfolioId = portfolio._id || portfolio.id || null;
    setIsPortfolioDirty(false);
    setSelectedPortfolio(portfolio);
    setRequestedDocId(portfolioId);
    setHydratingEditor(false);
    setPortfolioView('editor');
    syncBrowserUrl({ tab: 'portfolios', view: 'editor', id: portfolioId }, 'push');
  };

  const handleNewPortfolio = () => {
    setIsPortfolioDirty(false);
    setSelectedPortfolio(null);
    setRequestedDocId(null);
    setHydratingEditor(false);
    setPortfolioView('editor');
    syncBrowserUrl({ tab: 'portfolios', view: 'editor', id: null }, 'push');
  };

  const handlePortfolioSaved = useCallback((savedPortfolio: IPortfolio) => {
    const savedId = savedPortfolio?._id || savedPortfolio?.id || null;
    if (savedPortfolio && typeof savedPortfolio === 'object') {
      setSelectedPortfolio(savedPortfolio);
    }
    if (savedId) {
      setRequestedDocId(savedId);
      syncBrowserUrl({ tab: 'portfolios', view: 'editor', id: savedId }, 'replace');
    }
  }, []);

  const handlePortfolioBack = useCallback(() => {
    setIsPortfolioDirty(false);
    setRequestedDocId(null);
    setHydratingEditor(false);
    setPortfolioView('list');
    syncBrowserUrl({ tab: 'portfolios', view: 'list', id: null }, 'push');
  }, []);

  const hasResumes = (resumeCount ?? 0) > 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header with Resumes & Portfolios tabs */}
      {!(activeTab === 'portfolios' && portfolioView === 'editor') && (
        <Header
          showLogout
          onLogout={handleLogout}
          activeTab={activeTab}
          onTabChange={handleHeaderTabChange}
        />
      )}

      {/* Resumes Tab Content */}
      {activeTab === 'resumes' && (
        <>
          {activeView === 'list' && (
            <Container as="main" className="pt-24 sm:pt-28 pb-12">
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                    My Resumes
                  </h1>
                  <p
                    data-testid="resumes-count-subtitle"
                    className="mt-1.5 text-sm text-neutral-600"
                  >
                    {formatResumeCountSubtitle(resumeCount)}
                  </p>
                </div>

                {hasResumes && (
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleNewResume}
                      className="inline-flex items-center justify-center h-10 px-4 border border-transparent rounded-control shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors focus-ring"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                      New Resume
                    </button>
                    <button
                      type="button"
                      data-testid="import-resume-btn"
                      onClick={() => setShowImportModal(true)}
                      className="inline-flex items-center justify-center h-10 px-4 border border-neutral-300 rounded-control shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus-ring"
                    >
                      <ArrowUpTrayIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                      Import
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPromptModal(true)}
                      className="inline-flex items-center justify-center h-10 px-4 border border-transparent rounded-control shadow-sm text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 transition-colors focus-ring"
                    >
                      <SparklesIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                      AI Generate
                    </button>
                  </div>
                )}
              </div>

              <ResumeList
                onEditResume={handleEditResume}
                onNewResume={handleNewResume}
                onImportResume={() => setShowImportModal(true)}
                onAIGenerate={() => setShowPromptModal(true)}
                onResumesLoad={handleResumesLoad}
              />
            </Container>
          )}

          {activeView === 'editor' &&
            (hydratingEditor ? (
              <div
                role="status"
                aria-live="polite"
                data-testid="hydrating-resume-editor"
                className="min-h-screen pt-24 flex items-center justify-center text-sm text-neutral-600"
              >
                Loading resume…
              </div>
            ) : (
              <ResumeEditor
                initialResume={selectedResume || prefilledNewResume}
                onSave={handleResumePersisted}
                onPersist={handleResumePersisted}
                onDirtyChange={setIsResumeDirty}
                registerDiscardHandler={registerResumeDiscardHandler}
                onBack={handleResumeBack}
              />
            ))}
        </>
      )}

      {activeTab === 'cover-letters' && (
        <CoverLettersWorkspace user={user} resetSignal={coverLetterResetKey} />
      )}

      {activeTab === 'job-match' && (
        <Container as="main" className="pt-24 sm:pt-28 pb-12">
          <JobMatch
            initialResumeId={jobMatchPrefill?.resumeId}
            initialJobDescription={jobMatchPrefill?.jobDescription}
            initialJobTitle={jobMatchPrefill?.jobTitle}
          />
        </Container>
      )}

      {activeTab === 'job-tracker' && (
        <Container as="main" className="pt-24 sm:pt-28 pb-12">
          <JobTracker
            onCheckMatch={(prefill) => {
              setJobMatchPrefill(prefill);
              setActiveTab('job-match');
              syncBrowserUrl({ tab: 'job-match', view: 'list', id: null }, 'push');
            }}
          />
        </Container>
      )}

      {/* Portfolios Tab Content */}
      {activeTab === 'portfolios' && (
        <>
          {portfolioView === 'list' && (
            <Container as="main" className="pt-24 sm:pt-28 pb-12">
              <PortfolioList
                onEditPortfolio={handleEditPortfolio}
                onNewPortfolio={handleNewPortfolio}
              />
            </Container>
          )}

          {portfolioView === 'editor' &&
            (hydratingEditor ? (
              <div
                role="status"
                aria-live="polite"
                data-testid="hydrating-portfolio-editor"
                className="min-h-screen pt-24 flex items-center justify-center text-sm text-neutral-600"
              >
                Loading portfolio…
              </div>
            ) : (
              <PortfolioEditor
                initialPortfolio={selectedPortfolio || undefined}
                onSave={handlePortfolioSaved}
                onDirtyChange={setIsPortfolioDirty}
                onBack={handlePortfolioBack}
              />
            ))}
        </>
      )}

      {/* AI Prompt Modal */}
      {showPromptModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-prompt-modal-title"
          className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
        >
          <div className="bg-white rounded-panel border border-neutral-200 w-full max-w-lg mx-4 shadow-modal transform transition-all">
            <div className="p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2
                  id="ai-prompt-modal-title"
                  className="text-xl sm:text-2xl font-semibold text-neutral-900"
                >
                  Generate AI Resume
                </h2>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setShowPromptModal(false)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-control text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors focus-ring"
                >
                  <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="prompt" className="block text-sm font-medium text-neutral-700 mb-2">
                    Enter your requirements
                  </label>
                  <textarea
                    id="prompt"
                    className="w-full h-40 p-3.5 border border-neutral-300 rounded-control text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm sm:text-base"
                    placeholder="Describe your experience, skills, and the type of resume you want..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPromptModal(false)}
                    className="w-full sm:w-auto h-10 px-4 border border-neutral-300 bg-white text-neutral-700 rounded-control hover:bg-neutral-50 text-sm font-medium transition-colors focus-ring"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAIGeneration}
                    disabled={loading}
                    className="w-full sm:w-auto h-10 px-5 bg-accent-600 hover:bg-accent-700 text-white rounded-control shadow-sm disabled:opacity-50 text-sm font-medium transition-colors focus-ring"
                  >
                    {loading ? 'Generating...' : 'Generate Resume'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Resume Modal */}
      <ImportResumeModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        user={user}
        onImported={(createdResume) => {
          const createdId = createdResume._id || createdResume.id || null;
          setShowImportModal(false);
          setSelectedResume(createdResume);
          setRequestedDocId(createdId);
          setHydratingEditor(false);
          setActiveView('editor');
          syncBrowserUrl({ tab: 'resumes', view: 'editor', id: createdId }, 'push');
        }}
      />

      {/* Dirty Exit Confirmation Dialog for Header Tabs & Browser Back */}
      <UnsavedChangesDialog
        isOpen={pendingNavigation !== null}
        onCancel={() => setPendingNavigation(null)}
        onConfirmDiscard={handleConfirmPendingDiscard}
      />
    </div>
  );
}
