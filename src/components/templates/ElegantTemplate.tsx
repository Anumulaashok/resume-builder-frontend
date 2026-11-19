import React from 'react';
import { IResume } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import { getOrderedSections } from './templateHelpers';
import {
  ContactRow,
  Description,
  ProfilePhoto,
  SectionHeading,
  SectionRenderer,
  shouldRenderProfilePhoto,
  TemplateProvider,
  useTemplateContext,
} from './shared';

interface TemplateProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
  readOnly?: boolean;
}

function extractMonogram(rawName?: string): string {
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

const ElegantTemplateContent: React.FC = () => {
  const { resume, readOnly, updateBasics, atsMode } = useTemplateContext();
  if (!resume) return null;

  const basics = resume.content?.basics || {};
  const realMonogram = extractMonogram(basics.name);
  const monogram = realMonogram || (readOnly ? '' : 'YN');
  const showPhoto = shouldRenderProfilePhoto(
    resume,
    resume.themeConfig?.photo,
    atsMode
  );
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
        fontFamily: 'var(--theme-body-font, inherit)',
        color: 'var(--theme-text-color, #374151)',
        fontSize: 'var(--theme-base-font-size, 13.5px)',
        lineHeight: 'var(--theme-line-height, 1.55)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
      }}
    >
      {/* Editorial Monogram & Thin-Ruled Header */}
      <header
        className={`${atsMode ? 'text-left pb-3 border-b border-slate-300' : 'text-center'} break-inside-avoid`}
        style={{
          marginBottom: 'var(--theme-section-spacing, 1.5rem)',
        }}
      >
        {!atsMode && showPhoto && (
          <div className="flex justify-center mb-3">
            <ProfilePhoto />
          </div>
        )}

        {!atsMode && !showPhoto && monogram && (
          <div
            className={`flex items-center justify-center gap-3 mb-3 ${!realMonogram ? 'print:hidden' : ''}`}
            aria-hidden="true"
          >
            <span
              className="h-px w-12 sm:w-16"
              style={{
                backgroundColor:
                  'var(--theme-accent, var(--theme-primary, #b45309))',
                opacity: 0.55,
              }}
            />
            <span
              data-testid="elegant-monogram"
              className="w-11 h-11 rounded-full border flex items-center justify-center text-sm font-semibold tracking-[0.14em] select-none"
              style={{
                fontFamily: 'var(--theme-heading-font)',
                borderColor:
                  'var(--theme-accent, var(--theme-primary, #b45309))',
                color: 'var(--theme-primary, #1e293b)',
              }}
            >
              {monogram}
            </span>
            <span
              className="h-px w-12 sm:w-16"
              style={{
                backgroundColor:
                  'var(--theme-accent, var(--theme-primary, #b45309))',
                opacity: 0.55,
              }}
            />
          </div>
        )}

        <InlineEdit
          value={basics.name || ''}
          onChange={readOnly ? undefined : (v) => updateBasics('name', v)}
          readOnly={readOnly}
          textClassName="text-3xl sm:text-[32px] font-normal tracking-wide leading-tight"
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
          textClassName="text-xs uppercase tracking-[0.22em] font-medium mt-1.5 block"
          style={{
            color: 'var(--theme-accent, var(--theme-primary, #b45309))',
          }}
          placeholder="Creative Director · Brand & Editorial Design"
        />

        <ContactRow
          variant={atsMode ? 'inline-left' : 'inline-center'}
          showIcons={false}
          className="mt-3"
        />

        {/* Thin Accent Rule with Subtle Center Mark */}
        {!atsMode && (
          <div
            className="flex items-center justify-center gap-2.5 mt-4"
            aria-hidden="true"
          >
            <span
              className="h-px flex-1"
              style={{
                backgroundColor:
                  'var(--theme-accent, var(--theme-primary, #b45309))',
                opacity: 0.45,
              }}
            />
            <span
              className="w-1.5 h-1.5 rotate-45 border"
              style={{
                borderColor:
                  'var(--theme-accent, var(--theme-primary, #b45309))',
              }}
            />
            <span
              className="h-px flex-1"
              style={{
                backgroundColor:
                  'var(--theme-accent, var(--theme-primary, #b45309))',
                opacity: 0.45,
              }}
            />
          </div>
        )}
      </header>

      {showSummary && (
        <section
          className={`break-inside-avoid ${!hasSummaryText ? 'print:hidden' : ''}`}
          style={{
            marginBottom:
              orderedSections.length > 0
                ? 'var(--theme-section-spacing, 1.5rem)'
                : undefined,
          }}
        >
          <SectionHeading
            title="Profile"
            accentBorder={!atsMode}
            className={atsMode ? '' : 'text-center tracking-[0.2em]'}
          />
          <div className={atsMode ? '' : 'max-w-[92%] mx-auto text-center'}>
            <Description
              value={summaryValue}
              onChange={
                readOnly ? undefined : (v) => updateBasics('summary', v)
              }
              readOnly={readOnly}
              placeholder="Distill your design philosophy, brand narrative, and measurable outcomes..."
              textClassName="text-[0.96em] block whitespace-pre-wrap break-words"
            />
          </div>
        </section>
      )}

      <div
        data-testid="elegant-sections"
        className={
          atsMode
            ? undefined
            : "[&_h2[data-heading-variant='underline']]:text-center [&_h2[data-heading-variant='underline']]:tracking-[0.2em] [&_h2[data-heading-variant='caps']]:text-center [&_h2[data-heading-variant='caps']]:tracking-[0.24em]"
        }
      >
        <SectionRenderer tone="classic" accentHeadingBorder={!atsMode} />
      </div>
    </div>
  );
};

export const ElegantTemplate: React.FC<TemplateProps> = ({
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
    <ElegantTemplateContent />
  </TemplateProvider>
);
