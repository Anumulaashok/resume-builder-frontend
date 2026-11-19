import React, { useEffect, useMemo, useRef, useState } from 'react';
import { XMarkIcon, CheckCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { IResume } from '../../types/resume';
import { getThemeStyles } from '../../constants/themeConstants';
import {
  TemplateCategory,
  TemplateDefinition,
  TemplateLayout,
  templateRegistry,
} from './registry';
import { sampleResume } from './sampleResume';
import { isResumeEmpty } from './templateHelpers';

const A4_PREVIEW_WIDTH = 794;
const A4_PREVIEW_HEIGHT = 1123;
const MINI_SCALE = 0.28;

const CATEGORY_FILTERS: Array<{ id: 'all' | TemplateCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'modern', label: 'Modern' },
  { id: 'professional', label: 'Professional' },
  { id: 'simple', label: 'Simple' },
  { id: 'tech', label: 'Tech' },
  { id: 'creative', label: 'Creative' },
];

const LAYOUT_LABELS: Record<TemplateLayout, string> = {
  single: 'Single column',
  'two-column': 'Two-column',
  'sidebar-left': 'Left sidebar',
  'sidebar-right': 'Right sidebar',
};

const LayoutIcon: React.FC<{ layout: TemplateLayout }> = ({ layout }) => {
  return (
    <span
      data-testid={`layout-icon-${layout}`}
      title={LAYOUT_LABELS[layout]}
      className="inline-flex items-center gap-1 text-[11px] text-neutral-500"
    >
      <svg
        className="h-3.5 w-3.5 text-neutral-500 shrink-0"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        aria-hidden="true"
      >
        <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" />
        {layout === 'single' && (
          <>
            <line x1="4" y1="5" x2="12" y2="5" />
            <line x1="4" y1="8" x2="12" y2="8" />
            <line x1="4" y1="11" x2="10" y2="11" />
          </>
        )}
        {layout === 'two-column' && <line x1="8" y1="1.5" x2="8" y2="14.5" />}
        {layout === 'sidebar-left' && <line x1="6" y1="1.5" x2="6" y2="14.5" />}
        {layout === 'sidebar-right' && <line x1="10" y1="1.5" x2="10" y2="14.5" />}
      </svg>
      <span>{LAYOUT_LABELS[layout]}</span>
    </span>
  );
};

export interface TemplateGalleryModalProps {
  isOpen: boolean;
  activeTemplateId: string;
  resume: IResume;
  onSelect: (template: TemplateDefinition) => void;
  onClose: () => void;
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  activeTemplateId,
  resume,
  onSelect,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | TemplateCategory>('all');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (!active || active === first || !dialogRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (!active || active === last || !dialogRef.current.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (
        previousActiveElementRef.current &&
        document.body.contains(previousActiveElementRef.current)
      ) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  const usingSampleData = useMemo(() => isResumeEmpty(resume), [resume]);
  const previewResume = useMemo(
    () => (usingSampleData ? sampleResume : resume),
    [usingSampleData, resume]
  );

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return templateRegistry;
    return templateRegistry.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  if (!isOpen) return null;

  const scaledW = Math.round(A4_PREVIEW_WIDTH * MINI_SCALE);
  const scaledH = Math.round(A4_PREVIEW_HEIGHT * MINI_SCALE);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs print:hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-gallery-title"
        data-testid="template-gallery-modal"
        className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2
              id="template-gallery-title"
              className="text-lg font-bold text-neutral-900"
            >
              Template Gallery
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {usingSampleData
                ? 'Showing sample resume data — pick any layout to apply it immediately.'
                : 'Live previews rendered with your current resume content and customisations.'}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close template gallery"
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors focus-ring"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Category Filter Chips */}
        <div
          role="toolbar"
          aria-label="Filter templates by category"
          className="px-5 py-3 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center gap-2 shrink-0"
        >
          {CATEGORY_FILTERS.map((cat) => {
            const count =
              cat.id === 'all'
                ? templateRegistry.length
                : templateRegistry.filter((t) => t.category === cat.id).length;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={isActive}
                data-testid={`gallery-category-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors focus-ring ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                {`${cat.label} (${count})`}
              </button>
            );
          })}
        </div>

        {/* Responsive Grid of Live Mini Previews */}
        <div className="flex-1 overflow-y-auto p-5 bg-neutral-100/70">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((template) => {
              const isSelected = template.id === activeTemplateId;
              const PreviewComponent = template.component;
              const previewStyles = getThemeStyles(
                resume.themeConfig,
                template.defaultTheme
              );

              return (
                <button
                  key={template.id}
                  type="button"
                  data-testid={`template-card-${template.id}`}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(template)}
                  className={`group text-left bg-white rounded-xl border-2 overflow-hidden flex flex-col transition-all focus-ring ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-600/25 shadow-md'
                      : 'border-neutral-200 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  {/* Scaled Live Mini Preview Viewport */}
                  <div className="relative bg-neutral-100 border-b border-neutral-200 py-3 flex justify-center overflow-hidden">
                    <div
                      aria-hidden="true"
                      className="overflow-hidden bg-white shadow-sm ring-1 ring-black/5 rounded-[2px] pointer-events-none select-none"
                      style={{
                        width: `${scaledW}px`,
                        height: `${scaledH}px`,
                      }}
                    >
                      <div
                        style={{
                          width: `${A4_PREVIEW_WIDTH}px`,
                          minHeight: `${A4_PREVIEW_HEIGHT}px`,
                          transform: `scale(${MINI_SCALE})`,
                          transformOrigin: 'top left',
                          ...previewStyles,
                        }}
                      >
                        <PreviewComponent
                          resume={{
                            ...previewResume,
                            templateId: template.id,
                            themeConfig: {
                              ...template.defaultTheme,
                              ...(resume.themeConfig || {}),
                            },
                          }}
                          readOnly
                        />
                      </div>
                    </div>

                    {isSelected && (
                      <span
                        data-testid={`active-template-badge-${template.id}`}
                        className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-600 text-white shadow-sm"
                      >
                        <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Current</span>
                      </span>
                    )}
                  </div>

                  {/* Card Footer Metadata */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-neutral-900 group-hover:text-blue-600 transition-colors">
                          {template.name}
                        </span>
                        {template.atsFriendly && (
                          <span
                            data-testid={`ats-badge-${template.id}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                          >
                            <ShieldCheckIcon className="h-3 w-3" aria-hidden="true" />
                            <span>ATS-friendly</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                        {template.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                      <LayoutIcon layout={template.layout} />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                        {template.category}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
