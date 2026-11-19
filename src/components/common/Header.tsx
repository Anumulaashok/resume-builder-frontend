import React from 'react';
import { DocumentTextIcon, GlobeAltIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Container } from '../ui/container';

export type AppTab = 'resumes' | 'job-match' | 'portfolios';

interface HeaderProps {
  showLogout?: boolean;
  onLogout?: () => void;
  activeTab?: AppTab;
  onTabChange?: (tab: AppTab) => void;
}

const Header: React.FC<HeaderProps> = ({
  showLogout = false,
  onLogout,
  activeTab = 'resumes',
  onTabChange
}) => {
  const brandContent = (
    <>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-control bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100">
        <DocumentTextIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-base sm:text-lg font-bold tracking-tight text-neutral-900">
        Smart CV &amp; Portfolio
      </span>
    </>
  );

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-neutral-200/80 shadow-header fixed top-0 left-0 right-0 z-20">
      <Container>
        <div className="flex justify-between items-center h-16 gap-3">
          <div className="flex items-center gap-4 sm:gap-8 min-w-0">
            {onTabChange ? (
              <button
                type="button"
                onClick={() => onTabChange('resumes')}
                className="flex items-center gap-2.5 rounded-control px-1.5 py-1 -ml-1.5 text-left transition-colors hover:bg-neutral-50 focus-ring"
              >
                {brandContent}
              </button>
            ) : (
              <div className="flex items-center gap-2.5">{brandContent}</div>
            )}

            {/* Navigation Tabs */}
            {onTabChange && (
              <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => onTabChange('resumes')}
                  aria-current={activeTab === 'resumes' ? 'page' : undefined}
                  className={`h-9 px-3 rounded-control text-sm font-medium transition-colors flex items-center gap-1.5 focus-ring ${
                    activeTab === 'resumes'
                      ? 'bg-primary-50 text-primary-700 font-semibold ring-1 ring-inset ring-primary-200/70'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <DocumentTextIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Resumes</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('job-match')}
                  aria-current={activeTab === 'job-match' ? 'page' : undefined}
                  className={`h-9 px-3 rounded-control text-sm font-medium transition-colors flex items-center gap-1.5 focus-ring ${
                    activeTab === 'job-match'
                      ? 'bg-primary-50 text-primary-700 font-semibold ring-1 ring-inset ring-primary-200/70'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <SparklesIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Job Match</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('portfolios')}
                  aria-current={activeTab === 'portfolios' ? 'page' : undefined}
                  className={`h-9 px-3 rounded-control text-sm font-medium transition-colors flex items-center gap-1.5 focus-ring ${
                    activeTab === 'portfolios'
                      ? 'bg-primary-50 text-primary-700 font-semibold ring-1 ring-inset ring-primary-200/70'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <GlobeAltIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Portfolios</span>
                </button>
              </nav>
            )}
          </div>

          {showLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center h-9 px-3.5 border border-neutral-200 text-sm font-medium rounded-control text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus-ring shrink-0"
            >
              Logout
            </button>
          )}
        </div>
      </Container>
    </header>
  );
};

export default Header;
