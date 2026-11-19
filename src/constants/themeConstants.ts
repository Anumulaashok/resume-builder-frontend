import React from 'react';
import {
  PageSize,
  PhotoShape,
  PhotoSize,
  ThemeConfig,
  ThemePhotoConfig,
} from '../types/resume';

export interface FontPairingOption {
  id: string;
  name: string;
  headingFont: string;
  bodyFont: string;
  description: string;
}

export interface ColorOption {
  id: string;
  name: string;
  value: string;
}

export interface SpacingOption {
  id: 'compact' | 'normal' | 'spacious';
  name: string;
  sectionSpacing: string;
  itemSpacing: string;
  description: string;
}

export type PageMarginPreset = 'narrow' | 'normal' | 'wide';
export type HeadingStyleOptionId = 'underline' | 'bar' | 'caps' | 'pill' | 'side-label';
export type SkillStyleOptionId = 'chips' | 'comma' | 'bars' | 'dots' | 'columns';
export type DateFormatOptionId = 'MMM YYYY' | 'MM/YYYY' | 'YYYY';

export interface PageMarginOption {
  id: PageMarginPreset;
  name: string;
  value: string;
}

export interface StyleVariantOption<T extends string> {
  id: T;
  name: string;
}

export interface PageDimensions {
  id: PageSize;
  name: string;
  description: string;
  widthPx: number;
  heightPx: number;
  cssSize: 'A4' | 'Letter';
  printWidthCss: string;
  printHeightCss: string;
}

export const A4_WIDTH_PX = 794; // 210mm at 96dpi
export const A4_HEIGHT_PX = 1123; // 297mm at 96dpi
export const LETTER_WIDTH_PX = 816; // 8.5in at 96dpi
export const LETTER_HEIGHT_PX = 1056; // 11in at 96dpi

export const pageSizeOptions: PageDimensions[] = [
  {
    id: 'A4',
    name: 'A4',
    description: '210 × 297 mm',
    widthPx: A4_WIDTH_PX,
    heightPx: A4_HEIGHT_PX,
    cssSize: 'A4',
    printWidthCss: '210mm',
    printHeightCss: '297mm',
  },
  {
    id: 'Letter',
    name: 'Letter',
    description: '8.5 × 11 in',
    widthPx: LETTER_WIDTH_PX,
    heightPx: LETTER_HEIGHT_PX,
    cssSize: 'Letter',
    printWidthCss: '8.5in',
    printHeightCss: '11in',
  },
];

export function getPageDimensions(pageSize?: PageSize | string): PageDimensions {
  if (pageSize === 'Letter') {
    return pageSizeOptions[1];
  }
  return pageSizeOptions[0];
}

export const defaultPhotoConfig: ThemePhotoConfig = {
  show: true,
  shape: 'circle',
  size: 'md',
};

export function resolvePhotoConfig(photo?: Partial<ThemePhotoConfig>): ThemePhotoConfig {
  return {
    show: photo?.show ?? defaultPhotoConfig.show,
    shape: photo?.shape || defaultPhotoConfig.shape,
    size: photo?.size || defaultPhotoConfig.size,
  };
}

export const photoShapeOptions: StyleVariantOption<PhotoShape>[] = [
  { id: 'circle', name: 'Circle' },
  { id: 'rounded', name: 'Rounded' },
  { id: 'square', name: 'Square' },
];

export const photoSizeOptions: StyleVariantOption<PhotoSize>[] = [
  { id: 'sm', name: 'Small' },
  { id: 'md', name: 'Medium' },
  { id: 'lg', name: 'Large' },
];

export const FIT_MIN_FONT_SCALE = 0.8;
export const FIT_MIN_LINE_HEIGHT = 1.2;
export const FIT_MIN_SECTION_SPACING = 'compact' as const;

export function getNextFitThemeStep(
  theme: ThemeConfig,
  stepIndex: number
): ThemeConfig | null {
  const currentSpacing = theme.sectionSpacing || 'normal';
  const currentFontScale =
    typeof theme.fontScale === 'number' && !Number.isNaN(theme.fontScale)
      ? Number(theme.fontScale.toFixed(2))
      : 1;
  const currentLineHeight =
    typeof theme.lineHeight === 'number' && !Number.isNaN(theme.lineHeight)
      ? Number(theme.lineHeight.toFixed(2))
      : 1.5;

  const canReduceSpacing =
    currentSpacing === 'spacious' ||
    (currentSpacing !== 'compact' && currentSpacing !== 'spacious');
  const canReduceLineHeight = currentLineHeight > FIT_MIN_LINE_HEIGHT + 0.001;
  const canReduceFontScale = currentFontScale > FIT_MIN_FONT_SCALE + 0.001;

  if (!canReduceSpacing && !canReduceLineHeight && !canReduceFontScale) {
    return null;
  }

  // Interleave spacing -> lineHeight -> fontScale reductions for balanced typography
  if (canReduceSpacing && (stepIndex === 0 || stepIndex === 2 || (!canReduceLineHeight && !canReduceFontScale))) {
    const nextSpacing: 'normal' | 'compact' =
      currentSpacing === 'spacious' ? 'normal' : 'compact';
    return {
      ...theme,
      sectionSpacing: nextSpacing,
    };
  }

  const preferLineHeight = stepIndex % 2 === 1;
  if (preferLineHeight && canReduceLineHeight) {
    return {
      ...theme,
      lineHeight: Math.max(
        FIT_MIN_LINE_HEIGHT,
        Number((currentLineHeight - 0.05).toFixed(2))
      ),
    };
  }

  if (canReduceFontScale) {
    return {
      ...theme,
      fontScale: Math.max(
        FIT_MIN_FONT_SCALE,
        Number((currentFontScale - 0.05).toFixed(2))
      ),
    };
  }

  if (canReduceLineHeight) {
    return {
      ...theme,
      lineHeight: Math.max(
        FIT_MIN_LINE_HEIGHT,
        Number((currentLineHeight - 0.05).toFixed(2))
      ),
    };
  }

  if (canReduceSpacing) {
    const nextSpacing: 'normal' | 'compact' =
      currentSpacing === 'spacious' ? 'normal' : 'compact';
    return {
      ...theme,
      sectionSpacing: nextSpacing,
    };
  }

  return null;
}

export const pageMarginOptions: PageMarginOption[] = [
  { id: 'narrow', name: 'Narrow', value: '1.25cm' },
  { id: 'normal', name: 'Normal', value: '1.75cm' },
  { id: 'wide', name: 'Wide', value: '2.25cm' },
];

export const headingStyleOptions: StyleVariantOption<HeadingStyleOptionId>[] = [
  { id: 'underline', name: 'Underline' },
  { id: 'bar', name: 'Accent Bar' },
  { id: 'caps', name: 'Minimal Caps' },
  { id: 'pill', name: 'Pill Badge' },
  { id: 'side-label', name: 'Side Rule' },
];

export const skillStyleOptions: StyleVariantOption<SkillStyleOptionId>[] = [
  { id: 'chips', name: 'Chips' },
  { id: 'comma', name: 'Inline' },
  { id: 'bars', name: 'Bars' },
  { id: 'dots', name: 'Dots' },
  { id: 'columns', name: 'Columns' },
];

export const dateFormatOptions: StyleVariantOption<DateFormatOptionId>[] = [
  { id: 'MMM YYYY', name: 'MMM YYYY' },
  { id: 'MM/YYYY', name: 'MM/YYYY' },
  { id: 'YYYY', name: 'YYYY' },
];

export const fontPairingOptions: FontPairingOption[] = [
  {
    id: 'modern-sans',
    name: 'Modern Sans',
    headingFont: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    bodyFont: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    description: 'Clean, contemporary, and versatile sans-serif pairing',
  },
  {
    id: 'classic-serif',
    name: 'Classic Serif',
    headingFont: '"Merriweather", "Georgia", "Cambria", "Times New Roman", serif',
    bodyFont: '"Merriweather", "Georgia", "Cambria", "Times New Roman", serif',
    description: 'Traditional, authoritative, and academic serif design',
  },
  {
    id: 'elegant-hybrid',
    name: 'Elegant Hybrid',
    headingFont: '"Playfair Display", "Georgia", "Cambria", serif',
    bodyFont: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    description: 'Refined serif titles with highly legible sans-serif body',
  },
  {
    id: 'technical-mono',
    name: 'Technical Clean',
    headingFont: 'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    bodyFont: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    description: 'Engineering-oriented code headlines with modern sans body',
  },
];

export const colorOptions: ColorOption[] = [
  { id: 'slate', name: 'Charcoal Slate', value: '#1e293b' },
  { id: 'blue', name: 'Royal Blue', value: '#2563eb' },
  { id: 'emerald', name: 'Emerald Teal', value: '#059669' },
  { id: 'crimson', name: 'Crimson Wine', value: '#991b1b' },
  { id: 'violet', name: 'Purple Violet', value: '#7c3aed' },
  { id: 'teal', name: 'Deep Teal', value: '#0f766e' },
  { id: 'amber', name: 'Warm Amber', value: '#b45309' },
  { id: 'dark-gray', name: 'Graphite', value: '#374151' },
];

export const spacingOptions: SpacingOption[] = [
  {
    id: 'compact',
    name: 'Compact',
    sectionSpacing: '1rem',
    itemSpacing: '0.5rem',
    description: 'Dense layout for high-volume content on single page',
  },
  {
    id: 'normal',
    name: 'Normal',
    sectionSpacing: '1.5rem',
    itemSpacing: '0.875rem',
    description: 'Balanced layout with standard whitespace',
  },
  {
    id: 'spacious',
    name: 'Spacious',
    sectionSpacing: '2.25rem',
    itemSpacing: '1.25rem',
    description: 'Relaxed layout emphasizing readability and elegance',
  },
];

export const defaultThemeConfig: ThemeConfig = {
  fontPairingId: 'modern-sans',
  headingFont: fontPairingOptions[0].headingFont,
  bodyFont: fontPairingOptions[0].bodyFont,
  primaryColor: '#1e293b',
  textColor: '#374151',
  headingColor: '#111827',
  sectionSpacing: 'normal',
  fontSize: 'base',
  pageSize: 'A4',
};

export function resolveSidebarWidthCss(sidebarWidth?: number | string): string {
  if (sidebarWidth === undefined || sidebarWidth === null || sidebarWidth === '') {
    return '32%';
  }
  if (typeof sidebarWidth === 'number') {
    return sidebarWidth <= 60 ? `${sidebarWidth}%` : `${sidebarWidth}px`;
  }
  const trimmed = String(sidebarWidth).trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    return num <= 60 ? `${num}%` : `${num}px`;
  }
  return trimmed;
}

export function resolveTemplateDefaultTheme(
  templateDefaults?: Partial<ThemeConfig>
): ThemeConfig {
  if (!templateDefaults) {
    return { ...defaultThemeConfig };
  }
  const merged: ThemeConfig = {
    ...defaultThemeConfig,
    ...templateDefaults,
  };
  if (templateDefaults.fontPairingId && !templateDefaults.headingFont && !templateDefaults.bodyFont) {
    const pairing = fontPairingOptions.find((f) => f.id === templateDefaults.fontPairingId);
    if (pairing) {
      merged.headingFont = pairing.headingFont;
      merged.bodyFont = pairing.bodyFont;
    }
  }
  if (templateDefaults.primaryColor && !templateDefaults.headingColor) {
    merged.headingColor = templateDefaults.primaryColor;
  }
  return merged;
}

export function getThemeStyles(
  themeConfig?: ThemeConfig,
  templateDefaults?: Partial<ThemeConfig>
): React.CSSProperties {
  const activeTheme: ThemeConfig = {
    ...defaultThemeConfig,
    ...(templateDefaults || {}),
    ...(themeConfig || {}),
  };

  const isAtsMode = Boolean(activeTheme.atsMode);
  const pageDims = getPageDimensions(activeTheme.pageSize);

  const spacingPreset = spacingOptions.find((s) => s.id === activeTheme.sectionSpacing);
  const sectionSpacingCss = spacingPreset
    ? spacingPreset.sectionSpacing
    : typeof activeTheme.sectionSpacing === 'string' && activeTheme.sectionSpacing.trim()
    ? activeTheme.sectionSpacing.trim()
    : spacingOptions[1].sectionSpacing;
  const itemSpacingCss = spacingPreset
    ? spacingPreset.itemSpacing
    : spacingOptions[1].itemSpacing;

  const fontPairing =
    fontPairingOptions.find((f) => f.id === activeTheme.fontPairingId) || fontPairingOptions[0];

  const explicitHeadingFont = themeConfig?.headingFont ?? templateDefaults?.headingFont;
  const explicitBodyFont = themeConfig?.bodyFont ?? templateDefaults?.bodyFont;

  const headingFont = explicitHeadingFont || fontPairing.headingFont;
  const bodyFont = explicitBodyFont || fontPairing.bodyFont;
  const rawPrimaryColor = activeTheme.primaryColor || '#1e293b';
  const rawAccentColor = activeTheme.accentColor || rawPrimaryColor;
  const rawHeadingColor =
    themeConfig?.headingColor ??
    templateDefaults?.headingColor ??
    (themeConfig?.primaryColor ? themeConfig.primaryColor : activeTheme.headingColor || rawPrimaryColor);

  const primaryColor = isAtsMode ? '#000000' : rawPrimaryColor;
  const accentColor = isAtsMode ? '#000000' : rawAccentColor;
  const headingColor = isAtsMode ? '#000000' : rawHeadingColor;
  const textColor = isAtsMode ? '#111827' : activeTheme.textColor || '#374151';

  const fontScale =
    typeof activeTheme.fontScale === 'number' && !Number.isNaN(activeTheme.fontScale)
      ? activeTheme.fontScale
      : 1;
  const lineHeight =
    typeof activeTheme.lineHeight === 'number' && !Number.isNaN(activeTheme.lineHeight)
      ? activeTheme.lineHeight
      : 1.5;

  const marginPreset =
    pageMarginOptions.find((m) => m.id === activeTheme.pageMargins) || pageMarginOptions[1];
  const sidebarWidthCss = isAtsMode ? '100%' : resolveSidebarWidthCss(activeTheme.sidebarWidth);

  return {
    '--theme-primary': primaryColor,
    '--theme-accent': accentColor,
    '--theme-heading-font': headingFont,
    '--theme-body-font': bodyFont,
    '--theme-font-scale': String(fontScale),
    '--theme-base-font-size': `${Number((13.5 * fontScale).toFixed(2))}px`,
    '--theme-line-height': String(lineHeight),
    '--theme-section-spacing': sectionSpacingCss,
    '--theme-item-spacing': itemSpacingCss,
    '--theme-page-margin': marginPreset.value,
    '--theme-sidebar-width': sidebarWidthCss,
    '--theme-heading-style': isAtsMode ? 'underline' : activeTheme.headingStyle || 'underline',
    '--theme-skill-style': isAtsMode ? 'comma' : activeTheme.skillStyle || 'chips',
    '--theme-date-format': activeTheme.dateFormat || 'MMM YYYY',
    '--theme-text-color': textColor,
    '--theme-heading-color': headingColor,
    '--theme-page-width': `${pageDims.widthPx}px`,
    '--theme-page-height': `${pageDims.heightPx}px`,
    '--theme-print-width': pageDims.printWidthCss,
    '--theme-print-height': pageDims.printHeightCss,
  } as React.CSSProperties;
}
