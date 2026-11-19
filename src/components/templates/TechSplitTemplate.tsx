import React from 'react';
import { IResume } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import { CanonicalSectionKind } from './templateHelpers';
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

const SIDEBAR_KINDS = new Set<CanonicalSectionKind>([
  'skills',
  'languages',
  'certificates',
  'awards',
  'courses',
  'interests',
]);

const TechSplitContent: React.FC = () => {
  const { resume, readOnly, updateBasics, atsMode } = useTemplateContext();
  if (!resume) return null;

  const basics = resume.content?.basics || {};
  const summaryValue = basics.summary ?? resume.summary ?? '';
  const hasSummaryText = Boolean(summaryValue && summaryValue.trim());
  const showSummary = readOnly
    ? hasSummaryText
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
        className="pb-4 border-b"
        style={{
          borderColor: 'var(--theme-accent, var(--theme-primary, #0f766e))',
          marginBottom: 'var(--theme-section-spacing, 1.5rem)',
        }}
      >
        <div
          className={
            atsMode
              ? 'flex flex-col gap-2'
              : 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'
          }
        >
          <div>
            <InlineEdit
              value={basics.name || ''}
              onChange={readOnly ? undefined : (v) => updateBasics('name', v)}
              readOnly={readOnly}
              textClassName="text-2xl font-bold tracking-tight"
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
              textClassName="text-sm font-medium mt-0.5 block"
              style={{ color: 'var(--theme-accent, var(--theme-primary, #0f766e))' }}
              placeholder="Systems / Software Engineer"
            />
          </div>
          <div className="flex items-center gap-3 sm:justify-end shrink-0">
            <ContactRow variant={atsMode ? 'inline-left' : 'stacked-right'} />
            <ProfilePhoto />
          </div>
        </div>
      </header>

      {atsMode ? (
        <div>
          {showSummary && (
            <section
              className={!hasSummaryText ? 'print:hidden' : undefined}
              style={{ marginBottom: 'var(--theme-section-spacing, 1.5rem)' }}
            >
              <SectionHeading title="Overview" />
              <InlineEdit
                value={summaryValue}
                onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
                multiline
                textClassName="text-[0.96em] whitespace-pre-wrap break-words block"
                style={{
                  color: 'var(--theme-text-color, #374151)',
                  lineHeight: 'var(--theme-line-height, 1.5)',
                }}
                placeholder="Technical focus and impact..."
                readOnly={readOnly}
              />
            </section>
          )}
          <SectionRenderer tone="modern" />
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row print:flex-row gap-7 items-start min-w-0">
          <div className="flex-1 min-w-0 w-full [overflow-wrap:anywhere]">
            {showSummary && (
              <section
                className={!hasSummaryText ? 'print:hidden' : undefined}
                style={{ marginBottom: 'var(--theme-section-spacing, 1.5rem)' }}
              >
                <SectionHeading title="Overview" />
                <InlineEdit
                  value={summaryValue}
                  onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
                  multiline
                  textClassName="text-[0.96em] whitespace-pre-wrap break-words block"
                  style={{
                    color: 'var(--theme-text-color, #374151)',
                    lineHeight: 'var(--theme-line-height, 1.5)',
                  }}
                  placeholder="Technical focus and impact..."
                  readOnly={readOnly}
                />
              </section>
            )}
            <SectionRenderer
              filter={(_sec, kind) => !SIDEBAR_KINDS.has(kind)}
              tone="modern"
            />
          </div>

          <aside
            data-testid="tech-split-sidebar"
            className="shrink-0 min-w-0 max-w-full w-full sm:pl-5 print:pl-5 sm:border-l print:border-l border-slate-200 [overflow-wrap:anywhere]"
            style={{
              width: 'var(--theme-sidebar-width, 32%)',
              overflowWrap: 'anywhere',
            }}
          >
            <SectionRenderer
              filter={(_sec, kind) => SIDEBAR_KINDS.has(kind)}
              tone="modern"
              narrow
            />
          </aside>
        </div>
      )}
    </div>
  );
};

export const TechSplitTemplate: React.FC<TemplateProps> = ({
  resume,
  onChange,
  readOnly = false,
}) => (
  <TemplateProvider
    resume={resume}
    onChange={onChange}
    readOnly={readOnly}
    defaultHeadingStyle="bar"
    defaultSkillStyle="chips"
  >
    <TechSplitContent />
  </TemplateProvider>
);
