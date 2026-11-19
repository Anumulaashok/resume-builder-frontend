import React from 'react';
import { HeadingStyleVariant, useTemplateContext } from './TemplateContext';

export interface SectionHeadingProps {
  title: string;
  variant?: HeadingStyleVariant;
  accentBorder?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  variant,
  accentBorder = false,
  className = '',
  style,
}) => {
  const ctx = useTemplateContext();
  const effectiveVariant: HeadingStyleVariant = variant || ctx.headingStyle || 'underline';

  const baseStyle: React.CSSProperties = {
    fontFamily: 'var(--theme-heading-font)',
    color: 'var(--theme-primary, #111827)',
    ...style,
  };

  if (effectiveVariant === 'bar') {
    return (
      <h2
        data-heading-variant="bar"
        className={`text-xs font-bold uppercase tracking-[0.14em] pl-2.5 py-0.5 mb-3 border-l-[3px] break-after-avoid ${className}`}
        style={{
          ...baseStyle,
          borderLeftColor: 'var(--theme-accent, var(--theme-primary, #2563eb))',
        }}
      >
        {title}
      </h2>
    );
  }

  if (effectiveVariant === 'caps') {
    return (
      <h2
        data-heading-variant="caps"
        className={`text-[11px] font-bold uppercase tracking-[0.22em] mb-2.5 break-after-avoid ${className}`}
        style={{
          ...baseStyle,
          color: 'var(--theme-accent, var(--theme-primary, #111827))',
        }}
      >
        {title}
      </h2>
    );
  }

  if (effectiveVariant === 'pill') {
    return (
      <div className={`mb-3 break-after-avoid ${className}`}>
        <h2
          data-heading-variant="pill"
          className="inline-block text-[11px] font-bold uppercase tracking-[0.14em] px-2.5 py-0.5 rounded-full border bg-slate-100/80 print:bg-slate-50"
          style={{
            ...baseStyle,
            borderColor: 'var(--theme-accent, var(--theme-primary, #cbd5e1))',
            color: 'var(--theme-primary, #111827)',
          }}
        >
          {title}
        </h2>
      </div>
    );
  }

  if (effectiveVariant === 'side-label') {
    return (
      <h2
        data-heading-variant="side-label"
        className={`flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] mb-3 break-after-avoid ${className}`}
        style={baseStyle}
      >
        <span className="shrink-0">{title}</span>
        <span
          aria-hidden="true"
          className="h-px flex-1 border-b"
          style={{
            borderBottomColor: 'var(--theme-accent, var(--theme-primary, #cbd5e1))',
            opacity: 0.45,
          }}
        />
      </h2>
    );
  }

  // Default: 'underline'
  return (
    <h2
      data-heading-variant="underline"
      className={`text-xs font-bold uppercase tracking-[0.14em] pb-1.5 mb-3 border-b border-slate-200 break-after-avoid ${className}`}
      style={{
        ...baseStyle,
        ...(accentBorder
          ? {
              borderBottomColor: 'var(--theme-accent, var(--theme-primary, #cbd5e1))',
            }
          : {}),
      }}
    >
      {title}
    </h2>
  );
};
