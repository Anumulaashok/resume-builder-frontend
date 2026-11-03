import React from 'react';
import { ThemeConfig } from '../types/resume';
import {
  fontPairingOptions,
  colorOptions,
  spacingOptions,
  defaultThemeConfig,
} from '../constants/themeConstants';
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ThemeCustomizationPanelProps {
  themeConfig?: ThemeConfig;
  onChange: (theme: ThemeConfig) => void;
  onClose: () => void;
}

export const ThemeCustomizationPanel: React.FC<ThemeCustomizationPanelProps> = ({
  themeConfig,
  onChange,
  onClose,
}) => {
  const currentTheme = { ...defaultThemeConfig, ...(themeConfig || {}) };

  const handleFontSelect = (fontId: string) => {
    const selectedPairing = fontPairingOptions.find((f) => f.id === fontId);
    if (!selectedPairing) return;

    onChange({
      ...currentTheme,
      fontPairingId: selectedPairing.id,
      headingFont: selectedPairing.headingFont,
      bodyFont: selectedPairing.bodyFont,
    });
  };

  const handleColorSelect = (hexValue: string) => {
    onChange({
      ...currentTheme,
      primaryColor: hexValue,
      headingColor: hexValue,
    });
  };

  const handleSpacingSelect = (spacingId: 'compact' | 'normal' | 'spacious') => {
    onChange({
      ...currentTheme,
      sectionSpacing: spacingId,
    });
  };

  const handleReset = () => {
    onChange({ ...defaultThemeConfig });
  };

  return (
    <div
      data-testid="theme-customization-panel"
      className="absolute top-4 right-4 z-30 w-80 max-w-[calc(100vw-2rem)] bg-gray-900/95 backdrop-blur border border-gray-700/80 rounded-xl shadow-2xl p-5 text-gray-200 print:hidden transition-all duration-200 max-h-[85vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="font-semibold text-white text-base">Theme Customization</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            title="Reset theme to defaults"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors text-xs flex items-center gap-1"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={onClose}
            aria-label="Dismiss theme panel"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Typography / Font Pairings */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Typography Pairing
          </label>
          <div className="grid grid-cols-1 gap-2">
            {fontPairingOptions.map((pairing) => {
              const isSelected = currentTheme.fontPairingId === pairing.id;
              return (
                <button
                  key={pairing.id}
                  onClick={() => handleFontSelect(pairing.id)}
                  data-testid={`font-option-${pairing.id}`}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-600/20 text-white font-medium ring-1 ring-blue-500'
                      : 'border-gray-800 bg-gray-800/60 text-gray-300 hover:bg-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm text-white" style={{ fontFamily: pairing.headingFont }}>
                      {pairing.name}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-[11px] leading-snug">{pairing.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent Color Palette */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Accent Color
            </label>
            <span className="text-xs font-mono text-gray-400">
              {currentTheme.primaryColor || '#1e293b'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5 items-center">
            {colorOptions.map((c) => {
              const isSelected =
                currentTheme.primaryColor?.toLowerCase() === c.value.toLowerCase();
              return (
                <button
                  key={c.id}
                  onClick={() => handleColorSelect(c.value)}
                  title={c.name}
                  data-testid={`color-option-${c.id}`}
                  className={`w-7 h-7 rounded-full transition-transform focus:outline-none flex items-center justify-center ${
                    isSelected
                      ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-gray-900 shadow-md'
                      : 'hover:scale-105 opacity-90 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value }}
                >
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}

            {/* Custom Color Input */}
            <label
              title="Custom Accent Color"
              className="relative w-7 h-7 rounded-full border border-dashed border-gray-600 hover:border-gray-400 flex items-center justify-center cursor-pointer overflow-hidden bg-gray-800"
            >
              <input
                type="color"
                value={currentTheme.primaryColor || '#1e293b'}
                onChange={(e) => handleColorSelect(e.target.value)}
                data-testid="color-picker-input"
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <span className="text-[10px] text-gray-400 font-bold">+</span>
            </label>
          </div>
        </div>

        {/* Layout Spacing */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Section Spacing
          </label>
          <div className="grid grid-cols-3 gap-2">
            {spacingOptions.map((spacing) => {
              const isSelected = currentTheme.sectionSpacing === spacing.id;
              return (
                <button
                  key={spacing.id}
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
      </div>
    </div>
  );
};
