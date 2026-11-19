import React from 'react';
import { IResume, ThemeConfig } from '../../types/resume';
import { fontPairingOptions } from '../../constants/themeConstants';
import { ModernTemplate } from './ModernTemplate';
import { ProfessionalTemplate } from './ProfessionalTemplate';
import { MinimalTemplate } from './MinimalTemplate';
import { TechSplitTemplate } from './TechSplitTemplate';
import { CreativeSidebarTemplate } from './CreativeSidebarTemplate';
import { ExecutiveTwoColumnTemplate } from './ExecutiveTwoColumnTemplate';
import { TimelineTemplate } from './TimelineTemplate';
import { BoldHeaderTemplate } from './BoldHeaderTemplate';
import { ElegantTemplate } from './ElegantTemplate';

export type TemplateCategory =
  | 'simple'
  | 'professional'
  | 'modern'
  | 'creative'
  | 'tech';

export type TemplateLayout =
  | 'single'
  | 'two-column'
  | 'sidebar-left'
  | 'sidebar-right';

export interface TemplateComponentProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
  readOnly?: boolean;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  layout: TemplateLayout;
  atsFriendly: boolean;
  defaultTheme: Partial<ThemeConfig>;
  component: React.ComponentType<TemplateComponentProps>;
}

export const templateRegistry: TemplateDefinition[] = [
  {
    id: 'modern',
    name: 'Modern',
    description:
      'Balanced single-column layout with centered contact header and clean skill chips.',
    category: 'modern',
    layout: 'single',
    atsFriendly: true,
    defaultTheme: {
      fontPairingId: 'modern-sans',
      primaryColor: '#1e293b',
      accentColor: '#2563eb',
      textColor: '#374151',
      headingColor: '#111827',
      sectionSpacing: 'normal',
      pageMargins: 'normal',
      headingStyle: 'underline',
      skillStyle: 'chips',
      fontScale: 1,
      lineHeight: 1.5,
    },
    component: ModernTemplate,
  },
  {
    id: 'professional',
    name: 'Professional',
    description:
      'Classic serif typography with split contact header and inline comma-separated skills.',
    category: 'professional',
    layout: 'single',
    atsFriendly: true,
    defaultTheme: {
      fontPairingId: 'classic-serif',
      primaryColor: '#1e293b',
      accentColor: '#1e293b',
      textColor: '#334155',
      headingColor: '#1e293b',
      sectionSpacing: 'normal',
      pageMargins: 'normal',
      headingStyle: 'underline',
      skillStyle: 'comma',
      fontScale: 1,
      lineHeight: 1.5,
    },
    component: ProfessionalTemplate,
  },
  {
    id: 'minimal',
    name: 'Clean Slate',
    description:
      'Airy minimalist single-column layout with tracked small-caps headings.',
    category: 'simple',
    layout: 'single',
    atsFriendly: true,
    defaultTheme: {
      fontPairingId: 'modern-sans',
      primaryColor: '#374151',
      accentColor: '#475569',
      textColor: '#374151',
      headingColor: '#111827',
      sectionSpacing: 'spacious',
      pageMargins: 'normal',
      headingStyle: 'caps',
      skillStyle: 'comma',
      fontScale: 1,
      lineHeight: 1.55,
    },
    component: MinimalTemplate,
  },
  {
    id: 'tech-split',
    name: 'Systems Split',
    description:
      'Engineering-focused layout with monospace headings and a right-hand skills sidebar.',
    category: 'tech',
    layout: 'sidebar-right',
    atsFriendly: true,
    defaultTheme: {
      fontPairingId: 'technical-mono',
      primaryColor: '#0f766e',
      accentColor: '#0f766e',
      textColor: '#334155',
      headingColor: '#0f172a',
      sectionSpacing: 'compact',
      pageMargins: 'narrow',
      headingStyle: 'bar',
      skillStyle: 'chips',
      sidebarWidth: 32,
      fontScale: 0.96,
      lineHeight: 1.45,
    },
    component: TechSplitTemplate,
  },
  {
    id: 'creative-sidebar',
    name: 'Studio Sidebar',
    description:
      'Expressive left-sidebar layout with pill section badges and visual skill proficiency bars.',
    category: 'creative',
    layout: 'sidebar-left',
    atsFriendly: false,
    defaultTheme: {
      fontPairingId: 'elegant-hybrid',
      primaryColor: '#7c3aed',
      accentColor: '#7c3aed',
      textColor: '#374151',
      headingColor: '#1e1b4b',
      sectionSpacing: 'normal',
      pageMargins: 'narrow',
      headingStyle: 'pill',
      skillStyle: 'bars',
      sidebarWidth: 33,
      fontScale: 0.98,
      lineHeight: 1.5,
    },
    component: CreativeSidebarTemplate,
  },
  {
    id: 'two-column',
    name: 'Editorial Grid',
    description:
      'Refined two-column grid pairing serif display titles with side-rule headings and dot ratings.',
    category: 'modern',
    layout: 'two-column',
    atsFriendly: true,
    defaultTheme: {
      fontPairingId: 'elegant-hybrid',
      primaryColor: '#2563eb',
      accentColor: '#2563eb',
      textColor: '#334155',
      headingColor: '#0f172a',
      sectionSpacing: 'compact',
      pageMargins: 'narrow',
      headingStyle: 'side-label',
      skillStyle: 'dots',
      fontScale: 0.96,
      lineHeight: 1.45,
    },
    component: ExecutiveTwoColumnTemplate,
  },
  {
    id: 'timeline',
    name: 'Timeline',
    description:
      'Chronological layout placing experience and education along a vertical accent timeline with left-rail dates.',
    category: 'creative',
    layout: 'single',
    atsFriendly: false,
    defaultTheme: {
      fontPairingId: 'modern-sans',
      primaryColor: '#1e293b',
      accentColor: '#059669',
      textColor: '#374151',
      headingColor: '#0f172a',
      sectionSpacing: 'normal',
      pageMargins: 'normal',
      headingStyle: 'side-label',
      skillStyle: 'chips',
      fontScale: 0.98,
      lineHeight: 1.5,
    },
    component: TimelineTemplate,
  },
  {
    id: 'bold-header',
    name: 'Bold Header',
    description:
      'Full-width accent header band with circular initials badge and structured card-like sections below.',
    category: 'creative',
    layout: 'single',
    atsFriendly: false,
    defaultTheme: {
      fontPairingId: 'modern-sans',
      primaryColor: '#1e293b',
      accentColor: '#991b1b',
      textColor: '#374151',
      headingColor: '#111827',
      sectionSpacing: 'compact',
      pageMargins: 'narrow',
      headingStyle: 'bar',
      skillStyle: 'chips',
      fontScale: 0.96,
      lineHeight: 1.45,
    },
    component: BoldHeaderTemplate,
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description:
      'Refined serif-and-sans editorial layout with initials monogram, thin accent rules, and centered headings.',
    category: 'creative',
    layout: 'single',
    atsFriendly: false,
    defaultTheme: {
      fontPairingId: 'elegant-hybrid',
      primaryColor: '#1e293b',
      accentColor: '#b45309',
      textColor: '#374151',
      headingColor: '#111827',
      sectionSpacing: 'compact',
      pageMargins: 'normal',
      headingStyle: 'underline',
      skillStyle: 'comma',
      fontScale: 0.98,
      lineHeight: 1.52,
    },
    component: ElegantTemplate,
  },
];

export function getTemplate(id?: string | null): TemplateDefinition {
  const fallback =
    templateRegistry.find((t) => t.id === 'modern') || templateRegistry[0];
  if (!id || typeof id !== 'string') {
    return fallback;
  }
  const normalized = id.trim().toLowerCase();
  return (
    templateRegistry.find((t) => t.id.toLowerCase() === normalized) || fallback
  );
}

export function mergeTemplateTheme(
  currentTheme: ThemeConfig | undefined,
  previousTemplateDefaults: Partial<ThemeConfig> | undefined,
  nextTemplateDefaults: Partial<ThemeConfig>,
  explicitlyCustomisedKeys?: ReadonlySet<keyof ThemeConfig>
): ThemeConfig {
  const merged: ThemeConfig = { ...nextTemplateDefaults };

  if (merged.fontPairingId && !merged.headingFont && !merged.bodyFont) {
    const nextPairing = fontPairingOptions.find((f) => f.id === merged.fontPairingId);
    if (nextPairing) {
      merged.headingFont = nextPairing.headingFont;
      merged.bodyFont = nextPairing.bodyFont;
    }
  }

  if (!currentTheme) {
    return merged;
  }

  const prevResolved: Partial<ThemeConfig> = { ...(previousTemplateDefaults || {}) };
  if (prevResolved.fontPairingId && !prevResolved.headingFont && !prevResolved.bodyFont) {
    const prevPairing = fontPairingOptions.find((f) => f.id === prevResolved.fontPairingId);
    if (prevPairing) {
      prevResolved.headingFont = prevPairing.headingFont;
      prevResolved.bodyFont = prevPairing.bodyFont;
    }
  }

  (Object.keys(currentTheme) as Array<keyof ThemeConfig>).forEach((key) => {
    const val = currentTheme[key];
    if (val === undefined) return;

    const matchesPrevDefault =
      prevResolved[key] !== undefined && prevResolved[key] === val;
    const isCustomised =
      Boolean(explicitlyCustomisedKeys?.has(key)) || !matchesPrevDefault;

    if (isCustomised) {
      (merged as Record<string, unknown>)[key] = val;
    }
  });

  return merged;
}
