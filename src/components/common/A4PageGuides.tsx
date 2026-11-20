import React, { useEffect, useState } from 'react';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';

export const A4_WIDTH_PX = 794; // 21cm at 96dpi
export const A4_HEIGHT_PX = 1123; // 29.7cm at 96dpi
export const SHORT_OVERFLOW_MAX_RATIO = 0.2; // 20% above 1123px (<= 1347.6px)

interface FontSetLike {
  ready?: Promise<unknown>;
  status?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

function getDocumentFontSet(): FontSetLike | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  return (document as Document & { fonts?: FontSetLike }).fonts;
}

/**
 * Waits for browser webfont readiness (`document.fonts.ready`) when supported
 * before measuring sheet height or running the auto-fit solver.
 */
export async function waitForFontsReady(): Promise<void> {
  const fonts = getDocumentFontSet();
  if (fonts?.ready && typeof fonts.ready.then === 'function') {
    try {
      await fonts.ready;
    } catch {
      // Proceed with available fallback metrics if font loading rejects
    }
  }
}

/**
 * Reads unscaled CSS layout height of an A4 sheet container.
 * Prefers `offsetHeight` when positive so CSS entry transforms on children
 * never inflate `scrollHeight`, falling back to `scrollHeight` in headless/mocked environments.
 */
export function readUnscaledSheetHeight(el: HTMLElement | null): number {
  if (!el) {
    return A4_HEIGHT_PX;
  }
  const raw = el.offsetHeight > 0 ? el.offsetHeight : el.scrollHeight || 0;
  return Math.max(A4_HEIGHT_PX, raw);
}

/**
 * Computes the 1-indexed A4 page count for a given unscaled sheet height in px.
 */
export function computePageCount(unscaledHeightPx: number): number {
  if (!Number.isFinite(unscaledHeightPx) || unscaledHeightPx <= A4_HEIGHT_PX) {
    return 1;
  }
  return Math.max(1, Math.ceil(unscaledHeightPx / A4_HEIGHT_PX));
}

export function formatPageCountLabel(pageCount: number): string {
  const normalized = Math.max(1, Math.trunc(pageCount || 1));
  return normalized === 1 ? '1 page' : `${normalized} pages`;
}

/**
 * Returns true when unscaled height exceeds one A4 sheet (`1123px`) by 20% or less.
 */
export function isShortPageOverflow(unscaledHeightPx: number): boolean {
  if (!Number.isFinite(unscaledHeightPx) || unscaledHeightPx <= A4_HEIGHT_PX) {
    return false;
  }
  return unscaledHeightPx <= A4_HEIGHT_PX * (1 + SHORT_OVERFLOW_MAX_RATIO);
}

/**
 * Tracks live unscaled A4 sheet height, waiting for `document.fonts.ready`
 * when browser fonts are actively loading and observing layout resizes.
 */
export function useA4SheetHeight(
  pageRef: React.RefObject<HTMLElement | null>,
  deps: React.DependencyList = [],
  enabled = true,
  suppressSyncRef?: React.RefObject<boolean>
): number {
  const [pageHeight, setPageHeight] = useState<number>(A4_HEIGHT_PX);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const pageEl = pageRef.current;
    if (!pageEl) {
      return;
    }

    let cancelled = false;
    const fonts = getDocumentFontSet();

    const syncHeight = () => {
      if (cancelled || suppressSyncRef?.current) {
        return;
      }
      const nextHeight = readUnscaledSheetHeight(pageEl);
      setPageHeight((prev) => (prev !== nextHeight ? nextHeight : prev));
    };

    const isActivelyLoadingFonts = Boolean(
      fonts?.status === 'loading' &&
        fonts?.ready &&
        typeof fonts.ready.then === 'function'
    );

    if (!isActivelyLoadingFonts) {
      syncHeight();
    }

    if (fonts?.ready && typeof fonts.ready.then === 'function') {
      void fonts.ready.then(() => {
        syncHeight();
      });
    }

    const handleFontLoadingDone = () => {
      syncHeight();
    };
    fonts?.addEventListener?.('loadingdone', handleFontLoadingDone);

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (fonts?.status === 'loading') {
          return;
        }
        syncHeight();
      });
      observer.observe(pageEl);
    }

    return () => {
      cancelled = true;
      fonts?.removeEventListener?.('loadingdone', handleFontLoadingDone);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pageRef, suppressSyncRef, ...deps]);

  return pageHeight;
}

export interface A4PageCountBadgeProps {
  pageCount: number;
  className?: string;
}

export const A4PageCountBadge: React.FC<A4PageCountBadgeProps> = ({
  pageCount,
  className = '',
}) => {
  const normalized = Math.max(1, Math.trunc(pageCount || 1));
  const isMultiPage = normalized > 1;
  const label = formatPageCountLabel(normalized);

  return (
    <span
      data-testid="a4-page-count-badge"
      aria-live="polite"
      title={`Estimated A4 length: ${label}`}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium tabular-nums whitespace-nowrap border select-none print:hidden ${
        isMultiPage
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-neutral-100 text-neutral-700 border-neutral-200'
      } ${className}`.trim()}
    >
      <DocumentDuplicateIcon
        className={`h-3.5 w-3.5 shrink-0 ${
          isMultiPage ? 'text-amber-600' : 'text-neutral-500'
        }`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
};

export interface A4PageGuidesOverlayProps {
  pageHeight: number;
}

/**
 * Shared non-interactive overlay rendering dashed A4 boundary lines and `Page N`
 * labels at each `1123px` interval while remaining hidden during browser print.
 */
export const A4PageGuidesOverlay: React.FC<A4PageGuidesOverlayProps> = ({
  pageHeight,
}) => {
  const pageCount = computePageCount(pageHeight);
  const breakIndices =
    pageCount > 1
      ? Array.from({ length: pageCount - 1 }, (_, i) => i + 1)
      : [];

  return (
    <div
      data-testid="a4-page-guides-overlay"
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
      className="a4-page-guides-overlay pointer-events-none absolute inset-0 z-20 overflow-hidden select-none print:hidden"
    >
      {breakIndices.map((breakIndex) => {
        const topPx = breakIndex * A4_HEIGHT_PX;
        const nextPageNumber = breakIndex + 1;

        return (
          <div
            key={breakIndex}
            data-testid={`a4-page-guide-${nextPageNumber}`}
            data-break-px={topPx}
            style={{ top: `${topPx}px`, pointerEvents: 'none' }}
            className="pointer-events-none absolute inset-x-0 flex items-center justify-between border-t-2 border-dashed border-amber-500/80 print:hidden"
          >
            <span className="ml-2 mt-1 inline-flex items-center rounded bg-amber-500/95 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white shadow-sm">
              Page {nextPageNumber}
            </span>
            <span className="mr-2 -mt-5 inline-flex items-center rounded bg-neutral-900/75 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-xs">
              A4 break · {topPx}px
            </span>
          </div>
        );
      })}
    </div>
  );
};
