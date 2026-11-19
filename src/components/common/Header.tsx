import React, { useEffect, useRef, useState } from 'react';
import {
  Bars3Icon,
  DocumentTextIcon,
  GlobeAltIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Container } from '../ui/container';

export type AppTab = 'resumes' | 'job-match' | 'portfolios';

export const SM_MEDIA_QUERY = '(min-width: 640px)';

export function useIsSmUp(): boolean {
  const [isSmUp, setIsSmUp] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }
    return Boolean(window.matchMedia(SM_MEDIA_QUERY)?.matches);
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(SM_MEDIA_QUERY);
    if (!mql) {
      return;
    }
    setIsSmUp((prev) => (prev === mql.matches ? prev : mql.matches));

    const onChange = (event: MediaQueryListEvent) => {
      setIsSmUp(event.matches);
    };

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    if (typeof mql.addListener === 'function') {
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, []);

  return isSmUp;
}

interface HeaderProps {
  showLogout?: boolean;
  onLogout?: () => void;
  activeTab?: AppTab;
  onTabChange?: (tab: AppTab) => void;
}

const NAV_TABS: ReadonlyArray<{
  id: AppTab;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = [
  { id: 'resumes', label: 'Resumes', Icon: DocumentTextIcon },
  { id: 'job-match', label: 'Job Match', Icon: SparklesIcon },
  { id: 'portfolios', label: 'Portfolios', Icon: GlobeAltIcon },
];

const Header: React.FC<HeaderProps> = ({
  showLogout = false,
  onLogout,
  activeTab = 'resumes',
  onTabChange,
}) => {
  const isSmUp = useIsSmUp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const menuToggleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isSmUp || !onTabChange) {
      setIsMobileMenuOpen(false);
    }
  }, [isSmUp, onTabChange]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMobileMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      if (
        headerRef.current &&
        event.target instanceof Node &&
        !headerRef.current.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isMobileMenuOpen]);

  const brandContent = (
    <>
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100">
        <DocumentTextIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      {isSmUp ? (
        <span className="text-sm md:text-lg font-bold tracking-tight text-neutral-900 whitespace-nowrap">
          Smart CV &amp; Portfolio
        </span>
      ) : (
        <span className="text-base font-bold tracking-tight text-neutral-900 whitespace-nowrap">
          Smart CV
        </span>
      )}
    </>
  );

  return (
    <header
      ref={headerRef}
      className="bg-white/95 backdrop-blur-sm border-b border-neutral-200/80 shadow-header fixed top-0 left-0 right-0 z-20"
    >
      <Container>
        <div className="flex justify-between items-center h-16 gap-2 sm:gap-3">
          <div className="flex items-center gap-3 md:gap-5 lg:gap-8 min-w-0">
            {onTabChange ? (
              <button
                type="button"
                onClick={() => {
                  onTabChange('resumes');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 sm:gap-2.5 rounded-control px-1.5 py-1 -ml-1.5 text-left transition-colors hover:bg-neutral-50 focus-ring shrink-0"
              >
                {brandContent}
              </button>
            ) : (
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">{brandContent}</div>
            )}

            {/* Desktop / Tablet Navigation Tabs (sm and above) */}
            {isSmUp && onTabChange && (
              <nav aria-label="Main navigation" className="hidden sm:flex items-center gap-1 md:gap-1.5">
                {NAV_TABS.map(({ id, label, Icon }) => {
                  const isActive = activeTab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onTabChange(id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`h-9 px-2.5 md:px-3 rounded-control text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-ring ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 font-semibold ring-1 ring-inset ring-primary-200/70'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                      }`}
                    >
                      <Icon className="hidden md:block w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          {(showLogout || (!isSmUp && onTabChange)) && (
            <div className="flex items-center gap-2 shrink-0">
              {showLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center justify-center h-9 px-3 sm:px-3.5 border border-neutral-200 text-sm font-medium rounded-control text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus-ring shrink-0 whitespace-nowrap"
                >
                  Logout
                </button>
              )}

              {!isSmUp && onTabChange && (
                <button
                  ref={menuToggleRef}
                  type="button"
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="mobile-main-navigation"
                  aria-label="Toggle navigation menu"
                  className="sm:hidden inline-flex items-center justify-center h-9 w-9 border border-neutral-200 rounded-control text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus-ring shrink-0"
                >
                  {isMobileMenuOpen ? (
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </Container>

      {!isSmUp && onTabChange && isMobileMenuOpen && (
        <div
          id="mobile-main-navigation"
          className="sm:hidden border-t border-neutral-200/80 bg-white shadow-card"
        >
          <Container className="py-2">
            <nav aria-label="Main navigation" className="flex flex-col gap-1">
              {NAV_TABS.map(({ id, label, Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      onTabChange(id);
                      setIsMobileMenuOpen(false);
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full h-10 px-3 rounded-control text-sm font-medium transition-colors flex items-center gap-2.5 focus-ring ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-semibold ring-1 ring-inset ring-primary-200/70'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
};

export default Header;
