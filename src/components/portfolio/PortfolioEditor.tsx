import React, { useState } from 'react';
import {
  ArrowLeftIcon,
  CloudArrowUpIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
  Bars3Icon,
  PhotoIcon,
  ArrowDownTrayIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  IPortfolio,
  PortfolioProject,
  PortfolioSection,
  defaultPortfolio
} from '../../types/portfolio';
import { portfolioService } from '../../services/portfolio.service';
import { InlineEdit } from '../ui/InlineEdit';
import { ImportProjectsModal } from './ImportProjectsModal';

interface PortfolioEditorProps {
  initialPortfolio?: IPortfolio;
  onSave?: (portfolio: IPortfolio) => void;
  onBack: () => void;
}

const INPUT_CLASS =
  'w-full h-10 px-3 py-2 text-sm bg-white border border-neutral-300 rounded-control text-neutral-900 placeholder-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

const TEXTAREA_CLASS =
  'w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-control text-neutral-900 placeholder-neutral-400 leading-relaxed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

const LABEL_CLASS = 'block text-xs font-medium text-neutral-700 mb-1.5';

// Sortable item wrapper for workspace section ordering
interface SortableSectionProps {
  id: string;
  title: string;
  type: string;
  children: React.ReactNode;
}

const SortableSectionItem: React.FC<SortableSectionProps> = ({ id, title, type, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-card border border-neutral-200/90 shadow-card hover:shadow-card-hover overflow-hidden mb-4 transition-shadow ${
        isDragging ? 'ring-2 ring-primary-500 shadow-card-hover' : ''
      }`}
    >
      <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-50/80 border-b border-neutral-200/80">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-control transition-colors focus-ring"
            title="Drag to reorder section"
            aria-label={`Drag to reorder ${title}`}
          >
            <Bars3Icon className="w-5 h-5" aria-hidden="true" />
          </button>
          <span className="font-semibold text-sm text-neutral-900">{title}</span>
          <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200/80">
            {type}
          </span>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
};

export const PortfolioEditor: React.FC<PortfolioEditorProps> = ({
  initialPortfolio,
  onSave,
  onBack
}) => {
  const [portfolio, setPortfolio] = useState<IPortfolio>(
    initialPortfolio || { ...defaultPortfolio, slug: `portfolio-${Date.now().toString().slice(-4)}` }
  );
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [scale, setScale] = useState(1);
  const [mobilePane, setMobilePane] = useState<'editor' | 'preview'>('editor');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPortfolio((prev) => {
        const oldIndex = prev.sectionOrder.indexOf(active.id as string);
        const newIndex = prev.sectionOrder.indexOf(over.id as string);
        return {
          ...prev,
          sectionOrder: arrayMove(prev.sectionOrder, oldIndex, newIndex)
        };
      });
      toast.success('Section order updated');
    }
  };

  const handleBasicsChange = (field: string, value: any) => {
    setPortfolio((prev) => ({
      ...prev,
      basics: {
        ...prev.basics,
        [field]: value
      }
    }));
  };

  const handleSocialLinkChange = (network: string, value: string) => {
    setPortfolio((prev) => ({
      ...prev,
      basics: {
        ...prev.basics,
        socialLinks: {
          ...prev.basics.socialLinks,
          [network]: value
        }
      }
    }));
  };

  const handleProjectUpdate = (projectId: string, field: string, value: any) => {
    setPortfolio((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.type === 'projects') {
          return {
            ...section,
            content: (section.content as PortfolioProject[]).map((p) =>
              p.id === projectId ? { ...p, [field]: value } : p
            )
          };
        }
        return section;
      })
    }));
  };

  const handleAddProject = () => {
    const newProject: PortfolioProject = {
      id: `proj-${Date.now()}`,
      title: 'New Showcase Project',
      description: 'Describe what you designed or built, challenges solved, and key impact.',
      tags: ['TypeScript', 'Full-Stack'],
      demoUrl: '',
      githubUrl: '',
      images: []
    };

    setPortfolio((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.type === 'projects') {
          return {
            ...section,
            content: [...(section.content as PortfolioProject[]), newProject]
          };
        }
        return section;
      })
    }));
    toast.success('Added new project card');
  };

  const handleDeleteProject = (projectId: string) => {
    setPortfolio((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.type === 'projects') {
          return {
            ...section,
            content: (section.content as PortfolioProject[]).filter((p) => p.id !== projectId)
          };
        }
        return section;
      })
    }));
    toast.success('Removed project');
  };

  // Media file upload handler
  const handleFileUpload = async (projectId: string, file: File) => {
    // Validate image type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Unsupported file type. Only JPEG, PNG, and WebP are allowed.');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the 5MB limit.');
      return;
    }

    setUploadingImage(projectId);
    try {
      const result = await portfolioService.uploadMedia(file);
      handleProjectUpdate(projectId, 'images', [
        ...(getProject(projectId)?.images || []),
        result.url
      ]);
      toast.success('Image uploaded to project gallery!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Image upload failed');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleRemoveImage = (projectId: string, imgIdx: number) => {
    const proj = getProject(projectId);
    if (!proj) return;
    const nextImages = [...proj.images];
    nextImages.splice(imgIdx, 1);
    handleProjectUpdate(projectId, 'images', nextImages);
  };

  const getProject = (id: string): PortfolioProject | undefined => {
    const sec = portfolio.sections.find((s) => s.type === 'projects');
    return sec ? (sec.content as PortfolioProject[]).find((p) => p.id === id) : undefined;
  };

  const handleImportResumeProjects = (importedProjects: PortfolioProject[]) => {
    setPortfolio((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.type === 'projects') {
          return {
            ...section,
            content: [...(section.content as PortfolioProject[]), ...importedProjects]
          };
        }
        return section;
      })
    }));
  };

  const handleSavePortfolio = async () => {
    if (!portfolio.title.trim()) {
      toast.error('Portfolio title is required');
      return;
    }
    if (!portfolio.slug.trim()) {
      toast.error('Vanity URL slug is required');
      return;
    }

    setSaving(true);
    try {
      let saved: IPortfolio;
      const portfolioId = portfolio._id || portfolio.id;
      if (portfolioId) {
        saved = await portfolioService.updatePortfolio(portfolioId, portfolio);
      } else {
        saved = await portfolioService.createPortfolio(portfolio);
      }
      const nextPortfolio = saved || portfolio;
      setPortfolio(nextPortfolio);
      toast.success('Portfolio saved successfully!');
      onSave?.(nextPortfolio);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save portfolio');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    const nextPublished = !portfolio.isPublished;
    const portfolioId = portfolio._id || portfolio.id;
    if (portfolioId) {
      try {
        const updated = await portfolioService.updatePortfolio(portfolioId, {
          ...portfolio,
          isPublished: nextPublished
        });
        setPortfolio(updated || { ...portfolio, isPublished: nextPublished });
        toast.success(
          nextPublished
            ? 'Portfolio published to vanity URL!'
            : 'Portfolio unpublished (now private).'
        );
      } catch (err: any) {
        toast.error('Failed to update publish status');
      }
    } else {
      setPortfolio((prev) => ({ ...prev, isPublished: nextPublished }));
      toast.success(
        nextPublished
          ? 'Will publish upon saving!'
          : 'Will remain private upon saving.'
      );
    }
  };

  const copyPublicLink = () => {
    const fullUrl = `${window.location.origin}/p/${portfolio.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    toast.success('Public URL copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const resolveImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const backendBase = process.env.REACT_APP_API_URL || 'http://localhost:10000';
    return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const orderedSections = (portfolio.sectionOrder || [])
    .map((id) => portfolio.sections.find((s) => s.id === id))
    .filter((s): s is PortfolioSection => Boolean(s));

  return (
    <div className="flex flex-col h-screen bg-neutral-50 text-neutral-900 overflow-hidden">
      {/* Consistent Top Bar */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-neutral-200/80 shadow-header px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 h-9 px-2.5 text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-control transition-colors focus-ring shrink-0"
            title="Back to portfolios list"
            aria-label="Back to portfolios list"
          >
            <ArrowLeftIcon className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="h-6 w-px bg-neutral-200 shrink-0" aria-hidden="true" />

          <div className="min-w-0 flex-1 max-w-md">
            <input
              type="text"
              aria-label="Portfolio Title"
              value={portfolio.title}
              onChange={(e) => setPortfolio((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Portfolio Title"
              className="w-full text-base sm:text-lg font-semibold text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-primary-500 focus:outline-none px-1 py-0.5 rounded-t transition-colors"
            />
            <div className="flex items-center text-xs text-neutral-500 mt-0.5 px-1 gap-1">
              <span className="shrink-0">Vanity URL:</span>
              <span className="font-mono text-neutral-700 shrink-0">/p/</span>
              <input
                type="text"
                aria-label="Vanity URL slug"
                value={portfolio.slug}
                onChange={(e) =>
                  setPortfolio((prev) => ({
                    ...prev,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '-')
                      .replace(/-+/g, '-')
                  }))
                }
                placeholder="my-portfolio-slug"
                className="min-w-0 flex-1 font-mono text-primary-600 bg-transparent border-b border-dashed border-neutral-300 focus:border-primary-500 focus:outline-none px-1 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Publish & Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Status Badge */}
          <span
            className={`px-2.5 py-1 text-xs font-medium rounded-full inline-flex items-center gap-1.5 ring-1 ring-inset ${
              portfolio.isPublished
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/80'
                : 'bg-amber-50 text-amber-800 ring-amber-200/80'
            }`}
          >
            <span
              aria-hidden="true"
              className={`w-2 h-2 rounded-full ${
                portfolio.isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{portfolio.isPublished ? 'Live & Published' : 'Draft (Private)'}</span>
          </span>

          {/* Toggle Publish */}
          <button
            type="button"
            onClick={handleTogglePublish}
            className={`h-9 px-3 rounded-control text-xs sm:text-sm font-medium border transition-colors focus-ring ${
              portfolio.isPublished
                ? 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                : 'border-transparent bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
            }`}
          >
            {portfolio.isPublished ? 'Unpublish' : 'Publish to Web'}
          </button>

          {/* Copy Public Link */}
          {portfolio.isPublished && (
            <button
              type="button"
              onClick={copyPublicLink}
              className="h-9 px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 rounded-control inline-flex items-center gap-1.5 transition-colors focus-ring"
              title="Copy public URL"
              aria-label="Copy public URL"
            >
              {copiedLink ? (
                <>
                  <CheckIcon className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  <span className="hidden sm:inline text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Copy Link</span>
                </>
              )}
            </button>
          )}

          {/* View Public Live Page */}
          {portfolio.isPublished && (
            <a
              href={`/p/${portfolio.slug}`}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200/80 hover:bg-primary-100 rounded-control inline-flex items-center gap-1.5 transition-colors focus-ring"
            >
              <EyeIcon className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">View Public</span>
            </a>
          )}

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSavePortfolio}
            disabled={saving}
            className="h-9 px-4 text-xs sm:text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-control shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors focus-ring"
          >
            <CloudArrowUpIcon className="w-4 h-4" aria-hidden="true" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Pane Switcher (< lg) */}
      <div className="lg:hidden bg-white border-b border-neutral-200 px-4 py-2 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setMobilePane('editor')}
          aria-pressed={mobilePane === 'editor'}
          className={`flex-1 h-9 rounded-control text-xs font-medium transition-colors focus-ring ${
            mobilePane === 'editor'
              ? 'bg-primary-50 text-primary-700 font-semibold ring-1 ring-inset ring-primary-200/80'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Workspace Form
        </button>
        <button
          type="button"
          onClick={() => setMobilePane('preview')}
          aria-pressed={mobilePane === 'preview'}
          className={`flex-1 h-9 rounded-control text-xs font-medium transition-colors focus-ring ${
            mobilePane === 'preview'
              ? 'bg-primary-50 text-primary-700 font-semibold ring-1 ring-inset ring-primary-200/80'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Live Preview
        </button>
      </div>

      {/* Split-Screen Canvas Container */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel: Readable Editor Form Layout with Section Cards */}
        <div
          className={`${
            mobilePane === 'editor' ? 'flex' : 'hidden'
          } lg:flex flex-col w-full lg:w-1/2 flex-1 min-h-0 overflow-y-auto border-r border-neutral-200 bg-neutral-50 p-4 sm:p-6 space-y-6`}
        >
          {/* Workspace Instructions Banner */}
          <div className="bg-primary-50/70 border border-primary-200/80 rounded-card p-4 text-xs text-primary-900 flex items-start gap-3">
            <Bars3Icon className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-primary-900">Workspace &amp; Layout Controls</p>
              <p className="mt-0.5 text-primary-800 leading-relaxed">
                Drag section handles to reorder your portfolio blocks. Upload project images directly
                into gallery cards. Inline edits made on the live canvas sync automatically!
              </p>
            </div>
          </div>

          {/* Basics & Hero Profile Section Card */}
          <section className="bg-white rounded-card border border-neutral-200/90 shadow-card overflow-hidden">
            <div className="px-5 py-3.5 bg-neutral-50/80 border-b border-neutral-200/80 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-neutral-900">
                Basics &amp; Hero Profile
              </h3>
              <span className="text-[11px] font-medium text-neutral-500">
                Hero &amp; Contact Info
              </span>
            </div>

            <div className="p-5 space-y-5">
              {/* Identity Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="portfolio-basics-name" className={LABEL_CLASS}>
                    Your Full Name
                  </label>
                  <input
                    id="portfolio-basics-name"
                    type="text"
                    value={portfolio.basics.name}
                    onChange={(e) => handleBasicsChange('name', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="e.g. Alex Morgan"
                  />
                </div>

                <div>
                  <label htmlFor="portfolio-basics-title" className={LABEL_CLASS}>
                    Professional Title
                  </label>
                  <input
                    id="portfolio-basics-title"
                    type="text"
                    value={portfolio.basics.title || ''}
                    onChange={(e) => handleBasicsChange('title', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="e.g. Staff Full Stack Engineer"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="portfolio-basics-bio" className={LABEL_CLASS}>
                    Short Bio / Tagline
                  </label>
                  <textarea
                    id="portfolio-basics-bio"
                    rows={3}
                    value={portfolio.basics.bio || ''}
                    onChange={(e) => handleBasicsChange('bio', e.target.value)}
                    className={TEXTAREA_CLASS}
                    placeholder="Introduce yourself and highlight your passions..."
                  />
                </div>
              </div>

              {/* Contact & Social Links */}
              <div className="pt-4 border-t border-neutral-100">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                  Contact &amp; Social Profiles
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="portfolio-basics-email" className={LABEL_CLASS}>
                      Contact Email
                    </label>
                    <input
                      id="portfolio-basics-email"
                      type="email"
                      value={portfolio.basics.email || ''}
                      onChange={(e) => handleBasicsChange('email', e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="name@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="portfolio-basics-location" className={LABEL_CLASS}>
                      Location
                    </label>
                    <input
                      id="portfolio-basics-location"
                      type="text"
                      value={portfolio.basics.location || ''}
                      onChange={(e) => handleBasicsChange('location', e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="e.g. New York, NY"
                    />
                  </div>

                  <div>
                    <label htmlFor="portfolio-social-github" className={LABEL_CLASS}>
                      GitHub Profile
                    </label>
                    <input
                      id="portfolio-social-github"
                      type="url"
                      value={portfolio.basics.socialLinks?.github || ''}
                      onChange={(e) => handleSocialLinkChange('github', e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="https://github.com/username"
                    />
                  </div>

                  <div>
                    <label htmlFor="portfolio-social-linkedin" className={LABEL_CLASS}>
                      LinkedIn Profile
                    </label>
                    <input
                      id="portfolio-social-linkedin"
                      type="url"
                      value={portfolio.basics.socialLinks?.linkedin || ''}
                      onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Drag & Drop Sortable Sections */}
          <div>
            <div className="flex items-center justify-between mb-3 px-0.5">
              <h3 className="text-sm font-semibold text-neutral-900">
                Portfolio Sections Order
              </h3>
              <span className="text-xs text-neutral-500">Drag handles to reorder</span>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={portfolio.sectionOrder} strategy={verticalListSortingStrategy}>
                {portfolio.sectionOrder.map((sectionId) => {
                  const section = portfolio.sections.find((s) => s.id === sectionId);
                  if (!section) return null;

                  return (
                    <SortableSectionItem
                      key={section.id}
                      id={section.id}
                      title={section.title}
                      type={section.type}
                    >
                      {/* Projects Section */}
                      {section.type === 'projects' && (
                        <div className="space-y-5">
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-200/80">
                            <span className="text-xs text-neutral-600">
                              Showcase your top engineering &amp; design projects with media galleries
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowImportModal(true)}
                                className="h-9 px-3 text-xs font-medium text-accent-700 bg-accent-50 hover:bg-accent-100 rounded-control border border-accent-200 inline-flex items-center gap-1.5 transition-colors focus-ring"
                              >
                                <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" />
                                <span>Import from Resume</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleAddProject}
                                className="h-9 px-3 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-control border border-primary-200 inline-flex items-center gap-1.5 transition-colors focus-ring"
                              >
                                <PlusIcon className="w-4 h-4" aria-hidden="true" />
                                <span>Add Project</span>
                              </button>
                            </div>
                          </div>

                          {/* Projects List */}
                          {(section.content as PortfolioProject[]).map((proj, pIdx) => (
                            <div
                              key={proj.id}
                              className="p-4 sm:p-5 rounded-card border border-neutral-200 bg-neutral-50/60 space-y-4"
                            >
                              <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-200/70">
                                <span className="text-xs font-semibold text-neutral-700">
                                  Project Card #{pIdx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProject(proj.id)}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-control text-neutral-400 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                                  title="Delete Project Card"
                                  aria-label={`Delete project ${pIdx + 1}`}
                                >
                                  <TrashIcon className="w-4 h-4" aria-hidden="true" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label
                                    htmlFor={`proj-title-${proj.id}`}
                                    className={LABEL_CLASS}
                                  >
                                    Project Title
                                  </label>
                                  <input
                                    id={`proj-title-${proj.id}`}
                                    type="text"
                                    value={proj.title}
                                    onChange={(e) =>
                                      handleProjectUpdate(proj.id, 'title', e.target.value)
                                    }
                                    className={INPUT_CLASS}
                                  />
                                </div>

                                <div>
                                  <label
                                    htmlFor={`proj-tags-${proj.id}`}
                                    className={LABEL_CLASS}
                                  >
                                    Tags / Tech (comma-separated)
                                  </label>
                                  <input
                                    id={`proj-tags-${proj.id}`}
                                    type="text"
                                    value={proj.tags?.join(', ') || ''}
                                    onChange={(e) =>
                                      handleProjectUpdate(
                                        proj.id,
                                        'tags',
                                        e.target.value
                                          .split(',')
                                          .map((t) => t.trim())
                                          .filter(Boolean)
                                      )
                                    }
                                    placeholder="React, Node.js, AWS"
                                    className={INPUT_CLASS}
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label
                                    htmlFor={`proj-desc-${proj.id}`}
                                    className={LABEL_CLASS}
                                  >
                                    Project Description
                                  </label>
                                  <textarea
                                    id={`proj-desc-${proj.id}`}
                                    rows={3}
                                    value={proj.description}
                                    onChange={(e) =>
                                      handleProjectUpdate(proj.id, 'description', e.target.value)
                                    }
                                    className={TEXTAREA_CLASS}
                                  />
                                </div>

                                <div>
                                  <label
                                    htmlFor={`proj-demo-${proj.id}`}
                                    className={LABEL_CLASS}
                                  >
                                    Live Demo URL
                                  </label>
                                  <input
                                    id={`proj-demo-${proj.id}`}
                                    type="url"
                                    value={proj.demoUrl || ''}
                                    onChange={(e) =>
                                      handleProjectUpdate(proj.id, 'demoUrl', e.target.value)
                                    }
                                    placeholder="https://..."
                                    className={INPUT_CLASS}
                                  />
                                </div>

                                <div>
                                  <label
                                    htmlFor={`proj-github-${proj.id}`}
                                    className={LABEL_CLASS}
                                  >
                                    GitHub URL
                                  </label>
                                  <input
                                    id={`proj-github-${proj.id}`}
                                    type="url"
                                    value={proj.githubUrl || ''}
                                    onChange={(e) =>
                                      handleProjectUpdate(proj.id, 'githubUrl', e.target.value)
                                    }
                                    placeholder="https://github.com/..."
                                    className={INPUT_CLASS}
                                  />
                                </div>
                              </div>

                              {/* Media Asset Gallery & Native Upload */}
                              <div className="pt-3 border-t border-neutral-200/80">
                                <span className={LABEL_CLASS}>
                                  Project Showcase Media Gallery (JPEG, PNG, WebP &lt; 5MB)
                                </span>

                                <div className="flex flex-wrap gap-3 items-center mt-2">
                                  {proj.images?.map((imgUrl, idx) => (
                                    <div
                                      key={idx}
                                      className="relative group w-16 h-16 rounded-control overflow-hidden border border-neutral-200 bg-white shadow-sm"
                                    >
                                      <img
                                        src={resolveImageUrl(imgUrl)}
                                        alt={`Project thumbnail ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveImage(proj.id, idx)}
                                        className="absolute top-1 right-1 bg-neutral-900/75 hover:bg-red-600 text-white rounded p-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-red-500"
                                        title="Delete image"
                                        aria-label={`Delete image ${idx + 1}`}
                                      >
                                        <TrashIcon className="w-3 h-3" aria-hidden="true" />
                                      </button>
                                    </div>
                                  ))}

                                  <label
                                    className={`w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 hover:border-primary-500 rounded-control cursor-pointer bg-white transition-colors focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 ${
                                      uploadingImage === proj.id ? 'opacity-50 pointer-events-none' : ''
                                    }`}
                                  >
                                    <PhotoIcon className="w-5 h-5 text-neutral-400" aria-hidden="true" />
                                    <span className="text-[10px] text-neutral-600 font-medium mt-0.5">
                                      {uploadingImage === proj.id ? 'Uploading' : '+ Upload'}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      className="sr-only"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(proj.id, file);
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Skills Section */}
                      {section.type === 'skills' && (
                        <div className="space-y-4">
                          <p className="text-xs text-neutral-600">
                            Highlight your key skills and core technical competencies.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {section.content?.map((skill: any, sIdx: number) => {
                              const skillLabel = typeof skill === 'string' ? skill : skill.name;
                              return (
                                <span
                                  key={skill.id || sIdx}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 ring-1 ring-inset ring-neutral-200/80 text-xs font-medium"
                                >
                                  <span>{skillLabel}</span>
                                  <button
                                    type="button"
                                    aria-label={`Remove ${skillLabel}`}
                                    onClick={() => {
                                      const next = [...section.content];
                                      next.splice(sIdx, 1);
                                      setPortfolio((prev) => ({
                                        ...prev,
                                        sections: prev.sections.map((s) =>
                                          s.id === section.id ? { ...s, content: next } : s
                                        )
                                      }));
                                    }}
                                    className="text-neutral-400 hover:text-red-600 rounded-full p-0.5 transition-colors focus-ring"
                                  >
                                    <XMarkIcon className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>

                          {/* Add Skill Quick Input */}
                          <div className="flex items-center gap-2 pt-1">
                            <label htmlFor={`add-skill-${section.id}`} className="sr-only">
                              Add skill
                            </label>
                            <input
                              type="text"
                              id={`add-skill-${section.id}`}
                              placeholder="Add skill (e.g. Next.js, Docker)"
                              className={INPUT_CLASS}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const target = e.currentTarget;
                                  const val = target.value.trim();
                                  if (val) {
                                    setPortfolio((prev) => ({
                                      ...prev,
                                      sections: prev.sections.map((s) =>
                                        s.id === section.id
                                          ? {
                                              ...s,
                                              content: [
                                                ...s.content,
                                                { id: `s-${Date.now()}`, name: val, level: 80 }
                                              ]
                                            }
                                          : s
                                      )
                                    }));
                                    target.value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById(
                                  `add-skill-${section.id}`
                                ) as HTMLInputElement;
                                if (input && input.value.trim()) {
                                  const val = input.value.trim();
                                  setPortfolio((prev) => ({
                                    ...prev,
                                    sections: prev.sections.map((s) =>
                                      s.id === section.id
                                        ? {
                                            ...s,
                                            content: [
                                              ...s.content,
                                              { id: `s-${Date.now()}`, name: val, level: 80 }
                                            ]
                                          }
                                        : s
                                    )
                                  }));
                                  input.value = '';
                                }
                              }}
                              className="h-10 px-4 text-sm bg-white border border-neutral-300 hover:bg-neutral-50 rounded-control font-medium text-neutral-700 transition-colors focus-ring shrink-0"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Experience Section */}
                      {section.type === 'experience' && (
                        <div className="space-y-4">
                          <p className="text-xs text-neutral-600">
                            Summarize your relevant career highlights and roles.
                          </p>
                          {section.content?.map((exp: any, expIdx: number) => (
                            <div
                              key={exp.id || expIdx}
                              className="p-4 bg-neutral-50/70 rounded-card border border-neutral-200 space-y-3"
                            >
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-xs font-semibold text-neutral-800">
                                  {exp.position || 'Role'} at {exp.company || 'Company'}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Remove experience ${expIdx + 1}`}
                                  onClick={() => {
                                    const next = [...section.content];
                                    next.splice(expIdx, 1);
                                    setPortfolio((prev) => ({
                                      ...prev,
                                      sections: prev.sections.map((s) =>
                                        s.id === section.id ? { ...s, content: next } : s
                                      )
                                    }));
                                  }}
                                  className="h-7 w-7 inline-flex items-center justify-center rounded-control text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                  <TrashIcon className="w-4 h-4" aria-hidden="true" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label
                                    htmlFor={`exp-pos-${exp.id || expIdx}`}
                                    className={LABEL_CLASS}
                                  >
                                    Role / Position
                                  </label>
                                  <input
                                    id={`exp-pos-${exp.id || expIdx}`}
                                    type="text"
                                    value={exp.position || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPortfolio((prev) => ({
                                        ...prev,
                                        sections: prev.sections.map((s) =>
                                          s.id === section.id
                                            ? {
                                                ...s,
                                                content: s.content.map((item: any, idx: number) =>
                                                  idx === expIdx ? { ...item, position: val } : item
                                                )
                                              }
                                            : s
                                        )
                                      }));
                                    }}
                                    className={INPUT_CLASS}
                                  />
                                </div>
                                <div>
                                  <label
                                    htmlFor={`exp-comp-${exp.id || expIdx}`}
                                    className={LABEL_CLASS}
                                  >
                                    Company
                                  </label>
                                  <input
                                    id={`exp-comp-${exp.id || expIdx}`}
                                    type="text"
                                    value={exp.company || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPortfolio((prev) => ({
                                        ...prev,
                                        sections: prev.sections.map((s) =>
                                          s.id === section.id
                                            ? {
                                                ...s,
                                                content: s.content.map((item: any, idx: number) =>
                                                  idx === expIdx ? { ...item, company: val } : item
                                                )
                                              }
                                            : s
                                        )
                                      }));
                                    }}
                                    className={INPUT_CLASS}
                                  />
                                </div>
                                <div>
                                  <label
                                    htmlFor={`exp-period-${exp.id || expIdx}`}
                                    className={LABEL_CLASS}
                                  >
                                    Period
                                  </label>
                                  <input
                                    id={`exp-period-${exp.id || expIdx}`}
                                    type="text"
                                    value={exp.period || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPortfolio((prev) => ({
                                        ...prev,
                                        sections: prev.sections.map((s) =>
                                          s.id === section.id
                                            ? {
                                                ...s,
                                                content: s.content.map((item: any, idx: number) =>
                                                  idx === expIdx ? { ...item, period: val } : item
                                                )
                                              }
                                            : s
                                        )
                                      }));
                                    }}
                                    placeholder="2022 - Present"
                                    className={INPUT_CLASS}
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <label
                                    htmlFor={`exp-desc-${exp.id || expIdx}`}
                                    className={LABEL_CLASS}
                                  >
                                    Summary
                                  </label>
                                  <textarea
                                    id={`exp-desc-${exp.id || expIdx}`}
                                    rows={2}
                                    value={exp.description || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPortfolio((prev) => ({
                                        ...prev,
                                        sections: prev.sections.map((s) =>
                                          s.id === section.id
                                            ? {
                                                ...s,
                                                content: s.content.map((item: any, idx: number) =>
                                                  idx === expIdx
                                                    ? { ...item, description: val }
                                                    : item
                                                )
                                              }
                                            : s
                                        )
                                      }));
                                    }}
                                    className={TEXTAREA_CLASS}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newExp = {
                                id: `exp-${Date.now()}`,
                                position: 'Software Engineer',
                                company: 'Company Name',
                                period: '2022 - Present',
                                description: 'Designed, built, and shipped scalable web software.'
                              };
                              setPortfolio((prev) => ({
                                ...prev,
                                sections: prev.sections.map((s) =>
                                  s.id === section.id
                                    ? { ...s, content: [...s.content, newExp] }
                                    : s
                                )
                              }));
                            }}
                            className="h-9 px-3 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-control border border-primary-200 inline-flex items-center gap-1.5 transition-colors focus-ring"
                          >
                            <PlusIcon className="w-4 h-4" aria-hidden="true" />
                            <span>Add Experience Item</span>
                          </button>
                        </div>
                      )}

                      {section.type === 'about' && (
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          The About section is customized using the Basics &amp; Hero Profile card above.
                        </p>
                      )}

                      {section.type === 'contact' && (
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          Displays your email ({portfolio.basics.email || 'None set'}) and social
                          links for visitors to connect.
                        </p>
                      )}
                    </SortableSectionItem>
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Right Panel: Split-Screen Live Preview Canvas with Interactive Inline Editing */}
        <div
          data-testid="portfolio-preview-pane"
          className={`${
            mobilePane === 'preview' ? 'flex' : 'hidden'
          } lg:flex flex-col w-full lg:w-1/2 flex-1 min-h-0 bg-neutral-100 overflow-hidden relative`}
        >
          {/* Canvas Controls Header */}
          <div
            data-testid="portfolio-preview-toolbar"
            className="bg-white border-b border-neutral-200 px-4 py-2.5 flex items-center justify-between text-xs text-neutral-600 z-10 shrink-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
              <span className="font-semibold text-neutral-900 truncate">Live Visual Preview Canvas</span>
              <span className="text-neutral-500 hidden sm:inline truncate">
                (Click any text on canvas to inline edit!)
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setScale((s) => Math.max(0.6, s - 0.1))}
                className="h-7 w-7 inline-flex items-center justify-center bg-white hover:bg-neutral-100 border border-neutral-300 rounded-control text-neutral-700 hover:text-neutral-900 transition-colors focus-ring"
              >
                -
              </button>
              <button
                type="button"
                aria-label="Reset zoom"
                onClick={() => setScale(1)}
                className="h-7 px-2 inline-flex items-center justify-center bg-white hover:bg-neutral-100 border border-neutral-300 rounded-control text-neutral-700 hover:text-neutral-900 font-medium tabular-nums transition-colors focus-ring"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setScale((s) => Math.min(1.4, s + 0.1))}
                className="h-7 w-7 inline-flex items-center justify-center bg-white hover:bg-neutral-100 border border-neutral-300 rounded-control text-neutral-700 hover:text-neutral-900 transition-colors focus-ring"
              >
                +
              </button>
            </div>
          </div>

          {/* Interactive Live Canvas Area */}
          <div
            data-testid="portfolio-preview-canvas"
            className="flex-1 overflow-y-auto p-4 sm:p-8 bg-neutral-100 flex justify-center items-start"
          >
            <div
              className="w-full max-w-3xl bg-white rounded-panel shadow-card-hover border border-neutral-200/90 text-neutral-900 overflow-hidden transition-transform duration-200 origin-top"
              style={{ transform: `scale(${scale})` }}
            >
              {/* Canvas Hero Header */}
              <div
                data-testid="portfolio-preview-hero"
                className="p-8 sm:p-12 text-center border-b border-neutral-200/80 bg-gradient-to-b from-primary-50/50 via-white to-neutral-50/40 flex flex-col items-center"
              >
                <div
                  data-testid="portfolio-preview-hero-name"
                  className="w-full max-w-xl min-h-[2.75rem]"
                >
                  <InlineEdit
                    value={portfolio.basics.name}
                    onChange={(v) => handleBasicsChange('name', v)}
                    placeholder="Click to set name"
                    textClassName="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight text-center break-words"
                  />
                </div>

                <div
                  data-testid="portfolio-preview-hero-headline"
                  className="mt-2.5 w-full max-w-xl min-h-[1.75rem]"
                >
                  <InlineEdit
                    value={portfolio.basics.title || ''}
                    onChange={(v) => handleBasicsChange('title', v)}
                    placeholder="Click to set professional title"
                    textClassName="text-lg sm:text-xl font-semibold text-primary-600 text-center break-words"
                  />
                </div>

                <div className="mt-4 w-full max-w-xl">
                  <InlineEdit
                    value={portfolio.basics.bio || ''}
                    onChange={(v) => handleBasicsChange('bio', v)}
                    placeholder="Click to add your bio summary..."
                    multiline
                    textClassName="text-sm text-neutral-600 leading-relaxed text-center"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-600 mt-5">
                  {portfolio.basics.location && (
                    <span className="px-3 py-1 rounded-full bg-white border border-neutral-200 shadow-sm">
                      {portfolio.basics.location}
                    </span>
                  )}
                  {portfolio.basics.email && (
                    <span className="px-3 py-1 rounded-full bg-white border border-neutral-200 shadow-sm">
                      {portfolio.basics.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Ordered Sections on Live Canvas */}
              <div className="p-6 sm:p-8 space-y-12">
                {orderedSections.map((section) => {
                  if (section.type === 'about') return null;

                  if (section.type === 'projects') {
                    const projects = (section.content as PortfolioProject[]) || [];
                    return (
                      <div key={section.id}>
                        <h4 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2.5">
                          <span className="w-1.5 h-6 bg-primary-600 rounded-full" aria-hidden="true" />
                          <span>{section.title}</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {projects.map((p) => (
                            <div
                              key={p.id}
                              className="rounded-card border border-neutral-200/90 overflow-hidden shadow-card bg-white flex flex-col"
                            >
                              {p.images && p.images.length > 0 ? (
                                <div className="aspect-video bg-neutral-100 overflow-hidden relative">
                                  <img
                                    src={resolveImageUrl(p.images[0])}
                                    alt={p.title}
                                    className="w-full h-full object-cover"
                                  />
                                  {p.images.length > 1 && (
                                    <span className="absolute bottom-2 right-2 bg-neutral-900/75 text-white text-[10px] px-2 py-0.5 rounded-control font-medium">
                                      +{p.images.length - 1} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="aspect-video bg-gradient-to-br from-primary-50/70 via-neutral-50 to-accent-50/70 border-b border-neutral-100 flex items-center justify-center text-primary-400">
                                  <PhotoIcon className="w-8 h-8 opacity-50" aria-hidden="true" />
                                </div>
                              )}

                              <div className="p-5 flex-1 flex flex-col justify-between">
                                <div>
                                  <InlineEdit
                                    value={p.title}
                                    onChange={(v) => handleProjectUpdate(p.id, 'title', v)}
                                    placeholder="Project Title"
                                    textClassName="text-base font-semibold text-neutral-900"
                                  />

                                  <div className="mt-2">
                                    <InlineEdit
                                      value={p.description}
                                      onChange={(v) => handleProjectUpdate(p.id, 'description', v)}
                                      placeholder="Project description..."
                                      multiline
                                      textClassName="text-xs text-neutral-600 leading-relaxed"
                                    />
                                  </div>

                                  {p.tags && p.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                      {p.tags.map((t, idx) => (
                                        <span
                                          key={idx}
                                          className="text-[10px] font-medium bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200/70 px-2 py-0.5 rounded-full"
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {(p.demoUrl || p.githubUrl) && (
                                  <div className="flex items-center gap-3 text-xs pt-4 mt-3 border-t border-neutral-100">
                                    {p.demoUrl && (
                                      <span className="text-primary-600 font-semibold">
                                        Live Demo ↗
                                      </span>
                                    )}
                                    {p.githubUrl && (
                                      <span className="text-neutral-600 font-medium">
                                        Code ↗
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (section.type === 'skills') {
                    const skills = section.content || [];
                    return (
                      <div key={section.id}>
                        <h4 className="text-xl font-bold text-neutral-900 mb-4 flex items-center gap-2.5">
                          <span className="w-1.5 h-6 bg-primary-600 rounded-full" aria-hidden="true" />
                          <span>{section.title}</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill: any, idx: number) => (
                            <span
                              key={skill.id || idx}
                              className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-control text-xs font-medium text-neutral-800"
                            >
                              {typeof skill === 'string' ? skill : skill.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (section.type === 'experience') {
                    const experiences = section.content || [];
                    return (
                      <div key={section.id}>
                        <h4 className="text-xl font-bold text-neutral-900 mb-4 flex items-center gap-2.5">
                          <span className="w-1.5 h-6 bg-primary-600 rounded-full" aria-hidden="true" />
                          <span>{section.title}</span>
                        </h4>
                        <div className="space-y-4">
                          {experiences.map((exp: any, idx: number) => (
                            <div
                              key={exp.id || idx}
                              className="border-l-2 border-primary-600 pl-4 py-1"
                            >
                              <h5 className="text-sm font-semibold text-neutral-900">
                                {exp.position} - {exp.company}
                              </h5>
                              <p className="text-xs text-neutral-500">{exp.period}</p>
                              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                                {exp.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (section.type === 'contact') {
                    return (
                      <div
                        key={section.id}
                        className="text-center p-6 bg-neutral-50 rounded-card border border-neutral-200"
                      >
                        <h4 className="text-lg font-bold text-neutral-900 mb-2">{section.title}</h4>
                        <p className="text-xs text-neutral-600 mb-4">
                          Feel free to reach out via email for opportunities or questions.
                        </p>
                        {portfolio.basics.email && (
                          <span className="inline-block px-4 py-2 bg-primary-600 text-white rounded-control text-xs font-semibold shadow-sm">
                            {portfolio.basics.email}
                          </span>
                        )}
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resume Projects Import Modal */}
      <ImportProjectsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportResumeProjects}
      />
    </div>
  );
};
