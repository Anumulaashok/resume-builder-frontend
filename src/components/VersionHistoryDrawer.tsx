import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  EyeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  IResume,
  IResumeHistorySnapshot,
  IResumeHistorySummaryItem,
} from "../types/resume";
import { resumeService } from "../services/resume.service";
import { defaultResume } from "../constants/editorConstants";
import { getThemeStyles } from "../constants/themeConstants";
import { getTemplate } from "./templates/registry";
import { A4_HEIGHT_PX, A4_WIDTH_PX } from "./ResumePreview";
import { Skeleton } from "./ui/skeleton";
import { formatRelativeTime, formatSnapshotTimestamp } from "../utils/date";
import { normalizeResume } from "../utils/resumeNormalizer";

export interface VersionHistoryDrawerProps {
  isOpen: boolean;
  resumeId?: string;
  currentResume: IResume;
  onClose: () => void;
  onRestoreVersion: (index: number) => Promise<void>;
}

function computeFitScale(availableWidth: number): number {
  if (!availableWidth || availableWidth <= 0) {
    return 0.55;
  }
  const raw = (availableWidth - 4) / A4_WIDTH_PX;
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

export function buildSnapshotPreviewResume(
  snapshot: IResumeHistorySnapshot,
  currentResume: IResume
): IResume {
  const currentTemplateId =
    currentResume.templateId || (currentResume as any).template;

  // Snapshots often persist `content` without top-level `summary` while the
  // Professional Summary lives in top-level `currentResume.summary`.
  const fallbackTopSummary =
    snapshot.summary !== undefined
      ? snapshot.summary
      : currentResume.summary ?? currentResume.content?.basics?.summary;

  return normalizeResume({
    ...defaultResume,
    title: snapshot.title || currentResume.title || "Untitled Resume",
    summary: fallbackTopSummary,
    templateId: currentTemplateId,
    themeConfig: snapshot.themeConfig ?? currentResume.themeConfig,
    content: snapshot.content || defaultResume.content,
  });
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  isOpen,
  resumeId,
  currentResume,
  onClose,
  onRestoreVersion,
}) => {
  const [versions, setVersions] = useState<IResumeHistorySummaryItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeSnapshot, setActiveSnapshot] =
    useState<IResumeHistorySnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [fitScale, setFitScale] = useState<number>(0.55);
  const [pageHeight, setPageHeight] = useState<number>(A4_HEIGHT_PX);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const versionItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const previewPageRef = useRef<HTMLDivElement>(null);
  const snapshotCacheRef = useRef<Map<number, IResumeHistorySnapshot>>(
    new Map()
  );

  const fetchHistoryList = useCallback(async () => {
    if (!resumeId) {
      setVersions([]);
      setSelectedIndex(null);
      setActiveSnapshot(null);
      setListLoading(false);
      setListError(null);
      return;
    }

    setListLoading(true);
    setListError(null);
    snapshotCacheRef.current.clear();

    try {
      const items = await resumeService.getResumeHistory(resumeId);
      setVersions(items);
      if (items.length > 0) {
        setSelectedIndex(items[0].index);
      } else {
        setSelectedIndex(null);
        setActiveSnapshot(null);
      }
    } catch (err: any) {
      setListError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load version history."
      );
      setVersions([]);
      setSelectedIndex(null);
      setActiveSnapshot(null);
    } finally {
      setListLoading(false);
    }
  }, [resumeId]);

  const fetchSnapshot = useCallback(
    async (index: number, forceRefresh = false) => {
      if (!resumeId) return;

      if (!forceRefresh && snapshotCacheRef.current.has(index)) {
        setActiveSnapshot(snapshotCacheRef.current.get(index) || null);
        setSnapshotError(null);
        setSnapshotLoading(false);
        return;
      }

      setSnapshotLoading(true);
      setSnapshotError(null);

      try {
        const snap = await resumeService.getResumeHistorySnapshot(
          resumeId,
          index
        );
        snapshotCacheRef.current.set(index, snap);
        setActiveSnapshot(snap);
      } catch (err: any) {
        setSnapshotError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load snapshot preview."
        );
        setActiveSnapshot(null);
      } finally {
        setSnapshotLoading(false);
      }
    },
    [resumeId]
  );

  useEffect(() => {
    if (!isOpen) {
      setShowConfirmDialog(false);
      setRestoring(false);
      return;
    }

    void fetchHistoryList();
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 20);
    return () => clearTimeout(timer);
  }, [isOpen, fetchHistoryList]);

  useEffect(() => {
    if (!isOpen || !resumeId || selectedIndex === null) {
      return;
    }
    void fetchSnapshot(selectedIndex);
  }, [isOpen, resumeId, selectedIndex, fetchSnapshot]);

  useEffect(() => {
    if (showConfirmDialog) {
      const timer = setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [showConfirmDialog]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (restoring) return;
        if (showConfirmDialog) {
          setShowConfirmDialog(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, showConfirmDialog, restoring, onClose]);

  // Fit-to-width scaling for the read-only preview pane
  useEffect(() => {
    if (!isOpen || !activeSnapshot) return;
    const viewport = previewViewportRef.current;
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
  }, [isOpen, activeSnapshot]);

  // Sync rendered A4 page height so scaled container matches height
  useEffect(() => {
    if (!isOpen || !activeSnapshot) return;
    const pageEl = previewPageRef.current;
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
  }, [isOpen, activeSnapshot, currentResume.templateId]);

  const selectedSummaryItem = useMemo(
    () => versions.find((v) => v.index === selectedIndex) || null,
    [versions, selectedIndex]
  );

  const currentTemplateId =
    currentResume.templateId || (currentResume as any).template;
  const activeTemplate = getTemplate(currentTemplateId);
  const ActiveTemplateComponent = activeTemplate.component;

  const previewResume = useMemo(
    () =>
      activeSnapshot
        ? buildSnapshotPreviewResume(activeSnapshot, currentResume)
        : null,
    [activeSnapshot, currentResume]
  );

  const themeStyles = useMemo(
    () =>
      getThemeStyles(
        previewResume?.themeConfig ?? currentResume.themeConfig,
        activeTemplate.defaultTheme
      ),
    [previewResume, currentResume.themeConfig, activeTemplate.defaultTheme]
  );

  if (!isOpen) {
    return null;
  }

  const handleVersionKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    listPos: number
  ) => {
    if (versions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextPos = (listPos + 1) % versions.length;
      setSelectedIndex(versions[nextPos].index);
      versionItemRefs.current[nextPos]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prevPos = (listPos - 1 + versions.length) % versions.length;
      setSelectedIndex(versions[prevPos].index);
      versionItemRefs.current[prevPos]?.focus();
    }
  };

  const handleConfirmRestore = async () => {
    if (selectedIndex === null || restoring) return;
    setRestoring(true);
    try {
      await onRestoreVersion(selectedIndex);
      setShowConfirmDialog(false);
    } catch {
      // Error toast is handled by caller; keep dialog state interactive
    } finally {
      setRestoring(false);
    }
  };

  const scaledWidth = Math.round(A4_WIDTH_PX * fitScale);
  const scaledHeight = Math.round(pageHeight * fitScale);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end print:hidden"
      data-testid="version-history-drawer-root"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
        onClick={() => {
          if (!restoring && !showConfirmDialog) {
            onClose();
          }
        }}
      />

      {/* Side Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-history-drawer-title"
        data-testid="version-history-drawer"
        className="relative z-10 w-full max-w-5xl h-full bg-white shadow-modal border-l border-neutral-200 flex flex-col overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-neutral-200 bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100">
              <ClockIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="version-history-drawer-title"
                  className="text-base sm:text-lg font-semibold text-neutral-900 truncate"
                >
                  Version history
                </h2>
                {!listLoading && versions.length > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 shrink-0">
                    {versions.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 truncate">
                Select a saved snapshot to preview or restore
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={restoring}
            aria-label="Close version history"
            data-testid="close-version-history-btn"
            className="p-2 rounded-control text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors focus-ring shrink-0"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Body */}
        {!resumeId ? (
          <div
            data-testid="version-history-unsaved-empty"
            className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-neutral-50"
          >
            <div className="h-12 w-12 rounded-card bg-neutral-100 text-neutral-500 flex items-center justify-center mb-3">
              <DocumentTextIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-neutral-900 mb-1">
              Save your resume to start version history
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-sm">
              Once saved, snapshots are automatically captured as you make
              substantial updates or edit over time.
            </p>
          </div>
        ) : listLoading ? (
          <div
            role="status"
            aria-label="Loading version history"
            data-testid="version-history-loading"
            className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden"
          >
            <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-neutral-200 p-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="p-3 rounded-control border border-neutral-200 space-y-2"
                >
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
            <div className="flex-1 p-4 sm:p-6 bg-neutral-100 flex items-start justify-center overflow-hidden">
              <div className="w-full max-w-lg bg-white rounded-card p-6 shadow-card space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </div>
        ) : listError ? (
          <div
            role="alert"
            data-testid="version-history-error"
            className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-neutral-50"
          >
            <div className="h-12 w-12 rounded-card bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <ExclamationCircleIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-neutral-900 mb-1">
              Couldn&apos;t load version history
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-sm mb-4">
              {listError}
            </p>
            <button
              type="button"
              onClick={() => void fetchHistoryList()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-control bg-white border border-neutral-300 text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus-ring"
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
              <span>Try again</span>
            </button>
          </div>
        ) : versions.length === 0 ? (
          <div
            data-testid="version-history-empty"
            className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-neutral-50"
          >
            <div className="h-12 w-12 rounded-card bg-neutral-100 text-neutral-500 flex items-center justify-center mb-3">
              <ClockIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-neutral-900 mb-1">
              No saved versions yet
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-sm">
              Earlier snapshots will appear here automatically as you edit your
              resume over time or make major changes.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* Version Timeline List */}
            <aside
              aria-label="Saved resume versions"
              className="w-full md:w-80 shrink-0 max-h-52 md:max-h-none overflow-y-auto border-b md:border-b-0 md:border-r border-neutral-200 bg-neutral-50/60 p-3 space-y-2"
            >
              {versions.map((item, listPos) => {
                const isSelected = item.index === selectedIndex;
                const relativeLabel = formatRelativeTime(item.updatedAt);
                const fullTimestamp = formatSnapshotTimestamp(item.updatedAt);

                return (
                  <button
                    key={item.index}
                    ref={(el) => {
                      versionItemRefs.current[listPos] = el;
                    }}
                    type="button"
                    data-testid={`version-history-item-${item.index}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedIndex(item.index)}
                    onKeyDown={(e) => handleVersionKeyDown(e, listPos)}
                    className={`w-full text-left p-3 rounded-control border transition-colors focus-ring ${
                      isSelected
                        ? "bg-primary-50/90 border-primary-300 ring-1 ring-inset ring-primary-200 shadow-xs"
                        : "bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        title={fullTimestamp}
                        className={`text-xs font-semibold ${
                          isSelected ? "text-primary-700" : "text-neutral-900"
                        }`}
                      >
                        {relativeLabel}
                      </span>
                      {listPos === 0 && (
                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-neutral-200/80 text-neutral-700 shrink-0">
                          Latest snapshot
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-neutral-800 truncate mt-1">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-snug">
                      {item.summary}
                    </p>
                  </button>
                );
              })}
            </aside>

            {/* Right Pane: Selected Version Actions + Read-Only Template Preview */}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-neutral-100 overflow-hidden">
              {/* Selected Version Action Bar */}
              <div className="shrink-0 bg-white border-b border-neutral-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                      <EyeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Read-only preview</span>
                    </span>
                    <span
                      data-testid="version-preview-template-badge"
                      className="text-xs text-neutral-500"
                    >
                      Template: {activeTemplate.name}
                    </span>
                  </div>
                  {selectedSummaryItem && (
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      Saved {formatRelativeTime(selectedSummaryItem.updatedAt)}
                      {formatSnapshotTimestamp(selectedSummaryItem.updatedAt)
                        ? ` · ${formatSnapshotTimestamp(
                            selectedSummaryItem.updatedAt
                          )}`
                        : ""}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  data-testid="restore-version-btn"
                  disabled={
                    selectedIndex === null ||
                    snapshotLoading ||
                    Boolean(snapshotError) ||
                    restoring
                  }
                  onClick={() => setShowConfirmDialog(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-control bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-medium shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-colors focus-ring shrink-0"
                >
                  <ArrowUturnLeftIcon className="h-4 w-4" aria-hidden="true" />
                  <span>Restore this version</span>
                </button>
              </div>

              {/* Read-Only Preview Viewport */}
              <div
                ref={previewViewportRef}
                data-testid="version-history-preview-viewport"
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6"
              >
                {snapshotLoading ? (
                  <div
                    role="status"
                    aria-label="Loading version preview"
                    data-testid="version-snapshot-loading"
                    className="max-w-lg mx-auto bg-white rounded-card p-6 shadow-card space-y-4"
                  >
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-11/12" />
                    <Skeleton className="h-28 w-full" />
                  </div>
                ) : snapshotError ? (
                  <div
                    role="alert"
                    data-testid="version-snapshot-error"
                    className="max-w-md mx-auto bg-white rounded-card border border-neutral-200 p-6 text-center shadow-card"
                  >
                    <p className="text-sm font-medium text-neutral-900 mb-1">
                      Failed to load snapshot preview
                    </p>
                    <p className="text-xs text-neutral-600 mb-4">
                      {snapshotError}
                    </p>
                    {selectedIndex !== null && (
                      <button
                        type="button"
                        onClick={() => void fetchSnapshot(selectedIndex, true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-white border border-neutral-300 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus-ring"
                      >
                        <ArrowPathIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Retry</span>
                      </button>
                    )}
                  </div>
                ) : previewResume ? (
                  <div
                    className="mx-auto"
                    style={{
                      width: `${scaledWidth}px`,
                      height: `${scaledHeight}px`,
                    }}
                  >
                    <div
                      ref={previewPageRef}
                      data-testid="version-history-preview-page"
                      data-template-id={activeTemplate.id}
                      className="bg-white shadow-card ring-1 ring-neutral-900/5 rounded-[2px] origin-top-left select-text"
                      style={{
                        width: `${A4_WIDTH_PX}px`,
                        minHeight: `${A4_HEIGHT_PX}px`,
                        transform: `scale(${fitScale})`,
                        transformOrigin: "top left",
                        ...themeStyles,
                      }}
                    >
                      <ActiveTemplateComponent
                        resume={previewResume}
                        readOnly={true}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Restore Confirmation Dialog */}
        {showConfirmDialog && selectedSummaryItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs"
            onClick={() => {
              if (!restoring) {
                setShowConfirmDialog(false);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="restore-version-confirm-title"
              data-testid="restore-version-confirm-dialog"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-panel border border-neutral-200 p-5 sm:p-6 shadow-modal"
            >
              <h3
                id="restore-version-confirm-title"
                className="text-base sm:text-lg font-semibold text-neutral-900"
              >
                Restore this version?
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Your current resume will be saved as a snapshot first, then
                replaced with the version from{" "}
                <strong className="font-semibold text-neutral-900">
                  {formatRelativeTime(selectedSummaryItem.updatedAt)}
                </strong>{" "}
                ({selectedSummaryItem.title}).
              </p>

              <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                <button
                  type="button"
                  disabled={restoring}
                  onClick={() => setShowConfirmDialog(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-control border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 text-xs sm:text-sm font-medium transition-colors focus-ring disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  ref={confirmButtonRef}
                  type="button"
                  disabled={restoring}
                  data-testid="confirm-restore-version-btn"
                  onClick={() => void handleConfirmRestore()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-control bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-medium shadow-sm transition-colors focus-ring disabled:opacity-50"
                >
                  {restoring ? "Restoring…" : "Restore version"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionHistoryDrawer;
