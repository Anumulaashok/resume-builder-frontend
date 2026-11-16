import React, { useEffect, useState } from 'react';
import {
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { portfolioService } from '../../services/portfolio.service';
import { IPortfolio, PortfolioProject, PortfolioSection } from '../../types/portfolio';

interface PortfolioPublicViewProps {
  slug?: string;
}

export const PortfolioPublicView: React.FC<PortfolioPublicViewProps> = ({ slug: propSlug }) => {
  const [portfolio, setPortfolio] = useState<IPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    // Derive slug from prop, path, or hash
    const getSlug = (): string => {
      if (propSlug) return propSlug;

      const pathname = window.location.pathname;
      const pathMatch = pathname.match(/^\/(?:p|portfolio)\/([a-zA-Z0-9_-]+)/);
      if (pathMatch && pathMatch[1]) return pathMatch[1];

      const hash = window.location.hash;
      const hashMatch = hash.match(/#\/(?:p|portfolio)\/([a-zA-Z0-9_-]+)/);
      if (hashMatch && hashMatch[1]) return hashMatch[1];

      const urlParams = new URLSearchParams(window.location.search);
      const querySlug = urlParams.get('slug');
      if (querySlug) return querySlug;

      return '';
    };

    const slug = getSlug();
    if (!slug) {
      setError('No portfolio slug specified.');
      setLoading(false);
      return;
    }

    const loadPortfolio = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await portfolioService.getPublicPortfolio(slug);
        setPortfolio(data);
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            err.message ||
            'This portfolio is currently private or does not exist.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
  }, [propSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="flex items-center space-x-3 text-blue-600">
          <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
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
          <span className="text-lg font-medium text-gray-700">Loading portfolio...</span>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <GlobeAltIcon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Portfolio Unavailable</h1>
        <p className="text-gray-600 max-w-md mb-6">{error || 'This portfolio is not available.'}</p>
        <a
          href="/"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
        >
          Return to Home
        </a>
      </div>
    );
  }

  const { basics, sections, sectionOrder, themeConfig } = portfolio;
  const primaryColor = themeConfig?.primaryColor || '#3B82F6';

  const orderedSections = (sectionOrder || [])
    .map((id) => sections.find((s) => s.id === id))
    .filter((s): s is PortfolioSection => Boolean(s && s.enabled !== false));

  const resolveImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const backendBase = process.env.REACT_APP_API_URL || 'http://localhost:10000';
    return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans selection:bg-blue-500 selection:text-white pb-20">
      {/* Top Banner */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            <span className="font-bold text-lg text-gray-900 tracking-tight">
              {basics.name || portfolio.title}
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm font-medium">
            {basics.email && (
              <a
                href={`mailto:${basics.email}`}
                className="text-gray-600 hover:text-gray-900 flex items-center space-x-1.5 transition"
              >
                <EnvelopeIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Contact</span>
              </a>
            )}
            {basics.socialLinks?.github && (
              <a
                href={basics.socialLinks.github}
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 hover:text-gray-900 transition"
              >
                GitHub
              </a>
            )}
            {basics.socialLinks?.linkedin && (
              <a
                href={basics.socialLinks.linkedin}
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 hover:text-gray-900 transition"
              >
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 border-b border-gray-200 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {basics.avatarUrl && (
            <div className="mb-6 flex justify-center">
              <img
                src={resolveImageUrl(basics.avatarUrl)}
                alt={basics.name}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover shadow-xl ring-4 ring-white"
              />
            </div>
          )}
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
            {basics.name}
          </h1>
          {basics.title && (
            <p
              className="text-lg sm:text-2xl font-medium mb-4"
              style={{ color: primaryColor }}
            >
              {basics.title}
            </p>
          )}
          {basics.bio && (
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed mb-6">
              {basics.bio}
            </p>
          )}

          {/* Location & Contact Meta */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
            {basics.location && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="w-4 h-4 text-gray-400" />
                {basics.location}
              </span>
            )}
            {basics.email && (
              <a
                href={`mailto:${basics.email}`}
                className="flex items-center gap-1 hover:text-blue-600 transition"
              >
                <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                {basics.email}
              </a>
            )}
            {basics.phone && (
              <span className="flex items-center gap-1">
                <PhoneIcon className="w-4 h-4 text-gray-400" />
                {basics.phone}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Main Sections */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-16">
        {orderedSections.map((section) => {
          if (section.type === 'about') {
            return null; // Hero covers about
          }

          if (section.type === 'projects') {
            const projects = (section.content as PortfolioProject[]) || [];
            return (
              <section key={section.id} id="projects" className="scroll-mt-20">
                <div className="flex items-center space-x-3 mb-8">
                  <span
                    className="w-2.5 h-8 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {section.title}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {projects.map((project) => (
                    <article
                      key={project.id}
                      className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                    >
                      {/* Project Image Gallery Preview */}
                      {project.images && project.images.length > 0 ? (
                        <div className="relative bg-gray-100 aspect-video overflow-hidden">
                          <img
                            src={resolveImageUrl(project.images[0])}
                            alt={project.title}
                            onClick={() => setPreviewImage(resolveImageUrl(project.images[0]))}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                          />
                          {project.images.length > 1 && (
                            <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
                              +{project.images.length - 1} photos
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gradient-to-br from-gray-100 to-gray-200 aspect-video flex items-center justify-center text-gray-400">
                          <SparklesIcon className="w-10 h-10 opacity-40" />
                        </div>
                      )}

                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {project.title}
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed mb-4">
                            {project.description}
                          </p>

                          {/* Gallery Thumbnails if multiple */}
                          {project.images && project.images.length > 1 && (
                            <div className="flex gap-2 mb-4 overflow-x-auto py-1">
                              {project.images.map((imgUrl, idx) => (
                                <img
                                  key={idx}
                                  src={resolveImageUrl(imgUrl)}
                                  alt={`Thumbnail ${idx + 1}`}
                                  onClick={() => setPreviewImage(resolveImageUrl(imgUrl))}
                                  className="w-14 h-14 object-cover rounded-lg border border-gray-200 hover:border-blue-500 cursor-pointer transition flex-shrink-0"
                                />
                              ))}
                            </div>
                          )}

                          {/* Tags */}
                          {project.tags && project.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-6">
                              {project.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-700 font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action Links */}
                        <div className="flex items-center space-x-4 pt-4 border-t border-gray-100">
                          {project.demoUrl && (
                            <a
                              href={project.demoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
                            >
                              Live Demo
                              <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
                            </a>
                          )}
                          {project.githubUrl && (
                            <a
                              href={project.githubUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-sm font-semibold text-gray-700 hover:text-gray-900 transition"
                            >
                              Source Code
                              <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          }

          if (section.type === 'skills') {
            const skills = section.content || [];
            return (
              <section key={section.id} id="skills" className="scroll-mt-20">
                <div className="flex items-center space-x-3 mb-6">
                  <span
                    className="w-2.5 h-8 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {section.title}
                  </h2>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-wrap gap-3">
                    {skills.map((skill: any, idx: number) => {
                      const skillName = typeof skill === 'string' ? skill : skill.name;
                      return (
                        <div
                          key={skill.id || idx}
                          className="px-4 py-2 rounded-xl bg-slate-50 border border-gray-200 text-sm font-medium text-gray-800 shadow-sm flex items-center space-x-2"
                        >
                          <span>{skillName}</span>
                          {skill.category && (
                            <span className="text-xs text-gray-400">({skill.category})</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          }

          if (section.type === 'experience') {
            const experienceItems = section.content || [];
            return (
              <section key={section.id} id="experience" className="scroll-mt-20">
                <div className="flex items-center space-x-3 mb-6">
                  <span
                    className="w-2.5 h-8 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-4">
                  {experienceItems.map((item: any, idx: number) => (
                    <div
                      key={item.id || idx}
                      className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {item.position || item.title}
                        </h3>
                        {item.period && (
                          <span className="text-xs sm:text-sm font-medium text-gray-500">
                            {item.period}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-blue-600 mb-2">
                        {item.company}
                      </p>
                      {item.description && (
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (section.type === 'contact') {
            return (
              <section key={section.id} id="contact" className="scroll-mt-20">
                <div className="flex items-center space-x-3 mb-6">
                  <span
                    className="w-2.5 h-8 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {section.title}
                  </h2>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Let's Connect
                  </h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                    Feel free to reach out for collaboration opportunities, project inquiries, or simply to say hi.
                  </p>
                  {basics.email && (
                    <a
                      href={`mailto:${basics.email}`}
                      className="inline-flex items-center px-6 py-3 rounded-xl text-white font-medium shadow-md hover:opacity-95 transition"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <EnvelopeIcon className="w-5 h-5 mr-2" />
                      Send an Email
                    </a>
                  )}
                </div>
              </section>
            );
          }

          return null;
        })}
      </main>

      {/* Lightbox Modal for Gallery Images */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 rounded-full bg-white/10"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Full view"
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
};
