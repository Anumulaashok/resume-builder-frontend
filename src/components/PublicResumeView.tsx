import React, { useState, useEffect, useRef } from "react";
import { resumeService } from "../services/resume.service";
import { IResume } from "../types/resume";
import { A4_WIDTH_PX, A4_HEIGHT_PX } from "./ResumePreview";
import { getTemplate } from "./templates/registry";
import { getThemeStyles } from "../constants/themeConstants";
import { Container } from "./ui/container";
import { Skeleton } from "./ui/skeleton";
import {
  ClockIcon,
  DocumentTextIcon,
  HomeIcon,
  LinkSlashIcon,
  LockClosedIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";

interface PublicResumeViewProps {
  shareToken?: string;
  token?: string;
  slug?: string;
}

const DEFAULT_ERROR_MESSAGE =
  "This shared resume link is invalid, has expired, or has been revoked by the owner.";

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

interface ErrorPresentation {
  title: string;
  message: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badgeClassName: string;
}

function resolveErrorPresentation(error: string | null): ErrorPresentation {
  const trimmed = (error || "").trim();
  const isDefaultMessage = !trimmed || trimmed === DEFAULT_ERROR_MESSAGE;
  const isGenericHttpError =
    /^(request failed|network error|failed to fetch)/i.test(trimmed);
  const mentionsNotFound = /\bnot found\b/i.test(trimmed);

  if (!isDefaultMessage && !mentionsNotFound) {
    if (/\bexpired\b/i.test(trimmed)) {
      return {
        title: "Link Expired",
        message: trimmed,
        Icon: ClockIcon,
        badgeClassName:
          "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200/80",
      };
    }

    if (
      /\b(private|disabled|revoked|restricted|forbidden|inactive)\b/i.test(
        trimmed
      )
    ) {
      return {
        title: "Resume Is Private",
        message: trimmed,
        Icon: LockClosedIcon,
        badgeClassName:
          "bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-neutral-200",
      };
    }
  }

  return {
    title: "Resume Unavailable",
    message:
      isDefaultMessage || isGenericHttpError || mentionsNotFound
        ? DEFAULT_ERROR_MESSAGE
        : trimmed,
    Icon: LinkSlashIcon,
    badgeClassName:
      "bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100",
  };
}

const TopBar: React.FC<{
  onPrint?: () => void;
  showSkeletonAction?: boolean;
}> = ({ onPrint, showSkeletonAction = false }) => (
  <header
    data-testid="public-resume-topbar"
    className="sticky top-0 z-20 shrink-0 bg-white/95 backdrop-blur-sm border-b border-neutral-200/80 shadow-header print:hidden"
  >
    <Container>
      <div className="flex items-center justify-between gap-2 sm:gap-3 h-14 sm:h-16">
        <a
          href="/"
          className="inline-flex items-center gap-2 sm:gap-2.5 min-w-0 rounded-control px-1.5 py-1 -ml-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 transition-colors focus-ring"
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100">
            <DocumentTextIcon
              className="h-4 w-4 sm:h-5 sm:w-5"
              aria-hidden="true"
            />
          </span>
          <span className="text-xs sm:text-sm font-semibold tracking-tight text-neutral-800 truncate">
            Made with Smart CV &amp; Portfolio
          </span>
        </a>

        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            data-testid="public-resume-print-btn"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-control bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-medium shadow-sm transition-colors focus-ring shrink-0"
          >
            <PrinterIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Print / Download</span>
          </button>
        )}

        {showSkeletonAction && (
          <Skeleton className="h-9 w-28 sm:w-36 rounded-control shrink-0" />
        )}
      </div>
    </Container>
  </header>
);

export const PublicResumeView: React.FC<PublicResumeViewProps> = ({
  shareToken: propShareToken,
  token,
  slug,
}) => {
  const activeToken = propShareToken || token || "";
  const activeSlug = (slug || "").trim().toLowerCase();
  const [resume, setResume] = useState<IResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fitScale, setFitScale] = useState<number>(1);
  const [pageHeight, setPageHeight] = useState<number>(A4_HEIGHT_PX);

  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    if (!activeSlug && !activeToken) {
      setLoading(false);
      setError("This shared resume link is invalid, has expired, or has been revoked by the owner.");
      return;
    }

    const requestPromise = activeSlug
      ? resumeService.getPublicResumeBySlug(activeSlug)
      : resumeService.getPublicResume(activeToken);

    requestPromise
      .then((data) => {
        if (isMounted) {
          if (data) {
            setResume(data);
          } else {
            setError(
              "This shared resume link is invalid, has expired, or has been revoked by the owner."
            );
          }
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(
            err?.message ||
              "This shared resume link is invalid, has expired, or has been revoked by the owner."
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeSlug, activeToken]);

  const hasResume = !loading && !error && Boolean(resume);
  const rawTemplateId =
    resume?.templateId ||
    (resume as { template?: string } | null)?.template ||
    "modern";
  const normalizedTemplateId = String(rawTemplateId).trim().toLowerCase();

  // Fit-to-width scaling via ResizeObserver on the canvas viewport
  useEffect(() => {
    if (!hasResume) return;
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
  }, [hasResume]);

  // Track unscaled page height so the scaled wrapper reserves exact vertical scroll space
  useEffect(() => {
    if (!hasResume) return;
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
  }, [hasResume, normalizedTemplateId, resume]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading shared resume"
        className="min-h-screen bg-neutral-100 flex flex-col"
        data-testid="public-resume-loading"
      >
        <span className="sr-only">Loading resume...</span>
        <TopBar showSkeletonAction />
        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-8">
          <div className="max-w-[794px] w-full mx-auto bg-white rounded-[2px] shadow-card ring-1 ring-neutral-900/5 p-6 sm:p-10 space-y-6">
            <div className="space-y-3 pb-5 border-b border-neutral-100">
              <Skeleton className="h-7 w-48 sm:w-64" />
              <Skeleton className="h-4 w-36 sm:w-44" />
              <div className="flex flex-wrap gap-3 pt-1">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>

            <div className="space-y-2.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-4/5" />
            </div>

            <div className="space-y-4 pt-2">
              <Skeleton className="h-4 w-36" />
              {[0, 1].map((idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <Skeleton className="h-4 w-44 sm:w-56" />
                    <Skeleton className="h-3 w-20 shrink-0" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <Skeleton className="h-4 w-24" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !resume) {
    const { title, message, Icon, badgeClassName } =
      resolveErrorPresentation(error);

    return (
      <div
        className="min-h-screen bg-neutral-100 flex flex-col"
        data-testid="public-resume-error"
      >
        <TopBar />
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full bg-white border border-neutral-200/90 rounded-panel p-6 sm:p-8 text-center shadow-card">
            <div
              className={`w-14 h-14 rounded-card flex items-center justify-center mx-auto mb-4 ${badgeClassName}`}
            >
              <Icon className="w-7 h-7" aria-hidden="true" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-neutral-900 mb-2">
              {title}
            </h1>
            <p className="text-sm text-neutral-600 mb-2 leading-relaxed">
              {message}
            </p>
            <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
              Check that you have the complete URL, or ask the owner for an
              updated share link.
            </p>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-primary-600 hover:bg-primary-700 text-white rounded-control text-sm font-medium transition-colors shadow-sm focus-ring"
            >
              <HomeIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Go to Home</span>
            </a>
          </div>
        </main>
      </div>
    );
  }

  const activeTemplate = getTemplate(normalizedTemplateId);
  const ActiveTemplateComponent = activeTemplate.component;
  const themeStyles = getThemeStyles(
    resume.themeConfig,
    activeTemplate.defaultTheme
  );
  const scaledWidth = Math.round(A4_WIDTH_PX * fitScale);
  const scaledHeight = Math.round(pageHeight * fitScale);

  return (
    <div
      className="min-h-screen bg-neutral-100 flex flex-col print:!bg-white print:!block print:!min-h-0"
      data-testid="public-resume-view"
    >
      <TopBar onPrint={handlePrint} />

      {/* Centred Neutral Canvas with Fit-to-Width Scaling */}
      <main
        ref={viewportRef}
        data-testid="resume-preview-viewport"
        className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-6 sm:py-8 bg-neutral-100 print:!p-0 print:!m-0 print:!bg-white print:!overflow-visible"
        style={{ scrollbarGutter: "stable" }}
      >
        <div
          data-testid="resume-preview-scaler"
          className="mx-auto print:!w-full print:!h-auto print:!m-0"
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
          }}
        >
          <div
            ref={pageRef}
            data-testid="resume-preview-page"
            className="bg-white shadow-card ring-1 ring-neutral-900/5 rounded-[2px] origin-top-left print:!w-full print:!min-h-0 print:!transform-none print:!shadow-none print:!ring-0 print:!rounded-none"
            style={{
              width: `${A4_WIDTH_PX}px`,
              minHeight: `${A4_HEIGHT_PX}px`,
              transform: `scale(${fitScale})`,
              transformOrigin: "top left",
            }}
          >
            <div className="min-h-full" style={themeStyles}>
              <ActiveTemplateComponent resume={resume} readOnly={true} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublicResumeView;
