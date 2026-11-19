import React, { useEffect, useRef, useState } from 'react';
import { ISection } from '../../../types/resume';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  formatLinkLabel,
  normalizeHref,
  safeString,
} from '../templateHelpers';
import {
  getLinkStyle,
  TemplateVariant,
  VARIANT_TOKENS,
} from './types';

export function getEnabledItems<T extends Record<string, any> = Record<string, any>>(
  section: ISection | null | undefined
): T[] {
  if (!section || !Array.isArray(section.content)) {
    return [];
  }
  return section.content.filter(
    (item): item is any =>
      Boolean(item) && typeof item === 'object' && item.enabled !== false
  ) as T[];
}

export const SectionItemWrapper: React.FC<{
  isLast: boolean;
  variant: TemplateVariant;
  className?: string;
  dataSectionItem?: string;
  children: React.ReactNode;
}> = ({ isLast, variant, className = '', dataSectionItem, children }) => {
  const tokens = VARIANT_TOKENS[variant];
  const spacingClass = isLast
    ? ''
    : variant === 'professional'
    ? 'mb-[var(--theme-item-spacing,1rem)]'
    : 'mb-[var(--theme-item-spacing,0.875rem)]';
  const itemStyle: React.CSSProperties | undefined = isLast
    ? undefined
    : { marginBottom: `var(--theme-item-spacing, ${tokens.defaultItemSpacing})` };

  return (
    <div
      data-section-item={dataSectionItem}
      className={`break-inside-avoid ${spacingClass} ${className}`.trim()}
      style={itemStyle}
    >
      {children}
    </div>
  );
};

export const SectionHighlights: React.FC<{
  highlights: string[];
}> = ({ highlights }) => {
  if (!Array.isArray(highlights) || highlights.length === 0) return null;
  return (
    <ul className="mt-1.5 list-disc pl-4 space-y-0.5 text-[13px] leading-relaxed text-slate-600">
      {highlights.map((bullet, idx) => (
        <li key={idx}>{bullet}</li>
      ))}
    </ul>
  );
};

export const SectionBadgeList: React.FC<{
  items: string[];
  variant: TemplateVariant;
  technical?: boolean;
  className?: string;
}> = ({ items, variant, technical = false, className = 'mt-1.5' }) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const tokens = VARIANT_TOKENS[variant];
  const badgeClass = technical ? tokens.techBadgeClassName : tokens.badgeClassName;

  return (
    <div
      data-testid={`section-badges-${variant}`}
      className={`flex flex-wrap gap-1.5 ${className}`.trim()}
    >
      {items.map((item, idx) => (
        <span key={`${item}-${idx}`} className={badgeClass}>
          {item}
        </span>
      ))}
    </div>
  );
};

export interface SectionLinkProps {
  url?: string;
  variant: TemplateVariant;
  readOnly?: boolean;
  onChange?: (nextUrl: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export const SectionLink: React.FC<SectionLinkProps> = ({
  url,
  variant,
  readOnly = false,
  onChange,
  placeholder = 'Add link',
  label,
  className = 'text-xs font-medium',
}) => {
  const cleanUrl = safeString(url).trim();
  const isInteractive = !readOnly && Boolean(onChange);
  const [isEditing, setIsEditing] = useState(false);
  const [draftUrl, setDraftUrl] = useState(cleanUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftUrl(cleanUrl);
  }, [cleanUrl]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const tokens = VARIANT_TOKENS[variant];
  const linkStyle = getLinkStyle(variant);

  if (!isInteractive) {
    if (!cleanUrl) return null;
    return (
      <a
        href={normalizeHref(cleanUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} ${tokens.linkClassName}`.trim()}
        style={linkStyle}
      >
        {label || formatLinkLabel(cleanUrl)}
      </a>
    );
  }

  const commitSave = () => {
    setIsEditing(false);
    const nextTrimmed = draftUrl.trim();
    if (nextTrimmed !== cleanUrl && onChange) {
      onChange(nextTrimmed);
    }
  };

  if (isEditing) {
    return (
      <span className="inline-flex items-center">
        <input
          ref={inputRef}
          type="text"
          aria-label={placeholder}
          placeholder="https://..."
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          onBlur={commitSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitSave();
            } else if (e.key === 'Escape') {
              setDraftUrl(cleanUrl);
              setIsEditing(false);
            }
          }}
          className="bg-white border border-primary-500 rounded px-2 py-0.5 text-xs text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[180px]"
        />
      </span>
    );
  }

  if (!cleanUrl) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-xs text-neutral-400 italic hover:text-slate-600 hover:bg-neutral-100 rounded px-1 transition-colors print:hidden"
      >
        {placeholder}
      </button>
    );
  }

  return (
    <a
      href={normalizeHref(cleanUrl)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      title="Click to edit link (Ctrl/Cmd+Click to open)"
      className={`${className} ${tokens.linkClassName} cursor-pointer hover:bg-neutral-100 rounded px-0.5 transition-colors`.trim()}
      style={linkStyle}
    >
      {label || formatLinkLabel(cleanUrl)}
    </a>
  );
};

export const SectionDateField: React.FC<{
  value: string;
  variant: TemplateVariant;
  readOnly?: boolean;
  placeholder?: string;
  onChange?: (nextDate: string) => void;
}> = ({ value, variant, readOnly = false, placeholder = 'Date', onChange }) => {
  const tokens = VARIANT_TOKENS[variant];
  const isInteractive = !readOnly && Boolean(onChange);

  if (!isInteractive) {
    if (!value) return null;
    return <span className={tokens.dateClassName}>{value}</span>;
  }

  return (
    <InlineEdit
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      textClassName={tokens.dateClassName}
    />
  );
};
