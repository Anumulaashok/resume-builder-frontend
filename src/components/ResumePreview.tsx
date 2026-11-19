import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { IResume, ThemeConfig } from "../types/resume";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  SwatchIcon,
  PaintBrushIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { ThemeCustomizationPanel } from "./ThemeCustomizationPanel";
import { getThemeStyles } from "../constants/themeConstants";
import { resumeService } from "../services/resume.service";
import { triggerFileDownload } from "../utils/download";
import {
  getTemplate,
  mergeTemplateTheme,
  TemplateDefinition,
} from "./templates/registry";
import { TemplateGalleryModal } from "./templates/TemplateGalleryModal";

export type ExportFormat = "pdf" | "txt";

interface ResumePreviewProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
  readOnly?: boolean;
  onExport?: (format: ExportFormat) => Promise<void> | void;
  exportingFormat?: ExportFormat | null;
}

export const A4_WIDTH_PX = 794; // 21cm at 96dpi
export const A4_HEIGHT_PX = 1123; // 29.7cm at 96dpi

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
  onExport,
  exportingFormat,
}) => {
  const externalTemplateId =
    resume.templateId || (resume as any).template;
  const [activeTemplateId, setActiveTemplateId] = useState(
    getTemplate(externalTemplateId).id
  );
  const [fitScale, setFitScale] = useState<number>(1);
  const [manualScale, setManualScale] = useState<number | null>(null);
  const [pageHeight, setPageHeight] = useState<number>(A4_HEIGHT_PX);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [internalExporting, setInternalExporting] =
    useState<ExportFormat | null>(null);

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

  // Track unscaled page height so the scaled wrapper reserves exact vertical scroll space
  useEffect(() => {
    const pageEl = pageRef.current;
    if (!pageEl) return;

    const syncHeight = () => {
      const h = Math.max(A4_HEIGHT_PX, pageEl.offsetHeight || 0);
      setPageHeight(h);
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
  }, [activeTemplateId, resume]);

  const effectiveScale = manualScale ?? fitScale;
  const isFitMode = manualScale === null;
  const activeExportFormat =
    exportingFormat !== undefined ? exportingFormat : internalExporting;
  const isExportBusy = Boolean(activeExportFormat);

  const handleExportFormat = async (format: ExportFormat) => {
    if (isExportBusy) return;

    if (onExport) {
      await onExport(format);
      return;
    }

    const resumeId = resume._id || (resume as { id?: string }).id;
    if (!resumeId) {
      toast.error("Please save your resume before exporting");
      return;
    }

    setInternalExporting(format);
    try {
      const exported =
        format === "pdf"
          ? await resumeService.exportResumePdf(resumeId, resume.title)
          : await resumeService.exportResumeTxt(resumeId, resume.title);
      triggerFileDownload(exported.blob, exported.filename);
      toast.success(
        format === "pdf"
          ? "PDF resume downloaded"
          : "ATS plain text downloaded"
      );
    } catch (error: any) {
      toast.error(
        error?.message || `Failed to export ${format.toUpperCase()} resume`
      );
    } finally {
      setInternalExporting(null);
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

    if (onChange) {
      onChange({
        ...resume,
        templateId: nextTemplate.id,
        themeConfig: nextThemeConfig,
      });
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
              void handleExportFormat("txt");
            }}
            disabled={isExportBusy}
            aria-busy={activeExportFormat === "txt"}
            title="Download ATS-safe plain text (.txt)"
            className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium bg-white border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
          >
            {activeExportFormat === "txt" ? (
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
                <span>ATS Text</span>
              </>
            )}
          </button>

          <button
            type="button"
            data-testid="export-pdf-btn"
            onClick={() => {
              void handleExportFormat("pdf");
            }}
            disabled={isExportBusy}
            aria-busy={activeExportFormat === "pdf"}
            title="Download vector PDF (.pdf)"
            className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-blue-600 rounded-md shadow-sm text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
          >
            {activeExportFormat === "pdf" ? (
              <>
                <ArrowPathIcon
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                <span>Exporting PDF…</span>
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Template Gallery Modal */}
      <TemplateGalleryModal
        isOpen={showTemplateGallery}
        activeTemplateId={activeTemplate.id}
        resume={resume}
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
              className="bg-white shadow-md ring-1 ring-black/5 rounded-[2px] origin-top-left print:!w-full print:!min-h-0 print:!transform-none print:!shadow-none print:!ring-0 print:!rounded-none"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumePreview;
