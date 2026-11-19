import React, { useEffect, useState } from 'react';
import {
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  SparklesIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { portfolioService } from '../../services/portfolio.service';
import { IPortfolio, PortfolioProject, PortfolioSection } from '../../types/portfolio';
import { Container } from '../ui/container';
import { Skeleton } from '../ui/skeleton';

interface PortfolioPublicViewProps {
  slug?: string;
}

const getInitials = (name?: string, fallback?: string): string => {
  const source = name?.trim() || fallback?.trim() || 'P';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
};

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

  // Close image preview lightbox on Escape
  useEffect(() => {
    if (!previewImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewImage(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [previewImage]);

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading portfolio"
        data-testid="portfolio-public-skeleton"
        className="min-h-screen bg-neutral-50"
      >
        <span className="sr-only">Loading portfolio...</span>
        <div className="bg-white border-b border-neutral-200/80 shadow-header">
          <Container>
            <div className="h-16 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-control" />
                <Skeleton className="h-5 w-36" />
              </div>
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-20 rounded-control hidden sm:block" />
                <Skeleton className="h-8 w-24 rounded-control" />
              </div>
            </div>
          </Container>
        </div>

        <div className="bg-white border-b border-neutral-200/80 py-14 sm:py-20">
          <Container className="text-center">
            <Skeleton className="h-24 w-24 rounded-full mx-auto mb-6" />
            <Skeleton className="h-10 w-64 max-w-full mx-auto mb-3" />
            <Skeleton className="h-6 w-48 max-w-full mx-auto mb-5" />
            <Skeleton className="h-4 w-full max-w-xl mx-auto mb-2" />
            <Skeleton className="h-4 w-4/5 max-w-md mx-auto mb-7" />
            <div className="flex flex-wrap justify-center gap-2.5">
              <Skeleton className="h-9 w-36 rounded-full" />
              <Skeleton className="h-9 w-40 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          </Container>
        </div>

        <Container className="py-12 sm:py-16">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {[0, 1].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-card border border-neutral-200/90 shadow-card overflow-hidden"
              >
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="p-6 space-y-3">
                  <Skeleton className="h-6 w-3/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 sm:p-6">
        <div
          data-testid="portfolio-unavailable-card"
          className="bg-white rounded-panel border border-neutral-200/90 shadow-card p-8 sm:p-10 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-50 text-red-600 ring-1 ring-inset ring-red-100 rounded-card flex items-center justify-center mx-auto mb-5">
            <GlobeAltIcon className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">
            Portfolio Unavailable
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 mb-6 leading-relaxed">
            {error || 'This portfolio is not available.'}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center h-10 px-5 border border-transparent text-sm font-medium rounded-control shadow-sm text-white bg-primary-600 hover:bg-primary-700 transition-colors focus-ring"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  const { basics, sections, sectionOrder, themeConfig } = portfolio;
  const primaryColor = themeConfig?.primaryColor || '#2563EB';
  const initials = getInitials(basics.name, portfolio.title);

  const orderedSections = (sectionOrder || [])
    .map((id) => sections.find((s) => s.id === id))
    .filter((s): s is PortfolioSection => Boolean(s && s.enabled !== false));

  const navSections = orderedSections.filter((s) => s.type !== 'about');

  const resolveImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const backendBase = process.env.REACT_APP_API_URL || 'http://localhost:10000';
    return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-primary-600 selection:text-white pb-20">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-header">
        <Container>
          <div className="h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-white text-xs font-bold shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {initials}
              </span>
              <span className="font-bold text-base sm:text-lg text-neutral-900 tracking-tight truncate">
                {basics.name || portfolio.title}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 text-sm font-medium shrink-0">
              {/* Section jump links on desktop */}
              {navSections.length > 0 && (
                <nav
                  aria-label="Portfolio sections"
                  className="hidden md:flex items-center gap-1 mr-2"
                >
                  {navSections.map((sec) => (
                    <a
                      key={sec.id}
                      href={`#${sec.type}`}
                      className="h-9 px-3 inline-flex items-center rounded-control text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors focus-ring"
                    >
                      {sec.title}
                    </a>
                  ))}
                </nav>
              )}

              {basics.socialLinks?.github && (
                <a
                  href={basics.socialLinks.github}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex h-9 px-3 items-center rounded-control text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors focus-ring"
                >
                  GitHub
                </a>
              )}
              {basics.socialLinks?.linkedin && (
                <a
                  href={basics.socialLinks.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex h-9 px-3 items-center rounded-control text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors focus-ring"
                >
                  LinkedIn
                </a>
              )}
              {basics.email && (
                <a
                  href={`mailto:${basics.email}`}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-control text-xs sm:text-sm font-medium text-white shadow-sm hover:opacity-95 transition-opacity focus-ring"
                  style={{ backgroundColor: primaryColor }}
                >
                  <EnvelopeIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Contact</span>
                </a>
              )}
            </div>
          </div>
        </Container>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50/60 via-white to-neutral-50 border-b border-neutral-200/80 py-12 sm:py-20 lg:py-24">
        <Container>
          <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
            {basics.avatarUrl ? (
              <div className="mb-5 sm:mb-6 flex justify-center">
                <img
                  src={resolveImageUrl(basics.avatarUrl)}
                  alt={basics.name}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover shadow-card ring-4 ring-white"
                />
              </div>
            ) : (
              <div className="mb-5 sm:mb-6 flex justify-center" aria-hidden="true">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-card flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-card ring-4 ring-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {initials}
                </div>
              </div>
            )}

            <h1 className="w-full block text-3xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight break-words">
              {basics.name}
            </h1>

            {basics.title && (
              <p
                data-testid="portfolio-hero-headline"
                className="mt-2.5 sm:mt-3 w-full block text-base sm:text-2xl font-semibold text-primary-600 leading-snug break-words"
                style={{ color: primaryColor }}
              >
                {basics.title}
              </p>
            )}

            {basics.bio && (
              <p className="mt-4 text-sm sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed break-words">
                {basics.bio}
              </p>
            )}

            {/* Mobile-Friendly Contact & Social Pills */}
            <div
              data-testid="portfolio-hero-contacts"
              className="mt-6 sm:mt-7 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 text-xs sm:text-sm max-w-full"
            >
              {basics.location && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-neutral-200/90 shadow-sm text-neutral-700 font-medium max-w-full">
                  <MapPinIcon className="w-4 h-4 text-neutral-400 shrink-0" aria-hidden="true" />
                  <span className="truncate">{basics.location}</span>
                </span>
              )}
              {basics.email && (
                <a
                  href={`mailto:${basics.email}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-neutral-200/90 shadow-sm text-neutral-700 hover:border-primary-300 hover:text-primary-700 font-medium transition-colors focus-ring max-w-full"
                >
                  <EnvelopeIcon className="w-4 h-4 text-neutral-400 shrink-0" aria-hidden="true" />
                  <span className="truncate">{basics.email}</span>
                </a>
              )}
              {basics.phone && (
                <a
                  href={`tel:${basics.phone}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-neutral-200/90 shadow-sm text-neutral-700 hover:border-primary-300 hover:text-primary-700 font-medium transition-colors focus-ring max-w-full"
                >
                  <PhoneIcon className="w-4 h-4 text-neutral-400 shrink-0" aria-hidden="true" />
                  <span className="truncate">{basics.phone}</span>
                </a>
              )}
              {basics.socialLinks?.website && (
                <a
                  href={basics.socialLinks.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-neutral-200/90 shadow-sm text-neutral-700 hover:border-primary-300 hover:text-primary-700 font-medium transition-colors focus-ring"
                >
                  <LinkIcon className="w-4 h-4 text-neutral-400 shrink-0" aria-hidden="true" />
                  <span>Website</span>
                </a>
              )}
              {basics.socialLinks?.github && (
                <a
                  href={basics.socialLinks.github}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-neutral-200/90 shadow-sm text-neutral-700 hover:border-primary-300 hover:text-primary-700 font-medium transition-colors focus-ring"
                >
                  <span>GitHub</span>
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />
                </a>
              )}
              {basics.socialLinks?.linkedin && (
                <a
                  href={basics.socialLinks.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-neutral-200/90 shadow-sm text-neutral-700 hover:border-primary-300 hover:text-primary-700 font-medium transition-colors focus-ring"
                >
                  <span>LinkedIn</span>
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />
                </a>
              )}
              {basics.socialLinks?.twitter && (
                <a
                  href={basics.socialLinks.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-neutral-200/90 shadow-sm text-neutral-700 hover:border-primary-300 hover:text-primary-700 font-medium transition-colors focus-ring"
                >
                  <span>Twitter</span>
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* Main Sections */}
      <Container as="main" className="py-12 sm:py-16 space-y-14 sm:space-y-20">
        {orderedSections.map((section) => {
          if (section.type === 'about') {
            return null; // Hero covers about
          }

          if (section.type === 'projects') {
            const projects = (section.content as PortfolioProject[]) || [];
            return (
              <section key={section.id} id="projects" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-7 rounded-full shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                    {section.title}
                  </h2>
                </div>

                {projects.length === 0 ? (
                  <div className="bg-white rounded-panel border border-dashed border-neutral-300 shadow-card p-8 text-center text-sm text-neutral-500">
                    No projects published in this section yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    {projects.map((project) => (
                      <article
                        key={project.id}
                        data-testid="public-project-card"
                        className="group bg-white rounded-card border border-neutral-200/90 overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col"
                      >
                        {/* Project Image Gallery Preview */}
                        {project.images && project.images.length > 0 ? (
                          <div className="relative bg-neutral-100 aspect-video overflow-hidden border-b border-neutral-200/70">
                            <button
                              type="button"
                              onClick={() => setPreviewImage(resolveImageUrl(project.images[0]))}
                              aria-label={`Preview ${project.title} image`}
                              className="w-full h-full block focus-ring"
                            >
                              <img
                                src={resolveImageUrl(project.images[0])}
                                alt={project.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </button>
                            {project.images.length > 1 && (
                              <div className="absolute bottom-2.5 right-2.5 bg-neutral-900/75 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-control font-medium pointer-events-none">
                                +{project.images.length - 1} photos
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-gradient-to-br from-primary-50/80 via-neutral-50 to-accent-50/70 border-b border-neutral-200/70 aspect-video flex items-center justify-center text-primary-400">
                            <SparklesIcon className="w-10 h-10 opacity-50" aria-hidden="true" />
                          </div>
                        )}

                        <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-5">
                          <div>
                            <h3 className="text-lg sm:text-xl font-semibold text-neutral-900">
                              {project.title}
                            </h3>
                            <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                              {project.description}
                            </p>

                            {/* Gallery Thumbnails if multiple */}
                            {project.images && project.images.length > 1 && (
                              <div className="flex gap-2 mt-4 overflow-x-auto py-1">
                                {project.images.map((imgUrl, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setPreviewImage(resolveImageUrl(imgUrl))}
                                    aria-label={`View ${project.title} thumbnail ${idx + 1}`}
                                    className="w-14 h-14 rounded-control overflow-hidden border border-neutral-200 hover:border-primary-500 transition-colors shrink-0 focus-ring"
                                  >
                                    <img
                                      src={resolveImageUrl(imgUrl)}
                                      alt={`Thumbnail ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Tags */}
                            {project.tags && project.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-4">
                                {project.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2.5 py-1 text-xs rounded-full bg-primary-50/80 text-primary-700 ring-1 ring-inset ring-primary-200/70 font-medium"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action Links */}
                          {(project.demoUrl || project.githubUrl) && (
                            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-neutral-100">
                              {project.demoUrl && (
                                <a
                                  href={project.demoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-control text-xs sm:text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-colors focus-ring"
                                >
                                  <span>Live Demo</span>
                                  <ArrowTopRightOnSquareIcon className="w-4 h-4" aria-hidden="true" />
                                </a>
                              )}
                              {project.githubUrl && (
                                <a
                                  href={project.githubUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-control text-xs sm:text-sm font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus-ring"
                                >
                                  <span>Source Code</span>
                                  <ArrowTopRightOnSquareIcon className="w-4 h-4" aria-hidden="true" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            );
          }

          if (section.type === 'skills') {
            const skills = section.content || [];
            return (
              <section key={section.id} id="skills" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-6">
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-7 rounded-full shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                    {section.title}
                  </h2>
                </div>

                <div className="bg-white rounded-card border border-neutral-200/90 p-5 sm:p-8 shadow-card">
                  {skills.length === 0 ? (
                    <p className="text-sm text-neutral-500">No skills listed yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2.5 sm:gap-3">
                      {skills.map((skill: any, idx: number) => {
                        const skillName = typeof skill === 'string' ? skill : skill.name;
                        return (
                          <div
                            key={skill.id || idx}
                            className="px-3.5 py-2 rounded-control bg-neutral-50 border border-neutral-200/90 text-sm font-medium text-neutral-800 shadow-sm inline-flex items-center gap-2"
                          >
                            <span>{skillName}</span>
                            {skill.category && (
                              <span className="text-xs text-neutral-500">({skill.category})</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );
          }

          if (section.type === 'experience') {
            const experienceItems = section.content || [];
            return (
              <section key={section.id} id="experience" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-6">
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-7 rounded-full shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-4">
                  {experienceItems.map((item: any, idx: number) => (
                    <div
                      key={item.id || idx}
                      className="bg-white rounded-card border border-neutral-200/90 p-5 sm:p-6 shadow-card"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1.5">
                        <h3 className="text-base sm:text-lg font-semibold text-neutral-900">
                          {item.position || item.title}
                        </h3>
                        {item.period && (
                          <span className="inline-flex self-start sm:self-auto px-2.5 py-0.5 rounded-full bg-neutral-100 text-xs font-medium text-neutral-600">
                            {item.period}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-primary-600 mb-2">
                        {item.company}
                      </p>
                      {item.description && (
                        <p className="text-sm text-neutral-600 leading-relaxed">
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
              <section key={section.id} id="contact" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-6">
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-7 rounded-full shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                    {section.title}
                  </h2>
                </div>

                <div className="bg-white rounded-panel border border-neutral-200/90 p-6 sm:p-10 shadow-card text-center">
                  <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">
                    Let&apos;s Connect
                  </h3>
                  <p className="text-sm sm:text-base text-neutral-600 max-w-md mx-auto mb-6 leading-relaxed">
                    Feel free to reach out for collaboration opportunities, project inquiries, or simply to say hi.
                  </p>
                  <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
                    {basics.email && (
                      <a
                        href={`mailto:${basics.email}`}
                        className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 rounded-control text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity focus-ring"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <EnvelopeIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                        Send an Email
                      </a>
                    )}
                    {basics.socialLinks?.linkedin && (
                      <a
                        href={basics.socialLinks.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-5 rounded-control border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 text-sm font-medium transition-colors focus-ring"
                      >
                        Connect on LinkedIn
                      </a>
                    )}
                    {basics.socialLinks?.github && (
                      <a
                        href={basics.socialLinks.github}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-5 rounded-control border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 text-sm font-medium transition-colors focus-ring"
                      >
                        View GitHub
                      </a>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          return null;
        })}
      </Container>

      {/* Accessible Lightbox Modal for Gallery Images */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Project image preview"
          className="fixed inset-0 z-50 bg-neutral-900/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            aria-label="Close image preview"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white hover:text-neutral-200 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors focus-ring"
          >
            <XMarkIcon className="w-6 h-6" aria-hidden="true" />
          </button>
          <img
            src={previewImage}
            alt="Full view"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[90vh] rounded-card shadow-modal object-contain"
          />
        </div>
      )}
    </div>
  );
};
