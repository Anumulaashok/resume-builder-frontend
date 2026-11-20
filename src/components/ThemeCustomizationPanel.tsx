import React from 'react';
import { ThemeConfig } from '../types/resume';
import {
  fontPairingOptions,
  colorOptions,
  textColorOptions,
  spacingOptions,
  pageMarginOptions,
  headingStyleOptions,
  skillStyleOptions,
  dateFormatOptions,
  defaultThemeConfig,
  resolveFontScale,
  resolveTemplateDefaultTheme,
  PageMarginPreset,
  HeadingStyleOptionId,
  SkillStyleOptionId,
  DateFormatOptionId,
} from '../constants/themeConstants';
import { TemplateLayout } from './templates/registry';
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ThemeCustomizationPanelProps {
  themeConfig?: ThemeConfig;
  templateDefaultTheme?: Partial<ThemeConfig>;
  templateLayout?: TemplateLayout;
  onChange: (theme: ThemeConfig) => void;
  onKeysCustomised?: (keys: Array<keyof ThemeConfig>) => void;
  onReset?: (theme: ThemeConfig) => void;
  onClose: () => void;
}

export const ThemeCustomizationPanel: React.FC<ThemeCustomizationPanelProps> = ({
  themeConfig,
  templateDefaultTheme,
  templateLayout,
  onChange,
  onKeysCustomised,
  onReset,
  onClose,
}) => {
  const baseDefaults = resolveTemplateDefaultTheme(templateDefaultTheme);
  const currentTheme: ThemeConfig = {
    ...baseDefaults,
    ...(themeConfig || {}),
  };

  const emitUpdate = (
    patch: Partial<ThemeConfig>,
    changedKeys: Array<keyof ThemeConfig>
  ) => {
    if (onKeysCustomised) {
      onKeysCustomised(changedKeys);
    }
    onChange({
      ...(themeConfig || {}),
      ...patch,
    });
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

  const handleTextColorSelect = (hexValue: string) => {
    emitUpdate({ textColor: hexValue }, ['textColor']);
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
    const resetTarget = templateDefaultTheme
      ? resolveTemplateDefaultTheme(templateDefaultTheme)
      : { ...defaultThemeConfig };
    if (onReset) {
      onReset(resetTarget);
    } else {
      onChange(resetTarget);
    }
  };

  const resolvedFontScale = resolveFontScale(themeConfig, templateDefaultTheme);
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
      className="absolute top-4 right-4 z-30 w-84 sm:w-96 max-w-[calc(100vw-2rem)] bg-gray-900/95 backdrop-blur border border-gray-700/80 rounded-xl shadow-2xl p-5 text-gray-200 print:hidden transition-all duration-200 max-h-[85vh] overflow-y-auto"
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

          {/* Body Text Color Palette */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-gray-300">
                Body Text Colour
              </label>
              <span className="text-xs font-mono text-gray-400">
                {currentTheme.textColor || '#374151'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {textColorOptions.map((c) => {
                const effectiveText = currentTheme.textColor || '#374151';
                const isSelected =
                  effectiveText.toLowerCase() === c.value.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleTextColorSelect(c.value)}
                    title={`Body Text: ${c.name}`}
                    data-testid={`text-color-option-${c.id}`}
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
                title="Custom Body Text Color"
                className="relative w-6 h-6 rounded-full border border-dashed border-gray-600 hover:border-gray-400 flex items-center justify-center cursor-pointer overflow-hidden bg-gray-800"
              >
                <input
                  type="color"
                  value={currentTheme.textColor || '#374151'}
                  onChange={(e) => handleTextColorSelect(e.target.value)}
                  data-testid="text-color-picker-input"
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
                min={0.85}
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
                min={1.25}
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
