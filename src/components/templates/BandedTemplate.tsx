import React from 'react';
import { IResume } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import { extractExtraBasicsLinks } from './templateHelpers';
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

function hasHeaderContent(resume: IResume, readOnly: boolean): boolean {
  if (!readOnly) return true;
  const basics = resume.content?.basics || {};
  if (basics.name?.trim() || basics.label?.trim()) return true;
  if (basics.email?.trim() || basics.phone?.trim()) return true;
  if (
    basics.location?.address?.trim() ||
    basics.location?.city?.trim() ||
    basics.location?.countryCode?.trim()
  ) {
    return true;
  }
  return extractExtraBasicsLinks(basics as Record<string, any>).length > 0;
}

const BandedTemplateContent: React.FC = () => {
  const { resume, readOnly, updateBasics, atsMode } = useTemplateContext();
  if (!resume) return null;

  const basics = resume.content?.basics || {};
  const summaryValue = basics.summary ?? resume.summary ?? '';
  const hasSummaryText = Boolean(summaryValue && summaryValue.trim());
  const showSummary = readOnly
    ? hasSummaryText
    : basics.summary !== undefined || resume.summary !== undefined;
  const showPhoto = shouldRenderProfilePhoto(
    resume,
    resume.themeConfig?.photo,
    atsMode
  );
  const showHeader = hasHeaderContent(resume, readOnly) || showPhoto;

  return (
    <div
      data-testid="banded-template"
      className="bg-white print:!min-h-0"
      style={{
        minHeight: atsMode ? undefined : 'var(--theme-page-height, 1123px)',
        fontFamily: 'var(--theme-body-font, inherit)',
        color: 'var(--theme-text-color, #334155)',
        fontSize: 'var(--theme-base-font-size, 13.5px)',
        lineHeight: 'var(--theme-line-height, 1.5)',
        paddingBottom: 'calc(var(--theme-page-margin, 1.75cm) * 0.5)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {showHeader && (
        <header
          className={
            atsMode
              ? 'flex flex-col gap-2 border-b border-slate-300'
              : 'flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 border-b-2'
          }
          style={{
            paddingLeft: 'var(--theme-page-margin, 1.75cm)',
            paddingRight: 'var(--theme-page-margin, 1.75cm)',
            paddingTop: 'var(--theme-page-margin, 1.75cm)',
            paddingBottom: 'calc(var(--theme-section-spacing, 1.5rem) * 0.75)',
            borderColor: atsMode
              ? undefined
              : 'var(--theme-accent, var(--theme-primary, #0f766e))',
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
                color: 'var(--theme-heading-color, #0f172a)',
              }}
              placeholder="Your Name"
            />
            <InlineEdit
              value={basics.label || ''}
              onChange={readOnly ? undefined : (v) => updateBasics('label', v)}
              readOnly={readOnly}
              textClassName="text-base mt-1 block font-medium"
              style={{
                color: 'var(--theme-accent, var(--theme-primary, #0f766e))',
              }}
              placeholder="Professional Title"
            />
          </div>
          {showPhoto ? (
            <div className="flex items-center gap-3 sm:justify-end shrink-0">
              <ContactRow variant={atsMode ? 'inline-left' : 'stacked-right'} />
              <ProfilePhoto />
            </div>
          ) : (
            <ContactRow variant={atsMode ? 'inline-left' : 'stacked-right'} />
          )}
        </header>
      )}

      <div
        data-testid="banded-sections"
        className={
          atsMode
            ? '[&>section]:!mb-0 [&>section]:px-[var(--theme-page-margin,1.75cm)] [&>section]:py-[calc(var(--theme-section-spacing,1.5rem)*0.55)] [&>section]:border-b [&>section]:border-slate-200/70 [&>section:last-child]:border-b-0'
            : "[&>section]:!mb-0 [&>section]:px-[var(--theme-page-margin,1.75cm)] [&>section]:py-[calc(var(--theme-section-spacing,1.5rem)*0.6)] [&>section]:border-b [&>section]:border-slate-200/70 [&>section:last-child]:border-b-0 [&>section:nth-child(odd)]:bg-slate-50/90 [&>section:nth-child(even)]:bg-white [&>section]:grid [&>section]:grid-cols-1 sm:[&>section]:grid-cols-[11rem_minmax(0,1fr)] print:[&>section]:grid-cols-[11rem_minmax(0,1fr)] [&>section]:gap-x-6 [&>section]:gap-y-2 [&>section]:items-start sm:[&>section>*:first-child]:col-start-1 print:[&>section>*:first-child]:col-start-1 sm:[&>section>*:first-child]:!mb-0 print:[&>section>*:first-child]:!mb-0 sm:[&>section>*:first-child]:pt-0.5 print:[&>section>*:first-child]:pt-0.5 [&>section>[data-heading-variant='side-label']>span:first-child]:shrink [&>section>[data-heading-variant='side-label']>span:first-child]:min-w-0 [&>section>[data-heading-variant='side-label']]:leading-snug sm:[&>section>*:not(:first-child)]:col-start-2 print:[&>section>*:not(:first-child)]:col-start-2 sm:[&>section>*:not(:first-child)]:min-w-0 print:[&>section>*:not(:first-child)]:min-w-0"
        }
      >
        {showSummary && (
          <section
            data-section-id="summary"
            className={!hasSummaryText ? 'print:hidden' : undefined}
          >
            <SectionHeading title="Summary" />
            <Description
              value={summaryValue}
              onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
              readOnly={readOnly}
              placeholder="A concise summary of your professional background..."
              textClassName="text-[0.96em] text-slate-600 block whitespace-pre-wrap break-words"
            />
          </section>
        )}

        <SectionRenderer tone="modern" />
      </div>
    </div>
  );
};

export const BandedTemplate: React.FC<TemplateProps> = ({
  resume,
  onChange,
  readOnly = false,
}) => (
  <TemplateProvider
    resume={resume}
    onChange={onChange}
    readOnly={readOnly}
    defaultHeadingStyle="side-label"
    defaultSkillStyle="columns"
  >
    <BandedTemplateContent />
  </TemplateProvider>
);
