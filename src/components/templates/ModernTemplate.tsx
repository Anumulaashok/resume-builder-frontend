import React from 'react';
import { IResume } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import { getOrderedSections } from './templateHelpers';
import {
  ContactRow,
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

const ModernTemplateContent: React.FC = () => {
  const { resume, readOnly, updateBasics } = useTemplateContext();
  if (!resume) return null;

  const basics = resume.content?.basics || {};
  const summaryValue = basics.summary ?? resume.summary ?? '';
  const showSummary = readOnly
    ? Boolean(summaryValue && summaryValue.trim())
    : basics.summary !== undefined || resume.summary !== undefined;

  const orderedSections = getOrderedSections(
    resume.content?.sections || [],
    resume.content?.sectionOrder || []
  );

  return (
    <div
      className="bg-white"
      style={{
        padding: 'var(--theme-page-margin, 1.75cm)',
        fontFamily: 'var(--theme-body-font, inherit)',
        color: 'var(--theme-text-color, #374151)',
        fontSize: 'var(--theme-base-font-size, 13.5px)',
        lineHeight: 'var(--theme-line-height, 1.5)',
      }}
    >
      <header
        className="text-center pb-5 border-b-2"
        style={{
          borderColor: 'var(--theme-primary, #111827)',
          marginBottom: 'var(--theme-section-spacing, 1.5rem)',
        }}
      >
        <HeaderWithPhoto align="center">
          <InlineEdit
            value={basics.name || ''}
            onChange={readOnly ? undefined : (v) => updateBasics('name', v)}
            readOnly={readOnly}
            textClassName="text-3xl font-bold tracking-tight leading-tight"
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
            textClassName="text-base mt-1 font-medium block"
            style={{ color: 'var(--theme-accent, var(--theme-primary, #4b5563))' }}
            placeholder="Professional Title"
          />
          <ContactRow variant="inline-center" className="mt-2.5" />
        </HeaderWithPhoto>
      </header>

      {showSummary && (
        <section
          style={{
            marginBottom:
              orderedSections.length > 0
                ? 'var(--theme-section-spacing, 1.5rem)'
                : undefined,
          }}
        >
          <SectionHeading title="Professional Summary" />
          <InlineEdit
            value={summaryValue}
            onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
            multiline
            textClassName="text-[0.96em] whitespace-pre-wrap break-words block"
            style={{
              color: 'var(--theme-text-color, #374151)',
              lineHeight: 'var(--theme-line-height, 1.5)',
            }}
            placeholder="A brief summary of your professional background..."
            readOnly={readOnly}
          />
        </section>
      )}

      <SectionRenderer tone="modern" />
    </div>
  );
};

export const ModernTemplate: React.FC<TemplateProps> = ({
  resume,
  onChange,
  readOnly = false,
}) => (
  <TemplateProvider
    resume={resume}
    onChange={onChange}
    readOnly={readOnly}
    defaultHeadingStyle="underline"
    defaultSkillStyle="chips"
  >
    <ModernTemplateContent />
  </TemplateProvider>
);

export { formatResumeDate as formatDate } from '../../utils/date';
