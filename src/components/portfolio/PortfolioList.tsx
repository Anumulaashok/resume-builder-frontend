import React, { useEffect, useState } from 'react';
import {
  PlusIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { portfolioService } from '../../services/portfolio.service';
import { IPortfolio } from '../../types/portfolio';

interface PortfolioListProps {
  onEditPortfolio: (portfolio: IPortfolio) => void;
  onNewPortfolio: () => void;
}

export const PortfolioList: React.FC<PortfolioListProps> = ({
  onEditPortfolio,
  onNewPortfolio
}) => {
  const [portfolios, setPortfolios] = useState<IPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      const data = await portfolioService.getPortfolios();
      setPortfolios(data);
    } catch (err: any) {
      toast.error('Failed to load portfolios');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="flex items-center space-x-3 text-blue-600">
          <svg className="animate-spin h-7 w-7" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-gray-600 font-medium text-sm">Loading your portfolios...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">My Web Portfolios</h2>
          <p className="text-sm text-gray-500 mt-1">
            Build, publish, and showcase your work with custom vanity URLs.
          </p>
        </div>
        <button
          onClick={onNewPortfolio}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Portfolio
        </button>
      </div>

      {/* Portfolios Grid */}
      {portfolios.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <GlobeAltIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No portfolios yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Create your first visual web portfolio to showcase project media galleries and share with recruiters.
          </p>
          <button
            onClick={onNewPortfolio}
            className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow transition"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Build My First Portfolio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map((portfolio) => {
            const key = portfolio._id || portfolio.id || portfolio.slug;
            const projectCount =
              portfolio.sections?.find((s) => s.type === 'projects')?.content?.length || 0;

            return (
              <div
                key={key}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
              >
                <div className="p-6">
                  {/* Status & Slug */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 ${
                        portfolio.isPublished
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          portfolio.isPublished ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}
                      />
                      <span>{portfolio.isPublished ? 'Published' : 'Draft'}</span>
                    </span>

                    <span className="text-xs text-gray-400 font-mono">
                      /p/{portfolio.slug}
                    </span>
                  </div>

                  {/* Title & Basics */}
                  <h3 className="text-lg font-bold text-gray-900 mb-1 hover:text-blue-600 cursor-pointer transition"
                    onClick={() => onEditPortfolio(portfolio)}
                  >
                    {portfolio.title}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4">
                    {portfolio.basics?.bio || 'No bio summary added yet.'}
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <span>{projectCount} Project(s)</span>
                    <span>•</span>
                    <span>{portfolio.sections?.length || 0} Sections</span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onEditPortfolio(portfolio)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg transition"
                      title="Edit Portfolio"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                    {portfolio.isPublished && (
                      <>
                        <button
                          onClick={() => handleCopyLink(portfolio)}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg transition"
                          title="Copy public link"
                        >
                          {copiedId === key ? (
                            <CheckIcon className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <ClipboardDocumentIcon className="w-5 h-5" />
                          )}
                        </button>
                        <a
                          href={`/p/${portfolio.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg transition"
                          title="View public page"
                        >
                          <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                        </a>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(key, portfolio.title)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition"
                    title="Delete portfolio"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
