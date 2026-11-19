import React, { useEffect, useRef, useState } from 'react';
import { IResume } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import {
  ContactRow,
  Description,
  HeaderWithPhoto,
  SectionHeading,
  SectionRenderer,
  TemplateProvider,
  useTemplateContext,
} from './shared';

interface TemplateProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
  readOnly?: boolean;
}

const CompactTemplateContent: React.FC = () => {
  const { resume, readOnly, updateBasics } = useTemplateContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const [enablePrintPageRule, setEnablePrintPageRule] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (el && !el.closest('[data-testid^="template-thumbnail-"]')) {
      setEnablePrintPageRule(true);
    }
  }, []);

  if (!resume) return null;

  const pageSizeCss = resume.themeConfig?.pageSize === 'Letter' ? 'Letter' : 'A4';
  const basics = resume.content?.basics || {};
  const summaryValue = basics.summary ?? resume.summary ?? '';
  const hasSummaryText = Boolean(summaryValue && summaryValue.trim());
  const showSummary = readOnly
    ? hasSummaryText
    : basics.summary !== undefined || resume.summary !== undefined;

  const hasLabelText = Boolean(basics.label && basics.label.trim());
  const hasLabel = readOnly ? hasLabelText : true;

  const hasEnabledSections = (resume.content?.sections || []).some(
    (sec) => sec && sec.enabled !== false
  );

  return (
    <div
      ref={rootRef}
      data-template-id="compact"
      className="bg-white [&_h2]:mb-1.5 [&_h2]:pb-1 [&_ul]:mt-0.5 [&_ul]:space-y-0 [&_.tabular-nums]:ml-auto [&_.tabular-nums]:text-right"
      style={{
        padding: 'var(--theme-page-margin, 1.25cm)',
        fontFamily: 'var(--theme-body-font, inherit)',
        color: 'var(--theme-text-color, #334155)',
        fontSize: 'var(--theme-base-font-size, 11.48px)',
        lineHeight: 'var(--theme-line-height, 1.3)',
      }}
    >
      {enablePrintPageRule && (
        <style>{`
          @page { size: ${pageSizeCss}; margin: 1.05cm 0; }
          @media print {
            [data-template-id="compact"] {
              padding-top: 0.2cm !important;
              padding-bottom: 0.2cm !important;
            }
          }
        `}</style>
      )}
      <header
        className="pb-2 border-b break-inside-avoid"
        style={{
          borderBottomColor: 'var(--theme-primary, #1e293b)',
          marginBottom: 'var(--theme-section-spacing, 1rem)',
        }}
      >
        <HeaderWithPhoto>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2 min-w-0">
              <InlineEdit
                value={basics.name || ''}
                onChange={readOnly ? undefined : (v) => updateBasics('name', v)}
                readOnly={readOnly}
                textClassName="text-[22px] font-bold tracking-tight leading-tight"
                style={{
                  fontFamily: 'var(--theme-heading-font)',
                  color: 'var(--theme-heading-color, #0f172a)',
                }}
                placeholder="Your Name"
              />
              {hasLabel && (
                <>
                  <span
                    className={`text-slate-400 text-xs ${
                      !hasLabelText ? 'print:hidden' : ''
                    }`}
                    aria-hidden="true"
                  >
                    |
                  </span>
                  <InlineEdit
                    value={basics.label || ''}
                    onChange={readOnly ? undefined : (v) => updateBasics('label', v)}
                    readOnly={readOnly}
                    textClassName="text-[1.02em] font-semibold"
                    style={{
                      color: 'var(--theme-accent, var(--theme-primary, #334155))',
                    }}
                    placeholder="Professional Title"
                  />
                </>
              )}
            </div>
          </div>
          <ContactRow
            variant="inline-left"
            showIcons={false}
            className="mt-1"
          />
        </HeaderWithPhoto>
      </header>

      {showSummary && (
        <section
          className={!hasSummaryText ? 'print:hidden' : undefined}
          style={{
            marginBottom: hasEnabledSections
              ? 'var(--theme-section-spacing, 1rem)'
              : undefined,
          }}
        >
          <SectionHeading title="Summary" accentBorder />
          <Description
            value={summaryValue}
            onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
            readOnly={readOnly}
            placeholder="Concise career summary..."
            textClassName="text-[0.96em] mt-0.5 block whitespace-pre-wrap break-words"
          />
        </section>
      )}

      <SectionRenderer tone="modern" accentHeadingBorder />
    </div>
  );
};

export const CompactTemplate: React.FC<TemplateProps> = ({
  resume,
  onChange,
  readOnly = false,
}) => (
  <TemplateProvider
    resume={resume}
    onChange={onChange}
    readOnly={readOnly}
    defaultHeadingStyle="underline"
    defaultSkillStyle="comma"
  >
    <CompactTemplateContent />
  </TemplateProvider>
);
