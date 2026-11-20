import { ThemeConfig } from '../types/resume';
import {
  getThemeStyles,
  PageMarginPreset,
  resolveTemplateDefaultTheme,
} from '../constants/themeConstants';
import {
  A4_HEIGHT_PX,
  readUnscaledSheetHeight,
  waitForFontsReady,
} from '../components/common/A4PageGuides';

export const AUTO_FIT_MIN_FONT_SCALE = 0.85;
export const AUTO_FIT_MIN_LINE_HEIGHT = 1.25;
export const AUTO_FIT_MIN_SECTION_SPACING = 'compact' as const;
export const AUTO_FIT_MIN_PAGE_MARGINS: PageMarginPreset = 'narrow';

const MARGIN_ORDER: PageMarginPreset[] = ['wide', 'normal', 'narrow'];

export type AutoFitThemeKey =
  | 'pageMargins'
  | 'sectionSpacing'
  | 'lineHeight'
  | 'fontScale';

export interface AutoFitSolveOptions {
  currentTheme?: ThemeConfig;
  templateDefaults?: Partial<ThemeConfig>;
  measureHeight: (candidateTheme: ThemeConfig) => number;
  targetHeight?: number;
}

export interface AutoFitSolveResult {
  fitted: boolean;
  alreadyFit: boolean;
  themeConfig: ThemeConfig;
  changedKeys: AutoFitThemeKey[];
  initialHeight: number;
  finalHeight: number;
}

function getTighterMargins(current: PageMarginPreset): PageMarginPreset[] {
  const idx = MARGIN_ORDER.indexOf(current);
  if (idx === -1) {
    return ['normal', 'narrow'];
  }
  return MARGIN_ORDER.slice(idx + 1);
}

function getTighterSpacings(
  current: string | undefined
): Array<'spacious' | 'normal' | 'compact'> {
  if (current === 'spacious') {
    return ['normal', 'compact'];
  }
  if (current === 'normal' || !current) {
    return ['compact'];
  }
  if (current === 'compact') {
    return [];
  }
  return ['normal', 'compact'];
}

function computeChangedKeys(
  baseline: {
    pageMargins: PageMarginPreset;
    sectionSpacing: string;
    lineHeight: number;
    fontScale: number;
  },
  candidate: {
    pageMargins: PageMarginPreset;
    sectionSpacing: string;
    lineHeight: number;
    fontScale: number;
  }
): AutoFitThemeKey[] {
  const changed: AutoFitThemeKey[] = [];
  if (candidate.pageMargins !== baseline.pageMargins) {
    changed.push('pageMargins');
  }
  if (candidate.sectionSpacing !== baseline.sectionSpacing) {
    changed.push('sectionSpacing');
  }
  if (Math.abs(candidate.lineHeight - baseline.lineHeight) > 0.0001) {
    changed.push('lineHeight');
  }
  if (Math.abs(candidate.fontScale - baseline.fontScale) > 0.0001) {
    changed.push('fontScale');
  }
  return changed;
}

function buildNextThemeConfig(
  currentTheme: ThemeConfig | undefined,
  changedKeys: AutoFitThemeKey[],
  working: {
    pageMargins: PageMarginPreset;
    sectionSpacing: string;
    lineHeight: number;
    fontScale: number;
  }
): ThemeConfig {
  const next: ThemeConfig = { ...(currentTheme || {}) };
  changedKeys.forEach((key) => {
    if (key === 'pageMargins') {
      next.pageMargins = working.pageMargins;
    } else if (key === 'sectionSpacing') {
      next.sectionSpacing = working.sectionSpacing;
    } else if (key === 'lineHeight') {
      next.lineHeight = working.lineHeight;
    } else if (key === 'fontScale') {
      next.fontScale = working.fontScale;
    }
  });
  return next;
}

/**
 * Deterministic one-page theme solver:
 * 1. Tightens `pageMargins` (`wide -> normal -> narrow`) and `sectionSpacing` (`spacious -> normal -> compact`) first.
 * 2. Binary-searches `lineHeight` down to `1.25` to preserve font size whenever possible.
 * 3. Binary-searches `fontScale` down to `0.85` only when tighter spacing and line-height are insufficient.
 * Never alters resume text and enforces readability floors strictly.
 */
export function solveThemeAutoFit({
  currentTheme,
  templateDefaults,
  measureHeight,
  targetHeight = A4_HEIGHT_PX,
}: AutoFitSolveOptions): AutoFitSolveResult {
  const resolvedDefaults = resolveTemplateDefaultTheme(templateDefaults);
  const activeMerged: ThemeConfig = {
    ...resolvedDefaults,
    ...(currentTheme || {}),
  };

  const startMargins: PageMarginPreset =
    activeMerged.pageMargins === 'narrow' ||
    activeMerged.pageMargins === 'normal' ||
    activeMerged.pageMargins === 'wide'
      ? activeMerged.pageMargins
      : 'normal';

  const startSpacing =
    typeof activeMerged.sectionSpacing === 'string' &&
    activeMerged.sectionSpacing.trim()
      ? activeMerged.sectionSpacing.trim()
      : 'normal';

  const rawLineHeight =
    typeof activeMerged.lineHeight === 'number' &&
    !Number.isNaN(activeMerged.lineHeight)
      ? activeMerged.lineHeight
      : 1.5;
  const startLineHeight = Math.max(
    AUTO_FIT_MIN_LINE_HEIGHT,
    Number(rawLineHeight.toFixed(2))
  );

  const rawFontScale =
    typeof activeMerged.fontScale === 'number' &&
    !Number.isNaN(activeMerged.fontScale)
      ? activeMerged.fontScale
      : 1;
  const startFontScale = Math.max(
    AUTO_FIT_MIN_FONT_SCALE,
    Number(rawFontScale.toFixed(2))
  );

  const baseline = {
    pageMargins: startMargins,
    sectionSpacing: startSpacing,
    lineHeight: startLineHeight,
    fontScale: startFontScale,
  };

  const working = { ...baseline };

  const probe = (
    overrides?: Partial<typeof working>
  ): { height: number; candidateTheme: ThemeConfig } => {
    const mergedWorking = { ...working, ...(overrides || {}) };
    const candidateTheme: ThemeConfig = {
      ...(currentTheme || {}),
      pageMargins: mergedWorking.pageMargins,
      sectionSpacing: mergedWorking.sectionSpacing,
      lineHeight: mergedWorking.lineHeight,
      fontScale: mergedWorking.fontScale,
    };
    return {
      height: measureHeight(candidateTheme),
      candidateTheme,
    };
  };

  const initialHeight = measureHeight(currentTheme || {});
  if (initialHeight <= targetHeight) {
    return {
      fitted: true,
      alreadyFit: true,
      themeConfig: { ...(currentTheme || {}) },
      changedKeys: [],
      initialHeight,
      finalHeight: initialHeight,
    };
  }

  const finalize = (fitted: boolean, finalHeight: number): AutoFitSolveResult => {
    const changedKeys = computeChangedKeys(baseline, working);
    return {
      fitted,
      alreadyFit: false,
      themeConfig: buildNextThemeConfig(currentTheme, changedKeys, working),
      changedKeys,
      initialHeight,
      finalHeight,
    };
  };

  // Phase 1a: Tighten pageMargins toward 'narrow'
  for (const nextMargin of getTighterMargins(working.pageMargins)) {
    working.pageMargins = nextMargin;
    const { height } = probe();
    if (height <= targetHeight) {
      return finalize(true, height);
    }
  }

  // Phase 1b: Tighten sectionSpacing toward 'compact'
  for (const nextSpacing of getTighterSpacings(working.sectionSpacing)) {
    working.sectionSpacing = nextSpacing;
    const { height } = probe();
    if (height <= targetHeight) {
      return finalize(true, height);
    }
  }

  // Phase 2: Binary search on lineHeight in 0.01 increments down to 1.25
  const minLhInt = Math.round(AUTO_FIT_MIN_LINE_HEIGHT * 100); // 125
  const maxLhInt = Math.round(working.lineHeight * 100);

  if (maxLhInt > minLhInt) {
    const minLhProbe = probe({ lineHeight: AUTO_FIT_MIN_LINE_HEIGHT });
    if (minLhProbe.height <= targetHeight) {
      let bestLhInt = minLhInt;
      let bestHeight = minLhProbe.height;
      let lo = minLhInt + 1;
      let hi = maxLhInt - 1;

      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const candidateLh = Number((mid / 100).toFixed(2));
        const { height } = probe({ lineHeight: candidateLh });
        if (height <= targetHeight) {
          bestLhInt = mid;
          bestHeight = height;
          lo = mid + 1; // try larger (more legible) lineHeight
        } else {
          hi = mid - 1;
        }
      }

      working.lineHeight = Number((bestLhInt / 100).toFixed(2));
      return finalize(true, bestHeight);
    }

    working.lineHeight = AUTO_FIT_MIN_LINE_HEIGHT;
  }

  // Phase 3: Binary search on fontScale in 0.01 increments down to 0.85
  const minFsInt = Math.round(AUTO_FIT_MIN_FONT_SCALE * 100); // 85
  const maxFsInt = Math.round(working.fontScale * 100);

  if (maxFsInt > minFsInt) {
    const minFsProbe = probe({ fontScale: AUTO_FIT_MIN_FONT_SCALE });
    if (minFsProbe.height <= targetHeight) {
      let bestFsInt = minFsInt;
      let bestHeight = minFsProbe.height;
      let lo = minFsInt + 1;
      let hi = maxFsInt - 1;

      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const candidateFs = Number((mid / 100).toFixed(2));
        const { height } = probe({ fontScale: candidateFs });
        if (height <= targetHeight) {
          bestFsInt = mid;
          bestHeight = height;
          lo = mid + 1; // try larger (more legible) fontScale
        } else {
          hi = mid - 1;
        }
      }

      working.fontScale = Number((bestFsInt / 100).toFixed(2));
      return finalize(true, bestHeight);
    }

    working.fontScale = AUTO_FIT_MIN_FONT_SCALE;
    return finalize(false, minFsProbe.height);
  }

  const floorProbe = probe();
  return finalize(floorProbe.height <= targetHeight, floorProbe.height);
}

const SOLVER_THEME_CSS_VARS = [
  '--theme-font-scale',
  '--theme-base-font-size',
  '--theme-line-height',
  '--theme-section-spacing',
  '--theme-item-spacing',
  '--theme-page-margin',
] as const;

export interface DomThemeAutoFitOptions {
  pageEl: HTMLElement;
  currentTheme?: ThemeConfig;
  templateDefaults?: Partial<ThemeConfig>;
  targetHeight?: number;
}

/**
 * Waits for browser fonts to settle, then runs `solveThemeAutoFit` synchronously
 * against `pageEl` CSS custom properties without intermediate React re-renders.
 */
export async function runDomThemeAutoFit({
  pageEl,
  currentTheme,
  templateDefaults,
  targetHeight = A4_HEIGHT_PX,
}: DomThemeAutoFitOptions): Promise<AutoFitSolveResult> {
  await waitForFontsReady();

  const overlayEl = pageEl.querySelector<HTMLElement>(
    '[data-testid="a4-page-guides-overlay"]'
  );
  const previousOverlayDisplay = overlayEl ? overlayEl.style.display : '';

  const previousVarValues = new Map<string, string>();
  SOLVER_THEME_CSS_VARS.forEach((varName) => {
    previousVarValues.set(varName, pageEl.style.getPropertyValue(varName));
  });

  try {
    if (overlayEl) {
      overlayEl.style.display = 'none';
    }

    return solveThemeAutoFit({
      currentTheme,
      templateDefaults,
      targetHeight,
      measureHeight: (candidateTheme) => {
        const cssVars = getThemeStyles(
          candidateTheme,
          templateDefaults
        ) as Record<string, string>;
        SOLVER_THEME_CSS_VARS.forEach((varName) => {
          const nextVal = cssVars[varName];
          if (nextVal !== undefined) {
            pageEl.style.setProperty(varName, String(nextVal));
          }
        });
        return readUnscaledSheetHeight(pageEl);
      },
    });
  } finally {
    if (overlayEl) {
      overlayEl.style.display = previousOverlayDisplay;
    }
    previousVarValues.forEach((prevVal, varName) => {
      if (prevVal) {
        pageEl.style.setProperty(varName, prevVal);
      } else {
        pageEl.style.removeProperty(varName);
      }
    });
  }
}
