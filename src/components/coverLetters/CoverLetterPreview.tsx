import React, { useEffect, useRef, useState } from 'react';
import {
  EnvelopeIcon,
  GlobeAltIcon,
  LinkIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  MapPinIcon,
  PaintBrushIcon,
  PhoneIcon,
  PrinterIcon,
  SwatchIcon,
} from '@heroicons/react/24/outline';
import { ICoverLetter } from '../../types/coverLetter';
import { IResume, ThemeConfig } from '../../types/resume';
import { A4_HEIGHT_PX, A4_WIDTH_PX } from '../ResumePreview';
import { ThemeCustomizationPanel } from '../ThemeCustomizationPanel';
import { getThemeStyles } from '../../constants/themeConstants';
import {
  getTemplate,
  mergeTemplateTheme,
  TemplateDefinition,
} from '../templates/registry';
import { TemplateGalleryModal } from '../templates/TemplateGalleryModal';
import { extractExtraBasicsLinks } from '../templates/templateHelpers';
import { sampleResume } from '../templates/sampleResume';

export interface CoverLetterPreviewProps {
  coverLetter: ICoverLetter;
  linkedResume?: IResume | null;
  fallbackBasics?: {
    name?: string;
    email?: string;
  };
  onChange?: (updated: ICoverLetter) => void;
  onPrint?: () => void;
  readOnly?: boolean;
}

const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatCoverLetterDisplayDate(rawDate?: string): string {
  if (!rawDate || !rawDate.trim()) return '';
  const trimmed = rawDate.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const monthIndex = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    if (monthIndex >= 0 && monthIndex < 12 && day >= 1 && day <= 31) {
      return `${LONG_MONTHS[monthIndex]} ${day}, ${year}`;
    }
  }
  return trimmed;
}

export function splitBodyIntoParagraphs(body?: string): string[] {
  if (!body || typeof body !== 'string') return [];
  return body
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function computeFitScale(availableWidth: number): number {
  if (!availableWidth || availableWidth <= 0) {
    return 1;
  }
  const raw = (availableWidth - 2) / A4_WIDTH_PX;
  return Math.max(0.25, Math.min(1, Number(raw.toFixed(4))));
}

function measureContentWidth(
  el: HTMLElement,
  contentRectWidth?: number
): number {
  if (typeof contentRectWidth === 'number' && contentRectWidth > 0) {
    return contentRectWidth;
  }
  if (el.clientWidth > 0) {
    const styles = window.getComputedStyle(el);
    const paddingX =
      (parseFloat(styles.paddingLeft) || 0) +
      (parseFloat(styles.paddingRight) || 0);
    return Math.max(0, el.clientWidth - paddingX);
  }
  return 0;
}

function extractInitials(rawName?: string): string {
  if (!rawName || typeof rawName !== 'string') return '';
  const tokens = rawName
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/^[^A-Za-z0-9\u00C0-\u024F]+/, ''))
    .filter(Boolean);
  if (tokens.length === 0) return '';
  if (tokens.length === 1) return tokens[0].charAt(0).toUpperCase();
  return `${tokens[0].charAt(0)}${tokens[tokens.length - 1].charAt(0)}`.toUpperCase();
}

export const CoverLetterPreview: React.FC<CoverLetterPreviewProps> = ({
  coverLetter,
  linkedResume,
  fallbackBasics,
  onChange,
  onPrint,
  readOnly = false,
}) => {
  const effectiveTemplateId =
    coverLetter.templateId || linkedResume?.templateId || 'modern';
  const effectiveThemeConfig =
    coverLetter.themeConfig ?? linkedResume?.themeConfig;

  const activeTemplate = getTemplate(effectiveTemplateId);
  const themeStyles = getThemeStyles(
    effectiveThemeConfig,
    activeTemplate.defaultTheme
  );

  const [fitScale, setFitScale] = useState<number>(1);
  const [manualScale, setManualScale] = useState<number | null>(null);
  const [pageHeight, setPageHeight] = useState<number>(A4_HEIGHT_PX);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const customisedKeysRef = useRef<Set<keyof ThemeConfig>>(new Set());

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const initialWidth = measureContentWidth(viewport);
    if (initialWidth > 0) {
      setFitScale(computeFitScale(initialWidth));
    }

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = measureContentWidth(viewport, entry.contentRect?.width);
        if (width > 0) {
          const nextScale = computeFitScale(width);
          setFitScale((prev) =>
            Math.abs(prev - nextScale) > 0.002 ? nextScale : prev
          );
        }
      }
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const pageEl = pageRef.current;
    if (!pageEl) return;

    const syncHeight = () => {
      const h = Math.max(A4_HEIGHT_PX, pageEl.offsetHeight || 0);
      setPageHeight(h);
    };

    syncHeight();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      syncHeight();
    });

    observer.observe(pageEl);
    return () => observer.disconnect();
  }, [coverLetter, linkedResume, activeTemplate.id]);

  const effectiveScale = manualScale ?? fitScale;
  const isFitMode = manualScale === null;

  const handlePrintClick = () => {
    if (onPrint) {
      onPrint();
    } else if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  const handleZoomIn = () => {
    setManualScale((prev) => {
      const base = prev ?? fitScale;
      return Math.min(2, Number((base + 0.1).toFixed(2)));
    });
  };

  const handleZoomOut = () => {
    setManualScale((prev) => {
      const base = prev ?? fitScale;
      return Math.max(0.3, Number((base - 0.1).toFixed(2)));
    });
  };

  const handleFitToWidth = () => {
    setManualScale(null);
  };

  const handleTemplateSelect = (nextTemplate: TemplateDefinition) => {
    const nextThemeConfig = mergeTemplateTheme(
      effectiveThemeConfig,
      activeTemplate.defaultTheme,
      nextTemplate.defaultTheme,
      customisedKeysRef.current
    );
    setShowTemplateGallery(false);
    onChange?.({
      ...coverLetter,
      templateId: nextTemplate.id,
      themeConfig: nextThemeConfig,
    });
  };

  const basics = linkedResume?.content?.basics || {};
  const senderName =
    basics.name?.trim() || fallbackBasics?.name?.trim() || 'Your Name';
  const senderLabel =
    basics.label?.trim() || coverLetter.jobTitle?.trim() || '';
  const senderEmail =
    basics.email?.trim() || fallbackBasics?.email?.trim() || '';
  const senderPhone = basics.phone?.trim() || '';
  const senderLocation = [
    basics.location?.address,
    basics.location?.city,
    (basics.location as Record<string, any> | undefined)?.region,
    basics.location?.countryCode,
    basics.location?.postalCode,
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(', ');

  const extraLinks = extractExtraBasicsLinks(basics as Record<string, any>);

  const contactItems: Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    href?: string;
  }> = [];

  if (senderEmail) {
    contactItems.push({
      key: 'email',
      icon: <EnvelopeIcon className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />,
      label: senderEmail,
      href: `mailto:${senderEmail}`,
    });
  }
  if (senderPhone) {
    contactItems.push({
      key: 'phone',
      icon: <PhoneIcon className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />,
      label: senderPhone,
      href: `tel:${senderPhone}`,
    });
  }
  if (senderLocation) {
    contactItems.push({
      key: 'location',
      icon: <MapPinIcon className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />,
      label: senderLocation,
    });
  }
  extraLinks.forEach((link) => {
    contactItems.push({
      key: link.key,
      icon:
        link.key === 'website' ? (
          <GlobeAltIcon className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
        ) : (
          <LinkIcon className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
        ),
      label: link.label,
      href: link.href,
    });
  });

  const renderContactRow = (
    align: 'center' | 'left' | 'stacked-right',
    lightOnDark = false
  ) => {
    if (contactItems.length === 0) return null;

    if (align === 'stacked-right') {
      return (
        <div className="text-xs space-y-1 text-right shrink-0">
          {contactItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-end gap-1.5"
              style={{
                color: lightOnDark
                  ? 'rgba(255,255,255,0.92)'
                  : 'var(--theme-text-color, #475569)',
              }}
            >
              {item.href ? (
                <a
                  href={item.href}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="hover:underline"
                  style={{
                    color: lightOnDark
                      ? '#ffffff'
                      : 'var(--theme-primary, #1e293b)',
                  }}
                >
                  {item.label}
                </a>
              ) : (
                <span>{item.label}</span>
              )}
              {item.icon}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div
        data-testid="cover-letter-contact-row"
        className={`text-xs flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2.5 ${
          align === 'center' ? 'justify-center' : 'justify-start'
        }`}
        style={{
          color: lightOnDark
            ? 'rgba(255,255,255,0.92)'
            : 'var(--theme-text-color, #475569)',
        }}
      >
        {contactItems.map((item, idx) => (
          <React.Fragment key={item.key}>
            {idx > 0 && (
              <span
                className="opacity-50"
                aria-hidden="true"
              >
                •
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              {item.icon}
              {item.href ? (
                <a
                  href={item.href}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="hover:underline"
                  style={{
                    color: lightOnDark
                      ? '#ffffff'
                      : 'var(--theme-primary, #1e293b)',
                  }}
                >
                  {item.label}
                </a>
              ) : (
                <span>{item.label}</span>
              )}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  const templateId = activeTemplate.id;
  const isBoldHeader = templateId === 'bold-header';
  const isSplitHeader = templateId === 'professional';
  const isLeftAccentHeader =
    templateId === 'executive' ||
    templateId === 'timeline' ||
    templateId === 'two-column';
  const isTopBarHeader =
    templateId === 'tech-split' || templateId === 'creative-sidebar';

  const renderLetterhead = () => {
    if (isBoldHeader) {
      const initials = extractInitials(senderName);
      return (
        <header
          data-testid="cover-letter-letterhead"
          className="w-full text-white border-b-2 border-slate-900/15 break-inside-avoid"
          style={{
            backgroundColor:
              'var(--theme-accent, var(--theme-primary, #991b1b))',
            paddingLeft: 'var(--theme-page-margin, 1.75cm)',
            paddingRight: 'var(--theme-page-margin, 1.75cm)',
            paddingTop: '1.35rem',
            paddingBottom: '1.35rem',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <div className="flex items-center gap-4">
            {initials && (
              <div
                aria-hidden="true"
                className="w-14 h-14 rounded-full border-2 border-white/85 bg-white/15 flex items-center justify-center shrink-0 text-white text-lg font-bold tracking-wider"
                style={{ fontFamily: 'var(--theme-heading-font)' }}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div
                data-testid="letterhead-sender-name"
                className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-white"
                style={{ fontFamily: 'var(--theme-heading-font)' }}
              >
                {senderName}
              </div>
              {senderLabel && (
                <div
                  data-testid="letterhead-sender-label"
                  className="text-sm sm:text-base font-medium mt-0.5 text-white/90"
                >
                  {senderLabel}
                </div>
              )}
              {renderContactRow('left', true)}
            </div>
          </div>
        </header>
      );
    }

    if (isSplitHeader) {
      return (
        <header
          data-testid="cover-letter-letterhead"
          className="flex items-start justify-between gap-6 pb-5 border-b-2"
          style={{
            borderColor: 'var(--theme-primary, #1e293b)',
            marginBottom: 'var(--theme-section-spacing, 1.5rem)',
          }}
        >
          <div className="min-w-0">
            <div
              data-testid="letterhead-sender-name"
              className="text-3xl font-bold tracking-tight leading-tight"
              style={{
                fontFamily: 'var(--theme-heading-font)',
                color: 'var(--theme-heading-color, #111827)',
              }}
            >
              {senderName}
            </div>
            {senderLabel && (
              <div
                data-testid="letterhead-sender-label"
                className="text-base mt-1 font-medium"
                style={{
                  color: 'var(--theme-accent, var(--theme-primary, #334155))',
                }}
              >
                {senderLabel}
              </div>
            )}
          </div>
          {renderContactRow('stacked-right')}
        </header>
      );
    }

    if (isLeftAccentHeader) {
      return (
        <header
          data-testid="cover-letter-letterhead"
          className="pl-4 pb-4 border-b"
          style={{
            borderLeftWidth: '4px',
            borderLeftStyle: 'solid',
            borderLeftColor:
              'var(--theme-accent, var(--theme-primary, #2563eb))',
            borderBottomColor: '#e2e8f0',
            marginBottom: 'var(--theme-section-spacing, 1.5rem)',
          }}
        >
          <div
            data-testid="letterhead-sender-name"
            className="text-3xl font-bold tracking-tight leading-tight"
            style={{
              fontFamily: 'var(--theme-heading-font)',
              color: 'var(--theme-heading-color, #0f172a)',
            }}
          >
            {senderName}
          </div>
          {senderLabel && (
            <div
              data-testid="letterhead-sender-label"
              className="text-base mt-1 font-semibold"
              style={{
                color: 'var(--theme-accent, var(--theme-primary, #2563eb))',
              }}
            >
              {senderLabel}
            </div>
          )}
          {renderContactRow('left')}
        </header>
      );
    }

    if (isTopBarHeader) {
      return (
        <header
          data-testid="cover-letter-letterhead"
          className="pb-5 border-b"
          style={{
            borderBottomColor: '#e2e8f0',
            marginBottom: 'var(--theme-section-spacing, 1.5rem)',
          }}
        >
          <div
            className="h-1.5 w-20 rounded-full mb-4"
            style={{
              backgroundColor:
                'var(--theme-accent, var(--theme-primary, #0f766e))',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
            aria-hidden="true"
          />
          <div
            data-testid="letterhead-sender-name"
            className="text-3xl font-bold tracking-tight leading-tight"
            style={{
              fontFamily: 'var(--theme-heading-font)',
              color: 'var(--theme-heading-color, #0f172a)',
            }}
          >
            {senderName}
          </div>
          {senderLabel && (
            <div
              data-testid="letterhead-sender-label"
              className="text-base mt-1 font-medium"
              style={{
                color: 'var(--theme-accent, var(--theme-primary, #0f766e))',
              }}
            >
              {senderLabel}
            </div>
          )}
          {renderContactRow('left')}
        </header>
      );
    }

    return (
      <header
        data-testid="cover-letter-letterhead"
        className="text-center pb-5 border-b-2"
        style={{
          borderColor: 'var(--theme-primary, #111827)',
          marginBottom: 'var(--theme-section-spacing, 1.5rem)',
        }}
      >
        <div
          data-testid="letterhead-sender-name"
          className="text-3xl font-bold tracking-tight leading-tight"
          style={{
            fontFamily: 'var(--theme-heading-font)',
            color: 'var(--theme-heading-color, #111827)',
          }}
        >
          {senderName}
        </div>
        {senderLabel && (
          <div
            data-testid="letterhead-sender-label"
            className="text-base mt-1 font-medium"
            style={{
              color: 'var(--theme-accent, var(--theme-primary, #4b5563))',
            }}
          >
            {senderLabel}
          </div>
        )}
        {renderContactRow('center')}
      </header>
    );
  };

  const displayDate = formatCoverLetterDisplayDate(coverLetter.date);
  const paragraphs = splitBodyIntoParagraphs(coverLetter.body);
  const hasRecipient = Boolean(
    coverLetter.recipient?.name?.trim() ||
      coverLetter.recipient?.company?.trim() ||
      coverLetter.recipient?.address?.trim()
  );
  const scaledWidth = Math.round(A4_WIDTH_PX * effectiveScale);
  const scaledHeight = Math.round(pageHeight * effectiveScale);

  const previewResumeForGallery: IResume = linkedResume || sampleResume;

  return (
    <div className="flex flex-col h-full min-h-full bg-neutral-100 print:!bg-white print:!block print:!h-auto print:!min-h-0">
      {/* Toolbar */}
      <div
        data-testid="cover-letter-preview-toolbar"
        className="shrink-0 bg-white border-b border-neutral-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-20 print:hidden"
      >
        <div className="flex items-center gap-2 flex-wrap">
          {!readOnly && (
            <>
              <button
                type="button"
                data-testid="cl-open-template-gallery-btn"
                onClick={() => {
                  setShowTemplateGallery((prev) => !prev);
                  setShowThemePanel(false);
                }}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-control border transition-colors flex items-center gap-1.5 focus-ring ${
                  showTemplateGallery
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <SwatchIcon className="h-4 w-4" aria-hidden="true" />
                <span>Templates</span>
              </button>

              <button
                type="button"
                data-testid="cl-theme-customization-btn"
                onClick={() => {
                  setShowThemePanel((prev) => !prev);
                  setShowTemplateGallery(false);
                }}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-control border transition-colors flex items-center gap-1.5 focus-ring ${
                  showThemePanel
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <PaintBrushIcon className="h-4 w-4" aria-hidden="true" />
                <span>Customize Theme</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="inline-flex items-center rounded-control border border-neutral-300 bg-white overflow-hidden">
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label="Zoom out"
              title="Zoom out"
              className="px-2.5 py-1.5 text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <MagnifyingGlassMinusIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleFitToWidth}
              title="Reset to fit width"
              className="px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 border-x border-neutral-200 tabular-nums whitespace-nowrap transition-colors"
            >
              {Math.round(effectiveScale * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label="Zoom in"
              title="Zoom in"
              className="px-2.5 py-1.5 text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <MagnifyingGlassPlusIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleFitToWidth}
            title="Fit page to pane width"
            className={`px-2.5 py-1.5 text-xs font-medium rounded-control border transition-colors ${
              isFitMode
                ? 'bg-neutral-200/80 border-neutral-300 text-neutral-900'
                : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
          >
            Fit
          </button>

          <button
            type="button"
            onClick={handlePrintClick}
            className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-primary-600 rounded-control shadow-sm text-white hover:bg-primary-700 transition-colors inline-flex items-center gap-1.5 focus-ring"
          >
            <PrinterIcon className="h-4 w-4" aria-hidden="true" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {!readOnly && (
        <TemplateGalleryModal
          isOpen={showTemplateGallery}
          activeTemplateId={activeTemplate.id}
          resume={previewResumeForGallery}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateGallery(false)}
        />
      )}

      {/* Relative Canvas Area */}
      <div className="relative flex-1 min-h-0 flex flex-col print:!block print:!min-h-0">
        {!readOnly && showThemePanel && (
          <ThemeCustomizationPanel
            themeConfig={effectiveThemeConfig}
            templateDefaultTheme={activeTemplate.defaultTheme}
            templateLayout={activeTemplate.layout}
            onKeysCustomised={(changedKeys) => {
              changedKeys.forEach((k) => customisedKeysRef.current.add(k));
            }}
            onChange={(newTheme) => {
              onChange?.({
                ...coverLetter,
                templateId: activeTemplate.id,
                themeConfig: newTheme,
              });
            }}
            onReset={(resetTheme) => {
              customisedKeysRef.current.clear();
              onChange?.({
                ...coverLetter,
                templateId: activeTemplate.id,
                themeConfig: resetTheme,
              });
            }}
            onClose={() => setShowThemePanel(false)}
          />
        )}

        <div
          ref={viewportRef}
          data-testid="cover-letter-preview-viewport"
          className="flex-1 overflow-auto p-4 sm:p-6 bg-neutral-100 print:!p-0 print:!m-0 print:!bg-white print:!overflow-visible"
          style={{ scrollbarGutter: 'stable' }}
        >
          <div
            data-testid="cover-letter-preview-scaler"
            className="mx-auto print:!w-full print:!h-auto print:!m-0"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
            }}
          >
            {/* A4 Sheet carrying shared resume theme CSS variables */}
            <div
              ref={pageRef}
              data-testid="cover-letter-preview-page"
              className="cover-letter-print-sheet bg-white shadow-md ring-1 ring-black/5 rounded-[2px] origin-top-left print:!w-full print:!min-h-0 print:!transform-none print:!shadow-none print:!ring-0 print:!rounded-none"
              style={{
                width: `${A4_WIDTH_PX}px`,
                minHeight: `${A4_HEIGHT_PX}px`,
                transform: `scale(${effectiveScale})`,
                transformOrigin: 'top left',
                ...themeStyles,
              }}
            >
              <article
                className="min-h-full flex flex-col"
                style={{
                  fontFamily: 'var(--theme-body-font, inherit)',
                  color: 'var(--theme-text-color, #374151)',
                  fontSize: 'var(--theme-base-font-size, 13.5px)',
                  lineHeight: 'var(--theme-line-height, 1.5)',
                }}
              >
                {isBoldHeader && renderLetterhead()}

                <div
                  className="flex-1"
                  style={{
                    padding: 'var(--theme-page-margin, 1.75cm)',
                  }}
                >
                  {!isBoldHeader && renderLetterhead()}

                  {/* Date & Recipient Block */}
                  <div
                    className="space-y-4"
                    style={{
                      marginBottom: 'var(--theme-section-spacing, 1.5rem)',
                    }}
                  >
                    {displayDate && (
                      <p
                        data-testid="cover-letter-preview-date"
                        className="text-[0.95em] text-neutral-600"
                      >
                        {displayDate}
                      </p>
                    )}

                    {hasRecipient && (
                      <div
                        data-testid="cover-letter-preview-recipient"
                        className="text-[0.96em] space-y-0.5"
                      >
                        {coverLetter.recipient.name?.trim() && (
                          <p
                            className="font-semibold"
                            style={{
                              color: 'var(--theme-heading-color, #111827)',
                            }}
                          >
                            {coverLetter.recipient.name.trim()}
                          </p>
                        )}
                        {coverLetter.recipient.company?.trim() && (
                          <p className="font-medium">
                            {coverLetter.recipient.company.trim()}
                          </p>
                        )}
                        {coverLetter.recipient.address?.trim() && (
                          <p className="whitespace-pre-line text-neutral-600">
                            {coverLetter.recipient.address.trim()}
                          </p>
                        )}
                      </div>
                    )}

                    {coverLetter.jobTitle?.trim() && (
                      <p
                        data-testid="cover-letter-preview-subject"
                        className="font-semibold tracking-tight pt-1"
                        style={{
                          fontFamily: 'var(--theme-heading-font)',
                          color: 'var(--theme-heading-color, #111827)',
                        }}
                      >
                        Re: {coverLetter.jobTitle.trim()}
                      </p>
                    )}
                  </div>

                  {/* Salutation / Greeting */}
                  <p
                    data-testid="cover-letter-preview-greeting"
                    className="mb-4 font-medium"
                    style={{
                      color: 'var(--theme-heading-color, #111827)',
                    }}
                  >
                    {coverLetter.greeting?.trim() || 'Dear Hiring Manager,'}
                  </p>

                  {/* Body Paragraphs */}
                  <div
                    data-testid="cover-letter-preview-body"
                    className="space-y-4"
                  >
                    {paragraphs.length > 0 ? (
                      paragraphs.map((paragraph, index) => (
                        <p
                          key={index}
                          data-testid="cover-letter-preview-paragraph"
                          className="whitespace-pre-line break-words"
                          style={{
                            color: 'var(--theme-text-color, #374151)',
                            lineHeight: 'var(--theme-line-height, 1.55)',
                          }}
                        >
                          {paragraph}
                        </p>
                      ))
                    ) : (
                      <p className="italic text-neutral-400 print:hidden">
                        Start writing your cover letter on the left, or click
                        &ldquo;Draft with AI&rdquo; to tailor a draft from your
                        paired resume and job description.
                      </p>
                    )}
                  </div>

                  {/* Closing & Signature */}
                  <div
                    data-testid="cover-letter-preview-closing"
                    className="mt-8 break-inside-avoid"
                  >
                    <p className="mb-5">
                      {coverLetter.closing?.trim() || 'Sincerely,'}
                    </p>
                    <p
                      className="font-bold text-[1.05em]"
                      style={{
                        fontFamily: 'var(--theme-heading-font)',
                        color: 'var(--theme-heading-color, #111827)',
                      }}
                    >
                      {senderName}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterPreview;
