import React from 'react';
import { IResume } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import { CanonicalSectionKind } from './templateHelpers';
import {
  ContactRow,
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

const SIDEBAR_KINDS = new Set<CanonicalSectionKind>([
  'skills',
  'languages',
  'certificates',
  'interests',
  'awards',
  'courses',
]);

const CreativeSidebarContent: React.FC = () => {
  const { resume, readOnly, updateBasics } = useTemplateContext();
  if (!resume) return null;

  const basics = resume.content?.basics || {};
  const summaryValue = basics.summary ?? resume.summary ?? '';
  const hasSummaryText = Boolean(summaryValue && summaryValue.trim());
  const showSummary = readOnly
    ? hasSummaryText
    : basics.summary !== undefined || resume.summary !== undefined;

  return (
    <div
      className="bg-white flex flex-col sm:flex-row min-h-[1123px] print:min-h-[29.7cm]"
      style={{
        fontFamily: 'var(--theme-body-font, inherit)',
        color: 'var(--theme-text-color, #374151)',
        fontSize: 'var(--theme-base-font-size, 13.5px)',
        lineHeight: 'var(--theme-line-height, 1.5)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <aside
        className="shrink-0 bg-slate-50 border-b sm:border-b-0 sm:border-r border-slate-200"
        style={{
          width: 'var(--theme-sidebar-width, 32%)',
          padding: 'var(--theme-page-margin, 1.75cm)',
        }}
      >
        <div
          className="pb-4 mb-5 border-b-2"
          style={{
            borderColor: 'var(--theme-accent, var(--theme-primary, #7c3aed))',
          }}
        >
          <InlineEdit
            value={basics.name || ''}
            onChange={readOnly ? undefined : (v) => updateBasics('name', v)}
            readOnly={readOnly}
            textClassName="text-2xl font-bold tracking-tight leading-tight"
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
            textClassName="text-sm font-medium mt-1 block"
            style={{ color: 'var(--theme-accent, var(--theme-primary, #7c3aed))' }}
            placeholder="Creative Lead / Designer"
          />
          <ContactRow variant="stacked-left" className="mt-3" />
        </div>

        <SectionRenderer
          filter={(_sec, kind) => SIDEBAR_KINDS.has(kind)}
          tone="modern"
        />
      </aside>

      <main
        className="flex-1 min-w-0"
        style={{ padding: 'var(--theme-page-margin, 1.75cm)' }}
      >
        {showSummary && (
          <section
            className={!hasSummaryText ? 'print:hidden' : undefined}
            style={{ marginBottom: 'var(--theme-section-spacing, 1.5rem)' }}
          >
            <SectionHeading title="About" />
            <InlineEdit
              value={summaryValue}
              onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
              multiline
              textClassName="text-[0.96em] whitespace-pre-wrap break-words block"
              style={{
                color: 'var(--theme-text-color, #374151)',
                lineHeight: 'var(--theme-line-height, 1.5)',
              }}
              placeholder="Share your creative vision and background..."
              readOnly={readOnly}
            />
          </section>
        )}

        <SectionRenderer
          filter={(_sec, kind) => !SIDEBAR_KINDS.has(kind)}
          tone="modern"
        />
      </main>
    </div>
  );
};

export const CreativeSidebarTemplate: React.FC<TemplateProps> = ({
  resume,
  onChange,
  readOnly = false,
}) => (
  <TemplateProvider
    resume={resume}
    onChange={onChange}
    readOnly={readOnly}
    defaultHeadingStyle="pill"
    defaultSkillStyle="bars"
  >
    <CreativeSidebarContent />
  </TemplateProvider>
);
