import React from 'react';
import { IResume, ISection } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import {
  CanonicalSectionKind,
  extractHighlights,
  formatItemDateRange,
  formatLinkLabel,
  getOrderedSections,
  normalizeHref,
  resolveSectionKind,
} from './templateHelpers';
import {
  Bullets,
  ContactRow,
  DateRange,
  Description,
  ItemHeader,
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

const ACADEMIC_SECTION_PRIORITY: Record<CanonicalSectionKind, number> = {
  education: 1,
  publications: 2,
  work: 3,
  projects: 4,
  awards: 5,
  achievements: 6,
  courses: 7,
  organizations: 8,
  certificates: 9,
  skills: 10,
  languages: 11,
  custom: 12,
  interests: 13,
  references: 14,
};

function getAcademicOrderedSections(
  sections: ISection[] = [],
  sectionOrder: string[] = []
): ISection[] {
  const baseOrdered = getOrderedSections(sections, sectionOrder);
  return baseOrdered
    .map((sec, idx) => ({
      sec,
      idx,
      priority: ACADEMIC_SECTION_PRIORITY[resolveSectionKind(sec)] ?? 12,
    }))
    .sort((a, b) => a.priority - b.priority || a.idx - b.idx)
    .map((entry) => entry.sec);
}

const AcademicPublicationsSection: React.FC<{ section: ISection }> = ({
  section,
}) => {
  const { readOnly, updateSectionItem, dateFormat } = useTemplateContext();
  const enabledItems = Array.isArray(section.content)
    ? section.content.filter((item: any) => item && item.enabled !== false)
    : [];

  return (
    <section data-section-id={section.id}>
      <SectionHeading title={section.title} accentBorder />
      {enabledItems.length > 0 && (
        <ol
          data-testid="academic-publications-list"
          className="list-none pl-0 m-0"
        >
          {enabledItems.map((item: any, idx: number) => {
            const titleKey = item.title !== undefined ? 'title' : 'name';
            const titleVal = item.title || item.name || '';
            const publisherVal = item.publisher || '';
            const authorsVal =
              typeof item.authors === 'string' ? item.authors.trim() : '';
            const itemUrl =
              item.url || item.website || item.link || item.liveUrl || '';
            const highlights = extractHighlights(item);
            const hasDate = Boolean(formatItemDateRange(item, dateFormat));
            const isLast = idx === enabledItems.length - 1;

            return (
              <li
                key={item.id || idx}
                data-section-kind="publications"
                className="break-inside-avoid flex items-baseline gap-2.5"
                style={
                  isLast
                    ? undefined
                    : { marginBottom: 'var(--theme-item-spacing, 0.875rem)' }
                }
              >
                <span
                  data-testid={`publication-number-${idx + 1}`}
                  className="font-semibold tabular-nums shrink-0 min-w-[1.75rem] text-right select-none"
                  style={{ color: 'var(--theme-primary, #1e293b)' }}
                >
                  [{idx + 1}]
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 leading-snug">
                    {authorsVal && (
                      <span className="font-medium">{authorsVal}.</span>
                    )}

                    {(titleVal || !readOnly) && (
                      <div className="inline-flex items-baseline">
                        <span aria-hidden="true">&ldquo;</span>
                        <InlineEdit
                          value={titleVal}
                          onChange={
                            readOnly
                              ? undefined
                              : (v) =>
                                  updateSectionItem(
                                    section.id,
                                    item.id,
                                    titleKey,
                                    v
                                  )
                          }
                          readOnly={readOnly}
                          placeholder="Publication Title"
                          className="inline-block"
                          textClassName="font-bold"
                          style={{
                            fontFamily: 'var(--theme-heading-font)',
                            color: 'var(--theme-heading-color, #111827)',
                          }}
                        />
                        <span aria-hidden="true">.&rdquo;</span>
                      </div>
                    )}

                    {(publisherVal || !readOnly) && (
                      <div className="inline-flex items-baseline">
                        <InlineEdit
                          value={publisherVal}
                          onChange={
                            readOnly
                              ? undefined
                              : (v) =>
                                  updateSectionItem(
                                    section.id,
                                    item.id,
                                    'publisher',
                                    v
                                  )
                          }
                          readOnly={readOnly}
                          placeholder="Journal / Proceedings"
                          className="inline-block"
                          textClassName="italic font-medium"
                          style={{
                            color: 'var(--theme-text-color, #1f2937)',
                          }}
                        />
                        {!hasDate && <span aria-hidden="true">.</span>}
                      </div>
                    )}

                    {hasDate && (
                      <span className="inline-flex items-baseline text-[0.95em] text-slate-600">
                        <span aria-hidden="true">(</span>
                        <DateRange
                          item={item}
                          className="tabular-nums text-[0.95em] text-slate-600"
                        />
                        <span aria-hidden="true">).</span>
                      </span>
                    )}

                    {itemUrl && itemUrl.trim() && (
                      <a
                        href={normalizeHref(itemUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline decoration-slate-400/80 underline-offset-2 hover:decoration-current print:decoration-slate-400"
                        style={{
                          color:
                            'var(--theme-accent, var(--theme-primary, #7f1d1d))',
                        }}
                      >
                        {formatLinkLabel(itemUrl)}
                      </a>
                    )}
                  </div>

                  <Description
                    value={item.description || item.summary || ''}
                    sectionId={section.id}
                    itemId={item.id}
                    field="description"
                    readOnly={readOnly}
                    placeholder="Abstract, DOI, or co-author notes..."
                    showWhenEmptyInEdit={false}
                  />
                  <Bullets
                    items={highlights}
                    sectionId={section.id}
                    itemId={item.id}
                    readOnly={readOnly}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

const AcademicReferencesSection: React.FC<{ section: ISection }> = ({
  section,
}) => {
  const { readOnly } = useTemplateContext();
  const enabledItems = Array.isArray(section.content)
    ? section.content.filter((item: any) => item && item.enabled !== false)
    : [];

  return (
    <section data-section-id={section.id}>
      <SectionHeading title={section.title} accentBorder />
      {enabledItems.length > 0 && (
        <div
          data-testid="academic-references-grid"
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4"
        >
          {enabledItems.map((item: any, idx: number) => {
            const roleAndCompany = [item.position, item.company]
              .filter(Boolean)
              .join(', ');
            const contactVal = item.contact || item.email || item.phone || '';
            const descVal = item.description || item.reference || '';

            return (
              <div
                key={item.id || idx}
                data-section-kind="references"
                className="break-inside-avoid border-l-2 border-slate-300 pl-3"
              >
                <ItemHeader
                  title={item.name || ''}
                  titlePlaceholder="Reference Name"
                  sectionId={section.id}
                  itemId={item.id}
                  titleField="name"
                  subtitle={roleAndCompany}
                  extraSubtitle={
                    contactVal ? (
                      <>
                        {roleAndCompany && (
                          <span className="text-slate-400" aria-hidden="true">
                            ·
                          </span>
                        )}
                        <span className="text-xs text-slate-600">
                          {contactVal}
                        </span>
                      </>
                    ) : undefined
                  }
                  readOnly={readOnly}
                  tone="classic"
                />
                <Description
                  value={descVal}
                  sectionId={section.id}
                  itemId={item.id}
                  field="description"
                  readOnly={readOnly}
                  showWhenEmptyInEdit={false}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

const AcademicTemplateContent: React.FC = () => {
  const { resume, readOnly, updateBasics } = useTemplateContext();
  if (!resume) return null;

  const basics = resume.content?.basics || {};
  const summaryValue = basics.summary ?? resume.summary ?? '';
  const showSummary = readOnly
    ? Boolean(summaryValue && summaryValue.trim())
    : basics.summary !== undefined || resume.summary !== undefined;

  const orderedSections = getAcademicOrderedSections(
    resume.content?.sections || [],
    resume.content?.sectionOrder || []
  );

  return (
    <div
      className="bg-white print:!py-0"
      style={{
        padding: 'var(--theme-page-margin, 1.75cm)',
        fontFamily: 'var(--theme-body-font, Georgia, "Times New Roman", serif)',
        color: 'var(--theme-text-color, #1f2937)',
        fontSize: 'var(--theme-base-font-size, 13.5px)',
        lineHeight: 'var(--theme-line-height, 1.55)',
      }}
    >
      <table role="presentation" className="w-full border-collapse">
        <thead aria-hidden="true" className="hidden print:table-header-group">
          <tr>
            <td
              className="p-0"
              style={{ height: 'var(--theme-page-margin, 1.75cm)' }}
            />
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-0 align-top">
              <header
                className="text-center pb-4 border-b-[3px] border-double"
                style={{
                  borderColor: 'var(--theme-primary, #1e293b)',
                  marginBottom:
                    showSummary || orderedSections.length > 0
                      ? 'var(--theme-section-spacing, 1.5rem)'
                      : undefined,
                }}
              >
                <InlineEdit
                  value={basics.name || ''}
                  onChange={
                    readOnly ? undefined : (v) => updateBasics('name', v)
                  }
                  readOnly={readOnly}
                  textClassName="text-3xl font-bold tracking-normal leading-tight"
                  style={{
                    fontFamily: 'var(--theme-heading-font)',
                    color: 'var(--theme-heading-color, #111827)',
                  }}
                  placeholder="Full Name, Ph.D."
                />
                <InlineEdit
                  value={basics.label || ''}
                  onChange={
                    readOnly ? undefined : (v) => updateBasics('label', v)
                  }
                  readOnly={readOnly}
                  textClassName="text-base italic mt-1 block"
                  style={{
                    color: 'var(--theme-accent, var(--theme-primary, #7f1d1d))',
                  }}
                  placeholder="Department & Academic Title"
                />
                <ContactRow
                  variant="inline-center"
                  showIcons={false}
                  className="mt-2.5"
                />
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
                  <SectionHeading
                    title="Research Interests & Profile"
                    accentBorder
                  />
                  <InlineEdit
                    value={summaryValue}
                    onChange={
                      readOnly ? undefined : (v) => updateBasics('summary', v)
                    }
                    multiline
                    textClassName="text-[0.96em] whitespace-pre-wrap break-words block"
                    style={{
                      color: 'var(--theme-text-color, #1f2937)',
                      lineHeight: 'var(--theme-line-height, 1.55)',
                    }}
                    placeholder="Summarize research areas, academic appointments, and scholarship..."
                    readOnly={readOnly}
                  />
                </section>
              )}

              {orderedSections.map((section, idx) => {
                const isLast = idx === orderedSections.length - 1;
                const kind = resolveSectionKind(section);

                return (
                  <div
                    key={section.id}
                    style={
                      isLast
                        ? undefined
                        : {
                            marginBottom:
                              'var(--theme-section-spacing, 1.5rem)',
                          }
                    }
                  >
                    {kind === 'publications' ? (
                      <AcademicPublicationsSection section={section} />
                    ) : kind === 'references' ? (
                      <AcademicReferencesSection section={section} />
                    ) : (
                      <SectionRenderer
                        sections={[section]}
                        sectionOrder={[section.id]}
                        tone="classic"
                        accentHeadingBorder
                      />
                    )}
                  </div>
                );
              })}
            </td>
          </tr>
        </tbody>
        <tfoot aria-hidden="true" className="hidden print:table-footer-group">
          <tr>
            <td
              className="p-0"
              style={{ height: 'var(--theme-page-margin, 1.75cm)' }}
            />
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export const AcademicTemplate: React.FC<TemplateProps> = ({
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
    <AcademicTemplateContent />
  </TemplateProvider>
);
