import React from 'react';
import { IResume } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import { getOrderedSections } from './templateHelpers';
import {
  ContactRow,
  ProfilePhoto,
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

const ProfessionalTemplateContent: React.FC = () => {
  const { resume, readOnly, updateBasics, atsMode } = useTemplateContext();
  if (!resume) return null;

  const basics = resume.content?.basics || {};
  const summaryValue = basics.summary ?? resume.summary ?? '';
  const hasSummaryText = Boolean(summaryValue && summaryValue.trim());
  const showSummary = readOnly
    ? hasSummaryText
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
        fontFamily: 'var(--theme-body-font, Georgia, serif)',
        color: 'var(--theme-text-color, #334155)',
        fontSize: 'var(--theme-base-font-size, 13.5px)',
        lineHeight: 'var(--theme-line-height, 1.5)',
      }}
    >
      <header
        className={
          atsMode
            ? 'flex flex-col gap-2 border-b pb-4'
            : 'flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b-2 pb-4'
        }
        style={{
          borderColor: 'var(--theme-primary, #1e293b)',
          marginBottom: 'var(--theme-section-spacing, 1.5rem)',
        }}
      >
        <div className="min-w-0">
          <InlineEdit
            value={basics.name || ''}
            onChange={readOnly ? undefined : (v) => updateBasics('name', v)}
            readOnly={readOnly}
            textClassName="text-3xl font-bold tracking-tight leading-tight"
            style={{
              fontFamily: 'var(--theme-heading-font)',
              color: 'var(--theme-heading-color, #1e293b)',
            }}
            placeholder="Your Name"
          />
          <InlineEdit
            value={basics.label || ''}
            onChange={readOnly ? undefined : (v) => updateBasics('label', v)}
            readOnly={readOnly}
            textClassName="text-base mt-1 block font-medium"
            style={{ color: 'var(--theme-accent, var(--theme-primary, #475569))' }}
            placeholder="Professional Title"
          />
        </div>
        <div className="flex items-center gap-3 sm:justify-end shrink-0">
          <ContactRow variant={atsMode ? 'inline-left' : 'stacked-right'} />
          <ProfilePhoto />
        </div>
      </header>

      {showSummary && (
        <section
          className={!hasSummaryText ? 'print:hidden' : undefined}
          style={{
            marginBottom:
              orderedSections.length > 0
                ? 'var(--theme-section-spacing, 1.5rem)'
                : undefined,
          }}
        >
          <SectionHeading title="Profile" accentBorder />
          <InlineEdit
            value={summaryValue}
            onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
            multiline
            textClassName="text-[0.96em] whitespace-pre-wrap break-words block"
            style={{
              color: 'var(--theme-text-color, #334155)',
              lineHeight: 'var(--theme-line-height, 1.5)',
            }}
            placeholder="A brief summary of your professional background..."
            readOnly={readOnly}
          />
        </section>
      )}

      <SectionRenderer tone="classic" accentHeadingBorder />
    </div>
  );
};

export const ProfessionalTemplate: React.FC<TemplateProps> = ({
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
    <ProfessionalTemplateContent />
  </TemplateProvider>
);

export { formatResumeDate as formatDate } from '../../utils/date';
