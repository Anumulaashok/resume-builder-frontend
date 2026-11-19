import React, { useState } from 'react';
import {
  PageSize,
  PhotoShape,
  PhotoSize,
  ThemeConfig,
} from '../types/resume';
import {
  fontPairingOptions,
  colorOptions,
  spacingOptions,
  pageMarginOptions,
  pageSizeOptions,
  photoShapeOptions,
  photoSizeOptions,
  headingStyleOptions,
  skillStyleOptions,
  dateFormatOptions,
  defaultThemeConfig,
  resolveTemplateDefaultTheme,
  resolvePhotoConfig,
  getNextFitThemeStep,
  FIT_MIN_FONT_SCALE,
  FIT_MIN_LINE_HEIGHT,
  PageMarginPreset,
  HeadingStyleOptionId,
  SkillStyleOptionId,
  DateFormatOptionId,
} from '../constants/themeConstants';
import { TemplateLayout } from './templates/registry';
import {
  XMarkIcon,
  ArrowPathIcon,
  ArrowsPointingInIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';

export interface FitToOnePageResult {
  status: 'already-fit' | 'fitted' | 'cannot-fit';
  pageCount: number;
  message: string;
}

interface ThemeCustomizationPanelProps {
  themeConfig?: ThemeConfig;
  templateDefaultTheme?: Partial<ThemeConfig>;
  templateLayout?: TemplateLayout;
  onChange: (theme: ThemeConfig) => void;
  onKeysCustomised?: (keys: Array<keyof ThemeConfig>) => void;
  onReset?: (theme: ThemeConfig) => void;
  onFitToOnePage?: () => FitToOnePageResult;
  onClose: () => void;
}

export const ThemeCustomizationPanel: React.FC<ThemeCustomizationPanelProps> = ({
  themeConfig,
  templateDefaultTheme,
  templateLayout,
  onChange,
  onKeysCustomised,
  onReset,
  onFitToOnePage,
  onClose,
}) => {
  const [fitFeedback, setFitFeedback] = useState<FitToOnePageResult | null>(null);

  const baseDefaults = resolveTemplateDefaultTheme(templateDefaultTheme);
  const currentTheme: ThemeConfig = {
    ...baseDefaults,
    ...(themeConfig || {}),
  };

  const isAtsMode = Boolean(currentTheme.atsMode);
  const activePageSize: PageSize =
    currentTheme.pageSize === 'Letter' ? 'Letter' : 'A4';
  const resolvedPhoto = resolvePhotoConfig(currentTheme.photo);

  const emitUpdate = (
    patch: Partial<ThemeConfig>,
    changedKeys: Array<keyof ThemeConfig>
  ) => {
    setFitFeedback(null);
    if (onKeysCustomised) {
      onKeysCustomised(changedKeys);
    }
    onChange({
      ...(themeConfig || {}),
      ...patch,
    });
  };

  const handleAtsModeToggle = () => {
    emitUpdate({ atsMode: !isAtsMode }, ['atsMode']);
  };

  const handlePageSizeSelect = (pageSize: PageSize) => {
    emitUpdate({ pageSize }, ['pageSize']);
  };

  const handleFitClick = () => {
    if (onFitToOnePage) {
      const result = onFitToOnePage();
      setFitFeedback(result);
      return;
    }

    // Standalone fallback when rendered outside ResumePreview
    const nextStep = getNextFitThemeStep(currentTheme, 0);
    if (!nextStep) {
      setFitFeedback({
        status: 'cannot-fit',
        pageCount: 1,
        message: 'Already at minimum readable spacing and font settings.',
      });
      return;
    }

    const patch: Partial<ThemeConfig> = {};
    const changedKeys: Array<keyof ThemeConfig> = [];
    if (nextStep.sectionSpacing !== currentTheme.sectionSpacing) {
      patch.sectionSpacing = nextStep.sectionSpacing;
      changedKeys.push('sectionSpacing');
    }
    if (nextStep.lineHeight !== currentTheme.lineHeight) {
      patch.lineHeight = nextStep.lineHeight;
      changedKeys.push('lineHeight');
    }
    if (nextStep.fontScale !== currentTheme.fontScale) {
      patch.fontScale = nextStep.fontScale;
      changedKeys.push('fontScale');
    }

    if (onKeysCustomised && changedKeys.length > 0) {
      onKeysCustomised(changedKeys);
    }
    onChange({
      ...(themeConfig || {}),
      ...patch,
    });
    setFitFeedback({
      status: 'fitted',
      pageCount: 1,
      message: 'Adjusted spacing and typography to fit on one page.',
    });
  };

  const handlePhotoShowToggle = () => {
    emitUpdate(
      {
        photo: {
          ...resolvedPhoto,
          show: !resolvedPhoto.show,
        },
      },
      ['photo']
    );
  };

  const handlePhotoShapeSelect = (shape: PhotoShape) => {
    emitUpdate(
      {
        photo: {
          ...resolvedPhoto,
          shape,
        },
      },
      ['photo']
    );
  };

  const handlePhotoSizeSelect = (size: PhotoSize) => {
    emitUpdate(
      {
        photo: {
          ...resolvedPhoto,
          size,
        },
      },
      ['photo']
    );
  };

  const handleFontSelect = (fontId: string) => {
    const selectedPairing = fontPairingOptions.find((f) => f.id === fontId);
    if (!selectedPairing) return;

    emitUpdate(
      {
        fontPairingId: selectedPairing.id,
        headingFont: selectedPairing.headingFont,
        bodyFont: selectedPairing.bodyFont,
      },
      ['fontPairingId', 'headingFont', 'bodyFont']
    );
  };

  const handlePrimaryColorSelect = (hexValue: string) => {
    emitUpdate(
      {
        primaryColor: hexValue,
        headingColor: hexValue,
      },
      ['primaryColor', 'headingColor']
    );
  };

  const handleAccentColorSelect = (hexValue: string) => {
    emitUpdate({ accentColor: hexValue }, ['accentColor']);
  };

  const handleSpacingSelect = (spacingId: 'compact' | 'normal' | 'spacious') => {
    emitUpdate({ sectionSpacing: spacingId }, ['sectionSpacing']);
  };

  const handleMarginSelect = (marginId: PageMarginPreset) => {
    emitUpdate({ pageMargins: marginId }, ['pageMargins']);
  };

  const handleHeadingStyleSelect = (styleId: HeadingStyleOptionId) => {
    emitUpdate({ headingStyle: styleId }, ['headingStyle']);
  };

  const handleSkillStyleSelect = (styleId: SkillStyleOptionId) => {
    emitUpdate({ skillStyle: styleId }, ['skillStyle']);
  };

  const handleDateFormatSelect = (fmt: DateFormatOptionId) => {
    emitUpdate({ dateFormat: fmt }, ['dateFormat']);
  };

  const handleFontScaleChange = (scale: number) => {
    emitUpdate({ fontScale: scale }, ['fontScale']);
  };

  const handleLineHeightChange = (lh: number) => {
    emitUpdate({ lineHeight: lh }, ['lineHeight']);
  };

  const handleSidebarWidthChange = (widthPct: number) => {
    emitUpdate({ sidebarWidth: widthPct }, ['sidebarWidth']);
  };

  const handleReset = () => {
    setFitFeedback(null);
    const resetTarget = templateDefaultTheme
      ? resolveTemplateDefaultTheme(templateDefaultTheme)
      : { ...defaultThemeConfig };
    if (onReset) {
      onReset(resetTarget);
    } else {
      onChange(resetTarget);
    }
  };

  const resolvedFontScale =
    typeof currentTheme.fontScale === 'number' ? currentTheme.fontScale : 1;
  const resolvedLineHeight =
    typeof currentTheme.lineHeight === 'number' ? currentTheme.lineHeight : 1.5;
  const resolvedSidebarWidth =
    typeof currentTheme.sidebarWidth === 'number'
      ? currentTheme.sidebarWidth
      : typeof currentTheme.sidebarWidth === 'string' &&
        /^\d+/.test(currentTheme.sidebarWidth)
      ? parseInt(currentTheme.sidebarWidth, 10)
      : 32;
  const isSidebarLayout =
    templateLayout === 'sidebar-left' || templateLayout === 'sidebar-right';

  return (
    <div
      data-testid="theme-customization-panel"
      className="absolute top-4 right-2 sm:right-4 z-30 w-[calc(100vw-1rem)] sm:w-96 max-w-[24rem] bg-gray-900/95 backdrop-blur border border-gray-700/80 rounded-xl shadow-2xl p-4 sm:p-5 text-gray-200 print:hidden transition-all duration-200 max-h-[85vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-800 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <h3 className="font-semibold text-white text-base truncate">
            Theme Customization
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            title="Reset theme to defaults"
            data-testid="reset-theme-defaults-btn"
            className="px-2 py-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors text-[11px] font-medium flex items-center gap-1 border border-gray-700/80"
          >
            <ArrowPathIcon className="h-3.5 w-3.5 shrink-0" />
            <span>Reset to template defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss theme panel"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* ATS MODE TOGGLE */}
        <section
          data-testid="theme-group-ats"
          aria-labelledby="theme-heading-ats"
          className={`rounded-lg border p-3 transition-colors ${
            isAtsMode
              ? 'border-emerald-500/70 bg-emerald-950/40'
              : 'border-gray-800 bg-gray-800/60'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <DocumentCheckIcon className="h-4 w-4 text-emerald-400 shrink-0" />
                <span
                  id="theme-heading-ats"
                  className="text-xs font-semibold text-white"
                >
                  ATS mode
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                Previews and prints in monochrome single-column layout without photos or icons.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isAtsMode}
              aria-label="ATS mode"
              data-testid="ats-mode-toggle"
              onClick={handleAtsModeToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                isAtsMode ? 'bg-emerald-500' : 'bg-gray-700'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  isAtsMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* PAGE & PAGINATION */}
        <section
          data-testid="theme-group-page"
          aria-labelledby="theme-heading-page"
          className="space-y-3"
        >
          <h4
            id="theme-heading-page"
            className="text-[11px] font-bold uppercase tracking-widest text-blue-400 border-b border-gray-800 pb-1"
          >
            Page Setup
          </h4>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Page Size
            </label>
            <div className="grid grid-cols-2 gap-2">
              {pageSizeOptions.map((opt) => {
                const isSelected = activePageSize === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handlePageSizeSelect(opt.id)}
                    data-testid={`page-size-option-${opt.id}`}
                    className={`py-2 px-2.5 text-left rounded-lg border transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600/20 text-white ring-1 ring-blue-500'
                        : 'border-gray-800 bg-gray-800/80 text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-semibold">{opt.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {opt.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleFitClick}
              data-testid="fit-to-one-page-btn"
              className="w-full py-2 px-3 rounded-lg border border-blue-500/60 bg-blue-600/20 hover:bg-blue-600/30 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ArrowsPointingInIcon className="h-4 w-4 text-blue-300 shrink-0" />
              <span>Fit to one page</span>
            </button>

            {fitFeedback && (
              <div
                role="status"
                aria-live="polite"
                data-testid="fit-to-one-page-status"
                data-fit-status={fitFeedback.status}
                className={`mt-2 rounded-lg border px-2.5 py-2 text-[11px] leading-snug ${
                  fitFeedback.status === 'cannot-fit'
                    ? 'border-amber-500/60 bg-amber-950/50 text-amber-200'
                    : fitFeedback.status === 'fitted'
                    ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-200'
                    : 'border-gray-700 bg-gray-800/80 text-gray-200'
                }`}
              >
                {fitFeedback.message}
              </div>
            )}
          </div>
        </section>

        {/* PROFILE PHOTO */}
        <section
          data-testid="theme-group-photo"
          aria-labelledby="theme-heading-photo"
          className="space-y-3"
        >
          <h4
            id="theme-heading-photo"
            className="text-[11px] font-bold uppercase tracking-widest text-blue-400 border-b border-gray-800 pb-1"
          >
            Profile Photo
          </h4>

          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-gray-300 block">
                Show Photo
              </span>
              {isAtsMode && (
                <span className="text-[10px] text-amber-400 block mt-0.5">
                  Hidden while ATS mode is enabled
                </span>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={resolvedPhoto.show && !isAtsMode}
              aria-label="Show profile photo"
              disabled={isAtsMode}
              data-testid="photo-show-toggle"
              onClick={handlePhotoShowToggle}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed ${
                resolvedPhoto.show && !isAtsMode ? 'bg-blue-600 cursor-pointer' : 'bg-gray-700 cursor-pointer'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                  resolvedPhoto.show && !isAtsMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Photo Shape
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {photoShapeOptions.map((opt) => {
                const isSelected = resolvedPhoto.shape === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={isAtsMode}
                    onClick={() => handlePhotoShapeSelect(opt.id)}
                    data-testid={`photo-shape-${opt.id}`}
                    className={`py-1.5 px-2 text-center rounded-md border text-[11px] font-medium transition-all disabled:opacity-40 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                        : 'border-gray-800 bg-gray-800/80 text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {opt.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Photo Size
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {photoSizeOptions.map((opt) => {
                const isSelected = resolvedPhoto.size === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={isAtsMode}
                    onClick={() => handlePhotoSizeSelect(opt.id)}
                    data-testid={`photo-size-${opt.id}`}
                    className={`py-1.5 px-2 text-center rounded-md border text-[11px] font-medium transition-all disabled:opacity-40 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                        : 'border-gray-800 bg-gray-800/80 text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {opt.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* GROUP 1: COLOURS */}
        <section
          data-testid="theme-group-colours"
          aria-labelledby="theme-heading-colours"
          className="space-y-3"
        >
          <h4
            id="theme-heading-colours"
            className="text-[11px] font-bold uppercase tracking-widest text-blue-400 border-b border-gray-800 pb-1"
          >
            Colours
          </h4>

          {/* Primary Color Palette */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-gray-300">
                Primary Colour
              </label>
              <span className="text-xs font-mono text-gray-400">
                {currentTheme.primaryColor || '#1e293b'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {colorOptions.map((c) => {
                const isSelected =
                  currentTheme.primaryColor?.toLowerCase() ===
                  c.value.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handlePrimaryColorSelect(c.value)}
                    title={c.name}
                    data-testid={`color-option-${c.id}`}
                    className={`w-6 h-6 rounded-full transition-transform focus:outline-none flex items-center justify-center ${
                      isSelected
                        ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-gray-900 shadow-md'
                        : 'hover:scale-105 opacity-90 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.value }}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-white drop-shadow"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}

              <label
                title="Custom Primary Color"
                className="relative w-6 h-6 rounded-full border border-dashed border-gray-600 hover:border-gray-400 flex items-center justify-center cursor-pointer overflow-hidden bg-gray-800"
              >
                <input
                  type="color"
                  value={currentTheme.primaryColor || '#1e293b'}
                  onChange={(e) => handlePrimaryColorSelect(e.target.value)}
                  data-testid="color-picker-input"
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
                <span className="text-[10px] text-gray-400 font-bold">+</span>
              </label>
            </div>
          </div>

          {/* Accent Color Palette */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-gray-300">
                Accent Colour
              </label>
              <span className="text-xs font-mono text-gray-400">
                {currentTheme.accentColor || currentTheme.primaryColor || '#2563eb'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {colorOptions.map((c) => {
                const effectiveAccent =
                  currentTheme.accentColor || currentTheme.primaryColor || '';
                const isSelected =
                  effectiveAccent.toLowerCase() === c.value.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleAccentColorSelect(c.value)}
                    title={`Accent: ${c.name}`}
                    data-testid={`accent-color-option-${c.id}`}
                    className={`w-6 h-6 rounded-full transition-transform focus:outline-none flex items-center justify-center ${
                      isSelected
                        ? 'scale-110 ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900 shadow-md'
                        : 'hover:scale-105 opacity-90 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                );
              })}

              <label
                title="Custom Accent Color"
                className="relative w-6 h-6 rounded-full border border-dashed border-gray-600 hover:border-gray-400 flex items-center justify-center cursor-pointer overflow-hidden bg-gray-800"
              >
                <input
                  type="color"
                  value={
                    currentTheme.accentColor ||
                    currentTheme.primaryColor ||
                    '#2563eb'
                  }
                  onChange={(e) => handleAccentColorSelect(e.target.value)}
                  data-testid="accent-color-picker-input"
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
                <span className="text-[10px] text-gray-400 font-bold">+</span>
              </label>
            </div>
          </div>
        </section>

        {/* GROUP 2: TYPOGRAPHY */}
        <section
          data-testid="theme-group-typography"
          aria-labelledby="theme-heading-typography"
          className="space-y-3"
        >
          <h4
            id="theme-heading-typography"
            className="text-[11px] font-bold uppercase tracking-widest text-blue-400 border-b border-gray-800 pb-1"
          >
            Typography
          </h4>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">
              Font Pairing
            </label>
            <div className="grid grid-cols-1 gap-2">
              {fontPairingOptions.map((pairing) => {
                const isSelected = currentTheme.fontPairingId === pairing.id;
                return (
                  <button
                    key={pairing.id}
                    type="button"
                    onClick={() => handleFontSelect(pairing.id)}
                    data-testid={`font-option-${pairing.id}`}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600/20 text-white font-medium ring-1 ring-blue-500'
                        : 'border-gray-800 bg-gray-800/60 text-gray-300 hover:bg-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span
                        className="font-medium text-sm text-white"
                        style={{ fontFamily: pairing.headingFont }}
                      >
                        {pairing.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-[11px] leading-snug">
                      {pairing.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="theme-font-scale"
                  className="text-xs font-medium text-gray-300"
                >
                  Font Scale
                </label>
                <span className="text-[11px] font-mono text-gray-400">
                  {Math.round(resolvedFontScale * 100)}%
                </span>
              </div>
              <input
                id="theme-font-scale"
                type="range"
                min={FIT_MIN_FONT_SCALE}
                max={1.15}
                step={0.05}
                value={resolvedFontScale}
                onChange={(e) => handleFontScaleChange(Number(e.target.value))}
                data-testid="font-scale-input"
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="theme-line-height"
                  className="text-xs font-medium text-gray-300"
                >
                  Line Height
                </label>
                <span className="text-[11px] font-mono text-gray-400">
                  {resolvedLineHeight.toFixed(2)}
                </span>
              </div>
              <input
                id="theme-line-height"
                type="range"
                min={FIT_MIN_LINE_HEIGHT}
                max={1.8}
                step={0.05}
                value={resolvedLineHeight}
                onChange={(e) => handleLineHeightChange(Number(e.target.value))}
                data-testid="line-height-input"
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Date Format
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {dateFormatOptions.map((opt) => {
                const activeFmt = currentTheme.dateFormat || 'MMM YYYY';
                const isSelected = activeFmt === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleDateFormatSelect(opt.id)}
                    data-testid={`date-format-${opt.id}`}
                    className={`py-1.5 px-2 text-center rounded-md border text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                        : 'border-gray-800 bg-gray-800/80 text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {opt.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* GROUP 3: SPACING */}
        <section
          data-testid="theme-group-spacing"
          aria-labelledby="theme-heading-spacing"
          className="space-y-3"
        >
          <h4
            id="theme-heading-spacing"
            className="text-[11px] font-bold uppercase tracking-widest text-blue-400 border-b border-gray-800 pb-1"
          >
            Spacing
          </h4>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Section Spacing
            </label>
            <div className="grid grid-cols-3 gap-2">
              {spacingOptions.map((spacing) => {
                const isSelected =
                  (currentTheme.sectionSpacing || 'normal') === spacing.id;
                return (
                  <button
                    key={spacing.id}
                    type="button"
                    onClick={() => handleSpacingSelect(spacing.id)}
                    data-testid={`spacing-option-${spacing.id}`}
                    className={`py-2 px-2 text-center rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                        : 'border-gray-800 bg-gray-800/80 text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {spacing.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Page Margins
            </label>
            <div className="grid grid-cols-3 gap-2">
              {pageMarginOptions.map((margin) => {
                const isSelected =
                  (currentTheme.pageMargins || 'normal') === margin.id;
                return (
                  <button
                    key={margin.id}
                    type="button"
                    onClick={() => handleMarginSelect(margin.id)}
                    data-testid={`margin-option-${margin.id}`}
                    className={`py-2 px-2 text-center rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                        : 'border-gray-800 bg-gray-800/80 text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {margin.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* GROUP 4: LAYOUT */}
        <section
          data-testid="theme-group-layout"
          aria-labelledby="theme-heading-layout"
          className="space-y-3"
        >
          <h4
            id="theme-heading-layout"
            className="text-[11px] font-bold uppercase tracking-widest text-blue-400 border-b border-gray-800 pb-1"
          >
            Layout
          </h4>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Section Heading Style
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {headingStyleOptions.map((opt) => {
                const isSelected =
                  (currentTheme.headingStyle || 'underline') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleHeadingStyleSelect(opt.id)}
                    data-testid={`heading-style-${opt.id}`}
                    className={`py-1.5 px-2 text-center rounded-md border text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                        : 'border-gray-800 bg-gray-800/80 text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {opt.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Skill Display Style
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {skillStyleOptions.map((opt) => {
                const isSelected =
                  (currentTheme.skillStyle || 'chips') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSkillStyleSelect(opt.id)}
                    data-testid={`skill-style-${opt.id}`}
                    className={`py-1.5 px-2 text-center rounded-md border text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                        : 'border-gray-800 bg-gray-800/80 text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {opt.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label
                htmlFor="theme-sidebar-width"
                className="text-xs font-medium text-gray-300"
              >
                Sidebar Width
              </label>
              <span className="text-[11px] font-mono text-gray-400">
                {resolvedSidebarWidth}%
                {!isSidebarLayout && templateLayout ? ' (sidebar templates)' : ''}
              </span>
            </div>
            <input
              id="theme-sidebar-width"
              type="range"
              min={25}
              max={42}
              step={1}
              value={resolvedSidebarWidth}
              onChange={(e) => handleSidebarWidthChange(Number(e.target.value))}
              data-testid="sidebar-width-input"
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>
        </section>
      </div>
    </div>
  );
};
