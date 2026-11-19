import React from 'react';
import {
  CodeBracketIcon,
  GlobeAltIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { IResume, ISection } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import {
  ContactLinkItem,
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

const MONO_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

function prioritizeDeveloperLinks(links: ContactLinkItem[]): ContactLinkItem[] {
  const rank = (key: string): number => {
    if (key === 'github') return 0;
    if (key === 'website') return 1;
    if (key === 'linkedin') return 2;
    return 3;
  };
  return [...links].sort((a, b) => rank(a.key) - rank(b.key));
}

function renderLinkIcon(key: string) {
  if (key === 'github') {
    return <CodeBracketIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }
  if (key === 'website') {
    return <GlobeAltIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }
  return <LinkIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

const DeveloperProjectsSection: React.FC<{ section: ISection }> = ({ section }) => {
  const { readOnly, atsMode } = useTemplateContext();
  const enabledItems = Array.isArray(section.content)
    ? section.content.filter((item: any) => item && item.enabled !== false)
    : [];

  return (
    <section data-section-id={section.id}>
      <SectionHeading title={section.title} />
      {enabledItems.length > 0 && (
        <div>
          {enabledItems.map((item: any, idx: number) => {
            const titleKey = item.name !== undefined ? 'name' : 'title';
            const titleVal = item.name || item.title || '';
            const roleVal = item.position || item.role || '';
            const companyVal = item.company || item.organization || item.entity || '';
            const descVal = item.description ?? item.summary ?? '';
            const itemUrl =
              item.url || item.website || item.link || item.liveUrl || '';
            const highlights = extractHighlights(item);
            const keywords = extractKeywords(item);
            const isLast = idx === enabledItems.length - 1;

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
                data-testid="developer-project-card"
                className={
                  atsMode
                    ? 'break-inside-avoid'
                    : 'break-inside-avoid rounded-lg border border-slate-200/90 border-l-[3px] bg-slate-50/70 print:bg-slate-50/50 px-3.5 py-2.5'
                }
                style={{
                  borderLeftColor: atsMode
                    ? undefined
                    : 'var(--theme-accent, var(--theme-primary, #0284c7))',
                  marginBottom: isLast
                    ? undefined
                    : 'var(--theme-item-spacing, 0.875rem)',
                }}
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

                {keywords.length > 0 && (
                  <div
                    data-testid="developer-project-stack"
                    className={
                      atsMode
                        ? undefined
                        : '[&_span]:font-mono [&_span]:text-[11px] [&_span]:bg-white print:[&_span]:bg-white'
                    }
                    style={atsMode ? undefined : { fontFamily: MONO_STACK }}
                  >
                    <KeywordList
                      keywords={keywords}
                      variant={atsMode ? 'comma' : 'chips'}
                    />
                  </div>
                )}

                <Description
                  value={descVal}
                  sectionId={section.id}
                  itemId={item.id}
                  field="description"
                  readOnly={readOnly}
                  placeholder="Project architecture, scale, and outcomes..."
                  showWhenEmptyInEdit
                />
                <Bullets items={highlights} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

const DeveloperTemplateContent: React.FC = () => {
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

  const prominentLinks = prioritizeDeveloperLinks(
    extractExtraBasicsLinks(basics as Record<string, any>)
  );

  // Strip profile/url fields passed to ContactRow so GitHub/portfolio links
  // are rendered once in the prominent header link bar without DOM duplication.
  const contactOnlyResume: IResume = {
    ...resume,
    content: {
      ...resume.content,
      basics: {
        name: basics.name,
        label: basics.label,
        email: basics.email,
        phone: basics.phone,
        summary: basics.summary,
        location: basics.location,
      },
    },
  };

  const orderedSections = getOrderedSections(
    resume.content?.sections || [],
    resume.content?.sectionOrder || []
  );

  return (
    <div
      className="bg-white print:!py-0 [&_.tabular-nums]:font-mono [&_.tabular-nums]:text-[11.5px] [&_[data-skill-variant='chips']_span.inline-flex]:font-mono [&_[data-skill-variant='chips']_div.inline-flex]:font-mono [&_[data-section-kind='work']_div.flex.flex-wrap>span]:font-mono [&_[data-section-kind='custom']_div.flex.flex-wrap>span]:font-mono"
      style={{
        padding: 'var(--theme-page-margin, 1.75cm)',
        fontFamily: 'var(--theme-body-font, inherit)',
        color: 'var(--theme-text-color, #334155)',
        fontSize: 'var(--theme-base-font-size, 13.5px)',
        lineHeight: 'var(--theme-line-height, 1.48)',
      }}
    >
      <table role="presentation" className="w-full table-fixed border-collapse">
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
            <td className="p-0 align-top min-w-0 max-w-full [overflow-wrap:anywhere]">
              <header
                className="pb-4 border-b-2"
                style={{
                  borderColor: 'var(--theme-primary, #0f172a)',
                  marginBottom:
                    showSummary || orderedSections.length > 0
                      ? 'var(--theme-section-spacing, 1.25rem)'
                      : undefined,
                }}
              >
                <div
                  className={
                    atsMode
                      ? 'flex flex-col gap-2 min-w-0'
                      : 'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 min-w-0'
                  }
                >
                  <div className="min-w-0 flex-1">
                    <InlineEdit
                      value={basics.name || ''}
                      onChange={
                        readOnly ? undefined : (v) => updateBasics('name', v)
                      }
                      readOnly={readOnly}
                      textClassName="text-3xl font-bold tracking-tight leading-tight"
                      style={{
                        fontFamily: 'var(--theme-heading-font)',
                        color: 'var(--theme-heading-color, #0f172a)',
                      }}
                      placeholder="Your Name"
                    />
                    {(basics.label || !readOnly) && (
                      <div className="flex items-baseline gap-1.5 mt-1">
                        {!atsMode && (
                          <span
                            aria-hidden="true"
                            className={`text-xs font-bold select-none ${
                              !basics.label?.trim() ? 'print:hidden' : ''
                            }`}
                            style={{
                              fontFamily: MONO_STACK,
                              color:
                                'var(--theme-accent, var(--theme-primary, #0284c7))',
                            }}
                          >
                            {'//'}
                          </span>
                        )}
                        <InlineEdit
                          value={basics.label || ''}
                          onChange={
                            readOnly
                              ? undefined
                              : (v) => updateBasics('label', v)
                          }
                          readOnly={readOnly}
                          textClassName="text-sm font-semibold tracking-tight block"
                          style={{
                            color:
                              'var(--theme-accent, var(--theme-primary, #0284c7))',
                          }}
                          placeholder="Software Engineer"
                        />
                      </div>
                    )}
                  </div>

                  {(prominentLinks.length > 0 || showPhoto) && (
                    <div
                      className={
                        atsMode
                          ? 'flex flex-wrap items-center gap-3 min-w-0 max-w-full'
                          : 'flex items-start gap-3 sm:justify-end min-w-0 max-w-full sm:max-w-[58%]'
                      }
                    >
                      {prominentLinks.length > 0 && (
                        <div
                          data-testid="developer-prominent-links"
                          className={
                            atsMode
                              ? 'flex flex-wrap gap-x-3 gap-y-1 min-w-0 max-w-full'
                              : 'flex flex-wrap sm:justify-end gap-1.5 min-w-0 max-w-full'
                          }
                        >
                          {prominentLinks.map((link) => (
                            <a
                              key={link.key}
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={
                                atsMode
                                  ? 'inline-flex items-center max-w-full min-w-0 [overflow-wrap:anywhere] text-xs underline decoration-slate-400 underline-offset-2'
                                  : 'inline-flex items-center max-w-full min-w-0 [overflow-wrap:anywhere] gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium bg-slate-50 hover:bg-slate-100 transition-colors print:bg-slate-50'
                              }
                              style={
                                atsMode
                                  ? { color: '#111827', overflowWrap: 'anywhere' }
                                  : {
                                      fontFamily: MONO_STACK,
                                      borderColor:
                                        'var(--theme-accent, var(--theme-primary, #0284c7))',
                                      color: 'var(--theme-primary, #0f172a)',
                                      overflowWrap: 'anywhere',
                                    }
                              }
                            >
                              {!atsMode && (
                                <span
                                  className="shrink-0"
                                  style={{
                                    color:
                                      'var(--theme-accent, var(--theme-primary, #0284c7))',
                                  }}
                                >
                                  {renderLinkIcon(link.key)}
                                </span>
                              )}
                              <span className="min-w-0 [overflow-wrap:anywhere]">
                                {link.label}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                      {showPhoto && <ProfilePhoto />}
                    </div>
                  )}
                </div>

                <ContactRow
                  resume={contactOnlyResume}
                  variant="inline-left"
                  className="mt-2.5"
                />
              </header>

              {showSummary && (
                <section
                  className={!hasSummaryText ? 'print:hidden' : undefined}
                  style={{
                    marginBottom:
                      orderedSections.length > 0
                        ? 'var(--theme-section-spacing, 1.25rem)'
                        : undefined,
                  }}
                >
                  <SectionHeading title="Engineering Summary" />
                  <InlineEdit
                    value={summaryValue}
                    onChange={
                      readOnly ? undefined : (v) => updateBasics('summary', v)
                    }
                    multiline
                    textClassName="text-[0.96em] whitespace-pre-wrap break-words block"
                    style={{
                      color: 'var(--theme-text-color, #334155)',
                      lineHeight: 'var(--theme-line-height, 1.48)',
                    }}
                    placeholder="Summarize systems built, scale, and engineering focus..."
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
                              'var(--theme-section-spacing, 1.25rem)',
                          }
                    }
                  >
                    {kind === 'projects' ? (
                      <DeveloperProjectsSection section={section} />
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
              style={{ height: 'var(--theme-page-margin, 1.75cm)' }}
            />
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export const DeveloperTemplate: React.FC<TemplateProps> = ({
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
    <DeveloperTemplateContent />
  </TemplateProvider>
);
