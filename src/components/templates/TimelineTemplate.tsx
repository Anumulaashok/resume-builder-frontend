import React from 'react';
import { IResume, ISection } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import {
  CanonicalSectionKind,
  extractHighlights,
  extractKeywords,
  getOrderedSections,
  resolveSectionKind,
} from './templateHelpers';
import {
  Bullets,
  ContactRow,
  DateRange,
  Description,
  ItemHeader,
  KeywordList,
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

const TIMELINE_SECTION_KINDS = new Set<CanonicalSectionKind>(['work', 'education']);

const TimelineSection: React.FC<{
  section: ISection;
  kind: 'work' | 'education';
}> = ({ section, kind }) => {
  const ctx = useTemplateContext();
  const isReadOnly = ctx.readOnly;
  const effectiveKeywordVariant: 'chips' | 'comma' =
    ctx.skillStyle === 'comma' ? 'comma' : 'chips';

  if (!Array.isArray(section.content)) {
    return (
      <>
        <SectionHeading title={section.title} />
        <div className="text-[0.96em] leading-relaxed text-slate-700">
          {section.content as any}
        </div>
      </>
    );
  }

  const enabledItems = section.content.filter(
    (item: any) => item && item.enabled !== false
  );

  return (
    <>
      <SectionHeading title={section.title} />
      {enabledItems.length > 0 && (
        <div data-testid={`timeline-track-${kind}`} className="mt-1">
          {enabledItems.map((item: any, idx: number) => {
            const isLast = idx === enabledItems.length - 1;
            const highlights = extractHighlights(item);
            const keywords = extractKeywords(item);
            const itemUrl =
              item.url || item.website || item.link || item.liveUrl || '';

            let entryContent: React.ReactNode = null;

            if (kind === 'work') {
              const positionKey =
                item.position !== undefined
                  ? 'position'
                  : item.role !== undefined
                  ? 'role'
                  : 'position';
              const positionVal =
                item.position || item.role || item.jobTitle || item.title || '';
              const companyKey = item.company !== undefined ? 'company' : 'name';
              const companyVal =
                item.company ||
                item.name ||
                item.organization ||
                item.employer ||
                '';
              const descKey =
                item.description !== undefined
                  ? 'description'
                  : item.summary !== undefined
                  ? 'summary'
                  : 'description';
              const descVal = item.description ?? item.summary ?? '';

              entryContent = (
                <>
                  <ItemHeader
                    title={positionVal}
                    titlePlaceholder="Position"
                    sectionId={section.id}
                    itemId={item.id}
                    titleField={positionKey}
                    subtitle={companyVal}
                    subtitlePlaceholder="Company"
                    subtitleField={companyKey}
                    showSubtitleWhenEmptyInEdit
                    url={itemUrl}
                    urlPlacement="subtitle"
                    location={item.location}
                    readOnly={isReadOnly}
                    tone="modern"
                  />
                  <Description
                    value={descVal}
                    sectionId={section.id}
                    itemId={item.id}
                    field={descKey}
                    readOnly={isReadOnly}
                    placeholder="Describe key responsibilities and achievements..."
                    showWhenEmptyInEdit
                  />
                  <Bullets items={highlights} />
                  <KeywordList
                    keywords={keywords}
                    variant={effectiveKeywordVariant}
                  />
                </>
              );
            } else {
              const degreeVal =
                item.degree ||
                [item.studyType, item.area].filter(Boolean).join(' in ') ||
                '';
              const institutionKey =
                item.institution !== undefined
                  ? 'institution'
                  : item.school !== undefined
                  ? 'school'
                  : item.name !== undefined
                  ? 'name'
                  : null;
              const institutionVal =
                item.institution || item.school || item.name || '';
              const fieldVal =
                item.field || (item.degree && item.area ? item.area : '') || '';
              const gpaVal = item.gpa || item.score || '';
              const descVal = item.description ?? item.summary ?? '';

              const extraEducationMeta = (
                <>
                  {institutionVal && fieldVal && (
                    <span className="text-slate-400" aria-hidden="true">
                      ·
                    </span>
                  )}
                  {(fieldVal || (!institutionVal && !isReadOnly)) && (
                    <InlineEdit
                      value={fieldVal}
                      onChange={
                        isReadOnly
                          ? undefined
                          : (v) =>
                              ctx.updateSectionItem(
                                section.id,
                                item.id,
                                'field',
                                v
                              )
                      }
                      readOnly={isReadOnly}
                      placeholder="Institution / Field of Study"
                      textClassName={
                        institutionVal
                          ? 'text-[0.96em] text-slate-600'
                          : 'text-[1em] font-medium text-slate-700'
                      }
                    />
                  )}
                  {gpaVal && (
                    <span className="text-xs text-slate-500">
                      · GPA: {gpaVal}
                    </span>
                  )}
                </>
              );

              entryContent = (
                <>
                  <ItemHeader
                    title={degreeVal}
                    titlePlaceholder="Degree"
                    sectionId={section.id}
                    itemId={item.id}
                    titleField="degree"
                    subtitle={institutionVal}
                    subtitleField={institutionKey}
                    extraSubtitle={
                      institutionVal && !fieldVal && !gpaVal && isReadOnly
                        ? undefined
                        : extraEducationMeta
                    }
                    url={itemUrl}
                    urlPlacement="subtitle"
                    location={item.location}
                    readOnly={isReadOnly}
                    tone="modern"
                  />
                  <Description
                    value={descVal}
                    sectionId={section.id}
                    itemId={item.id}
                    field="description"
                    readOnly={isReadOnly}
                    placeholder="Honors, coursework, or thesis..."
                    showWhenEmptyInEdit
                  />
                  <Bullets items={highlights} />
                </>
              );
            }

            return (
              <div
                key={item.id || idx}
                data-section-kind={kind}
                data-timeline-item="true"
                className="grid grid-cols-[6.25rem_1.5rem_minmax(0,1fr)] sm:grid-cols-[7.75rem_1.75rem_minmax(0,1fr)] print:grid-cols-[7.75rem_1.75rem_minmax(0,1fr)] break-inside-avoid"
              >
                {/* Left Date Rail */}
                <div
                  data-testid="timeline-date-rail"
                  className="pr-2.5 pt-0.5 text-right"
                >
                  <DateRange
                    item={item}
                    className="text-[11px] font-semibold tabular-nums leading-snug inline-block"
                    style={{
                      color: 'var(--theme-primary, #334155)',
                    }}
                  />
                </div>

                {/* Vertical Connecting Line & Accent Dot */}
                <div
                  className="relative flex justify-center"
                  aria-hidden="true"
                >
                  <span
                    data-testid="timeline-line"
                    className="absolute w-[2px] rounded-full bg-slate-300"
                    style={{
                      top: '0.5rem',
                      bottom: isLast ? '0.25rem' : '-0.5rem',
                      backgroundColor:
                        'var(--theme-accent, var(--theme-primary, #059669))',
                      opacity: 0.35,
                    }}
                  />
                  <span
                    data-testid="timeline-dot"
                    className="relative z-10 mt-1.5 w-3 h-3 rounded-full bg-white border-2 flex items-center justify-center shrink-0"
                    style={{
                      borderColor:
                        'var(--theme-accent, var(--theme-primary, #059669))',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          'var(--theme-accent, var(--theme-primary, #059669))',
                      }}
                    />
                  </span>
                </div>

                {/* Entry Body */}
                <div
                  className="pl-2.5 min-w-0"
                  style={
                    isLast
                      ? undefined
                      : {
                          paddingBottom:
                            'var(--theme-item-spacing, 0.875rem)',
                        }
                  }
                >
                  {entryContent}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

const TimelineTemplateContent: React.FC = () => {
  const { resume, readOnly, updateBasics } = useTemplateContext();
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
        fontFamily: 'var(--theme-body-font, inherit)',
        color: 'var(--theme-text-color, #374151)',
        fontSize: 'var(--theme-base-font-size, 13.5px)',
        lineHeight: 'var(--theme-line-height, 1.5)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
      }}
    >
      <header
        className="pl-4 border-l-4 pb-1 break-inside-avoid"
        style={{
          borderLeftColor: 'var(--theme-accent, var(--theme-primary, #059669))',
          marginBottom: 'var(--theme-section-spacing, 1.5rem)',
        }}
      >
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
          textClassName="text-sm font-semibold uppercase tracking-[0.08em] mt-1 block"
          style={{
            color: 'var(--theme-accent, var(--theme-primary, #059669))',
          }}
          placeholder="Creative Technologist / Product Designer"
        />
        <ContactRow variant="inline-left" className="mt-2.5" />
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
          <SectionHeading title="Summary" />
          <Description
            value={summaryValue}
            onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
            readOnly={readOnly}
            placeholder="Summarize your career progression and creative impact..."
            textClassName="text-[0.96em] block whitespace-pre-wrap break-words"
          />
        </section>
      )}

      {orderedSections.map((section, idx) => {
        const isLastSection = idx === orderedSections.length - 1;
        const kind = resolveSectionKind(section);

        if (TIMELINE_SECTION_KINDS.has(kind)) {
          return (
            <section
              key={section.id}
              data-section-id={section.id}
              style={
                isLastSection
                  ? undefined
                  : { marginBottom: 'var(--theme-section-spacing, 1.5rem)' }
              }
            >
              <TimelineSection
                section={section}
                kind={kind as 'work' | 'education'}
              />
            </section>
          );
        }

        return (
          <div
            key={section.id}
            style={
              isLastSection
                ? undefined
                : { marginBottom: 'var(--theme-section-spacing, 1.5rem)' }
            }
          >
            <SectionRenderer
              sections={[section]}
              sectionOrder={[section.id]}
              tone="modern"
            />
          </div>
        );
      })}
    </div>
  );
};

export const TimelineTemplate: React.FC<TemplateProps> = ({
  resume,
  onChange,
  readOnly = false,
}) => (
  <TemplateProvider
    resume={resume}
    onChange={onChange}
    readOnly={readOnly}
    defaultHeadingStyle="side-label"
    defaultSkillStyle="chips"
  >
    <TimelineTemplateContent />
  </TemplateProvider>
);
