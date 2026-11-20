import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { IResume, ThemeConfig } from "../types/resume";
import {
  ArrowPathIcon,
  ArrowsPointingInIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  SwatchIcon,
  PaintBrushIcon,
  PrinterIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { ThemeCustomizationPanel } from "./ThemeCustomizationPanel";
import { getThemeStyles } from "../constants/themeConstants";
import { resumeService } from "../services/resume.service";
import { triggerFileDownload } from "../utils/download";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  A4PageCountBadge,
  A4PageGuidesOverlay,
  computePageCount,
  isShortPageOverflow,
  useA4SheetHeight,
} from "./common/A4PageGuides";
import { runDomThemeAutoFit } from "../utils/themeAutoFit";
import {
  getTemplate,
  mergeTemplateTheme,
  TemplateDefinition,
} from "./templates/registry";
import { TemplateGalleryModal } from "./templates/TemplateGalleryModal";

export { A4_WIDTH_PX, A4_HEIGHT_PX };

interface ResumePreviewProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
  readOnly?: boolean;
  onDownloadPdf?: () => void;
  isPrinting?: boolean;
  onExportTxt?: () => Promise<void> | void;
  isExportingTxt?: boolean;
}

function computeFitScale(availableWidth: number): number {
  if (!availableWidth || availableWidth <= 0) {
    return 1;
  }
  const raw = (availableWidth - 2) / A4_WIDTH_PX;
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
  const [fitScale, setFitScale] = useState<number>(1);
  const [manualScale, setManualScale] = useState<number | null>(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [internalExportingTxt, setInternalExportingTxt] =
    useState<boolean>(false);
  const [isAutoFitting, setIsAutoFitting] = useState<boolean>(false);
  const [manualTrimNotice, setManualTrimNotice] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const isSolvingRef = useRef<boolean>(false);
  const customisedKeysRef = useRef<Set<keyof ThemeConfig>>(new Set());
  const autoFitUndoTrackerRef = useRef<{
    previousTheme: ThemeConfig | undefined;
    appliedTheme: ThemeConfig | undefined;
    addedKeys: Array<keyof ThemeConfig>;
  } | null>(null);

  const pageHeight = useA4SheetHeight(
    pageRef,
    [activeTemplateId, resume],
    true,
    isSolvingRef
  );
  const pageCount = computePageCount(pageHeight);
  const hasShortOverflow = !readOnly && isShortPageOverflow(pageHeight);

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
      setFitScale(computeFitScale(initialWidth));
    }

    if (typeof ResizeObserver === "undefined") {
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

  // Clear manual-trim notice automatically once the sheet fits on 1 page or Undo reverts auto-fit
  useEffect(() => {
    if (pageCount <= 1 && manualTrimNotice) {
      setManualTrimNotice(null);
    }
  }, [pageCount, manualTrimNotice]);

  useEffect(() => {
    const tracker = autoFitUndoTrackerRef.current;
    if (
      tracker &&
      resume.themeConfig !== tracker.appliedTheme &&
      resume.themeConfig === tracker.previousTheme
    ) {
      tracker.addedKeys.forEach((key) => customisedKeysRef.current.delete(key));
      autoFitUndoTrackerRef.current = null;
      setManualTrimNotice(null);
    }
  }, [resume.themeConfig]);

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
    setManualTrimNotice(null);

    if (onChange) {
      onChange({
        ...resume,
        templateId: nextTemplate.id,
        themeConfig: nextThemeConfig,
      });
    }
  };

  const handleFitToOnePage = async () => {
    if (readOnly || isAutoFitting) return;
    const pageEl = pageRef.current;
    if (!pageEl) return;

    setIsAutoFitting(true);
    isSolvingRef.current = true;

    try {
      const result = await runDomThemeAutoFit({
        pageEl,
        currentTheme: resume.themeConfig,
        templateDefaults: activeTemplate.defaultTheme,
        targetHeight: A4_HEIGHT_PX,
      });

      if (result.alreadyFit) {
        setManualTrimNotice(null);
        toast.success("Resume already fits on 1 A4 page");
        return;
      }

      const newlyAddedKeys = result.changedKeys.filter(
        (key) => !customisedKeysRef.current.has(key)
      );
      result.changedKeys.forEach((key) => customisedKeysRef.current.add(key));

      if (result.changedKeys.length > 0 && onChange) {
        autoFitUndoTrackerRef.current = {
          previousTheme: resume.themeConfig,
          appliedTheme: result.themeConfig,
          addedKeys: newlyAddedKeys,
        };
        onChange({
          ...resume,
          themeConfig: result.themeConfig,
        });
      }

      if (result.fitted) {
        setManualTrimNotice(null);
        toast.success("Adjusted theme density to fit on 1 A4 page");
      } else {
        const trimMsg =
          "Minimum readable theme spacing and font size (85%) applied, but your resume still exceeds 1 A4 page. Please trim bullet text or hide optional entries manually.";
        setManualTrimNotice(trimMsg);
        toast(trimMsg, { icon: "⚠️" });
      }
    } finally {
      isSolvingRef.current = false;
      setIsAutoFitting(false);
    }
  };

  const scaledWidth = Math.round(A4_WIDTH_PX * effectiveScale);
  const scaledHeight = Math.round(pageHeight * effectiveScale);

  return (
    <div className="flex flex-col h-full min-h-full bg-neutral-100 print:!bg-white print:!block print:!h-auto print:!min-h-0">
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

          <A4PageCountBadge pageCount={pageCount} />

          {!readOnly && pageCount > 1 && (
            <button
              type="button"
              data-testid="toolbar-fit-to-one-page-btn"
              disabled={isAutoFitting}
              onClick={() => {
                void handleFitToOnePage();
              }}
              title="Automatically tighten margins, spacing, line height, and font scale to fit 1 A4 page"
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-60 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowsPointingInIcon className="h-4 w-4 text-amber-700 shrink-0" />
              <span>{isAutoFitting ? "Fitting…" : "Fit to 1 page"}</span>
            </button>
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

      {/* Short Page-2 Spillover Alert (<= 20% above 1123px) */}
      {hasShortOverflow && !manualTrimNotice && (
        <div
          role="status"
          data-testid="short-overflow-alert"
          className="shrink-0 bg-amber-50 border-b border-amber-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 print:hidden"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ExclamationTriangleIcon
              className="h-4 w-4 text-amber-600 shrink-0"
              aria-hidden="true"
            />
            <span>
              Your resume spills slightly onto page 2 (
              {Math.max(
                1,
                Math.round(((pageHeight - A4_HEIGHT_PX) / A4_HEIGHT_PX) * 100)
              )}
              % over 1 A4 page). Auto-fit can tighten spacing and typography cleanly.
            </span>
          </div>
          <button
            type="button"
            data-testid="alert-fit-to-one-page-btn"
            disabled={isAutoFitting}
            onClick={() => {
              void handleFitToOnePage();
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium shadow-xs disabled:opacity-60 transition-colors"
          >
            <ArrowsPointingInIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isAutoFitting ? "Fitting…" : "Fit to 1 page"}</span>
          </button>
        </div>
      )}

      {/* Manual Trim Guidance when readable theme floor cannot fit 1 A4 page */}
      {!readOnly && manualTrimNotice && (
        <div
          role="alert"
          data-testid="autofit-manual-trim-notice"
          className="shrink-0 bg-amber-50 border-b border-amber-300 px-3 sm:px-4 py-2 flex items-start justify-between gap-3 text-xs text-amber-950 print:hidden"
        >
          <div className="flex items-start gap-2 min-w-0">
            <ExclamationTriangleIcon
              className="h-4 w-4 text-amber-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{manualTrimNotice}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss auto-fit notice"
            onClick={() => setManualTrimNotice(null)}
            className="shrink-0 p-0.5 rounded text-amber-700 hover:text-amber-950 hover:bg-amber-100 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

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
            pageCount={pageCount}
            isAutoFitting={isAutoFitting}
            autoFitNotice={manualTrimNotice}
            onFitToOnePage={handleFitToOnePage}
            onKeysCustomised={(changedKeys) => {
              changedKeys.forEach((k) => customisedKeysRef.current.add(k));
            }}
            onChange={(newTheme) => {
              setManualTrimNotice(null);
              if (onChange) {
                onChange({
                  ...resume,
                  themeConfig: newTheme,
                });
              }
            }}
            onReset={(resetTheme) => {
              customisedKeysRef.current.clear();
              autoFitUndoTrackerRef.current = null;
              setManualTrimNotice(null);
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
          {/* Centered Sizing Box matching scaled A4 dimensions */}
          <div
            data-testid="resume-preview-scaler"
            className="mx-auto print:!w-full print:!h-auto print:!m-0"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
            }}
          >
            {/* A4 Sheet (page root carrying theme CSS variables) */}
            <div
              ref={pageRef}
              data-testid="resume-preview-page"
              className="relative bg-white shadow-md ring-1 ring-black/5 rounded-[2px] origin-top-left print:!w-full print:!min-h-0 print:!transform-none print:!shadow-none print:!ring-0 print:!rounded-none"
              style={{
                width: `${A4_WIDTH_PX}px`,
                minHeight: `${A4_HEIGHT_PX}px`,
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
              <A4PageGuidesOverlay pageHeight={pageHeight} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumePreview;
