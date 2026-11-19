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

const ClassicTemplateContent: React.FC = () => {
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
  const hasSummaryText = Boolean(summaryValue && summaryValue.trim());
  const showSummary = readOnly
    ? hasSummaryText
    : basics.summary !== undefined || resume.summary !== undefined;

  const hasEnabledSections = (resume.content?.sections || []).some(
    (sec) => sec && sec.enabled !== false
  );

  return (
    <div
      ref={rootRef}
      data-template-id="classic"
      className="bg-white"
      style={{
        padding: 'var(--theme-page-margin, 1.75cm)',
        fontFamily: 'var(--theme-body-font, Georgia, "Times New Roman", serif)',
        color: 'var(--theme-text-color, #1f2937)',
        fontSize: 'var(--theme-base-font-size, 13.5px)',
        lineHeight: 'var(--theme-line-height, 1.5)',
      }}
    >
      {enablePrintPageRule && (
        <style>{`
          @page { size: A4; margin: 1.4cm 0; }
          @media print {
            [data-template-id="classic"] {
              padding-top: 0.25cm !important;
              padding-bottom: 0.25cm !important;
            }
          }
        `}</style>
      )}
      <header
        className="text-center pb-3.5 border-b break-inside-avoid"
        style={{
          borderBottomColor: 'var(--theme-accent, var(--theme-primary, #334155))',
          marginBottom: 'var(--theme-section-spacing, 1.5rem)',
        }}
      >
        <InlineEdit
          value={basics.name || ''}
          onChange={readOnly ? undefined : (v) => updateBasics('name', v)}
          readOnly={readOnly}
          textClassName="text-[28px] font-bold tracking-wide leading-tight"
          style={{
            fontFamily: 'var(--theme-heading-font)',
            color: 'var(--theme-heading-color, #111827)',
          }}
          placeholder="Your Name"
        />
        <InlineEdit
          value={basics.label || ''}
          onChange={readOnly ? undefined : (v) => updateBasics('label', v)}
          readOnly={readOnly}
          textClassName="text-[1.02em] italic mt-1 block"
          style={{
            fontFamily: 'var(--theme-heading-font)',
            color: 'var(--theme-accent, var(--theme-primary, #334155))',
          }}
          placeholder="Professional Title"
        />
        <ContactRow
          variant="inline-center"
          showIcons={false}
          className="mt-2"
        />
      </header>

      {showSummary && (
        <section
          className={!hasSummaryText ? 'print:hidden' : undefined}
          style={{
            marginBottom: hasEnabledSections
              ? 'var(--theme-section-spacing, 1.5rem)'
              : undefined,
          }}
        >
          <SectionHeading title="Professional Summary" accentBorder />
          <Description
            value={summaryValue}
            onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
            readOnly={readOnly}
            placeholder="A concise, formal overview of your credentials and experience..."
            textClassName="text-[0.96em] whitespace-pre-wrap break-words block"
          />
        </section>
      )}

      <SectionRenderer tone="classic" accentHeadingBorder />
    </div>
  );
};

export const ClassicTemplate: React.FC<TemplateProps> = ({
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
    <ClassicTemplateContent />
  </TemplateProvider>
);
