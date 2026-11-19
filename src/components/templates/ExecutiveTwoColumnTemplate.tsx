import React from 'react';
import { IResume } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import { CanonicalSectionKind } from './templateHelpers';
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

const SECONDARY_COLUMN_KINDS = new Set<CanonicalSectionKind>([
  'education',
  'skills',
  'languages',
  'certificates',
  'awards',
  'courses',
  'interests',
  'references',
]);

const ExecutiveTwoColumnContent: React.FC = () => {
  const { resume, readOnly, updateBasics, atsMode } = useTemplateContext();
  if (!resume) return null;

  const basics = resume.content?.basics || {};
  const summaryValue = basics.summary ?? resume.summary ?? '';
  const showSummary = readOnly
    ? Boolean(summaryValue && summaryValue.trim())
    : basics.summary !== undefined || resume.summary !== undefined;

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
        className="pb-4 border-b border-slate-200"
        style={{ marginBottom: 'var(--theme-section-spacing, 1.5rem)' }}
      >
        <HeaderWithPhoto>
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
            style={{ color: 'var(--theme-accent, var(--theme-primary, #2563eb))' }}
            placeholder="Executive / Lead Role"
          />
          <ContactRow variant="inline-left" className="mt-2.5" />
        </HeaderWithPhoto>
      </header>

      {showSummary && (
        <section
          style={{ marginBottom: 'var(--theme-section-spacing, 1.5rem)' }}
        >
          <SectionHeading title="Executive Summary" />
          <InlineEdit
            value={summaryValue}
            onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
            multiline
            textClassName="text-[0.96em] whitespace-pre-wrap break-words block"
            style={{
              color: 'var(--theme-text-color, #374151)',
              lineHeight: 'var(--theme-line-height, 1.5)',
            }}
            placeholder="High-level leadership summary..."
            readOnly={readOnly}
          />
        </section>
      )}

      {atsMode ? (
        <SectionRenderer tone="modern" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-7 items-start">
          <div className="sm:col-span-7 min-w-0">
            <SectionRenderer
              filter={(_sec, kind) => !SECONDARY_COLUMN_KINDS.has(kind)}
              tone="modern"
            />
          </div>
          <div className="sm:col-span-5 min-w-0">
            <SectionRenderer
              filter={(_sec, kind) => SECONDARY_COLUMN_KINDS.has(kind)}
              tone="modern"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const ExecutiveTwoColumnTemplate: React.FC<TemplateProps> = ({
  resume,
  onChange,
  readOnly = false,
}) => (
  <TemplateProvider
    resume={resume}
    onChange={onChange}
    readOnly={readOnly}
    defaultHeadingStyle="side-label"
    defaultSkillStyle="dots"
  >
    <ExecutiveTwoColumnContent />
  </TemplateProvider>
);
