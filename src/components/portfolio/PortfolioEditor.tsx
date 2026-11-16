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
  ClipboardDocumentIcon
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
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4 transition-shadow hover:shadow"
    >
      <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50/80 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-700 rounded transition"
            title="Drag to reorder section"
            aria-label={`Drag to reorder ${title}`}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm text-gray-800">{title}</span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700">
            {type}
          </span>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
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
      setPortfolio(saved);
      toast.success('Portfolio saved successfully!');
      onSave?.(saved);
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
        setPortfolio(updated);
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
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            title="Back to portfolios list"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <input
              type="text"
              value={portfolio.title}
              onChange={(e) => setPortfolio((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Portfolio Title"
              className="text-base sm:text-lg font-bold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1"
            />
            <div className="flex items-center text-xs text-gray-500 mt-0.5 space-x-1">
              <span>Vanity URL:</span>
              <span className="font-mono text-gray-700">/p/</span>
              <input
                type="text"
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
                className="font-mono text-blue-600 border-b border-dashed border-gray-300 focus:border-blue-500 focus:outline-none px-1 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Publish & Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Status Badge */}
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center space-x-1 ${
              portfolio.isPublished
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                portfolio.isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{portfolio.isPublished ? 'Live & Published' : 'Draft (Private)'}</span>
          </span>

          {/* Toggle Publish */}
          <button
            onClick={handleTogglePublish}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition ${
              portfolio.isPublished
                ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {portfolio.isPublished ? 'Unpublish' : 'Publish to Web'}
          </button>

          {/* Copy Public Link */}
          {portfolio.isPublished && (
            <button
              onClick={copyPublicLink}
              className="p-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center space-x-1.5 transition"
              title="Copy public URL"
            >
              {copiedLink ? (
                <>
                  <CheckIcon className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="w-4 h-4" />
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
              className="p-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center space-x-1.5 transition"
            >
              <EyeIcon className="w-4 h-4" />
              <span className="hidden sm:inline">View Public</span>
            </a>
          )}

          {/* Save Button */}
          <button
            onClick={handleSavePortfolio}
            disabled={saving}
            className="px-4 py-1.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow disabled:opacity-50 flex items-center space-x-1.5 transition"
          >
            <CloudArrowUpIcon className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </header>

      {/* Split-Screen Canvas Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel: Workspace Controls */}
        <div className="w-full lg:w-1/2 h-full overflow-y-auto border-r border-gray-200 bg-gray-50/70 p-4 sm:p-6 space-y-6">
          {/* Workspace Instructions */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 flex items-start space-x-3">
            <Bars3Icon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-blue-900">Workspace & Layout Controls</p>
              <p className="mt-0.5">
                Drag section handles to reorder your portfolio blocks. Upload project images directly
                into gallery cards. Inline edits made on the right canvas sync automatically!
              </p>
            </div>
          </div>

          {/* Basics Section (Hero) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span>Basics & Hero Profile</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Your Full Name</label>
                <input
                  type="text"
                  value={portfolio.basics.name}
                  onChange={(e) => handleBasicsChange('name', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Alex Morgan"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Professional Title</label>
                <input
                  type="text"
                  value={portfolio.basics.title || ''}
                  onChange={(e) => handleBasicsChange('title', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Staff Full Stack Engineer"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Short Bio / Tagline</label>
                <textarea
                  rows={3}
                  value={portfolio.basics.bio || ''}
                  onChange={(e) => handleBasicsChange('bio', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Introduce yourself and highlight your passions..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={portfolio.basics.email || ''}
                  onChange={(e) => handleBasicsChange('email', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={portfolio.basics.location || ''}
                  onChange={(e) => handleBasicsChange('location', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. New York, NY"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">GitHub Profile</label>
                <input
                  type="url"
                  value={portfolio.basics.socialLinks?.github || ''}
                  onChange={(e) => handleSocialLinkChange('github', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="https://github.com/username"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn Profile</label>
                <input
                  type="url"
                  value={portfolio.basics.socialLinks?.linkedin || ''}
                  onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
            </div>
          </div>

          {/* Drag & Drop Sortable Sections */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Portfolio Sections Order
              </h3>
              <span className="text-xs text-gray-500">Drag to reorder layout</span>
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
                      {/* Section Content Customizers */}
                      {section.type === 'projects' && (
                        <div className="space-y-6">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-200">
                            <span className="text-xs text-gray-500">
                              Showcase your top engineering & design projects with media galleries
                            </span>
                            <div className="flex items-center space-x-2">
                              {/* Import from Resume Button */}
                              <button
                                onClick={() => setShowImportModal(true)}
                                className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center space-x-1.5 transition"
                              >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                <span>Import from Resume</span>
                              </button>
                              {/* Add Project Card */}
                              <button
                                onClick={handleAddProject}
                                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center space-x-1.5 transition"
                              >
                                <PlusIcon className="w-4 h-4" />
                                <span>Add Project</span>
                              </button>
                            </div>
                          </div>

                          {/* Projects List */}
                          {(section.content as PortfolioProject[]).map((proj, pIdx) => (
                            <div
                              key={proj.id}
                              className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500">
                                  Project Card #{pIdx + 1}
                                </span>
                                <button
                                  onClick={() => handleDeleteProject(proj.id)}
                                  className="text-gray-400 hover:text-red-600 transition"
                                  title="Delete Project Card"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Project Title
                                  </label>
                                  <input
                                    type="text"
                                    value={proj.title}
                                    onChange={(e) =>
                                      handleProjectUpdate(proj.id, 'title', e.target.value)
                                    }
                                    className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Tags / Tech (comma-separated)
                                  </label>
                                  <input
                                    type="text"
                                    value={proj.tags?.join(', ') || ''}
                                    onChange={(e) =>
                                      handleProjectUpdate(
                                        proj.id,
                                        'tags',
                                        e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                                      )
                                    }
                                    placeholder="React, Node.js, AWS"
                                    className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Project Description
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={proj.description}
                                    onChange={(e) =>
                                      handleProjectUpdate(proj.id, 'description', e.target.value)
                                    }
                                    className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Live Demo URL
                                  </label>
                                  <input
                                    type="url"
                                    value={proj.demoUrl || ''}
                                    onChange={(e) =>
                                      handleProjectUpdate(proj.id, 'demoUrl', e.target.value)
                                    }
                                    placeholder="https://..."
                                    className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    GitHub URL
                                  </label>
                                  <input
                                    type="url"
                                    value={proj.githubUrl || ''}
                                    onChange={(e) =>
                                      handleProjectUpdate(proj.id, 'githubUrl', e.target.value)
                                    }
                                    placeholder="https://github.com/..."
                                    className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                  />
                                </div>
                              </div>

                              {/* Media Asset Gallery & Native Upload */}
                              <div className="pt-2 border-t border-gray-200">
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                  Project Showcase Media Gallery (JPEG, PNG, WebP &lt; 5MB)
                                </label>

                                <div className="flex flex-wrap gap-3 items-center">
                                  {/* Uploaded Image Thumbnails */}
                                  {proj.images?.map((imgUrl, idx) => (
                                    <div
                                      key={idx}
                                      className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200"
                                    >
                                      <img
                                        src={resolveImageUrl(imgUrl)}
                                        alt={`Project thumbnail ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                      <button
                                        onClick={() => handleRemoveImage(proj.id, idx)}
                                        className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition"
                                        title="Delete image"
                                      >
                                        <TrashIcon className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}

                                  {/* Native File Upload Input */}
                                  <label
                                    className={`w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-lg cursor-pointer bg-white transition ${
                                      uploadingImage === proj.id ? 'opacity-50 pointer-events-none' : ''
                                    }`}
                                  >
                                    <PhotoIcon className="w-5 h-5 text-gray-400" />
                                    <span className="text-[9px] text-gray-500 font-medium mt-0.5">
                                      {uploadingImage === proj.id ? 'Uploading' : '+ Upload'}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      className="hidden"
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

                      {section.type === 'skills' && (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-500">
                            Highlight your key skills and core technical competencies.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {section.content?.map((skill: any, sIdx: number) => (
                              <div
                                key={skill.id || sIdx}
                                className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs"
                              >
                                <span>{typeof skill === 'string' ? skill : skill.name}</span>
                                <button
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
                                  className="text-gray-400 hover:text-red-500 ml-1"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          {/* Add Skill Quick Input */}
                          <div className="flex items-center space-x-2 pt-2">
                            <input
                              type="text"
                              id={`add-skill-${section.id}`}
                              placeholder="Add skill (e.g. Next.js, Docker)"
                              className="text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none flex-1"
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
                              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}

                      {section.type === 'experience' && (
                        <div className="space-y-4">
                          <p className="text-xs text-gray-500">
                            Summarize your relevant career highlights and roles.
                          </p>
                          {section.content?.map((exp: any, expIdx: number) => (
                            <div
                              key={exp.id || expIdx}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-2"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-800">
                                  {exp.position} at {exp.company}
                                </span>
                                <button
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
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-gray-600">{exp.description}</p>
                            </div>
                          ))}
                          <button
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
                            className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                          >
                            + Add Experience Item
                          </button>
                        </div>
                      )}

                      {section.type === 'about' && (
                        <p className="text-xs text-gray-500">
                          The About section is customized using the Basics & Hero Profile settings above.
                        </p>
                      )}

                      {section.type === 'contact' && (
                        <p className="text-xs text-gray-500">
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
        <div className="w-full lg:w-1/2 h-full bg-slate-800 flex flex-col overflow-hidden relative">
          {/* Canvas Controls Header */}
          <div className="bg-slate-900 border-b border-slate-700 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300 z-10">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-semibold text-white">Live Visual Preview Canvas</span>
              <span className="text-slate-400 hidden sm:inline">
                (Click any text on canvas to inline edit!)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setScale((s) => Math.max(0.6, s - 0.1))}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
              >
                -
              </button>
              <button
                onClick={() => setScale(1)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                onClick={() => setScale((s) => Math.min(1.4, s + 0.1))}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
              >
                +
              </button>
            </div>
          </div>

          {/* Interactive Live Canvas Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
            <div
              className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 text-gray-900 overflow-hidden transition-transform duration-200 origin-top"
              style={{ transform: `scale(${scale})` }}
            >
              {/* Canvas Hero Header */}
              <div className="p-8 sm:p-12 text-center border-b border-gray-100 bg-gradient-to-b from-slate-50 to-white">
                {/* Inline Edit for Basics Name */}
                <div className="inline-block">
                  <InlineEdit
                    value={portfolio.basics.name}
                    onChange={(v) => handleBasicsChange('name', v)}
                    placeholder="Click to set name"
                    textClassName="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight"
                  />
                </div>

                {/* Inline Edit for Title */}
                <div className="mt-2 inline-block">
                  <InlineEdit
                    value={portfolio.basics.title || ''}
                    onChange={(v) => handleBasicsChange('title', v)}
                    placeholder="Click to set professional title"
                    textClassName="text-lg sm:text-xl font-medium text-blue-600"
                  />
                </div>

                {/* Inline Edit for Bio */}
                <div className="mt-4 max-w-xl mx-auto">
                  <InlineEdit
                    value={portfolio.basics.bio || ''}
                    onChange={(v) => handleBasicsChange('bio', v)}
                    placeholder="Click to add your bio summary..."
                    multiline
                    textClassName="text-sm text-gray-600 leading-relaxed text-center"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 mt-4">
                  {portfolio.basics.location && <span>📍 {portfolio.basics.location}</span>}
                  {portfolio.basics.email && <span>✉️ {portfolio.basics.email}</span>}
                </div>
              </div>

              {/* Dynamic Ordered Sections on Live Canvas */}
              <div className="p-8 space-y-12">
                {orderedSections.map((section) => {
                  if (section.type === 'about') return null;

                  if (section.type === 'projects') {
                    const projects = (section.content as PortfolioProject[]) || [];
                    return (
                      <div key={section.id}>
                        <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                          <span className="w-2 h-6 bg-blue-600 rounded-full" />
                          <span>{section.title}</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {projects.map((p) => (
                            <div
                              key={p.id}
                              className="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white flex flex-col"
                            >
                              {/* Live Gallery Media Preview */}
                              {p.images && p.images.length > 0 ? (
                                <div className="aspect-video bg-gray-100 overflow-hidden relative">
                                  <img
                                    src={resolveImageUrl(p.images[0])}
                                    alt={p.title}
                                    className="w-full h-full object-cover"
                                  />
                                  {p.images.length > 1 && (
                                    <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                                      +{p.images.length - 1} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
                                  <PhotoIcon className="w-8 h-8 opacity-40" />
                                </div>
                              )}

                              <div className="p-5 flex-1 flex flex-col justify-between">
                                <div>
                                  {/* Canvas Inline Edit for Project Title */}
                                  <InlineEdit
                                    value={p.title}
                                    onChange={(v) => handleProjectUpdate(p.id, 'title', v)}
                                    placeholder="Project Title"
                                    textClassName="text-base font-bold text-gray-900"
                                  />

                                  {/* Canvas Inline Edit for Project Description */}
                                  <div className="mt-2">
                                    <InlineEdit
                                      value={p.description}
                                      onChange={(v) => handleProjectUpdate(p.id, 'description', v)}
                                      placeholder="Project description..."
                                      multiline
                                      textClassName="text-xs text-gray-600 leading-relaxed"
                                    />
                                  </div>

                                  {/* Tags */}
                                  {p.tags && p.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                      {p.tags.map((t, idx) => (
                                        <span
                                          key={idx}
                                          className="text-[10px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {(p.demoUrl || p.githubUrl) && (
                                  <div className="flex items-center space-x-3 text-xs pt-4 mt-3 border-t border-gray-100">
                                    {p.demoUrl && (
                                      <span className="text-blue-600 font-semibold">
                                        Live Demo ↗
                                      </span>
                                    )}
                                    {p.githubUrl && (
                                      <span className="text-gray-600 font-medium">
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
                        <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                          <span className="w-2 h-6 bg-blue-600 rounded-full" />
                          <span>{section.title}</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill: any, idx: number) => (
                            <span
                              key={skill.id || idx}
                              className="px-3 py-1 bg-slate-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
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
                        <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                          <span className="w-2 h-6 bg-blue-600 rounded-full" />
                          <span>{section.title}</span>
                        </h4>
                        <div className="space-y-4">
                          {experiences.map((exp: any, idx: number) => (
                            <div key={exp.id || idx} className="border-l-2 border-blue-600 pl-4 py-1">
                              <h5 className="text-sm font-bold text-gray-900">
                                {exp.position} - {exp.company}
                              </h5>
                              <p className="text-xs text-gray-500">{exp.period}</p>
                              <p className="text-xs text-gray-600 mt-1">{exp.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (section.type === 'contact') {
                    return (
                      <div key={section.id} className="text-center p-6 bg-slate-50 rounded-xl border border-gray-200">
                        <h4 className="text-lg font-bold text-gray-900 mb-2">{section.title}</h4>
                        <p className="text-xs text-gray-600 mb-3">
                          Feel free to reach out via email for opportunities or questions.
                        </p>
                        {portfolio.basics.email && (
                          <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold">
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
