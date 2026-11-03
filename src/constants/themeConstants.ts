import React from 'react';
import { ThemeConfig } from '../types/resume';

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
};

export function getThemeStyles(themeConfig?: ThemeConfig): React.CSSProperties {
  const activeTheme = { ...defaultThemeConfig, ...(themeConfig || {}) };
  const spacing =
    spacingOptions.find((s) => s.id === activeTheme.sectionSpacing) || spacingOptions[1];
  const fontPairing =
    fontPairingOptions.find((f) => f.id === activeTheme.fontPairingId) || fontPairingOptions[0];

  const headingFont = activeTheme.headingFont || fontPairing.headingFont;
  const bodyFont = activeTheme.bodyFont || fontPairing.bodyFont;
  const primaryColor = activeTheme.primaryColor || '#1e293b';

  return {
    '--theme-primary': primaryColor,
    '--theme-heading-font': headingFont,
    '--theme-body-font': bodyFont,
    '--theme-section-spacing': spacing.sectionSpacing,
    '--theme-item-spacing': spacing.itemSpacing,
    '--theme-text-color': activeTheme.textColor || '#374151',
    '--theme-heading-color': activeTheme.headingColor || primaryColor,
  } as React.CSSProperties;
}
