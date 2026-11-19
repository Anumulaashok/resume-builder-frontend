import React from 'react';
import { IResume, ISection } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import {
  CanonicalSectionKind,
  extractExtraBasicsLinks,
  extractHighlights,
  extractKeywords,
  getOrderedSections,
  resolveSectionKind,
} from './templateHelpers';
import {
  Bullets,
  ContactRow,
  Description,
  ItemHeader,
  KeywordList,
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

const SIDEBAR_KINDS = new Set<CanonicalSectionKind>([
  'skills',
  'languages',
  'certificates',
  'awards',
  'courses',
  'interests',
]);

const METRIC_RICH_KINDS = new Set<CanonicalSectionKind>([
  'work',
  'projects',
  'achievements',
]);

const METRIC_REGEX =
  /(?:\$\d[\d,.]*(?:\s*[kKmMbBtT]\+?)?(?:\s*(?:ARR|MRR|revenue|funding))?|\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?x\b|\b\d+(?:[.,]\d+)?(?:[kKmMbB]\+?|\+)(?:\s+(?:GitHub stars|stars|users|MAU|DAU|attendees|customers|engineers|squads|teams))?|\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:fps|ms|rps|req\/s|QPS|Gbps|TB)\b|\b\d{1,3}(?:,\d{3})+(?:\+)?(?:\s+(?:attendees|users|customers|engineers))?|\b\d+\s+(?:engineering squads|senior engineers|engineers|squads|teams|microservices|markets)\b)/gi;

export function extractImpactMetrics(texts: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  texts.forEach((raw) => {
    if (!raw || typeof raw !== 'string') return;
    const matches = raw.match(METRIC_REGEX);
    if (!matches) return;
    matches.forEach((m) => {
      const cleaned = m.trim();
      const key = cleaned.toLowerCase();
      if (cleaned && !seen.has(key) && results.length < 4) {
        seen.add(key);
        results.push(cleaned);
      }
    });
  });

  return results;
}

const StartupMetricSection: React.FC<{
  section: ISection;
  kind: CanonicalSectionKind;
}> = ({ section, kind }) => {
  const { readOnly, skillStyle } = useTemplateContext();
  const enabledItems = Array.isArray(section.content)
    ? section.content.filter((item: any) => item && item.enabled !== false)
    : [];

  const keywordVariant: 'chips' | 'comma' =
    skillStyle === 'comma' ? 'comma' : 'chips';

  return (
    <section data-section-id={section.id}>
      <SectionHeading title={section.title} />
      {enabledItems.length > 0 && (
        <div>
          {enabledItems.map((item: any, idx: number) => {
            const highlights = extractHighlights(item);
            const keywords = extractKeywords(item);
            const itemUrl =
              item.url || item.website || item.link || item.liveUrl || '';
            const isLast = idx === enabledItems.length - 1;
            const itemStyle: React.CSSProperties | undefined = isLast
              ? undefined
              : { marginBottom: 'var(--theme-item-spacing, 0.75rem)' };

            const descKey =
              item.description !== undefined
                ? 'description'
                : item.summary !== undefined
                ? 'summary'
                : 'description';
            const descVal = item.description ?? item.summary ?? '';
            const metrics = extractImpactMetrics([descVal, ...highlights]);

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

              return (
                <div
                  key={item.id || idx}
                  data-section-kind="work"
                  className="break-inside-avoid"
                  style={itemStyle}
                >
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
                    item={item}
                    location={item.location}
                    readOnly={readOnly}
                    tone="modern"
                  />
                  {metrics.length > 0 && (
                    <div
                      aria-hidden="true"
                      data-testid="startup-impact-metrics"
                      className="flex flex-wrap gap-1.5 mt-1.5"
                    >
                      {metrics.map((metric, mIdx) => (
                        <span
                          key={`${metric}-${mIdx}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums border bg-orange-50/70 print:bg-slate-50"
                          style={{
                            borderColor:
                              'var(--theme-accent, var(--theme-primary, #ea580c))',
                            color:
                              'var(--theme-accent, var(--theme-primary, #ea580c))',
                          }}
                        >
                          <span>↗</span>
                          <span>{metric}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <Description
                    value={descVal}
                    sectionId={section.id}
                    itemId={item.id}
                    field={descKey}
                    readOnly={readOnly}
                    placeholder="Describe velocity, ownership, and measurable outcomes..."
                    showWhenEmptyInEdit
                  />
                  <Bullets
                    items={highlights}
                    className="[&>li::marker]:text-[color:var(--theme-accent)] [&>li]:font-medium"
                  />
                  <KeywordList keywords={keywords} variant={keywordVariant} />
                </div>
              );
            }

            if (kind === 'projects') {
              const titleKey = item.name !== undefined ? 'name' : 'title';
              const titleVal = item.name || item.title || '';
              const roleVal = item.position || item.role || '';
              const companyVal =
                item.company || item.organization || item.entity || '';
              const projectExtraMeta = companyVal ? (
                <>
                  {roleVal && (
                    <span className="text-slate-400" aria-hidden="true">
                      ·
                    </span>
                  )}
                  <span className="text-slate-600 font-medium">{companyVal}</span>
                </>
              ) : undefined;

              return (
                <div
                  key={item.id || idx}
                  data-section-kind="projects"
                  className="break-inside-avoid"
                  style={itemStyle}
                >
                  <ItemHeader
                    title={titleVal}
                    titlePlaceholder="Project Name"
                    sectionId={section.id}
                    itemId={item.id}
                    titleField={titleKey}
                    subtitle={roleVal}
                    extraSubtitle={projectExtraMeta}
                    url={itemUrl}
                    urlPlacement="title"
                    item={item}
                    location={item.location}
                    readOnly={readOnly}
                    tone="modern"
                  />
                  {metrics.length > 0 && (
                    <div
                      aria-hidden="true"
                      data-testid="startup-impact-metrics"
                      className="flex flex-wrap gap-1.5 mt-1.5"
                    >
                      {metrics.map((metric, mIdx) => (
                        <span
                          key={`${metric}-${mIdx}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums border bg-orange-50/70 print:bg-slate-50"
                          style={{
                            borderColor:
                              'var(--theme-accent, var(--theme-primary, #ea580c))',
                            color:
                              'var(--theme-accent, var(--theme-primary, #ea580c))',
                          }}
                        >
                          <span>↗</span>
                          <span>{metric}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <Description
                    value={descVal}
                    sectionId={section.id}
                    itemId={item.id}
                    field="description"
                    readOnly={readOnly}
                    placeholder="Product launch, traction, and impact..."
                    showWhenEmptyInEdit
                  />
                  <Bullets
                    items={highlights}
                    className="[&>li::marker]:text-[color:var(--theme-accent)] [&>li]:font-medium"
                  />
                  <KeywordList keywords={keywords} variant={keywordVariant} />
                </div>
              );
            }

            // 'achievements'
            const nameKey = item.name !== undefined ? 'name' : 'title';
            const nameVal = item.name || item.title || '';
            return (
              <div
                key={item.id || idx}
                data-section-kind="achievements"
                className="break-inside-avoid"
                style={itemStyle}
              >
                <ItemHeader
                  title={nameVal}
                  titlePlaceholder="Achievement"
                  sectionId={section.id}
                  itemId={item.id}
                  titleField={nameKey}
                  url={itemUrl}
                  urlPlacement="title"
                  item={item}
                  readOnly={readOnly}
                  tone="modern"
                />
                {metrics.length > 0 && (
                  <div
                    aria-hidden="true"
                    data-testid="startup-impact-metrics"
                    className="flex flex-wrap gap-1.5 mt-1.5"
                  >
                    {metrics.map((metric, mIdx) => (
                      <span
                        key={`${metric}-${mIdx}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums border bg-orange-50/70 print:bg-slate-50"
                        style={{
                          borderColor:
                            'var(--theme-accent, var(--theme-primary, #ea580c))',
                          color:
                            'var(--theme-accent, var(--theme-primary, #ea580c))',
                        }}
                      >
                        <span>↗</span>
                        <span>{metric}</span>
                      </span>
                    ))}
                  </div>
                )}
                <Description
                  value={descVal}
                  sectionId={section.id}
                  itemId={item.id}
                  field="description"
                  readOnly={readOnly}
                  showWhenEmptyInEdit={false}
                />
                <Bullets
                  items={highlights}
                  className="[&>li::marker]:text-[color:var(--theme-accent)] [&>li]:font-medium"
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

const StartupTemplateContent: React.FC = () => {
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

  const hasContactDetails =
    !readOnly ||
    Boolean(
      (basics.email && basics.email.trim()) ||
        (basics.phone && basics.phone.trim()) ||
        basics.location?.city ||
        basics.location?.address ||
        basics.location?.countryCode ||
        extractExtraBasicsLinks(basics as Record<string, any>).length > 0
    );

  const orderedSections = getOrderedSections(
    resume.content?.sections || [],
    resume.content?.sectionOrder || []
  );

  const mainSections = orderedSections.filter(
    (sec) => !SIDEBAR_KINDS.has(resolveSectionKind(sec))
  );
  const hasSidebarSections = orderedSections.some((sec) =>
    SIDEBAR_KINDS.has(resolveSectionKind(sec))
  );

  if (atsMode) {
    return (
      <div
        className="bg-white"
        style={{
          padding: 'var(--theme-page-margin, 1.25cm)',
          fontFamily: 'var(--theme-body-font, inherit)',
          color: 'var(--theme-text-color, #111827)',
          fontSize: 'var(--theme-base-font-size, 13.5px)',
          lineHeight: 'var(--theme-line-height, 1.48)',
        }}
      >
        <header
          className="pb-4 border-b border-slate-300"
          style={{ marginBottom: 'var(--theme-section-spacing, 1rem)' }}
        >
          <InlineEdit
            value={basics.name || ''}
            onChange={readOnly ? undefined : (v) => updateBasics('name', v)}
            readOnly={readOnly}
            textClassName="text-3xl font-bold tracking-tight leading-tight"
            style={{
              fontFamily: 'var(--theme-heading-font)',
              color: 'var(--theme-heading-color, #000000)',
            }}
            placeholder="Your Name"
          />
          {(basics.label || !readOnly) && (
            <InlineEdit
              value={basics.label || ''}
              onChange={readOnly ? undefined : (v) => updateBasics('label', v)}
              readOnly={readOnly}
              textClassName="text-sm font-semibold mt-1 block"
              style={{ color: 'var(--theme-heading-color, #000000)' }}
              placeholder="Founding Engineer / Product Leader"
            />
          )}
          {hasContactDetails && (
            <ContactRow variant="inline-left" className="mt-2.5" />
          )}
        </header>

        {showSummary && (
          <section
            className={!hasSummaryText ? 'print:hidden' : undefined}
            style={{
              marginBottom:
                orderedSections.length > 0
                  ? 'var(--theme-section-spacing, 1rem)'
                  : undefined,
            }}
          >
            <SectionHeading title="Impact Summary" />
            <InlineEdit
              value={summaryValue}
              onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
              multiline
              textClassName="text-[0.96em] whitespace-pre-wrap break-words block"
              style={{
                color: 'var(--theme-text-color, #111827)',
                lineHeight: 'var(--theme-line-height, 1.48)',
              }}
              placeholder="Highlight 0-to-1 launches, scale, and business outcomes..."
              readOnly={readOnly}
            />
          </section>
        )}

        <SectionRenderer tone="modern" />
      </div>
    );
  }

  return (
    <div
      className="relative bg-white print:!min-h-0 flex flex-col"
      style={{
        minHeight: 'var(--theme-page-height, 1123px)',
        fontFamily: 'var(--theme-body-font, inherit)',
        color: 'var(--theme-text-color, #334155)',
        fontSize: 'var(--theme-base-font-size, 13.5px)',
        lineHeight: 'var(--theme-line-height, 1.48)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* Print-fixed sidebar background so Page 2+ sidebar fill continues full height */}
      {hasSidebarSections && (
        <div
          aria-hidden="true"
          className="hidden print:block print:fixed print:inset-y-0 print:right-0 print:pointer-events-none"
          style={{
            width: 'var(--theme-sidebar-width, 32%)',
            backgroundColor: '#f8fafc',
            borderLeft: '1px solid #e2e8f0',
            zIndex: 0,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        />
      )}

      {/* Two-Tone Header */}
      <header data-testid="startup-two-tone-header" className="relative z-10">
        <div
          className={
            showPhoto ? 'flex items-center justify-between gap-4' : undefined
          }
          style={{
            backgroundColor: 'var(--theme-primary, #0f172a)',
            padding:
              '1.35rem var(--theme-page-margin, 1.25cm) 1.15rem var(--theme-page-margin, 1.25cm)',
          }}
        >
          <div className="min-w-0 flex-1">
            <InlineEdit
              value={basics.name || ''}
              onChange={readOnly ? undefined : (v) => updateBasics('name', v)}
              readOnly={readOnly}
              textClassName="text-3xl font-extrabold tracking-tight leading-tight text-white focus:text-slate-900"
              style={{
                fontFamily: 'var(--theme-heading-font)',
              }}
              placeholder="Your Name"
            />
            {(basics.label || !readOnly) && (
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      'var(--theme-accent, var(--theme-primary, #ea580c))',
                  }}
                />
                <InlineEdit
                  value={basics.label || ''}
                  onChange={
                    readOnly ? undefined : (v) => updateBasics('label', v)
                  }
                  readOnly={readOnly}
                  textClassName="text-sm font-semibold tracking-wide uppercase block text-slate-200 focus:text-slate-900"
                  placeholder="Founding Engineer / Product Leader"
                />
              </div>
            )}
          </div>
          {showPhoto && <ProfilePhoto className="!border-2 !border-white/80" />}
        </div>

        {hasContactDetails && (
          <div
            className="bg-slate-100 border-b-[3px]"
            style={{
              borderColor: 'var(--theme-accent, var(--theme-primary, #ea580c))',
              padding:
                '0.55rem var(--theme-page-margin, 1.25cm) 0.55rem var(--theme-page-margin, 1.25cm)',
            }}
          >
            <ContactRow variant="inline-left" />
          </div>
        )}
      </header>

      {/* Body with print-persistent sidebar background across A4 pages */}
      <div
        className="relative z-10 flex-1 flex flex-row items-stretch print:!bg-none"
        style={
          hasSidebarSections
            ? {
                backgroundImage:
                  'linear-gradient(to left, #f8fafc calc(var(--theme-sidebar-width, 32%) - 1px), #e2e8f0 calc(var(--theme-sidebar-width, 32%) - 1px), #e2e8f0 var(--theme-sidebar-width, 32%), #ffffff var(--theme-sidebar-width, 32%))',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }
            : undefined
        }
      >
        <main
          className="flex-1 min-w-0 max-w-full [overflow-wrap:anywhere] print:!py-0"
          style={{ padding: 'var(--theme-page-margin, 1.25cm)', overflowWrap: 'anywhere' }}
        >
          <table role="presentation" className="w-full table-fixed border-collapse">
            <thead aria-hidden="true" className="hidden print:table-header-group">
              <tr>
                <td
                  className="p-0"
                  style={{ height: 'var(--theme-page-margin, 1.25cm)' }}
                />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-0 align-top">
                  {showSummary && (
                    <section
                      data-testid="startup-summary-callout"
                      className={`rounded-r-xl border border-slate-200/90 border-l-4 bg-slate-50/90 print:bg-slate-50 p-3.5 break-inside-avoid ${
                        !hasSummaryText ? 'print:hidden' : ''
                      }`}
                      style={{
                        borderLeftColor:
                          'var(--theme-accent, var(--theme-primary, #ea580c))',
                        marginBottom:
                          mainSections.length > 0
                            ? 'var(--theme-section-spacing, 1rem)'
                            : undefined,
                      }}
                    >
                      <SectionHeading title="Impact Summary" />
                      <InlineEdit
                        value={summaryValue}
                        onChange={
                          readOnly ? undefined : (v) => updateBasics('summary', v)
                        }
                        multiline
                        textClassName="text-[0.96em] font-medium whitespace-pre-wrap break-words block"
                        style={{
                          color: 'var(--theme-text-color, #1e293b)',
                          lineHeight: 'var(--theme-line-height, 1.48)',
                        }}
                        placeholder="Highlight 0-to-1 launches, scale, and business outcomes..."
                        readOnly={readOnly}
                      />
                    </section>
                  )}

                  {mainSections.map((section, idx) => {
                    const isLast = idx === mainSections.length - 1;
                    const kind = resolveSectionKind(section);
                    return (
                      <div
                        key={section.id}
                        style={
                          isLast
                            ? undefined
                            : { marginBottom: 'var(--theme-section-spacing, 1rem)' }
                        }
                      >
                        {METRIC_RICH_KINDS.has(kind) ? (
                          <StartupMetricSection section={section} kind={kind} />
                        ) : (
                          <SectionRenderer
                            sections={[section]}
                            sectionOrder={[section.id]}
                            tone="modern"
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
                  style={{ height: 'var(--theme-page-margin, 1.25cm)' }}
                />
              </tr>
            </tfoot>
          </table>
        </main>

        {hasSidebarSections && (
          <aside
            data-testid="startup-sidebar"
            className="shrink-0 min-w-0 max-w-full [overflow-wrap:anywhere] print:!py-0"
            style={{
              width: 'var(--theme-sidebar-width, 32%)',
              padding: 'var(--theme-page-margin, 1.25cm)',
              overflowWrap: 'anywhere',
            }}
          >
            <table role="presentation" className="w-full table-fixed border-collapse">
              <thead aria-hidden="true" className="hidden print:table-header-group">
                <tr>
                  <td
                    className="p-0"
                    style={{ height: 'var(--theme-page-margin, 1.25cm)' }}
                  />
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-0 align-top w-full max-w-full">
                    <SectionRenderer
                      filter={(_sec, kind) => SIDEBAR_KINDS.has(kind)}
                      tone="modern"
                      narrow
                    />
                  </td>
                </tr>
              </tbody>
              <tfoot aria-hidden="true" className="hidden print:table-footer-group">
                <tr>
                  <td
                    className="p-0"
                    style={{ height: 'var(--theme-page-margin, 1.25cm)' }}
                  />
                </tr>
              </tfoot>
            </table>
          </aside>
        )}
      </div>
    </div>
  );
};

export const StartupTemplate: React.FC<TemplateProps> = ({
  resume,
  onChange,
  readOnly = false,
}) => (
  <TemplateProvider
    resume={resume}
    onChange={onChange}
    readOnly={readOnly}
    defaultHeadingStyle="pill"
    defaultSkillStyle="chips"
  >
    <StartupTemplateContent />
  </TemplateProvider>
);
