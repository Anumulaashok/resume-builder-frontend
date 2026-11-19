import React from 'react';
import { IResume } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import { getOrderedSections } from './templateHelpers';
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

function extractInitials(rawName?: string): string {
  if (!rawName || typeof rawName !== 'string') return '';
  const tokens = rawName
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/^[^A-Za-z0-9\u00C0-\u024F]+/, ''))
    .filter(Boolean);

  if (tokens.length === 0) return '';
  if (tokens.length === 1) return tokens[0].charAt(0).toUpperCase();
  return `${tokens[0].charAt(0)}${tokens[tokens.length - 1].charAt(0)}`.toUpperCase();
}

const BoldHeaderTemplateContent: React.FC = () => {
  const { resume, readOnly, updateBasics } = useTemplateContext();
  if (!resume) return null;

  const basics = resume.content?.basics || {};
  const realInitials = extractInitials(basics.name);
  const initials = realInitials || (readOnly ? '' : 'YN');
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
      className="bg-white min-h-[1123px] print:min-h-0"
      style={{
        fontFamily: 'var(--theme-body-font, inherit)',
        color: 'var(--theme-text-color, #374151)',
        fontSize: 'var(--theme-base-font-size, 13.5px)',
        lineHeight: 'var(--theme-line-height, 1.5)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* Full-Width Accent Band */}
      <header
        data-testid="bold-header-band"
        className="w-full text-white border-b-2 border-slate-900/15 break-inside-avoid"
        style={{
          backgroundColor:
            'var(--theme-accent, var(--theme-primary, #991b1b))',
          paddingLeft: 'var(--theme-page-margin, 1.25cm)',
          paddingRight: 'var(--theme-page-margin, 1.25cm)',
          paddingTop: '1.25rem',
          paddingBottom: '1.25rem',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <div className="flex items-center gap-4 sm:gap-5">
          {initials && (
            <div
              data-testid="bold-header-initials"
              aria-hidden="true"
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/85 bg-white/15 flex items-center justify-center shrink-0 text-white text-lg sm:text-xl font-bold tracking-wider select-none ${!realInitials ? 'print:hidden' : ''}`}
              style={{ fontFamily: 'var(--theme-heading-font)' }}
            >
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <InlineEdit
              value={basics.name || ''}
              onChange={readOnly ? undefined : (v) => updateBasics('name', v)}
              readOnly={readOnly}
              className="[&_input]:!text-slate-900"
              textClassName="text-2xl sm:text-3xl font-bold tracking-tight leading-tight !text-white hover:!text-slate-900"
              style={{
                fontFamily: 'var(--theme-heading-font)',
              }}
              placeholder="Your Name"
            />
            <InlineEdit
              value={basics.label || ''}
              onChange={readOnly ? undefined : (v) => updateBasics('label', v)}
              readOnly={readOnly}
              className="[&_input]:!text-slate-900"
              textClassName="text-sm sm:text-base font-medium mt-0.5 block !text-white/90 hover:!text-slate-900"
              placeholder="Brand & Creative Director"
            />
            <div
              style={
                {
                  '--theme-primary': '#ffffff',
                  '--theme-accent': '#ffffff',
                } as React.CSSProperties
              }
            >
              <ContactRow
                variant="inline-left"
                className="mt-2.5 !text-white/95 [&_span]:!text-white/90 [&_a]:!decoration-white/60 hover:[&_a]:!decoration-white [&_input]:!text-slate-900"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Card-Like Sections Below */}
      <main
        style={{
          padding: 'var(--theme-page-margin, 1.25cm)',
          boxDecorationBreak: 'clone',
          WebkitBoxDecorationBreak: 'clone',
        }}
      >
        {showSummary && (
          <section
            data-testid="bold-header-summary-card"
            className={`rounded-xl border border-slate-200 bg-slate-50/50 print:bg-white px-4 py-2 shadow-xs print:shadow-none break-inside-avoid [&_h2]:mb-1.5 ${!hasSummaryText ? 'print:hidden' : ''}`}
            style={{
              borderTopWidth: '3px',
              borderTopColor:
                'var(--theme-accent, var(--theme-primary, #991b1b))',
              marginBottom:
                orderedSections.length > 0
                  ? 'var(--theme-section-spacing, 1rem)'
                  : undefined,
            }}
          >
            <SectionHeading title="Profile" />
            <Description
              value={summaryValue}
              onChange={
                readOnly ? undefined : (v) => updateBasics('summary', v)
              }
              readOnly={readOnly}
              placeholder="Highlight your creative leadership and core impact..."
              textClassName="text-[0.96em] block whitespace-pre-wrap break-words"
            />
          </section>
        )}

        <div
          data-testid="bold-header-cards"
          className="[&>section]:rounded-xl [&>section]:border [&>section]:border-slate-200 [&>section]:bg-slate-50/40 print:[&>section]:bg-white [&>section]:px-4 [&>section]:py-2 [&>section]:shadow-xs print:[&>section]:shadow-none [&>section]:[box-decoration-break:clone] [&>section]:[-webkit-box-decoration-break:clone] [&_h2]:mb-1.5"
        >
          <SectionRenderer tone="modern" />
        </div>
      </main>
    </div>
  );
};

export const BoldHeaderTemplate: React.FC<TemplateProps> = ({
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
    <BoldHeaderTemplateContent />
  </TemplateProvider>
);
