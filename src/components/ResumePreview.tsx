import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { IResume, ThemeConfig } from "../types/resume";
import {
  ArrowPathIcon,
  DocumentTextIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  SwatchIcon,
  PaintBrushIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import {
  FitToOnePageResult,
  ThemeCustomizationPanel,
} from "./ThemeCustomizationPanel";
import {
  A4_WIDTH_PX,
  A4_HEIGHT_PX,
  LETTER_WIDTH_PX,
  LETTER_HEIGHT_PX,
  getPageDimensions,
  getNextFitThemeStep,
  getThemeStyles,
  resolveTemplateDefaultTheme,
} from "../constants/themeConstants";
import { resumeService } from "../services/resume.service";
import { triggerFileDownload } from "../utils/download";
import {
  getTemplate,
  mergeTemplateTheme,
  TemplateDefinition,
} from "./templates/registry";
import { TemplateGalleryModal } from "./templates/TemplateGalleryModal";

export { A4_WIDTH_PX, A4_HEIGHT_PX, LETTER_WIDTH_PX, LETTER_HEIGHT_PX };

interface ResumePreviewProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
  readOnly?: boolean;
  onDownloadPdf?: () => void;
  isPrinting?: boolean;
  onExportTxt?: () => Promise<void> | void;
  isExportingTxt?: boolean;
}

function computeFitScale(
  availableWidth: number,
  pageWidthPx: number = A4_WIDTH_PX
): number {
  if (!availableWidth || availableWidth <= 0 || !pageWidthPx || pageWidthPx <= 0) {
    return 1;
  }
  const raw = (availableWidth - 2) / pageWidthPx;
  return Math.max(0.25, Math.min(1, Number(raw.toFixed(4))));
}

function measureContentWidth(el: HTMLElement, contentRectWidth?: number): number {
  if (typeof contentRectWidth === "number" && contentRectWidth > 0) {
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

function measurePageContentHeight(pageEl: HTMLElement): number {
  return Math.max(pageEl.scrollHeight || 0, pageEl.offsetHeight || 0);
}

export function calculatePageCount(
  measuredHeightPx: number,
  pageHeightPx: number
): number {
  if (!pageHeightPx || pageHeightPx <= 0) return 1;
  if (measuredHeightPx <= pageHeightPx + 2) return 1;
  return Math.max(1, Math.ceil((measuredHeightPx - 2) / pageHeightPx));
}

const ResumePreview: React.FC<ResumePreviewProps> = ({
  resume,
  onChange,
  readOnly = false,
  onDownloadPdf,
  isPrinting = false,
  onExportTxt,
  isExportingTxt,
}) => {
  const externalTemplateId =
    resume.templateId || (resume as any).template;
  const [activeTemplateId, setActiveTemplateId] = useState(
    getTemplate(externalTemplateId).id
  );
  const pageDims = getPageDimensions(resume.themeConfig?.pageSize);

  const [fitScale, setFitScale] = useState<number>(1);
  const [manualScale, setManualScale] = useState<number | null>(null);
  const [pageHeight, setPageHeight] = useState<number>(pageDims.heightPx);
  const [pageCount, setPageCount] = useState<number>(1);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [internalExportingTxt, setInternalExportingTxt] =
    useState<boolean>(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const customisedKeysRef = useRef<Set<keyof ThemeConfig>>(new Set());

  useEffect(() => {
    if (externalTemplateId) {
      setActiveTemplateId(getTemplate(externalTemplateId).id);
    }
  }, [externalTemplateId]);

  // Fit-to-width scaling via ResizeObserver on the preview pane viewport
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const initialWidth = measureContentWidth(viewport);
    if (initialWidth > 0) {
      setFitScale(computeFitScale(initialWidth, pageDims.widthPx));
    }

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = measureContentWidth(viewport, entry.contentRect?.width);
        if (width > 0) {
          const nextScale = computeFitScale(width, pageDims.widthPx);
          setFitScale((prev) =>
            Math.abs(prev - nextScale) > 0.002 ? nextScale : prev
          );
        }
      }
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, [pageDims.widthPx]);

  // Track unscaled page height & page count so the scaled wrapper reserves exact vertical scroll space
  useEffect(() => {
    const pageEl = pageRef.current;
    if (!pageEl) return;

    const syncHeight = () => {
      const raw = measurePageContentHeight(pageEl);
      const h = Math.max(pageDims.heightPx, raw);
      setPageHeight(h);
      setPageCount(calculatePageCount(raw, pageDims.heightPx));
    };

    syncHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      syncHeight();
    });

    observer.observe(pageEl);
    return () => observer.disconnect();
  }, [activeTemplateId, resume, pageDims.heightPx]);

  const effectiveScale = manualScale ?? fitScale;
  const isFitMode = manualScale === null;
  const isTxtBusy =
    isExportingTxt !== undefined ? isExportingTxt : internalExportingTxt;

  const handlePrint = () => {
    if (isPrinting) return;
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
  };

  const handleDownloadTxt = async () => {
    if (isTxtBusy) return;

    if (onExportTxt) {
      await onExportTxt();
      return;
    }

    const resumeId = resume._id || (resume as { id?: string }).id;
    if (!resumeId) {
      toast.error("Please save your resume before exporting");
      return;
    }

    setInternalExportingTxt(true);
    try {
      const exported = await resumeService.exportResumeTxt(
        resumeId,
        resume.title
      );
      triggerFileDownload(exported.blob, exported.filename);
      toast.success("ATS plain text downloaded");
    } catch (error: any) {
      toast.error(error?.message || "Failed to export TXT resume");
    } finally {
      setInternalExportingTxt(false);
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

  const activeTemplate = getTemplate(activeTemplateId);
  const ActiveTemplateComponent = activeTemplate.component;
  const themeStyles = getThemeStyles(
    resume.themeConfig,
    activeTemplate.defaultTheme
  );

  const handleFitToOnePage = useCallback((): FitToOnePageResult => {
    const pageEl = pageRef.current;
    const baseDefaults = resolveTemplateDefaultTheme(activeTemplate.defaultTheme);
    let workingTheme: ThemeConfig = {
      ...baseDefaults,
      ...(resume.themeConfig || {}),
    };

    if (!pageEl) {
      return {
        status: "already-fit",
        pageCount: 1,
        message: "Resume already fits on one page.",
      };
    }

    const applyThemeCssVars = (targetTheme: ThemeConfig) => {
      const styles = getThemeStyles(targetTheme, activeTemplate.defaultTheme);
      Object.entries(styles).forEach(([key, val]) => {
        if (key.startsWith("--") && val !== undefined) {
          pageEl.style.setProperty(key, String(val));
        }
      });
    };

    const previousMinHeight = pageEl.style.minHeight;
    let measured = 0;
    let fitted = false;
    const modifiedPatch: Partial<ThemeConfig> = {};
    const changedKeys = new Set<keyof ThemeConfig>();

    try {
      pageEl.style.minHeight = "0px";
      pageEl.style.setProperty("--theme-page-height", "0px");
      measured = measurePageContentHeight(pageEl);

      if (measured <= pageDims.heightPx + 2) {
        return {
          status: "already-fit",
          pageCount: 1,
          message: "Resume already fits on one page.",
        };
      }

      let step = 0;
      while (step < 24) {
        const nextCandidate = getNextFitThemeStep(workingTheme, step);
        if (!nextCandidate) {
          break;
        }

        if (nextCandidate.sectionSpacing !== workingTheme.sectionSpacing) {
          modifiedPatch.sectionSpacing = nextCandidate.sectionSpacing;
          changedKeys.add("sectionSpacing");
        }
        if (nextCandidate.lineHeight !== workingTheme.lineHeight) {
          modifiedPatch.lineHeight = nextCandidate.lineHeight;
          changedKeys.add("lineHeight");
        }
        if (nextCandidate.fontScale !== workingTheme.fontScale) {
          modifiedPatch.fontScale = nextCandidate.fontScale;
          changedKeys.add("fontScale");
        }

        workingTheme = nextCandidate;
        applyThemeCssVars(workingTheme);
        pageEl.style.setProperty("--theme-page-height", "0px");

        measured = measurePageContentHeight(pageEl);
        if (measured <= pageDims.heightPx + 2) {
          fitted = true;
          break;
        }

        step += 1;
      }
    } finally {
      pageEl.style.minHeight = previousMinHeight || `${pageDims.heightPx}px`;
      pageEl.style.setProperty("--theme-page-height", `${pageDims.heightPx}px`);
    }

    if (changedKeys.size > 0) {
      changedKeys.forEach((k) => customisedKeysRef.current.add(k));
      const nextThemeConfig: ThemeConfig = {
        ...(resume.themeConfig || {}),
        ...modifiedPatch,
      };
      applyThemeCssVars(nextThemeConfig);
      if (onChange) {
        onChange({
          ...resume,
          themeConfig: nextThemeConfig,
        });
      }
    }

    const updatedPageCount = fitted
      ? 1
      : calculatePageCount(measured, pageDims.heightPx);
    setPageHeight(Math.max(pageDims.heightPx, fitted ? pageDims.heightPx : measured));
    setPageCount(updatedPageCount);

    if (fitted) {
      const msg = "Adjusted spacing and typography to fit on one page.";
      toast.success(msg);
      return {
        status: "fitted",
        pageCount: 1,
        message: msg,
      };
    }

    const msg =
      "Could not fit all content onto a single page within readable minimums. Consider trimming a few bullet points.";
    toast.error(msg);
    return {
      status: "cannot-fit",
      pageCount: updatedPageCount,
      message: msg,
    };
  }, [activeTemplate.defaultTheme, onChange, pageDims.heightPx, resume]);

  const handleTemplateSelect = (nextTemplate: TemplateDefinition) => {
    const prevTemplate = getTemplate(activeTemplateId);
    const nextThemeConfig = mergeTemplateTheme(
      resume.themeConfig,
      prevTemplate.defaultTheme,
      nextTemplate.defaultTheme,
      customisedKeysRef.current
    );

    setActiveTemplateId(nextTemplate.id);
    setShowTemplateGallery(false);

    if (onChange) {
      onChange({
        ...resume,
        templateId: nextTemplate.id,
        themeConfig: nextThemeConfig,
      });
    }
  };

  const scaledWidth = Math.round(pageDims.widthPx * effectiveScale);
  const scaledHeight = Math.round(pageHeight * effectiveScale);

  return (
    <div className="flex flex-col h-full min-h-full bg-neutral-100 print:!bg-white print:!block print:!h-auto print:!min-h-0">
      <style data-testid="resume-print-page-style">
        {`@page { size: ${pageDims.cssSize}; }`}
      </style>

      {/* Dedicated Non-Overlapping Toolbar */}
      <div
        data-testid="resume-preview-toolbar"
        className="shrink-0 bg-white border-b border-neutral-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-20 print:hidden"
      >
        {/* Left: Template & Theme Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            data-testid="open-template-gallery-btn"
            onClick={() => {
              setShowTemplateGallery((prev) => !prev);
              setShowThemePanel(false);
            }}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md border transition-colors flex items-center gap-1.5 ${
              showTemplateGallery
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
            }`}
          >
            <SwatchIcon className="h-4 w-4" />
            <span>Templates</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowThemePanel((prev) => !prev);
              setShowTemplateGallery(false);
            }}
            data-testid="theme-customization-btn"
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md border transition-colors flex items-center gap-1.5 ${
              showThemePanel
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
            }`}
          >
            <PaintBrushIcon className="h-4 w-4" />
            <span>Customize Theme</span>
          </button>

          <span
            data-testid="page-count-indicator"
            aria-live="polite"
            title={`Page size: ${pageDims.name} (${pageDims.description})`}
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border tabular-nums ${
              pageCount > 1
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-neutral-100 text-neutral-700 border-neutral-200"
            }`}
          >
            {pageCount === 1 ? "1 page" : `${pageCount} pages`}
          </span>

          {resume.themeConfig?.atsMode && (
            <span
              data-testid="ats-mode-badge"
              className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
            >
              ATS Mode
            </span>
          )}
        </div>

        {/* Right: Zoom & Print Controls */}
        <div className="flex items-center gap-1.5">
          <div className="inline-flex items-center rounded-md border border-neutral-300 bg-white overflow-hidden">
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label="Zoom out"
              title="Zoom out"
              className="px-2.5 py-1.5 text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <MagnifyingGlassMinusIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleFitToWidth}
              data-testid="zoom-percentage-btn"
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
              <MagnifyingGlassPlusIcon className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleFitToWidth}
            data-testid="zoom-fit-btn"
            title="Fit page to pane width"
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              isFitMode
                ? "bg-neutral-200/80 border-neutral-300 text-neutral-900"
                : "bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
            }`}
          >
            Fit
          </button>

          <button
            type="button"
            data-testid="export-txt-btn"
            onClick={() => {
              void handleDownloadTxt();
            }}
            disabled={isTxtBusy}
            aria-busy={isTxtBusy}
            title="Download ATS plain text (.txt)"
            className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium bg-white border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
          >
            {isTxtBusy ? (
              <>
                <ArrowPathIcon
                  className="h-4 w-4 animate-spin text-blue-600"
                  aria-hidden="true"
                />
                <span>Exporting TXT…</span>
              </>
            ) : (
              <>
                <DocumentTextIcon className="h-4 w-4" aria-hidden="true" />
                <span>Download ATS text</span>
              </>
            )}
          </button>

          <button
            type="button"
            data-testid="export-pdf-btn"
            onClick={handlePrint}
            disabled={isPrinting}
            title="Print or save preview as A4 PDF"
            className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-blue-600 rounded-md shadow-sm text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
          >
            <PrinterIcon className="h-4 w-4" aria-hidden="true" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Template Gallery Modal */}
      <TemplateGalleryModal
        isOpen={showTemplateGallery}
        activeTemplateId={activeTemplate.id}
        resume={resume}
        customisedKeys={customisedKeysRef.current}
        onSelect={handleTemplateSelect}
        onClose={() => setShowTemplateGallery(false)}
      />

      {/* Relative Canvas Area (anchors ThemeCustomizationPanel below toolbar) */}
      <div className="relative flex-1 min-h-0 flex flex-col print:!block print:!min-h-0">
        {showThemePanel && (
          <ThemeCustomizationPanel
            themeConfig={resume.themeConfig}
            templateDefaultTheme={activeTemplate.defaultTheme}
            templateLayout={activeTemplate.layout}
            onFitToOnePage={handleFitToOnePage}
            onKeysCustomised={(changedKeys) => {
              changedKeys.forEach((k) => customisedKeysRef.current.add(k));
            }}
            onChange={(newTheme) => {
              if (onChange) {
                onChange({
                  ...resume,
                  themeConfig: newTheme,
                });
              }
            }}
            onReset={(resetTheme) => {
              customisedKeysRef.current.clear();
              if (onChange) {
                onChange({
                  ...resume,
                  themeConfig: resetTheme,
                });
              }
            }}
            onClose={() => setShowThemePanel(false)}
          />
        )}

        {/* Scrollable Neutral Viewport observed by ResizeObserver */}
        <div
          ref={viewportRef}
          data-testid="resume-preview-viewport"
          className="flex-1 overflow-auto p-4 sm:p-6 bg-neutral-100 print:!p-0 print:!m-0 print:!bg-white print:!overflow-visible"
          style={{ scrollbarGutter: "stable" }}
        >
          {/* Centered Sizing Box matching scaled page dimensions */}
          <div
            data-testid="resume-preview-scaler"
            className="mx-auto print:!w-full print:!h-auto print:!m-0"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
            }}
          >
            {/* Sheet (page root carrying theme CSS variables) */}
            <div
              ref={pageRef}
              data-testid="resume-preview-page"
              data-page-size={pageDims.id}
              data-ats-mode={resume.themeConfig?.atsMode ? "true" : "false"}
              className="relative bg-white shadow-md ring-1 ring-black/5 rounded-[2px] origin-top-left print:!w-full print:!min-h-0 print:!transform-none print:!shadow-none print:!ring-0 print:!rounded-none"
              style={{
                width: `${pageDims.widthPx}px`,
                minHeight: `${pageDims.heightPx}px`,
                transform: `scale(${effectiveScale})`,
                transformOrigin: "top left",
                ...themeStyles,
              }}
            >
              <motion.div
                key={activeTemplate.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="min-h-full print:!opacity-100 print:!transform-none"
              >
                <ActiveTemplateComponent
                  resume={resume}
                  onChange={readOnly ? undefined : onChange}
                  readOnly={readOnly}
                />
              </motion.div>

              {pageCount > 1 && (
                <div
                  aria-hidden="true"
                  data-testid="page-break-overlay"
                  className="pointer-events-none absolute inset-0 overflow-hidden z-20 print:hidden"
                >
                  {Array.from({ length: pageCount - 1 }, (_, idx) => {
                    const breakNumber = idx + 1;
                    const topPx = breakNumber * pageDims.heightPx;
                    return (
                      <div
                        key={breakNumber}
                        data-testid="page-break-marker"
                        data-page-break={breakNumber}
                        style={{ top: `${topPx}px` }}
                        className="absolute left-0 right-0 flex items-center"
                      >
                        <div className="w-full border-t-2 border-dashed border-amber-500/80" />
                        <span className="absolute right-3 -top-2.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-[10px] font-semibold uppercase tracking-wider text-amber-800 shadow-sm">
                          Page {breakNumber + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumePreview;
