import type { ThemeConfig } from '../types/resume';

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

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  layout: TemplateLayout;
  atsFriendly: boolean;
  usesTables?: boolean;
  usesIcons?: boolean;
  defaultTheme: Partial<ThemeConfig>;
}

export const templateMetadataRegistry: TemplateMetadata[] = [
  {
    id: 'modern',
    name: 'Modern',
    description:
      'Balanced single-column layout with centered contact header and clean skill chips.',
    category: 'modern',
    layout: 'single',
    atsFriendly: true,
    usesTables: false,
    usesIcons: false,
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
  },
  {
    id: 'professional',
    name: 'Professional',
    description:
      'Classic serif typography with split contact header and inline comma-separated skills.',
    category: 'professional',
    layout: 'single',
    atsFriendly: true,
    usesTables: false,
    usesIcons: false,
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
  },
  {
    id: 'minimal',
    name: 'Clean Slate',
    description:
      'Airy minimalist single-column layout with tracked small-caps headings.',
    category: 'simple',
    layout: 'single',
    atsFriendly: true,
    usesTables: false,
    usesIcons: false,
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
  },
  {
    id: 'tech-split',
    name: 'Systems Split',
    description:
      'Engineering-focused layout with monospace headings and a right-hand skills sidebar.',
    category: 'tech',
    layout: 'sidebar-right',
    atsFriendly: true,
    usesTables: false,
    usesIcons: false,
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
  },
  {
    id: 'creative-sidebar',
    name: 'Studio Sidebar',
    description:
      'Expressive left-sidebar layout with pill section badges and visual skill proficiency bars.',
    category: 'creative',
    layout: 'sidebar-left',
    atsFriendly: false,
    usesTables: false,
    usesIcons: true,
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
  },
  {
    id: 'two-column',
    name: 'Editorial Grid',
    description:
      'Refined two-column grid pairing serif display titles with side-rule headings and dot ratings.',
    category: 'modern',
    layout: 'two-column',
    atsFriendly: true,
    usesTables: false,
    usesIcons: true,
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
  },
  {
    id: 'classic',
    name: 'Classic',
    description:
      'Conservative serif layout with centered header, inline contact line, and thin full-width heading rules.',
    category: 'professional',
    layout: 'single',
    atsFriendly: true,
    usesTables: false,
    usesIcons: false,
    defaultTheme: {
      fontPairingId: 'classic-serif',
      primaryColor: '#1e293b',
      accentColor: '#334155',
      textColor: '#1f2937',
      headingColor: '#111827',
      sectionSpacing: 'normal',
      pageMargins: 'normal',
      headingStyle: 'underline',
      skillStyle: 'comma',
      fontScale: 1,
      lineHeight: 1.5,
    },
  },
  {
    id: 'executive',
    name: 'Executive',
    description:
      'Authoritative single-column layout with a left-accented name block, emphasised summary, and tracked uppercase headings.',
    category: 'professional',
    layout: 'single',
    atsFriendly: true,
    usesTables: false,
    usesIcons: false,
    defaultTheme: {
      fontPairingId: 'elegant-hybrid',
      primaryColor: '#1e293b',
      accentColor: '#2563eb',
      textColor: '#334155',
      headingColor: '#0f172a',
      sectionSpacing: 'normal',
      pageMargins: 'normal',
      headingStyle: 'caps',
      skillStyle: 'columns',
      fontScale: 1,
      lineHeight: 1.5,
    },
  },
  {
    id: 'compact',
    name: 'Compact',
    description:
      'Dense single-column layout with tight spacing, right-aligned dates, and comma-separated skills to fit experienced profiles on one page.',
    category: 'simple',
    layout: 'single',
    atsFriendly: true,
    usesTables: false,
    usesIcons: false,
    defaultTheme: {
      fontPairingId: 'modern-sans',
      primaryColor: '#1e293b',
      accentColor: '#334155',
      textColor: '#334155',
      headingColor: '#0f172a',
      sectionSpacing: 'compact',
      pageMargins: 'narrow',
      headingStyle: 'underline',
      skillStyle: 'comma',
      fontScale: 0.85,
      lineHeight: 1.3,
    },
  },
  {
    id: 'timeline',
    name: 'Timeline',
    description:
      'Chronological layout placing experience and education along a vertical accent timeline with left-rail dates.',
    category: 'creative',
    layout: 'single',
    atsFriendly: false,
    usesTables: false,
    usesIcons: true,
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
  },
  {
    id: 'bold-header',
    name: 'Bold Header',
    description:
      'Full-width accent header band with circular initials badge and structured card-like sections below.',
    category: 'creative',
    layout: 'single',
    atsFriendly: false,
    usesTables: false,
    usesIcons: true,
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
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description:
      'Refined serif-and-sans editorial layout with initials monogram, thin accent rules, and centered headings.',
    category: 'creative',
    layout: 'single',
    atsFriendly: false,
    usesTables: false,
    usesIcons: true,
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
  },
  {
    id: 'accent-sidebar',
    name: 'Accent Sidebar',
    description:
      'Full-height solid accent sidebar with monogram badge and white typography paired with a crisp main column.',
    category: 'modern',
    layout: 'sidebar-left',
    atsFriendly: false,
    usesTables: false,
    usesIcons: true,
    defaultTheme: {
      fontPairingId: 'modern-sans',
      primaryColor: '#1e293b',
      accentColor: '#2563eb',
      textColor: '#334155',
      headingColor: '#0f172a',
      sectionSpacing: 'normal',
      pageMargins: 'narrow',
      headingStyle: 'underline',
      skillStyle: 'chips',
      sidebarWidth: 33,
      fontScale: 0.98,
      lineHeight: 1.5,
    },
  },
  {
    id: 'banded',
    name: 'Banded',
    description:
      'Structured horizontal section bands with a narrow side-rule label rail and subtle alternating row tints.',
    category: 'professional',
    layout: 'single',
    atsFriendly: true,
    usesTables: false,
    usesIcons: false,
    defaultTheme: {
      fontPairingId: 'modern-sans',
      primaryColor: '#1e293b',
      accentColor: '#0f766e',
      textColor: '#334155',
      headingColor: '#0f172a',
      sectionSpacing: 'normal',
      pageMargins: 'narrow',
      headingStyle: 'side-label',
      skillStyle: 'columns',
      fontScale: 0.97,
      lineHeight: 1.48,
    },
  },
  {
    id: 'developer',
    name: 'Developer',
    description:
      'Clean sans-serif engineering layout with monospace date and stack accents, grouped skill chips, emphasised projects, and prominent GitHub and portfolio links.',
    category: 'tech',
    layout: 'single',
    atsFriendly: true,
    usesTables: true,
    usesIcons: false,
    defaultTheme: {
      fontPairingId: 'modern-sans',
      primaryColor: '#0f172a',
      accentColor: '#0284c7',
      textColor: '#334155',
      headingColor: '#0f172a',
      sectionSpacing: 'compact',
      pageMargins: 'normal',
      headingStyle: 'bar',
      skillStyle: 'chips',
      fontScale: 0.98,
      lineHeight: 1.48,
    },
  },
  {
    id: 'startup',
    name: 'Startup',
    description:
      'High-impact two-tone header layout with accent section pills, highlighted summary callout, emphasised bullet metrics, and a print-ready sidebar.',
    category: 'tech',
    layout: 'sidebar-right',
    atsFriendly: false,
    usesTables: true,
    usesIcons: true,
    defaultTheme: {
      fontPairingId: 'modern-sans',
      primaryColor: '#0f172a',
      accentColor: '#ea580c',
      textColor: '#334155',
      headingColor: '#0f172a',
      sectionSpacing: 'compact',
      pageMargins: 'narrow',
      headingStyle: 'pill',
      skillStyle: 'chips',
      sidebarWidth: 32,
      fontScale: 0.97,
      lineHeight: 1.48,
    },
  },
  {
    id: 'academic',
    name: 'Academic CV',
    description:
      'Multi-page curriculum vitae in conservative serif with education first, numbered citation-style publications, honors, courses, and references.',
    category: 'professional',
    layout: 'single',
    atsFriendly: true,
    usesTables: true,
    usesIcons: false,
    defaultTheme: {
      fontPairingId: 'classic-serif',
      primaryColor: '#1e293b',
      accentColor: '#7f1d1d',
      textColor: '#1f2937',
      headingColor: '#111827',
      sectionSpacing: 'normal',
      pageMargins: 'normal',
      headingStyle: 'underline',
      skillStyle: 'comma',
      fontScale: 0.96,
      lineHeight: 1.48,
    },
  },
];

export function getTemplateMetadata(id?: string | null): TemplateMetadata {
  const fallback =
    templateMetadataRegistry.find((t) => t.id === 'modern') ||
    templateMetadataRegistry[0];
  if (!id || typeof id !== 'string') {
    return fallback;
  }
  const normalized = id.trim().toLowerCase();
  return (
    templateMetadataRegistry.find((t) => t.id.toLowerCase() === normalized) ||
    fallback
  );
}
