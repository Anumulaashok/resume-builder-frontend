import React, { useEffect, useRef, useState } from 'react';
import { IResume } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import {
  ContactRow,
  Description,
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

const ExecutiveTemplateContent: React.FC = () => {
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

  const basics = resume.content?.basics || {};
  const summaryValue = basics.summary ?? resume.summary ?? '';
  const showSummary = readOnly
    ? Boolean(summaryValue && summaryValue.trim())
    : basics.summary !== undefined || resume.summary !== undefined;

  const hasEnabledSections = (resume.content?.sections || []).some(
    (sec) => sec && sec.enabled !== false
  );

  return (
    <div
      ref={rootRef}
      data-template-id="executive"
      className="bg-white [&_ul]:mt-2 [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:font-medium [&_li]:text-[0.98em] [&_li::marker]:text-[color:var(--theme-accent,var(--theme-primary,#1e293b))] [&_[data-section-kind='achievements']]:pl-3 [&_[data-section-kind='achievements']]:border-l-2 [&_[data-section-kind='achievements']]:border-[color:var(--theme-accent,var(--theme-primary,#cbd5e1))]"
      style={{
        padding: 'var(--theme-page-margin, 1.75cm)',
        fontFamily: 'var(--theme-body-font, inherit)',
        color: 'var(--theme-text-color, #334155)',
        fontSize: 'var(--theme-base-font-size, 13.5px)',
        lineHeight: 'var(--theme-line-height, 1.5)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {enablePrintPageRule && (
        <style>{`
          @page { size: A4; margin: 1.4cm 0; }
          @media print {
            [data-template-id="executive"] {
              padding-top: 0.25cm !important;
              padding-bottom: 0.25cm !important;
            }
          }
        `}</style>
      )}
      <header
        className="border-l-[5px] pl-4 py-1 pb-3 border-b border-b-slate-200 break-inside-avoid"
        style={{
          borderLeftColor: 'var(--theme-accent, var(--theme-primary, #2563eb))',
          marginBottom: 'var(--theme-section-spacing, 1.5rem)',
        }}
      >
        <InlineEdit
          value={basics.name || ''}
          onChange={readOnly ? undefined : (v) => updateBasics('name', v)}
          readOnly={readOnly}
          textClassName="text-[32px] font-bold tracking-tight leading-none"
          style={{
            fontFamily: 'var(--theme-heading-font)',
            color: 'var(--theme-heading-color, #0f172a)',
          }}
          placeholder="Your Name"
        />
        <InlineEdit
          value={basics.label || ''}
          onChange={readOnly ? undefined : (v) => updateBasics('label', v)}
          readOnly={readOnly}
          textClassName="text-base font-semibold tracking-wide mt-1.5 block"
          style={{ color: 'var(--theme-accent, var(--theme-primary, #2563eb))' }}
          placeholder="Executive / Leadership Title"
        />
        <ContactRow variant="inline-left" className="mt-2.5" />
      </header>

      {showSummary && (
        <section
          style={{
            marginBottom: hasEnabledSections
              ? 'var(--theme-section-spacing, 1.5rem)'
              : undefined,
          }}
        >
          <SectionHeading title="Executive Summary" />
          <div
            className="pl-3.5 py-2 pr-3 border-l-2 bg-slate-50/80 rounded-r-sm print:bg-slate-50"
            style={{
              borderLeftColor:
                'var(--theme-accent, var(--theme-primary, #2563eb))',
            }}
          >
            <Description
              value={summaryValue}
              onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
              readOnly={readOnly}
              placeholder="Highlight strategic leadership, business impact, and core mandate..."
              textClassName="text-[1.03em] font-medium whitespace-pre-wrap break-words block"
              style={{
                color: 'var(--theme-heading-color, #1e293b)',
                lineHeight: 'var(--theme-line-height, 1.5)',
              }}
            />
          </div>
        </section>
      )}

      <SectionRenderer tone="modern" />
    </div>
  );
};

export const ExecutiveTemplate: React.FC<TemplateProps> = ({
  resume,
  onChange,
  readOnly = false,
}) => (
  <TemplateProvider
    resume={resume}
    onChange={onChange}
    readOnly={readOnly}
    defaultHeadingStyle="caps"
    defaultSkillStyle="columns"
  >
    <ExecutiveTemplateContent />
  </TemplateProvider>
);
