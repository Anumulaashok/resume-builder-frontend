import React from 'react';
import { ISection } from '../../../types/resume';

export type TemplateVariant = 'modern' | 'professional';

export type SectionItemPatchUpdater = (
  sectionId: string,
  itemId: string,
  patch: Record<string, any>
) => void;

export interface SectionComponentProps {
  section: ISection;
  variant: TemplateVariant;
  readOnly?: boolean;
  onUpdateItem?: SectionItemPatchUpdater;
}

export interface VariantTokens {
  defaultHeadingColor: string;
  defaultPrimaryColor: string;
  defaultLinkColor: string;
  defaultItemSpacing: string;
  titleClassName: string;
  compactTitleClassName: string;
  subtitleClassName: string;
  subtitleStyle?: React.CSSProperties;
  secondaryMetaClassName: string;
  dateClassName: string;
  locationClassName: string;
  descriptionClassName: string;
  badgeClassName: string;
  techBadgeClassName: string;
  levelBadgeClassName: string;
  quoteBlockClassName: string;
  cardSurfaceClassName: string;
  linkClassName: string;
}

const BASE_LINK_CLASS =
  'underline decoration-slate-400/80 underline-offset-2 hover:decoration-current transition-colors print:decoration-slate-400';

export const VARIANT_TOKENS: Record<TemplateVariant, VariantTokens> = {
  modern: {
    defaultHeadingColor: '#111827',
    defaultPrimaryColor: '#334155',
    defaultLinkColor: '#2563eb',
    defaultItemSpacing: '0.875rem',
    titleClassName: 'text-[15px] font-semibold leading-snug',
    compactTitleClassName: 'text-[14px] font-semibold leading-snug',
    subtitleClassName: 'text-[13.5px] font-medium',
    subtitleStyle: { color: 'var(--theme-primary, #334155)' },
    secondaryMetaClassName: 'text-[13px] font-medium text-slate-600',
    dateClassName: 'text-xs font-medium text-slate-500 tabular-nums shrink-0',
    locationClassName: 'text-xs text-slate-500',
    descriptionClassName:
      'text-[13px] leading-relaxed text-slate-600 mt-1.5 block whitespace-pre-wrap break-words',
    badgeClassName:
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90 print:bg-slate-50 print:border-slate-300',
    techBadgeClassName:
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100/90 text-slate-800 border border-slate-200 print:bg-slate-50 print:border-slate-300',
    levelBadgeClassName:
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80 print:border-slate-300',
    quoteBlockClassName:
      'border-l-2 pl-3 mt-1.5 text-[13px] leading-relaxed text-slate-600',
    cardSurfaceClassName:
      'rounded-md border border-slate-200/80 bg-slate-50/50 px-3 py-2 print:bg-transparent print:border-slate-200',
    linkClassName: BASE_LINK_CLASS,
  },
  professional: {
    defaultHeadingColor: '#1e293b',
    defaultPrimaryColor: '#1e293b',
    defaultLinkColor: '#1e293b',
    defaultItemSpacing: '1rem',
    titleClassName: 'text-[15px] font-bold leading-snug',
    compactTitleClassName: 'text-[14px] font-bold leading-snug',
    subtitleClassName: 'text-[13.5px] font-semibold text-slate-700',
    subtitleStyle: undefined,
    secondaryMetaClassName: 'text-[13px] italic text-slate-600',
    dateClassName: 'text-xs font-semibold text-slate-500 tabular-nums shrink-0',
    locationClassName: 'text-xs italic text-slate-500',
    descriptionClassName:
      'text-[13px] leading-relaxed text-slate-600 mt-1.5 block whitespace-pre-wrap break-words',
    badgeClassName:
      'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-slate-50 text-slate-700 border border-slate-300/90 tracking-tight print:bg-white print:border-slate-400',
    techBadgeClassName:
      'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-slate-50 text-slate-800 border border-slate-300 tracking-tight print:bg-white print:border-slate-400',
    levelBadgeClassName:
      'inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] italic font-medium text-slate-600 border border-slate-300/80 bg-white print:border-slate-400',
    quoteBlockClassName:
      'border-l-2 border-slate-300 pl-3 mt-1.5 text-[13px] italic leading-relaxed text-slate-600',
    cardSurfaceClassName:
      'border-b border-slate-200/80 pb-2 print:border-slate-300',
    linkClassName: BASE_LINK_CLASS,
  },
};

export function getHeadingStyle(variant: TemplateVariant): React.CSSProperties {
  const tokens = VARIANT_TOKENS[variant];
  return {
    fontFamily: 'var(--theme-heading-font)',
    color: `var(--theme-heading-color, ${tokens.defaultHeadingColor})`,
  };
}

export function getLinkStyle(variant: TemplateVariant): React.CSSProperties {
  const tokens = VARIANT_TOKENS[variant];
  return {
    color: `var(--theme-primary, ${tokens.defaultLinkColor})`,
  };
}

export function getDescriptionStyle(): React.CSSProperties {
  return {
    color: 'var(--theme-text-color, inherit)',
  };
}
