import React, { useState, useCallback } from 'react';
import { ArrowUpTrayIcon, PlusIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Resume, resumeService } from '../services/resume.service';
import { IPortfolio } from '../types/portfolio';
import Header, { AppTab } from './common/Header';
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
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const tabParam = urlParams?.get('tab');
  const initialTab: AppTab =
    tabParam === 'cover-letters' || tabParam === 'portfolios' || tabParam === 'job-match' || tabParam === 'job-tracker'
      ? tabParam
      : 'resumes';
  const initialView = urlParams?.get('view') === 'editor' ? 'editor' : 'list';

  const [activeTab, setActiveTab] = useState<AppTab>(initialTab);
  const [activeView, setActiveView] = useState<'list' | 'editor'>('list');
  const [portfolioView, setPortfolioView] = useState<'list' | 'editor'>(initialView);
  const [jobMatchPrefill, setJobMatchPrefill] = useState<CheckMatchPrefill | null>(null);
  const [coverLetterResetKey, setCoverLetterResetKey] = useState(0);

  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<IPortfolio | null>(null);

  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [resumeCount, setResumeCount] = useState<number | null>(null);

  const handleResumesLoad = useCallback((resumes: Resume[]) => {
    setResumeCount(resumes.length);
  }, []);

  const handleLogout = () => {
    removeToken();
    onLogout?.();
  };

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
      toast.success('Resume generated successfully!');
      setShowPromptModal(false);
      setSelectedResume(resume);
      setActiveView('editor');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate resume');
    } finally {
      setLoading(false);
    }
  };

  const handleEditResume = (resume: Resume) => {
    setSelectedResume(resume);
    setActiveView('editor');
  };

  const handleNewResume = () => {
    setSelectedResume(null);
    setActiveView('editor');
  };

  const handleEditPortfolio = (portfolio: IPortfolio) => {
    setSelectedPortfolio(portfolio);
    setPortfolioView('editor');
  };

  const handleNewPortfolio = () => {
    setSelectedPortfolio(null);
    setPortfolioView('editor');
  };

  const hasResumes = (resumeCount ?? 0) > 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header with Resumes & Portfolios tabs */}
      {!(activeTab === 'portfolios' && portfolioView === 'editor') && (
        <Header
          showLogout
          onLogout={handleLogout}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab === 'portfolios') setPortfolioView('list');
            if (tab === 'resumes') setActiveView('list');
            if (tab === 'cover-letters') setCoverLetterResetKey((k) => k + 1);
          }}
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

          {activeView === 'editor' && (
            <ResumeEditor
              initialResume={selectedResume || undefined}
              onSave={() => {
                toast.success('Resume saved successfully!');
                setActiveView('list');
              }}
              onBack={() => setActiveView('list')}
            />
          )}
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

          {portfolioView === 'editor' && (
            <PortfolioEditor
              initialPortfolio={selectedPortfolio || undefined}
              onSave={() => {
                setPortfolioView('list');
              }}
              onBack={() => setPortfolioView('list')}
            />
          )}
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
          setShowImportModal(false);
          setSelectedResume(createdResume);
          setActiveView('editor');
        }}
      />
    </div>
  );
}
