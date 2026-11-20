import React, { useEffect, useState } from 'react';
import {
  PlusIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  IdentificationIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { portfolioService } from '../../services/portfolio.service';
import { careerProfileService } from '../../services/careerProfile.service';
import { IPortfolio } from '../../types/portfolio';
import { Skeleton } from '../ui/skeleton';

interface PortfolioListProps {
  onEditPortfolio: (portfolio: IPortfolio) => void;
  onNewPortfolio: () => void;
}

const getPortfolioInitials = (portfolio: IPortfolio): string => {
  const source =
    portfolio.basics?.name?.trim() ||
    portfolio.title?.trim() ||
    'Portfolio';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
};

const formatPortfolioCountSubtitle = (count: number, loading: boolean): string => {
  if (loading) {
    return 'Build, publish, and showcase your work with custom vanity URLs.';
  }
  if (count === 0) {
    return '0 portfolios · Build, publish, and showcase your work with custom vanity URLs';
  }
  if (count === 1) {
    return '1 portfolio · Build, publish, and showcase your work with custom vanity URLs';
  }
  return `${count} portfolios · Build, publish, and showcase your work with custom vanity URLs`;
};

const formatUpdatedDate = (updatedAt?: string, createdAt?: string): string | null => {
  const raw = updatedAt || createdAt;
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const PortfolioList: React.FC<PortfolioListProps> = ({
  onEditPortfolio,
  onNewPortfolio
}) => {
  const [portfolios, setPortfolios] = useState<IPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedingFromProfile, setSeedingFromProfile] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSeedFromCareerProfile = async () => {
    setSeedingFromProfile(true);
    try {
      const created = await careerProfileService.seedPortfolio();
      toast.success('Portfolio seeded from Career Profile');
      onEditPortfolio(created);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Save your Career Profile first before seeding a portfolio';
      toast.error(message);
    } finally {
      setSeedingFromProfile(false);
    }
  };

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      const data = await portfolioService.getPortfolios();
      setPortfolios(data || []);
    } catch (err: any) {
      toast.error('Failed to load portfolios');
      setPortfolios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete portfolio "${title}"?`)) {
      return;
    }

    try {
      await portfolioService.deletePortfolio(id);
      toast.success('Portfolio deleted');
      setPortfolios((prev) => prev.filter((p) => (p._id || p.id) !== id));
    } catch (err: any) {
      toast.error('Failed to delete portfolio');
    }
  };

  const handleCopyLink = (portfolio: IPortfolio) => {
    const url = `${window.location.origin}/p/${portfolio.slug}`;
    navigator.clipboard.writeText(url);
    const key = portfolio._id || portfolio.id || portfolio.slug;
    setCopiedId(key);
    toast.success('Public URL copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      {/* Consistent Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            My Web Portfolios
          </h1>
          <p
            data-testid="portfolios-count-subtitle"
            className="mt-1.5 text-sm text-neutral-600"
          >
            {formatPortfolioCountSubtitle(portfolios.length, loading)}
          </p>
        </div>

        {!loading && portfolios.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              data-testid="seed-portfolio-from-profile-btn"
              disabled={seedingFromProfile}
              onClick={() => void handleSeedFromCareerProfile()}
              className="inline-flex items-center justify-center h-10 px-4 border border-neutral-300 rounded-control shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 transition-colors focus-ring disabled:opacity-50"
            >
              <IdentificationIcon className="h-4 w-4 mr-2 text-primary-600" aria-hidden="true" />
              {seedingFromProfile ? 'Seeding…' : 'Seed from Career Profile'}
            </button>
            <button
              type="button"
              onClick={onNewPortfolio}
              className="inline-flex items-center justify-center h-10 px-4 border border-transparent rounded-control shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors focus-ring"
            >
              <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              Create Portfolio
            </button>
          </div>
        )}
      </div>

      {/* Loading Skeleton Grid */}
      {loading ? (
        <div
          role="status"
          aria-label="Loading portfolios"
          data-testid="portfolio-list-skeleton"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
        >
          <span className="sr-only">Loading your portfolios...</span>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="bg-white rounded-card border border-neutral-200/90 shadow-card overflow-hidden flex flex-col"
            >
              <div className="bg-neutral-100/80 border-b border-neutral-200/70 px-4 pt-4 pb-0">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-28" />
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
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
                  <Skeleton className="h-9 flex-1 rounded-control" />
                  <Skeleton className="h-9 w-20 rounded-control" />
                  <Skeleton className="h-9 w-9 rounded-control shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : portfolios.length === 0 ? (
        /* Empty State */
        <div
          data-testid="portfolio-empty-state"
          className="bg-white rounded-panel border border-dashed border-neutral-300 shadow-card px-6 py-14 sm:py-16 text-center"
        >
          <div className="max-w-md mx-auto">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="w-16 h-16 rounded-card bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100 flex items-center justify-center">
                <GlobeAltIcon className="h-8 w-8" aria-hidden="true" />
              </div>
              <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-600 text-white shadow-sm ring-2 ring-white">
                <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">
              No portfolios yet
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Create your first visual web portfolio to showcase project media galleries and share with recruiters.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={onNewPortfolio}
                className="inline-flex items-center justify-center h-10 px-5 border border-transparent rounded-control shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors focus-ring"
              >
                <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                Build My First Portfolio
              </button>
              <button
                type="button"
                data-testid="seed-portfolio-from-profile-btn"
                disabled={seedingFromProfile}
                onClick={() => void handleSeedFromCareerProfile()}
                className="inline-flex items-center justify-center h-10 px-4 border border-neutral-300 rounded-control shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 transition-colors focus-ring disabled:opacity-50"
              >
                <IdentificationIcon className="h-4 w-4 mr-2 text-primary-600" aria-hidden="true" />
                {seedingFromProfile ? 'Seeding…' : 'Seed from Career Profile'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Preview-Style Portfolio Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {portfolios.map((portfolio) => {
            const key = portfolio._id || portfolio.id || portfolio.slug;
            const initials = getPortfolioInitials(portfolio);
            const projectCount =
              portfolio.sections?.find((s) => s.type === 'projects')?.content?.length || 0;
            const sectionCount = portfolio.sections?.length || 0;
            const updatedLabel = formatUpdatedDate(portfolio.updatedAt, portfolio.createdAt);
            const ownerName =
              portfolio.basics?.name?.trim() &&
              portfolio.basics.name.trim() !== portfolio.title?.trim()
                ? portfolio.basics.name.trim()
                : 'Portfolio Showcase';
            const ownerRole =
              portfolio.basics?.title?.trim() || 'Web Portfolio';

            return (
              <article
                key={key}
                data-testid="portfolio-card"
                className="bg-white rounded-card border border-neutral-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col overflow-hidden"
              >
                {/* Visual Thumbnail / Preview Area */}
                <div
                  data-testid="portfolio-card-preview"
                  className="bg-gradient-to-br from-primary-50/80 via-neutral-50 to-accent-50/70 border-b border-neutral-200/80 px-4 pt-3.5 pb-0"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm ring-1 ring-inset ${
                        portfolio.isPublished
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/80'
                          : 'bg-white/95 text-neutral-600 ring-neutral-200/90'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`w-1.5 h-1.5 rounded-full ${
                          portfolio.isPublished ? 'bg-emerald-500' : 'bg-neutral-400'
                        }`}
                      />
                      <span>{portfolio.isPublished ? 'Published' : 'Draft'}</span>
                    </span>

                    <span className="text-xs text-neutral-500 font-mono truncate">
                      /p/{portfolio.slug}
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
                        {ownerName}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {ownerRole}
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
                      <button
                        type="button"
                        onClick={() => onEditPortfolio(portfolio)}
                        className="text-left hover:text-primary-600 transition-colors rounded focus-ring"
                      >
                        {portfolio.title}
                      </button>
                    </h3>
                    <p className="mt-1 text-xs text-neutral-600 line-clamp-2">
                      {portfolio.basics?.bio || 'No bio summary added yet.'}
                    </p>
                    <p className="mt-2.5 text-xs text-neutral-500">
                      {projectCount} {projectCount === 1 ? 'Project' : 'Projects'} · {sectionCount}{' '}
                      {sectionCount === 1 ? 'Section' : 'Sections'}
                      {updatedLabel ? ` · Updated ${updatedLabel}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => onEditPortfolio(portfolio)}
                      title="Edit Portfolio"
                      className="flex-1 h-9 px-3 inline-flex items-center justify-center gap-1.5 border border-transparent text-sm font-medium rounded-control text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-colors focus-ring"
                    >
                      <PencilSquareIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Edit</span>
                    </button>

                    {portfolio.isPublished && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(portfolio)}
                          title="Copy public link"
                          aria-label="Copy public link"
                          className="h-9 px-3 inline-flex items-center justify-center gap-1.5 border border-neutral-300 text-sm font-medium rounded-control text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus-ring"
                        >
                          {copiedId === key ? (
                            <>
                              <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <ClipboardDocumentIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <a
                          href={`/p/${portfolio.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="View public page"
                          aria-label="View public page"
                          className="h-9 w-9 shrink-0 inline-flex items-center justify-center border border-neutral-300 rounded-control text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus-ring"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                        </a>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(key, portfolio.title)}
                      title="Delete portfolio"
                      aria-label="Delete portfolio"
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
    </div>
  );
};
